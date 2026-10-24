# Validation

Checked on 24 October 2026. This records software checks, not scientific qualification.

## Automated checks

- `npm test`: 15 passing tests. Twelve exercise the physical model; three check all nine equipment trees, bilingual content, parent/child consistency and finite, non-empty geometry for all 168 nodes.
- Model tests cover the cold state, prerequisite blocks, a complete energy cycle, conservation through load changes and shutdown, saturation, loss of circulation, residual heat, condenser admission blocking, pause, integration intervals, frame-rate independence, and a deterministic control sweep.
- The primary liquid-only domain ends at 340 °C. A dedicated test checks that integration stops there without breaking the energy ledger, then recovers after circulation is restored.
- `npm run build`: TypeScript and Vite production build pass. Vite reports the Three.js chunk above its 500 kB advisory threshold (approximately 134 kB gzip); this is not a measured performance benchmark.
- `npm run package:worker`: static Worker package generated successfully.
- `npm audit`: zero reported vulnerabilities, including development dependencies, at the time checked.

## Interface review

Reviewed with the better-interface domains: accessibility, colours, layout, typography, UI behaviour and writing. English and French use the same controls and preserve simulation state during language changes.

- **Accessibility:** native selects, labelled ranges, visible keyboard focus, skip link, focus on the selected component heading, native dialogs and keyboard camera controls. Verified slider keyboard input, Escape navigation, dialog focus and alternative component selection without canvas picking.
- **Layout:** one primary drawing with an adjacent inspector. Equipment controls follow the selected component. Internal parts, values and connections are progressively disclosed. Inspected desktop at 1280 × 800 and narrow layouts at 390 and 320 pixels. A playback-row overflow found at 320 pixels was fixed and rechecked.
- **Colours and typography:** white background, locally hosted sans-serif type, dark text, cobalt controls and coral/brass circuit distinctions. Labels supplement circuit colour. No green/lime palette. Visual inspection is not a full contrast or screen-reader audit.
- **UI behaviour:** completed all five guided startup steps and observed electrical production. Verified pause, speed selection, language persistence, pump-loss trip and rearm messaging. Verified cutaway, exploded views, rotation and zoom controls. Detail framing adapts to component size.
- **Progressive detail:** manually navigated reactor → core → assembly → rod → pellet → ceramic → grain, primary pump → hydraulic stage → impeller, and generator → stator. Inspected representative rendered views. The automated geometry test covers every node; every node has not received a separate visual inspection.
- **Writing:** short functional labels; component roles distinguish illustrations from computed quantities. Model assumptions and recovery instructions are available inside the app and in `MODEL.md`.

## Release checks and remaining limits

Production is an assets-only Cloudflare Worker at <https://rep.keff.uk>. Public HTML, scripts and response headers are checked after publishing. GitHub Actions repeats tests, build, packaging and the production dependency audit on pushes and pull requests.

The browser checks used the Codex in-app Chromium browser on Linux. Safari, Firefox, dedicated screen readers, touch hardware and low-end physical devices have not been tested. No frame-rate guarantee is made.

The physics is an energy-conserving teaching model with reduced thermal inertia and imposed pressures. Geometry and quantities are schematic. It is not a plant operating procedure, accident simulator, engineering design or calibrated fuel-performance model. See `MODEL.md` for equations and omissions.
