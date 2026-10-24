# Validation

Checked on 25 October 2026 for the mobile game rebuild.

## Automated

10 tests pass:

- All 24 orders of the four commands reach 100 MW. Victory fires once.
- Cold commands cannot produce electricity; opening the grid alone does nothing.
- Cutting the grid removes output while the turbine coasts.
- Cutting hot water triggers a strike, cools the core and permits recovery.
- Pause freezes the game and reaction timers.
- Drag input, limits, switch quantization and invalid values are covered.
- A first animation timestamp earlier than setup cannot produce a negative step.
- Rapid commands trigger the chaos reaction with a cooldown.
- Deterministic stress play stays finite and bounded at different frame rates.
- Interface copy rejects hidden characters, non-breaking spaces, long dashes, smart quotes, Unicode ellipses and trailing whitespace.

TypeScript and the Vite production build pass. No runtime dependency was added. The application chunk is about 24 kB; Three.js is about 498 kB before compression.

## Browser checks

In Chromium at 320 x 568, 390 x 844, 844 x 390 and 1280 x 800:

- The page fits the viewport without scrolling.
- Four distinct handles operate the machine directly. Small-phone hit areas no longer overlap.
- Pointer dragging changes water, keyboard End changes heat, and tapping steam/grid completes a game. Output reached 162 MW during the observed run.
- Camera movement follows the selected control. Overview and Escape return to the complete machine.
- The pump opens; fuel changes color; fluid beads move inside translucent pipes.
- A cold heat command brings de Gaulle forward with NON, steam and a jumping lid.
- Disconnecting a running palace produces AU REVOIR and throws Giscard off his chair. Pause freezes the reaction.
- Restart clears all four inputs. English/French switching, pause and quarter speed respond.
- Fixed a negative first-frame interval found during the initial browser run; the fix has an automated regression test.

These are desktop-browser pointer and viewport tests. Physical iOS/Android touch, haptics, home-screen installation and low-end GPU performance have not been tested.

## Design review

Applied better-interface and avoid-ai-writing. The manual Impeccable detector returned no findings. No finding was suppressed. The previous layout-animation finding disappeared with removal of the old interface.

## Publication

Published to rep.keff.uk as Worker version `0812dc1f-61ca-443a-9d8a-657177037a9b`. The served HTML, JavaScript, CSS and web manifest match the local build byte for byte. All four controls were exercised on the public site; output reached 152 MW and the palace victory appeared. The production browser reported no JavaScript errors. The finish reviewer returned `ship` with no material fixes; physical-device touch and motion quality remain outside the still-image review.
