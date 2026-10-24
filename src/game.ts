import { availability, nextAction, type Action } from "./startup.ts";
import { rates, secondaryT, type State, type Controls } from "./physics.ts";
export const TARGET_MW = 100;
export type Pair = readonly [string, string];
export const actionNames: Record<Action, Pair> = {
  cooling: ["Cool it", "Refroidir"],
  primary: ["Move the water", "Faire circuler"],
  heat: ["Heat the core", "Chauffer"],
  steam: ["Release the steam", "Ouvrir la vapeur"],
  load: ["Power the palace", "Brancher le palais"],
};
const instructions: Record<Action, Pair> = {
  cooling: [
    "The Élysée has gone dark. Start the cooling pumps. We have a dinner to save.",
    "L’Élysée est dans le noir. Lance les pompes de refroidissement. On a un dîner à sauver.",
  ],
  primary: [
    "Water does not circulate by presidential decree. Switch on the primary pump.",
    "L’eau ne circule pas par décret. Mets la pompe primaire en marche.",
  ],
  heat: [
    "The water is moving. Heat the core. Yes, this is a rather large kettle.",
    "L’eau circule. Chauffe le cœur. Oui, c’est une assez grosse bouilloire.",
  ],
  steam: [
    "We have steam. Give it a turbine to turn.",
    "Nous avons de la vapeur. Donnons-lui une turbine à faire tourner.",
  ],
  load: [
    "The turbine is turning. Connect the generator. My fondue is getting cold.",
    "La turbine tourne. Branche l’alternateur. Ma fondue refroidit.",
  ],
};
const waiting: Record<Action, Pair> = {
  cooling: ["The pumps are starting.", "Les pompes démarrent."],
  primary: [
    "Give the cooling pumps a moment. Watch the blue water start moving.",
    "Un instant : les pompes se lancent. Regarde l’eau bleue circuler.",
  ],
  heat: [
    "The primary pump is filling the circuit. Watch the water enter the core.",
    "La pompe primaire lance le débit. Regarde l’eau entrer dans le cœur.",
  ],
  steam: [
    "The core is heating the water. Steam is on its way.",
    "Le cœur chauffe l’eau. La vapeur arrive.",
  ],
  load: [
    "The steam is pushing the blades. Let the shaft pick up speed.",
    "La vapeur pousse les pales. Laisse l’arbre prendre de la vitesse.",
  ],
};
export const blockers: Record<Action, Pair> = {
  cooling: [
    "Start the cooling pumps first. Even the Republic needs to cool down.",
    "D’abord les pompes de refroidissement. Même la République doit se refroidir.",
  ],
  primary: [
    "Water first. Heat later. Start the primary pump.",
    "L’eau d’abord. La chauffe ensuite. Lance la pompe primaire.",
  ],
  heat: [
    "No steam yet. Heat the core and watch the water boil in the steam generator.",
    "Pas encore de vapeur. Chauffe le cœur : l’eau bout dans le générateur de vapeur.",
  ],
  steam: [
    "The generator needs a spinning shaft. Open the steam valve first.",
    "L’alternateur attend que l’arbre tourne. Ouvre d’abord la vapeur.",
  ],
  load: [
    "Connect the generator to deliver the electricity.",
    "Branche l’alternateur pour livrer l’électricité.",
  ],
};
export function mission(s: State, c: Controls, won: boolean, blocked?: Action) {
  const next = nextAction(s, c),
    ready = next ? availability(next, s, c).ready : false;
  const problem =
    blocked && !availability(blocked, s, c).ready
      ? availability(blocked, s, c).requires
      : undefined;
  const complete = won && rates(s, c).electric >= TARGET_MW;
  const failed = !!s.trip || s.outsideModel;
  let line: Pair = failed
    ? [
        "The machine stopped. Restart the challenge. The fondue can wait.",
        "La machine s’est arrêtée. Relance le défi. La fondue attendra.",
      ]
    : problem
      ? blockers[problem]
      : complete
        ? [
            "Je vous ai compris ! The lights are on. Now, take a trip through your machine.",
            "Je vous ai compris ! Les lumières sont revenues. Maintenant, visite ta machine.",
          ]
        : next
          ? ready
            ? instructions[next]
            : waiting[next]
          : [
              "Power is climbing. At 100 MW, the palace lights up.",
              "La puissance monte. À 100 MW, le palais s’allume.",
            ];
  if (next === "steam" && !ready && !problem && !failed)
    line = [
      `Still heating. ${Math.min(99, Math.round((Math.max(0, secondaryT(s) - 20) / 255) * 100))}% of the way to steam.`,
      `Ça chauffe. ${Math.min(99, Math.round((Math.max(0, secondaryT(s) - 20) / 255) * 100))} % du chemin vers la vapeur.`,
    ];
  return {
    next,
    ready,
    failed,
    complete,
    line,
    character:
      complete || next === "primary" || next === "steam"
        ? "degaulle"
        : "giscard",
    power: rates(s, c).electric,
  };
}
export function achieved(s: State, c: Controls) {
  return (
    c.generator &&
    !s.trip &&
    !s.outsideModel &&
    rates(s, c).electric >= TARGET_MW
  );
}
