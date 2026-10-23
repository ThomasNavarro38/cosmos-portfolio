/**
 * The app root, rendered by `./shell/mount.tsx` with the surface the thin entry
 * chose (4.1) and the router (4.2).
 *
 * It renders the DOM destination index from the committed artifact, statically
 * imported — so the index is in the document as soon as the mount chunk runs,
 * before any 3D chunk has been asked for, let alone loaded. That ordering is the story's point (AD-4):
 * an accessible surface retrofitted after the canvas produces an inverted
 * architecture, and the inversion stays invisible until assistive technology meets
 * it. The index is therefore written **first** here, and the scene host after it:
 * document order is what a screen reader and the tab key walk.
 *
 * The 3D surface arrives beside it through `./shell/scene-host.tsx`, which holds
 * the `lazy(() => import('../render-scene/scene.tsx'))` edge and the error boundary
 * that keeps the index in the document when the renderer cannot — and only where
 * the route shows the `scene` surface (4.2: `/` on a capable machine, never
 * `/chart`). Each other surface is its own early return, shown alone, so neither
 * ever requests `render-scene`: on `/colophon` the Colophon, through
 * `./shell/colophon-host.tsx`; on `fallback` (no WebGL2, a coarse primary
 * pointer, or `/chart` on any machine) the flat star chart (4.3), through
 * `./shell/fallback-host.tsx` — each its own lazy edge. The chart is alone
 * because the index's buttons are scene doors and the chrome and the panel are
 * scene chrome; on the chart, its table and record anchors are the destination
 * index, all of it DOM. One element per branch here, no responsibility — the
 * rule below is unchanged. The Focus panel (2.7) is one
 * more element after it, for the same reason: `./shell/focus-panel.tsx` holds the
 * responsibility, and it comes last in document order because it is read after a
 * destination is chosen.
 *
 * The scene, the chart and the Colophon are each handed the router (4.5), for
 * their links between surfaces: the chrome's `the chart`; the chart's `the
 * model` and, where this machine's surface is the scene, `the scene`; and the
 * Colophon's route line, `the scene` likewise, then `the chart` (Epic 5 item
 * 38) — which is why the fallback and colophon hosts are handed the machine's
 * surface too. Props only.
 *
 * The corner chrome (3.8) sits between the index and the scene host:
 * `./shell/corner-chrome.tsx` holds it — the identity line and the stateful slot
 * whose button is the page's one return button. After the index, so the destinations
 * are walked first; before the scene and the panel. So the document order is
 * index, chrome, scene host, panel.
 *
 * Each branch's root is `./shell/surface-main.tsx` (4.10), the page's one
 * `<main>`, handed `shown`: the same component in every branch, so React keeps
 * its element across surface changes. It names the surface (`aria-label`, and
 * `document.title`) and, when the shown surface changes, moves focus to itself —
 * the arrival a screen reader hears. The responsibility is its; here it is one
 * element per branch, as the hosts are.
 *
 * The page itself (3.9) is `./shell/page.css`: the ground edge to edge, no page
 * scroll while the scene host is in the document (4.3: the chart and the
 * Colophon scroll natively), and the scene host fixed to the viewport. Since 4.1 it is imported by
 * the thin entry (`./shell/entry.ts`), beside the tokens, so the first frame is
 * the ground before React has arrived.
 *
 * `generated/layout.generated.json` resolves outside `src/`, so importing it
 * crosses no declared boundary — `src/shell/` names it explicitly as a permitted
 * static import, and the rule for a root file (`ROOT_RULE`) bans only
 * `src/data/` and `src/derive/`. Nothing here reaches either. Since 4.1 this file
 * is off the entry chunk: it is a root file the mount reaches, still governed by
 * that rule.
 *
 * **Do not grow this file.** The shell's entry, capability detection and dynamic
 * renderer import belong in `src/shell/`; this stays a mount point.
 */

import { useSyncExternalStore } from 'react';
import artifact from '../generated/layout.generated.json';
import { ColophonHost } from './shell/colophon-host.tsx';
import { CornerChrome } from './shell/corner-chrome.tsx';
import { FallbackHost } from './shell/fallback-host.tsx';
import { FocusPanel } from './shell/focus-panel.tsx';
import { DestinationNav } from './shell/index-nav.tsx';
import type { Surface } from './shell/detect.ts';
import { surfaceOf, type Router } from './shell/router.ts';
import { SceneHost } from './shell/scene-host.tsx';
import { SurfaceMain } from './shell/surface-main.tsx';

export function App({ surface, router }: { readonly surface: Surface; readonly router: Router }) {
  // The route (4.2) is the router's, never the navigation store's. What it shows
  // on this machine is `surfaceOf`'s: the Colophon alone on `/colophon`, the flat
  // chart alone on `/chart` whatever the machine, and the machine's surface on `/`.
  const route = useSyncExternalStore(router.subscribe, router.route);
  const shown = surfaceOf(route, surface);
  if (shown === 'colophon') {
    return (
      <SurfaceMain shown={shown}>
        <ColophonHost surface={surface} router={router} />
      </SurfaceMain>
    );
  }
  if (shown === 'fallback') {
    return (
      <SurfaceMain shown={shown}>
        <FallbackHost artifact={artifact} surface={surface} router={router} />
      </SurfaceMain>
    );
  }
  // The artifact is JSON, so its inferred type is structural rather than the
  // schema's. `DestinationNav` asks only for the five fields the index reads,
  // and TypeScript checks the document against that here — the one place the
  // artifact and the shell meet (and above, against the chart's slice). The
  // schema stays the single declaration of the document's shape; `src/shell/`
  // may not import it (AD-3), and a `derive/` import for a type alone would be
  // exactly the edge the boundary gate forbids.
  return (
    <SurfaceMain shown={shown}>
      <DestinationNav artifact={artifact} />
      <CornerChrome router={router} />
      <SceneHost artifact={artifact} />
      <FocusPanel artifact={artifact} />
    </SurfaceMain>
  );
}
