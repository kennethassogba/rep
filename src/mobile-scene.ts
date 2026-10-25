import * as T from "three";
const C = {
  ink: 0x211c32,
  blue: 0x294cff,
  red: 0xff543c,
  yellow: 0xffd52f,
  cyan: 0x19c3ef,
  white: 0xffffff,
};
function piece(
  parent: T.Object3D,
  geometry: T.BufferGeometry,
  color: number,
  x = 0,
  y = 0,
  z = 0,
) {
  const mesh = new T.Mesh(geometry, new T.MeshToonMaterial({ color }));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  mesh.add(
    new T.LineSegments(
      new T.EdgesGeometry(geometry, 40),
      new T.LineBasicMaterial({ color: C.ink }),
    ),
  );
  return mesh;
}
function block(
  p: T.Object3D,
  w: number,
  h: number,
  d: number,
  c: number,
  x = 0,
  y = 0,
  z = 0,
  r = 0.12,
) {
  const s = new T.Shape();
  const a = -w / 2,
    b = -h / 2;
  s.moveTo(a + r, b);
  s.lineTo(a + w - r, b);
  s.quadraticCurveTo(a + w, b, a + w, b + r);
  s.lineTo(a + w, b + h - r);
  s.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
  s.lineTo(a + r, b + h);
  s.quadraticCurveTo(a, b + h, a, b + h - r);
  s.lineTo(a, b + r);
  s.quadraticCurveTo(a, b, a + r, b);
  const g = new T.ExtrudeGeometry(s, {
    depth: d,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    curveSegments: 6,
  });
  g.translate(0, 0, -d / 2);
  return piece(p, g, c, x, y, z);
}
function ring(
  p: T.Object3D,
  r: number,
  t: number,
  c: number,
  x: number,
  y: number,
  z: number,
) {
  return piece(p, new T.TorusGeometry(r, t, 8, 48), c, x, y, z);
}
function pipe(
  p: T.Object3D,
  points: number[][],
  r: number,
  c: number,
  transparent = false,
) {
  const curve = new T.CatmullRomCurve3(
    points.map((v) => new T.Vector3(...v)),
    false,
    "catmullrom",
    0.1,
  );
  const mesh = piece(p, new T.TubeGeometry(curve, 48, r, 10, false), c);
  if (transparent) {
    mesh.material.transparent = true;
    mesh.material.opacity = 0.28;
    mesh.material.depthWrite = false;
  }
  return curve;
}
export class MobileScene {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
  renderer: T.WebGLRenderer;
  root = new T.Group();
  rotor = new T.Group();
  rods: T.Mesh[] = [];
  windows: T.Mesh[] = [];
  beads: T.Mesh[] = [];
  paths: T.CatmullRomCurve3[] = [];
  plane = new T.Group();
  hatch = new T.Group();
  needle = new T.Group();
  progress = 0;
  elapsed = 0;
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  constructor(public host: HTMLElement) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    host.append(this.renderer.domElement);
    this.scene.add(this.root, new T.HemisphereLight(0xffffff, 0xc0c6ee, 2.5));
    const sun = new T.DirectionalLight(0xffffff, 2);
    sun.position.set(-5, 10, 8);
    this.scene.add(sun);
    // One enclosing appliance, with recessed windows and a continuous enamel shell.
    block(this.root, 4.2, 6.4, 2, C.blue, 0, 3.4, 0, 0.42);
    block(this.root, 0.48, 6.1, 2.12, C.yellow, 1.95, 3.4, 0, 0.2);
    block(this.root, 4.1, 0.55, 2.1, C.yellow, 0, 6.47, 0, 0.2);
    for (const x of [-1.5, 1.5])
      block(this.root, 0.45, 0.4, 0.65, C.ink, x, 0.03, 0.15);
    // Turbine window is a single recessed oval across the front.
    block(this.root, 3.35, 1.1, 0.12, C.white, 0, 5.55, 1.08, 0.42);
    block(this.root, 3.1, 0.88, 0.12, C.ink, 0, 5.55, 1.17, 0.35);
    this.rotor.position.set(0, 5.55, 1.3);
    this.root.add(this.rotor);
    for (const x of [-0.88, 0, 0.88]) {
      const wheel = new T.Group();
      wheel.position.x = x;
      this.rotor.add(wheel);
      ring(wheel, 0.35, 0.045, C.white, 0, 0, 0);
      for (let i = 0; i < 9; i++) {
        const a = (i * Math.PI * 2) / 9;
        const blade = block(
          wheel,
          0.1,
          0.28,
          0.09,
          C.red,
          Math.sin(a) * 0.19,
          Math.cos(a) * 0.19,
          0.04,
          0.02,
        );
        blade.rotation.z = -a + 0.45;
      }
      ring(wheel, 0.07, 0.045, C.yellow, 0, 0, 0.1);
    }
    // Core porthole with visible rods.
    const dark = piece(
      this.root,
      new T.CylinderGeometry(1.09, 1.09, 0.12, 48),
      C.ink,
      0,
      3.82,
      1.1,
    );
    dark.rotation.x = Math.PI / 2;
    ring(this.root, 1.13, 0.16, C.red, 0, 3.82, 1.24);
    ring(this.root, 0.96, 0.04, C.white, 0, 3.82, 1.27);
    for (let i = 0; i < 5; i++)
      this.rods.push(
        block(
          this.root,
          0.15,
          1.25,
          0.14,
          C.cyan,
          -0.58 + i * 0.29,
          3.82,
          1.27,
          0.06,
        ),
      );
    for (const y of [3.19, 4.45])
      block(this.root, 1.42, 0.13, 0.17, C.yellow, 0, y, 1.29, 0.03);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ring(
        this.root,
        0.035,
        0.015,
        C.white,
        Math.sin(a) * 1.14,
        3.82 + Math.cos(a) * 1.14,
        1.42,
      );
    }
    // Instrument and louvres, physically attached to the front.
    for (let i = 0; i < 6; i++) {
      const vent = block(
        this.root,
        0.07,
        0.65,
        0.09,
        C.ink,
        2.22,
        4.6,
        -0.6 + i * 0.23,
        0.03,
      );
      vent.rotation.y = Math.PI / 2;
    }

    const dial = piece(
      this.root,
      new T.CylinderGeometry(0.37, 0.37, 0.1, 32),
      C.white,
      1.47,
      3.25,
      1.18,
    );
    dial.rotation.x = Math.PI / 2;
    ring(this.root, 0.38, 0.035, C.ink, 1.47, 3.25, 1.25);
    this.needle.position.set(1.47, 3.25, 1.32);
    this.root.add(this.needle);
    block(this.needle, 0.035, 0.3, 0.025, C.ink, 0, 0.1, 0, 0.01);
    for (let i = 0; i < 4; i++)
      block(
        this.root,
        0.7,
        0.055,
        0.07,
        C.ink,
        1.4,
        4.45 - i * 0.17,
        1.16,
        0.02,
      );
    // Lower service hatch and visible plumbing.
    block(this.root, 3.5, 1.62, 0.15, C.yellow, 0, 1.62, 1.12, 0.14);
    block(this.root, 3.17, 1.3, 0.12, C.ink, 0, 1.62, 1.23, 0.08);
    this.hatch.position.set(-1.6, 1.62, 1.3);
    this.root.add(this.hatch);
    block(this.hatch, 1.2, 1.25, 0.1, C.yellow, -0.6, 0, 0, 0.08);
    this.hatch.rotation.y = -0.9;
    ring(this.hatch, 0.2, 0.055, C.white, -0.6, 0, 0.09);
    this.paths.push(
      pipe(
        this.root,
        [
          [-1.1, 1.4, 1.4],
          [-0.8, 1.4, 1.4],
          [-0.8, 1.9, 1.4],
          [0.3, 1.9, 1.4],
          [0.3, 1.4, 1.4],
          [1.1, 1.4, 1.4],
          [1.1, 2.1, 1.4],
        ],
        0.13,
        C.cyan,
        true,
      ),
    );
    this.paths.push(
      pipe(
        this.root,
        [
          [-1.15, 1.5, 1.4],
          [-2.5, 1.5, 1.25],
          [-2.5, 2.2, 1.25],
          [-2.5, 5.3, 1.25],
          [-1.65, 5.5, 1.25],
        ],
        0.17,
        C.cyan,
        true,
      ),
    );
    for (let i = 0; i < 24; i++)
      this.beads.push(
        piece(this.root, new T.SphereGeometry(0.075, 8, 6), C.white),
      );
    for (const y of [2.1, 3.1, 4.8]) {
      const collar = piece(
        this.root,
        new T.CylinderGeometry(0.23, 0.23, 0.14, 12),
        C.white,
        -2.5,
        y,
        1.25,
      );
      collar.rotation.y = 0.1;
    }
    for (let i = 0; i < 4; i++)
      block(
        this.root,
        0.9,
        0.065,
        0.06,
        C.ink,
        -0.4,
        2.65 + i * 0.15,
        1.13,
        0.02,
      );
    // Miniature palace is a connected destination, never a separate scene.
    const palace = new T.Group();
    palace.position.set(0, 7.28, 0);
    this.root.add(palace);
    block(palace, 2.9, 0.8, 0.9, C.white);
    block(palace, 1.12, 1.05, 1, C.white, 0, 0.12, 0.05);
    block(palace, 3.05, 0.2, 1.05, C.ink, 0, 0.5, 0);
    block(palace, 1.25, 0.2, 1.1, C.ink, 0, 0.7, 0.05);
    for (const x of [-1.15, -0.77, -0.38, 0, 0.38, 0.77, 1.15])
      for (const y of [-0.18, 0.18])
        this.windows.push(
          block(palace, 0.13, 0.23, 0.04, C.ink, x, y, 0.55, 0.02),
        );
    const mast = piece(
      palace,
      new T.CylinderGeometry(0.018, 0.018, 0.7, 6),
      C.ink,
      0,
      1.1,
      0,
    );
    [C.blue, C.white, C.red].forEach((c, i) =>
      block(palace, 0.13, 0.25, 0.02, c, 0.08 + i * 0.13, 1.25, 0, 0.01),
    );
    pipe(
      this.root,
      [
        [1.85, 5.5, 0],
        [2.5, 5.5, 0],
        [2.5, 7.3, 0],
        [1.4, 7.3, 0],
      ],
      0.045,
      C.yellow,
    );
    // Concorde silhouette: delta wing and pointed nose, deployed after its mission.
    this.plane.position.set(2, 6.8, 2.5);
    this.root.add(this.plane);
    const wingShape = new T.Shape();
    wingShape.moveTo(0, 1);
    wingShape.lineTo(-0.95, -0.5);
    wingShape.lineTo(0, -0.3);
    wingShape.lineTo(0.95, -0.5);
    wingShape.closePath();
    const wing = piece(
      this.plane,
      new T.ExtrudeGeometry(wingShape, { depth: 0.05, bevelEnabled: false }),
      C.white,
    );
    wing.rotation.x = 0;
    const fuselage = piece(
      this.plane,
      new T.ConeGeometry(0.12, 2.3, 12),
      C.white,
      0,
      0,
      -0.3,
    );
    fuselage.rotation.x = 0;
    this.plane.scale.setScalar(0.7);
    this.plane.visible = false;
    this.root.rotation.y = -0.25;
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
      "change",
      (e) => (this.reduced = e.matches),
    );
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const distance = Math.max(
      19,
      7.1 / (2 * Math.tan((Math.PI * 16) / 180) * this.camera.aspect),
    );
    this.camera.position.set(1.8, 7.4, distance);
    this.camera.lookAt(0, 4, 0);
  }
  update(completed: number, dt: number) {
    this.progress = completed;
    this.elapsed += dt;
    const t = this.reduced ? 0 : this.elapsed;
    this.rotor.children.forEach(
      (wheel) =>
        (wheel.rotation.z += this.reduced ? 0 : dt * (completed >= 2 ? 4 : 0)),
    );
    this.rods.forEach((r) => {
      const m = r.material as T.MeshToonMaterial;
      m.color.setHex(completed >= 2 ? C.yellow : C.cyan);
    });
    this.beads.forEach((b, i) => {
      b.visible = completed >= 1;
      const curve = this.paths[i % 2];
      b.position.copy(curve.getPointAt((i / 24 + t * 0.16) % 1));
    });
    this.windows.forEach((w) =>
      (w.material as T.MeshToonMaterial).color.setHex(
        completed >= 5 ? C.yellow : C.ink,
      ),
    );
    this.needle.rotation.z = -0.9 + completed * 0.36;
    this.plane.visible = completed >= 3;
    this.plane.position.x = 2 + (this.reduced ? 0 : Math.sin(t * 0.6) * 0.8);
    this.plane.rotation.z = -0.9;
    this.hatch.rotation.y = -0.5 - (completed === 0 ? 0.4 : 0);
    this.renderer.render(this.scene, this.camera);
  }
}
