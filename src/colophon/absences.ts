/**
 * What is not there (5.4, FR-21, UX-DR53): the Colophon's statement of what
 * the site deliberately lacks — no backend, no CMS, no position overrides, no
 * per-entry camera work — and the entity-relative Shot contract. An absence
 * cannot be shown by rendering data, so this is the one place on the page
 * where prose does the work (EXPERIENCE.md §3, place 4).
 *
 * The copy is Thomas's ruling (Q1 (a), 2026-10-21), verbatim, in order:
 * `thesis`, `data`, `positions`, `shots`, `camera` — the thesis and the
 * positions paragraph re-ruled 2026-10-29 (Epic 5 item 40, AV-3 (b), (c)): the
 * thesis is scoped to the two files on the page (of the two, only career.json
 * is authored; layout.generated.json, shots included, is the solver's), and
 * the positions are the solver's, not "the three rules'". Each claim is
 * checkable against the two files drawn above it, and a test holds each one
 * against the shipped files, a claim the files falsify turning it red:
 * - `absences.test.ts`: the file names and "the two files above" (both
 *   paragraphs' count, `EXHIBIT_PATHS`), "fetched … from this site", "holds no
 *   coordinate" and the shot and camera paragraphs;
 * - `src/derive/colophon-claims.test.ts`: "only career.json is authored",
 *   "solved from it, shots included" and "every position … computed by the
 *   solver" — the committed layout is `solveLive(career.json)` byte for byte,
 *   its shots `buildShots` of career's entity graph, and career.json holds no
 *   `shots` key and no shot record.
 * The file names are written literally (they sit mid-sentence, and the closed
 * copy allowlist matches verbatim); the test pins them to `EXHIBIT_PATHS`.
 *
 * Import-free: `colophon.tsx` draws the heading and one paragraph per entry,
 * only once the exhibits have arrived.
 */

/** The statement's heading, an `<h2>` after the layout exhibit. */
export const ABSENCES_HEADING = 'what is not there';

/** The five paragraphs, in order. */
export const ABSENCES = { thesis: 'Of the two files above, only career.json is authored: layout.generated.json is solved from it, shots included.', data: 'There is no backend and no CMS. The two files above are all the data there is: career.json is written by hand, and layout.generated.json is produced from it and never edited. This page fetched both from this site as static files.', positions: 'There are no position overrides. career.json holds no coordinate, and no entry can pin its own place: every position in layout.generated.json is computed by the solver from career.json, never written by hand.', shots: 'Shots name entities, never coordinates. Each shot gives a subject, an angle and a distance, so when a solve moves a Client, its shot moves with it.', camera: 'There is no per-entry camera work. Every shot’s subject is a Client; a Project is framed at its Client’s stop, never on its own.' } as const;
