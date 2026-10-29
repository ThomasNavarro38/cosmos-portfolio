/**
 * The live re-solve (5.5, FR-21): the solver, in the visitor's browser, run on
 * the `career.json` text the Colophon already holds.
 *
 * Reached by one dynamic import, `import('../derive/live.ts')` in
 * `src/colophon/colophon.tsx`, on the button press alone, so it is its own
 * lazy chunk: never on the entry graph and never in either renderer's
 * (`scripts/bundle-assertion.test.ts`). Its output is drawn in the Colophon as
 * a third exhibit and read by nothing else: the committed
 * `layout.generated.json` stays the only layout any renderer reads.
 *
 * **The same solver.** `solveLive` parses the text, holds it to `CareerSchema`,
 * takes its digest — sha256, lowercase hex, over the text with its line endings
 * normalised as `sourceDigestOf` normalises them — through
 * `globalThis.crypto.subtle`, and hands both to `solveArtifact`
 * (`pipeline.ts`), the step `npm run solve` calls, with the same seed. Under
 * Node it returns the committed artifact byte for byte (`live.test.ts`); in a
 * browser the force solve may settle differently (the Epic 5 retro observed it
 * byte-identical in Chrome 155), which is why the Colophon's framing (re-ruled
 * 2026-10-29, Epic 5 item 40) claims no outcome for this run: only that it is
 * the same solver on the same file, that the shipped layout.generated.json was
 * solved from that file and committed, and that the scene and the chart read
 * it, never this run.
 *
 * Browser-safe: no `node:*`, not `./index.ts` (the file system, the gate) and
 * not `../data/validate.ts` (the file reader). No network: the text arrives as
 * an argument.
 */

import { CareerSchema } from '../data/schema.ts';
import { serializeArtifact } from './artifact.ts';
import { normaliseLineEndings, solveArtifact } from './pipeline.ts';

/**
 * sha256 of the normalised UTF-8 text, as lowercase hex — `sourceDigestOf`'s
 * digest, by the platform's own hash. `crypto.subtle` exists only in a secure
 * context (HTTPS, or localhost): served over plain HTTP elsewhere, the solve
 * rejects naming that, rather than with a bare `TypeError` (logged to the
 * console by the Colophon, never drawn).
 */
async function digestOf(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) throw new Error('the live re-solve needs a secure context (crypto.subtle) to take its digest');
  const bytes = new TextEncoder().encode(normaliseLineEndings(text));
  const hash = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * The artifact solved from `careerText`, serialised as `npm run solve` writes
 * it. Rejects on text that is not JSON, a career the schema refuses, or a
 * derive or solve that refuses to emit.
 */
export async function solveLive(careerText: string): Promise<string> {
  const career = CareerSchema.parse(JSON.parse(careerText));
  const digest = await digestOf(careerText);
  return serializeArtifact(solveArtifact(career, digest));
}
