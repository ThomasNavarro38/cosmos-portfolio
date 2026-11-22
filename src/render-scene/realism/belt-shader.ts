/**
 * The debris belts, as GLSL (9.6). Strings only, so a test reads them as written.
 *
 * - **The vertex stage** places the strip as built: the belts are flat annuli in their
 *   orbits' planes, so nothing faces the camera and nothing moves.
 * - **The colour** is `realism-belt`'s, divided by its own linear luminance so it is hue
 *   alone (guarded at 1e-6, though `beltColor` refuses a token with none), then times the
 *   vertex's band luminance, each channel clamped to 1: the same line as `beltColor` in
 *   `belt-model.ts`.
 * - **The alpha** is the profile across the band, `(1 - t²)²`, times the density, times
 *   the layer's one `uFade`. The density is `mix(DENSITY_FLOOR, 1, n)` for a static value
 *   noise `n` in `[0, 1]`: continuous, with no threshold and no discard, so there are no
 *   specks. Its cells along the orbit wrap modulo a whole count, so the belt is seamless
 *   where the orbit closes. There is no time uniform: the belt never moves.
 * - **The junction** multiplies the alpha by `junction(vView, vCentre)`, `beltJunction` in
 *   `belt-model.ts` line for line, in view space: the fragment and its Planet's centre
 *   (`aPlanet`) both go through `modelViewMatrix`, which is affine, so both interpolate
 *   exactly. Over the fill disc's footprint it fades to 0 before the sphere or the disc's
 *   plane, whichever is nearer along the ray, so the fill's flat depth never cuts the belt
 *   in a line. The plane is nearer only with the camera inside the sphere.
 *
 * Nothing is tone-mapped. `<colorspace_fragment>` is the output's sRGB.
 */

import { BELT_DENSITY_FLOOR, BELT_JUNCTION_RADIUS, BELT_JUNCTION_SOFTNESS, BELT_NOISE_CELLS } from './belt-model.ts';
import { glslFloat } from './star-shader.ts';

export const BELT_VERTEX_SHADER = /* glsl */ `
  attribute vec2 aBelt;
  attribute float aLuminance;
  attribute vec3 aPlanet;
  varying vec2 vBelt;
  varying float vLuminance;
  varying vec3 vView, vCentre;
  void main() {
    vBelt = aBelt;
    vLuminance = aLuminance;
    vView = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vCentre = (modelViewMatrix * vec4(aPlanet, 1.0)).xyz;
    gl_Position = projectionMatrix * vec4(vView, 1.0);
  }
`;

export const BELT_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFade;
  varying vec2 vBelt;
  varying float vLuminance;
  varying vec3 vView, vCentre;
  const float DENSITY_FLOOR = ${glslFloat(BELT_DENSITY_FLOOR)};
  const float CELLS_ALONG = ${glslFloat(BELT_NOISE_CELLS.along)};
  const float CELLS_ACROSS = ${glslFloat(BELT_NOISE_CELLS.across)};
  const vec3 WEIGHTS = vec3(0.2126, 0.7152, 0.0722);
  const float R = ${glslFloat(BELT_JUNCTION_RADIUS)}, S = ${glslFloat(BELT_JUNCTION_SOFTNESS)};
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p, float period) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mod(i.x, period);
    float b = mod(i.x + 1.0, period);
    return mix(mix(hash(vec2(a, i.y)), hash(vec2(b, i.y)), f.x), mix(hash(vec2(a, i.y + 1.0)), hash(vec2(b, i.y + 1.0)), f.x), f.y);
  }
  float junction(vec3 v, vec3 c) {
    if (v.z >= 0.0 || c.z >= 0.0) return 1.0;
    vec2 q = v.xy * (c.z / v.z) - c.xy;
    if (dot(q, q) >= R * R) return 1.0;
    float l = length(v), g = (v.z - c.z) * l / -v.z;
    vec3 d = v / l, p = c - dot(c, d) * d;
    float k = dot(c, d), h = R * R - dot(p, p);
    if (h > 0.0 && k > sqrt(h)) g = min(g, k - sqrt(h) - l);
    return smoothstep(0.0, S, g);
  }
  void main() {
    float t = clamp(vBelt.y, -1.0, 1.0);
    float profile = (1.0 - t * t) * (1.0 - t * t);
    vec2 p = vec2(vBelt.x * CELLS_ALONG, (t * 0.5 + 0.5) * CELLS_ACROSS);
    float n = clamp(0.65 * noise(p, CELLS_ALONG) + 0.35 * noise(p * 2.0, 2.0 * CELLS_ALONG), 0.0, 1.0);
    float density = mix(DENSITY_FLOOR, 1.0, n);
    vec3 lit = min(uColor / max(dot(uColor, WEIGHTS), 1e-6) * vLuminance, vec3(1.0));
    gl_FragColor = vec4(lit, profile * density * uFade * junction(vView, vCentre));
    #include <colorspace_fragment>
  }
`;
