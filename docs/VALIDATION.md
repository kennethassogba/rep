# Validation

Checked on 25 October 2026 for the dark illustrated rebuild.

## Automated

Eleven tests pass. They cover ordered mission completion, invalid skips, 300 solvable water-board scrambles and every single-piece wrong rotation, three-board completion, seed variation, all three reactor levels, dual-control Concorde flight, stability loss, three tuned surveys, grid cooldown and tripped feeders, paused state, frame bounds, and authored text normalization.

The core needs at least 15 stable seconds, Concorde 24 and the receiver 12 across their three phases. Moving controls, puzzle solving and retries add play time. These are game rules, not measured human completion times.

TypeScript and Vite pass. Three.js and its type dependency were removed. Runtime JavaScript is approximately 21 kB before compression; optimized illustration assets total about 600 kB. The production dependency audit reports no vulnerabilities.

## Browser

All five missions were completed through their actual browser controls: three nine-piece water boards, three core levels, takeoff/cruise/landing using two sliders, three receiver locks in the order 3-1-2, and three timed grid feeders. Water and grid failures show recoverable feedback. The grid cadence was reduced after testing revealed a harsh timing window; the corrected sequence completed in the browser.

Verified native disabled task inputs during pause, resumed play, French and English, Enter to rotate a pipe, retained task state after closing, and completed-mission persistence. The famous heart phrase appears at core startup; the final state says Au revoir.

Portrait 320 x 568 and 390 x 844 fit one viewport. The water task and dialogue fit side by side at 844 x 390. Desktop 1280 x 800 was checked. Task and dialogue bounds do not overlap in the inspected compact portrait states. Measured text contrast exceeds AA; task boundaries exceed 3:1.

No JavaScript errors were reported in the local browser console. Physical iOS/Android touch, screen-reader operation, installation and low-end device performance were not tested. Reduced decorative motion is implemented; a physical reduced-motion device session was not run.

## Publication

Cloudflare version `c4af6abc-f242-4bc9-9219-4afe3923cdf5` is live at rep.keff.uk. HTML, entry JavaScript, CSS, manifest and both illustration files match the local build byte for byte. The three public water boards were completed and reactor startup persisted after reload. The production browser reports no JavaScript errors.
