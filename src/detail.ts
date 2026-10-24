import * as T from 'three';
import type { Kind, Part } from './parts';
import { inkMaterial } from './ink.ts';
import { opens } from './section.ts';
const ink = 0x252a35,
  paper = 0xf1f4fa,
  blue = 0x5b80c9,
  hot = 0xcf725b,
  gold = 0xd4a54e;
type V = [number, number, number];
function solid(g: T.Group, geo: T.BufferGeometry, color: number, p: V = [0, 0, 0], alpha = 1) {
  const m = new T.Mesh(
    geo,
    inkMaterial({
      color,
      transparent: alpha < 1,
      opacity: alpha,
      depthWrite: alpha === 1,
      side: T.DoubleSide,
    }),
  );
  m.position.set(...p);
  g.add(m);
  const edges = new T.EdgesGeometry(geo, 25);
  const pos = edges.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + Math.sin(i * 13.71) * 0.004,
      pos.getY(i) + Math.cos(i * 8.3) * 0.004,
      pos.getZ(i),
    );
  }
  m.add(
    new T.LineSegments(
      edges,
      new T.LineBasicMaterial({ color: ink, transparent: true, opacity: alpha < 1 ? 0.55 : 0.9 }),
    ),
  );
  if (geo instanceof T.CylinderGeometry && alpha < 1) {
    const r = geo.parameters.radiusTop,
      h = geo.parameters.height;
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const line = new T.Line(
        new T.BufferGeometry().setFromPoints([
          new T.Vector3(Math.cos(a) * r, -h / 2, Math.sin(a) * r),
          new T.Vector3(Math.cos(a) * r, h / 2, Math.sin(a) * r),
        ]),
        new T.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.35 }),
      );
      m.add(line);
    }
  }
  return m;
}
const box = (g: T.Group, size: V, p: V, color = paper, alpha = 1) =>
  solid(g, new T.BoxGeometry(...size), color, p, alpha);
const cyl = (g: T.Group, r: number, h: number, p: V, color = paper, alpha = 1) =>
  solid(g, new T.CylinderGeometry(r, r, h, 36), color, p, alpha);
function ring(g: T.Group, r: number, p: V, color = ink, t = 0.025) {
  const m = solid(g, new T.TorusGeometry(r, t, 5, 48), color, p);
  m.rotation.x = Math.PI / 2;
  return m;
}
function pipe(g: T.Group, points: V[], r = 0.09, color = hot) {
  const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
  return solid(g, new T.TubeGeometry(curve, 48, r, 8, false), color, [0, 0, 0], r < 0.1 ? 0.45 : 1);
}
function hatch(g: T.Group, w: number, h: number, z: number) {
  for (let x = -w / 2; x < w / 2; x += 0.18) {
    const points = [
      new T.Vector3(x, -h / 2, z),
      new T.Vector3(Math.min(x + h / 3, w / 2), h / 2, z),
    ];
    g.add(
      new T.Line(
        new T.BufferGeometry().setFromPoints(points),
        new T.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.25 }),
      ),
    );
  }
}
function bladeGeometry(fan: boolean) {
  // A swept, tapered airfoil, lofted along its span. Counts and profile are illustrative.
  const section = [[-0.12, -0.035], [-0.04, -0.065], [0.13, -0.03], [0.2, 0.012], [0.035, 0.055], [-0.12, 0.02]];
  const positions: number[] = [], indices: number[] = [];
  const rows = 8, n = section.length;
  for (let j = 0; j <= rows; j++) {
    const u = j / rows, angle = -0.25 + u * 0.55, taper = 1 - u * 0.28;
    for (const [x, y] of section) {
      const chord = x * taper * (fan ? 2.8 : 1.6), height = y * (fan ? 1 : 1.5);
      positions.push(chord * Math.cos(angle) - height * Math.sin(angle) + u * u * 0.16,
        chord * Math.sin(angle) + height * Math.cos(angle), 0.36 + u * 0.91);
    }
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, b = j * n + (i + 1) % n;
    indices.push(a, b, a + n, b, b + n, a + n);
  }
  for (let i = 1; i < n - 1; i++) indices.push(0, i + 1, i, rows * n, rows * n + i, rows * n + i + 1);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
function rotor(g: T.Group, fan = false) {
  cyl(g, 0.38, 0.4, [0, 0, 0], ink);
  const count = fan ? 6 : 18;
  for (let i = 0; i < count; i++) {
    const blade = solid(g, bladeGeometry(fan), fan ? blue : gold);
    blade.rotation.y = i / count * Math.PI * 2;
    blade.userData.blade = true;
  }
  ring(g, 1.27, [0, -0.08, 0], ink, 0.018);
  ring(g, 0.4, [0, 0.21, 0], paper, 0.035);
}
/** Two thick sections move apart, retaining the physical boundary during a dive. */
function casing(g: T.Group, radius: number, height: number, horizontal = false, alpha = 0.82) {
  const frame = new T.Group();
  if (horizontal) frame.rotation.z = Math.PI / 2;
  g.add(frame);
  for (let i = 0; i < 2; i++) {
    const half = new T.Group();
    frame.add(half);
    const start = i * Math.PI;
    solid(half, new T.CylinderGeometry(radius, radius, height, 40, 1, true, start, Math.PI), paper, [0, 0, 0], alpha);
    solid(half, new T.CylinderGeometry(radius - 0.09, radius - 0.09, height, 40, 1, true, start, Math.PI), 0xb6c7e2, [0, 0, 0], alpha);
    for (const y of [-height / 2, height / 2]) {
      const rim = solid(half, new T.RingGeometry(radius - 0.09, radius, 40, 1, start, Math.PI), hot, [0, y, 0]);
      rim.rotation.x = Math.PI / 2;
    }
    for (const z of [-radius + 0.04, radius - 0.04]) box(half, [0.07, height, 0.09], [0, 0, z], hot);
    opens(half, [i === 0 ? radius * 0.8 : -radius * 0.8, 0, 0], [0, 0, i === 0 ? -0.12 : 0.12]);
  }
  return frame;
}
function fuelAssembly(g: T.Group, span: number, length: number, n = 7) {
  const geometry = new T.CylinderGeometry(span / n * 0.29, span / n * 0.29, length, 10), pose = new T.Object3D();
  // Set count explicitly: one draw call for the whole lattice.
  const lattice = new T.InstancedMesh(geometry, inkMaterial({color: gold}), n * n);
  let i = 0;
  for (let x = 0; x < n; x++) for (let z = 0; z < n; z++) {
    pose.position.set((x - (n - 1) / 2) * span / n, 0, (z - (n - 1) / 2) * span / n);
    pose.updateMatrix(); lattice.setMatrixAt(i++, pose.matrix);
  }
  g.add(lattice);
  for (const y of [-0.43, -0.15, 0.15, 0.43]) {
    for (const z of [-span / 2, span / 2]) box(g, [span, 0.06, 0.025], [0, y * length, z]);
    for (const x of [-span / 2, span / 2]) box(g, [0.025, 0.06, span], [x, y * length, 0]);
  }
  return lattice;
}
function steamGenerator(g: T.Group) {
  casing(g, 1.5, 4.3);
  const head = new T.Group(); g.add(head); head.position.y = 2.15;
  const dome = solid(head, new T.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), paper);
  dome.scale.y = 0.5;
  ring(head, 1.52, [0, 0, 0], ink, 0.05);
  opens(head, [0, 1.2, -0.3]);
  for (const z of [-0.45, 0, 0.45]) for (const x of [-0.65, 0, 0.65]) {
    pipe(g, [[x - 0.13, -1.9, z], [x - 0.13, 0.9, z], [x, 1.35, z], [x + 0.13, 0.9, z], [x + 0.13, -1.9, z]], 0.065, hot);
  }
  cyl(g, 1.3, 0.14, [0, -1.95, 0], paper);
  for (const y of [-1.1, -0.3, 0.5]) ring(g, 1.2, [0, y, 0], paper, 0.075);
  for (const x of [-0.7, 0.7]) {
    const nozzle = cyl(g, 0.25, 0.8, [x, -2.4, 0], x < 0 ? hot : blue);
    nozzle.userData.port = 'primary';
  }
  pipe(g, [[1.2, -1.2, 0], [1.8, -1.2, 0], [2.2, -1.2, 0]], 0.18, blue);
  pipe(g, [[0, 2.1, 0], [0, 2.7, 0], [0.8, 2.8, 0]], 0.2, gold);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    const separator = cyl(g, 0.12, 0.45, [Math.sin(a) * 0.9, 1.7, Math.cos(a) * 0.9]);
    separator.userData.separator = true;
  }
}
function build(kind: Kind, g: T.Group) {
  switch (kind) {
    case 'vessel':
    case 'pressurizer': {
      casing(g, 1.55, 4.1);
      const head = new T.Group(); g.add(head);
      ring(g, 1.58, [0, 2.1, 0]);
      ring(g, 1.58, [0, -2.1, 0]);
      const cap = solid(
        head,
        new T.SphereGeometry(1.55, 30, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        paper,
        [0, 2.6, 0],
      );
      cap.scale.y = 0.55;
      cyl(head, 1.7, 0.15, [0, 2.6, 0]);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        cyl(head, 0.07, 0.15, [1.55 * Math.cos(a), 2.75, 1.55 * Math.sin(a)], ink);
      }
      opens(head, [0, 1.3, -0.3]);
      if (kind === 'pressurizer') {
        cyl(g, 1.33, 1.3, [0, -0.9, 0], blue, 0.4);
        for (let x = -0.8; x <= 0.8; x += 0.4)
          pipe(
            g,
            [
              [x, -1.8, 0],
              [x, -0.5, 0],
              [x + 0.12, -0.4, 0],
              [x + 0.2, -1.8, 0],
            ],
            0.045,
            gold,
          );
      } else {
        for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) {
          const assembly = new T.Group(); assembly.position.set(x * 0.68, -0.25, z * 0.68); g.add(assembly);
          fuelAssembly(assembly, 0.59, 2.65, 5);
        }
        for (const y of [-1.72, 1.2]) ring(g, 1.2, [0, y, 0], paper, 0.08);
      }
      pipe(
        g,
        [
          [-1.4, 0.8, 0],
          [-2.2, 0.8, 0],
          [-2.4, 0.6, 0],
        ],
        0.22,
        hot,
      );
      pipe(
        g,
        [
          [1.4, -1, 0],
          [2.2, -1, 0],
          [2.4, -1, 0],
        ],
        0.22,
        blue,
      );
      break;
    }
    case 'core': {
      for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) + Math.abs(z) > 3) continue;
        const assembly = new T.Group(); assembly.position.set(x * 0.62, 0, z * 0.62); g.add(assembly);
        fuelAssembly(assembly, 0.53, 2.5, 7);
      }
      ring(g, 2, [0, -1.4, 0]);
      break;
    }
    case 'assembly': {
      for (let x = -3; x <= 3; x++)
        for (let z = -3; z <= 3; z++)
          cyl(g, 0.065, 4, [x * 0.24, 0, z * 0.24], x === 0 && z === 0 ? ink : gold);
      for (const y of [-1.75, -0.6, 0.6, 1.75]) {
        for (let i = -4; i <= 4; i++) {
          box(g, [0.022, 0.16, 1.8], [i * 0.23, y, 0]);
          box(g, [1.8, 0.16, 0.022], [0, y, i * 0.23]);
        }
      }
      box(g, [1.95, 0.18, 1.95], [0, -2.2, 0]);
      opens(box(g, [1.95, 0.18, 1.95], [0, 2.2, 0]), [0, 1.2, -0.15]);
      break;
    }
    case 'rod': {
      casing(g, 0.42, 5.6, false, 0.9);
      for (let i = 0; i < 17; i++) {
        cyl(g, 0.32, 0.23, [0, -2.3 + i * 0.25, 0], 0x7d7b84);
        ring(g, 0.32, [0, -2.42 + i * 0.25, 0], ink, 0.012);
      }
      for (let i = 0; i < 9; i++) ring(g, 0.26, [0, 2 + i * 0.065, 0], ink, 0.02);
      cyl(g, 0.43, 0.16, [0, -2.9, 0]);
      cyl(g, 0.43, 0.16, [0, 2.9, 0]);
      break;
    }
    case 'pellet': {
      const profile = [[0, -0.83], [0.95, -0.83], [1.12, -0.95], [1.22, -0.86], [1.25, -0.76], [1.25, 0.76], [1.22, 0.86], [1.12, 0.95], [0.95, 0.83], [0, 0.83]].map(([r, y]) => new T.Vector2(r, y));
      solid(g, new T.LatheGeometry(profile, 64), 0x858896);
      ring(g, 1.24, [0, 0.96, 0]);
      ring(g, 1.24, [0, -0.96, 0]);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const pts = [
          new T.Vector3(Math.cos(a) * 1.26, -0.82, Math.sin(a) * 1.26),
          new T.Vector3(Math.cos(a + 0.05) * 1.26, 0.85, Math.sin(a + 0.05) * 1.26),
        ];
        g.add(
          new T.Line(
            new T.BufferGeometry().setFromPoints(pts),
            new T.LineBasicMaterial({ color: ink, opacity: 0.22, transparent: true }),
          ),
        );
      }
      break;
    }
    case 'cladding':
    case 'tube':
    case 'wall':
    case 'gap': {
      const r = kind === 'wall' ? 1.55 : 0.9,
        h = kind === 'wall' ? 1.7 : 3.9;
      // A true open sector exposes the inner surface and the thickness.
      const outer = solid(
        g,
        new T.CylinderGeometry(r, r, h, 48, 1, true, 0, Math.PI * 1.55),
        kind === 'gap' ? blue : paper,
        [0, 0, 0],
        kind === 'gap' ? 0.2 : 1,
      );
      solid(
        g,
        new T.CylinderGeometry(r - 0.12, r - 0.12, h, 48, 1, true, 0, Math.PI * 1.55),
        0xb9c5d9,
      );
      for (const y of [-h / 2, h / 2]) {
        const cap = solid(g, new T.RingGeometry(r - 0.12, r, 48, 1, 0, Math.PI * 1.55), hot, [
          0,
          y,
          0,
        ]);
        cap.rotation.x = Math.PI / 2;
      }
      if (kind === 'tube') {
        pipe(
          g,
          [
            [0, -2.2, 0],
            [0, -1.5, 0],
            [0, 1.4, 0],
            [0, 2.4, 0],
          ],
          0.11,
          blue,
        );
      }
      outer.rotation.y = 0.2;
      break;
    }
    case 'grid': {
      for (let i = -3; i <= 3; i++) {
        box(g, [0.055, 0.65, 3], [i * 0.5, 0, 0]);
        box(g, [3, 0.65, 0.055], [0, 0, i * 0.5]);
      }
      break;
    }
    case 'control': {
      for (let x = -1; x <= 1; x++)
        for (let z = -1; z <= 1; z++) cyl(g, 0.11, 3.8, [x * 0.7, -0.3, z * 0.7], ink);
      box(g, [1.8, 0.2, 1.8], [0, 1.8, 0]);
      cyl(g, 0.14, 1.1, [0, 2.45, 0]);
      break;
    }
    case 'fluid': {
      for (let x = -1; x <= 1; x++) {
        pipe(
          g,
          [
            [x * 0.8, -2, 0],
            [x * 0.8 + 0.15, -0.7, 0],
            [x * 0.8 - 0.1, 0.7, 0],
            [x * 0.8, 2, 0],
          ],
          0.045,
          blue,
        );
        for (let y = -1.5; y <= 1.5; y += 1) {
          solid(g, new T.ConeGeometry(0.15, 0.3, 10), blue, [x * 0.8, y, 0]);
        }
      }
      box(g, [3, 4.5, 1.2], [0, 0, 0], blue, 0.06);
      break;
    }
    case 'shell':
    case 'waterbox': {
      box(g, [3.3, 0.2, 2.6], [0, -1.6, 0]);
      box(g, [0.18, 3.2, 2.6], [-1.65, 0, 0]);
      box(g, [3.3, 3.2, 0.18], [0, 0, -1.3]);
      box(g, [3.3, 0.18, 2.6], [0, 1.9, 0]);
      hatch(g, 3, 2.8, -1.19);
      pipe(
        g,
        [
          [1.1, -1, 0],
          [2, -1, 0],
          [2.4, -1, 0],
        ],
        0.25,
        blue,
      );
      break;
    }
    case 'bundle':
    case 'heater': {
      for (let i = -3; i <= 3; i++)
        for (let z = -1; z <= 1; z++) {
          pipe(
            g,
            [
              [i * 0.34, -1.9, z * 0.4],
              [i * 0.34, 1.3, z * 0.4],
              [i * 0.34 + 0.12, 1.65, z * 0.4],
              [i * 0.34 + 0.25, 1.3, z * 0.4],
              [i * 0.34 + 0.25, -1.9, z * 0.4],
            ],
            0.045,
            kind === 'heater' ? gold : hot,
          );
        }
      box(g, [2.9, 0.18, 1.8], [0, -2, 0]);
      break;
    }
    case 'pump': {
      casing(g, 1.3, 0.7);
      const wheel = new T.Group();
      g.add(wheel);
      rotor(wheel); wheel.userData.spin = 'pump';
      cyl(g, 0.15, 2, [0, 1, 0], ink);
      pipe(
        g,
        [
          [0, -0.7, 0],
          [0, -1.5, 0],
          [0, -1.8, 1],
        ],
        0.27,
        blue,
      );
      pipe(
        g,
        [
          [1.1, 0, 0],
          [1.8, 0, 0],
          [2.3, 0, 0],
        ],
        0.27,
        hot,
      );
      break;
    }
    case 'impeller':
    case 'fan':
      rotor(g, kind === 'fan');
      break;
    case 'blade':
    case 'nozzle': {
      const shape = new T.Shape();
      shape.moveTo(-0.8, -0.25);
      shape.bezierCurveTo(0.2, -0.5, 1.1, -0.1, 1, 0.15);
      shape.bezierCurveTo(0.3, 0.04, -0.1, 0.1, -0.8, 0.45);
      shape.closePath();
      const m = solid(
        g,
        new T.ExtrudeGeometry(shape, {
          depth: 3,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: 0.04,
          bevelThickness: 0.04,
        }),
        gold,
        [0, -1.5, 0],
      );
      m.rotation.x = Math.PI / 2;
      box(g, [1.35, 0.25, 0.7], [0, -1.75, 0], paper);
      break;
    }
    case 'motor':
    case 'generator': {
      const axis = cyl(g, 0.42, 4.1, [0, 0, 0], ink);
      axis.rotation.z = Math.PI / 2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const b = box(
          g,
          [2.8, 0.28, 0.28],
          [0, Math.sin(a) * 0.9, Math.cos(a) * 0.9],
          i % 2 ? hot : gold,
        );
        b.rotation.x = -a;
      }
      casing(g, 1.35, 3.1, true);
      box(g, [3.5, 0.2, 2.8], [0, -1.6, 0]);
      break;
    }
    case 'rotor':
    case 'shaft': {
      const axis = cyl(g, 0.2, 5.6, [0, 0, 0], ink);
      axis.rotation.z = Math.PI / 2;
      const hub = cyl(g, kind === 'shaft' ? 0.42 : 0.8, 2.6, [0, 0, 0], paper);
      hub.rotation.z = Math.PI / 2;
      if (kind === 'rotor')
        for (let i = 0; i < 8; i++) {
          const coil = ring(g, 0.92, [-1.1 + i * 0.3, 0, 0], hot, 0.09);
          coil.rotation.set(0, Math.PI / 2, 0);
        }
      break;
    }
    case 'coil':
    case 'wire':
    case 'insulation': {
      if (kind === 'wire' || kind === 'insulation') {
        cyl(g, 0.5, 3.7, [0, 0, 0], blue, 0.25);
        cyl(g, 0.35, 4.4, [0, 0, 0], hot);
        if (kind === 'wire')
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            cyl(g, 0.075, 4.6, [Math.sin(a) * 0.24, 0, Math.cos(a) * 0.24], gold);
          }
      } else {
        const pts: V[] = [];
        for (let i = 0; i < 480; i++) {
          const a = (i / 480) * Math.PI * 2 * 12;
          pts.push([Math.cos(a) * 1, Math.sin(a) * 0.65, -1.8 + (i / 480) * 3.6]);
        }
        pipe(g, pts, 0.065, hot);
      }
      break;
    }
    case 'stator': {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const b = box(
          g,
          [0.35, 2.8, 0.35],
          [Math.sin(a) * 1.2, 0, Math.cos(a) * 1.2],
          i % 2 ? hot : paper,
        );
        b.rotation.y = a;
      }
      ring(g, 1.45, [0, -1.5, 0]);
      ring(g, 1.45, [0, 1.5, 0]);
      break;
    }
    case 'turbine':
    case 'stage': {
      const axis = cyl(g, 0.14, 5, [0, 0, 0], ink);
      axis.rotation.z = Math.PI / 2;
      if (kind === 'turbine') casing(g, 1.55, 4.1, true);
      for (let j = 0; j < (kind === 'stage' ? 2 : 6); j++) {
        const disk = new T.Group();
        disk.position.x = kind === 'stage' ? -0.7 + j * 1.4 : -1.7 + j * 0.65;
        disk.rotation.z = Math.PI / 2;
        disk.scale.setScalar(kind === 'stage' ? 1 : 0.65 + j * 0.08);
        g.add(disk);
        rotor(disk);
        if (kind === 'turbine' || j === 1) disk.userData.spin = 'shaft';
      }
      break;
    }
    case 'condenser':
    case 'cooling': {
      box(g, [4, 0.15, 2.6], [0, -1.3, 0]);
      opens(box(g, [4, 0.12, 2.6], [0, 1.3, 0]), [0, 1.1, -0.3], [0.1, 0, 0]);
      opens(box(g, [4, 2.6, 0.12], [0, 0, 1.3], paper, 0.7), [0, 0, 0.9]);
      box(g, [0.15, 2.4, 2.6], [-2, 0, 0]);
      box(g, [0.15, 2.4, 2.6], [2, 0, 0]);
      for (let y = -0.8; y <= 0.8; y += 0.4)
        for (let z = -0.8; z <= 0.8; z += 0.4)
          pipe(
            g,
            [
              [-1.9, y, z],
              [1.9, y, z],
            ],
            0.05,
            blue,
          );
      if (kind === 'cooling') {
        for (let y = -1; y <= 1; y += 0.3) box(g, [3.8, 0.025, 2.4], [0, y, 0]);
        const f = new T.Group();
        f.position.y = 1.5;
        g.add(f);
        rotor(f, true);
        f.userData.fan = true; f.userData.spin = 'cooling';
      }
      break;
    }
    case 'spray': {
      cyl(g, 0.4, 0.5, [0, 1.7, 0]);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        pipe(
          g,
          [
            [0, 1.5, 0],
            [Math.sin(a) * 0.7, 0, Math.cos(a) * 0.7],
            [Math.sin(a) * 1.5, -1.5, Math.cos(a) * 1.5],
          ],
          0.025,
          blue,
        );
      }
      break;
    }
    case 'bearing':
    case 'seal': {
      for (let i = 0; i < 3; i++) {
        const r = ring(g, 1, [0, -0.8 + i * 0.8, 0], i === 1 ? gold : paper, 0.22);
        r.rotation.x = Math.PI / 2;
      }
      if (kind === 'bearing')
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          solid(g, new T.SphereGeometry(0.16, 12, 10), ink, [Math.sin(a), 0, Math.cos(a)]);
        }
      break;
    }
  }
}
export function buildDetail(part: Part) {
  const root = new T.Group();
  if (part.kind === 'bundle' && ['condenser', 'cooling'].includes(part.equipment)) {
    for (const y of [-0.8, -0.4, 0, 0.4, 0.8]) for (const z of [-0.8, -0.4, 0, 0.4, 0.8])
      pipe(root, [[-1.9, y, z], [1.9, y, z]], 0.055, blue);
    for (const x of [-2, 2]) box(root, [0.12, 2.1, 2.1], [x, 0, 0], paper, 0.4);
  } else if (part.id === 'steam') steamGenerator(root);
  else if (part.id.endsWith('/ceramic') || part.id.endsWith('/grain')) {
    const n = part.id.endsWith('/grain') ? 1 : 17;
    for (let i = 0; i < n; i++) {
      const a = i * 2.399;
      const r = n === 1 ? 0 : Math.sqrt(i / n) * 1.6;
      const m = solid(
        root,
        new T.DodecahedronGeometry(n === 1 ? 1.55 : 0.55, 0),
        i % 3 === 0 ? 0x646674 : 0x9b9ba3,
        [Math.cos(a) * r, Math.sin(i * 3) * 0.4, Math.sin(a) * r],
      );
      m.rotation.set(i * 0.3, i * 0.7, 0);
    }
  } else if (part.id.endsWith('/absorber')) {
    cyl(root, 0.42, 4.6, [0, 0, 0], paper, 0.2);
    cyl(root, 0.3, 4.3, [0, 0, 0], ink);
    cyl(root, 0.45, 0.15, [0, 2.4, 0]);
  } else if (part.id.includes('/heaters/element') && part.kind === 'rod') {
    cyl(root, 0.55, 4.8, [0, 0, 0], paper, 0.2);
    const c = new T.Group();
    c.rotation.x = Math.PI / 2;
    root.add(c);
    build('coil', c);
  } else build(part.kind, root);
  const child = (key: string) => part.children.find((p) => p.id.endsWith('/' + key))?.id;
  if (part.kind === 'core' && !part.id.endsWith('/ceramic')) {
    root.children.filter(o => o instanceof T.Group).forEach(o => {o.userData.child = child('assembly'); o.traverse(m => {if (m instanceof T.Mesh) m.userData.pickGroup = o;});});
  }
  root.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const geo = o.geometry,
      material = o.material as T.MeshToonMaterial;
    let target: string | undefined;
    if (part.kind === 'core' && !part.id.endsWith('/ceramic')) target = child('assembly');
    if (part.kind === 'assembly')
      target = geo instanceof T.CylinderGeometry ? child('rod') : child('grid');
    if (part.id.endsWith('/assembly/rod')) {
      if (geo instanceof T.CylinderGeometry)
        target = geo.parameters.radiusTop < 0.4 ? child('pellet') : child('cladding');
      if (geo instanceof T.TorusGeometry)
        target = o.position.y > 1.8 ? child('plenum') : child('gap');
      if (geo instanceof T.RingGeometry) target = child('cladding');
      if (geo instanceof T.CircleGeometry) target = child('pellet');
    }
    if (part.kind === 'bundle') target = geo instanceof T.TubeGeometry ? child('tube') : undefined;
    if (part.kind === 'impeller' || part.kind === 'fan')
      target = o.userData.blade ? child('blade') : undefined;
    if (part.kind === 'coil') target = child('conductor');
    if (part.kind === 'pellet') target = child('ceramic');
    if (part.id.endsWith('/ceramic')) target = child('grain');
    if (part.kind === 'stator' && geo instanceof T.BoxGeometry)
      target = material.color.getHex() === hot ? child('winding') : child('core');
    if (part.kind === 'rotor')
      target = geo instanceof T.TorusGeometry ? child('winding') : child('shaft');
    if (part.kind === 'generator' || part.kind === 'motor') {
      if (geo instanceof T.CylinderGeometry)
        target = geo.parameters.radiusTop < 0.5 ? child('rotor') : child('stator');
      if (geo instanceof T.BoxGeometry && material.color.getHex() !== paper)
        target = child('stator');
    }
    if (part.kind === 'turbine')
      target = geo instanceof T.CylinderGeometry ? child('shaft') : child('stage');
    if (part.kind === 'stage' && o.userData.blade)
      target = (o.parent?.position.x ?? 0) > 0 ? child('moving') : child('fixed');
    if (part.kind === 'wire') target = material.opacity < 1 ? child('insulation') : undefined;
    if (part.kind === 'tube')
      target = geo instanceof T.TubeGeometry ? child('inside') : child('wall');
    if (part.id === 'steam') target = geo instanceof T.TubeGeometry ? child('bundle') : o.userData.separator ? child('separator') : child('secondary');
    if (part.kind === 'pump') target = geo instanceof T.CylinderGeometry && geo.parameters.radiusTop < 0.2 ? (child('motor') ?? child('shaft')) : (child('hydraulics') ?? child('impeller'));
    if (part.kind === 'pressurizer') target = geo instanceof T.TubeGeometry ? (geo.parameters.radius < 0.1 ? child('heaters') : child('surge')) : child('steamspace');
    if (part.kind === 'condenser') target = geo instanceof T.TubeGeometry ? child('bundle') : Math.abs(o.position.x) > 1.8 ? child('waterbox') : o.position.y < -1 ? child('hotwell') : child('bundle');
    if (part.kind === 'cooling') target = o.parent?.userData.fan ? child('fan') : child('exchanger');
    if (part.kind === 'vessel' && part.id === 'reactor')
      target =
        geo instanceof T.BoxGeometry ||
        (geo instanceof T.CylinderGeometry && geo.parameters.radiusTop < 0.2)
          ? child('core')
          : child('boundary');
    if (target) o.userData.child = target;
  });
  root.userData.part = part.id;
  return root;
}
