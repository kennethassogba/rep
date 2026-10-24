import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { parts } from '../src/parts.ts';
import { buildDetail } from '../src/detail.ts';
import { Interior, interiorSpec, transportRate, type Transport } from '../src/interior.ts';
import { openSection, pickedSphere } from '../src/section.ts';
import { initialState, initialControls, operatingExample, balanceError, rates } from '../src/physics.ts';

function dispose(root: T.Object3D) {
  root.traverse(o => { if (o instanceof T.Mesh || o instanceof T.Line) {
    o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  }});
}

test('operating example is integrated, stable, generating and energy balanced', () => {
  const {state, controls} = operatingExample();
  assert.ok(Math.abs(state.time - 360) < 1e-6);
  assert.equal(state.trip, ''); assert.equal(state.outsideModel, false);
  assert.ok(state.primaryT > 275 && state.primaryT < 310);
  assert.ok(rates(state, controls).electric > 150);
  assert.ok(Math.abs(balanceError(state)) < 1e-6);
});

test('transport stops at zero source and has no independent animation clock', () => {
  const cold = initialState(), controls = initialControls();
  for (const kind of ['primary', 'steam', 'feed', 'cooling', 'heat', 'exchange', 'electric', 'shaft', 'rejected'] as Transport[])
    assert.equal(transportRate(kind, cold, controls), 0, kind);
  const interior = new Interior(parts.get('reactor')!);
  interior.update(cold, controls, 1, false);
  assert.ok(interior.streams.every(s => s.phase === 0 && !s.mesh.visible && !s.arrows.visible));
  const operating = operatingExample();
  interior.update(operating.state, operating.controls, 1, false);
  const phases = interior.streams.map(s => s.phase);
  assert.ok(phases.some(p => p > 0));
  interior.update(operating.state, operating.controls, 0, false);
  assert.deepEqual(interior.streams.map(s => s.phase), phases);
  interior.update(operating.state, operating.controls, 1, true);
  assert.deepEqual(interior.streams.map(s => s.phase), phases);
  dispose(interior.object);
});

test('internal routes respect fluid boundaries and distinguish unmodelled processes', () => {
  const rod = interiorSpec(parts.get('reactor/core/assembly/rod')!);
  for (const r of rod.routes.filter(r => r.kind === 'primary'))
    for (const [x, , z] of r.points) assert.ok(Math.hypot(x, z) > 0.42);
  assert.ok(rod.routes.some(r => r.kind === 'heat'));
  for (const suffix of ['pellet', 'pellet/ceramic', 'pellet/ceramic/grain'])
    assert.ok(interiorSpec(parts.get(`reactor/core/assembly/rod/${suffix}`)!).routes.every(r => r.kind === 'heat'));
  for (const part of parts.values()) if (part.equipment === 'pressurizer')
    assert.equal(interiorSpec(part).routes.length, 0, part.id);
  assert.ok(interiorSpec(parts.get('steam/bundle/tube/outside')!).routes.every(r => r.kind === 'steam'));
  assert.ok(interiorSpec(parts.get('condenser/bundle/tube/inside')!).routes.every(r => r.kind === 'cooling'));
  assert.ok(interiorSpec(parts.get('condenser/bundle/tube/outside')!).routes.every(r => r.kind === 'steam'));
});

test('all internal route coordinates and sampled geometry remain finite', () => {
  for (const part of parts.values()) {
    const spec = interiorSpec(part);
    for (const route of spec.routes) {
      assert.ok(route.points.flat().every(Number.isFinite), part.id);
      const curve = new T.CatmullRomCurve3(route.points.map(p => new T.Vector3(...p)));
      assert.ok(curve.getPoints(40).every(p => p.toArray().every(Number.isFinite)), part.id);
    }
    for (const note of spec.notes) assert.ok(note.text.every(t => t.length) && note.at.every(Number.isFinite), part.id);
  }
});

test('casings open reversibly without cumulative transform drift', () => {
  for (const id of ['reactor', 'steam', 'pressurizer', 'primary', 'generator', 'turbine', 'condenser', 'reactor/core/assembly/rod']) {
    const root = buildDetail(parts.get(id)!);
    const sections: T.Object3D[] = [];
    root.traverse(o => {if (o.userData.opening) sections.push(o);});
    assert.ok(sections.length >= 2, id);
    const before = sections.map(o => [o.position.toArray(), o.quaternion.toArray()]);
    openSection(root, 1);
    assert.notDeepEqual(sections.map(o => [o.position.toArray(), o.quaternion.toArray()]), before);
    openSection(root, 0); openSection(root, 1); openSection(root, 0);
    assert.deepEqual(sections.map(o => [o.position.toArray(), o.quaternion.toArray()]), before, id);
    dispose(root);
  }
});

test('picking an instanced rod uses that rod transform, not the first copy', () => {
  const mesh = new T.InstancedMesh(new T.CylinderGeometry(0.1, 0.1, 3), new T.MeshBasicMaterial(), 2);
  mesh.setMatrixAt(0, new T.Matrix4().makeTranslation(-2, 0, 0));
  mesh.setMatrixAt(1, new T.Matrix4().makeTranslation(2, 0, 0));
  mesh.position.set(10, 3, -5); mesh.scale.setScalar(0.2);
  const first = pickedSphere(mesh, 0), second = pickedSphere(mesh, 1);
  assert.ok(Math.abs(second.center.x - first.center.x - 0.8) < 1e-6);
  assert.equal(second.center.y, 3); assert.equal(second.center.z, -5);
  assert.ok(Math.abs(first.radius - second.radius) < 1e-6);
  dispose(mesh);
});

test('tube-wall transfer reverses when the secondary is hotter than the primary', () => {
  const {state, controls} = operatingExample();
  state.primaryT = 250;
  assert.ok(transportRate('exchange', state, controls) < 0);
  const interior = new Interior(parts.get('steam/bundle/tube')!);
  interior.update(state, controls, 1, false);
  const exchange = interior.streams.find(s => s.route.kind === 'exchange')!;
  const arrowDirection = new T.Vector3(0, 1, 0).applyQuaternion(exchange.arrows.children[0].quaternion);
  assert.ok(arrowDirection.dot(exchange.curve.getTangent(0.26)) < -0.999);
  dispose(interior.object);
});
