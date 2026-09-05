/**
 * The pipeline entry: validate → derive → solve → assemble → validate → write.
 *
 * Two modes, one file:
 *
 * - `node src/derive/index.ts` (`npm run solve`) runs the whole pipeline and
 *   writes `generated/layout.generated.json`.
 * - `node src/derive/index.ts --check` (the `build` gate) reads the *committed*
 *   artifact and validates it. It never solves and never writes.
 *
 * They live in one file rather than two scripts so the artifact path and its
 * schema are named in exactly one place — a gate validating a different path
 * from the one the emitter writes would pass while gating nothing — and so
 * `tsconfig.json`'s `include: ["src"]` covers the gate. A `scripts/` directory
 * would escape typecheck entirely.
 *
 * **Nothing here reads a clock, a random source, or the environment.** The
 * reference month comes from `career.json`, and the solve's randomness is a
 * seeded generator constructed below. Identical input, byte-identical output.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CareerSchema } from '../data/schema.ts';
import { readCareerFile, validateCareer } from '../data/validate.ts';
import { BANNER, buildArtifact, serializeArtifact, stripBanner } from './artifact.ts';
import { parseArtifact, validateArtifact, type Artifact } from './artifact-schema.ts';
import { deriveEntities } from './entities.ts';
import { solveLayout } from './solve.ts';

const CAREER_JSON = fileURLToPath(new URL('../data/career.json', import.meta.url));

/** The one path the artifact lives at, named once and used by both modes. */
export const ARTIFACT_PATH = fileURLToPath(
  new URL('../../generated/layout.generated.json', import.meta.url),
);

/**
 * The seed the solve's generator starts from.
 *
 * A constant, and deliberately not a clock, an environment variable, or an
 * argument. `solveLayout` requires an injected source; a source that varied
 * between runs would make the committed artifact churn on every solve for no
 * authored change, which is exactly the deliberateness AD-1 is about.
 */
const SOLVE_SEED = 1;

/**
 * The LCG `d3-force-3d` uses internally, constructed fresh here.
 *
 * Fresh per solve rather than module-level: a generator holding state across
 * calls would make a second solve in one process a different problem from the
 * first, and the byte-identical guarantee would quietly become a
 * first-run-only one.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => (state = (1664525 * state + 1013904223) % 4294967296) / 4294967296;
}

/** A pipeline outcome: the bytes to write, or the lines to print. */
export type PipelineResult =
  | { readonly ok: true; readonly contents: string }
  | { readonly ok: false; readonly failures: readonly string[] };

/**
 * Every check an assembled artifact must pass **before its bytes are written**.
 * Returns the failure lines, empty on success.
 *
 * Two of them: the document against its own declared schema, and the destination
 * set against the entities it addresses. Neither is redundant with the gate —
 * without them the *first* bad emission would be the one committed, and the gate
 * would only ever reject it afterwards, when the artifact on disk is already
 * wrong.
 *
 * Extracted from `runPipeline` rather than inlined there because of what it
 * costs to test. Both branches are unreachable from `runPipeline` with any
 * authored `career.json`: `buildArtifact` builds the destination set from the
 * same graph `checkDestinations` counts against, so they agree by construction,
 * and the schema check is likewise total over every shape the rules can emit.
 * That is the point — these are the guards that catch a *future* emitter bug, so
 * the only way to exercise them is to hand them the artifact such a bug would
 * produce. A function is the seam that allows it; a test asserting `runPipeline`
 * succeeds on good data would pin nothing at all.
 */
export function checkEmittedArtifact(artifact: Artifact): string[] {
  const schemaFailures = validateArtifact(artifact);
  if (schemaFailures.length > 0) {
    return ['the emitted artifact failed its own schema:', ...schemaFailures];
  }

  const destinationFailures = checkDestinations(artifact);
  if (destinationFailures.length > 0) {
    return ['the emitted destination set disagrees with its entities:', ...destinationFailures];
  }

  return [];
}

/**
 * Runs the whole pipeline in memory and returns the bytes the artifact should
 * carry — or the failure lines, having written nothing.
 *
 * Nothing is written until every stage has passed, including the emitted
 * document validating against its own schema and its destination set agreeing
 * with the entities it addresses. **A partially written artifact is worse than
 * none:** the build gate would accept a truncated document, and the failure
 * would surface as a missing Body in a scene rather than as a failed solve.
 */
export function runPipeline(careerPath: string = CAREER_JSON): PipelineResult {
  const read = readCareerFile(careerPath);
  if (!read.ok) return { ok: false, failures: [read.message] };

  // The same lines `npm run validate` prints, from the same function. A second
  // validation path here would be a second place the authored contract is
  // written down, and the two would disagree the first time either changed.
  const careerFailures = validateCareer(read.data);
  if (careerFailures.length > 0) {
    return { ok: false, failures: ['career.json failed validation:', ...careerFailures] };
  }

  const career = CareerSchema.parse(read.data);

  let contents: string;
  try {
    // The reference month is read off the authored file — never `new Date()`,
    // never an argument. This is the whole reason `asOf` is authored.
    const graph = deriveEntities(career, { asOf: career.asOf });
    const layout = solveLayout(graph, { randomSource: seededRandom(SOLVE_SEED) });
    const artifact = buildArtifact(graph, layout, career.asOf);

    // Every pre-write check, in one place, so the test suite can drive the exact
    // code this path runs. See `checkEmittedArtifact`.
    const emissionFailures = checkEmittedArtifact(artifact);
    if (emissionFailures.length > 0) {
      return { ok: false, failures: emissionFailures };
    }

    contents = serializeArtifact(artifact);
  } catch (error) {
    // `deriveEntities` and `solveLayout` throw on the conditions they refuse to
    // emit plausible-but-wrong data for — an ID collision, a non-finite
    // coordinate, a Project adopted by the wrong Star. Each message already
    // names the entity, so it is reported rather than re-wrapped.
    return { ok: false, failures: [error instanceof Error ? error.message : String(error)] };
  }

  return { ok: true, contents };
}

/**
 * Asserts a validated artifact's `destinations` against its own `clients` tree.
 * Returns the failure lines, empty on success.
 *
 * Four ways the list can diverge from the entities it addresses, and each names
 * the offending ID rather than reporting a count alone — "5 destinations, 6
 * entities" against a document holding fifteen Bodies is not a diagnosis:
 *
 * - a destination naming no entity in the tree (invented),
 * - the same ID listed twice (a keyboard walk that visits one Body twice),
 * - an entity no destination names (reachable by no input path at all),
 * - a `kind` contradicting what the ID resolves to.
 *
 * It walks the artifact only — no derive, no solve (AD-1). The set the *emitter*
 * produces is pinned by `destinations.test.ts`; this is the internal consistency
 * check the build can actually make.
 */
export function checkDestinations(artifact: Artifact): string[] {
  const failures: string[] = [];

  // The entities the document itself carries, in the same `client`/`project`
  // vocabulary the destination entries use.
  const entities = new Map<string, 'client' | 'project'>();
  // A `Map` keyed by ID collapses a collision silently, and the collapsed tree
  // would then agree with a destination set naming that ID once — a passing gate
  // on a document carrying two entities the input paths can only reach as one.
  // `entities.ts` throws on a collision at derive time, but the gate never
  // derives (AD-1), so a hand-edited or future-emitter document reaches here
  // with nothing else standing in the way.
  const claim = (id: string, kind: 'client' | 'project'): void => {
    const held = entities.get(id);
    if (held !== undefined) {
      failures.push(
        held === kind
          ? `"${id}" is carried by two ${kind}s in the artifact, so one of them is unreachable.`
          : `"${id}" is carried by two entities in the artifact — a ${held} and a ${kind}.`,
      );
      return;
    }
    entities.set(id, kind);
  };

  for (const client of artifact.clients) {
    claim(client.id, 'client');
    for (const project of client.projects) claim(project.id, 'project');
  }

  const seen = new Set<string>();
  for (const destination of artifact.destinations) {
    const kind = entities.get(destination.id);
    if (kind === undefined) {
      failures.push(
        `"${destination.id}" is a destination but no Client or Project in the artifact carries that ID.`,
      );
      continue;
    }
    if (kind !== destination.kind) {
      failures.push(
        `"${destination.id}" is listed as a "${destination.kind}" destination but resolves to a ${kind}.`,
      );
    }
    if (seen.has(destination.id)) {
      failures.push(`"${destination.id}" appears more than once in the destination set.`);
    }
    seen.add(destination.id);
  }

  for (const [id, kind] of entities) {
    if (!seen.has(id)) {
      failures.push(
        `the ${kind} "${id}" is in the artifact but not in the destination set, so no input path can reach it.`,
      );
    }
  }

  // Appended last, and only when something above already named an offending ID,
  // so the count reads as a summary of those failures rather than as a
  // substitute for them. On a passing document it is not reported at all — a
  // gate that printed "2 entities, 2 destinations" on success would be noise.
  if (failures.length > 0) {
    failures.push(
      `the artifact carries ${entities.size} entities and ${artifact.destinations.length} destinations.`,
    );
  }

  return failures;
}

/**
 * Reads and validates the committed artifact. Returns the failure lines, empty
 * on success.
 *
 * **This never solves and never writes** (AD-1). Deliberateness is a property of
 * the scripts, not of anyone's memory — a gate that regenerated a missing
 * artifact would make every solve implicit and the committed document a cache
 * rather than a contract.
 */
export function checkArtifact(path: string = ARTIFACT_PATH): string[] {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    // Only a genuinely absent file is a missing artifact. A permission error, or
    // a directory standing where the file should be, is a different problem —
    // and `npm run solve` is a fix that cannot resolve either one.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      return [
        `the layout artifact at ${path} could not be read: ${error instanceof Error ? error.message : String(error)}`,
      ];
    }
    return [
      `the layout artifact is missing at ${path}.`,
      'The build reads the committed artifact and never produces one — run `npm run solve` and commit the result.',
    ];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    return [
      `the layout artifact is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      'Do not hand-edit it — run `npm run solve` to regenerate.',
    ];
  }

  // One parse, and the typed document comes back with it. Validating here and
  // then re-parsing below to get something walkable would be two parses of one
  // document — two chances for them to disagree — and the second would be a
  // `.parse` that throws inside a function whose whole contract is returning
  // failure lines.
  const schema = parseArtifact(stripBanner(parsed));
  if (!schema.ok) {
    return [
      'the committed layout artifact failed its schema:',
      ...schema.failures,
      'Run `npm run solve` and commit the result.',
    ];
  }

  // The destination set against the entity tree in the *same document*. The
  // schema can only see one entry's shape at a time — it cannot tell that a
  // Project is missing from the list, named twice, or invented. This is the
  // divergence AD-15 is about: two input paths building from one list is only a
  // guarantee if the list actually addresses every entity and nothing else.
  //
  // Counted from the artifact's own `clients` tree, never from a fresh derive —
  // the gate never solves (AD-1). A destination set agreeing with a *stale*
  // entity tree still passes here; that is the pre-existing content-drift
  // limitation, and `npm test` is what catches it.
  //
  // After the schema, so a malformed artifact reports its real failure; before
  // the byte checks, so a structural fault is not reported as a formatting one.
  const cardinality = checkDestinations(schema.artifact);
  if (cardinality.length > 0) {
    return [
      'the committed layout artifact has a destination set that disagrees with its entities:',
      ...cardinality,
      'Run `npm run solve` and commit the result.',
    ];
  }

  // Two properties of the *bytes*, which the parse above discards: the banner
  // sits on line one and the newlines are LF. A document that validates but lost
  // either is one something other than `solve` wrote — exactly what the banner
  // warns against — so the gate checks them rather than leaving them to the
  // suite, which `build` never runs. They come last because a malformed or
  // wrong-shaped artifact should report that, not its formatting.
  if (!text.startsWith(`{ ${JSON.stringify('$banner')}: ${JSON.stringify(BANNER)},`)) {
    return [
      `the layout artifact at ${path} does not carry its generated-file banner on line one.`,
      'Do not hand-edit it — run `npm run solve` to regenerate.',
    ];
  }
  if (text.includes('\r')) {
    return [
      `the layout artifact at ${path} carries CRLF newlines; it is committed with LF.`,
      'Do not hand-edit it — run `npm run solve` to regenerate.',
    ];
  }
  return [];
}

function main(): void {
  // `engines` is advisory: npm does not enforce it without `engine-strict`. On
  // an older Node this file fails as a TypeScript syntax error, which names the
  // symptom rather than the cause.
  const major = Number(process.versions.node.split('.')[0]);
  if (Number.isFinite(major) && major < 24) {
    console.error(
      `the pipeline needs Node 24 or newer for native TypeScript support; this is Node ${process.versions.node}`,
    );
    process.exit(1);
  }

  const argv = process.argv.slice(2);

  if (argv.includes('--check')) {
    // The same optional-path seam the solve branch below carries, for the same
    // reason: a test driving the real `--check` against the committed artifact
    // would have to corrupt it and restore it, and an interrupt inside that
    // window leaves the working tree dirty and every later run red — failing in
    // whichever sibling reads the file next, not in the test that broke it.
    const failures = checkArtifact(argv.find((arg) => arg !== '--check') ?? ARTIFACT_PATH);
    if (failures.length > 0) {
      for (const line of failures) console.error(line);
      process.exit(1);
    }
    console.log('the layout artifact is present and valid.');
    return;
  }

  // An optional path argument, defaulting to the committed file — the same test
  // seam `validate.ts` carries, and for the same reason: `node --test` runs
  // suites in parallel, so a test that wrote into `src/` would break a sibling
  // suite for a reason unrelated to what it tests.
  const result = runPipeline(argv[0] ?? CAREER_JSON);
  if (!result.ok) {
    for (const line of result.failures) console.error(line);
    process.exit(1);
  }

  // A read-only file or a full disk would otherwise surface as a raw stack
  // trace, and a partial write would leave an artifact the gate then rejects
  // for a reason unrelated to the data.
  try {
    mkdirSync(dirname(ARTIFACT_PATH), { recursive: true });
    writeFileSync(ARTIFACT_PATH, result.contents);
  } catch (error) {
    console.error(
      `could not write ${ARTIFACT_PATH}: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
  console.log(`wrote ${ARTIFACT_PATH}`);
}

// Guarded so importing this module never exits the importing process — the
// idiom `src/data/validate.ts` uses.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
