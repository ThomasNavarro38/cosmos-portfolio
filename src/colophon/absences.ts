/**
 * What is not there (5.4, FR-21, UX-DR53): the Colophon's statement of what
 * the site deliberately lacks — no backend, no CMS, no position overrides, no
 * per-entry camera work — and the entity-relative Shot contract. An absence
 * cannot be shown by rendering data, so this is the one place on the page
 * where prose does the work (EXPERIENCE.md §3, place 4).
 *
 * The copy is Thomas's ruling (Q1 (a), 2026-10-21), verbatim, in order:
 * `thesis`, `data`, `positions`, `shots`, `camera`. Each claim is checkable
 * against the two files drawn above it, and `absences.test.ts` checks it
 * against the shipped files: a claim the files falsify turns that test red.
 * The file names are written literally (they sit mid-sentence, and the closed
 * copy allowlist matches verbatim); the test pins them to `EXHIBIT_PATHS`.
 *
 * Import-free: `colophon.tsx` draws the heading and one paragraph per entry,
 * only once the exhibits have arrived.
 */

/** The statement's heading, an `<h2>` after the layout exhibit. */
export const ABSENCES_HEADING = 'what is not there';

/** The five paragraphs, in order. */
export const ABSENCES = { thesis: 'The layout is never authored; the camera is.', data: 'There is no backend and no CMS. The two files above are all the data there is: career.json is written by hand, and layout.generated.json is produced from it and never edited. This page fetched both from this site as static files.', positions: 'There are no position overrides. career.json holds no coordinate, and no entry can pin its own place: every position in layout.generated.json is solved from the three rules above.', shots: 'Shots name entities, never coordinates. Each shot gives a subject, an angle and a distance, so when a solve moves a Client, its shot moves with it.', camera: 'There is no per-entry camera work. Every shot’s subject is a Client; a Project is framed at its Client’s stop, never on its own.' } as const;
