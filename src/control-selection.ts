import type { HandSide, Settings } from "./core";
import { memberForHand, selectMember, type CastState } from "./cast";
import { activeHands } from "./ensemble";

/** The toolbar checkboxes enable hand/actor pairs; an empty selection pauses. */
export function checkHandControl(
  cast: CastState,
  settings: Settings,
  side: HandSide,
  enabled: boolean,
  paused: boolean,
): { accepted: boolean; paused: boolean } {
  const other = side === "Left" ? "Right" : "Left";
  const otherEnabled =
    !paused &&
    activeHands(settings).includes(other) &&
    !!memberForHand(cast, other);
  if (enabled) {
    if (!memberForHand(cast, side)) {
      const member = cast.members.find(member => member.side === side);
      if (!member) return { accepted: false, paused };
      selectMember(cast, member.id, side);
    }
    settings.hand = side;
    settings.handMode = otherEnabled ? "dual" : "single";
    return { accepted: true, paused: false };
  }
  settings.hand = otherEnabled ? other : side;
  settings.handMode = "single";
  return { accepted: true, paused: !otherEnabled };
}
