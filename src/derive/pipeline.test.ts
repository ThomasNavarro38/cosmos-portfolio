/**
 * `pipeline.ts` (5.5): the one solve step `npm run solve` and the Colophon's
 * live re-solve share.
 *
 * - `SOLVE_SEED` is 1 and `seededRandom` is d3-force-3d's LCG (known draws,
 *   and the constants read off the package's `lcg.js`), fresh per call;
 * - `normaliseLineEndings` turns every CRLF to LF and touches nothing else;
 * - `solveArtifact(shipped career, its digest)`, serialised, is the committed
 *   `layout.generated.json` (CRLF-normalised), and is what `runPipeline`
 *   returns;
 * - `runPipeline` reaches the solve only through `solveArtifact`, and its
 *   digest's normalisation is `normaliseLineEndings`;
 * - a source audit: no `node:*`, no file, clock, random source, environment or
 *   network, and no import of `./index.ts` or `../data/validate.ts`.
 *
 * Each audit is driven red by mutations of the real source.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { CareerSchema } from '../data/schema.ts';
import { serializeArtifact } from './artifact.ts';
import { findImports } from './boundaries.ts';
import { runPipeline, sourceDigestOf } from './index.ts';
import { SOLVE_SEED, normaliseLineEndings, seededRandom, solveArtifact } from './pipeline.ts';

const CAREER_TEXT = readFileSync(new URL('../data/career.json', import.meta.url), 'utf8');
const COMMITTED = normaliseLineEndings(readFileSync(new URL('../../generated/layout.generated.json', import.meta.url), 'utf8'));
const PIPELINE_SOURCE = readFileSync(new URL('./pipeline.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const INDEX_SOURCE = readFileSync(new URL('./index.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/** d3-force-3d's own LCG constants, read off the installed package's source rather than restated. */
function d3Lcg(): { readonly a: number; readonly c: number; readonly m: number } {
  const source = readFileSync(new URL('../../node_modules/d3-force-3d/src/lcg.js', import.meta.url), 'utf8');
  const constant = (name: string): number => Number(new RegExp(`const ${name} = (\\d+);`).exec(source)?.[1]);
  return { a: constant('a'), c: constant('c'), m: constant('m') };
}

test('the seed is 1, and the generator is d3-force-3d’s LCG, fresh per call', () => {
  assert.equal(SOLVE_SEED, 1);
  const a = seededRandom(SOLVE_SEED);
  const b = seededRandom(SOLVE_SEED);
  const drawn = Array.from({ length: 3 }, () => a());
  // Known values of s ← (1664525·s + 1013904223) mod 2³², from s = 1, over 2³².
  assert.deepEqual(drawn, [0.23645552527159452, 0.3692706737201661, 0.5042420323006809], 'the LCG’s first three draws from seed 1');
  assert.deepEqual(Array.from({ length: 3 }, () => b()), drawn, 'a second generator starts over');
  // And the constants those values come from are the package's own, read off its source.
  assert.deepEqual(d3Lcg(), { a: 1664525, c: 1013904223, m: 4294967296 }, 'd3-force-3d’s LCG constants');
  const { a: mul, c: inc, m: mod } = d3Lcg();
  let state = 1;
  assert.deepEqual(drawn, Array.from({ length: 3 }, () => (state = (mul * state + inc) % mod) / mod), 'the same draws as the package’s generator');
  assert.notDeepEqual(Array.from({ length: 3 }, seededRandom(2)), drawn, 'the seed counts');
});

test('normaliseLineEndings turns every CRLF to LF and nothing else', () => {
  assert.equal(normaliseLineEndings('a\r\nb\r\n'), 'a\nb\n');
  assert.equal(normaliseLineEndings('a\rb\n\r'), 'a\rb\n\r', 'a lone CR is a byte like any other');
  assert.equal(normaliseLineEndings(CAREER_TEXT.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')), CAREER_TEXT.replace(/\r\n/g, '\n'));
});

test('the shared step, on the shipped career, is the committed artifact, and is what runPipeline returns', () => {
  const career = CareerSchema.parse(JSON.parse(CAREER_TEXT));
  const solved = serializeArtifact(solveArtifact(career, sourceDigestOf(CAREER_TEXT)));
  assert.equal(solved, COMMITTED, 'byte for byte, line endings aside');
  const result = runPipeline();
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(result.contents, solved);
  // A second call is the same problem: nothing is carried between solves.
  assert.equal(serializeArtifact(solveArtifact(career, sourceDigestOf(CAREER_TEXT))), solved);
});

// --- runPipeline calls the shared step --------------------------------------------------------------

/** `index.ts`, audited: the solve reached only through `solveArtifact` from `./pipeline.ts`, the digest normalised by `normaliseLineEndings`. */
function auditIndex(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const failures: string[] = [];
  if (!/^import \{ normaliseLineEndings, solveArtifact \} from '\.\/pipeline\.ts';$/m.test(source)) failures.push('index.ts does not import normaliseLineEndings and solveArtifact from ./pipeline.ts');
  if ((code.match(/\bsolveArtifact\(/g) ?? []).length !== 1 || !/const artifact = solveArtifact\(career, sourceDigestOf\(read\.text\)\);/.test(source)) failures.push('runPipeline does not build its artifact by solveArtifact(career, sourceDigestOf(read.text))');
  if (/\b(?:solveLayout|deriveEntities|buildArtifact|seededRandom|SOLVE_SEED)\b/.test(code)) failures.push('index.ts solves on its own, beside solveArtifact');
  if (!/\.update\(normaliseLineEndings\(text\), 'utf8'\)/.test(source) || /\\r\\n/.test(code)) failures.push('sourceDigestOf does not normalise by normaliseLineEndings');
  return failures;
}

test('runPipeline reaches the solve through solveArtifact alone', () => {
  assert.deepEqual(auditIndex(INDEX_SOURCE), []);
});

test('the index audit rejects a solve of its own', () => {
  for (const [name, mutate] of [
    ['the import dropped', (s: string) => s.replace("import { normaliseLineEndings, solveArtifact } from './pipeline.ts';\n", '')],
    ['a solve of its own', (s: string) => s.replace('const artifact = solveArtifact(career, sourceDigestOf(read.text));', 'const graph = deriveEntities(career, { asOf: career.asOf });\n    const artifact = buildArtifact(graph, solveLayout(graph, { randomSource: seededRandom(2) }), career.asOf, sourceDigestOf(read.text));')],
    ['another digest', (s: string) => s.replace('solveArtifact(career, sourceDigestOf(read.text))', "solveArtifact(career, '')")],
    ['a normalisation of its own', (s: string) => s.replace('.update(normaliseLineEndings(text), ', ".update(text.replace(/\\r\\n/g, '\\n'), ")],
  ] as const) {
    const mutated = mutate(INDEX_SOURCE);
    assert.notEqual(mutated, INDEX_SOURCE, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditIndex(mutated), [], `"${name}" must be rejected`);
  }
});

// --- No I/O -------------------------------------------------------------------------------------------

const ADMITTED_IMPORTS = ['../data/schema.ts', './artifact.ts', './artifact-schema.ts', './entities.ts', './solve.ts'];

/** `pipeline.ts`, audited: the derive modules and the schema's type only; no clock, random source, environment, file or network. */
function auditPipeline(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const failures: string[] = [];
  const specifiers = findImports(source).map((found) => found.specifier);
  const strays = specifiers.filter((specifier) => specifier === null || !ADMITTED_IMPORTS.includes(specifier));
  if (strays.length > 0) failures.push(`pipeline.ts imports ${JSON.stringify(strays)}`);
  for (const [pattern, what] of [
    [/\bDate\b/, 'a clock'],
    [/\bperformance\b/, 'a clock'],
    [/\bMath\.random\b/, 'a random source'],
    [/\bcrypto\b/, 'a random source or a hash of its own'],
    [/\bprocess\b/, 'the environment'],
    [/\bimport\.meta\b/, 'its own location'],
    [/\bfetch\b|\bXMLHttpRequest\b/, 'the network'],
    [/\brequire\s*\(/, 'a require'],
  ] as const) {
    if (pattern.test(code)) failures.push(`pipeline.ts reaches ${what}`);
  }
  return failures;
}

test('pipeline.ts does no I/O', () => {
  assert.deepEqual(auditPipeline(PIPELINE_SOURCE), []);
});

test('the no-I/O audit rejects each reach', () => {
  for (const [name, mutate] of [
    ['node:fs', (s: string) => `import { readFileSync } from 'node:fs';\n${s}`],
    ['node:crypto', (s: string) => `import { createHash } from 'node:crypto';\n${s}`],
    ['the gate', (s: string) => `import { CAREER_JSON } from './index.ts';\n${s}`],
    ['the file reader', (s: string) => `import { readCareerFile } from '../data/validate.ts';\n${s}`],
    ['a clock', (s: string) => s.replace('const graph = deriveEntities(career, { asOf: career.asOf });', 'const graph = deriveEntities(career, { asOf: new Date().toISOString().slice(0, 7) });')],
    ['a random source', (s: string) => s.replace('randomSource: seededRandom(SOLVE_SEED)', 'randomSource: Math.random')],
    ['the environment', (s: string) => s.replace('export const SOLVE_SEED = 1;', 'export const SOLVE_SEED = Number(process.env.SEED ?? 1);')],
    ['the network', (s: string) => `${s}\nvoid fetch('/x');\n`],
  ] as const) {
    const mutated = mutate(PIPELINE_SOURCE);
    assert.notEqual(mutated, PIPELINE_SOURCE, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditPipeline(mutated), [], `"${name}" must be rejected`);
  }
});
