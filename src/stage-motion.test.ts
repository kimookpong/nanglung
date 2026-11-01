import { describe, expect, it } from "vitest";
import { carry, DROP, enterFade, ENTER_MS, exitFade, EXIT_MS, LIFT, MOVE_MS } from "./stage-motion";

describe("stage choreography", () => {
  it("lowers an added puppet from above while it fades in", () => {
    expect(enterFade(0)).toEqual({ dy: -DROP, alpha: 0, done: false });
    const middle = enterFade(ENTER_MS / 2);
    expect(middle.dy).toBeLessThan(0);
    expect(middle.alpha).toBeGreaterThan(.5);
    expect(enterFade(ENTER_MS)).toEqual({ dy: -0, alpha: 1, done: true });
  });
  it("lifts a removed puppet up and away while it fades out", () => {
    expect(exitFade(0)).toEqual({ dy: -0, alpha: 1, done: false });
    const end = exitFade(EXIT_MS);
    expect(end.dy).toBe(-DROP);
    expect(end.alpha).toBe(0);
    expect(end.done).toBe(true);
  });
  it("carries a puppet across the stage in a lifted arc, leaning into the move", () => {
    const from = { x: 400, baseline: 680 }, to = { x: 880, baseline: 680 };
    expect(carry(from, to, 0)).toMatchObject({ x: 400, baseline: 680, done: false });
    const middle = carry(from, to, MOVE_MS / 2);
    expect(middle.x).toBeCloseTo(640, 5);
    expect(middle.baseline).toBeCloseTo(680 - LIFT, 5);
    expect(middle.lean).toBeGreaterThan(0);
    expect(carry(to, from, MOVE_MS / 2).lean).toBeLessThan(0);
    expect(carry(from, to, MOVE_MS)).toMatchObject({ x: 880, baseline: 680, done: true });
  });
  it("barely lifts for a short shuffle within the same side", () => {
    const shuffle = carry({ x: 400, baseline: 680 }, { x: 432, baseline: 680 }, MOVE_MS / 2);
    expect(680 - shuffle.baseline).toBeLessThan(LIFT * .15);
  });
});
