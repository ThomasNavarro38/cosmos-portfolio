---
title: 'One-click movement between surfaces'
type: 'feature'
created: '2026-10-19'
status: 'done'
baseline_commit: '218ef33eab0575578a60563997cc9dd8844f957e'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/mockups/keyscreen-fallback.html'
warnings:
  - oversized
deferred:
  - summary: >-
      The 4.5 surface links (the chart, the model, the scene) and their wiring through App, FallbackHost, Chart and CornerChrome are checked only by source-text regexes; nothing renders them or clicks a mounted anchor.
    evidence: |-
      The pure layer (followRoute, chartRoutes, chartLinks) is executed in route-link.test.ts, but auditChrome (chart-model.test.ts, chrome-model.test.ts), auditFallbackHost (router.test.ts) and auditMount (panel-model.test.ts) match text only; node --test cannot load .tsx. A wrong prop or a rebound navigate that keeps the audited text would pass. This widens the existing 4.2/4.3 render deferrals (deferred-work.md "What App renders per route" and "Nothing renders Chart"); a renderToStaticMarkup script test over Chart with chartLinks('scene'|'fallback') would close it.
    location: >-
      src/shell/fallback-host.tsx, src/render-fallback/chart.tsx, src/shell/corner-chrome.tsx, src/App.tsx
    severity: medium
---

<intent-contract>

## Intent

**Problem:** The router (4.2) has no caller of `navigate`. A scene visitor cannot reach the flat chart, a chart visitor on a capable machine cannot reach the scene, and the chart's `THOMAS NAVARRO · the model` heading is not a route to the Colophon (FR-22, UX-DR49, UX-DR54). The plates also carry no date at all, so the "preferred surface for date navigation" (EXPERIENCE.md §4.6) cannot be navigated by date.

**Approach:** Add three real links, each one `router.navigate` call:
- **the chart**, appended to the scene's left-top identity line (Thomas's ruling Q1, 2026-10-19);
- **the model**, in the chart's heading, to the Colophon;
- **the scene**, on the chart's route line, only where this machine's surface is the scene.

Close the 4.2 history deferrals that the first `navigate` caller makes reachable. To fit the entry budget, split `route.ts` out of `router.ts` (ruling Q3). Give each Client a derived date `span` in the artifact and draw it beside the Client's name on both plates (ruling Q2a).

## Boundaries & Constraints

**Always:**
- **Links are `<a href>`.**
  - Each `href` is the route's canonical `ROUTE_PATHS` path.
  - A primary click (`button === 0`, no ctrl/meta/shift/alt, not `defaultPrevented`) calls `preventDefault()` and then `navigate(to)`. Any other click is left to the browser, so a new tab works.
  - That rule is one pure, node-tested function in `src/shell/`. No `.tsx` file holds it.
- **Copy:** the new strings are `the chart` and `the scene`. `the model` already exists inside `IDENTITY_LINE`.
  - Never `fallback`, `list`, `2D`, `lite`, `version`, or an apology.
  - The new strings join `VISIBLE_COPY` in `src/identity-audit.test.ts`.
- **Scene chrome (Q1):**
  - The left-top line reads `THOMAS NAVARRO · the model · the chart`. Only `the chart` is a link; `the model` stays text in the scene until 5.1.
  - The right-bottom slot and its three states are untouched. Still exactly two lines.
  - The link takes `pointer-events: auto` on a line that otherwise takes none.
  - Its treatment mirrors `.chrome-slot-control`: no box, inherited type and ink, `ink-prose` on hover/focus, a hairline underline on `:focus-visible`, a forced-colours outline.
  - It is present in every state: Rail, free flight, and Focused (the panel covers the right edge, never the left-top).
- **Chart chrome:** the heading line plus one route line, opposite each other in flow (the mock's `.fb-chrome`), stacked at ≤ 640px.
  - The heading's text content is still exactly `IDENTITY_LINE`, with `the model` an `<a>` to `/colophon`.
  - The route line holds `the scene` on a capable machine and nothing on surface `fallback`. A phone or a machine without WebGL2 is shown the chart at `/` itself.
- **Chart boundaries:** `chart.tsx` stays a scanned mapping. Links reach it as props built in `src/shell/fallback-host.tsx`, each `{ key, text, href, follow }`. It imports no router or store and reads no machine surface.
- **Focus is not a route.** Leaving the scene releases nothing. `mode`, `focusedProjectId` and `scrollProgress` survive the round trip.
- **History (closes the 4.2 deferrals):**
  - The current entry's `{ scrollProgress }` is kept current while the store changes. It is written on a trailing schedule of at most one write per `SAVE_INTERVAL_MS = 300`, the scheduler injected through `RouteHistory`, so a Back/Forward away from any route leaves that entry right.
  - `navigate` pushes its entry with the current `{ scrollProgress }`, so no pushed entry carries `null`.
  - Every `replaceState`/`pushState` the router makes is caught and logged. A failed push leaves the route and URL unchanged, and nothing throws into a click.
  - `router.ts` still imports nothing but `route.ts`, and still writes the store only through its position hooks.
- **Q3:** `src/shell/route.ts` holds `Route`, `ROUTE_PATHS` and `resolveRoute` only, and is the entry's only router import. `createRouter`, `surfaceOf` and `browserHistory` leave the entry graph. The entry stays ≤ `ENTRY_BUDGET_BYTES` (unchanged, 4,000), and the bundle assertion's entry module list names `route.ts` instead of `router.ts`.
- **Q2a: each artifact Client carries `span: { start, end }`.**
  - `start` is the earliest of its Projects' `duration.start`. `end` is the latest `duration.end`, or `null` when any Project is ongoing.
  - It is derived in `src/derive/entities.ts`, emitted by `artifact.ts`, required by the schema, and refined against the Projects. `SCHEMA_VERSION` becomes 9, with the history comment extended.
  - The chart reads it and never aggregates Project dates itself (AD-3).
  - The chart shows it as years: `2016 – 2017`, a single year when both are equal (`2019`), and `2024 –` while ongoing.
  - It is a `chart-label-span` label in `scene-label-secondary` type at `ink-label`, under the Client name on the down plate (as the mock does) and in the same name-then-span order above the Star on the across plate.
  - Label-box non-intersection and inside-viewBox hold with spans counted.
- Every colour, stroke and type value comes from a token custom property, held declaration by declaration.

**Block If:** the entry exceeds 4,000 bytes after the split; or adding `span` requires changing authored `career.json`.

**Never:**
- A third chrome line, a banner, or a caption.
- Rerouting without the visitor acting (that is 4.6).
- `the model` as a link in the scene's chrome (that is 5.1).
- A `/scene` path, or the route in the navigation store.
- Year marks spaced along the rank axis.
- Scene rendering changes beyond the chrome.
- Fixing the route-change announcement/focus (`deferred-work.md:963`) or the chart's document-scroll restore (`:1001`). Both stay deferred.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Scene → chart | `/`, Rail, free flight or Focused; primary click on `the chart` | one push to `/chart`, its state `{ scrollProgress }`; route `chart` | N/A |
| Chart → scene | `/chart`, machine `scene`; click `the scene` | one push to `/`; store unchanged | N/A |
| Chart, incapable | machine `fallback` | route line has no link; `the model` link present | N/A |
| Chart → Colophon | click `the model` | push `/colophon` | N/A |
| Modified click | ctrl, meta, shift or alt; `button ≠ 0`; `defaultPrevented` | no `preventDefault`, no `navigate` | N/A |
| Keep current | store progress 2 → 3 → 4 within 300 ms | one `save({ scrollProgress: 4 })` when the scheduled call fires | N/A |
| Pop-departure | `/` at 2 → navigate chart → Back → progress 4 (save fires) → Forward → Back | restores 4 | N/A |
| Write throws | `save` or `push` throws | error logged; on push failure route and subscribers unchanged; `navigate` returns normally | caught |
| Client span | Projects 2016-05→2017-07 | `span { start: '2016-05', end: '2017-07' }`, label `2016 – 2017` | N/A |
| Ongoing span | any Project `end: null` | `span.end: null`, label `2024 –` | N/A |
| Same-year span | 2019-03→2019-04 | label `2019` | N/A |
| Bad span | artifact `span` disagreeing with its Projects | schema rejects, naming the Client | gate fails |

</intent-contract>

## Code Map

- `src/shell/router.ts` -- `createRouter` (`:126-181`):
  - `navigate` is unguarded (`:170-175`); `browserHistory().push` writes `null` state (`:190`); position is saved only on `navigate` and `pagehide` (`:161`).
  - Add `PositionHooks.subscribe(listener) => unsubscribe`, `RouteHistory.later(fn)` (browser: `setTimeout(fn, SAVE_INTERVAL_MS)`) and `push(path, state)`.
  - `dispose` stops the subscription.
  - Re-export nothing; import `Route`/`ROUTE_PATHS`/`resolveRoute` from `./route.ts`.
- `src/shell/route.ts` (new) -- the three exports moved verbatim with their docs.
- `src/shell/router.test.ts` -- injected-history harness; extend for the history rows; it also regex-pins `mount.tsx` wiring (add `subscribe`).
- `src/shell/entry.ts:32` -- import from `./route.ts`; header text.
- `src/shell/detect.test.ts` `auditEntry` -- pins the entry's imports.
- `scripts/bundle-assertion.test.ts:308` -- entry module list. `scripts/bundle-assertion.ts:41-52` -- the budget note (record the split and the new measured size).
- `src/shell/mount.tsx:63-66` -- position hooks gain `subscribe: (listener) => navigationStore.subscribe((s, p) => { if (s.scrollProgress !== p.scrollProgress) listener(); })`.
- `src/App.tsx:64-98` -- passes `router` to `CornerChrome` and `surface` + `router` to `FallbackHost`. Props only; "do not grow this file".
- `src/shell/route-link.ts` + `.test.ts` (new, pure) -- `followRoute(event, navigate, to)`; the link texts (`CHART_LINK_TEXT = 'the chart'`, `SCENE_LINK_TEXT = 'the scene'`); and `chartRoutes(machine)`, the route-line list per surface.
- `src/shell/chrome-model.ts:36-44` -- `IDENTITY_LINE` and its "route is 5.1's" note.
- `src/shell/corner-chrome.tsx:92` + `corner-chrome.css:19-36` -- the identity `<p>` gets ` · ` and the link. Audited declaration by declaration and by markup in `chrome-model.test.ts`.
- `src/shell/fallback-host.tsx:91-99` -- builds the chart's `links` prop (`model`, `routes[]`) from `router` and `surface`. Extend `FallbackHostArtifact` with `span`.
- `src/render-fallback/chart.tsx:77` -- the `<h1>` becomes name + ` · ` + `<a>`, beside a route `<p>` mapped from `links.routes`. `chart-model.test.ts` (the `chart.tsx` markup regexes, ~`:534+`) scans it.
- `src/render-fallback/chart.css` -- `.chart-heading`, the chrome row, the link treatment (the mock's `.fb-chrome a`: `ink-label`, hairline `border-bottom` at `stroke-near`, raised on hover/focus), and `.chart-label-span`.
- `src/render-fallback/chart-model.ts` -- `ChartArtifactClient.span`; a span-text function; `acrossPlate` (`:336-353`, name label at `y - STAR_R - 10`) and `downPlate` (`:397-402`, name lines then `firstStep`); new label class. Header `:28` and `README.md:19` drop "year marks are 4.5's".
- `src/render-fallback/chart-model.test.ts` -- label-box and viewBox tests already iterate `plate.labels`; add span rows.
- `src/derive/entities.ts:65-89,343-352` -- `ClientEntity.span`, derived beside `timeAxis`.
- `src/derive/artifact.ts:82-95` -- `clientOf` emits `span`.
- `src/derive/artifact-schema.ts:23-47,231-243` -- `SCHEMA_VERSION` 9, `span` in `ArtifactClientSchema` (YYYY-MM schema at `:49`), a refine against the Projects.
- `src/derive/*.test.ts` -- `entities.test.ts`, `artifact.test.ts` (content parity, version), `artifact-schema.test.ts` (rejections).
- `src/derive/README.md` -- the field.
- `npm run solve` -- regenerate `generated/layout.generated.json`. The gate compares it.
- `src/identity-audit.test.ts:231-290,418-450` -- contrast `ROLES` (scene chart link, chart links, span label) and `VISIBLE_COPY`.
- `src/shell/README.md`, `src/render-fallback/README.md` -- document the routes.
- `_bmad-output/implementation-artifacts/deferred-work.md:949-994` -- mark the closed 4.2 items (pop-departure, guard, null-state pop, every-route save, entry budget).

## Tasks & Acceptance

**Execution:**
- `src/shell/route.ts`, `router.ts`, `router.test.ts`, `entry.ts`, `detect.test.ts`, `scripts/bundle-assertion*` -- split first, RED then green; build to measure the entry.
- `src/shell/router.ts` + `router.test.ts` -- the keep-current save, push with state, guarded writes; RED first over the matrix's history rows.
- `src/shell/route-link.ts` + `.test.ts` -- the click rule and the per-surface route list; RED first.
- `src/shell/mount.tsx`, `src/App.tsx` -- wiring.
- `src/shell/corner-chrome.tsx`, `.css`, `chrome-model.ts`, `chrome-model.test.ts` -- the `the chart` link, with mutation rows.
- `src/derive/entities.ts`, `artifact.ts`, `artifact-schema.ts` + tests + README; `npm run solve` -- `span`, v9.
- `src/shell/fallback-host.tsx`, `src/render-fallback/chart.tsx`, `chart.css`, `chart-model.ts`, `chart-model.test.ts` -- chart chrome, links, span labels.
- `src/identity-audit.test.ts` -- copy and contrast rows, red-then-green.
- READMEs and `deferred-work.md` -- the closures and the two items that stay open.

**Acceptance Criteria:**
- Given the scene in any state, when the visitor activates `the chart` by click or keyboard, then the chart shows in one action, and Back returns to the scene at the same stop with Focus as left.
- Given the chart on a capable machine, when `the scene` is chosen, then a real history entry to `/` is made. Given a coarse-pointer or no-WebGL2 machine, then no `the scene` link exists.
- Given the chart, when `the model` is activated, then the Colophon shows without the scene.
- Given the chart at any width, when a Client is read on the visible plate, then its date span sits with its name.
- Given `npm test`, `npx tsc --noEmit` and `npm run build`, when run, then all pass and the entry is within 4,000 bytes.

## Spec Change Log

## Review Triage Log

### 2026-10-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8 (high 0, medium 3, low 5)
- defer: 1 (medium 1)
- reject: 9 (medium 2, low 7)
- addressed_findings:
  - `[medium]` `[patch]` A keep-current write pending at a popstate stamped the departing position into the reached entry. A route-changing pop now cancels it, the doc states the ≤300 ms loss, and tests pop without flushing.
  - `[medium]` `[patch]` A failed push left a prevented click doing nothing. `navigate` returns a boolean, and `followRoute` prevents the default only on success, so on failure the browser follows the `href`.
  - `[medium]` `[patch]` The mount's `subscribe` binding was regex-only, and tests ran a copy. It moved to `src/shell/position-hooks.ts` (`storePositionHooks()`), which `mount.tsx` and the router tests share.
  - `[low]` `[patch]` A refused `replaceState` was logged on every trailing save. Only the first failure is logged now.
  - `[low]` `[patch]` The empty `.chart-routes` paragraph on the fallback surface added a gap. It is now hidden with `:empty`, pinned.
  - `[low]` `[patch]` The down plate's span line took no room. The first Project moved one name line lower, with a clearance check.
  - `[low]` `[patch]` The span-source test never inspected `spanText`'s body. It now has a body audit with mutation rows.
  - `[low]` `[patch]` Stale `src/shell/README.md` rows, the two-way `ENTRY_BUDGET_BYTES` comment, and the duplicate fixtures import were fixed.
- rejected:
  - The scene's `the chart` link has no rest-state cue. The spec mirrors the ratified slot-control treatment, so this is flagged for Thomas under residual risks.
  - The Client span is absent from the semantic DOM. The plates are `aria-hidden` by design, and every Project's dates are in the index and the records.
  - Route-change focus and announcement are in the spec's Never list (still deferred).
  - `the model` is a link on the chart but text in the scene, as ruled (5.1).
  - The `ChartLinks` types are restated, the same deliberate pattern as `FallbackHostArtifact`.
  - `FallbackHost` rebuilds its link closures on every render.
  - A pop onto `/chart` restores `scrollProgress`, following the every-route save ruling.
  - `the model` appears twice in the allowlist.
  - The budget was not tightened after the drop to 3,028, which would need a ruling.

## Design Notes

**Rulings (Thomas, 2026-10-19).**
- Q1: the top-left line. The right-bottom slot holds one live instruction, and UX-DR54 already puts a route on the left-top.
- Q2a: a derived Client span. `timeAxis` is a recency rank, so linear year marks would lie.
- Q3: split `route.ts`, keeping the budget.

**Throttle.** The Rail writes `scrollProgress` about 60 times a second, and Safari caps `replaceState` near 100 calls per 10 seconds. One pending write at a time, flushed by `later` after 300 ms, keeps the router to at most about 33 writes per 10 seconds. A pending write that lands after a `navigate` stamps the new entry with the store's current value, which is the value that entry holds anyway.

```ts
position.subscribe(() => {
  if (pending) return;
  pending = true;
  history.later(() => { pending = false; save(); });
});
```

## Verification

**Commands:**
- `npm test` -- expected: all pass
- `npx tsc --noEmit` -- expected: clean
- `npm run build` -- expected: gate and bundle assertion pass, entry ≤ 4,000 bytes

**Manual checks:**
- Chrome at 1400px:
  - Rail → `the chart` → Back returns to the same stop.
  - Focused → `the chart` → Back leaves the panel still open.
  - `/chart` → `the scene`, then `/chart` → `the model`.
  - Ctrl-click opens a new tab.
  - Spans show on the plate.
- Chrome at 390px with touch emulation: no `the scene` link, spans under the names.

## Auto Run Result

Previous run (2026-10-19): blocked on intent gap Q1–Q3. Thomas ruled: Q1 top-left line, Q2 (a), Q3 split `route.ts`. Resumed.

Status: done

**Summary.** The scene's left-top line now reads `THOMAS NAVARRO · the model · the chart`, with `the chart` a link to `/chart`. The chart's chrome has two links:
- `the model`, in its heading, to `/colophon`;
- `the scene`, on its route line, to `/`, offered only where this machine's surface is the scene.

Each link is a real `<a href>`. A primary click calls `router.navigate`, then prevents the default only on success, so on failure the browser follows the `href`. Any other click is left to the browser. The history changes:
- The router keeps the current entry's `{ scrollProgress }` current on a 300 ms trailing schedule.
- A route-changing pop cancels a pending write.
- `navigate` pushes its entry with the current position.
- Writes are guarded, and only the first failure is logged.
- The router moved off the entry chunk: `route.ts` is now the entry's only router import. The entry dropped from 3,993 to 3,028 of 4,000 bytes, budget unchanged.
- Five 4.2 deferrals are closed.

On the artifact side, each Client carries a derived `span` (`SCHEMA_VERSION` 9), drawn as years beside its name on both plates.

**Files.**
- **Shell routing and history:**
  - `src/shell/route.ts` (new): `Route`, `ROUTE_PATHS`, `resolveRoute`.
  - `src/shell/router.ts`: the keep-current save, pop cancel, push with state, guarded writes, boolean `navigate`.
  - `src/shell/position-hooks.ts` (new): the store position hooks shared by `mount.tsx` and the tests.
  - `src/shell/route-link.ts` (new, with a test): the click rule, link texts, the chart's link list.
  - `src/shell/entry.ts`, `mount.tsx`, `src/App.tsx`: wiring.
- **Shell chrome:**
  - `src/shell/chrome-model.ts`: `IDENTITY_NAME` and `IDENTITY_MODEL`.
  - `src/shell/corner-chrome.tsx`/`.css`: the `the chart` link.
  - `src/shell/fallback-host.tsx`: builds the chart's links.
- **Chart:**
  - `src/render-fallback/chart.tsx`/`.css`: the chrome row, the links, `:empty` route line.
  - `src/render-fallback/chart-model.ts`: span labels and `spanText`.
- **Artifact:**
  - `src/derive/entities.ts`, `artifact.ts`, `artifact-schema.ts`: Client `span`, v9, a refine.
  - `generated/layout.generated.json`: regenerated.
- **Tests:**
  - `router.test.ts`, `chrome-model.test.ts`, `detect.test.ts`, `panel-model.test.ts`, `rail-input.test.ts`.
  - `chart-model.test.ts`, the derive tests, `identity-audit.test.ts` (copy, contrast, declarations).
  - `scripts/bundle-assertion*`: the entry module list and the budget note.
- **Docs:** the READMEs (shell, render-fallback, derive) and `deferred-work.md` (five 4.2 closures; two items stay open).

**Review.**
- 8 patches applied: medium 3, low 5.
- 1 deferred: render-level verification of the links.
- 9 rejected.
- Follow-up review recommended: score 3×3 + 5 = 14, which is 5 or more.

**Verification.**
- `npm test`: 1,391 pass, 0 fail, 1 skipped. The skip is the pre-existing symlink case.
- `npx tsc --noEmit`: clean.
- `npm run build`: the gate and bundle assertion pass, the entry at 3,028 of 4,000 bytes.
- Every I/O matrix row is covered by a test that ran and passed.
- The implementer checked in Chrome DevTools against `vite preview`, at 1400px and at 390px with touch emulation.

**Residual risks.**
- **Unseen in the browser:** a `the chart` click while a Project is Focused, followed by Back. This is covered by router tests only.
- **The scene link's discoverability:** `the chart` follows the slot-control treatment with no rest-state cue, unlike the chart's underlined links. It needs Thomas's eye.
- **Client spans on the plates only:** they appear only on the `aria-hidden` plates; Project dates remain in the index and the records.
- **Still deferred:** route-change focus and announcement, and the chart's document-scroll restore.
