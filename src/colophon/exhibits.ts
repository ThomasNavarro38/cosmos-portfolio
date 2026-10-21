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
 * failure or an abort does — what to do about it is `colophon.tsx`'s.
 */

/** The two published paths, career first. */
export const EXHIBIT_PATHS = {
  career: '/career.json',
  layout: '/layout.generated.json',
} as const;

/** The two files, as text, verbatim. */
export interface Exhibits {
  readonly career: string;
  readonly layout: string;
}

/** The slice of `fetch` this reads: a URL and a signal in, a response with `ok`, `status` and `text()` out. */
export type FetchText = (path: string, init: { readonly signal: AbortSignal }) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
}>;

async function textAt(load: FetchText, path: string, signal: AbortSignal): Promise<string> {
  const response = await load(path, { signal });
  if (!response.ok) throw new Error(`${path} answered ${response.status}`);
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
