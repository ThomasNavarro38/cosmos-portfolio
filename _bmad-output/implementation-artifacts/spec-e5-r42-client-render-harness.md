---
title: 'A client-render path in the render harness'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: 'cdf772e9e573ae4c5135f9c4ccb9305862d11adf'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The harness (`scripts/render.ts`) renders statically, so no effect, click-driven state change or client error boundary ever runs under `npm test`; four bindings are held only by source-text regexes (5.1 effect, 5.2 boundary, 5.5 press, 6.3 label), recorded as deferrals and as Epic 5 retro item 42.

**Approach:** Add a client path to the harness — `happy-dom` (Thomas, ruling (a), 2026-10-28, superseding the 4.7/4.8 exclusion of a DOM package) installed as globals only while a client render runs, `react-dom/client` `createRoot` under React's `act` — and add executed tests for the four bindings beside their existing audits.

## Boundaries & Constraints

**Always:**
- `happy-dom` is a devDependency pinned exactly (`20.14.6`, the newest release at least two weeks old), with `package-lock.json` regenerated; `npm run gate` stays green.
- It is imported only by `scripts/render.ts`; every importer of `render.ts` stays a `*.test.ts` (render.test.ts:304-310).
- One React: `react-dom/client` (and `act`) required through the same `requireFromRoot` as `react`, never through Vite.
- DOM globals exist only between mount and unmount of a client render, and the globals present before (Node 24's `navigator`, `fetch`, `AbortController`) are restored afterwards; the static path is unchanged and its tests stay green.
- The recorder's `active` flag is set for the client pass and cleared after it, so nothing leaks into the next pass.
- Existing source audits stay; the executed tests sit beside them.

**Ask First:** Any change to a shipped `src/` module to make it testable; adding a second new dependency.

**Never:** No DOM package imported from a `*.test.ts` directly or from `src/`; no Vite config change; no change to shipped behaviour.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Exhibits drawn | `Colophon` mounted, fake `fetch` answering both paths | after the effect settles, two `pre.colophon-exhibit` with the files' text | — |
| Leave before load | unmount while both fetches pend | both signals aborted; no state update or log after | — |
| Fetch fails | fake `fetch` answers 404 | one `console.error`, no `<pre>` drawn | — |
| Unreadable layout | `ColophonHost` with a layout `derivationRows` throws on | boundary renders nothing; root kept; one error logged | the throw does not escape the mount |
| Solve pressed | exhibits loaded, `solve it again` clicked | button `aria-disabled="true"`, then the result `pre` named `layout, solved in this browser` | — |
| Copy clicked | `ContactRoute`, fake clipboard resolving / rejecting / absent | button reads `copied` / `not copied` / `not copied` | — |

</frozen-after-approval>

## Code Map

- `scripts/render.ts` -- the harness (anchored by symbol: the client path shifted every line number). `renderer()` (Vite middleware server, `load` = `ssrLoadModule`, `render`, `elements`, `subscriptions`, `mount`, `close`); one React via `requireFromRoot` (`createRequire`); wraps installed once in the top-level block under `WRAPPED` (`Symbol.for('cosmos-portfolio.render.wrapped')`), recordings at `RECORDED` (`Symbol.for(...recorded)`); `recorded.active` toggled in `prerenderOnce` and, since this change, in `mountClient`; the client path `installGlobals`, `DOM_CONSTRUCTORS`, `domGlobals`, `mountClient`; markup helpers `parseMarkup`, `queryAll`, `queryOne` (reused on `container.innerHTML` by `markup()`).
- `scripts/render.test.ts` -- harness tests; the importer check `the harness is test-only: every module importing it is a *.test.ts`; the client-path tests under `// --- Client renders`.
- `scripts/check-pins.ts` :42-45, :93-108 -- exact `X.Y.Z` for every dependency field; no name list.
- `src/colophon/colophon.tsx` -- `Colophon({links})` :229, `startExhibits` effect :233, lazy `createLiveSolve` :234, stop effect :235, `onSolve` :236-238.
- `src/shell/colophon-host.tsx` -- `lazy(import colophon)` :30, `ColophonBoundary` :41-55 (null + log `'the colophon failed to load; the page keeps its root.'` :49), `<Suspense fallback={null}>` :66-70, props `{surface, router}` :57-61.
- `src/shell/contact-route.tsx` -- `clipboardWrite()` :36-41 reads `navigator.clipboard`; `ContactRoute` :58-63.
- `src/colophon/colophon.test.ts` (audits `auditEffect`, `auditLiveSolve`; executed tests under `// --- The default, executed`), `src/shell/colophon-host.test.ts` (`auditColophonHost`; executed test under `// --- The boundary, executed`), `src/shell/contact-route.test.ts` (`withNavigator`, `pressRendered`, `auditBinding`; executed test under `// --- The label, executed`) -- where the executed tests go.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- entries closed: the spec-5-1 code review's effect-wiring entry (5.1 effect) and the spec-5-2 code review's `ColophonBoundary` entry (5.2 boundary); the 5.5 press and 6.3 label, which had no entries, recorded as closed beside them; the spec-e5-r38 review's failed-chunk entry (no route out when the colophon chunk fails) is behaviour, untouched.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `package-lock.json` -- add `"happy-dom": "20.14.6"` to devDependencies; `npm install` -- the DOM the client path needs.
- [x] `scripts/render.ts` -- add `mount(element)` to `Renderer`: install happy-dom globals (saving and restoring prior ones), `createRoot` under `act`, mark the recorder active, return `{ container, act, unmount }`; `unmount` unmounts under `act`, closes the window, restores globals. Header comment gains a **Client renders** paragraph.
- [x] `scripts/render.test.ts` -- an effect runs and its cleanup runs on unmount; a click changes state; a client boundary catches a child throw; globals restored after unmount (`document` absent, `navigator` the original); the static path unaffected after a client mount.
- [x] `src/colophon/colophon.test.ts` -- executed: exhibits drawn; leave before load aborts with nothing after; a 404 logs once and draws no `<pre>`; solve pressed (a stubbed solver via the harness `load` seam or an injected `fetch` answering the career).
- [x] `src/shell/colophon-host.test.ts` -- executed: a layout `derivationRows` cannot read is caught by `ColophonBoundary` — container empty, one error logged, nothing escapes.
- [x] `src/shell/contact-route.test.ts` -- executed: a click under a resolving, rejecting and absent clipboard reads `copied`, `not copied`, `not copied`.
- [x] `deferred-work.md`, the four specs' READMEs rows touched (`scripts/` row in root README if present, `src/colophon/README.md`, `src/shell/README.md`), `ARCHITECTURE-SPINE.md` `## Stack` and `epics.md` pinned-stack list -- record happy-dom as test-only and close the deferrals (struck through, with the closing test named).

**Acceptance Criteria:**
- Given `npm test`, when it runs, then every new executed test passes and the static-render tests are unchanged in count and result.
- Given a binding is broken (the effect's stop not returned, the boundary removed, the press not wired, the label not set), when the executed test runs, then it fails — each shown red once during implementation.
- Given `npm run gate` and `npm run build`, when run, then both pass and no chunk contains `happy-dom`.

## Design Notes

happy-dom's `GlobalRegistrator`-style install is avoided: install exactly the globals React's DOM client and these components read (`window`, `document`, `navigator`, `HTMLElement`, `Node`, `Event`, `MouseEvent`, `requestAnimationFrame`…) from one `new Window()`, saved and restored by name, so Node's own `fetch`/`AbortController` stay native and `withNavigator` keeps working. Set `globalThis.IS_REACT_ACT_ENVIRONMENT = true` for the pass. The solver is stubbed by answering the live import through a fake module only if no seam exists without touching `src/` — otherwise ask first.

## Verification

**Commands:**
- `npm test` -- expected: 0 fail; executed tests listed above present.
- `npx tsc --noEmit` -- expected: clean.
- `npm run gate` and `npm run build` -- expected: green; `grep -r happy-dom dist/` empty.

## Suggested Review Order

**The client path in the harness**

- Entry point: the design, globals installed only while mounted, one React.
  [`render.ts:68`](../../scripts/render.ts#L68)

- `mount` claims the one open slot, shared across module copies.
  [`render.ts:449`](../../scripts/render.ts#L449)

- DOM globals plus the act flag, installed before `react-dom/client` first loads.
  [`render.ts:472`](../../scripts/render.ts#L472)

- Save-and-restore by name; rolls back a partial install.
  [`render.ts:388`](../../scripts/render.ts#L388)

- The deliberately minimal constructor list; extend by name.
  [`render.ts:412`](../../scripts/render.ts#L412)

- The `Mounted` surface: act, settle, waitFor, caught, uncaught, unmount.
  [`render.ts:303`](../../scripts/render.ts#L303)

**The bindings, now executed**

- 5.1: the effect fetches both files and draws them.
  [`colophon.test.ts:808`](../../src/colophon/colophon.test.ts#L808)

- 5.1: leaving early aborts both requests through the real abort path.
  [`colophon.test.ts:830`](../../src/colophon/colophon.test.ts#L830)

- 5.5: the real solver, aria-disabled false → true → false recorded.
  [`colophon.test.ts:865`](../../src/colophon/colophon.test.ts#L865)

- 5.2: the boundary catches; a sibling proves the root survives.
  [`colophon-host.test.ts:139`](../../src/shell/colophon-host.test.ts#L139)

- 6.3: the label after a real click, three clipboards.
  [`contact-route.test.ts:244`](../../src/shell/contact-route.test.ts#L244)

**Harness guards and peripherals**

- waitFor gives up instead of hanging the suite.
  [`render.test.ts:465`](../../scripts/render.test.ts#L465)

- Globals restored after unmount; Node's own navigator back.
  [`render.test.ts:386`](../../scripts/render.test.ts#L386)

- happy-dom stays the harness's alone.
  [`render.test.ts:434`](../../scripts/render.test.ts#L434)

- The exact test-only pin (advisory accepted, deferred-work.md).
  [`package.json:38`](../../package.json#L38)
