/**
 * The Deep/Shallow signal (3.3), as a pure model: the Ring and the Moon a Deep
 * Planet carries, at rest and always, and the per-frame pixel floor that keeps a
 * Moon resolvable.
 *
 * **Two layered structural marks, one input** (DESIGN.md §7.2). A Planet whose
 * artifact `isDeep` is `true` carries a **Ring** — a continuous concentric
 * circle at `stroke-near`, `hairline` (0.7px), `RING_RADIUS_RATIO` × its body
 * radius — and a **Moon** — a filled dot at `stroke-active`, `MOON_RADIUS_RATIO`
 * × its body radius (never under `MOON_MIN_RADIUS_PX` on screen), centred
 * `MOON_OFFSET_RATIO` × its body radius out at the fixed billboard-local angle
 * `MOON_ANGLE`. A Shallow Planet and a Star carry neither. The Ring means the
 * Project carries a Notable, and nothing else.
 *
 * **The marks read `isDeep` and nothing else.** Never the band, the mass, the
 * subject or the navigation state — so every Deep Planet of a system shows both
 * at once, at rest, whatever the camera is doing — and never `notable` or a
 * `content` field: the derive layer classified the Project (AD-3), this draws the
 * classification. Size and brightness are not the signal: the outline a Planet
 * gets from `bodyStroke` and `bodyRadius` is the same whatever its `isDeep`.
 *
 * **Pure**: it imports the stroke model and the scene model's types, and nothing
 * else — no Three, no React, no store — so every rule here runs under
 * `node --test`, which cannot load the `.tsx` bindings (`body-field.tsx` draws the
 * Ring, `moon-field.tsx` the Moon).
 */

import { CIRCLE_SEGMENTS, bodyRadius, circlePoints, strokeColor, strokeWidthPx, type LinePoint } from './stroke-model.ts';
import { BODY_RENDER_ORDER, type Body, type ScenePosition } from './scene-model.ts';

// --- The marks (DESIGN.md `components.ring-notable`, `components.moon-notable`) ---

/** The Ring's radius, as a share of its Planet's body radius. */
export const RING_RADIUS_RATIO = 2.2;

/** The Moon's radius, as a share of its Planet's body radius. */
export const MOON_RADIUS_RATIO = 0.27;

/** The smallest radius a Moon is drawn at on screen, in CSS pixels. */
export const MOON_MIN_RADIUS_PX = 2.4;

/** How far out the Moon's centre sits, as a share of its Planet's body radius. */
export const MOON_OFFSET_RATIO = 2;

/**
 * The Moon's direction from its Planet, in the billboard's own plane, in radians
 * from screen-right toward screen-up: up-right, as in the direction-03 mock. One
 * fixed angle, so the Moon reads as one consistent mark rather than as noise.
 */
export const MOON_ANGLE = Math.PI / 12;

/**
 * The render order a Moon carries: one above `BODY_RENDER_ORDER`.
 *
 * The Moon and its Ring are coplanar in one billboard and overlap, and both are
 * in three's transparent pass. At one shared order three would sort them by
 * object depth, which can flip between the two as the camera moves, so the
 * overlap would flicker. One step above, the Moon always draws over its Ring —
 * and, since `BODY_RENDER_ORDER` is already above the Dust's, still after the Dust.
 */
export const MOON_RENDER_ORDER = BODY_RENDER_ORDER + 1;

/** Whether a Body carries the marks: a Planet the artifact classified Deep. */
function carriesMarks(body: Body): boolean {
  return body.kind === 'planet' && body.isDeep === true;
}

// --- The Ring ----------------------------------------------------------------------

/** One Ring: a key, its circle in the Planet's billboard, its colour and weight. */
export interface NotableRing {
  /** Unique per Ring in the scene: the Planet's ID, prefixed. */
  readonly id: string;
  readonly points: readonly LinePoint[];
  readonly color: string;
  readonly widthPx: number;
}

/**
 * The Ring a Body carries: one on a Deep Planet, none on anything else. A list, so
 * the binding maps rather than branches. Drawn inside the Body's billboard, so it
 * is a true circle concentric with the outline from every camera.
 */
export function notableRings(body: Body): NotableRing[] {
  if (!carriesMarks(body)) return [];
  return [
    {
      id: `ring:${body.id}`,
      points: circlePoints(CIRCLE_SEGMENTS, RING_RADIUS_RATIO * bodyRadius(body)),
      color: strokeColor('stroke-near'),
      widthPx: strokeWidthPx('hairline'),
    },
  ];
}

// --- The Moon ----------------------------------------------------------------------

/** One Moon: where its Planet is, where it sits in that Planet's billboard, its size and colour. */
export interface NotableMoon {
  /** Unique per Moon in the scene: the Planet's ID, prefixed. */
  readonly id: string;
  /** The Planet this Moon marks, by ID. */
  readonly bodyId: string;
  /** The Planet's solved position, carried through: the billboard's origin. */
  readonly position: ScenePosition;
  /** The Moon's centre in the billboard's own plane, relative to the Planet. */
  readonly center: LinePoint;
  /** The Moon's world radius before the pixel floor. */
  readonly radius: number;
  readonly color: string;
}

/**
 * Every Moon in the scene: one per Deep Planet, in the Bodies' order, none for a
 * Shallow Planet or a Star.
 */
export function notableMoons(bodies: readonly Body[]): NotableMoon[] {
  return bodies.flatMap((body): NotableMoon[] => {
    if (!carriesMarks(body)) return [];
    const radius = bodyRadius(body);
    const offset = MOON_OFFSET_RATIO * radius;
    return [
      {
        id: `moon:${body.id}`,
        bodyId: body.id,
        position: body.position,
        center: [offset * Math.cos(MOON_ANGLE), offset * Math.sin(MOON_ANGLE), 0],
        radius: MOON_RADIUS_RATIO * radius,
        color: strokeColor('stroke-active'),
      },
    ];
  });
}

/**
 * The scale a Moon's mesh takes this frame so it is never under
 * `MOON_MIN_RADIUS_PX` on screen: `max(1, floor / radius)`, where
 * `floor = MOON_MIN_RADIUS_PX · worldPerPixel` and
 * `worldPerPixel = 2·depth / (P[5] · heightPx)`.
 *
 * `view` and `projection` are three's column-major `elements` (the camera's
 * `matrixWorldInverse` and `projectionMatrix`). `depth` is the Planet's view-space
 * depth, `−(V[2]x + V[6]y + V[10]z + V[14])`, and `P[5] = 1/tan(fov/2)`, so one CSS
 * pixel spans `2·depth / (P[5]·heightPx)` world units there.
 *
 * Scale 1 — the Moon at its own radius — whenever the floor cannot be measured: the
 * Planet at or behind the camera (`depth ≤ 0`), a degenerate projection or height,
 * or any non-finite input. Applied as a mesh scale about the Moon's own centre, so
 * the centre never moves and the Moon stays on its Ring.
 */
export function moonScale(
  moon: Pick<NotableMoon, 'position' | 'radius'>,
  view: ArrayLike<number>,
  projection: ArrayLike<number>,
  heightPx: number,
): number {
  const perPixel = worldPerPixel(moon.position, view, projection, heightPx);
  if (perPixel === null) return 1;
  if (!Number.isFinite(moon.radius) || !(moon.radius > 0)) return 1;
  const scale = (MOON_MIN_RADIUS_PX * perPixel) / moon.radius;
  return Number.isFinite(scale) && scale > 1 ? scale : 1;
}

/**
 * How many world units one CSS pixel spans at `position`: `2·depth / (P[5] · heightPx)`,
 * where `depth = −(V[2]x + V[6]y + V[10]z + V[14])` is the point's view-space depth and
 * `P[5] = 1/tan(fov/2)`. `view` and `projection` are three's column-major `elements`.
 *
 * `null` whenever it cannot be measured: the point at or behind the camera
 * (`depth ≤ 0`), a degenerate projection or height, or any non-finite input. Shared
 * by the Moon's pixel floor and the Motes' screen-constant dots (3.5).
 */
export function worldPerPixel(
  position: ScenePosition,
  view: ArrayLike<number>,
  projection: ArrayLike<number>,
  heightPx: number,
): number | null {
  const { x, y, z } = position;
  const depth = -((view[2] ?? Number.NaN) * x + (view[6] ?? Number.NaN) * y + (view[10] ?? Number.NaN) * z + (view[14] ?? Number.NaN));
  const focal = projection[5] ?? Number.NaN;
  if (!Number.isFinite(depth) || !(depth > 0)) return null;
  if (!Number.isFinite(focal) || !(focal > 0)) return null;
  if (!Number.isFinite(heightPx) || !(heightPx > 0)) return null;
  const perPixel = (2 * depth) / (focal * heightPx);
  return Number.isFinite(perPixel) && perPixel > 0 ? perPixel : null;
}

/** The slice of a Moon's mesh a frame writes: a three `Mesh` satisfies it. */
export interface MoonMesh {
  readonly scale: { setScalar(scale: number): unknown };
}

/**
 * Writes a frame's scale onto a Moon's mesh. A handle not mounted yet (`null` or
 * `undefined`) is skipped, as `applyMoteDraw` skips one.
 */
export function applyMoonScale(mesh: MoonMesh | null | undefined, scale: number): void {
  if (mesh === null || mesh === undefined) return;
  mesh.scale.setScalar(scale);
}
