/**
 * The live re-solve (5.5, FR-21, AD-7, AD-17): its copy and its run.
 *
 * **The copy** is Thomas's ruling (Q2 (a), Q3 (a), 2026-10-21), verbatim:
 * the `<h2>`, the one framing paragraph, the button's label, and the result
 * exhibit's accessible name (`result`: announced, never drawn). The framing
 * was re-ruled 2026-10-29 (Epic 5 item 40, AV-3 (a)), and re-ruled twice more
 * that day: it no longer says the run "does not reproduce" the shipped layout,
 * it claims no outcome for this run, and it claims nothing of the build (the
 * gate, `src/derive/index.ts --check`, compares digests and never solves).
 * Under Node the solve is byte-identical to the committed artifact
 * (`live.test.ts`); in a browser it may settle differently, and the Epic 5
 * retro observed it byte-identical in Chrome 155. What it claims is what the
 * source holds — the same solver on the same file; the shipped
 * layout.generated.json solved from that file by `npm run solve` and
 * committed; and the scene and the chart reading it, never this run. Each
 * claim is held by a test (`live-solve.test.ts`'s
 * framing claims, `live.test.ts`, `src/derive/colophon-claims.test.ts`,
 * `pipeline.test.ts`, `colophon.test.ts`, `scripts/bundle-assertion.test.ts`,
 * and `src/derive/maintenance.test.ts`'s live references).
 *
 * **The run**, executable here rather than in a `.tsx` the runner cannot load,
 * as `startExhibits` is: `load()` (in `colophon.tsx`, the dynamic import of
 * `src/derive/live.ts`, the solver's own chunk), then `solveLive(career)`, then
 * the text to `show` exactly once, or the one failure to `fail` exactly once,
 * and neither after the returned stop — an unmounted page is not updated, and
 * a run replaced by the next is not drawn. A run stopped before its chunk
 * arrives solves nothing. A loader that throws synchronously is a failure
 * like any other, reported once.
 *
 * **The press**, `createLiveSolve` — the tracker the Colophon binds to its
 * state, as `createArrival` (`src/shell/arrival.ts`) is to `<main>`: the state
 * setters, the loader and the log arrive as arguments, so every transition is
 * executed in `live-solve.test.ts` rather than read off the `.tsx`. A press
 * while a run is in flight is ignored; otherwise it stops the previous run,
 * marks the run in flight, and starts one. Its success sets the text and frees
 * the button; its failure is logged once and frees the button, the previous
 * result left as it was. `stop` (the unmount) stops the current run, whose late
 * result is then never applied.
 *
 * Import-free: the loader arrives as an argument, so this module never names
 * the solver, and nothing here touches the DOM or React.
 */

/** The ruled copy: heading, framing and action drawn; result announced only. */
export const LIVE_SOLVE = { heading: 'solve it here', framing: 'This runs the same solver on career.json, here in your browser. The shipped layout.generated.json was solved from the same file and committed; the scene and the chart read it, never this run.', action: 'solve it again', result: 'layout, solved in this browser' } as const;

/** The slice of the solver's module this reads. */
export interface LiveSolver {
  solveLive(careerText: string): Promise<string>;
}

/** Loads the solver's chunk; takes nothing. */
export type LoadSolver = () => Promise<LiveSolver>;

/** Starts one run: the solved text to `show` once, or the failure to `fail` once; returns the stop. */
export function startLiveSolve(load: LoadSolver, career: string, show: (text: string) => void, fail: (error: unknown) => void): () => void {
  let stopped = false;
  // Started from a resolved promise, so a loader that throws synchronously
  // rejects into `fail` rather than escaping the press.
  Promise.resolve()
    .then(() => load())
    .then((solver) => (stopped ? null : solver.solveLive(career)))
    .then(
      (text) => {
        if (!stopped && text !== null) show(text);
      },
      (error: unknown) => {
        if (!stopped) fail(error);
      },
    );
  return () => {
    stopped = true;
  };
}

/** What the press writes: the Colophon's two state setters, and where a failure is logged. */
export interface LiveSolveSinks {
  readonly setSolved: (text: string) => void;
  readonly setRunning: (running: boolean) => void;
  readonly log: (error: unknown) => void;
}

/** The press and the unmount's stop. */
export interface LiveSolveTracker {
  press(career: string): void;
  stop(): void;
}

/** The tracker: one run at a time, its outcome written to `sinks`; nothing from a run in flight at `stop`, while a later press starts afresh. */
export function createLiveSolve(load: LoadSolver, sinks: LiveSolveSinks): LiveSolveTracker {
  let running = false;
  let stopRun: () => void = () => undefined;
  const settle = (): void => {
    running = false;
    sinks.setRunning(false);
  };
  return {
    press(career) {
      if (running) return;
      stopRun();
      running = true;
      sinks.setRunning(true);
      stopRun = startLiveSolve(
        load,
        career,
        (text) => {
          sinks.setSolved(text);
          settle();
        },
        (error) => {
          sinks.log(error);
          settle();
        },
      );
    },
    stop() {
      stopRun();
      running = false;
    },
  };
}
