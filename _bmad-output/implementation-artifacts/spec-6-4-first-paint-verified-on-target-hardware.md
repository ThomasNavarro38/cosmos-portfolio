---
title: 'First Paint verified on target hardware'
type: 'feature'
created: '2026-10-23'
baseline_revision: 'f5d735c37744dfe988d25f23fdd6f08f69f961cf'
status: 'done'
review_loop_iteration: 1
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Story 6.4 asks for First Paint to be measured on NFR-4's target laptop and recorded against the carried 2.5 s figure. Nothing in the repo can produce that number: the browser's own FCP fires on the DOM chrome, not on the Schematic frame. No record exists, and nothing pins "nothing gates the first frame" or "the site collects nothing" across all shipped source.

**Approach:** The scene marks its first frame once per document as a `performance.mark`. The mark stays in the visitor's browser and nothing is sent. A new site-wide audit holds that nothing gates the frame and nothing is collected. A record, `first-paint-6-4.md`, gives the measurement protocol, states the carried figure and the "principle adopted, number not ratified" framing, and leaves the Result empty for Thomas. A `todo` test keeps the empty Result visible in every `npm test`, the way 6.3 kept its placeholder address visible.

## Boundaries & Constraints

**Always:**
- **The mark.** Its name is `schematic-first-frame`. It is set from the scene's first `useFrame` callback; R3F runs that callback before the first draw of the same animation frame. It is set at most once per document, so a scene remounted through history never marks again.
  - The latch is a pure, import-free `createFirstFrameMark(mark)` in `src/render-scene/first-frame.ts`. It receives the sink as an argument, with no DOM globals, and is executed by tests.
  - `first-frame-mark.tsx` binds `performance.mark` at module scope. When `performance` or `performance.mark` is missing, the binding is a no-op that never throws.
  - The component renders `null`, holds no state, effect or store read, and changes nothing drawn.
- **Mounting.** It is mounted once inside `scene.tsx`'s `<Canvas>`, unconditionally and with no props, next to `<FrameSampler />`. It is held by an audit plus mutation rows, mirroring `auditFrameSampler`/`auditSamplerMount`.
- **The site collects nothing.** Shipped source (non-test `src/**` and `index.html`) has none of the following outside comments:
  - `document.cookie`, `localStorage`, `sessionStorage`, `indexedDB`, `caches.`
  - `sendBeacon`, `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource`
  - an `http(s)://` URL
- **Nothing gates the first frame.** `index.html`'s `<body>` holds exactly `#root`, the `<noscript>` and the entry `<script>`. No string literal or markup text in shipped source names a gate: consent, cookie(s), splash, loading/loader, spinner, progress bar, click to enter, enter the site, accept. Comments are stripped before the scan.
- **Nothing streams in v1.** Every Body is in the first frame at its final luminance, so the fade-up rule (UX-DR37) has nothing to fade. The record and `src/render-scene/README.md` say so and cite the existing `scene.tsx` residual audits (no state, no effect).
- Each new audit fails on its own mutation with its own message.

**Block If:**
- Adding the mark component changes the entry chunk, or the bundle assertions cannot hold with the mark in `render-scene`.

**Never:**
- Inventing a measured value, a connection speed or a viewer result.
- Sending the mark anywhere, or logging it to the console.
- A probe on the First Paint path (`entry.ts`, `detect.ts`).
- A `<Canvas>` performance prop.
- Editing planning artifacts (that would stale `epic-6-context.md`).
- Adding to `identity-audit.test.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First frame | first call of the latch | `mark('schematic-first-frame')` once | — |
| Later frames | 2nd..nth call | no further mark | — |
| Remount | a second `FirstFrameMark` in the same document | no second mark (module-scope latch) | — |
| No Performance API | `performance` undefined or no `mark` | nothing marked | no throw |
| Sink throws | `mark` throws | swallowed, latch spent | no throw into R3F's loop |

</intent-contract>

## Code Map

- `src/render-scene/frame-sampler.tsx`: the pattern to mirror (one `useFrame`, `return null`).
- `src/render-scene/scene-model.test.ts:3233-3330`: `auditFrameSampler` / `auditSamplerMount` plus their mutation rows. Add `auditFirstFrameMark` / `auditFirstFrameMount` beside them.
  - `auditSamplerMount`'s `/\b(?:dpr|gl|frameloop|performance)\s*=/` must still pass. Never write `performance=` in scene.tsx.
  - `auditFrameSampler` bans `performance` only in frame-sampler.tsx; the new file has its own audit.
- `src/render-scene/scene.tsx:225-226`: mount `<FirstFrameMark />` after `<FrameSampler />`. Update the header paragraph that names the sampler, plus the import.
- `src/render-scene/README.md`: add rows for `first-frame.ts`, `first-frame-mark.tsx` and the test, plus a short "First Paint" note: what the mark is, how to read it, and that nothing streams.
- `scripts/source-scan.ts:89,104`: `stripCommentsAndStrings`, `stripComments`, `sourceFilesUnder`, `isTestFile`. Reuse them for the site-wide scans.
- `src/shell/entry.ts`, `src/shell/detect.test.ts:213-300`: the First Paint path's existing audit. Read-only; the mark lives outside it.
- `scripts/bundle-assertion.ts`: the entry/renderer assertions. They must still hold.
- `_bmad-output/implementation-artifacts/identity-audit-3-9.md`: the record-format precedent (automated rows name their test; manual rows give a protocol with an empty Result). Its protocol P3 is NFR-1a's fifteen-second viewer; reference it, don't duplicate it.
- `index.html`: the body to pin.

## Tasks & Acceptance

**Execution:**
- `src/render-scene/first-frame.test.ts`: write first. Cover:
  - every I/O row;
  - `FIRST_FRAME_MARK === 'schematic-first-frame'`;
  - `first-frame.ts` is import-free with no DOM globals or clock;
  - the binding is executed: install a fake `globalThis.performance`, import a fresh copy (query-suffixed URL), call the exported binding twice, and assert one recorded mark; with `performance` absent, nothing throws.
- `src/render-scene/first-frame.ts`: `FIRST_FRAME_MARK` and `createFirstFrameMark(mark): () => void`. The latch stays synchronous; the I/O matrix rows hold on it unchanged.
- `src/render-scene/first-frame-mark.tsx`: the module-scope bound latch `markFirstFrame` (exported for the test), plus an exported frame callback `firstFrameTick()` and `FirstFrameMark`, whose body is exactly `useFrame(firstFrameTick); return null;`.
  - **The mark lands after the first draw, not before it.** `firstFrameTick` calls `queueMicrotask(markFirstFrame)`. R3F runs every `useFrame` callback and then `gl.render` synchronously inside one `requestAnimationFrame` callback. The microtask therefore runs once that callback returns, after the first `gl.render` (including its synchronous shader compile and link) has been issued. Never mark synchronously inside the callback.
  - Later ticks may queue further microtasks; the latch makes them no-ops.
- `src/render-scene/first-frame.test.ts`: also execute `firstFrameTick` from the loaded `.tsx` under a fake `performance`.
  - After one call, nothing is marked synchronously; after `await Promise.resolve()`, exactly one mark.
  - After many calls over many awaited turns, still exactly one.
  - **Remount row, executed:** load a second instance of `firstFrameTick` from the same module URL (the same module instance, as a remount would), tick it, and assert no second mark. Replace pass 1's "two wrappers over one closure" remount test, which duplicated the later-frames row.
  - The component body `useFrame(firstFrameTick); return null;` stays the one unexecuted residual, pinned by the source audit (as `scene.tsx` is, `scene-model.test.ts:905`).
- `src/render-scene/scene.tsx`: the mount, the import and the header doc.
- `src/render-scene/scene-model.test.ts`: the two audits plus mutation rows. Cover:
  - unmounted, mounted twice, outside the Canvas;
  - conditional, **including a parenthesised mount** (`{flag && (<FirstFrameMark />)}`);
  - a second frame loop, state, an element drawn, a console call, a send;
  - **a synchronous mark in the tick** (`markFirstFrame()` called directly instead of queued).
- `src/first-paint.test.ts` (new): the collection scan, the index.html body pin and the gate-vocabulary scan, each with mutation rows over synthetic sources.
  - **The collection scan** also rejects:
    - a protocol-relative URL (`'//host…'`, `url(//…)`);
    - `navigator.serviceWorker`;
    - `cookieStore`;
    - `new Image(`.
  - **XML namespace URIs** (`http://www.w3.org/…`) are not reaches and pass.
  - **The gate-vocabulary scan** reads modules, CSS and markup, but **not data JSON**, so career prose is never mistaken for UI.
  - **The todo.** `test('First Paint is measured on the target hardware', { todo: 'Thomas, before 6.5' }, …)` holds only when all of the following are true:
    - the P1 runs table has three filled runs;
    - the measurement row's Result names a value in seconds;
    - that value is not the carried `2.5 s`.
  - **Reading the record.** A missing row or table fails with a message naming what is missing, never `undefined`. A `|` inside a cell is read as escaped `\|`.
- `_bmad-output/implementation-artifacts/first-paint-6-4.md` (new). It contains:
  - each epic AC 6.4 row: automated rows name their tests; manual rows are the measurement (P1) and NFR-1a (→ 3.9's P3);
  - protocol P1:
    - the target profile, NFR-4: a three-year-old laptop with integrated graphics at 1080p, never the dev machine or Apple silicon;
    - the build: `npm run build`, served either (a) from a static host on the internet, or (b) by `npm run preview -- --host` on the LAN **with DevTools throttling** set to the measured connection, recording which (an unthrottled LAN load understates network time);
    - a cold cache, with the connection's measured down, up and RTT recorded;
    - reading `performance.getEntriesByName('schematic-first-frame')[0].startTime` in the console, over three runs, recording the median;
  - P1 also states:
    - load `/` first, in a foreground tab, with DevTools opened only after the load (a run that lands on another route, or loses visibility, is discarded);
    - record `devicePixelRatio` with the OS display scaling, the viewport size, and the GPU backend from `chrome://gpu`;
    - a run with no `schematic-first-frame` entry means the scene never drew (the Fallback or a failed context), not a fast load;
    - a column for the step-5 count, before and after `/chart` → Back;
  - the carried 2.5 s figure, with the sentence: "The principle is adopted; the number is not ratified. A miss is a decision point, not an automatic failure";
  - **Known limits:**
    - The mark follows the issue of the first draw, shader compile included.
    - GPU completion and presentation may land later.
    - It is not a presentation timestamp.
  - **The enablers row** says precisely what holds:
    - the entry and the scene chunk reach no solver;
    - the only runtime solve is the Colophon's live re-solve, on a press (5.5);
    - the bundle assertion runs on `npm run build`;
  - an empty Result.
- `src/render-scene/README.md`: as in the Code Map.
- `_bmad-output/implementation-artifacts/deferred-work.md`: append a section recording the P1 measurement and NFR-1a viewer run as human runs owed before 6.5.

**Acceptance Criteria:**
- **The mark appears once.** Given the built site on a WebGL2 machine, when the scene draws its first frame, then `performance.getEntriesByName('schematic-first-frame')` holds exactly one entry. Navigating to `/chart` and Back adds none.
- **The build holds.** Given a clean tree, when `npm run build` runs, then:
  - the gate is green;
  - the entry is unchanged in bytes and holds no React or Three;
  - the mark modules sit in the `render-scene` chunk;
  - the bundle assertions pass.
- **The audits run.** Given the shipped source, when `npm test` runs, then every test passes and exactly one `todo` is reported pending: the First Paint measurement.
- **The record exists.** Given `first-paint-6-4.md`, when read, then it states the target profile, the protocol, the 2.5 s figure and the unratified framing, and every automated row names a test that exists.

## Spec Change Log

### 2026-10-23, loopback 1
- **Triggering findings (bad_spec):**
  - (1) The Code Map placed the mark inside the first `useFrame` callback, before the draw. On integrated graphics the first `gl.render` compiles every shader, so the mark understates First Paint on exactly the target hardware.
  - (2) No executed test ran the frame callback, and the "remount" test only re-ran one closure.
- **Amended (outside the intent contract):**
  - Tasks now require `firstFrameTick` to queue the mark as a microtask, plus an executed tick test and an executed remount row.
  - Tasks also gain the parenthesised-mount and synchronous-mark mutation rows.
  - Low patches folded into the tasks:
    - the wider collection scan and the namespace exemption;
    - the gate scan off data JSON;
    - a stricter `todo` (three runs, not the carried figure) and a named-failure record reader;
    - P1 controls (first route, foreground tab, DevTools after load, DPR/scaling, GPU backend, empty-entry meaning, a step-5 column);
    - an honest Known-limits line;
    - a precise enablers row.
  - Design Notes explain the microtask.
- **Known-bad states avoided:**
  - a First Paint figure that omits shader compile on the target laptop;
  - an instrument whose frame wiring no test executes;
  - a `todo` satisfied by quoting the budget.
- **KEEP:** start from the pass-1 implementation, which is reviewed sound in everything else: `git apply "C:/Users/Thomas/AppData/Local/Temp/claude/E--Development-cosmos-portfolio/7d082f81-746b-4ef8-9ec8-6ef7d12a623f/scratchpad/keep-6-4-pass1.patch"`. Then change only what this amendment requires. Specifically keep:
  - the latch and its I/O tests;
  - the harness-based binding tests (fresh module per case, a fake `performance`);
  - `auditFirstFrameMark` / `auditFirstFrameMount` and their mount after `<FrameSampler />`;
  - `src/first-paint.test.ts`'s three scans and the record cross-check;
  - `first-paint-6-4.md`'s rows and protocol;
  - the README section;
  - the `deferred-work.md` entries.

## Review Triage Log

### 2026-10-23 — Review pass
- intent_gap: 0
- bad_spec: 2: (high 1, medium 1, low 0)
- patch: 8: (high 0, medium 0, low 8)
- defer: 0
- reject: 16: (high 0, medium 3, low 13)
- addressed_findings:
  - `[high]` `[bad_spec]` The mark was set before the first draw, so it omitted shader compile on integrated graphics. The spec was amended to queue it as a microtask after the draw; loopback.
  - `[medium]` `[bad_spec]` The frame callback was never executed, and the remount test duplicated the later-frames row. The spec was amended to require an executed tick and remount; loopback.
  - The eight low patches are folded into the amended tasks:
    - the parenthesised conditional mount;
    - the fragile record reader;
    - the loose `todo`;
    - the collection-scan gaps;
    - the namespace false positive;
    - the gate scan over data JSON;
    - P1 controls;
    - the row-6 and Known-limits wording.
- **Rejected as medium:**
  - Scanning `dist/`: three's loaders contain `fetch` by design, and nothing in the shipped src calls them.
  - Async assets or Suspense breaking "nothing streams": the scene loads no texture, font or model asynchronously, since `DataTexture` is synchronous.
  - Swapping `globalThis.performance` around harness loads: the cases pass deterministically, and each restores the global.

### 2026-10-23 — Review pass (loop 1)
- intent_gap: 0
- bad_spec: 0
- patch: 9: (high 0, medium 1, low 8)
- defer: 0
- reject: 34: (high 0, medium 6, low 28)
- addressed_findings:
  - `[medium]` `[patch]` P1 let a LAN-served build be timed while recording the broadband connection, which understates network time. P1 step 3 now offers (a) an internet static host or (b) a LAN preview with DevTools throttling set to the measured connection, recorded either way; the spec task line matches.
  - `[low]` `[patch]` `secondsIn` read `T14s` as 14 s. The lookbehind now excludes a preceding letter, with a row for it.
  - `[low]` `[patch]` `runFilled` accepted any non-empty cell. It now requires a numeric `startTime` and the step-6 count `1 / 1`, with rows for each.
  - `[low]` `[patch]` Row 3's framing sentence was held by no test. A new test asserts the carried figure and the sentence verbatim; row 3 names it.
  - `[low]` `[patch]` The w3.org exemption covered the whole host. It is now the namespace paths only (`2000/svg`, `1999/xlink`, `1999/xhtml`, `XML/1998/namespace`, `2000/xmlns/`), with rows for another w3.org path and a lookalike path.
  - `[low]` `[patch]` The mount audit missed an array or `.map` mount. `[`, `=>` and `,` now count as preceding tokens, with two mutation rows.
  - `[low]` `[patch]` Row 4a overstated the remount test. It now says the test executes the shared module instance; the component body is the one unexecuted residual, and P1 step 6 counts in a real browser.
  - `[low]` `[patch]` Known limits gained two lines: "shader compile included" depends on synchronous compilation (no `compileAsync`), and the Fallback carries no mark.
  - `[low]` `[patch]` P1 now saves the navigation and scene-chunk resource timings per run, so a miss can be diagnosed.
- **Rejected as medium:**
  - Scanning `public/` or `dist/`: `public/` holds the preview image, and the bundle holds three's loaders by design.
  - Absolute `https://` links counted as collection: none ship, and the strictness is deliberate.
  - Pinning `<head>`: it holds only meta tags and the title, and no script or style.
  - "Direct child" nesting such as `<Suspense>`: the scene holds no Suspense, and the audit names the common shapes.
  - A headless browser smoke test: the repo has no browser runner. This run's browser check observed one mark before and after `/chart` → Back.
  - Row 6's no-force-solve wording: the Colophon's live re-solve on a press is ruled (5.5), and the row says so.

## Design Notes

**Why a mark rather than FCP or LCP.** The DOM chrome and the index paint before the canvas draws, so the browser's FCP would understate First Paint. The mark is set where First Paint is defined: the Schematic frame's first draw. A mark is local timeline data. Nothing reads it but the person at DevTools, so "the site collects nothing" still holds.

**Why a microtask.** On NFR-4's integrated graphics, the first `gl.render` compiles and links every program, which can take hundreds of milliseconds. A mark set inside the `useFrame` callback lands before that work. On exactly the hardware the story measures, it would understate First Paint by the compile time. Queuing the mark as a microtask from the same callback moves it to just after the first draw is issued. It needs no priority `useFrame` (which would take over R3F's render), no extra `requestAnimationFrame`, and no timer.

**Why the module-scope latch.** First Paint happens once per document. Router remounts (scene → chart → Back) must not overwrite the measurement with a warm-cache frame.

## Verification

**Commands:**
- `npm test`: expected 0 fail, the environmental skip, and one `todo` (the measurement).
- `npm run typecheck`: expected clean.
- `npm run build`: expected the gate green, the entry ≤ 4,000 bytes and unchanged, and no drift warning.

**Manual checks:**
- `npm run preview`, then in Chrome on `/`:
  - `performance.getEntriesByName('schematic-first-frame').length === 1`;
  - after `/chart` and Back, it is still 1.

## Auto Run Result

**Summary.** The scene now marks its own First Paint. On its first frame, `<FirstFrameMark>` queues `performance.mark('schematic-first-frame')` as a microtask, so the mark lands just after the first `gl.render` is issued, shader compile included. It is set once per document, so a remount through `/chart` → Back never marks again. The mark stays on the visitor's own performance timeline; nothing is sent or logged.
- **New site-wide audits** hold that nothing gates the first frame and the site collects nothing.
- **A new record**, `first-paint-6-4.md`, gives the measurement protocol P1, the carried 2.5 s figure and the "principle adopted, number not ratified" framing.
- **The hardware measurement (P1) and the NFR-1a viewer run are not done.** They need Thomas on the target laptop. A `todo` test keeps the measurement visible in every `npm test`, and `deferred-work.md` records both as owed before 6.5.

**Files changed**
- New:
  - `src/render-scene/first-frame.ts`: `FIRST_FRAME_MARK` and the pure once-only latch `createFirstFrameMark`.
  - `src/render-scene/first-frame-mark.tsx`: the module-scope `performance.mark` binding (a no-op without the API), `firstFrameTick` (`queueMicrotask(markFirstFrame)`) and `FirstFrameMark` (`useFrame(firstFrameTick); return null;`).
  - `src/render-scene/first-frame.test.ts`: the latch's I/O rows, the binding and the tick executed through the render harness under a fake `performance`, the shared-instance remount row, and an import-free audit.
  - `src/first-paint.test.ts`: the collection scan, the `index.html` body pin, the gate-vocabulary scan (each with mutation rows), the record reader and its cross-checks, the framing-sentence test, and the `todo`.
  - `_bmad-output/implementation-artifacts/first-paint-6-4.md`: the AC rows, protocol P1 and its runs table, the budget's framing and the known limits.
- Changed:
  - `src/render-scene/scene.tsx`: mounts `<FirstFrameMark />` after `<FrameSampler />`; the header doc covers the mark and that nothing streams.
  - `src/render-scene/scene-model.test.ts`: `auditFirstFrameMark` and `auditFirstFrameMount`, with mutation rows (synchronous mark, rAF, conditional, parenthesised, array or map mount, and others).
  - `src/render-scene/README.md`: file rows and a First Paint section.
  - `_bmad-output/implementation-artifacts/deferred-work.md`: the two human runs owed before 6.5.
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`: 6-4 is done.

**Review**
- **Pass 1:** two bad_spec findings looped back once.
  - High: the mark was set before the first draw, missing shader compile on integrated graphics.
  - Medium: no executed tick test.
  - Eight low patches were folded into the amendment, and 16 findings were rejected.
- **Pass 2 (loop 1):** nine patches applied (medium 1, low 8), none deferred, 34 rejected.

**Follow-up review recommended: true.** Pass 2 patched medium 1 and low 8, a score of 3×1 + 8 = 11, which is ≥ 5.

**Verification**
- `npm test`: 1697 tests; 1695 pass, 0 fail, 1 environmental skip, 1 `todo` (pending: "First Paint is measured on the target hardware").
- `npm run typecheck`: clean.
- `npm run build`: gate green, the entry unchanged at 3,033 of 4,000 bytes, and no drift warning. The mark sits in the scene chunk only.
- Browser check by the orchestrator, `vite preview` of the production build in Chrome:
  - `/` drew the scene, with exactly one `schematic-first-frame` entry at about 510 ms. That is the dev machine, so it is not a First Paint figure.
  - After clicking "the chart" and going Back in the same document, there was still exactly one entry.

**Residual risks**
- **No figure exists yet.** P1 on the target laptop and the NFR-1a viewer run are owed before 6.5; only the `todo` guards this, and it never fails `npm test`.
- **The component body is unexecuted.** `useFrame(firstFrameTick)` and its mount are held by source audits; no R3F renderer runs under `node --test`.
- **The mark is not presentation time.** It follows the issue of the first draw; GPU completion and display may land later. Shader compile is included only while three.js compiles synchronously.
- **The audits are source-level.** They read shipped source, not `dist/` or the bundled dependencies, and the gate vocabulary is a finite word list.
- **Nothing streams in v1,** so the fade-up rule holds vacuously. Any future streaming must add an executed fade test.
