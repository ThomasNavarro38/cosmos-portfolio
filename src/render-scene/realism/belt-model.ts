/**
 * The orbits' debris belts, as numbers (9.6, AD-19 and AD-20 as amended): where each
 * Planet's belt lies, how wide it is, how bright its band makes it, and how its density
 * breaks it up. Pure, so every rule here runs under `node --test`. It imports types,
 * `stroke-model.ts`'s own `orbitPoints` and `ORBIT_SEGMENTS`, so a belt lies exactly where
 * the hairline it replaces lies: centred on its Star, in the solved `orbitNormal` plane,
 * and `PLANET_RADIUS` with `fill-model.ts`'s `FILL_RADIUS_RATIO`, the fill's own radius.
 *
 * **A belt is a flat annulus,** one indexed triangle strip per Planet from `1 - w` to
 * `1 + w` of the orbit's radius about its Star, `w` being `BELT_HALF_WIDTH_RATIO`. Every
 * belt goes into one geometry, so all of them are one draw (AD-23 as amended).
 *
 * **Recency is in the band (FR-3).** A belt's peak linear luminance is its Planet's own
 * `luminanceBand` token's, `BELT_BAND_LUMINANCE`, restated and pinned against the tokens
 * by test: a `stroke-rest` belt peaks at the M2 orbit's level, a `stroke-near` one at
 * `stroke-near-dark`'s (about 0.061), so the order is the ladder's by construction and
 * every belt stays far under `stroke-active`. The hue is `realism-belt`'s, the same for
 * every belt, divided by its own luminance (`beltColor`), so it encodes nothing.
 *
 * **One draw for all belts** (AD-23's ratified 2026-11-17 row, "1 for all debris belts
 * together (one merged mesh)"), counted by `addedDraws` and held at `BELT_DRAWS_BUDGET`.
 *
 * **Not Dust.** No particles and no motion: the alpha is a static profile across the band
 * times a static, continuous density (`BELT_DENSITY_FLOOR` to 1), with no threshold, so no
 * specks. The noise's cells along the orbit wrap modulo `BELT_NOISE_CELLS.along`, so the
 * belt is seamless where its orbit closes.
 *
 * **It meets its Planet softly.** The fill writes depth as a flat, camera-facing disc
 * through its Planet's centre, so a depth test alone would cut the belt in a straight line
 * where its plane meets the disc's. Over the disc's footprint the alpha fades to 0 over
 * the last `BELT_JUNCTION_SOFTNESS` before whichever the fragment meets first, its
 * Planet's sphere or the disc's plane (`beltJunction`), so nothing visible is depth-cut,
 * and the near side still passes over its Planet. The one edge left is the footprint's,
 * on the Planet's silhouette, where the belt passes behind its outline.
 *
 * All the width, density, noise and junction-softness values are starting values for 9.11.
 */

import type { RealismArtifact } from '../realism-status.ts';
import type { Body } from '../scene-model.ts';
import { ORBIT_SEGMENTS, orbitPoints, PLANET_RADIUS } from '../stroke-model.ts';
import { FILL_RADIUS_RATIO } from './fill-model.ts';

/** A belt's half-width, as a share of its orbit's radius. */
export const BELT_HALF_WIDTH_RATIO = 0.08;

/** The bands a belt may carry: `RESTING_BANDS`, dimmest first, restated structurally. */
export type BeltBand = 'stroke-rest' | 'stroke-near';

/**
 * Each band's peak linear luminance: `stroke-rest-dark`'s and `stroke-near-dark`'s own,
 * restated so this module imports no value; a test pins both against the tokens.
 */
export const BELT_BAND_LUMINANCE: Readonly<Record<BeltBand, number>> = {
  'stroke-rest': 0.025758532508684023,
  'stroke-near': 0.06071511131056438,
};

/** The least the density thins a belt to, as a share of its profile: so a belt is broken up, never cut. */
export const BELT_DENSITY_FLOOR = 0.35;

/**
 * The density noise's cells: whole numbers along the orbit, so the noise wraps where the
 * orbit closes, and across the band. A finer second octave takes twice each.
 */
export const BELT_NOISE_CELLS = { along: 48, across: 3 } as const;

/** How far before its Planet's sphere or fill disc a belt fades to nothing, in world units. */
export const BELT_JUNCTION_SOFTNESS = 0.2;

/** The sphere the belt fades against: the fill's own radius, so it meets the depth the fill writes. */
export const BELT_JUNCTION_RADIUS = FILL_RADIUS_RATIO * PLANET_RADIUS;

interface Point {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** One Planet's belt: everything the layer builds its strip from. */
export interface BeltPlan {
  readonly id: string;
  readonly band: BeltBand;
  /** Its Star's position: the centre the strip widens about. */
  readonly centre: Point;
  /** Its Planet's position: the sphere and the fill disc it fades against. */
  readonly planet: Point;
  /** Its orbit, as `orbitPoints` draws it: `ORBIT_SEGMENTS + 1` points, closed. */
  readonly points: readonly (readonly [number, number, number])[];
}

/** The geometry's arrays, for every belt in one draw. */
export interface BeltArrays {
  /** Three per vertex. */
  readonly positions: Float32Array;
  /** Two per vertex: along the orbit in `[0, 1]`, and across the band in `[-1, 1]`, inner to outer. */
  readonly belt: Float32Array;
  /** One per vertex: its belt's band luminance. */
  readonly luminance: Float32Array;
  /** Three per vertex: its belt's Planet's centre. */
  readonly planet: Float32Array;
  readonly index: Uint16Array | Uint32Array;
}

const isFinitePoint = (point: Point | undefined | null): boolean => point !== undefined && point !== null && [point.x, point.y, point.z].every(Number.isFinite);

const isBand = (band: unknown): band is BeltBand => typeof band === 'string' && Object.hasOwn(BELT_BAND_LUMINANCE, band);

/**
 * One plan per Planet, in the artifact's order, on its own Star's orbit.
 *
 * @throws naming the Planet on a band that is missing or not a resting band, an orbit
 * normal that is missing or not finite, a position that is not finite (naming the Star
 * too when it is the Star's), a `clientId` that is not its Client's, and as `orbitPoints`
 * does on a Planet off its own plane or at its Star: each would draw a belt of the wrong
 * brightness, or of NaN, in silence.
 */
export function beltPlans(artifact: RealismArtifact): BeltPlan[] {
  return artifact.clients.flatMap((client) =>
    client.projects.map((project) => {
      const { id, luminanceBand, orbitNormal } = project;
      if (project.clientId !== client.id) throw new Error(`${id} names ${String(project.clientId)}, not its Client ${client.id}`);
      if (!isFinitePoint(project.position)) throw new Error(`${id} has no usable position: ${JSON.stringify(project.position)}`);
      if (!isFinitePoint(client.position)) throw new Error(`${id} orbits ${client.id}, which has no usable position: ${JSON.stringify(client.position)}`);
      if (!isBand(luminanceBand)) throw new Error(`${id} has no usable band: ${String(luminanceBand)}`);
      const normal = orbitNormal as Point | undefined;
      if (normal === undefined || normal === null || ![normal.x, normal.y, normal.z].every(Number.isFinite)) {
        throw new Error(`${id} has no usable orbit normal: ${JSON.stringify(normal)}`);
      }
      const planet: Body = { id, kind: 'planet', position: project.position, orbitNormal: normal };
      const star: Body = { id: client.id, kind: 'star', position: client.position };
      return { id, band: luminanceBand, centre: client.position, planet: project.position, points: orbitPoints(planet, star, ORBIT_SEGMENTS) };
    }),
  );
}

/**
 * Every plan's strip in one set of arrays: an inner and an outer vertex per orbit point,
 * at `1 - w` and `1 + w` of its radius about the centre, and two triangles per segment.
 */
export function beltArrays(plans: readonly BeltPlan[]): BeltArrays {
  const vertices = plans.reduce((sum, plan) => sum + 2 * plan.points.length, 0);
  const triangles = plans.reduce((sum, plan) => sum + 2 * Math.max(plan.points.length - 1, 0), 0);
  const positions = new Float32Array(3 * vertices);
  const belt = new Float32Array(2 * vertices);
  const luminance = new Float32Array(vertices);
  const planets = new Float32Array(3 * vertices);
  const index = vertices > 65_535 ? new Uint32Array(3 * triangles) : new Uint16Array(3 * triangles);
  let vertex = 0;
  let at = 0;
  for (const { band, centre, planet, points } of plans) {
    const first = vertex;
    const last = points.length - 1;
    points.forEach(([x, y, z], i) => {
      for (const side of [-1, 1]) {
        const k = 1 + side * BELT_HALF_WIDTH_RATIO;
        positions.set([centre.x + (x - centre.x) * k, centre.y + (y - centre.y) * k, centre.z + (z - centre.z) * k], 3 * vertex);
        belt.set([last > 0 ? i / last : 0, side], 2 * vertex);
        luminance[vertex] = BELT_BAND_LUMINANCE[band];
        planets.set([planet.x, planet.y, planet.z], 3 * vertex);
        vertex += 1;
      }
      if (i > 0) {
        const a = first + 2 * (i - 1);
        index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], at);
        at += 6;
      }
    });
  }
  return { positions, belt, luminance, planet: planets, index };
}

/**
 * A belt's colour, as the shader computes it: the token's linear colour divided by its own
 * linear luminance, then times the band's luminance, each channel clamped to 1.
 *
 * @throws on a channel that is negative or not finite, which no token decodes to, and on a
 * colour whose own luminance is not above 0, which has no hue to normalise.
 */
export function beltColor(linearRgb: readonly [number, number, number], luminance: number): [number, number, number] {
  const [r, g, b] = linearRgb;
  if (![r, g, b].every((channel) => Number.isFinite(channel) && channel >= 0)) throw new Error(`the belt colour has an unusable channel: ${String(linearRgb)}`);
  const own = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (!(own > 0)) throw new Error(`the belt colour has no usable luminance: ${own}`);
  return [Math.min((r / own) * luminance, 1), Math.min((g / own) * luminance, 1), Math.min((b / own) * luminance, 1)];
}

/** A belt fragment's alpha, as the shader computes it: `(1 - t²)²` across, times the density at noise `n`, times the fade. */
export function beltAlpha(across: number, noise: number, fade: number): number {
  const t = Math.min(Math.max(across, -1), 1);
  const profile = (1 - t * t) ** 2;
  const density = BELT_DENSITY_FLOOR + (1 - BELT_DENSITY_FLOOR) * Math.min(Math.max(noise, 0), 1);
  return profile * density * fade;
}

/**
 * The junction factor, as the shader computes it, in view space (the camera at the origin,
 * looking down -z): `view` is the fragment, `centre` its Planet's. 1 off the fill disc's
 * footprint, where the ray from the camera through the fragment meets the disc's plane
 * outside `BELT_JUNCTION_RADIUS`. Over it, a `smoothstep` from 0 to `BELT_JUNCTION_SOFTNESS`
 * of the gap, along the ray, before the nearer of the disc's plane and the sphere's front
 * surface, the sphere counting only when the ray meets it in front of the camera. Over the
 * footprint the plane's hit lies within the radius of the centre, so the sphere's front hit
 * always comes first: the plane governs only with the camera inside the sphere. 1, never
 * NaN, for a fragment at or behind the camera, or a Planet the ray never reaches.
 */
export function beltJunction(view: Point, centre: Point): number {
  const r = BELT_JUNCTION_RADIUS;
  if (!(view.z < 0 && centre.z < 0)) return 1;
  const scale = centre.z / view.z;
  const qx = view.x * scale - centre.x;
  const qy = view.y * scale - centre.y;
  if (qx * qx + qy * qy >= r * r) return 1;
  const length = Math.hypot(view.x, view.y, view.z);
  let gap = ((view.z - centre.z) * length) / -view.z;
  const [dx, dy, dz] = [view.x / length, view.y / length, view.z / length];
  const k = centre.x * dx + centre.y * dy + centre.z * dz;
  const [px, py, pz] = [centre.x - k * dx, centre.y - k * dy, centre.z - k * dz];
  const h = r * r - (px * px + py * py + pz * pz);
  if (h > 0 && k - Math.sqrt(h) > 0) gap = Math.min(gap, k - Math.sqrt(h) - length);
  const t = Math.min(Math.max(gap / BELT_JUNCTION_SOFTNESS, 0), 1);
  return t * t * (3 - 2 * t);
}
