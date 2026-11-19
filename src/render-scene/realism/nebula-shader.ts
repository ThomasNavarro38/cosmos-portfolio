/**
 * The Rail's nebula ribbon, as GLSL (9.7). Strings only, so a test reads them as written.
 *
 * - **The vertex stage** turns the ribbon's width toward the camera: in view space, the
 *   side is `cross(tangent, toCamera)`, normalised, falling back to `cross(tangent, viewUp)`
 *   and then to view `+x` where it is degenerate (`ribbonSide` in `nebula-model.ts`), so it
 *   is never NaN, even with the camera riding along the Rail. Each vertex moves
 *   `across × HALF_WIDTH` along it.
 * - **The colour** is `realism-nebula`'s, divided by its own linear luminance so it is hue
 *   alone (guarded at 1e-6, though `nebulaColor` refuses a token with none), times the peak,
 *   each channel clamped to 1: the same line as `nebulaColor`.
 * - **The alpha** is the profile across, `(1 - t²)²`, times the ends' `smoothstep` over
 *   `END_UNITS`, times the density `smoothstep(DENSITY_LOW, DENSITY_HIGH, fbm)`, times the
 *   layer's one `uFade`: continuous, with no threshold and no discard, so there are no specks.
 * - **The fbm** is periodic in x: each octave's hash wraps the cell's x modulo its period,
 *   the octaves double the frequency and the period, and shift on y only. `uDrift`, in noise
 *   cells, wraps modulo `NOISE_PERIOD` (`nextNebulaDrift`), so the wrap lands on the same field.
 *   The hash is sine-free (Dave Hoskins' `hash12`): it takes the cell's wrapped x and its y
 *   through `fract(p × 0.1031)` first, so every later intermediate is bounded whatever the
 *   cell index, octave or drift (below about 2.2e4, inside mediump's 65,504), where a sine
 *   hash would see arguments near 1e5 at the fourth octave.
 * - **The output is additive**, as the glow's is: `vec4(colour × alpha, 1.0)`, then
 *   `<colorspace_fragment>`. Nothing is tone-mapped.
 */

import { NEBULA_DENSITY_HIGH, NEBULA_DENSITY_LOW, NEBULA_END_UNITS, NEBULA_HALF_WIDTH, NEBULA_NOISE_PERIOD, NEBULA_NOISE_SCALE, NEBULA_OCTAVES, NEBULA_PEAK_LUMINANCE } from './nebula-model.ts';
import { glslFloat } from './star-shader.ts';

export const NEBULA_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aTangent;
  attribute vec2 aRibbon;
  varying vec2 vRibbon;
  const float HALF_WIDTH = ${glslFloat(NEBULA_HALF_WIDTH)};
  vec3 ribbonSide(vec3 t, vec3 toCamera) {
    vec3 side = cross(t, toCamera);
    if (dot(side, side) <= 1e-6 * dot(t, t) * dot(toCamera, toCamera)) {
      side = cross(t, vec3(0.0, 1.0, 0.0));
      if (dot(side, side) <= 1e-6 * dot(t, t)) side = vec3(1.0, 0.0, 0.0);
    }
    return normalize(side);
  }
  void main() {
    vRibbon = aRibbon;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vec3 t = (modelViewMatrix * vec4(aTangent, 0.0)).xyz;
    view.xyz += ribbonSide(t, -view.xyz) * aRibbon.y * HALF_WIDTH;
    gl_Position = projectionMatrix * view;
  }
`;

export const NEBULA_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFade;
  uniform float uDrift;
  uniform float uLength;
  varying vec2 vRibbon;
  const float PEAK = ${glslFloat(NEBULA_PEAK_LUMINANCE)};
  const float HALF_WIDTH = ${glslFloat(NEBULA_HALF_WIDTH)};
  const float END_UNITS = ${glslFloat(NEBULA_END_UNITS)};
  const float DENSITY_LOW = ${glslFloat(NEBULA_DENSITY_LOW)};
  const float DENSITY_HIGH = ${glslFloat(NEBULA_DENSITY_HIGH)};
  const float NOISE_SCALE = ${glslFloat(NEBULA_NOISE_SCALE)};
  const float NOISE_PERIOD = ${glslFloat(NEBULA_NOISE_PERIOD)};
  const int OCTAVES = ${NEBULA_OCTAVES};
  const vec3 WEIGHTS = vec3(0.2126, 0.7152, 0.0722);
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float noise(vec2 p, float period) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mod(i.x, period);
    float b = mod(i.x + 1.0, period);
    return mix(mix(hash(vec2(a, i.y)), hash(vec2(b, i.y)), f.x), mix(hash(vec2(a, i.y + 1.0)), hash(vec2(b, i.y + 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float period = NOISE_PERIOD;
    for (int octave = 0; octave < OCTAVES; octave++) {
      value += amplitude * noise(p, period);
      p = vec2(p.x * 2.0, p.y * 2.0 + 17.0);
      period *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  void main() {
    float t = clamp(vRibbon.y, -1.0, 1.0);
    float profile = (1.0 - t * t) * (1.0 - t * t);
    float ends = smoothstep(0.0, END_UNITS, vRibbon.x) * smoothstep(0.0, END_UNITS, uLength - vRibbon.x);
    vec2 p = vec2(vRibbon.x * NOISE_SCALE + uDrift, t * HALF_WIDTH * NOISE_SCALE);
    float density = smoothstep(DENSITY_LOW, DENSITY_HIGH, fbm(p));
    vec3 colour = min(uColor / max(dot(uColor, WEIGHTS), 1e-6) * PEAK, vec3(1.0));
    float cover = profile * ends * density * uFade;
    gl_FragColor = vec4(colour * cover, 1.0);
    #include <colorspace_fragment>
  }
`;
