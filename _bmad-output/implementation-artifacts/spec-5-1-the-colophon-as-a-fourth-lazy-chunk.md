---
title: 'The Colophon as a fourth lazy chunk'
type: 'feature'
created: '2026-10-20'
status: 'done'
baseline_revision: 'fc61e05592ace867df88704ae59d8e48c4a5f988'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      The default Colophon's effect wiring (startExhibits as the effect, its stop the cleanup, the files drawn from the held state) is held only by a source-text audit, because the render harness runs no effects.
    evidence: |-
      scripts/render.ts renders with react-dom/static, which runs no effects, so colophon.test.ts audits the effect as regexes (auditEffect) while startExhibits itself is executed in exhibits.test.ts; a semantically equivalent rewrite the regexes do not anticipate could ship a /colophon that fetches but never draws, or updates after unmount. The same limitation holds every effect in the codebase (cf. 4.10's executed-tracker approach); closing it needs a client-render path in the harness.
    location: >-
      src/colophon/colophon.tsx:43-45, src/colophon/colophon.test.ts (auditEffect), scripts/render.ts
    severity: medium
---

<intent-contract>

## Intent

**Problem:** The Colophon is a lazy chunk holding one `<h1>`. The raw files it must exhibit do not reach it: `career.json` is not in the build output and nothing fetches it. In the scene, `the model` is still plain text, so the Colophon can only be reached from the chart.

**Approach:** A Vite plugin emits `src/data/career.json` and `generated/layout.generated.json` byte for byte as fixed-name assets (`/career.json`, `/layout.generated.json`), and serves them in dev. The Colophon chunk fetches both and draws each verbatim in a `<pre>` under its `<h1>`. In the scene's corner chrome, `the model` becomes the router link to `/colophon`. The chunk split, the history-backed route with position restore, the chart's `the model` link and the `colophon → data` boundary row all already exist (4.2, 4.5, 1.8). This story pins them for the Colophon and changes none of them.

## Boundaries & Constraints

**Always:** each asset is byte-identical to its source file (AD-17: the visitor reads every byte). `src/colophon/` imports nothing from `src/data/` or `generated/`, and nothing statically from `src/derive/`. The colophon chunk holds only `src/colophon/` modules and reaches neither the scene, react-dom nor the mount (the existing `lazySurface` rule). The identity line's text stays `THOMAS NAVARRO · the model · the chart`, two lines in total. `the model` follows the same click rule as `the chart` (`followRoute`, `route-link.ts`), carries `href="/colophon"`, and takes the `chrome-route` class at rest. It never takes the offered class, because the offer is the chart link's alone. A failed fetch logs once and draws no `<pre>`. An unmount aborts the fetch.

**Block If:** emitting either file would require editing its source, or `public/_redirects` would shadow the asset paths.

**Never:** no static import of either JSON file into any chunk. No hand-copied file in `public/`. No styling, accessible name, heading, syntax setting, derivation table, prose or re-solve on the Colophon (5.2–5.5). No new copy. No change to the router, `route.ts` or the chart. No loading indicator or retry.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Visit `/colophon` | both assets served | `<h1>the model</h1>`, then the two files' text verbatim, career first, each in its own `<pre>` | — |
| Fetch fails | either response is not `ok`, or the network rejects | `<h1>` alone | `console.error` once; nothing thrown into React |
| Leave before load | unmount mid-fetch | no state update after unmount | the abort is swallowed silently |
| Scene → `the model` → Back | Rail at some Client stop | the scene remounts at the saved `scrollProgress`, not at First Paint | existing router restore |
| Ctrl- or middle-click `the model` | — | the browser opens `/colophon`, and the router does not navigate | `followRoute` |

</intent-contract>

## Code Map

- `src/colophon/colophon.tsx` -- placeholder `<h1>` (lines 11-13). Becomes the fetching surface, still the default export for `lazy()`.
- `src/colophon/README.md:5` -- says the colophon imports `generated/layout.generated.json`. That contradicts AD-17 (ARCHITECTURE-SPINE.md:167, "both files … reach it as emitted data"), so correct it.
- `src/shell/colophon-host.tsx` -- the lazy edge plus error boundary. Unchanged.
- `src/shell/corner-chrome.tsx:107-110` -- the identity `<p>` renders `{IDENTITY_LINE} · <a chart>`. Split it into `{IDENTITY_NAME} · <a model> · <a chart>` using `IDENTITY_NAME`/`IDENTITY_MODEL` from `chrome-model.ts:43-46`. The header (lines 35-43) and the "5.1" notes at `chrome-model.ts:23,40` and `src/shell/README.md:52,177` need updating.
- `src/shell/corner-chrome.test.ts:72-127` -- `chromeLink` expects exactly one link, and its break row `the model a link too` (line 123) must flip. Lines 250-370 hold `auditChrome` (it counts 4 elements and 2 `onClick`s, and requires the chart click regex) with mutation rows plus `CHROME_TARGETS`. Lines 175-220 hold the `followsRouteRule`/`chartLinkHandler` pattern to reuse for the model link.
- `src/render-fallback/chart.tsx` + `route-link.ts:chartLinks` -- the chart's `the model` link, which exists already (the Fallback carries the route).
- `src/shell/router.ts` -- `navigate` saves `{scrollProgress}` and pushes, and `popstate` restores. It is route-agnostic, so it already gives the return-to-stop behaviour. Read-only.
- `src/derive/boundaries.ts:183-187` plus `boundaries.test.ts:175` -- the `colophon` row (`never: ['data']`, `dynamicOnly: ['derive']`) and its test, which already exist.
- `scripts/bundle-assertion.test.ts:333-338` -- `colophon … holds the colophon alone` lists `['src/colophon/colophon.tsx']`, so it must widen to whatever `src/colophon/` modules it now holds. The app-build test (line 304) is where the emitted-asset and no-data-module assertions go.
- `vite.config.ts` -- `plugins: [react(), bundleAssertion()]`. Add the exhibits plugin here.
- `scripts/bundle-assertion.ts` -- the shape to copy for a build plugin in `scripts/`.
- `scripts/render.ts` -- the render harness (Vite with `configFile: false`, effects do not run), used by `App.test.ts` and `corner-chrome.test.ts`.
- `src/App.test.ts:109-243`, `src/identity-audit.test.ts:539` -- these read the Colophon as `<h1>the model</h1>` alone. Under the harness the effect does not run, so they should hold. Verify.
- `public/_redirects` -- `/* /index.html 200` is a non-forced rewrite, so real files win. No change.

## Tasks & Acceptance

**Execution:**
- `scripts/exhibits.ts` (+ `scripts/exhibits.test.ts`) -- export `EXHIBITS` (`/career.json` ← `src/data/career.json`, `/layout.generated.json` ← `generated/layout.generated.json`) and an `exhibits()` plugin. On build it emits each file as an asset at that fixed `fileName`, as its exact bytes. In dev it serves those bytes at the path with `application/json`. Tests cover the `EXHIBITS` paths and the dev handler (a matching path served byte-exact, any other path passed on).
- `vite.config.ts` -- add `exhibits()` to the plugins, with a one-line why in the existing comment.
- `src/colophon/exhibits.ts` (+ `src/colophon/exhibits.test.ts`) -- pure and injectable: `EXHIBIT_PATHS` and `loadExhibits(fetch, signal)` → `{ career, layout }` text. It rejects on a non-`ok` response. Tests run against a fake `fetch`: the happy path, non-ok, rejection, and that both paths are requested with the signal. They also assert `EXHIBIT_PATHS` equals `scripts/exhibits.ts`'s published paths.
- `src/colophon/colophon.tsx` -- a default `Colophon` that runs `loadExhibits` in an effect with an `AbortController` and hands the result to an exported presentational `ColophonPage({ exhibits })`, which draws the `<h1>` and, when it has the files, the two `<pre>`s. Update the header comment.
- `src/colophon/colophon.test.ts` -- render `ColophonPage` through the harness with and without exhibits, and drive each check red against broken markup (one `<pre>` missing, the text altered, the order swapped).
- `src/shell/corner-chrome.tsx` + `corner-chrome.test.ts` -- add the `the model` link. Update `chromeLink` to two links, model then chart, with only the chart's class following the offer. Flip the `the model a link too` break. Add the model link's click check (`followsRouteRule('the model', …, 'colophon')`). Extend `auditChrome`: 5 elements, 3 `onClick`s, the model click regex, and the model class being plain `chrome-route`. Add mutation rows and their targets.
- `scripts/bundle-assertion.test.ts` -- in the app build, assert that both assets are emitted at their fixed names byte-identical to their sources, that no chunk holds a module under `src/data/`, that `generated/layout.generated.json` is held only by the chunk holding `src/App.tsx` (its one importer, `App.tsx:66`), and that the colophon chunk holds only `src/colophon/` modules.
- `src/colophon/README.md`, `src/shell/README.md`, `chrome-model.ts` comments -- record the new state, and drop the "until 5.1" notes.

**Acceptance Criteria:**
- Given `npm run build`, when `dist/` is inspected, then `dist/career.json` and `dist/layout.generated.json` are byte-identical to their sources, and no JS chunk inlines `career.json`.
- Given the preview build in a browser, when `/` loads, then no request for `/career.json` is made. When `/colophon` is reached, the colophon chunk requests both files.
- Given the scene at a non-first Client stop, when the visitor clicks `the model` and then presses Back, then the URL is `/` again and the scene sits at the same stop.
- Given the chart (`/chart`), when its `the model` link is clicked, then `/colophon` is shown and Back returns to the chart.

## Spec Change Log

## Review Triage Log

### 2026-10-21 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 7 (high 1, medium 0, low 6)
- defer: 1 (medium 1)
- reject: 22 (medium 3, low 19)
- addressed_findings:
  - `[high]` `[patch]` `src/shell/router.test.ts` imported `findImports` from `../derive/boundaries.ts`, which `src/shell/` may not import, so `npm test` was red (boundaries.test.ts). The colophon import-list check moved to `src/derive/maintenance.test.ts`, which owns that reader; the router test keeps its reach and shape checks.
  - `[low]` `[patch]` The network admission matched `startExhibits(fetch, …)` by name only, so a local or renamed `startExhibits` could hand `fetch` anywhere. It now also requires `startExhibits` imported, unrenamed, from `./exhibits.ts` with no local declaration, with four new fixture rows; the orphaned `auditNetwork` doc block is back above its function.
  - `[low]` `[patch]` The dev handler threw a raw ENOENT (a 500) when a source was missing; it now answers a bare 404, and the wiring test asserts that.
  - `[low]` `[patch]` One failed request left the other downloading; `startExhibits` now aborts it on failure (reported once), with a new test.
  - `[low]` `[patch]` `vite.config.ts` said neither file is imported into a chunk; the layout is the App chunk's. It now says neither is in the Colophon's chunk, and `career.json` in none.
  - `[low]` `[patch]` The bundle mutations covered only `career.json`, and its re-serialised mutant had no guard that it changed the bytes; rows for the layout (dropped, altered, twice) were added and both use a trailing-space alteration that always differs. The failure message no longer says "alone".
  - `[low]` `[patch]` `scripts/exhibits.test.ts`'s header had a stray trailing paragraph; it is one list now.

## Design Notes

AD-17 says *both* exhibited files arrive as emitted data, and 5.3 needs the layout's exact bytes too. A parsed JSON import loses those bytes and would put the artifact in the colophon chunk. So both files are emitted now, through one plugin. Fixed, unhashed names keep the asset links plain for 5.3's optional "link to the raw file". In 5.1 the `<pre>`s are deliberately unset (no name, no measure, no setting). 5.3 owns their treatment, and they exist here so the chunk demonstrably fetches and draws real bytes.

## Verification

**Commands:**
- `npm test` -- expected: all pass (one environmental skip allowed)
- `npm run typecheck` -- expected: clean
- `npm run build` -- expected: gate green, the bundle assertion passes, entry within 4,000 bytes

**Manual checks (if no CLI):**
- `npm run preview`, then in the browser run the three AC walks above (no `/career.json` request on `/`, both requested on `/colophon`, scene → model → Back at the same stop, chart → model → Back).

## Auto Run Result

**Summary.** The Colophon fetches and draws its two exhibits. `scripts/exhibits.ts` is a Vite plugin that emits `src/data/career.json` and `generated/layout.generated.json` byte for byte at `/career.json` and `/layout.generated.json` and serves them in dev. `src/colophon/exhibits.ts` loads both with an abort signal, and `startExhibits` is the effect. `colophon.tsx` draws `<h1>the model</h1>`, then each file in a `<pre>`, career first. In the scene's corner chrome, `the model` is now the `followRoute` link to `/colophon` (plain `chrome-route`, never offered).

**Files changed.**
- `scripts/exhibits.ts`, `scripts/exhibits.test.ts`: the plugin (build emission, dev handler with a 404 on a missing source) and its tests.
- `vite.config.ts`: the plugin wired in; the comment explains why.
- `scripts/bundle-assertion.ts`: the entry's figure of record is now 3,057 (a shared `react` chunk).
- `scripts/bundle-assertion.test.ts`: the exhibits emitted once and byte-identical, no `src/data/` module in any chunk, the layout only in the App chunk, the colophon chunk holding only `src/colophon/`, all with mutations.
- `src/colophon/exhibits.ts`, `src/colophon/exhibits.test.ts`: the pure loader and the effect, run against fake `fetch`es.
- `src/colophon/colophon.tsx`, `src/colophon/colophon.test.ts`: the surface, `ColophonPage` rendered with and without exhibits, and an audit of the effect.
- `src/colophon/README.md`, `src/shell/README.md`, `src/shell/chrome-model.ts`, `src/shell/corner-chrome.css`: the docs record the new state.
- `src/shell/corner-chrome.tsx`, `src/shell/corner-chrome.test.ts`: the model link (rendered, click rule, source audit, mutations).
- `src/shell/chrome-model.test.ts`: the two parts make the line.
- `src/identity-audit.test.ts`: the chrome's identity constants.
- `src/shell/router.test.ts`: the colophon reach and shape checks.
- `src/derive/maintenance.test.ts`: the network audit now catches any `fetch` reference, with one admission bound to the imported `startExhibits`; the colophon import list.

**Review findings.** 7 patches applied (1 high, 6 low), 1 deferred (the effect wiring held only by a source audit, because the harness runs no effects; also in `deferred-work.md`), 22 rejected. Among the rejected: the layout staying in the App chunk (the scene's existing import; the literal reading would contradict "changes none of them"), cache headers on the unhashed names, `base` paths, and `<pre>` treatment and accessibility (owned by 5.3).

**Follow-up review recommendation.** `true`: one patched finding was high (score 3×0 + 1×6 = 6).

**Verification.**
- `npm run typecheck`: clean.
- `npm test`: 1522 of 1523 pass, one environmental skip.
- `npm run build`: gate green, "the entry graph reaches no banned module and is 3,057 of 4,000 bytes".
- `cmp dist/career.json src/data/career.json` and `cmp dist/layout.generated.json generated/layout.generated.json`: identical.

**Residual risks.**
- The browser walks of the ACs were not run in this pass: no `/career.json` request on `/`, scene → `the model` → Back at the same stop, and chart → `the model` → Back. They rest on the route-agnostic router's existing restore and on the handler-level click tests.
- The host's behaviour (that `_redirects`' non-forced rewrite lets the real files win) is argued, not tested.
