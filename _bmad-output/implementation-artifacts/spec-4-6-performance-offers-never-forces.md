---
title: 'Performance offers, never forces'
type: 'feature'
created: '2026-10-19'
status: 'done'
baseline_commit: '65827868e8e37f63bbf8dad5fbb922149d99589d'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings:
  - oversized
deferred:
  - summary: >-
      The 4.6 wiring (FrameSampler inside the Canvas, scene-host's resets, CornerChrome's useSyncExternalStore read into chartRouteClass) is held only by source-text audits; nothing renders it or drives a real frame loop or visibilitychange.
    evidence: |-
      chart-offer.test.ts executes the monitor on synthetic deltas and chrome-model.test.ts executes chartRouteClass, but auditSamplerMount, auditFrameSampler, auditResets and the auditChrome additions match source text only; node --test cannot load .tsx and the repo has no DOM harness. This widens the 4.3/4.5 render deferrals ("Nothing renders Chart", "links verified by source scans only"); a renderToStaticMarkup or DOM-harness test of CornerChrome before and after the latch would close the chrome half.
    location: >-
      src/render-scene/frame-sampler.tsx, src/render-scene/scene.tsx, src/shell/scene-host.tsx, src/shell/corner-chrome.tsx
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Nothing measures the running scene's framerate. A capable machine that cannot hold the NFR-2a floor (24fps sustained, unratified) keeps the scene, which is right: it is never forced away. But nothing ever *offers* the chart when the scene runs too slowly (AD-8, FR-22, NFR-2a, NFR-3).

**Approach:**
- A pure, node-tested sustained-framerate monitor in `src/shell/chart-offer.ts`, fed by one frame-time sampler that is a child of the scene's `<Canvas>`.
- When the windowed framerate falls below the one named constant `FALLBACK_FLOOR_FPS = 24`, the offer latches.
- The offer shows only as a rest-state cue on 4.5's existing `the chart` link: `ink-prose` plus a hairline underline (Thomas's ruling Q1a, 2026-10-19).
- Nothing navigates except the visitor's own click.

## Boundaries & Constraints

**Always:**
- **The floor is one constant,** `FALLBACK_FLOOR_FPS = 24`, exported from `chart-offer.ts`. It carries a comment saying the value awaits ratification (PRD §13 Q16, NFR-2a) and that it is the floor, not NFR-2's 30fps target.
  - `detect.ts`, `route.ts`, `router.ts` and `entry.ts` never import `chart-offer.ts`.
  - Changing the value touches no other file.
- **Sustained (ruling Q3, defaults):**
  - After every reset, the first `WARMUP_SECONDS = 2` of frame time are discarded.
  - The test then runs over a rolling window of the most recent `SUSTAIN_SECONDS = 5` of frame time. The offer latches when the window is full and `frames / seconds < FALLBACK_FLOOR_FPS`.
  - A non-finite, zero or negative delta is ignored.
- **Resets:** sampling resets (warm-up again) when the scene host mounts and when the document becomes visible again (`visibilitychange`). A background tab, and R3F's first long delta after one, never count.
- **Latch:** the offer, once made, holds for the life of the page. It never clears on recovery or on a scene remount, so the link never flickers (NFR-3, stability). Sampling after the latch is a no-op.
- **Offer state shape:** a module-level boolean in `chart-offer.ts`, in the `motion-preference.ts` shape:
  - `chartOffered()` and `subscribeChartOffer(listener) => unsubscribe` for `useSyncExternalStore`;
  - one notify on the latch;
  - `sampleFrame(deltaSeconds)` and `resetFrameSampling()`;
  - a test-only reset is allowed (`resetChartOfferForTest`) if needed.

  It imports nothing and is not in `navigationStore`.
- **The cue (ruling Q1a):**
  - `corner-chrome.tsx` reads `chartOffered` through `useSyncExternalStore` and gives the link its class through a pure `chartRouteClass(offered)` in `chrome-model.ts`: `'chrome-route'` normally, `'chrome-route chrome-route-offered'` when offered.
  - `.chrome-route-offered` sets `color: var(--color-ink-prose-dark)`, plus the same hairline underline declarations as `.chrome-route:focus-visible`.
  - There is no new element, no new copy and no `aria-*` change. The link's text and `href` are unchanged.
- **Never forced:** no module that imports `chart-offer.ts` calls the router, and `chart-offer.ts` and `frame-sampler.tsx` contain no `navigate`, `history`, `location` or `router`. A source scan with mutation rows holds this.
- **Quality holds:**
  - The importers of `chart-offer.ts` under `src/` are exactly `corner-chrome.tsx` (reads `chartOffered`, `subscribeChartOffer`), `scene-host.tsx` (calls `resetFrameSampling`) and `render-scene/frame-sampler.tsx` (calls `sampleFrame`). A scan pins that set and those names.
  - No `<Canvas>` prop changes (`dpr`, `gl`, `frameloop`, `performance` stay as they are).
- **Sampler shape:** `frame-sampler.tsx` is exactly one `useFrame((_, delta) => { sampleFrame(delta); })` and renders `null`.
  - It holds no state, no effect, no store read, and no `window`/`document` access.
  - It is mounted once inside `scene.tsx`'s `<Canvas>`, and the scene's audits are updated to admit it.
- **Reduced motion** never feeds the monitor and is never read by `chart-offer.ts`.
- **Q2a:** `detect()` is unchanged (no `failIfMajorPerformanceCaveat`). A software renderer gets the scene, and the monitor offers the chart. The 4.1 deferral (`deferred-work.md:942-944`) is closed with this ruling.
- **Docs:**
  - `src/render-scene/README.md` lists `chart-offer.ts` as a seventh permitted `src/shell/` import, and adds the `frame-sampler.tsx` row.
  - `src/shell/README.md` adds the `chart-offer.ts` row.

**Block If:**
- the entry chunk exceeds 4,000 bytes or reaches `chart-offer.ts`;
- the offer needs copy, a new element, or a `<Canvas>` setting change.

**Never:**
- A reroute, a `navigate` call, or a URL change without the visitor acting.
- A banner, a toast, a third chrome line, a slot state, or the words `slow`, `struggling`, `performance`, `lite` or `fallback` in visible copy.
- A performance probe on the First Paint path.
- Lowering the DPR, antialiasing, geometry, the Dust or any feature to gain frames.
- Measuring on the Fallback surface.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Healthy | 60fps for 30 s | not offered | N/A |
| Just above floor | 25fps for 30 s | not offered | N/A |
| Below floor | 20fps for 7 s | offered once the window fills (2 s warm-up + 5 s); listeners notified once; no route change | N/A |
| Warm-up only | 10fps for 1.9 s | not offered | N/A |
| Hitch | 60fps with one 0.5 s frame | not offered | N/A |
| Reset mid-window | 20fps for 4 s, reset, 60fps for 30 s | not offered | N/A |
| Latch | offered, then 60fps for 30 s, then reset | still offered; no second notify | N/A |
| Bad delta | `NaN`, `0`, `-1`, `Infinity` | ignored; window unchanged | ignored |
| Unsubscribe | listener removed before the latch | not called | N/A |
| Cue | `chartRouteClass(false)` / `(true)` | `'chrome-route'` / `'chrome-route chrome-route-offered'` | N/A |

</intent-contract>

## Code Map

- `src/shell/motion-preference.ts` -- the shape to copy for `chart-offer.ts`: a module-level value, a listener `Set`, `subscribe…` returning the unsubscribe, a notify only on change, and no imports.
- `src/shell/chrome-model.ts` + `chrome-model.test.ts` -- add `chartRouteClass`. The test scans `corner-chrome.tsx` markup and `corner-chrome.css` declaration by declaration, so add the offered rule and its mutation rows there.
- `src/shell/corner-chrome.tsx:94-96` -- the `the chart` `<a className="chrome-route">`. It already reads the motion preference with `useSyncExternalStore(subscribeReducedMotion, reducedMotion)`, so read the offer the same way.
- `src/shell/corner-chrome.css:43-62` -- `.chrome-route` and its hover/focus rules. Add `.chrome-route-offered` with tokens only; the file header documents each rule.
- `src/shell/scene-host.tsx:245` -- an existing `useEffect` owns the scene's DOM listeners. Add `resetFrameSampling()` on mount and a `visibilitychange` listener (reset when it becomes visible), removed on cleanup. Its header documents its listeners.
- `src/render-scene/scene.tsx` -- the thin `<Canvas>` mapping. Mount `<FrameSampler />` inside it. Its header lists the children, and `scene-model.test.ts` scans the children and forbids `useFrame` in `scene.tsx` itself (`:917-921`, `:1124`).
- `src/render-scene/rail-camera.tsx` / `mote-field.tsx` -- the frame-binding pattern. Their audits in `scene-model.test.ts` (`:2720-2770`, `:3010-3060`) are the model for a `frame-sampler.tsx` audit: one `useFrame`, no hooks, no `window`/`document`.
- `src/derive/boundaries.ts:190` -- the `render-scene` row already permits `src/shell/`. No row change is needed.
- `scripts/bundle-assertion.test.ts` -- the entry module list must not gain `chart-offer.ts`. The chart chunk's closed module list must not either (it is the mount's or the scene's).
- `src/identity-audit.test.ts` -- contrast `ROLES`: add the offered link at `ink-prose` on the scene ground if `ROLES` lists the chart link's states.
- `_bmad-output/implementation-artifacts/deferred-work.md:942-944` -- close the `failIfMajorPerformanceCaveat` item with ruling Q2a.

## Tasks & Acceptance

**Execution:**
- `src/shell/chart-offer.ts` + `chart-offer.test.ts` -- RED first over every matrix row except Cue. Then the importer-set scan, the no-navigation scan, and the "detect/route/router/entry never import it" scan, each with mutation rows.
- `src/shell/chrome-model.ts`, `corner-chrome.tsx`, `corner-chrome.css`, `chrome-model.test.ts` -- `chartRouteClass` (the Cue row), the `useSyncExternalStore` read, `.chrome-route-offered`, and the declaration and markup audits; red then green.
- `src/render-scene/frame-sampler.tsx`, `scene.tsx`, `scene-model.test.ts` -- the sampler, its mount, and its audit.
- `src/shell/scene-host.tsx` (+ its existing audit, if any) -- reset on mount and on becoming visible.
- `src/identity-audit.test.ts` -- the contrast role, if applicable.
- READMEs (`src/shell/`, `src/render-scene/`) and `deferred-work.md` -- the docs and the Q2a closure.

**Acceptance Criteria:**
- Given the scene running below `FALLBACK_FLOOR_FPS` for warm-up plus the window, when the window fills, then `the chart` shows raised and underlined at rest, and the route and URL stay unchanged until the visitor clicks it.
- Given a scene at 25–29fps, when it runs indefinitely, then the link stays at rest and the scene keeps running.
- Given any framerate, when the scene renders, then the `<Canvas>` props and every scene component are those of a fast machine.
- Given the threshold changed to another value, when tests run, then only `chart-offer.ts` differs.
- Given `npm test`, `npx tsc --noEmit` and `npm run build`, when run, then all pass and the entry stays ≤ 4,000 bytes.

## Spec Change Log

## Review Triage Log

### 2026-10-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 6 (high 0, medium 2, low 4)
- defer: 1 (medium 1)
- reject: 14 (medium 2, low 12)
- addressed_findings:
  - `[medium]` `[patch]` One stall of over ~3 s (debugger, GC, a dialog, resume without `visibilitychange`, or the first R3F delta after a hidden tab) latched the offer for good, and one long frame after a reset spent the whole warm-up. A delta over `MAX_FRAME_SECONDS = 1` is now a gap that restarts sampling; `SUSTAINED_GAPS = 3` in a row latch (sub-1fps). Tests (a)–(d) added; the hitch wording corrected.
  - `[medium]` `[patch]` Once offered, the link at rest equalled its `:focus-visible` (WCAG 2.4.7) and hover showed nothing. `.chrome-route-offered:hover, :focus-visible` now raise to `ink-lift` at `stroke-body-focus`, audited with mutation rows and a contrast row.
  - `[low]` `[patch]` `auditSamplerMount` accepted `{false && <FrameSampler />}`; a conditional mount is now rejected, with `&&` and ternary mutation rows.
  - `[low]` `[patch]` `resetChartOfferForTest` kept listeners across tests; it now clears them, tested.
  - `[low]` `[patch]` The bad-delta test ran above the floor, proving nothing; it now runs below the floor with NaN, 0, -1, ±Infinity interleaved and asserts the same latch frame.
  - `[low]` `[patch]` README rows: `chart-offer.test.ts` added to `src/shell/README.md`; the sampler audits named in `src/render-scene/README.md`.

## Design Notes

**Rulings (Thomas, 2026-10-19).**
- Q1a: the cue on the existing link. It also answers 4.5's residual discoverability risk, but only when it matters.
- Q2a: no `failIfMajorPerformanceCaveat`. Capability routes, and performance offers.
- Q3: 2 s warm-up, a 5 s window, a mean-of-window test, latched.

**The window.** A queue of deltas plus a running sum, dropping from the front while `sum - front ≥ SUSTAIN_SECONDS`. That is O(1) amortised, with no allocation per frame beyond the push. At 60fps a single 0.5 s hitch gives about 271 frames in 5 s ≈ 54fps, so it never triggers. A frame over `MAX_FRAME_SECONDS = 1` is a gap, not a frame: it restarts sampling (warm-up again), so a stall, a dialog or a resumed tab never latches; `SUSTAINED_GAPS = 3` gaps in a row are a scene under 1fps and latch (review patch).

NFR-4's target laptop is not available here. The tests use synthetic frame times, and the field check is Thomas's.

## Verification

**Commands:**
- `npm test` -- expected: all pass
- `npx tsc --noEmit` -- expected: clean
- `npm run build` -- expected: gate and bundle assertion pass, entry ≤ 4,000 bytes

**Manual checks:**
- Chrome at 1400px, DevTools CPU throttling 20× (or a rendering-stress tab):
  - after about 7 s below 24fps, `the chart` reads raised and underlined;
  - the URL never changes by itself;
  - the scene looks the same.
- Unthrottled: the link stays at rest.
- NFR-4 target hardware: Thomas.

## Auto Run Result

Previous run (2026-10-19): blocked on intent gap Q1–Q3. Thomas ruled: Q1 (a), Q2 (a), Q3 defaults. Resumed.

Status: done

**Summary.** The running scene now measures its own framerate and offers the chart, never forces it.
- `src/shell/chart-offer.ts` holds the one constant `FALLBACK_FLOOR_FPS = 24` (unratified, PRD §13 Q16), a 2 s warm-up, a 5 s rolling mean, a 1 s frame cap (a longer frame is a gap that restarts sampling; three in a row latch), and a page-lifetime latch with one notify.
- One `useFrame` in `src/render-scene/frame-sampler.tsx`, mounted inside the `<Canvas>`, feeds it; `scene-host.tsx` resets it on mount and when the page becomes visible.
- Once offered, the existing `the chart` link reads `ink-prose` with a hairline underline at rest (ruling Q1a), raised to `ink-lift` at `stroke-body-focus` on hover and focus. No new element, copy, or route change; no `<Canvas>` setting changed; `detect()` unchanged (ruling Q2a).

**Files.**
- `src/shell/chart-offer.ts` + `.test.ts` (new): the monitor, the latch, the matrix, and the importer, routing, never-forced and reset audits.
- `src/render-scene/frame-sampler.tsx` (new), `scene.tsx`: the sampler and its mount.
- `src/shell/scene-host.tsx`: the resets.
- `src/shell/chrome-model.ts`, `corner-chrome.tsx`, `corner-chrome.css`: `chartRouteClass`, the offer read, `.chrome-route-offered` and its raised state.
- Tests: `chrome-model.test.ts`, `scene-model.test.ts`, `identity-audit.test.ts`.
- Docs: `src/shell/README.md`, `src/render-scene/README.md`, `deferred-work.md` (the `failIfMajorPerformanceCaveat` item closed by ruling Q2a); `sprint-status.yaml`.

**Review.** 6 patches applied (medium 2, low 4), 1 deferred (render-level wiring), 14 rejected (among them: no assistive-tech cue, by ruling Q1a's no-copy/no-aria; the exact-floor boundary; literal values in test names; a bundle check for `chart-offer.ts`, which the entry gate already covers). Follow-up review recommended: 3×2 + 4 = 10 ≥ 5.

**Verification.**
- `npm test`: 1,425 tests, 1,424 pass, 0 fail, 1 skipped (the pre-existing symlink case).
- `npx tsc --noEmit`: clean.
- `npm run build`: gate and bundle assertion pass; the entry is 3,028 of 4,000 bytes and reaches no banned module.
- Every I/O matrix row is covered by a test that ran and passed; each fix was shown load-bearing by temporarily removing it.

**Residual risks.**
- **Unseen in the browser:** the Chrome throttling check (the cue after ~7 s below the floor, the URL unchanged) was not run.
- **NFR-4:** the target laptop measurement is Thomas's.
- **The raised focus step** (`ink-prose` → `ink-lift` plus a 0.7 → 1.0px underline) is subtle; it needs Thomas's eye.
- **A scene between 1 and ~3 s per frame** is now measured only through runs of gaps; a scene alternating long and normal frames restarts sampling and is never offered.
