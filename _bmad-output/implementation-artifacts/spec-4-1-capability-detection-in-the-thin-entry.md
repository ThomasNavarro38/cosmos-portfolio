---
title: 'Capability detection in the thin entry'
type: 'feature'
created: '2026-10-15'
status: 'done'
baseline_commit: 'fc79fcec9e2a6c0f81fa9f13b793d45b93dc3591'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `src/main.tsx` is the entry and carries React plus the whole `App` (219,157 bytes), and `SceneHost` mounts the scene unconditionally, so a visitor without WebGL2 or on a phone downloads React and reaches a scene that cannot initialise (AD-6, AD-7, AD-8; `deferred-work.md:445`).

**Approach:** A plain-TS `src/shell/entry.ts` runs `detect()` (WebGL2 context creation and primary-pointer coarseness, nothing else), picks a surface, then dynamically imports one shell mount module and calls `mount(surface)`. The `scene` surface is today's `App`, which lazily loads `render-scene`; the `fallback` surface is the same DOM surface (index, chrome, panel) with no scene host, so `render-scene` is never requested. Story 4.3 swaps that for the `render-fallback/` star chart. (Thomas's rulings, 2026-10-15: Q1 recommended, Q2 accepted, Q3 and Q4 agreed.)

## Boundaries & Constraints

**Always:**
- `entry.ts` and `detect.ts` import no React, no Three, no `src/data/`, no renderer, and never read `prefers-reduced-motion`.
- `detect()` creates one WebGL2 context and releases it (`WEBGL_lose_context`). No timing, frame or GPU probe.
- Mobile is `matchMedia('(pointer: coarse)')`, the primary pointer. Never `any-pointer`, never width or height.
- The entry loads exactly one mount module. The fallback surface never requests `render-scene`.
- The CSS for `tokens.css` and `page.css` sits on the entry, so the first frame is the ground. No splash, loader or gate markup.
- The reduced-motion writer lives in the mount, page-wide, and runs before the first render.

**Ask First:** changing the store's state keys (pinned by R1); adding a performance probe; adding a retry or loader for a failed mount import.

**Never:** build the star chart (4.3); add routes or history (4.2); add an offer affordance (4.5, 4.6); put the surface in the store.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Capable desktop | webgl2 ctx returned, pointer fine | `scene` | N/A |
| No WebGL2 | `getContext('webgl2')` returns null | `fallback` | N/A |
| Context throws | `getContext` throws | `fallback` | swallowed, so the result is `webgl2: false` |
| Phone | coarse primary pointer, WebGL2 present | `fallback` | N/A |
| Narrow desktop | fine pointer, 400px window | `scene` | N/A |
| Reduced motion | capable, `prefers-reduced-motion: reduce` | `scene` | N/A |
| No matchMedia | `matchMedia` undefined | coarse = false | N/A |
| Mount import fails | chunk 404 | `console.error` names the cause, page keeps the ground | no retry, by decision |

</frozen-after-approval>

## Code Map

- `index.html:11` -- script src `/src/main.tsx`, which becomes `/src/shell/entry.ts`. `identity-audit.test.ts:726` pins the text only.
- `src/main.tsx` -- deleted. Its mount moves to `src/shell/mount.tsx`. Stale citations at `src/derive/boundaries.ts:257,473`, `README.md:45`, `src/tokens/README.md:18`, `src/derive/README.md:313,317`, `src/shell/README.md:29`.
- `src/App.tsx:44-61` -- `App()` takes no props and imports `./shell/page.css` at :44. It gains `surface` and renders `SceneHost` only for `scene`. Prose at :4-6 and :35-36.
- `src/shell/scene-host.tsx:294-304` -- the matchMedia writer effect, import at :78, prose at :30-35 and :64-72.
- `scripts/bundle-assertion.ts:36-40` -- budget and ban lists, header at :14-21.
- `scripts/bundle-assertion.test.ts:30,39,50-70,78,231-240` -- the `MAIN` facade id; the fixtures that put `react` in a passing entry (:39, :78); the ban loops; the real build and its `bytes > 100_000` floor (:235).
- `src/shell/panel-model.test.ts:854-883` (`auditTokensImport` reads `../main.tsx`) and `:1442-1470` (`auditMount`, whose mutation regexes match `<SceneHost artifact={artifact} />` exactly).
- `src/shell/rail-input.test.ts:701-760` (`auditPreferenceWriter(SCENE_HOST_TSX)`) and `src/render-scene/scene-model.test.ts:3712-3800` (`PREFERENCE_ROLES`: scene-host is `writer`; the stale-row check at :3770; the fixture at :3785 rejecting `entry.ts`, which must keep rejecting).
- `src/render-scene/scene-model.test.ts:2596-2617` and `src/identity-audit.test.ts:953-971` -- App.tsx scans: SceneHost import and tag, and `page.css` imported once.
- `src/derive/boundaries.ts:158-178,263-276` -- the shell row allows React. A shell→`../App.tsx` import is permitted (`targetDirectoryOf` yields `App.tsx`). `boundaries.test.ts:718` pins `README.md:45` as an import sentence.
- Message strings naming "scene-host.tsx is its one writer": `chrome-model.test.ts:402`, `panel-model.test.ts:976`, `motion-preference.test.ts:78`.

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/detect.test.ts` -- RED first: every I/O row against an injected env, plus a source scan of `detect.ts` and `entry.ts` (no `react`, `three`, `render-`, `data/`, `reduced-motion`, `performance`, `requestAnimationFrame`, `innerWidth`, `any-pointer`; `entry.ts` holds exactly one `import(` and it targets `./mount.tsx`) -- pins AD-6/7/8.
- [x] `src/shell/detect.ts` -- `detect(env)` returns `{ webgl2, coarsePointer }`; `chooseSurface` returns `'scene' | 'fallback'`; also `browserEnv()` and the `Surface` type -- pure and injectable.
- [x] `src/shell/entry.ts` -- import `tokens.css` then `page.css`, start `import('./mount.tsx')`, then detect and choose, then `mount(surface)`, with a `.catch` that logs -- the thin entry.
- [x] `src/shell/mount.tsx` -- the reduced-motion writer (set from `matches`, then a `change` listener) before `createRoot(#root).render(<StrictMode><App surface/></StrictMode>)` -- closes `deferred-work.md:654`.
- [x] `src/App.tsx`, `src/shell/scene-host.tsx`, `index.html`, delete `src/main.tsx` -- re-wire as mapped. App drops its `page.css` import.
- [x] `scripts/bundle-assertion.ts` -- ban `react`, `react-dom`, `scheduler`, `src/render-fallback/`, `src/colophon/`; set the budget to the measured entry × ~1.5, recording the measurement -- AD-7.
- [x] Tests in the Code Map -- repoint audits to `mount.tsx` / `entry.ts` (red-then-green mutations kept). Swap the floor for "the entry facade is `src/shell/entry.ts`". Add a real-build assertion that no entry-graph module is React. Add an App source assertion that `SceneHost` is gated on `surface === 'scene'`.
- [x] Docs -- `README.md:45` (same line), `src/shell/README.md` (files table, writer, First Paint wording), `src/tokens/README.md`, `src/derive/README.md`, `boundaries.ts` comments. Close `deferred-work.md:445,476,654,846` and `scripts/bundle-assertion.ts:34`.

**Acceptance Criteria:**
- Given `npm run build`, when the bundle assertion runs, then the entry graph holds no React, Three, solver, `src/data/` or renderer, and stays within the tightened budget.
- Given the fallback surface, when it mounts, then the index, chrome and panel render and no `render-scene` chunk is requested.
- Given a capable machine with reduced motion, when it loads, then the scene renders and `reducedMotion()` reads true.

### Review Findings

- [x] [Review][Patch] The mount's reduced-motion writer throws where `detect()` tolerates: a throwing or null `matchMedia`, or a `MediaQueryList` with neither `addEventListener` nor `addListener`, throws before `createRoot`, so nothing renders [src/shell/mount.tsx:27]
- [x] [Review][Patch] The writer's surface-independence is unverified: `if (surface === 'scene') writeReducedMotion();` passes every audit, which reopens deferred-work 654; pin the call as unconditional, with a mutation row [src/shell/rail-input.test.ts:716]
- [x] [Review][Patch] Spec Design Notes and the entry.ts task show the rejected form (detect before the import, two-argument `.then`), which the entry audit now bans; show what shipped [spec-4-1-capability-detection-in-the-thin-entry.md:115]
- [x] [Review][Patch] The entry measurement is recorded as 2,704 in some places and 2,777 in others; the header's "about 1.44× under it" is garbled [scripts/bundle-assertion.test.ts:162]
- [x] [Review][Patch] `detect.test.ts` has no row where `getExtension` returns null or `loseContext()` throws [src/shell/detect.test.ts:53]
- [x] [Review][Patch] Root README still calls `src/App.tsx` "the entry stub" [README.md:45]
- [x] [Review][Patch] The positive-control fixture still uses the deleted `main.tsx`, importing a non-existent `boot` from the thin entry [src/derive/boundaries.test.ts:591]
- [x] [Review][Patch] Ruling Q2 is not carried into the epic records: epic-4-context says the entry imports "exactly one renderer chunk" and that boundaries are enforced "by ESLint"; UX-DR38 ("in the document from First Paint") has no Q2 amendment [_bmad-output/implementation-artifacts/epic-4-context.md:34]
- [x] [Review][Patch] The interim-fallback deferral is framed around phones; it omits a desktop visitor without WebGL2 losing ↑/↓/Home/Escape and the wheel, and the chrome still advertising "scroll ↓" and "esc — release" [_bmad-output/implementation-artifacts/deferred-work.md:939]

## Design Notes

```ts
// entry.ts
import '../tokens/tokens.css';
import './page.css';
import { browserEnv, chooseSurface, detect } from './detect.ts';
const mounting = import('./mount.tsx');
const surface = chooseSurface(detect(browserEnv()));
mounting
  .then((module) => module.mount(surface))
  .catch((error: unknown) => console.error('the surface failed to load; the page keeps its ground.', error));
```

The import starts before detection, so the chunk request is not held behind WebGL2 context creation; detection is synchronous, so the surface is known before the import can resolve. `.then().catch()` rather than `.then(ok, err)`, so a throwing `mount` is logged too, not left an unhandled rejection (review patches; the entry audit in `detect.test.ts` bans both earlier forms).

The index now renders from the mount chunk, one dynamic import after the entry, and still before any renderer is requested (ruling Q2).

## Verification

**Commands:**
- `npm test` -- expected: all green.
- `npm run typecheck` -- expected: no errors.
- `npm run build` -- expected: the gate passes; the pass line shows the new entry bytes within budget.

**Manual checks:**
- Run `npm run preview`. In Chrome DevTools, emulate a touch device and confirm the index and panel show with no scene chunk in Network. On desktop the scene loads.

## Suggested Review Order

**The thin entry**

- Start here: the mount import starts first, then synchronous detection picks the surface.
  [`entry.ts:27`](../../src/shell/entry.ts#L27)

- One WebGL2 context, created and released; a throw means no.
  [`detect.ts:53`](../../src/shell/detect.ts#L53)

- Primary pointer only; a throwing or absent matchMedia reads fine.
  [`detect.ts:80`](../../src/shell/detect.ts#L80)

- The whole routing table: scene only for WebGL2 under a fine pointer.
  [`detect.ts:85`](../../src/shell/detect.ts#L85)

- Vite now builds from the entry, not the React mount.
  [`index.html:11`](../../index.html#L11)

**The surface, mounted**

- Preference writer runs page-wide before the first render, with Safari's addListener fallback.
  [`mount.tsx:27`](../../src/shell/mount.tsx#L27)

- The chosen surface handed to App; React starts here, off the entry.
  [`mount.tsx:39`](../../src/shell/mount.tsx#L39)

- The gate: the scene host, and so render-scene, only on `scene`.
  [`App.tsx:64`](../../src/App.tsx#L64)

**Enforcement on bundler output**

- React and the other two surfaces now banned from the entry graph.
  [`bundle-assertion.ts:44`](../../scripts/bundle-assertion.ts#L44)

- Budget tightened from 240,000 to 4,000 bytes; measured 2,777.
  [`bundle-assertion.ts:42`](../../scripts/bundle-assertion.ts#L42)

- Why these rules live in scans and the bundle, not the boundary gate.
  [`README.md:47`](../../src/shell/README.md#L47)

**Tests and records**

- The I/O matrix against an injected env, row by row.
  [`detect.test.ts:72`](../../src/shell/detect.test.ts#L72)

- The real browser seam, exercised against stubbed globals.
  [`detect.test.ts:156`](../../src/shell/detect.test.ts#L156)

- Entry audit with its mutation rows: order, one import, logged, no retry.
  [`detect.test.ts:258`](../../src/shell/detect.test.ts#L258)

- The writer audit, moved from scene-host to the mount.
  [`rail-input.test.ts:751`](../../src/shell/rail-input.test.ts#L751)

- Real build: the shipped entry holds no React, within budget.
  [`bundle-assertion.test.ts:244`](../../scripts/bundle-assertion.test.ts#L244)

- Ruling Q2 recorded on AD-4.
  [`ARCHITECTURE-SPINE.md:83`](../planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md#L83)
