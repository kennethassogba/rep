# Validation

Checked on 24 October 2026 for the industrial-machine rebuild. These are software and interface checks, not scientific qualification.

## Automated checks

- `npm test`: 28 passing tests. Twelve check the physical model, four check the 168-node hierarchy and geometry, seven check internal transport and section behaviour, three check the new startup controls, and two check the physical plant and its native internal routes.
- The startup test operates the five controls from a cold state, waits for physical prerequisites, and reaches electrical production without substituting a prepared state. It also checks that premature commands leave controls unchanged and that circulation can be restored at the liquid-model boundary.
- Conservation, shutdown heat, pump-loss trips, cooling loss, pause, frame-step independence, finite geometry, picked-instance transforms and reversible opening poses are covered. This does not validate the equations against a real plant.
- TypeScript and the Vite production build pass. The Three.js chunk is approximately 135 kB gzip; Vite reports its uncompressed size above the 500 kB advisory threshold. No frame-rate guarantee follows from this result.
- Cloudflare static-asset packaging passes. `npm audit` reports zero vulnerabilities, including development dependencies, at the time checked.

## Browser checks

Checked in the Codex Chromium browser on Linux, at 1280 × 720/800 and 320 × 740.

- Completed the five-control startup in French and English. Observed steam becoming available after heating, shaft acceleration, electrical-load availability and nonzero output. A transient output peak after connecting the load comes from stored shaft energy; the model explicitly permits it.
- A premature primary-pump command remained blocked and identified cooling/feed circulation as its prerequisite. Pause preserved the displayed power throughout nested exploration. Quarter speed and optional sound toggles changed state without console errors; acoustic accuracy is not claimed.
- Opened the native reactor and generator. Navigated reactor → core → assembly → rod → pellet → ceramic → grain, and generator → stator. Verified Escape ascent, rapid successive selections, component lists and the information drawer.
- Verified language switching, slider keyboard input and synchronized control values when opening the drawer. English is the default when no saved preference exists.
- The 320 px layout has no horizontal document overflow. Physical controls become a five-button dock; playback and camera controls remain separate. The information drawer scrolls within the viewport.
- No browser warnings or errors appeared in the inspected session. Visual checks cover representative views, not every one of the 168 nodes.

## Interface review

Reviewed with better-interface and avoid-ai-writing: accessibility, colour, layout, typography, UI behaviour and copy.

| Severity | Location | Finding | Change | Reason |
| --- | --- | --- | --- | --- |
| High | Main workspace | Text and detached panels competed with the machine. | Full-viewport 3D, pictograms, numbered actuators and one electrical-output reading. Explanations and fine controls live in an optional drawer. | Make each action visible in the machine. |
| High | Plant-to-equipment navigation | Entering equipment substituted another model. | Reuse the actual equipment group, open its casing and move the camera into it. | Preserve spatial continuity. |
| Medium | Deep navigation | Parent faces obscured the selected part; open lids could crowd the header. | Retain only faint parent outlines and frame the opened geometry. Preserve horizontal shaft orientation in generator details. | Keep the destination readable during a dive. |
| Medium | Native equipment | Transport disappeared when entering a physical component. | Attach model-driven internal routes to the equipment itself. | Preserve flow through transitions. |
| Medium | Mobile controls | Small camera targets and a tight chassis frame. | Use 44 px bottom controls, retain rotation through dragging/keyboard, and widen portrait framing. | Keep controls usable and the whole machine visible at 320 px. |
| Medium | Recovery | A domain stop could disable the pump needed to recover. | Allow circulation commands at the model boundary. | Let the model cool and rearm. |

Native buttons, labelled ranges, a native dialog, visible focus and an accessible canvas name provide keyboard alternatives. Icon controls retain bilingual names and prerequisite descriptions. The white/navy/orange palette contains no green or lime. Copy review was manual; no AI-writing detector was used.

Reduced-motion source paths snap camera/section poses and stop particle/shaft travel; unit tests cover phase freezing. OS-level reduced-motion emulation, dedicated screen readers, physical touch devices, Safari, Firefox and low-end hardware performance have not been verified.

## Delivery and limits

The public repository is `kennethassogba/rep`; production is an assets-only Cloudflare Worker at <https://rep.keff.uk>. After publishing, compare public HTML and referenced assets with the local build, then check the production page in the browser. GitHub Actions repeats tests, build, packaging and the production dependency audit.

The current collection contains one machine. The nine equipment trees are schematic, and fine geometry does not imply locally solved physics. Primary/secondary pressures, reduced thermal inertia, an ideal heat sink and omitted neutronics, pressure dynamics, fluid mechanics and grid synchronization are documented in `MODEL.md` and the app's information drawer. The visual reference informs colour and industrial form; no footage or third-party 3D assets were copied.
