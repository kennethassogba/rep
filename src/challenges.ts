import type { MissionId } from "./missions";
export type Pipe = { kind: "bend" | "straight"; rotation: number };
const routes = [
  [0, 1, 2, 5, 4, 3, 6, 7, 8],
  [0, 3, 6, 7, 4, 1, 2, 5, 8],
  [0, 1, 4, 3, 6, 7, 8, 5, 2],
];
const turn = (v: number) => ((v % 4) + 4) % 4;
export function ports(pipe: Pipe) {
  return pipe.kind === "straight"
    ? [turn(pipe.rotation), turn(pipe.rotation + 2)]
    : [turn(pipe.rotation), turn(pipe.rotation + 1)];
}
export function pipeBoard(phase: number, seed = 1): Pipe[] {
  const path = routes[phase % 3];
  let n = seed >>> 0;
  return Array.from({ length: 9 }, (_, cell) => {
    const i = path.indexOf(cell);
    const before = i === 0 ? 3 : direction(cell, path[i - 1]);
    const after = i === 8 ? 1 : direction(cell, path[i + 1]);
    const kind = (before + 2) % 4 === after ? "straight" : "bend";
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return { kind, rotation: (n >>> 16) % 4 };
  });
}
function direction(from: number, to: number) {
  return to === from - 3 ? 0 : to === from + 1 ? 1 : to === from + 3 ? 2 : 3;
}
export function pipeSolution(phase: number) {
  const path = routes[phase % 3];
  return pipeBoard(phase).map((pipe, cell) => {
    const i = path.indexOf(cell);
    const want = [
      i === 0 ? 3 : direction(cell, path[i - 1]),
      i === 8 ? 1 : direction(cell, path[i + 1]),
    ];
    for (let r = 0; r < 4; r++) {
      if (want.every((d) => ports({ ...pipe, rotation: r }).includes(d)))
        return r;
    }
    return 0;
  });
}
export function flowingCells(board: Pipe[], phase: number) {
  if (board.length !== 9) return [];
  const visited: number[] = [];
  let cell = 0,
    entry = 3;
  while (cell >= 0 && cell < 9 && !visited.includes(cell)) {
    const ends = ports(board[cell]);
    if (!ends.includes(entry)) break;
    visited.push(cell);
    const exit = ends.find((p) => p !== entry)!;
    if (cell === routes[phase % 3][8] && exit === 1) break;
    const row = Math.floor(cell / 3),
      col = cell % 3;
    if (
      (exit === 0 && row === 0) ||
      (exit === 1 && col === 2) ||
      (exit === 2 && row === 2) ||
      (exit === 3 && col === 0)
    )
      break;
    cell += [-3, 1, 3, -1][exit];
    entry = (exit + 2) % 4;
  }
  return visited;
}
export function pipesConnected(board: Pipe[], phase: number) {
  const cells = flowingCells(board, phase);
  const end = routes[phase % 3][8];
  return (
    cells.length === 9 && cells[8] === end && ports(board[end]).includes(1)
  );
}
export function rodTargets(phase: number, time: number) {
  return [
    [32, 68, 45],
    [66, 36, 74],
    [45, 78, 28],
  ][Math.min(phase, 2)].map((v, i) => v + Math.sin(time * 0.5 + i) * 4);
}
export function flightTargets(phase: number, time: number) {
  return [
    [58, 66],
    [72, 48],
    [42, 32],
  ][Math.min(phase, 2)].map(
    (v, i) => v + Math.sin(time * (i ? 0.7 : 0.55) + i) * 13,
  );
}
export const signalQuality = (tuning: number, site: number) =>
  Math.max(0, 100 - Math.abs(tuning - [27, 74, 48][site]) * 4);
export const needleAt = (time: number, phase: number) =>
  (Math.sin(time * (0.85 + phase * 0.15)) + 1) * 50;
export const gridTarget = (phase: number) => [32, 72, 50][Math.min(phase, 2)];
export type Challenge = {
  id: MissionId;
  phase: number;
  time: number;
  held: number;
  done: boolean;
  pipes: Pipe[];
  rods: number[];
  throttle: number;
  pitch: number;
  tuning: number;
  site: number;
  lastSite: number;
  scanned: boolean[];
  cooldown: number;
  mistakes: number;
  seed: number;
};
export function newChallenge(id: MissionId, seed = 1): Challenge {
  return {
    id,
    phase: 0,
    time: 0,
    held: 0,
    done: false,
    pipes: pipeBoard(0, seed),
    rods: [0, 0, 0],
    throttle: 20,
    pitch: 50,
    tuning: 0,
    site: -1,
    lastSite: -1,
    scanned: [false, false, false],
    cooldown: 0,
    mistakes: 0,
    seed,
  };
}
export function nextPhase(c: Challenge) {
  c.phase++;
  c.held = 0;
  if (c.phase >= 3) c.done = true;
  else if (c.id === "water") c.pipes = pipeBoard(c.phase, c.seed + c.phase);
}
export function submitPipes(c: Challenge) {
  if (c.done || c.id !== "water") return false;
  if (pipesConnected(c.pipes, c.phase)) {
    nextPhase(c);
    return true;
  }
  c.mistakes++;
  return false;
}
export function connectGrid(c: Challenge) {
  if (c.done || c.id !== "elysee" || c.cooldown > 0) return false;
  c.cooldown = 0.8;
  if (Math.abs(needleAt(c.time, c.phase) - gridTarget(c.phase)) <= 8) {
    nextPhase(c);
    return true;
  }
  c.mistakes++;
  c.phase = Math.max(0, c.phase - 1);
  return false;
}
export function tickChallenge(c: Challenge, dt: number) {
  if (!Number.isFinite(dt) || dt < 0 || dt > 1)
    throw new RangeError("Invalid interval");
  if (!dt || c.done) return;
  c.time += dt;
  c.cooldown = Math.max(0, c.cooldown - dt);
  if (c.id === "nuclear") {
    const good = rodTargets(c.phase, c.time).every(
      (v, i) => Math.abs(v - c.rods[i]) <= 7,
    );
    c.held = good ? c.held + dt : Math.max(0, c.held - dt * 1.2);
    if (c.held >= 5) nextPhase(c);
  }
  if (c.id === "concorde") {
    const target = flightTargets(c.phase, c.time),
      good =
        Math.abs(target[0] - c.throttle) <= 10 &&
        Math.abs(target[1] - c.pitch) <= 10;
    c.held = good ? c.held + dt : Math.max(0, c.held - dt * 0.7);
    if (c.held >= 8) nextPhase(c);
  }
  if (c.id === "sniffer" && c.site >= 0 && !c.scanned[c.site]) {
    c.held =
      signalQuality(c.tuning, c.site) >= 90
        ? c.held + dt
        : Math.max(0, c.held - dt);
    if (c.held >= 4) {
      c.scanned[c.site] = true;
      c.lastSite = c.site;
      c.site = -1;
      nextPhase(c);
    }
  }
}
