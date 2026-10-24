import "./style.css";
import "@fontsource-variable/dm-sans/wght.css";
import { PlantScene } from "./scene";
import { equipment, lessons, type EquipmentId } from "./content";
import {
  advance,
  initialControls,
  operatingExample,
  initialState,
  rates,
  rpm,
  secondaryT,
  steamEnergy,
  heatBlock,
  steamBlock,
  rearm,
  balanceError,
} from "./physics";
import { roots, parts, tr, ancestry, type Lang, type Part } from "./parts";
import {
  lessonCopy,
  translateBlock,
  connectionLabels,
  modelHTML,
} from "./ui-copy";

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let lang: Lang = "en";
try {
  lang = localStorage.getItem("rep-language") === "fr" ? "fr" : "en";
} catch {}
const L = (en: string, fr: string) => (lang === "en" ? en : fr);
const fmt = (n: number, d = 0) =>
  n.toLocaleString(lang === "en" ? "en-GB" : "fr-FR", {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
const example = operatingExample();
let guidedStarted = false;
let state = example.state,
  controls = example.controls,
  selected: EquipmentId = "reactor";
let mode: "guided" | "free" = "free",
  step = 0,
  paused = false,
  speed = 1,
  acted = false,
  completed = false,
  focused: Part | undefined;
let scene: PlantScene | undefined,
  renderElapsed = 0;
let rearmNeedsAction = false;
let inspectorOpen = false;
const host = document.createElement("div");
host.id = "scene";
host.className = "scene";
const icon = (p: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const cube = icon(
  '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z M4 7.5l8 4.5 8-4.5 M12 12v9"/>',
);
const play = icon('<path d="m8 5 11 7-11 7V5Z"/>'),
  pause = icon('<path d="M8 5v14M16 5v14"/>');
const current = () => focused ?? parts.get(selected)!;
function mount() {
  document.documentElement.lang = lang;
  document.title = L(
    "REP · Pressurized water reactor",
    "REP · Réacteur à eau pressurisée",
  );
  $("app").innerHTML =
    `<a class="skip" href="#inspector">${L("Skip to controls", "Aller aux commandes")}</a>
 <header><a class="brand" href="./" aria-label="REP">REP</a><h1 class="sr-only">${L("Pressurized water reactor", "Réacteur à eau pressurisée")}</h1>
 <div class="header-controls"><button id="info-toggle" aria-controls="inspector" aria-expanded="${inspectorOpen}">${L("Details", "Détails")}</button><label class="sr-only" for="mode">${L("Mode", "Mode")}</label><select id="mode"><option value="guided">${L("Cold start", "Démarrage à froid")}</option><option value="free">${L("Explore", "Explorer")}</option></select><button id="model-open">${L("Model", "Modèle")}</button><label class="sr-only" for="language">${L("Language", "Langue")}</label><select id="language" aria-label="Language / Langue"><option value="en">EN</option><option value="fr">FR</option></select></div></header>
 <main data-mode="${mode}"><section class="workspace" aria-label="${L("Interactive technical drawing", "Dessin technique interactif")}"><div class="drawing-top"><nav id="breadcrumbs" aria-label="${L("Exploration path", "Chemin d’exploration")}"></nav><div class="view-options"><button id="transparent" aria-pressed="${scene?.transparent ?? true}">${L("Cutaway", "Coupe")}</button><button id="explode" aria-pressed="${scene?.exploded ?? false}">${L("Explode", "Éclater")}</button><button id="labels" aria-pressed="${scene?.showLabels ?? false}">${L("Labels", "Repères")}</button></div></div>
 <div id="scene-slot"></div><div class="navigation"><div class="component-navigation"><div class="component-head"><label class="sr-only" for="equipment-picker">${L("Equipment", "Équipement")}</label><select id="equipment-picker">${roots.map((p) => `<option value="${p.id}">${tr(p.name, lang)}</option>`).join("")}</select></div><button id="level-up" class="level-up"></button><p id="part-path" hidden></p><h2 id="equipment-title"></h2><button id="open-component" class="open-component"></button><div id="children"></div><p id="leaf-note" hidden></p></div><section id="lesson"><div class="lesson-number"><span id="step-count"></span><button id="skip-guide">${L("Explore freely", "Explorer librement")} ↗</button></div><h2 id="lesson-title"></h2><p id="lesson-copy"></p><button id="lesson-action" class="primary-action"></button><p id="observation" role="status"></p><button id="next-step" hidden></button></section></div><div class="drawing-bottom"><span id="drawing-caption"></span><div class="camera-tools"><button id="rotate-left" aria-label="${L("Rotate left", "Tourner à gauche")}">↶</button><button id="rotate-right" aria-label="${L("Rotate right", "Tourner à droite")}">↷</button><button id="zoom-out" aria-label="${L("Zoom out", "Réduire le zoom")}">−</button><button id="zoom-in" aria-label="${L("Zoom in", "Augmenter le zoom")}">+</button><button id="camera-reset" aria-label="${L("Reset view", "Rétablir la vue")}">${cube}</button></div></div>
 <details class="measurements"><summary>${L("Measurements", "Mesures")}</summary><div class="telemetry" aria-label="${L("Plant measurements", "Mesures de la centrale")}"><div><span>${L("Core heat", "Chaleur du cœur")}</span><strong id="heat"></strong></div><div><span>${L("Primary water", "Eau primaire")}</span><strong id="primary-temp"></strong></div><div><span>${L("Secondary water", "Eau secondaire")}</span><strong id="secondary-temp"></strong></div><div><span>${L("Electrical output", "Production électrique")}</span><strong id="electric"></strong></div></div>
 </details><div class="playback"><button id="pause"></button><label class="sr-only" for="speed">${L("Playback speed", "Vitesse de lecture")}</label><select id="speed"><option value="0.25">× 0.25</option><option value="0.5">× 0.5</option><option value="1">× 1</option><option value="3">× 3</option></select><span id="clock"></span><span id="plant-state"></span></div></section>
 <aside id="inspector" tabindex="-1" ${inspectorOpen ? "" : "hidden"}><button id="info-close" aria-label="${L("Close details", "Fermer les détails")}">×</button>
 <section id="component"><h2 id="info-title"></h2><p id="equipment-role"></p><div id="controls"></div><p id="blockage" role="status"></p><button id="rearm" hidden></button><details id="live-values"><summary>${L("Live values", "Valeurs calculées")}</summary><div id="equipment-data"></div><p id="local-limit"></p></details><details id="connections-detail"><summary>${L("Connections", "Connexions")}</summary><div id="connections"></div></details></section>
 <div class="aside-foot"><button id="restart" title="${L("Restart the experiment", "Recommencer l’expérience")}">${L("Restart", "Recommencer")}</button><span>${L("Schematic · reduced thermal inertia", "Schéma · inerties thermiques réduites")}</span><a href="https://github.com/kennethassogba/rep" target="_blank" rel="noreferrer">${L("Source", "Code")} ↗</a></div></aside></main>
 <dialog id="model-dialog" aria-labelledby="model-title"><button id="model-close" class="dialog-close" aria-label="${L("Close", "Fermer")}">×</button>${modelHTML(lang)}</dialog>
 <dialog id="reset-dialog" aria-labelledby="reset-title"><h2 id="reset-title">${L("Restart the experiment?", "Recommencer l’expérience ?")}</h2><p>${L("Water returns to 20 °C, pumps stop and guided progress resets.", "L’eau revient à 20 °C, les pompes s’arrêtent et la progression est remise à zéro.")}</p><div class="dialog-actions"><button id="reset-cancel">${L("Keep exploring", "Continuer")}</button><button id="reset-confirm" class="primary-action">${L("Restart", "Recommencer")}</button></div></dialog>`;
  $("scene-slot").replaceWith(host);
  $<HTMLSelectElement>("mode").value = mode;
  $<HTMLSelectElement>("language").value = lang;
  $<HTMLSelectElement>("speed").value = String(speed);
  $("language").onchange = (e) => {
    lang = (e.target as HTMLSelectElement).value as Lang;
    try {
      localStorage.setItem("rep-language", lang);
    } catch {}
    mount();
    $("language").focus({ preventScroll: true });
  };
  $("mode").onchange = (e) =>
    setMode((e.target as HTMLSelectElement).value as "guided" | "free");
  document.querySelector<HTMLAnchorElement>(".skip")!.onclick = (e) => {
    e.preventDefault();
    setInspector(true);
  };
  $("info-toggle").onclick = () => setInspector(!inspectorOpen);
  $("info-close").onclick = () => setInspector(false);
  $("level-up").onclick = () => drill(focused?.parent?.id);
  $("skip-guide").onclick = () => setMode("free");
  $("equipment-picker").onchange = (e) => {
    drill((e.target as HTMLSelectElement).value);
  };
  $("lesson-action").onclick = () => {
    if (step === 0) {
      controls.cooling = 1;
      controls.feed = 1;
    }
    if (step === 1) controls.primary = 1;
    if (step === 2) controls.power = 0.65;
    if (step === 3) controls.valve = 0.7;
    if (step === 4) controls.generator = true;
    acted = true;
    completed = false;
    setPaused(false);
    select(lessons[step].equipment);
    renderLesson();
  };
  $("next-step").onclick = () => {
    if (step === 4) {
      setMode("free");
      return;
    }
    step++;
    acted = false;
    completed = false;
    select(lessons[step].equipment);
    renderLesson();
  };
  $("open-component").onclick = () => drill(selected);
  $("pause").onclick = () => setPaused(!paused);
  $("speed").onchange = (e) =>
    (speed = Number((e.target as HTMLSelectElement).value));
  $("rearm").onclick = () => {
    rearmNeedsAction = !rearm(state, controls);
    updateNumbers();
  };
  const dialog = $<HTMLDialogElement>("model-dialog");
  $("model-open").onclick = () => dialog.showModal();
  $("model-close").onclick = () => dialog.close();
  const rd = $<HTMLDialogElement>("reset-dialog");
  $("restart").onclick = () => rd.showModal();
  $("reset-cancel").onclick = () => rd.close();
  $("reset-confirm").onclick = () => {
    state = initialState();
    controls = initialControls();
    step = 0;
    acted = false;
    completed = false;
    mode = "guided";
    guidedStarted = true;
    speed = 1;
    focused = undefined;
    selected = "reactor";
    scene?.setDetail();
    setPaused(true);
    rd.close();
    mount();
  };
  if (!scene) {
    try {
      scene = new PlantScene(host, select);
      scene.onDrill = (id) => drill(id);
    } catch (error) {
      host.innerHTML = `<p class="render-error">${L("3D is unavailable. Enable WebGL or try another browser. The experiment and component tree still work.", "La 3D est indisponible. Activez WebGL ou essayez un autre navigateur. L’expérience et l’arborescence restent utilisables.")}</p>`;
      console.warn("WebGL unavailable", error);
    }
  }
  if (scene) {
    scene.setLanguage(lang);
    scene.setDetail(focused, true);
    scene.highlight(selected);
    scene.update(state, controls, 0);
  }
  for (const id of [
    "transparent",
    "explode",
    "labels",
    "rotate-left",
    "rotate-right",
    "zoom-in",
    "zoom-out",
    "camera-reset",
  ])
    $<HTMLButtonElement>(id).disabled = !scene;
  $("transparent").onclick = () => {
    scene!.setTransparency(!scene!.transparent);
    $("transparent").setAttribute("aria-pressed", String(scene!.transparent));
  };
  $("explode").onclick = () => {
    scene!.setExploded(!scene!.exploded);
    $("explode").setAttribute("aria-pressed", String(scene!.exploded));
  };
  $("labels").onclick = () => {
    scene!.showLabels = !scene!.showLabels;
    $("labels").setAttribute("aria-pressed", String(scene!.showLabels));
    scene!.render();
  };
  $("rotate-left").onclick = () => scene!.rotate(-Math.PI / 6);
  $("rotate-right").onclick = () => scene!.rotate(Math.PI / 6);
  $("zoom-in").onclick = () => scene!.zoom(1.15);
  $("zoom-out").onclick = () => scene!.zoom(1 / 1.15);
  $("camera-reset").onclick = () => {
    scene!.reset();
  };
  renderLesson();
  renderEquipment();
  renderCrumbs();
  setPaused(paused);
}
function setInspector(open: boolean) {
  inspectorOpen = open;
  if (open)
    document.querySelector<HTMLDetailsElement>(".measurements")!.open = false;
  $("inspector").hidden = !open;
  $("info-toggle").setAttribute("aria-expanded", String(open));
  if (open) $("info-close").focus({ preventScroll: true });
  else $("info-toggle").focus({ preventScroll: true });
}
function select(id: EquipmentId) {
  selected = id;
  scene?.highlight(id);
  if (focused) {
    focused = parts.get(id);
    scene?.setDetail(focused);
  }
  renderEquipment();
  renderCrumbs();
}
function drill(id?: string) {
  if (mode === "guided") setMode("free");
  focused = id ? parts.get(id) : undefined;
  if (focused) selected = focused.equipment as EquipmentId;
  scene?.setDetail(focused);
  scene?.highlight(selected);
  renderEquipment();
  renderCrumbs();
  if (focused) $("equipment-title").focus({ preventScroll: true });
  else $("equipment-picker").focus({ preventScroll: true });
}
function renderCrumbs() {
  const trail = focused ? ancestry(focused) : [];
  $("breadcrumbs").innerHTML =
    `<button data-path="" ${!focused ? 'aria-current="location"' : ""}>${L("Plant", "Centrale")}</button>${trail.map((p, i) => `<span aria-hidden="true">/</span><button data-path="${p.id}" ${i === trail.length - 1 ? 'aria-current="location"' : ""}>${tr(p.name, lang)}</button>`).join("")}`;
  $("breadcrumbs")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach((b) => (b.onclick = () => drill(b.dataset.path || undefined)));
  $("drawing-caption").innerHTML = focused
    ? L("Schematic routes · equipment mean values", "Trajets schématiques · moyennes de l’équipement")
    : `<span class="legend"><i class="hot"></i>${L("Primary", "Primaire")}<i class="steam"></i>${L("Secondary", "Secondaire")}<i class="cold"></i>${L("Cooling", "Refroidissement")}</span>`;
}
function renderEquipment() {
  const p = current();
  $<HTMLSelectElement>("equipment-picker").value = selected;
  document.querySelector<HTMLElement>(".component-head")!.hidden = !!focused;
  $("equipment-title").hidden = !focused;
  $("equipment-title").textContent = tr(p.name, lang);
  $("info-title").textContent = tr(p.name, lang);
  $("level-up").hidden = !focused;
  $("level-up").textContent =
    "← " +
    (focused?.parent ? tr(focused.parent.name, lang) : L("Plant", "Centrale"));
  $("level-up").setAttribute(
    "aria-label",
    L("Back to ", "Revenir à ") +
      (focused?.parent
        ? tr(focused.parent.name, lang)
        : L("plant", "la centrale")),
  );
  $("equipment-title").setAttribute("tabindex", "-1");
  $("part-path").textContent = focused
    ? `${L("Level", "Niveau")} ${ancestry(p).length} / ${tr(parts.get(selected)!.name, lang)}`
    : "";
  $("equipment-role").textContent = tr(p.role, lang);
  $("open-component").hidden = !!focused;
  $("open-component").textContent = L("Enter", "Entrer") + " →";
  $("children").innerHTML =
    focused && p.children.length
      ? `${p.children.map((c, i) => `<button data-child="${c.id}"><span class="part-number">${String(i + 1).padStart(2, "0")}</span><span>${tr(c.name, lang)}</span><span aria-hidden="true">→</span></button>`).join("")}`
      : "";
  $("children")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach((b) => {
      b.onclick = () => drill(b.dataset.child);
      b.onpointerenter = () => scene?.previewPart(b.dataset.child);
      b.onpointerleave = () => scene?.previewPart();
      b.onfocus = () => scene?.previewPart(b.dataset.child);
      b.onblur = () => scene?.previewPart();
    });
  $("leaf-note").hidden = true;
  $("leaf-note").textContent = L(
    "Finest illustrated level. Use the path above to return to the assembly.",
    "Dernier niveau illustré. Utilisez le chemin en haut pour remonter au sous-ensemble.",
  );
  const slider = (
    key: "power" | "primary" | "cooling" | "feed" | "valve",
    name: string,
  ) =>
    `<label class="range-label" for="control-${key}">${name}<output id="value-${key}">${fmt(controls[key] * 100)}%</output></label><input id="control-${key}" data-control="${key}" type="range" min="0" max="100" step="5" value="${controls[key] * 100}" aria-describedby="blockage">`;
  let html = "";
  if (mode === "free") {
    if (selected === "reactor")
      html = slider("power", L("Core heat demand", "Consigne de chaleur"));
    if (selected === "primary")
      html = slider("primary", L("Primary pump", "Pompe primaire"));
    if (selected === "cooling" || selected === "condenser")
      html = slider("cooling", L("Cooling pump", "Pompe de refroidissement"));
    if (selected === "feed")
      html = slider("feed", L("Feed pump", "Pompe alimentaire"));
    if (selected === "turbine" || selected === "steam")
      html = slider("valve", L("Steam admission", "Admission de vapeur"));
    if (selected === "generator")
      html = `<button id="generator-toggle" aria-pressed="${controls.generator}">${controls.generator ? L("Disconnect load", "Déconnecter la charge") : L("Connect load", "Connecter la charge")}</button>`;
  }
  $("controls").innerHTML = html;
  $("controls")
    .querySelectorAll<HTMLInputElement>("input")
    .forEach(
      (i) =>
        (i.oninput = () => {
          const key = i.dataset.control as
            | "power"
            | "primary"
            | "cooling"
            | "feed"
            | "valve";
          controls[key] = Number(i.value) / 100;
          $(`value-${key}`).textContent = `${i.value}%`;
          updateNumbers();
        }),
    );
  if ($("generator-toggle"))
    $("generator-toggle").onclick = () => {
      controls.generator = !controls.generator;
      renderEquipment();
    };
  $("connections").innerHTML = equipment[selected].connections
    .map(
      ([id, label]) =>
        `<button data-connect="${id}"><span>${lang === "en" ? connectionLabels[label] : label}</span><strong>${tr(parts.get(id)!.name, lang)} ↗</strong></button>`,
    )
    .join("");
  $("connections")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.connect as EquipmentId;
          selected = id;
          focused = undefined;
          scene?.setDetail();
          select(id);
        }),
    );
  $("connections-detail").hidden = !!focused?.parent;
  $("local-limit").textContent = focused?.parent
    ? L(
        "Equipment-level values. Local temperatures and stresses are not resolved.",
        "Valeurs de l’équipement parent. Les températures et contraintes locales ne sont pas résolues.",
      )
    : L(
        "Mean values from the simplified model.",
        "Valeurs moyennes du modèle simplifié.",
      );
  $("rearm").textContent = L("Reset teaching trip", "Réarmer le modèle");
  updateNumbers();
}
function setMode(m: "guided" | "free") {
  mode = m;
  if (m === "guided") {
    if (!guidedStarted) {
      state = initialState(); controls = initialControls(); guidedStarted = true;
      setPaused(true); scene?.update(state, controls, 0);
    }
    focused = undefined;
    selected = lessons[step].equipment;
    scene?.setDetail();
    scene?.highlight(selected);
    renderCrumbs();
  }
  document.querySelector("main")!.setAttribute("data-mode", m);
  $<HTMLSelectElement>("mode").value = m;
  renderLesson();
  renderEquipment();
}
function renderLesson() {
  $("lesson").hidden = mode === "free";
  const l = lessonCopy(lang, step);
  $("step-count").textContent = `${String(step + 1).padStart(2, "0")} / 05`;
  $("lesson-title").textContent = l.title;
  $("lesson-copy").textContent = l.explain;
  $("lesson-action").textContent = l.action;
  $("lesson-action").hidden = acted;
  $("next-step").hidden = !completed;
  $("next-step").textContent =
    (step === 4
      ? L("Explore the plant", "Explorer la centrale")
      : L("Next step", "Étape suivante")) + " →";
  updateObservation();
}
function updateObservation() {
  let msg = "";
  if (acted && completed) msg = lessonCopy(lang, step).observe;
  else if (acted && paused)
    msg = L(
      "Paused. Resume to observe the response.",
      "En pause. Reprenez pour observer la réponse.",
    );
  else if (acted) {
    if (state.trip) msg = translateBlock(state.trip, lang);
    else if (step < 2)
      msg = L(
        "Flow is building up. Follow the direction arrows.",
        "Le débit s’établit. Suivez les flèches de circulation.",
      );
    else if (step === 2)
      msg = `${L("Secondary water", "Eau secondaire")} · ${fmt(secondaryT(state))} / 275 °C`;
    else if (step === 3)
      msg =
        translateBlock(steamBlock(state), lang) ||
        `${L("Shaft speed", "Vitesse de l’arbre")} · ${fmt(rpm(state))} ${L("rpm", "tr/min")}`;
    else
      msg = `${fmt(rates(state, controls).electric)} MW ${L("electrical", "électriques")}`;
  }
  $("observation").hidden = !msg;
  if ($("observation").textContent !== msg) $("observation").textContent = msg;
}
function setPaused(value: boolean) {
  paused = value;
  renderElapsed = 0;
  $("pause").innerHTML =
    `${paused ? play : pause}<span>${paused ? L("Run", "Reprendre") : L("Pause", "Pause")}</span>`;
  $("pause").setAttribute(
    "aria-label",
    paused
      ? L("Run simulation", "Reprendre la simulation")
      : L("Pause simulation", "Mettre la simulation en pause"),
  );
  updateObservation();
  updateNumbers();
}
function updateNumbers() {
  const r = rates(state, controls);
  $("heat").innerHTML = `${fmt(r.heat)} <small>MW</small>`;
  $("primary-temp").innerHTML = `${fmt(state.primaryT)} <small>°C</small>`;
  $("secondary-temp").innerHTML = `${fmt(secondaryT(state))} <small>°C</small>`;
  $("electric").innerHTML = `${fmt(r.electric)} <small>MW</small>`;
  $("clock").textContent = `${fmt(state.time)} ${L("model s", "s modèle")}`;
  $("plant-state").textContent = state.trip
    ? L("Teaching trip", "Arrêt pédagogique")
    : paused
      ? L("Paused", "En pause")
      : r.electric > 1
        ? L("Generating", "Production")
        : r.heat > 1
          ? L("Heating", "En chauffe")
          : state.primaryFlow > 0.1 || state.coolingFlow > 0.1
            ? L("Circulating", "En circulation")
            : L("Stopped", "À l’arrêt");
  let data: [string, string][] = [];
  switch (selected) {
    case "reactor":
      data = [
        [L("Core heat", "Chaleur du cœur"), `${fmt(r.heat)} MW`],
        [L("Residual heat", "Chaleur résiduelle"), `${fmt(r.decay, 1)} MW`],
      ];
      break;
    case "pressurizer":
      data = [
        [L("Imposed pressure", "Pression imposée"), "155 bar"],
        [L("Primary mean", "Moyenne primaire"), `${fmt(state.primaryT)} °C`],
      ];
      break;
    case "primary":
      data = [
        [L("Primary flow", "Débit primaire"), `${fmt(r.primaryMass)} kg/s`],
        [L("Heat transfer", "Chaleur transférée"), `${fmt(r.exchange)} MW`],
      ];
      break;
    case "steam":
      data = [
        [
          L("Secondary water", "Eau secondaire"),
          `${fmt(secondaryT(state))} °C`,
        ],
        [
          L("Latent reserve", "Réserve latente"),
          `${fmt(steamEnergy(state))} MJ`,
        ],
      ];
      break;
    case "turbine":
      data = [
        [
          L("Shaft speed", "Vitesse de l’arbre"),
          `${fmt(rpm(state))} ${L("rpm", "tr/min")}`,
        ],
        [L("Steam flow", "Débit vapeur"), `${fmt(r.steamMass)} kg/s`],
      ];
      break;
    case "generator":
      data = [
        [L("Gross output", "Production brute"), `${fmt(r.electric)} MW`],
        [
          L("Load", "Charge"),
          controls.generator
            ? L("Connected", "Connectée")
            : L("Disconnected", "Déconnectée"),
        ],
      ];
      break;
    case "condenser":
      data = [
        [L("Temperature", "Température"), `${fmt(state.condenserT, 1)} °C`],
        [
          L("Heat to reject", "Chaleur à évacuer"),
          `${fmt(r.admitted - r.mechanical)} MW`,
        ],
      ];
      break;
    case "feed":
      data = [
        [L("Water return", "Retour d’eau"), `${fmt(r.steamMass)} kg/s`],
        [
          L("Pump", "Pompe"),
          state.feedFlow > 0.25
            ? L("Running", "En marche")
            : L("Stopped", "Arrêtée"),
        ],
      ];
      break;
    case "cooling":
      data = [
        [L("Heat rejected", "Chaleur évacuée"), `${fmt(r.rejected)} MW`],
        [L("Cooling flow", "Débit froid"), `${fmt(r.coolingMass)} kg/s`],
      ];
      break;
  }
  $("equipment-data").innerHTML = data
    .map(([a, b]) => `<div><span>${a}</span><strong>${b}</strong></div>`)
    .join("");
  let block = state.outsideModel
    ? L(
        "Model boundary: 340 °C. Primary boiling is not simulated. Restore the primary pump to 100%, keep cooling on, then resume. The trip remains latched until you reset it.",
        "Limite du modèle : 340 °C. L’ébullition primaire n’est pas simulée. Rétablissez la pompe primaire à 100 %, gardez le refroidissement, puis reprenez. L’arrêt reste verrouillé jusqu’au réarmement.",
      )
    : state.trip;
  if (!block && selected === "reactor") block = heatBlock(state);
  if (!block && (selected === "turbine" || selected === "steam"))
    block = steamBlock(state);
  if (!block && selected === "generator" && rpm(state) < 1)
    block = L(
      "The shaft is stationary. Generate steam, then open turbine admission.",
      "L’arbre est immobile. Produisez de la vapeur, puis ouvrez l’admission.",
    );
  if (
    !block &&
    selected === "feed" &&
    state.feedFlow > 0.25 &&
    r.steamMass < 0.1
  )
    block = L(
      "The pump is ready. Water return begins with steam admission.",
      "La pompe est prête. Le retour commence avec l’admission de vapeur.",
    );
  const translated =
    rearmNeedsAction && state.trip && !state.outsideModel
      ? L(
          "Set heat to 0%, restore all three pumps and wait for primary temperature below 310 °C.",
          "Consigne à 0 %, trois pompes en marche, primaire sous 310 °C.",
        )
      : translateBlock(block, lang);
  if ($("blockage").textContent !== translated)
    $("blockage").textContent = translated;
  $("blockage").hidden = !block || (mode === "guided" && !state.outsideModel);
  $("rearm").hidden = !state.trip || mode !== "free";
  if ($("balance"))
    $("balance").textContent = balanceError(state).toExponential(2);
}
mount();
let previous = performance.now(),
  uiElapsed = 0,
  obsElapsed = 0;
let pageWasHidden = false;
document.addEventListener("visibilitychange", () => {
  previous = performance.now();
  pageWasHidden = document.hidden;
});
document.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]")) return;
  const target = e.target as HTMLElement;
  if (e.key === "Escape" && !target.matches("select")) {
    if (inspectorOpen) {
      setInspector(false);
      return;
    }
    const measurements =
      document.querySelector<HTMLDetailsElement>(".measurements");
    if (measurements?.open) {
      measurements.open = false;
      return;
    }
    if (focused) {
      drill(focused.parent?.id);
      return;
    }
  }
  if (target.matches("input,select,textarea,button,summary")) return;
  if (e.code === "Space") {
    e.preventDefault();
    setPaused(!paused);
  }
});
function frame(now: number) {
  scene?.animateNavigation(now);
  const elapsed = Math.min((now - previous) / 1000, 1);
  previous = now;
  const dt = paused || document.hidden || pageWasHidden ? 0 : elapsed * speed;
  const previousModelTime = state.time;
  if (dt > 0) state = advance(state, controls, dt);
  renderElapsed += state.time - previousModelTime;
  if (renderElapsed >= 1 / 30) {
    scene?.update(state, controls, renderElapsed);
    renderElapsed = 0;
  }
  if (state.outsideModel && !paused) {
    setPaused(true);
    setInspector(true);
  }
  if (mode === "guided" && acted && !completed && lessons[step].ready(state)) {
    completed = true;
    renderLesson();
  }
  uiElapsed += elapsed;
  obsElapsed += elapsed;
  if (uiElapsed > 0.25) {
    updateNumbers();
    uiElapsed = 0;
  }
  if (obsElapsed > 3) {
    updateObservation();
    obsElapsed = 0;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
