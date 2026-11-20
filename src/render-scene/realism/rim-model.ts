/**
 * A Planet's atmosphere rim, as numbers (9.9, FR-3, AD-19 and AD-20 as amended): which
 * step of the stroke ladder its limb carries this frame, how bright that step is, and how
 * the fill shader adds it. Pure, so every rule here runs under `node --test`. It reads no
 * token: the luminances are the constants the belt, fill and Star models already restate.
 *
 * **The rim is the outline's replacement, so it carries every state the outline did.** Its
 * step mirrors `bodyStroke(body, subject, approached).step` for a Planet: `stroke-focus` on
 * the subject, else `stroke-active` on the approached Planet (3.4), else its own band.
 *
 * **Additive and achromatic.** `lit += vec3(uRim) * w`, with `w` a `smoothstep` over the
 * outer `max(RIM_WIDTH, RIM_MIN_PX × fwidth(r))` of the disc's radius, so at the limb the
 * added term is exactly the step's luminance and the rim's support is never under
 * `RIM_MIN_PX` on screen (its weight is 0.5 at half that support). The ceiling becomes `max(CEILING, uRim × w)`, so only the subject's rim (not its
 * surface inside the rim) may pass `stroke-active`, never `stroke-focus`. Ladder order is
 * strict below the clamp; on a limb bright enough to reach it, adjacent steps tie there. `RIM_WIDTH` and `RIM_MIN_PX` are starting values
 * for 9.11.
 */

import { BELT_BAND_LUMINANCE, type BeltBand } from './belt-model.ts';
import { FILL_CEILING_LUMINANCE } from './fill-model.ts';
import { STAR_SUBJECT_CEILING_LUMINANCE } from './star-model.ts';

/** The rim's width, as a share of the disc's radius. */
export const RIM_WIDTH = 0.08;

/** The least the rim is on screen, in pixels, at any size. */
export const RIM_MIN_PX = 1.5;

/** The step a rim carries: a resting band, the approach's or the subject's. */
export type RimStep = BeltBand | 'stroke-active' | 'stroke-focus';

/** Each step's `-dark` token's linear luminance: the restated constants, pinned against the tokens by test. */
export const RIM_STEP_LUMINANCE: Readonly<Record<RimStep, number>> = {
  'stroke-rest': BELT_BAND_LUMINANCE['stroke-rest'],
  'stroke-near': BELT_BAND_LUMINANCE['stroke-near'],
  'stroke-active': FILL_CEILING_LUMINANCE,
  'stroke-focus': STAR_SUBJECT_CEILING_LUMINANCE,
};

/** A Planet's rim step this frame: the subject's, else the approach's, else its own band. */
export function rimStep(id: string, band: BeltBand, subject: string | null, approached: string | null): RimStep {
  if (id === subject) return 'stroke-focus';
  if (id === approached) return 'stroke-active';
  return band;
}

/** GLSL's `smoothstep`, for `edge0 < edge1`. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/** The shader's rim weight at disc radius `r`, with `fwidth` the screen derivative of `r`. */
export function rimWeight(r: number, fwidth: number): number {
  return smoothstep(1 - Math.max(RIM_WIDTH, RIM_MIN_PX * fwidth), 1, r);
}

/** A fill pixel's luminance with its rim added and the ceiling `max(CEILING, rim × w)` held, as the shader computes it. */
export function rimmedLuminance(base: number, rim: number, r: number, fwidth: number): number {
  const w = rimWeight(r, fwidth);
  return Math.min(base + rim * w, Math.max(FILL_CEILING_LUMINANCE, rim * w));
}
