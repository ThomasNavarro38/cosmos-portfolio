/**
 * The worst window's binding (8.1, AD-23): binds the frame monitor's one sink to
 * the visitor's own performance timeline, as one `scene-worst-window` mark, and
 * does nothing else.
 *
 * **Bound once, at module scope.** `writeWorstWindow` is `createWorstWindowMark`'s
 * sink (`worst-window.ts`, where every rule is executed) over the browser's own
 * `performance.mark` and `performance.clearMarks`, each bound to `performance`.
 * Where `performance`, its `mark` or its `clearMarks` is missing, both are
 * no-ops, so nothing throws and nothing is written.
 *
 * **Bound to the monitor while the scene is mounted.** `<WorstWindowMark>` has
 * one effect: it binds `writeWorstWindow` as the monitor's sink
 * (`bindWorstWindowSink`, `shell/chart-offer.ts`) and returns the unbind. The
 * monitor writes once at bind if a worst window or a gap already exists, so a
 * scene remounted through history rewrites the same single entry. If two
 * Canvases overlap, each binds, the newest is written to, and an unmount removes
 * only its own bind, so the other stays bound. The worst and the gap count are
 * the monitor's, for the page's life.
 *
 * **A reader of nothing.** No frame loop, no state, no store read, no log, no
 * request, and it renders `null`: it changes nothing the scene draws.
 *
 * Mounted once, inside `scene.tsx`'s `<Canvas>` between `<FrameSampler />` and
 * `<FirstFrameMark />`, and held there and here by `scene-model.test.ts`; the
 * binding is executed by `worst-window.test.ts`.
 */

import { useEffect } from 'react';
import { bindWorstWindowSink } from '../shell/chart-offer.ts';
import { createWorstWindowMark } from './worst-window.ts';

/** Whether the browser's timeline can be written here: `performance` with both `mark` and `clearMarks`. */
const timeline = typeof performance !== 'undefined' && typeof performance?.mark === 'function' && typeof performance?.clearMarks === 'function';

/** The browser's `performance.mark`, bound, or a no-op where the timeline is missing. */
const mark: (name: string, options: PerformanceMarkOptions) => void = timeline ? performance.mark.bind(performance) : () => undefined;

/** The browser's `performance.clearMarks`, bound, or a no-op where the timeline is missing. */
const clear: (name: string) => void = timeline ? performance.clearMarks.bind(performance) : () => undefined;

/** The one sink for this document. Exported so `worst-window.test.ts` executes the binding. */
export const writeWorstWindow = createWorstWindowMark(mark, clear);

/** Binds the worst window to the performance timeline while mounted. Renders nothing. */
export function WorstWindowMark() {
  useEffect(() => bindWorstWindowSink(writeWorstWindow), []);
  return null;
}
