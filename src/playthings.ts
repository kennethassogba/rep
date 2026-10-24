import * as T from "three";
import { box, palette, type Machine } from "./industrial.ts";
export type Addon = "eyes" | "baguette" | "disco";
const mat = (color: number) =>
  new T.MeshStandardMaterial({ color, roughness: 0.85 });
const ink = new T.LineBasicMaterial({ color: palette.dark });
function sphere(
  parent: T.Object3D,
  r: number,
  color: number,
  position: [number, number, number],
  segments = 20,
) {
  const m = new T.Mesh(new T.SphereGeometry(r, segments, 12), mat(color));
  m.position.set(...position);
  parent.add(m);
  return m;
}
export class Playthings {
  palace = new T.Group();
  windows: T.Mesh[] = [];
  addons = new Map<Addon, T.Group>();
  eyes: T.Mesh[] = [];
  disco?: T.Group;
  constructor(machine: Machine) {
    const p = this.palace;
    p.position.set(6.7, 0, 5.5);
    machine.root.add(p);
    box(p, [4.6, 1.6, 1.4], [0, 0.8, 0], 0xfff8f0);
    box(p, [1.8, 2, 1.7], [0, 1, 0.1], 0xffffff);
    const roof = new T.Mesh(
      new T.CylinderGeometry(0, 1.5, 0.7, 4),
      mat(palette.navy),
    );
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.75);
    roof.position.set(0, 2.3, 0.1);
    p.add(roof);
    for (const side of [-1, 1])
      box(p, [1.5, 0.35, 1.6], [side * 1.55, 1.73, 0], palette.navy);
    for (const x of [-1.95, -1.35, -0.55, 0, 0.55, 1.35, 1.95])
      for (const y of [0.55, 1.25]) {
        const w = box(p, [0.26, 0.38, 0.045], [x, y, 0.87], palette.dark, 0.01);
        this.windows.push(w);
        box(p, [0.31, 0.04, 0.08], [x, y - 0.21, 0.89], palette.navy, 0.005);
      }
    for (const x of [-0.83, 0.83])
      box(p, [0.12, 1.7, 0.12], [x, 0.95, 0.98], palette.orange);
    box(p, [0.7, 0.6, 0.12], [0, 0.3, 0.95], palette.navy);
    const pole = new T.Mesh(
      new T.CylinderGeometry(0.018, 0.018, 0.85, 8),
      mat(palette.dark),
    );
    pole.position.set(0, 3, 0.1);
    p.add(pole);
    for (const [i, color] of [palette.navy, 0xffffff, palette.orange].entries())
      box(p, [0.14, 0.27, 0.018], [0.1 + i * 0.14, 3.22, 0.1], color, 0.002);
    const cable = new T.CatmullRomCurve3(
      [
        [8, 0.25, 3.4],
        [8, 0.15, 4.5],
        [6.7, 0.2, 4.7],
      ].map((v) => new T.Vector3(...v)),
    );
    p.parent!.add(
      new T.Mesh(
        new T.TubeGeometry(cable, 28, 0.05, 8, false),
        mat(palette.orange),
      ),
    );
    // Accessories are deliberately non-functional toys and have no effect on the energy model.
    const eyes = new T.Group();
    eyes.position.set(0, 4.8, 1.05);
    machine.equipment.get("reactor")!.add(eyes);
    for (const x of [-0.48, 0.48]) {
      sphere(eyes, 0.39, palette.dark, [x, 0, 0]);
      sphere(eyes, 0.35, 0xffffff, [x, 0, 0.06]);
      this.eyes.push(sphere(eyes, 0.17, palette.dark, [x + 0.05, -0.03, 0.34]));
    }
    this.addons.set("eyes", eyes);
    const bread = new T.Group();
    bread.position.set(0.3, 2.9, 0);
    bread.rotation.z = -0.24;
    machine.equipment.get("generator")!.add(bread);
    const loaf = new T.Mesh(
      new T.CapsuleGeometry(0.19, 2.25, 6, 12),
      mat(0xffbd3e),
    );
    bread.add(loaf);
    for (let i = 0; i < 5; i++) {
      const slash = box(
        bread,
        [0.28, 0.055, 0.045],
        [0, -0.85 + i * 0.4, 0.18],
        0x9c421c,
        0.015,
      );
      slash.rotation.z = 0.5;
    }
    box(bread, [0.5, 0.15, 0.5], [0, -1.35, 0], palette.orange);
    this.addons.set("baguette", bread);
    const disco = new T.Group();
    disco.position.set(0, 3.7, 0);
    machine.equipment.get("turbine")!.add(disco);
    const ball = new T.Group();
    disco.add(ball);
    this.disco = ball;
    const geo = new T.SphereGeometry(0.63, 12, 8).toNonIndexed(),
      colors = [];
    for (let i = 0; i < geo.attributes.position.count; i += 6) {
      const col = new T.Color(
        [
          palette.navy,
          palette.orange,
          palette.copper,
          palette.enamel,
          0xffffff,
        ][Math.floor(i / 6) % 5],
      );
      for (let j = 0; j < 6 && i + j < geo.attributes.position.count; j++)
        colors.push(col.r, col.g, col.b);
    }
    geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    ball.add(new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true })));
    ball.add(
      new T.LineSegments(
        new T.WireframeGeometry(new T.SphereGeometry(0.632, 12, 8)),
        ink.clone(),
      ),
    );
    box(disco, [0.025, 1, 0.025], [0, 0.95, 0], palette.dark);
    this.addons.set("disco", disco);
    for (const a of this.addons.values()) a.visible = false;
    p.traverse((o) => {
      if (o instanceof T.Mesh) {
        const line = new T.LineSegments(
          new T.EdgesGeometry(o.geometry, 35),
          ink.clone(),
        );
        o.add(line);
        o.castShadow = true;
      }
    });
  }
  toggle(id: Addon) {
    const a = this.addons.get(id)!;
    a.visible = !a.visible;
    return a.visible;
  }
  update(power: number, elapsed: number, reduced: boolean) {
    const fraction = Math.min(1, Math.max(0, power / 100));
    this.windows.forEach((w, i) => {
      const on = fraction > (i + 0.5) / this.windows.length,
        m = w.material as T.MeshStandardMaterial;
      m.color.setHex(on ? 0xffd83d : palette.dark);
      m.emissive.setHex(on ? 0xffa000 : 0);
      m.emissiveIntensity = on ? 0.5 : 0;
    });
    if (!reduced && this.addons.get("disco")!.visible)
      this.disco!.rotation.y += elapsed * 1.1 * fraction;
  }
}
