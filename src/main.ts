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
} from "./core";
import { CameraTracker } from "./camera";
import { StageRenderer, drawLandmarks, drawHands } from "./renderer";
import { getCharacter, isCharacterId } from "./characters";
import { demoPerformance } from "./performance";
import { HandEnsemble, activeHands, handSettings, HAND_SIDES } from "./ensemble";

import { icon, renderStudio, fingerNames, actionNames } from "./ui";

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
  return { fingers: [0, 0.16, 0.12, 0, 0], x: settings.handMode === "dual" ? (side === "Left" ? 0.25 : 0.75) : 0.5, y: 0.5, tilt: 0 };
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
    el<HTMLSelectElement>("hand-side").querySelector<HTMLOptionElement>(`option[value="${side}"]`)!.textContent = settings.handMode === "dual"
      ? `${side === "Left" ? "ซ้าย" : "ขวา"} · ${getCharacter(settings.characters[side]).name}`
      : `มือ${side === "Left" ? "ซ้าย" : "ขวา"}`;
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
}
function updateCharacter() {
  const character = getCharacter(settings.character);
  el("character-name").textContent = settings.handMode === "dual" ? `${settings.hand === "Left" ? "ซ้าย" : "ขวา"} · ${character.name}` : character.name;
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
  el<HTMLImageElement>("about-character-image").src =
    `${import.meta.env.BASE_URL}characters/${character.id}.svg`;
  el<HTMLAnchorElement>("character-source").href = character.source;
  el("character-source").textContent = character.sourceLabel ?? "แหล่งอ้างอิง ม.อ. ↗";
  const download = el<HTMLAnchorElement>("character-download");
  download.href = `${import.meta.env.BASE_URL}characters/${character.id}.svg`;
  download.download = `nanglung-${character.id}.svg`;
  document
    .querySelectorAll<HTMLButtonElement>("[data-character]")
    .forEach((button) => {
      const active = button.dataset.character === character.id;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
}
document
  .querySelectorAll<HTMLButtonElement>("[data-character]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.character;
      if (!isCharacterId(id) || id === settings.character) return;
      settings.character = id;
      settings.characters[settings.hand] = id;
      autoplayStarted = performance.now();
      // Keep pose, calibration and assignments; a held pinky must release before flipping the new character.
      active.controller.gesture.reset();
      save();
      updateLabels();
    }),
  );
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
  ensemble.reset(settings);
  heldDemoKeys.clear();
  demos = { Left: initialDemo("Left"), Right: initialDemo("Right") };
  demo = demos[settings.hand];
  paused = false;
  el("stage-paused").hidden = true;
  el("pause").innerHTML = icon("pause");
  el("pause").setAttribute("aria-label", "พักการเชิด");
  syncDemoControls();
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
  resetPose();
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
  resetPose();
  save();
  updateLabels();
  updateModeUI();
  drawTrackingOverlay();
  notify(settings.handMode === "dual" ? "สองมือพร้อมแล้ว เลือกมือซ้าย/ขวาเพื่อเปลี่ยนตัวละครและปรับเทียบแยกกัน" : "เปลี่ยนเป็นหนึ่งมือแล้ว");
});
el("hand-side").addEventListener("change", () => {
  const wasPaused = paused;
  settings.hand = el<HTMLSelectElement>("hand-side").value as HandSide;
  active = ensemble.sessions[settings.hand];
  demo = demos[settings.hand];
  if (settings.handMode === "single") {
    resetPose();
    setPause(wasPaused);
  }
  updateLabels();
  save();
  syncDemoControls();
  drawTrackingOverlay();
});
el("mirror").addEventListener("change", () => {
  settings.mirror = el<HTMLInputElement>("mirror").checked;
  ensemble.reset(settings);
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
window.addEventListener("pagehide", () => tracker.stop());
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
        x = settings.handMode === "dual" ? (side === "Left" ? 0.25 : 0.75) + (performance.x - 0.5) * 0.7 : performance.x;
        y = performance.y;
        angle = performance.angle;
      }
      ensemble.sessions[side].controller.ingest({ x, y, angle, fingers: fingers.map((value, i) => Math.min(1, value * settings.gain[i])) }, now, now, handSettings(settings, side), true);
    }
  }
  for (const side of activeHands(settings)) ensemble.sessions[side].controller.tick(now, dt, settings.smoothing);
  renderer.drawActors(activeHands(settings).map(side => ({ key: side, pose: ensemble.sessions[side].controller.pose, character: settings.characters[side] })), settings);
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
    el("stage").setAttribute("aria-label", activeHands(settings).map(side => `มือ${side === "Left" ? "ซ้าย" : "ขวา"} ${getCharacter(settings.characters[side]).name} หัน${ensemble.sessions[side].controller.pose.facing === 1 ? "ขวา" : "ซ้าย"}`).join(" · "));
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
updateLabels();
updateModeUI();
syncDemoControls();
requestAnimationFrame(frame);
if (storageUnavailable)
  notify("ใช้ค่าเริ่มต้น การตั้งค่าที่บันทึกไว้ไม่พร้อมใช้งาน");
