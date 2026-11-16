---
title: 'Story 8.1: The worst window, on the visitor''s own timeline'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: '5fadc30f0576e7c3fb7c0ff03ee23bb69152d32f'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** NFR-2 says every five-second window must hold 30fps across a forward-and-back scroll of the Rails. The shipped monitor in `src/shell/chart-offer.ts` only latches the 24fps offer and then stops sampling, so on the day a target-profile machine turns up there is nothing to read the answer from.

**Approach:** Extend the one monitor so it tracks its worst full window, plus a page-life gap count, for the life of the page, past the latch. Its window becomes an allocation-free ring buffer, and the latch, floor and offer stay byte-for-byte in behaviour. A new sink, bound outside the monitor in `first-frame-mark.tsx`'s pattern, writes the worst window to the visitor's own performance timeline as one mark named `scene-worst-window`. Nothing is sent anywhere.

## Boundaries & Constraints

**Always:**
- `chart-offer.ts` stays pure: no import, and no `window`, `document`, `navigator`, `performance` or `requestAnimationFrame`. The sink arrives through a port.
- Every existing row of `chart-offer.test.ts` keeps its text and passes. The only edit to an existing part of that file is the new importer's row in `IMPORTERS`, plus the one title and failure message that list the importers in words.
- "Window" means the existing rolling window: the most recent ≥ `SUSTAIN_SECONDS` of frame time, evaluated at every frame once full. Its rate is `frames / seconds`. Worst means the lowest rate, and only a strictly lower rate replaces it.
- A window never spans a reset, a gap or a tab return. A tab return is `scene-host.tsx`'s reset on becoming visible, already shipped.
- A partial window, whose sum is below `SUSTAIN_SECONDS`, never counts. Neither do frames spent in the warm-up.
- The gap count is page-life. `resetFrameSampling` never clears it. Only `resetChartOfferForTest` does.
- The sampler path allocates nothing per frame: no array or object literal, `new`, `push`, `slice`, spread, closure or string building on it.
- The sink and the monitor's call into it swallow any throw, so a measurement never breaks R3F's frame.

**Block If:**
- The scene chunk would exceed its 960,000-byte budget. A budget change needs a ruling.
- An existing matrix row of `chart-offer.test.ts` would have to change to pass.

**Never:**
- No `fetch`, `sendBeacon`, `XMLHttpRequest`, `WebSocket`, `EventSource`, image or link beacon, storage write, or console output from the sink.
- No new dependency.
- No adaptive quality and no change to the `<Canvas>` props.
- No change to `realism/`, to `realism-mount.tsx`, or to the existing mounts' order. `<RealismMount>` stays immediately after `<FirstFrameMark />`.
- No surface shows the measurement.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Healthy run | 60fps for 30 s | worst ≈ 60fps, written once on the first full window, gaps 0 | — |
| Fall | 60fps 30 s, then 20fps 10 s | worst falls to ≈ 20fps; each strict fall calls the sink; the offer latches as shipped | — |
| Past the latch | 20fps 8 s (latched), then 10fps 10 s | worst keeps falling to ≈ 10fps after the latch | — |
| Partial only | 10fps 4 s, reset, 10fps 4 s | no worst (no full window) | — |
| Gap splits | 10fps 4 s, one 1.5 s delta, 10fps 4 s | no worst; gaps 1; the sink is called with frames 0 | — |
| Warm-up excluded | 5fps for 1.8 s, then 60fps 30 s | worst ≈ 60fps | — |
| Bad deltas | NaN, 0, −1, ±Infinity | ignored: no frame, no gap, no write | — |
| Ring overflow | 2000fps for 10 s (more than `WINDOW_CAPACITY` frames inside 5 s) | the oldest frame drops; the window never fills, so there is no worst and no latch | — |
| Sink throws | sink throws on every call | sampling, latch and worst unaffected | swallowed |
| Late bind | worst exists, then a sink binds | the sink is called once at bind with the current values | — |
| No `performance` | binding built where `performance.mark` or `clearMarks` is missing | no-op | nothing throws |

</intent-contract>

## Code Map

- `src/shell/chart-offer.ts` -- the monitor. `sampleFrame` (l.111) returns early when `offered` (l.112); that must become "skip only the latch test". The `deltas[]` queue, `push` and `slice` compaction (l.126-136) become a `Float64Array` ring with the same arithmetic order: push, add to sum, drop the front while `sum - front >= SUSTAIN_SECONDS`. That keeps the shipped numerics identical. `resetFrameSampling` (l.95) clears the window, not the gap count. `resetChartOfferForTest` (l.152) clears everything, including the bound sink.
- `src/shell/chart-offer.test.ts` -- `IMPORTERS` (l.264) is the one table to extend. The purity row (l.230) counts `FALLBACK_FLOOR_FPS` occurrences (exactly 2) and bans the word `performance` in code, so the new names avoid both. The importer, routing and never-forced audits walk `IMPORTERS`, so the new file joins them automatically.
- `src/render-scene/first-frame.ts` + `first-frame-mark.tsx` -- the pattern to copy. An import-free pure builder takes the sink as an argument and swallows throws. A `.tsx` binding builds it once at module scope over `performance`, with a no-op where `performance` is missing.
- `src/render-scene/first-frame.test.ts` -- the test shape for the pure builder.
- `src/render-scene/scene.tsx` l.235-240 -- Canvas children. The new mount goes between `<FrameSampler />` and `<FirstFrameMark />`. The first-frame audit (`scene-model.test.ts:3622`) only needs the mark after the sampler, and `realism-status.test.ts:1021` needs `<RealismMount>` directly after `<FirstFrameMark />`.
- `src/render-scene/scene-model.test.ts` l.3540-3660 -- `auditFirstFrameMark` and `auditFirstFrameMount`, the templates for the new binding and mount audits.
- `src/shell/scene-host.tsx` -- owns the mount and visibility resets. Read-only here.
- `scripts/bundle-assertion.ts` -- the scene budget. Headroom was about 7,367 bytes at 7.10.

## Tasks & Acceptance

**Execution:**
- `src/shell/chart-offer.test.ts` -- RED first: add new rows only, each failing before the monitor changes. They cover the I/O matrix through a spy sink bound with `bindWorstWindowSink`, plus three audits:
  - a per-frame allocation audit of `sampleFrame`'s body, driven over mutations (`push`, `[]`, `{}`, `new`, spread, an arrow, `slice`);
  - a purity audit showing the new port is the only way out;
  - an audit showing the module never clears the gap count in `resetFrameSampling`.

  Add `'src/render-scene/worst-window-mark.tsx': ['bindWorstWindowSink']` to `IMPORTERS`, with the title and message words updated to match.
- `src/shell/chart-offer.ts` -- export `WINDOW_CAPACITY` (8192), the type `WorstWindowSink = (frames: number, seconds: number, gaps: number) => void`, and `bindWorstWindowSink(sink): () => void`.
  - The port holds one sink. The unbind closure clears it only if that bind is still current. On bind, the sink is called once if a worst or a gap exists.
  - The ring buffer drops its oldest frame when full.
  - The sink is called on every strict fall of the worst and on every gap. On a gap, `frames` and `seconds` are the current worst, or 0 when there is none.
  - The header's "What it measures" and "Pure" paragraphs are updated.
- `src/render-scene/worst-window.ts` (new) -- import-free. Exports `WORST_WINDOW_MARK = 'scene-worst-window'` and `createWorstWindowMark(mark, clear): WorstWindowSink`. Each call runs `clear(name)` and then `mark(name, { detail: { fps, frames, seconds, gaps } })`, where `fps = frames / seconds`, or `null` when `frames` is 0. Throws are swallowed. It exists to keep the browser's timeline at one entry holding the current worst.
- `src/render-scene/worst-window.test.ts` (new) -- executes every rule of the builder with a fake `mark` and `clear`:
  - the name, the detail, null with no window, one clear before each mark;
  - throws swallowed;
  - a source scan showing no network or storage API in either new file.
- `src/render-scene/worst-window-mark.tsx` (new) -- binds `performance.mark` and `performance.clearMarks` at module scope, or a no-op if either is missing. It exports `writeWorstWindow = createWorstWindowMark(...)` and `WorstWindowMark()`, whose whole body is `useEffect(() => bindWorstWindowSink(writeWorstWindow), []); return null;`.
- `src/render-scene/scene.tsx` -- import and mount `<WorstWindowMark />` once, unconditionally, between `<FrameSampler />` and `<FirstFrameMark />`, and add one sentence to the header.
- `src/render-scene/scene-model.test.ts` -- add `auditWorstWindowMark` (imports exactly `useEffect`, `bindWorstWindowSink` and `createWorstWindowMark`, the exact body, a module-scope sink, no network) and `auditWorstWindowMount` (once, unconditional, no props, after the sampler and before the mark). Each is driven over mutations.

**Acceptance Criteria:**
- Given the shipped matrix, when `npm test` runs, then every pre-existing row of `chart-offer.test.ts` passes with its text unchanged. `git diff` of that file shows only additions, plus the `IMPORTERS` row and its title and message words.
- Given a production build served locally, when the scene runs in Chrome and the Rails are scrolled forward and back, then `performance.getEntriesByName('scene-worst-window')` holds exactly one mark whose `detail` has a finite `fps`, plus `frames`, `seconds` and `gaps`. The network log shows no request beyond those the page made before this story.
- Given `/chart/` and `/colophon/`, when they load, then no `scene-worst-window` entry exists and their requests are unchanged.
- Given `npm run build`, when the bundle assertion runs, then the scene chunk stays within 960,000 bytes and the entry chunk within its budget, with the measured values recorded.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12 (high 0, medium 3, low 9)
- defer: 0
- reject: 10 (high 0, medium 0, low 10)
- addressed_findings:
  - `[medium]` `[patch]` Two overlapping binds: a later bind unmounting first cleared the sink while an earlier bind was still mounted. The port now keeps its live binds in order and restores the previous sink, with three new rows.
  - `[medium]` `[patch]` The docs implied a write is never per frame. They now say the sink writes on every strict fall and every gap, which can be consecutive frames during a slowdown, and that only the sampler allocates nothing.
  - `[medium]` `[patch]` No run of the browser AC was recorded. I reran it in Chrome against the patched build and recorded it under Auto Run Result.
  - `[low]` `[patch]` The allocation audit's title claimed "the sampler path". It now names `sampleFrame` plus its direct helpers and excludes the sink's write.
  - `[low]` `[patch]` The mark's `startTime` meaning is now documented in `worst-window.ts`.
  - `[low]` `[patch]` The no-performance test could pass vacuously. It now asserts the delete, and a new case covers a `clearMarks` that is not a function.
  - `[low]` `[patch]` A top-level `await renderer()` gated every test in `worst-window.test.ts`. The harness now starts lazily.
  - `[low]` `[patch]` The `scene.tsx` header prose gave a stale mount order. It now lists sampler, worst-window mark, First Paint mark, realism mount.
  - `[low]` `[patch]` The in-place edit to the 7.10 record now carries an 8.1 amendment marker.
  - `[low]` `[patch]` The `deferred-work.md` entry now reads as a decision already made, open for Thomas to overturn.
  - `[low]` `[patch]` The new bundle figures are recorded, under Auto Run Result.
  - `[low]` `[patch]` The real-page network log has been read, under Auto Run Result.

## Design Notes

**Why a mark that is cleared and rewritten.** A target run must read the answer in one place. With `clearMarks` and then `mark`, the timeline always holds exactly one `scene-worst-window` entry carrying the current worst window and the gap count together. Writes happen only when the worst falls or a gap occurs, not every frame. A falling framerate can write for several seconds, and that cost is a microsecond-scale call during a slide the window would record anyway.

**Why a ring of 8192.** Five seconds at 1638fps. No display refreshes that fast. Above that rate the window cannot fill, so there is no worst and no latch, which is correct: such a scene is nowhere near either threshold.

**Realism's frame path (Epic 7 retro item 55, R4): not held to this rule in 8.1.** The AC's "allocates nothing per frame" names the sampler, the work this story adds. Realism's per-frame draw literal, subject thunk and `mapFromWorld` array are settled 7.x code, verified in the browser and pinned by realism audits. Hoisting them would reopen that layer outside this story's ACs. Its GC cost is exactly what a target run's worst window would expose, so the instrument this story ships is how to judge whether it matters. Recorded here, and appended to `deferred-work.md` as the open question for Thomas.

## Verification

**Commands:**
- `npm test` -- expected: all pass, with the one environmental skip named.
- `npm run typecheck` -- expected: clean.
- `npm run build` -- expected: gate clean, and the bundle assertion passes with the scene and realism figures read.

**Manual checks:**
- In Chrome, against `npm run preview`: on `/`, after scrolling the Rails, `performance.getEntriesByName('scene-worst-window')` returns one entry with sane detail. On `/chart/` it returns none. The network log adds no request.

## Auto Run Result

**Summary.** `chart-offer.ts` is still the one pure, import-free instrument. Its window is now a `Float64Array` ring (`WINDOW_CAPACITY` 8192) that adds and drops frames in the shipped arithmetic order. Once the chart is offered, only the latch test is skipped: the worst full window and a page-life gap count are tracked for the life of the page. They leave the monitor only through `bindWorstWindowSink`, a port that holds its live binds in order. The sink is called on every strict fall, on every gap, and once at bind. `worst-window.ts` (pure) and `worst-window-mark.tsx` (module-scope `performance` binding, mounted between `<FrameSampler />` and `<FirstFrameMark />`) keep exactly one `scene-worst-window` mark, with `detail {fps, frames, seconds, gaps}`.

**Files changed**
- `src/shell/chart-offer.ts`: the ring, worst-window tracking past the latch, the page-life gap count and the ordered sink port.
- `src/shell/chart-offer.test.ts`: added rows only, covering the whole I/O matrix, the bind order, a randomized latch-equivalence check against the shipped queue, and the allocation, port and gap-count audits. The other change is the `IMPORTERS` row and the one title and message listing the importers.
- `src/render-scene/worst-window.ts` (new): the pure builder, clearing and then marking `scene-worst-window`.
- `src/render-scene/worst-window-mark.tsx` (new): the module-scope `performance` binding and the `<WorstWindowMark>` component.
- `src/render-scene/worst-window.test.ts` (new): runs the builder and the binding through the render harness with fake timelines, and source-scans both files for no send, storage or log.
- `src/render-scene/scene.tsx`: mounts `<WorstWindowMark />` and updates the header's mount order.
- `src/render-scene/scene-model.test.ts`: `auditWorstWindowMark` and `auditWorstWindowMount`, each with mutation rows.
- `_bmad-output/implementation-artifacts/realism-done-7-10.md`: one quoted test title updated, with an 8.1 amendment marker.
- `_bmad-output/implementation-artifacts/deferred-work.md`: the decision on Epic 7 retro item 55, that realism's frame path is not held to the no-allocation rule in 8.1 and Thomas may overturn it.
- `_bmad-output/implementation-artifacts/epic-8-context.md` (new): the compiled epic context.

**Review.** 12 patches applied (3 medium, 9 low), 0 deferred, 10 rejected. The rejections:
- mark-after-clear failure, judged implausible;
- engines without mark detail, which are outside support;
- page-life worst scope and gap-count interpretation, which belong to 8.3's protocol and are noted below;
- the ring compared near capacity, already covered by the overflow row;
- the brittle `performance` count;
- Fast Refresh, the same as `first-frame-mark.tsx`;
- floating-point drift, negligible;
- the untracked spec;
- mojibake, which was an artifact of how the review diff was built, not present in the files.

**Follow-up review recommendation:** true. Patched: high 0, medium 3, low 9. Score 3×3 + 9 = 18, which is 5 or more.

**Verification**
- `npm test`: 2151 tests, 2150 pass, 0 fail, 1 skipped (environmental: "the walk keeps a symlinked file…", since symlinks can't be created on this machine).
- `npm run typecheck`: clean.
- `npm run build`: gate clean. Entry 3,278 of 4,000 bytes; realism 8,560 of 24,000; scene 953,039 of 960,000 (+406 since 7.10, headroom 6,961).
- In Chrome on the dev machine (not the target profile), against `vite preview` of the patched build:
  - On `/`, 8 s at rest, then 60 wheel steps forward and 60 back. `getEntriesByName('scene-worst-window')` held exactly 1 `mark`, with detail `{fps: 164.98, frames: 825, seconds: 5.0007, gaps: 0}`, and `schematic-first-frame` was still 1.
  - The network log held only same-origin requests: the document, chunks, the `realism` chunk, `io`/`mars`/`moon.webp` and the favicon. The one off-site origin was the Kaspersky origin injected in transit, already ruled out of scope at 7.10.
  - Fresh `/chart/` and `/colophon/` held 0 `scene-worst-window` entries and requested no map and no realism chunk.
  - Whether the synthetic wheel events moved the Rail was not confirmed. The screenshot after the return showed the opening frame, consistent with forward then back but not proof of travel.

**Residual risks**
- The worst window covers the page's whole life after the warm-up, not only the Rail scroll. A pass read from it is conservative, but a failure may come from outside the scroll. A non-zero gap count needs reading rules. 8.3's protocol must state both: a fresh load, no tab switch, and gaps read beside the worst.
- During a slowdown the sink writes, and allocates, on nearly every frame. That is accepted by design and documented.
- The `<WorstWindowMark>` effect body is executed only in the browser check, not under `node --test`.
- The scene chunk has 6,961 bytes of headroom left.
