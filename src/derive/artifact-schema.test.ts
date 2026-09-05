/**
 * The contract every later epic reads, pinned by mutation rather than asserted
 * in prose.
 *
 * A schema test that only checks the happy path proves the schema accepts what
 * the emitter writes, which is nearly tautological. What matters is what it
 * *rejects*: a field a later story owns, a version it was not written for, a
 * coordinate that serializes to `null`, a truncated payload. Each of those is
 * exercised here by handing the schema a document that is wrong in exactly one
 * way.
 *
 * No DOM, no React, no Three is imported here.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema } from '../data/schema.ts';
import { buildArtifact } from './artifact.ts';
import { ArtifactSchema, SCHEMA_VERSION, validateArtifact, type Artifact } from './artifact-schema.ts';
import { DWELL_TEMPOS } from './dwell.ts';
import { deriveEntities } from './entities.ts';
import { solveLayout } from './solve.ts';

const AS_OF = '2026-09';
const SCHEMA_TS = fileURLToPath(new URL('./artifact-schema.ts', import.meta.url));

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

/** A real artifact, built through the real pipeline. */
function valid(...entries: Record<string, unknown>[]): Artifact {
  const career = CareerSchema.parse({
    asOf: AS_OF,
    projects: entries.length > 0 ? entries : [baseEntry()],
  });
  const graph = deriveEntities(career, { asOf: AS_OF });
  return buildArtifact(graph, solveLayout(graph, { randomSource: seededRandom() }), AS_OF);
}

/** A mutable deep copy, so a test can break exactly one thing. */
function copy(artifact: Artifact): Record<string, unknown> {
  return JSON.parse(JSON.stringify(artifact)) as Record<string, unknown>;
}

/** Asserts some failure line matches, reporting all of them when none does. */
function assertFails(failures: string[], pattern: RegExp, why: string): void {
  assert.ok(
    failures.some((line) => pattern.test(line)),
    `${why}\nexpected a line matching ${String(pattern)}, got:\n${failures.join('\n') || '(no failures — the document was accepted)'}`,
  );
}

// --- The happy path ---------------------------------------------------------

test('a real artifact validates and returns no lines', () => {
  assert.deepEqual(validateArtifact(valid()), []);
});

test('validateArtifact returns lines and never throws', () => {
  // The result-value shape `validateCareer` uses. The caller decides what a
  // failure means: `index.ts` prints and exits 1, a test reads them directly.
  for (const garbage of [null, undefined, 42, 'a string', [], {}, { schemaVersion: 1 }]) {
    const failures = validateArtifact(garbage);
    assert.ok(Array.isArray(failures), `${String(garbage)} must return an array`);
    assert.ok(failures.length > 0, `${String(garbage)} must not validate`);
    for (const line of failures) assert.equal(typeof line, 'string');
  }
});

test('a failure names the path, not just the problem', () => {
  // "invalid input" against a document holding fifteen Bodies is not a
  // diagnosis. Every line carries the dotted path to the failing field.
  const broken = copy(valid()) as { clients: { projects: Record<string, unknown>[] }[] };
  const project = broken.clients[0]?.projects[0];
  assert.ok(project !== undefined);
  project['mass'] = 'heavy';

  assertFails(
    validateArtifact(broken),
    /clients\.0\.projects\.0\.mass/,
    'the failing field must be named by its full path',
  );
});

// --- The version is a literal, not a range ----------------------------------

test('SCHEMA_VERSION is a literal in the schema, so a mismatch fails', () => {
  for (const version of [0, SCHEMA_VERSION - 1, SCHEMA_VERSION + 1, '1', null]) {
    const broken = copy(valid());
    broken['schemaVersion'] = version;
    assertFails(
      validateArtifact(broken),
      /schemaVersion/,
      `version ${String(version)} must be rejected rather than read on a guess`,
    );
  }
});

test('the version is 3 now that dwell and shots landed, and changing the shape means changing it', () => {
  assert.equal(SCHEMA_VERSION, 3, 'Story 1.7 added `dwell` and `shots`, so the shape version is 3');
  assert.equal(valid().schemaVersion, SCHEMA_VERSION, 'the emitter declares it');

  // Read off the source: the literal must be in the schema, not merely compared
  // against after parsing. A `z.number()` would accept any version and the
  // mismatch would surface as a missing field in a consumer.
  const code = readFileSync(SCHEMA_TS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.match(code, /schemaVersion:\s*z\.literal\(SCHEMA_VERSION\)/, 'the version is a schema literal');
});

// --- The schema is closed at every level ------------------------------------

test('an unknown field is rejected at every level of the document', () => {
  // `strictObject` throughout, for the same reason `CareerSchema` uses it: a
  // consumer that starts writing a field nobody declared must fail the gate
  // rather than have it silently accepted.
  const cases: [string, (doc: Record<string, unknown>) => void][] = [
    // `dwell` and `shots` are declared at this version, so an undeclared field
    // has to be something else — the point is the closure, not these two names.
    ['top level', (doc) => { doc['cameras'] = {}; }],
    ['a Client', (doc) => {
      const clients = doc['clients'] as Record<string, unknown>[];
      const client = clients[0];
      assert.ok(client !== undefined);
      // Deliberately `shots`, which *is* declared at the top level and is
      // nonetheless undeclared here: the Rail's framing is a property of the
      // document, never of a Client entry, and `strictObject` at every level is
      // what keeps a consumer from writing one there.
      client['shots'] = [];
    }],
    ['a Project', (doc) => {
      const clients = doc['clients'] as { projects: Record<string, unknown>[] }[];
      const project = clients[0]?.projects[0];
      assert.ok(project !== undefined);
      project['opacity'] = 0.5;
    }],
    ['a position', (doc) => {
      const clients = doc['clients'] as { position: Record<string, unknown> }[];
      const client = clients[0];
      assert.ok(client !== undefined);
      client.position['w'] = 1;
    }],
    ['the content payload', (doc) => {
      const clients = doc['clients'] as { projects: { content: Record<string, unknown> }[] }[];
      const project = clients[0]?.projects[0];
      assert.ok(project !== undefined);
      project.content['notabel'] = 'x';
    }],
  ];

  for (const [where, breakIt] of cases) {
    const broken = copy(valid());
    breakIt(broken);
    assert.notDeepEqual(validateArtifact(broken), [], `an unknown field on ${where} must be rejected`);
  }
});

test('the schema declares dwell and shots, and a version-3 artifact without either is rejected', () => {
  // The inverse of the version-2 absence assertion, which said these belonged to
  // a later story. Story 1.7 declared them, so the assertion **inverts rather
  // than being deleted**: a regression that dropped either field again must fail
  // here as loudly as adding one early once did. `destinations` made exactly the
  // same move at version 2.
  //
  // `ArtifactSchema` is a `strictObject`, so an undeclared field would not
  // merely be optional — it would be *rejected*, and the Rail would have no
  // pacing and no framing to read at all.
  const code = readFileSync(SCHEMA_TS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  for (const declared of ['dwell', 'shots']) {
    assert.match(
      code,
      new RegExp(`\\b${declared}\\s*:`),
      `"${declared}" must be declared at this version`,
    );
  }

  const artifact = valid();
  for (const field of ['dwell', 'shots'] as const) {
    assert.ok(Array.isArray(artifact[field]), `the emitter populates \`${field}\``);
    assert.ok(artifact[field].length > 0, 'with at least the one Client in the fixture');

    const without = copy(artifact);
    delete without[field];
    assertFails(
      validateArtifact(without),
      new RegExp(field),
      `a version-3 artifact with no \`${field}\` must fail, not be read as having none`,
    );
  }
});

test('a dwell entry carries a subject and a tempo, and nothing else', () => {
  const reference = valid().dwell[0];
  assert.ok(reference !== undefined);
  assert.deepEqual(Object.keys(reference).sort(), ['subject', 'tempo'], 'the declared entry shape');

  for (const extra of ['ms', 'milliseconds', 'duration', 'seconds', 'position', 'index']) {
    const broken = copy(valid()) as { dwell: Record<string, unknown>[] };
    const entry = broken.dwell[0];
    assert.ok(entry !== undefined);
    entry[extra] = 1;
    assert.notDeepEqual(
      validateArtifact(broken),
      [],
      `a dwell entry carrying "${extra}" must be rejected — the tempo is a class, not a duration`,
    );
  }

  for (const field of ['subject', 'tempo']) {
    const broken = copy(valid()) as { dwell: Record<string, unknown>[] };
    const entry = broken.dwell[0];
    assert.ok(entry !== undefined);
    delete entry[field];
    assertFails(
      validateArtifact(broken),
      new RegExp(`dwell\\.0\\.${field}`),
      `a dwell entry missing "${field}" must be named`,
    );
  }
});

test('tempo accepts only the declared classes, and never a number', () => {
  // The Boundaries: no millisecond, second, or frame-count number in the emitted
  // Dwell. The union makes that unrepresentable rather than merely discouraged —
  // the numbers get tuned on the greybox at M1.
  for (const bad of [400, '400', 'slow', 'long', '', null, 0]) {
    const broken = copy(valid()) as { dwell: Record<string, unknown>[] };
    const entry = broken.dwell[0];
    assert.ok(entry !== undefined);
    entry['tempo'] = bad;
    assertFails(validateArtifact(broken), /dwell\.0\.tempo/, `a tempo of ${String(bad)} must be rejected`);
  }

  for (const tempo of DWELL_TEMPOS) {
    const ok = copy(valid()) as { dwell: Record<string, unknown>[] };
    const entry = ok.dwell[0];
    assert.ok(entry !== undefined);
    entry['tempo'] = tempo;
    assert.deepEqual(validateArtifact(ok), [], `"${tempo}" is a declared tempo`);
  }
});

test('a Shot carries four fields and no world coordinate — the schema rejects one', () => {
  // FR-17's hard rule, enforced structurally by `strictObject` rather than by
  // convention: a Shot carrying a coordinate would survive a re-settle by
  // pointing somewhere the subject no longer is.
  const reference = valid().shots[0];
  assert.ok(reference !== undefined);
  assert.deepEqual(
    Object.keys(reference).sort(),
    ['angle', 'distance', 'framing', 'subject'],
    'the declared entry shape',
  );

  for (const smuggled of ['x', 'y', 'z', 'position', 'target', 'lookAt', 'up', 'index']) {
    const broken = copy(valid()) as { shots: Record<string, unknown>[] };
    const entry = broken.shots[0];
    assert.ok(entry !== undefined);
    entry[smuggled] = 0;
    assert.notDeepEqual(
      validateArtifact(broken),
      [],
      `a Shot carrying "${smuggled}" must be rejected — no Shot definition contains a world coordinate`,
    );
  }

  for (const field of ['subject', 'angle', 'distance', 'framing']) {
    const broken = copy(valid()) as { shots: Record<string, unknown>[] };
    const entry = broken.shots[0];
    assert.ok(entry !== undefined);
    delete entry[field];
    assertFails(
      validateArtifact(broken),
      new RegExp(`shots\\.0\\.${field}`),
      `a Shot missing "${field}" must be named`,
    );
  }
});

test('a Shot distance is finite and positive, its angle a real elevation, its framing declared', () => {
  for (const bad of [0, -1, null, 'x', Number.NaN, Number.POSITIVE_INFINITY]) {
    const broken = copy(valid()) as { shots: Record<string, unknown>[] };
    const entry = broken.shots[0];
    assert.ok(entry !== undefined);
    entry['distance'] = bad;
    assertFails(validateArtifact(broken), /shots\.0\.distance/, `a distance of ${String(bad)} must fail`);
  }

  for (const bad of [null, 'x', Number.NaN, Number.POSITIVE_INFINITY]) {
    const broken = copy(valid()) as { shots: Record<string, unknown>[] };
    const entry = broken.shots[0];
    assert.ok(entry !== undefined);
    entry['angle'] = bad;
    assertFails(validateArtifact(broken), /shots\.0\.angle/, `an angle of ${String(bad)} must fail`);
  }

  for (const bad of ['frame-everything', 'wide', '', null, 0]) {
    const broken = copy(valid()) as { shots: Record<string, unknown>[] };
    const entry = broken.shots[0];
    assert.ok(entry !== undefined);
    entry['framing'] = bad;
    assertFails(validateArtifact(broken), /shots\.0\.framing/, `a framing of ${String(bad)} must be rejected`);
  }

  // An elevation lives in a quarter-turn either side of the orbital plane. A
  // finite number outside it is not a framing the derive layer sanctioned: `30`
  // reads as a plausible degrees value and is nearly five full turns in radians,
  // and a wrapped radian arrives looking equally reasonable.
  for (const bad of [30, 42, Math.PI, Math.PI / 2 + 1e-9, -Math.PI / 2 - 1e-9]) {
    const broken = copy(valid()) as { shots: Record<string, unknown>[] };
    const entry = broken.shots[0];
    assert.ok(entry !== undefined);
    entry['angle'] = bad;
    assertFails(validateArtifact(broken), /shots\.0\.angle/, `an angle of ${String(bad)} must fail`);
  }

  // The boundaries themselves are framings — straight down and straight up.
  for (const good of [0, Math.PI / 6, Math.PI / 2, -Math.PI / 2]) {
    const ok = copy(valid()) as { shots: Record<string, unknown>[] };
    const entry = ok.shots[0];
    assert.ok(entry !== undefined);
    entry['angle'] = good;
    assert.deepEqual(validateArtifact(ok), [], `an angle of ${String(good)} must be accepted`);
  }

  const blank = copy(valid()) as { shots: Record<string, unknown>[] };
  const entry = blank.shots[0];
  assert.ok(entry !== undefined);
  entry['subject'] = '';
  assertFails(validateArtifact(blank), /shots\.0\.subject/, 'an empty subject names no entity');
});

// --- The destination set is declared, and required --------------------------

test('the schema declares destinations, and a version-3 artifact without it is rejected', () => {
  // The inverse of the version-1 absence assertion, kept as the version rose:
  // a regression that dropped `destinations` must still fail here. `ArtifactSchema`
  // is a `strictObject`, so an undeclared `destinations` would not merely be
  // optional — it would be *rejected*, and both future input paths would infer
  // their own reachable set instead (AD-15).
  const code = readFileSync(SCHEMA_TS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.match(code, /\bdestinations\s*:/, 'the destination set must be declared at this version');

  const artifact = valid();
  assert.ok(Array.isArray(artifact.destinations), 'and the emitter populates it');
  assert.ok(artifact.destinations.length > 0, 'with at least the one entity in the fixture');

  const without = copy(artifact);
  delete without['destinations'];
  assertFails(
    validateArtifact(without),
    /destinations/,
    'a version-3 artifact with no destination set must fail, not be read as having none',
  );
});

test('a destination carries an id and a kind, and nothing else', () => {
  // A destination *names* an entity; a coordinate, a render-order index, or an
  // array offset here would be a second copy of what the `clients` tree already
  // carries, and the two would disagree the first time either changed.
  const reference = valid().destinations[0];
  assert.ok(reference !== undefined);
  assert.deepEqual(Object.keys(reference).sort(), ['id', 'kind'], 'the declared entry shape');

  for (const extra of ['position', 'index', 'offset', 'order', 'isDeep']) {
    const broken = copy(valid()) as { destinations: Record<string, unknown>[] };
    const entry = broken.destinations[0];
    assert.ok(entry !== undefined);
    entry[extra] = 0;
    assert.notDeepEqual(
      validateArtifact(broken),
      [],
      `a destination carrying "${extra}" must be rejected — a consumer resolves the entity by ID`,
    );
  }

  for (const field of ['id', 'kind']) {
    const broken = copy(valid()) as { destinations: Record<string, unknown>[] };
    const entry = broken.destinations[0];
    assert.ok(entry !== undefined);
    delete entry[field];
    assertFails(
      validateArtifact(broken),
      new RegExp(`destinations\\.0\\.${field}`),
      `a destination missing "${field}" must be named`,
    );
  }
});

test('kind accepts only the two entity kinds, and an ID is never blank', () => {
  for (const bad of ['star', 'body', 'Client', '', null, 0]) {
    const broken = copy(valid()) as { destinations: Record<string, unknown>[] };
    const entry = broken.destinations[0];
    assert.ok(entry !== undefined);
    entry['kind'] = bad;
    assertFails(
      validateArtifact(broken),
      /destinations\.0\.kind/,
      `a kind of ${String(bad)} must be rejected`,
    );
  }

  const blank = copy(valid()) as { destinations: Record<string, unknown>[] };
  const entry = blank.destinations[0];
  assert.ok(entry !== undefined);
  entry['id'] = '';
  assertFails(validateArtifact(blank), /destinations\.0\.id/, 'an empty ID names no entity');
});

// --- Required fields --------------------------------------------------------

test('every declared field is required, so a truncated document fails', () => {
  const artifact = valid();
  const topLevel = Object.keys(artifact);
  assert.deepEqual(
    topLevel.sort(),
    ['asOf', 'clients', 'destinations', 'dwell', 'schemaVersion', 'shots'],
    'the declared top-level shape',
  );

  for (const field of topLevel) {
    const broken = copy(artifact);
    delete broken[field];
    assertFails(validateArtifact(broken), new RegExp(field), `a missing "${field}" must be named`);
  }
});

test('a Project missing any derived field fails, naming it', () => {
  const artifact = valid();
  const reference = artifact.clients[0]?.projects[0];
  assert.ok(reference !== undefined);

  for (const field of Object.keys(reference)) {
    const broken = copy(artifact) as { clients: { projects: Record<string, unknown>[] }[] };
    const project = broken.clients[0]?.projects[0];
    assert.ok(project !== undefined);
    delete project[field];
    assertFails(
      validateArtifact(broken),
      new RegExp(`projects\\.0\\.${field}`),
      `a Project missing "${field}" must fail the gate`,
    );
  }
});

test('a Client owning no Projects fails', () => {
  // The graph cannot produce one, but the schema is the contract a *consumer*
  // reads — and an empty Client would render as a Star with nothing around it.
  const broken = copy(valid()) as { clients: { projects: unknown[] }[] };
  const client = broken.clients[0];
  assert.ok(client !== undefined);
  client.projects = [];
  assert.notDeepEqual(validateArtifact(broken), []);
});

// --- Values that would read as plausible-but-wrong --------------------------

test('a non-finite coordinate is rejected rather than read as absent', () => {
  // `JSON.stringify` writes NaN and Infinity as `null`, so an unguarded
  // coordinate reaches a consumer as plausible-but-absent data. The schema is
  // the last place to catch it.
  for (const bad of [null, 'x', undefined]) {
    const broken = copy(valid()) as { clients: { position: Record<string, unknown> }[] };
    const client = broken.clients[0];
    assert.ok(client !== undefined);
    client.position['x'] = bad;
    assertFails(validateArtifact(broken), /position\.x/, `a position.x of ${String(bad)} must fail`);
  }

  // And the in-memory forms the serializer would have flattened.
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const artifact = valid();
    const client = artifact.clients[0];
    assert.ok(client !== undefined);
    const broken = {
      ...artifact,
      clients: [{ ...client, position: { ...client.position, x: bad } }, ...artifact.clients.slice(1)],
    };
    assertFails(validateArtifact(broken), /position\.x/, `a position.x of ${String(bad)} must fail`);
  }
});

test('timeAxis is bounded to 0..1', () => {
  // A normalized position on an axis, not a free number. Out of range means the
  // derivation is broken, and the Fallback would lay out past its own extent.
  for (const bad of [-0.1, 1.1, 2, -1]) {
    const broken = copy(valid()) as { clients: Record<string, unknown>[] };
    const client = broken.clients[0];
    assert.ok(client !== undefined);
    client['timeAxis'] = bad;
    assertFails(validateArtifact(broken), /timeAxis/, `a timeAxis of ${bad} must be rejected`);
  }

  for (const good of [0, 0.5, 1]) {
    const ok = copy(valid()) as { clients: Record<string, unknown>[] };
    const client = ok.clients[0];
    assert.ok(client !== undefined);
    client['timeAxis'] = good;
    assert.deepEqual(validateArtifact(ok), [], `a timeAxis of ${good} is in range`);
  }
});

test('luminanceBand accepts only the three resting steps', () => {
  // UX-DR2 reserves `stroke-active` and `stroke-focus` for camera state. The
  // derive layer's union already makes them unrepresentable; the schema stops a
  // hand-edited artifact from smuggling one in.
  const broken = copy(valid()) as { clients: { projects: Record<string, unknown>[] }[] };
  const project = broken.clients[0]?.projects[0];
  assert.ok(project !== undefined);

  for (const reserved of ['stroke-active', 'stroke-focus', 'white', '']) {
    project['luminanceBand'] = reserved;
    assertFails(
      validateArtifact(broken),
      /luminanceBand/,
      `"${reserved}" must not be an acceptable resting band`,
    );
  }

  for (const resting of ['stroke-dust', 'stroke-rest', 'stroke-near']) {
    project['luminanceBand'] = resting;
    assert.deepEqual(validateArtifact(broken), [], `"${resting}" is a resting step`);
  }
});

test('moteTier accepts only the declared tiers', () => {
  const broken = copy(valid()) as { clients: { projects: Record<string, unknown>[] }[] };
  const project = broken.clients[0]?.projects[0];
  assert.ok(project !== undefined);

  project['moteTier'] = 'mote-enormous';
  assertFails(validateArtifact(broken), /moteTier/, 'an undeclared tier must be rejected');

  for (const tier of ['mote-sparse', 'mote-medium', 'mote-dense']) {
    project['moteTier'] = tier;
    assert.deepEqual(validateArtifact(broken), [], `"${tier}" is a declared tier`);
  }
});

test('mass and railDistance must be positive and finite', () => {
  for (const field of ['mass', 'railDistance']) {
    for (const bad of [0, -1, null, 'x']) {
      const broken = copy(valid()) as { clients: { projects: Record<string, unknown>[] }[] };
      const project = broken.clients[0]?.projects[0];
      assert.ok(project !== undefined);
      project[field] = bad;
      assertFails(validateArtifact(broken), new RegExp(field), `${field} of ${String(bad)} must fail`);
    }
  }
});

test('a malformed asOf fails the artifact schema too', () => {
  // The artifact carries the reference month it was solved against, so a
  // consumer can tell what "ongoing" meant. It is validated here as well as in
  // the authored schema, because the artifact is read by consumers that never
  // see `career.json`.
  for (const bad of ['2026-13', '2026', 'September', '']) {
    const broken = copy(valid());
    broken['asOf'] = bad;
    assertFails(validateArtifact(broken), /asOf/, `"${bad}" must be rejected`);
  }
});

// --- Content parity is structural, not a copied list ------------------------

test('the content payload is the authored schema itself, not a restatement', () => {
  // The property that makes FR-22 hold as `ProjectSchema` grows: a field added
  // to the authored record appears in the artifact automatically and cannot be
  // forgotten. A restated list would go stale silently.
  const code = readFileSync(SCHEMA_TS, 'utf8');
  assert.match(code, /content:\s*ProjectSchema/, 'content reuses the authored schema directly');

  // And it genuinely rejects a truncated payload, which is what the reuse buys.
  const broken = copy(valid()) as { clients: { projects: { content: Record<string, unknown> }[] }[] };
  const project = broken.clients[0]?.projects[0];
  assert.ok(project !== undefined);
  delete project.content['built'];
  assertFails(
    validateArtifact(broken),
    /content\.built/,
    'a truncated payload must fail — the Fallback admits no truncation',
  );
});

test('every authored field the schema requires is present in a real artifact', () => {
  const artifact = valid();
  const project = artifact.clients[0]?.projects[0];
  assert.ok(project !== undefined);
  assert.deepEqual(
    Object.keys(project.content).sort(),
    ['built', 'client', 'company', 'duration', 'notable', 'project', 'role', 'skills', 'team_size', 'weight'],
    'the whole authored record, carried whole',
  );
});

// --- The schema is the source of the types ----------------------------------

test('the exported types are inferred from the schema, never hand-written', () => {
  // A hand-written interface beside a schema is two declarations of one contract,
  // and they drift the first time either changes. `z.infer` makes the schema the
  // single source.
  const code = readFileSync(SCHEMA_TS, 'utf8');
  assert.match(code, /export type Artifact = z\.infer<typeof ArtifactSchema>/);
  assert.doesNotMatch(code, /export interface Artifact\b/, 'no hand-written twin of the inferred type');

  // And the schema is exported for a consumer to parse with, not only to
  // validate through.
  assert.equal(typeof ArtifactSchema.safeParse, 'function');
});

test('the schema reads no clock and no environment', () => {
  const code = readFileSync(SCHEMA_TS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /new\s+Date\b|Date\s*\.\s*now/, 'no clock read');
  assert.doesNotMatch(code, /Math\s*\.\s*random/, 'no randomness');
  assert.doesNotMatch(code, /process\s*\./, 'no ambient process state');
  assert.doesNotMatch(code, /node:fs|readFileSync/, 'no I/O');
});
