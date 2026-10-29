/**
 * `absences.ts` (5.4): each claim the Colophon's "what is not there" makes is
 * held against the shipped files — `src/data/career.json` and
 * `generated/layout.generated.json`, read as files, as the build publishes
 * them — so a claim the files falsify turns a test red; the copy is never
 * reworded to pass.
 *
 * - the file names the copy writes are `EXHIBIT_PATHS`' names, both of them,
 *   and "the two files above" (the data paragraph's, and the thesis's "Of the
 *   two files above") is the number of `EXHIBIT_PATHS` entries;
 * - each `EXHIBIT_PATHS` value is a root-relative, same-origin path ("fetched
 *   both from this site as static files");
 * - `career.json` holds no position, coordinate or camera key at any depth;
 * - every `shots[]` entry's keys are exactly `subject, angle, distance,
 *   framing` (in any order), a string subject, finite angle and distance and a
 *   string framing;
 * - every shot's subject is a `clients[].id`, no `projects[].id` is one, and
 *   every Client with a Project has exactly one shot;
 * - every Client and every Project has a `position` of finite `x`, `y`, `z`.
 *
 * Each check is driven red by an alteration that falsifies it. And a source
 * audit: the module imports nothing.
 *
 * The thesis's and the positions paragraph's claims about where the layout and
 * the shots come from (re-ruled 2026-10-29, Epic 5 item 40) are relations to
 * the solver and to `buildShots`, which a Colophon module may not import: they
 * are held in `src/derive/colophon-claims.test.ts` — the committed layout is
 * `solveLive(career.json)` byte for byte, every position is the solve's, and
 * the shots are `buildShots` of career's entity graph and appear nowhere in
 * `career.json`. The copy no longer states a count of rules, and none is
 * admitted.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { ABSENCES, ABSENCES_HEADING } from './absences.ts';
import { EXHIBIT_PATHS } from './exhibits.ts';

const CAREER = readFileSync(new URL('../data/career.json', import.meta.url), 'utf8');
const LAYOUT = readFileSync(new URL('../../generated/layout.generated.json', import.meta.url), 'utf8');
const SOURCE = readFileSync(new URL('./absences.ts', import.meta.url), 'utf8');

const COPY: readonly string[] = Object.values(ABSENCES);
const PATHS: readonly string[] = Object.values(EXHIBIT_PATHS);
const NAMES: readonly string[] = [EXHIBIT_PATHS.career.slice(1), EXHIBIT_PATHS.layout.slice(1)];

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
interface Shot {
  [key: string]: Json;
}
interface Layout {
  clients: { id: string; position?: Json; projects: { id: string; position?: Json }[] }[];
  shots?: Json;
}

const career = (): { [key: string]: Json } => JSON.parse(CAREER) as { [key: string]: Json };
const layout = (): Layout => JSON.parse(LAYOUT) as Layout;
const shotsOf = (doc: Layout): Shot[] => doc.shots as Shot[];

// --- The claims, each a function of the copy and the files ------------------------------------------

/** "career.json … layout.generated.json": every `*.json` the copy names is a published file's name, and it names both. */
function namesClaim(copy: readonly string[], names: readonly string[]): string[] {
  const named = new Set(copy.flatMap((paragraph) => [...paragraph.matchAll(/[\w.-]+\.json\b/g)].map((match) => match[0])));
  const failures: string[] = [];
  for (const name of named) if (!names.includes(name)) failures.push(`the copy names ${name}, which is not a published file`);
  for (const name of names) if (!named.has(name)) failures.push(`the copy does not name ${name}`);
  return failures;
}

const NUMBER_WORDS: Readonly<Record<string, number>> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/** A count as the copy writes it — a number word, any case, or digits — or undefined when it cannot be read. */
const countOf = (word: string): number | undefined => (/^\d+$/.test(word) ? Number(word) : NUMBER_WORDS[word.toLowerCase()]);

/**
 * A count the copy states, held to `actual`: every match of `pattern` (its
 * first group the count) reads as `actual`, and there is at least one.
 */
function countClaim(copy: readonly string[], pattern: RegExp, what: string, actual: number): string[] {
  const words = copy.flatMap((paragraph) => [...paragraph.matchAll(pattern)].map((match) => match[1] as string));
  if (words.length === 0) return [`the copy states no count of ${what}`];
  return words.flatMap((word) => {
    const count = countOf(word);
    if (count === undefined) return [`the copy states an unreadable count of ${what}: ${JSON.stringify(word)}`];
    return count === actual ? [] : [`the copy states ${count} ${what}; there are ${actual}`];
  });
}

/** "The two files above": the count the copy writes is the number of exhibited files. */
const filesClaim = (copy: readonly string[], files: number): string[] => countClaim(copy, /\bthe (\w+) files above\b/gi, 'files', files);

/** "This page fetched both from this site as static files": each path is root-relative — `/`, never `//`, no scheme. */
function pathsClaim(paths: readonly string[]): string[] {
  return paths.filter((path) => !path.startsWith('/') || path.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(path)).map((path) => `${path} is not a root-relative, same-origin path`);
}

/** A key that would place an entry or move the camera, matched by substring, any case. */
const PLACING_PART = /position|coord|location|latitude|longitude|rotation|azimuth|elevation|fov|zoom|transform|radius|orbit|camera|shot|angle|framing|override|lookat/i;
/** Placing keys short enough that a substring would catch real words: matched whole, any case. */
const PLACING_EXACT = /^(?:x|y|z|lat|lng)$/i;
const isPlacingKey = (key: string): boolean => PLACING_PART.test(key) || PLACING_EXACT.test(key);

/** "career.json holds no coordinate … no per-entry camera work": no placing key, at any depth. */
function careerClaim(value: Json, path = 'career.json'): string[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => careerClaim(item, `${path}[${index}]`));
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, item]) => [
    ...(isPlacingKey(key) ? [`${path}.${key} is a position, coordinate or camera key`] : []),
    ...careerClaim(item, `${path}.${key}`),
  ]);
}

const SHOT_KEYS = ['angle', 'distance', 'framing', 'subject'];
const isFinite = (value: Json | undefined): boolean => typeof value === 'number' && Number.isFinite(value);

/** The layout's shots, or a named failure when it has none to read. */
function readShots(doc: Layout): { readonly shots: Shot[] } | { readonly failure: string } {
  if (!Array.isArray(doc.shots)) return { failure: 'the layout’s shots are missing or not an array' };
  return { shots: doc.shots as Shot[] };
}

/** "Shots name entities, never coordinates … a subject, an angle and a distance": each shot's keys, exactly, and their types. */
function shotKeysClaim(doc: Layout): string[] {
  const read = readShots(doc);
  if ('failure' in read) return [read.failure];
  if (read.shots.length === 0) return ['the layout holds no shots'];
  return read.shots.flatMap((shot, index) => {
    if (shot === null || typeof shot !== 'object' || Array.isArray(shot)) return [`shots[${index}] is not an object`];
    const failures: string[] = [];
    const keys = Object.keys(shot).sort();
    if (JSON.stringify(keys) !== JSON.stringify(SHOT_KEYS)) failures.push(`shots[${index}] carries ${JSON.stringify(keys)}`);
    if (typeof shot['subject'] !== 'string') failures.push(`shots[${index}].subject is not a string`);
    if (!isFinite(shot['angle'])) failures.push(`shots[${index}].angle is not a finite number`);
    if (!isFinite(shot['distance'])) failures.push(`shots[${index}].distance is not a finite number`);
    if (typeof shot['framing'] !== 'string') failures.push(`shots[${index}].framing is not a string`);
    return failures;
  });
}

/**
 * "Every shot’s subject is a Client; a Project is framed at its Client’s
 * stop": subjects are Client ids, never Project ids, and every Client with a
 * Project has exactly one shot.
 */
function subjectsClaim(doc: Layout): string[] {
  const read = readShots(doc);
  if ('failure' in read) return [read.failure];
  const clients = new Set(doc.clients.map((client) => client.id));
  const projects = new Set(doc.clients.flatMap((client) => client.projects.map((project) => project.id)));
  const failures = read.shots.flatMap((shot, index) => {
    const subject = shot['subject'];
    if (typeof subject === 'string' && projects.has(subject)) return [`shots[${index}]'s subject ${subject} is a Project`];
    if (typeof subject !== 'string' || !clients.has(subject)) return [`shots[${index}]'s subject ${JSON.stringify(subject)} is not a Client`];
    return [];
  });
  for (const client of doc.clients) {
    if (client.projects.length === 0) continue;
    const count = read.shots.filter((shot) => shot['subject'] === client.id).length;
    if (count !== 1) failures.push(`${client.id} has ${count} shots, not one`);
  }
  return failures;
}

/** A solved position, as the artifact writes it: an object of finite `x`, `y` and `z`. */
const isPosition = (value: Json | undefined): boolean =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && isFinite(value['x']) && isFinite(value['y']) && isFinite(value['z']);

/** "every position in layout.generated.json is solved": every Client and Project carries one. */
function positionsClaim(doc: Layout): string[] {
  const failures: string[] = [];
  if (doc.clients.length === 0) failures.push('the layout holds no Clients');
  doc.clients.forEach((client, index) => {
    if (!isPosition(client.position)) failures.push(`clients[${index}] has no solved position`);
    client.projects.forEach((project, at) => {
      if (!isPosition(project.position)) failures.push(`clients[${index}].projects[${at}] has no solved position`);
    });
  });
  return failures;
}

// --- Against the shipped files ----------------------------------------------------------------------

test('the copy, verbatim and in order (ruling Q1 (a)), its apostrophes typographic', () => {
  assert.equal(ABSENCES_HEADING, 'what is not there');
  assert.deepEqual(Object.keys(ABSENCES), ['thesis', 'data', 'positions', 'shots', 'camera']);
  assert.ok(![ABSENCES_HEADING, ...COPY].some((text) => text.includes("'")), 'no straight apostrophe, the heading included');
  assert.ok(ABSENCES.camera.includes('’'), 'the camera paragraph carries the typographic ’');
});

test('the file names the copy writes are the published files’ names', () => {
  assert.deepEqual(NAMES, ['career.json', 'layout.generated.json']);
  assert.deepEqual(namesClaim(COPY, NAMES), []);
});

test('"The two files above" is the number of exhibited files', () => {
  assert.deepEqual(filesClaim(COPY, PATHS.length), []);
});

test('the thesis’s "Of the two files above" is the number of exhibited files', () => {
  assert.ok(ABSENCES.thesis.startsWith('Of the two files above, '), 'the thesis is scoped to the files on the page');
  assert.deepEqual(filesClaim([ABSENCES.thesis], PATHS.length), []);
});

test('each exhibited file is fetched from this site: a root-relative, same-origin path', () => {
  assert.deepEqual(pathsClaim(PATHS), []);
});

/** "No count of rules": no paragraph writes "<word> rules" or "<word> mapping rules", anywhere in it. */
const rulesClaim = (copy: readonly string[]): string[] =>
  copy.flatMap((paragraph) => [...paragraph.matchAll(/\b[\w’'-]+ (?:mapping )?rules\b/gi)].map((match) => `the copy states a count of rules: ${JSON.stringify(match[0])}`));

test('the copy states no count of rules: the rules are the derivation table’s to show, and the positions the solver’s', () => {
  assert.deepEqual(rulesClaim(COPY), []);
  for (const [name, copy] of [
    ['the old positions sentence', COPY.map((p) => p.replace('computed by the solver from career.json, never written by hand', 'solved from the three rules above'))],
    ['a count of rules, not "above"', COPY.map((p) => p.replace('computed by the solver from career.json', 'solved from three rules'))],
    ['a count of mapping rules', COPY.map((p) => p.replace('computed by the solver from career.json', 'solved by the three mapping rules'))],
    ['a count in digits', COPY.map((p) => p.replace('computed by the solver from career.json', 'solved by 3 rules'))],
  ] as const) {
    assert.notDeepEqual(copy, COPY, `the rewording "${name}" must apply`);
    assert.notDeepEqual(rulesClaim(copy), [], `"${name}" must be rejected`);
  }
  assert.ok(ABSENCES.positions.includes('computed by the solver from career.json'), 'the positions paragraph names the solver, held in src/derive/colophon-claims.test.ts');
});

test('career.json holds no position, coordinate or camera key, at any depth', () => {
  assert.deepEqual(careerClaim(career()), []);
});

test('every shot names a subject, an angle, a distance and a framing, each of its type, and nothing else', () => {
  assert.deepEqual(shotKeysClaim(layout()), []);
});

test('every shot’s subject is a Client, no Project is one, and each Client has one shot', () => {
  assert.deepEqual(subjectsClaim(layout()), []);
});

test('every Client and every Project has a solved position in the layout', () => {
  assert.deepEqual(positionsClaim(layout()), []);
});

// --- Each claim falsified ----------------------------------------------------------------------------

test('a file renamed in EXHIBIT_PATHS’ names falsifies the names claim', () => {
  assert.notDeepEqual(namesClaim(COPY, ['career.json', 'layout.json']), [], 'the layout renamed');
  assert.notDeepEqual(namesClaim(COPY, ['entries.json', 'layout.generated.json']), [], 'career renamed');
  assert.notDeepEqual(namesClaim(COPY.map((p) => p.replace('layout.generated.json', 'layout.json')), NAMES), [], 'the copy naming another file');
  assert.notDeepEqual(namesClaim(COPY.map((p) => p.replaceAll('career.json', 'the input')), NAMES), [], 'the copy naming one file only');
});

test('a third exhibit, or another count written, falsifies "The two files above"', () => {
  assert.notDeepEqual(filesClaim(COPY, PATHS.length + 1), [], 'a third exhibit');
  assert.notDeepEqual(filesClaim([ABSENCES.thesis], PATHS.length + 1), [], 'a third exhibit, against the thesis alone');
  assert.notDeepEqual(filesClaim(COPY.map((p) => p.replace('Of the two files above', 'Of the three files above')), PATHS.length), [], 'the thesis miscounting');
  assert.notDeepEqual(filesClaim(COPY.map((p) => p.replace('The two files above', 'The 3 files above')), PATHS.length), [], 'a count in digits');
  assert.match(filesClaim(COPY.map((p) => p.replace('The two files above', 'The both files above')), PATHS.length).join('\n'), /an unreadable count of files: "both"/);
  assert.notDeepEqual(filesClaim(COPY.map((p) => p.replace(/\bthe two files above/gi, 'the files above')), PATHS.length), [], 'no count written');
  assert.deepEqual(filesClaim(COPY.map((p) => p.replace('The two files above', 'The 2 files above')), PATHS.length), [], 'digits read as a count');
});

test('a path off this site falsifies "fetched both from this site"', () => {
  for (const path of ['https://cdn.example.com/career.json', '//cdn.example.com/career.json', 'career.json', 'data:application/json,{}']) {
    assert.notDeepEqual(pathsClaim([path, EXHIBIT_PATHS.layout]), [], `${path} must be rejected`);
  }
});

test('a coordinate or camera key added to a copy of career.json falsifies the no-overrides claim', () => {
  const entry = (doc: { [key: string]: Json }, index: number): { [key: string]: Json } => (doc['projects'] as { [key: string]: Json }[])[index] as { [key: string]: Json };
  const edits: readonly (readonly [string, (doc: { [key: string]: Json }) => void])[] = [
    ['a position on an entry', (doc) => (entry(doc, 0)['position'] = { x: 1, y: 2, z: 3 })],
    ['a bare coordinate', (doc) => (entry(doc, 1)['x'] = 4)],
    ['a camera, nested', (doc) => (entry(doc, 0)['notable'] = { camera: { angle: 0.5 } })],
    ['a top-level override', (doc) => (doc['overrides'] = [])],
    ['a compound camera key', (doc) => (entry(doc, 0)['cameraAngle'] = 0.5)],
    ['a compound orbit key', (doc) => (entry(doc, 1)['orbitRadius'] = 12)],
    ['a latitude', (doc) => (entry(doc, 0)['Lat'] = 45)],
  ];
  for (const [name, edit] of edits) {
    const doc = career();
    edit(doc);
    assert.notDeepEqual(careerClaim(doc), [], `"${name}" must be rejected`);
  }
});

test('a shot given a position, a term dropped or a coordinate for a distance falsifies the Shot contract', () => {
  const edits: readonly (readonly [string, (doc: Layout) => void])[] = [
    ['a shot given a position', (doc) => ((shotsOf(doc)[0] as Shot)['position'] = [0, 0, 0])],
    ['a shot’s distance dropped', (doc) => delete (shotsOf(doc)[1] as Shot)['distance']],
    ['a distance as [x, y, z]', (doc) => ((shotsOf(doc)[0] as Shot)['distance'] = [1, 2, 3])],
    ['an angle that is not finite', (doc) => ((shotsOf(doc)[0] as Shot)['angle'] = null)],
    ['a subject that is not a string', (doc) => ((shotsOf(doc)[0] as Shot)['subject'] = 3)],
    ['no shots', (doc) => (doc.shots = [])],
    ['shots missing', (doc) => delete doc.shots],
    ['shots not an array', (doc) => (doc.shots = { subject: 'client:sncf' })],
  ];
  for (const [name, edit] of edits) {
    const doc = layout();
    edit(doc);
    assert.notDeepEqual(shotKeysClaim(doc), [], `"${name}" must be rejected`);
  }
  // Keys are compared as a set: the same four in another order still hold.
  const reordered = layout();
  shotsOf(reordered)[0] = Object.fromEntries(Object.entries(shotsOf(reordered)[0] as Shot).reverse());
  assert.deepEqual(shotKeysClaim(reordered), [], 'the same keys in another order');
});

test('a Project as a subject, or a Client without its one shot, falsifies the no-per-entry-camera claim', () => {
  const doc = layout();
  (shotsOf(doc)[0] as Shot)['subject'] = doc.clients[0]?.projects[0]?.id as string;
  assert.match(subjectsClaim(doc).join('\n'), /is a Project/);
  const unknown = layout();
  (shotsOf(unknown)[0] as Shot)['subject'] = 'client:nobody';
  assert.match(subjectsClaim(unknown).join('\n'), /is not a Client/);
  const dropped = layout();
  const dropping = dropped.clients[0]?.id;
  assert.ok(dropping !== undefined, 'the layout has a first Client');
  dropped.shots = shotsOf(dropped).filter((shot) => shot['subject'] !== dropping);
  assert.match(subjectsClaim(dropped).join('\n'), new RegExp(`${dropping} has 0 shots, not one`));
  const doubled = layout();
  doubled.shots = [...shotsOf(doubled), { ...(shotsOf(doubled)[0] as Shot) }];
  assert.match(subjectsClaim(doubled).join('\n'), /has 2 shots, not one/);
  const missing = layout();
  delete missing.shots;
  assert.deepEqual(subjectsClaim(missing), ['the layout’s shots are missing or not an array']);
});

test('a position dropped, emptied or unsolved falsifies "every position … is solved"', () => {
  const second = (doc: Layout) => {
    const client = doc.clients[1];
    assert.ok(client !== undefined && client.projects[0] !== undefined, 'the layout has a second Client with a Project');
    return client;
  };
  const edits: readonly (readonly [string, (doc: Layout) => void])[] = [
    ['a Client’s position dropped', (doc) => delete doc.clients[0]?.position],
    ['a Project’s position dropped', (doc) => delete second(doc).projects[0]?.position],
    ['an empty position', (doc) => ((second(doc).projects[0] as { position?: Json }).position = {})],
    ['a NaN coordinate', (doc) => (second(doc).position = { x: Number.NaN, y: 0, z: 0 })],
    ['a null coordinate', (doc) => ((second(doc).projects[0] as { position?: Json }).position = { x: 0, y: null, z: 0 })],
  ];
  for (const [name, edit] of edits) {
    const doc = layout();
    edit(doc);
    assert.notDeepEqual(positionsClaim(doc), [], `"${name}" must be rejected`);
  }
});

// --- Import-free ------------------------------------------------------------------------------------

function auditSource(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  return /^\s*import\b|\bimport\s*\(|\brequire\s*\(/m.test(code) ? ['an import — the module is import-free'] : [];
}

test('absences.ts imports nothing', () => {
  assert.deepEqual(auditSource(SOURCE), []);
});

test('the source audit rejects an import', () => {
  const real = SOURCE.replace(/\r\n/g, '\n');
  for (const [name, mutate] of [
    ['a static import', (s: string) => `import { EXHIBIT_PATHS } from './exhibits.ts';\n${s}`],
    ['a dynamic import', (s: string) => `${s}\nvoid import('../derive/index.ts');\n`],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditSource(mutated), [], `"${name}" must be rejected`);
  }
});
