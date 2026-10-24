# Validation

Checked on 24 October 2026. This records software checks, not scientific qualification.

## Automated checks

- `npm test`: 23 passing tests. Seven exercise internal transport and section navigation; twelve exercise the physical model; four check all nine equipment trees, bilingual content, parent/child consistency, finite geometry for all 168 nodes and distinct selectable winding, rotor and turbine-row entry points.
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

## Spatial navigation revision

Reviewed the plant-to-fuel-grain flow, its reverse path, the optional details panel and the narrow layout. The six better-interface domain skills informed the review. No additional repository design instructions were present.

| Severity | Location | Before | Implemented change | Reason |
| --- | --- | --- | --- | --- |
| Medium | `src/scene.ts`, `setDetail` | Each selection disposed the previous scene and reset the camera. | Components occupy nested world coordinates. Camera movement and scale interpolate over 850 ms; the immediate parent remains as faint outlines. Returning restores the parent viewpoint. | The selected part remains spatially related to its assembly. |
| Medium | `src/main.ts`, workspace | Explanations, four large measurements and a permanent inspector surrounded the drawing. | Exploration opens first. Details and measurements are disclosures; the drawing uses the full width when details are closed. | Prioritizes manipulation of the machine. |
| Medium | `src/style.css`, mobile playback | French playback labels overlapped in the first revision. | Restart lives in Details; playback retains Run, speed and Measurements. | All controls fit at 320 px. |
| Medium | `src/main.ts`, key handling | Escape was ignored when a button had focus. | Escape closes details or measurements, then ascends one level. Native selects and dialogs keep their own Escape handling. | Predictable keyboard recovery. |

Browser checks used 1280 × 800 and 320 × 740. Verified seven nested levels, rapid successive navigation, reverse navigation, language switching, details opening/closing and the guided heating flow. Sequential screenshots captured distinct intermediate and final camera positions. The 320 px page had equal document/client width and no controls outside the horizontal viewport.

Measured rendered text on white: primary text 14.37:1, muted text 5.43:1, accent text 7.21:1. These measurements cover the inspected text pairs, not every rendered pixel. Source inspection confirms a 120 ms opacity-only transition under reduced motion; OS-level reduced-motion emulation was unavailable in the test browser. Dedicated screen-reader and hardware touch testing remain unverified.

Nested placement uses a representative annotated mesh when available and the parent centre otherwise. Detailed models and relative scales remain illustrations, not a dimensionally accurate nested CAD assembly. The physics equations are unchanged.

Review verdict: no blocking issue remains in the inspected flow. Accessibility, layout, writing, typography, colour and UI behaviour were inspected in the source and browser as described above. Reduced-motion runtime behaviour and dedicated assistive-technology use remain unverified. Copy review was manual; no AI-writing detector or preservation validator was run.

## Open sections and internal transport revision

- `npm test`: 23 tests pass. Seven new tests cover the integrated operating example, zero-source transport, pause and reduced-motion phases, fuel/fluid boundaries, finite routes, reversible casing poses, picked instance transforms and reversed exchanger heat transfer (the first transport test includes both pause and reduced motion).
- Production build and Worker packaging pass. `npm audit` reports zero vulnerabilities. The existing Three.js size advisory remains (approximately 135 kB gzip); no hardware frame-rate guarantee is inferred from the build.
- Split casings and covers now open during a 1.5 s spatial transition. Reduced motion snaps geometry/camera to the destination and retains a short opacity transition. Camera anchors use the actual picked instance. Context renders as outlines, without shading nearly transparent parent faces.
- Inspected the reactor, core lattice, fuel assembly, opened rod, U-tube steam generator, turbine and condenser in Chromium. Clicked a specific assembly and then a rod directly on the canvas; both descended to the expected detail. Browser console contained no warnings or errors during the inspected session.
- Completed the five-step French cold-start lesson through electrical production, then paused. Verified English exploration starts in the integrated operating example. Switching to the first cold-start lesson resets to 20 °C and pauses.
- At 320 × 740, inspected the condenser and French controls: document width matched client width (305 px after the vertical scrollbar), without horizontal overflow. In-scene notes remained within the drawing. Also inspected 1280 × 800 desktop views.
- Local pressurizer flow and microscopic fuel physics remain uncomputed. There is no invented pressurizer particle stream. Tube routes distinguish inside cooling/primary water from outside steam. Cutaway transport is drawn through occluding surfaces for legibility; it is not CFD. Equipment mean values and these limits are labelled in the interface and `MODEL.md`.

| Severity | Location | Finding | Implemented change | Reason |
| --- | --- | --- | --- | --- |
| Medium | Detail geometry | Casings stayed static during navigation. | Reversible split shells, lifted heads and open section edges. | Shows how interior parts sit inside a boundary. |
| Medium | Picking | Repeated pieces used the first matching mesh as the destination. | Picked mesh/group and instance transforms determine the world anchor. | The selected copy remains the entry point. |
| Medium | Steam-generator geometry | The generic vessel view reused fuel-like internals. | Separate U-tube, tube-plate and separator geometry. | Keeps primary and secondary spaces intelligible. |
| Medium | Internal routes | Only external piping showed transport. | Internal streams and signed heat arrows follow model rates; pressure-only components remain static. | Explains the process at the inspected level without fabricating local physics. |

Review verdict: no blocking issue in the inspected flows. Dedicated assistive-technology, Safari/Firefox, touch hardware, low-end GPU performance and OS-level reduced-motion emulation remain unverified. Reduced-motion phase freezing is covered by unit tests; source inspection covers the camera fallback. These are software and interface checks, not plant validation.
