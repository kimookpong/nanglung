import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "./characters";
import { defaultSettings } from "./core";
import { addMember, initialCast, parseCast } from "./cast";
import {
  catalogEntries,
  showCatalogCharacter,
  hideCatalogMember,
} from "./catalog";

describe("complete character catalog", () => {
  it("does not start controlling an unselected actor after hiding or reloading", () => {
    const settings = defaultSettings(),
      cast = initialCast(settings);
    addMember(cast, "anutin", "Left", "uncontrolled");
    hideCatalogMember(cast, "initial-Right");
    expect(cast.controls).toEqual({ Left: "initial-Left", Right: null });
    hideCatalogMember(cast, "initial-Left");
    expect(cast.members[0].id).toBe("uncontrolled");
    expect(
      parseCast(JSON.parse(JSON.stringify(cast)), settings).controls,
    ).toEqual({ Left: null, Right: null });
  });
  it("shows every design without changing the saved stage or hand profiles", () => {
    const settings = defaultSettings(),
      cast = initialCast(settings),
      before = structuredClone({ settings, cast });
    expect(catalogEntries(cast).map((entry) => entry.character)).toEqual(
      CHARACTER_IDS,
    );
    expect(catalogEntries(cast).filter((entry) => entry.member)).toHaveLength(
      2,
    );
    expect({ settings, cast }).toEqual(before);
  });
  it("shows a design directly on a chosen side and reuses it on repeated selection", () => {
    const cast = initialCast(defaultSettings()),
      controls = { ...cast.controls };
    const first = showCatalogCharacter(
      cast,
      "anutin",
      "Left",
      "available-anuthin",
    )!;
    expect(first.side).toBe("Left");
    expect(cast.members).toHaveLength(3);
    expect(showCatalogCharacter(cast, "anutin", "Right", "unused-id")).toBe(
      first,
    );
    expect(first.side).toBe("Right");
    expect(cast.members).toHaveLength(3);
    expect(cast.controls).toEqual(controls);
  });
  it("can hide the final actor and restore an intentionally empty stage", () => {
    const settings = defaultSettings(),
      cast = initialCast(settings);
    for (const member of [...cast.members])
      expect(hideCatalogMember(cast, member.id)).toBe(true);
    expect(cast.controls).toEqual({ Left: null, Right: null });
    expect(parseCast(JSON.parse(JSON.stringify(cast)), settings)).toEqual(cast);
    expect(catalogEntries(cast)).toHaveLength(CHARACTER_IDS.length);
    expect(catalogEntries(cast).every((entry) => !entry.member)).toBe(true);
    expect(
      showCatalogCharacter(cast, "theng", "Right", "returning")?.side,
    ).toBe("Right");
  });
  it("retains legacy copies and distinct catalog keys without losing any actor", () => {
    const cast = initialCast(defaultSettings());
    addMember(cast, "theng", "Left", "catalog-anutin");
    const entries = catalogEntries(cast);
    expect(entries).toHaveLength(CHARACTER_IDS.length + 1);
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(CHARACTER_IDS.length + 1);
    expect(
      entries
        .filter((entry) => entry.member)
        .map((entry) => entry.member!.id)
        .sort(),
    ).toEqual(cast.members.map((member) => member.id).sort());
  });
});
