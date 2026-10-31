import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandSide, Point } from "./core";

export interface TrackedHand {
  side: HandSide;
  image: Point[];
  world: Point[];
}
export type WorkerReply =
  | { type: "ready"; backend: "GPU" | "CPU" }
  | {
      type: "result";
      hands: TrackedHand[];
      timestamp: number;
      inference: number;
    }
  | { type: "error"; message: string; fatal: boolean };
type WorkerRequest =
  | { type: "init"; base: string }
  | { type: "frame"; bitmap: ImageBitmap; timestamp: number };
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (data: WorkerReply) => void;
};
let model: HandLandmarker | null = null;
scope.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      const files = await FilesetResolver.forVisionTasks(`${data.base}vision`);
      const options = {
        baseOptions: {
          modelAssetPath: `${data.base}vision/hand_landmarker.task`,
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      } as const;
      let backend: "GPU" | "CPU" = "CPU";
      if (typeof OffscreenCanvas !== "undefined") {
        try {
          const canvas = new OffscreenCanvas(640, 480);
          if (canvas.getContext("webgl2")) {
            model = await HandLandmarker.createFromOptions(files, {
              ...options,
              canvas,
              baseOptions: { ...options.baseOptions, delegate: "GPU" },
            });
            backend = "GPU";
          }
        } catch {
          /* Fall back to CPU when the browser cannot run the GPU graph. */
        }
      }
      model ??= await HandLandmarker.createFromOptions(files, {
        ...options,
        baseOptions: { ...options.baseOptions, delegate: "CPU" },
      });
      scope.postMessage({ type: "ready", backend });
    } catch (error) {
      scope.postMessage({ type: "error", message: String(error), fatal: true });
    }
  } else {
    try {
      if (!model) throw new Error("Hand model is not ready");
      const start = performance.now();
      const result = model.detectForVideo(data.bitmap, data.timestamp);
      scope.postMessage({
        type: "result",
        timestamp: data.timestamp,
        inference: performance.now() - start,
        hands: result.landmarks.map((image, i) => ({
          image,
          world: result.worldLandmarks[i],
          side: result.handedness[i][0].categoryName as HandSide,
        })),
      });
    } catch (error) {
      scope.postMessage({
        type: "error",
        message: String(error),
        fatal: false,
      });
    } finally {
      data.bitmap.close();
    }
  }
};
