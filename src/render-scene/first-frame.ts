/**
 * First Paint, as the scene sees it (6.4): the moment the Schematic frame is
 * first drawn, marked once per document on the visitor's own performance
 * timeline.
 *
 * **Why a mark.** The browser's own First Contentful Paint fires on the DOM
 * chrome, which paints before the canvas draws, so it would understate First
 * Paint. The mark is set where First Paint is defined: just after the Schematic
 * frame's first draw is issued (the binding queues it as a microtask from the
 * first frame callback, so the first `gl.render` and its shader compile come
 * before it). It stays in the visitor's browser — nothing reads it
 * but the person at DevTools, and nothing sends it anywhere — so the site still
 * collects nothing. `first-paint-6-4.md` gives the protocol that reads it.
 *
 * **Once per document.** `createFirstFrameMark(mark)` returns a latch: its first
 * call hands `FIRST_FRAME_MARK` to `mark`, and every later call does nothing.
 * The binding (`first-frame-mark.tsx`) builds one latch at module scope, so a
 * scene remounted through history (scene → chart → Back) never marks again and a
 * warm-cache frame never overwrites the cold measurement. A sink that throws is
 * swallowed, with the latch already spent: the mark is a measurement, and it
 * must never throw into R3F's frame loop.
 *
 * Import-free, with no DOM global and no clock: the sink arrives as an argument,
 * and `first-frame.test.ts` executes every row.
 */

/** The mark's name on the performance timeline. */
export const FIRST_FRAME_MARK = 'schematic-first-frame';

/** The latch: the first call hands `FIRST_FRAME_MARK` to `mark`, once; every later call does nothing. */
export function createFirstFrameMark(mark: (name: string) => void): () => void {
  let spent = false;
  return () => {
    if (spent) return;
    spent = true;
    try {
      mark(FIRST_FRAME_MARK);
    } catch {
      // A measurement never breaks the frame: the latch is spent, and nothing is retried.
    }
  };
}
