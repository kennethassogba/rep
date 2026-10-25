# Illustrated assets

Created with the built-in Imagegen tool on 25 October 2026 from the user-selected first concept board. Runtime files are WebP encodings preserving the generated alpha channel. Source PNGs remain in the generation output directory. No image API or runtime generation is used by the game.

## Machine

Runtime: `public/art/machine.webp`, 1024 x 1536.
Source: `exec-60d484e5-b710-4b52-8c88-6c337bc53797.png`.

Prompt:

```text
Create a production game asset, not a mockup. Use attached first left machine as the exact visual design reference. Draw ONE beautiful detailed vertical blue and yellow power appliance with the beautifully recognizable ELYSEE PALACE on its roof. Genuine transparent background. No UI, no text, no people, no speech balloons, no labels, no white rectangle, no ground plane or cast shadow outside silhouette. Full object visible, centered, minimal margins, portrait canvas about 1024x1536. This is a layered 2D mobile game asset for a dark midnight background.
Closely follow attached reference hand-inked French bande-dessinee isometric technical illustration, fine ink bolts, rich flat cobalt blue enamel faces, sunflower yellow curved roof and right casing, vermilion core ring, silver grilles, transparent cyan external pipe hugging left edge, three red turbine rotors inside one upper horizontal oval window, central circular window with detailed gold reactor cylinder, lower service hatch with clear pipe elbows. Dark ink outlines, subtle drawn hatching and flat dimensional shading. Rich craftsmanship and detailed hardware, not simplified low-poly geometry, not photorealistic glossy rendering, not painterly blur. No green.
The palace is critical: accurate elegant symmetrical Parisian Elysee courtyard facade, cream limestone, MANY slender windows, central pediment, engraved cornices, dark slate mansard roofs with dormers, chimneys and central tiny French flag. The palace is physically sitting on the machine's roof, compact but visibly detailed, a single full recognizable building with side wings. Palace windows dark amber rather than glowing white. Three-quarter camera very close to reference left machine. All machine and palace parts coherent in the same perspective. Bright saturated colors legible over dark background. Transparent anti-aliased silhouette. Do not draw any presidents. The whole appliance and palace form one single asset.
```

Registered coordinates in `src/machine.ts` animate the turbine surfaces, pipe flow and palace/core brightness. These are visual game effects tied to mission completion.

## Presidents

Runtime: `public/art/presidents.webp`, 1536 x 1024. CSS displays one half for each character.
Sources: `exec-01dedfb8-4c54-44d7-ae76-2ad964771a39.png`, then `exec-2a8f84ad-8adb-444a-859f-99b31f252d34.png`.

Initial prompt:

```text
Create a transparent production portrait SPRITE SHEET with exactly TWO equally sized bust portraits side by side in equal halves. Landscape canvas 1536x1024. Left half Charles de Gaulle, right half Valery Giscard d'Estaing. These must closely match the two charming understated caricatures at the BOTTOM of the attached reference, not grotesque caricatures, not 3D, not photographs. Fine confident black hand ink, flat natural face colors, restrained subtle cel shadow, elegant French bande dessinee linework. De Gaulle in dark navy general's jacket, white shirt black tie, authentic dark kepi with gold oak embroidery and gold braid, tall face and recognizable long nose, looks to his right toward center. Giscard in dark navy suit, white shirt and tie, bald receding hairline with gray side hair, thin long face, relaxed smile, looks to his left toward center. Bust crop only from shoulders upward; no hands, no arms reaching, no objects, no chair, no text, no speech balloons. Keep each head entirely in its own half, equal visual scale and eye level, characters aligned at bottom and extending close to top with space above kepi. Left person centered at x25%, right person x75%, vertical separator at50% must be fully transparent. True transparent background across ALL space around silhouettes, no colored halo, no rectangular background. Strong opaque ink and colors remain legible on midnight navy. Exact likeness and tone of the reference presidents is important.
```

Final edit prompt:

```text
Edit this exact transparent two-person portrait sprite sheet. Change ONLY the clothing of the RIGHT person, Giscard: he wears an ordinary civilian dark navy BUSINESS SUIT with plain notch lapels, white shirt and plain dark tie. Remove ALL epaulettes, badges, gold pins and military details from the right person. Keep his face, pose, proportions, position, scale and ink style EXACTLY unchanged. Keep the entire LEFT Charles de Gaulle portrait, including kepi and military jacket, EXACTLY unchanged. Maintain identical 1536x1024 sheet layout and true transparency outside the silhouettes. Remove any colored halo around both silhouettes and across bottom margin, but preserve all actual portrait ink and colors. No text, no new objects.
```
