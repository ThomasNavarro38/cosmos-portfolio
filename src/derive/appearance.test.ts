/**
 * A Planet's appearance (7.4): what `appearanceOf` assigns and what it never
 * disturbs, that the module is pure and reached only by the assembler, the
 * schema and the gate, that the Fallback reads none of it, and that the README
 * says why the drift warning after an appearance-only re-solve is expected.
 * The schema's rows are `artifact-schema.test.ts`, the gate's `artifact.test.ts`,
 * the pipeline-level "a Project is added" `maintenance.test.ts`.
 */

import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix, relative, sep } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { filesUnder, isTestFile, SOURCE_MODULE, stripComments, stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import {
  appearanceOf,
  hash,
  PULSE_PHASE_MAX,
  PULSE_PHASE_MIN,
  SPIN_PHASE_MAX,
  SPIN_PHASE_MIN,
  SPIN_RATE_MAX,
  SPIN_RATE_MIN,
  STAR_TINTS,
  TINT_ORDER,
  starAppearanceOf,
  TILT_MAX,
  TILT_MIN,
} from './appearance.ts';
import { findImports } from './boundaries.ts';
import { MAP_LIBRARY, type MapEntry } from './map-library.ts';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SRC_ROOT = fileURLToPath(new URL('../', import.meta.url));
const SOURCE = readFileSync(fileURLToPath(new URL('./appearance.ts', import.meta.url)), 'utf8');
const README = readFileSync(fileURLToPath(new URL('./README.md', import.meta.url)), 'utf8');
const COMMITTED = JSON.parse(readFileSync(new URL('../../generated/layout.generated.json', import.meta.url), 'utf8')) as {
  clients: ({ id: string; projects: { id: string; appearance: unknown }[] } & Record<string, unknown>)[];
};

/** `client:simsu`'s pulse phase in the 9.4 artifact (`SCHEMA_VERSION` 11), before the tint existed. */
const PINNED_SIMSU_PULSE_PHASE = 5.3998;

/** IDs sharing long prefixes, as real ones do. */
const IDS: readonly string[] = Array.from({ length: 400 }, (_, index) => `project:simsu/engagement-${index}`);

/** `[project ID, lower map id, higher map id]`: found by search, pinned here, checked by the test using it. */
const TIE: readonly [string, string, string] = ['project:tie/fixture', 'm1089200', 'm498575'];

function entry(id: string, meanLuminance = 0.25): MapEntry {
  return { id, sourceUrl: 'https://nasa.gov/x', licence: 'l', credit: 'c', retrievedOn: '2026-11-04', meanLuminance };
}

// --- The assignment -------------------------------------------------------------------------------

test('every field is in its range, finite and rounded to four places, with no -0', () => {
  const libraryIds = MAP_LIBRARY.map((map) => map.id);
  for (const id of IDS) {
    const look = appearanceOf(id);
    assert.deepEqual(Object.keys(look), ['map', 'meanLuminance', 'tilt', 'spinRate', 'spinPhase'], id);
    assert.ok(libraryIds.includes(look.map), `${id} names a library map`);
    assert.ok(look.tilt >= TILT_MIN && look.tilt <= TILT_MAX, `${id} tilt ${look.tilt}`);
    assert.ok(look.spinRate >= SPIN_RATE_MIN && look.spinRate <= SPIN_RATE_MAX, `${id} spinRate ${look.spinRate}`);
    assert.ok(look.spinPhase >= SPIN_PHASE_MIN && look.spinPhase <= SPIN_PHASE_MAX, `${id} spinPhase ${look.spinPhase}`);
    for (const value of [look.tilt, look.spinRate, look.spinPhase]) {
      assert.ok(Number.isFinite(value));
      assert.equal(value, Number(value.toFixed(4)), `${id}: ${value} is rounded to four places`);
      assert.ok(!Object.is(value, -0), `${id}: no -0`);
    }
  }
});

test('the ranges are the ones the story states', () => {
  assert.deepEqual([TILT_MIN, TILT_MAX, SPIN_RATE_MIN, SPIN_RATE_MAX, SPIN_PHASE_MIN, SPIN_PHASE_MAX], [-0.5, 0.5, 0.02, 0.1, 0, 6.2832]);
  assert.equal(SPIN_PHASE_MAX, Number((2 * Math.PI).toFixed(4)), 'the upper bound is 2π rounded to four places');
});

test('meanLuminance is the winning map’s library value, copied', () => {
  for (const id of IDS) {
    const look = appearanceOf(id);
    assert.equal(look.meanLuminance, MAP_LIBRARY.find((map) => map.id === look.map)?.meanLuminance, id);
  }
  // Not read off some other entry: a private library holds a value no real map has.
  assert.equal(appearanceOf('project:x/y', [entry('only', 0.1234)]).meanLuminance, 0.1234);
});

test('the same ID and library give the same appearance, and a call leaves no state', () => {
  for (const id of IDS.slice(0, 20)) assert.deepEqual(appearanceOf(id), appearanceOf(id));
});

test('the assignment spreads IDs that share a long prefix over every map and across each range', () => {
  const counts = new Map<string, number>();
  for (const id of IDS) {
    const { map } = appearanceOf(id);
    counts.set(map, (counts.get(map) ?? 0) + 1);
  }
  // At least half a fair share, so admitting a map within the budget cannot fail this falsely.
  const floor = IDS.length / MAP_LIBRARY.length / 2;
  for (const map of MAP_LIBRARY) {
    assert.ok((counts.get(map.id) ?? 0) >= floor, `${map.id} wins at least ${floor} of ${IDS.length} IDs: ${String(counts.get(map.id))}`);
  }
  for (const [field, min, max] of [['tilt', TILT_MIN, TILT_MAX], ['spinRate', SPIN_RATE_MIN, SPIN_RATE_MAX], ['spinPhase', SPIN_PHASE_MIN, SPIN_PHASE_MAX]] as const) {
    const values = IDS.map((id) => appearanceOf(id)[field]);
    const mid = (min + max) / 2;
    const below = values.filter((value) => value < mid).length;
    assert.ok(below > 140 && below < 260, `${field} fills both halves of its range: ${below} of 400 below the middle`);
  }
});

test('each field has its own salt, so the three do not move together', () => {
  const units = (field: 'tilt' | 'spinRate' | 'spinPhase', min: number, max: number): number[] => IDS.map((id) => (appearanceOf(id)[field] - min) / (max - min));
  const tilt = units('tilt', TILT_MIN, TILT_MAX);
  const rate = units('spinRate', SPIN_RATE_MIN, SPIN_RATE_MAX);
  const phase = units('spinPhase', SPIN_PHASE_MIN, SPIN_PHASE_MAX);
  const correlation = (a: readonly number[], b: readonly number[]): number => {
    const mean = (xs: readonly number[]): number => xs.reduce((sum, x) => sum + x, 0) / xs.length;
    const [ma, mb] = [mean(a), mean(b)];
    let [ab, aa, bb] = [0, 0, 0];
    a.forEach((x, i) => {
      const y = b[i] as number;
      ab += (x - ma) * (y - mb);
      aa += (x - ma) ** 2;
      bb += (y - mb) ** 2;
    });
    return ab / Math.sqrt(aa * bb);
  };
  for (const [name, a, b] of [['tilt, spinRate', tilt, rate], ['tilt, spinPhase', tilt, phase], ['spinRate, spinPhase', rate, phase]] as const) {
    assert.ok(Math.abs(correlation(a, b)) < 0.2, `${name} are independent: ${correlation(a, b)}`);
  }
});

test('the hash is FNV-1a over UTF-16 code units with the MurmurHash3 finaliser, unsigned', () => {
  // Worked by hand from the published constants, so a change of either step fails here.
  const fmix = (value: number): number => {
    let h = value;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  };
  assert.equal(hash(''), fmix(0x811c9dc5), 'the empty string is the FNV offset basis, finalised');
  assert.equal(hash('a'), fmix(0xe40c292c), 'FNV-1a of "a" is its published 0xe40c292c');
  assert.equal(hash('foobar'), fmix(0xbf9cf968), 'FNV-1a of "foobar" is its published 0xbf9cf968');
  // A code unit above 255 is hashed whole, not by its low byte.
  assert.notEqual(hash('Ł'), hash('A'));
  for (const id of IDS) {
    const value = hash(id);
    assert.ok(Number.isInteger(value) && value >= 0 && value < 2 ** 32, `${id}: ${value}`);
  }
});

// --- The library's changes ------------------------------------------------------------------------

test('a reordered library changes no assignment', () => {
  const reversed = [...MAP_LIBRARY].reverse();
  for (const id of IDS) assert.deepEqual(appearanceOf(id, reversed), appearanceOf(id), id);
});

test('a tie goes to the lower map id by codepoint, whichever the library lists first', () => {
  // A true 32-bit collision: these two map ids score equal for this Project ID.
  const [id, lower, higher] = TIE;
  assert.ok(lower < higher);
  assert.equal(hash(`map\0${lower}\0${id}`), hash(`map\0${higher}\0${id}`), 'the fixture is a real tie');
  assert.equal(appearanceOf(id, [entry(lower), entry(higher)]).map, lower);
  assert.equal(appearanceOf(id, [entry(higher), entry(lower)]).map, lower);
});

test('a map added moves only the IDs it wins, and each now names it', () => {
  const grown = [...MAP_LIBRARY, entry('europa', 0.5)];
  let moved = 0;
  for (const id of IDS) {
    const before = appearanceOf(id);
    const after = appearanceOf(id, grown);
    if (after.map === before.map) {
      assert.deepEqual(after, before, `${id} kept its map, so nothing about it moved`);
      continue;
    }
    moved += 1;
    assert.equal(after.map, 'europa', `${id} moved only because the new map won it`);
    assert.equal(after.meanLuminance, 0.5);
    assert.deepEqual([after.tilt, after.spinRate, after.spinPhase], [before.tilt, before.spinRate, before.spinPhase], `${id}: only the map changed`);
  }
  assert.ok(moved > 0, 'the new map wins something, or this test is vacuous');
});

test('a map removed moves only the IDs it held', () => {
  const removed = MAP_LIBRARY[0] as MapEntry;
  const shrunk = MAP_LIBRARY.filter((map) => map !== removed);
  let moved = 0;
  for (const id of IDS) {
    const before = appearanceOf(id);
    const after = appearanceOf(id, shrunk);
    if (before.map === removed.id) {
      moved += 1;
      assert.notEqual(after.map, removed.id, id);
    } else {
      assert.deepEqual(after, before, `${id} did not hold ${removed.id}`);
    }
  }
  assert.ok(moved > 0, 'the removed map held something, or this test is vacuous');
});

test('an empty library throws naming the ID', () => {
  assert.throws(() => appearanceOf('project:simsu/named', []), /project:simsu\/named/);
});

// --- A Star's appearance (9.4) ---------------------------------------------------------------------

test('a Star’s appearance is a tint and one pulse phase in its range, rounded to four places, with no -0', () => {
  assert.deepEqual([PULSE_PHASE_MIN, PULSE_PHASE_MAX], [0, 6.2832]);
  for (const id of IDS.map((value) => value.replace('project:', 'client:'))) {
    const look = starAppearanceOf(id);
    assert.deepEqual(Object.keys(look), ['tint', 'pulsePhase'], id);
    assert.ok((STAR_TINTS as readonly string[]).includes(look.tint), `${id} tint ${look.tint}`);
    assert.ok(look.pulsePhase >= PULSE_PHASE_MIN && look.pulsePhase <= PULSE_PHASE_MAX, `${id} pulsePhase ${look.pulsePhase}`);
    assert.equal(look.pulsePhase, Number(look.pulsePhase.toFixed(4)), id);
    assert.ok(!Object.is(look.pulsePhase, -0), id);
  }
});

test('a Star’s pulse phase is salted `pulsePhase` from its ID alone, and spreads', () => {
  const id = 'client:simsu';
  assert.equal(starAppearanceOf(id).pulsePhase, Math.round((hash(`pulsePhase\0${id}`) / 2 ** 32) * PULSE_PHASE_MAX * 1e4) / 1e4 + 0);
  assert.deepEqual(starAppearanceOf(id), starAppearanceOf(id));
  assert.notEqual(starAppearanceOf(id).pulsePhase, appearanceOf(id).spinPhase, 'its own salt, not the spin phase');
  const phases = IDS.map((value) => starAppearanceOf(value).pulsePhase);
  for (const quarter of [0, 1, 2, 3]) {
    assert.ok(phases.some((phase) => phase >= (quarter * PULSE_PHASE_MAX) / 4 && phase < ((quarter + 1) * PULSE_PHASE_MAX) / 4), `quarter ${quarter}`);
  }
});

test('the five tints are blackbody-like, hot to cool, in that order (9.5)', () => {
  assert.deepEqual([...STAR_TINTS], ['blue', 'white', 'yellow', 'orange', 'red']);
  assert.ok(Object.isFrozen(STAR_TINTS), 'the list cannot be reordered at run time');
  // The numbers are the order: the list is the keys sorted on them, and no two share a place.
  assert.deepEqual([...STAR_TINTS], Object.keys(TINT_ORDER).sort((a, b) => TINT_ORDER[a as keyof typeof TINT_ORDER] - TINT_ORDER[b as keyof typeof TINT_ORDER]));
  assert.equal(new Set(Object.values(TINT_ORDER)).size, STAR_TINTS.length, 'each tint has its own place');
});

test('the committed tints are pinned for fixed IDs, so a change to unit, the hash or the salt fails (9.5)', () => {
  assert.equal(starAppearanceOf('client:simsu').tint, 'blue');
  assert.equal(starAppearanceOf('client:sncf').tint, 'red');
  assert.equal(starAppearanceOf('client:transilien').tint, 'yellow');
});

test('a Star’s tint is salted `tint` from its ID alone, deterministic, and every tint occurs over 1,000 IDs in roughly equal shares (9.5)', () => {
  const id = 'client:simsu';
  assert.equal(starAppearanceOf(id).tint, STAR_TINTS[Math.floor((hash(`tint\0${id}`) / 2 ** 32) * STAR_TINTS.length)]);
  assert.equal(starAppearanceOf(id).tint, starAppearanceOf(id).tint);
  const counts = new Map<string, number>();
  for (let index = 0; index < 1000; index += 1) {
    const { tint } = starAppearanceOf(`client:synthetic-${index}`);
    counts.set(tint, (counts.get(tint) ?? 0) + 1);
  }
  // A fair split is 200 each; a loose band around it catches a skewed salt or hash without pinning the draw.
  for (const tint of STAR_TINTS) {
    const count = counts.get(tint) ?? 0;
    assert.ok(count >= 140 && count <= 260, `${tint} occurs ${count} times in 1,000, outside 140–260`);
  }
  assert.deepEqual([...counts.keys()].sort(), [...STAR_TINTS].sort(), 'no other value occurs');
});

test('adding the tint left 9.4’s pulse phase unchanged for a fixed ID (9.5)', () => {
  // Pinned from the 9.4 artifact: the pulse phase's salt and formula did not move.
  const id = 'client:simsu';
  assert.equal(starAppearanceOf(id).pulsePhase, Math.round((hash(`pulsePhase\0${id}`) / 2 ** 32) * PULSE_PHASE_MAX * 1e4) / 1e4 + 0);
  assert.equal(starAppearanceOf(id).pulsePhase, PINNED_SIMSU_PULSE_PHASE);
});

// --- The committed artifact -----------------------------------------------------------------------

test('every committed Project’s appearance is its re-derivation, and every Client’s is its Star’s (9.4)', () => {
  assert.ok(COMMITTED.clients.length > 0);
  for (const client of COMMITTED.clients) {
    assert.deepEqual(client['appearance'], starAppearanceOf(client.id), `${client.id} is a Star`);
    assert.ok(client.projects.length > 0);
    for (const project of client.projects) assert.deepEqual(project.appearance, appearanceOf(project.id), project.id);
  }
});

// --- Pure, and reached by name --------------------------------------------------------------------

/** Anything but the library that would give the assignment a dependency, I/O, a clock or a draw. */
function auditAppearanceSource(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const literals = stripComments(source);
  const failures: string[] = [];
  for (const found of findImports(source)) {
    if (found.specifier !== './map-library.ts') failures.push(`appearance: imports ${found.specifier}`);
  }
  for (const [label, text, pattern] of [
    ['a node: module', literals, /['"`]node:/],
    ['a Node global', code, /\b(?:process|Buffer|__dirname|__filename)\b/],
    ['a page global', code, /\b(?:window|document|navigator|location|globalThis|self|localStorage|fetch|Image|URL|performance|crypto)\b/],
    ['a clock', code, /\b(?:Date|Temporal|setTimeout|setInterval|requestAnimationFrame)\b/],
    // Against the literals, since a computed key is a string.
    ['a draw', literals, /\bMath\s*\.\s*random\b|\bMath\s*\[\s*['"`]random['"`]\s*\]|\{[^}]*\brandom\b[^}]*\}\s*=\s*Math\b/],
  ] as const) {
    if (pattern.test(text)) failures.push(`appearance: ${label}`);
  }
  return failures;
}

test('the assignment imports the library alone, and holds no node:, DOM, clock or draw', () => {
  assert.deepEqual(auditAppearanceSource(SOURCE), []);
  assert.deepEqual(findImports(SOURCE).map((found) => found.specifier), ['./map-library.ts'], 'it does import the library');
});

test('the assignment audit rejects each reach, and a comment is prose', () => {
  for (const [addition, message] of [
    ["import { z } from 'zod';", /imports zod/],
    ["import { createHash } from 'node:crypto';", /imports node:crypto/],
    ["const x = await import('./solve.ts');", /imports \.\/solve\.ts/],
    ["export * from './rules.ts';", /imports \.\/rules\.ts/],
    ["const x = 'node:fs';", /a node: module/],
    ['const x = process.cwd();', /a Node global/],
    ['const x = window.location;', /a page global/],
    ['const x = document.title;', /a page global/],
    ['const x = crypto.subtle;', /a page global/],
    ['const x = Date.now();', /a clock/],
    ['const x = new Date();', /a clock/],
    ['const x = Math.random();', /a draw/],
    ['const x = Math . random();', /a draw/],
    ["const x = Math['random']();", /a draw/],
    ['const { random } = Math;', /a draw/],
    ['const { random: draw } = Math;', /a draw/],
    ['const x = Temporal.Now.instant();', /a clock/],
  ] as const) {
    assert.match(auditAppearanceSource(`${SOURCE}\n${addition}\n`).join('\n'), message, addition);
  }
  assert.deepEqual(auditAppearanceSource(`${SOURCE}\n// Math.random() and new Date() and import 'node:fs'\n`), [], 'a comment is prose');
});

test('the assignment’s rounding is the solve’s four places, and each keeps its own private', () => {
  // Text, not an import: `round` is private to each module, and exporting the solve's
  // would change its module surface. The same idiom `stroke-model.test.ts` uses on the tolerance.
  const solve = readFileSync(fileURLToPath(new URL('./solve.ts', import.meta.url)), 'utf8');
  const places = /^const PRECISION = (\d+);/m.exec(solve);
  assert.ok(places !== null, 'the solve declares its precision as a literal');
  assert.equal(Number(places[1]), 4);
  const factors = /Math\.round\(value \* (1e\d+)\) \/ (1e\d+) \+ 0/.exec(SOURCE);
  assert.ok(factors !== null, 'the assignment rounds by a literal factor, removing -0');
  assert.equal(Number(factors[1]), 10 ** Number(places[1]));
  assert.equal(Number(factors[2]), 10 ** Number(places[1]));
  for (const [name, source] of [['solve.ts', solve], ['appearance.ts', SOURCE]] as const) {
    assert.doesNotMatch(stripCommentsAndStrings(source), /\bexport\s+(?:const|function)\s+round\b/, `${name} keeps round private`);
  }
});

/**
 * The shipped modules that may import the assignment: the assembler calls it,
 * the gate re-derives through it, and the schema takes its range constants, the
 * bounds it holds. Nothing else, so the solve, the entities and the rules cannot
 * read it.
 */
const APPEARANCE_READERS: readonly string[] = ['src/derive/artifact-schema.ts', 'src/derive/artifact.ts', 'src/derive/index.ts'];

/** What the schema may take from the module: bounds and the tint names (9.5), and never the assignment. */
const SCHEMA_TAKES = /^(?:(?:TILT|SPIN_RATE|SPIN_PHASE|PULSE_PHASE)_(?:MIN|MAX)|STAR_TINTS)$/;

interface Module {
  readonly path: string;
  readonly text: string;
}

function shippedModules(): Module[] {
  return filesUnder(SRC_ROOT)
    .filter((path) => SOURCE_MODULE.test(path) && !isTestFile(path))
    .map((path) => ({ path: relative(REPO_ROOT, path).split(sep).join('/'), text: readFileSync(path, 'utf8') }));
}

/** A string naming the assignment as a module, whatever holds it, in code rather than prose. */
const NAMES_APPEARANCE = /['"`](?:[^'"`\n]*\/)?appearance(?:\.[cm]?[jt]sx?)?(?:[?#][^'"`\n]*)?['"`]|\bimport\s*\([^)]*\bappearance(?![-\w])/;

/** An `import.meta.glob`, whose argument is read for the name. */
const GLOB = /\bimport\.meta\.glob\s*(?:<[^>]*>\s*)?\(([^)]*)\)/g;

/** A reader passing the assignment on, so its importers would reach it unlisted. */
const RE_EXPORTS_APPEARANCE = /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*['"`](?:[^'"`\n]*\/)?appearance(?:\.[cm]?[jt]sx?)?(?:[?#][^'"`\n]*)?['"`]|\bexport\s*\{[^}]*\bappearanceOf\b[^}]*\}/;

function auditAppearanceReach(files: readonly Module[]): string[] {
  const failures: string[] = [];
  for (const { path, text } of files) {
    if (path === 'src/derive/appearance.ts') continue;
    const code = stripComments(text);
    if (APPEARANCE_READERS.includes(path)) {
      if (RE_EXPORTS_APPEARANCE.test(code)) failures.push(`appearance reach: ${path} re-exports the assignment`);
      continue;
    }
    if (NAMES_APPEARANCE.test(code)) failures.push(`appearance reach: ${path} imports the assignment`);
    for (const match of code.matchAll(GLOB)) {
      if (/\bappearance(?![-\w])/.test(match[1] as string)) failures.push(`appearance reach: ${path} globs the assignment`);
    }
  }
  return failures;
}

test('among shipped modules only the schema, the assembler and the gate import the assignment', () => {
  const files = shippedModules();
  assert.ok(files.some((file) => file.path === 'src/derive/solve.ts'), 'the walk reads src/');
  assert.deepEqual(auditAppearanceReach(files), []);
  // Not a stale table: each still does.
  for (const path of APPEARANCE_READERS) {
    const file = files.find((candidate) => candidate.path === path) as Module;
    assert.ok(findImports(file.text).some((found) => found.specifier === './appearance.ts'), `${path} imports it`);
  }
});

test('the appearance reach audit rejects each form, in the solve, the entities and the rules above all', () => {
  for (const [path, text] of [
    ['src/derive/solve.ts', "import { appearanceOf } from './appearance.ts';"],
    ['src/derive/entities.ts', "import { appearanceOf } from './appearance.ts';"],
    ['src/derive/rules.ts', "import { TILT_MIN } from './appearance';"],
    ['src/derive/rules.ts', "export { appearanceOf } from './appearance.ts';"],
    ['src/derive/solve.ts', "const m = await import('./appearance.ts');"],
    ['src/render-scene/x.ts', "import { appearanceOf } from '../derive/appearance.ts';"],
    ['src/render-fallback/x.tsx', "const m = require('../derive/appearance.ts');"],
    ['src/shell/x.ts', "import text from '../derive/appearance.ts?raw';"],
    ['src/colophon/x.ts', "const m = await import('../derive/appearance.ts');"],
    ['src/derive/solve.ts', 'const m = await import(`./appearance${ext}`);'],
    ['src/shell/x.ts', "const m = await import('../derive/' + 'appearance.ts');"],
  ] as const) {
    assert.deepEqual(auditAppearanceReach([{ path, text }]), [`appearance reach: ${path} imports the assignment`], `${path}: ${text}`);
  }
  for (const text of [
    "const m = import.meta.glob('./appearance*');",
    "const m = import.meta.glob(['../derive/appearance.ts']);",
    'const m = import.meta.glob<Module>("../**/appearance.*");',
  ]) {
    assert.match(auditAppearanceReach([{ path: 'src/shell/x.ts', text }]).join('\n'), /globs the assignment/, text);
  }
  for (const path of ['src/derive/artifact.ts', 'src/derive/index.ts']) {
    for (const text of [
      "export { appearanceOf } from './appearance.ts';",
      "export * from './appearance.ts';",
      "export * as look from './appearance';",
      "import { appearanceOf } from './appearance.ts';\nexport { appearanceOf };",
    ]) {
      assert.deepEqual(auditAppearanceReach([{ path, text }]), [`appearance reach: ${path} re-exports the assignment`], `${path}: ${text}`);
    }
  }
  for (const [path, text] of [
    ['src/derive/solve.ts', "// import { appearanceOf } from './appearance.ts';\nexport const x = 1;"],
    ['src/derive/solve.ts', "import { x } from './appearance-notes.ts';"],
    ['src/derive/solve.ts', 'const x = project.appearance;'],
    ['src/derive/index.ts', "import { appearanceOf } from './appearance.ts';"],
    ['src/derive/solve.ts', "const m = await import('./appearance-notes.ts');"],
    ['src/shell/x.ts', "const m = import.meta.glob('./shaders/*.glsl');"],
  ] as const) {
    assert.deepEqual(auditAppearanceReach([{ path, text }]), [], `${path}: ${text}`);
  }
});

/** The names `artifact-schema.ts` imports from the assignment that are not bounds. */
function schemaTakesBeyondBounds(source: string): string[] {
  const code = stripComments(source);
  const matches = [...code.matchAll(/\b(?:import|export)\s+(?:type\s+)?([^'"`;]*?)\s*from\s*['"`]\.\/appearance(?:\.ts)?(?:[?#][^'"`\n]*)?['"`]/g)];
  const dynamic = [...code.matchAll(/\bimport\s*\([^)]*\bappearance(?![-\w])[^)]*\)/g)].map((match) => match[0]);
  if (matches.length === 0 && dynamic.length === 0) return ['(no import)'];
  return [
    ...matches.flatMap((match) => {
      const clause = (match[1] as string).trim();
      if (!clause.startsWith('{')) return [clause];
      return clause.slice(1, clause.lastIndexOf('}')).split(',').map((name) => name.trim()).filter((name) => name !== '' && !SCHEMA_TAKES.test(name));
    }),
    ...dynamic,
  ];
}

test('the schema takes the bounds and the tint names from the assignment and nothing else', () => {
  const source = readFileSync(fileURLToPath(new URL('./artifact-schema.ts', import.meta.url)), 'utf8');
  assert.deepEqual(schemaTakesBeyondBounds(source), []);
  for (const line of [
    "import { appearanceOf } from './appearance.ts';",
    "import { TILT_MIN, hash } from './appearance.ts';",
    "import * as look from './appearance.ts';",
    "export { appearanceOf } from './appearance.ts';",
    "import { appearanceOf } from './appearance';",
    "import { TILT_MIN, hash } from './appearance';",
    "const look = await import('./appearance.ts');",
    "const look = await import('./appearance');",
    'const look = await import(`./appearance${ext}`);',
  ]) {
    assert.notDeepEqual(schemaTakesBeyondBounds(`${source}\n${line}\n`), [], line);
  }
  assert.deepEqual(schemaTakesBeyondBounds("import { TILT_MIN } from './appearance';\n"), [], 'the extensionless form of a bound is still a bound');
  assert.deepEqual(schemaTakesBeyondBounds('export const x = 1;\n'), ['(no import)']);
});

/**
 * Follows every import that survives compilation from `start`, and returns the
 * chain to `target`, or `undefined`. An `import type` is erased, so it carries
 * nothing at runtime: `rail.ts` names `Rail` from the schema that way.
 */
function valueChain(start: string, target: string, sources: ReadonlyMap<string, string>): string[] | undefined {
  const seen = new Set<string>();
  // As a bundler resolves it: any `?raw` or `#x` off, then an extensionless form to its file.
  const resolved = (from: string, specifier: string): string => {
    const joined = posix.join(posix.dirname(from), specifier.replace(/[?#].*$/, ''));
    return [joined, `${joined}.ts`, `${joined}.tsx`].find((path) => sources.has(path)) ?? joined;
  };
  const walk = (path: string): string[] | undefined => {
    if (path === target) return [path];
    if (seen.has(path)) return undefined;
    seen.add(path);
    const source = sources.get(path);
    if (source === undefined) return undefined;
    const lines = source.split(/\r?\n/);
    for (const found of findImports(source)) {
      if (!found.specifier.startsWith('.')) continue;
      if (/^\s*(?:import|export)\s+type\b/.test(lines[found.line - 1] ?? '')) continue;
      const chain = walk(resolved(path, found.specifier));
      if (chain !== undefined) return [path, ...chain];
    }
    return undefined;
  };
  return walk(start);
}

test('the solve, the entities and the rules reach neither the assignment nor the library', () => {
  const sources = new Map(shippedModules().map((file) => [file.path, file.text]));
  for (const start of ['src/derive/solve.ts', 'src/derive/entities.ts', 'src/derive/rules.ts']) {
    assert.ok(sources.has(start), start);
    for (const target of ['src/derive/appearance.ts', 'src/derive/map-library.ts']) {
      assert.equal(valueChain(start, target, sources), undefined, `${start} reaches ${target}`);
    }
  }
  // The route it would take: a value import of the schema from anything the solve reaches.
  const mutated = new Map(sources);
  mutated.set('src/derive/rail.ts', `${sources.get('src/derive/rail.ts') as string}\nimport { SCHEMA_VERSION } from './artifact-schema.ts';\n`);
  const route = ['src/derive/solve.ts', 'src/derive/rail.ts', 'src/derive/artifact-schema.ts', 'src/derive/appearance.ts'];
  assert.deepEqual(valueChain('src/derive/solve.ts', 'src/derive/appearance.ts', mutated), route);
  for (const specifier of ['./artifact-schema', './artifact-schema.ts?raw', './artifact-schema#x']) {
    mutated.set('src/derive/rail.ts', `${sources.get('src/derive/rail.ts') as string}\nimport { SCHEMA_VERSION } from '${specifier}';\n`);
    assert.deepEqual(valueChain('src/derive/solve.ts', 'src/derive/appearance.ts', mutated), route, specifier);
  }
});

// --- The Fallback reads none of it ----------------------------------------------------------------

function auditFallback(files: readonly Module[]): string[] {
  return files.filter(({ text }) => /\bappearance\b/i.test(text)).map(({ path }) => `fallback: ${path} names appearance`);
}

test('no non-test file of the Fallback, nor its host, contains the word', () => {
  const root = fileURLToPath(new URL('../render-fallback/', import.meta.url));
  const host = fileURLToPath(new URL('../shell/fallback-host.tsx', import.meta.url));
  const files = [...filesUnder(root).filter((path) => !isTestFile(path)), host]
    .map((path) => ({ path: relative(REPO_ROOT, path).split(sep).join('/'), text: readFileSync(path, 'utf8') }));
  for (const expected of ['chart.tsx', 'chart-model.ts', 'chart.css']) {
    assert.ok(files.some((file) => file.path === `src/render-fallback/${expected}`), `the walk reads ${expected}`);
  }
  assert.ok(files.some((file) => file.path === 'src/shell/fallback-host.tsx'), 'and the host');
  assert.deepEqual(auditFallback(files), []);
});

test('the Fallback audit rejects the word in a .ts, a .tsx and a .css file', () => {
  for (const [path, text] of [
    ['src/render-fallback/chart-model.ts', 'export const map = project.appearance.map;'],
    ['src/render-fallback/chart.tsx', 'return <i data-map={project.appearance.map} />;'],
    ['src/render-fallback/chart.css', '.chart-select { appearance: none; }'],
    ['src/shell/fallback-host.tsx', 'const look = project.appearance;'],
  ] as const) {
    assert.deepEqual(auditFallback([{ path, text }]), [`fallback: ${path} names appearance`], path);
  }
  assert.deepEqual(auditFallback([{ path: 'src/render-fallback/chart.tsx', text: 'const reappearances = 1;' }]), [], 'a near word does not count');
});

// --- The README's claim ---------------------------------------------------------------------------

const PREVIEW_OPENING = '**A re-solve regenerates the link preview**';

/** What the preview paragraph must keep saying, so the drift warning is not read as a stale card. */
const PREVIEW_CLAIMS: readonly (readonly [string, string])[] = [
  ['which re-solve', 'A re-solve changing only `appearance` and the version'],
  ['no recapture', 'needs no recapture'],
  ['the warning', 'the drift warning after it'],
  ['that it is expected', 'is expected'],
  ['that the card is not stale', 'not a stale card'],
  ['how long it lasts', 'until the next recapture'],
  ['why it warns', 'the guard sees times, not frames'],
];

function auditPreviewParagraph(readme: string): string[] {
  const paragraph = readme.split(/\r?\n/).find((line) => line.startsWith(PREVIEW_OPENING));
  if (paragraph === undefined) return ['preview: no paragraph'];
  return PREVIEW_CLAIMS.filter(([, text]) => !paragraph.includes(text)).map(([name]) => `preview: says nothing of ${name}`);
}

test('the preview paragraph says an appearance-only re-solve needs no recapture, and that the drift warning is expected', () => {
  assert.deepEqual(auditPreviewParagraph(README), []);
});

test('the preview audit fails when the paragraph loses any claim, and words elsewhere do not stand in', () => {
  assert.deepEqual(auditPreviewParagraph('# x\n'), ['preview: no paragraph']);
  for (const [name, text] of PREVIEW_CLAIMS) {
    const mutated = README.split(/\r?\n/).map((line) => (line.startsWith(PREVIEW_OPENING) ? line.replaceAll(text, '') : line)).join('\n');
    assert.deepEqual(auditPreviewParagraph(mutated), [`preview: says nothing of ${name}`], name);
  }
  const claims = PREVIEW_CLAIMS.map(([, text]) => text).join(' ');
  assert.equal(auditPreviewParagraph(`${PREVIEW_OPENING} nothing.\n\n${claims}\n`).length, PREVIEW_CLAIMS.length);
});

// --- The composition behind "no entry or no file" -----------------------------------------------

const GATE_STEPS = ['node src/derive/index.ts --check', 'node scripts/check-maps.ts'] as const;

/** The steps of `gate` a map's entry and file rest on, that the script does not chain. */
function gateLacks(gate: string): string[] {
  const steps = gate.split('&&').map((step) => step.trim());
  return GATE_STEPS.filter((step) => !steps.includes(step));
}

test('`gate` runs both the artifact check and check-maps, so a map has an entry and a file by composition', () => {
  const { scripts } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { scripts: { gate: string } };
  assert.deepEqual(gateLacks(scripts.gate), []);
  for (const step of GATE_STEPS) {
    const without = scripts.gate.split('&&').map((part) => part.trim()).filter((part) => part !== step).join(' && ');
    assert.deepEqual(gateLacks(without), [step], `without ${step}`);
  }
});

// --- The pipeline, over a substituted library -------------------------------------------------------

let scratch: string | undefined;

function tempDir(): string {
  scratch ??= mkdtempSync(join(tmpdir(), 'appearance-'));
  return scratch;
}

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});

let hookCount = 0;

/**
 * `src/derive/index.ts` in a child process with `map-library.ts` replaced by this
 * library, through a hook file in a temp directory. Nothing here edits the module
 * or writes under `generated/`: a solve is always given a temp out path.
 */
function indexOver(library: readonly MapEntry[], ...args: string[]): { status: number | null; stdout: string; stderr: string } {
  hookCount += 1;
  const hook = join(tempDir(), `library-hook-${hookCount}.mjs`);
  const source = `export const MAP_LIBRARY = ${JSON.stringify(library)};`;
  writeFileSync(
    hook,
    `import { registerHooks } from 'node:module';
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('/src/derive/map-library.ts')) return { format: 'module', source: ${JSON.stringify(source)}, shortCircuit: true };
    return nextLoad(url, context);
  },
});
`,
  );
  const run = spawnSync(process.execPath, ['--import', pathToFileURL(hook).href, 'src/derive/index.ts', ...args], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 60_000 });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

interface CommittedProject {
  readonly id: string;
  readonly appearance: Record<string, unknown>;
}

function committedProjects(document: unknown = COMMITTED): CommittedProject[] {
  return (document as { clients: { projects: CommittedProject[] }[] }).clients.flatMap((client) => client.projects);
}

/** The document with every `appearance` removed. */
function withoutAppearance(document: unknown): unknown {
  return JSON.parse(JSON.stringify(document, (key, value: unknown) => (key === 'appearance' ? undefined : value)));
}

/** A map added to the real library, whose id wins some of the committed Planets and not all. */
const GROWN_MAP = entry('europa', 0.5);
const GROWN = [...MAP_LIBRARY, GROWN_MAP];

test('the grown library’s new map wins some of the committed Planets and not all', () => {
  const won = committedProjects().filter((project) => appearanceOf(project.id, GROWN).map === GROWN_MAP.id);
  assert.ok(won.length > 0, 'it wins at least one, or the two grown rows below are vacuous');
  assert.ok(won.length < committedProjects().length, 'and leaves at least one');
});

test('over the real library substituted whole, the hook changes nothing: the gate passes', () => {
  const run = indexOver(MAP_LIBRARY, '--check');
  assert.equal(run.status, 0, run.stderr);
});

test('an empty library fails the solve with one line naming it and a Project, and writes nothing', () => {
  const out = join(tempDir(), 'empty.json');
  const run = indexOver([], fileURLToPath(new URL('../data/career.json', import.meta.url)), out);
  assert.equal(run.status, 1, run.stderr);
  const lines = run.stderr.split(/\r?\n/).filter((line) => line !== '' && !line.startsWith('warning:') && !line.startsWith('(node:') && !line.startsWith('(Use `node'));
  assert.equal(lines.length, 1, run.stderr);
  assert.match(lines[0] as string, /map library is empty/);
  assert.match(lines[0] as string, /"project:[^"]+"/, 'it names a Project');
  assert.equal(existsSync(out), false, 'no out file');
});

test('a grown library’s re-solve moves only the Planets the new map wins, and only their map and mean', () => {
  const out = join(tempDir(), 'grown.json');
  const run = indexOver(GROWN, fileURLToPath(new URL('../data/career.json', import.meta.url)), out);
  assert.equal(run.status, 0, run.stderr);
  const solved = JSON.parse(readFileSync(out, 'utf8')) as unknown;
  const before = new Map(committedProjects().map((project) => [project.id, project.appearance]));
  const projects = committedProjects(solved);
  assert.equal(projects.length, before.size);
  let moved = 0;
  for (const { id, appearance } of projects) {
    const held = before.get(id) as Record<string, unknown>;
    if (appearance['map'] === GROWN_MAP.id) {
      moved += 1;
      assert.equal(appearance['meanLuminance'], GROWN_MAP.meanLuminance, id);
      assert.deepEqual({ ...appearance, map: held['map'], meanLuminance: held['meanLuminance'] }, held, `${id}: only map and meanLuminance differ`);
    } else {
      assert.deepEqual(appearance, held, `${id} is unchanged`);
    }
  }
  assert.ok(moved > 0, 'the new map won something');
  assert.deepEqual(withoutAppearance(solved), withoutAppearance(COMMITTED), 'with appearance removed, the document is the committed one');
});

test('a grown library with no re-solve fails --check on the committed artifact, naming a Planet the new map won', () => {
  const run = indexOver(GROWN, '--check');
  assert.equal(run.status, 1, run.stderr);
  const won = committedProjects().filter((project) => appearanceOf(project.id, GROWN).map === GROWN_MAP.id);
  assert.ok(won.length > 0);
  for (const project of won) {
    assert.ok(run.stderr.includes(`"${project.id}" has appearance.map`), `${project.id}: ${run.stderr}`);
  }
  assert.ok(run.stderr.includes(`"${GROWN_MAP.id}"`), run.stderr);
  assert.match(run.stderr, /npm run solve/);
});
