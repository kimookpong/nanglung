import { build } from "esbuild";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const compiled = await build({
  entryPoints: [resolve(root, "src/characters.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { CHARACTERS, MAIN_CAST_IDS, characterSvg, characterScene, sceneSvg, REST_RIG } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
  );
await mkdir(resolve(root, "public/characters"), { recursive: true });
await mkdir(resolve(root, "docs"), { recursive: true });
const embeddedImages=new Map();
async function embedImages(svg) {
  const sources=[...new Set([...svg.matchAll(/href="(\/characters\/artwork\/[^"<>]+\.png)"/g)].map(m=>m[1]))];
  for(const src of sources) {
    if(!embeddedImages.has(src))embeddedImages.set(src,`data:image/png;base64,${(await readFile(resolve(root,"public",src.slice(1)))).toString("base64")}`);
    svg=svg.replaceAll(`href="${src}"`,`href="${embeddedImages.get(src)}"`);
  }
  return svg;
}
for (const character of CHARACTERS) {
  const svg=characterSvg(character);
  await writeFile(
    resolve(root, `public/characters/${character.id}.svg`),
    await embedImages(svg),
  );
}
const mainCast = CHARACTERS.filter(c => MAIN_CAST_IDS.includes(c.id));
const sheetWidth = 1500;
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheetWidth} 720" role="img" aria-labelledby="title desc">
<title id="title">NangLung — ชุดตัวละครหนังตะลุง ${mainCast.length} ตัว</title><desc id="desc">แบบตัวหนังดิจิทัล เท่งดัดแปลงตามภาพผู้ใช้ ไอยุทธ์ แม้ว วิตร และหนูใช้ภาพ PNG ใหม่ของผู้ใช้แยกชิ้นเชิด</desc>
<rect width="${sheetWidth}" height="720" fill="#f7f2e6"/><path d="M40 115H${sheetWidth-40}M40 590H${sheetWidth-40}" stroke="#dcd0b9"/>
<g font-family="Thonburi,Noto Sans Thai,Tahoma,sans-serif"><text x="44" y="55" font-size="27" fill="#3b3329">หนึ่งมือ ห้านิ้ว ต่อหนึ่งตัวละคร</text><text x="44" y="87" font-size="13" fill="#927d5c">NANGLUNG STUDIO · ภาพต้นฉบับจากผู้ใช้ แยกชิ้นสำหรับเชิดดิจิทัล</text>
${mainCast.map((c, i) => `<g transform="translate(${160 + i * 290} ${570 - c.footY})">${sceneSvg(characterScene(c, REST_RIG), "#29251f", `sheet-${c.id}`)}</g><text x="${160 + i * 290}" y="630" text-anchor="middle" font-size="23" fill="#643e29">${c.name}</text><text x="${160 + i * 290}" y="661" text-anchor="middle" font-size="11" fill="#927d5c">${c.subtitle}</text>`).join("")}
<text x="44" y="703" font-size="11" fill="#9c8d74">เท่งตามภาพอ้างอิงผู้ใช้ · ไอยุทธ์ แม้ว วิตร หนู เป็นภาพล้อเลียนร่วมสมัย · ท่าดัดแปลงดิจิทัล · ยังไม่ได้ตรวจทานโดยนายหนัง</text></g></svg>`;
await writeFile(resolve(root, "docs/characters-sheet.svg"), await embedImages(sheet));
console.log(`Exported ${CHARACTERS.length} editable character SVGs and the character sheet.`);
