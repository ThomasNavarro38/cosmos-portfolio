/**
 * The map library's gate step over `mkdtemp` fixture trees (7.3): every row of
 * the story's matrix, through the function and through the CLI; the three WebP
 * forms read from synthetic headers; the audits that hold the step free of a
 * decoder and the network, the manifests free of an image tool, and the budgets
 * in their one home; and the real tree.
 *
 * The budgets are imported here and nowhere else outside `render-scene/realism/`
 * and `scripts/`: the audit below is what says so.
 */

import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix, relative, sep } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkMaps, describeReport, measureMaps, parseArgs } from './check-maps.ts';
import { filesUnder, SOURCE_MODULE, stripComments, stripCommentsAndStrings } from './source-scan.ts';
import { MAP_LIBRARY } from '../src/derive/map-library.ts';
import { MAP_COUNT_BUDGET, MAP_HEIGHT_BUDGET, MAP_TOTAL_BYTES_BUDGET, MAP_WIDTH_BUDGET } from '../src/render-scene/realism/budgets.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCRIPT = fileURLToPath(new URL('./check-maps.ts', import.meta.url));
const BUDGETS = fileURLToPath(new URL('../src/render-scene/realism/budgets.ts', import.meta.url));

type Form = 'VP8 ' | 'VP8L' | 'VP8X';

/** A RIFF WebP of `form` at `width`×`height`, whose chunk and RIFF sizes agree with its bytes, `total` bytes long at least. */
function webp(form: Form, width: number, height: number, total = 64): Buffer {
  const size = Math.max(total, 30);
  const bytes = Buffer.alloc(size);
  bytes.write('RIFF', 0, 'latin1');
  bytes.writeUInt32LE(size - 8, 4);
  bytes.write('WEBP', 8, 'latin1');
  bytes.write(form, 12, 'latin1');
  if (form === 'VP8X') {
    bytes.writeUInt32LE(10, 16);
    bytes.writeUIntLE(width - 1, 24, 3);
    bytes.writeUIntLE(height - 1, 27, 3);
    return bytes;
  }
  bytes.writeUInt32LE(size - 20, 16);
  if (form === 'VP8L') {
    bytes[20] = 0x2f;
    // Bit 28 is the alpha hint, not size: set here so that a reader dropping the height's mask fails.
    bytes.writeUInt32LE(((width - 1) | ((height - 1) << 14) | (1 << 28)) >>> 0, 21);
    return bytes;
  }
  bytes.set([0x9d, 0x01, 0x2a], 23);
  // The top two bits of each dimension are a scale, not size: set here so that a reader keeping them fails.
  bytes.writeUInt16LE(width | 0x4000, 26);
  bytes.writeUInt16LE(height | 0x8000, 28);
  return bytes;
}

/** A file whose RIFF size agrees with its length, so that only the guard under test can stop it. */
function shortFile(form: Form, length: number, chunkBytes = length - 20): Buffer {
  const bytes = Buffer.alloc(length);
  bytes.write('RIFF', 0, 'latin1');
  bytes.writeUInt32LE(length - 8, 4);
  bytes.write('WEBP', 8, 'latin1');
  bytes.write(form, 12, 'latin1');
  bytes.writeUInt32LE(chunkBytes, 16);
  return bytes;
}

interface Row {
  readonly id?: unknown;
  readonly sourceUrl?: unknown;
  readonly licence?: unknown;
  readonly credit?: unknown;
  readonly retrievedOn?: unknown;
  readonly meanLuminance?: unknown;
}

function entry(id: string, changes: Row = {}): Row {
  return {
    id,
    sourceUrl: 'https://svs.gsfc.nasa.gov/4720',
    licence: 'Access constraints: public domain. Use constraints: None.',
    credit: 'USGS Astrogeology Science Center',
    retrievedOn: '2026-11-04',
    meanLuminance: 0.25,
    ...changes,
  };
}

/** The library as module source: `NaN` and `undefined` have no JSON, so each is written out. */
function librarySource(entries: readonly unknown[]): string {
  const text = JSON.stringify(entries, (_key, value: unknown) => (typeof value === 'number' && Number.isNaN(value) ? '__NaN__' : value));
  return `export const MAP_LIBRARY = ${text.replaceAll('"__NaN__"', 'NaN')};\n`;
}

interface Fixture {
  /** The library's module source, or its entries; absent writes the one-map default. */
  readonly library?: readonly unknown[] | string;
  /** `public/textures/` by name: bytes, or `null` for a subdirectory. Absent writes the default; `'none'` no directory at all; `'file'` a file in its place. */
  readonly textures?: Readonly<Record<string, Uint8Array | null>> | 'none' | 'file';
}

let scratch: string | undefined;
let count = 0;

function treeOf({ library, textures }: Fixture = {}): string {
  scratch ??= mkdtempSync(join(tmpdir(), 'check-maps-'));
  count += 1;
  const root = join(scratch, `root-${count}`);
  mkdirSync(join(root, 'src', 'derive'), { recursive: true });
  writeFileSync(join(root, 'package.json'), '{ "type": "module" }\n');
  const source = library ?? [entry('mars')];
  writeFileSync(join(root, 'src', 'derive', 'map-library.ts'), typeof source === 'string' ? source : librarySource(source));
  if (textures === 'file') {
    mkdirSync(join(root, 'public'), { recursive: true });
    writeFileSync(join(root, 'public', 'textures'), 'not a directory\n');
  } else if (textures !== 'none') {
    const dir = join(root, 'public', 'textures');
    mkdirSync(dir, { recursive: true });
    for (const [name, bytes] of Object.entries(textures ?? { 'mars.webp': webp('VP8 ', 1024, 512) })) {
      if (bytes === null) mkdirSync(join(dir, name));
      else writeFileSync(join(dir, name), bytes);
    }
  }
  return root;
}

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});

const GOOD_MAP = webp('VP8 ', 1024, 512);

/** One map named `mars` under `changes`: the entry-field rows. */
const badEntry = (changes: Row): Fixture => ({ library: [entry('mars', changes)] });

const MANY = Array.from({ length: 13 }, (_, index) => `map-${index}`);
const PNG_BYTES = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(56)]);
const LIES_ABOUT_SIZE = Buffer.from(GOOD_MAP);
LIES_ABOUT_SIZE.writeUInt32LE(GOOD_MAP.length, 4);
const UNKNOWN_CHUNK = Buffer.from(GOOD_MAP);
UNKNOWN_CHUNK.write('ALPH', 12, 'latin1');
const NO_START_CODE = Buffer.from(GOOD_MAP);
NO_START_CODE[23] = 0;
const NOT_KEYFRAME = Buffer.from(GOOD_MAP);
NOT_KEYFRAME[20] = 1;
const NO_SIGNATURE = webp('VP8L', 1024, 512);
NO_SIGNATURE[20] = 0;
const CHUNK_OVERRUNS = Buffer.from(GOOD_MAP);
CHUNK_OVERRUNS.writeUInt32LE(GOOD_MAP.length, 16);
const WRONG_RIFF_TYPE = Buffer.from(GOOD_MAP);
WRONG_RIFF_TYPE.write('WAVE', 8, 'latin1');
const ZERO_WIDTH = Buffer.from(GOOD_MAP);
ZERO_WIDTH.writeUInt16LE(0, 26);
const ZERO_HEIGHT = Buffer.from(GOOD_MAP);
ZERO_HEIGHT.writeUInt16LE(0, 28);
const VP8X_WRONG_CHUNK = webp('VP8X', 1024, 512);
VP8X_WRONG_CHUNK.writeUInt32LE(12, 16);

/** Refused wherever a page's words are recorded: the licence and the credit alike. */
const REFUSED_WORDINGS: readonly string[] = [
  '© NASA',
  'Copyright 2024 Foo Corp',
  'Copyright Foo Corp',
  'copyright 2024',
  'COPYRIGHT 2024 Foo',
  'copyright by Foo Corp',
  'Copyrighted by Foo Corp',
  'copyrighted 2024',
  '(c) 2024 Foo Corp',
  '(C) 1999',
  '&copy; Foo Corp',
  'Creative  Commons Attribution',
  'creative-commons',
  'CC BY 4.0',
  'cc-by-sa',
  'cc_by',
  'cc_by_sa',
  'CC0',
  'cc0 1.0',
  'non-commercial use only',
  'Noncommercial',
  'All rights reserved.',
  'Copyright (c) Foo Corp',
  'Copyright (C) NASA',
  '(c) Foo Corp',
  'Copyright: Foo Corp',
  'Copyright: 2024 Foo',
  'Copyright, Foo Corp',
  'Copyrights held by Foo Corp',
  'CC-0',
  'CC 0',
  'non–commercial',
  'Not for commercial use',
  'Some rights reserved',
];

/** Every failing row of the matrix: the fixture, and what its one failure must name. */
const FAILING: readonly (readonly [string, Fixture, RegExp])[] = [
  // Empty library, no directory.
  ['an empty library', { library: [], textures: {} }, /map library is empty/],
  ['no public/textures/', { textures: 'none' }, /public\/textures\/ is missing.*empty/],
  ['no MAP_LIBRARY export', { library: 'export const OTHER = [];\n' }, /MAP_LIBRARY is not an array/],
  ['a library that does not parse', { library: 'export const MAP_LIBRARY = [;\n' }, /map-library\.ts could not be read/],
  ['public/textures as a file', { textures: 'file' }, /public\/textures\/ could not be read/],
  // A file and its entry.
  ['a file without an entry', { textures: { 'mars.webp': GOOD_MAP, 'extra.webp': GOOD_MAP } }, /extra\.webp has no entry/],
  ['an entry without a file', { textures: {} }, /"mars" has no file: public\/textures\/mars\.webp/],
  ['a stray JSON', { textures: { 'mars.webp': GOOD_MAP, 'notes.json': Buffer.from('{}') } }, /notes\.json is stray/],
  ['a stray .gitkeep', { textures: { 'mars.webp': GOOD_MAP, '.gitkeep': Buffer.alloc(0) } }, /\.gitkeep is stray/],
  ['a subdirectory', { textures: { 'mars.webp': GOOD_MAP, sub: null } }, /public\/textures\/sub is stray/],
  ['an upper-case extension', { textures: { 'mars.webp': GOOD_MAP, 'moon.WEBP': GOOD_MAP } }, /moon\.WEBP is stray/],
  // Not WebP.
  ['PNG bytes', { textures: { 'mars.webp': PNG_BYTES } }, /mars\.webp is not WebP/],
  ['an empty file', { textures: { 'mars.webp': Buffer.alloc(0) } }, /mars\.webp is not WebP: truncated/],
  ['a header cut before the chunk', { textures: { 'mars.webp': GOOD_MAP.subarray(0, 14) } }, /mars\.webp is not WebP: truncated/],
  ['a header cut inside the frame', { textures: { 'mars.webp': GOOD_MAP.subarray(0, 25) } }, /mars\.webp is not WebP: its RIFF size says 64 bytes, and the file has 25/],
  ['a consistent short VP8 file, at the chunk header', { textures: { 'mars.webp': shortFile('VP8 ', 20) } }, /mars\.webp is not WebP: truncated header/],
  ['a consistent short VP8 file', { textures: { 'mars.webp': shortFile('VP8 ', 29) } }, /mars\.webp is not WebP: truncated header/],
  ['a consistent short VP8L file', { textures: { 'mars.webp': shortFile('VP8L', 24) } }, /mars\.webp is not WebP: truncated header/],
  ['a consistent short VP8X file', { textures: { 'mars.webp': shortFile('VP8X', 29) } }, /mars\.webp is not WebP: truncated header/],
  ['a VP8 chunk under 10 bytes', { textures: { 'mars.webp': shortFile('VP8 ', 64, 9) } }, /mars\.webp is not WebP: truncated header/],
  ['a VP8L chunk under 5 bytes', { textures: { 'mars.webp': shortFile('VP8L', 64, 4) } }, /mars\.webp is not WebP: truncated header/],
  ['a VP8X chunk other than 10 bytes', { textures: { 'mars.webp': VP8X_WRONG_CHUNK } }, /mars\.webp is not WebP: its VP8X chunk says 12 bytes, not 10/],
  ['a RIFF size disagreeing with the file', { textures: { 'mars.webp': LIES_ABOUT_SIZE } }, /mars\.webp is not WebP: its RIFF size/],
  ['another RIFF type', { textures: { 'mars.webp': WRONG_RIFF_TYPE } }, /mars\.webp is not WebP/],
  ['an unknown first chunk', { textures: { 'mars.webp': UNKNOWN_CHUNK } }, /mars\.webp is not WebP: .*ALPH/],
  ['a VP8 chunk with no start code', { textures: { 'mars.webp': NO_START_CODE } }, /mars\.webp is not WebP: .*start code/],
  ['a VP8 chunk that is not a key frame', { textures: { 'mars.webp': NOT_KEYFRAME } }, /mars\.webp is not WebP: .*key frame/],
  ['a VP8L chunk with no signature', { textures: { 'mars.webp': NO_SIGNATURE } }, /mars\.webp is not WebP: .*signature/],
  ['a chunk overrunning the file', { textures: { 'mars.webp': CHUNK_OVERRUNS } }, /mars\.webp is not WebP: .*chunk/],
  ['a width of zero', { textures: { 'mars.webp': ZERO_WIDTH } }, /mars\.webp is not WebP: .*zero/],
  ['a height of zero', { textures: { 'mars.webp': ZERO_HEIGHT } }, /mars\.webp is not WebP: .*zero/],
  // Not 2:1: an equirectangular map of another aspect stretches on the sphere.
  ['700×300, VP8', { textures: { 'mars.webp': webp('VP8 ', 700, 300) } }, /mars\.webp is 700×300; a map must be 2:1/],
  ['700×300, VP8L', { textures: { 'mars.webp': webp('VP8L', 700, 300) } }, /mars\.webp is 700×300; a map must be 2:1/],
  ['700×300, VP8X', { textures: { 'mars.webp': webp('VP8X', 700, 300) } }, /mars\.webp is 700×300; a map must be 2:1/],
  ['512×512', { textures: { 'mars.webp': webp('VP8 ', 512, 512) } }, /mars\.webp is 512×512; a map must be 2:1/],
  ['1024×511', { textures: { 'mars.webp': webp('VP8 ', 1024, 511) } }, /mars\.webp is 1024×511; a map must be 2:1/],
  ['1×1', { textures: { 'mars.webp': webp('VP8 ', 1, 1) } }, /mars\.webp is 1×1; a map must be 2:1/],
  // Over budget.
  [
    '13 maps',
    { library: MANY.map((id) => entry(id)), textures: Object.fromEntries(MANY.map((id) => [`${id}.webp`, GOOD_MAP])) },
    /13 maps.*limit is 12/,
  ],
  ['1025×512, VP8', { textures: { 'mars.webp': webp('VP8 ', 1025, 512) } }, /mars\.webp is 1025×512.*limit is 1024×512/],
  ['1024×513, VP8', { textures: { 'mars.webp': webp('VP8 ', 1024, 513) } }, /mars\.webp is 1024×513.*limit is 1024×512/],
  ['1025×512, VP8L', { textures: { 'mars.webp': webp('VP8L', 1025, 512) } }, /mars\.webp is 1025×512.*limit/],
  ['1024×513, VP8L', { textures: { 'mars.webp': webp('VP8L', 1024, 513) } }, /mars\.webp is 1024×513.*limit/],
  ['1025×512, VP8X', { textures: { 'mars.webp': webp('VP8X', 1025, 512) } }, /mars\.webp is 1025×512.*limit/],
  ['1024×513, VP8X', { textures: { 'mars.webp': webp('VP8X', 1024, 513) } }, /mars\.webp is 1024×513.*limit/],
  ['above 4,000,000 bytes', { textures: { 'mars.webp': webp('VP8 ', 1024, 512, 4_000_001) } }, /4000001 bytes.*limit is 4000000/],
  // A bad entry, naming the id and the field.
  ['a duplicate id', { library: [entry('mars'), entry('mars')] }, /entry "mars" field id is a duplicate/],
  ['a path as id', { library: [entry('../mars')], textures: {} }, /entry "\.\.\/mars" field id/],
  ['an extension on the id', { library: [entry('mars.webp')], textures: {} }, /entry "mars\.webp" field id/],
  ['an upper-case id', { library: [entry('Mars')], textures: {} }, /entry "Mars" field id/],
  ['a slash in the id', { library: [entry('a/b')], textures: {} }, /entry "a\/b" field id/],
  ['an empty id', { library: [entry('')], textures: {} }, /entry "" field id/],
  ['an id that is no string', { library: [entry('x', { id: 4 })], textures: {} }, /entry 1 field id/],
  ['an entry that is no object', { library: ['mars'], textures: {} }, /entry 1 is not an object/],
  ['a library that is one hole', { library: 'export const MAP_LIBRARY = [,];\n', textures: {} }, /entry 1 is not an object/],
  ['a hole beside an entry', { library: `export const MAP_LIBRARY = [${JSON.stringify(entry('mars'))}, , ];\n` }, /entry 2 is not an object/],
  ['an http:// URL', badEntry({ sourceUrl: 'http://svs.gsfc.nasa.gov/4720' }), /entry "mars" field sourceUrl/],
  ['another host', badEntry({ sourceUrl: 'https://example.com/mars' }), /entry "mars" field sourceUrl/],
  ['a host ending in a lookalike', badEntry({ sourceUrl: 'https://nasa.gov.evil.example/mars' }), /entry "mars" field sourceUrl/],
  ['a host with the name inside', badEntry({ sourceUrl: 'https://evilnasa.gov/mars' }), /entry "mars" field sourceUrl/],
  ['a user@host', badEntry({ sourceUrl: 'https://nasa.gov@evil.example/mars' }), /entry "mars" field sourceUrl/],
  ['a port', badEntry({ sourceUrl: 'https://nasa.gov:8443/mars' }), /entry "mars" field sourceUrl/],
  ['a query', badEntry({ sourceUrl: 'https://nasa.gov/mars?u=x' }), /entry "mars" field sourceUrl/],
  ['a URL followed off-site', badEntry({ sourceUrl: 'https://nasa.gov/https://evil.example' }), /entry "mars" field sourceUrl/],
  ['a URL that is no string', badEntry({ sourceUrl: 1 }), /entry "mars" field sourceUrl/],
  ['no URL', badEntry({ sourceUrl: undefined }), /entry "mars" field sourceUrl/],
  ...REFUSED_WORDINGS.map((licence) => [`the licence ${licence}`, badEntry({ licence }), /entry "mars" field licence/] as const),
  ...REFUSED_WORDINGS.map((credit) => [`the credit ${credit}`, badEntry({ credit }), /entry "mars" field credit/] as const),
  ['an empty licence', badEntry({ licence: '  ' }), /entry "mars" field licence/],
  ['an empty credit', badEntry({ credit: '' }), /entry "mars" field credit/],
  ['a blank credit', badEntry({ credit: ' \t' }), /entry "mars" field credit/],
  ['a credit that is no string', badEntry({ credit: 3 }), /entry "mars" field credit/],
  ['an impossible day', badEntry({ retrievedOn: '2026-02-30' }), /entry "mars" field retrievedOn/],
  ['an impossible month', badEntry({ retrievedOn: '2026-13-01' }), /entry "mars" field retrievedOn/],
  ['another date form', badEntry({ retrievedOn: '04/11/2026' }), /entry "mars" field retrievedOn/],
  ['a mean of 0', badEntry({ meanLuminance: 0 }), /entry "mars" field meanLuminance/],
  ['a mean above 1', badEntry({ meanLuminance: 1.0001 }), /entry "mars" field meanLuminance/],
  ['a negative mean', badEntry({ meanLuminance: -0.5 }), /entry "mars" field meanLuminance/],
  ['a mean of NaN', badEntry({ meanLuminance: Number.NaN }), /entry "mars" field meanLuminance/],
  ['a mean that is a string', badEntry({ meanLuminance: '0.5' }), /entry "mars" field meanLuminance/],
];

test('every failing row of the matrix fails, naming it, with no crash', async () => {
  for (const [name, fixture, message] of FAILING) {
    const failures = await checkMaps(treeOf(fixture));
    assert.ok(failures.length > 0, `"${name}" must fail`);
    assert.match(failures.join('\n'), message, name);
  }
});

test('a failing row has its one failure, not a cascade from it', async () => {
  for (const [name, fixture] of [
    ['an extra file', { textures: { 'mars.webp': GOOD_MAP, 'extra.webp': GOOD_MAP } }],
    ['an entry without a file', { textures: {} }],
    ['PNG bytes', { textures: { 'mars.webp': PNG_BYTES } }],
    ['a bad credit', badEntry({ credit: '' })],
    ['a duplicate id', { library: [entry('mars'), entry('mars')] }],
    ['a library that does not parse, with a file beside it', { library: 'export const MAP_LIBRARY = [;\n' }],
    ['a library with no array, with a file beside it', { library: 'export const OTHER = [];\n' }],
    ['a rejected id, with the file its lower case names', { library: [entry('Mars')] }],
    ['a rejected id, with the file it names', { library: [entry('Mars')], textures: { 'Mars.webp': GOOD_MAP } }],
    ['a rejected id with an extension, with its file', { library: [entry('mars.webp')] }],
    ['a rejected id with a path, with its file', { library: [entry('../mars')] }],
    ['public/textures as a file', { textures: 'file' }],
  ] as const) {
    const failures = await checkMaps(treeOf(fixture));
    assert.equal(failures.length, 1, `${name}: ${failures.join('\n')}`);
  }
});

test('an unread library still has its files read, and a rejected id hides no other file', async () => {
  const unread = await checkMaps(treeOf({ library: 'export const MAP_LIBRARY = [;\n', textures: { 'mars.webp': PNG_BYTES, 'notes.json': Buffer.from('{}') } }));
  assert.equal(unread.length, 3, unread.join('\n'));
  assert.match(unread.join('\n'), /mars\.webp is not WebP/);
  assert.match(unread.join('\n'), /notes\.json is stray/);
  const rejected = await checkMaps(treeOf({ library: [entry('Mars')], textures: { 'mars.webp': GOOD_MAP, 'extra.webp': GOOD_MAP } }));
  assert.equal(rejected.length, 2, rejected.join('\n'));
  assert.match(rejected.join('\n'), /extra\.webp has no entry/);
});

test('the wording NASA and USGS give passes the refusal, in the licence and the credit', async () => {
  for (const wording of [
    ...MAP_LIBRARY.flatMap((map) => [map.licence, map.credit]),
    'No licence statement, no third-party copyright. NASA media guidelines: "generally are not subject to copyright in the United States".',
    'not subject to copyright in the United States',
    'no third-party copyright',
    'Access constraints: public domain. Use constraints: None.',
  ]) {
    assert.deepEqual(await checkMaps(treeOf(badEntry({ licence: wording, credit: wording }))), [], wording);
  }
});

test('every failure is collected rather than the first one stopping the run', async () => {
  const failures = await checkMaps(
    treeOf({
      library: [entry('mars', { credit: '' }), entry('io')],
      textures: { 'mars.webp': PNG_BYTES, 'extra.webp': GOOD_MAP, 'notes.json': Buffer.from('{}') },
    }),
  );
  assert.equal(failures.length, 5, failures.join('\n'));
});

test('the CLI exits 1 naming each failing row, and prints what it measured on a clean tree', () => {
  for (const [name, fixture, message] of FAILING) {
    const run = spawnSync(process.execPath, [SCRIPT, `--root=${treeOf(fixture)}`], { encoding: 'utf8' });
    assert.equal(run.status, 1, `${name}: ${run.stdout}`);
    assert.match(run.stderr, message, name);
    assert.equal(run.stdout, '', `${name} reports no pass`);
    assert.doesNotMatch(run.stderr, /\n\s+at /, `${name} is a failure line, not a stack`);
  }
  const clean = spawnSync(process.execPath, [SCRIPT, `--root=${treeOf()}`], { encoding: 'utf8' });
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /1 map/);
  const typo = spawnSync(process.execPath, [SCRIPT, '--chek'], { encoding: 'utf8' });
  assert.equal(typo.status, 1);
  assert.match(typo.stderr, /unknown argument/);
});

test('parseArgs takes --root= once, and rejects anything else', () => {
  assert.deepEqual(parseArgs([]), { root: REPO_ROOT });
  assert.deepEqual(parseArgs(['--root=/x']), { root: '/x' });
  assert.ok(Array.isArray(parseArgs(['--check'])));
  assert.ok(Array.isArray(parseArgs(['--root='])));
  assert.ok(Array.isArray(parseArgs(['--root=/x', '--root=/y'])));
});

test('all three WebP forms read their dimensions, at the limit and at the smallest', async () => {
  for (const form of ['VP8 ', 'VP8L', 'VP8X'] as const) {
    for (const [width, height] of [
      [1024, 512],
      [512, 256],
      [2, 1],
    ] as const) {
      const report = await measureMaps(treeOf({ textures: { 'mars.webp': webp(form, width, height) } }));
      assert.deepEqual(report.failures, [], `${form} ${width}×${height}`);
      assert.deepEqual(report.maps, [{ id: 'mars', form: form.trim(), width, height, bytes: 64 }]);
    }
  }
});

test('the budgets are inclusive: 12 maps, 1024×512 and 4,000,000 bytes pass; a mean of 1 passes', async () => {
  const ids = MANY.slice(0, 12);
  const each = Math.floor(MAP_TOTAL_BYTES_BUDGET / 12);
  const last = MAP_TOTAL_BYTES_BUDGET - each * 11;
  const textures = Object.fromEntries(ids.map((id, index) => [`${id}.webp`, webp('VP8 ', 1024, 512, index === 11 ? last : each)]));
  const report = await measureMaps(treeOf({ library: ids.map((id) => entry(id, { meanLuminance: 1 })), textures }));
  assert.deepEqual(report.failures, []);
  assert.equal(report.totalBytes, MAP_TOTAL_BYTES_BUDGET);
});

test('a stray file still counts against the total, since dist/ would ship it', async () => {
  const report = await measureMaps(treeOf({ textures: { 'mars.webp': GOOD_MAP, 'notes.bin': Buffer.alloc(MAP_TOTAL_BYTES_BUDGET) } }));
  assert.match(report.failures.join('\n'), /notes\.bin is stray/);
  assert.match(report.failures.join('\n'), /limit is 4000000/);
});

test('both NASA and USGS, with or without a subdomain or a path, pass', async () => {
  for (const sourceUrl of ['https://nasa.gov', 'https://usgs.gov/', 'https://svs.gsfc.nasa.gov/4720', 'https://astrogeology.usgs.gov/search/map/mars_925m', 'https://science.nasa.gov/a-b/c/']) {
    assert.deepEqual(await checkMaps(treeOf(badEntry({ sourceUrl }))), [], sourceUrl);
  }
});

test('the pass line names what was measured, and says a mean is as recorded, not verified', async () => {
  const report = await measureMaps(treeOf({ library: [entry('mars', { meanLuminance: 0.123 })] }));
  const line = describeReport(report);
  for (const part of [/1 map/, /of 12/, /mars/, /1024×512/, /VP8/, /each entry has its file, by name/, /64 of 4000000 bytes/, /mars 0\.123/, /not verified/]) assert.match(line, part);
  assert.doesNotMatch(line, /matching/, 'the gate matches a name and a header, never the file against its entry');
});

// --- The real tree -----------------------------------------------------------------------------------

test('the committed library and public/textures/ pass, and every entry has exactly its file', async () => {
  const report = await measureMaps(REPO_ROOT);
  assert.deepEqual(report.failures, []);
  assert.deepEqual(report.maps.map((map) => map.id), ['moon', 'mars', 'io', 'jupiter']);
  for (const map of report.maps) {
    assert.equal(map.width, 1024, map.id);
    assert.equal(map.height, 512, map.id);
  }
  assert.deepEqual(
    readdirSync(join(REPO_ROOT, 'public', 'textures')).sort(),
    report.maps.map((map) => `${map.id}.webp`).sort(),
  );
});

test('`npm run gate` runs check-maps just before check-pins, and needs no workflow change', () => {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
  assert.match(pkg.scripts['gate'] ?? '', /&& node scripts\/check-maps\.ts && node scripts\/check-pins\.ts$/);
  assert.match(readFileSync(join(REPO_ROOT, '.github', 'workflows', 'ci.yml'), 'utf8'), /npm run gate/);
});

test('`.gitattributes` keeps a map out of line-ending normalisation', () => {
  assert.match(readFileSync(join(REPO_ROOT, '.gitattributes'), 'utf8'), /^\*\.webp\s+binary\s*$/m);
});

// --- No decoder, no encoder, no network --------------------------------------------------------------

/** The step's own modules, and no other. */
const STEP_IMPORTS = new Set(['node:fs', 'node:path', 'node:url', '../src/render-scene/realism/budgets.ts']);

/** The one dynamic import the step may hold: the library, through the `--root=` seam. */
const LIBRARY_IMPORT = 'import(pathToFileURL(';

function auditGateStep(source: string): string[] {
  const failures: string[] = [];
  const literals = stripComments(source);
  for (const match of literals.matchAll(/\bfrom\s*['"`]([^'"`]*)['"`]|\bimport\s*['"`]([^'"`]*)['"`]|\brequire\s*\(\s*['"`]([^'"`]*)['"`]|\bimport\s*\(\s*['"`]([^'"`]*)['"`]/g)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? match[4] ?? '';
    if (!STEP_IMPORTS.has(specifier) || match[0].startsWith('require')) failures.push(`gate step: reaches ${specifier}`);
  }
  const code = stripCommentsAndStrings(source);
  for (const match of code.matchAll(/\bimport\s*\(/g)) {
    if (!code.slice(match.index).startsWith(LIBRARY_IMPORT)) failures.push('gate step: a dynamic import other than the library');
  }
  for (const [label, pattern] of [
    ['a request', /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|createConnection|sendBeacon)\b/],
    ['a whole-file read', /\b(?:readFileSync|readFile|createReadStream)\b/],
    ['a process', /\b(?:spawn|spawnSync|exec|execSync|execFile|execFileSync)\b/],
    ['evaluated code', /\b(?:eval|Function)\s*\(/],
  ] as const) {
    if (pattern.test(code)) failures.push(`gate step: ${label}`);
  }
  return failures;
}

test('check-maps holds no decoder import and no network reach, and reads no whole file', () => {
  assert.deepEqual(auditGateStep(readFileSync(SCRIPT, 'utf8')), []);
});

test('the gate-step audit rejects each reach, and a mention in a comment is prose', () => {
  const real = readFileSync(SCRIPT, 'utf8');
  for (const [name, addition] of [
    ['a decoder', "import sharp from 'sharp';"],
    ['a named decoder', "import { decode } from '@jsquash/webp';"],
    ['a bare import', "import 'jimp';"],
    ['a dynamic decoder', "const s = await import('sharp');"],
    ['a computed import', 'const s = await import(name);'],
    ['a require', "const s = require('node:fs');"],
    ['a network module', "import { get } from 'node:https';"],
    ['the net module', "import { connect } from 'node:net';"],
    ['a process', "import { spawnSync } from 'node:child_process';"],
    ['a fetch', "void fetch('/x');"],
    ['a socket', "new WebSocket('wss://x');"],
    ['a whole-file read', "import { readFileSync } from 'node:fs'; readFileSync('x');"],
    ['an async whole-file read', "import { readFile } from 'node:fs'; readFile('x', () => {});"],
    ['a read stream', "import { createReadStream } from 'node:fs'; createReadStream('x');"],
    ['evaluated code', "new Function('x');"],
  ] as const) {
    assert.ok(auditGateStep(`${real}\n${addition}\n`).length > 0, `"${name}" must be rejected`);
  }
  assert.deepEqual(auditGateStep(`${real}\n// import sharp from 'sharp'; fetch('/x');\n`), [], 'a comment is prose');
});

const IMAGE_TOOL =
  /\b(?:sharp|jimp|pngjs|upng|imagemin|imagemagick|magick|graphicsmagick|gm|squoosh|jsquash|cwebp|dwebp|gif2webp|libwebp|webp|vips|libvips|pillow|canvas|node-canvas|image-js|image-size|stb)\b/i;

function auditManifest(path: string, text: string): string[] {
  return text.split(/\r?\n/).flatMap((line, index) => (IMAGE_TOOL.test(line) ? [`image tool: ${path}:${index + 1}`] : []));
}

function manifestTexts(): readonly (readonly [string, string])[] {
  const dir = join(REPO_ROOT, '.github', 'workflows');
  return [
    ['package.json', readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')],
    ...readdirSync(dir).map((name) => [`.github/workflows/${name}`, readFileSync(join(dir, name), 'utf8')] as const),
  ];
}

test('package.json and the workflows name no image encoder or decoder', () => {
  const manifests = manifestTexts();
  assert.ok(manifests.length >= 3, 'package.json and at least two workflows were read');
  assert.deepEqual(manifests.flatMap(([path, text]) => auditManifest(path, text)), []);
});

test('the manifest audit rejects each tool, in a dependency, a script and a workflow step', () => {
  for (const [name, text] of [
    ['a dependency', '"sharp": "0.34.0",'],
    ['a scoped decoder', '"@jsquash/webp": "1.0.0",'],
    ['a script', '"maps": "cwebp -q 80 x.png -o x.webp",'],
    ['a workflow step', '      - run: sudo apt-get install -y webp'],
    ['a Python tool', '      - run: pip install pillow'],
    ['a canvas', '"canvas": "3.0.0",'],
  ] as const) {
    assert.equal(auditManifest('x', text).length, 1, `"${name}" must be rejected`);
  }
  assert.deepEqual(auditManifest('x', '"react": "19.2.8",\n"gate": "node scripts/check-maps.ts"'), []);
});

// --- The budgets' one home ---------------------------------------------------------------------------

test('the budgets are the library’s four limits, by value', () => {
  assert.equal(MAP_COUNT_BUDGET, 12);
  assert.equal(MAP_WIDTH_BUDGET, 1024);
  assert.equal(MAP_HEIGHT_BUDGET, 512);
  assert.equal(MAP_TOTAL_BYTES_BUDGET, 4_000_000);
});

/** Anything that would give `budgets.ts` a dependency, or make it a door to another module. */
function auditBudgetsModule(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const failures: string[] = [];
  for (const [label, pattern] of [
    ['an import', /\bimport\b/],
    ['a re-export', /\bexport\s*(?:type\s*)?(?:\*|\{)/],
    ['a require', /\brequire\s*\(/],
    ['a from clause', /\bfrom\s*['"`]/],
  ] as const) {
    if (pattern.test(code)) failures.push(`budgets: ${label}`);
  }
  return failures;
}

test('budgets.ts has no import and no re-export', () => {
  assert.deepEqual(auditBudgetsModule(readFileSync(BUDGETS, 'utf8')), []);
});

test('the budgets audit rejects each dependency form, and a comment is prose', () => {
  const real = readFileSync(BUDGETS, 'utf8');
  for (const addition of [
    "import { x } from './x.ts';",
    "import './x.ts';",
    "const x = await import('./x.ts');",
    "export * from './x.ts';",
    "export { x } from './x.ts';",
    'const x = 1;\nexport { x };',
    "export type { X } from './x.ts';",
    "const x = require('./x.ts');",
  ]) {
    assert.ok(auditBudgetsModule(`${real}\n${addition}\n`).length > 0, addition);
  }
  assert.deepEqual(auditBudgetsModule(`${real}\n// import x from './x.ts';\n`), [], 'a comment is prose');
});

interface Source {
  readonly path: string;
  readonly text: string;
}

const BUDGETS_HOME = /^(?:src\/render-scene\/realism\/|scripts\/)/;
/** With or without an extension, and under any `?raw`, `?url` or `#` suffix, which reach the same file. */
const BUDGETS_MODULE = /(?:^|\/)render-scene\/realism\/budgets(?:\.[cm]?[jt]s)?(?:[?#].*)?$/;
const REEXPORT = /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*['"`]([^'"`\n]*)['"`]/g;

/** The specifier as a repo-relative path, when relative to its file; otherwise as written, less a leading slash. */
function specifierTarget(path: string, specifier: string): string {
  return specifier.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), specifier)) : specifier.replace(/^\/+/, '');
}

/**
 * Every file outside the budgets' home that reaches them: a string naming the
 * module, whatever holds it (`import`, `export … from`, `import()`, `require`,
 * `new URL`), a dynamic import whose argument is built and mentions them, or an
 * `import.meta.glob` naming the realism directory. And inside the home, a
 * `realism/` module re-exporting them: a barrel would carry them out, and every
 * importer of it would pass the scan above.
 *
 * Not seen: a `realism/` module importing a budget and exporting it under its
 * own name, a glob wide enough to match the directory without naming it, and any
 * tracked directory other than `src/`, `spikes/` and the repo root's own files.
 */
function auditBudgetsImporters(files: readonly Source[]): string[] {
  const failures: string[] = [];
  for (const { path, text } of files) {
    if (path.startsWith('src/render-scene/realism/')) {
      for (const match of text.matchAll(REEXPORT)) {
        if (BUDGETS_MODULE.test(specifierTarget(path, match[1] as string))) failures.push(`budgets reach: ${path} re-exports ${match[1] as string}`);
      }
    }
    if (BUDGETS_HOME.test(path)) continue;
    for (const match of text.matchAll(/\bimport\.meta\.glob\s*(?:<[^>]*>\s*)?\(([^)]*)\)/g)) {
      if (/\brealism\//.test(match[1] as string)) failures.push(`budgets reach: ${path} globs the realism directory: ${(match[1] as string).trim()}`);
    }
    for (const match of text.matchAll(/['"`]([^'"`\n]*budgets[^'"`\n]*)['"`]/g)) {
      if (BUDGETS_MODULE.test(specifierTarget(path, match[1] as string))) failures.push(`budgets reach: ${path} names ${match[1] as string}`);
    }
    for (const match of text.matchAll(/\bimport\s*\(([^)]*\bbudgets\b[^)]*)\)/g)) {
      const argument = (match[1] as string).trim();
      if (!/^(['"`])[^'"`$]*\1$/.test(argument)) failures.push(`budgets reach: ${path} builds a dynamic import of them: ${argument}`);
    }
  }
  return failures;
}

function repoSources(): Source[] {
  const paths = [...filesUnder(join(REPO_ROOT, 'src')), ...filesUnder(join(REPO_ROOT, 'spikes')), ...readdirSync(REPO_ROOT).map((name) => join(REPO_ROOT, name)).filter((path) => SOURCE_MODULE.test(path) || path.endsWith('.html'))];
  return paths
    .filter((path) => SOURCE_MODULE.test(path) || path.endsWith('.html'))
    .map((path) => {
      const rel = relative(REPO_ROOT, path).split(sep).join('/');
      const text = readFileSync(path, 'utf8');
      return { path: rel, text: SOURCE_MODULE.test(path) ? stripComments(text) : text };
    });
}

test('an unreadable map is one failure line naming the file, not a crash and not also a missing file', async () => {
  const unreadable = (): never => {
    throw new Error('EACCES: permission denied\n    at openSync');
  };
  const report = await measureMaps(treeOf({ textures: { 'mars.webp': GOOD_MAP } }), unreadable);
  assert.deepEqual(report.failures, ['public/textures/mars.webp could not be read: EACCES: permission denied']);
});

test('nothing outside render-scene/realism/ and scripts/ reaches the budgets', () => {
  const sources = repoSources();
  assert.ok(sources.some((source) => source.path === 'src/App.tsx'), 'the walk reads src/');
  assert.ok(sources.some((source) => source.path === 'vite.config.ts'), 'the walk reads the root');
  assert.ok(sources.some((source) => source.path === 'spikes/depth-bias/main.tsx'), 'the walk reads spikes/');
  assert.deepEqual(auditBudgetsImporters(sources), []);
});

test('the budgets reach audit rejects every form, from every near miss of the home', () => {
  for (const [path, text] of [
    ['src/shell/x.ts', "import { MAP_COUNT_BUDGET } from '../render-scene/realism/budgets.ts';"],
    ['src/shell/x.ts', "import type { X } from '../render-scene/realism/budgets.ts';"],
    ['src/shell/x.ts', "export * from '../render-scene/realism/budgets.ts';"],
    ['src/shell/x.ts', "export { MAP_COUNT_BUDGET } from '../render-scene/realism/budgets.ts';"],
    ['src/shell/x.ts', "const b = await import('../render-scene/realism/budgets.ts');"],
    ['src/shell/x.ts', 'const b = await import(`../render-scene/realism/budgets.ts`);'],
    ['src/shell/x.ts', "const b = require('../render-scene/realism/budgets.ts');"],
    ['src/shell/x.ts', "const u = new URL('../render-scene/realism/budgets.ts', import.meta.url);"],
    ['src/shell/x.ts', "import { MAP_COUNT_BUDGET } from '../render-scene/realism/budgets';"],
    ['src/shell/x.ts', "import { MAP_COUNT_BUDGET } from '../render-scene/x/../realism/budgets.ts';"],
    ['src/shell/x.ts', "const b = await import('../render-scene/realism/' + 'budgets.ts');"],
    ['src/shell/x.ts', 'const b = await import(`${dir}/budgets.ts`);'],
    ['src/render-scene/scene.tsx', "import { MAP_COUNT_BUDGET } from './realism/budgets.ts';"],
    ['src/render-scene/realism-mount.tsx', "import { MAP_COUNT_BUDGET } from './realism/budgets.ts';"],
    ['src/render-scene/realismx/x.ts', "import { MAP_COUNT_BUDGET } from '../realism/budgets.ts';"],
    ['src/shell/scripts/x.ts', "import { MAP_COUNT_BUDGET } from '../../render-scene/realism/budgets.ts';"],
    ['src/derive/map-library.test.ts', "import { MAP_COUNT_BUDGET } from '../render-scene/realism/budgets.ts';"],
    ['vite.config.ts', "import { MAP_COUNT_BUDGET } from './src/render-scene/realism/budgets.ts';"],
    ['spikes/depth-bias/main.tsx', "import { MAP_COUNT_BUDGET } from '../../src/render-scene/realism/budgets.ts';"],
    ['index.html', '<script type="module" src="/src/render-scene/realism/budgets.ts"></script>'],
    ['src/shell/x.ts', "import text from '../render-scene/realism/budgets.ts?raw';"],
    ['src/shell/x.ts', "import url from '../render-scene/realism/budgets.ts?url';"],
    ['src/shell/x.ts', "const b = await import('../render-scene/realism/budgets.ts#x');"],
    ['src/shell/x.ts', "import text from '../render-scene/realism/budgets?raw';"],
    ['src/shell/x.ts', "const all = import.meta.glob('../render-scene/realism/*.ts');"],
    ['src/shell/x.ts', "const all = import.meta.glob(['../render-scene/realism/**'], { eager: true });"],
    ['src/render-scene/scene.tsx', 'const all = import.meta.glob<Module>("./realism/*");'],
    ['src/render-scene/realism/index.ts', "export * from './budgets.ts';"],
    ['src/render-scene/realism/index.ts', "export * as budgets from './budgets.ts';"],
    ['src/render-scene/realism/index.ts', "export { MAP_COUNT_BUDGET } from './budgets.ts';"],
    ['src/render-scene/realism/index.ts', "export type { X } from './budgets';"],
    ['src/render-scene/realism/sub/index.ts', "export * from '../budgets.ts';"],
  ] as const) {
    assert.match(auditBudgetsImporters([{ path, text }]).join('\n'), /^budgets reach: /, `${path}: ${text}`);
  }
  for (const [path, text] of [
    ['src/render-scene/realism/x.ts', "import { MAP_COUNT_BUDGET } from './budgets.ts';"],
    ['src/render-scene/realism/sub/x.ts', "const b = await import('../budgets.ts');"],
    ['scripts/x.ts', "import { MAP_COUNT_BUDGET } from '../src/render-scene/realism/budgets.ts';"],
    ['src/shell/x.ts', "import { x } from './budgets.ts';"],
    ['src/shell/x.ts', "const b = await import('./budgets.ts');"],
    ['src/shell/x.ts', "const label = 'budgets';"],
    ['src/shell/x.ts', "const all = import.meta.glob('./shaders/*.glsl');"],
    ['src/shell/x.ts', "const all = import.meta.glob('./realismx/*.ts');"],
    ['src/render-scene/realism/index.ts', "export * from './model.ts';"],
    ['src/render-scene/realism/index.ts', "import { MAP_COUNT_BUDGET } from './budgets.ts';"],
    ['scripts/x.ts', "export * from '../src/render-scene/realism/budgets.ts';"],
  ] as const) {
    assert.deepEqual(auditBudgetsImporters([{ path, text }]), [], `${path}: ${text}`);
  }
});
