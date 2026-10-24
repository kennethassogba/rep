import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  initialControls,
  advance,
  rates,
} from "../src/physics.ts";
import { actions, availability, operate } from "../src/startup.ts";
import { achieved, mission } from "../src/game.ts";
import {
  journeyFrame,
  journeySpeed,
  primaryCurve,
  secondaryCurve,
} from "../src/journey.ts";

test("the five-switch game wins from cold using the energy model, without setting output", () => {
  let s = initialState();
  const c = initialControls();
  let wall = 0;
  assert.equal(achieved(s, c), false);
  for (const a of actions) {
    while (!availability(a, s, c).ready && wall < 60) {
      s = advance(s, c, 0.2);
      wall += 0.05;
    }
    assert.equal(availability(a, s, c).ready, true, a);
    operate(a, s, c);
  }
  while (!achieved(s, c) && wall < 60) {
    s = advance(s, c, 0.2);
    wall += 0.05;
  }
  assert.ok(achieved(s, c));
  assert.ok(wall < 15, `startup took ${wall}s`);
  assert.ok(rates(s, c).electric >= 100);
  assert.equal(mission(s, c, true).character, "degaulle");
  c.generator = false;
  assert.equal(achieved(s, c), false);
  assert.equal(mission(s, c, true).complete, false);
  assert.equal(mission(s, c, true).next, "load");
});

test("the guide explains heating while all commands remain available", () => {
  const s = initialState(),
    c = initialControls();
  for (const a of actions) operate(a, s, c);
  assert.match(mission(s, c, false).line[0], /275/);
  assert.equal(mission(s, c, false).ready, true);
});

test("fluid travel is position-continuous, finite, and crosses between two separate water circuits", () => {
  let previous = journeyFrame(0).point;
  for (let i = 1; i <= 1000; i++) {
    const f = journeyFrame(i / 1000);
    assert.ok(f.point.toArray().every(Number.isFinite));
    assert.ok(f.tangent.toArray().every(Number.isFinite));
    assert.ok(f.point.distanceTo(previous) < 0.3, `${i}: camera path jump`);
    previous = f.point;
  }
  for (const boundary of [0.44, 0.52])
    assert.ok(
      journeyFrame(boundary - 1e-6).point.distanceTo(
        journeyFrame(boundary + 1e-6).point,
      ) < 0.001,
    );
  assert.equal(journeyFrame(0.48).chapter, "exchange");
  assert.ok(
    primaryCurve.getPointAt(1).distanceTo(secondaryCurve.getPointAt(0)) > 0.5,
  );
  assert.equal(journeySpeed(0.1, initialState(), initialControls()), 0);
  assert.equal(journeySpeed(0.7, initialState(), initialControls()), 0);
});
