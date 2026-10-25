# REP

A browser game with Giscard, de Gaulle and a power machine. Five missions, each with three phases: water circuits, reactor startup, Concorde, sniffer aircraft and the Élysée lights.

[Play](https://rep.keff.uk/)

## Play

Turn the pipes to restore three circuits. Keep the reactor rods aligned through three power levels. Fly Concorde with throttle and pitch. Tune three survey signals. Synchronise three feeders to light the palace.

The game fits one screen. English is the default; French, pause, quarter speed and restart are available. Buttons and native range inputs support keyboard and touch. Escape returns to the machine. Closing a mission keeps its current phase in memory; finished missions are saved locally.

## Code

- `src/challenges.ts`: pure task state, puzzle generation, stability and timing rules.
- `src/missions.ts`: mission order, bilingual dialogue and progression.
- `src/machine.ts`: illustrated machine and registered animation layers.
- `src/main.ts`: task UI, input, localization and storage.
- `src/style.css`: dark single-screen layout and motion.
- `public/art/`: transparent optimized machine and portrait assets.

There is no WebGL or Three.js runtime dependency.

## Develop

```sh
npm ci
npm run dev
npm test
npm run build
```

## Deploy

Use Node 24.22 or later and authenticate Cloudflare's CLI.

```sh
npm run build
npm run package:worker
npx cf deploy --prebuilt
```

GitHub Actions checks tests, TypeScript, the build and production dependencies. The existing Worker serves `rep.keff.uk`.
