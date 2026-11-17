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
 * Plus the two sections 8.4 and 8.5 fill, with no verdict recorded.
 *
 * The instrument (`worst-window.ts`, `chart-offer.ts`) is read as text, never
 * imported: `chart-offer.test.ts` closes its importer table and the scene audits
 * scan the worst-window files' importers. The budgets are imported, since
 * `scripts/` is one of the two places that may reach them (`check-maps.test.ts`).
 * Each check is driven red by a mutation of the record text, in memory.
 */

import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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

function auditLater(record: string): string[] {
  const failures: string[] = [];
  const judgement = sectionOf(record, HEADINGS.judgement);
  if (judgement === undefined) failures.push(`8.4: no "${HEADINGS.judgement}" section`);
  else {
    const prose = flat(judgement);
    if (!/no verdict has been recorded/i.test(prose)) failures.push('8.4: it does not say no verdict has been recorded');
    if (!/not the target profile/i.test(prose)) failures.push('8.4: it does not say the machine is not the target profile');
  }
  const live = sectionOf(record, HEADINGS.live);
  if (live === undefined) failures.push(`8.5: no "${HEADINGS.live}" section`);
  else if (!/not yet passed/i.test(flat(live))) failures.push('8.5: it does not say the status stays "not yet passed"');
  return failures;
}

function auditRecord(record: string | undefined, measured: Instrument): string[] {
  if (record === undefined) return [`the record is missing: ${RECORD_PATH}`];
  return [...auditStatus(record), ...auditRun(record), ...auditBudgets(record), ...auditProtocol(record, measured), ...auditNeverRun(record), ...auditLater(record)];
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
  // 8.4 and 8.5
  fails(record.replace(/no verdict has been recorded/i, 'a verdict was recorded'), /8\.4: it does not say no verdict/, 'a recorded verdict');
  fails(swap(HEADINGS.live, '## Live'), /8\.5: no/, 'the 8.5 section');
  // Each section heading lost fails its own check.
  // The whole heading line is replaced, so an earlier substring of it cannot take the mutation instead.
  for (const [key, heading] of Object.entries(HEADINGS)) {
    const failures = auditRecord(swap(new RegExp(`^${escapeRegExp(heading)}$`, 'm'), `${heading} (renamed)`), measured);
    assert.ok(failures.some((failure) => failure.includes(`no "${heading}" section`)), `the ${key} heading renamed fails: ${failures.join('; ')}`);
  }
});
