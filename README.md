# REP — Light up the Élysée

A browser game about starting a nuclear power plant. Five switches, a palace in the dark, and two impatient presidents.

**[Play at rep.keff.uk](https://rep.keff.uk)**

English by default, French from the language menu. Three.js runs the whole machine locally. No accounts, analytics or simulation service.

## Play

Giscard and de Gaulle guide the startup: cooling pumps → primary water → core heat → steam turbine → generator. Each command changes the machine. The objective is **100 MW**, at which point the palace windows light up. This is an absurd game target, not the actual electricity demand of the Élysée.

Switches remain reversible after winning. Cut the output and the lights go out. Lose circulation and the heat source trips; the guide offers a restart. Fine controls and the energy model are available in the information drawer.

- **Follow the water** puts the camera beside a droplet inside the actual machine. The shells open and turn translucent. The journey follows primary water, crosses the tube wall as heat, then follows a different water circuit as steam and condensate. The waters do not mix.
- Travel speed follows circulation and steam admission. No flow means no travel. Pause stops the model and the droplet; quarter speed slows both. Camera transitions can settle while paused. With reduced motion enabled, explicit next-stop controls replace continuous camera travel.
- Click equipment to explore it: nine equipment trees, 168 nodes, down to fuel pellets, pump vanes and generator windings. The original equipment remains in place during entry; deeper representations appear at the selected part.
- Add eyes, a baguette antenna or a disco ball. These are visible, removable props with no physical effect. Call the president for the “Au revoir” gag; click again to bring him back.
- Drag to rotate. Focus the canvas and use arrow keys or +/−. Escape exits a journey or returns one level. Pause, zoom and navigation have keyboard controls. Machine sound is off by default.

The app starts cold at 20 °C and advances four model seconds per real second; quarter speed uses one. Thermal inertia is also deliberately reduced. Neither clock represents a real plant startup schedule.

## Fiction and references

Dialogue is original parody, labelled in the interface. Two short historical quotations are used:

- De Gaulle, [“Je vous ai compris !”, 4 June 1958](https://www.elysee.fr/charles-de-gaulle/1958/06/04/je-vous-ai-compris-discours-prononce-par-le-general-de-gaulle-president-du-conseil-au-forum-dalger-algerie-4-juin-1958).
- Giscard, [“Au revoir”, 19 May 1981](https://www.ina.fr/ina-eclaire-actu/1981-valery-giscard-d-estaing-dit-au-revoir-aux-francais).

The presidents did not say the game's other lines. The caricatures were generated for this game; [asset methods and prompts](docs/ASSETS.md) are recorded.

Interaction references: [Neal's iPhone builder](https://neal.fun/design-the-next-iphone/) for immediately visible consequences; [Google Japan CAPS](https://archive.google/caps/) for absurd engineering; [April Zhu's Colorfigures](https://april-zhu.com/colorfigures) for saturated colour and inked machinery. No reference-site assets or code are included.

## Model underneath the game

Energy moves between thermal reservoirs, steam, the shaft, exported electricity and rejected heat. Temperatures, power and flow animation come from this simplified model, not a scripted victory sequence. Tests check its conservation and causal behaviour.

It is not an operating simulator. Circuit pressures are imposed. There is no local CFD, neutronics, water-level control, stress calculation or accident analysis. Detailed geometry does not imply detailed local physics. Travel curves are schematic routes, not computed particle trajectories.

[MODEL.md](MODEL.md) documents equations and omissions. [NRC PWR overview](https://www.nrc.gov/reactors/power/pwrs) and [Reactor Concepts Manual](https://www.nrc.gov/sites/default/files/doc_library/cdn/legacy/reading-rm/basic-ref/students/for-educators/04.pdf) are technical references.

## Develop and deploy

Node 24.22 or later:

```sh
npm ci
npm run dev
npm test
npm run build
```

The application dependencies are Three.js and the locally bundled DM Sans font. Vite, TypeScript and Cloudflare's CLI are development tools.

```sh
npm run build
npm run package:worker
npx cf deploy --prebuilt
```

Cloudflare serves static assets at `rep.keff.uk`. Authenticate with the CLI or provide `CLOUDFLARE_API_TOKEN` through the environment. The repo contains no credentials. Change `cloudflare.config.ts` to deploy to another account.

GitHub Actions runs tests, build, packaging and a production dependency audit. Deployment is a separate explicit step. See [validation notes](docs/VALIDATION.md) for the browser checks and remaining limits.
