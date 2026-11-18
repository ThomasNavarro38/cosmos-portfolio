/**
 * What a Star and a Planet look like (8.2, 9.5, AD-21): the Colophon's
 * statement that a Body's appearance, a Planet's map and a Star's colour, is
 * assigned and encodes nothing, and the credit for every map the site serves.
 *
 * **The copy** is Thomas's ruling (2026-11-16, Q1, architecture memlog entry
 * 97), verbatim: the `<h2>`, the one statement, the lead-in, and the text of
 * each entry's link. The heading and the statement are superseded, verbatim, by
 * Proposal 7 (sprint-change-proposal-2026-11-17.md), shipped in 9.5. It sits
 * in the Colophon's existing copy place (EXPERIENCE.md §3, place 4), not a new
 * one.
 *
 * **The entries** are the map library's, one per entry, in library order, worn
 * by a Planet or not: every committed map is publicly served. Each reads
 * `<id>.webp: <credit>, <licence>.` (`creditLine`), then a link reading
 * `source` whose `href` is the entry's `sourceUrl`. No URL is written in
 * `src/colophon/`: every one arrives with the library. A licence that already
 * ends in `.` is given no second one.
 *
 * **The load** (ruling Q4: on open), executable here rather than in a `.tsx`
 * the runner cannot load, as `startLiveSolve` is: `load()` (in `colophon.tsx`,
 * the one dynamic import of `src/derive/live.ts`, which re-exports the
 * library), then its `MAP_LIBRARY` to `show` exactly once, or the one failure
 * to `fail` exactly once, and neither after the returned stop: an unmounted
 * page is not updated. A loader that throws synchronously, or a module with no
 * library list, is a failure like any other.
 *
 * Import-free: the loader arrives as an argument, so this module never names
 * the solver or the library, and nothing here touches the DOM or React.
 */

/** The ruled copy: the heading, the statement, the lead-in and each entry's link text. The heading and the statement are Proposal 7's (sprint-change-proposal-2026-11-17.md), shipped in 9.5. */
export const APPEARANCE = { heading: 'what a Star and a Planet look like', statement: "A Body's colour is not data. Each Planet is assigned one of the maps below, and each Star one of five colours, from its ID alone, by a fixed rule in the solver, so colour and texture encode nothing: recency is how brightly a Star shines and a Planet's rim glows, the subject is the one that turns white, and Deep or Shallow is the ring and the moon.", lead: 'Every map this site serves, worn or not:', source: 'source' } as const;

/** The slice of a map library entry the credits read, declared structurally. */
export interface CreditEntry {
  readonly id: string;
  readonly sourceUrl: string;
  readonly licence: string;
  readonly credit: string;
}

/** The slice of the solver's module the credits read. */
export interface CreditLibrary {
  readonly MAP_LIBRARY: readonly CreditEntry[];
}

/** Loads the solver's chunk; takes nothing. */
export type LoadCredits = () => Promise<CreditLibrary>;

/** One entry's text before its link: `<id>.webp: <credit>, <licence>`, closed by one `.`. */
export function creditLine(entry: CreditEntry): string {
  const line = `${entry.id}.webp: ${entry.credit}, ${entry.licence}`;
  return line.endsWith('.') ? line : `${line}.`;
}

/** Starts the load: the library to `show` once, or the failure to `fail` once; returns the stop. */
export function startCredits(load: LoadCredits, show: (library: readonly CreditEntry[]) => void, fail: (error: unknown) => void): () => void {
  let stopped = false;
  // Started from a resolved promise, so a loader that throws synchronously
  // rejects into `fail` rather than escaping the effect.
  Promise.resolve()
    .then(() => load())
    .then((module) => {
      if (!Array.isArray(module.MAP_LIBRARY)) throw new TypeError('the solver chunk carries no MAP_LIBRARY list');
      return module.MAP_LIBRARY;
    })
    .then(
      (library) => {
        if (!stopped) show(library);
      },
      (error: unknown) => {
        if (!stopped) fail(error);
      },
    );
  return () => {
    stopped = true;
  };
}
