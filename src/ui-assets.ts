import type { Action } from "./core";
import { characterSvg, getCharacter, type CharacterId } from "./characters";

// Inline SVG can share the original PNG with Canvas; SVG loaded through <img>
// cannot load external images and would require a large embedded copy per tile.
export function characterPreview(id: CharacterId, prefix: string) {
  return characterSvg(getCharacter(id), undefined, prefix)
    .replace('role="img"', 'class="puppet-preview" aria-hidden="true"')
    .replaceAll(
      'href="/characters/artwork/',
      `href="${import.meta.env.BASE_URL}characters/artwork/`,
    );
}

const icons = {
  camera:
    '<path d="M14 6l-2-2H6L4 6H2v14h20V6z"/><circle cx="12" cy="13" r="4"/>',
  play: '<path d="M8 5l12 7-12 7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 8M3 3v7h7"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  sliders:
    '<path d="M4 4v6m0 4v6m8-16v10m0 4v2m8-16v2m0 4v10M1 10h6m2 4h6m2-8h6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v.1"/>',
  check: '<path d="M5 12l4 4L19 6"/>',
  close: '<path d="M6 6l12 12M6 18L18 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  hand: '<path d="M8 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9c0 4-3 7-7 7h-1c-3 0-5-2-6-4l-3-5a2 2 0 0 1 3-2l2 2"/>',
  pointer: '<path d="m5 3 14 10-7 1-3 7z"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15z"/>',
  arrange:
    '<path d="M5 4v16M12 4v16M19 4v16"/><circle cx="5" cy="9" r="2"/><circle cx="12" cy="15" r="2"/><circle cx="19" cy="8" r="2"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
};
export function icon(name: keyof typeof icons) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}
export const fingerNames = [
  "นิ้วโป้ง",
  "นิ้วชี้",
  "นิ้วกลาง",
  "นิ้วนาง",
  "นิ้วก้อย",
];
export const actionNames: Record<Action, string> = {
  mouth: "เปิด–ปิดปาก",
  rightArm: "แขนขวา",
  leftArm: "แขนซ้าย",
  head: "ก้ม–เงยศีรษะ",
  flip: "หันซ้าย / ขวา",
};
