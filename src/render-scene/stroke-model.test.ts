/**
 * The stroke ladder on the scene (3.2), executed: the weight parser, the one
 * white subject per frame, every Body's resting and subject stroke, the circle,
 * orbit and Rail geometry, and the vignette — over in-memory fixtures and over
 * the committed artifact, through every reachable navigation state.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { tokens } from '../tokens/tokens.ts';
import { RAIL_LINE_SAMPLES_PER_SEGMENT, buildRail, railLine, railStopCount, type Rail } from './rail-model.ts';
import { buildScene, type Body, type SceneArtifact } from './scene-model.ts';
import {
  CIRCLE_SEGMENTS,
  CORE_RADIUS_RATIO,
  ORBIT_PLANE_TOLERANCE,
  ORBIT_SEGMENTS,
  PLANET_RADIUS,
  RESTING_STEPS,
  STAR_RADIUS,
  STROKE_STEPS,
  bodyRadius,
  bodyStroke,
  circlePoints,
  coreDots,
  orbitPoints,
  sceneLines,
  sceneSubject,
  strokeColor,
  strokeWidthPx,
  vignetteStyle,
  type StrokeWeightKey,
  type SubjectState,
} from './stroke-model.ts';

const MODEL_TS = fileURLToPath(new URL('./stroke-model.ts', import.meta.url));
const SCHEMA_TS = fileURLToPath(new URL('../derive/artifact-schema.ts', import.meta.url));
const RULES_TS = fileURLToPath(new URL('../derive/rules.ts', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));

function committed(): { artifact: SceneArtifact; bodies: readonly Body[]; rail: Rail } {
  const artifact = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as SceneArtifact;
  const { bodies } = buildScene(artifact);
  return { artifact, bodies, rail: buildRail(artifact, bodies) };
}

const RAIL_STATE: SubjectState = { mode: 'rail', flightTarget: null, scrollProgress: 0, focusedProjectId: null };

const star = (id: string): Body => ({ id, kind: 'star', position: { x: 0, y: 0, z: 0 } });
const planet = (id: string, luminanceBand: string, overrides: Partial<Body> = {}): Body => ({
  id,
  kind: 'planet',
  position: { x: 10, y: 0, z: 0 },
  mass: 2,
  luminanceBand,
  moteTier: 'mote-sparse',
  isDeep: false,
  clientId: 'client:a',
  orbitNormal: { x: 0, y: -1, z: 0 },
  ...overrides,
});

const distance = (a: readonly number[], b: readonly number[]): number =>
  Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0));

// --- The weight parser -----------------------------------------------------------

test('every stroke weight token parses to its pixel value', () => {
  assert.equal(strokeWidthPx('hairline'), 0.7);
  assert.equal(strokeWidthPx('hairline-leader'), 0.6);
  assert.equal(strokeWidthPx('body-near'), 0.8);
  assert.equal(strokeWidthPx('body-client'), 0.9);
  assert.equal(strokeWidthPx('body-focus'), 1.0);
  for (const key of Object.keys(tokens.components['stroke-weight'])) {
    const px = strokeWidthPx(key as StrokeWeightKey);
    assert.ok(px >= 0.6 && px <= 1.0, `${key} sits on the 0.6–1.0px ladder`);
  }
});

test('a weight that is not <n>px throws naming the key', () => {
  for (const bad of ['0.7', '0.7em', '', 'px', '-1px', '0px', 'thin', '0.7 px']) {
    assert.throws(
      () => strokeWidthPx('hairline', { hairline: bad }),
      (error: unknown) => error instanceof Error && error.message.includes('"hairline"'),
      `${JSON.stringify(bad)} must be refused by name`,
    );
  }
  // Cast past the key's type: these are the keys the type check exists to stop,
  // and the runtime guard is what holds when one arrives untyped.
  assert.throws(() => strokeWidthPx('absent' as StrokeWeightKey), /"absent"/, 'a missing key is named too');
  assert.throws(() => strokeWidthPx('constructor' as StrokeWeightKey), /"constructor"/, 'and an inherited one is no weight');
});

// --- The subject -------------------------------------------------------------------

test('the opening frame makes the first stop’s Star the subject', () => {
  const { rail } = committed();
  assert.equal(sceneSubject(RAIL_STATE, rail), rail.keyframes[1]?.subject);
});

test('between stops, the subject is the stop the camera is heading for', () => {
  const { rail } = committed();
  assert.ok(railStopCount(rail) >= 3, 'the committed Rail has three stops to step through');
  assert.equal(sceneSubject({ ...RAIL_STATE, scrollProgress: 2.3 }, rail), rail.keyframes[3]?.subject);
  assert.equal(sceneSubject({ ...RAIL_STATE, scrollProgress: 2 }, rail), rail.keyframes[2]?.subject, 'at a stop, that stop');
  assert.equal(sceneSubject({ ...RAIL_STATE, scrollProgress: 0.01 }, rail), rail.keyframes[1]?.subject);
});

test('progress past either end, or not a number, clamps to a real stop', () => {
  const { rail } = committed();
  const stops = railStopCount(rail);
  assert.equal(sceneSubject({ ...RAIL_STATE, scrollProgress: stops + 5 }, rail), rail.keyframes[stops]?.subject);
  assert.equal(sceneSubject({ ...RAIL_STATE, scrollProgress: -3 }, rail), rail.keyframes[1]?.subject);
  assert.equal(sceneSubject({ ...RAIL_STATE, scrollProgress: Number.NaN }, rail), rail.keyframes[1]?.subject);
});

test('a focused Planet is the subject in any mode, and no Star is', () => {
  const { rail, bodies } = committed();
  const focused = bodies.find((body) => body.kind === 'planet');
  assert.ok(focused !== undefined);
  for (const mode of ['rail', 'freeflight'] as const) {
    const subject = sceneSubject({ ...RAIL_STATE, mode, flightTarget: 'x', focusedProjectId: focused.id }, rail);
    assert.equal(subject, focused.id);
  }
});

test('free flight makes its target the subject, and the overview has none', () => {
  const { rail } = committed();
  const target = rail.keyframes[2]?.subject ?? null;
  assert.equal(sceneSubject({ ...RAIL_STATE, mode: 'freeflight', flightTarget: target }, rail), target);
  assert.equal(sceneSubject({ ...RAIL_STATE, mode: 'freeflight', flightTarget: null }, rail), null);
});

test('a Rail with no stops has no subject', () => {
  const empty: Rail = { keyframes: committed().rail.keyframes.slice(0, 1) };
  assert.equal(sceneSubject(RAIL_STATE, empty), null);
});

// --- Body strokes -------------------------------------------------------------------

test('the subject Star is stroke-focus at 0.9px, the subject Planet at 1.0px', () => {
  assert.deepEqual(bodyStroke(star('client:a'), 'client:a'), {
    step: 'stroke-focus',
    color: tokens.colors['stroke-focus-dark'],
    widthPx: 0.9,
  });
  assert.deepEqual(bodyStroke(planet('project:a', 'stroke-dust'), 'project:a'), {
    step: 'stroke-focus',
    color: tokens.colors['stroke-focus-dark'],
    widthPx: 1.0,
  });
});

test('a Star at rest is stroke-rest, a Planet at rest its own band, both on the hairline', () => {
  assert.deepEqual(bodyStroke(star('client:a'), null), {
    step: 'stroke-rest',
    color: tokens.colors['stroke-rest-dark'],
    widthPx: 0.7,
  });
  for (const band of RESTING_STEPS) {
    assert.deepEqual(bodyStroke(planet('project:a', band), 'client:a'), {
      step: band,
      color: strokeColor(band),
      widthPx: 0.7,
    });
  }
});

test('a recent Shallow Planet at stroke-near stays there — never stroke-focus unfocused', () => {
  const recent = planet('project:a', 'stroke-near', { isDeep: false });
  assert.equal(bodyStroke(recent, null).step, 'stroke-near');
  assert.equal(bodyStroke(recent, 'client:a').step, 'stroke-near');
  assert.equal(bodyStroke(recent, 'project:b').step, 'stroke-near');
});

test('a Planet whose band is not a resting step throws naming it', () => {
  for (const band of ['stroke-active', 'stroke-focus', 'stroke-far', '']) {
    assert.throws(() => bodyStroke(planet('project:a', band), null), /project:a/, `${band} is not a resting band`);
  }
  const { luminanceBand: _band, ...bandless } = planet('project:a', 'stroke-near');
  assert.throws(() => bodyStroke(bandless, null), /project:a/);
});

test('every stroke colour is the dark value of its own stroke token', () => {
  for (const step of STROKE_STEPS) assert.equal(strokeColor(step), tokens.colors[`${step}-dark`]);
});

test('over every reachable navigation state, at most one Body is white and no unfocused Body exceeds stroke-near', () => {
  // The AC, executed over the committed artifact: every Rail progress on a fine
  // grid, every free-flight target and the overview, each with nothing focused and
  // with every Planet focused in turn.
  const { bodies, rail } = committed();
  const stops = railStopCount(rail);
  const clients = bodies.filter((body) => body.kind === 'star').map((body) => body.id);
  const focuses = [null, ...bodies.filter((body) => body.kind === 'planet').map((body) => body.id)];
  const states: SubjectState[] = [];
  for (const focusedProjectId of focuses) {
    for (let i = 0; i <= stops * 20; i += 1) {
      states.push({ ...RAIL_STATE, scrollProgress: i / 20, focusedProjectId });
    }
    for (const flightTarget of [null, ...clients]) {
      states.push({ ...RAIL_STATE, mode: 'freeflight', flightTarget, focusedProjectId });
    }
  }
  const resting = new Set<string>(RESTING_STEPS);
  for (const state of states) {
    const subject = sceneSubject(state, rail);
    const strokes = bodies.map((body) => ({ body, stroke: bodyStroke(body, subject) }));
    const white = strokes.filter(({ stroke }) => stroke.step === 'stroke-focus');
    assert.ok(white.length <= 1, `two Bodies white at ${JSON.stringify(state)}`);
    for (const { body, stroke } of strokes) {
      if (body.id === state.focusedProjectId) continue;
      if (body.id !== subject) assert.ok(resting.has(stroke.step), `${body.id} exceeds stroke-near at rest`);
      assert.notEqual(stroke.step, 'stroke-active', 'stroke-active is never a Body’s at 3.2');
    }
    if (state.focusedProjectId !== null) {
      assert.deepEqual(white.map(({ body }) => body.id), [state.focusedProjectId], 'the focused Planet alone is white');
    }
  }
  // And the Rail with nothing focused always has exactly one white Star.
  for (let i = 0; i <= stops * 20; i += 1) {
    const subject = sceneSubject({ ...RAIL_STATE, scrollProgress: i / 20 }, rail);
    const white = bodies.filter((body) => bodyStroke(body, subject).step === 'stroke-focus');
    assert.equal(white.length, 1);
    assert.equal(white[0]?.kind, 'star');
  }
});

// --- Geometry ----------------------------------------------------------------------

test('a Body outline is a closed true circle of its radius', () => {
  const points = circlePoints(CIRCLE_SEGMENTS, 2);
  assert.equal(points.length, CIRCLE_SEGMENTS + 1);
  assert.deepEqual(points[0], points[CIRCLE_SEGMENTS], 'closed');
  for (const point of points) {
    assert.ok(Math.abs(Math.hypot(point[0], point[1]) - 2) < 1e-12, 'every vertex on the radius');
    assert.equal(point[2], 0, 'in the billboard’s own plane');
  }
  for (const bad of [0, 2, 3.5, Number.NaN]) assert.throws(() => circlePoints(bad), /segments/);
});

test('the radius is a Star’s or a Planet’s, by kind', () => {
  assert.equal(bodyRadius(star('client:a')), STAR_RADIUS);
  assert.equal(bodyRadius(planet('project:a', 'stroke-rest')), PLANET_RADIUS);
  const { mass: _mass, ...massless } = planet('project:a', 'stroke-rest');
  assert.equal(bodyRadius(massless), PLANET_RADIUS, 'a Planet without mass is still Planet-sized');
});

test('a Star carries one core dot at 15% of its radius in its outline’s colour; a Planet none', () => {
  assert.deepEqual(coreDots(star('client:a'), 'client:a'), [
    { id: 'core:client:a', radius: STAR_RADIUS * CORE_RADIUS_RATIO, color: tokens.colors['stroke-focus-dark'] },
  ]);
  assert.deepEqual(coreDots(star('client:a'), null), [
    { id: 'core:client:a', radius: STAR_RADIUS * CORE_RADIUS_RATIO, color: tokens.colors['stroke-rest-dark'] },
  ]);
  assert.equal(CORE_RADIUS_RATIO, 0.15);
  assert.deepEqual(coreDots(planet('project:a', 'stroke-near'), 'project:a'), []);
});

test('every committed orbit passes through its Planet, centred on its Star, in the solved plane', () => {
  const { bodies } = committed();
  const planets = bodies.filter((body) => body.kind === 'planet');
  assert.ok(planets.length > 0);
  for (const body of planets) {
    const own = bodies.find((candidate) => candidate.kind === 'star' && candidate.id === body.clientId);
    assert.ok(own !== undefined);
    const normal = body.orbitNormal;
    assert.ok(normal !== undefined);
    const points = orbitPoints(body, own, ORBIT_SEGMENTS);
    const centre = [own.position.x, own.position.y, own.position.z];
    const at = [body.position.x, body.position.y, body.position.z];
    const radius = distance(at, centre);
    assert.equal(points.length, ORBIT_SEGMENTS + 1);
    assert.ok(distance(points[0] ?? [], at) < 1e-9, `${body.id}'s orbit starts at the Planet`);
    for (const point of points) {
      assert.ok(Math.abs(distance(point, centre) - radius) < 1e-6, 'every vertex on the orbit radius');
      const offset = [point[0] - own.position.x, point[1] - own.position.y, point[2] - own.position.z];
      const dot = ((offset[0] ?? 0) * normal.x + (offset[1] ?? 0) * normal.y + (offset[2] ?? 0) * normal.z) / radius;
      assert.ok(Math.abs(dot) <= ORBIT_PLANE_TOLERANCE, 'every vertex in the solved plane');
    }
  }
});

test('an orbit with no plane, a Planet on its Star, or a plane missing the Planet throws naming it', () => {
  const centre = star('client:a');
  const { orbitNormal: _normal, ...planeless } = planet('project:a', 'stroke-rest');
  assert.throws(() => orbitPoints(planeless, centre, 32), /project:a/);
  assert.throws(() => orbitPoints(planet('project:a', 'stroke-rest', { position: centre.position }), centre, 32), /project:a/);
  assert.throws(
    () => orbitPoints(planet('project:a', 'stroke-rest', { orbitNormal: { x: 1, y: 0, z: 0 } }), centre, 32),
    /project:a/,
    'a normal along the offset cannot be the plane the Planet lies in',
  );
  for (const bad of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN]) {
    for (const axis of ['x', 'y', 'z'] as const) {
      const normal = { x: 0, y: -1, z: 0, [axis]: bad };
      assert.throws(
        () => orbitPoints(planet('project:a', 'stroke-rest', { orbitNormal: normal }), centre, 32),
        /project:a.*non-finite/,
        `a normal with ${axis} = ${String(bad)} must be refused, not drawn as NaN`,
      );
    }
  }
});

test('the orbit-plane tolerance is the gate’s, so what the gate accepts is what the scene draws', () => {
  // Text, not an import: `src/render-scene/` may not import `src/derive/`, the same
  // idiom `rail-model.test.ts` uses on `dwell.ts`.
  const literal = /export const ORBIT_PLANE_TOLERANCE = ([\d.e+-]+);/.exec(readFileSync(SCHEMA_TS, 'utf8'));
  assert.ok(literal !== null, 'the schema declares its tolerance as a literal');
  assert.equal(ORBIT_PLANE_TOLERANCE, Number(literal[1]));
  // Just inside the tolerance is drawn; just past it is refused.
  const centre = star('client:a');
  const tilt = (cosine: number) => ({ x: cosine, y: -Math.sqrt(1 - cosine * cosine), z: 0 });
  assert.doesNotThrow(() =>
    orbitPoints(planet('project:a', 'stroke-rest', { orbitNormal: tilt(ORBIT_PLANE_TOLERANCE * 0.9) }), centre, 32),
  );
  assert.throws(
    () => orbitPoints(planet('project:a', 'stroke-rest', { orbitNormal: tilt(ORBIT_PLANE_TOLERANCE * 1.1) }), centre, 32),
    /project:a/,
  );
});

test('the scene’s resting steps are derive’s resting bands, so every band the gate accepts is one a Planet can be drawn in', () => {
  // Text, not an import, for the same boundary as the tolerance above. A band added
  // to derive alone would pass the gate and then throw in `bodyStroke` at render.
  const literal = /export const RESTING_BANDS = \[([^\]]*)\] as const;/.exec(readFileSync(RULES_TS, 'utf8'));
  assert.ok(literal !== null, 'rules.ts declares its resting bands as a literal list');
  const bands = [...(literal[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.deepEqual([...RESTING_STEPS], bands);
});

test('the scene’s hairlines: one stroke-rest orbit per Planet and the Rail at stroke-dust, all 0.7px', () => {
  const { bodies, rail } = committed();
  const lines = sceneLines(bodies, railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT));
  const planets = bodies.filter((body) => body.kind === 'planet');
  const orbits = lines.filter((line) => line.id.startsWith('orbit:'));
  assert.deepEqual(orbits.map((line) => line.id), planets.map((body) => `orbit:${body.id}`));
  for (const orbit of orbits) {
    assert.equal(orbit.color, tokens.colors['stroke-rest-dark']);
    assert.equal(orbit.widthPx, 0.7);
  }
  const rails = lines.filter((line) => line.id === 'rail');
  assert.equal(rails.length, railStopCount(rail) >= 2 ? 1 : 0);
  for (const line of rails) {
    assert.equal(line.color, tokens.colors['stroke-dust-dark']);
    assert.equal(line.widthPx, 0.7);
  }
  assert.equal(lines.length, orbits.length + rails.length, 'nothing else is drawn as a line');
});

test('a Rail of one stop draws no Rail line', () => {
  // A real one-stop Rail, built the way the scene builds it: the committed artifact
  // with its Rail cut to its last Client.
  const { artifact, bodies } = committed();
  const only = artifact.rail[artifact.rail.length - 1];
  assert.ok(only !== undefined);
  const single = buildRail({ ...artifact, rail: [only] }, bodies);
  assert.equal(railStopCount(single), 1);
  const lines = sceneLines(bodies, railLine(single, RAIL_LINE_SAMPLES_PER_SEGMENT));
  assert.deepEqual(lines.filter((line) => line.id === 'rail'), [], 'one stop is a point, not a Rail');
  assert.equal(lines.length, bodies.filter((body) => body.kind === 'planet').length, 'the orbits are still drawn');
  // And `sceneLines` itself draws no Rail from fewer than two points.
  assert.deepEqual(sceneLines(bodies, []).filter((line) => line.id === 'rail'), []);
  assert.deepEqual(sceneLines(bodies, [{ x: 0, y: 0, z: 0 }]).filter((line) => line.id === 'rail'), []);
});

test('a Planet whose Star is not in the scene throws rather than orbiting nothing', () => {
  assert.throws(() => sceneLines([planet('project:a', 'stroke-rest', { clientId: 'client:gone' })], []), /project:a/);
});

// --- The vignette --------------------------------------------------------------------

test('the vignette is vignette-dark at 0 opacity at 42% rising to 0.9 at the corners, inert to the pointer', () => {
  const style = vignetteStyle();
  const ground = tokens.colors['vignette-dark'];
  assert.equal(
    style.background,
    `radial-gradient(ellipse farthest-corner at 50% 50%, color-mix(in srgb, ${ground} 0%, transparent) 42%, ` +
      `color-mix(in srgb, ${ground} 90%, transparent) 100%)`,
  );
  assert.equal(style.pointerEvents, 'none');
  assert.equal(style.position, 'absolute');
  assert.equal(style.inset, 0);
});

test('the stroke model is written without a literal colour', () => {
  const code = readFileSync(MODEL_TS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(code, /rgba?\(|hsla?\(|#[0-9a-fA-F]{3,8}\b/);
});

// --- Purity ---------------------------------------------------------------------------

/** The model's imports and globals, as a pure function over its source. */
function auditStrokeModel(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const failures: string[] = [];
  const allowed = new Set(['../tokens/tokens.ts', './rail-model.ts', './scene-model.ts']);
  for (const match of code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (!allowed.has(match[1] ?? '')) failures.push(`imports ${match[1]} — tokens, the Rail and the scene model only`);
  }
  if (/\brequire\s*\(/.test(code)) failures.push('requires a module');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b/.test(code)) failures.push('reads a DOM global');
  if (/new\s+Date\b|Date\s*\.\s*now|Math\s*\.\s*random/.test(code)) failures.push('reads a clock or randomness');
  if (/\bnavigationStore\b|\bgetState\b|\bsubscribe\b/.test(code)) failures.push('reads the store — the binding hands the state in');
  // Strings blanked for this one: `'stroke-weight'` is a token group, not `weight`.
  const bare = code.replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, "''");
  if (/\bcontent\b|\bnotable\b|\bduration\b|\bweight\b|\bskills\b/.test(bare)) failures.push('reads an authored field');
  if (/\.sort\s*\(/.test(code)) failures.push('sorts');
  return failures;
}

test('the stroke model imports the tokens, the Rail and the scene model only, and reads no clock, DOM, store or content', () => {
  assert.deepEqual(auditStrokeModel(readFileSync(MODEL_TS, 'utf8')), []);
});

test('the stroke model audit rejects each form it names', () => {
  for (const form of [
    "import { Vector3 } from 'three';",
    "import { navigationStore } from '../shell/state.ts';",
    "import { RESTING_BANDS } from '../derive/rules.ts';",
    'const w = window.innerWidth;',
    'const s = navigationStore.getState();',
    'const deep = body.content.notable !== null;',
    'const ids = bodies.sort();',
  ]) {
    assert.notDeepEqual(auditStrokeModel(form), [], `${form} must be rejected`);
  }
  assert.deepEqual(auditStrokeModel("import { tokens } from '../tokens/tokens.ts';"), []);
});
