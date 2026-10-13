/**
 * Covers every row of the story's I/O & edge-case matrix, content parity
 * field-by-field, and — the reason this suite is shaped the way it is — the
 * binding between `timeAxis` and `luminanceBand`.
 *
 * **On the opposing fixture.** The previous implementation of this story passed
 * 191 tests with the two orderings inverted: `timeAxis` was derived from
 * `duration.start` while `luminanceBand` ranked recency, and every fixture in
 * the suite happened to have a start order agreeing with its recency order, so
 * nothing separated them. `OPPOSED` below is built so the two orders genuinely
 * disagree — Alpha runs 2010-01 → 2025-01 and Beta runs 2012-01 → 2013-01, so
 * Alpha starts first but ends last. Any assertion binding the two orderings is
 * vacuous on a fixture where they coincide, so every such assertion here uses
 * this one.
 *
 * Assertions on derived numbers are **relative**, never absolute: the endpoints
 * of `deriveMass` and the solve's tuning constants are provisional and get tuned
 * against the greybox later, so pinning a coordinate would make legitimate
 * tuning look like a regression.
 *
 * No DOM, no React, no Three is imported here.
 */

import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema, type Career } from '../data/schema.ts';
import { validateCareer } from '../data/validate.ts';
import { BANNER, buildArtifact, serializeArtifact, stripBanner } from './artifact.ts';
import { SCHEMA_VERSION, validateArtifact, type Artifact } from './artifact-schema.ts';
import { DWELL_TEMPOS } from './dwell.ts';
import { deriveEntities, type EntityGraph } from './entities.ts';
import { BOUNDARY_RULES, SRC_ROOT } from './boundaries.ts';
import {
  ARTIFACT_PATH,
  CAREER_JSON as SHIPPED_CAREER_JSON,
  checkArtifact,
  checkContent,
  checkDestinations,
  checkEmittedArtifact,
  checkGate,
  checkStops,
  runPipeline,
  sourceDigestOf,
} from './index.ts';
import { solveLayout, type SolvedLayout } from './solve.ts';
import { stripComments } from '../../scripts/source-scan.ts';

const AS_OF = '2026-09';
/** A well-formed sourceDigest for fixtures built in memory, with no career.json behind them. */
const FIXTURE_DIGEST = 'f'.repeat(64);
const INDEX_TS = fileURLToPath(new URL('./index.ts', import.meta.url));
const ARTIFACT_TS = fileURLToPath(new URL('./artifact.ts', import.meta.url));
const CAREER_JSON = fileURLToPath(new URL('../data/career.json', import.meta.url));
const PACKAGE_JSON = fileURLToPath(new URL('../../package.json', import.meta.url));

// --- Fixtures ---------------------------------------------------------------

function seededRandom(seed = 1): () => number {
  let state = seed;
  return () => (state = (1664525 * state + 1013904223) % 4294967296) / 4294967296;
}

function baseEntry(): Record<string, unknown> {
  return {
    client: 'SNCF',
    project: 'Client referential — MDM replacement',
    company: null,
    role: 'Technical lead',
    built: 'Replaced a commercial Oracle MDM with a Spring Boot application.',
    team_size: 11,
    duration: { start: '2019-01', end: '2021-01' },
    notable: 'Problem stated. [[The constraint, in one sentence.]] The decision taken.',
    skills: ['Java', 'Spring Boot'],
  };
}

/**
 * A set whose `duration.start` order **deliberately opposes** its recency order.
 *
 * Alpha starts first and ends last; Beta starts second and ends first. So the
 * Rail — which sorts on `start` — reads Alpha → Beta, while the Fallback's time
 * axis reads Beta → Alpha. Every binding assertion in this file needs a fixture
 * where the two can disagree, or it proves nothing.
 */
function opposedEntries(): Record<string, unknown>[] {
  return [
    { ...baseEntry(), client: 'Alpha', project: 'A', duration: { start: '2010-01', end: '2025-01' } },
    { ...baseEntry(), client: 'Beta', project: 'B', duration: { start: '2012-01', end: '2013-01' } },
  ];
}

function careerOf(...entries: Record<string, unknown>[]): Career {
  return CareerSchema.parse({ asOf: AS_OF, projects: entries });
}

function graphOf(...entries: Record<string, unknown>[]): EntityGraph {
  return deriveEntities(careerOf(...entries), { asOf: AS_OF });
}

function solve(graph: EntityGraph): SolvedLayout {
  return solveLayout(graph, { randomSource: seededRandom() });
}

function artifactOf(...entries: Record<string, unknown>[]): Artifact {
  const graph = graphOf(...entries);
  return buildArtifact(graph, solve(graph), AS_OF, FIXTURE_DIGEST);
}

/** Every Project in the artifact, flattened, in document order. */
function allProjects(artifact: Artifact) {
  return artifact.clients.flatMap((client) => client.projects);
}

const BAND_ORDER = ['stroke-rest', 'stroke-near'];

// --- The binding: timeAxis, luminanceBand, and the Rail ---------------------

test('the opposing fixture genuinely opposes, or every binding below is vacuous', () => {
  // Asserted first and separately. If a future edit to `opposedEntries` made the
  // start order agree with the recency order, every binding assertion in this
  // file would still pass while pinning nothing — which is exactly how the
  // previous implementation shipped with the two orderings inverted.
  const graph = graphOf(...opposedEntries());
  const byStart = [...graph.clients].sort((a, b) => {
    const sa = Math.min(...a.projects.map((p) => Number(p.project.duration.start.replace('-', ''))));
    const sb = Math.min(...b.projects.map((p) => Number(p.project.duration.start.replace('-', ''))));
    return sa - sb;
  });
  const byTime = [...graph.clients].sort((a, b) => a.timeAxis - b.timeAxis);

  assert.notDeepEqual(
    byStart.map((c) => c.id),
    byTime.map((c) => c.id),
    'the fixture must order differently by start month than by recency',
  );
});

test('sorting Projects by timeAxis and by luminanceBand gives one ordering', () => {
  // The contract: the scene and the Fallback project the same data two ways, so
  // the one thing they must never do is order Bodies differently. `timeAxis` and
  // `luminanceBand` rank the same quantity, so a brighter Body is always further
  // along the axis.
  const artifact = artifactOf(...opposedEntries());
  const projects = allProjects(artifact);
  assert.ok(projects.length > 1, 'the assertion needs more than one Project');

  const byTime = [...projects].sort((a, b) => a.timeAxis - b.timeAxis).map((p) => p.id);
  const byBand = [...projects]
    .sort((a, b) => BAND_ORDER.indexOf(a.luminanceBand) - BAND_ORDER.indexOf(b.luminanceBand))
    .map((p) => p.id);

  assert.deepEqual(byTime, byBand, 'the Fallback timeline must agree with the scene brightness');
});

test('a brighter band never sits earlier on the time axis', () => {
  // Stronger than the sort above, and it holds for a set with ties: monotonicity
  // over every pair, not just over one total ordering the sort happened to pick.
  const artifact = artifactOf(
    ...opposedEntries(),
    { ...baseEntry(), client: 'Gamma', project: 'G', duration: { start: '2005-01', end: '2006-01' } },
    { ...baseEntry(), client: 'Delta', project: 'D', duration: { start: '2024-01', end: null } },
  );
  const projects = allProjects(artifact);

  for (const a of projects) {
    for (const b of projects) {
      const brighter = BAND_ORDER.indexOf(a.luminanceBand) > BAND_ORDER.indexOf(b.luminanceBand);
      if (brighter) {
        assert.ok(
          a.timeAxis > b.timeAxis,
          `"${a.id}" is brighter than "${b.id}" but not further along the time axis ` +
            `(${a.timeAxis} vs ${b.timeAxis})`,
        );
      }
    }
  }
});

test('timeAxis measures recency, not duration.start', () => {
  // The failure the review found, stated directly. Alpha starts first, so a
  // `duration.start` derivation would place it earliest on the axis. It ends
  // last, so a recency derivation places it latest. This asserts the second.
  const artifact = artifactOf(...opposedEntries());
  const alpha = artifact.clients.find((c) => c.name === 'Alpha');
  const beta = artifact.clients.find((c) => c.name === 'Beta');
  assert.ok(alpha !== undefined && beta !== undefined);

  assert.ok(
    alpha.timeAxis > beta.timeAxis,
    'Alpha ends in 2025 and Beta in 2013, so Alpha must sit later on the time axis — ' +
      'a start-month derivation would invert this',
  );
});

test("a Client's timeAxis is the greatest of its Projects', never the least", () => {
  // A Client is as recent as the most recent work done for it. Taking the
  // minimum places a Client by its oldest Project, so a long early engagement
  // outranks a short late one on the Fallback.
  const artifact = artifactOf(
    { ...baseEntry(), client: 'Multi', project: 'Old', duration: { start: '2010-01', end: '2011-01' } },
    { ...baseEntry(), client: 'Multi', project: 'New', duration: { start: '2023-01', end: '2024-01' } },
    { ...baseEntry(), client: 'Other', project: 'Mid', duration: { start: '2016-01', end: '2017-01' } },
  );
  const multi = artifact.clients.find((c) => c.name === 'Multi');
  assert.ok(multi !== undefined);

  const axes = multi.projects.map((p) => p.timeAxis);
  assert.ok(axes.length > 1, 'the fixture must give this Client more than one Project');
  assert.notEqual(Math.min(...axes), Math.max(...axes), 'and its Projects must differ on the axis');
  assert.equal(multi.timeAxis, Math.max(...axes), "a Client sits at its most recent Project");
});

test('Clients are emitted in timeAxis order, and the document says so honestly', () => {
  // The Rail sorts on `duration.start` and stays that way, so the artifact must
  // not claim the two orderings coincide. Whichever ordering the Fallback
  // reproduces has to be the one the document actually carries — this asserts
  // array order *is* `timeAxis` order, on the fixture where that differs from
  // the Rail's.
  const artifact = artifactOf(...opposedEntries());
  const emitted = artifact.clients.map((c) => c.timeAxis);
  const sorted = [...emitted].sort((a, b) => a - b);
  assert.deepEqual(emitted, sorted, 'document order must be time-axis order, oldest first');
});

test('the emitted ordering is not the Rail ordering, and neither claims to be', () => {
  // Guards against the opposite error to the one that shipped: silently
  // re-sorting the document into Rail order would make `timeAxis` decorative.
  const entries = opposedEntries();
  const graph = graphOf(...entries);
  const artifact = buildArtifact(graph, solve(graph), AS_OF, FIXTURE_DIGEST);

  // `YYYY-MM` strings compare lexicographically in chronological order, so the
  // earliest start is the string sort's first element — the same key `solve.ts`
  // orders the Rail by.
  const earliestStart = (client: (typeof graph.clients)[number]): string =>
    [...client.projects.map((p) => p.project.duration.start)].sort()[0] ?? '';

  const byRail = [...graph.clients]
    .sort((a, b) => {
      const sa = earliestStart(a);
      const sb = earliestStart(b);
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    })
    .map((c) => c.id);

  assert.notDeepEqual(
    artifact.clients.map((c) => c.id),
    byRail,
    'on this fixture the two orderings differ, and the document carries the time one',
  );
});

// --- Matrix row: happy path -------------------------------------------------

test('the committed career.json builds an artifact that validates', () => {
  const result = runPipeline();
  assert.ok(result.ok, `the pipeline must succeed on the committed data: ${result.ok ? '' : result.failures.join('\n')}`);
  assert.deepEqual(validateArtifact(stripBanner(JSON.parse(result.contents))), []);
});

test('every Client and every Project appears exactly once, with a position', () => {
  const artifact = artifactOf(
    ...opposedEntries(),
    { ...baseEntry(), client: 'Alpha', project: 'Second', weight: 2 },
  );
  const ids = [
    ...artifact.clients.map((c) => c.id),
    ...allProjects(artifact).map((p) => p.id),
  ];
  assert.equal(new Set(ids).size, ids.length, 'no entity is emitted twice');

  for (const client of artifact.clients) {
    assert.ok(client.projects.length > 0, `"${client.id}" owns at least one Project`);
    for (const project of client.projects) {
      assert.equal(project.clientId, client.id, 'a Project names its owning Client');
      for (const axis of ['x', 'y', 'z'] as const) {
        assert.ok(Number.isFinite(project.position[axis]), `"${project.id}".${axis} is finite`);
      }
    }
  }
});

// --- Matrix row: content parity ---------------------------------------------

test('every authored field is present and equal on the emitted Project', () => {
  // Field-by-field against the authored record, never by field count. A count
  // assertion passes for a document carrying ten *wrong* fields, and FR-22 is
  // about the values reaching the Fallback, not their number.
  const entry = {
    ...baseEntry(),
    client: 'Parity',
    project: 'Whole record',
    company: 'A consultancy',
    role: 'Architect',
    built: 'Something specific.',
    team_size: 7,
    duration: { start: '2021-03', end: '2022-11' },
    notable: 'Problem stated at length. [[The constraint, in one sentence.]] The decision taken.',
    skills: ['Kotlin', 'Postgres', 'Kafka'],
    weight: 2.5,
  };
  const authored = careerOf(entry).projects[0];
  assert.ok(authored !== undefined);

  const emitted = allProjects(artifactOf(entry))[0];
  assert.ok(emitted !== undefined);

  for (const [field, value] of Object.entries(authored)) {
    assert.deepEqual(
      emitted.content[field as keyof typeof emitted.content],
      value,
      `"${field}" must reach the artifact unchanged — the Fallback admits no truncation`,
    );
  }
  assert.deepEqual(
    Object.keys(emitted.content).sort(),
    Object.keys(authored).sort(),
    'and no authored field is dropped or invented',
  );
});

test('parity survives the three Shallow forms, whose parsed shapes differ', () => {
  // An absent `notable` yields nine keys, `null` and `""` yield ten. A payload
  // built by listing fields would normalize the difference away; carrying the
  // record whole preserves it.
  for (const [label, value] of [['absent', undefined], ['null', null], ['empty', '']] as const) {
    const entry = baseEntry();
    if (value === undefined) delete entry['notable'];
    else entry['notable'] = value;

    const authored = careerOf(entry).projects[0];
    const emitted = allProjects(artifactOf(entry))[0];
    assert.ok(authored !== undefined && emitted !== undefined);
    assert.deepEqual(emitted.content, authored, `the ${label} form must round-trip whole`);
    assert.equal(emitted.isDeep, false, `the ${label} form is Shallow`);
  }
});

test('a long authored string reaches the artifact untruncated', () => {
  // The committed `notable` runs to several paragraphs, and the Fallback renders
  // it in full. A serializer that clipped or escaped it would still validate.
  const career = CareerSchema.parse(JSON.parse(readFileSync(CAREER_JSON, 'utf8')));
  const authored = career.projects[0];
  assert.ok(authored !== undefined);

  const result = runPipeline();
  assert.ok(result.ok);
  const parsed = stripBanner(JSON.parse(result.contents)) as Artifact;
  const emitted = allProjects(parsed).find((p) => p.content.project === authored.project);
  assert.ok(emitted !== undefined, 'the committed entry must be in the artifact');
  assert.deepEqual(emitted.content, authored, 'the committed record round-trips exactly');
});

// --- Matrix row: the banner and the bytes -----------------------------------

test('the first line carries a banner naming the generator and forbidding hand edits', () => {
  const contents = serializeArtifact(artifactOf(baseEntry()));
  const firstLine = contents.split('\n')[0] ?? '';

  assert.match(firstLine, /^\{ /, 'the document still opens as JSON');
  assert.match(firstLine, /\$banner/, 'the banner rides on line one, not below the fold');
  assert.match(firstLine, /GENERATED FILE/i, 'and says the file is generated');
  assert.match(firstLine, /do not edit by hand/i, 'and forbids hand editing');
  assert.match(firstLine, /src\/derive\/index\.ts/, 'and names the generator');
  assert.match(firstLine, /npm run solve/, 'and names the command that regenerates it');
});

test('the emitted bytes contain no carriage return and end in a newline', () => {
  // `.gitattributes` normalizes the repository to LF, justified by this artifact
  // being diffed on purpose. `os.EOL` would emit CRLF on Windows and produce a
  // whole-file diff on every solve run from a different machine.
  const contents = serializeArtifact(artifactOf(...opposedEntries()));
  assert.equal(contents.includes('\r'), false, 'no CR may appear anywhere in the file');
  assert.ok(contents.endsWith('\n'), 'the file ends with a newline');
});

test('the committed artifact carries the banner and no carriage return', () => {
  const text = readFileSync(ARTIFACT_PATH, 'utf8');
  assert.equal(text.includes('\r'), false, 'the committed bytes must be LF-only');
  assert.match(text.split('\n')[0] ?? '', /GENERATED FILE/i);
});

test('the schema neither declares nor accepts the banner field', () => {
  // The banner is a property of the file, not of the document. Declaring it
  // would put a human-readable warning into the machine contract; accepting it
  // silently would let an arbitrary unvalidated field ride along.
  const artifact = artifactOf(baseEntry());
  assert.deepEqual(validateArtifact(artifact), [], 'the document itself validates');

  const withBanner = { $banner: BANNER, ...artifact };
  assert.notDeepEqual(
    validateArtifact(withBanner),
    [],
    'the schema must reject the banner rather than tolerate it',
  );
  assert.deepEqual(validateArtifact(stripBanner(withBanner)), [], 'and stripping it restores validity');
});

// --- Matrix row: re-solve is byte-identical ---------------------------------

test('two runs of the pipeline produce byte-identical output', () => {
  const first = runPipeline();
  const second = runPipeline();
  assert.ok(first.ok && second.ok);
  assert.equal(second.contents, first.contents, 'a re-solve must not churn the committed file');
});

test('re-ordering career.json changes not one byte of the artifact', () => {
  // AD-5 carried all the way to the emitted document: entity IDs, the solve, and
  // the document's own ordering are all content-derived.
  const entries = [
    ...opposedEntries(),
    { ...baseEntry(), client: 'Alpha', project: 'Second', weight: 2 },
  ];
  const forward = serializeArtifact(artifactOf(...entries));
  const reversed = serializeArtifact(artifactOf(...[...entries].reverse()));
  assert.equal(reversed, forward, 'authored order must not reach the artifact');
});

/**
 * Two Clients whose most recent Projects end in the same month, so they share a
 * recency rank and therefore an identical `timeAxis`. Authored in the order
 * `Zeta`, `Alpha` so that authored order and ID order disagree — sorting on
 * `timeAxis` alone leaves the two interchangeable, and only the ID tie-break
 * decides which is emitted first.
 */
function tiedEntries(): Record<string, unknown>[] {
  return [
    { ...baseEntry(), client: 'Zeta', project: 'Z', duration: { start: '2019-01', end: '2021-01' } },
    {
      ...baseEntry(),
      client: 'Alpha',
      project: 'A',
      duration: { start: '2018-01', end: '2021-01' },
    },
  ];
}

test('the tied fixture genuinely ties, or the tie-break assertion is vacuous', () => {
  // The same guard the opposing fixture carries, for the same reason: if a future
  // edit gave these two Clients different end months, the assertion below would
  // still pass while exercising nothing but the ordinary `timeAxis` comparison.
  const graph = graphOf(...tiedEntries());
  assert.equal(graph.clients.length, 2, 'the fixture must derive exactly two Clients');
  const [first, second] = graph.clients;
  assert.ok(first !== undefined && second !== undefined);
  assert.equal(
    first.timeAxis,
    second.timeAxis,
    'the fixture must give both Clients the same timeAxis, or nothing tests the tie-break',
  );
  assert.notEqual(first.id, second.id, 'and they must be distinguishable by ID');
});

test('Clients tied on timeAxis are emitted in ID order, whatever the authored order', () => {
  // `entities.ts` ranks equal recency identically by design, and every ongoing
  // engagement clamps to the same `asOf` month — so ties are reachable, not
  // hypothetical. Without the ID tie-break at `artifact.ts`, `Array.prototype.sort`
  // leaves tied entries in input order, and re-ordering `career.json` would change
  // the artifact's bytes for no data change. Deleting that tie-break left the
  // whole suite green until this test existed.
  const entries = tiedEntries();
  const forward = serializeArtifact(artifactOf(...entries));
  const reversed = serializeArtifact(artifactOf(...[...entries].reverse()));
  assert.equal(reversed, forward, 'a tie must not let authored order reach the artifact');

  const ids = artifactOf(...entries).clients.map((client) => client.id);
  assert.deepEqual(
    ids,
    [...ids].sort(),
    `tied Clients must be emitted in ID order: ${ids.join(', ')}`,
  );
});

test('the committed artifact matches what the pipeline produces now', () => {
  // The acceptance criterion, as a test: `npm run solve` twice leaves
  // `git status --porcelain generated/` silent. Catches a committed artifact
  // that has drifted from the data, which the gate alone would not — a stale
  // artifact still validates.
  const result = runPipeline();
  assert.ok(result.ok);
  assert.equal(
    readFileSync(ARTIFACT_PATH, 'utf8'),
    result.contents,
    'the committed artifact is stale — run `npm run solve` and commit the result',
  );
});

// --- Matrix rows: failure paths ---------------------------------------------

test('invalid authored data writes nothing and reports the same lines as validate', () => {
  const entry = baseEntry();
  delete entry['notable'];
  entry['notabel'] = 'x';
  const path = writeTemp(JSON.stringify({ asOf: AS_OF, projects: [entry] }));

  const result = runPipeline(path);
  assert.equal(result.ok, false, 'the pipeline must refuse invalid data');
  if (!result.ok) {
    assert.ok(
      result.failures.some((line) => /notabel/.test(line)),
      `the unknown field must be named: ${result.failures.join('\n')}`,
    );
    assert.ok(
      result.failures.some((line) => /SNCF/.test(line)),
      'and the entry must be named',
    );
  }
});

test('a missing asOf fails the pipeline naming the field', () => {
  const path = writeTemp(JSON.stringify({ projects: [baseEntry()] }));
  const result = runPipeline(path);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.failures.some((line) => /asOf/.test(line)), result.failures.join('\n'));
  }
});

test('a malformed asOf fails the pipeline naming the field', () => {
  const path = writeTemp(JSON.stringify({ asOf: '2026-13', projects: [baseEntry()] }));
  const result = runPipeline(path);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.failures.some((line) => /asOf/.test(line)), result.failures.join('\n'));
  }
});

test('an artifact that fails its own schema is not written, and the path is named', () => {
  // Forced by handing `buildArtifact` a graph whose derived `mass` is negative —
  // a shape no rule produces today, which is the point: the pre-write validation
  // exists so the *first* bad emission fails rather than being committed.
  const graph = graphOf(...opposedEntries());
  const client = graph.clients[0];
  const project = client?.projects[0];
  assert.ok(client !== undefined && project !== undefined);

  const poisoned: EntityGraph = {
    clients: [
      { ...client, projects: [{ ...project, mass: -1 }] },
      ...graph.clients.slice(1),
    ],
  };
  const failures = validateArtifact(buildArtifact(poisoned, solve(graph), AS_OF, FIXTURE_DIGEST));
  assert.notDeepEqual(failures, [], 'a bad shape must be caught');
  assert.ok(
    failures.some((line) => /clients\.\d+\.projects\.\d+\.mass/.test(line)),
    `the failing path must be named, got: ${failures.join('\n')}`,
  );
});

test('a solve missing a position throws naming the entity rather than emitting it', () => {
  const graph = graphOf(...opposedEntries());
  const full = solve(graph);
  const target = graph.clients[0]?.projects[0];
  assert.ok(target !== undefined);

  const { [target.id]: _dropped, ...rest } = full.positions;
  assert.throws(
    () => buildArtifact(graph, { ...full, positions: rest }, AS_OF, FIXTURE_DIGEST),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /no position/, 'the failure names the problem');
      assert.ok(error.message.includes(target.id), 'and names the entity');
      return true;
    },
  );
});

test('a solve missing an orbit normal throws naming the Project rather than emitting it', () => {
  const graph = graphOf(...opposedEntries());
  const full = solve(graph);
  const target = graph.clients[0]?.projects[0];
  assert.ok(target !== undefined);

  const { [target.id]: _dropped, ...rest } = full.orbitNormals;
  assert.throws(
    () => buildArtifact(graph, { ...full, orbitNormals: rest }, AS_OF, FIXTURE_DIGEST),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /no orbit normal/, 'the failure names the problem');
      assert.ok(error.message.includes(target.id), 'and names the entity');
      return true;
    },
  );
});

// --- Matrix rows: the build gate --------------------------------------------

test('the gate fails when the artifact is missing, naming it and the solve script', () => {
  const failures = checkArtifact(join(tempDir(), 'no-such-artifact.json'));
  assert.notDeepEqual(failures, [], 'a missing artifact must fail the gate');
  assert.ok(failures.some((line) => /missing/.test(line)), 'the failure says it is missing');
  assert.ok(
    failures.some((line) => /npm run solve/.test(line)),
    `the failure must name the script that produces it: ${failures.join('\n')}`,
  );
});

test('the gate rejects an artifact that is not valid JSON', () => {
  // The branch carries user-facing guidance no test read until now: replacing it
  // with `catch { return []; }` left the whole suite green, so a truncated
  // artifact would have passed the gate and failed in the browser instead.
  const failures = checkArtifact(writeTemp('{ "schemaVersion": 1,'));
  assert.notDeepEqual(failures, [], 'unparseable JSON must fail the gate');
  assert.ok(
    failures.some((line) => /not valid JSON/.test(line)),
    `the failure must say the artifact is not valid JSON: ${failures.join('\n')}`,
  );
});

test('the gate rejects an artifact whose banner is gone', () => {
  // The banner is the file's only warning against hand-editing, and an AC puts
  // it on line one. Validating the *parsed* document cannot see it: `stripBanner`
  // removes the field before the schema runs, so a banner-less artifact was
  // "present and valid" until the gate learned to read the bytes.
  const withoutBanner = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8')) as Record<string, unknown>;
  delete withoutBanner['$banner'];
  const failures = checkArtifact(writeTemp(JSON.stringify(withoutBanner, null, 2)));
  assert.notDeepEqual(failures, [], 'an artifact with no banner must fail the gate');
  assert.ok(
    failures.some((line) => /banner/.test(line)),
    `the failure must name the missing banner: ${failures.join('\n')}`,
  );
});

test('the gate rejects an artifact carrying CRLF newlines', () => {
  // `.gitattributes` justifies `eol=lf` by this file being diffed, and an AC
  // says its bytes carry no carriage return. On Windows an editor save is enough
  // to convert it, and the parse discards the difference entirely.
  const crlf = readFileSync(ARTIFACT_PATH, 'utf8').replace(/\n/g, '\r\n');
  const failures = checkArtifact(writeTemp(crlf));
  assert.notDeepEqual(failures, [], 'a CRLF artifact must fail the gate');
  assert.ok(
    failures.some((line) => /CRLF/.test(line)),
    `the failure must name the line endings: ${failures.join('\n')}`,
  );
});

test('a read failure that is not a missing file says so, and does not name the solve', () => {
  // A directory standing where the file belongs throws EISDIR, not ENOENT.
  // Reporting it as "missing" would send the reader to `npm run solve`, which
  // writes the file and leaves the directory — a fix that cannot work.
  const failures = checkArtifact(tempDir());
  assert.notDeepEqual(failures, [], 'an unreadable artifact must still fail the gate');
  assert.ok(
    failures.some((line) => /could not be read/.test(line)),
    `the failure must say it could not be read: ${failures.join('\n')}`,
  );
  assert.equal(
    failures.some((line) => /npm run solve/.test(line)),
    false,
    'and must not prescribe a solve, which would not fix it',
  );
});

test('the gate fails on a stale-shaped artifact, naming the failing path', () => {
  const artifact = artifactOf(baseEntry()) as unknown as Record<string, unknown>;
  const broken = JSON.parse(JSON.stringify(artifact)) as {
    clients: { projects: Record<string, unknown>[] }[];
  };
  const project = broken.clients[0]?.projects[0];
  assert.ok(project !== undefined);
  delete project['timeAxis'];

  const failures = checkArtifact(writeTemp(JSON.stringify(broken)));
  assert.notDeepEqual(failures, []);
  assert.ok(
    failures.some((line) => /clients\.0\.projects\.0\.timeAxis/.test(line)),
    `the failing path must be named, got: ${failures.join('\n')}`,
  );
});

test('the gate rejects an artifact declaring a different schemaVersion', () => {
  // `schemaVersion` is a literal, not a range: an artifact from a future story's
  // shape must fail rather than be read on a guess.
  const artifact = JSON.parse(JSON.stringify(artifactOf(baseEntry()))) as Record<string, unknown>;
  artifact['schemaVersion'] = SCHEMA_VERSION + 1;
  const failures = checkArtifact(writeTemp(JSON.stringify(artifact)));
  assert.ok(
    failures.some((line) => /schemaVersion/.test(line)),
    `a version mismatch must fail the gate: ${failures.join('\n')}`,
  );
});

// --- Matrix rows: the destination set at the gate ---------------------------

/**
 * A committed-shaped artifact on the opposing fixture, as a mutable document,
 * plus a writer that turns it back into a gate-readable file.
 *
 * The banner is re-attached because the gate reads the *bytes*: without it every
 * assertion below would pass on the banner check rather than on the cardinality
 * one, which is the failure it exists to detect.
 */
function gateFixture(): {
  doc: { destinations: { id: string; kind: string }[]; clients: { id: string; projects: { id: string }[] }[] };
  write: () => string;
} {
  const doc = JSON.parse(JSON.stringify(artifactOf(...opposedEntries()))) as {
    destinations: { id: string; kind: string }[];
    clients: { id: string; projects: { id: string }[] }[];
  };
  return { doc, write: () => writeTemp(serializeArtifact(doc as unknown as Artifact)) };
}

test('the gate fixture passes before it is broken, or every mutation below is vacuous', () => {
  // The same guard the opposing fixture carries. If the fixture failed the gate
  // for an unrelated reason — a lost banner, a stale shape — each assertion
  // below would pass while testing nothing.
  const { write } = gateFixture();
  assert.deepEqual(checkArtifact(write()), [], 'the unbroken fixture must pass its own gate');
});

test('the gate fails when a destination is dropped, naming the unreachable entity', () => {
  const { doc, write } = gateFixture();
  const dropped = doc.destinations.find((d) => d.kind === 'project');
  assert.ok(dropped !== undefined, 'the fixture must carry a Project destination to drop');
  doc.destinations = doc.destinations.filter((d) => d.id !== dropped.id);

  const failures = checkArtifact(write());
  assert.notDeepEqual(failures, [], 'a dropped destination must fail the gate');
  assert.ok(
    failures.some((line) => line.includes(dropped.id)),
    `the missing ID must be named: ${failures.join('\n')}`,
  );
  assert.ok(
    failures.some((line) => /\b4\b.*\b3\b|\b3\b.*\b4\b/.test(line)),
    `the count mismatch must be reported: ${failures.join('\n')}`,
  );
});

test('the gate fails when a destination is listed twice, naming the duplicate', () => {
  const { doc, write } = gateFixture();
  const first = doc.destinations[0];
  assert.ok(first !== undefined);
  doc.destinations = [...doc.destinations, { ...first }];

  const failures = checkArtifact(write());
  assert.notDeepEqual(failures, [], 'a duplicated destination must fail the gate');
  assert.ok(
    failures.some((line) => line.includes(first.id) && /more than once/.test(line)),
    `the duplicated ID must be named: ${failures.join('\n')}`,
  );
});

test('the gate fails when a destination names an ID no entity carries', () => {
  const { doc, write } = gateFixture();
  doc.destinations = [...doc.destinations, { id: 'project:ghost/nowhere', kind: 'project' }];

  const failures = checkArtifact(write());
  assert.notDeepEqual(failures, [], 'an invented destination must fail the gate');
  assert.ok(
    failures.some((line) => line.includes('project:ghost/nowhere')),
    `the unknown ID must be named: ${failures.join('\n')}`,
  );
});

test('the gate fails when a destination claims the wrong kind for its ID', () => {
  // A Client is a Rail stop and a Project a Body in orbit; the two consumers
  // treat them differently. A `kind` contradicting the ID would send one of them
  // down the wrong path with an ID that resolves perfectly well.
  const { doc, write } = gateFixture();
  const client = doc.destinations.find((d) => d.kind === 'client');
  assert.ok(client !== undefined);
  client.kind = 'project';

  const failures = checkArtifact(write());
  assert.notDeepEqual(failures, [], 'a mislabelled destination must fail the gate');
  assert.ok(
    failures.some((line) => line.includes(client.id) && /resolves to a client/.test(line)),
    `the mislabelled ID must be named: ${failures.join('\n')}`,
  );
});

test('the CLI exits 1 on an artifact whose destination set drifted', () => {
  // The AC is about `npm run build`, whose only observable behaviour is the exit
  // code — and `checkArtifact` in-process never shows it. So this drives the
  // real `--check` branch, but against a temp copy rather than the committed
  // file: seeding a deliberately broken artifact into `generated/` and undoing
  // it in a `finally` leaves a window where a Ctrl-C or a killed CI job strands
  // the repo dirty, and the breakage would surface in whichever sibling reads
  // the artifact next. `--check` takes the same optional path the solve branch
  // does, for exactly this reason.
  const doc = stripBanner(JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'))) as Artifact;
  // One entry dropped rather than the list emptied: an empty list is now a schema
  // failure (Story 3.12), which would report before the cardinality check.
  const drifted = { ...doc, destinations: doc.destinations.filter((d) => d.id !== 'client:sncf') } as unknown as Artifact;

  const result = runIndex('--check', writeTemp(serializeArtifact(drifted)));
  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stderr}`);
  assert.match(result.stderr, /destination/i, 'the failure must reach stderr');
  assert.match(result.stderr, /client:sncf/, 'and must name the unreachable entity');
});

test('the gate would catch the drift it is asserted against, mutation by mutation', () => {
  // Pins the assertion itself. A `checkDestinations` that returned `[]`
  // unconditionally — or a `checkArtifact` that never called it — would leave
  // every assertion above green if any of them checked only that *some* line
  // came back. Each mutation is applied to a document that otherwise passes, and
  // each must be rejected by `checkDestinations` on its own.
  const base = JSON.parse(JSON.stringify(artifactOf(...opposedEntries()))) as Artifact;
  assert.deepEqual(checkDestinations(base), [], 'the unmutated artifact must pass');

  const mutations: [string, (doc: Artifact) => Artifact][] = [
    ['a dropped destination', (d) => ({ ...d, destinations: d.destinations.slice(1) })],
    ['a duplicated destination', (d) => ({ ...d, destinations: [...d.destinations, d.destinations[0]!] })],
    ['an invented destination', (d) => ({ ...d, destinations: [...d.destinations, { id: 'client:nobody', kind: 'client' as const }] })],
    ['an emptied set', (d) => ({ ...d, destinations: [] })],
    ['Clients only', (d) => ({ ...d, destinations: d.destinations.filter((e) => e.kind === 'client') })],
    ['Projects only', (d) => ({ ...d, destinations: d.destinations.filter((e) => e.kind === 'project') })],
    // Not a destination-set mutation but an entity-tree one: two Clients sharing
    // an ID collapse to a single key in the gate's map, and the collapsed tree
    // then agrees with a set naming that ID once. `entities.ts` throws on this
    // at derive time, but the gate never derives (AD-1).
    ['a Client ID carried twice', (d) => ({ ...d, clients: [...d.clients, { ...d.clients[0]! }] })],
  ];

  for (const [label, mutate] of mutations) {
    assert.notDeepEqual(
      checkDestinations(mutate(base)),
      [],
      `${label} must be rejected — an assertion that accepts it is asserting nothing`,
    );
  }
});

// --- Matrix rows: the Dwell and Shot lists at the gate ----------------------

/**
 * The same committed-shaped fixture, typed for the two Client-granular lists.
 *
 * A temp copy, never the committed artifact: seeding a deliberately broken
 * document into `generated/` and undoing it in a `finally` leaves a window where
 * an interrupt strands the repo dirty, and the breakage surfaces in whichever
 * sibling reads the artifact next.
 */
function stopFixture(): {
  doc: {
    dwell: { subject: string; tempo: string }[];
    shots: { subject: string; angle: number; distance: number; framing: string }[];
    rail: string[];
    clients: { id: string; projects: { id: string; railDistance: number }[] }[];
  };
  write: () => string;
} {
  const doc = JSON.parse(JSON.stringify(artifactOf(...opposedEntries()))) as {
    dwell: { subject: string; tempo: string }[];
    shots: { subject: string; angle: number; distance: number; framing: string }[];
    rail: string[];
    clients: { id: string; projects: { id: string; railDistance: number }[] }[];
  };
  return { doc, write: () => writeTemp(serializeArtifact(doc as unknown as Artifact)) };
}

test('the stop fixture passes before it is broken, or every mutation below is vacuous', () => {
  const { write } = stopFixture();
  assert.deepEqual(checkArtifact(write()), [], 'the unbroken fixture must pass its own gate');
});

test('the gate fails when a Client has no Dwell entry, naming it', () => {
  const { doc, write } = stopFixture();
  const dropped = doc.dwell[0];
  assert.ok(dropped !== undefined, 'the fixture must carry a Dwell entry to drop');
  doc.dwell = doc.dwell.filter((entry) => entry.subject !== dropped.subject);

  const failures = checkArtifact(write());
  assert.notDeepEqual(failures, [], 'a dropped Dwell entry must fail the gate');
  assert.ok(
    failures.some((line) => line.includes(dropped.subject) && /no dwell entry/.test(line)),
    `the unpaced Client must be named: ${failures.join('\n')}`,
  );
});

test('the gate fails when a Client has no Shot, naming it', () => {
  const { doc, write } = stopFixture();
  const dropped = doc.shots[0];
  assert.ok(dropped !== undefined);
  doc.shots = doc.shots.filter((shot) => shot.subject !== dropped.subject);

  const failures = checkArtifact(write());
  assert.ok(
    failures.some((line) => line.includes(dropped.subject) && /no shots entry/.test(line)),
    `the unframed Client must be named: ${failures.join('\n')}`,
  );
});

test('the gate fails when a Dwell or Shot entry is listed twice, naming the duplicate', () => {
  for (const field of ['dwell', 'shots'] as const) {
    const { doc, write } = stopFixture();
    const first = doc[field][0];
    assert.ok(first !== undefined);
    // Cast through `unknown` because the two lists have different entry shapes;
    // the mutation is the same one either way.
    (doc[field] as unknown[]).push({ ...first });

    const failures = checkArtifact(write());
    assert.ok(
      failures.some((line) => line.includes(first.subject) && /more than once/.test(line)),
      `the duplicated ${field} subject must be named: ${failures.join('\n')}`,
    );
  }
});

test('the gate fails when a Dwell or Shot names an ID no Client carries', () => {
  const { doc, write } = stopFixture();
  const template = doc.shots[0];
  assert.ok(template !== undefined);
  doc.dwell = [...doc.dwell, { subject: 'client:nobody', tempo: 'dwell-brief' }];
  doc.shots = [...doc.shots, { ...template, subject: 'client:nobody' }];

  const failures = checkArtifact(write());
  assert.ok(
    failures.some((line) => line.includes('client:nobody')),
    `the invented ID must be named: ${failures.join('\n')}`,
  );
});

test('the gate fails when a Project is given a Dwell or a Shot of its own', () => {
  // AD-4a, and the failure this story exists to prevent: built per-Project the
  // Rail stops at ~15 Bodies instead of ~5 Clients, and nothing would say so
  // until the camera existed. A Project subject is reported as the *granularity*
  // error it is, not as an unknown ID.
  const { doc, write } = stopFixture();
  const project = doc.clients[0]?.projects[0];
  const template = doc.shots[0];
  assert.ok(project !== undefined && template !== undefined);
  doc.dwell = [...doc.dwell, { subject: project.id, tempo: 'dwell-brief' }];
  doc.shots = [...doc.shots, { ...template, subject: project.id }];

  const failures = checkArtifact(write());
  assert.notDeepEqual(failures, [], 'a per-Project entry must fail the gate');
  assert.ok(
    failures.some((line) => line.includes(project.id) && /Rail stops at Clients/.test(line)),
    `the offending Project must be named as a granularity error: ${failures.join('\n')}`,
  );
});

// --- Matrix row: the Rail's ordering at the gate ----------------------------

test('the gate fails when a Client has no Rail stop, naming it', () => {
  // The AC's cardinality-drift row, first clause. A Client absent from `rail` is
  // a Rail stop the journey never makes — and the DOM index, whose order *is*
  // the Rail's, would have no entry for it at all.
  const { doc, write } = stopFixture();
  const dropped = doc.rail[0];
  assert.ok(dropped !== undefined, 'the fixture must carry a Rail stop to drop');
  doc.rail = doc.rail.filter((id) => id !== dropped);

  const failures = checkArtifact(write());
  assert.notDeepEqual(failures, [], 'a dropped Rail stop must fail the gate');
  assert.ok(
    failures.some((line) => line.includes(dropped) && /no rail entry/.test(line)),
    `the Client with no stop must be named: ${failures.join('\n')}`,
  );
});

test('the gate fails when a Rail stop is listed twice, naming the duplicate', () => {
  const { doc, write } = stopFixture();
  const first = doc.rail[0];
  assert.ok(first !== undefined);
  doc.rail = [...doc.rail, first];

  const failures = checkArtifact(write());
  assert.ok(
    failures.some((line) => line.includes(first) && /more than once/.test(line)),
    `the duplicated Rail stop must be named: ${failures.join('\n')}`,
  );
});

test('the gate fails when the Rail names an ID no Client carries', () => {
  const { doc, write } = stopFixture();
  doc.rail = [...doc.rail, 'client:nobody'];

  const failures = checkArtifact(write());
  assert.ok(
    failures.some((line) => line.includes('client:nobody')),
    `the invented ID must be named: ${failures.join('\n')}`,
  );
});

test('the gate fails when the Rail names a Project, reporting the granularity', () => {
  // AD-4a for the Rail itself, and the row the story's matrix names explicitly.
  // The Rail stops at Clients; a Project is reached by being framed at its
  // Client's stop, so a Project ID here describes a stop that does not exist —
  // and it must be reported as the *granularity* error it is, not as an unknown
  // ID, because the two have different fixes.
  const { doc, write } = stopFixture();
  const project = doc.clients[0]?.projects[0];
  assert.ok(project !== undefined);
  doc.rail = [...doc.rail, project.id];

  const failures = checkArtifact(write());
  assert.notDeepEqual(failures, [], 'a Project on the Rail must fail the gate');
  assert.ok(
    failures.some((line) => line.includes(project.id) && /Rail stops at Clients/.test(line)),
    `the offending Project must be named as a granularity error: ${failures.join('\n')}`,
  );
});

test('the CLI exits 1 on an artifact whose Rail drifted', () => {
  // The AC is about `npm run build`, whose only observable behaviour is the exit
  // code — and `checkStops` in-process never shows it. Against a temp copy, never
  // the committed file.
  const doc = stripBanner(JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'))) as Artifact;
  const drifted = { ...doc, rail: [] } as unknown as Artifact;

  const result = runIndex('--check', writeTemp(serializeArtifact(drifted)));
  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stderr}`);
  assert.match(result.stderr, /rail/i, 'the failure must reach stderr');
  assert.match(result.stderr, /client:sncf/, 'and must name the Client with no stop');
});

test('the CLI exits 1 on an artifact whose Rail names a Project', () => {
  const doc = stripBanner(JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'))) as Artifact;
  const project = doc.clients[0]?.projects[0];
  assert.ok(project !== undefined);
  const drifted = { ...doc, rail: [...doc.rail, project.id] } as unknown as Artifact;

  const result = runIndex('--check', writeTemp(serializeArtifact(drifted)));
  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stderr}`);
  assert.ok(result.stderr.includes(project.id), 'the failure must name the offending Project');
  assert.match(result.stderr, /Rail stops at Clients/, 'and state the granularity');
});

test('the emitted Rail is the Rail ordering, and demonstrably not the clients[] one', () => {
  // The story's second acceptance criterion, at the artifact level: the document
  // carries three orderings and this one is the Rail's. On `opposedEntries` the
  // emitted `clients` array is `timeAxis` order and the Rail is start-month
  // order, so they are reverses of each other — an assertion that `rail` merely
  // "has the right length" would pass on either.
  const artifact = artifactOf(...opposedEntries());
  const emitted = artifact.clients.map((client) => client.id);

  assert.equal(artifact.rail.length, emitted.length, 'one Rail stop per Client');
  assert.deepEqual([...artifact.rail].sort(), [...emitted].sort(), 'and the same Clients');
  assert.notDeepEqual(
    [...artifact.rail],
    emitted,
    'but not in the same order — the Rail is not the Fallback timeline',
  );
  assert.deepEqual(
    [...artifact.rail],
    [...emitted].reverse(),
    'on this fixture the two orderings are exact reverses',
  );
});

test('the CLI exits 1 on an artifact whose Dwell list drifted', () => {
  // The AC is about `npm run build`, whose only observable behaviour is the exit
  // code — and `checkStops` in-process never shows it.
  const doc = stripBanner(JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'))) as Artifact;
  const drifted = { ...doc, dwell: doc.dwell.filter((d) => d.subject !== 'client:sncf') } as unknown as Artifact;

  const result = runIndex('--check', writeTemp(serializeArtifact(drifted)));
  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stderr}`);
  assert.match(result.stderr, /dwell/i, 'the failure must reach stderr');
  assert.match(result.stderr, /client:sncf/, 'and must name the unpaced Client');
});

test('the CLI exits 1 on an artifact whose Shot list drifted', () => {
  const doc = stripBanner(JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'))) as Artifact;
  const drifted = { ...doc, shots: doc.shots.filter((d) => d.subject !== 'client:sncf') } as unknown as Artifact;

  const result = runIndex('--check', writeTemp(serializeArtifact(drifted)));
  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stderr}`);
  assert.match(result.stderr, /shots/i, 'the failure must reach stderr');
  assert.match(result.stderr, /client:sncf/, 'and must name the unframed Client');
});

test('the gate fails when a Shot no longer contains its own system’s widest orbit', () => {
  // The one Shot property the gate could not see. Every check above is about
  // *which* Clients are named; a Shot naming the right Client with a distance
  // that frames its widest Project out of view passes all of them, and the
  // Project is then unreachable from the Rail. Read off the document's own tree
  // — no re-derive, no re-solve (AD-1).
  const { doc, write } = stopFixture();
  const shot = doc.shots[0];
  assert.ok(shot !== undefined);
  const client = doc.clients.find((candidate) => candidate.id === shot.subject);
  assert.ok(client !== undefined, 'the fixture Shot must resolve to a Client');
  const widest = Math.max(...client.projects.map((project) => project.railDistance));
  assert.ok(shot.distance > widest, 'the unmutated fixture must already contain its widest orbit');

  // Pulled just inside the widest orbit — still positive, still finite, so the
  // schema accepts it and only this check can reject it.
  doc.shots = doc.shots.map((entry) =>
    entry.subject === shot.subject ? { ...entry, distance: widest / 2 } : entry,
  );

  const failures = checkArtifact(write());
  assert.notDeepEqual(failures, [], 'a Shot framing its own system out of view must fail the gate');
  assert.ok(
    failures.some((line) => line.includes(shot.subject) && line.includes(String(widest))),
    `the offending subject and its widest orbit must both be named: ${failures.join('\n')}`,
  );
});

test('a duplicate Client ID cannot hide a Shot that frames its widest orbit out of view', () => {
  // `widestOrbit` is keyed by Client ID, so a second Client carrying an ID the
  // first already used would overwrite the orbit the containment check reads.
  // Framed against the *narrower* of the two, a Shot that frames the wider
  // system's outermost Project out of view reads as sound. `Math.max` on the
  // write is what keeps the widest one deciding.
  const { doc } = stopFixture();
  const client = doc.clients[0];
  assert.ok(client !== undefined);
  const widest = Math.max(...client.projects.map((project) => project.railDistance));

  // A twin under the same ID, orbiting far closer than the original.
  const twin = JSON.parse(JSON.stringify(client)) as typeof client;
  twin.projects = twin.projects.map((project) => ({ ...project, railDistance: 0.5 }));
  doc.clients = [client, twin];
  // Framed to contain the twin but not the original — the exact document the
  // overwrite would have passed.
  doc.shots = doc.shots.map((shot) =>
    shot.subject === client.id ? { ...shot, distance: 1 } : shot,
  );

  const failures = checkStops(doc as unknown as Artifact);
  assert.ok(
    failures.some((line) => line.includes(client.id) && line.includes(String(widest))),
    `containment must be judged against the widest orbit under the ID: ${failures.join('; ')}`,
  );
});

test('a Client collapsed by a duplicate ID is still reported as an unpaced stop', () => {
  // The missing-entry loop walks distinct IDs, so two Clients sharing one need
  // only a single entry to satisfy it. The Rail stops at each Client in the
  // tree, so the tree's own length is what each list must match.
  const { doc } = stopFixture();
  const client = doc.clients[0];
  assert.ok(client !== undefined);
  const before = doc.clients.length;
  // The twin is *added* to the tree, so every other Client keeps its entry and
  // the only divergence is the collapsed pair.
  doc.clients = [...doc.clients, JSON.parse(JSON.stringify(client)) as typeof client];

  const failures = checkStops(doc as unknown as Artifact);
  for (const label of ['dwell', 'shots']) {
    assert.ok(
      failures.some(
        (line) => line.includes(`${before + 1} Clients but ${before}`) && line.includes(label),
      ),
      `the ${label} list must be held to the tree's Client count: ${failures.join('; ')}`,
    );
  }
});

test('the CLI exits 1 on an artifact whose Shot no longer contains its widest orbit', () => {
  // `writeTemp`, never the real artifact path — the iteration-2 requirement.
  const doc = stripBanner(JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'))) as Artifact;
  const drifted = {
    ...doc,
    shots: doc.shots.map((shot) => ({ ...shot, distance: 1 })),
  } as unknown as Artifact;

  const result = runIndex('--check', writeTemp(serializeArtifact(drifted)));
  assert.equal(result.status, 1, `expected exit 1, got ${result.status}
${result.stderr}`);
  assert.match(result.stderr, /client:sncf/, 'the failure must name the badly framed Client');
  assert.match(result.stderr, /orbits at/, 'and must state the orbit it fails to contain');
});

test('the gate would catch the Dwell and Shot drift it is asserted against, mutation by mutation', () => {
  // Pins the assertion itself. A `checkStops` returning `[]` unconditionally —
  // or a `checkArtifact` that never called it — would leave every assertion
  // above green if any of them checked only that *some* line came back.
  const base = JSON.parse(JSON.stringify(artifactOf(...opposedEntries()))) as Artifact;
  assert.deepEqual(checkStops(base), [], 'the unmutated artifact must pass');

  const project = base.clients[0]?.projects[0];
  assert.ok(project !== undefined);

  const mutations: [string, (doc: Artifact) => Artifact][] = [
    ['a dropped Dwell entry', (d) => ({ ...d, dwell: d.dwell.slice(1) })],
    ['a dropped Shot', (d) => ({ ...d, shots: d.shots.slice(1) })],
    ['an emptied Dwell list', (d) => ({ ...d, dwell: [] })],
    ['an emptied Shot list', (d) => ({ ...d, shots: [] })],
    ['a duplicated Dwell entry', (d) => ({ ...d, dwell: [...d.dwell, d.dwell[0]!] })],
    ['a duplicated Shot', (d) => ({ ...d, shots: [...d.shots, d.shots[0]!] })],
    ['an invented Dwell subject', (d) => ({ ...d, dwell: [...d.dwell, { ...d.dwell[0]!, subject: 'client:nobody' }] })],
    ['an invented Shot subject', (d) => ({ ...d, shots: [...d.shots, { ...d.shots[0]!, subject: 'client:nobody' }] })],
    ['a Project given a Dwell', (d) => ({ ...d, dwell: [...d.dwell, { ...d.dwell[0]!, subject: project.id }] })],
    ['a Project given a Shot', (d) => ({ ...d, shots: [...d.shots, { ...d.shots[0]!, subject: project.id }] })],
    ['a dropped Rail stop', (d) => ({ ...d, rail: d.rail.slice(1) })],
    ['an emptied Rail', (d) => ({ ...d, rail: [] })],
    ['a duplicated Rail stop', (d) => ({ ...d, rail: [...d.rail, d.rail[0]!] })],
    ['an invented Rail stop', (d) => ({ ...d, rail: [...d.rail, 'client:nobody'] })],
    ['a Project given a Rail stop', (d) => ({ ...d, rail: [...d.rail, project.id] })],
    // An entity-tree mutation rather than a list one: two Clients sharing an ID
    // collapse to a single key, and the collapsed tree then agrees with lists
    // naming that ID once. `entities.ts` throws on this at derive time, but the
    // gate never derives (AD-1).
    ['a Client ID carried twice', (d) => ({ ...d, clients: [...d.clients, { ...d.clients[0]! }] })],
    // Containment: the subject set, the cardinality and the schema all stay
    // valid — only the distance moves inside the orbit it must contain.
    ['a Shot framed inside its widest orbit', (d) => ({
      ...d,
      shots: d.shots.map((shot) => ({ ...shot, distance: Number.MIN_VALUE })),
    })],
    ['a Shot framed exactly at its widest orbit', (d) => ({
      ...d,
      shots: d.shots.map((shot) => {
        const client = d.clients.find((candidate) => candidate.id === shot.subject);
        // Exactly at the orbit is not containment: the Project sits on the
        // frame edge. `>` rather than `>=` is what this pins.
        const widest = Math.max(...(client?.projects ?? []).map((project) => project.railDistance));
        return { ...shot, distance: widest };
      }),
    })],
  ];

  for (const [label, mutate] of mutations) {
    assert.notDeepEqual(
      checkStops(mutate(base)),
      [],
      `${label} must be rejected — an assertion that accepts it is asserting nothing`,
    );
  }
});

test('the pre-write guard rejects an artifact whose Dwell, Shot or Rail list diverged', () => {
  // `checkEmittedArtifact` is the seam `runPipeline` runs before serializing.
  // Its branches are unreachable with any authored `career.json` — the emitter
  // builds both lists from the graph the check counts against — so the only way
  // to exercise them is to hand it the document a future emitter bug would
  // produce. That is the bug this guard exists to stop reaching disk.
  const sound = artifactOf(...opposedEntries());
  assert.deepEqual(checkEmittedArtifact(sound), [], 'a soundly emitted artifact must pass');

  for (const field of ['dwell', 'shots', 'rail'] as const) {
    const dropped = { ...sound, [field]: sound[field].slice(0, -1) } as Artifact;
    const failures = checkEmittedArtifact(dropped);
    assert.ok(failures.length > 0, `a dropped ${field} entry must not reach serialization`);
    assert.ok(
      failures.some((line) => /disagrees with its Clients/.test(line)),
      `and it must be reported as a ${field} divergence, not a schema failure`,
    );
  }
});

test('the gate asserts the Dwell and Shot lists after the schema and before the bytes', () => {
  // The source scan, kept alongside the behavioural tests rather than in place
  // of them. It catches a reordering the fixtures happen not to separate; the
  // running tests catch one they do.
  const source = readFileSync(INDEX_TS, 'utf8');
  const body = source.slice(
    source.indexOf('export function checkArtifact'),
    source.indexOf('function main('),
  );
  assert.ok(body.length > 0, 'the scan must find the function');

  const schemaAt = body.indexOf('parseArtifact');
  const stopsAt = body.indexOf('checkStops');
  const bytesAt = body.indexOf('startsWith');
  assert.ok(schemaAt >= 0 && stopsAt >= 0 && bytesAt >= 0, 'all three checks must be present');
  assert.ok(schemaAt < stopsAt, 'the schema is validated before the stop lists');
  assert.ok(stopsAt < bytesAt, 'and the stop lists before the byte checks');
});

test('a schema-malformed artifact reports its schema failure, not a stop-list one', () => {
  // The same ordering claim the destination set carries, observed by **running**
  // the gate. An artifact broken in both ways at once is the only input that can
  // tell the two orderings apart.
  const { doc, write } = stopFixture();
  doc.dwell = doc.dwell.slice(1);
  const project = doc.clients[0]?.projects[0] as Record<string, unknown> | undefined;
  assert.ok(project !== undefined);
  delete project['timeAxis'];

  const failures = checkArtifact(write());
  assert.ok(
    failures.some((line) => /failed its schema/.test(line)),
    `the schema failure must be the one reported: ${failures.join('\n')}`,
  );
  assert.equal(
    failures.some((line) => /disagrees with its Clients/.test(line)),
    false,
    'the stop-list complaint must not pre-empt the schema one',
  );
});

test('a stop-divergent artifact reports the divergence, not a byte failure', () => {
  const { doc, write } = stopFixture();
  doc.shots = doc.shots.slice(1);
  const crlf = readFileSync(write(), 'utf8').replace(/\n/g, '\r\n');

  const failures = checkArtifact(writeTemp(crlf));
  assert.ok(
    failures.some((line) => /disagrees with its Clients/.test(line)),
    `the structural failure must be the one reported: ${failures.join('\n')}`,
  );
  assert.equal(
    failures.some((line) => /CRLF/.test(line)),
    false,
    'the byte complaint must not pre-empt the structural one',
  );
});

test('the stop check still never solves', () => {
  // Counted from the artifact's own `clients` tree. A gate that re-derived the
  // graph to compare against would make the committed document a cache rather
  // than a contract (AD-1).
  const source = readFileSync(INDEX_TS, 'utf8');
  const body = source.slice(source.indexOf('export function checkStops'), source.indexOf('export function checkArtifact'));
  assert.ok(body.length > 0, 'the scan must find the function');
  assert.doesNotMatch(
    body,
    /runPipeline|writeFileSync|solveLayout|buildArtifact|deriveEntities|buildDwell|buildShots|buildRail|deriveDwell|inRailOrder/,
    'the gate may not solve, derive, or write',
  );
});

test('a schema-malformed artifact reports its schema failure, not a cardinality one', () => {
  // The ordering, observed by **running** the gate rather than by reading the
  // source. An artifact broken in both ways at once is the only input that can
  // tell the two orderings apart: a malformed document must report its real
  // failure, because a cardinality complaint derived from a half-parsed tree
  // sends the reader after the wrong problem.
  const { doc, write } = gateFixture();

  // Divergent *and* malformed: a Project loses `timeAxis` while the destination
  // set loses an entry, so both checks have something to say.
  doc.destinations = doc.destinations.slice(1);
  const project = doc.clients[0]?.projects[0] as Record<string, unknown> | undefined;
  assert.ok(project !== undefined);
  delete project['timeAxis'];

  const failures = checkArtifact(write());
  assert.notDeepEqual(failures, [], 'a doubly-broken artifact must fail the gate');
  assert.ok(
    failures.some((line) => /failed its schema/.test(line)),
    `the schema failure must be the one reported: ${failures.join('\n')}`,
  );
  assert.ok(
    failures.some((line) => /clients\.0\.projects\.0\.timeAxis/.test(line)),
    `and it must name the failing path: ${failures.join('\n')}`,
  );
  assert.equal(
    failures.some((line) => /destination set/.test(line)),
    false,
    'the cardinality complaint must not pre-empt the schema one',
  );
});

test('a destination-divergent artifact reports cardinality, not a byte failure', () => {
  // The other half of the ordering, also by running it. This artifact is
  // divergent *and* carries CRLF, so both the cardinality check and the byte
  // check have something to say — a structural fault must not be reported as a
  // formatting one.
  const { doc, write } = gateFixture();
  doc.destinations = doc.destinations.slice(1);
  const crlf = readFileSync(write(), 'utf8').replace(/\n/g, '\r\n');

  const failures = checkArtifact(writeTemp(crlf));
  assert.notDeepEqual(failures, [], 'a doubly-broken artifact must fail the gate');
  assert.ok(
    failures.some((line) => /destination set/.test(line)),
    `the cardinality failure must be the one reported: ${failures.join('\n')}`,
  );
  assert.equal(
    failures.some((line) => /CRLF/.test(line)),
    false,
    'the byte complaint must not pre-empt the structural one',
  );
});

test('the pre-write guard rejects an artifact whose destination set diverged', () => {
  // `checkEmittedArtifact` is the seam `runPipeline` runs before serializing.
  // Both its branches are unreachable with any authored `career.json` — the
  // emitter builds the set from the graph the check counts against — so the
  // only way to exercise them is to hand it the document a future emitter bug
  // would produce. That is the bug this guard exists to stop reaching disk.
  const sound = artifactOf(...opposedEntries());
  assert.deepEqual(
    checkEmittedArtifact(sound),
    [],
    'a soundly emitted artifact must pass, or every assertion below is vacuous',
  );

  const dropped = { ...sound, destinations: sound.destinations.slice(0, -1) };
  const failures = checkEmittedArtifact(dropped as Artifact);
  assert.ok(failures.length > 0, 'a dropped destination must not reach serialization');
  assert.ok(
    failures.some((line) => /disagrees with its entities/.test(line)),
    'and it must be reported as a destination divergence, not a schema failure',
  );
});

test('runPipeline consults the pre-write guard before it serializes', () => {
  // The test above pins the guard; this one pins that the pipeline calls it.
  // Without this, the whole block could be deleted from `runPipeline` with the
  // suite still green — the emitter would write the broken artifact and the
  // build gate would only reject it afterwards, which is the ordering the guard
  // exists to prevent.
  const source = readFileSync(INDEX_TS, 'utf8');
  const body = source.slice(
    source.indexOf('export function runPipeline'),
    source.indexOf('export function checkArtifact'),
  );
  assert.ok(body.length > 0, 'the scan must find runPipeline');

  // Anchored on the call, not the bare name: a doc comment mentioning the
  // function would satisfy a name scan with the call itself deleted.
  const guardAt = body.indexOf('checkEmittedArtifact(artifact)');
  const serializeAt = body.indexOf('serializeArtifact');
  assert.ok(guardAt >= 0, 'runPipeline must consult the pre-write guard');
  assert.ok(serializeAt >= 0, 'and it must serialize');
  assert.ok(guardAt < serializeAt, 'the guard runs before the bytes are produced');
});

test('the gate asserts the destination set after the schema and before the bytes', () => {
  // The source scan, kept alongside the two behavioural tests above rather than
  // in place of them. It catches a reordering that the fixtures happen not to
  // separate; the running tests catch one they do.
  const source = readFileSync(INDEX_TS, 'utf8');
  const body = source.slice(
    source.indexOf('export function checkArtifact'),
    source.indexOf('function main('),
  );
  assert.ok(body.length > 0, 'the scan must find the function');

  const schemaAt = body.indexOf('parseArtifact');
  const destinationsAt = body.indexOf('checkDestinations');
  const bytesAt = body.indexOf('startsWith');
  assert.ok(schemaAt >= 0 && destinationsAt >= 0 && bytesAt >= 0, 'all three checks must be present');
  assert.ok(schemaAt < destinationsAt, 'the schema is validated before the destination set');
  assert.ok(destinationsAt < bytesAt, 'and the destination set before the byte checks');
});

test('the gate still never solves, now that it counts entities', () => {
  // The counting is done from the artifact's own `clients` tree. A gate that
  // re-derived the graph to compare against would make the committed document a
  // cache rather than a contract (AD-1) — and would pass on an artifact whose
  // entities had drifted from the data, which is a different check entirely.
  const source = readFileSync(INDEX_TS, 'utf8');
  const body = source.slice(
    source.indexOf('export function checkDestinations'),
    source.indexOf('function main('),
  );
  assert.ok(body.length > 0, 'the scan must find both functions');
  assert.doesNotMatch(
    body,
    /runPipeline|writeFileSync|solveLayout|buildArtifact|deriveEntities|buildDestinations/,
    'the gate may not solve, derive, or write',
  );
});

test('the gate passes on the committed artifact and does not touch its bytes', () => {
  const before = readFileSync(ARTIFACT_PATH, 'utf8');
  assert.deepEqual(checkArtifact(), [], 'the committed artifact must pass its own gate');
  assert.equal(readFileSync(ARTIFACT_PATH, 'utf8'), before, 'the gate reads and never writes');
});

test('the gate never solves, whatever the artifact says', () => {
  // Read off the source: `checkArtifact` must not reach the pipeline. A gate
  // that regenerated a missing artifact would make every solve implicit and the
  // committed document a cache rather than a contract (AD-1).
  const source = readFileSync(INDEX_TS, 'utf8');
  const body = source.slice(source.indexOf('export function checkArtifact'), source.indexOf('function main('));
  assert.ok(body.length > 0, 'the scan must find the function');
  assert.doesNotMatch(body, /runPipeline|writeFileSync|solveLayout|buildArtifact/, 'the gate may not solve or write');
});

// --- AD-1: the build must not reach the solve, at any depth ------------------

test('no path through `build` reaches `solve`, however deep the indirection', () => {
  // Walks the script graph transitively rather than grepping `build` for the
  // word "solve". `build` could call `gate`, which could call `prebuild`, which
  // could call `solve` — and a single-level assertion would call that clean.
  const manifest = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as {
    scripts: Record<string, string>;
  };
  const scripts = manifest.scripts;

  assert.ok(typeof scripts['solve'] === 'string', 'the solve script must exist');
  assert.ok(typeof scripts['build'] === 'string', 'the build script must exist');

  /** Every script name an `npm run` / `npm-run-all` invocation in a body names. */
  const invoked = (body: string): string[] =>
    [...body.matchAll(/npm(?:\s+-{1,2}\S+)*\s+run(?:-script)?\s+([\w:-]+)/g)].map((m) => m[1] ?? '');

  const reached = new Set<string>();
  const walk = (name: string): void => {
    if (reached.has(name)) return;
    reached.add(name);
    // npm's own implicit pre/post hooks are edges too — a `prebuild` calling the
    // solve is invoked by `npm run build` with nothing in `build`'s own body.
    for (const related of [`pre${name}`, name, `post${name}`]) {
      const body = scripts[related];
      if (body === undefined) continue;
      if (related !== name) reached.add(related);
      for (const next of invoked(body)) walk(next);
    }
  };
  walk('build');

  assert.equal(
    reached.has('solve'),
    false,
    `\`build\` reaches \`solve\` through: ${[...reached].join(' → ')}`,
  );

  // And the emitter is not reachable by its path either, bypassing the script
  // graph entirely. `--check` is the gate and is permitted.
  for (const name of reached) {
    const body = scripts[name] ?? '';
    for (const invocation of body.split('&&')) {
      if (!/src[\\/]derive[\\/]index\.ts/.test(invocation)) continue;
      assert.match(
        invocation,
        /--check/,
        `\`${name}\` invokes the emitter without --check, so the build would solve: ${invocation}`,
      );
    }
  }
});

test('the walk would catch a build that reaches the solve indirectly', () => {
  // Pins the walk itself. Without this, a walk with a broken regex would report
  // every manifest clean and the AD-1 assertion above would be decorative.
  const scripts: Record<string, string> = {
    build: 'npm run gate && vite build',
    gate: 'npm run prep',
    prep: 'npm run solve',
    solve: 'node src/derive/index.ts',
  };

  const invoked = (body: string): string[] =>
    [...body.matchAll(/npm(?:\s+-{1,2}\S+)*\s+run(?:-script)?\s+([\w:-]+)/g)].map((m) => m[1] ?? '');
  const reached = new Set<string>();
  const walk = (name: string): void => {
    if (reached.has(name)) return;
    reached.add(name);
    for (const related of [`pre${name}`, name, `post${name}`]) {
      const body = scripts[related];
      if (body === undefined) continue;
      for (const next of invoked(body)) walk(next);
    }
  };
  walk('build');

  assert.equal(reached.has('solve'), true, 'the walk must follow indirection three levels deep');
});

// --- No clock, no randomness, no environment --------------------------------

test('neither index.ts nor artifact.ts reads a clock, a random, or the environment', () => {
  // Read off the source, because a `new Date()` on a branch the fixtures do not
  // reach would leave every assertion above green.
  for (const path of [INDEX_TS, ARTIFACT_TS]) {
    const code = stripComments(readFileSync(path, 'utf8'));
    assert.doesNotMatch(code, /new\s+Date\b/, `no clock read in ${path}`);
    assert.doesNotMatch(code, /Date\s*\.\s*now/, `no clock read in ${path}`);
    assert.doesNotMatch(code, /Math\s*\.\s*random/, `no Math.random in ${path}`);
    assert.doesNotMatch(code, /process\s*\.\s*env/, `no environment read in ${path}`);
  }
});

test('artifact.ts is pure: no filesystem, no process, no exit', () => {
  // The split that makes content parity assertable in memory. `index.ts` owns
  // reading, writing, and exit codes.
  const source = readFileSync(ARTIFACT_TS, 'utf8');
  assert.doesNotMatch(source, /node:fs|writeFileSync|readFileSync/, 'no I/O in the assembler');
  assert.doesNotMatch(source, /process\s*\./, 'no ambient process state in the assembler');
});

test('the assembler computes nothing a rule could own', () => {
  // AD-3. Every derived value the artifact carries was resolved by
  // `deriveEntities` or `solveLayout`; the assembler looks them up. A mapping
  // computed here would be a fourth rule in a file nobody is watching for one.
  const source = readFileSync(ARTIFACT_TS, 'utf8');
  const code = stripComments(source);
  assert.doesNotMatch(code, /\bderive[A-Z]/, 'the assembler must not call a rule');
  assert.doesNotMatch(code, /recencyOf|durationInMonths/, 'nor re-derive from a duration');
  assert.doesNotMatch(code, /duration/, 'nor read an authored duration at all');
});

// --- The version and the closed schema --------------------------------------

test('the artifact carries destinations, dwell, shots and rail at this version', () => {
  // `rail` was on the forbidden list until Story 2.1, exactly as `dwell` and
  // `shots` were until 1.7 and `destinations` until 1.6. Each assertion
  // **inverts rather than being deleted**, so a regression that dropped a field
  // again fails here as loudly as adding one early once did.
  const contents = serializeArtifact(artifactOf(...opposedEntries()));
  for (const emitted of ['destinations', 'dwell', 'shots', 'rail']) {
    assert.match(contents, new RegExp(`"${emitted}"`), `the ${emitted} list ships at this version`);
  }
});

test('the emitted dwell and shots lists are Client-granular, and name no Project', () => {
  // AD-4a, carried into the emitted document: the Rail stops at Clients. Built
  // per-Project the Rail stops at ~15 Bodies instead of ~5 Clients, and the
  // error stays invisible until the camera exists.
  const artifact = artifactOf(
    ...opposedEntries(),
    { ...baseEntry(), client: 'Alpha', project: 'Second', weight: 2 },
  );
  const clientIds = artifact.clients.map((client) => client.id);
  const projectIds = allProjects(artifact).map((project) => project.id);
  assert.ok(projectIds.length > clientIds.length, 'the fixture must hold more Projects than Clients');

  for (const [label, subjects] of [
    ['dwell', artifact.dwell.map((entry) => entry.subject)],
    ['shots', artifact.shots.map((shot) => shot.subject)],
  ] as const) {
    assert.deepEqual(
      [...subjects].sort(),
      [...clientIds].sort(),
      `${label} must carry exactly one entry per Client`,
    );
    for (const id of projectIds) {
      assert.equal(subjects.includes(id), false, `"${id}" is a Project and must have no ${label} entry`);
    }
  }
});

test('no emitted Shot carries a world coordinate', () => {
  // FR-17, asserted against the serialized bytes as well as the object, because
  // that is what a consumer reads.
  const artifact = artifactOf(...opposedEntries());
  for (const shot of artifact.shots) {
    assert.deepEqual(
      Object.keys(shot).sort(),
      ['angle', 'distance', 'framing', 'subject'],
      'exactly the four declared fields',
    );
  }

  // The `shots` block of the file, isolated so a coordinate elsewhere in the
  // document — every Body legitimately carries one — cannot mask one here.
  const contents = serializeArtifact(artifact);
  const block = contents.slice(contents.indexOf('"shots"'));
  assert.ok(block.length > 0, 'the scan must find the shots block');
  assert.doesNotMatch(block, /"[xyz]"|"position"|"target"|"lookAt"/, 'no world coordinate in any Shot');
});

test('every emitted Shot distance contains its Client’s widest orbit', () => {
  // The acceptance criterion, asserted on the *artifact* rather than only on the
  // module: the containment has to survive assembly, not merely hold inside
  // `buildShots`.
  const artifact = artifactOf(
    ...opposedEntries(),
    { ...baseEntry(), client: 'Alpha', project: 'Wide', weight: 0.05 },
  );
  const byId = new Map(artifact.clients.map((client) => [client.id, client]));

  for (const shot of artifact.shots) {
    const client = byId.get(shot.subject);
    assert.ok(client !== undefined, `"${shot.subject}" must resolve to a Client`);
    const widest = Math.max(...client.projects.map((project) => project.railDistance));
    assert.ok(
      shot.distance > widest,
      `"${shot.subject}" orbits out to ${widest} but is framed at ${shot.distance}`,
    );
  }
});

test('a Deep-bearing Client is held longer than a Shallow-only one in the emitted artifact', () => {
  const shallowEntry = { ...baseEntry(), client: 'Plain', project: 'P', notable: '' };
  const artifact = artifactOf(
    { ...baseEntry(), client: 'Rich', project: 'R', notable: 'Problem stated. [[The constraint, in one sentence.]] The decision taken.' },
    shallowEntry,
  );
  const tempoOf = (name: string): string => {
    const client = artifact.clients.find((candidate) => candidate.name === name);
    assert.ok(client !== undefined);
    const entry = artifact.dwell.find((candidate) => candidate.subject === client.id);
    assert.ok(entry !== undefined, `"${client.id}" must have a Dwell entry`);
    return entry.tempo;
  };

  // Direction, not difference. `notEqual` passed on a pair that was merely
  // distinct, so it would have held just as well with the two tempos swapped —
  // and the AC says the Deep-bearing stop ranks *strictly longer*, which only a
  // comparison against the shortest-first order of `DWELL_TEMPOS` can state.
  const rankOf = (name: string): number => {
    const rank = DWELL_TEMPOS.indexOf(tempoOf(name) as (typeof DWELL_TEMPOS)[number]);
    assert.ok(rank >= 0, `"${tempoOf(name)}" must be one of the declared tempo classes`);
    return rank;
  };

  assert.ok(
    rankOf('Rich') > rankOf('Plain'),
    `the Deep-bearing stop must rank strictly longer, but "${tempoOf('Rich')}" does not outrank "${tempoOf('Plain')}"`,
  );
  assert.doesNotMatch(tempoOf('Rich'), /\d/, 'and the tempo is a class, never a duration');
});

// --- The CLI contract -------------------------------------------------------

/** Runs the real script as a subprocess — the only place exit codes are visible. */
function runIndex(...args: string[]): { status: number; stderr: string; stdout: string } {
  try {
    const stdout = execFileSync(process.execPath, [INDEX_TS, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? -1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

test('the CLI exits 0 and rewrites the artifact identically', () => {
  // This is the one test that runs the emitter against its real output path —
  // `index.ts`'s path argument is the *input* seam, so no argument can redirect
  // the write. The bytes are restored in a `finally` because the failure this
  // test exists to catch is precisely the one that leaves them wrong: without it
  // a regression writes a bad artifact, the assertion throws, and the next run
  // silently repairs the file and passes, erasing the evidence.
  const before = readFileSync(ARTIFACT_PATH, 'utf8');
  try {
    const result = runIndex();
    assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stderr}`);
    assert.equal(
      readFileSync(ARTIFACT_PATH, 'utf8'),
      before,
      'a re-solve must not change the bytes',
    );
  } finally {
    writeFileSync(ARTIFACT_PATH, before);
  }
});

test('the CLI exits 1 and writes nothing on invalid data', () => {
  // The exit code is the script's only externally observable behaviour, and the
  // in-process tests never see it — changing `process.exit(1)` to `process.exit(0)`
  // leaves them all green.
  const entry = baseEntry();
  delete entry['duration'];
  const path = writeTemp(JSON.stringify({ asOf: AS_OF, projects: [entry] }));

  const before = readFileSync(ARTIFACT_PATH, 'utf8');
  const result = runIndex(path);
  assert.equal(result.status, 1, `expected exit 1, got ${result.status}`);
  assert.match(result.stderr, /duration/, 'the failure must reach stderr');
  assert.equal(
    readFileSync(ARTIFACT_PATH, 'utf8'),
    before,
    'a failed run must leave the committed artifact untouched',
  );
});

test('the --check branch exits 0 against the committed artifact', () => {
  const result = runIndex('--check');
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stderr}`);
});

test('importing the module does not run it', () => {
  // `main()` is guarded by the `process.argv[1]` idiom, so this suite importing
  // `runPipeline` and `checkArtifact` above did not write the artifact or exit.
  const source = readFileSync(INDEX_TS, 'utf8');
  assert.match(
    source,
    /if \(process\.argv\[1\] === fileURLToPath\(import\.meta\.url\)\)/,
    'main() must be guarded so an import never exits the importing process',
  );
});

// --- Temp-file helpers -------------------------------------------------------

let scratch: string | undefined;
let scratchCount = 0;

function tempDir(): string {
  scratch ??= mkdtempSync(join(tmpdir(), 'artifact-'));
  return scratch;
}

function writeTemp(contents: string): string {
  scratchCount += 1;
  const path = join(tempDir(), `fixture-${scratchCount}.json`);
  writeFileSync(path, contents);
  return path;
}


// --- The import-boundary gate, wired ------------------------------------------

/**
 * A throwaway `src/`-shaped tree, with every governed directory present so the
 * rule-coverage check never fires for a directory the fixture simply did not
 * need. Mirrors `treeOf` in `boundaries.test.ts`; kept local because what is
 * under test here is the *wiring*, not the checker.
 */
function sourceTree(files: Record<string, string>): string {
  scratchCount += 1;
  const root = join(tempDir(), `src-${scratchCount}`);
  for (const [rel, contents] of Object.entries(files)) {
    const path = join(root, ...rel.split('/'));
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, contents);
  }
  for (const rule of BOUNDARY_RULES) mkdirSync(join(root, rule.directory), { recursive: true });
  return root;
}

test('the gate reports an import-boundary violation in the source root it is given', () => {
  // The behavioural half of the wiring. Until review iteration 1 `checkArtifact`
  // called `checkImportBoundaries()` argument-less, so this test could not be
  // written at all: there was no way to hand the gate a tree, and every artifact
  // fixture silently depended on the state of the working `src/`.
  const clean = sourceTree({ 'derive/x.ts': 'export const x = 1;\n' });
  assert.deepEqual(checkArtifact(ARTIFACT_PATH, clean), [], 'the committed artifact passes against a clean tree');

  const violating = sourceTree({ 'shell/entry.ts': "import { s } from '../data/schema.ts';\n" });
  const failures = checkArtifact(ARTIFACT_PATH, violating);
  assert.ok(failures.length > 0, 'a boundary violation must fail the gate');
  assert.match(failures[0] ?? '', /violates the import boundaries/, 'and say so in the header');
  assert.ok(
    failures.some((line) => /shell\/entry\.ts:1/.test(line) && line.includes('../data/schema.ts')),
    `naming the file, the line and the specifier: ${failures.join(' | ')}`,
  );
});

test('the gate defaults its source root to src/ itself, not to a directory inside it', () => {
  // The seam above lets a test hand the gate a fixture tree. What no test above
  // pins is the value the seam defaults to — and the shipped gate only ever uses
  // the default: `main()` passes an artifact path and never a source root.
  //
  // Narrowing that default to a real subdirectory (`src/derive/`) leaves every
  // other test green while the `src/data/` ban silently stops covering the five
  // consumer directories. Verdicts cannot catch it — a healthy tree is clean at
  // either root — so this pins reach instead: the default must see every
  // governed directory, and a narrowed root demonstrably does not.
  const seenFrom = (root: string): number =>
    BOUNDARY_RULES.filter((rule) => existsSync(join(root, rule.directory))).length;

  const narrowed = join(SRC_ROOT, 'derive');
  assert.ok(
    seenFrom(narrowed) < BOUNDARY_RULES.length,
    'the narrowed root must see fewer governed directories, or this pin proves nothing',
  );

  // Plant a violation the real root must see and the narrowed root cannot, in a
  // scratch tree rather than in the working `src/` — writing into the live tree
  // races the suite's own module loading.
  const planted = sourceTree({ 'shell/entry.ts': "import { s } from '../data/schema.ts';\n" });
  assert.ok(
    checkArtifact(ARTIFACT_PATH, planted).length > 0,
    'a src/-rooted scan must catch a shell -> data import',
  );
  assert.deepEqual(
    checkArtifact(ARTIFACT_PATH, join(planted, 'derive')),
    [],
    'and a derive-rooted scan must miss it — which is exactly what a narrowed default would do',
  );

  // So the default must be the wide root. Read it off the shipped signature
  // rather than from a verdict, because on a clean tree both roots return [].
  const source = readFileSync(INDEX_TS, 'utf8');
  const signature = source.slice(
    source.indexOf('export function checkArtifact'),
    source.indexOf('{', source.indexOf('export function checkArtifact')),
  );
  assert.match(
    signature,
    /sourceRoot:\s*string\s*=\s*SRC_ROOT\s*\)/,
    `the gate's default source root must be SRC_ROOT itself, got: ${signature.trim()}`,
  );
});

test('deleting the boundary call from the gate is caught here, not only by boundaries.test.ts', () => {
  // The mutation that motivated these two tests: at review iteration 1 the whole
  // block could be deleted from `checkArtifact` with all 340 tests green, while
  // `npm run gate` went on reporting success against a real AD-3 violation.
  // `boundaries.test.ts` stays green either way because it never goes through
  // the gate — so the call itself is asserted here.
  const source = readFileSync(INDEX_TS, 'utf8');
  const body = source.slice(source.indexOf('export function checkArtifact'), source.indexOf('function main('));
  assert.ok(body.includes('checkImportBoundaries'), 'checkArtifact must call the boundary check');
  assert.ok(
    /checkImportBoundaries\(\s*sourceRoot\s*\)/.test(body),
    'and pass the source root through, or the gate is untestable against a fixture',
  );
});

test('the gate asserts the import boundaries after the stop lists and before the bytes', () => {
  // The third row of the ordering scan the two sibling checks already carry. The
  // comment in `index.ts` claimed this ordering was "pinned by a test" before one
  // existed; this is that test.
  const source = readFileSync(INDEX_TS, 'utf8');
  const body = source.slice(source.indexOf('export function checkArtifact'), source.indexOf('function main('));
  const stopsAt = body.indexOf('checkStops');
  const boundariesAt = body.indexOf('checkImportBoundaries');
  const bytesAt = body.indexOf('startsWith');
  assert.ok(stopsAt >= 0 && boundariesAt >= 0 && bytesAt >= 0, 'all three must be present');
  assert.ok(stopsAt < boundariesAt, 'a wrong-shaped artifact reports that, not a boundary violation');
  assert.ok(boundariesAt < bytesAt, 'and a boundary violation is not a formatting fault');
});

// --- Story 3.12: the gate's source checks and content checks ------------------

interface LoosePosition { x: number; y: number; z: number }
interface LooseDoc {
  asOf: string;
  sourceDigest: string;
  rail: string[];
  destinations: unknown[];
  dwell: unknown[];
  shots: unknown[];
  clients: {
    id: string;
    position: LoosePosition;
    projects: {
      id: string;
      clientId: string;
      isDeep: boolean;
      position: LoosePosition;
      orbitNormal: LoosePosition;
      content: Record<string, unknown>;
    }[];
  }[];
}

/**
 * The entries the source pair is solved from: the opposing fixture plus a second
 * Alpha Project, so one Client carries two Planets (the Planet-coincidence row
 * needs a pair sharing a Star) and the Rail order differs from `clients[]`.
 */
function pairEntries(): Record<string, unknown>[] {
  return [
    ...opposedEntries(),
    { ...baseEntry(), client: 'Alpha', project: 'Second', duration: { start: '2015-01', end: '2016-01' }, notable: null },
  ];
}

/**
 * A `career.json` temp file and the artifact solved from it by the real
 * pipeline, as a mutable document plus a writer. The pair `checkGate` reads —
 * never the committed files, which no mutation here may touch.
 */
function sourcePair(entries: Record<string, unknown>[] = pairEntries()): {
  careerPath: string;
  doc: LooseDoc;
  write: () => string;
} {
  const careerPath = writeTemp(`${JSON.stringify({ asOf: AS_OF, projects: entries }, null, 2)}\n`);
  const result = runPipeline(careerPath);
  assert.ok(result.ok, `the pair must solve: ${result.ok ? '' : result.failures.join('\n')}`);
  const doc = stripBanner(JSON.parse(result.contents)) as LooseDoc;
  return { careerPath, doc, write: () => writeTemp(serializeArtifact(doc as unknown as Artifact)) };
}

test('the source pair passes the whole gate before it is broken, or every mutation below is vacuous', () => {
  const { careerPath, write } = sourcePair();
  assert.deepEqual(checkGate(write(), careerPath), [], 'the unbroken pair must pass both halves of the gate');
});

test('sourceDigest is the sha256 of career.json with CRLF normalised to LF', () => {
  const lf = '{\n  "asOf": "2026-09"\n}\n';
  assert.match(sourceDigestOf(lf), /^[0-9a-f]{64}$/, 'lowercase hex, 64 characters');
  assert.equal(sourceDigestOf(lf.replace(/\n/g, '\r\n')), sourceDigestOf(lf), "a checkout's line endings cannot change it");
  assert.notEqual(sourceDigestOf(lf.replace('09', '10')), sourceDigestOf(lf), 'every other byte counts');
});

test('the solve records the digest of the career.json it read', () => {
  const { careerPath, doc } = sourcePair();
  assert.equal(doc.sourceDigest, sourceDigestOf(readFileSync(careerPath, 'utf8')));
});

test('the gate fails on a career.json that validate rejects, with validate\'s own lines', () => {
  const { write } = sourcePair();
  const bad = pairEntries();
  bad[0] = { ...bad[0], notabel: 'x' };
  const badCareer = writeTemp(JSON.stringify({ asOf: AS_OF, projects: bad }));

  const failures = checkGate(write(), badCareer);
  assert.ok(
    failures.some((line) => /failed validation/.test(line) && line.includes(badCareer)),
    `the validation failure must be named, with the file that failed: ${failures.join('\n')}`,
  );
  assert.ok(
    failures.some((line) => line.includes('Alpha — A') && /notabel/.test(line)),
    `with the entry and the key, as validate prints them: ${failures.join('\n')}`,
  );
});

test('the CLI exits 1 on --check <artifact> <bad career>, so build stops before vite build', () => {
  const { write } = sourcePair();
  const bad = pairEntries();
  bad[0] = { ...bad[0], notabel: 'x' };
  const badCareer = writeTemp(JSON.stringify({ asOf: AS_OF, projects: bad }));

  const result = runIndex('--check', write(), badCareer);
  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stderr}`);
  assert.match(result.stderr, /notabel/, 'the unknown key must reach stderr');
});

test('the shipped --check holds the artifact against the real career.json', () => {
  // No career argument: the gate must read `src/data/career.json`. An artifact
  // identical to the committed one but for its digest fails, naming that path —
  // which only happens if the source half ran against the real file.
  const doc = stripBanner(JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'))) as LooseDoc;
  doc.sourceDigest = '0'.repeat(64);

  const result = runIndex('--check', writeTemp(serializeArtifact(doc as unknown as Artifact)));
  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stderr}`);
  assert.match(result.stderr, /sourceDigest 0{64} in the artifact/, 'the stale digest must be named');
  assert.ok(result.stderr.includes(SHIPPED_CAREER_JSON), `and the real career.json: ${result.stderr}`);
  assert.ok(
    result.stderr.includes(sourceDigestOf(readFileSync(SHIPPED_CAREER_JSON, 'utf8'))),
    'with the digest of the committed source',
  );
});

test('the CLI refuses any argument it does not know, so no flag can skip the source half', () => {
  // Behavioural, not a scan of `main`'s text: whatever a bypass flag were
  // called, the CLI must refuse it rather than run a gate that seems to honour it.
  const { careerPath, write } = sourcePair();
  const artifact = write();
  assert.equal(runIndex('--check', artifact, careerPath).status, 0, 'the sound pair passes, or the refusals below are vacuous');

  const refused: string[][] = [
    ['--check', '--skip-source', artifact, careerPath],
    ['--check', artifact, '--artifact-only'],
    ['--check', '--fast'],
    ['--check', artifact, careerPath, writeTemp('{}')],
    ['--check', '--check'],
    ['--check', '-a', careerPath],
    ['--check', '', careerPath],
  ];
  for (const args of refused) {
    const result = runIndex(...args);
    assert.equal(result.status, 1, `${JSON.stringify(args)} must exit 1, got ${result.status}`);
    assert.match(result.stderr, /unexpected arguments/, `and say why: ${result.stderr}`);
  }
  assert.match(runIndex('--check', '--check', '--fast').stderr, /unexpected arguments: .*--check.*--fast/, 'every rejected argument is named');
});

test('the gate fails on a career.json it cannot read or parse, naming the path', () => {
  const { write } = sourcePair();
  const artifact = write();
  const missing = join(tempDir(), 'absent-career.json');
  const unparseable = writeTemp('{ not json');

  for (const careerPath of [missing, unparseable]) {
    const failures = checkGate(artifact, careerPath);
    assert.ok(failures.some((line) => line.includes(careerPath)), `the path must be named: ${failures.join('\n')}`);
  }

  const result = runIndex('--check', artifact, missing);
  assert.equal(result.status, 1, `a missing career.json must fail the CLI gate, got ${result.status}`);
  assert.ok(result.stderr.includes(missing), result.stderr);
});

test('an asOf before some duration.start fails validate, the solve and the gate, naming the latest start', () => {
  const entries = pairEntries();
  const raw = { asOf: '2011-06', projects: entries };

  const lines = validateCareer(raw);
  assert.ok(
    lines.some((line) => line.startsWith('career.json [asOf]:') && line.includes('2015-01') && line.includes('Alpha — Second')),
    `validate must name the field and the latest-starting entry: ${lines.join('\n')}`,
  );

  const careerPath = writeTemp(JSON.stringify(raw));
  const solved = runPipeline(careerPath);
  assert.equal(solved.ok, false, 'the solve must refuse it');
  if (!solved.ok) assert.ok(solved.failures.some((line) => /\[asOf\]/.test(line)), solved.failures.join('\n'));

  const { write } = sourcePair();
  const failures = checkGate(write(), careerPath);
  assert.ok(failures.some((line) => /\[asOf\]/.test(line)), `the gate must refuse it: ${failures.join('\n')}`);
});

test('the gate fails on each empty case, naming the field path', () => {
  const cases: [string, (doc: LooseDoc) => void, RegExp][] = [
    ['clients', (doc) => { doc.clients = []; }, /^clients: /],
    ['destinations', (doc) => { doc.destinations = []; }, /^destinations: /],
    ['dwell', (doc) => { doc.dwell = []; }, /^dwell: /],
    ['shots', (doc) => { doc.shots = []; }, /^shots: /],
    ['a Client with no Projects', (doc) => { doc.clients[0]!.projects = []; }, /^clients\.0\.projects: an empty Client/],
  ];
  for (const [label, mutate, named] of cases) {
    const { careerPath, doc, write } = sourcePair();
    mutate(doc);
    const failures = checkGate(write(), careerPath);
    assert.ok(failures.some((line) => named.test(line)), `${label} must fail naming its path: ${failures.join('\n')}`);
  }

  const careerPath = writeTemp(JSON.stringify({ asOf: AS_OF, projects: [] }));
  const { write } = sourcePair();
  const failures = checkGate(write(), careerPath);
  assert.ok(
    failures.some((line) => line.startsWith('career.json [projects]:')),
    `an empty projects list must fail naming the field: ${failures.join('\n')}`,
  );
});

test('the gate fails on source drift, naming sourceDigest, both hashes and the solve', () => {
  const { careerPath, write } = sourcePair();
  const artifactPath = write();
  const before = sourceDigestOf(readFileSync(careerPath, 'utf8'));
  const edited = pairEntries();
  edited[1] = { ...edited[1], built: 'Something else was built.' };
  writeFileSync(careerPath, JSON.stringify({ asOf: AS_OF, projects: edited }));
  const after = sourceDigestOf(readFileSync(careerPath, 'utf8'));

  const failures = checkGate(artifactPath, careerPath);
  assert.ok(failures.some((line) => /solved from a different career\.json/.test(line)), failures.join('\n'));
  assert.ok(
    failures.some((line) => line.includes('sourceDigest') && line.includes(before) && line.includes(after)),
    `both hashes must be named: ${failures.join('\n')}`,
  );
  assert.ok(failures.some((line) => /npm run solve/.test(line)), 'and the fix');
});

test('a CRLF checkout of the same career.json passes the gate', () => {
  const { careerPath, write } = sourcePair();
  writeFileSync(careerPath, readFileSync(careerPath, 'utf8').replace(/\n/g, '\r\n'));
  assert.deepEqual(checkGate(write(), careerPath), []);
});

test('the gate fails on a hand-edited asOf whose digest still matches, naming both values', () => {
  const { careerPath, doc, write } = sourcePair();
  doc.asOf = '2026-08';
  const failures = checkGate(write(), careerPath);
  assert.equal(failures.some((line) => /sourceDigest/.test(line)), false, 'the digest still matches');
  assert.ok(
    failures.some((line) => line.includes('"2026-08"') && line.includes(`"${AS_OF}"`)),
    `both asOf values must be named: ${failures.join('\n')}`,
  );
});

test('the gate fails on a Project whose clientId is not its carrying Client, naming both IDs', () => {
  const { careerPath, doc, write } = sourcePair();
  const [first, second] = doc.clients;
  const project = first?.projects[0];
  assert.ok(first !== undefined && second !== undefined && project !== undefined);
  project.clientId = second.id;

  const failures = checkGate(write(), careerPath);
  assert.ok(
    failures.some((line) => line.includes(project.id) && line.includes(first.id) && line.includes(second.id)),
    `the Project and both IDs must be named: ${failures.join('\n')}`,
  );
});

test('the gate fails on an isDeep that disagrees with content.notable, naming the Project', () => {
  for (const flip of [true, false]) {
    const { careerPath, doc, write } = sourcePair();
    const project = doc.clients.flatMap((client) => client.projects).find((candidate) => candidate.isDeep === flip);
    assert.ok(project !== undefined, `the pair must carry a ${flip ? 'Deep' : 'Shallow'} Project to flip`);
    project.isDeep = !flip;

    const failures = checkGate(write(), careerPath);
    assert.ok(
      failures.some((line) => line.includes(project.id) && /isDeep/.test(line)),
      `the Project must be named: ${failures.join('\n')}`,
    );
  }
});

test('the gate fails on two Stars at one point, naming both IDs and the point', () => {
  // Beta's whole system is translated onto Alpha's Star, so every orbit plane
  // still holds and only the coincidence is wrong.
  const { careerPath, doc, write } = sourcePair();
  const [a, b] = doc.clients;
  assert.ok(a !== undefined && b !== undefined);
  const shift = { x: a.position.x - b.position.x, y: a.position.y - b.position.y, z: a.position.z - b.position.z };
  const move = (p: LoosePosition): LoosePosition => ({ x: p.x + shift.x, y: p.y + shift.y, z: p.z + shift.z });
  b.position = { ...a.position };
  for (const project of b.projects) project.position = move(project.position);

  const failures = checkGate(write(), careerPath);
  assert.ok(
    failures.some(
      (line) =>
        line.includes(a.id) &&
        line.includes(b.id) &&
        line.includes(`(${String(a.position.x)}, ${String(a.position.y)}, ${String(a.position.z)})`),
    ),
    `both Stars and the point must be named: ${failures.join('\n')}`,
  );
});

test('the gate fails on two Planets at one point, naming both IDs', () => {
  const { careerPath, doc, write } = sourcePair();
  const alpha = doc.clients.find((client) => client.projects.length > 1);
  assert.ok(alpha !== undefined, 'the pair must carry a Client with two Planets');
  const [first, second] = alpha.projects;
  assert.ok(first !== undefined && second !== undefined);
  second.position = { ...first.position };
  second.orbitNormal = { ...first.orbitNormal };

  const failures = checkGate(write(), careerPath);
  assert.ok(
    failures.some((line) => line.includes(first.id) && line.includes(second.id) && /one point/.test(line)),
    `both Planets must be named: ${failures.join('\n')}`,
  );
});

test('the gate fails on a Rail that is the right set in the wrong order, naming both orders', () => {
  const { careerPath, doc, write } = sourcePair();
  const expected = [...doc.rail];
  assert.ok(expected.length > 1, 'the pair must carry more than one stop');
  doc.rail = [...expected].reverse();

  const failures = checkGate(write(), careerPath);
  assert.ok(
    failures.some(
      (line) => /out of order/.test(line) && line.includes(`[${expected.join(', ')}]`) && line.includes(`[${doc.rail.join(', ')}]`),
    ),
    `the expected and actual orders must be named: ${failures.join('\n')}`,
  );
});

test('the gate holds the Rail to its ID tie-break when two Clients start in the same month', () => {
  // Distinct start months never exercise the tie-break; here only the ID can
  // order the two stops.
  const entries = [
    { ...baseEntry(), client: 'Beta', project: 'B', duration: { start: '2014-01', end: '2015-01' } },
    { ...baseEntry(), client: 'Alpha', project: 'A', duration: { start: '2014-01', end: '2020-01' } },
  ];
  const { careerPath, doc, write } = sourcePair(entries);
  assert.deepEqual(doc.rail, ['client:alpha', 'client:beta'], 'equal starts order by ID');
  doc.rail = ['client:beta', 'client:alpha'];

  const failures = checkGate(write(), careerPath);
  assert.ok(
    failures.some((line) => /out of order/.test(line) && line.includes('[client:alpha, client:beta]')),
    `the tie-break order must be named: ${failures.join('\n')}`,
  );
});

test('the Rail order is checked only once the Rail is the correct set', () => {
  // A dropped stop is a membership failure; an order complaint on top would
  // describe a list that cannot be put in order.
  const base = JSON.parse(JSON.stringify(artifactOf(...opposedEntries()))) as Artifact;
  const failures = checkStops({ ...base, rail: base.rail.slice(1) });
  assert.ok(failures.length > 0);
  assert.equal(failures.some((line) => /out of order/.test(line)), false, failures.join('\n'));
});

test('the content and Rail-order checks would catch each mutation, applied one at a time', () => {
  const base = JSON.parse(JSON.stringify(artifactOf(...pairEntries()))) as Artifact;
  assert.deepEqual(checkContent(base), [], 'the unmutated artifact must pass checkContent');
  assert.deepEqual(checkStops(base), [], 'and checkStops');

  const clone = (): LooseDoc => JSON.parse(JSON.stringify(base)) as LooseDoc;
  const mutations: [string, () => string[]][] = [
    ['a wrong clientId', () => {
      const d = clone();
      d.clients[0]!.projects[0]!.clientId = d.clients[1]!.id;
      return checkContent(d as unknown as Artifact);
    }],
    ['a flipped isDeep', () => {
      const d = clone();
      d.clients[0]!.projects[0]!.isDeep = !d.clients[0]!.projects[0]!.isDeep;
      return checkContent(d as unknown as Artifact);
    }],
    ['a Planet on its Star', () => {
      const d = clone();
      d.clients[0]!.projects[0]!.position = { ...d.clients[0]!.position };
      return checkContent(d as unknown as Artifact);
    }],
    ['a Planet on another Client’s Star', () => {
      const d = clone();
      d.clients[1]!.projects[0]!.position = { ...d.clients[0]!.position };
      return checkContent(d as unknown as Artifact);
    }],
    ['a Planet on another Client’s Planet', () => {
      const d = clone();
      d.clients[1]!.projects[0]!.position = { ...d.clients[0]!.projects[0]!.position };
      return checkContent(d as unknown as Artifact);
    }],
    ['a reversed Rail', () => {
      const d = clone();
      d.rail = [...d.rail].reverse();
      return checkStops(d as unknown as Artifact);
    }],
  ];
  for (const [label, run] of mutations) {
    assert.notDeepEqual(run(), [], `${label} must be rejected — an assertion that accepts it is asserting nothing`);
  }
});

test('the pre-write guard runs the content check', () => {
  const sound = artifactOf(...pairEntries());
  const d = JSON.parse(JSON.stringify(sound)) as LooseDoc;
  d.clients[0]!.projects[0]!.isDeep = !d.clients[0]!.projects[0]!.isDeep;
  const failures = checkEmittedArtifact(d as unknown as Artifact);
  assert.ok(failures.some((line) => /disagree with their own content/.test(line)), failures.join('\n'));
});

test('an artifact failure reports before any source failure', () => {
  // The source half never weakens the artifact-alone half: a document broken in
  // both ways reports the artifact fault.
  const { careerPath, doc, write } = sourcePair();
  writeFileSync(careerPath, '{ "not": "valid" }');
  assert.ok(
    checkGate(write(), careerPath).some((line) => /failed validation/.test(line)),
    'with a sound artifact this career fails the source half, so its absence below is the ordering, not a vacuous pass',
  );

  doc.dwell = doc.dwell.slice(1);
  const failures = checkGate(write(), careerPath);
  assert.ok(failures.some((line) => /disagrees with its Clients/.test(line)), failures.join('\n'));
  assert.equal(failures.some((line) => /failed validation|sourceDigest/.test(line)), false, failures.join('\n'));
});

test('checkSource never solves, derives or writes', () => {
  const source = readFileSync(INDEX_TS, 'utf8');
  const start = source.indexOf('export function checkSource');
  const gate = source.indexOf('export function checkGate');
  const end = source.indexOf('function main(');
  assert.ok(start >= 0 && gate > start && end > gate, 'the scan must find checkSource, then checkGate, then main');
  const body = source.slice(start, end);
  assert.doesNotMatch(
    body,
    /runPipeline|writeFileSync|solveLayout|buildArtifact|deriveEntities|buildRail|inRailOrder/,
    'the gate may not solve, derive, or write',
  );
});

test('two Client spellings that fold warn naming both and the ID, and emit one Client', () => {
  const careerPath = writeTemp(
    JSON.stringify({
      asOf: AS_OF,
      projects: [
        { ...baseEntry(), client: 'Acme Corp', project: 'One' },
        { ...baseEntry(), client: 'Acme-Corp', project: 'Two' },
      ],
    }),
  );
  const result = runPipeline(careerPath);
  assert.ok(result.ok, result.ok ? '' : result.failures.join('\n'));
  assert.ok(
    result.warnings.some((line) => line.includes('"Acme Corp"') && line.includes('"Acme-Corp"') && line.includes('client:acme-corp')),
    `the fold must be named: ${result.warnings.join('\n')}`,
  );
  const doc = stripBanner(JSON.parse(result.contents)) as Artifact;
  assert.equal(doc.clients.length, 1, 'one Client is emitted');
  assert.equal(doc.clients[0]?.name, 'Acme Corp', 'under the first spelling');
});

test('the solve CLI prints the fold warning on stderr, exits 0, and writes one Client', () => {
  // Through the real entry point, into a temp output: `runIndex` keeps stderr
  // only on failure, and a warning lives on a run that succeeds.
  const careerPath = writeTemp(
    JSON.stringify({
      asOf: AS_OF,
      projects: [
        { ...baseEntry(), client: 'Acme Corp', project: 'One' },
        { ...baseEntry(), client: 'Acme-Corp', project: 'Two' },
      ],
    }),
  );
  const outPath = join(tempDir(), 'layout.json');
  const run = spawnSync(process.execPath, [INDEX_TS, careerPath, outPath], { encoding: 'utf8', timeout: 60_000 });

  assert.equal(run.status, 0, `a fold is a warning, not a failure: ${run.stderr}`);
  assert.ok(
    run.stderr
      .split('\n')
      .some((line) => line.startsWith('warning: ') && line.includes('"Acme Corp"') && line.includes('"Acme-Corp"') && line.includes('client:acme-corp')),
    `a warning line must name both spellings and the ID: ${run.stderr}`,
  );
  const doc = stripBanner(JSON.parse(readFileSync(outPath, 'utf8'))) as Artifact;
  assert.equal(doc.clients.length, 1, 'the fold still applies');
});

test('a multi-Client career solves to the same bytes in separate processes, whatever its authored order', () => {
  // The in-process determinism tests share one module instance, one heap and one
  // d3-force-3d import, so they cannot see state that differs between runs of the
  // real CLI. Each solve here is its own `node src/derive/index.ts`, writing to a
  // temp path. The fixture has several Clients, several Projects per Client and
  // weights, so the Rail sort, the orbit order and the forces all have work to do.
  const entries = [
    { ...baseEntry(), client: 'SNCF', project: 'MDM replacement', weight: 1 },
    { ...baseEntry(), client: 'SNCF', project: 'Referential API', weight: 2, duration: { start: '2020-01', end: '2021-06' } },
    { ...baseEntry(), client: 'SNCF', project: 'Batch reconciliation', weight: 0.5, duration: { start: '2020-03', end: '2021-01' } },
    { ...baseEntry(), client: 'Orange', project: 'Billing migration', duration: { start: '2022-01', end: null } },
    { ...baseEntry(), client: 'Acme', project: 'Alpha', weight: 3, duration: { start: '2015-01', end: '2016-01' } },
    { ...baseEntry(), client: 'Acme', project: 'Beta', duration: { start: '2016-02', end: '2017-01' } },
  ];
  const solveIn = (projects: Record<string, unknown>[]): string => {
    const careerPath = writeTemp(JSON.stringify({ asOf: AS_OF, projects }, null, 2));
    const outPath = join(tempDir(), `cross-process-${scratchCount}.json`);
    const run = spawnSync(process.execPath, [INDEX_TS, careerPath, outPath], { encoding: 'utf8', timeout: 60_000 });
    assert.equal(run.status, 0, `the solve must succeed: ${run.stderr}`);
    return readFileSync(outPath, 'utf8');
  };

  const forward = solveIn(entries);
  const again = solveIn(entries);
  const reversed = solveIn([...entries].reverse());

  assert.equal(again, forward, 'two processes solving one file write identical bytes');
  // `sourceDigest` is the digest of the authored text, which reversing the entries
  // changes by construction — it is the one field that must differ. Everything
  // else is a property of the content and must not.
  const digestOf = (text: string): string | undefined => (stripBanner(JSON.parse(text)) as Artifact).sourceDigest;
  assert.notEqual(digestOf(reversed), digestOf(forward), 'the reversed file is a different source text');
  const withoutDigest = (text: string): string => text.replace(/"sourceDigest": "[0-9a-f]{64}"/, '"sourceDigest": ""');
  assert.equal(withoutDigest(reversed), withoutDigest(forward), 'and a reversed career solves, in another process, to the same bytes');
  assert.equal(
    (stripBanner(JSON.parse(forward)) as Artifact).clients.length,
    3,
    'the fixture is multi-Client, or the Rail sort had nothing to order',
  );
});

test('a fold that causes a Project ID collision fails the solve and still warns, before the failure', () => {
  // The fold is the only line that explains the collision, so it must survive
  // the failing outcome — through `runPipeline` and through the real CLI.
  const careerPath = writeTemp(
    JSON.stringify({
      asOf: AS_OF,
      projects: [
        { ...baseEntry(), client: 'Acme Corp', project: 'One' },
        { ...baseEntry(), client: 'Acme-Corp', project: 'One' },
      ],
    }),
  );
  const result = runPipeline(careerPath);
  assert.equal(result.ok, false, 'the folded spellings collide on one Project ID');
  assert.ok(
    result.warnings.some((line) => line.includes('"Acme Corp"') && line.includes('"Acme-Corp"')),
    `the failing result must still carry the fold: ${result.warnings.join('\n')}`,
  );

  const outPath = join(tempDir(), 'collision-layout.json');
  const run = spawnSync(process.execPath, [INDEX_TS, careerPath, outPath], { encoding: 'utf8', timeout: 60_000 });
  assert.equal(run.status, 1, `the collision must fail the solve: ${run.stderr}`);
  const lines = run.stderr.split('\n').filter((line) => line !== '');
  const warningAt = lines.findIndex((line) => line.startsWith('warning: ') && line.includes('"Acme-Corp"'));
  assert.ok(warningAt >= 0, `a warning line must name the fold: ${run.stderr}`);
  assert.ok(
    lines.slice(warningAt + 1).some((line) => !line.startsWith('warning: ')),
    `and come before the failure lines: ${run.stderr}`,
  );
  assert.equal(existsSync(outPath), false, 'and nothing is written');
});

test('the solve CLI refuses any argument it does not know, rather than writing to it', () => {
  const careerPath = writeTemp(`${JSON.stringify({ asOf: AS_OF, projects: pairEntries() }, null, 2)}\n`);
  const dir = mkdtempSync(join(tempDir(), 'solve-'));
  const outPath = join(dir, 'layout.json');
  const sound = spawnSync(process.execPath, [INDEX_TS, careerPath, outPath], { encoding: 'utf8', timeout: 60_000 });
  assert.equal(sound.status, 0, `the sound run passes, or the refusals below are vacuous: ${sound.stderr}`);

  const refused: string[][] = [
    [careerPath, '--dry-run'],
    ['--chek'],
    ['-f', careerPath],
    ['', outPath],
    [careerPath, outPath, join(dir, 'extra.json')],
  ];
  for (const args of refused) {
    // Run inside the temp directory: a CLI that took `--dry-run` for its output
    // path would otherwise write it into the working tree.
    const result = spawnSync(process.execPath, [INDEX_TS, ...args], { cwd: dir, encoding: 'utf8', timeout: 60_000 });
    assert.equal(result.status, 1, `${JSON.stringify(args)} must exit 1, got ${result.status}`);
    assert.match(result.stderr, /unexpected arguments/, `and say why: ${result.stderr}`);
  }
  assert.equal(existsSync(join(dir, '--dry-run')), false, 'no artifact is written under a flag’s name');
});

test('the solve CLI refuses to write the artifact over its own career.json', () => {
  const text = `${JSON.stringify({ asOf: AS_OF, projects: pairEntries() }, null, 2)}\n`;
  const careerPath = writeTemp(text);
  const result = runIndex(careerPath, careerPath);
  assert.equal(result.status, 1, `expected exit 1, got ${result.status}`);
  assert.match(result.stderr, /career\.json|its own source/, result.stderr);
  assert.equal(readFileSync(careerPath, 'utf8'), text, 'the authored source is untouched');
});

test('checkStops reports a Client with no Projects rather than throwing', () => {
  const base = JSON.parse(JSON.stringify(artifactOf(...opposedEntries()))) as LooseDoc;
  base.clients[0]!.projects = [];
  let failures: string[] = [];
  assert.doesNotThrow(() => {
    failures = checkStops(base as unknown as Artifact);
  });
  assert.ok(failures.some((line) => line.includes(base.clients[0]!.id)), failures.join('\n'));
});

test('the committed career.json solves with no fold warning', () => {
  const result = runPipeline();
  assert.ok(result.ok);
  assert.deepEqual(result.warnings, []);
});

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});
