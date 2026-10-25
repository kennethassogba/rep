# Validation

Checked on 25 October 2026 for the five-mission game.

## Automated

Six tests pass: ordered progression and duplicate completion, blocked mission skipping, all single-pipe mistakes, rod alignment tolerance and invalid values, reachable flight/grid success windows, and interface copy normalization. TypeScript and the Vite production build pass. No runtime dependency was added.

The app bundle is about 20 kB before compression. Three.js is 510 kB (130 kB gzip); Vite reports a nonblocking 500 kB chunk-size advisory.

## Browser

The five tasks were completed in Chromium through their actual UI: water routing, reactor rods, Concorde thrust tracking, three sniffer scans and timed grid connection. The final state lights the palace and marks all five missions complete. Wrong water and rod submissions produce recoverable feedback. Pipe rotation also works with Enter. Rods and throttle use native range inputs. French switching, pause, native disabled task inputs, quarter speed and persisted completed missions were checked.

Portrait 320 x 568 and 390 x 844 fit one viewport without page scrolling. Landscape 844 x 390 puts the task beside dialogue. Desktop 1280 x 800 was checked. The presidents stay outside the machine and their instructions remain visible during tasks.

Browser console reported no JavaScript errors. Physical iOS/Android touch, installation and low-end GPU performance were not tested.

## Publication

Cloudflare version `e6e08524-8e1d-4ddc-9e69-2e655a0b7aa8` is deployed to rep.keff.uk. Public HTML, entry script, Three.js, CSS and manifest match the local build byte for byte. The first task was completed on the public site and unlocked reactor startup. Production console reported no errors.
