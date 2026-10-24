# Validation

Checked on 25 October 2026 for direct 3D controls and free-order play. These checks establish software behaviour, not scientific qualification.

## Automated

- 37 tests pass. All 120 permutations of the five commands reach the target from a cold state without replacing the physics state or assigning electrical output.
- Cold steam and generator commands are accepted but produce no energy. Heat demand waits for actual circulation.
- Continuous input clamps to its range and rejects non-finite values. The valve gesture crosses the angular seam without jumping; lever input clamps at both limits.
- Cutting a running primary pump triggers the actual model trip. Existing tests verify recovery, conservation, pause, frame-duration stability and the model boundary.
- Contextual reactions vary, detect repeated rapid commands and link to documented references.
- Source-copy checks reject hidden formatting characters, non-breaking spaces, smart quotes, long dashes, Unicode ellipses and trailing whitespace. They also reject the removed dialogue button, logo arrow and stock labels.
- Existing tests cover nine equipment trees, 168 nodes, finite geometry, native interiors, continuous travel curves, water-circuit separation and reversible shell opening.
- TypeScript and production build pass. Vite still reports the existing Three.js chunk above 500 kB; no new runtime dependency was added.

## Browser checks

In the in-app Chromium browser, at 1280 x 720 and 320 x 780:

- Dragged the actual primary lever to 57% and turned the cooling wheel to 24%. The dock reflected both changes, without camera orbit or accidental component entry.
- After enlarging the handles and moving the reactor handle clear of its opening lid, dragged the reactor to 65%, clicked the generator, steam and cooling controls in the 3D scene, then dragged the primary lever to 100%. The plant reached the target in this nonstandard order.
- Dragged the dock steam control from 70% to 100%. Arrow keys, Home and End adjusted the same controls. An early heat request stayed inactive until circulation was established.
- A cold valve and idle generator produced different historical reactions. Cutting a running pump produced the strike reaction, followed by the actual trip and recovery guidance. Disconnecting the palace immediately removed electrical output and triggered the empty-chair farewell.
- Pause stopped the fluid journey, leaving its position caption visible. Leaving the circuit returned to the overview. English/French switching retained the machine state.
- Restart returned the machine and all five control readings to cold/zero. The information panel exposed 12 historical references. The speech bubble contained no action button.
- Corrected a clipped French cooling label, a mobile alert/subtitle overlap and a reactor handle hidden by its opening lid. Mobile text and controls fit without horizontal page overflow.
- Removed the repeated header subtitle and permanent footer instructions. Handle hints appear only while hovering or dragging, and clear on release.
- Runtime visible text and title contained none of the forbidden typography characters. No browser warnings or errors were reported during the checks.

Pointer interaction was exercised in the browser, including at mobile width. This is not a physical touchscreen or low-end-device performance qualification.

Production smoke: the deployed HTML, JavaScript and CSS matched the local build byte for byte. All five 3D commands were exercised on rep.keff.uk and output reached 201 MW.

## Design review

Applied better-interface and avoid-ai-writing. Kept the established pop palette, inked machinery and user-requested historical satire. The dock positions mirror actual control requests; its lower strips show the model's response. Guidance and actions are separate. Controls have visible focus and keyboard alternatives.

The manual Impeccable detector reported no findings. No rule or value was suppressed. The earlier progress-meter layout-animation finding remains fixed with scaleX.

## Limits

One machine is available. Geometry and travel routes are schematic. The model has reduced inertia and imposed pressures, with no local CFD, neutronics or accident analysis. The 100 MW objective is a game rule, not palace consumption. Accessories do not affect physics. Historical events inspire original dialogue; sources are available in the information panel.
