import { build } from "esbuild";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
// MediaPipe's WASM loader uses importScripts, which requires a classic worker.
await build({
  entryPoints: [resolve(root, "src/vision-worker.ts")],
  outfile: resolve(root, "public/hand-worker.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "eof",
});
