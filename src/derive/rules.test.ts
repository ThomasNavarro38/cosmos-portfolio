/**
 * Covers every rules row of the story's I/O & edge-case matrix: mass ordering,
 * recency ordering, ongoing engagements, the band ceiling, single-entry sets,
 * the default weight, and rail-distance ordering.
 *
 * Run with `npm test`. Assertions are *relative* — a longer engagement yields
 * greater mass, not that it yields `4.2`. Absolute endpoints get tuned against
 * the greybox in later epics, and pinning them here would make legitimate tuning
 * look like a regression. What is pinned is the ordering, which is the contract.
 *
 * Each rule is driven both directly and through `deriveEntities`, so inverting a
 * rule's ordering fails the suite rather than only being asserted in prose.
 *
 * No DOM, no React, no Three is imported here.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema } from '../data/schema.ts';
import { deriveEntities } from './entities.ts';
import {
  MOTE_TIERS,
  RESTING_BANDS,
  SKILL_TIERS,
  deriveLuminanceBand,
  deriveMass,
  deriveMoteTier,
  deriveRailDistance,
  deriveSkillTier,
  deriveTimeAxis,
  durationInMonths,
  recencyOf,
  type LuminanceBand,
} from './rules.ts';

const AS_OF = '2026-09';
const RULES_TS = fileURLToPath(new URL('./rules.ts', import.meta.url));

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

function derive(...entries: Record<string, unknown>[]) {
  return deriveEntities(CareerSchema.parse({ asOf: AS_OF, projects: entries }), { asOf: AS_OF });
}

/** Every Project entity, flattened, in authored order. */
function allProjects(graph: ReturnType<typeof derive>) {
  return graph.clients.flatMap((c) => c.projects);
}

/** Position of a band in the resting ladder, dimmest 0. */
function brightness(band: LuminanceBand): number {
  return RESTING_BANDS.indexOf(band);
}

// --- Exactly three rules ----------------------------------------------------

test('the module exports exactly three mapping rules and three projections', async () => {
  // A fourth *rule* is a spec violation, not a feature. The whole export surface
  // is asserted rather than a `derive`-prefixed subset: a prefix filter only
  // enforces a naming convention, and a fourth mapping named `opacityFromTeamSize`
  // would pass it untouched. Anything new here must be added deliberately.
  const module: Record<string, unknown> = await import('./rules.ts');

  const RULES = ['deriveLuminanceBand', 'deriveMass', 'deriveRailDistance'];
  const PROJECTIONS = ['deriveMoteTier', 'deriveSkillTier', 'deriveTimeAxis'];
  const HELPERS = ['MOTE_TIERS', 'RESTING_BANDS', 'SKILL_TIERS', 'durationInMonths', 'recencyOf'];

  assert.deepEqual(
    Object.keys(module).sort(),
    [...RULES, ...PROJECTIONS, ...HELPERS].sort(),
    'the module exports exactly the three rules, the three projections, and its named helpers',
  );
});

test('the projections structurally cannot read an authored field', () => {
  // FR-3 permits exactly three mappings from authored data to appearance.
  // `deriveMoteTier` and `deriveTimeAxis` are projections of values the three
  // rules already produced, and this is what makes that a *property* rather than
  // an intention: their actual parameter lists are read off the source, and
  // naming a `Project`, a `Duration`, or an authored field fails the suite.
  //
  // This replaced a count of `derive`-prefixed exports, which enforced a naming
  // convention rather than the property. A projection that took a `Project` and
  // read `notable` off it would have passed that count untouched.
  const source = readFileSync(RULES_TS, 'utf8');
  const AUTHORED_FIELDS = [
    'client', 'project', 'company', 'role', 'built',
    'team_size', 'duration', 'notable', 'skills', 'weight',
  ];

  for (const name of ['deriveMoteTier', 'deriveSkillTier', 'deriveTimeAxis']) {
    const match = new RegExp(`export function ${name}\\(([^)]*)\\)`).exec(source);
    assert.ok(match !== null, `${name} must be an exported function with a readable signature`);
    const params = match[1] ?? '';

    assert.doesNotMatch(params, /\bProject\b/, `${name} must not take a Project`);
    assert.doesNotMatch(params, /\bDuration\b/, `${name} must not take a Duration`);
    for (const field of AUTHORED_FIELDS) {
      assert.doesNotMatch(
        params,
        new RegExp(`\\b${field}\\b`),
        `${name} names the authored field "${field}" — that would be a fourth rule`,
      );
    }
  }
});

// --- The projections --------------------------------------------------------

test('a Skill tier follows its share count: three or more inner, two middle, one outer', () => {
  // The matrix row "Tiers": shares 4 / 2 / 1 → inner / middle / outer.
  assert.equal(deriveSkillTier(4), 'mote-inner');
  assert.equal(deriveSkillTier(3), 'mote-inner');
  assert.equal(deriveSkillTier(2), 'mote-middle');
  assert.equal(deriveSkillTier(1), 'mote-outer');
  assert.equal(deriveSkillTier(99), 'mote-inner');
  assert.deepEqual([...SKILL_TIERS], ['mote-inner', 'mote-middle', 'mote-outer'], 'innermost first');
  for (const odd of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 2.5]) {
    assert.throws(() => deriveSkillTier(odd), RangeError, `${odd} is not a share count`);
  }
});

test('a Deep Body is denser than a Shallow one of the same mass', () => {
  // UX-DR11 forbids brightness and size from carrying the Deep signal, because
  // FR-3 has bound them to recency and duration. The mote field is the channel
  // left to carry it.
  const range = { min: 1, max: 4 };
  for (const mass of [1, 2, 3]) {
    assert.ok(
      MOTE_TIERS.indexOf(deriveMoteTier(mass, range, true)) >
        MOTE_TIERS.indexOf(deriveMoteTier(mass, range, false)),
      `at mass ${mass} a Deep Body must be denser than a Shallow one`,
    );
  }
});

test('a more massive Body is never sparser', () => {
  const range = { min: 1, max: 4 };
  for (const isDeep of [true, false]) {
    const tiers = [1, 1.5, 2, 2.5, 3, 3.5, 4].map((mass) =>
      MOTE_TIERS.indexOf(deriveMoteTier(mass, range, isDeep)),
    );
    for (let i = 1; i < tiers.length; i += 1) {
      assert.ok(
        (tiers[i] ?? 0) >= (tiers[i - 1] ?? 0),
        `the tier must never thin as mass rises (isDeep=${isDeep}): ${tiers.join(',')}`,
      );
    }
  }
});

test('the mote tier never leaves the declared set, including at the ceiling', () => {
  const range = { min: 1, max: 4 };
  for (const mass of [-5, 0, 1, 4, 99]) {
    for (const isDeep of [true, false]) {
      const tier = deriveMoteTier(mass, range, isDeep);
      assert.ok(MOTE_TIERS.includes(tier), `mass ${mass} produced ${tier}`);
    }
  }
  // The densest Deep Body must not overflow past the top of the ladder.
  assert.equal(deriveMoteTier(4, range, true), 'mote-dense');
});

test('the mote tier splits each class at exactly half the mass range, densest from the midpoint up', () => {
  // Pinned because `>= 0.5` and `> 0.5` agreed on every mass
  // the suite drove, so the split point was stated in the module and pinned
  // nowhere. The midpoint of { 1, 4 } is 2.5.
  const range = { min: 1, max: 4 };
  assert.equal(deriveMoteTier(2.5, range, false), 'mote-medium', 'a Shallow Body at the midpoint is the denser of its two tiers');
  assert.equal(deriveMoteTier(2.5, range, true), 'mote-dense', 'and so is a Deep one');
  assert.equal(deriveMoteTier(2.49, range, false), 'mote-sparse', 'just below it is the sparser');
  assert.equal(deriveMoteTier(2.49, range, true), 'mote-medium');
});

test('the mote tier holds through the graph, not only through the projection', () => {
  const graph = derive(
    { ...baseEntry(), client: 'Deep', project: 'D', notable: 'A real decision. [[Its constraint, stated.]]' },
    { ...baseEntry(), client: 'Shallow', project: 'S', notable: '' },
  );
  const all = allProjects(graph);
  const deep = all.find((p) => p.isDeep);
  const shallow = all.find((p) => !p.isDeep);
  assert.ok(deep !== undefined && shallow !== undefined);
  assert.ok(
    MOTE_TIERS.indexOf(deep.moteTier) > MOTE_TIERS.indexOf(shallow.moteTier),
    'two entries of equal span must differ in mote tier by their depth alone',
  );
});

test('the mote tier separates by mass through the graph, not only by depth', () => {
  // The sibling test above holds span equal and varies depth, so it passes under
  // any normalization range. This one holds depth equal and varies span, which is
  // what pins `massRange` in `entities.ts`: normalizing `mass` against the *span*
  // range instead collapses every Body onto the sparsest tier, and every other
  // mote assertion stays green because none of them compares two different masses.
  const graph = derive(
    {
      ...baseEntry(),
      client: 'Short',
      project: 'S',
      duration: { start: '2020-01', end: '2020-02' },
    },
    {
      ...baseEntry(),
      client: 'Long',
      project: 'L',
      duration: { start: '2010-01', end: '2020-02' },
    },
  );
  const all = allProjects(graph);
  const short = all.find((p) => p.id.includes('short'));
  const long = all.find((p) => p.id.includes('long'));
  assert.ok(short !== undefined && long !== undefined, 'both entries must derive');
  assert.equal(short.isDeep, long.isDeep, 'depth is held equal so only mass can separate them');
  assert.ok(
    MOTE_TIERS.indexOf(long.moteTier) > MOTE_TIERS.indexOf(short.moteTier),
    `the longer engagement must land on a denser tier: ${short.moteTier} vs ${long.moteTier}`,
  );
});

test('timeAxis and luminanceBand are projections of one number', () => {
  // Both take `(recency, range)` — the identical ordinal rank — so they cannot
  // separate. This asserts it at the rule level; `artifact.test.ts` asserts it
  // over a fixture whose start order deliberately opposes its recency order,
  // which is where the previous implementation's inversion actually showed.
  const range = { min: 0, max: 4 };
  const axes = [0, 1, 2, 3, 4].map((rank) => deriveTimeAxis(rank, range));
  const bands = [0, 1, 2, 3, 4].map((rank) => brightness(deriveLuminanceBand(rank, range)));

  for (let i = 1; i < axes.length; i += 1) {
    assert.ok((axes[i] ?? 0) > (axes[i - 1] ?? 0), 'the axis rises strictly with recency');
    assert.ok((bands[i] ?? 0) >= (bands[i - 1] ?? 0), 'and the band never dims as it does');
  }
});

test('timeAxis stays within 0..1 and puts the oldest at 0', () => {
  const range = { min: 0, max: 9 };
  for (const rank of [0, 4, 9]) {
    const value = deriveTimeAxis(rank, range);
    assert.ok(value >= 0 && value <= 1, `rank ${rank} gave ${value}`);
  }
  assert.equal(deriveTimeAxis(0, range), 0, 'the oldest entry sits at the origin of the axis');
  assert.equal(deriveTimeAxis(9, range), 1, 'and the most recent at the far end');
});

test('a single-entry set gives a finite timeAxis and tier, not NaN', () => {
  // `career.json` holds one entry today, so a zero-width range is real.
  const [only] = allProjects(derive(baseEntry()));
  assert.ok(only !== undefined);
  assert.ok(Number.isFinite(only.timeAxis), `timeAxis must be a number, got ${only.timeAxis}`);
  assert.ok(only.timeAxis >= 0 && only.timeAxis <= 1);
  assert.ok(MOTE_TIERS.includes(only.moteTier));
});

// --- Matrix row: mass ordering ----------------------------------------------

test('a longer engagement yields strictly greater mass', () => {
  const sixMonths = durationInMonths({ start: '2020-01', end: '2020-06' }, AS_OF);
  const twentyFour = durationInMonths({ start: '2020-01', end: '2021-12' }, AS_OF);
  const range = { min: sixMonths, max: twentyFour };

  assert.ok(
    deriveMass(twentyFour, range) > deriveMass(sixMonths, range),
    'a 24-month engagement must outweigh a 6-month one',
  );
});

test('mass ordering holds through the graph, not only through the rule', () => {
  const graph = derive(
    { ...baseEntry(), client: 'Short', project: 'S', duration: { start: '2020-01', end: '2020-06' } },
    { ...baseEntry(), client: 'Long', project: 'L', duration: { start: '2020-01', end: '2021-12' } },
  );
  const [short, long] = allProjects(graph);
  assert.ok(short !== undefined && long !== undefined);
  assert.ok(long.mass > short.mass, 'the longer engagement is the more massive Body');
});

test('equal spans yield equal mass regardless of when they happened', () => {
  const a = durationInMonths({ start: '2010-01', end: '2011-01' }, AS_OF);
  const b = durationInMonths({ start: '2020-05', end: '2021-05' }, AS_OF);
  assert.equal(a, b, 'the same span is the same number of months');

  // The range must span more than these two values. `{min: a, max: b}` is
  // zero-width when `a === b`, so `normalize` short-circuits and the assertion
  // holds for any pure function — including an inverted one. A third, longer
  // span puts both values inside a real range and makes the mapping run.
  const longer = durationInMonths({ start: '2000-01', end: '2010-01' }, AS_OF);
  assert.ok(longer > a, 'the third span is genuinely longer');
  const range = { min: a, max: longer };

  assert.equal(deriveMass(a, range), deriveMass(b, range));
  assert.ok(
    deriveMass(longer, range) > deriveMass(a, range),
    'and the range is live: the longer span still maps to greater mass',
  );
});

test('a single-month engagement has a positive span, not zero', () => {
  // The schema accepts an equal start and end as a real engagement, so it must
  // not derive to no mass at all.
  assert.ok(durationInMonths({ start: '2019-01', end: '2019-01' }, AS_OF) > 0);
});

test('mass is finite and positive across the range', () => {
  const range = { min: 1, max: 60 };
  for (const months of [1, 12, 30, 60]) {
    const mass = deriveMass(months, range);
    assert.ok(Number.isFinite(mass) && mass > 0, `mass for ${months} months: ${mass}`);
  }
});

// --- Matrix row: ongoing engagement -----------------------------------------

test('an ongoing engagement is measured to the reference month', () => {
  const ongoing = durationInMonths({ start: '2024-01', end: null }, AS_OF);
  const closed = durationInMonths({ start: '2024-01', end: '2024-06' }, AS_OF);
  assert.ok(ongoing > closed, 'an engagement still running is longer than one that ended in 2024');
});

test('no closed engagement outranks an ongoing one on recency', () => {
  // The schema bounds an authored `end` to a horizon, but an `end` between the
  // reference month and that horizon is still admissible. Ongoing must win on
  // recency regardless, or the brightest band goes to finished work while the
  // engagement running right now is dimmed.
  const ongoing = { start: '2020-01', end: null };
  const futureEnd = { start: '2020-01', end: '2027-06' };
  assert.ok(
    recencyOf(ongoing, AS_OF) >= recencyOf(futureEnd, AS_OF),
    'an ongoing engagement must never rank below a closed one',
  );
});

test('an ongoing Project is never dimmer than a future-dated closed one', () => {
  const entries = [
    { ...baseEntry(), client: 'Ongoing', project: 'O', duration: { start: '2020-01', end: null } },
    { ...baseEntry(), client: 'Future', project: 'F', duration: { start: '2020-01', end: '2027-06' } },
  ];
  const graph = derive(...entries);
  const all = allProjects(graph);
  const ongoing = all.find((p) => p.project.client === 'Ongoing');
  const future = all.find((p) => p.project.client === 'Future');
  assert.ok(ongoing !== undefined && future !== undefined, 'both Projects derive');
  assert.ok(
    RESTING_BANDS.indexOf(ongoing.luminanceBand) >= RESTING_BANDS.indexOf(future.luminanceBand),
    'the ongoing engagement must not land in a dimmer band than finished work',
  );
});

test('an ongoing engagement ranks as the most recent', () => {
  // `end: null` means ongoing, and ongoing work is current — the alternative,
  // sorting it last as unknown, would dim the work being done right now.
  assert.equal(recencyOf({ start: '2024-01', end: null }, AS_OF), AS_OF);
  assert.ok(
    recencyOf({ start: '2024-01', end: null }, AS_OF) >
      recencyOf({ start: '2019-01', end: '2024-01' }, AS_OF),
    'ongoing sorts after every closed engagement',
  );
});

test('an ongoing Project lands in the brightest band of its set', () => {
  const graph = derive(
    { ...baseEntry(), client: 'Old', project: 'O', duration: { start: '2010-01', end: '2011-01' } },
    { ...baseEntry(), client: 'Mid', project: 'M', duration: { start: '2018-01', end: '2019-01' } },
    { ...baseEntry(), client: 'Now', project: 'N', duration: { start: '2024-01', end: null } },
  );
  const [old, mid, now] = allProjects(graph);
  assert.ok(old !== undefined && mid !== undefined && now !== undefined);
  assert.ok(brightness(now.luminanceBand) > brightness(old.luminanceBand));
  assert.ok(brightness(now.luminanceBand) >= brightness(mid.luminanceBand));
});

// --- Matrix row: recency ordering -------------------------------------------

test('a more recent engagement lands in a brighter band', () => {
  const range = { min: 0, max: 1 };
  assert.ok(
    brightness(deriveLuminanceBand(1, range)) > brightness(deriveLuminanceBand(0, range)),
    '2024 must be brighter than 2019',
  );
});

test('recency ordering holds through the graph', () => {
  const graph = derive(
    { ...baseEntry(), client: 'Old', project: 'O', duration: { start: '2018-01', end: '2019-01' } },
    { ...baseEntry(), client: 'New', project: 'N', duration: { start: '2023-01', end: '2024-01' } },
  );
  const [old, recent] = allProjects(graph);
  assert.ok(old !== undefined && recent !== undefined);
  assert.ok(
    brightness(recent.luminanceBand) > brightness(old.luminanceBand),
    'the more recent Project must be in a brighter band',
  );
});

test('band ordering is monotonic across the whole range', () => {
  const range = { min: 0, max: 9 };
  const bands = Array.from({ length: 10 }, (_, i) => brightness(deriveLuminanceBand(i, range)));
  for (let i = 1; i < bands.length; i += 1) {
    assert.ok(
      (bands[i] ?? 0) >= (bands[i - 1] ?? 0),
      `band must never dim as recency increases: ${bands.join(',')}`,
    );
  }
  assert.ok(new Set(bands).size > 1, 'the rule must actually discriminate, not return one band');
});

test('equal recency yields the same band regardless of authored order', () => {
  const graph = derive(
    { ...baseEntry(), client: 'A', project: 'A', duration: { start: '2018-01', end: '2020-01' } },
    { ...baseEntry(), client: 'B', project: 'B', duration: { start: '2019-06', end: '2020-01' } },
  );
  const [a, b] = allProjects(graph);
  assert.equal(a?.luminanceBand, b?.luminanceBand, 'two entries ending in the same month agree');
});

// --- Matrix row: band ceiling -----------------------------------------------

test('the band never exceeds the resting maximum', () => {
  // UX-DR2 reserves `stroke-active` and `stroke-focus` for camera state. The
  // return type makes them unrepresentable; this pins the values too.
  const range = { min: 0, max: 4 };
  for (const rank of [0, 1, 2, 3, 4, 99]) {
    const band = deriveLuminanceBand(rank, range);
    assert.ok(
      RESTING_BANDS.includes(band),
      `rank ${rank} produced ${band}, outside the resting band`,
    );
  }
});

test('the resting band is two steps, and the oldest Planet sits at stroke-rest, never stroke-dust (3.9)', () => {
  // Ruling 4b-i: `stroke-dust` is the Rail's and the Dust's step. A Planet drawn
  // there sank below its own `stroke-rest` orbit; the oldest now equals it.
  assert.deepEqual([...RESTING_BANDS], ['stroke-rest', 'stroke-near']);
  const range = { min: 0, max: 9 };
  assert.equal(deriveLuminanceBand(0, range), 'stroke-rest', 'the oldest (recency ordinal 0) is stroke-rest');
  assert.equal(deriveLuminanceBand(9, range), 'stroke-near', 'the most recent is stroke-near');
  for (let rank = 0; rank <= 9; rank += 1) {
    assert.notEqual(deriveLuminanceBand(rank, range), 'stroke-dust', `rank ${rank} reached stroke-dust`);
  }
});

test('no camera-state step is reachable from the rule or the graph', () => {
  const reserved = ['stroke-active', 'stroke-focus'];
  assert.deepEqual(
    RESTING_BANDS.filter((band) => reserved.includes(band)),
    [],
    'the resting band must not contain a camera-state step',
  );

  const graph = derive(
    { ...baseEntry(), client: 'A', project: 'A', duration: { start: '2010-01', end: '2011-01' } },
    { ...baseEntry(), client: 'B', project: 'B', duration: { start: '2025-01', end: null } },
  );
  for (const project of allProjects(graph)) {
    assert.ok(
      !reserved.includes(project.luminanceBand),
      `the most recent entry reached ${project.luminanceBand} while unfocused`,
    );
  }
});

// --- Matrix row: single-entry set -------------------------------------------

test('a single-entry set derives without dividing by a zero-width range', () => {
  // `career.json` holds one entry today. This is real, not hypothetical.
  const graph = derive(baseEntry());
  const [only] = allProjects(graph);
  assert.ok(only !== undefined);
  assert.ok(Number.isFinite(only.mass), `mass must be a number, got ${only.mass}`);
  assert.ok(only.mass > 0);
  assert.ok(RESTING_BANDS.includes(only.luminanceBand));
  assert.ok(Number.isFinite(only.railDistance) && only.railDistance > 0);
});

test('a zero-width range yields the top of the range, not NaN', () => {
  const flat = { min: 12, max: 12 };
  assert.ok(Number.isFinite(deriveMass(12, flat)));
  assert.equal(deriveMass(12, flat), deriveMass(12, { min: 0, max: 12 }));
  assert.equal(deriveLuminanceBand(0, { min: 0, max: 0 }), 'stroke-near');
});

// --- Matrix row: rail distance ----------------------------------------------

test('a greater weight yields a smaller distance from the Rail', () => {
  assert.ok(
    deriveRailDistance(4) < deriveRailDistance(1),
    'weight 4 must sit closer to the Rail than weight 1',
  );
});

test('rail distance ordering holds through the graph', () => {
  const graph = derive(
    { ...baseEntry(), client: 'Light', project: 'L', weight: 1 },
    { ...baseEntry(), client: 'Heavy', project: 'H', weight: 4 },
  );
  const [light, heavy] = allProjects(graph);
  assert.ok(light !== undefined && heavy !== undefined);
  assert.ok(heavy.railDistance < light.railDistance);
});

test('rail distance stays positive for any positive weight', () => {
  // A subtractive form would put a heavily weighted entry behind the Rail.
  for (const weight of [0.1, 1, 4, 100]) {
    const distance = deriveRailDistance(weight);
    assert.ok(distance > 0 && Number.isFinite(distance), `weight ${weight} gave ${distance}`);
  }
});

// --- Matrix row: default weight ---------------------------------------------

test('an omitted weight resolves to 1 and the derivation reads the resolved value', () => {
  const entry = baseEntry();
  assert.equal('weight' in entry, false, 'the fixture must genuinely omit weight');

  const [omitted] = allProjects(derive(entry));
  const [explicit] = allProjects(derive({ ...baseEntry(), weight: 1 }));
  assert.equal(
    omitted?.railDistance,
    explicit?.railDistance,
    'the schema default must reach the rule, with no fallback in derive code',
  );
  assert.equal(omitted?.railDistance, deriveRailDistance(1));
});

test('an authored weight overrides the default', () => {
  const [entity] = allProjects(derive({ ...baseEntry(), weight: 2.5 }));
  assert.equal(entity?.railDistance, deriveRailDistance(2.5));
  assert.notEqual(entity?.railDistance, deriveRailDistance(1));
});

// --- Purity -----------------------------------------------------------------

test('the rules are pure: the same input gives the same output', () => {
  const range = { min: 1, max: 60 };
  assert.equal(deriveMass(30, range), deriveMass(30, range));
  assert.equal(deriveLuminanceBand(2, { min: 0, max: 4 }), deriveLuminanceBand(2, { min: 0, max: 4 }));
  assert.equal(deriveRailDistance(3), deriveRailDistance(3));
});

test('deriving twice yields identical graphs', () => {
  const entries = [
    { ...baseEntry(), client: 'A', project: 'A' },
    { ...baseEntry(), client: 'B', project: 'B', duration: { start: '2023-01', end: null } },
  ];
  assert.deepEqual(derive(...entries), derive(...entries));
});

test('the reference month is injected, never read from the clock', () => {
  // A rule calling `new Date()` would churn the committed artifact every month
  // for no authored change. Two assertions: `asOf` genuinely feeds the ongoing
  // span, and no other output moves when it does.
  // Three entries, not two. `mass` is normalized across the set, so in a
  // two-entry set the ongoing engagement is the longest at any reference month
  // and pins to the top of the range either way — the reference month would be
  // unobservable in the graph's output. A long closed entry holding the top of
  // the range lets the ongoing span rise *within* it as the reference advances.
  const entries = [
    { ...baseEntry(), client: 'Short', project: 'S', duration: { start: '2020-01', end: '2020-03' } },
    { ...baseEntry(), client: 'Long', project: 'L', duration: { start: '2010-01', end: '2024-01' } },
    { ...baseEntry(), client: 'Ongoing', project: 'O', duration: { start: '2024-01', end: null } },
  ];
  const parsed = CareerSchema.parse({ asOf: AS_OF, projects: entries });

  const early = deriveEntities(parsed, { asOf: '2026-01' });
  const late = deriveEntities(parsed, { asOf: '2030-01' });

  const ongoing = { start: '2024-01', end: null };
  assert.ok(
    durationInMonths(ongoing, '2030-01') > durationInMonths(ongoing, '2026-01'),
    'a later reference lengthens an ongoing span, so asOf must actually reach the rules',
  );
  assert.ok(
    recencyOf(ongoing, '2030-01') > recencyOf(ongoing, '2026-01'),
    'and it is what an ongoing engagement ranks by',
  );

  // Through the graph, not only through the rules. The direct-rule assertions
  // above pass even if `deriveEntities` ignores `asOf` entirely and hardcodes a
  // month, which is the regression this test exists to catch.
  //
  // `mass` cannot carry this assertion: it is normalized across the set, so the
  // ongoing entry is the longest engagement at any reference month and pins to
  // the top of the range either way. The observable that does move is the raw
  // span, read off the Project the graph produced — so the graph stays in the
  // path and a hardcoded `asOf` inside `deriveEntities` is still caught.
  const earlyOngoing = allProjects(early).find((p) => p.project.client === 'Ongoing');
  const lateOngoing = allProjects(late).find((p) => p.project.client === 'Ongoing');
  assert.ok(
    earlyOngoing !== undefined && lateOngoing !== undefined,
    'the ongoing Project derives under both references',
  );
  assert.ok(
    lateOngoing.mass > earlyOngoing.mass,
    "a later reference month must raise the ongoing Project's mass in the graph",
  );

  assert.deepEqual(
    late.clients.map((c) => c.id),
    early.clients.map((c) => c.id),
    'identity must not move with the reference month',
  );

  assert.deepEqual(
    deriveEntities(parsed, { asOf: '2026-01' }),
    early,
    'the same reference gives byte-identical output',
  );
});
