/**
 * `credits.ts` (8.2, AD-21): the ruled copy, verbatim; `creditLine` on every
 * `MAP_LIBRARY` entry, each line closed by exactly one `.`; `startCredits`,
 * the Colophon's load on open, against a fake loader, case by case through
 * the spec's matrix — shown once, a failed load reported once and nothing
 * shown, nothing after the stop, a synchronous throw or a module with no
 * library a failure reported once, and the unworn map listed like the others;
 * and two source audits: the module imports nothing, and no file shipped from
 * `src/colophon/` writes a URL, since every `href` arrives with the library.
 *
 * Only in tests — here and in `colophon.test.ts` — does anything under
 * `src/colophon/` read `../derive/map-library.ts` directly: the shipped modules
 * reach it only through `colophon.tsx`'s one dynamic import of
 * `src/derive/live.ts`.
 *
 * Every `sourceUrl` parses as an absolute `https:` URL, so no `javascript:`,
 * `http:` or empty `href` can reach a credit link.
 */

import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { APPEARANCE, creditLine, startCredits, type CreditEntry, type CreditLibrary, type LoadCredits } from './credits.ts';

// The library is read here as the shipped page reads it, through a dynamic import: a Colophon module reaches src/derive/ no other way (the boundary gate holds tests to it too).
const { MAP_LIBRARY } = await import('../derive/map-library.ts');

const SOURCE = readFileSync(new URL('./credits.ts', import.meta.url), 'utf8');
const LAYOUT = readFileSync(new URL('../../generated/layout.generated.json', import.meta.url), 'utf8');

// --- The copy -----------------------------------------------------------------------------------------

test('the copy is the ruling’s, verbatim (Thomas, 2026-11-16, Q1)', () => {
  assert.deepEqual(APPEARANCE, {
    heading: 'what a Planet looks like',
    statement:
      "A Planet's surface is not data. Each Planet is assigned one of the maps below from its ID alone, by a fixed rule in the solver, so its colour and texture encode nothing: recency is the outline's brightness, the subject is the white stroke, and Deep or Shallow is the Ring and the Moon.",
    lead: 'Every map this site serves, worn or not:',
    source: 'source',
  });
  assert.deepEqual(Object.keys(APPEARANCE), ['heading', 'statement', 'lead', 'source'], 'in the order the page draws them');
});

// --- Each entry's line --------------------------------------------------------------------------------

test('creditLine: every library entry, `<id>.webp: <credit>, <licence>`, closed by exactly one `.`', () => {
  assert.ok(MAP_LIBRARY.length > 0, 'the library lists maps');
  for (const entry of MAP_LIBRARY) {
    const line = creditLine(entry);
    assert.ok(line.startsWith(`${entry.id}.webp: ${entry.credit}, ${entry.licence}`), `${entry.id}: the file, the credit, the licence`);
    assert.ok(entry.licence.endsWith('.'), `${entry.id}: its licence already ends in .`);
    assert.equal(line, `${entry.id}.webp: ${entry.credit}, ${entry.licence}`, `${entry.id}: no second . is added`);
    assert.ok(line.endsWith('.') && !line.endsWith('..'), `${entry.id}: exactly one closing .`);
  }
});

test('every sourceUrl is an absolute https: URL, so no javascript:, http: or empty href reaches a credit link', () => {
  for (const entry of MAP_LIBRARY) {
    let parsed: URL | undefined;
    assert.doesNotThrow(() => (parsed = new URL(entry.sourceUrl)), `${entry.id}: ${JSON.stringify(entry.sourceUrl)} parses as a URL`);
    assert.equal(parsed?.protocol, 'https:', `${entry.id}: its source is served over https`);
  }
  // The check is red against what it guards.
  for (const bad of ['javascript:alert(1)', 'http://svs.gsfc.nasa.gov/4720', '', '/textures/moon.webp']) {
    let protocol: string | undefined;
    try {
      protocol = new URL(bad).protocol;
    } catch {
      protocol = undefined;
    }
    assert.notEqual(protocol, 'https:', `${JSON.stringify(bad)} must be rejected`);
  }
});

test('creditLine: a licence without its `.` is given one, and one only', () => {
  const entry: CreditEntry = { id: 'x', sourceUrl: 'about:blank', licence: 'Public domain', credit: 'Someone' };
  assert.equal(creditLine(entry), 'x.webp: Someone, Public domain.');
  assert.equal(creditLine({ ...entry, licence: 'Public domain.' }), 'x.webp: Someone, Public domain.');
});

// --- The load, through the matrix ---------------------------------------------------------------------

/** A deferred value, settled from outside. */
function deferred<T>(): { readonly promise: Promise<T>; resolve(value: T): void; reject(error: unknown): void } {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((yes, no) => ((resolve = yes), (reject = no)));
  promise.catch(() => undefined);
  return { promise, resolve, reject };
}

/** Every pending callback run. */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** A loader whose chunk the test settles, recording each call's arguments, and what was shown or failed. */
function fake(): { readonly load: LoadCredits; readonly chunk: ReturnType<typeof deferred<CreditLibrary>>; readonly loads: unknown[][]; readonly shown: (readonly CreditEntry[])[]; readonly failed: unknown[]; show(library: readonly CreditEntry[]): void; fail(error: unknown): void } {
  const chunk = deferred<CreditLibrary>();
  const loads: unknown[][] = [];
  const shown: (readonly CreditEntry[])[] = [];
  const failed: unknown[] = [];
  const load: LoadCredits = (...args: unknown[]) => {
    loads.push(args);
    return chunk.promise;
  };
  return { load, chunk, loads, shown, failed, show: (library) => void shown.push(library), fail: (error) => void failed.push(error) };
}

test('open: the loader is called once with nothing, and the library shown once, as the chunk carries it', async () => {
  const run = fake();
  startCredits(run.load, run.show, run.fail);
  await settle();
  assert.deepEqual(run.loads, [[]], 'called once, with nothing');
  assert.deepEqual(run.shown, [], 'nothing shown before the chunk arrives');
  run.chunk.resolve({ MAP_LIBRARY });
  await settle();
  assert.equal(run.shown.length, 1, 'shown once');
  assert.equal(run.shown[0], MAP_LIBRARY, 'the library itself, in library order');
  assert.deepEqual(run.failed, []);
  await settle();
  assert.equal(run.shown.length, 1, 'and never again');
});

test('the library fails: the chunk rejects, reported once, and nothing shown', async () => {
  const run = fake();
  startCredits(run.load, run.show, run.fail);
  const error = new Error('the chunk did not load');
  run.chunk.reject(error);
  await settle();
  assert.deepEqual(run.failed, [error], 'reported once, the error itself');
  assert.deepEqual(run.shown, []);
});

test('unmount mid-load: after the stop, neither show nor fail, whichever arrives', async () => {
  for (const outcome of ['resolve', 'reject'] as const) {
    const run = fake();
    const stop = startCredits(run.load, run.show, run.fail);
    stop();
    if (outcome === 'resolve') run.chunk.resolve({ MAP_LIBRARY });
    else run.chunk.reject(new Error('late'));
    await settle();
    assert.deepEqual([run.shown, run.failed], [[], []], `a late ${outcome} is not applied`);
  }
  // Stopped after the load began but before it settled.
  const run = fake();
  const stop = startCredits(run.load, run.show, run.fail);
  await settle();
  assert.deepEqual(run.loads, [[]], 'the load had begun');
  stop();
  run.chunk.resolve({ MAP_LIBRARY });
  await settle();
  assert.deepEqual([run.shown, run.failed], [[], []], 'nothing applied');
});

test('a loader that throws synchronously, or a chunk with no library list, is a failure reported once', async () => {
  const shown: unknown[] = [];
  const failed: unknown[] = [];
  const error = new Error('thrown at once');
  startCredits(
    () => {
      throw error;
    },
    (library) => void shown.push(library),
    (reason) => void failed.push(reason),
  );
  await settle();
  assert.deepEqual([shown, failed], [[], [error]], 'the throw is the one failure');
  for (const module of [{}, { MAP_LIBRARY: null }, { MAP_LIBRARY: { moon: {} } }]) {
    const run = fake();
    startCredits(run.load, run.show, run.fail);
    run.chunk.resolve(module as unknown as CreditLibrary);
    await settle();
    assert.equal(run.failed.length, 1, `${JSON.stringify(module)} is reported once`);
    assert.match(String(run.failed[0]), /no MAP_LIBRARY list/);
    assert.deepEqual(run.shown, [], 'and nothing shown');
  }
});

/** The layout's Planets, as the committed file writes them: each Project's appearance, when it has one. */
type WornLayout = { readonly clients?: readonly { readonly projects?: readonly { readonly appearance?: { readonly map?: unknown } }[] }[] };

test('the unworn map: jupiter, worn by no Planet in the committed layout, has its line like the others', async () => {
  const layout = JSON.parse(LAYOUT) as WornLayout;
  const worn = new Set((layout.clients ?? []).flatMap((client) => (client.projects ?? []).flatMap((project) => (typeof project.appearance?.map === 'string' ? [project.appearance.map] : []))));
  assert.ok(worn.size > 0, 'the committed layout’s Planets wear maps');
  assert.ok(!worn.has('jupiter'), 'jupiter is worn by no Planet');
  const jupiter = MAP_LIBRARY.find((entry) => entry.id === 'jupiter');
  assert.ok(jupiter !== undefined, 'jupiter is in the library');
  const run = fake();
  startCredits(run.load, run.show, run.fail);
  run.chunk.resolve({ MAP_LIBRARY });
  await settle();
  const lines = (run.shown[0] ?? []).map(creditLine);
  assert.equal(lines.length, MAP_LIBRARY.length, 'one line per library map, worn or not');
  assert.ok(lines.includes(creditLine(jupiter)), 'jupiter still gets its credit line');
  assert.match(creditLine(jupiter), /^jupiter\.webp: NASA\/JPL\/Space Science Institute, /, 'its credit as given (ruling Q3 (a))');
});

// --- Import-free --------------------------------------------------------------------------------------

function auditSource(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  return /^\s*import\b|\bimport\s*\(|\brequire\s*\(/m.test(code) ? ['an import — the module is import-free'] : [];
}

test('credits.ts imports nothing', () => {
  assert.deepEqual(auditSource(SOURCE), []);
});

test('the source audit rejects an import', () => {
  const real = SOURCE.replace(/\r\n/g, '\n');
  for (const [name, mutate] of [
    ['a static import', (s: string) => `import { MAP_LIBRARY } from '../derive/map-library.ts';\n${s}`],
    ['a type import', (s: string) => `import type { MapEntry } from '../derive/map-library.ts';\n${s}`],
    ['a dynamic import', (s: string) => s.replace('  let stopped = false;\n', "  let stopped = false;\n  void import('../derive/live.ts');\n")],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditSource(mutated), [], `"${name}" must be rejected`);
  }
});

// --- No URL written in src/colophon/ ------------------------------------------------------------------

const COLOPHON_DIR = fileURLToPath(new URL('./', import.meta.url));

/** Every file under `dir`, however deep, as paths. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return entry.isFile() ? [path] : [];
  });
}

/** Every file under `src/colophon/`, subdirectories included, that ships — not a test, not Markdown — as its path inside the directory → text. */
function shipped(root: string = COLOPHON_DIR): Record<string, string> {
  return Object.fromEntries(
    filesUnder(root)
      .filter((path) => !path.endsWith('.test.ts') && !path.endsWith('.md'))
      .map((path) => [relative(root, path).split(sep).join('/'), readFileSync(path, 'utf8')]),
  );
}

/** A URL written anywhere in a file's text — code, string or comment: a scheme and `//`, or a scheme-relative `//host`. */
const URL_LITERAL = /\b[a-z][a-z0-9+.-]*:\/\/|['"`(]\/\/[\w-]/i;

const urlsIn = (files: Readonly<Record<string, string>>): string[] =>
  Object.entries(files)
    .filter(([, text]) => URL_LITERAL.test(text))
    .map(([name]) => `src/colophon/${name} writes a URL — every href arrives with the library`);

test('no file shipped from src/colophon/ writes a URL', () => {
  const files = shipped();
  assert.ok('colophon.tsx' in files && 'credits.ts' in files && 'colophon.css' in files, 'the walk reads the surface, the credits and the stylesheet');
  assert.ok(!Object.keys(files).some((name) => name.endsWith('.test.ts') || name.endsWith('.md')), 'tests and Markdown are not shipped');
  assert.deepEqual(urlsIn(files), []);
});

test('the URL audit walks subdirectories', () => {
  const root = mkdtempSync(join(tmpdir(), 'colophon-urls-'));
  try {
    mkdirSync(join(root, 'nested', 'deeper'), { recursive: true });
    writeFileSync(join(root, 'top.ts'), 'export const a = 1;\n');
    writeFileSync(join(root, 'nested', 'deeper', 'credit.ts'), "export const u = 'https://www.nasa.gov/';\n");
    writeFileSync(join(root, 'nested', 'deeper', 'credit.test.ts'), "const u = 'https://example.invalid/';\n");
    writeFileSync(join(root, 'nested', 'notes.md'), 'https://example.invalid/\n');
    const files = shipped(root);
    assert.deepEqual(Object.keys(files).sort(), ['nested/deeper/credit.ts', 'top.ts'], 'files at any depth, tests and Markdown skipped');
    assert.deepEqual(urlsIn(files), ['src/colophon/nested/deeper/credit.ts writes a URL — every href arrives with the library'], 'a URL in a subdirectory is caught');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the URL audit rejects a written href, a scheme-relative one and a URL in a comment', () => {
  const files = shipped();
  const tsx = files['colophon.tsx'] as string;
  for (const [name, edit] of [
    ['a hardcoded href', (s: string) => s.replace('<a href={entry.sourceUrl}>', '<a href="https://svs.gsfc.nasa.gov/4720">')],
    ['a scheme-relative href', (s: string) => s.replace('<a href={entry.sourceUrl}>', '<a href="//svs.gsfc.nasa.gov/4720">')],
    ['a URL in a comment', (s: string) => `// see https://science.nasa.gov/\n${s}`],
  ] as const) {
    const edited = edit(tsx);
    assert.notEqual(edited, tsx, `the edit "${name}" must apply`);
    assert.deepEqual(urlsIn({ ...files, 'colophon.tsx': edited }), ['src/colophon/colophon.tsx writes a URL — every href arrives with the library'], `"${name}" must be rejected`);
  }
});
