/**
 * The Client names on the Stars (9.3), executed: the pool, the ink by subject,
 * the place below the Star, the hides (frame edge, panel edge, behind the
 * camera, the affordance, a stronger name), the plate, the obstacles the Motes
 * yield to, the write onto the handles, the committed artifact at every Rail
 * stop at 16:9 and 32:9, and the module's purity — the spec's matrix, row by row.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PerspectiveCamera, Vector3 } from 'three';
import { tokens } from '../tokens/tokens.ts';
import { contrast } from '../shell/contrast.ts';
import {
  LABEL_CHAR_EM,
  PLATE_PAD_PX,
  affordanceObstacles,
  labelBounds,
  projectToScreen,
  radiusPx,
  type AffordanceArtifact,
  type ScreenRect,
  type Viewport,
} from './affordance-model.ts';
import {
  CLIENT_LABEL_CAPITAL_EM,
  CLIENT_LABEL_CLEARANCE_PX,
  CLIENT_LABEL_GAP_PX,
  CLIENT_LABEL_RECEDED_INK,
  CLIENT_LABEL_SUBJECT_INK,
  applyClientLabels,
  clientLabelFrame,
  clientLabelOverlayStyle,
  clientLabelPlateStyle,
  clientLabelSize,
  clientLabels,
  sceneLabelObstacles,
  type ClientLabelArtifact,
  type ClientLabelDraw,
  type ClientLabelHandle,
  type ClientLabelState,
} from './client-label-model.ts';
import { moteLabelPass } from './mote-label.ts';
import { MOON_OFFSET_RATIO, MOON_RADIUS_RATIO, RING_RADIUS_RATIO } from './notable-model.ts';
import { buildRail, railFarPlane, railPose, railStopCount, type Rail, type RailKeyframe } from './rail-model.ts';
import { DEFAULT_FOV, DEFAULT_NEAR, buildScene, frameBodies, type Body, type SceneArtifact } from './scene-model.ts';
import { STAR_RADIUS, bodyRadius, sceneSubject } from './stroke-model.ts';
import { stripComments } from '../../scripts/source-scan.ts';

const MODEL_TS = fileURLToPath(new URL('./client-label-model.ts', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));

const HD: Viewport = { width: 1920, height: 1080 };
const ARK: Viewport = { width: 3840, height: 1080 };
const LAPTOP: Viewport = { width: 1440, height: 900 };

type Committed = SceneArtifact & AffordanceArtifact & ClientLabelArtifact;
type CommittedClient = Committed['clients'][number] & { readonly name: string };

function committed(): { artifact: Committed; bodies: readonly Body[]; rail: Rail } {
  const artifact = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as Committed;
  const { bodies } = buildScene(artifact);
  return { artifact, bodies, rail: buildRail(artifact, bodies) };
}

const REST: ClientLabelState = {
  mode: 'rail',
  flightTarget: null,
  scrollProgress: 0,
  focusedProjectId: null,
  hoveredProjectId: null,
  keyboardProjectId: null,
};

/** Free flight toward `target` (or the overview at `null`): the subject is that Star alone. */
const flying = (target: string | null): ClientLabelState => ({ ...REST, mode: 'freeflight', flightTarget: target });

// --- The hand-built sky ---------------------------------------------------------------

const star = (id: string, position: { x: number; y: number; z: number }): Body => ({ id, kind: 'star', position });

const planet = (id: string, position: { x: number; y: number; z: number }): Body => ({
  id,
  kind: 'planet',
  clientId: 'client:a',
  position,
  mass: 2,
  luminanceBand: 'stroke-rest',
  moteTier: 'mote-sparse',
  isDeep: false,
  orbitNormal: { x: 0, y: 0, z: 1 },
});

const TWO: ClientLabelArtifact & AffordanceArtifact = {
  clients: [
    { id: 'client:a', name: 'Alpha', projects: [{ id: 'project:p', isDeep: false, content: { project: 'A long project title', role: 'Developer', team_size: 6 } }] },
    { id: 'client:b', name: 'Beta & Co', projects: [] },
  ],
} as unknown as ClientLabelArtifact & AffordanceArtifact;

const keyframe = (subject: string | null): RailKeyframe => ({
  subject,
  target: { x: 0, y: 0, z: 0 },
  reach: 20,
  direction: { x: 0, y: 0, z: 1 },
  slowdown: 0,
  framing: null,
});

/** A Rail of two stops, `client:a` then `client:b`. */
const TWO_RAIL: Rail = { keyframes: [keyframe(null), keyframe('client:a'), keyframe('client:b')] };

/** A camera at `(0, 0, distance)` looking at the origin, its matrices current. */
function cameraAt(viewport: Viewport, distance = 20): PerspectiveCamera {
  const camera = new PerspectiveCamera(DEFAULT_FOV, viewport.width / viewport.height, DEFAULT_NEAR, 1000);
  camera.position.set(0, 0, distance);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function frame(nav: ClientLabelState, bodies: readonly Body[], viewport = HD, camera = cameraAt(viewport), artifact = TWO, rail = TWO_RAIL): ClientLabelDraw[] {
  return clientLabelFrame(nav, artifact, bodies, rail, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, viewport);
}

function shown(draw: ClientLabelDraw | undefined): Extract<ClientLabelDraw, { visible: true }> {
  assert.ok(draw !== undefined && draw.visible, `${draw?.id ?? 'a label'} is shown`);
  return draw;
}

const overlap = (a: ScreenRect, b: ScreenRect) => !(a.left >= b.right || b.left >= a.right || a.top >= b.bottom || b.top >= a.bottom);

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** Whether two rectangles come within the names' clearance of each other. */
const within4 = (a: ScreenRect, b: ScreenRect, gap = CLIENT_LABEL_CLEARANCE_PX) =>
  !(a.left >= b.right + gap || b.left >= a.right + gap || a.top >= b.bottom + gap || b.top >= a.bottom + gap);

const within = (box: ScreenRect, bounds: ScreenRect) =>
  box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom;

// --- The pool and the box -------------------------------------------------------------

test('the pool is one label per Client, in artifact order, its name published as-is', () => {
  const { artifact } = committed();
  assert.deepEqual(
    clientLabels(artifact),
    (artifact.clients as readonly CommittedClient[]).map((client) => ({ id: client.id, name: client.name })),
  );
  assert.equal(clientLabels(artifact).length, 6);
  assert.ok(clientLabels(artifact).some((label) => label.name === 'SIMSU'), 'an all-capital name stays as written');
  assert.ok(clientLabels(artifact).some((label) => label.name === 'SNCF Connect & Tech'), 'a mixed-case name is not transformed');
});

test('the estimated plate is fontPx × (advance + letterSpacing) per code point, a capital or digit wider, by fontPx × lineHeight, plus the pad', () => {
  const type = tokens.typography['scene-label-client'];
  assert.equal(type.fontSize, '11px');
  assert.equal(type.letterSpacing, '0.36em');
  assert.ok(CLIENT_LABEL_CAPITAL_EM > LABEL_CHAR_EM, 'a capital errs wider than the mean advance');
  const size = clientLabelSize('Alpha');
  assert.ok(near(size.width, 11 * (CLIENT_LABEL_CAPITAL_EM + 4 * LABEL_CHAR_EM + 5 * 0.36) + 2 * PLATE_PAD_PX));
  assert.ok(near(size.height, 11 * type.lineHeight + 2 * PLATE_PAD_PX));
  assert.ok(clientLabelSize('SIMSU').width > clientLabelSize('simsu').width, 'an all-capital name is estimated wider');
  assert.ok(near(clientLabelSize('9').width, clientLabelSize('A').width), 'a digit takes the capital advance');
  assert.equal(clientLabelSize('😀').width, clientLabelSize('a').width, 'an astral character is one advance');
});

test('a blank Client name throws naming the Client, rather than mounting an empty plate', () => {
  for (const name of ['', '   ']) {
    assert.throws(() => clientLabels({ clients: [{ id: 'client:a', name: 'Alpha' }, { id: 'client:blank', name }] }), /client:blank/);
  }
});

// --- The ink by subject, and below the Star -------------------------------------------

test('the subject’s name is ink-lift, the other’s ink-label, both below their Stars and centred on them', () => {
  const bodies = [star('client:a', { x: -3, y: 0, z: 0 }), star('client:b', { x: 3, y: 0, z: 0 })];
  const camera = cameraAt(HD);
  for (const [nav, subject] of [
    [{ ...REST, scrollProgress: 1 }, 'client:a'],
    [{ ...REST, scrollProgress: 2 }, 'client:b'],
    [{ ...REST, scrollProgress: 0 }, 'client:a'],
    [flying('client:b'), 'client:b'],
  ] as const) {
    assert.equal(sceneSubject(nav, TWO_RAIL), subject);
    const draws = frame(nav, bodies, HD, camera);
    assert.deepEqual(draws.map((draw) => draw.id), ['client:a', 'client:b']);
    for (const body of bodies) {
      const draw = shown(draws.find((d) => d.id === body.id));
      assert.equal(draw.color, body.id === subject ? CLIENT_LABEL_SUBJECT_INK : CLIENT_LABEL_RECEDED_INK);
      const centre = projectToScreen(body.position, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, HD);
      assert.ok(centre !== null);
      const starPx = radiusPx(STAR_RADIUS, centre.depth, camera.projectionMatrix.elements, HD.height);
      assert.ok(starPx > 10, 'the Star has a radius on screen');
      assert.ok(Math.abs(draw.box.top - (centre.y + starPx + CLIENT_LABEL_GAP_PX)) < 1e-9, 'the plate’s top is the Star’s edge plus the gap');
      assert.ok(Math.abs((draw.box.left + draw.box.right) / 2 - centre.x) < 1e-9, 'centred on the Star');
      const size = clientLabelSize(TWO.clients.find((client) => client.id === body.id)?.name ?? '');
      assert.ok(near(draw.box.right - draw.box.left, size.width) && near(draw.box.bottom - draw.box.top, size.height), 'the plate is the estimated size');
      assert.equal(draw.transform, `translate(${Math.round(centre.x * 100) / 100}px, ${Math.round(draw.box.top * 100) / 100}px) translateX(-50%)`, 'the real plate is centred on the Star, whatever its width');
    }
  }
});

test('the overview has no subject: every name is receded', () => {
  const draws = frame(flying(null), [star('client:a', { x: -3, y: 0, z: 0 }), star('client:b', { x: 3, y: 0, z: 0 })]);
  assert.ok(draws.every((draw) => draw.visible && draw.color === CLIENT_LABEL_RECEDED_INK));
});

// --- Focused, the panel's edge -----------------------------------------------------------

test('while a Project is Focused no name is lifted, and a name crossing the panel’s edge is hidden', () => {
  const focused: ClientLabelState = { ...REST, scrollProgress: 1, focusedProjectId: 'project:p' };
  const bounds = labelBounds(HD, true);
  assert.ok(bounds.right < labelBounds(HD, false).right, 'the panel pulls the right bound in');
  let crossed = 0;
  for (let x = -12; x <= 14; x += 0.05) {
    const bodies = [star('client:a', { x, y: 0, z: 0 }), star('client:b', { x: -6, y: 0, z: 0 })];
    const open = frame(focused, bodies);
    const rest = frame({ ...focused, focusedProjectId: null }, bodies);
    for (const draw of open) {
      if (draw.visible) {
        assert.equal(draw.color, CLIENT_LABEL_RECEDED_INK, 'the subject is a Planet: no Star is lifted');
        assert.ok(draw.box.right <= bounds.right, 'no shown name crosses the panel’s edge');
      }
    }
    if (rest[0]?.visible === true && open[0]?.visible === false) {
      crossed += 1;
      assert.ok(rest[0].box.right > bounds.right, 'hidden only for crossing the panel’s edge');
    }
  }
  assert.ok(crossed > 0, 'some name shown at rest is hidden by the panel');
});

// --- The frame's edge: hidden, never moved or faded ----------------------------------------

test('a name whose box enters the outer 12% on any side is hidden, never moved', () => {
  const camera = cameraAt(HD);
  const bounds = labelBounds(HD, false);
  const sides = new Set<string>();
  for (let x = -18; x <= 18; x += 0.25) {
    for (let y = -10; y <= 10; y += 0.25) {
      const body = star('client:a', { x, y, z: 0 });
      const [draw] = frame(flying(null), [body, star('client:b', { x: 0, y: 0, z: -200 })], HD, camera);
      const centre = projectToScreen(body.position, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, HD);
      assert.ok(centre !== null && draw !== undefined);
      const size = clientLabelSize('Alpha');
      const top = centre.y + radiusPx(STAR_RADIUS, centre.depth, camera.projectionMatrix.elements, HD.height) + CLIENT_LABEL_GAP_PX;
      const box = { left: centre.x - size.width / 2, right: centre.x + size.width / 2, top, bottom: top + size.height };
      const fits = within(box, bounds);
      assert.equal(draw.visible, fits, `at (${x}, ${y}) the name is shown exactly when its box is inside the inner 76%`);
      if (draw.visible) assert.ok((['left', 'right', 'top', 'bottom'] as const).every((side) => near(draw.box[side], box[side])), 'a shown name sits where its Star puts it');
      if (!fits) {
        if (box.left < bounds.left) sides.add('left');
        if (box.right > bounds.right) sides.add('right');
        if (box.top < bounds.top) sides.add('top');
        if (box.bottom > bounds.bottom) sides.add('bottom');
      }
    }
  }
  assert.deepEqual([...sides].sort(), ['bottom', 'left', 'right', 'top'], 'every side was crossed');
});

test('the plate carries no fade, scale or filter, so a hidden name is hidden and a shown one whole', () => {
  const style = clientLabelPlateStyle() as Record<string, unknown>;
  for (const key of ['opacity', 'filter', 'scale', 'transition', 'animation']) assert.equal(style[key], undefined, `no ${key}`);
});

// --- Behind the camera --------------------------------------------------------------------

test('a Star behind the camera, or at it, has no name', () => {
  const draws = frame(flying(null), [star('client:a', { x: 0, y: 0, z: 30 }), star('client:b', { x: 0, y: 0, z: 20 })]);
  assert.deepEqual(draws, [{ id: 'client:a', visible: false }, { id: 'client:b', visible: false }]);
});

test('a Client with no Star throws naming it, in the names’ frame and in the Motes’ obstacles alike', () => {
  assert.throws(() => frame(flying(null), [star('client:a', { x: 0, y: 0, z: 0 })]), /client:b/);
  const camera = cameraAt(HD);
  assert.throws(
    () => sceneLabelObstacles(flying(null), TWO, [star('client:a', { x: 0, y: 0, z: 0 })], TWO_RAIL, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, HD),
    /client:b/,
  );
});

// --- Yielding to the affordance --------------------------------------------------------------

test('a name whose box meets the affordance’s block or leader is hidden while it is there', () => {
  const camera = cameraAt(HD);
  const view = camera.matrixWorldInverse.elements;
  const projection = camera.projectionMatrix.elements;
  const starA = star('client:a', { x: -3, y: 0, z: 0 });
  const starB = star('client:b', { x: 6, y: 4, z: 0 });
  let met = 0;
  for (let x = -12; x <= -3; x += 0.25) {
    for (let y = -3; y <= 0; y += 0.25) {
      const bodies = [starA, starB, planet('project:p', { x, y, z: 0 })];
      const hover: ClientLabelState = { ...flying(null), hoveredProjectId: 'project:p' };
      const rest = shown(frame(flying(null), bodies, HD, camera)[0]);
      const obstacles = affordanceObstacles(hover, TWO, bodies, view, projection, HD);
      const [draw] = frame(hover, bodies, HD, camera);
      const meets = obstacles.some((obstacle) => within4(rest.box, obstacle));
      assert.equal(draw?.visible, !meets, `with the Planet at (${x}, ${y}) the name yields exactly when it meets the affordance`);
      if (meets) met += 1;
    }
  }
  assert.ok(met > 0, 'the affordance met the name at some placement');
});

// --- Two names meet ------------------------------------------------------------------------

test('when two names meet, the subject’s wins, then the nearer, then artifact order', () => {
  const a = star('client:a', { x: 0, y: 0, z: 0 });
  const nearB = star('client:b', { x: 0.3, y: 0, z: 0.6 });
  const evenB = star('client:b', { x: 0.3, y: 0, z: 0 });
  const visible = (draws: ClientLabelDraw[]) => draws.map((draw) => draw.visible);
  // The boxes would overlap: the precondition.
  const alone = (body: Body) => shown(frame(flying(null), [body, star(body.id === 'client:a' ? 'client:b' : 'client:a', { x: 0, y: 0, z: -500 })])[body.id === 'client:a' ? 0 : 1]);
  assert.ok(overlap(alone(a).box, alone(nearB).box) && overlap(alone(a).box, alone(evenB).box), 'the two names meet');
  assert.deepEqual(visible(frame(flying('client:a'), [a, nearB])), [true, false], 'the subject wins over a nearer Star');
  assert.deepEqual(visible(frame(flying('client:b'), [a, evenB])), [false, true], 'the subject wins over artifact order');
  assert.deepEqual(visible(frame(flying(null), [a, nearB])), [false, true], 'with no subject, the nearer wins');
  assert.deepEqual(visible(frame(flying(null), [a, evenB])), [true, false], 'at one depth, artifact order');
  // A name hidden by the edge does not block another.
  const edgeA = star('client:a', { x: 14, y: 0, z: 0 });
  assert.deepEqual(visible(frame(flying('client:a'), [edgeA, star('client:b', { x: 14.2, y: 0, z: 0 })])), [false, false]);
  assert.deepEqual(visible(frame(flying('client:a'), [star('client:a', { x: 0, y: 0, z: 30 }), evenB])), [false, true], 'a name behind the camera blocks nothing');
});

// --- The Motes yield to a shown name ---------------------------------------------------------

test('sceneLabelObstacles is the affordance’s rectangles followed by every shown name’s plate', () => {
  const camera = cameraAt(HD);
  const view = camera.matrixWorldInverse.elements;
  const projection = camera.projectionMatrix.elements;
  const bodies = [star('client:a', { x: -3, y: 0, z: 0 }), star('client:b', { x: 30, y: 0, z: 0 }), planet('project:p', { x: 3, y: 3, z: 0 })];
  for (const nav of [flying(null), { ...flying(null), hoveredProjectId: 'project:p' }, { ...flying(null), keyboardProjectId: 'project:p' }]) {
    const draws = clientLabelFrame(nav, TWO, bodies, TWO_RAIL, view, projection, HD);
    const boxes = draws.flatMap((draw) => (draw.visible ? [draw.box] : []));
    assert.equal(boxes.length, 1, 'one name is shown, the other off the frame');
    assert.deepEqual(sceneLabelObstacles(nav, TWO, bodies, TWO_RAIL, view, projection, HD), [...affordanceObstacles(nav, TWO, bodies, view, projection, HD), ...boxes]);
  }
  // The Mote pass hides a Mote label that sits on a shown name, and shows it once the name is gone.
  const [name] = sceneLabelObstacles(flying(null), TWO, bodies, TWO_RAIL, view, projection, HD);
  assert.ok(name !== undefined);
  const candidate = { skill: 'TypeScript', rank: 0, focused: false, box: { left: name.left + 2, right: name.left + 60, top: name.top, bottom: name.bottom } };
  const moteBounds = { width: HD.width, height: HD.height, panelEdge: HD.width };
  assert.deepEqual([...moteLabelPass([candidate], moteBounds, new Set(), [name])], []);
  assert.deepEqual([...moteLabelPass([candidate], moteBounds, new Set(), [])], ['TypeScript']);
});

// --- The committed artifact at every Rail stop -----------------------------------------------

/** A camera at stop `k` of the committed Rail, as `scene.tsx` builds it. */
function stopCamera(rail: Rail, bodies: readonly Body[], k: number, viewport: Viewport): PerspectiveCamera {
  const aspect = viewport.width / viewport.height;
  const pose = railPose(rail, k, aspect);
  const camera = new PerspectiveCamera(DEFAULT_FOV, aspect, DEFAULT_NEAR, Math.max(frameBodies(bodies).far, railFarPlane(rail, bodies)));
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

test('the committed artifact at every Rail stop, at 16:9, 32:9 and 16:10: names inside the bounds, none meeting, one per Star, the subject lifted', () => {
  const { artifact, bodies, rail } = committed();
  const stars = bodies.filter((body) => body.kind === 'star').map((body) => body.id);
  assert.deepEqual(clientLabels(artifact).map((label) => label.id), stars, 'one label per Star, and no Star without one');
  const stops = railStopCount(rail);
  assert.equal(stops, 6);
  let shownCount = 0;
  for (const viewport of [HD, ARK, LAPTOP]) {
    const bounds = labelBounds(viewport, false);
    for (let k = 0; k <= stops; k += 1) {
      const nav = { ...REST, scrollProgress: k };
      const subject = sceneSubject(nav, rail);
      const camera = stopCamera(rail, bodies, k, viewport);
      const draws = clientLabelFrame(nav, artifact, bodies, rail, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, viewport);
      assert.deepEqual(draws.map((draw) => draw.id), stars, 'one draw per Star, in pool order');
      const visible = draws.filter((draw): draw is Extract<ClientLabelDraw, { visible: true }> => draw.visible);
      shownCount += visible.length;
      for (const draw of visible) {
        assert.ok(within(draw.box, bounds), `stop ${k} at ${viewport.width}: ${draw.id}'s name is inside the inner 76%`);
        assert.equal(draw.color, draw.id === subject ? CLIENT_LABEL_SUBJECT_INK : CLIENT_LABEL_RECEDED_INK);
      }
      for (const [i, a] of visible.entries()) {
        for (const b of visible.slice(i + 1)) assert.ok(!within4(a.box, b.box), `stop ${k} at ${viewport.width}: ${a.id} and ${b.id} keep their clearance`);
      }
      if (k > 0) {
        assert.ok(visible.some((draw) => draw.id === subject), `stop ${k} at ${viewport.width}: the subject ${String(subject)} is named`);
      }
    }
  }
  assert.ok(shownCount > 2 * stops, 'names are shown, not merely hidden');
});

test('at every committed Rail stop, at each viewport, no shown name’s opaque plate covers another Body, its Ring or its Moon', () => {
  const { artifact, bodies, rail } = committed();
  let checked = 0;
  for (const viewport of [HD, ARK, LAPTOP]) {
    for (let k = 0; k <= railStopCount(rail); k += 1) {
      const camera = stopCamera(rail, bodies, k, viewport);
      const view = camera.matrixWorldInverse.elements;
      const projection = camera.projectionMatrix.elements;
      const draws = clientLabelFrame({ ...REST, scrollProgress: k }, artifact, bodies, rail, view, projection, viewport);
      for (const draw of draws) {
        if (!draw.visible) continue;
        for (const body of bodies) {
          if (body.id === draw.id) continue;
          const screen = projectToScreen(body.position, view, projection, viewport);
          if (screen === null) continue;
          // A Deep Planet's marks reach its Ring or its Moon's far edge, whichever is farther.
          const reach = body.isDeep === true ? Math.max(RING_RADIUS_RATIO, MOON_OFFSET_RATIO + MOON_RADIUS_RATIO) : 1;
          const r = radiusPx(bodyRadius(body), screen.depth, projection, viewport.height) * reach;
          const cx = Math.max(draw.box.left, Math.min(screen.x, draw.box.right));
          const cy = Math.max(draw.box.top, Math.min(screen.y, draw.box.bottom));
          assert.ok(Math.hypot(cx - screen.x, cy - screen.y) >= r, `stop ${k} at ${viewport.width}: ${draw.id}'s plate covers ${body.id}`);
          checked += 1;
        }
      }
    }
  }
  assert.ok(checked > 0, 'some plate was checked against some Body');
});

// --- The plate and the overlay -----------------------------------------------------------------

test('the plate is the opaque page ground, padded 1px, in scene-label-client, with no edge, corner or shade', () => {
  const style = clientLabelPlateStyle();
  assert.equal(style.background, tokens.colors['surface-base-dark']);
  assert.match(style.background, /^#[0-9A-Fa-f]{6}$/, 'opaque: a six-digit hex, no alpha');
  assert.equal(PLATE_PAD_PX, 1);
  assert.equal(style.padding, '1px');
  assert.equal(style.whiteSpace, 'nowrap');
  assert.equal(style.visibility, 'hidden');
  assert.equal(style.pointerEvents, 'none');
  const type = tokens.typography['scene-label-client'];
  assert.deepEqual(
    { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing },
    { fontFamily: type.fontFamily, fontSize: type.fontSize, fontWeight: type.fontWeight, lineHeight: type.lineHeight, letterSpacing: type.letterSpacing },
  );
  const record = style as Record<string, unknown>;
  for (const key of ['border', 'outline', 'textTransform']) assert.equal(record[key], undefined, `no ${key}`);
  assert.deepEqual(clientLabelOverlayStyle(), { position: 'absolute', inset: 0, pointerEvents: 'none', userSelect: 'none' });
});

test('both inks clear 4.5:1 on the plate, and the subject’s is the lifted one', () => {
  assert.equal(CLIENT_LABEL_SUBJECT_INK, tokens.colors['ink-lift-dark']);
  assert.equal(CLIENT_LABEL_RECEDED_INK, tokens.colors['ink-label-dark']);
  for (const ink of [CLIENT_LABEL_SUBJECT_INK, CLIENT_LABEL_RECEDED_INK]) {
    assert.ok(contrast(ink, tokens.colors['surface-base-dark']) >= 4.5);
  }
  assert.ok(contrast(CLIENT_LABEL_SUBJECT_INK, tokens.colors['surface-base-dark']) > contrast(CLIENT_LABEL_RECEDED_INK, tokens.colors['surface-base-dark']));
});

// --- Writing a frame -------------------------------------------------------------------------

test('applyClientLabels writes each draw onto its own plate, skipping unmounted ones', () => {
  const handle = (): ClientLabelHandle & { style: { visibility: string; transform: string; color: string } } => ({ style: { visibility: 'hidden', transform: '', color: '' } });
  const a = handle();
  const c = handle();
  c.style.transform = 'translate(1px, 2px)';
  c.style.color = '#000000';
  const draws: ClientLabelDraw[] = [
    { id: 'a', visible: true, box: { left: 1, right: 2, top: 3, bottom: 4 }, transform: 'translate(1px, 3px)', color: CLIENT_LABEL_SUBJECT_INK },
    { id: 'b', visible: true, box: { left: 1, right: 2, top: 3, bottom: 4 }, transform: 'translate(9px, 9px)', color: CLIENT_LABEL_RECEDED_INK },
    { id: 'c', visible: false },
  ];
  applyClientLabels([a, null, c], draws);
  assert.deepEqual(a.style, { visibility: 'visible', transform: 'translate(1px, 3px)', color: CLIENT_LABEL_SUBJECT_INK });
  assert.deepEqual(c.style, { visibility: 'hidden', transform: 'translate(1px, 2px)', color: '#000000' }, 'a hidden draw hides and leaves the rest');
  applyClientLabels([], draws);
});

// --- Purity -------------------------------------------------------------------------------------

/** The model's imports, globals and reads, as a pure function over its source. */
function auditClientLabelModel(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  const allowed = new Set(['../tokens/tokens.ts', './affordance-model.ts', './mote-label.ts', './rail-model.ts', './scene-model.ts', './stroke-model.ts']);
  for (const match of code.matchAll(/(?:^|[^'"`\w])(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (!allowed.has(match[1] ?? '')) failures.push(`imports ${match[1]}`);
  }
  if (/\brequire\s*\(/.test(code)) failures.push('requires a module');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b|\bmatchMedia\b|getBoundingClientRect|offsetWidth|clientWidth/.test(code)) failures.push('reads the DOM — the box is estimated');
  if (/new\s+Date\b|Date\s*\.\s*now|Math\s*\.\s*random|performance\s*\./.test(code)) failures.push('reads a clock or randomness');
  if (/\bnavigationStore\b|\bgetState\b|\bsubscribe\b|\bsetState\b/.test(code)) failures.push('reaches the store — the state arrives as an argument');
  if (/toUpperCase|toLowerCase|textTransform/.test(code)) failures.push('transforms the name — it is published as-is');
  const bare = code.replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, "''");
  if (/\bopacity\b|\bfilter\b|\bscale\b|\btransition\b/.test(bare) || /\bopacity\s*:|\bscale\w*\s*\(/.test(code)) failures.push('fades or scales — a name is shown or hidden');
  if (/\bduration\b|\bnotable\b|\bskills\b|\bluminanceBand\b|\bmass\b/.test(bare)) failures.push('reads a field the name does not show');
  return failures;
}

test('the Client name model imports the tokens, the affordance, Mote-label, Rail, scene and stroke models only, and reads no store, clock or DOM', () => {
  assert.deepEqual(auditClientLabelModel(readFileSync(MODEL_TS, 'utf8')), []);
});

test('the Client name model audit rejects each form it names', () => {
  for (const form of [
    "import { Vector3 } from 'three';",
    "import { navigationStore } from '../shell/state.ts';",
    "import { solve } from '../derive/index.ts';",
    'const w = window.innerWidth;',
    'const r = el.getBoundingClientRect();',
    'const s = navigationStore.getState();',
    'const t = Date.now();',
    'const name = client.name.toUpperCase();',
    'const style = { opacity: 0.5 };',
    'const style = { transform: `scale(1.2)` };',
    'const m = body.mass;',
  ]) {
    assert.notDeepEqual(auditClientLabelModel(form), [], `${form} must be rejected`);
  }
  assert.deepEqual(auditClientLabelModel("import { bodyRadius } from './stroke-model.ts';\nconst t = `translate(${a}px, ${b}px)`;"), []);
});
