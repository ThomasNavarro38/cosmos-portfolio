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
import { buildArtifact, serializeArtifact, stripBanner } from './artifact.ts';
import { validateArtifact } from './artifact-schema.ts';
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
 * Runs the whole pipeline in memory and returns the bytes the artifact should
 * carry — or the failure lines, having written nothing.
 *
 * Nothing is written until every stage has passed, including the emitted
 * document validating against its own schema. **A partially written artifact is
 * worse than none:** the build gate would accept a truncated document, and the
 * failure would surface as a missing Body in a scene rather than as a failed
 * solve.
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

    // The document validates against its own declared schema *before* it is
    // written. Without this the gate would only ever check artifacts that had
    // already been committed, so the first bad emission would be the one that
    // proved the schema wrong.
    const artifactFailures = validateArtifact(artifact);
    if (artifactFailures.length > 0) {
      return {
        ok: false,
        failures: ['the emitted artifact failed its own schema:', ...artifactFailures],
      };
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

  const failures = validateArtifact(stripBanner(parsed));
  if (failures.length > 0) {
    return [
      'the committed layout artifact failed its schema:',
      ...failures,
      'Run `npm run solve` and commit the result.',
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
    const failures = checkArtifact();
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
