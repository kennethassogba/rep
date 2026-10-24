import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advance,
  initialState,
  initialControls,
  rates,
  secondaryT,
  steamEnergy,
  rpm,
  balanceError,
  rearm,
  heatBlock,
} from '../src/physics.ts';
const running = () => ({
  primary: 1,
  cooling: 1,
  feed: 1,
  power: 0.65,
  valve: 0.7,
  generator: true,
});
function simulate(seconds: number, c = running()) {
  let s = initialState();
  for (let t = 0; t < seconds; t++) s = advance(s, c, 1);
  return s;
}
test('cold, inactive plant neither heats nor produces electricity', () => {
  const s = simulate(300, initialControls());
  assert.equal(s.primaryT, 20);
  assert.equal(s.secondaryE, 0);
  assert.equal(s.exported, 0);
  assert.equal(rpm(s), 0);
});
test('heat requires all circulations, with a recovery instruction', () => {
  const c = { ...initialControls(), power: 1 };
  const s = simulate(100, c);
  assert.equal(s.fission, 0);
  assert.match(heatBlock(s), /pompe primaire/);
});
test('a complete cycle heats, boils and exports power', () => {
  const s = simulate(180),
    r = rates(s, running());
  assert.equal(s.trip, '');
  assert.equal(secondaryT(s), 275);
  assert.ok(s.primaryT > 285 && s.primaryT < 310);
  assert.ok(r.electric > 200 && r.electric < 320);
  assert.ok(r.electric < r.heat);
  assert.ok(r.steamMass > 0);
  assert.ok(r.rejected > r.electric);
  assert.ok(s.condenserT > 20 && s.condenserT < 45);
});
test('energy is conserved through startup, load changes and shutdown', () => {
  let s = initialState();
  const c = running();
  for (let i = 0; i < 1200; i++) {
    if (i === 300) c.generator = false;
    if (i === 400) c.generator = true;
    if (i === 600) c.power = 0.3;
    if (i === 900) c.power = 0;
    s = advance(s, c, 0.25);
    assert.ok(Math.abs(balanceError(s)) < 1e-6, `balance ${balanceError(s)}`);
    assert.ok(s.secondaryE >= 0 && s.rotorE >= 0 && s.decayE >= 0);
  }
});
test('there is no steam before saturation and no electrical power without load', () => {
  const c = { ...running(), generator: false };
  let s = simulate(4, c);
  assert.equal(steamEnergy(s), 0);
  assert.equal(rates(s, c).admitted, 0);
  s = simulate(60, c);
  assert.ok(rpm(s) > 600);
  assert.equal(rates(s, c).electric, 0);
  assert.equal(s.exported, 0);
});
test('stopping primary flow trips heat, retains residual heat, and requires rearm', () => {
  const c = running();
  let s = simulate(90, c);
  c.primary = 0;
  s = advance(s, c, 8);
  assert.match(s.trip, /débit/);
  assert.ok(rates(s, c).decay > 0);
  assert.equal(rearm(s, c), false);
  c.power = 0;
  c.primary = 1;
  s = advance(s, c, 40);
  assert.equal(rearm(s, c), true);
  assert.equal(s.trip, '');
});
test('loss of cooling warms the condenser and blocks steam admission', () => {
  const c = running();
  let s = simulate(90, c);
  c.cooling = 0;
  s = advance(s, c, 10);
  assert.ok(s.condenserT > 75);
  assert.equal(rates(s, c).admitted, 0);
  assert.ok(Math.abs(balanceError(s)) < 1e-6);
});
test('pause freezes the whole model, including shaft and decay reservoir', () => {
  const s = simulate(40);
  assert.strictEqual(advance(s, running(), 0), s);
});
test('changing frame duration preserves the physical trajectory', () => {
  const c = running();
  let a = initialState(),
    b = initialState();
  for (let i = 0; i < 3000; i++) a = advance(a, c, 0.02);
  for (let i = 0; i < 600; i++) b = advance(b, c, 0.1);
  assert.ok(Math.abs(a.primaryT - b.primaryT) < 1e-7);
  assert.ok(Math.abs(a.exported - b.exported) < 1e-7);
});
test('deterministic stress sweep remains finite, positive and energy balanced', () => {
  let seed = 42,
    s = initialState();
  const c = running();
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let i = 0; i < 1000; i++) {
    if (i % 20 === 0) {
      c.power = random();
      c.valve = random();
      c.primary = random();
      c.cooling = random();
      c.feed = random();
      c.generator = random() > 0.5;
    }
    if (s.trip && i % 100 === 0) {
      c.power = 0;
      c.primary = c.cooling = c.feed = 1;
      rearm(s, c);
    }
    s = advance(s, c, 0.1);
    for (const [key, value] of Object.entries(s))
      if (typeof value === 'number') assert.ok(Number.isFinite(value), key);
    assert.ok(s.secondaryE >= -1e-7 && s.rotorE >= 0 && s.decayE >= 0);
    assert.ok(Math.abs(balanceError(s)) < 1e-6);
  }
});
test('invalid integration intervals are rejected', () => {
  for (const dt of [-1, NaN, Infinity, 121])
    assert.throws(() => advance(initialState(), initialControls(), dt), RangeError);
});

test('the liquid-only model stops at its domain boundary and can cool after recovery', () => {
  const c = running();
  let s = simulate(90, c);
  c.primary = 0;
  s = advance(s, c, 100);
  assert.equal(s.outsideModel, true);
  assert.ok(s.primaryT <= 340 + 1e-9);
  assert.ok(Math.abs(balanceError(s)) < 1e-6);
  c.primary = 1;
  c.power = 0;
  s = advance(s, c, 40);
  assert.equal(s.outsideModel, false);
  assert.ok(s.primaryT < 310);
  assert.equal(rearm(s, c), true);
  assert.ok(Math.abs(balanceError(s)) < 1e-6);
});
