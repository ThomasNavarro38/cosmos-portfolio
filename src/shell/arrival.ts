/**
 * The arrival on a surface (4.10, WCAG 2.4.3, 4.1.3): what a route change tells
 * a visitor who cannot see the page swap, as a pure rule.
 *
 * **The title** names the shown surface on every call — `surface-main.tsx`
 * calls the tracker after every render, so on every render, the first
 * included: `Thomas Navarro · the scene`, `· the chart` or `· the model`
 * (Thomas's ruling Q2). `index.html`'s static `<title>` is the link preview's,
 * and Epic 6's.
 *
 * **The focus** moves to the `<main>` named for the new surface
 * (`SURFACE_NAMES`, its `aria-label`), and only when the *shown* surface
 * changes (`surfaceOf`): never on the first call, never on a render that keeps
 * the surface (a re-render, StrictMode's double effect, or `/` and `/chart` on
 * a fallback machine, which both show the chart), and never when focus is
 * strictly inside `<main>` — the chart's fragment landing focused its record
 * first. When `<main>` itself already holds focus (an earlier arrival, a click
 * on blank page), it is blurred and focused again, because focusing the
 * focused element announces nothing. `preventScroll`, because the surface
 * keeps its own scroll. Focusing a labelled `<main>` is the one announcement:
 * there is no live region, which would announce the arrival twice
 * (EXPERIENCE.md §11).
 *
 * Why `<main>` and not the first heading: the chart's and the Colophon's
 * headings arrive in lazy chunks, after the route has changed, and the chart's
 * `<h1>` is the identity line, which does not name the chart. `<main>` exists
 * synchronously and survives the branch swap in `App`.
 *
 * `arrive` is one step; `createArrival` is the tracker that holds the surface
 * shown before. Pure: no React, no DOM global. `main` and `doc` arrive as
 * arguments; `arrival.test.ts` executes every row and every call sequence.
 */

import type { Surface } from './detect.ts';
import { IDENTITY_MODEL } from './chrome-model.ts';
import { CHART_LINK_TEXT, SCENE_LINK_TEXT } from './route-link.ts';
import type { surfaceOf } from './router.ts';

/**
 * What `surfaceOf` shows on a machine: the machine's surface, the chart, or the
 * Colophon. Derived, so a new surface fails to type-check below until it has a
 * name and a title.
 */
export type ShownSurface = ReturnType<typeof surfaceOf<Surface>>;

/** The name the title gives the site, before its ` · `. */
const TITLE_NAME = 'Thomas Navarro';

/** Each shown surface's name: `<main>`'s accessible name, and the title's last words. The words its links use. */
export const SURFACE_NAMES: Readonly<Record<ShownSurface, string>> = {
  scene: SCENE_LINK_TEXT,
  fallback: CHART_LINK_TEXT,
  colophon: IDENTITY_MODEL,
};

/** Each shown surface's `document.title` (ruling Q2). */
export const SURFACE_TITLES: Readonly<Record<ShownSurface, string>> = {
  scene: `${TITLE_NAME} · ${SURFACE_NAMES.scene}`,
  fallback: `${TITLE_NAME} · ${SURFACE_NAMES.fallback}`,
  colophon: `${TITLE_NAME} · ${SURFACE_NAMES.colophon}`,
};

/** The slice of `<main>` the arrival uses. */
export interface ArrivalTarget {
  /** As `Node.contains`: true for the element itself too. */
  contains(node: unknown): boolean;
  focus(options: { readonly preventScroll: boolean }): void;
  blur(): void;
}

/** The slice of `document` the arrival uses. */
export interface ArrivalDocument {
  title: string;
  readonly activeElement: unknown;
}

/**
 * One step: arrive on `next`, having shown `previous` (`null` on the first
 * call). The title always names `next`. `main` is focused, without scrolling,
 * only on a change of shown surface, and not when focus is strictly inside it;
 * when it holds focus itself, it is blurred first, so the move is announced
 * again. A missing `main` (a `null` ref) focuses nothing.
 */
export function arrive(previous: ShownSurface | null, next: ShownSurface, main: ArrivalTarget | null, doc: ArrivalDocument): void {
  doc.title = SURFACE_TITLES[next];
  if (previous === null || previous === next || main === null) return;
  const active = doc.activeElement;
  if (active !== main && main.contains(active)) return;
  if (active === main) main.blur();
  main.focus({ preventScroll: true });
}

/** The tracker: called after every render with the surface shown, `<main>` and `document`. */
export type Arrival = (shown: ShownSurface, main: ArrivalTarget | null, doc: ArrivalDocument) => void;

/**
 * A tracker for one `<main>`'s lifetime: it holds the surface shown at its last
 * call (`null` before the first) and makes one `arrive` step per call, so the
 * title is set on every call and focus moves only on a change of shown surface.
 */
export function createArrival(): Arrival {
  let previous: ShownSurface | null = null;
  return (shown, main, doc) => {
    arrive(previous, shown, main, doc);
    previous = shown;
  };
}
