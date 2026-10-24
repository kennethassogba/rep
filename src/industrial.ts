import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { opens } from "./section.ts";
import { bladeGeometry } from "./detail.ts";
import type { Route } from "./interior.ts";
import type { Action } from "./startup.ts";
export type V = [number, number, number];
export const palette = {
  enamel: 0xf1f2ee,
  navy: 0x173a56,
  orange: 0xde5d26,
  steel: 0x9aaab5,
  dark: 0x243139,
  blue: 0x377da8,
  copper: 0xad6a3e,
  water: 0x6badd1,
};
const materials = new Map<string, T.MeshStandardMaterial>();
function material(color: number, metal = false, opacity = 1) {
  const key = `${color}-${metal}-${opacity}`;
  if (!materials.has(key))
    materials.set(
      key,
      new T.MeshStandardMaterial({
        color,
        metalness: metal ? 0.72 : 0.12,
        roughness: metal ? 0.38 : 0.52,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity === 1,
        side: T.DoubleSide,
      }),
    );
  // Per-part material ownership keeps section opacity independent.
  return materials.get(key)!.clone();
}
function mesh(
  parent: T.Object3D,
  geometry: T.BufferGeometry,
  color: number,
  at: V = [0, 0, 0],
  metal = false,
  opacity = 1,
) {
  const m = new T.Mesh(geometry, material(color, metal, opacity));
  m.position.set(...at);
  m.castShadow = opacity === 1;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function box(
  parent: T.Object3D,
  size: V,
  at: V,
  color = palette.enamel,
  radius = 0.05,
) {
  return mesh(
    parent,
    new RoundedBoxGeometry(
      ...size,
      2,
      Math.min(radius, ...size.map((s) => s / 3)),
    ),
    color,
    at,
  );
}
function cylinder(
  parent: T.Object3D,
  r: number,
  h: number,
  at: V,
  color = palette.steel,
  metal = true,
) {
  return mesh(parent, new T.CylinderGeometry(r, r, h, 48), color, at, metal);
}
function torus(
  parent: T.Object3D,
  r: number,
  thickness: number,
  at: V,
  color = palette.steel,
) {
  const m = mesh(
    parent,
    new T.TorusGeometry(r, thickness, 8, 48),
    color,
    at,
    true,
  );
  m.rotation.x = Math.PI / 2;
  return m;
}
function bolts(parent: T.Object3D, r: number, y: number, n = 16) {
  const b = new T.InstancedMesh(
      new T.CylinderGeometry(0.055, 0.055, 0.1, 6),
      material(palette.dark, true),
      n,
    ),
    pose = new T.Object3D();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pose.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    pose.updateMatrix();
    b.setMatrixAt(i, pose.matrix);
  }
  b.castShadow = true;
  parent.add(b);
  return b;
}
function tube(
  parent: T.Object3D,
  points: V[],
  r: number,
  color: number,
  opacity = 1,
) {
  const curve = new T.CatmullRomCurve3(
    points.map((p) => new T.Vector3(...p)),
    false,
    "centripetal",
  );
  return mesh(
    parent,
    new T.TubeGeometry(curve, 64, r, 12, false),
    color,
    [0, 0, 0],
    true,
    opacity,
  );
}
function flange(parent: T.Object3D, r: number, y: number) {
  cylinder(parent, r, 0.12, [0, y, 0], palette.steel);
  bolts(parent, r * 0.87, y + 0.1);
  torus(parent, r * 0.91, 0.023, [0, y - 0.08, 0], palette.dark);
}
function hull(
  parent: T.Group,
  r: number,
  h: number,
  at: V,
  horizontal = false,
  color = palette.enamel,
) {
  const frame = new T.Group();
  frame.position.set(...at);
  if (horizontal) frame.rotation.z = Math.PI / 2;
  parent.add(frame);
  for (let i = 0; i < 2; i++) {
    const shell = new T.Group();
    frame.add(shell);
    const start = i * Math.PI;
    mesh(
      shell,
      new T.CylinderGeometry(r, r, h, 48, 1, true, start, Math.PI),
      color,
    );
    mesh(
      shell,
      new T.CylinderGeometry(
        r - 0.08,
        r - 0.08,
        h,
        48,
        1,
        true,
        start,
        Math.PI,
      ),
      palette.dark,
      [0, 0, 0],
      true,
    );
    for (const y of [-h / 2, h / 2]) {
      const lip = mesh(
        shell,
        new T.RingGeometry(r - 0.08, r + 0.035, 48, 1, start, Math.PI),
        palette.orange,
        [0, y, 0],
      );
      lip.rotation.x = Math.PI / 2;
    }
    for (const z of [-r, r])
      box(shell, [0.07, h, 0.08], [0, 0, z], palette.steel, 0.015);
    opens(
      shell,
      [i === 0 ? r * 1.25 : -r * 1.25, 0, -0.2],
      [0, 0, i === 0 ? -0.1 : 0.1],
    );
  }
  return frame;
}
function fan(parent: T.Group, r: number, at: V, horizontal = false) {
  const g = new T.Group();
  g.position.set(...at);
  if (horizontal) g.rotation.z = Math.PI / 2;
  parent.add(g);
  cylinder(g, r * 0.22, 0.23, [0, 0, 0], palette.dark);
  const count = horizontal ? 18 : 9;
  const blade = bladeGeometry(!horizontal);
  for (let i = 0; i < count; i++) {
    const b = mesh(g, blade, palette.steel, [0, 0, 0], true);
    b.scale.setScalar(r / 1.27);
    b.rotation.y = (i / count) * Math.PI * 2;
  }
  torus(g, r, 0.025, [0, -0.03, 0], palette.dark);
  return g;
}
function ribs(parent: T.Group, r: number, length: number, count = 16) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const fin = box(
      parent,
      [length, 0.07, 0.16],
      [0, Math.sin(a) * r, Math.cos(a) * r],
      palette.navy,
      0.01,
    );
    fin.rotation.x = -a;
  }
}
function stand(g: T.Group, width: number, length: number) {
  for (const x of [-width / 2, width / 2])
    box(g, [0.16, 0.4, length], [x, 0.15, 0], palette.dark, 0.02);
}
function actuator(parent: T.Group, at: V, action: Action) {
  const g = new T.Group();
  g.position.set(...at);
  parent.add(g);
  g.userData.action = action;
  cylinder(g, 0.2, 0.12, [0, 0, 0], palette.dark);
  const lever = new T.Group();
  g.add(lever);
  cylinder(lever, 0.045, 0.35, [0, 0.18, 0], palette.steel);
  box(lever, [0.3, 0.14, 0.16], [0, 0.4, 0], palette.orange, 0.04);
  lever.rotation.z = -0.45;
  lever.userData.actuator = action;
  g.traverse((o) => (o.userData.action = action));
  return lever;
}
export const equipmentPositions: Record<string, V> = {
  reactor: [-5.1, 0, 0],
  steam: [-1.1, 0, -2.3],
  pressurizer: [-5.4, 0, -3.4],
  primary: [-2.2, 0, 1.25],
  turbine: [3.1, 0, -1.2],
  generator: [6.4, 0, -1.2],
  condenser: [3.2, 0, 2],
  feed: [0, 0, 3],
  cooling: [-4.4, 0, 3.8],
};
export type Machine = {
  root: T.Group;
  equipment: Map<string, T.Group>;
  anchors: Record<Action, T.Vector3>;
  routes: Route[];
  interiors: Map<string, Route[]>;
  rotating: {
    object: T.Object3D;
    kind: "primary" | "feed" | "cooling" | "shaft";
  }[];
  actuators: T.Object3D[];
  fuel: T.MeshStandardMaterial[];
  gauges: { needle: T.Object3D; kind: "primary" | "secondary" | "electric" }[];
};
export function buildMachine(): Machine {
  const root = new T.Group(),
    equipment = new Map<string, T.Group>(),
    rotating: Machine["rotating"] = [],
    actuators: T.Object3D[] = [],
    fuel: T.MeshStandardMaterial[] = [],
    gauges: Machine["gauges"] = [];
  const group = (id: string) => {
    const g = new T.Group();
    g.position.set(...equipmentPositions[id]);
    g.userData.equipment = id;
    root.add(g);
    equipment.set(id, g);
    return g;
  };
  // A single enamel chassis carries the whole energy chain.
  box(root, [16.9, 0.45, 10.2], [0.35, -0.35, 0.3], palette.navy, 0.23);
  box(root, [16.65, 0.12, 9.95], [0.35, -0.07, 0.3], palette.enamel, 0.14);
  for (const x of [-7.5, 8.1])
    for (const z of [-3.9, 4.5])
      cylinder(root, 0.3, 0.13, [x, -0.62, z], palette.dark);
  for (const x of [-7.7, 8.3])
    for (const z of [-4.3, 4.9])
      cylinder(root, 0.08, 0.025, [x, 0.01, z], palette.dark);
  // Reactor pressure boundary and its removable crown.
  const reactor = group("reactor");
  for (const x of [-0.8, 0.8])
    for (const z of [-0.8, 0.8])
      cylinder(reactor, 0.12, 0.8, [x, 0.4, z], palette.dark);
  hull(reactor, 1.25, 3.4, [0, 2.25, 0]).userData.child = "reactor/boundary";
  const bottom = mesh(
    reactor,
    new T.SphereGeometry(
      1.25,
      40,
      20,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    ),
    palette.navy,
    [0, 0.55, 0],
  );
  bottom.scale.y = 0.38;
  flange(reactor, 1.4, 3.98);
  const crown = new T.Group();
  reactor.add(crown);
  crown.position.y = 4.05;
  crown.userData.child = "reactor/controls";
  const dome = mesh(
    crown,
    new T.SphereGeometry(1.25, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    palette.enamel,
  );
  dome.scale.y = 0.48;
  for (const x of [-0.55, 0, 0.55])
    for (const z of [-0.55, 0, 0.55]) {
      cylinder(crown, 0.07, 0.6, [x, 0.6, z], palette.steel);
      cylinder(crown, 0.12, 0.17, [x, 0.92, z], palette.navy);
    }
  opens(crown, [0, 1.25, -0.1]);
  const core = new T.Group();
  reactor.add(core);
  core.position.y = 2.12;
  core.userData.child = "reactor/core";
  const rods = new T.InstancedMesh(
      new T.CylinderGeometry(0.04, 0.04, 2.5, 10),
      material(palette.copper, true),
      13 * 13,
    ),
    pose = new T.Object3D();
  let ri = 0;
  for (let x = -6; x <= 6; x++)
    for (let z = -6; z <= 6; z++) {
      pose.position.set(x * 0.12, 0, z * 0.12);
      pose.updateMatrix();
      rods.setMatrixAt(ri++, pose.matrix);
    }
  rods.castShadow = true;
  core.add(rods);
  fuel.push(rods.material as T.MeshStandardMaterial);
  for (const y of [-1.15, -0.4, 0.4, 1.15])
    for (const z of [-0.84, 0.84])
      box(core, [1.7, 0.08, 0.04], [0, y, z], palette.steel, 0.01);
  flange(reactor, 1.22, 0.55);
  actuators.push(actuator(reactor, [0, 4.98, 0], "heat"));
  // Pressurizer: opaque boundary, water and steam spaces visible when sectioned.
  const pressure = group("pressurizer");
  hull(pressure, 0.61, 2.6, [0, 1.9, 0], false, palette.navy);
  flange(pressure, 0.66, 3.2);
  flange(pressure, 0.66, 0.6);
  cylinder(pressure, 0.48, 1.1, [0, 1.2, 0], palette.blue, false);
  for (const x of [-0.25, 0, 0.25])
    tube(
      pressure,
      [
        [x, 0.7, 0],
        [x, 1.4, 0],
        [x + 0.08, 1.5, 0],
        [x + 0.15, 0.7, 0],
      ],
      0.025,
      palette.copper,
    ).userData.child = "pressurizer/heaters";
  // U-tube steam generator, riser and secondary steam space.
  const sg = group("steam");
  hull(sg, 0.95, 4, [0, 2.6, 0]);
  flange(sg, 1.03, 0.6);
  flange(sg, 1.03, 4.6);
  const sgCap = new T.Group();
  sg.add(sgCap);
  sgCap.position.y = 4.65;
  const sgDome = mesh(
    sgCap,
    new T.SphereGeometry(0.95, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    palette.orange,
  );
  sgDome.scale.y = 0.55;
  opens(sgCap, [0, 0.9, 0]);
  for (const z of [-0.45, -0.15, 0.15, 0.45])
    for (const x of [-0.5, 0, 0.5])
      tube(
        sg,
        [
          [x - 0.08, 0.7, z],
          [x - 0.08, 3.4, z],
          [x, 3.65, z],
          [x + 0.08, 3.4, z],
          [x + 0.08, 0.7, z],
        ],
        0.045,
        palette.copper,
        0.7,
      ).userData.child = "steam/bundle";
  cylinder(sg, 0.83, 0.15, [0, 0.65, 0]).userData.child = "steam/tubesheet";
  for (const y of [1.3, 2.3, 3.3]) torus(sg, 0.83, 0.035, [0, y, 0]);
  // Primary and feed pumps, vertical motors with machined cooling fins.
  for (const id of ["primary", "feed"]) {
    const g = group(id),
      scale = id === "feed" ? 0.7 : 1;
    g.scale.setScalar(scale);
    stand(g, 0.9, 1.2);
    hull(g, 0.58, 0.55, [0, 0.7, 0], false, palette.orange);
    const wheel = fan(g, 0.49, [0, 0.75, 0]);
    wheel.userData.child = id + "/hydraulics";
    rotating.push({
      object: wheel,
      kind: id === "primary" ? "primary" : "feed",
    });
    cylinder(g, 0.1, 1, [0, 1.25, 0]);
    cylinder(g, 0.38, 1, [0, 1.8, 0], palette.navy, false).userData.child =
      id + "/motor";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const fin = box(
        g,
        [0.05, 0.85, 0.14],
        [Math.sin(a) * 0.4, 1.8, Math.cos(a) * 0.4],
        palette.navy,
        0.015,
      );
      fin.rotation.y = a;
    }
    cylinder(g, 0.44, 0.12, [0, 2.35, 0], palette.steel);
    if (id === "primary") actuators.push(actuator(g, [0, 2.45, 0], "primary"));
  }
  // Split turbine casing and an increasing train of curved blade rows.
  const turbine = group("turbine");
  stand(turbine, 2.8, 1.6);
  const rotor = new T.Group();
  rotor.position.y = 1.5;
  turbine.add(rotor);
  const shaft = cylinder(rotor, 0.15, 4.7, [0, 0, 0]);
  shaft.rotation.z = Math.PI / 2;
  shaft.userData.child = "turbine/shaft";
  for (let j = 0; j < 7; j++) {
    const row = fan(rotor, 0.49 + j * 0.085, [-1.6 + j * 0.48, 0, 0], true);
    row.userData.child = "turbine/stage";
    rotating.push({ object: row, kind: "shaft" });
    const fixed = torus(
      rotor,
      0.54 + j * 0.085,
      0.025,
      [-1.72 + j * 0.48, 0, 0],
      palette.dark,
    );
    fixed.rotation.set(0, Math.PI / 2, 0);
  }
  hull(turbine, 1.12, 3.95, [0, 1.5, 0], true, palette.orange);
  for (const x of [-1.8, 1.8]) {
    const journal = cylinder(
      turbine,
      0.38,
      0.32,
      [x, 1.5, 0],
      palette.navy,
      false,
    );
    journal.rotation.z = Math.PI / 2;
    box(turbine, [0.3, 1.2, 0.7], [x, 0.65, 0], palette.dark);
  }
  actuators.push(actuator(turbine, [-1.6, 2.85, 0], "steam"));
  // Alternator: enamel stator, copper winding and rotating field.
  const generator = group("generator");
  stand(generator, 1.6, 1.4);
  const stator = new T.Group();
  stator.position.y = 1.4;
  stator.userData.child = "generator/stator";
  generator.add(stator);
  ribs(stator, 0.86, 2.15, 22);
  hull(generator, 0.92, 2.2, [0, 1.4, 0], true, palette.navy);
  const field = new T.Group();
  field.position.y = 1.4;
  field.userData.child = "generator/rotor";
  field.rotation.z = Math.PI / 2;
  generator.add(field);
  cylinder(field, 0.35, 2.9, [0, 0, 0]);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    box(
      field,
      [0.13, 1.9, 0.18],
      [Math.sin(a) * 0.58, 0, Math.cos(a) * 0.58],
      palette.copper,
      0.035,
    );
  }
  rotating.push({ object: field, kind: "shaft" });
  for (const x of [-1.2, 1.2]) {
    const ring = torus(generator, 0.75, 0.12, [x, 1.4, 0], palette.copper);
    ring.rotation.set(0, Math.PI / 2, 0);
  }
  actuators.push(actuator(generator, [0, 2.45, 0], "load"));
  // Condenser with two separate fluid spaces.
  const condenser = group("condenser");
  box(condenser, [3.8, 0.2, 1.7], [0, 0.35, 0], palette.navy);
  for (const x of [-1.9, 1.9])
    box(condenser, [0.22, 1.4, 1.8], [x, 1, 0], palette.navy);
  const lid = box(condenser, [4.1, 0.14, 1.95], [0, 1.75, 0]);
  opens(lid, [0, 0.85, -0.2], [0.12, 0, 0]);
  const front = box(condenser, [3.8, 1.25, 0.1], [0, 1, 0.9]);
  opens(front, [0, 0, 1], [0.05, 0, 0]);
  for (let y = 0.55; y < 1.6; y += 0.21)
    for (let z = -0.55; z <= 0.55; z += 0.22)
      tube(
        condenser,
        [
          [-1.8, y, z],
          [1.8, y, z],
        ],
        0.035,
        palette.steel,
        0.6,
      ).userData.child = "condenser/bundle";
  // Dry cooling unit; the source remains the model's ideal heat sink.
  const cooling = group("cooling");
  box(cooling, [3, 0.2, 1.8], [0, 0.2, 0], palette.dark);
  for (let y = 0.4; y < 1.5; y += 0.1)
    box(cooling, [2.8, 0.025, 1.6], [0, y, 0], palette.steel, 0.006);
  box(cooling, [3.05, 0.16, 1.85], [0, 1.65, 0], palette.navy);
  for (const x of [-0.75, 0.75]) {
    const f = fan(cooling, 0.61, [x, 1.85, 0]);
    f.userData.child = "cooling/fan";
    rotating.push({ object: f, kind: "cooling" });
    torus(cooling, 0.65, 0.035, [x, 1.94, 0], palette.dark);
  }
  actuators.push(actuator(cooling, [1.22, 1.85, 0.65], "cooling"));
  // Three physical dials set into the front edge, with needles driven by the model.
  for (const [i, kind] of (
    ["primary", "secondary", "electric"] as const
  ).entries()) {
    const dial = new T.Group();
    dial.position.set(-0.85 + i * 1.5, 0.12, 4.75);
    dial.rotation.x = 0.35;
    root.add(dial);
    cylinder(dial, 0.43, 0.1, [0, 0, 0], palette.dark);
    cylinder(dial, 0.38, 0.025, [0, 0.07, 0], palette.enamel, false);
    for (let j = 0; j < 17; j++) {
      const a = -Math.PI * 0.75 + (j / 16) * Math.PI * 1.5;
      const tick = box(
        dial,
        [0.018, 0.008, j % 4 === 0 ? 0.075 : 0.04],
        [Math.sin(a) * 0.31, 0.09, Math.cos(a) * 0.31],
        palette.dark,
        0.002,
      );
      tick.rotation.y = a;
    }
    const needle = new T.Group();
    dial.add(needle);
    box(needle, [0.022, 0.018, 0.3], [0, 0.12, 0.13], palette.orange, 0.002);
    cylinder(needle, 0.035, 0.025, [0, 0.12, 0], palette.dark);
    gauges.push({ needle, kind });
  }
  const routes: Route[] = [];
  const route = (points: V[], kind: Route["kind"], color: number, r = 0.13) => {
    tube(root, points, r, palette.steel, 0.45);
    routes.push({
      points,
      kind,
      color,
      endColor: kind === "primary" ? palette.orange : color,
    });
  };
  route(
    [
      [-6.1, 2.85, 0],
      [-6.8, 2.85, -1.2],
      [-4, 2.85, -2.3],
      [-1.6, 0.75, -2.3],
    ],
    "primary",
    palette.orange,
    0.18,
  );
  route(
    [
      [-0.6, 0.75, -2.3],
      [-0.1, 0.6, -1],
      [-2.2, 0.7, 1.25],
    ],
    "primary",
    palette.blue,
    0.17,
  );
  route(
    [
      [-2.2, 0.7, 1.25],
      [-3.3, 0.7, 1.4],
      [-4, 0.85, 0],
    ],
    "primary",
    palette.blue,
    0.17,
  );
  route(
    [
      [-1.1, 4.95, -2.3],
      [0, 5.15, -2.3],
      [0.8, 4.5, -2.3],
      [1.5, 2.9, -1.2],
    ],
    "steam",
    palette.orange,
    0.17,
  );
  route(
    [
      [4.5, 1.4, -1.2],
      [5.2, 1, -0.1],
      [4.4, 1.5, 2],
    ],
    "steam",
    palette.orange,
    0.25,
  );
  route(
    [
      [1.4, 0.55, 2],
      [0, 0.55, 3],
    ],
    "feed",
    palette.blue,
    0.09,
  );
  route(
    [
      [0, 0.55, 3],
      [-0.5, 0.55, 2],
      [-2.1, 1.15, -2.3],
    ],
    "feed",
    palette.blue,
    0.1,
  );
  route(
    [
      [-3, 0.4, 3.8],
      [-2, 0.4, 4.1],
      [1.3, 0.8, 2],
    ],
    "cooling",
    palette.blue,
    0.11,
  );
  route(
    [
      [5.1, 0.8, 2],
      [5.5, 0.4, 3.9],
      [2.8, 0.4, 4.15],
      [-4.5, 0.4, 4.6],
      [-5.6, 0.5, 3.8],
    ],
    "cooling",
    palette.blue,
    0.11,
  );
  tube(
    root,
    [
      [-5.5, 2.9, 0],
      [-6.6, 2.5, -1],
      [-5.4, 0.65, -3.4],
    ],
    0.08,
    palette.steel,
  );
  // The same transport geometry stays attached to equipment during a camera dive.
  const interiors = new Map<string, Route[]>();
  const inside = (
    id: string,
    points: V[],
    kind: Route["kind"],
    color: number,
    endColor = color,
  ) => {
    if (!interiors.has(id)) interiors.set(id, []);
    interiors.get(id)!.push({ points, kind, color, endColor });
  };
  for (const z of [-0.45, 0, 0.45])
    for (const x of [-0.45, 0.45]) {
      inside(
        "reactor",
        [
          [1.1, 0.85, z],
          [0.85, 0.55, z],
          [x, 0.6, z],
          [x, 2, z],
          [x, 3.45, z],
          [-1.1, 2.85, z],
        ],
        "primary",
        palette.blue,
        palette.orange,
      );
      inside(
        "reactor",
        [
          [x, 2, z],
          [x + 0.2, 2, z],
        ],
        "heat",
        palette.orange,
      );
    }
  for (const z of [-0.45, 0.15, 0.45])
    for (const x of [-0.5, 0, 0.5])
      inside(
        "steam",
        [
          [x - 0.08, 0.7, z],
          [x - 0.08, 3.4, z],
          [x, 3.65, z],
          [x + 0.08, 3.4, z],
          [x + 0.08, 0.7, z],
        ],
        "primary",
        palette.orange,
        palette.blue,
      );
  for (const z of [-0.65, 0.65])
    inside(
      "steam",
      [
        [0.65, 1, z],
        [0.6, 2.5, z],
        [0, 4.2, 0],
        [0, 4.95, 0],
      ],
      "steam",
      palette.blue,
      palette.orange,
    );
  for (const y of [1.2, 2.2, 3.2])
    inside(
      "steam",
      [
        [0, y, 0],
        [0.18, y, 0.2],
        [0.4, y, 0.4],
      ],
      "exchange",
      palette.orange,
    );
  for (const id of ["primary", "feed"])
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      inside(
        id,
        [
          [0, 0.3, 0],
          [0, 0.7, 0],
          [Math.sin(a) * 0.4, 0.75, Math.cos(a) * 0.4],
          [0.6, 0.7, 0.1],
        ],
        id === "primary" ? "primary" : "feed",
        palette.blue,
      );
    }
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3,
      points: V[] = [];
    for (let j = 0; j <= 24; j++) {
      const t = j / 24,
        r = 0.4 + 0.55 * t;
      points.push([
        -1.65 + t * 3.3,
        1.5 + Math.sin(a + t * 2) * r,
        Math.cos(a + t * 2) * r,
      ]);
    }
    inside("turbine", points, "steam", palette.orange, palette.blue);
  }
  for (const y of [0.6, 1, 1.4])
    for (const z of [-0.44, 0, 0.44])
      inside(
        "condenser",
        [
          [-1.8, y, z],
          [1.8, y, z],
        ],
        "cooling",
        palette.blue,
        palette.copper,
      );
  for (const x of [-1.2, 0, 1.2])
    inside(
      "condenser",
      [
        [x, 1.6, 0.2],
        [x, 1, 0.3],
        [x, 0.4, 0.2],
      ],
      "steam",
      palette.orange,
      palette.blue,
    );
  for (const z of [-0.5, 0, 0.5])
    inside(
      "cooling",
      [
        [-1.3, 0.7, z],
        [0, 0.7, z],
        [1.3, 0.7, z],
      ],
      "cooling",
      palette.copper,
      palette.blue,
    );
  for (const x of [-0.75, 0.75])
    inside(
      "cooling",
      [
        [x, 0.6, 0],
        [x, 1.8, 0],
        [x, 2.5, 0],
      ],
      "rejected",
      palette.orange,
    );
  for (const x of [-0.65, 0, 0.65]) {
    const points: V[] = [];
    for (let j = 0; j <= 40; j++) {
      const a = (j / 40) * Math.PI * 2;
      points.push([x, 1.4 + Math.sin(a) * 0.65, Math.cos(a) * 0.65]);
    }
    inside("generator", points, "electric", palette.orange);
  }
  route(
    [
      [7.5, 1.4, -1.2],
      [8, 0.25, -0.8],
      [8, 0.25, 3.4],
    ],
    "electric",
    palette.orange,
    0.065,
  );
  box(root, [0.6, 0.35, 0.7], [8, 0.2, 3.8], palette.navy);
  const anchors: Record<Action, T.Vector3> = {
    cooling: new T.Vector3(-3.18, 2.25, 4.45),
    primary: new T.Vector3(-2.2, 2.9, 1.25),
    heat: new T.Vector3(-5.1, 5.45, 0),
    steam: new T.Vector3(1.5, 3.3, -1.2),
    load: new T.Vector3(6.4, 2.85, -1.2),
  };
  root.updateMatrixWorld(true);
  return {
    root,
    equipment,
    anchors,
    routes,
    interiors,
    rotating,
    actuators,
    fuel,
    gauges,
  };
}
