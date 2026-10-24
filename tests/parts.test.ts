import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { roots, parts, ancestry } from '../src/parts.ts';
import { buildDetail } from '../src/detail.ts';
test('all nine equipment trees have several progressive levels', () => {
  assert.equal(roots.length, 9);
  for (const root of roots) {
    const nodes = [...parts.values()].filter((p) => p.equipment === root.id);
    assert.ok(nodes.length >= 10, `${root.id}: ${nodes.length}`);
    assert.ok(Math.max(...nodes.map((p) => ancestry(p).length)) >= 4, root.id);
  }
  assert.ok(parts.has('reactor/core/assembly/rod/pellet/ceramic/grain'));
});
test('every node has two languages, unique children and a consistent parent', () => {
  for (const [id, p] of parts) {
    assert.equal(id, p.id);
    assert.ok(p.name.every((s) => s.length > 0));
    assert.ok(p.role.every((s) => s.length > 20));
    assert.equal(new Set(p.children.map((c) => c.id)).size, p.children.length);
    for (const c of p.children) {
      assert.strictEqual(c.parent, p);
      assert.ok(c.id.startsWith(p.id + '/'));
    }
  }
});
test('every level produces finite non-empty 3D geometry', () => {
  for (const p of parts.values()) {
    const g = buildDetail(p);
    g.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(g);
    assert.ok(!box.isEmpty(), p.id);
    assert.ok([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite), p.id);
    let count = 0;
    g.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Line) {
        count++;
        o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => m.dispose());
      }
    });
    assert.ok(count > 0, p.id);
  }
});
