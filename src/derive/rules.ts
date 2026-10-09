/**
 * The three mapping rules, and nothing else — plus three projections: two of
 * what they already produced, and `deriveSkillTier`, of a Skill's share count.
 *
 * FR-3 binds Body appearance to the career data through exactly three rules:
 * mass from `duration`, luminance band from recency, distance from the Rail from
 * `weight`. A fourth rule here is a spec violation, not a feature — if a
 * consumer needs another visual property, the answer is a schema-plus-derivation
 * change agreed first, never a fourth mapping quietly added alongside these.
 *
 * `deriveMoteTier` and `deriveTimeAxis` are **not** a fourth rule. Each reads a
 * value the three rules have already resolved onto the graph — `mass` and
 * `isDeep`, and the recency rank `deriveLuminanceBand` maps — so no authored
 * field reaches a visual property through them. That is a structural property,
 * not an intention: neither signature can name a `Project`, a `Duration`, or an
 * authored field, and `rules.test.ts` reads the actual parameter lists and fails
 * if either ever does.
 *
 * Every function is pure: no I/O, no clock, no module state, no imports beyond
 * types. Each rule takes the value it maps plus the range that value sits in,
 * because the mappings are relative to the authored set rather than absolute —
 * see the normalization note below.
 */

import type { Duration, Project } from '../data/schema.ts';

/**
 * The resting steps of UX-DR2's five-step stroke ladder.
 *
 * The two brighter steps — `stroke-active` and `stroke-focus` — are reserved for
 * camera state and are deliberately *not* in this union. A `0..1` float would
 * let a renderer map recency across the whole ladder, and a recent Shallow
 * Project would reach white while unfocused, which UX-DR2 forbids. A closed set
 * of the three resting steps makes that unrepresentable rather than merely
 * discouraged.
 */
export type LuminanceBand = 'stroke-dust' | 'stroke-rest' | 'stroke-near';

/**
 * The resting band, dimmest first. Order is load-bearing: `deriveLuminanceBand`
 * indexes into it, and the tests assert a brighter band by index.
 */
export const RESTING_BANDS = ['stroke-dust', 'stroke-rest', 'stroke-near'] as const;

/** An inclusive numeric range taken across the whole authored set. */
export interface Range {
  readonly min: number;
  readonly max: number;
}

/**
 * Where `value` sits in `range`, as `0..1`.
 *
 * A single-entry set — which `career.json` is today, and roughly fifteen entries
 * from being otherwise — gives a zero-width range. Dividing by it yields `NaN`
 * and poisons every downstream number silently. A zero-width range means every
 * entry is equivalent on this axis, so the answer is the top of the range: the
 * sole entry is both the longest engagement and the most recent one.
 */
function normalize(value: number, range: Range): number {
  const span = range.max - range.min;
  if (span <= 0) return 1;
  const t = (value - range.min) / span;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Whole months from `start` to `end`, in ISO `YYYY-MM` form. */
function monthsBetween(start: string, end: string): number {
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  return (
    ((endYear ?? 0) - (startYear ?? 0)) * 12 + ((endMonth ?? 0) - (startMonth ?? 0))
  );
}

/**
 * The engagement's length in months, on the same scale for every entry.
 *
 * An ongoing engagement (`end: null`) has no authored end, so its span is
 * measured to `asOf` — the reference month the caller supplies. The reference is
 * a parameter rather than `new Date()` because a rule that reads the clock is
 * not pure and would make the emitted artifact churn every month.
 *
 * A single-month engagement (`start === end`) spans one month, not zero: the
 * schema accepts an equal start and end as a real engagement, and a zero span
 * would give it no mass at all.
 */
export function durationInMonths(duration: Duration, asOf: string): number {
  const end = duration.end ?? asOf;
  return Math.max(monthsBetween(duration.start, end), 0) + 1;
}

/**
 * The recency of an engagement, as a comparable ISO `YYYY-MM` month.
 *
 * `end: null` means ongoing, and an ongoing engagement is current — so it ranks
 * as maximally recent rather than as unknown. `asOf` is that ranking's ceiling.
 * The alternative, sorting `null` last as unknown, would dim the work being done
 * right now. `YYYY-MM` strings compare lexicographically in chronological order,
 * so a string is a sufficient key.
 */
export function recencyOf(duration: Duration, asOf: string): string {
  // Clamped to `asOf`, not merely defaulted to it. The schema bounds an
  // authored `end` to a horizon, but any `end` between the reference month and
  // that horizon would still outrank an ongoing engagement and invert the rule.
  // Clamping makes ongoing unbeatable on recency whatever the schema admits.
  const end = duration.end ?? asOf;
  return end > asOf ? asOf : end;
}

// --- Rule 1 of 3: mass ← duration -------------------------------------------

/**
 * Mass from engagement duration. A longer engagement is strictly more massive.
 *
 * `months` is the span from `durationInMonths`; `range` is the span range across
 * the whole authored set. The mapping is linear across a fixed span so that the
 * ordering is total and strict: doubling the months always increases mass, and
 * two equal spans always give equal mass. The absolute endpoints get tuned
 * against the greybox in a later epic — only the ordering is a contract here.
 */
export function deriveMass(months: number, range: Range): number {
  const MIN_MASS = 1;
  const MAX_MASS = 4;
  return MIN_MASS + normalize(months, range) * (MAX_MASS - MIN_MASS);
}

// --- Rule 2 of 3: luminance band ← recency ----------------------------------

/**
 * Luminance band from recency. A more recent engagement lands in a brighter
 * band, and no engagement ever leaves the resting range.
 *
 * `recency` and `range` are ordinal positions within the set's recency ordering
 * (oldest `0`), not months — the bands are a ranking, not an absolute age. The
 * return type cannot express `stroke-active` or `stroke-focus`, so a renderer
 * structurally cannot read camera state out of this value.
 */
export function deriveLuminanceBand(recency: number, range: Range): LuminanceBand {
  const t = normalize(recency, range);
  const index = Math.min(
    Math.floor(t * RESTING_BANDS.length),
    RESTING_BANDS.length - 1,
  );
  // `noUncheckedIndexedAccess`: the clamp above guarantees this, but the type
  // system cannot see it, and a non-null assertion would hide a real bug later.
  return RESTING_BANDS[index] ?? 'stroke-dust';
}

// --- Rule 3 of 3: distance from the Rail ← weight ---------------------------

/**
 * Distance from the Rail from `weight`. A greater `weight` sits closer in.
 *
 * `weight` is the one hand-authored tuning number, and this is the only rule it
 * feeds. The schema resolves its default to `1`, so `project.weight` is always a
 * positive number here and needs no `?? 1`. Inverse rather than subtractive so
 * the distance stays positive for any positive weight, however large — a
 * subtractive form would put a heavily weighted entry behind the Rail.
 */
export function deriveRailDistance(weight: Project['weight']): number {
  const BASE_DISTANCE = 10;
  return BASE_DISTANCE / weight;
}

// --- Projections: not rules, and structurally unable to become one ----------

/**
 * How dense a Body's mote field is, as a closed tier.
 *
 * Ordered sparsest first. A closed set rather than a float for the same reason
 * `LuminanceBand` is one: a numeric density would let a renderer scale it to
 * whatever it liked, and the tiers are a classification the derive layer owns.
 */
export type MoteTier = 'mote-sparse' | 'mote-medium' | 'mote-dense';

/** The mote tiers, sparsest first. Order is load-bearing; the tests index it. */
export const MOTE_TIERS = ['mote-sparse', 'mote-medium', 'mote-dense'] as const;

/**
 * Mote tier from `mass` and `isDeep` — both already on the graph.
 *
 * A projection, not a fourth mapping. It reads no authored field: `mass` is
 * rule 1's output and `isDeep` is the classification-by-absence Story 1.3 owns,
 * so nothing new reaches appearance through here. It exists in this story
 * because AD-14 requires the artifact to carry the tier and no other story in
 * the epic derives it — 1.6 is destinations, 1.7 is Dwell and Shots.
 *
 * **`isDeep` splits the ladder rather than shifting along it.** A Shallow Body
 * takes one of the two sparser tiers; a Deep Body takes one of the two denser
 * ones. So a Deep Body is *always* denser than a Shallow one of the same mass,
 * at every mass including the top of the range — which an offset-and-clamp would
 * not give: at the densest mass both would saturate on the top tier and the Deep
 * signal would vanish for exactly the entries most likely to carry it. UX-DR11
 * forbids brightness and size from carrying that signal, because FR-3 has bound
 * them to recency and duration, so the mote field is the channel left, and it
 * has to carry it everywhere rather than almost everywhere.
 *
 * The two bands overlap on the middle tier, which is deliberate: three tiers
 * cannot give two classes disjoint pairs, and the alternative — a fourth tier —
 * would let a renderer read the depth off the tier value alone and re-classify
 * from it. `isDeep` is on the entity for that.
 *
 * `mass` is normalized against the set's mass range rather than read absolutely,
 * so the tiers stay meaningful as `deriveMass`' provisional endpoints are tuned
 * against the greybox later.
 */
export function deriveMoteTier(mass: number, range: Range, isDeep: boolean): MoteTier {
  // Two tiers per class: Shallow spans indices 0..1, Deep spans 1..2. `< 0.5`
  // rather than a floor over a scaled span, so the split point is stated once.
  const dense = normalize(mass, range) >= 0.5;
  const index = (isDeep ? 1 : 0) + (dense ? 1 : 0);
  // `noUncheckedIndexedAccess`: `index` is 0..2 by construction, but the type
  // system cannot see it, and a non-null assertion would hide a real bug later.
  return MOTE_TIERS[index] ?? 'mote-sparse';
}

/**
 * The Skill tiers, innermost first (Story 3.5, D-A4). Order is load-bearing: a
 * renderer's orbit index *is* the tier's index here, so `mote-inner` sits on the
 * innermost orbit; the tests and the renderer index it.
 */
export const SKILL_TIERS = ['mote-inner', 'mote-middle', 'mote-outer'] as const;

/** How central a Skill is to the whole career, as a closed tier — one of `SKILL_TIERS`. */
export type SkillTier = (typeof SKILL_TIERS)[number];

/**
 * Skill tier from how many Projects share the Skill: three or more → inner,
 * two → middle, one → outer.
 *
 * A projection, not a fourth mapping. It reads a count over the authored set —
 * never a `Project`, never an authored field — and it reaches no *Body's*
 * appearance: it seats a Skill's Mote, the stack drawn geometrically (FR-13).
 * Closed rather than numeric for the same reason `MoteTier` is: a share count
 * handed to the renderer would let it invent its own thresholds.
 *
 * `shares` must be a whole number of Projects, at least 1: a Skill exists only
 * by being listed, so a count below one, a fraction, or a non-finite number is
 * an emitter bug, not a tier.
 *
 * @throws RangeError naming the count when it is not an integer ≥ 1.
 */
export function deriveSkillTier(shares: number): SkillTier {
  if (!Number.isInteger(shares) || shares < 1) {
    throw new RangeError(`a Skill's share count must be a whole number of Projects, at least 1; got ${String(shares)}.`);
  }
  if (shares >= 3) return 'mote-inner';
  if (shares === 2) return 'mote-middle';
  return 'mote-outer';
}

/**
 * Where a Body sits on the Fallback's time axis, as `0..1`. Oldest `0`.
 *
 * **This measures recency — the same quantity `deriveLuminanceBand` ranks — and
 * never `duration.start`.** It takes the identical `(recency, range)` pair, an
 * ordinal position in the set's recency ordering, so the two are projections of
 * one number and cannot separate: a brighter Body is always further along the
 * axis. The scene and the Fallback render the same data two ways, and ordering
 * their Bodies differently is the divergence AD-14 exists to prevent, so the
 * binding is pinned by a test over a fixture whose `duration.start` order
 * deliberately opposes its recency order.
 *
 * A `0..1` float rather than a closed set, because unlike luminance this is a
 * position on an axis rather than a step on a ladder — the Fallback lays entries
 * out continuously, and there is no reserved range to keep a value out of.
 */
export function deriveTimeAxis(recency: number, range: Range): number {
  return normalize(recency, range);
}
