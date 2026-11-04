/**
 * The map library against its pixels: an unlicensed or uncredited image
 * must never reach the live site, and a file and its entry must never disagree.
 *
 * `checkMaps(root)` fails on
 * - an empty library, or no `public/textures/`: a check with nothing to measure
 *   is a failure, never a pass;
 * - an entry with a non-bare or duplicate `id`, a `sourceUrl` not on `https://`
 *   and `nasa.gov`, `usgs.gov` or a subdomain of either, licence wording or a
 *   `credit` empty or refused, an impossible `retrievedOn`, or a `meanLuminance`
 *   that is not a number in (0, 1];
 * - a `<id>.webp` with no entry, an entry with no file, and anything else in
 *   `public/textures/`, a subdirectory or a dot-file included;
 * - a file that is not WebP by its header: not RIFF/WEBP, truncated, a RIFF size
 *   disagreeing with the file, or an unknown or malformed first chunk;
 * - anything over the budgets (`src/render-scene/realism/budgets.ts`): more than
 *   12 maps, wider than 1024 or taller than 512, more than 4,000,000 bytes in all;
 * - a map that is not 2:1, since an equirectangular map of another aspect stretches
 *   on the sphere.
 *
 * Every check runs whatever the others found, and an unreadable file is one
 * failure line, never a crash. One fault is one line: with the library unread no
 * file is called entry-less, and a file answering to a rejected id is not either. Run as `node scripts/check-maps.ts [--root=<dir>]`:
 * the library is imported from under that root, so a fixture tree brings its own.
 *
 * **What this cannot see**, and does not claim to:
 * - It reads each file's size and first 30 bytes, with no decoder: a VP8X file's
 *   later chunks and the compressed frame are never read, so a corrupt body with
 *   a good header passes.
 * - A recorded `meanLuminance` is reported as recorded, not verified. With no
 *   decoder CI cannot recompute one; it checks only a number in range.
 * - Reading the page was the admission. The refusal is a screen over the wording
 *   recorded, and the host check refuses a page off NASA or USGS: neither shows
 *   what a page says, and nothing here visits it.
 * - A file and its entry are matched by name and header. Nothing here ties the
 *   pixels to the page; `src/derive/map-library.test.ts` holds each file's hash
 *   against the README's conversion record.
 */

import { closeSync, existsSync, fstatSync, openSync, readSync, readdirSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MAP_COUNT_BUDGET, MAP_HEIGHT_BUDGET, MAP_TOTAL_BYTES_BUDGET, MAP_WIDTH_BUDGET } from '../src/render-scene/realism/budgets.ts';

const DEFAULT_ROOT = fileURLToPath(new URL('..', import.meta.url));

const LIBRARY_DISPLAY = 'src/derive/map-library.ts';
const TEXTURES_DISPLAY = 'public/textures';

const BARE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Whole-string: no `@`, port, query or fragment, on the two hosts or their subdomains. */
const SOURCE_URL = /^https:\/\/(?:[a-z0-9-]+\.)*(?:nasa|usgs)\.gov(?:\/[\w./%-]*)?$/;
const REFUSED_WORDING = /©|&copy;|\(c\)\s*\d{4}|\bcreative[\s_-]*commons\b|\bcc[\s_-]*by(?![a-z])|\bcc0\b|\bnon[\s_-]?commercial|\ball\s+rights\s+reserved\b/i;
/**
 * A copyright claimed, not mentioned: the word, then an optional `by`, then a
 * capital or a digit. That last part is case-sensitive, and it is the whole test:
 * NASA's "not subject to copyright in the United States" and "no third-party
 * copyright" must pass, and `Copyright 2024 Foo Corp` must not. Spelled by class
 * because a flag would apply to the whole pattern.
 */
const COPYRIGHT_CLAIM = /\b[Cc][Oo][Pp][Yy][Rr][Ii][Gg][Hh][Tt](?:[Ee][Dd])?\s+(?:[Bb][Yy]\s+)?[A-Z0-9]/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** RIFF (12) + chunk header (8) + the longest frame header read, VP8's or VP8X's 10. */
const HEADER_BYTES = 30;

export interface MeasuredMap {
  readonly id: string;
  /** The first chunk's FourCC, trimmed: `VP8`, `VP8L` or `VP8X`. */
  readonly form: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
}

export interface MapsReport {
  readonly failures: readonly string[];
  /** The maps whose files could be read as WebP and have an entry, in library order. */
  readonly maps: readonly MeasuredMap[];
  /** Every regular file in `public/textures/`, since `dist/` ships them all. */
  readonly totalBytes: number;
  /** Each well-formed recorded mean by id, in library order: as recorded, not verified. */
  readonly recordedMeans: readonly (readonly [string, number])[];
}

function messageOf(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split(/\r?\n/, 1)[0] as string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

function isRefused(value: string): boolean {
  return REFUSED_WORDING.test(value) || COPYRIGHT_CLAIM.test(value);
}

function isRealDate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const match = value.match(ISO_DATE);
  if (match === null) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** The file a rejected id was reaching for: already reported, so that file is no second fault. */
function fileStemOfRejected(id: string): string {
  return id.toLowerCase().replace(/^.*[\\/]/, '').replace(/\.webp$/, '');
}

/**
 * Each entry's own fields, naming the id and the field. Returns the ids that must
 * have a file, and every name a file may answer to, the rejected ids' included.
 * `Array.from` turns a hole into `undefined`: `forEach` alone would skip `[,]`,
 * whose length is 1, and it would pass having measured nothing.
 */
function checkEntries(entries: readonly unknown[], failures: string[], means: [string, number][]): { ids: string[]; known: Set<string> } {
  const ids: string[] = [];
  const known = new Set<string>();
  const seen = new Set<string>();
  Array.from(entries).forEach((entry, index) => {
    const position = `entry ${index + 1}`;
    if (!isRecord(entry)) {
      failures.push(`${LIBRARY_DISPLAY}: ${position} is not an object.`);
      return;
    }
    const id = entry['id'];
    const label = typeof id === 'string' ? `entry ${JSON.stringify(id)}` : position;
    const fail = (field: string, problem: string): void => {
      failures.push(`${LIBRARY_DISPLAY}: ${label} field ${field} ${problem}`);
    };

    if (typeof id !== 'string' || !BARE_ID.test(id)) {
      fail('id', `is ${JSON.stringify(id)}: it must be bare, lower-case words and hyphens, with no path or extension.`);
      if (typeof id === 'string') {
        known.add(id);
        known.add(fileStemOfRejected(id));
      }
    } else if (seen.has(id)) {
      fail('id', 'is a duplicate.');
    } else {
      seen.add(id);
      ids.push(id);
      known.add(id);
    }

    const sourceUrl = entry['sourceUrl'];
    if (typeof sourceUrl !== 'string' || !SOURCE_URL.test(sourceUrl)) {
      fail('sourceUrl', `is ${JSON.stringify(sourceUrl)}: it must be an https:// URL on nasa.gov, usgs.gov or a subdomain of either, with no port, query or fragment.`);
    }

    const licence = entry['licence'];
    if (isBlank(licence)) fail('licence', 'is empty: record the wording the page gives.');
    else if (isRefused(licence as string)) fail('licence', `is ${JSON.stringify(licence)}: a copyright, Creative Commons, non-commercial or all-rights-reserved map is refused.`);

    const credit = entry['credit'];
    if (isBlank(credit)) fail('credit', 'is empty: record the credit line the page gives.');
    else if (isRefused(credit as string)) fail('credit', `is ${JSON.stringify(credit)}: a copyright, Creative Commons, non-commercial or all-rights-reserved map is refused.`);

    if (!isRealDate(entry['retrievedOn'])) fail('retrievedOn', `is ${JSON.stringify(entry['retrievedOn'])}: it must be a real YYYY-MM-DD date.`);

    const mean = entry['meanLuminance'];
    if (typeof mean !== 'number' || !Number.isFinite(mean) || mean <= 0 || mean > 1) {
      fail('meanLuminance', `is ${typeof mean === 'number' ? String(mean) : JSON.stringify(mean)}: it must be a number above 0 and at most 1.`);
    } else if (typeof id === 'string') {
      means.push([id, mean]);
    }
  });
  return { ids, known };
}

interface WebpHeader {
  readonly form: string;
  readonly width: number;
  readonly height: number;
}

/**
 * The WebP container read from its first bytes and the file's size. Returns the
 * reason it is not WebP as a string. The three forms hold their dimensions
 * differently: VP8 as 14 bits under a 2-bit scale, after a 3-byte start code;
 * VP8L as two 14-bit values less one, after a signature byte; VP8X as two 24-bit
 * values less one, whatever chunk follows.
 */
export function readWebpHeader(head: Buffer, fileBytes: number): WebpHeader | string {
  if (head.length < 12) return 'truncated header.';
  if (head.toString('latin1', 0, 4) !== 'RIFF' || head.toString('latin1', 8, 12) !== 'WEBP') return 'it has no RIFF/WEBP header.';
  if (head.length < 20) return 'truncated header.';
  const riffBytes = head.readUInt32LE(4);
  if (riffBytes + 8 !== fileBytes) return `its RIFF size says ${riffBytes + 8} bytes, and the file has ${fileBytes}.`;

  const form = head.toString('latin1', 12, 16);
  const chunkBytes = head.readUInt32LE(16);
  if (form !== 'VP8 ' && form !== 'VP8L' && form !== 'VP8X') return `its first chunk is ${JSON.stringify(form)}, not VP8, VP8L or VP8X.`;
  if (20 + chunkBytes > fileBytes) return `its ${form.trim()} chunk says ${chunkBytes} bytes, which overruns the file.`;

  let width: number;
  let height: number;
  if (form === 'VP8 ') {
    if (head.length < 30 || chunkBytes < 10) return 'truncated header.';
    if ((head[20] as number) & 1) return 'its VP8 frame is not a key frame.';
    if (head[23] !== 0x9d || head[24] !== 0x01 || head[25] !== 0x2a) return 'its VP8 frame has no start code.';
    width = head.readUInt16LE(26) & 0x3fff;
    height = head.readUInt16LE(28) & 0x3fff;
  } else if (form === 'VP8L') {
    if (head.length < 25 || chunkBytes < 5) return 'truncated header.';
    if (head[20] !== 0x2f) return 'its VP8L chunk has no signature.';
    const bits = head.readUInt32LE(21);
    width = (bits & 0x3fff) + 1;
    height = ((bits >>> 14) & 0x3fff) + 1;
  } else {
    if (head.length < 30) return 'truncated header.';
    if (chunkBytes !== 10) return `its VP8X chunk says ${chunkBytes} bytes, not 10.`;
    width = head.readUIntLE(24, 3) + 1;
    height = head.readUIntLE(27, 3) + 1;
  }
  if (width === 0 || height === 0) return `its ${form.trim()} frame has a zero dimension.`;
  return { form: form.trim(), width, height };
}

/** The file's size and its first bytes, and nothing more of it. */
function readHead(path: string): { head: Buffer; bytes: number } {
  const fd = openSync(path, 'r');
  try {
    const bytes = fstatSync(fd).size;
    const head = Buffer.alloc(HEADER_BYTES);
    const read = readSync(fd, head, 0, HEADER_BYTES, 0);
    return { head: head.subarray(0, read), bytes };
  } finally {
    closeSync(fd);
  }
}

/**
 * `public/textures/` against the library: both directions, each file's header and
 * the size limits. With the library unread, `known` is undefined and no file is
 * compared with an entry, though each is still read.
 */
function checkTextures(root: string, ids: readonly string[], known: ReadonlySet<string> | undefined, failures: string[]): { maps: MeasuredMap[]; totalBytes: number } {
  const dir = join(root, 'public', 'textures');
  const measured = new Map<string, MeasuredMap>();
  let totalBytes = 0;
  if (!existsSync(dir)) {
    failures.push(`${TEXTURES_DISPLAY}/ is missing, so the map library is empty of pixels and there is nothing to measure.`);
    return { maps: [], totalBytes };
  }
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  } catch (error) {
    failures.push(`${TEXTURES_DISPLAY}/ could not be read: ${messageOf(error)}`);
    return { maps: [], totalBytes };
  }
  const wanted = new Set(ids);
  const present = new Set<string>();
  for (const entry of entries) {
    const display = `${TEXTURES_DISPLAY}/${entry.name}`;
    const path = join(dir, entry.name);
    if (!entry.isFile() || !entry.name.endsWith('.webp')) {
      failures.push(`${display} is stray: ${TEXTURES_DISPLAY}/ holds <id>.webp files and nothing else.`);
      if (!entry.isFile()) continue;
    }
    let head: Buffer;
    let bytes: number;
    try {
      ({ head, bytes } = readHead(path));
    } catch (error) {
      failures.push(`${display} could not be read: ${messageOf(error)}`);
      continue;
    }
    totalBytes += bytes;
    if (!entry.name.endsWith('.webp')) continue;

    const id = entry.name.slice(0, -'.webp'.length);
    if (wanted.has(id)) present.add(id);
    else if (known !== undefined && !known.has(id)) failures.push(`${display} has no entry in ${LIBRARY_DISPLAY}.`);

    const header = readWebpHeader(head, bytes);
    if (typeof header === 'string') {
      failures.push(`${display} is not WebP: ${header}`);
      continue;
    }
    if (header.width > MAP_WIDTH_BUDGET || header.height > MAP_HEIGHT_BUDGET) {
      failures.push(`${display} is ${header.width}×${header.height}; the limit is ${MAP_WIDTH_BUDGET}×${MAP_HEIGHT_BUDGET}.`);
    }
    if (header.width !== 2 * header.height) {
      failures.push(`${display} is ${header.width}×${header.height}; a map must be 2:1.`);
    }
    if (wanted.has(id)) measured.set(id, { id, ...header, bytes });
  }
  for (const id of ids) {
    if (!present.has(id)) failures.push(`${LIBRARY_DISPLAY}: entry ${JSON.stringify(id)} has no file: ${TEXTURES_DISPLAY}/${id}.webp.`);
  }
  if (totalBytes > MAP_TOTAL_BYTES_BUDGET) {
    failures.push(`${TEXTURES_DISPLAY}/ holds ${totalBytes} bytes; the limit is ${MAP_TOTAL_BYTES_BUDGET}.`);
  }
  return { maps: ids.flatMap((id) => measured.get(id) ?? []), totalBytes };
}

/** The library as a fixture tree or the real one holds it: an unreadable one is one failure line. */
async function loadLibrary(root: string, failures: string[]): Promise<readonly unknown[] | undefined> {
  let module: { readonly MAP_LIBRARY?: unknown };
  try {
    module = (await import(pathToFileURL(join(root, 'src', 'derive', 'map-library.ts')).href)) as { readonly MAP_LIBRARY?: unknown };
  } catch (error) {
    failures.push(`${LIBRARY_DISPLAY} could not be read: ${messageOf(error)}`);
    return undefined;
  }
  if (!Array.isArray(module.MAP_LIBRARY)) {
    failures.push(`${LIBRARY_DISPLAY}: MAP_LIBRARY is not an array.`);
    return undefined;
  }
  return module.MAP_LIBRARY as readonly unknown[];
}

/** Everything measured under `root`, and every failure found. */
export async function measureMaps(root: string): Promise<MapsReport> {
  const failures: string[] = [];
  const recordedMeans: [string, number][] = [];
  const library = await loadLibrary(root, failures);
  const entries = library ?? [];
  if (library !== undefined && entries.length === 0) {
    failures.push(`${LIBRARY_DISPLAY}: the map library is empty, so there is nothing to measure.`);
  }
  if (entries.length > MAP_COUNT_BUDGET) {
    failures.push(`${LIBRARY_DISPLAY} holds ${entries.length} maps; the limit is ${MAP_COUNT_BUDGET}.`);
  }
  const { ids, known } = checkEntries(entries, failures, recordedMeans);
  const { maps, totalBytes } = checkTextures(root, ids, library === undefined ? undefined : known, failures);
  return { failures, maps, totalBytes, recordedMeans };
}

/** Every failure under `root`; empty when the library and its pixels agree, within budget. */
export async function checkMaps(root: string): Promise<readonly string[]> {
  return (await measureMaps(root)).failures;
}

/** The pass line: what was measured, and the one number that was not. */
export function describeReport(report: MapsReport): string {
  const count = report.maps.length;
  const maps = report.maps.map((map) => `${map.id} ${map.width}×${map.height} ${map.form}`).join(', ');
  const means = report.recordedMeans.map(([id, mean]) => `${id} ${mean}`).join(', ');
  return (
    `check-maps: ${count} ${count === 1 ? 'map' : 'maps'} of ${MAP_COUNT_BUDGET} (${maps}), each entry has its file, by name; ` +
    `${report.totalBytes} of ${MAP_TOTAL_BYTES_BUDGET} bytes. ` +
    `Mean luminance as recorded, not verified, since CI has no decoder and checks only a number in range: ${means}.`
  );
}

/** The command line: one test seam, `--root=<dir>`. Anything else is rejected. */
export function parseArgs(argv: readonly string[]): { root: string } | string[] {
  const failures: string[] = [];
  let root: string | undefined;
  for (const arg of argv) {
    const match = arg.match(/^--root=(.+)$/);
    if (match === null) {
      failures.push(`unknown argument ${JSON.stringify(arg)} — scripts/check-maps.ts takes --root= only.`);
      continue;
    }
    if (root !== undefined) {
      failures.push(`${JSON.stringify(arg)} repeats --root= — scripts/check-maps.ts takes one root.`);
      continue;
    }
    root = match[1] as string;
  }
  return failures.length > 0 ? failures : { root: root ?? DEFAULT_ROOT };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (Array.isArray(parsed)) {
    for (const line of parsed) console.error(line);
    process.exit(1);
  }
  const report = await measureMaps(parsed.root);
  if (report.failures.length > 0) {
    for (const line of report.failures) console.error(line);
    process.exit(1);
  }
  console.log(describeReport(report));
}

/** True when this module is the process entry point (see scripts/tokens.ts for why both sides are canonicalised). */
function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  const canonical = (path: string): string => {
    let real: string;
    try {
      real = realpathSync(path);
    } catch {
      real = resolve(path);
    }
    return process.platform === 'win32' ? real.toLowerCase() : real;
  };
  return canonical(entry) === canonical(fileURLToPath(import.meta.url));
}

if (isEntryPoint()) {
  await main();
}
