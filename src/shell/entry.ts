/**
 * The thin entry (4.1, AD-7): what `index.html` loads, and all it loads before
 * a surface is chosen.
 *
 * No React and no Three. The design tokens and the page sit on this chunk, so the
 * first frame is the ground, edge to edge — no splash, no loader, no gate.
 *
 * The one dynamic import, the mount, is started **first**, so the chunk request
 * is not held behind WebGL2 context creation. Then `detect()` asks its two
 * questions and `chooseSurface` answers — synchronously, so the surface is known
 * before the import can resolve — and the mount renders that surface. The
 * fallback surface never asks for `render-scene`; the scene surface asks for it
 * lazily, after the index is in the document (ruling Q2).
 *
 * The route (4.2) is resolved here too, from the path alone, before the mount
 * chunk can resolve: `resolveRoute`, over the path with the base stripped by
 * `appPath`, is taken from `route.ts`, which holds the
 * routes, their paths and the resolution and imports nothing (4.5, ruling Q3:
 * split from `router.ts` so the router itself stays off this chunk's budget).
 * The mount makes the router, which owns history; `/chart`
 * shows the flat chart on any machine and `/colophon` the Colophon, each asking
 * for at most one renderer chunk.
 *
 * The tokens come first so they precede every DOM stylesheet the mount brings
 * (AD-12); `page.css` styles `html`, `body` and the scene host only.
 *
 * **No retry, by decision.** If the mount chunk fails to arrive, or the mount
 * itself throws, the console says why and the page keeps the ground. A retry or a
 * loader is an Ask First.
 */

import '../tokens/tokens.css';
import './page.css';
import { browserEnv, chooseSurface, detect } from './detect.ts';
import { appPath, resolveRoute } from './route.ts';

const mounting = import('./mount.tsx');
const surface = chooseSurface(detect(browserEnv()));
const route = resolveRoute(appPath(location.pathname));

mounting
  .then((module) => module.mount(surface, route))
  .catch((error: unknown) => console.error('the surface failed to load; the page keeps its ground.', error));
