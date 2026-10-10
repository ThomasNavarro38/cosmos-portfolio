/**
 * Condensation and decay, executed: the seats and the no-adjacency quota, the
 * sources in visible Dust, the one blend (decay retracing condensation), the
 * whole I/O matrix — rest, enter, release, `A → B` with a shared Skill,
 * interruption, a blocked label re-slotted and gliding (and staying hidden when
 * no slot is free), a duplicate Skill, a zero-width canvas, an unknown ID — and
 * the projection through a real `three` camera, so the labels' NDC is the NDC
 * the screen uses. Plus `applyMoteDraw` over fakes and a purity audit.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PerspectiveCamera, Vector3 } from 'three';
import { FOCUS_SECONDS, easeFocus } from '../shell/focus-motion.ts';
import { motionPace } from '../shell/motion-preference.ts';
import { panelFraction } from '../shell/panel-model.ts';
import { tokens } from '../tokens/tokens.ts';
import { DUST_MEDIUM_PEAK_OPACITY, buildDust, mediumAlphaAt, type DustMedium } from './dust-model.ts';
import { FOCUS_REACH, focusPose } from './focus-model.ts';
import {
  MOTE_DOT_COLORS,
  MOTE_DOT_RADII_PX,
  MOTE_LABEL_CLEARANCE_PX,
  MOTE_LABEL_COLOR,
  MOTE_LABEL_CHAR_PX,
  MOTE_LABEL_FONT_PX,
  MOTE_LABEL_GAP_PX,
  MOTE_LABEL_HEIGHT_PX,
  MOTE_LABEL_LIMIT,
  MOTE_ORBIT_LINE_COLOR,
  MOTE_ORBIT_LINE_WIDTH_PX,
  MOTE_TIERS_BY_ORBIT,
  MOTE_MIN_SCALE,
  MOTE_MIN_SLOTS,
  MOTE_ORBIT_PHASES,
  MOTE_ORBIT_RADII,
  MOTE_ORBIT_RADIANS_PER_SECOND,
  MOTE_ORBIT_TILTS,
  MOTE_RADIUS,
  MOTE_RESLOT_SECONDS,
  MOTE_SOURCE_ALPHA,
  MOTE_SOURCE_SPREAD,
  applyMoteDraw,
  applyMoteOrbitDraw,
  blendMote,
  dustSource,
  labelBox,
  labelChars,
  labelPlacement,
  labelTransform,
  moteAssignment,
  moteDotColor,
  moteDotScale,
  moteFrame,
  moteLabelPass,
  moteLabelStyle,
  moteOrbitLines,
  motePool,
  moteRank,
  moteRanks,
  cssNumber,
  orbitPoint,
  orbitSpin,
  projectNdc,
  projectSkills,
  slotAngle,
  sourceReach,
  stepMotes,
  type LabelBox,
  type LabelCandidate,
  type Mote,
  type MoteArtifact,
  type MoteArtifactSkill,
  type MoteDraw,
  type MoteField,
  type MoteScene,
  type MoteView,
  type NdcPoint,
} from './mote-model.ts';
import { RAIL_MAX_FRAME_SECONDS, buildRail } from './rail-model.ts';
import { DEFAULT_FOV, DEFAULT_NEAR, buildScene, type SceneArtifact, type ScenePosition } from './scene-model.ts';
import { worldPerPixel } from './notable-model.ts';

const MODEL_TS = fileURLToPath(new URL('./mote-model.ts', import.meta.url));
const RULES_TS = fileURLToPath(new URL('../derive/rules.ts', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));

// --- Fixtures ---------------------------------------------------------------

type Artifact = SceneArtifact & MoteArtifact;

function at(x: number, y = 0, z = 0): ScenePosition {
  return { x, y, z };
}

const NINE = ['Java', 'Spring Boot', 'Tomcat', 'Oracle', 'Cloudera', 'MDM', 'technical leadership', 'code review', 'mentoring'];

/** Two Clients; A carries nine Skills, B shares `Java` and `Oracle` with it, and A2 lists `Java` twice. */
function fixture(
  skills: { a?: readonly string[]; b?: readonly string[]; a2?: readonly string[]; a2At?: ScenePosition } = {},
  offset: ScenePosition = at(0),
): Artifact {
  const shifted = (p: ScenePosition): ScenePosition => ({ x: p.x + offset.x, y: p.y + offset.y, z: p.z + offset.z });
  const planet = (id: string, clientId: string, position: ScenePosition, list: readonly string[]) => ({
    id,
    clientId,
    isDeep: true,
    mass: 2,
    luminanceBand: 'stroke-near',
    orbitNormal: { x: 0, y: -1, z: 0 },
    moteTier: 'mote-dense',
    position: shifted(position),
    content: { skills: list },
  });
  const clients = [
    {
      id: 'client:a',
      position: shifted(at(0, 0, 0)),
      projects: [
        planet('project:a/1', 'client:a', at(10, 0, 0), skills.a ?? NINE),
        planet('project:a/2', 'client:a', skills.a2At ?? at(-6, 4, 3), skills.a2 ?? ['Java', 'Java']),
      ],
    },
    {
      id: 'client:b',
      position: shifted(at(30, 2, -3)),
      projects: [planet('project:b/1', 'client:b', at(38, -2, 5), skills.b ?? ['Go', 'Java', 'Kafka', 'Oracle'])],
    },
  ];
  return {
    clients,
    skills: listTiers(clients),
    rail: ['client:a', 'client:b'],
    shots: [
      { subject: 'client:a', angle: Math.PI / 6, distance: 15 },
      { subject: 'client:b', angle: -Math.PI / 8, distance: 20 },
    ],
    dwell: clients.map((entry) => ({ subject: entry.id, tempo: 'dwell-steady' })),
  };
}

/**
 * A greybox Skill list for a fixture: every distinct name in first-appearance
 * order, the `i`-th on tier `i mod 3`. So a Project whose Skills come first in the
 * fixture is seated exactly as list order would seat it — Skill `i` on orbit
 * `i mod 3` at slot `2⌊i/3⌋` — which keeps the blocking fixtures' geometry
 * legible. The real list is ranked by share count in `src/derive/skills.ts`.
 */
function listTiers(clients: readonly { readonly projects: readonly { readonly content: { readonly skills: readonly string[] } }[] }[]): MoteArtifactSkill[] {
  const names = [...new Set(clients.flatMap((client) => client.projects.flatMap((project) => project.content.skills)))];
  return names.map((name, i) => ({ name, tier: MOTE_TIERS_BY_ORBIT[i % 3] ?? 'mote-outer' }));
}

function committed(): Artifact {
  return JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as Artifact;
}

function sceneOf(artifact: Artifact): MoteScene {
  const { bodies } = buildScene(artifact);
  return { artifact, bodies, media: buildDust(bodies).media };
}

const WIDTH = 1600;
const HEIGHT = 900;

/** A real camera at `id`'s focus pose (or the pose given), `width` × `height`. */
function cameraFor(artifact: Artifact, id: string, width = WIDTH, height = HEIGHT): PerspectiveCamera {
  const { bodies } = buildScene(artifact);
  const aspect = width / height;
  const pose = focusPose(buildRail(artifact, bodies), bodies, id, aspect, panelFraction(width));
  const camera = new PerspectiveCamera(DEFAULT_FOV, aspect, DEFAULT_NEAR, 10_000);
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function viewOf(camera: PerspectiveCamera, width = WIDTH, height = HEIGHT): MoteView {
  return { view: camera.matrixWorldInverse.elements, projection: camera.projectionMatrix.elements, width, height };
}

const DT = 1 / 60;
/** Frames from a change until its move has run `FOCUS_SECONDS`: the change frame holds, then these advance. */
const MOVE_FRAMES = Math.ceil(FOCUS_SECONDS / DT);

function run(start: MoteField | null, scene: MoteScene, focused: string | null, frames: number, view: MoteView): MoteField[] {
  const out: MoteField[] = [];
  let field = start;
  for (let i = 0; i < frames; i += 1) {
    field = stepMotes(field, scene, focused, view, DT);
    out.push(field);
  }
  return out;
}

const last = <T>(list: readonly T[]): T => {
  const value = list[list.length - 1];
  assert.ok(value !== undefined);
  return value;
};

const distance = (a: ScenePosition, b: ScenePosition): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function planetAt(scene: MoteScene, id: string): ScenePosition {
  const planet = scene.bodies.find((body) => body.id === id);
  assert.ok(planet !== undefined);
  return planet.position;
}

function mediumFor(scene: MoteScene, clientId: string): DustMedium {
  const medium = scene.media.find((entry) => entry.id === clientId);
  assert.ok(medium !== undefined);
  return medium;
}

function moteNamed(field: MoteField, skill: string): Mote {
  const mote = field.motes.find((entry) => entry.skill === skill);
  assert.ok(mote !== undefined, `a Mote for ${skill}`);
  return mote;
}

/** The slot point a Mote at rest on its slot is drawn at, at `clock`. */
function restingSlot(scene: MoteScene, mote: Mote, clock: number): ScenePosition {
  return orbitPoint(planetAt(scene, mote.planetId), mote.orbit, slotAngle(mote.slot, mote.slots) + orbitSpin(mote.orbit, clock));
}

// --- Constants ----------------------------------------------------------------

test('three orbits, ascending, inside FOCUS_REACH with the dot included, tilted off-axis as specified', () => {
  assert.equal(MOTE_ORBIT_RADII.length, 3);
  assert.deepEqual([...MOTE_ORBIT_TILTS], [-16, 26, -46]);
  for (let k = 1; k < MOTE_ORBIT_RADII.length; k += 1) {
    assert.ok((MOTE_ORBIT_RADII[k] ?? 0) - (MOTE_ORBIT_RADII[k - 1] ?? 0) > 2 * MOTE_RADIUS, 'orbits never touch');
  }
  const outer = MOTE_ORBIT_RADII[MOTE_ORBIT_RADII.length - 1] ?? Infinity;
  assert.ok(outer + MOTE_RADIUS <= FOCUS_REACH, `the outermost Mote (${outer} + ${MOTE_RADIUS}) inside FOCUS_REACH (${FOCUS_REACH})`);
  assert.ok(MOTE_ORBIT_RADIANS_PER_SECOND > 0, 'the orbits turn, so condensed Motes keep moving');
  assert.ok(MOTE_MIN_SLOTS >= 8 && MOTE_MIN_SLOTS % 2 === 0);
  assert.ok(MOTE_SOURCE_ALPHA > 0 && MOTE_SOURCE_ALPHA < DUST_MEDIUM_PEAK_OPACITY, 'a source is in Dust that is there to see');
  // The estimate is of the token drawn: 9.5px × (0.6 + 0.16em) ≈ 7.2px, one line at 1.2.
  const type = tokens.typography['mote-label'];
  assert.equal(MOTE_LABEL_FONT_PX, 9.5);
  assert.ok(Math.abs(MOTE_LABEL_CHAR_PX - 9.5 * (0.6 + 0.16)) < 1e-12, 'a sans advance plus the token’s letter-spacing');
  assert.ok(Math.abs(MOTE_LABEL_HEIGHT_PX - 9.5 * 1.2) < 1e-12);
  const style = moteLabelStyle();
  assert.deepEqual(
    [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing],
    [type.fontFamily, type.fontSize, type.fontWeight, type.lineHeight, type.letterSpacing],
    'the label is drawn in the mote-label token',
  );
  assert.ok(style.fontWeight <= 400, 'no weight above 400');
  assert.equal(MOTE_ORBIT_PHASES.length, MOTE_ORBIT_RADII.length, 'one phase per orbit, or requireOrbit throws in the frame loop');
  const turns = MOTE_ORBIT_PHASES.map((phase) => ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
  assert.ok(turns.every(Number.isFinite) && new Set(turns).size === turns.length, 'first slots do not line up across orbits');
  assert.ok(MOTE_MIN_SCALE > 0 && MOTE_MIN_SCALE <= 1, 'a Mote at level 0 is smaller, never gone or inverted');
  assert.ok(MOTE_SOURCE_SPREAD > 0, 'a source is outward of its slot');
  assert.ok(MOTE_RESLOT_SECONDS > 0, 'a re-slot glides, never teleports');
});

// --- Seats --------------------------------------------------------------------

/** A lookup over `n` Skills `s0..s(n−1)`, ranked in index order, on tiers chosen to load the orbits unevenly. */
function ranksOf(n: number): ReturnType<typeof moteRanks> {
  const skills = Array.from({ length: n }, (_, i) => ({ name: `s${String(i)}`, tier: MOTE_TIERS_BY_ORBIT[(i * i + i) % 3] ?? 'mote-outer' }));
  return moteRanks({ clients: [], skills });
}

test('a Skill sits on its tier’s orbit, the j-th by rank at slot 2j, with max(8, 2k) slots on an orbit holding k', () => {
  for (let n = 0; n <= 40; n += 1) {
    const ranks = ranksOf(n);
    const skills = Array.from({ length: n }, (_, i) => `s${String(i)}`);
    // Authored order is not the seat order: the rank is.
    const { slots, seats } = moteAssignment([...skills].reverse(), ranks);
    assert.deepEqual(seats.map((seat) => seat.skill), skills, `n ${n}: seats in rank order`);
    for (let orbit = 0; orbit < 3; orbit += 1) {
      const on = seats.filter((seat) => seat.orbit === orbit);
      assert.equal(slots[orbit], Math.max(MOTE_MIN_SLOTS, 2 * on.length), `n ${n}, orbit ${orbit}: slot count`);
      on.forEach((seat, j) => {
        assert.equal(seat.slot, 2 * j, `n ${n}: ${seat.skill} at slot 2j`);
        assert.equal(seat.slots, slots[orbit]);
        assert.equal(seat.orbit, moteRank(ranks, seat.skill).orbit, 'tier index = orbit index');
        assert.ok(!on.some((other) => other.slot === (seat.slot + 1) % seat.slots), `n ${n}, orbit ${orbit}: ${seat.slot} and its neighbour both taken`);
      });
    }
  }
});

test('the inner tier sits on the innermost orbit, and the renderer’s tier order is derive’s', () => {
  const ranks = moteRanks({ clients: [], skills: [{ name: 'Java', tier: 'mote-inner' }, { name: 'Kafka', tier: 'mote-middle' }, { name: 'Zig', tier: 'mote-outer' }] });
  assert.deepEqual(
    moteAssignment(['Zig', 'Kafka', 'Java'], ranks).seats.map((seat) => [seat.skill, seat.orbit, MOTE_ORBIT_RADII[seat.orbit]]),
    [['Java', 0, MOTE_ORBIT_RADII[0]], ['Kafka', 1, MOTE_ORBIT_RADII[1]], ['Zig', 2, MOTE_ORBIT_RADII[2]]],
  );
  // Mirrored, because this directory may not import src/derive/: pinned to derive's literal as text.
  const literal = /export const SKILL_TIERS = (\[[^\]]*\])/.exec(readFileSync(RULES_TS, 'utf8'))?.[1] ?? '';
  assert.deepEqual(JSON.parse(literal.replace(/'/g, '"')), [...MOTE_TIERS_BY_ORBIT]);
  assert.throws(() => moteRanks({ clients: [], skills: [{ name: 'Go', tier: 'mote-dense' }] }), /"Go"/, 'an undeclared tier is refused naming the Skill');
});

test('Skill missing from skills: the lookup throws naming the Skill, as projectSkills does', () => {
  assert.throws(() => moteAssignment(['Java', 'Cobol'], moteRanks({ clients: [], skills: [{ name: 'Java', tier: 'mote-inner' }] })), /"Cobol"/);
  const artifact = fixture();
  const scene = sceneOf({ ...artifact, skills: artifact.skills.filter((skill) => skill.name !== 'Tomcat') });
  const view = viewOf(cameraFor(artifact, 'project:a/1'));
  assert.throws(() => stepMotes(null, scene, 'project:a/1', view, DT), /"Tomcat"/);
  assert.throws(() => moteDotColor(scene.artifact, 'Tomcat'), /"Tomcat"/);
});

test('orbit points are exactly the orbit radius from the Planet, on a plane tilted by the orbit’s tilt', () => {
  const centre = at(3, -2, 7);
  for (let orbit = 0; orbit < 3; orbit += 1) {
    const tilt = ((MOTE_ORBIT_TILTS[orbit] ?? 0) * Math.PI) / 180;
    const normal = at(0, -Math.sin(tilt), Math.cos(tilt));
    for (let angle = 0; angle < 7; angle += 0.37) {
      const point = orbitPoint(centre, orbit, angle);
      assert.ok(Math.abs(distance(point, centre) - (MOTE_ORBIT_RADII[orbit] ?? 0)) < 1e-12);
      const off = { x: point.x - centre.x, y: point.y - centre.y, z: point.z - centre.z };
      assert.ok(Math.abs(off.x * normal.x + off.y * normal.y + off.z * normal.z) < 1e-12, 'in the tilted plane');
    }
  }
  assert.throws(() => orbitPoint(centre, 3, 0), /orbit 3/);
  assert.throws(() => orbitPoint(centre, 0.5, 0), /orbit 0\.5/);
});

// --- Projection -----------------------------------------------------------------

test('projectNdc agrees with three’s own projection through a real camera', () => {
  const artifact = fixture();
  for (const id of ['project:a/1', 'project:b/1']) {
    for (const width of [420, 1024, WIDTH]) {
      const camera = cameraFor(artifact, id, width);
      const view = viewOf(camera, width);
      const points = [at(10, 0, 0), at(12.3, 1.1, -0.4), at(-6, 4, 3), at(38, -2, 5), at(0, 0, 0)];
      for (const point of points) {
        const expected = new Vector3(point.x, point.y, point.z).project(camera);
        const ndc = projectNdc(point, view.view, view.projection);
        for (const axis of ['x', 'y', 'z'] as const) {
          const tolerance = 1e-9 * Math.max(1, Math.abs(expected[axis]));
          assert.ok(Math.abs(ndc[axis] - expected[axis]) < tolerance, `${id} at ${width}: ${axis} ${ndc[axis]} vs ${expected[axis]}`);
        }
        // In front exactly when the camera sees it ahead: three's depth test.
        const ahead = new Vector3(point.x, point.y, point.z).applyMatrix4(camera.matrixWorldInverse).z < 0;
        assert.equal(ndc.front, ahead, `${id} at ${width}: ${JSON.stringify(point)}`);
      }
      // The focused Planet is where Focus put it: NDC −w.
      const planet = projectNdc(id === 'project:a/1' ? at(10, 0, 0) : at(38, -2, 5), view.view, view.projection);
      assert.ok(Math.abs(planet.x + panelFraction(width)) < 1e-9);
      // A point behind the camera is not in front.
      const behind = new Vector3().subVectors(camera.position, new Vector3(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(5));
      assert.equal(projectNdc(at(behind.x, behind.y, behind.z), view.view, view.projection).front, false);
    }
  }
});

// --- Sources --------------------------------------------------------------------

test('a source is pushed outward from the Planet, and pulled toward the Star into Dust at least MOTE_SOURCE_ALPHA opaque', () => {
  const scene = sceneOf(fixture());
  for (const [id, clientId] of [
    ['project:a/1', 'client:a'],
    ['project:a/2', 'client:a'],
    ['project:b/1', 'client:b'],
  ] as const) {
    const planet = planetAt(scene, id);
    const medium = mediumFor(scene, clientId);
    for (let orbit = 0; orbit < 3; orbit += 1) {
      for (let angle = 0; angle < 6.3; angle += 0.4) {
        const slot = orbitPoint(planet, orbit, angle);
        const source = dustSource(slot, planet, medium);
        assert.ok(mediumAlphaAt(medium, source) >= MOTE_SOURCE_ALPHA - 1e-9, `${id} orbit ${orbit} at ${angle}`);
        const out = { x: slot.x - planet.x, y: slot.y - planet.y, z: slot.z - planet.z };
        const pushed = at(
          slot.x + (out.x * MOTE_SOURCE_SPREAD) / distance(slot, planet),
          slot.y + (out.y * MOTE_SOURCE_SPREAD) / distance(slot, planet),
          slot.z + (out.z * MOTE_SOURCE_SPREAD) / distance(slot, planet),
        );
        const star = medium.position;
        if (distance(pushed, star) <= sourceReach(medium)) {
          assert.ok(distance(source, pushed) < 1e-12, 'already visible: left where it was pushed');
        } else {
          assert.ok(Math.abs(distance(source, star) - sourceReach(medium)) < 1e-9, 'on the edge of the visible region');
          const a = { x: pushed.x - star.x, y: pushed.y - star.y, z: pushed.z - star.z };
          const b = { x: source.x - star.x, y: source.y - star.y, z: source.z - star.z };
          const cross = Math.hypot(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
          assert.ok(cross < 1e-9 * Math.max(1, distance(pushed, star) ** 2), 'moved radially toward the Star');
        }
      }
    }
  }
  // The inverse is closed-form: at the reach, the alpha is the threshold exactly.
  const medium = mediumFor(scene, 'client:a');
  const edge = at(medium.position.x + sourceReach(medium), medium.position.y, medium.position.z);
  assert.ok(Math.abs(mediumAlphaAt(medium, edge) - MOTE_SOURCE_ALPHA) < 1e-12);
  assert.throws(() => sourceReach({ ...medium, opacity: MOTE_SOURCE_ALPHA / 2 }), /client:a/, 'no visible Dust to condense from');
  assert.throws(() => sourceReach({ ...medium, opacity: Number.NaN }), /client:a/);
});

// --- The one blend -----------------------------------------------------------------

test('the blend starts exactly at its start and ends exactly at its goal, at FOCUS_SECONDS', () => {
  const from = at(1, 2, 3);
  const to = at(-4, 5, 9);
  assert.deepEqual(blendMote(from, to, 0, 1, 0), { position: from, level: 0 });
  assert.deepEqual(blendMote(from, to, 0, 1, FOCUS_SECONDS), { position: to, level: 1 });
  assert.deepEqual(blendMote(from, to, 0, 1, 99), { position: to, level: 1 });
  assert.deepEqual(blendMote(from, to, 0.3, 1, Number.NaN), { position: from, level: 0.3 });
  const half = blendMote(from, to, 0, 1, FOCUS_SECONDS / 2);
  assert.ok(Math.abs(half.level - easeFocus(0.5)) < 1e-12, 'on the Focus curve');
});

test('with a static target, decay traces condensation backwards', () => {
  const source = at(14, 1, -2);
  const slot = at(11.4, 0.5, 0.3);
  for (let i = 0; i <= 48; i += 1) {
    const t = (FOCUS_SECONDS * i) / 48;
    const condensing = blendMote(source, slot, 0, 1, FOCUS_SECONDS - t);
    const decaying = blendMote(slot, source, 1, 0, t);
    assert.ok(distance(condensing.position, decaying.position) < 1e-9, `at ${t}`);
    assert.ok(Math.abs(condensing.level - decaying.level) < 1e-9, `at ${t}`);
  }
});

// --- The matrix ---------------------------------------------------------------------

test('Rest: nothing focused, at any time, is zero Motes and every pooled dot hidden', () => {
  const scene = sceneOf(fixture());
  const view = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/1'));
  for (const field of run(null, scene, null, 120, view)) {
    assert.equal(field.motes.length, 0);
    assert.equal(field.draws.length, motePool(scene.artifact).length);
    for (const draw of field.draws) {
      assert.equal(draw.visible, false);
      assert.equal(draw.labelVisibility, 'hidden');
    }
  }
});

test('Enter: one Mote per Skill at level 0 on visible-Dust sources, then level 1 on their slots at FOCUS_SECONDS exactly', () => {
  for (const artifact of [fixture(), committed()]) {
    const scene = sceneOf(artifact);
    const project = artifact.clients[0]?.projects[0];
    const id = project?.id ?? '';
    // Read off the Project rather than pinned: the committed Skills change whenever career.json does.
    const skills = [...new Set(project?.content.skills ?? [])];
    assert.ok(skills.length > 0, 'the focused Project has Skills to condense');
    const clientId = artifact.clients[0]?.id ?? '';
    const view = viewOf(cameraFor(artifact, id));
    const rest = last(run(null, scene, null, 3, view));
    const frames = run(rest, scene, id, 1 + MOVE_FRAMES + 30, view);
    // Pool order on every frame: `mote-field.tsx` indexes its handles by pool position.
    const pool = motePool(artifact);
    for (const field of [rest, ...frames]) assert.deepEqual(field.draws.map((draw) => draw.skill), pool);
    const entered = frames[0];
    assert.ok(entered !== undefined);
    assert.equal(entered.motes.length, skills.length);
    assert.deepEqual(new Set(entered.motes.map((mote) => mote.skill)), new Set(skills));
    for (const mote of entered.motes) {
      assert.equal(mote.level, 0, `${mote.skill} starts as Dust`);
      assert.deepEqual(mote.position, mote.source, `${mote.skill} starts at its source`);
      assert.ok(mediumAlphaAt(mediumFor(scene, clientId), mote.source) >= MOTE_SOURCE_ALPHA - 1e-9, 'in visible Dust');
    }
    // Condensing, and not done a frame early.
    const before = frames[MOVE_FRAMES - 1];
    assert.ok(before !== undefined);
    for (const mote of before.motes) assert.ok(mote.level > 0 && mote.level < 1, `${mote.skill} mid-condensation`);
    const done = frames[MOVE_FRAMES];
    assert.ok(done !== undefined);
    for (const mote of done.motes) {
      assert.equal(mote.elapsed, FOCUS_SECONDS);
      assert.equal(mote.level, 1, `${mote.skill} condensed`);
      assert.deepEqual(mote.position, restingSlot(scene, mote, done.clock), `${mote.skill} on its slot`);
      assert.ok(Math.abs(distance(mote.position, planetAt(scene, id)) - (MOTE_ORBIT_RADII[mote.orbit] ?? 0)) < 1e-9);
    }
    // The dots drawn are the Motes, pool-aligned, and never two for one Skill.
    for (const draw of done.draws) assert.equal(draw.visible, skills.includes(draw.skill), draw.skill);
  }
});

test('At rest focused, every Mote keeps moving on its orbit', () => {
  const scene = sceneOf(fixture());
  const view = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/1'));
  const frames = run(null, scene, 'project:a/1', MOVE_FRAMES + 120, view);
  for (let i = MOVE_FRAMES + 2; i < frames.length; i += 1) {
    const a = frames[i - 1];
    const b = frames[i];
    assert.ok(a !== undefined && b !== undefined);
    for (const mote of b.motes) {
      const was = moteNamed(a, mote.skill);
      const moved = distance(mote.position, was.position);
      assert.ok(moved > 0, `${mote.skill} still at frame ${i}`);
      // No faster than its orbit turns (a glide to a new slot aside).
      if (mote.reslotElapsed >= MOTE_RESLOT_SECONDS && was.reslotElapsed >= MOTE_RESLOT_SECONDS) {
        assert.ok(moved <= (MOTE_ORBIT_RADII[mote.orbit] ?? 0) * MOTE_ORBIT_RADIANS_PER_SECOND * DT * 1.0001);
      }
    }
  }
});

test('Release: every Mote decays to its source, retracing the curve, and the field is empty at FOCUS_SECONDS', () => {
  const scene = sceneOf(fixture());
  const view = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/1'));
  const entering = run(null, scene, 'project:a/1', 1 + MOVE_FRAMES + 20, view);
  const settled = last(entering);
  const releasing = run(settled, scene, null, 1 + MOVE_FRAMES, view);
  const released = releasing[0];
  assert.ok(released !== undefined);
  assert.equal(released.motes.length, 9);
  for (const mote of released.motes) {
    const was = moteNamed(settled, mote.skill);
    assert.deepEqual(mote.position, was.position, `${mote.skill} holds on the release frame`);
    assert.equal(mote.level, 1);
    assert.equal(mote.condensing, false);
    const medium = mediumFor(scene, 'client:a');
    assert.ok(mediumAlphaAt(medium, mote.source) >= MOTE_SOURCE_ALPHA - 1e-9, 'it decays into visible Dust');
  }
  // Level retraces condensation: k frames into the decay is MOVE_FRAMES − k frames into condensing.
  for (let k = 1; k < MOVE_FRAMES; k += 1) {
    const decaying = releasing[k];
    const condensing = entering[MOVE_FRAMES - k];
    assert.ok(decaying !== undefined && condensing !== undefined);
    for (const mote of decaying.motes) {
      assert.ok(Math.abs(mote.level - moteNamed(condensing, mote.skill).level) < 1e-9, `${mote.skill} at ${k}`);
    }
  }
  // Position, not only level: each Mote travels back along the blend to its Dust source.
  for (const mote of released.motes) {
    let away = distance(mote.position, mote.source);
    assert.ok(away > 0.1, `${mote.skill} starts away from its source`);
    for (let k = 1; k < MOVE_FRAMES; k += 1) {
      const now = moteNamed(releasing[k] ?? released, mote.skill);
      assert.deepEqual(now.source, mote.source, 'the source holds through the decay');
      assert.deepEqual(now.position, blendMote(mote.from, mote.source, 1, 0, now.elapsed).position, `${mote.skill} on the blend at ${k}`);
      const closer = distance(now.position, mote.source);
      assert.ok(closer < away, `${mote.skill} nearer its source at ${k}`);
      away = closer;
    }
    assert.ok(away < 1e-3, `${mote.skill} all but at its source on its last frame (${away})`);
  }
  const beforeEnd = releasing[MOVE_FRAMES - 1];
  assert.ok(beforeEnd !== undefined);
  assert.equal(beforeEnd.motes.length, 9, 'not gone a frame early');
  for (const mote of beforeEnd.motes) assert.ok(mote.level > 0);
  assert.equal(last(releasing).motes.length, 0, 'empty at FOCUS_SECONDS');
  for (const draw of last(releasing).draws) assert.equal(draw.visible, false);
});

test('Interrupt: a release at 0.4·T decays from the drawn pose and level — never a cut', () => {
  const scene = sceneOf(fixture());
  const view = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/1'));
  const partway = last(run(null, scene, 'project:a/1', 1 + Math.round((0.4 * FOCUS_SECONDS) / DT), view));
  for (const mote of partway.motes) assert.ok(mote.level > 0 && mote.level < 1);
  const released = stepMotes(partway, scene, null, view, DT);
  for (const mote of released.motes) {
    const was = moteNamed(partway, mote.skill);
    assert.deepEqual(mote.position, was.position);
    assert.equal(mote.level, was.level);
    assert.deepEqual(mote.from, was.position, 'the decay starts from there');
    assert.equal(mote.fromLevel, was.level);
  }
  const next = stepMotes(released, scene, null, view, DT);
  for (const mote of next.motes) {
    assert.ok(mote.level < moteNamed(released, mote.skill).level, 'and heads down from it');
    assert.ok(distance(mote.position, moteNamed(released, mote.skill).position) < 0.1, 'a small step');
  }
  // A refocus mid-decay recondenses from where each Mote is, again without a cut.
  const back = stepMotes(next, scene, 'project:a/1', view, DT);
  for (const mote of back.motes) assert.deepEqual(mote.position, moteNamed(next, mote.skill).position);
  assert.equal(back.motes.length, 9, 'the same nine Motes, none duplicated');
});

test('A → B: one Java Mote throughout, travelling from A’s slot to B’s; A-only decays, B-only condenses, together', () => {
  const scene = sceneOf(fixture());
  const viewA = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/1'));
  const viewB = viewOf(cameraFor(scene.artifact as Artifact, 'project:b/1'));
  const onA = last(run(null, scene, 'project:a/1', 1 + MOVE_FRAMES + 10, viewA));
  const javaOnA = moteNamed(onA, 'Java');
  const frames = run(onA, scene, 'project:b/1', 1 + MOVE_FRAMES, viewB);
  const switched = frames[0];
  assert.ok(switched !== undefined);
  // Some draws carry a Mote and some do not on every frame here; the order is the pool's regardless.
  const pool = motePool(scene.artifact);
  for (const field of [onA, ...frames]) {
    assert.deepEqual(field.draws.map((draw) => draw.skill), pool, 'draws in pool order');
    for (const skill of motePool(scene.artifact)) {
      assert.ok(field.motes.filter((mote) => mote.skill === skill).length <= 1, `one ${skill} Mote at most`);
    }
    assert.ok(field.draws.filter((draw) => draw.skill === 'Java').length === 1, 'one pooled Java dot');
  }
  const java = moteNamed(switched, 'Java');
  assert.deepEqual(java.position, javaOnA.position, 'the switch frame holds Java where it was drawn');
  assert.equal(java.level, 1, 'still condensed');
  assert.equal(java.planetId, 'project:b/1');
  // Its source is B's now: the Dust of the slot it heads for, where it would decay to.
  const seatB = moteAssignment(projectSkills(scene.artifact, 'project:b/1'), moteRanks(scene.artifact)).seats.find((seat) => seat.skill === 'Java');
  assert.ok(seatB !== undefined);
  assert.deepEqual(
    java.source,
    dustSource(
      orbitPoint(planetAt(scene, 'project:b/1'), seatB.orbit, slotAngle(seatB.slot, java.slots) + orbitSpin(seatB.orbit, switched.clock)),
      planetAt(scene, 'project:b/1'),
      mediumFor(scene, 'client:b'),
    ),
  );
  assert.ok(mediumAlphaAt(mediumFor(scene, 'client:b'), java.source) >= MOTE_SOURCE_ALPHA - 1e-9, 'in B’s visible Dust');
  assert.notDeepEqual(java.source, javaOnA.source);
  for (const field of frames) assert.equal(moteNamed(field, 'Java').level, 1, 'Java never decays on the way');
  const done = last(frames);
  const javaOnB = moteNamed(done, 'Java');
  assert.deepEqual(javaOnB.position, restingSlot(scene, javaOnB, done.clock), 'on B’s slot');
  // A-only Skills decayed toward A's Dust and are gone; B-only Skills condensed; all over the same FOCUS_SECONDS.
  assert.deepEqual(new Set(done.motes.map((mote) => mote.skill)), new Set(['Go', 'Java', 'Kafka', 'Oracle']));
  const midway = frames[Math.round(MOVE_FRAMES / 2)];
  assert.ok(midway !== undefined);
  assert.ok(moteNamed(midway, 'Tomcat').level > 0 && moteNamed(midway, 'Tomcat').level < 1, 'A-only decaying');
  assert.ok(moteNamed(midway, 'Go').level > 0 && moteNamed(midway, 'Go').level < 1, 'B-only condensing, at the same time');
  assert.ok(mediumAlphaAt(mediumFor(scene, 'client:a'), moteNamed(switched, 'Tomcat').source) >= MOTE_SOURCE_ALPHA - 1e-9, 'into A’s Dust');
  assert.ok(mediumAlphaAt(mediumFor(scene, 'client:b'), moteNamed(switched, 'Go').source) >= MOTE_SOURCE_ALPHA - 1e-9, 'out of B’s Dust');
  const penultimate = frames[MOVE_FRAMES - 1];
  assert.ok(penultimate !== undefined);
  assert.ok(penultimate.motes.some((mote) => mote.skill === 'Tomcat'), 'A-only is still decaying one frame before the end');
  // A-only travels back into A's Dust, not in place and not toward B.
  const tomcat = moteNamed(switched, 'Tomcat');
  let away = distance(tomcat.position, tomcat.source);
  assert.ok(away > 0.1, 'Tomcat starts away from its source');
  for (const field of frames.slice(1, MOVE_FRAMES)) {
    const now = moteNamed(field, 'Tomcat');
    assert.deepEqual(now.position, blendMote(tomcat.from, tomcat.source, 1, 0, now.elapsed).position);
    const closer = distance(now.position, tomcat.source);
    assert.ok(closer < away, 'Tomcat nearer A’s Dust every frame');
    away = closer;
  }
  assert.ok(away < 1e-3, `Tomcat all but in A’s Dust on its last frame (${away})`);
});

test('No place is written down: translating every Body translates every Mote, source and slot alike', () => {
  // What the coordinate-literal scan stands for elsewhere, executed: the orbit radii
  // and tilts are numbers, but every position is a Planet or a Star plus them.
  for (const v of [at(5, -3, 2), at(1e4, -2e4, 3e4)]) {
    const base = fixture();
    const shift = (p: ScenePosition): ScenePosition => ({ x: p.x + v.x, y: p.y + v.y, z: p.z + v.z });
    const moved = fixture({}, v);
    const a = sceneOf(base);
    const b = sceneOf(moved);
    const viewA = viewOf(cameraFor(base, 'project:a/1'));
    const viewB = viewOf(cameraFor(moved, 'project:a/1'));
    let fa: MoteField | null = null;
    let fb: MoteField | null = null;
    const tolerance = 1e-9 * Math.max(1, Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
    for (const [focused, frames] of [['project:a/1', MOVE_FRAMES + 20], ['project:b/1', MOVE_FRAMES / 2], [null, MOVE_FRAMES]] as const) {
      for (let i = 0; i < frames; i += 1) {
        fa = stepMotes(fa, a, focused, viewA, DT);
        fb = stepMotes(fb, b, focused, viewB, DT);
        assert.equal(fb.motes.length, fa.motes.length);
        for (const mote of fa.motes) {
          const other = moteNamed(fb, mote.skill);
          assert.ok(distance(shift(mote.position), other.position) < tolerance, `${mote.skill} position`);
          assert.ok(distance(shift(mote.source), other.source) < tolerance, `${mote.skill} source`);
          assert.ok(Math.abs(mote.level - other.level) < 1e-12);
        }
      }
    }
  }
});

test('A duplicated Skill in one Project is one Mote', () => {
  const scene = sceneOf(fixture());
  const view = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/2'));
  for (const field of run(null, scene, 'project:a/2', MOVE_FRAMES + 5, view)) {
    assert.deepEqual(
      field.motes.map((mote) => mote.skill),
      ['Java'],
    );
  }
});

test('A zero-width canvas: Motes step, every label is hidden, and nothing is NaN', () => {
  const scene = sceneOf(fixture());
  const camera = cameraFor(scene.artifact as Artifact, 'project:a/1');
  camera.aspect = 0;
  camera.updateProjectionMatrix();
  const view = viewOf(camera, 0);
  const frames = run(null, scene, 'project:a/1', MOVE_FRAMES + 10, view);
  assert.equal(last(frames).motes.length, 9);
  for (const field of frames) {
    assert.ok(Number.isFinite(field.clock));
    for (const mote of field.motes) {
      assert.equal(mote.labelVisible, false);
      assert.equal(mote.blocked, false, 'nothing to re-slot for');
      for (const value of [mote.position.x, mote.position.y, mote.position.z, mote.level]) assert.ok(Number.isFinite(value));
    }
    for (const draw of field.draws) assert.equal(draw.labelVisibility, 'hidden');
  }
});

test('An unknown focused ID throws naming it', () => {
  const scene = sceneOf(fixture());
  const view = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/1'));
  assert.throws(() => stepMotes(null, scene, 'project:missing', view, DT), /project:missing/);
  const rest = stepMotes(null, scene, null, view, DT);
  assert.throws(() => stepMotes(rest, scene, 'project:missing', view, DT), /project:missing/);
  assert.throws(() => projectSkills(scene.artifact, 'client:a'), /client:a/, 'a Client is not a Project');
  // In the artifact but with no Planet: named too.
  assert.throws(() => stepMotes(rest, { ...scene, bodies: [] }, 'project:a/1', view, DT), /project:a\/1/);
  // A Client with no medium is named.
  assert.throws(() => stepMotes(rest, { ...scene, media: [] }, 'project:a/1', view, DT), /client:a/);
});

test('dt is clamped as the Rail clamps it, and a non-finite dt does not advance', () => {
  const scene = sceneOf(fixture());
  const view = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/1'));
  const entered = stepMotes(null, scene, 'project:a/1', view, DT);
  assert.equal(stepMotes(entered, scene, 'project:a/1', view, 5).clock, entered.clock + RAIL_MAX_FRAME_SECONDS);
  assert.equal(stepMotes(entered, scene, 'project:a/1', view, Number.NaN).clock, entered.clock);
  assert.equal(stepMotes(entered, scene, 'project:a/1', view, -1).clock, entered.clock);
  assert.equal(moteNamed(stepMotes(entered, scene, 'project:a/1', view, 5), 'Java').elapsed, RAIL_MAX_FRAME_SECONDS);
});

// --- Reduced motion (2.10) --------------------------------------------------------

function runReduced(start: MoteField | null, scene: MoteScene, focused: string | null, frames: number, view: MoteView): MoteField[] {
  const out: MoteField[] = [];
  let field = start;
  for (let i = 0; i < frames; i += 1) {
    field = stepMotes(field, scene, focused, view, DT, true);
    out.push(field);
  }
  return out;
}

test('reduced: Condensation completes at FOCUS_SECONDS × pace, and not a frame before', () => {
  const pace = motionPace(true);
  const scene = sceneOf(fixture());
  const view = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/1'));
  const rest = last(runReduced(null, scene, null, 3, view));
  const frames = runReduced(rest, scene, 'project:a/1', 1 + MOVE_FRAMES, view);
  const k = Math.ceil((FOCUS_SECONDS * pace) / DT - 1e-9);
  assert.ok(k < MOVE_FRAMES / 2, 'visibly brief');
  const before = frames[k - 1];
  const done = frames[k];
  assert.ok(before !== undefined && done !== undefined);
  for (const mote of before.motes) assert.ok(mote.level > 0 && mote.level < 1 - 1e-6, `${mote.skill} mid-condensation`);
  // At frame k the dilated time has summed to FOCUS_SECONDS — to the last ulp of
  // twelve additions of 1/15 — so the level and the pose are at their goal to
  // float precision; the next frame caps them exactly.
  for (const mote of done.motes) {
    assert.ok(Math.abs(mote.elapsed - FOCUS_SECONDS) < 1e-12, `${mote.skill} has run FOCUS_SECONDS of the curve`);
    assert.ok(Math.abs(mote.level - 1) < 1e-9, `${mote.skill} condensed`);
    assert.ok(distance(mote.position, restingSlot(scene, mote, done.clock)) < 1e-9, `${mote.skill} on its slot`);
  }
  const capped = frames[k + 1];
  assert.ok(capped !== undefined);
  for (const mote of capped.motes) assert.equal(mote.level, 1, `${mote.skill} exactly condensed`);
});

test('reduced at rest: the orbit clock stops, and every Mote holds its angle', () => {
  const scene = sceneOf(fixture());
  const view = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/1'));
  const settled = last(run(null, scene, 'project:a/1', MOVE_FRAMES + 120, view));
  const frames = runReduced(settled, scene, 'project:a/1', 90, view);
  for (const field of frames) assert.equal(field.clock, settled.clock, 'the clock does not advance');
  // A glide already under way finishes; after it, nothing moves.
  const late = frames.slice(Math.ceil(MOTE_RESLOT_SECONDS / DT) + 1);
  for (let i = 1; i < late.length; i += 1) {
    const a = late[i - 1];
    const b = late[i];
    assert.ok(a !== undefined && b !== undefined);
    for (const mote of b.motes) assert.deepEqual(mote.position, moteNamed(a, mote.skill).position, `${mote.skill} holds`);
  }
  // And at full motion the same field turns again.
  const resumed = stepMotes(last(frames), scene, 'project:a/1', view, DT);
  assert.ok(resumed.clock > settled.clock);
});

test('reduced toggled mid-Condensation at 0.3·T: it continues from the drawn pose and level, faster — C0', () => {
  const scene = sceneOf(fixture());
  const view = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/1'));
  const partway = last(run(null, scene, 'project:a/1', 1 + Math.round((0.3 * FOCUS_SECONDS) / DT), view));
  const faster = stepMotes(partway, scene, 'project:a/1', view, DT, true);
  const slower = stepMotes(partway, scene, 'project:a/1', view, DT);
  for (const mote of faster.motes) {
    const was = moteNamed(partway, mote.skill);
    const slow = moteNamed(slower, mote.skill);
    assert.deepEqual(mote.from, was.from, `${mote.skill}: the same move — its captured start unchanged`);
    assert.deepEqual(mote.source, was.source, `${mote.skill}: and its source unchanged`);
    assert.equal(mote.condensing, was.condensing, `${mote.skill}: still condensing, not restarted`);
    assert.ok(mote.elapsed > was.elapsed, `${mote.skill}: its time runs on from where it was`);
    assert.ok(mote.level > slow.level, `${mote.skill} condenses faster`);
    assert.ok(mote.level - was.level < 0.5, `${mote.skill}: a step in level, not a cut`);
    const whole = distance(was.source, restingSlot(scene, was, partway.clock));
    assert.ok(distance(mote.position, was.position) < whole * 0.5, `${mote.skill}: a step in space, not a cut`);
  }
});

test('reduced: a long frame is clamped before it is dilated, and the clock holds whatever dt', () => {
  const pace = motionPace(true);
  const scene = sceneOf(fixture());
  const view = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/1'));
  const entered = stepMotes(null, scene, 'project:a/1', view, DT);
  const long = stepMotes(entered, scene, 'project:a/1', view, 5, true);
  assert.equal(long.clock, entered.clock);
  assert.equal(moteNamed(long, 'Java').elapsed, RAIL_MAX_FRAME_SECONDS / pace);
  assert.equal(moteNamed(stepMotes(entered, scene, 'project:a/1', view, Number.NaN, true), 'Java').elapsed, 0);
});

test('moteFrame hands its reduced to the step', () => {
  const scene = sceneOf(fixture());
  const camera = cameraFor(scene.artifact as Artifact, 'project:a/1');
  const view = viewOf(camera);
  const entered = stepMotes(null, scene, 'project:a/1', view, DT);
  const reduced = moteFrame(entered, scene.artifact, scene.bodies, scene.media, 'project:a/1', view.view, view.projection, view.width, view.height, DT, true);
  const full = moteFrame(entered, scene.artifact, scene.bodies, scene.media, 'project:a/1', view.view, view.projection, view.width, view.height, DT);
  assert.equal(reduced.clock, entered.clock);
  assert.ok(full.clock > entered.clock);
  assert.ok(Math.abs(moteNamed(reduced, 'Java').elapsed - moteNamed(full, 'Java').elapsed / motionPace(true)) < 1e-12);
});

// --- Labels -------------------------------------------------------------------------

const ndc = (x: number, front = true): NdcPoint => ({ x, y: 0, z: 0.5, front });

test('a label reads left of its dot when the dot is left of the Planet on screen, right otherwise', () => {
  assert.equal(labelPlacement(ndc(-0.6), ndc(-0.35), 4, WIDTH, true).side, 'left');
  assert.equal(labelPlacement(ndc(-0.1), ndc(-0.35), 4, WIDTH, true).side, 'right');
  assert.equal(labelPlacement(ndc(-0.35), ndc(-0.35), 4, WIDTH, true).side, 'right');
  assert.equal(labelTransform('left'), `translate(calc(-100% - ${MOTE_LABEL_GAP_PX}px), -50%)`);
  assert.equal(labelTransform('right'), `translate(${MOTE_LABEL_GAP_PX}px, -50%)`);
});

test('a right-hand label crossing the panel edge while focused is blocked and hidden, never truncated', () => {
  const w = panelFraction(WIDTH);
  const edge = 1 - 2 * w;
  const chars = 10;
  const extent = (2 * (MOTE_LABEL_GAP_PX + chars * MOTE_LABEL_CHAR_PX)) / WIDTH;
  const inside = labelPlacement(ndc(edge - extent - 1e-6), ndc(-w), chars, WIDTH, true);
  assert.deepEqual(inside, { side: 'right', blocked: false, visible: true }, 'just clear of the edge');
  const across = labelPlacement(ndc(edge - extent + 1e-6), ndc(-w), chars, WIDTH, true);
  assert.deepEqual(across, { side: 'right', blocked: true, visible: false }, 'just across it');
  assert.equal(labelPlacement(ndc(edge - extent + 1e-6), ndc(-w), chars - 1, WIDTH, true).blocked, false, 'the width is per character');
  // Unfocused, there is no panel to cross.
  assert.deepEqual(labelPlacement(ndc(edge - extent + 1e-6), ndc(-w), chars, WIDTH, false), { side: 'right', blocked: false, visible: true });
  // A left-hand label never is.
  assert.equal(labelPlacement(ndc(0.9), ndc(0.95), 80, WIDTH, true).blocked, false);
  // No width, a non-finite point, or a dot behind the camera: hidden, and not blocked.
  for (const [dot, planet, width] of [
    [ndc(0), ndc(-0.3), 0],
    [ndc(0), ndc(-0.3), Number.NaN],
    [ndc(Number.NaN), ndc(-0.3), WIDTH],
    [ndc(0, false), ndc(-0.3), WIDTH],
    [ndc(0), ndc(-0.3, false), WIDTH],
  ] as const) {
    assert.deepEqual(labelPlacement(dot, planet, 4, width, true), { side: labelPlacement(dot, planet, 4, width, true).side, blocked: false, visible: false });
  }
});

const LONG = (tag: string): string => `${tag}${'x'.repeat(70)}`;

/** Checks that no two condensing Motes of one Planet share an orbit's slot or sit on adjacent ones. */
function assertQuota(field: MoteField, frame: number): void {
  const condensing = field.motes.filter((mote) => mote.condensing);
  for (const mote of condensing) {
    for (const other of condensing) {
      if (other === mote || other.planetId !== mote.planetId || other.orbit !== mote.orbit) continue;
      const gap = (((other.slot - mote.slot) % mote.slots) + mote.slots) % mote.slots;
      assert.ok(gap !== 0 && gap !== 1 && gap !== mote.slots - 1, `frame ${frame}: ${mote.skill} and ${other.skill} adjacent`);
    }
  }
}

/**
 * The most one frame may move a Mote: an orbit's spin, or a glide half-way round
 * the outermost orbit on the Focus curve's steepest slope over
 * `MOTE_RESLOT_SECONDS` — far below a jump across the orbit.
 */
function glideStepBound(): number {
  let steepest = 0;
  for (let i = 1; i <= 4000; i += 1) steepest = Math.max(steepest, (easeFocus(i / 4000) - easeFocus((i - 1) / 4000)) * 4000);
  const outer = MOTE_ORBIT_RADII[MOTE_ORBIT_RADII.length - 1] ?? 0;
  const bound = outer * (Math.PI * steepest / MOTE_RESLOT_SECONDS + MOTE_ORBIT_RADIANS_PER_SECOND) * DT * 1.05;
  assert.ok(bound < outer, 'the bound is well under a jump across the orbit');
  return bound;
}

/**
 * A blocked label's whole path. Blocked is judged at the destination slot, so a
 * Mote whose slot label crosses is blocked from the entry frame and hidden; on
 * the next step — in flight — it is re-slotted to the nearest free,
 * quota-keeping, unblocked slot (or left where it is when there is none, judged
 * independently), gliding with no teleport, the quota and the orbit counts held
 * on every frame, and no label ever shown across the panel. Returns how many
 * blocked Motes moved on that first re-slot.
 */
function blockedPath(skills: readonly string[], frameCount: number): { moved: number; frames: readonly MoteField[] } {
  const artifact = fixture({ a: skills });
  const scene = sceneOf(artifact);
  const view = viewOf(cameraFor(artifact, 'project:a/1'));
  const frames = run(null, scene, 'project:a/1', frameCount, view);
  // The entry frame, where blocking is first judged, and the next step, which re-slots.
  const first = frames[0];
  const second = frames[1];
  assert.ok(first !== undefined && second !== undefined);
  for (const mote of second.motes) assert.ok(mote.elapsed < FOCUS_SECONDS && mote.level < 1, `${mote.skill} still in flight`);
  const blocked = first.motes.filter((mote) => mote.blocked);
  assert.ok(blocked.length > 0, 'a label this long, right of its dot, crosses the panel');
  const planet = projectNdc(planetAt(scene, 'project:a/1'), view.view, view.projection);
  const unblockedAt = (mote: Mote, slot: number, clock: number): boolean =>
    labelPlacement(projectNdc(restingSlot(scene, { ...mote, slot }, clock), view.view, view.projection), planet, labelChars(mote.skill), WIDTH, true)
      .visible;
  /** Every slot the rule may pick for `mote`, judged independently against the others' slots on the next frame. */
  const valid = (mote: Mote): number[] => {
    const others = second.motes.filter((other) => other.skill !== mote.skill && other.orbit === mote.orbit).map((other) => other.slot);
    return Array.from({ length: mote.slots }, (_, slot) => slot).filter(
      (slot) =>
        slot !== mote.slot &&
        ![slot, (slot + 1) % mote.slots, (slot + mote.slots - 1) % mote.slots].some((taken) => others.includes(taken)) &&
        unblockedAt(mote, slot, second.clock),
    );
  };
  const turn = (a: number, b: number): number => {
    const d = (((b - a) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return Math.min(d, 2 * Math.PI - d);
  };
  let moved = 0;
  for (const mote of blocked) {
    assert.equal(mote.labelVisible, false, 'hidden that frame');
    const draw: MoteDraw | undefined = first.draws.find((entry) => entry.skill === mote.skill);
    assert.equal(draw?.labelVisibility, 'hidden');
    const next = moteNamed(second, mote.skill);
    const options = valid(mote);
    assert.equal(next.orbit, mote.orbit, 'on its own orbit');
    if (next.slot === mote.slot) {
      assert.deepEqual(options, [], `${mote.skill} stayed although a free, unblocked slot existed`);
      continue;
    }
    moved += 1;
    assert.equal(next.reslotElapsed, 0, `${mote.skill} re-slotted on the next step, in flight, and just starting to glide`);
    assert.ok(options.includes(next.slot), `${mote.skill} moved to a free, quota-keeping, unblocked slot`);
    const from = slotAngle(mote.slot, mote.slots);
    for (const option of options) {
      assert.ok(turn(from, slotAngle(next.slot, mote.slots)) <= turn(from, slotAngle(option, mote.slots)) + 1e-12, 'the nearest one');
    }
  }
  // No teleport: every frame's step is bounded by the fastest the curves allow.
  const stepBound = glideStepBound();
  for (let i = 1; i < frames.length; i += 1) {
    const a = frames[i - 1];
    const b = frames[i];
    assert.ok(a !== undefined && b !== undefined);
    assertQuota(b, i);
    for (const mote of b.motes) assert.ok(distance(mote.position, moteNamed(a, mote.skill).position) < stepBound, `${mote.skill} jumps at ${i}`);
    for (let orbit = 0; orbit < 3; orbit += 1) {
      const count = (field: MoteField) => field.motes.filter((mote) => mote.orbit === orbit).length;
      assert.equal(count(b), count(first), 'a re-slot never changes orbit');
    }
    // A shown label is never across the panel.
    for (const mote of b.motes) if (mote.labelVisible) assert.equal(mote.blocked, false);
  }
  return { moved, frames };
}

test('Blocked at its slot: hidden that frame, then re-slotted on the next step, in flight, to the nearest free, quota-keeping, unblocked slot, gliding there', () => {
  // One long label per orbit: each has seven free slots, so a blocked one always has somewhere to go.
  const { moved, frames } = blockedPath([LONG('a'), LONG('b'), LONG('c')], 1 + MOVE_FRAMES + 600);
  assert.ok(moved > 0, 'at least one blocked Mote had somewhere to go, or this test proves nothing');
  // Once the glides land, every label reads.
  const settled = frames[MOVE_FRAMES + 60];
  assert.ok(settled !== undefined);
  assert.ok(settled.motes.every((mote) => mote.labelPlaced), 'every label placed once re-slotted (the label pass may still hide one)');
});

test('Blocked, crowded: nine long labels keep the quota and never teleport over ten seconds of turning orbits', () => {
  const skills = [LONG('a'), LONG('b'), LONG('c'), LONG('d'), LONG('e'), LONG('f'), LONG('g'), LONG('h'), LONG('i')];
  blockedPath(skills, 1 + MOVE_FRAMES + 600);
});

test('Entry: a Mote whose slot label fits is never re-slotted, though its label crosses the panel in flight', () => {
  // The source is pushed outward from the slot, so a right-hand label can cross the
  // panel at the source and fit at the slot. Find the length where that happens, on
  // the committed single-Client layout, where no neighbour caps the medium.
  let found = false;
  for (let length = 1; length <= 80 && !found; length += 1) {
    const skills = ['x'.repeat(length), 'b', 'c'];
    const base = committed();
    const clients = base.clients.map((entry) => ({
      ...entry,
      projects: entry.projects.map((project) => ({ ...project, content: { skills } })),
    }));
    const artifact: Artifact = { ...base, clients, skills: listTiers(clients) };
    const id = artifact.clients[0]?.projects[0]?.id ?? '';
    const scene = sceneOf(artifact);
    const view = viewOf(cameraFor(artifact, id));
    const frames = run(null, scene, id, 1 + MOVE_FRAMES + 60, view);
    const entry = frames[0];
    assert.ok(entry !== undefined);
    const mote = moteNamed(entry, skills[0] ?? '');
    const planet = projectNdc(planetAt(scene, id), view.view, view.projection);
    const atSource = labelPlacement(projectNdc(mote.position, view.view, view.projection), planet, labelChars(mote.skill), WIDTH, true);
    if (!atSource.blocked || mote.blocked) continue;
    found = true;
    assert.equal(mote.labelVisible, false, 'hidden while its drawn label crosses');
    for (const field of frames) {
      const now = moteNamed(field, mote.skill);
      assert.equal(now.slot, mote.slot, `length ${length}: a Mote whose slot fits is not re-slotted`);
      assert.equal(now.blocked, false);
    }
    assert.equal(moteNamed(last(frames), mote.skill).labelPlaced, true, 'and its label is placed once it has arrived');
  }
  assert.ok(found, 'some label crosses at its source and fits at its slot, or this test proves nothing');
});

test('Label width counts code points, not UTF-16 units', () => {
  assert.equal(labelChars('Java'), 4);
  assert.equal(labelChars('𝔍ava'), 4, 'an astral character is one advance');
  assert.equal(labelChars('C++ / 🦀'), 7);
  assert.equal('𝔍ava'.length, 5, 'the unit count this guards against');
});

test('Blocked with no slot free: the Mote stays, and its label stays hidden', () => {
  // 24 Skills: 8 per orbit on 16 slots, every even slot taken, so every free slot is adjacent to one.
  const skills = Array.from({ length: 24 }, (_, i) => LONG(`s${i}`));
  const artifact = fixture({ a: skills });
  const scene = sceneOf(artifact);
  const view = viewOf(cameraFor(artifact, 'project:a/1'));
  const frames = run(null, scene, 'project:a/1', MOVE_FRAMES + 30, view);
  const first = frames[0];
  assert.ok(first !== undefined);
  assert.ok(first.motes.some((mote) => mote.blocked));
  for (let i = 1; i < frames.length; i += 1) {
    const field = frames[i];
    assert.ok(field !== undefined);
    assertQuota(field, i);
    for (const mote of field.motes) {
      assert.equal(mote.slot, moteNamed(first, mote.skill).slot, `${mote.skill} stays`);
      assert.equal(mote.reslotElapsed, MOTE_RESLOT_SECONDS);
      if (mote.blocked) assert.equal(mote.labelVisible, false, `${mote.skill} stays hidden`);
    }
  }
});

test('Resized while focused: blocking is re-judged at the new width, and a newly blocked Mote re-slots on the next step', () => {
  const artifact = fixture();
  const scene = sceneOf(artifact);
  // Settled ten seconds into the turn: the orbit angle where a right-hand label lies
  // just inside the 1600px panel edge and a free slot exists at 600px (re-tuned when
  // 3.5 moved MOTE_ORBIT_PHASES; the geometry, not the rule, picks the moment).
  const settled = last(run(null, scene, 'project:a/1', 1 + MOVE_FRAMES + 600, viewOf(cameraFor(artifact, 'project:a/1'))));
  assert.ok(settled.motes.every((mote) => !mote.blocked && mote.labelPlaced), 'every label is placed on the wide canvas');
  const planetNdc = (view: MoteView): NdcPoint => projectNdc(planetAt(scene, 'project:a/1'), view.view, view.projection);
  for (const width of [600, 390]) {
    const view = viewOf(cameraFor(artifact, 'project:a/1', width), width);
    const frames = run(settled, scene, 'project:a/1', 120, view);
    const resized = frames[0];
    const next = frames[1];
    assert.ok(resized !== undefined && next !== undefined);
    const newlyBlocked = resized.motes.filter((mote) => mote.blocked);
    assert.ok(newlyBlocked.length > 0, `${width}px: the narrower panel edge blocks a label, or this test proves nothing`);
    for (const mote of resized.motes) {
      const atSlot = labelPlacement(projectNdc(restingSlot(scene, mote, resized.clock), view.view, view.projection), planetNdc(view), labelChars(mote.skill), width, true);
      assert.equal(mote.blocked, atSlot.blocked, `${width}px: ${mote.skill} judged at the new width`);
      if (mote.blocked) assert.equal(mote.labelVisible, false, `${width}px: ${mote.skill} hidden that frame`);
    }
    for (const mote of newlyBlocked) {
      const moved = moteNamed(next, mote.skill);
      if (width === 600) {
        assert.notEqual(moved.slot, mote.slot, `${width}px: ${mote.skill} re-slotted on the next step`);
        assert.equal(moved.reslotElapsed, 0, 'and just starting to glide');
      } else {
        assert.equal(moved.slot, mote.slot, `${width}px: no free, unblocked slot, so ${mote.skill} stays`);
      }
    }
    frames.forEach((field, i) => {
      assertQuota(field, i);
      for (const mote of field.motes) {
        assert.ok(distance(mote.position, moteNamed(frames[i - 1] ?? settled, mote.skill).position) < glideStepBound(), `${width}px: ${mote.skill} never jumps`);
        if (mote.labelVisible) {
          const drawn = labelPlacement(projectNdc(mote.position, view.view, view.projection), planetNdc(view), labelChars(mote.skill), width, true);
          assert.equal(drawn.blocked, false, `${width}px: ${mote.skill} shown across the panel at ${i}`);
        }
      }
    });
    const end = last(frames);
    if (width === 600) assert.ok(end.motes.every((mote) => mote.labelPlaced), '600px: every label is placed once the glide lands');
    else assert.ok(end.motes.some((mote) => !mote.labelPlaced), '390px: the degradation — a label with nowhere to go stays hidden');
  }
});

test('Unfocused, nothing is blocked: a decaying Mote’s label is never re-slotted', () => {
  const artifact = fixture({ a: [LONG('a'), LONG('b'), LONG('c')] });
  const scene = sceneOf(artifact);
  const view = viewOf(cameraFor(artifact, 'project:a/1'));
  const settled = last(run(null, scene, 'project:a/1', MOVE_FRAMES + 60, view));
  for (const field of run(settled, scene, null, MOVE_FRAMES, view)) {
    for (const mote of field.motes) {
      assert.equal(mote.blocked, false);
      assert.equal(mote.slot, moteNamed(settled, mote.skill).slot);
    }
  }
});

// --- The binding and the handles -------------------------------------------------------

test('moteFrame binds the store’s ID, the camera’s matrices and the canvas size to stepMotes', () => {
  const scene = sceneOf(fixture());
  const camera = cameraFor(scene.artifact as Artifact, 'project:a/1');
  const view = viewOf(camera);
  let bound: MoteField | null = null;
  let direct: MoteField | null = null;
  for (let i = 0; i < 40; i += 1) {
    bound = moteFrame(bound, scene.artifact, scene.bodies, scene.media, 'project:a/1', camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, WIDTH, HEIGHT, DT);
    direct = stepMotes(direct, scene, 'project:a/1', view, DT);
  }
  assert.deepEqual(bound, direct);
});

test('applyMoteDraw writes visibility, position, scale, opacity and the label’s side and visibility', () => {
  const calls: unknown[] = [];
  const dot = {
    visible: true,
    position: { set: (x: number, y: number, z: number) => calls.push(['position', x, y, z]) },
    scale: { setScalar: (s: number) => calls.push(['scale', s]) },
    material: { opacity: 1 },
  };
  const label = { style: { visibility: '', opacity: '', transform: '' } };
  applyMoteDraw(dot, label, {
    skill: 'Java',
    visible: true,
    position: at(1, 2, 3),
    scale: 0.65,
    dotScale: 4,
    opacity: 0.5,
    labelVisibility: 'visible',
    labelTransform: labelTransform('left'),
  });
  assert.equal(dot.visible, true);
  assert.deepEqual(calls, [
    ['position', 1, 2, 3],
    ['scale', 0.65 * 4],
  ]);
  assert.equal(dot.material.opacity, 0.5);
  assert.deepEqual(label.style, { visibility: 'visible', opacity: '0.5', transform: labelTransform('left') });
  calls.length = 0;
  applyMoteDraw(dot, label, {
    skill: 'Java',
    visible: false,
    position: null,
    scale: 0.3,
    dotScale: 1,
    opacity: 0,
    labelVisibility: 'hidden',
    labelTransform: labelTransform('right'),
  });
  assert.equal(dot.visible, false);
  assert.deepEqual(calls, [['scale', 0.3]], 'a hidden dot is left where it was');
  assert.equal(label.style.visibility, 'hidden');
  // Handles not mounted yet are skipped, not thrown on.
  applyMoteDraw(null, undefined, { skill: 'x', visible: true, position: at(0), scale: 1, dotScale: 1, opacity: 1, labelVisibility: 'visible', labelTransform: '' });
});

test('a draw’s scale and opacity follow the level, and its label shows only when placed and condensed', () => {
  const scene = sceneOf(fixture());
  const view = viewOf(cameraFor(scene.artifact as Artifact, 'project:a/1'));
  for (const field of run(null, scene, 'project:a/1', MOVE_FRAMES + 5, view)) {
    for (const mote of field.motes) {
      const draw = field.draws.find((entry) => entry.skill === mote.skill);
      assert.ok(draw !== undefined);
      assert.equal(draw.opacity, mote.level);
      assert.equal(draw.visible, mote.level > 0);
      assert.ok(draw.scale > 0 && draw.scale <= 1);
      assert.equal(draw.dotScale, moteDotScale(mote.orbit, mote.position, view));
      assert.equal(draw.labelVisibility, mote.labelVisible ? 'visible' : 'hidden');
      if (mote.labelVisible) assert.ok(mote.labelPlaced, 'a shown label was placed');
      assert.equal(draw.labelTransform, labelTransform(mote.labelSide));
      if (mote.level === 0) assert.equal(draw.labelVisibility, 'hidden');
    }
  }
});

// --- Purity ------------------------------------------------------------------------

function auditMoteModel(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const failures: string[] = [];
  const allowed = new Set([
    '../shell/focus-motion.ts',
    '../shell/motion-preference.ts',
    '../shell/panel-model.ts',
    './dust-model.ts',
    './notable-model.ts',
    './rail-model.ts',
    './scene-model.ts',
    './stroke-model.ts',
    '../tokens/tokens.ts',
  ]);
  for (const [, specifier] of code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (!allowed.has(specifier ?? '')) failures.push(`imports ${specifier}`);
  }
  if (/\brequire\s*\(/.test(code)) failures.push('requires a module');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b|getComputedStyle|innerWidth/.test(code)) failures.push('reads a DOM global');
  if (/new\s+Date\b|Date\s*\.\s*now|Math\s*\.\s*random|performance\s*\.\s*now|requestAnimationFrame/.test(code)) {
    failures.push('reads a clock or randomness — time arrives as dt');
  }
  if (/\bnavigationStore\b|\bgetState\b|\bsubscribe\b|\bsetState\b|\bfocusProject\b|\breleaseFocus\b/.test(code)) {
    failures.push('touches the store — the field reads it, and nothing here writes it');
  }
  if (/\bskill\.length\b/.test(code)) failures.push('measures a label in UTF-16 units — labelChars counts code points');
  if (/\bmoteTier\b|\bluminanceBand\b|\bmass\b|\bisDeep\b/.test(code)) {
    failures.push('reads a Body’s derived property — a Mote’s orbit is its Skill’s artifact tier');
  }
  if (/\bshare\w*|\bcount\w*|\btally\w*|\boccurrence\w*/i.test(code)) {
    failures.push('counts Skills across Projects — the tier is read off the artifact’s skills list');
  }
  return failures;
}

test('the mote model is pure: no Three, no React, no store, no clock, no Body property, no share count', () => {
  assert.deepEqual(auditMoteModel(readFileSync(MODEL_TS, 'utf8')), []);
  for (const form of [
    "import { Vector3 } from 'three';",
    "import { useFrame } from '@react-three/fiber';",
    "import { navigationStore } from '../shell/state.ts';",
    "const skills = await import('../data/career.json');",
    'const now = performance.now();',
    'const jitter = Math.random();',
    'const w = window.innerWidth;',
    'const style = getComputedStyle(label);',
    'const id = navigationStore.getState().focusedProjectId;',
    'const orbit = project.moteTier === "mote-dense" ? 0 : 2;',
    'const orbit = planet.isDeep ? 0 : 1;',
    'const r = body.mass * 0.1;',
    'const shares = new Map<string, number>();',
    'for (const s of p.content.skills) counts.set(s, (counts.get(s) ?? 0) + 1);',
    "const fs = require('node:fs');",
    'const blocked = labelPlacement(dot, planetNdc, mote.skill.length, view.width, true);',
  ]) {
    assert.notDeepEqual(auditMoteModel(form), [], `${form} must be rejected`);
  }
});

// --- Colour and size, from the tokens -----------------------------------------------

test('a Mote dot is filled by tier: stroke-active innermost, ink-label beyond (DESIGN.md mote.fillTier1..3)', () => {
  assert.deepEqual([...MOTE_DOT_COLORS], [tokens.colors['stroke-active-dark'], tokens.colors['ink-label-dark'], tokens.colors['ink-label-dark']]);
  assert.deepEqual([...MOTE_DOT_RADII_PX], [2.6, 2.1, 1.8]);
  const artifact = fixture();
  for (const { name, tier } of artifact.skills) {
    assert.equal(moteDotColor(artifact, name), MOTE_DOT_COLORS[MOTE_TIERS_BY_ORBIT.indexOf(tier as (typeof MOTE_TIERS_BY_ORBIT)[number])]);
  }
});

test('a Mote label is a glyph at ink-label — never a stroke token, never below the floor (3.2, 3.5)', () => {
  assert.equal(MOTE_LABEL_COLOR, tokens.colors['ink-label-dark']);
  assert.equal(moteLabelStyle().color, MOTE_LABEL_COLOR);
  const style = /export function moteLabelStyle\(\)[\s\S]*?\n\}/.exec(readFileSync(MODEL_TS, 'utf8'))?.[0] ?? '';
  assert.match(style, /color:\s*MOTE_LABEL_COLOR\b/);
  assert.doesNotMatch(style, /stroke-|MOTE_DOT_COLORS/);
  assert.doesNotMatch(readFileSync(MODEL_TS, 'utf8'), /ink-quiet|ink-faint|text-overflow|ellipsis|…/, 'no label below ink-label, and none truncated');
});

test('a condensed dot is its tier’s radius on screen, times the level scale, through three’s projection', () => {
  const artifact = fixture();
  const scene = sceneOf(artifact);
  const camera = cameraFor(artifact, 'project:a/1');
  const view = viewOf(camera);
  const done = last(run(null, scene, 'project:a/1', MOVE_FRAMES + 2, view));
  const orbits = new Set<number>();
  for (const mote of done.motes) {
    const draw = done.draws.find((entry) => entry.skill === mote.skill);
    assert.ok(draw !== undefined);
    orbits.add(mote.orbit);
    const perPixel = worldPerPixel(mote.position, view.view, view.projection, HEIGHT);
    assert.ok(perPixel !== null);
    const px = (MOTE_RADIUS * draw.scale * draw.dotScale) / perPixel;
    assert.ok(Math.abs(px - (MOTE_DOT_RADII_PX[mote.orbit] ?? 0)) < 1e-9, `${mote.skill}: ${px}px on orbit ${mote.orbit}`);
  }
  assert.equal(orbits.size, 3, 'every tier is drawn');
  assert.equal(moteDotScale(0, at(0), { ...view, height: 0 }), 1, 'unmeasurable: the mesh at its own radius');
});

// --- Orbit lines ------------------------------------------------------------------------

test('orbit lines: three closed stroke-dust hairline circles, one per orbit, built once', () => {
  const lines = moteOrbitLines();
  assert.equal(lines.length, 3);
  assert.equal(moteOrbitLines(), lines, 'the same array every call: no new points per render');
  assert.equal(MOTE_ORBIT_LINE_COLOR, tokens.colors['stroke-dust-dark']);
  assert.equal(MOTE_ORBIT_LINE_WIDTH_PX, 0.7);
  lines.forEach((line, orbit) => {
    assert.equal(line.orbit, orbit);
    assert.equal(line.color, MOTE_ORBIT_LINE_COLOR);
    assert.equal(line.widthPx, MOTE_ORBIT_LINE_WIDTH_PX);
    assert.deepEqual(line.points[0], line.points[line.points.length - 1], 'closed');
    const tilt = ((MOTE_ORBIT_TILTS[orbit] ?? 0) * Math.PI) / 180;
    for (const [x, y, z] of line.points) {
      assert.ok(Math.abs(Math.hypot(x, y, z) - (MOTE_ORBIT_RADII[orbit] ?? 0)) < 1e-9, 'on the orbit radius');
      assert.ok(Math.abs(y * Math.sin(tilt) - z * Math.cos(tilt)) < 1e-9, 'on the orbit’s tilted plane');
    }
  });
});

/**
 * The orbit-line rule, frame by frame: one draw per orbit, drawn only while a
 * Mote is on that orbit, at the highest level of any Mote on it — condensing or
 * decaying, around whichever Planet — and circling the Planet of a Mote at that
 * level. Returns the Planet IDs the drawn lines circle.
 */
function assertOrbitDraws(field: MoteField, scene: MoteScene, frame: number): string[] {
  assert.equal(field.orbits.length, 3);
  const circled: string[] = [];
  field.orbits.forEach((draw, orbit) => {
    assert.equal(draw.orbit, orbit);
    const on = field.motes.filter((mote) => mote.orbit === orbit && mote.level > 0);
    const top = Math.max(0, ...on.map((mote) => mote.level));
    assert.ok(Math.abs(draw.opacity - top) < 1e-12, `frame ${frame}: orbit ${orbit} at ${draw.opacity}, its highest Mote at ${top}`);
    assert.equal(draw.visible, on.length > 0, `frame ${frame}: orbit ${orbit} is drawn exactly while a Mote is on it`);
    if (!draw.visible) return;
    const holders = on.filter((mote) => mote.level === top).map((mote) => mote.planetId);
    const holder = holders.find((id) => JSON.stringify(planetAt(scene, id)) === JSON.stringify(draw.centre));
    assert.ok(holder !== undefined, `frame ${frame}: orbit ${orbit} circles a Planet none of its highest Motes is on`);
    circled.push(holder);
  });
  return circled;
}

test('only an orbit holding a Mote is drawn, at the highest level on it, around the focused Planet', () => {
  const artifact = fixture({ a: ['Java', 'Spring Boot'] });
  const scene = sceneOf(artifact);
  const view = viewOf(cameraFor(artifact, 'project:a/1'));
  const rest = run(null, scene, null, 2, view);
  for (const field of rest) assert.ok(field.orbits.every((orbit) => !orbit.visible && orbit.opacity === 0 && orbit.centre === null));
  const frames = run(last(rest), scene, 'project:a/1', MOVE_FRAMES + 2, view);
  frames.forEach((field, frame) => {
    for (const id of assertOrbitDraws(field, scene, frame)) assert.equal(id, 'project:a/1');
  });
  const done = last(frames);
  assert.deepEqual(
    done.orbits.map((draw) => draw.visible),
    [true, true, false],
    'two Skills hold the two inner orbits; the third is not drawn',
  );
  const calls: number[][] = [];
  const handle = { visible: false, position: { set: (...xyz: number[]) => void calls.push(xyz) }, material: { opacity: 0 } };
  applyMoteOrbitDraw(handle, done.orbits[0]!);
  assert.equal(handle.visible, true);
  assert.equal(handle.material.opacity, 1);
  assert.deepEqual(calls, [[10, 0, 0]]);
  applyMoteOrbitDraw(handle, { orbit: 2, visible: false, centre: null, opacity: 0 });
  assert.equal(handle.visible, false);
  assert.equal(calls.length, 1, 'a hidden line is left where it was');
  applyMoteOrbitDraw(null, done.orbits[0]!);
});

test('A → B, then a release: each line follows the highest Mote on its orbit — it may move between Planets, never outlives its Motes', () => {
  const artifact = fixture();
  const scene = sceneOf(artifact);
  const view = viewOf(cameraFor(artifact, 'project:a/1'));
  const onA = run(null, scene, 'project:a/1', MOVE_FRAMES + 30, view);
  const toB = run(last(onA), scene, 'project:b/1', MOVE_FRAMES + 30, view);
  const released = run(last(toB), scene, null, MOVE_FRAMES + 2, view);
  const circled = [...onA, ...toB, ...released].map((field, frame) => assertOrbitDraws(field, scene, frame));
  // Non-vacuous: lines circle A, then B; after the hand-off a line still circles A
  // while A's leaving Motes outshine B's arriving ones; the release ends undrawn.
  const onAEnd = circled[onA.length - 1] ?? [];
  assert.ok(onAEnd.length > 0 && onAEnd.every((id) => id === 'project:a/1'), 'A’s lines are drawn');
  assert.ok(circled.slice(onA.length).some((ids) => ids.includes('project:a/1')), 'a line stays around A while A’s Motes decay above B’s');
  const onBEnd = circled[onA.length + toB.length - 1] ?? [];
  assert.ok(onBEnd.length > 0 && onBEnd.every((id) => id === 'project:b/1'), 'B’s lines are drawn');
  assert.ok(last(released).orbits.every((draw) => !draw.visible), 'released: every line gone with its Motes');
});

// --- The label pass ------------------------------------------------------------------------

const BOUNDS = { width: 1440, height: 900, panelEdge: 1440 - 560 };

function boxAt(left: number, top: number, chars = 6): LabelBox {
  return { left, right: left + chars * MOTE_LABEL_CHAR_PX, top, bottom: top + MOTE_LABEL_HEIGHT_PX };
}

function candidate(skill: string, rank: number, box: LabelBox, focused = true): LabelCandidate {
  return { skill, rank, focused, box };
}

test('over the cap: of 25 labels with room for all, the first 12 by rank are shown and the rest are dots', () => {
  assert.equal(MOTE_LABEL_LIMIT, 12);
  const all = Array.from({ length: 25 }, (_, i) => candidate(`s${String(i)}`, i, boxAt(20 + (i % 5) * 150, 20 + Math.floor(i / 5) * 60)));
  // Handed over in reverse: the pass orders by rank itself.
  const shown = moteLabelPass([...all].reverse(), BOUNDS);
  assert.deepEqual([...shown].sort(), all.slice(0, 12).map((entry) => entry.skill).sort());
});

test('collision: a lower-ranked label whose box meets a shown one is hidden; the focused Project wins first', () => {
  const a = candidate('Java', 0, boxAt(100, 100));
  const b = candidate('Kafka', 3, boxAt(130, 104));
  assert.deepEqual([...moteLabelPass([b, a], BOUNDS)], ['Java']);
  // Clearance, not just contact: just inside the clearance collides, just outside it does not.
  const near = candidate('Kafka', 3, boxAt(a.box.right + MOTE_LABEL_CLEARANCE_PX - 0.01, 100));
  const clear = candidate('Kafka', 3, boxAt(a.box.right + MOTE_LABEL_CLEARANCE_PX, 100));
  assert.deepEqual([...moteLabelPass([a, near], BOUNDS)], ['Java']);
  assert.deepEqual([...moteLabelPass([a, clear], BOUNDS)].sort(), ['Java', 'Kafka']);
  // A decaying Mote's label never beats the focused Project's, whatever its rank.
  assert.deepEqual([...moteLabelPass([{ ...a, focused: false }, b], BOUNDS)], ['Kafka']);
});

test('off canvas: a box crossing the top, bottom, left or right edge, or the panel edge, is hidden', () => {
  const ok = boxAt(200, 200);
  assert.deepEqual([...moteLabelPass([candidate('in', 0, ok)], BOUNDS)], ['in']);
  const w = ok.right - ok.left;
  for (const [name, box] of [
    ['top', boxAt(200, -1)],
    ['bottom', boxAt(200, BOUNDS.height - MOTE_LABEL_HEIGHT_PX + 1)],
    ['left', boxAt(-1, 200)],
    ['right', boxAt(BOUNDS.width - w + 1, 200)],
    ['panel', boxAt(BOUNDS.panelEdge - w + 1, 200)],
    ['NaN', { ...ok, left: Number.NaN }],
  ] as const) {
    assert.deepEqual([...moteLabelPass([candidate(name, 0, box)], BOUNDS)], [], `${name}: hidden`);
  }
  // A hidden label leaves room: the next one by rank is considered in its place.
  assert.deepEqual([...moteLabelPass([candidate('out', 0, boxAt(-5, 200)), candidate('in', 1, ok)], BOUNDS)], ['in']);
});

test('a label box is the text drawn by labelTransform: a gap off the dot, centred on it', () => {
  const dot: NdcPoint = { x: 0, y: 0, z: 0.5, front: true };
  const right = labelBox(dot, 'right', 4, 1000, 800);
  assert.deepEqual(right, { left: 500 + MOTE_LABEL_GAP_PX, right: 500 + MOTE_LABEL_GAP_PX + 4 * MOTE_LABEL_CHAR_PX, top: 400 - MOTE_LABEL_HEIGHT_PX / 2, bottom: 400 + MOTE_LABEL_HEIGHT_PX / 2 });
  const left = labelBox({ ...dot, x: -0.5, y: 0.5 }, 'left', 4, 1000, 800);
  assert.equal(left.right, 250 - MOTE_LABEL_GAP_PX);
  assert.equal(left.top, 200 - MOTE_LABEL_HEIGHT_PX / 2);
});

/**
 * The acceptance sweep: `id` focused on a `width` × `height` canvas, stepped
 * through a full orbit turn. On every frame, at most `MOTE_LABEL_LIMIT` labels
 * are shown, none crosses the canvas or the panel edge, no two intersect, and a
 * label hidden by the pass is not re-slotted. Returns the most shown on a frame.
 */
function sweep(artifact: Artifact, id: string, width: number, height: number): number {
  const scene = sceneOf(artifact);
  const view = viewOf(cameraFor(artifact, id, width, height), width, height);
  const edge = width * (1 - panelFraction(width));
  const turn = (2 * Math.PI) / MOTE_ORBIT_RADIANS_PER_SECOND;
  const step = RAIL_MAX_FRAME_SECONDS;
  let field: MoteField | null = null;
  let most = 0;
  for (let t = 0; t <= turn + MOVE_FRAMES * DT; t += step) {
    const before: MoteField | null = field;
    field = stepMotes(field, scene, id, view, step);
    const shown = field.motes.filter((mote) => mote.labelVisible);
    most = Math.max(most, shown.length);
    assert.ok(shown.length <= MOTE_LABEL_LIMIT, `${width}×${height} at ${t.toFixed(1)}s: ${shown.length} labels`);
    for (const mote of shown) {
      const box = mote.labelBox;
      assert.ok(box !== null);
      assert.ok(box.left >= 0 && box.top >= 0 && box.right <= width && box.bottom <= height, `${mote.skill} crosses the canvas edge`);
      assert.ok(box.right <= edge + 1e-9, `${mote.skill} crosses the panel edge`);
      for (const other of shown) {
        if (other === mote || other.labelBox === null) continue;
        const o = other.labelBox;
        const meets = box.left < o.right && o.left < box.right && box.top < o.bottom && o.top < box.bottom;
        assert.ok(!meets, `${mote.skill} and ${other.skill} intersect at ${t.toFixed(1)}s`);
      }
    }
    // Hidden by the pass is hidden, not re-slotted: only a blocked Mote moves.
    if (before !== null) {
      for (const mote of field.motes) {
        const was = before.motes.find((entry) => entry.skill === mote.skill);
        if (was !== undefined && was.slot !== mote.slot) assert.ok(was.blocked, `${mote.skill} re-slotted without being blocked`);
      }
    }
  }
  return most;
}

test('25 Skills and 9 Skills at 1440×900 and 390×844, through a full orbit turn: ≤ 12 labels, none clipped, none overlapping', () => {
  const base = committed();
  const sncf = 'project:sncf/client-referential';
  assert.equal(new Set(projectSkills(base, sncf)).size, 25, 'the tested inventory maximum is 25 Skills');
  const nine = fixture();
  const desktop = [sweep(base, sncf, 1440, 900), sweep(nine, 'project:a/1', 1440, 900)];
  for (const most of desktop) assert.ok(most > 0, 'labels are shown at desktop width, or this proves nothing');
  assert.ok((desktop[0] ?? 0) <= MOTE_LABEL_LIMIT);
  for (const most of [sweep(base, sncf, 390, 844), sweep(nine, 'project:a/1', 390, 844)]) {
    assert.ok(most > 0, 'labels are shown at phone width too, or the phone sweeps prove nothing');
  }
});

// --- The label pass, stepped -------------------------------------------------------------

/** Whether two label boxes come within the pass's clearance of each other. */
function crowds(a: LabelBox, b: LabelBox): boolean {
  const gap = MOTE_LABEL_CLEARANCE_PX;
  return !(a.left >= b.right + gap || b.left >= a.right + gap || a.top >= b.bottom + gap || b.top >= a.bottom + gap);
}

function inside(box: LabelBox, width: number, height: number, edge: number): boolean {
  return box.left >= 0 && box.top >= 0 && box.bottom <= height && box.right <= width && box.right <= edge;
}

/**
 * Every placed label the pass hid, among `who`, is explained: out of bounds, past
 * the cap of better-ranked shown labels, or crowding a better-ranked shown one.
 * Only shown labels in `blockers` may explain a hidden one. Returns how many
 * hidden labels were explained by a collision rather than the bounds or the cap.
 */
function assertRankWins(
  field: MoteField,
  ranks: ReturnType<typeof moteRanks>,
  width: number,
  height: number,
  who: (mote: Mote) => boolean,
  blockers: (mote: Mote) => boolean,
): number {
  const edge = width * (1 - panelFraction(width));
  const shown = field.motes.filter((mote) => mote.labelVisible && blockers(mote));
  let collided = 0;
  for (const hidden of field.motes.filter((mote) => who(mote) && mote.labelPlaced && !mote.labelVisible)) {
    const box = hidden.labelBox;
    assert.ok(box !== null);
    if (!inside(box, width, height, edge)) continue;
    const rank = moteRank(ranks, hidden.skill).rank;
    const better = shown.filter((mote) => moteRank(ranks, mote.skill).rank < rank);
    if (better.length >= MOTE_LABEL_LIMIT) continue;
    const blocked = better.some((mote) => mote.labelBox !== null && crowds(mote.labelBox, box));
    assert.ok(blocked, `${hidden.skill} (rank ${rank}) is placeable, unblocked and under the cap, yet hidden while ${shown.length} show`);
    collided += 1;
  }
  return collided;
}

test('stepped: on the committed 25-Skill Project at rest, the shown labels are the best-ranked placeable ones', () => {
  const base = committed();
  const sncf = 'project:sncf/client-referential';
  const scene = sceneOf(base);
  const view = viewOf(cameraFor(base, sncf, 1440, 900), 1440, 900);
  const ranks = moteRanks(base);
  // Arrive from another Project, so the field's own order (kept Motes first) is not rank order.
  const before = last(run(null, scene, 'project:decathlon/store-labelling-generation', MOVE_FRAMES + 2, view));
  const frames = run(before, scene, sncf, MOVE_FRAMES + 120, view);
  const order = last(frames).motes.map((mote) => moteRank(ranks, mote.skill).rank);
  assert.notDeepEqual(order, [...order].sort((a, b) => a - b), 'the field order is not rank order, or this proves nothing');
  let shownMost = 0;
  for (const field of frames.slice(MOVE_FRAMES)) {
    assertRankWins(field, ranks, 1440, 900, () => true, () => true);
    shownMost = Math.max(shownMost, field.motes.filter((mote) => mote.labelVisible).length);
  }
  assert.equal(shownMost, MOTE_LABEL_LIMIT, 'the cap is reached');
});

test('stepped: A → B, a condensing B label wins a collision with a decaying A label, whatever their ranks', () => {
  // a/2 sits beside a/1, and its Skills rank below all of a/1's: by rank alone the
  // decaying A labels would win every collision.
  const artifact = fixture({ a2At: at(10.5, 0.4, 0.3), a2: ['Zeta one', 'Zeta two', 'Zeta three', 'Zeta four', 'Zeta five', 'Zeta six'] });
  const scene = sceneOf(artifact);
  const view = viewOf(cameraFor(artifact, 'project:a/1', 1440, 900), 1440, 900);
  const ranks = moteRanks(artifact);
  const onA = last(run(null, scene, 'project:a/1', MOVE_FRAMES + 2, view));
  let collided = 0;
  for (const field of run(onA, scene, 'project:a/2', MOVE_FRAMES, view)) {
    const focusedB = (mote: Mote) => mote.condensing && mote.planetId === 'project:a/2';
    // Only a better-ranked shown B label may explain a hidden B label: a decaying A label never does.
    assertRankWins(field, ranks, 1440, 900, focusedB, focusedB);
    const contested = field.motes.some(
      (b) => focusedB(b) && b.labelVisible && field.motes.some((a) => !a.condensing && a.labelPlaced && !a.labelVisible && a.labelBox !== null && crowds(a.labelBox, b.labelBox!)),
    );
    if (contested) collided += 1;
  }
  assert.ok(collided > 0, 'a decaying A label and a shown condensing B label do collide, or this proves nothing');
});

test('stepped: the nine-Skill fixture at 1440×900, at rest, shows all nine labels at once', () => {
  const artifact = fixture();
  const scene = sceneOf(artifact);
  const view = viewOf(cameraFor(artifact, 'project:a/1', 1440, 900), 1440, 900);
  const frames = run(null, scene, 'project:a/1', MOVE_FRAMES + 1, view);
  const rest = last(frames);
  assert.equal(rest.motes.length, 9);
  assert.deepEqual(rest.motes.filter((mote) => !mote.labelVisible).map((mote) => mote.skill), [], 'every one of the nine reads at once');
});

test('after a release, decaying labels are still kept left of the panel while it slides out', () => {
  // Each committed Project in turn, carrying one Skill: no cap and no collision can
  // hide its label, only the panel edge can. Released at many orbit angles, its
  // decay toward the Dust can carry the label right, under the panel, which is
  // still sliding out over the same move.
  const edge = 1440 * (1 - panelFraction(1440));
  let crossing = 0;
  const ids = committed().clients.flatMap((client) => client.projects.map((project) => project.id));
  for (const id of ids) {
    const raw = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as { clients: { projects: { id: string; content: { skills: string[] } }[] }[] };
    for (const client of raw.clients) for (const project of client.projects) if (project.id === id) project.content.skills = ['master data management'];
    const artifact = { ...raw, skills: listTiers(raw.clients) } as unknown as Artifact;
    const scene = sceneOf(artifact);
    const view = viewOf(cameraFor(artifact, id, 1440, 900), 1440, 900);
    let focused = last(run(null, scene, id, MOVE_FRAMES + 2, view));
    for (let turn = 0; turn < 20; turn += 1) {
      for (const field of run(focused, scene, null, MOVE_FRAMES, view)) {
        for (const mote of field.motes) {
          if (mote.labelVisible) assert.ok(mote.labelBox !== null && mote.labelBox.right <= edge + 1e-9, `${id}: ${mote.skill} shown under the sliding panel`);
          if (mote.labelPlaced && mote.labelBox !== null && mote.labelBox.right > edge && inside(mote.labelBox, 1440, 900, 1440)) crossing += 1;
        }
      }
      focused = last(run(focused, scene, id, 190, view));
    }
  }
  assert.ok(crossing > 0, 'some decaying label reaches under the panel, or this proves nothing');
});

// --- The lookup, the pool, the token parser ------------------------------------------------

test('moteRanks refuses a Skill listed twice, naming it, and is built once per artifact', () => {
  assert.throws(() => moteRanks({ clients: [], skills: [{ name: 'Java', tier: 'mote-inner' }, { name: 'Java', tier: 'mote-outer' }] }), /"Java"/);
  const artifact = fixture();
  assert.equal(moteRanks(artifact), moteRanks(artifact), 'memoised on the artifact object');
  assert.notEqual(moteRanks({ ...artifact }), moteRanks(artifact), 'a different artifact gets its own lookup');
});

test('motePool: one entry per distinct Skill name, in artifact order', () => {
  assert.deepEqual(motePool(fixture()), [...NINE, 'Go', 'Kafka']);
  const twice = fixture({ a: ['Java', 'Go', 'Java'], b: ['Go', 'Rust', 'Java'] });
  assert.deepEqual(motePool(twice), ['Java', 'Go', 'Rust']);
});

test('cssNumber reads px and em tokens, bare 0, negatives and leading-dot decimals, and refuses another unit', () => {
  assert.equal(cssNumber('9.5px', 'px'), 9.5);
  assert.equal(cssNumber('0.16em', 'em'), 0.16);
  assert.equal(cssNumber('.16em', 'em'), 0.16);
  assert.equal(cssNumber('-0.02em', 'em'), -0.02);
  assert.equal(cssNumber('0', 'em'), 0);
  assert.equal(cssNumber('0', 'px'), 0);
  assert.equal(cssNumber('12px', 'px'), 12);
  for (const bad of ['9.5', '9.5em', '1rem', 'calc(1px)', '', 'px', '1.2.3px']) {
    assert.throws(() => cssNumber(bad, 'px'), new RegExp(JSON.stringify(bad).replace(/[.()*]/g, '\\$&')), bad);
  }
});
