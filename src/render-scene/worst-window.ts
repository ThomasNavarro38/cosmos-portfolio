/**
 * The worst window, as the visitor's own timeline holds it (8.1, AD-23): one
 * mark, `scene-worst-window`, carrying the worst full five-second window the
 * frame monitor (`shell/chart-offer.ts`) has seen in this page's life and the
 * page-life gap count beside it.
 *
 * **One entry, always current.** `createWorstWindowMark(mark, clear)` returns
 * the monitor's sink. Each call clears every `WORST_WINDOW_MARK` entry and then
 * marks it afresh with `{ detail: { fps, frames, seconds, gaps } }`, where `fps`
 * is `frames / seconds`, or `null` when there is no full window yet (`frames`
 * 0, as on a gap before any). So a run on a target-profile machine reads the
 * answer in one place: `performance.getEntriesByName('scene-worst-window')`
 * holds exactly one entry. The entry's `startTime` is the time of the last
 * write: the end of the worst window when it was set, or a later gap. It is not
 * the window's start.
 *
 * **When it writes.** The monitor calls the sink on every strict fall of the
 * worst and on every gap. During a slowdown the rolling mean can fall on
 * consecutive frames, so this can run on nearly every frame for several
 * seconds. Each call clears, marks and allocates the detail. Only the
 * sampler itself is held to allocating nothing; this write is outside that
 * rule, by spec 8.1's Design Notes.
 *
 * **A measurement, never sent.** It stays in the visitor's browser: nothing
 * reads it but the person at DevTools, and nothing here logs, stores or
 * requests. A sink that throws is swallowed, so a write never throws into R3F's
 * frame.
 *
 * Import-free, with no DOM global and no clock: `mark` and `clear` arrive as
 * arguments (`worst-window-mark.tsx` binds the browser's), and
 * `worst-window.test.ts` executes every rule.
 */

/** The mark's name on the performance timeline. */
export const WORST_WINDOW_MARK = 'scene-worst-window';

/** What the mark carries: the worst full window's rate (null with none), its frames and seconds, and the page-life gap count. */
export interface WorstWindowDetail {
  readonly fps: number | null;
  readonly frames: number;
  readonly seconds: number;
  readonly gaps: number;
}

/** The sink: each call clears `WORST_WINDOW_MARK` and marks it again with the current worst window. Throws are swallowed. */
export function createWorstWindowMark(
  mark: (name: string, options: { readonly detail: WorstWindowDetail }) => void,
  clear: (name: string) => void,
): (frames: number, seconds: number, gaps: number) => void {
  return (frames, seconds, gaps) => {
    try {
      clear(WORST_WINDOW_MARK);
      mark(WORST_WINDOW_MARK, { detail: { fps: frames === 0 ? null : frames / seconds, frames, seconds, gaps } });
    } catch {
      // A measurement never breaks the frame: the next fall or gap writes again.
    }
  };
}
