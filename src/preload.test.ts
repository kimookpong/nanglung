import { describe, expect, it } from "vitest";
import SPRITES from "./puppet-sprites.json";
import { artworkSources, LOGO, VISION_FILES } from "./preload";

describe("studio preload", () => {
  it("decodes every puppet sprite and the logo before the studio opens", () => {
    const sources = artworkSources();
    const sprites = Object.entries(SPRITES).flatMap(([id, boxes]) => Object.keys(boxes).map((name) => `/characters/sprites/${id}-${name}.webp`));
    expect(sources).toEqual(expect.arrayContaining([...sprites, LOGO]));
    expect(new Set(sources).size).toBe(sources.length);
  });
  it("warms the hand-tracking worker, model and WASM the camera loads", () => {
    expect(VISION_FILES.map((f) => f.path)).toEqual(expect.arrayContaining(["hand-worker.js", "vision/hand_landmarker.task", "vision/vision_wasm_internal.wasm"]));
  });
});
