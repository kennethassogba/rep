# REP

A mobile browser game. Turn the water wheel, pull the heat lever, open the steam valve and light up the Élysée. Giscard and de Gaulle live in the machine and react when you mess with it.

[Play](https://rep.keff.uk/)

## Play

The whole game fits one screen. Tap a physical control to switch it, or drag to adjust it. The camera moves into that part of the machine. The home button returns to the whole tower. Keyboard controls use Tab, Enter, arrow keys, Home, End and Escape.

English is the default. French, pause, slow motion, sound and restart remain available. Motion follows the system's reduced-motion preference. The web manifest opens the game in standalone mode on supporting browsers.

## Code

- `src/arcade.ts`: deterministic game state, consequences and dialogue.
- `src/mobile-scene.ts`: vertical Three.js machine, handles, camera and visual reactions.
- `src/main.ts`: pointer and keyboard input, localization and accessible controls.
- `src/style.css`: full-viewport layout and safe-area spacing.

The former deep equipment explorer has been removed. Its source remains in Git history.

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

GitHub Actions checks tests, TypeScript, the build and the production dependency audit. Deployment targets the existing `rep.keff.uk` Worker.
