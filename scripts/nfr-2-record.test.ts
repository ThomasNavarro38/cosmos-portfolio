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
 *   holds a 40-hex commit under The build, the build's three chunk names, AC 8.4-1's
 *   two criteria ("realistic, not a screensaver", label contrast), the four poses
 *   (`opening frame`, `Client stop`, `Focus`, `rail(p=2.8333)`) with the `2266.64`
 *   wheel step, the seven looks Epic 7 routed to it, the rejection route's levers,
 *   AD-23 and the memlog, and the fields Date, Machine, Browser, Commit, Poses,
 *   Verdict and Screenshots, each on one line only. Pending (the verdict reads
 *   `Not yet given.`, markup and the period aside): nothing more, so the agent's
 *   sheet passes as written. Recorded (any other verdict): a real `YYYY-MM-DD`
 *   Date; Machine, Browser, Poses and the verdict written (not empty, markup or the
 *   placeholder); Commit the 40-hex hash under The build; and the Screenshots field
 *   naming at least one `judgement-8-4-*.png`, each present beside the record. Existence is injected,
 *   so the mutations need no file; the record as it stands is read against the
 *   real directory, so it passes in either state. The sheet is one `Judgement`
 *   description (`JUDGEMENT_8_4`) read by the one two-state `auditJudgement`.
 * - **(g′) The 9.11 judgement sheet, the same audit over `JUDGEMENT_9_11`.** Its
 *   section `## Second judgement (9.11)` stands after 8.4's and before Live
 *   (8.5). Always, besides (g)'s parts: five poses (8.4's four and `Star close-up`)
 *   with the `deltaY: 2266.64` and `deltaY: 1000` wheel steps, both displays
 *   ("1920×1080", "Odyssey Ark") named in The poses, the fourteen routed looks
 *   (8.4's rejection answered among them) with the dark ring closed as
 *   superseded by 9.4, Epic 7's and Epic 9's levers
 *   (the `realism-*` tokens) with the composer and line-work routed to the
 *   memlog, a `Displays` field, and 8.4's verdict still reading "Rejected".
 *   Wheel steps are matched bounded, each in its own pose's row (8.4's too), so
 *   `deltaY: 10000` is not `deltaY: 1000` and swapped steps fail;
 *   `1920x1080` counts as `1920×1080`; the heading appears once, and the order
 *   check fails when a heading it compares is missing. Pending as (g).
 *   Recorded: Date, Machine, Browser, Displays and Poses written, Displays
 *   naming both displays, Commit the build's, and at least one
 *   `judgement-9-11-<pose>-<display>.png` (one of the five poses, `-1920x1080` or `-ark`) named, each
 *   present beside the record.
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
  secondJudgement: '## Second judgement (9.11)',
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

/** A judgement sheet's sub-sections, inside its heading: 8.4's and 9.11's alike. */
const SHEET = {
  build: '### The build',
  poses: '### The poses',
  checklist: '### The checklist',
  rejected: '### If a pose is rejected',
  verdict: '### The verdict',
} as const;

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

/** What the fields left for Thomas read until he writes them. */
const FIELD_PLACEHOLDER = 'To be written by Thomas.';
/** The verdict while none is given. Any other value is a recorded verdict. */
const VERDICT_PENDING = 'Not yet given.';
/** Pending, read loosely: markup and the closing period do not make a verdict. */
const isPending = (value: string | undefined): boolean => value !== undefined && /^not yet given\.?$/i.test(value.replace(/[*_`]/g, '').trim());
/** Unwritten, read loosely as `isPending` reads the verdict: nothing, markup alone, or the placeholder. */
const isUnwritten = (value: string): boolean => {
  const bare = value.replace(/[*_`]/g, '').trim();
  return bare === '' || /^to be written by thomas\.?$/i.test(bare);
};
/** A real calendar date, `YYYY-MM-DD`, standing alone among the digits: `2026-02-30` is no date. */
function holdsCalendarDate(value: string): boolean {
  const hit = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/.exec(value);
  if (hit === null) return false;
  const [year, month, day] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** A screenshot beside the record, by its bare name. */
type Exists = (name: string) => boolean;
const besideRecord: Exists = (name) => existsSync(join(dirname(RECORD_PATH), name));

const fieldLine = (label: string, flags: string): RegExp => new RegExp(`^\\s*- \\*\\*${label}:\\*\\*(.*)$`, flags);

/** A field's value on its `- **Label:**` line, trimmed; undefined when no line carries the label. */
function fieldOf(section: string, label: string): string | undefined {
  return fieldLine(label, 'm').exec(section)?.[1]?.trim();
}

/**
 * One judgement sheet, described. The one two-state audit reads 8.4's and
 * 9.11's through it, so both stay green together without an agent editing this
 * test.
 */
interface Judgement {
  /** The failure prefix: `8.4` or `9.11`. */
  readonly tag: string;
  readonly heading: string;
  /** Each within the first cell of a row of the poses table. */
  readonly poses: readonly string[];
  /** The wheel steps the poses table must give, each `[pose, step]` in that pose's own row. */
  readonly steps: readonly (readonly [string, string])[];
  /** Each within the first cell of a row of the checklist. */
  readonly looks: readonly string[];
  readonly levers: readonly (readonly [string, RegExp])[];
  /** Every field, each a `- **Label:** value` line. */
  readonly fields: readonly string[];
  /** The fields left for Thomas: the placeholder while pending. */
  readonly left: readonly string[];
  /** The fields a recorded verdict requires written. */
  readonly written: readonly string[];
  /** Every screenshot's name starts with this, beside the record. */
  readonly prefix: string;
  /**
   * The whole name a screenshot must have, when the sheet fixes it: `rule` names it
   * in the failure, and `sample` is the display suffix the recorded fixture uses.
   * Absent: any `<prefix><pose>.png`.
   */
  readonly ending?: { readonly pattern: RegExp; readonly rule: string; readonly sample: string };
  /** The verdict the recorded fixture writes: one this sheet's record may hold beside the other sheet's. */
  readonly recordedVerdict: string;
  /** The checks only this sheet carries, over the whole record and its own section. */
  readonly extra: (record: string, section: string) => string[];
  /** The checks only this sheet carries once a verdict is recorded, over the fields' values. */
  readonly recorded: (values: ReadonlyMap<string, string | undefined>) => string[];
}

/** A wheel step as the poses text must give it: no digit or `.` before it, and no further digit after it, so `deltaY: 10000` is not `deltaY: 1000`. */
const stepPattern = (step: string, flags = ''): RegExp => new RegExp(`(?<![\\d.])${escapeRegExp(step)}(?![\\d.]*\\d)`, flags);

/**
 * The screenshots a value names: `<prefix><pose>.png`. Bounded on both sides, so
 * `old-judgement-8-4-focus.png` is not read as another file's name.
 */
const screenshotsIn = (value: string, prefix: string): string[] => [
  ...new Set(value.match(new RegExp(`(?<![\\w.-])${escapeRegExp(prefix)}[\\w.()=-]+?\\.png(?![\\w.-])`, 'g')) ?? []),
];

/** The 8.4 sheet: four poses and the seven looks Epic 7 routed to it (retro F4). */
const JUDGEMENT_8_4: Judgement = {
  tag: '8.4',
  heading: HEADINGS.judgement,
  poses: ['opening frame', 'Client stop', 'Focus', 'rail(p=2.8333)'],
  // The step that reaches `rail(p=2.8333)`: 2.8333 × `WHEEL_PIXELS_PER_STOP` (800).
  steps: [['rail(p=2.8333)', '2266.64']],
  looks: [
    'A farther fill over a nearer glow',
    'Half-disc Planets',
    "The Star's dark ring",
    'The fill-tilt axis wording',
    'Jupiter worn by no Planet',
    'The band between the plate and the keyboard outline',
    'Overlapping rest glows',
  ],
  levers: LEVERS,
  fields: ['Date', 'Machine', 'Browser', 'Commit', 'Poses', 'Verdict', 'Screenshots'],
  left: ['Date', 'Machine', 'Browser'],
  written: ['Date', 'Machine', 'Browser', 'Poses'],
  prefix: 'judgement-8-4-',
  // 8.4's own verdict is a rejection, and 9.11's sheet requires it to stay one.
  recordedVerdict: 'Rejected. The stars still read as discs.',
  extra: () => [],
  recorded: () => [],
};

/**
 * The two displays every 9.11 pose is judged at: each by its name, how The poses
 * must name it, and how a recorded Displays field may. `1920x1080` with an ASCII x
 * counts as `1920×1080`.
 */
const DISPLAYS: readonly (readonly [string, RegExp, RegExp])[] = [
  ['1920×1080', /\b1920\s*[×x]\s*1080\b/, /\b1920\s*[×x]\s*1080\b/],
  ['Odyssey Ark', /\bOdyssey Ark\b/, /\bArk\b/i],
];

/** 9.11's own checks: both displays, the dark ring closed by 9.4, 8.4 still rejected, and the section's place. */
function auditSecondOnly(record: string, section: string): string[] {
  const failures: string[] = [];
  const poses = sectionOf(section, SHEET.poses);
  if (poses !== undefined) for (const [display, pattern] of DISPLAYS) if (!pattern.test(flat(poses))) failures.push(`9.11: the poses do not name the display "${display}"`);
  const checklist = sectionOf(section, SHEET.checklist);
  const ring = checklist === undefined ? undefined : rowsOf(checklist).find((cells) => (cells[0] ?? '').toLowerCase().includes("the star's dark ring"));
  if (ring !== undefined) {
    const text = ring.join(' | ');
    if (!/\bsuperseded\b/i.test(text) || !/(?<![\d.])9\.4(?!\d)/.test(text)) failures.push('9.11: the dark ring is not closed as superseded by 9.4');
  }
  const first = sectionOf(record, HEADINGS.judgement);
  const firstVerdict = first === undefined ? undefined : sectionOf(first, SHEET.verdict);
  const rejected = firstVerdict === undefined ? undefined : fieldOf(firstVerdict, 'Verdict');
  if (rejected === undefined || !/^rejected\b/i.test(rejected.replace(/[*_`]/g, '').trim())) failures.push('9.11: 8.4\'s verdict no longer reads "Rejected"');
  const lines = record.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim());
  const before = lines.indexOf(HEADINGS.judgement);
  const at = lines.indexOf(HEADINGS.secondJudgement);
  const after = lines.indexOf(HEADINGS.live);
  // A heading it is compared against, missing, fails too: the place cannot be shown.
  if (before === -1 || at === -1 || after === -1 || !(before < at && at < after)) failures.push("9.11: the section is not after 8.4's and before Live (8.5)");
  return failures;
}

/** The 9.11 sheet: 8.4's four poses and a Star close-up, each at both displays, the routed looks, and Epic 7's and Epic 9's levers. */
const JUDGEMENT_9_11: Judgement = {
  tag: '9.11',
  heading: HEADINGS.secondJudgement,
  poses: ['opening frame', 'Client stop', 'Focus', 'rail(p=2.8333)', 'Star close-up'],
  // rail(p=2.8333) by 2.8333 × 800; the Star close-up, rail(p=1.25), by 1.25 × 800.
  steps: [
    ['rail(p=2.8333)', 'deltaY: 2266.64'],
    ['Star close-up', 'deltaY: 1000'],
  ],
  looks: [
    "8.4's rejection, answered",
    "The Star's dark ring",
    'Overlapping rest glows',
    'A farther fill over a nearer glow',
    'Half-disc Planets',
    'The fill-tilt axis wording',
    'Jupiter worn by no Planet',
    'The band between the plate and the keyboard outline',
    'Client names and their halo over the glows',
    'The crossfade and its fade-time artefacts',
    'The belt across a sibling Planet',
    "The nebula's self-overlap",
    'The ring disc at the opening frame',
    "The rim switch against the Star's rise",
  ],
  levers: [...LEVERS, ['Epic 9', /\bEpic 9\b/], ['realism-* tokens', /`realism-\*`/], ['composer', /\bcomposer\b/i], ['line-work', /\bline-work\b/i]],
  fields: ['Date', 'Machine', 'Browser', 'Displays', 'Commit', 'Poses', 'Verdict', 'Screenshots'],
  left: ['Date', 'Machine', 'Browser', 'Displays'],
  written: ['Date', 'Machine', 'Browser', 'Displays', 'Poses'],
  prefix: 'judgement-9-11-',
  // `judgement-9-11-<pose>-<display>.png`: one of the five poses, the display `1920x1080` or `ark`.
  ending: {
    pattern: /^judgement-9-11-(?:opening-frame|client-stop|focus|rail-2\.8333|star-close-up)-(?:1920x1080|ark)\.png$/,
    rule: 'judgement-9-11-<pose>-<display>.png with a listed pose and display',
    sample: '-1920x1080',
  },
  recordedVerdict: 'Realistic, not a screensaver; ships.',
  extra: auditSecondOnly,
  recorded: (values) => {
    const displays = values.get('Displays');
    if (displays === undefined || isUnwritten(displays)) return [];
    return DISPLAYS.filter(([, , pattern]) => !pattern.test(displays)).map(([display]) => `9.11: a verdict is given and the "Displays" field does not name ${display}`);
  },
};

const JUDGEMENTS: readonly Judgement[] = [JUDGEMENT_8_4, JUDGEMENT_9_11];

/**
 * A judgement sheet, in both states. Always: the sheet's parts, so the build,
 * the poses, the looks and the route back are there to judge by. Pending (the
 * verdict reads `Not yet given.`): nothing more. Recorded (any other verdict):
 * every field written and every screenshot it names present beside the record,
 * by `exists`.
 */
function auditJudgement(record: string, sheet: Judgement, exists: Exists): string[] {
  const { tag } = sheet;
  const section = sectionOf(record, sheet.heading);
  if (section === undefined) return [`${tag}: no "${sheet.heading}" section`];
  const failures: string[] = [];
  // sectionOf reads the first heading only, so a second one would be read past silently.
  if (record.replace(/\r\n/g, '\n').split('\n').filter((line) => line.trim() === sheet.heading).length > 1) failures.push(`${tag}: the "${sheet.heading}" heading appears more than once`);
  const prose = flat(section);
  if (!/not the target profile/i.test(prose)) failures.push(`${tag}: it does not say the machine is not the target profile`);
  if (!/not yet passed/i.test(prose)) failures.push(`${tag}: it does not say the status stays "not yet passed"`);
  for (const [criterion, pattern] of CRITERIA) if (!pattern.test(prose)) failures.push(`${tag}: it does not name the criterion "${criterion}"`);
  const sub = (heading: string): string | undefined => {
    const text = sectionOf(section, heading);
    if (text === undefined) failures.push(`${tag}: no "${heading}" sub-section`);
    return text;
  };
  const firstCells = (text: string | undefined): string[] => (text === undefined ? [] : rowsOf(text).map((cells) => cells[0] ?? ''));
  const build = sub(SHEET.build);
  // Under The build itself: the verdict's Commit line must not stand in for it.
  const buildCommit = build === undefined ? undefined : HASH.exec(build)?.[0];
  if (build !== undefined && buildCommit === undefined) failures.push(`${tag}: no full 40-hex build commit`);
  if (build !== undefined) for (const [chunk, pattern] of CHUNKS) if (!pattern.test(build)) failures.push(`${tag}: the build does not name the ${chunk} chunk`);
  const poses = sub(SHEET.poses);
  const poseCells = firstCells(poses);
  for (const pose of sheet.poses) if (!poseCells.some((cell) => cell.includes(pose))) failures.push(`${tag}: the pose "${pose}" is not in the poses table`);
  // In its own pose's row, so two steps swapped between rows, or one given in prose only, fail.
  const poseRows = poses === undefined ? [] : rowsOf(poses);
  if (poses !== undefined) {
    for (const [pose, step] of sheet.steps) {
      const row = poseRows.find((cells) => (cells[0] ?? '').includes(pose));
      if (row === undefined || !stepPattern(step).test(row.join(' | '))) failures.push(`${tag}: the poses do not give the ${step} wheel step`);
    }
  }
  const lookCells = firstCells(sub(SHEET.checklist)).map((cell) => cell.toLowerCase());
  for (const look of sheet.looks) if (!lookCells.some((cell) => cell.includes(look.toLowerCase()))) failures.push(`${tag}: the look "${look}" is not in the checklist`);
  const rejected = sub(SHEET.rejected);
  if (rejected !== undefined) for (const [lever, pattern] of sheet.levers) if (!pattern.test(flat(rejected))) failures.push(`${tag}: the rejection route does not name "${lever}"`);
  failures.push(...sheet.extra(record, section));
  const verdict = sub(SHEET.verdict);
  if (verdict === undefined) return failures;
  const values = new Map(sheet.fields.map((label) => [label, fieldOf(verdict, label)]));
  for (const [label, value] of values) if (value === undefined) failures.push(`${tag}: no "${label}" field`);
  // Only the first line of a label is read, so a second one would be read past silently.
  for (const label of sheet.fields) if ((verdict.match(fieldLine(label, 'gm')) ?? []).length > 1) failures.push(`${tag}: the "${label}" field is written more than once`);
  const given = values.get('Verdict');
  if (given === undefined || isPending(given)) return failures;
  // Recorded: a verdict is given, so every field it rests on must be written.
  if (isUnwritten(given)) failures.push(`${tag}: the verdict is blank`);
  for (const label of sheet.written) {
    const value = values.get(label);
    if (value !== undefined && isUnwritten(value)) failures.push(`${tag}: a verdict is given and the "${label}" field is not written`);
  }
  const date = values.get('Date');
  if (date !== undefined && !isUnwritten(date) && !holdsCalendarDate(date)) failures.push(`${tag}: a verdict is given and the "Date" field is not a YYYY-MM-DD date`);
  const commit = values.get('Commit');
  const judged = commit === undefined ? undefined : HASH.exec(commit)?.[0];
  if (commit !== undefined && judged === undefined) failures.push(`${tag}: a verdict is given and the "Commit" field holds no full 40-hex commit`);
  // 8.5 matches the merged build by The build's commit and chunks, so the judged commit must be that one.
  else if (judged !== undefined && buildCommit !== undefined && judged !== buildCommit) failures.push(`${tag}: a verdict is given and the "Commit" field is not the commit under The build`);
  const named = screenshotsIn(values.get('Screenshots') ?? '', sheet.prefix);
  if (named.length === 0) failures.push(`${tag}: a verdict is given and the "Screenshots" field names no ${sheet.prefix}*.png`);
  for (const name of named) if (!exists(name)) failures.push(`${tag}: the screenshot ${name} is not beside the record`);
  if (sheet.ending !== undefined) for (const name of named) if (!sheet.ending.pattern.test(name)) failures.push(`${tag}: the screenshot ${name} is not named ${sheet.ending.rule}`);
  failures.push(...sheet.recorded(values));
  return failures;
}

function auditLive(record: string): string[] {
  const live = sectionOf(record, HEADINGS.live);
  if (live === undefined) return [`8.5: no "${HEADINGS.live}" section`];
  return /not yet passed/i.test(flat(live)) ? [] : ['8.5: it does not say the status stays "not yet passed"'];
}

function auditRecord(record: string | undefined, measured: Instrument, exists: Exists = besideRecord): string[] {
  if (record === undefined) return [`the record is missing: ${RECORD_PATH}`];
  return [...auditStatus(record), ...auditRun(record), ...auditBudgets(record), ...auditProtocol(record, measured), ...auditNeverRun(record), ...JUDGEMENTS.flatMap((sheet) => auditJudgement(record, sheet, exists)), ...auditLive(record)];
}

const readRecord = (): string | undefined => (existsSync(RECORD_PATH) ? readFileSync(RECORD_PATH, 'utf8').replace(/\r\n/g, '\n') : undefined);

test('the NFR-2 record exists and holds: not yet passed, the budgets, the protocol, the commit and what never ran', () => {
  const record = readRecord();
  assert.ok(record !== undefined, `the record exists at ${RECORD_PATH}`);
  assert.deepEqual(auditRecord(record, instrument()), []);
});

test('the guard reads the instrument from source: the mark, the floor and the gap threshold', () => {
  assert.deepEqual(instrument(), { mark: 'scene-worst-window', floor: 24, maxFrameSeconds: 1 });
  assert.equal(BUDGETS.length, 15, 'fourteen AD-23 constants, with the belts since 9.6, the nebula since 9.7 and the Deep Project row since 9.8, and the entry budget');
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

/**
 * Drives one judgement sheet through both states, by mutation of its own section:
 * pending as the agent leaves it, recorded only when complete. 8.4's failures keep
 * their messages; 9.11's carry its own prefix.
 */
function holdsBothStates(sheet: Judgement): { readonly recorded: string; readonly present: Exists } {
  const found = readRecord();
  assert.ok(found !== undefined, `the record exists at ${RECORD_PATH}`);
  const record = found;
  const { tag } = sheet;
  const judgement = sectionOf(record, sheet.heading);
  assert.ok(judgement !== undefined, `the record has the ${tag} section`);
  const none: Exists = () => false;
  const audit = (text: string, exists: Exists = none): string => auditJudgement(text, sheet, exists).join('\n');
  // A mutation of this sheet's section alone, so a phrase elsewhere in the record cannot stand in for it.
  // Replacer functions throughout, so a `$` in the sheet or a value is never read as a replacement pattern.
  const inSheet = (from: string | RegExp, to: string | ((match: string, ...groups: string[]) => string), text = record): string => {
    const part = sectionOf(text, sheet.heading) as string;
    assert.ok(typeof from === 'string' ? part.includes(from) : from.test(part), `the ${tag} section holds ${String(from)}`);
    const replace = typeof to === 'string' ? () => to : to;
    const replaced = typeof from === 'string' ? part.replace(from, replace) : part.replace(from, replace);
    return text.replace(part, () => replaced);
  };
  const setField = (text: string, label: string, value: string): string => inSheet(new RegExp(`^(\\s*- \\*\\*${label}:\\*\\*).*$`, 'm'), (_match, lead) => `${lead} ${value}`, text);
  const fails = (text: string, pattern: RegExp, why: string, exists: Exists = none): void => assert.match(audit(text, exists), pattern, `${tag}: ${why}`);
  const named = new RegExp(`${escapeRegExp(tag)}: `);

  // The record as it stands, in whichever state it is: a verdict Thomas has written passes on its real screenshots.
  assert.deepEqual(auditJudgement(record, sheet, besideRecord), [], `the ${tag} sheet as written passes`);
  if (isPending(fieldOf(judgement, 'Verdict'))) {
    assert.equal(fieldOf(judgement, 'Screenshots'), 'None yet.', 'the screenshots read "None yet."');
    for (const label of sheet.left) assert.equal(fieldOf(judgement, label), FIELD_PLACEHOLDER, `${label} is left for Thomas`);
  }
  for (const loose of ['Not yet given', '**Not yet given.**', 'not yet given.']) assert.ok(isPending(loose), `"${loose}" is still pending`);
  // The pending sheet, rebuilt from whatever is written, so these mutations hold in either state.
  let pendingRecord = setField(record, 'Verdict', VERDICT_PENDING);
  pendingRecord = setField(pendingRecord, 'Screenshots', 'None yet.');
  for (const label of sheet.left) pendingRecord = setField(pendingRecord, label, FIELD_PLACEHOLDER);
  assert.deepEqual(auditJudgement(pendingRecord, sheet, none), [], 'pending passes with no screenshot on disk');

  // Recorded: every field written, and the named screenshots "beside the record".
  const ending = sheet.ending?.sample ?? '';
  const shots = [`${sheet.prefix}opening-frame${ending}.png`, `${sheet.prefix}rail-2.8333${ending}.png`];
  const written: Readonly<Record<string, string>> = {
    Date: '2026-11-30.',
    Machine: 'the dev machine; not the target profile.',
    Browser: 'Chrome 159.',
    Displays: 'a 1920×1080 display and the Odyssey Ark.',
  };
  let recorded = pendingRecord;
  for (const label of sheet.left) recorded = setField(recorded, label, written[label] ?? 'written.');
  recorded = setField(recorded, 'Verdict', sheet.recordedVerdict);
  recorded = setField(recorded, 'Screenshots', shots.map((name) => `\`${name}\``).join(', '));
  const present: Exists = (name) => shots.includes(name);
  assert.deepEqual(auditJudgement(recorded, sheet, present), [], 'a complete recorded verdict passes');
  assert.deepEqual(auditRecord(recorded, instrument(), (name) => present(name) || besideRecord(name)), [], 'and the whole record with it');

  // A verdict with a blank field: the placeholder, nothing, or markup alone.
  const blanks = [FIELD_PLACEHOLDER, '', '**', '``', '**To be written by Thomas.**'];
  for (const label of sheet.written) {
    for (const blank of blanks) fails(setField(recorded, label, blank), new RegExp(`${named.source}a verdict is given and the "${label}" field is not written`), `${label} as ${JSON.stringify(blank)}`, present);
  }
  for (const blank of blanks) fails(setField(recorded, 'Verdict', blank), /the verdict is blank/, `the verdict as ${JSON.stringify(blank)}`, present);
  for (const bad of ['soon.', '2026-99-99.', '2026-02-30.', '12026-11-20.']) fails(setField(recorded, 'Date', bad), /"Date" field is not a YYYY-MM-DD date/, `the date ${bad}`, present);
  assert.deepEqual(auditJudgement(setField(recorded, 'Date', '2028-02-29, evening.'), sheet, present), [], 'a leap day, with words after it, is a date');
  fails(setField(recorded, 'Commit', ''), /"Commit" field holds no full 40-hex commit/, 'the commit emptied', present);
  fails(setField(recorded, 'Commit', '`2adeaa5`'), /"Commit" field holds no full 40-hex commit/, 'a short commit', present);
  fails(inSheet(/^\s*- \*\*Commit:\*\*.*\n/m, '', recorded), /no "Commit" field/, 'the commit line dropped from a recorded sheet', present);
  // The judged commit is the one under The build: another build replaces both.
  const otherBuild = 'f'.repeat(40);
  fails(setField(recorded, 'Commit', `\`${otherBuild}\``), /the "Commit" field is not the commit under The build/, "a judged commit that is not the build's", present);
  assert.deepEqual(auditJudgement(inSheet(new RegExp(HASH.source, 'g'), otherBuild, recorded), sheet, present), [], 'another build, written under The build too, passes');
  const buildPart = sectionOf(judgement, SHEET.build) as string;
  fails(inSheet(buildPart, buildPart.replace(new RegExp(HASH.source, 'g'), '2adeaa5')), /no full 40-hex build commit/, 'the build shortened while the Commit field keeps its hash');
  // A field written twice, in either state: the first line must not stand for the sheet.
  const verdictLine = /^\s*- \*\*Verdict:\*\*.*$/m;
  fails(inSheet(verdictLine, (line) => `${line}\n- **Verdict:** ${VERDICT_PENDING}`, recorded), /the "Verdict" field is written more than once/, 'a pending line left under a recorded verdict', present);
  fails(inSheet(verdictLine, (line) => `- **Verdict:** Ships.\n${line}`, pendingRecord), /the "Verdict" field is written more than once/, 'a verdict written above the pending line');
  const dollars = setField(recorded, 'Verdict', 'costs $1 and $&; ships.');
  assert.equal(fieldOf(sectionOf(dollars, sheet.heading) as string, 'Verdict'), 'costs $1 and $&; ships.', 'a $ in a value is kept as written');
  assert.deepEqual(auditJudgement(dollars, sheet, present), [], 'and the sheet holding it passes');
  const anything: Exists = () => true;
  // A missing screenshot, or none named, or another sheet's named.
  const prefixRe = escapeRegExp(sheet.prefix);
  fails(recorded, new RegExp(`the screenshot ${escapeRegExp(shots[1] as string)} is not beside the record`), 'a named PNG absent', (name) => name === shots[0]);
  // A name without the sheet's fixed ending, when it fixes one.
  if (sheet.ending !== undefined) {
    for (const [bad, why] of [
      [`${sheet.prefix}opening-frame.png`, 'a screenshot without its display'],
      [`${sheet.prefix}anything-ark.png`, 'a screenshot of no listed pose'],
      [`${sheet.prefix}ark.png`, 'a screenshot with no pose'],
    ] as const) {
      fails(setField(recorded, 'Screenshots', `\`${bad}\``), new RegExp(`the screenshot ${escapeRegExp(bad)} is not named`), why, anything);
    }
  }
  fails(setField(recorded, 'Screenshots', 'None yet.'), new RegExp(`names no ${prefixRe}\\*\\.png`), 'a verdict with no screenshot', present);
  fails(setField(recorded, 'Screenshots', '`opening.png`'), new RegExp(`names no ${prefixRe}\\*\\.png`), `a screenshot not named ${sheet.prefix}*`, present);
  for (const other of JUDGEMENTS.filter((each) => each !== sheet)) {
    fails(setField(recorded, 'Screenshots', `\`${other.prefix}opening-frame.png\``), new RegExp(`names no ${prefixRe}\\*\\.png`), `only ${other.prefix}* named`, anything);
  }
  // A longer name only holds a screenshot's name: it is another file, whatever exists.
  for (const longer of [`\`old-${sheet.prefix}opening-frame.png\``, `\`${sheet.prefix}opening-frame.png.bak\``]) {
    fails(setField(recorded, 'Screenshots', longer), new RegExp(`names no ${prefixRe}\\*\\.png`), `the longer name ${longer}`, anything);
  }
  // A field's line dropped, in either state.
  for (const label of sheet.fields) fails(inSheet(new RegExp(`^\\s*- \\*\\*${label}:\\*\\*.*\\n`, 'm'), ''), new RegExp(`no "${label}" field`), `the ${label} field dropped`);
  // A pose, a step or a look dropped.
  const rowStarting = (heading: string, cell: string): string => {
    const row = (sectionOf(judgement, heading) as string).split('\n').find((line) => line.trim().startsWith('|') && (cellsOf(line)[0] ?? '').toLowerCase().includes(cell.toLowerCase()));
    assert.ok(row !== undefined, `${heading} has a row for ${cell}`);
    return row;
  };
  for (const pose of sheet.poses) fails(inSheet(`${rowStarting(SHEET.poses, pose)}\n`, ''), new RegExp(`${named.source}the pose "${escapeRegExp(pose)}" is not in the poses table`), `the ${pose} pose dropped`);
  for (const look of sheet.looks) fails(inSheet(`${rowStarting(SHEET.checklist, look)}\n`, ''), new RegExp(`${named.source}the look "${escapeRegExp(look)}" is not in the checklist`), `the look ${look} dropped`);
  for (const [pose, step] of sheet.steps) {
    fails(inSheet(new RegExp(escapeRegExp(step), 'g'), step.replace(/\d+(?:\.\d+)?$/, '7')), new RegExp(`the ${escapeRegExp(step)} wheel step`), `the step ${step} changed`);
    // A digit more is another step, not this one: `deltaY: 10000` is not `deltaY: 1000`.
    fails(inSheet(stepPattern(step, 'g'), `${step}0`), new RegExp(`the ${escapeRegExp(step)} wheel step`), `the step ${step} with a digit appended`);
    // Taken out of its pose's row and given in the prose below the table: the row must hold it.
    const row = rowStarting(SHEET.poses, pose);
    const moved = inSheet(row, row.replace(stepPattern(step, 'g'), 'the step'));
    fails(inSheet(SHEET.checklist, `The step is ${step}.\n\n${SHEET.checklist}`, moved), new RegExp(`the ${escapeRegExp(step)} wheel step`), `the step ${step} out of the ${pose} row`);
  }
  // The sentences every state keeps.
  fails(inSheet(/not the target profile/gi, 'a fine machine'), /not the target profile/, 'the target-profile line lost');
  fails(inSheet(/not yet passed/gi, 'settled'), /not yet passed/, 'the status line lost');
  fails(inSheet(/(?<![0-9a-f])([0-9a-f]{40})(?![0-9a-f])/g, '2adeaa5'), /no full 40-hex build commit/, 'a short build commit');
  for (const [lever, pattern] of sheet.levers) {
    const rejected = sectionOf(judgement, SHEET.rejected) as string;
    fails(inSheet(rejected, rejected.replace(new RegExp(pattern.source, 'gi'), 'something')), new RegExp(`does not name "${escapeRegExp(lever)}"`), `the lever ${lever} dropped`);
  }
  for (const [criterion, pattern] of CRITERIA) fails(inSheet(new RegExp(pattern.source, 'gi'), 'something'), new RegExp(`the criterion "${escapeRegExp(criterion)}"`), `the criterion ${criterion} dropped`);
  for (const [chunk, pattern] of CHUNKS) fails(inSheet(new RegExp(pattern.source, 'g'), '`chunk.js`'), new RegExp(`the build does not name the ${chunk} chunk`), `the ${chunk} chunk name dropped`);
  for (const heading of Object.values(SHEET)) fails(inSheet(new RegExp(`^${escapeRegExp(heading)}$`, 'm'), `${heading} (renamed)`), new RegExp(`${named.source}no "${escapeRegExp(heading)}" sub-section`), `${heading} renamed`);
  // The sheet's heading written twice: the second would be read past.
  fails(`${record.trimEnd()}\n\n${sheet.heading}\n\nA stray copy.\n`, new RegExp(`${named.source}the "${escapeRegExp(sheet.heading)}" heading appears more than once`), 'the heading written twice');
  return { recorded, present };
}

test('the 8.4 judgement sheet holds in both states: pending as written, recorded only when complete', () => {
  holdsBothStates(JUDGEMENT_8_4);
});

test('the 9.11 judgement sheet holds in both states, beside 8.4 rejected, at both displays', () => {
  const { recorded, present } = holdsBothStates(JUDGEMENT_9_11);
  const record = readRecord() as string;
  const sheet = JUDGEMENT_9_11;
  const section = sectionOf(record, sheet.heading) as string;
  const fails = (text: string, pattern: RegExp, why: string): void => assert.match(auditJudgement(text, sheet, () => true).join('\n'), pattern, `9.11: ${why}`);
  const inSecond = (from: RegExp, to: string, part = section): string => {
    assert.ok(from.test(part), `the 9.11 section holds ${String(from)}`);
    return record.replace(part, () => part.replace(from, () => to));
  };
  // A display dropped from The poses.
  const poses = sectionOf(section, SHEET.poses) as string;
  for (const [display, pattern] of DISPLAYS) fails(inSecond(new RegExp(pattern.source, 'g'), 'a display', poses), new RegExp(`the poses do not name the display "${escapeRegExp(display)}"`), `${display} dropped`);
  assert.deepEqual(auditJudgement(inSecond(/1920×1080/g, '1920x1080', poses), sheet, besideRecord), [], 'the display written 1920x1080, with an ASCII x, counts');
  // A recorded Displays field naming one display only; both, in their short spellings, pass.
  const setDisplays = (value: string): string => {
    const part = sectionOf(recorded, sheet.heading) as string;
    return recorded.replace(part, () => part.replace(/^(\s*- \*\*Displays:\*\*).*$/m, (_match, lead: string) => `${lead} ${value}`));
  };
  const recordedFails = (text: string, pattern: RegExp, why: string): void => assert.match(auditJudgement(text, sheet, present).join('\n'), pattern, `9.11: ${why}`);
  recordedFails(setDisplays('the Odyssey Ark only.'), /the "Displays" field does not name 1920×1080/, 'Displays naming the Ark only');
  recordedFails(setDisplays('a 1920×1080 display only.'), /the "Displays" field does not name Odyssey Ark/, 'Displays naming 1920×1080 only');
  assert.deepEqual(auditJudgement(setDisplays('a Dell at 1920x1080, DPR 1, 100% scaling; the Ark, DPR 1.'), sheet, present), [], 'both displays, in their short spellings, pass');
  assert.deepEqual(auditJudgement(setDisplays('a 1920×1080 Dell and the Odyssey ark.'), sheet, present), [], 'the Ark in lower case counts');
  // The dark ring not closed: its row loses "superseded" or "9.4".
  const ring = (sectionOf(section, SHEET.checklist) as string).split('\n').find((line) => line.trim().startsWith('|') && /the star's dark ring/i.test(cellsOf(line)[0] ?? ''));
  assert.ok(ring !== undefined, 'the checklist has the dark-ring row');
  fails(inSecond(/superseded/gi, 'kept', ring), /the dark ring is not closed as superseded by 9\.4/, 'the dark ring loses "superseded"');
  fails(inSecond(/(?<![\d.])9\.4(?!\d)/g, '9.x', ring), /the dark ring is not closed as superseded by 9\.4/, 'the dark ring loses "9.4"');
  // 8.4 rewritten: its verdict no longer starts with "Rejected".
  const first = sectionOf(record, HEADINGS.judgement) as string;
  const passed = record.replace(first, () => first.replace(/^(\s*- \*\*Verdict:\*\*) .*$/m, (_match, lead: string) => `${lead} Ships.`));
  fails(passed, /8\.4's verdict no longer reads "Rejected"/, "8.4's verdict rewritten");
  // The section misplaced: moved after Live (8.5), or before 8.4's.
  const block = `${sheet.heading}\n${section}`;
  assert.ok(record.includes(block), 'the 9.11 section is one block');
  const without = record.replace(block, '');
  fails(`${without.trimEnd()}\n\n${block}`, /the section is not after 8\.4's and before Live \(8\.5\)/, 'the section moved after Live (8.5)');
  fails(without.replace(HEADINGS.judgement, () => `${block}${HEADINGS.judgement}`), /the section is not after 8\.4's and before Live \(8\.5\)/, "the section moved before 8.4's");
  // A heading the order is read against, missing: the place cannot be shown, so it fails.
  for (const heading of [HEADINGS.judgement, HEADINGS.live]) {
    fails(record.replace(new RegExp(`^${escapeRegExp(heading)}$`, 'm'), () => `${heading} (renamed)`), /the section is not after 8\.4's and before Live \(8\.5\)/, `${heading} missing`);
  }
  // 8.4's section stands as written beside it: both sheets audit clean on the record.
  assert.deepEqual(auditJudgement(record, JUDGEMENT_8_4, besideRecord), [], "8.4's sheet is untouched by 9.11's");
});
