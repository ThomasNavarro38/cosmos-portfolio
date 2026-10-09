/**
 * Condensation and decay: a focused Project's Skills, drawn as Motes that
 * condense out of their Client's Dust onto three orbits around the Planet, and
 * decay back into it when Focus moves on or is released.
 *
 * **One Mote per Skill name, structurally** (FR-13). The state is keyed by the
 * Skill's name, and the renderer keeps one pooled dot per distinct name in the
 * artifact, so a Skill can never be drawn as two Motes. That is also what makes
 * `A → B` a single object moving: a Skill both Projects carry is the same Mote,
 * and it travels from A's slot to B's still condensed.
 *
 * **One blend for every direction.** `blendMote(from, to, fromLevel, toLevel,
 * elapsed)` is condensation (source → slot, level 0 → 1), decay (drawn pose →
 * source, level → 0) and hand-off (drawn pose → the new slot, level → 1) alike,
 * over `FOCUS_SECONDS` on `easeFocus` — the Focus move's own duration and curve,
 * so Condensation is part of the one move rather than a second animation that
 * agrees with it (UX-DR29). Any change of target captures the drawn position
 * and level, so nothing ever cuts; and because `FOCUS_EASING` is symmetric, a
 * decay toward a static source traces its condensation backwards.
 *
 * **Sources are visible Dust.** A Mote starts and ends at level 0 at its source:
 * its slot pushed outward from the Planet by `MOTE_SOURCE_SPREAD`, then pulled
 * radially toward the Star until it lies where the Client's medium is at least
 * `MOTE_SOURCE_ALPHA` opaque. The medium's profile is `(1 − t²)²`, so that
 * region is a ball of radius `radius · √(1 − √(α / peak))`, in closed form.
 *
 * **Orbits are the artifact's Skill tier** (3.5, D-A4). The artifact carries a
 * ranked `skills` list — every distinct Skill, most-shared first, each with its
 * tier — and the renderer reads it as a lookup; it never counts shares. A tier's
 * index is its orbit (`mote-inner` is the innermost), and among a Project's
 * Skills on one orbit the `j`-th by rank sits at slot `2j`, with
 * `S = max(MOTE_MIN_SLOTS, 2k)` slots on an orbit holding `k`, so no two Motes of
 * one Planet ever occupy adjacent slots of one orbit. Each tier draws its dot at
 * a screen-constant radius (2.6 / 2.1 / 1.8px) in its DESIGN.md `mote` fill, and
 * every orbit holding a Mote draws as a `stroke-dust` hairline circle on its tilt
 * — two lines per orbit, one around the focused Planet fading in with its
 * Motes and one around the Planet just left fading out with them, so an
 * `A → B` hand-off never moves a line between Planets in one frame.
 * Nothing here reads `moteTier`.
 *
 * **Labels never sit under the panel.** A label is placed from NDC positions,
 * projected through the camera matrices the frame hands in: on the dot's left
 * when the dot is left of the Planet on screen, on its right otherwise. A
 * right-hand label whose estimated width crosses the panel edge `1 − 2w` while
 * a Project is focused is hidden that frame (never truncated). A condensing Mote
 * is *blocked* when its label would cross at its destination slot — judged there,
 * not at its in-flight pose — and once it has condensed, the next step glides it
 * over `MOTE_RESLOT_SECONDS` to the nearest free slot that keeps the
 * no-adjacency quota and would not be blocked. With no such slot the Mote stays
 * and its label stays hidden.
 *
 * **At most `MOTE_LABEL_LIMIT` labels, none colliding, none clipped** (3.5).
 * After placement, one pass per frame visits the labelled Motes — the focused
 * Project's first — in `skills` rank, and shows a label only while the pass is
 * under the limit, its estimated box lies inside the canvas on all four edges
 * and left of the panel edge, and it clears every label already shown by
 * `MOTE_LABEL_CLEARANCE_PX`. A label hidden by that pass is not re-slotted: the
 * cap and the ordering are `moteLabelPass`'s alone, so a later degradation rule
 * replaces one function.
 *
 * **Pure.** It imports the shell's timing and panel models and this
 * directory's Dust, Rail, scene, stroke and Notable models — no Three, no React, no store, no
 * clock — so every rule here runs under `node --test`, and `mote-field.tsx`
 * only binds it. The one exception to "returns, never mutates" is
 * `applyMoteDraw`, which writes a frame's result onto the handles it is given;
 * it lives here so that the writing, too, is executed rather than read.
 */

import { FOCUS_SECONDS, easeFocus } from '../shell/focus-motion.ts';
import { tokens } from '../tokens/tokens.ts';
import { panelFraction } from '../shell/panel-model.ts';
import { motionPace } from '../shell/motion-preference.ts';
import type { DustMedium } from './dust-model.ts';
import { worldPerPixel } from './notable-model.ts';
import { RAIL_MAX_FRAME_SECONDS } from './rail-model.ts';
import type { Body, ScenePosition } from './scene-model.ts';
import { strokeColor, strokeWidthPx, type LinePoint } from './stroke-model.ts';

// --- Tuning ------------------------------------------------------------------

/**
 * The three orbits' radii around the focused Planet, in scene units, innermost
 * first. The outermost plus `MOTE_RADIUS` stays inside `FOCUS_REACH`, and the
 * innermost minus it clears the largest drawn Body — both asserted in
 * `scene-model.test.ts`, where the two files meet. Greybox: tuned at M1.
 */
export const MOTE_ORBIT_RADII = [1.4, 2.05, 2.7] as const;

/** Each orbit's tilt off the orbital axis, in degrees, about world `x`. Greybox. */
export const MOTE_ORBIT_TILTS = [-16, 26, -46] as const;

/**
 * Each orbit's angular offset, in radians, so the first slot of every orbit is
 * not on one horizontal line — three labels there would stack. Quarter-turn steps
 * (3.5): the nine-Skill fixture reads all nine labels at rest at 1440×900. Greybox.
 */
export const MOTE_ORBIT_PHASES = [0, Math.PI / 4, Math.PI / 2] as const;

/** How fast every orbit turns, so a condensed Mote keeps moving while the panel is read. */
export const MOTE_ORBIT_RADIANS_PER_SECOND = 0.1;

/** The fewest slots an orbit has. Even, so slot `2j` always leaves a gap. */
export const MOTE_MIN_SLOTS = 8;

/** The radius of one Mote's mesh, in scene units: the sphere every dot is scaled from. */
export const MOTE_RADIUS = 0.05;

/** The drawn scale of a Mote at level 0, as a share of its full size. */
export const MOTE_MIN_SCALE = 0.3;

/** How far outward from the Planet a slot is pushed to find its source, in scene units. */
export const MOTE_SOURCE_SPREAD = 2;

/**
 * The medium alpha a source must reach: a Mote condenses out of Dust you can
 * see, never out of empty space. Below `DUST_MEDIUM_PEAK_OPACITY` (asserted).
 */
export const MOTE_SOURCE_ALPHA = 0.1;

/** How long a re-slotted Mote's angle takes to ease to its new slot, in seconds. */
export const MOTE_RESLOT_SECONDS = 0.4;

/**
 * The artifact's Skill tiers, innermost first: derive's `SKILL_TIERS`, mirrored,
 * because this directory may not import `src/derive/`. A tier's index here *is*
 * its orbit. `mote-model.test.ts` reads derive's literal as text and pins the two
 * equal.
 */
export const MOTE_TIERS_BY_ORBIT = ['mote-inner', 'mote-middle', 'mote-outer'] as const;

/** Each tier's dot radius on screen, in CSS pixels, before the level scale (DESIGN.md `mote.radiusTier1..3`). */
export const MOTE_DOT_RADII_PX = [2.6, 2.1, 1.8] as const;

/**
 * Each tier's dot fill (DESIGN.md `mote.fillTier1..3`): `stroke-active` for the
 * innermost, `ink-label` for the other two. A dot only: a label is a glyph, and
 * glyphs take the ink ladder.
 */
export const MOTE_DOT_COLORS = [
  tokens.colors['stroke-active-dark'],
  tokens.colors['ink-label-dark'],
  tokens.colors['ink-label-dark'],
] as const;

/** The orbit line: `stroke-dust` at `hairline` (DESIGN.md `mote-orbit-line`). */
export const MOTE_ORBIT_LINE_COLOR = strokeColor('stroke-dust');
export const MOTE_ORBIT_LINE_WIDTH_PX = strokeWidthPx('hairline');

/** Segments in one drawn orbit line. */
export const MOTE_ORBIT_LINE_SEGMENTS = 96;

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

/** The least gap between two shown labels' boxes, in CSS pixels. */
export const MOTE_LABEL_CLEARANCE_PX = 4;

/**
 * The Mote label's ink: `ink-label`, the floor every Mote label tier sits at
 * (DESIGN.md §2). A stroke token on a glyph is what 3.2 forbids — the two
 * ladders never borrow each other's tokens.
 */
export const MOTE_LABEL_COLOR = tokens.colors['ink-label-dark'];

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

// --- The artifact slice ------------------------------------------------------

/**
 * The slice of the artifact Motes read, restated structurally as `SceneArtifact`
 * is: a Project's ID and its authored Skill list, and the ranked, tiered Skill
 * list. `src/render-scene/` may not import `src/derive/`, not even for a type.
 */
export interface MoteArtifact {
  readonly clients: readonly MoteArtifactClient[];
  /** Every distinct Skill, most-shared first, each with its tier (3.5). A lookup: never counted here. */
  readonly skills: readonly MoteArtifactSkill[];
}

export interface MoteArtifactClient {
  readonly projects: readonly MoteArtifactProject[];
}

export interface MoteArtifactProject {
  readonly id: string;
  readonly content: { readonly skills: readonly string[] };
}

/** One entry of the artifact's Skill list. The tier is a string: `moteRanks` rejects one it does not name. */
export interface MoteArtifactSkill {
  readonly name: string;
  readonly tier: string;
}

/**
 * Every distinct Skill name in the artifact, in artifact order: the renderer's
 * pool, one dot and one label each. A Skill two Projects share is one entry.
 */
export function motePool(artifact: MoteArtifact): string[] {
  const seen = new Set<string>();
  for (const client of artifact.clients) {
    for (const project of client.projects) {
      for (const skill of project.content.skills) seen.add(skill);
    }
  }
  return [...seen];
}

/**
 * Project `id`'s Skills, as authored.
 *
 * @throws naming the ID when no Project carries it — as `focusPose` does for
 * the same ID, because a Mote cannot condense around nothing.
 */
export function projectSkills(artifact: MoteArtifact, id: string): readonly string[] {
  for (const client of artifact.clients) {
    for (const project of client.projects) {
      if (project.id === id) return project.content.skills;
    }
  }
  throw new Error(`Motes need a Project, but none carries ${JSON.stringify(id)}.`);
}

/** Where a Skill stands in the artifact's list: its rank (0 is the most shared) and its tier's orbit. */
export interface MoteRank {
  readonly rank: number;
  readonly orbit: number;
}

/** The artifact's Skill list as a lookup, by name. */
export type MoteRanks = ReadonlyMap<string, MoteRank>;

/** One lookup per artifact object: `stepMotes` and every pooled dot's colour read it without rebuilding it. */
const RANKS = new WeakMap<MoteArtifact, MoteRanks>();

/**
 * The artifact's `skills`, as a lookup: each name's rank (its index) and orbit
 * (its tier's index in `MOTE_TIERS_BY_ORBIT`). Reads the list; counts nothing.
 * Memoised per artifact object, which the scene never mutates.
 *
 * @throws naming the Skill when its tier is not one this renderer draws, or
 * when the list carries its name twice — two ranks for one Mote.
 */
export function moteRanks(artifact: MoteArtifact): MoteRanks {
  const known = RANKS.get(artifact);
  if (known !== undefined) return known;
  const ranks = new Map<string, MoteRank>();
  artifact.skills.forEach((entry, rank) => {
    const orbit = (MOTE_TIERS_BY_ORBIT as readonly string[]).indexOf(entry.tier);
    if (orbit < 0) throw new Error(`the Skill ${JSON.stringify(entry.name)} has the tier ${JSON.stringify(entry.tier)}, which no orbit draws.`);
    if (ranks.has(entry.name)) throw new Error(`the Skill ${JSON.stringify(entry.name)} is listed twice in the artifact's skills.`);
    ranks.set(entry.name, { rank, orbit });
  });
  RANKS.set(artifact, ranks);
  return ranks;
}

/**
 * One Skill's rank and orbit.
 *
 * @throws naming the Skill when the artifact's list does not carry it — as
 * `projectSkills` throws for a missing Project: a Mote with no tier has no orbit.
 */
export function moteRank(ranks: MoteRanks, skill: string): MoteRank {
  const found = ranks.get(skill);
  if (found === undefined) throw new Error(`Motes need a tier, but the artifact's skills carry none for ${JSON.stringify(skill)}.`);
  return found;
}

// --- Orbits and slots ----------------------------------------------------------

/** Where one Skill sits: an orbit, a slot on it, and how many slots that orbit has. */
export interface MoteSeat {
  readonly skill: string;
  readonly orbit: number;
  readonly slot: number;
  readonly slots: number;
}

/** A Project's Skills seated. */
export interface MoteAssignment {
  /** Slots on each orbit, innermost first. */
  readonly slots: readonly number[];
  /** In rank order. */
  readonly seats: readonly MoteSeat[];
}

/**
 * The seats of a Project's Skills: deduplicated, ordered by their rank in the
 * artifact's list, each on its tier's orbit; the `j`-th on an orbit at slot
 * `2j`, with `S = max(MOTE_MIN_SLOTS, 2k)` slots on an orbit holding `k`.
 * Occupied slots are even and at most `S − 2`, so no two are adjacent,
 * wrap-around included.
 *
 * @throws naming a Skill the artifact's list does not carry.
 */
export function moteAssignment(skills: readonly string[], ranks: MoteRanks): MoteAssignment {
  const ranked = [...new Set(skills)]
    .map((skill) => ({ skill, ...moteRank(ranks, skill) }))
    .sort((a, b) => a.rank - b.rank);
  const held = MOTE_ORBIT_RADII.map((_, orbit) => ranked.filter((entry) => entry.orbit === orbit).length);
  const slots = held.map((k) => Math.max(MOTE_MIN_SLOTS, 2 * k));
  const next = MOTE_ORBIT_RADII.map(() => 0);
  const seats = ranked.map(({ skill, orbit }): MoteSeat => {
    const j = next[orbit] ?? 0;
    next[orbit] = j + 1;
    return { skill, orbit, slot: 2 * j, slots: slots[orbit] ?? MOTE_MIN_SLOTS };
  });
  return { slots, seats };
}

/** A slot's angle on its orbit before the orbit's phase and spin, in radians. */
export function slotAngle(slot: number, slots: number): number {
  return (2 * Math.PI * slot) / slots;
}

/** How far an orbit has turned at `clock` seconds: its phase plus its spin. */
export function orbitSpin(orbit: number, clock: number): number {
  return requireOrbit(MOTE_ORBIT_PHASES, orbit) + MOTE_ORBIT_RADIANS_PER_SECOND * clock;
}

/**
 * The point at `angle` on orbit `orbit` around `centre`: a circle of the
 * orbit's radius in the `xy` plane, tilted about world `x` by the orbit's tilt.
 * Every point is exactly the orbit's radius from `centre`.
 */
export function orbitPoint(centre: ScenePosition, orbit: number, angle: number): ScenePosition {
  const radius = requireOrbit(MOTE_ORBIT_RADII, orbit);
  const tilt = (requireOrbit(MOTE_ORBIT_TILTS, orbit) * Math.PI) / 180;
  return {
    x: centre.x + radius * Math.cos(angle),
    y: centre.y + radius * Math.sin(angle) * Math.cos(tilt),
    z: centre.z + radius * Math.sin(angle) * Math.sin(tilt),
  };
}

function requireOrbit(values: readonly number[], orbit: number): number {
  const value = Number.isInteger(orbit) ? values[orbit] : undefined;
  if (value === undefined) throw new RangeError(`there is no orbit ${String(orbit)}; there are ${values.length}.`);
  return value;
}

// --- Sources -------------------------------------------------------------------

/**
 * How far from its Star a medium is at least `MOTE_SOURCE_ALPHA` opaque: the
 * inverse of `opacity · (1 − t²)²`, times the radius.
 *
 * @throws RangeError naming the medium when its peak is below the threshold —
 * no point of it is visible enough to condense from.
 */
export function sourceReach(medium: DustMedium): number {
  if (!(medium.opacity >= MOTE_SOURCE_ALPHA)) {
    throw new RangeError(
      `the medium ${JSON.stringify(medium.id)} peaks at ${String(medium.opacity)}, below MOTE_SOURCE_ALPHA (${MOTE_SOURCE_ALPHA}).`,
    );
  }
  return Math.max(medium.radius, 0) * Math.sqrt(1 - Math.sqrt(MOTE_SOURCE_ALPHA / medium.opacity));
}

/**
 * A slot's source in its Client's visible Dust: the slot pushed outward from
 * the Planet by `MOTE_SOURCE_SPREAD`, then — if that lies outside the visible
 * region — moved radially toward the Star onto its edge.
 */
export function dustSource(slot: ScenePosition, planet: ScenePosition, medium: DustMedium): ScenePosition {
  const out = { x: slot.x - planet.x, y: slot.y - planet.y, z: slot.z - planet.z };
  const length = Math.hypot(out.x, out.y, out.z);
  const push = length > 0 ? MOTE_SOURCE_SPREAD / length : 0;
  const pushed = { x: slot.x + out.x * push, y: slot.y + out.y * push, z: slot.z + out.z * push };
  const reach = sourceReach(medium);
  const star = medium.position;
  const from = { x: pushed.x - star.x, y: pushed.y - star.y, z: pushed.z - star.z };
  const distance = Math.hypot(from.x, from.y, from.z);
  if (distance <= reach) return pushed;
  const scale = reach / distance;
  return { x: star.x + from.x * scale, y: star.y + from.y * scale, z: star.z + from.z * scale };
}

// --- The blend -----------------------------------------------------------------

/** A Mote's pose: where it is drawn, and how condensed it is (0 is Dust, 1 is a Mote). */
export interface MotePose {
  readonly position: ScenePosition;
  readonly level: number;
}

/**
 * The one blend: `elapsed` seconds into a move from `from` at `fromLevel` to
 * `to` at `toLevel`, on `easeFocus` over `FOCUS_SECONDS`. At and past
 * `FOCUS_SECONDS` it is exactly the goal; at 0 exactly the start. A non-finite
 * `elapsed` reads as 0.
 */
export function blendMote(
  from: ScenePosition,
  to: ScenePosition,
  fromLevel: number,
  toLevel: number,
  elapsed: number,
): MotePose {
  const eased = Number.isFinite(elapsed) ? easeFocus(elapsed / FOCUS_SECONDS) : 0;
  if (eased >= 1) return { position: to, level: toLevel };
  return {
    position: {
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased,
      z: from.z + (to.z - from.z) * eased,
    },
    level: fromLevel + (toLevel - fromLevel) * eased,
  };
}

// --- Projection and labels -------------------------------------------------------

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

/** A label's resting inline style: the `mote-label` type in `ink-label`, one line, inert to the pointer, hidden until placed. */
export interface MoteLabelStyle {
  readonly fontFamily: string;
  readonly fontSize: string;
  readonly fontWeight: number;
  readonly lineHeight: number;
  readonly letterSpacing: string;
  readonly whiteSpace: 'nowrap';
  readonly color: string;
  readonly pointerEvents: 'none';
  readonly userSelect: 'none';
  readonly visibility: 'hidden';
  readonly opacity: number;
  readonly transform: string;
}

export function moteLabelStyle(): MoteLabelStyle {
  return {
    fontFamily: MOTE_LABEL_TYPE.fontFamily,
    fontSize: MOTE_LABEL_TYPE.fontSize,
    fontWeight: MOTE_LABEL_TYPE.fontWeight,
    lineHeight: MOTE_LABEL_TYPE.lineHeight,
    letterSpacing: MOTE_LABEL_TYPE.letterSpacing,
    whiteSpace: 'nowrap',
    color: MOTE_LABEL_COLOR,
    pointerEvents: 'none',
    userSelect: 'none',
    visibility: 'hidden',
    opacity: 0,
    transform: labelTransform('right'),
  };
}

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

/**
 * Which labels are shown this frame — **the degradation rule, in one function**.
 *
 * Candidates are visited the focused Project's first, then by rank (most shared
 * first), so an inner-orbit, most-shared Skill always wins a collision. A label
 * is shown only while fewer than `MOTE_LABEL_LIMIT` are, its box lies inside the
 * canvas on all four edges and left of the panel edge, and it clears every label
 * already shown by `MOTE_LABEL_CLEARANCE_PX`. A label hidden here is hidden, not
 * re-slotted and never truncated. A later rule replaces this function whole.
 */
export function moteLabelPass(candidates: readonly LabelCandidate[], bounds: LabelBounds): Set<string> {
  const ordered = [...candidates].sort((a, b) => Number(b.focused) - Number(a.focused) || a.rank - b.rank);
  const shown: LabelBox[] = [];
  const names = new Set<string>();
  const gap = MOTE_LABEL_CLEARANCE_PX;
  for (const candidate of ordered) {
    if (shown.length >= MOTE_LABEL_LIMIT) break;
    const { box } = candidate;
    const inside =
      [box.left, box.right, box.top, box.bottom].every(Number.isFinite) &&
      box.left >= 0 &&
      box.top >= 0 &&
      box.bottom <= bounds.height &&
      box.right <= bounds.width &&
      box.right <= bounds.panelEdge;
    if (!inside) continue;
    const clear = shown.every(
      (other) =>
        box.left >= other.right + gap || other.left >= box.right + gap || box.top >= other.bottom + gap || other.top >= box.bottom + gap,
    );
    if (!clear) continue;
    shown.push(box);
    names.add(candidate.skill);
  }
  return names;
}

// --- The step ------------------------------------------------------------------

/** One Mote: a Skill, the slot it is heading for or leaving, and its pose. */
export interface Mote {
  readonly skill: string;
  /** The Planet whose orbits hold its slot. */
  readonly planetId: string;
  readonly orbit: number;
  readonly slot: number;
  /** Slots on each of that Planet's orbits. */
  readonly slots: number;
  /** The unspun angle its current re-slot eases from. */
  readonly angleFrom: number;
  /** Seconds into that re-slot, capped at `MOTE_RESLOT_SECONDS` (at rest on the slot). */
  readonly reslotElapsed: number;
  /** Heading for its slot at level 1; otherwise decaying toward `source` at level 0. */
  readonly condensing: boolean;
  /** Its source in the Dust: where it condensed from, or where it is decaying to. */
  readonly source: ScenePosition;
  /** The pose captured when its target last changed. */
  readonly from: ScenePosition;
  readonly fromLevel: number;
  /** Seconds since its target last changed, capped at `FOCUS_SECONDS`. */
  readonly elapsed: number;
  /** Drawn this frame. */
  readonly position: ScenePosition;
  readonly level: number;
  readonly labelSide: LabelSide;
  /** Its label was placed this frame: in front, condensed, and neither drawn nor resting across the panel. */
  readonly labelPlaced: boolean;
  /** Its label's estimated box this frame, or `null` when it cannot be measured. */
  readonly labelBox: LabelBox | null;
  /** Placed, and kept by `moteLabelPass`: shown. */
  readonly labelVisible: boolean;
  /** Its label was blocked this frame: the next step re-slots it. */
  readonly blocked: boolean;
}

/** What the renderer applies to one pooled dot and its label. */
export interface MoteDraw {
  readonly skill: string;
  readonly visible: boolean;
  /** `null` while no Mote carries the Skill: the dot is hidden and left where it was. */
  readonly position: ScenePosition | null;
  /** The level's scale: `MOTE_MIN_SCALE` at level 0, 1 condensed. */
  readonly scale: number;
  /**
   * What takes the mesh to its tier's screen radius at its drawn depth:
   * `radiusPx · worldPerPixel / MOTE_RADIUS`; 1 when that cannot be measured.
   * The mesh is scaled by `scale × dotScale`.
   */
  readonly dotScale: number;
  readonly opacity: number;
  readonly labelVisibility: 'visible' | 'hidden';
  readonly labelTransform: string;
}

/** Which of an orbit's two lines: around the focused Planet, or around the Planet just left. */
export type MoteOrbitRole = 'condensing' | 'decaying';

/** What the renderer applies to one orbit line. */
export interface MoteOrbitDraw {
  /** Its index among `moteOrbitLines()`: `2 · orbit` condensing, `2 · orbit + 1` decaying. */
  readonly line: number;
  readonly orbit: number;
  readonly role: MoteOrbitRole;
  /** Drawn: its opacity is above 0. */
  readonly visible: boolean;
  /** The Planet it circles, or `null` while it has none: the line is left where it was. */
  readonly centre: ScenePosition | null;
  readonly opacity: number;
}

/**
 * An orbit's outgoing line, carried between frames: where it circles, the opacity
 * it had when Focus left that Planet, and seconds since — it fades on the Focus
 * curve, as the Motes leaving that Planet decay.
 */
export interface MoteOrbitFade {
  readonly centre: ScenePosition | null;
  readonly from: number;
  readonly elapsed: number;
}

/** What the field carries between frames. */
export interface MoteField {
  readonly focusedId: string | null;
  /** Seconds of spin: what turns the orbits. */
  readonly clock: number;
  readonly motes: readonly Mote[];
  /** One per `motePool` entry, in pool order. */
  readonly draws: readonly MoteDraw[];
  /** Two per orbit, innermost first: condensing then decaying, aligned with `moteOrbitLines()`. */
  readonly orbits: readonly MoteOrbitDraw[];
  /** One per orbit: its outgoing line's fade. */
  readonly fades: readonly MoteOrbitFade[];
}

/** What the step reads from the scene. */
export interface MoteScene {
  readonly artifact: MoteArtifact;
  readonly bodies: readonly Body[];
  readonly media: readonly DustMedium[];
}

/** What the step reads from the camera: its matrices, as `three` stores them, and the canvas size. */
export interface MoteView {
  readonly view: ArrayLike<number>;
  readonly projection: ArrayLike<number>;
  readonly width: number;
  readonly height: number;
}

/**
 * One frame of the field.
 *
 * Rules, in order:
 *
 *   - **Time.** `dt` is clamped to `[0, RAIL_MAX_FRAME_SECONDS]` (non-finite
 *     reads as 0), then divided by the reduced-motion pace (2.10). The clock
 *     spins every orbit — except under reduced motion, where it holds, so the
 *     Motes keep their angles; every Mote's `elapsed` and re-slot advance. A
 *     decay that has reached `FOCUS_SECONDS` is at level 0 at its source and
 *     is removed.
 *   - **The focused ID changed** (or a first frame finds one focused): each
 *     Skill of the new Project that already has a Mote is retargeted to its new
 *     slot from its drawn pose and level; each Mote heading for a slot the new
 *     Project does not seat decays from its drawn pose toward its slot's
 *     source, fixed now; a Mote already decaying keeps going; each new Skill
 *     condenses from its source at level 0. The change frame draws every
 *     retargeted Mote exactly where it was.
 *   - **Otherwise, re-slotting:** a condensed Mote (`elapsed` at
 *     `FOCUS_SECONDS`) that was blocked at its slot last frame, and which is not
 *     already gliding, moves to the nearest slot of its
 *     orbit — by angle, then by index — that is free, has no occupied
 *     neighbour, and would not be blocked now. None: it stays.
 *   - **Pose:** `blendMote` from the captured pose toward the live slot
 *     (condensing, level 1) or the fixed source (decaying, level 0).
 *   - **Labels:** `labelPlacement` over the projected dot and Planet for the
 *     side and the drawn crossing; over the destination slot for `blocked`.
 *     Then `moteLabelPass` over every placed label decides which are shown.
 *   - **Draws:** each dot at its tier's screen radius times the level scale.
 *     Each orbit's condensing line circles the focused Planet at the highest
 *     `min(level, ease(elapsed))` of the condensing Motes on it — so a Mote
 *     handed off at level 1 fades the new line in rather than snapping it. On a
 *     change of Focus, its decaying line takes over the condensing line as it
 *     was drawn (unless the line already fading is brighter) and fades it out
 *     over `FOCUS_SECONDS` on `easeFocus`.
 *   - **The panel edge** bounds labels while a Project is focused, and still
 *     while any Mote is decaying — after a release the panel is sliding out
 *     over the same move.
 *
 * @throws naming the ID when the focused Project is not in the artifact or has
 * no Planet, and naming the Client when its medium is missing.
 */
export function stepMotes(
  previous: MoteField | null,
  scene: MoteScene,
  focusedId: string | null,
  view: MoteView,
  dt: number,
  reduced = false,
): MoteField {
  const step = (Number.isFinite(dt) ? Math.min(Math.max(dt, 0), RAIL_MAX_FRAME_SECONDS) : 0) / motionPace(reduced);
  // Reduced motion stops the orbits (WCAG 2.3.3, Animation from Interactions): an
  // orbit has no end to shorten. At full motion they spin with no pause control —
  // WCAG 2.2.2 stays open (deferred-work.md).
  const clock = previous === null ? 0 : reduced ? previous.clock : previous.clock + step;
  const changed = previous === null ? focusedId !== null : focusedId !== previous.focusedId;

  const advanced = (previous?.motes ?? [])
    .map((mote) => ({
      ...mote,
      elapsed: Math.min(mote.elapsed + step, FOCUS_SECONDS),
      reslotElapsed: Math.min(mote.reslotElapsed + step, MOTE_RESLOT_SECONDS),
    }))
    .filter((mote) => mote.condensing || mote.elapsed < FOCUS_SECONDS);

  const ranks = moteRanks(scene.artifact);
  const targeted = changed
    ? retarget(advanced, scene, ranks, focusedId, clock)
    : focusedId === null
      ? advanced
      : reslot(advanced, scene, view, clock);

  const placed = targeted.map((mote) => label(pose(mote, scene, clock), scene, view, focusedId !== null, clock));
  const shown = moteLabelPass(
    placed.flatMap((mote): LabelCandidate[] =>
      mote.labelPlaced && mote.labelBox !== null
        ? [{ skill: mote.skill, rank: moteRank(ranks, mote.skill).rank, focused: mote.condensing && mote.planetId === focusedId, box: mote.labelBox }]
        : [],
    ),
    {
      width: view.width,
      height: view.height,
      // After a release the panel slides out over the decay itself, so its edge
      // still bounds the decaying labels until the last Mote has gone.
      panelEdge: view.width * (1 - (focusedId !== null || placed.some((mote) => !mote.condensing) ? panelFraction(view.width) : 0)),
    },
  );
  const motes = placed.map((mote) => ({ ...mote, labelVisible: shown.has(mote.skill) }));
  const byName = new Map(motes.map((mote) => [mote.skill, mote]));
  const draws = motePool(scene.artifact).map((skill) => drawOf(skill, byName.get(skill), view));
  const fades = orbitFades(previous, changed, step);
  return { focusedId, clock, motes, draws, orbits: orbitDraws(motes, scene, focusedId, fades), fades };
}

/**
 * The frame loop's step, as a pure function, so the binding in
 * `mote-field.tsx` is executed rather than read: the store's focused ID, the
 * camera's matrices after the rig has moved it, and R3F's canvas size.
 */
export function moteFrame(
  previous: MoteField | null,
  artifact: MoteArtifact,
  bodies: readonly Body[],
  media: readonly DustMedium[],
  focusedId: string | null,
  view: ArrayLike<number>,
  projection: ArrayLike<number>,
  width: number,
  height: number,
  delta: number,
  reduced = false,
): MoteField {
  return stepMotes(previous, { artifact, bodies, media }, focusedId, { view, projection, width, height }, delta, reduced);
}

function retarget(motes: readonly Mote[], scene: MoteScene, ranks: MoteRanks, focusedId: string | null, clock: number): Mote[] {
  const assignment = focusedId === null ? null : moteAssignment(projectSkills(scene.artifact, focusedId), ranks);
  const seats = new Map((assignment?.seats ?? []).map((seat) => [seat.skill, seat]));
  const target = focusedId === null ? null : planetOf(scene.bodies, focusedId);
  const targetMedium = target === null ? null : mediumOf(scene.media, target);
  /** The Dust source of a seat on the focused Planet, at `clock`. */
  const sourceOf = (seat: MoteSeat, planet: Body, medium: DustMedium): ScenePosition =>
    dustSource(orbitPoint(planet.position, seat.orbit, slotAngle(seat.slot, seat.slots) + orbitSpin(seat.orbit, clock)), planet.position, medium);
  const kept = motes.map((mote): Mote => {
    const seat = seats.get(mote.skill);
    if (seat !== undefined && assignment !== null && focusedId !== null && target !== null && targetMedium !== null) {
      return {
        ...mote,
        planetId: focusedId,
        orbit: seat.orbit,
        slot: seat.slot,
        slots: seat.slots,
        angleFrom: slotAngle(seat.slot, seat.slots),
        reslotElapsed: MOTE_RESLOT_SECONDS,
        condensing: true,
        // Its source is always that of the slot it heads for: a handed-off Mote's
        // is B's Dust, where it would decay to if B were released at once.
        source: sourceOf(seat, target, targetMedium),
        from: mote.position,
        fromLevel: mote.level,
        elapsed: 0,
        blocked: false,
      };
    }
    if (!mote.condensing) return mote;
    const planet = planetOf(scene.bodies, mote.planetId);
    return {
      ...mote,
      condensing: false,
      source: dustSource(slotPointOf(mote, planet, clock), planet.position, mediumOf(scene.media, planet)),
      from: mote.position,
      fromLevel: mote.level,
      elapsed: 0,
      blocked: false,
    };
  });
  if (assignment === null || focusedId === null || target === null || targetMedium === null) return kept;

  const present = new Set(kept.map((mote) => mote.skill));
  const born = assignment.seats
    .filter((seat) => !present.has(seat.skill))
    .map((seat): Mote => {
      const angle = slotAngle(seat.slot, seat.slots);
      const source = sourceOf(seat, target, targetMedium);
      return {
        skill: seat.skill,
        planetId: focusedId,
        orbit: seat.orbit,
        slot: seat.slot,
        slots: seat.slots,
        angleFrom: angle,
        reslotElapsed: MOTE_RESLOT_SECONDS,
        condensing: true,
        source,
        from: source,
        fromLevel: 0,
        elapsed: 0,
        position: source,
        level: 0,
        labelSide: 'right',
        labelPlaced: false,
        labelBox: null,
        labelVisible: false,
        blocked: false,
      };
    });
  return [...kept, ...born];
}

function reslot(motes: readonly Mote[], scene: MoteScene, view: MoteView, clock: number): Mote[] {
  const current = [...motes];
  current.forEach((mote, index) => {
    // In flight too: `pose` blends toward the live, gliding slot, so a re-slot
    // mid-condensation bends the path rather than cutting it. A decaying Mote
    // has no slot to leave, and one glide runs to its end before the next.
    if (!mote.blocked || !mote.condensing || mote.reslotElapsed < MOTE_RESLOT_SECONDS) return;
    const planet = planetOf(scene.bodies, mote.planetId);
    const planetNdc = projectNdc(planet.position, view.view, view.projection);
    const occupied = new Set(
      current
        .filter((other, at) => at !== index && other.condensing && other.planetId === mote.planetId && other.orbit === mote.orbit)
        .map((other) => other.slot),
    );
    const angle = unspunAngle(mote);
    const wrap = (slot: number): number => (slot + mote.slots) % mote.slots;
    // Ascending slot order, and only a strictly nearer slot replaces the best so
    // far: a tie goes to the lower index.
    const nearest = Array.from({ length: mote.slots }, (_, slot) => slot)
      .filter((slot) => slot !== mote.slot && ![slot, wrap(slot - 1), wrap(slot + 1)].some((taken) => occupied.has(taken)))
      .filter((slot) => {
        const point = orbitPoint(planet.position, mote.orbit, slotAngle(slot, mote.slots) + orbitSpin(mote.orbit, clock));
        const dot = projectNdc(point, view.view, view.projection);
        return labelPlacement(dot, planetNdc, labelChars(mote.skill), view.width, true).visible;
      })
      .map((slot) => ({ slot, away: Math.abs(shortestTurn(angle, slotAngle(slot, mote.slots))) }))
      .reduce<{ slot: number; away: number } | undefined>(
        (best, candidate) => (best === undefined || candidate.away < best.away - 1e-12 ? candidate : best),
        undefined,
      );
    if (nearest === undefined) return;
    current[index] = { ...mote, slot: nearest.slot, angleFrom: angle, reslotElapsed: 0 };
  });
  return current;
}

function pose(mote: Mote, scene: MoteScene, clock: number): Mote {
  const to = mote.condensing ? slotPointOf(mote, planetOf(scene.bodies, mote.planetId), clock) : mote.source;
  const { position, level } = blendMote(mote.from, to, mote.fromLevel, mote.condensing ? 1 : 0, mote.elapsed);
  return { ...mote, position, level };
}

/**
 * A Mote's label this frame. The side, and whether the label crosses the panel
 * as drawn, come from the drawn pose. Whether the Mote is *blocked* — and so
 * re-slotted on the next step — is judged at its destination: the slot it rests
 * on (a condensing Mote only; a decaying one has no slot to be moved from). A
 * label is *placed* when neither the drawn pose nor the destination crosses;
 * whether a placed label is shown is `moteLabelPass`'s.
 */
function label(mote: Mote, scene: MoteScene, view: MoteView, focused: boolean, clock: number): Mote {
  const planet = planetOf(scene.bodies, mote.planetId);
  const planetNdc = projectNdc(planet.position, view.view, view.projection);
  const chars = labelChars(mote.skill);
  const dotNdc = projectNdc(mote.position, view.view, view.projection);
  const drawn = labelPlacement(dotNdc, planetNdc, chars, view.width, focused);
  const resting = orbitPoint(planet.position, mote.orbit, slotAngle(mote.slot, mote.slots) + orbitSpin(mote.orbit, clock));
  const blocked =
    mote.condensing && labelPlacement(projectNdc(resting, view.view, view.projection), planetNdc, chars, view.width, focused).blocked;
  const labelPlaced = drawn.visible && !blocked && mote.level > 0;
  const box =
    Number.isFinite(view.height) && view.height > 0 ? labelBox(dotNdc, drawn.side, chars, view.width, view.height) : null;
  // `labelVisible` is the placement until `moteLabelPass` decides; `stepMotes` overwrites it.
  return { ...mote, labelSide: drawn.side, labelPlaced, labelBox: box, labelVisible: labelPlaced, blocked };
}

/** A label's length for the width estimate: code points, so one astral character is one advance, not two. */
export function labelChars(skill: string): number {
  return [...skill].length;
}

function drawOf(skill: string, mote: Mote | undefined, view: MoteView): MoteDraw {
  if (mote === undefined) {
    return {
      skill,
      visible: false,
      position: null,
      scale: MOTE_MIN_SCALE,
      dotScale: 1,
      opacity: 0,
      labelVisibility: 'hidden',
      labelTransform: labelTransform('right'),
    };
  }
  return {
    skill,
    visible: mote.level > 0,
    position: mote.position,
    scale: MOTE_MIN_SCALE + (1 - MOTE_MIN_SCALE) * mote.level,
    dotScale: moteDotScale(mote.orbit, mote.position, view),
    opacity: mote.level,
    labelVisibility: mote.labelVisible ? 'visible' : 'hidden',
    labelTransform: labelTransform(mote.labelSide),
  };
}

/**
 * The mesh scale that draws a dot on orbit `orbit` at its tier's screen radius,
 * `MOTE_DOT_RADII_PX[orbit]`, at `position`'s depth: `px · worldPerPixel / MOTE_RADIUS`.
 * 1 — the mesh at its own radius — whenever the depth cannot be measured.
 */
export function moteDotScale(orbit: number, position: ScenePosition, view: Pick<MoteView, 'view' | 'projection' | 'height'>): number {
  const perPixel = worldPerPixel(position, view.view, view.projection, view.height);
  if (perPixel === null) return 1;
  const scale = (requireOrbit(MOTE_DOT_RADII_PX, orbit) * perPixel) / MOTE_RADIUS;
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/** The fill of a Skill's dot: its tier's `MOTE_DOT_COLORS` entry. @throws naming a Skill the artifact's list does not carry. */
export function moteDotColor(artifact: MoteArtifact, skill: string): string {
  return MOTE_DOT_COLORS[moteRank(moteRanks(artifact), skill).orbit] ?? MOTE_DOT_COLORS[0];
}

/** A fade's opacity: `from` at 0 seconds, eased to 0 at `FOCUS_SECONDS`. */
function fadeOpacity(fade: MoteOrbitFade): number {
  return fade.centre === null ? 0 : fade.from * (1 - easeFocus(fade.elapsed / FOCUS_SECONDS));
}

/**
 * Each orbit's outgoing line this frame. On a change of Focus the condensing
 * line as drawn last frame becomes the outgoing one, from its opacity — unless
 * the line already fading is brighter now, which keeps fading instead. Otherwise
 * the fade advances by `step`.
 */
function orbitFades(previous: MoteField | null, changed: boolean, step: number): MoteOrbitFade[] {
  return MOTE_ORBIT_RADII.map((_, orbit): MoteOrbitFade => {
    const was = previous?.fades[orbit] ?? { centre: null, from: 0, elapsed: FOCUS_SECONDS };
    const advanced = { ...was, elapsed: Math.min(was.elapsed + step, FOCUS_SECONDS) };
    if (!changed) return advanced;
    const outgoing = previous?.orbits[2 * orbit];
    if (outgoing === undefined || outgoing.centre === null || !(outgoing.opacity > 0)) return advanced;
    if (fadeOpacity(advanced) > outgoing.opacity) return advanced;
    return { centre: outgoing.centre, from: outgoing.opacity, elapsed: 0 };
  });
}

/**
 * Each orbit's two lines this frame, condensing then decaying. The condensing
 * line circles the focused Planet at the highest `min(level, ease(elapsed))` of
 * the condensing Motes on that orbit; the decaying line is the orbit's fade.
 */
function orbitDraws(motes: readonly Mote[], scene: MoteScene, focusedId: string | null, fades: readonly MoteOrbitFade[]): MoteOrbitDraw[] {
  const centre = focusedId === null ? null : planetOf(scene.bodies, focusedId).position;
  return MOTE_ORBIT_RADII.flatMap((_, orbit): MoteOrbitDraw[] => {
    const arriving = Math.max(
      0,
      ...motes
        .filter((mote) => mote.condensing && mote.orbit === orbit && mote.planetId === focusedId)
        .map((mote) => Math.min(mote.level, easeFocus(mote.elapsed / FOCUS_SECONDS))),
    );
    const fade = fades[orbit] ?? { centre: null, from: 0, elapsed: FOCUS_SECONDS };
    const leaving = fadeOpacity(fade);
    return [
      { line: 2 * orbit, orbit, role: 'condensing', visible: centre !== null && arriving > 0, centre, opacity: centre === null ? 0 : arriving },
      { line: 2 * orbit + 1, orbit, role: 'decaying', visible: leaving > 0, centre: fade.centre, opacity: leaving },
    ];
  });
}

/** One orbit line's geometry: a full circle on the orbit's tilt, about the origin — the field moves it to its Planet. */
export interface MoteOrbitLine {
  readonly id: string;
  /** Its index: the `line` of the draws applied to it. */
  readonly line: number;
  readonly orbit: number;
  readonly role: MoteOrbitRole;
  readonly points: readonly LinePoint[];
  readonly color: string;
  readonly widthPx: number;
}

/** Built once: every render hands drei the same points, so no line is rebuilt. */
const ORBIT_LINES: readonly MoteOrbitLine[] = MOTE_ORBIT_RADII.flatMap((_, orbit) => {
  const origin = { x: 0, y: 0, z: 0 };
  const points = Array.from({ length: MOTE_ORBIT_LINE_SEGMENTS + 1 }, (_, i) => {
    const point = orbitPoint(origin, orbit, (2 * Math.PI * (i % MOTE_ORBIT_LINE_SEGMENTS)) / MOTE_ORBIT_LINE_SEGMENTS);
    return [point.x, point.y, point.z] as const;
  });
  return (['condensing', 'decaying'] as const).map((role, index) => ({
    id: `mote-orbit:${String(orbit)}:${role}`,
    line: 2 * orbit + index,
    orbit,
    role,
    points,
    color: MOTE_ORBIT_LINE_COLOR,
    widthPx: MOTE_ORBIT_LINE_WIDTH_PX,
  }));
});

/** The six orbit lines — per orbit, innermost first, a condensing one and a decaying one: `stroke-dust` at `hairline`, closed. The same array every call. */
export function moteOrbitLines(): readonly MoteOrbitLine[] {
  return ORBIT_LINES;
}

/** A Mote's slot angle before spin, part-way through a re-slot if one is running. */
function unspunAngle(mote: Mote): number {
  const target = slotAngle(mote.slot, mote.slots);
  if (mote.reslotElapsed >= MOTE_RESLOT_SECONDS) return target;
  return mote.angleFrom + shortestTurn(mote.angleFrom, target) * easeFocus(mote.reslotElapsed / MOTE_RESLOT_SECONDS);
}

function slotPointOf(mote: Mote, planet: Body, clock: number): ScenePosition {
  return orbitPoint(planet.position, mote.orbit, unspunAngle(mote) + orbitSpin(mote.orbit, clock));
}

/** The signed turn from `from` to `to`, in `(−π, π]`. */
function shortestTurn(from: number, to: number): number {
  const turn = (((to - from) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return turn > Math.PI ? turn - 2 * Math.PI : turn;
}

function planetOf(bodies: readonly Body[], id: string): Body {
  const planet = bodies.find((body) => body.kind === 'planet' && body.id === id);
  if (planet === undefined) throw new Error(`Motes orbit a Planet, but none carries ${JSON.stringify(id)}.`);
  return planet;
}

function mediumOf(media: readonly DustMedium[], planet: Body): DustMedium {
  const medium = media.find((entry) => entry.id === planet.clientId);
  if (medium === undefined) {
    throw new Error(`Motes condense out of ${JSON.stringify(planet.clientId)}'s Dust, but it has no medium.`);
  }
  return medium;
}

// --- Applying a frame ------------------------------------------------------------

/** The slice of a pooled dot a frame writes: a `three` mesh with a basic material satisfies it. */
export interface MoteDot {
  visible: boolean;
  readonly position: { set(x: number, y: number, z: number): unknown };
  readonly scale: { setScalar(scale: number): unknown };
  readonly material: { opacity: number };
}

/** The slice of a pooled label a frame writes: an `HTMLElement` satisfies it. */
export interface MoteLabel {
  readonly style: { visibility: string; opacity: string; transform: string };
}

/**
 * Writes one draw onto its dot and label. A handle not mounted yet is skipped;
 * a hidden draw leaves the dot where it was.
 */
export function applyMoteDraw(dot: MoteDot | null | undefined, label: MoteLabel | null | undefined, draw: MoteDraw): void {
  if (dot !== null && dot !== undefined) {
    dot.visible = draw.visible;
    if (draw.position !== null) dot.position.set(draw.position.x, draw.position.y, draw.position.z);
    dot.scale.setScalar(draw.scale * draw.dotScale);
    dot.material.opacity = draw.opacity;
  }
  if (label !== null && label !== undefined) {
    label.style.visibility = draw.labelVisibility;
    label.style.opacity = String(draw.opacity);
    label.style.transform = draw.labelTransform;
  }
}

/** The slice of an orbit line a frame writes: drei's `Line` (a three `Line2`) satisfies it. */
export interface MoteOrbitHandle {
  visible: boolean;
  readonly position: { set(x: number, y: number, z: number): unknown };
  readonly material: { opacity: number };
}

/** Writes one orbit draw onto its line. A handle not mounted yet is skipped; a hidden line is left where it was. */
export function applyMoteOrbitDraw(line: MoteOrbitHandle | null | undefined, draw: MoteOrbitDraw): void {
  if (line === null || line === undefined) return;
  line.visible = draw.visible;
  if (draw.centre !== null) line.position.set(draw.centre.x, draw.centre.y, draw.centre.z);
  line.material.opacity = draw.opacity;
}
