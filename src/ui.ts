import { ACTIONS, FINGERS, type Action, type Settings } from "./core";
import { CHARACTERS } from "./characters";

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

export function renderStudio(settings: Settings) {
  return `
<div class="workspace" data-mode="demo">
  <header class="app-header">
    <div class="wordmark">NangLung <span>STUDIO</span></div>
    <span id="stage-state" class="state-badge" role="status">โหมดทดลอง</span>
    <nav class="header-actions" aria-label="เมนูสตูดิโอ">
      <button id="settings-button" class="text-button" aria-label="ตั้งค่าสตูดิโอ" aria-haspopup="dialog">${icon("sliders")}<span>ตั้งค่า</span></button>
      <button id="guide-button" class="icon-button" aria-label="วิธีใช้งาน" title="วิธีใช้งาน">${icon("help")}</button>
    </nav>
  </header>
  <main class="studio-grid">
    <section class="stage-column" aria-label="เวทีและตัวควบคุม">
      <div class="stage-shell" id="stage-shell">
        <canvas id="stage" aria-label="เวทีหนังตะลุง"></canvas>
        <div class="stage-paused" id="stage-paused" hidden><span>${icon("pause")} พักการเชิด</span></div>
        <button class="exit-stage" id="exit-stage">${icon("close")} ออกจากเวที</button>
      </div>
      <div class="stage-toolbar">
        <button id="character-about" class="character-info" aria-label="รู้จักตัวละคร" aria-haspopup="dialog"><strong id="character-name">เท่ง</strong>${icon("help")}</button>
        <div class="toolbar-actions"><button id="pause" class="icon-button" aria-label="พักการเชิด" title="พัก / เล่นต่อ (Space)">${icon("pause")}</button><button id="reset-pose" class="icon-button" aria-label="รีเซ็ตท่าทาง" title="รีเซ็ตท่าทาง (R)">${icon("reset")}</button><button id="fullscreen" class="text-button" aria-label="เต็มจอ">${icon("expand")}<span>เต็มจอ</span></button></div>
      </div>
      <section class="finger-panel" aria-label="ควบคุมนิ้วทั้งห้า">
        <div class="finger-panel-heading"><span id="finger-description">ทดลองด้วยแถบเลื่อน</span><span class="key-hint">กด 1–5 ค้างเพื่อทดลอง</span></div>
        <div class="finger-grid">${FINGERS.map((finger, i) => `<div class="finger-card" data-finger="${i}"><div class="finger-label"><label for="finger-${finger}">${fingerNames[i]}</label><span id="value-${i}">0%</span></div><span class="finger-action" id="action-label-${i}">${actionNames[settings.assignments[i]]}</span><div class="finger-meter"><span id="meter-${i}"></span></div><input id="finger-${finger}" class="finger-input" type="range" min="0" max="100" value="${i === 1 ? 16 : i === 2 ? 12 : 0}" aria-label="ทดลอง${fingerNames[i]}"/></div>`).join("")}</div>
      </section>
    </section>
    <aside class="control-column" aria-label="แผงควบคุมการเชิด">
      <div class="input-source"><div class="mode-switch" role="group" aria-label="แหล่งควบคุม"><button id="mode-demo" class="active">${icon("play")} ทดลอง</button><button id="mode-live">${icon("camera")} ใช้กล้อง</button></div><select id="hand-mode" aria-label="จำนวนมือและตัวละคร" title="หนึ่งมือต่อหนึ่งตัวละคร"><option value="single">1 มือ</option><option value="dual">2 มือ</option></select></div>
      <section class="character-panel" aria-label="เลือกตัวหนัง"><div class="character-grid" role="group" aria-label="เลือกตัวละคร">${CHARACTERS.map((c) => `<button class="character-choice" data-character="${c.id}" title="${c.fullName ?? c.name}" aria-label="เลือก${c.name}" aria-pressed="false"><img src="${import.meta.env.BASE_URL}characters/${c.id}.svg" alt="" width="60" height="76"/><strong>${c.name}</strong></button>`).join("")}</div></section>
      <div class="camera-preview" id="camera-preview">
        <video id="camera-video" autoplay muted playsinline></video><canvas id="hand-overlay" width="640" height="480"></canvas>
        <div class="camera-empty" id="camera-empty">${icon("camera")}<strong id="camera-empty-title">กล้องยังไม่เปิด</strong><span id="camera-empty-copy">หันฝ่ามือเข้ากล้อง ให้เห็นนิ้วครบ</span></div>
        <span class="camera-label" id="camera-label">CAMERA OFF</span><button id="toggle-overlay" class="overlay-toggle" aria-label="ซ่อนจุดมือ" title="แสดง / ซ่อนจุดมือ" hidden>จุดมือ</button>
      </div>
      <div class="camera-actions"><button id="start-camera" class="primary-button">${icon("camera")} เปิดกล้องเพื่อเชิด</button><button id="autoplay" class="secondary-button">${icon("play")} เล่นตัวอย่าง</button></div>
      <div class="quick-controls"><label class="hand-choice" for="hand-side"><span id="hand-choice-label">มือที่ใช้</span><select id="hand-side" aria-label="มือที่ใช้เชิดหรือปรับตัวละคร"><option value="Right">มือขวา</option><option value="Left">มือซ้าย</option></select></label><button id="calibrate" class="calibrate-button" aria-label="ปรับเทียบมือที่เลือก">${icon("sliders")}<span>ปรับเทียบมือ<small id="calibration-status">ยังไม่ปรับเทียบ</small></span></button></div>
    </aside>
  </main>
</div>
<aside class="camera-alert" id="camera-alert" hidden><p id="camera-error" role="alert"></p><button id="dismiss-camera-error" class="icon-button" aria-label="ปิดข้อความกล้อง">${icon("close")}</button></aside>
<div class="toast" id="toast" role="status" hidden></div>

<dialog id="settings-dialog" class="dialog settings-dialog" aria-labelledby="settings-title">
  <div class="dialog-heading"><h2 id="settings-title">ตั้งค่าสตูดิโอ</h2><button id="close-settings" class="icon-button" aria-label="ปิดการตั้งค่า">${icon("close")}</button></div>
  <div class="settings-tabs" role="tablist" aria-label="หมวดการตั้งค่า">${[
    ["hand", "มือ"],
    ["fingers", "นิ้ว"],
    ["stage", "เวที"],
    ["demo", "ทดลอง"],
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
    <section id="panel-demo" class="settings-page" role="tabpanel" aria-labelledby="tab-demo" hidden><h3>ตำแหน่งในโหมดทดลอง</h3><p class="setting-note">ใช้แถบเหล่านี้เมื่อเลือกโหมดทดลอง</p><div id="demo-motion" class="demo-motion"><label for="demo-x">ซ้าย–ขวา<input id="demo-x" type="range" min="0" max="100" value="50" aria-label="ตำแหน่งแนวนอน"/></label><label for="demo-y">ขึ้น–ลง<input id="demo-y" type="range" min="0" max="100" value="50" aria-label="ตำแหน่งแนวตั้ง"/></label><label for="demo-tilt">เอียงลำตัว<input id="demo-tilt" type="range" min="-35" max="35" value="0" aria-label="มุมเอียงลำตัว"/></label></div></section>
  </div>
  <footer class="settings-footer"><button id="reset-settings" class="text-button reset-settings">คืนค่าเริ่มต้นทั้งหมด</button><span>บันทึกอัตโนมัติบนเครื่อง</span></footer>
</dialog>

<dialog id="calibration-dialog" class="dialog calibration-dialog" aria-labelledby="calibration-title">
  <div class="dialog-heading"><h2 id="calibration-title">ปรับเทียบมือ</h2><button id="close-calibration" class="icon-button" aria-label="ปิดการปรับเทียบ">${icon("close")}</button></div>
  <div class="step-dots" id="step-dots"></div><div class="calibration-content"><div class="calibration-preview"><canvas id="calibration-video" width="320" height="240"></canvas><canvas id="calibration-overlay" width="320" height="240"></canvas></div><div class="calibration-step"><span id="step-number"></span><h3 id="step-title"></h3><p id="step-copy"></p></div></div>
  <p id="calibration-live" class="calibration-live" role="status"></p><div class="capture-progress"><span id="capture-progress"></span></div><p id="calibration-error" class="inline-error" role="alert"></p><div class="dialog-actions"><button id="restart-calibration" class="text-button">เริ่มใหม่</button><button id="capture" class="primary-button">เก็บค่าท่านี้</button></div>
</dialog>
<dialog id="guide-dialog" class="dialog guide-dialog" aria-labelledby="guide-title"><div class="dialog-heading"><h2 id="guide-title">เริ่มเชิดตัวหนัง</h2><button id="close-guide" class="icon-button" aria-label="ปิดวิธีใช้งาน">${icon("close")}</button></div><ol class="guide-steps"><li><b>เลือกหนึ่งหรือสองมือ</b><span>เลือก “2 มือ” เพื่อเชิดสองตัว เลือกซ้าย/ขวาแล้วเปลี่ยนตัวละคร</span></li><li><b>เปิดกล้อง</b><span>เลือกมือที่ใช้และหันฝ่ามือเข้ากล้อง</span></li><li><b>ปรับเทียบมือ</b><span>เก็บสี่ท่า โหมดสองมือให้ปรับเทียบแยกซ้าย/ขวา</span></li><li><b>หันตัว</b><span>งอก้อยค้าง แล้วปล่อยก่อนสั่งซ้ำ</span></li></ol><div class="shortcut-list"><span><kbd>Space</kbd>พัก</span><span><kbd>R</kbd>รีเซ็ต</span><span><kbd>F</kbd>เต็มจอ</span></div></dialog>
<dialog id="character-dialog" class="dialog character-dialog" aria-labelledby="about-character-name"><div class="dialog-heading"><h2 id="about-character-name"></h2><button id="close-character" class="icon-button" aria-label="ปิดข้อมูลตัวละคร">${icon("close")}</button></div><div class="character-detail"><img id="about-character-image" alt="" width="170" height="230"/><div><p id="about-character-traits"></p><span>ท่าทดลอง</span><p id="about-character-gesture"></p></div></div><p class="guide-footnote">งานวาดดิจิทัลจากการศึกษา รูปและท่าดัดแปลง ยังไม่ได้ตรวจทานโดยครูหนัง</p><div class="character-links"><a id="character-source" target="_blank" rel="noopener noreferrer">แหล่งอ้างอิง ม.อ. ↗</a><a id="character-download" download>ดาวน์โหลด SVG ↓</a></div></dialog>`;
}
