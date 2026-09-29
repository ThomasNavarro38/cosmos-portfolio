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
 * **Pure.** No React, no DOM, no store, no artifact import: the document
 * arrives as an argument and the element IDs leave as strings.
 */

import { FOCUS_SECONDS, focusEasingCss } from './focus-motion.ts';

/** The panel's widest, in CSS pixels (DESIGN.md: 560px on desktop). */
export const PANEL_MAX_PX = 560;

/** The panel's share of the viewport width once 560px is more than that share (DESIGN.md: 46%). */
export const PANEL_FRACTION = 0.46;

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
 * return to the entry that opened the panel (UX-DR40).
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
    readonly role: string;
    readonly team_size: number;
    readonly built: string;
    readonly notable?: string | null;
  };
}

/** One row of the field table. */
export interface PanelField {
  readonly label: string;
  readonly value: string;
}

/**
 * One block of the panel, in DOM order. The kinds are UX-DR22's list, and
 * `buildPanel` always emits all five, in that order.
 */
export type PanelBlock =
  | { readonly kind: 'kicker'; readonly text: string }
  | { readonly kind: 'title'; readonly text: string }
  | { readonly kind: 'reading'; readonly paragraphs: readonly string[] }
  | { readonly kind: 'fields'; readonly rows: readonly PanelField[] }
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
 * release button. The **reading position is always present**, because it is a
 * slot rather than an optional block: on a Deep Project it holds the `notable`
 * paragraphs, on a Shallow one it holds nothing — no error, no placeholder, no
 * skeleton. The branch is on `isDeep`, never on `notable`.
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
          { kind: 'kicker', text: client.name },
          { kind: 'title', text: content.project },
          { kind: 'reading', paragraphs: project.isDeep ? paragraphsOf(content.notable ?? '') : [] },
          {
            kind: 'fields',
            rows: [
              { label: FIELD_LABELS.role, value: content.role },
              { label: FIELD_LABELS.team, value: String(content.team_size) },
              { label: FIELD_LABELS.built, value: content.built },
            ],
          },
          { kind: 'release', label: RELEASE_LABEL },
        ],
      };
    }
  }
  return null;
}

/** Authored prose split on blank lines into paragraphs, each trimmed, none empty. */
function paragraphsOf(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');
}

/**
 * Where DOM focus goes when Focus changes from `previous` to `next` (UX-DR40).
 *
 *   - Focus entered, or moved to another Project: `'panel'` — the panel
 *     container, which carries `tabindex="-1"` and is labelled by its title.
 *   - Focus released: `{ entry: previous }` — the index entry of the Project
 *     that was open, never the document root and never the canvas.
 *   - No change: `null`, and DOM focus is left where the visitor put it.
 */
export function focusMove(previous: string | null, next: string | null): 'panel' | { readonly entry: string } | null {
  if (previous === next) return null;
  if (next !== null) return 'panel';
  return previous === null ? null : { entry: previous };
}

/** The panel container's inline style: the whole of what it paints. */
export interface PanelStyle {
  readonly position: 'fixed';
  readonly top: 0;
  readonly right: 0;
  readonly bottom: 0;
  readonly zIndex: 1;
  readonly width: string;
  readonly boxSizing: 'border-box';
  readonly overflowY: 'auto';
  readonly overscrollBehavior: 'contain';
  readonly padding: string;
  readonly background: string;
  readonly color: string;
  readonly borderLeft: string;
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
 * delayed by the slide's duration when closing (and not at all when opening),
 * so the panel is visible for the whole slide and hidden exactly once it ends,
 * with no `transitionend` listener to miss.
 *
 * Greybox: CSS system colours and a hairline, no token. It paints its own
 * column and nothing else — no scrim, no backdrop, no overlay.
 */
export function panelStyle(open: boolean): PanelStyle {
  const curve = `${FOCUS_SECONDS}s ${focusEasingCss()}`;
  return {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    width: panelWidthCss(),
    boxSizing: 'border-box',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    padding: '56px clamp(16px, 5vw, 40px) 60px',
    background: 'Canvas',
    color: 'CanvasText',
    borderLeft: '1px solid GrayText',
    transform: open ? 'translateX(0)' : 'translateX(100%)',
    visibility: open ? 'visible' : 'hidden',
    transition: `transform ${curve}, visibility 0s linear ${open ? 0 : FOCUS_SECONDS}s`,
  };
}
