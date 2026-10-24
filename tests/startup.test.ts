import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  initialControls,
  advance,
  rates,
  balanceError,
  rpm,
  rearm,
} from "../src/physics.ts";
import { actions, availability, operate, nextAction } from "../src/startup.ts";

test("cold controls explain dependencies and cannot bypass them", () => {
  const s = initialState(),
    c = initialControls();
  assert.equal(nextAction(s, c), "cooling");
  for (const action of actions.slice(1)) {
    const before = { ...c },
      status = operate(action, s, c);
    assert.equal(status.ready, false, action);
    assert.ok(status.requires, action);
    assert.deepEqual(c, before);
  }
  operate("cooling", s, c);
  assert.equal(c.feed, 1);
  assert.equal(
    availability("primary", s, c).ready,
    false,
    "command is not actual circulation",
  );
  const circulated = advance(s, c, 3);
  assert.equal(availability("primary", circulated, c).ready, true);
});

test("five physical controls start the complete energy cycle without a scripted state", () => {
  let s = initialState();
  const c = initialControls();
  for (const action of actions) {
    let elapsed = 0;
    while (!availability(action, s, c).ready && elapsed < 100) {
      s = advance(s, c, 0.25);
      elapsed += 0.25;
    }
    assert.equal(
      operate(action, s, c).ready,
      true,
      `${action} after ${elapsed}s`,
    );
    assert.equal(s.trip, "");
  }
  s = advance(s, c, 60);
  assert.ok(rates(s, c).electric > 180 && rates(s, c).electric < 300);
  assert.ok(rpm(s) > 400);
  assert.equal(nextAction(s, c), undefined);
  assert.ok(Math.abs(balanceError(s)) < 1e-6);
  assert.equal(s.outsideModel, false);
});

test("shutdown commands remain available and domain-boundary circulation can be restored", () => {
  const c = {
    primary: 1,
    cooling: 1,
    feed: 1,
    power: 0.65,
    valve: 0.7,
    generator: true,
  };
  let s = advance(initialState(), c, 90);
  assert.equal(operate("primary", s, c).ready, true);
  s = advance(s, c, 100);
  assert.equal(s.outsideModel, true);
  assert.equal(operate("heat", s, c).ready, true);
  assert.equal(c.power, 0);
  assert.equal(operate("primary", s, c).ready, true);
  assert.equal(c.primary, 1);
  s = advance(s, c, 40);
  assert.equal(s.outsideModel, false);
  assert.equal(rearm(s, c), true);
  assert.ok(Math.abs(balanceError(s)) < 1e-6);
});
