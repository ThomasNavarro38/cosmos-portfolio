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
  onFrame,
  overlayOrigin,
  projectToScreen,
  radiusPx,
  type AffordanceArtifact,
  type AffordanceDraw,
  type ApproachState,
} from './affordance-model.ts';
import { notableMoons, notableRings } from './notable-model.ts';
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
    for (const x of [800, VIEWPORT.width - 20]) {
      const layout = affordanceLayout({ x, y }, 10, VIEWPORT, false);
      assert.equal(layout.direction.y, dy, `y ${y}: toward the centre`);
      const { from, to } = segment(layout.leaderPath);
      assert.ok(Math.abs(Math.hypot(to[0] - from[0], to[1] - from[1]) - LEADER_PX) < 0.05, 'the leader is still 56px');
      assert.ok(Math.abs(Math.hypot(from[0] - x, from[1] - y) - 10) < 0.05, 'and starts on the Body’s edge');
      assert.ok(layout.labelTransform.endsWith(`, ${shift})`), `the near edge at the anchor: ${layout.labelTransform}`);
    }
  }
});

test('every anchor the rule produces is inside the inner 76% of the frame for a Body well inside it', () => {
  // The point of the rule: the vignette never pulls a readable label below its floor.
  const [left, right] = [EDGE_SHARE * VIEWPORT.width, (1 - EDGE_SHARE) * VIEWPORT.width];
  const [top, bottom] = [EDGE_SHARE * VIEWPORT.height, (1 - EDGE_SHARE) * VIEWPORT.height];
  let swept = 0;
  for (let x = left; x <= right; x += 37) {
    for (let y = top; y <= bottom; y += 23) {
      const { anchor } = affordanceLayout({ x, y }, 8, VIEWPORT, false);
      const at = `${x},${y}: anchor ${anchor.x},${anchor.y}`;
      assert.ok(anchor.x >= left - 1e-9, `${at} — past the left 12%`);
      assert.ok(anchor.x <= right + 1e-9, `${at} — past the right 12%`);
      assert.ok(anchor.y >= top - 1e-9, `${at} — past the top 12%`);
      assert.ok(anchor.y <= bottom + 1e-9, `${at} — past the bottom 12%`);
      swept += 1;
    }
  }
  assert.ok(swept > 500, 'the sweep covers the inner frame');
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
});

test('a keyboard approach and the same Project hovered differ only in the label outline', () => {
  const { artifact, bodies } = committed();
  const camera = cameraAt(80);
  for (const body of bodies) {
    if (body.kind !== 'planet') continue;
    const frame = (nav: ApproachState) =>
      affordanceFrame(nav, artifact, bodies, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, VIEWPORT);
    const hovered = frame({ ...REST, hoveredProjectId: body.id });
    const keyed = frame({ ...REST, keyboardProjectId: body.id });
    assert.equal(hovered.visible, keyed.visible);
    if (!hovered.visible || !keyed.visible) continue;
    assert.equal(hovered.outline, 'none');
    assert.equal(keyed.outline, affordanceOutline(true));
    assert.deepEqual({ ...keyed, outline: 'none' }, hovered, `${body.id}: title, secondary, leader and transform identical`);
  }
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
  applyAffordance(h, draw);
  assert.deepEqual(h.written, ['title', 'secondary'], 'a still approach rewrites no text');
  applyAffordance(h, { visible: false });
  assert.equal(h.leader.style.visibility, 'hidden');
  assert.equal(h.block.style.visibility, 'hidden');
  // Handles not mounted yet are skipped.
  applyAffordance({ leader: null, block: undefined, title: null, secondary: null }, draw);
});

// --- Purity -------------------------------------------------------------------------------------

/** The model's imports, globals and reads, as a pure function over its source. */
function auditAffordanceModel(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const failures: string[] = [];
  const allowed = new Set(['../shell/index-model.ts', '../tokens/tokens.ts', './stroke-model.ts', './scene-model.ts']);
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
  // No closed shape: an SVG close, arc or curve command in any written path.
  if (/['"`][^'"`\n]*\b[ZzA]\s*['"`]|\bcircle\b|\bellipse\b|\bring\w*\b/i.test(code.replace(/notableRings/g, ''))) {
    failures.push('draws a closed shape — the leader is one open segment');
  }
  // On the bare code, and on the strings too: a CSS `scale(…)` lives in a template literal.
  if (/\bscale\b|\bopacity\b|\bfilter\b/.test(bare) || /\bscale\w*\s*\(|\bopacity\s*:/.test(code)) failures.push('scales or fades — the approach is a stroke step, never an effect');
  return failures;
}

test('the affordance model imports the tokens, the index’s words, the stroke and scene models only, and reads no store, clock or DOM', () => {
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
    "const halo = { kind: 'circle' };",
    'const style = { opacity: 0.5 };',
    'const style = { transform: `scale(1.2)` };',
  ]) {
    assert.notDeepEqual(auditAffordanceModel(form), [], `${form} must be rejected`);
  }
  assert.deepEqual(auditAffordanceModel("import { bodyRadius } from './stroke-model.ts';\nconst d = `M ${a} ${b} L ${c} ${d}`;"), []);
});
