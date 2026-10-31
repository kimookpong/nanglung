import {
  mkdir,
  copyFile,
  readdir,
  readFile,
  writeFile,
  rename,
  rm,
} from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

// Keep the model and WASM local so camera use never depends on a third-party CDN.
const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "public/vision");
await mkdir(output, { recursive: true });
const source = resolve(root, "node_modules/@mediapipe/tasks-vision/wasm");
for (const name of await readdir(source)) {
  if (/\.(js|wasm)$/.test(name))
    await copyFile(resolve(source, name), resolve(output, name));
}
const model = resolve(output, "hand_landmarker.task");
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const expectedHash =
  "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
let download = true;
try {
  download = sha256(await readFile(model)) !== expectedHash;
} catch {
  /* first install */
}
if (download) {
  console.log("Downloading the version 1 Hand Landmarker model…");
  const response = await fetch(modelUrl, {
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok)
    throw new Error(`Model download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha256(bytes) !== expectedHash)
    throw new Error("Downloaded model checksum does not match version 1");
  await writeFile(`${model}.tmp`, bytes);
  await rename(`${model}.tmp`, model);
}
// A small manifest documents the upstream model version; no runtime network calls.
await writeFile(
  resolve(output, "model-info.json"),
  JSON.stringify({ source: modelUrl, sha256: expectedHash }, null, 2) + "\n",
);
await rm(`${model}.tmp`, { force: true });
console.log("Local model and WASM assets ready.");
