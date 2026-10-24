import { symbols } from "./symbols";
import * as T from "three";
import {
  type Control,
  type Game,
  type Inputs,
  type Event,
  lines,
} from "./arcade";
const ink = 0x211c32,
  blue = 0x294cff,
  red = 0xff543c,
  yellow = 0xffd52f,
  pink = 0xff80bc,
  water = 0x19c3ef;
const materials = new Map<number, T.MeshStandardMaterial>();
const mat = (color: number) => {
  if (!materials.has(color))
    materials.set(color, new T.MeshStandardMaterial({ color, roughness: 1 }));
  return materials.get(color)!;
};
function solid(
  parent: T.Object3D,
  geo: T.BufferGeometry,
  color: number,
  pos: [number, number, number],
  outline = true,
) {
  const m = new T.Mesh(geo, mat(color));
  m.position.set(...pos);
  parent.add(m);
  if (outline)
    m.add(
      new T.LineSegments(
        new T.EdgesGeometry(geo, 35),
        new T.LineBasicMaterial({ color: ink }),
      ),
    );
  return m;
}
const box = (
  p: T.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  color: number,
) => solid(p, new T.BoxGeometry(...size), color, pos);
const ball = (
  p: T.Object3D,
  r: number,
  pos: [number, number, number],
  color: number,
) => solid(p, new T.SphereGeometry(r, 16, 10), color, pos, false);
function tube(p: T.Object3D, points: number[][], color: number, r = 0.13) {
  const path = new T.CatmullRomCurve3(
    points.map((v) => new T.Vector3(...v)),
    false,
    "catmullrom",
    0.15,
  );
  const pipe = solid(
    p,
    new T.TubeGeometry(path, 32, r, 8, false),
    color,
    [0, 0, 0],
  );
  if (r > 0.1) {
    pipe.material = mat(color).clone();
    pipe.material.transparent = true;
    pipe.material.opacity = 0.3;
    pipe.material.depthWrite = false;
  }
  return path;
}
function cylinder(
  p: T.Object3D,
  r: number,
  h: number,
  pos: [number, number, number],
  color: number,
  segments = 24,
) {
  return solid(p, new T.CylinderGeometry(r, r, h, segments), color, pos);
}
function decal(
  text: string,
  color = "#211c32",
  background = "transparent",
  w = 256,
  h = 128,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, w, h);
  if (background !== "transparent") {
    g.fillStyle = background;
    g.fillRect(0, 0, w, h);
  }
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `900 ${h * 0.65}px "DM Sans Variable", sans-serif`;
  if (text.startsWith("@")) {
    g.save();
    g.translate((w - h) / 2, 0);
    g.scale(h / 24, h / 24);
    g.strokeStyle = color;
    g.lineWidth = 1.8;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.stroke(new Path2D(symbols[text.slice(1) as Control]));
    g.restore();
  } else g.fillText(text, w / 2, h / 2, w - 12);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
function label(
  p: T.Object3D,
  text: string,
  pos: [number, number, number],
  width: number,
  height: number,
  bg = "transparent",
  color = "#211c32",
) {
  const m = new T.Mesh(
    new T.PlaneGeometry(width, height),
    new T.MeshBasicMaterial({
      map: decal(text, color, bg),
      transparent: true,
      depthWrite: false,
    }),
  );
  m.position.set(...pos);
  p.add(m);
  return m;
}
type Handle = {
  root: T.Group;
  grip: T.Group;
  equipment: T.Group;
  at: T.Vector3;
  link: T.Line;
  kind: "wheel" | "lever" | "switch";
};
export class MobileScene {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
  renderer: T.WebGLRenderer;
  root = new T.Group();
  handles = {} as Record<Control, Handle>;
  reactor = new T.Group();
  turbine = new T.Group();
  pump = new T.Group();
  palace = new T.Group();
  lid = new T.Group();
  cover = new T.Group();
  rotor = new T.Group();
  pumpRotor = new T.Group();
  pumpCase!: T.Mesh<T.CylinderGeometry, T.MeshStandardMaterial>;
  fuel: T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>[] = [];
  eyes = new T.Group();
  sunglasses = new T.Group();
  chair = new T.Group();
  windows: T.Mesh[] = [];
  portraits = {} as Record<"giscard" | "degaulle", T.Mesh>;
  paths: {
    curve: T.CatmullRomCurve3;
    kind: "water" | "steam" | "power";
    beads: T.Mesh[];
  }[] = [];
  puffs: T.Mesh[] = [];
  debris: T.Mesh[] = [];
  spark = new T.Group();
  stamp: T.Mesh;
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  focus?: Control;
  event: Event = "hello";
  eventAge = 99;
  elapsed = 0;
  width = 1;
  height = 1;

  private target = new T.Vector3(0, 5.2, 0);
  private targetGoal = this.target.clone();
  private distance = 22;
  private distanceGoal = 22;
  onProject: (
    points: Record<Control, { x: number; y: number; visible: boolean }>,
    speech: { x: number; y: number },
  ) => void = () => {};
  constructor(public host: HTMLElement) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor(0xffffff, 0);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    host.append(this.renderer.domElement);
    this.scene.add(this.root, new T.HemisphereLight(0xffffff, 0xd6d9f8, 2.8));
    const sun = new T.DirectionalLight(0xffffff, 2.3);
    sun.position.set(-3, 9, 9);
    this.scene.add(sun);
    // The machine grows upwards. Short, wide organs leave room for large handles.
    this.root.add(
      this.reactor,
      this.turbine,
      this.pump,
      this.palace,
      this.chair,
      this.spark,
    );
    this.reactor.position.set(0, 4.05, 0);
    this.turbine.position.set(0, 6.8, 0);
    this.pump.position.set(-0.7, 1.25, 0.25);
    this.palace.position.set(0, 9.4, 0);
    cylinder(this.reactor, 1.05, 2.15, [0, 0, 0], yellow); // cutaway front window
    box(this.reactor, [1.48, 1.52, 0.08], [0, 0, 1.03], ink);
    for (let i = 0; i < 5; i++) {
      const rod = cylinder(
        this.reactor,
        0.09,
        1.36,
        [-0.55 + i * 0.275, 0, 1.15],
        water,
        10,
      );
      rod.material = mat(water).clone();
      this.fuel.push(rod);
    }
    for (const y of [-0.69, 0.69])
      box(this.reactor, [1.5, 0.1, 0.12], [0, y, 1.2], blue);
    for (const y of [-1.1, 1.1])
      cylinder(this.reactor, 1.15, 0.14, [0, y, 0], blue);
    this.reactor.add(this.lid);
    this.lid.position.y = 1.2;
    solid(
      this.lid,
      new T.SphereGeometry(1.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      yellow,
      [0, 0, 0],
    );
    this.lid.scale.y = 0.45;
    for (const x of [-0.5, 0, 0.5])
      cylinder(this.lid, 0.09, 0.7, [x, 0.6, 0], blue, 10);
    this.reactor.add(this.eyes);
    this.eyes.position.set(0, 0.65, 1.28);
    for (const x of [-0.35, 0.35]) {
      ball(this.eyes, 0.24, [x, 0, 0], 0xffffff);
      ball(this.eyes, 0.11, [x, 0, 0.21], ink);
    }
    this.reactor.add(this.sunglasses);
    this.sunglasses.position.copy(this.eyes.position);
    this.sunglasses.position.z += 0.25;
    for (const x of [-0.35, 0.35])
      box(this.sunglasses, [0.52, 0.3, 0.1], [x, 0, 0], ink);
    box(this.sunglasses, [0.3, 0.07, 0.12], [0, 0, 0], ink);
    this.sunglasses.visible = false;
    const drum = cylinder(this.turbine, 1.12, 1.22, [0, 0, 0], pink);
    drum.rotation.x = Math.PI / 2;
    this.turbine.add(this.cover);
    this.cover.position.set(0, 0, 0.7);
    const ring = solid(
      this.cover,
      new T.TorusGeometry(1.13, 0.13, 8, 32),
      yellow,
      [0, 0, 0],
    );
    this.turbine.add(this.rotor);
    this.rotor.position.z = 0.79;
    cylinder(this.rotor, 0.2, 0.25, [0, 0, 0], blue).rotation.x = Math.PI / 2;
    for (let i = 0; i < 9; i++) {
      const blade = box(this.rotor, [0.17, 0.83, 0.08], [0, 0, 0], blue);
      const a = (i * Math.PI * 2) / 9;
      blade.position.set(Math.sin(a) * 0.57, Math.cos(a) * 0.57, 0);
      blade.rotation.z = -a + 0.35;
    }
    for (const x of [-0.9, 0.9])
      box(this.turbine, [0.14, 0.6, 0.5], [x, -1.25, 0], blue);
    this.pumpCase = cylinder(this.pump, 0.64, 1.1, [0, 0, 0], blue) as T.Mesh<
      T.CylinderGeometry,
      T.MeshStandardMaterial
    >;
    this.pumpCase.rotation.x = Math.PI / 2;
    this.pumpCase.material = mat(blue).clone();
    this.pumpCase.material.transparent = true;
    this.pump.add(this.pumpRotor);
    this.pumpRotor.position.z = 0.55;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const blade = box(
        this.pumpRotor,
        [0.12, 0.48, 0.09],
        [Math.sin(a) * 0.32, Math.cos(a) * 0.32, 0],
        water,
      );
      blade.rotation.z = -a + 0.3;
    }
    box(this.pump, [1.6, 0.2, 1.3], [0, -0.65, 0], ink);
    // Palace on the turbine, fed by the visible cable.
    box(this.palace, [2.6, 1.1, 0.9], [0, 0, 0], 0xffffff);
    box(this.palace, [1.1, 1.45, 1.1], [0, 0.12, 0.1], 0xffffff);
    const roof = solid(
      this.palace,
      new T.ConeGeometry(0.9, 0.5, 4),
      blue,
      [0, 1.04, 0.1],
    );
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.7;
    for (const x of [-0.95, -0.55, 0, 0.55, 0.95])
      for (const y of [-0.22, 0.26])
        this.windows.push(
          box(this.palace, [0.2, 0.3, 0.05], [x, y, 0.62], ink),
        );
    for (const x of [-0.48, 0.48])
      box(this.palace, [0.1, 1.05, 0.12], [x, 0, 0.7], red);
    cylinder(this.palace, 0.025, 0.65, [0, 1.6, 0], ink, 8);
    [blue, 0xffffff, red].forEach((c, i) =>
      box(this.palace, [0.15, 0.3, 0.03], [0.1 + i * 0.15, 1.73, 0], c),
    );
    label(this.palace, "ÉLYSÉE", [0, -0.8, 0.7], 1.6, 0.3);
    const waterPath = tube(
      this.root,
      [
        [-0.7, 1.3, 0.6],
        [-1.55, 1.5, 0],
        [-1.55, 3.4, 0],
        [-0.7, 3.65, 1.25],
        [0.5, 4.3, 1.25],
      ],
      water,
      0.16,
    );
    const steamPath = tube(
      this.root,
      [
        [0.65, 4.45, 1.2],
        [1.65, 4.6, 0],
        [1.65, 6.8, 0],
        [0.6, 6.8, 1],
      ],
      red,
      0.17,
    );
    tube(
      this.root,
      [
        [-0.6, 6.8, 0],
        [-1.65, 6.8, -0.4],
        [-1.65, 1.1, -0.5],
        [-0.7, 1.1, 0],
      ],
      blue,
      0.12,
    );
    const wire = tube(
      this.root,
      [
        [0.7, 6.1, -0.3],
        [2.15, 6.1, -0.3],
        [2.15, 1.5, 0],
        [1.3, 1.2, 0.9],
        [2.35, 1.3, -0.6],
        [2.35, 9.2, -0.6],
        [1, 9.2, 0],
      ],
      yellow,
      0.055,
    );
    for (const [curve, kind] of [
      [waterPath, "water"],
      [steamPath, "steam"],
      [wire, "power"],
    ] as const) {
      const beads = [];
      for (let i = 0; i < 13; i++)
        beads.push(
          ball(this.root, 0.09, [0, 0, 0], kind === "power" ? red : 0xffffff),
        );
      this.paths.push({ curve, kind, beads });
    }
    this.makeHandle("water", [-0.7, 1.25, 1.1], this.pump, "wheel", water, "≋");
    this.makeHandle(
      "heat",
      [1.28, 3.25, 1.12],
      this.reactor,
      "lever",
      red,
      "♨",
    );
    this.makeHandle(
      "steam",
      [-1.25, 5.7, 1.1],
      this.turbine,
      "wheel",
      yellow,
      "☁",
    );
    this.makeHandle(
      "grid",
      [1.2, 1.25, 1.1],
      this.turbine,
      "switch",
      blue,
      "ϟ",
    );
    // Presidents occupy the machine's two little platforms, not a separate sidebar.
    box(this.root, [1.1, 0.12, 0.75], [-1.25, 3.05, 0.8], blue);
    box(this.root, [1.1, 0.12, 0.75], [1.25, 5.3, 0.65], red);
    this.chair.position.set(-1.25, 3.15, 1.1);
    box(this.chair, [0.6, 0.1, 0.5], [0, 0, 0], red);
    box(this.chair, [0.6, 0.65, 0.1], [0, 0.35, -0.23], red);
    for (const x of [-0.24, 0.24])
      for (const z of [-0.2, 0.2])
        box(this.chair, [0.05, 0.4, 0.05], [x, -0.2, z], ink);
    const loader = new T.TextureLoader();
    for (const name of ["giscard", "degaulle"] as const) {
      const texture = loader.load(`/characters/${name}.png`);
      texture.colorSpace = T.SRGBColorSpace;
      const portrait = new T.Mesh(
        new T.PlaneGeometry(name === "giscard" ? 1.35 : 1.1, 1.85),
        new T.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: T.DoubleSide,
          depthWrite: false,
        }),
      );
      this.root.add(portrait);
      this.portraits[name] = portrait;
    }
    for (let i = 0; i < 14; i++) {
      const p = ball(this.root, 0.18, [0, 0, 0], 0xffffff);
      p.visible = false;
      this.puffs.push(p);
    }
    for (let i = 0; i < 36; i++) {
      const p = box(
        this.root,
        [0.1, 0.24, 0.035],
        [0, 0, 0],
        [blue, red, yellow, pink][i % 4],
      );
      p.visible = false;
      this.debris.push(p);
    }
    for (let i = 0; i < 8; i++) {
      const s = box(this.spark, [0.09, 0.8, 0.05], [0, 0, 0], red);
      const a = (i * Math.PI) / 4;
      s.position.set(Math.sin(a) * 1.3, Math.cos(a) * 1.3, 0);
      s.rotation.z = -a;
    }
    this.spark.position.set(0, 4.1, 1.8);
    this.spark.visible = false;
    this.stamp = label(this.root, "NON.", [0, 4.15, 2.5], 3.3, 0.9, "#ffd52f");
    this.stamp.visible = false;
    new ResizeObserver(() => this.resize()).observe(host);
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
      "change",
      (e) => {
        this.reduced = e.matches;
      },
    );
    this.resize();
  }
  makeHandle(
    key: Control,
    pos: [number, number, number],
    equipment: T.Group,
    kind: Handle["kind"],
    color: number,
    icon: string,
  ) {
    const root = new T.Group(),
      grip = new T.Group();
    root.position.set(...pos);
    this.root.add(root);
    root.add(grip);
    if (kind === "wheel") {
      solid(grip, new T.TorusGeometry(0.43, 0.095, 8, 24), color, [0, 0, 0.12]);
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3;
        const b = box(
          grip,
          [0.09, 0.4, 0.1],
          [Math.sin(a) * 0.2, Math.cos(a) * 0.2, 0.12],
          ink,
        );
        b.rotation.z = -a;
      }
      ball(grip, 0.14, [0, 0, 0.15], color);
      label(root, `@${key}`, [0, -0.68, 0.1], 0.5, 0.35);
    } else if (kind === "lever") {
      box(root, [0.45, 1.05, 0.2], [0, 0, 0], ink);
      box(grip, [0.14, 0.65, 0.15], [0, 0.2, 0.22], 0xffffff);
      box(grip, [0.68, 0.25, 0.3], [0, 0.58, 0.25], color);
      label(root, `@${key}`, [0, -0.75, 0.2], 0.5, 0.4);
    } else {
      box(root, [1.05, 0.95, 0.2], [0, 0, 0], color);
      box(root, [0.7, 0.65, 0.12], [0, 0, 0.16], ink);
      box(grip, [0.52, 0.4, 0.25], [0, 0.22, 0.3], yellow);
      label(root, `@${key}`, [0, -0.68, 0.15], 0.5, 0.45);
    }
    const link = new T.Line(
      new T.BufferGeometry().setFromPoints([
        root.position.clone(),
        root.position.clone(),
      ]),
      new T.LineBasicMaterial({ color: ink }),
    );
    this.root.add(link);
    link.visible = false;
    root.scale.setScalar(1.2);
    this.handles[key] = {
      root,
      grip,
      equipment,
      kind,
      at: root.position.clone(),
      link,
    };
  }
  resize() {
    this.width = this.host.clientWidth;
    this.height = this.host.clientHeight;
    this.renderer.setSize(this.width, this.height);
    const landscape = this.width / this.height > 1.4 && this.height < 500;
    for (const key of Object.keys(this.handles) as Control[]) {
      const h = this.handles[key];
      if (landscape) {
        h.root.position.set(
          key === "water" || key === "steam" ? -3 : 3,
          { water: 3, heat: 5, steam: 8, grid: 1 }[key],
          1.3,
        );
        h.root.scale.setScalar(1.8);
      } else {
        h.root.position.copy(h.at);
        h.root.scale.setScalar(1.2);
      }
      h.link.visible = landscape;
      h.link.geometry.setFromPoints([h.at, h.root.position]);
    }
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.aim(this.focus);
  }
  aim(key?: Control) {
    this.focus = key;
    const available = Math.max(180, this.height - 150);
    const fit = Math.max(
      (11.4 / (2 * Math.tan(T.MathUtils.degToRad(16)))) *
        (this.height / available),
      6.5 / (2 * Math.tan(T.MathUtils.degToRad(16)) * this.camera.aspect),
    );
    this.targetGoal.set(0, 5.3, 0);
    if (key) {
      const h = this.handles[key];
      this.targetGoal.set(
        h.at.x * 0.3,
        key === "grid"
          ? 2.4
          : key === "water"
            ? 2.3
            : key === "heat"
              ? 4.1
              : 6.35,
        0.5,
      );
    }
    this.distanceGoal = key ? fit * 0.58 : fit;
    if (this.reduced) {
      this.target.copy(this.targetGoal);
      this.distance = this.distanceGoal;
    }
  }
  react(event: Event, lang: "en" | "fr") {
    this.event = event;
    this.eventAge = 0;
    const m = this.stamp.material as T.MeshBasicMaterial;
    m.map?.dispose();
    m.map = decal(
      lines[event].stamp[lang === "en" ? 0 : 1],
      "#211c32",
      event === "blackout" ? "#ffffff" : "#ffd52f",
    );
    m.needsUpdate = true;
    if (event !== "hello") this.aim();
  }
  update(s: Game, c: Inputs, dt: number, wall: number) {
    this.elapsed += dt;
    this.eventAge += dt;
    const t = this.elapsed,
      active = this.eventAge < 4.5 && this.event !== "hello";
    const spring = this.reduced ? 1 : 1 - Math.exp(-wall * 7);
    this.target.lerp(this.targetGoal, spring);
    this.distance = T.MathUtils.lerp(this.distance, this.distanceGoal, spring);
    this.camera.position.set(
      this.target.x + this.distance * 0.085,
      this.target.y + this.distance * 0.06,
      this.distance,
    );
    this.camera.lookAt(this.target);
    for (const key of Object.keys(this.handles) as Control[]) {
      const h = this.handles[key],
        v = c[key];
      if (h.kind === "wheel") h.grip.rotation.z = -v * Math.PI * 2;
      else if (h.kind === "lever") h.grip.rotation.x = 0.75 - v * 1.4;
      else h.grip.position.y = -0.2 + v * 0.4;
    }
    this.rotor.rotation.z += this.reduced ? 0 : dt * s.spin * 12;
    this.pumpRotor.rotation.z += this.reduced ? 0 : dt * s.water * 8;
    this.pumpCase.material.opacity = T.MathUtils.lerp(
      this.pumpCase.material.opacity,
      this.focus === "water" ? 0.12 : 1,
      spring,
    );
    this.pumpCase.position.x = T.MathUtils.lerp(
      this.pumpCase.position.x,
      this.focus === "water" ? -0.4 : 0,
      spring,
    );
    for (const rod of this.fuel) {
      rod.material.color.lerpColors(
        new T.Color(water),
        new T.Color(red),
        s.heat,
      );
      rod.material.emissive.setHex(red);
      rod.material.emissiveIntensity = s.heat * 0.2;
    }
    const opened = this.focus === "heat" || this.focus === "steam";
    this.lid.position.y = T.MathUtils.lerp(
      this.lid.position.y,
      active &&
        (this.event === "dry" ||
          this.event === "strike" ||
          this.event === "turbo")
        ? 2.5
        : opened
          ? 1.9
          : 1.2,
      spring,
    );
    this.cover.position.x = T.MathUtils.lerp(
      this.cover.position.x,
      this.focus === "steam" ? 1.2 : 0,
      spring,
    );
    this.reactor.scale.set(1, 1, 1);
    if (active && this.event === "turbo" && !this.reduced)
      this.reactor.scale.set(
        1 + Math.sin(t * 13) * 0.05,
        1 - Math.sin(t * 13) * 0.035,
        1,
      );
    this.eyes.scale.y =
      active && ["dry", "strike"].includes(this.event) ? 1.5 : 1;
    this.sunglasses.visible = s.power >= 100;
    for (const p of this.paths) {
      const speed =
        p.kind === "water"
          ? s.water
          : p.kind === "steam"
            ? s.steam
            : s.power / 180;
      p.beads.forEach((bead, i) => {
        bead.visible = speed > 0.02;
        bead.position.copy(
          p.curve.getPointAt(
            (i / p.beads.length + (this.reduced ? 0 : t * speed * 0.16)) % 1,
          ),
        );
      });
    }
    this.windows.forEach((w, i) => {
      w.material = mat(
        s.power / 100 > (i + 0.5) / this.windows.length ? yellow : ink,
      );
    });
    const who = lines[this.event].president;
    for (const name of ["giscard", "degaulle"] as const) {
      const p = this.portraits[name],
        home = new T.Vector3(
          name === "giscard" ? -1.3 : 1.3,
          name === "giscard" ? 4 : 6.3,
          1.4,
        );
      const chosen = active && name === who;
      if (chosen && this.event === "blackout") {
        home.x -= this.reduced ? 0 : this.eventAge * 2;
        home.y += this.reduced ? 0 : Math.sin(this.eventAge) * 2;
        p.visible = this.eventAge < 2 && !this.reduced;
      } else {
        p.visible = true;
        if (chosen) {
          home.set(this.event === "cold" ? -0.75 : 0.15, 4.9, 2.4);
        }
      }
      p.position.lerp(home, this.reduced ? 1 : spring);
      p.quaternion.copy(this.camera.quaternion);
      if (chosen && !this.reduced)
        p.rotateZ(
          this.event === "blackout"
            ? -this.eventAge * 2
            : Math.sin(this.eventAge * 8) * 0.09,
        );
      const scale = chosen && this.event !== "blackout" ? 1.75 : 1;
      p.scale.setScalar(T.MathUtils.lerp(p.scale.x, scale, spring));
    }
    this.stamp.visible = active;
    this.stamp.position.set(0, this.event === "blackout" ? 4.2 : 6.25, 2.8);
    this.stamp.quaternion.copy(this.camera.quaternion);
    this.stamp.rotateZ(-0.07);
    this.spark.visible =
      active && ["dry", "strike", "chaos"].includes(this.event);
    this.spark.rotation.z = this.reduced ? 0 : Math.sin(t * 10) * 0.1;
    this.puffs.forEach((p, i) => {
      p.visible =
        active && ["strike", "dry", "turbo", "cold"].includes(this.event);
      if (!p.visible) return;
      const a = i * 2.4,
        phase = this.reduced ? 0.5 : (this.eventAge * 0.7 + i * 0.08) % 1;
      p.position.set(
        Math.cos(a) * phase * 2.2,
        5.4 + phase * 2.6,
        1 + Math.sin(a) * phase,
      );
      p.scale.setScalar(this.event === "cold" ? 0.6 : 1 + phase * 2);
      p.material = mat(this.event === "cold" ? water : 0xffffff);
    });
    this.debris.forEach((p, i) => {
      p.visible = active && (this.event === "win" || this.event === "chaos");
      if (!p.visible) return;
      const phase = this.reduced ? 0.5 : (this.eventAge * 0.4 + i * 0.037) % 1;
      p.position.set(Math.sin(i * 4.1) * 2.7, 10 - phase * 9, 2);
      p.rotation.z = this.reduced ? i : t * 3 + i;
    });
    const points = {} as Record<
      Control,
      { x: number; y: number; visible: boolean }
    >;
    for (const key of Object.keys(this.handles) as Control[]) {
      const p = this.handles[key].root
        .getWorldPosition(new T.Vector3())
        .project(this.camera);
      const x = ((p.x + 1) * this.width) / 2,
        y = ((1 - p.y) * this.height) / 2;
      points[key] = {
        x,
        y,
        visible:
          x > 42 && x < this.width - 42 && y > 92 && y < this.height - 72,
      };
    }
    const speaker = this.portraits[who];
    const v = speaker.position.clone();
    v.y += 1.1;
    v.project(this.camera);
    this.onProject(points, {
      x: ((v.x + 1) * this.width) / 2,
      y: ((1 - v.y) * this.height) / 2,
    });
    this.renderer.render(this.scene, this.camera);
  }
}
