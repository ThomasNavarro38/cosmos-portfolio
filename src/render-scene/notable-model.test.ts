/**
 * The Deep/Shallow signal (3.3), executed: which Bodies carry a Ring and a Moon,
 * their geometry, colour and weight, the Moon's pixel floor through a real
 * `three` camera, the handle write over fakes — and the signal's invariance: over
 * every reachable navigation state of the committed artifact, flipping `isDeep`
 * changes no outline, and changing a Planet's band, mass or the subject changes
 * no mark. Plus the constants pinned to DESIGN.md's text, and a purity audit.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PerspectiveCamera, Vector3 } from 'three';
import { tokens } from '../tokens/tokens.ts';
import { buildRail, railStopCount, type Rail } from './rail-model.ts';
import { DUST_RENDER_ORDER } from './dust-model.ts';
import { BODY_RENDER_ORDER, buildScene, type Body, type SceneArtifact } from './scene-model.ts';
import {
  MOON_ANGLE,
  MOON_MIN_RADIUS_PX,
  MOON_OFFSET_RATIO,
  MOON_RADIUS_RATIO,
  MOON_RENDER_ORDER,
  RING_RADIUS_RATIO,
  applyMoonScale,
  moonScale,
  worldPerPixel,
  notableMoons,
  notableRings,
} from './notable-model.ts';
import {
  CIRCLE_SEGMENTS,
  PLANET_RADIUS,
  RESTING_STEPS,
  bodyRadius,
  bodyStroke,
  sceneSubject,
  strokeWidthPx,
  type SubjectState,
} from './stroke-model.ts';

const MODEL_TS = fileURLToPath(new URL('./notable-model.ts', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));
const DESIGN_MD = fileURLToPath(
  new URL('../../_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md', import.meta.url),
);

function committed(): { bodies: readonly Body[]; rail: Rail } {
  const artifact = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as SceneArtifact;
  const { bodies } = buildScene(artifact);
  return { bodies, rail: buildRail(artifact, bodies) };
}

const star = (id: string, overrides: Partial<Body> = {}): Body => ({ id, kind: 'star', position: { x: 0, y: 0, z: 0 }, ...overrides });
const planet = (id: string, isDeep: boolean, overrides: Partial<Body> = {}): Body => ({
  id,
  kind: 'planet',
  position: { x: 10, y: 0, z: 0 },
  mass: 2,
  luminanceBand: 'stroke-rest',
  moteTier: 'mote-sparse',
  isDeep,
  clientId: 'client:a',
  orbitNormal: { x: 0, y: 0, z: 1 },
  ...overrides,
});

const close = (a: number, b: number, epsilon = 1e-9) => Math.abs(a - b) < epsilon;

// --- Constants, pinned to DESIGN.md -----------------------------------------------

/** One `components.<name>` block of DESIGN.md's frontmatter, as `key: value` text pairs. */
function designComponent(name: string): Record<string, string> {
  const text = readFileSync(DESIGN_MD, 'utf8').replace(/\r\n/g, '\n');
  const block = new RegExp(`\\n  ${name}:\\n((?:    [^\\n]*\\n)+)`).exec(text)?.[1] ?? '';
  return Object.fromEntries(
    [...block.matchAll(/^    ([\w-]+):\s*(.+?)\s*$/gm)].map((match) => [match[1] ?? '', (match[2] ?? '').replace(/^"|"$/g, '')]),
  );
}

test('the Ring and the Moon constants are DESIGN.md’s values', () => {
  const ring = designComponent('ring-notable');
  const moon = designComponent('moon-notable');
  assert.equal(Number(ring.radiusRatio), RING_RADIUS_RATIO);
  assert.equal(ring.stroke, '{colors.stroke-near-dark}');
  assert.equal(ring.strokeWidth, '{components.stroke-weight.hairline}');
  assert.equal(ring.dash, 'none');
  assert.equal(Number(moon.radiusRatio), MOON_RADIUS_RATIO);
  assert.equal(moon.minRadius, `${MOON_MIN_RADIUS_PX}px`);
  assert.equal(Number(moon.orbitOffsetRatio), MOON_OFFSET_RATIO);
  assert.equal(moon.fill, '{colors.stroke-active-dark}');
  assert.deepEqual([RING_RADIUS_RATIO, MOON_RADIUS_RATIO, MOON_MIN_RADIUS_PX, MOON_OFFSET_RATIO], [2.2, 0.27, 2.4, 2]);
  assert.equal(MOON_ANGLE, Math.PI / 12, 'up-right, as in the direction-03 mock');
});

// --- The I/O matrix ---------------------------------------------------------------

test('a Deep Planet carries one Ring at 2.2 × r in stroke-near, 0.7px', () => {
  // The literals below are the spec's I/O matrix at r = 0.45; a radius change must
  // fail here, at the assumption, rather than as a puzzling geometry mismatch.
  assert.equal(PLANET_RADIUS, 0.45);
  const deep = planet('project:a', true);
  const rings = notableRings(deep);
  assert.equal(rings.length, 1);
  const [ring] = rings;
  assert.ok(ring !== undefined);
  assert.equal(ring.id, 'ring:project:a');
  assert.equal(ring.color, tokens.colors['stroke-near-dark']);
  assert.equal(ring.widthPx, 0.7);
  assert.equal(ring.widthPx, strokeWidthPx('hairline'));
  assert.equal(ring.points.length, CIRCLE_SEGMENTS + 1);
  assert.deepEqual(ring.points[0], ring.points[CIRCLE_SEGMENTS], 'closed');
  for (const point of ring.points) {
    assert.ok(close(Math.hypot(point[0], point[1]), 0.99), 'every vertex at 2.2 × 0.45 = 0.99');
    assert.equal(point[2], 0, 'concentric, in the billboard’s own plane');
  }
});

test('a Deep Planet carries one Moon of r 0.1215 in stroke-active, centred 0.9 out, up-right', () => {
  assert.equal(PLANET_RADIUS, 0.45, 'the matrix literals below assume r = 0.45');
  const deep = planet('project:a', true);
  const moons = notableMoons([deep]);
  assert.equal(moons.length, 1);
  const [moon] = moons;
  assert.ok(moon !== undefined);
  assert.equal(moon.id, 'moon:project:a');
  assert.equal(moon.bodyId, 'project:a');
  assert.deepEqual(moon.position, deep.position, 'the billboard sits on the Planet');
  assert.ok(close(moon.radius, 0.1215));
  assert.equal(moon.color, tokens.colors['stroke-active-dark']);
  assert.ok(close(Math.hypot(moon.center[0], moon.center[1]), 0.9), '2 × 0.45 from the Planet’s centre');
  assert.equal(moon.center[2], 0);
  assert.ok(moon.center[0] > 0 && moon.center[1] > 0, 'up-right');
  assert.ok(close(Math.atan2(moon.center[1], moon.center[0]), MOON_ANGLE));
});

test('the Moon’s disc straddles the Ring, so the two read as one layered mark', () => {
  // Along the Moon's direction its disc spans offset ± radius; the Ring must run
  // through it. A floor scale only grows the disc about the same centre, so the
  // unscaled Moon is the tightest case.
  const deep = planet('project:a', true);
  const [moon] = notableMoons([deep]);
  const [ring] = notableRings(deep);
  assert.ok(moon !== undefined && ring !== undefined);
  const offset = Math.hypot(moon.center[0], moon.center[1]);
  const ringRadius = Math.hypot(ring.points[0]?.[0] ?? 0, ring.points[0]?.[1] ?? 0);
  assert.ok(offset - moon.radius < ringRadius, 'the Ring is outside the Moon’s inner edge');
  assert.ok(ringRadius < offset + moon.radius, 'the Ring is inside the Moon’s outer edge');
  assert.ok(MOON_OFFSET_RATIO - MOON_RADIUS_RATIO < RING_RADIUS_RATIO && RING_RADIUS_RATIO < MOON_OFFSET_RATIO + MOON_RADIUS_RATIO);
});

test('a Shallow Planet carries neither, and its outline is the Deep one’s', () => {
  const shallow = planet('project:a', false);
  assert.deepEqual(notableRings(shallow), []);
  assert.deepEqual(notableMoons([shallow]), []);
  const deep = planet('project:a', true);
  for (const subject of [null, 'project:a', 'client:a', 'project:b']) {
    assert.deepEqual(bodyStroke(shallow, subject), bodyStroke(deep, subject));
  }
  assert.equal(bodyRadius(shallow), bodyRadius(deep));
});

test('a Star carries neither, whatever it is handed', () => {
  assert.deepEqual(notableRings(star('client:a')), []);
  assert.deepEqual(notableMoons([star('client:a')]), []);
  // A Star with a stray `isDeep` is still a Star: only a Planet is ever marked.
  assert.deepEqual(notableRings(star('client:a', { isDeep: true })), []);
  assert.deepEqual(notableMoons([star('client:a', { isDeep: true })]), []);
});

test('only isDeep === true marks: a missing or non-boolean depth is Shallow', () => {
  const { isDeep: _depth, ...depthless } = planet('project:a', true);
  assert.deepEqual(notableRings(depthless), []);
  assert.deepEqual(notableMoons([depthless]), []);
  // A truthy or nullish non-boolean is not `true`: the artifact's boolean decides.
  for (const depth of ['true', 1, null]) {
    const odd = { ...planet('project:a', true), isDeep: depth as unknown as boolean };
    assert.deepEqual(notableRings(odd), [], `isDeep ${JSON.stringify(depth)} draws no Ring`);
    assert.deepEqual(notableMoons([odd]), [], `isDeep ${JSON.stringify(depth)} draws no Moon`);
  }
});

test('the Moon draws over its coplanar Ring, and both after the Dust', () => {
  // One shared order would leave the overlap to three's depth sort, which flips as
  // the camera moves; the Ring is drawn at BODY_RENDER_ORDER (body-field.tsx).
  assert.equal(MOON_RENDER_ORDER, BODY_RENDER_ORDER + 1);
  assert.ok(MOON_RENDER_ORDER > BODY_RENDER_ORDER, 'over the Ring');
  assert.ok(MOON_RENDER_ORDER > DUST_RENDER_ORDER, 'after the Dust');
});

test('every Deep Planet in a system carries both marks at once, in the Bodies’ order', () => {
  const bodies = [
    star('client:a'),
    planet('project:a', true),
    planet('project:b', false),
    planet('project:c', true, { position: { x: -4, y: 2, z: 1 } }),
  ];
  assert.deepEqual(notableMoons(bodies).map((moon) => moon.bodyId), ['project:a', 'project:c']);
  assert.deepEqual(bodies.map((body) => notableRings(body).length), [0, 1, 0, 1]);
  assert.deepEqual(notableMoons(bodies)[1]?.position, { x: -4, y: 2, z: 1 });
});

// --- The Moon's pixel floor, through a real camera --------------------------------

/** A real camera at `distance` on `+z` looking at the origin, its matrices updated. */
function cameraAt(distance: number, fov = 50): PerspectiveCamera {
  const camera = new PerspectiveCamera(fov, 16 / 9, 0.1, 1000);
  camera.position.set(0, 0, distance);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

/** A world radius at the origin, in CSS pixels on a canvas `heightPx` tall, through three's own projection. */
function radiusPx(camera: PerspectiveCamera, radius: number, heightPx: number): number {
  const centre = new Vector3(0, 0, 0).project(camera);
  const edge = new Vector3(0, radius, 0).project(camera);
  return ((edge.y - centre.y) / 2) * heightPx;
}

const moonAtOrigin = () => {
  const moon = notableMoons([planet('project:a', true, { position: { x: 0, y: 0, z: 0 } })])[0];
  assert.ok(moon !== undefined);
  return moon;
};

test('near: at depth 15, P5 = 1/tan 25°, 800px tall, the Moon is ≈ 6.9px and unscaled', () => {
  const camera = cameraAt(15);
  assert.ok(close(camera.projectionMatrix.elements[5] ?? 0, 1 / Math.tan((25 * Math.PI) / 180)));
  const moon = moonAtOrigin();
  const px = radiusPx(camera, moon.radius, 800);
  assert.ok(px > 6.8 && px < 7, `the Moon is ${px}px`);
  assert.equal(moonScale(moon, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, 800), 1);
});

test('far or short: the scaled Moon is exactly 2.4px on screen, through three’s projection', () => {
  const moon = moonAtOrigin();
  for (const [distance, height] of [
    [200, 800],
    [15, 100],
    [60, 240],
    [500, 1080],
  ] as const) {
    const camera = cameraAt(distance);
    const scale = moonScale(moon, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, height);
    assert.ok(radiusPx(camera, moon.radius, height) < MOON_MIN_RADIUS_PX, `the unscaled Moon is under the floor at ${distance}, ${height}`);
    assert.ok(scale > 1, `scaled up at ${distance}, ${height}`);
    assert.ok(close(radiusPx(camera, moon.radius * scale, height), MOON_MIN_RADIUS_PX, 1e-6), `2.4px at ${distance}, ${height}`);
  }
});

test('the floor follows the Planet’s own view depth, off-axis and from a turned camera', () => {
  const camera = new PerspectiveCamera(40, 1, 0.1, 5000);
  camera.position.set(30, -20, 400);
  camera.lookAt(new Vector3(5, 3, -10));
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const position = { x: 12, y: -7, z: -40 };
  const moon = notableMoons([planet('project:a', true, { position })])[0];
  assert.ok(moon !== undefined);
  const scale = moonScale(moon, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, 600);
  const depth = -new Vector3(position.x, position.y, position.z).applyMatrix4(camera.matrixWorldInverse).z;
  const expected = (MOON_MIN_RADIUS_PX * ((2 * depth) / ((camera.projectionMatrix.elements[5] ?? 0) * 600))) / moon.radius;
  assert.ok(expected > 1, 'the fixture is under the floor');
  assert.ok(close(scale, expected));
});

test('worldPerPixel: one CSS pixel at a point’s view depth, null when it cannot be measured', () => {
  const camera = cameraAt(200);
  const v = camera.matrixWorldInverse.elements;
  const p = camera.projectionMatrix.elements;
  const perPixel = worldPerPixel({ x: 0, y: 0, z: 0 }, v, p, 800);
  assert.ok(perPixel !== null);
  assert.ok(close(perPixel, (2 * 200) / ((p[5] ?? 0) * 800)));
  // moonScale is that number against the floor, unchanged by the extraction.
  const moon = moonAtOrigin();
  assert.ok(close(moonScale(moon, v, p, 800), (MOON_MIN_RADIUS_PX * perPixel) / moon.radius));
  assert.equal(worldPerPixel({ x: 0, y: 0, z: 0 }, v, p, 0), null, 'a collapsed canvas');
  assert.equal(worldPerPixel({ x: 0, y: 0, z: 0 }, v, p, Number.NaN), null, 'a non-finite height');
  assert.equal(worldPerPixel({ x: Number.NaN, y: 0, z: 0 }, v, p, 800), null, 'a non-finite point');
  assert.equal(worldPerPixel({ x: 0, y: 0, z: 400 }, v, p, 800), null, 'behind the camera');
});

test('behind the camera, at it, or on any non-finite input, the Moon is drawn at scale 1', () => {
  const moon = moonAtOrigin();
  const behind = cameraAt(-15);
  behind.lookAt(new Vector3(0, 0, -100));
  behind.updateMatrixWorld();
  const view = behind.matrixWorldInverse.elements;
  const projection = behind.projectionMatrix.elements;
  assert.ok(new Vector3(0, 0, 0).applyMatrix4(behind.matrixWorldInverse).z > 0, 'the Planet is behind this camera');
  assert.equal(moonScale(moon, view, projection, 800), 1, 'depth < 0');
  const at = cameraAt(0.000001);
  const onPlane = Array.from(at.matrixWorldInverse.elements);
  onPlane[14] = 0;
  assert.equal(moonScale(moon, onPlane, at.projectionMatrix.elements, 800), 1, 'depth 0');

  const far = cameraAt(500);
  const v = far.matrixWorldInverse.elements;
  const p = far.projectionMatrix.elements;
  assert.ok(moonScale(moon, v, p, 800) > 1, 'the control scales');
  const poisoned = (elements: ArrayLike<number>, index: number, value: number) => {
    const copy = Array.from(elements);
    copy[index] = value;
    return copy;
  };
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.equal(moonScale(moon, poisoned(v, 14, value), p, 800), 1, `view ${value}`);
    assert.equal(moonScale(moon, v, poisoned(p, 5, value), 800), 1, `projection ${value}`);
    assert.equal(moonScale(moon, v, p, value), 1, `height ${value}`);
    assert.equal(moonScale({ ...moon, position: { x: value, y: 0, z: 0 } }, v, p, 800), 1, `position ${value}`);
    assert.equal(moonScale({ ...moon, radius: value }, v, p, 800), 1, `radius ${value}`);
  }
  assert.equal(moonScale(moon, v, p, 0), 1, 'a collapsed canvas');
  assert.equal(moonScale(moon, v, poisoned(p, 5, 0), 800), 1, 'a degenerate projection');
  assert.equal(moonScale({ ...moon, radius: 0 }, v, p, 800), 1, 'a zero radius');
  assert.equal(moonScale(moon, [], [], 800), 1, 'empty matrices');
});

test('applyMoonScale writes the scale onto a mounted mesh and skips one not mounted', () => {
  const calls: number[] = [];
  const mesh = { scale: { setScalar: (s: number) => calls.push(s) } };
  applyMoonScale(mesh, 3.5);
  applyMoonScale(mesh, 1);
  assert.deepEqual(calls, [3.5, 1]);
  assert.doesNotThrow(() => applyMoonScale(null, 2));
  assert.doesNotThrow(() => applyMoonScale(undefined, 2));
});

// --- The committed artifact -------------------------------------------------------

test('on the committed artifact, exactly the isDeep Planets carry one Ring and one Moon', () => {
  const { bodies } = committed();
  const deep = bodies.filter((body) => body.kind === 'planet' && body.isDeep === true).map((body) => body.id);
  const shallow = bodies.filter((body) => body.kind === 'planet' && body.isDeep !== true);
  assert.ok(deep.length > 0, 'the committed artifact holds a Deep Project, or this is vacuous');
  assert.ok(shallow.length > 0, 'and a Shallow one');
  assert.deepEqual(notableMoons(bodies).map((moon) => moon.bodyId), deep);
  for (const body of bodies) {
    assert.equal(notableRings(body).length, deep.includes(body.id) ? 1 : 0, `${body.id}'s Ring`);
  }
});

test('over every reachable subject, flipping isDeep changes no outline, and band, mass or subject change no mark', () => {
  const { bodies, rail } = committed();
  const stops = railStopCount(rail);
  const clients = bodies.filter((body) => body.kind === 'star').map((body) => body.id);
  const planets = bodies.filter((body) => body.kind === 'planet');
  const base: SubjectState = { mode: 'rail', flightTarget: null, scrollProgress: 0, focusedProjectId: null };
  const subjects = new Set<string | null>();
  for (const focusedProjectId of [null, ...planets.map((body) => body.id)]) {
    for (let i = 0; i <= stops * 10; i += 1) subjects.add(sceneSubject({ ...base, scrollProgress: i / 10, focusedProjectId }, rail));
    for (const flightTarget of [null, ...clients]) subjects.add(sceneSubject({ ...base, mode: 'freeflight', flightTarget, focusedProjectId }, rail));
  }
  assert.ok(subjects.size > 2, 'the walk reaches several subjects');

  for (const body of planets) {
    const flipped: Body = { ...body, isDeep: body.isDeep !== true };
    assert.equal(bodyRadius(flipped), bodyRadius(body));
    assert.equal(bodyRadius(body), PLANET_RADIUS);
    for (const subject of subjects) {
      assert.deepEqual(bodyStroke(flipped, subject), bodyStroke(body, subject), `${body.id}'s outline at ${String(subject)}`);
    }
    const rings = notableRings(body);
    const moons = notableMoons([body]);
    for (const luminanceBand of RESTING_STEPS) {
      for (const mass of [0.1, 1, 7, 40]) {
        const varied: Body = { ...body, luminanceBand, mass };
        assert.deepEqual(notableRings(varied), rings, `${body.id}'s Ring at ${luminanceBand}, mass ${mass}`);
        assert.deepEqual(notableMoons([varied]), moons, `${body.id}'s Moon at ${luminanceBand}, mass ${mass}`);
      }
    }
  }
  // The subject cannot reach a mark: neither builder takes one, and the floor is
  // the camera's alone.
  assert.equal(notableRings.length, 1);
  assert.equal(notableMoons.length, 1);
  assert.equal(moonScale.length, 4);
});

// --- Purity -----------------------------------------------------------------------

/** The model's imports, globals and reads, as a pure function over its source. */
function auditNotableModel(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const failures: string[] = [];
  const allowed = new Set(['./stroke-model.ts', './scene-model.ts']);
  for (const match of code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (!allowed.has(match[1] ?? '')) failures.push(`imports ${match[1]} — the stroke and scene models only`);
  }
  if (/\brequire\s*\(/.test(code)) failures.push('requires a module');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b/.test(code)) failures.push('reads a DOM global');
  if (/new\s+Date\b|Date\s*\.\s*now|Math\s*\.\s*random/.test(code)) failures.push('reads a clock or randomness');
  if (/\bnavigationStore\b|\bgetState\b|\bsubscribe\b|\bsubject\w*\b|\bsceneSubject\b/i.test(code)) {
    failures.push('reads the navigation state or the subject — a mark is at rest and always');
  }
  const bare = code.replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, "''");
  if (/\bcontent\b|\.notable\b|\bduration\b|\bskills\b/.test(bare)) failures.push('reads an authored field — isDeep is the classification');
  if (/\bluminanceBand\b|\bmass\b|\bmoteTier\b|\bbodyStroke\b/.test(bare)) {
    failures.push('reads band, mass, tier or the outline — the signal is never size or brightness');
  }
  if (/\.sort\s*\(/.test(code)) failures.push('sorts');
  return failures;
}

test('the notable model imports the stroke and scene models only, and reads isDeep and nothing else', () => {
  assert.deepEqual(auditNotableModel(readFileSync(MODEL_TS, 'utf8')), []);
});

test('the notable model audit rejects each form it names', () => {
  for (const form of [
    "import { Vector3 } from 'three';",
    "import { tokens } from '../tokens/tokens.ts';",
    "import { navigationStore } from '../shell/state.ts';",
    "import { RESTING_BANDS } from '../derive/rules.ts';",
    'const w = window.innerWidth;',
    'const s = navigationStore.getState();',
    'export function notableRings(body: Body, subjectId: string | null) {}',
    'const deep = body.content.notable !== null;',
    'const deep = project.notable !== undefined;',
    "const bright = body.luminanceBand === 'stroke-near';",
    'const big = body.mass > 3;',
    'const stroke = bodyStroke(body, null).color;',
    'const ids = bodies.sort();',
  ]) {
    assert.notDeepEqual(auditNotableModel(form), [], `${form} must be rejected`);
  }
  assert.deepEqual(auditNotableModel("import { bodyRadius } from './stroke-model.ts';\nconst deep = body.isDeep === true;"), []);
});
