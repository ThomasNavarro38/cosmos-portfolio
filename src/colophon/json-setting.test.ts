/**
 * `json-setting.ts` (5.3): the runs concatenate to the input, for the two real
 * files and for every malformed fixture; for the real files, the key runs are,
 * as a multiset, every key of the parsed value and the value runs every scalar
 * leaf; each row of the spec's matrix (escapes, a space before the colon, a
 * string as a value, text that is not JSON, the empty text); and a source audit
 * holding the module import-free and parse-free (no `JSON.`), driven red by
 * mutations.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { jsonRuns, type JsonRun } from './json-setting.ts';

const CAREER = readFileSync(new URL('../data/career.json', import.meta.url), 'utf8');
const LAYOUT = readFileSync(new URL('../../generated/layout.generated.json', import.meta.url), 'utf8');
const SOURCE = readFileSync(new URL('./json-setting.ts', import.meta.url), 'utf8');

const joined = (runs: readonly JsonRun[]): string => runs.map((run) => run.text).join('');
const ofKind = (runs: readonly JsonRun[], kind: JsonRun['kind']): string[] => runs.filter((run) => run.kind === kind).map((run) => run.text);

/** Every key and every scalar leaf of a parsed value, the keys as `JSON.stringify` writes them. */
function walk(value: unknown, keys: string[], leaves: unknown[]): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, keys, leaves);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      keys.push(JSON.stringify(key));
      walk(item, keys, leaves);
    }
  } else {
    leaves.push(value);
  }
}

/** A scalar in one comparable form: numbers by `Number`, everything else as `JSON.stringify` writes it. */
const leafForm = (leaf: unknown): string => (typeof leaf === 'number' ? `number ${leaf}` : `text ${JSON.stringify(leaf)}`);
/** A run's own text read as JSON, so an escape written differently from `JSON.stringify`'s (`—`, `\/`) still compares equal; a run that does not parse never does. */
function runForm(text: string, kind: 'key' | 'value'): string {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return `unparsed ${text}`;
  }
  return kind === 'key' ? JSON.stringify(value) : leafForm(value);
}
const sorted = (items: readonly string[]): string[] => [...items].sort();

test('the real files: the runs concatenate to the text, the key runs are its keys and the value runs its scalar leaves', () => {
  for (const [name, text] of [['career.json', CAREER], ['layout.generated.json', LAYOUT]] as const) {
    assert.ok(text.length > 0, `${name} was read`);
    const runs = jsonRuns(text);
    assert.equal(joined(runs), text, `${name}: every byte, in order`);
    const keys: string[] = [];
    const leaves: unknown[] = [];
    walk(JSON.parse(text), keys, leaves);
    assert.ok(keys.length > 0 && leaves.length > 0, `${name} has keys and leaves`);
    assert.deepEqual(sorted(ofKind(runs, 'key').map((run) => runForm(run, 'key'))), sorted(keys), `${name}: the key runs are its keys`);
    assert.deepEqual(sorted(ofKind(runs, 'value').map((run) => runForm(run, 'value'))), sorted(leaves.map(leafForm)), `${name}: the value runs are its scalar leaves`);
    for (const structure of ofKind(runs, 'structure')) assert.match(structure, /^[{}[\]:,\s]+$/, `${name}: structure is punctuation and whitespace alone`);
    // Adjacent structure is merged: no two structure runs in a row.
    runs.forEach((run, index) => assert.ok(!(run.kind === 'structure' && runs[index + 1]?.kind === 'structure'), `${name}: structure run ${index} is merged`));
  }
});

test('the matrix: escapes, a space before the colon, a string as a value, every scalar', () => {
  assert.deepEqual(jsonRuns('{"a\\"b": "c\\\\"}'), [
    { kind: 'structure', text: '{' },
    { kind: 'key', text: '"a\\"b"' },
    { kind: 'structure', text: ': ' },
    { kind: 'value', text: '"c\\\\"' },
    { kind: 'structure', text: '}' },
  ]);
  assert.deepEqual(jsonRuns('{"k" : 1}'), [
    { kind: 'structure', text: '{' },
    { kind: 'key', text: '"k"' },
    { kind: 'structure', text: ' : ' },
    { kind: 'value', text: '1' },
    { kind: 'structure', text: '}' },
  ]);
  assert.deepEqual(jsonRuns('{"k"\n\t:\r\n1}')[1], { kind: 'key', text: '"k"' }, 'any JSON whitespace before the colon');
  assert.deepEqual(jsonRuns('["k", 1]'), [
    { kind: 'structure', text: '[' },
    { kind: 'value', text: '"k"' },
    { kind: 'structure', text: ', ' },
    { kind: 'value', text: '1' },
    { kind: 'structure', text: ']' },
  ]);
  assert.deepEqual(ofKind(jsonRuns('[-0.5e+3, 0, 12, true, false, null, "s"]'), 'value'), ['-0.5e+3', '0', '12', 'true', 'false', 'null', '"s"']);
  assert.deepEqual(ofKind(jsonRuns('{"a": {"b": [ "c" ]}}'), 'key'), ['"a"', '"b"']);
});

test('not JSON: no throw, the runs concatenate to the input, an unterminated string runs to the end as one value', () => {
  for (const text of ['oops {', '"abc', '{"a": "b', '{"a', '"\\', '- . e', '}{:,][', 'nul tru', '{"a" "b": 1}', '\u2028"é" : ✓']) {
    const runs = jsonRuns(text);
    assert.equal(joined(runs), text, `${JSON.stringify(text)}: every byte, in order`);
  }
  assert.deepEqual(jsonRuns('oops {'), [{ kind: 'structure', text: 'oops {' }]);
  assert.deepEqual(jsonRuns('"abc'), [{ kind: 'value', text: '"abc' }]);
  assert.deepEqual(jsonRuns('{"a": "b'), [
    { kind: 'structure', text: '{' },
    { kind: 'key', text: '"a"' },
    { kind: 'structure', text: ': ' },
    { kind: 'value', text: '"b' },
  ]);
  assert.deepEqual(jsonRuns('"\\'), [{ kind: 'value', text: '"\\' }], 'a trailing escape stays inside the string');
});

test('the empty text: no runs', () => {
  assert.deepEqual(jsonRuns(''), []);
});

// --- Marks spans, never parses ---------------------------------------------------------------------

/** `json-setting.ts` as source: no `JSON.` (nothing parsed or re-stringified) and no import. */
function auditSetting(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const failures: string[] = [];
  if (/\bJSON\s*\./.test(code)) failures.push('JSON. — the runs mark spans over the text, they never parse it');
  if (/^\s*import\b|\bimport\s*\(|\brequire\s*\(/m.test(code)) failures.push('an import — the module is import-free');
  return failures;
}

test('json-setting.ts parses nothing and imports nothing', () => {
  assert.deepEqual(auditSetting(SOURCE), []);
});

test('the setting audit rejects the real source with a parse or an import in it', () => {
  const real = SOURCE.replace(/\r\n/g, '\n');
  for (const [name, mutate] of [
    ['a parse', (s: string) => s.replace('const runs: JsonRun[] = [];', 'const runs: JsonRun[] = [];\n  JSON.parse(text);')],
    ['a re-stringify', (s: string) => s.replace("runs.push({ kind: 'value', text: scalar });", "runs.push({ kind: 'value', text: JSON.stringify(scalar) });")],
    ['an import', (s: string) => `import { tokens } from '../tokens/tokens.ts';\n${s}`],
    ['a dynamic import', (s: string) => s.replace('const runs: JsonRun[] = [];', "const runs: JsonRun[] = [];\n  void import('../derive/index.ts');")],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditSetting(mutated), [], `"${name}" must be rejected`);
  }
});
