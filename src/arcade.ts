export const controls = ["water", "heat", "steam", "grid"] as const;
export type Control = (typeof controls)[number];
export type Inputs = Record<Control, number>;
export type Event =
  "dry" | "strike" | "cold" | "blackout" | "turbo" | "chaos" | "win" | "hello";
export type Game = {
  water: number;
  heat: number;
  steam: number;
  spin: number;
  power: number;
  won: boolean;
  cooldown: number;
  time: number;
};
export const freshInputs = (): Inputs => ({
  water: 0,
  heat: 0,
  steam: 0,
  grid: 0,
});
export const freshGame = (): Game => ({
  water: 0,
  heat: 0,
  steam: 0,
  spin: 0,
  power: 0,
  won: false,
  cooldown: 0,
  time: 0,
});
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function setInput(c: Inputs, key: Control, value: number) {
  if (Number.isFinite(value))
    c[key] = key === "grid" ? Number(value >= 0.5) : clamp(value);
}
const approach = (a: number, b: number, dt: number, speed: number) =>
  b + (a - b) * Math.exp(-dt * speed);
// A small, deterministic game model. Visuals and the score read this same state.
export function step(s: Game, c: Inputs, dt: number): Event | undefined {
  if (!Number.isFinite(dt) || dt < 0 || dt > 1)
    throw new RangeError("Invalid frame interval");
  if (!dt) return;
  s.time += dt;
  s.cooldown = Math.max(0, s.cooldown - dt);
  s.water = approach(s.water, c.water, dt, 2.5);
  const heating = s.water > 0.18 && !s.cooldown ? c.heat : 0;
  s.heat = approach(s.heat, heating, dt, heating ? 0.65 : 0.9);
  s.steam = approach(s.steam, s.heat * s.water * c.steam, dt, 2);
  s.spin = approach(s.spin, s.steam, dt, 1.4);
  s.power = c.grid ? Math.round(s.spin * 180) : 0;
  if (!s.won && s.power >= 100) {
    s.won = true;
    return "win";
  }
}
export function consequence(
  key: Control,
  before: number,
  s: Game,
  c: Inputs,
): Event | undefined {
  if (key === "water" && before > 0.2 && c.water < 0.15 && s.heat > 0.25) {
    s.cooldown = 3;
    return "strike";
  }
  if (key === "heat" && c.heat > 0.1 && c.water < 0.2) return "dry";
  if (key === "steam" && c.steam > 0.1 && s.heat < 0.2) return "cold";
  if (key === "grid" && before > 0.5 && !c.grid && s.spin > 0.2)
    return "blackout";
  if (key === "heat" && c.heat > 0.9 && c.water > 0.5) return "turbo";
}
export class Director {
  history: number[] = [];
  lastChaos = -10;
  command(key: Control, before: number, s: Game, c: Inputs): Event | undefined {
    const result = consequence(key, before, s, c);
    this.history = this.history.filter((t) => s.time - t < 3);
    this.history.push(s.time);
    if (result) return result;
    if (this.history.length >= 5 && s.time - this.lastChaos > 8) {
      this.lastChaos = s.time;
      this.history = [];
      return "chaos";
    }
  }
}
export const lines: Record<
  Event,
  {
    president: "giscard" | "degaulle";
    stamp: readonly [string, string];
    text: readonly [string, string];
  }
> = {
  hello: {
    president: "giscard",
    stamp: ["", ""],
    text: ["100 MW. I have guests.", "100 MW. J'ai des invités."],
  },
  dry: {
    president: "degaulle",
    stamp: ["NON.", "NON."],
    text: [
      "Even the Shadoks remembered the water.",
      "Même les Shadoks mettaient de l'eau.",
    ],
  },
  strike: {
    president: "degaulle",
    stamp: ["MAY 68", "MAI 68"],
    text: [
      "The pumps are on strike. Splendid.",
      "Les pompes sont en grève. Magnifique.",
    ],
  },
  cold: {
    president: "giscard",
    stamp: ["PSCHITT.", "PSCHITT."],
    text: [
      "No oil. No steam either.",
      "Pas de pétrole. Pas de vapeur non plus.",
    ],
  },
  blackout: {
    president: "giscard",
    stamp: ["AU REVOIR.", "AU REVOIR."],
    text: ["And there goes dinner.", "Et voilà le dîner."],
  },
  turbo: {
    president: "giscard",
    stamp: ["PLAN MESSMER", "PLAN MESSMER"],
    text: [
      "I said a power station. Not a croque-monsieur.",
      "J'ai dit une centrale. Pas un croque-monsieur.",
    ],
  },
  chaos: {
    president: "degaulle",
    stamp: ["49.3", "49.3"],
    text: [
      "Adopted. Nobody touch anything.",
      "Adopté. Plus personne ne touche à rien.",
    ],
  },
  win: {
    president: "giscard",
    stamp: ["LE POUVOIR.", "LE POUVOIR."],
    text: ["The monopoly on the current.", "Le monopole du courant."],
  },
};

export function frameDelta(now: number, previous: number) {
  return Math.max(0, Math.min(0.05, (now - previous) / 1000));
}
export function dragSetting(
  start: number,
  key: Control,
  dx: number,
  dy: number,
) {
  return clamp(
    start + (key === "water" || key === "steam" ? dx + dy : dy) / 110,
  );
}
