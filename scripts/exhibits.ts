/**
 * The exhibits (5.1, AD-17): the two raw files the Colophon shows, published as
 * emitted data — `src/data/career.json` as `career.json`, and
 * `generated/layout.generated.json` as `layout.generated.json`, at the root of
 * `dist/`, so each is served under the site's base (`scripts/site.ts`).
 *
 * **Byte for byte.** The visitor reads every byte the scene reads, so each file
 * is published as its exact bytes: read as a buffer, never parsed, re-serialised
 * or re-encoded. A parsed JSON import would lose those bytes and put the data in
 * a chunk; a copy under `public/` would be a second authored file. Neither is
 * done.
 *
 * **Fixed, unhashed names**, so a link to the raw file stays plain. On a build,
 * each is emitted as an asset at its `file`; in dev, a middleware serves the
 * same bytes at the same based path as `application/json`, ahead of Vite's SPA
 * fallback. The host serves a real file as it is, and a missing one with its
 * `404.html`, a 404.
 *
 * The Colophon fetches the paths (`src/colophon/exhibits.ts`, whose
 * `EXHIBIT_PATHS` its test holds equal to these); nothing imports either file
 * for it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { BASE } from './site.ts';

/** One exhibited file: its name at the root of `dist/`, and its source, relative to the repository root. */
export interface Exhibit {
  readonly file: string;
  readonly source: string;
}

/** The two exhibits, career first: the authored input, then the artifact derived from it. */
export const EXHIBITS: readonly Exhibit[] = [
  { file: 'career.json', source: 'src/data/career.json' },
  { file: 'layout.generated.json', source: 'generated/layout.generated.json' },
];

/** The path an exhibit is served at: its file under the base. */
export function exhibitPath(exhibit: Exhibit): string {
  return BASE + exhibit.file;
}

/** The served paths, in order. */
export const EXHIBIT_PATHS: readonly string[] = EXHIBITS.map(exhibitPath);

/** An exhibit's exact bytes, read from `root`. */
export function exhibitBytes(root: string, exhibit: Exhibit): Buffer {
  return readFileSync(join(root, exhibit.source));
}

/** The slice of a dev-server request the handler reads. */
export interface ExhibitRequest {
  readonly url?: string | undefined;
  readonly method?: string | undefined;
}

/** The slice of a dev-server response the handler writes. */
export interface ExhibitResponse {
  statusCode: number;
  setHeader(name: string, value: string | number): unknown;
  end(body?: Buffer): unknown;
}

/**
 * The dev handler: a `GET` or `HEAD` for an exhibit's served path (its query ignored)
 * is answered with that file's bytes, read fresh so an edit shows on reload,
 * as `application/json`; any other request is passed on, untouched. A source
 * not on disk (the layout not yet derived on a fresh checkout) answers a bare
 * 404 rather than throwing out of the middleware stack as a 500.
 */
export function exhibitHandler(root: string) {
  return (request: ExhibitRequest, response: ExhibitResponse, next: () => void): void => {
    const path = (request.url ?? '').split('?')[0];
    const exhibit = EXHIBITS.find((candidate) => exhibitPath(candidate) === path);
    if (exhibit === undefined || (request.method !== undefined && request.method !== 'GET' && request.method !== 'HEAD')) {
      next();
      return;
    }
    let bytes: Buffer;
    try {
      bytes = exhibitBytes(root, exhibit);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      response.statusCode = 404;
      response.end();
      return;
    }
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Content-Length', bytes.length);
    response.end(request.method === 'HEAD' ? undefined : bytes);
  };
}

/** The Vite plugin: emits both exhibits on a client build, and serves them in dev. */
export function exhibits(): Plugin {
  let root = '';
  let building = false;
  return {
    name: 'exhibits',
    // The SSR environment ships no page, so it emits nothing.
    applyToEnvironment: (environment) => environment.config.consumer === 'client',
    configResolved(config) {
      root = config.root;
      building = config.command === 'build';
    },
    configureServer(server) {
      server.middlewares.use(exhibitHandler(root));
    },
    buildStart() {
      if (!building) return;
      for (const exhibit of EXHIBITS) {
        this.addWatchFile(join(root, exhibit.source));
        this.emitFile({ type: 'asset', fileName: exhibit.file, source: new Uint8Array(exhibitBytes(root, exhibit)) });
      }
    },
  };
}
