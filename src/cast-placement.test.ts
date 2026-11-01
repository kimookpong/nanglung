import { describe, expect, it } from "vitest";
import { initialCast, moveMember } from "./cast";
import { defaultSettings } from "./core";

describe("actor display side", () => {
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
