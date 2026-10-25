import test from "node:test";
import assert from "node:assert/strict";
import {
  freshProgress,
  finishMission,
  missions,
  connectedPipes,
  alignedRods,
  inFlightZone,
  canConnect,
} from "../src/missions.ts";
test("missions advance exactly once, in order, and finish after five tasks", () => {
  const p = freshProgress();
  assert.equal(finishMission(p, "water"), false);
  for (const m of missions) {
    p.playing = true;
    assert.equal(finishMission(p, m.id), true);
    assert.equal(finishMission(p, m.id), false);
  }
  assert.deepEqual(p, { completed: 5, playing: false });
});
test("later missions cannot skip the current task", () => {
  const p = freshProgress();
  p.playing = true;
  assert.equal(finishMission(p, "elysee"), false);
  assert.equal(p.completed, 0);
});
test("pipe puzzle has one continuous route and rejects every single wrong rotation", () => {
  const solution = [2, 1, 0, 3];
  assert.equal(connectedPipes(solution), true);
  for (let i = 0; i < 4; i++)
    for (let r = 0; r < 4; r++) {
      const v = [...solution];
      v[i] = r;
      assert.equal(connectedPipes(v), r === solution[i]);
    }
  assert.equal(connectedPipes([]), false);
});
test("rod alignment tolerates small touch inaccuracies but rejects missing or invalid rods", () => {
  assert.ok(alignedRods([32, 68, 45]));
  assert.ok(alignedRods([28, 72, 49]));
  assert.equal(alignedRods([0, 0, 0]), false);
  assert.equal(alignedRods([32, 68]), false);
  assert.equal(alignedRods([NaN, 68, 45]), false);
});
test("flight and grid tasks expose reachable and distinct success and failure windows", () => {
  assert.ok(inFlightZone(58, 0));
  assert.equal(inFlightZone(0, 0), false);
  assert.ok(canConnect(0));
  assert.equal(canConnect(Math.PI / 3.6), false);
  for (let t = 0; t < 30; t += 0.1)
    assert.ok(inFlightZone(58 + Math.sin(t * 0.65) * 20, t));
});
