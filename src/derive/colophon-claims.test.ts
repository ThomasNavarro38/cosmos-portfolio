/**
 * The Colophon's re-ruled claims about where the layout and the shots come
 * from (Epic 5 item 40, AV-3 (b) and (c), ruling 2026-10-29, re-ruled the same
 * day), each held by the relation it asserts rather than by a count of words:
 *
 * - `ABSENCES.thesis`, "Of the two files above, only career.json is authored:
 *   layout.generated.json is solved from it and from the map list below, shots
 *   included." (re-ruled 2026-11-16, story 8.2, Q2 (a)) — the committed
 *   `layout.generated.json` is `solveLive(career.json)` byte for byte, and that
 *   solve carries the shots; the committed shots are `buildShots` of the entity
 *   graph `career.json` derives to; and `career.json` holds no `shots` key at
 *   any depth and no object carrying two or more of a shot's fields
 *   (`subject`, `angle`, `distance`, `framing`: a shot record). "The two
 *   files above" is `absences.test.ts`'s (the `EXHIBIT_PATHS` count). "and
 *   from the map list below": every Planet's `appearance.map` in the committed
 *   layout is the id of a `MAP_LIBRARY` entry, and its `meanLuminance` is that
 *   entry's — the library the Colophon lists below the absences
 *   (`src/colophon/colophon.test.ts` holds that the list drawn is
 *   `MAP_LIBRARY`, entry for entry). A layout with no appearance to read fails.
 * - `ABSENCES.positions`, "… every position in layout.generated.json is
 *   computed by the solver from career.json, never written by hand." — the same
 *   byte equality: every position in the committed file is the solve's.
 *
 * Each relation is driven red by an edit that falsifies it. An edit to
 * `career.json` is made to its text directly, never by re-serialising it, and
 * each edit is asserted to have changed the text. The solve's `sourceDigest`
 * line changes with any edit to the text, so a falsification must differ from
 * the committed layout at some other line; a whitespace-only control shows
 * that reformatting alone moves nothing but that line. The sentences are read
 * here as text off `src/colophon/absences.ts` (`src/derive/` never imports the
 * Colophon), so a reworded sentence fails here until its relation is
 * re-ruled.
 *
 * Here rather than beside `absences.test.ts`: a Colophon module reaches
 * `src/derive/` only through the one dynamic import in `colophon.tsx`, and
 * never `src/data/`, whose schema the entity graph is derived through.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CareerSchema } from '../data/schema.ts';
import { STAR_TINTS, starAppearanceOf } from './appearance.ts';
import { deriveEntities } from './entities.ts';
import { solveLive } from './live.ts';
import { MAP_LIBRARY, type MapEntry } from './map-library.ts';
import { buildShots } from './shots.ts';

const CAREER_TEXT = readFileSync(new URL('../data/career.json', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const COMMITTED = readFileSync(new URL('../../generated/layout.generated.json', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const ABSENCES_SOURCE = readFileSync(new URL('../colophon/absences.ts', import.meta.url), 'utf8');

const THESIS = 'Of the two files above, only career.json is authored: layout.generated.json is solved from it and from the map list below, shots included.';
const POSITIONS = 'There are no position overrides. career.json holds no coordinate, and no entry can pin its own place: every position in layout.generated.json is computed by the solver from career.json, never written by hand.';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
interface Layout {
  readonly shots?: Json;
}

/** The 1-based numbers of the lines on which two texts differ, a missing line counting as a difference. */
function differingLines(a: string, b: string): number[] {
  const left = a.split('\n');
  const right = b.split('\n');
  const lines: number[] = [];
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) if (left[index] !== right[index]) lines.push(index + 1);
  return lines;
}

/** The line of the committed layout that records the digest of the text it was solved from. */
const DIGEST_LINE = COMMITTED.split('\n').findIndex((line) => /^\s*"sourceDigest": /.test(line)) + 1;

/** "layout.generated.json is solved from it": the committed text is the solve of `career.json`, byte for byte; else the first line that differs. */
function solvedClaim(committed: string, solved: string): string[] {
  const lines = differingLines(committed, solved);
  if (lines.length === 0) return [];
  const line = lines[0] as number;
  return [`layout.generated.json differs from the solve of career.json at line ${line}: ${JSON.stringify(committed.split('\n')[line - 1] ?? '')} against ${JSON.stringify(solved.split('\n')[line - 1] ?? '')}`];
}

/** "shots included": the solve carries a non-empty list of shots. */
function shotsIncludedClaim(solved: string): string[] {
  const shots = (JSON.parse(solved) as Layout).shots;
  return Array.isArray(shots) && shots.length > 0 ? [] : ['the solve of career.json carries no shots'];
}

/** The committed shots are `buildShots` of the graph `career.json` derives to, in order and field for field. */
function shotsDerivedClaim(layout: Layout, derived: Json): string[] {
  if (!Array.isArray(layout.shots)) return ['the layout’s shots are missing or not an array'];
  const ours = layout.shots;
  const theirs = derived as Json[];
  const failures: string[] = [];
  if (ours.length !== theirs.length) failures.push(`the layout holds ${ours.length} shots; career.json derives ${theirs.length}`);
  ours.forEach((shot, index) => {
    if (JSON.stringify(shot) !== JSON.stringify(theirs[index])) failures.push(`shots[${index}] is ${JSON.stringify(shot)}, not the derived ${JSON.stringify(theirs[index] ?? null)}`);
  });
  return failures;
}

/** A Planet's appearance as the committed layout writes it: the two fields the library supplies. */
interface Appearance {
  readonly map?: Json;
  readonly meanLuminance?: Json;
}
type AppearanceLayout = { readonly clients?: readonly { readonly projects?: readonly { readonly id?: Json; readonly appearance?: Appearance }[] }[] };

/**
 * "and from the map list below": every Planet's `appearance.map` is a library
 * entry's id and its `meanLuminance` that entry's; at least one Planet carries
 * an appearance, so the check is never vacuous.
 */
function libraryClaim(layout: AppearanceLayout, library: readonly MapEntry[]): string[] {
  const byId = new Map(library.map((entry) => [entry.id, entry]));
  const projects = (layout.clients ?? []).flatMap((client) => client.projects ?? []);
  const failures: string[] = [];
  let read = 0;
  for (const project of projects) {
    const appearance = project.appearance;
    if (appearance === undefined) {
      failures.push(`${JSON.stringify(project.id ?? null)} carries no appearance`);
      continue;
    }
    read += 1;
    const entry = typeof appearance.map === 'string' ? byId.get(appearance.map) : undefined;
    if (entry === undefined) failures.push(`${JSON.stringify(project.id ?? null)} wears ${JSON.stringify(appearance.map ?? null)}, which is not on the map list`);
    else if (appearance.meanLuminance !== entry.meanLuminance) failures.push(`${JSON.stringify(project.id ?? null)} records meanLuminance ${JSON.stringify(appearance.meanLuminance ?? null)}, not ${entry.id}'s ${entry.meanLuminance}`);
  }
  if (read === 0) failures.push('the layout carries no appearance to hold to the map list');
  return failures;
}

/** A shot's own fields: an object carrying two or more of them is a shot record. */
const SHOT_FIELDS = ['subject', 'angle', 'distance', 'framing'] as const;

/** "only career.json is authored", the shots included: no `shots` key at any depth, and no object carrying two or more of a shot's fields. */
function shotsAbsentClaim(value: Json, path = 'career.json'): string[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => shotsAbsentClaim(item, `${path}[${index}]`));
  if (value === null || typeof value !== 'object') return [];
  const failures: string[] = [];
  const fields = SHOT_FIELDS.filter((field) => field in value);
  if (fields.length >= 2) failures.push(`${path} is a shot record (${fields.join(', ')})`);
  for (const [key, item] of Object.entries(value)) {
    if (key === 'shots') failures.push(`${path}.shots is a shots key`);
    failures.push(...shotsAbsentClaim(item, `${path}.${key}`));
  }
  return failures;
}

const derivedShots = (careerText: string): Json => {
  const career = CareerSchema.parse(JSON.parse(careerText));
  return buildShots(deriveEntities(career, { asOf: career.asOf })) as unknown as Json;
};

/** `CAREER_TEXT` with `from` replaced by `to` (every occurrence when `all`), asserted to have changed. */
function editedCareer(name: string, from: string | RegExp, to: string, all = false): string {
  const edited = typeof from === 'string' ? (all ? CAREER_TEXT.replaceAll(from, to) : CAREER_TEXT.replace(from, to)) : CAREER_TEXT.replace(from, to);
  assert.notEqual(edited, CAREER_TEXT, `the edit "${name}" must change career.json's text`);
  return edited;
}

/**
 * The anchors the falsifying edits are made at, read off the shipped
 * `career.json` itself rather than written here, so a routine data edit moves
 * them with it: its `asOf`, and the first entry's `start`, Client and
 * `team_size`, each as the file spells it.
 */
const CAREER = JSON.parse(CAREER_TEXT) as { asOf: string; projects: { client: string; team_size: number; duration: { start: string } }[] };
const FIRST = CAREER.projects[0] as (typeof CAREER.projects)[number];
const ANCHOR = {
  asOf: `"asOf": ${JSON.stringify(CAREER.asOf)},`,
  start: `"start": ${JSON.stringify(FIRST.duration.start)}`,
  client: `"client": ${JSON.stringify(FIRST.client)}`,
  teamSize: `"team_size": ${JSON.stringify(FIRST.team_size)},`,
};
/** The first entry's start a year earlier, as `YYYY-MM`. */
const EARLIER_START = `"start": ${JSON.stringify(FIRST.duration.start.replace(/^(\d{4})/, (year) => String(Number(year) - 1)))}`;
/** The first entry's Client, renamed. */
const RENAMED_CLIENT = `"client": ${JSON.stringify(`${FIRST.client} renamed`)}`;

// --- The sentences these relations hold ----------------------------------------------------------------

test('the thesis and the positions paragraph are the ruled sentences these relations hold', () => {
  assert.ok(ABSENCES_SOURCE.includes(`thesis: '${THESIS}'`), 'ABSENCES.thesis is the ruled thesis');
  assert.ok(ABSENCES_SOURCE.includes(`positions: '${POSITIONS}'`), 'ABSENCES.positions is the ruled paragraph');
});

// --- Against the shipped files -------------------------------------------------------------------------

test('"layout.generated.json is solved from it" and "every position … computed by the solver": the committed layout is solveLive(career.json), byte for byte', async () => {
  assert.ok(DIGEST_LINE > 0, 'the committed layout records its source digest');
  assert.deepEqual(solvedClaim(COMMITTED, await solveLive(CAREER_TEXT)), []);
});

test('"shots included": the solve of career.json carries the shots, and they are buildShots of its entity graph', async () => {
  assert.deepEqual(shotsIncludedClaim(await solveLive(CAREER_TEXT)), []);
  assert.deepEqual(shotsDerivedClaim(JSON.parse(COMMITTED) as Layout, derivedShots(CAREER_TEXT)), []);
});

test('"and from the map list below": every Planet’s map is a library id, and its mean luminance the library’s', () => {
  assert.deepEqual(libraryClaim(JSON.parse(COMMITTED) as AppearanceLayout, MAP_LIBRARY), []);
});

test('"only career.json is authored": career.json holds no shots key and no shot record', () => {
  assert.deepEqual(shotsAbsentClaim(JSON.parse(CAREER_TEXT) as Json), []);
});

// --- Each relation falsified ---------------------------------------------------------------------------

test('the falsification anchors are read off career.json and found in its text', () => {
  for (const [name, anchor] of Object.entries(ANCHOR)) assert.ok(CAREER_TEXT.includes(anchor), `the ${name} anchor ${anchor} is in career.json's text`);
  assert.notEqual(EARLIER_START, ANCHOR.start, 'the earlier start differs');
});

test('the control: career.json reformatted alone solves to the committed layout but for its digest line', async () => {
  assert.ok(DIGEST_LINE > 0, 'the committed layout records its source digest');
  const reformatted = editedCareer('a trailing space', /\n$/, ' \n');
  assert.deepEqual(differingLines(COMMITTED, await solveLive(reformatted)), [DIGEST_LINE]);
});

test('a layout edited by hand, or a career.json the committed layout was not solved from, falsifies "solved from it"', async () => {
  const solved = await solveLive(CAREER_TEXT);
  const edited = COMMITTED.replace(/("mass": )(\d)/, (_, key: string, digit: string) => `${key}${(Number(digit) + 1) % 10}`);
  assert.notEqual(edited, COMMITTED, 'the hand edit applies');
  assert.match(solvedClaim(edited, solved).join('\n'), /differs from the solve of career\.json at line \d+/);
  assert.ok(DIGEST_LINE > 0, 'the committed layout records its source digest');
  for (const [name, from, to, all] of [
    ['a start moved', ANCHOR.start, EARLIER_START, false],
    ['a Client renamed', ANCHOR.client, RENAMED_CLIENT, true],
  ] as const) {
    const other = await solveLive(editedCareer(name, from, to, all));
    assert.notDeepEqual(solvedClaim(COMMITTED, other), [], `"${name}" must be rejected`);
    assert.ok(differingLines(COMMITTED, other).some((line) => line !== DIGEST_LINE), `"${name}" must change the solve beyond its digest`);
  }
});

test('a shot reframed, dropped or added by hand, or derived from another career, falsifies "shots included"', async () => {
  const derived = derivedShots(CAREER_TEXT);
  const edits: readonly (readonly [string, (shots: { [key: string]: Json }[]) => void])[] = [
    ['a distance nudged', (shots) => ((shots[0] as { distance: number }).distance += 1)],
    ['an angle authored', (shots) => ((shots[1] as { angle: number }).angle = 0.25)],
    ['a shot dropped', (shots) => void shots.pop()],
    ['a shot for a Project', (shots) => void shots.push({ ...(shots[0] as { [key: string]: Json }), subject: 'project:hand-placed' })],
    ['two shots swapped', (shots) => void shots.splice(0, 2, shots[1] as { [key: string]: Json }, shots[0] as { [key: string]: Json })],
  ];
  for (const [name, edit] of edits) {
    const layout = JSON.parse(COMMITTED) as { shots: { [key: string]: Json }[] };
    edit(layout.shots);
    assert.notDeepEqual(shotsDerivedClaim(layout, derived), [], `"${name}" must be rejected`);
  }
  // The derivation itself is what is compared: a Client renamed in career.json's text derives another subject.
  assert.notDeepEqual(shotsDerivedClaim(JSON.parse(COMMITTED) as Layout, derivedShots(editedCareer('a Client renamed', ANCHOR.client, RENAMED_CLIENT, true))), [], 'shots derived from another career are not these');
  // And a solve without shots is caught.
  const solved = JSON.parse(await solveLive(CAREER_TEXT)) as { [key: string]: Json };
  assert.notDeepEqual(shotsIncludedClaim(JSON.stringify({ ...solved, shots: [] })), [], 'an empty shot list');
  const { shots: _dropped, ...withoutShots } = solved;
  assert.notDeepEqual(shotsIncludedClaim(JSON.stringify(withoutShots)), [], 'no shots key');
});

test('a shot written into career.json’s text falsifies "only career.json is authored"', () => {
  const top = ANCHOR.asOf;
  const entry = ANCHOR.teamSize;
  for (const [name, from, to] of [
    ['a shots list', top, `${top}\n  "shots": [],`],
    ['a shot record on an entry', entry, `${entry}\n      "notable": { "subject": "client:simsu", "angle": 0.5 },`],
    ['a shot record, nested in a list', entry, `${entry}\n      "extras": [{ "deep": { "subject": "x", "angle": 0 } }],`],
    ['a distance and a framing', entry, `${entry}\n      "notable": { "distance": 15, "framing": "frame-system" },`],
    ['a subject and a distance', entry, `${entry}\n      "notable": { "subject": "client:simsu", "distance": 15 },`],
    ['an angle and a framing, nested', entry, `${entry}\n      "extras": [{ "deep": { "angle": 0.5, "framing": "wide" } }],`],
    ['a shots key, nested', entry, `${entry}\n      "camera": { "shots": null },`],
  ] as const) {
    const doc = JSON.parse(editedCareer(name, from, to)) as Json;
    assert.notDeepEqual(shotsAbsentClaim(doc), [], `"${name}" must be rejected`);
  }
  // One shot field alone is not a shot record: a subject, or a distance, is an ordinary word.
  assert.deepEqual(shotsAbsentClaim(JSON.parse(editedCareer('a subject alone', entry, `${entry}\n      "notable": { "subject": "maths" },`)) as Json), []);
  assert.deepEqual(shotsAbsentClaim(JSON.parse(editedCareer('a distance alone', entry, `${entry}\n      "notable": { "distance": 3 },`)) as Json), []);
});

test('a map off the list, a luminance not the library’s, or nothing to read falsifies "and from the map list below"', () => {
  const committed = (): { clients: { projects: { id: string; appearance?: { map: Json; meanLuminance: Json } }[] }[] } => JSON.parse(COMMITTED) as never;
  const first = (layout: ReturnType<typeof committed>) => {
    const project = layout.clients[0]?.projects[0];
    assert.ok(project?.appearance !== undefined, 'the committed layout’s first Project carries an appearance');
    return project as { id: string; appearance: { map: Json; meanLuminance: Json } };
  };
  const edits: readonly (readonly [string, (layout: ReturnType<typeof committed>) => void])[] = [
    ['a map off the list', (layout) => (first(layout).appearance.map = 'europa')],
    ['a map named by its file', (layout) => (first(layout).appearance.map = `${String(first(layout).appearance.map)}.webp`)],
    ['a luminance nudged', (layout) => (first(layout).appearance.meanLuminance = Number(first(layout).appearance.meanLuminance) + 0.001)],
    ['an appearance dropped', (layout) => delete (first(layout) as { appearance?: unknown }).appearance],
    ['no appearance anywhere', (layout) => layout.clients.forEach((client) => client.projects.forEach((project) => delete project.appearance))],
  ];
  for (const [name, edit] of edits) {
    const layout = committed();
    edit(layout);
    assert.notDeepEqual(libraryClaim(layout as AppearanceLayout, MAP_LIBRARY), [], `"${name}" must be rejected`);
  }
  // The library is what is compared: a list without a worn map, or with its luminance re-measured, falsifies it too.
  const worn = String(first(committed()).appearance.map);
  assert.notDeepEqual(libraryClaim(JSON.parse(COMMITTED) as AppearanceLayout, MAP_LIBRARY.filter((entry) => entry.id !== worn)), [], 'a worn map dropped from the list');
  assert.notDeepEqual(libraryClaim(JSON.parse(COMMITTED) as AppearanceLayout, MAP_LIBRARY.map((entry) => (entry.id === worn ? { ...entry, meanLuminance: entry.meanLuminance + 0.01 } : entry))), [], 'a worn map re-measured');
  assert.match(libraryClaim({ clients: [] }, MAP_LIBRARY).join('\n'), /carries no appearance to hold/, 'an empty layout has nothing to measure');
});

test('a reworded thesis or positions paragraph is caught here, before its relation is re-ruled', () => {
  for (const [name, source] of [
    ['the old thesis', ABSENCES_SOURCE.replace(THESIS, 'The layout is never authored; the camera is.')],
    ['the thesis before the map list', ABSENCES_SOURCE.replace(THESIS, 'Of the two files above, only career.json is authored: layout.generated.json is solved from it, shots included.')],
    ['the first re-ruled thesis', ABSENCES_SOURCE.replace(THESIS, 'Only career.json is authored: the layout is solved from it, and the shots are derived from it.')],
    ['the old positions paragraph', ABSENCES_SOURCE.replace(POSITIONS, POSITIONS.replace('computed by the solver from career.json, never written by hand', 'solved from the three rules above'))],
  ] as const) {
    assert.notEqual(source, ABSENCES_SOURCE, `the rewording "${name}" must apply`);
    assert.ok(!(source.includes(`thesis: '${THESIS}'`) && source.includes(`positions: '${POSITIONS}'`)), `"${name}" must be caught`);
  }
});

// --- What a Star and a Planet look like (9.5, Proposal 7) ----------------------------------------------

/*
 * `APPEARANCE.statement` (`src/colophon/credits.ts`, read as text: `src/derive/` never
 * imports the Colophon) claims two things this directory can hold: "each Star one of
 * five colours", against `STAR_TINTS.length`, and "from its ID alone", against
 * `starAppearanceOf` taking an ID and nothing else, with no state, and the committed
 * layout holding exactly its re-derivation.
 */
const CREDITS_SOURCE = readFileSync(new URL('../colophon/credits.ts', import.meta.url), 'utf8');
const STATEMENT =
  "A Body's colour is not data. Each Planet is assigned one of the maps below, and each Star one of five colours, from its ID alone, by a fixed rule in the solver, so colour and texture encode nothing: recency is how brightly a Star shines and a Planet's rim glows, the subject is the one that turns white, and Deep or Shallow is the ring and the moon.";

/** The number words a palette count may be written in. */
const NUMBER_WORDS: Readonly<Record<string, number>> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/** "each Star one of five colours": the count the statement writes is the palette's length. */
function paletteClaim(statement: string, tints: readonly string[]): string[] {
  const word = /each Star one of (\w+) colours/.exec(statement)?.[1];
  if (word === undefined) return ['the statement names no count of Star colours'];
  const count = NUMBER_WORDS[word];
  if (count === undefined) return [`the statement's count "${word}" is not a number word`];
  return count === tints.length ? [] : [`the statement says ${word} colours; STAR_TINTS holds ${tints.length}`];
}

type StarLook = (id: string) => object;
type StarLayout = { readonly clients?: readonly { readonly id?: Json; readonly appearance?: Json }[] };

/** "from its ID alone": the assignment takes one argument, keeps no state, and the committed layout is its re-derivation. */
function idAloneClaim(look: StarLook, layout: StarLayout): string[] {
  const failures: string[] = [];
  if (look.length !== 1) failures.push(`starAppearanceOf takes ${look.length} parameters, not the ID alone`);
  const ids = ['client:a', 'client:b', 'client:a'];
  const first = ids.map((id) => JSON.stringify(look(id)));
  const again = ids.map((id) => JSON.stringify(look(id)));
  if (first[0] !== first[2] || first.join() !== again.join()) failures.push('starAppearanceOf gives one ID two appearances: it keeps state');
  const clients = layout.clients ?? [];
  if (clients.length === 0) failures.push('the layout has no Star to hold');
  for (const client of clients) {
    if (JSON.stringify(client.appearance) !== JSON.stringify(look(String(client.id)))) failures.push(`${JSON.stringify(client.id ?? null)} carries an appearance its ID does not derive`);
  }
  return failures;
}

test('the statement is Proposal 7’s, verbatim, in credits.ts', () => {
  assert.ok(CREDITS_SOURCE.includes(`statement: "${STATEMENT}"`), 'APPEARANCE.statement is the ruled statement');
});

test('"each Star one of five colours": the count is STAR_TINTS.length', () => {
  assert.deepEqual(paletteClaim(STATEMENT, STAR_TINTS), []);
});

test('"from its ID alone": starAppearanceOf takes the ID alone, keeps no state, and every committed Star is its re-derivation', () => {
  assert.deepEqual(idAloneClaim(starAppearanceOf, JSON.parse(COMMITTED) as StarLayout), []);
});

test('a palette of four, a reworded count or no count falsifies "each Star one of five colours"', () => {
  assert.match(paletteClaim(STATEMENT, STAR_TINTS.slice(0, 4)).join('\n'), /says five colours; STAR_TINTS holds 4/, 'a palette of 4');
  assert.match(paletteClaim(STATEMENT, [...STAR_TINTS, 'green']).join('\n'), /holds 6/, 'a palette of 6');
  assert.match(paletteClaim(STATEMENT.replace('one of five colours', 'one of four colours'), STAR_TINTS).join('\n'), /says four colours/, 'a statement saying four');
  assert.match(paletteClaim(STATEMENT.replace('one of five colours', 'one of 5 colours'), STAR_TINTS).join('\n'), /not a number word/, 'a numeral');
  assert.match(paletteClaim(STATEMENT.replace('and each Star one of five colours, ', ''), STAR_TINTS).join('\n'), /names no count/, 'no count');
});

test('a second parameter, a kept state or a hand-edited Star falsifies "from its ID alone"', () => {
  const layout = (): { clients: { id: string; appearance: { tint: string; pulsePhase: number } }[] } => JSON.parse(COMMITTED) as never;
  const twoArgs = (id: string, salt?: string): object => ({ ...starAppearanceOf(id), salt });
  assert.match(idAloneClaim(twoArgs as StarLook, layout()).join('\n'), /takes 2 parameters/);
  let calls = 0;
  const stateful: StarLook = (id) => ({ ...starAppearanceOf(id), pulsePhase: (calls += 1) });
  assert.match(idAloneClaim(stateful, layout()).join('\n'), /keeps state/);
  const edited = layout();
  const first = edited.clients[0] as (typeof edited.clients)[number];
  first.appearance.tint = STAR_TINTS.find((tint) => tint !== first.appearance.tint) as string;
  assert.match(idAloneClaim(starAppearanceOf, edited).join('\n'), /does not derive/);
  assert.match(idAloneClaim(starAppearanceOf, { clients: [] }).join('\n'), /no Star to hold/);
});
