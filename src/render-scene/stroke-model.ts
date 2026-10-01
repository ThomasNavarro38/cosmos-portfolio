/**
 * The stroke ladder applied to the scene (3.2), as a pure model: which token and
 * which weight every Body outline, orbit and the Rail is drawn in, which one
 * subject per frame is white, and the line geometry those strokes are drawn on.
 *
 * **Strokes encode distance and state, never category** (DESIGN.md §2). A
 * Planet at rest takes its `luminanceBand` — the token the derive layer resolved
 * from recency, confined to the resting band `stroke-dust` … `stroke-near` — and
 * a Star at rest takes `stroke-rest`. `stroke-focus` is a camera-state overlay
 * spent on **one** subject per frame (`sceneSubject`): the Focused Planet if any,
 * else the free-flight target, else on the Rail the Star the camera is heading
 * for. Nothing else is ever white, and `stroke-active` is not a Body's at 3.2
 * (hover is 3.4's).
 *
 * **Every line takes a `stroke-*-dark` token and a `components.stroke-weight`
 * weight; no glyph is drawn here.** Glyphs take the ink ladder, and the two never
 * borrow each other's tokens — `scene-model.test.ts` scans for both directions.
 *
 * **It reads and never derives** (AD-3). The band arrives on the Body; the orbit
 * plane arrives as the artifact's `orbitNormal`; the subject is read from the
 * navigation state and the Rail's keyframes. Nothing here classifies a Project or
 * reads a `content` field.
 *
 * **Pure**, like every model in this directory: it imports the generated tokens,
 * the Rail model and the scene model's types, and nothing else — no Three, no
 * React, no store — so every ladder rule runs under `node --test`, which cannot
 * load the `.tsx` binding (`body-field.tsx`).
 */

import { tokens } from '../tokens/tokens.ts';
import { railStopCount, type Rail } from './rail-model.ts';
import type { Body, ScenePosition } from './scene-model.ts';

// --- The ladder -----------------------------------------------------------------

/** The five stroke steps, faintest first (DESIGN.md §2). */
export const STROKE_STEPS = ['stroke-dust', 'stroke-rest', 'stroke-near', 'stroke-active', 'stroke-focus'] as const;

/** One stroke step. */
export type StrokeStep = (typeof STROKE_STEPS)[number];

/**
 * The resting band a Planet's `luminanceBand` may name: `stroke-dust` …
 * `stroke-near`. The two brighter steps are camera state, never data.
 */
export const RESTING_STEPS: readonly StrokeStep[] = ['stroke-dust', 'stroke-rest', 'stroke-near'];

/** A weight key of `components.stroke-weight`. */
export type StrokeWeightKey = keyof (typeof tokens)['components']['stroke-weight'];

/**
 * A `components.stroke-weight` value in CSS pixels, parsed from the generated
 * token (`'0.7px'` → `0.7`).
 *
 * The tokens carry weights as CSS strings (3.1 deferred the parse here). A value
 * that is not exactly `<n>px` throws naming the key: a weight read as `NaN`
 * would draw a line of no width, silently.
 */
export function strokeWidthPx(
  key: string,
  weights: Readonly<Record<string, string>> = tokens.components['stroke-weight'],
): number {
  const value = Object.hasOwn(weights, key) ? weights[key] : undefined;
  const match = value === undefined ? null : /^(\d+(?:\.\d+)?)px$/.exec(value);
  const px = match === null ? Number.NaN : Number(match[1]);
  if (!Number.isFinite(px) || px <= 0) {
    throw new Error(
      `the stroke weight ${JSON.stringify(key)} is ${JSON.stringify(value)}; ` +
        'a scene line needs a components.stroke-weight value of the form <n>px.',
    );
  }
  return px;
}

/** The shipped (dark) colour of a stroke step, from the generated tokens. */
export function strokeColor(step: StrokeStep): string {
  return tokens.colors[`${step}-dark`];
}

/** How one Body outline is drawn: its step, that step's colour, and its weight. */
export interface BodyStroke {
  readonly step: StrokeStep;
  readonly color: string;
  readonly widthPx: number;
}

// --- The subject ----------------------------------------------------------------

/**
 * The slice of the navigation state the subject is read from. Restated
 * structurally — the store's own type is the shell's — and satisfied by
 * `navigationStore.getState()` as it is.
 */
export interface SubjectState {
  /**
   * The store's two modes, restated as a literal union (this module may not
   * import the shell's types), so a misspelt mode fails the type check rather
   * than reading as the Rail.
   */
  readonly mode: 'rail' | 'freeflight';
  readonly flightTarget: string | null;
  readonly scrollProgress: number;
  readonly focusedProjectId: string | null;
}

/**
 * The one Body that may be white this frame, by ID, or `null`.
 *
 *   1. **The Focused Planet**, whatever the mode — Focus is drawn over both.
 *   2. Else, **in free flight, the `flightTarget` Star**; the overview
 *      (`flightTarget: null`) has no subject, and nothing is white.
 *   3. Else, **on the Rail, the Star the camera is heading for**: keyframe
 *      `clamp(⌈scrollProgress⌉, 1, N)`. The opening frame (progress 0) is heading
 *      for the first stop, and between stops `k − 1` and `k` the camera is
 *      heading for `k`. A non-finite progress reads as 0. A Rail of no stops has
 *      no subject.
 *
 * At most one ID, by construction: the return type cannot name two.
 */
export function sceneSubject(nav: SubjectState, rail: Rail): string | null {
  if (nav.focusedProjectId !== null) return nav.focusedProjectId;
  if (nav.mode === 'freeflight') return nav.flightTarget;
  const stops = railStopCount(rail);
  if (stops === 0) return null;
  const progress = Number.isFinite(nav.scrollProgress) ? nav.scrollProgress : 0;
  const keyframe = rail.keyframes[Math.min(Math.max(Math.ceil(progress), 1), stops)];
  return keyframe?.subject ?? null;
}

/**
 * How a Body's outline is drawn, given this frame's subject.
 *
 *   - **The subject**: `stroke-focus`, at `body-client` (0.9px) on a Star and
 *     `body-focus` (1.0px) on a Planet.
 *   - **A Star at rest**: `stroke-rest`, `hairline`.
 *   - **A Planet at rest**: its own `luminanceBand`, `hairline`. A recent Shallow
 *     Planet at `stroke-near` stays there; it never reaches white unfocused.
 *
 * A Planet whose band is not a resting step throws naming it: drawing an unknown
 * band as some default would be a mapping rule nobody derived, and drawing
 * `stroke-active` or `stroke-focus` at rest would spend the frame's subject.
 */
export function bodyStroke(body: Body, subjectId: string | null): BodyStroke {
  if (body.id === subjectId) {
    return {
      step: 'stroke-focus',
      color: strokeColor('stroke-focus'),
      widthPx: strokeWidthPx(body.kind === 'star' ? 'body-client' : 'body-focus'),
    };
  }
  if (body.kind === 'star') {
    return { step: 'stroke-rest', color: strokeColor('stroke-rest'), widthPx: strokeWidthPx('hairline') };
  }
  const band = RESTING_STEPS.find((step) => step === body.luminanceBand);
  if (band === undefined) {
    throw new Error(
      `${body.id} carries the band ${JSON.stringify(body.luminanceBand)}; ` +
        'a resting Planet is drawn at stroke-dust, stroke-rest or stroke-near only.',
    );
  }
  return { step: band, color: strokeColor(band), widthPx: strokeWidthPx('hairline') };
}

// --- Geometry -------------------------------------------------------------------

/** A line vertex, as drei's `Line` takes its `points`. */
export type LinePoint = readonly [number, number, number];

/** The radius a Star's outline is drawn at, in scene units. A Star carries no mass. */
export const STAR_RADIUS = 1;

/** The radius a Planet's outline is drawn at — visibly smaller than a Star. */
export const PLANET_RADIUS = 0.45;

/** A Star's core dot, as a share of its radius (DESIGN.md `star-client.coreRadiusRatio`). */
export const CORE_RADIUS_RATIO = 0.15;

/** Segments per Body outline circle. */
export const CIRCLE_SEGMENTS = 64;

/** Segments per orbit ellipse. */
export const ORBIT_SEGMENTS = 128;

/**
 * A Body's outline radius. Discriminates on `kind`, never on a missing mass: a
 * Planet arriving without mass must not render Star-sized in silence.
 */
export function bodyRadius(body: Body): number {
  return body.kind === 'star' ? STAR_RADIUS : PLANET_RADIUS;
}

/**
 * A closed circle of `radius` in the local `xy` plane, `segments + 1` points with
 * the first repeated last. Drawn inside a camera-facing billboard, so a Body is
 * always a true circle on screen — never an ellipse, which is an orbit's shape.
 *
 * @throws if `segments` is not a whole number of at least 3.
 */
export function circlePoints(segments: number, radius = 1): LinePoint[] {
  requireSegments(segments);
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = (2 * Math.PI * (i % segments)) / segments;
    return [radius * Math.cos(angle), radius * Math.sin(angle), 0] as const;
  });
}

/** A Star's filled core dot: a key, its radius and its colour, which is the outline's. */
export interface CoreDot {
  /** Unique per dot in the scene: the Body's ID, suffixed. */
  readonly id: string;
  readonly radius: number;
  readonly color: string;
}

/**
 * The core dot a Body carries: one on a Star, at `CORE_RADIUS_RATIO` of its
 * radius in its own outline's colour (so the subject's core is white), and none
 * on a Planet. A list, so the binding maps rather than branches.
 */
export function coreDots(body: Body, subjectId: string | null): CoreDot[] {
  if (body.kind !== 'star') return [];
  return [{ id: `core:${body.id}`, radius: bodyRadius(body) * CORE_RADIUS_RATIO, color: bodyStroke(body, subjectId).color }];
}

/**
 * A Planet's orbit around its Star: the circle through the Planet, centred on the
 * Star, in the plane the artifact solved (`orbitNormal`) — `segments + 1` points,
 * closed, starting at the Planet. Seen at an angle it is an ellipse, which is the
 * only reason an ellipse exists in this system.
 *
 * The basis is `e1` toward the Planet and `e2 = n × e1`, so the Planet lies on
 * the orbit by construction and the plane is the solved one, not a guess from
 * two positions.
 *
 * @throws naming the Planet if it carries no orbit plane, if it sits on its Star,
 * or if the plane does not contain it (a normal not perpendicular to the offset).
 */
export function orbitPoints(planet: Body, star: Body, segments: number): LinePoint[] {
  requireSegments(segments);
  const normal = planet.orbitNormal;
  if (normal === undefined) throw new Error(`${planet.id} carries no orbit plane, so its orbit cannot be drawn.`);
  // Checked before any arithmetic: an infinite component makes the length
  // infinite, which passes a `> 0` test and then divides every vertex into NaN.
  if (![normal.x, normal.y, normal.z].every(Number.isFinite)) {
    throw new Error(`${planet.id} has a non-finite orbit normal; there is no plane to draw its orbit in.`);
  }
  const offset = {
    x: planet.position.x - star.position.x,
    y: planet.position.y - star.position.y,
    z: planet.position.z - star.position.z,
  };
  const radius = Math.hypot(offset.x, offset.y, offset.z);
  const length = Math.hypot(normal.x, normal.y, normal.z);
  if (!(radius > 0) || !(length > 0)) {
    throw new Error(`${planet.id} sits on its Star or has a null orbit normal; there is no orbit to draw.`);
  }
  const e1 = { x: offset.x / radius, y: offset.y / radius, z: offset.z / radius };
  const n = { x: normal.x / length, y: normal.y / length, z: normal.z / length };
  if (Math.abs(e1.x * n.x + e1.y * n.y + e1.z * n.z) > ORBIT_PLANE_TOLERANCE) {
    throw new Error(`${planet.id} does not lie in its own orbit plane; the artifact disagrees with itself.`);
  }
  const e2 = { x: n.y * e1.z - n.z * e1.y, y: n.z * e1.x - n.x * e1.z, z: n.x * e1.y - n.y * e1.x };
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = (2 * Math.PI * (i % segments)) / segments;
    const c = radius * Math.cos(angle);
    const s = radius * Math.sin(angle);
    return [
      star.position.x + c * e1.x + s * e2.x,
      star.position.y + c * e1.y + s * e2.y,
      star.position.z + c * e1.z + s * e2.z,
    ] as const;
  });
}

/**
 * How far from perpendicular (as a cosine) a Planet's offset may be to its orbit
 * normal and still be drawn.
 *
 * **The gate's own value, mirrored.** `src/derive/artifact-schema.ts` rejects an
 * artifact whose Planet strays further than its `ORBIT_PLANE_TOLERANCE` from its
 * plane; this directory may not import `src/derive/`, so the number is restated
 * here, and `stroke-model.test.ts` reads the schema's literal as text and pins the
 * two equal. One value means every artifact the gate accepts is one this draws,
 * and nothing it would refuse to draw got past the gate. Both come from rounding
 * every component to the solve's four places, which keeps the cosine under about
 * `5e-5` on the committed artifact.
 */
export const ORBIT_PLANE_TOLERANCE = 1e-3;

/** One drawn hairline: an ID to key it by, its vertices, its colour and weight. */
export interface SceneLine {
  readonly id: string;
  readonly points: readonly LinePoint[];
  readonly color: string;
  readonly widthPx: number;
}

/**
 * Every hairline the scene draws that is not a Body outline: one orbit per
 * Planet at `stroke-rest` (no graded orbit weight), and the Rail at `stroke-dust`
 * when it has a line to draw. Both at `hairline` (0.7px).
 *
 * A Planet's Star is found by its `clientId`; a Planet whose Star is absent
 * throws naming it, rather than drawing an orbit around nothing.
 */
export function sceneLines(bodies: readonly Body[], railPoints: readonly ScenePosition[]): SceneLine[] {
  const hairline = strokeWidthPx('hairline');
  const orbits = bodies.flatMap((planet): SceneLine[] => {
    if (planet.kind !== 'planet') return [];
    const star = bodies.find((body) => body.kind === 'star' && body.id === planet.clientId);
    if (star === undefined) throw new Error(`${planet.id} orbits ${String(planet.clientId)}, which is not a Star here.`);
    return [
      { id: `orbit:${planet.id}`, points: orbitPoints(planet, star, ORBIT_SEGMENTS), color: strokeColor('stroke-rest'), widthPx: hairline },
    ];
  });
  const rail: SceneLine[] =
    railPoints.length < 2
      ? []
      : [
          {
            id: 'rail',
            points: railPoints.map((point) => [point.x, point.y, point.z] as const),
            color: strokeColor('stroke-dust'),
            widthPx: hairline,
          },
        ];
  return [...orbits, ...rail];
}

// --- The vignette ----------------------------------------------------------------

/** The vignette's inner and outer stops (DESIGN.md `components.vignette`). */
export const VIGNETTE_INNER_STOP = 42;
export const VIGNETTE_INNER_OPACITY = 0;
export const VIGNETTE_OUTER_OPACITY = 0.9;

/** The full-frame vignette overlay's inline style. */
export interface VignetteStyle {
  readonly position: 'absolute';
  readonly inset: number;
  readonly pointerEvents: 'none';
  readonly background: string;
}

/**
 * The vignette: a radial gradient of `vignette-dark` over the whole frame, 0
 * opacity inside 42% of the radius rising to 0.9 at the edge (DESIGN.md §5).
 *
 * Written with `color-mix` against `transparent`, so the colour is the token and
 * the opacity a percentage — no `rgb(`, `hsl(` or `#` in this file, and the
 * literal-colour gate stays meaningful. Inert to the pointer: the canvas beneath
 * keeps every click.
 */
export function vignetteStyle(): VignetteStyle {
  const ground = tokens.colors['vignette-dark'];
  const mix = (opacity: number) => `color-mix(in srgb, ${ground} ${Math.round(opacity * 100)}%, transparent)`;
  return {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background:
      `radial-gradient(ellipse farthest-corner at 50% 50%, ` +
      `${mix(VIGNETTE_INNER_OPACITY)} ${VIGNETTE_INNER_STOP}%, ${mix(VIGNETTE_OUTER_OPACITY)} 100%)`,
  };
}

// --- Guards -----------------------------------------------------------------------

function requireSegments(segments: number): void {
  if (!Number.isInteger(segments) || segments < 3) {
    throw new Error(`a drawn circle needs a whole number of at least 3 segments, not ${String(segments)}.`);
  }
}
