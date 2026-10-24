import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { equipment, ids, type EquipmentId } from "./content";
import { rates, rpm, type State, type Controls } from "./physics";
import { buildDetail } from "./detail";
import { parts, tr, type Part, type Lang } from "./parts";
import { inkMaterial } from "./ink";
import { Interior, annotationValue } from "./interior";
import { opens, openSection, pickedSphere } from "./section";

type View = {
  target: T.Vector3;
  position: T.Vector3;
  half: number;
  zoom: number;
};
type Layer = {
  object: T.Group;
  center: T.Vector3;
  radius: number;
  view?: View;
  interior: Interior;
};
type Flight = {
  start: number;
  from: View;
  to: View;
  weights: Map<T.Object3D, number>;
  destinations: Map<T.Object3D, number>;
  openings: Map<T.Object3D, [number, number]>;
  descending: boolean;
};
type V = [number, number, number];
const colors = {
  ink: 0x29313f,
  primary: 0xd87964,
  steam: 0xd6a141,
  water: 0x809bd2,
  cold: 0x6082bf,
  casing: 0xe7ebf4,
  metal: 0xc8d0df,
};
const positions: Record<EquipmentId, V> = {
  reactor: [-5, 0, 0],
  pressurizer: [-6.2, 0, -3.2],
  primary: [-3, 0, 2.1],
  steam: [-1.5, 0, -2],
  turbine: [2.5, 0, -1.8],
  generator: [5.8, 0, -1.8],
  condenser: [2.4, 0, 2],
  feed: [-0.3, 0, 2.5],
  cooling: [6.3, 0, 3.2],
};
const height: Record<EquipmentId, number> = {
  reactor: 4.5,
  pressurizer: 4.5,
  primary: 1.5,
  steam: 5.5,
  turbine: 2.8,
  generator: 2.7,
  condenser: 1.8,
  feed: 1.25,
  cooling: 2.6,
};

export class PlantScene {
  scene = new T.Scene();
  plantRoot = new T.Group();
  detailRoot = new T.Group();
  detail?: Part;
  detailRadius = 3;
  hovered: T.Mesh[] = [];
  hoverId?: string;
  previewPart(id?: string, picked?: T.Object3D) {
    if (this.hoverId === id && !picked) return;
    this.hoverId = id;
    for (const mesh of this.hovered)
      (mesh.material as T.MeshToonMaterial).emissive.setHex(0);
    this.hovered = [];
    const source = picked ?? (this.detail
      ? this.activeObject()
      : id
        ? this.groups.get(id as EquipmentId)
        : undefined);
    source?.traverse((o) => {
      if (
        o instanceof T.Mesh &&
        o.material instanceof T.MeshToonMaterial &&
        (!this.detail || o.userData.child === id)
      ) {
        o.material.emissive.setHex(0x24365a);
        this.hovered.push(o);
      }
    });
    this.renderer.domElement.style.cursor = id ? "zoom-in" : "grab";
    this.render();
  }
  layers = new Map<string, Layer>();
  flight?: Flight;
  weights = new Map<T.Object3D, number>();
  plantView?: View;
  picked?: { id: string; sphere: T.Sphere };
  lastState?: State;
  lastControls?: Controls;
  annotations: HTMLDivElement[] = [];
  viewHalf = 6.5;
  activeObject() {
    return this.detail ? this.layers.get(this.detail.id)?.object : undefined;
  }
  captureView(): View {
    return {
      target: this.orbit.target.clone(),
      position: this.camera.position.clone(),
      half: this.camera.top,
      zoom: this.camera.zoom,
    };
  }
  setView(v: View) {
    this.orbit.target.copy(v.target);
    this.camera.position.copy(v.position);
    const aspect = this.host.clientWidth / Math.max(1, this.host.clientHeight);
    this.viewHalf = v.half;
    this.camera.left = -v.half * aspect;
    this.camera.right = v.half * aspect;
    this.camera.top = v.half;
    this.camera.bottom = -v.half;
    this.camera.zoom = v.zoom;
    const distance = v.position.distanceTo(v.target);
    this.camera.near = Math.max(0.00000001, distance / 1000);
    this.camera.far = Math.max(150, distance * 100);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(v.target);
  }
  fadeObject(object: T.Object3D, weight: number) {
    object.visible = weight > 0.001;
    this.weights.set(object, weight);
    object.traverse((o) => {
      if (!(o instanceof T.Mesh || o instanceof T.Line)) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of materials) {
        // Context needs outlines only; avoid shading thousands of nearly invisible faces.
        m.visible = weight >= 0.12 || !(o instanceof T.Mesh);
        m.userData.fullOpacity ??= m.opacity;
        m.opacity =
          m.userData.fullOpacity *
          (o instanceof T.Mesh ? weight * weight : weight);
        if (m.transparent !== (m.opacity < 1)) {
          m.transparent = m.opacity < 1;
          m.needsUpdate = true;
        }
        m.depthWrite = m.opacity >= 0.99 && !m.userData.transport;
      }
    });
  }
  /** World-space representative of the selected child, never an arbitrary camera reset. */
  anchor(part: Part): T.Sphere {
    if (this.picked?.id === part.id) return this.picked.sphere.clone();
    const source = part.parent
      ? this.layers.get(part.parent.id)?.object
      : this.groups.get(part.id as EquipmentId);
    const fallback = part.parent ? this.layers.get(part.parent.id) : undefined;
    let match: T.Object3D | undefined;
    const joined = new T.Box3();
    source?.updateWorldMatrix(true, true);
    source?.traverse((o) => {
      if (o.userData.child === part.id) {
        match ??= o;
        joined.expandByObject(o);
      }
    });
    if (match && part.kind === "core")
      return joined.getBoundingSphere(new T.Sphere());
    if (match)
      return new T.Box3()
        .setFromObject(match)
        .getBoundingSphere(new T.Sphere());
    if (!part.parent && source)
      return new T.Box3()
        .setFromObject(source)
        .getBoundingSphere(new T.Sphere());
    return new T.Sphere(
      fallback?.center.clone() ?? new T.Vector3(),
      (fallback?.radius ?? 3) * 0.3,
    );
  }
  animateNavigation(now: number) {
    const f = this.flight;
    if (!f) return;
    const t = Math.min(1, (now - f.start) / (this.reduced ? 120 : 1500));
    const smooth = (v: number) => {const x = T.MathUtils.clamp(v, 0, 1); return x * x * (3 - 2 * x);};
    // First separate the boundary; then travel through it. Reverse on ascent.
    const eased = smooth(f.descending ? (t - 0.12) / 0.88 : t / 0.85);
    for (const [object, [from, to]] of f.openings) openSection(object, this.reduced ? to : T.MathUtils.lerp(from, to, smooth(t / 0.65)));
    // Zoom interpolates in log space so changes of scale keep a steady perceived speed.
    this.setView(
      this.reduced
        ? f.to
        : {
            target: f.from.target.clone().lerp(f.to.target, eased),
            position: f.from.position.clone().lerp(f.to.position, eased),
            half: Math.exp(
              T.MathUtils.lerp(
                Math.log(f.from.half),
                Math.log(f.to.half),
                eased,
              ),
            ),
            zoom: T.MathUtils.lerp(f.from.zoom, f.to.zoom, eased),
          },
    );
    for (const [object, weight] of f.destinations) {
      this.fadeObject(
        object,
        T.MathUtils.lerp(f.weights.get(object) ?? 0, weight, smooth(f.descending ? (t - 0.18) / 0.75 : t)),
      );
    }
    this.render();
    if (t === 1) {
      this.flight = undefined;
      this.orbit.enabled = true;
      this.orbit.update();
      this.host.removeAttribute("aria-busy");
      this.pruneLayers();
    }
  }
  pruneLayers() {
    for (const [id, layer] of this.layers) {
      if (
        this.detail &&
        (id === this.detail.id || this.detail.id.startsWith(id + "/"))
      )
        continue;
      layer.object.traverse((o) => {
        if (o instanceof T.Mesh || o instanceof T.Line) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
        }
      });
      this.detailRoot.remove(layer.object);
      this.weights.delete(layer.object);
      this.layers.delete(id);
    }
  }
  detailLabels: HTMLButtonElement[] = [];
  language: Lang = "en";
  onDrill: (id: string) => void = () => {};
  camera = new T.OrthographicCamera(-12, 12, 8, -8, 0.1, 150);
  renderer: T.WebGLRenderer;
  orbit: OrbitControls;
  groups = new Map<EquipmentId, T.Group>();
  labels = new Map<EquipmentId, HTMLButtonElement>();
  leaders = new Map<EquipmentId, SVGLineElement>();
  shells: T.Mesh[] = [];
  moving: {
    mesh: T.Object3D;
    axis: "x" | "y" | "z";
    kind: "shaft" | "primary" | "feed" | "cooling";
  }[] = [];
  lids: { object: T.Object3D; base: number; offset: number }[] = [];
  rods = new T.Group();
  paths: {
    curve: T.Curve<T.Vector3>;
    particles: T.Mesh[];
    kind: "primary" | "steam" | "feed" | "cooling";
    phase: number;
  }[] = [];
  selection = new T.Group();
  selected: EquipmentId = "cooling";
  exploded = false;
  transparent = true;
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  showLabels = false;
  ray = new T.Raycaster();
  pointer = new T.Vector2();
  constructor(
    private host: HTMLElement,
    private select: (id: EquipmentId) => void,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setClearColor(0xffffff, 0);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Maquette 3D de la centrale. Faites glisser pour tourner ; utilisez aussi les boutons de vue et la liste des équipements.",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.host.prepend(this.renderer.domElement);
    this.scene.add(new T.AmbientLight(0xffffff, 1.5));
    const light = new T.DirectionalLight(0xffffff, 2.1);
    light.position.set(-5, 12, 8);
    this.scene.add(light);
    this.camera.position.set(12, 10, 17);
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.target.set(0, 1.3, 0);
    this.orbit.enableDamping = false;
    this.orbit.enablePan = false;
    this.orbit.minPolarAngle = 0.25;
    this.orbit.maxPolarAngle = Math.PI / 2.12;
    this.orbit.minZoom = 0.65;
    this.orbit.maxZoom = 2.5;
    this.orbit.update();
    this.orbit.saveState();
    this.build();
    for (const object of [...this.scene.children])
      if (!(object instanceof T.Light)) this.plantRoot.add(object);
    this.scene.add(this.plantRoot, this.detailRoot);
    this.orbit.addEventListener("change", () => this.render());
    for (const shell of this.shells) opens(shell, [1.15, 0.25, 0.35], [0, 0, -0.08]);
    for (const lid of this.lids) opens(lid.object, [0, lid.offset * 1.4, 0]);
    this.setTransparency(true);
    this.highlight("cooling");
    this.fadeObject(this.plantRoot, 1);
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    let down = [0, 0];
    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      down = [e.clientX, e.clientY];
    });
    this.renderer.domElement.addEventListener("pointerup", (e) => {
      if (this.flight) return;
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      this.ray.setFromCamera(this.pointer, this.camera);
      if (this.detail) {
        const hits = this.ray.intersectObject(this.activeObject()!, true);
        const ordered = [
          ...hits.filter(
            (h) =>
              h.object instanceof T.Mesh &&
              (h.object.material as T.Material).opacity >= 0.5,
          ),
          ...hits,
        ];
        for (const hit of ordered) {
          if (hit.object.userData.child) {
            const picked = hit.object.userData.pickGroup ?? hit.object;
            this.picked = { id: hit.object.userData.child, sphere: pickedSphere(picked, picked === hit.object ? hit.instanceId : undefined) };
            this.onDrill(hit.object.userData.child);
            break;
          }
        }
        return;
      }
      const hits = this.ray.intersectObjects([...this.groups.values()], true);
      for (const hit of hits) {
        let obj: T.Object3D | null = hit.object;
        while (obj && !obj.userData.equipment) obj = obj.parent;
        if (obj?.userData.equipment) {
          this.onDrill(obj.userData.equipment);
          break;
        }
      }
    });
    this.renderer.domElement.addEventListener("pointermove", (e) => {
      if (this.flight || e.buttons) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      this.ray.setFromCamera(this.pointer, this.camera);
      const objects = this.detail
        ? [this.activeObject()!]
        : [...this.groups.values()];
      const hits = this.ray.intersectObjects(objects, true);
      let id: string | undefined;
      let picked: T.Object3D | undefined;
      for (const hit of hits) {
        let o: T.Object3D | null = hit.object;
        if (this.detail) {
          if (o.userData.child) {
            id = o.userData.child;
            picked = o.userData.pickGroup ?? o;
            break;
          }
        } else {
          while (o && !o.userData.equipment) o = o.parent;
          if (o) {
            id = o.userData.equipment;
            break;
          }
        }
      }
      this.previewPart(id, picked);
    });
    this.renderer.domElement.addEventListener("pointerleave", () =>
      this.previewPart(),
    );
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
      "change",
      (e) => {
        this.reduced = e.matches;
      },
    );
  }
  mesh(
    geo: T.BufferGeometry,
    color: number,
    parent: T.Object3D,
    pos: V = [0, 0, 0],
    shell = false,
  ) {
    const m = new T.Mesh(geo, inkMaterial({ color, side: T.DoubleSide }));
    m.position.set(...pos);
    parent.add(m);
    const edge = new T.LineSegments(
      new T.EdgesGeometry(geo, 28),
      new T.LineBasicMaterial({
        color: colors.ink,
        transparent: true,
        opacity: 0.85,
      }),
    );
    m.add(edge);
    if (shell) this.shells.push(m);
    return m;
  }
  box(
    parent: T.Object3D,
    size: V,
    pos: V,
    color = colors.casing,
    shell = false,
  ) {
    return this.mesh(new T.BoxGeometry(...size), color, parent, pos, shell);
  }
  cylinder(
    parent: T.Object3D,
    radius: number,
    h: number,
    pos: V,
    color = colors.casing,
    shell = false,
  ) {
    return this.mesh(
      new T.CylinderGeometry(radius, radius, h, 32),
      color,
      parent,
      pos,
      shell,
    );
  }
  ring(
    parent: T.Object3D,
    radius: number,
    pos: V,
    color = colors.ink,
    tube = 0.025,
  ) {
    const m = this.mesh(
      new T.TorusGeometry(radius, tube, 5, 40),
      color,
      parent,
      pos,
    );
    m.rotation.x = Math.PI / 2;
    return m;
  }
  tube(parent: T.Object3D, points: V[], color: number, radius = 0.11) {
    const curve = new T.CatmullRomCurve3(
      points.map((p) => new T.Vector3(...p)),
      false,
      "centripetal",
    );
    const m = new T.Mesh(
      new T.TubeGeometry(curve, 64, radius, 7, false),
      inkMaterial({ color }),
    );
    parent.add(m);
    const outline = new T.Mesh(
      new T.TubeGeometry(curve, 64, radius + 0.018, 7, false),
      new T.MeshBasicMaterial({ color: colors.ink, side: T.BackSide }),
    );
    parent.add(outline);
    return curve;
  }
  flow(
    points: V[],
    color: number,
    kind: "primary" | "steam" | "feed" | "cooling",
    radius = 0.11,
  ) {
    const curve = this.tube(this.scene, points, color, radius);
    const particles: T.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const p = new T.Mesh(
        new T.SphereGeometry(radius * 0.67, 6, 5),
        new T.MeshBasicMaterial({ color: 0xffffff }),
      );
      p.position.copy(curve.getPoint(i / 9));
      this.scene.add(p);
      particles.push(p);
    }
    // Permanent small arrowheads communicate direction even when animation is paused.
    for (const t of [0.3, 0.7]) {
      const p = curve.getPoint(t),
        tangent = curve.getTangent(t);
      const arrow = new T.Mesh(
        new T.ConeGeometry(radius * 1.8, 0.28, 8),
        new T.MeshBasicMaterial({ color: colors.ink }),
      );
      arrow.position.copy(p);
      arrow.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), tangent);
      this.scene.add(arrow);
    }
    this.paths.push({ curve, particles, kind, phase: 0 });
  }
  bolts(parent: T.Object3D, radius: number, y: number, count = 12) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.cylinder(
        parent,
        0.055,
        0.1,
        [Math.cos(a) * radius, y, Math.sin(a) * radius],
        colors.ink,
      );
    }
  }
  build() {
    const base = new T.Group();
    this.scene.add(base);
    this.box(base, [17, 0.15, 10.7], [0, -0.16, 0.2], 0xfafafa);
    // Fine floor construction lines: a drawing surface, not a perspective backdrop.
    for (let x = -8; x <= 8; x += 8) {
      const geo = new T.BufferGeometry().setFromPoints([
        new T.Vector3(x, -0.075, -5),
        new T.Vector3(x, -0.075, 5.4),
      ]);
      base.add(new T.Line(geo, new T.LineBasicMaterial({ color: 0xdce1eb })));
    }
    for (let z = -5; z <= 5; z += 5) {
      const geo = new T.BufferGeometry().setFromPoints([
        new T.Vector3(-8.5, -0.075, z),
        new T.Vector3(8.5, -0.075, z),
      ]);
      base.add(new T.Line(geo, new T.LineBasicMaterial({ color: 0xdce1eb })));
    }
    const overlay = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    overlay.classList.add("leader-lines");
    overlay.setAttribute("aria-hidden", "true");
    this.host.append(overlay);
    for (const id of ids) {
      const g = new T.Group();
      g.position.set(...positions[id]);
      g.userData.equipment = id;
      this.scene.add(g);
      this.groups.set(id, g);
      const button = document.createElement("button");
      button.className = "scene-label";
      button.textContent = equipment[id].short;
      button.dataset.equipment = id;
      button.addEventListener("click", () => this.onDrill(id));
      button.addEventListener("pointerenter", () => this.previewPart(id));
      button.addEventListener("pointerleave", () => this.previewPart());
      this.host.append(button);
      this.labels.set(id, button);
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      overlay.append(line);
      this.leaders.set(id, line);
    }
    const reactor = this.groups.get("reactor")!;
    this.cylinder(reactor, 1.12, 0.22, [0, 0.15, 0], colors.metal);
    this.cylinder(reactor, 1.02, 2.8, [0, 1.7, 0], 0xe4b6a8, true);
    this.ring(reactor, 1.04, [0, 0.4, 0]);
    this.ring(reactor, 1.04, [0, 3.05, 0]);
    const lid = new T.Group();
    reactor.add(lid);
    lid.position.y = 3.2;
    this.mesh(
      new T.SphereGeometry(1.02, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      colors.metal,
      lid,
      [0, 0, 0],
      true,
    );
    this.cylinder(lid, 1.15, 0.18, [0, 0, 0], colors.metal);
    this.bolts(lid, 1.03, 0.15);
    this.lids.push({ object: lid, base: 3.2, offset: 1.1 });
    for (let x = -2; x <= 2; x++)
      for (let z = -2; z <= 2; z++) {
        this.box(
          reactor,
          [0.17, 1.6, 0.17],
          [x * 0.26, 1.45, z * 0.26],
          0xd99b44,
        );
      }
    reactor.add(this.rods);
    this.rods.position.y = 1.7;
    for (let x = -1; x <= 1; x++)
      for (let z = -1; z <= 1; z++)
        this.cylinder(
          this.rods,
          0.045,
          1.55,
          [x * 0.42, 0.6, z * 0.42],
          colors.ink,
        );
    this.box(this.rods, [1.05, 0.12, 1.05], [0, 1.45, 0], colors.metal);
    const pz = this.groups.get("pressurizer")!;
    this.cylinder(pz, 0.52, 3.1, [0, 1.85, 0], colors.casing, true);
    this.cylinder(pz, 0.42, 1.8, [0, 1.22, 0], colors.water);
    this.mesh(
      new T.SphereGeometry(0.52, 20, 12),
      colors.metal,
      pz,
      [0, 3.4, 0],
      true,
    );
    this.cylinder(pz, 0.65, 0.16, [0, 0.2, 0], colors.metal);
    this.tube(
      this.scene,
      [
        [-5, 2.8, 0],
        [-6, 2.8, -1],
        [-6.2, 0.4, -3.2],
      ],
      colors.primary,
      0.07,
    );
    const sg = this.groups.get("steam")!;
    this.cylinder(sg, 1, 4, [0, 2.3, 0], colors.casing, true);
    this.cylinder(sg, 1.12, 0.18, [0, 0.3, 0], colors.metal);
    this.ring(sg, 1.01, [0, 1, 0]);
    this.ring(sg, 1.01, [0, 3.6, 0]);
    const sgLid = new T.Group();
    sg.add(sgLid);
    sgLid.position.y = 4.3;
    this.mesh(
      new T.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      colors.metal,
      sgLid,
      [0, 0, 0],
      true,
    );
    this.cylinder(sgLid, 1.07, 0.12, [0, 0, 0], colors.metal);
    this.bolts(sgLid, 0.98, 0.1);
    this.lids.push({ object: sgLid, base: 4.3, offset: 1.2 });
    for (let i = 0; i < 6; i++) {
      const z = -0.55 + i * 0.22;
      this.tube(
        sg,
        [
          [-0.45, 0.45, z],
          [-0.45, 2.8, z],
          [0, 3.2, z],
          [0.45, 2.8, z],
          [0.45, 0.45, z],
        ],
        colors.primary,
        0.065,
      );
    }
    for (let i = 0; i < 5; i++)
      this.ring(sg, 0.77, [0, 3.5 + i * 0.12, 0], colors.steam, 0.035);
    for (const id of ["primary", "feed"] as const) {
      const p = this.groups.get(id)!;
      this.box(p, [1.05, 0.18, 0.9], [0, 0.1, 0], colors.metal);
      this.cylinder(p, 0.42, 0.65, [0, 0.55, 0], colors.casing, true);
      const impeller = new T.Group();
      p.add(impeller);
      impeller.position.y = 0.65;
      this.box(impeller, [0.64, 0.08, 0.13], [0, 0, 0], colors.ink);
      this.box(impeller, [0.13, 0.08, 0.64], [0, 0, 0], colors.ink);
      this.moving.push({ mesh: impeller, axis: "y", kind: id });
      this.cylinder(
        p,
        0.28,
        0.4,
        [0, 1.05, 0],
        id === "primary" ? colors.primary : colors.water,
      );
    }
    const turbine = this.groups.get("turbine")!;
    this.box(turbine, [3.0, 0.2, 1.8], [0, 0.25, 0], colors.metal);
    for (const x of [-1.05, 1.05])
      this.box(turbine, [0.25, 0.8, 0.8], [x, 0.7, 0], colors.metal);
    const shaft = new T.Group();
    shaft.position.y = 1.6;
    turbine.add(shaft);
    const axle = this.cylinder(shaft, 0.12, 4.7, [1, 0, 0], colors.ink);
    axle.rotation.z = Math.PI / 2;
    for (let i = 0; i < 7; i++) {
      const x = -0.95 + i * 0.3,
        r = 0.4 + i * 0.065;
      const disk = this.cylinder(shaft, r, 0.075, [x, 0, 0], colors.steam);
      disk.rotation.z = Math.PI / 2;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const blade = this.box(
          shaft,
          [0.1, 0.22, 0.1],
          [x, Math.cos(a) * (r + 0.06), Math.sin(a) * (r + 0.06)],
          0xf0d392,
        );
        blade.rotation.x = a;
      }
    }
    this.moving.push({ mesh: shaft, axis: "x", kind: "shaft" });
    const cover = this.cylinder(
      turbine,
      0.94,
      2.8,
      [0, 1.6, 0],
      0xe9c589,
      true,
    );
    cover.rotation.z = Math.PI / 2;
    this.lids.push({ object: cover, base: 1.6, offset: 1.7 });
    const gen = this.groups.get("generator")!;
    this.box(gen, [2.2, 0.2, 1.8], [0, 0.25, 0], colors.metal);
    const caseG = this.cylinder(gen, 0.88, 1.85, [0, 1.6, 0], 0xa9bde6, true);
    caseG.rotation.z = Math.PI / 2;
    this.lids.push({ object: caseG, base: 1.6, offset: 1.7 });
    const rotor = new T.Group();
    gen.add(rotor);
    rotor.position.y = 1.6;
    const rg = this.cylinder(rotor, 0.35, 1.75, [0, 0, 0], colors.ink);
    rg.rotation.z = Math.PI / 2;
    this.box(rotor, [1.6, 0.15, 0.8], [0, 0, 0], colors.primary);
    this.moving.push({ mesh: rotor, axis: "x", kind: "shaft" });
    for (let i = 0; i < 7; i++) {
      const coil = this.ring(
        gen,
        0.65,
        [-0.72 + i * 0.24, 1.6, 0],
        0xbe8052,
        0.07,
      );
      coil.rotation.set(0, Math.PI / 2, 0);
    }
    this.box(gen, [0.55, 0.45, 0.7], [0.5, 2.5, 0], colors.water);
    const condenser = this.groups.get("condenser")!;
    this.box(condenser, [2.8, 1.25, 1.5], [0, 0.85, 0], colors.casing, true);
    for (let i = 0; i < 5; i++)
      this.tube(
        condenser,
        [
          [-1.4, 0.65, -0.5 + i * 0.25],
          [1.4, 0.65, -0.5 + i * 0.25],
        ],
        colors.cold,
        0.065,
      );
    for (const x of [-1.4, 1.4])
      this.box(condenser, [0.16, 1.25, 1.5], [x, 0.85, 0], colors.metal);
    const cooling = this.groups.get("cooling")!;
    this.box(cooling, [2.3, 0.45, 2.1], [0, 0.25, 0], colors.water);
    this.box(cooling, [2.25, 1.45, 1.75], [0, 1.1, 0], colors.casing, true);
    for (let i = 0; i < 7; i++)
      this.box(
        cooling,
        [2.2, 0.035, 1.8],
        [0, 0.55 + i * 0.18, 0],
        colors.metal,
      );
    for (const x of [-0.58, 0.58]) {
      this.ring(cooling, 0.48, [x, 1.92, 0], colors.ink);
      const fan = new T.Group();
      fan.position.set(x, 1.94, 0);
      cooling.add(fan);
      this.box(fan, [0.8, 0.04, 0.12], [0, 0, 0], colors.ink);
      this.box(fan, [0.12, 0.04, 0.8], [0, 0, 0], colors.ink);
      this.moving.push({ mesh: fan, axis: "y", kind: "cooling" });
    }
    // Actual closed circuits. Pipe endpoints stay attached when only casings are exploded.
    this.flow(
      [
        [-5, 2.8, 0],
        [-3.8, 2.8, 0],
        [-2.8, 2.8, -2],
        [-1.95, 0.5, -2],
      ],
      colors.primary,
      "primary",
      0.14,
    );
    this.flow(
      [
        [-1.05, 0.5, -2],
        [-0.7, 0.5, -0.7],
        [-2, 0.5, 1.8],
        [-3, 0.5, 2.1],
        [-4.8, 0.5, 1.8],
        [-5, 0.8, 0],
      ],
      colors.primary,
      "primary",
      0.14,
    );
    this.flow(
      [
        [-1.5, 4.6, -2],
        [-0.7, 4.6, -2],
        [0.3, 3.6, -2],
        [1.8, 3.6, -1.8],
        [2, 2.2, -1.8],
      ],
      colors.steam,
      "steam",
      0.12,
    );
    this.flow(
      [
        [3.5, 1.5, -1.8],
        [4.1, 1.5, -0.8],
        [3.4, 1.1, 1],
        [2.4, 1.1, 2],
      ],
      colors.steam,
      "steam",
      0.16,
    );
    this.flow(
      [
        [1.2, 0.4, 2],
        [-0.3, 0.4, 2.5],
        [-1.3, 0.4, 1.3],
        [-2.6, 1.2, -0.6],
        [-1.8, 1.2, -2],
      ],
      colors.water,
      "feed",
      0.1,
    );
    this.flow(
      [
        [5.4, 0.6, 3.2],
        [4.7, 0.6, 3.2],
        [4, 0.6, 2.5],
        [3.8, 0.6, 2],
      ],
      colors.cold,
      "cooling",
      0.12,
    );
    this.flow(
      [
        [1, 0.65, 2],
        [1, 0.65, 3.6],
        [2.7, 0.65, 4.5],
        [6.8, 0.65, 4.5],
        [7, 0.65, 3.2],
      ],
      colors.cold,
      "cooling",
      0.12,
    );
    const ring = this.ring(this.selection, 1.35, [0, 0.04, 0], 0x315cc5, 0.025);
    ring.scale.set(1, 1, 1);
    this.scene.add(this.selection);
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    const layer = this.detail && this.layers.get(this.detail.id);
    const half = layer
      ? layer.radius * 1.18 * Math.max(1, 1 / (w / h))
      : Math.max(6.1, 10.2 / (w / h));
    if (this.orbit) this.setView({ ...this.captureView(), half });
    this.render();
  }
  highlight(id: EquipmentId) {
    this.selected = id;
    this.selection.position.set(...positions[id]);
    for (const [key, label] of this.labels)
      label.dataset.selected = String(id === key);
    this.render();
  }
  setTransparency(value: boolean) {
    this.transparent = value;
    for (const m of this.shells) {
      const mat = m.material as T.MeshToonMaterial;
      mat.transparent = value;
      mat.needsUpdate = true;
      mat.opacity = value ? 0.26 : 1;
      mat.depthWrite = !value;
      mat.userData.fullOpacity = mat.opacity;
      // Keep outlines legible while revealing the internal parts.
      (
        (m.children[0] as T.LineSegments).material as T.LineBasicMaterial
      ).opacity = value ? 0.44 : 0.9;
    }
    this.applyDetailStyle();
    this.weights.forEach((w, o) => this.fadeObject(o, w));
    this.render();
  }
  setExploded(value: boolean) {
    this.exploded = value;
    for (const item of this.lids)
      item.object.position.y = item.base + (value ? item.offset : 0);
    this.applyDetailStyle();
    this.weights.forEach((w, o) => this.fadeObject(o, w));
    this.render();
  }
  rotate(angle: number) {
    const offset = this.camera.position.clone().sub(this.orbit.target);
    offset.applyAxisAngle(new T.Vector3(0, 1, 0), angle);
    this.camera.position.copy(this.orbit.target).add(offset);
    this.orbit.update();
    this.render();
  }
  zoom(factor: number) {
    this.camera.zoom = T.MathUtils.clamp(this.camera.zoom * factor, 0.65, 2.5);
    this.camera.updateProjectionMatrix();
    this.render();
  }
  reset() {
    const layer = this.detail && this.layers.get(this.detail.id);
    const center = layer ? layer.center : new T.Vector3(0, 1.3, 0);
    const radius = layer ? layer.radius : 4.5;
    this.setView({
      target: center.clone(),
      position: center
        .clone()
        .add(new T.Vector3(12, 10, 17).normalize().multiplyScalar(radius * 5)),
      half: layer
        ? radius *
          1.18 *
          Math.max(1, this.host.clientHeight / this.host.clientWidth)
        : Math.max(
            6.1,
            (10.2 * this.host.clientHeight) / this.host.clientWidth,
          ),
      zoom: 1,
    });
    this.orbit.update();
    this.render();
  }
  setLanguage(language: Lang) {
    this.language = language;
    for (const label of this.detailLabels)
      label.textContent = tr(parts.get(label.dataset.child!)!.name, language);
    for (const [id, label] of this.labels)
      label.textContent = tr(parts.get(id)!.name, language);
    this.renderer.domElement.setAttribute(
      "aria-label",
      language === "en"
        ? "Interactive 3D technical drawing. Drag to rotate. View buttons and component lists provide keyboard alternatives."
        : "Dessin technique 3D interactif. Glisser pour tourner. Les boutons de vue et listes de composants offrent une alternative au clavier.",
    );
    this.render();
  }
  setDetail(part?: Part, immediate = false) {
    this.previewPart();
    const previous = this.detail;
    if (previous?.id === part?.id && this.plantView) {
      this.render();
      return;
    }
    const from = this.captureView();
    if (previous) {
      const old = this.layers.get(previous.id);
      if (old && !this.flight) old.view = from;
    } else if (!this.flight) this.plantView = from;
    for (const label of [...this.detailLabels, ...this.annotations]) label.remove();
    this.annotations = [];
    this.detailLabels = [];
    // Build missing ancestors in order, keeping each child inside its parent coordinates.
    const path: Part[] = [];
    for (let p = part; p; p = p.parent) path.unshift(p);
    for (const p of path) {
      if (this.layers.has(p.id)) continue;
      const anchor = this.anchor(p);
      const mesh = buildDetail(p);
      const sphere = new T.Box3()
        .setFromObject(mesh)
        .getBoundingSphere(new T.Sphere());
      const parent = p.parent && this.layers.get(p.parent.id);
      const radius = parent
        ? T.MathUtils.clamp(
            anchor.radius,
            parent.radius * 0.18,
            parent.radius * 0.52,
          )
        : anchor.radius * 0.95;
      const object = new T.Group();
      mesh.position.copy(sphere.center).multiplyScalar(-1);
      object.add(mesh);
      object.position.copy(anchor.center);
      object.scale.setScalar(radius / Math.max(sphere.radius, 0.001));
      mesh.children.forEach((child) => {
        child.userData.basePosition = child.position.clone();
      });
      mesh.traverse((o) => {
        if (o instanceof T.Mesh)
          o.userData.baseOpacity = (o.material as T.Material).opacity;
      });
      const interior = new Interior(p);
      mesh.add(interior.object);
      if (this.lastState && this.lastControls) interior.update(this.lastState, this.lastControls, 0, this.reduced);
      this.detailRoot.add(object);
      this.layers.set(p.id, { object, center: anchor.center.clone(), radius, interior });
      this.fadeObject(object, 0);
    }
    this.picked = undefined;
    this.detail = part;
    const active = this.activeObject();
    if (part && active) {
      const interior = this.layers.get(part.id)!.interior;
      interior.notes.forEach(note => {
        const label = document.createElement('div'); label.className = 'flow-note';
        const title = document.createElement('span'); title.textContent = tr(note.text, this.language);
        const value = document.createElement('strong');
        label.append(title, value); this.host.append(label); this.annotations.push(label);
      });
    }
    part?.children.forEach((child) => {
      const label = document.createElement("button");
      label.className = "detail-label scene-label";
      label.textContent = tr(child.name, this.language);
      label.dataset.child = child.id;
      label.onclick = () => this.onDrill(child.id);
      label.onpointerenter = () => this.previewPart(child.id);
      label.onpointerleave = () => this.previewPart();
      this.host.append(label);
      this.detailLabels.push(label);
    });
    const layer = part && this.layers.get(part.id);
    const aspect = this.host.clientWidth / Math.max(1, this.host.clientHeight);
    let to = {
      ...(this.plantView ?? from),
      half: Math.max(6.1, 10.2 / aspect),
    };
    if (layer) {
      const direction = from.position.clone().sub(from.target).normalize();
      to = layer.view
        ? { ...layer.view, half: layer.radius * 1.18 * Math.max(1, 1 / aspect) }
        : {
            target: layer.center.clone(),
            position: layer.center
              .clone()
              .addScaledVector(direction, layer.radius * 5),
            half: layer.radius * 1.18 * Math.max(1, 1 / aspect),
            zoom: 1,
          };
      this.detailRadius = layer.radius;
    }
    const destinations = new Map<T.Object3D, number>();
    destinations.set(this.plantRoot, part ? (part.parent ? 0 : 0.055) : 1);
    for (const [id, l] of this.layers)
      destinations.set(
        l.object,
        id === part?.id ? 1 : id === part?.parent?.id ? 0.085 : 0,
      );
    this.applyDetailStyle(false);
    const openings = new Map<T.Object3D, [number, number]>();
    for (const [id, l] of this.layers) openings.set(l.object, [l.object.userData.openAmount ?? 0, id === part?.id ? (this.transparent ? 0.95 : 0) + (this.exploded ? 0.65 : 0) : 1.4]);
    for (const [id, group] of this.groups) openings.set(group, [group.userData.openAmount ?? 0, part?.equipment === id ? 1 : this.exploded ? 0.7 : 0]);
    this.weights.forEach((w, o) => this.fadeObject(o, w));
    if (immediate) {
      this.flight = undefined;
      this.setView(to);
      openings.forEach(([_, to], o) => openSection(o, to));
      destinations.forEach((w, o) => this.fadeObject(o, w));
      this.pruneLayers();
      this.orbit.enabled = true;
    } else {
      this.flight = {
        start: performance.now(),
        from,
        to,
        weights: new Map(this.weights),
        destinations,
        openings,
        descending: !!part && (!previous || part.id.startsWith(previous.id + "/")),
      };
      this.orbit.enabled = false;
      this.host.setAttribute("aria-busy", "true");
    }
    this.render();
  }
  applyDetailStyle(open = true) {
    const root = this.activeObject()?.children[0];
    if (!root) return;
    if (open) openSection(this.activeObject()!, (this.transparent ? 0.95 : 0) + (this.exploded ? 0.65 : 0));
    const interior = this.detail && this.layers.get(this.detail.id)?.interior;
    interior?.object.traverse(o => {
      if (o instanceof T.Mesh || o instanceof T.Line) {
        const material = o.material as T.Material;
        material.depthTest = !this.transparent;
        material.depthWrite = false;
        o.renderOrder = this.transparent ? 4 : 0;
      }
    });
    root.traverse((o) => {
      if (o instanceof T.Mesh && o.userData.baseOpacity < 1) {
        const m = o.material as T.MeshToonMaterial;
        m.opacity = this.transparent ? o.userData.baseOpacity : 1;
        m.transparent = this.transparent;
        m.needsUpdate = true;
        m.depthWrite = !this.transparent;
        m.userData.fullOpacity = m.opacity;
      }
    });
  }
  update(s: State, c: Controls, dt: number) {
    this.lastState = s; this.lastControls = c;
    for (const [id, layer] of this.layers) if (id === this.detail?.id) layer.interior.update(s, c, dt, this.reduced);
    const r = rates(s, c);
    this.rods.position.y = 1.7 + (s.fission / 1200) * 0.7;
    if (!this.reduced && dt > 0) {
      for (const m of this.moving) {
        const speed =
          m.kind === "shaft"
            ? rpm(s) / 600
            : m.kind === "primary"
              ? s.primaryFlow * 3
              : m.kind === "feed"
                ? s.feedFlow * 3
                : s.coolingFlow * 3;
        m.mesh.rotation[m.axis] += speed * dt;
      }
      const obj = this.activeObject()?.children[0];
      if (obj && this.detail) {
        obj.traverse(o => {
          if (o.userData.spin === 'shaft') o.rotateY(rpm(s) / 600 * dt);
          if (o.userData.spin === 'cooling') o.rotateY(s.coolingFlow * 3 * dt);
          if (o.userData.spin === 'pump') o.rotation.y += (this.detail!.equipment === 'primary' ? s.primaryFlow : s.feedFlow) * 3 * dt;
        });
        const kind = this.detail.kind;
        if (["rotor", "shaft", "impeller", "fan"].includes(kind)) {
          const equipment = this.detail.equipment;
          const rate =
            equipment === "primary"
              ? s.primaryFlow
              : equipment === "feed"
                ? s.feedFlow
                : equipment === "cooling"
                  ? s.coolingFlow
                  : rpm(s) / 1800;
          obj.rotation[kind === "impeller" || kind === "fan" ? "y" : "x"] +=
            dt * rate * 2;
        }
      }
    }
    for (const p of this.paths) {
      const flow =
        p.kind === "primary"
          ? s.primaryFlow
          : p.kind === "cooling"
            ? s.coolingFlow
            : r.steamMass / 800;
      if (!this.reduced) p.phase = (p.phase + dt * flow * 0.14) % 1;
      p.particles.forEach((m, i) => {
        m.visible = flow > 0.01;
        m.position.copy(
          p.curve.getPoint((i / p.particles.length + p.phase) % 1),
        );
      });
    }
    this.render();
  }
  render() {
    this.renderer.render(this.scene, this.camera);
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    const occupied: { x: number; y: number; width: number }[] = [];
    const layer = this.detail && this.layers.get(this.detail.id);
    this.annotations.forEach((label, i) => {
      if (!layer) return;
      const note = layer.interior.notes[i];
      const position = layer.interior.object.localToWorld(new T.Vector3(...note.at)).project(this.camera);
      label.hidden = !!this.flight || position.z < -1 || position.z > 1;
      label.style.left = `${T.MathUtils.clamp((position.x + 1) * w / 2, 100, w - 100)}px`;
      label.style.top = `${T.MathUtils.clamp((1 - position.y) * h / 2, 70, h - 100)}px`;
      label.children[0].textContent = tr(note.text, this.language);
      if (this.lastState && this.lastControls) label.children[1].textContent = annotationValue(note, this.lastState, this.lastControls);
    });
    for (const [id, label] of this.labels) {
      const pos = new T.Vector3(...positions[id]);
      pos.y =
        height[id] +
        (this.exploded &&
        ["reactor", "steam", "turbine", "generator"].includes(id)
          ? 0.9
          : 0);
      pos.project(this.camera);
      // Clamp labels inside the viewport; equipment also available in the text selector.
      const anchorX = ((pos.x + 1) * w) / 2,
        anchorY = ((-pos.y + 1) * h) / 2 + 13;
      const x = T.MathUtils.clamp(anchorX, 78, Math.max(78, w - 78));
      let y = T.MathUtils.clamp(anchorY - 13, 30, h - 24);
      const width = label.offsetWidth || 120;
      for (let i = 0; i < 8; i++) {
        if (
          !occupied.some(
            (o) =>
              Math.abs(o.x - x) < (o.width + width) / 2 + 5 &&
              Math.abs(o.y - y) < 32,
          )
        )
          break;
        y = y + 34 < h - 24 ? y + 34 : y - 34;
      }
      if (!this.detail) occupied.push({ x, y, width });
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
      label.hidden =
        !!this.detail ||
        !!this.flight ||
        (!this.showLabels && id !== (this.hoverId ?? this.selected)) ||
        (w < 580 && id !== this.selected);
      const line = this.leaders.get(id)!;
      line.setAttribute("x1", String(anchorX));
      line.setAttribute("y1", String(anchorY));
      line.setAttribute("x2", String(x));
      line.setAttribute("y2", String(y - 14));
      line.style.display = label.hidden ? "none" : "";
    }
    this.detailLabels.forEach((label, i) => {
      label.hidden = !this.showLabels || !!this.flight;
      const anchor = this.anchor(
        parts.get(label.dataset.child!)!,
      ).center.project(this.camera);
      const x = T.MathUtils.clamp(
        ((anchor.x + 1) * w) / 2,
        85,
        Math.max(85, w - 85),
      );
      let y = T.MathUtils.clamp(((1 - anchor.y) * h) / 2, 30, h - 30);
      while (
        occupied.some(
          (o) => Math.abs(o.x - x) < 160 && Math.abs(o.y - y) < 32,
        ) &&
        y < h - 55
      )
        y += 34;
      occupied.push({ x, y, width: 150 });
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
    });
  }
}
