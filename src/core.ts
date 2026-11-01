import { isCharacterId, type CharacterId } from "./characters";

export const FINGERS = ["thumb", "index", "middle", "ring", "pinky"] as const;
export type Finger = (typeof FINGERS)[number];
export const ACTIONS = [
  "mouth",
  "rightArm",
  "leftArm",
  "head",
  "flip",
] as const;
export type Action = (typeof ACTIONS)[number];
export type HandSide = "Right" | "Left";
export interface Point {
  x: number;
  y: number;
  z: number;
}
export interface Signal {
  x: number;
  y: number;
  angle: number;
  fingers: number[];
}
export interface Profile {
  low: number[];
  high: number[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  neutralAngle: number;
  calibrated: boolean;
}
export interface Settings {
  character: CharacterId;
  characters: Record<HandSide, CharacterId>;
  handMode: "single" | "dual";
  accessories: boolean;
  mirror: boolean;
  hand: HandSide;
  smoothing: number;
  motion: number;
  gain: number[];
  assignments: Action[];
  theme: "amber" | "ivory" | "night";
  rods: boolean;
  profiles: Record<HandSide, Profile>;
}
export interface Pose {
  x: number;
  y: number;
  tilt: number;
  mouth: number;
  rightArm: number;
  leftArm: number;
  head: number;
  facing: 1 | -1;
}

export const clamp = (x: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const wrapAngle = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
export const restPose = (): Pose => ({
  x: 0.5,
  y: 0.53,
  tilt: 0,
  mouth: 0,
  rightArm: 0.16,
  leftArm: 0.12,
  head: 0,
  facing: 1,
});
export const defaultProfile = (): Profile => ({
  low: [0.9, 0.04, 0.04, 0.04, 0.04],
  high: [2.25, 0.88, 0.88, 0.88, 0.88],
  bounds: { minX: 0.15, maxX: 0.85, minY: 0.2, maxY: 0.8 },
  neutralAngle: 0,
  calibrated: false,
});
export const defaultSettings = (): Settings => ({
  character: "theng",
  characters: { Right: "theng", Left: "prayut" },
  handMode: "single",
  accessories: true,
  mirror: true,
  hand: "Right",
  smoothing: 0.45,
  motion: 1,
  gain: [1, 1, 1, 1, 1],
  assignments: [...ACTIONS],
  theme: "amber",
  rods: true,
  profiles: { Right: defaultProfile(), Left: defaultProfile() },
});

const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
function bend(a: Point, b: Point, c: Point) {
  const u = [a.x - b.x, a.y - b.y, a.z - b.z];
  const v = [c.x - b.x, c.y - b.y, c.z - b.z];
  const denom = Math.hypot(...u) * Math.hypot(...v);
  if (denom < 1e-9) return 0;
  const cosine = clamp(
    u.reduce((sum, x, i) => sum + x * v[i], 0) / denom,
    -1,
    1,
  );
  return clamp((Math.PI - Math.acos(cosine)) / 2.35);
}

/** World points avoid aspect-ratio-dependent joint angles. Image points locate the palm. */
export function extractSignal(
  image: Point[],
  world: Point[],
  aspect = 4 / 3,
): Signal | null {
  if (
    image.length !== 21 ||
    world.length !== 21 ||
    [...image, ...world].some((p) => ![p.x, p.y, p.z].every(Number.isFinite))
  )
    return null;
  const palmWidth = distance(world[5], world[17]);
  if (palmWidth < 0.005) return null;
  const palm = [0, 5, 9, 13, 17].map((i) => image[i]);
  const angle = wrapAngle(
    Math.atan2((image[9].x - image[0].x) * aspect, image[0].y - image[9].y),
  );
  return {
    x: palm.reduce((n, p) => n + p.x, 0) / 5,
    y: palm.reduce((n, p) => n + p.y, 0) / 5,
    angle,
    fingers: [
      distance(world[4], world[17]) / palmWidth,
      ...[5, 9, 13, 17].map(
        (i) =>
          0.65 * bend(world[i], world[i + 1], world[i + 2]) +
          0.35 * bend(world[i + 1], world[i + 2], world[i + 3]),
      ),
    ],
  };
}

export function normalizeFingers(signal: Signal, settings: Settings): number[] {
  const profile = settings.profiles[settings.hand];
  return signal.fingers.map((value, i) => {
    const span = profile.high[i] - profile.low[i];
    return span < 0.08
      ? 0
      : clamp(((value - profile.low[i]) / span) * settings.gain[i]);
  });
}

export function buildProfile(
  open: Signal,
  closed: Signal,
  cornerA: Signal,
  cornerB: Signal,
): Profile {
  const low = open.fingers.map((v, i) => Math.min(v, closed.fingers[i]));
  const high = open.fingers.map((v, i) => Math.max(v, closed.fingers[i]));
  const bad = high.findIndex((v, i) => v - low[i] < (i === 0 ? 0.15 : 0.12));
  if (bad !== -1)
    throw new Error(
      `ช่วงการขยับของ${["นิ้วโป้ง", "นิ้วชี้", "นิ้วกลาง", "นิ้วนาง", "นิ้วก้อย"][bad]}แคบเกินไป กรุณาปรับเทียบใหม่ให้เห็นนิ้วชัด`,
    );
  if (
    Math.abs(cornerA.x - cornerB.x) < 0.18 ||
    Math.abs(cornerA.y - cornerB.y) < 0.15
  )
    throw new Error(
      "พื้นที่ขยับมือเล็กเกินไป กรุณาเก็บมุมซ้ายบนและขวาล่างให้ห่างกันอีกเล็กน้อย",
    );
  return {
    low,
    high,
    neutralAngle: open.angle,
    calibrated: true,
    bounds: {
      minX: Math.min(cornerA.x, cornerB.x),
      maxX: Math.max(cornerA.x, cornerB.x),
      minY: Math.min(cornerA.y, cornerB.y),
      maxY: Math.max(cornerA.y, cornerB.y),
    },
  };
}

export function averageSignals(samples: Signal[]): Signal {
  if (!samples.length) throw new Error("ไม่พบข้อมูลมือ");
  const avg = (fn: (s: Signal) => number) =>
    samples.reduce((sum, s) => sum + fn(s), 0) / samples.length;
  return {
    x: avg((s) => s.x),
    y: avg((s) => s.y),
    angle: Math.atan2(
      avg((s) => Math.sin(s.angle)),
      avg((s) => Math.cos(s.angle)),
    ),
    fingers: FINGERS.map((_, i) => avg((s) => s.fingers[i])),
  };
}

/** Hysteresis + dwell + release: held fingers cannot repeatedly toggle the puppet. */
export class FlipGesture {
  private holding: number | null = null;
  private releasing: number | null = null;
  private armed = false;
  progress = 0;
  reset() {
    this.holding = null;
    this.releasing = null;
    this.armed = false;
    this.progress = 0;
  }
  update(value: number, time: number): boolean {
    if (value < 0.35) {
      this.holding = null;
      this.progress = 0;
      this.releasing ??= time;
      if (time - this.releasing >= 200) this.armed = true;
      return false;
    }
    this.releasing = null;
    if (value < 0.6) {
      this.holding = null;
      this.progress = 0;
      return false;
    }
    if (!this.armed) return false;
    this.holding ??= time;
    this.progress = clamp((time - this.holding) / 350);
    if (this.progress >= 1) {
      this.reset();
      return true;
    }
    return false;
  }
}

export type TrackingState = "idle" | "tracking" | "lost" | "paused";
export class PuppetController {
  pose = restPose();
  target = restPose();
  state: TrackingState = "idle";
  fingers = [0, 0, 0, 0, 0];
  gesture = new FlipGesture();
  lastSeen = -Infinity;
  private lastTimestamp = -Infinity;
  private lastUpdate = 0;
  private hadLoss = true;
  private recoveryUntil = 0;
  private anchor: { x: number; y: number } | null = null;
  private paused = false;

  setPaused(value: boolean) {
    this.paused = value;
    this.gesture.reset();
    this.hadLoss = true;
    this.state = value
      ? "paused"
      : Number.isFinite(this.lastSeen)
        ? "lost"
        : "idle";
  }
  reset() {
    this.pose = restPose();
    this.target = restPose();
    this.fingers.fill(0);
    this.lastSeen = -Infinity;
    this.lastTimestamp = -Infinity;
    this.lastUpdate = 0;
    this.hadLoss = true;
    this.anchor = null;
    this.paused = false;
    this.gesture.reset();
    this.state = "idle";
  }
  markLost() {
    if (this.paused) return;
    this.hadLoss = true;
    this.gesture.reset();
    this.state = Number.isFinite(this.lastSeen) ? "lost" : "idle";
  }

  /** Transfer control without carrying timestamps, a held flip or the previous actor's pose. */
  adoptPose(pose: Pose, now: number) {
    this.reset();
    this.pose = { ...pose };
    this.target = { ...pose };
    this.lastSeen = now;
    this.state = "lost";
  }

  ingest(
    signal: Signal,
    timestamp: number,
    now: number,
    settings: Settings,
    normalized = false,
  ): boolean {
    if (
      this.paused ||
      timestamp <= this.lastTimestamp ||
      now - timestamp > 350 ||
      now < timestamp
    )
      return false;
    this.lastTimestamp = timestamp;
    this.lastSeen = now;
    const raw = normalized
      ? signal.fingers.map((v) => clamp(v))
      : normalizeFingers(signal, settings);
    // Filter channels using result timestamps, rather than display FPS.
    const dt = this.lastUpdate
      ? clamp((timestamp - this.lastUpdate) / 1000, 0, 0.15)
      : 0.033;
    const a = 1 - Math.exp(-dt / (0.012 + settings.smoothing * 0.11));
    this.lastUpdate = timestamp;
    this.fingers = raw.map((v, i) => lerp(this.fingers[i], v, a));
    const values = Object.fromEntries(
      settings.assignments.map((action, i) => [action, this.fingers[i]]),
    ) as Record<Action, number>;
    const p = settings.profiles[settings.hand];
    const b = p.bounds;
    let x = normalized
      ? signal.x
      : clamp((signal.x - b.minX) / (b.maxX - b.minX));
    const y = normalized
      ? signal.y
      : clamp((signal.y - b.minY) / (b.maxY - b.minY));
    if (!normalized && settings.mirror) x = 1 - x;
    const mappedX = 0.5 + (x - 0.5) * 0.8 * settings.motion;
    const mappedY = 0.53 + (y - 0.5) * 0.4 * settings.motion;
    const recovering =
      this.hadLoss && Number.isFinite(this.lastSeen) && this.state !== "idle";
    if (this.hadLoss) {
      this.gesture.reset();
      this.recoveryUntil = now + 280;
      // Rebase after a tracking gap: re-entry far away must not teleport the puppet.
      this.anchor = recovering
        ? { x: this.pose.x - mappedX, y: this.pose.y - mappedY }
        : null;
      this.hadLoss = false;
    }
    this.target = {
      x: clamp(mappedX + (this.anchor?.x ?? 0), 0.12, 0.88),
      y: clamp(mappedY + (this.anchor?.y ?? 0), 0.33, 0.73),
      tilt: clamp(
        wrapAngle(signal.angle - (normalized ? 0 : p.neutralAngle)) *
          (settings.mirror && !normalized ? -1 : 1),
        -0.6,
        0.6,
      ),
      mouth: values.mouth,
      rightArm: values.rightArm,
      leftArm: values.leftArm,
      head: values.head * 0.55,
      facing: this.pose.facing,
    };
    // The dwell and release already reject brief noise. Use the normalized
    // reading so a held 60% gesture does not wait for smoothing to exceed 60%.
    if (this.gesture.update(raw[settings.assignments.indexOf("flip")], now))
      this.target.facing = this.pose.facing === 1 ? -1 : 1;
    this.state = "tracking";
    return true;
  }

  tick(now: number, dt: number, smoothing: number) {
    if (this.paused) {
      this.state = "paused";
      return;
    }
    if (now - this.lastSeen > 300 && this.state === "tracking") this.markLost();
    if (this.state === "idle") return;
    if (this.state === "lost") {
      if (now - this.lastSeen <= 300) return;
      this.target = {
        ...this.target,
        x: this.pose.x,
        y: this.pose.y,
        tilt: 0,
        mouth: 0,
        head: 0,
        rightArm: 0.16,
        leftArm: 0.12,
      };
      this.fingers = this.fingers.map((v) =>
        lerp(v, 0, 1 - Math.exp(-dt / 0.3)),
      );
    }
    const tau =
      this.state === "lost"
        ? 0.45
        : now < this.recoveryUntil
          ? 0.13
          : 0.018 + smoothing * 0.065;
    const a = 1 - Math.exp(-Math.max(0, Math.min(dt, 0.1)) / tau);
    for (const key of [
      "x",
      "y",
      "tilt",
      "mouth",
      "rightArm",
      "leftArm",
      "head",
    ] as const)
      this.pose[key] = lerp(this.pose[key], this.target[key], a);
    this.pose.facing = this.target.facing;
  }
}

export function parseSettings(value: unknown): Settings {
  const defaults = defaultSettings();
  if (!value || typeof value !== "object") return defaults;
  const s = value as Partial<Settings>;
  const num = (v: unknown, d: number, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) ? clamp(v, min, max) : d;
  const profiles = { ...defaults.profiles };
  for (const hand of ["Right", "Left"] as const) {
    const p = s.profiles?.[hand];
    if (
      p &&
      Array.isArray(p.low) &&
      Array.isArray(p.high) &&
      p.low.length === 5 &&
      p.high.length === 5 &&
      [
        ...p.low,
        ...p.high,
        p.neutralAngle,
        ...Object.values(p.bounds ?? {}),
      ].every(Number.isFinite) &&
      p.high.every((v, i) => v - p.low[i] >= 0.08) &&
      p.bounds?.maxX - p.bounds?.minX >= 0.1 &&
      p.bounds?.maxY - p.bounds?.minY >= 0.1
    )
      profiles[hand] = {
        low: [...p.low],
        high: [...p.high],
        bounds: { ...p.bounds },
        neutralAngle: p.neutralAngle,
        calibrated: !!p.calibrated,
      };
  }
  const hand = s.hand === "Left" ? "Left" : "Right";
  const legacyCharacter = isCharacterId(s.character) ? s.character : defaults.character;
  const characters = {
    Right: isCharacterId(s.characters?.Right) ? s.characters.Right
      : hand === "Right" ? legacyCharacter : defaults.characters.Right,
    Left: isCharacterId(s.characters?.Left) ? s.characters.Left
      : hand === "Left" ? legacyCharacter : defaults.characters.Left,
  };
  return {
    character: characters[hand],
    characters,
    handMode: s.handMode === "dual" ? "dual" : "single",
    accessories: typeof s.accessories === "boolean" ? s.accessories : true,
    mirror: typeof s.mirror === "boolean" ? s.mirror : defaults.mirror,
    hand,
    smoothing: num(s.smoothing, defaults.smoothing, 0, 1),
    motion: num(s.motion, defaults.motion, 0.5, 1.5),
    gain: FINGERS.map((_, i) => num(s.gain?.[i], 1, 0.5, 1.8)),
    assignments:
      Array.isArray(s.assignments) &&
      s.assignments.length === 5 &&
      new Set(s.assignments).size === 5 &&
      s.assignments.every((a) => ACTIONS.includes(a))
        ? [...s.assignments]
        : defaults.assignments,
    theme: ["amber", "ivory", "night"].includes(s.theme ?? "")
      ? s.theme!
      : "amber",
    rods: typeof s.rods === "boolean" ? s.rods : true,
    profiles,
  };
}
