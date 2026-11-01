import "./style.css";
import "./studio-layout.css";
import { cameraPreviewBox } from "./camera-preview";
import {
  FINGERS,
  averageSignals,
  buildProfile,
  defaultSettings,
  parseSettings,
  type Action,
  type Settings,
  type HandSide,
  type Signal,
  restPose,
} from "./core";
import { CameraTracker } from "./camera";
import { StageRenderer, drawLandmarks, drawHands } from "./renderer";
import { getCharacter, isCharacterId } from "./characters";
import {
  catalogEntries,
  showCatalogCharacter,
  hideCatalogMember,
} from "./catalog";
import { renderCatalog } from "./catalog-ui";
import { checkHandControl } from "./control-selection";
import { HandEnsemble, activeHands, HAND_SIDES } from "./ensemble";
import {
  initialCast,
  hasRetiredCastMembers,
  memberForHand,
  moveMember,
  positionMember,
  parseCast,
  placement,
  selectMember,
  MAX_CAST,
  type CastState,
  type CastMember,
} from "./cast";
import { stageAnchor, stagePoint } from "./stage-geometry";

import {
  icon,
  renderStudio,
  fingerNames,
  actionNames,
  characterPreview,
} from "./ui";

let settings: Settings;
let storageUnavailable = false;
try {
  settings = parseSettings(
    JSON.parse(localStorage.getItem("nanglung.settings.v1") ?? "null"),
  );
} catch {
  settings = defaultSettings();
  storageUnavailable = true;
}

let cast: CastState;
let migrateSavedCast = false;
try {
  const storedCast = JSON.parse(localStorage.getItem("nanglung.cast.v1") ?? "null");
  migrateSavedCast = hasRetiredCastMembers(storedCast);
  cast = parseCast(storedCast, settings);
  if(storedCast?.version===1&&JSON.stringify(storedCast.controls)!==JSON.stringify(cast.controls)) {
    migrateSavedCast=true;
    const focused=cast.members.find(member=>member.id===storedCast.controls?.[settings.hand]);
    if(focused)settings.hand=focused.side;
  }
} catch {
  cast = initialCast(settings);
}
for (const side of HAND_SIDES) {
  const member = memberForHand(cast, side);
  if (member) settings.characters[side] = member.character;
}
settings.character = settings.characters[settings.hand];
document.querySelector<HTMLDivElement>("#app")!.innerHTML =
  renderStudio(settings);

function el<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id)! as T;
}
const ensemble = new HandEnsemble();
ensemble.reset(settings);
let active = ensemble.sessions[settings.hand];
const renderer = new StageRenderer(el<HTMLCanvasElement>("stage"));
const video = el<HTMLVideoElement>("camera-video");
const overlay = el<HTMLCanvasElement>("hand-overlay");
const tracker = new CameraTracker(video);
const calibrationDialog = el<HTMLDialogElement>("calibration-dialog");
const guideDialog = el<HTMLDialogElement>("guide-dialog");
const characterDialog = el<HTMLDialogElement>("character-dialog");
const settingsDialog = el<HTMLDialogElement>("settings-dialog");
let savedCast = JSON.stringify(cast);
let castDirty = false;
el("settings-button").addEventListener("click", () =>
  settingsDialog.showModal(),
);
el("close-settings").addEventListener("click", () => settingsDialog.close());
el("dismiss-camera-error").addEventListener("click", () => {
  el("camera-alert").hidden = true;
});
function selectSettingsTab(id: string, focus = false) {
  settingsDialog
    .querySelectorAll<HTMLButtonElement>("[data-settings-tab]")
    .forEach((button) => {
      const active = button.dataset.settingsTab === id;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      el(`panel-${button.dataset.settingsTab}`).hidden = !active;
      if (active && focus) button.focus();
    });
}
const settingTabs = [
  ...settingsDialog.querySelectorAll<HTMLButtonElement>("[data-settings-tab]"),
];
settingTabs.forEach((button, index) => {
  button.addEventListener("click", () =>
    selectSettingsTab(button.dataset.settingsTab!),
  );
  button.addEventListener("keydown", (event) => {
    const delta =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? settingTabs.length - 1
          : (index + delta + settingTabs.length) % settingTabs.length;
    selectSettingsTab(settingTabs[next].dataset.settingsTab!, true);
  });
});
let cameraOn = false;
let cameraLoading = false;
let cameraToken = 0;
let paused = false;
let stageDrag: {
  pointerId: number; id: string; active: boolean;
  clientX: number; clientY: number; start: {x:number;y:number};
  anchor: {x:number;baseline:number}; original: CastMember;
  controls: CastState["controls"]; hand: HandSide; characters: Settings["characters"];
} | null = null;
let overlayVisible = true;
let toastTimer: ReturnType<typeof setTimeout>;

function notify(message: string) {
  const toast = el("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}
function save() {
  try {
    localStorage.setItem("nanglung.settings.v1", JSON.stringify(settings));
    localStorage.setItem("nanglung.cast.v1", JSON.stringify(cast));
    savedCast = JSON.stringify(cast);
    castDirty = false;
  } catch {
    if (!storageUnavailable)
      notify("บันทึกค่าในเบราว์เซอร์ไม่ได้ ค่าจะใช้ได้เฉพาะรอบนี้");
    storageUnavailable = true;
  }
}
function updateLabels() {
  active = ensemble.sessions[settings.hand];

  settings.character = settings.characters[settings.hand];
  updateCharacter();
  updateHandChecks();
  el<HTMLSelectElement>("hand-mode").value = settings.handMode;
  el("calibration-title").textContent =
    `ปรับเทียบมือ${settings.hand === "Left" ? "ซ้าย" : "ขวา"}`;
  el("finger-description").textContent =
    `สัญญาณมือ${settings.hand === "Left" ? "ซ้าย" : "ขวา"}`;
  settings.assignments.forEach((action, i) => {
    el(`action-label-${i}`).textContent = actionNames[action];
    el<HTMLSelectElement>(`assign-${i}`).value = action;
    el<HTMLInputElement>(`gain-${i}`).value = String(
      Math.round(settings.gain[i] * 100),
    );
    el(`gain-value-${i}`).textContent = `${settings.gain[i].toFixed(1)}×`;
  });
  el<HTMLInputElement>("mirror").checked = settings.mirror;
  video.style.transform = settings.mirror ? "scaleX(-1)" : "";
  el<HTMLInputElement>("smoothing").value = String(settings.smoothing * 100);
  el("smoothing-value").textContent =
    `${Math.round(settings.smoothing * 100)}%`;
  el<HTMLInputElement>("motion").value = String(settings.motion * 100);
  el("motion-value").textContent = `${settings.motion.toFixed(1)}×`;
  el<HTMLInputElement>("rods").checked = settings.rods;
  el("calibration-status").textContent = `มือ${settings.hand === "Left" ? "ซ้าย" : "ขวา"} · ${settings.profiles[settings.hand].calibrated ? "ปรับเทียบแล้ว" : "ยังไม่ปรับเทียบ"}`;
  document.querySelectorAll<HTMLButtonElement>("[data-theme]").forEach((b) => {
    b.classList.toggle("active", b.dataset.theme === settings.theme);
    b.setAttribute("aria-pressed", String(b.dataset.theme === settings.theme));
  });
  renderDock();
}
function updateCharacter() {
  const character = getCharacter(settings.character);
  const hasActor = !!memberForHand(cast, settings.hand);
  el<HTMLButtonElement>("character-about").disabled = !hasActor;
  el("character-about").title = hasActor
    ? (character.fullName ?? character.name)
    : "เลือกตัวบนเวที";
  el("accessory-control").hidden = !character.accessory;
  el("accessory-label").textContent =
    `แสดง${character.accessory?.name ?? "อุปกรณ์"}`;
  el<HTMLInputElement>("accessories").checked = settings.accessories;
  el<HTMLCanvasElement>("stage").setAttribute(
    "aria-label",
    hasActor
      ? `เวทีหนังตะลุง — ${character.name} ขยับตามมือจากกล้อง`
      : "เวทีหนังตะลุง — เลือกตัวละครเพื่อเชิดด้วยมือที่เลือก",
  );
  el("about-character-name").textContent = character.fullName ?? character.name;
  el("about-character-traits").textContent = character.traits;
  el("about-character-gesture").textContent = character.gesture;
  el("about-character-image").innerHTML = characterPreview(
    character.id,
    `about-${character.id}`,
  );
  el<HTMLAnchorElement>("character-source").href = character.source;
  el("character-source").textContent =
    character.sourceLabel ?? "แหล่งอ้างอิง ม.อ. ↗";
  const download = el<HTMLAnchorElement>("character-download");
  download.href = `${import.meta.env.BASE_URL}characters/${character.id}.svg${character.body.image ? "?art=user-png-20261031" : ""}`;
  download.download = `nanglung-${character.id}.svg`;
}
function renderDock() {
  const entries = catalogEntries(cast),
    roster = el("stage-roster");
  const columns = 2;
  const compactColumns = entries.length > 6 ? 4 : 3;
  roster.dataset.count = String(entries.length);
  roster.dataset.dense = String(entries.length > 4);
  roster.dataset.many = String(entries.length > 6);
  roster.dataset.crowded = String(entries.length > 12);
  roster.style.setProperty("--roster-columns", String(columns));
  roster.style.setProperty("--roster-short-columns", String(entries.length>6?3:2));
  roster.style.setProperty("--roster-short-rows", String(Math.ceil(entries.length/(entries.length>6?3:2))));
  roster.style.setProperty(
    "--roster-rows",
    String(Math.ceil(entries.length / columns)),
  );
  roster.style.setProperty("--roster-compact-columns", String(compactColumns));
  roster.style.setProperty(
    "--roster-compact-rows",
    String(Math.ceil(entries.length / compactColumns)),
  );
  roster.innerHTML = renderCatalog(entries, cast, settings);
  el("cast-count").textContent = String(entries.length);
  el("cast-count").title = "บนเวที " + cast.members.length + " ตัว";
}
function ensureCatalogActor(
  character: Settings["character"],
  side: HandSide,
  id?: string,
) {
  const member =
    cast.members.find((member) => member.id === id) ??
    showCatalogCharacter(cast, character, side, crypto.randomUUID());
  if (!member) {
    notify("เวทีแสดงได้สูงสุด " + MAX_CAST + " ตัว เลือกซ่อนตัวอื่นก่อน");
    return null;
  }
  const wasFocused=cast.controls[settings.hand]===member.id;
  const before={...cast.controls};
  moveMember(cast, member.id, side);
  if(wasFocused)settings.hand=side;
  for (const hand of HAND_SIDES)
    if (cast.controls[hand] !== before[hand] || cast.controls[hand] === member.id) bindCastHand(hand);
  return member;
}
function refreshCast() {
  syncCastSettings();
  save();
  updateLabels();
  drawTrackingOverlay();
}
el("stage-roster").addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-dock-character]",
  );
  if (!button) return;
  const character = button.dataset.dockCharacter;
  if (!isCharacterId(character)) return;
  let member = cast.members.find(
    (member) => member.id === button.dataset.dockMember,
  );
  if (!member)
    member =
      ensureCatalogActor(
        character,
        memberForHand(cast, settings.hand)?.side ?? settings.hand,
      ) ?? undefined;
  if (!member) return;
  selectActor(member.id);
  el("stage").focus({ preventScroll: true });
});
el("stage-roster").addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement,
    character = input.dataset.catalogCharacter,
    side = input.value;
  if (!isCharacterId(character) || (side !== "Left" && side !== "Right"))
    return;
  const member = cast.members.find(
    (member) => member.id === input.dataset.placementMember,
  );
  if (input.checked) {
    const shown = ensureCatalogActor(character, side, member?.id);
    if (!shown) {
      input.checked = false;
      return;
    }
    if (!cast.controls.Left && !cast.controls.Right) {
      settings.hand=selectMember(cast, shown.id, settings.hand);
      bindCastHand(settings.hand);
    }
  } else if (member && member.side === side) {
    hideCatalogMember(cast, member.id);
    for (const hand of HAND_SIDES) bindCastHand(hand);
  }
  refreshCast();
  el("stage-roster")
    .querySelector<HTMLInputElement>(
      '[data-catalog-character="' + character + '"][value="' + side + '"]',
    )
    ?.focus({ preventScroll: true });
});
function showFingerControls(show: boolean) {
  el("finger-panel").hidden = !show;
  const button = el<HTMLButtonElement>("toggle-fingers");
  button.classList.toggle("active", show);
  button.setAttribute("aria-expanded", String(show));
  button.setAttribute("aria-label", `${show ? "ซ่อน" : "แสดง"}สัญญาณนิ้ว`);
}
showFingerControls(false);
el("toggle-fingers").addEventListener("click", () => {
  showFingerControls(el("finger-panel").hidden);
});

function bindCastHand(side: HandSide) {
  const member = memberForHand(cast, side);
  if (member) {
    settings.characters[side] = member.character;
    ensemble.sessions[side].controller.adoptPose(
      member.pose,
      performance.now(),
    );
    ensemble.sessions[side].controller.setPaused(paused);
  }
}
function syncCastSettings() {
  for (const side of HAND_SIDES) {
    const member = memberForHand(cast, side);
    if (member) settings.characters[side] = member.character;
  }
  settings.character = settings.characters[settings.hand];
}
function selectActor(id: string) {
  const before={...cast.controls};
  const side = selectMember(cast,id,settings.hand);
  settings.hand = side;
  if(before[side]!==id)bindCastHand(side);
  syncCastSettings();
  save();
  updateLabels();

  drawTrackingOverlay();
}
const stageCanvas=el<HTMLCanvasElement>("stage");
function positionStageCamera() {
  const rect=stageCanvas.getBoundingClientRect(),box=cameraPreviewBox(rect.width,rect.height),preview=el("stage-camera");
  preview.style.width=`${box.width}px`;preview.style.height=`${box.height}px`;
  preview.style.right=`${box.right}px`;preview.style.bottom=`${box.bottom}px`;
}
new ResizeObserver(positionStageCamera).observe(stageCanvas);
stageCanvas.addEventListener("pointerdown", event=>{
  if(event.button!==0||!event.isPrimary||stageDrag)return;
  const start=stagePoint(event.clientX,event.clientY,stageCanvas.getBoundingClientRect());
  const id=renderer.hitTest(event.clientX,event.clientY),member=cast.members.find(member=>member.id===id);
  if(!start||!member)return;
  stageDrag={pointerId:event.pointerId,id:member.id,active:false,clientX:event.clientX,clientY:event.clientY,start,
    anchor:stageAnchor(member.pose,placement(cast,member)),original:structuredClone(member),controls:{...cast.controls},hand:settings.hand,characters:{...settings.characters}};
  selectActor(member.id);stageCanvas.focus({preventScroll:true});event.preventDefault();
  stageCanvas.setPointerCapture(event.pointerId);
});
stageCanvas.addEventListener("pointermove",event=>{
  const drag=stageDrag;
  if(!drag||drag.pointerId!==event.pointerId)return;
  if(!drag.active&&Math.hypot(event.clientX-drag.clientX,event.clientY-drag.clientY)<5)return;
  const point=stagePoint(event.clientX,event.clientY,stageCanvas.getBoundingClientRect());
  if(!point)return;
  drag.active=true;stageCanvas.classList.add("dragging");event.preventDefault();
  const previousSide=cast.members.find(member=>member.id===drag.id)!.side;
  const side=positionMember(cast,drag.id,drag.anchor.x+point.x-drag.start.x,drag.anchor.baseline+point.y-drag.start.y)!;
  if(side!==previousSide) {
    settings.hand=side;syncCastSettings();
    for(const hand of HAND_SIDES)bindCastHand(hand);
    updateLabels();drawTrackingOverlay();
  }
});
function finishStageDrag(cancel=false) {
  const drag=stageDrag;if(!drag)return;
  stageDrag=null;stageCanvas.classList.remove("dragging");
  if(cancel&&drag.active) {
    const member=cast.members.find(member=>member.id===drag.id);
    if(member){delete member.position;Object.assign(member,drag.original);}
    cast.controls=drag.controls;settings.hand=drag.hand;settings.characters=drag.characters;
  }
  if(drag.active) {
    for(const hand of HAND_SIDES)bindCastHand(hand);
    refreshCast();
  }
  if(stageCanvas.hasPointerCapture(drag.pointerId))stageCanvas.releasePointerCapture(drag.pointerId);
}
stageCanvas.addEventListener("pointerup",event=>{if(stageDrag?.pointerId===event.pointerId)finishStageDrag();});
stageCanvas.addEventListener("pointercancel",event=>{if(stageDrag?.pointerId===event.pointerId)finishStageDrag(true);});
stageCanvas.addEventListener("lostpointercapture",()=>finishStageDrag(true));
window.addEventListener("blur",()=>finishStageDrag(true));
el("stage").addEventListener("keydown", (event) => {
  if(event.key==="Escape"&&stageDrag){event.preventDefault();finishStageDrag(true);return;}
  if(stageDrag){event.preventDefault();return;}
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  if (!cast.members.length) return;
  const index = cast.members.findIndex(
    (m) => m.id === cast.controls[settings.hand],
  );
  selectActor(
    cast.members[
      (index + (event.key === "ArrowLeft" ? -1 : 1) + cast.members.length) %
        cast.members.length
    ].id,
  );
});
el("character-about").addEventListener("click", () =>
  characterDialog.showModal(),
);
el("close-character").addEventListener("click", () => characterDialog.close());
el("accessories").addEventListener("change", () => {
  settings.accessories = el<HTMLInputElement>("accessories").checked;
  save();
});
function updateCameraUI() {
  el("stage-camera").hidden = !cameraOn && !cameraLoading;
  positionStageCamera();
  el("camera-empty").hidden = cameraOn;
  video.hidden = !cameraOn;
  el("toggle-overlay").hidden = !cameraOn;
  el("camera-label").textContent = cameraLoading
    ? "กำลังเปิดกล้อง"
    : cameraOn
      ? "กล้อง"
      : "กล้องปิด";
  const start = el<HTMLButtonElement>("start-camera");
  start.disabled = cameraLoading;
  // Starting a performance is the main action; the camera is how it happens.
  start.classList.toggle("is-live", cameraOn);
  start.innerHTML = cameraLoading
    ? '<span class="spinner"></span> กำลังเปิดกล้อง…'
    : cameraOn
      ? `${icon("pause")} หยุดเชิด`
      : `${icon("play")} เริ่มเชิด`;
  el("camera-empty-title").textContent = cameraLoading
    ? "กำลังเตรียมกล้อง"
    : "กล้องยังไม่เปิด";
  el("camera-empty-copy").textContent = cameraLoading
    ? "ครั้งแรกอาจใช้เวลาสักครู่"
    : "หันฝ่ามือเข้ากล้อง ให้เห็นนิ้วครบ";
  el<HTMLButtonElement>("calibrate").disabled = !cameraOn || cameraLoading;
  el("control-footer-note").textContent = cameraOn
    ? "ประมวลผลภาพบนเครื่อง"
    : "กดเริ่มเชิด ระบบจะเปิดกล้องให้";
}
function setPause(value: boolean) {
  paused = value;
  ensemble.setPaused(value);
  el("stage-paused").hidden = !value;
  el("pause").innerHTML = icon(value ? "play" : "pause");
  el("pause").setAttribute("aria-label", value ? "เชิดต่อ" : "พักการเชิด");
  updateHandChecks();
}
function updateHandChecks() {
  for (const side of HAND_SIDES) {
    const member = memberForHand(cast, side);
    const name = member ? getCharacter(member.character).name : "เลือกตัว";
    const input = el<HTMLInputElement>(`control-${side}`);
    input.checked = !paused && activeHands(settings).includes(side) && !!member;
    input.setAttribute(
      "aria-label",
      `เชิดมือ${side === "Left" ? "ซ้าย" : "ขวา"} · ${name}`,
    );
    el(`control-${side}-name`).textContent = name;
    document
      .querySelector<HTMLButtonElement>(`[data-control-hand="${side}"]`)!
      .setAttribute("aria-pressed", String(settings.hand === side));
    el(`control-${side}-label`).classList.toggle(
      "focused",
      settings.hand === side,
    );
  }
}
for (const side of HAND_SIDES) {
  document
    .querySelector<HTMLButtonElement>(`[data-control-hand="${side}"]`)!
    .addEventListener("click", () => {
      settings.hand = side;
      if (settings.handMode === "single") bindCastHand(side);
      save();
      updateLabels();
      drawTrackingOverlay();
    });
  el(`control-${side}`).addEventListener("change", () => {
    const result = checkHandControl(
      cast,
      settings,
      side,
      el<HTMLInputElement>(`control-${side}`).checked,
      paused,
    );
    if (!result.accepted) {
      updateHandChecks();
      notify(`ยังไม่มีตัวละครฝั่ง${side === "Left" ? "ซ้าย" : "ขวา"} เลือกฝั่งบนการ์ดหรือลากมาฝั่งนี้ก่อน`);
      return;
    }

    ensemble.clear();
    syncCastSettings();
    for (const hand of HAND_SIDES) bindCastHand(hand);
    setPause(result.paused);
    save();
    updateLabels();

    updateCameraUI();
    drawTrackingOverlay();
  });
}
function resetPose() {
  paused = false;
  ensemble.reset(settings);
  for (const member of cast.members)
    member.pose = { ...restPose(), facing: member.side === "Left" ? 1 : -1 };
  for (const side of HAND_SIDES) bindCastHand(side);

  setPause(false);

  save();
}
function drawTrackingOverlay() {
  drawHands(
    overlay,
    overlayVisible
      ? activeHands(settings).flatMap((side) => {
          const points = ensemble.sessions[side].points;
          return points ? [{ side, points }] : [];
        })
      : [],
    settings.mirror,
  );
}
function stopCamera() {
  cameraToken++;
  tracker.stop();
  cameraOn = false;
  cameraLoading = false;
  ensemble.clear();
  drawTrackingOverlay();
  updateCameraUI();
}
async function enumerateCameras() {
  try {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
      (d) => d.kind === "videoinput",
    );
    const select = el<HTMLSelectElement>("camera-device");
    const chosen = select.value;
    select.replaceChildren(
      new Option("กล้องเริ่มต้น", ""),
      ...devices.map(
        (d, i) => new Option(d.label || `กล้อง ${i + 1}`, d.deviceId),
      ),
    );
    if (devices.some((d) => d.deviceId === chosen)) select.value = chosen;
  } catch {
    /* The default camera remains available. */
  }
}
async function startCamera() {
  if (cameraLoading) return;
  const token = ++cameraToken;
  cameraLoading = true;
  el("camera-alert").hidden = true;
  updateCameraUI();
  try {
    await tracker.start(
      el<HTMLSelectElement>("camera-device").value || undefined,
    );
    if (token !== cameraToken) return;
    cameraOn = true;
    overlay.width = video.videoWidth || 640;
    overlay.height = video.videoHeight || 480;
    cameraLoading = false;
    await enumerateCameras();
    updateCameraUI();
    notify("กล้องพร้อมแล้ว หันฝ่ามือเข้ากล้อง และปรับเทียบมือก่อนเริ่มแสดง");
  } catch (error) {
    if (token !== cameraToken) return;
    cameraOn = false;
    cameraLoading = false;
    el("camera-error").textContent =
      error instanceof Error ? error.message : "เปิดกล้องไม่สำเร็จ";
    el("camera-alert").hidden = false;
    updateCameraUI();
  }
}

tracker.onError = (message) => {
  stopCamera();
  el("camera-error").textContent = message;
  el("camera-alert").hidden = false;
};
tracker.onResult = (result) => {
  ensemble.accept(
    result,
    performance.now(),
    settings,
    video.videoWidth / (video.videoHeight || 1),
    calibrationDialog.open,
  );
  drawTrackingOverlay();
  if (capturing && calibrationDialog.open && active.signal)
    captureSamples.push(active.signal);
};

// The wizard samples multiple frames; a failed/cancelled wizard never replaces a saved profile.
const steps = [
  {
    title: "กางมือให้เห็นนิ้วครบ",
    copy: "หันฝ่ามือเข้ากล้อง กางนิ้วและโป้งในช่วงที่ทำได้สบาย ถือมือตรง นี่จะเป็นแนวลำตัวตั้งตรง",
  },
  {
    title: "งอนิ้วและหุบโป้ง",
    copy: "ค่อย ๆ กำมือให้เห็นข้อนิ้ว หุบโป้งเข้าหาฝ่ามือ ไม่ต้องกำแน่นจนเจ็บ",
  },
  {
    title: "เลื่อนมือไปมุมซ้ายบน",
    copy: "วางฝ่ามือที่มุมซ้ายบนของพื้นที่ที่คุณขยับได้สบาย ดูตำแหน่งจากภาพกล้อง แล้วเก็บค่า",
  },
  {
    title: "เลื่อนมือไปมุมขวาล่าง",
    copy: "วางฝ่ามือที่มุมขวาล่างของพื้นที่เชิด เวทีจะปรับให้เข้ากับระยะขยับมือของคุณ",
  },
];
let calibrationStep = 0;
let calibrationValues: Signal[] = [];
let captureSamples: Signal[] = [];
let capturing = false;
let captureStarted = 0;
let wasPaused = false;
function showStep() {
  const step = steps[calibrationStep];
  el("step-number").textContent = `ท่าที่ ${calibrationStep + 1} / 4`;
  el("step-title").textContent = step.title;
  el("step-copy").textContent = step.copy;
  el("step-dots").innerHTML = steps
    .map(
      (_, i) => `<span class="${i <= calibrationStep ? "active" : ""}"></span>`,
    )
    .join("");
  el("calibration-error").textContent = "";
  el("capture-progress").style.width = "0%";
  el("capture").textContent =
    calibrationStep === 3 ? "เก็บค่าและบันทึก" : "เก็บค่าท่านี้";
}
function openCalibration() {
  if (!cameraOn) {
    notify("เปิดกล้องก่อนปรับเทียบมือครับ");
    return;
  }
  if (calibrationDialog.open) return;
  wasPaused = paused;
  ensemble.setPaused(true);
  calibrationStep = 0;
  calibrationValues = [];
  capturing = false;
  showStep();
  calibrationDialog.showModal();
}
function finishCapture() {
  capturing = false;
  if (captureSamples.length < 8 || performance.now() - active.seenAt > 250) {
    el("calibration-error").textContent =
      "เห็นมือไม่ต่อเนื่อง กรุณาถือท่านี้ให้กล้องเห็นชัด แล้วเก็บค่าอีกครั้ง";
    return;
  }
  calibrationValues[calibrationStep] = averageSignals(captureSamples);
  if (calibrationStep < 3) {
    calibrationStep++;
    showStep();
  } else {
    try {
      settings.profiles[settings.hand] = buildProfile(
        calibrationValues[0],
        calibrationValues[1],
        calibrationValues[2],
        calibrationValues[3],
      );
      save();
      updateLabels();
      calibrationDialog.close();
      ensemble.reset(settings);
      for (const side of HAND_SIDES) bindCastHand(side);
      setPause(wasPaused);
      notify("ปรับเทียบเรียบร้อย พร้อมเชิดด้วยมือของคุณแล้ว");
    } catch (error) {
      calibrationStep = 0;
      calibrationValues = [];
      showStep();
      el("calibration-error").textContent = (error as Error).message;
    }
  }
}
calibrationDialog.addEventListener("close", () => {
  capturing = false;
  ensemble.setPaused(wasPaused);
});
el("capture").addEventListener("click", () => {
  if (capturing || !active.signal || performance.now() - active.seenAt > 250)
    return;
  captureSamples = [];
  capturing = true;
  captureStarted = performance.now();
  el("calibration-error").textContent = "";
});
el("restart-calibration").addEventListener("click", () => {
  capturing = false;
  calibrationStep = 0;
  calibrationValues = [];
  showStep();
});
el("close-calibration").addEventListener("click", () =>
  calibrationDialog.close(),
);

el("start-camera").addEventListener("click", () => {
  if (cameraOn) stopCamera();
  else void startCamera();
});
el("camera-device").addEventListener("change", () => {
  if (cameraOn) {
    stopCamera();
    void startCamera();
  }
});
el("pause").addEventListener("click", () => setPause(!paused));
el("reset-pose").addEventListener("click", () => {
  resetPose();
  updateCameraUI();
  notify("รีเซ็ตท่าทางแล้ว");
});
el("hand-mode").addEventListener("change", () => {
  settings.handMode =
    el<HTMLSelectElement>("hand-mode").value === "dual" ? "dual" : "single";

  ensemble.clear();
  for (const side of HAND_SIDES) bindCastHand(side);
  save();
  updateLabels();
  updateCameraUI();
  drawTrackingOverlay();
  notify(
    settings.handMode === "dual"
      ? "สองมือพร้อมแล้ว เลือกมือซ้าย/ขวาเพื่อเปลี่ยนตัวละครและปรับเทียบแยกกัน"
      : "เปลี่ยนเป็นหนึ่งมือแล้ว",
  );
});
el("mirror").addEventListener("change", () => {
  settings.mirror = el<HTMLInputElement>("mirror").checked;
  ensemble.reset(settings);
  for (const side of HAND_SIDES) bindCastHand(side);
  setPause(paused);
  save();
  updateLabels();
});
el("smoothing").addEventListener("input", () => {
  settings.smoothing = Number(el<HTMLInputElement>("smoothing").value) / 100;
  save();
  updateLabels();
});
el("motion").addEventListener("input", () => {
  settings.motion = Number(el<HTMLInputElement>("motion").value) / 100;
  save();
  updateLabels();
});
el("rods").addEventListener("change", () => {
  settings.rods = el<HTMLInputElement>("rods").checked;
  save();
});
el("calibrate").addEventListener("click", openCalibration);
el("guide-button").addEventListener("click", () => guideDialog.showModal());
el("close-guide").addEventListener("click", () => guideDialog.close());
el("toggle-overlay").addEventListener("click", () => {
  overlayVisible = !overlayVisible;
  el("toggle-overlay").setAttribute(
    "aria-label",
    overlayVisible ? "ซ่อนจุดมือ" : "แสดงจุดมือ",
  );
  drawTrackingOverlay();
});
document.querySelectorAll<HTMLButtonElement>("[data-theme]").forEach((b) =>
  b.addEventListener("click", () => {
    settings.theme = b.dataset.theme as Settings["theme"];
    save();
    updateLabels();
  }),
);
FINGERS.forEach((_, i) => {
  el(`gain-${i}`).addEventListener("input", () => {
    settings.gain[i] = Number(el<HTMLInputElement>(`gain-${i}`).value) / 100;
    save();
    updateLabels();
  });
  el(`assign-${i}`).addEventListener("change", () => {
    const action = el<HTMLSelectElement>(`assign-${i}`).value as Action;
    const previous = settings.assignments[i];
    const other = settings.assignments.indexOf(action);
    settings.assignments[i] = action;
    if (other !== i) settings.assignments[other] = previous;
    for (const side of HAND_SIDES)
      ensemble.sessions[side].controller.gesture.reset();
    save();
    updateLabels();
    notify("สลับหน้าที่นิ้วแล้ว แต่ละหน้าที่ยังคงมีนิ้วควบคุมหนึ่งนิ้ว");
  });
});
el("reset-settings").addEventListener("click", () => {
  settings = defaultSettings();
  cast = initialCast(settings);
  resetPose();
  updateCameraUI();
  save();
  updateLabels();
  notify("คืนค่าการตั้งค่าและล้างการปรับเทียบแล้ว");
});

async function fullscreen() {
  const shell = el("stage-shell");
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  if (shell.classList.contains("presentation")) {
    shell.classList.remove("presentation");
    return;
  }
  if (shell.requestFullscreen) {
    try {
      await shell.requestFullscreen();
      return;
    } catch {
      /* CSS presentation fallback */
    }
  }
  shell.classList.add("presentation");
}
el("fullscreen").addEventListener("click", () => void fullscreen());
el("exit-stage").addEventListener("click", () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  el("stage-shell").classList.remove("presentation");
});
document.addEventListener("keydown", (event) => {
  if(event.defaultPrevented||stageDrag?.active)return;
  if (event.key === "Escape")
    el("stage-shell").classList.remove("presentation");
  const target = event.target as HTMLElement;
  if (
    calibrationDialog.open ||
    guideDialog.open ||
    characterDialog.open ||
    settingsDialog.open ||
    target.matches("input,select,textarea,button,a") ||
    target.isContentEditable ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return;
  if (event.code === "Space") {
    event.preventDefault();
    if (!event.repeat) setPause(!paused);
  }
  if (event.key.toLowerCase() === "r" && !event.repeat) {
    resetPose();
    updateCameraUI();
  }
  if (event.key.toLowerCase() === "f" && !event.repeat) void fullscreen();
});
window.addEventListener("pagehide", () => {
  if (castDirty) save();
  tracker.stop();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) ensemble.clear();
});

let previousFrame = performance.now(),
  previousUi = 0;
function frame(now: number) {
  const dt = Math.min((now - previousFrame) / 1000, 0.1);
  previousFrame = now;
  // Keep saved poses still while the camera is off; only real tracking advances them.
  if (cameraOn)
    for (const side of activeHands(settings))
      ensemble.sessions[side].controller.tick(now, dt, settings.smoothing);
  for (const side of activeHands(settings)) {
    const member = memberForHand(cast, side);
    if (member && !(stageDrag?.active&&stageDrag.id===member.id)) {
      const pose = ensemble.sessions[side].controller.pose;
      if (
        cameraOn &&
        !document.hidden &&
        document.hasFocus() &&
        JSON.stringify(member.pose) !== JSON.stringify(pose)
      )
        castDirty = true;
      member.pose = { ...pose };
    }
  }
  renderer.drawActors(
    cast.members.map((member) => ({
      key: member.id,
      pose: member.pose,
      character: member.character,
      placement: placement(cast, member),
      control: activeHands(settings).find(
        (side) => cast.controls[side] === member.id,
      ),
      selected: cast.controls[settings.hand] === member.id,
    })),
    settings,
    paused,
    now,
    stageDrag?.active?stageDrag.id:undefined,
  );
  if (now - previousUi > 90) {
    previousUi = now;
    active.controller.fingers.forEach((reading, i) => {
      const value = cameraOn ? reading : 0;
      el(`meter-${i}`).style.width = `${value * 100}%`;
      el(`value-${i}`).textContent = `${Math.round(value * 100)}%`;
      document
        .querySelector(`[data-finger="${i}"]`)
        ?.classList.toggle("engaged", value > 0.15);
    });
    el("stage").setAttribute(
      "aria-label",
      `เวที ${cast.members.length} ตัว · ` +
        activeHands(settings)
          .filter((side) => memberForHand(cast, side))
          .map(
            (side) =>
              `มือ${side === "Left" ? "ซ้าย" : "ขวา"} ควบคุม${getCharacter(settings.characters[side]).name}`,
          )
          .join(" · ") +
        " · ลากเพื่อจัดตำแหน่งและย้ายฝั่ง · ฝั่งซ้ายใช้มือซ้าย ฝั่งขวาใช้มือขวา",
    );
    if (calibrationDialog.open) {
      const preview = el<HTMLCanvasElement>("calibration-video");
      const context = preview.getContext("2d")!;
      context.clearRect(0, 0, 320, 240);
      if (video.readyState >= 2) {
        context.save();
        if (settings.mirror) {
          context.translate(320, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, 320, 240);
        context.restore();
      }
      drawLandmarks(
        el<HTMLCanvasElement>("calibration-overlay"),
        active.points,
        settings.mirror,
      );
      const fresh = !!active.signal && now - active.seenAt < 250;
      el("calibration-live").textContent = fresh
        ? `เห็นมือ${settings.hand === "Right" ? "ขวา" : "ซ้าย"}แล้ว · ${capturing ? `ถือท่านี้ไว้ (${Math.min(8, captureSamples.length)}/8)` : "พร้อมเก็บค่า"}`
        : `ยังไม่เห็นมือ${settings.hand === "Right" ? "ขวา" : "ซ้าย"} กรุณาวางมือให้เห็นในกล้อง`;
      el<HTMLButtonElement>("capture").disabled = !fresh || capturing;
      if (capturing) {
        el("capture-progress").style.width =
          `${Math.min(100, Math.min((now - captureStarted) / 12, (captureSamples.length / 8) * 100))}%`;
        if (
          (now - captureStarted >= 1200 && captureSamples.length >= 8) ||
          now - captureStarted >= 4000
        )
          finishCapture();
      }
    }
  }
  requestAnimationFrame(frame);
}
for (const side of HAND_SIDES) bindCastHand(side);
setInterval(() => {
  // Only the foreground performance writes continuous poses. Idle preview tabs
  // must not overwrite a reset or selection made in another studio window.
  if (!cameraOn || document.hidden || !document.hasFocus() || stageDrag?.active) return;
  const snapshot = JSON.stringify(cast);
  if (snapshot === savedCast) return;
  try {
    localStorage.setItem("nanglung.cast.v1", snapshot);
    savedCast = snapshot;
    castDirty = false;
  } catch {
    /* save() reports unavailable storage on explicit changes. */
  }
}, 2000);
window.addEventListener("storage", (event) => {
  if (
    event.key !== "nanglung.cast.v1" ||
    !event.newValue ||
    event.newValue === savedCast
  )
    return;
  try {
    const value = JSON.parse(event.newValue);
    if (value?.version !== 1 || !Array.isArray(value.members)) return;
    if(stageDrag) {
      const pointerId=stageDrag.pointerId;stageDrag=null;stageCanvas.classList.remove("dragging");
      if(stageCanvas.hasPointerCapture(pointerId))stageCanvas.releasePointerCapture(pointerId);
    }
    cast = parseCast(value, settings);
    savedCast = JSON.stringify(cast);
    castDirty = false;

    syncCastSettings();
    for (const side of HAND_SIDES) bindCastHand(side);
    updateLabels();

    updateCameraUI();
    if (hasRetiredCastMembers(value)||JSON.stringify(value.controls)!==JSON.stringify(cast.controls)) save();
  } catch {
    /* Ignore malformed values from another tab. */
  }
});
let poseSaveTimer: ReturnType<typeof setTimeout>;
for (const event of ["input", "change", "pointerup", "keyup"] as const)
  document.addEventListener(event, () => {
    castDirty = true;
    clearTimeout(poseSaveTimer);
    poseSaveTimer = setTimeout(() => {
      if (castDirty) save();
    }, 300);
  });
updateLabels();
updateCameraUI();
if (migrateSavedCast) save();

requestAnimationFrame(frame);
if (storageUnavailable)
  notify("ใช้ค่าเริ่มต้น การตั้งค่าที่บันทึกไว้ไม่พร้อมใช้งาน");
