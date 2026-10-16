/**
 * The one edge through which the Colophon is reached (4.2).
 *
 * **Dynamic import, and only dynamic import** (AD-7, ruling Q2). The boundary
 * rows permit `src/colophon/` from the shell only dynamically, so the Colophon is
 * its own chunk: requested on `/colophon` alone, never with `render-scene`, and
 * never on the entry graph (`scripts/bundle-assertion.test.ts` holds the emitted
 * chunk apart).
 *
 * The same pattern as `scene-host.tsx`'s: an error boundary outside
 * `<Suspense fallback={null}>`, because a boundary inside cannot catch the chunk
 * fetch's rejection. A failed chunk is logged and renders nothing, and the React
 * root stays mounted, so a later route change still renders. No loader and no
 * retry, by the same decision as the entry's.
 */

import { Component, Suspense, lazy, type ReactNode } from 'react';

const Colophon = lazy(() => import('../colophon/colophon.tsx'));

interface ColophonBoundaryProps {
  readonly children: ReactNode;
}

interface ColophonBoundaryState {
  readonly failed: boolean;
}

/** Renders `null` when the Colophon fails, so the root survives. */
class ColophonBoundary extends Component<ColophonBoundaryProps, ColophonBoundaryState> {
  override state: ColophonBoundaryState = { failed: false };

  static getDerivedStateFromError(): ColophonBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    console.error('the colophon failed to load; the page keeps its root.', error);
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

export function ColophonHost() {
  return (
    <ColophonBoundary>
      <Suspense fallback={null}>
        <Colophon />
      </Suspense>
    </ColophonBoundary>
  );
}
