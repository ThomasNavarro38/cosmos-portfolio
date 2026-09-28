/**
 * Every AC-bearing rule of the scene, executed — and every ratchet that stands in
 * for what the runner cannot execute, driven over reconstructed violations.
 *
 * The committed artifact holds **one Client and one Project**, so the story's
 * cardinality criterion (~5–6 Stars, ~10 Planets) is unprovable against it. The
 * scene reads and never derives (AD-3), so no code here can close that gap — it is
 * a data question, recorded in `deferred-work.md`. What *is* provable is that
 * `buildScene` is correct at any cardinality, so the fixtures are built in memory:
 * a change to the committed data cannot make an assertion here vacuous, and this
 * suite tests the model rather than the artifact.
 *
 * **`three` is imported, and that is the point.** It loads cleanly under `node
 * --test` from inside this project, so frustum containment is *executed* against a
 * real `PerspectiveCamera` rather than re-derived. Axis-aligned arithmetic around
 * the camera's own `x`/`y` is what let Bodies ship off-frame twice: it is valid only
 * if the camera looks down `-z`, so it cannot observe the orientation being wrong.
 *
 * **Every source scan here is a pure function over source text, exercised against
 * strings that must be rejected as well as against the real file.** A negative scan
 * over a file that no longer contains the bad form cannot show the pattern still
 * catches it — the pattern rots into vacuity and the scan keeps passing. This repo
 * already learned that with `auditAria` in `index-model.test.ts`, and review proved
 * two predicted failures in this very story: `aria-hidden="false"` passed an ARIA
 * scan keyed on the attribute's presence, and a drei `<Line>` passed a connector ban
 * keyed on lowercase intrinsics, each at full green.
 */

import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Frustum, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { DUST_PARTICLE_RADIUS } from './dust-model.ts';
import {
  BODY_MARGIN,
  DEFAULT_FOV,
  NARROWEST_ASPECT,
  buildScene,
  frameBodies,
  type Body,
  type SceneBodiesArtifact,
  type SceneArtifactClient,
  type SceneArtifactProject,
} from './scene-model.ts';

const SCENE_DIR = fileURLToPath(new URL('.', import.meta.url));
const MODEL_TS = fileURLToPath(new URL('./scene-model.ts', import.meta.url));
const DUST_TS = fileURLToPath(new URL('./dust-model.ts', import.meta.url));
const SCENE_TSX = fileURLToPath(new URL('./scene.tsx', import.meta.url));
const RAIL_MODEL_TS = fileURLToPath(new URL('./rail-model.ts', import.meta.url));
const RAIL_CAMERA_TSX = fileURLToPath(new URL('./rail-camera.tsx', import.meta.url));
const SRC_ROOT = fileURLToPath(new URL('../', import.meta.url));
const SCENE_HOST_TSX = fileURLToPath(new URL('../shell/scene-host.tsx', import.meta.url));
const APP_TSX = fileURLToPath(new URL('../App.tsx', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));

/**
 * Source with comments **and string literals** blanked, preserving line count.
 *
 * Both, not comments alone: `checkImportBoundaries` blanks both via
 * `stripCommentsAndStrings` precisely because a forbidden token inside a string is
 * not a use of it, and a scan here that stripped only comments would report a
 * baffling failure the first time a message mentioned a banned word. `src/derive/`
 * is not importable from this directory, so the idiom is carried rather than reused.
 *
 * JSX comments (`{/* … *\/}`) reduce to `{}` rather than to nothing, so a scan
 * reasoning about brace placement reads a mutated tree — stated because no scan
 * below does, and the next one that wants to must not assume otherwise.
 */
function codeOf(path: string): string {
  return blankProse(readFileSync(path, 'utf8'));
}

/** The same blanking, over a string, so a reconstructed form is treated like a file. */
function blankProse(source: string): string {
  return blankComments(source).replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, (match) =>
    match.replace(/[^\n]/g, ' '),
  );
}

/**
 * Comments blanked, **string literals kept** — for the scans whose subject *is* a
 * string.
 *
 * An import specifier, an `aria-hidden="true"` value and a `kind === 'star'`
 * comparison all live inside quotes, so blanking string bodies erases the very thing
 * those scans assert. `stripCommentsAndStrings` blanks both because it is looking for
 * a forbidden *token*, where a mention in a string is not a use; here the string is
 * the evidence. Two strippers, each named for what it keeps, rather than one that is
 * wrong for half its callers.
 */
function blankComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (match) => ' '.repeat(match.length));
}

/** A file with its comments blanked and its string literals intact. */
function quotedCodeOf(path: string): string {
  return blankComments(readFileSync(path, 'utf8'));
}

// --- Fixtures ---------------------------------------------------------------

function at(x: number, y = 0, z = 0) {
  return { x, y, z };
}

function project(
  id: string,
  clientId: string,
  position = at(1),
  overrides: Partial<SceneArtifactProject> = {},
): SceneArtifactProject {
  return {
    id,
    clientId,
    isDeep: false,
    mass: 2,
    luminanceBand: 'stroke-near',
    moteTier: 'mote-sparse',
    position,
    ...overrides,
  };
}

function client(
  id: string,
  position: { x: number; y: number; z: number },
  ...projects: SceneArtifactProject[]
): SceneArtifactClient {
  return { id, position, projects };
}

/**
 * Five Clients and ten Projects — the ~15–16 Body case authored data cannot reach.
 *
 * The distribution is **uneven** (3/1/2/1/3) on purpose: an even `k` per Client
 * would let a model emitting `clients.length * k` Bodies land on fifteen by
 * accident, and a Star-per-Client count would be unseparable from a
 * Planets-per-Client one. Positions are spread on `x` and `y` so the framing has a
 * real extent to fit rather than a degenerate point.
 */
function fiveClients(): SceneBodiesArtifact {
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

/** The committed artifact, read once, typed against the model's own restatement. */
function committedArtifact(): SceneBodiesArtifact {
  return JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as SceneBodiesArtifact;
}

const idsOf = (artifact: SceneBodiesArtifact): string[] => buildScene(artifact).bodies.map((body) => body.id);

// --- The fixture guard ------------------------------------------------------

test('the multi-Client fixture is genuinely 5 and 10 and unevenly distributed, or the cardinality case is vacuous', () => {
  // Asserted first and separately. A fixture that drifted to an even distribution
  // would let a model multiplying by a constant pass every count below while
  // pinning nothing about whether it walks Projects at all.
  const artifact = fiveClients();
  assert.equal(artifact.clients.length, 5, 'five Clients');
  const counts = artifact.clients.map((entry) => entry.projects.length);
  assert.equal(
    counts.reduce((sum, n) => sum + n, 0),
    10,
    'ten Projects',
  );
  assert.ok(new Set(counts).size > 1, 'unevenly distributed — an even k lets clients.length * k pass by accident');
});

// --- Matrix row: nominal cardinality ---------------------------------------

test('N Clients and ΣP Projects yield exactly N + ΣP Bodies, one Star each and one Planet each', () => {
  // The story's first acceptance criterion, at the cardinality the AC names and the
  // authored data cannot produce: 5 Stars, 10 Planets, 15 Bodies, no more.
  const { bodies } = buildScene(fiveClients());
  assert.equal(bodies.length, 15, 'N + ΣP and nothing else');
  assert.equal(bodies.filter((body) => body.kind === 'star').length, 5, 'one Star per Client');
  assert.equal(bodies.filter((body) => body.kind === 'planet').length, 10, 'one Planet per Project');
  assert.deepEqual(
    [...new Set(bodies.map((body) => body.kind))].sort(),
    ['planet', 'star'],
    'and no third kind of Body',
  );
});

test('the committed artifact yields one Star and one Planet — the shape shipping today', () => {
  // Degenerate on cardinality but not on structure, and it is what a visitor
  // actually sees. A model keyed on there being more than one of anything would
  // only fail once real career content landed.
  const { bodies } = buildScene(committedArtifact());
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies.map((body) => body.kind), ['star', 'planet']);
});

test('an artifact with no Clients yields no Bodies rather than throwing', () => {
  // Not a shape the pipeline emits, but the model runs on every render: throwing
  // here would take the scene down for a document problem the gate already reports.
  // `buildScene` throws on documents that are *wrong*; an empty one is merely empty.
  assert.deepEqual(buildScene({ clients: [] }), { bodies: [] });
});

// --- Matrix row: Body identity ---------------------------------------------

test('every Body carries its entity ID verbatim, and a Planet names the Star it orbits', () => {
  // The ID is the one handle every surface shares — the index, the store and the
  // scene all name a destination the same way. A re-slugified or prefixed ID here
  // would be a second identity derivation.
  const artifact = fiveClients();
  const { bodies } = buildScene(artifact);

  const emitted = [
    ...artifact.clients.map((entry) => entry.id),
    ...artifact.clients.flatMap((entry) => entry.projects.map((p) => p.id)),
  ];
  assert.deepEqual(
    [...bodies.map((body) => body.id)].sort(),
    [...emitted].sort(),
    'the scene addresses exactly what the artifact carries',
  );

  for (const body of bodies) {
    if (body.kind === 'planet') {
      assert.equal(typeof body.clientId, 'string', 'a Planet carries its Client');
      assert.ok(
        artifact.clients.some((entry) => entry.id === body.clientId),
        `${body.id} names a Client the artifact carries`,
      );
    } else {
      assert.equal(body.clientId, undefined, 'a Star orbits nothing');
    }
  }
});

test('a Planet carries the clientId field, not the Client it happens to be nested under', () => {
  // The field is what every other consumer resolves a Planet's Star by, so reading
  // the traversal instead would make this surface the only one that disagrees. Handed
  // a document where the two differ, the model must follow the field.
  //
  // Note what this does *not* claim: nothing in `src/derive/` cross-checks
  // `project.clientId` against the Client it is nested under, so a Planet can claim
  // to orbit a Star it is not beneath — recorded in `deferred-work.md`. What is
  // pinned here is which of the two this model reads.
  const { bodies } = buildScene({
    clients: [client('client:a', at(0), project('project:a/1', 'client:elsewhere', at(2)))],
  });
  assert.equal(bodies[1]?.clientId, 'client:elsewhere', 'the field wins, because it is the shared handle');
});

test('a Star has no mass, band, tier or depth, because the artifact resolves none for a Client', () => {
  // Summing a Star's Planets to invent a mass would be a fourth mapping rule in the
  // one directory forbidden to hold any (AD-3). The absence is the honest shape.
  const [star] = buildScene(fiveClients()).bodies;
  assert.ok(star !== undefined && star.kind === 'star');
  assert.equal(star.mass, undefined, 'mass is solved per Project, never per Client');
  assert.equal(star.luminanceBand, undefined);
  assert.equal(star.moteTier, undefined);
  assert.equal(star.isDeep, undefined);
});

// --- Matrix row: positions and derived properties are read, never computed ---

test('every Body sits at the artifact’s solved position, carried through unchanged', () => {
  // AD-3 at its most literal: the solver decided where these go, and the scene's
  // whole job is to put them there. A model that re-laid-out anything would pass
  // every count above while drawing a different shape.
  const artifact = fiveClients();
  const byId = new Map(buildScene(artifact).bodies.map((body) => [body.id, body]));

  for (const entry of artifact.clients) {
    assert.deepEqual(byId.get(entry.id)?.position, entry.position, `${entry.id} is where it was solved`);
    for (const p of entry.projects) {
      assert.deepEqual(byId.get(p.id)?.position, p.position, `${p.id} is where it was solved`);
    }
  }
});

test('a Planet’s mass, band, tier and depth are the artifact’s values, not recomputed ones', () => {
  // Handed values that contradict what any plausible re-derivation would conclude —
  // a `mass` of 99 on a Shallow Project with a near band — the model must carry them.
  // `entities.ts` is the single derivation point; a second one here is exactly the
  // divergence AD-3 exists to prevent, and it would be invisible until they disagreed.
  const { bodies } = buildScene({
    clients: [
      client(
        'client:a',
        at(0),
        project('project:a/1', 'client:a', at(2), {
          mass: 99,
          luminanceBand: 'stroke-far',
          moteTier: 'mote-dense',
          isDeep: true,
        }),
      ),
    ],
  });
  const planet = bodies[1];
  assert.ok(planet !== undefined);
  assert.equal(planet.mass, 99, 'the artifact’s mass wins, because it is the only one');
  assert.equal(planet.luminanceBand, 'stroke-far');
  assert.equal(planet.moteTier, 'mote-dense');
  assert.equal(planet.isDeep, true);
});

// --- Matrix row: ordering is the artifact's ---------------------------------

test('Bodies come out in clients[] order, each Star before its own Planets', () => {
  // The derive layer owns every ordering rule (AD-3). A sort here would be a second
  // one nobody is watching, and it would keep agreeing with the artifact's right up
  // until it did not.
  assert.deepEqual(idsOf(fiveClients()), [
    'client:a',
    'project:a/1',
    'project:a/2',
    'project:a/3',
    'client:b',
    'project:b/1',
    'client:c',
    'project:c/1',
    'project:c/2',
    'client:d',
    'project:d/1',
    'client:e',
    'project:e/1',
    'project:e/2',
    'project:e/3',
  ]);
});

test('reversing the artifact’s order reverses the Bodies, so no hidden sort survives', () => {
  // The fixture that makes a hidden sort separable. A model sorting by ID would emit
  // the same list from both documents; one reading the artifact emits two different
  // ones. Both directions are asserted, because "the order changed" alone would pass
  // for a model that sorted descending.
  const artifact = fiveClients();
  const reversed: SceneBodiesArtifact = {
    clients: [...artifact.clients].reverse().map((entry) => ({
      ...entry,
      projects: [...entry.projects].reverse(),
    })),
  };

  const forward = idsOf(artifact);
  const backward = idsOf(reversed);
  assert.notDeepEqual(backward, forward, 'the artifact’s order genuinely reaches the list');
  assert.deepEqual(
    backward.filter((id) => id.startsWith('client:')),
    forward.filter((id) => id.startsWith('client:')).reverse(),
    'Clients follow the array',
  );
  assert.equal(backward[0], 'client:e', 'and the first Star is the first Client in the document');
  assert.deepEqual(backward.slice(1, 4), ['project:e/3', 'project:e/2', 'project:e/1'], 'its own Planets after it');
});

// --- Matrix row: Company is an attribute -----------------------------------

test('a Project with a company adds no Body, and the count is unchanged', () => {
  // Company is an attribute of the work, not an entity in the graph — `entities.ts`
  // resolved that, and this model inherits it by not reading the field. Asserted as
  // a *difference* against the same document without the field, so the test fails if
  // a Company ever starts producing a mesh.
  const bare = fiveClients();
  const withCompany: SceneBodiesArtifact = {
    clients: bare.clients.map((entry) => ({
      ...entry,
      projects: entry.projects.map((p) => ({ ...p, content: { company: 'Some Consultancy' } })),
    })) as readonly SceneArtifactClient[],
  };

  assert.equal(buildScene(withCompany).bodies.length, buildScene(bare).bodies.length, 'no additional Body');
  assert.deepEqual(idsOf(withCompany), idsOf(bare), 'and no additional ID');
});

// --- Matrix row: the duplicate-ID guard ------------------------------------

test('a duplicate entity ID throws naming the duplicated ID', () => {
  // Two Bodies at one ID draw two coincident meshes and hand React two siblings
  // sharing a key: visually it reads as one Body, so the document is wrong and the
  // surface looks right. The gate rejects such a document, so reaching here means it
  // was hand-edited past the build — and silence is the one failure mode worse than
  // a throw.
  const twoStars: SceneBodiesArtifact = {
    clients: [client('client:a', at(0)), client('client:a', at(5))],
  };
  assert.throws(() => buildScene(twoStars), /client:a/, 'the offending ID is named');

  const starAndPlanet: SceneBodiesArtifact = {
    clients: [client('client:a', at(0), project('client:a', 'client:a', at(2)))],
  };
  assert.throws(() => buildScene(starAndPlanet), /client:a/, 'a Star and a Planet colliding is the same failure');

  const twoPlanets: SceneBodiesArtifact = {
    clients: [
      client('client:a', at(0), project('project:dup', 'client:a', at(2))),
      client('client:b', at(9), project('project:dup', 'client:b', at(11))),
    ],
  };
  assert.throws(() => buildScene(twoPlanets), /project:dup/, 'across Clients too');
});

test('distinct IDs at the same coordinate are accepted — the guard is on identity, not on position', () => {
  // The other direction, and it matters: two Bodies genuinely solved to one point is
  // a solver question, not a document error, and a guard that rejected it would make
  // the model refuse a legal artifact.
  assert.equal(
    buildScene({
      clients: [client('client:a', at(0), project('project:a/1', 'client:a', at(0)))],
    }).bodies.length,
    2,
  );
});

// --- Matrix row: the non-finite-coordinate guard ---------------------------

test('a non-finite coordinate throws naming the entity and the axis', () => {
  // `JSON.stringify` writes `NaN` and `Infinity` as `null`, and arithmetic on an
  // undefined offset produces `NaN` — either way an unguarded coordinate places a
  // Body nowhere, in silence. Every axis and every non-finite value, on a Star and on
  // a Planet, because a guard that held for one axis would read as coverage.
  for (const axis of ['x', 'y', 'z'] as const) {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const broken = { ...at(1), [axis]: value };

      assert.throws(
        () => buildScene({ clients: [client('client:bad', broken)] }),
        (error: Error) =>
          /client:bad/.test(error.message) && new RegExp(`\\b${axis}\\b`).test(error.message),
        `a Star's ${axis} = ${String(value)} must name the entity and the axis`,
      );

      assert.throws(
        () => buildScene({ clients: [client('client:a', at(0), project('project:bad', 'client:a', broken))] }),
        (error: Error) =>
          /project:bad/.test(error.message) && new RegExp(`\\b${axis}\\b`).test(error.message),
        `a Planet's ${axis} = ${String(value)} must name the entity and the axis`,
      );
    }
  }
});

test('a coordinate that is legitimately zero or negative is accepted', () => {
  // The guard is finiteness, not sign and not truthiness. `!position.x` would reject
  // the origin — which is exactly where the committed Client sits.
  assert.equal(
    buildScene({ clients: [client('client:a', at(0, -0, -12), project('project:a/1', 'client:a', at(-3, 0, 0)))] })
      .bodies.length,
    2,
  );
});

// --- Invariance -------------------------------------------------------------

test('the Body list is identical across repeated builds and never mutates the artifact', () => {
  // The model is called on every render, so two calls must agree and neither may
  // disturb what it was handed. A model that sorted the artifact's own arrays in
  // place would re-order the document for every later reader, including the index.
  const artifact = fiveClients();
  const before = JSON.stringify(artifact);
  const first = buildScene(artifact);
  const second = buildScene(artifact);

  assert.deepEqual(second, first, 'two builds of one artifact must agree exactly');
  assert.equal(JSON.stringify(artifact), before, 'and the artifact must come back unchanged');
  assert.notEqual(second, first, 'each call returns a fresh structure, never a shared cache');
});

// --- The framing ------------------------------------------------------------

/**
 * A real camera at the framing, built the way the renderer builds it.
 *
 * Position **and rotation** from the model, `near` and `far` from the model, aspect
 * at `NARROWEST_ASPECT`. Nothing is defaulted, because a frustum half-chosen by a
 * dependency's defaults is a frustum no test can assert — and the orientation
 * specifically is what shipped wrong twice.
 */
function cameraAt(bodies: readonly Body[], aim?: Vector3): { camera: PerspectiveCamera; frustum: Frustum } {
  const framing = frameBodies(bodies);
  const camera = new PerspectiveCamera(framing.fov, NARROWEST_ASPECT, framing.near, framing.far);
  camera.position.set(framing.position.x, framing.position.y, framing.position.z);
  camera.rotation.set(framing.rotation.x, framing.rotation.y, framing.rotation.z);
  // Only when a test deliberately aims somewhere else, which is the negative control.
  if (aim !== undefined) camera.lookAt(aim);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const frustum = new Frustum().setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  );
  return { camera, frustum };
}

const outsideOf = (frustum: Frustum, bodies: readonly Body[]): string[] =>
  bodies
    .filter((body) => !frustum.containsPoint(new Vector3(body.position.x, body.position.y, body.position.z)))
    .map((body) => body.id);

test('every Body in the committed artifact is inside a real camera’s frustum at the narrowest aspect', () => {
  // The story's own acceptance, executed rather than re-derived: a `three`
  // `PerspectiveCamera` at the framing's position *and rotation*, and
  // `Frustum.containsPoint` per Body. A Body solved off-frame is a Body the visitor
  // cannot see, and this shipped twice — first through a vertical-only fit, then
  // through the aim.
  const { bodies } = buildScene(committedArtifact());
  const { frustum } = cameraAt(bodies);
  assert.deepEqual(outsideOf(frustum, bodies), [], 'the surface that ships must show what it draws');
});

test('the same containment holds for the five-Client fixture, so the fit is not the one artifact’s luck', () => {
  // The framing is computed from the Bodies, so it must hold at a cardinality and an
  // extent the committed data does not reach. Fifteen Bodies spread across 80 units
  // of `x` is where a constant distance fails.
  const { bodies } = buildScene(fiveClients());
  const { frustum } = cameraAt(bodies);
  assert.deepEqual(outsideOf(frustum, bodies), []);
});

test('the containment assertion fails when the camera is aimed at the origin instead, so it observes the aim', () => {
  // **The negative control, and the reason this test file imports `three` at all.**
  // R3F calls `camera.lookAt(0, 0, 0)` whenever the `camera` prop carries no
  // `rotation`, so the shipped camera aimed at the world origin rather than at the
  // Bodies' centre and the committed Planet fell outside the frustum with all 488
  // tests green. An axis-aligned containment check around the camera's own `x`/`y` is
  // valid only if the camera looks down `-z`, so it could not see that.
  //
  // Asserted over the committed artifact because that is the document where the bug
  // was real: centre `[5, 0, …]`, so aiming at the origin is off by five units and
  // the Planet at `x: 10` leaves the frustum.
  const { bodies } = buildScene(committedArtifact());
  const { frustum } = cameraAt(bodies, new Vector3(0, 0, 0));
  assert.notDeepEqual(
    outsideOf(frustum, bodies),
    [],
    'aiming at the origin must lose a Body — otherwise this suite cannot tell the aim apart',
  );
});

test('the framing names an explicit rotation, because an omitted one is what R3F fills in with lookAt(0,0,0)', () => {
  // Pinned positively: a negative scan cannot observe a correct value going missing,
  // and "returns a target the renderer does not apply" is precisely what shipped.
  const framing = frameBodies(buildScene(fiveClients()).bodies);
  assert.deepEqual(framing.rotation, { x: 0, y: 0, z: 0 }, 'unrotated, which looks down -z');
  assert.ok(Number.isFinite(framing.near) && framing.near > 0, 'a near plane of its own, not a default');
  assert.ok(framing.far > framing.near, 'and a far plane behind it');
});

test('the camera stands at the Bodies’ centre in x and y, which is what makes an unrotated aim correct', () => {
  // The relation the rotation depends on. `rotation: [0,0,0]` aims down `-z`, so it
  // aims at the centre only if the camera shares the centre's `x` and `y` — move the
  // camera off that line and the explicit rotation becomes as wrong as the default
  // was. Asserted on an artifact whose centre is neither the origin nor on an axis.
  const artifact: SceneBodiesArtifact = {
    clients: [client('client:a', at(10, 4)), client('client:b', at(30, 12))],
  };
  const bodies = buildScene(artifact).bodies;
  const framing = frameBodies(bodies);
  assert.equal(framing.position.x, 20, 'midway in x');
  assert.equal(framing.position.y, 8, 'midway in y');
  assert.ok(framing.position.z > 12, 'and standing back from the furthest Body');
});

test('the framing’s target is the Bodies’ centre, and looking at it from the position is the rotation', () => {
  // Keyframe 0 of the Rail aims by `lookAt(target)`; the camera prop aims by
  // `rotation`. The two must be one aim, or the rig's first frame turns the camera.
  // Pinned through a real camera: `lookAt(target)` must leave it unrotated.
  for (const artifact of [fiveClients(), committedArtifact()]) {
    const framing = frameBodies(buildScene(artifact).bodies);
    const camera = new PerspectiveCamera(framing.fov, 1, framing.near, framing.far);
    camera.position.set(framing.position.x, framing.position.y, framing.position.z);
    camera.lookAt(framing.target.x, framing.target.y, framing.target.z);
    assert.ok(camera.quaternion.angleTo(new Quaternion()) < 1e-9, 'looking at the target is rotation [0, 0, 0]');
  }
  const framing = frameBodies(
    buildScene({ clients: [client('client:a', at(10, 4, -2)), client('client:b', at(30, 12, 6))] }).bodies,
  );
  assert.deepEqual(framing.target, { x: 20, y: 8, z: 2 }, 'the centre in all three axes, read off the Bodies');
});

test('the horizontal fit decides when the extent is wide, which vertical-only framing could not', () => {
  // Three derives the horizontal field of view from the vertical one times the
  // viewport aspect, so a portrait viewport narrows the `x` axis — the axis the Rail
  // runs along. A vertical-only fit lost the committed Planet at 390 × 844 with the
  // whole suite green.
  //
  // The mutation this catches: dropping the `Math.max` and keeping the vertical term.
  // So the assertion is that the distance *exceeds* the vertical fit on a wide,
  // flat artifact, by the factor the aspect implies.
  const flatAndWide = buildScene({
    clients: [client('client:a', at(-50, 0)), client('client:b', at(50, 0))],
  }).bodies;
  const framing = frameBodies(flatAndWide);

  const tangent = Math.tan((DEFAULT_FOV * Math.PI) / 360);
  const verticalOnly = BODY_MARGIN / tangent;
  assert.ok(
    framing.position.z > verticalOnly * 5,
    `a wide artifact must be framed by its width, not its height — got ${framing.position.z}`,
  );

  const { frustum } = cameraAt(flatAndWide);
  assert.deepEqual(outsideOf(frustum, flatAndWide), [], 'and the outermost Bodies are inside at the narrowest aspect');
});

test('the framing is computed from the Bodies, not from a constant', () => {
  // A hard-coded distance framed the one committed Planet by luck and would lose the
  // first Body solved beyond it. Moving a Body must move the camera.
  const near = frameBodies(buildScene({ clients: [client('client:a', at(0))] }).bodies);
  const far = frameBodies(
    buildScene({ clients: [client('client:a', at(0)), client('client:b', at(500, 300))] }).bodies,
  );
  assert.ok(far.position.z > near.position.z * 2, 'a larger extent must be framed from further back');
  assert.notEqual(far.position.x, near.position.x, 'and centred on where the Bodies actually are');
});

test('an empty Body list and a degenerate fov both yield a usable camera rather than NaN or infinity', () => {
  // `Math.min()` of nothing is `Infinity` and `Math.tan` of a half-turn is unbounded,
  // so both cases produce a camera at infinity if they are answered after the
  // arithmetic instead of before it. A `NaN` position renders nothing and reports
  // nothing, which is the failure this whole story is about.
  const empty = frameBodies([]);
  for (const value of [empty.position.x, empty.position.y, empty.position.z, empty.far]) {
    assert.ok(Number.isFinite(value), `${value} must be finite`);
  }
  assert.ok(empty.position.z > 0, 'and the camera stands somewhere rather than inside the origin');

  const bodies = buildScene(fiveClients()).bodies;
  for (const fov of [0, -10, 180, 360, Number.NaN]) {
    const framing = frameBodies(bodies, fov);
    assert.ok(Number.isFinite(framing.position.z), `fov ${fov} must not place the camera at infinity`);
    assert.ok(framing.position.z > 0, `fov ${fov} must still stand the camera back`);
  }
});

test('the margin the framing leaves is at least the largest radius the renderer draws', () => {
  // `BODY_MARGIN` lives in this model and `STAR_RADIUS` in `scene.tsx`, two files the
  // runner cannot cross: the model is `.ts` and the renderer is `.tsx`, which
  // `node --test` cannot load in any position. So the renderer's constant is read off
  // its source and compared. Safe at 3 > 1 today and silently wrong the moment Epic 3
  // raises the radius — which is exactly the kind of coupling that survives a review
  // and fails in a browser.
  const code = quotedCodeOf(SCENE_TSX);
  const radii = [...code.matchAll(/\b(?:STAR_RADIUS|PLANET_RADIUS)\s*=\s*([\d.]+)/g)].map((match) =>
    Number(match[1]),
  );
  assert.equal(radii.length, 2, `both placeholder radii must be declared as literals — found ${radii.length}`);
  for (const radius of radii) {
    assert.ok(
      radius <= BODY_MARGIN,
      `BODY_MARGIN (${BODY_MARGIN}) must cover the drawn radius ${radius}, or the outermost Body clips`,
    );
    // Particles are kept `BODY_MARGIN` from a Body's *centre*. This makes that a
    // clearance between *surfaces*: no particle sphere touches a Body sphere.
    assert.ok(
      radius + DUST_PARTICLE_RADIUS <= BODY_MARGIN,
      `BODY_MARGIN (${BODY_MARGIN}) must cover the radius ${radius} plus a particle's ${DUST_PARTICLE_RADIUS}`,
    );
  }
});

// --- The model derives nothing, structurally -------------------------------

test('the model imports nothing at all, which is what makes AD-3 structural', () => {
  // Stronger than any ban list and the reason the bans below are cheap: a module with
  // no imports cannot reach `src/data/`, cannot reach `src/derive/`, cannot reach the
  // solver, cannot reach Three and cannot reach React. Asserted as the absence of
  // *any* import rather than as the absence of the ones anyone thought of.
  const code = codeOf(MODEL_TS);
  assert.doesNotMatch(code, /^\s*import\b/m, 'scene-model.ts imports nothing — keep it that way');
  assert.doesNotMatch(code, /\bimport\s*\(/, 'and reaches nothing dynamically either');
  assert.doesNotMatch(code, /\brequire\s*\(/, 'nor through require');
});

test('the model derives no ordering, runs no simulation, and reads no authored field as an input', () => {
  // AD-3, read off the source: a `.sort(` here would be an ordering rule in the one
  // directory forbidden to hold any, and it would keep passing every assertion above
  // for as long as it happened to agree with the artifact's.
  const code = codeOf(MODEL_TS);
  assert.doesNotMatch(code, /\.sort\s*\(/, 'the scene must not sort — the derive layer owns every ordering');
  assert.doesNotMatch(code, /forceSimulation|forceManyBody|forceLink|forceCenter/, 'no force simulation');
  assert.doesNotMatch(code, /\bduration\b|\bnotable\b|\bweight\b|\bskills\b|\bteam_size\b/, 'no authored field read');
  assert.doesNotMatch(code, /\bwindow\b|\bdocument\b|\bnavigator\b/, 'no DOM global');
  assert.doesNotMatch(code, /new\s+Date\b|Date\s*\.\s*now|Math\s*\.\s*random/, 'no clock, no randomness');
  assert.doesNotMatch(code, /node:fs|readFileSync|process\s*\./, 'no I/O, no environment');
});

/**
 * The imports a module under `src/render-scene/` may not hold, as a pure function.
 *
 * `src/data/` and `src/derive/` are boundary rows too — this is the second lock, and
 * it exists because the row is evaluated by the gate while this is evaluated by the
 * suite, and the two fail at different times for different readers.
 */
function auditForbiddenImports(code: string): string[] {
  const failures: string[] = [];
  if (/from\s*['"]\.\.\/data\//.test(code) || /import\s*\(\s*['"]\.\.\/data\//.test(code)) {
    failures.push('imports src/data/ — only src/derive/ may reach the authored source (AD-3)');
  }
  if (/from\s*['"]\.\.\/derive\//.test(code) || /import\s*\(\s*['"]\.\.\/derive\//.test(code)) {
    failures.push('imports src/derive/ — not even for a type; the parser counts a type-only edge');
  }
  if (/['"]d3-force-3d['"]/.test(code)) failures.push('imports d3-force-3d — the scene runs no simulation');
  if (/['"]zustand\/react['"]|['"]zustand\/react\//.test(code)) {
    failures.push('imports zustand/react — a frame callback reads getState(), never a hook binding');
  }
  return failures;
}

test('no module here imports src/data/, src/derive/, the solver, or zustand/react', () => {
  // The audit over the real files, and the reason the `zustand/react` clause is a
  // scan rather than a boundary row: `packageOf` reduces every bare specifier to its
  // package, so `zustand/react` and `zustand/vanilla` are both `zustand`, and a row
  // banning `zustand` would reject the navigation store this directory's README
  // explicitly permits.
  for (const path of [MODEL_TS, DUST_TS, SCENE_TSX, RAIL_MODEL_TS, RAIL_CAMERA_TSX]) {
    assert.deepEqual(auditForbiddenImports(readFileSync(path, 'utf8')), [], `${path} must hold no forbidden import`);
  }
});

test('the forbidden-import audit rejects each form, so it is a ratchet rather than a formality', () => {
  // Driven over reconstructed forms. A scan that has only ever run over a clean file
  // proves nothing about what it would reject.
  for (const form of [
    "import { CareerSchema } from '../data/schema.ts';",
    "import type { Artifact } from '../derive/artifact-schema.ts';",
    "const d = await import('../data/career.json');",
    "import { forceSimulation } from 'd3-force-3d';",
    "import { useStore } from 'zustand/react';",
    "import { useShallow } from 'zustand/react/shallow';",
  ]) {
    assert.notDeepEqual(auditForbiddenImports(form), [], `${form} must be rejected`);
  }

  // And the permitted edges must pass, or the audit over-bans and the next author
  // loosens it rather than obeying it.
  for (const form of [
    "import { Canvas } from '@react-three/fiber';",
    "import { Vector3 } from 'three';",
    "import { navigationStore } from '../shell/state.ts';",
    "import artifact from '../../generated/layout.generated.json';",
    "import { buildScene } from './scene-model.ts';",
  ]) {
    assert.deepEqual(auditForbiddenImports(form), [], `${form} is permitted and must pass`);
  }
});

test('the scene holds no classification or mapping-rule vocabulary of its own', () => {
  // The three mapping rules live in `src/derive/rules.ts` and nowhere else. A name
  // like `classify` or `luminanceFor` in this directory is how a fourth rule arrives
  // — resolved locally, agreeing with the artifact until it does not.
  //
  // Names that *compute*, not names that *carry*: `luminanceBand` is a field the
  // model carries and must be allowed to mention, so the ban is on the verb shapes.
  // A case-insensitive `\balpha\b` ban was dropped from this list deliberately — over
  // a pure-structure module it cannot fail by construction, and it would misfire on a
  // future token name or on a fixture Client named Alpha.
  for (const path of [MODEL_TS, DUST_TS, SCENE_TSX, RAIL_MODEL_TS, RAIL_CAMERA_TSX]) {
    const code = codeOf(path);
    assert.doesNotMatch(code, /\bclassify\w*\s*\(|\bfunction\s+classify/i, 'no classification test');
    assert.doesNotMatch(code, /\b(?:luminance|mote|mass|rail)(?:Band|Tier|Of|For|From)?\s*\(/i, 'no mapping computed');
    assert.doesNotMatch(code, /\bisDeep\s*=\s*|\bisDeep\s*\?\?/, 'depth is read, never assigned or defaulted');
  }
});

// --- The renderer stays thin ------------------------------------------------

/**
 * The renderer's thinness, as a pure function over its source.
 *
 * This is the residual the model/renderer split accepts: `scene.tsx` cannot be
 * loaded by this runner at all, so the mapping is unasserted and is kept trivial
 * enough that reading it suffices. This is the ratchet on "trivial" — it fails the
 * moment the renderer grows a rule of its own rather than when someone notices.
 */
function auditRenderer(source: string): string[] {
  const code = blankProse(source);
  const failures: string[] = [];

  if (/\.sort\s*\(|\.filter\s*\(|\.reverse\s*\(|\.slice\s*\(/.test(code)) {
    failures.push('orders or selects — the derive layer owns every ordering');
  }
  if (/\buseState\b|\buseReducer\b|\buseEffect\b|\buseRef\b|\buseMemo\b/.test(code)) {
    failures.push('keeps state or an effect — a second home for where the visitor is');
  }
  if (/\buseFrame\b|\buseThree\b|\buseStore\b|\bsubscribe\s*\(/.test(code)) {
    failures.push('runs a frame callback or subscribes reactively — 2.5 owns the loop, and it reads getState()');
  }
  if (/\.setState\b|\bsetState\b\s*[:,)}]/.test(code)) {
    failures.push('writes the navigation store — every transition is a named event');
  }
  if (/\braycast\w*|\bonClick\b|\bonPointer\w+|\bonWheel\b|\bonScroll\b/i.test(code)) {
    failures.push('handles an interaction — the scene reacts to nothing in this story');
  }
  if (/\bduration\b|\bnotable\b|\bweight\b|\btimeAxis\b/.test(code)) {
    failures.push('re-derives from an authored field');
  }
  if (/\bwindow\b|\bdocument\b|innerWidth|innerHeight|getBoundingClientRect/.test(code)) {
    failures.push('reads the viewport or the DOM directly');
  }
  if (/\bforceSimulation\b|\bforceManyBody\b/.test(code)) failures.push('runs a simulation');

  return failures;
}

test('the renderer holds no logic the model could own', () => {
  assert.deepEqual(auditRenderer(readFileSync(SCENE_TSX, 'utf8')), [], 'scene.tsx must stay a mapping');
});

test('the thinness audit rejects each form it names, including the ones that read as harmless', () => {
  // Reconstructed violations, every clause covered. `useMemo` and `.slice(` are in the
  // list because they are the plausible ones: neither looks like a rule, and both put
  // a decision in the file the runner cannot execute.
  for (const form of [
    'const sorted = bodies.sort((a, b) => a.id < b.id ? -1 : 1);',
    'const stars = bodies.filter((b) => b.kind === "star");',
    'const first = bodies.slice(0, 5);',
    'const [hovered, setHovered] = useState(null);',
    'const bodies = useMemo(() => buildScene(artifact), [artifact]);',
    'useFrame(() => { camera.position.x += 1; });',
    'const progress = useStore(navigationStore, (s) => s.scrollProgress);',
    'navigationStore.setState({ mode: "free-flight" });',
    '<mesh onClick={() => focusProject(body.id)} />',
    '<mesh onPointerOver={() => setHovered(body.id)} />',
    'const w = window.innerWidth;',
    'const deep = body.notable !== null;',
  ]) {
    assert.notDeepEqual(auditRenderer(form), [], `${form} must be rejected`);
  }

  // And what the renderer legitimately does must pass, or the audit is a wall rather
  // than a ratchet: it maps, it keys, and it hands the framing to the camera prop.
  for (const form of [
    'bodies.map((body) => <mesh key={body.id} position={[body.position.x, 0, 0]} />)',
    '<Canvas aria-hidden="true" camera={{ position: [1, 2, 3], rotation: [0, 0, 0] }} />',
    'const { bodies } = buildScene(artifact);',
    'return body.kind === "star" ? STAR_RADIUS : PLANET_RADIUS;',
  ]) {
    assert.deepEqual(auditRenderer(form), [], `${form} is the mapping itself and must pass`);
  }
});

test('the placeholder radius discriminates on kind, never on a missing mass', () => {
  // Pinned positively, because a negative scan cannot observe a correct form going
  // missing — and the wrong form is a plausible one-line edit. `mass === undefined`
  // means a Planet arriving without mass renders silently Star-sized instead of
  // surfacing; the union is what the model defined, so `kind` is the question with an
  // answer.
  const code = quotedCodeOf(SCENE_TSX);
  assert.match(code, /body\.kind\s*===\s*'star'/, 'the size question is asked of kind');
  assert.doesNotMatch(code, /mass\s*===\s*undefined|mass\s*!==\s*undefined|body\.mass\s*\?\?/, 'never of a missing mass');
  assert.doesNotMatch(code, /!\s*body\.mass\b/, 'nor of its truthiness — mass is a positive number, but zero reads false');
});

// --- The ARIA ratchet -------------------------------------------------------

/**
 * The `aria-hidden` rule on the canvas root, asserted on its **value**.
 *
 * Proven at review: `aria-hidden="false"` and `aria-hidden={false}` both passed a
 * scan keyed on the attribute's presence, because the pattern stopped at the opening
 * quote or brace. So the checker reads the value, and the test below drives it over
 * both of those forms.
 */
function auditCanvasAria(code: string): string[] {
  const failures: string[] = [];
  const canvas = /<Canvas\b[\s\S]*?>/.exec(code);
  if (canvas === null) {
    failures.push('no <Canvas> element — the surface must exist to be hidden');
    return failures;
  }
  const attributes = canvas[0];
  const hidden = /aria-hidden\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*([^}]*?)\s*\})/.exec(attributes);
  if (hidden === null) {
    failures.push('the <Canvas> carries no aria-hidden — the index is the interface, and this duplicates it');
    return failures;
  }
  const value = (hidden[1] ?? hidden[2] ?? hidden[3] ?? '').trim();
  if (value !== 'true') {
    failures.push(`aria-hidden must be true, not ${JSON.stringify(value)} — a false value hides nothing`);
  }
  return failures;
}

test('the canvas root is aria-hidden="true"', () => {
  assert.deepEqual(auditCanvasAria(quotedCodeOf(SCENE_TSX)), [], 'the canvas duplicates the index and must not be narrated');
});

test('the ARIA checker rejects a false value and a missing attribute, not merely a missing name', () => {
  // The two forms proven green against a presence-keyed scan, plus the absences a
  // deletion would produce. A scan that cannot fail is not a ratchet.
  for (const form of [
    '<Canvas aria-hidden="false">',
    '<Canvas aria-hidden={false}>',
    "<Canvas aria-hidden='false'>",
    '<Canvas aria-hidden="">',
    '<Canvas aria-hidden={hidden}>',
    '<Canvas style={{ width: 1 }}>',
    '<div aria-hidden="true">',
  ]) {
    assert.notDeepEqual(auditCanvasAria(form), [], `${form} must be rejected`);
  }

  for (const form of [
    '<Canvas aria-hidden="true">',
    '<Canvas aria-hidden={true}>',
    '<Canvas\n  aria-hidden="true"\n  style={{ height: "70vh" }}\n>',
    '<Canvas style={{ height: "70vh" }} aria-hidden="true" camera={{ fov: 50 }}>',
  ]) {
    assert.deepEqual(auditCanvasAria(form), [], `${form} hides the subtree and must pass`);
  }
});

// --- The connector ratchet --------------------------------------------------

/**
 * The no-connector rule: no line, edge, or link between two Bodies.
 *
 * **Case-insensitive, and it names drei's components.** Proven at review: importing
 * `Line` from `@react-three/drei` — a pinned dependency, and the idiomatic line in
 * this stack — and rendering it passed every check, because the element regex was
 * case-sensitive and the substring list named only lowercase intrinsics.
 *
 * Orbits are the only relational geometry in this story, and they are Planet
 * *positions* rather than drawn rings.
 */
const CONNECTOR_ELEMENTS: readonly string[] = [
  // Three's own intrinsics, as R3F lowercases them.
  'line',
  'lineSegments',
  'lineLoop',
  'lineBasicMaterial',
  'lineDashedMaterial',
  'edgesGeometry',
  'wireframeGeometry',
  'arrowHelper',
  'axesHelper',
  'gridHelper',
  // drei's, which are capitalised and were the ones that got through.
  'Line',
  'QuadraticBezierLine',
  'CubicBezierLine',
  'CatmullRomLine',
  'Segments',
  'Segment',
  'Edges',
  'Outlines',
];

function auditConnectors(code: string): string[] {
  const failures: string[] = [];
  for (const element of CONNECTOR_ELEMENTS) {
    // Case-insensitive on the tag name, anchored on `<` so `lineBasicMaterial`
    // inside an identifier is not a finding and `<Line points=…/>` is.
    if (new RegExp(`<\\s*${element}\\b`, 'i').test(code)) {
      failures.push(`draws <${element}> — no connector geometry of any kind, between Bodies or otherwise`);
    }
  }
  // The material flag that turns a solid mesh into a wire cage, which is a drawn edge
  // set by another name.
  if (/\bwireframe\b/i.test(code)) failures.push('sets wireframe — a mesh drawn as edges is still edges');
  // And the imports that bring drei's lines in, so the ban fails at the import rather
  // than only at the element.
  if (/from\s*['"]@react-three\/drei['"][\s\S]{0,0}/.test(code)) {
    const importLine = /import\s*\{([^}]*)\}\s*from\s*['"]@react-three\/drei['"]/.exec(code);
    const named = (importLine?.[1] ?? '').split(',').map((entry) => entry.trim().split(/\s+as\s+/)[0]?.trim() ?? '');
    for (const symbol of named) {
      if (CONNECTOR_ELEMENTS.some((element) => element.toLowerCase() === symbol.toLowerCase())) {
        failures.push(`imports ${symbol} from @react-three/drei — a line imported is a line about to be drawn`);
      }
    }
  }
  return failures;
}

test('the renderer draws no line, edge, or connector between any two Bodies', () => {
  // The Rail's files too: a camera path drawn as a `<CatmullRomLine>` would be a
  // connector between two Clients by another name.
  for (const path of [SCENE_TSX, RAIL_MODEL_TS, RAIL_CAMERA_TSX]) {
    assert.deepEqual(auditConnectors(readFileSync(path, 'utf8')), [], `${path}: orbit is a position, never a drawn ring`);
  }
});

test('the connector ban rejects drei’s Line as well as Three’s intrinsics', () => {
  // The form proven green at review, plus the lowercase ones and the import edge. A
  // case-sensitive element regex over a lowercase list is what let the first one
  // through, so both cases and both positions are driven here.
  for (const form of [
    '<Line points={[a, b]} />',
    '<line><bufferGeometry /></line>',
    '<lineSegments geometry={g} />',
    '<LineSegments geometry={g} />',
    '<QuadraticBezierLine start={a} end={b} />',
    '<Segments><Segment start={a} end={b} /></Segments>',
    '<Edges />',
    '<meshStandardMaterial wireframe />',
    "import { Line } from '@react-three/drei';",
    "import { Segments as Links } from '@react-three/drei';",
  ]) {
    assert.notDeepEqual(auditConnectors(form), [], `${form} must be rejected`);
  }

  // Placeholder geometry must pass, or the ban rejects the story's own deliverable.
  for (const form of [
    '<mesh><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial /></mesh>',
    '<ambientLight intensity={0.6} />',
    '<directionalLight position={[1, 2, 3]} />',
    "import { Canvas } from '@react-three/fiber';",
    "import { Billboard } from '@react-three/drei';",
  ]) {
    assert.deepEqual(auditConnectors(form), [], `${form} draws no connector and must pass`);
  }
});

// --- The draw-order ratchet: Dust never paints over a Body -------------------

/**
 * The text of **every** `<collection>.map(…)` in the renderer, by balanced
 * parentheses — empty when the renderer maps no such collection.
 *
 * Every one, not the first: an audit of the first match alone passed a second
 * `media.map(…)` block that carried no draw-order rule at all.
 */
function mapBlocks(code: string, collection: string): string[] {
  const blocks: string[] = [];
  for (const start of code.matchAll(new RegExp(`\\b${collection}\\s*\\.\\s*map\\s*\\(`, 'g'))) {
    let depth = 0;
    let end = code.length;
    for (let index = start.index + start[0].length - 1; index < code.length; index += 1) {
      const character = code[index];
      if (character === '(') depth += 1;
      if (character === ')') {
        depth -= 1;
        if (depth === 0) {
          end = index + 1;
          break;
        }
      }
    }
    blocks.push(code.slice(start.index, end));
  }
  return blocks;
}

/**
 * The draw-order rule on the renderer, as a pure function over its source.
 *
 * Every Dust draw precedes every Body draw and writes no depth, so a Body is never
 * painted over by Dust in front of it or behind it, from any camera. Three halves:
 *
 *   - Every scene object mapped from `media` or `particles` carries
 *     `renderOrder={DUST_RENDER_ORDER}`, and every material there
 *     `depthWrite={false}`.
 *   - Every Body mesh carries `renderOrder={BODY_RENDER_ORDER}`, and its material is
 *     `transparent` at opacity 1. **Transparent is load-bearing:** three renders its
 *     whole opaque list before its transparent list whatever the `renderOrder`, so an
 *     opaque Body is drawn *before* the Dust and then painted over.
 *   - No `renderOrder` takes a literal or sits anywhere but on an audited draw, and
 *     no billboard or point cloud exists outside the Dust.
 *   - Every medium sprite is scaled by `mediumSpriteScale`, so it is drawn at the
 *     model's radius and the model's non-overlap proof holds on screen.
 *
 * Plus the story's exclusions: no Mote and no per-Skill entity in the renderer, and
 * the framing still reads the Bodies only.
 */
function auditDrawOrder(source: string): string[] {
  const code = blankProse(source);
  const failures: string[] = [];

  for (const collection of ['media', 'particles']) {
    const blocks = mapBlocks(code, collection);
    if (blocks.length === 0) failures.push(`maps no ${collection} — the Dust the model builds is never drawn`);
    for (const block of blocks) {
      const objects = block.match(/<(?:sprite|mesh|points|instancedMesh|group)\b[^>]*>/g) ?? [];
      if (objects.length === 0) failures.push(`${collection} are mapped to no scene object`);
      for (const object of objects) {
        if (!/\brenderOrder\s*=\s*\{\s*DUST_RENDER_ORDER\s*\}/.test(object)) {
          failures.push(`a ${collection} draw lacks renderOrder={DUST_RENDER_ORDER} — it may draw after a Body`);
        }
      }
      const materials = block.match(/<\w+Material\b[^>]*>/g) ?? [];
      if (materials.length === 0) failures.push(`${collection} are drawn with no material of their own`);
      for (const material of materials) {
        if (!/\bdepthWrite\s*=\s*\{\s*false\s*\}/.test(material)) {
          failures.push(`a ${collection} material writes depth — it would hide a Body drawn behind it`);
        }
      }
    }
  }

  const bodyBlocks = mapBlocks(code, 'bodies');
  if (bodyBlocks.length === 0) failures.push('maps no bodies — the Bodies are not drawn');
  for (const bodyBlock of bodyBlocks) {
    const meshes = bodyBlock.match(/<mesh\b[^>]*>/g) ?? [];
    if (meshes.length === 0) failures.push('the Bodies are mapped to no mesh');
    for (const mesh of meshes) {
      if (!/\brenderOrder\s*=\s*\{\s*BODY_RENDER_ORDER\s*\}/.test(mesh)) {
        failures.push('a Body mesh lacks renderOrder={BODY_RENDER_ORDER} — Dust could draw after it');
      }
    }
    const materials = bodyBlock.match(/<\w+Material\b[^>]*>/g) ?? [];
    if (materials.length === 0) failures.push('the Bodies are drawn with no material');
    for (const material of materials) {
      // A bare attribute or `{true}`, and nothing else: `{0}` and `{!true}` are falsy
      // and passed a scan that excluded only `{false}`.
      if (!/\btransparent(?:\s*=\s*\{\s*true\s*\}|(?![\w-]|\s*=))/.test(material)) {
        failures.push('a Body material is opaque — three draws the opaque list first, so Dust paints over it');
      }
      const opacity = /\bopacity\s*=\s*\{\s*([^}]*?)\s*\}/.exec(material);
      if (opacity !== null && opacity[1] !== '1') {
        failures.push(`a Body is drawn at opacity ${opacity[1]} — transparent is for ordering, never for fading`);
      }
    }
  }

  // The medium is drawn at the model's radius through the model's own scale, so the
  // non-overlap and ceiling proofs over `radius` are proofs about the screen too.
  for (const block of mapBlocks(code, 'media')) {
    for (const sprite of block.match(/<sprite\b[^>]*>/g) ?? []) {
      if (!/\bscale\s*=\s*\{\s*mediumSpriteScale\s*\(\s*medium\s*\)\s*\}/.test(sprite)) {
        failures.push('a medium is not scaled by mediumSpriteScale — its drawn radius may not be the model’s');
      }
    }
  }

  for (const match of code.matchAll(/\brenderOrder\s*=\s*\{\s*([^}]*?)\s*\}/g)) {
    if (match[1] !== 'DUST_RENDER_ORDER' && match[1] !== 'BODY_RENDER_ORDER') {
      failures.push(`renderOrder={${match[1]}} — draw order comes from the model's named constants only`);
    }
  }
  // Every `renderOrder`, in any value form, sits on an object the audit above checked.
  // A `<group renderOrder={BODY_RENDER_ORDER}>` wrapping the Dust reorders it (three
  // sorts by group order first), and `renderOrder="5"` is blanked to no braces at all;
  // both passed while each audited object still read correctly.
  const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;
  const audited = [
    ...['media', 'particles'].flatMap((collection) =>
      mapBlocks(code, collection).flatMap(
        (block) => block.match(/<(?:sprite|mesh|points|instancedMesh|group)\b[^>]*>/g) ?? [],
      ),
    ),
    ...mapBlocks(code, 'bodies').flatMap((block) => block.match(/<mesh\b[^>]*>/g) ?? []),
  ];
  const renderOrders = /\brenderOrder\s*=/g;
  if (count(code, renderOrders) !== audited.reduce((sum, object) => sum + count(object, renderOrders), 0)) {
    failures.push('a renderOrder is set outside the audited Dust and Body draws — it can reorder them');
  }
  // Dust-shaped draws — a billboard, a point cloud, an instanced batch — exist only in
  // the Dust blocks, where the rules above hold them.
  const dustShaped = /<(?:sprite|points|instancedMesh)\b/g;
  const dustShapedInBlocks = ['media', 'particles']
    .flatMap((collection) => mapBlocks(code, collection))
    .reduce((sum, block) => sum + count(block, dustShaped), 0);
  if (count(code, dustShaped) !== dustShapedInBlocks) {
    failures.push('a billboard or point cloud is drawn outside the Dust, under no draw-order rule');
  }

  if (/\bMotes?\b|\bmotes?\b|\bSkills?\b|\bskills?\b/.test(code)) {
    failures.push('names a Mote or a Skill — no Mote and no per-Skill entity at rest (FR-13; 2.8 owns Motes)');
  }
  // Every call, not one: a second, widened call passed beside the exact one.
  const framings = [...code.matchAll(/\bframeBodies\s*\(([^)]*)\)/g)];
  if (framings.length === 0 || framings.some((call) => call[1]?.trim() !== 'bodies')) {
    failures.push('the framing is not handed exactly the Bodies — Dust never widens it');
  }
  return failures;
}

test('every Dust draw precedes every Body draw and writes no depth', () => {
  assert.deepEqual(auditDrawOrder(readFileSync(SCENE_TSX, 'utf8')), [], 'no Dust fragment may be drawn over a Body');
});

test('the draw-order audit rejects the real renderer with any one of its guarantees removed', () => {
  // Mutations of the shipped file rather than hand-written snippets, so each bad form
  // is exactly one edit away from what ships. Every mutation is checked to have
  // applied, or a renamed attribute would turn this into a test of nothing.
  const real = readFileSync(SCENE_TSX, 'utf8');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['the medium writes depth', (s) => s.replace(/(<spriteMaterial\b[^>]*?)\s*depthWrite=\{false\}/, '$1')],
    ['a particle writes depth', (s) => s.replace(/(<meshBasicMaterial\b[^>]*?)\s*depthWrite=\{false\}/, '$1')],
    ['depth explicitly on', (s) => s.replace('depthWrite={false}', 'depthWrite={true}')],
    ['the medium loses its order', (s) => s.replace(/(<sprite\b[^>]*?)\s*renderOrder=\{DUST_RENDER_ORDER\}/, '$1')],
    ['a particle loses its order', (s) => s.replace(/(particles\.map[\s\S]*?)renderOrder=\{DUST_RENDER_ORDER\}/, '$1')],
    ['a Body loses its order', (s) => s.replace('renderOrder={BODY_RENDER_ORDER}', '')],
    ['Dust takes the Body order', (s) => s.replace('renderOrder={DUST_RENDER_ORDER}', 'renderOrder={BODY_RENDER_ORDER}')],
    ['a literal order', (s) => s.replace('renderOrder={BODY_RENDER_ORDER}', 'renderOrder={3}')],
    ['the Body goes opaque', (s) => s.replace(/(<meshStandardMaterial\b[^>]*?)\s*transparent\b/, '$1')],
    ['the Body is transparent={false}', (s) => s.replace(/(<meshStandardMaterial\b[^>]*?\s)transparent\b/, '$1transparent={false}')],
    ['the Body fades', (s) => s.replace(/(<meshStandardMaterial\b[^>]*?)opacity=\{1\}/, '$1opacity={0.5}')],
    ['the particles are not drawn', (s) => s.replace(/particles\.map/, 'particlesUnused.map')],
    ['the media are not drawn', (s) => s.replace(/media\.map/, 'mediaUnused.map')],
    [
      'the medium drawn off its radius',
      (s) => s.replace('scale={mediumSpriteScale(medium)}', 'scale={[medium.radius * 4, medium.radius * 4, 1]}'),
    ],
    [
      'a group reorders the Dust',
      (s) => s.replace('<ambientLight', '<group renderOrder={BODY_RENDER_ORDER} />\n      <ambientLight'),
    ],
    ['a string-valued order', (s) => s.replace('<ambientLight', '<ambientLight renderOrder="5"')],
    ['a stray point cloud', (s) => s.replace('<ambientLight', '<instancedMesh />\n      <ambientLight')],
    [
      'a second, widened framing',
      (s) => s.replace('frameBodies(bodies);', 'frameBodies(bodies);\n  const wide = frameBodies([...bodies, ...particles]);'),
    ],
    ['a stray billboard', (s) => s.replace('<ambientLight', '<sprite scale={[1, 1, 1]} />\n      <ambientLight')],
    ['a Mote', (s) => s.replace('<ambientLight', '{motes.map((m) => <mesh key={m} />)}\n      <ambientLight')],
    ['a Skill', (s) => s.replace('buildDust(bodies)', 'buildDust(bodies, skills)')],
    ['the framing widened', (s) => s.replace('frameBodies(bodies)', 'frameBodies([...bodies, ...particles])')],
    ['the Body is transparent={0}', (s) => s.replace(/(<meshStandardMaterial\b[^>]*?\s)transparent\b/, '$1transparent={0}')],
    [
      'the Body is transparent={!true}',
      (s) => s.replace(/(<meshStandardMaterial\b[^>]*?\s)transparent\b/, '$1transparent={!true}'),
    ],
    [
      'a second, unaudited media block',
      (s) => s.replace('<ambientLight', '{media.map((m) => <sprite key={m.id}><spriteMaterial /></sprite>)}\n      <ambientLight'),
    ],
    [
      'a second, unaudited particles block',
      (s) => s.replace('<ambientLight', '{particles.map((p) => <mesh key={p.id}><meshBasicMaterial /></mesh>)}\n      <ambientLight'),
    ],
    [
      'a second, unaudited bodies block',
      (s) =>
        s.replace(
          '<ambientLight',
          '{bodies.map((b) => <mesh key={b.id}><meshStandardMaterial transparent={false} /></mesh>)}\n      <ambientLight',
        ),
    ],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply to the shipped renderer`);
    assert.notDeepEqual(auditDrawOrder(mutated), [], `"${name}" must be rejected`);
  }
});

// --- The surface has extent -------------------------------------------------

/**
 * The canvas must carry a real size, and the camera must be given a framing.
 *
 * R3F's wrapper is `width: 100%; height: 100%` and this repo has no CSS, so a
 * `<Canvas>` in a bare `<main>` collapses to zero height and draws nothing. That
 * shipped once. Both halves are asserted positively, because a negative scan cannot
 * see a correct form going missing — deleting the `style` prop is a one-line edit
 * that leaves every other check here green.
 */
function auditCanvasSurface(code: string): string[] {
  const failures: string[] = [];
  const canvas = /<Canvas\b[\s\S]*?>/.exec(code);
  if (canvas === null) return ['no <Canvas> element at all'];
  const attributes = canvas[0];

  if (!/\bstyle\s*=\s*\{\{[^}]*\bheight\s*:/.test(attributes) && !/\bclassName\s*=/.test(attributes)) {
    failures.push('the <Canvas> is given no height — R3F’s wrapper is height:100% and this repo has no CSS');
  }
  if (!/\bcamera\s*=\s*\{/.test(attributes)) {
    failures.push('the <Canvas> is given no camera — R3F’s default cannot frame the solved extent');
  }
  if (!/\bposition\s*:\s*\[/.test(attributes)) failures.push('the camera prop carries no position');
  if (!/\brotation\s*:\s*\[/.test(attributes)) {
    failures.push('the camera prop carries no rotation — R3F then calls lookAt(0,0,0) and aims past the Bodies');
  }
  if (!/\bframing\./.test(attributes)) {
    failures.push('the camera is not read off the framing — a hard-coded view loses the first Body solved beyond it');
  }
  return failures;
}

test('the canvas has real extent and a camera read off the framing', () => {
  assert.deepEqual(
    auditCanvasSurface(quotedCodeOf(SCENE_TSX)),
    [],
    'a story called “Bodies at rest in the 3D scene” must show the Bodies',
  );
});

test('the surface audit rejects a canvas with no size, no camera, or no rotation', () => {
  // Each deletion that shipped or nearly did, reconstructed. The rotation clause is
  // the iteration-2 bug: a camera prop with a position and no rotation is exactly
  // what R3F fills in with `lookAt(0, 0, 0)`.
  for (const form of [
    '<Canvas aria-hidden="true">',
    '<Canvas aria-hidden="true" style={{ width: "100%" }} camera={{ position: [framing.position.x, 0, 0], rotation: [0,0,0] }}>',
    '<Canvas aria-hidden="true" style={{ height: "70vh" }}>',
    '<Canvas aria-hidden="true" style={{ height: "70vh" }} camera={{ position: [framing.position.x, 0, 0] }}>',
    '<Canvas aria-hidden="true" style={{ height: "70vh" }} camera={{ rotation: [0,0,0] }}>',
    '<Canvas aria-hidden="true" style={{ height: "70vh" }} camera={{ position: [0, 0, 40], rotation: [0, 0, 0] }}>',
  ]) {
    assert.notDeepEqual(auditCanvasSurface(form), [], `${form} must be rejected`);
  }

  assert.deepEqual(
    auditCanvasSurface(
      '<Canvas aria-hidden="true" style={{ height: "70vh" }} camera={{ position: [framing.position.x, 0, 0], rotation: [framing.rotation.x, 0, 0] }}>',
    ),
    [],
    'a sized canvas with a framed, oriented camera must pass',
  );
});

test('the directional light is offset from the camera, not sitting on it', () => {
  // Two sources exist so the spheres read as spheres. A directional light placed
  // exactly at the camera lights every visible surface head-on, producing the flat
  // silhouettes the second source was added to prevent — and the adjacent comment
  // would then claim the opposite of what the code does.
  const code = codeOf(SCENE_TSX);
  const light = /<directionalLight[\s\S]*?\/>/.exec(code);
  assert.ok(light !== null, 'a second source must exist');
  assert.doesNotMatch(
    light[0],
    /position=\{\s*\[\s*framing\.position\.x\s*,\s*framing\.position\.y\s*,\s*framing\.position\.z\s*\]\s*\}/,
    'a light at the camera is the flat silhouette its own comment says it prevents',
  );
  assert.match(light[0], /framing\.position\.[xy]\s*\+/, 'offset from the camera on at least one lateral axis');
});

// --- The lazy edge and the error boundary ----------------------------------

test('the scene is reached only through a dynamic import, from src/shell/', () => {
  // AD-7. A static import anywhere on the entry path hoists Three onto the entry
  // chunk, so the DOM index would wait on ~880 kB of renderer before First Paint.
  // The boundary rows enforce this at the gate; this fails in the suite, which is a
  // different reader at a different time.
  const code = quotedCodeOf(SCENE_HOST_TSX);
  assert.match(code, /lazy\(\s*(?:async\s*)?\(\s*\)\s*=>/, 'the renderer is lazy');
  assert.match(code, /import\(\s*'\.\.\/render-scene\/scene\.tsx'\s*\)/, 'reached through a dynamic import');
  assert.doesNotMatch(
    code,
    /^\s*import\s+[^\n]*from\s*'\.\.\/render-scene\//m,
    'and never statically, not even for a type — the parser counts a type-only edge',
  );
  assert.doesNotMatch(code, /from\s*['"](?:three|@react-three\/)/, 'the shell touches no 3D package by name either');
});

test('an error boundary wraps the suspense edge, in that order', () => {
  // Order is the whole thing. A boundary *inside* `<Suspense>` cannot catch the
  // chunk-fetch rejection, which is thrown by the lazy element itself — the failure
  // it exists for. Both nestings look equally plausible in a diff and only one works,
  // so the nesting is pinned rather than the presence.
  const code = quotedCodeOf(SCENE_HOST_TSX);
  // Tag order within the rendered tree, matched as an *opening element* rather than
  // by substring: `indexOf('<SceneBoundary')` also matches
  // `Component<SceneBoundaryProps, …>` in the class declaration, which sits above the
  // JSX and made the inverted nesting read as correct — verified by mutation, the
  // inversion passed. So the nesting is read off the sequence of opening tags.
  const tags = (code.match(/<(?:SceneBoundary|Suspense|Scene)\s*[/>\s]/g) ?? []).map((tag) =>
    tag.replace(/[^A-Za-z]/g, ''),
  );
  assert.deepEqual(
    tags,
    ['SceneBoundary', 'Suspense', 'Scene'],
    'the boundary must be outside <Suspense>, or it cannot catch a failed chunk fetch',
  );

  // Both hooks. `getDerivedStateFromError` is what stops the unmount;
  // `componentDidCatch` is what makes the cause diagnosable in a production build,
  // where a malformed artifact and a 404'd chunk are otherwise the same blank
  // surface. Matched as a *method declaration* — a bare substring match let
  // `componentDidCatchDisabled` pass, which is the one-token way a reviewer turns the
  // hook off without deleting it.
  assert.match(code, /static\s+getDerivedStateFromError\s*\(/, 'the state transition that stops the unmount');
  assert.match(code, /\bcomponentDidCatch\s*\(/, 'and the report that names the cause');
  assert.match(code, /this\.state\.failed\s*\?\s*null\s*:/, 'a failed scene renders nothing, never a broken tree');
});

test('the host restates the artifact shape rather than importing the scene’s type', () => {
  // Recorded as a third copy in `deferred-work.md`, and unavoidable: an `import type`
  // counts as an import to the boundary parser and `src/shell/README.md:5` permits
  // `src/render-scene/` only dynamically. The two shapes are still checked against
  // each other where `lazy` types the element's props — and both are `readonly`
  // throughout, or they would be structurally unequal in one direction and the
  // docstring's claim would be false.
  const code = quotedCodeOf(SCENE_HOST_TSX);
  assert.match(code, /interface\s+SceneHostArtifact/, 'the shape is restated');
  const shape = /interface\s+SceneHostArtifact[\s\S]*?\n\}/.exec(code);
  assert.ok(shape !== null);
  assert.doesNotMatch(shape[0], /\n\s+(?!readonly)[a-zA-Z]+\s*[?:]/, 'every member readonly, matching SceneBodiesArtifact');
});

// --- App.tsx mounts it, pinned positively ----------------------------------

test('App.tsx imports the scene host and renders it after the index', () => {
  // **Proven by deletion:** removing both the import and the element left 487/487
  // green, typecheck clean and the gate clean, while the story's entire deliverable
  // disappeared. No test read this file's contents, so nothing observed it.
  //
  // The ordering half is AD-4, which the file's own header claims: the index is in
  // the document first, and document order is what a screen reader and the tab key
  // walk.
  const code = quotedCodeOf(APP_TSX);
  assert.match(code, /import\s*\{\s*SceneHost\s*\}\s*from\s*'\.\/shell\/scene-host\.tsx'/, 'the host is imported');
  assert.match(code, /<SceneHost\b/, 'and rendered');
  assert.match(code, /<DestinationNav\b/, 'beside the index, which still renders synchronously');
  assert.ok(
    code.indexOf('<DestinationNav') < code.indexOf('<SceneHost'),
    'the index must precede the scene in document order (AD-4)',
  );
  assert.doesNotMatch(
    code,
    /from\s*['"](?:three|@react-three\/)|from\s*['"]\.\/render-scene\//,
    'and the entry stub reaches no renderer and no 3D package statically',
  );
});

// --- The Rail rig -------------------------------------------------------------

/**
 * A world-coordinate literal, in any of the shapes one takes in this stack.
 *
 * FR-17 says a Shot names an entity plus a relative framing and never a place, and
 * the Rail inherits that: every keyframe is resolved from a Body. A literal pose —
 * `camera.position.set(0, 5, 40)`, `lookAt(0, 0, 0)`, `{ x: 0, y: 0, z: 40 }`, a
 * numeric triple — is a place somebody wrote down, and it stays put when the
 * solver moves the Bodies. Run over prose-blanked code, so a number in a comment
 * or a message is not a finding.
 */
function coordinateLiterals(code: string): string[] {
  const failures: string[] = [];
  const number = String.raw`-?\d[\d.]*`;
  const shapes: readonly (readonly [string, RegExp])[] = [
    // Object-literal context only — after `{` or `,` — so a ternary `c ? x : 0` is
    // not a coordinate.
    ['an object literal coordinate', new RegExp(String.raw`[{,]\s*[xyz]\s*:\s*${number}`)],
    ['a numeric .set(…)', new RegExp(String.raw`\.set\s*\(\s*${number}`)],
    ['a numeric lookAt(…)', new RegExp(String.raw`\blookAt\s*\(\s*${number}`)],
    ['a numeric Vector3', new RegExp(String.raw`new\s+Vector3\s*\(\s*${number}`)],
    ['a numeric triple', new RegExp(String.raw`\[\s*${number}\s*,\s*${number}\s*,\s*${number}\s*\]`)],
  ];
  for (const [name, pattern] of shapes) {
    if (pattern.test(code)) failures.push(`holds ${name} — a keyframe is an entity plus a framing, never a place`);
  }
  return failures;
}

test('neither Rail file holds a world-coordinate literal', () => {
  for (const path of [RAIL_MODEL_TS, RAIL_CAMERA_TSX]) {
    assert.deepEqual(coordinateLiterals(codeOf(path)), [], `${path} must resolve every pose from entities`);
  }
});

test('the coordinate-literal scan rejects each shape, and passes entity-derived arithmetic', () => {
  for (const form of [
    'camera.position.set(0, 5, 40);',
    'camera.lookAt(10, 0, 0);',
    'const aim = new Vector3(0, 0, 0);',
    'const home = { x: 0, y: 0, z: 40 };',
    'const opening = [5, 0, 30];',
    'const drop = { y: -12 };',
    'const p = { a: 1, z: 40 };',
  ]) {
    assert.notDeepEqual(coordinateLiterals(form), [], `${form} must be rejected`);
  }
  for (const form of [
    'camera.position.set(pose.position.x, pose.position.y, pose.position.z);',
    'camera.lookAt(pose.target.x, pose.target.y, pose.target.z);',
    'return { x: a.x * 2 - b.x, y: a.y * 2 - b.y, z: a.z * 2 - b.z };',
    'const eased = { value: goal, velocity: 0 };',
    'y: subject.y + shot.distance * Math.sin(shot.angle),',
    'const pick = inside ? x : 0;',
    'const edge = ready ? z : -1;',
  ]) {
    assert.deepEqual(coordinateLiterals(form), [], `${form} is derived and must pass`);
  }
});

/**
 * The rig's contract, as a pure function over its source.
 *
 * It **reads** progress with `getState()` inside `useFrame`, damps through the
 * model and writes the Three camera — and does nothing else. No store write and
 * no named event (the scroll input owns `scrollProgress`, the index owns
 * `railPosition`), no subscription or reactive hook (a re-render per frame to
 * read a value it is about to read anyway), no DOM (the viewport arrives as R3F's
 * `size`), no coordinate literal, no interaction. The positive half pins that it
 * still does the one thing it is for.
 */
function auditRig(source: string): string[] {
  const code = blankProse(source);
  const quoted = blankComments(source);
  const failures: string[] = [];

  if (/\.setState\b|\bsetState\b\s*[:,)}]/.test(code)) failures.push('writes the store with setState');
  if (/\b(?:advanceScroll|selectClient|focusProject|releaseFocus|enterRail|enterFreeFlight|resetNavigation)\b/.test(code)) {
    failures.push('names a navigation event — the rig reads the store and writes only the camera');
  }
  if (/\buseStore\b|\bsubscribe\b|\buseSyncExternalStore\b|\buseShallow\b/.test(code) || /['"]zustand(?:\/react)?/.test(quoted)) {
    failures.push('subscribes to the store — a frame loop reads getState()');
  }
  if (/\buseThree\b|\buseState\b|\buseReducer\b|\buseEffect\b|\buseLayoutEffect\b|\buseMemo\b/.test(code)) {
    failures.push('holds reactive state or an effect — the damped state is a ref, the loop is useFrame');
  }
  if (/\bwindow\b|\bdocument\b|innerWidth|innerHeight|getBoundingClientRect|addEventListener|matchMedia/.test(code)) {
    failures.push('reads the DOM — the viewport arrives as R3F’s size');
  }
  if (/\braycast\w*|\bonClick\b|\bonPointer\w+|\bonWheel\b|\bonScroll\b/i.test(code)) {
    failures.push('handles an interaction — the wheel is the shell’s, click-to-fly is 2.9’s');
  }
  if (/\.sort\s*\(|\.filter\s*\(|\.reverse\s*\(|\.slice\s*\(/.test(code)) failures.push('orders or selects');
  failures.push(...coordinateLiterals(code));

  // The binding, exactly: the frame body is `railFrame` (executed in
  // `rail-model.test.ts`), and the rig's only job is to hand it the right inputs
  // and apply what comes back. Each clause is one way to hand it the wrong ones.
  const loop = /\buseFrame\s*\(\s*\(\s*\{\s*camera\s*,\s*size\s*\}\s*,\s*delta\s*\)\s*=>\s*\{([\s\S]*?)\}\s*\)\s*;/.exec(code);
  if (loop === null) {
    failures.push('runs no frame loop taking ({ camera, size }, delta)');
    return failures;
  }
  const frame = loop[1] ?? '';
  const statements = frame
    .split(';')
    .map((statement) => statement.replace(/\s+/g, ''))
    .filter((statement) => statement !== '');
  const expected = [
    'constframe=railFrame(motion.current,rail,navigationStore.getState().scrollProgress,size.width,size.height,delta)',
    'motion.current=frame.motion',
    'camera.position.set(frame.pose.position.x,frame.pose.position.y,frame.pose.position.z)',
    'camera.lookAt(frame.pose.target.x,frame.pose.target.y,frame.pose.target.z)',
  ];
  if (JSON.stringify(statements) !== JSON.stringify(expected)) {
    failures.push(
      'the frame loop is not exactly: railFrame(motion.current, rail, getState().scrollProgress, size.width, ' +
        'size.height, delta), write motion back, apply position and aim',
    );
  }
  if (!/const\s+motion\s*=\s*useRef<RailMotion\s*\|\s*null>\(\s*null\s*\)/.test(code)) {
    failures.push('the carried motion is not a ref that starts empty');
  }
  return failures;
}

test('the rig reads the store, writes only the camera, and holds no rule of its own', () => {
  assert.deepEqual(auditRig(readFileSync(RAIL_CAMERA_TSX, 'utf8')), []);
});

test('the rig audit rejects the real rig with any one guarantee broken', () => {
  // Mutations of the shipped file, each checked to have applied, so every bad form
  // is exactly one edit from what ships.
  const real = readFileSync(RAIL_CAMERA_TSX, 'utf8');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    [
      'a store write',
      (s) => s.replace('motion.current = frame.motion;', 'motion.current = frame.motion;\n    navigationStore.setState({ scrollProgress: 1 });'),
    ],
    ['a named event', (s) => s.replace('motion.current = frame.motion;', 'motion.current = frame.motion;\n    advanceScroll(frame.motion.progress.value);')],
    [
      'selecting a Client from scroll',
      (s) => s.replace('motion.current = frame.motion;', "motion.current = frame.motion;\n    selectClient('client:sncf');"),
    ],
    ['a subscription', (s) => s.replace('return null;', 'navigationStore.subscribe(() => {});\n  return null;')],
    [
      'a hook binding',
      (s) => s.replace('navigationStore.getState().scrollProgress', 'useStore(navigationStore, (state) => state.scrollProgress)'),
    ],
    ['reactive state', (s) => s.replace('const motion = useRef', 'const [, force] = useState(0);\n  const motion = useRef')],
    ['useThree', (s) => s.replace('const motion = useRef', 'const { size } = useThree();\n  const motion = useRef')],
    ['a DOM read', (s) => s.replace('size.width, size.height,', 'window.innerWidth, window.innerHeight,')],
    [
      'a literal position',
      (s) =>
        s.replace(
          'camera.position.set(frame.pose.position.x, frame.pose.position.y, frame.pose.position.z)',
          'camera.position.set(0, 5, 40)',
        ),
    ],
    [
      'a literal aim',
      (s) => s.replace('camera.lookAt(frame.pose.target.x, frame.pose.target.y, frame.pose.target.z)', 'camera.lookAt(0, 0, 0)'),
    ],
    ['no getState read', (s) => s.replace('navigationStore.getState().scrollProgress', 'motion.current?.progress.value ?? 0')],
    ['the write-back removed', (s) => s.replace('motion.current = frame.motion;', '')],
    ['delta dropped', (s) => s.replace('size.height, delta)', 'size.height, 0)')],
    ['a constant width', (s) => s.replace('scrollProgress, size.width,', 'scrollProgress, 1600,')],
    ['a constant height', (s) => s.replace('size.width, size.height,', 'size.width, 900,')],
    ['a fresh motion every frame', (s) => s.replace('railFrame(motion.current,', 'railFrame(null,')],
    ['the aim applied as the position', (s) => s.replace('frame.pose.position.x, frame.pose.position.y', 'frame.pose.target.x, frame.pose.position.y')],
    ['no model frame', (s) => s.replace(/railFrame\(motion\.current,[^;]*;/, "{ motion: motion.current!, pose: rail.keyframes[0]! };")],
    ['an interaction', (s) => s.replace('return null;', 'return <mesh onClick={() => undefined} />;')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply to the shipped rig`);
    assert.notDeepEqual(auditRig(mutated), [], `"${name}" must be rejected`);
  }
});

test('the scene builds the Rail from the artifact and mounts the rig inside the Canvas', () => {
  // Pinned positively: deleting the mount is a one-line edit that leaves every
  // negative scan green while the camera stops flying.
  const code = codeOf(SCENE_TSX);
  assert.match(code, /\bbuildRail\s*\(\s*artifact\s*,\s*bodies\s*\)/, 'the keyframes come from the artifact and Bodies');
  const inside = /<Canvas\b[\s\S]*<\/Canvas>/.exec(code)?.[0] ?? '';
  assert.match(inside, /<RailCamera\s+rail=\{\s*rail\s*\}\s*\/>/, 'the rig is mounted inside the Canvas');
  // The far plane covers every pose the rig can reach, not only the opening frame.
  assert.match(
    code,
    /\bfar\s*:\s*Math\.max\(\s*framing\.far\s*,\s*railFarPlane\(\s*rail\s*,\s*bodies\s*\)\s*\)/,
    'the camera prop far plane includes railFarPlane(rail, bodies)',
  );
});

/**
 * Every `.ts`/`.tsx` file under `src/` outside `src/render-scene/` that imports the
 * Rail model or the rig, as a pure function over files.
 *
 * AD-4: the scene is presentational, and the Rail is part of it. The shell reaches
 * the renderer through one dynamic edge (`scene-host.tsx`); a static edge into
 * `rail-model.ts` from the shell would hoist it — and whatever it grows — onto the
 * entry path, and the index would start depending on render geometry.
 */
function railImporters(files: readonly { readonly path: string; readonly source: string }[]): string[] {
  const failures: string[] = [];
  for (const file of files) {
    if (file.path.startsWith('src/render-scene/')) continue;
    const code = blankComments(file.source);
    for (const match of code.matchAll(/(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"`]([^'"`]+)['"`]/g)) {
      if (/(?:^|\/)rail-(?:model|camera)(?:\.tsx?)?$/.test(match[1] ?? '')) {
        failures.push(`${file.path} imports ${match[1]} — only src/render-scene/ may reach the Rail`);
      }
    }
  }
  return failures;
}

test('nothing outside src/render-scene/ imports the Rail model or the rig', () => {
  const files = readdirSync(SRC_ROOT, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
    .map((path) => ({ path: `src/${relative(SRC_ROOT, path).split(sep).join('/')}`, source: readFileSync(path, 'utf8') }));
  assert.ok(files.some((file) => file.path === 'src/shell/scene-host.tsx'), 'the walk must reach the shell');
  assert.deepEqual(railImporters(files), []);
});

test('the Rail-importer scan rejects every edge form from outside, and ignores prose and the directory itself', () => {
  for (const source of [
    "import { buildRail } from '../render-scene/rail-model.ts';",
    "import type { Rail } from '../render-scene/rail-model.ts';",
    "const rig = await import('../render-scene/rail-camera.tsx');",
    "export { railPose } from '../render-scene/rail-model';",
    "import { RailCamera } from './render-scene/rail-camera.tsx';",
  ]) {
    assert.notDeepEqual(railImporters([{ path: 'src/shell/x.ts', source }]), [], `${source} must be rejected`);
  }
  assert.deepEqual(
    railImporters([
      { path: 'src/render-scene/scene.tsx', source: "import { buildRail } from './rail-model.ts';" },
      { path: 'src/shell/x.ts', source: "// import { buildRail } from '../render-scene/rail-model.ts';" },
      { path: 'src/shell/y.ts', source: "const cases = ['src/render-scene/rail-camera.tsx'];" },
      { path: 'src/shell/z.ts', source: "import { wheelProgress } from './rail-input.ts';" },
    ]),
    [],
  );
});

// --- Directory coverage ----------------------------------------------------

test('every module in this directory is covered by the scans above', () => {
  // The scans resolve each module by name, so a new module under
  // `src/render-scene/` would inherit none of the connector, hook, store-write or
  // coordinate-literal bans. 2.5's `rail-model.ts` and `rail-camera.tsx` are named
  // in every scan that applies to them (the rig has its own audit below). This does not widen them; it makes an
  // unscanned module fail *loudly*, naming itself, rather than passing silently. The
  // same shape as `checkRuleCoverage` in `boundaries.ts`, one level down. Widening the
  // scans themselves is recorded in `deferred-work.md`.
  const known = new Set([
    'scene-model.ts',
    'scene-model.test.ts',
    'dust-model.ts',
    'dust-model.test.ts',
    'scene.tsx',
    'rail-model.ts',
    'rail-model.test.ts',
    'rail-camera.tsx',
    'README.md',
  ]);
  const found: string[] = [];
  // `withFileTypes`, so a subdirectory is descended into rather than read as an
  // unscanned module — without it a `src/render-scene/camera/` would pass as a file
  // nobody recognised, which is the opposite of what this test is for.
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(`${dir}/${entry.name}`, `${prefix}${entry.name}/`);
        continue;
      }
      found.push(`${prefix}${entry.name}`);
    }
  };
  walk(SCENE_DIR, '');

  assert.ok(found.length > 0, 'the walk must find something, or this test certifies nothing');
  assert.deepEqual(
    found.filter((name) => !known.has(name)).sort(),
    [],
    'a new module here inherits none of the scans above — widen them, then add it to this list',
  );
});
