/**
 * The host's copies of the page (GitHub Pages, ruling 2026-10-29): Pages has
 * no rewrite rule, so a direct load of `/chart` or `/colophon` (a shared link,
 * a refresh) finds a real file instead. The build writes `index.html` again as
 * each route's directory index, so the route answers 200 after Pages' slash
 * redirect, and as `404.html`, which Pages serves with a 404 for any path it
 * has no file for: the page then resolves an unknown path to home, as
 * `resolveRoute` does, while a stale chunk or `/favicon.ico` gets an honest 404.
 *
 * Every asset URL in the page is absolute under the base, so a copy one
 * directory down loads the same files. The copies are emitted after Vite has
 * written the page (`enforce: 'post'`), byte for byte.
 */

import type { Plugin } from 'vite';
import { ROUTE_PATHS } from '../src/shell/route.ts';

/** The copies, in order: each route but home as its directory's index, then the not-found page. */
export const PAGE_COPIES: readonly string[] = [
  ...Object.values(ROUTE_PATHS)
    .filter((path) => path !== '/')
    .map((path) => `${path.slice(1)}/index.html`),
  '404.html',
];

/**
 * The Vite plugin: emits `PAGE_COPIES`, each holding `index.html`'s source. A
 * build that writes no page at all (the bundle assertion's fixture builds, an
 * SSR environment) is left alone; one that writes pages but not `index.html`
 * fails.
 */
export function pages(): Plugin {
  return {
    name: 'pages',
    enforce: 'post',
    applyToEnvironment: (environment) => environment.config.consumer === 'client',
    generateBundle(_options, bundle) {
      const pagesWritten = Object.values(bundle).filter((file) => file.type === 'asset' && file.fileName.endsWith('.html'));
      if (pagesWritten.length === 0) return;
      const page = bundle['index.html'];
      if (page === undefined || page.type !== 'asset') throw new Error(`pages: the bundle writes ${JSON.stringify(pagesWritten.map((file) => file.fileName))} but no index.html to copy`);
      for (const fileName of PAGE_COPIES) this.emitFile({ type: 'asset', fileName, source: page.source });
    },
  };
}
