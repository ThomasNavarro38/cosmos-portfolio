---
title: 'The render harness'
type: 'chore'
created: '2026-10-19'
status: 'done'
baseline_commit: 'ab8844b244e5fea4a6279154aa4e3c95da907fcc'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `node --test` cannot load `.tsx`, so what `App`, `FallbackHost`, `Chart` and `CornerChrome` render is checked only by exact-shape source regexes. A wrong prop that keeps the text passes, and a behaviour-preserving refactor fails. The deferral was widened five times (`deferred-work.md:960`, `:989`, `:1017`; `spec-4-5`, `spec-4-6` frontmatter; retro AV-1, `epic-4-retro-item-34`).

**Approach:** Add a test-only harness, `scripts/render.ts`. It loads shipped `.tsx` modules through Vite's own `ssrLoadModule` (inline config, no project config or plugins) and renders them with `react-dom/static`'s `prerenderToNodeStream`, which waits for the `lazy()` surfaces. Rendered tests then hold the four subjects. The regex clauses they now cover are retired, and these subjects' remaining audits move beside their modules.

## Boundaries & Constraints

**Always:**
- **No new dependency.** Use `vite`, `react` and `react-dom` as installed. No shipped `.tsx` or `.ts` changes, and every chunk byte-identical (`npm run build` entry 3,028 of 4,000).
- **The harness is test-only:**
  - It sits in `scripts/` beside `source-scan.ts` and `mutant.ts`, and only `*.test.ts` files import it.
  - It loads React and `react-dom/static` natively (`createRequire` from the repo root), the same instance the Vite-loaded modules import.
  - Vite runs with `configFile: false`, `cacheDir` under `os.tmpdir()`, and `server: { middlewareMode: true, hmr: false, ws: false }`, so it writes nothing under the repo.
  - One server per test file, closed in `after`.
- **Server snapshot.** `useSyncExternalStore` takes no `getServerSnapshot` in the shipped code (`App.tsx:73`, `corner-chrome.tsx:100-101`, `focus-panel.tsx:109`). The harness wraps React's `useSyncExternalStore` before any module loads, so a missing server snapshot is the client snapshot. Test-only; the shipped call shapes stay as their audits pin them.
- **No pending boundary.** A render returns fully resolved markup. An `onError`, a still-pending Suspense boundary or a timeout fails the test, naming the subject.
- **Module state through the same runner.** State a subject reads (`chart-offer.ts`'s latch, `navigationStore`) is driven through the module instance `ssrLoadModule` returns, and reset after each test.
- **Retiring a regex clause.** A clause is retired only when a rendered assertion holds the same guarantee and is shown red against a broken render (a fake router, a prop or a state). Its mutation rows go with it. Structural clauses (imports, hooks, listeners, `&&`/ternary bans, the lazy edge, boundary order, mount order) stay.
- **Moved audits.** The surviving audits of `App.tsx`, `fallback-host.tsx`, `colophon-host.tsx`, `chart.tsx` and `corner-chrome.tsx` move to `src/App.test.ts`, `src/shell/fallback-host.test.ts`, `src/shell/colophon-host.test.ts`, `src/render-fallback/chart.test.ts` and `src/shell/corner-chrome.test.ts`, with their mutation rows unchanged. The test count drops only by retired clauses.

**Ask First:**
- Changing any shipped file, for example adding `getServerSnapshot` to source instead of the harness wrap.
- Retiring a clause in a test file not named in the Code Map.

**Never:**
- jsdom, happy-dom, react-test-renderer or any new package. A browser-driven test.
- Rendering `mount.tsx` (it calls `createRoot`), or asserting on the R3F scene graph or anything inside `<Canvas>`.
- Touching the audits of `focus-panel.tsx`, `index-nav.tsx`, `scene.tsx`, `scene-host.tsx` or `identity-audit.test.ts`'s copy, page and chart rows. Their R clauses stay as follow-up.
- Weakening a mutation row instead of moving or retiring it.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Scene at home | `App` surface `scene`, route `home` | `main` holds `nav.index-nav`, `p.chrome-identity`, `div.scene-host` and the panel, in that order, each once; no `.chart` | N/A |
| Chart anywhere | surface `scene` or `fallback`, route `chart`; surface `fallback`, route `home` | `main` holds `.chart` alone: no `nav.index-nav`, `.scene-host` or `.chrome-identity` | N/A |
| Colophon | either surface, route `colophon` | `main` holds the one `h1` alone | N/A |
| Chart links, capable | `Chart`, `chartLinks('scene', nav)` | `h1` holds `a[href="/colophon"]` `the model`; `p.chart-routes` holds one `a[href="/"]` `the scene` | N/A |
| Chart links, incapable | `chartLinks('fallback', nav)` | `p.chart-routes` holds no `a` | N/A |
| Chart anchors | committed artifact | every index `a[href^="#"]` names an `id` in the same markup; every Client and Project id appears once | N/A |
| Chrome before offer | `CornerChrome`, unlatched | `a.chrome-route[href="/chart"]` `the chart`, class exactly `chrome-route` | N/A |
| Chrome after offer | three `sampleFrame(2)` gaps latch | same `href` and text, class `chrome-route chrome-route-offered` | latch reset after |
| Host passes through | `FallbackHost` with surface `fallback` | the chart without `the scene`; with `scene`, with it | N/A |
| Broken subject | a render that throws or never resolves | the test fails, naming the subject | onError / timeout |

</frozen-after-approval>

## Code Map

- **Spike (2026-10-19), all passing:**
  - `createServer({ root, configFile: false, cacheDir: tmpdir, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] } })`, then `ssrLoadModule('/src/App.tsx')`, rendered App on all four (surface, route) pairs in about 1.5 s.
  - Vite's own oxc transform compiles the TSX without `@vitejs/plugin-react`.
  - `runnerImport` fails on CSS (`vite:css-post`), and `ssrLoadModule('react-dom/server')` fails on `require`; load React natively instead.
  - The first prerender of a lazy surface streams it as `<template id="B:0">` plus a hidden `S:0` div. A second render, once the lazy payload has resolved, is inline. The harness must normalise this, for example by rendering until no `B:`/`S:` segment remains, at most twice.
- `scripts/source-scan.ts`, `scripts/mutant.ts` -- sibling test helpers; copy their header style. `mutant.ts` writes `.mts` and cannot mutate `.tsx`, so rendered red rows use a fake router, wrong props or state, not source mutants.
- `scripts/bundle-assertion.test.ts:13` -- the only precedent for driving Vite from a test.
- `src/App.tsx:68-104` -- `App({ surface, router })`; fake router `{ route: () => r, subscribe: () => () => {}, navigate: () => true, dispose() {} }`.
- `src/shell/panel-model.test.ts:1424` `auditMount`, `:1482` (40 rows) -- R clauses (nesting, order, each once, host alone) are retired; S clauses and their rows move to `src/App.test.ts`.
- `src/render-scene/scene-model.test.ts:2596` -- App's `.scene-host` after the nav, absent off-scene. The R half is retired, the S half stays in place (a scene-model concern).
- `src/shell/router.test.ts:810-911` -- `auditColophonHost` (S) and `auditFallbackHost` (about 3 R rows) move to the two new host test files.
- `src/render-fallback/chart-model.test.ts:797` "draws the model", `:839` `auditChrome`, `:879` `auditGlyphMarkup` -- mostly R. Retire what the matrix rows hold; the rest moves to `chart.test.ts`. `auditPurity` and `auditThin` (`:671`, `:765`) stay, since they are directory scans of `render-fallback/`.
- `src/shell/chrome-model.test.ts:464` `auditChrome`, `:655` (71 rows, CHROME_TARGETS at `:581`) -- retire the `href`/class/text/one-`a` clauses; the rest moves to `corner-chrome.test.ts`. `chartRouteClass` and the stylesheet audits stay (they pin `chrome-model.ts` and the CSS).
- `src/shell/chart-offer.ts` -- `sampleFrame`, `resetChartOfferForTest`; three deltas over `MAX_FRAME_SECONDS` latch.
- `src/shell/README.md`, `src/render-fallback/README.md`, root `README.md` test rows -- name the new files and the harness.
- `_bmad-output/implementation-artifacts/deferred-work.md:960`, `:989`, `:1017` -- close what this holds. `:989`'s mount half (mount.tsx, entry) stays open and is narrowed to that.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/render.ts` + `scripts/render.test.ts` -- the harness, `renderer()` → `{ load(path), render(element), close() }`. Its own tests come RED first: a trivial component renders, a lazy one renders inline, a throwing one rejects naming it, a never-resolving one times out, and nothing is written under the repo.
- [x] `src/App.test.ts` -- the scene, chart and colophon matrix rows, each red against a fake router returning a wrong route; plus the moved S half of `auditMount`.
- [x] `src/shell/fallback-host.test.ts`, `src/shell/colophon-host.test.ts` -- the host passes-through row; the moved host audits.
- [x] `src/render-fallback/chart.test.ts` -- the links and anchors rows; the moved non-retired chart audits.
- [x] `src/shell/corner-chrome.test.ts` -- the before and after offer rows; the moved S half of `auditChrome`.
- [x] `panel-model.test.ts`, `router.test.ts`, `chart-model.test.ts`, `chrome-model.test.ts`, `scene-model.test.ts` -- remove what was retired or moved.
- [x] READMEs and `deferred-work.md` -- the rows and the closures.

**Acceptance Criteria:**
- Given `npm test`, when it runs, then every matrix row is a passing rendered test, and each was seen red against a broken render.
- Given the retired clauses, when they are listed in the review, then each names the rendered test that now holds it.
- Given `npm test` twice in a row, when the tree is inspected, then nothing under the repo changed.
- Given `npx tsc --noEmit` and `npm run build`, when run, then both pass, with the entry at 3,028 of 4,000 bytes and every chunk hash unchanged from the baseline.

## Spec Change Log

## Design Notes

**Why Vite rather than a JSX transform.** The modules import CSS, JSON and `.ts`. Vite's SSR runner resolves all three as the build does, so a rendered test sees the shipped module graph and no second transform. `react` stays external (Node's own), which is why the harness and the components share one React.

**Why wrap `useSyncExternalStore`.** A server render demands `getServerSnapshot`. Adding it to four call sites changes shipped code and every audit that pins the call shape. A static render has no hydration, so "server snapshot = client snapshot" is exactly what a test needs.

## Verification

**Commands:**
- `npm test` -- expected: all pass; the count changes only by added rendered tests and retired clauses, both listed.
- `npx tsc --noEmit` -- expected: clean.
- `npm run build` -- expected: gate and bundle assertion pass, entry 3,028 of 4,000 bytes, chunk names unchanged.
- `git status --short` after `npm test` -- expected: only the story's own edits.

## Implementation Notes

**Harness findings, beyond the spike.**
- React 19.2 outlines a large *resolved* boundary (the chart's ~25 KB), so a second prerender is still out of line. `render()` therefore performs React's `$RC` completion on the markup (`inlineSegments`: each hidden `S:n` segment put back in its `B:n` placeholder, React's runtime scripts dropped), and re-renders once only if a boundary is still out of line; anything left, a `$?`/`$!` boundary or an unhandled `<script>` fails naming the subject.
- `scripts/render.ts` also carries a small markup reader (`parseMarkup`, `queryAll`, `queryOne`, `textOf`), so the rendered rows assert structure, not strings, with no DOM package.
- Vite runs with `server.watch: null` beside the spec's `middlewareMode`, `hmr: false`, `ws: false`, so no watcher is started over the repo.
- `node_modules/.vite-temp/` is written by `bundle-assertion.test.ts` (Vite bundling the shipped `vite.config.ts`), in parallel; the harness's no-write snapshot skips that one directory and says why.

**Retired clauses, and the rendered test now holding each.**
- `panel-model.test.ts` `auditMount` (removed; its structural clauses moved to `src/App.test.ts` `auditMount`): FocusPanel mounted once; the panel after the scene; CornerChrome mounted once (narrowed to "handed the router alone"); the order index, chrome, scene host, panel; App takes `surface` and `router` as props; `shown = surfaceOf(route, surface)` (the matrix covers every route × surface pair); SceneHost once (narrowed to "handed the artifact"); the Colophon branch alone; the fallback branch alone, handed the artifact, surface and router; both branches before the scene's elements — held by `src/App.test.ts` "scene at home…", "the chart anywhere…", "the Colophon…", red in "…red against a router returning the wrong route", "…red against the wrong machine" and "…red against a broken render". 26 of its 40 rows retired with them; the 14 the structural audit still rejects moved unchanged. The clause "the surface is read other than by `surfaceOf` and the fallback host" is structural (a `surface` handed to another host never shows in markup) and moved rather than retired (review patch 7), with a new row handing `surface={surface}` to SceneHost and a second-read case asserting it alone.
- `scene-model.test.ts` "App.tsx imports the scene host and renders it after the index": `<SceneHost` rendered, once, `shown = surfaceOf(…)`, the colophon and fallback branches returning before it, the index before it — held by `src/App.test.ts` (same rows). The import, the no-gating and the no-static-renderer clauses stay in place.
- `router.test.ts` `auditFallbackHost` (moved to `src/shell/fallback-host.test.ts`): the chart handed the artifact and the links; the host taking the artifact, surface and router as props; `chartLinks(surface, router.navigate)` (narrowed to `chartLinks(…, router.navigate)`, the click) — held by `fallback-host.test.ts` "the host passes through…", red in "the pass-through check is red…". Rows retired: the artifact dropped, the links dropped, the links on a fixed surface, the surface not a prop. One row added for the narrowed clause (the links bound to another `navigate`). `auditColophonHost` moved to `colophon-host.test.ts` whole, rows unchanged.
- `chart-model.test.ts` "draws the model", `auditChrome` (moved to `src/render-fallback/chart.test.ts`): the default export's signature, the one `<h1>`, the section's and the record's `id`, the index link's `href` — held by "the chart's anchors…" and the links rows; the chrome-row shape (narrowed to each link's click), the one-`<h1>` clause and the written-path ban — held by "the chart's links on a capable/incapable machine…" and "every href and text drawn is the link's own…", red in "the links check is red…" and "the anchors check is red…". Rows retired: `href="/colophon"` written, `the model` written, the routes mapped from the model link, a second `<h1>`; two rows retargeted to surviving clauses (IDENTITY_LINE whole → its own clause; the model's click → the click clause). `auditGlyphMarkup` moved whole.
- `chrome-model.test.ts` `auditChrome` (moved to `src/shell/corner-chrome.test.ts`): the identity line's shape, the chart link's class and `href` (narrowed to its click), one `<a>`/one `href`, and the strings-written-in-the-renderer ban — held by "before the offer…", "after the offer…", red in "the chrome check is red against the other state and against broken markup". Rows retired: the identity a link, the model a link too, the chart link dropped / a written path / written out / a button, the identity a button / written out, the class written out, the class always offered. Two rows retargeted to the narrowed click clause (navigating on every click, to the colophon).

**Left as it was.** The headers of `chart.tsx` and `corner-chrome.tsx` still say `chart-model.test.ts` and `chrome-model.test.ts` scan them; correcting a shipped file is Ask First, so it is left for a follow-up. A server render cannot reach a host's failure path (no error boundary runs on the server) or the chart's fragment ref (refs attach on the client); both stay source audits, recorded in `deferred-work.md`.

**Review patches (7, applied).** `snapshot()` compares size and SHA-256 of contents, not mtimes (a parallel suite rewriting `generated/layout.generated.json` with identical bytes no longer fails it; a new file, a changed byte or a cache write still does — new test, red on mtimes first); `readAll` decodes once over all chunks (new test, red on a `·` split across chunks first); the selector reader refuses an empty or dangling selector and an empty `^=` value matches nothing (new test, red first); the chart row's dead `the chrome is not one row` alternative dropped; every rendered suite registers `after(() => started?.close())` before the server starts, so a failed start is not masked; the colophon host's break rows carry the must-apply guard; the surface clause restored (above, red without it first).

**Verification.** `npm test` twice: 1,460 tests, 1,459 pass, 1 skipped (the pre-existing symlink case), `git status` unchanged between runs. `npx tsc --noEmit` clean. `npm run build`: gate and bundle assertion pass, entry 3,028 of 4,000 bytes, every emitted chunk file name identical to a build of the baseline commit.

## Review Triage Log

### 2026-10-19 — Review pass
- Layers run: edge-case-hunter, verification-gap. **blind-hunter did not run**: the agent was stopped from the user's side and is recorded as cancelled.
- intent_gap: 0
- bad_spec: 0
- patch: 7 (medium 1, low 6)
- defer: 0
- reject: 11
- addressed_findings:
  - `[medium]` `[patch]` The no-write check compared mtimes, so `artifact.test.ts`'s identical rewrite of `generated/layout.generated.json`, run in parallel, could fail it. It now compares size plus SHA-256, with a temp-tree test.
  - `[low]` `[patch]` Stream chunks were decoded one at a time. They are now decoded once, from collected Buffers, with a split-`·` test.
  - `[low]` `[patch]` A dead message alternative, from a retired clause, was dropped in `chart.test.ts`.
  - `[low]` `[patch]` `queryAll` now throws on an empty or dangling selector, and an empty `^=` matches nothing.
  - `[low]` `[patch]` `after()` hooks close the server only if it started, so a failed start is reported as itself.
  - `[low]` `[patch]` `colophon-host.test.ts` break rows now carry the "must apply" guard.
  - `[low]` `[patch]` The structural clause "surface read only by `surfaceOf` and the fallback host" was restored in `App.test.ts` `auditMount`, with a `SceneHost` row. `shown = surfaceOf(...)` stays retired, since the matrix covers all six route × surface pairs.

## Suggested Review Order

**The harness**

- Entry point: one Vite server with an inline config, so no project config, plugins or repo writes.
  [`render.ts:214`](../../scripts/render.ts#L214)

- React's `useSyncExternalStore`, wrapped before any module loads: server snapshot = client snapshot.
  [`render.ts:77`](../../scripts/render.ts#L77)

- Prerender waits for lazy surfaces; `onError` and a timeout name the subject.
  [`render.ts:188`](../../scripts/render.ts#L188)

- React 19.2 outlines large resolved boundaries, and this puts each segment back inline.
  [`render.ts:117`](../../scripts/render.ts#L117)

- The markup reader the tests assert through, with no DOM package.
  [`render.ts:389`](../../scripts/render.ts#L389)

**The rendered subjects**

- App per (route, surface), each check red against a router returning the wrong route.
  [`App.test.ts:134`](../../src/App.test.ts#L134)

- The chart's links follow the machine, and every anchor resolves in the same markup.
  [`chart.test.ts:100`](../../src/render-fallback/chart.test.ts#L100)

- The offer latch, driven through the module instance Vite loaded and reset after each test.
  [`corner-chrome.test.ts:94`](../../src/shell/corner-chrome.test.ts#L94)

- The host hands its surface through to the chart.
  [`fallback-host.test.ts:71`](../../src/shell/fallback-host.test.ts#L71)

**Moved structural audits**

- What a render cannot see stays a source audit, now beside its module.
  [`corner-chrome.test.ts:141`](../../src/shell/corner-chrome.test.ts#L141)

- The lazy edge and boundary order, moved from `router.test.ts`.
  [`fallback-host.test.ts:108`](../../src/shell/fallback-host.test.ts#L108)

**Peripherals**

- The harness's own red-first tests: lazy, throw, timeout, snapshot wrap, no writes.
  [`render.test.ts:73`](../../scripts/render.test.ts#L73)
