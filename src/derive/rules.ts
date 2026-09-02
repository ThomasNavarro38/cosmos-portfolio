/**
 * The three mapping rules, and nothing else.
 *
 * FR-3 binds Body appearance to the career data through exactly three rules:
 * mass from `duration`, luminance band from recency, distance from the Rail from
 * `weight`. A fourth rule here is a spec violation, not a feature — if a
 * consumer needs another visual property, the answer is a schema-plus-derivation
 * change agreed first, never a fourth mapping quietly added alongside these.
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
