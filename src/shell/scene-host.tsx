/**
 * The one edge through which the 3D surface is reached.
 *
 * **Dynamic import, and only dynamic import** (AD-7). A static
 * `import { Scene } from '../render-scene/scene.tsx'` anywhere on the entry path
 * would hoist `three`, `@react-three/fiber` and `@react-three/drei` onto the entry
 * chunk, so the DOM index would wait on ~880 kB of renderer before First Paint —
 * the exact inversion AD-4 exists to forbid. `lazy(() => import(...))` puts the
 * renderer in its own chunk, requested after the index is already in the document.
 * `src/shell/README.md:5` declares the rule and `src/derive/boundaries.ts` now
 * enforces it, in both directions: the `dynamicOnly` row rejects a static edge into
 * the directory, and the `neverPackages` row rejects reaching Three by package name
 * without going through the directory at all.
 *
 * **This lives in `src/shell/` because `src/App.tsx:16` says so** — "Do not grow
 * this file. The shell's entry, capability detection and dynamic renderer import
 * belong in `src/shell/`". `App.tsx` renders one more element; the responsibility
 * for how the renderer is reached is here.
 *
 * **The error boundary is not defensive garnish — the index is what makes it
 * necessary.** `buildScene` throws inside the render path on a malformed artifact,
 * and a lazy chunk can simply fail to arrive: a stale hash after a deploy, an
 * offline visitor, a CDN hiccup. Under a bare `<Suspense>` either one unmounts the
 * whole React root and takes the DOM destination index with it. That inverts the
 * architecture this story exists to protect: the index is the interface and the
 * scene is presentational, so the presentational surface failing must never remove
 * the interface. With the boundary, the page holds the index alone — which is
 * exactly the state First Paint already ships.
 *
 * **No retry, and that is a decision rather than an omission.** The index alone is
 * a legitimate terminal state, and the two failure causes have opposite operator
 * responses; `componentDidCatch` is implemented so a production build can tell them
 * apart in the console rather than swallowing the distinction. A reset keyed on
 * remount belongs with story 4.1's capability gate, which answers *no WebGL* — a
 * different question from a stale chunk hash.
 *
 * **The Rail's scroll input is here too** (2.5): a non-passive `wheel` listener on
 * a `<div>` wrapping the boundary asks `wheelIntent(...)` what the event means.
 * With nothing focused it is the Rail's, and the answer goes to `advanceScroll` —
 * the one writer of `scrollProgress`. With a Project focused (2.7) it scrolls the
 * panel, found by `FOCUS_PANEL_ID`, and the store is not written, so reading never
 * moves the camera. The meaning comes from the store alone, never from the event's
 * target. The rule itself lives in `rail-input.ts`, which is pure and tested, and
 * the camera rig only reads the field.
 *
 * **Capability detection is not here yet.** `src/render-fallback/` describes the
 * no-WebGL surface with absolute content parity and holds no code; story 4.1 owns
 * the gate that routes to it. Until then a visitor without WebGL reaches this
 * surface, fails to initialise, and keeps the index — recorded in `deferred-work.md`.
 */

import { Component, Suspense, lazy, useEffect, useRef, type ReactNode } from 'react';
import { FOCUS_PANEL_ID } from './panel-model.ts';
import { railStopCount, wheelIntent } from './rail-input.ts';
import { advanceScroll, navigationStore } from './state.ts';

/**
 * The scene, in its own chunk.
 *
 * `lazy` types the element's props from the imported module, so the shape below is
 * checked against `SceneProps` structurally — which is what keeps the two
 * restatements of the artifact from silently disagreeing.
 */
const Scene = lazy(async () => {
  const module = await import('../render-scene/scene.tsx');
  return { default: module.Scene };
});

/**
 * The artifact's shape, restated a third time — and the reason it must be.
 *
 * `src/shell/README.md:5` permits `src/render-scene/` **only** through a dynamic
 * import, and an `import type` counts as an import to the boundary parser. It is
 * right to: a type-only edge declares that the shell knows the renderer's module
 * graph. So `SceneArtifact` cannot be imported here even for a type, and the shape
 * is restated — the same trade `index-model.ts` already accepted, one copy larger.
 * The two are still checked against each other where `lazy` types the element's
 * props, so they cannot disagree silently; what is duplicated is the text.
 *
 * `readonly` throughout, matching `SceneArtifact` exactly. A mutable element type
 * here would make the two shapes structurally unequal in one direction, which
 * would let the restatement drift while the docstring claimed it could not.
 */
export interface SceneHostArtifact {
  readonly rail: readonly string[];
  readonly shots: readonly {
    readonly subject: string;
    readonly angle: number;
    readonly distance: number;
  }[];
  readonly dwell: readonly {
    readonly subject: string;
    readonly tempo: string;
  }[];
  readonly clients: readonly {
    readonly id: string;
    readonly position: { readonly x: number; readonly y: number; readonly z: number };
    readonly projects: readonly {
      readonly id: string;
      readonly clientId: string;
      readonly isDeep: boolean;
      readonly mass: number;
      readonly luminanceBand: string;
      readonly moteTier: string;
      readonly position: { readonly x: number; readonly y: number; readonly z: number };
      readonly content: { readonly skills: readonly string[] };
    }[];
  }[];
}

export interface SceneHostProps {
  readonly artifact: SceneHostArtifact;
}

interface SceneBoundaryProps {
  readonly children: ReactNode;
}

interface SceneBoundaryState {
  readonly failed: boolean;
}

/**
 * Renders `null` when the scene fails, so the index survives.
 *
 * A class component because React has no hook form of `componentDidCatch` — this
 * is the whole requirement, and it is deliberately the smallest thing that meets
 * it. `getDerivedStateFromError` is what stops the unmount; `componentDidCatch`
 * exists so the cause is diagnosable in a production build, where "the artifact was
 * malformed" and "the chunk 404'd" are otherwise the same blank surface.
 */
class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  override state: SceneBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    // Reported, not swallowed. The scene is presentational, so there is nothing to
    // show the visitor — but an operator reading a console needs to tell a stale
    // chunk hash from a document the gate should have rejected.
    console.error('the 3D scene failed to render; the destination index is unaffected.', error);
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Mounts the scene beside the index, behind the boundary and the suspense edge.
 *
 * **The boundary wraps `<Suspense>`, in that order.** A boundary *inside* the
 * suspense edge cannot catch the chunk-fetch rejection, which is thrown by the
 * lazy element itself — the failure this exists for. Pinned by an ordering
 * assertion in `scene-model.test.ts`, because the two nestings look equally
 * plausible in a diff and only one of them works.
 *
 * `fallback={null}` rather than a spinner: the index is already in the document and
 * complete, so there is nothing to wait for and nothing to announce. A placeholder
 * would be a visual element Epic 3 has not designed.
 */
export function SceneHost({ artifact }: SceneHostProps) {
  const host = useRef<HTMLDivElement>(null);
  const stopCount = railStopCount(artifact.rail);

  // Scroll's two meanings, over the scene only: a wheel over the index or over the
  // panel is never seen here, so both scroll natively. Registered by hand because
  // React attaches `wheel` passively, and a passive listener cannot stop the page
  // scrolling under the camera.
  useEffect(() => {
    const element = host.current;
    if (element === null) return undefined;
    const onWheel = (event: WheelEvent): void => {
      const { focusedProjectId, scrollProgress } = navigationStore.getState();
      const intent = wheelIntent(focusedProjectId, scrollProgress, event, stopCount, window.innerHeight);
      // Not scroll's to take (a pinch-zoom, a horizontal-only wheel, noise): the
      // browser keeps it, and the store is not written.
      if (intent === null) return;
      event.preventDefault();
      // Focus held: the wheel reads the panel, and the Rail does not move.
      if ('panel' in intent) {
        document.getElementById(FOCUS_PANEL_ID)?.scrollBy({ top: intent.panel });
        return;
      }
      advanceScroll(intent.rail);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [stopCount]);

  return (
    <div ref={host}>
      <SceneBoundary>
        <Suspense fallback={null}>
          <Scene artifact={artifact} />
        </Suspense>
      </SceneBoundary>
    </div>
  );
}
