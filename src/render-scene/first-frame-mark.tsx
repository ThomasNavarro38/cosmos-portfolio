/**
 * The First Paint mark's binding (6.4): marks the Schematic frame's first draw
 * once per document, as `performance.mark('schematic-first-frame')`, and does
 * nothing else.
 *
 * **Bound once, at module scope.** `markFirstFrame` is `createFirstFrameMark`'s
 * latch (`first-frame.ts`, where every rule is executed) over the browser's own
 * `performance.mark`, bound to `performance`. Where `performance` or its `mark`
 * is missing, the sink is a no-op, so nothing throws. Module scope is the point:
 * a scene remounted through history mounts a second `<FirstFrameMark>` over the
 * same, spent latch, and never marks again.
 *
 * **After the first draw, not before it.** R3F runs every `useFrame` callback
 * and then `gl.render`, synchronously, inside one `requestAnimationFrame`
 * callback. A mark set inside the frame callback would land before that first
 * `gl.render` — before its shader compile and link, which on NFR-4's integrated
 * graphics can take hundreds of milliseconds — and understate First Paint on
 * exactly the hardware it is measured on. So `firstFrameTick` queues the latch
 * as a microtask: it runs once the animation-frame callback returns, after the
 * first draw has been issued. No priority `useFrame` (that would take over
 * R3F's render), no extra `requestAnimationFrame`, no timer. Later ticks queue
 * further microtasks; the spent latch makes them no-ops. It is never called
 * synchronously inside the callback.
 *
 * **A reader of nothing.** One `useFrame(firstFrameTick)`. It holds no state, no
 * effect and no store read, logs nothing, sends nothing, and renders `null`: it
 * changes nothing the scene draws. The mark stays on the visitor's own timeline
 * (`first-paint-6-4.md` reads it).
 *
 * Mounted once, inside `scene.tsx`'s `<Canvas>` after `<FrameSampler />`, and
 * held there and here by `scene-model.test.ts`; the binding and the tick are
 * executed by `first-frame.test.ts`. The component body is the one unexecuted
 * residual, pinned by the source audit.
 */

import { useFrame } from '@react-three/fiber';
import { createFirstFrameMark } from './first-frame.ts';

/** The browser's `performance.mark`, bound, or a no-op where there is none. */
const mark: (name: string) => void =
  typeof performance !== 'undefined' && typeof performance?.mark === 'function'
    ? performance.mark.bind(performance)
    : () => undefined;

/** The one latch for this document. Exported so `first-frame.test.ts` executes the binding. */
export const markFirstFrame = createFirstFrameMark(mark);

/** The frame callback: queues the latch as a microtask, so the mark lands after the frame's draw is issued. */
export function firstFrameTick(): void {
  queueMicrotask(markFirstFrame);
}

/** Marks the scene's first frame on the performance timeline, once per document. Renders nothing. */
export function FirstFrameMark() {
  useFrame(firstFrameTick);
  return null;
}
