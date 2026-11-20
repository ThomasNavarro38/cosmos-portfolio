/**
 * A Deep Planet's ring disc and moon sphere, as numbers (9.8, AD-19 and AD-23 as amended,
 * DESIGN.md §7.2): which Planets carry them, where they sit, how large they are, how the
 * disc is tilted and banded and how the moon is lit. Pure, so every rule here runs under
 * `node --test`. It imports `notable-model.ts`'s own placement, so the disc and the moon lie
 * exactly where the M2 Ring and Moon they replace lie, and the Client-name hide rule and the
 * leader's `markPx`, which read those marks, stay correct unchanged.
 *
 * **One input, `isDeep`.** A Planet carries a disc and a moon if and only if its artifact
 * `isDeep` is `true`; a Shallow Planet or a Star carries neither. No plan reads the band,
 * the mass, the subject, `appearance` or `content`, so the signal uses no size or
 * brightness: every Deep Planet's disc and moon are the same, apart from where they stand
 * and which way their light comes from (FR-9).
 *
 * **The disc** is one annulus from `RING_DISC_INNER_RATIO` × the body radius out to the
 * Ring's radius, one geometry every disc shares. Each frame it takes the camera's facing
 * turned by `RING_DISC_TILT` about its local x, so it reads as one constant ellipse from
 * every pose. The tilt is pinned so its inner minor half-axis, `cos(tilt) × inner`, lies
 * beyond the fill's radius: its own fill can never cross it, so never hides it. It is grey,
 * `RING_DISC_LUMINANCE` (`stroke-near-dark`'s, the Ring's rung, restated and pinned against
 * the token), and its alpha is an edge `smoothstep` at both radial edges times a static
 * radial value noise in `[RING_DISC_BAND_FLOOR, 1]`, times `RING_DISC_OPACITY`, times the
 * layer's fade (`ringDiscAlpha`): continuous, with no threshold and no discard.
 *
 * **The moon** is the layer's shared sphere, flattened in the marks' plane as a fill is,
 * at the M2 Moon's centre and radius, and Lambert-lit from its Planet's own light
 * direction (toward its Star): `MOON_ALBEDO_LUMINANCE × max(N·L, 0) + MOON_FLOOR_LUMINANCE`
 * (`moonLuminance`), grey, so it is achromatic by construction and far under the ceiling.
 * Its scale each frame is `moonScale`'s, so it is never under `MOON_MIN_RADIUS_PX`.
 *
 * **Two draws per Deep Project** (AD-23's ratified 2026-11-17 row), counted by `addedDraws`
 * and held at `DEEP_PROJECT_DRAWS_BUDGET`: the moon's share is 1.
 *
 * All the band, edge and opacity values are starting values for 9.11.
 */

import { MOON_RADIUS_RATIO, notableMoons, RING_RADIUS_RATIO } from '../notable-model.ts';
import type { RealismArtifact } from '../realism-status.ts';
import type { LinePoint } from '../stroke-model.ts';
import { PLANET_RADIUS } from '../stroke-model.ts';
import { type Direction, FILL_TARGET_LUMINANCE, lightDirection } from './fill-model.ts';

/** The disc's inner edge, as a share of the body radius. */
export const RING_DISC_INNER_RATIO = 1.35;

/** The disc's inner and outer radii in scene units: every Planet has the same body radius, so every disc shares one annulus. */
export const RING_DISC_INNER = RING_DISC_INNER_RATIO * PLANET_RADIUS;
export const RING_DISC_OUTER = RING_RADIUS_RATIO * PLANET_RADIUS;

/** The tilt off the camera's facing, about its local x, in radians: `cos(tilt) × inner` stays beyond the fill's radius. */
export const RING_DISC_TILT = 0.7;

/** The annulus's segments around. One radial segment: the radius is computed per fragment. */
export const RING_DISC_SEGMENTS = 96;

/** `stroke-near-dark`'s linear relative luminance, the Ring's rung: restated so this module imports no value, and pinned against the token by test. */
export const RING_DISC_LUMINANCE = 0.06071511131056438;

/** The disc's peak alpha: semi-transparent. */
export const RING_DISC_OPACITY = 0.6;

/** The least the bands thin the disc to, as a share of its alpha: so the disc is banded, never cut. */
export const RING_DISC_BAND_FLOOR = 0.55;

/** The band noise's cells across the disc's width, from inner to outer edge: few, since the band is only a few pixels across at a Client stop, so the bands never alias into shimmer as the camera moves. */
export const RING_DISC_BAND_CELLS = 6;

/** The width of each edge's `smoothstep`, as a share of the disc's width. */
export const RING_DISC_EDGE = 0.08;

/** The least a disc's projected minor half-axis may be on screen at a Client stop at 1080p, in CSS pixels: readable at client-stop distance. */
export const RING_DISC_MIN_PX = 3;

/** The least the disc's visible band may be across, along its minor axis (outer edge minus inner edge), at a Client stop at 1080p, in CSS pixels. */
export const RING_DISC_MIN_BAND_PX = 2;

/** The moon's albedo, fully lit: a Planet's own lit mean, `FILL_TARGET_LUMINANCE`. */
export const MOON_ALBEDO_LUMINANCE = FILL_TARGET_LUMINANCE;

/** `realism-ambient-floor-dark`'s linear relative luminance, the moon's unlit floor: restated, and pinned against the token by test. */
export const MOON_FLOOR_LUMINANCE = 0.008071214661391535;

/** The moon's radius in scene units, before the pixel floor: the M2 Moon's. */
export const MOON_RADIUS = MOON_RADIUS_RATIO * PLANET_RADIUS;

interface Point {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** One Deep Planet's disc and moon: everything the layer builds them from. */
export interface RingPlan {
  /** The Planet's ID. */
  readonly id: string;
  /** The Planet's solved position: the disc's centre and the billboard's origin. */
  readonly position: Point;
  /** The moon's centre in the billboard's own plane, relative to the Planet: the M2 Moon's. */
  readonly center: LinePoint;
  /** The moon's radius before the pixel floor: the M2 Moon's. */
  readonly radius: number;
  /** The world-space unit vector from the Planet to its Star, which lights the moon. */
  readonly light: Direction;
}

const isFinitePoint = (point: Point | undefined | null): point is Point =>
  point !== undefined && point !== null && [point.x, point.y, point.z].every((value) => typeof value === 'number' && Number.isFinite(value));

/**
 * One plan per Deep Planet, in the artifact's order, lit by its own Star. A Shallow Planet
 * has none. Nothing but `isDeep`, the positions and the `clientId` is read.
 *
 * @throws naming the Project on a Deep Planet whose position is not finite, whose `clientId`
 * names no Client, whose Star's position is not finite, or which stands at its Star: each
 * would draw a disc or a moon of NaN in silence.
 */
export function ringPlans(artifact: RealismArtifact): RingPlan[] {
  const stars = new Map(artifact.clients.map((client) => [client.id, client.position]));
  return artifact.clients.flatMap((client) =>
    client.projects.flatMap((project): RingPlan[] => {
      if (project.isDeep !== true) return [];
      const { id, position } = project;
      if (!isFinitePoint(position)) throw new Error(`${id} has no usable position: ${JSON.stringify(position)}`);
      const star = stars.get(project.clientId);
      if (star === undefined) throw new Error(`${id} names no Client: ${String(project.clientId)}`);
      if (!isFinitePoint(star)) throw new Error(`${id} orbits ${project.clientId}, which has no usable position: ${JSON.stringify(star)}`);
      let light: Direction;
      try {
        light = lightDirection(position, star);
      } catch {
        throw new Error(`${id} has no light direction: it stands at its Star ${project.clientId}`);
      }
      const [moon] = notableMoons([{ id, kind: 'planet', position, isDeep: project.isDeep }]);
      if (moon === undefined) throw new Error(`${id} carries no Moon`);
      return [{ id, position, center: moon.center, radius: moon.radius, light }];
    }),
  );
}

/** The band noise's floor-to-1 value at noise `n` in `[0, 1]`: `mix(RING_DISC_BAND_FLOOR, 1, n)`. */
export function ringDiscBands(noise: number): number {
  return RING_DISC_BAND_FLOOR + (1 - RING_DISC_BAND_FLOOR) * Math.min(Math.max(noise, 0), 1);
}

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * A disc fragment's alpha, as the shader computes it, at radial `r` (0 at the inner edge,
 * 1 at the outer): the edges' `smoothstep` times the bands at noise `n`, times
 * `RING_DISC_OPACITY`, times the fade.
 */
export function ringDiscAlpha(r: number, noise = 1, fade = 1): number {
  const t = Math.min(Math.max(r, 0), 1);
  const edge = smoothstep(0, RING_DISC_EDGE, t) * smoothstep(0, RING_DISC_EDGE, 1 - t);
  return edge * ringDiscBands(noise) * RING_DISC_OPACITY * fade;
}

/** A moon fragment's luminance, as the shader computes it, at `cosine` = N·L: `MOON_ALBEDO_LUMINANCE × max(cosine, 0) + MOON_FLOOR_LUMINANCE`. */
export function moonLuminance(cosine: number): number {
  return MOON_ALBEDO_LUMINANCE * Math.max(cosine, 0) + MOON_FLOOR_LUMINANCE;
}
