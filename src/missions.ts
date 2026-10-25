export type Language = "en" | "fr";
export type Pair = readonly [string, string];
export const missions = [
  {
    id: "water",
    title: ["Restore the water", "Remettre l'eau"],
    president: "degaulle",
    intro: [
      "The Élysée is dark. Connect the pipes. Turn each bend.",
      "L'Élysée est dans le noir. Reliez les tuyaux en tournant les coudes.",
    ],
    done: [
      "The Shadoks would be proud. Now, start the reactor.",
      "Les Shadoks seraient fiers. Maintenant, le réacteur.",
    ],
  },
  {
    id: "nuclear",
    title: ["Start the reactor", "Lancer le réacteur"],
    president: "giscard",
    intro: [
      "The Messmer Plan is waiting. Align the three rods with their marks.",
      "Le plan Messmer attend. Alignez les trois barres sur leurs repères.",
    ],
    done: [
      "In France, we have ideas. And now, electricity.",
      "En France, on a des idées. Et maintenant, du courant.",
    ],
  },
  {
    id: "concorde",
    title: ["Clear Concorde for takeoff", "Faire décoller Concorde"],
    president: "giscard",
    intro: [
      "Paris to New York. Keep the throttle in the marked zone for three seconds.",
      "Paris-New York. Gardez la manette dans la zone pendant trois secondes.",
    ],
    done: [
      "Mach 2. The luggage is still at Orly.",
      "Mach 2. Les valises sont encore à Orly.",
    ],
  },
  {
    id: "sniffer",
    title: ["Test the sniffer aircraft", "Tester l'avion renifleur"],
    president: "degaulle",
    intro: [
      "An aircraft that smells oil? Scan all three sites. I want to see the results.",
      "Un avion qui sent le pétrole ? Scannez les trois sites. Je veux voir les résultats.",
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
      "Dinner is in five minutes. Close the circuit when the needle crosses the mark.",
      "Le dîner est dans cinq minutes. Fermez le circuit quand l'aiguille passe sur le repère.",
    ],
    done: [
      "The lights are on. You have the monopoly on the current.",
      "Les lumières sont allumées. Vous avez le monopole du courant.",
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
// L-shaped pipe segments: north/east, east/south, south/west, west/north.
export const pipeEnds = (rotation: number) => [
  rotation % 4,
  (rotation + 1) % 4,
];
export function connectedPipes(rotations: readonly number[]) {
  const expected = [
    [2, 3],
    [1, 2],
    [0, 1],
    [3, 0],
  ];
  return (
    rotations.length === 4 &&
    rotations.every((r, i) => expected[i].every((e) => pipeEnds(r).includes(e)))
  );
}
export function alignedRods(values: readonly number[]) {
  return (
    values.length === 3 &&
    values.every(
      (v, i) => Number.isFinite(v) && Math.abs(v - [32, 68, 45][i]) <= 5,
    )
  );
}
export const inFlightZone = (v: number, time: number) =>
  Math.abs(v - (58 + Math.sin(time * 0.65) * 20)) <= 10;
export const syncNeedle = (time: number) => (Math.sin(time * 1.8) + 1) * 50;
export const canConnect = (time: number) =>
  Math.abs(syncNeedle(time) - 50) <= 15;

export function frameDelta(now: number, previous: number) {
  return Math.max(0, Math.min(0.05, (now - previous) / 1000));
}
