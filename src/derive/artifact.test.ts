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
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema, type Career } from '../data/schema.ts';
import { BANNER, buildArtifact, serializeArtifact, stripBanner } from './artifact.ts';
import { SCHEMA_VERSION, validateArtifact, type Artifact } from './artifact-schema.ts';
import { deriveEntities, type EntityGraph } from './entities.ts';
import { ARTIFACT_PATH, checkArtifact, runPipeline } from './index.ts';
import { solveLayout, type SolvedLayout } from './solve.ts';

const AS_OF = '2026-09';
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
    notable: 'Problem, constraint, decision.',
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
  return buildArtifact(graph, solve(graph), AS_OF);
}

/** Every Project in the artifact, flattened, in document order. */
function allProjects(artifact: Artifact) {
  return artifact.clients.flatMap((client) => client.projects);
}

const BAND_ORDER = ['stroke-dust', 'stroke-rest', 'stroke-near'];

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
  const artifact = buildArtifact(graph, solve(graph), AS_OF);

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
    notable: 'Problem, constraint, decision — at length.',
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
  const failures = validateArtifact(buildArtifact(poisoned, solve(graph), AS_OF));
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
    () => buildArtifact(graph, { positions: rest }, AS_OF),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /no position/, 'the failure names the problem');
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
    const code = readFileSync(path, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
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
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bderive[A-Z]/, 'the assembler must not call a rule');
  assert.doesNotMatch(code, /recencyOf|durationInMonths/, 'nor re-derive from a duration');
  assert.doesNotMatch(code, /duration/, 'nor read an authored duration at all');
});

// --- The version and the closed schema --------------------------------------

test('the artifact declares no dwell, shots, or destinations field', () => {
  // Those belong to Stories 1.7 and 1.6. Deliberately absent rather than
  // declared-and-empty: a required field nothing populates would make the
  // emitted artifact fail its own gate until 1.7 lands.
  const contents = serializeArtifact(artifactOf(...opposedEntries()));
  for (const forbidden of ['dwell', 'shots', 'destinations']) {
    assert.doesNotMatch(
      contents,
      new RegExp(`"${forbidden}"`, 'i'),
      `"${forbidden}" belongs to a later story and must not appear in this version`,
    );
  }
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
  const before = readFileSync(ARTIFACT_PATH, 'utf8');
  const result = runIndex();
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stderr}`);
  assert.equal(readFileSync(ARTIFACT_PATH, 'utf8'), before, 'a re-solve must not change the bytes');
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

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});
