import { MeshToonMaterial, type MeshToonMaterialParameters } from 'three';

/** Screen-space engraving only on faces turned away from the key light.
 * Stable, static strokes: no animated noise or postprocessing pass.
 */
export function inkMaterial(parameters: MeshToonMaterialParameters) {
  const material = new MeshToonMaterial(parameters);
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      #include <opaque_fragment>
      float facing = dot(normalize(normal), normalize(vec3(-0.6, 0.8, 0.5)));
      float stroke = 1.0 - smoothstep(0.45, 1.05, abs(mod(gl_FragCoord.x + gl_FragCoord.y * 0.6, 7.0) - 3.5));
      float engraved = stroke * (1.0 - smoothstep(-0.3, 0.45, facing)) * 0.22;
      gl_FragColor.rgb *= 1.0 - engraved;
    `,
    );
  };
  material.customProgramCacheKey = () => 'rep-ink-v1';
  return material;
}
