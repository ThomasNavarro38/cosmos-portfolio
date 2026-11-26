/**
 * The Client names on the Stars (9.3), as a pure model: one label per Client
 * Star, what it says, where it sits on screen, which ink it wears, when it is
 * hidden, and how a frame's result is written onto the overlay's handles.
 *
 * **One label per Star, in every session.** The name is the artifact's
 * `clients[].name`, published as-is (FR-11): no transform, as the Fallback
 * chart's `.chart-label-client` sets it. The label is DOM over the canvas, so it
 * is the same at First Paint, once realism has arrived and after realism fails.
 * A Star never carries a second label: the affordance's Project label is a
 * Planet's, and a Star is never approached.
 *
 * **Below the Star, centred on it.** The block's top is the Star's projected
 * centre plus its outline's radius on screen (`radiusPx(bodyRadius(star), …)`)
 * plus `CLIENT_LABEL_GAP_PX`. Its box is estimated, never measured from the DOM:
 * each code point `fontPx × (advance + letterSpacing)` wide, the advance
 * `CLIENT_LABEL_CAPITAL_EM` for a capital or digit and `LABEL_CHAR_EM`
 * otherwise, and `fontPx × lineHeight` tall, in `scene-label-client`, grown by
 * `PLATE_PAD_PX` on every side for the plate.
 *
 * **Hidden, never faded or moved** (Thomas, 2026-11-18, Q3 reading (a)). A name
 * whose box leaves `labelBounds` — the inner 76% of the frame, the outer
 * `EDGE_SHARE` off every side, with the panel's edge as the right bound while a
 * Project is Focused — is hidden, so every name shown is readable at its floor.
 * So is a name whose Star is behind the camera, a name whose box meets
 * another Body's disc (a Deep Planet's reaching its Ring and its Moon, as
 * `markPx` measures them), a name whose box meets the affordance's block or
 * leader (the affordance wins), and a name whose box meets a stronger name: the
 * subject's first, then the nearer Star, then artifact order. There is no cap:
 * there are fewer Stars than the Motes' 12.
 *
 * **The ink tells subject from receded, and nothing else does** (Q1, Q2). The
 * subject's name — `sceneSubject`'s Star — is `ink-lift`; every other name is
 * `ink-prose` (raised from `ink-label` by Thomas's 2026-11-26 ruling, so a receded name
 * keeps 4.5:1 inside its own Star's glow, not only on the page ground). Both in
 * `scene-label-client`. While a Project is Focused the
 * subject is a Planet, so no name is lifted.
 *
 * **The halo is the contrast ground.** Each name carries `CLIENT_LABEL_HALO`,
 * stacked `text-shadow`s of the opaque `surface-base` page ground, each at most
 * 2px wide, with no box. The ground at every glyph's edge is therefore the page
 * ground, or very near it, whatever the scene draws behind, and the flat-token
 * audit is read on that ground. It replaced the opaque 7.9 plate (Thomas,
 * 2026-11-23), whose hard dark box cut through the Stars' glow; a wider feather
 * was tried and dropped (2026-11-25): it still laid a dark smudge in the glow.
 * The estimated box, padding included, is still what the hides measure.
 *
 * **The Motes' labels yield to a shown name.** `sceneLabelObstacles` is the
 * affordance's obstacles plus every shown name's box, read from the same
 * placement rule `clientLabelFrame` draws by; it is what `mote-field.tsx` hands
 * the Mote pass (AD-20 as amended 2026-11-18). Each binding reads its own
 * `getState()`, and the affordance re-picks the pointer between them, so a hover
 * that changes this frame can leave the Motes judged against the names of the
 * state before it: a one-frame trail, the one `mote-field.tsx` already accepts
 * for the affordance's own boxes.
 *
 * **Pure**: it imports the tokens, the affordance model (projection, bounds,
 * plate padding, a Body's marks, its obstacles), the Mote label's token parser
 * and clearance, the stroke model
 * (the subject and the Star's radius) and the scene and Rail models' types —
 * no Three, no React, no store — so every rule runs under `node --test`, which
 * cannot load the `.tsx` binding (`client-label-field.tsx`).
 */

import { tokens } from '../tokens/tokens.ts';
import {
  LABEL_CHAR_EM,
  PLATE_PAD_PX,
  affordanceObstacles,
  labelBounds,
  markPx,
  projectToScreen,
  radiusPx,
  type AffordanceArtifact,
  type ApproachState,
  type ScreenRect,
  type Viewport,
} from './affordance-model.ts';
import { MOTE_LABEL_CLEARANCE_PX, cssNumber } from './mote-label.ts';
import type { Rail } from './rail-model.ts';
import type { Body } from './scene-model.ts';
import { bodyRadius, sceneSubject, type SubjectState } from './stroke-model.ts';

// --- Tuning ------------------------------------------------------------------------

/** The gap between a Star's outline on screen and the top of its name's plate, in CSS pixels. Tunable. */
export const CLIENT_LABEL_GAP_PX = 8;

/** The name's type: `scene-label-client` (12px, 300, 0.22em). */
export const CLIENT_LABEL_TYPE = tokens.typography['scene-label-client'];

/** The name's font size, in CSS pixels, read off the token. */
export const CLIENT_LABEL_FONT_PX = cssNumber(CLIENT_LABEL_TYPE.fontSize, 'px');

/** The name's letter spacing, in ems, read off the token. */
export const CLIENT_LABEL_SPACING_EM = cssNumber(CLIENT_LABEL_TYPE.letterSpacing, 'em');

/**
 * The estimated advance of one capital or digit, in ems, before the tracking.
 * Wider than `LABEL_CHAR_EM` (0.6, a sans face's mean), because Client names
 * run to capitals (`SIMSU`, `SNCF`) and a capital's advance exceeds the mean:
 * the estimate must err wide, or a shown plate could cross the bounds or meet a
 * neighbour that the box test cleared. Tunable.
 */
export const CLIENT_LABEL_CAPITAL_EM = 0.72;

/** The least gap a shown name keeps from the affordance and from another shown name, in CSS pixels: the Motes' clearance. */
export const CLIENT_LABEL_CLEARANCE_PX = MOTE_LABEL_CLEARANCE_PX;

/** The subject's name: `ink-lift`. */
export const CLIENT_LABEL_SUBJECT_INK = tokens.colors['ink-lift-dark'];

/**
 * Every receded name: `ink-prose`, 9.9:1 on the page ground. It was `ink-label` (Q1), which
 * the halo held to 4.5:1 only at the glyph edge in a near Star's glow (Thomas, 2026-11-26).
 */
export const CLIENT_LABEL_RECEDED_INK = tokens.colors['ink-prose-dark'];

// --- The artifact slice and the pool -------------------------------------------------

/**
 * The slice of the artifact the names read, restated structurally as
 * `SceneArtifact` is: `src/render-scene/` may not import `src/derive/`.
 */
export interface ClientLabelArtifact {
  readonly clients: readonly ClientLabelArtifactClient[];
}

export interface ClientLabelArtifactClient {
  readonly id: string;
  readonly name: string;
}

/** One label: its Client's ID (its Star's) and the name it shows. */
export interface ClientLabel {
  readonly id: string;
  readonly name: string;
}

/** The pool: one label per Client, in artifact order. The binding mounts one plate per entry. */
export function clientLabels(artifact: ClientLabelArtifact): ClientLabel[] {
  return artifact.clients.map((client) => {
    // A blank name would mount an empty box that Mote labels yield to for nothing.
    if (client.name.trim() === '') throw new Error(`a Client name must not be blank, but ${JSON.stringify(client.id)}'s is.`);
    return { id: client.id, name: client.name };
  });
}

// --- The box --------------------------------------------------------------------------

/** A label's estimated size on screen, plate included, in CSS pixels. */
export interface ClientLabelSize {
  readonly width: number;
  readonly height: number;
}

/**
 * A name's estimated plate: each code point `fontPx × (advance + letterSpacing)`
 * wide, the advance `CLIENT_LABEL_CAPITAL_EM` for a capital or digit and
 * `LABEL_CHAR_EM` otherwise, and `fontPx × lineHeight` tall, each grown by
 * `2 × PLATE_PAD_PX`. An astral character is one advance. An estimate, erring wide.
 */
export function clientLabelSize(name: string): ClientLabelSize {
  const advances = [...name].reduce((sum, char) => sum + (/[\p{Lu}\p{Nd}]/u.test(char) ? CLIENT_LABEL_CAPITAL_EM : LABEL_CHAR_EM), 0);
  return {
    width: CLIENT_LABEL_FONT_PX * (advances + [...name].length * CLIENT_LABEL_SPACING_EM) + 2 * PLATE_PAD_PX,
    height: CLIENT_LABEL_FONT_PX * CLIENT_LABEL_TYPE.lineHeight + 2 * PLATE_PAD_PX,
  };
}

/**
 * Whether two rectangles come within `CLIENT_LABEL_CLEARANCE_PX` of each other.
 * A rectangle with a non-finite side is ignored, as the Mote label pass ignores
 * such an obstacle, rather than hiding every name by a NaN comparison.
 */
function meets(a: ScreenRect, b: ScreenRect): boolean {
  if (![a.left, a.right, a.top, a.bottom, b.left, b.right, b.top, b.bottom].every(Number.isFinite)) return false;
  const gap = CLIENT_LABEL_CLEARANCE_PX;
  return !(a.left >= b.right + gap || b.left >= a.right + gap || a.top >= b.bottom + gap || b.top >= a.bottom + gap);
}

/** A Body's disc on screen: its projected centre and the radius its marks reach. */
interface Disc {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/**
 * Whether `box` covers any part of `disc`: the box's nearest point to the
 * centre lies inside the radius. A plate tangent to a disc covers nothing.
 */
function coversDisc(box: ScreenRect, disc: Disc): boolean {
  const nearestX = Math.max(box.left, Math.min(disc.x, box.right));
  const nearestY = Math.max(box.top, Math.min(disc.y, box.bottom));
  return Math.hypot(nearestX - disc.x, nearestY - disc.y) < disc.r;
}

/** Whether `box` lies inside `bounds` on all four sides, every side finite. */
function inside(box: ScreenRect, bounds: ScreenRect): boolean {
  return (
    [box.left, box.right, box.top, box.bottom].every(Number.isFinite) &&
    box.left >= bounds.left &&
    box.right <= bounds.right &&
    box.top >= bounds.top &&
    box.bottom <= bounds.bottom
  );
}

// --- The frame --------------------------------------------------------------------------

/** The slice of the navigation state the names read: the subject's and the approach's. */
export type ClientLabelState = SubjectState & ApproachState;

/** What one frame draws for one label, in pool order. */
export type ClientLabelDraw =
  | { readonly id: string; readonly visible: false }
  | {
      readonly id: string;
      readonly visible: true;
      /** The plate's rectangle on screen, as `transform` places it. */
      readonly box: ScreenRect;
      /** Places the plate's top edge at `box`'s and centres the real plate on its Star (`translateX(-50%)`), so a width estimate's error never moves it off-centre. */
      readonly transform: string;
      /** `CLIENT_LABEL_SUBJECT_INK` for the subject, `CLIENT_LABEL_RECEDED_INK` otherwise. */
      readonly color: string;
    };

/** A pixel coordinate, rounded to a hundredth so the written strings stay short and stable. */
function px(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** One label placed, before the collision pass. */
interface Placed {
  readonly index: number;
  readonly id: string;
  readonly subject: boolean;
  readonly depth: number;
  readonly box: ScreenRect;
}

/**
 * The one placement `clientLabelFrame` (what is drawn) and `sceneLabelObstacles`
 * (what the Motes yield to) both compute, each from its own binding's
 * `getState()` read: the draws in pool order, and the
 * affordance's obstacles they were judged against.
 *
 * @throws naming the ID when a Client has no Star: both are built from the one
 * artifact, so a miss is a bug to surface rather than a name to drop in silence.
 */
function clientLabelPlacement(
  nav: ClientLabelState,
  artifact: ClientLabelArtifact & AffordanceArtifact,
  bodies: readonly Body[],
  rail: Rail,
  view: ArrayLike<number>,
  projection: ArrayLike<number>,
  viewport: Viewport,
): { readonly draws: ClientLabelDraw[]; readonly affordance: ScreenRect[] } {
  const subject = sceneSubject(nav, rail);
  const bounds = labelBounds(viewport, nav.focusedProjectId !== null);
  const affordance = affordanceObstacles(nav, artifact, bodies, view, projection, viewport);
  const labels = clientLabels(artifact);
  // The name is DOM over the canvas, at any depth, and its halo darkens whatever it lies on, so it yields to every other Body's disc (Thomas, 2026-11-18).
  const discs = bodies.flatMap((body): Disc[] => {
    const screen = projectToScreen(body.position, view, projection, viewport);
    if (screen === null) return [];
    return [{ id: body.id, x: screen.x, y: screen.y, r: markPx(body, radiusPx(bodyRadius(body), screen.depth, projection, viewport.height)) }];
  });
  const placed: Placed[] = [];
  labels.forEach((label, index) => {
    const star = bodies.find((body) => body.kind === 'star' && body.id === label.id);
    if (star === undefined) throw new Error(`a Client name needs a Star, but none carries ${JSON.stringify(label.id)}.`);
    const screen = projectToScreen(star.position, view, projection, viewport);
    if (screen === null) return;
    const size = clientLabelSize(label.name);
    const top = screen.y + radiusPx(bodyRadius(star), screen.depth, projection, viewport.height) + CLIENT_LABEL_GAP_PX;
    const left = screen.x - size.width / 2;
    const box = { left, right: left + size.width, top, bottom: top + size.height };
    if (!inside(box, bounds)) return;
    if (discs.some((disc) => disc.id !== star.id && coversDisc(box, disc))) return;
    if (affordance.some((obstacle) => meets(box, obstacle))) return;
    placed.push({ index, id: label.id, subject: label.id === subject, depth: screen.depth, box });
  });
  // The stronger name wins: the subject's, then the nearer Star's, then artifact order.
  const strongest = [...placed].sort((a, b) => Number(b.subject) - Number(a.subject) || a.depth - b.depth || a.index - b.index);
  const shown = new Map<number, Placed>();
  for (const label of strongest) {
    if ([...shown.values()].some((other) => meets(label.box, other.box))) continue;
    shown.set(label.index, label);
  }
  const draws = labels.map((label, index): ClientLabelDraw => {
    const draw = shown.get(index);
    if (draw === undefined) return { id: label.id, visible: false };
    return {
      id: label.id,
      visible: true,
      box: draw.box,
      transform: `translate(${px((draw.box.left + draw.box.right) / 2)}px, ${px(draw.box.top)}px) translateX(-50%)`,
      color: draw.subject ? CLIENT_LABEL_SUBJECT_INK : CLIENT_LABEL_RECEDED_INK,
    };
  });
  return { draws, affordance };
}

/**
 * This frame's names, one draw per `clientLabels(artifact)` entry in its order:
 * each hidden behind the camera, outside `labelBounds`, over another Body's
 * disc, over the affordance or under a stronger name; otherwise placed below its
 * Star in its ink.
 *
 * @throws naming the ID when a Client has no Star, and as `affordanceObstacles`
 * does.
 */
export function clientLabelFrame(
  nav: ClientLabelState,
  artifact: ClientLabelArtifact & AffordanceArtifact,
  bodies: readonly Body[],
  rail: Rail,
  view: ArrayLike<number>,
  projection: ArrayLike<number>,
  viewport: Viewport,
): ClientLabelDraw[] {
  return clientLabelPlacement(nav, artifact, bodies, rail, view, projection, viewport).draws;
}

/**
 * What the Motes' labels yield to this frame: the affordance's rectangles
 * (`affordanceObstacles`) followed by every shown Client name's plate, from the
 * placement `clientLabelFrame` draws.
 *
 * @throws as `clientLabelFrame` does.
 */
export function sceneLabelObstacles(
  nav: ClientLabelState,
  artifact: ClientLabelArtifact & AffordanceArtifact,
  bodies: readonly Body[],
  rail: Rail,
  view: ArrayLike<number>,
  projection: ArrayLike<number>,
  viewport: Viewport,
): ScreenRect[] {
  const { draws, affordance } = clientLabelPlacement(nav, artifact, bodies, rail, view, projection, viewport);
  return [...affordance, ...draws.flatMap((draw) => (draw.visible ? [draw.box] : []))];
}

// --- Styles --------------------------------------------------------------------------------

/** The overlay: the whole canvas, inert to the pointer. */
export function clientLabelOverlayStyle() {
  return { position: 'absolute', inset: 0, pointerEvents: 'none', userSelect: 'none' } as const;
}

/**
 * The name's ground: stacked, unoffset `text-shadow`s of the opaque page ground,
 * kept tight. They lay the page ground right under every glyph's edge, where its
 * contrast is read, and stop there: any wider layer shows as a dark smudge
 * through a Star's glow. Tunable, within 2px.
 */
export const CLIENT_LABEL_HALO = [1, 2].map((blur) => `0 0 ${blur}px ${tokens.colors['surface-base-dark']}`).join(', ');

/**
 * A name's plate: placed at the canvas's top-left and moved by its transform,
 * on one line, hidden until placed, in `scene-label-client` and the receded ink
 * until a frame writes its own. No box: its ground is `CLIENT_LABEL_HALO`, and
 * its `PLATE_PAD_PX` padding keeps the estimated box the one the model places.
 */
export function clientLabelPlateStyle() {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: `${PLATE_PAD_PX}px`,
    textShadow: CLIENT_LABEL_HALO,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    visibility: 'hidden',
    fontFamily: CLIENT_LABEL_TYPE.fontFamily,
    fontSize: CLIENT_LABEL_TYPE.fontSize,
    fontWeight: CLIENT_LABEL_TYPE.fontWeight,
    lineHeight: CLIENT_LABEL_TYPE.lineHeight,
    letterSpacing: CLIENT_LABEL_TYPE.letterSpacing,
    color: CLIENT_LABEL_RECEDED_INK,
  } as const;
}

// --- Writing a frame ---------------------------------------------------------------------

/** The slice of a plate a frame writes: an `HTMLElement` satisfies it. */
export interface ClientLabelHandle {
  readonly style: { visibility: string; transform: string; color: string };
}

/**
 * Writes a frame's draws onto the plates, draw `i` onto handle `i`. A handle not
 * mounted yet is skipped; a hidden draw hides its plate and leaves the rest as
 * it was.
 */
export function applyClientLabels(handles: readonly (ClientLabelHandle | null | undefined)[], draws: readonly ClientLabelDraw[]): void {
  draws.forEach((draw, index) => {
    const handle = handles[index];
    if (handle === null || handle === undefined) return;
    handle.style.visibility = draw.visible ? 'visible' : 'hidden';
    if (!draw.visible) return;
    handle.style.transform = draw.transform;
    handle.style.color = draw.color;
  });
}
