/**
 * A Star's two draws, as GLSL (7.7, 9.4, 9.5). Strings only, so a test reads them as written.
 *
 * **The core's vertex stage is the Planet fill's own,** the 7.1 mechanism, so a Star's
 * disc holds by the same measured bias. The fragment is procedural and emissive: no map
 * and no light (AD-20 as amended).
 *
 * - **The centre** is the band's range across `uPulse` at rest (`uLow` to `uHigh`), and
 *   `stroke-focus` dimmed by up to `SUBJECT_DIP` as the subject, mixed by the rise. The
 *   pulse only dims the subject, so its peak is the ceiling in linear terms at the
 *   analytic centre; on screen it approaches `stroke-focus` and never passes it, since the
 *   near-ceiling floor lowers it by up to one 8-bit step.
 * - **The limb** darkens from the centre to the edge by the linear law on `mu`, the
 *   cosine of the view angle on the sphere: its factor is 1 at the centre, `LIMB` at the edge.
 * - **Granulation** only dims, by up to `GRAIN_DEPTH` weighted by radius, and drifts with
 *   the shared `uTime`. The limb's and the granulation's darkening is 0 at the centre alone
 *   (their factor is 1 there), so only the subject's centre reaches `stroke-focus`, in
 *   linear terms; the near-ceiling floor keeps the output at or one 8-bit step under it.
 * - **The hue** is the Star's own tint at rest (9.5), divided by its luminance so the tint
 *   is hue alone, and goes toward white as the subject rises, at the same luminance:
 *   only the subject's core turns white (Proposal 7, "the subject is the one that turns
 *   white"), which resolves 9.4's provisional note. Each channel is then clamped to 1,
 *   which only lowers luminance, so a saturated tint cannot clip past 1 and the ceilings
 *   hold. No channel clamps at rest or on the risen subject, so the tint is exactly hue
 *   there; only mid-rise (at most `RISE_SECONDS`) can one clamp, lowering the centre by at
 *   most 0.24% (`WORST_CLAMP_LOSS`, pinned by test), a transient.
 * - **The alpha** falls toward 0 over the outer `EDGE` of the radius, so the core melts into
 *   the additive glow beneath it (8.4's "dark ring"). No fragment under `ALPHA_FLOOR` (0.5)
 *   draws or writes depth: it is discarded, so a faint rim cannot cut later draws out.
 * - **The ceilings** follow the rise, as before: a saturated pixel stays under
 *   `stroke-active` at rest and under `stroke-focus` as the subject, and a pixel near the
 *   ceiling is floored to its 8-bit step, because rounding read one back above it (7.6).
 *
 * **The glow is the same sphere flattened, with no bias.** The disc's size comes from
 * the mesh's scale, so three culls it by what it covers. The falloff reaches 0 with no
 * slope at its edge, and no shape is cut out. Its colour is the Star's tint divided by its
 * own luminance (9.5), so `uPeak` is the glow's absolute linear luminance at its centre,
 * whatever the tint: the band's at rest mixing toward `GLOW_SUBJECT_PEAK` with the rise,
 * written by the layer. A glow keeps its tint as the subject; only the core goes white.
 * Each channel is clamped to 1, which only lowers luminance. Additive
 * blending happens on encoded values in the framebuffer, and a shader cannot read the
 * destination, so a test bounds only this draw's own peak: what overlapping glows and
 * Dust add up to is on real pixels.
 *
 * **The fade (7.8)** is the layer's one shared `uFade`: a factor on a core's alpha, and a
 * factor on the glow's colour, so at 0 a core blends to the destination unchanged and a
 * glow adds 0.
 *
 * Nothing is tone-mapped. `<colorspace_fragment>` is the output's sRGB.
 */

import { FILL_CEILING_LUMINANCE, FILL_NEAR_CEILING } from './fill-model.ts';
import { FILL_VERTEX_SHADER } from './fill-shader.ts';
import {
  STAR_CORE_ALPHA_FLOOR,
  STAR_CORE_EDGE,
  STAR_CORE_LIMB,
  STAR_GRAIN_DEPTH,
  STAR_GRAIN_DRIFT,
  STAR_GRAIN_SCALE,
  STAR_SUBJECT_CEILING_LUMINANCE,
  STAR_SUBJECT_DIP,
} from './star-model.ts';
import { glslFloat } from './glsl.ts';

export const STAR_FILL_VERTEX_SHADER = FILL_VERTEX_SHADER;

export const STAR_FILL_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uRise;
  uniform float uFade;
  uniform float uLow;
  uniform float uHigh;
  uniform float uPulse;
  uniform float uTime;
  varying vec2 vDisc;
  const float SUBJECT_DIP = ${glslFloat(STAR_SUBJECT_DIP)};
  const float LIMB = ${glslFloat(STAR_CORE_LIMB)};
  const float GRAIN_DEPTH = ${glslFloat(STAR_GRAIN_DEPTH)};
  const float GRAIN_SCALE = ${glslFloat(STAR_GRAIN_SCALE)};
  const float GRAIN_DRIFT = ${glslFloat(STAR_GRAIN_DRIFT)};
  const float EDGE = ${glslFloat(STAR_CORE_EDGE)};
  const float ALPHA_FLOOR = ${glslFloat(STAR_CORE_ALPHA_FLOOR)};
  const float REST_CEILING = ${glslFloat(FILL_CEILING_LUMINANCE)};
  const float SUBJECT_CEILING = ${glslFloat(STAR_SUBJECT_CEILING_LUMINANCE)};
  const float NEAR_CEILING = ${glslFloat(FILL_NEAR_CEILING)};
  const vec3 WEIGHTS = vec3(0.2126, 0.7152, 0.0722);
  void main() {
    float r = min(length(vDisc), 1.0);
    float edge = smoothstep(0.0, EDGE, 1.0 - r);
    if (edge < ALPHA_FLOOR) discard;
    float mu = sqrt(max(1.0 - r * r, 0.0));
    float centre = mix(mix(uLow, uHigh, uPulse), SUBJECT_CEILING * (1.0 - SUBJECT_DIP * (1.0 - uPulse)), uRise);
    float limb = 1.0 - (1.0 - LIMB) * (1.0 - mu);
    vec2 p = vDisc * GRAIN_SCALE;
    float t = uTime * GRAIN_DRIFT;
    float cells = clamp(0.5 + 0.25 * (sin(p.x + t) * sin(p.y - 0.7 * t) + sin(0.6 * (p.x + p.y) - 1.3 * t)), 0.0, 1.0);
    float grain = 1.0 - GRAIN_DEPTH * r * cells;
    float target = centre * limb * grain;
    vec3 hue = mix(uColor / max(dot(uColor, WEIGHTS), 1e-6), vec3(1.0), uRise);
    vec3 lit = min(hue * target, vec3(1.0));
    float y = dot(lit, WEIGHTS);
    float limit = mix(REST_CEILING, SUBJECT_CEILING, uRise);
    gl_FragColor = vec4(y > limit ? lit * (limit / y) : lit, edge * uFade);
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
  uniform float uPeak;
  uniform float uFade;
  varying vec2 vDisc;
  const vec3 WEIGHTS = vec3(0.2126, 0.7152, 0.0722);
  void main() {
    float edge = max(1.0 - dot(vDisc, vDisc), 0.0);
    float falloff = edge * edge;
    vec3 glow = uColor / max(dot(uColor, WEIGHTS), 1e-6) * uPeak * falloff * uFade;
    gl_FragColor = vec4(min(glow, vec3(1.0)), 1.0);
    #include <colorspace_fragment>
  }
`;
