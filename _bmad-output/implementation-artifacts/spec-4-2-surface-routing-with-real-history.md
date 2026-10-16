---
title: 'Surface routing with real history'
type: 'feature'
created: '2026-10-15'
status: 'done'
baseline_commit: '925844c76050909e40798257fcdb1fa53621def0'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Today the surface is chosen once, by capability, and nothing owns the URL. No surface is addressable, Back does nothing between surfaces, and a remounted scene restarts its Rail spring at progress 0 (`rail-model.ts:696`), so returning would glide out from First Paint (AD-18, UX-DR54).

**Approach:** A pure, injectable `src/shell/router.ts` maps paths to three routes: `/` is this machine's surface, `/chart` is the flat chart, `/colophon` is the Colophon. The entry resolves the route before the mount chunk resolves. Each route change pushes a real history entry. The scene's `scrollProgress` is saved into the departing entry's `history.state` and restored when that entry is reached again. `/colophon` lazily loads a minimal `src/colophon/colophon.tsx` (an `<h1>` only), which 5.1 fills in. Thomas's rulings, 2026-10-15: paths with these names, plus `public/_redirects`; the 2(a) chunk; 3(b) `history.state` persistence; fragments untouched and their consumption deferred to 4.3.

## Boundaries & Constraints

**Always:**
- `router.ts` imports nothing and reads no motion preference. The entry imports only `resolveRoute` from it. The entry budget stays at 4,000 bytes.
- The three routes are the only addressable ones. An unknown or non-canonical path (`/chart/`, `/x`) resolves to its route and gets the canonical path by `replaceState`, which creates no entry, keeping search and hash.
- `navigate(to)` to the current route is a no-op. Otherwise it first saves the departing position into the current entry (`replaceState`, URL unchanged), then `pushState`s the target path with no fragment.
- On `pagehide` the position is saved into the current entry as well, so a cross-document return also restores it.
- Restore (on load and on `popstate`) only from a well-formed `{ scrollProgress: finite ≥ 0 }`. Anything else writes nothing.
- Focus, flight and every store event create no history entry. A `popstate` never calls `releaseFocus` or any other door except the one position restore.
- The scene surface mounts at the store's progress: the Rail spring's first frame is the clamped goal, not 0.
- Each route requests at most one renderer chunk (ruling Q2). `/colophon` never requests `render-scene`. The colophon chunk is reached only through `import()` from `src/shell/`. A failed chunk logs and leaves the root mounted.

**Ask First:** a fourth route; restoring `mode`, `flightTarget` or Focus from history; any colophon copy beyond the one `<h1>`; changing the store's state keys.

**Never:** add a UI that navigates (4.5, 5.1); build the chart (4.3); consume a fragment; put the route in the navigation store; use the word "fallback" in a URL or in copy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Capable root | `/`, scene detected | scene | N/A |
| Incapable root | `/`, fallback detected | fallback surface, URL stays `/` | N/A |
| Chart on capable | `/chart`, scene detected | fallback surface, no `render-scene` | N/A |
| Colophon | `/colophon` | colophon chunk only | chunk fails → logged, root kept |
| Non-canonical | `/chart/?a#client-x` | chart, URL `/chart?a#client-x`, no new entry | N/A |
| Unknown | `/nope#p-1` | root, URL `/#p-1`, no new entry | N/A |
| Leave scene | `/` at 2.4 → navigate colophon | `/` entry state `{scrollProgress: 2.4}`, push `/colophon` | N/A |
| Back | popstate to `/`, state 2.4 | route `/`, `advanceScroll(2.4)`, rig starts at 2.4 | N/A |
| Bad state | popstate, state `null` / `{scrollProgress: NaN}` / `-1` | route changes, store not written | ignored |
| Same route | navigate to the current route | no history call | N/A |
| Focus | `focusProject` on the scene | no history call | N/A |
| Fragment-only pop | `#a` → `#b` on `/` | route unchanged, nothing written | N/A |

</frozen-after-approval>

## Code Map

- `src/shell/entry.ts:24-32` -- add `import { resolveRoute } from './router.ts'` after detect, `const route = resolveRoute(location.pathname);` after `const surface`, and change the call to `module.mount(surface, route)`. Its audits sit at `detect.test.ts:216-227` (banned words: "colophon" passes, `location` passes), `:258-275` (static-import list, `.mount(surface)`, chain regex) and `:308-327` (exact-string mutation rows: `mounting`/`surface` adjacency kept).
- `src/shell/mount.tsx:47-57` -- `mount(surface, route)` makes the router (`createRouter(browserHistory(), route, position)`), with position hooks reading `navigationStore.getState().scrollProgress` and writing `advanceScroll`, and renders `<App surface={surface} router={router} />`. The writer audit is at `rail-input.test.ts:745-781` (signature regex, `writeReducedMotion();` first, `<App surface={surface} />` exactly).
- `src/App.tsx:57-73` -- reads the route with `useSyncExternalStore(router.subscribe, router.route)`, then calls `surfaceOf(route, surface)`. `'colophon'` → `<ColophonHost />` only; otherwise today's tree. Its audits are `panel-model.test.ts:1424-1469` (order, App's prop regex, `\bsurface\b` ×3, exact mutation strings), `scene-model.test.ts:2596-2620` and `identity-audit.test.ts:961-995`.
- `src/shell/scene-host.tsx:168-185` -- the `SceneBoundary` pattern for the colophon host (lazy behind a boundary that logs and renders null, `Suspense fallback={null}`).
- `src/render-scene/rail-model.ts:695-697` -- the `previous === null` branch seeds `progress.value` at `goal`. The pins to update are `rail-model.test.ts:1069-1071` (first frame at 0) and `:1101-1108` ("dropped" never advances: it now sits at the goal).
- `src/shell/state.ts:33,148-150` -- the `scrollProgress` writer row and prose gain a third caller, the router's restore in `mount.tsx`. `activate.test.ts:390` and `rail-input.test.ts:434` count per file, so they are unaffected.
- `src/derive/boundaries.ts:158-188,270-281` -- shell and root reach `colophon` only dynamically. The colophon row allows React. The colophon README prose says it imports only `generated/` and `tokens/`, so `colophon.tsx` imports neither shell nor motion preference.
- `scripts/bundle-assertion.test.ts:256-260` -- the real-build entry module list gains `src/shell/router.ts`. Budget at `bundle-assertion.ts:43`.
- `src/identity-audit.test.ts:383-421,886` -- the closed copy allowlist gains the colophon `<h1>` text `the model`. The voice ban list applies.
- `src/render-scene/scene-model.test.ts:3715-3726` -- `PREFERENCE_ROLES`, tree-wide. New files must not touch the preference.
- `public/` -- holds only `.gitkeep`. `colour-literals.ts:409-417` skips the extensionless `_redirects`.
- Docs -- `src/shell/README.md` (files table: entry, mount, router rows; the "Who writes `scrollProgress`" section), `src/colophon/README.md`, `README.md` (routes, `_redirects`).

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/router.test.ts` -- RED first. Every I/O row against an injected `RouteHistory` and position hooks, plus `browserHistory()` against stubbed `window`/`history`/`location`, plus a purity scan of `router.ts` (no imports, no React, no preference, no `releaseFocus`/`focusProject`) -- pins AD-18 and AD-5.
- [x] `src/shell/router.ts` -- `Route`, `ROUTE_PATHS`, `resolveRoute`, `surfaceOf`, `createRouter(history, initial, position)` → `{ route, subscribe, navigate, dispose }`, `browserHistory()`. Pure and injectable.
- [x] `src/render-scene/rail-model.ts` + test -- the first frame seeds at the clamped goal. Rewrite the two pins red-then-green.
- [x] `src/shell/entry.ts`, `mount.tsx`, `App.tsx`, new `src/shell/colophon-host.tsx`, new `src/colophon/colophon.tsx` -- wire as mapped.
- [x] `public/_redirects` -- `/* /index.html 200`.
- [x] Audits in the Code Map -- repoint them to the new signatures and keep the mutation rows red-then-green. Add: App renders `<ColophonHost />` only for `colophon`; the colophon host is `lazy(() => import('../colophon/colophon.tsx'))` behind a boundary; `mount.tsx` is `advanceScroll`'s only caller in the shell outside `scene-host.tsx` and `activate.ts`; the real build emits a separate `colophon` chunk off the entry graph.
- [x] Docs as mapped. Record the `pagehide` save and the rig seed.

**Acceptance Criteria:**
- Given `npm run build`, when the bundle assertion runs, then the entry graph holds `router.ts` and no React, renderer or colophon, within budget, and a colophon chunk exists apart from it.
- Given the scene left at a stop for `/colophon`, when Back is pressed, then the scene's first frame is that stop, not the opening frame.
- Given a Project focused on `/`, when Back is pressed, then the previous history entry is reached and the store's Focus is untouched.

### Review Findings

Second review round, 2026-10-16, `925844c..06a07f0`.

- [x] [Review][Decision] **Resolved 2026-10-16, Thomas: every route, as now.** The Always rule stands as written: `navigate` and `pagehide` save on every route, and a route-changing pop restores any well-formed state. The `/chart` sequence below is picked up with the 4.5 pop-departure deferral. Finding: a position is saved into, and restored from, entries that never showed the scene — `navigate` and `pagehide` save on every route, and a route-changing pop restores whatever well-formed state the reached entry holds, so a pop to `/chart` or `/colophon` writes `scrollProgress` on a route with no scene. Sequence: `/` at 2.4 → `/chart` (chart entry later saved 2.4) → Back to `/`, scroll to 5 → Forward to `/chart` restores 2.4 → a later `navigate('home')` opens at 2.4, not 5. The spec's Always rule ("navigate … first saves the departing position") is unconditional, while the I/O matrix only names "Leave scene". Choose: save and restore only for `home` entries, or keep saving on every route.
- [x] [Review][Patch] `createRouter` calls `history.canonicalize` (a `replaceState` with a URL) before `createRoot`, unguarded; a `SecurityError` (sandboxed opaque-origin frame) on a non-canonical path throws out of `mount` and nothing renders — the failure class 4.1's review closed for `matchMedia` [src/shell/router.ts:139]
- [x] [Review][Patch] The colophon chunk's heavy-reach check walks direct edges only; Rollup hoists transitive static imports onto entry chunks, not dynamic ones, so colophon → shared chunk → react-dom or a scene chunk passes. Walk static imports transitively [scripts/bundle-assertion.test.ts:301]
- [x] [Review][Patch] `advanceScrollCallers` counts only call sites (`advanceScroll(`); a fourth writer passing the function by reference (`restore: advanceScroll`) evades "three callers and no fourth" [src/shell/router.test.ts:528]
- [x] [Review][Patch] The `detect.test.ts` row still says "the entry's three static imports in order"; the audit now pins four (tokens, page, detect, router) [src/shell/README.md:14]
- [x] [Review][Patch] AC 3 is not tested as written: the Focus test presses Back from `/colophon`, never from `/` with Focus held. Add the row: start at `/colophon`, navigate home, focus, Back — route `colophon`, Focus untouched [src/shell/router.test.ts]
- [x] [Review][Patch] The spec's frontmatter read `status: 'done'` while the story was in `review` [spec-4-2-surface-routing-with-real-history.md:5] — reconciled: the story closes `done` in both
- [x] [Review][Defer] `navigate`'s `save`/`push` can throw (Safari's `replaceState` rate limit, `SecurityError`) into its caller, leaving the save without the push [src/shell/router.ts:159] — deferred, unreachable until 4.5 adds the first caller
- [x] [Review][Defer] A pop to a `home` entry holding no saved position (one pushed by 4.5's `navigate('home')`, state `null`) keeps the store's last value rather than opening at 0 [src/shell/router.ts:143] — deferred, unreachable until 4.5
- [x] [Review][Defer] The mount and entry wiring (`createRouter` hooks bound to the store, `resolveRoute(location.pathname)` into `mount`) and the colophon boundary's failure path are verified only by source text, like `App` [src/shell/mount.tsx:63] — deferred, widens the existing App-rendering deferral
- [x] [Review][Defer] `/chart` now reaches the interim fallback on a capable desktop, where the corner chrome still reads `scroll ↓ — time runs backward` with no scene [src/App.tsx:78] — deferred, widens 4.1's interim-fallback deferral (4.3)

## Design Notes

```ts
// router.ts — the whole history contract
navigate(to) {
  if (to === current) return;
  history.save({ scrollProgress: position.read() }); // replaceState, URL unchanged
  history.push(ROUTE_PATHS[to]);                      // pushState, no fragment
  current = to; notify();
}
// popstate: current = resolveRoute(pathname); restore(state) if well-formed; notify()
```

Root (`/`) is "this machine's surface", so no `/scene` path exists. A capable visitor's choice of the scene in 4.5 is `navigate('home')`.

## Verification

**Commands:**
- `npm test` -- expected: all green.
- `npm run typecheck` -- expected: no errors.
- `npm run build` -- expected: the gate passes, the entry is within budget, and a colophon chunk is emitted.

**Manual checks:**
- Run `npm run preview` and open `/`. Scroll to the third stop, enter `/colophon` in the address bar, then press Back: the scene opens at the third stop. Open `/chart` on desktop: the Network panel shows no render-scene chunk.

## Suggested Review Order

**The history contract**

- Entry point: one router over an injected history; canonicalise and restore before first render.
  [`router.ts:126`](../../src/shell/router.ts#L126)

- Save-then-push; same route is a no-op, so focus and store events never push.
  [`router.ts:159`](../../src/shell/router.ts#L159)

- Pops restore only on a route change; fragment-only pops write nothing.
  [`router.ts:143`](../../src/shell/router.ts#L143)

- `pagehide` save covers cross-document returns, restored at creation.
  [`router.ts:150`](../../src/shell/router.ts#L150)

- The one well-formedness gate: finite ≥ 0, anything else is null.
  [`router.ts:81`](../../src/shell/router.ts#L81)

- Real history adapter: canonical rewrite keeps search and fragment.
  [`router.ts:173`](../../src/shell/router.ts#L173)

**Route resolution and surface choice**

- Trailing slashes ignored; anything unknown is home.
  [`router.ts:51`](../../src/shell/router.ts#L51)

- Route × machine → shown; `/chart` is the flat surface on any machine.
  [`router.ts:63`](../../src/shell/router.ts#L63)

- Entry takes only `resolveRoute`, before the mount chunk resolves.
  [`entry.ts:36`](../../src/shell/entry.ts#L36)

**Wiring into the page**

- Router built before render; hooks bind to `scrollProgress` and `advanceScroll`.
  [`mount.tsx:63`](../../src/shell/mount.tsx#L63)

- Route read from the router, never the store.
  [`App.tsx:63`](../../src/App.tsx#L63)

- Colophon alone on its route; scene host gated on the route's answer.
  [`App.tsx:65`](../../src/App.tsx#L65)

- Lazy colophon behind a boundary that logs and keeps the root.
  [`colophon-host.tsx:19`](../../src/shell/colophon-host.tsx#L19)

- Minimal colophon: one `<h1>` until 5.1.
  [`colophon.tsx:12`](../../src/colophon/colophon.tsx#L12)

**Returning at the saved stop**

- Rig's first frame seeds at the clamped goal, not 0.
  [`rail-model.ts:697`](../../src/render-scene/rail-model.ts#L697)

**Peripherals**

- Every I/O row against a fake history and the real store.
  [`router.test.ts:208`](../../src/shell/router.test.ts#L208)

- Seed pins rewritten red-then-green.
  [`rail-model.test.ts:1068`](../../src/render-scene/rail-model.test.ts#L1068)

- Colophon chunk off the entry graph, reaching no scene or react-dom chunk.
  [`bundle-assertion.test.ts:284`](../../scripts/bundle-assertion.test.ts#L284)

- Single-page rewrite for Netlify-style hosts.
  [`_redirects:1`](../../public/_redirects#L1)
