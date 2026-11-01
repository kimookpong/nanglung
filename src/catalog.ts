import { CHARACTERS, type CharacterId } from "./characters";
import { addMember, moveMember, type CastMember, type CastState } from "./cast";
import type { HandSide } from "./core";

export interface CatalogEntry {
  key: string;
  character: CharacterId;
  member: CastMember | null;
  copy: number;
}

/** The complete library is visible without adding anything to the stage. */
export function catalogEntries(cast: CastState): CatalogEntry[] {
  const represented = new Set<string>();
  const entries: CatalogEntry[] = CHARACTERS.map((character) => {
    const member =
      cast.members.find((member) => member.character === character.id) ?? null;
    if (member) represented.add(member.id);
    return {
      key: member ? `actor-${member.id}` : `catalog-${character.id}`,
      character: character.id,
      member,
      copy: 1,
    };
  });
  // Preserve saved copies and their independent hand bindings from older versions.
  for (const member of cast.members)
    if (!represented.has(member.id))
      entries.push({
        key: `actor-${member.id}`,
        character: member.character,
        member,
        copy:
          cast.members
            .filter((m) => m.character === member.character)
            .indexOf(member) + 1,
      });
  return entries;
}

/** Reuse the existing catalog actor; selecting it twice never creates a copy. */
export function showCatalogCharacter(
  cast: CastState,
  character: CharacterId,
  side: HandSide,
  id: string,
): CastMember | null {
  const member = cast.members.find((member) => member.character === character);
  if (member) {
    moveMember(cast, member.id, side);
    return member;
  }
  return addMember(cast, character, side, id);
}

/** Hiding an actor never silently hands control to a different stage member. */
export function hideCatalogMember(cast: CastState, id: string): boolean {
  if (!cast.members.some((member) => member.id === id)) return false;
  cast.members = cast.members.filter((member) => member.id !== id);
  for (const hand of ["Left", "Right"] as const)
    if (cast.controls[hand] === id) cast.controls[hand] = null;
  return true;
}
