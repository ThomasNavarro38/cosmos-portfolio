---
title: 'The Colophon''s chrome row: a route out of /colophon'
type: 'bugfix'
created: '2026-10-23'
status: 'done'
baseline_commit: '1645f0dc9e17bc4c61ef10129b018e8ecdacec56'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/colophon` has no route out. Its only link is the contact `mailto:`, so a visitor who arrives on a shared `/colophon` URL can reach neither the scene nor the chart. The scene "one click away" (AC 5.4 #5, DESIGN.md §7.11) does not hold. Epic 5 retro AV-1 (item 38) and Epic 6 retro AV-2 confirmed this on the built site.

**Approach:** Mirror the chart's chrome row (Thomas, ruling (a), 2026-10-23). The row is:
- the `<h1>`, reading `THOMAS NAVARRO · the model`, where `the model` is the current page and so unlinked;
- the contact route beside it, as it is today;
- a route line opposite: `the scene · the chart`, with `the scene` only on a capable machine, as the chart offers it.

The links are router links built in the shell host and handed to the Colophon as props, as `FallbackHost` does for the chart.

## Boundaries & Constraints

**Always:**
- The links go through `router.navigate`, so `the scene` resumes at the stop the visitor left (EXPERIENCE.md §4.7). A modified click (ctrl/meta/shift/alt, middle button) keeps the browser default (`followRoute`).
- The route line's texts are the existing constants `SCENE_LINK_TEXT` and `CHART_LINK_TEXT`, joined by ` · ` as the scene's chrome line joins its parts. There is no new copy.
- The colophon chunk still holds `src/colophon/` alone. `colophon.tsx` may additionally import `IDENTITY_NAME`/`IDENTITY_MODEL` from `../shell/chrome-model.ts` (the `ui` group, as the chart does). It never imports `route-link.ts`, the router or `detect.ts`; it declares its links' type structurally, as `chart-model.ts` declares `ChartLinks`.
- The new chrome rules in `colophon.css` use tokens only and match the chart's chrome row: the chrome type role, `ink-label`, the underline and focus treatment. The identity audit's rule table and contrast rows pin them, with mutation rows.
- The contact route stays directly after the `<h1>` and before the route line, as on the chart.
- The page is drawn with or without exhibits, and on a failed fetch: the chrome row is unconditional.

**Ask First:** any change to page gutter, column width or `<h1>` size beyond the chrome type role (that is D-G6, item 39). Any new visible string.

**Never:** a link to `/colophon` itself; a back button or `history.back()` link; illustration; touching the chart's or the scene's chrome; reaching React's router state from `src/colophon/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Capable machine | surface `scene`, route `colophon` | route line: `the scene` → `/`, ` · `, `the chart` → `/chart` | N/A |
| Fallback machine | surface `fallback`, route `colophon` | route line: `the chart` → `/chart` alone, no separator | N/A |
| Primary click on `the scene` | after scene → `/colophon` | router pushes home; the scene opens at the stop it left | N/A |
| Modified click | ctrl/meta/shift/alt or non-zero button | no `preventDefault`; the browser opens the href | N/A |
| Exhibits fail to load | fetch rejects | `<h1>`, contact route and route line remain | logged once, as today |

</frozen-after-approval>

## Code Map

- `src/shell/route-link.ts` -- `chartRoutes`/`chartLinks`/`routeLink`/`followRoute`. Add `colophonLinks(machine, navigate)` → `{ routes: RouteLink[] }`: scene (capable only), then chart.
- `src/shell/colophon-host.tsx` -- `ColophonHost()` renders `<Colophon />` with no props. It takes `{ surface, router }`, builds `colophonLinks` and passes `links`. Its audit is `colophon-host.test.ts:60-95`; keep the lazy edge, the boundary and the null suspense.
- `src/App.tsx:83-88` -- the colophon branch passes `surface` and `router` to `ColophonHost`.
- `src/colophon/colophon.tsx` -- `ColophonPage` (`:160-`) draws `<h1>the model</h1><ContactRoute />`. The default export takes `links`; `ColophonPage` takes `links` and draws the chrome row. The header doc's import list gets updated.
- `src/render-fallback/chart.tsx:106-118`, `chart.css:87-134` -- the golden pattern (markup and rules) to mirror.
- `src/colophon/colophon.css` -- add `.colophon-chrome`, `.colophon-chrome-heading`, `.colophon-routes` (+ `a`, `:hover`, `:focus-visible`), mirroring `chart.css:87-134`.
- `src/colophon/colophon.test.ts` -- page checks at `:313-353`. The source audits at `:536-600` pin `return <ColophonPage exhibits=… />` and the import list, so they change with the new prop. Renders use `renderPage`.
- `src/App.test.ts:108-117` -- `colophonAlone` expects `main` = `h1 "the model"` + `p.contact-route`. It becomes the chrome row with its route line per machine, red against the old shape.
- `src/shell/colophon-host.test.ts:39-95` -- renders the host and audits its source.
- `src/shell/route-link.test.ts` -- `chartLinks` tests to mirror for `colophonLinks`.
- `src/identity-audit.test.ts` -- contrast rows `:311-316`, `:375-382` (chart chrome) to mirror for the Colophon; rule table `:1802-1815`; contact placement doc `:36` and its placement check; copy allowlist (no new string expected).
- `scripts/bundle-assertion.test.ts` -- holds that the colophon chunk is `src/colophon/` alone and reaches no react-dom; it must stay green.

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/route-link.ts` + `route-link.test.ts` -- add `colophonLinks` with the I/O rows as tests (both machines, the order, the hrefs, the modified click) -- one place builds surface links.
- [x] `src/shell/colophon-host.tsx` + `colophon-host.test.ts` and `src/App.tsx` -- thread `surface`/`router` and pass `links`; extend the audit so the links are built from `colophonLinks` -- as `FallbackHost` does.
- [x] `src/colophon/colophon.tsx` + `colophon.test.ts` -- render the chrome row per ruling (a); update the page checks and source audits, each red against the old markup -- the fix itself.
- [x] `src/colophon/colophon.css` + `src/identity-audit.test.ts` -- the chrome rules, contrast rows, rule-table rows, placement and mutation rows -- identity held by audit, not by eye.
- [x] `src/App.test.ts` -- `colophonAlone` reads the new shape for both machines -- the surface-level guarantee.
- [x] `src/colophon/README.md`, `src/shell/README.md` -- document the row and `colophonLinks`.

**Acceptance Criteria:**
- Given a direct load of `/colophon` on a capable machine, when the page renders, then `main` holds the chrome row (the `<h1>` `THOMAS NAVARRO · the model`, the contact route, the route line `the scene · the chart`) before any exhibit.
- Given scene → `the model` → `/colophon` → `the scene`, when it is clicked, then the scene opens at the stop it was left at, as Back would.
- Given `npm run build`, when the bundle assertion runs, then the entry stays within its 4,000-byte budget and the colophon chunk still holds `src/colophon/` alone.

## Design Notes

The chrome rules are duplicated from `chart.css` rather than moved into a shared sheet. Moving them would rewrite the chart's pinned rules and its contrast rows for no visible gain. Each surface's sheet stays its own, and the identity audit pins both copies to the same declarations.

## Verification

**Commands:**
- `npm test` -- expected: 0 fail; the count rises by the new tests; 4 todo unchanged.
- `npm run typecheck` -- expected: clean.
- `npm run build` -- expected: gate green, the entry ≤ 4,000 B.

**Manual checks:**
- `vite preview`, direct load of `/colophon`: two route links on a capable machine. `the scene` resumes the stop after scene → the model → the scene.

## Verification Results

`npm test` 1715/1720 (0 fail, one environmental skip, four todo); `npm run typecheck` clean; `npm run build` gate green, the entry 3,033 of 4,000 bytes. Manual, on `vite preview`: a direct load of `/colophon` draws `THOMAS NAVARRO · the model`, the contact route, and `the scene · the chart`; scene scrolled to `scrollProgress` 1.8 → `the model` → `the scene` returns with `history.state.scrollProgress` 1.8.

Review: blind, edge-case and verification-gap layers; eight patches (medium 1: `colophonRoutes` borrowed `chartRoutes`; low 7), one deferred (a failed colophon chunk leaves no route out, as the chart's host does), ten rejected.

## Suggested Review Order

**The route line, built in the shell**

- The Colophon's links, written out: the scene on a capable machine, then the chart.
  [`route-link.ts:122`](../../src/shell/route-link.ts#L122)

- Router-bound links, the same `routeLink` the chart's use.
  [`route-link.ts:137`](../../src/shell/route-link.ts#L137)

- The host builds them from the machine and router, as `FallbackHost` does.
  [`colophon-host.tsx:64`](../../src/shell/colophon-host.tsx#L64)

- `App` hands the host its surface and router.
  [`App.tsx:88`](../../src/App.tsx#L88)

**The chrome row, drawn by the page**

- Heading, contact route, route line — the chart's row, `the model` unlinked.
  [`colophon.tsx:192`](../../src/colophon/colophon.tsx#L192)

- The page's own structural links type; no shell import beyond chrome-model.
  [`colophon.tsx:117`](../../src/colophon/colophon.tsx#L117)

- The chart's chrome rules, copied token for token.
  [`colophon.css:67`](../../src/colophon/colophon.css#L67)

**Held by tests**

- Both copies pinned declaration for declaration, either side's drift fails.
  [`identity-audit.test.ts:2125`](../../src/identity-audit.test.ts#L2125)

- The surface-level shape, per machine.
  [`App.test.ts:115`](../../src/App.test.ts#L115)

- The route line per machine, and not borrowed from the chart's.
  [`route-link.test.ts:126`](../../src/shell/route-link.test.ts#L126)

- Clicks through the host: primary routed, modified left to the browser.
  [`colophon-host.test.ts:105`](../../src/shell/colophon-host.test.ts#L105)
