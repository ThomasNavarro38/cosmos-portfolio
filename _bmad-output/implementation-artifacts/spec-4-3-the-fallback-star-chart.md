---
title: 'The Fallback star chart'
type: 'feature'
created: '2026-10-16'
status: 'done'
baseline_commit: 'd255d487f7b7421e7cda96d08d8ca8627f824b0d'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/mockups/keyscreen-fallback.html'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** The `fallback` surface is still 4.1's interim surface: the scene's DOM without the scene host. On a phone nothing is visible to tap, the page cannot scroll, and the chrome reads `scroll ↓ — time runs backward`. `src/render-fallback/` holds only a README. Every phone, every machine without WebGL2 and every `/chart` visitor lands on this surface (deferred-work 939, 987).

**Approach:** Build the flat chart in `src/render-fallback/` as its own lazy chunk, behind a new `src/shell/fallback-host.tsx`. It is a pure `chart-model.ts` (order, plate geometry, records, fragment target) plus a thin `chart.tsx`. The chart draws the plate from each entity's `timeAxis`: across on desktop with present on the left, transposed down on a phone. Under the plate sit an index table, then every Project's full record, built with the shell's `buildPanel` so the voice and the rule line match the scene's panel. On `fallback`, `App` renders only this host.

## Boundaries & Constraints

**Always:**
- `render-fallback/` reads the artifact only through the props `App` passes. It imports only `src/shell/` (`panel-model.ts`, `chrome-model.ts`, `focus-panel.css`) and `src/tokens/`. It never touches `src/data/`, `src/derive/`, `src/render-scene/`, any Three package or a `<canvas>`.
- Layout uses `timeAxis` and nothing else from the solve. The chart reads no `position`, `mass`, `luminanceBand`, `moteTier`, `orbitNormal` or `railDistance`.
- `render-fallback/` contains no classification and no conditional on a raw content field (AD-3). The reading position comes from `buildPanel` (it branches on `isDeep`). Dates render `start`, ` – `, then `end` as two elements, so a `null` end renders empty, with no test on it.
- Content parity: every Client and Project is drawn, and every record shows the kicker (Client · Company), title, reading position, Role, Team, Built, every Skill as text, and the dates. Nothing is truncated, clamped or collapsed.
- Order is present to past. Clients are sorted by `timeAxis` descending, and Projects within a Client likewise. Ties break by ID ascending.
- Every heading is real and in order: `<h1>` is `IDENTITY_LINE`, `<h2>` is a Client's name, `<h3>` is a Project's title. Each Client is a `<section id={client.id}>` and each record an `<article id={project.id}>`, so a fragment names an entity ID.
- The plate is an `aria-hidden` SVG, which is legitimate because the table and records repeat every word. Every colour, font and stroke comes from a token custom property in a stylesheet. There are no hex values, radii, shadows, glow or vignette.
- New visible copy is limited to the table headers `Client`, `Project` and `Dates`, each added to `VISIBLE_COPY`. Role reuses `FIELD_LABELS.role`.
- On load, a fragment naming a chart Client or Project scrolls that element into view. Anything else does nothing.
- The chunk is reached only through `lazy(() => import('../render-fallback/chart.tsx'))`, behind a boundary that logs and renders `null`, outside `Suspense fallback={null}`. Ruling Q2: `/chart` and a `fallback` `/` request only this renderer chunk.

**Block If:** the chart needs a value the artifact lacks (that is a schema change in `src/derive/`). Also block if the entry budget (`bundle-assertion.ts:43`) is breached.

**Never:**
- Rings, legend, a Notable column or any Deep/Shallow mark on the plate or the index (that is 4.4). The plate draws every Project marker at one size and one ink.
- Chrome routes to the scene or Colophon, or any UI that changes route (that is 4.5).
- Year marks on the plate (date navigation is 4.5).
- Scene-side fragment consumption.
- Copy that apologises or says the visitor is missing something.
- The word "fallback" in visible copy.
- `weight` on screen: it is a tuning number, and the scene's panel does not show it either.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Phone | `/`, fallback surface, 390px | the chart, plate transposed down, page scrolls natively; no index nav, chrome slot or panel | N/A |
| Capable `/chart` | scene detected | the chart; no `render-scene` request | N/A |
| Desktop width | > 640px | across-plate shown, down-plate `display: none` | N/A |
| Deep record | `isDeep: true` | Notable paragraphs, lifted run in `.panel-lift` | N/A |
| Shallow record | `isDeep: false` | `EDITORIAL_RULE`, the scene panel's exact string | N/A |
| Ongoing | `duration.end: null` | dates read `2024-02 – ` | N/A |
| Fragment | `/chart#project:sncf/client-referential` | that record scrolled into view | N/A |
| Bad fragment | `#nope`, `#%E0%A4%A`, `#` | nothing scrolls | a decode error reads as no target |
| Chunk fails | `render-fallback` 404 | logged, root kept | no retry |

</intent-contract>

## Code Map

- `src/App.tsx:59-86` -- branch on `shown`: `colophon` → ColophonHost alone (as now); `fallback` → `<main><FallbackHost artifact={artifact} /></main>` alone; otherwise index, chrome, scene host, panel, with the scene host ungated inside that branch. Its audits: `src/shell/panel-model.test.ts:1424-1510` (`auditMount` and its mutation rows — "every other element renders on both" becomes "the chart alone on fallback"), `src/render-scene/scene-model.test.ts:2596-2620`, `src/identity-audit.test.ts:955-1000` (`auditPage` reads App).
- `src/shell/colophon-host.tsx` -- the pattern to copy for `fallback-host.tsx` (boundary outside `Suspense`, logs, renders `null`). Its audit is `src/shell/router.test.ts:499-555`. Mirror it as `auditFallbackHost`, plus "render-fallback is reached only from `shell/fallback-host.tsx`".
- `src/shell/scene-host.tsx:267-303` -- precedent for restating the artifact shape structurally in a host (a type-only import of a `dynamicOnly` directory is banned).
- `src/shell/panel-model.ts:106-128,141,206-277` -- `PanelArtifact`, `EDITORIAL_RULE`, `buildPanel`, `kickerText`. Reuse `buildPanel(artifact, project.id).blocks` minus the `release` block. The chart's artifact type must structurally extend `PanelArtifact`.
- `src/shell/focus-panel.tsx:186-245` -- the block markup to mirror (`panel-kicker`, `panel-title`, `panel-reading`/`panel-prose`/`panel-lift`/`panel-rule`, `panel-fields` table, `panel-skills` `<ul aria-label="Skills">`). The record uses `<h3>` and imports `../shell/focus-panel.css` for the same classes.
- `src/shell/chrome-model.ts:37` -- `IDENTITY_LINE`, the `<h1>` text.
- `src/shell/page.css:212-217` -- `overflow: hidden` moves to `html:has(.scene-host), html:has(.scene-host) body`, so only the scene page is locked. `PAGE_RULES` and its mutation rows are at `identity-audit.test.ts:942-1000`.
- `src/identity-audit.test.ts:174-227` (`auditDeclarations`, `auditBans`), `:230-330` (`ROLES`, `declared`; add chart roles, with SVG labels read off `fill`), `:386-425` (`VISIBLE_COPY`). Add a `chart` audit of `chart.css` in the page and index style. `display: none` is permitted only on the two plate selectors inside their width queries.
- `src/derive/boundaries.ts:214-222` -- the `render-fallback` row stays as is. `src/render-fallback/README.md` -- name the shell modules and the stylesheet it imports.
- `scripts/bundle-assertion.test.ts:283-330` -- the colophon-chunk block. Add the same block for the chunk holding `src/render-fallback/chart.tsx`: off the entry graph, reached by `fallback-host.tsx`'s dynamic import, no static importer, and the `heavy()` walk finding no `src/render-scene/` and no react-dom chunk. Factor `heavy` out of the colophon block so both use it.
- `generated/layout.generated.json` -- 6 Clients, 8 Projects, 1 Deep (`project:sncf/client-referential`), 1 ongoing (Decathlon). Client `timeAxis` equals its newest Project's, so the Star must be offset left of that marker, not drawn on it.
- `_bmad-output/implementation-artifacts/deferred-work.md:939,987` -- close both when done.

## Tasks & Acceptance

**Execution:**
- [x] `src/render-fallback/chart-model.test.ts` -- RED first. Against the committed artifact and small fixtures, cover every I/O row the model owns:
  - order, with ties;
  - parity: each record's blocks hold every content value, and `notable` runs re-joined equal the authored prose minus its marks;
  - Shallow reading `=== EDITORIAL_RULE`;
  - across-plate: x strictly decreasing in `timeAxis`, every mark and label inside the viewBox, Star offset from its newest marker, adjacent same-row labels on alternating levels;
  - down-plate: y increasing down each stem, Client blocks in order, no two marks closer than a marker diameter;
  - `fragmentTarget`;
  - a purity scan of `src/render-fallback/*.ts{,x}`: no forbidden field, no `src/data`/`derive`/`render-scene`/`three` specifier, no `<canvas`;
  - a thin scan of `chart.tsx`: no `.sort(`, `.filter(`, `?`-ternary, `??`, `&&`, `||`.
- [x] `src/render-fallback/chart-model.ts` -- `ChartArtifact`, `buildChart`, `acrossPlate`, `downPlate`, `fragmentTarget`. Pure, no React, no DOM.
- [x] `src/render-fallback/chart.tsx` + `chart.css` -- default export `Chart({ artifact })`, mapping the model to header (`<h1>`), the two plates, the index table (Client, Project link `#id`, Role, Dates) and the Client sections of records. A mount effect scrolls to `fragmentTarget(location.hash, …)`. Phone rules follow the mock: plate swap, table rows stacked, field rows stacked.
- [x] `src/shell/fallback-host.tsx` -- lazy edge + boundary + restated artifact shape. `src/App.tsx`, `src/shell/page.css` -- as mapped.
- [x] Audits as mapped. Repoint them red-then-green with mutation rows: App on fallback renders the host alone, page lock scoped to the scene host, chart.css exact declarations and contrast, copy allowlist, bundle chunk.
- [x] Docs: `src/render-fallback/README.md`, `src/shell/README.md` (files table: `fallback-host.tsx`), `App.tsx` header, deferred-work 939/987 closed by 4.3.

**Acceptance Criteria:**
- Given `npm run build`, when the bundle assertion runs, then a chunk holding `src/render-fallback/chart.tsx` exists off the entry graph, reached only by `fallback-host.tsx`, and reaches no scene or react-dom chunk, with the entry within budget.
- Given any machine at `/chart`, when the page renders, then the document holds no `<canvas>`, headings run h1 → h2 → h3, and every Project title, Built text, Skill, and the Deep Project's every Notable paragraph appear as text.
- Given every visible string on the surface, when the identity audit runs, then each is in the closed allowlist or is data, and the voice audit passes.

## Spec Change Log

## Review Triage Log

- 2026-10-18, loop 0: three reviewers (Blind Hunter, Edge Case Hunter, Verification Gap). No intent_gap or bad_spec. Six patches applied red-then-green: the fragment landing moved into the model as `landOnFragment` and executed under `node --test`; `auditThin` bans `if (`; the purity scan bans `react-dom` and `colophon/`; the plate-lines test asserts what it names; a label-box non-intersection test on both plates; the en dash admitted as copy (`VISIBLE_COPY`) instead of as an edge separator everywhere. Four deferred (fragment focus, phone table semantics, chart scroll across history, non-text contrast of the index link). Rejected as by design: the fallback renders the chart alone and a failed chunk leaves an empty root (frozen matrix row "Chunk fails").

## Design Notes

**Why the chart alone on `fallback`.** The index nav's buttons are scene doors: fly, pull back, focus a panel. The chrome slot and the panel are scene chrome. Deferred-work 939 says 4.3 must leave none of them behind. On the chart, the table and the record anchors are the destination index, so all of it is DOM and nothing is canvas-backed. AD-4 governs the scene's canvas, and the ruling Q2 ordering still holds: the mount chunk lands before the one renderer chunk.

**Plate across** (viewBox 1160 wide): present at x≈260, past at x≈1120, with x = past − t·(past − present). There is one row per Client, about 110 apart. The Star sits about 44 left of its newest marker, its name above. The baseline hairline runs from the Star to the oldest marker. Each Project label sits below its marker on a leader, alternating two depths by in-row index.

**Plate down** (viewBox 350 wide): Client stems stacked present-first. Each stem has a Star and name, then its Projects at a fixed step, labels running right. This follows the mock's transposition.

## Verification

**Commands:**
- `npm test` -- expected: all green.
- `npm run typecheck` -- expected: no errors.
- `npm run build` -- expected: the gate passes, the entry is within budget, and a render-fallback chunk is emitted.

**Manual checks:**
- Run `npm run preview` and open `/chart` at 1240px and at 390px (device emulation, coarse pointer). The plate turns horizontal↔vertical, the page scrolls, there is no `render-scene` request, and `/chart#project:sncf/client-referential` lands on that record.

## Suggested Review Order

**Surface branch: the chart alone on fallback**

- The fallback branch renders only the host; the scene branch is the remaining default.
  [`App.tsx:77`](../../src/App.tsx#L77)

- The lazy edge behind a logging boundary, the only reach into render-fallback.
  [`fallback-host.tsx:25`](../../src/shell/fallback-host.tsx#L25)

- A failed chunk logs and renders null: the root is kept, no retry.
  [`fallback-host.tsx:83`](../../src/shell/fallback-host.tsx#L83)

- The scroll lock now applies only to the scene page, so the chart scrolls natively.
  [`page.css:27`](../../src/shell/page.css#L27)

**The pure model**

- Entry point: the order, both plates, index rows and records, from the artifact alone.
  [`chart-model.ts:324`](../../src/render-fallback/chart-model.ts#L324)

- Records reuse the scene panel's blocks minus release, so both surfaces share one voice.
  [`chart-model.ts:218`](../../src/render-fallback/chart-model.ts#L218)

- The across plate: time runs present-left; labels alternate between two depths.
  [`chart-model.ts:225`](../../src/render-fallback/chart-model.ts#L225)

- The down plate: the across plate transposed, labels wrapped to the 350-wide plate.
  [`chart-model.ts:277`](../../src/render-fallback/chart-model.ts#L277)

- The fragment rule: a decode failure or an unknown ID is no target.
  [`chart-model.ts:356`](../../src/render-fallback/chart-model.ts#L356)

- Landing on the fragment, with dependencies injected so it runs under node --test.
  [`chart-model.ts:382`](../../src/render-fallback/chart-model.ts#L382)

**The renderer**

- A thin mapping; the ref is a one-line call into the model.
  [`chart.tsx:53`](../../src/render-fallback/chart.tsx#L53)

- An unconditional separator, so an ongoing engagement reads `2024-02 – `.
  [`chart.tsx:120`](../../src/render-fallback/chart.tsx#L120)

- One plate swaps for the other by width, the only `display: none` the audit admits.
  [`chart.css:166`](../../src/render-fallback/chart.css#L166)

**Bundle budget**

- The `ui` group keeps the mount's preload list at four files, so the entry stays under budget.
  [`vite.config.ts:40`](../../vite.config.ts#L40)

- The budget is unchanged at 4,000; the entry measures 3,993.
  [`bundle-assertion.ts:52`](../../scripts/bundle-assertion.ts#L52)

- The chart chunk is off the entry graph and reaches no scene or react-dom chunk.
  [`bundle-assertion.test.ts:333`](../../scripts/bundle-assertion.test.ts#L333)

**Audits and tests**

- The App audit, repointed: on fallback only the chart renders.
  [`panel-model.test.ts:1481`](../../src/shell/panel-model.test.ts#L1481)

- The fallback host audit mirrors the colophon host's.
  [`router.test.ts:572`](../../src/shell/router.test.ts#L572)

- The en dash is admitted as copy, not as an edge separator everywhere.
  [`identity-audit.test.ts:444`](../../src/identity-audit.test.ts#L444)

- Fragment landing executed: once per root, Client and Project targets, bad hashes scroll nothing.
  [`chart-model.test.ts:355`](../../src/render-fallback/chart-model.test.ts#L355)

- No two label boxes intersect on either plate.
  [`chart-model.test.ts:321`](../../src/render-fallback/chart-model.test.ts#L321)

- The thinness scan now bans `if (`; a `switch` on kind is allowed as the mapping itself.
  [`chart-model.test.ts:481`](../../src/render-fallback/chart-model.test.ts#L481)
