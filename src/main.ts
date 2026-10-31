import "./style.css";
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
import { getCharacter, isCharacterId, MAIN_CAST_IDS } from "./characters";
import { demoPerformance } from "./performance";
import { HandEnsemble, activeHands, handSettings, HAND_SIDES } from "./ensemble";
import { addMember, initialCast, memberForHand, parseCast, placement, removeMember, selectMember, MAX_CAST, type CastState } from "./cast";

import { icon, renderStudio, fingerNames, actionNames, characterPreview } from "./ui";

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
try { cast = parseCast(JSON.parse(localStorage.getItem("nanglung.cast.v1") ?? "null"), settings); }
catch { cast = initialCast(settings); }
for (const side of HAND_SIDES) {
  const member = memberForHand(cast, side);
  if (member) settings.characters[side] = member.character;
}
if (!memberForHand(cast, settings.hand)) settings.hand = cast.controls.Right ? "Right" : "Left";
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
const castDialog = el<HTMLDialogElement>("cast-dialog");
let castPage = 0;
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
let mode: "demo" | "live" = "demo";
let cameraOn = false;
let cameraLoading = false;
let cameraToken = 0;
let paused = false;
let autoplay = false;
let autoplayStarted = 0;
let overlayVisible = true;
function initialDemo(side: HandSide) {
  const pose = memberForHand(cast,side)?.pose ?? restPose();
  const values = {mouth:pose.mouth,rightArm:pose.rightArm,leftArm:pose.leftArm,head:pose.head/.55,flip:0};
  return { fingers:settings.assignments.map((a,i)=>values[a]/settings.gain[i]),x:.5+(pose.x-.5)/.8,y:.5+(pose.y-.53)/.4,tilt:pose.tilt };
}
let demos = { Left: initialDemo("Left"), Right: initialDemo("Right") };
let demo = demos[settings.hand];
const heldDemoKeys = new Map<string, HandSide>();
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
  demo = demos[settings.hand];
  settings.character = settings.characters[settings.hand];
  updateCharacter();
  el<HTMLSelectElement>("hand-mode").value = settings.handMode;
  el("hand-choice-label").textContent = settings.handMode === "dual" ? "ปรับมือ" : "มือที่ใช้";
  el("calibration-title").textContent = `ปรับเทียบมือ${settings.hand === "Left" ? "ซ้าย" : "ขวา"}`;
  el("finger-description").textContent = `${mode === "demo" ? "ทดลอง" : "สัญญาณ"}มือ${settings.hand === "Left" ? "ซ้าย" : "ขวา"}`;
  for (const side of HAND_SIDES) {
    el<HTMLSelectElement>("hand-side").querySelector<HTMLOptionElement>(`option[value="${side}"]`)!.textContent =
      `${side === "Left" ? "ซ้าย" : "ขวา"} · ${memberForHand(cast,side) ? getCharacter(settings.characters[side]).name : "ยังไม่เลือก"}`;
  }
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
  el<HTMLSelectElement>("hand-side").value = settings.hand;
  el<HTMLInputElement>("smoothing").value = String(settings.smoothing * 100);
  el("smoothing-value").textContent =
    `${Math.round(settings.smoothing * 100)}%`;
  el<HTMLInputElement>("motion").value = String(settings.motion * 100);
  el("motion-value").textContent = `${settings.motion.toFixed(1)}×`;
  el<HTMLInputElement>("rods").checked = settings.rods;
  el("calibration-status").textContent = settings.profiles[settings.hand]
    .calibrated
    ? "ปรับเทียบแล้ว"
    : "ยังไม่ปรับเทียบ";
  document.querySelectorAll<HTMLButtonElement>("[data-theme]").forEach((b) => {
    b.classList.toggle("active", b.dataset.theme === settings.theme);
    b.setAttribute("aria-pressed", String(b.dataset.theme === settings.theme));
  });
  el("cast-count").textContent = String(cast.members.length);
  if (castDialog.open) renderCast();
}
function updateCharacter() {
  const character = getCharacter(settings.character);
  const hasActor = !!memberForHand(cast,settings.hand);
  el<HTMLButtonElement>("character-about").disabled = !hasActor;
  el("character-name").textContent = !hasActor ? "เลือกตัวบนเวที" : `${settings.hand === "Left" ? "ซ้าย" : "ขวา"} · ${character.name}`;
  el("accessory-control").hidden = !character.accessory;
  el("accessory-label").textContent =
    `แสดง${character.accessory?.name ?? "อุปกรณ์"}`;
  el<HTMLInputElement>("accessories").checked = settings.accessories;
  el<HTMLCanvasElement>("stage").setAttribute(
    "aria-label",
    `เวทีหนังตะลุง — ${character.name} ขยับตามมือหรือตัวควบคุมทดลอง`,
  );
  el("about-character-name").textContent = character.fullName ?? character.name;
  el("about-character-traits").textContent = character.traits;
  el("about-character-gesture").textContent = character.gesture;
  el("about-character-image").innerHTML = characterPreview(character.id,`about-${character.id}`);
  el<HTMLAnchorElement>("character-source").href = character.source;
  el("character-source").textContent = character.sourceLabel ?? "แหล่งอ้างอิง ม.อ. ↗";
  const download = el<HTMLAnchorElement>("character-download");
  download.href = `${import.meta.env.BASE_URL}characters/${character.id}.svg`;
  download.download = `nanglung-${character.id}.svg`;
  el<HTMLSelectElement>("character-more").value = MAIN_CAST_IDS.includes(character.id) ? "" : character.id;
  el("character-more-label").classList.toggle("active", !MAIN_CAST_IDS.includes(character.id));
  document
    .querySelectorAll<HTMLButtonElement>("[data-character]")
    .forEach((button) => {
      const active = hasActor && button.dataset.character === character.id;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
}
function chooseCharacter(id: string | undefined) {
  if (!isCharacterId(id)) return;
  const member = memberForHand(cast,settings.hand);
  if (!member) { openCast(); return; }
  if (id === settings.character) return;
  member.character = id;
  settings.character = id;
  settings.characters[settings.hand] = id;
  autoplayStarted = performance.now();
  // A held pinky must release before flipping the replacement puppet.
  active.controller.gesture.reset();
  save();
  updateLabels();
}
document.querySelectorAll<HTMLButtonElement>("[data-character]").forEach(button =>
  button.addEventListener("click", () => chooseCharacter(button.dataset.character)),
);
el<HTMLSelectElement>("character-more").addEventListener("change", event =>
  chooseCharacter((event.target as HTMLSelectElement).value),
);

function bindCastHand(side: HandSide) {
  const member=memberForHand(cast,side);
  if(member) {
    settings.characters[side]=member.character;
    ensemble.sessions[side].controller.adoptPose(member.pose,performance.now());
    ensemble.sessions[side].controller.setPaused(paused);
  }
  demos[side]=initialDemo(side);
  if(member)ensemble.sessions[side].controller.fingers=demos[side].fingers.map((value,i)=>Math.min(1,value*settings.gain[i]));
}
function syncCastSettings() {
  for(const side of HAND_SIDES) {
    const member=memberForHand(cast,side);
    if(member)settings.characters[side]=member.character;
  }
  if(!memberForHand(cast,settings.hand))settings.hand=cast.controls.Right?"Right":"Left";
  settings.character=settings.characters[settings.hand];
}
function selectActor(id:string) {
  const previousHand=settings.hand,previousId=cast.controls[previousHand];
  const side=selectMember(cast,id,previousHand,settings.handMode==="dual");
  settings.hand=side;
  if(previousHand!==side||previousId!==id) {
    for(const [key,hand] of heldDemoKeys)demos[hand].fingers[Number(key)-1]=0;
    heldDemoKeys.clear();
    if(side===previousHand||settings.handMode==="single")bindCastHand(side);
  }
  syncCastSettings();save();updateLabels();syncDemoControls();drawTrackingOverlay();
}
function openCast() {
  const member=memberForHand(cast,settings.hand);
  castPage=member?Math.floor(cast.members.filter(m=>m.side===member.side).indexOf(member)/2):0;
  renderCast();castDialog.showModal();
}
function renderCast() {
  const pageCount=Math.max(1,...HAND_SIDES.map(side=>Math.ceil(cast.members.filter(m=>m.side===side).length/2)));
  castPage=Math.min(castPage,pageCount-1);
  el("cast-total").textContent=`${cast.members.length}/${MAX_CAST}`;
  el<HTMLSelectElement>("cast-control-hand").value=settings.hand;
  el<HTMLButtonElement>("cast-add").disabled=cast.members.length>=MAX_CAST;
  el("cast-roster").innerHTML=HAND_SIDES.map(side=>{
    const group=cast.members.filter(m=>m.side===side),visible=group.slice(castPage*2,castPage*2+2);
    return `<section class="cast-group"><h3>ฝั่ง${side==="Left"?"ซ้าย":"ขวา"} · ${group.length}</h3>${visible.map(member=>{
      const character=getCharacter(member.character),hand=HAND_SIDES.find(h=>cast.controls[h]===member.id);
      return `<div class="cast-member ${cast.controls[settings.hand]===member.id?"selected":""}" data-cast-member="${member.id}"><button class="cast-select" data-select-cast="${member.id}" aria-label="ควบคุม${character.name} ฝั่ง${side==="Left"?"ซ้าย":"ขวา"} ตัวที่${group.indexOf(member)+1}" aria-pressed="${cast.controls[settings.hand]===member.id}">${characterPreview(member.character,`cast-${member.id}`)}<span><strong>${character.name}</strong><small>${hand?`มือ${hand==="Left"?"ซ้าย":"ขวา"}`:"พักบนเวที"}</small></span></button><button class="cast-small" data-move-cast="${member.id}" aria-label="ย้าย${character.name}ไปฝั่ง${side==="Left"?"ขวา":"ซ้าย"}" title="ย้ายฝั่ง">${side==="Left"?"→":"←"}</button><button class="cast-small" data-remove-cast="${member.id}" aria-label="นำ${character.name}ออกจากเวที" title="นำออกจากเวที" ${cast.members.length<=1?"disabled":""}>×</button></div>`;
    }).join("")||'<p class="cast-empty">ไม่มีตัวละครในหน้านี้</p>'}</section>`;
  }).join("");
  el("cast-page").textContent=`${castPage+1} / ${pageCount}`;
  el<HTMLButtonElement>("cast-prev").disabled=castPage===0;
  el<HTMLButtonElement>("cast-next").disabled=castPage>=pageCount-1;
}
el("cast-button").addEventListener("click",openCast);
el("close-cast").addEventListener("click",()=>castDialog.close());
el("cast-prev").addEventListener("click",()=>{castPage--;renderCast();});
el("cast-next").addEventListener("click",()=>{castPage++;renderCast();});
el("cast-control-hand").addEventListener("change",()=>{
  settings.hand=el<HTMLSelectElement>("cast-control-hand").value as HandSide;
  active=ensemble.sessions[settings.hand];demo=demos[settings.hand];
  updateLabels();save();syncDemoControls();
});
el("cast-add").addEventListener("click",()=>{
  const character=el<HTMLSelectElement>("cast-new-character").value;
  const side=el<HTMLSelectElement>("cast-new-side").value as HandSide;
  if(!isCharacterId(character))return;
  const member=addMember(cast,character,side,crypto.randomUUID());
  if(!member){el("cast-message").textContent=`เวทีรองรับได้สูงสุด ${MAX_CAST} ตัว`;return;}
  castPage=Math.floor((cast.members.filter(m=>m.side===side).length-1)/2);
  selectActor(member.id);renderCast();
  el("cast-message").textContent=`เพิ่ม${getCharacter(character).name}ฝั่ง${side==="Left"?"ซ้าย":"ขวา"}แล้ว`;
});
el("cast-roster").addEventListener("click",event=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if(!button)return;
  const id=button.dataset.selectCast??button.dataset.removeCast??button.dataset.moveCast;
  const member=cast.members.find(m=>m.id===id);if(!member)return;
  if(button.dataset.selectCast){selectActor(member.id);castDialog.close();return;}
  if(button.dataset.moveCast) {
    member.side=member.side==="Left"?"Right":"Left";
    member.pose.facing=member.side==="Left"?1:-1;
    for(const side of HAND_SIDES)if(cast.controls[side]===member.id)bindCastHand(side);
    castPage=Math.floor(cast.members.filter(m=>m.side===member.side).indexOf(member)/2);
  } else {
    if(!removeMember(cast,member.id))return;
    for(const side of HAND_SIDES)bindCastHand(side);
  }
  syncCastSettings();save();updateLabels();syncDemoControls();renderCast();
});
el("stage").addEventListener("click",event=>{
  const pointer=event as MouseEvent,id=renderer.hitTest(pointer.clientX,pointer.clientY);
  if(id)selectActor(id);
});
el("stage").addEventListener("keydown",event=>{
  if(event.key!=="ArrowLeft"&&event.key!=="ArrowRight")return;
  event.preventDefault();
  const index=cast.members.findIndex(m=>m.id===cast.controls[settings.hand]);
  selectActor(cast.members[(index+(event.key==="ArrowLeft"?-1:1)+cast.members.length)%cast.members.length].id);
});
el("character-about").addEventListener("click", () =>
  characterDialog.showModal(),
);
el("close-character").addEventListener("click", () => characterDialog.close());
el("accessories").addEventListener("change", () => {
  settings.accessories = el<HTMLInputElement>("accessories").checked;
  save();
});
function updateModeUI() {
  el("mode-demo").classList.toggle("active", mode === "demo");
  el("mode-live").classList.toggle("active", mode === "live");
  el("mode-demo").setAttribute("aria-pressed", String(mode === "demo"));
  el("mode-live").setAttribute("aria-pressed", String(mode === "live"));
  el("autoplay").hidden = mode !== "demo";
  el("autoplay").innerHTML = autoplay
    ? `${icon("pause")} หยุดตัวอย่าง`
    : `${icon("play")} เล่นตัวอย่าง`;
  el("finger-description").textContent = `${mode === "demo" ? "ทดลอง" : "สัญญาณ"}มือ${settings.hand === "Left" ? "ซ้าย" : "ขวา"}`;
  document.querySelector<HTMLElement>(".workspace")!.dataset.mode = mode;
  for (const id of ["demo-x", "demo-y", "demo-tilt"])
    el<HTMLInputElement>(id).disabled = mode !== "demo";
  document
    .querySelectorAll<HTMLInputElement>(".finger-input")
    .forEach((input) => {
      input.disabled = mode !== "demo";
    });
  el("camera-empty").hidden = cameraOn;
  video.hidden = !cameraOn;
  el("toggle-overlay").hidden = !cameraOn;
  el("camera-label").textContent = cameraLoading
    ? "LOADING MODEL"
    : cameraOn
      ? "LOCAL CAMERA"
      : "CAMERA OFF";
  const start = el<HTMLButtonElement>("start-camera");
  start.disabled = cameraLoading;
  start.innerHTML = cameraLoading
    ? '<span class="spinner"></span> กำลังเตรียมกล้อง…'
    : cameraOn
      ? `${icon("camera")} ปิดกล้อง`
      : `${icon("camera")} เปิดกล้องเพื่อเชิด`;
  el("camera-empty-title").textContent = cameraLoading
    ? "กำลังเตรียมกล้อง"
    : "กล้องยังไม่เปิด";
  el("camera-empty-copy").textContent = cameraLoading
    ? "ครั้งแรกอาจใช้เวลาสักครู่"
    : "หันฝ่ามือเข้ากล้อง ให้เห็นนิ้วครบ";
}
function setPause(value: boolean) {
  paused = value;
  ensemble.setPaused(value);
  el("stage-paused").hidden = !value;
  el("pause").innerHTML = icon(value ? "play" : "pause");
  el("pause").setAttribute("aria-label", value ? "เชิดต่อ" : "พักการเชิด");
}
function syncDemoControls() {
  el<HTMLInputElement>("demo-x").value = String(demo.x * 100);
  el<HTMLInputElement>("demo-y").value = String(demo.y * 100);
  el<HTMLInputElement>("demo-tilt").value = String(demo.tilt * 180 / Math.PI);
  FINGERS.forEach((finger, i) => { el<HTMLInputElement>(`finger-${finger}`).value = String(demo.fingers[i] * 100); });
}
function resetPose() {
  paused = false;
  ensemble.reset(settings);
  for(const member of cast.members)member.pose={...restPose(),facing:member.side==="Left"?1:-1};
  for(const side of HAND_SIDES)bindCastHand(side);
  heldDemoKeys.clear();
  demos = { Left: initialDemo("Left"), Right: initialDemo("Right") };
  demo = demos[settings.hand];
  paused = false;
  el("stage-paused").hidden = true;
  el("pause").innerHTML = icon("pause");
  el("pause").setAttribute("aria-label", "พักการเชิด");
  syncDemoControls();
  save();
}
function drawTrackingOverlay() {
  drawHands(overlay, overlayVisible ? activeHands(settings).flatMap(side => {
    const points = ensemble.sessions[side].points;
    return points ? [{ side, points }] : [];
  }) : [], settings.mirror);
}
function stopCamera() {
  cameraToken++;
  tracker.stop();
  cameraOn = false;
  cameraLoading = false;
  ensemble.clear();
  drawTrackingOverlay();
  updateModeUI();
}
function setMode(next: "demo" | "live") {
  if (mode === next) return;
  if (next === "demo") stopCamera();
  mode = next;
  autoplay = false;
  ensemble.clear();
  for(const side of HAND_SIDES)bindCastHand(side);
  syncDemoControls();
  updateModeUI();
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
  setMode("live");
  if (cameraLoading) return;
  const token = ++cameraToken;
  cameraLoading = true;
  el("camera-alert").hidden = true;
  updateModeUI();
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
    updateModeUI();
    notify("กล้องพร้อมแล้ว หันฝ่ามือเข้ากล้อง และปรับเทียบมือก่อนเริ่มแสดง");
  } catch (error) {
    if (token !== cameraToken) return;
    cameraOn = false;
    cameraLoading = false;
    el("camera-error").textContent =
      error instanceof Error ? error.message : "เปิดกล้องไม่สำเร็จ";
    el("camera-alert").hidden = false;
    updateModeUI();
  }
}

tracker.onError = (message) => {
  stopCamera();
  el("camera-error").textContent = message;
  el("camera-alert").hidden = false;
};
tracker.onResult = (result) => {
  ensemble.accept(result, performance.now(), settings, video.videoWidth / (video.videoHeight || 1), calibrationDialog.open);
  drawTrackingOverlay();
  if (capturing && calibrationDialog.open && active.signal) captureSamples.push(active.signal);
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
      for(const side of HAND_SIDES)bindCastHand(side);
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

el("mode-demo").addEventListener("click", () => setMode("demo"));
el("mode-live").addEventListener("click", () => setMode("live"));
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
el("autoplay").addEventListener("click", () => {
  autoplay = !autoplay;
  if (autoplay) autoplayStarted = performance.now();
  if (paused) setPause(false);
  updateModeUI();
});
el("pause").addEventListener("click", () => setPause(!paused));
el("reset-pose").addEventListener("click", () => {
  autoplay = false;
  resetPose();
  updateModeUI();
  notify("รีเซ็ตท่าทางแล้ว");
});
el("hand-mode").addEventListener("change", () => {
  settings.handMode = el<HTMLSelectElement>("hand-mode").value === "dual" ? "dual" : "single";
  autoplay = false;
  ensemble.clear();
  for(const side of HAND_SIDES)bindCastHand(side);
  save();
  updateLabels();
  updateModeUI();
  drawTrackingOverlay();
  notify(settings.handMode === "dual" ? "สองมือพร้อมแล้ว เลือกมือซ้าย/ขวาเพื่อเปลี่ยนตัวละครและปรับเทียบแยกกัน" : "เปลี่ยนเป็นหนึ่งมือแล้ว");
});
el("hand-side").addEventListener("change", () => {
  settings.hand = el<HTMLSelectElement>("hand-side").value as HandSide;
  active = ensemble.sessions[settings.hand];
  demo = demos[settings.hand];
  if (settings.handMode === "single") {
    bindCastHand(settings.hand);
  }
  updateLabels();
  save();
  syncDemoControls();
  drawTrackingOverlay();
});
el("mirror").addEventListener("change", () => {
  settings.mirror = el<HTMLInputElement>("mirror").checked;
  ensemble.reset(settings);
  for(const side of HAND_SIDES)bindCastHand(side);
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
FINGERS.forEach((f, i) => {
  el(`finger-${f}`).addEventListener("input", () => {
    autoplay = false;
    demo.fingers[i] = Number(el<HTMLInputElement>(`finger-${f}`).value) / 100;
    updateModeUI();
  });
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
    for (const side of HAND_SIDES) ensemble.sessions[side].controller.gesture.reset();
    save();
    updateLabels();
    notify("สลับหน้าที่นิ้วแล้ว แต่ละหน้าที่ยังคงมีนิ้วควบคุมหนึ่งนิ้ว");
  });
});
el("demo-x").addEventListener("input", () => {
  autoplay = false;
  demo.x = Number(el<HTMLInputElement>("demo-x").value) / 100;
  updateModeUI();
});
el("demo-y").addEventListener("input", () => {
  autoplay = false;
  demo.y = Number(el<HTMLInputElement>("demo-y").value) / 100;
  updateModeUI();
});
el("demo-tilt").addEventListener("input", () => {
  autoplay = false;
  demo.tilt = (Number(el<HTMLInputElement>("demo-tilt").value) * Math.PI) / 180;
  updateModeUI();
});
el("reset-settings").addEventListener("click", () => {
  settings = defaultSettings();
  cast = initialCast(settings);
  resetPose();
  updateModeUI();
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
  if (event.key === "Escape")
    el("stage-shell").classList.remove("presentation");
  const target = event.target as HTMLElement;
  if (
    calibrationDialog.open ||
    guideDialog.open ||
    characterDialog.open ||
    castDialog.open ||
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
    autoplay = false;
    resetPose();
    updateModeUI();
  }
  if (event.key.toLowerCase() === "f" && !event.repeat) void fullscreen();
  if (mode === "demo" && /^[1-5]$/.test(event.key)) {
    event.preventDefault();
    autoplay = false;
    if (!heldDemoKeys.has(event.key)) heldDemoKeys.set(event.key, settings.hand);
    demos[heldDemoKeys.get(event.key)!].fingers[Number(event.key) - 1] = 1;
    updateModeUI();
  }
});
document.addEventListener("keyup", (event) => {
  const side = heldDemoKeys.get(event.key);
  if (side) {
    demos[side].fingers[Number(event.key) - 1] = 0;
    heldDemoKeys.delete(event.key);
  }
});
window.addEventListener("blur", () => {
  for (const [key, side] of heldDemoKeys) demos[side].fingers[Number(key) - 1] = 0;
  heldDemoKeys.clear();
});
window.addEventListener("pagehide", () => { if(castDirty)save(); tracker.stop(); });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) ensemble.clear();
});

let previousFrame = performance.now(),
  previousUi = 0;
function frame(now: number) {
  const dt = Math.min((now - previousFrame) / 1000, 0.1);
  previousFrame = now;
  if (mode === "demo" && !paused) {
    for (const [index, side] of activeHands(settings).entries()) {
      const controls = demos[side], character = settings.characters[side];
      let fingers = controls.fingers, x = controls.x, y = controls.y, angle = controls.tilt;
      if (autoplay) {
        const performance = demoPerformance(character, (now - autoplayStarted) / 1000 + index * 1.5);
        fingers = settings.assignments.map(action => performance.values[action]);
        x = .5 + (performance.x - .5) * .7;
        y = performance.y;
        angle = performance.angle;
      }
      ensemble.sessions[side].controller.ingest({ x, y, angle, fingers: fingers.map((value, i) => Math.min(1, value * settings.gain[i])) }, now, now, handSettings(settings, side), true);
    }
  }
  for (const side of activeHands(settings)) ensemble.sessions[side].controller.tick(now, dt, settings.smoothing);
  for(const side of activeHands(settings)) {
    const member=memberForHand(cast,side);
    if(member) {
      const pose=ensemble.sessions[side].controller.pose;
      if((mode==="live"||autoplay)&&!document.hidden&&document.hasFocus()&&JSON.stringify(member.pose)!==JSON.stringify(pose))castDirty=true;
      member.pose={...pose};
    }
  }
  renderer.drawActors(cast.members.map(member=>({
    key:member.id,pose:member.pose,character:member.character,placement:placement(cast,member),
    control:activeHands(settings).find(side=>cast.controls[side]===member.id),
    selected:cast.controls[settings.hand]===member.id,
  })), settings);
  if (now - previousUi > 90) {
    previousUi = now;
    active.controller.fingers.forEach((value, i) => {
      el(`meter-${i}`).style.width = `${value * 100}%`;
      el(`value-${i}`).textContent = `${Math.round(value * 100)}%`;
      document
        .querySelector(`[data-finger="${i}"]`)
        ?.classList.toggle("engaged", value > 0.15);
      if (
        mode === "demo" &&
        (autoplay || document.activeElement !== el(`finger-${FINGERS[i]}`))
      )
        el<HTMLInputElement>(`finger-${FINGERS[i]}`).value = String(
          (autoplay ? value : demo.fingers[i]) * 100,
        );
    });
    const tracked = activeHands(settings).filter(side => ensemble.sessions[side].controller.state === "tracking");
    const stateText = paused ? "พักการเชิด" : mode === "demo"
      ? `${autoplay ? "กำลังแสดงตัวอย่าง" : "โหมดทดลอง"}${settings.handMode === "dual" ? " · 2 มือ" : ""}`
      : cameraLoading ? "กำลังเตรียมกล้อง" : !cameraOn ? "กล้องปิดอยู่"
      : settings.handMode === "dual" ? `พบมือ ${tracked.length}/2 · ซ้าย ${tracked.includes("Left") ? "✓" : "–"} ขวา ${tracked.includes("Right") ? "✓" : "–"}`
      : tracked.length ? "ตรวจพบมือ · กำลังเชิด" : `รอมือ${settings.hand === "Right" ? "ขวา" : "ซ้าย"}`;
    el("stage").setAttribute("aria-label", `เวที ${cast.members.length} ตัว · `+activeHands(settings).filter(side=>memberForHand(cast,side)).map(side => `มือ${side === "Left" ? "ซ้าย" : "ขวา"} ควบคุม${getCharacter(settings.characters[side]).name}`).join(" · ")+" · คลิกตัวละครเพื่อสลับควบคุม");
    if (el("stage-state").textContent !== stateText)
      el("stage-state").textContent = stateText;
    el("stage-state").classList.toggle(
      "is-live",
      mode === "live" && tracked.length > 0 && !paused,
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
for(const side of HAND_SIDES)bindCastHand(side);
setInterval(()=>{
  // Only the foreground performance writes continuous poses. Idle preview tabs
  // must not overwrite a reset or selection made in another studio window.
  if(!(cameraOn||autoplay)||document.hidden||!document.hasFocus())return;
  const snapshot=JSON.stringify(cast);
  if(snapshot===savedCast)return;
  try { localStorage.setItem("nanglung.cast.v1",snapshot);savedCast=snapshot;castDirty=false; }
  catch { /* save() reports unavailable storage on explicit changes. */ }
},2000);
window.addEventListener("storage",event=>{
  if(event.key!=="nanglung.cast.v1"||!event.newValue||event.newValue===savedCast)return;
  try {
    const value=JSON.parse(event.newValue);
    if(value?.version!==1||!Array.isArray(value.members))return;
    cast=parseCast(value,settings);savedCast=JSON.stringify(cast);castDirty=false;
    autoplay=false;syncCastSettings();
    for(const side of HAND_SIDES)bindCastHand(side);
    updateLabels();syncDemoControls();updateModeUI();
  } catch { /* Ignore malformed values from another tab. */ }
});
let poseSaveTimer:ReturnType<typeof setTimeout>;
for(const event of ["input","change","pointerup","keyup"] as const)document.addEventListener(event,()=>{
  castDirty=true;clearTimeout(poseSaveTimer);
  poseSaveTimer=setTimeout(()=>{if(castDirty)save();},300);
});
updateLabels();
updateModeUI();
syncDemoControls();
requestAnimationFrame(frame);
if (storageUnavailable)
  notify("ใช้ค่าเริ่มต้น การตั้งค่าที่บันทึกไว้ไม่พร้อมใช้งาน");
