import { describe, expect, it } from "vitest";
import { CHARACTERS, isCharacterId } from "./characters";
import { hasRetiredCastMembers, parseCast } from "./cast";
import { catalogEntries } from "./catalog";
import { defaultSettings, parseSettings, restPose } from "./core";

const retired = ["nunui", "sikaew", "yodthong", "khwanmuang"];
const members = retired.map((character, index) => ({ id: `retired-${index}`, character, side: "Left", pose: restPose() }));
describe("removed character migration", () => {
  it("removes every retired design and keeps only the six supported choices", () => {
    const cast = parseCast({ version: 1, members, controls: { Left: "retired-0", Right: "retired-1" } }, defaultSettings());
    expect(hasRetiredCastMembers({ members })).toBe(true);
    expect(cast).toEqual({ version: 1, members: [], controls: { Left: null, Right: null } });
    expect(parseCast(JSON.parse(JSON.stringify(cast)), defaultSettings())).toEqual(cast);
    expect(catalogEntries(cast)).toHaveLength(6);
    expect(CHARACTERS.map(c => c.name)).toEqual(["ลุงเท่ง", "ลุงตู่", "ลุงแม้ว", "ลุงป้อม", "ลุงหนู", "ลุงเอก"]);
    expect(retired.some(isCharacterId)).toBe(false);
  });
  it("preserves surviving actors, poses and bindings without selecting a replacement", () => {
    const survivor = { id: "surviving", character: "anutin", side: "Right", pose: { ...restPose(), mouth: .8 } };
    const value = { version: 1, members: [...members, survivor], controls: { Left: "retired-0", Right: "surviving" } };
    const cast = parseCast(value, defaultSettings());
    expect(cast.members).toEqual([survivor]);
    expect(cast.controls).toEqual({ Left: null, Right: "surviving" });
    expect(parseCast({ ...value, controls: { Left: "retired-0", Right: "retired-1" } }, defaultSettings()).controls)
      .toEqual({ Left: null, Right: null });
    expect(hasRetiredCastMembers(cast)).toBe(false);
  });
  it("repairs old settings while preserving hand calibration and assignments", () => {
    const old = defaultSettings(); old.profiles.Left.calibrated = true; old.assignments.reverse();
    const settings = parseSettings({ ...old, character: "nunui", characters: { Left: "nunui", Right: "sikaew" }, hand: "Left" });
    expect(isCharacterId(settings.character)).toBe(true);
    expect(Object.values(settings.characters).every(isCharacterId)).toBe(true);
    expect(settings.profiles).toEqual(old.profiles);
    expect(settings.assignments).toEqual(old.assignments);
  });
});
