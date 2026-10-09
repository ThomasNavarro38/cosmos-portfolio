/**
 * The hover and keyboard-focus affordance (3.4), executed: the one approached
 * Project per frame, its two lines, the projection, the leader and label layout
 * with its 12% re-anchoring, the keyboard outline, the styles from the tokens,
 * the frame over the committed artifact, the write onto the overlay's handles,
 * and the module's purity — the I/O matrix of the spec, row by row.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PerspectiveCamera, Vector3 } from 'three';
import { DEPTH_LABELS } from '../shell/index-model.ts';
import { tokens } from '../tokens/tokens.ts';
import {
  EDGE_SHARE,
  LEADER_PX,
  OUTLINE_OFFSET_PX,
  OUTLINE_PX,
  affordanceBlockStyle,
  affordanceFrame,
  affordanceLayout,
  affordanceLeaderStyle,
  affordanceOutline,
  affordanceOverlayStyle,
  affordanceProject,
  affordanceSecondaryLabelStyle,
  affordanceText,
  affordanceTitleLabelStyle,
  applyAffordance,
  approachedId,
  approachedProject,
  keepOverlay,
  LABEL_CHAR_EM,
  labelBounds,
  labelBox,
  markPx,
  onFrame,
  overlayOrigin,
  projectToScreen,
  radiusPx,
  type AffordanceArtifact,
  type AffordanceDraw,
  type ApproachState,
} from './affordance-model.ts';
import { panelFraction } from '../shell/panel-model.ts';
import {
  MOON_ANGLE,
  MOON_MIN_RADIUS_PX,
  MOON_OFFSET_RATIO,
  MOON_RADIUS_RATIO,
  RING_RADIUS_RATIO,
  notableMoons,
  notableRings,
} from './notable-model.ts';
import { buildScene, type Body, type SceneArtifact } from './scene-model.ts';
import { PLANET_RADIUS } from './stroke-model.ts';

const MODEL_TS = fileURLToPath(new URL('./affordance-model.ts', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));

const REST: ApproachState = { focusedProjectId: null, hoveredProjectId: null, keyboardProjectId: null };
const VIEWPORT = { width: 1600, height: 900 };

function committed(): { artifact: SceneArtifact & AffordanceArtifact; bodies: readonly Body[] } {
  const artifact = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as SceneArtifact & AffordanceArtifact;
  return { artifact, bodies: buildScene(artifact).bodies };
}

/** A camera at `(0, 0, distance)` looking at the origin, its matrices current. */
function cameraAt(distance: number, aspect = VIEWPORT.width / VIEWPORT.height, fov = 50): PerspectiveCamera {
  const camera = new PerspectiveCamera(fov, aspect, 0.1, 1000);
  camera.position.set(0, 0, distance);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

const planet = (id: string, position = { x: 0, y: 0, z: 0 }, isDeep = false): Body => ({
  id,
  kind: 'planet',
  clientId: 'client:a',
  position,
  mass: 2,
  luminanceBand: 'stroke-rest',
  moteTier: 'mote-sparse',
  isDeep,
  orbitNormal: { x: 0, y: 0, z: 1 },
});

const ARTIFACT: AffordanceArtifact = {
  clients: [
    {
      projects: [
        { id: 'project:a', isDeep: false, content: { project: 'Alpha', role: 'Developer', team_size: 6 } },
        { id: 'project:b', isDeep: true, content: { project: 'Beta', role: 'Technical lead', team_size: 11 } },
      ],
    },
  ],
};

// --- The approach: one per frame ---------------------------------------------------

test('at rest nothing is approached', () => {
  assert.equal(approachedProject(REST), null);
  assert.equal(approachedId(REST), null);
});

test('a hovered Planet is approached by the pointer', () => {
  assert.deepEqual(approachedProject({ ...REST, hoveredProjectId: 'p' }), { id: 'p', keyboard: false });
});

test('the keyboard wins over the hover: one approach, on the keyboard’s Project', () => {
  assert.deepEqual(approachedProject({ ...REST, keyboardProjectId: 'a', hoveredProjectId: 'b' }), { id: 'a', keyboard: true });
  assert.equal(approachedId({ ...REST, keyboardProjectId: 'a', hoveredProjectId: 'b' }), 'a');
});

test('the Focused Project is never approached — nothing is drawn', () => {
  assert.equal(approachedProject({ ...REST, focusedProjectId: 'p', hoveredProjectId: 'p' }), null);
  assert.equal(approachedProject({ ...REST, focusedProjectId: 'p', keyboardProjectId: 'p' }), null);
  // The keyboard's Project is the approached one even when it is Focused: the
  // pointer's does not stand in for it.
  assert.equal(approachedProject({ ...REST, focusedProjectId: 'p', keyboardProjectId: 'p', hoveredProjectId: 'q' }), null);
  assert.deepEqual(approachedProject({ ...REST, focusedProjectId: 'f', hoveredProjectId: 'p' }), { id: 'p', keyboard: false });
});

// --- The text ----------------------------------------------------------------------

test('the label reads title, then role · team of n · the depth word the index uses', () => {
  const [shallow, deep] = ARTIFACT.clients[0]?.projects ?? [];
  assert.ok(shallow !== undefined && deep !== undefined);
  assert.deepEqual(affordanceText(shallow), { title: 'Alpha', secondary: `Developer · team of 6 · ${DEPTH_LABELS.shallow}` });
  assert.deepEqual(affordanceText(deep), { title: 'Beta', secondary: `Technical lead · team of 11 · ${DEPTH_LABELS.deep}` });
  assert.equal(DEPTH_LABELS.shallow, 'Shallow');
});

test('a Project the artifact does not carry throws naming it', () => {
  assert.equal(affordanceProject(ARTIFACT, 'project:b').content.project, 'Beta');
  assert.throws(() => affordanceProject(ARTIFACT, 'project:zz'), /project:zz/);
});

// --- Projection ----------------------------------------------------------------------

test('the projection agrees with three’s, and the radius with 3.3’s formula', () => {
  const camera = cameraAt(20);
  for (const point of [
    { x: 0, y: 0, z: 0 },
    { x: 3, y: -2, z: 1 },
    { x: -6, y: 4, z: -5 },
  ]) {
    const screen = projectToScreen(point, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, VIEWPORT);
    assert.ok(screen !== null);
    const ndc = new Vector3(point.x, point.y, point.z).project(camera);
    assert.ok(Math.abs(screen.x - ((ndc.x + 1) / 2) * VIEWPORT.width) < 1e-6);
    assert.ok(Math.abs(screen.y - ((1 - ndc.y) / 2) * VIEWPORT.height) < 1e-6);
    assert.ok(Math.abs(screen.depth - (20 - point.z)) < 1e-9);
  }
  const centre = new Vector3(0, 0, 0).project(camera);
  const edge = new Vector3(0, PLANET_RADIUS, 0).project(camera);
  const three = ((edge.y - centre.y) / 2) * VIEWPORT.height;
  assert.ok(Math.abs(radiusPx(PLANET_RADIUS, 20, camera.projectionMatrix.elements, VIEWPORT.height) - three) < 1e-6);
});

test('behind the camera, at it, or on a degenerate input, nothing projects', () => {
  const camera = cameraAt(20);
  const V = camera.matrixWorldInverse.elements;
  const P = camera.projectionMatrix.elements;
  assert.equal(projectToScreen({ x: 0, y: 0, z: 25 }, V, P, VIEWPORT), null, 'behind');
  assert.equal(projectToScreen({ x: 0, y: 0, z: 20 }, V, P, VIEWPORT), null, 'at the camera: depth 0');
  assert.equal(projectToScreen({ x: Number.NaN, y: 0, z: 0 }, V, P, VIEWPORT), null);
  assert.equal(projectToScreen({ x: 0, y: 0, z: 0 }, [], P, VIEWPORT), null);
  assert.equal(projectToScreen({ x: 0, y: 0, z: 0 }, V, P, { width: 0, height: 900 }), null);
  assert.equal(projectToScreen({ x: 0, y: 0, z: 0 }, V, P, { width: 1600, height: Number.NaN }), null);
  assert.equal(radiusPx(1, 0, P, 900), 0);
  assert.equal(radiusPx(1, 10, [], 900), 0);
});

// --- Layout --------------------------------------------------------------------------

/** The two points of a leader path, asserting it is one open segment. */
function segment(path: string): { from: [number, number]; to: [number, number] } {
  const match = /^M (-?[\d.]+) (-?[\d.]+) L (-?[\d.]+) (-?[\d.]+)$/.exec(path);
  assert.ok(match !== null, `${path} is not one open M … L … segment`);
  return { from: [Number(match[1]), Number(match[2])], to: [Number(match[3]), Number(match[4])] };
}

test('by default the label sits right of the Body, the leader 56px from its edge, level', () => {
  const layout = affordanceLayout({ x: 800, y: 450 }, 10, VIEWPORT, false);
  assert.deepEqual(layout.direction, { x: 1, y: 0 });
  assert.deepEqual(layout.from, { x: 810, y: 450 });
  assert.deepEqual(layout.anchor, { x: 810 + LEADER_PX, y: 450 });
  assert.deepEqual(segment(layout.leaderPath), { from: [810, 450], to: [866, 450] });
  assert.equal(layout.labelTransform, 'translate(866px, 450px) translate(0%, -50%)', 'the near (left) edge at the anchor, centred on it');
  assert.equal(layout.textAlign, 'left');
  assert.equal(layout.outline, 'none');
});

test('right edge: an anchor past 88% of the width puts the label left of the Body, the leader leftward', () => {
  const x = 0.88 * VIEWPORT.width - 10 - LEADER_PX + 1; // the default anchor lands at 88% + 1px
  const layout = affordanceLayout({ x, y: 450 }, 10, VIEWPORT, false);
  assert.deepEqual(layout.direction, { x: -1, y: 0 });
  const { from, to } = segment(layout.leaderPath);
  assert.ok(to[0] < from[0] && from[0] < x, 'leftward, from the Body’s left edge');
  assert.ok(Math.abs(from[0] - (x - 10)) < 0.01 && Math.abs(to[0] - (x - 10 - LEADER_PX)) < 0.01);
  assert.match(layout.labelTransform, /translate\(-100%, -50%\)$/, 'the near (right) edge at the anchor');
  assert.equal(layout.textAlign, 'right');
  // Just inside, it stays right.
  assert.deepEqual(affordanceLayout({ x: x - 2, y: 450 }, 10, VIEWPORT, false).direction, { x: 1, y: 0 });
});

test('top and bottom edges re-anchor toward the centre, and the leader keeps its length', () => {
  for (const [y, dy, shift] of [
    [EDGE_SHARE * VIEWPORT.height - 1, 1, '0%'],
    [(1 - EDGE_SHARE) * VIEWPORT.height + 1, -1, '-100%'],
  ] as const) {
    const layout = affordanceLayout({ x: 800, y }, 10, VIEWPORT, false);
    assert.equal(layout.direction.y, dy, `y ${y}: toward the centre`);
    const { from, to } = segment(layout.leaderPath);
    assert.ok(Math.abs(Math.hypot(to[0] - from[0], to[1] - from[1]) - LEADER_PX) < 0.05, 'the leader is still 56px');
    assert.ok(Math.abs(Math.hypot(from[0] - 800, from[1] - y) - 10) < 0.05, 'and starts on the Body’s edge');
    assert.ok(layout.labelTransform.endsWith(`, ${shift})`), `the near edge at the anchor: ${layout.labelTransform}`);
  }
});

test('a corner turns the label both ways, and a Body in the outer band has its anchor held at the inner bound', () => {
  const bounds = labelBounds(VIEWPORT, false);
  const corner = affordanceLayout({ x: VIEWPORT.width - 20, y: 10 }, 10, VIEWPORT, false);
  assert.deepEqual(corner.direction, { x: -1, y: 1 });
  assert.match(corner.labelTransform, /translate\(-100%, 0%\)$/);
  assert.equal(corner.textAlign, 'right');
  assert.deepEqual(corner.anchor, { x: bounds.right, y: bounds.top }, 'held at the inner corner');
  assert.ok(Math.abs(Math.hypot(corner.from.x - (VIEWPORT.width - 20), corner.from.y - 10) - 10) < 1e-9, 'still from the Body’s edge');
  // The left band: the default rightward anchor would land at 116px, inside the 192px band.
  const left = affordanceLayout({ x: 50, y: 450 }, 10, VIEWPORT, false);
  assert.deepEqual(left.direction, { x: 1, y: 0 });
  assert.equal(left.anchor.x, bounds.left);
  // The top band: the diagonal alone would anchor at about y = 50, inside the 108px band.
  assert.equal(affordanceLayout({ x: 800, y: 10 }, 8, VIEWPORT, false).anchor.y, bounds.top);
});

test('every label block lies inside the inner 76% of the frame, wherever on the frame its Body is', () => {
  // The point of the rule: the vignette never pulls a readable label below its floor.
  const box = { width: 260, height: 29 };
  const { left, right, top, bottom } = labelBounds(VIEWPORT, false);
  let swept = 0;
  for (let x = 0; x <= VIEWPORT.width; x += 37) {
    for (let y = 0; y <= VIEWPORT.height; y += 23) {
      const { anchor, direction } = affordanceLayout({ x, y }, 8, VIEWPORT, false, box);
      const blockLeft = direction.x < 0 ? anchor.x - box.width : anchor.x;
      const blockTop = direction.y > 0 ? anchor.y : direction.y < 0 ? anchor.y - box.height : anchor.y - box.height / 2;
      const at = `${x},${y}: block at ${blockLeft},${blockTop}`;
      assert.ok(blockLeft >= left - 1e-9, `${at} — past the left 12%`);
      assert.ok(blockLeft + box.width <= right + 1e-9, `${at} — past the right 12%`);
      assert.ok(blockTop >= top - 1e-9, `${at} — past the top 12%`);
      assert.ok(blockTop + box.height <= bottom + 1e-9, `${at} — past the bottom 12%`);
      swept += 1;
    }
  }
  assert.ok(swept > 1500, 'the sweep covers the whole frame, the outer band included');
});

test('a label whose block would cross the right bound goes left of the Body, its width counted', () => {
  const box = { width: 200, height: 29 };
  const bounds = labelBounds(VIEWPORT, false);
  // The anchor alone (x + 66) would be inside; the block (x + 66 + 200) would not.
  const x = bounds.right - 10 - LEADER_PX - box.width + 1;
  assert.deepEqual(affordanceLayout({ x, y: 450 }, 10, VIEWPORT, false, box).direction, { x: -1, y: 0 });
  assert.deepEqual(affordanceLayout({ x: x - 2, y: 450 }, 10, VIEWPORT, false, box).direction, { x: 1, y: 0 });
});

test('while a Project is Focused the panel’s edge is the right bound', () => {
  const width = VIEWPORT.width;
  assert.equal(labelBounds(VIEWPORT, true).right, (1 - panelFraction(width)) * width);
  assert.equal(labelBounds(VIEWPORT, false).right, (1 - EDGE_SHARE) * width);
  assert.equal(labelBounds({ width: 6000, height: 900 }, true).right, (1 - EDGE_SHARE) * 6000, 'the 12% band when it is the nearer');
  const box = { width: 200, height: 29 };
  const x = 800; // the block would end at 1066, past the 1040px panel edge, short of the 1408px band
  assert.deepEqual(affordanceLayout({ x, y: 450 }, 10, VIEWPORT, false, box).direction, { x: 1, y: 0 });
  const focused = affordanceLayout({ x, y: 450 }, 10, VIEWPORT, false, box, labelBounds(VIEWPORT, true));
  assert.deepEqual(focused.direction, { x: -1, y: 0 }, 'left of the Body, off the panel');
});

test('the label box is estimated from its text and the type roles, erring wide', () => {
  const short = labelBox({ title: 'A', secondary: 'B' });
  const long = labelBox({ title: 'A much longer project title', secondary: 'B' });
  assert.ok(long.width > short.width);
  const title = tokens.typography['scene-label-project'];
  const secondary = tokens.typography['scene-label-secondary'];
  const em = (spacing: string) => LABEL_CHAR_EM + Number.parseFloat(spacing);
  assert.ok(Math.abs(long.width - 27 * Number.parseFloat(title.fontSize) * em(title.letterSpacing)) < 1e-9);
  const height = Number.parseFloat(title.fontSize) * title.lineHeight + Number.parseFloat(secondary.fontSize) * secondary.lineHeight;
  assert.ok(Math.abs(short.height - height) < 1e-9, 'two line boxes tall');
  assert.ok(LABEL_CHAR_EM >= 0.55, 'no narrower than a Helvetica average glyph');
});

test('the leader starts on a Shallow Planet’s outline and beyond a Deep Planet’s Ring and Moon', () => {
  assert.equal(markPx({ isDeep: false }, 10), 10);
  assert.equal(markPx({}, 10), 10);
  for (const r of [1, 2, 4, 10, 40]) {
    const start = markPx({ isDeep: true }, r);
    const moon = { x: MOON_OFFSET_RATIO * r * Math.cos(MOON_ANGLE), y: MOON_OFFSET_RATIO * r * Math.sin(MOON_ANGLE) };
    const moonRadius = Math.max(MOON_RADIUS_RATIO * r, MOON_MIN_RADIUS_PX);
    assert.ok(start >= RING_RADIUS_RATIO * r, `r ${r}: outside the Ring`);
    // Every direction the leader can take: no point of it within the Moon's disc.
    for (const [dx, dy] of [[1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const n = Math.hypot(dx, dy);
      for (let t = start; t <= start + LEADER_PX; t += 0.25) {
        const d = Math.hypot((t * dx) / n - moon.x, (t * dy) / n - moon.y);
        assert.ok(d >= moonRadius - 1e-9, `r ${r}, (${dx}, ${dy}): the leader crosses the Moon at ${t}px`);
      }
    }
  }
});

test('the keyboard outline is a 1px stroke-focus square at a 3px offset; the pointer has none', () => {
  assert.equal(affordanceOutline(true), `1px solid ${tokens.colors['stroke-focus-dark']}`);
  assert.equal(affordanceOutline(false), 'none');
  assert.equal(OUTLINE_PX, 1);
  assert.equal(OUTLINE_OFFSET_PX, 3);
  assert.equal(affordanceBlockStyle().outlineOffset, '3px');
  const keyboard = affordanceLayout({ x: 800, y: 450 }, 10, VIEWPORT, true);
  const pointer = affordanceLayout({ x: 800, y: 450 }, 10, VIEWPORT, false);
  assert.deepEqual({ ...keyboard, outline: 'none' }, pointer, 'only the outline differs');
});

// --- The frame ---------------------------------------------------------------------------

test('the frame: rest hidden, Focused hidden, behind the camera hidden', () => {
  const camera = cameraAt(20);
  const bodies = [planet('project:a'), planet('project:b', { x: 4, y: 0, z: 0 }, true)];
  const frame = (nav: ApproachState, camera_ = camera) =>
    affordanceFrame(nav, ARTIFACT, bodies, camera_.matrixWorldInverse.elements, camera_.projectionMatrix.elements, VIEWPORT);
  assert.deepEqual(frame(REST), { visible: false });
  assert.deepEqual(frame({ ...REST, focusedProjectId: 'project:a', hoveredProjectId: 'project:a' }), { visible: false });
  const behind = cameraAt(-20);
  behind.lookAt(new Vector3(0, 0, -40));
  behind.updateMatrixWorld();
  assert.deepEqual(frame({ ...REST, hoveredProjectId: 'project:a' }, behind), { visible: false });
  const shown = frame({ ...REST, hoveredProjectId: 'project:a' });
  assert.equal(shown.visible, true);
  assert.ok(shown.visible);
  assert.equal(shown.projectId, 'project:a');
  assert.equal(shown.title, 'Alpha');
  assert.equal(shown.secondary, 'Developer · team of 6 · Shallow');
});

test('a Planet in front of the camera but off the frame draws nothing; one just inside does', () => {
  // At 20 units with a 50° fov and 16:9, the frame at z = 0 spans about ±16.6 × ±9.3.
  const camera = cameraAt(20);
  const at = (position: { x: number; y: number; z: number }) =>
    affordanceFrame(
      { ...REST, hoveredProjectId: 'project:a' },
      ARTIFACT,
      [planet('project:a', position)],
      camera.matrixWorldInverse.elements,
      camera.projectionMatrix.elements,
      VIEWPORT,
    );
  for (const [where, position] of [
    ['left', { x: -25, y: 0, z: 0 }],
    ['right', { x: 25, y: 0, z: 0 }],
    ['above', { x: 0, y: 15, z: 0 }],
    ['below', { x: 0, y: -15, z: 0 }],
  ] as const) {
    const screen = projectToScreen(position, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, VIEWPORT);
    assert.ok(screen !== null && screen.depth > 0, `${where}: in front of the camera`);
    assert.equal(onFrame(screen, VIEWPORT), false, `${where}: off the frame`);
    assert.deepEqual(at(position), { visible: false }, `${where}: hidden`);
  }
  for (const position of [
    { x: -16, y: 0, z: 0 },
    { x: 16, y: 0, z: 0 },
    { x: 0, y: 9, z: 0 },
    { x: 0, y: -9, z: 0 },
  ]) {
    assert.equal(at(position).visible, true, `${JSON.stringify(position)}: just inside, drawn`);
  }
  // The edges themselves are on the frame.
  assert.equal(onFrame({ x: 0, y: 0 }, VIEWPORT), true);
  assert.equal(onFrame({ x: VIEWPORT.width, y: VIEWPORT.height }, VIEWPORT), true);
  assert.equal(onFrame({ x: -0.01, y: 10 }, VIEWPORT), false);
  assert.equal(onFrame({ x: 10, y: VIEWPORT.height + 0.01 }, VIEWPORT), false);
});

test('the frame throws naming an approached ID with no Planet', () => {
  const camera = cameraAt(20);
  assert.throws(
    () => affordanceFrame({ ...REST, hoveredProjectId: 'project:zz' }, ARTIFACT, [], camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, VIEWPORT),
    /project:zz/,
  );
  // A Planet the artifact carries no Project for.
  assert.throws(
    () =>
      affordanceFrame({ ...REST, hoveredProjectId: 'project:zz' }, ARTIFACT, [planet('project:zz')], camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, VIEWPORT),
    /project:zz/,
  );
});

test('the frame places the leader from the projected centre, at the Body’s pixel radius, and the label at its end', () => {
  const camera = cameraAt(20);
  const V = camera.matrixWorldInverse.elements;
  const P = camera.projectionMatrix.elements;
  for (const [id, position, isDeep] of [
    ['project:a', { x: 3, y: -2, z: 0 }, false],
    ['project:b', { x: -4, y: 1, z: 2 }, true],
  ] as const) {
    const draw = affordanceFrame({ ...REST, hoveredProjectId: id }, ARTIFACT, [planet(id, position, isDeep)], V, P, VIEWPORT);
    assert.ok(draw.visible);
    // Measured with three, independently of the model's projection.
    const ndc = new Vector3(position.x, position.y, position.z).project(camera);
    const centre = { x: ((ndc.x + 1) / 2) * VIEWPORT.width, y: ((1 - ndc.y) / 2) * VIEWPORT.height };
    const rim = new Vector3(position.x, position.y + PLANET_RADIUS, position.z).project(camera);
    const r = ((rim.y - ndc.y) / 2) * VIEWPORT.height;
    const { from, to } = segment(draw.leaderPath);
    const start = isDeep ? Math.max(RING_RADIUS_RATIO * r, MOON_OFFSET_RATIO * r + Math.max(MOON_RADIUS_RATIO * r, MOON_MIN_RADIUS_PX)) : r;
    assert.ok(Math.abs(Math.hypot(from[0] - centre.x, from[1] - centre.y) - start) < 0.05, `${id}: the leader starts ${start}px out`);
    assert.ok(Math.abs(to[0] - (centre.x + start + LEADER_PX)) < 0.05 && Math.abs(to[1] - centre.y) < 0.05, `${id}: 56px further, level`);
    assert.equal(draw.labelTransform, `translate(${to[0]}px, ${to[1]}px) translate(0%, -50%)`, `${id}: the label at the leader’s end`);
  }
});

test('the frame takes the panel’s edge as the right bound only while a Project is Focused', () => {
  const camera = cameraAt(20);
  const V = camera.matrixWorldInverse.elements;
  const P = camera.projectionMatrix.elements;
  // Right of centre: its label would run under a Focused panel.
  const bodies = [planet('project:a', { x: 4, y: 0, z: 0 }), planet('project:b', { x: -4, y: 0, z: 0 }, true)];
  const free = affordanceFrame({ ...REST, hoveredProjectId: 'project:a' }, ARTIFACT, bodies, V, P, VIEWPORT);
  const focused = affordanceFrame({ ...REST, focusedProjectId: 'project:b', hoveredProjectId: 'project:a' }, ARTIFACT, bodies, V, P, VIEWPORT);
  assert.ok(free.visible && focused.visible);
  assert.equal(free.textAlign, 'left');
  assert.equal(focused.textAlign, 'right', 'left of the Body, off the panel');
});

test('a keyboard approach and the same Project hovered differ only in the label outline', () => {
  const { artifact, bodies } = committed();
  const camera = cameraAt(80);
  let drawn = 0;
  for (const body of bodies) {
    if (body.kind !== 'planet') continue;
    const frame = (nav: ApproachState) =>
      affordanceFrame(nav, artifact, bodies, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, VIEWPORT);
    const hovered = frame({ ...REST, hoveredProjectId: body.id });
    const keyed = frame({ ...REST, keyboardProjectId: body.id });
    assert.equal(hovered.visible, keyed.visible);
    if (!hovered.visible || !keyed.visible) continue;
    drawn += 1;
    assert.equal(hovered.outline, 'none');
    assert.equal(keyed.outline, affordanceOutline(true));
    assert.deepEqual({ ...keyed, outline: 'none' }, hovered, `${body.id}: title, secondary, leader and transform identical`);
  }
  assert.ok(drawn > 0, 'the committed Planets are in front of this camera');
});

test('over the committed artifact: every Planet approached draws one open leader and its own text, and a Shallow one carries no Ring or Moon', () => {
  const { artifact, bodies } = committed();
  const camera = cameraAt(120);
  let drawn = 0;
  for (const body of bodies) {
    if (body.kind !== 'planet') continue;
    const draw = affordanceFrame({ ...REST, hoveredProjectId: body.id }, artifact, bodies, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, VIEWPORT);
    if (!draw.visible) continue;
    drawn += 1;
    const { from, to } = segment(draw.leaderPath);
    assert.notDeepEqual(from, to, 'a segment, not a point');
    assert.doesNotMatch(draw.leaderPath, /[ZzAaCcQqSsTtHhVv]/, 'no close, arc or curve — no ring');
    const project = affordanceProject(artifact, body.id);
    assert.equal(draw.title, project.content.project);
    assert.ok(draw.secondary.endsWith(project.isDeep ? ' · Deep' : ' · Shallow'));
    if (body.isDeep !== true) {
      assert.deepEqual(notableRings(body), [], `${body.id}: approached Shallow, no Ring`);
      assert.deepEqual(notableMoons([body]), [], `${body.id}: approached Shallow, no Moon`);
    }
  }
  assert.ok(drawn > 0, 'the committed Planets are in front of this camera');
});

// --- Styles ---------------------------------------------------------------------------------

test('the label takes the type roles and the ink ladder; the leader the stroke ladder', () => {
  const title = affordanceTitleLabelStyle();
  const secondary = affordanceSecondaryLabelStyle();
  assert.equal(title.fontSize, tokens.typography['scene-label-project'].fontSize);
  assert.equal(title.letterSpacing, tokens.typography['scene-label-project'].letterSpacing);
  assert.equal(title.color, tokens.colors['ink-lift-dark']);
  assert.equal(secondary.fontSize, tokens.typography['scene-label-secondary'].fontSize);
  assert.equal(secondary.color, tokens.colors['ink-label-dark']);
  for (const style of [title, secondary]) assert.ok(style.fontWeight <= 300, 'no weight above 300');
  const leader = affordanceLeaderStyle();
  assert.equal(leader.stroke, tokens.colors['stroke-rest-dark']);
  assert.equal(leader.strokeWidth, 0.6);
  assert.equal(leader.fill, 'none');
  assert.equal(affordanceOverlayStyle().pointerEvents, 'none');
  assert.equal(affordanceBlockStyle().pointerEvents, 'none');
});

test('the overlay is pinned to the canvas’s centre and never hidden by drei', () => {
  assert.deepEqual(overlayOrigin(null, null, VIEWPORT), [800, 450]);
  assert.equal(keepOverlay(true), undefined);
});

// --- Writing a frame ---------------------------------------------------------------------------

function handles() {
  const written: string[] = [];
  const leader = {
    attributes: {} as Record<string, string>,
    style: { visibility: '' },
    setAttribute(name: string, value: string) {
      this.attributes[name] = value;
    },
  };
  const block = { style: { visibility: '', transform: '', textAlign: '', outline: '' } };
  const line = (name: string) => {
    let text: string | null = null;
    return {
      get textContent() {
        return text;
      },
      set textContent(value: string | null) {
        written.push(name);
        text = value;
      },
    };
  };
  return { leader, block, title: line('title'), secondary: line('secondary'), written };
}

test('a frame is written onto the handles, text only when it changes, and a hidden frame hides', () => {
  const h = handles();
  const draw: AffordanceDraw = {
    visible: true,
    projectId: 'p',
    title: 'Alpha',
    secondary: 'Developer · team of 6 · Shallow',
    leaderPath: 'M 1 2 L 3 4',
    labelTransform: 'translate(3px, 4px) translate(0%, -50%)',
    textAlign: 'left',
    outline: 'none',
  };
  applyAffordance(h, draw);
  assert.equal(h.leader.attributes.d, 'M 1 2 L 3 4');
  assert.equal(h.leader.style.visibility, 'visible');
  assert.deepEqual(h.block.style, { visibility: 'visible', transform: draw.labelTransform, textAlign: 'left', outline: 'none' });
  assert.equal(h.title.textContent, 'Alpha');
  assert.equal(h.secondary.textContent, 'Developer · team of 6 · Shallow');
  applyAffordance(h, draw);
  assert.deepEqual(h.written, ['title', 'secondary'], 'a still approach rewrites no text');
  // The keyboard's square, then the pointer's none again.
  applyAffordance(h, { ...draw, outline: affordanceOutline(true) });
  assert.equal(h.block.style.outline, affordanceOutline(true));
  applyAffordance(h, draw);
  assert.equal(h.block.style.outline, 'none');
  applyAffordance(h, { visible: false });
  assert.equal(h.leader.style.visibility, 'hidden');
  assert.equal(h.block.style.visibility, 'hidden');
  // Handles not mounted yet are skipped, and the mounted ones still take the frame.
  const partial = handles();
  assert.doesNotThrow(() => applyAffordance({ leader: null, block: undefined, title: null, secondary: null }, draw));
  applyAffordance({ leader: null, block: partial.block, title: partial.title, secondary: null }, draw);
  assert.equal(partial.block.style.transform, draw.labelTransform);
  assert.equal(partial.title.textContent, 'Alpha');
  assert.deepEqual(partial.written, ['title']);
});

// --- Purity -------------------------------------------------------------------------------------

/** The model's imports, globals and reads, as a pure function over its source. */
function auditAffordanceModel(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const failures: string[] = [];
  const allowed = new Set([
    '../shell/index-model.ts',
    '../shell/panel-model.ts',
    '../tokens/tokens.ts',
    './notable-model.ts',
    './stroke-model.ts',
    './scene-model.ts',
  ]);
  // `from` / `import` as a keyword, never as a quoted word (`Omit<…, 'from' | …>`).
  for (const match of code.matchAll(/(?:^|[^'"`\w])(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (!allowed.has(match[1] ?? '')) failures.push(`imports ${match[1]}`);
  }
  if (/\brequire\s*\(/.test(code)) failures.push('requires a module');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b|\bmatchMedia\b/.test(code)) failures.push('reads a DOM global');
  if (/new\s+Date\b|Date\s*\.\s*now|Math\s*\.\s*random/.test(code)) failures.push('reads a clock or randomness');
  if (/\bnavigationStore\b|\bgetState\b|\bsubscribe\b|\bsetState\b/.test(code)) failures.push('reaches the store — the state arrives as an argument');
  if (/\bsceneSubject\b|\bbodyStroke\b/.test(code)) failures.push('decides a Body’s stroke — that is the stroke model’s');
  const bare = code.replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, "''");
  if (/\.notable\b|\bduration\b|\bskills\b|\bluminanceBand\b|\bmass\b/.test(bare)) failures.push('reads a field the label does not show');
  if (/\.sort\s*\(/.test(code)) failures.push('sorts');
  // No closed shape: an SVG close (`Z` ending a path), or an arc or curve command
  // (`A`, `C`, `Q`, `S`, `T`) taking a coordinate, in any written path. The Ring's
  // proportion is read only to start the leader outside it.
  const shapes = /['"`][^'"`\n]*\b[ZzA]\s*['"`]|(?:^|[\s'"`])[AaCcQqSsTt]\s*(?:\$\{|-?\d)|\bcircle\b|\bellipse\b|\bring\w*\b/i;
  if (shapes.test(code.replace(/notableRings|RING_RADIUS_RATIO/g, ''))) {
    failures.push('draws a closed shape — the leader is one open segment');
  }
  // On the bare code, and on the strings too: a CSS `scale(…)` lives in a template literal.
  if (/\bscale\b|\bopacity\b|\bfilter\b/.test(bare) || /\bscale\w*\s*\(|\bopacity\s*:/.test(code)) failures.push('scales or fades — the approach is a stroke step, never an effect');
  return failures;
}

test('the affordance model imports the tokens, the index’s words, the panel’s width, the marks’ proportions, the stroke and scene models only, and reads no store, clock or DOM', () => {
  assert.deepEqual(auditAffordanceModel(readFileSync(MODEL_TS, 'utf8')), []);
});

test('the affordance model audit rejects each form it names', () => {
  for (const form of [
    "import { Vector3 } from 'three';",
    "import { navigationStore } from '../shell/state.ts';",
    "import { RESTING_BANDS } from '../derive/rules.ts';",
    'const w = window.innerWidth;',
    'const s = navigationStore.getState();',
    'const stroke = bodyStroke(body, null, id);',
    'const deep = project.content.notable !== null;',
    'const ids = bodies.sort();',
    "const path = `M ${a} ${b} L ${c} ${d} Z`;",
    "const path = `M ${a} ${b} Q ${c} ${d} ${e} ${f}`;",
    "const path = 'M 0 0 C 1 1 2 2 3 3';",
    "const path = `M ${a} ${b} a ${r} ${r} 0 1 0 ${c} ${d}`;",
    "const halo = { kind: 'circle' };",
    'const style = { opacity: 0.5 };',
    'const style = { transform: `scale(1.2)` };',
  ]) {
    assert.notDeepEqual(auditAffordanceModel(form), [], `${form} must be rejected`);
  }
  assert.deepEqual(auditAffordanceModel("import { bodyRadius } from './stroke-model.ts';\nconst d = `M ${a} ${b} L ${c} ${d}`;"), []);
});
