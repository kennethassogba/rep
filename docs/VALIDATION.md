# Validation

Checked on 25 October 2026 for the five-switch game rebuild. These checks establish software behaviour, not scientific qualification.

## Automated

- 31 tests pass: 28 existing model, geometry, transport, section and startup tests; three new game and journey tests.
- The game reaches 100 MW from a cold state by operating the five commands. The test does not set output or replace the state with a prepared example. Turning the generator off removes the win condition and brings back its startup instruction.
- Premature actions preserve controls and identify a prerequisite. The guide changes when actual circulation is established.
- The complete camera route is finite and position-continuous, including both sides of the heat-transfer handoff. Primary and secondary water endpoints are distinct. Zero flow stops travel.
- Existing checks cover energy conservation, residual heat, pump and cooling losses, pause, frame-step independence, 168 finite detail models, reversible sections and picked-instance transforms.
- TypeScript and the production build pass. The Three.js bundle is approximately 136 kB gzip; Vite still reports its uncompressed size above the 500 kB advisory threshold. The two transparent character PNGs total about 3.9 MB. No mobile-loading-time or frame-rate guarantee is claimed.
- `npm audit --omit=dev` reports zero vulnerabilities. `git diff --check` passes.

## Browser

Inspected in the Codex Chromium browser on Linux at 1280 × 720, 390 × 844 and 320 × 780.

- Completed startup through the visible commands in English on desktop and French on mobile. Observed output above 100 MW, lit palace windows and the changed mission dialogue.
- A cold heat command left the model unchanged and displayed the cooling prerequisite. The waiting instruction changed to an available next action after circulation or boiling.
- Verified language switching without resetting the game, pause/resume, the tour's pause caption, continuous movement through the primary circuit, steam-generator and condenser chapters, and the return to the overview. The travel marker stays readable through transparent shells and camera occluders.
- Added all three accessories. Confirmed eyes on the reactor, a baguette on the generator and a rotating coloured ball over the turbine. Each uses the same toggle for removal. The president button reveals the empty chair and restores the character on a second click. Disconnecting the generator after victory returns the reading to 0 MW and restores the connection instruction.
- Navigated vessel → core → assembly → rod → pellet; tested Escape ascent and return to the whole plant. Earlier geometry tests still cover every detail node, but browser inspection is representative rather than exhaustive.
- At 320 px, the document has no horizontal overflow. Startup, journey, quarter speed, pause and camera controls remain visible. The larger scene was reframed after testing revealed clipping and a narrow-screen overlap. Overview framing uses its own field of view, fixing a zoom error when returning from the wide-angle journey.
- No warnings or errors appeared in the inspected browser console.

## Interface review

Applied better-interface and avoid-ai-writing. Original game jokes follow the user's explicit request for parody.

| Finding | Change |
| --- | --- |
| No apparent purpose or outcome | An immediate startup objective, five named commands, 100 MW target and palace windows tied to electrical output. |
| Anonymous controls | Named actions and a single next-action button; unavailable commands explain their prerequisites. |
| Muted, static presentation | Cobalt, yellow, tomato, cyan and pink equipment, ink outlines, original caricatures and removable 3D props. No green/lime palette. |
| Exterior-only exploration | A camera journey through native equipment, opening shells, transparent occluders and a tracked droplet. |
| Fluid circuits could be confused | Separate route chapters and an explicit heat-transfer handoff where the original droplet disappears. |
| Complex settings dominated the activity | Model details and continuous sliders are behind the information drawer. |
| Returning players could lose guidance after disconnecting output | The guide resumes the missing command when power is lost. |

Native buttons, a labelled language selector, visible focus, native-dialog focus containment, canvas keyboard controls, named detail buttons and live status messages remain. Changing numeric power is not a live announcement. Pointer targets do not replace their SVGs every animation frame.

Reduced-motion branches stop particles and continuous camera travel and provide explicit next-stop controls. Browser emulation of that preference was unavailable; it was reviewed in source rather than verified through the OS. Screen readers, physical touch devices, Safari, Firefox and low-end hardware remain untested.

## Limits

There is one machine in the collection. Routes and geometry are schematic. The camera follows authored curves; it does not solve fluid dynamics. The game runs at four model seconds per real second, with separately reduced thermal inertia. The fictional 100 MW target is not palace consumption. Accessories have no effect on physics. Presidents' dialogue is parody; the two historical quotations and generated caricatures are documented.

Equations and omitted physics remain in `MODEL.md` and the optional information drawer. The local app makes no operational or accident-analysis claim.
