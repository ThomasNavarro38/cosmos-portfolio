/**
 * Covers every Dwell row of the story's I/O & edge-case matrix, and pins the
 * derivation **by mutation**.
 *
 * A tempo test that only checks the happy path proves the function returned one
 * of its own constants, which is nearly tautological. What matters is that a
 * Dwell ignoring the Deep count fails this suite — so that mutation is applied
 * to a derivation the assertions otherwise accept, and it must be rejected.
 * Without it, an assertion asserting "some tempo came back" would read as
 * coverage while pinning nothing.
 *
 * No DOM, no React, no Three is imported here.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema, type Career } from '../data/schema.ts';
import { DWELL_TEMPOS, buildDwell, deriveDwell, type DwellTempo } from './dwell.ts';
import { clientIdOf, deriveEntities, projectIdOf, type ClientEntity, type EntityGraph } from './entities.ts';
import { stripComments } from '../../scripts/source-scan.ts';

const AS_OF = '2026-09';
const DWELL_TS = fileURLToPath(new URL('./dwell.ts', import.meta.url));

// --- Fixtures ---------------------------------------------------------------

function baseEntry(): Record<string, unknown> {
  return {
    client: 'SNCF',
    project: 'Client referential — MDM replacement',
    company: null,
    role: 'Technical lead',
    built: 'Replaced a commercial product with an in-house application.',
    team_size: 11,
    duration: { start: '2019-01', end: '2021-01' },
    notable: 'Problem stated. [[The constraint, in one sentence.]] The decision taken.',
    skills: ['Java', 'Spring Boot'],
  };
}

/** A Deep entry: `notable` carries prose. */
function deep(client: string, project: string): Record<string, unknown> {
  return { ...baseEntry(), client, project, notable: 'Problem stated. [[The constraint, in one sentence.]] The decision taken.' };
}

/** A Shallow entry: `notable` is empty, which is one of the three Shallow forms. */
function shallow(client: string, project: string): Record<string, unknown> {
  return { ...baseEntry(), client, project, notable: '' };
}

function careerOf(...entries: Record<string, unknown>[]): Career {
  return CareerSchema.parse({ asOf: AS_OF, projects: entries });
}

function graphOf(...entries: Record<string, unknown>[]): EntityGraph {
  return deriveEntities(careerOf(...entries), { asOf: AS_OF });
}

/** The Client the given name resolves to, or a failure naming it. */
function clientOf(graph: EntityGraph, name: string): ClientEntity {
  const id = clientIdOf(name);
  const client = graph.clients.find((candidate) => candidate.id === id);
  assert.ok(client !== undefined, `the fixture must derive a Client "${id}"`);
  return client;
}

/** Where a tempo sits on the ladder. Higher is longer. */
function rankOf(tempo: DwellTempo): number {
  const index = DWELL_TEMPOS.indexOf(tempo);
  assert.ok(index >= 0, `"${tempo}" must be a declared tempo`);
  return index;
}

// --- Matrix row: Deep vs Shallow system -------------------------------------

test('a Client holding Deep Projects ranks strictly longer than one holding none', () => {
  // The story's central claim, and the acceptance criterion stated directly.
  // Client A holds two Deep Projects; Client B holds none.
  const graph = graphOf(
    deep('Alpha', 'One'),
    deep('Alpha', 'Two'),
    shallow('Beta', 'Three'),
  );

  const alpha = deriveDwell(clientOf(graph, 'Alpha'));
  const beta = deriveDwell(clientOf(graph, 'Beta'));

  assert.ok(
    rankOf(alpha) > rankOf(beta),
    `a Deep-bearing system must be held longer: got "${alpha}" vs "${beta}"`,
  );
});

test('one Deep Project is already measurably longer than none', () => {
  // The AC says "one or more". A ladder that only separated at two would leave
  // most Clients — which hold one Deep Project — pacing like an empty system.
  const graph = graphOf(deep('One', 'D'), shallow('None', 'S'));
  assert.ok(
    rankOf(deriveDwell(clientOf(graph, 'One'))) > rankOf(deriveDwell(clientOf(graph, 'None'))),
    'a single Deep Project must already lengthen the stop',
  );
});

test('the tempo never shortens as the Deep count grows', () => {
  // Monotonic over the whole reachable range, not merely at the two endpoints a
  // single fixture happens to hit.
  let previous = -1;
  for (let count = 0; count <= DWELL_TEMPOS.length + 3; count += 1) {
    const entries = [
      ...Array.from({ length: count }, (_, i) => deep('Ladder', `Deep ${i}`)),
      shallow('Ladder', 'Shallow filler'),
    ];
    const rank = rankOf(deriveDwell(clientOf(graphOf(...entries), 'Ladder')));
    assert.ok(rank >= previous, `${count} Deep Projects must not shorten the stop`);
    previous = rank;
  }
});

// --- Matrix row: Deep count ceiling -----------------------------------------

test('more Deep Projects than there are classes clamps to the longest, reading nothing out of range', () => {
  // An unclamped index reads `undefined` out of the tuple, which would emit a
  // value the schema then rejects with no explanation of which Client produced
  // it. The clamp is the reason the ladder is safe to widen later.
  const longest = DWELL_TEMPOS[DWELL_TEMPOS.length - 1];
  assert.ok(longest !== undefined);

  for (const count of [DWELL_TEMPOS.length, DWELL_TEMPOS.length + 1, DWELL_TEMPOS.length + 12]) {
    const entries = Array.from({ length: count }, (_, i) => deep('Ceiling', `Deep ${i}`));
    const tempo = deriveDwell(clientOf(graphOf(...entries), 'Ceiling'));
    assert.equal(tempo, longest, `${count} Deep Projects must clamp to the longest class`);
    assert.ok(DWELL_TEMPOS.includes(tempo), 'and never read past the end of the tuple');
  }
});

// --- Matrix row: single Shallow Project -------------------------------------

test('one Client with one Shallow Project gets the shortest tempo', () => {
  // `career.json`'s shape is one Client today, and a derivation keyed on there
  // being more than one of anything would only fail once a second entry landed.
  const shortest = DWELL_TEMPOS[0];
  assert.ok(shortest !== undefined);
  assert.equal(deriveDwell(clientOf(graphOf(shallow('Solo', 'Only')), 'Solo')), shortest);
});

test('the three Shallow forms all count as Shallow', () => {
  // An absent `notable`, `null`, and `""` differ in parsed shape but mean one
  // thing. A Dwell that counted a `null` as Deep would pace an empty system like
  // a full one.
  const shortest = DWELL_TEMPOS[0];
  assert.ok(shortest !== undefined);

  for (const [label, value] of [['absent', undefined], ['null', null], ['empty', '']] as const) {
    const entry: Record<string, unknown> = { ...baseEntry(), client: 'Forms', project: 'Only' };
    if (value === undefined) delete entry['notable'];
    else entry['notable'] = value;
    assert.equal(
      deriveDwell(clientOf(graphOf(entry), 'Forms')),
      shortest,
      `the ${label} Shallow form must not lengthen the stop`,
    );
  }
});

/**
 * The suite's real claim about the emitted list, over a graph and the Dwell
 * entries claimed for it — extracted so the mutation guard below runs **these
 * exact assertions** rather than a predicate that merely resembles them.
 *
 * The set assertions elsewhere in this file check *which* Clients are named. This
 * one checks that each entry carries the tempo of the Client its own `subject`
 * resolves to — the join `buildDwell` makes. A list that paired every Client
 * with the *next* Client's tempo satisfies every set, ordering, and cardinality
 * assertion in this suite, so nothing but this resolves it.
 *
 * Throws (via `assert`) on any divergence, which is what lets the guard catch it.
 */
function assertPacesEverySystem(graph: EntityGraph, entries: readonly { subject: string; tempo: string }[]): void {
  const clientIds = graph.clients.map((client) => client.id);

  assert.deepEqual(
    [...entries.map((entry) => entry.subject)].sort(),
    [...clientIds].sort(),
    'the Dwell set and the Client set must be the same set',
  );
  assert.equal(entries.length, clientIds.length, 'one entry per Client, and nothing else');

  for (const entry of entries) {
    const client = graph.clients.find((candidate) => candidate.id === entry.subject);
    assert.ok(client !== undefined, `"${entry.subject}" must resolve to a Client in the graph`);
    assert.equal(
      entry.tempo,
      deriveDwell(client),
      `"${entry.subject}" is paced "${entry.tempo}" but its own system derives ` +
        `"${deriveDwell(client)}" — a stop paced by another Client's depth`,
    );
  }
}

// --- Client granularity: one entry per Client, none for a Project -----------

test('the emitted list carries exactly one entry per Client and none naming a Project', () => {
  // The first acceptance criterion, and AD-4a: the Rail stops at Clients. A
  // per-Project entry would describe a stop the journey never makes.
  const graph = graphOf(deep('Alpha', 'One'), shallow('Alpha', 'Two'), shallow('Beta', 'Three'));
  const emitted = buildDwell(graph);

  const clientIds = graph.clients.map((client) => client.id);
  const projectIds = graph.clients.flatMap((client) => client.projects.map((p) => p.id));
  assert.ok(projectIds.length > clientIds.length, 'the fixture must hold more Projects than Clients');

  assert.deepEqual(
    [...emitted.map((entry) => entry.subject)].sort(),
    [...clientIds].sort(),
    'the Dwell set and the Client set must be the same set',
  );
  assert.equal(emitted.length, clientIds.length, 'one entry per Client, and nothing else');

  for (const id of projectIds) {
    assert.equal(
      emitted.some((entry) => entry.subject === id),
      false,
      `"${id}" is a Project and must have no Dwell entry`,
    );
  }
});

test('every subject names an ID entities.ts minted, never a re-slugified one', () => {
  const emitted = buildDwell(graphOf(deep('Alpha', 'One'), shallow('Beta', 'Two')));
  assert.deepEqual(
    [...emitted.map((entry) => entry.subject)].sort(),
    [clientIdOf('Alpha'), clientIdOf('Beta')].sort(),
    'the IDs must be the minted ones exactly',
  );
  assert.equal(
    emitted.some((entry) => entry.subject === projectIdOf('Alpha', 'One')),
    false,
    'and never a Project ID',
  );
});

test('an entry carries a subject and a tempo, and nothing else', () => {
  for (const entry of buildDwell(graphOf(deep('Alpha', 'One'), shallow('Beta', 'Two')))) {
    assert.deepEqual(Object.keys(entry).sort(), ['subject', 'tempo'], 'exactly two fields');
  }
});

test('each entry carries the tempo of the Client its own subject resolves to', () => {
  // The set assertions above hold on a list whose subjects and tempos are
  // correct *individually* while being paired with each other wrongly. This
  // resolves each subject back to its own Client. The fixture holds one
  // Deep-bearing and one Shallow-only Client, so the two tempos genuinely
  // differ — on a fixture where every Client derives the same tempo, any
  // pairing agrees and the assertion is vacuous.
  const graph = graphOf(deep('Alpha', 'One'), deep('Alpha', 'Two'), shallow('Beta', 'Three'));
  assert.notEqual(
    deriveDwell(clientOf(graph, 'Alpha')),
    deriveDwell(clientOf(graph, 'Beta')),
    'the fixture must derive two different tempos, or the join below is vacuous',
  );

  assertPacesEverySystem(graph, buildDwell(graph));
});

test('a Dwell list paired to the wrong Client fails the suite’s own assertion', () => {
  // The counterpart to the derivation guard below: this one breaks the *join*
  // rather than the derivation. Every mutation here keeps the subject set, the
  // cardinality, the ordering, and the tempo multiset exactly as the real
  // emitter produced them — only the pairing moves. Anything the set assertions
  // alone could catch would make this guard prove nothing.
  const graph = graphOf(deep('Alpha', 'One'), deep('Alpha', 'Two'), shallow('Beta', 'Three'));
  const real = buildDwell(graph);
  assert.ok(real.length >= 2, 'the fixture must emit at least two entries to shift between');

  // The real emission passes it, or every mutation below is vacuous.
  assertPacesEverySystem(graph, real);

  const shifted = real.map((entry, index) => ({
    subject: entry.subject,
    // Each Client gets the NEXT Client's tempo — same subjects, same tempo
    // multiset, same order, wrong join.
    tempo: (real[(index + 1) % real.length] ?? entry).tempo as string,
  }));
  const constant = real.map((entry) => ({
    subject: entry.subject,
    tempo: (real[0] ?? entry).tempo as string,
  }));

  for (const [label, mutated] of [['a shifted pairing', shifted], ['a constant tempo', constant]] as const) {
    assert.throws(
      () => assertPacesEverySystem(graph, mutated),
      (error: unknown) => error instanceof assert.AssertionError,
      `${label} must fail the suite's own assertion — one that accepts it pins nothing`,
    );
  }
});

// --- Matrix row: re-ordered source ------------------------------------------

test('re-ordering career.json emits a byte-identical Dwell list', () => {
  // AD-5. The list is ordered by content-derived ID, so authored order reaches
  // neither an ID nor a position in the list.
  const entries = [deep('Alpha', 'One'), shallow('Alpha', 'Two'), shallow('Beta', 'Three')];
  const forward = JSON.stringify(buildDwell(graphOf(...entries)));
  const reversed = JSON.stringify(buildDwell(graphOf(...[...entries].reverse())));
  assert.equal(reversed, forward, 'authored order must not reach the Dwell list');
});

test('the re-order fixture genuinely re-orders, or the assertion above is vacuous', () => {
  // The same guard `destinations.test.ts` carries. If the graph collapsed the
  // re-order, byte identity would hold trivially.
  const entries = [deep('Alpha', 'One'), shallow('Alpha', 'Two'), shallow('Beta', 'Three')];
  const walk = (graph: EntityGraph): string[] =>
    graph.clients.flatMap((client) => [client.id, ...client.projects.map((p) => p.id)]);

  assert.notDeepEqual(
    walk(graphOf(...entries)),
    walk(graphOf(...[...entries].reverse())),
    'the graph must traverse differently under a re-order',
  );
});

test('the list is ordered by ID, not by the graph and not by timeAxis', () => {
  const emitted = buildDwell(graphOf(
    shallow('Zeta', 'Z'),
    deep('Alpha', 'A'),
    shallow('Mu', 'M'),
  )).map((entry) => entry.subject);
  assert.deepEqual(emitted, [...emitted].sort(), 'Clients are paced in ID order');
});

// --- The mutation guard: the derivation itself ------------------------------

test('a Dwell ignoring the Deep count fails the suite’s own assertion', () => {
  // The task names this explicitly. The guard runs the **real** claim the suite
  // makes — a Deep-bearing system ranks strictly longer — against a derivation
  // that ignores `isDeep`, and it must reject it. A re-implemented check would
  // prove the copy rejects the mutation while the suite quietly accepted it.
  // Alpha holds **fewer** Projects than Beta but is the only one holding a Deep
  // one, so volume and depth genuinely disagree here. A fixture where Alpha also
  // held more Projects would let a total-count derivation satisfy the claim, and
  // the volume mutation below would be vacuous.
  const graph = graphOf(
    deep('Alpha', 'One'),
    shallow('Beta', 'Two'),
    shallow('Beta', 'Three'),
    shallow('Beta', 'Four'),
  );
  const alpha = clientOf(graph, 'Alpha');
  const beta = clientOf(graph, 'Beta');
  assert.ok(beta.projects.length > alpha.projects.length, 'volume must oppose depth in this fixture');

  /** The suite's real claim, extracted so the guard runs it rather than a copy. */
  const assertDeepIsLonger = (derive: (client: ClientEntity) => DwellTempo): void => {
    assert.ok(
      rankOf(derive(alpha)) > rankOf(derive(beta)),
      'a Deep-bearing system must be held strictly longer',
    );
  };

  // The real derivation passes it, or every mutation below is vacuous.
  assertDeepIsLonger(deriveDwell);

  const mutations: [string, (client: ClientEntity) => DwellTempo][] = [
    ['a constant tempo', () => 'dwell-steady'],
    ['the shortest tempo always', () => DWELL_TEMPOS[0] ?? 'dwell-brief'],
    ['the longest tempo always', () => DWELL_TEMPOS[DWELL_TEMPOS.length - 1] ?? 'dwell-brief'],
    // Counts Projects rather than Deep Projects — the rejected alternative that
    // rewards volume, contradicting SM-C3. The fixture above holds volume and
    // depth apart, so only a Deep count can satisfy the claim.
    [
      'a total Project count',
      (client) => DWELL_TEMPOS[Math.min(client.projects.length - 1, DWELL_TEMPOS.length - 1)] ?? 'dwell-brief',
    ],
    // Inverted: Deep systems held shortest.
    [
      'an inverted ladder',
      (client) => {
        const deepCount = client.projects.filter((p) => p.isDeep).length;
        const index = Math.max(DWELL_TEMPOS.length - 1 - deepCount, 0);
        return DWELL_TEMPOS[index] ?? 'dwell-brief';
      },
    ],
  ];

  for (const [label, mutated] of mutations) {
    assert.throws(
      () => assertDeepIsLonger(mutated),
      (error: unknown) => error instanceof assert.AssertionError,
      `${label} must fail the suite's own assertion — one that accepts it pins nothing`,
    );
  }
});

test('depth outranks volume: one Deep Project beats three Shallow ones', () => {
  // SM-C3, stated as its own claim rather than only as a mutation the guard
  // rejects. Total Project count was a rejected alternative precisely because it
  // rewards volume — a Client with three thin engagements is not held longer
  // than one with a single engagement worth reading.
  const graph = graphOf(
    deep('Alpha', 'One'),
    shallow('Beta', 'Two'),
    shallow('Beta', 'Three'),
    shallow('Beta', 'Four'),
  );
  const alpha = clientOf(graph, 'Alpha');
  const beta = clientOf(graph, 'Beta');

  assert.ok(beta.projects.length > alpha.projects.length, 'Beta must hold more Projects');
  assert.ok(
    rankOf(deriveDwell(alpha)) > rankOf(deriveDwell(beta)),
    'and Alpha must still be held longer — depth, not volume (SM-C3)',
  );
});

// --- A class, never a duration ----------------------------------------------

test('no tempo is a millisecond, a second, or a frame count', () => {
  // The Boundaries say so directly, and the union makes it unrepresentable: a
  // consumer structurally cannot read a number out of a tempo, so the
  // milliseconds stay where they belong — tuned on the greybox at M1.
  for (const tempo of DWELL_TEMPOS) {
    assert.equal(typeof tempo, 'string', 'a tempo is a class, never a number');
    assert.equal(Number.isNaN(Number(tempo)), true, `"${tempo}" must not parse as a number`);
    assert.doesNotMatch(tempo, /\d/, `"${tempo}" must carry no digit`);
    assert.doesNotMatch(tempo, /\bms\b|second|frame|duration|millis/i, `"${tempo}" must name a tempo, not a time`);
  }
});

test('the module emits no duration number of any kind', () => {
  // Read off the source, because a millisecond on a branch these fixtures do not
  // reach would leave every assertion above green.
  const code = stripComments(readFileSync(DWELL_TS, 'utf8'));
  assert.doesNotMatch(code, /\bms\b|milliseconds?|setTimeout|requestAnimationFrame/i, 'no time unit');
  assert.doesNotMatch(code, /\b\d{3,}\b/, 'no duration-shaped literal');
});

test('the tempos are a closed set, ordered shortest first', () => {
  // Order is load-bearing: `deriveDwell` indexes into the tuple and this suite
  // asserts a longer tempo by index.
  assert.ok(DWELL_TEMPOS.length >= 2, 'a one-member ladder could not separate Deep from Shallow');
  assert.equal(new Set(DWELL_TEMPOS).size, DWELL_TEMPOS.length, 'no tempo is listed twice');

  const code = readFileSync(DWELL_TS, 'utf8');
  assert.match(code, /DWELL_TEMPOS = \[[\s\S]*?\] as const/, 'the tuple is closed with `as const`');
});

// --- Derived, never authored -------------------------------------------------

test('the module reads no authored field and re-classifies nothing', () => {
  // Not a fourth mapping rule (FR-3): it computes no Body appearance and reads
  // no authored field, only `isDeep`, which `entities.ts` resolved once.
  const code = stripComments(readFileSync(DWELL_TS, 'utf8'));
  assert.doesNotMatch(code, /\bnotable\b/, 'it must not re-classify from `notable`');
  assert.doesNotMatch(code, /\bderive(?!Dwell)[A-Z]/, 'nor call a mapping rule');
  assert.doesNotMatch(code, /slugify|toLowerCase/, 'nor mint an ID of its own');
  assert.doesNotMatch(code, /duration|weight|railDistance|\bmass\b|position/, 'nor read a value it does not own');
});

test('career.json carries no authored Dwell field', () => {
  // The AC: no Dwell value is hand-authored anywhere. A `dwell` key appearing in
  // the authored file would be rejected by `CareerSchema`'s `strictObject`
  // anyway — this asserts nobody has tried.
  const authored = readFileSync(fileURLToPath(new URL('../data/career.json', import.meta.url)), 'utf8');
  assert.doesNotMatch(authored, /"dwell"|"tempo"/i, 'no Dwell value may be authored by hand');
});

// --- Purity ------------------------------------------------------------------

test('dwell.ts reads no clock, no random, no environment, and no DOM', () => {
  const code = stripComments(readFileSync(DWELL_TS, 'utf8'));
  assert.doesNotMatch(code, /new\s+Date\b/, 'no clock read');
  assert.doesNotMatch(code, /Date\s*\.\s*now/, 'no clock read');
  assert.doesNotMatch(code, /Math\s*\.\s*random/, 'no randomness');
  assert.doesNotMatch(code, /process\s*\./, 'no environment read');
  assert.doesNotMatch(code, /node:fs|readFileSync|writeFileSync/, 'no I/O');
  assert.doesNotMatch(code, /from ['"](three|react|@react-three)/, 'no DOM, React, or Three import');
  assert.doesNotMatch(code, /\bdocument\b|\bwindow\b/, 'no DOM access');
});

test('the derivation does not mutate the graph it was handed', () => {
  // `buildDwell` sorts, and `Array.prototype.sort` is in place. Sorting the
  // graph's own array would re-order the entity tree for every later caller —
  // including `buildArtifact`, whose Client ordering is `timeAxis`.
  const graph = graphOf(shallow('Zeta', 'Z'), deep('Alpha', 'A'));
  const before = JSON.stringify(graph);
  buildDwell(graph);
  deriveDwell(clientOf(graph, 'Alpha'));
  assert.equal(JSON.stringify(graph), before, 'the graph must come back unchanged');
});

test('two calls on one graph agree exactly', () => {
  const graph = graphOf(deep('Alpha', 'One'), shallow('Beta', 'Two'));
  assert.deepEqual(buildDwell(graph), buildDwell(graph), 'the derivation must be a function of the graph');
});
