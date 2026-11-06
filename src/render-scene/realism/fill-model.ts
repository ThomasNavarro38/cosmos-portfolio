/**
 * A Planet's fill, as numbers (7.6): how large it is, where its light comes from,
 * and how its map turns. Pure, with types as its only imports, so every rule here
 * runs under `node --test`, and `reduced` arrives as an argument: nothing in this
 * directory names the visitor's preference.
 *
 * **The light never moves.** One world-space unit vector from a Planet to its own
 * Star, from solved positions, computed once per layer. Spin moves the map. No
 * Body shadows another.
 *
 * **Colour encodes nothing.** Rendezvous hashing picks the map from the ID, so
 * `appearance.meanLuminance` describes a map, not a Project, and it is the one
 * brightness read from the artifact. Lit and dark sides follow solved positions,
 * which is composition and not a data mapping (AD-3, AD-20).
 */

import type { RealismArtifact } from '../realism-status.ts';

/**
 * The fill's radius as a share of the outline's. Below 1, so the outline is never
 * the fill's edge. The final value of the recheck in
 * `realism-fills-7-6.md`; 7.9 may lower it.
 */
export const FILL_RADIUS_RATIO = 0.995;

/** The shared sphere. Flattened, its silhouette is 2 × 32 segments of a meridian: the outline's own 64-gon. */
export const FILL_SPHERE_WIDTH_SEGMENTS = 64;
export const FILL_SPHERE_HEIGHT_SEGMENTS = 32;

/** `gl_Position.z += 1e-6 * gl_Position.w`: the depth spike's value, held only for a disc flattened to z = 0 (7.1). */
export const FILL_CLIP_OFFSET = 1e-6;

/**
 * No fragment's luminance passes this at rest: `stroke-active-dark`'s linear
 * relative luminance, which a test pins against the token, since this module
 * imports no value.
 */
export const FILL_CEILING_LUMINANCE = 0.4711868614730459;

/**
 * At this share of the ceiling and above, a pixel is floored to its 8-bit step, so
 * that the output's rounding cannot read back above the ceiling.
 */
export const FILL_NEAR_CEILING = 0.98;

/** What a map's mean is normalised to, fully lit. A starting value for Epic 8. */
export const FILL_TARGET_LUMINANCE = 0.18;

/** One draw per Planet, two per Star (7.7), and none for Dust. */
const DRAWS_PER_PLANET = 1;
const DRAWS_PER_STAR = 2;

interface Point {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type Direction = readonly [number, number, number];

/** One Planet's fill: everything the layer builds it from. */
export interface FillPlan {
  readonly id: string;
  readonly position: Point;
  readonly map: string;
  readonly meanLuminance: number;
  readonly tilt: number;
  readonly spinRate: number;
  readonly spinPhase: number;
  readonly light: Direction;
}

/**
 * The world-space unit vector from a Planet to its Star.
 *
 * @throws on a zero or non-finite vector: a Planet at its Star has no direction.
 */
export function lightDirection(planet: Point, star: Point): Direction {
  const x = star.x - planet.x;
  const y = star.y - planet.y;
  const z = star.z - planet.z;
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length === 0) throw new Error(`no direction from (${planet.x}, ${planet.y}, ${planet.z}) to (${star.x}, ${star.y}, ${star.z})`);
  return [x / length, y / length, z / length];
}

/**
 * One plan per Planet, in the artifact's order, lit by its own Star.
 *
 * @throws on a Project whose `clientId` names no Client, a Planet at its Star, a
 * mean luminance the shader could not divide by, or a non-finite tilt, spin rate or
 * spin phase, each of which would draw a surface of NaN in silence.
 */
export function fillPlans(artifact: RealismArtifact): FillPlan[] {
  const stars = new Map(artifact.clients.map((client) => [client.id, client.position]));
  return artifact.clients.flatMap((client) =>
    client.projects.map((project) => {
      const star = stars.get(project.clientId);
      if (star === undefined) throw new Error(`${project.id} names no Client: ${project.clientId}`);
      const { appearance } = project;
      const meanLuminance = appearance.meanLuminance;
      if (!(meanLuminance > 0) || !Number.isFinite(meanLuminance)) throw new Error(`${project.id} has no usable mean luminance: ${meanLuminance}`);
      for (const field of ['tilt', 'spinRate', 'spinPhase'] as const) {
        if (!Number.isFinite(appearance[field])) throw new Error(`${project.id} has no usable ${field}: ${appearance[field]}`);
      }
      return {
        id: project.id,
        position: project.position,
        map: appearance.map,
        meanLuminance,
        tilt: appearance.tilt,
        spinRate: appearance.spinRate,
        spinPhase: appearance.spinPhase,
        light: lightDirection(project.position, star),
      };
    }),
  );
}

/**
 * Each distinct map the plans wear, with its image, in first-worn order.
 *
 * @throws on a map that is not among the images.
 */
export function fillMaps<Image>(plans: readonly FillPlan[], images: ReadonlyMap<string, Image>): Map<string, Image> {
  const found = new Map<string, Image>();
  for (const { id, map } of plans) {
    const image = images.get(map);
    if (image === undefined) throw new Error(`${id} wears ${map}, which is not among the images`);
    found.set(map, image);
  }
  return found;
}

/** The spin clock after one frame. It holds while `reduced` is true, and resumes from there. */
export function nextSpinSeconds(seconds: number, delta: number, reduced: boolean): number {
  return reduced ? seconds : seconds + delta;
}

/** The map's angle about its axis, in radians. */
export function spinAngle(phase: number, rate: number, seconds: number): number {
  return phase + rate * seconds;
}

/**
 * From a world-space normal to the map's own axes: the inverse of a spin about the
 * map's pole followed by a tilt about the world's horizontal. Column-major, as a
 * `mat3` takes it. The tilt is about world `x` and not the camera's horizontal: a
 * surface that re-leaned with the camera would slide as the camera moved.
 */
export function mapFromWorld(tilt: number, angle: number): readonly [number, number, number, number, number, number, number, number, number] {
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);
  const cosSpin = Math.cos(angle);
  const sinSpin = Math.sin(angle);
  return [cosSpin, 0, sinSpin, sinTilt * sinSpin, cosTilt, -sinTilt * cosSpin, -cosTilt * sinSpin, sinTilt, cosTilt * cosSpin];
}

/** The draws realism adds to a scene of this many Planets and Stars. */
export function addedDraws(planets: number, stars: number): number {
  return planets * DRAWS_PER_PLANET + stars * DRAWS_PER_STAR;
}
