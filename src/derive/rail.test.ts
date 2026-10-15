/**
 * The Rail's ordering, pinned on a fixture where it cannot coincide with
 * anything else the artifact carries.
 *
 * `career.json` holds one Client today, so every ordering in the document is
 * degenerate over the committed data: a `rail` built by ID order, by `timeAxis`
 * order, or by the Rail's own start-month order all emit the same single-element
 * list. Only a multi-Client fixture whose start order *opposes* its recency
 * order can tell them apart — the same reason `artifact.test.ts` fixes
 * `opposedEntries`, and the same failure mode that let an earlier story ship
 * with two orderings inverted while 191 tests stayed green.
 *
 * The walk is pinned **by mutation** as well. An assertion that merely counts
 * entries proves the emitter emitted something; what matters is that sorting by
 * the wrong key, or emitting Projects, fails this suite.
 *
 * No DOM, no React, no Three is imported here.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema } from '../data/schema.ts';
import { clientIdOf, deriveEntities } from './entities.ts';
import { buildRail, compareRailKeys, earliestStart, inRailOrder, startsAt } from './rail.ts';
import { stripComments } from '../../scripts/source-scan.ts';
import { entry, graphOf } from './fixtures.test.ts';

const RAIL_TS = fileURLToPath(new URL('./rail.ts', import.meta.url));
const SOLVE_TS = fileURLToPath(new URL('./solve.ts', import.meta.url));

// --- Fixtures ---------------------------------------------------------------

/**
 * A set whose `duration.start` order **deliberately opposes** its recency order,
 * and whose ID order opposes both.
 *
 * `Zulu` starts first (2010-01) and ends last (2025-01); `Alpha` starts second
 * (2012-01) and ends first (2013-01). So the Rail reads Zulu → Alpha, the
 * Fallback's time axis reads Alpha → Zulu, and an ID sort reads Alpha → Zulu
 * too. Three orderings, three different answers — which is what makes every
 * assertion below non-vacuous.
 *
 * Authored **Alpha first** so the graph's own first-appearance order is a fourth
 * distinct answer. A fixture authored in Rail order would let a `buildRail` that
 * did not sort at all pass every sequence assertion here, which is exactly the
 * mutation the guard at the foot of this file exists to reject.
 */
function opposedEntries(): Record<string, unknown>[] {
  return [
    entry('Alpha', 'A', { duration: { start: '2012-01', end: '2013-01' } }),
    entry('Zulu', 'Z', { duration: { start: '2010-01', end: '2025-01' } }),
  ];
}

// --- The fixture guard ------------------------------------------------------

test('the opposing fixture separates all three orderings, or every assertion below is vacuous', () => {
  // Asserted first and separately. If a future edit made the start order agree
  // with the recency order or with ID order, an assertion pinning `rail` would
  // still pass while proving nothing about *which* key it sorted on — exactly
  // how an earlier story shipped with two orderings inverted.
  const graph = graphOf(...opposedEntries());
  assert.equal(graph.clients.length, 2, 'the fixture must derive two Clients');

  const byStart = [...graph.clients].sort((a, b) => (startsAt(a) < startsAt(b) ? -1 : 1)).map((c) => c.id);
  const byRecency = [...graph.clients].sort((a, b) => a.timeAxis - b.timeAxis).map((c) => c.id);
  const byId = [...graph.clients].map((c) => c.id).sort();

  assert.notDeepEqual(byStart, byRecency, 'start order must differ from recency order');
  assert.notDeepEqual(byStart, byId, 'and from ID order');
});

// --- The ordering itself ----------------------------------------------------

test('the Rail is ordered by earliest duration.start, not by recency and not by ID', () => {
  // The story's whole reason for emitting this field. `Zulu` starts in 2010 and
  // `Alpha` in 2012, so the Rail reaches Zulu first — while the artifact's
  // `clients` array (recency) and its `destinations` list (ID) both put Alpha
  // first. A `rail` agreeing with either of those is not the Rail's order.
  assert.deepEqual(
    buildRail(graphOf(...opposedEntries())),
    [clientIdOf('Zulu'), clientIdOf('Alpha')],
    'earliest engagement first — the key the solve places Client Stars by',
  );
});

test('a Client is placed by its earliest Project, never by its latest', () => {
  // A Client owning a long early engagement and a short late one begins when the
  // early one began. Taking the maximum would place it by its most recent work —
  // which is what `timeAxis` measures and what the Rail deliberately does not.
  const rail = buildRail(
    graphOf(
      entry('Early', 'Old', { duration: { start: '2005-01', end: '2006-01' } }),
      entry('Early', 'New', { duration: { start: '2024-01', end: '2025-01' } }),
      entry('Later', 'Mid', { duration: { start: '2015-01', end: '2016-01' } }),
    ),
  );
  assert.deepEqual(
    rail,
    [clientIdOf('Early'), clientIdOf('Later')],
    'the Client that began first comes first, however recently it also worked',
  );
});

test('Clients starting in the same month are ordered by ID, whatever the authored order', () => {
  // Without the tiebreak, `Array.prototype.sort` leaves tied entries in input
  // order and a re-ordered `career.json` would move two Clients past each other
  // on the Rail — which moves every coordinate, since `node.index` follows this
  // array into d3's placement.
  const tied = [
    entry('Zeta', 'Z', { duration: { start: '2019-01', end: '2020-01' } }),
    entry('Alpha', 'A', { duration: { start: '2019-01', end: '2021-01' } }),
  ];
  assert.deepEqual(
    buildRail(graphOf(...tied)),
    [clientIdOf('Alpha'), clientIdOf('Zeta')],
    'a tie is broken by ID, so the file cannot decide it',
  );
  assert.deepEqual(
    buildRail(graphOf(...[...tied].reverse())),
    buildRail(graphOf(...tied)),
    'and the reversed file emits the same Rail',
  );
});

test('the tied fixture genuinely ties, or the tie-break assertion is vacuous', () => {
  const graph = graphOf(
    entry('Zeta', 'Z', { duration: { start: '2019-01', end: '2020-01' } }),
    entry('Alpha', 'A', { duration: { start: '2019-01', end: '2021-01' } }),
  );
  const [first, second] = graph.clients;
  assert.ok(first !== undefined && second !== undefined);
  assert.equal(startsAt(first), startsAt(second), 'both Clients must start in the same month');
  assert.notEqual(first.id, second.id, 'and be distinguishable by ID');
});

test('re-ordering career.json emits a byte-identical Rail', () => {
  // AD-5, carried to this list: the order is a property of the content, and the
  // authored order reaches neither an ID nor a position in it.
  const entries = opposedEntries();
  assert.deepEqual(
    buildRail(graphOf(...[...entries].reverse())),
    buildRail(graphOf(...entries)),
    'authored order must not reach the Rail',
  );
});

test('the re-order fixture genuinely re-orders, or the assertion above is vacuous', () => {
  const entries = opposedEntries();
  assert.notDeepEqual(
    graphOf(...entries).clients.map((c) => c.id),
    graphOf(...[...entries].reverse()).clients.map((c) => c.id),
    'the graph must traverse differently under a re-order',
  );
});

// --- Client granularity -----------------------------------------------------

test('the Rail names every Client exactly once, and no Project', () => {
  // AD-4a: the Rail stops at Clients. A Project is reached by being framed at
  // its Client's stop, so a Project ID here would describe a stop the journey
  // never makes — the failure the gate reports as a granularity error.
  const graph = graphOf(
    ...opposedEntries(),
    entry('Zulu', 'Second', { weight: 2 }),
    entry('Zulu', 'Third', { weight: 0.5 }),
  );
  const clientIds = graph.clients.map((client) => client.id);
  const projectIds = graph.clients.flatMap((client) => client.projects.map((p) => p.id));
  assert.ok(projectIds.length > clientIds.length, 'the fixture must hold more Projects than Clients');

  const rail = buildRail(graph);
  assert.deepEqual([...rail].sort(), [...clientIds].sort(), 'exactly one entry per Client');
  assert.equal(new Set(rail).size, rail.length, 'and none listed twice');
  for (const id of projectIds) {
    assert.equal(rail.includes(id), false, `"${id}" is a Project and has no place on the Rail`);
  }
});

test('a one-Client graph emits a one-stop Rail', () => {
  // `career.json`'s shape today. A walk keyed on there being more than one of
  // anything would only fail once a second entry landed.
  assert.deepEqual(buildRail(graphOf(entry('Solo', 'Only'))), [clientIdOf('Solo')]);
});

test('the committed career.json emits a Rail naming every Client it carries', () => {
  const career = CareerSchema.parse(
    JSON.parse(readFileSync(fileURLToPath(new URL('../data/career.json', import.meta.url)), 'utf8')),
  );
  const graph = deriveEntities(career, { asOf: career.asOf });
  assert.deepEqual(
    [...buildRail(graph)].sort(),
    [...graph.clients.map((client) => client.id)].sort(),
    'every committed Client must have a stop',
  );
});

// --- The mutation guard: the ordering key itself ----------------------------

test('sorting the Rail by any other key fails the ordering assertion', () => {
  // Pins the assertion rather than the implementation. A `buildRail` that sorted
  // by recency, by ID, or by the graph's own order would emit a plausible list of
  // the right length — and only a comparison against the expected *sequence* on
  // this fixture rejects it. Each wrong key is applied to the same graph and each
  // must produce a different answer from the real one.
  const graph = graphOf(...opposedEntries());
  const real = buildRail(graph);

  const wrong: [string, readonly string[]][] = [
    ['recency order', [...graph.clients].sort((a, b) => a.timeAxis - b.timeAxis).map((c) => c.id)],
    ['ID order', graph.clients.map((c) => c.id).sort()],
    ['graph order', graph.clients.map((c) => c.id)],
    ['reversed Rail order', [...real].reverse()],
  ];

  for (const [label, order] of wrong) {
    assert.notDeepEqual(real, order, `${label} must not coincide with the Rail's on this fixture`);
  }
});

test('the emission is a single walk, so no consumer has reason to re-derive it', () => {
  const graph = graphOf(...opposedEntries());
  assert.deepEqual(buildRail(graph), buildRail(graph), 'two calls on one graph must agree exactly');
});

test('the walk does not mutate the graph it was handed', () => {
  // `inRailOrder` sorts, and `Array.prototype.sort` is in place. Sorting the
  // graph's own array would re-order the entity tree for every later caller —
  // including `buildArtifact`, whose Client ordering is `timeAxis`.
  const graph = graphOf(...opposedEntries());
  const before = JSON.stringify(graph);
  buildRail(graph);
  assert.equal(JSON.stringify(graph), before, 'the graph must come back unchanged');
});

// --- One implementation, not two --------------------------------------------

test('solve.ts imports the Rail ordering rather than restating it', () => {
  // The reason this module exists. `inRailOrder` used to be private to
  // `solve.ts`, where it feeds `node.index` into d3's placement — so a second
  // copy here would not merely re-order a list, it would move every coordinate
  // the first time either copy changed. Read off the source, because two
  // implementations that agree today pass every behavioural assertion.
  const solve = readFileSync(SOLVE_TS, 'utf8');
  assert.match(
    solve,
    /import\s*\{[^}]*\binRailOrder\b[^}]*\}\s*from\s*'\.\/rail\.ts'/,
    'solve.ts must import the ordering from rail.ts',
  );

  const code = stripComments(solve);
  assert.doesNotMatch(code, /function\s+inRailOrder\b/, 'and must not declare its own');
  assert.doesNotMatch(code, /function\s+startsAt\b/, 'nor its own start-month reader');
  assert.doesNotMatch(code, /function\s+compareCodepoints\b/, 'nor its own comparator');
});

test('the emitted Rail is the node order the solve builds from, not a parallel list', () => {
  // `buildRail` is defined as `inRailOrder(graph.clients).map(c => c.id)`, so
  // asserting one against the other compares an expression with itself and cannot
  // fail for any implementation. What it *can* pin is the seam: that `solveLayout`
  // orders its nodes with the same exported `inRailOrder` this module emits from,
  // rather than with a second sort of its own that happens to agree today.
  //
  // The claim about the solved geometry — that Client Stars ascend in x along the
  // emitted Rail — needs a solve to observe, so it is asserted where the solve
  // already runs: `solve.test.ts`, "the Rail the artifact emits is the order the
  // solve lays Client Stars out in".
  const code = stripComments(readFileSync(SOLVE_TS, 'utf8'));

  assert.match(
    code,
    /import\s*\{[^}]*\binRailOrder\b[^}]*\}\s*from\s*'\.\/rail\.ts'/,
    'the solve must order its nodes with the comparator this module exports',
  );
  assert.match(code, /inRailOrder\(/, 'and must actually call it');

  const graph = graphOf(...opposedEntries());
  assert.deepEqual(
    inRailOrder(graph.clients).map((client) => client.id),
    [...buildRail(graph)],
    'the emitted list is that same order, projected onto IDs',
  );
});

// --- Purity -----------------------------------------------------------------

test('rail.ts reads no clock, no random, no environment, and no DOM', () => {
  const code = stripComments(readFileSync(RAIL_TS, 'utf8'));
  assert.doesNotMatch(code, /new\s+Date\b/, 'no clock read');
  assert.doesNotMatch(code, /Date\s*\.\s*now/, 'no clock read');
  assert.doesNotMatch(code, /Math\s*\.\s*random/, 'no randomness');
  assert.doesNotMatch(code, /process\s*\./, 'no environment read');
  assert.doesNotMatch(code, /node:fs|readFileSync|writeFileSync/, 'no I/O');
  assert.doesNotMatch(code, /from ['"](three|react|@react-three)/, 'no DOM, React, or Three import');
  assert.doesNotMatch(code, /\bdocument\b|\bwindow\b/, 'no DOM access');
  assert.doesNotMatch(code, /localeCompare/, 'and no locale-dependent collation');
});

test('the module mints no ID and re-derives no entity property', () => {
  // Read off the source, because a re-derivation on a branch these fixtures do
  // not reach would leave every assertion above green.
  const code = stripComments(readFileSync(RAIL_TS, 'utf8'));
  assert.doesNotMatch(code, /\bderive[A-Z]/, 'the walk must not call a mapping rule');
  assert.doesNotMatch(code, /slugify|toLowerCase|normalize\(/, 'nor mint an ID of its own');
  assert.doesNotMatch(code, /isDeep|luminanceBand|moteTier|railDistance|\bmass\b/, 'nor copy a derived property');
  assert.doesNotMatch(code, /\bposition\b|\btimeAxis\b/, 'nor a coordinate or an axis value');
});

// --- The empty-Client guard -------------------------------------------------

test('a Client owning no Projects is named rather than sorted to the head of the Rail', () => {
  // `deriveEntities` cannot produce one — the graph is folded from a flat list of
  // Projects — but the type does not say so, and a `?? '0000-00'` fallback would
  // put a future empty Client first on the Rail and announce nothing.
  const graph = graphOf(...opposedEntries());
  const client = graph.clients[0];
  assert.ok(client !== undefined);
  const empty = { ...client, projects: [] };

  assert.throws(
    () => startsAt(empty),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes(client.id), 'the failure names the Client');
      assert.match(error.message, /no place on the Rail/, 'and says what it cannot do');
      return true;
    },
  );
});

// --- Story 3.12: the rule split out for the gate -----------------------------

test('earliestStart is the minimum start month, and startsAt reads through it', () => {
  assert.equal(earliestStart('client:x', ['2019-03', '2017-09', '2018-01']), '2017-09');
  const graph = graphOf(entry('Alpha', 'A', { duration: { start: '2012-01', end: '2013-01' } }), entry('Alpha', 'B', { duration: { start: '2010-05', end: '2011-01' } }));
  const client = graph.clients[0];
  assert.ok(client !== undefined);
  assert.equal(startsAt(client), '2010-05');
});

test('earliestStart throws on no starts, naming the Client', () => {
  assert.throws(() => earliestStart('client:empty', []), /"client:empty".*no place on the Rail/);
});

test('compareRailKeys orders by start, then by ID, by codepoint', () => {
  const keys = [
    { id: 'client:b', start: '2019-01' },
    { id: 'client:a', start: '2019-01' },
    { id: 'client:z', start: '2010-01' },
  ];
  assert.deepEqual([...keys].sort(compareRailKeys).map((key) => key.id), ['client:z', 'client:a', 'client:b']);
});
