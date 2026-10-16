/**
 * The Colophon (4.2): the `/colophon` route's surface, reached only through
 * `lazy(() => import('./colophon.tsx'))` in `src/shell/colophon-host.tsx`, so it
 * is its own chunk and never on the entry graph or the scene's.
 *
 * Minimal by ruling: one `<h1>` and nothing else until story 5.1 fills it in —
 * any further copy is an Ask First. It imports nothing: not the shell, and not
 * the motion preference.
 */

export default function Colophon() {
  return <h1>the model</h1>;
}
