/**
 * Where the site is published: GitHub Pages, as a project site under the
 * repository's name (Thomas, 2026-10-29). Node-side only — read by
 * `vite.config.ts`, the build plugins and the tests, never shipped.
 *
 * Shipped code cannot read this module's value from the environment (NFR-6
 * bans every `import.meta.env` read), so the two modules that must import
 * nothing, `src/shell/route.ts` and `src/colophon/exhibits.ts`, spell the base
 * themselves; their tests hold each spelling equal to `BASE`.
 */

/** The path every URL of the site lives under, with both slashes. */
export const BASE = '/cosmos-portfolio/';

/** The production origin. */
export const ORIGIN = 'https://thomasnavarro38.github.io';

/** The site's own absolute URL: the origin and the base. */
export const SITE_URL = ORIGIN + BASE;
