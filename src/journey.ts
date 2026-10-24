import * as T from "three";
import { rates, type State, type Controls } from "./physics.ts";
import type { Pair } from "./game.ts";
type V = [number, number, number];
export const primaryPoints: V[] = [
  [-0.6, 0.75, -2.3],
  [-0.1, 0.6, -1],
  [-2.2, 0.7, 1.25],
  [-3.3, 0.7, 1.4],
  [-4, 0.85, 0],
  [-4.25, 0.55, 0],
  [-5.1, 0.6, 0],
  [-5.1, 2, 0],
  [-5.1, 3.45, 0],
  [-6.2, 2.85, 0],
  [-6.8, 2.85, -1.2],
  [-4, 2.85, -2.3],
  [-1.6, 0.75, -2.3],
  [-1.6, 3.4, -2.3],
  [-1.1, 3.65, -2.3],
  [-0.6, 3.4, -2.3],
  [-0.6, 0.75, -2.3],
];
export const secondaryPoints: V[] = [
  [-0.45, 1, -1.65],
  [-0.5, 2.5, -1.65],
  [-1.1, 4.2, -2.3],
  [-1.1, 4.95, -2.3],
  [0, 5.15, -2.3],
  [0.8, 4.5, -2.3],
  [1.5, 2.9, -1.2],
  [1.5, 1.7, -0.75],
  [3.1, 1.7, -0.75],
  [4.5, 1.4, -1.2],
  [5.2, 1, -0.1],
  [4.4, 1.5, 2],
  [3.2, 1, 2.2],
  [3.2, 0.4, 2.2],
  [1.7, 0.55, 3],
  [0, 0.55, 3],
  [-0.6, 0.55, 2.4],
  [-2.2, 0.55, 0.3],
  [-2.2, 1.1, -2.3],
  [-0.45, 1, -1.65],
];
const curve = (p: V[]) =>
  new T.CatmullRomCurve3(
    p.map((v) => new T.Vector3(...v)),
    false,
    "centripetal",
  );
export const primaryCurve = curve(primaryPoints),
  secondaryCurve = curve(secondaryPoints);
// Three separate chapters. Heat crosses the tube wall; the two waters never mix.
export type JourneyChapter = "primary" | "exchange" | "secondary";
export function journeyFrame(progress: number) {
  const p = T.MathUtils.clamp(progress, 0, 1);
  let chapter: JourneyChapter, u: number, point: T.Vector3, tangent: T.Vector3;
  if (p < 0.44) {
    chapter = "primary";
    u = p / 0.44;
    point = primaryCurve.getPointAt(u);
    tangent = primaryCurve.getTangentAt(u);
  } else if (p < 0.52) {
    chapter = "exchange";
    u = (p - 0.44) / 0.08;
    point = primaryCurve.getPointAt(1).lerp(secondaryCurve.getPointAt(0), u);
    tangent = primaryCurve
      .getTangentAt(1)
      .lerp(secondaryCurve.getTangentAt(0), u)
      .normalize();
  } else {
    chapter = "secondary";
    u = (p - 0.52) / 0.48;
    point = secondaryCurve.getPointAt(u);
    tangent = secondaryCurve.getTangentAt(u);
  }
  const name: Pair =
    chapter === "exchange"
      ? [
          "Heat crosses the tubes. The waters stay separate.",
          "La chaleur traverse les tubes. Les eaux restent séparées.",
        ]
      : chapter === "primary"
        ? point.x < -3.7 && point.z > -1.2
          ? [
              "Inside the reactor · water heats up",
              "Dans le réacteur · l'eau chauffe",
            ]
          : point.z < -1.5 && point.x > -2.3
            ? [
                "Inside the tubes · heat leaves the water",
                "Dans les tubes · l'eau cède sa chaleur",
              ]
            : [
                "Primary circuit · liquid water",
                "Circuit primaire · eau liquide",
              ]
        : u < 0.3
          ? [
              "Steam generator · water becomes steam",
              "Générateur de vapeur · l'eau devient vapeur",
            ]
          : u < 0.55
            ? [
                "Turbine · steam turns the blades",
                "Turbine · la vapeur pousse les pales",
              ]
            : u < 0.74
              ? [
                  "Condenser · steam becomes water",
                  "Condenseur · la vapeur redevient eau",
                ]
              : [
                  "Feed pump · water returns to the boiler",
                  "Pompe alimentaire · l'eau retourne chauffer",
                ];
  return { chapter, u, point, tangent, name };
}
export function journeySpeed(progress: number, s: State, c: Controls) {
  const { chapter, u } = journeyFrame(progress);
  if (chapter === "primary") return Math.min(1, s.primaryFlow);
  if (chapter === "exchange")
    return Math.max(0, Math.min(1, rates(s, c).exchange / 40));
  return u < 0.74
    ? Math.min(1, rates(s, c).admitted / 50)
    : Math.min(1, s.feedFlow);
}
