/**
 * The links between surfaces (4.5, FR-22, UX-DR49, UX-DR54), as a pure model:
 * the one click rule every route link follows, the link texts, and which routes
 * the chart's route line offers on this machine.
 *
 * **A route link is an `<a href>`.** Its `href` is the route's canonical
 * path under the base (`routeHref`), so the browser's own affordances — a new tab, a copied
 * link, the status bar — work as for any link. A *primary* click (button 0, no
 * Ctrl, Meta, Shift or Alt, not already `defaultPrevented`) is the router's:
 * `navigate(to)` — one real history entry, no reload — then `preventDefault()`
 * only when the router took it. A refused push (a sandbox, Safari's rate limit)
 * returns `false`, so the default stands and the browser follows the `href` as
 * a full load: the click is never lost. Any other click is left to the browser. The rule is `followRoute`, here and
 * executed under `node --test`, so no `.tsx` file holds it.
 *
 * **The copy.** `the chart` (appended to the scene's identity line, ruling Q1)
 * and `the scene` (on the chart's route line). `the model` is already the
 * identity line's own (`chrome-model.ts`). A surface is named as a surface in
 * its own right: never "fallback", "list", "2D", "lite", "version", or an
 * apology.
 *
 * **The chart's route line** (`chartRoutes`) holds `the scene` where this
 * machine's surface is the scene, and nothing where it is the chart: a phone or
 * a machine without WebGL2 is shown the chart at `/` itself, so a link to `/`
 * would lead back to the same chart. The route there is `home`, never a
 * `/scene` path: the root *is* this machine's surface.
 *
 * **The Colophon's route line** (`colophonRoutes`, Epic 5 item 38, ruling (a)
 * 2026-10-23) mirrors the chart's and adds the chart: `the scene` where this
 * machine is capable, then `the chart` on any machine. Its heading, `the
 * model`, is the page itself and links nothing, so `/colophon` is never a
 * route out of `/colophon`. The texts are the two constants above; the
 * Colophon joins them with ` · `, as the scene's identity line joins its parts.
 *
 * Pure: no React, no DOM, no store. The event and `navigate` arrive as
 * arguments; `fallback-host.tsx`, `colophon-host.tsx` and `corner-chrome.tsx`
 * hand them over.
 */

import { IDENTITY_MODEL } from './chrome-model.ts';
import type { Surface } from './detect.ts';
import { routeHref, type Route } from './route.ts';

/** The scene's link to the chart, appended to its identity line. */
export const CHART_LINK_TEXT = 'the chart';

/** The chart's link to the scene, on its route line where this machine is capable. */
export const SCENE_LINK_TEXT = 'the scene';

/** The slice of a click event the rule reads — a React `MouseEvent` or a DOM one. */
export interface RouteClick {
  readonly button: number;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly defaultPrevented: boolean;
  preventDefault(): void;
}

/** A primary click: the main button, no modifier, not already handled. */
export function isPrimaryClick(event: RouteClick): boolean {
  return event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && !event.defaultPrevented;
}

/**
 * The click rule: a primary click is the router's — `navigate(to)`, then
 * `preventDefault()` when it succeeded, so a refused push falls back to the
 * browser's own navigation; any other click is left to the browser (a new tab,
 * a new window, a download), with nothing prevented and nothing navigated.
 */
export function followRoute(event: RouteClick, navigate: (to: Route) => boolean, to: Route): void {
  if (!isPrimaryClick(event)) return;
  if (navigate(to)) event.preventDefault();
}

/** One route link, as a renderer draws it: its key, its text, its `href`, and its click. */
export interface RouteLink {
  readonly key: string;
  readonly text: string;
  readonly href: string;
  readonly follow: (event: RouteClick) => void;
}

/** A link to `to`: the route's canonical path under the base as its `href`, and `followRoute` as its click. */
export function routeLink(key: string, text: string, to: Route, navigate: (to: Route) => boolean): RouteLink {
  return { key, text, href: routeHref(to), follow: (event) => followRoute(event, navigate, to) };
}

/** One entry of the chart's route line, before it is bound to a router. */
export interface ChartRoute {
  readonly key: string;
  readonly text: string;
  readonly to: Route;
}

/** The chart's route line on this machine: `the scene` where it is capable, nothing otherwise. */
export function chartRoutes(machine: Surface): readonly ChartRoute[] {
  return machine === 'scene' ? [{ key: 'scene', text: SCENE_LINK_TEXT, to: 'home' }] : [];
}

/** The chart's links: `the model` in its heading, to the Colophon, and its route line. */
export interface ChartLinks {
  readonly model: RouteLink;
  readonly routes: readonly RouteLink[];
}

/** The chart's links on this machine, bound to `navigate`. */
export function chartLinks(machine: Surface, navigate: (to: Route) => boolean): ChartLinks {
  return {
    model: routeLink('model', IDENTITY_MODEL, 'colophon', navigate),
    routes: chartRoutes(machine).map((route) => routeLink(route.key, route.text, route.to, navigate)),
  };
}

/**
 * The Colophon's route line on this machine: `the scene` where it is capable,
 * then `the chart` on any machine. Written out here rather than built from
 * `chartRoutes`, so a link added to the chart's route line never joins the
 * Colophon's silently.
 */
export function colophonRoutes(machine: Surface): readonly ChartRoute[] {
  const chart: ChartRoute = { key: 'chart', text: CHART_LINK_TEXT, to: 'chart' };
  return machine === 'scene' ? [{ key: 'scene', text: SCENE_LINK_TEXT, to: 'home' }, chart] : [chart];
}

/**
 * The Colophon's links, as the shell builds them: its route line alone — its
 * heading, `the model`, is the page itself. The page declares its own
 * structural `ColophonLinks` (`colophon.tsx`); this is the shell's side.
 */
export interface ColophonRouteLinks {
  readonly routes: readonly RouteLink[];
}

/** The Colophon's links on this machine, bound to `navigate`. */
export function colophonLinks(machine: Surface, navigate: (to: Route) => boolean): ColophonRouteLinks {
  return { routes: colophonRoutes(machine).map((route) => routeLink(route.key, route.text, route.to, navigate)) };
}
