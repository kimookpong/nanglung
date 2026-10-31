import type { TrackedHand, WorkerReply } from "./vision-worker";

export interface TrackingResult {
  hands: TrackedHand[];
  timestamp: number;
  inference: number;
}
export class CameraTracker {
  private worker: Worker | null = null;
  private stream: MediaStream | null = null;
  private running = false;
  private busy = false;
  private generation = 0;
  private frameId = 0;
  private lastVideoTime = -1;
  private submittedAt = 0;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private cancelInitialization: (() => void) | null = null;
  backend: "GPU" | "CPU" = "CPU";
  onResult: (result: TrackingResult) => void = () => {};
  onError: (message: string) => void = () => {};

  constructor(private video: HTMLVideoElement) {}

  async start(deviceId?: string) {
    this.stop();
    const generation = this.generation;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
      throw new Error("เปิดผ่าน localhost หรือ HTTPS เพื่อใช้งานกล้อง");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
          ...(deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: "user" }),
        },
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      this.video.srcObject = stream;
      await this.video.play();
      if (generation !== this.generation) return;
      await this.initializeWorker(generation);
      if (generation !== this.generation) return;
      this.running = true;
      this.lastVideoTime = -1;
      this.stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (generation === this.generation) {
          this.stop();
          this.onError("กล้องถูกตัดการเชื่อมต่อ กรุณาเลือกกล้องและเปิดใหม่");
        }
      });
      this.watchdog = setInterval(() => {
        if (this.busy && performance.now() - this.submittedAt > 10000) {
          this.stop();
          this.onError(
            "การตรวจจับไม่ตอบสนอง กรุณาเปิดกล้องใหม่ หรือลองเบราว์เซอร์ Chrome/Edge รุ่นปัจจุบัน",
          );
        }
      }, 1500);
      this.schedule();
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      if (error instanceof DOMException) {
        const messages: Record<string, string> = {
          NotAllowedError:
            "ยังไม่ได้รับสิทธิ์กล้อง กรุณาอนุญาตกล้องในการตั้งค่าเบราว์เซอร์ แล้วลองใหม่",
          NotFoundError: "ไม่พบกล้อง กรุณาเชื่อมต่อเว็บแคมแล้วลองใหม่",
          NotReadableError: "เปิดกล้องไม่ได้ กล้องอาจถูกใช้งานโดยโปรแกรมอื่น",
          OverconstrainedError:
            "กล้องที่เลือกไม่พร้อมใช้งาน กรุณาเลือกกล้องอื่น",
        };
        throw new Error(messages[error.name] ?? error.message);
      }
      throw error;
    }
  }

  private initializeWorker(generation: number) {
    return new Promise<void>((resolve, reject) => {
      const base = new URL(import.meta.env.BASE_URL, location.href).href;
      const worker = new Worker(`${base}hand-worker.js`);
      this.worker = worker;
      const timeout = setTimeout(
        () => reject(new Error("โหลดโมเดลนานเกินไป กรุณาลองใหม่")),
        45000,
      );
      this.cancelInitialization = () => {
        clearTimeout(timeout);
        resolve();
      };
      const fail = (message: string) => {
        clearTimeout(timeout);
        if (generation !== this.generation) return;
        if (this.running) {
          this.stop();
          this.onError(message);
        } else reject(new Error(message));
      };
      worker.onerror = () =>
        fail(
          "โหลดระบบตรวจจับไม่สำเร็จ กรุณารัน npm run setup:assets แล้วเปิดใหม่",
        );
      worker.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
        if (generation !== this.generation) return;
        if (data.type === "ready") {
          clearTimeout(timeout);
          this.cancelInitialization = null;
          this.backend = data.backend;
          resolve();
        } else if (data.type === "result") {
          this.busy = false;
          this.onResult(data);
        } else {
          this.busy = false;
          fail(`ระบบตรวจจับมีปัญหา: ${data.message.slice(0, 220)}`);
        }
      };
      worker.postMessage({ type: "init", base });
    });
  }

  private schedule() {
    if (!this.running) return;
    this.frameId = requestAnimationFrame(() => {
      void this.submit();
      this.schedule();
    });
  }
  private async submit() {
    if (
      !this.running ||
      this.busy ||
      this.video.readyState < 2 ||
      this.video.currentTime === this.lastVideoTime
    )
      return;
    const generation = this.generation;
    this.busy = true;
    this.submittedAt = performance.now();
    this.lastVideoTime = this.video.currentTime;
    try {
      const bitmap = await createImageBitmap(this.video);
      if (!this.running || generation !== this.generation) {
        bitmap.close();
        return;
      }
      this.worker!.postMessage(
        { type: "frame", bitmap, timestamp: this.submittedAt },
        [bitmap],
      );
    } catch {
      if (generation === this.generation) {
        this.stop();
        this.onError("อ่านภาพจากกล้องไม่ได้ กรุณาปิดและเปิดกล้องใหม่");
      }
    }
  }
  stop() {
    this.generation++;
    this.cancelInitialization?.();
    this.cancelInitialization = null;
    this.running = false;
    cancelAnimationFrame(this.frameId);
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.pause();
    this.video.srcObject = null;
    this.worker?.terminate();
    this.worker = null;
    this.busy = false;
  }
}
