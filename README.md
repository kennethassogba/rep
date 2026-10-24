# REP

An interactive pressurized-water reactor, from the complete plant to fuel pellets, pump vanes and generator windings.

**[Open rep.keff.uk](https://rep.keff.uk)**

English by default; French is available from the language menu. The simulation runs in the browser. There are no accounts, analytics, remote simulation services or paid APIs.

## Explore

- Start the energy cycle in five guided steps, or adjust equipment in Explore mode.
- Select equipment in the 3D drawing or the equipment list. Open it, then follow **Inside** to progressively smaller parts.
- Nine equipment trees contain 168 nodes, with four to seven levels per tree. Geometry is schematic; repeated physical components share representative views.
- Rotate, zoom, use cutaway and exploded views. Labels are optional.
- Pause or change playback speed. Space controls playback outside form controls; Escape moves up one component level. Buttons and component lists provide keyboard alternatives to dragging and picking.
- Read the component role, connections, live equipment values and model limits at the point of use.

The top-level components are the vessel, pressurizer, primary pump, steam generator, turbine, generator, condenser, feed pump and cooling system. Internal levels include core → assembly → rod → pellet → ceramic → grain, pump stage → impeller → vane, and generator rotor/stator → winding → conductor → insulation.

## Model

Energy is conserved across thermal reservoirs, steam storage, the shaft, residual heat, exported electricity and rejected heat. The tests check conservation and causal responses. Temperatures and flows are not scripted to lesson steps.

**This is a teaching model, not an operating simulator.** The circuits start under imposed pressure. Effective thermal masses are reduced, so model seconds have no fixed conversion to plant time. Local fuel temperatures, water levels, pressure dynamics, neutronics, stresses, magnetic fields and accident behaviour are not solved. Detailed geometry does not imply detailed local physics.

See [MODEL.md](MODEL.md) for equations, parameters and omissions. The same limits are available from **Model** in the app.

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
- [Colorfigures by April Zhu](https://april-zhu.com/colorfigures), the visual reference for inked isometric objects and internal views. Geometry and implementation here are original.

[Validation notes](docs/VALIDATION.md) distinguish automated tests from browser inspection.
