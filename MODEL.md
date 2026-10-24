# Energy model

All power is in MW, energy in MJ, time in model seconds, and temperatures in °C. The update uses explicit substeps of at most 0.02 s. Rendering does not control the constitutive equations. A long browser frame is limited to 0.25 wall-clock seconds; hidden tabs do not advance.

## State and imposed boundaries

The state contains primary mean temperature, secondary energy, condenser mean temperature, fission power, a residual-heat reservoir, shaft kinetic energy and three pump flow fractions. Integrated source, output, rejected heat and losses form an independent energy ledger.

| Parameter | Value |
| --- | --- |
| Ambient / ideal sink | 20 °C |
| Primary pressure, imposed | 155 bar |
| Secondary boiling temperature, imposed | 275 °C (about 60 bar) |
| Maximum fission power | 1,200 MW |
| Primary / secondary / condenser effective heat capacities | 25 / 15 / 18 MJ/K |
| Primary-to-secondary conductance at full flow | 40 MW/K |
| Cooling conductance at full flow | 40 MW/K |
| Primary / cooling mass flow at full setting | 14,000 / 20,000 kg/s |
| Effective latent heat | 1.6 MJ/kg |
| Feedwater heat capacity | 0.0048 MJ/(kg K) |
| Shaft moment of inertia | 120,000 kg m² |
| Generator efficiency | 0.96 |

The assumed cold initial state is already pressurized. This is a startup of the **energy-flow lesson**, not a reactor cold-start procedure. The pressurizer schematic shows its function; a steam pocket at initial temperature is not computed.

## Heat source

Fission power approaches the permitted demand with a 3 s time constant (0.5 s after a teaching trip). The physical heat lever represents demand; no reactivity or neutron kinetics are calculated.

```text
Q_core = 0.94 P_fission + E_decay / 60
 dE_decay/dt = 0.06 P_fission − E_decay / 60
```

The residual reservoir is illustrative. It is not an ANS decay-heat model and cannot be used to predict post-shutdown cooling requirements.

## Thermal reservoirs

```text
T_secondary = 20 + min(E_secondary, 15 × (275 − 20)) / 15
E_steam = max(0, E_secondary − 15 × (275 − 20))
Q_exchange = 40 × primary_flow_fraction × (T_primary − T_secondary)
Q_primary_loss = 0.015 × (T_primary − 20)
Q_secondary_loss = 0.006 × (T_secondary − 20)

25 dT_primary/dt = Q_core − Q_exchange − Q_primary_loss
 dE_secondary/dt = Q_exchange − Q_admitted − Q_secondary_loss
18 dT_condenser/dt = Q_admitted − P_mechanical − Q_rejected
Q_rejected = 40 × cooling_flow_fraction × (T_condenser − 20)
```

Exchange is signed: a hotter secondary reservoir may heat a cooler primary reservoir. The secondary temperature remains at saturation while energy accumulates in the steam reserve. The reserve is an effective energy buffer, not a resolved steam volume, and has no finite mass limit.

## Steam and rotation

```text
Q_admitted = valve × 1600 × clamp(E_steam / 250, 0, 1) × feed_flow_fraction
eta_cycle = clamp(0.65 × (1 − (T_condenser + 273.15) / (275 + 273.15)), 0, 0.4)
P_mechanical = Q_admitted × eta_cycle
P_load = generator_connected ? E_shaft / 5 : 0
P_electric = 0.96 × P_load
P_friction = E_shaft / 100
 dE_shaft/dt = P_mechanical − P_load − P_friction
omega = sqrt(2 × E_shaft × 1e6 / J)
steam_mass_flow = Q_admitted / (1.6 + 0.0048 × (275 − T_condenser))
```

Feedwater is reheated as well as vaporized. The return mass flow equals steam mass flow. Pump work, water inventories, condensate subcooling and reheaters are omitted. The load is isolated and idealized: no grid frequency, synchronization, governor or excitation dynamics are solved. Connecting the load can initially extract previously stored shaft energy, so instantaneous electrical power need not always be below instantaneous core heat.

## Gates and trips

Heat demand requires all three pump flow fractions above 0.25. Admission requires a feed fraction above 0.25 and condenser temperature at or below 75 °C. A hot condenser blocks admission; it does not erase stored energy.

Primary temperature at 330 °C, or primary flow below 0.2 while fission exceeds 40 MW, latches a teaching trip. Rearm requires demand zero, all flows at least 0.25 and primary temperature below 310 °C. These thresholds are educational rules and are not operating limits or safety-system specifications.

At 340 °C the liquid-only primary model reaches its declared domain boundary. The final integration step is shortened consistently for every energy reservoir and the ledger, and playback pauses. No primary boiling or further heating is invented. Restore the primary pump and resume to cool; the trip still requires rearm.

## Conservation

```text
E_stored = 25 (T_primary − 20) + E_secondary + 18 (T_condenser − 20)
         + E_shaft + E_decay
E_source = E_stored + E_exported + E_rejected + E_losses
```

Losses include primary and secondary heat leakage, shaft friction and generator losses. Tests require the integrated absolute residual to remain below 1e-6 MJ on the tested trajectories. This is numerical bookkeeping evidence, not physical validation against a plant.

## Drawing and internal levels

Nine trees contain 168 illustrated nodes. Rod counts, geometry and microstructure are representative, not construction drawings. Transparent housings and exploded spacing are explanatory. Fuel pellet/grain temperatures, tube-wall conduction profiles, mechanical stress, magnetic fields and detailed hydraulics are not solved. Values shown in the information drawer remain labelled primary, secondary or condenser mean values. They are not local temperatures.

Particles encode direction and relative flow, not molecule motion. Shaft animation is slowed for visibility. The operating-system reduced-motion preference stops these animations while retaining values and arrows. The cooling unit represents an ideal heat sink; it is not a detailed full-scale dry-cooler design.


## Immersive sections

The initial state is cold and inactive. The five physical controls set cooling/feed pumps to 1, primary pump to 1, heat demand to 0.65, steam valve to 0.7 and the isolated electrical load on. Their order helps expose cause and effect; continuous controls remain available in the information drawer. The existing `operatingExample()` function is retained only as a model test fixture.

The primary-start control waits for cooling and feed fractions of at least 0.75. Heat and steam controls use the physical model's gates. Electrical load becomes available above 400 rpm and 1 MW of admitted steam power. These are interface teaching gates, not real plant operating conditions. Active commands can always be switched off. Circulation can be restored at the model domain boundary.

Split casings, lifted covers and section edges are explanatory drawing operations, not a disassembly procedure. The camera uses the selected mesh or instance transform. The first equipment view reuses the plant's actual geometry. Deeper detail is revealed at that location, with the parent fading to outlines. Relative dimensions remain schematic; this is not nested CAD with engineering dimensions.

Internal routes are prescribed curves, not CFD results. Primary, feed and cooling transport uses the corresponding model flow fraction; steam transport uses admitted steam mass. Heat arrows use core heat, signed exchanger transfer or heat rejection. Transfer arrows reverse if the secondary becomes hotter than the primary. Electricity loops indicate electrical power, not electrons or a computed magnetic field. There is no independent animation clock. Pause, zero source rates and reduced motion stop particle travel. Rotor motion is slowed for readability.

With Cutaway enabled, routes are drawn through occluding surfaces for legibility. The route positions still distinguish fluid inside a tube from fluid outside. Rod cooling water stays outside the cladding. Pellet and microscopic fuel views show heat-transfer direction only. Primary particle colours indicate the direction of heating or cooling, not a resolved local temperature field. The optional information drawer shows explicitly labelled mean temperatures or shaft speed. Pressure is imposed; local pressurizer circulation, spray and heater dynamics receive no invented animated flow.

The optional sound is synthesized from pump activity and shaft speed. It is an interaction cue, not an acoustic simulation or a recording of plant equipment.
