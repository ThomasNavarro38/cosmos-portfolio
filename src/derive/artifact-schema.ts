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
 * It started at 1 and is **2** now that Story 1.6 added `destinations`: the
 * contract's shape changed, so the number it declares changed with it. An
 * artifact still carrying `1` has no destination set and must fail rather than
 * be read by a consumer that expects one.
 *
 * `dwell` and `shots` remain deliberately *absent* rather than
 * declared-and-empty — a required field nothing populates would make the emitted
 * artifact fail its own gate until Story 1.7 lands, which is precisely what the
 * gate exists to prevent. Story 1.7 adds them and bumps this number again.
 */
export const SCHEMA_VERSION = 2;

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

/**
 * One entry in the destination set: an entity ID and what kind of stop it is.
 *
 * Closed at exactly two fields, and deliberately so. A destination names an
 * entity; everything about that entity — `isDeep`, mass, band, position — is
 * resolved by looking the ID up in the `clients` tree. A coordinate, a
 * render-order index, or an array offset here would be a second copy of data the
 * document already carries, and the two would disagree the first time either
 * changed. `strictObject` makes adding one fail the gate rather than pass
 * silently.
 */
const DestinationSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.enum(['client', 'project']),
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
  // The **one** list both future input paths build from — the DOM index the
  // keyboard walks and the pointer raycast target set (AD-15). Declared here
  // because the schema is closed: an undeclared field is not emitted at all, and
  // each consumer would then infer its own reachable set. Its cardinality
  // against the `clients` tree is asserted by the build gate, not by this
  // schema, which can only see one entry's shape at a time.
  destinations: z.array(DestinationSchema),
});

/** The emitted artifact, as a type. */
export type Artifact = z.infer<typeof ArtifactSchema>;

/** One Client in the artifact. */
export type ArtifactClient = z.infer<typeof ArtifactClientSchema>;

/** One Project in the artifact. */
export type ArtifactProject = z.infer<typeof ArtifactProjectSchema>;

/** One entry in the emitted destination set. */
export type Destination = z.infer<typeof DestinationSchema>;

/** A solved position, as the artifact carries it. */
export type ArtifactPosition = z.infer<typeof PositionSchema>;

/** A validated artifact, or the lines its failure should print. */
export type ArtifactParse =
  | { readonly ok: true; readonly artifact: Artifact }
  | { readonly ok: false; readonly failures: string[] };

/**
 * Validates a parsed artifact **and hands back the typed document** on success.
 * Never throws.
 *
 * The typed value is returned rather than discarded because a caller that needs
 * both — the gate needs the failure lines *and* the document, to assert the
 * destination set against the entity tree — would otherwise parse twice: once to
 * validate and once to get a value it could walk. Two parses of one document is
 * two chances for them to disagree, and the second one is invariably a `.parse`
 * that throws inside a function whose whole contract is returning failure lines.
 *
 * Each line names the failing **path**, because "invalid input" against a
 * document holding fifteen Bodies is not a diagnosis.
 */
export function parseArtifact(raw: unknown): ArtifactParse {
  const result = ArtifactSchema.safeParse(raw);
  if (result.success) return { ok: true, artifact: result.data };

  return {
    ok: false,
    failures: result.error.issues.map((issue) => {
      const path = issue.path.map((segment) => String(segment)).join('.');
      return path === '' ? issue.message : `${path}: ${issue.message}`;
    }),
  };
}

/**
 * Validates a parsed artifact. Returns the lines a failure should print, empty
 * on success — never throws.
 *
 * The same result-value shape `validateCareer` uses, for the same reason: the
 * caller decides what a failure means. `index.ts` prints them and exits 1; a
 * test reads them directly.
 *
 * A thin projection of `parseArtifact`, never a second `safeParse`: the failure
 * lines are formatted in exactly one place, so the gate and a test reading them
 * directly can never see different text for one document.
 */
export function validateArtifact(raw: unknown): string[] {
  const result = parseArtifact(raw);
  return result.ok ? [] : result.failures;
}
