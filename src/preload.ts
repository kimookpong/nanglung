import { CHARACTERS, REST_RIG, characterScene, type SceneNode } from "./characters";
import { loadArtwork } from "./renderer";

// Everything a performance needs, fetched before the studio opens: every puppet
// sprite and the logo are decoded, and the hand-tracking worker, model and WASM
// are downloaded into the browser cache so "เริ่มเชิด" starts without a wait.
export const LOGO = "/branding/nanglung-logo.webp";
export const VISION_FILES = [
  { path: "hand-worker.js", bytes: 160_000 },
  { path: "vision/vision_wasm_internal.js", bytes: 205_000 },
  { path: "vision/hand_landmarker.task", bytes: 7_820_000 },
  { path: "vision/vision_wasm_internal.wasm", bytes: 11_454_000 },
];

export function artworkSources(): string[] {
  const sources = new Set<string>();
  const walk = (nodes: SceneNode[]) => {
    for (const node of nodes) {
      if (node.graphic?.image) sources.add(node.graphic.image.src);
      walk(node.children ?? []);
    }
  };
  for (const character of CHARACTERS) walk(characterScene(character, REST_RIG));
  return [...sources, LOGO];
}

export interface PreloadProgress { fraction: number; label: string; failed: number }

/** Byte-weighted progress: images count as ~60 KB each, files by their size. */
export async function preloadStudio(onProgress: (progress: PreloadProgress) => void) {
  const base = import.meta.env.BASE_URL;
  const images = artworkSources(), imageWeight = 60_000;
  const total = images.length * imageWeight + VISION_FILES.reduce((sum, f) => sum + f.bytes, 0);
  let loaded = 0, failed = 0, label = "กำลังเตรียมตัวหนัง";
  const report = () => onProgress({ fraction: Math.min(1, loaded / total), label, failed });
  report();

  const artwork = Promise.all(images.map((src) => loadArtwork(src).then(() => { loaded += imageWeight; report(); })));
  const fonts = document.fonts?.ready.catch(() => undefined);
  await artwork;
  await fonts;

  label = "กำลังเตรียมระบบจับมือ";
  report();
  await Promise.all(VISION_FILES.map(async (file) => {
    let counted = 0;
    try {
      const response = await fetch(`${base}${file.path}`);
      if (!response.ok || !response.body) throw new Error(String(response.status));
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const step = Math.min(value.byteLength, file.bytes - counted);
        counted += step; loaded += step; report();
      }
    } catch {
      // A missing model only matters once the camera starts; it reports there.
      failed++;
    }
    loaded += file.bytes - counted; report();
  }));
  label = "พร้อมแสดง";
  report();
}
