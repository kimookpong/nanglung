import { describe, expect, it } from "vitest";
import { defaultSettings, parseSettings, type HandSide } from "./core";
import { HandEnsemble, activeHands, handSettings } from "./ensemble";
import type { TrackedHand } from "./vision-worker";

function hand(side: HandSide, bent = false): TrackedHand {
  const x = side === "Left" ? 0.25 : 0.75;
  const image = Array.from({ length: 21 }, (_, i) => ({ x: x + i * 0.003, y: 0.4 + (i % 4) * 0.02, z: 0 }));
  image[0] = { x, y: 0.75, z: 0 };
  const world = image.map(p => ({ ...p }));
  world[17] = { x, y: 0.4, z: 0 };
  world[18] = { x, y: 0.3, z: 0 };
  world[19] = { x, y: bent ? 0.4 : 0.2, z: 0 };
  world[20] = { x, y: bent ? 0.3 : 0.1, z: 0 };
  return { side, image, world };
}
const dual = () => ({ ...defaultSettings(), handMode: "dual" as const, smoothing: 0 });

describe("independent hand slots", () => {
  it("routes both hands by handedness even when detection order reverses", () => {
    const settings = dual(), ensemble = new HandEnsemble();
    ensemble.reset(settings);
    for (let time = 100; time <= 300; time += 50) {
      const hands = time % 100 ? [hand("Right"), hand("Left")] : [hand("Left"), hand("Right")];
      ensemble.accept({ hands, timestamp: time, inference: 10 }, time, settings, 4 / 3);
      expect(ensemble.sessions.Left.position?.x).toBe(0.25);
      expect(ensemble.sessions.Right.position?.x).toBe(0.75);
      expect(ensemble.sessions.Left.controller.lastSeen).toBe(time);
      expect(ensemble.sessions.Right.controller.lastSeen).toBe(time);
    }
  });
  it("loses one actor without stopping the other or borrowing its hand", () => {
    const settings = dual(), ensemble = new HandEnsemble();
    ensemble.accept({ hands: [hand("Left"), hand("Right")], timestamp: 100, inference: 1 }, 100, settings, 1);
    ensemble.accept({ hands: [hand("Right")], timestamp: 200, inference: 1 }, 200, settings, 1);
    expect(ensemble.sessions.Left.signal).toBeNull();
    expect(ensemble.sessions.Left.controller.state).toBe("lost");
    expect(ensemble.sessions.Right.controller.state).toBe("tracking");
    expect(ensemble.sessions.Right.controller.lastSeen).toBe(200);
  });
  it("keeps pinky flips independent and requires release before a second flip", () => {
    const settings = dual(), ensemble = new HandEnsemble();
    ensemble.reset(settings);
    for (let time = 100; time <= 3000; time += 50) {
      const bent = time >= 700 && time <= 1700 || time >= 2300;
      ensemble.accept({ hands: [hand("Left", bent), hand("Right")], timestamp: time, inference: 1 }, time, settings, 1);
      for (const side of activeHands(settings)) ensemble.sessions[side].controller.tick(time, 0.05, 0);
      if (time === 1700) expect(ensemble.sessions.Left.controller.pose.facing).toBe(-1);
      expect(ensemble.sessions.Right.controller.pose.facing).toBe(-1);
    }
    expect(ensemble.sessions.Left.controller.pose.facing).toBe(1);
  });
  it("samples calibration without moving either paused actor", () => {
    const settings = dual(), ensemble = new HandEnsemble();
    ensemble.reset(settings);
    ensemble.setPaused(true);
    ensemble.accept({ hands: [hand("Left"), hand("Right")], timestamp: 100, inference: 1 }, 100, settings, 1, true);
    expect(ensemble.sessions.Left.signal).not.toBeNull();
    expect(ensemble.sessions.Right.signal).not.toBeNull();
    expect(ensemble.sessions.Left.controller.state).toBe("paused");
    expect(ensemble.sessions.Right.controller.state).toBe("paused");
    expect(ensemble.sessions.Left.controller.pose.x).toBe(0.3);
    expect(ensemble.sessions.Right.controller.pose.x).toBe(0.7);
  });
  it("ignores late frames and clears both hands on a stale frame", () => {
    const settings = dual(), ensemble = new HandEnsemble();
    const hands = [hand("Left"), hand("Right")];
    ensemble.accept({ hands, timestamp: 200, inference: 1 }, 200, settings, 1);
    ensemble.accept({ hands: [], timestamp: 150, inference: 1 }, 220, settings, 1);
    expect(ensemble.sessions.Left.controller.state).toBe("tracking");
    ensemble.accept({ hands, timestamp: 250, inference: 1 }, 700, settings, 1);
    expect(ensemble.sessions.Left.signal).toBeNull();
    expect(ensemble.sessions.Right.signal).toBeNull();
  });
  it("uses only the selected hand in single mode", () => {
    const settings = defaultSettings(), ensemble = new HandEnsemble();
    ensemble.accept({ hands: [hand("Left"), hand("Right")], timestamp: 100, inference: 1 }, 100, settings, 1);
    expect(ensemble.sessions.Left.signal).toBeNull();
    expect(ensemble.sessions.Right.signal).not.toBeNull();
  });
});

describe("two-hand settings", () => {
  it("migrates an existing single-hand character and keeps its calibration", () => {
    const legacy = { ...defaultSettings(), character: "sikaew", hand: "Left", characters: undefined, handMode: undefined };
    legacy.profiles.Left.calibrated = true;
    const settings = parseSettings(legacy);
    expect(settings.characters.Left).toBe("sikaew");
    expect(settings.character).toBe("sikaew");
    expect(settings.handMode).toBe("single");
    expect(settings.profiles.Left.calibrated).toBe(true);
  });
  it("persists different characters and applies the matching hand profile", () => {
    const settings = dual();
    settings.characters = { Left: "khwanmuang", Right: "yodthong" };
    settings.profiles.Left.calibrated = true;
    const restored = parseSettings(JSON.parse(JSON.stringify(settings)));
    expect(restored.characters).toEqual(settings.characters);
    expect(restored.handMode).toBe("dual");
    expect(handSettings(restored, "Left").character).toBe("khwanmuang");
    expect(handSettings(restored, "Left").profiles.Left.calibrated).toBe(true);
    expect(handSettings(restored, "Right").profiles.Right.calibrated).toBe(false);
  });
});
