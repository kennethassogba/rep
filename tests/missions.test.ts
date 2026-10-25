import test from "node:test";
import assert from "node:assert/strict";
import {
  freshProgress,
  finishMission,
  missions,
  frameDelta,
} from "../src/missions.ts";
import {
  newChallenge,
  pipeBoard,
  pipeSolution,
  pipesConnected,
  submitPipes,
  tickChallenge,
  rodTargets,
  flightTargets,
  signalQuality,
  connectGrid,
  gridTarget,
  needleAt,
} from "../src/challenges.ts";
test("five missions advance once and cannot be skipped", () => {
  const p = freshProgress();
  assert.equal(finishMission(p, "water"), false);
  p.playing = true;
  assert.equal(finishMission(p, "elysee"), false);
  for (const m of missions) {
    p.playing = true;
    assert.ok(finishMission(p, m.id));
    assert.equal(finishMission(p, m.id), false);
  }
  assert.equal(p.completed, 5);
});
test("all three water boards are solvable over many scramble seeds", () => {
  for (let phase = 0; phase < 3; phase++)
    for (let seed = 0; seed < 100; seed++) {
      const b = pipeBoard(phase, seed),
        solution = pipeSolution(phase);
      b.forEach((p, i) => (p.rotation = solution[i]));
      assert.ok(pipesConnected(b, phase));
      for (let i = 0; i < 9; i++) {
        b[i].rotation = (solution[i] + 1) % 4;
        assert.equal(pipesConnected(b, phase), false);
        b[i].rotation = solution[i];
      }
    }
});
test("water requires three complete boards, not one solved circuit", () => {
  const c = newChallenge("water", 52);
  assert.equal(submitPipes(c), false);
  for (let i = 0; i < 3; i++) {
    const solution = pipeSolution(c.phase);
    c.pipes.forEach((p, j) => (p.rotation = solution[j]));
    assert.ok(submitPipes(c));
    assert.equal(c.done, i === 2);
  }
  assert.equal(submitPipes(c), false);
});
test("seed changes produce different puzzles", () => {
  assert.notDeepEqual(pipeBoard(0, 1), pipeBoard(0, 2));
});
test("core requires fifteen seconds of balanced rods over three distinct levels", () => {
  const c = newChallenge("nuclear");
  for (let i = 0; i < 100; i++) tickChallenge(c, 0.05);
  assert.equal(c.held, 0);
  let elapsed = 0;
  while (!c.done && elapsed < 20) {
    c.rods = rodTargets(c.phase, c.time + 0.05);
    tickChallenge(c, 0.05);
    elapsed += 0.05;
  }
  assert.ok(c.done);
  assert.ok(elapsed >= 15);
});
test("Concorde requires both controls and at least 24 stable seconds", () => {
  const c = newChallenge("concorde");
  for (let i = 0; i < 100; i++) {
    c.throttle = flightTargets(c.phase, c.time)[0];
    c.pitch = 0;
    tickChallenge(c, 0.05);
  }
  assert.equal(c.phase, 0);
  assert.equal(c.held, 0);
  let elapsed = 0;
  while (!c.done && elapsed < 30) {
    [c.throttle, c.pitch] = flightTargets(c.phase, c.time + 0.05);
    tickChallenge(c, 0.05);
    elapsed += 0.05;
  }
  assert.ok(c.done);
  assert.ok(elapsed >= 24);
});
test("unstable controls lose accumulated stability", () => {
  const c = newChallenge("concorde");
  c.held = 4;
  c.throttle = 0;
  c.pitch = 0;
  tickChallenge(c, 0.5);
  assert.ok(c.held < 4);
});
test("sniffer needs three tuned signals and cannot rescan a completed site", () => {
  const c = newChallenge("sniffer");
  c.site = 0;
  c.tuning = 90;
  tickChallenge(c, 0.5);
  assert.equal(c.held, 0);
  for (let site = 0; site < 3; site++) {
    c.site = site;
    c.tuning = [27, 74, 48][site];
    for (let i = 0; i < 81; i++) tickChallenge(c, 0.05);
    assert.ok(c.scanned[site]);
    assert.equal(c.done, site === 2);
  }
  assert.ok(signalQuality(27, 0) >= 90);
  assert.equal(signalQuality(90, 0), 0);
});
test("grid rejects spam, advances on timing and trips the previous feeder on a miss", () => {
  const c = newChallenge("elysee");
  function findTime(target: number, phase: number) {
    for (let t = 0; t < 20; t += 0.01)
      if (Math.abs(needleAt(t, phase) - target) < 1) return t;
    throw Error("window unreachable");
  }
  c.time = findTime(gridTarget(0), 0);
  assert.ok(connectGrid(c));
  assert.equal(c.phase, 1);
  assert.equal(connectGrid(c), false);
  tickChallenge(c, 1);
  c.time = findTime(0, 1);
  assert.equal(connectGrid(c), false);
  assert.equal(c.phase, 0);
  for (let i = 0; i < 3; i++) {
    tickChallenge(c, 1);
    c.time = findTime(gridTarget(c.phase), c.phase);
    assert.ok(connectGrid(c));
  }
  assert.ok(c.done);
});
test("pause intervals freeze all challenge state and invalid intervals fail", () => {
  for (const m of missions) {
    const c = newChallenge(m.id),
      before = structuredClone(c);
    tickChallenge(c, 0);
    assert.deepEqual(c, before);
    assert.throws(() => tickChallenge(c, -1), RangeError);
  }
  assert.equal(frameDelta(90, 100), 0);
  assert.equal(frameDelta(10000, 0), 0.05);
});
