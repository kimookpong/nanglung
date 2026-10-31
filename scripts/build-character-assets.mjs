import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const compiled = await build({
  entryPoints: [resolve(root, "src/characters.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { CHARACTERS, characterSvg, characterScene, sceneSvg, REST_RIG } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
  );
await mkdir(resolve(root, "public/characters"), { recursive: true });
await mkdir(resolve(root, "docs"), { recursive: true });
for (const character of CHARACTERS) {
  await writeFile(
    resolve(root, `public/characters/${character.id}.svg`),
    characterSvg(character),
  );
}
const sheetWidth = Math.max(1500, CHARACTERS.length * 290 + 50);
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheetWidth} 720" role="img" aria-labelledby="title desc">
<title id="title">NangLung — ชุดตัวละครหนังตะลุง ${CHARACTERS.length} ตัว</title><desc id="desc">แบบเวกเตอร์ดิจิทัล เท่งดัดแปลงตามภาพผู้ใช้ ประยุทธ์และทักษิณเป็นตัวละครล้อเลียน และตัวอื่นจากการศึกษาเอกสาร ยังไม่ได้ตรวจทานโดยครูหนัง</desc>
<rect width="${sheetWidth}" height="720" fill="#f7f2e6"/><path d="M40 115H${sheetWidth-40}M40 590H${sheetWidth-40}" stroke="#dcd0b9"/>
<g font-family="Thonburi,Noto Sans Thai,Tahoma,sans-serif"><text x="44" y="55" font-size="27" fill="#3b3329">หนึ่งมือ ห้านิ้ว ต่อหนึ่งตัวละคร</text><text x="44" y="87" font-size="13" fill="#927d5c">NANGLUNG STUDIO · แบบเวกเตอร์ดิจิทัลจากการศึกษาหนังตะลุง</text>
${CHARACTERS.map((c, i) => `<g transform="translate(${160 + i * 290} ${570 - c.footY})">${sceneSvg(characterScene(c, REST_RIG), "#29251f", `sheet-${c.id}`)}</g><text x="${160 + i * 290}" y="630" text-anchor="middle" font-size="23" fill="#643e29">${c.name}</text><text x="${160 + i * 290}" y="661" text-anchor="middle" font-size="11" fill="#927d5c">${c.subtitle}</text>`).join("")}
<text x="44" y="703" font-size="11" fill="#9c8d74">เท่งตามภาพอ้างอิงผู้ใช้ · ประยุทธ์และทักษิณเป็นภาพล้อเลียน · อีกสี่ตัวจากการศึกษา · ท่าดัดแปลงดิจิทัล · ยังไม่ได้ตรวจทานโดยนายหนัง</text></g></svg>`;
await writeFile(resolve(root, "docs/characters-sheet.svg"), sheet);
console.log(`Exported ${CHARACTERS.length} editable character SVGs and the character sheet.`);
