import { describe, expect, it } from "vitest";
import { depthPoint, depthProgress, undoDepthPoint } from "./puppet-depth";
import { actorPoint } from "./stage-geometry";

const profile = { start: -140, end: 143 };
describe("puppet head-to-foot projection", () => {
  it("keeps the head unchanged and grows continuously toward the feet", () => {
    expect(depthPoint(80, -220, profile)).toEqual({ x: 80, y: -220 });
    let previous = 1;
    for (let y = profile.start; y <= profile.end; y++) {
      const scale = depthPoint(100, y, profile).x / 100;
      expect(scale).toBeGreaterThanOrEqual(previous);
      expect(scale).toBeLessThanOrEqual(1.07);
      previous = scale;
    }
    expect(depthProgress(profile.end, profile)).toBe(1);
    expect(depthPoint(100, profile.end, profile).x).toBeCloseTo(107);
  });
  it("recovers points above the head, through the body, and below the feet", () => {
    for (const y of [-390, -220, -140, -139, -75, 0, 100, 143, 200, 390])
      for (const x of [-290, -90, 0, 130, 290]) {
        const warped = depthPoint(x, y, profile), original = undoDepthPoint(warped.x, warped.y, profile);
        expect(original.x).toBeCloseTo(x, 7);
        expect(original.y).toBeCloseTo(y, 7);
      }
  });
  it("picks the expanded lower body through rotation, shear and intermediate turns", () => {
    for (const horizontal of [-1, -.45, .45, 1])
      for (const angle of [-.4, .3]) {
        const scale = .68, shear = .03, local = depthPoint(75, 125, profile);
        const dx = scale * (horizontal * local.x + shear * local.y), dy = scale * local.y;
        const hit = actorPoint(500 + dx * Math.cos(angle) - dy * Math.sin(angle), 400 + dx * Math.sin(angle) + dy * Math.cos(angle),
          { x: 500, y: 400, scale, facing: 1, angle, horizontalScale: horizontal, shear, depth: profile });
        expect(hit.x).toBeCloseTo(425, 7);
        expect(hit.y).toBeCloseTo(525, 7);
      }
  });
});
