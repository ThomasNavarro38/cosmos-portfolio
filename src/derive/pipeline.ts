/**
 * The solve step both runs share (5.5): `npm run solve` (`index.ts`'s
 * `runPipeline`, in Node) and the Colophon's live re-solve (`live.ts`, in the
 * browser) call the one function here, with the one seed and the one
 * generator, so "the same solver" is one code path and not two that agree.
 *
 * Pure and I/O-free: no `node:*`, no file, no clock, no network, no
 * environment. It takes a parsed career and the digest of its text and returns
 * the artifact. Reading the file, validating it, hashing it and writing the
 * result are each caller's own (Node's `createHash` there, `crypto.subtle`
 * here), but the text both hash is normalised by `normaliseLineEndings` below,
 * so a digest is the same whichever runtime takes it.
 *
 * **Nothing here reads a clock, a random source, or the environment.** The
 * reference month comes from the career itself, and the solve's randomness is
 * a seeded generator constructed per call. Identical input, byte-identical
 * output — within one engine: a browser's floating point may settle the force
 * solve differently from Node's, which is why the Colophon frames its re-solve
 * as the mechanism at work and not the shipped layout.
 */

import type { Career } from '../data/schema.ts';
import { buildArtifact } from './artifact.ts';
import type { Artifact } from './artifact-schema.ts';
import { deriveEntities } from './entities.ts';
import { solveLayout } from './solve.ts';

/**
 * The seed the solve's generator starts from.
 *
 * A constant, and deliberately not a clock, an environment variable, or an
 * argument. `solveLayout` requires an injected source; a source that varied
 * between runs would make the committed artifact churn on every solve for no
 * authored change, which is exactly the deliberateness AD-1 is about.
 */
export const SOLVE_SEED = 1;

/**
 * The LCG `d3-force-3d` uses internally, constructed fresh here.
 *
 * Fresh per solve rather than module-level: a generator holding state across
 * calls would make a second solve in one process a different problem from the
 * first, and the byte-identical guarantee would quietly become a
 * first-run-only one.
 */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => (state = (1664525 * state + 1013904223) % 4294967296) / 4294967296;
}

/**
 * The text a digest is taken over: every CRLF normalised to LF.
 *
 * Normalised so a checkout's line endings cannot fail the gate — a Windows
 * clone with `core.autocrlf` carries the same authored content in different
 * bytes, and the build must not tell the two apart. Every other byte counts.
 */
export function normaliseLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

/**
 * Graph → solve → artifact: the entities derived at the career's own `asOf`,
 * solved from `SOLVE_SEED`, and assembled with `sourceDigest`, the digest of
 * the text the career was parsed from. Throws on the conditions the derive and
 * the solve refuse to emit plausible-but-wrong data for, each naming its entity.
 */
export function solveArtifact(career: Career, sourceDigest: string): Artifact {
  // The reference month is read off the authored file — never `new Date()`,
  // never an argument. This is the whole reason `asOf` is authored.
  const graph = deriveEntities(career, { asOf: career.asOf });
  const layout = solveLayout(graph, { randomSource: seededRandom(SOLVE_SEED) });
  return buildArtifact(graph, layout, career.asOf, sourceDigest);
}
