import { FINGERS, type Settings } from "./core";
import { icon, fingerNames, actionNames } from "./ui-assets";

export function renderWorkspace(settings: Settings) {
  return `<div class="workspace">
  <h1 class="visually-hidden">NangLung — สตูดิโอหนังตะลุงดิจิทัล เชิดตัวหนังด้วยมือผ่านกล้อง</h1>
  <main class="studio-grid">
    <section class="stage-column" aria-label="เวทีและตัวควบคุม">
      <div class="stage-shell" id="stage-shell">
        <canvas id="stage" tabindex="0" aria-label="เวทีหนังตะลุง" aria-description="ลากตัวละครเพื่อจัดตำแหน่งและย้ายฝั่ง ซ้ายใช้มือซ้าย ขวาใช้มือขวา คลิกหรือลูกศรเพื่อเลือกตัว และกด Escape เพื่อยกเลิกการลาก"></canvas>
        <aside id="stage-camera" class="stage-camera" aria-label="ภาพกล้องขณะเชิด" hidden><div class="camera-preview" id="camera-preview"><video id="camera-video" autoplay muted playsinline></video><canvas id="hand-overlay" width="640" height="480"></canvas><div class="camera-empty" id="camera-empty">${icon("camera")}<strong id="camera-empty-title">กล้องยังไม่เปิด</strong><span id="camera-empty-copy">หันฝ่ามือเข้ากล้อง ให้เห็นนิ้วครบ</span></div><span class="camera-label" id="camera-label">กล้อง</span><button id="toggle-overlay" class="overlay-toggle" aria-label="ซ่อนจุดมือ" title="แสดง / ซ่อนจุดมือ" hidden>จุดมือ</button></div></aside>
        <div class="stage-paused" id="stage-paused" hidden><span>${icon("pause")} พักการเชิด</span></div>
        <button class="exit-stage" id="exit-stage">${icon("close")} ออกจากเวที</button>
      </div>
      <div class="stage-toolbar"><div class="stage-controls" role="group" aria-label="เลือกมือและตัวละครที่เชิด">
        <div class="control-checks">${(["Left", "Right"] as const).map((side) => `<div class="hand-control-check" id="control-${side}-label"><input type="checkbox" id="control-${side}"/><button class="hand-focus" data-control-hand="${side}" aria-label="เลือกเชิดด้วยมือ${side === "Left" ? "ซ้าย" : "ขวา"}" aria-pressed="false"><span><small>${side === "Left" ? "ซ้าย" : "ขวา"}</small><strong id="control-${side}-name"></strong></span></button></div>`).join("")}</div>
        <button id="character-about" class="icon-button control-about" aria-label="รู้จักตัวละคร" aria-haspopup="dialog">${icon("help")}</button>
      </div><div class="toolbar-actions"><button id="toggle-fingers" class="text-button" aria-label="แสดงสัญญาณนิ้ว" aria-expanded="false" aria-controls="finger-panel">${icon("hand")}<span>นิ้ว</span></button><span class="toolbar-divider"></span><button id="pause" class="icon-button" aria-label="พักการเชิด" title="พัก / เล่นต่อ (Space)">${icon("pause")}</button><button id="reset-pose" class="icon-button" aria-label="รีเซ็ตท่าทาง" title="รีเซ็ตท่าทาง (R)">${icon("reset")}</button><button id="fullscreen" class="icon-button" aria-label="เต็มจอ" title="เต็มจอ (F)">${icon("expand")}</button></div></div>
      <section class="finger-panel" id="finger-panel" aria-label="สัญญาณนิ้วทั้งห้า" hidden>
        <div class="finger-panel-heading"><strong id="finger-description">สัญญาณนิ้วจากกล้อง</strong></div>
        <div class="finger-grid">${FINGERS.map((_, i) => `<div class="finger-card" data-finger="${i}"><div class="finger-label"><span>${fingerNames[i]}</span><span id="value-${i}">0%</span></div><span class="finger-action" id="action-label-${i}">${actionNames[settings.assignments[i]]}</span><div class="finger-meter"><span id="meter-${i}"></span></div></div>`).join("")}</div>
      </section>
    </section>
    <aside class="control-column" aria-label="แผงควบคุมการเชิด">
      <div class="sidebar-heading"><h2 id="cast-title">ตัวละคร <span id="cast-count">6</span></h2><nav aria-label="เมนูสตูดิโอ"><button id="guide-button" class="icon-button" aria-label="วิธีใช้งาน" title="วิธีเชิด">${icon("help")}</button><button id="settings-button" class="icon-button" aria-label="ตั้งค่าสตูดิโอ" title="ตั้งค่า" aria-haspopup="dialog">${icon("sliders")}</button></nav></div>
      <div class="input-source"><label for="hand-mode">จำนวนมือ</label><select id="hand-mode" aria-label="จำนวนมือที่ควบคุม" title="หนึ่งมือต่อหนึ่งตัวละครที่เลือก"><option value="single">1 มือ</option><option value="dual">2 มือ</option></select></div>
      <section id="control-cast" class="control-view cast-view" aria-labelledby="cast-title"><p class="panel-hint">คลิกเพื่อเชิด · เช็กฝั่งเพื่อแสดง</p><div id="stage-roster" class="stage-roster" aria-label="ตัวละครทั้งหมด"></div></section>
      <div class="camera-actions control-footer"><button id="start-camera" class="primary-button start-button">${icon("play")} เริ่มเชิด</button><button id="calibrate" class="calibrate-button" aria-label="ปรับเทียบมือที่เลือก">${icon("sliders")}<span>ปรับเทียบมือ<small id="calibration-status">ยังไม่ปรับเทียบ</small></span><span class="calibrate-arrow">↗</span></button></div>
    </aside>
  </main>
</div>
<aside class="camera-alert" id="camera-alert" hidden><p id="camera-error" role="alert"></p><button id="dismiss-camera-error" class="icon-button" aria-label="ปิดข้อความกล้อง">${icon("close")}</button></aside>
<div class="toast" id="toast" role="status" hidden></div>
`;
}
