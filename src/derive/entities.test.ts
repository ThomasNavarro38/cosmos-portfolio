/**
 * Covers the graph rows of the story's I/O & edge-case matrix: Client grouping,
 * the three Shallow forms, ID stability under a re-order, ID collision, and
 * Company never becoming a Body.
 *
 * Run with `npm test`. Fixtures are built through `CareerSchema.parse` rather
 * than hand-typed objects, so the derivation is exercised against exactly the
 * shapes validation actually produces — including `weight`'s resolved default
 * and the nine-key vs ten-key difference between the Shallow forms.
 *
 * No DOM, no React, no Three is imported here, and nothing outside `src/derive/`
 * imports `src/data/`.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema } from '../data/schema.ts';
import { RESTING_BANDS } from './rules.ts';
import { clientIdOf, deriveEntities, projectIdOf } from './entities.ts';

/** The real authored file, resolved the way `src/data/validate.test.ts` does. */
const CAREER_JSON = fileURLToPath(new URL('../data/career.json', import.meta.url));

const AS_OF = '2026-09';

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
    notable: 'Problem, constraint, decision.',
    skills: ['Java', 'Spring Boot'],
  };
}

/** Parses fixtures through the real schema, then derives. */
function derive(...entries: Record<string, unknown>[]) {
  return deriveEntities(CareerSchema.parse({ projects: entries }), { asOf: AS_OF });
}

/** Every Project entity in the graph, flattened. */
function allProjects(graph: ReturnType<typeof derive>) {
  return graph.clients.flatMap((client) => client.projects);
}

// --- Matrix row: Deep classification ----------------------------------------

test('a populated `notable` derives isDeep true', () => {
  const [entity] = allProjects(derive(baseEntry()));
  assert.equal(entity?.isDeep, true);
});

// --- Matrix rows: Shallow, three forms; whitespace notable ------------------

test('`notable` absent, null, "" and whitespace-only are one Shallow case', () => {
  // The four inputs differ in parsed shape — absent yields nine keys, the rest
  // ten — and `src/data/README.md` hands this collapse to this story explicitly.
  const absent = baseEntry();
  delete absent['notable'];

  const forms: Record<string, Record<string, unknown>> = {
    absent,
    null: { ...baseEntry(), notable: null },
    empty: { ...baseEntry(), notable: '' },
    whitespace: { ...baseEntry(), notable: '   ' },
  };

  for (const [name, entry] of Object.entries(forms)) {
    const [entity] = allProjects(derive(entry));
    assert.equal(
      entity?.isDeep,
      false,
      `\`notable\` ${name} must classify Shallow, identically to the other forms`,
    );
  }
});

test('the Shallow forms are identical in every derived property, not just isDeep', () => {
  // If two consumers could disagree about an entry's class, this is where the
  // divergence would first appear.
  const absent = baseEntry();
  delete absent['notable'];

  const derived = [absent, { ...baseEntry(), notable: null }, { ...baseEntry(), notable: '' }].map(
    (entry) => {
      const [entity] = allProjects(derive(entry));
      assert.ok(entity !== undefined);
      const { project: _project, ...visual } = entity;
      return visual;
    },
  );

  assert.deepEqual(derived[0], derived[1]);
  assert.deepEqual(derived[1], derived[2]);
});

test('no derived property is named for its source', () => {
  // The epic's naming rule: `isDeep` not `hasNotable`, `luminanceBand` not
  // `recencyValue`. Enforced here so a rename cannot pass review silently.
  const [entity] = allProjects(derive(baseEntry()));
  assert.ok(entity !== undefined);
  const keys = Object.keys(entity);
  assert.ok(keys.includes('isDeep'), 'isDeep must be present');
  assert.ok(keys.includes('luminanceBand'), 'luminanceBand must be present');
  assert.deepEqual(
    keys.filter((k) => /hasNotable|recencyValue/i.test(k)),
    [],
    'derived properties are named for what they are, never for their source',
  );
});

// --- Matrix row: Client grouping --------------------------------------------

test('three Projects across two Clients yield two Clients owning 2 and 1', () => {
  const graph = derive(
    { ...baseEntry(), client: 'SNCF', project: 'MDM replacement' },
    { ...baseEntry(), client: 'Orange', project: 'Billing migration' },
    { ...baseEntry(), client: 'SNCF', project: 'Referential API' },
  );

  assert.equal(graph.clients.length, 2, 'two distinct client names, two Clients');
  assert.deepEqual(
    graph.clients.map((c) => c.projects.length).sort(),
    [1, 2],
    'one Client owns two Projects, the other owns one',
  );

  const sncf = graph.clients.find((c) => c.name === 'SNCF');
  assert.equal(sncf?.projects.length, 2, 'one engagement, two problems, two Projects');
  assert.ok(
    sncf?.projects.every((p) => p.clientId === sncf.id),
    'every Project names its owning Client',
  );
});

test('every Client owns at least one Project', () => {
  const graph = derive(baseEntry(), { ...baseEntry(), client: 'Orange', project: 'Other' });
  assert.ok(
    graph.clients.every((c) => c.projects.length >= 1),
    'a Client with no Projects cannot be derived from a flat list of Projects',
  );
});

// --- Matrix row: Company attribute ------------------------------------------

test('no Body is emitted for a Company, set or null', () => {
  const graph = derive(
    { ...baseEntry(), client: 'SNCF', project: 'A', company: 'Some Consultancy' },
    { ...baseEntry(), client: 'Orange', project: 'B', company: null },
  );

  // A Company becoming a Body would show up as an extra Client (a Star) or an
  // extra Project (a Planet). Cardinality is the whole check.
  assert.equal(graph.clients.length, 2, 'two Clients — the consultancy is not a third');
  assert.equal(allProjects(graph).length, 2, 'two Projects — no Body for the Company');
  assert.deepEqual(
    graph.clients.map((c) => c.name).sort(),
    ['Orange', 'SNCF'],
    'no Client is named for a Company',
  );
});

test('the company relation resolves as a field lookup, not a graph edge', () => {
  const [entity] = allProjects(derive({ ...baseEntry(), company: 'Some Consultancy' }));
  assert.ok(entity !== undefined);
  assert.equal(entity.project.company, 'Some Consultancy', 'reachable by field lookup');
  assert.deepEqual(
    Object.keys(entity).filter((k) => /companyId|companyRef|companies/i.test(k)),
    [],
    'no edge, reference, or ID links a Project to a Company',
  );
});

// --- Matrix row: ID stability -----------------------------------------------

test('every entity ID is unchanged when the array order is reversed', () => {
  // AD-5: an ID derives from authored content, never from array offset. This is
  // the assertion that catches an index creeping into the derivation.
  const entries = [
    { ...baseEntry(), client: 'SNCF', project: 'MDM replacement' },
    { ...baseEntry(), client: 'Orange', project: 'Billing migration' },
    { ...baseEntry(), client: 'SNCF', project: 'Referential API' },
  ];

  const forward = derive(...entries);
  const reversed = derive(...[...entries].reverse());

  assert.deepEqual(
    allProjects(reversed)
      .map((p) => p.id)
      .sort(),
    allProjects(forward)
      .map((p) => p.id)
      .sort(),
    'Project IDs must survive a re-order',
  );
  assert.deepEqual(
    reversed.clients.map((c) => c.id).sort(),
    forward.clients.map((c) => c.id).sort(),
    'Client IDs must survive a re-order',
  );
});

test('an ID contains no array index', () => {
  const graph = derive(
    { ...baseEntry(), client: 'SNCF', project: 'A' },
    { ...baseEntry(), client: 'Orange', project: 'B' },
  );
  for (const project of allProjects(graph)) {
    assert.ok(
      project.id.includes('sncf') || project.id.includes('orange'),
      `the ID must be derived from content: ${project.id}`,
    );
  }
  assert.deepEqual(
    allProjects(graph).map((p) => p.id),
    [projectIdOf('SNCF', 'A'), projectIdOf('Orange', 'B')],
    'the ID functions and the graph must agree',
  );
});

test('a Project ID is distinct from its Client ID', () => {
  const graph = derive(baseEntry());
  const client = graph.clients[0];
  assert.ok(client !== undefined);
  assert.equal(client.id, clientIdOf('SNCF'));
  assert.notEqual(client.id, client.projects[0]?.id, 'a Star and a Planet are not the same entity');
});

test('two Clients with different names get different IDs', () => {
  assert.notEqual(clientIdOf('SNCF'), clientIdOf('Orange'));
});

// --- Matrix row: ID collision -----------------------------------------------

test('two entries sharing client + project throw, naming the colliding pair', () => {
  // Disambiguating with an index would reintroduce the positional dependence
  // AD-5 forbids, so the only option that keeps both guarantees is to fail.
  assert.throws(
    () =>
      derive(
        { ...baseEntry(), client: 'SNCF', project: 'MDM replacement' },
        { ...baseEntry(), client: 'SNCF', project: 'MDM replacement', team_size: 4 },
      ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /SNCF/, 'the message must name the colliding client');
      assert.match(error.message, /MDM replacement/, 'and the colliding project');
      return true;
    },
  );
});

test('client names differing by punctuation fold into one Client, first spelling winning', () => {
  // Accepted behaviour, not an oversight: divergent spellings of one client are
  // a data-entry reality, and two Stars for one organisation is the worse
  // failure. Pinned so the folding cannot be changed silently.
  const graph = derive(
    { ...baseEntry(), client: 'Acme Corp', project: 'Alpha' },
    { ...baseEntry(), client: 'Acme-Corp', project: 'Beta' },
  );
  assert.equal(graph.clients.length, 1, 'two spellings resolve to one Client');
  assert.equal(graph.clients[0]?.projects.length, 2, 'which owns both Projects');
  assert.equal(graph.clients[0]?.name, 'Acme Corp', 'named for the first spelling authored');
});

test('a collision that differs only in case still throws', () => {
  // Two spellings of one client name are one Client written twice, not two.
  assert.throws(
    () =>
      derive(
        { ...baseEntry(), client: 'SNCF', project: 'MDM replacement' },
        { ...baseEntry(), client: 'sncf', project: 'MDM Replacement' },
      ),
    /same identity/,
  );
});

test('the same project name under different Clients does not collide', () => {
  const graph = derive(
    { ...baseEntry(), client: 'SNCF', project: 'Data migration' },
    { ...baseEntry(), client: 'Orange', project: 'Data migration' },
  );
  const ids = allProjects(graph).map((p) => p.id);
  assert.equal(new Set(ids).size, 2, 'the Client is part of a Project identity');
});

// --- The committed data -----------------------------------------------------

test('a malformed asOf throws rather than deriving NaN', () => {
  // Unvalidated, a bad reference month makes every ongoing span NaN, which
  // serializes to null in the emitted artifact — plausible-looking and wrong.
  const parsed = CareerSchema.parse({
    projects: [{ ...baseEntry(), duration: { start: '2020-01', end: null } }],
  });
  for (const bad of ['garbage', '2026-13', '2026-9', '', '2026']) {
    assert.throws(
      () => deriveEntities(parsed, { asOf: bad }),
      /asOf must be an ISO 8601 year-month/,
      `"${bad}" must be rejected as a reference month`,
    );
  }
});

test('a non-Latin name yields a distinct, content-derived ID', () => {
  // The slug fallback: a name in a non-Latin script slugs to nothing, and
  // falling back to an array index would reintroduce the positional dependence
  // AD-5 forbids. Untested, the branch could be deleted with the suite green.
  const a = clientIdOf('日本電気');
  const b = clientIdOf('中国銀行');
  assert.notEqual(a, b, 'two distinct non-Latin names must not collide');
  for (const id of [a, b]) {
    assert.ok(id.length > 'client:'.length, `"${id}" must carry a segment beyond the prefix`);
    assert.ok(!/^client:-*$/.test(id), `"${id}" must not be an empty or hyphen-only segment`);
  }
  assert.equal(clientIdOf('日本電気'), a, 'and the ID is stable for the same name');
});

test('non-Latin IDs survive a re-order unchanged', () => {
  const entries = [
    { ...baseEntry(), client: '日本電気', project: 'Alpha' },
    { ...baseEntry(), client: '中国銀行', project: 'Beta' },
  ];
  const forward = derive(...entries).clients.map((c) => c.id).sort();
  const reversed = derive(...[...entries].reverse()).clients.map((c) => c.id).sort();
  assert.deepEqual(reversed, forward, 'authored order must not reach a non-Latin ID');
});

test('the committed career.json derives without throwing', () => {
  // The real file, not a fixture. A fixture cannot catch a duplicate entry or a
  // shape the authored data drifts into — and the counts are deliberately not
  // pinned, so this survives the file growing to the ~15-16 entries expected.
  const career = CareerSchema.parse(JSON.parse(readFileSync(CAREER_JSON, 'utf8')));
  const graph = deriveEntities(career, { asOf: AS_OF });

  assert.ok(graph.clients.length > 0, 'the committed data yields at least one Client');
  for (const client of graph.clients) {
    assert.ok(client.projects.length > 0, `Client "${client.name}" owns at least one Project`);
    for (const entity of client.projects) {
      assert.ok(Number.isFinite(entity.mass), `mass is finite for "${entity.id}"`);
      assert.ok(entity.mass > 0, `mass is positive for "${entity.id}"`);
      assert.ok(
        Number.isFinite(entity.railDistance) && entity.railDistance > 0,
        `railDistance is finite and positive for "${entity.id}"`,
      );
      assert.ok(
        RESTING_BANDS.includes(entity.luminanceBand),
        `luminanceBand stays in the resting set for "${entity.id}"`,
      );
    }
  }
});
