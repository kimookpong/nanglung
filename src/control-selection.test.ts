import { describe, expect, it } from "vitest";
import { defaultSettings } from "./core";
import { initialCast, memberForHand } from "./cast";
import { activeHands } from "./ensemble";
import { checkHandControl } from "./control-selection";

describe("toolbar hand checkboxes", () => {
  it("enables the second hand without changing the first actor, pose or calibration", () => {
    const settings = defaultSettings(),
      cast = initialCast(settings);
    settings.profiles.Left.calibrated = true;
    memberForHand(cast, "Right")!.pose.mouth = 0.8;
    const before = structuredClone(cast);
    expect(checkHandControl(cast, settings, "Left", true, false)).toEqual({
      accepted: true,
      paused: false,
    });
    expect(activeHands(settings)).toEqual(["Left", "Right"]);
    expect(settings.hand).toBe("Left");
    expect(cast).toEqual(before);
    expect(settings.profiles.Left.calibrated).toBe(true);
  });
  it("unchecks one hand while the other continues and retains both bindings", () => {
    const settings = defaultSettings(),
      cast = initialCast(settings);
    settings.handMode = "dual";
    const before = structuredClone(cast);
    expect(checkHandControl(cast, settings, "Right", false, false).paused).toBe(
      false,
    );
    expect(activeHands(settings)).toEqual(["Left"]);
    expect(cast).toEqual(before);
  });
  it("pauses when the last box is cleared and resumes only the checked hand", () => {
    const settings = defaultSettings(),
      cast = initialCast(settings);
    expect(checkHandControl(cast, settings, "Right", false, false).paused).toBe(
      true,
    );
    expect(checkHandControl(cast, settings, "Left", true, true).paused).toBe(
      false,
    );
    expect(activeHands(settings)).toEqual(["Left"]);
  });
  it("assigns an unbound actor when checking a second hand", () => {
    const settings = defaultSettings(),
      cast = initialCast(settings);
    cast.controls.Left = null;
    expect(checkHandControl(cast, settings, "Left", true, false).accepted).toBe(
      true,
    );
    expect(cast.controls).toEqual({
      Left: "initial-Left",
      Right: "initial-Right",
    });
    expect(settings.handMode).toBe("dual");
  });
  it("does not let two hands control the same actor", () => {
    const settings = defaultSettings(),
      cast = initialCast(settings);
    cast.members = cast.members.filter(
      (member) => member.id === cast.controls.Right,
    );
    cast.controls.Left = null;
    const before = structuredClone({ settings, cast });
    expect(checkHandControl(cast, settings, "Left", true, false)).toEqual({
      accepted: false,
      paused: false,
    });
    expect({ settings, cast }).toEqual(before);
  });
  it("rejects the opposite hand even when the actor is paused", () => {
    const settings = defaultSettings(),
      cast = initialCast(settings);
    cast.members = cast.members.filter(
      (member) => member.id === cast.controls.Right,
    );
    cast.controls.Left = null;
    const before=structuredClone({cast,settings});
    expect(checkHandControl(cast, settings, "Left", true, true).accepted).toBe(false);
    expect({cast,settings}).toEqual(before);
  });
});
