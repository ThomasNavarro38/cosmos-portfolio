/**
 * The Colophon's two exhibits, fetched (5.1, AD-17): `career.json`, the
 * authored input, and `layout.generated.json`, the artifact derived from it,
 * each as the text the build published at a fixed path (`scripts/exhibits.ts`
 * emits them byte for byte; `exhibits.test.ts` holds the paths equal).
 *
 * Neither file is imported: a static import would put the data in this chunk
 * and hand over parsed values, not the bytes the visitor is meant to read. So
 * the text arrives over the network, same-origin, as emitted data, and no
 * backend. This module holds no `fetch` of its own: `colophon.tsx` hands it the
 * browser's — the one network reach under `src/`, which `maintenance.test.ts`
 * admits there alone, as `startExhibits(fetch, …)`.
 *
 * **Pure and injectable.** `fetch` and the abort signal arrive as arguments;
 * nothing here touches the DOM or React. Both requests start at once and carry
 * the signal. A response that is not `ok` rejects, naming its path, as a network
 * failure or an abort does, and so does an HTML page answered in place of the
 * file (a host's SPA rewrite) — what to do about it is `colophon.tsx`'s.
 */

/** The two files' names, career first: what the page calls each. */
export const EXHIBIT_NAMES = {
  career: 'career.json',
  layout: 'layout.generated.json',
} as const;

/**
 * The two published paths: each name under the site's base. The base is
 * spelled here because this module imports nothing; `exhibits.test.ts` holds
 * the paths equal to the ones `scripts/exhibits.ts` serves.
 */
export const EXHIBIT_PATHS = {
  career: `/cosmos-portfolio/${EXHIBIT_NAMES.career}`,
  layout: `/cosmos-portfolio/${EXHIBIT_NAMES.layout}`,
} as const;

/** The two files, as text, verbatim. */
export interface Exhibits {
  readonly career: string;
  readonly layout: string;
}

/** The slice of `fetch` this reads: a URL and a signal in, a response with `ok`, `status`, `headers` and `text()` out. */
export type FetchText = (path: string, init: { readonly signal: AbortSignal }) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

async function textAt(load: FetchText, path: string, signal: AbortSignal): Promise<string> {
  const response = await load(path, { signal });
  if (!response.ok) throw new Error(`${path} answered ${response.status}`);
  // A host's SPA rewrite answers a missing file with index.html and a 200;
  // drawn, the page would pass for the file. Only an HTML type is refused, so
  // a host serving JSON as text, or untyped, still reads.
  if (/^\s*text\/html\b/i.test(response.headers.get('content-type') ?? '')) throw new Error(`${path} answered a page, not the file`);
  return response.text();
}

/** Both exhibits, fetched together with `signal`; rejects if either fails. */
export async function loadExhibits(load: FetchText, signal: AbortSignal): Promise<Exhibits> {
  const [career, layout] = await Promise.all([textAt(load, EXHIBIT_PATHS.career, signal), textAt(load, EXHIBIT_PATHS.layout, signal)]);
  return { career, layout };
}

/**
 * The Colophon's effect, executable here rather than in a `.tsx` the runner
 * cannot load: start loading, hand the files to `show` or the one failure to
 * `fail`, and return the stop, which aborts the requests. After the stop
 * neither is called — an unmounted page is not updated, and its abort is not
 * reported as a failure. A failure aborts the other request too: once one file
 * is lost, the page draws neither, so the other need not finish downloading.
 */
export function startExhibits(load: FetchText, show: (exhibits: Exhibits) => void, fail: (error: unknown) => void): () => void {
  const controller = new AbortController();
  loadExhibits(load, controller.signal).then(
    (loaded) => {
      if (!controller.signal.aborted) show(loaded);
    },
    (error: unknown) => {
      if (controller.signal.aborted) return;
      controller.abort();
      fail(error);
    },
  );
  return () => controller.abort();
}
