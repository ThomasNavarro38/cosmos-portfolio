/**
 * Covers every row of the story's I/O & edge-case matrix against in-memory
 * fixtures, the constraints that catch silently-wrong values, and the CLI's
 * observable exit-code contract.
 *
 * Run with `npm test`. A hand-typed path is not sufficient: the schema's
 * load-bearing `strictObject` can only be pinned by a command the project
 * actually runs.
 *
 * Assertions check message *content*, never issue count. Zod aggregates rather
 * than short-circuiting — an entry with a typo plus a bad `team_size` plus a bad
 * date returns three issues — so a count assertion pins the fixture's
 * pristineness rather than the behaviour under test.
 */

import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema } from './schema.ts';
import { readCareerFile, validateCareer } from './validate.ts';

const CAREER_JSON = fileURLToPath(new URL('./career.json', import.meta.url));
const VALIDATE_TS = fileURLToPath(new URL('./validate.ts', import.meta.url));

/** A valid Notable: prose with its one constraint sentence marked for the lift. */
const MARKED = 'Problem stated. [[The constraint, in one sentence.]] The decision taken.';

/** A minimal valid entry. Tests clone and mutate it one field at a time. */
function baseEntry(): Record<string, unknown> {
  return {
    client: 'SNCF',
    project: 'Client referential — MDM replacement',
    company: null,
    role: 'Technical lead',
    built: 'Replaced a commercial Oracle MDM with a Spring Boot application.',
    team_size: 11,
    duration: { start: '2019-01', end: '2021-01' },
    notable: MARKED,
    skills: ['Java', 'Spring Boot'],
  };
}

/** The reference month every fixture is measured against. Required by the schema. */
const AS_OF = '2026-09';

function fileWith(...entries: Record<string, unknown>[]): unknown {
  return { asOf: AS_OF, projects: entries };
}

/** Asserts some failure line matches, reporting all of them when none does. */
function assertFails(failures: string[], pattern: RegExp, why: string): void {
  assert.ok(
    failures.some((line) => pattern.test(line)),
    `${why}\nexpected a line matching ${String(pattern)}, got:\n${failures.join('\n') || '(no failures — the value was accepted)'}`,
  );
}

// --- Matrix row: valid file -------------------------------------------------

test('the committed career.json passes validation', () => {
  const read = readCareerFile(CAREER_JSON);
  assert.ok(read.ok, `career.json must be readable and parseable: ${read.ok ? '' : read.message}`);
  assert.deepEqual(validateCareer(read.data), []);
});

test('a minimal valid entry passes', () => {
  assert.deepEqual(validateCareer(fileWith(baseEntry())), []);
});

// --- Matrix row: unknown field ----------------------------------------------

test('a `notabel` typo fails and names both the field and the entry', () => {
  const entry = baseEntry();
  delete entry['notable'];
  entry['notabel'] = MARKED;

  const failures = validateCareer(fileWith(baseEntry(), entry));
  assertFails(failures, /notabel/, 'the message must name the unknown field');
  assertFails(
    failures,
    /SNCF — Client referential/,
    'the message must name the entry, not just an index',
  );
});

test('the typo is still caught alongside other unrelated failures', () => {
  // Zod aggregates: this entry has three independent problems. The typo must
  // still be reported, which a count-based assertion would not prove.
  const entry = baseEntry();
  delete entry['notable'];
  entry['notabel'] = 'x';
  entry['team_size'] = -3;
  entry['duration'] = { start: 'March 2019', end: null };

  const failures = validateCareer(fileWith(entry));
  assertFails(failures, /notabel/, 'the unknown key must survive aggregation');
  assertFails(failures, /team_size/, 'the bad team_size must be reported too');
  assertFails(failures, /ISO 8601/, 'the bad date must be reported too');
});

test('an unknown field on an entry missing its names still reports an index', () => {
  const entry = baseEntry();
  delete entry['client'];
  delete entry['project'];
  entry['notabel'] = 'x';

  const failures = validateCareer(fileWith(entry));
  assertFails(failures, /entry #0/, 'the label must fall back to an index');
  assertFails(failures, /notabel/, 'the unknown field must still be named');
});

// --- Matrix row: Deep by absence --------------------------------------------

test('a populated `notable` passes with no type flag in the data', () => {
  const entry = baseEntry();
  entry['notable'] = 'A real decision. [[It was argued for and against.]]';
  assert.deepEqual(validateCareer(fileWith(entry)), []);

  const parsed = CareerSchema.parse(fileWith(entry));
  const project = parsed.projects[0];
  assert.ok(project !== undefined);
  assert.deepEqual(
    Object.keys(project).filter((k) => /kind|type|isDeep|deep|shallow/i.test(k)),
    [],
    'no field may encode entity kind',
  );
});

// --- The lifted constraint sentence -------------------------------------------

test('a Notable marks its constraint as one whole sentence inside a paragraph, wherever it sits', () => {
  for (const notable of [
    MARKED,
    '[[The constraint comes first.]] Then the rest.',
    'The rest comes first. [[Then the constraint!]]',
    'First paragraph.\n\nA second. [[The constraint, “quoted.”]] A third.',
    'A question first? [[Then the constraint.)]]\n\nThen more.',
    'Two spaces before.  [[The constraint.]] After.',
    'A hard-wrapped line.\n  [[The constraint, wrapped\nacross a line.]] After.',
    'First paragraph.\n\n   [[The second opens with it.]] Then more.',
    'It trailed off… [[The constraint ends the same way…]] After.',
    '«Quoted.» [[The constraint, «quoted.»]] After.',
  ]) {
    const entry = baseEntry();
    entry['notable'] = notable;
    assert.deepEqual(validateCareer(fileWith(entry)), [], JSON.stringify(notable));
  }
});

/** The problem each malformed lift must be rejected for, so no case passes for another reason. */
const ONCE = /notable.*exactly once/;
const PART = /notable.*not part of one/;
const WHOLE = /notable.*whole sentence, ending in/;
const OWN = /notable.*not as a paragraph of its own/;

test('a Notable without exactly one well-formed whole-sentence lift fails, naming `notable` and the problem', () => {
  for (const [why, notable, problem] of [
    ['no marker', 'Prose with no constraint marked.', ONCE],
    ['two spans', '[[One.]] [[Two.]]', ONCE],
    ['unclosed', 'Before. [[The constraint.', ONCE],
    ['unopened', 'Before. The constraint.]] After.', ONCE],
    ['reversed', 'Before.]] The constraint. [[After.', ONCE],
    ['mid-sentence', 'A sentence that [[carries the constraint.]] After.', PART],
    ['glued after', 'Before. [[The constraint.]]After.', PART],
    ['glued before', 'Before.[[The constraint.]] After.', PART],
    ['several sentences', 'Before. [[One sentence. And another.]] After.', /notable.*one sentence, not several/],
    ['a stray bracket', 'Before. [[[The constraint.]] After.', ONCE],
    ['no terminal punctuation', 'Before. [[The constraint]] after.', WHOLE],
    ['spans paragraphs', 'Before. [[The constraint.\n\nContinues.]] After.', /notable.*inside one paragraph/],
    ['the whole paragraph', 'First paragraph.\n\n[[The constraint, alone.]]', OWN],
    ['the whole Notable', '[[Only the constraint.]]', OWN],
    ['blank', 'Before. [[ ]] After.', WHOLE],
    ['edge whitespace', 'Before. [[ The constraint.]] After.', WHOLE],
  ] as const) {
    const entry = baseEntry();
    entry['notable'] = notable;
    const failures = validateCareer(fileWith(entry));
    assertFails(failures, problem, `${why} must be rejected for its own problem`);
    assert.ok(!failures.some((line) => /list item/.test(line)), `${why} is not a list`);
  }
});

test('a Notable is connected prose: a line set like a list item fails, naming `notable`', () => {
  for (const line of ['- Kafka', '* Kafka', '• Kafka', '+ Kafka', '– Kafka', '— Kafka', '1. Kafka', '2) Kafka', 'a) Kafka', '  - Kafka']) {
    const entry = baseEntry();
    entry['notable'] = `${MARKED}\n${line}`;
    assertFails(validateCareer(fileWith(entry)), /notable.*list item/, `${JSON.stringify(line)} must be rejected`);
  }
  // As the first line, or as a paragraph of its own.
  for (const notable of [`- Kafka\n${MARKED}`, `${MARKED}\n\n- Kafka`]) {
    const entry = baseEntry();
    entry['notable'] = notable;
    assertFails(validateCareer(fileWith(entry)), /notable.*list item/, `${JSON.stringify(notable)} must be rejected`);
  }
  // A dash inside a sentence is prose, not a list.
  const entry = baseEntry();
  entry['notable'] = 'One choice — and its rejection. [[The constraint - stated.]]';
  assert.deepEqual(validateCareer(fileWith(entry)), []);
});

// --- Matrix row: Shallow, three ways ----------------------------------------

test('`notable` absent, null, and empty string are all accepted', () => {
  const absent = baseEntry();
  delete absent['notable'];

  const nulled = baseEntry();
  nulled['notable'] = null;

  const empty = baseEntry();
  empty['notable'] = '';

  for (const entry of [absent, nulled, empty]) {
    assert.deepEqual(validateCareer(fileWith(entry)), []);
  }
});

test('the three Shallow forms differ in parsed shape, which 1.3 must absorb', () => {
  // Documented deliberately: absent yields nine keys, `null` and `""` yield ten.
  // All three mean Shallow, so Story 1.3's classifier has to treat `undefined`,
  // `null` and `""` as one case rather than assuming a single representation.
  const shapes = (['absent', null, ''] as const).map((value) => {
    const entry = baseEntry();
    if (value === 'absent') delete entry['notable'];
    else entry['notable'] = value;
    const project = CareerSchema.parse(fileWith(entry)).projects[0];
    assert.ok(project !== undefined);
    return { keys: Object.keys(project).length, notable: project.notable };
  });

  assert.deepEqual(
    shapes.map((s) => s.keys),
    [9, 10, 10],
    'the shapes genuinely differ — this is the fact 1.3 must handle',
  );
  assert.deepEqual(
    shapes.map((s) => s.notable),
    [undefined, null, ''],
  );
});

test('a whitespace-only `notable` is Shallow, not Deep', () => {
  const entry = baseEntry();
  entry['notable'] = '   ';
  assert.deepEqual(validateCareer(fileWith(entry)), []);

  const project = CareerSchema.parse(fileWith(entry)).projects[0];
  assert.ok(project !== undefined);
  assert.equal(
    project.notable,
    '',
    'whitespace must normalize into the existing Shallow set, not add a fourth form',
  );
});

// --- Matrix row: missing duration -------------------------------------------

test('a missing `duration` fails naming the entry and the field', () => {
  const entry = baseEntry();
  delete entry['duration'];

  const failures = validateCareer(fileWith(entry));
  assertFails(failures, /duration/, 'the missing field must be named');
  assertFails(failures, /SNCF — Client referential/, 'the entry must be named');
});

test('a partial `duration` fails', () => {
  const entry = baseEntry();
  entry['duration'] = { start: '2019-01' };
  assertFails(validateCareer(fileWith(entry)), /end/, '`end` is required');
});

// --- Duration ordering ------------------------------------------------------

test('an inverted `duration` is rejected', () => {
  // Both halves are well-formed ISO, so only an ordering check catches this.
  // Unchecked it becomes a negative span in FR-3's mass derivation.
  const entry = baseEntry();
  entry['duration'] = { start: '2021-01', end: '2019-01' };
  assertFails(
    validateCareer(fileWith(entry)),
    /end must not precede start/,
    'an inverted span must be rejected',
  );
});

test('an `end` past the authoring horizon is rejected', () => {
  // Well formed and not inverted, so neither format nor ordering catches it.
  // Unchecked it derives as more recent than an ongoing engagement, dimming the
  // work being done right now.
  const entry = baseEntry();
  entry['duration'] = { start: '2021-01', end: '2099-01' };
  assertFails(
    validateCareer(fileWith(entry)),
    /end must not be later than/,
    'a future end date must be rejected',
  );
});

test('an ongoing engagement is still accepted', () => {
  // The horizon check must not catch `null`, which is how ongoing is authored.
  const entry = baseEntry();
  entry['duration'] = { start: '2021-01', end: null };
  assert.deepEqual(validateCareer(fileWith(entry)), []);
});

test('an equal start and end is accepted as a single-month engagement', () => {
  const entry = baseEntry();
  entry['duration'] = { start: '2019-01', end: '2019-01' };
  assert.deepEqual(validateCareer(fileWith(entry)), []);
});

// --- Matrix row: omitted weight ---------------------------------------------

test('an omitted `weight` passes and resolves to 1', () => {
  const entry = baseEntry();
  assert.equal('weight' in entry, false);
  assert.deepEqual(validateCareer(fileWith(entry)), []);

  const parsed = CareerSchema.parse(fileWith(entry));
  assert.equal(parsed.projects[0]?.weight, 1);
});

test('an authored `weight` is preserved', () => {
  const entry = baseEntry();
  entry['weight'] = 2.5;
  const parsed = CareerSchema.parse(fileWith(entry));
  assert.equal(parsed.projects[0]?.weight, 2.5);
});

test('a non-positive `weight` is rejected', () => {
  // `0` is a degenerate distance from the Rail; a negative one is meaningless.
  for (const value of [0, -5]) {
    const entry = baseEntry();
    entry['weight'] = value;
    assertFails(
      validateCareer(fileWith(entry)),
      /weight/,
      `weight of ${value} must be rejected`,
    );
  }
});

// --- Non-blank names --------------------------------------------------------

test('a whitespace-only `client` or `project` is rejected', () => {
  // Accepted, these produce an unnamed Star and a broken error label.
  for (const field of ['client', 'project']) {
    const entry = baseEntry();
    entry[field] = '   ';
    assertFails(
      validateCareer(fileWith(entry)),
      /must not be empty or whitespace-only/,
      `a whitespace-only ${field} must be rejected`,
    );
  }
});

test('surrounding whitespace on a name is trimmed rather than rejected', () => {
  const entry = baseEntry();
  entry['client'] = '  SNCF  ';
  assert.deepEqual(validateCareer(fileWith(entry)), []);
  assert.equal(CareerSchema.parse(fileWith(entry)).projects[0]?.client, 'SNCF');
});

// --- Matrix row: non-ISO date -----------------------------------------------

test('a non-ISO `duration.start` fails naming the ISO 8601 requirement', () => {
  const entry = baseEntry();
  entry['duration'] = { start: 'March 2019', end: '2021-01' };

  const failures = validateCareer(fileWith(entry));
  assertFails(failures, /ISO 8601/, 'the message must name the requirement');
  assertFails(failures, /duration\.start/, 'the failing field must be named');
  assertFails(failures, /SNCF — Client referential/, 'the entry must be named');
});

test('an out-of-range month fails', () => {
  const entry = baseEntry();
  entry['duration'] = { start: '2019-13', end: null };
  assertFails(validateCareer(fileWith(entry)), /ISO 8601/, 'month 13 is not valid');
});

test('`end: null` means ongoing and passes', () => {
  const entry = baseEntry();
  entry['duration'] = { start: '2019-01', end: null };
  assert.deepEqual(validateCareer(fileWith(entry)), []);
});

// --- Matrix row: malformed JSON ---------------------------------------------

test('a malformed JSON file reports the parse error, not a stack trace', () => {
  const path = writeTemp('{ "projects": [ ');
  const read = readCareerFile(path);
  assert.equal(read.ok, false);
  if (!read.ok) {
    assert.match(read.message, /not valid JSON/);
    assert.doesNotMatch(read.message, /\bat \w+.*\(/, 'no stack frames in the message');
  }
});

test('a missing file reports a read error', () => {
  const read = readCareerFile(join(tempDir(), 'no-such-file.json'));
  assert.equal(read.ok, false);
  if (!read.ok) assert.match(read.message, /could not read/);
});

// --- Duplicate JSON keys ----------------------------------------------------

const DUP_ENTRY =
  '{"client":"SNCF","project":"Client referential","company":null,"role":"R",' +
  '"built":"B","team_size":11,"duration":{"start":"2019-01","end":"2021-01"},' +
  '"skills":["Java"],"notable":"REAL PROSE"';

test('a repeated key is rejected, naming the key and the entry', () => {
  // JSON.parse collapses this to `""` — silently demoting a Deep Project to
  // Shallow — before the schema ever sees it. strictObject cannot catch it.
  const path = writeTemp(`{"projects":[${DUP_ENTRY},"notable":""}]}`);
  const read = readCareerFile(path);

  assert.equal(read.ok, false, 'a duplicate key must not reach validation');
  if (!read.ok) {
    assert.match(read.message, /notable/, 'the repeated key must be named');
    assert.match(read.message, /SNCF — Client referential/, 'the entry must be named');
  }
});

test('the collapse a duplicate key would cause is real', () => {
  // Pins the reason the guard exists: without it, this parses and validates.
  const parsed = JSON.parse(
    `{"asOf":"${AS_OF}","projects":[${DUP_ENTRY},"notable":""}]}`,
  ) as unknown;
  const entry = (parsed as { projects: { notable: unknown }[] }).projects[0];
  assert.equal(entry?.notable, '', 'JSON.parse keeps the last occurrence');
  assert.deepEqual(validateCareer(parsed), [], 'the schema alone accepts the collapsed result');
});

test('a repeated key nested inside `duration` is caught', () => {
  const path = writeTemp(
    '{"projects":[{"client":"A","project":"B","company":null,"role":"R","built":"B",' +
      '"team_size":1,"skills":[],"duration":{"start":"2019-01","start":"2020-01","end":null}}]}',
  );
  const read = readCareerFile(path);
  assert.equal(read.ok, false);
  if (!read.ok) assert.match(read.message, /duration\.start/);
});

test('the same key in different entries is legal', () => {
  const path = writeTemp(`{"projects":[${DUP_ENTRY}},${DUP_ENTRY}}]}`);
  const read = readCareerFile(path);
  assert.ok(read.ok, `sibling entries share key names legitimately: ${read.ok ? '' : read.message}`);
});

test('braces and colons inside string values do not confuse the scan', () => {
  const path = writeTemp(
    JSON.stringify({
      projects: [{ ...baseEntry(), client: 'A{b}', project: 'x, "y": z' }],
    }),
  );
  const read = readCareerFile(path);
  assert.ok(read.ok, `string contents must not be read as structure: ${read.ok ? '' : read.message}`);
});

// --- The CLI contract -------------------------------------------------------

/**
 * The exit code is the script's only externally observable behaviour, and the
 * in-process tests never see it — changing `process.exit(1)` to `process.exit(0)`
 * leaves them all green. These run the real script as a subprocess.
 */
function runValidate(path?: string): { status: number; stderr: string; stdout: string } {
  try {
    const stdout = execFileSync(process.execPath, path === undefined ? [VALIDATE_TS] : [VALIDATE_TS, path], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      // Without a bound, a child that hangs blocks the whole suite indefinitely.
      timeout: 30_000,
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? -1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

test('the CLI exits 0 on the committed data', () => {
  const result = runValidate();
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stderr}`);
});

test('the CLI exits 1 and writes to stderr on invalid data', () => {
  // Runs the real script against a corrupted *copy*, handed over by path.
  //
  // The earlier form of this test corrupted `src/data/career.json` in place and
  // restored it in a `finally`. That is a real hazard rather than a tidiness
  // point: `node --test` runs suites in parallel, and `entities.test.ts` and
  // `solve.test.ts` both read the committed file — so either could observe the
  // corrupted window and fail for a reason unrelated to what it tests. It bit
  // once already. No test writes into `src/` now.
  const broken = JSON.parse(readFileSync(CAREER_JSON, 'utf8')) as {
    projects: Record<string, unknown>[];
  };
  const first = broken.projects[0];
  assert.ok(first !== undefined);
  // Set rather than renamed: a Shallow first entry has no `notable` to rename,
  // and `JSON.stringify` would drop a `notabel: undefined` without a trace.
  first['notabel'] = first['notable'] ?? MARKED;
  delete first['notable'];
  const client = String(first['client']);

  const result = runValidate(writeTemp(JSON.stringify(broken, null, 2)));
  assert.equal(result.status, 1, `expected exit 1, got ${result.status}`);
  assert.match(result.stderr, /notabel/, 'the failure must reach stderr');
  assert.ok(result.stderr.includes(client), `the failing entry (${client}) must be named on stderr`);
});

test('no test writes into src/, so the suites can run in parallel', () => {
  // The property the path argument exists to preserve, pinned rather than
  // trusted. A future test reaching for `writeFileSync(CAREER_JSON, ...)` again
  // reintroduces a cross-suite failure that reproduces only under parallelism.
  const source = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(
    code,
    /writeFileSync\s*\(\s*CAREER_JSON/,
    'the committed career.json must never be written by a test',
  );
});

// --- Matrix rows: the reference month ---------------------------------------

test('a missing top-level `asOf` fails naming the field', () => {
  // `strictObject` rejects unknown top-level keys, so declaring `asOf` in the
  // schema is the only way it can be authored at all — and required rather than
  // optional, so the reference month has exactly one home.
  const failures = validateCareer({ projects: [baseEntry()] });
  assertFails(failures, /asOf/, 'the missing reference month must be named');
});

test('a malformed `asOf` fails naming the field and the ISO requirement', () => {
  for (const value of ['2026-13', '2026', 'September 2026', '2026-9', '']) {
    const failures = validateCareer({ asOf: value, projects: [baseEntry()] });
    assertFails(failures, /asOf/, `"${value}" must be rejected, naming the field`);
    assertFails(failures, /ISO 8601/, `"${value}" must name the ISO requirement`);
  }
});

test('the committed career.json carries an `asOf`', () => {
  // Authored beside the entries it measures, so a re-solve is reproducible from
  // the file alone — no clock, no command-line argument, nothing typed.
  const read = readCareerFile(CAREER_JSON);
  assert.ok(read.ok);
  const parsed = CareerSchema.parse(read.data);
  assert.match(parsed.asOf, /^\d{4}-(0[1-9]|1[0-2])$/, 'the reference month is an ISO year-month');
});

// --- Structural guarantees ---------------------------------------------------

test('the schema defines exactly the ten Project fields', () => {
  const entry = baseEntry();
  entry['weight'] = 1;
  const parsed = CareerSchema.parse(fileWith(entry));
  const project = parsed.projects[0];
  assert.ok(project !== undefined);
  assert.deepEqual(Object.keys(project).sort(), [
    'built',
    'client',
    'company',
    'duration',
    'notable',
    'project',
    'role',
    'skills',
    'team_size',
    'weight',
  ]);
});

test('an unknown top-level key is rejected', () => {
  const raw = { asOf: AS_OF, projects: [baseEntry()], clients: [] };
  assertFails(validateCareer(raw), /clients/, 'unknown top-level keys must be named');
});

test('`weight` is the only hand-authored tuning number in career.json', () => {
  // `team_size` is factual content required by the ten-field set, not a tuning
  // value, so it is exempt.
  const read = readCareerFile(CAREER_JSON);
  assert.ok(read.ok);

  const numbers: string[] = [];
  const walk = (value: unknown, path: string): void => {
    if (typeof value === 'number') numbers.push(path);
    else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (value !== null && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(v, path === '' ? k : `${path}.${k}`);
    }
  };
  walk(read.data, '');

  const offenders = numbers.filter((p) => !/(^|\.)(weight|team_size)$/.test(p));
  assert.deepEqual(offenders, [], `unexpected authored numbers: ${offenders.join(', ')}`);
});

// --- Temp-file helpers -------------------------------------------------------

let scratch: string | undefined;
let scratchCount = 0;

function tempDir(): string {
  scratch ??= mkdtempSync(join(tmpdir(), 'career-validate-'));
  return scratch;
}

function writeTemp(contents: string): string {
  scratchCount += 1;
  const path = join(tempDir(), `fixture-${scratchCount}.json`);
  writeFileSync(path, contents);
  return path;
}

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});

// --- Story 3.12: the asOf bound, the empty career, and the read's text --------

test('an `asOf` before some `duration.start` fails, naming the field and the latest-starting entry', () => {
  const failures = validateCareer({
    asOf: '2018-06',
    projects: [
      { ...baseEntry(), project: 'Early', duration: { start: '2017-01', end: '2018-01' } },
      { ...baseEntry(), project: 'Late', duration: { start: '2019-03', end: null } },
    ],
  });
  assertFails(failures, /^career\.json \[asOf\]: .*2018-06.*2019-03.*SNCF — Late/, 'the latest-starting entry must be named');
});

test('an `asOf` equal to the latest start is accepted', () => {
  assert.deepEqual(validateCareer({ asOf: '2019-01', projects: [baseEntry()] }), []);
});

test('an empty `projects` list fails, naming the field', () => {
  assertFails(validateCareer({ asOf: AS_OF, projects: [] }), /^career\.json \[projects\]: /, 'an empty career must fail');
});

test('the read result carries the raw text the digest is taken over', () => {
  const read = readCareerFile(CAREER_JSON);
  assert.ok(read.ok);
  assert.equal(read.text, readFileSync(CAREER_JSON, 'utf8'));
});

test('a malformed `asOf` reports exactly one asOf issue, not a spurious precedes one', () => {
  const failures = validateCareer({ asOf: '2019-13', projects: [baseEntry()] });
  const asOfLines = failures.filter((line) => line.startsWith('career.json [asOf]:'));
  assert.equal(asOfLines.length, 1, `exactly one asOf issue: ${failures.join('\n')}`);
  assert.match(asOfLines[0] ?? '', /ISO 8601/);
});

test('a malformed `duration.start` is never named as the latest start', () => {
  const failures = validateCareer(fileWith({ ...baseEntry(), duration: { start: 'zz', end: null } }));
  assertFails(failures, /duration\.start/, 'the malformed start is reported on its own field');
  assert.equal(failures.some((line) => /precedes/.test(line)), false, `no asOf-precedes issue: ${failures.join('\n')}`);
});

test('an early `asOf` and an unknown key are both reported in one run', () => {
  // Pins the Zod behaviour the refinement relies on: an unrecognized key does
  // not stop the whole-file refinement from running.
  const failures = validateCareer({ asOf: '2018-06', projects: [{ ...baseEntry(), notabel: 'x' }] });
  assertFails(failures, /notabel/, 'the unknown key is reported');
  assertFails(failures, /^career\.json \[asOf\]: .*precedes/, 'and the early asOf too');
});
