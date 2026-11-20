/**
 * A Deep Planet's ring disc and moon sphere, as GLSL (9.8). Strings only, so a test reads
 * them as written.
 *
 * **The disc.**
 *
 * - **The vertex stage** places the annulus as built, in its mesh's plane: the layer turns
 *   the mesh to the camera's facing times the tilt each frame. It hands the fragment the
 *   vertex's own disc coordinate, so the radius is exact per fragment, not interpolated
 *   across a chord.
 * - **The colour** is grey, `vec3(RING_DISC_LUMINANCE)` (`stroke-near-dark`'s linear
 *   luminance), so its channels are equal by construction.
 * - **The alpha** is `edge × bands × RING_DISC_OPACITY × uFade`: `edge` a `smoothstep` at
 *   both radial edges, `bands` `mix(BAND_FLOOR, 1, n)` for a static radial value noise `n`
 *   over a sine-free hash (Dave Hoskins' `hash12`, as the nebula's). Continuous: no
 *   threshold and no discard, so there are no specks. There is no time uniform.
 *
 * **The moon** is drawn on `FILL_VERTEX_SHADER`, flattened in the marks' plane as a fill is,
 * with its own fragment stage: the exact sphere normal from the disc coordinate, taken to
 * world space by `vWorld` (its scale is uniform, so `normalize` removes it), lit by its
 * Planet's one `uLight`: `y = ALBEDO × max(N·L, 0) + FLOOR`, output `vec4(vec3(y), uFade)`,
 * so it is achromatic by construction and at most `ALBEDO + FLOOR`, far under the ceiling.
 *
 * Nothing is tone-mapped. `<colorspace_fragment>` is the output's sRGB.
 */

import {
  MOON_ALBEDO_LUMINANCE,
  MOON_FLOOR_LUMINANCE,
  RING_DISC_BAND_CELLS,
  RING_DISC_BAND_FLOOR,
  RING_DISC_EDGE,
  RING_DISC_INNER,
  RING_DISC_LUMINANCE,
  RING_DISC_OPACITY,
  RING_DISC_OUTER,
} from './ring-model.ts';
import { glslFloat } from './star-shader.ts';

export const RING_DISC_VERTEX_SHADER = /* glsl */ `
  varying vec2 vDisc;
  void main() {
    vDisc = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const RING_DISC_FRAGMENT_SHADER = /* glsl */ `
  uniform float uFade;
  varying vec2 vDisc;
  const float INNER = ${glslFloat(RING_DISC_INNER)};
  const float OUTER = ${glslFloat(RING_DISC_OUTER)};
  const float LUMINANCE = ${glslFloat(RING_DISC_LUMINANCE)};
  const float OPACITY = ${glslFloat(RING_DISC_OPACITY)};
  const float BAND_FLOOR = ${glslFloat(RING_DISC_BAND_FLOOR)};
  const float BAND_CELLS = ${glslFloat(RING_DISC_BAND_CELLS)};
  const float EDGE = ${glslFloat(RING_DISC_EDGE)};
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(vec2(i, 0.0)), hash(vec2(i + 1.0, 0.0)), f);
  }
  void main() {
    float r = clamp((length(vDisc) - INNER) / (OUTER - INNER), 0.0, 1.0);
    float edge = smoothstep(0.0, EDGE, r) * smoothstep(0.0, EDGE, 1.0 - r);
    float bands = mix(BAND_FLOOR, 1.0, noise(r * BAND_CELLS));
    gl_FragColor = vec4(vec3(LUMINANCE), edge * bands * OPACITY * uFade);
    #include <colorspace_fragment>
  }
`;

export const MOON_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uLight;
  uniform float uFade;
  varying vec2 vDisc;
  varying mat3 vWorld;
  const float ALBEDO = ${glslFloat(MOON_ALBEDO_LUMINANCE)};
  const float FLOOR = ${glslFloat(MOON_FLOOR_LUMINANCE)};
  void main() {
    vec3 n = vec3(vDisc, sqrt(max(1.0 - dot(vDisc, vDisc), 0.0)));
    vec3 N = normalize(vWorld * n);
    float y = ALBEDO * max(dot(N, uLight), 0.0) + FLOOR;
    gl_FragColor = vec4(vec3(y), uFade);
    #include <colorspace_fragment>
  }
`;
