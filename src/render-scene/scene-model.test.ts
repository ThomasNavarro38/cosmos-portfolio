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
import { FOCUS_REACH } from './focus-model.ts';
import { MOTE_ORBIT_RADII, MOTE_RADIUS } from './mote-model.ts';
import { PLANET_RADIUS, STAR_RADIUS } from './stroke-model.ts';
import {
  BODY_MARGIN,
  DEFAULT_FOV,
  NARROWEST_ASPECT,
  STOP_MARGIN,
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
const FOCUS_MODEL_TS = fileURLToPath(new URL('./focus-model.ts', import.meta.url));
const FLIGHT_MODEL_TS = fileURLToPath(new URL('./flight-model.ts', import.meta.url));
const SCENE_PICK_TS = fileURLToPath(new URL('./scene-pick.ts', import.meta.url));
const MOTE_MODEL_TS = fileURLToPath(new URL('./mote-model.ts', import.meta.url));
const MOTE_FIELD_TSX = fileURLToPath(new URL('./mote-field.tsx', import.meta.url));
const STROKE_MODEL_TS = fileURLToPath(new URL('./stroke-model.ts', import.meta.url));
const BODY_FIELD_TSX = fileURLToPath(new URL('./body-field.tsx', import.meta.url));
const NOTABLE_MODEL_TS = fileURLToPath(new URL('./notable-model.ts', import.meta.url));
const MOON_FIELD_TSX = fileURLToPath(new URL('./moon-field.tsx', import.meta.url));
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
    orbitNormal: { x: 0, y: -1, z: 0 },
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

test('the committed artifact yields one Star per Client and one Planet per Project — the shape shipping today', () => {
  // It is what a visitor actually sees. Counts are read off the artifact rather
  // than pinned, so adding a career entry does not fail this test.
  const artifact = committedArtifact();
  const { bodies } = buildScene(artifact);
  const projects = artifact.clients.flatMap((entry) => entry.projects);
  assert.ok(artifact.clients.length > 0, 'the committed artifact is not empty');
  assert.equal(bodies.filter((body) => body.kind === 'star').length, artifact.clients.length, 'one Star per Client');
  assert.equal(bodies.filter((body) => body.kind === 'planet').length, projects.length, 'one Planet per Project');
  assert.equal(bodies.length, artifact.clients.length + projects.length, 'and no third kind of Body');
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
          orbitNormal: { x: 0, y: -1, z: 0 },
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

      // The orbit plane (3.2) is guarded the same way: a non-finite normal would
      // draw an orbit of NaN vertices, in silence.
      const normal = { x: 0, y: -1, z: 0, [axis]: value };
      assert.throws(
        () =>
          buildScene({
            clients: [client('client:a', at(0), project('project:bad', 'client:a', at(2), { orbitNormal: normal }))],
          }),
        (error: Error) =>
          /project:bad/.test(error.message) &&
          /orbit normal/.test(error.message) &&
          new RegExp(`\\b${axis}\\b`).test(error.message),
        `a Planet's orbit normal ${axis} = ${String(value)} must name the Project, the normal and the axis`,
      );
    }
  }
});

test('a Planet with no orbit normal throws naming the Project', () => {
  // The type says every Project carries one; a hand-built document that never
  // passed the gate may not, and it should fail by name rather than draw no orbit.
  const { orbitNormal: _normal, ...planeless } = project('project:bad', 'client:a', at(2));
  assert.throws(
    () => buildScene({ clients: [client('client:a', at(0), planeless as SceneArtifactProject)] }),
    (error: Error) => /project:bad/.test(error.message) && /orbit normal/.test(error.message),
  );
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
  // Asserted over the committed Bodies because that is the document where the bug
  // was real, then shifted off the origin: the bug needs a centre away from the
  // origin, and where the committed centre falls moves with every career entry —
  // with three Clients it sat close enough that aiming at the origin lost nothing.
  // A shift of twice the framing distance turns the aim well past the frustum's edge.
  const committed = buildScene(committedArtifact()).bodies;
  const framing = frameBodies(committed);
  const shift = 2 * Math.hypot(
    framing.position.x - framing.target.x,
    framing.position.y - framing.target.y,
    framing.position.z - framing.target.z,
  );
  const bodies = committed.map((body) => ({ ...body, position: { ...body.position, x: body.position.x + shift } }));
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

test('the margins the framing and the Rail stops leave are at least the largest radius the renderer draws', () => {
  // `BODY_MARGIN` lives in this model and the drawn radii in `stroke-model.ts` (3.2),
  // which `body-field.tsx` draws every outline at. Both are `.ts`, so the radii are
  // imported and compared rather than read off a renderer's source. Safe at 3 > 1
  // today and silently wrong the moment a story raises the radius — which is exactly
  // the kind of coupling that survives a review and fails in a browser.
  for (const radius of [STAR_RADIUS, PLANET_RADIUS]) {
    assert.ok(
      radius <= BODY_MARGIN,
      `BODY_MARGIN (${BODY_MARGIN}) must cover the drawn radius ${radius}, or the outermost Body clips`,
    );
    // A Rail stop contains each Body of its system as a sphere of `STOP_MARGIN`
    // (`rail-model.ts`), so that sphere must cover the drawn one too.
    assert.ok(
      radius <= STOP_MARGIN,
      `STOP_MARGIN (${STOP_MARGIN}) must cover the drawn radius ${radius}, or a Body clips at its stop`,
    );
    // A focus pose keeps a sphere of `FOCUS_REACH` around the Planet inside the free
    // region (`focus-model.ts`), so that sphere must cover the drawn one too.
    assert.ok(
      radius <= FOCUS_REACH,
      `FOCUS_REACH (${FOCUS_REACH}) must cover the drawn radius ${radius}, or the focused Planet clips`,
    );
    // The innermost Mote orbit (`mote-model.ts`) clears the drawn Body it circles, dot
    // included, so no Mote ever passes through its Planet.
    assert.ok(
      (MOTE_ORBIT_RADII[0] ?? 0) - MOTE_RADIUS > radius,
      `the innermost Mote orbit (${MOTE_ORBIT_RADII[0]} − ${MOTE_RADIUS}) must clear the drawn radius ${radius}`,
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
  for (const path of [MODEL_TS, DUST_TS, SCENE_TSX, RAIL_MODEL_TS, RAIL_CAMERA_TSX, FOCUS_MODEL_TS, FLIGHT_MODEL_TS, SCENE_PICK_TS, MOTE_MODEL_TS, MOTE_FIELD_TSX, STROKE_MODEL_TS, BODY_FIELD_TSX, NOTABLE_MODEL_TS, MOON_FIELD_TSX]) {
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

/**
 * An assignment to, or a default of, `isDeep` (`=`, `??`, `??=`, `||`, `||=`,
 * `&&=`), or an object literal that sets it to a constant or a negation
 * (`isDeep: true`, `isDeep: !…`) — never a comparison or a condition, which read
 * it, nor a type annotation or a carry (`isDeep: project.isDeep`).
 */
const ISDEEP_WRITE = /\bisDeep\s*=(?!=)|\bisDeep\s*\?\?|\bisDeep\s*\|\||\bisDeep\s*&&=|\bisDeep\s*:\s*(?:true\b|false\b|!)/;

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
  for (const path of [MODEL_TS, DUST_TS, SCENE_TSX, RAIL_MODEL_TS, RAIL_CAMERA_TSX, FOCUS_MODEL_TS, FLIGHT_MODEL_TS, SCENE_PICK_TS, MOTE_MODEL_TS, MOTE_FIELD_TSX, STROKE_MODEL_TS, BODY_FIELD_TSX, NOTABLE_MODEL_TS, MOON_FIELD_TSX]) {
    const code = codeOf(path);
    assert.doesNotMatch(code, /\bclassify\w*\s*\(|\bfunction\s+classify/i, 'no classification test');
    assert.doesNotMatch(code, /\b(?:luminance|mote|mass|rail)(?:Band|Tier|Of|For|From)?\s*\(/i, 'no mapping computed');
    assert.doesNotMatch(code, ISDEEP_WRITE, 'depth is read, never assigned or defaulted');
  }
  // A comparison is a read (3.3's `body.isDeep === true`); an assignment or a default is not.
  for (const form of [
    'body.isDeep = true;',
    'const isDeep = notable !== null;',
    'const d = body.isDeep ?? false;',
    '{ isDeep=1 }',
    'const d = body.isDeep || false;',
    'body.isDeep ||= true;',
    'body.isDeep &&= false;',
    'notableRings({ ...body, isDeep: true })',
    'const fake = { isDeep : false };',
    'const flipped = { ...body, isDeep: !body.isDeep };',
  ]) {
    assert.match(form, ISDEEP_WRITE, `${form} must be rejected`);
  }
  for (const form of [
    'body.isDeep === true',
    'body.isDeep !== true',
    'body.isDeep == true',
    'const mark = body.isDeep ? ring : none;',
    'const deep = body.isDeep && ring;',
    'isDeep: project.isDeep,',
    'readonly isDeep: boolean;',
    'readonly isDeep?: boolean;',
  ]) {
    assert.doesNotMatch(form, ISDEEP_WRITE, `${form} reads and must pass`);
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
  // No interaction at all since 3.2: the one click — a Body's, handed to
  // `activateBody` — is `<BodyField>`'s, held there by `auditPick`. Everything here
  // — a click, hover, pointer-over, pointer-missed, a raycast of its own — is banned.
  if (/\braycast\w*|\bonClick\b|\bonPointer\w+|\bonWheel\b|\bonScroll\b|\bonDoubleClick\b|\bonContextMenu\b|\bonUpdate\b/i.test(code)) {
    failures.push('handles an interaction — the one click is a Body’s, bound in body-field.tsx');
  }
  if (/\bactivateBody\b/.test(code)) {
    failures.push('reaches activateBody — the Bodies’ binding owns the click');
  }
  if (/\bfocusProject\b|\breleaseFocus\b|\bselectClient\b|\badvanceScroll\b/.test(code)) {
    failures.push('names a navigation event — the click reaches the store through activateBody alone');
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
    // Since 3.2 the scene binds no interaction at all — the click moved with the
    // Bodies into `body-field.tsx` — so even the binding that used to be allowed is
    // rejected here, with every neighbour of it.
    'bodies.map((body) => <mesh key={body.id} onClick={(event) => activateBody(body, event)} />)',
    'bodies.map((body) => <mesh key={body.id} onPointerOver={(event) => activateBody(body, event)} />)',
    'bodies.map((body) => <mesh key={body.id} onPointerEnter={() => activateBody(body)} />)',
    '<Canvas aria-hidden="true" onPointerMissed={() => releaseFocus()}>',
    'bodies.map((body) => <mesh key={body.id} onPointerMissed={() => undefined} />)',
    'bodies.map((body) => <mesh key={body.id} onDoubleClick={(event) => activateBody(body, event)} />)',
    'bodies.map((body) => <mesh key={body.id} onClick={(event) => focusProject(body.id)} />)',
    "import { activateBody } from './scene-pick.ts';",
    'const pick = () => activateBody(bodies[0]);',
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
    '<BodyField bodies={bodies} rail={rail} />',
    '<div aria-hidden="true" style={vignetteStyle()} />',
  ]) {
    assert.deepEqual(auditRenderer(form), [], `${form} is the mapping itself and must pass`);
  }
});

test('every Body’s hit sphere hands its click to activateBody, and that is the only handler', () => {
  // Pinned positively: deleting the handler is a one-line edit every negative scan
  // passes, and a Planet in the scene then cannot be picked (2.7). The rule the click
  // runs is executed in `scene-pick.test.ts`; this holds the binding, which moved
  // with the Bodies into `body-field.tsx` (3.2).
  const real = readFileSync(BODY_FIELD_TSX, 'utf8');
  assert.deepEqual(auditPick(real), []);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['the click deleted', (source) => source.replace(' onClick={(event) => activateBody(body, event)}', '')],
    ['the event dropped', (source) => source.replace('activateBody(body, event)', 'activateBody(body)')],
    ['the import dropped', (source) => source.replace("import { activateBody } from './scene-pick.ts';", '')],
    ['a hover beside it', (source) => source.replace('onClick={(event)', 'onPointerOver={() => undefined}\n            onClick={(event)')],
    ['the hit sphere drawn', (source) => source.replace('<mesh visible={false} onClick', '<mesh onClick')],
    ['a click on the outline', (source) => source.replace('<Billboard>', '<Billboard onClick={(event) => activateBody(body, event)}>')],
    ['a click on a line', (source) => source.replace('key={line.id}', 'key={line.id}\n          onPointerMissed={() => undefined}')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply to the shipped binding`);
    assert.notDeepEqual(auditPick(mutated), [], `"${name}" must be rejected`);
  }
});

/**
 * The pick binding, positively: inside the Bodies' map, one hidden hit sphere per
 * Body carries `onClick={(event) => activateBody(body, event)}`, imported from the
 * pure rule — and nothing else in the file handles any interaction.
 */
function auditPick(source: string): string[] {
  const code = blankProse(source);
  const failures: string[] = [];
  const pick = /\bonClick=\{\s*\(\s*event\s*\)\s*=>\s*activateBody\(\s*body\s*,\s*event\s*\)\s*\}/g;
  const blocks = mapBlocks(code, 'bodies');
  if (blocks.length !== 1) failures.push('the Bodies are not mapped exactly once');
  const block = blocks[0] ?? '';
  // The mesh's opening tag, read up to the first child element rather than to the
  // first `>` — the handler's own `=>` would end a `[^>]*` match inside it.
  const hits = (block.match(/<mesh\b[\s\S]*?>\s*</g) ?? []).filter((mesh) => /\bonClick\b/.test(mesh));
  if (hits.length !== 1) failures.push('not exactly one hit mesh per Body carries the click');
  for (const hit of hits) {
    if (!/\bvisible=\{\s*false\s*\}/.test(hit)) failures.push('the hit sphere is drawn — it must be visible={false}, an outline is the Body');
    if (!/\bonClick=\{\s*\(\s*event\s*\)\s*=>\s*activateBody\(\s*body\s*,\s*event\s*\)\s*\}/.test(hit)) {
      failures.push('a Body’s hit sphere does not hand its click, and the event, to activateBody');
    }
  }
  if ((code.match(pick) ?? []).length !== 1) failures.push('the click is bound other than once');
  const rest = code.replace(pick, '');
  if (/\braycast\w*|\bonClick\b|\bonPointer\w+|\bonWheel\b|\bonScroll\b|\bonDoubleClick\b|\bonContextMenu\b|\bonUpdate\b/i.test(rest)) {
    failures.push('handles an interaction beyond onClick → activateBody(body, event) — Focus is deliberate, never hover');
  }
  if (!/import\s*\{\s*activateBody\s*\}\s*from\s*'\.\/scene-pick\.ts'/.test(blankComments(source))) {
    failures.push('activateBody is not imported from the pure rule');
  }
  return failures;
}

test('the drawn radius discriminates on kind, never on a missing mass', () => {
  // Pinned positively, because a negative scan cannot observe a correct form going
  // missing — and the wrong form is a plausible one-line edit. `mass === undefined`
  // means a Planet arriving without mass renders silently Star-sized instead of
  // surfacing; the union is what the model defined, so `kind` is the question with an
  // answer. Since 3.2 the radius is `stroke-model.ts`'s `bodyRadius`.
  const code = quotedCodeOf(STROKE_MODEL_TS);
  const radius = /export function bodyRadius[\s\S]*?\n\}/.exec(code)?.[0] ?? '';
  assert.match(radius, /body\.kind\s*===\s*'star'/, 'the size question is asked of kind');
  assert.doesNotMatch(code, /mass\s*===\s*undefined|mass\s*!==\s*undefined|body\.mass\s*\?\?/, 'never of a missing mass');
  assert.doesNotMatch(code, /!\s*body\.mass\b/, 'nor of its truthiness — mass is a positive number, but zero reads false');
});

// --- The Bodies' binding (3.2) ------------------------------------------------

/**
 * `body-field.tsx`'s contract, as a pure function over its source.
 *
 * Every ladder rule is executed in `stroke-model.test.ts` and the Rail line in
 * `rail-model.test.ts`; this holds the binding. Negatively: no store write and
 * no named event, no frame loop, no reactive state or effect, no DOM, no ordering
 * or selection, no coordinate literal, no light, and no line geometry but drei's
 * `<Line>`. Positively:
 *
 *   - **One subscription, by selector**: exactly
 *     `const subject = useSyncExternalStore(navigationStore.subscribe, () => sceneSubject(navigationStore.getState(), rail))`.
 *   - **Lines only from named model functions**: exactly three `<Line>`s — one per
 *     `sceneLines(bodies, railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT))` entry,
 *     drawn in that line's points, colour and weight; and one outline per Body, in
 *     a `<Billboard>`, on `circlePoints(CIRCLE_SEGMENTS, bodyRadius(body))`,
 *     coloured and weighted by `bodyStroke(body, subject)`.
 *   - **Core dots from `coreDots(body, subject)`**, a `circleGeometry` of the dot's
 *     radius in the dot's colour.
 *   - **The Ring (3.3) from `notableRings(body)`**, a third `<Line>` inside the
 *     Body's billboard, in the ring's points, colour and weight — handed the Body
 *     alone, never the subject, so it is at rest and always.
 *   - **Draw order**: every visible draw at `BODY_RENDER_ORDER`, `transparent` at
 *     opacity 1 — after the Dust — and nothing else carries a `renderOrder`.
 */
function auditBodyField(source: string): string[] {
  const code = blankProse(source);
  const quoted = blankComments(source);
  const failures: string[] = [];
  const squash = (text: string) => text.replace(/\s+/g, ' ');

  if (/\.setState\b|\bsetState\b\s*[:,)}]/.test(code)) failures.push('writes the store with setState');
  if (/\b(?:advanceScroll|selectClient|focusProject|releaseFocus|enterRail|enterFreeFlight|resetNavigation|activateClient|activateProject)\b/.test(code)) {
    failures.push('names a navigation event — a Body reaches the store through activateBody alone');
  }
  if (/\buseFrame\b|\buseThree\b|\buseState\b|\buseReducer\b|\buseEffect\b|\buseLayoutEffect\b|\buseMemo\b|\buseRef\b|\buseStore\b|\buseShallow\b/.test(code) || /['"]zustand(?:\/react)?/.test(quoted)) {
    failures.push('holds a frame loop, reactive state, an effect or a zustand binding — one selector subscription only');
  }
  const subscriptions = code.match(/\buseSyncExternalStore\s*\(/g) ?? [];
  if (
    subscriptions.length !== 1 ||
    !/const subject = useSyncExternalStore\(navigationStore\.subscribe, \(\) => sceneSubject\(navigationStore\.getState\(\), rail\)\);/.test(squash(code))
  ) {
    failures.push('the subject is not read by exactly one useSyncExternalStore selector over sceneSubject');
  }
  if (/\bwindow\b|\bdocument\b|innerWidth|innerHeight|getBoundingClientRect|addEventListener|matchMedia/.test(code)) {
    failures.push('reads the DOM');
  }
  if (/\.sort\s*\(|\.filter\s*\(|\.reverse\s*\(|\.slice\s*\(|\.find\s*\(/.test(code)) {
    failures.push('orders or selects — what is drawn, and how, is the model’s');
  }
  if (/\b(?:ambient|directional|point|spot|hemisphere)Light\b|\bmeshStandardMaterial\b|\bmeshPhongMaterial\b|\bmeshLambertMaterial\b/.test(code)) {
    failures.push('lights or shades a Body — every material is unlit');
  }
  failures.push(...coordinateLiterals(code));

  // Line geometry: drei's `<Line>` and nothing else, imported with the billboard only.
  for (const element of CONNECTOR_ELEMENTS) {
    // Case-sensitive here, so drei's `<Line>` is not read as Three's `<line>`.
    if (element !== 'Line' && new RegExp(`<\\s*${element}\\b`).test(code)) failures.push(`draws <${element}>`);
  }
  if (/\bwireframe\b/i.test(code)) failures.push('sets wireframe');
  if (!/import\s*\{\s*Billboard\s*,\s*Line\s*\}\s*from\s*'@react-three\/drei'/.test(quoted)) {
    failures.push('does not import exactly { Billboard, Line } from drei');
  }
  const lines = (code.match(/<Line\b[\s\S]*?\/>/g) ?? []).map(squash);
  if (lines.length !== 3) failures.push(`draws ${lines.length} <Line> elements — one for the scene's hairlines, one per Body outline, one per Ring`);
  const sceneBlocks = mapBlocks(code, 'sceneLines\\(\\s*bodies\\s*,\\s*railLine\\(\\s*rail\\s*,\\s*RAIL_LINE_SAMPLES_PER_SEGMENT\\s*\\)\\s*\\)');
  const sceneLine = squash(sceneBlocks[0]?.match(/<Line\b[\s\S]*?\/>/)?.[0] ?? '');
  if (sceneBlocks.length !== 1 || !/^sceneLines\([^)]*\)\)\s*\.\s*map\(\s*\(\s*line\s*\)\s*=>/.test(squash(sceneBlocks[0] ?? ''))) {
    failures.push('the orbits and the Rail are not drawn from sceneLines(bodies, railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT)), once');
  }
  for (const [attribute, expected] of [
    ['key', 'line.id'],
    ['points', 'line.points'],
    ['color', 'line.color'],
    ['lineWidth', 'line.widthPx'],
  ] as const) {
    if (!new RegExp(`\\b${attribute}=\\{\\s*${expected.replace('.', '\\.')}\\s*\\}`).test(sceneLine)) {
      failures.push(`a scene hairline's ${attribute} is not ${expected}`);
    }
  }
  const bodyBlock = mapBlocks(code, 'bodies')[0] ?? '';
  const billboard = /<Billboard>([\s\S]*?)<\/Billboard>/.exec(bodyBlock)?.[1] ?? '';
  const outline = squash(billboard.match(/<Line\b[\s\S]*?\/>/)?.[0] ?? '');
  if (outline === '') failures.push('a Body outline is not a <Line> inside a camera-facing <Billboard>');
  for (const [attribute, expected] of [
    ['points', /\bpoints=\{\s*circlePoints\(\s*CIRCLE_SEGMENTS\s*,\s*bodyRadius\(\s*body\s*\)\s*\)\s*\}/],
    ['color', /\bcolor=\{\s*bodyStroke\(\s*body\s*,\s*subject\s*\)\.color\s*\}/],
    ['lineWidth', /\blineWidth=\{\s*bodyStroke\(\s*body\s*,\s*subject\s*\)\.widthPx\s*\}/],
  ] as const) {
    if (!expected.test(outline)) failures.push(`a Body outline's ${attribute} is not the stroke model's`);
  }
  for (const line of lines) {
    if (!/\btransparent(?:\s*=\s*\{\s*true\s*\}|(?![\w-]|\s*=))/.test(line)) failures.push('a line is opaque — it would draw before the Dust');
    if (!/\bopacity=\{\s*1\s*\}/.test(line)) failures.push('a line is not at opacity 1 — transparent is for ordering, never for fading');
    if (!/\brenderOrder=\{\s*BODY_RENDER_ORDER\s*\}/.test(line)) failures.push('a line lacks renderOrder={BODY_RENDER_ORDER}');
  }

  // Where each Body is drawn, and how large its hit sphere is: the group carries the
  // Body's own solved position, axis for axis, and the hit sphere the drawn radius.
  if (!/^bodies\.map\(\s*\(\s*body\s*\)\s*=>\s*\(\s*<group\s+key=\{\s*body\.id\s*\}\s+position=\{\s*\[\s*body\.position\.x\s*,\s*body\.position\.y\s*,\s*body\.position\.z\s*\]\s*\}\s*>/.test(squash(bodyBlock))) {
    failures.push('a Body is not drawn in a group at [body.position.x, body.position.y, body.position.z]');
  }
  if ((bodyBlock.match(/<group\b/g) ?? []).length !== 1) failures.push('a Body is drawn other than in one positioned group');
  if (!/<mesh visible=\{false\}[^]*?<sphereGeometry\s+args=\{\s*\[\s*bodyRadius\(\s*body\s*\)\s*,/.test(squash(bodyBlock))) {
    failures.push('the hit sphere is not the drawn radius, bodyRadius(body)');
  }

  // The Ring (3.3): one per `notableRings(body)` entry, inside the billboard, handed
  // the Body alone — never the subject — and drawn in the ring's own geometry.
  const ringBlocks = mapBlocks(code, 'notableRings\\(\\s*body\\s*\\)');
  if (ringBlocks.length !== 1 || (code.match(/\bnotableRings\s*\(/g) ?? []).length !== 1 || !billboard.includes('notableRings(')) {
    failures.push('the Rings are not notableRings(body), once, inside the billboard');
  }
  const ringBlock = squash(ringBlocks[0] ?? '');
  if (!/^notableRings\(\s*body\s*\)\s*\.\s*map\(\s*\(\s*ring\s*\)\s*=>/.test(ringBlock)) failures.push('the Rings are not mapped as (ring)');
  const ringLine = ringBlock.match(/<Line\b[\s\S]*?\/>/)?.[0] ?? '';
  for (const [attribute, expected] of [
    ['key', 'ring.id'],
    ['points', 'ring.points'],
    ['color', 'ring.color'],
    ['lineWidth', 'ring.widthPx'],
  ] as const) {
    if (!new RegExp(`\\b${attribute}=\\{\\s*${expected.replace('.', '\\.')}\\s*\\}`).test(ringLine)) {
      failures.push(`a Ring's ${attribute} is not ${expected}`);
    }
  }
  if (!/import\s*\{\s*notableRings\s*\}\s*from\s*'\.\/notable-model\.ts'/.test(quoted)) {
    failures.push('notableRings is not imported from the notable model');
  }

  // Core dots.
  const dotBlocks = mapBlocks(code, 'coreDots\\(\\s*body\\s*,\\s*subject\\s*\\)');
  if (dotBlocks.length !== 1 || !billboard.includes('coreDots(')) failures.push('the core dots are not coreDots(body, subject), inside the billboard');
  const dots = dotBlocks[0] ?? '';
  const dotMesh = dots.match(/<mesh\b[^>]*>/)?.[0] ?? '';
  if (!/\brenderOrder=\{\s*BODY_RENDER_ORDER\s*\}/.test(dotMesh)) failures.push('a core dot lacks renderOrder={BODY_RENDER_ORDER}');
  if (!/<circleGeometry\s+args=\{\s*\[\s*dot\.radius\s*,/.test(dots)) failures.push('a core dot is not a circle of the dot’s radius');
  if (!/\bkey=\{\s*dot\.id\s*\}/.test(dotMesh)) failures.push('a core dot is not keyed by its own id');

  // Every material: unlit, transparent at opacity 1, in a model colour.
  const materials = code.match(/<\w+Material\b[^>]*>/g) ?? [];
  if (materials.length !== 1) failures.push(`${materials.length} materials — the core dot's, and nothing else`);
  for (const material of materials) {
    if (!/^<meshBasicMaterial\b/.test(material)) failures.push('a material is lit');
    if (!/\bcolor=\{\s*dot\.color\s*\}/.test(material)) failures.push('a core dot is not drawn in the dot’s colour');
    if (!/\btransparent(?:\s*=\s*\{\s*true\s*\}|(?![\w-]|\s*=))/.test(material)) failures.push('a core dot is opaque');
    if (!/\bopacity=\{\s*1\s*\}/.test(material)) failures.push('a core dot is not at opacity 1');
  }
  // `renderOrder` sits on the four audited draws — the scene hairlines, the outline,
  // the Ring and the core dot — and nowhere else.
  const orders = code.match(/\brenderOrder\s*=\s*\{?\s*([^}\s]*)/g) ?? [];
  if (orders.length !== 4 || orders.some((order) => !/BODY_RENDER_ORDER/.test(order))) {
    failures.push('a renderOrder other than the three lines’ and the core dot’s BODY_RENDER_ORDER');
  }
  // Every colour comes from the model: a line's, a stroke's, a ring's, a dot's.
  for (const match of code.matchAll(/\bcolor=\{\s*([^}]*?)\s*\}/g)) {
    if (!['line.color', 'bodyStroke(body, subject).color', 'ring.color', 'dot.color'].includes(squash(match[1] ?? ''))) {
      failures.push(`colour {${match[1]}} is not the stroke or the notable model's`);
    }
  }
  if (/\bink-|\btokens\b/.test(quoted)) failures.push('reads a token directly — every colour comes from the stroke model, and no ink is a line');
  return [...failures, ...auditPick(source)];
}

test('the Bodies’ binding draws the stroke model and holds no rule of its own', () => {
  assert.deepEqual(auditBodyField(readFileSync(BODY_FIELD_TSX, 'utf8')), []);
});

/** The Ring's whole map block in the shipped binding, for the mutations below. */
const RING_BLOCK = /\s*\{notableRings\(body\)\.map\(\(ring\) => \([\s\S]*?\/>\s*\)\)\}/;

test('the Bodies’ binding audit rejects the real binding with any one guarantee broken', () => {
  const real = readFileSync(BODY_FIELD_TSX, 'utf8');
  const SUB = 'useSyncExternalStore(navigationStore.subscribe, () => sceneSubject(navigationStore.getState(), rail))';
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a store write', (s) => s.replace('return (', 'navigationStore.setState({ focusedProjectId: null });\n  return (')],
    ['a named event', (s) => s.replace('return (', 'releaseFocus();\n  return (')],
    ['a frame loop', (s) => s.replace('return (', 'useFrame(() => undefined);\n  return (')],
    ['reactive state', (s) => s.replace('return (', 'const [x] = useState(0);\n  return (')],
    ['a zustand hook', (s) => s.replace(SUB, 'useStore(navigationStore, (state) => sceneSubject(state, rail))')],
    ['the whole state subscribed', (s) => s.replace(SUB, 'useSyncExternalStore(navigationStore.subscribe, navigationStore.getState)')],
    ['the subject from nowhere', (s) => s.replace(SUB, 'useSyncExternalStore(navigationStore.subscribe, () => null)')],
    ['a DOM read', (s) => s.replace('return (', 'const w = window.innerWidth;\n  return (')],
    ['a selection of Bodies', (s) => s.replace('{bodies.map(', '{bodies.filter((body) => body.kind === "star").map(')],
    ['a light', (s) => s.replace('<Billboard>', '<ambientLight />\n          <Billboard>')],
    ['a lit dot', (s) => s.replace('<meshBasicMaterial', '<meshStandardMaterial')],
    ['a literal-coloured outline', (s) => s.replace('color={bodyStroke(body, subject).color}', 'color={WHITE}')],
    ['the outline weight invented', (s) => s.replace('lineWidth={bodyStroke(body, subject).widthPx}', 'lineWidth={2}')],
    ['a hairline colour invented', (s) => s.replace('color={line.color}', 'color={RAIL}')],
    ['a hairline weight invented', (s) => s.replace('lineWidth={line.widthPx}', 'lineWidth={1}')],
    ['a token read directly', (s) => s.replace('color={dot.color}', "color={tokens.colors['ink-lift-dark']}")],
    ['the outline not facing the camera', (s) => s.replace('<Billboard>', '<group>').replace('</Billboard>', '</group>')],
    ['the outline off its radius', (s) => s.replace('circlePoints(CIRCLE_SEGMENTS, bodyRadius(body))', 'circlePoints(CIRCLE_SEGMENTS, 3)')],
    ['the orbits not drawn', (s) => s.replace('sceneLines(bodies, railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT))', 'sceneLines(bodies, [])')],
    ['a third line', (s) => s.replace('<Billboard>', '<Line points={[]} transparent opacity={1} renderOrder={BODY_RENDER_ORDER} />\n          <Billboard>')],
    ['a drei connector', (s) => s.replace('<Billboard>', '<QuadraticBezierLine start={a} end={b} />\n          <Billboard>')],
    ['a line loses its order', (s) => s.replace('renderOrder={BODY_RENDER_ORDER}', '')],
    ['a line goes opaque', (s) => s.replace(/(<Line\b[^/]*?)\s*transparent\b/, '$1')],
    ['a line fades', (s) => s.replace('opacity={1}', 'opacity={0.5}')],
    ['a dot loses its order', (s) => s.replace('<mesh key={dot.id} renderOrder={BODY_RENDER_ORDER}>', '<mesh key={dot.id}>')],
    ['a dot keyed by a constant', (s) => s.replace('<mesh key={dot.id}', '<mesh key="core"')],
    ['the position deleted', (s) => s.replace(' position={[body.position.x, body.position.y, body.position.z]}', '')],
    ['the axes swapped', (s) => s.replace('[body.position.x, body.position.y, body.position.z]', '[body.position.y, body.position.x, body.position.z]')],
    ['the hit radius a Planet’s', (s) => s.replace('args={[bodyRadius(body), 16, 12]}', 'args={[PLANET_RADIUS, 16, 12]}')],
    ['a dot fades', (s) => s.replace('transparent opacity={1} />', 'transparent opacity={0.5} />')],
    ['a dot goes opaque', (s) => s.replace('color={dot.color} transparent', 'color={dot.color}')],
    ['a dot off its radius', (s) => s.replace('args={[dot.radius, 24]}', 'args={[0.2, 24]}')],
    ['the dots on every Body', (s) => s.replace('coreDots(body, subject)', 'coreDots(body, body.id)')],
    ['a literal order', (s) => s.replace('renderOrder={BODY_RENDER_ORDER}', 'renderOrder={3}')],
    ['a coordinate literal', (s) => s.replace('return (', 'const home = [0, 0, 40];\n  return (')],
    // The Ring (3.3).
    ['the Ring not drawn', (s) => s.replace(RING_BLOCK, '')],
    ['the Ring outside the billboard', (s) => s.replace(RING_BLOCK, '').replace('</Billboard>', `</Billboard>${RING_BLOCK.exec(s)?.[0] ?? ''}`)],
    ['the Ring drawn twice', (s) => s.replace(RING_BLOCK, (block) => `${block}${block}`)],
    ['the Ring read off the subject', (s) => s.replace('notableRings(body)', 'notableRings(body, subject)')],
    ['the Ring on every Body', (s) => s.replace('notableRings(body)', 'notableRings({ ...body, isDeep: true })')],
    ['a Ring colour invented', (s) => s.replace('color={ring.color}', 'color={RING}')],
    ['a Ring in a hairline’s colour', (s) => s.replace('color={ring.color}', 'color={line.color}')],
    ['a Ring weight invented', (s) => s.replace('lineWidth={ring.widthPx}', 'lineWidth={2}')],
    ['the Ring off its circle', (s) => s.replace('points={ring.points}', 'points={circlePoints(CIRCLE_SEGMENTS, 3)}')],
    ['a Ring keyed by a constant', (s) => s.replace('key={ring.id}', 'key="ring"')],
    ['a Ring fades', (s) => s.replace(/(lineWidth=\{ring\.widthPx\}\s*transparent\s*)opacity=\{1\}/, '$1opacity={0.4}')],
    ['a Ring loses its order', (s) => s.replace(/(lineWidth=\{ring\.widthPx\}\s*transparent\s*opacity=\{1\}\s*)renderOrder=\{BODY_RENDER_ORDER\}/, '$1')],
    ['a Ring goes opaque', (s) => s.replace(/(lineWidth=\{ring\.widthPx\}\s*)transparent\s*/, '$1')],
    ['the Ring import dropped', (s) => s.replace("import { notableRings } from './notable-model.ts';", '')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply to the shipped binding`);
    assert.notDeepEqual(auditBodyField(mutated), [], `"${name}" must be rejected`);
  }
});

// --- The two ladders never borrow each other's tokens (3.2) --------------------

/**
 * Every scene line takes a `stroke-*` token and every scene glyph an `ink-*` one,
 * as a pure function over files: an `ink-` token inside a line element or line
 * material, or anywhere in the stroke model, is a line drawn in a glyph's ink; a
 * `stroke-` token, or a stroke-backed constant (`MOTE_COLOR`, `strokeColor(`,
 * `DUST_*_COLOR`), inside a `*LabelStyle` function is a glyph drawn in a line's
 * stroke.
 */
function auditLadders(files: readonly { readonly path: string; readonly source: string }[]): string[] {
  const failures: string[] = [];
  for (const file of files) {
    const code = blankComments(file.source);
    if (file.path.endsWith('/stroke-model.ts') && /\bink-/.test(code)) {
      failures.push(`${file.path} names an ink token — the stroke model colours lines only`);
    }
    // A line element, read up to its own closing `/>` or `>` with no `=` before
    // it — so the `>` of an arrow (`=>`) inside an attribute does not end it early.
    const lineElements =
      code.match(
        /<(?:Line|line|lineSegments|lineLoop|QuadraticBezierLine|CubicBezierLine|CatmullRomLine|line\w*Material)\b(?:=>|[^>])*>/g,
      ) ?? [];
    for (const element of lineElements) {
      if (/\bink-/.test(element)) failures.push(`${file.path} draws a line in an ink token`);
    }
    // A label style in any declaration form — `function fooLabelStyle`, or a
    // `const`/`let` bound to an arrow or function expression — read to the end of
    // its body by balanced braces.
    for (const start of code.matchAll(/\b(?:function\s+\w*LabelStyle\b|(?:const|let|var)\s+\w*LabelStyle\b\s*(?::[^=]*)?=)/g)) {
      const open = code.indexOf('{', start.index);
      let depth = 0;
      let end = code.length;
      for (let index = open; index !== -1 && index < code.length; index += 1) {
        if (code[index] === '{') depth += 1;
        if (code[index] === '}') {
          depth -= 1;
          if (depth === 0) {
            end = index + 1;
            break;
          }
        }
      }
      const style = code.slice(start.index, end);
      if (/\bstroke-|\bMOTE_COLOR\b|\bstrokeColor\s*\(|\bDUST_\w*COLOR\b/.test(style)) {
        failures.push(`${file.path} styles a label with a stroke token`);
      }
    }
  }
  return failures;
}

function renderSceneSources(): { path: string; source: string }[] {
  return readdirSync(SCENE_DIR)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.ts$/.test(name))
    .map((name) => ({ path: `src/render-scene/${name}`, source: readFileSync(join(SCENE_DIR, name), 'utf8') }));
}

test('no ink token on a line, and no stroke token on a label', () => {
  const files = renderSceneSources();
  assert.ok(files.some((file) => file.path.endsWith('/mote-model.ts')), 'the walk reaches the one label style');
  assert.deepEqual(auditLadders(files), []);
});

test('the ladder audit rejects each borrowing', () => {
  for (const [path, source] of [
    ['src/render-scene/stroke-model.ts', "const c = tokens.colors['ink-label-dark'];"],
    ['src/render-scene/body-field.tsx', "<Line points={p} color={tokens.colors['ink-faint-dark']} />"],
    ['src/render-scene/x.tsx', "<lineBasicMaterial color={tokens.colors['ink-faint-dark']} />"],
    ['src/render-scene/mote-model.ts', 'export function moteLabelStyle() {\n  return { color: MOTE_COLOR };\n}'],
    ['src/render-scene/mote-model.ts', "export function moteLabelStyle() {\n  return { color: tokens.colors['stroke-rest-dark'] };\n}"],
    // The forms that escaped the first audit: an arrow-bound style, and a line whose
    // attribute holds an arrow before its ink.
    ['src/render-scene/mote-model.ts', 'export const moteLabelStyle = () => ({ color: MOTE_COLOR });'],
    ['src/render-scene/mote-model.ts', "const sceneLabelStyle: () => Style = function () {\n  return { color: tokens.colors['stroke-focus-dark'] };\n};"],
    ['src/render-scene/body-field.tsx', "<Line points={p} onUpdate={(l) => l} color={tokens.colors['ink-lift-dark']} />"],
    ['src/render-scene/body-field.tsx', "<Line\n  points={p.map((q) => q)}\n  color={tokens.colors['ink-prose-dark']}\n/>"],
  ] as const) {
    assert.notDeepEqual(auditLadders([{ path, source }]), [], `${path}: ${source} must be rejected`);
  }
  assert.deepEqual(
    auditLadders([
      { path: 'src/render-scene/mote-model.ts', source: 'export function moteLabelStyle() {\n  return { color: MOTE_LABEL_COLOR };\n}' },
      { path: 'src/render-scene/mote-model.ts', source: 'export const moteLabelStyle = () => ({ color: MOTE_LABEL_COLOR });\nconst w = MOTE_COLOR;' },
      { path: 'src/render-scene/body-field.tsx', source: "<Line points={p.map((q) => q)} color={line.color} />\n<div style={{ color: tokens.colors['ink-label-dark'] }} />" },
      { path: 'src/render-scene/stroke-model.ts', source: "// glyphs take ink-*\nconst c = tokens.colors['stroke-rest-dark'];" },
    ]),
    [],
  );
});

/** Every non-test source file under `src/` outside `src/tokens/`, any extension. */
function untokenisedSources(): { path: string; source: string }[] {
  return readdirSync(SRC_ROOT, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !/\.test\.ts$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
    .map((path) => `src/${relative(SRC_ROOT, path).split(sep).join('/')}`)
    .filter((path) => !path.startsWith('src/tokens/'))
    .map((path) => ({ path, source: readFileSync(join(SRC_ROOT, path.slice('src/'.length)), 'utf8') }));
}

/** The token that fails the contrast floor, assembled so this file never names it whole. */
const QUIET_INK = ['ink', 'quiet'].join('-');

/** Files that name the failing ink token at all. */
function quietInkReaders(files: readonly { readonly path: string; readonly source: string }[]): string[] {
  return files.filter((file) => file.source.includes(QUIET_INK)).map((file) => `${file.path} names ${QUIET_INK}`);
}

test('the ink step below the contrast floor is referenced nowhere under src/ outside tokens/', () => {
  // DESIGN.md: it fails the 4.5:1 floor and must appear on no glyph. The surest way
  // to keep it off every glyph is to keep it out of every file that could draw one.
  const files = untokenisedSources();
  assert.ok(files.some((file) => file.path === 'src/render-scene/README.md'), 'the walk reaches prose too');
  assert.deepEqual(quietInkReaders(files), []);
  assert.notDeepEqual(quietInkReaders([{ path: 'src/shell/x.tsx', source: `color: tokens.colors['${QUIET_INK}-dark']` }]), []);
});

// --- No effects: depth is the ladder's, never shading's (3.2) -----------------

/** The forms that put shadow, blur, glow, bloom, a radius or a light into a surface. */
const EFFECTS =
  /box-shadow|boxShadow|text-shadow|textShadow|drop-shadow|blur\(|border-radius|borderRadius|castShadow|receiveShadow|shadows|bloom|glow|(?:ambient|directional|point|spot|hemisphere)Light/i;

/**
 * Every effect in code, each reported as `file:line` — comments blanked (line count
 * kept), strings kept, since a CSS value is a string.
 */
function effectsIn(files: readonly { readonly path: string; readonly source: string }[]): string[] {
  const every = new RegExp(EFFECTS.source, `${EFFECTS.flags.replace('g', '')}g`);
  return files.flatMap((file) => {
    const code = blankComments(file.source);
    return [...code.matchAll(every)].map((match) => {
      const line = code.slice(0, match.index).split('\n').length;
      return `${file.path}:${line} holds ${match[0]}`;
    });
  });
}

test('no shadow, blur, glow, bloom, radius or light in the scene or the shell', () => {
  const files = sourceFiles().filter(
    (file) => /^src\/(?:render-scene|shell)\//.test(file.path) && !/\.test\.ts$/.test(file.path),
  );
  assert.ok(files.some((file) => file.path === 'src/render-scene/scene.tsx'), 'the walk reaches the scene');
  assert.ok(files.some((file) => file.path === 'src/shell/focus-panel.tsx'), 'and the shell');
  assert.deepEqual(effectsIn(files), []);
});

test('the effects audit rejects each form, in code, and ignores comments', () => {
  for (const source of [
    '<ambientLight intensity={0.6} />',
    '<directionalLight position={p} />',
    '<pointLight />',
    '<spotLight />',
    '<hemisphereLight />',
    '<Canvas shadows>',
    '<mesh castShadow />',
    '<mesh receiveShadow />',
    "const css = 'border-radius: 4px';",
    "const css = 'text-shadow: 0 0 4px';",
    "style={{ boxShadow: '0 0 4px' }}",
    "style={{ textShadow: '0 0 4px' }}",
    "style={{ filter: 'blur(2px)' }}",
    "style={{ filter: 'drop-shadow(0 0 2px)' }}",
    "style={{ borderRadius: '4px' }}",
    "const css = 'box-shadow: none';",
    '<Bloom />',
    'const glowing = true;',
  ]) {
    assert.notDeepEqual(effectsIn([{ path: 'src/shell/x.tsx', source }]), [], `${source} must be rejected`);
  }
  assert.deepEqual(effectsIn([{ path: 'src/shell/x.tsx', source: '// no glow, no bloom, no ambientLight\n/* boxShadow */' }]), []);
  // Every match, not the first, each with its line.
  assert.deepEqual(
    effectsIn([{ path: 'src/shell/x.tsx', source: "const a = 1;\n<ambientLight />\n// glow\nstyle={{ boxShadow: 'x', borderRadius: 2 }}" }]),
    ['src/shell/x.tsx:2 holds ambientLight', 'src/shell/x.tsx:4 holds boxShadow', 'src/shell/x.tsx:4 holds borderRadius'],
  );
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
 * Narrowed in 3.2: orbits and the Rail *are* drawn now, as drei `<Line>`s, and only
 * in `body-field.tsx`, fed only from named model functions (`sceneLines`,
 * `railLine`, `circlePoints`) — `auditBodyField` holds that file instead. Every
 * other module here still draws no line at all.
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

test('no module but the Bodies’ binding draws a line, edge, or connector', () => {
  // The Rail's files too: the Rail is drawn by `body-field.tsx` from `railLine`, and
  // a second, hand-made line elsewhere would be one no audit reads.
  for (const path of [SCENE_TSX, RAIL_MODEL_TS, RAIL_CAMERA_TSX, FOCUS_MODEL_TS, FLIGHT_MODEL_TS, SCENE_PICK_TS, MOTE_MODEL_TS, MOTE_FIELD_TSX, STROKE_MODEL_TS, NOTABLE_MODEL_TS, MOON_FIELD_TSX]) {
    assert.deepEqual(auditConnectors(readFileSync(path, 'utf8')), [], `${path}: lines are body-field.tsx's alone`);
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
    '<mesh><circleGeometry args={[0.15, 24]} /><meshBasicMaterial transparent opacity={1} /></mesh>',
    "import { Billboard } from '@react-three/drei';",
    "import { Canvas } from '@react-three/fiber';",
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
 *   - The Bodies are drawn by `<BodyField>`, mounted once inside the Canvas, and
 *     nowhere else in this file; `auditBodyField` holds their half — every Body draw
 *     at `BODY_RENDER_ORDER`, `transparent` at opacity 1. **Transparent is
 *     load-bearing:** three renders its whole opaque list before its transparent
 *     list whatever the `renderOrder`, so an opaque Body is drawn *before* the Dust
 *     and then painted over.
 *   - No `renderOrder` here takes anything but `DUST_RENDER_ORDER` or sits anywhere
 *     but on an audited Dust draw, and no billboard or point cloud exists outside
 *     the Dust.
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

  // The Bodies' half of the rule is `<BodyField>`'s since 3.2, held by
  // `auditBodyField`. Here: it is mounted exactly once, inside the Canvas, with the
  // Bodies and the Rail — and the scene draws no Body of its own beside it, which
  // would be a draw under neither audit.
  const inside = /<Canvas\b[\s\S]*<\/Canvas>/.exec(code)?.[0] ?? '';
  if (!/<BodyField\s+bodies=\{\s*bodies\s*\}\s+rail=\{\s*rail\s*\}\s*\/>/.test(inside)) {
    failures.push('the Bodies are not drawn — <BodyField bodies={bodies} rail={rail} /> is not mounted inside the Canvas');
  }
  if ((code.match(/<BodyField\b/g) ?? []).length !== 1) failures.push('the Bodies are mounted other than once');
  if (mapBlocks(code, 'bodies').length > 0) {
    failures.push('maps the Bodies here — a Body drawn outside <BodyField> is under no draw-order rule');
  }
  // The Moons (3.3) are `<MoonField>`'s, held by `auditMoonField` (every Moon at
  // `MOON_RENDER_ORDER`, transparent at opacity 1). Here: mounted exactly once,
  // inside the Canvas, with the Bodies, after `<BodyField>` — so after the rig too.
  if (!/<MoonField\s+bodies=\{\s*bodies\s*\}\s*\/>/.test(inside)) {
    failures.push('the Moons are not drawn — <MoonField bodies={bodies} /> is not mounted inside the Canvas');
  }
  if ((code.match(/<MoonField\b/g) ?? []).length !== 1) failures.push('the Moons are mounted other than once');
  const bodyMount = inside.search(/<BodyField\b/);
  const moonMount = inside.search(/<MoonField\b/);
  if (bodyMount < 0 || moonMount < 0 || moonMount < bodyMount) failures.push('the Moons are not mounted after the Bodies');
  if (!/import\s*\{\s*MoonField\s*\}\s*from\s*'\.\/moon-field\.tsx'/.test(blankComments(source))) failures.push('MoonField is not imported');

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
    if (match[1] !== 'DUST_RENDER_ORDER') {
      failures.push(`renderOrder={${match[1]}} — the scene draws only Dust, at the model's DUST_RENDER_ORDER`);
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
    ['Dust takes the Body order', (s) => s.replace('renderOrder={DUST_RENDER_ORDER}', 'renderOrder={BODY_RENDER_ORDER}')],
    ['a literal order', (s) => s.replace('renderOrder={DUST_RENDER_ORDER}', 'renderOrder={3}')],
    ['the Bodies unmounted', (s) => s.replace('<BodyField bodies={bodies} rail={rail} />', '')],
    ['the Bodies mounted twice', (s) => s.replace('<BodyField bodies={bodies} rail={rail} />', '<BodyField bodies={bodies} rail={rail} />\n        <BodyField bodies={bodies} rail={rail} />')],
    [
      'the Bodies outside the Canvas',
      (s) => s.replace('<BodyField bodies={bodies} rail={rail} />', '').replace('</Canvas>', '</Canvas>\n      <BodyField bodies={bodies} rail={rail} />'),
    ],
    ['the Bodies without the Rail', (s) => s.replace('<BodyField bodies={bodies} rail={rail} />', '<BodyField bodies={bodies} rail={buildRail(artifact, [])} />')],
    ['the particles are not drawn', (s) => s.replace(/particles\.map/, 'particlesUnused.map')],
    ['the media are not drawn', (s) => s.replace(/media\.map/, 'mediaUnused.map')],
    [
      'the medium drawn off its radius',
      (s) => s.replace('scale={mediumSpriteScale(medium)}', 'scale={[medium.radius * 4, medium.radius * 4, 1]}'),
    ],
    [
      'a group reorders the Dust',
      (s) => s.replace('<BodyField bodies', '<group renderOrder={BODY_RENDER_ORDER} />\n        <BodyField bodies'),
    ],
    ['a string-valued order', (s) => s.replace('<BodyField bodies', '<BodyField renderOrder="5" bodies')],
    ['a stray point cloud', (s) => s.replace('<BodyField bodies', '<instancedMesh />\n        <BodyField bodies')],
    [
      'a second, widened framing',
      (s) => s.replace('frameBodies(bodies);', 'frameBodies(bodies);\n  const wide = frameBodies([...bodies, ...particles]);'),
    ],
    ['a stray billboard', (s) => s.replace('<BodyField bodies', '<sprite scale={[1, 1, 1]} />\n        <BodyField bodies')],
    ['a Mote', (s) => s.replace('<BodyField bodies', '{motes.map((m) => <mesh key={m} />)}\n        <BodyField bodies')],
    ['a Skill', (s) => s.replace('buildDust(bodies)', 'buildDust(bodies, skills)')],
    ['the framing widened', (s) => s.replace('frameBodies(bodies)', 'frameBodies([...bodies, ...particles])')],
    [
      'a second, unaudited media block',
      (s) => s.replace('<BodyField bodies', '{media.map((m) => <sprite key={m.id}><spriteMaterial /></sprite>)}\n        <BodyField bodies'),
    ],
    [
      'a second, unaudited particles block',
      (s) => s.replace('<BodyField bodies', '{particles.map((p) => <mesh key={p.id}><meshBasicMaterial /></mesh>)}\n        <BodyField bodies'),
    ],
    // The Moons (3.3).
    ['the Moons unmounted', (s) => s.replace('<MoonField bodies={bodies} />', '')],
    ['the Moons mounted twice', (s) => s.replace('<MoonField bodies={bodies} />', '<MoonField bodies={bodies} />\n        <MoonField bodies={bodies} />')],
    ['the Moons outside the Canvas', (s) => s.replace('<MoonField bodies={bodies} />', '').replace('</Canvas>', '</Canvas>\n      <MoonField bodies={bodies} />')],
    ['the Moons without the Bodies', (s) => s.replace('<MoonField bodies={bodies} />', '<MoonField bodies={[]} />')],
    ['the Moons before the Bodies', (s) => s.replace('<MoonField bodies={bodies} />', '').replace('<BodyField bodies', '<MoonField bodies={bodies} />\n        <BodyField bodies')],
    ['the Bodies unmounted, the Moons kept', (s) => s.replace('<BodyField bodies={bodies} rail={rail} />', '')],
    ['the Moons given an order', (s) => s.replace('<MoonField bodies={bodies} />', '<MoonField renderOrder={DUST_RENDER_ORDER} bodies={bodies} />')],
    [
      'a second, unaudited bodies block',
      (s) =>
        s.replace(
          '<BodyField bodies',
          '{bodies.map((b) => <mesh key={b.id}><meshStandardMaterial transparent={false} /></mesh>)}\n        <BodyField bodies',
        ),
    ],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply to the shipped renderer`);
    assert.notDeepEqual(auditDrawOrder(mutated), [], `"${name}" must be rejected`);
  }
});

// --- The vignette is mounted (3.2) -------------------------------------------

/**
 * The vignette overlay, as mounted by the renderer: exactly one element styled by
 * `vignetteStyle()`, an `aria-hidden` sibling **after** the `<Canvas>` (inside it
 * would make it a Three child, not a DOM overlay), inside a `position: 'relative'`
 * wrapper that the overlay's `absolute; inset: 0` resolves against — without it
 * the vignette would cover whichever positioned ancestor it finds.
 *
 * Comments blanked, strings kept: `aria-hidden="true"` and `'relative'` are the
 * evidence. `stroke-model.test.ts` checks the style's value; this checks it is drawn.
 */
function auditVignette(source: string): string[] {
  const code = blankComments(source);
  const failures: string[] = [];
  const overlays = code.match(/<\w+\b[^>]*\bstyle=\{\s*vignetteStyle\(\)\s*\}[^>]*>/g) ?? [];
  if (overlays.length !== 1) {
    failures.push(`the vignette is mounted ${overlays.length} times, not once`);
    return failures;
  }
  const overlay = overlays[0] ?? '';
  if (!/^<div\b/.test(overlay)) failures.push('the vignette is not a DOM <div> overlay');
  if (!/\baria-hidden="true"/.test(overlay)) failures.push('the vignette is narrated — it is not aria-hidden');
  const at = code.indexOf(overlay);
  const canvasOpen = code.indexOf('<Canvas');
  const canvasClose = code.indexOf('</Canvas>');
  if (canvasOpen < 0 || canvasClose < 0) {
    failures.push('no <Canvas> to lay the vignette over');
    return failures;
  }
  if (at < canvasClose) failures.push('the vignette is not a sibling after the <Canvas> — it is inside or under it');
  const wrapper = /<div\s+style=\{\{\s*position:\s*'relative'\s*\}\}\s*>\s*$/.test(code.slice(0, canvasOpen));
  if (!wrapper) failures.push('the <Canvas> is not wrapped in a position: relative <div> — the overlay has no frame to fill');
  const close = code.indexOf('</div>', at + overlay.length);
  if (close < 0 || /<\w/.test(code.slice(at + overlay.length, close))) {
    failures.push('the vignette is not the last child of the wrapper');
  }
  return failures;
}

test('the renderer mounts the vignette once, aria-hidden, over the canvas inside a positioned wrapper', () => {
  assert.deepEqual(auditVignette(readFileSync(SCENE_TSX, 'utf8')), []);
});

test('the vignette audit rejects the real renderer with any one of its guarantees removed', () => {
  const real = readFileSync(SCENE_TSX, 'utf8');
  const overlay = '<div aria-hidden="true" style={vignetteStyle()} />';
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['the overlay deleted', (s) => s.replace(overlay, '')],
    ['the overlay mounted twice', (s) => s.replace(overlay, `${overlay}\n      ${overlay}`)],
    ['the overlay narrated', (s) => s.replace(overlay, '<div style={vignetteStyle()} />')],
    ['the wrapper unpositioned', (s) => s.replace("<div style={{ position: 'relative' }}>", '<div>')],
    ['the overlay inside the Canvas', (s) => s.replace(overlay, '').replace('</Canvas>', `  ${overlay}\n      </Canvas>`)],
    ['the overlay before the Canvas', (s) => s.replace(overlay, '').replace('      <Canvas', `      ${overlay}\n      <Canvas`)],
    ['the overlay as a span', (s) => s.replace(overlay, '<span aria-hidden="true" style={vignetteStyle()} />')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply to the shipped renderer`);
    assert.notDeepEqual(auditVignette(mutated), [], `"${name}" must be rejected`);
  }
});

// --- Colour comes from the tokens (3.1) --------------------------------------

/**
 * The renderer's colours, as a pure function over its source: the Dust medium is
 * drawn in `DUST_MEDIUM_COLOR` and the particles in `DUST_PARTICLE_COLOR` (the
 * model's token-backed constants, `dust-model.test.ts` pins their values), and the
 * canvas carries exactly one background, `tokens.colors['surface-base-dark']`.
 *
 * Comments are blanked but strings kept, because the token key *is* a string.
 */
function auditSceneColours(source: string): string[] {
  const code = blankComments(source);
  const failures: string[] = [];
  const colourOf = (material: string) => /\bcolor\s*=\s*\{\s*([^}]*?)\s*\}/.exec(material)?.[1];

  for (const [collection, expected] of [
    ['media', 'DUST_MEDIUM_COLOR'],
    ['particles', 'DUST_PARTICLE_COLOR'],
  ] as const) {
    const materials = mapBlocks(code, collection).flatMap((block) => block.match(/<\w+Material\b[^>]*>/g) ?? []);
    if (materials.length === 0) failures.push(`${collection} are drawn with no material to colour`);
    for (const material of materials) {
      const colour = colourOf(material);
      if (colour !== expected) failures.push(`a ${collection} material is coloured ${colour ?? 'by default'}, not ${expected}`);
    }
  }

  const backgrounds = code.match(/<color\b[^>]*\battach\s*=\s*["']background["'][^>]*>/g) ?? [];
  if (backgrounds.length !== 1) {
    failures.push(`${backgrounds.length} scene backgrounds — exactly one, surface-base-dark, is drawn`);
  }
  for (const background of backgrounds) {
    if (!/\bargs\s*=\s*\{\s*\[\s*tokens\.colors\[\s*(['"])surface-base-dark\1\s*\]\s*\]\s*\}/.test(background)) {
      failures.push("the scene background is not tokens.colors['surface-base-dark']");
    }
  }
  if (!/import\s*\{\s*tokens\s*\}\s*from\s*['"]\.\.\/tokens\/tokens\.ts['"]/.test(code)) {
    failures.push('the renderer does not import the generated tokens');
  }
  return failures;
}

test('the Dust and the background are coloured from the tokens', () => {
  assert.deepEqual(auditSceneColours(readFileSync(SCENE_TSX, 'utf8')), []);
});

test('the colour audit rejects the real renderer with any one colour binding broken', () => {
  const real = readFileSync(SCENE_TSX, 'utf8');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    [
      'the Dust constants swapped',
      (s) =>
        s
          .replace('color={DUST_MEDIUM_COLOR}', 'color={__SWAP__}')
          .replace('color={DUST_PARTICLE_COLOR}', 'color={DUST_MEDIUM_COLOR}')
          .replace('color={__SWAP__}', 'color={DUST_PARTICLE_COLOR}'),
    ],
    ['the medium uncoloured', (s) => s.replace(/\s*color=\{DUST_MEDIUM_COLOR\}/, '')],
    ['a particle coloured by a literal name', (s) => s.replace('color={DUST_PARTICLE_COLOR}', 'color={GREY}')],
    ['the background removed', (s) => s.replace(/<color attach="background"[^>]*\/>/, '')],
    ['the background token changed', (s) => s.replace("tokens.colors['surface-base-dark']", "tokens.colors['surface-raised-dark']")],
    ['the background from a constant', (s) => s.replace("args={[tokens.colors['surface-base-dark']]}", 'args={[GROUND]}')],
    ['a second background', (s) => s.replace('<BodyField bodies', '<color attach="background" args={[tokens.colors[\'surface-base-dark\']]} />\n        <BodyField bodies')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply to the shipped renderer`);
    assert.notDeepEqual(auditSceneColours(mutated), [], `"${name}" must be rejected`);
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

test('neither Rail file, nor the focus model, nor the Motes’ renderer, holds a world-coordinate literal', () => {
  // `mote-model.ts` is not in this list: its orbit radii and tilts are numeric
  // triples by nature, and this scan cannot tell them from a place. What the scan
  // stands for is proven there instead, by execution — translating every Body
  // translates every Mote (`mote-model.test.ts`).
  for (const path of [RAIL_MODEL_TS, RAIL_CAMERA_TSX, FOCUS_MODEL_TS, FLIGHT_MODEL_TS, MOTE_FIELD_TSX, STROKE_MODEL_TS, BODY_FIELD_TSX, NOTABLE_MODEL_TS, MOON_FIELD_TSX]) {
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

  // The binding, exactly: the frame bodies are `railFrame` and `focusFrame`
  // (executed in `rail-model.test.ts` and `focus-model.test.ts`), and the rig's only
  // job is to hand them the right inputs and apply what comes back. One `getState()`
  // read per frame, so the Rail and Focus see the same state. Each clause is one way
  // to hand them the wrong ones.
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
    'conststate=navigationStore.getState()',
    'constreduced=reducedMotion()',
    'constframe=railFrame(motion.current,rail,state.scrollProgress,size.width,size.height,delta,reduced)',
    'motion.current=frame.motion',
    'constflown=flightFrame(flight.current,rail,state.mode,state.flightTarget,frame,delta,reduced)',
    'flight.current=flown.motion',
    'focus.current=focusFrame(focus.current,rail,bodies,state.focusedProjectId,flown.frame,size.width,delta,reduced)',
    'camera.position.set(focus.current.pose.position.x,focus.current.pose.position.y,focus.current.pose.position.z)',
    'camera.lookAt(focus.current.pose.target.x,focus.current.pose.target.y,focus.current.pose.target.z)',
  ];
  if (JSON.stringify(statements) !== JSON.stringify(expected)) {
    failures.push(
      'the frame loop is not exactly: read getState() once, read reducedMotion() once, railFrame(motion.current, rail, ' +
        'state.scrollProgress, size.width, size.height, delta, reduced), write motion back, flightFrame(flight.current, ' +
        'rail, state.mode, state.flightTarget, frame, delta, reduced) with its motion written back, focusFrame(focus.current, ' +
        'rail, bodies, state.focusedProjectId, flown.frame, size.width, delta, reduced) written back, apply its position and aim',
    );
  }
  if (!/const\s+motion\s*=\s*useRef<RailMotion\s*\|\s*null>\(\s*null\s*\)/.test(code)) {
    failures.push('the carried motion is not a ref that starts empty');
  }
  if (!/const\s+flight\s*=\s*useRef<FlightMotion\s*\|\s*null>\(\s*null\s*\)/.test(code)) {
    failures.push('the carried flight motion is not a ref that starts empty');
  }
  if (!/const\s+focus\s*=\s*useRef<FocusMotion\s*\|\s*null>\(\s*null\s*\)/.test(code)) {
    failures.push('the carried Focus motion is not a ref that starts empty');
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
  const POSITION =
    'camera.position.set(focus.current.pose.position.x, focus.current.pose.position.y, focus.current.pose.position.z)';
  const AIM = 'camera.lookAt(focus.current.pose.target.x, focus.current.pose.target.y, focus.current.pose.target.z)';
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
    ['releasing Focus from the loop', (s) => s.replace('motion.current = frame.motion;', 'motion.current = frame.motion;\n    releaseFocus();')],
    ['a subscription', (s) => s.replace('return null;', 'navigationStore.subscribe(() => {});\n  return null;')],
    ['a hook binding', (s) => s.replace('state = navigationStore.getState()', 'state = useStore(navigationStore, (value) => value)')],
    ['reactive state', (s) => s.replace('const motion = useRef', 'const [, force] = useState(0);\n  const motion = useRef')],
    ['useThree', (s) => s.replace('const motion = useRef', 'const { size } = useThree();\n  const motion = useRef')],
    ['a DOM read', (s) => s.replace('size.width, size.height,', 'window.innerWidth, window.innerHeight,')],
    ['a literal position', (s) => s.replace(POSITION, 'camera.position.set(0, 5, 40)')],
    ['a literal aim', (s) => s.replace(AIM, 'camera.lookAt(0, 0, 0)')],
    ['no getState read', (s) => s.replace('state = navigationStore.getState()', 'state = { scrollProgress: 0, focusedProjectId: null }')],
    ['the write-back removed', (s) => s.replace('motion.current = frame.motion;', '')],
    ['delta dropped', (s) => s.replace('size.height, delta, reduced)', 'size.height, 0, reduced)')],
    // Reduced motion's half of the binding (2.10).
    ['the Rail at full motion always', (s) => s.replace('size.height, delta, reduced)', 'size.height, delta)')],
    ['flight at full motion always', (s) => s.replace('state.flightTarget, frame, delta, reduced)', 'state.flightTarget, frame, delta)')],
    ['Focus at full motion always', (s) => s.replace('flown.frame, size.width, delta, reduced)', 'flown.frame, size.width, delta)')],
    ['a constant preference', (s) => s.replace('const reduced = reducedMotion();', 'const reduced = true;')],
    ['the preference read per model', (s) => s.replace('state.flightTarget, frame, delta, reduced)', 'state.flightTarget, frame, delta, reducedMotion())')],
    ['the preference subscribed', (s) => s.replace('const motion = useRef', 'const reduced0 = useSyncExternalStore(subscribeReducedMotion, reducedMotion);\n  const motion = useRef')],
    ['the preference written from the loop', (s) => s.replace('const reduced = reducedMotion();', 'const reduced = reducedMotion();\n    setReducedMotion(false);')],
    ['a constant width', (s) => s.replace('scrollProgress, size.width,', 'scrollProgress, 1600,')],
    ['a constant height', (s) => s.replace('size.width, size.height,', 'size.width, 900,')],
    ['a fresh motion every frame', (s) => s.replace('railFrame(motion.current,', 'railFrame(null,')],
    [
      'the aim applied as the position',
      (s) => s.replace('focus.current.pose.position.x, focus.current.pose.position.y', 'focus.current.pose.target.x, focus.current.pose.position.y'),
    ],
    ['no model frame', (s) => s.replace(/railFrame\(motion\.current,[^;]*;/, "{ motion: motion.current!, pose: rail.keyframes[0]! };")],
    ['an interaction', (s) => s.replace('return null;', 'return <mesh onClick={() => undefined} />;')],
    ['a pointer-missed release', (s) => s.replace('return null;', 'return <group onPointerMissed={() => undefined} />;')],
    ['a hover', (s) => s.replace('return null;', 'return <mesh onPointerOver={() => undefined} />;')],
    // Focus's half of the binding.
    ['Focus ignored', (s) => s.replace('state.focusedProjectId', 'null')],
    [
      'the Rail pose drawn over Focus',
      (s) => s.replace(POSITION, 'camera.position.set(frame.pose.position.x, frame.pose.position.y, frame.pose.position.z)'),
    ],
    ['the Rail aim drawn over Focus', (s) => s.replace(AIM, 'camera.lookAt(frame.pose.target.x, frame.pose.target.y, frame.pose.target.z)')],
    ['a fresh Focus every frame', (s) => s.replace('focusFrame(focus.current,', 'focusFrame(null,')],
    ['the Focus write-back removed', (s) => s.replace('focus.current = focusFrame(', 'void focusFrame(')],
    ['a constant panel width', (s) => s.replace('flown.frame, size.width, delta, reduced)', 'flown.frame, 1600, delta, reduced)')],
    ['Focus without time', (s) => s.replace('flown.frame, size.width, delta, reduced)', 'flown.frame, size.width, 0, reduced)')],
    // Flight's half of the binding (2.9).
    ['flight skipped: Focus over the bare Rail', (s) => s.replace('state.focusedProjectId, flown.frame,', 'state.focusedProjectId, frame,')],
    ['flight not stepped', (s) => s.replace(/\s*const flown = flightFrame\([^;]*;\s*flight\.current = flown\.motion;/, '\n    const flown = { frame };')],
    ['the mode ignored', (s) => s.replace('rail, state.mode, state.flightTarget', "rail, 'rail', state.flightTarget")],
    ['the target ignored', (s) => s.replace('state.mode, state.flightTarget, frame', 'state.mode, null, frame')],
    ['a fresh flight every frame', (s) => s.replace('flightFrame(flight.current,', 'flightFrame(null,')],
    ['the flight write-back removed', (s) => s.replace('flight.current = flown.motion;', '')],
    ['flight without time', (s) => s.replace('state.flightTarget, frame, delta, reduced)', 'state.flightTarget, frame, 0, reduced)')],
    ['the flight ref started full', (s) => s.replace('useRef<FlightMotion | null>(null)', 'useRef<FlightMotion | null>(undefined!)')],
    ['flight entered from the rig', (s) => s.replace('flight.current = flown.motion;', 'flight.current = flown.motion;\n    enterFreeFlight(null);')],
    ['Focus without the Bodies', (s) => s.replace('rail, bodies, state.focusedProjectId', 'rail, [], state.focusedProjectId')],
    ['a second store read', (s) => s.replace('state.focusedProjectId', 'navigationStore.getState().focusedProjectId')],
    ['the Focus ref started full', (s) => s.replace('useRef<FocusMotion | null>(null)', 'useRef<FocusMotion | null>(undefined!)')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply to the shipped rig`);
    assert.notDeepEqual(auditRig(mutated), [], `"${name}" must be rejected`);
  }
});

/**
 * The Rail's mount in `scene.tsx`, as a pure function over its source.
 *
 * Pinned positively: deleting the mount is a one-line edit that leaves every
 * negative scan green while the camera stops flying. The keyframes come from the
 * artifact and the Bodies, the rig sits inside the `<Canvas>` (outside it,
 * `useFrame` has no loop to join), and the camera prop's far plane covers every
 * pose the rig can reach, not only the opening frame.
 */
function auditRailMount(source: string): string[] {
  const code = blankProse(source);
  const failures: string[] = [];
  if (!/\bconst\s+rail\s*=\s*buildRail\s*\(\s*artifact\s*,\s*bodies\s*\)/.test(code)) {
    failures.push('the keyframes do not come from buildRail(artifact, bodies)');
  }
  const inside = /<Canvas\b[\s\S]*<\/Canvas>/.exec(code)?.[0] ?? '';
  if (!/<RailCamera\s+rail=\{\s*rail\s*\}\s+bodies=\{\s*bodies\s*\}\s*\/>/.test(inside)) {
    failures.push('the rig is not mounted inside the Canvas with the Rail and the Bodies');
  }
  if (!/\bfar\s*:\s*Math\.max\(\s*framing\.far\s*,\s*railFarPlane\(\s*rail\s*,\s*bodies\s*\)\s*\)/.test(code)) {
    failures.push('the camera prop far plane does not include railFarPlane(rail, bodies)');
  }
  return failures;
}

test('the scene builds the Rail from the artifact and mounts the rig inside the Canvas', () => {
  assert.deepEqual(auditRailMount(readFileSync(SCENE_TSX, 'utf8')), []);
});

test('the mount audit rejects the real scene with any one guarantee removed', () => {
  const real = readFileSync(SCENE_TSX, 'utf8');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['the rig unmounted', (s) => s.replace('<RailCamera rail={rail} bodies={bodies} />', '')],
    [
      'the rig outside the Canvas',
      (s) =>
        s
          .replace('<RailCamera rail={rail} bodies={bodies} />', '')
          .replace('</Canvas>', '</Canvas>\n      <RailCamera rail={rail} bodies={bodies} />'),
    ],
    ['the rig without the Bodies', (s) => s.replace('<RailCamera rail={rail} bodies={bodies} />', '<RailCamera rail={rail} bodies={[]} />')],
    ['an empty Rail', (s) => s.replace('buildRail(artifact, bodies)', 'buildRail({ rail: [], shots: [] }, bodies)')],
    ['the opening far plane only', (s) => s.replace(/far:\s*Math\.max\(framing\.far,\s*railFarPlane\(rail,\s*bodies\)\)/, 'far: framing.far')],
    ['the far plane of no Bodies', (s) => s.replace('railFarPlane(rail, bodies)', 'railFarPlane(rail, [])')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply to the shipped scene`);
    assert.notDeepEqual(auditRailMount(mutated), [], `"${name}" must be rejected`);
  }
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

// --- The Motes (2.8) --------------------------------------------------------

/**
 * `mote-field.tsx`'s contract, as a pure function over its source.
 *
 * Every rule of Condensation is executed in `mote-model.test.ts`; this holds the
 * binding. Negatively: no store write and no named event, no subscription or
 * reactive hook, no DOM, no interaction, no ordering or selection, no connector,
 * no coordinate literal, no live region. Positively: a frame loop that is
 * *exactly* — update the camera's matrices, one `getState()` read, `moteFrame`
 * handed the carried field, the artifact, the Bodies, the media, the focused ID,
 * both matrices and the canvas width and written back, and each draw applied
 * with `applyMoteDraw` to its own pooled handles; one mesh per `motePool` entry
 * keyed by Skill, drawn at `BODY_RENDER_ORDER` in the transparent pass writing
 * no depth; one drei `<Html>` label each, at `zIndexRange={[1, 1]}` with no
 * pointer events, styled by the model.
 */
function auditMoteField(source: string): string[] {
  const code = blankProse(source);
  const quoted = blankComments(source);
  const failures: string[] = [];

  if (/\.setState\b|\bsetState\b\s*[:,)}]/.test(code)) failures.push('writes the store with setState');
  if (/\b(?:advanceScroll|selectClient|focusProject|releaseFocus|enterRail|enterFreeFlight|resetNavigation)\b/.test(code)) {
    failures.push('names a navigation event — the Motes read the store and write only their own handles');
  }
  if (/\buseStore\b|\bsubscribe\b|\buseSyncExternalStore\b|\buseShallow\b/.test(code) || /['"]zustand(?:\/react)?/.test(quoted)) {
    failures.push('subscribes to the store — a frame loop reads getState()');
  }
  if (/\buseThree\b|\buseState\b|\buseReducer\b|\buseEffect\b|\buseLayoutEffect\b|\buseMemo\b/.test(code)) {
    failures.push('holds reactive state or an effect — the carried field is a ref, the loop is useFrame');
  }
  if (/\bwindow\b|\bdocument\b|innerWidth|innerHeight|getBoundingClientRect|addEventListener|matchMedia/.test(code)) {
    failures.push('reads the DOM — the width arrives as R3F’s size');
  }
  if (/\braycast\w*|\bonClick\b|\bonPointer\w+|\bonWheel\b|\bonScroll\b|\bonDoubleClick\b|\bonContextMenu\b/i.test(code)) {
    failures.push('handles an interaction — a Mote is never hovered or clicked');
  }
  if (/\.sort\s*\(|\.filter\s*\(|\.reverse\s*\(|\.slice\s*\(|\.find\s*\(/.test(code)) {
    failures.push('orders or selects — which Skills show, and where, is the model’s');
  }
  if (/aria-live|role\s*=\s*["'](?:status|alert|log|marquee|timer)["']/.test(quoted)) {
    failures.push('announces — the Motes are inside the aria-hidden canvas root, and no live region exists');
  }
  failures.push(...auditConnectors(source));
  failures.push(...coordinateLiterals(code));

  const loop = /\buseFrame\s*\(\s*\(\s*\{\s*camera\s*,\s*size\s*\}\s*,\s*delta\s*\)\s*=>\s*\{([\s\S]*?)\}\s*\)\s*;/.exec(code);
  if (loop === null) {
    failures.push('runs no frame loop taking ({ camera, size }, delta)');
  } else {
    const statements = (loop[1] ?? '')
      .split(';')
      .map((statement) => statement.replace(/\s+/g, ''))
      .filter((statement) => statement !== '');
    const expected = [
      'camera.updateMatrixWorld()',
      'conststate=navigationStore.getState()',
      'field.current=moteFrame(field.current,artifact,bodies,media,state.focusedProjectId,camera.matrixWorldInverse.elements,camera.projectionMatrix.elements,size.width,delta,reducedMotion())',
      'field.current.draws.forEach((draw,index)=>applyMoteDraw(dots.current[index],labels.current[index],draw))',
    ];
    if (JSON.stringify(statements) !== JSON.stringify(expected)) {
      failures.push(
        'the frame loop is not exactly: camera.updateMatrixWorld(), one getState() read, moteFrame(field.current, artifact, ' +
          'bodies, media, state.focusedProjectId, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, ' +
          'size.width, delta, reducedMotion()) written back, and every draw applied to its own handles',
      );
    }
  }
  if ((code.match(/\buseFrame\s*\(/g) ?? []).length !== 1) failures.push('runs other than one frame loop');
  if (!/const\s+field\s*=\s*useRef<MoteFieldState\s*\|\s*null>\(\s*null\s*\)/.test(code)) {
    failures.push('the carried field is not a ref that starts empty');
  }

  // The pool: one mesh per distinct Skill, keyed by it.
  const pools = mapBlocks(code, 'motePool\\(\\s*artifact\\s*\\)');
  if (pools.length !== 1) failures.push(`maps motePool(artifact) ${pools.length} times — one pooled dot per distinct Skill`);
  const pool = pools[0] ?? '';
  if (!/^motePool\(\s*artifact\s*\)\s*\.\s*map\s*\(\s*\(\s*skill\s*,\s*index\s*\)\s*=>/.test(pool)) {
    failures.push('the pool is not mapped as (skill, index)');
  }
  const meshes = pool.match(/<mesh\b[\s\S]*?>\s*</g) ?? [];
  if (meshes.length !== 1) failures.push('the pool is not one mesh per Skill');
  const mesh = meshes[0] ?? '';
  if (!/\bkey=\{\s*skill\s*\}/.test(mesh)) failures.push('a pooled dot is not keyed by its Skill');
  if (!/\bref=\{\s*\(\s*dot\b[^)]*\)\s*=>\s*\{\s*dots\.current\[\s*index\s*\]\s*=\s*dot\s*;?\s*\}\s*\}/.test(mesh)) {
    failures.push('a pooled dot’s handle is not stored at its pool index');
  }
  if (!/\brenderOrder\s*=\s*\{\s*BODY_RENDER_ORDER\s*\}/.test(mesh)) failures.push('a Mote is not drawn at BODY_RENDER_ORDER — after the Dust');
  if ((code.match(/\brenderOrder\s*=/g) ?? []).length !== 1) failures.push('a renderOrder other than the Mote’s');
  const materials = pool.match(/<\w+Material\b[^>]*>/g) ?? [];
  if (materials.length !== 1) failures.push('a Mote is not drawn with exactly one material');
  for (const material of materials) {
    if (!/\btransparent(?:\s*=\s*\{\s*true\s*\}|(?![\w-]|\s*=))/.test(material)) {
      failures.push('a Mote material is opaque — three draws the opaque list first, before the Dust');
    }
    if (!/\bdepthWrite\s*=\s*\{\s*false\s*\}/.test(material)) failures.push('a Mote writes depth — a faded dot would cut into what is behind it');
  }
  const labels = pool.match(/<Html\b[^>]*>/g) ?? [];
  if (labels.length !== 1 || (code.match(/<Html\b/g) ?? []).length !== 1) failures.push('not one drei <Html> label per pooled dot');
  const html = labels[0] ?? '';
  if (!/\bzIndexRange=\{\s*\[\s*1\s*,\s*1\s*\]\s*\}/.test(html)) failures.push('the label is not at zIndexRange [1, 1] — it could stack over the panel or under the vignette');
  // Read with its strings kept: the value is a string, which the prose blanking erases.
  const quotedHtml = mapBlocks(quoted, 'motePool\\(\\s*artifact\\s*\\)')[0]?.match(/<Html\b[^>]*>/)?.[0] ?? '';
  if (!/\bpointerEvents="none"/.test(quotedHtml)) {
    failures.push('the label takes pointer events');
  }
  if (!/<div\s+ref=\{\s*\(\s*label\s*\)\s*=>\s*\{\s*labels\.current\[\s*index\s*\]\s*=\s*label\s*;?\s*\}\s*\}\s+style=\{\s*moteLabelStyle\(\s*\)\s*\}\s*>\s*\{\s*skill\s*\}\s*<\/div>/.test(pool)) {
    failures.push('the label is not the Skill’s name, in the model’s style, stored at its pool index');
  }
  if (!/import\s*\{\s*Html\s*\}\s*from\s*'@react-three\/drei'/.test(quoted)) failures.push('the label is not drei’s Html');
  return failures;
}

test('the Motes’ renderer binds the model and holds no rule of its own', () => {
  assert.deepEqual(auditMoteField(readFileSync(MOTE_FIELD_TSX, 'utf8')), []);
});

test('the Mote audit rejects the real renderer with any one guarantee broken', () => {
  const real = readFileSync(MOTE_FIELD_TSX, 'utf8');
  const CALL =
    'moteFrame(field.current, artifact, bodies, media, state.focusedProjectId, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, size.width, delta, reducedMotion())';
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a store write', (s) => s.replace('camera.updateMatrixWorld();', 'camera.updateMatrixWorld();\n    navigationStore.setState({ focusedProjectId: null });')],
    ['a named event', (s) => s.replace('camera.updateMatrixWorld();', 'camera.updateMatrixWorld();\n    releaseFocus();')],
    ['a subscription', (s) => s.replace('return (', 'navigationStore.subscribe(() => {});\n  return (')],
    ['a hook binding', (s) => s.replace('state = navigationStore.getState()', 'state = useStore(navigationStore, (value) => value)')],
    ['reactive state', (s) => s.replace('const field = useRef', 'const [, force] = useState(0);\n  const field = useRef')],
    ['useThree', (s) => s.replace('const field = useRef', 'const { size } = useThree();\n  const field = useRef')],
    ['a DOM read', (s) => s.replace('size.width, delta, reducedMotion())', 'window.innerWidth, delta, reducedMotion())')],
    ['stale matrices', (s) => s.replace('camera.updateMatrixWorld();', '')],
    ['the matrices swapped', (s) => s.replace('camera.matrixWorldInverse.elements, camera.projectionMatrix.elements', 'camera.projectionMatrix.elements, camera.matrixWorldInverse.elements')],
    ['the world matrix for the view', (s) => s.replace('camera.matrixWorldInverse.elements', 'camera.matrixWorld.elements')],
    ['a constant width', (s) => s.replace('size.width, delta, reducedMotion())', '1600, delta, reducedMotion())')],
    ['no time', (s) => s.replace('size.width, delta, reducedMotion())', 'size.width, 0, reducedMotion())')],
    // Reduced motion (2.10).
    ['the orbits spin always', (s) => s.replace('size.width, delta, reducedMotion())', 'size.width, delta)')],
    ['a constant preference', (s) => s.replace('size.width, delta, reducedMotion())', 'size.width, delta, false)')],
    ['the preference subscribed', (s) => s.replace('const field = useRef', 'const reduced = useSyncExternalStore(subscribeReducedMotion, reducedMotion);\n  const field = useRef')],
    ['Focus ignored', (s) => s.replace('state.focusedProjectId', 'null')],
    ['no Dust to condense from', (s) => s.replace('artifact, bodies, media, state', 'artifact, bodies, [], state')],
    ['a fresh field every frame', (s) => s.replace('moteFrame(field.current,', 'moteFrame(null,')],
    ['the write-back removed', (s) => s.replace(`field.current = ${CALL};`, `void ${CALL};`)],
    ['nothing applied', (s) => s.replace(/\n\s*field\.current\.draws\.forEach\([^\n]*\n/, '\n')],
    ['the wrong handle', (s) => s.replace('applyMoteDraw(dots.current[index], labels.current[index], draw)', 'applyMoteDraw(dots.current[0], labels.current[index], draw)')],
    ['a second store read', (s) => s.replace('state.focusedProjectId', 'navigationStore.getState().focusedProjectId')],
    ['a click', (s) => s.replace('visible={false}', 'visible={false}\n          onClick={() => undefined}')],
    ['a hover', (s) => s.replace('visible={false}', 'visible={false}\n          onPointerOver={() => undefined}')],
    ['an orbit line', (s) => s.replace('return (\n    <>', "return (\n    <>\n      <lineLoop />").replace('return (\r\n    <>', 'return (\r\n    <>\r\n      <lineLoop />')],
    ['a drei connector', (s) => s.replace("import { Html } from '@react-three/drei';", "import { Html, Line } from '@react-three/drei';")],
    ['a selection of Skills', (s) => s.replace('motePool(artifact).map(', 'motePool(artifact).filter((skill) => skill !== "").map(')],
    ['a sort of Skills', (s) => s.replace('motePool(artifact).map(', 'motePool(artifact).sort().map(')],
    ['the pool keyed by index', (s) => s.replace('key={skill}', 'key={index}')],
    ['the handle not stored', (s) => s.replace('dots.current[index] = dot;', 'void dot;')],
    ['no draw order', (s) => s.replace('renderOrder={BODY_RENDER_ORDER}', '')],
    ['a literal draw order', (s) => s.replace('renderOrder={BODY_RENDER_ORDER}', 'renderOrder={3}')],
    ['an opaque Mote', (s) => s.replace('transparent opacity={0}', 'opacity={0}')],
    ['a Mote writing depth', (s) => s.replace('depthWrite={false}', 'depthWrite')],
    ['the label over the panel', (s) => s.replace('<Html zIndexRange={[1, 1]}', '<Html zIndexRange={[16777271, 0]}')],
    ['the label default z', (s) => s.replace('<Html zIndexRange={[1, 1]} ', '<Html ')],
    ['the label under the vignette', (s) => s.replace('<Html zIndexRange={[1, 1]}', '<Html zIndexRange={[0, 0]}')],
    ['a clickable label', (s) => s.replace('pointerEvents="none"', 'pointerEvents="auto"')],
    ['the label unstyled', (s) => s.replace('style={moteLabelStyle()}', '')],
    ['the label shows the wrong text', (s) => s.replace('{skill}\n            </div>', '{index}\n            </div>').replace('{skill}\r\n            </div>', '{index}\r\n            </div>')],
    ['a live region', (s) => s.replace('style={moteLabelStyle()}', 'style={moteLabelStyle()}\n              aria-live="polite"')],
    ['no label', (s) => s.replace(/<Html\b[\s\S]*?<\/Html>/, '')],
    ['the field ref started full', (s) => s.replace('useRef<MoteFieldState | null>(null)', 'useRef<MoteFieldState | null>(undefined!)')],
    ['a coordinate literal', (s) => s.replace('camera.updateMatrixWorld();', 'camera.updateMatrixWorld();\n    camera.position.set(0, 5, 40);')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply to the shipped renderer`);
    assert.notDeepEqual(auditMoteField(mutated), [], `"${name}" must be rejected`);
  }
});

/**
 * The Motes' mount in `scene.tsx`: inside the `<Canvas>` (outside it, `useFrame`
 * has no loop to join), after the rig (R3F runs frame callbacks in mount order,
 * so the Motes project through the camera the rig has just moved), once, and
 * handed the artifact, the Bodies and the Dust media the scene built.
 */
function auditMoteMount(source: string): string[] {
  const code = blankProse(source);
  const failures: string[] = [];
  const inside = /<Canvas\b[\s\S]*<\/Canvas>/.exec(code)?.[0] ?? '';
  const mount = /<MoteField\s+artifact=\{\s*artifact\s*\}\s+bodies=\{\s*bodies\s*\}\s+media=\{\s*media\s*\}\s*\/>/;
  if (!mount.test(inside)) failures.push('the Motes are not mounted inside the Canvas with the artifact, the Bodies and the media');
  if ((code.match(/<MoteField\b/g) ?? []).length !== 1) failures.push('the Motes are mounted other than once');
  const rig = inside.search(/<RailCamera\b/);
  const motes = inside.search(/<MoteField\b/);
  if (rig === -1 || motes === -1 || motes < rig) failures.push('the Motes are mounted before the rig — they would project last frame’s camera');
  if (!/const\s*\{\s*media\s*,\s*particles\s*\}\s*=\s*buildDust\(\s*bodies\s*\)/.test(code)) failures.push('the media are not the Dust the scene draws');
  if (!/import\s*\{\s*MoteField\s*\}\s*from\s*'\.\/mote-field\.tsx'/.test(blankComments(source))) failures.push('MoteField is not imported');
  return failures;
}

test('the scene mounts the Motes inside the Canvas, after the rig', () => {
  assert.deepEqual(auditMoteMount(readFileSync(SCENE_TSX, 'utf8')), []);
});

test('the Mote mount audit rejects the real scene with any one guarantee removed', () => {
  const real = readFileSync(SCENE_TSX, 'utf8');
  const MOUNT = '<MoteField artifact={artifact} bodies={bodies} media={media} />';
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['unmounted', (s) => s.replace(MOUNT, '')],
    ['before the rig', (s) => s.replace(MOUNT, '').replace('<RailCamera rail={rail} bodies={bodies} />', `${MOUNT}\n      <RailCamera rail={rail} bodies={bodies} />`)],
    ['outside the Canvas', (s) => s.replace(MOUNT, '').replace('</Canvas>', `</Canvas>\n      ${MOUNT}`)],
    ['no Dust', (s) => s.replace(MOUNT, '<MoteField artifact={artifact} bodies={bodies} media={[]} />')],
    ['no Bodies', (s) => s.replace(MOUNT, '<MoteField artifact={artifact} bodies={[]} media={media} />')],
    ['mounted twice', (s) => s.replace(MOUNT, `${MOUNT}\n      ${MOUNT}`)],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply to the shipped scene`);
    assert.notDeepEqual(auditMoteMount(mutated), [], `"${name}" must be rejected`);
  }
});

// --- The Moons (3.3) --------------------------------------------------------

/**
 * `moon-field.tsx`'s contract, as a pure function over its source.
 *
 * Every rule of the Moon — which Planets carry one, where, how large, in what
 * colour, and its pixel floor — is executed in `notable-model.test.ts`; this
 * holds the binding. Negatively: no store read of any kind (a Moon depends on
 * `isDeep` alone, never on where the visitor is), no store write or named event,
 * no reactive state or effect, no DOM, no interaction, no ordering or selection,
 * no connector, no coordinate literal, no authored or band read. Positively: one
 * `notableMoons(bodies)`; a frame loop that is *exactly* — update the camera's
 * matrices, then each Moon's `moonScale` from both matrices and R3F's canvas
 * height, written with `applyMoonScale` to its own pooled mesh; one positioned
 * group per Moon at its Planet, a camera-facing `<Billboard>`, and in it one
 * mesh at the Moon's billboard-local centre, at `MOON_RENDER_ORDER` (one above
 * the Ring's `BODY_RENDER_ORDER`, so the overlap never flickers), a circle of
 * the Moon's radius in an unlit `transparent` material at opacity 1 in the
 * Moon's colour.
 */
function auditMoonField(source: string): string[] {
  const code = blankProse(source);
  const quoted = blankComments(source);
  const squash = (text: string) => text.replace(/\s+/g, ' ');
  const failures: string[] = [];

  if (/\.setState\b|\bsetState\b\s*[:,)}]/.test(code)) failures.push('writes the store with setState');
  if (/\b(?:advanceScroll|selectClient|focusProject|releaseFocus|enterRail|enterFreeFlight|resetNavigation|activateClient|activateProject|activateBody)\b/.test(code)) {
    failures.push('names a navigation event — a Moon writes only its own mesh');
  }
  if (/\bnavigationStore\b|\bgetState\b|\buseStore\b|\bsubscribe\b|\buseSyncExternalStore\b|\buseShallow\b|\bsceneSubject\b|\bsubject\b/.test(code) || /['"]zustand(?:\/react)?|shell\/state/.test(quoted)) {
    failures.push('reads the navigation state — a Moon is at rest and always, on isDeep alone');
  }
  if (/\buseThree\b|\buseState\b|\buseReducer\b|\buseEffect\b|\buseLayoutEffect\b|\buseMemo\b/.test(code)) {
    failures.push('holds reactive state or an effect — the meshes are refs, the loop is useFrame');
  }
  if (/\bwindow\b|\bdocument\b|innerWidth|innerHeight|getBoundingClientRect|addEventListener|matchMedia/.test(code)) {
    failures.push('reads the DOM — the height arrives as R3F’s size');
  }
  if (/\braycast\w*|\bonClick\b|\bonPointer\w+|\bonWheel\b|\bonScroll\b|\bonDoubleClick\b|\bonContextMenu\b/i.test(code)) {
    failures.push('handles an interaction — a Moon is never hovered or clicked');
  }
  if (/\.sort\s*\(|\.filter\s*\(|\.reverse\s*\(|\.slice\s*\(|\.find\s*\(/.test(code)) {
    failures.push('orders or selects — which Planets carry a Moon is the model’s');
  }
  if (/\bisDeep\b|\bnotable\b|\bcontent\b|\bluminanceBand\b|\bmass\b|\bbodyStroke\b|\bbodyRadius\b/.test(code)) {
    failures.push('reads a field or a rule — every Moon value comes from notableMoons');
  }
  if (/\b(?:ambient|directional|point|spot|hemisphere)Light\b|\bmeshStandardMaterial\b|\bmeshPhongMaterial\b|\bmeshLambertMaterial\b/.test(code)) {
    failures.push('lights or shades a Moon — every material is unlit');
  }
  failures.push(...auditConnectors(source));
  failures.push(...coordinateLiterals(code));

  if ((code.match(/\bnotableMoons\s*\(/g) ?? []).length !== 1 || !/const\s+moons\s*=\s*notableMoons\(\s*bodies\s*\)\s*;/.test(code)) {
    failures.push('the Moons are not notableMoons(bodies), once');
  }
  if (!/const\s+meshes\s*=\s*useRef<\(\s*Mesh\s*\|\s*null\s*\)\[\]>\(\s*\[\s*\]\s*\)/.test(code)) failures.push('the meshes are not a ref that starts empty');
  if (!/import\s*\{\s*MOON_RENDER_ORDER\s*,\s*applyMoonScale\s*,\s*moonScale\s*,\s*notableMoons\s*\}\s*from\s*'\.\/notable-model\.ts'/.test(quoted)) {
    failures.push('the notable model is not imported as { MOON_RENDER_ORDER, applyMoonScale, moonScale, notableMoons }');
  }
  if (!/import\s*\{\s*Billboard\s*\}\s*from\s*'@react-three\/drei'/.test(quoted)) failures.push('does not import exactly { Billboard } from drei');

  const loop = /\buseFrame\s*\(\s*\(\s*\{\s*camera\s*,\s*size\s*\}\s*\)\s*=>\s*\{([\s\S]*?)\}\s*\)\s*;/.exec(code);
  if (loop === null) {
    failures.push('runs no frame loop taking ({ camera, size })');
  } else {
    const statements = (loop[1] ?? '')
      .split(';')
      .map((statement) => statement.replace(/\s+/g, ''))
      .filter((statement) => statement !== '');
    const expected = [
      'camera.updateMatrixWorld()',
      'moons.forEach((moon,index)=>applyMoonScale(meshes.current[index],moonScale(moon,camera.matrixWorldInverse.elements,camera.projectionMatrix.elements,size.height)))',
    ];
    if (JSON.stringify(statements) !== JSON.stringify(expected)) {
      failures.push(
        'the frame loop is not exactly: camera.updateMatrixWorld(), then every Moon’s moonScale(moon, ' +
          'camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, size.height) applied to its own mesh',
      );
    }
  }
  if ((code.match(/\buseFrame\s*\(/g) ?? []).length !== 1) failures.push('runs other than one frame loop');

  const blocks = mapBlocks(code, 'moons');
  if (blocks.length !== 1) failures.push(`maps the Moons ${blocks.length} times — one pooled mesh per Moon`);
  const block = squash(blocks[0] ?? '');
  if (!/^moons\.map\(\s*\(\s*moon\s*,\s*index\s*\)\s*=>\s*\(\s*<group key=\{\s*moon\.id\s*\} position=\{\s*\[\s*moon\.position\.x\s*,\s*moon\.position\.y\s*,\s*moon\.position\.z\s*\]\s*\}\s*>\s*<Billboard>\s*<mesh\b/.test(block)) {
    failures.push('a Moon is not a mesh in a <Billboard> in a group keyed by its id at [moon.position.x, moon.position.y, moon.position.z]');
  }
  if ((block.match(/<group\b/g) ?? []).length !== 1 || (block.match(/<Billboard\b/g) ?? []).length !== 1) {
    failures.push('a Moon is drawn other than in one positioned, camera-facing group');
  }
  const meshes = block.match(/<mesh\b[\s\S]*?>\s*</g) ?? [];
  if (meshes.length !== 1 || (code.match(/<mesh\b/g) ?? []).length !== 1) failures.push('not one mesh per Moon');
  const mesh = meshes[0] ?? '';
  if (!/\bref=\{\s*\(\s*mesh\b[^)]*\)\s*=>\s*\{\s*meshes\.current\[\s*index\s*\]\s*=\s*mesh\s*;?\s*\}\s*\}/.test(mesh)) {
    failures.push('a Moon’s mesh is not stored at its pool index');
  }
  if (!/\bposition=\{\s*\[\s*moon\.center\[0\]\s*,\s*moon\.center\[1\]\s*,\s*moon\.center\[2\]\s*\]\s*\}/.test(mesh)) {
    failures.push('a Moon is not at its billboard-local centre — the scale would move it off its Ring');
  }
  if (/\bscale\s*=/.test(code)) failures.push('a Moon carries a scale prop — the frame loop alone scales it, so a re-render cannot reset it');
  if (!/\brenderOrder=\{\s*MOON_RENDER_ORDER\s*\}/.test(mesh)) {
    failures.push('a Moon is not drawn at MOON_RENDER_ORDER — after the Dust, and over its coplanar Ring');
  }
  if ((code.match(/\brenderOrder\s*=/g) ?? []).length !== 1) failures.push('a renderOrder other than the Moon’s');
  if (!/<circleGeometry\s+args=\{\s*\[\s*moon\.radius\s*,/.test(block)) failures.push('a Moon is not a circle of the Moon’s radius');
  const materials = code.match(/<\w+Material\b[^>]*>/g) ?? [];
  if (materials.length !== 1) failures.push('a Moon is not drawn with exactly one material');
  for (const material of materials) {
    if (!/^<meshBasicMaterial\b/.test(material)) failures.push('a Moon material is lit');
    if (!/\bcolor=\{\s*moon\.color\s*\}/.test(material)) failures.push('a Moon is not drawn in the Moon’s colour');
    if (!/\btransparent(?:\s*=\s*\{\s*true\s*\}|(?![\w-]|\s*=))/.test(material)) failures.push('a Moon is opaque — three draws the opaque list first, before the Dust');
    if (!/\bopacity=\{\s*1\s*\}/.test(material)) failures.push('a Moon is not at opacity 1 — opacity is never the signal');
  }
  if (/\btokens\b|\bstroke-|\bink-/.test(quoted)) failures.push('reads a token directly — the Moon’s colour is the model’s');
  return failures;
}

test('the Moons’ renderer binds the notable model and holds no rule of its own', () => {
  assert.deepEqual(auditMoonField(readFileSync(MOON_FIELD_TSX, 'utf8')), []);
});

test('the Moon audit rejects the real renderer with any one guarantee broken', () => {
  const real = readFileSync(MOON_FIELD_TSX, 'utf8');
  const SCALE = 'moonScale(moon, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, size.height)';
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a store write', (s) => s.replace('camera.updateMatrixWorld();', 'camera.updateMatrixWorld();\n    navigationStore.setState({ focusedProjectId: null });')],
    ['a named event', (s) => s.replace('camera.updateMatrixWorld();', 'camera.updateMatrixWorld();\n    releaseFocus();')],
    ['a store read', (s) => s.replace('camera.updateMatrixWorld();', 'camera.updateMatrixWorld();\n    const state = navigationStore.getState();')],
    ['a subscription', (s) => s.replace('const moons = notableMoons(bodies);', 'const subject = useSyncExternalStore(navigationStore.subscribe, () => null);\n  const moons = notableMoons(bodies);')],
    ['the Moons read off the subject', (s) => s.replace('notableMoons(bodies)', 'notableMoons(bodies, subject)')],
    ['reactive state', (s) => s.replace('const moons = notableMoons', 'const [, force] = useState(0);\n  const moons = notableMoons')],
    ['memoised Moons', (s) => s.replace('const moons = notableMoons(bodies);', 'const moons = useMemo(() => notableMoons(bodies), [bodies]);')],
    ['useThree', (s) => s.replace('const moons = notableMoons', 'const { size } = useThree();\n  const moons = notableMoons')],
    ['a DOM read', (s) => s.replace('size.height)', 'window.innerHeight)')],
    ['a constant height', (s) => s.replace('size.height)', '800)')],
    ['the width for the height', (s) => s.replace('size.height)', 'size.width)')],
    ['stale matrices', (s) => s.replace('camera.updateMatrixWorld();', '')],
    ['the matrices swapped', (s) => s.replace('camera.matrixWorldInverse.elements, camera.projectionMatrix.elements', 'camera.projectionMatrix.elements, camera.matrixWorldInverse.elements')],
    ['the world matrix for the view', (s) => s.replace('camera.matrixWorldInverse.elements', 'camera.matrixWorld.elements')],
    ['no floor', (s) => s.replace(SCALE, '1')],
    ['the wrong mesh', (s) => s.replace('applyMoonScale(meshes.current[index]', 'applyMoonScale(meshes.current[0]')],
    ['nothing applied', (s) => s.replace(/\n\s*moons\.forEach\([^\n]*\n/, '\n')],
    ['a second frame loop', (s) => s.replace('return (', 'useFrame(() => undefined);\n  return (')],
    ['a deep read', (s) => s.replace('const moons = notableMoons(bodies);', 'const moons = notableMoons(bodies.filter((body) => body.isDeep === true));')],
    ['a band read', (s) => s.replace('color={moon.color}', 'color={bodies[0]?.luminanceBand}')],
    ['a token read directly', (s) => s.replace('color={moon.color}', "color={tokens.colors['stroke-active-dark']}")],
    ['a lit Moon', (s) => s.replace('<meshBasicMaterial', '<meshStandardMaterial')],
    ['a light', (s) => s.replace('<Billboard>', '<ambientLight />\n          <Billboard>')],
    ['a Moon fades', (s) => s.replace('opacity={1}', 'opacity={0.6}')],
    ['an opaque Moon', (s) => s.replace('transparent opacity={1}', 'opacity={1}')],
    ['no draw order', (s) => s.replace('renderOrder={MOON_RENDER_ORDER}', '')],
    ['a literal draw order', (s) => s.replace('renderOrder={MOON_RENDER_ORDER}', 'renderOrder={3}')],
    ['the Moon at the Ring’s order', (s) => s.replace('renderOrder={MOON_RENDER_ORDER}', 'renderOrder={BODY_RENDER_ORDER}')],
    ['the Moon order computed locally', (s) => s.replace('renderOrder={MOON_RENDER_ORDER}', 'renderOrder={BODY_RENDER_ORDER + 1}')],
    ['the Moon not facing the camera', (s) => s.replace('<Billboard>', '<group>').replace('</Billboard>', '</group>')],
    ['the Moon off its centre', (s) => s.replace('position={[moon.center[0], moon.center[1], moon.center[2]]}', 'position={[moon.center[0], moon.center[0], moon.center[2]]}')],
    ['the Moon at its Planet', (s) => s.replace(/\n\s*position=\{\[moon\.center\[0\], moon\.center\[1\], moon\.center\[2\]\]\}/, '')],
    ['the position deleted', (s) => s.replace(' position={[moon.position.x, moon.position.y, moon.position.z]}', '')],
    ['the axes swapped', (s) => s.replace('[moon.position.x, moon.position.y, moon.position.z]', '[moon.position.y, moon.position.x, moon.position.z]')],
    ['a scale prop', (s) => s.replace('renderOrder={MOON_RENDER_ORDER}', 'renderOrder={MOON_RENDER_ORDER}\n              scale={1}')],
    ['a Moon off its radius', (s) => s.replace('args={[moon.radius, 24]}', 'args={[0.2, 24]}')],
    ['keyed by index', (s) => s.replace('key={moon.id}', 'key={index}')],
    ['the handle not stored', (s) => s.replace('meshes.current[index] = mesh;', 'void mesh;')],
    ['a click', (s) => s.replace('renderOrder={MOON_RENDER_ORDER}', 'renderOrder={MOON_RENDER_ORDER}\n              onClick={() => undefined}')],
    ['a hover', (s) => s.replace('renderOrder={MOON_RENDER_ORDER}', 'renderOrder={MOON_RENDER_ORDER}\n              onPointerOver={() => undefined}')],
    ['a drei connector', (s) => s.replace("import { Billboard } from '@react-three/drei';", "import { Billboard, Line } from '@react-three/drei';")],
    ['a coordinate literal', (s) => s.replace('camera.updateMatrixWorld();', 'camera.updateMatrixWorld();\n    camera.position.set(0, 5, 40);')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply to the shipped renderer`);
    assert.notDeepEqual(auditMoonField(mutated), [], `"${name}" must be rejected`);
  }
});

// --- The Ring means a Notable, and nothing else (3.3) ------------------------------

/** Every string literal in a source, comments blanked first. */
function stringLiterals(source: string): string[] {
  return blankComments(source).match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? [];
}

/**
 * Every JSX text child in a `.tsx` source: text between a `>` and the next `<`
 * holding no brace (an `{expression}` child is code, read by the string scan),
 * comments blanked first. A heuristic over source text — a stretch of TypeScript
 * between a generic's `>` and a `<` can be read too, which only widens the scan.
 */
function jsxTexts(source: string): string[] {
  return [...blankComments(source).matchAll(/>([^<>{}]+)</g)]
    .map((match) => (match[1] ?? '').trim())
    .filter((text) => /[a-z]/i.test(text));
}

/** Whether a piece of copy pairs the word `ring` with the word `open`. */
const RING_OPENS = (text: string): boolean => /\bring/i.test(text) && /\bopen/i.test(text);

/**
 * Each non-test source whose string literals — or, in a `.tsx`, JSX text — pair
 * `ring` with `open` as words, as `file: text`. Word-anchored, so `string` and
 * `during` are not a ring.
 */
function ringOpensStrings(files: readonly { readonly path: string; readonly source: string }[]): string[] {
  return files
    .filter((file) => !/\.test\.ts$/.test(file.path))
    .flatMap((file) =>
      [...stringLiterals(file.source), ...(/\.tsx$/.test(file.path) ? jsxTexts(file.source) : [])]
        .filter(RING_OPENS)
        .map((text) => `${file.path}: ${text}`),
    );
}

test('no shipped string says what a ring opens — the Ring means a Notable, and everything opens', () => {
  // DESIGN.md §7.2: the direction-03 caption is wrong under the ratified decisions
  // and must not survive into any build. No copy explains a mark at all.
  const files = sourceFiles();
  assert.ok(
    files.some((file) => file.path.replace(/\\/g, '/') === 'src/shell/index-model.ts'),
    'the walk reaches the shipped Deep/Shallow copy',
  );
  assert.ok(files.some((file) => /\.tsx$/.test(file.path)), 'the walk reaches JSX too');
  assert.deepEqual(ringOpensStrings(files), []);
  for (const source of [
    "const caption = 'a ring means it opens';",
    '<p>{"Ring: open to read"}</p>',
    'const hint = `the RING opens the Notable`;',
    'export const Caption = () => <p>A ring means it opens.</p>;',
    '<figcaption>\n  Rings open the Notable\n</figcaption>',
  ]) {
    assert.notDeepEqual(ringOpensStrings([{ path: 'src/shell/x.tsx', source }]), [], `${source} must be rejected`);
  }
  assert.deepEqual(
    ringOpensStrings([
      { path: 'src/shell/x.tsx', source: "// a ring never means it opens\nconst a = 'ring'; const b = 'open';" },
      { path: 'src/shell/x.test.ts', source: "const caption = 'a ring means it opens';" },
      // Word-anchored: neither `string` nor `during` is a ring.
      { path: 'src/shell/x.ts', source: "const m = 'the string is open'; const n = 'during the opening frame';" },
      { path: 'src/shell/x.tsx', source: '<p>The string stays open during the opening.</p>' },
      // JSX text is read in `.tsx` only, and an expression child is code, not copy.
      { path: 'src/shell/x.ts', source: 'const a = b > ring && open < c;' },
      { path: 'src/shell/x.tsx', source: '<p>{ring}</p><span>{open}</span>' },
      { path: 'src/shell/x.tsx', source: '{/* a ring opens nothing */}<p>Deep</p>' },
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
    // 2.7: named in the import, vocabulary and connector scans (the focus model in the
    // coordinate-literal scan too), and each carries its own purity audit.
    'focus-model.ts',
    'focus-model.test.ts',
    'scene-pick.ts',
    'scene-pick.test.ts',
    // 2.8: named in the import, vocabulary and connector scans (the field in the
    // coordinate-literal scan too); the field has its own audit below, the model
    // its purity audit in `mote-model.test.ts`.
    'mote-model.ts',
    'mote-model.test.ts',
    'mote-field.tsx',
    // 2.9: named in the import, vocabulary, connector and coordinate-literal scans;
    // its purity audit is in `flight-model.test.ts`.
    'flight-model.ts',
    'flight-model.test.ts',
    // 3.2: named in the import, vocabulary and coordinate-literal scans; the model is
    // in the connector scan too and carries its own purity audit in
    // `stroke-model.test.ts`, the binding has `auditBodyField` and `auditPick` above.
    'stroke-model.ts',
    'stroke-model.test.ts',
    'body-field.tsx',
    // 3.3: named in the import, vocabulary, connector and coordinate-literal scans;
    // the model carries its own purity audit in `notable-model.test.ts`, the binding
    // has `auditMoonField` above, and its mount is held by `auditDrawOrder`.
    'notable-model.ts',
    'notable-model.test.ts',
    'moon-field.tsx',
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

// --- Who reads the reduced-motion preference (2.10) -------------------------------

/** The files that may reference the preference, by role. Everything else is a finding. */
const PREFERENCE_ROLES: Readonly<Record<string, 'writer' | 'reader' | 'model'>> = {
  'src/shell/scene-host.tsx': 'writer',
  'src/render-scene/rail-camera.tsx': 'reader',
  'src/render-scene/mote-field.tsx': 'reader',
  'src/shell/focus-panel.tsx': 'reader',
  'src/render-scene/rail-model.ts': 'model',
  'src/render-scene/flight-model.ts': 'model',
  'src/render-scene/focus-model.ts': 'model',
  'src/render-scene/mote-model.ts': 'model',
};

/**
 * Every non-test `.ts`/`.tsx` file under `src/` that references the reduced-motion
 * preference, as a pure function over files.
 *
 * A reference is an import of `motion-preference` in any form, or any of its
 * names. Only the set in `PREFERENCE_ROLES` may hold one, so no capability
 * judgement (story 4.1) can read it: the preference paces motion and decides
 * nothing else. Within the set, each role names only its own part — the writer
 * `setReducedMotion` and the query, a reader `reducedMotion` (and, in React,
 * `subscribeReducedMotion`), a model `motionPace` alone, taking `reduced` as an
 * argument rather than reading the preference itself.
 */
function preferenceReaders(files: readonly { readonly path: string; readonly source: string }[]): string[] {
  const failures: string[] = [];
  const names = /\b(?:reducedMotion|subscribeReducedMotion|setReducedMotion|motionPace|REDUCED_MOTION_PACE|REDUCED_MOTION_QUERY)\b/;
  for (const file of files) {
    if (file.path === 'src/shell/motion-preference.ts' || /\.test\.ts$/.test(file.path)) continue;
    const code = blankComments(file.source);
    const imports = [...code.matchAll(/(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"`]([^'"`]+)['"`]/g)].some((match) =>
      /(?:^|\/)motion-preference(?:\.tsx?)?$/.test(match[1] ?? ''),
    );
    if (!imports && !names.test(code)) continue;
    const role = PREFERENCE_ROLES[file.path];
    if (role === undefined) {
      failures.push(`${file.path} references the reduced-motion preference — only the pacing surfaces may`);
      continue;
    }
    const writes = /\b(?:setReducedMotion|REDUCED_MOTION_QUERY)\b/.test(code);
    const reads = /\b(?:reducedMotion|subscribeReducedMotion)\b/.test(code);
    if (role !== 'writer' && writes) failures.push(`${file.path} writes the preference — scene-host.tsx is its one writer`);
    if (role !== 'reader' && reads) failures.push(`${file.path} reads the preference — a ${role} takes what a reader hands it`);
    if (role === 'model' && !/\breduced\s*=\s*false\b/.test(code)) failures.push(`${file.path} takes no trailing reduced = false`);
  }
  return failures;
}

function sourceFiles(): { path: string; source: string }[] {
  return readdirSync(SRC_ROOT, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
    .map((path) => ({ path: `src/${relative(SRC_ROOT, path).split(sep).join('/')}`, source: readFileSync(path, 'utf8') }));
}

test('only the pacing surfaces reference the reduced-motion preference, each in its own role', () => {
  const files = sourceFiles();
  for (const path of Object.keys(PREFERENCE_ROLES)) {
    const file = files.find((entry) => entry.path === path);
    assert.ok(file !== undefined, `${path} is walked`);
    assert.match(blankComments(file.source), /motion-preference\.ts/, `${path} does reference it — the set is not stale`);
  }
  assert.deepEqual(preferenceReaders(files), []);
});

test('the preference-reader audit rejects each bad form, and ignores prose, tests and the module itself', () => {
  const at = (path: string, source: string) => [{ path, source }];
  for (const [path, source] of [
    ['src/shell/capability.ts', "import { reducedMotion } from './motion-preference.ts';"],
    ['src/shell/entry.ts', "const pref = await import('./motion-preference.ts');"],
    ['src/render-fallback/index.ts', "import * as motion from '../shell/motion-preference';"],
    ['src/shell/index-nav.tsx', 'const reduced = reducedMotion();'],
    ['src/render-scene/scene.tsx', 'const pace = motionPace(true);'],
    ['src/render-scene/rail-camera.tsx', "import { setReducedMotion } from '../shell/motion-preference.ts';\nsetReducedMotion(true);"],
    ['src/shell/focus-panel.tsx', 'window.matchMedia(REDUCED_MOTION_QUERY);'],
    ['src/render-scene/flight-model.ts', 'export function stepFlight(dt: number, reduced = false) { return dt / motionPace(reducedMotion()); }'],
    ['src/shell/scene-host.tsx', 'setReducedMotion(true); const r = reducedMotion();'],
    ['src/render-scene/mote-model.ts', 'const pace = motionPace(true);'],
  ] as const) {
    assert.notDeepEqual(preferenceReaders(at(path, source)), [], `${path}: ${source} must be rejected`);
  }
  assert.deepEqual(
    preferenceReaders([
      { path: 'src/shell/motion-preference.ts', source: 'export function reducedMotion() {}' },
      { path: 'src/shell/state.test.ts', source: "import { reducedMotion } from './motion-preference.ts';" },
      { path: 'src/shell/state.ts', source: '// reducedMotion() is read by the rig, not here.' },
      { path: 'src/render-scene/rail-model.ts', source: "import { motionPace } from '../shell/motion-preference.ts';\nfunction f(dt: number, reduced = false) { return motionPace(reduced); }" },
      { path: 'src/shell/scene-host.tsx', source: "import { REDUCED_MOTION_QUERY, setReducedMotion } from './motion-preference.ts';" },
    ]),
    [],
  );
});
