# First Paint on target hardware — Story 6.4

Record date: 2026-10-23. Baseline: `f5d735c`. Spec: `spec-6-4-first-paint-verified-on-target-hardware.md`.

Automated rows name the test that holds them. Each audit runs over the shipped source and over mutations that must fail with that audit's own message. Manual rows give a protocol and leave the **Result** column empty for Thomas. `src/first-paint.test.ts` carries `First Paint is measured on the target hardware` as a `todo`, reported pending on every `npm test` until the P1 runs table holds three filled runs and the measurement row's Result names a measured value in seconds that is not the carried `2.5 s`.

Commands: `npm test`, `npm run typecheck`, `npm run build`.

## The budget

The carried figure is **2.5 s** to First Paint (NFR-1; PRD §13 Q1, E-T5).

**The principle is adopted; the number is not ratified. A miss is a decision point, not an automatic failure.** A measured value above 2.5 s is recorded as measured and brought to Thomas as a decision. It does not fail the story or the build.

First Paint is the Schematic frame's first draw. It is not the browser's First Contentful Paint, which fires on the DOM chrome before the canvas draws and would understate it. So the scene marks the moment itself. On its first frame, `src/render-scene/first-frame-mark.tsx` queues `performance.mark('schematic-first-frame')` as a microtask from R3F's frame callback, once per document. R3F runs the frame callbacks and then `gl.render` synchronously in one animation-frame callback, so the microtask runs just after the first draw has been issued, its shader compile and link included. A scene remounted through history (scene → `/chart` → Back) never marks again. The mark stays on the visitor's own performance timeline. Nothing sends it or logs it, and nothing reads it but the person at DevTools, so the site still collects nothing.

## Epic ACs

| # | Epic AC (Story 6.4) | Kind | Held by / protocol | Result |
| --- | --- | --- | --- | --- |
| 1a | Nothing gates the first frame: no consent banner, cookie notice, splash, loading screen, progress bar or click-to-enter (NFR-1, UX-DR37) | Automated | `src/first-paint.test.ts` "nothing gates the first frame: index.html’s body is #root, the noscript and the entry script, only"; `src/first-paint.test.ts` "nothing gates the first frame: no shipped string or markup names a consent, cookie, splash, loader, spinner, progress bar or entrance"; mutations: `src/first-paint.test.ts` "the body pin rejects anything painted beside the root", `src/first-paint.test.ts` "the gate vocabulary scan rejects each word in a string, in JSX text and in markup, and ignores it in a comment" | |
| 1b | There is nothing to accept, because the site collects nothing | Automated | `src/first-paint.test.ts` "the site collects nothing: no storage, no request and no off-site URL in shipped source"; mutations: `src/first-paint.test.ts` "the collection scan rejects each reach, and ignores one written in a comment" | |
| 2 | First Paint is measured on the target hardware profile, never on the dev machine and never on current Apple silicon, and the measured value is recorded against the carried 2.5 s figure (NFR-1, NFR-4) | **Manual** | See protocol P1 below | |
| 3 | The record states that the principle is adopted and the number is not ratified, so a miss is a decision point | Automated (record) | This document, "The budget" above. `src/first-paint.test.ts` "the record has a measurement row read by protocol P1 and a P1 runs table, and the reader reads them" holds the row and the table the result goes into; `src/first-paint.test.ts` "the record reader names what is missing, and reads an escaped pipe inside a cell"; the framing sentence itself, verbatim: `src/first-paint.test.ts` "the record states the budget’s framing: the principle adopted, the number not ratified, a miss a decision point" | |
| 4a | The mark is set on the first frame, once per document, and never on a later frame or a remount | Automated | `src/render-scene/first-frame.test.ts` "first frame: the first call marks schematic-first-frame, once"; `src/render-scene/first-frame.test.ts` "later frames: the 2nd..nth call marks nothing more"; `src/render-scene/first-frame.test.ts` "sink throws: swallowed, nothing thrown into the frame loop, and the latch spent"; `src/render-scene/first-frame.test.ts` "the binding: performance.mark, bound to performance, called once however often the latch runs"; `src/render-scene/first-frame.test.ts` "the binding with no Performance API: no performance, a null one, or no mark — nothing marked, nothing thrown"; `src/render-scene/first-frame.test.ts` "the tick: nothing is marked synchronously; after the microtask turn, exactly one mark"; `src/render-scene/first-frame.test.ts` "the tick: many frames over many turns still mark exactly once"; `src/render-scene/first-frame.test.ts` "remount: a second load of the same module (as a remount gets) ticks over the spent latch and marks nothing more". That last test executes the shared module instance a remount reuses, not a component remount: no R3F renderer runs under `node --test`, so the component body `useFrame(firstFrameTick)` stays the one unexecuted residual (row 4b's source audit), and P1 step 6 counts the marks across `/chart` → Back in a real browser | |
| 4b | The mark changes nothing drawn, holds no state, logs and sends nothing, is queued after the draw rather than set inside the frame callback, and is mounted once inside the Canvas with no performance prop | Automated | `src/render-scene/scene-model.test.ts` "the First Paint mark is one useFrame queuing the module-scope latch after the draw, and renders null"; `src/render-scene/scene-model.test.ts` "the First Paint mark audit rejects the real binding with any one guarantee broken"; `src/render-scene/scene-model.test.ts` "the scene mounts the First Paint mark once inside the Canvas, after the sampler"; `src/render-scene/scene-model.test.ts` "the First Paint mount audit rejects the real scene with any one guarantee removed"; `src/render-scene/scene-model.test.ts` "the scene mounts the sampler once inside the Canvas, and sets no performance prop" | |
| 5 | Everything behind the first frame may stream; a streamed Body fades its stroke up the ladder, with no skeleton or placeholder (NFR-1, UX-DR37) | Automated (vacuous in v1) | **Nothing streams in v1.** The scene draws every Body from the committed artifact in its first frame, at its final luminance, so the fade-up rule has nothing to fade. `scene.tsx` holds no state, no effect and no frame callback that could add a Body later: `src/render-scene/scene-model.test.ts` "the renderer holds no logic the model could own"; mutations: `src/render-scene/scene-model.test.ts` "the thinness audit rejects each form it names, including the ones that read as harmless". When streaming is introduced, this row needs a real test | |
| 6 | The architectural enablers hold at launch: the runtime performs no force solve, the entry reaches neither Three, nor the solver, nor `src/data/`, and the CI assertions from 1.8 and 4.1 pass against the production build (AD-1, AD-6, AD-7) | Automated | What holds, precisely: **the entry and the scene chunk reach no solver** — `src/derive/boundaries.test.ts` "the committed src/ tree passes", `src/derive/boundaries.test.ts` "src/render-scene/ may not import the solver’s dependency", and `scripts/bundle-assertion.test.ts` "the shipped app builds under the assertion, measured within its budget" (the solver is its own lazy chunk, reached only by the colophon chunk's dynamic import, and the entry graph holds no React, no Three and no `src/data/`); **the only runtime solve is the Colophon's live re-solve, on a press (5.5)**, never on load and never on the scene — `src/colophon/colophon.test.ts` "the default Colophon’s press is the tracker, built with the solver’s dynamic import, handed the career on the page"; **the bundle assertion runs on `npm run build`** — `scripts/bundle-assertion.test.ts` "`npm run build` ends in `vite build`, so CI's Build step runs the assertion"; and no probe sits on the First Paint path — `src/shell/detect.test.ts` "detect.ts reaches nothing heavy and reads no viewport, motion or performance" | |
| 7 | NFR-1a: an unprompted viewer of the first fifteen seconds registers a real work history, organised rather than listed, and deliberately designed | **Manual** | Protocol P3 of `identity-audit-3-9.md` (the opening fifteen seconds), run against the built site per P1's steps 1–3 rather than the dev server. Not repeated here | |

## Manual protocols

**P1 — First Paint on the target hardware (AC 2).**

1. **The machine.** Use NFR-4's target profile: a laptop about three years old, with integrated graphics, driving a 1080p display, such as a corporate work laptop. Never use the dev machine, and never a current Apple-silicon machine. Record the make, model, year, CPU, GPU, OS and browser with its version.
2. **The display and the GPU.** Record `devicePixelRatio` (from the console) together with the OS display scaling (100 %, 125 %, 150 %), and the viewport size (`innerWidth × innerHeight`). Record the GPU backend from `chrome://gpu` (the ANGLE backend, e.g. D3D11, and the GL_RENDERER line). A scaled display draws more pixels per frame, so these belong beside the figure.
3. **The build.** Run `npm run build` at the commit being measured. Never use `npm run dev`. Record the commit and the URL. Serve `dist/` in one of two ways, and record which:
   - **(a) A static host on the internet** (preferred; the 6.5 deployment, or any static host): the page then travels the connection measured in step 4.
   - **(b) `npm run preview -- --host` on another machine on the local network, with DevTools network throttling** set to a custom profile matching the down, up and RTT measured in step 4. A LAN load without throttling has almost no network time, so it understates First Paint over broadband and does not count as a run. Throttling needs DevTools open: open it, set the profile, then load (this is the one exception to step 6's "DevTools after the load", and the record says so).
4. **The connection.** The target is a median broadband connection. Measure the connection the laptop is actually on, just before the runs, with any speed test, and record its down, up and RTT. Do not invent or assume a figure. If it is far from median broadband, record it anyway and say so. Under 3(b), the throttling profile is these figures.
5. **A cold cache.** Before each run, open a new private window (or clear the site's data and cache). Close every other tab on the site.
6. **The run.** Load `/` first — never another route, which would mount the scene later or not at all — with the window at 1080p, in a foreground tab that stays visible until the scene is drawn. Open DevTools only after the load (DevTools open during the load slows it). A run that lands on another route, or loses visibility during the load (another window or tab brought forward, the laptop locked), is discarded and repeated. Once the scene is drawn, run this in the DevTools console:

   ```js
   performance.getEntriesByName('schematic-first-frame')[0].startTime
   ```

   This is milliseconds from navigation start to just after the scene's first draw was issued. Then record the step-6 count, `performance.getEntriesByName('schematic-first-frame').length`, which must be `1`; navigate to `/chart` and Back, and record it again, which must still be `1`.

   To make a miss diagnosable, also save, once per run, the navigation timing and the scene chunk's resource timing (where the time went: network, the entry, the scene chunk, the draw):

   ```js
   JSON.stringify([performance.getEntriesByType('navigation')[0], ...performance.getEntriesByType('resource').filter((e) => /\/assets\//.test(e.name))])
   ```

   Keep the output beside the record; it is not a table column.

   A run with **no** `schematic-first-frame` entry (an empty list, so `[0]` is `undefined`) means the scene never drew: the detection sent the machine to the Fallback chart, or the WebGL context failed. It is not a fast load and not a figure. Record it as a finding and do not count it as a run.
7. **Three runs.** Repeat steps 5 and 6 three times, one row each in the table below. Record all three values and their **median**, in seconds.
8. **The verdict.** Put the median in the Result column of row 2 as a measured value in seconds, at the precision measured (for example `2.14 s`, or `2.497 s` — not the carried `2.5 s` itself), with the date, the machine and the connection. Then compare it with the carried 2.5 s. At or under 2.5 s, the principle is met. Over it, the result is a decision for Thomas, not a failure; record the decision beside the figure. A `|` written inside a cell is escaped as `\|`.

If the machine has no WebGL2, the detection sends it to the Fallback chart and no scene draws. That machine cannot measure this. Record it as a finding and use another machine of the same profile.

### P1 runs

| Run | Date | Machine (model, year, CPU/GPU, OS, browser) | Display (`devicePixelRatio`, OS scaling, viewport) | GPU backend (`chrome://gpu`) | Connection (down / up / RTT) | `startTime` (ms) | Step-6 count (before / after `/chart` → Back) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| Median | | | | | | | |

## Known limits

- **The mark follows the issue of the first draw, not its presentation.** The frame callback queues the mark as a microtask, so it runs after R3F's first `gl.render` has been issued, the synchronous shader compile and link included. GPU completion of that frame, and its presentation on the display, may land later: the browser's compositor and the GPU work asynchronously. The mark is not a presentation timestamp. On the target profile the gap is expected to be about a frame or two against a 2.5 s figure, but it is not measured here.
- **"Shader compile included" depends on three.js compiling synchronously.** That holds for `gl.render` with its default program checks; three's asynchronous path (`compileAsync`, `KHR_parallel_shader_compile`) is not used by this scene. If it ever is, part of the compile can move past the mark.
- **The Fallback has no mark.** A machine without WebGL2 gets the chart, which has its own first paint; nothing here measures it. The principle (nothing gates the first frame) holds there by the same audits, but no figure is recorded for it.
- **One machine is one sample.** P1 measures one laptop on one connection. A different corporate image, with other extensions, endpoint security or proxies, can move the figure.
- **Nothing streams yet.** The fade-up rule (UX-DR37) is held vacuously: there is no late Body to fade. Any change that streams content after First Paint must add an executed test for the fade.
