export type Language = "en" | "fr";
export type Pair = readonly [string, string];
export const missions = [
  {
    id: "water",
    title: ["Restore the water", "Remettre l'eau"],
    president: "degaulle",
    intro: [
      "The Élysée is dark. Restore all three water circuits. Turn the pipes, then test the flow.",
      "L'Élysée est dans le noir. Rétablissez les trois circuits. Tournez les tuyaux, puis testez l'eau.",
    ],
    done: [
      "Je vous ai compris. Three circuits running. The Shadoks can take a break.",
      "Je vous ai compris. Trois circuits en marche. Les Shadoks peuvent souffler.",
    ],
  },
  {
    id: "nuclear",
    title: ["Start the reactor", "Lancer le réacteur"],
    president: "giscard",
    intro: [
      "Vous n'avez pas le monopole du cœur. But you do have its controls. Keep all three rods on their marks through three power levels.",
      "Vous n'avez pas le monopole du cœur. Mais vous avez les commandes. Maintenez les trois barres sur leurs repères pendant les trois paliers.",
    ],
    done: [
      "In France, we have ideas. And now, electricity.",
      "En France, on a des idées. Et maintenant, du courant.",
    ],
  },
  {
    id: "concorde",
    title: ["Fly Concorde", "Piloter Concorde"],
    president: "degaulle",
    intro: [
      "Paris to Montréal. Throttle AND pitch. Hold both needles in their zones for takeoff, cruise and landing.",
      "Paris-Montréal. Les gaz ET l'assiette. Gardez les deux aiguilles dans leurs zones : décollage, croisière, atterrissage.",
    ],
    done: [
      "Vive le Québec libre ! Concorde has landed.",
      "Vive le Québec libre ! Concorde a atterri.",
    ],
  },
  {
    id: "sniffer",
    title: ["Test the sniffer aircraft", "Tester l'avion renifleur"],
    president: "degaulle",
    intro: [
      "An aircraft that smells oil? Pick a site, tune the receiver and hold a clear signal. Three sites. No guesswork.",
      "Un avion qui sent le pétrole ? Choisissez un site, réglez la fréquence et gardez un signal clair. Trois sites. Je veux des preuves.",
    ],
    done: [
      "A cow, a cheese, a dry hole. Send the invoice to Elf.",
      "Une vache, un fromage, un trou sec. Envoyez la facture à Elf.",
    ],
  },
  {
    id: "elysee",
    title: ["Light up the Élysée", "Allumer l'Élysée"],
    president: "giscard",
    intro: [
      "Three feeders to connect. Close each switch on its striped mark. Miss, and the previous feeder trips.",
      "Trois lignes à raccorder. Fermez chaque interrupteur sur le repère hachuré. Si vous ratez, la ligne précédente saute.",
    ],
    done: [
      "Au revoir. The Élysée has power. I can finally turn off the television.",
      "Au revoir. L'Élysée a du courant. Je peux enfin éteindre la télévision.",
    ],
  },
] as const;
export type MissionId = (typeof missions)[number]["id"];
export type Progress = { completed: number; playing: boolean };
export const freshProgress = (): Progress => ({ completed: 0, playing: false });
export function finishMission(p: Progress, id: MissionId) {
  if (!p.playing || missions[p.completed]?.id !== id) return false;
  p.completed++;
  p.playing = false;
  return true;
}
export function frameDelta(now: number, previous: number) {
  return Math.max(0, Math.min(0.05, (now - previous) / 1000));
}
