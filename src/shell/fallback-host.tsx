/**
 * The one edge through which the flat star chart is reached (4.3).
 *
 * **Dynamic import, and only dynamic import** (AD-7, ruling Q2). The boundary
 * rows permit `src/render-fallback/` from the shell only dynamically, so the
 * chart is its own chunk: the one renderer chunk `/chart` and a `fallback` `/`
 * request, never `render-scene`, and never on the entry graph
 * (`scripts/bundle-assertion.test.ts` holds the emitted chunk apart).
 *
 * The same pattern as `colophon-host.tsx`'s: an error boundary outside
 * `<Suspense fallback={null}>`, because a boundary inside cannot catch the chunk
 * fetch's rejection. A failed chunk is logged and renders nothing, and the React
 * root stays mounted, so a later route change still renders. No loader and no
 * retry, by the same decision as the entry's.
 *
 * `App` renders this host alone on the `fallback` surface — every phone, every
 * machine without WebGL2, and `/chart` on any machine — so none of the scene's
 * chrome is left behind: the index's buttons are scene doors, and the corner
 * chrome and the panel are scene chrome. On the chart, the table and the record
 * anchors are the destination index.
 */

import { Component, Suspense, lazy, type ReactNode } from 'react';

const Chart = lazy(() => import('../render-fallback/chart.tsx'));

/**
 * The artifact's shape as the chart reads it, restated — for the reason
 * `scene-host.tsx` gives for its own: `src/shell/README.md:5` permits
 * `src/render-fallback/` only through a dynamic import, and an `import type`
 * counts as an import to the boundary parser. The two shapes are still checked
 * against each other where `lazy` types `<Chart>`'s props, so they cannot
 * disagree silently; what is duplicated is the text. `readonly` throughout, as
 * `ChartArtifact` is.
 */
export interface FallbackHostArtifact {
  readonly clients: readonly {
    readonly id: string;
    readonly name: string;
    readonly timeAxis: number;
    readonly projects: readonly {
      readonly id: string;
      readonly isDeep: boolean;
      readonly timeAxis: number;
      readonly content: {
        readonly project: string;
        readonly company: string | null;
        readonly role: string;
        readonly team_size: number;
        readonly built: string;
        readonly notable?: string | null;
        readonly skills: readonly string[];
        readonly duration: {
          readonly start: string;
          readonly end: string | null;
        };
      };
    }[];
  }[];
}

export interface FallbackHostProps {
  readonly artifact: FallbackHostArtifact;
}

interface FallbackBoundaryProps {
  readonly children: ReactNode;
}

interface FallbackBoundaryState {
  readonly failed: boolean;
}

/** Renders `null` when the chart fails, so the root survives. */
class FallbackBoundary extends Component<FallbackBoundaryProps, FallbackBoundaryState> {
  override state: FallbackBoundaryState = { failed: false };

  static getDerivedStateFromError(): FallbackBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    console.error('the chart failed to load; the page keeps its root.', error);
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

export function FallbackHost({ artifact }: FallbackHostProps) {
  return (
    <FallbackBoundary>
      <Suspense fallback={null}>
        <Chart artifact={artifact} />
      </Suspense>
    </FallbackBoundary>
  );
}
