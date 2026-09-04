/**
 * The shape of `generated/layout.generated.json`, declared as a versioned schema.
 *
 * This is the contract every later epic reads and no later epic re-derives. It
 * is declared here rather than left implicit because an undeclared contract is
 * no contract: the scene and the Fallback would each infer a shape from whatever
 * the emitter happened to write, and the first divergence between them would
 * surface as a rendering bug rather than as a failed build (AD-14).
 *
 * The schema is **closed** at every level. `strictObject` throughout, for the
 * same reason `CareerSchema` uses it: a consumer that starts writing a field
 * nobody declared must fail the gate rather than have it silently accepted.
 *
 * Pure: no I/O, no clock. `index.ts` owns reading and writing.
 */

import { z } from 'zod';
import { ProjectSchema } from '../data/schema.ts';
import { MOTE_TIERS, RESTING_BANDS } from './rules.ts';

/**
 * The artifact's shape version. A **literal** in the schema, not a range: an
 * artifact declaring any other version fails validation rather than being read
 * on a guess.
 *
 * It starts at 1 and the schema is closed. `dwell`, `shots`, and `destinations`
 * are deliberately *absent* rather than declared-and-empty — a required field
 * nothing populates would make the emitted artifact fail its own gate until
 * Story 1.7 lands, which is precisely what the gate exists to prevent. Stories
 * 1.6 and 1.7 each add their fields and bump this number.
 */
export const SCHEMA_VERSION = 1;

/** ISO 8601 year-month, matching the authored form exactly. */
const IsoYearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be an ISO 8601 year-month, e.g. "2019-03"');

/**
 * A solved position in scene space.
 *
 * Finite is asserted, not assumed: `JSON.stringify` writes `NaN` and `Infinity`
 * as `null`, so an unguarded coordinate would reach a consumer as
 * plausible-but-absent data rather than as a failure. `z.number()` already
 * rejects `null`, and `.finite()` closes the remaining case where a coordinate
 * is written by something other than `JSON.stringify`.
 */
const PositionSchema = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

/**
 * The Fallback's time-axis scalar: `0..1`, oldest `0`.
 *
 * Bounded, because it is a normalized position on an axis rather than a free
 * number — a value outside the range means the derivation is broken, and the
 * gate should say so rather than let the Fallback lay out past its own extent.
 */
const TimeAxisSchema = z.number().min(0).max(1);

/**
 * One Project in the artifact: everything a surface renders, derived and
 * authored alike.
 *
 * `content` carries the **whole** authored record — `ProjectSchema` itself, not
 * a projection of it. Content parity is absolute (FR-22): the Fallback admits no
 * truncation, and a consumer needing a field must never reach back into
 * `src/data/` to find it. Reusing the authored schema rather than restating its
 * fields is what makes that structural: a field added to the authored record
 * appears here automatically, and cannot be forgotten.
 */
const ArtifactProjectSchema = z.strictObject({
  id: z.string().min(1),
  clientId: z.string().min(1),
  isDeep: z.boolean(),
  mass: z.number().finite().positive(),
  luminanceBand: z.enum(RESTING_BANDS),
  railDistance: z.number().finite().positive(),
  moteTier: z.enum(MOTE_TIERS),
  timeAxis: TimeAxisSchema,
  position: PositionSchema,
  content: ProjectSchema,
});

/** One Client in the artifact: a Rail stop, its Star's position, its Projects. */
const ArtifactClientSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  timeAxis: TimeAxisSchema,
  position: PositionSchema,
  projects: z.array(ArtifactProjectSchema).min(1),
});

/**
 * The whole emitted document.
 *
 * `$banner` is deliberately **not** declared. JSON has no comment syntax, so the
 * generated-file banner AD-13 requires is carried as a `$banner` field that
 * `serializeArtifact` lifts onto line one and `stripBanner` removes before
 * validation. Declaring it here would put a human-readable warning into the
 * machine contract every consumer types against; accepting it silently would let
 * an arbitrary unvalidated field ride along. Neither — the banner is a property
 * of the file's *serialization*, not of the document.
 */
export const ArtifactSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  asOf: IsoYearMonth,
  clients: z.array(ArtifactClientSchema),
});

/** The emitted artifact, as a type. */
export type Artifact = z.infer<typeof ArtifactSchema>;

/** One Client in the artifact. */
export type ArtifactClient = z.infer<typeof ArtifactClientSchema>;

/** One Project in the artifact. */
export type ArtifactProject = z.infer<typeof ArtifactProjectSchema>;

/** A solved position, as the artifact carries it. */
export type ArtifactPosition = z.infer<typeof PositionSchema>;

/**
 * Validates a parsed artifact. Returns the lines a failure should print, empty
 * on success — never throws.
 *
 * The same result-value shape `validateCareer` uses, for the same reason: the
 * caller decides what a failure means. `index.ts` prints them and exits 1; a
 * test reads them directly.
 *
 * Each line names the failing **path**, because "invalid input" against a
 * document holding fifteen Bodies is not a diagnosis.
 */
export function validateArtifact(raw: unknown): string[] {
  const result = ArtifactSchema.safeParse(raw);
  if (result.success) return [];

  return result.error.issues.map((issue) => {
    const path = issue.path.map((segment) => String(segment)).join('.');
    return path === '' ? issue.message : `${path}: ${issue.message}`;
  });
}
