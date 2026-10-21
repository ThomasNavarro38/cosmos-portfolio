/**
 * The two promises the pipeline exists to keep, and a ratchet that keeps a third.
 *
 * NFR-5: **adding a career entry costs one object plus, at most, one number.** No
 * layout edit, no camera edit, no Dwell value, no second file. Every README in
 * this repo says so and no test held it.
 *
 * FR-5: **a Shallow Project promotes to Deep for free.** Populate `notable` and
 * nothing else changes — no schema edit, no flag, no structural change; only the
 * depth-derived values move.
 *
 * Plus the network audit: nothing under `src/` may reach the network. That is
 * true today, so the test is a **ratchet** rather than a fix — it costs nothing
 * now and is the only thing that will stop the first `fetch` from landing in a
 * repo whose whole thesis (NFR-6) is a static site with no backend.
 *
 * **Why this suite asserts over the filesystem.** `artifact.test.ts:390` and
 * `:464` already compare emitted bytes in memory, and they are the right tests
 * for determinism. NFR-5's promise is different and stronger: adding an entry
 * costs *no other file*. An in-memory comparison cannot see a file a rule quietly
 * rewrote. `runPipeline` returns contents without writing, so this suite can
 * snapshot the tree, run the pipeline, and compare — with nothing to clean up and
 * nothing to restore if it fails halfway.
 *
 * **No test here writes into `src/` or `generated/`.** The committed
 * `career.json` is copied to a temp path and the copy is what gets appended to;
 * `src/data/validate.test.ts:443` guards that rule at the source level after a
 * test corrupted the real file in place once already.
 */

import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema } from '../data/schema.ts';
import { stripBanner } from './artifact.ts';
import { parseArtifact } from './artifact-schema.ts';
import { SRC_ROOT, findImports } from './boundaries.ts';
import { filesUnder, isTestFile, sourceFilesUnder, stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { DWELL_TEMPOS } from './dwell.ts';
import { runPipeline } from './index.ts';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

const GENERATED_ROOT = join(REPO_ROOT, 'generated');
const CAREER_JSON = fileURLToPath(new URL('../data/career.json', import.meta.url));

// --- Temp-file helpers -------------------------------------------------------

let scratch: string | undefined;
let scratchCount = 0;

function writeTemp(contents: string): string {
  scratch ??= mkdtempSync(join(tmpdir(), 'maintenance-'));
  scratchCount += 1;
  const path = join(scratch, `career-${scratchCount}.json`);
  writeFileSync(path, contents);
  return path;
}

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});

// --- Tree snapshots ----------------------------------------------------------

/**
 * Every file under `dir`, as `relative path → size:sha256`.
 *
 * Deliberately not `mtimeMs`: the digest already catches every content change,
 * while an mtime catches "touched but identical" — which NFR-5 does not promise
 * and which a parallel suite or an editor autosave produces on its own.
 *
 * A digest rather than a length, because a rewrite that preserved size and mtime
 * is exactly the quiet edit this is looking for — and `contents.toString('hex')
 * .length`, which this used until review iteration 1, is just twice the size, so
 * it restated `size` and caught nothing the stats did not. Stats stay alongside
 * it: the digest catches a same-length rewrite of a different byte, the mtime
 * catches a touched-but-identical file. The snapshot is a plain object so a
 * failure diff names the file that moved.
 */
function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  // The shared walk with nothing skipped: the question is whether the solve wrote
  // anything, and a write into a dot-directory or `node_modules` is still a write.
  for (const path of filesUnder(dir, { all: true })) {
    const stats = statSync(path);
    const contents = readFileSync(path);
    out[relative(REPO_ROOT, path).split(sep).join('/')] =
      `${stats.size}:${createHash('sha256').update(contents).digest('hex')}`;
  }
  return out;
}

/** The committed authored data, as a mutable plain object. */
function committedCareer(): { asOf: string; projects: Record<string, unknown>[] } {
  return JSON.parse(readFileSync(CAREER_JSON, 'utf8')) as {
    asOf: string;
    projects: Record<string, unknown>[];
  };
}

/**
 * A fully-formed career entry carrying **only** `weight` beyond the required
 * nine fields — the "one object plus one number" NFR-5 promises.
 */
function appendedEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    client: 'SNCF',
    project: 'Fleet telemetry ingest',
    company: null,
    role: 'Technical lead',
    built: 'A streaming ingest for on-board telemetry.',
    team_size: 4,
    duration: { start: '2021-02', end: '2022-06' },
    skills: ['Java', 'Kafka'],
    weight: 2,
    ...overrides,
  };
}

/** The parsed artifact `runPipeline` produced, or a failure naming why not. */
function solve(path: string): { dwellOf: (id: string) => string; contents: string; document: unknown } {
  const result = runPipeline(path);
  assert.ok(result.ok, `the pipeline must succeed: ${result.ok ? '' : result.failures.join('\n')}`);
  const parsed = parseArtifact(stripBanner(JSON.parse(result.contents) as unknown));
  assert.ok(parsed.ok, `and emit a schema-valid artifact: ${parsed.ok ? '' : parsed.failures.join('\n')}`);
  const document = parsed.artifact;
  return {
    contents: result.contents,
    document,
    dwellOf: (id: string): string => {
      const entry = document.dwell.find((d) => d.subject === id);
      assert.ok(entry !== undefined, `no dwell entry for "${id}"`);
      return entry.tempo;
    },
  };
}

// --- NFR-5: adding an entry costs one object plus one number ------------------

test('a Project appended with only `weight` set re-solves clean and changes no file on disk', () => {
  // The maintenance promise, asserted the only way it can honestly be asserted:
  // over the filesystem. `runPipeline` returns bytes rather than writing them,
  // which is what makes the "no file changed" clause real rather than a claim
  // about a function that had no opportunity to write anyway.
  const career = committedCareer();
  career.projects.push(appendedEntry());
  const path = writeTemp(JSON.stringify(career, null, 2));

  const beforeSrc = snapshot(SRC_ROOT);
  const beforeGenerated = snapshot(GENERATED_ROOT);

  const result = runPipeline(path);
  assert.ok(result.ok, `the appended entry must re-solve clean:\n${result.ok ? '' : result.failures.join('\n')}`);

  assert.deepEqual(snapshot(SRC_ROOT), beforeSrc, 'no file under src/ may change when an entry is added');
  assert.deepEqual(
    snapshot(GENERATED_ROOT),
    beforeGenerated,
    'and none under generated/ — the solve is deliberate and out-of-band (AD-1)',
  );
});

test('the appended entry needs no field beyond the nine required ones plus `weight`', () => {
  // The clause that would otherwise erode silently: an entry that only validates
  // once someone also supplies a Dwell value, a position, or a Shot has stopped
  // costing one object. `strictObject` makes the upper bound structural; this
  // pins the lower one.
  const entry = appendedEntry();
  assert.deepEqual(
    Object.keys(entry).sort(),
    ['built', 'client', 'company', 'duration', 'project', 'role', 'skills', 'team_size', 'weight'],
    'one object, nine fields and one tuning number — nothing else',
  );

  const career = committedCareer();
  career.projects.push(entry);
  assert.doesNotThrow(() => CareerSchema.parse(career), 'and the schema must accept it as authored');
});

test('an entry appended with no `weight` at all re-solves clean too', () => {
  // "At most one number": `weight` defaults to 1, so the cheapest addition is the
  // object alone. A pipeline that only worked once a weight was supplied would
  // make the default decorative.
  const career = committedCareer();
  const entry = appendedEntry();
  delete entry['weight'];
  career.projects.push(entry);

  const result = runPipeline(writeTemp(JSON.stringify(career, null, 2)));
  assert.ok(result.ok, `an entry with no weight must re-solve:\n${result.ok ? '' : result.failures.join('\n')}`);
});

test('appending a Project reframes only its own Client and adds no stop of its own', () => {
  // AD-4a's half of the maintenance promise, at the pipeline level rather than at
  // `buildShots`': the Rail stops at Clients, so a new Project must not appear in
  // `dwell`, in `shots`, in `rail`, or as anything but one more destination and one
  // more Body under the Client it belongs to.
  const before = solve(writeTemp(JSON.stringify(committedCareer(), null, 2)));
  const career = committedCareer();
  career.projects.push(appendedEntry());
  const after_ = solve(writeTemp(JSON.stringify(career, null, 2)));

  const doc = after_.document as {
    dwell: readonly { subject: string }[];
    shots: readonly { subject: string }[];
    rail: readonly string[];
    destinations: readonly { id: string; kind: string }[];
  };
  // `shots` is declared here as well as `dwell`: without it the comparison
  // below could name the wrong list and still typecheck, which is how
  // `doc.shots.length === priorDoc.dwell.length` survived until review
  // iteration 1 — passing only because the two lists happen to be equal-length.
  const priorDoc = before.document as {
    dwell: readonly unknown[];
    shots: readonly unknown[];
    rail: readonly unknown[];
    destinations: readonly unknown[];
  };

  assert.equal(doc.dwell.length, priorDoc.dwell.length, 'a Project gets no Dwell entry of its own');
  assert.equal(doc.shots.length, priorDoc.shots.length, 'nor a Shot of its own');
  // `rail` is the third Client-granular list, added by Story 2.1. Asserted here
  // because this is where the promise is made at pipeline level: a Project that
  // quietly gained a Rail stop would otherwise pass this suite untouched.
  assert.equal(doc.rail.length, priorDoc.rail.length, 'nor a Rail stop of its own');
  assert.equal(
    doc.destinations.length,
    priorDoc.destinations.length + 1,
    'it does become reachable — exactly one new destination',
  );
  assert.ok(
    doc.dwell.every((d) => d.subject.startsWith('client:')) &&
      doc.shots.every((s) => s.subject.startsWith('client:')) &&
      doc.rail.every((id) => id.startsWith('client:')),
    'and all three lists stay Client-granular',
  );
});

test('appending a Project under a new Client adds one stop, frames it, and reframes or re-paces no other', () => {
  // The other half of NFR-5: an entry naming a Client the career has never seen
  // costs the same one object, and buys exactly one new Rail stop. Every list that
  // is Client-granular grows by one, `destinations` by two (the Client and its
  // Project), and nothing already there is reframed or re-paced.
  type Doc = {
    clients: readonly {
      id: string;
      position: { x: number; y: number; z: number };
      projects: readonly { id: string; position: { x: number; y: number; z: number } }[];
    }[];
    dwell: readonly { subject: string; tempo: string }[];
    shots: readonly { subject: string; distance: number }[];
    rail: readonly string[];
    destinations: readonly { id: string }[];
  };
  const before = solve(writeTemp(JSON.stringify(committedCareer(), null, 2))).document as Doc;
  const career = committedCareer();
  career.projects.push(appendedEntry({ client: 'Meridian Freight', project: 'Yard planning service' }));
  const after_ = solve(writeTemp(JSON.stringify(career, null, 2))).document as Doc;

  const known = new Set(before.clients.map((client) => client.id));
  const added = after_.clients.filter((client) => !known.has(client.id));
  assert.equal(added.length, 1, 'exactly one new Client');
  const client = added[0]!;
  assert.equal(client.projects.length, 1, 'owning the appended Project');

  assert.equal(after_.dwell.length, before.dwell.length + 1, 'one new Dwell entry');
  assert.equal(after_.shots.length, before.shots.length + 1, 'one new Shot');
  assert.equal(after_.rail.length, before.rail.length + 1, 'one new Rail stop');
  assert.equal(after_.destinations.length, before.destinations.length + 2, 'two new destinations: the Client and its Project');
  assert.ok(after_.rail.includes(client.id), 'the new stop is the new Client');

  // The new Shot frames the new system: it stands further from the Star than any
  // of its Projects orbits, or the camera would sit inside the system it frames.
  const shot = after_.shots.find((entry) => entry.subject === client.id);
  assert.ok(shot !== undefined, 'the new Client has a Shot');
  for (const project of client.projects) {
    const orbit = Math.hypot(
      project.position.x - client.position.x,
      project.position.y - client.position.y,
      project.position.z - client.position.z,
    );
    assert.ok(shot.distance > orbit, `the Shot (${shot.distance}) stands outside ${project.id}'s orbit (${orbit})`);
  }

  // And every existing stop keeps its framing and its pace.
  for (const prior of before.shots) {
    assert.deepEqual(after_.shots.find((entry) => entry.subject === prior.subject), prior, `${prior.subject}'s Shot is unchanged`);
  }
  for (const prior of before.dwell) {
    assert.deepEqual(after_.dwell.find((entry) => entry.subject === prior.subject), prior, `${prior.subject}'s tempo is unchanged`);
  }
});

// --- FR-5: promotion is free -------------------------------------------------

/** A one-Client, one-Project career whose only Project is Shallow. */
function shallowFixture(notable?: string): { asOf: string; projects: Record<string, unknown>[] } {
  return {
    asOf: '2026-09',
    projects: [
      {
        client: 'Meridian',
        project: 'Order routing rewrite',
        company: 'Consultancy',
        role: 'Technical lead',
        built: 'Rewrote the order routing path.',
        team_size: 6,
        duration: { start: '2023-01', end: '2024-03' },
        skills: ['Java'],
        ...(notable === undefined ? {} : { notable }),
      },
    ],
  };
}

test('promoting a Shallow Project to Deep flips isDeep and lengthens its Client Dwell tempo', () => {
  // FR-5's promise stated as the two things that must move and the everything
  // else that must not. The fixture is built here rather than taken from the
  // committed data so the promoted Project is its Client's only one: in
  // `career.json` a Client's tempo also answers to its sibling Projects, which would
  // tie the comparison to whichever Client the test happened to pick.
  const shallowPath = writeTemp(JSON.stringify(shallowFixture(), null, 2));
  const deepPath = writeTemp(JSON.stringify(shallowFixture('Problem stated. [[The constraint, in one sentence.]] The decision taken.'), null, 2));

  const before = solve(shallowPath);
  const after_ = solve(deepPath);

  const projectOf = (document: unknown): Record<string, unknown> => {
    const doc = document as { clients: { projects: Record<string, unknown>[] }[] };
    const client = doc.clients[0];
    assert.ok(client !== undefined, 'the fixture carries one Client');
    const project = client.projects[0];
    assert.ok(project !== undefined, 'carrying one Project');
    return project;
  };

  assert.equal(projectOf(before.document)['isDeep'], false, 'the fixture must start Shallow');
  assert.equal(projectOf(after_.document)['isDeep'], true, 'and populating `notable` must make it Deep');

  // `DWELL_TEMPOS` is ordered shortest-first, so "lengthens" is a comparison of
  // indices. A string comparison would hold just as well with two tempos swapped.
  const rankOf = (tempo: string): number => {
    const rank = DWELL_TEMPOS.indexOf(tempo as (typeof DWELL_TEMPOS)[number]);
    assert.ok(rank >= 0, `"${tempo}" must be one of the declared tempo classes`);
    return rank;
  };
  const subject = (before.document as { clients: { id: string }[] }).clients[0]?.id;
  assert.ok(subject !== undefined);
  assert.ok(
    rankOf(after_.dwellOf(subject)) > rankOf(before.dwellOf(subject)),
    `the promoted system must be held longer: "${before.dwellOf(subject)}" → "${after_.dwellOf(subject)}"`,
  );
});

test('promotion changes only depth-derived values, and no schema or structural field', () => {
  // The "for free" half. Promotion that also moved a position, a mass, a band, a
  // railDistance or the schema version would not be free — it would be a re-tune
  // wearing a one-string edit, and the diff would say so.
  const before = solve(writeTemp(JSON.stringify(shallowFixture(), null, 2)));
  const after_ = solve(writeTemp(JSON.stringify(shallowFixture('Problem stated. [[The constraint, in one sentence.]] The decision taken.'), null, 2)));

  const flatten = (document: unknown): Record<string, unknown> => {
    const doc = document as {
      schemaVersion: number;
      asOf: string;
      clients: {
        id: string;
        position: unknown;
        projects: { id: string; position: unknown; mass: number; luminanceBand: string; railDistance: number; timeAxis: number }[];
      }[];
      destinations: readonly unknown[];
      shots: readonly unknown[];
    };
    const client = doc.clients[0];
    assert.ok(client !== undefined);
    const project = client.projects[0];
    assert.ok(project !== undefined);
    return {
      schemaVersion: doc.schemaVersion,
      asOf: doc.asOf,
      clientId: client.id,
      clientPosition: client.position,
      projectId: project.id,
      projectPosition: project.position,
      mass: project.mass,
      luminanceBand: project.luminanceBand,
      railDistance: project.railDistance,
      timeAxis: project.timeAxis,
      destinations: doc.destinations,
      shots: doc.shots,
    };
  };

  assert.deepEqual(
    flatten(after_.document),
    flatten(before.document),
    'promotion must not move an ID, a position, a mass, a band, a distance, an axis, a destination or a Shot',
  );

  // And the fields that *must* move, so the assertion above is not vacuously
  // satisfied by a promotion that did nothing at all.
  assert.notEqual(after_.contents, before.contents, 'something must change — isDeep, moteTier and the tempo');
});

test('the four Shallow forms are one case, so promotion is the only thing that promotes', () => {
  // The classifier is `(project.notable ?? '') !== ''`, total over four inputs.
  // If any Shallow form leaked through as Deep, "promotion is free" would be
  // false for whichever form the author happened to use.
  //
  // Compared over *derived* values rather than over bytes: the four forms are
  // equivalent in meaning but not in parsed shape — an absent `notable` yields a
  // nine-key object where `null` and `""` yield ten — and `content` carries the
  // authored record whole, by reference and on purpose (FR-22). So the artifacts
  // differ by exactly the authored field, which is the correct behaviour, and a
  // byte comparison would assert the opposite of what this repo guarantees.
  const forms: (string | null | undefined)[] = [undefined, null, '', '   '];
  const derived = forms.map((notable) => {
    const fixture = shallowFixture();
    const project = fixture.projects[0];
    assert.ok(project !== undefined);
    if (notable !== undefined) project['notable'] = notable;
    const solved = solve(writeTemp(JSON.stringify(fixture, null, 2)));
    const doc = solved.document as {
      clients: { id: string; position: unknown; projects: Record<string, unknown>[] }[];
      dwell: readonly unknown[];
      shots: readonly unknown[];
      destinations: readonly unknown[];
    };
    const client = doc.clients[0];
    assert.ok(client !== undefined);
    const emitted = client.projects[0];
    assert.ok(emitted !== undefined);
    // Everything the artifact derives, and nothing it merely carries.
    const { content: _content, ...derivedOnly } = emitted;
    return {
      client: { id: client.id, position: client.position },
      project: derivedOnly,
      dwell: doc.dwell,
      shots: doc.shots,
      destinations: doc.destinations,
    };
  });

  const first = derived[0];
  assert.ok(first !== undefined);
  for (const [index, one] of derived.entries()) {
    assert.deepEqual(one, first, `Shallow form ${index} must derive identically to the others`);
    assert.equal(one.project['isDeep'], false, `Shallow form ${index} must classify as Shallow`);
  }
});

// --- The network ratchet ------------------------------------------------------

/**
 * The network surfaces a static site has no business carrying (NFR-6), each as a
 * pattern over stripped source.
 *
 * Word-bounded so `prefetchLink` and `refetch` are not false positives, and
 * `EventSource`/`sendBeacon` included because "no fetch" that a beacon walked
 * around would be no rule at all. Since 5.1 any reference to `fetch` counts, not
 * only a call: `fetch` handed to an injectable loader reaches the network as
 * surely as `fetch(...)`.
 */
const NETWORK_PATTERNS: readonly { readonly pattern: RegExp; readonly what: string }[] = [
  { pattern: /\bfetch\b/, what: 'a fetch' },
  { pattern: /\bXMLHttpRequest\b/, what: 'an XMLHttpRequest' },
  { pattern: /\bWebSocket\b/, what: 'a WebSocket' },
  { pattern: /\bEventSource\b/, what: 'an EventSource' },
  { pattern: /\bsendBeacon\b/, what: 'a navigator.sendBeacon call' },
];

/**
 * Node's network modules, matched against a *specifier* rather than against
 * source text.
 *
 * A specifier lives inside quotes, and stripping blanks the inside of quotes —
 * so `node:https` is invisible to the patterns above by construction. That is
 * correct for the patterns (a URL in a string is not a network call) and wrong
 * for an import, which is exactly why imports are read through `findImports`,
 * which reports what was authored rather than what survived stripping.
 */
const NETWORK_MODULES = new Set(['http', 'https', 'net', 'dgram', 'http2', 'tls', 'dns']);

/**
 * Every shipped source module under `src/`, by the shared walk (`scripts/source-scan.ts`) — **test files excluded**.
 *
 * A test file is not shipped source: `npm test` runs it and no bundle contains
 * it. It is excluded because a suite that audits network calls must be able to
 * *name* them — this file and `boundaries.test.ts` both hold `XMLHttpRequest` as
 * a pattern and as a fixture, and an audit flagging its own fixtures would be
 * turned off within a week. The exclusion is narrow and stated rather than
 * discovered: what it gives up is catching a test that itself reaches the
 * network, which would fail loudly and immediately in CI rather than shipping.
 */
function shippedFilesUnder(dir: string): string[] {
  return sourceFilesUnder(dir).filter((path) => !isTestFile(path));
}

/**
 * The one admitted network reach, argued for rather than slipped in (5.1, AD-17):
 * the Colophon hands `fetch` to `startExhibits` (`src/colophon/exhibits.ts`) to
 * read the two files the build publishes beside the page, same-origin — emitted
 * data, not a backend. Admitted by file, by kind and by shape: one line in that
 * file, whose one `fetch` is `startExhibits(fetch, …)`'s first argument — the
 * paths are `exhibits.ts`' own, so no URL is written beside it — and only while
 * the `startExhibits` called is the one imported from `./exhibits.ts`, since a
 * local one of that name could hand `fetch` anywhere. A second such line, a
 * `fetch` of any other shape there, any other surface there, and a `fetch`
 * anywhere else all still fail.
 */
const NETWORK_ADMITTED: ReadonlyMap<string, { readonly what: string; readonly shape: RegExp; readonly name: string; readonly from: string }> = new Map([
  ['src/colophon/colophon.tsx', { what: 'a fetch', shape: /\bstartExhibits\(\s*fetch\s*,/, name: 'startExhibits', from: './exhibits.ts' }],
]);

/** Whether `source` imports `name` itself, unrenamed, from `from`, and `code` (its stripped text) declares no local `name`. */
function importsAdmitted(source: string, code: string, name: string, from: string): boolean {
  const imported = new RegExp(`\\bimport\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\b`).test(code);
  const renamed = new RegExp(`\\bas\\s+${name}\\b`).test(code);
  const local = new RegExp(`\\b(?:function|const|let|var|class)\\s+${name}\\b`).test(code);
  return imported && !renamed && !local && findImports(source).some((found) => found.specifier === from);
}

/**
 * The network audit itself, exported in spirit as a pure function so the test
 * below can drive it over a fixture as well as over the real tree — a checker
 * only ever run against a clean tree proves nothing about what it would reject.
 */
function auditNetwork(files: readonly { readonly path: string; readonly source: string }[]): string[] {
  const failures: string[] = [];
  for (const file of files) {
    const code = stripCommentsAndStrings(file.source);
    const named = NETWORK_ADMITTED.get(file.path);
    const admitted = named !== undefined && importsAdmitted(file.source, code, named.name, named.from) ? named : undefined;
    let admittedLines = 0;
    for (const [index, line] of code.split('\n').entries()) {
      for (const { pattern, what } of NETWORK_PATTERNS) {
        if (admitted?.what === what && admittedLines === 0 && admitted.shape.test(line) && (line.match(/\bfetch\b/g) ?? []).length === 1) {
          admittedLines += 1;
          continue;
        }
        if (pattern.test(line)) {
          failures.push(`${file.path}:${index + 1} carries ${what} — src/ reaches no network (NFR-6).`);
          break;
        }
      }
    }
    for (const found of findImports(file.source)) {
      // `import { request } from 'https'` resolves to the same builtin as
      // `node:https`, so the prefix is stripped before the lookup — a ban the
      // older spelling walked around would be no ban. The subpath goes too:
      // `node:dns/promises` is `dns`, and a deep import is not an escape hatch.
      const builtin = found.specifier.replace(/^node:/, '').split('/')[0] ?? '';
      if (NETWORK_MODULES.has(builtin)) {
        failures.push(
          `${file.path}:${found.line} imports "${found.specifier}" — src/ reaches no network (NFR-6).`,
        );
      }
    }
  }
  return failures;
}

test('nothing under src/ reaches the network', () => {
  // A ratchet, not a fix: `src/` is clean today. NFR-6 is a static site with no
  // backend and no runtime configuration, so the first `fetch` to land here is a
  // change to what the product *is* — and it should have to argue with a red
  // suite rather than slip in as a convenience.
  //
  // The scan runs over stripped source, so this file's own patterns and the prose
  // above are not themselves findings.
  const files = shippedFilesUnder(SRC_ROOT).map((path) => ({
    path: `src/${relative(SRC_ROOT, path).split(sep).join('/')}`,
    source: readFileSync(path, 'utf8'),
  }));
  assert.ok(files.length > 0, 'the walk must find source files');
  assert.deepEqual(auditNetwork(files), [], 'a network call under src/ fails the audit');
  // The admission is not vacuous: the file it names holds the one fetch.
  const colophon = files.find((file) => file.path === 'src/colophon/colophon.tsx');
  assert.ok(colophon !== undefined && /\bfetch\b/.test(stripCommentsAndStrings(colophon.source)), 'the admitted file reaches fetch');
});

test('the admitted fetch is the Colophon’s alone, and admits nothing else there', () => {
  const imported = "import { startExhibits, type Exhibits } from './exhibits.ts';\n";
  const line = 'useEffect(() => startExhibits(fetch, setExhibits, (error) => console.error(error)), []);';
  assert.deepEqual(auditNetwork([{ path: 'src/colophon/colophon.tsx', source: `${imported}${line}\n` }]), []);
  for (const [name, source] of [
    ['a second admitted line', `${imported}${line}\n${line}\n`],
    ['a fetch of another shape', `${imported}const r = fetch('https://elsewhere.example/x');\n`],
    ['a second fetch on the admitted line', `${imported}useEffect(() => startExhibits(fetch, setExhibits, () => fetch('/beacon')), []);\n`],
    ['the fetch handed elsewhere', `${imported}loadExhibits(fetch, controller.signal);\n`],
    ['startExhibits not imported', `${line}\n`],
    ['startExhibits imported from elsewhere', `import { startExhibits } from './elsewhere.ts';\n${line}\n`],
    ['a local startExhibits', `${imported}function startExhibits(load: unknown) { return load; }\n${line}\n`],
    ['another function imported as startExhibits', `import { leak as startExhibits } from './exhibits.ts';\n${line}\n`],
  ] as const) {
    assert.equal(auditNetwork([{ path: 'src/colophon/colophon.tsx', source }]).length, 1, `${name} fails in the Colophon`);
  }
  for (const path of ['src/colophon/exhibits.ts', 'src/shell/entry.ts', 'src/render-fallback/chart.tsx']) {
    assert.match(auditNetwork([{ path, source: `${line}\n` }]).join('\n'), new RegExp(`^${path.replace(/[./]/g, '\\$&')}:1 carries a fetch`), `${path} may not`);
  }
  for (const other of ['const x = new XMLHttpRequest();', "const s = new WebSocket('wss://x');", "navigator.sendBeacon('/t', '1');"]) {
    assert.equal(auditNetwork([{ path: 'src/colophon/colophon.tsx', source: `${other}\n` }]).length, 1, `"${other}" still fails in the Colophon`);
  }
  assert.equal(auditNetwork([{ path: 'src/colophon/colophon.tsx', source: "import { request } from 'node:https';\n" }]).length, 1, 'and so does a network module');
});

test('the audit rejects each network surface, naming file and line', () => {
  // The mutation half. An `auditNetwork` that returned `[]` unconditionally would
  // pass the test above forever, and the ratchet would hold nothing.
  const cases: [string, RegExp][] = [
    ["const r = await fetch('/api');", /fetch/],
    ['const load = fetch;', /a fetch/],
    ['loadExhibits(window.fetch, signal);', /a fetch/],
    ['const x = new XMLHttpRequest();', /XMLHttpRequest/],
    ["const s = new WebSocket('wss://x');", /WebSocket/],
    ["const e = new EventSource('/stream');", /EventSource/],
    ["navigator.sendBeacon('/t', '1');", /sendBeacon/],
    ["import { request } from 'node:https';", /node:https/],
    ["const net = await import('node:net');", /node:net/],
  ];
  for (const [line, expected] of cases) {
    const failures = auditNetwork([{ path: 'src/shell/entry.ts', source: `const a = 1;\n${line}\n` }]);
    assert.equal(failures.length, 1, `"${line}" must produce exactly one finding\n${failures.join('\n')}`);
    const only = failures[0];
    assert.ok(only !== undefined);
    assert.match(only, /^src\/shell\/entry\.ts:2 /, `and name file and line: ${only}`);
    assert.match(only, expected, `and say what it found: ${only}`);
  }
});

test('a network call inside a comment or a string is not a finding', () => {
  // The same decoy rule the import boundaries hold. An audit that fired on prose
  // would be turned off within a week, which is the failure mode that matters
  // more than a missed call.
  assert.deepEqual(
    auditNetwork([
      {
        path: 'src/shell/entry.ts',
        source: [
          "// this file must never call fetch('/api')",
          '/* nor new WebSocket("wss://x") */',
          `const doc = "no XMLHttpRequest here";`,
          '',
        ].join('\n'),
      },
    ]),
    [],
  );
});

test('a name merely containing a network word is not a finding', () => {
  assert.deepEqual(
    auditNetwork([
      { path: 'src/shell/entry.ts', source: 'const prefetchLink = 1;\nfunction refetch() { return 2; }\n' },
    ]),
    [],
    'the patterns are word-bounded on purpose',
  );
});

// --- The source guard ---------------------------------------------------------

test('no test in this suite writes into src/ or generated/', () => {
  // The property the temp-path seam exists to preserve, pinned rather than
  // trusted — the same guard `src/data/validate.test.ts:443` carries, and for the
  // same reason: it bit once already, and it reproduces only under parallelism.
  const code = stripCommentsAndStrings(readFileSync(fileURLToPath(import.meta.url), 'utf8'));
  assert.doesNotMatch(code, /writeFileSync\s*\(\s*CAREER_JSON/, 'never the committed career.json');
  assert.doesNotMatch(code, /writeFileSync\s*\(\s*(?:SRC_ROOT|GENERATED_ROOT|ARTIFACT_PATH)/, 'nor src/ or generated/');
  assert.doesNotMatch(code, /rmSync\s*\(\s*(?:SRC_ROOT|GENERATED_ROOT|REPO_ROOT)/, 'and nothing is removed from the tree');
});

/**
 * The Colophon's imports (5.1, 5.2): React for its effect, its own exhibits
 * and derivations modules and its stylesheet, nothing else, and the exhibits
 * and derivations modules nothing at all (5.2: not even a type from
 * `src/derive/`, `src/data/` or `generated/`). Read by the boundary scan's own
 * reader, so a side-effect import, either quote, a re-export or a dynamic
 * import counts too. Here rather than beside the router's audit because
 * `src/shell/` may not import `src/derive/`.
 */
test('the colophon imports React, ./exhibits.ts, ./derivations.ts and ./colophon.css only, and exhibits.ts and derivations.ts import nothing', () => {
  const read = (path: string): string => readFileSync(join(SRC_ROOT, path), 'utf8');
  const importsOf = (source: string): (string | null)[] => findImports(source).map((found) => found.specifier);
  const colophon = read('colophon/colophon.tsx');
  const admitted = ['react', './exhibits.ts', './derivations.ts', './colophon.css'];
  assert.deepEqual(importsOf(colophon), admitted, 'the colophon imports React, ./exhibits.ts, ./derivations.ts and ./colophon.css only');
  for (const extra of ["import '../shell/page.css';", 'import "../shell/state.ts";', "export { x } from '../shell/route.ts';", "const m = await import('../derive/index.ts');", "import type { Artifact } from '../derive/artifact-schema.ts';"]) {
    assert.notDeepEqual(importsOf(`${colophon}
${extra}
`), admitted, `"${extra}" is seen`);
  }
  assert.deepEqual(importsOf(read('colophon/exhibits.ts')), [], 'and exhibits.ts imports nothing');
  const derivations = read('colophon/derivations.ts');
  assert.deepEqual(importsOf(derivations), [], 'and derivations.ts imports nothing');
  for (const extra of ["import type { LayoutArtifact } from '../derive/artifact-schema.ts';", "import { deriveMass } from '../derive/rules.ts';", "import layout from '../../generated/layout.generated.json';"]) {
    assert.notDeepEqual(importsOf(`${extra}
${derivations}`), [], `"${extra}" is seen`);
  }
});
