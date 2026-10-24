import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildMachine } from "../src/industrial.ts";
import { roots, parts } from "../src/parts.ts";
import { openSection, pickedSphere } from "../src/section.ts";
import { Interior } from "../src/interior.ts";
import { initialState, initialControls, advance } from "../src/physics.ts";

test("physical plant keeps all equipment and selectable internals through reversible opening", () => {
  const m = buildMachine();
  assert.equal(m.equipment.size, 9);
  for (const root of roots) {
    const equipment = m.equipment.get(root.id)!;
    assert.ok(equipment, root.id);
    const closed = pickedSphere(equipment);
    openSection(equipment, 1.3);
    assert.ok(Number.isFinite(pickedSphere(equipment).radius), root.id);
    openSection(equipment, 0);
    const reset = pickedSphere(equipment);
    assert.ok(closed.center.distanceTo(reset.center) < 1e-9);
    assert.ok(Math.abs(closed.radius - reset.radius) < 1e-9);
    equipment.traverse((o) => {
      if (o.userData.child)
        assert.ok(parts.has(o.userData.child), o.userData.child);
    });
  }
  assert.equal(m.actuators.length, 5);
  for (const anchor of Object.values(m.anchors))
    assert.ok(anchor.toArray().every(Number.isFinite));
  m.root.traverse((o) => {
    if (o instanceof T.Mesh) {
      o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((v) =>
        v.dispose(),
      );
    }
  });
});

test("native equipment transport is finite, still when cold, and responds to circulation", () => {
  const machine = buildMachine(),
    c = initialControls(),
    cold = initialState();
  assert.equal(
    machine.interiors.has("pressurizer"),
    false,
    "pressure is imposed; no invented local flow",
  );
  const interior = new Interior({
    routes: [...machine.routes, ...[...machine.interiors.values()].flat()],
    notes: [],
  });
  interior.update(cold, c, 1, false);
  for (const s of interior.streams) {
    assert.equal(s.mesh.visible, false);
    assert.equal(s.arrows.visible, false);
    assert.equal(s.phase, 0);
  }
  c.cooling = c.feed = c.primary = 1;
  const circulating = advance(cold, c, 5);
  interior.update(circulating, c, 1, false);
  for (const s of interior.streams) {
    for (const coordinate of s.mesh.instanceMatrix.array)
      assert.ok(Number.isFinite(coordinate));
    assert.equal(
      s.mesh.visible,
      ["primary", "feed", "cooling"].includes(s.route.kind),
    );
  }
  const phases = interior.streams.map((s) => s.phase);
  interior.update(circulating, c, 0, false);
  assert.deepEqual(
    interior.streams.map((s) => s.phase),
    phases,
  );
});
