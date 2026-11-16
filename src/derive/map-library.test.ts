/**
 * The map library as shipped (7.3): what each map's entry holds, as read from
 * its page on the day it was admitted; that the module is pure and browser-safe;
 * and that the README's conversion record says everything CI cannot check for
 * itself. Fixture trees and the gate step are `scripts/check-maps.test.ts`.
 */

import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { filesUnder, isTestFile, SOURCE_MODULE, stripComments, stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { MAP_LIBRARY } from './map-library.ts';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SRC_ROOT = fileURLToPath(new URL('../', import.meta.url));
const INDEX_HTML = fileURLToPath(new URL('../../index.html', import.meta.url));
const SOURCE = readFileSync(fileURLToPath(new URL('./map-library.ts', import.meta.url)), 'utf8');
const README = readFileSync(fileURLToPath(new URL('./README.md', import.meta.url)), 'utf8');

const PUBLIC_DOMAIN = 'Access constraints: public domain. Use constraints: None.';
const NASA_GUIDELINES = /No licence statement, no third-party copyright\. NASA media guidelines: .*generally are not subject to copyright in the United States/;

test('the library holds the four maps admitted, in order, as their pages gave them', () => {
  assert.deepEqual(
    MAP_LIBRARY.map(({ id, sourceUrl, credit }) => [id, sourceUrl, credit]),
    [
      ['moon', 'https://svs.gsfc.nasa.gov/4720', "NASA's Scientific Visualization Studio"],
      ['mars', 'https://astrogeology.usgs.gov/search/map/mars_viking_global_color_mosaic_925m', 'USGS Astrogeology Science Center; originator Planetary Data System'],
      ['io', 'https://astrogeology.usgs.gov/search/map/io_galileo_ssi_voyager_color_merged_global_mosaic_1km', 'USGS Astrogeology Science Center; originator Planetary Data System'],
      ['jupiter', 'https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map/', 'NASA/JPL/Space Science Institute'],
    ],
  );
  const licences = new Map(MAP_LIBRARY.map((map) => [map.id, map.licence]));
  assert.equal(licences.get('mars'), PUBLIC_DOMAIN);
  assert.equal(licences.get('io'), PUBLIC_DOMAIN);
  assert.match(licences.get('moon') ?? '', NASA_GUIDELINES);
  assert.match(licences.get('jupiter') ?? '', NASA_GUIDELINES);
});

test('each entry has the six fields, a retrieval date and a mean rounded to four places', () => {
  for (const map of MAP_LIBRARY) {
    assert.deepEqual(Object.keys(map).sort(), ['credit', 'id', 'licence', 'meanLuminance', 'retrievedOn', 'sourceUrl'], map.id);
    assert.match(map.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(map.retrievedOn, '2026-11-04', map.id);
    assert.ok(map.meanLuminance > 0 && map.meanLuminance <= 1, map.id);
    assert.equal(map.meanLuminance, Number(map.meanLuminance.toFixed(4)), `${map.id} is rounded to four places`);
  }
});

// --- Pure and browser-safe ------------------------------------------------------------------------

/** Anything that would give the library a dependency, I/O or a page's globals. */
function auditLibrarySource(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const literals = stripComments(source);
  const failures: string[] = [];
  for (const [label, text, pattern] of [
    ['an import', code, /\bimport\b/],
    ['a re-export', code, /\bexport\s*(?:type\s*)?(?:\*|\{)/],
    ['a require', code, /\brequire\s*\(/],
    ['a node: module', literals, /['"`]node:/],
    ['a Node global', code, /\b(?:process|Buffer|__dirname|__filename)\b/],
    ['a page global', code, /\b(?:window|document|navigator|location|globalThis|self|localStorage|fetch|Image|URL|performance)\b/],
    ['a clock or a draw', code, /\b(?:Date|Math\.random)\b/],
  ] as const) {
    if (pattern.test(text)) failures.push(`map library: ${label}`);
  }
  return failures;
}

test('the library has no import, no node: and no DOM use', () => {
  assert.deepEqual(auditLibrarySource(SOURCE), []);
});

test('the library audit rejects each reach, and a comment is prose', () => {
  for (const addition of [
    "import { x } from './x.ts';",
    "import './x.ts';",
    "const x = await import('./x.ts');",
    "export * from './x.ts';",
    "export { x } from './x.ts';",
    "const x = require('./x.ts');",
    "const x = 'node:fs';",
    'const x = process.cwd();',
    'const x = window.location;',
    'const x = document.title;',
    "void fetch('/textures/moon.webp');",
    'const x = new Image();',
    'const x = new Date();',
  ]) {
    assert.ok(auditLibrarySource(`${SOURCE}\n${addition}\n`).length > 0, addition);
  }
  assert.deepEqual(auditLibrarySource(`${SOURCE}\n// import x from 'node:fs'; document.title;\n`), [], 'a comment is prose');
});

// --- Who reads it ---------------------------------------------------------------------------------

/**
 * The modules that may read the library, and the shipped files that may name a
 * map's path. The readers are the assignment (7.4), the gate that re-derives
 * through it, and (8.2, ruling Q4) the solver chunk's entry, which re-exports
 * the library for the Colophon's credits, through the dynamic edge the chunk
 * already has. `MAP_REQUESTERS` is the one requester (7.5), the realism chunk's
 * URL rule; another needs a change to this table. `MAP_NAMERS` (8.2) are the
 * files that may write a map's file name without requesting it: the Colophon's
 * credit line, `<id>.webp: …`, which names the served file a credit is for and
 * never builds a URL from it (`src/colophon/credits.test.ts` holds that no
 * file shipped from `src/colophon/` writes a URL, and `checkRoutes` that the
 * Colophon's chunks hold no `textures/` reference). A namer may not write
 * `textures/`.
 */
const LIBRARY_READERS: readonly string[] = ['src/derive/appearance.ts', 'src/derive/index.ts', 'src/derive/live.ts'];
const MAP_REQUESTERS: readonly string[] = ['src/render-scene/realism/map-urls.ts'];
const MAP_NAMERS: readonly string[] = ['src/colophon/credits.ts'];

interface Module {
  readonly path: string;
  readonly text: string;
}

/** Comments blanked by the file's own language; data JSON has none. */
function shippedText(path: string, source: string): string {
  const blank = (match: string): string => match.replace(/[^\n]/g, ' ');
  if (SOURCE_MODULE.test(path)) return stripComments(source);
  if (path.endsWith('.css')) return source.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (path.endsWith('.html')) return source.replace(/<!--[\s\S]*?-->/g, blank);
  return source;
}

/** Every shipped file: the non-test, non-Markdown files under `src/`, and `index.html`. */
function shippedFiles(): Module[] {
  const paths = [...filesUnder(SRC_ROOT).filter((path) => !isTestFile(path) && !path.endsWith('.md')), INDEX_HTML];
  return paths.map((path) => {
    const rel = relative(REPO_ROOT, path).split(sep).join('/');
    return { path: rel, text: shippedText(rel, readFileSync(path, 'utf8')) };
  });
}

/**
 * An `import.meta.glob` naming `derive/` or a `map-` file, or any glob written
 * inside `src/derive/`. Not seen: a glob wide enough to match the directory from
 * elsewhere without naming it.
 */
const GLOB = /\bimport\.meta\.glob\s*(?:<[^>]*>\s*)?\(([^)]*)\)/g;

/** A string naming the library as a module, whatever holds it, or a built dynamic import that mentions it. */
const NAMES_LIBRARY = /['"`](?:[^'"`\n]*\/)?map-library(?:\.[cm]?[jt]sx?)?(?:[?#][^'"`\n]*)?['"`]|\bimport\s*\([^)]*\bmap-library\b/;
const NAMES_MAP = /\btextures\/|\.webp\b/i;
/** A map's path, as a request builds it: what a namer may still never write. */
const NAMES_MAP_PATH = /\btextures\//i;

function auditLibraryReach(files: readonly Module[]): string[] {
  const failures: string[] = [];
  for (const { path, text } of files) {
    if (SOURCE_MODULE.test(path) && !LIBRARY_READERS.includes(path) && NAMES_LIBRARY.test(text)) failures.push(`library reach: ${path} imports the library`);
    if (SOURCE_MODULE.test(path) && !LIBRARY_READERS.includes(path)) {
      for (const match of text.matchAll(GLOB)) {
        if (path.startsWith('src/derive/') || /\bderive\/|\bmap-/.test(match[1] as string)) failures.push(`library reach: ${path} globs the library: ${(match[1] as string).trim()}`);
      }
    }
    if (!MAP_REQUESTERS.includes(path) && (MAP_NAMERS.includes(path) ? NAMES_MAP_PATH : NAMES_MAP).test(text)) failures.push(`library reach: ${path} names a map`);
  }
  return failures;
}

test('among shipped modules only the assignment, the gate and the solver chunk’s entry import the library, and no shipped file nor index.html names a map', () => {
  const files = shippedFiles();
  assert.ok(files.some((file) => file.path === 'src/derive/map-library.ts'), 'the walk reads src/');
  assert.ok(files.some((file) => file.path === 'index.html'), 'the walk reads index.html');
  assert.deepEqual(auditLibraryReach(files), []);
});

test('the library reach audit rejects each form, and a comment, a near name or a test does not count', () => {
  for (const [path, text, message] of [
    ['src/render-scene/x.ts', "import { MAP_LIBRARY } from '../derive/map-library.ts';", /imports the library/],
    ['src/render-scene/x.ts', "import type { MapEntry } from '../derive/map-library.ts';", /imports the library/],
    ['src/render-scene/x.ts', "import { MAP_LIBRARY } from '../derive/map-library';", /imports the library/],
    ['src/render-scene/x.ts', "import text from '../derive/map-library.ts?raw';", /imports the library/],
    ['src/derive/x.ts', "export * from './map-library.ts';", /imports the library/],
    ['src/derive/x.ts', "export { MAP_LIBRARY } from './map-library.ts';", /imports the library/],
    ['src/derive/solve.ts', "import { MAP_LIBRARY } from './map-library.ts';", /imports the library/],
    ['src/shell/x.ts', "const m = await import('../derive/map-library.ts');", /imports the library/],
    ['src/shell/x.ts', 'const m = await import(`../derive/map-library.ts`);', /imports the library/],
    ['src/shell/x.ts', "const m = await import('../derive/' + 'map-library.ts');", /imports the library/],
    ['src/shell/x.tsx', "const m = require('../derive/map-library.ts');", /imports the library/],
    ['src/shell/x.ts', "const m = import.meta.glob('../derive/map-library*');", /globs the library/],
    ['src/shell/x.ts', "const m = import.meta.glob('../derive/*.ts', { eager: true });", /globs the library/],
    ['src/shell/x.ts', "const m = import.meta.glob(['../derive/map-*.ts']);", /globs the library/],
    ['src/shell/x.ts', 'const m = import.meta.glob<Module>("../**/map-*.ts");', /globs the library/],
    ['src/derive/x.ts', "const m = import.meta.glob('./*.ts');", /globs the library/],
    ['src/shell/x.ts', "const u = '/textures/moon.webp';", /names a map/],
    ['src/shell/x.ts', 'const u = `textures/${id}.webp`;', /names a map/],
    ['src/shell/x.ts', "const u = 'textures/' + id;", /names a map/],
    ['src/shell/x.ts', "const ext = '.webp';", /names a map/],
    ['src/shell/x.css', '.x { background: url(/textures/moon.webp); }', /names a map/],
    ['src/shell/x.css', '.x { background: url(moon.WEBP); }', /names a map/],
    ['src/data/x.json', '{ "map": "moon.webp" }', /names a map/],
    ['index.html', '<link rel="preload" href="/textures/moon.webp" />', /names a map/],
  ] as const) {
    assert.match(auditLibraryReach([{ path, text: shippedText(path, text) }]).join('\n'), message, `${path}: ${text}`);
  }
  for (const [path, text] of [
    ['src/shell/x.ts', "// import { MAP_LIBRARY } from '../derive/map-library.ts'; public/textures/moon.webp\nexport const x = 1;"],
    ['src/shell/x.css', '/* url(/textures/moon.webp) */ .x { color: inherit; }'],
    ['index.html', '<!-- /textures/moon.webp --><p></p>'],
    ['src/shell/x.ts', "import { x } from './map-library-notes.ts';"],
    ['src/shell/x.ts', "const u = 'subtextures';"],
    ['src/shell/x.ts', "const u = 'webp';"],
    ['src/shell/x.ts', "const m = import.meta.glob('./shaders/*.glsl');"],
  ] as const) {
    assert.deepEqual(auditLibraryReach([{ path, text: shippedText(path, text) }]), [], `${path}: ${text}`);
  }
});

test('the assignment, the gate and the solver chunk’s entry alone are admitted, and each does read the library', () => {
  const line = "import { MAP_LIBRARY } from './map-library.ts';";
  const files = shippedFiles();
  for (const path of LIBRARY_READERS) {
    assert.deepEqual(auditLibraryReach([{ path, text: line }]), [], `${path} is admitted`);
    const file = files.find((candidate) => candidate.path === path);
    assert.ok(file !== undefined && NAMES_LIBRARY.test(file.text), `${path} still reads it, or the table is stale`);
    assert.match(auditLibraryReach([{ path, text: "const u = 'textures/' + id;" }]).join('\n'), /names a map/, `${path} may read the library, not name a map`);
  }
  assert.deepEqual([...LIBRARY_READERS].sort(), ['src/derive/appearance.ts', 'src/derive/index.ts', 'src/derive/live.ts']);
  for (const path of ['src/derive/artifact.ts', 'src/derive/artifact-schema.ts', 'src/derive/pipeline.ts', 'src/derive/entities.ts', 'src/colophon/credits.ts', 'src/derive/rules.ts', 'src/render-scene/scene.tsx', 'src/render-fallback/chart.tsx', 'src/shell/entry.ts', 'src/colophon/colophon.tsx']) {
    assert.match(auditLibraryReach([{ path, text: line }]).join('\n'), /imports the library/, path);
  }
});

test('the Colophon’s credit line may name a map’s file and never its path, and does', () => {
  assert.deepEqual([...MAP_NAMERS], ['src/colophon/credits.ts']);
  const line = 'const line = `${entry.id}.webp: ${entry.credit}, ${entry.licence}`;';
  assert.deepEqual(auditLibraryReach([{ path: 'src/colophon/credits.ts', text: line }]), [], 'a file name admitted');
  for (const text of ['const u = `textures/${entry.id}.webp`;', "const u = '/textures/moon.webp';"]) {
    assert.match(auditLibraryReach([{ path: 'src/colophon/credits.ts', text }]).join('\n'), /names a map/, `a path is not: ${text}`);
  }
  for (const path of ['src/colophon/colophon.tsx', 'src/colophon/credits.tsx', 'src/derive/live.ts']) {
    assert.match(auditLibraryReach([{ path, text: line }]).join('\n'), /names a map/, path);
  }
  const namer = shippedFiles().find((file) => file.path === 'src/colophon/credits.ts');
  assert.ok(namer !== undefined && NAMES_MAP.test(namer.text), 'it still names one, or the table is stale');
  assert.match(auditLibraryReach([{ path: 'src/colophon/credits.ts', text: "import { MAP_LIBRARY } from '../derive/map-library.ts';" }]).join('\n'), /imports the library/, 'it names a file, and may not read the library');
});

test('the realism chunk\'s URL rule alone may name a map, and does', () => {
  const line = 'const u = `${base}textures/${id}.webp`;';
  assert.deepEqual([...MAP_REQUESTERS], ['src/render-scene/realism/map-urls.ts']);
  assert.deepEqual(auditLibraryReach([{ path: 'src/render-scene/realism/map-urls.ts', text: line }]), [], 'admitted');
  for (const path of ['src/render-scene/realism/decode-maps.ts', 'src/render-scene/realism/index.ts', 'src/render-scene/realism-mount.tsx', 'src/render-scene/realism-status.ts', 'src/render-scene/scene.tsx', 'src/render-scene/realism/map-urls.tsx', 'src/shell/realism/map-urls.ts']) {
    assert.match(auditLibraryReach([{ path, text: line }]).join('\n'), /names a map/, path);
  }
  const requester = shippedFiles().find((file) => file.path === 'src/render-scene/realism/map-urls.ts');
  assert.ok(requester !== undefined && NAMES_MAP.test(requester.text), 'it still names one, or the table is stale');
  assert.match(auditLibraryReach([{ path: 'src/render-scene/realism/map-urls.ts', text: "import { MAP_LIBRARY } from '../../derive/map-library.ts';" }]).join('\n'), /imports the library/, 'it names a map, and may not read the library');
});

// --- The conversion record ------------------------------------------------------------------------

const RECORD_HEADING = '### The conversion record';

/** The named section's text, up to the next heading of the same or a higher level. */
function recordOf(readme: string): string | undefined {
  const start = readme.indexOf(`\n${RECORD_HEADING}\n`);
  if (start === -1) return undefined;
  const rest = readme.slice(start + RECORD_HEADING.length + 2);
  const end = rest.search(/^#{1,3} /m);
  return end === -1 ? rest : rest.slice(0, end);
}

/** What the record must keep saying: the tool, its version, the settings, how a mean is measured, and what CI cannot do. */
const RECORD_CLAIMS: readonly (readonly [string, string])[] = [
  ['the tool', 'Pillow'],
  ['the tool’s version', '11.3.0'],
  ['the encoder', 'libwebp'],
  ['the encoder’s version', '1.5.0'],
  ['the colour conversion', "convert('RGB')"],
  ['the filter', 'Lanczos'],
  ['the size', '1024×512'],
  ['the save', "save(path, 'WEBP', quality=80, method=6)"],
  ['no metadata', 'no metadata'],
  ['the transfer function', 'IEC 61966-2-1'],
  ['the weights', '0.2126 R + 0.7152 G + 0.0722 B'],
  ['the averaging', 'unweighted mean over all pixels'],
  ['the rounding', 'four places'],
  ['the limit', 'CI cannot recompute a mean'],
];

function auditRecord(readme: string): string[] {
  const record = recordOf(readme);
  if (record === undefined) return [`record: no "${RECORD_HEADING}" section`];
  const flat = record.replace(/\s+/g, ' ');
  return RECORD_CLAIMS.filter(([, text]) => !flat.includes(text)).map(([name]) => `record: says nothing of ${name}`);
}

test('the README’s conversion record names the tool, the version, the settings and the mean, and states the limit', () => {
  assert.deepEqual(auditRecord(README), []);
});

test('the record audit fails when the record loses any of these', () => {
  assert.deepEqual(auditRecord('# x\n'), [`record: no "${RECORD_HEADING}" section`]);
  const record = recordOf(README);
  assert.notEqual(record, undefined);
  for (const [name, text] of RECORD_CLAIMS) {
    const flatten = (s: string): string => s.replace(/\s+/g, ' ');
    const mutated = `\n${RECORD_HEADING}\n${flatten(record as string).replaceAll(text, '')}\n`;
    assert.deepEqual(auditRecord(mutated), [`record: says nothing of ${name}`], name);
  }
  // Words elsewhere in the README do not stand in for the record.
  assert.ok(auditRecord(`Pillow 11.3.0\n${RECORD_HEADING}\nnothing\n`).length === RECORD_CLAIMS.length);
});

// --- The conversion table against the files -------------------------------------------------------

/** What the record says of a map: read from the library and the real file, never from the record. */
interface MapFact {
  readonly id: string;
  readonly mean: number;
  readonly bytes: number;
  readonly sha256: string;
}

function realFacts(): MapFact[] {
  return MAP_LIBRARY.map((map) => {
    const bytes = readFileSync(fileURLToPath(new URL(`../../public/textures/${map.id}.webp`, import.meta.url)));
    return { id: map.id, mean: map.meanLuminance, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  });
}

/** Each map's row of the record's table: its id, mean, byte count and SHA-256, each a cell of its own. */
function auditConversionTable(readme: string, facts: readonly MapFact[]): string[] {
  const rows = (recordOf(readme) ?? '').split(/\r?\n/).filter((line) => line.startsWith('|'));
  const failures: string[] = [];
  for (const line of rows) {
    const id = line.match(/^\| `([^`]+)` \|/)?.[1];
    if (id !== undefined && !facts.some((fact) => fact.id === id)) failures.push(`conversion table: the row for ${id} has no map`);
  }
  for (const fact of facts) {
    const row = rows.find((line) => line.startsWith(`| \`${fact.id}\` |`));
    if (row === undefined) {
      failures.push(`conversion table: no row for ${fact.id}`);
      continue;
    }
    const cells = row.split('|').map((cell) => cell.trim().replace(/^`|`$/g, ''));
    for (const [name, value] of [
      ['mean', String(fact.mean)],
      ['bytes', String(fact.bytes)],
      ['SHA-256', fact.sha256],
    ] as const) {
      if (!cells.includes(value)) failures.push(`conversion table: ${fact.id}'s row does not hold its ${name}, ${value}`);
    }
  }
  return failures;
}

test('the conversion table holds each map’s id, mean, byte count and SHA-256, from the real files', () => {
  assert.equal(realFacts().length, MAP_LIBRARY.length);
  assert.deepEqual(auditConversionTable(README, realFacts()), []);
});

test('the conversion table fails on a swapped file, a changed mean, a lost column and a lost row', () => {
  const facts = realFacts();
  const moon = facts.find((fact) => fact.id === 'moon') as MapFact;
  const mars = facts.find((fact) => fact.id === 'mars') as MapFact;
  // A swapped `moon.webp`: another map's bytes under moon's name.
  const swapped = facts.map((fact) => (fact.id === 'moon' ? { ...fact, bytes: mars.bytes, sha256: mars.sha256 } : fact));
  assert.deepEqual(auditConversionTable(README, swapped), [
    `conversion table: moon's row does not hold its bytes, ${mars.bytes}`,
    `conversion table: moon's row does not hold its SHA-256, ${mars.sha256}`,
  ]);
  // One flipped byte keeps the size and changes only the hash.
  const flipped = facts.map((fact) => (fact.id === 'moon' ? { ...fact, sha256: createHash('sha256').update('other').digest('hex') } : fact));
  assert.equal(auditConversionTable(README, flipped).length, 1);
  // A re-measured mean with no change to the record.
  const remeasured = facts.map((fact) => (fact.id === 'moon' ? { ...fact, mean: 0.5 } : fact));
  assert.deepEqual(auditConversionTable(README, remeasured), [`conversion table: moon's row does not hold its mean, 0.5`]);
  for (const [name, mutate, message] of [
    ['a row removed', (text: string) => text.replace(/^\| `moon` \|.*\r?\n/m, ''), /no row for moon/],
    ['its hash edited', (text: string) => text.replace(moon.sha256, '0'.repeat(64)), /moon's row does not hold its SHA-256/],
    ['its hash moved to another row', (text: string) => text.replace(moon.sha256, 'x').replace(mars.sha256, moon.sha256), /moon's row does not hold its SHA-256/],
    ['its bytes edited', (text: string) => text.replace(new RegExp(`\\| ${moon.bytes} \\|`), '| 1 |'), /moon's row does not hold its bytes/],
    ['the record gone', (text: string) => text.replace(RECORD_HEADING, '### Elsewhere'), /no row for moon/],
    ['a stale row', (text: string) => text.replace(/^(\| `moon` \|.*\r?\n)/m, '$1| `triton` | x.jpg | 1024×512 | 0.1 | 1 | y |\n'), /the row for triton has no map/],
  ] as const) {
    const mutated = mutate(README);
    assert.notEqual(mutated, README, `the mutation "${name}" must apply`);
    assert.match(auditConversionTable(mutated, facts).join('\n'), message, name);
  }
});
