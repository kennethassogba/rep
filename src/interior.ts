import * as T from 'three';
import { rates, secondaryT, rpm, type State, type Controls } from './physics.ts';
import type { Part, Pair } from './parts';

type V = [number, number, number];
export type Transport = 'primary' | 'steam' | 'feed' | 'cooling' | 'heat' | 'exchange' | 'electric' | 'shaft' | 'rejected';
export type Route = { points: V[]; kind: Transport; color: number; endColor?: number };
export type Annotation = { at: V; text: Pair; value?: 'primary' | 'secondary' | 'condenser' | 'power' | 'rpm' | 'pressure' };
const blue = 0x487acc, hot = 0xd65b38, steam = 0xd49a2e;
const primary = (points: V[], warming = true): Route => ({points, kind: 'primary', color: warming ? blue : hot, endColor: warming ? hot : blue});

/** Schematic routes, not CFD streamlines. They follow the actual fluid boundary. */
export function interiorSpec(part: Part): { routes: Route[]; notes: Annotation[] } {
  const routes: Route[] = [], notes: Annotation[] = [];
  const add = (points: V[], kind: Transport, color: number, endColor?: number) => routes.push({points, kind, color, endColor});
  const note = (at: V, text: Pair, value?: Annotation['value']) => notes.push({at, text, value});
  const k = part.kind;
  if (part.equipment === 'pressurizer') {
    note([0.7, 0.9, 0.9], ['Pressure imposed · local flow not solved', 'Pression imposée · débit local non calculé'], 'pressure');
  } else if (part.id === 'reactor') {
    for (const z of [-0.65, 0, 0.65]) {
      routes.push(primary([[2.4, -1, z], [1.35, -1, z], [1.2, -1.8, z], [0.55, -1.9, z], [0.55, -0.5, z], [0.55, 1.2, z], [-1.2, 1.3, z], [-2.4, 0.8, z]]));
      routes.push(primary([[1.3, 0.8, z], [1.3, -1.6, z], [-0.5, -1.85, z], [-0.5, 1.15, z], [-1.3, 1.3, z]]));
    }
    note([1.8, -1.25, 0.7], ['Primary water · liquid', 'Eau primaire · liquide'], 'primary');
    note([-1.25, 0.1, 1], ['Heat from fuel → water', 'Chaleur du combustible → eau']);
  } else if (part.id === 'steam' || k === 'bundle' && part.equipment === 'steam') {
    for (const z of [-0.45, 0, 0.45]) for (const x of [-0.65, 0, 0.65])
      routes.push(primary([[x - 0.13, -1.9, z], [x - 0.13, 0.9, z], [x, 1.35, z], [x + 0.13, 0.9, z], [x + 0.13, -1.9, z]], false));
    for (const z of [-0.5, 0.5]) add([[1.65, -1.2, z], [1.1, -0.9, z], [0.9, 0.6, z], [0.6, 1.65, z], [0, 2.6, z]], 'steam', blue, steam);
    for (const y of [-0.8, 0, 0.8]) add([[-0.13, y, 0], [0.02, y, 0.08], [0.35, y, 0.35]], 'exchange', hot);
    note([-1.1, -1.9, 0.6], ['Primary · inside tubes', 'Primaire · dans les tubes'], 'primary');
    note([0.8, 1.55, 0.8], ['Secondary · around tubes', 'Secondaire · autour des tubes'], 'secondary');
  } else if (k === 'core' && !part.id.endsWith('/ceramic') || k === 'assembly') {
    const spread = k === 'core' ? 0.62 : 0.24;
    for (const x of [-1.5, -0.5, 0.5, 1.5]) for (const z of [-1.5, -0.5, 0.5, 1.5])
      routes.push(primary([[x * spread, -2.1, z * spread], [x * spread, 0, z * spread], [x * spread, 2.1, z * spread]]));
    note([0.85, 1.5, 0.85], ['Water rises between rods', 'L’eau monte entre les crayons'], 'primary');
  } else if (part.id === 'reactor/core/assembly/rod') {
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, x = Math.sin(a) * 0.57, z = Math.cos(a) * 0.57;
      routes.push(primary([[x, -2.65, z], [x, 0, z], [x, 2.65, z]]));
    }
    for (const y of [-1.5, 0, 1]) add([[0, y, 0], [0.3, y, 0.25], [0.65, y, 0.5]], 'heat', hot);
    note([0.6, -1.6, 0.8], ['Water outside cladding', 'Eau à l’extérieur de la gaine'], 'primary');
    note([0.3, 0.8, 0.3], ['Pellet → gap → cladding', 'Pastille → jeu → gaine']);
  } else if (['pellet', 'gap', 'cladding', 'wall'].includes(k) && part.equipment === 'reactor' || part.id.endsWith('/grain') || part.id.endsWith('/ceramic')) {
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      add([[0, 0, 0], [Math.sin(a) * 0.7, 0, Math.cos(a) * 0.7], [Math.sin(a) * 1.55, 0, Math.cos(a) * 1.55]], 'heat', hot);
    }
    note([1.1, 0.8, 0.8], ['Heat transfer · schematic', 'Transfert de chaleur · schéma']);
  } else if (k === 'pump' || k === 'impeller') {
    const kind: Transport = part.equipment === 'primary' ? 'primary' : 'feed';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      add([[0, -1.8, 0], [0, -0.3, 0], [Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6], [1.1, 0.1, 0.6], [2.2, 0, 0]], kind, blue);
    }
    note([1.4, 0.7, 0.5], ['Wheel → water momentum', 'Roue → mouvement de l’eau']);
  } else if (k === 'turbine' || k === 'stage' || k === 'blade' && part.equipment === 'turbine') {
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const points: V[] = [];
      for (let j = 0; j <= 24; j++) {
        const x = -2.3 + j / 24 * 4.6, r = 0.65 + j / 24 * 0.4, angle = a + Math.sin(j / 24 * Math.PI * 3) * 0.3;
        points.push([x, Math.sin(angle) * r, Math.cos(angle) * r]);
      }
      add(points, 'steam', steam, blue);
    }
    note([-1.5, 1.4, 0.7], ['Steam expands → shaft turns', 'La vapeur se détend → l’arbre tourne'], 'rpm');
  } else if (k === 'condenser' || k === 'cooling' || k === 'bundle' && ['condenser', 'cooling'].includes(part.equipment)) {
    for (const y of [-0.8, 0, 0.8]) for (const z of [-0.8, 0, 0.8]) add([[-2.2, y, z], [0, y, z], [2.2, y, z]], 'cooling', blue, 0x997cba);
    for (const x of [-1.2, 0, 1.2]) {
      if (part.equipment === 'cooling') add([[x, 0, 0], [x, 1, 0], [x, 1.7, 0]], 'rejected', hot);
      else add([[x, 1.65, 0.4], [x, 0.65, 0.6], [x, -0.5, 0.6], [x, -1.2, 0]], 'steam', steam, blue);
    }
    note([1.6, 0.8, 1], ['Cooling water · inside tubes', 'Refroidissement · dans les tubes']);
    note([-1, -1.15, 0.8], [k === 'cooling' ? 'Heat → surroundings' : 'Steam → liquid water', k === 'cooling' ? 'Chaleur → environnement' : 'Vapeur → eau liquide'], 'condenser');
  } else if (part.id === 'steam/secondary' || part.id === 'steam/bundle/tube/outside') {
    for (const x of [-0.7, 0, 0.7]) add([[x, -1.8, 0], [x, 0, 0], [x, 1.8, 0]], 'steam', blue, steam);
    note([0.7, 1.3, 0.5], ['Secondary water → steam', 'Eau secondaire → vapeur'], 'secondary');
  } else if (part.id.endsWith('/outside') && part.equipment === 'condenser') {
    for (const x of [-0.7, 0, 0.7]) add([[x, 1.8, 0], [x, 0, 0], [x, -1.8, 0]], 'steam', steam, blue);
    note([0.7, 1.3, 0.5], ['Steam condenses outside tubes', 'La vapeur condense hors des tubes'], 'condenser');
  } else if (part.id.endsWith('/outside') && part.equipment === 'cooling') {
    add([[0, -1.3, 0], [0, 0, 0], [0, 1.3, 0]], 'rejected', hot);
    note([0.7, 1.3, 0.5], ['Heat rejected · air flow not solved', 'Chaleur évacuée · air non calculé']);
  } else if (k === 'tube' || k === 'fluid' || k === 'waterbox') {
    const kind: Transport = part.id === 'condenser/hotwell/outlet' ? 'feed' : part.equipment === 'steam' || part.equipment === 'reactor' || part.equipment === 'primary' ? 'primary' : part.equipment === 'condenser' || part.equipment === 'cooling' ? 'cooling' : 'feed';
    for (const x of [-0.35, 0, 0.35]) add([[x, -2, 0], [x, 0, 0], [x, 2, 0]], kind, blue, kind === 'primary' ? hot : blue);
    if (k === 'tube' && part.equipment === 'steam') for (const y of [-0.8, 0, 0.8]) add([[0.5, y, 0], [0.9, y, 0], [1.3, y, 0]], 'exchange', hot);
    note([0.9, 1, 0.6], ['Flow inside the boundary', 'Écoulement dans l’enveloppe']);
  } else if (part.id === 'generator' || k === 'motor' || k === 'stator' || k === 'rotor') {
    if (part.equipment === 'generator') {
      for (let i = 0; i < 4; i++) {
        const points: V[] = [];
        for (let j = 0; j <= 40; j++) {
          const a = j / 40 * Math.PI * 2;
          points.push([Math.cos(a) * 1.6, Math.sin(a) * 1.1, (i - 1.5) * 0.45]);
        }
        add(points, 'electric', 0xa67739);
      }
      note([1.5, 1.1, 0.7], ['Shaft → electrical output', 'Arbre → production électrique'], 'power');
    }
  } else if (part.id === 'pressurizer') {
    note([0.6, 1.2, 0.9], ['Steam space', 'Volume de vapeur']);
    note([0.7, -0.9, 0.9], ['Pressure imposed by model', 'Pression imposée par le modèle'], 'pressure');
  }
  return {routes, notes};
}

export function transportRate(kind: Transport, s: State, c: Controls) {
  const r = rates(s, c);
  return kind === 'primary' ? s.primaryFlow : kind === 'cooling' ? s.coolingFlow : kind === 'feed' ? s.feedFlow : kind === 'steam' ? r.steamMass / 350 : kind === 'heat' ? r.heat / 1200 : kind === 'exchange' ? r.exchange / 1200 : kind === 'electric' ? r.electric / 250 : kind === 'rejected' ? r.rejected / 1000 : rpm(s) / 1800;
}

export class Interior {
  object = new T.Group();
  notes: Annotation[];
  streams: { route: Route; curve: T.CatmullRomCurve3; mesh: T.InstancedMesh; phase: number; arrows: T.Group }[] = [];
  constructor(part: Part) {
    const spec = interiorSpec(part);
    this.notes = spec.notes;
    this.object.name = 'internal-transport';
    for (const route of spec.routes) {
      const curve = new T.CatmullRomCurve3(route.points.map(p => new T.Vector3(...p)), false, 'centripetal');
      const line = new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(72)), new T.LineBasicMaterial({color: route.color, transparent: true, opacity: 0.22, depthWrite: false}));
      this.object.add(line);
      const mesh = new T.InstancedMesh(new T.SphereGeometry(0.037, 6, 4), new T.MeshBasicMaterial({color: 0xffffff}), 18);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.raycast = () => {};
      this.object.add(mesh);
      const arrows = new T.Group();
      for (const t of [0.26, 0.72]) {
        const a = new T.Mesh(new T.ConeGeometry(0.062, 0.19, 8), new T.MeshBasicMaterial({color: route.color}));
        a.position.copy(curve.getPoint(t));
        a.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), curve.getTangent(t));
        a.raycast = () => {};
        arrows.add(a);
      }
      this.object.add(arrows);
      this.streams.push({route, curve, mesh, phase: 0, arrows});
    }
    this.object.traverse(o => {
      if (o instanceof T.Mesh || o instanceof T.Line) (o.material as T.Material).userData.transport = true;
    });
  }
  update(s: State, c: Controls, dt: number, reduced: boolean) {
    const dummy = new T.Object3D(), start = new T.Color(), end = new T.Color();
    for (const stream of this.streams) {
      const rate = transportRate(stream.route.kind, s, c);
      stream.mesh.visible = Math.abs(rate) > 0.001;
      // Static arrows remain available in pause and reduced motion. No false moving fluid at zero flow.
      stream.arrows.visible = Math.abs(rate) > 0.001;
      stream.arrows.children.forEach((arrow, i) => arrow.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), stream.curve.getTangent(i === 0 ? 0.26 : 0.72).multiplyScalar(rate < 0 ? -1 : 1)));
      if (!reduced) stream.phase = (stream.phase + dt * rate * 0.12 + 1) % 1;
      start.setHex(stream.route.color); end.setHex(stream.route.endColor ?? stream.route.color);
      const thermal = Math.max(0, Math.min(1, (s.primaryT - 20) / 280));
      if (stream.route.kind === 'primary') {
        start.lerp(new T.Color(blue), 1 - thermal);
        end.lerp(new T.Color(blue), 1 - thermal);
      }
      for (let i = 0; i < stream.mesh.count; i++) {
        const t = (i / stream.mesh.count + stream.phase) % 1;
        dummy.position.copy(stream.curve.getPoint(t));
        dummy.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), stream.curve.getTangent(t));
        dummy.scale.set(0.7, 2.6, 0.7); dummy.updateMatrix();
        stream.mesh.setMatrixAt(i, dummy.matrix);
        stream.mesh.setColorAt(i, start.clone().lerp(end, t));
      }
      stream.mesh.instanceMatrix.needsUpdate = true;
      if (stream.mesh.instanceColor) stream.mesh.instanceColor.needsUpdate = true;
    }
  }
}

export function annotationValue(note: Annotation, s: State, c: Controls) {
  const value = note.value;
  if (!value) return '';
  if (value === 'pressure') return '155 bar';
  if (value === 'rpm') return `${Math.round(rpm(s))} rpm`;
  if (value === 'power') return `${Math.round(rates(s, c).electric)} MW`;
  return `${Math.round(value === 'primary' ? s.primaryT : value === 'secondary' ? secondaryT(s) : s.condenserT)} °C`;
}
