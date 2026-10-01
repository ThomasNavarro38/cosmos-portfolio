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
import { DWELL_TEMPOS } from './dwell.ts';
import { MOTE_TIERS, RESTING_BANDS } from './rules.ts';
import { SHOT_FRAMINGS } from './shots.ts';

/**
 * The artifact's shape version. A **literal** in the schema, not a range: an
 * artifact declaring any other version fails validation rather than being read
 * on a guess.
 *
 * It started at 1, became **2** when Story 1.6 added `destinations`, **3** when
 * Story 1.7 added `dwell` and `shots`, **4** when Story 2.1 added `rail`, and is
 * **5** now that Story 3.2 has added each Project's `orbitNormal`: each time
 * the contract's shape changed, the number it declares changed with it. An
 * artifact still carrying `4` publishes no orbit planes, and must fail rather
 * than be read by a scene that draws them — it would have to reconstruct each
 * plane from two positions, which do not carry the inclination.
 *
 * Every new field is **required**, not declared-and-empty. That is only possible
 * once something populates it — a required field nothing emits would have made
 * the artifact fail its own gate, which is precisely what the gate exists to
 * prevent, and is why each was deliberately absent until the story that emits it.
 */
export const SCHEMA_VERSION = 5;

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
 * The one tolerance an orbit plane is checked against, twice: how far a normal's
 * length may stray from 1, and how far (as a cosine) a Planet's offset from its
 * Star may stray from perpendicular to that normal.
 *
 * Both errors come from the same source — every component of a position and of a
 * normal is rounded to the solve's four places — and both stay well under `1e-3`
 * for any orbit radius above a tenth of a unit (the committed artifact's worst is
 * about `5e-5`). Anything further off is not a rounded orbit plane but a wrong one.
 *
 * `src/render-scene/stroke-model.ts` checks the same perpendicularity before it
 * draws an orbit, against its own `ORBIT_PLANE_TOLERANCE` of the same value: it may
 * not import this directory, so the value is mirrored, and
 * `stroke-model.test.ts` reads this file's literal as text and pins the two equal.
 */
export const ORBIT_PLANE_TOLERANCE = 1e-3;

/**
 * A Project's orbit plane, as its unit normal (Story 3.2).
 *
 * Unit length is refined, not assumed: a renderer builds the orbit's basis from
 * it, and a non-unit normal would draw a tilted or degenerate ellipse that still
 * looks like an orbit.
 */
const UnitVectorSchema = PositionSchema.refine(
  (v) => Math.abs(Math.hypot(v.x, v.y, v.z) - 1) <= ORBIT_PLANE_TOLERANCE,
  'must be a unit vector',
);

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
  // The plane the Project orbits its Star in, solved with its position (3.2).
  // Emitted so the scene draws the orbit rather than reconstructing it (AD-3).
  orbitNormal: UnitVectorSchema,
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

/**
 * One Client stop's Dwell: the entity it holds at, and the tempo class it is
 * held for.
 *
 * Closed at exactly two fields. **A tempo class, never a duration** — the union
 * cannot express a millisecond, a second, or a frame count, so a consumer
 * structurally cannot read a number out of it and no future emitter can put one
 * in. The numbers get tuned on the greybox at M1; a duration declared here would
 * be one tuned in this file instead.
 *
 * A **list keyed by entity ID**, not a record. A record cannot carry the same
 * key twice, so the duplicate a broken emitter would produce would be silently
 * collapsed rather than caught — and the gate's job is to name the offending ID.
 * The list is keyed all the same: `subject` is what a consumer looks a Client up
 * by, never an array position.
 */
const DwellSchema = z.strictObject({
  subject: z.string().min(1),
  tempo: z.enum(DWELL_TEMPOS),
});

/**
 * One Shot: the entity it frames, and how — angle, distance, framing.
 *
 * Closed at exactly four fields, and **no world coordinate anywhere** (FR-17).
 * `strictObject` is what makes that structural rather than a convention: an
 * emitter that started writing `x`, `y`, `z`, or a `position` fails the gate
 * rather than having it silently accepted, and re-settling the simulation
 * therefore leaves every Shot framing its intended subject.
 *
 * `angle` and `distance` are relative to the subject, so the pair names a way of
 * looking rather than a place to stand. `framing` is a closed class for the same
 * reason `luminanceBand` is: a free string would let a consumer invent framing
 * rules the derive layer never sanctioned.
 *
 * One per Client — the Rail stops at Clients (AD-4a) — and a hand-authored Shot
 * later displaces exactly one default by looking `subject` up on that key.
 */
const ShotSchema = z.strictObject({
  subject: z.string().min(1),
  // Bounded to a quarter-turn either side of the orbital plane, because that is
  // what an elevation *is*, and every framing worth having lies between.
  // Unbounded, the field accepts a wrapped radian value or a degrees-valued
  // number — `30` reads as a plausible elevation and is nearly five full turns —
  // and a consumer would take either as sanctioned by the derive layer.
  // Open, not closed: at exactly `±PI/2` the camera stands straight above or
  // below its subject, where `lookAt` has no defined roll, and the Rail rejects
  // it — so the gate does, before a visitor's browser has to.
  angle: z.number().finite().gt(-Math.PI / 2).lt(Math.PI / 2),
  distance: z.number().finite().positive(),
  framing: z.enum(SHOT_FRAMINGS),
});

/**
 * One Client in the artifact: a Rail stop, its Star's position, its Projects.
 *
 * **Each Project must lie in its own orbit plane.** A unit normal can still name a
 * plane the Planet is not in — tilted about the wrong axis — and the scene would
 * then fail to draw that orbit in a visitor's browser rather than here. The check
 * needs the Star's position and the Project's together, so it sits on the Client:
 * the cosine between the Planet's offset from its Star and its `orbitNormal` must
 * be within `ORBIT_PLANE_TOLERANCE` of zero. A Planet sitting exactly on its Star
 * has no offset to check and is rejected too — it has no orbit to draw.
 */
const ArtifactClientSchema = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    timeAxis: TimeAxisSchema,
    position: PositionSchema,
    projects: z.array(ArtifactProjectSchema).min(1),
  })
  .superRefine((client, ctx) => {
    client.projects.forEach((project, index) => {
      const offset = {
        x: project.position.x - client.position.x,
        y: project.position.y - client.position.y,
        z: project.position.z - client.position.z,
      };
      const radius = Math.hypot(offset.x, offset.y, offset.z);
      const normal = project.orbitNormal;
      const cosine =
        radius > 0 ? (offset.x * normal.x + offset.y * normal.y + offset.z * normal.z) / radius : Number.NaN;
      if (!(Math.abs(cosine) <= ORBIT_PLANE_TOLERANCE)) {
        ctx.addIssue({
          code: 'custom',
          path: ['projects', index, 'orbitNormal'],
          message:
            `"${project.id}" does not lie in its own orbit plane (cosine ${String(cosine)}); ` +
            'its offset from its Star must be perpendicular to its orbitNormal.',
        });
      }
    });
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
  // How long the journey rests at each Rail stop, as a tempo class — one entry
  // per Client and none for a Project, because the Rail stops at Clients
  // (AD-4a). Declared here because the schema is closed: an undeclared field is
  // not emitted at all, and Epic 2 would then pick a pacing of its own.
  dwell: z.array(DwellSchema),
  // The default composition for each Rail stop: an entity ID plus angle,
  // distance, and framing, with no world coordinate anywhere (FR-17). Its
  // cardinality against the `clients` tree is asserted by the build gate, not by
  // this schema, which can only see one entry's shape at a time.
  shots: z.array(ShotSchema),
  // The order the journey reaches the Rail's stops in — Client IDs, earliest
  // engagement first, ties by ID. **A bare list of IDs, in order**: the ordering
  // *is* the payload, so an entry carries nothing else and a consumer resolves
  // the Client by looking the ID up in the `clients` tree.
  //
  // Emitted rather than reconstructed because none of the document's other
  // orderings is this one — `clients[]` is `timeAxis` order and `destinations`
  // is ID order — and a consumer rebuilding it from `content.duration.start`
  // would put the Rail's sort key in a second place, where the two would drift.
  // Client-granular (AD-4a): one entry per Client, none naming a Project. That
  // cardinality is asserted by the build gate, not by this schema, which can
  // only see one entry at a time.
  rail: z.array(z.string().min(1)),
});

/** The emitted artifact, as a type. */
export type Artifact = z.infer<typeof ArtifactSchema>;

/** One Client in the artifact. */
export type ArtifactClient = z.infer<typeof ArtifactClientSchema>;

/** One Project in the artifact. */
export type ArtifactProject = z.infer<typeof ArtifactProjectSchema>;

/** One entry in the emitted destination set. */
export type Destination = z.infer<typeof DestinationSchema>;

/** One Client stop's Dwell: the entity it holds at, and its tempo class. */
export type Dwell = z.infer<typeof DwellSchema>;

/** One Shot: the entity it frames, and how. Never a world coordinate. */
export type Shot = z.infer<typeof ShotSchema>;

/**
 * The Rail's ordering: Client IDs in the order the journey reaches them.
 *
 * Named so a consumer types against "the Rail" rather than against a bare
 * `string[]`, which says nothing about what the strings are or why they are in
 * that order. Inferred from the schema like every other type here.
 *
 * `rail.ts` returns it from `buildRail`, so the producer and the document's own
 * declaration describe the value with one type rather than with two that agree
 * by coincidence. The shell is not among its consumers and cannot be:
 * `src/shell/` may never import `src/derive/`, type-only imports included, so
 * the index restates the slice it reads structurally instead.
 */
export type Rail = z.infer<typeof ArtifactSchema>['rail'];

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
