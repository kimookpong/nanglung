import { describe, expect, it } from "vitest";
import { restPose } from "./core";
import { stagePaintOrder } from "./stage-order";
import type { StagePlacement } from "./stage-geometry";

const actor = (key: string, x: number, side?: "Left" | "Right") => ({
  key,
  pose: restPose(),
  placement: { x, baseline: 650, scale: 1.02, lean: 0, side } as StagePlacement,
});
const keys = (actors: ReturnType<typeof actor>[]) => stagePaintOrder(actors).map(a => a.key);

describe("stage stacking from center to edges", () => {
  it("puts outer actors in front on both sides regardless of cast order", () => {
    const actors = [actor("left outer", .15), actor("right inner", .6), actor("right outer", .9), actor("left inner", .3)];
    expect(keys(actors)).toEqual(["right inner", "left inner", "left outer", "right outer"]);
    expect(keys([...actors].reverse())).toEqual(keys(actors));
  });

  it("updates priority from actual hand movement and after dragging across the stage", () => {
    const moving = actor("moving", .3, "Left"), fixed = actor("fixed", .25, "Left");
    expect(keys([moving, fixed])).toEqual(["moving", "fixed"]);
    moving.pose.x = .2;
    expect(keys([moving, fixed])).toEqual(["fixed", "moving"]);
    moving.pose.x = .5;
    moving.placement = { ...moving.placement, x: .9, side: "Right" };
    expect(keys([moving, fixed])).toEqual(["fixed", "moving"]);
  });

  it("does not raise selected actors or change the saved cast order", () => {
    const outer = { ...actor("outer", .2), selected: false }, inner = { ...actor("inner", .4), selected: true };
    const actors = [outer, inner], before = structuredClone(actors);
    expect(keys(actors)).toEqual(["inner", "outer"]);
    expect(actors).toEqual(before);
    inner.selected = false;
    outer.selected = true;
    expect(keys(actors)).toEqual(["inner", "outer"]);
  });

  it("keeps cast order stable for equal distances, including opposite edges", () => {
    const actors = [actor("right", .875), actor("same right", .875), actor("left", .125)];
    expect(keys(actors)).toEqual(["right", "same right", "left"]);
    expect(keys([])).toEqual([]);
  });

  it("also orders actors without a placement by their displayed position", () => {
    const outer = { key: "outer", pose: { ...restPose(), x: .1 } }, inner = { key: "inner", pose: { ...restPose(), x: .5 } };
    expect(stagePaintOrder([outer, inner]).map(a => a.key)).toEqual(["inner", "outer"]);
  });
});
