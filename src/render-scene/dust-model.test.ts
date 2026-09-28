/**
 * Dust at rest, executed: the whole I/O matrix over in-memory fixtures, plus
 * determinism, the falloff profile, the draw-order constants, and a source audit of
 * the model driven over reconstructed bad forms.
 *
 * The committed artifact holds **one Client and one Project**, so "no two media
 * overlap" and "the composite alpha at every Body stays under the peak" are vacuous
 * against it — there is only one medium. The five-Client fixture is where those
 * claims can fail, so that is where they are asserted. The fixtures restate
 * `scene-model.test.ts`'s idiom rather than importing it: a test module exporting
 * helpers would make one suite's fixtures another's contract.
 *
 * The renderer half of "no Dust fragment is drawn over a Body" — every Dust element
 * carrying `depthWrite={false}` and `DUST_RENDER_ORDER`, every Body `transparent`
 * and at `BODY_RENDER_ORDER` — is a source scan in `scene-model.test.ts`, beside
 * the renderer's other ratchets.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DUST_MEDIUM_BREADTH,
  DUST_MEDIUM_MARGIN,
  DUST_MEDIUM_PEAK_OPACITY,
  DUST_MEDIUM_TEXTURE_SIZE,
  DUST_PARTICLE_CLEARANCE,
  DUST_PARTICLES_PER_BODY,
  DUST_PLACEMENT_ATTEMPTS_PER_PARTICLE,
  DUST_RENDER_ORDER,
  DUST_SCATTER_PADDING,
  DUST_TUNING,
  buildDust,
  falloffAt,
  mediumAlphaAt,
  mediumFalloff,
  type Dust,
} from './dust-model.ts';
import {
  BODY_MARGIN,
  BODY_RENDER_ORDER,
  buildScene,
  frameBodies,
  type Body,
  type SceneArtifact,
  type SceneArtifactClient,
  type SceneArtifactProject,
} from './scene-model.ts';

const DUST_TS = fileURLToPath(new URL('./dust-model.ts', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));

// --- Fixtures (restated from scene-model.test.ts) ----------------------------

function at(x: number, y = 0, z = 0) {
  return { x, y, z };
}

function project(id: string, clientId: string, position = at(1)): SceneArtifactProject {
  return {
    id,
    clientId,
    isDeep: false,
    mass: 2,
    luminanceBand: 'stroke-near',
    moteTier: 'mote-sparse',
    position,
  };
}

function client(
  id: string,
  position: { x: number; y: number; z: number },
  ...projects: SceneArtifactProject[]
): SceneArtifactClient {
  return { id, position, projects };
}

/** Five Clients, ten Projects, unevenly distributed — the neighbouring-systems case. */
function fiveClients(): SceneArtifact {
  return {
    clients: [
      client(
        'client:a',
        at(0, 0),
        project('project:a/1', 'client:a', at(3, 1)),
        project('project:a/2', 'client:a', at(-3, 2)),
        project('project:a/3', 'client:a', at(1, -4)),
      ),
      client('client:b', at(20, 0), project('project:b/1', 'client:b', at(24, 3))),
      client(
        'client:c',
        at(40, 5),
        project('project:c/1', 'client:c', at(44, 8)),
        project('project:c/2', 'client:c', at(36, 2)),
      ),
      client('client:d', at(60, -5), project('project:d/1', 'client:d', at(64, -2))),
      client(
        'client:e',
        at(80, 0),
        project('project:e/1', 'client:e', at(84, 4)),
        project('project:e/2', 'client:e', at(76, -6)),
        project('project:e/3', 'client:e', at(80, 7)),
      ),
    ],
  };
}

function committedBodies(): readonly Body[] {
  return buildScene(JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as SceneArtifact).bodies;
}

const dustOf = (artifact: SceneArtifact): Dust => buildDust(buildScene(artifact).bodies);

const distance = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const targetFor = (bodyCount: number): number => Math.round(DUST_PARTICLES_PER_BODY * bodyCount);

// --- Matrix row: nominal -----------------------------------------------------

test('N Stars yield exactly N media, one centred on each Star, because the medium is per Client system', () => {
  const { bodies } = buildScene(fiveClients());
  const { media } = buildDust(bodies);
  const stars = bodies.filter((body) => body.kind === 'star');

  assert.equal(media.length, stars.length, 'one medium per Star, and none per Planet');
  assert.deepEqual(
    media.map((medium) => medium.id),
    stars.map((star) => star.id),
    'each medium is keyed by the Star it belongs to',
  );
  for (const medium of media) {
    const star = stars.find((entry) => entry.id === medium.id);
    assert.deepEqual(medium.position, star?.position, `${medium.id}'s medium is centred on its Star`);
    assert.ok(Number.isFinite(medium.radius) && medium.radius > 0, `${medium.id}'s medium has real extent`);
    assert.equal(medium.opacity, DUST_MEDIUM_PEAK_OPACITY, 'and peaks at the named opacity');
  }
});

test('the particle count is round(ratio × Bodies), because density is a ratio and not a count', () => {
  const { bodies } = buildScene(fiveClients());
  assert.equal(bodies.length, 15, 'the fixture holds fifteen Bodies');
  assert.equal(buildDust(bodies).particles.length, targetFor(15), 'the fixture reaches the ratio’s target');
});

test('an uncapped medium reaches past its farthest Planet, so that system sits inside its own gradient', () => {
  // Measured where no neighbour caps it: a lone system. Where a neighbour is close,
  // the cap can make a medium smaller than its own system — non-overlap wins.
  const { media } = dustOf({
    clients: [client('client:a', at(0), project('project:a/1', 'client:a', at(6, 2)))],
  });
  const [medium] = media;
  assert.ok(medium !== undefined);
  assert.ok(medium.radius > Math.hypot(6, 2), 'the farthest Planet is inside the medium');
  assert.ok(
    mediumAlphaAt(medium, at(6, 2)) > 0,
    'and the medium is still present at the farthest Planet rather than ending on it',
  );
});

// --- Matrix row: the committed artifact -------------------------------------

test('the committed artifact gets its ratio’s particle count in a non-degenerate volume, though flat in y and z', () => {
  // One Star and one Planet, both at y = 0 and z = 0: a scatter box read off the
  // Bodies alone would be a line segment, and every particle would sit on the axis.
  const bodies = committedBodies();
  const { media, particles } = buildDust(bodies);

  assert.equal(media.length, 1, 'one Client, one medium');
  assert.equal(particles.length, targetFor(bodies.length), 'the count equals the ratio’s target');

  for (const axis of ['x', 'y', 'z'] as const) {
    const values = particles.map((particle) => particle.position[axis]);
    const spread = Math.max(...values) - Math.min(...values);
    assert.ok(spread > BODY_MARGIN, `particles spread on ${axis} (got ${spread}), so the volume is not flat`);
  }
});

// --- Matrix row: neighbouring systems ---------------------------------------

test('no two media overlap in the five-Client fixture, so media never pile up behind a Body', () => {
  // Each radius is capped at half the distance to the nearest other Star, so two
  // media can at most touch — where both have already fallen to zero.
  const { media } = dustOf(fiveClients());
  for (const [i, a] of media.entries()) {
    for (const b of media.slice(i + 1)) {
      assert.ok(
        a.radius + b.radius <= distance(a.position, b.position) + 1e-9,
        `${a.id} and ${b.id} overlap: ${a.radius} + ${b.radius} > ${distance(a.position, b.position)}`,
      );
    }
  }
});

test('the neighbour cap actually binds in the five-Client fixture, so the overlap test is not vacuous', () => {
  // Uncapped, client:a's medium would be (√17 + margin) × breadth > 10, and client:b
  // sits 20 away. If no medium ever hit its cap, the test above would pass for a
  // model with no cap at all.
  const { media } = dustOf(fiveClients());
  const a = media.find((medium) => medium.id === 'client:a');
  assert.equal(a?.radius, 10, 'half the distance to client:b');
});

test('a medium sizes to its own Planets only, not to another Client’s', () => {
  // Every multi-Client medium in the five-Client fixture is cap-bound, so there a
  // model that measured extent over *all* Planets was indistinguishable — proven by
  // deleting the clientId match with every test green. Two systems 100 apart: the
  // small one is far below its cap, so its radius is its own extent's and nothing
  // else's.
  const { media } = dustOf({
    clients: [
      client('client:small', at(0), project('project:small/1', 'client:small', at(2))),
      client('client:wide', at(100), project('project:wide/1', 'client:wide', at(130))),
    ],
  });
  const small = media.find((medium) => medium.id === 'client:small');
  assert.ok(small !== undefined);
  assert.equal(small.radius, (2 + DUST_MEDIUM_MARGIN) * DUST_MEDIUM_BREADTH, 'its own extent, margin and breadth');
  assert.ok(small.radius < 50, 'and below its cap, so the cap is not what decided it');
});

test('the composite medium alpha at every Body is at most the peak opacity', () => {
  const { bodies } = buildScene(fiveClients());
  const { media } = buildDust(bodies);
  for (const body of bodies) {
    const composite = media.reduce((sum, medium) => sum + mediumAlphaAt(medium, body.position), 0);
    assert.ok(
      composite <= DUST_MEDIUM_PEAK_OPACITY + 1e-9,
      `${body.id} sits behind ${composite} of medium, above the ${DUST_MEDIUM_PEAK_OPACITY} ceiling`,
    );
  }
});

test('two Stars at one coordinate get zero-radius media rather than overlapping ones', () => {
  // Distinct IDs at one point is legal (the scene accepts it); the cap is then zero.
  const { media } = dustOf({ clients: [client('client:a', at(0)), client('client:b', at(0))] });
  assert.equal(media.length, 2);
  for (const medium of media) assert.equal(medium.radius, 0);
  assert.equal(mediumAlphaAt(media[0]!, at(0)), 0, 'a zero-radius medium contributes nothing');
});

// --- Matrix row: clearance ---------------------------------------------------

test('every particle is at least BODY_MARGIN from every Body centre, so no particle crowds a Body', () => {
  assert.ok(DUST_PARTICLE_CLEARANCE >= BODY_MARGIN, 'the clearance is at least the margin');
  for (const bodies of [buildScene(fiveClients()).bodies, committedBodies()]) {
    const { particles } = buildDust(bodies);
    assert.equal(particles.length, targetFor(bodies.length), 'the fixture hits its target within the budget');
    for (const particle of particles) {
      for (const body of bodies) {
        assert.ok(
          distance(particle.position, body.position) >= BODY_MARGIN,
          `${particle.id} is ${distance(particle.position, body.position)} from ${body.id}`,
        );
      }
    }
  }
});

test('particles stay inside the Bodies’ padded bounding box, so the scatter is between Bodies', () => {
  const { bodies } = buildScene(fiveClients());
  for (const particle of buildDust(bodies).particles) {
    for (const axis of ['x', 'y', 'z'] as const) {
      const values = bodies.map((body) => body.position[axis]);
      assert.ok(particle.position[axis] >= Math.min(...values) - DUST_SCATTER_PADDING);
      assert.ok(particle.position[axis] <= Math.max(...values) + DUST_SCATTER_PADDING);
    }
  }
});

test('placement is bounded: a crowded layout under a tight budget runs short rather than hanging or crowding', () => {
  // A 5 x 5 x 5 lattice of Stars 3 apart: the clearance spheres cover the lattice's
  // interior, so most candidates are rejected. At one attempt per particle the target
  // cannot be reached, and the scatter must come back short, terminate, and still
  // respect clearance. (At the shipped budget no layout runs short: the padding
  // always leaves a free shell, which is why the budget is a tuning field.)
  const clients: SceneArtifactClient[] = [];
  for (let i = 0; i < 5; i += 1) {
    for (let j = 0; j < 5; j += 1) {
      for (let k = 0; k < 5; k += 1) clients.push(client(`client:${i}-${j}-${k}`, at(i * 3, j * 3, k * 3)));
    }
  }
  const { bodies } = buildScene({ clients });
  const target = targetFor(bodies.length);
  const { particles } = buildDust(bodies, { ...DUST_TUNING, placementAttemptsPerParticle: 1 });
  assert.ok(particles.length < target, `the budget must bind: placed ${particles.length} of ${target}`);
  assert.ok(particles.length > 0, 'and still place what it can');
  for (const particle of particles) {
    for (const body of bodies) assert.ok(distance(particle.position, body.position) >= BODY_MARGIN);
  }
});

test('out-of-range tuning throws a RangeError naming the field, rather than a silent or unbounded scatter', () => {
  // NaN yielded a silently empty scatter and Infinity an unbounded placement loop.
  const bodies = committedBodies();
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
    assert.throws(
      () => buildDust(bodies, { ...DUST_TUNING, particlesPerBody: value }),
      (error: Error) => error instanceof RangeError && /particlesPerBody/.test(error.message),
      `particlesPerBody = ${value}`,
    );
  }
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -0.1, 1.5]) {
    assert.throws(
      () => buildDust(bodies, { ...DUST_TUNING, mediumPeakOpacity: value }),
      (error: Error) => error instanceof RangeError && /mediumPeakOpacity/.test(error.message),
      `mediumPeakOpacity = ${value}`,
    );
  }
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
    assert.throws(
      () => buildDust(bodies, { ...DUST_TUNING, placementAttemptsPerParticle: value }),
      (error: Error) => error instanceof RangeError && /placementAttemptsPerParticle/.test(error.message),
      `placementAttemptsPerParticle = ${value}`,
    );
  }
  assert.throws(() => buildDust([], { ...DUST_TUNING, particlesPerBody: Number.NaN }), RangeError, 'even with no Bodies');

  // The boundaries themselves are legal.
  assert.equal(buildDust(bodies, { ...DUST_TUNING, particlesPerBody: 0 }).particles.length, 0);
  for (const opacity of [0, 1]) {
    assert.equal(buildDust(bodies, { ...DUST_TUNING, mediumPeakOpacity: opacity }).media[0]?.opacity, opacity);
  }
});

// --- Matrix row: Skills differ -----------------------------------------------

test('Dust is identical for the same Bodies whatever their Skills, because Dust is not keyed by a Skill', () => {
  // FR-13: no per-Skill entity. The Skills arrive on `content`, which the scene never
  // reads; the Dust must not change when they do.
  //
  // Honest about its reach: this cannot fail through `dust-model.ts`, because a `Body`
  // carries no `content` field at all — `buildScene` drops it. The real guard is
  // structural: `Body` has no content, and the source audit at the bottom of this file
  // bans `content` and `skills` in the model. This test pins the end-to-end behaviour.
  const withSkills = (skills: readonly string[]): SceneArtifact =>
    ({
      clients: fiveClients().clients.map((entry) => ({
        ...entry,
        projects: entry.projects.map((p) => ({ ...p, content: { skills } })),
      })),
    }) as SceneArtifact;

  assert.deepEqual(dustOf(withSkills(['Java', 'Spring Boot'])), dustOf(withSkills(['Rust', 'Kafka', 'MDM'])));
});

test('no Mote and no Skill appears anywhere in the Dust’s output', () => {
  const serialised = JSON.stringify(dustOf(fiveClients()));
  assert.doesNotMatch(serialised, /mote|skill/i);
});

// --- Matrix row: empty -------------------------------------------------------

test('no Bodies yields no media and no particles, without throwing', () => {
  assert.deepEqual(buildDust([]), { media: [], particles: [] });
});

// --- Determinism and tuning --------------------------------------------------

test('the scatter is identical across builds, and the Body list comes back unchanged', () => {
  const { bodies } = buildScene(fiveClients());
  const before = JSON.stringify(bodies);
  const first = buildDust(bodies);
  const second = buildDust(bodies);
  assert.deepEqual(second, first, 'two builds agree exactly — no Math.random');
  assert.notEqual(second, first, 'each call returns a fresh structure');
  assert.equal(JSON.stringify(bodies), before, 'the Bodies are not mutated');
});

test('the scatter moves when the Bodies move, so it is read off them rather than hard-coded', () => {
  // The whole layout shifts, so the scatter's box moves with it.
  const shift = (p: { x: number; y: number; z: number }) => at(p.x + 1, p.y + 2, p.z);
  const moved: SceneArtifact = {
    clients: fiveClients().clients.map((entry) => ({
      ...entry,
      position: shift(entry.position),
      projects: entry.projects.map((p) => ({ ...p, position: shift(p.position) })),
    })),
  };
  assert.notDeepEqual(dustOf(moved).particles, dustOf(fiveClients()).particles);
});

test('retuning the ratio or the peak opacity changes density with no other edit', () => {
  // The tuning parameter defaults to the named constants, so this is the same code
  // path the scene runs, with one number changed.
  const { bodies } = buildScene(fiveClients());
  const doubled = buildDust(bodies, { ...DUST_TUNING, particlesPerBody: DUST_PARTICLES_PER_BODY * 2 });
  assert.equal(doubled.particles.length, Math.round(DUST_PARTICLES_PER_BODY * 2 * bodies.length));

  const fainter = buildDust(bodies, { ...DUST_TUNING, mediumPeakOpacity: 0.1 });
  for (const medium of fainter.media) assert.equal(medium.opacity, 0.1);

  assert.deepEqual(DUST_TUNING, {
    particlesPerBody: DUST_PARTICLES_PER_BODY,
    mediumPeakOpacity: DUST_MEDIUM_PEAK_OPACITY,
    placementAttemptsPerParticle: DUST_PLACEMENT_ATTEMPTS_PER_PARTICLE,
  });
  assert.equal(DUST_MEDIUM_PEAK_OPACITY, 0.42, 'DESIGN.md §7.5');
});

test('Dust does not widen the default framing, which still frames Bodies only', () => {
  // Particles scatter past the Bodies' box; a framing fitted to them would push the
  // camera back and shrink every Body.
  const { bodies } = buildScene(fiveClients());
  const before = frameBodies(bodies);
  buildDust(bodies);
  assert.deepEqual(frameBodies(bodies), before);
});

// --- The falloff -------------------------------------------------------------

test('the falloff profile is 1 at the centre, 0 at and past the edge, and non-increasing between', () => {
  assert.equal(falloffAt(0), 1);
  assert.equal(falloffAt(1), 0);
  assert.equal(falloffAt(2), 0);
  assert.equal(falloffAt(Number.NaN), 0, 'a NaN distance contributes nothing');
  let previous = falloffAt(0);
  for (let step = 1; step <= 100; step += 1) {
    const value = falloffAt(step / 100);
    assert.ok(value <= previous, `falloff rises at t = ${step / 100}`);
    previous = value;
  }
});

test('the falloff texture is white RGBA, 255 alpha at the centre, 0 at the edge, non-increasing along the radius', () => {
  const size = DUST_MEDIUM_TEXTURE_SIZE;
  const data = mediumFalloff(size);
  assert.equal(data.length, size * size * 4);

  const texel = (column: number, row: number) => data.subarray((row * size + column) * 4, (row * size + column) * 4 + 4);
  const centre = (size - 1) / 2;
  assert.ok(Number.isInteger(centre), 'an odd size puts a texel exactly on the centre');

  for (let i = 0; i < size * size; i += 1) {
    assert.deepEqual([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]], [255, 255, 255], 'RGB is white; colour is the material’s');
  }
  assert.equal(texel(centre, centre)[3], 255, 'opaque at the centre');
  for (const [column, row] of [
    [0, centre],
    [size - 1, centre],
    [centre, 0],
    [centre, size - 1],
    [0, 0],
    [size - 1, size - 1],
  ] as const) {
    assert.equal(texel(column, row)[3], 0, `transparent at the edge (${column}, ${row})`);
  }

  // Along every ray from the centre to an edge midpoint, alpha never rises.
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    let previous = 255;
    for (let step = 0; step <= centre; step += 1) {
      const alpha = texel(centre + dx * step, centre + dy * step)[3]!;
      assert.ok(alpha <= previous, `alpha rises at step ${step} along (${dx}, ${dy})`);
      previous = alpha;
    }
  }
});

test('the falloff texture rejects a size it cannot build, even sizes included', () => {
  // An even size puts no texel on the centre, and at size 2 all four texels sit on the
  // edge, so the texture would be fully transparent.
  for (const size of [0, -1, 2.5, Number.NaN, 2, 4, 64]) assert.throws(() => mediumFalloff(size), RangeError);
  assert.equal(mediumFalloff(1)[3], 255, 'a single texel is all centre');
});

// --- Draw order --------------------------------------------------------------

test('Dust renders before every Body: DUST_RENDER_ORDER < BODY_RENDER_ORDER', () => {
  assert.ok(Number.isFinite(DUST_RENDER_ORDER) && Number.isFinite(BODY_RENDER_ORDER));
  assert.ok(DUST_RENDER_ORDER < BODY_RENDER_ORDER, 'a Body drawn after Dust that wrote no depth always wins');
});

// --- The model reads positions and nothing else, structurally ----------------

/**
 * What `dust-model.ts` may not do, as a pure function over its source.
 *
 * It may import `./scene-model.ts` and nothing else, may not reach randomness or a
 * clock, and may not read an authored field or name a Mote or a Skill.
 */
function auditDustModel(source: string): string[] {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (match) => ' '.repeat(match.length));
  const failures: string[] = [];

  for (const match of code.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\brequire\s*\(/g)) {
    const specifier = match[1];
    if (specifier !== './scene-model.ts') {
      failures.push(`imports ${specifier ?? 'through require'} — Dust reads the scene model and nothing else`);
    }
  }
  // Any dynamic import, whatever the specifier's quoting — a template literal passed a
  // pattern that only knew ' and ".
  if (/\bimport\s*\(/.test(code)) failures.push('imports dynamically — the model reaches nothing at runtime');
  if (/^\s*import\s+['"]/m.test(code)) failures.push('has a side-effect import');
  if (/Math\s*\.\s*random|\bcrypto\b|getRandomValues|\bDate\s*[.(]|new\s+Date\b|\bperformance\s*\./.test(code)) {
    failures.push('reaches randomness or a clock — the scatter must be seeded');
  }
  if (/\bcontent\b|\bskills?\b|\bSkills?\b|\bnotable\b|\bduration\b|\bweight\b|\bteam_size\b/.test(code)) {
    failures.push('reads an authored field — Dust is computed from Body positions only');
  }
  if (/\bmotes?\b|\bMotes?\b/.test(code)) failures.push('names a Mote — 2.8 owns Motes');
  if (/\bmoteTier\b|\bluminanceBand\b|\bmass\b|\bisDeep\b/.test(code)) {
    failures.push('reads a resolved visual property — Dust depends on position and kind only');
  }
  if (/\bwindow\b|\bdocument\b|\buseFrame\b/.test(code)) failures.push('touches the DOM or animates');
  return failures;
}

test('the Dust model imports only the scene model and reads nothing but positions and kind', () => {
  assert.deepEqual(auditDustModel(readFileSync(DUST_TS, 'utf8')), []);
});

test('the Dust-model audit rejects each form it names', () => {
  for (const form of [
    "import { thing } from 'three';",
    "import { CareerSchema } from '../data/schema.ts';",
    "import type { Artifact } from '../derive/artifact-schema.ts';",
    "const m = await import('./scene.tsx');",
    "const fs = require('node:fs');",
    'const x = Math.random();',
    'const seed = Date.now();',
    'const m = await import(`./${name}.ts`);',
    'const m = await import(`./scene-model.ts`);',
    'crypto.getRandomValues(bytes);',
    'const seed = globalThis.crypto.randomUUID();',
    'const stamp = Date();',
    'const t = performance.timeOrigin;',
    'const t = performance.now();',
    'const tags = body.content.skills;',
    'for (const skill of skills) {}',
    'const motes = [];',
    'const dense = body.moteTier === "mote-dense";',
    'const heavy = body.mass > 3;',
    'const w = window.innerWidth;',
  ]) {
    assert.notDeepEqual(auditDustModel(form), [], `${form} must be rejected`);
  }

  for (const form of [
    "import { BODY_MARGIN, type Body } from './scene-model.ts';",
    "const stars = bodies.filter((body) => body.kind === 'star');",
    'const random = mulberry32(DUST_SEED);',
    '// Math.random is banned here, and a comment saying so is not a use.',
  ]) {
    assert.deepEqual(auditDustModel(form), [], `${form} is permitted and must pass`);
  }
});
