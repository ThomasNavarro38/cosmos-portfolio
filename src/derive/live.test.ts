/**
 * `live.ts` (5.5): the Colophon's live re-solve, held to the framing's claim
 * "the same solver". Determinism is a same-engine guarantee, so this proves
 * the browser module is the *same mechanism* by matching the committed
 * artifact under Node's engine:
 *
 * - `solveLive(shipped career.json text)` is the committed
 *   `layout.generated.json`, CRLF-normalised, and a CRLF copy of the text
 *   solves to the same bytes;
 * - its `sourceDigest` is `sourceDigestOf` of the text, for the shipped text
 *   and for an altered one;
 * - text that is not JSON, and a career the schema refuses, reject;
 * - a source audit: no `node:*`, no `./index.ts`, no `../data/validate.ts`, no
 *   `fetch`, and the solve is `solveArtifact` from `./pipeline.ts`, each driven
 *   red by a mutation.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { parseArtifact, validateArtifact } from './artifact-schema.ts';
import { stripBanner } from './artifact.ts';
import { findImports } from './boundaries.ts';
import { sourceDigestOf } from './index.ts';
import { solveLive } from './live.ts';

const CAREER_TEXT = readFileSync(new URL('../data/career.json', import.meta.url), 'utf8');
const COMMITTED = readFileSync(new URL('../../generated/layout.generated.json', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const SOURCE = readFileSync(new URL('./live.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('the shipped career.json, solved live, is the committed artifact', async () => {
  assert.equal(await solveLive(CAREER_TEXT), COMMITTED);
});

test('line endings do not change the solve', async () => {
  const lf = CAREER_TEXT.replace(/\r\n/g, '\n');
  assert.equal(await solveLive(lf.replace(/\n/g, '\r\n')), await solveLive(lf));
});

test('the digest is sourceDigestOf’s, for the shipped text and an altered one', async () => {
  const digestOf = async (text: string): Promise<string> => (JSON.parse(await solveLive(text)) as { sourceDigest: string }).sourceDigest;
  assert.equal(await digestOf(CAREER_TEXT), sourceDigestOf(CAREER_TEXT));
  // An insignificant byte (one more space of trailing whitespace) changes the digest and nothing the schema reads.
  const altered = `${CAREER_TEXT} `;
  assert.notEqual(sourceDigestOf(altered), sourceDigestOf(CAREER_TEXT));
  assert.equal(await digestOf(altered), sourceDigestOf(altered));
});

test('text that is not JSON, or a career the schema refuses, rejects', async () => {
  await assert.rejects(solveLive('not json'), SyntaxError);
  await assert.rejects(solveLive(''), SyntaxError);
  await assert.rejects(solveLive('{}'), (error: Error) => error.name === 'ZodError');
  const career = JSON.parse(CAREER_TEXT) as { asOf: unknown };
  career.asOf = 'yesterday';
  await assert.rejects(solveLive(JSON.stringify(career)), (error: Error) => error.name === 'ZodError');
});

test('the live output meets the emitted-artifact contract', async () => {
  const text = await solveLive(CAREER_TEXT);
  const parsed = parseArtifact(stripBanner(JSON.parse(text)));
  assert.ok(parsed.ok, JSON.stringify(parsed));
  assert.deepEqual(validateArtifact(stripBanner(JSON.parse(text))), [], 'no schema failure');
});

test('without crypto.subtle (an insecure context), the solve rejects naming it', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  assert.ok(descriptor?.configurable, 'globalThis.crypto can be stubbed');
  for (const stub of [undefined, {}]) {
    Object.defineProperty(globalThis, 'crypto', { value: stub, configurable: true, writable: true });
    try {
      await assert.rejects(solveLive(CAREER_TEXT), /needs a secure context \(crypto\.subtle\)/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', descriptor as PropertyDescriptor);
    }
  }
  assert.equal(await solveLive(CAREER_TEXT), COMMITTED, 'restored');
});

// --- Browser-safe --------------------------------------------------------------------------------------

/** `live.ts`, audited: no Node module, not the gate, not the file reader, no network; the solve is `pipeline.ts`'s, the hash the platform's. */
function auditLive(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const failures: string[] = [];
  const specifiers = findImports(source).map((found) => found.specifier ?? '(unreadable)');
  for (const specifier of specifiers) {
    if (specifier.startsWith('node:') || ['crypto', 'fs', 'path', 'url'].includes(specifier)) failures.push(`live.ts imports the Node module ${specifier}`);
    if (/(?:^|\/)index\.ts$/.test(specifier)) failures.push(`live.ts imports ${specifier}, the gate`);
    if (/(?:^|\/)validate\.ts$/.test(specifier)) failures.push(`live.ts imports ${specifier}, the file reader`);
  }
  if (/\bfetch\b|\bXMLHttpRequest\b/.test(code)) failures.push('live.ts reaches the network');
  if (/\brequire\s*\(/.test(code)) failures.push('live.ts requires');
  if (!/^import \{ normaliseLineEndings, solveArtifact \} from '\.\/pipeline\.ts';$/m.test(source) || !/return serializeArtifact\(solveArtifact\(career, digest\)\);/.test(source)) {
    failures.push('live.ts does not solve by solveArtifact from ./pipeline.ts');
  }
  if (/\b(?:solveLayout|deriveEntities|buildArtifact|seededRandom)\b/.test(code)) failures.push('live.ts solves on its own, beside solveArtifact');
  if (!/const subtle = globalThis\.crypto\?\.subtle;/.test(source) || !/subtle\.digest\('SHA-256', /.test(source)) failures.push('live.ts does not hash by crypto.subtle');
  if (!/if \(subtle === undefined\) throw new Error\(/.test(source)) failures.push('live.ts does not guard an insecure context');
  return failures;
}

test('live.ts is browser-safe and calls the shared step', () => {
  assert.deepEqual(auditLive(SOURCE), []);
});

test('the browser-safe audit rejects each break', () => {
  for (const [name, mutate] of [
    ['node:crypto', (s: string) => s.replace("import { CareerSchema } from '../data/schema.ts';", "import { createHash } from 'node:crypto';\nimport { CareerSchema } from '../data/schema.ts';")],
    ['the gate', (s: string) => s.replace("import { CareerSchema } from '../data/schema.ts';", "import { sourceDigestOf } from './index.ts';\nimport { CareerSchema } from '../data/schema.ts';")],
    ['the file reader', (s: string) => s.replace("import { CareerSchema } from '../data/schema.ts';", "import { validateCareer } from '../data/validate.ts';\nimport { CareerSchema } from '../data/schema.ts';")],
    ['a dynamic import of the gate', (s: string) => `${s}\nconst gate = () => import('./index.ts');\n`],
    ['a fetch', (s: string) => s.replace('export async function solveLive(careerText: string): Promise<string> {', "export async function solveLive(careerText: string): Promise<string> {\n  await fetch('/career.json');")],
    ['a solve of its own', (s: string) => s.replace('return serializeArtifact(solveArtifact(career, digest));', 'return serializeArtifact(buildArtifact(deriveEntities(career, { asOf: career.asOf }), solveLayout(deriveEntities(career, { asOf: career.asOf }), { randomSource: Math.random }), career.asOf, digest));')],
    ['the shared step not imported', (s: string) => s.replace("import { normaliseLineEndings, solveArtifact } from './pipeline.ts';", "import { normaliseLineEndings, solveArtifact } from './pipeline-copy.ts';")],
    ['another hash', (s: string) => s.replace("subtle.digest('SHA-256', ", "subtle.digest('SHA-1', ")],
    ['the secure-context guard dropped', (s: string) => s.replace(/  if \(subtle === undefined\) throw new Error\([^\n]*\n/, '')],
  ] as const) {
    const mutated = mutate(SOURCE);
    assert.notEqual(mutated, SOURCE, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditLive(mutated), [], `"${name}" must be rejected`);
  }
});
