import test from "node:test";
import assert from "node:assert/strict";
import {
  actions,
  operate,
  setControl,
  controlValue,
  type Action,
} from "../src/startup.ts";
import {
  initialState,
  initialControls,
  advance,
  rates,
  balanceError,
} from "../src/physics.ts";
import { commandReaction, ReactionDeck, reactions } from "../src/game.ts";
import { references } from "../src/references.ts";
import { wheelDelta, leverValue } from "../src/gestures.ts";
function permutations(items: readonly Action[]): Action[][] {
  return items.length
    ? items.flatMap((a, i) =>
        permutations(items.filter((_, j) => j !== i)).map((rest) => [
          a,
          ...rest,
        ]),
      )
    : [[]];
}
test("all 120 command orders can start from cold without a scripted output", () => {
  for (const order of permutations(actions)) {
    let s = initialState();
    const c = initialControls();
    for (const a of order) {
      operate(a, s, c);
      s = advance(s, c, 0.3);
    }
    s = advance(s, c, 90);
    assert.ok(rates(s, c).electric >= 100, order.join(","));
    assert.equal(s.trip, "");
    assert.ok(Math.abs(balanceError(s)) < 1e-6);
  }
});
test("cold steam and load commands move controls but cannot create energy", () => {
  const c = initialControls();
  let s = initialState();
  operate("steam", s, c);
  operate("load", s, c);
  operate("heat", s, c);
  assert.equal(c.valve, 0.7);
  assert.equal(c.generator, true);
  assert.equal(c.power, 0.65);
  s = advance(s, c, 10);
  assert.equal(rates(s, c).electric, 0);
  assert.equal(s.fission, 0);
  assert.equal(commandReaction("steam", s, c), "coldSteam");
  assert.equal(commandReaction("load", s, c), "idleLoad");
  assert.equal(commandReaction("heat", s, c), "dryHeat");
});
test("continuous controls clamp, ignore non-finite input and share cooling/feed demand", () => {
  const c = initialControls();
  setControl("cooling", 0.42, c);
  assert.equal(c.feed, 0.42);
  setControl("heat", 4, c);
  assert.equal(c.power, 1);
  setControl("heat", NaN, c);
  assert.equal(c.power, 1);
  setControl("heat", -2, c);
  assert.equal(c.power, 0);
  setControl("load", 0.49, c);
  assert.equal(c.generator, false);
  setControl("load", 0.5, c);
  assert.equal(controlValue("load", c), 1);
});
test("drag math crosses the angular seam without jumping and clamps a lever", () => {
  assert.ok(
    Math.abs(
      wheelDelta(Math.PI - 0.01, -Math.PI + 0.01) - 0.02 / (2 * Math.PI),
    ) < 1e-10,
  );
  assert.equal(leverValue(0.5, 200, 145), 1);
  assert.equal(leverValue(0.5, 200, 300), 0);
});
test("a pump cut produces an actual trip and a contextual reaction", () => {
  const c = initialControls();
  let s = initialState();
  for (const a of actions) operate(a, s, c);
  s = advance(s, c, 90);
  operate("primary", s, c);
  assert.equal(commandReaction("primary", s, c), "pumpOff");
  s = advance(s, c, 10);
  assert.ok(s.trip);
});
test("reactions vary on repeated commands, detect frantic play, and reference documented events", () => {
  const deck = new ReactionDeck();
  assert.notDeepEqual(deck.take("coldSteam"), deck.take("coldSteam"));
  let line;
  for (let i = 0; i < 5; i++)
    line = deck.command("steam", initialState(), initialControls(), i * 100);
  assert.equal(line?.reference, "may68");
  const ids = new Set(references.map((r) => r.id));
  for (const group of Object.values(reactions))
    for (const r of group)
      if (r.reference) assert.ok(ids.has(r.reference), r.reference);
  assert.ok(ids.size >= 10);
});
