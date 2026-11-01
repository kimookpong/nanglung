import { describe, expect, it } from "vitest";
import { PuppetTurn, PUPPET_TURN_MS } from "./puppet-turn";
import { actorPoint } from "./stage-geometry";

describe("leather puppet turning motion", () => {
  it("starts in the saved direction without an entrance flip", () => {
    expect(new PuppetTurn(-1).sample(-1, 400)).toEqual({
      horizontalScale: -1,
      shear: 0,
      active: false,
    });
  });
  it("rotates continuously through the thin edge before reaching the other face", () => {
    const turn = new PuppetTurn(1);
    expect(turn.sample(-1, 100).horizontalScale).toBe(1);
    expect(
      turn.sample(-1, 100 + PUPPET_TURN_MS / 4).horizontalScale,
    ).toBeGreaterThan(0);
    expect(
      turn.sample(-1, 100 + PUPPET_TURN_MS / 2).horizontalScale,
    ).toBeCloseTo(0);
    expect(
      turn.sample(-1, 100 + PUPPET_TURN_MS * 0.75).horizontalScale,
    ).toBeLessThan(0);
    expect(turn.sample(-1, 100 + PUPPET_TURN_MS)).toEqual({
      horizontalScale: -1,
      shear: 0,
      active: false,
    });
  });
  it("can reverse midway without snapping to a full-width image", () => {
    const turn = new PuppetTurn(1);
    turn.sample(-1, 0);
    const before = turn.sample(-1, 130);
    expect(turn.sample(1, 130).horizontalScale).toBeCloseTo(
      before.horizontalScale,
    );
    expect(turn.sample(1, 650).horizontalScale).toBe(1);
  });
  it("freezes during pause and resumes from the same angle", () => {
    const turn = new PuppetTurn(1);
    turn.sample(-1, 0);
    const paused = turn.sample(-1, 130, true);
    expect(turn.sample(-1, 2130, true)).toEqual(paused);
    expect(turn.sample(-1, 2130)).toEqual(paused);
    expect(turn.sample(-1, 2520).horizontalScale).toBe(-1);
  });
  it("inverts the rendered width and shear for accurate picking", () => {
    const t = {
      x: 500,
      y: 300,
      scale: 1.46,
      facing: -1 as const,
      angle: 0.3,
      horizontalScale: -0.5,
      shear: 0.035,
    };
    const local = { x: 25, y: -100 };
    const dx = t.scale * (local.x * t.horizontalScale + local.y * t.shear),
      dy = t.scale * local.y;
    const point = actorPoint(
      t.x + dx * Math.cos(t.angle) - dy * Math.sin(t.angle),
      t.y + dx * Math.sin(t.angle) + dy * Math.cos(t.angle),
      t,
    );
    expect(point.x).toBeCloseTo(local.x + 350);
    expect(point.y).toBeCloseTo(local.y + 400);
    expect(actorPoint(500, 300, { ...t, horizontalScale: 0 }).x).toBe(Infinity);
  });
});
