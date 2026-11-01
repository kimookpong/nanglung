import { describe, expect, it } from "vitest";
import { addMember, initialCast, moveMember, placement } from "./cast";
import { defaultSettings } from "./core";

describe("actor display side", () => {
  it("retains the reference size as a bank grows and keeps same-side actors closer", () => {
    const cast = initialCast(defaultSettings()), reference = placement(cast, cast.members[0]);
    const added = addMember(cast, "thaksin", "Left", "neighbor")!;
    expect(Math.abs(placement(cast, added).x - placement(cast, cast.members[0]).x)).toBeLessThan(.15);
    for (let i = 0; i < 9; i++) addMember(cast, "prayut", "Left", `extra-${i}`);
    expect(cast.members.every(m => placement(cast, m).scale === reference.scale)).toBe(true);
    moveMember(cast, added.id, "Right");
    expect(placement(cast, added).scale).toBe(reference.scale);
    const left = cast.members.filter(m => m.side === "Left").map(m => placement(cast, m).x);
    expect(Math.max(...left) - Math.min(...left)).toBeLessThan(.25);
  });
  it("moves one actor without changing hand ownership, count or other poses", () => {
    const cast = initialCast(defaultSettings());
    cast.members[0].pose.mouth = 0.8;
    const controls = { ...cast.controls },
      other = structuredClone(cast.members[1]);
    expect(moveMember(cast, cast.members[0].id, "Right")).toBe(true);
    expect(cast.members).toHaveLength(2);
    expect(cast.controls).toEqual(controls);
    expect(cast.members[0].side).toBe("Right");
    expect(cast.members[0].pose.mouth).toBe(0.8);
    expect(cast.members[0].pose.facing).toBe(-1);
    expect(cast.members[1]).toEqual(other);
  });
  it("keeps a side selected and ignores unchanged or unknown actors", () => {
    const cast = initialCast(defaultSettings()),
      before = structuredClone(cast);
    expect(moveMember(cast, cast.members[0].id, "Left")).toBe(false);
    expect(moveMember(cast, "missing", "Right")).toBe(false);
    expect(cast).toEqual(before);
  });
});
