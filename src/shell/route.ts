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
 * **Split from `router.ts` for the entry's budget** (4.5, ruling Q3). The thin
 * entry resolves the route before the mount chunk can arrive, so this module
 * ships on the entry chunk; it holds the type, the paths and the resolution
 * and nothing else. `createRouter`, `surfaceOf` and `browserHistory` live in
 * `router.ts`, which imports this module and is reached from the mount alone,
 * so none of them is on the entry graph. Imports nothing.
 */

/** The three addressable routes. */
export type Route = 'home' | 'chart' | 'colophon';

/** Each route's one canonical path. */
export const ROUTE_PATHS: Readonly<Record<Route, string>> = {
  home: '/',
  chart: '/chart',
  colophon: '/colophon',
};

/** The route a path names: trailing slashes ignored, anything unknown is `home`. */
export function resolveRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '');
  if (path === ROUTE_PATHS.chart) return 'chart';
  if (path === ROUTE_PATHS.colophon) return 'colophon';
  return 'home';
}
