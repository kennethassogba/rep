import "./style.css";
import "@fontsource-variable/dm-sans/wght.css";
import { Machine } from "./machine";
import {
  missions,
  freshProgress,
  finishMission,
  frameDelta,
  type Language,
  type Pair,
} from "./missions";
import {
  newChallenge,
  ports,
  flowingCells,
  rodTargets,
  flightTargets,
  signalQuality,
  needleAt,
  gridTarget,
  submitPipes,
  connectGrid,
  tickChallenge,
  type Challenge,
  type Pipe,
} from "./challenges";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let lang: Language = "en";
try {
  lang = localStorage.getItem("rep-language") === "fr" ? "fr" : "en";
} catch {}
const tr = (p: Pair) => p[lang === "en" ? 0 : 1];
const state = freshProgress();
try {
  state.completed = Math.max(
    0,
    Math.min(
      5,
      Math.floor(Number(localStorage.getItem("rep-missions-v2"))) || 0,
    ),
  );
} catch {}
let challenge: Challenge | undefined,
  paused = false,
  slow = false;
let dialogue: Pair =
  state.completed === 5 ? missions[4].done : missions[state.completed].intro;
let speaker: "giscard" | "degaulle" =
  missions[Math.min(state.completed, 4)].president;
let lastPhase = -1;
$("app").innerHTML =
  `<main id="game"><header><h1>REP</h1><div id="progress" aria-label="Missions"></div><button id="language">EN</button></header><div id="world"></div><div id="objective"><span id="chapter"></span><h2 id="mission-title"></h2></div><button id="launch"></button><section id="task" aria-labelledby="task-title" hidden><div class="task-heading"><h2 id="task-title"></h2><button id="close" aria-label="Close">×</button></div><div id="task-phase"></div><div id="task-body"></div><output id="task-status" class="sr-only" role="status"></output></section><aside id="presidents"><div id="degaulle" class="portrait" role="img" aria-label="Charles de Gaulle"></div><div id="dialogue"><strong id="speaker"></strong><p id="speech" aria-live="polite"></p></div><div id="giscard" class="portrait" role="img" aria-label="Valéry Giscard d'Estaing"></div></aside><footer><button id="pause"></button><button id="slow" aria-pressed="false">¼×</button><button id="restart"></button></footer></main>`;
const machine = new Machine($("world"));
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
function announce(text: Pair, who = speaker) {
  $("task-status").textContent = tr(text);
  say(text, who);
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
  $("launch").textContent =
    state.completed === 5
      ? tr(["Play again", "Rejouer"])
      : tr(
          state.completed === 0
            ? ["Restore the water", "Remettre l'eau"]
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
  $("world").setAttribute(
    "aria-label",
    tr([
      "Power machine with the Élysée palace",
      "Machine électrique et palais de l'Élysée",
    ]),
  );
  $("game").dataset.paused = String(paused);
  $("task-body")
    .querySelectorAll<HTMLButtonElement | HTMLInputElement>("button,input")
    .forEach(
      (el) =>
        (el.disabled =
          paused ||
          (el.dataset.site !== undefined &&
            !!challenge?.scanned[Number(el.dataset.site)])),
    );
  renderDialogue();
}
function reset() {
  state.completed = 0;
  state.playing = false;
  challenge = undefined;
  paused = false;
  try {
    localStorage.removeItem("rep-missions-v2");
  } catch {}
  $("task").hidden = true;
  say(missions[0].intro, "degaulle");
  sync();
}
function success() {
  const m = missions[state.completed];
  if (!finishMission(state, m.id)) return;
  try {
    localStorage.setItem("rep-missions-v2", String(state.completed));
  } catch {}
  $("task").hidden = true;
  say(m.done, m.president);
  sync();
  $("launch").focus({ preventScroll: true });
}
function start() {
  if (state.completed === 5) {
    reset();
    return;
  }
  state.playing = true;
  paused = false;
  if (
    !challenge ||
    challenge.id !== missions[state.completed].id ||
    challenge.done
  )
    challenge = newChallenge(
      missions[state.completed].id,
      Math.floor(Math.random() * 100000),
    );
  lastPhase = challenge.phase;
  say(missions[state.completed].intro, missions[state.completed].president);
  renderTask();
  sync();
  $("close").focus({ preventScroll: true });
}
function pipeDescription(p: Pipe) {
  const names =
    lang === "en"
      ? ["top", "right", "bottom", "left"]
      : ["haut", "droite", "bas", "gauche"];
  return ports(p)
    .map((d) => names[d])
    .join(" / ");
}
function pipeView(p: Pipe) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(${p.rotation * 90} 50 50)"><path class="pipe-border" d="${p.kind === "bend" ? "M50 0V30Q50 50 70 50H100" : "M50 0V100"}"/><path class="pipe-inner" d="${p.kind === "bend" ? "M50 0V30Q50 50 70 50H100" : "M50 0V100"}"/></g></svg>`;
}
function phaseTitle(c: Challenge) {
  const phases: Record<Challenge["id"], Pair[]> = {
    water: [
      ["Water circuit 1", "Circuit d'eau 1"],
      ["Water circuit 2", "Circuit d'eau 2"],
      ["Water circuit 3", "Circuit d'eau 3"],
    ],
    nuclear: [
      ["Warm-up", "Préchauffage"],
      ["Power rise", "Montée en puissance"],
      ["Full output", "Pleine puissance"],
    ],
    concorde: [
      ["Takeoff · Paris", "Décollage · Paris"],
      ["Cruise · Atlantic", "Croisière · Atlantique"],
      ["Landing · Montréal", "Atterrissage · Montréal"],
    ],
    sniffer: [
      ["Field survey", "Relevé de terrain"],
      ["Cross-check", "Contre-expertise"],
      ["Final survey", "Dernier relevé"],
    ],
    elysee: [
      ["North wing", "Aile nord"],
      ["South wing", "Aile sud"],
      ["Élysée reception", "Réception à l'Élysée"],
    ],
  };
  return tr(phases[c.id][Math.min(c.phase, 2)]);
}
function phaseFeedback(c: Challenge) {
  const messages: Partial<Record<Challenge["id"], Pair>> = {
    water:
      c.phase === 1
        ? [
            "Je vous ai compris. Now the second circuit.",
            "Je vous ai compris. Maintenant, le deuxième circuit.",
          ]
        : [
            "Two circuits. One more. Keep the water inside the pipes.",
            "Deux circuits. Encore un. Gardez l'eau dans les tuyaux.",
          ],
    nuclear: [
      "The core is rising. New marks. Hold all three rods steady.",
      "Le cœur monte. Nouveaux repères. Gardez les trois barres stables.",
    ],
    concorde:
      c.phase === 1
        ? [
            "Airborne. Now keep both needles steady over the Atlantic.",
            "Décollage réussi. Gardez les deux aiguilles stables au-dessus de l'Atlantique.",
          ]
        : [
            "Montréal ahead. Reduce thrust and follow the landing marks.",
            "Montréal en vue. Réduisez les gaz et suivez les repères d'atterrissage.",
          ],
    sniffer: [
      [
        "A cow. Tune another site.",
        "Camembert. Tune another site.",
        "A dry hole. Tune another site.",
      ][c.lastSite],
      [
        "Une vache. Réglez un autre site.",
        "Du camembert. Réglez un autre site.",
        "Un trou sec. Réglez un autre site.",
      ][c.lastSite],
    ],
    elysee: [
      "One wing has power. Synchronise the next feeder.",
      "Une aile a du courant. Synchronisez la ligne suivante.",
    ],
  };
  if (messages[c.id]) say(messages[c.id]!, missions[state.completed].president);
}
function renderTask() {
  const c = challenge!;
  const restoreFocus = $("task-body").contains(document.activeElement);
  $("task-status").textContent = "";
  $("task").hidden = false;
  $("task-title").textContent = tr(missions[state.completed].title);
  $("task-phase").textContent = `${c.phase + 1} / 3 · ${phaseTitle(c)}`;
  const b = $("task-body");
  b.dataset.kind = c.id;
  if (c.id === "water") {
    b.innerHTML = `<div class="pipe-puzzle"><span class="port inlet">IN</span><div class="pipe-grid">${c.pipes.map((p, i) => `<button class="pipe-tile" data-pipe="${i}" aria-label="${tr(["Rotate pipe", "Tourner le tuyau"])} ${i + 1}" aria-description="${pipeDescription(p)}">${pipeView(p)}</button>`).join("")}</div><span class="port outlet" style="top:${c.phase === 2 ? "16.7" : "83.3"}%">OUT</span></div><button id="test-water" class="primary">${tr(["Test the water", "Tester l'eau"])}</button>`;
    b.querySelectorAll<HTMLButtonElement>("[data-pipe]").forEach(
      (btn) =>
        (btn.onclick = () => {
          if (paused) return;
          const i = Number(btn.dataset.pipe);
          c.pipes[i].rotation = (c.pipes[i].rotation + 1) % 4;
          btn.innerHTML = pipeView(c.pipes[i]);
          btn.setAttribute("aria-description", pipeDescription(c.pipes[i]));
          b.querySelectorAll(".pipe-tile").forEach((el) =>
            el.classList.remove("flowing"),
          );
        }),
    );
    $("test-water").onclick = () => {
      if (paused) return;
      if (submitPipes(c)) {
        if (c.done) success();
        else {
          phaseFeedback(c);
          lastPhase = c.phase;
          renderTask();
        }
      } else {
        flowingCells(c.pipes, c.phase).forEach((i) =>
          b.querySelector(`[data-pipe="${i}"]`)!.classList.add("flowing"),
        );
        announce(
          [
            "La réforme, oui. La chienlit, non. The water stops at the broken connection.",
            "La réforme, oui. La chienlit, non. L'eau s'arrête au raccord cassé.",
          ],
          "degaulle",
        );
      }
    };
  } else if (c.id === "nuclear") {
    b.innerHTML = `<div class="rod-bank">${c.rods.map((v, i) => `<div class="rod-column"><div class="rod-track"><span id="rod-mark-${i}" class="rod-mark"></span><span id="rod-fill-${i}" class="rod-fill" style="height:${v}%"></span></div><label for="rod-${i}">${i + 1}</label><input id="rod-${i}" type="range" min="0" max="100" value="${v}" aria-label="${tr(["Rod", "Barre"])} ${i + 1}"></div>`).join("")}</div><div class="hold-readout"><span>${tr(["Stability", "Stabilité"])}</span><output id="hold-time">0 / 5 s</output></div><progress id="hold-progress" max="5" value="${c.held}" aria-label="${tr(["Core stability", "Stabilité du cœur"])}"></progress>`;
    c.rods.forEach(
      (_, i) =>
        ($("rod-" + i).oninput = (e) => {
          if (!paused) c.rods[i] = Number((e.target as HTMLInputElement).value);
        }),
    );
  } else if (c.id === "concorde") {
    b.innerHTML = `<div class="flight-sky"><svg viewBox="0 0 300 110" aria-hidden="true"><path class="contrail" d="M0 66H100M0 73H100"/><g id="aircraft"><path d="m25 65 68-6 58-45 18-2-21 46 116 5 10 6-129 5-20 30-16-1 9-29-88-3Z"/><path d="m42 65 9-26 9 1 5 24"/></g></svg></div>${(["throttle", "pitch"] as const).map((id, i) => `<div class="flight-control"><label for="${id}">${tr(i ? ["Pitch", "Assiette"] : ["Throttle", "Gaz"])}</label><div class="throttle-meter"><span id="${id}-zone"></span><i id="${id}-needle"></i></div><input id="${id}" type="range" min="0" max="100" value="${c[id]}"></div>`).join("")}<div class="hold-readout"><span>${tr(["Stable flight", "Vol stable"])}</span><output id="hold-time">0 / 8 s</output></div><progress id="hold-progress" max="8" value="${c.held}" aria-label="${tr(["Stable flight", "Vol stable"])}"></progress>`;
    for (const id of ["throttle", "pitch"] as const)
      $(id).oninput = (e) => {
        if (!paused) c[id] = Number((e.target as HTMLInputElement).value);
      };
  } else if (c.id === "sniffer") {
    b.innerHTML = `<div class="radar"><div class="radar-rings"></div><div id="radar-sweep"></div>${[
      [24, 37],
      [69, 30],
      [54, 74],
    ]
      .map(
        ([x, y], i) =>
          `<button class="site ${c.scanned[i] ? "scanned" : c.site === i ? "scanning" : ""}" data-site="${i}" style="left:${x}%;top:${y}%" aria-label="${tr(["Survey site", "Analyser le site"])} ${i + 1}" ${c.scanned[i] ? "disabled" : ""}>${c.scanned[i] ? "✓" : i + 1}</button>`,
      )
      .join(
        "",
      )}</div><label class="signal-label" for="frequency">${tr(["Receiver", "Récepteur"])}<output id="quality">0%</output></label><input id="frequency" type="range" min="0" max="100" value="${c.tuning}"><div class="signal-meter"><span id="signal-fill"></span></div><progress id="hold-progress" max="4" value="${c.held}" aria-label="${tr(["Signal lock", "Verrouillage du signal"])}"></progress><div id="scan-results">${c.scanned.map((v, i) => (v ? `<span>${tr([["Cow", "Camembert", "Dry hole"][i], ["Vache", "Camembert", "Trou sec"][i]])}</span>` : "")).join("")}</div>`;
    b.querySelectorAll<HTMLButtonElement>("[data-site]").forEach(
      (btn) =>
        (btn.onclick = () => {
          if (paused) return;
          c.site = Number(btn.dataset.site);
          c.held = 0;
          b.querySelectorAll("[data-site]").forEach((el) =>
            el.classList.remove("scanning"),
          );
          btn.classList.add("scanning");
          say(
            [
              "Tune the receiver until the signal reaches 90%. Keep it there.",
              "Réglez le récepteur pour atteindre 90% de signal. Gardez-le là.",
            ],
            "degaulle",
          );
        }),
    );
    $("frequency").oninput = (e) => {
      if (!paused) c.tuning = Number((e.target as HTMLInputElement).value);
    };
  } else {
    b.innerHTML = `<div class="sync-dial"><div id="grid-mark" class="sync-mark"></div><div id="sync-arm"></div><div class="dial-center"></div><span class="dial-min">0</span><span class="dial-max">100</span></div><div class="feeder-lights">${[0, 1, 2].map((i) => `<span class="${i < c.phase ? "lit" : ""}">${i + 1}</span>`).join("")}</div><button id="connect" class="primary switch">${tr(["Close the switch", "Fermer l'interrupteur"])}</button>`;
    $("connect").onclick = () => {
      if (paused || c.cooldown > 0) return;
      if (connectGrid(c)) {
        if (c.done) success();
        else {
          phaseFeedback(c);
          lastPhase = c.phase;
          renderTask();
        }
      } else {
        lastPhase = c.phase;
        renderTask();
        announce(
          [
            "Au revoir. One feeder just tripped. Aim for the striped mark.",
            "Au revoir. Une ligne vient de sauter. Visez le repère hachuré.",
          ],
          "giscard",
        );
      }
    };
  }
  sync();
  updateTask();
  if (restoreFocus)
    $("task-body")
      .querySelector<HTMLElement>("button:not(:disabled), input:not(:disabled)")
      ?.focus({ preventScroll: true });
}
function updateTask() {
  const c = challenge!;
  if (c.id === "nuclear") {
    const targets = rodTargets(c.phase, c.time);
    targets.forEach((v, i) => {
      $("rod-mark-" + i).style.bottom = v + "%";
      $("rod-fill-" + i).style.height = c.rods[i] + "%";
      $("rod-fill-" + i).parentElement!.dataset.aligned = String(
        Math.abs(c.rods[i] - v) <= 7,
      );
      $("rod-" + i).setAttribute(
        "aria-description",
        `${tr(["Target", "Cible"])} ${Math.round(v)}%`,
      );
    });
    $("hold-time").textContent = `${c.held.toFixed(1)} / 5 s`;
    $("hold-progress").setAttribute("value", String(c.held));
  } else if (c.id === "concorde") {
    const target = flightTargets(c.phase, c.time);
    (["throttle", "pitch"] as const).forEach((id, i) => {
      $(id + "-zone").style.left = target[i] - 10 + "%";
      $(id + "-needle").style.left = c[id] + "%";
    });
    $("hold-time").textContent = `${c.held.toFixed(1)} / 8 s`;
    $("hold-progress").setAttribute("value", String(c.held));
    $("aircraft").style.transform =
      `translateY(${(50 - c.pitch) * 0.3}px) rotate(${(c.pitch - 50) * 0.15}deg)`;
  } else if (c.id === "sniffer") {
    const q = c.site >= 0 ? signalQuality(c.tuning, c.site) : 0;
    $("quality").textContent =
      Math.round(q) + "%" + (q >= 90 ? ` · ${c.held.toFixed(1)} / 4 s` : "");
    $("signal-fill").style.transform = `scaleX(${q / 100})`;
    $("hold-progress").setAttribute("value", String(c.held));
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      $("radar-sweep").style.transform = `rotate(${c.time * 45}deg)`;
  } else if (c.id === "elysee") {
    $("sync-arm").style.transform =
      `rotate(${-80 + needleAt(c.time, c.phase) * 1.6}deg)`;
    $("grid-mark").style.transform =
      `rotate(${-80 + gridTarget(c.phase) * 1.6}deg)`;
  }
}
$("launch").onclick = start;
$("close").onclick = () => {
  state.playing = false;
  $("task").hidden = true;
  say(
    [
      "Au revoir. Your task is still here when you come back.",
      "Au revoir. Votre mission vous attend ici.",
    ],
    "giscard",
  );
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
  $("game").dataset.slow = String(slow);
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
sync();
let previous = performance.now();
function frame(now: number) {
  const wall = frameDelta(now, previous);
  previous = now;
  const dt = paused || document.hidden ? 0 : wall * (slow ? 0.25 : 1);
  machine.update(state.completed, dt);
  if (state.playing && challenge) {
    tickChallenge(challenge, dt);
    if (challenge.done) success();
    else if (challenge.phase !== lastPhase) {
      lastPhase = challenge.phase;
      phaseFeedback(challenge);
      renderTask();
    } else updateTask();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
