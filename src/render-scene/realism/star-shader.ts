/**
 * A Star's two draws, as GLSL (7.7). Strings only, so a test reads them as written.
 *
 * **The fill's vertex stage is the Planet fill's own,** the 7.1 mechanism, so a Star's
 * disc holds by the same measured bias. The fragment is procedural: no map and no
 * light, the token's colour taken to a target luminance, darker toward the edge.
 * Both the target and the ceiling follow the rise, so a saturated pixel stays under
 * `stroke-active` at rest and under `stroke-focus` as the subject. A pixel near the
 * ceiling is floored to its 8-bit step, because rounding read one back above it (7.6).
 *
 * **The glow is the same sphere flattened, with no bias.** The disc's size comes from
 * the mesh's scale, so three culls it by what it covers. The falloff reaches 0 with no
 * slope at its edge, and no shape is cut out. Additive blending happens on encoded
 * values in the framebuffer, and a shader cannot read the destination, so a test bounds
 * only this draw's own peak: what overlapping glows and Dust add up to is on real pixels.
 *
 * **The fade (7.8)** is the layer's one shared `uFade`: a fill's alpha, and a factor on the
 * glow's colour, so at 0 a fill blends to the destination unchanged and a glow adds 0.
 *
 * Nothing is tone-mapped. `<colorspace_fragment>` is the output's sRGB.
 */

import { FILL_CEILING_LUMINANCE, FILL_NEAR_CEILING } from './fill-model.ts';
import { FILL_VERTEX_SHADER } from './fill-shader.ts';
import { GLOW_REST_PEAK, GLOW_SUBJECT_PEAK, STAR_FILL_LIMB, STAR_FILL_REST_LUMINANCE, STAR_FILL_SUBJECT_LUMINANCE, STAR_SUBJECT_CEILING_LUMINANCE } from './star-model.ts';

/**
 * A number as a GLSL float literal, so a tuning value of 1 does not write `const float X = 1;`,
 * which GLSL ES refuses.
 *
 * @throws on a value that is not finite, which has no literal.
 */
export function glslFloat(value: number): string {
  if (!Number.isFinite(value)) throw new Error(`${value} has no GLSL literal`);
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

export const STAR_FILL_VERTEX_SHADER = FILL_VERTEX_SHADER;

export const STAR_FILL_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uRise;
  uniform float uFade;
  varying vec2 vDisc;
  const float REST_TARGET = ${glslFloat(STAR_FILL_REST_LUMINANCE)};
  const float SUBJECT_TARGET = ${glslFloat(STAR_FILL_SUBJECT_LUMINANCE)};
  const float LIMB = ${glslFloat(STAR_FILL_LIMB)};
  const float REST_CEILING = ${glslFloat(FILL_CEILING_LUMINANCE)};
  const float SUBJECT_CEILING = ${glslFloat(STAR_SUBJECT_CEILING_LUMINANCE)};
  const float NEAR_CEILING = ${glslFloat(FILL_NEAR_CEILING)};
  const vec3 WEIGHTS = vec3(0.2126, 0.7152, 0.0722);
  void main() {
    float centre = sqrt(max(1.0 - dot(vDisc, vDisc), 0.0));
    float target = mix(REST_TARGET, SUBJECT_TARGET, uRise) * mix(LIMB, 1.0, centre);
    vec3 lit = uColor * (target / dot(uColor, WEIGHTS));
    float y = dot(lit, WEIGHTS);
    float limit = mix(REST_CEILING, SUBJECT_CEILING, uRise);
    gl_FragColor = vec4(y > limit ? lit * (limit / y) : lit, uFade);
    #include <colorspace_fragment>
    if (y > limit * NEAR_CEILING) gl_FragColor.rgb = floor(gl_FragColor.rgb * 255.0) / 255.0;
  }
`;

export const GLOW_VERTEX_SHADER = /* glsl */ `
  varying vec2 vDisc;
  void main() {
    vDisc = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, 0, 1);
  }
`;

export const GLOW_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uRise;
  uniform float uFade;
  varying vec2 vDisc;
  const float REST_PEAK = ${glslFloat(GLOW_REST_PEAK)};
  const float SUBJECT_PEAK = ${glslFloat(GLOW_SUBJECT_PEAK)};
  void main() {
    float edge = max(1.0 - dot(vDisc, vDisc), 0.0);
    float falloff = edge * edge;
    gl_FragColor = vec4(uColor * mix(REST_PEAK, SUBJECT_PEAK, uRise) * falloff * uFade, 1.0);
    #include <colorspace_fragment>
  }
`;
