/**
 * Covers every row of the story's I/O & edge-case matrix, plus the mutation
 * guards that pin the three determinism guarantees a solve-twice test cannot
 * itself prove.
 *
 * Run with `npm test`. Fixtures are built through `CareerSchema.parse` and
 * `deriveEntities`, so the solve is exercised against exactly the graph the
 * pipeline actually produces — including `weight`'s resolved default.
 *
 * **On the mutation guards.** A determinism test that passes on the default
 * generator proves only that the default is seeded. So the three guarantees the
 * solve makes structurally — the immediate `.stop()`, the pre-solve sort, and
 * the fixed tick count — are pinned by mutating the module's *source*, loading
 * the mutation, and asserting the output actually moves. Each mutation is first
 * asserted to have changed the text, so a rename that silences the mutation
 * fails the suite instead of passing it vacuously.
 *
 * Determinism here is **same-environment** (AD-17): identical input, same Node
 * build, byte-identical output. Nothing below claims a cross-platform guarantee,
 * and no assertion pins an absolute coordinate.
 *
 * No DOM, no React, no Three is imported here.
 */

import { strict as assert } from 'node:assert';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CareerSchema } from '../data/schema.ts';
import { deriveEntities, type EntityGraph } from './entities.ts';
import { buildRail } from './rail.ts';
import { solveLayout, type Position, type SolvedLayout } from './solve.ts';

const SOLVE_TS = fileURLToPath(new URL('./solve.ts', import.meta.url));
const RAIL_TS = fileURLToPath(new URL('./rail.ts', import.meta.url));
const CAREER_JSON = fileURLToPath(new URL('../data/career.json', import.meta.url));

const AS_OF = '2026-09';

// --- Fixtures ---------------------------------------------------------------

/**
 * A seeded generator, fresh on every call.
 *
 * The same LCG `d3-force-3d` uses internally, written out here so a test can
 * hold two independent generators at once — which is the whole point of the
 * fresh-generator row of the matrix.
 */
function seededRandom(seed = 1): () => number {
  let state = seed;
  return () => (state = (1664525 * state + 1013904223) % 4294967296) / 4294967296;
}

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

/** Parses fixtures through the real schema, then derives the graph. */
function graphOf(...entries: Record<string, unknown>[]): EntityGraph {
  return deriveEntities(CareerSchema.parse({ asOf: AS_OF, projects: entries }), { asOf: AS_OF });
}

/** A graph with several Clients, several Projects, and a spread of weights. */
function multiClientEntries(): Record<string, unknown>[] {
  return [
    { ...baseEntry(), client: 'SNCF', project: 'MDM replacement', weight: 1 },
    {
      ...baseEntry(),
      client: 'SNCF',
      project: 'Referential API',
      weight: 2,
      duration: { start: '2020-01', end: '2021-06' },
    },
    {
      ...baseEntry(),
      client: 'SNCF',
      project: 'Batch reconciliation',
      weight: 0.5,
      duration: { start: '2020-03', end: '2021-01' },
    },
    {
      ...baseEntry(),
      client: 'Orange',
      project: 'Billing migration',
      duration: { start: '2022-01', end: null },
    },
    {
      ...baseEntry(),
      client: 'Acme',
      project: 'Alpha',
      weight: 3,
      duration: { start: '2015-01', end: '2016-01' },
    },
  ];
}

function solve(graph: EntityGraph, seed = 1): SolvedLayout {
  return solveLayout(graph, { randomSource: seededRandom(seed) });
}

/** Straight-line distance between two solved positions. */
function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** The position of an entity, asserted present. */
function positionOf(layout: SolvedLayout, id: string): Position {
  const position = layout.positions[id];
  assert.ok(position !== undefined, `no solved position for "${id}"`);
  return position;
}

// --- Matrix row: determinism ------------------------------------------------

test('one graph solved twice in one process gives identical positions', () => {
  const graph = graphOf(...multiClientEntries());
  const first = solve(graph);
  const second = solve(graph);

  assert.deepEqual(second, first, 'two solves of one graph must agree exactly');
  assert.equal(
    JSON.stringify(second),
    JSON.stringify(first),
    'and agree byte-for-byte once serialized, key order included',
  );
});

test('the solve does not mutate the graph it is handed', () => {
  // A solve that wrote positions back onto the entities would make the second
  // run a different problem from the first, and the determinism test above
  // would still pass while the guarantee it claims had quietly moved.
  const graph = graphOf(...multiClientEntries());
  const before = JSON.stringify(graph);
  solve(graph);
  assert.equal(JSON.stringify(graph), before, 'the input graph must be untouched');
});

// --- Matrix row: injected source honoured -----------------------------------

test('the injected source is what the simulation draws from', () => {
  // Coincident nodes are the only case `d3-force-3d` draws randomness in
  // (`jiggle.js:2`), so two Clients starting in the same month with identical
  // systems is the fixture that actually exercises the source.
  const entries = [
    { ...baseEntry(), client: 'A', project: 'Alpha', duration: { start: '2020-01', end: '2021-01' } },
    { ...baseEntry(), client: 'B', project: 'Beta', duration: { start: '2020-01', end: '2021-01' } },
  ];
  const graph = graphOf(...entries);

  // Whether two seeds *diverge* is not the contract — the matrix says positions
  // "may differ". What is the contract is that each seed is reproducible.
  assert.deepEqual(solve(graph, 7), solve(graph, 7), 'seed 7 reproduces itself');
  assert.deepEqual(solve(graph, 99), solve(graph, 99), 'seed 99 reproduces itself');
});

test('no solve reads Math.random', () => {
  // Every force that draws randomness falls back to `Math.random` where it
  // initializes without a source (`manyBody.js:117`, `collide.js:114`,
  // `link.js:98`). Attached to a simulation the fallback is unreachable —
  // `initializeForce` always forwards one (`simulation.js:110`) — but a force
  // constructed and initialized outside a simulation would hit it silently, and
  // this is the assertion that would catch that.
  const original = Math.random;
  let reads = 0;
  Math.random = () => {
    reads += 1;
    return original();
  };
  try {
    solve(graphOf(...multiClientEntries()));
    // Coincident nodes too, since that is where randomness is actually drawn.
    solve(
      graphOf(
        { ...baseEntry(), client: 'A', project: 'Alpha', duration: { start: '2020-01', end: '2021-01' } },
        { ...baseEntry(), client: 'B', project: 'Beta', duration: { start: '2020-01', end: '2021-01' } },
      ),
    );
  } finally {
    Math.random = original;
  }
  assert.equal(reads, 0, 'the solve must draw every random number from the injected source');
});

test('the module names no clock and no Math.random', () => {
  // Read off the source, because a `new Date()` on a branch the fixtures do not
  // reach would leave every assertion above green.
  const source = readFileSync(SOLVE_TS, 'utf8');
  // Comments legitimately discuss both, so strip them before scanning.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /Math\s*\.\s*random/, 'no Math.random anywhere in the module');
  assert.doesNotMatch(code, /new\s+Date\b/, 'no clock read anywhere in the module');
  assert.doesNotMatch(code, /Date\s*\.\s*now/, 'no clock read anywhere in the module');
});

test('the module imports no DOM, React, or Three', () => {
  const source = readFileSync(SOLVE_TS, 'utf8');
  const specifiers = [...source.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1] ?? '');
  assert.ok(specifiers.length > 0, 'the scan must actually find the imports');
  for (const specifier of specifiers) {
    assert.doesNotMatch(specifier, /^(react|three|@react-three)/, `forbidden import: ${specifier}`);
  }
  assert.doesNotMatch(source, /\bdocument\b|\bwindow\b/, 'no DOM global may be referenced');
});

// --- Matrix row: fresh generator --------------------------------------------

test('two solves with the same seed agree whichever order they run in', () => {
  // Neither run's generator state may leak into the other. `d3-force-3d@3.0.6`
  // seeds its LCG per simulation (`lcg.js:2-9`), so this passes on the default
  // too — which is exactly why the injection has to be exercised as well.
  const graph = graphOf(...multiClientEntries());

  const forward = solve(graph, 5);
  solve(graph, 42);
  const afterOther = solve(graph, 5);
  assert.deepEqual(afterOther, forward, 'an intervening solve must not shift the next one');

  // And with one generator deliberately advanced before use, to prove the
  // simulation reads the source we hand it rather than one it holds itself.
  const advanced = seededRandom(5);
  for (let i = 0; i < 1000; i += 1) advanced();
  const fromAdvanced = solveLayout(graph, { randomSource: advanced });
  assert.ok(
    Number.isFinite(positionOf(fromAdvanced, graph.clients[0]?.id ?? '').x),
    'an advanced generator still solves',
  );
});

// --- Matrix row: re-ordered input -------------------------------------------

test('re-ordering career.json changes no position', () => {
  // AD-5's guarantee carried into the solve. Nodes sort by stable entity ID
  // before the simulation is constructed, so `node.index` — which comes from
  // array order (`simulation.js:81`) and drives `manyBody`'s accumulation
  // (`manyBody.js:41-56`) — is content-derived, never authored.
  const entries = multiClientEntries();
  const forward = solve(graphOf(...entries));
  const reversed = solve(graphOf(...[...entries].reverse()));

  assert.deepEqual(reversed, forward, 'a re-ordered file must solve identically');
  assert.equal(
    JSON.stringify(reversed),
    JSON.stringify(forward),
    'including the key order of the emitted record',
  );
});

test('re-ordering a single Client’s Projects changes no position', () => {
  // The orbit slots come from an ID sort, not authored order, so re-ordering two
  // Projects under one Client must not rotate that Client's whole system.
  const entries = [
    { ...baseEntry(), client: 'SNCF', project: 'Alpha' },
    { ...baseEntry(), client: 'SNCF', project: 'Beta', weight: 2 },
    { ...baseEntry(), client: 'SNCF', project: 'Gamma', weight: 0.5 },
  ];
  assert.deepEqual(solve(graphOf(...[...entries].reverse())), solve(graphOf(...entries)));
});

test('two Clients starting in the same month keep a stable Rail order', () => {
  // The start-month sort alone is not total, so the tie is broken by ID. Without
  // that tiebreak the file's order would decide, and a re-order would move two
  // Clients past each other on the Rail.
  const entries = [
    { ...baseEntry(), client: 'Alpha', project: 'A', duration: { start: '2020-01', end: '2021-01' } },
    { ...baseEntry(), client: 'Beta', project: 'B', duration: { start: '2020-01', end: '2021-01' } },
  ];
  assert.deepEqual(solve(graphOf(...[...entries].reverse())), solve(graphOf(...entries)));
});

// --- Matrix row: single entry -----------------------------------------------

test('one Client with one Project solves and terminates', () => {
  // The committed `career.json` is exactly this shape today, so it is real
  // rather than hypothetical.
  const graph = graphOf(baseEntry());
  const layout = solve(graph);

  assert.equal(Object.keys(layout.positions).length, 2, 'one Star and one Planet');
  for (const [id, position] of Object.entries(layout.positions)) {
    for (const axis of ['x', 'y', 'z'] as const) {
      assert.ok(
        Number.isFinite(position[axis]),
        `"${id}" has a non-finite ${axis}: ${position[axis]}`,
      );
    }
  }
});

// --- Matrix row: empty graph ------------------------------------------------

test('an empty graph returns an empty position set without throwing', () => {
  const layout = solveLayout({ clients: [] }, { randomSource: seededRandom() });
  assert.deepEqual(layout.positions, {}, 'no Bodies, no positions');
});

// --- Matrix row: Client orbit ownership -------------------------------------

test('every Project sits nearer its own Client Star than any other', () => {
  const graph = graphOf(...multiClientEntries());
  const layout = solve(graph);
  const starIds = graph.clients.map((client) => client.id);
  assert.ok(starIds.length > 1, 'the assertion needs more than one Star to be meaningful');

  for (const client of graph.clients) {
    const own = positionOf(layout, client.id);
    for (const project of client.projects) {
      const here = positionOf(layout, project.id);
      const toOwn = distance(here, own);
      for (const otherId of starIds) {
        if (otherId === client.id) continue;
        assert.ok(
          distance(here, positionOf(layout, otherId)) > toOwn,
          `"${project.id}" is nearer "${otherId}" than its own "${client.id}"`,
        );
      }
    }
  }
});

test('ownership survives a weight small enough to open a very wide orbit', () => {
  // `railDistance` is `10 / weight`, so a small weight opens an orbit wider than
  // any fixed Rail spacing. If the spacing were a constant, this fixture would
  // put a Project nearer a neighbouring Star — which renders as a plausible
  // system with one Planet in the wrong place rather than as a visible break.
  const graph = graphOf(
    { ...baseEntry(), client: 'Wide', project: 'W', weight: 0.05, duration: { start: '2019-01', end: '2020-01' } },
    { ...baseEntry(), client: 'Tight', project: 'T', weight: 4, duration: { start: '2021-01', end: '2022-01' } },
  );

  // The solve asserts this itself, so a regression throws rather than returning
  // a wrong layout. Both are checked: that it does not throw, and that the
  // property genuinely holds in the values returned.
  const layout = solve(graph);
  for (const client of graph.clients) {
    const own = positionOf(layout, client.id);
    for (const project of client.projects) {
      const here = positionOf(layout, project.id);
      for (const other of graph.clients) {
        if (other.id === client.id) continue;
        assert.ok(
          distance(here, positionOf(layout, other.id)) > distance(here, own),
          `"${project.id}" must stay with "${client.id}"`,
        );
      }
    }
  }
});

test('a Project orbits at exactly the railDistance the rules derived', () => {
  // The decision recorded in the story: `weight`'s distance from the Rail is a
  // post-solve transform, not a force parameter, so the radius a weight asks for
  // is the radius the Body gets rather than an emergent approximation.
  const graph = graphOf(
    { ...baseEntry(), client: 'SNCF', project: 'Alpha', weight: 1 },
    { ...baseEntry(), client: 'SNCF', project: 'Beta', weight: 4 },
  );
  const client = graph.clients[0];
  assert.ok(client !== undefined);
  const layout = solve(graph);
  const star = positionOf(layout, client.id);

  for (const project of client.projects) {
    const radius = distance(positionOf(layout, project.id), star);
    assert.ok(
      Math.abs(radius - project.railDistance) < 1e-3,
      `"${project.id}" orbits at ${radius}, not its derived ${project.railDistance}`,
    );
  }
});

test('a heavier Project orbits closer in, through the solve', () => {
  const graph = graphOf(
    { ...baseEntry(), client: 'SNCF', project: 'Light', weight: 1 },
    { ...baseEntry(), client: 'SNCF', project: 'Heavy', weight: 4 },
  );
  const client = graph.clients[0];
  assert.ok(client !== undefined);
  const layout = solve(graph);
  const star = positionOf(layout, client.id);

  const light = client.projects.find((p) => p.project.project === 'Light');
  const heavy = client.projects.find((p) => p.project.project === 'Heavy');
  assert.ok(light !== undefined && heavy !== undefined);
  assert.ok(
    distance(positionOf(layout, heavy.id), star) < distance(positionOf(layout, light.id), star),
    'a greater weight must sit closer to the Rail after the solve too',
  );
});

test('two Projects of one Client never coincide', () => {
  // Collision avoidance inside a Client is the transform's job, not the
  // simulation's — the cost taken deliberately when `weight` was settled as a
  // post-solve radius. Two Projects at the same radius are the case that tests it.
  const graph = graphOf(
    { ...baseEntry(), client: 'SNCF', project: 'Alpha', weight: 2 },
    { ...baseEntry(), client: 'SNCF', project: 'Beta', weight: 2 },
    { ...baseEntry(), client: 'SNCF', project: 'Gamma', weight: 2 },
  );
  const layout = solve(graph);
  const client = graph.clients[0];
  assert.ok(client !== undefined);

  const placed = client.projects.map((project) => positionOf(layout, project.id));
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i];
      const b = placed[j];
      assert.ok(a !== undefined && b !== undefined);
      assert.ok(
        distance(a, b) > 0.1,
        `two Projects of one Client landed on top of each other: ${JSON.stringify(a)}`,
      );
    }
  }
});

// --- Matrix row: non-finite guard -------------------------------------------

test('a non-finite coordinate throws, naming the entity', () => {
  // A NaN serializes to `null` in the emitted artifact and reads downstream as
  // plausible-but-absent data. Forced here by handing the solve a graph whose
  // derived `railDistance` is NaN — the one input the transform multiplies by.
  const graph = graphOf(baseEntry());
  const client = graph.clients[0];
  const project = client?.projects[0];
  assert.ok(client !== undefined && project !== undefined);

  const poisoned: EntityGraph = {
    clients: [{ ...client, projects: [{ ...project, railDistance: Number.NaN }] }],
  };

  assert.throws(
    () => solve(poisoned),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /non-finite/, 'the failure must name the problem');
      assert.match(error.message, new RegExp(escapeRegExp(project.id)), 'and name the entity');
      return true;
    },
  );
});

test('an infinite coordinate throws too', () => {
  const graph = graphOf(baseEntry());
  const client = graph.clients[0];
  const project = client?.projects[0];
  assert.ok(client !== undefined && project !== undefined);

  assert.throws(
    () =>
      solve({
        clients: [{ ...client, projects: [{ ...project, railDistance: Number.POSITIVE_INFINITY }] }],
      }),
    /non-finite/,
  );
});

// --- The guards fire, not merely exist --------------------------------------

test('a Client owning no Projects throws, even as the only Client', () => {
  // The `startsAt` guard sits inside a sort comparator, and `Array.sort` never
  // calls a comparator on a one-element array — so the single-Client case, which
  // is the shape `career.json` has today, reached the solve unchecked.
  const graph = graphOf(baseEntry());
  const client = graph.clients[0];
  assert.ok(client !== undefined);

  assert.throws(
    () => solve({ clients: [{ ...client, projects: [] }] }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /owns no Projects/);
      assert.match(error.message, new RegExp(escapeRegExp(client.id)), 'and names the Client');
      return true;
    },
  );
});

test('the ownership guard throws rather than skipping a Body it cannot place', () => {
  // The guard used to `continue` past a missing position, which meant the one
  // Body most likely to be wrong was the one Body never checked.
  const source = readFileSync(SOLVE_TS, 'utf8');
  assert.doesNotMatch(
    source.slice(source.indexOf('function assertOrbitOwnership')),
    /if \(\w+ === undefined\) continue;/,
    'a missing position must fail the invariant, never silently skip it',
  );
});

test('ordering is by codepoint, never by locale', () => {
  // `localeCompare` collates against the runtime's ICU data and default locale:
  // 'Ä'.localeCompare('Z') is -1 under `en` and 1 under `sv`. Client names are
  // authored free text, so a locale difference would reorder the Rail and move
  // every coordinate — the one remaining path by which environment reaches the
  // layout.
  // Matches a call, not a mention — both modules document `localeCompare` in
  // prose to explain why it is not used.
  //
  // Both, because the Rail's comparator moved to `rail.ts` when Story 2.1
  // published the ordering: scanning `solve.ts` alone would leave this assertion
  // pinning only `inOrbitOrder` while the comparator that actually orders the
  // Rail — and therefore `node.index`, and therefore every coordinate — went
  // unwatched in the file it moved to.
  for (const path of [SOLVE_TS, RAIL_TS]) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(
      source.replace(/^\s*\*.*$/gm, ''),
      /\.localeCompare\(/,
      `sorting must not depend on the runtime locale or its ICU build (${path})`,
    );
  }
});

// --- Orbit geometry: the constants that shape a system ----------------------

test('a Client’s Projects are lifted out of a single flat plane', () => {
  // Pins ORBIT_PITCH. Zeroing it collapses every system into a flat ring seen
  // edge-on — what the constant exists to prevent — and the coincidence test
  // cannot see it, because an even angular spread keeps the bodies apart anyway.
  const graph = graphOf(
    { ...baseEntry(), client: 'Orbit', project: 'One' },
    { ...baseEntry(), client: 'Orbit', project: 'Two' },
    { ...baseEntry(), client: 'Orbit', project: 'Three' },
  );
  const { positions } = solve(graph);
  const client = graph.clients[0];
  assert.ok(client !== undefined);
  const star = positions[client.id];
  assert.ok(star !== undefined);

  const lifts = client.projects.map((project) => {
    const here = positions[project.id];
    assert.ok(here !== undefined);
    return Math.abs(here.y - star.y);
  });

  assert.ok(
    new Set(lifts.map((lift) => lift.toFixed(6))).size > 1,
    `every Project sits at the same height above its Star (${lifts.join(', ')}) — the system is a flat ring`,
  );
});

// --- Rounding ---------------------------------------------------------------

test('every coordinate is rounded to a fixed precision', () => {
  // Rounding before the positions leave the module is what absorbs last-bit
  // drift across Node patch versions. It does *not* make the guarantee
  // cross-platform (AD-17) — nothing here claims that.
  const layout = solve(graphOf(...multiClientEntries()));
  for (const [id, position] of Object.entries(layout.positions)) {
    for (const axis of ['x', 'y', 'z'] as const) {
      const value = position[axis];
      assert.equal(
        value,
        Number(value.toFixed(4)),
        `"${id}".${axis} carries more precision than the solve rounds to: ${value}`,
      );
      assert.ok(!Object.is(value, -0), `"${id}".${axis} is -0, which breaks a deepEqual against 0`);
    }
  }
});

// --- Structural: no coordinate is authored ----------------------------------

test('no literal coordinate appears in the authored data', () => {
  // The positions are solved, never written down. `weight` and `team_size` are
  // the only numbers `src/data/validate.test.ts` permits in the file; this
  // asserts the complementary half — that nothing there looks like a position.
  const raw = readFileSync(CAREER_JSON, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  const found: string[] = [];
  const walk = (value: unknown, path: string): void => {
    if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (value !== null && typeof value === 'object') {
      for (const [key, v] of Object.entries(value)) {
        if (/^(x|y|z|position|coord|coordinates)$/i.test(key)) found.push(`${path}.${key}`);
        walk(v, path === '' ? key : `${path}.${key}`);
      }
    }
  };
  walk(parsed, '');
  assert.deepEqual(found, [], `authored coordinates found: ${found.join(', ')}`);
});

// --- The committed data -----------------------------------------------------

test('the committed career.json solves without throwing', () => {
  // The real file, not a fixture. Counts are deliberately not pinned, so this
  // survives the file growing to the ~15-16 entries expected.
  const career = CareerSchema.parse(JSON.parse(readFileSync(CAREER_JSON, 'utf8')));
  const graph = deriveEntities(career, { asOf: AS_OF });
  const layout = solve(graph);

  const bodies = graph.clients.length + graph.clients.reduce((n, c) => n + c.projects.length, 0);
  assert.equal(
    Object.keys(layout.positions).length,
    bodies,
    'every Client and every Project gets exactly one position',
  );
  assert.deepEqual(solve(graph), layout, 'and the committed data solves reproducibly');
});

// --- Mutation guards --------------------------------------------------------

/**
 * Loads a copy of `solve.ts` with one textual mutation applied.
 *
 * The copy lives beside the original so its relative `./entities.ts` and
 * `../data/schema.ts` imports still resolve, and a cache-busting query keeps
 * repeated loads independent. Returns `undefined` where the mutation would not
 * apply, so the caller can fail with a message about the *mutation* rather than
 * about an import error.
 */
const MUTANTS: string[] = [];
let mutantCount = 0;

function loadMutant(
  find: string | RegExp,
  replace: string,
): Promise<{ solveLayout: typeof solveLayout }> {
  const source = readFileSync(SOLVE_TS, 'utf8');
  const mutated = source.replace(find, replace);
  assert.notEqual(
    mutated,
    source,
    `the mutation ${String(find)} matched nothing — the guard is no longer pinning anything`,
  );

  mutantCount += 1;
  const path = join(fileURLToPath(new URL('.', import.meta.url)), `.mutant-${mutantCount}.ts`);
  writeFileSync(path, mutated);
  MUTANTS.push(path);
  return import(pathToFileURL(path).href) as Promise<{ solveLayout: typeof solveLayout }>;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('changing the tick count changes the solved positions', async () => {
  // Pins the fixed count as load-bearing rather than incidental. If the ticks
  // did not reach the output, the whole simulation tier would be decorative and
  // the determinism test would still pass.
  const graph = graphOf(...multiClientEntries());
  const baseline = solve(graph);

  const mutant = await loadMutant(/const TICK_COUNT = \d+;/, 'const TICK_COUNT = 17;');
  const mutated = mutant.solveLayout(graph, { randomSource: seededRandom() });

  assert.notDeepEqual(
    mutated,
    baseline,
    'a different tick count must produce a different layout, or the ticks do nothing',
  );
});

test('the tick count is a literal, never an energy threshold', async () => {
  // The count must not become `while (simulation.alpha() > x)`. Read off the
  // source, since a settling loop can produce the same positions on one fixture.
  const source = readFileSync(SOLVE_TS, 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  assert.match(code, /const TICK_COUNT = \d+;/, 'the tick count must be a literal constant');
  assert.match(code, /\.tick\(TICK_COUNT\)/, 'and it must be what drives the simulation');
  assert.doesNotMatch(code, /\.restart\s*\(/, '.restart() must never be called');
  assert.doesNotMatch(code, /alphaMin|alphaTarget|alphaDecay/, 'no energy threshold may be set');
  assert.doesNotMatch(code, /while\s*\(|\.on\s*\(\s*'(tick|end)'/, 'no settling loop, no tick handler');

  // And a settling form genuinely produces a different answer here, so the
  // assertions above are pinning a real difference rather than a style choice.
  const mutant = await loadMutant(/const TICK_COUNT = \d+;/, 'const TICK_COUNT = 1;');
  assert.notDeepEqual(
    mutant.solveLayout(graphOf(...multiClientEntries()), { randomSource: seededRandom() }),
    solve(graphOf(...multiClientEntries())),
  );
});

test('dropping the pre-solve sort makes the layout depend on authored order', async () => {
  // The sort is what keeps `node.index` — and therefore `manyBody`'s
  // accumulation order — content-derived. Without it, a re-ordered
  // `career.json` produces different positions, which is exactly the churn the
  // story exists to prevent. The unmutated module must survive the same test.
  const entries = multiClientEntries();
  assert.deepEqual(
    solve(graphOf(...[...entries].reverse())),
    solve(graphOf(...entries)),
    'the real module is order-independent',
  );

  // Neutralize the Rail sort by shadowing the imported `inRailOrder` with an
  // identity pass-through, which leaves the Clients in the order
  // `deriveEntities` handed them over — that is, first-appearance order,
  // straight out of the authored file.
  //
  // The comparator itself moved to `rail.ts` when Story 2.1 published the
  // ordering, so this guard mutates the **seam** rather than the rule: the copy
  // this loader writes sits beside the original and imports the real `rail.ts`,
  // so rewriting that module in place is not an option, and mutating the point
  // of use is what pins that `solveLayout` actually sorts. `rail.test.ts` pins
  // the rule; this pins the wiring. The intra-system `inOrbitOrder` is left
  // alone — it orders a Client's own Projects, not the Rail, and neutralizing it
  // here would confuse two claims.
  const mutant = await loadMutant(
    /import \{ compareCodepoints, inRailOrder \} from '\.\/rail\.ts';/,
    "import { compareCodepoints } from './rail.ts';\n" +
      'import type { ClientEntity as _Unsorted } from \'./entities.ts\';\n' +
      'const inRailOrder = (clients: readonly _Unsorted[]): _Unsorted[] => [...clients];',
  );

  const forward = mutant.solveLayout(graphOf(...entries), { randomSource: seededRandom() });
  const reversed = mutant.solveLayout(graphOf(...[...entries].reverse()), {
    randomSource: seededRandom(),
  });
  assert.notDeepEqual(
    reversed,
    forward,
    'without the sort the authored order must reach the layout — otherwise the sort pins nothing',
  );
});

test('the Rail the artifact emits is the order the solve lays Client Stars out in', () => {
  // Story 2.1's safety claim — "publishing `rail` changes no geometry, it only
  // makes an existing commitment readable" — asserted against the solved
  // coordinates, which is the only place that commitment is observable.
  //
  // It lives here rather than in `rail.test.ts` because this is where the solve
  // runs: comparing `buildRail(graph)` against `inRailOrder(graph.clients)` is
  // comparing `buildRail`'s own definition against itself, which no implementation
  // can fail. The claim needs the x axis on the other side of the equals sign.
  //
  // If the two ever diverge the artifact publishes a sequence the scene does not
  // have: a reader tabbing the index walks one order while the camera travels
  // another, and nothing else in the suite would say so.
  // The fixture must be one where the Rail's key and the `timeAxis` key disagree,
  // or the assertion is vacuous: on `multiClientEntries()` the two happen to
  // coincide, so a Star tier re-sorted by recency still ascends in Rail order and
  // the divergence goes unobserved. `Zulu` starts first and ends last, `Alpha`
  // starts second and ends first — so the Rail reads Zulu → Alpha while recency
  // reads Alpha → Zulu.
  const graph = graphOf(
    { ...baseEntry(), client: 'Alpha', project: 'A', duration: { start: '2012-01', end: '2013-01' } },
    { ...baseEntry(), client: 'Zulu', project: 'Z', duration: { start: '2010-01', end: '2025-01' } },
  );
  const rail = buildRail(graph);
  const byRecency = [...graph.clients].sort((a, b) => a.timeAxis - b.timeAxis).map((c) => c.id);
  assert.notDeepEqual([...rail], byRecency, 'the fixture must separate Rail order from recency order');

  const layout = solve(graph);
  const byX = [...rail].sort((a, b) => positionOf(layout, a).x - positionOf(layout, b).x);
  assert.deepEqual([...rail], byX, 'Client Stars must ascend in x along the emitted Rail');
});

test('the immediate .stop() is present and precedes every force', () => {
  // `timer(step)` starts eagerly at construction (`simulation.js:34`), so an
  // unstopped simulation can tick on the event loop and mutate nodes between our
  // own ticks. This is the real non-determinism risk in a build script, and it
  // is not observable from a single synchronous solve — so it is pinned
  // structurally, by asserting the ordering the module must keep.
  const source = readFileSync(SOLVE_TS, 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const constructed = code.indexOf('forceSimulation<StarNode>');
  const stopped = code.indexOf('simulation.stop()');
  const sourced = code.indexOf('simulation.randomSource(');
  const firstForce = code.indexOf('simulation.force(');
  const ticked = code.indexOf('.tick(TICK_COUNT)');

  assert.ok(constructed >= 0, 'the simulation must be constructed');
  assert.ok(stopped > constructed, 'and stopped after construction');
  assert.ok(sourced > stopped, 'the random source is injected after the stop');
  assert.ok(
    firstForce > sourced,
    'every force must be registered after the source, or it falls back to Math.random',
  );
  assert.ok(ticked > firstForce, 'and the ticks run last');
});

test('an unstopped simulation really does drift, so the .stop() earns its place', async () => {
  // Proves the structural guard above is worth its assertions rather than being
  // cargo-culted. With both `.stop()` calls removed, the eager `timer(step)`
  // (`simulation.js:34`) stays live after the solve returns; yielding to the
  // event loop lets it fire and move the nodes. Our solve returns *copies*, so
  // the drift is invisible in the returned layout — which is exactly why it has
  // to be caught here, on the nodes themselves, rather than in a solve-twice
  // assertion that would stay green while the build churned.
  const graph = graphOf(...multiClientEntries());

  // Remove *every* `.stop()` and leak the live node array, so the drift is
  // observable. Both stops have to go: the trailing one would otherwise halt
  // the timer even with the immediate one removed.
  const mutant = await loadMutant(
    /simulation\.stop\(\);/g,
    '(globalThis as Record<string, unknown>)["__solveNodes"] = nodes;',
  );

  mutant.solveLayout(graph, { randomSource: seededRandom() });
  const leaked = (globalThis as Record<string, unknown>)['__solveNodes'] as { x?: number }[];
  assert.ok(Array.isArray(leaked) && leaked.length > 1, 'the mutant exposed its live nodes');
  const before = leaked.map((node) => node.x);

  await new Promise((resolve) => setTimeout(resolve, 50));
  const settled = leaked.map((node) => node.x);
  delete (globalThis as Record<string, unknown>)['__solveNodes'];

  assert.notDeepEqual(
    settled,
    before,
    'an unstopped simulation must keep ticking on the event loop — otherwise the .stop() pins nothing',
  );
});

test('the injected source is actually drawn from, not merely accepted', async () => {
  // The guard on the injection, and the one that stays honest about what this
  // version of `d3-force-3d` does. `initializeForce` always forwards the
  // simulation's `random` (`simulation.js:110`), and that defaults to a
  // per-simulation LCG (`lcg.js:2-9`, `simulation.js:36`) — so dropping the
  // injection does *not* reach `Math.random`, and a test asserting it would
  // pass for the wrong reason. What the injection genuinely buys is that the
  // randomness is *ours*: this counts the draws through the source we hand in,
  // and proves they stop when the injection is removed.
  //
  // Coincident nodes are the only case randomness is drawn in (`jiggle.js:2`,
  // called from `manyBody.js:85,101`, `collide.js:74`, `link.js:37`), so the
  // fixture is two Clients whose Stars share a start month and a system radius.
  const graph = graphOf(
    { ...baseEntry(), client: 'A', project: 'Alpha', duration: { start: '2020-01', end: '2021-01' } },
    { ...baseEntry(), client: 'B', project: 'Beta', duration: { start: '2020-01', end: '2021-01' } },
  );

  const counted = (): [() => number, () => number] => {
    const generator = seededRandom();
    let draws = 0;
    return [
      () => {
        draws += 1;
        return generator();
      },
      () => draws,
    ];
  };

  const [source, draws] = counted();
  solveLayout(graph, { randomSource: source });
  assert.ok(draws() > 0, 'the real module must draw from the source it is handed');

  const mutant = await loadMutant(
    /  simulation\.randomSource\(randomSource\);\n/,
    '  void randomSource;\n',
  );
  const [mutantSource, mutantDraws] = counted();
  mutant.solveLayout(graph, { randomSource: mutantSource });
  assert.equal(
    mutantDraws(),
    0,
    'without the injection the source goes unread — which is what the assertion above pins',
  );
});

// --- Story boundaries --------------------------------------------------------

test('the solve emits no file and reads none', () => {
  // Emitting `generated/layout.generated.json` belongs to `index.ts`. A solve
  // that wrote one here would put I/O inside the module whose purity lets the
  // determinism guarantees above be asserted at all. It reads nothing either:
  // the graph arrives as an argument, which is what makes it pure.
  const source = readFileSync(SOLVE_TS, 'utf8');
  assert.doesNotMatch(source, /node:fs|writeFileSync|readFileSync|createWriteStream/, 'no I/O');
  assert.doesNotMatch(source, /process\s*\.\s*(env|argv|cwd)/, 'no ambient process state');
});

test('the build script does not name the solve', () => {
  // AD-1's first level, kept here because this is the module the build must
  // never reach. The *transitive* walk — which follows `npm run` indirection and
  // npm's implicit pre/post hooks through any depth — lives in
  // `artifact.test.ts` beside the scripts it gates, and is strictly stronger
  // than this line. This one stays because it is the cheapest possible statement
  // of the rule at the point it matters, and it costs nothing.
  const manifest = JSON.parse(
    readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
  ) as { scripts: Record<string, string> };

  assert.doesNotMatch(
    manifest.scripts['build'] ?? '',
    /\bsolve\b/,
    'the build must never invoke the solve',
  );
});

after(() => {
  for (const path of MUTANTS) rmSync(path, { force: true });
});
