/** Educational energy-flow model. MW = MJ/s; temperatures in °C.
 * Effective heat capacities deliberately reduced. See MODEL.md.
 * No neutron kinetics, accident analysis or operational procedures.
 */
export const K = {
  ambient: 20,
  saturation: 275,
  primaryCapacity: 25,
  secondaryCapacity: 15,
  condenserCapacity: 18,
  maxPower: 1200,
  exchangerUA: 40,
  coolingUA: 40,
  latentHeat: 1.6,
  inertia: 120000,
} as const;

export type Controls = {
  primary: number;
  cooling: number;
  feed: number;
  power: number;
  valve: number;
  generator: boolean;
};
export type State = {
  time: number;
  primaryT: number;
  secondaryE: number;
  condenserT: number;
  fission: number;
  decayE: number;
  rotorE: number;
  primaryFlow: number;
  coolingFlow: number;
  feedFlow: number;
  supplied: number;
  exported: number;
  rejected: number;
  losses: number;
  trip: string;
  outsideModel: boolean;
};
export type Rates = ReturnType<typeof rates>;
export const initialControls = (): Controls => ({
  primary: 0,
  cooling: 0,
  feed: 0,
  power: 0,
  valve: 0,
  generator: false,
});
export const initialState = (): State => ({
  time: 0,
  primaryT: 20,
  secondaryE: 0,
  condenserT: 20,
  fission: 0,
  decayE: 0,
  rotorE: 0,
  primaryFlow: 0,
  coolingFlow: 0,
  feedFlow: 0,
  supplied: 0,
  exported: 0,
  rejected: 0,
  losses: 0,
  trip: '',
  outsideModel: false,
});
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const sensibleLimit = K.secondaryCapacity * (K.saturation - K.ambient);
export const secondaryT = (s: State) =>
  K.ambient + Math.min(s.secondaryE, sensibleLimit) / K.secondaryCapacity;
export const steamEnergy = (s: State) => Math.max(0, s.secondaryE - sensibleLimit);
export const rpm = (s: State) =>
  (Math.sqrt((2 * Math.max(0, s.rotorE) * 1e6) / K.inertia) * 60) / (2 * Math.PI);
export const storedEnergy = (s: State) =>
  (s.primaryT - 20) * K.primaryCapacity +
  s.secondaryE +
  (s.condenserT - 20) * K.condenserCapacity +
  s.rotorE +
  s.decayE;
export const balanceError = (s: State) =>
  s.supplied - s.exported - s.rejected - s.losses - storedEnergy(s);

/** A reproducible operating example integrated from cold, with the same energy ledger. */
export function operatingExample() {
  const controls: Controls = { primary: 1, cooling: 1, feed: 1, power: 0.65, valve: 0.7, generator: true };
  let state = initialState();
  for (let i = 0; i < 3; i++) state = advance(state, controls, 120);
  return {state, controls};
}

export function heatBlock(s: State): string {
  if (s.trip) return s.trip;
  if (s.primaryFlow < 0.25) return "L'eau primaire doit circuler : démarrez la pompe primaire.";
  if (s.coolingFlow < 0.25) return 'La chaleur doit pouvoir sortir : démarrez le refroidissement.';
  if (s.feedFlow < 0.25) return 'Fermez le cycle secondaire : démarrez la pompe alimentaire.';
  return '';
}
export function steamBlock(s: State): string {
  if (s.condenserT > 75)
    return 'Le condenseur est trop chaud : rétablissez le refroidissement et attendez moins de 75 °C.';
  if (s.feedFlow < 0.25) return "Le retour d'eau est arrêté : démarrez la pompe alimentaire.";
  if (secondaryT(s) < 274.99)
    return "Pas encore de vapeur : chauffez l'eau secondaire jusqu'à 275 °C dans ce modèle.";
  if (steamEnergy(s) < 1)
    return "La réserve de vapeur est épuisée : augmentez la chaleur ou réduisez l'admission.";
  return '';
}
export function rates(s: State, c: Controls) {
  const ts = secondaryT(s);
  // Signed exchange allows secondary heat to return to a cooler primary loop.
  const exchange = K.exchangerUA * s.primaryFlow * (s.primaryT - ts);
  const heat = 0.94 * s.fission + s.decayE / 60;
  const admitted =
    s.feedFlow > 0.25 && s.condenserT <= 75
      ? clamp(c.valve) * 1600 * clamp(steamEnergy(s) / 250) * s.feedFlow
      : 0;
  const eta = clamp(0.65 * (1 - (s.condenserT + 273.15) / (K.saturation + 273.15)), 0, 0.4);
  const mechanical = admitted * eta;
  const load = c.generator ? s.rotorE / 5 : 0;
  const electric = load * 0.96;
  const friction = s.rotorE / 100;
  const rejected = K.coolingUA * s.coolingFlow * (s.condenserT - 20);
  const primaryLoss = 0.015 * (s.primaryT - 20);
  const secondaryLoss = 0.006 * (ts - 20);
  return {
    heat,
    exchange,
    admitted,
    mechanical,
    electric,
    load,
    friction,
    rejected,
    primaryLoss,
    secondaryLoss,
    // Each kilogram must be reheated from the condenser outlet and vaporized.
    steamMass: admitted / (K.latentHeat + 0.0048 * (K.saturation - s.condenserT)),
    coolingMass: 20000 * s.coolingFlow,
    primaryMass: 14000 * s.primaryFlow,
    eta,
    decay: s.decayE / 60,
  };
}

/** Fixed substeps, bounded independently of frame rate and selected playback rate. */
export function advance(s: State, c: Controls, dt: number): State {
  if (!Number.isFinite(dt) || dt < 0 || dt > 120)
    throw new RangeError('dt must be finite and between 0 and 120 seconds');
  if (dt === 0) return s;
  const next = { ...s };
  const n = Math.ceil(dt / 0.02),
    h = dt / n;
  for (let i = 0; i < n; i++) {
    if (!next.trip && (next.primaryT >= 330 || (next.fission > 40 && next.primaryFlow < 0.2))) {
      next.trip =
        next.primaryT >= 330
          ? 'Arrêt pédagogique : le primaire a atteint 330 °C. Réduisez la puissance, rétablissez les pompes puis réarmez sous 310 °C.'
          : 'Arrêt pédagogique : le débit primaire est insuffisant. Rétablissez la pompe, ramenez la puissance à zéro puis réarmez.';
    }
    const target = heatBlock(next) ? 0 : clamp(c.power) * K.maxPower;
    // No instantaneous temperature reset, even following a trip.
    next.fission += (target - next.fission) * (1 - Math.exp(-h / (next.trip ? 0.5 : 3)));
    next.primaryFlow += (clamp(c.primary) - next.primaryFlow) * (1 - Math.exp(-h / 1.2));
    next.coolingFlow += (clamp(c.cooling) - next.coolingFlow) * (1 - Math.exp(-h / 1.2));
    next.feedFlow += (clamp(c.feed) - next.feedFlow) * (1 - Math.exp(-h / 1.2));
    const r = rates(next, c);
    const primaryNet = r.heat - r.exchange - r.primaryLoss;
    // End the trajectory at the liquid-only model boundary instead of inventing boiling.
    // Shorten this entire energy step, including the ledger, without clipping temperature.
    const remaining = Math.max(0, (340 - next.primaryT) * K.primaryCapacity);
    const stepTime = primaryNet > 0 ? Math.min(h, remaining / primaryNet) : h;
    next.outsideModel = stepTime < h;
    // At h<=0.02 the steam extraction and heat transfer cannot empty a reservoir.
    next.primaryT += (primaryNet * stepTime) / K.primaryCapacity;
    next.secondaryE += (r.exchange - r.admitted - r.secondaryLoss) * stepTime;
    next.condenserT += ((r.admitted - r.mechanical - r.rejected) * stepTime) / K.condenserCapacity;
    next.rotorE += (r.mechanical - r.load - r.friction) * stepTime;
    next.decayE += (0.06 * next.fission - r.decay) * stepTime;
    next.supplied += next.fission * stepTime;
    next.exported += r.electric * stepTime;
    next.rejected += r.rejected * stepTime;
    next.losses += (r.primaryLoss + r.secondaryLoss + r.friction + r.load - r.electric) * stepTime;
    next.time += stepTime;
    if (next.outsideModel) break;
  }
  return next;
}

export function rearm(s: State, c: Controls): boolean {
  if (
    c.power !== 0 ||
    s.primaryT >= 310 ||
    s.primaryFlow < 0.25 ||
    s.coolingFlow < 0.25 ||
    s.feedFlow < 0.25
  )
    return false;
  s.trip = '';
  return true;
}
