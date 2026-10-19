/**
 * A render-harness fixture (`scripts/render.test.ts`): a Vite-compiled link
 * whose click handler is a prop and which reads an external store, so the
 * harness's recorders are exercised through the JSX runtime Vite emits.
 */

import { useSyncExternalStore } from 'react';

/** The store the fixture subscribes to; its identity is what the recorder must return. */
export function subscribeFixture(onChange: () => void): () => void {
  void onChange;
  return () => undefined;
}

export function Link({ onFollow }: { readonly onFollow: (event: unknown) => void }) {
  const word = useSyncExternalStore(subscribeFixture, () => 'the chart');
  return (
    <a href="/chart" onClick={onFollow}>
      {word}
    </a>
  );
}
