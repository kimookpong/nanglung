import type { Settings } from "./core";
import { getCharacter } from "./characters";
import { activeHands } from "./ensemble";
import type { CastState } from "./cast";
import type { CatalogEntry } from "./catalog";
import { characterPreview, icon } from "./ui-assets";

export function renderCatalog(
  entries: CatalogEntry[],
  cast: CastState,
  settings: Settings,
) {
  return entries
    .map((entry, index) => {
      const character = getCharacter(entry.character),
        member = entry.member;
      const selected = !!member && cast.controls[settings.hand] === member.id;
      const hand =
        member &&
        activeHands(settings).find((hand) => cast.controls[hand] === member.id);
      const name = character.name + (entry.copy > 1 ? ` ${entry.copy}` : "");
      return `<div class="stage-member ${member ? "on-stage" : ""} ${selected ? "active" : ""}"><button class="stage-member-select" data-dock-member="${member?.id ?? ""}" data-dock-character="${character.id}" aria-label="เชิด${name} ตัวที่${index + 1}" aria-pressed="${selected}" aria-description="${member ? (hand ? `ควบคุมด้วยมือ${hand === "Left" ? "ซ้าย" : "ขวา"}` : "แสดงอยู่บนเวที") : "เลือกฝั่งหรือคลิกภาพเพื่อแสดงและเชิด"}">${characterPreview(character.id, `dock-${entry.key}`)}<strong>${name}</strong><span class="member-check">${icon("check")}</span></button><div class="stage-side-options" role="group" aria-label="ฝั่งแสดงของ${name} ตัวที่${index + 1}">${(["Left", "Right"] as const).map((side) => `<label><input type="checkbox" data-catalog-character="${character.id}" data-placement-member="${member?.id ?? ""}" value="${side}" ${member?.side === side ? "checked" : ""} aria-label="แสดง${name}ฝั่ง${side === "Left" ? "ซ้าย" : "ขวา"} ตัวที่${index + 1}"/><span>${side === "Left" ? "ซ้าย" : "ขวา"}</span></label>`).join("")}</div></div>`;
    })
    .join("");
}
