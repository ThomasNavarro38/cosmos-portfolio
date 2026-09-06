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
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema } from '../data/schema.ts';
import { stripBanner } from './artifact.ts';
import { parseArtifact } from './artifact-schema.ts';
import { SRC_ROOT, findImports, stripCommentsAndStrings } from './boundaries.ts';
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
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      const stats = statSync(path);
      const contents = readFileSync(path);
      out[relative(REPO_ROOT, path).split(sep).join('/')] =
        `${stats.size}:${createHash('sha256').update(contents).digest('hex')}`;
    }
  };
  walk(dir);
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
  // `dwell`, in `shots`, or as anything but one more destination and one more
  // Body under the Client it belongs to.
  const before = solve(writeTemp(JSON.stringify(committedCareer(), null, 2)));
  const career = committedCareer();
  career.projects.push(appendedEntry());
  const after_ = solve(writeTemp(JSON.stringify(career, null, 2)));

  const doc = after_.document as {
    dwell: readonly { subject: string }[];
    shots: readonly { subject: string }[];
    destinations: readonly { id: string; kind: string }[];
  };
  // `shots` is declared here as well as `dwell`: without it the comparison
  // below could name the wrong list and still typecheck, which is how
  // `doc.shots.length === priorDoc.dwell.length` survived until review
  // iteration 1 — passing only because the two lists happen to be equal-length.
  const priorDoc = before.document as {
    dwell: readonly unknown[];
    shots: readonly unknown[];
    destinations: readonly unknown[];
  };

  assert.equal(doc.dwell.length, priorDoc.dwell.length, 'a Project gets no Dwell entry of its own');
  assert.equal(doc.shots.length, priorDoc.shots.length, 'nor a Shot of its own');
  assert.equal(
    doc.destinations.length,
    priorDoc.destinations.length + 1,
    'it does become reachable — exactly one new destination',
  );
  assert.ok(
    doc.dwell.every((d) => d.subject.startsWith('client:')) &&
      doc.shots.every((s) => s.subject.startsWith('client:')),
    'and both lists stay Client-granular',
  );
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
  // committed data, because `career.json` holds one Client with one Project and
  // that Project is already Deep — there is nothing in it to promote.
  const shallowPath = writeTemp(JSON.stringify(shallowFixture(), null, 2));
  const deepPath = writeTemp(JSON.stringify(shallowFixture('Problem, constraint, decision.'), null, 2));

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
  // wearing a one-character edit, and the diff would say so.
  const before = solve(writeTemp(JSON.stringify(shallowFixture(), null, 2)));
  const after_ = solve(writeTemp(JSON.stringify(shallowFixture('Problem, constraint, decision.'), null, 2)));

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
 * around would be no rule at all.
 */
const NETWORK_PATTERNS: readonly { readonly pattern: RegExp; readonly what: string }[] = [
  { pattern: /\bfetch\s*\(/, what: 'a fetch call' },
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
 * Every shipped `.ts`/`.tsx` file under `src/`, sorted — **`*.test.ts` excluded**.
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
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Same skip `sourceFilesUnder` uses in `boundaries.ts`: a vendored
      // dependency under `src/` is not shipped source of this repo's authorship,
      // and neither is a tool's dot-directory cache. The two walkers must agree,
      // or a file exempt from the boundary rules is still audited here.
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      found.push(...shippedFilesUnder(path));
      continue;
    }
    if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) found.push(path);
  }
  return found;
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
    for (const [index, line] of code.split('\n').entries()) {
      for (const { pattern, what } of NETWORK_PATTERNS) {
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
});

test('the audit rejects each network surface, naming file and line', () => {
  // The mutation half. An `auditNetwork` that returned `[]` unconditionally would
  // pass the test above forever, and the ratchet would hold nothing.
  const cases: [string, RegExp][] = [
    ["const r = await fetch('/api');", /fetch/],
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
