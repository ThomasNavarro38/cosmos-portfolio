/**
 * The three addressable routes (4.2, AD-18, UX-DR54), and the path each is
 * resolved from — the one part of the router the thin entry needs.
 *
 * | Route | Path | Surface |
 * | --- | --- | --- |
 * | `home` | `/` | this machine's surface — the scene where it is capable, else the flat chart |
 * | `chart` | `/chart` | the flat chart, on any machine |
 * | `colophon` | `/colophon` | the Colophon |
 *
 * There is no `/scene`: the root *is* this machine's surface, so a capable
 * visitor choosing the scene from the chart (4.5) is `navigate('home')`. Any
 * other path, or a non-canonical one (`/chart/`), resolves to its route.
 *
 * **The paths are the app's, not the browser's.** The site is published under
 * `BASE` (GitHub Pages, a project site), so the browser's `/cosmos-portfolio/chart`
 * is the app's `/chart`. Only the browser boundary knows the base: the entry and
 * `browserHistory` read a pathname through `appPath`, and every `href` is
 * `routeHref`'s and every history write `browserPath`'s. The router itself sees app paths alone.
 * `BASE` is spelled here rather than imported, because this module imports
 * nothing; `router.test.ts` holds it equal to `scripts/site.ts`.
 *
 * **Split from `router.ts` for the entry's budget** (4.5, ruling Q3). The thin
 * entry resolves the route before the mount chunk can arrive, so this module
 * ships on the entry chunk; it holds the type, the paths and the resolution
 * and nothing else. `createRouter`, `surfaceOf` and `browserHistory` live in
 * `router.ts`, which imports this module and is reached from the mount alone,
 * so none of them is on the entry graph. Imports nothing.
 */

/** The three addressable routes. */
export type Route = 'home' | 'chart' | 'colophon';

/** The path the site is published under, with both slashes. */
export const BASE = '/cosmos-portfolio/';

/** Each route's one canonical path, relative to the site. */
export const ROUTE_PATHS: Readonly<Record<Route, string>> = {
  home: '/',
  chart: '/chart',
  colophon: '/colophon',
};

/** An app path as the browser addresses it, under `BASE`. */
export function browserPath(path: string): string {
  return BASE + path.slice(1);
}

/** A route's `href`: its canonical path under `BASE`. */
export function routeHref(route: Route): string {
  return browserPath(ROUTE_PATHS[route]);
}

/** A browser pathname as the app reads it: `BASE` stripped, the base without its slash read as `/`, anything outside it unchanged. */
export function appPath(pathname: string): string {
  if (pathname === BASE.slice(0, -1)) return '/';
  return pathname.startsWith(BASE) ? pathname.slice(BASE.length - 1) : pathname;
}

/** The route an app path names: trailing slashes ignored, anything unknown is `home`. */
export function resolveRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '');
  if (path === ROUTE_PATHS.chart) return 'chart';
  if (path === ROUTE_PATHS.colophon) return 'colophon';
  return 'home';
}
