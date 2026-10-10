/**
 * Covers every row of the story's I/O & edge-case matrix for the emitted
 * destination set, and pins the walk **by mutation**.
 *
 * A cardinality test that only counts the happy path proves the emitter emitted
 * something, which is nearly tautological. What matters is that dropping a
 * Project from the walk, or emitting Clients only, fails this suite — so each of
 * those is applied to a set the assertions otherwise accept, and each must be
 * rejected. Without that, an assertion asserting "some entries came back" would
 * read as coverage while pinning nothing.
 *
 * No DOM, no React, no Three is imported here.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema, type Career } from '../data/schema.ts';
import { buildDestinations, type Destination } from './destinations.ts';
import { clientIdOf, deriveEntities, projectIdOf, type EntityGraph } from './entities.ts';

const AS_OF = '2026-09';
const DESTINATIONS_TS = fileURLToPath(new URL('./destinations.ts', import.meta.url));

// --- Fixtures ---------------------------------------------------------------

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

function entry(client: string, project: string, extra: Record<string, unknown> = {}) {
  return { ...baseEntry(), client, project, ...extra };
}

function careerOf(...entries: Record<string, unknown>[]): Career {
  return CareerSchema.parse({ asOf: AS_OF, projects: entries });
}

function graphOf(...entries: Record<string, unknown>[]): EntityGraph {
  return deriveEntities(careerOf(...entries), { asOf: AS_OF });
}

function destinationsOf(...entries: Record<string, unknown>[]): readonly Destination[] {
  return buildDestinations(graphOf(...entries));
}

/**
 * The nominal graph the matrix names: 2 Clients, 3 Projects.
 *
 * Deliberately lopsided — Alpha owns two Projects and Beta one — so a walk that
 * emitted one Project per Client, or one Client per Project, would land on a
 * different count rather than coincidentally on the right one.
 */
function nominalEntries(): Record<string, unknown>[] {
  return [
    entry('Alpha', 'One', { duration: { start: '2010-01', end: '2025-01' } }),
    entry('Alpha', 'Three', { duration: { start: '2019-01', end: '2020-01' }, weight: 2 }),
    entry('Beta', 'Two', { duration: { start: '2012-01', end: '2013-01' } }),
  ];
}

/** Every entity ID the graph carries, as the set the destinations must match. */
function entityIds(graph: EntityGraph): Set<string> {
  return new Set([
    ...graph.clients.map((client) => client.id),
    ...graph.clients.flatMap((client) => client.projects.map((project) => project.id)),
  ]);
}

// --- Matrix row: nominal graph ----------------------------------------------

test('a 2-Client, 3-Project graph emits exactly 5 destinations', () => {
  const graph = graphOf(...nominalEntries());
  assert.equal(graph.clients.length, 2, 'the fixture must derive two Clients');
  assert.equal(
    graph.clients.flatMap((c) => c.projects).length,
    3,
    'and three Projects, or the count below proves nothing',
  );

  const destinations = buildDestinations(graph);
  assert.equal(destinations.length, 5, 'one per Client and one per Project, and nothing else');
});

/**
 * The suite's real cardinality assertions, over a graph and the set claimed for
 * it — extracted so the mutation guard below can run **these exact assertions**
 * rather than a predicate that merely resembles them.
 *
 * A guard that re-implements set equality inline proves the inline copy rejects
 * a mutation, which is not the same claim as the suite rejecting it. Calling one
 * function from both places is what makes the guard real: weaken an assertion
 * here and the guard stops failing on the mutation it was pointed at.
 *
 * Throws (via `assert`) on any divergence, which is what lets the guard catch it.
 */
function assertAddressesEveryEntity(graph: EntityGraph, set: readonly Destination[]): void {
  const emitted = set.map((d) => d.id);

  assert.equal(new Set(emitted).size, emitted.length, 'no ID is emitted twice');
  assert.deepEqual(
    [...emitted].sort(),
    [...entityIds(graph)].sort(),
    'the destination set and the entity set must be the same set',
  );
  assert.equal(
    set.length,
    entityIds(graph).size,
    'one entry per Client and per Project, and nothing else',
  );
}

test('every Client and every Project appears exactly once, and no other entry does', () => {
  // The first acceptance criterion, stated directly: set equality both ways. A
  // subset assertion would accept a list that omitted an entity; a superset one
  // would accept a list that invented one.
  const graph = graphOf(...nominalEntries());
  assertAddressesEveryEntity(graph, buildDestinations(graph));
});

test('a destination is labelled by what the ID resolves to', () => {
  const graph = graphOf(...nominalEntries());
  const clients = new Set(graph.clients.map((c) => c.id));
  const projects = new Set(graph.clients.flatMap((c) => c.projects.map((p) => p.id)));

  for (const destination of buildDestinations(graph)) {
    const expected = clients.has(destination.id) ? 'client' : 'project';
    assert.ok(
      clients.has(destination.id) || projects.has(destination.id),
      `"${destination.id}" must resolve to an entity`,
    );
    assert.equal(destination.kind, expected, `"${destination.id}" is a ${expected}`);
  }
});

test('each Client is emitted immediately before its own Projects, and no other', () => {
  // The grouping, pinned as an exact sequence. The precedence test below asserts
  // only that a Project lands *somewhere* after its Star, which a flat
  // all-Clients-then-all-Projects emission satisfies for every pair — and that
  // list is a keyboard walk visiting every Rail stop before any Body, the exact
  // input-path defect this set exists to prevent (AD-15). Nothing else observes
  // order: `checkDestinations` builds a Map and a Set and never reads a
  // position, and the committed single-Client data cannot tell the two
  // orderings apart. Only a multi-Client fixture compared element by element
  // can, so this is that comparison.
  assert.deepEqual(
    destinationsOf(...nominalEntries()).map((d) => d.id),
    [
      clientIdOf('Alpha'),
      projectIdOf('Alpha', 'One'),
      projectIdOf('Alpha', 'Three'),
      clientIdOf('Beta'),
      projectIdOf('Beta', 'Two'),
    ],
    'each Star, then the Bodies orbiting it, before the next Star',
  );
});

test('a Client is emitted before its own Projects', () => {
  // A Rail stop is reached before the Bodies orbiting it. A walk that visited a
  // Project before its Star would cross a system boundary the scene does not
  // have.
  const graph = graphOf(...nominalEntries());
  const order = buildDestinations(graph).map((d) => d.id);

  for (const client of graph.clients) {
    const stopAt = order.indexOf(client.id);
    assert.ok(stopAt >= 0, `"${client.id}" must be in the set`);
    for (const project of client.projects) {
      const bodyAt = order.indexOf(project.id);
      assert.ok(bodyAt > stopAt, `"${project.id}" must follow its own Star "${client.id}"`);
    }
  }
});

// --- Matrix row: single Client, single Project ------------------------------

test('a 1-Client, 1-Project graph emits 2 destinations', () => {
  // `career.json`'s shape today. A walk keyed on there being more than one of
  // anything would only fail once a second entry landed.
  const destinations = destinationsOf(entry('Solo', 'Only'));
  assert.equal(destinations.length, 2);
  assert.deepEqual(
    destinations.map((d) => d.kind),
    ['client', 'project'],
    'the Star, then the Body in orbit around it',
  );
  assert.deepEqual(
    destinations.map((d) => d.id),
    [clientIdOf('Solo'), projectIdOf('Solo', 'Only')],
    'and each names the ID `entities.ts` minted',
  );
});

test('the committed career.json emits a destination for every entity it carries', () => {
  const career = CareerSchema.parse(
    JSON.parse(readFileSync(fileURLToPath(new URL('../data/career.json', import.meta.url)), 'utf8')),
  );
  const graph = deriveEntities(career, { asOf: career.asOf });
  assert.deepEqual(
    [...buildDestinations(graph).map((d) => d.id)].sort(),
    [...entityIds(graph)].sort(),
    'the committed data must be fully reachable',
  );
});

// --- Matrix row: re-ordered source ------------------------------------------

test('re-ordering career.json emits a byte-identical destination set', () => {
  // AD-5. The list is ordered by content-derived ID, so authored order reaches
  // neither an ID nor a position in the walk.
  const entries = nominalEntries();
  const forward = JSON.stringify(destinationsOf(...entries));
  const reversed = JSON.stringify(destinationsOf(...[...entries].reverse()));
  assert.equal(reversed, forward, 'authored order must not reach the destination set');
});

test('the re-order fixture genuinely re-orders, or the assertion above is vacuous', () => {
  // If `nominalEntries` were symmetric under reversal — or the graph collapsed
  // it — the byte-identity assertion would hold trivially. This pins that the
  // *graph* order does change, so only the sort makes the emission stable.
  //
  // The whole traversal, Clients *and* their Projects. Clients come out in
  // first-appearance order and each Client's Projects in authored order, so a
  // fixture can re-order one without re-ordering the other — and an assertion on
  // Client order alone would be vacuous for exactly this one, where Alpha
  // appears first either way.
  const entries = nominalEntries();
  const walk = (graph: EntityGraph): string[] =>
    graph.clients.flatMap((client) => [client.id, ...client.projects.map((p) => p.id)]);

  assert.notDeepEqual(
    walk(graphOf(...entries)),
    walk(graphOf(...[...entries].reverse())),
    'the graph must traverse differently under a re-order',
  );
});

test('the set is ordered by ID, not by the graph and not by timeAxis', () => {
  // Ordered by ID because ID order is stable under every rule change. Binding
  // the input walk to `timeAxis` would make a tuning change to `deriveTimeAxis`
  // silently re-order the keyboard.
  const graph = graphOf(...nominalEntries());
  const clientOrder = buildDestinations(graph)
    .filter((d) => d.kind === 'client')
    .map((d) => d.id);
  assert.deepEqual(clientOrder, [...clientOrder].sort(), 'Clients are walked in ID order');

  for (const client of graph.clients) {
    // Filtered against the graph's own Project IDs, never by rebuilding the ID
    // prefix from the Client's. A local restatement of the convention here would
    // be exactly the second ID derivation `destinations.ts` exists to avoid, and
    // it would keep passing after the convention changed underneath it.
    const owned = new Set(client.projects.map((project) => project.id));
    assert.ok(owned.size > 0, `"${client.id}" must own a Project to order`);

    const projectOrder = buildDestinations(graph)
      .filter((d) => d.kind === 'project' && owned.has(d.id))
      .map((d) => d.id);
    assert.equal(projectOrder.length, owned.size, 'every owned Project is in the set');
    assert.deepEqual(projectOrder, [...projectOrder].sort(), 'and its Projects in ID order');
  }
});

// --- The mutation guard: the walk itself ------------------------------------

test('dropping a Project from the emission fails the suite’s own assertions', () => {
  // The task names this explicitly, and the guard runs the **real** assertion
  // function the test above uses — not an inline predicate resembling it. A
  // re-implemented check would prove the copy rejects these mutations while the
  // suite quietly accepted them, which is the failure this guard exists to
  // prevent rather than to demonstrate.
  const graph = graphOf(...nominalEntries());
  const full = buildDestinations(graph);
  const firstProjectAt = full.findIndex((d) => d.kind === 'project');
  assert.ok(firstProjectAt >= 0, 'the fixture must carry a Project to drop');

  const mutations: [string, readonly Destination[]][] = [
    ['a dropped Project', full.filter((_, i) => i !== firstProjectAt)],
    ['Clients only', full.filter((d) => d.kind === 'client')],
    ['Projects only', full.filter((d) => d.kind === 'project')],
    ['a duplicated entry', [...full, full[0]!]],
    ['an invented entry', [...full, { id: 'client:nobody', kind: 'client' as const }]],
    ['an empty set', []],
  ];

  for (const [label, mutated] of mutations) {
    assert.throws(
      () => assertAddressesEveryEntity(graph, mutated),
      (error: unknown) => error instanceof assert.AssertionError,
      `${label} must fail the suite's own cardinality assertions — ` +
        'an assertion that accepts it pins nothing',
    );
  }

  // And the unmutated set still passes them, so the guard is not merely
  // asserting that the function throws on everything.
  assertAddressesEveryEntity(graph, full);
});

test('the emission is a single walk, not a second enumeration per consumer', () => {
  // The whole point of the story: one list, and both future input paths build
  // from it. Two calls on the same graph must be identical, so no consumer has a
  // reason to enumerate its own.
  const graph = graphOf(...nominalEntries());
  assert.deepEqual(
    buildDestinations(graph),
    buildDestinations(graph),
    'two calls on one graph must agree exactly',
  );
});

// --- Every entry names a minted ID, and carries nothing else ----------------

test('every destination names an ID entities.ts minted, never a re-slugified one', () => {
  // A second ID derivation is a second place for the contract to drift. Asserted
  // against `clientIdOf` and `projectIdOf` directly, so a local slugify here
  // that happened to agree today would still have to keep agreeing.
  const destinations = destinationsOf(...nominalEntries());
  const expected = new Set([
    clientIdOf('Alpha'),
    clientIdOf('Beta'),
    projectIdOf('Alpha', 'One'),
    projectIdOf('Alpha', 'Three'),
    projectIdOf('Beta', 'Two'),
  ]);
  assert.deepEqual(
    [...destinations.map((d) => d.id)].sort(),
    [...expected].sort(),
    'the IDs must be the minted ones exactly',
  );
});

test('a destination carries an ID and a kind, and no coordinate, index, or offset', () => {
  // The second acceptance criterion. A consumer resolves the entity by ID; a
  // value re-derived onto the entry would be a second copy of what the `clients`
  // tree already carries.
  for (const destination of destinationsOf(...nominalEntries())) {
    assert.deepEqual(Object.keys(destination).sort(), ['id', 'kind'], 'exactly two fields');
  }
});

test('the module re-derives no entity property and mints no ID of its own', () => {
  // Read off the source, because a re-derivation on a branch these fixtures do
  // not reach would leave every assertion above green.
  const code = readFileSync(DESTINATIONS_TS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bderive[A-Z]/, 'the walk must not call a mapping rule');
  assert.doesNotMatch(code, /slugify|toLowerCase|normalize\(/, 'nor mint an ID of its own');
  assert.doesNotMatch(code, /isDeep|luminanceBand|moteTier|railDistance|\bmass\b/, 'nor copy a derived property');
  assert.doesNotMatch(code, /\bposition\b|\btimeAxis\b/, 'nor a coordinate or an axis value');
});

// --- Purity ------------------------------------------------------------------

test('destinations.ts reads no clock, no random, no environment, and no DOM', () => {
  const code = readFileSync(DESTINATIONS_TS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /new\s+Date\b/, 'no clock read');
  assert.doesNotMatch(code, /Date\s*\.\s*now/, 'no clock read');
  assert.doesNotMatch(code, /Math\s*\.\s*random/, 'no randomness');
  assert.doesNotMatch(code, /process\s*\./, 'no environment read');
  assert.doesNotMatch(code, /node:fs|readFileSync|writeFileSync/, 'no I/O');
  assert.doesNotMatch(code, /from ['"](three|react|@react-three)/, 'no DOM, React, or Three import');
  assert.doesNotMatch(code, /\bdocument\b|\bwindow\b/, 'no DOM access');
});

test('the walk does not mutate the graph it was handed', () => {
  // `buildDestinations` sorts, and `Array.prototype.sort` is in place. Sorting
  // the graph's own arrays would re-order the entity tree for every later
  // caller — including `buildArtifact`, whose Client ordering is `timeAxis`.
  const graph = graphOf(...nominalEntries());
  const before = JSON.stringify(graph);
  buildDestinations(graph);
  assert.equal(JSON.stringify(graph), before, 'the graph must come back unchanged');
});
