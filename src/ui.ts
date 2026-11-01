import { ACTIONS, FINGERS, type Settings } from "./core";
import { icon, fingerNames, actionNames } from "./ui-assets";
import { renderWorkspace } from "./studio-layout";
export { icon, fingerNames, actionNames, characterPreview } from "./ui-assets";

export function renderStudio(settings: Settings) {
  return `
${renderWorkspace(settings)}

<dialog id="settings-dialog" class="dialog settings-dialog" aria-labelledby="settings-title">
  <div class="dialog-heading"><h2 id="settings-title">ตั้งค่าสตูดิโอ</h2><button id="close-settings" class="icon-button" aria-label="ปิดการตั้งค่า">${icon("close")}</button></div>
  <div class="settings-tabs" role="tablist" aria-label="หมวดการตั้งค่า">${[
    ["hand", "มือ"],
    ["fingers", "นิ้ว"],
    ["stage", "เวที"],
  ]
    .map(
      ([id, name], i) =>
        `<button role="tab" id="tab-${id}" data-settings-tab="${id}" aria-controls="panel-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${name}</button>`,
    )
    .join("")}</div>
  <div class="settings-body">
    <section id="panel-hand" class="settings-page" role="tabpanel" aria-labelledby="tab-hand"><div class="setting-row"><label for="camera-device">กล้อง</label><select id="camera-device"><option value="">กล้องเริ่มต้น</option></select></div><div class="setting-row"><label for="mirror">ภาพแบบกระจก</label><input id="mirror" type="checkbox" class="switch"/></div><div class="range-setting"><label for="smoothing">ความนุ่มนวล <output id="smoothing-value"></output></label><input id="smoothing" type="range" min="0" max="100"/><div><span>ตอบสนองไว</span><span>ลดการสั่น</span></div></div><div class="range-setting"><label for="motion">ระยะการเคลื่อนที่ <output id="motion-value"></output></label><input id="motion" type="range" min="50" max="150"/></div></section>
    <section id="panel-fingers" class="settings-page finger-settings" role="tabpanel" aria-labelledby="tab-fingers" hidden>${FINGERS.map((_, i) => `<div class="finger-setting"><label for="assign-${i}">${fingerNames[i]}</label><select id="assign-${i}" aria-label="หน้าที่${fingerNames[i]}">${ACTIONS.map((a) => `<option value="${a}">${actionNames[a]}</option>`).join("")}</select><div class="gain-control"><label for="gain-${i}">ความไว <output id="gain-value-${i}">1.0×</output></label><input id="gain-${i}" type="range" min="50" max="180" aria-label="ความไว${fingerNames[i]}"/></div></div>`).join("")}</section>
    <section id="panel-stage" class="settings-page" role="tabpanel" aria-labelledby="tab-stage" hidden><h3>บรรยากาศเวที</h3><div class="theme-options" role="group" aria-label="สีเวที"><button data-theme="amber" class="theme-choice"><span class="theme-swatch amber"></span>แสงตะเกียง</button><button data-theme="ivory" class="theme-choice"><span class="theme-swatch ivory"></span>ผ้าขาว</button><button data-theme="night" class="theme-choice"><span class="theme-swatch night"></span>คืนคราม</button></div><div class="setting-row"><label for="rods">แสดงก้านเชิด</label><input id="rods" type="checkbox" class="switch"/></div><div class="setting-row" id="accessory-control"><label for="accessories" id="accessory-label">แสดงอุปกรณ์</label><input id="accessories" type="checkbox" class="switch"/></div></section>
  </div>
  <footer class="settings-footer"><button id="reset-settings" class="text-button reset-settings">คืนค่าเริ่มต้นทั้งหมด</button><span>บันทึกอัตโนมัติบนเครื่อง</span></footer>
</dialog>

<dialog id="calibration-dialog" class="dialog calibration-dialog" aria-labelledby="calibration-title">
  <div class="dialog-heading"><h2 id="calibration-title">ปรับเทียบมือ</h2><button id="close-calibration" class="icon-button" aria-label="ปิดการปรับเทียบ">${icon("close")}</button></div>
  <div class="step-dots" id="step-dots"></div><div class="calibration-content"><div class="calibration-preview"><canvas id="calibration-video" width="320" height="240"></canvas><canvas id="calibration-overlay" width="320" height="240"></canvas></div><div class="calibration-step"><span id="step-number"></span><h3 id="step-title"></h3><p id="step-copy"></p></div></div>
  <p id="calibration-live" class="calibration-live" role="status"></p><div class="capture-progress"><span id="capture-progress"></span></div><p id="calibration-error" class="inline-error" role="alert"></p><div class="dialog-actions"><button id="restart-calibration" class="text-button">เริ่มใหม่</button><button id="capture" class="primary-button">เก็บค่าท่านี้</button></div>
</dialog>
<dialog id="guide-dialog" class="dialog guide-dialog" aria-labelledby="guide-title"><div class="dialog-heading"><h2 id="guide-title">เริ่มเชิดตัวหนัง</h2><button id="close-guide" class="icon-button" aria-label="ปิดวิธีใช้งาน">${icon("close")}</button></div><ol class="guide-steps"><li><b>จัดตัวหนัง</b><span>รายการมีครบทุกแบบ เลือกฝั่งบนการ์ดเพื่อแสดง หรือคลิกภาพเพื่อเลือกเชิด</span></li><li><b>ลากจัดตำแหน่งและย้ายฝั่ง</b><span>ลากตัวหนังบนเวทีเพื่อจัดตำแหน่ง ข้ามกึ่งกลางเพื่อย้ายฝั่ง ซ้ายใช้มือซ้าย ขวาใช้มือขวา กด Esc เพื่อยกเลิก เช็กทั้งสองมือใต้เวทีเพื่อเชิดพร้อมกัน</span></li><li><b>เปิดกล้องและปรับเทียบ</b><span>หันฝ่ามือเข้ากล้อง แล้วปรับเทียบสี่ท่า หากใช้สองมือให้ปรับเทียบแยกซ้ายและขวา</span></li><li><b>หันซ้าย–ขวาด้วยนิ้วก้อย</b><span>งอก้อยตั้งแต่ 60% ค้างเพื่อหมุนตัว แล้วปล่อยก่อนสั่งซ้ำ</span></li></ol><div class="shortcut-list"><span><kbd>Space</kbd>พัก</span><span><kbd>R</kbd>รีเซ็ต</span><span><kbd>F</kbd>เต็มจอ</span></div></dialog>
<dialog id="character-dialog" class="dialog character-dialog" aria-labelledby="about-character-name"><div class="dialog-heading"><h2 id="about-character-name"></h2><button id="close-character" class="icon-button" aria-label="ปิดข้อมูลตัวละคร">${icon("close")}</button></div><div class="character-detail"><div id="about-character-image" class="character-preview"></div><div><p id="about-character-traits"></p><span>แนวทางการเชิด</span><p id="about-character-gesture"></p></div></div><p class="guide-footnote">งานวาดดิจิทัลจากการศึกษา รูปและท่าดัดแปลง ยังไม่ได้ตรวจทานโดยครูหนัง</p><div class="character-links"><a id="character-source" target="_blank" rel="noopener noreferrer">แหล่งอ้างอิง ม.อ. ↗</a><a id="character-download" download>ดาวน์โหลด SVG ↓</a></div></dialog>`;
}
