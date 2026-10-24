# REP

An interactive pressurized-water reactor, from the complete plant to fuel pellets, pump vanes and generator windings.

**[Open rep.keff.uk](https://rep.keff.uk)**

English by default; French is available from the language menu. The simulation runs in the browser. There are no accounts, analytics, remote simulation services or paid APIs.

## Operate and explore

The machine opens cold at 20 °C. Five numbered controls sit beside the equipment they operate:

1. Start cooling and feedwater circulation.
2. Start the primary pump.
3. Apply core heat. Watch water warm and the steam reserve form.
4. Admit steam to turn the turbine.
5. Connect the electrical load.

The sequence is educational. Availability follows the simulated temperatures, flows and shaft speed. A locked control identifies its prerequisite; a progress ring shows heating or rotation. Commands remain reversible. Pump loss can trip the heat source, and the information drawer explains recovery.

- Click a piece to enter it. The existing equipment opens as the camera approaches. Deeper geometry occupies the selected part's coordinates, with the parent retained as faint outlines.
- Nine equipment trees contain 168 nodes, with four to seven levels per tree. Repeated components share representative detailed views.
- Primary water, steam, cooling water and heat move through the machine. Their animation uses model rates. Pause and reduced motion retain static direction cues.
- Drag to orbit; use the camera controls to rotate and zoom. Focus the canvas and use arrow keys or +/−. Escape returns one level.
- Pause, quarter speed and optional synthesized machine sound are available below the scene. Sound starts off.
- The information button opens component roles, continuous controls, equipment mean measurements, English/French selection and model limits. The main workspace contains pictograms and numbers.

The top-level components are the vessel, pressurizer, primary pump, steam generator, turbine, generator, condenser, feed pump and cooling system. Internal levels include core → assembly → rod → pellet → ceramic → grain, pump stage → impeller → vane, and generator rotor/stator → winding → conductor → insulation.

## Model

Energy is conserved across thermal reservoirs, steam storage, the shaft, residual heat, exported electricity and rejected heat. The tests check conservation and causal responses. Temperatures and flows are not scripted to lesson steps.

**This is a teaching model, not an operating simulator.** The circuits start under imposed pressure. Effective thermal masses are reduced, so model seconds have no fixed conversion to plant time. Local fuel temperatures, water levels, pressure dynamics, neutronics, stresses, magnetic fields and accident behaviour are not solved. Detailed geometry does not imply detailed local physics.

See [MODEL.md](MODEL.md) for equations, parameters and omissions. The same limits are available under **Model & limits** in the information drawer.

## Run locally

Use Node 24.22 or later (see `.nvmrc`).

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

The only application dependencies are Three.js and the locally bundled DM Sans font. Vite, TypeScript and Cloudflare's CLI are development tools. The dependency overrides patch transitive CLI libraries; `npm audit` is checked during validation.

## Deploy

The static site is hosted by Cloudflare Workers at `rep.keff.uk`.

```sh
npm run build
npm run package:worker
npx cf deploy --prebuilt
```

Authenticate with the Cloudflare CLI or provide `CLOUDFLARE_API_TOKEN` through the environment. The repository contains no credentials. The checked-in account and hostname target the original deployment; change `cloudflare.config.ts` for another account.

GitHub Actions runs model/geometry tests, the production build, packaging and the production dependency audit. Production publishing is an explicit CLI step; CI does not silently deploy.

## References

- [NRC: Pressurized water reactors](https://www.nrc.gov/reactors/power/pwrs)
- [NRC: Reactor Concepts Manual, PWR systems](https://www.nrc.gov/sites/default/files/doc_library/cdn/legacy/reading-rm/basic-ref/students/for-educators/04.pdf)
- [Video reference](https://x.com/visegrad24/status/1991511558992916580): Concorde and Ariane footage informed the current industrial direction: enamel white, navy, signal orange and exposed metal. No video assets are included.
- [Colorfigures by April Zhu](https://april-zhu.com/colorfigures) informed the earlier inked cutaway exploration. Geometry and implementation are original.

[Validation notes](docs/VALIDATION.md) distinguish automated tests from browser inspection.
