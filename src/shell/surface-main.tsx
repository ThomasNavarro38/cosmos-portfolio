/**
 * The page's one `<main>` (4.10): named for the shown surface, focusable by
 * script alone, and the arrival target of a route change.
 *
 * `App` renders this in place of a bare `<main>` in each of its three branches,
 * so React keeps the one component — and its `<main>` element, its ref and its
 * tracker — across surface changes. Its `aria-label` is
 * `SURFACE_NAMES[shown]`; `tabIndex={-1}` makes it focusable by script and
 * never a tab stop. `page.css` draws no outline on it: it is not a control.
 *
 * One tracker (`createArrival`, `arrival.ts`, pure and executed under
 * `node --test`) is created for the component's lifetime, by `useState`'s lazy
 * initialiser. An effect with no deps array calls it after every render with
 * `shown`, the `<main>` and `document`: the title names the surface on every
 * render, and focus moves here only when the shown surface changed — the
 * tracker's own rule, so a re-render or StrictMode's double effect moves
 * nothing. No live region: the focus move onto a named `<main>` is the
 * announcement. `surface-main.test.ts` audits this wiring.
 *
 * With the chart's fragment landing: when the chart chunk is cached, the
 * landing's ref callback runs in the commit, before this passive effect, so
 * focus is already strictly inside `<main>` and the tracker leaves it there.
 * When the chunk is not yet loaded, `<main>` is focused first and the record
 * when the chunk lands — two announcements, accepted by the spec.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SURFACE_NAMES, createArrival, type ShownSurface } from './arrival.ts';

export interface SurfaceMainProps {
  /** What `surfaceOf` shows for the route on this machine. */
  readonly shown: ShownSurface;
  readonly children: ReactNode;
}

export function SurfaceMain({ shown, children }: SurfaceMainProps) {
  const main = useRef<HTMLElement>(null);
  const [arrival] = useState(createArrival);
  useEffect(() => {
    arrival(shown, main.current, document);
  });
  return (
    <main ref={main} aria-label={SURFACE_NAMES[shown]} tabIndex={-1}>
      {children}
    </main>
  );
}
