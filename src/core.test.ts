import { describe, expect, it } from "vitest";
import {
  FlipGesture,
  PuppetController,
  averageSignals,
  buildProfile,
  defaultSettings,
  extractSignal,
  normalizeFingers,
  parseSettings,
  wrapAngle,
  type Signal,
} from "./core";

const sample = (extra: Partial<Signal> = {}): Signal => ({
  x: 0.5,
  y: 0.5,
  angle: 0,
  fingers: [0, 0, 0, 0, 0],
  ...extra,
});

describe("finger calibration and geometry", () => {
  it("normalizes all five channels, applies gain, and clamps out-of-range readings", () => {
    const settings = defaultSettings();
    settings.profiles.Right.low = [1, 0, 0, 0, 0];
    settings.profiles.Right.high = [2, 1, 1, 1, 1];
    settings.gain[1] = 1.5;
    expect(
      normalizeFingers(sample({ fingers: [1.5, 0.5, -1, 2, 0.5] }), settings),
    ).toEqual([0.5, 0.75, 0, 1, 0.5]);
  });
  it("does not amplify an unusably small calibration range", () => {
    const settings = defaultSettings();
    settings.profiles.Right.high[0] = settings.profiles.Right.low[0] + 0.01;
    expect(
      normalizeFingers(sample({ fingers: [2, 0, 0, 0, 0] }), settings)[0],
    ).toBe(0);
  });
  it("rejects individual fingers with insufficient observed movement", () => {
    expect(() =>
      buildProfile(
        sample(),
        sample({ fingers: [1, 1, 1, 0.02, 1] }),
        sample({ x: 0.2, y: 0.2 }),
        sample({ x: 0.8, y: 0.8 }),
      ),
    ).toThrow("นิ้วนาง");
  });
  it("accepts corners in either mirrored order and retains the neutral angle", () => {
    const p = buildProfile(
      sample({ angle: 0.2 }),
      sample({ fingers: [1, 1, 1, 1, 1] }),
      sample({ x: 0.8, y: 0.2 }),
      sample({ x: 0.2, y: 0.8 }),
    );
    expect(p.bounds).toEqual({ minX: 0.2, maxX: 0.8, minY: 0.2, maxY: 0.8 });
    expect(p.neutralAngle).toBe(0.2);
  });
  it("rejects a movement area that would magnify noise", () => {
    expect(() =>
      buildProfile(
        sample(),
        sample({ fingers: [1, 1, 1, 1, 1] }),
        sample(),
        sample({ x: 0.51, y: 0.51 }),
      ),
    ).toThrow("พื้นที่");
  });
  it("averages orientations across the ±pi boundary without turning the puppet over", () => {
    expect(
      Math.abs(
        averageSignals([
          sample({ angle: Math.PI - 0.02 }),
          sample({ angle: -Math.PI + 0.02 }),
        ]).angle,
      ),
    ).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI * 2 + 0.2)).toBeCloseTo(0.2);
  });
  it("rejects invalid and degenerate landmark inputs", () => {
    expect(extractSignal([], [])).toBeNull();
    expect(
      extractSignal(
        Array(21).fill({ x: 0, y: 0, z: 0 }),
        Array(21).fill({ x: 0, y: 0, z: 0 }),
      ),
    ).toBeNull();
  });
  it("measures thumb opening without depending on the index fingertip", () => {
    const points = Array.from({ length: 21 }, (_, i) => ({
      x: 0.01 * i,
      y: (i % 4) * 0.01,
      z: 0,
    }));
    const first = extractSignal(points, points)!.fingers[0];
    const changed = points.map((p) => ({ ...p }));
    changed[8] = { x: 0.9, y: 0.9, z: 0.8 };
    expect(extractSignal(points, changed)!.fingers[0]).toBe(first);
  });
});

describe("pinky flip gesture", () => {
  it("requires release to arm and flips once per hold", () => {
    const g = new FlipGesture();
    expect(g.update(1, 0)).toBe(false);
    expect(g.update(1, 500)).toBe(false);
    g.update(0, 600);
    g.update(0, 801);
    expect(g.update(1, 900)).toBe(false);
    expect(g.update(1, 1251)).toBe(true);
    expect(g.update(1, 2000)).toBe(false);
    g.update(0, 2100);
    g.update(0, 2301);
    g.update(1, 2400);
    expect(g.update(1, 2751)).toBe(true);
  });
  it("cancels a partial hold when the finger leaves the trigger range", () => {
    const g = new FlipGesture();
    g.update(0, 0);
    g.update(0, 201);
    g.update(1, 300);
    g.update(0.5, 500);
    expect(g.update(1, 700)).toBe(false);
    expect(g.update(1, 900)).toBe(false);
  });
  it("requires a fresh release after losing tracking", () => {
    const g = new FlipGesture();
    g.update(0, 0);
    g.update(0, 201);
    g.update(1, 300);
    g.reset();
    expect(g.update(1, 900)).toBe(false);
    expect(g.update(1, 1400)).toBe(false);
  });
});

describe("puppet controller", () => {
  it("ignores stale, future and out-of-order results", () => {
    const c = new PuppetController(),
      settings = defaultSettings();
    expect(c.ingest(sample(), 100, 600, settings, true)).toBe(false);
    expect(c.ingest(sample(), 700, 600, settings, true)).toBe(false);
    expect(c.ingest(sample(), 600, 600, settings, true)).toBe(true);
    expect(c.ingest(sample(), 599, 620, settings, true)).toBe(false);
  });
  it("freezes briefly on loss, relaxes joints later, and preserves position", () => {
    const c = new PuppetController(),
      settings = defaultSettings();
    c.ingest(
      sample({ x: 0.8, fingers: [1, 1, 1, 1, 0] }),
      1000,
      1000,
      settings,
      true,
    );
    c.tick(1100, 0.1, 0.1);
    const position = c.pose.x;
    const arm = c.pose.rightArm;
    c.markLost();
    c.tick(1200, 0.1, 0.1);
    expect(c.pose.x).toBe(position);
    expect(c.pose.rightArm).toBe(arm);
    c.tick(1600, 0.1, 0.1);
    expect(c.pose.x).toBe(position);
    expect(c.pose.rightArm).toBeLessThan(arm);
  });
  it("rebases position after loss so distant re-entry cannot teleport the puppet", () => {
    const c = new PuppetController(),
      settings = defaultSettings();
    c.ingest(sample({ x: 0.8 }), 1000, 1000, settings, true);
    c.tick(1100, 0.1, 0.1);
    c.markLost();
    const position = c.pose.x;
    c.ingest(sample({ x: 0.1 }), 2000, 2000, settings, true);
    c.tick(2016, 0.016, 0.1);
    expect(c.pose.x).toBeCloseTo(position);
    c.ingest(sample({ x: 0.2 }), 2030, 2030, settings, true);
    expect(c.target.x).toBeGreaterThan(position);
  });
  it("does not change pose or gesture while paused", () => {
    const c = new PuppetController(),
      settings = defaultSettings();
    const before = { ...c.pose };
    c.setPaused(true);
    expect(c.ingest(sample({ x: 0.9 }), 1000, 1000, settings, true)).toBe(
      false,
    );
    c.tick(2000, 0.1, 0);
    expect(c.pose).toEqual(before);
    expect(c.state).toBe("paused");
  });
  it("preserves five independent assignments after swapping controls", () => {
    const c = new PuppetController(),
      settings = defaultSettings();
    settings.smoothing = 0;
    [settings.assignments[0], settings.assignments[3]] = [
      settings.assignments[3],
      settings.assignments[0],
    ];
    c.ingest(sample({ fingers: [1, 0, 0, 0, 0] }), 1000, 1000, settings, true);
    expect(c.target.head).toBeGreaterThan(0.4);
    expect(c.target.mouth).toBe(0);
  });
  it("mirrors camera position without changing finger assignments", () => {
    const settings = defaultSettings();
    settings.profiles.Right.bounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const mirrored = new PuppetController();
    mirrored.ingest(sample({ x: 0.2 }), 1000, 1000, settings);
    settings.mirror = false;
    const normal = new PuppetController();
    normal.ingest(sample({ x: 0.2 }), 1000, 1000, settings);
    expect(mirrored.target.x).toBeGreaterThan(0.5);
    expect(normal.target.x).toBeLessThan(0.5);
  });
});

describe("persisted settings", () => {
  it("recovers from malformed settings and duplicate assignments", () => {
    const p = parseSettings({
      smoothing: "bad",
      motion: -50,
      gain: [null, Infinity],
      assignments: ["flip", "flip", "flip", "flip", "flip"],
      profiles: { Right: { low: [] } },
    });
    expect(p.smoothing).toBe(0.45);
    expect(p.motion).toBe(0.5);
    expect(p.gain).toEqual([1, 1, 1, 1, 1]);
    expect(new Set(p.assignments).size).toBe(5);
    expect(p.profiles.Right.calibrated).toBe(false);
  });
  it("round-trips a calibrated hand profile without mixing hand sides", () => {
    const settings = defaultSettings();
    settings.profiles.Left.calibrated = true;
    const p = parseSettings(JSON.parse(JSON.stringify(settings)));
    expect(p.profiles.Left.calibrated).toBe(true);
    expect(p.profiles.Right.calibrated).toBe(false);
  });
});
