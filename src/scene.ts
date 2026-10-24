import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Playthings, type Addon } from "./playthings";
import { journeyFrame, journeySpeed } from "./journey";
import { buildMachine, palette, type Machine } from "./industrial";
import { buildDetail } from "./detail";
import { Interior } from "./interior";
import { openSection, pickedSphere } from "./section";
import { parts, type Part } from "./parts";
import { rates, rpm, secondaryT, type State, type Controls } from "./physics";
import { actionEquipment, type Action } from "./startup";

type View = { target: T.Vector3; position: T.Vector3 };
type Layer = {
  object: T.Group;
  center: T.Vector3;
  radius: number;
  interior?: Interior;
  view?: View;
  native: boolean;
};
type Flight = {
  start: number;
  from: View;
  to: View;
  weights: Map<T.Object3D, number>;
  destinations: Map<T.Object3D, number>;
};
const smooth = (t: number) => {
  const v = T.MathUtils.clamp(t, 0, 1);
  return v * v * (3 - 2 * v);
};

export class MachineScene {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(34, 1, 0.02, 250);
  renderer: T.WebGLRenderer;
  orbit: OrbitControls;
  machine: Machine;
  toys: Playthings;
  journey?: { progress: number; saved: View; entering: boolean };
  traveller = new T.Group();
  onJourneyEnd: () => void = () => {};
  flow: Interior;
  machineInteriors = new Map<string, Interior>();
  detailRoot = new T.Group();
  layers = new Map<string, Layer>();
  weights = new Map<T.Object3D, number>();
  detail?: Part;
  flight?: Flight;
  overview?: View;
  cutaway = true;
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  picked?: { id: string; sphere: T.Sphere };
  onAction: (action: Action) => void = () => {};
  onDrill: (part?: string) => void = () => {};
  onProject: () => void = () => {};
  ray = new T.Raycaster();
  pointer = new T.Vector2();
  highlighted?: T.Object3D;
  highlightMaterials: {
    material: T.MeshStandardMaterial;
    emissive: T.Color;
  }[] = [];
  lastState?: State;
  lastControls?: Controls;
  private occluders = new Map<
    T.Material,
    { opacity: number; transparent: boolean; depthWrite: boolean }
  >();
  private lastOcclusion = 0;
  private ghostMaterials = new Map<
    T.Material,
    { opacity: number; transparent: boolean; depthWrite: boolean }
  >();
  private sectionTargets = new Map<T.Object3D, number>();
  private lastRender = 0;
  private dirty = true;
  private modelElapsed = 0;
  private previousNow = performance.now();
  constructor(public host: HTMLElement) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor(0xffffff);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.NoToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.tabIndex = 0;
    host.prepend(this.renderer.domElement);
    this.scene.background = new T.Color(0xffffff);
    this.scene.add(new T.HemisphereLight(0xffffff, 0xb3c9ff, 1.8));
    const key = new T.DirectionalLight(0xffffff, 2.2);
    key.position.set(-6, 15, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -14;
    key.shadow.camera.right = 14;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 40;
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.025;
    this.scene.add(key);
    const rim = new T.DirectionalLight(0xe4eeff, 0.5);
    rim.position.set(8, 8, -7);
    this.scene.add(rim);
    const ground = new T.Mesh(
      new T.PlaneGeometry(150, 150),
      new T.ShadowMaterial({ opacity: 0.07 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.71;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.machine = buildMachine();
    this.toys = new Playthings(this.machine);
    for (const g of this.machine.equipment.values()) this.addOutlines(g);
    const drop = new T.Mesh(
      new T.SphereGeometry(0.12, 16, 12),
      new T.MeshBasicMaterial({
        color: 0x008dde,
        depthTest: false,
        transparent: true,
        depthWrite: false,
      }),
    );
    drop.scale.y = 1.35;
    drop.renderOrder = 8;
    this.traveller.add(drop);
    for (const x of [-0.045, 0.045]) {
      const eye = new T.Mesh(
        new T.SphereGeometry(0.038, 8, 6),
        new T.MeshBasicMaterial({
          color: 0xffffff,
          depthTest: false,
          transparent: true,
          depthWrite: false,
        }),
      );
      eye.position.set(x, 0.025, 0.13);
      eye.renderOrder = 9;
      this.traveller.add(eye);
      const pupil = new T.Mesh(
        new T.SphereGeometry(0.018, 8, 6),
        new T.MeshBasicMaterial({
          color: palette.dark,
          depthTest: false,
          transparent: true,
          depthWrite: false,
        }),
      );
      pupil.position.set(x, 0.025, 0.165);
      pupil.renderOrder = 10;
      this.traveller.add(pupil);
    }
    const ring = new T.Mesh(
      new T.TorusGeometry(0.19, 0.018, 6, 28),
      new T.MeshBasicMaterial({
        color: palette.dark,
        depthTest: false,
        transparent: true,
        depthWrite: false,
      }),
    );
    ring.renderOrder = 8;
    this.traveller.add(ring);
    this.traveller.visible = false;
    this.scene.add(this.traveller);
    this.scene.add(this.machine.root, this.detailRoot);
    this.flow = new Interior({ routes: this.machine.routes, notes: [] });
    this.machine.root.add(this.flow.object);
    this.transportStyle(this.flow);
    for (const [id, routes] of this.machine.interiors) {
      const interior = new Interior({ routes, notes: [] });
      this.machine.equipment.get(id)!.add(interior.object);
      this.machineInteriors.set(id, interior);
      this.transportStyle(interior);
    }
    for (const g of this.machine.equipment.values()) {
      openSection(g, 0.42);
      this.sectionTargets.set(g, 0.42);
    }
    for (const moving of this.machine.rotating)
      moving.object.traverse((o) => {
        if (o instanceof T.Mesh) o.castShadow = false;
      });
    this.camera.position.set(17, 14, 22);
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.target.set(0.2, 1.7, 0.25);
    this.orbit.enableDamping = false;
    this.orbit.enablePan = false;
    this.orbit.minPolarAngle = 0.18;
    this.orbit.maxPolarAngle = Math.PI * 0.48;
    this.orbit.minDistance = 0.00001;
    this.orbit.maxDistance = 80;
    this.orbit.update();
    this.orbit.addEventListener("change", () => {
      this.adaptClip();
      this.dirty = true;
      this.project();
    });
    let down = [0, 0];
    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      down = [e.clientX, e.clientY];
    });
    this.renderer.domElement.addEventListener("pointerup", (e) => {
      if (
        this.journey ||
        this.flight ||
        Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5
      )
        return;
      const hit = this.pick(e.clientX, e.clientY);
      if (!hit) return;
      if (hit.action) {
        this.onAction(hit.action);
        return;
      }
      if (hit.id) {
        this.picked = {
          id: hit.id,
          sphere: pickedSphere(hit.object, hit.instanceId),
        };
        this.onDrill(hit.id);
      }
    });
    this.renderer.domElement.addEventListener("pointermove", (e) => {
      if (e.buttons || this.flight || this.journey) return;
      const hit = this.pick(e.clientX, e.clientY);
      this.highlight(hit?.object);
      this.renderer.domElement.style.cursor = hit?.action
        ? "pointer"
        : hit?.id
          ? "zoom-in"
          : "grab";
    });
    this.renderer.domElement.addEventListener("pointerleave", () =>
      this.highlight(),
    );
    new ResizeObserver(() => this.resize()).observe(host);
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
      "change",
      (e) => {
        this.reduced = e.matches;
        this.dirty = true;
      },
    );
    this.fade(this.machine.root, 1);
    this.resize();
    this.renderer.shadowMap.needsUpdate = true;
  }
  private pick(x: number, y: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((x - rect.left) / rect.width) * 2 - 1,
      (-(y - rect.top) / rect.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    const sources = this.detail
      ? [this.layers.get(this.detail.id)!.object]
      : [...this.machine.equipment.values()];
    for (const h of this.ray.intersectObjects(sources, true)) {
      if (!(h.object instanceof T.Mesh)) continue;
      if (!(h.object.material as T.Material).visible) continue;
      let o: T.Object3D | null = h.object;
      while (o) {
        if (o.userData.action)
          return { object: o, action: o.userData.action as Action };
        if (this.detail && o.userData.child) {
          const target = o.userData.pickGroup ?? o;
          return {
            id: o.userData.child as string,
            object: target,
            instanceId: target === h.object ? h.instanceId : undefined,
          };
        }
        if (!this.detail && o.userData.equipment)
          return { id: o.userData.equipment as string, object: o };
        o = o.parent;
      }
    }
  }
  private highlight(object?: T.Object3D) {
    if (object === this.highlighted) return;
    for (const h of this.highlightMaterials)
      h.material.emissive.copy(h.emissive);
    this.highlightMaterials = [];
    this.highlighted = object;
    object?.traverse((o) => {
      if (o instanceof T.Mesh && o.material instanceof T.MeshStandardMaterial) {
        this.highlightMaterials.push({
          material: o.material,
          emissive: o.material.emissive.clone(),
        });
        o.material.emissive.setHex(0x193346);
      }
    });
    this.dirty = true;
  }
  focusAction(action?: Action) {
    this.highlight(
      action ? this.machine.equipment.get(actionEquipment[action]) : undefined,
    );
  }
  private capture(): View {
    return {
      target: this.orbit.target.clone(),
      position: this.camera.position.clone(),
    };
  }
  private adaptClip() {
    const d = this.camera.position.distanceTo(this.orbit.target);
    this.camera.near = Math.max(0.00000001, d / 3000);
    this.camera.far = Math.max(80, d * 20);
    this.camera.updateProjectionMatrix();
  }
  private apply(v: View) {
    this.camera.position.copy(v.position);
    this.orbit.target.copy(v.target);
    this.camera.lookAt(v.target);
    this.adaptClip();
  }
  private frameView(
    center: T.Vector3,
    radius: number,
    direction?: T.Vector3,
  ): View {
    const aspect = this.host.clientWidth / Math.max(1, this.host.clientHeight),
      distance =
        (radius / Math.sin(T.MathUtils.degToRad(34 / 2))) *
        Math.max(1, 1 / aspect) *
        1.1;
    return {
      target: center.clone(),
      position: center
        .clone()
        .addScaledVector(
          direction ?? new T.Vector3(0.58, 0.48, 0.73).normalize(),
          distance,
        ),
    };
  }
  private fade(object: T.Object3D, weight: number) {
    this.weights.set(object, weight);
    object.traverse((o) => {
      if (!(o instanceof T.Mesh || o instanceof T.Line)) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        m.userData.fullOpacity ??= m.opacity;
        m.visible = weight > 0.2 || (o instanceof T.Line && weight > 0.001);
        m.opacity =
          o instanceof T.Line
            ? weight < 0.5
              ? weight * 0.35
              : m.userData.fullOpacity
            : m.userData.fullOpacity * weight;
        const transparent = m.opacity < 1;
        if (m.transparent !== transparent) {
          m.transparent = transparent;
          m.needsUpdate = true;
        }
        m.depthWrite = m.opacity >= 0.99 && !m.userData.transport;
      }
    });
  }
  private anchor(part: Part): T.Sphere {
    if (this.picked?.id === part.id) return this.picked.sphere.clone();
    const parent = part.parent ? this.layers.get(part.parent.id) : undefined;
    const source = parent?.object ?? this.machine.equipment.get(part.id);
    source?.updateWorldMatrix(true, true);
    const matches: T.Object3D[] = [];
    source?.traverse((o) => {
      if (o.userData.child === part.id) matches.push(o);
    });
    if (matches.length) {
      const o = matches.find((o) => o instanceof T.Group) ?? matches[0];
      return pickedSphere(o);
    }
    if (!part.parent && source) return pickedSphere(source);
    return new T.Sphere(
      parent?.center.clone() ?? new T.Vector3(),
      (parent?.radius ?? 3) * 0.32,
    );
  }
  private addOutlines(object: T.Object3D) {
    const meshes: T.Mesh[] = [];
    object.traverse((o) => {
      if (
        o instanceof T.Mesh &&
        !(o instanceof T.InstancedMesh) &&
        !o.userData.outlined
      )
        meshes.push(o);
    });
    for (const m of meshes) {
      m.userData.outlined = true;
      const edge = new T.LineSegments(
        new T.EdgesGeometry(m.geometry, 35),
        new T.LineBasicMaterial({
          color: palette.dark,
          transparent: true,
          opacity: 0.62,
          depthWrite: false,
        }),
      );
      m.add(edge);
    }
  }
  private physicalDetail(object: T.Object3D) {
    object.traverse((o) => {
      if (o instanceof T.Mesh) {
        const old = o.material as T.MeshToonMaterial,
          hex = old.color.getHex();
        const color =
          hex === 0xf1f4fa
            ? palette.enamel
            : hex === 0xd4a54e
              ? palette.copper
              : hex === 0xcf725b
                ? palette.orange
                : hex === 0x5b80c9
                  ? palette.blue
                  : hex === 0x252a35
                    ? palette.dark
                    : hex;
        const opacity = old.opacity < 0.5 ? old.opacity : 1;
        o.material = new T.MeshStandardMaterial({
          color,
          metalness: 0.05,
          roughness: 0.8,
          transparent: opacity < 1,
          opacity,
          depthWrite: opacity === 1,
          side: T.DoubleSide,
        });
        old.dispose();
        o.receiveShadow = false;
        o.castShadow = false;
      } else if (o instanceof T.Line) {
        (o.material as T.LineBasicMaterial).opacity = 0.65;
        (o.material as T.LineBasicMaterial).color.setHex(palette.dark);
      }
    });
  }
  setDetail(part?: Part) {
    if (this.journey) this.stopJourney();
    if (this.detail?.id === part?.id) return;
    this.highlight();
    const previous = this.detail,
      from = this.capture();
    if (previous && !this.flight) this.layers.get(previous.id)!.view = from;
    else if (!previous && !this.flight) this.overview = from;
    const path: Part[] = [];
    for (let p = part; p; p = p.parent) path.unshift(p);
    for (const p of path) {
      if (this.layers.has(p.id)) continue;
      const anchor = this.anchor(p);
      if (!p.parent) {
        const object = this.machine.equipment.get(p.id)!;
        const opening = object.userData.openAmount ?? 0;
        openSection(object, this.cutaway ? 0.95 : 0);
        const openedBounds = pickedSphere(object);
        openSection(object, opening);
        this.addOutlines(object);
        // Existing physical equipment is the first level. No replacement model on entry.
        this.layers.set(p.id, {
          object,
          center: openedBounds.center.clone(),
          radius: openedBounds.radius,
          native: true,
        });
        continue;
      }
      const geometry = buildDetail(p);
      // Preserve each machine's shaft direction as additional structure is revealed.
      if (p.equipment === "generator") {
        if (["stator", "wire", "insulation"].includes(p.kind))
          geometry.rotation.z = Math.PI / 2;
        if (p.kind === "coil") geometry.rotation.y = Math.PI / 2;
      }
      if (["primary", "feed"].includes(p.equipment) && p.kind === "motor")
        geometry.rotation.z = Math.PI / 2;
      if (["condenser", "cooling"].includes(p.equipment) && p.kind === "tube")
        geometry.rotation.z = Math.PI / 2;
      this.physicalDetail(geometry);
      openSection(geometry, this.cutaway ? 0.95 : 0);
      const raw = pickedSphere(geometry),
        parent = this.layers.get(p.parent.id)!;
      openSection(geometry, 0);
      const radius = T.MathUtils.clamp(
        anchor.radius,
        parent.radius * 0.16,
        parent.radius * 0.55,
      );
      const object = new T.Group();
      geometry.position.copy(raw.center).negate();
      object.add(geometry);
      object.position.copy(anchor.center);
      object.scale.setScalar(radius / Math.max(0.001, raw.radius));
      const interior = new Interior(p);
      geometry.add(interior.object);
      this.transportStyle(interior);
      if (this.lastState && this.lastControls)
        interior.update(this.lastState, this.lastControls, 0, this.reduced);
      this.detailRoot.add(object);
      this.layers.set(p.id, {
        object,
        center: anchor.center.clone(),
        radius,
        interior,
        native: false,
      });
      this.fade(object, 0);
    }
    this.picked = undefined;
    this.detail = part;
    const layer = part && this.layers.get(part.id),
      direction = from.position.clone().sub(from.target).normalize();
    const to = layer
      ? (layer.view ?? this.frameView(layer.center, layer.radius, direction))
      : (this.overview ??
        this.frameView(new T.Vector3(0.6, 1.5, 2.1), this.overviewRadius));
    const destinations = new Map<T.Object3D, number>();
    destinations.set(this.machine.root, part ? 0.045 : 1);
    for (const [id, l] of this.layers)
      destinations.set(
        l.object,
        id === part?.id ? 1 : id === part?.parent?.id ? 0.13 : part ? 0 : 1,
      );
    // Native equipment is included in the plant fade; restore it only along the active path.
    if (!part)
      for (const [id, l] of this.layers)
        if (!l.native) destinations.set(l.object, 0);
    this.flight = {
      start: performance.now(),
      from,
      to,
      weights: new Map(this.weights),
      destinations,
    };
    this.orbit.enabled = false;
    this.setSections();
    this.dirty = true;
  }
  private setSections() {
    for (const [id, g] of this.machine.equipment)
      this.sectionTargets.set(
        g,
        this.cutaway
          ? this.detail?.id === id
            ? 0.95
            : this.detail?.equipment === id
              ? 1.3
              : 0.42
          : 0,
      );
    for (const [id, l] of this.layers)
      if (!l.native)
        this.sectionTargets.set(
          l.object,
          this.cutaway ? (id === this.detail?.id ? 0.95 : 1.4) : 0,
        );
  }
  syncControls(c: Controls) {
    for (const lever of this.machine.actuators) {
      const a = lever.userData.actuator as Action;
      const v =
        a === "cooling"
          ? c.cooling
          : a === "primary"
            ? c.primary
            : a === "heat"
              ? c.power
              : a === "steam"
                ? c.valve
                : c.generator
                  ? 1
                  : 0;
      lever.rotation.z = v > 0 ? 0.5 : -0.45;
    }
    this.dirty = true;
  }
  setCutaway(value: boolean) {
    this.cutaway = value;
    this.setSections();
    this.transportStyle(this.flow);
    for (const i of this.machineInteriors.values()) this.transportStyle(i);
    for (const l of this.layers.values())
      if (l.interior) this.transportStyle(l.interior);
    this.dirty = true;
  }
  private transportStyle(interior: Interior) {
    interior.object.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Line) {
        (o.material as T.Material).depthTest = !this.cutaway;
        (o.material as T.Material).depthWrite = false;
        o.renderOrder = this.cutaway ? 4 : 0;
      }
    });
  }
  private prune() {
    for (const [id, l] of this.layers) {
      if (
        l.native ||
        (this.detail &&
          (id === this.detail.id || this.detail.id.startsWith(id + "/")))
      )
        continue;
      l.object.traverse((o) => {
        if (o instanceof T.Mesh || o instanceof T.Line) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
        }
      });
      this.detailRoot.remove(l.object);
      this.layers.delete(id);
      this.weights.delete(l.object);
      this.sectionTargets.delete(l.object);
    }
  }
  projectPoint(point: T.Vector3) {
    const p = point.clone().project(this.camera);
    return {
      x: ((p.x + 1) * this.host.clientWidth) / 2,
      y: ((1 - p.y) * this.host.clientHeight) / 2,
      visible: p.z > -1 && p.z < 1,
    };
  }
  actionPoint(action: Action) {
    return this.projectPoint(this.machine.anchors[action]);
  }
  childPoint(part: Part) {
    return this.projectPoint(this.anchor(part).center);
  }
  private project() {
    this.onProject();
  }
  get overviewRadius() {
    return this.host.clientWidth < 700 ? 6.8 : 6.6;
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    if (!this.journey) this.overview = undefined;
    this.camera.aspect = w / h;
    this.renderer.setSize(w, h);
    if (this.journey) {
      this.adaptClip();
      this.dirty = true;
      return;
    }
    const layer = this.detail && this.layers.get(this.detail.id);
    const view = this.frameView(
      layer ? layer.center : new T.Vector3(0.6, 1.5, 2.1),
      layer ? layer.radius : this.overviewRadius,
    );
    if (this.flight) this.flight.to = view;
    else this.apply(view);
    this.dirty = true;
    this.project();
  }
  resetView() {
    const l = this.detail && this.layers.get(this.detail.id);
    const to = this.frameView(
      l ? l.center : new T.Vector3(0.6, 1.5, 2.1),
      l ? l.radius : this.overviewRadius,
    );
    this.flight = {
      start: performance.now(),
      from: this.capture(),
      to,
      weights: new Map(this.weights),
      destinations: new Map(this.weights),
    };
    this.orbit.enabled = false;
  }
  rotate(angle: number) {
    if (this.flight || this.journey) return;
    this.camera.position
      .sub(this.orbit.target)
      .applyAxisAngle(new T.Vector3(0, 1, 0), angle)
      .add(this.orbit.target);
    this.orbit.update();
    this.dirty = true;
  }
  zoom(factor: number) {
    if (this.flight || this.journey) return;
    this.camera.position
      .sub(this.orbit.target)
      .multiplyScalar(T.MathUtils.clamp(factor, 0.7, 1.4))
      .add(this.orbit.target);
    this.orbit.update();
    this.dirty = true;
  }
  toggleAddon(id: Addon) {
    const active = this.toys.toggle(id);
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
    return active;
  }
  startJourney() {
    if (this.journey) return;
    const saved = this.detail
      ? (this.overview ?? this.capture())
      : this.capture();
    this.setDetail();
    this.journey = { progress: 0, saved, entering: true };
    this.setCutaway(true);
    for (const g of this.machine.equipment.values())
      this.sectionTargets.set(g, 1.2);
    const sample = journeyFrame(0),
      to = this.journeyView(sample.point, sample.tangent);
    const destinations = new Map<T.Object3D, number>([[this.machine.root, 1]]);
    for (const l of this.layers.values())
      destinations.set(l.object, l.native ? 1 : 0);
    this.flight = {
      start: performance.now(),
      from: this.capture(),
      to,
      weights: new Map(this.weights),
      destinations,
    };
    this.orbit.enabled = false;
    this.traveller.visible = true;
    this.traveller.position.copy(sample.point);
    this.dirty = true;
  }
  stopJourney() {
    const j = this.journey;
    if (!j) return;
    this.journey = undefined;
    this.traveller.visible = false;
    for (const [m, v] of this.ghostMaterials) {
      Object.assign(m, v);
      m.needsUpdate = true;
    }
    this.ghostMaterials.clear();
    this.restoreOccluders();
    this.flight = {
      start: performance.now(),
      from: this.capture(),
      to: j.saved,
      weights: new Map(this.weights),
      destinations: new Map(this.weights),
    };
    this.setSections();
    this.dirty = true;
    this.onJourneyEnd();
  }
  nextStation() {
    if (!this.journey) return;
    const stops = [0, 0.14, 0.27, 0.39, 0.48, 0.57, 0.68, 0.81, 0.93, 1];
    this.journey.progress =
      stops.find((p) => p > this.journey!.progress + 0.001) ?? 1;
    this.dirty = true;
    if (this.journey.progress === 1) this.stopJourney();
  }
  private journeyView(point: T.Vector3, tangent: T.Vector3): View {
    const side = new T.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(0.55);
    return {
      target: point.clone().addScaledVector(tangent, 0.32),
      position: point
        .clone()
        .addScaledVector(tangent, -2.1)
        .add(side)
        .add(new T.Vector3(0, 0.85, 0)),
    };
  }
  private restoreOccluders() {
    for (const [m, v] of this.occluders) {
      Object.assign(m, v);
      m.needsUpdate = true;
    }
    this.occluders.clear();
  }
  private clearViewTo(point: T.Vector3) {
    if (performance.now() - this.lastOcclusion < 120) return;
    this.lastOcclusion = performance.now();
    this.restoreOccluders();
    const direction = point.clone().sub(this.camera.position),
      distance = direction.length();
    const ray = new T.Raycaster(
      this.camera.position,
      direction.normalize(),
      0,
      distance - 0.15,
    );
    for (const hit of ray.intersectObjects([this.machine.root], true)) {
      if (
        !(hit.object instanceof T.Mesh) ||
        hit.object instanceof T.InstancedMesh
      )
        continue;
      for (const m of Array.isArray(hit.object.material)
        ? hit.object.material
        : [hit.object.material]) {
        if (
          this.ghostMaterials.has(m) ||
          this.occluders.has(m) ||
          m.opacity < 0.2
        )
          continue;
        this.occluders.set(m, {
          opacity: m.opacity,
          transparent: m.transparent,
          depthWrite: m.depthWrite,
        });
        m.opacity = 0.04;
        m.transparent = true;
        m.depthWrite = false;
        m.needsUpdate = true;
      }
    }
  }
  private advanceJourney(s: State, c: Controls, dt: number, wall: number) {
    const j = this.journey!;
    if (!this.ghostMaterials.size)
      for (const g of this.machine.equipment.values())
        g.traverse((o) => {
          if (!o.userData.opening) return;
          o.traverse((child) => {
            if (child instanceof T.Mesh || child instanceof T.Line) {
              for (const m of Array.isArray(child.material)
                ? child.material
                : [child.material]) {
                if (this.ghostMaterials.has(m)) continue;
                this.ghostMaterials.set(m, {
                  opacity: m.opacity,
                  transparent: m.transparent,
                  depthWrite: m.depthWrite,
                });
                m.opacity = child instanceof T.Line ? 0.13 : 0.035;
                m.transparent = true;
                m.depthWrite = false;
                m.needsUpdate = true;
              }
            }
          });
        });
    if (!this.reduced)
      j.progress = Math.min(
        1,
        j.progress + (dt / 90) * journeySpeed(j.progress, s, c),
      );
    const sample = journeyFrame(j.progress),
      v = this.journeyView(sample.point, sample.tangent);
    const e = this.reduced ? 1 : 1 - Math.exp(-wall * 4.5);
    this.apply({
      position: this.camera.position.clone().lerp(v.position, e),
      target: this.orbit.target.clone().lerp(v.target, e),
    });
    this.clearViewTo(sample.point);
    this.traveller.position.copy(sample.point);
    this.traveller.quaternion.copy(this.camera.quaternion);
    this.traveller.visible = sample.chapter !== "exchange";
    const drop = this.traveller.children[0] as T.Mesh;
    (drop.material as T.MeshBasicMaterial).color.setHex(
      sample.chapter === "secondary" && sample.u < 0.65
        ? palette.orange
        : palette.blue,
    );
    drop.scale.setScalar(
      sample.chapter === "secondary" && sample.u < 0.65 ? 1.35 : 1,
    );
    if (j.progress === 1) this.stopJourney();
  }
  update(s: State, c: Controls, dt: number, now: number) {
    this.lastState = s;
    this.lastControls = c;
    this.modelElapsed += dt;
    const wall = Math.min(0.1, (now - this.previousNow) / 1000);
    this.previousNow = now;
    let structural = false;
    for (const [object, target] of this.sectionTargets) {
      const current = object.userData.openAmount ?? 0;
      if (Math.abs(current - target) > 0.001) {
        openSection(
          object,
          this.reduced
            ? target
            : T.MathUtils.lerp(current, target, 1 - Math.exp(-wall * 5)),
        );
        structural = true;
      }
    }
    if (this.flight) {
      const f = this.flight,
        t = Math.min(1, (now - f.start) / (this.reduced ? 120 : 1600)),
        e = smooth((t - 0.1) / 0.9);
      const direction = f.from.position
        .clone()
        .sub(f.from.target)
        .normalize()
        .lerp(f.to.position.clone().sub(f.to.target).normalize(), e)
        .normalize();
      const distance = Math.exp(
        T.MathUtils.lerp(
          Math.log(f.from.position.distanceTo(f.from.target)),
          Math.log(f.to.position.distanceTo(f.to.target)),
          e,
        ),
      );
      const target = f.from.target.clone().lerp(f.to.target, e);
      this.apply(
        this.reduced
          ? f.to
          : {
              target,
              position: target.clone().addScaledVector(direction, distance),
            },
      );
      f.destinations.forEach((w, o) =>
        this.fade(
          o,
          T.MathUtils.lerp(f.weights.get(o) ?? 0, w, smooth((t - 0.18) / 0.82)),
        ),
      );
      structural = true;
      if (t === 1) {
        this.flight = undefined;
        this.orbit.enabled = !this.journey;
        if (this.journey) this.journey.entering = false;
        this.orbit.update();
        this.prune();
      }
    }
    if (
      this.journey &&
      !this.flight &&
      (dt > 0 || (this.reduced && this.dirty))
    ) {
      this.advanceJourney(s, c, dt, wall);
      this.dirty = true;
    }
    const targetFov = this.journey ? 62 : 34;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = this.reduced
        ? targetFov
        : T.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.exp(-wall * 3));
      this.camera.updateProjectionMatrix();
      this.dirty = true;
    }
    if (structural) {
      this.dirty = true;
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (this.modelElapsed >= 1 / 30) {
      const elapsed = this.modelElapsed;
      this.modelElapsed = 0;
      const r = rates(s, c);
      this.toys.update(r.electric, elapsed, this.reduced);
      this.flow.update(s, c, elapsed, this.reduced);
      for (const interior of this.machineInteriors.values())
        interior.update(s, c, elapsed, this.reduced);
      const layer = this.detail && this.layers.get(this.detail.id);
      layer?.interior?.update(s, c, elapsed, this.reduced);
      const velocities = {
        primary: s.primaryFlow,
        feed: s.feedFlow,
        cooling: s.coolingFlow,
        shaft: rpm(s) / 1100,
      };
      if (!this.reduced)
        for (const m of this.machine.rotating)
          m.object.rotateY(velocities[m.kind] * elapsed * 2.2);
      if (layer?.interior && !this.reduced) {
        const obj = layer.object.children[0];
        obj.traverse((o) => {
          if (o.userData.spin === "shaft")
            o.rotateY(velocities.shaft * elapsed * 2);
          if (o.userData.spin === "pump")
            o.rotateY(
              velocities[
                this.detail!.equipment === "primary" ? "primary" : "feed"
              ] *
                elapsed *
                2,
            );
          if (o.userData.spin === "cooling")
            o.rotateY(velocities.cooling * elapsed * 2);
        });
        if (["rotor", "shaft", "impeller", "fan"].includes(this.detail!.kind))
          obj.rotateOnAxis(
            new T.Vector3(
              this.detail!.kind === "impeller" || this.detail!.kind === "fan"
                ? 0
                : 1,
              this.detail!.kind === "impeller" || this.detail!.kind === "fan"
                ? 1
                : 0,
              0,
            ),
            elapsed *
              (this.detail!.equipment === "primary"
                ? s.primaryFlow
                : this.detail!.equipment === "feed"
                  ? s.feedFlow
                  : this.detail!.equipment === "cooling"
                    ? s.coolingFlow
                    : velocities.shaft) *
              2,
          );
      }
      for (const lever of this.machine.actuators) {
        const action = lever.userData.actuator as Action;
        const value =
          action === "cooling"
            ? c.cooling
            : action === "primary"
              ? c.primary
              : action === "heat"
                ? c.power
                : action === "steam"
                  ? c.valve
                  : c.generator
                    ? 1
                    : 0;
        lever.rotation.z = T.MathUtils.lerp(
          lever.rotation.z,
          value > 0 ? 0.5 : -0.45,
          1 - Math.exp(-elapsed * 10),
        );
      }
      for (const fuel of this.machine.fuel) {
        fuel.emissive.setHex(palette.orange);
        fuel.emissiveIntensity = Math.min(0.45, (r.heat / 1200) * 0.4);
      }
      for (const gauge of this.machine.gauges) {
        const value =
          gauge.kind === "primary"
            ? s.primaryT / 340
            : gauge.kind === "secondary"
              ? secondaryT(s) / 300
              : r.electric / 350;
        gauge.needle.rotation.y =
          -Math.PI * 0.75 + T.MathUtils.clamp(value, 0, 1) * Math.PI * 1.5;
      }
      if (
        s.primaryFlow +
          s.coolingFlow +
          s.feedFlow +
          s.fission +
          s.decayE +
          s.rotorE >
        0.001
      )
        this.dirty = true;
    }
    if (this.dirty && (now - this.lastRender > 1000 / 30 || structural)) {
      this.renderer.render(this.scene, this.camera);
      this.lastRender = now;
      this.dirty = false;
      this.project();
    }
  }
}
