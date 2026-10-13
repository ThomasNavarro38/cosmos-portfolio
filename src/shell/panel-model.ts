/**
 * The Focus panel as a pure model: what it shows, in what order, how wide it
 * is, how it opens and closes, and where DOM focus goes when Focus changes.
 *
 * **Every rule an acceptance criterion names lives here**, for the reason
 * `index-model.ts` gives: `node --test` cannot load a `.tsx` file in any
 * position, so `focus-panel.tsx` is kept a mapping thin enough that reading it
 * suffices, and a scan in `panel-model.test.ts` fails if it grows a rule.
 *
 * **The panel sits beside the scene, never over it** (UX-DR20, DESIGN.md §The
 * two zones). It is a fixed column on the right at
 * `min(PANEL_MAX_PX, PANEL_FRACTION × width)`; the canvas keeps its width and
 * the camera composes the focused Project into the part the column leaves free
 * (`src/render-scene/focus-model.ts` reads `panelFraction` for exactly that).
 * There is no scrim, no dim, no backdrop and no modal: the style below is the
 * whole of what the panel paints.
 *
 * **It reads and never derives** (AD-3). Deep/Shallow arrives as `isDeep`; the
 * reading position branches on that and never on whether `notable` happens to
 * be present — `entities.ts` is the one classifier, and a second one here is
 * the divergence AD-3 exists to prevent.
 *
 * **A → B cross-fades** (2.8, UX-DR31). Moving Focus from one Project to
 * another keeps the panel open, so its content changes in place: the outgoing
 * Project's blocks fade out in a layer over the incoming ones as they fade in,
 * over `FOCUS_SECONDS` on the Focus curve — the duration the camera moves and
 * the Motes condense in, so the three surfaces are one transition. `crossFade`
 * names the outgoing Project, and only for `A → B`; entry and release slide the
 * panel instead. The outgoing layer is `aria-hidden` and `inert` and carries no
 * `id`, so the accessibility tree, the tab order and the title's label see only
 * the incoming Project, and DOM focus moves exactly as `focusMove` says.
 *
 * **Pure.** No React, no DOM, no store, no artifact import: the document
 * arrives as an argument and the element IDs leave as strings.
 */

import { FOCUS_SECONDS, advanceSlide, flipSlide, focusEasingCss, settledSlide, type FocusSlide } from './focus-motion.ts';

/** The panel's widest, in CSS pixels (DESIGN.md: 560px on desktop). */
export const PANEL_MAX_PX = 560;

/** The panel's share of the viewport width once 560px is more than that share (DESIGN.md: 46%). */
export const PANEL_FRACTION = 0.46;

/**
 * The panel's padding, shared by the column and the outgoing layer so their
 * content aligns. A custom property, because the value steps at 1200px
 * (DESIGN.md §4: 56/56/60; below it the sides are `clamp(16px, 5vw, 40px)`,
 * 40px down to a 16px phone floor) and only a stylesheet
 * can hold a media query: `focus-panel.css` defines it on the panel.
 */
export const PANEL_PADDING = 'var(--panel-padding)';

/** The panel element's `id`: where the wheel handler scrolls and where DOM focus lands on entry. */
export const FOCUS_PANEL_ID = 'focus-panel';

/** The panel title's `id`: the `<h2>` whose text labels the panel container. */
export const FOCUS_PANEL_TITLE_ID = 'focus-panel-title';

/** The release button's text. DESIGN.md §7.6a: the word, not an icon, not "close". */
export const RELEASE_LABEL = 'release';

/** The field table's row labels, in order. No `Skills` row: the Dust is the display (FR-10). */
export const FIELD_LABELS = { role: 'Role', team: 'Team', built: 'Built' } as const;

/**
 * The panel's width in pixels for a given width: `min(PANEL_MAX_PX, PANEL_FRACTION × width)`.
 *
 * A width that is not a positive finite number yields 0 — no panel to leave
 * room for — rather than a `NaN` that would reach the camera.
 */
export function panelWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0;
  return Math.min(PANEL_MAX_PX, PANEL_FRACTION * width);
}

/**
 * The share of `width` the panel covers: `w = panelWidth(width) / width`, in
 * `[0, PANEL_FRACTION]`. The camera centres the Project at NDC `x = −w`, the
 * middle of the free region `[−1, 1 − 2w]`.
 */
export function panelFraction(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0;
  return panelWidth(width) / width;
}

/** The same width, as CSS, so the column the DOM draws is the column the camera leaves free. */
export function panelWidthCss(): string {
  return `min(${PANEL_MAX_PX}px, ${PANEL_FRACTION * 100}vw)`;
}

/**
 * The `id` of a Project's entry in the DOM destination index, so DOM focus can
 * return to the released Project's own entry (UX-DR40).
 *
 * The entity ID verbatim after a fixed prefix — an ID the artifact minted is
 * already unique and whitespace-free, and a re-slugified one would be a second
 * identity derivation. The prefix keeps it from colliding with any other `id`
 * in the document.
 */
export function indexEntryId(projectId: string): string {
  return `index-entry:${projectId}`;
}

/** The slice of the artifact the panel reads, restated structurally (`src/shell/` may not import `src/derive/`). */
export interface PanelArtifact {
  readonly clients: readonly PanelArtifactClient[];
}

export interface PanelArtifactClient {
  readonly id: string;
  readonly name: string;
  readonly projects: readonly PanelArtifactProject[];
}

export interface PanelArtifactProject {
  readonly id: string;
  readonly isDeep: boolean;
  readonly content: {
    readonly project: string;
    readonly company: string | null;
    readonly role: string;
    readonly team_size: number;
    readonly built: string;
    readonly notable?: string | null;
    readonly skills: readonly string[];
  };
}

/** One row of the field table. */
export interface PanelField {
  readonly label: string;
  readonly value: string;
}

/**
 * The Shallow Project's reading position (DESIGN.md §7.8): one line in the
 * author's voice, worded identically on every Shallow Project — a convention
 * repeated is a convention; a convention reworded is a defence.
 */
export const EDITORIAL_RULE = 'Entries carry a written argument only where there was an argument to have.';

/**
 * The marks around a Notable's constraint sentence, and its paragraph break. The
 * schema that gates them is `src/data/schema.ts` (`LIFT_OPEN`, `LIFT_CLOSE`,
 * `PARAGRAPH_BREAK`); `src/shell/` may not import it, so they are restated here,
 * a test holds them equal to the schema's source, and the committed-artifact
 * test re-marks the runs and compares them with the authored prose.
 */
export const LIFT_OPEN = '[[';
export const LIFT_CLOSE = ']]';
export const PARAGRAPH_BREAK = /\n\s*\n/;

/** A stretch of one Notable paragraph; the `lifted` one is the constraint sentence (DESIGN.md §7.7). */
export interface PanelRun {
  readonly text: string;
  readonly lifted: boolean;
}

/**
 * What the reading position holds: the Notable on a Deep Project, the editorial
 * rule line on a Shallow one. One slot, two contents — the Shallow panel is the
 * Deep panel with a different final block, never the Deep panel minus one.
 */
export type PanelReading =
  | { readonly kind: 'notable'; readonly paragraphs: readonly (readonly PanelRun[])[] }
  | { readonly kind: 'rule'; readonly text: string };

/**
 * One block of the panel, in DOM order. The kinds are UX-DR22's list plus the
 * Skills list (3.5), in that order. `buildPanel` emits every kind, except the
 * Skills list for a Project with no Skills — an empty `<ul>` names nothing.
 */
export type PanelBlock =
  | { readonly kind: 'kicker'; readonly text: string }
  | { readonly kind: 'title'; readonly text: string }
  | { readonly kind: 'reading'; readonly reading: PanelReading }
  | { readonly kind: 'fields'; readonly rows: readonly PanelField[] }
  | { readonly kind: 'skills'; readonly items: readonly string[] }
  | { readonly kind: 'release'; readonly label: string };

/** The panel for one Project. */
export interface FocusPanelModel {
  /** The Project shown, by entity ID. */
  readonly projectId: string;
  readonly blocks: readonly PanelBlock[];
}

/**
 * The panel for Project `id`, or `null` when there is none to show.
 *
 * In DOM order (UX-DR22): the Client kicker, the Project title, the reading
 * position, the field table (`Role`, `Team`, `Built` — no `Skills` row), the
 * Project's Skills as a static list in authored order, deduplicated (3.5: the
 * Motes' labels are canvas-only and capped, so the DOM carries every Skill —
 * no heading, no live region), the release button. The **reading position is always present**, because it is a
 * slot rather than an optional block: on a Deep Project it holds the Notable's
 * paragraphs with the constraint sentence as a lifted run, on a Shallow one the
 * editorial rule line — no error, no placeholder, no skeleton. The branch is on
 * `isDeep`, never on `notable`, so promotion swaps this block and nothing else.
 *
 * `null` for a `null` ID and for an ID no Project carries: the renderer then
 * draws the panel closed rather than a panel about nothing. The camera, which
 * cannot draw "nothing", throws on the same unknown ID instead.
 */
export function buildPanel(artifact: PanelArtifact, id: string | null): FocusPanelModel | null {
  if (id === null) return null;
  for (const client of artifact.clients) {
    for (const project of client.projects) {
      if (project.id !== id) continue;
      const { content } = project;
      return {
        projectId: project.id,
        blocks: [
          { kind: 'kicker', text: kickerText(client.name, content.company) },
          { kind: 'title', text: content.project },
          {
            kind: 'reading',
            reading: project.isDeep ? { kind: 'notable', paragraphs: paragraphsOf(content.notable ?? '') } : { kind: 'rule', text: EDITORIAL_RULE },
          },
          {
            kind: 'fields',
            rows: [
              { label: FIELD_LABELS.role, value: content.role },
              { label: FIELD_LABELS.team, value: String(content.team_size) },
              { label: FIELD_LABELS.built, value: content.built },
            ],
          },
          ...skillsBlock(content.skills),
          { kind: 'release', label: RELEASE_LABEL },
        ],
      };
    }
  }
  return null;
}

/**
 * The kicker's text: the Client, then the Company after a mid-dot, or the Client
 * alone when there is no Company. FR-6 puts the Company on the information
 * layer as a label, never as a Body; FR-11 ships both names verbatim — the
 * stylesheet sets them in capitals, the text stays as authored.
 */
export function kickerText(client: string, company: string | null): string {
  return company === null ? client : `${client} · ${company}`;
}

/** The Skills block, deduplicated in authored order — or none at all for a Project with no Skills. */
function skillsBlock(skills: readonly string[]): PanelBlock[] {
  const items = [...new Set(skills)];
  return items.length === 0 ? [] : [{ kind: 'skills', items }];
}

/**
 * Authored prose split on blank lines into paragraphs, each trimmed, none empty;
 * each paragraph split into runs at the lift marks, which are dropped, with no
 * empty run. The marks are presentation, like the blank lines — the schema has
 * already gated them, so a stray mark here is prose, not an error.
 */
function paragraphsOf(text: string): PanelRun[][] {
  return text
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
    .map(runsOf);
}

function runsOf(paragraph: string): PanelRun[] {
  const open = paragraph.indexOf(LIFT_OPEN);
  const close = paragraph.indexOf(LIFT_CLOSE, open + LIFT_OPEN.length);
  if (open === -1 || close === -1) return [{ text: paragraph, lifted: false }];
  return [
    { text: paragraph.slice(0, open), lifted: false },
    { text: paragraph.slice(open + LIFT_OPEN.length, close), lifted: true },
    { text: paragraph.slice(close + LIFT_CLOSE.length), lifted: false },
  ].filter((run) => run.text !== '');
}

/**
 * Where DOM focus goes when Focus changes from `previous` to `next` (UX-DR40).
 *
 *   - Focus entered, or moved to another Project: `'panel'` — the panel
 *     container, which carries `tabindex="-1"` and is labelled by its title.
 *   - Focus released: `{ entry: previous }` — the index entry of the Project
 *     that was open, never the document root and never the canvas.
 *   - Focus released by travel (`travelled`: the flight key changed in the same
 *     transition — a Client, the overview or a Star): `null`. The visitor took a
 *     door elsewhere, and pulling DOM focus back to the entry would take it off
 *     the button they just pressed.
 *   - No change: `null`, and DOM focus is left where the visitor put it.
 *
 * `travelled` is required, so a binding that forgets it is a type error rather
 * than a release that quietly always returns to the entry.
 */
export function focusMove(
  previous: string | null,
  next: string | null,
  travelled: boolean,
): 'panel' | { readonly entry: string } | null {
  if (previous === next) return null;
  if (next !== null) return 'panel';
  return previous === null || travelled ? null : { entry: previous };
}

/**
 * Where the camera is being sent, as one comparable value: the mode, plus the
 * target in free flight. On the Rail the standing `flightTarget` is not read —
 * nothing there frames it — so returning to the Rail is one key whatever was
 * flown to last. A string, so a selector returning it re-renders only when it
 * changes.
 */
export function flightKey(state: { readonly mode: 'rail' | 'freeflight'; readonly flightTarget: string | null }): string {
  return JSON.stringify(state.mode === 'freeflight' ? [state.mode, state.flightTarget] : [state.mode]);
}

/**
 * The Project whose content fades out as Focus changes from `previous` to
 * `next`: `previous`, exactly when both are Projects and they differ (`A → B`),
 * and `null` otherwise — entering and releasing slide the panel, and no change
 * changes nothing.
 */
export function crossFade(previous: string | null, next: string | null): string | null {
  return previous !== null && next !== null && previous !== next ? previous : null;
}

/**
 * The Project the outgoing layer holds once Focus changes from `previous` to
 * `next`, given the one it held (`leaving`): `crossFade(previous, next)`, except
 * on release, where it keeps `leaving` — an `A → B` fade still running then
 * finishes as the panel slides out rather than being cut, and a finished one
 * already rests at opacity 0.
 */
export function leavingAfter(leaving: string | null, previous: string | null, next: string | null): string | null {
  return next === null ? leaving : crossFade(previous, next);
}

/**
 * One WAAPI keyframe of the cross-fade. Mutable, because that is what
 * `Element.animate` takes, and a type alias rather than an interface, because
 * only an alias is assignable to the DOM's index-signed `Keyframe`.
 */
export type CrossFadeKeyframe = { opacity: number };

/** The cross-fade, as `Element.animate` takes it: both layers' keyframes and their shared timing. */
export interface CrossFadeTiming {
  readonly incoming: CrossFadeKeyframe[];
  readonly outgoing: CrossFadeKeyframe[];
  readonly options: {
    readonly duration: number;
    readonly easing: string;
    readonly fill: 'forwards';
  };
}

/**
 * The cross-fade's keyframes and timing: the incoming layer from 0 to 1 and the
 * outgoing one from `drawn` to 0, over `FOCUS_SECONDS × pace` (in milliseconds,
 * as WAAPI counts) on `focusEasingCss()`, holding the end. `pace` is the
 * reduced-motion pace (2.10, `motionPace`): `1` at full motion, shorter —
 * never `0` — reduced, as the camera's moves are.
 *
 * `drawn` is the opacity the outgoing content was on screen at — the incoming
 * layer's computed opacity as the swap happens, a string because that is what
 * `getComputedStyle` returns — so a `B → C` during `A → B` fades B out from
 * where it had faded in to, rather than cutting it to full. It is clamped to
 * `[0, 1]`, and anything that does not parse reads as 1.
 */
export function crossFadeTiming(drawn: string | number, pace = 1): CrossFadeTiming {
  const seconds = FOCUS_SECONDS * usablePace(pace);
  const parsed = typeof drawn === 'number' ? drawn : drawn.trim() === '' ? Number.NaN : Number(drawn);
  const from = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : 1;
  return {
    incoming: [{ opacity: 0 }, { opacity: 1 }],
    outgoing: [{ opacity: from }, { opacity: 0 }],
    options: { duration: seconds * 1000, easing: focusEasingCss(), fill: 'forwards' },
  };
}

/** The outgoing layer's inline style. */
export interface CrossFadeLayerStyle {
  readonly position: 'absolute';
  readonly top: 0;
  readonly left: 0;
  readonly right: 0;
  readonly height: '100%';
  readonly boxSizing: 'border-box';
  readonly overflow: 'hidden';
  readonly padding: string;
  readonly pointerEvents: 'none';
}

/**
 * The outgoing layer: laid over the incoming content — the panel's own padding,
 * from its top — and clipped to the panel's height, so a longer outgoing Project
 * never lengthens the panel's scroll. The renderer scrolls the layer itself to
 * the reader's position in the outgoing Project before the panel returns to its
 * top, so A fades where it was read rather than jumping to its start. It takes
 * no pointer.
 */
export function crossFadeLayerStyle(): CrossFadeLayerStyle {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    padding: PANEL_PADDING,
    pointerEvents: 'none',
  };
}

/** The panel container's inline style: the whole of what it paints. */
export interface PanelStyle {
  readonly position: 'fixed';
  readonly top: 0;
  readonly right: 0;
  readonly bottom: 0;
  readonly zIndex: 2;
  readonly width: string;
  readonly boxSizing: 'border-box';
  readonly overflowY: 'auto';
  readonly overscrollBehavior: 'contain';
  readonly padding: string;
  readonly background: string;
  readonly color: string;
  readonly borderLeft: string;
  readonly outline: 'none';
  readonly transform: string;
  readonly visibility: 'visible' | 'hidden';
  readonly transition: string;
}

/**
 * The panel's style, open or closed.
 *
 * It slides on the Focus curve over `FOCUS_SECONDS` — the camera's duration
 * and curve — so the two halves of the move start and end together. Closed, it
 * is translated off the right edge **and** `visibility: hidden`, which takes it
 * out of the tab order and the accessibility tree. The visibility switch is
 * delayed when closing (and not at all when opening) by the length of the
 * slide the browser actually runs: `FOCUS_SECONDS × factor`, where `factor` is
 * the slide's reversing shortening factor (`panelSlide`, 3.15) — 1 after a
 * settled open, less when the release reverses an opening slide still running,
 * which CSS then runs for only that share of its duration. So the panel is
 * visible for the whole slide and hidden once it ends, with no `transitionend`
 * listener to miss, rather than sitting off-screen, visible and tabbable, for
 * the rest of a full duration. `factor` is clamped to `[0, 1]`, a non-finite
 * one reading as 1.
 *
 * The `transform` transition keeps its full `FOCUS_SECONDS × pace` duration:
 * the browser applies the reversing factor to it itself.
 *
 * Both the slide and the visibility delay run on `FOCUS_SECONDS × pace` (2.10),
 * the reduced-motion pace the camera's Focus ease is dilated by, so the two
 * halves still start and end together.
 *
 * The surface is DESIGN.md §7.6's: `surface-raised` with one 1px
 * `surface-edge` left border, read from the token custom properties. No outline:
 * the container takes programmatic focus (`tabindex="-1"`, never tabbed to),
 * and a focus ring there would be a second boundary. It paints its own column
 * and nothing else — no scrim, no backdrop, no overlay.
 */
export function panelStyle(open: boolean, pace = 1, factor = 1): PanelStyle {
  const seconds = FOCUS_SECONDS * usablePace(pace);
  const share = Number.isFinite(factor) ? Math.min(Math.max(factor, 0), 1) : 1;
  const curve = `${seconds}s ${focusEasingCss()}`;
  return {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    width: panelWidthCss(),
    boxSizing: 'border-box',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    padding: PANEL_PADDING,
    background: 'var(--color-surface-raised-dark)',
    color: 'var(--color-ink-prose-dark)',
    borderLeft: '1px solid var(--color-surface-edge-dark)',
    outline: 'none',
    transform: open ? 'translateX(0)' : 'translateX(100%)',
    visibility: open ? 'visible' : 'hidden',
    transition: `transform ${curve}, visibility 0s linear ${open ? 0 : FOCUS_SECONDS * share * usablePace(pace)}s`,
  };
}

/** The panel's slide as the panel mirrors it: `FocusSlide`, plus when it started and at what pace. */
export interface PanelSlide extends FocusSlide {
  /** The clock reading, in milliseconds, at which the current slide started. */
  readonly at: number;
  /** The usable pace the current slide started at: a running CSS transition keeps its duration. */
  readonly pace: number;
}

/**
 * The panel's slide after a render at `nowMs` with the panel `open` or not:
 * the mirror of the slide the browser runs on its `transform`, from which
 * `panelStyle` takes the reversing factor for its `visibility` delay.
 *
 * On the first render (`previous` null) it is at rest — CSS does not transition
 * an element's first style. While `open` is unchanged it is `previous`, the same
 * object, so a re-render records nothing. When `open` flips, the previous slide
 * is advanced by the wall time since it started, in the slide's own seconds —
 * `(nowMs − at) / 1000 / previous.pace`, because a slide running at
 * `FOCUS_SECONDS × pace` covers its curve `pace` times slower, and a running
 * CSS transition keeps the duration it started with, so the time already run is
 * read at the pace recorded when that slide began, not today's — and then
 * flipped (`flipSlide`): a running slide reverses for the share CSS gives it, a
 * settled one starts afresh. The new slide records the current pace. A pace
 * that is not a positive finite number reads as 1; a clock read before `at`
 * advances nothing.
 *
 * Pure: the clock reading arrives as an argument (`focus-panel.tsx` passes
 * `performance.now()`).
 */
export function panelSlide(previous: PanelSlide | null, open: boolean, nowMs: number, pace = 1): PanelSlide {
  if (previous === null) return { ...settledSlide(open), at: nowMs, pace: usablePace(pace) };
  if (open === previous.open) return previous;
  const ran = advanceSlide(previous, (nowMs - previous.at) / 1000 / previous.pace);
  return { ...flipSlide(ran, open), at: nowMs, pace: usablePace(pace) };
}

/**
 * A pace a duration can be multiplied by: a positive finite number, else `1`.
 * A `0` would be a cut and a `NaN` an invalid CSS time, which the browser drops
 * silently — so anything unusable reads as full motion rather than as either.
 */
function usablePace(pace: number): number {
  return Number.isFinite(pace) && pace > 0 ? pace : 1;
}
