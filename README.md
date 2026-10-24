# REP  -  Light up the Élysée

Turn valves and pull levers to light up the Élysée. Giscard and de Gaulle react to the way you run the machine.

**[Play at rep.keff.uk](https://rep.keff.uk)**

English by default, French from the language menu. Three.js runs the whole machine locally. No accounts, analytics or simulation service.

## Play

The objective is **100 MW**, when the palace windows light up. This is a game target, not the electricity demand of the Élysée.

Operate the five controls in any order. Turn the red wheels in the 3D scene or drag the levers vertically. The bottom controls mirror their positions: click to toggle, drag vertically for a continuous setting, or use arrow keys in 10% steps (Home/End for the limits). The generator is an on/off connection.

Opening a cold steam valve or connecting an idle generator is allowed; neither produces power. A heat request waits for actual circulation. Cutting a running pump can trip the heat source. Restore the pumps, set heat to zero and use Info to rearm once cooled, or use the round arrow beside Pause to restart cold. The dialogue guides and reacts; it contains no action button.

- **Follow the water** puts the camera beside a droplet inside the actual machine. The shells open and turn translucent. The journey follows primary water, crosses the tube wall as heat, then follows a different water circuit as steam and condensate. The waters do not mix.
- Travel speed follows circulation and steam admission. No flow means no travel. Pause stops the model and the droplet; quarter speed slows both. Camera transitions can settle while paused. With reduced motion enabled, explicit next-stop controls replace continuous camera travel.
- Click equipment to explore it: nine equipment trees, 168 nodes, down to fuel pellets, pump vanes and generator windings. The original equipment remains in place during entry; deeper representations appear at the selected part.
- Add eyes, a baguette antenna or a disco ball. These are visible, removable props with no physical effect. Call the president to cycle through extra historical gags, including the empty chair from "Au revoir".
- Drag to rotate. Focus the canvas and use arrow keys or +/−. Escape exits a journey or returns one level. Pause, zoom and navigation have keyboard controls. Machine sound is off by default.

The app starts cold at 20 °C and advances four model seconds per real second; quarter speed uses one. Thermal inertia is also deliberately reduced. Neither clock represents a real plant startup schedule.

## Historical references

Twelve references underpin the reactions: the 1958 Algiers speech, Quebec in 1967, the Shadoks, May 1968, the 1969 referendum, the Messmer plan, ORTF television, the 1974 debate, the voting age at 18, the energy-saving campaigns and the 1981 farewell. Sources are linked under Info > Historical references and recorded in [src/references.ts](src/references.ts).

The game adapts these events into original jokes. They are not transcripts of the presidents discussing a reactor. [Character asset methods and prompts](docs/ASSETS.md) are recorded separately.

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
