import test from "node:test";
import assert from "node:assert/strict";
import {
  controls,
  freshGame,
  freshInputs,
  step,
  setInput,
  consequence,
  Director,
  frameDelta,
  dragSetting,
  type Control,
} from "../src/arcade.ts";
const advance = (
  s: ReturnType<typeof freshGame>,
  c: ReturnType<typeof freshInputs>,
  seconds: number,
) => {
  let event;
  for (let i = 0; i < seconds * 50; i++) event = step(s, c, 0.02) || event;
  return event;
};
const orders = (keys: readonly Control[]): Control[][] =>
  keys.length
    ? keys.flatMap((k, i) =>
        orders(keys.filter((_, j) => j !== i)).map((rest) => [k, ...rest]),
      )
    : [[]];
test("all 24 command orders reach the palace with the same game rules", () => {
  for (const order of orders(controls)) {
    const s = freshGame(),
      c = freshInputs();
    for (const key of order) {
      setInput(c, key, key === "heat" ? 0.85 : 1);
      advance(s, c, 0.2);
    }
    assert.equal(advance(s, c, 15), "win");
    assert.ok(s.power >= 100);
    assert.ok(s.won);
    assert.equal(advance(s, c, 2), undefined);
  }
});
test("cold commands cannot create steam or electricity", () => {
  const s = freshGame(),
    c = freshInputs();
  c.heat = c.steam = c.grid = 1;
  advance(s, c, 30);
  assert.equal(s.power, 0);
  assert.equal(s.steam, 0);
  assert.equal(consequence("heat", 0, s, c), "dry");
  assert.equal(consequence("steam", 0, s, c), "cold");
});
test("disconnecting the palace blacks it out while the turbine coasts", () => {
  const s = freshGame(),
    c = { water: 1, heat: 1, steam: 1, grid: 1 };
  advance(s, c, 15);
  c.grid = 0;
  assert.equal(consequence("grid", 1, s, c), "blackout");
  step(s, c, 0.02);
  assert.equal(s.power, 0);
  assert.ok(s.spin > 0.8);
});
test("a pump strike cools the core and can recover without restarting", () => {
  const s = freshGame(),
    c = { water: 1, heat: 1, steam: 1, grid: 1 };
  advance(s, c, 15);
  const hot = s.heat;
  c.water = 0;
  assert.equal(consequence("water", 1, s, c), "strike");
  advance(s, c, 2);
  assert.ok(s.heat < hot * 0.5);
  c.water = 1;
  advance(s, c, 15);
  assert.ok(s.power >= 100);
});
test("pause freezes game, cooldown and event timing", () => {
  const s = freshGame(),
    c = freshInputs();
  s.cooldown = 2;
  const before = { ...s };
  step(s, c, 0);
  assert.deepEqual(s, before);
});
test("drag input clamps; levers use vertical movement and wheels use both axes", () => {
  assert.equal(dragSetting(0, "heat", 100, 55), 0.5);
  assert.equal(dragSetting(0, "water", 55, 55), 1);
  assert.equal(dragSetting(0.5, "steam", -200, 0), 0);
  const c = freshInputs();
  setInput(c, "heat", NaN);
  assert.equal(c.heat, 0);
  setInput(c, "grid", 0.49);
  assert.equal(c.grid, 0);
  setInput(c, "grid", 0.5);
  assert.equal(c.grid, 1);
});
test("the first RAF timestamp may precede setup; background intervals are bounded", () => {
  assert.equal(frameDelta(100, 101), 0);
  assert.equal(frameDelta(10000, 100), 0.05);
  assert.equal(frameDelta(120, 100), 0.02);
});
test("frantic toggles trigger a visual chaos event once per cooldown", () => {
  const d = new Director(),
    s = freshGame(),
    c = freshInputs();
  for (let i = 0; i < 4; i++) {
    s.time += 0.1;
    assert.equal(d.command("grid", 0, s, c), undefined);
  }
  assert.equal(d.command("grid", 0, s, c), "chaos");
  for (let i = 0; i < 8; i++)
    assert.equal(d.command("grid", 0, s, c), undefined);
});
test("stress play stays finite and bounded, at different frame rates", () => {
  for (const dt of [1 / 30, 1 / 60]) {
    const s = freshGame(),
      c = freshInputs();
    for (let i = 0; i < 10000; i++) {
      if (i % 37 === 0) {
        const key = controls[Math.floor(i / 37) % 4],
          before = c[key];
        setInput(c, key, (i % 101) / 100);
        consequence(key, before, s, c);
      }
      step(s, c, dt);
      for (const key of ["water", "heat", "steam", "spin"] as const)
        assert.ok(s[key] >= 0 && s[key] <= 1);
      assert.ok(s.power >= 0 && s.power <= 180);
    }
  }
});
