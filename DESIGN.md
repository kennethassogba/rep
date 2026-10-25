# REP design

The selected visual target is the first concept board: one blue cabinet with a yellow top and side, a red core porthole, a transverse turbine window, external clear water pipes and a lower yellow service hatch. A small wired Élysée sits on top. The machine is continuous, not a stack of equipment models.

White is shared by the page and Three.js canvas. Palette: ink #211c32, cobalt #294cff, red #ff543c, yellow #ffd52f and cyan #19c3ef. DM Sans is bundled locally. Toon-shaded procedural geometry and explicit dark edges carry the machine.

The header shows REP, five mission positions and language. The current objective is above the machine. One yellow action opens the task. Presidents occupy opposite lower margins; one persistent dialogue bubble identifies the active speaker. Task actions stay inside the task, never in dialogue. Completed tasks return to the machine with the president's response and the next mission action.

Task surfaces use the same ink borders and physical colors. The water puzzle rotates four pipe bends. Reactor rods use three sliders with visible target lines. Concorde uses moving thrust alignment. Sniffer aircraft scan three sites. Grid connection uses a timed switch. Native controls provide keyboard and touch operation. No external runtime dependencies were added.

All views fit 320 x 568 and larger portrait viewports. Short landscape uses the left side for the task and the right side for dialogue. Safe-area insets protect top and bottom utilities. Pause disables task inputs and freezes task time. Reduced motion stops decorative aircraft, turbine and fluid motion; timing required by the actual games remains visible.
