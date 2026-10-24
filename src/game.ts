import { nextAction, controlValue, type Action } from "./startup.ts";
import { rates, secondaryT, type State, type Controls } from "./physics.ts";
export const TARGET_MW = 100;
export type Pair = readonly [string, string];
export type Character = "giscard" | "degaulle";
export type Reaction = {
  character: Character;
  line: Pair;
  reference?: string;
  mood?: "alarm" | "pleased";
};
export const actionNames: Record<Action, Pair> = {
  cooling: ["Cooling pumps", "Refroidir"],
  primary: ["Primary pump", "Pompe primaire"],
  heat: ["Core heat", "Chauffe du coeur"],
  steam: ["Steam valve", "Vanne de vapeur"],
  load: ["Palace power", "Courant au palais"],
};
const say = (
  character: Character,
  en: string,
  fr: string,
  reference?: string,
  mood?: Reaction["mood"],
): Reaction => ({ character, line: [en, fr], reference, mood });
export const reactions = {
  coldSteam: [
    say(
      "giscard",
      "No oil. No steam either. The valve is open; now heat some water.",
      "On n'a pas de pétrole. Pas de vapeur non plus. La vanne est ouverte ; chauffe de l'eau.",
      "ideas",
    ),
    say(
      "degaulle",
      "Vive la vapeur libre! There would need to be some first. Start the heat.",
      "Vive la vapeur libre ! Encore faudrait-il en avoir. Lance la chauffe.",
      "quebec",
    ),
  ],
  idleLoad: [
    say(
      "giscard",
      "You have connected the palace to silence. Even the ORTF had a test card. Send steam to the turbine.",
      "Tu as branché le palais sur du silence. Même l'ORTF avait une mire. Envoie la vapeur à la turbine.",
      "ortf",
    ),
    say(
      "degaulle",
      "Je vous ai compris. The generator has not. It needs a turning shaft.",
      "Je vous ai compris. L'alternateur, moins. Il lui faut un arbre qui tourne.",
      "alger",
    ),
  ],
  dryHeat: [
    say(
      "degaulle",
      "The Shadoks pumped. Here, nobody does. Turn on both pump controls; the heat is waiting.",
      "Les Shadoks pompaient. Ici, personne. Lance les deux commandes de pompes ; la chauffe attend.",
      "shadoks",
    ),
    say(
      "giscard",
      "You do not have a monopoly on the core. Especially with no water circulating. Start the pumps.",
      "Tu n'as pas le monopole du coeur. Surtout sans eau qui circule. Lance les pompes.",
      "heart",
    ),
  ],
  pumpOff: [
    say(
      "degaulle",
      "The cooling department is on strike. Very May '68. Put that pump back on.",
      "Le refroidissement est en grève. Très Mai 68. Remets cette pompe.",
      "may68",
      "alarm",
    ),
    say(
      "giscard",
      "La chasse au gaspi did not mean cutting off the cooling. Pump. Back. On.",
      "La chasse au gaspi, ce n'était pas couper le refroidissement. Remets. La. Pompe.",
      "gaspi",
      "alarm",
    ),
  ],
  pumpColdOff: [
    say(
      "degaulle",
      "Pump stopped. The water agrees: it is slowing down.",
      "Pompe arrêtée. L'eau est d'accord : elle ralentit.",
    ),
  ],
  pumpOn: [
    say(
      "degaulle",
      "And the Shadoks pumped. Finally, a policy with measurable results.",
      "Et les Shadoks pompaient. Enfin une politique avec un résultat mesurable.",
      "shadoks",
    ),
    say(
      "giscard",
      "The Shadoks approve. Keep that water moving.",
      "Les Shadoks approuvent. Laisse cette eau circuler.",
    ),
  ],
  heat: [
    say(
      "giscard",
      "The monopoly on the core? Mine. The lever? Yours. Watch the water warm up.",
      "Le monopole du coeur ? Moi. Le levier ? Toi. Regarde l'eau chauffer.",
      "heart",
      "pleased",
    ),
    say(
      "degaulle",
      "The Messmer plan, in one kettle. Open the steam when it is hot.",
      "Le plan Messmer, dans une bouilloire. Ouvre la vapeur quand c'est chaud.",
      "messmer",
    ),
  ],
  fullHeat: [
    say(
      "giscard",
      "Messmer ordered a fleet of power stations. You put the whole plan on one lever.",
      "Messmer a commandé un parc de centrales. Tu as mis tout le plan sur un seul levier.",
      "messmer",
    ),
  ],
  steam: [
    say(
      "degaulle",
      "Vive la vapeur libre! Straight into the turbine, please.",
      "Vive la vapeur libre ! Dans la turbine, si possible.",
      "quebec",
      "pleased",
    ),
    say(
      "giscard",
      "That turns rather better than a televised debate. Connect the palace.",
      "Ça tourne mieux qu'un débat télévisé. Branche le palais.",
      "heart",
    ),
  ],
  steamOff: [
    say(
      "degaulle",
      "You have closed the tap on the Republic. The turbine will coast, then slow down.",
      "Tu as fermé le robinet de la République. La turbine va continuer sur sa lancée, puis ralentir.",
    ),
  ],
  heatOff: [
    say(
      "giscard",
      "La chasse au gaspi! The core is still hot, though. Keep the pumps running.",
      "La chasse au gaspi ! Le coeur reste chaud. Laisse les pompes tourner.",
      "gaspi",
    ),
  ],
  load: [
    say(
      "giscard",
      "Connected. At 100 MW, I can stop dining by candlelight.",
      "Branché. À 100 MW, je peux arrêter de dîner aux chandelles.",
    ),
  ],
  blackout: [
    say(
      "giscard",
      "Au revoir. You unplugged the palace. The turbine is still spinning, mind you.",
      "Au revoir. Tu as débranché le palais. La turbine tourne toujours, elle.",
      "goodbye",
      "alarm",
    ),
  ],
  trip: [
    say(
      "degaulle",
      "The machine voted NO. Very 1969. Pumps on, heat off, then reset in Info. The round arrow restarts from cold.",
      "La machine a voté NON. Très 1969. Pompes en marche, chauffe coupée, puis réarmement dans Info. La flèche ronde repart à froid.",
      "referendum",
      "alarm",
    ),
  ],
  chaos: [
    say(
      "degaulle",
      "May '68 in the control room. You can change everything. Let the water catch up.",
      "Mai 68 dans la salle des commandes. Tu peux tout changer. Laisse l'eau suivre.",
      "may68",
    ),
  ],
  win: [
    say(
      "degaulle",
      "Je vous ai compris! The palace is lit. Now try turning something off. Giscard will love that.",
      "Je vous ai compris ! Le palais est allumé. Essaie de couper quelque chose. Giscard va adorer.",
      "alger",
      "pleased",
    ),
  ],
  call: [
    say(
      "giscard",
      "I lowered the voting age to 18. Apparently I forgot to set an age for touching this lever.",
      "J'ai abaissé la majorité à 18 ans. J'ai oublié de fixer un âge pour toucher à ce levier.",
      "age",
    ),
    say(
      "degaulle",
      "A referendum on every valve? I tried that sort of thing in '69. Keep pumping.",
      "Un référendum sur chaque vanne ? J'ai essayé ce genre de chose en 69. Continue à pomper.",
      "referendum",
    ),
    say(
      "giscard",
      "In France, no oil. But a baguette on the alternator. Progress.",
      "En France, pas de pétrole. Mais une baguette sur l'alternateur. Le progrès.",
      "ideas",
    ),
    say("giscard", "Au revoir.", "Au revoir.", "goodbye"),
  ],
} satisfies Record<string, Reaction[]>;
export type ReactionKey = keyof typeof reactions;
export class ReactionDeck {
  private counts = new Map<ReactionKey, number>();
  private commands: number[] = [];
  private lastChaos = -Infinity;
  take(key: ReactionKey): Reaction {
    const index = this.counts.get(key) ?? 0;
    this.counts.set(key, index + 1);
    return reactions[key][index % reactions[key].length];
  }
  command(action: Action, s: State, c: Controls, now: number): Reaction {
    this.commands = this.commands.filter((t) => now - t < 3500);
    this.commands.push(now);
    const key = commandReaction(action, s, c);
    // Never bury a failed cooling command under a gag about frantic clicking.
    if (
      key !== "pumpOff" &&
      this.commands.length >= 5 &&
      now - this.lastChaos > 12000
    ) {
      this.lastChaos = now;
      return this.take("chaos");
    }
    return this.take(key);
  }
}
export function commandReaction(
  action: Action,
  s: State,
  c: Controls,
): ReactionKey {
  const on = controlValue(action, c) > 0;
  if (action === "cooling" || action === "primary")
    return !on ? (s.fission > 40 ? "pumpOff" : "pumpColdOff") : "pumpOn";
  if (action === "heat")
    return !on
      ? "heatOff"
      : s.primaryFlow < 0.25 || s.coolingFlow < 0.25 || s.feedFlow < 0.25
        ? "dryHeat"
        : c.power > 0.9
          ? "fullHeat"
          : "heat";
  if (action === "steam")
    return !on ? "steamOff" : rates(s, c).admitted < 1 ? "coldSteam" : "steam";
  return !on ? "blackout" : rates(s, c).electric < 1 ? "idleLoad" : "load";
}
export function mission(s: State, c: Controls, won: boolean) {
  const next = nextAction(s, c);
  const complete = won && rates(s, c).electric >= TARGET_MW;
  const failed = !!s.trip || s.outsideModel;
  let guide: Reaction;
  if (failed) guide = reactions.trip[0];
  else if (complete) guide = reactions.win[0];
  else if (!c.primary || !c.cooling)
    guide = say(
      "giscard",
      "The Élysée is dark. Turn the red wheels or drag the handles. We need water moving, heat, then steam at the turbine.",
      "L'Élysée est dans le noir. Tourne les volants rouges ou tire les leviers. Il faut de l'eau qui circule, de la chaleur, puis de la vapeur dans la turbine.",
    );
  else if (!c.power)
    guide = say(
      "degaulle",
      "Water is circulating. Raise the heat lever on the reactor.",
      "L'eau circule. Monte le levier de chauffe sur le réacteur.",
    );
  else if (secondaryT(s) < 275)
    guide = say(
      "giscard",
      `The water is at ${Math.round(secondaryT(s))} °C. Steam starts at 275 °C here. You can already open its valve.`,
      `L'eau est à ${Math.round(secondaryT(s))} °C. Ici, la vapeur commence à 275 °C. Tu peux déjà ouvrir sa vanne.`,
    );
  else if (!c.valve)
    guide = say(
      "degaulle",
      "Steam is waiting. Turn the red wheel above the turbine.",
      "La vapeur attend. Tourne le volant rouge au-dessus de la turbine.",
    );
  else if (!c.generator)
    guide = say(
      "giscard",
      "The turbine is turning. Pull the generator handle to connect the palace.",
      "La turbine tourne. Tire le levier de l'alternateur pour brancher le palais.",
    );
  else
    guide = say(
      "giscard",
      "Keep the water moving. The palace lights up as output reaches 100 MW.",
      "Laisse l'eau circuler. Le palais s'allume quand la production atteint 100 MW.",
    );
  return {
    next,
    ready: true,
    failed,
    complete,
    ...guide,
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
