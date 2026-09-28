/**
 * Dust at rest: the faint medium around each Client system, and the sparse
 * particles between Bodies — as data, derived from the Body list alone.
 *
 * **Composition, not derivation.** Dust maps no datum. It is read off the solved
 * positions the scene model already emits — the same kind of work as
 * `frameBodies` — and its parameters are M1 tuning items (D-T1, E-T2). So it lives
 * in the scene rather than in the artifact, and it reads **nothing but the Bodies'
 * positions, their `kind` and their `clientId`**: no `content`, no Skill, no
 * authored field. If Dust ever encodes Skills per Client, that is a derivation and
 * it moves to `src/derive/` (AD-3).
 *
 * **Pure and deterministic.** Imports `./scene-model.ts` and nothing else — not
 * `three`, not React — so every rule here executes under `node --test`. The scatter
 * is driven by a seeded PRNG, never `Math.random`, so two builds of one Body list
 * are identical and the Dust does not reshuffle between renders or deploys.
 *
 * **Density is a ratio, not a count.** `DUST_PARTICLES_PER_BODY` times the Body
 * count is the particle target, and `DUST_MEDIUM_PEAK_OPACITY` is the medium's
 * ceiling. Retuning either is a one-constant edit with no structural change.
 *
 * **Dust never reads as fog** (FR-15), held as three executable proxies because the
 * greybox has no stroke ladder to compute luminance against:
 *
 *   - **Painting over a Body** — prevented by draw order: `DUST_RENDER_ORDER` is
 *     below `BODY_RENDER_ORDER`, and the renderer writes no depth for Dust, so a
 *     Body drawn afterwards always wins, from any camera. This is also why the
 *     particles' opacity sits outside the medium's ceiling: no Dust fragment,
 *     medium or particle, ever alters a Body's own pixels.
 *   - **Piling up behind a Body** — prevented by construction, **in world space**:
 *     each medium's sphere of extent is capped at half the distance to the nearest
 *     other Star, so no two spheres overlap and the composite medium alpha at any
 *     point in the scene — every Body included — is at most one medium's peak. This
 *     is a guarantee over sphere extents, not over the screen: the media are
 *     camera-facing sprites, so when the view runs along the line joining two
 *     systems their sprites can still stack on screen.
 *   - **Crowding a Body** — prevented by clearance: no particle lands within
 *     `BODY_MARGIN` of any Body centre.
 *
 * The neighbour cap has a cost worth stating: where two Stars are close, a medium
 * can end up *smaller than its own system*, and its outer Planets then sit beyond
 * its gradient. Non-overlap wins over coverage by design.
 */

import { BODY_MARGIN, BODY_RENDER_ORDER, type Body, type ScenePosition } from './scene-model.ts';

// --- Tuning ------------------------------------------------------------------

/**
 * Particles per Body. The density ratio (D-T1): the particle target is
 * `round(DUST_PARTICLES_PER_BODY × bodies.length)`.
 *
 * Sparse on purpose — the direction mock carries fourteen particles for roughly
 * fifteen Bodies. A little above that here because the scene is a volume seen in
 * perspective, where some particles fall behind others or outside the frame.
 */
export const DUST_PARTICLES_PER_BODY = 3;

/** The medium's opacity at its centre, per DESIGN.md §7.5. Falls to 0 at the edge. */
export const DUST_MEDIUM_PEAK_OPACITY = 0.42;

/** The particles' opacity. Faint: a particle is texture, never a destination. */
export const DUST_PARTICLE_OPACITY = 0.55;

/** The drawn radius of one particle, in scene units — far below a Planet's. */
export const DUST_PARTICLE_RADIUS = 0.07;

/**
 * The one neutral greybox Dust value, shared by medium and particles.
 *
 * Mid-grey rather than white because the canvas is transparent over a white
 * document: a white medium would be invisible. Epic 3 replaces it with
 * `stroke-dust`; this is a placeholder, not a palette.
 */
export const DUST_COLOR = '#8a8a8a';

/**
 * How much broader than its system a medium is drawn.
 *
 * A medium's radius is (Star-to-farthest-Planet + `DUST_MEDIUM_MARGIN`) × this, so
 * the gradient has room to fade out beyond the outermost Planet rather than ending
 * on it.
 */
export const DUST_MEDIUM_BREADTH = 1.6;

/** Slack added to a system's extent before the breadth factor — a lone Star still gets a medium. */
export const DUST_MEDIUM_MARGIN = BODY_MARGIN;

/**
 * How far past the Bodies' bounding box particles may scatter, on every axis.
 *
 * Also what keeps the scatter volume non-degenerate when every Body shares a `y`
 * and a `z` — the committed artifact is exactly that. Kept above
 * `DUST_PARTICLE_CLEARANCE` so free volume always exists: a point `padding` beyond
 * the box on any axis is at least `padding` from every Body.
 */
export const DUST_SCATTER_PADDING = 2 * BODY_MARGIN;

/** The minimum distance from any particle to any Body centre. */
export const DUST_PARTICLE_CLEARANCE = BODY_MARGIN;

/**
 * Placement attempts allowed per target particle before giving up.
 *
 * Bounded so a pathological layout cannot loop forever; a candidate inside some
 * Body's clearance is rejected and redrawn. The fixtures hit their target well
 * within this budget, and a test asserts it. Overridable through `DustTuning` so a
 * test can make the bound bind: with `DUST_SCATTER_PADDING` above the clearance,
 * free volume always exists, so at the shipped budget no layout runs short.
 */
export const DUST_PLACEMENT_ATTEMPTS_PER_PARTICLE = 64;

/** The PRNG seed. A constant, so the scatter is identical across builds. */
export const DUST_SEED = 0x2a5d17;

/**
 * The medium texture's edge, in texels. Odd, so one texel sits exactly at the
 * centre — `mediumFalloff` rejects an even size.
 */
export const DUST_MEDIUM_TEXTURE_SIZE = 65;

// --- Draw order --------------------------------------------------------------

/**
 * The render order every Dust draw carries. Below `BODY_RENDER_ORDER` (declared in
 * `scene-model.ts`, because it is a Body concern), so every Dust draw precedes
 * every Body draw; with Dust writing no depth, a Body is never painted over by
 * Dust, whether that Dust is in front of it or behind it.
 */
export const DUST_RENDER_ORDER = BODY_RENDER_ORDER - 1;

// --- Shapes ------------------------------------------------------------------

/** One medium: a radial falloff centred on a Client's Star. */
export interface DustMedium {
  /** The Star's entity ID, which is also the key the renderer uses. */
  readonly id: string;
  /** The Star's solved position, unchanged. */
  readonly position: ScenePosition;
  /** Where the falloff reaches 0. Never beyond half the distance to another Star. */
  readonly radius: number;
  /** The opacity at the centre. */
  readonly opacity: number;
}

/** One particle: a point of Dust, placed clear of every Body. */
export interface DustParticle {
  /** A stable key — its index in the scatter. */
  readonly id: string;
  readonly position: ScenePosition;
}

/** Everything the renderer draws as Dust. */
export interface Dust {
  readonly media: readonly DustMedium[];
  readonly particles: readonly DustParticle[];
}

/**
 * The density parameters, overridable so a test can prove a retune is one edit,
 * plus the placement budget, overridable so a test can make it bind.
 */
export interface DustTuning {
  readonly particlesPerBody: number;
  readonly mediumPeakOpacity: number;
  readonly placementAttemptsPerParticle: number;
}

/** The tuning the scene ships with, read straight off the named constants. */
export const DUST_TUNING: DustTuning = {
  particlesPerBody: DUST_PARTICLES_PER_BODY,
  mediumPeakOpacity: DUST_MEDIUM_PEAK_OPACITY,
  placementAttemptsPerParticle: DUST_PLACEMENT_ATTEMPTS_PER_PARTICLE,
};

// --- The model ---------------------------------------------------------------

/**
 * Builds the Dust from the Body list.
 *
 * One medium per Star, centred on it, and `round(particlesPerBody × bodies.length)`
 * particles scattered through the Bodies' padded bounding box, each at least
 * `DUST_PARTICLE_CLEARANCE` from every Body centre. Placement is bounded by
 * `placementAttemptsPerParticle` × the target; if the budget runs out the scatter is
 * short rather than crowding a Body.
 *
 * An empty Body list yields no media and no particles rather than a `NaN` box.
 *
 * @throws RangeError naming the field when the tuning is out of range: a `NaN`
 * ratio would yield a silently empty scatter, an infinite one an unbounded
 * placement loop, and an opacity outside `[0, 1]` a medium no material can draw.
 * @returns a fresh structure each call; the argument is never mutated.
 */
export function buildDust(bodies: readonly Body[], tuning: DustTuning = DUST_TUNING): Dust {
  requireTuning(tuning);
  if (bodies.length === 0) return { media: [], particles: [] };
  return { media: buildMedia(bodies, tuning), particles: scatterParticles(bodies, tuning) };
}

function requireTuning(tuning: DustTuning): void {
  const { particlesPerBody, mediumPeakOpacity, placementAttemptsPerParticle } = tuning;
  if (!Number.isFinite(particlesPerBody) || particlesPerBody < 0) {
    throw new RangeError(`particlesPerBody must be finite and at least 0, not ${String(particlesPerBody)}`);
  }
  if (!Number.isFinite(mediumPeakOpacity) || mediumPeakOpacity < 0 || mediumPeakOpacity > 1) {
    throw new RangeError(`mediumPeakOpacity must be finite and within [0, 1], not ${String(mediumPeakOpacity)}`);
  }
  if (!Number.isInteger(placementAttemptsPerParticle) || placementAttemptsPerParticle < 0) {
    throw new RangeError(
      `placementAttemptsPerParticle must be a non-negative integer, not ${String(placementAttemptsPerParticle)}`,
    );
  }
}

function buildMedia(bodies: readonly Body[], tuning: DustTuning): DustMedium[] {
  const stars = bodies.filter((body) => body.kind === 'star');
  return stars.map((star) => {
    let extent = 0;
    for (const body of bodies) {
      if (body.kind === 'planet' && body.clientId === star.id) {
        extent = Math.max(extent, distance(star.position, body.position));
      }
    }

    // Half the distance to the nearest other Star: two media capped this way can
    // at most touch, where both have already fallen to 0.
    let cap = Number.POSITIVE_INFINITY;
    for (const other of stars) {
      if (other !== star) cap = Math.min(cap, distance(star.position, other.position) / 2);
    }

    return {
      id: star.id,
      position: star.position,
      radius: Math.min((extent + DUST_MEDIUM_MARGIN) * DUST_MEDIUM_BREADTH, cap),
      opacity: tuning.mediumPeakOpacity,
    };
  });
}

function scatterParticles(bodies: readonly Body[], tuning: DustTuning): DustParticle[] {
  const target = Math.max(0, Math.round(tuning.particlesPerBody * bodies.length));
  const random = mulberry32(DUST_SEED);

  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const { position } of bodies) {
    for (const axis of ['x', 'y', 'z'] as const) {
      min[axis] = Math.min(min[axis], position[axis] - DUST_SCATTER_PADDING);
      max[axis] = Math.max(max[axis], position[axis] + DUST_SCATTER_PADDING);
    }
  }

  const particles: DustParticle[] = [];
  const budget = target * tuning.placementAttemptsPerParticle;
  for (let attempt = 0; attempt < budget && particles.length < target; attempt += 1) {
    const candidate = {
      x: min.x + random() * (max.x - min.x),
      y: min.y + random() * (max.y - min.y),
      z: min.z + random() * (max.z - min.z),
    };
    if (bodies.every((body) => distance(body.position, candidate) >= DUST_PARTICLE_CLEARANCE)) {
      particles.push({ id: `dust:${particles.length}`, position: candidate });
    }
  }
  return particles;
}

// --- The medium's falloff ----------------------------------------------------

/**
 * The medium's radial profile: 1 at the centre (`t = 0`), 0 at and beyond the
 * edge (`t ≥ 1`), and non-increasing in between: `(1 − t²)²`, whose slope is
 * zero at the edge so the medium has no visible rim. Exported so a test can compute the
 * composite alpha at a point with the same curve the texture is built from.
 */
export function falloffAt(t: number): number {
  if (!(t < 1)) return 0;
  if (t <= 0) return 1;
  const inner = 1 - t * t;
  return inner * inner;
}

/** The medium's alpha at a point: its opacity times its falloff there. */
export function mediumAlphaAt(medium: DustMedium, point: ScenePosition): number {
  if (!(medium.radius > 0)) return 0;
  return medium.opacity * falloffAt(distance(medium.position, point) / medium.radius);
}

/**
 * The medium's texture as RGBA bytes: white RGB, alpha 255 at the centre falling
 * to 0 at the edge along `falloffAt`.
 *
 * Built here, fully, because the renderer may not loop, slice or filter — it hands
 * this array to a `dataTexture` as-is. The disc is inscribed in the square, so the
 * sprite's world radius is half its scale. The centre is at `(size − 1) / 2`, so an
 * odd size — the only kind accepted — puts one texel exactly on it.
 */
export function mediumFalloff(size: number): Uint8Array {
  if (!Number.isInteger(size) || size < 1 || size % 2 === 0) {
    // Even sizes put no texel on the centre, and at size 2 every texel sits on the
    // edge, so the whole texture is transparent.
    throw new RangeError(`a falloff texture needs a positive odd integer size, not ${String(size)}`);
  }
  const data = new Uint8Array(size * size * 4);
  const centre = (size - 1) / 2;
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      // A single texel is all centre; otherwise the edge midpoints sit at t = 1.
      const t = size === 1 ? 0 : Math.hypot(column - centre, row - centre) / centre;
      const offset = (row * size + column) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(255 * falloffAt(t));
    }
  }
  return data;
}

// --- Helpers -----------------------------------------------------------------

function distance(a: ScenePosition, b: ScenePosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Mulberry32: a tiny seeded PRNG returning floats in `[0, 1)`.
 *
 * Deterministic by construction — the same seed yields the same sequence on every
 * engine — which is the whole requirement. Not cryptographic, and nothing here
 * needs it to be.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
