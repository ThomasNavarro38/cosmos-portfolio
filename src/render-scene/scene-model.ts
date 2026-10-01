/**
 * The scene as a flat list of Bodies, and the default framing that sees them.
 *
 * **It reads and never derives** (AD-3). Every position this model emits was
 * solved in `src/derive/` and every visual property was resolved there too:
 * `mass`, `luminanceBand`, `moteTier` and `isDeep` arrive on the artifact and are
 * carried through unchanged. Nothing here classifies, no mapping rule is
 * recomputed, no force is simulated, and no `content` field is read as an input
 * to a decision. A renderer that re-derived any of them would put that rule in a
 * second place, and the two would disagree the first time either changed.
 *
 * **Pure, and deliberately not a component.** This module imports **nothing at
 * all** — not the artifact, not `three`, not React. The whole document arrives as
 * an argument. That is what makes AD-3 structural rather than asserted, and it is
 * what makes every rule below executable under `node --test`, which cannot load a
 * `.tsx` file in any position: Node 24's built-in type stripping rejects the
 * extension at module resolution, in test *and* import position. Adding a
 * transform means adding dependencies to a set deliberately closed at fifteen
 * exact pins. So every AC-bearing rule lives here and `scene.tsx` is a mapping
 * thin enough that reading it suffices — ratcheted by source scans in
 * `scene-model.test.ts`.
 *
 * **Flat, because the renderer draws a list.** The artifact nests Projects under
 * their Client, and the DOM index keeps that nesting because there the structure
 * *is* the information. Here it is not: a Planet's membership is already carried
 * by `clientId`, and its relation to its Star by its solved position and the
 * orbit plane the solve emitted with it (`orbitNormal`, 3.2). So the scene
 * consumes one list. The orbit drawn around a Star is the orbit *solved* — its
 * plane read off the artifact, never reconstructed here — and the only line
 * geometry in the scene is the orbits and the Rail, both built by named model
 * functions in `stroke-model.ts` and `rail-model.ts`.
 *
 * **A Company is an attribute, never a Body.** `content.company` names who the
 * work was done through; it adds no entity to the graph and therefore adds
 * nothing here. `entities.ts` already resolved that; this module inherits it by
 * not looking at the field.
 */

/**
 * The slice of the artifact this model reads, declared structurally rather than
 * imported.
 *
 * `src/render-scene/` may never import `src/derive/` — not even `import type`,
 * which the boundary parser counts as an import, and rightly: a type-only edge is
 * still a declaration that the renderer knows the derive layer's module graph. So
 * the shape is restated here as the *minimum* the scene needs, and the artifact
 * satisfies it structurally. The same idiom, and the same reason, as
 * `IndexArtifact` in `src/shell/index-model.ts`.
 *
 * The restatement is narrow on purpose: it names the fields a Body carries and
 * nothing else, so it describes what the scene consumes rather than being a
 * second copy of the contract. `artifact-schema.ts` stays the one declaration of
 * the document's shape, and TypeScript checks the artifact against this one where
 * the two meet — at the `buildScene` call in `scene.tsx`.
 */
export interface SceneArtifact {
  readonly clients: readonly SceneArtifactClient[];
  /**
   * Client IDs in Rail order — **oldest engagement first**, as the artifact emits
   * it. The Rail model reads it from the end (present first), exactly as the DOM
   * index does; nothing here re-sorts it.
   */
  readonly rail: readonly string[];
  /** One default Shot per Client stop: a subject and a relative framing, never a place. */
  readonly shots: readonly SceneArtifactShot[];
  /**
   * One Dwell tempo per Client, keyed by subject ID. The Rail model reads a
   * stop's pace from it by ID, never by position.
   */
  readonly dwell: readonly SceneArtifactDwell[];
}

/**
 * One Dwell entry, as far as the scene is concerned: a Client ID and its tempo
 * class. The tempo is a string rather than the derive layer's union, which this
 * directory may not import; `rail-model.ts` rejects a tempo it does not name.
 */
export interface SceneArtifactDwell {
  readonly subject: string;
  readonly tempo: string;
}

/**
 * The slice of the artifact the Body list is built from.
 *
 * `buildScene` reads `clients` and nothing else, so it asks for nothing else: the
 * Rail's `rail` and `shots` are `rail-model.ts`'s to read, and a Body list that
 * could not be built without them would couple the scene's shape to the camera's.
 */
export type SceneBodiesArtifact = Pick<SceneArtifact, 'clients'>;

/**
 * One Shot in the artifact, as far as the scene is concerned: an entity ID plus
 * relative framing, with **no world coordinate** (FR-17).
 *
 * `angle` is the elevation above the orbital plane, in radians, measured from the
 * subject; `distance` is how far from the subject the camera stands. The
 * artifact's `framing` class is not restated: there is one member today and
 * nothing here branches on it.
 */
export interface SceneArtifactShot {
  readonly subject: string;
  readonly angle: number;
  readonly distance: number;
}

/** One Client in the artifact, as far as the scene is concerned. */
export interface SceneArtifactClient {
  readonly id: string;
  readonly position: ScenePosition;
  readonly projects: readonly SceneArtifactProject[];
}

/** One Project in the artifact, as far as the scene is concerned. */
export interface SceneArtifactProject {
  readonly id: string;
  readonly clientId: string;
  readonly isDeep: boolean;
  readonly mass: number;
  readonly luminanceBand: string;
  readonly moteTier: string;
  readonly position: ScenePosition;
  /** The unit normal of the plane this Project orbits its Star in, as solved (3.2). */
  readonly orbitNormal: ScenePosition;
}

/** A solved position in scene space, exactly as the artifact carries it. */
export interface ScenePosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * What a Body is: a Star or a Planet. The vocabulary is fixed.
 *
 * A Client is a Star, a Project is a Planet, and there is no third kind — a
 * Company is an attribute and Dust, Motes and Condensation are later stories'
 * surfaces rather than Bodies. Declared as a union rather than a boolean so a
 * consumer discriminates on what a Body *is* instead of on which optional field
 * happens to be present.
 */
export type BodyKind = 'star' | 'planet';

/**
 * One Body: what to draw, where, and what the artifact already resolved about it.
 *
 * `id` is the entity ID verbatim — the one handle every surface shares, so the
 * index, the store and the scene all name a destination the same way. A
 * re-slugified or prefixed ID here would be a second identity derivation.
 *
 * `mass`, `luminanceBand`, `moteTier`, `isDeep` and `orbitNormal` are carried
 * as the artifact resolved them. `luminanceBand` is a Planet's resting stroke
 * token and `orbitNormal` its orbit plane (both drawn since 3.2, through
 * `stroke-model.ts`); the rest wait for the stories that dress them. They are on
 * the Body because the model's job is to hand the renderer everything the
 * artifact resolved, so a later story adds appearance without adding a read.
 */
export interface Body {
  /** The entity ID, exactly as the artifact minted it. */
  readonly id: string;
  readonly kind: BodyKind;
  /** The solved position, carried through unchanged. Never recomputed here. */
  readonly position: ScenePosition;
  /**
   * The solved mass, present on a Planet and absent on a Star.
   *
   * A Client carries no mass in the artifact — mass is resolved per Project — and
   * summing a Star's Planets to invent one would be a fourth mapping rule in the
   * one directory forbidden to hold any (AD-3). If a Star's size should mean
   * something, that rule belongs in `src/derive/` and arrives through the
   * artifact. So this is optional, and a consumer sizing a mesh discriminates on
   * `kind` rather than on this field being absent.
   */
  readonly mass?: number;
  /** The resting luminance band, as the artifact resolved it. Star: absent. */
  readonly luminanceBand?: string;
  /** The mote tier, as the artifact resolved it. Star: absent. */
  readonly moteTier?: string;
  /** Deep or Shallow, as the artifact classified it. Star: absent. */
  readonly isDeep?: boolean;
  /** The Star this Planet orbits, by ID. Star: absent. */
  readonly clientId?: string;
  /**
   * The unit normal of this Planet's orbit plane, as the artifact solved it.
   * Star: absent — a Star orbits nothing. Carried, never computed (AD-3).
   */
  readonly orbitNormal?: ScenePosition;
}

/** The whole scene: every Body, in the order the artifact carries them. */
export interface SceneBodies {
  readonly bodies: readonly Body[];
}

/**
 * Builds the Body list from the artifact.
 *
 * **Order is the artifact's, and no sort is applied.** Bodies come out in
 * `clients[]` order — which is `timeAxis` order, as the artifact emits it — and
 * each Client's Star precedes its own Planets. The derive layer owns every
 * ordering rule (AD-3); a sort here would be a second one nobody is watching, and
 * it would keep agreeing with the artifact's right up until it did not.
 *
 * Two malformed documents **throw** rather than render, the same posture
 * `requireId` takes in `src/shell/state.ts` and `startsAt` takes in the derive
 * layer:
 *
 *   - **A duplicate entity ID.** Two Bodies resolving to one ID draw two
 *     coincident meshes and give React two siblings sharing a key: visually it
 *     reads as one Body, so the document is wrong and the surface looks right.
 *   - **A non-finite coordinate.** `JSON.stringify` writes `NaN` and `Infinity`
 *     as `null`, and arithmetic on an undefined offset produces `NaN` — either
 *     way an unguarded coordinate places a Body nowhere, in silence. The gate
 *     already rejects such a document naming the path, so reaching here means it
 *     was hand-edited past the build.
 *
 * @returns a fresh structure each call; nothing is cached and the argument is
 * never mutated, so a caller may re-render freely.
 */
export function buildScene(artifact: SceneBodiesArtifact): SceneBodies {
  const bodies: Body[] = [];
  // Keyed on the ID because the ID is what identifies a destination — and what
  // the renderer keys its meshes on.
  const seen = new Set<string>();

  const claim = (id: string): void => {
    if (seen.has(id)) {
      throw new Error(
        `the artifact carries the entity ID ${JSON.stringify(id)} more than once; ` +
          'two Bodies at one ID render as two coincident meshes and read as one.',
      );
    }
    seen.add(id);
  };

  for (const client of artifact.clients) {
    claim(client.id);
    bodies.push({
      id: client.id,
      kind: 'star',
      position: requireFinitePosition(client.id, client.position),
    });

    for (const project of client.projects) {
      claim(project.id);
      bodies.push({
        id: project.id,
        kind: 'planet',
        position: requireFinitePosition(project.id, project.position),
        mass: project.mass,
        luminanceBand: project.luminanceBand,
        moteTier: project.moteTier,
        isDeep: project.isDeep,
        // Carried from the field rather than from the traversal. The two agree in
        // every document the emitter writes; where they disagree the field is
        // what every other consumer resolves a Planet's Star by, so reading the
        // nesting instead would make this surface the only one that disagrees.
        clientId: project.clientId,
        orbitNormal: requireFiniteVector(project.id, 'orbit normal', project.orbitNormal),
      });
    }
  }

  return { bodies };
}

/**
 * Returns the position unchanged, or throws naming the entity and the axis.
 *
 * The axis is named because "a coordinate is not finite" is not a diagnosis in a
 * document holding three numbers per Body and dozens of Bodies. Same convention
 * as the gate's failure lines.
 */
function requireFinitePosition(id: string, position: ScenePosition): ScenePosition {
  return requireFiniteVector(id, 'coordinate', position);
}

/** The same guard for any carried vector, naming what it is. */
function requireFiniteVector(id: string, what: string, vector: ScenePosition | undefined): ScenePosition {
  if (vector === undefined) {
    throw new Error(`${id} carries no ${what}; the artifact emits one for every Project.`);
  }
  for (const axis of ['x', 'y', 'z'] as const) {
    const value = vector[axis];
    if (!Number.isFinite(value)) {
      throw new Error(
        `${id} has a non-finite ${axis} ${what} (${String(value)}); ` +
          'a Body at an unguarded coordinate is placed nowhere, silently.',
      );
    }
  }
  return vector;
}

/**
 * The aspect ratio the default framing is fitted for.
 *
 * Three derives the *horizontal* field of view from the vertical one times the
 * viewport aspect, so a portrait viewport narrows the `x` axis — which is the
 * axis the Rail runs along, and therefore the axis the Bodies spread out on. A
 * framing fitted to the vertical extent alone was shipped and then caught in a
 * real browser: at 390 × 844 the committed Planet at `x: 10` sat off-frame while
 * the whole suite was green, because a test can only assert a fit at some assumed
 * aspect ratio and the assumed one was square.
 *
 * `0.45` is narrower than any phone in portrait (a 390 × 844 viewport is 0.46), so
 * the fit holds across the range a visitor actually has. No finite distance frames
 * *every* aspect ratio, so a bound exists whether or not one is named; naming it
 * is what makes it assertable. Since 2.5 it is also the Rail's floor: the
 * smallest aspect `rail-model.ts` contains a stop for, so a collapsed canvas
 * cannot fling the camera away. The opening frame is exactly this framing at
 * every aspect; a viewport narrower than the floor still crops, as before.
 */
export const NARROWEST_ASPECT = 0.45;

/** The vertical field of view the default framing is computed for, in degrees. */
export const DEFAULT_FOV = 50;

/**
 * The near plane the framing is computed with, and the one the renderer passes.
 *
 * Returned rather than left to R3F's default `0.1`, because a framing that
 * computes a distance and then lets a dependency choose the near plane is a
 * framing whose frustum is only partly its own. Named here so the containment
 * test builds the same camera the renderer mounts.
 */
export const DEFAULT_NEAR = 0.1;

/**
 * Slack added around the Bodies' extent, in scene units.
 *
 * A Body is drawn as a circle of non-zero radius, so a camera fitted to the
 * *centres* clips the outermost Body in half. This is the margin that keeps the
 * whole outline inside the frustum, and it must stay at least as large as the
 * largest radius `stroke-model.ts` draws — asserted in `scene-model.test.ts`
 * rather than assumed, because the two numbers live in two files.
 */
export const BODY_MARGIN = 3;

/**
 * The radius every Body of a Client's system is contained as at its Rail stop,
 * in scene units.
 *
 * `rail-model.ts` resolves a stop's distance so that a sphere this large around
 * each Body's centre sits wholly inside the frustum. Its floor is the largest
 * radius `stroke-model.ts` draws — below that a Body clips at its stop — and
 * `scene-model.test.ts` asserts it, as it does for `BODY_MARGIN`. Everything
 * above the floor is composition: at today's radii (1 at most) it leaves the
 * Planet two units clear of the frame's edge, so it reads as *in* the frame
 * rather than grazing it.
 *
 * Equal to `BODY_MARGIN` today, but not the same quantity: that one is the
 * opening frame's slack and the Dust's clearance, this one is how snugly a stop
 * frames its system. Tuning one must not move the other.
 */
export const STOP_MARGIN = 3;

/**
 * The render order every Body draw carries.
 *
 * A Body concern, so it lives with the Body: `dust-model.ts` sets its own order
 * below this one, which is what puts every Dust draw before every Body draw. A
 * constant needs no import, so this module keeps importing nothing at all. The
 * renderer pairs it with a `transparent` material at opacity 1, because three
 * draws its whole opaque list before its transparent list whatever the
 * `renderOrder`.
 */
export const BODY_RENDER_ORDER = 2;

/**
 * Where the default camera stands and how it is turned, computed from the Bodies.
 *
 * **The orientation is part of the framing, not a default to inherit.** React
 * Three Fiber calls `camera.lookAt(0, 0, 0)` whenever the `camera` prop carries no
 * `rotation` (`@react-three/fiber/dist/events-156d8d12.esm.js:15786`, under its
 * own comment "Always look at center by default"). A framing that returned a
 * position and a target and trusted the default therefore aimed at the **world
 * origin** rather than at the Bodies' centre — and the committed Planet at
 * `x: 10` fell outside the frustum with the whole suite green. That shipped twice.
 *
 * So the framing names the rotation it wants, and the renderer passes it. The
 * value is `[0, 0, 0]`: an unrotated Three camera looks down `-z`, and the camera
 * stands on the `+z` side at the centre's own `x` and `y`, so looking down `-z`
 * *is* looking at the centre, and nothing is left for a dependency to choose.
 *
 * The centre is returned too, as `target`, and it is the same aim stated the other
 * way: the Rail rig (2.5) aims every keyframe with `lookAt`, and keyframe 0 is this
 * framing, so it needs the entity-derived point rather than a rotation. The
 * renderer's `camera` prop still passes `rotation`, so R3F's `lookAt(0, 0, 0)`
 * default never fires, and a test pins that looking at `target` from `position`
 * produces exactly that rotation.
 */
export interface SceneFraming {
  /** Where the camera stands, in scene space. */
  readonly position: ScenePosition;
  /** Euler angles in radians, passed to the camera so no default fills them in. */
  readonly rotation: ScenePosition;
  /**
   * The Bodies' centre: the point the camera looks at.
   *
   * Looking at it from `position` **is** `rotation` — the camera stands on the
   * centre's own `x` and `y`, so the aim runs down `-z` — and a test pins that
   * the two agree. It exists so a consumer that aims by `lookAt` (the Rail rig,
   * which must aim at every keyframe the same way) aims keyframe 0 at entities
   * rather than at a coordinate it invented.
   */
  readonly target: ScenePosition;
  /** The vertical field of view, in degrees. */
  readonly fov: number;
  /** The near plane, passed rather than defaulted. */
  readonly near: number;
  /** The far plane, kept behind the furthest Body. */
  readonly far: number;
}

/**
 * Computes the default view: a static camera that contains every Body.
 *
 * Read off the Bodies rather than hard-coded, because the solver decides where
 * they land: a constant distance framed the one committed Planet by luck and
 * would lose the first Body solved beyond it. It is a single static view, and
 * it is the Rail's **keyframe 0** (`rail-model.ts`): the opening frame First Paint
 * already shows, which the visitor scrolls *from* into the first Client stop.
 * Traversal, Shots and scroll handling live in the Rail model, not here.
 *
 * The distance is the **larger** of the vertical and horizontal fits. Fitting the
 * vertical extent alone is what let a portrait viewport lose the outermost Body;
 * the horizontal fit is computed at `NARROWEST_ASPECT`, so the narrower of the two
 * axes is the one that decides.
 *
 * An empty Body list yields a usable camera rather than a `NaN` one: `buildScene`
 * throws on the documents that are *wrong*, and an artifact with no Clients is
 * merely empty. A degenerate fov — zero, negative, or at/over 180° — falls back to
 * the same distance rather than dividing by a zero tangent, so a bad constant
 * cannot silently place the camera at infinity.
 */
export function frameBodies(
  bodies: readonly Body[],
  fov: number = DEFAULT_FOV,
  aspect: number = NARROWEST_ASPECT,
): SceneFraming {
  const xs = bodies.map((body) => body.position.x);
  const ys = bodies.map((body) => body.position.y);
  const zs = bodies.map((body) => body.position.z);

  // `Math.min()` of nothing is `Infinity`, so the empty case is answered before
  // any arithmetic touches it rather than after it has produced a `NaN` centre.
  const minX = xs.length === 0 ? 0 : Math.min(...xs);
  const maxX = xs.length === 0 ? 0 : Math.max(...xs);
  const minY = ys.length === 0 ? 0 : Math.min(...ys);
  const maxY = ys.length === 0 ? 0 : Math.max(...ys);
  const maxZ = zs.length === 0 ? 0 : Math.max(...zs);
  const minZ = zs.length === 0 ? 0 : Math.min(...zs);

  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;

  // Half-extents plus the margin that keeps a drawn sphere whole rather than
  // clipping the outermost Body through its centre.
  const halfWidth = (maxX - minX) / 2 + BODY_MARGIN;
  const halfHeight = (maxY - minY) / 2 + BODY_MARGIN;

  const halfFov = (fov * Math.PI) / 360;
  const tangent = Math.tan(halfFov);
  const usable = Number.isFinite(tangent) && tangent > 0 && fov > 0 && fov < 180;

  // The vertical fit and the horizontal fit, with the horizontal divided by the
  // aspect because Three narrows the horizontal fov by exactly that factor. The
  // larger wins: a distance that fits one axis and not the other fits neither.
  const verticalFit = usable ? halfHeight / tangent : 0;
  const horizontalFit = usable ? halfWidth / (tangent * aspect) : 0;

  // Behind the Bodies, and never closer than the margin: a camera standing on the
  // centre of a single Body would otherwise sit inside it.
  const depth = Math.max(verticalFit, horizontalFit, BODY_MARGIN) + (maxZ - minZ) / 2;

  return {
    position: { x: centreX, y: centreY, z: maxZ + depth },
    // Explicit, and the reason is in `SceneFraming`: an omitted rotation is what
    // R3F fills in with `lookAt(0, 0, 0)`, aiming past the Bodies at the origin.
    rotation: { x: 0, y: 0, z: 0 },
    // The centre in all three axes. The camera shares its `x` and `y`, so looking
    // at it is looking down `-z`, which is the `rotation` above.
    target: { x: centreX, y: centreY, z: (minZ + maxZ) / 2 },
    fov,
    near: DEFAULT_NEAR,
    // Far enough behind the furthest Body that nothing is clipped out the back,
    // computed from the same depth rather than from a second constant.
    far: (maxZ + depth - minZ) * 2 + BODY_MARGIN,
  };
}
