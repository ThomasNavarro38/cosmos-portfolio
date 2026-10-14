/**
 * Covers every Shot row of the story's I/O & edge-case matrix, and pins the
 * framing **by mutation**.
 *
 * A framing test that only checks a Shot came back proves the emitter emitted
 * something, which is nearly tautological. What matters is that a distance no
 * longer containing the widest orbit fails this suite — so that mutation is
 * applied to a list the assertions otherwise accept, and it must be rejected.
 * A Project framed out of shot is unreachable from the Rail, and that is the
 * failure this suite exists to catch rather than to describe.
 *
 * No DOM, no React, no Three is imported here.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema, type Career } from '../data/schema.ts';
import { clientIdOf, deriveEntities, projectIdOf, type EntityGraph } from './entities.ts';
import { SHOT_FRAMINGS, buildShots, type Shot } from './shots.ts';
import { stripComments } from '../../scripts/source-scan.ts';

const AS_OF = '2026-09';
const SHOTS_TS = fileURLToPath(new URL('./shots.ts', import.meta.url));

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

function entry(client: string, project: string, extra: Record<string, unknown> = {}) {
  return { ...baseEntry(), client, project, ...extra };
}

function careerOf(...entries: Record<string, unknown>[]): Career {
  return CareerSchema.parse({ asOf: AS_OF, projects: entries });
}

function graphOf(...entries: Record<string, unknown>[]): EntityGraph {
  return deriveEntities(careerOf(...entries), { asOf: AS_OF });
}

function shotsOf(...entries: Record<string, unknown>[]): readonly Shot[] {
  return buildShots(graphOf(...entries));
}

/**
 * The nominal graph the matrix names: 2 Clients, 3 Projects, with weights that
 * give the two systems genuinely different widest orbits.
 *
 * `railDistance` is `10 / weight`, so Alpha's widest orbit is 10 (weight 1) and
 * Beta's is 20 (weight 0.5). A framing that ignored the system would land on the
 * same distance for both, which the assertions below would then accept.
 */
function nominalEntries(): Record<string, unknown>[] {
  return [
    entry('Alpha', 'One', { weight: 1 }),
    entry('Alpha', 'Three', { weight: 4 }),
    entry('Beta', 'Two', { weight: 0.5 }),
  ];
}

/** The widest orbit in a Client's system, read off the graph. */
function widestOrbit(graph: EntityGraph, clientId: string): number {
  const client = graph.clients.find((candidate) => candidate.id === clientId);
  assert.ok(client !== undefined, `the fixture must derive a Client "${clientId}"`);
  return Math.max(...client.projects.map((project) => project.railDistance));
}

/**
 * The suite's real containment assertion, over a graph and the Shots claimed for
 * it — extracted so the mutation guard below runs **these exact assertions**
 * rather than a predicate that merely resembles them.
 *
 * A guard re-implementing containment inline would prove the inline copy rejects
 * a mutation, which is not the same claim as the suite rejecting it. Calling one
 * function from both places is what makes the guard real.
 *
 * Throws (via `assert`) on any divergence, which is what lets the guard catch it.
 */
function assertFramesEverySystem(graph: EntityGraph, shots: readonly Shot[]): void {
  const clientIds = graph.clients.map((client) => client.id);

  assert.deepEqual(
    [...shots.map((shot) => shot.subject)].sort(),
    [...clientIds].sort(),
    'the Shot set and the Client set must be the same set',
  );
  assert.equal(shots.length, clientIds.length, 'one Shot per Client, and nothing else');

  for (const shot of shots) {
    const widest = widestOrbit(graph, shot.subject);
    assert.ok(
      shot.distance > widest,
      `"${shot.subject}" orbits out to ${widest} but is framed at ${shot.distance} — ` +
        'a Project framed out of shot is unreachable from the Rail',
    );
  }
}

// --- Matrix row: one Shot per Client, none for a Project --------------------

test('a 2-Client, 3-Project graph emits exactly 2 Shots', () => {
  const graph = graphOf(...nominalEntries());
  assert.equal(graph.clients.length, 2, 'the fixture must derive two Clients');
  assert.equal(
    graph.clients.flatMap((c) => c.projects).length,
    3,
    'and three Projects, or the count below proves nothing',
  );
  assert.equal(buildShots(graph).length, 2, 'one per Client — the Rail stops at Clients (AD-4a)');
});

test('every Client is framed exactly once, and no Project is framed at all', () => {
  // The first acceptance criterion, stated directly: set equality both ways. A
  // subset assertion would accept a list omitting a Client; a superset one would
  // accept a list inventing one.
  const graph = graphOf(...nominalEntries());
  assertFramesEverySystem(graph, buildShots(graph));

  const projectIds = graph.clients.flatMap((client) => client.projects.map((p) => p.id));
  for (const id of projectIds) {
    assert.equal(
      buildShots(graph).some((shot) => shot.subject === id),
      false,
      `"${id}" is a Project and must have no Shot of its own`,
    );
  }
});

test('every subject names an ID entities.ts minted, never a re-slugified one', () => {
  const shots = shotsOf(...nominalEntries());
  assert.deepEqual(
    [...shots.map((shot) => shot.subject)].sort(),
    [clientIdOf('Alpha'), clientIdOf('Beta')].sort(),
    'the IDs must be the minted ones exactly',
  );
  assert.equal(
    shots.some((shot) => shot.subject === projectIdOf('Alpha', 'One')),
    false,
    'and never a Project ID',
  );
});

// --- Matrix row: widest orbit framed ----------------------------------------

test("a Shot's distance contains its Client's widest orbit", () => {
  // The acceptance criterion: given a Client whose widest Project orbits at R,
  // its Shot distance contains R. Asserted per Client, against the graph's own
  // `railDistance` — never against a constant, which would go stale the first
  // time a weight changed.
  const graph = graphOf(...nominalEntries());
  assertFramesEverySystem(graph, buildShots(graph));
});

test('a Client whose widest Project has weight 0.05 is framed beyond 200', () => {
  // The matrix row, with the number it names. `railDistance` is `10 / weight`,
  // so a weight of 0.05 opens a 200-unit orbit — the case a constant distance
  // would silently frame out of shot.
  const graph = graphOf(
    entry('Wide', 'Far', { weight: 0.05 }),
    entry('Wide', 'Near', { weight: 4 }),
  );
  assert.equal(widestOrbit(graph, clientIdOf('Wide')), 200, 'the fixture must open a 200-unit orbit');

  const shot = buildShots(graph).find((candidate) => candidate.subject === clientIdOf('Wide'));
  assert.ok(shot !== undefined);
  assert.ok(shot.distance > 200, `the Shot must exceed 200, got ${shot.distance}`);
});

test('a wider system is framed from further out than a narrower one', () => {
  // Monotonic in the widest orbit, not merely containing it. A distance that
  // contained every orbit by being enormous everywhere would satisfy containment
  // and frame a tight system from uselessly far away.
  const graph = graphOf(entry('Narrow', 'N', { weight: 4 }), entry('Wide', 'W', { weight: 0.5 }));
  const shots = buildShots(graph);
  const narrow = shots.find((s) => s.subject === clientIdOf('Narrow'));
  const wide = shots.find((s) => s.subject === clientIdOf('Wide'));
  assert.ok(narrow !== undefined && wide !== undefined);

  assert.ok(
    widestOrbit(graph, clientIdOf('Wide')) > widestOrbit(graph, clientIdOf('Narrow')),
    'the fixture must give the two systems different widths',
  );
  assert.ok(
    wide.distance > narrow.distance,
    `the wider system must be framed from further out: ${wide.distance} vs ${narrow.distance}`,
  );
});

test('distance derives from the widest orbit, not from the number of Projects', () => {
  // A count-derived distance would frame a crowded-but-tight system from further
  // out than a sparse-but-wide one, and the wide one's outermost Project would
  // fall out of shot.
  const graph = graphOf(
    entry('Crowded', 'A', { weight: 4 }),
    entry('Crowded', 'B', { weight: 4 }),
    entry('Crowded', 'C', { weight: 4 }),
    entry('Sparse', 'D', { weight: 0.5 }),
  );
  const shots = buildShots(graph);
  const crowded = shots.find((s) => s.subject === clientIdOf('Crowded'));
  const sparse = shots.find((s) => s.subject === clientIdOf('Sparse'));
  assert.ok(crowded !== undefined && sparse !== undefined);

  assert.ok(
    sparse.distance > crowded.distance,
    'the one wide orbit must decide, not the three tight ones',
  );
});

// --- Matrix row: single Shallow Project -------------------------------------

test('a 1-Client, 1-Shallow-Project graph gets one Shot that still contains its orbit', () => {
  // `career.json`'s shape today, and the Shallow case: framing has nothing to do
  // with `isDeep`, so a Shallow-only system is framed exactly as a Deep one is.
  const graph = graphOf(entry('Solo', 'Only', { notable: '' }));
  const shots = buildShots(graph);
  assert.equal(shots.length, 1);
  assertFramesEverySystem(graph, shots);
});

test('a heavily weighted system is not framed from inside its own Star', () => {
  // `railDistance` is `10 / weight`, so a large weight gives a tiny orbit and a
  // purely proportional distance would put the camera on top of the Star. The
  // floor only ever raises the distance, so containment still holds.
  const graph = graphOf(entry('Tight', 'T', { weight: 20 }));
  const shot = buildShots(graph)[0];
  assert.ok(shot !== undefined);
  assert.ok(shot.distance > widestOrbit(graph, clientIdOf('Tight')), 'containment still holds');
  assert.ok(shot.distance > 1, 'and the camera is not inside the Star');
  // Pinned because `> 1` held for any floor above 1, so the
  // floor's value was pinned nowhere. A weight of 20 gives a 0.5 orbit and a 0.75
  // proportional distance, so the floor alone decides.
  assert.equal(shot.distance, 5, 'the floor decides: 5, the declared minimum framing distance');
});

// --- Matrix row: a Project added later --------------------------------------

test('adding a Project to an existing Client reframes that Client and no other', () => {
  // The acceptance criterion, and NFR-5's promise: the new entry sets only
  // `weight`, no Shot is authored for it, and no existing Shot is edited.
  const before = nominalEntries();
  const after = [...before, entry('Alpha', 'Added later', { weight: 0.1 })];

  const shotsBefore = new Map(shotsOf(...before).map((shot) => [shot.subject, shot]));
  const shotsAfter = new Map(shotsOf(...after).map((shot) => [shot.subject, shot]));

  assert.deepEqual(
    [...shotsAfter.keys()].sort(),
    [...shotsBefore.keys()].sort(),
    'no Shot is added: the new Project is framed at its Client’s stop',
  );

  const alpha = clientIdOf('Alpha');
  const beta = clientIdOf('Beta');

  const alphaBefore = shotsBefore.get(alpha);
  const alphaAfter = shotsAfter.get(alpha);
  assert.ok(alphaBefore !== undefined && alphaAfter !== undefined);
  assert.notDeepEqual(alphaBefore, alphaAfter, "the owning Client's Shot must reframe automatically");
  assert.ok(
    alphaAfter.distance > alphaBefore.distance,
    'and it must widen to contain the new, wider orbit',
  );
  assert.ok(alphaAfter.distance > 100, 'which a weight of 0.1 puts at a 100-unit orbit');

  assert.deepEqual(
    shotsAfter.get(beta),
    shotsBefore.get(beta),
    'and every other Shot must be untouched, byte for byte',
  );
});

test('the added Project needs no field but weight', () => {
  // NFR-5: one entry plus one number. The fixture above sets `weight` and
  // nothing framing-related; this asserts the entry is otherwise the base record
  // and that the pipeline still frames it.
  const added = entry('Alpha', 'Weight only', { weight: 0.1 });
  assert.equal(
    Object.keys(added).some((key) => /shot|dwell|camera|angle|distance|framing|position/i.test(key)),
    false,
    'the authored entry must carry no framing field',
  );
  const graph = graphOf(...nominalEntries(), added);
  assertFramesEverySystem(graph, buildShots(graph));
});

// --- Matrix row: re-ordered source ------------------------------------------

test('re-ordering career.json emits a byte-identical Shot list', () => {
  // AD-5. The list is ordered by content-derived ID, so authored order reaches
  // neither an ID nor a position in the list.
  const entries = nominalEntries();
  const forward = JSON.stringify(shotsOf(...entries));
  const reversed = JSON.stringify(shotsOf(...[...entries].reverse()));
  assert.equal(reversed, forward, 'authored order must not reach the Shot list');
});

test('the re-order fixture genuinely re-orders, or the assertion above is vacuous', () => {
  const entries = nominalEntries();
  const walk = (graph: EntityGraph): string[] =>
    graph.clients.flatMap((client) => [client.id, ...client.projects.map((p) => p.id)]);
  assert.notDeepEqual(
    walk(graphOf(...entries)),
    walk(graphOf(...[...entries].reverse())),
    'the graph must traverse differently under a re-order',
  );
});

test('the list is ordered by ID, not by the graph and not by timeAxis', () => {
  const emitted = shotsOf(
    entry('Zeta', 'Z'),
    entry('Alpha', 'A'),
    entry('Mu', 'M'),
  ).map((shot) => shot.subject);
  assert.deepEqual(emitted, [...emitted].sort(), 'Clients are framed in ID order');
});

// --- No world coordinate anywhere -------------------------------------------

test('a Shot carries a subject, angle, distance and framing, and no coordinate', () => {
  // The acceptance criterion, and FR-17's hard rule. `strictObject` enforces it
  // at the schema; this asserts the emitter never produces one, so re-settling
  // the simulation leaves every Shot framing its intended subject.
  for (const shot of shotsOf(...nominalEntries())) {
    assert.deepEqual(
      Object.keys(shot).sort(),
      ['angle', 'distance', 'framing', 'subject'],
      'exactly four fields',
    );
    for (const forbidden of ['x', 'y', 'z', 'position', 'target', 'lookAt', 'up']) {
      assert.equal(
        forbidden in shot,
        false,
        `"${forbidden}" is a world coordinate and must never appear in a Shot`,
      );
    }
  }
});

test('the module reads no solved position and re-derives no radius from one', () => {
  // Read off the source, because a coordinate on a branch these fixtures do not
  // reach would leave every assertion above green. `railDistance` *is* the
  // orbital radius; recovering it from a solved position would be the same
  // number computed a second, lossier way.
  const code = stripComments(readFileSync(SHOTS_TS, 'utf8'));
  assert.doesNotMatch(code, /\bposition\b|SolvedLayout|\.x\b|\.y\b|\.z\b/, 'no solved position is read');
  assert.doesNotMatch(code, /Math\s*\.\s*hypot|Math\s*\.\s*sqrt|Math\s*\.\s*atan/, 'no radius recovered from a coordinate');
  assert.doesNotMatch(code, /from ['"]\.\/solve\.ts['"]/, 'the assembler must not depend on solver internals');
});

test('the module mints no ID and calls no mapping rule', () => {
  const code = stripComments(readFileSync(SHOTS_TS, 'utf8'));
  assert.doesNotMatch(code, /\bderive[A-Z]/, 'the framing must not call a mapping rule');
  assert.doesNotMatch(code, /slugify|toLowerCase/, 'nor mint an ID of its own');
  assert.doesNotMatch(code, /isDeep|luminanceBand|moteTier|\bmass\b|timeAxis/, 'nor copy a derived property it does not frame from');
});

test('the framing rules are a closed set', () => {
  // A free string would let a consumer invent a framing the derive layer never
  // sanctioned — the same reason `LuminanceBand` is closed.
  assert.ok(SHOT_FRAMINGS.length >= 1);
  assert.equal(new Set(SHOT_FRAMINGS).size, SHOT_FRAMINGS.length, 'no framing is listed twice');
  for (const shot of shotsOf(...nominalEntries())) {
    assert.ok(
      (SHOT_FRAMINGS as readonly string[]).includes(shot.framing),
      `"${shot.framing}" must be a declared framing`,
    );
  }
  assert.match(readFileSync(SHOTS_TS, 'utf8'), /SHOT_FRAMINGS = \[[\s\S]*?\] as const/, 'closed with `as const`');
});

test('angle and distance are finite, and distance is positive', () => {
  // A non-finite value serializes to `null` and reaches a consumer as
  // plausible-but-absent data rather than as a failure.
  for (const shot of shotsOf(...nominalEntries(), entry('Wide', 'W', { weight: 0.05 }))) {
    assert.ok(Number.isFinite(shot.angle), `"${shot.subject}".angle must be finite`);
    assert.ok(Number.isFinite(shot.distance), `"${shot.subject}".distance must be finite`);
    assert.ok(shot.distance > 0, `"${shot.subject}".distance must be positive`);
  }
});

// --- The mutation guard: the framing itself ---------------------------------

test('a Shot distance that no longer contains the widest orbit fails the suite’s own assertions', () => {
  // The task names this explicitly, and the guard runs the **real** assertion
  // function the tests above use — not an inline predicate resembling it. A
  // re-implemented check would prove the copy rejects these mutations while the
  // suite quietly accepted them.
  const graph = graphOf(...nominalEntries());
  const full = buildShots(graph);
  const widest = Math.max(...graph.clients.flatMap((c) => c.projects.map((p) => p.railDistance)));

  const mutations: [string, readonly Shot[]][] = [
    ['a distance equal to the widest orbit', full.map((s) => ({ ...s, distance: widestOrbit(graph, s.subject) }))],
    ['a distance inside the widest orbit', full.map((s) => ({ ...s, distance: widestOrbit(graph, s.subject) / 2 }))],
    ['a constant distance that fits only the tightest system', full.map((s) => ({ ...s, distance: 1 }))],
    ['a dropped Client', full.slice(1)],
    ['a duplicated Shot', [...full, full[0]!]],
    ['an invented subject', [...full, { ...full[0]!, subject: 'client:nobody' }]],
    ['an empty list', []],
  ];

  for (const [label, mutated] of mutations) {
    assert.throws(
      () => assertFramesEverySystem(graph, mutated),
      (error: unknown) => error instanceof assert.AssertionError,
      `${label} must fail the suite's own assertions — one that accepts it pins nothing`,
    );
  }

  // And the unmutated list still passes them, so the guard is not merely
  // asserting the function throws on everything.
  assertFramesEverySystem(graph, full);
  assert.ok(widest > 0, 'the fixture must open at least one orbit');
});

test('the constant-distance mutation is only caught because the systems differ', () => {
  // Pins the mutation above. If every Client in the fixture had the same widest
  // orbit, a constant distance would satisfy containment and the guard would be
  // vacuous.
  const graph = graphOf(...nominalEntries());
  const widths = new Set(graph.clients.map((client) => widestOrbit(graph, client.id)));
  assert.ok(widths.size > 1, 'the fixture must give the two systems different widest orbits');
});

// --- Purity ------------------------------------------------------------------

test('shots.ts reads no clock, no random, no environment, and no DOM', () => {
  const code = stripComments(readFileSync(SHOTS_TS, 'utf8'));
  assert.doesNotMatch(code, /new\s+Date\b/, 'no clock read');
  assert.doesNotMatch(code, /Date\s*\.\s*now/, 'no clock read');
  assert.doesNotMatch(code, /Math\s*\.\s*random/, 'no randomness');
  assert.doesNotMatch(code, /process\s*\./, 'no environment read');
  assert.doesNotMatch(code, /node:fs|readFileSync|writeFileSync/, 'no I/O');
  assert.doesNotMatch(code, /from ['"](three|react|@react-three)/, 'no DOM, React, or Three import');
  assert.doesNotMatch(code, /\bdocument\b|\bwindow\b/, 'no DOM access');
});

test('the framing does not mutate the graph it was handed', () => {
  const graph = graphOf(entry('Zeta', 'Z'), entry('Alpha', 'A'));
  const before = JSON.stringify(graph);
  buildShots(graph);
  assert.equal(JSON.stringify(graph), before, 'the graph must come back unchanged');
});

test('two calls on one graph agree exactly', () => {
  const graph = graphOf(...nominalEntries());
  assert.deepEqual(buildShots(graph), buildShots(graph), 'the framing must be a function of the graph');
});

// --- The override is a shape, not a mechanism -------------------------------

test('the list is keyed by entity ID, so an override displaces exactly one default', () => {
  // No Shot is authored today and this story authors none. What it guarantees is
  // that adding one later displaces exactly one default: the merge point is a
  // lookup on `subject`, so nothing in the pipeline keys a Shot by array
  // position.
  const graph = graphOf(...nominalEntries());
  const defaults = buildShots(graph);

  const subjects = defaults.map((shot) => shot.subject);
  assert.equal(new Set(subjects).size, subjects.length, 'a key that repeated could not identify a default');

  // The merge a later story performs, written out here so the shape is pinned
  // rather than promised: a lookup on `subject`, never an index.
  const authored: Shot = { subject: clientIdOf('Alpha'), angle: 1, distance: 999, framing: 'frame-system' };
  const byId = new Map(defaults.map((shot) => [shot.subject, shot]));
  byId.set(authored.subject, authored);
  const merged = [...byId.values()];

  assert.equal(merged.length, defaults.length, 'an override adds no entry');
  assert.deepEqual(
    merged.find((shot) => shot.subject === authored.subject),
    authored,
    'and it replaces the default for its own subject',
  );
  for (const subject of subjects) {
    if (subject === authored.subject) continue;
    assert.deepEqual(
      merged.find((shot) => shot.subject === subject),
      defaults.find((shot) => shot.subject === subject),
      `"${subject}" must be untouched by an override of another entity`,
    );
  }
});

test('career.json carries no authored Shot', () => {
  // The AC's premise: no Shot is authored today, and this story authors none.
  const authored = readFileSync(fileURLToPath(new URL('../data/career.json', import.meta.url)), 'utf8');
  assert.doesNotMatch(authored, /"shots?"|"framing"|"angle"/i, 'no Shot may be authored by hand');
});
