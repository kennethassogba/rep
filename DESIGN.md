---
name: REP
description: "A comic power station operated directly on a phone."
colors:
  paper: "#ffffff"
  ink: "#211c32"
  cobalt: "#294cff"
  water: "#19c3ef"
  heat: "#ff543c"
  yellow: "#ffd52f"
  pink: "#ff80bc"
  pressed: "#dce4ff"
  hover: "#edf0ff"
typography:
  power:
    fontFamily: "DM Sans Variable, sans-serif"
    fontSize: "2rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.03em"
  brand:
    fontFamily: "DM Sans Variable, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 950
    lineHeight: 1
    letterSpacing: "-0.03em"
  dialogue:
    fontFamily: "DM Sans Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.4
  value:
    fontFamily: "DM Sans Variable, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 750
  unit:
    fontFamily: "DM Sans Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
rounded:
  circle: "50%"
  value: "5px"
  meter: "6px"
  overview: "12px"
  dialogue: "15px 15px 15px 2px"
spacing:
  toolbar-gap: "8px"
  screen-inset: "12px"
components:
  utility-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
    width: "44px"
    height: "44px"
  utility-button-pressed:
    backgroundColor: "{colors.pressed}"
  utility-button-hover:
    backgroundColor: "{colors.hover}"
  overview-button:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.overview}"
    width: "44px"
    height: "44px"
  dialogue:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.dialogue}"
    rounded: "{rounded.dialogue}"
    padding: "9px 12px"
  control-value:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.value}"
    rounded: "{rounded.value}"
    padding: "4px 8px"
  power-meter:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.meter}"
    padding: "3px 9px"
---

# Design System: REP

## Overview

**Creative North Star: "The comic power machine"**

REP places an outlined, brightly colored machine on uninterrupted white. Giscard and de Gaulle appear as transparent cutouts inside the structure. Their reactions, equipment movement and short dialogue bubbles belong to the same scene.

The controls have physical forms that identify what can be manipulated. Interface text stays compact, with changing values beside the action and small utilities at the viewport edges.

**Key Characteristics:**

- Outlined machinery with matte pop colors.
- Physical handles aligned with native interaction targets.
- Character cutouts and temporary comic reactions.
- Continuous white behind the scene and interface.

## Colors

Saturated machine colors sit against white, with dark ink for text and outlines.

### Primary

- Cobalt colors structural parts, the electrical switch housing, keyboard focus and the output value once it reaches the target.
- Water cyan identifies the pump wheel and water path.
- Heat red identifies the heat lever and steam path.

### Secondary

- Yellow identifies the steam valve, electrical grip, wire, illuminated windows and reaction stamps.
- Pink appears on machine parts and in confetti.

### Neutral

- Paper is the shared scene, page and utility background.
- Ink is the text, equipment outline and unlit-window color.
- Pressed and hover are pale blue utility states.

**The Continuous White Rule.** Keep the scene and HTML on the same white background without a canvas frame.

## Typography

The locally bundled DM Sans Variable is used throughout, with sans-serif fallback. Heavy short labels accompany the illustrated machine. Dialogue uses a smaller, more open line height.

### Hierarchy

- Power is the largest HTML number, using tabular figures.
- Brand is the compact REP overview control.
- Dialogue is short character speech.
- Value is the percentage shown while dragging or focusing a handle, also using tabular figures.
- Unit is the fixed target beside the output number.

Canvas stamps use weight 900 and scale with the scene. They do not define a separate CSS display scale. At viewport heights of 500px or less, the power number becomes 1.5rem and dialogue becomes 0.75rem.

**The Temporary Value Rule.** Show a handle's percentage during direct manipulation or keyboard focus; keep its physical form visible at rest.

## Layout

The game fills one dynamic viewport and clips overflow. The current composition is a vertical tower with the palace above the turbine and boiler. The scene is the dominant workspace; the header carries REP, power and language, while the footer carries playback, overview, sound and restart.

Header and footer respect safe-area insets. The header starts at a minimum 12px from the top and sides; the footer uses a minimum 10px bottom inset and 12px side insets. Footer controls use an 8px gap. At heights of 500px or less, top and bottom insets become 5px.

Native hit regions follow projected handles. The normal width is 80px, or 72px for heat; height is 80px, or 100px for heat. These dimensions scale from 78% to 100% with viewport height. In landscape below 500px high and above a 1.4 aspect ratio, targets become 56px squares and handles move beside the machine with connector lines. Speech placement avoids the projected controls.

## Elevation & Depth

Outlined geometry, matte materials, transparent pipes and opening casings establish depth. Character cutouts face the camera. The interface has no card stack or ambient shadow system.

The existing speech bubble and overview button carry small ink offset shadows. These are recorded in the component previews as local implementation details, not promoted to a reusable elevation scale.

## Shapes

Water and steam use round wheels, heat uses a tall lever, and the electrical connection uses a rectangular switch housing with a yellow grip. Ink edges separate the colored parts. Native hit regions follow the round, tall or rectangular control shape.

Utility buttons are circular. The overview button has rounded square corners. Dialogue has three rounded corners and one tight corner to suggest a speech tail. Percentage values and the power meter use compact rounded rectangles.

## Components

### Utility buttons

White circular controls use inline stroke SVG icons or short text. Their targets are 44px square. Pressed states use pale blue; pointer hover uses the lighter blue. Keyboard focus is a 3px cobalt outline with 4px offset. With motion enabled, pressing a utility scales it to 0.96 over 0.15s.

### Machine handles

Transparent native buttons track the physical controls. Pointer hover adds a dashed ink outline. Dragging or keyboard focus reveals a percentage above the target. The grid control is binary; the other controls support intermediate values. Controls remain available in any order.

### Power meter

The current number and fixed /100 MW target share a white background and baseline. The current value turns cobalt at the target. Machine windows illuminate from the same output state.

### Dialogue and reactions

The outlined white dialogue bubble follows its speaker and has a maximum width of 212px, reduced to 190px on short viewports. Dialogue has no controls. Stamps, cutout poses, puffs and confetti report game events. Selecting a handle moves the camera to its equipment and opens the relevant casing; overview, empty space and Escape return to the whole machine.

### Motion and fallback

Reduced motion stops rotor animation, traveling flow, moving puffs, falling confetti and character movement while retaining static reaction states. Camera and casing changes become immediate. Forced colors preserves visible native controls and removes the speech shadow. Without WebGL, the native handles remain visible with inline SVG symbols and percentage values.

## Do's and Don'ts

### Do:

- Do preserve the continuous white background and outlined machine materials.
- Do keep each control's physical shape and color association.
- Do retain visible keyboard focus, named native controls and safe-area spacing.
- Do use the existing character cutouts inside the machine.
- Do keep numeric output and visible machine reactions tied to the same state.

### Don't:

- Don't introduce green or lime.
- Don't add taglines, permanent helper labels or an equipment encyclopedia.
- Don't replace direct manipulation with a separate dashboard.
- Don't obscure controls with dialogue or decorative overlays.
