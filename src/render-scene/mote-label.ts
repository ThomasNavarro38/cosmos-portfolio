/**
 * The Motes' labels, as a pure model: where a label goes on screen, how big its
 * box is estimated to be, and which labels the one pass per frame shows.
 *
 * **Split out of `mote-model.ts`** (3.18) so the degradation rule lives in a
 * file of its own. `mote-model.ts` re-exports every name here, so a reader of the
 * Mote model sees one surface; this module never imports it back (no cycle).
 * The label's ink (`MOTE_LABEL_COLOR`) and resting style (`moteLabelStyle`) stay
 * there, where the contrast audit reads the colour.
 *
 * **Placement from NDC.** A label is placed from positions projected through the
 * camera matrices the frame hands in (`projectNdc`): on the dot's left when the
 * dot is left of the Planet on screen, on its right otherwise. While a Project is
 * focused, a right-hand label whose estimated width crosses the panel edge
 * `1 − 2w` is *blocked* — hidden, never truncated — and the Mote model re-slots
 * its Mote.
 *
 * **An estimate, never a measurement.** A label's box is `chars ×
 * MOTE_LABEL_CHAR_PX` wide and `MOTE_LABEL_HEIGHT_PX` tall, from the `mote-label`
 * typography token; the DOM is never read.
 *
 * **The pass** (`moteLabelPass`) decides, over every placed label, which are
 * shown this frame — the degradation rule, in one function, and Thomas's
 * 2026-10-14 ruling recorded on it (3.18): sticky priority with hysteresis, the
 * affordance wins, reduced motion accepted as it is, the cap at 12.
 *
 * **Pure.** It imports the tokens, the shell's panel width and the scene model's
 * types — no Three, no React, no store, no clock — so every rule here runs under
 * `node --test`.
 */

import { panelFraction } from '../shell/panel-model.ts';
import { tokens } from '../tokens/tokens.ts';
import type { ScenePosition } from './scene-model.ts';

// --- Tuning ------------------------------------------------------------------

/** The label's type: the `mote-label` typography token (DESIGN.md `mote.label`). */
export const MOTE_LABEL_TYPE = tokens.typography['mote-label'];

/** The label's font size, in CSS pixels, read off the token. */
export const MOTE_LABEL_FONT_PX = cssNumber(MOTE_LABEL_TYPE.fontSize, 'px');

/**
 * The estimated width of one label character, in CSS pixels: a sans advance of
 * 0.6em plus the token's letter-spacing (0.16em) — about 7.2px at 9.5px.
 * Tunable, and conservative on average: a sans face's mean advance is under
 * 0.6em, so for typical strings the estimate errs wide — but not for every
 * string (a run of wide capitals such as `MW` can exceed it).
 */
export const MOTE_LABEL_CHAR_PX = MOTE_LABEL_FONT_PX * (0.6 + cssNumber(MOTE_LABEL_TYPE.letterSpacing, 'em'));

/** The estimated height of a label's box, in CSS pixels: one line at the token's line-height. */
export const MOTE_LABEL_HEIGHT_PX = MOTE_LABEL_FONT_PX * MOTE_LABEL_TYPE.lineHeight;

/** The gap between a dot and its label, in CSS pixels. */
export const MOTE_LABEL_GAP_PX = 12;

/** The most labels shown at once (3.5's degradation rule; DESIGN.md D-G3). */
export const MOTE_LABEL_LIMIT = 12;

/** The least gap between two shown labels' boxes, in CSS pixels; also the gap a label keeps from the affordance. */
export const MOTE_LABEL_CLEARANCE_PX = 4;

/**
 * What a newcomer needs beyond `MOTE_LABEL_CLEARANCE_PX` to join the shown
 * labels, in CSS pixels (3.18, ruling 1a): a label shown last frame keeps its
 * place down to a gap of 0, so two labels drifting together do not trade places
 * frame by frame.
 */
export const MOTE_LABEL_HYSTERESIS_PX = 8;

/**
 * A token's numeric value in `unit`: `9.5px` → 9.5, `.16em` → 0.16, `-0.02em` →
 * −0.02, and a bare `0` (unitless, as CSS allows for zero) → 0. Throws on a token
 * in another unit: the estimate would silently be wrong.
 */
export function cssNumber(value: string, unit: 'px' | 'em'): number {
  if (/^[-+]?0*\.?0+$/.test(value.trim())) return 0;
  const match = new RegExp(String.raw`^([-+]?(?:\d+(?:\.\d*)?|\.\d+))` + unit + '$').exec(value.trim());
  const parsed = match === null ? Number.NaN : Number(match[1]);
  if (!Number.isFinite(parsed)) throw new Error(`the mote-label token ${JSON.stringify(value)} is not in ${unit}.`);
  return parsed;
}

/** A label's length for the width estimate: code points, so one astral character is one advance, not two. */
export function labelChars(skill: string): number {
  return [...skill].length;
}

// --- Projection and placement ----------------------------------------------------

/** A point in normalised device coordinates, and whether it is in front of the camera. */
export interface NdcPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly front: boolean;
}

/**
 * `point` projected to NDC through a view matrix and a projection matrix, each
 * given as 16 column-major elements — `camera.matrixWorldInverse.elements` and
 * `camera.projectionMatrix.elements`, exactly as `three` stores them. `front`
 * is whether the clip-space `w` is positive.
 */
export function projectNdc(point: ScenePosition, view: ArrayLike<number>, projection: ArrayLike<number>): NdcPoint {
  const v = (i: number): number => view[i] ?? Number.NaN;
  const p = (i: number): number => projection[i] ?? Number.NaN;
  const ex = v(0) * point.x + v(4) * point.y + v(8) * point.z + v(12);
  const ey = v(1) * point.x + v(5) * point.y + v(9) * point.z + v(13);
  const ez = v(2) * point.x + v(6) * point.y + v(10) * point.z + v(14);
  const ew = v(3) * point.x + v(7) * point.y + v(11) * point.z + v(15);
  const cx = p(0) * ex + p(4) * ey + p(8) * ez + p(12) * ew;
  const cy = p(1) * ex + p(5) * ey + p(9) * ez + p(13) * ew;
  const cz = p(2) * ex + p(6) * ey + p(10) * ez + p(14) * ew;
  const cw = p(3) * ex + p(7) * ey + p(11) * ez + p(15) * ew;
  return { x: cx / cw, y: cy / cw, z: cz / cw, front: cw > 0 };
}

/** Which side of its dot a label reads on. */
export type LabelSide = 'left' | 'right';

/** Where a label goes this frame, and whether it may be shown. */
export interface LabelPlacement {
  readonly side: LabelSide;
  /** A right-hand label crossing the panel edge while focused: hidden, and its Mote re-slotted. */
  readonly blocked: boolean;
  /** Shown: not blocked, on a canvas with width, in front of the camera. */
  readonly visible: boolean;
}

/**
 * A label's placement from NDC positions.
 *
 * **Side:** left of the dot when the dot is left of the Planet on screen, right
 * otherwise. **Blocked:** while a Project is focused, a right-hand label whose
 * estimated width — `chars × MOTE_LABEL_CHAR_PX` after a `MOTE_LABEL_GAP_PX`
 * gap, in a canvas `width` pixels wide — crosses the panel's edge at NDC
 * `1 − 2w`, `w = panelFraction(width)`. A blocked label is hidden, never
 * truncated. A canvas with no width, a non-finite position, or a dot behind the
 * camera hides the label without blocking it — there is nothing to re-slot for.
 */
export function labelPlacement(dot: NdcPoint, planet: NdcPoint, chars: number, width: number, focused: boolean): LabelPlacement {
  const side: LabelSide = dot.x < planet.x ? 'left' : 'right';
  const measurable =
    Number.isFinite(width) && width > 0 && dot.front && planet.front && Number.isFinite(dot.x) && Number.isFinite(planet.x);
  if (!measurable) return { side, blocked: false, visible: false };
  const edge = 1 - 2 * (focused ? panelFraction(width) : 0);
  const reach = dot.x + (2 * (MOTE_LABEL_GAP_PX + Math.max(chars, 0) * MOTE_LABEL_CHAR_PX)) / width;
  const blocked = focused && side === 'right' && reach > edge;
  return { side, blocked, visible: !blocked };
}

/** The CSS transform that anchors a label on `side` of its dot, vertically centred. */
export function labelTransform(side: LabelSide): string {
  return side === 'left'
    ? `translate(calc(-100% - ${MOTE_LABEL_GAP_PX}px), -50%)`
    : `translate(${MOTE_LABEL_GAP_PX}px, -50%)`;
}

// --- Boxes and the pass ------------------------------------------------------------

/** A label's estimated box on the canvas, in CSS pixels from its top-left corner. */
export interface LabelBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/**
 * Where a label's text sits on a `width` × `height` canvas: `MOTE_LABEL_GAP_PX`
 * to `side` of the dot, `chars × MOTE_LABEL_CHAR_PX` wide and
 * `MOTE_LABEL_HEIGHT_PX` tall, vertically centred on it — the box
 * `labelTransform` draws.
 */
export function labelBox(dot: NdcPoint, side: LabelSide, chars: number, width: number, height: number): LabelBox {
  const x = ((dot.x + 1) / 2) * width;
  const y = ((1 - dot.y) / 2) * height;
  const extent = Math.max(chars, 0) * MOTE_LABEL_CHAR_PX;
  const left = side === 'right' ? x + MOTE_LABEL_GAP_PX : x - MOTE_LABEL_GAP_PX - extent;
  const top = y - MOTE_LABEL_HEIGHT_PX / 2;
  return { left, right: left + extent, top, bottom: top + MOTE_LABEL_HEIGHT_PX };
}

/** One label the pass may show: its Skill, its rank, whether it is the focused Project's, and its box. */
export interface LabelCandidate {
  readonly skill: string;
  readonly rank: number;
  readonly focused: boolean;
  readonly box: LabelBox;
}

/** The region a shown label must lie in: the canvas, and left of `panelEdge` (the canvas width when nothing is focused). */
export interface LabelBounds {
  readonly width: number;
  readonly height: number;
  readonly panelEdge: number;
}

/** What the pass decides for one frame: the labels shown, and the incumbents held behind the affordance. */
export interface LabelLayout {
  /** Drawn this frame. */
  readonly shown: Set<string>;
  /**
   * Incumbents hidden this frame by an obstacle alone: they keep their place (their
   * box and their slot under the cap) and their incumbency, so they are incumbents
   * again next frame. Never drawn.
   */
  readonly held: Set<string>;
}

/**
 * Which labels are shown this frame — **the degradation rule, in one function**,
 * as Thomas ruled it on 2026-10-14 (3.18, closing `epic-3-retro-item-6`).
 *
 * **The order.** Candidates are visited the focused Project's first; within
 * that, the incumbents (`incumbents`, by Skill: last frame's shown labels and
 * held labels) before newcomers; ties by rank (most shared first). So the cap
 * never swaps an incumbent out for a better-ranked newcomer.
 *
 * **1a — sticky priority with hysteresis.** Between Mote labels an incumbent
 * stays while its box overlaps no box already placed (a gap of 0 is enough); a
 * newcomer needs `MOTE_LABEL_CLEARANCE_PX + MOTE_LABEL_HYSTERESIS_PX` (4 + 8).
 * The hysteresis is on the gap between labels only: the four canvas edges and
 * the panel edge hide a label the frame it crosses them, incumbent or not. What
 * this guarantees, with no timer and no fade: a shown label is hidden only by a
 * bound, a real overlap, the cap or the affordance, and a hidden label comes back
 * only once it is inside every bound and 12px clear of every placed label — which
 * can be the very next frame. The rule is a pure function of last frame's
 * incumbents and this frame's boxes.
 *
 * **2a — the affordance wins.** `obstacles` (the 3.4 affordance's label block,
 * grown by its keyboard outline when the keyboard reached it, and its leader's
 * bounding box — `affordanceObstacles`) are seeded as already shown. Any Mote
 * label within `MOTE_LABEL_CLEARANCE_PX` of one is hidden; the affordance is
 * never moved or hidden for a Mote. An obstacle with a non-finite side is
 * ignored: it would otherwise crowd every box. An incumbent hidden by an obstacle
 * alone — inside the bounds, under the cap, overlapping no placed label — is
 * *held*: it keeps its box and its place under the cap, so no other label takes
 * them, and it stays an incumbent. When the hover passes, the shown set is the
 * one before it, even under reduced motion, where nothing moves to restore it.
 *
 * **3a — reduced motion is accepted as it is.** While the orbit clock holds, a
 * label this pass hides stays hidden for the whole Focus (Epic 2 F-6); the
 * panel's Skills list carries every Skill, so nothing is lost.
 *
 * **4 — the cap stays at `MOTE_LABEL_LIMIT` (12)**, and it counts Mote labels
 * only (shown and held): an obstacle takes room, never a place.
 *
 * A label hidden here is hidden — not re-slotted, never truncated.
 */
export function moteLabelLayout(
  candidates: readonly LabelCandidate[],
  bounds: LabelBounds,
  incumbents: ReadonlySet<string> = new Set<string>(),
  obstacles: readonly LabelBox[] = [],
): LabelLayout {
  const solid = obstacles.filter((obstacle) => [obstacle.left, obstacle.right, obstacle.top, obstacle.bottom].every(Number.isFinite));
  const later = (candidate: LabelCandidate): number => (incumbents.has(candidate.skill) ? 0 : 1);
  const ordered = [...candidates].sort(
    (a, b) => Number(b.focused) - Number(a.focused) || later(a) - later(b) || a.rank - b.rank,
  );
  const placed: LabelBox[] = [];
  const shown = new Set<string>();
  const held = new Set<string>();
  for (const candidate of ordered) {
    if (placed.length >= MOTE_LABEL_LIMIT) break;
    const { box } = candidate;
    if (!labelInside(box, bounds)) continue;
    const incumbent = incumbents.has(candidate.skill);
    const gap = incumbent ? 0 : MOTE_LABEL_CLEARANCE_PX + MOTE_LABEL_HYSTERESIS_PX;
    if (placed.some((other) => labelsCrowd(box, other, gap))) continue;
    const covered = solid.some((obstacle) => labelsCrowd(box, obstacle, MOTE_LABEL_CLEARANCE_PX));
    if (covered && !incumbent) continue;
    placed.push(box);
    (covered ? held : shown).add(candidate.skill);
  }
  return { shown, held };
}

/** The labels shown this frame: `moteLabelLayout`'s `shown`. */
export function moteLabelPass(
  candidates: readonly LabelCandidate[],
  bounds: LabelBounds,
  incumbents: ReadonlySet<string> = new Set<string>(),
  obstacles: readonly LabelBox[] = [],
): Set<string> {
  return moteLabelLayout(candidates, bounds, incumbents, obstacles).shown;
}

/** Whether a label's box lies inside the canvas on all four edges and left of the panel edge, every side finite. */
export function labelInside(box: LabelBox, bounds: LabelBounds): boolean {
  return (
    [box.left, box.right, box.top, box.bottom].every(Number.isFinite) &&
    box.left >= 0 &&
    box.top >= 0 &&
    box.bottom <= bounds.height &&
    box.right <= bounds.width &&
    box.right <= bounds.panelEdge
  );
}

/**
 * Whether two boxes come closer than `gap` on both axes. At `gap` 0 that is a
 * real overlap: boxes that only touch do not crowd.
 */
export function labelsCrowd(a: LabelBox, b: LabelBox, gap: number): boolean {
  return !(a.left >= b.right + gap || b.left >= a.right + gap || a.top >= b.bottom + gap || b.top >= a.bottom + gap);
}
