/**
 * The hover and keyboard-focus affordance (3.4), as a pure model: which one
 * Project is approached this frame, what its label says, where its leader and
 * label sit on screen, and how a frame's result is written onto the overlay's
 * handles.
 *
 * **One approached Project per frame.** The keyboard's — the index entry holding
 * `:focus-visible` (`keyboardProjectId`) — if any, else the pointer's — the
 * Planet under it (`hoveredProjectId`) — and never the Focused one: approaching
 * the Project already open says nothing new, so nothing is drawn and the Planet
 * stays white. A Star is never approached.
 *
 * **A leader and a label, never a shape** (DESIGN.md §7.3). The approached Planet
 * gets one straight leader — a single `M … L …` segment at `stroke-rest`,
 * `hairline-leader` (0.6px), from its screen edge to the label anchor, never
 * closed — and a two-line label: the title at `scene-label-project` in
 * `ink-lift`, and `{role} · team of {team_size} · {Deep|Shallow}` at
 * `scene-label-secondary` in `ink-label`. Its outline steps to `stroke-active`
 * (`bodyStroke`'s third argument). No ring, circle or halo around the Body; no
 * scale, fade or hue. The keyboard's approach is identical plus a 1px
 * `stroke-focus` square outline at a 3px offset around the **label block** —
 * never the Body. That outline beside a white subject Body is the one
 * sanctioned exception to "one `stroke-focus` per frame" (Thomas, 2026-10-01).
 *
 * **The 12% rule.** The label goes right of the Body by default; when its block
 * would cross the outer 12% of the frame on an axis, it re-anchors toward the
 * centre on that axis — left of the Body at the right edge, below it at the top,
 * above it at the bottom — and the anchor is then held so the whole block, at its
 * estimated size, lies inside the inner 76%, so the vignette never pulls a
 * readable label below its contrast floor. While a Project is Focused the panel's
 * edge is the right bound instead, as it is for the Motes' labels: the overlay
 * sits under the panel, and a label behind it is no label.
 *
 * **The leader starts outside the Body's marks.** From the outline on a Shallow
 * Planet; on a Deep one from beyond its Ring and Moon (3.3), so the leader never
 * cuts through the signal.
 *
 * **It reads and never derives** (AD-3). The title, role and team size are the
 * authored content the artifact carries; the depth word is the artifact's
 * `isDeep`, worded by the index's own `DEPTH_LABELS`. Nothing here classifies.
 *
 * **Pure**: it imports the tokens, the index's depth words, the panel's width,
 * the 3.3 marks' proportions, the stroke model and the scene model's types, and
 * nothing else — no Three, no React, no store — so
 * every rule runs under `node --test`, which cannot load the `.tsx` binding
 * (`affordance-field.tsx`).
 */

import { DEPTH_LABELS } from '../shell/index-model.ts';
import { panelFraction } from '../shell/panel-model.ts';
import { tokens } from '../tokens/tokens.ts';
import { MOON_MIN_RADIUS_PX, MOON_OFFSET_RATIO, MOON_RADIUS_RATIO, RING_RADIUS_RATIO } from './notable-model.ts';
import { bodyRadius, strokeColor, strokeWidthPx } from './stroke-model.ts';
import type { Body, ScenePosition } from './scene-model.ts';

// --- Tuning (DESIGN.md `components.affordance-*`) -------------------------------

/** The leader's length, in CSS pixels: `spacing.xxxl`. */
export const LEADER_PX = 56;

/** The share of the frame, on each side of each axis, a label anchor may not land in. */
export const EDGE_SHARE = 0.12;

/** The keyboard outline's width, in CSS pixels (`affordance-focus-ring.outlineWidth`). */
export const OUTLINE_PX = 1;

/** The keyboard outline's offset from the label block, in CSS pixels (`affordance-focus-ring.outlineOffset`). */
export const OUTLINE_OFFSET_PX = 3;

/**
 * A proportional glyph's estimated advance, as a share of the font size, before
 * letter spacing. Generous for Helvetica at weight 300, so an estimated block is
 * never narrower than the drawn one.
 */
export const LABEL_CHAR_EM = 0.6;

// --- The approach ----------------------------------------------------------------

/**
 * The slice of the navigation state the approach is read from, restated
 * structurally — the store's own type is the shell's — and satisfied by
 * `navigationStore.getState()` as it is.
 */
export interface ApproachState {
  readonly focusedProjectId: string | null;
  readonly hoveredProjectId: string | null;
  readonly keyboardProjectId: string | null;
}

/** The approached Project, by ID, and whether the keyboard reached it. */
export interface Approach {
  readonly id: string;
  readonly keyboard: boolean;
}

/**
 * The one approached Project this frame: `keyboardProjectId ?? hoveredProjectId`,
 * or `null` when that is the Focused Project or there is none. The keyboard wins
 * over the pointer, so at most one affordance is ever drawn.
 */
export function approachedProject(nav: ApproachState): Approach | null {
  const id = nav.keyboardProjectId ?? nav.hoveredProjectId;
  if (id === null || id === nav.focusedProjectId) return null;
  return { id, keyboard: nav.keyboardProjectId !== null };
}

/**
 * The approached Project's ID alone, or `null` — a string, so a subscriber's
 * snapshot is equal by `Object.is` from frame to frame. What `bodyStroke`'s third
 * argument takes.
 */
export function approachedId(nav: ApproachState): string | null {
  return approachedProject(nav)?.id ?? null;
}

// --- The artifact slice and the text -------------------------------------------------

/**
 * The slice of the artifact the label reads, restated structurally as
 * `SceneArtifact` is: `src/render-scene/` may not import `src/derive/`.
 */
export interface AffordanceArtifact {
  readonly clients: readonly AffordanceArtifactClient[];
}

export interface AffordanceArtifactClient {
  readonly projects: readonly AffordanceArtifactProject[];
}

export interface AffordanceArtifactProject {
  readonly id: string;
  readonly isDeep: boolean;
  readonly content: {
    readonly project: string;
    readonly role: string;
    readonly team_size: number;
  };
}

/** The label's two lines. */
export interface AffordanceText {
  readonly title: string;
  readonly secondary: string;
}

/**
 * The two lines a Project's label carries: its title, and
 * `{role} · team of {team_size} · {Deep|Shallow}` — the depth word the index's
 * own, read off `isDeep`.
 */
export function affordanceText(project: AffordanceArtifactProject): AffordanceText {
  const depth = project.isDeep ? DEPTH_LABELS.deep : DEPTH_LABELS.shallow;
  return {
    title: project.content.project,
    secondary: `${project.content.role} · team of ${String(project.content.team_size)} · ${depth}`,
  };
}

/**
 * Project `id` in the artifact.
 *
 * @throws naming the ID when no Project carries it: the approach is written only
 * from a Planet or an index entry, both built from this artifact, so a miss is a
 * bug to surface rather than a label to drop in silence.
 */
export function affordanceProject(artifact: AffordanceArtifact, id: string): AffordanceArtifactProject {
  for (const client of artifact.clients) {
    for (const project of client.projects) {
      if (project.id === id) return project;
    }
  }
  throw new Error(`the affordance needs a Project, but none carries ${JSON.stringify(id)}.`);
}

// --- Projection --------------------------------------------------------------------------

/** The canvas, in CSS pixels. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** A point on screen, in CSS pixels from the canvas's top-left, and its view depth. */
export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
}

/**
 * Where a world point lands on screen: `ndc = P·V·p`, `x = (ndc.x + 1)/2 · w`,
 * `y = (1 − ndc.y)/2 · h`. `view` and `projection` are three's column-major
 * `elements` (the camera's `matrixWorldInverse` and `projectionMatrix`).
 *
 * `null` when there is no honest answer: the point at or behind the camera
 * (view depth ≤ 0), a degenerate viewport, or any non-finite result.
 */
export function projectToScreen(
  point: ScenePosition,
  view: ArrayLike<number>,
  projection: ArrayLike<number>,
  viewport: Viewport,
): ScreenPoint | null {
  const v = (i: number) => view[i] ?? Number.NaN;
  const p = (i: number) => projection[i] ?? Number.NaN;
  const { x, y, z } = point;
  const vx = v(0) * x + v(4) * y + v(8) * z + v(12);
  const vy = v(1) * x + v(5) * y + v(9) * z + v(13);
  const vz = v(2) * x + v(6) * y + v(10) * z + v(14);
  const vw = v(3) * x + v(7) * y + v(11) * z + v(15);
  const depth = -vz;
  if (!Number.isFinite(depth) || !(depth > 0)) return null;
  if (!Number.isFinite(viewport.width) || !(viewport.width > 0)) return null;
  if (!Number.isFinite(viewport.height) || !(viewport.height > 0)) return null;
  const cx = p(0) * vx + p(4) * vy + p(8) * vz + p(12) * vw;
  const cy = p(1) * vx + p(5) * vy + p(9) * vz + p(13) * vw;
  const cw = p(3) * vx + p(7) * vy + p(11) * vz + p(15) * vw;
  const screen = { x: ((cx / cw + 1) / 2) * viewport.width, y: ((1 - cy / cw) / 2) * viewport.height, depth };
  return Number.isFinite(screen.x) && Number.isFinite(screen.y) ? screen : null;
}

/**
 * A world radius at view depth `depth`, in CSS pixels: `radius / worldPerPixel`,
 * with `worldPerPixel = 2·depth / (P[5]·heightPx)` — 3.3's formula. `0` when it
 * cannot be measured, so the leader then starts at the Body's centre.
 */
export function radiusPx(radius: number, depth: number, projection: ArrayLike<number>, heightPx: number): number {
  const focal = projection[5] ?? Number.NaN;
  const px = (radius * focal * heightPx) / (2 * depth);
  return Number.isFinite(px) && px > 0 ? px : 0;
}

/**
 * Where the leader may start, in CSS pixels from a Planet's centre, given its
 * outline's radius on screen: the outline itself on a Shallow Planet; on a Deep
 * one the farther of its Ring (`RING_RADIUS_RATIO × r`) and its Moon's far edge
 * (`MOON_OFFSET_RATIO × r` out, at its own radius or the `MOON_MIN_RADIUS_PX`
 * floor, whichever is larger) — so the leader crosses neither mark, in any
 * direction.
 */
export function markPx(planet: Pick<Body, 'isDeep'>, bodyPx: number): number {
  if (planet.isDeep !== true) return bodyPx;
  const moonFarEdge = MOON_OFFSET_RATIO * bodyPx + Math.max(MOON_RADIUS_RATIO * bodyPx, MOON_MIN_RADIUS_PX);
  return Math.max(RING_RADIUS_RATIO * bodyPx, moonFarEdge);
}

// --- Layout --------------------------------------------------------------------------------

/** A point on screen, in CSS pixels. */
export interface ScreenXY {
  readonly x: number;
  readonly y: number;
}

/** Where the leader and the label sit this frame. */
export interface AffordanceLayout {
  /** The leader's direction on each axis: `1` right/down, `-1` left/up, `0` level. */
  readonly direction: ScreenXY;
  /** The leader's start: the Body's screen edge, or beyond a Deep Planet's Ring and Moon. */
  readonly from: ScreenXY;
  /** The leader's end: the label anchor, where the label block's near edge sits. */
  readonly anchor: ScreenXY;
  /** The leader as one open SVG segment, `M x y L x y`. */
  readonly leaderPath: string;
  /** The label block's transform, placing its near edge at the anchor. */
  readonly labelTransform: string;
  /** Which way the label's lines align: toward the Body. */
  readonly textAlign: 'left' | 'right';
  /** The label block's outline: the keyboard's square, or none. */
  readonly outline: string;
}

/** The label block's estimated size on screen, in CSS pixels. */
export interface LabelBox {
  readonly width: number;
  readonly height: number;
}

/** A type role's size in pixels, letter spacing in ems, and line height, read off the tokens. */
function typeMetrics(role: 'scene-label-project' | 'scene-label-secondary') {
  const type = tokens.typography[role];
  return { fontPx: Number.parseFloat(type.fontSize), spacingEm: Number.parseFloat(type.letterSpacing), lineHeight: type.lineHeight };
}

/**
 * The label block's estimated size: each line `chars × fontPx × (LABEL_CHAR_EM +
 * letterSpacing)` wide, the block as wide as its wider line and as tall as both
 * line boxes. An estimate — the DOM is never measured — erring wide.
 */
export function labelBox(text: AffordanceText): LabelBox {
  const lines = [
    { chars: [...text.title].length, ...typeMetrics('scene-label-project') },
    { chars: [...text.secondary].length, ...typeMetrics('scene-label-secondary') },
  ];
  return {
    width: Math.max(...lines.map((line) => line.chars * line.fontPx * (LABEL_CHAR_EM + line.spacingEm))),
    height: lines.reduce((sum, line) => sum + line.fontPx * line.lineHeight, 0),
  };
}

/** The region a label block must stay inside, in CSS pixels. */
export interface LabelBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/**
 * The inner 76% of the frame — the outer `EDGE_SHARE` off each side — with the
 * right bound pulled in to the panel's edge while a Project is Focused.
 */
export function labelBounds(viewport: Viewport, focused: boolean): LabelBounds {
  const right = (1 - EDGE_SHARE) * viewport.width;
  return {
    left: EDGE_SHARE * viewport.width,
    right: focused ? Math.min(right, (1 - panelFraction(viewport.width)) * viewport.width) : right,
    top: EDGE_SHARE * viewport.height,
    bottom: (1 - EDGE_SHARE) * viewport.height,
  };
}

/** `value` held to `[low, high]`; `high` wins when they cross, so a block too big for the room stays off the panel. */
function hold(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/**
 * Where the leader and the label go for a Body centred at `screen` whose leader
 * starts `startPx` from its centre (`markPx`), for a label block of `box`.
 *
 * The default direction is `û = (1, 0)`: the label right of the Body. Its anchor
 * is `centre + (startPx + LEADER_PX)·û`; when the block would cross `bounds` on an
 * axis, `û` turns toward the centre on that axis — leftward when the block would
 * pass the right bound, downward above the top, upward below the bottom — and is
 * renormalised. The anchor is then held so the block lies inside `bounds`, which
 * moves it only for a Body in the outer band. The leader runs from
 * `centre + startPx·û` to the anchor, and the label block's near edge sits at the
 * anchor.
 */
export function affordanceLayout(
  screen: ScreenXY,
  startPx: number,
  viewport: Viewport,
  keyboard: boolean,
  box: LabelBox = { width: 0, height: 0 },
  bounds: LabelBounds = labelBounds(viewport, false),
): AffordanceLayout {
  const reach = startPx + LEADER_PX;
  const dx = screen.x + reach + box.width > bounds.right ? -1 : 1;
  const dy = screen.y < bounds.top ? 1 : screen.y > bounds.bottom ? -1 : 0;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const from = { x: screen.x + startPx * ux, y: screen.y + startPx * uy };
  // The block spans [anchor, anchor + width] rightward and [anchor − width, anchor]
  // leftward; vertically it hangs below the anchor, sits above it, or centres on it.
  const x = screen.x + reach * ux;
  const y = screen.y + reach * uy;
  const anchor = {
    x: dx < 0 ? hold(x, bounds.left + box.width, bounds.right) : hold(x, bounds.left, bounds.right - box.width),
    y:
      dy > 0
        ? hold(y, bounds.top, bounds.bottom - box.height)
        : dy < 0
          ? hold(y, bounds.top + box.height, bounds.bottom)
          : hold(y, bounds.top + box.height / 2, bounds.bottom - box.height / 2),
  };
  const shiftX = dx < 0 ? '-100%' : '0%';
  const shiftY = dy > 0 ? '0%' : dy < 0 ? '-100%' : '-50%';
  return {
    direction: { x: dx, y: dy },
    from,
    anchor,
    leaderPath: `M ${px(from.x)} ${px(from.y)} L ${px(anchor.x)} ${px(anchor.y)}`,
    labelTransform: `translate(${px(anchor.x)}px, ${px(anchor.y)}px) translate(${shiftX}, ${shiftY})`,
    textAlign: dx < 0 ? 'right' : 'left',
    outline: affordanceOutline(keyboard),
  };
}

/** A pixel coordinate, rounded to a hundredth so the written strings stay short and stable. */
function px(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * The label block's outline: for the keyboard, a `OUTLINE_PX` solid square in
 * `stroke-focus` — an outline has no radius — and `'none'` for the pointer. The
 * offset is the block's own style (`affordanceBlockStyle`).
 */
export function affordanceOutline(keyboard: boolean): string {
  return keyboard ? `${OUTLINE_PX}px solid ${strokeColor('stroke-focus')}` : 'none';
}

// --- The frame -------------------------------------------------------------------------------

/** What one frame draws: nothing, or one leader and one label. */
export type AffordanceDraw =
  | { readonly visible: false }
  | ({ readonly visible: true; readonly projectId: string } & AffordanceText & Omit<AffordanceLayout, 'direction' | 'from' | 'anchor'>);

const HIDDEN: AffordanceDraw = { visible: false };

/**
 * Whether a projected centre lies on the canvas, edges included. A Planet in front
 * of the camera but off the frame has nothing on screen to lead from, so its
 * leader and label would be drawn off the canvas or dangling from its edge.
 */
export function onFrame(screen: ScreenXY, viewport: Viewport): boolean {
  return screen.x >= 0 && screen.x <= viewport.width && screen.y >= 0 && screen.y <= viewport.height;
}

/**
 * This frame's affordance: hidden at rest, when the approached Project is the
 * Focused one, when its Planet is behind the camera, or when its projected centre
 * is off the frame; otherwise its text and layout, from the Planet's projected
 * centre, its marks' reach (`markPx`), the label's estimated box and the bounds —
 * the panel's edge on the right while a Project is Focused.
 *
 * @throws naming the ID when the approached Project has no Planet or no entry in
 * the artifact — both are built from the one artifact, so a miss is a bug.
 */
export function affordanceFrame(
  nav: ApproachState,
  artifact: AffordanceArtifact,
  bodies: readonly Body[],
  view: ArrayLike<number>,
  projection: ArrayLike<number>,
  viewport: Viewport,
): AffordanceDraw {
  const approach = approachedProject(nav);
  if (approach === null) return HIDDEN;
  const planet = bodies.find((body) => body.kind === 'planet' && body.id === approach.id);
  if (planet === undefined) throw new Error(`the affordance needs a Planet, but none carries ${JSON.stringify(approach.id)}.`);
  const text = affordanceText(affordanceProject(artifact, approach.id));
  const screen = projectToScreen(planet.position, view, projection, viewport);
  if (screen === null || !onFrame(screen, viewport)) return HIDDEN;
  const startPx = markPx(planet, radiusPx(bodyRadius(planet), screen.depth, projection, viewport.height));
  const layout = affordanceLayout(screen, startPx, viewport, approach.keyboard, labelBox(text), labelBounds(viewport, nav.focusedProjectId !== null));
  return {
    visible: true,
    projectId: approach.id,
    ...text,
    leaderPath: layout.leaderPath,
    labelTransform: layout.labelTransform,
    textAlign: layout.textAlign,
    outline: layout.outline,
  };
}

// --- The overlay's anchoring ------------------------------------------------------------------

/**
 * Where drei's `<Html fullscreen>` places the overlay: the canvas's centre, every
 * frame, whatever the camera does. A fullscreen `<Html>` offsets its content by
 * half the canvas, so this pins the content to the canvas's top-left — the origin
 * `projectToScreen` measures from. The overlay is screen-space: it follows no
 * world point.
 */
export function overlayOrigin(_object: unknown, _camera: unknown, size: Viewport): number[] {
  return [size.width / 2, size.height / 2];
}

/**
 * drei's occlusion callback, as a no-op. Given none, drei hides the overlay
 * whenever its own world anchor falls behind the camera — which says nothing
 * about the approached Planet. Whether that Planet is behind the camera is
 * `affordanceFrame`'s question, and it hides the leader and the label itself.
 */
export function keepOverlay(_hidden: boolean): void {
  // Deliberately empty: see above.
}

// --- Styles ------------------------------------------------------------------------------------

/** A `typography` role from the tokens, as inline CSS. */
function typeStyle(role: 'scene-label-project' | 'scene-label-secondary') {
  const type = tokens.typography[role];
  return {
    fontFamily: type.fontFamily,
    fontSize: type.fontSize,
    fontWeight: type.fontWeight,
    lineHeight: type.lineHeight,
    letterSpacing: type.letterSpacing,
  };
}

/** The overlay: the whole canvas, inert to the pointer, clipping nothing a leader reaches. */
export function affordanceOverlayStyle() {
  return { position: 'absolute', inset: 0, pointerEvents: 'none', userSelect: 'none' } as const;
}

/** The leader's SVG canvas: the whole overlay, unclipped. */
export function affordanceSvgStyle() {
  return { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' } as const;
}

/** The leader: `stroke-rest` at `hairline-leader`, unfilled — a line, never a shape. Hidden until placed. */
export function affordanceLeaderStyle() {
  return {
    stroke: strokeColor('stroke-rest'),
    strokeWidth: strokeWidthPx('hairline-leader'),
    fill: 'none',
    visibility: 'hidden',
  } as const;
}

/**
 * The label block: placed at the canvas's top-left and moved by its transform,
 * one line per row, hidden until placed. Its outline offset is the keyboard
 * square's; the outline itself is written per frame (`affordanceOutline`).
 */
export function affordanceBlockStyle() {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    visibility: 'hidden',
    outline: 'none',
    outlineOffset: `${OUTLINE_OFFSET_PX}px`,
  } as const;
}

/** The title line: `scene-label-project` in `ink-lift`. */
export function affordanceTitleLabelStyle() {
  return { ...typeStyle('scene-label-project'), color: tokens.colors['ink-lift-dark'], display: 'block' } as const;
}

/** The secondary line: `scene-label-secondary` in `ink-label`. */
export function affordanceSecondaryLabelStyle() {
  return { ...typeStyle('scene-label-secondary'), color: tokens.colors['ink-label-dark'], display: 'block' } as const;
}

// --- Writing a frame ---------------------------------------------------------------------------

/** The slice of the leader `<path>` a frame writes: an `SVGPathElement` satisfies it. */
export interface AffordanceLeader {
  setAttribute(name: string, value: string): void;
  readonly style: { visibility: string };
}

/** The slice of the label block a frame writes: an `HTMLElement` satisfies it. */
export interface AffordanceBlock {
  readonly style: { visibility: string; transform: string; textAlign: string; outline: string };
}

/** The slice of a label line a frame writes: an `HTMLElement` satisfies it. */
export interface AffordanceLine {
  textContent: string | null;
}

/** The overlay's handles, any of which may not be mounted yet. */
export interface AffordanceHandles {
  readonly leader: AffordanceLeader | null | undefined;
  readonly block: AffordanceBlock | null | undefined;
  readonly title: AffordanceLine | null | undefined;
  readonly secondary: AffordanceLine | null | undefined;
}

/**
 * Writes a frame's draw onto the overlay. A handle not mounted yet is skipped; a
 * hidden draw hides the leader and the block and leaves the rest as it was. Text
 * is written only when it changes, so a still approach costs no layout.
 */
export function applyAffordance(handles: AffordanceHandles, draw: AffordanceDraw): void {
  const { leader, block, title, secondary } = handles;
  const visibility = draw.visible ? 'visible' : 'hidden';
  if (leader !== null && leader !== undefined) {
    leader.style.visibility = visibility;
    if (draw.visible) leader.setAttribute('d', draw.leaderPath);
  }
  if (block !== null && block !== undefined) {
    block.style.visibility = visibility;
    if (draw.visible) {
      block.style.transform = draw.labelTransform;
      block.style.textAlign = draw.textAlign;
      block.style.outline = draw.outline;
    }
  }
  if (!draw.visible) return;
  if (title !== null && title !== undefined && title.textContent !== draw.title) title.textContent = draw.title;
  if (secondary !== null && secondary !== undefined && secondary.textContent !== draw.secondary) secondary.textContent = draw.secondary;
}
