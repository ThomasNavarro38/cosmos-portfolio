/**
 * The Colophon (4.2, 5.1): the `/colophon` route's surface, reached only through
 * `lazy(() => import('./colophon.tsx'))` in `src/shell/colophon-host.tsx`, so it
 * is its own chunk and never on the entry graph or the scene's.
 *
 * **The exhibits, fetched** (5.1, AD-17). The default `Colophon` fetches the two
 * raw files the build publishes — `/career.json`, then `/layout.generated.json`
 * (`exhibits.ts`, `scripts/exhibits.ts`) — once, in an effect whose whole body
 * is `startExhibits` (executed in `exhibits.test.ts`; this file is audited in
 * `colophon.test.ts`), its stop aborting on unmount, so a visitor who leaves
 * mid-fetch causes no state update. A failed fetch is logged once and draws nothing more: the
 * `<h1>` alone, nothing thrown into React, no loading indicator and no retry. An
 * abort is swallowed silently.
 *
 * `ColophonPage` draws: the `<h1>`, then, once the files have arrived, each
 * file's text verbatim in its own `<pre>`, career first. The `<pre>`s are
 * deliberately unset in 5.1 — no name, no measure, no syntax setting; 5.3 owns
 * their treatment. No other copy (5.2–5.5).
 *
 * It imports React and `exhibits.ts`, and nothing else: not the shell, not the
 * motion preference, never `src/data/` or `generated/`.
 */

import { useEffect, useState } from 'react';
import { startExhibits, type Exhibits } from './exhibits.ts';

/** The surface as drawn: the heading, and the two files once they have arrived. */
export function ColophonPage({ exhibits }: { readonly exhibits: Exhibits | null }) {
  return (
    <>
      <h1>the model</h1>
      {exhibits === null ? null : (
        <>
          <pre>{exhibits.career}</pre>
          <pre>{exhibits.layout}</pre>
        </>
      )}
    </>
  );
}

export default function Colophon() {
  const [exhibits, setExhibits] = useState<Exhibits | null>(null);
  useEffect(() => startExhibits(fetch, setExhibits, (error) => console.error('the colophon could not load its exhibits.', error)), []);
  return <ColophonPage exhibits={exhibits} />;
}
