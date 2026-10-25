import "./style.css";
import "@fontsource-variable/dm-sans/wght.css";
import { MobileScene } from "./mobile-scene";
import {
  missions,
  freshProgress,
  finishMission,
  connectedPipes,
  alignedRods,
  inFlightZone,
  syncNeedle,
  canConnect,
  frameDelta,
  type Language,
  type Pair,
} from "./missions";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let lang: Language = "en";
try {
  lang = localStorage.getItem("rep-language") === "fr" ? "fr" : "en";
} catch {}
const tr = (pair: Pair) => pair[lang === "en" ? 0 : 1];
const state = freshProgress();
try {
  state.completed = Math.max(
    0,
    Math.min(
      5,
      Math.floor(Number(localStorage.getItem("rep-missions-v1"))) || 0,
    ),
  );
} catch {}
let paused = false,
  slow = false,
  taskTime = 0,
  scene: MobileScene | undefined;
let pipeRotations = [0, 2, 1, 3],
  rods = [0, 0, 0],
  throttle = 20,
  flightHeld = 0,
  scanned = new Set<number>(),
  scanAt = -1,
  scanTime = 0;
let dialogue: Pair =
  state.completed === 5 ? missions[4].done : missions[state.completed].intro;
let speaker: "giscard" | "degaulle" =
  missions[Math.min(state.completed, 4)].president;
let notice: Pair | undefined;
const arrow =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 7 7-7 7"/></svg>';
$("app").innerHTML =
  `<main id="game"><header><h1>REP</h1><div id="progress" aria-label="Missions"></div><button id="language">EN</button></header><div id="world"></div><div id="objective"><span id="chapter"></span><h2 id="mission-title"></h2></div><button id="launch"><span></span>${arrow}</button><section id="task" aria-labelledby="task-title" hidden><div class="task-heading"><h2 id="task-title"></h2><button id="close" aria-label="Close">×</button></div><div id="task-body"></div><output id="task-status" role="status"></output></section><aside id="presidents"><img id="degaulle" src="/characters/degaulle.png" alt="Charles de Gaulle"><div id="dialogue"><strong id="speaker"></strong><p id="speech" aria-live="polite"></p></div><img id="giscard" src="/characters/giscard.png" alt="Valéry Giscard d'Estaing"></aside><footer><button id="pause"></button><button id="slow" aria-pressed="false">¼×</button><button id="restart"></button></footer><p id="render-error" hidden></p></main>`;
function say(text: Pair, who = speaker) {
  dialogue = text;
  speaker = who;
  renderDialogue();
}
function renderDialogue() {
  $("speaker").textContent = speaker === "giscard" ? "Giscard" : "De Gaulle";
  $("speech").textContent = tr(dialogue);
  $("presidents").dataset.speaker = speaker;
}
function sync() {
  document.documentElement.lang = lang;
  document.title = tr([
    "REP - Presidential power",
    "REP - Le courant présidentiel",
  ]);
  $("language").textContent = lang.toUpperCase();
  $("language").setAttribute(
    "aria-label",
    lang === "en" ? "Passer en français" : "Switch to English",
  );
  $("progress").innerHTML = missions
    .map(
      (m, i) =>
        `<span class="${i < state.completed ? "done" : i === state.completed ? "current" : ""}" aria-label="${tr(m.title)}${i < state.completed ? " ✓" : ""}">${i < state.completed ? "✓" : i + 1}</span>`,
    )
    .join("");
  $("chapter").textContent =
    state.completed === 5
      ? tr(["5 / 5 COMPLETE", "5 / 5 TERMINÉ"])
      : `${state.completed + 1} / 5`;
  $("mission-title").textContent =
    state.completed === 5
      ? tr(["The Élysée has power", "L'Élysée a du courant"])
      : tr(missions[state.completed].title);
  $("launch").querySelector("span")!.textContent =
    state.completed === 5
      ? tr(["Play again", "Rejouer"])
      : tr(
          state.completed === 0
            ? ["Start", "Commencer"]
            : ["Next mission", "Mission suivante"],
        );
  $("launch").hidden = state.playing;
  $("objective").hidden = state.playing;
  $("pause").textContent = paused ? tr(["Resume", "Reprendre"]) : "Pause";
  $("pause").setAttribute("aria-pressed", String(paused));
  $("slow").setAttribute("aria-label", tr(["Quarter speed", "Ralenti"]));
  $("restart").textContent = tr(["Restart", "Recommencer"]);
  $("close").setAttribute(
    "aria-label",
    tr(["Back to machine", "Retour à la machine"]),
  );
  $("game").dataset.paused = String(paused);
  $("task-body")
    .querySelectorAll<HTMLButtonElement | HTMLInputElement>("button,input")
    .forEach(
      (el) =>
        (el.disabled =
          paused ||
          (el.dataset.site !== undefined &&
            scanned.has(Number(el.dataset.site)))),
    );
  renderDialogue();
}
function reset() {
  state.completed = 0;
  state.playing = false;
  paused = false;
  try {
    localStorage.removeItem("rep-missions-v1");
  } catch {}
  $("task").hidden = true;
  say(missions[0].intro, "degaulle");
  sync();
}
function success() {
  const m = missions[state.completed];
  if (!finishMission(state, m.id)) return;
  try {
    localStorage.setItem("rep-missions-v1", String(state.completed));
  } catch {}
  $("task").hidden = true;
  say(m.done, m.president);
  sync();
  $("launch").focus({ preventScroll: true });
}
function status(text: Pair) {
  notice = text;
  $("task-status").textContent = tr(text);
}
function start() {
  if (state.completed === 5) {
    reset();
    return;
  }
  state.playing = true;
  paused = false;
  taskTime = 0;
  notice = undefined;
  pipeRotations = [0, 2, 1, 3];
  rods = [0, 0, 0];
  throttle = 20;
  flightHeld = 0;
  scanned = new Set();
  scanAt = -1;
  scanTime = 0;
  say(missions[state.completed].intro, missions[state.completed].president);
  renderTask();
  sync();
  $("close").focus({ preventScroll: true });
}
function pipeDescription(r: number) {
  const directions =
    lang === "en"
      ? ["top", "right", "bottom", "left"]
      : ["haut", "droite", "bas", "gauche"];
  return `${directions[r]} / ${directions[(r + 1) % 4]}`;
}
function pipeView(r: number) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(${r * 90} 50 50)"><path class="pipe-border" d="M50 0V30Q50 50 70 50H100"/><path class="pipe-inner" d="M50 0V30Q50 50 70 50H100"/></g><circle cx="50" cy="50" r="5"/></svg>`;
}
function renderTask() {
  const m = missions[state.completed];
  $("task").hidden = false;
  $("task-title").textContent = tr(m.title);
  $("task-status").textContent = notice ? tr(notice) : "";
  const b = $("task-body");
  b.dataset.kind = m.id;
  if (m.id === "water") {
    b.innerHTML = `<div class="pipe-puzzle"><div class="port inlet">IN</div><div class="pipe-grid">${pipeRotations.map((r, i) => `<button class="pipe-tile" data-pipe="${i}" aria-description="${pipeDescription(r)}" aria-label="${tr(["Rotate pipe", "Tourner le tuyau"])} ${i + 1}">${pipeView(r)}</button>`).join("")}</div><div class="port outlet">OUT</div></div><button id="test-water" class="primary">${tr(["Open the water", "Ouvrir l'eau"])}</button>`;
    b.querySelectorAll<HTMLButtonElement>("[data-pipe]").forEach(
      (btn) =>
        (btn.onclick = () => {
          if (paused) return;
          const i = Number(btn.dataset.pipe);
          pipeRotations[i] = (pipeRotations[i] + 1) % 4;
          btn.innerHTML = pipeView(pipeRotations[i]);
          btn.setAttribute(
            "aria-description",
            pipeDescription(pipeRotations[i]),
          );
          $("task-status").textContent = "";
        }),
    );
    $("test-water").onclick = () => {
      if (paused) return;
      if (connectedPipes(pipeRotations)) success();
      else {
        status([
          "A leak. Rotate the bends to join IN to OUT.",
          "Ça fuit. Tournez les coudes pour relier IN à OUT.",
        ]);
        say(
          [
            "Even the Shadoks kept the water in the pipes.",
            "Même les Shadoks gardaient l'eau dans les tuyaux.",
          ],
          "degaulle",
        );
      }
    };
  } else if (m.id === "nuclear") {
    b.innerHTML = `<div class="rod-bank">${rods.map((v, i) => `<div class="rod-column"><div class="rod-track" data-aligned="${Math.abs(v - [32, 68, 45][i]) <= 5}"><span class="rod-mark" style="bottom:${[32, 68, 45][i]}%"></span><span id="rod-fill-${i}" class="rod-fill" style="height:${v}%"></span></div><label for="rod-${i}">${i + 1}</label><input id="rod-${i}" type="range" min="0" max="100" value="${v}" aria-label="${tr(["Rod", "Barre"])} ${i + 1}" aria-description="${tr(["Target", "Cible"])} ${[32, 68, 45][i]}%"></div>`).join("")}</div><button id="ignite" class="primary">${tr(["Start the core", "Lancer le cœur"])}</button>`;
    rods.forEach(
      (_, i) =>
        ($("rod-" + i).oninput = (e) => {
          if (paused) return;
          rods[i] = Number((e.target as HTMLInputElement).value);
          $("rod-fill-" + i).style.height = rods[i] + "%";
          $("rod-fill-" + i).parentElement!.dataset.aligned = String(
            Math.abs(rods[i] - [32, 68, 45][i]) <= 5,
          );
        }),
    );
    $("ignite").onclick = () => {
      if (paused) return;
      if (alignedRods(rods)) success();
      else {
        status([
          "Align each rod with its black mark.",
          "Alignez chaque barre sur son repère noir.",
        ]);
        say(
          [
            "The marks are there for a reason.",
            "Les repères ne sont pas décoratifs.",
          ],
          "giscard",
        );
      }
    };
  } else if (m.id === "concorde") {
    b.innerHTML = `<div class="flight-sky"><svg viewBox="0 0 300 130" aria-hidden="true"><path class="contrail" d="M5 85H140M5 94H140"/><g id="aircraft"><path d="m25 75 68-6 58-45 18-2-21 46 116 5 10 6-129 5-20 30-16-1 9-29-88-3Z"/><path d="m42 75 9-26 9 1 5 24"/></g></svg><div class="runway"></div></div><div class="throttle-meter"><span id="flight-zone"></span><i id="flight-needle"></i></div><label class="throttle-label" for="throttle">${tr(["Throttle", "Gaz"])}<output id="hold-time">0 / 3 s</output></label><input id="throttle" type="range" min="0" max="100" value="${throttle}"><progress id="flight-progress" max="3" value="0" aria-label="${tr(["Stable thrust", "Poussée stable"])}"></progress>`;
    $("throttle").oninput = (e) => {
      if (!paused) throttle = Number((e.target as HTMLInputElement).value);
    };
  } else if (m.id === "sniffer") {
    b.innerHTML = `<div class="radar"><div class="radar-rings"></div><div id="radar-sweep"></div>${[
      [24, 37],
      [69, 30],
      [54, 74],
    ]
      .map(
        ([x, y], i) =>
          `<button class="site" data-site="${i}" style="left:${x}%;top:${y}%" aria-label="${tr(["Scan site", "Scanner le site"])} ${i + 1}">${i + 1}</button>`,
      )
      .join(
        "",
      )}</div><progress id="scan-progress" max="1.4" value="0" aria-label="${tr(["Scan", "Analyse"])}"></progress><div id="scan-results"></div>`;
    b.querySelectorAll<HTMLButtonElement>("[data-site]").forEach(
      (btn) =>
        (btn.onclick = () => {
          if (paused || scanned.has(Number(btn.dataset.site))) return;
          scanAt = Number(btn.dataset.site);
          scanTime = 0;
          b.querySelectorAll("[data-site]").forEach((s) =>
            s.classList.remove("scanning"),
          );
          btn.classList.add("scanning");
          status(["Scanning...", "Analyse..."]);
        }),
    );
    b.querySelectorAll<HTMLButtonElement>("[data-site]").forEach((btn) => {
      if (scanned.has(Number(btn.dataset.site))) {
        btn.disabled = true;
        btn.classList.add("scanned");
        btn.textContent = "✓";
      }
    });
  } else {
    b.innerHTML = `<div class="sync-dial"><div class="sync-mark"></div><div id="sync-arm"></div><div class="dial-center"></div><span class="dial-min">0</span><span class="dial-max">100</span></div><button id="connect" class="primary switch">${tr(["Connect the Élysée", "Brancher l'Élysée"])}</button>`;
    $("connect").onclick = () => {
      if (paused) return;
      if (canConnect(taskTime)) success();
      else {
        status([
          "Too early. Aim for the striped zone.",
          "Trop tôt. Visez la zone hachurée.",
        ]);
        say(
          [
            "The dining room just blinked. Try again.",
            "La salle à manger vient de clignoter. Encore.",
          ],
          "giscard",
        );
      }
    };
  }
}
$("launch").onclick = start;
$("close").onclick = () => {
  state.playing = false;
  $("task").hidden = true;
  sync();
  $("launch").focus({ preventScroll: true });
};
$("language").onclick = () => {
  lang = lang === "en" ? "fr" : "en";
  try {
    localStorage.setItem("rep-language", lang);
  } catch {}
  if (state.playing) renderTask();
  sync();
};
$("pause").onclick = () => {
  paused = !paused;
  sync();
};
$("slow").onclick = () => {
  slow = !slow;
  $("slow").setAttribute("aria-pressed", String(slow));
};
$("restart").onclick = () => {
  if (
    state.completed === 0 ||
    confirm(
      tr(["Restart all five missions?", "Recommencer les cinq missions ?"]),
    )
  )
    reset();
};
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.playing) $("close").click();
});
try {
  scene = new MobileScene($("world"));
} catch (e) {
  $("render-error").hidden = false;
  $("render-error").textContent = tr([
    "3D unavailable. Missions are still playable.",
    "3D indisponible. Les missions restent jouables.",
  ]);
  console.error(e);
}
sync();
let previous = performance.now();
function frame(now: number) {
  const wall = frameDelta(now, previous);
  previous = now;
  const dt = paused || document.hidden ? 0 : wall * (slow ? 0.25 : 1);
  scene?.update(state.completed, dt);
  if (state.playing) {
    taskTime += dt;
    const id = missions[state.completed].id;
    if (id === "concorde") {
      const center = 58 + Math.sin(taskTime * 0.65) * 20;
      const stable = inFlightZone(throttle, taskTime);
      flightHeld = stable
        ? Math.min(3, flightHeld + dt)
        : Math.max(0, flightHeld - dt * 1.8);
      $("flight-zone").style.left = center - 10 + "%";
      $("flight-needle").style.left = throttle + "%";
      $("flight-progress").setAttribute("value", String(flightHeld));
      $("hold-time").textContent = flightHeld.toFixed(1) + " / 3 s";
      $("task-body").dataset.stable = String(stable);
      $("aircraft").style.transform = `translateY(${-flightHeld * 9}px)`;
      if (flightHeld >= 3) success();
    } else if (id === "sniffer") {
      $("radar-sweep").style.transform = `rotate(${taskTime * 50}deg)`;
      if (scanAt >= 0) {
        scanTime += dt;
        $("scan-progress").setAttribute("value", String(scanTime));
        if (scanTime >= 1.4) {
          const i = scanAt;
          scanned.add(i);
          scanAt = -1;
          const s = $("task-body").querySelector<HTMLButtonElement>(
            `[data-site="${i}"]`,
          )!;
          s.classList.remove("scanning");
          s.classList.add("scanned");
          s.textContent = "✓";
          s.disabled = true;
          const findings: Pair[] = [
            ["01 · Cow", "01 · Vache"],
            ["02 · Camembert", "02 · Camembert"],
            ["03 · No oil", "03 · Pas de pétrole"],
          ];
          $("scan-results").innerHTML = [...scanned]
            .sort()
            .map((n) => `<span>${tr(findings[n])}</span>`)
            .join("");
          status(["No oil detected.", "Aucun pétrole détecté."]);
          if (scanned.size === 3) status(["Report ready.", "Rapport prêt."]);
        }
      }
      if (scanned.size === 3) {
        scanTime += dt;
        if (scanTime > 2.8) success();
      }
    } else if (id === "elysee") {
      $("sync-arm").style.transform =
        `rotate(${-80 + syncNeedle(taskTime) * 1.6}deg)`;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
