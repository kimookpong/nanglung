import { FINGERS, type Settings } from "./core";
import { CHARACTERS } from "./characters";
import { icon, characterPreview, fingerNames, actionNames } from "./ui-assets";

export function renderWorkspace(settings: Settings) {
  return `<div class="workspace" data-mode="demo" data-panel="cast">
  <header class="app-header">
    <div class="brand"><img class="brand-logo" src="${import.meta.env.BASE_URL}branding/nanglung-logo-transparent.png" alt="หนังลุง"/><div class="brand-copy"><strong>สตูดิโอหนังตะลุง</strong><span>เรื่องเล่า เริ่มต้นที่ปลายนิ้ว</span></div></div>
    <nav class="header-actions" aria-label="เมนูสตูดิโอ"><button id="guide-button" class="text-button" aria-label="วิธีใช้งาน" title="วิธีเชิด">${icon("help")}<span>วิธีเชิด</span></button><button id="settings-button" class="text-button" aria-label="ตั้งค่าสตูดิโอ" aria-haspopup="dialog">${icon("sliders")}<span>ตั้งค่า</span></button></nav>
  </header>
  <main class="studio-grid">
    <section class="stage-column" aria-label="เวทีและตัวควบคุม">
      <div class="stage-shell" id="stage-shell">
        <canvas id="stage" tabindex="0" aria-label="เวทีหนังตะลุง" aria-description="คลิกตัวละครเพื่อเลือกควบคุม หรือใช้ปุ่มลูกศรซ้ายขวาเพื่อสลับตัว"></canvas>
        <div class="stage-hint">${icon("pointer")} คลิกตัวหนังเพื่อเลือกเชิด</div>
        <div class="stage-paused" id="stage-paused" hidden><span>${icon("pause")} พักการเชิด</span></div>
        <button class="exit-stage" id="exit-stage">${icon("close")} ออกจากเวที</button>
      </div>
      <div class="stage-toolbar"><div class="stage-controls" role="group" aria-label="เลือกมือและตัวละครที่เชิด">
        <div class="control-checks">${(["Left", "Right"] as const).map((side) => `<label class="hand-control-check" id="control-${side}-label"><input type="checkbox" id="control-${side}"/><span><small>${side === "Left" ? "ซ้าย" : "ขวา"}</small><strong id="control-${side}-name"></strong></span></label>`).join("")}</div>
        <button id="character-about" class="icon-button control-about" aria-label="รู้จักตัวละคร" aria-haspopup="dialog">${icon("help")}</button>
      </div><div class="toolbar-actions"><button id="toggle-fingers" class="text-button" aria-label="แสดงตัวควบคุมนิ้ว" aria-expanded="false" aria-controls="finger-panel">${icon("hand")}<span>นิ้ว</span></button><span class="toolbar-divider"></span><button id="pause" class="icon-button" aria-label="พักการเชิด" title="พัก / เล่นต่อ (Space)">${icon("pause")}</button><button id="reset-pose" class="icon-button" aria-label="รีเซ็ตท่าทาง" title="รีเซ็ตท่าทาง (R)">${icon("reset")}</button><button id="fullscreen" class="icon-button" aria-label="เต็มจอ" title="เต็มจอ (F)">${icon("expand")}</button></div></div>
      <section class="finger-panel" id="finger-panel" aria-label="ควบคุมนิ้วทั้งห้า">
        <div class="finger-panel-heading"><strong id="finger-description">ทดลองด้วยแถบเลื่อน</strong><span class="key-hint">กด <kbd>1</kbd>–<kbd>5</kbd> ค้างเพื่อทดลอง</span></div>
        <div class="finger-grid">${FINGERS.map((finger, i) => `<div class="finger-card" data-finger="${i}"><div class="finger-label"><label for="finger-${finger}">${fingerNames[i]}</label><span id="value-${i}">0%</span></div><span class="finger-action" id="action-label-${i}">${actionNames[settings.assignments[i]]}</span><div class="finger-meter"><span id="meter-${i}"></span></div><input id="finger-${finger}" class="finger-input" type="range" min="0" max="100" value="${i === 1 ? 16 : i === 2 ? 12 : 0}" aria-label="ทดลอง${fingerNames[i]}"/></div>`).join("")}</div>
      </section>
    </section>
    <aside class="control-column" aria-label="แผงควบคุมการเชิด">
      <div class="input-source"><div class="mode-switch" role="group" aria-label="แหล่งควบคุม"><button id="mode-demo" class="active">${icon("play")} ทดลองเชิด</button><button id="mode-live">${icon("camera")} ใช้กล้อง</button></div><select id="hand-mode" aria-label="จำนวนมือที่ควบคุม" title="หนึ่งมือต่อหนึ่งตัวละครที่เลือก"><option value="single">1 มือ</option><option value="dual">2 มือ</option></select></div>
      <div class="quick-controls"><label class="hand-choice" for="hand-side"><span id="hand-choice-label">ควบคุมด้วย</span><select id="hand-side" aria-label="มือที่ใช้เชิดหรือปรับตัวละคร"><option value="Right">มือขวา</option><option value="Left">มือซ้าย</option></select></label><button id="change-character" class="text-button" aria-label="เปลี่ยนแบบตัวละครที่เลือก" aria-haspopup="dialog">${icon("edit")}<span>เปลี่ยนแบบ</span></button></div>
      <div class="control-tabs"><div role="tablist" aria-label="แผงสตูดิโอ"><button id="panel-cast-tab" role="tab" aria-selected="true" aria-controls="control-cast">ตัวละคร <span id="cast-count">2</span></button><button id="panel-camera-tab" role="tab" aria-selected="false" tabindex="-1" aria-controls="control-camera">กล้อง</button></div><div class="cast-launchers"><button id="add-character" class="add-character" aria-label="เพิ่มตัวละครบนเวที" aria-haspopup="dialog">${icon("plus")}<span>เพิ่มตัว</span></button><button id="cast-button" class="icon-button" aria-label="จัดตัวละครบนเวที" title="จัดตำแหน่ง / นำออก" aria-haspopup="dialog">${icon("arrange")}</button></div></div>
      <section id="control-cast" class="control-view cast-view" role="tabpanel" aria-labelledby="panel-cast-tab"><p class="panel-hint">เลือกตัวที่ต้องการเชิดจากเวทีหรือรายการนี้</p><div id="stage-roster" class="stage-roster" aria-label="ตัวละครที่อยู่บนเวที"></div></section>
      <section id="control-camera" class="control-view camera-view" role="tabpanel" aria-labelledby="panel-camera-tab" hidden><div class="camera-preview" id="camera-preview"><video id="camera-video" autoplay muted playsinline></video><canvas id="hand-overlay" width="640" height="480"></canvas><div class="camera-empty" id="camera-empty">${icon("camera")}<strong id="camera-empty-title">กล้องยังไม่เปิด</strong><span id="camera-empty-copy">หันฝ่ามือเข้ากล้อง ให้เห็นนิ้วครบ</span></div><span class="camera-label" id="camera-label">CAMERA OFF</span><button id="toggle-overlay" class="overlay-toggle" aria-label="ซ่อนจุดมือ" title="แสดง / ซ่อนจุดมือ" hidden>จุดมือ</button></div><button id="calibrate" class="calibrate-button" aria-label="ปรับเทียบมือที่เลือก">${icon("sliders")}<span>ปรับเทียบมือ<small id="calibration-status">ยังไม่ปรับเทียบ</small></span><span class="calibrate-arrow">↗</span></button><p class="camera-note">ภาพกล้องประมวลผลบนอุปกรณ์ของคุณ</p></section>
      <div class="camera-actions control-footer"><button id="start-camera" class="primary-button">${icon("camera")} เปิดกล้องเพื่อเชิด</button><button id="autoplay" class="primary-button">${icon("play")} เล่นตัวอย่าง</button><p id="control-footer-note">ลองจังหวะการเชิดก่อนเริ่มแสดงจริง</p></div>
    </aside>
  </main>
</div>
<aside class="camera-alert" id="camera-alert" hidden><p id="camera-error" role="alert"></p><button id="dismiss-camera-error" class="icon-button" aria-label="ปิดข้อความกล้อง">${icon("close")}</button></aside>
<div class="toast" id="toast" role="status" hidden></div>
<dialog id="library-dialog" class="dialog library-dialog" aria-labelledby="library-title"><div class="dialog-heading"><div><span class="eyebrow">CHARACTER LIBRARY</span><h2 id="library-title">เพิ่มตัวละครบนเวที</h2></div><button id="close-library" class="icon-button" aria-label="ปิดคลังตัวละคร">${icon("close")}</button></div><div class="library-intro"><p id="library-copy">เลือกตัวหนังที่อยากให้ร่วมเล่าเรื่อง</p><label id="library-side-row" for="library-side">เพิ่มฝั่ง <select id="library-side" aria-label="ฝั่งของตัวละครใหม่"><option value="Left">ซ้าย</option><option value="Right">ขวา</option></select></label></div><div class="character-grid" role="group" aria-label="เลือกแบบตัวละคร">${CHARACTERS.map((c) => `<button class="character-choice" data-character="${c.id}" title="${c.fullName ?? c.name}" aria-label="เลือก${c.name}" aria-pressed="false">${characterPreview(c.id, `choice-${c.id}`)}<strong>${c.name}</strong><span class="choice-check">${icon("check")}</span></button>`).join("")}</div><p class="library-footnote" id="library-footnote">เพิ่มได้สูงสุด 12 ตัว · เพิ่มแบบเดียวกันหลายตัวได้</p></dialog>`;
}
