import "./style.css";
import "@fontsource-variable/dm-sans/wght.css";
import { MachineScene } from "./scene";
import {
  initialState,
  initialControls,
  advance,
  rates,
  secondaryT,
  rpm,
  balanceError,
  rearm,
  type Controls,
} from "./physics";
import {
  actions,
  availability,
  operate,
  nextAction,
  type Action,
} from "./startup";
import { parts, roots, tr, ancestry, type Part, type Lang } from "./parts";
import { modelHTML, translateBlock } from "./ui-copy";

const svg = (p: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const icons = {
  plant: svg('<path d="M4 20V8l6 4V5l6 4V3h4v17Z M7 16h1m4 0h1m4 0h1"/>'),
  cooling: svg(
    '<path d="M12 11C8 3 3 6 6 10c1 2 3 2 6 2Zm1 1c8-4 5-9 1-6-2 1-2 3-2 6Zm-1 1c4 8 9 5 6 1-1-2-3-2-6-2Zm-1-1c-8 4-5 9-1 6 2-1 2-3 2-6Z"/><circle cx="12" cy="12" r="1.5"/>',
  ),
  primary: svg(
    '<path d="M4 9a8 8 0 0 1 14-3l2 3m0-5v5h-5M20 15A8 8 0 0 1 6 18l-2-3m0 5v-5h5"/>',
  ),
  heat: svg(
    '<path d="M9 3v10a5 5 0 1 0 6 0V3a3 3 0 0 0-6 0Z M12 8v9"/><circle cx="12" cy="17" r="1.5"/>',
  ),
  steam: svg(
    '<path d="M3 12h4m10 0h4M12 3v4m0 10v4"/><circle cx="12" cy="12" r="7"/><path d="m9 8 6 4-6 4Z"/>',
  ),
  load: svg('<path d="m13 2-9 12h7l-1 8 10-12h-7Z"/>'),
  cut: svg(
    '<path d="m3 7 6-4 6 4-6 4Zm0 0v10l6 4V11m0 10 6-4V7m3-2 3 2v10l-3 2M18 10v5"/>',
  ),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>'),
  back: svg('<path d="m14 5-7 7 7 7M7 12h14"/>'),
  home: svg('<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>'),
  play: svg('<path d="m8 4 12 8-12 8Z"/>'),
  pause: svg('<path d="M8 5v14M16 5v14"/>'),
  slow: svg(
    '<path d="M4 16v-4a6 6 0 0 1 12 0v4H4Zm12-3h3l2 2-2 1h-3M7 17v2m6-2v2M5 9l5 3 5-3M10 6v6"/>',
  ),
  sound: svg(
    '<path d="m11 4-5 4H3v8h3l5 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  ),
  muted: svg('<path d="m11 4-5 4H3v8h3l5 4ZM16 9l6 6m0-6-6 6"/>'),
  left: svg('<path d="M5 6v5h5M5 11a7 7 0 1 1 1 7"/>'),
  right: svg('<path d="M19 6v5h-5m5 0a7 7 0 1 0-1 7"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  plus: svg('<path d="M5 12h14M12 5v14"/>'),
  reset: svg('<path d="m12 3 8 5v8l-8 5-8-5V8Zm-8 5 8 5 8-5m-8 5v8"/>'),
  close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
  check: svg('<path d="m5 12 4 4L19 6"/>'),
  lock: svg(
    '<rect x="6" y="10" width="12" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  ),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'),
  alert: svg('<path d="m12 3 10 18H2Z M12 9v5m0 3v.1"/>'),
  part: svg('<path d="M6 3h12v18H6Zm0 5h12M6 16h12M10 3v18m4-18v18"/>'),
};
const labels: Record<Action, readonly [string, string]> = {
  cooling: [
    "Cooling and feed pumps",
    "Pompes de refroidissement et d’alimentation",
  ],
  primary: ["Primary pump", "Pompe primaire"],
  heat: ["Core heat", "Chaleur du cœur"],
  steam: ["Steam admission", "Admission de vapeur"],
  load: ["Electrical load", "Charge électrique"],
};
let lang: Lang = "en";
try {
  lang = localStorage.getItem("rep-language") === "fr" ? "fr" : "en";
} catch {}
const L = (en: string, fr: string) => (lang === "en" ? en : fr);
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let state = initialState(),
  controls = initialControls(),
  paused = false,
  slow = false,
  focused: Part | undefined;
let scene: MachineScene | undefined,
  lastNext: Action | undefined = "cooling",
  lastTrip = "",
  blocked: Action | undefined;
let sound = false,
  audio: AudioContext | undefined,
  motor: OscillatorNode | undefined,
  hum: GainNode | undefined;
const app = $("app");
app.innerHTML = `<main id="experience" tabindex="-1"><h1 class="sr-only"></h1><div id="scene"></div>
<header class="topbar"><div class="identity"><button id="home" class="tool">${icons.plant}<span>01</span></button><button id="back" class="tool" hidden>${icons.back}</button><span id="depth" aria-hidden="true"></span></div><output id="power" class="power" aria-live="off"><strong id="megawatts">0.0</strong><span>MW</span></output><div class="view-tools"><button id="section" class="tool" aria-pressed="true">${icons.cut}</button><button id="info" class="tool">${icons.info}</button></div></header>
<div id="actuators" class="actuators">${actions.map((action, i) => `<button class="actuator" id="action-${action}" data-action="${action}" type="button"><span class="actuator-icon">${icons[action]}</span><svg class="progress" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22"/></svg><span class="action-state" aria-hidden="true"></span><span class="ordinal" aria-hidden="true">0${i + 1}</span></button>`).join("")}</div>
<nav id="components" class="components" hidden></nav>
<footer class="bottom-bar"><div class="playback"><button id="pause" class="tool">${icons.pause}</button><button id="slow" class="tool" aria-pressed="false">${icons.slow}</button><button id="sound" class="tool" aria-pressed="false">${icons.muted}</button></div><div class="camera"><button id="left" class="tool">${icons.left}</button><button id="right" class="tool">${icons.right}</button><button id="minus" class="tool">${icons.minus}</button><button id="plus" class="tool">${icons.plus}</button><button id="view-reset" class="tool">${icons.reset}</button></div></footer><p id="status" class="sr-only" role="status"></p><button id="trip" class="trip tool" hidden>${icons.alert}</button></main>
<dialog id="inspector" aria-labelledby="part-title"><div class="drawer-top"><select id="language" aria-label="Language / Langue"><option value="en">EN</option><option value="fr">FR</option></select><button id="close-info" class="tool">${icons.close}</button></div><h2 id="part-title"></h2><p id="part-role"></p><p id="measurements"></p><div id="settings"></div><p id="reason"></p><button id="rearm" hidden></button><nav id="part-list"></nav><details id="model"><summary></summary><div id="model-content"></div></details><div class="drawer-foot"><button id="restart"></button><a href="https://github.com/kennethassogba/rep" target="_blank" rel="noreferrer">GitHub ↗</a></div></dialog>`;
const setName = (id: string, en: string, fr: string) => {
  $(id).setAttribute("aria-label", L(en, fr));
  $(id).title = L(en, fr);
};
function localize() {
  document.documentElement.lang = lang;
  document.title = L("REP · Machine 01", "REP · Machine 01");
  document.querySelector("h1")!.textContent = L(
    "Start a pressurized-water power plant",
    "Démarrer une centrale à eau pressurisée",
  );
  setName("home", "Whole machine", "Machine entière");
  setName("back", "Go back one level", "Remonter d’un niveau");
  setName("section", "Open the casings", "Ouvrir les enveloppes");
  setName(
    "info",
    "Component, controls and model limits",
    "Composant, commandes et limites du modèle",
  );
  setName("close-info", "Close", "Fermer");
  setName("slow", "Quarter speed", "Vitesse divisée par quatre");
  setName("sound", "Sound", "Son");
  setName("left", "Rotate left", "Tourner à gauche");
  setName("right", "Rotate right", "Tourner à droite");
  setName("minus", "Zoom out", "Dézoomer");
  setName("plus", "Zoom in", "Zoomer");
  setName("view-reset", "Reset camera", "Recentrer la caméra");
  setName(
    "trip",
    "Simulation stopped: show recovery steps",
    "Simulation arrêtée : voir comment reprendre",
  );
  $("components").setAttribute(
    "aria-label",
    L("Internal components", "Composants internes"),
  );
  $("power").setAttribute(
    "aria-label",
    L(
      "Gross electrical output in megawatts",
      "Production électrique brute en mégawatts",
    ),
  );
  scene?.renderer.domElement.setAttribute(
    "aria-label",
    L(
      "Cutaway machine. Drag to orbit, click a component to enter it. Numbered buttons operate the circuits.",
      "Machine en coupe. Glisser pour tourner, cliquer sur une pièce pour y entrer. Les boutons numérotés commandent les circuits.",
    ),
  );
  $<HTMLSelectElement>("language").value = lang;
  navigation();
  renderInspector();
  updateUI();
}
function announce(message: string) {
  $("status").textContent = message;
}
function navigation() {
  $("back").hidden = !focused;
  $("depth").textContent = focused
    ? ancestry(focused)
        .map((_, i) => String(i + 1).padStart(2, "0"))
        .join(" / ")
    : "";
  $("actuators").hidden = !!focused;
  $("components").hidden = !focused || focused.children.length === 0;
  $("components").innerHTML =
    focused?.children
      .map(
        (p, i) =>
          `<button class="component-control" data-part="${p.id}" aria-label="${L("Inspect", "Explorer")} ${tr(p.name, lang)}" title="${tr(p.name, lang)}">${icons.part}<span>${String(i + 1).padStart(2, "0")}</span></button>`,
      )
      .join("") ?? "";
  $("components")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach((b) => (b.onclick = () => drill(b.dataset.part)));
  document.querySelector("h1")!.textContent = focused
    ? tr(focused.name, lang)
    : L(
        "Start a pressurized-water power plant",
        "Démarrer une centrale à eau pressurisée",
      );
}
function drill(id?: string) {
  focused = id ? parts.get(id) : undefined;
  scene?.setDetail(focused);
  navigation();
  renderInspector();
  announce(
    focused ? tr(focused.name, lang) : L("Whole machine", "Machine entière"),
  );
  (focused ? $("back") : $("home")).focus({ preventScroll: true });
}
function sync() {
  scene?.syncControls(controls);
  updateUI();
  renderSettings();
}
function act(action: Action) {
  const result = operate(action, state, controls);
  blocked = result.ready ? undefined : action;
  if (!result.ready) {
    scene?.focusAction(result.requires);
    announce(
      `${tr(labels[action], lang)}. ${L("Required", "Requis")} : ${result.requires ? tr(labels[result.requires], lang) : L("restore circulation", "rétablir la circulation")}.`,
    );
  } else {
    paused = false;
    announce(
      `${tr(labels[action], lang)} · ${result.active ? L("off", "arrêt") : L("on", "marche")}`,
    );
    clickSound();
  }
  sync();
}
for (const action of actions) {
  const b = $(`action-${action}`);
  b.onclick = () => act(action);
  b.onfocus = () => scene?.focusAction(action);
  b.onblur = () => scene?.focusAction();
  b.onpointerenter = () => scene?.focusAction(action);
  b.onpointerleave = () => scene?.focusAction();
}
$("home").onclick = () => drill();
$("back").onclick = () => drill(focused?.parent?.id);
$("section").onclick = () => {
  if (!scene) return;
  scene.setCutaway(!scene.cutaway);
  $("section").setAttribute("aria-pressed", String(scene.cutaway));
};
$("pause").onclick = () => {
  paused = !paused;
  updateUI();
};
$("slow").onclick = () => {
  slow = !slow;
  $("slow").setAttribute("aria-pressed", String(slow));
};
$("left").onclick = () => scene?.rotate(-Math.PI / 8);
$("right").onclick = () => scene?.rotate(Math.PI / 8);
$("minus").onclick = () => scene?.zoom(1.16);
$("plus").onclick = () => scene?.zoom(1 / 1.16);
$("view-reset").onclick = () => scene?.resetView();
const dialog = $<HTMLDialogElement>("inspector");
function inspect() {
  renderInspector();
  dialog.showModal();
}
$("info").onclick = inspect;
$("trip").onclick = inspect;
$("close-info").onclick = () => dialog.close();
$("language").onchange = () => {
  lang = $<HTMLSelectElement>("language").value as Lang;
  try {
    localStorage.setItem("rep-language", lang);
  } catch {}
  localize();
};
$("restart").onclick = () => {
  state = initialState();
  controls = initialControls();
  paused = false;
  blocked = undefined;
  lastNext = "cooling";
  lastTrip = "";
  drill();
  dialog.close();
  sync();
  announce(L("Machine reset to 20 °C", "Machine remise à 20 °C"));
};
$("rearm").onclick = () => {
  if (rearm(state, controls)) {
    paused = false;
    announce(L("Trip reset", "Arrêt réarmé"));
  } else
    announce(
      L(
        "Set heat to zero, restore all pumps and cool below 310 °C.",
        "Ramener la chauffe à zéro, rétablir les pompes et refroidir sous 310 °C.",
      ),
    );
  sync();
  renderInspector();
};
function renderInspector() {
  const p = focused ?? parts.get("reactor")!;
  $("part-title").textContent = tr(p.name, lang);
  $("part-role").textContent = tr(p.role, lang);
  $("part-list").setAttribute(
    "aria-label",
    L("Browse components", "Parcourir les composants"),
  );
  $("part-list").innerHTML = (focused ? focused.children : roots)
    .map(
      (c) =>
        `<button data-part="${c.id}">${tr(c.name, lang)} <span>↗</span></button>`,
    )
    .join("");
  $("part-list")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          dialog.close();
          drill(b.dataset.part);
        }),
    );
  $("model").querySelector("summary")!.textContent = L(
    "Model & limits",
    "Modèle et limites",
  );
  $("model-content").innerHTML = modelHTML(lang);
  $("restart").textContent = L(
    "Reset experiment",
    "Réinitialiser l’expérience",
  );
  $("rearm").textContent = L("Reset teaching trip", "Réarmer le modèle");
  renderSettings();
}
function renderSettings() {
  const ranges: [keyof Controls, string, string][] = [
    ["cooling", "Cooling", "Refroidissement"],
    ["feed", "Feed pump", "Pompe alimentaire"],
    ["primary", "Primary pump", "Pompe primaire"],
    ["power", "Core heat demand", "Demande de chauffe"],
    ["valve", "Steam admission", "Admission de vapeur"],
  ];
  $("settings").innerHTML =
    ranges
      .map(
        ([id, en, fr]) =>
          `<label class="range-row" for="set-${id}"><span>${L(en, fr)}</span><output id="value-${id}">${Math.round(Number(controls[id]) * 100)} %</output><input id="set-${id}" type="range" min="0" max="100" step="1" value="${Math.round(Number(controls[id]) * 100)}"></label>`,
      )
      .join("") +
    `<label class="load-row"><input id="set-generator" type="checkbox" ${controls.generator ? "checked" : ""}>${L("Electrical load", "Charge électrique")}</label>`;
  for (const [id] of ranges)
    $(`set-${id}`).oninput = (e) => {
      (controls[id] as number) =
        Number((e.target as HTMLInputElement).value) / 100;
      $(`value-${id}`).textContent =
        `${Math.round(Number(controls[id]) * 100)} %`;
      scene?.syncControls(controls);
      updateUI();
    };
  $("set-generator").onchange = (e) => {
    controls.generator = (e.target as HTMLInputElement).checked;
    scene?.syncControls(controls);
    updateUI();
  };
  $("rearm").hidden = !state.trip;
  $("reason").textContent = state.trip
    ? translateBlock(state.trip, lang)
    : state.outsideModel
      ? L(
          "Restore primary circulation, then resume. The liquid-only model stops at 340 °C.",
          "Rétablir le débit primaire puis reprendre. Le modèle liquide s’arrête à 340 °C.",
        )
      : L(
          "Schematic geometry. Reduced thermal inertia. Circuit pressures are imposed.",
          "Géométrie schématique. Inerties thermiques réduites. Pressions des circuits imposées.",
        );
}
function project() {
  if (!scene || focused) return;
  for (const action of actions) {
    const p = scene.actionPoint(action),
      b = $(`action-${action}`);
    b.style.setProperty(
      "--x",
      `${Math.max(30, Math.min(innerWidth - 30, p.x))}px`,
    );
    b.style.setProperty(
      "--y",
      `${Math.max(110, Math.min(innerHeight - 120, p.y))}px`,
    );
  }
}
function updateUI() {
  const r = rates(state, controls),
    next = nextAction(state, controls);
  const powerText = r.electric.toLocaleString("en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  if ($("megawatts").textContent !== powerText)
    $("megawatts").textContent = powerText;
  $("power").setAttribute("data-active", String(r.electric >= 1));
  // Keep the clicked SVG alive between pointer down and pointer up.
  const glyph = paused ? "play" : "pause";
  if ($("pause").dataset.glyph !== glyph) {
    $("pause").dataset.glyph = glyph;
    $("pause").innerHTML = icons[glyph];
  }
  setName(
    "pause",
    paused ? "Resume simulation" : "Pause simulation",
    paused ? "Reprendre la simulation" : "Mettre la simulation en pause",
  );
  for (const a of actions) {
    const b = $(`action-${a}`),
      v = availability(a, state, controls),
      stateName = v.active
        ? "active"
        : v.ready
          ? "ready"
          : a === "steam" && controls.power > 0
            ? "waiting"
            : "blocked";
    const previousState = b.dataset.state;
    b.dataset.state = stateName;
    b.dataset.next = String(a === next);
    b.dataset.blocked = String(a === blocked);
    b.setAttribute("aria-pressed", String(v.active));
    b.setAttribute("aria-disabled", String(!v.ready));
    const name = `${tr(labels[a], lang)} · ${v.active ? L("stop", "arrêter") : L("start", "démarrer")}${!v.ready && v.requires ? ` · ${L("requires", "nécessite")} ${tr(labels[v.requires], lang)}` : ""}`;
    b.setAttribute("aria-label", name);
    b.title = name;
    if (previousState !== stateName)
      b.querySelector(".action-state")!.innerHTML =
        stateName === "active"
          ? icons.check
          : stateName === "waiting"
            ? icons.clock
            : stateName === "blocked"
              ? icons.lock
              : "";
    const progress =
      a === "cooling"
        ? Math.min(state.coolingFlow, state.feedFlow)
        : a === "primary"
          ? state.primaryFlow
          : a === "heat"
            ? Math.max(0, (secondaryT(state) - 20) / 255)
            : a === "steam"
              ? Math.min(1, rpm(state) / 400)
              : r.electric > 1
                ? 1
                : 0;
    (
      b.querySelector(".progress circle") as SVGCircleElement
    ).style.strokeDasharray = `${progress * 138.23} 138.23`;
  }
  if (next !== lastNext) {
    lastNext = next;
    blocked = undefined;
    announce(
      next
        ? `${L("Next", "Suite")} : ${tr(labels[next], lang)}`
        : L(
            "Electrical power is being produced. Every circuit remains adjustable.",
            "La centrale produit de l’électricité. Chaque circuit reste réglable.",
          ),
    );
  }
  $("trip").hidden = !state.trip && !state.outsideModel;
  if (state.trip !== lastTrip) {
    lastTrip = state.trip;
    if (state.trip) announce(translateBlock(state.trip, lang));
  }
  const balance = document.getElementById("balance");
  if (balance) balance.textContent = balanceError(state).toExponential(2);
  if (dialog.open) {
    const equipment = focused?.equipment;
    const temp =
      equipment === "steam"
        ? secondaryT(state)
        : ["condenser", "cooling", "feed"].includes(equipment ?? "")
          ? state.condenserT
          : state.primaryT;
    $("measurements").textContent =
      equipment === "pressurizer"
        ? L("Imposed pressure: 155 bar", "Pression imposée : 155 bar")
        : equipment === "generator" || equipment === "turbine"
          ? `${Math.round(rpm(state))} rpm · ${r.electric.toFixed(1)} MW`
          : `${equipment === "steam" ? L("Secondary mean", "Moyenne secondaire") : ["condenser", "cooling", "feed"].includes(equipment ?? "") ? L("Condenser mean", "Moyenne condenseur") : L("Primary mean", "Moyenne primaire")} : ${temp.toFixed(1)} °C · ${L("Core heat", "Chaleur du cœur")} : ${r.heat.toFixed(0)} MW`;
    $("rearm").hidden = !state.trip;
    if (state.trip) $("reason").textContent = translateBlock(state.trip, lang);
  }
}
function clickSound() {
  if (!audio || !sound) return;
  const oscillator = audio.createOscillator(),
    gain = audio.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(170, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    55,
    audio.currentTime + 0.035,
  );
  gain.gain.setValueAtTime(0.04, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.045);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.05);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}
$("sound").onclick = async () => {
  sound = !sound;
  if (sound && !audio) {
    audio = new AudioContext();
    motor = audio.createOscillator();
    hum = audio.createGain();
    motor.type = "sine";
    hum.gain.value = 0;
    motor.connect(hum).connect(audio.destination);
    motor.start();
  }
  if (sound) await audio?.resume();
  $("sound").setAttribute("aria-pressed", String(sound));
  $("sound").innerHTML = sound ? icons.sound : icons.muted;
};
try {
  scene = new MachineScene($("scene"));
  scene.onAction = act;
  scene.onDrill = drill;
  scene.onProject = project;
  scene.syncControls(controls);
} catch (error) {
  $("scene").innerHTML =
    `<p class="render-error">${L("3D unavailable. Enable WebGL or try another browser. Controls remain in ⓘ.", "3D indisponible. Activer WebGL ou essayer un autre navigateur. Les commandes restent disponibles dans ⓘ.")}</p>`;
  console.error(error);
}
localize();
project();
document.addEventListener("keydown", (e) => {
  if (
    dialog.open ||
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLSelectElement
  )
    return;
  if (e.code === "Space" && !(e.target instanceof HTMLButtonElement)) {
    e.preventDefault();
    paused = !paused;
    updateUI();
  }
  if (e.key === "Escape" && focused) {
    e.preventDefault();
    drill(focused.parent?.id);
  }
  if (e.target === $("experience") || e.target === scene?.renderer.domElement) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      scene?.rotate(-Math.PI / 12);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scene?.rotate(Math.PI / 12);
    }
    if (e.key === "+") scene?.zoom(0.9);
    if (e.key === "-") scene?.zoom(1.1);
  }
});
let previous = performance.now(),
  uiTime = 0,
  hidden = document.hidden;
document.addEventListener("visibilitychange", () => {
  hidden = document.hidden;
  previous = performance.now();
  if (hidden && hum && audio)
    hum.gain.setTargetAtTime(0, audio.currentTime, 0.05);
});
function frame(now: number) {
  const elapsed = Math.min(0.25, (now - previous) / 1000);
  previous = now;
  const dt = paused || hidden ? 0 : elapsed * (slow ? 0.25 : 1);
  if (dt > 0) state = advance(state, controls, dt);
  if (state.outsideModel && !paused) {
    paused = true;
    announce(
      L(
        "Model limit reached. Restore circulation using the controls in information.",
        "Limite du modèle atteinte. Rétablir la circulation dans les commandes du panneau d’information.",
      ),
    );
  }
  scene?.update(state, controls, dt, now);
  uiTime += elapsed;
  if (uiTime > 0.15) {
    updateUI();
    uiTime = 0;
  }
  if (audio && hum && motor) {
    const activity =
      (state.primaryFlow + state.coolingFlow + state.feedFlow) / 3;
    hum.gain.setTargetAtTime(
      sound && !paused && !hidden
        ? Math.min(0.024, activity * 0.016 + rpm(state) / 200000)
        : 0,
      audio.currentTime,
      0.12,
    );
    motor.frequency.setTargetAtTime(
      42 + rpm(state) / 80,
      audio.currentTime,
      0.15,
    );
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
