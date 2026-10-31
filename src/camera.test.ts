import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CameraTracker } from "./camera";

class FakeWorker {
  static instances: FakeWorker[] = [];
  static autoReady = true;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn((message: { type: string }) => {
    if (message.type === "init" && FakeWorker.autoReady)
      queueMicrotask(() =>
        this.onmessage?.({ data: { type: "ready", backend: "CPU" } }),
      );
  });
  constructor() {
    FakeWorker.instances.push(this);
  }
}

describe("camera lifecycle and frame backpressure", () => {
  let tracker: CameraTracker;
  let video: {
    srcObject: unknown;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    readyState: number;
    currentTime: number;
  };
  let track: {
    stop: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
  };
  let stream: {
    getTracks: () => (typeof track)[];
    getVideoTracks: () => (typeof track)[];
  };
  let getUserMedia: ReturnType<typeof vi.fn>;
  let frames: FrameRequestCallback[];
  beforeEach(() => {
    FakeWorker.instances = [];
    FakeWorker.autoReady = true;
    frames = [];
    track = { stop: vi.fn(), addEventListener: vi.fn() };
    stream = { getTracks: () => [track], getVideoTracks: () => [track] };
    getUserMedia = vi.fn(async () => stream);
    video = {
      srcObject: null,
      play: vi.fn(async () => {}),
      pause: vi.fn(),
      readyState: 4,
      currentTime: 1,
    };
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("location", { href: "http://localhost:5173/" });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ close: vi.fn() })),
    );
    tracker = new CameraTracker(video as unknown as HTMLVideoElement);
  });
  afterEach(() => {
    tracker.stop();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("initializes the worker and releases both video tracks and worker on stop", async () => {
    await tracker.start();
    expect(video.srcObject).toBe(stream);
    expect(FakeWorker.instances.length).toBe(1);
    expect(getUserMedia.mock.calls[0][0].audio).toBe(false);
    const worker = FakeWorker.instances[0];
    tracker.stop();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });
  it("stops a late camera stream if opening was cancelled during the permission prompt", async () => {
    let grant!: (value: typeof stream) => void;
    getUserMedia.mockImplementation(
      () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    );
    const starting = tracker.start();
    tracker.stop();
    grant(stream);
    await starting;
    expect(track.stop).toHaveBeenCalledOnce();
    expect(FakeWorker.instances.length).toBe(0);
  });
  it("settles cancellation during model loading without leaving a timeout or stream running", async () => {
    FakeWorker.autoReady = false;
    const starting = tracker.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(FakeWorker.instances.length).toBe(1);
    tracker.stop();
    await starting;
    expect(track.stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });
  it("provides an actionable error when camera permission is denied", async () => {
    getUserMedia.mockRejectedValue(
      new DOMException("Denied", "NotAllowedError"),
    );
    await expect(tracker.start()).rejects.toThrow("สิทธิ์กล้อง");
    expect(video.srcObject).toBeNull();
  });
  it("releases the camera if the model fails to initialize", async () => {
    FakeWorker.autoReady = false;
    const starting = tracker.start();
    await Promise.resolve();
    await Promise.resolve();
    FakeWorker.instances[0].onmessage?.({
      data: { type: "error", message: "Missing WASM", fatal: true },
    });
    await expect(starting).rejects.toThrow("Missing WASM");
    expect(track.stop).toHaveBeenCalledOnce();
  });
  it("keeps at most one frame in flight until the worker responds", async () => {
    await tracker.start();
    const worker = FakeWorker.instances[0];
    frames.shift()!(performance.now());
    await Promise.resolve();
    video.currentTime = 2;
    frames.shift()!(performance.now());
    await Promise.resolve();
    expect(
      worker.postMessage.mock.calls.filter(([m]) => m.type === "frame").length,
    ).toBe(1);
    worker.onmessage?.({
      data: {
        type: "result",
        hands: [],
        timestamp: performance.now(),
        inference: 4,
      },
    });
    frames.shift()!(performance.now());
    await Promise.resolve();
    expect(
      worker.postMessage.mock.calls.filter(([m]) => m.type === "frame").length,
    ).toBe(2);
  });
});
