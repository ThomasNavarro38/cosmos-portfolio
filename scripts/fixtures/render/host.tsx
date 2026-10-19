/**
 * A render-harness fixture (`scripts/render.test.ts`): a host whose one child
 * arrives through a lazy edge, as the shipped hosts' surfaces do, and a module
 * that imports a stylesheet, so the fixture's graph is loaded through Vite.
 */

import { Suspense, lazy } from 'react';
import './fixture.css';

const Leaf = lazy(() => import('./leaf.tsx'));

export function Host({ word }: { readonly word: string }) {
  return (
    <section className="host">
      <Suspense fallback={null}>
        <Leaf word={word} />
      </Suspense>
    </section>
  );
}
