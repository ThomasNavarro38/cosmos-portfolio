/**
 * The NFR-2 record's guard (8.3): `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md`
 * says what M3 has and has not proven, and this holds it to the code it describes,
 * so the record cannot drift from the budgets, the mark or the floor.
 *
 * - **(a) Status:** the line `**NFR-2: not yet passed.**`, then that only a run on
 *   a machine matching NFR-4's target profile may change it, that no other
 *   hardware counts (the dev machine's RTX 4080 SUPER and Apple silicon named), and
 *   that no proxy exists.
 * - **(b) Budgets:** one row per export of `budgets.ts`, plus M2's
 *   `ENTRY_BUDGET_BYTES`, naming the constant, its limit as the constant holds it
 *   (with `,` thousands separators or as written), a measured value, and the words
 *   "budget" and "starting value"; each export a finite integer. The two rows no
 *   constant names (passes, targets, shadows and lights; new runtime
 *   dependencies) each present, at 0, with both labels. No row is a framerate
 *   (`fps`, "frame rate", "frames per second", `frames/s`).
 * - **(c) Protocol:** the mark's name as `worst-window.ts` declares it, `gaps`,
 *   `1080p`, a fresh load and a forward-and-back scroll.
 * - **(d) Pass condition:** 30, `gaps === 0`, the floor as `chart-offer.ts`
 *   declares it, the gap threshold, and "not a pass" for the band between.
 * - **(e) Commit:** a full 40-hex hash.
 * - **(f) Never run:** the four carried items, each list item holding its own
 *   terms together.
 *
 * Also anywhere in the record: `NFR-2` followed on its line by `passed` that is
 * not "not yet passed" fails.
 *
 * - **(g) The 8.4 judgement sheet, in two states.** Always: the section says the
 *   machine is not the target profile and the status stays "not yet passed", and
 *   holds a 40-hex build commit, the build's three chunk names, AC 8.4-1's two
 *   criteria ("realistic, not a screensaver", label contrast), the four poses
 *   (`opening frame`, `Client stop`, `Focus`, `rail(p=2.8333)`) with the `2266.64`
 *   wheel step, the seven looks Epic 7 routed to it, the rejection route's levers,
 *   AD-23 and the memlog, and the fields Date, Machine, Browser, Commit, Poses,
 *   Verdict and Screenshots. Pending (the verdict reads `Not yet given.`, markup
 *   and the period aside): nothing more, so the agent's sheet passes as written.
 *   Recorded (any other verdict): Date as `YYYY-MM-DD`, Machine, Browser and Poses
 *   written, Commit a 40-hex hash, and the Screenshots field naming at least one
 *   `judgement-8-4-*.png`, each present beside the record. Existence is injected,
 *   so the mutations need no file; the record as it stands is read against the
 *   real directory, so it passes in either state.
 * - **(h) Live (8.5):** the status stays "not yet passed".
 *
 * The instrument (`worst-window.ts`, `chart-offer.ts`) is read as text, never
 * imported: `chart-offer.test.ts` closes its importer table and the scene audits
 * scan the worst-window files' importers. The budgets are imported, since
 * `scripts/` is one of the two places that may reach them (`check-maps.test.ts`).
 * Each check is driven red by a mutation of the record text, in memory.
 */

import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as budgets from '../src/render-scene/realism/budgets.ts';
import { ENTRY_BUDGET_BYTES } from './bundle-assertion.ts';
import { cellsOf } from './record-table.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const RECORD_PATH = join(REPO_ROOT, '_bmad-output', 'implementation-artifacts', 'nfr-2-record-8-3.md');
const WORST_WINDOW = join(REPO_ROOT, 'src', 'render-scene', 'worst-window.ts');
const CHART_OFFER = join(REPO_ROOT, 'src', 'shell', 'chart-offer.ts');

const STATUS_LINE = '**NFR-2: not yet passed.**';
const HEADINGS = {
  status: '## Status',
  run: '## Run',
  budgets: '## Budgets',
  protocol: '## Target-run protocol',
  pass: '### Pass condition',
  neverRun: '## Never run',
  judgement: '## On-screen judgement (8.4)',
  live: '## Live (8.5)',
} as const;

/** What the record must agree with: the instrument's names and numbers, read from source. */
interface Instrument {
  readonly mark: string;
  readonly floor: number;
  readonly maxFrameSeconds: number;
}

function constantIn(source: string, pattern: RegExp, what: string): string {
  const hit = pattern.exec(source);
  assert.ok(hit?.[1] !== undefined, `${what} is declared in its source`);
  return hit[1];
}

function instrument(): Instrument {
  const worstWindow = readFileSync(WORST_WINDOW, 'utf8');
  const chartOffer = readFileSync(CHART_OFFER, 'utf8');
  return {
    mark: constantIn(worstWindow, /export const WORST_WINDOW_MARK = '([^']+)';/, 'WORST_WINDOW_MARK'),
    floor: Number(constantIn(chartOffer, /export const FALLBACK_FLOOR_FPS = (\d+(?:\.\d+)?);/, 'FALLBACK_FLOOR_FPS')),
    maxFrameSeconds: Number(constantIn(chartOffer, /export const MAX_FRAME_SECONDS = (\d+(?:\.\d+)?);/, 'MAX_FRAME_SECONDS')),
  };
}

/** Every budget the record must carry: each export of `budgets.ts`, then M2's entry budget. */
const BUDGETS: readonly (readonly [string, number])[] = [
  ...Object.entries(budgets).map(([name, value]): readonly [string, number] => {
    assert.ok(typeof value === 'number' && Number.isInteger(value), `budgets.ts's ${name} is a finite integer: ${String(value)}`);
    return [name, value];
  }),
  ['ENTRY_BUDGET_BYTES', ENTRY_BUDGET_BYTES],
];

/** The two budget rows no constant names, each by its first cell. */
const UNNAMED_ROWS: readonly (readonly [string, RegExp])[] = [
  ['passes, render targets, shadow maps, scene lights', /passes.*render targets.*shadow maps.*scene lights/i],
  ['new runtime dependencies', /new runtime dependencies/i],
];

/** The framerate register a budget row must never match: a rate, the word "frame rate", or "frames per (a) second". */
const RATE_WORDS = /\bfps\b|\bframe[\s-]*rates?\b|\bframes[\s-]+(?:per|a)[\s-]+second\b|\bframes?\s*\/\s*s(?:ec)?\b/i;

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The text from `heading` (written in full) to the next heading of the same or a higher level; undefined when absent. */
function sectionOf(record: string, heading: string): string | undefined {
  const lines = record.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return undefined;
  const level = /^#+/.exec(heading)?.[0].length ?? 2;
  const end = lines.findIndex((line, index) => index > start && /^(#+)\s/.test(line) && (/^#+/.exec(line)?.[0].length ?? 0) <= level);
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
}

/** The table rows in `section`, header included, separator dropped. */
function rowsOf(section: string): string[][] {
  return section
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map(cellsOf)
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

/** Prose as one line, so a sentence wrapped across lines still matches. */
const flat = (text: string): string => text.replace(/\s+/g, ' ');

/** A limit as the record may write it: `4,000,000` or `4000000`. */
const limitForms = (value: number): readonly string[] => [value.toLocaleString('en-US'), String(value)];

function auditStatus(record: string): string[] {
  const failures: string[] = [];
  const section = sectionOf(record, HEADINGS.status);
  if (section === undefined) return [`status: no "${HEADINGS.status}" section`];
  const lines = section.split('\n').map((line) => line.trim());
  if (!lines.some((line) => line.startsWith(STATUS_LINE))) failures.push(`status: no line reads ${STATUS_LINE}`);
  const prose = flat(section);
  if (!/only a run on a machine matching NFR-4's target profile may change it/i.test(prose)) failures.push('status: it does not say only a target-profile run may change it');
  if (!/no other hardware counts/i.test(prose)) failures.push('status: it does not say no other hardware counts');
  if (!/no proxy exists/i.test(prose)) failures.push('status: it does not say no proxy exists');
  if (!/RTX 4080 SUPER/.test(prose)) failures.push('status: it does not name the dev machine (RTX 4080 SUPER) as not counting');
  if (!/Apple silicon/i.test(prose)) failures.push('status: it does not name Apple silicon as not counting');
  // A status reworded to a pass anywhere in the record: `NFR-2` and then, on the same line, `passed` that is not "not yet passed".
  for (const line of record.split('\n')) {
    const at = line.search(/NFR-2\b/);
    if (at === -1) continue;
    const after = line.slice(at).replace(/\bnot[\s-]+yet[\s-]+passed\b/gi, '');
    if (/\bpassed\b/i.test(after)) failures.push(`status: the record says NFR-2 passed: ${JSON.stringify(line.trim().slice(0, 80))}`);
  }
  return failures;
}

function auditBudgets(record: string, rows: readonly (readonly [string, number])[] = BUDGETS): string[] {
  const section = sectionOf(record, HEADINGS.budgets);
  if (section === undefined) return [`budgets: no "${HEADINGS.budgets}" section`];
  const [header, ...body] = rowsOf(section);
  if (header === undefined) return ['budgets: the section holds no table'];
  const limitAt = header.findIndex((cell) => /^limit$/i.test(cell));
  const measuredAt = header.findIndex((cell) => /^measured\b/i.test(cell));
  if (limitAt === -1 || measuredAt === -1) return [`budgets: the table has no Limit or Measured column: ${header.join(' | ')}`];
  const failures: string[] = [];
  for (const [name, value] of rows) {
    const naming = body.filter((cells) => cells.some((cell) => cell.includes(`\`${name}\``)));
    if (naming.length !== 1) {
      failures.push(`budgets: ${name} is named by ${naming.length} rows, not one`);
      continue;
    }
    const cells = naming[0] as string[];
    const limit = cells[limitAt] ?? '';
    if (!limitForms(value).some((form) => new RegExp(`(?<![\\d,.])${form.replace(/[.,]/g, '\\$&')}(?![\\d,.])`).test(limit))) failures.push(`budgets: ${name}'s limit reads "${limit}", not ${limitForms(value)[0]}`);
    if (!/\d/.test(cells[measuredAt] ?? '')) failures.push(`budgets: ${name} has no measured value`);
    const text = cells.join(' | ');
    if (!/\bbudget\b/i.test(text)) failures.push(`budgets: ${name}'s row does not say "budget"`);
    if (!/\bstarting value\b/i.test(text)) failures.push(`budgets: ${name}'s row does not say "starting value"`);
  }
  for (const [what, first] of UNNAMED_ROWS) {
    const naming = body.filter((cells) => first.test(cells[0] ?? ''));
    if (naming.length !== 1) {
      failures.push(`budgets: the ${what} row is present ${naming.length} times, not once`);
      continue;
    }
    const cells = naming[0] as string[];
    if (!/(?<![\d,.])0(?![\d,.])/.test(cells[limitAt] ?? '')) failures.push(`budgets: the ${what} row's limit reads "${cells[limitAt] ?? ''}", not 0`);
    if (!/\d/.test(cells[measuredAt] ?? '')) failures.push(`budgets: the ${what} row has no measured value`);
    const text = cells.join(' | ');
    if (!/\bbudget\b/i.test(text)) failures.push(`budgets: the ${what} row does not say "budget"`);
    if (!/\bstarting value\b/i.test(text)) failures.push(`budgets: the ${what} row does not say "starting value"`);
  }
  for (const cells of body) if (RATE_WORDS.test(cells.join(' '))) failures.push(`budgets: a row reads as a framerate: ${cells.join(' | ')}`);
  return failures;
}

function auditProtocol(record: string, { mark, floor, maxFrameSeconds }: Instrument): string[] {
  const section = sectionOf(record, HEADINGS.protocol);
  if (section === undefined) return [`protocol: no "${HEADINGS.protocol}" section`];
  const failures: string[] = [];
  const prose = flat(section);
  if (!prose.includes(`performance.getEntriesByName('${mark}')`)) failures.push(`protocol: it does not read performance.getEntriesByName('${mark}')`);
  if (!prose.includes('`gaps`')) failures.push('protocol: it does not read `gaps`');
  if (!/\b1080p\b/.test(prose)) failures.push('protocol: it does not name 1080p');
  if (!/\bfresh load\b/i.test(prose)) failures.push('protocol: it does not require a fresh load');
  if (!/\bforward-and-back\b/i.test(prose)) failures.push('protocol: it does not require a forward-and-back scroll');
  if (!new RegExp(`\`MAX_FRAME_SECONDS\`, ${maxFrameSeconds} s\\b`).test(prose)) failures.push(`protocol: the gap rule does not name MAX_FRAME_SECONDS (${maxFrameSeconds} s)`);
  if (!/\bvoid\b/i.test(prose)) failures.push('protocol: the gap rule does not say when a run is void');
  const pass = sectionOf(record, HEADINGS.pass);
  if (pass === undefined) return [...failures, `pass: no "${HEADINGS.pass}" section`];
  const condition = flat(pass);
  if (!condition.includes('`fps` is not null')) failures.push('pass: it does not require fps not null');
  if (!condition.includes('`gaps === 0`')) failures.push('pass: it does not require gaps === 0');
  if (!condition.includes('`fps >= 30`')) failures.push('pass: it does not require fps >= 30');
  if (!condition.includes(`\`fps >= ${floor}\``) || !condition.includes('`FALLBACK_FLOOR_FPS`')) failures.push(`pass: it does not name the floor, FALLBACK_FLOOR_FPS (${floor})`);
  if (!/\bnot a pass\b/i.test(condition)) failures.push(`pass: the ${floor}–30 band is not called "not a pass"`);
  if (!/\bbelow the floor\b/i.test(condition)) failures.push('pass: below the floor is not named a fail');
  return failures;
}

function auditRun(record: string): string[] {
  const section = sectionOf(record, HEADINGS.run);
  if (section === undefined) return [`run: no "${HEADINGS.run}" section`];
  return /(?<![0-9a-f])[0-9a-f]{40}(?![0-9a-f])/.test(section) ? [] : ['run: no full 40-hex commit hash'];
}

function auditNeverRun(record: string): string[] {
  const section = sectionOf(record, HEADINGS.neverRun);
  if (section === undefined) return [`never run: no "${HEADINGS.neverRun}" section`];
  // Each list item, its wrapped lines joined: an item's terms must stand together in that one item.
  const items = section
    .split(/\n(?=\s*- )/)
    .filter((item) => /^\s*- /.test(item))
    .map(flat);
  const anItem = (...terms: readonly RegExp[]): boolean => items.some((item) => terms.every((term) => term.test(item)));
  const failures: string[] = [];
  if (!anItem(/depth bias/i, /integrated/i, /\bphones?\b/i, /below 24 bits/i)) failures.push('never run: the depth bias on integrated GPUs, phones and depth buffers below 24 bits');
  if (!anItem(/Firefox/, /Safari/, /imageOrientation: 'flipY'/)) failures.push("never run: Firefox and Safari, with imageOrientation: 'flipY'");
  if (!anItem(/60 Hz/)) failures.push('never run: 60 Hz displays');
  if (!anItem(/program-info-log/i, /other drivers/i)) failures.push("never run: three's program-info-log warning on other drivers");
  return failures;
}

/** The judgement sheet's sub-sections, inside `HEADINGS.judgement`. */
const SHEET = {
  build: '### The build',
  poses: '### The poses',
  checklist: '### The checklist',
  rejected: '### If a pose is rejected',
  verdict: '### The verdict',
} as const;

/** The four poses, each the first cell of a row of the poses table. */
const POSES = ['opening frame', 'Client stop', 'Focus', 'rail(p=2.8333)'] as const;

/** The step that reaches `rail(p=2.8333)`: 2.8333 × `WHEEL_PIXELS_PER_STOP` (800). */
const RAIL_STEP = '2266.64';

/** The seven looks Epic 7 routed to the judgement (retro F4), each the first cell of a row of the checklist. */
const LOOKS = [
  'A farther fill over a nearer glow',
  'Half-disc Planets',
  "The Star's dark ring",
  'The fill-tilt axis wording',
  'Jupiter worn by no Planet',
  'The band between the plate and the keyboard outline',
  'Overlapping rest glows',
] as const;

/** AC 8.4-3's route: Epic 7's tunable values, then the memlog for anything else. */
const LEVERS: readonly (readonly [string, RegExp])[] = [
  ['map choice', /\bmap choice\b/i],
  ['ambient floor', /\bambient floor\b/i],
  ['glow', /\bglow\b/i],
  ['fade', /\bfade\b/i],
  ['spin', /\bspin\b/i],
  ['memlog', /\bmemlog\b/i],
  ['AD-23', /\bAD-23\b/],
];

/** AC 8.4-1's two criteria, which every pose is judged against. */
const CRITERIA: readonly (readonly [string, RegExp])[] = [
  ['realistic, not a screensaver', /realistic, not a screensaver/i],
  ['label contrast', /label contrast/i],
];

/** The three chunks a build emits, by their content-hashed names, so 8.5 can match the judged build. */
const CHUNKS: readonly (readonly [string, RegExp])[] = [
  ['entry', /`index-[\w-]+\.js`/],
  ['scene', /`scene-[\w-]+\.js`/],
  ['realism', /`realism-[\w-]+\.js`/],
];

const HASH = /(?<![0-9a-f])[0-9a-f]{40}(?![0-9a-f])/;

/** The verdict's fields, each a `- **Label:** value` line. */
const FIELDS = ['Date', 'Machine', 'Browser', 'Commit', 'Poses', 'Verdict', 'Screenshots'] as const;
/** What Date, Machine and Browser read until Thomas writes them. */
const FIELD_PLACEHOLDER = 'To be written by Thomas.';
/** The verdict while none is given. Any other value is a recorded verdict. */
const VERDICT_PENDING = 'Not yet given.';
/** Pending, read loosely: markup and the closing period do not make a verdict. */
const isPending = (value: string | undefined): boolean => value !== undefined && /^not yet given\.?$/i.test(value.replace(/[*_`]/g, '').trim());
/** A screenshot's name: `judgement-8-4-<pose>.png`, beside the record. */
const SCREENSHOT = /judgement-8-4-[\w.()=-]+?\.png/g;

/** A screenshot beside the record, by its bare name. */
type Exists = (name: string) => boolean;
const besideRecord: Exists = (name) => existsSync(join(dirname(RECORD_PATH), name));

/** A field's value on its `- **Label:**` line, trimmed; undefined when no line carries the label. */
function fieldOf(section: string, label: string): string | undefined {
  const hit = new RegExp(`^\\s*- \\*\\*${label}:\\*\\*(.*)$`, 'm').exec(section);
  return hit?.[1]?.trim();
}

/**
 * The 8.4 judgement sheet, in both states. Always: the sheet's parts, so the
 * build, the poses, the looks and the route back are there to judge by. Pending
 * (the verdict reads `Not yet given.`): nothing more. Recorded (any other
 * verdict): every field written and every screenshot it names present beside
 * the record, by `exists`.
 */
function auditJudgement(record: string, exists: Exists): string[] {
  const section = sectionOf(record, HEADINGS.judgement);
  if (section === undefined) return [`8.4: no "${HEADINGS.judgement}" section`];
  const failures: string[] = [];
  const prose = flat(section);
  if (!/not the target profile/i.test(prose)) failures.push('8.4: it does not say the machine is not the target profile');
  if (!/not yet passed/i.test(prose)) failures.push('8.4: it does not say the status stays "not yet passed"');
  if (!HASH.test(section)) failures.push('8.4: no full 40-hex build commit');
  for (const [criterion, pattern] of CRITERIA) if (!pattern.test(prose)) failures.push(`8.4: it does not name the criterion "${criterion}"`);
  const sub = (heading: string): string | undefined => {
    const text = sectionOf(section, heading);
    if (text === undefined) failures.push(`8.4: no "${heading}" sub-section`);
    return text;
  };
  const firstCells = (text: string | undefined): string[] => (text === undefined ? [] : rowsOf(text).map((cells) => cells[0] ?? ''));
  const build = sub(SHEET.build);
  if (build !== undefined) for (const [chunk, pattern] of CHUNKS) if (!pattern.test(build)) failures.push(`8.4: the build does not name the ${chunk} chunk`);
  const poses = sub(SHEET.poses);
  const poseCells = firstCells(poses);
  for (const pose of POSES) if (!poseCells.some((cell) => cell.includes(pose))) failures.push(`8.4: the pose "${pose}" is not in the poses table`);
  if (poses !== undefined && !poses.includes(RAIL_STEP)) failures.push(`8.4: the poses do not give the ${RAIL_STEP} wheel step`);
  const lookCells = firstCells(sub(SHEET.checklist)).map((cell) => cell.toLowerCase());
  for (const look of LOOKS) if (!lookCells.some((cell) => cell.includes(look.toLowerCase()))) failures.push(`8.4: the look "${look}" is not in the checklist`);
  const rejected = sub(SHEET.rejected);
  if (rejected !== undefined) for (const [lever, pattern] of LEVERS) if (!pattern.test(flat(rejected))) failures.push(`8.4: the rejection route does not name "${lever}"`);
  const verdict = sub(SHEET.verdict);
  if (verdict === undefined) return failures;
  const values = new Map(FIELDS.map((label) => [label, fieldOf(verdict, label)]));
  for (const [label, value] of values) if (value === undefined) failures.push(`8.4: no "${label}" field`);
  const given = values.get('Verdict');
  if (given === undefined || isPending(given)) return failures;
  // Recorded: a verdict is given, so every field it rests on must be written.
  if (given === '' || given === FIELD_PLACEHOLDER) failures.push('8.4: the verdict is blank');
  for (const label of ['Date', 'Machine', 'Browser'] as const) {
    const value = values.get(label);
    if (value !== undefined && (value === '' || value === FIELD_PLACEHOLDER)) failures.push(`8.4: a verdict is given and the "${label}" field is not written`);
  }
  const date = values.get('Date');
  if (date !== undefined && date !== '' && date !== FIELD_PLACEHOLDER && !/\b\d{4}-\d{2}-\d{2}\b/.test(date)) failures.push('8.4: a verdict is given and the "Date" field is not a YYYY-MM-DD date');
  const commit = values.get('Commit');
  if (commit !== undefined && !HASH.test(commit)) failures.push('8.4: a verdict is given and the "Commit" field holds no full 40-hex commit');
  const posesGiven = values.get('Poses');
  if (posesGiven !== undefined && (posesGiven === '' || posesGiven === FIELD_PLACEHOLDER)) failures.push('8.4: a verdict is given and the "Poses" field is not written');
  const named = [...new Set(values.get('Screenshots')?.match(SCREENSHOT) ?? [])];
  if (named.length === 0) failures.push('8.4: a verdict is given and the "Screenshots" field names no judgement-8-4-*.png');
  for (const name of named) if (!exists(name)) failures.push(`8.4: the screenshot ${name} is not beside the record`);
  return failures;
}

function auditLive(record: string): string[] {
  const live = sectionOf(record, HEADINGS.live);
  if (live === undefined) return [`8.5: no "${HEADINGS.live}" section`];
  return /not yet passed/i.test(flat(live)) ? [] : ['8.5: it does not say the status stays "not yet passed"'];
}

function auditRecord(record: string | undefined, measured: Instrument, exists: Exists = besideRecord): string[] {
  if (record === undefined) return [`the record is missing: ${RECORD_PATH}`];
  return [...auditStatus(record), ...auditRun(record), ...auditBudgets(record), ...auditProtocol(record, measured), ...auditNeverRun(record), ...auditJudgement(record, exists), ...auditLive(record)];
}

const readRecord = (): string | undefined => (existsSync(RECORD_PATH) ? readFileSync(RECORD_PATH, 'utf8').replace(/\r\n/g, '\n') : undefined);

test('the NFR-2 record exists and holds: not yet passed, the budgets, the protocol, the commit and what never ran', () => {
  const record = readRecord();
  assert.ok(record !== undefined, `the record exists at ${RECORD_PATH}`);
  assert.deepEqual(auditRecord(record, instrument()), []);
});

test('the guard reads the instrument from source: the mark, the floor and the gap threshold', () => {
  assert.deepEqual(instrument(), { mark: 'scene-worst-window', floor: 24, maxFrameSeconds: 1 });
  assert.equal(BUDGETS.length, 12, 'eleven AD-23 constants and the entry budget');
});

test('the NFR-2 guard fails on each mutation of the record, naming it', () => {
  const found = readRecord();
  assert.ok(found !== undefined, `the record exists at ${RECORD_PATH}`);
  const record = found;
  const measured = instrument();
  const fails = (text: string | undefined, pattern: RegExp, why: string): void => assert.match(auditRecord(text, measured).join('\n'), pattern, why);
  const swap = (from: string | RegExp, to: string): string => {
    assert.ok(typeof from === 'string' ? record.includes(from) : from.test(record), `the record holds ${String(from)}`);
    return record.replace(from, to);
  };

  fails(undefined, /the record is missing/, 'a missing record');
  // (a)
  fails(swap(STATUS_LINE, '**NFR-2: passed.**'), /status: no line reads[\s\S]*status: the record says NFR-2 passed/, 'the status reworded to passed');
  for (const claim of ['NFR-2 passed.', 'NFR-2: passed', 'NFR-2 has now passed', 'NFR-2 has passed on the target run']) {
    fails(swap(/^A pass changes the status line above/m, `${claim} A pass changes the status line above`), /status: the record says NFR-2 passed/, claim);
  }
  assert.deepEqual(auditStatus(`## Status\n\n${STATUS_LINE} Only a run on a machine matching NFR-4's target profile may change it. No other hardware counts: not the RTX 4080 SUPER, not Apple silicon. No proxy exists. NFR-2 is not-yet-passed.\n`), [], 'not yet passed, in any spacing, is no claim');
  fails(swap(STATUS_LINE, ''), /status: no line reads/, 'the status removed');
  fails(swap(/only a run on a machine matching NFR-4's target profile may change it/i, 'a run may change it'), /only a target-profile run/, 'the target-profile sentence');
  fails(swap(/no other hardware counts/i, 'other hardware may count'), /no other hardware counts/, 'the no-other-hardware sentence');
  fails(swap(/no proxy exists/i, 'a proxy exists'), /no proxy exists/, 'the no-proxy sentence');
  fails(record.replaceAll('RTX 4080 SUPER', 'GPU'), /RTX 4080 SUPER/, 'the dev machine unnamed');
  fails(record.replaceAll('Apple silicon', 'a Mac'), /Apple silicon/, 'Apple silicon unnamed');
  // (b): drift in a value, a dropped row, a lost label, a framerate row.
  assert.match(auditBudgets(record, [['SCENE_CHUNK_BYTES_BUDGET', 970_000]]).join('\n'), /SCENE_CHUNK_BYTES_BUDGET's limit reads/, 'a budgets.ts value changing');
  assert.match(auditBudgets(record, [['MAP_WIDTH_BUDGET', 2048]]).join('\n'), /MAP_WIDTH_BUDGET's limit reads/, 'a value written without separators changing');
  const rowNaming = (name: string): string => {
    const row = record.split('\n').find((line) => line.startsWith('|') && line.includes(`\`${name}\``));
    assert.ok(row !== undefined, `a table row names ${name}`);
    return row;
  };
  const sceneRow = rowNaming('SCENE_CHUNK_BYTES_BUDGET');
  fails(swap(`${sceneRow}\n`, ''), /SCENE_CHUNK_BYTES_BUDGET is named by 0 rows/, 'a dropped row');
  fails(swap(`${sceneRow}\n`, `${sceneRow}\n${sceneRow}\n`), /SCENE_CHUNK_BYTES_BUDGET is named by 2 rows/, 'a doubled row');
  fails(swap(sceneRow, sceneRow.replace('starting value', 'value')), /SCENE_CHUNK_BYTES_BUDGET's row does not say "starting value"/, 'a lost starting value');
  fails(swap(sceneRow, sceneRow.replace(/\bbudget\b/gi, 'limit')), /SCENE_CHUNK_BYTES_BUDGET's row does not say "budget"/, 'a lost budget label');
  for (const rate of ['30 fps', 'a frame rate of 30', 'frame-rates', '30 frames per second', '30 frames a second', '30 frames/s']) {
    fails(swap(sceneRow, sceneRow.replace('starting value', `starting value, ${rate}`)), /a row reads as a framerate/, `a framerate row: ${rate}`);
  }
  for (const [what, first] of UNNAMED_ROWS) {
    const row = record.split('\n').find((line) => line.startsWith('|') && first.test(cellsOf(line)[0] ?? ''));
    assert.ok(row !== undefined, `a table row is the ${what} row`);
    fails(swap(`${row}\n`, ''), new RegExp(`the ${what} row is present 0 times`), `the ${what} row deleted`);
    const cells = cellsOf(row);
    fails(swap(row, `| ${cells.map((cell, index) => (index === 2 ? '1' : cell)).join(' | ')} |`), new RegExp(`the ${what} row's limit reads "1", not 0`), `the ${what} row's limit`);
    fails(swap(row, row.replace(/\bbudget\b/gi, 'cap')), new RegExp(`the ${what} row does not say "budget"`), `the ${what} row's budget label`);
    fails(swap(row, row.replace(/starting value/gi, 'value')), new RegExp(`the ${what} row does not say "starting value"`), `the ${what} row's starting value`);
  }
  const entryRow = rowNaming('ENTRY_BUDGET_BYTES');
  const entryCells = cellsOf(entryRow);
  fails(swap(entryRow, `| ${entryCells.map((cell, index) => (index === 3 ? 'n/a' : cell)).join(' | ')} |`), /ENTRY_BUDGET_BYTES has no measured value/, 'a missing measured value');
  // (c)
  fails(record.replaceAll(`'${measured.mark}'`, "'scene-worst'"), new RegExp(`getEntriesByName\\('${measured.mark}'\\)`), 'the mark renamed in the record');
  assert.match(auditProtocol(record, { ...measured, mark: 'scene-worst-frame' }).join('\n'), /scene-worst-frame/, 'the mark renamed in worst-window.ts');
  fails(swap(/\b1080p\b/g, '1440p'), /1080p/, '1080p');
  fails(record.replace(/\bfresh load\b/gi, 'load'), /fresh load/, 'a fresh load');
  fails(record.replace(/\bforward-and-back\b/gi, 'forward'), /forward-and-back/, 'forward-and-back');
  fails(record.replaceAll('`gaps`', 'the gap count'), /it does not read `gaps`/, 'the gap count read');
  assert.match(auditProtocol(record, { ...measured, maxFrameSeconds: 2 }).join('\n'), /MAX_FRAME_SECONDS \(2 s\)/, 'the gap threshold changed in chart-offer.ts');
  fails(record.replace(/\bvoid\b/gi, 'null'), /when a run is void/, 'the void clause');
  // (d)
  fails(record.replaceAll('`fps >= 30`', '`fps >= 25`'), /fps >= 30/, 'the target');
  fails(record.replaceAll('`gaps === 0`', '`gaps <= 1`'), /gaps === 0/, 'gaps of 0');
  fails(record.replaceAll('`fps` is not null', '`fps` is set'), /fps not null/, 'fps not null');
  assert.match(auditProtocol(record, { ...measured, floor: 20 }).join('\n'), /FALLBACK_FLOOR_FPS \(20\)/, 'the floor changed in chart-offer.ts');
  fails(record.replace(/\bnot a pass\b/gi, 'a soft pass'), /not called "not a pass"/, 'the band');
  fails(record.replace(/\bbelow the floor\b/gi, 'low'), /below the floor is not named a fail/, 'below the floor');
  // (e)
  fails(record.replace(/(?<![0-9a-f])([0-9a-f]{40})(?![0-9a-f])/g, (hash) => hash.slice(0, 7)), /no full 40-hex commit hash/, 'a short hash');
  // (f)
  fails(record.replace(/24 bits/g, '16 bits'), /never run: the depth bias/, 'the depth bias item');
  // A qualifier moved out of its own item into another still fails: the terms must stand together.
  const neverRun = sectionOf(record, HEADINGS.neverRun) as string;
  const depthItem = neverRun.split(/\n(?=- )/).find((item) => /depth bias/i.test(item)) as string;
  assert.ok(depthItem !== undefined && /\bphones\b/.test(depthItem), 'the depth item names phones');
  fails(
    swap(depthItem, depthItem.replace(/,? on phones,?/, '')).replace('- 60 Hz displays.', '- 60 Hz displays, on phones too.'),
    /never run: the depth bias/,
    'phones moved from the depth item to the 60 Hz item',
  );
  fails(swap(/ on other drivers/, ''), /never run: three's program-info-log/, 'other drivers dropped');
  fails(record.replaceAll("imageOrientation: 'flipY'", 'flipY'), /never run: Firefox and Safari/, 'the flipY item');
  fails(record.replace(/60 Hz/g, '120 Hz'), /never run: 60 Hz/, 'the 60 Hz item');
  fails(record.replace(/program-info-log/gi, 'shader'), /never run: three's program-info-log/, 'the program-info-log item');
  // 8.4 (its two states are driven below) and 8.5
  fails(swap(HEADINGS.live, '## Live'), /8\.5: no/, 'the 8.5 section');
  // Each section heading lost fails its own check.
  // The whole heading line is replaced, so an earlier substring of it cannot take the mutation instead.
  for (const [key, heading] of Object.entries(HEADINGS)) {
    const failures = auditRecord(swap(new RegExp(`^${escapeRegExp(heading)}$`, 'm'), `${heading} (renamed)`), measured);
    assert.ok(failures.some((failure) => failure.includes(`no "${heading}" section`)), `the ${key} heading renamed fails: ${failures.join('; ')}`);
  }
});

test('the 8.4 judgement sheet holds in both states: pending as written, recorded only when complete', () => {
  const found = readRecord();
  assert.ok(found !== undefined, `the record exists at ${RECORD_PATH}`);
  const record = found;
  const judgement = sectionOf(record, HEADINGS.judgement);
  assert.ok(judgement !== undefined, 'the record has the 8.4 section');
  const none: Exists = () => false;
  const audit = (text: string, exists: Exists = none): string => auditJudgement(text, exists).join('\n');
  // A mutation of the 8.4 section alone, so a phrase elsewhere in the record cannot stand in for it.
  // Replacer functions throughout, so a `$` in the sheet or a value is never read as a replacement pattern.
  const inSheet = (from: string | RegExp, to: string | ((match: string, ...groups: string[]) => string), text = record): string => {
    const sheet = sectionOf(text, HEADINGS.judgement) as string;
    assert.ok(typeof from === 'string' ? sheet.includes(from) : from.test(sheet), `the 8.4 section holds ${String(from)}`);
    const replace = typeof to === 'string' ? () => to : to;
    const replaced = typeof from === 'string' ? sheet.replace(from, replace) : sheet.replace(from, replace);
    return text.replace(sheet, () => replaced);
  };
  const setField = (text: string, label: string, value: string): string => inSheet(new RegExp(`^(\\s*- \\*\\*${label}:\\*\\*).*$`, 'm'), (_match, lead) => `${lead} ${value}`, text);
  const fails = (text: string, pattern: RegExp, why: string, exists: Exists = none): void => assert.match(audit(text, exists), pattern, why);

  // Pending, as the agent leaves it: the verdict and the screenshots unwritten.
  // The record as it stands, in whichever state it is: a verdict Thomas has written passes on its real screenshots.
  assert.deepEqual(auditJudgement(record, besideRecord), [], 'the record as written passes');
  if (isPending(fieldOf(judgement, 'Verdict'))) {
    assert.equal(fieldOf(judgement, 'Screenshots'), 'None yet.', 'the screenshots read "None yet."');
    for (const label of ['Date', 'Machine', 'Browser']) assert.equal(fieldOf(judgement, label), FIELD_PLACEHOLDER, `${label} is left for Thomas`);
  }
  for (const loose of ['Not yet given', '**Not yet given.**', 'not yet given.']) assert.ok(isPending(loose), `"${loose}" is still pending`);
  // The pending sheet, rebuilt from whatever is written, so these mutations hold in either state.
  let pendingRecord = setField(record, 'Verdict', VERDICT_PENDING);
  pendingRecord = setField(pendingRecord, 'Screenshots', 'None yet.');
  for (const label of ['Date', 'Machine', 'Browser']) pendingRecord = setField(pendingRecord, label, FIELD_PLACEHOLDER);
  assert.deepEqual(auditJudgement(pendingRecord, none), [], 'pending passes with no screenshot on disk');

  // Recorded: every field written, and the named screenshots "beside the record".
  const shots = ['judgement-8-4-opening-frame.png', 'judgement-8-4-rail-2.8333.png'];
  let recorded = setField(pendingRecord, 'Date', '2026-11-20.');
  recorded = setField(recorded, 'Machine', 'the dev machine; not the target profile.');
  recorded = setField(recorded, 'Browser', 'Chrome 142.');
  recorded = setField(recorded, 'Verdict', 'Realistic, not a screensaver; ships.');
  recorded = setField(recorded, 'Screenshots', shots.map((name) => `\`${name}\``).join(', '));
  const present: Exists = (name) => shots.includes(name);
  assert.deepEqual(auditJudgement(recorded, present), [], 'a complete recorded verdict passes');
  assert.deepEqual(auditRecord(recorded, instrument(), present), [], 'and the whole record with it');

  // A verdict with a blank field.
  for (const label of ['Date', 'Machine', 'Browser']) {
    fails(setField(recorded, label, FIELD_PLACEHOLDER), new RegExp(`the "${label}" field is not written`), `${label} left as the placeholder`, present);
    fails(setField(recorded, label, ''), new RegExp(`the "${label}" field is not written`), `${label} emptied`, present);
  }
  fails(setField(recorded, 'Verdict', ''), /the verdict is blank/, 'an empty verdict', present);
  fails(setField(recorded, 'Date', 'soon.'), /"Date" field is not a YYYY-MM-DD date/, 'a date that is no date', present);
  fails(setField(recorded, 'Commit', ''), /"Commit" field holds no full 40-hex commit/, 'the commit emptied', present);
  fails(setField(recorded, 'Commit', '`2adeaa5`'), /"Commit" field holds no full 40-hex commit/, 'a short commit', present);
  fails(setField(recorded, 'Poses', ''), /"Poses" field is not written/, 'the poses emptied', present);
  fails(inSheet(/^\s*- \*\*Commit:\*\*.*\n/m, '', recorded), /no "Commit" field/, 'the commit line dropped from a recorded sheet', present);
  const dollars = setField(recorded, 'Verdict', 'costs $1 and $&; ships.');
  assert.equal(fieldOf(sectionOf(dollars, HEADINGS.judgement) as string, 'Verdict'), 'costs $1 and $&; ships.', 'a $ in a value is kept as written');
  assert.deepEqual(auditJudgement(dollars, present), [], 'and the sheet holding it passes');
  // A missing screenshot, or none named.
  fails(recorded, /the screenshot judgement-8-4-rail-2\.8333\.png is not beside the record/, 'a named PNG absent', (name) => name === shots[0]);
  fails(setField(recorded, 'Screenshots', 'None yet.'), /names no judgement-8-4-\*\.png/, 'a verdict with no screenshot', present);
  fails(setField(recorded, 'Screenshots', '`opening.png`'), /names no judgement-8-4-\*\.png/, 'a screenshot not named judgement-8-4-*', present);
  // A field's line dropped, in either state.
  for (const label of FIELDS) fails(inSheet(new RegExp(`^\\s*- \\*\\*${label}:\\*\\*.*\\n`, 'm'), ''), new RegExp(`no "${label}" field`), `the ${label} field dropped`);
  // A pose or a look dropped.
  const rowStarting = (heading: string, cell: string): string => {
    const row = (sectionOf(judgement, heading) as string).split('\n').find((line) => line.trim().startsWith('|') && (cellsOf(line)[0] ?? '').toLowerCase().includes(cell.toLowerCase()));
    assert.ok(row !== undefined, `${heading} has a row for ${cell}`);
    return row;
  };
  for (const pose of POSES) fails(inSheet(`${rowStarting(SHEET.poses, pose)}\n`, ''), new RegExp(`the pose "${escapeRegExp(pose)}" is not in the poses table`), `the ${pose} pose dropped`);
  for (const look of LOOKS) fails(inSheet(`${rowStarting(SHEET.checklist, look)}\n`, ''), new RegExp(`the look "${escapeRegExp(look)}" is not in the checklist`), `the look ${look} dropped`);
  fails(inSheet(/2266\.64/g, '2266'), /the 2266\.64 wheel step/, 'the wheel step changed');
  // The sentences every state keeps.
  fails(inSheet(/not the target profile/gi, 'a fine machine'), /not the target profile/, 'the target-profile line lost');
  fails(inSheet(/not yet passed/gi, 'settled'), /not yet passed/, 'the status line lost');
  fails(inSheet(/(?<![0-9a-f])([0-9a-f]{40})(?![0-9a-f])/g, '2adeaa5'), /no full 40-hex build commit/, 'a short build commit');
  for (const [lever, pattern] of LEVERS) {
    const rejected = sectionOf(judgement, SHEET.rejected) as string;
    fails(inSheet(rejected, rejected.replace(new RegExp(pattern.source, 'gi'), 'something')), new RegExp(`does not name "${lever}"`), `the lever ${lever} dropped`);
  }
  for (const [criterion, pattern] of CRITERIA) fails(inSheet(new RegExp(pattern.source, 'gi'), 'something'), new RegExp(`the criterion "${escapeRegExp(criterion)}"`), `the criterion ${criterion} dropped`);
  for (const [chunk, pattern] of CHUNKS) fails(inSheet(new RegExp(pattern.source, 'g'), '`chunk.js`'), new RegExp(`the build does not name the ${chunk} chunk`), `the ${chunk} chunk name dropped`);
  for (const heading of Object.values(SHEET)) fails(inSheet(new RegExp(`^${escapeRegExp(heading)}$`, 'm'), `${heading} (renamed)`), new RegExp(`no "${escapeRegExp(heading)}" sub-section`), `${heading} renamed`);
});
