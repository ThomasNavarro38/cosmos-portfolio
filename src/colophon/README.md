# src/colophon/

The how-it-was-made surface: shows raw authored input, the mapping rules, and the derived result side by side, and lazily loads the solver so a visitor can re-run it live.

**Imports:** `src/tokens/`. Never `generated/` and never `src/data/`: both files it exhibits reach it as emitted data (AD-17), published byte for byte by `scripts/exhibits.ts` at `/career.json` and `/layout.generated.json` and fetched at runtime. May reach `src/derive/` **only** through a dynamic import for the live re-run — never a static import, which would hoist the solver onto the entry path.
**Imported by:** `src/shell/` via dynamic import only.

## Files

| File | Role |
| --- | --- |
| `colophon.tsx` | The `/colophon` route's surface (4.2, 5.1), default-exported for `lazy()`. The default `Colophon`'s one effect is `startExhibits(fetch, setExhibits, logged)`, run once, its stop — which aborts the requests — the cleanup (no state update after it; audited in `colophon.test.ts`); a failed fetch is logged once with `console.error` and draws nothing more, an abort is silent, and there is no loading indicator and no retry. `ColophonPage({ exhibits })` draws `<h1>the model</h1>` and, once the files have arrived, each one's text verbatim in its own `<pre>`, career first — unset in 5.1 (no name, no measure, no syntax setting; 5.3 owns them). Imports React and `exhibits.ts` only — not the shell, not the motion preference. Reached only through `lazy(() => import('../colophon/colophon.tsx'))` in `src/shell/colophon-host.tsx`, so it is its own chunk (held off the entry graph, and holding only `src/colophon/` modules, by `scripts/bundle-assertion.test.ts`), and `/colophon` never requests `render-scene`. |
| `colophon.test.ts` | `ColophonPage` rendered through the render harness (`scripts/render.ts`), with and without exhibits, each check driven red against broken markup (a `<pre>` missing, the text altered, the order swapped). |
| `exhibits.ts` | Pure and injectable: `EXHIBIT_PATHS` (`/career.json`, `/layout.generated.json`); `loadExhibits(fetch, signal)` → `{ career, layout }` as text, both requested at once with the signal (a non-`ok` response rejects, naming its path); and `startExhibits(fetch, show, fail)`, the Colophon's effect: the files to `show` once, one failure to `fail`, and neither after the returned stop, which aborts. It holds no `fetch` itself: `colophon.tsx` hands it the browser's, the one network reach under `src/`, admitted there alone by `maintenance.test.ts` as `startExhibits(fetch, …)` — same-origin emitted data, no backend. |
| `exhibits.test.ts` | `loadExhibits` against a fake `fetch`: the happy path, a non-`ok` response, a rejection, both paths requested with the signal; `startExhibits`: shown once, a failure reported once, nothing after the stop; and `EXHIBIT_PATHS` equal to `scripts/exhibits.ts`'s published paths. |
