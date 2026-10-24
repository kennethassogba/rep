import { symbols } from "./symbols";
import "./style.css";
import "@fontsource-variable/dm-sans/wght.css";
import { MobileScene } from "./mobile-scene";
import {
  controls,
  frameDelta,
  dragSetting,
  freshInputs,
  freshGame,
  setInput,
  step,
  Director,
  lines,
  type Control,
  type Event,
} from "./arcade";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let lang: "en" | "fr" = "en";
try {
  lang = localStorage.getItem("rep-language") === "fr" ? "fr" : "en";
} catch {}
const L = (en: string, fr: string) => (lang === "en" ? en : fr);
const names: Record<Control, readonly [string, string]> = {
  water: ["Water", "Eau"],
  heat: ["Heat", "Chauffe"],
  steam: ["Steam", "Vapeur"],
  grid: ["Élysée", "Élysée"],
};
const svg = (p: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const icons = {
  pause: svg('<path d="M8 5v14M16 5v14"/>'),
  play: svg('<path d="m8 4 12 8-12 8Z"/>'),
  reset: svg('<path d="M4 7v5h5M4 12a8 8 0 1 1 2 6"/>'),
  home: svg('<path d="m3 11 9-8 9 8M6 9v12h12V9M10 21v-7h4v7"/>'),
  sound: svg('<path d="m11 4-5 4H3v8h3l5 4ZM16 8a6 6 0 0 1 0 8"/>'),
  mute: svg('<path d="m11 4-5 4H3v8h3l5 4ZM16 9l5 6m0-6-5 6"/>'),
};
$("app").innerHTML =
  `<main id="game"><div id="world"></div><header><h1><button id="overview">REP</button></h1><output id="power" aria-label="Electrical output"><strong>0</strong><span>/100 MW</span></output><button id="language">EN</button></header><div id="handles" role="group" aria-label="Machine controls">${controls.map((key) => `<button id="${key}" class="handle ${key}" data-control="${key}" aria-pressed="false"><span class="fallback-icon" aria-hidden="true">${svg(`<path d="${symbols[key]}"/>`)}</span><output></output></button>`).join("")}</div><p id="speech"></p><div id="event-name" class="sr-only" role="status"></div><footer><button id="pause">${icons.pause}</button><button id="slow" aria-pressed="false">¼×</button><button id="back" hidden>${icons.home}</button><button id="sound" aria-pressed="false">${icons.mute}</button><button id="restart">${icons.reset}</button></footer><p id="error" hidden></p></main>`;
let inputs = freshInputs(),
  game = freshGame(),
  director = new Director(),
  paused = false,
  slow = false,
  sound = false;
let event: Event = "hello",
  eventEnd = 7,
  scene: MobileScene | undefined;
let audio: AudioContext | undefined;
function beep(bad = false) {
  if (!sound) return;
  audio ??= new AudioContext();
  void audio.resume();
  const osc = audio.createOscillator(),
    gain = audio.createGain();
  osc.type = bad ? "sawtooth" : "triangle";
  osc.frequency.setValueAtTime(bad ? 90 : 320, audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    bad ? 35 : 650,
    audio.currentTime + 0.13,
  );
  gain.gain.setValueAtTime(0.025, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 0.2);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
function speak(e: Event) {
  event = e;
  eventEnd = game.time + 5.5;
  scene?.react(e, lang);
  $("event-name").textContent =
    lines[e].stamp[lang === "en" ? 0 : 1] +
    " " +
    lines[e].text[lang === "en" ? 0 : 1];
  $("game").dataset.event = e;
  beep(["dry", "strike", "blackout"].includes(e));
}
function focus(key?: Control) {
  scene?.aim(key);
  $("back").hidden = !key;
}
function change(
  key: Control,
  value: number,
  finished = false,
  before = inputs[key],
) {
  setInput(inputs, key, value);
  paused = false;
  if (finished) {
    const reaction = director.command(key, before, game, inputs);
    if (reaction) {
      speak(reaction);
      $("back").hidden = true;
    } else beep();
    if ("vibrate" in navigator) navigator.vibrate?.(12);
  }
  sync();
}
function toggle(key: Control) {
  const before = inputs[key];
  focus(key);
  change(key, before > 0 ? 0 : key === "heat" ? 0.85 : 1, true, before);
}
function sync() {
  for (const key of controls) {
    const b = $(key),
      value = inputs[key];
    b.setAttribute(
      "aria-label",
      `${names[key][lang === "en" ? 0 : 1]}, ${Math.round(value * 100)}%`,
    );
    b.setAttribute("aria-pressed", String(value > 0));
    b.querySelector("output")!.textContent = `${Math.round(value * 100)}%`;
  }
  $("power").querySelector("strong")!.textContent = String(game.power);
  $("power").dataset.lit = String(game.power >= 100);
  const glyph = paused ? "play" : "pause";
  if ($("pause").dataset.glyph !== glyph) {
    $("pause").innerHTML = icons[glyph];
    $("pause").dataset.glyph = glyph;
  }
  $("pause").setAttribute(
    "aria-label",
    L(paused ? "Resume" : "Pause", paused ? "Reprendre" : "Pause"),
  );
  $("speech").textContent = lines[event].text[lang === "en" ? 0 : 1];
  $("speech").hidden = game.time > eventEnd;
}
function localize() {
  document.documentElement.lang = lang;
  document.title = L("REP - Light up the Élysée", "REP - Rallume l'Élysée");
  $("language").textContent = lang.toUpperCase();
  $("language").setAttribute(
    "aria-label",
    L("Passer en français", "Switch to English"),
  );
  $("overview").setAttribute(
    "aria-label",
    L("Whole machine", "Machine entière"),
  );
  $("power").setAttribute(
    "aria-label",
    L("Electrical output in megawatts", "Production électrique en mégawatts"),
  );
  $("handles").setAttribute(
    "aria-label",
    L("Machine controls", "Commandes de la machine"),
  );
  $("restart").setAttribute("aria-label", L("Restart", "Recommencer"));
  $("back").setAttribute("aria-label", L("Whole machine", "Machine entière"));
  $("slow").setAttribute("aria-label", L("Quarter speed", "Ralenti"));
  $("sound").setAttribute("aria-label", L("Sound", "Son"));
  sync();
}
for (const key of controls) {
  const button = $(key);
  let drag:
      | { id: number; x: number; y: number; start: number; moved: boolean }
      | undefined,
    suppress = false;
  button.onpointerdown = (e) => {
    if (e.button !== 0 || drag) return;
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      start: inputs[key],
      moved: false,
    };
    suppress = false;
    button.setPointerCapture(e.pointerId);
    button.dataset.dragging = "true";
    focus(key);
  };
  button.onpointermove = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x,
      dy = drag.y - e.clientY;
    if (Math.hypot(dx, dy) > 5) drag.moved = true;
    if (drag.moved) change(key, dragSetting(drag.start, key, dx, dy));
  };
  const end = (e: PointerEvent) => {
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag;
    drag = undefined;
    delete button.dataset.dragging;
    suppress = d.moved || e.type !== "pointerup";
    if (button.hasPointerCapture(e.pointerId))
      button.releasePointerCapture(e.pointerId);
    if (d.moved) change(key, inputs[key], true, d.start);
  };
  button.onpointerup = end;
  button.onpointercancel = end;
  button.onlostpointercapture = end;
  button.onclick = (e) => {
    if (e.detail === 0 || !suppress) toggle(key);
    suppress = false;
  };
  button.onkeydown = (e) => {
    const up = ["ArrowUp", "ArrowRight"].includes(e.key),
      down = ["ArrowDown", "ArrowLeft"].includes(e.key);
    if (!up && !down && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const before = inputs[key];
    focus(key);
    change(
      key,
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? 1
          : before + (up ? 1 : -1) * (key === "grid" ? 1 : 0.1),
      !e.repeat,
      before,
    );
  };
}
$("overview").onclick = $("back").onclick = () => {
  focus();
  $("overview").focus({ preventScroll: true });
};
$("world").onclick = () => focus();
$("pause").onclick = () => {
  paused = !paused;
  sync();
};
$("slow").onclick = () => {
  slow = !slow;
  $("slow").setAttribute("aria-pressed", String(slow));
};
$("sound").onclick = () => {
  sound = !sound;
  $("sound").setAttribute("aria-pressed", String(sound));
  $("sound").innerHTML = sound ? icons.sound : icons.mute;
  beep();
};
$("restart").onclick = () => {
  inputs = freshInputs();
  game = freshGame();
  director = new Director();
  paused = false;
  focus();
  speak("hello");
  sync();
};
$("language").onclick = () => {
  lang = lang === "en" ? "fr" : "en";
  try {
    localStorage.setItem("rep-language", lang);
  } catch {}
  localize();
  if (scene && game.time < eventEnd) scene.react(event, lang);
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    focus();
    $("overview").focus({ preventScroll: true });
  }
  if (e.code === "Space" && !(e.target instanceof HTMLButtonElement)) {
    e.preventDefault();
    paused = !paused;
    sync();
  }
});
try {
  scene = new MobileScene($("world"));
  scene.onProject = (points, speech) => {
    const boxes = [];
    for (const key of controls) {
      const b = $(key),
        p = points[key],
        smallLandscape = innerWidth / innerHeight > 1.4 && innerHeight < 500,
        scale = Math.max(0.78, Math.min(1, innerHeight / 780)),
        w = smallLandscape ? 56 : (key === "heat" ? 72 : 80) * scale,
        h = smallLandscape ? 56 : (key === "heat" ? 100 : 80) * scale;
      b.style.width = `${w}px`;
      b.style.height = `${h}px`;
      b.style.transform = `translate(${p.x - w / 2}px,${p.y - h / 2}px)`;
      b.hidden = !p.visible;
      b.tabIndex = p.visible ? 0 : -1;
      if (p.visible) boxes.push({ x: p.x - w / 2, y: p.y - h / 2, w, h });
    }
    const bubble = $("speech");
    if (bubble.hidden) return;
    const w = 212,
      h = bubble.offsetHeight || 50,
      screenW = innerWidth,
      screenH = innerHeight;
    let best = { x: 12, y: 75, score: Infinity };
    for (const dx of [-224, 20, -106])
      for (const dy of [-90, 30, -170, 90]) {
        const x = Math.max(12, Math.min(screenW - w - 12, speech.x + dx)),
          y = Math.max(74, Math.min(screenH - h - 74, speech.y + dy));
        const overlap = boxes.reduce(
          (sum, b) =>
            sum +
            Math.max(0, Math.min(x + w, b.x + b.w) - Math.max(x, b.x)) *
              Math.max(0, Math.min(y + h, b.y + b.h) - Math.max(y, b.y)),
          0,
        );
        const score =
          overlap * 20 + Math.hypot(x + w / 2 - speech.x, y + h / 2 - speech.y);
        if (score < best.score) best = { x, y, score };
      }
    bubble.style.transform = `translate(${best.x}px,${best.y}px)`;
  };
} catch (error) {
  $("game").classList.add("no-webgl");
  $("error").hidden = false;
  $("error").textContent = L(
    "3D unavailable. Reload the page.",
    "3D indisponible. Recharge la page.",
  );
  console.error(error);
}
localize();
let previous = performance.now(),
  uiElapsed = 0;
document.addEventListener("visibilitychange", () => {
  previous = performance.now();
});
function frame(now: number) {
  const wall = frameDelta(now, previous);
  previous = now;
  const dt = paused || document.hidden ? 0 : wall * (slow ? 0.25 : 1);
  const e = step(game, inputs, dt);
  if (e) {
    speak(e);
    $("back").hidden = true;
  }
  scene?.update(game, inputs, dt, wall);
  uiElapsed += wall;
  if (uiElapsed > 0.1) {
    sync();
    uiElapsed = 0;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
