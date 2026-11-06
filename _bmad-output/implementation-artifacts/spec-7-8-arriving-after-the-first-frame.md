---
title: "Story 7.8: Arriving after the first frame"
type: 'feature'
created: '2026-11-06'
status: 'done'
baseline_revision: 'a4600aacf1d1d598b7543ce63e628637c01bac42'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-7-stars-that-glow.md'
  - '{project-root}/_bmad-output/implementation-artifacts/first-paint-6-4.md'
warnings: ['oversized']
deferred:
  - summary: >-
      A warm-up that never settles leaves the Canvas's arrival in warming for good, with the document decoded and no failure, if the context is lost while three's compileAsync is still polling.
    evidence: |-
      compileAsync polls COMPLETION_STATUS until each program is ready; a lost context answers null. The owner sets no timer by design. Not seen in any run.
    location: >-
      src/render-scene/realism-status.ts
    severity: medium
  - summary: >-
      Nothing tests a subject change or a click into Focus while the fade runs.
    evidence: |-
      The arrival tests drive the fade with a fixed subject and no navigation; hit spheres are unchanged, so picking should not differ, unshown.
    location: >-
      src/render-scene/realism/fill-layer.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Today the realism layer appears in full on the first frame after decode. Every compile and upload lands synchronously inside three's render on that frame, inside frame-time sampling. A shader that fails to link never reaches the owner. Nothing fades, so the scene pops instead of coming alive.

**Approach:** Give each Canvas an arrival in four steps.
1. Build the layer and reset sampling, because upload begins. Upload every map by `initTexture` and compile every material by `compileAsync`, off-screen, then check that each program linked.
2. Attach the layer at fade 0 for one hidden warm draw.
3. On the next frame, reset sampling again and begin the fade.
4. The fade runs on one shared uniform over `FADE_SECONDS × pace`, and every fill writes depth on the frame it ends.

A later Canvas in a `shown` document does the same work, but its first visible frame is whole, with no fade.

## Boundaries & Constraints

**Always:**
- **Order per Canvas,** decided by the pure owner in `realism-status.ts`. It is context-scoped and reset by `enterCanvas` and by a scene change:
  - `none` → (a frame: build, `resetSampling()`, start `warm`) → `warming`, which draws nothing.
  - `warming` → (the promise resolves) → `warmed`.
  - `warmed` → (a frame: `attach`, `layer.frame`, `markUploaded`, all at fade 0, which is the hidden warm draw) → `warm-drawn`.
  - `warm-drawn` → (a frame: `resetSampling()`, `arrive(fade)` with `fade` true only when the document is not yet `shown`, `markShown`, `layer.frame`) → `arrived`.
  - The document status keeps its table: `shown` means the first visible frame has begun.
- **`warm(renderer, camera, scene)`,** on the layer, in the chunk:
  - Calls `renderer.initTexture` once per texture.
  - Calls `renderer.compileAsync(group, camera, scene)` over the layer's own detached `Group`, so the programs match what `scene` will render.
  - Then reads `LINK_STATUS` for every material's current program straight from the context. This logs nothing, unlike three's first-use check. Any program not linked rejects.
  - It never attaches anything.
- A synchronous throw from `warm` or `initTexture`, a rejection, or a later frame throwing all end in `markFailed`. The layer is removed, the schematic scene stays and the loop stays alive. Nothing is thrown, logged or retried.
- A warm promise that settles after its layer was released (the Canvas left, or the scene changed) does nothing, whether it resolves or rejects.
- **One fade uniform:** one `{ value }` object, created once in `fill-layer.ts` and shared by every Planet fill, Star fill and glow.
  - Fills output alpha `uFade`. A glow multiplies its colour by `uFade`.
  - At 0 nothing is drawn visibly, under `NormalBlending` and `AdditiveBlending` alike.
  - The ceilings hold at every fade value, since fading only lowers a pixel.
- **The fade model is pure** and types-only, in `src/render-scene/realism/arrival-model.ts`:
  - `FADE_SECONDS` (starting value 1.0, for Epic 8).
  - A frame clamp, so a stall cannot cut.
  - `nextFade(fade, delta, pace)`: a delta that is not a positive finite number holds the fade, and a pace that is not positive and finite steps at full motion, as `nextRise` does.
  - `depthWrites(fade)`: true only at 1.
- **Depth:** every fill (Planet and Star) has `depthWrite` false from build until the fade reaches 1, then all of them switch on that same frame. With no fade, they are on from the first visible frame. A glow never writes depth.
- **Sampling resets:** the owner takes a second argument, `resetSampling: () => void`. The mount binds it at module scope as `() => resetFrameSampling()`, so `realism-mount.tsx` is the one added caller and importer, taking that one name. The owner calls it exactly twice per Canvas arrival: when upload begins and when the first visible frame begins.
- `RealismDraw` gains `renderer`; the mount passes R3F's `gl`. The mount stays one effect, one frame callback and null, pinned whole by `MOUNT_LINES`.
- **A lost and restored context under one Canvas stays as 7.6 settled it.** Three uploads and compiles again on its next draw, from the kept images, with no request and no fade. `uploaded` stays true. This is written down in the owner's header and in the record.

**Block If:**
- A test can pass only by changing an M2 audit beyond AD-19's eight allowances: HALT `blocked` with `audit change outside AD-19's allowances`. This story uses one of them, the `chart-offer.ts` importer table, for `realism-mount.tsx: ['resetFrameSampling']` only.
- `scene` exceeds 960,000 or `realism` exceeds 24,000: HALT `blocked` with `realism budget exceeded`.
- A real browser cannot run WebGL here: HALT `blocked` with `no real browser for the arrival check`.
- The first frame differs from the baseline build's first frame, or the entry or mount chunk gains a realism module: HALT `blocked` with `first paint changed`.

**Never:**
- Add a render target, composer, full-screen pass, shadow map, scene light, bloom or new geometry. Fade Body by Body, or per Body.
- Call `resetFrameSampling` from `realism/` or from anywhere but the mount's binding. Read `motionPace` or the preference under `realism/`.
- Change label ink, position, plates or contrast (7.9). Change `body-field.tsx`, `moon-field.tsx`, `dust-model.ts`, `scene-model.ts`, `stroke-model.ts`, `first-frame-mark.tsx`, `first-paint.test.ts`, `frame-sampler.tsx`, `scene-host.tsx`, `chart-offer.ts`'s logic, the tokens, `career.json` or the artifact. Add a dependency.
- Use `lazy`, `use`, `useLoader`, `useTexture`, `setTimeout` or `requestAnimationFrame` in the owner. Write a store field. Use `renderer.debug.onShaderError`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First arrival | first frame at `decoded` | build, one reset, `warm` called with the renderer, camera and scene; nothing attached, subject not called | n/a |
| Warming | frames while the promise is pending | nothing attached, no second build or warm, no reset | n/a |
| Warmed | first frame after resolve | attached at fade 0 with no depth, `uploaded` true, document still `decoded` | n/a |
| Fade begins | next frame | second reset, `arrive(true)`, `shown` | n/a |
| Fade runs | later frames | fade rises by the clamped delta over `FADE_SECONDS × pace`; depth off until 1, then on for every fill that frame | n/a |
| Stall mid-fade | delta 10 s | the fade moves at most one clamped step | n/a |
| Return over `shown` | new Canvas | build, reset, warm again with no request; warm draw; then `arrive(false)`: whole, depth on | n/a |
| Return mid-fade | Canvas leaves at fade 0.4 | document already `shown`; the next Canvas draws whole | n/a |
| Return while warming | Canvas leaves before resolve | stale promise ignored; the next Canvas warms afresh and fades (document not `shown`) | stale reject ignored |
| Return while fetching | new Canvas, decode arrives later | first arrival as above, with a fade | n/a |
| Return after `failed` | new Canvas | nothing built, no warm, no reset | silent |
| Warm throws | `initTexture` or `warm` throws synchronously | `failed`, nothing attached | silent |
| Warm rejects | a program not linked | `failed`, layer disposed | silent |
| Frame throws | an update throws mid-fade | `failed`, removed, loop alive | silent |
| Upload stall | a 0.8 s frame and slow frames just after the upload reset, on a 30 fps machine | the offer does not latch; without the resets it would | n/a |
| Slow machine | 20 fps sustained through arrival | the offer still latches | n/a |

</intent-contract>

## Code Map

- `src/render-scene/realism-status.ts:83,93,100,141,196` -- `RealismDraw` gains `renderer`. `RealismLayer` gains `warm(renderer, camera, scene): Promise<void>` and `arrive(fade: boolean)`. `createRealismOwner(importChunk, resetSampling)`. `drawLayer` becomes the per-Canvas phase machine; today it marks uploaded and shown on the build frame. The header, including its 7.8 paragraphs, is rewritten: no `setTimeout`, and the file still imports nothing.
- `src/render-scene/realism-mount.tsx:35,45-47` -- the owner binding takes `() => resetFrameSampling()`. `useFrame(({ scene, camera, gl }, delta)` adds `renderer: gl`. Import `resetFrameSampling` from `../shell/chart-offer.ts`.
- `src/render-scene/realism-status.test.ts:20-70,329-560,612-700` -- the fakes gain `warm` and `arrive`, and `ownerOver` gains a reset counter. Rows that expect shown on the build frame (`:329`, `:418`, `:502`, `:539`, `:560`) are rewritten to the new order. `MOUNT_LINES` and its mutation rows add the import and the binding, with rows for no reset, a second reset call and a fixed renderer.
- `src/render-scene/realism/fill-layer.ts:53-141` -- one `Group` holding every mesh, one shared `uFade`, `depthWrite: false` at build, plus `warm`, `arrive`, and the fade step in `frame`. Hand `uFade` and the depth switch to the Star rows.
- `src/render-scene/realism/star-layer.ts:33-93` -- takes the shared fade uniform. The Star fill starts with `depthWrite: false` and follows the switch. Rows are added to the group the layer hands in.
- `src/render-scene/realism/fill-shader.ts:41-67`, `star-shader.ts:37-80` -- `uniform float uFade;`, fill alpha `uFade`, glow colour `× uFade`.
- `src/render-scene/realism/star-model.ts:26,33,92` -- the shape `nextFade` copies: clamp, hold, pace fallback.
- `src/render-scene/realism/fill-model.test.ts:504,552-554` -- `NO_PIPELINE`'s 7.8 row splits. `initTexture` and `compileAsync` are admitted in `fill-layer.ts` only. `resetFrameSampling` stays banned under `realism/` and is admitted in the mount. `:261` `auditLayer` must still see one `new Mesh`; a `Group` is not a draw.
- `src/render-scene/realism/star-model.test.ts` -- the shader audits gain `uFade`; the layer tests under real three objects cover depth starting off and the switch.
- `src/render-scene/realism/map-urls.test.ts:105` -- the directory list gains `arrival-model.ts`.
- `src/shell/chart-offer.test.ts:264-332` -- `IMPORTERS` gains `'src/render-scene/realism-mount.tsx': ['resetFrameSampling']`, with a mutation row for the mount taking another name. `:424-455` (the host's two resets) are unchanged.
- `src/shell/chart-offer.ts:32-33` -- the header's "Resets are scene-host.tsx's" names the mount's two. Comment only.
- `node_modules/three/src/renderers/WebGLRenderer.js:1380-1545,3529` -- `compile` traverses `scene` and prepares programs against `targetScene`, and does not call `getUniforms`, so nothing is logged yet. `compileAsync` never rejects. `initTexture` binds unit 0. `renderer.properties.get(material).currentProgram.program` is the `WebGLProgram` for `getProgramParameter(…, LINK_STATUS)`.
- `_bmad-output/implementation-artifacts/first-paint-6-4.md:27,84,87` -- row 5 and two known limits to rewrite. `scripts/record-table.test.ts` checks that every test title named there exists.
- `spikes/realism-fills/prod-stars.mjs`, `run-harness.mjs`, `harness.ts` -- the production driver, to extend for the arrival. The harness's direct `createFillLayer` use must call `arrive(false)` to keep its 7.6 and 7.7 figures meaningful.
- `_bmad-output/implementation-artifacts/deferred-work.md:1385,1413,1433` -- context restore, compile failure, and sampling: this story closes or passes on each.

## Tasks & Acceptance

**Execution:**
- `src/render-scene/realism/arrival-model.test.ts`, `src/render-scene/realism-status.test.ts`, `src/shell/chart-offer.test.ts` -- red first: the matrix (each row a test), the stall/slow-machine pair driven through the real `sampleFrame` and `resetFrameSampling` with a no-reset control, the importer row, the mount lines.
- `src/render-scene/realism/arrival-model.ts` -- pure, types only: `FADE_SECONDS`, `FADE_MAX_FRAME_SECONDS`, `nextFade`, `depthWrites`.
- `src/render-scene/realism/fill-shader.ts`, `star-shader.ts` -- the fade uniform.
- `src/render-scene/realism/fill-layer.ts`, `star-layer.ts` -- the group, shared fade, depth switch, `warm`, `arrive`.
- `src/render-scene/realism-status.ts`, `src/render-scene/realism-mount.tsx` -- the phase machine, the reset port, the renderer.
- `src/render-scene/realism/fill-model.test.ts`, `star-model.test.ts`, `map-urls.test.ts` -- the audits in the Code Map, with mutation rows for: a second fade uniform, a fill writing depth at build, `compileAsync` outside `fill-layer.ts`, and `resetFrameSampling` under `realism/`.
- `spikes/realism-fills/` -- arrival runs on a production build; write `_bmad-output/implementation-artifacts/realism-arrival-7-8.md`.
- `first-paint-6-4.md`, `src/render-scene/README.md`, `src/render-scene/realism/README.md`, `src/shell/README.md`, `src/shell/chart-offer.ts` (header), `deferred-work.md` -- the records and docs.

**Acceptance Criteria:**
- Given the source, when audited, then `initTexture` is called once per texture and `compileAsync` once per layer, both in `fill-layer.ts` only. No layer mesh is in the scene before `warm` resolves. A program that fails `LINK_STATUS` rejects `warm`, and a fake-renderer test shows `markFailed` with nothing logged.
- Given a production build in Chrome, when realism arrives:
  - the frame of the hidden warm draw differs from the frame before it by 0 pixels outside Dust, Motes and anything else that moves with time, with a control showing the comparison can fail;
  - the visible frames rise monotonically in mean disc luminance over about `FADE_SECONDS × 60` frames, with no frame-to-frame step larger than a stated bound, at pace 1 and at reduced motion;
  - every fill reaches its 7.7 rest read-back once settled.
- Given the fade's first visible frame, when line-work pixels inside fill discs are read, then each still reads its token value: no line-work vanishes. On the frame after it ends, a farther Body's marks behind a fill are hidden as in 7.7.
- Given the source, when audited, then one fade uniform object is shared by every fill and glow material, with a mutation row for a second object.
- Given `chart-offer.test.ts`, when run, then `realism-mount.tsx` imports `resetFrameSampling` alone, and the other three importers are unchanged.
- Given a remount in one page, when the second Canvas draws, then `initTexture` and `compileAsync` run again before its first realism frame, it draws whole on its first visible frame, and there is no request. Given `WEBGL_lose_context` under one Canvas, then the layer returns with no request, as recorded.
- Given `map-404`, `map-corrupt` and `chunk-404`, when served, then the frames match the baseline and Rail input moves them.
- Given the first frame, when compared with the baseline build's first frame, then it is identical. `schematic-first-frame` precedes every realism request and every `compileAsync` call. The bundle assertion shows the entry and mount chunks with no realism module.
- Given `first-paint-6-4.md`, when this story closes, then row 5 and the known limits name the realism fade and its executed tests, say that Bodies still all draw in the first frame, and say that `compileAsync` runs only after the mark, so the first frame's compile stays synchronous. `scripts/record-table.test.ts` passes.
- Given `git diff` against the baseline over the Never files, when run, then it is empty, and the chunk budgets hold.

## Spec Change Log

## Review Triage Log

### 2026-11-06 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12 (high 0, medium 4, low 8)
- defer: 2 (high 0, medium 1, low 1)
- reject: 10
- addressed_findings:
  - `[medium]` `[patch]` A layer released while three's `compileAsync` was still polling freed its materials, so three's poll threw inside its own timer, uncaught and logged. `dispose` now frees materials, textures and geometry once the compile settles, silently (`fill-layer.ts`), red then green.
  - `[medium]` `[patch]` A context lost during the warm-up answered null to `LINK_STATUS` and failed the document for good. `warm` now resolves on a lost context and rejects only on a status that is not `true` (`fill-layer.ts`), red then green.
  - `[medium]` `[patch]` The link check's three internals were held only by fakes shaped like them. A test now pins `currentProgram`, `properties`, `WebGLProgram.program`, and the `compileAsync` and `initTexture` signatures against three 0.185.1's source (`arrival-model.test.ts`).
  - `[medium]` `[patch]` The record called 8 drifting pixels unexplained line-work. The Dust medium is `stroke-rest-dark` and draws before every fill, so they are most likely Dust, which is AD-19's order. The record and the deferral now say so, as a likely cause and not a measured one.
  - `[low]` `[patch]` `arrive`'s doc said the fade steps from the next frame; the owner steps it in the same tick. The doc now says so.
  - `[low]` `[patch]` "Every texture and program binds for real" on the warm draw ignored frustum culling; narrowed in `realism-status.ts`.
  - `[low]` `[patch]` "Exactly twice per arrival" did not say a rebuild is a new arrival, nor that a frame before a new Canvas's effect builds twice. The owner header, the render-scene README and the record's remount row (6 uploads, 43 polls) now do.
  - `[low]` `[patch]` The record's step bound is set by a clamped 50 ms frame and cannot catch a small cut at 165 Hz; the record now says what it rules out and what it does not.
  - `[low]` `[patch]` The failure-modes column said "first frame" for a frame read after an 11 s wait; relabelled.
  - `[low]` `[patch]` `prod-arrival.mjs`'s order checks passed over empty arrays; they now require at least one entry.
  - `[low]` `[patch]` First Paint row 5 now says UX-DR37's own case, a streamed Body's stroke, is still held vacuously, and that the realism fade is an alpha fade.
  - `[low]` `[patch]` "A pace that is not one" read as "not 1"; it now reads "not a positive finite number", in `arrival-model.ts`, `star-model.ts` and the realism README.

## Design Notes

**Why a detached group for the compile.** If the meshes sat in the scene while compiling, R3F's next render would link them synchronously and the async path would be lost. `compile(group, camera, scene)` prepares programs against `scene`'s render state, so the cache key matches the attached draw. A `Group` is not a draw and adds none.

**Why the fade-0 frame is the warm draw.** A render target or an off-screen pass is forbidden. At `uFade = 0`, a fill blends to the destination unchanged and a glow adds 0. That frame binds every texture and program for real, invisibly.

**Why `LINK_STATUS` directly.** `compileAsync` resolves whether or not a program linked. Three's own check runs on first use and logs. Reading the status ourselves after the promise resolves costs nothing, because the compile has finished, and it lets the failure end silently.

```ts
const gl = renderer.getContext();
for (const material of materials) {
  const program = renderer.properties.get(material).currentProgram?.program;
  if (!program || !gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('a realism program did not link');
}
```

**Why two resets.** Upload and compile land just after the first reset, inside the 2 s warm-up. The second reset keeps the fade's first frames from counting too. A machine truly below 24 fps still fills a window after the warm-up and latches.

## Verification

**Commands:**
- `npm test` -- expected: all pass, the one environmental skip, count above 2036.
- `npm run typecheck` -- expected: clean.
- `npm run gate` -- expected: passes.
- `npm run build` -- expected: succeeds, `realism` ≤ 24,000 and `scene` ≤ 960,000.

**Manual checks:**
- Drive a production build in Chrome per the ACs (arrival frames, remount, lost context, failure modes, first frame), and record pixels, requests and console lines in `realism-arrival-7-8.md`. Only the dev machine runs this, and no framerate is measured.

## Auto Run Result

**Status:** done.

**Implemented change.** Realism now arrives per Canvas in four steps.
1. On the first frame with the images held, the owner builds the layer and resets frame sampling. The layer uploads every map by `initTexture` and compiles every material by `compileAsync` over its own detached `Group`, against the scene, then checks each program's `LINK_STATUS`.
2. Once that settles, the layer is attached at fade 0 for one hidden warm draw.
3. On the next frame, sampling resets again and the layer arrives. The first Canvas in a document fades in on one shared `uFade` uniform over `FADE_SECONDS × pace`. A later Canvas in a `shown` document is whole at once.
4. Fills write no depth until the fade reaches 1, and then all of them write it on that frame.

The mount binds `() => resetFrameSampling()` as the owner's reset port and passes R3F's `gl`. Every failure ends in `markFailed`, silently.

**Files changed:**
- `src/render-scene/realism/arrival-model.ts` (new): `FADE_SECONDS`, the frame clamp, `nextFade`, `depthWrites`.
- `src/render-scene/realism/arrival-model.test.ts` (new): the model, the shared fade, the depth switch, and the warm-up over a fake renderer and the real owner. Includes the review's three tests.
- `src/render-scene/realism/fill-layer.ts`: the group, the shared fade, the depth switch, `warm`, `arrive`, and freeing deferred past a pending compile.
- `src/render-scene/realism/star-layer.ts`, `fill-shader.ts`, `star-shader.ts`: the fade uniform and the Star fill's depth switch.
- `src/render-scene/realism-status.ts`: the per-Canvas arrival phases and the reset port.
- `src/render-scene/realism-mount.tsx`: the reset binding and the renderer.
- `src/render-scene/realism-status.test.ts`: the matrix, one test per row, the stall and slow-machine pair over the real sampler, and the mount lines.
- `src/render-scene/realism/fill-model.test.ts`, `star-model.test.ts`, `map-urls.test.ts`, `src/shell/chart-offer.test.ts`: audits and their mutation rows. The importer table gains the mount for `resetFrameSampling` alone.
- `src/shell/chart-offer.ts`: header comment only.
- `src/render-scene/README.md`, `src/render-scene/realism/README.md`, `src/shell/README.md`: documentation.
- `_bmad-output/implementation-artifacts/first-paint-6-4.md`: row 5 and two known limits.
- `_bmad-output/implementation-artifacts/realism-arrival-7-8.md` (new): the browser record.
- `_bmad-output/implementation-artifacts/deferred-work.md`: 7.5 and 7.6 items closed or passed on, plus 7.8's own deferrals and the review's.
- `spikes/realism-fills/harness.ts`, `README.md`, `prod-arrival.mjs` (new), `results/prod-arrival.txt` (new): the harness calls `arrive(false)`; the production arrival driver and its output.

**Review findings.** Four layers ran: blind, edge-case, verification-gap and intent-alignment. 12 patches were applied (medium 4, low 8), 2 were deferred (medium 1, low 1), and 10 were rejected. The rejections were by design (AD-22's single depth switch on the fade's last frame), not reachable with shipped values (a huge pace, Canvases rendering alternate frames), already deferred, or the record's own stated limits. There was no intent gap and no bad spec.

**Follow-up review recommended: true.** Patched: high 0, medium 4, low 8. The score is 3 × 4 + 8 = 20, which is 5 or more.

**Verification:**
- `npm run typecheck`: clean.
- `npm test`: 2072 tests, 2071 pass, 0 fail, 1 environmental skip.
- `npm run gate`: passes.
- `npm run build`: succeeds. `realism` is 8,560 of 24,000 bytes and `scene` 952,578 of 960,000.
- In Chrome on the dev machine (`realism-arrival-7-8.md`), on the build before the review:
  - the first frame is identical to the baseline's;
  - the mark precedes every realism request and `compileAsync` poll;
  - the warm draw differs from the frame before it by 0 pixels;
  - the fade is monotonic, lasting 1.0 s and 0.25 s reduced;
  - the settled frames are identical to 7.7's;
  - a remount re-warms and is whole with no request;
  - a lost context returns with no request;
  - `map-404`, `map-corrupt` and `chunk-404` match the baseline.
- The review's patches were not rerun in the browser.

**Residual risks:**
- The cause of the 8 drifting pixels (Dust) is inferred from colour and draw order, not measured.
- No real link failure and no silent GL upload error were produced on a GPU.
- A warm-up can wait forever if the context is lost mid-compile (deferred).
- A remount whose first frame comes before its effect builds and compiles twice.
- Farther line-work behind fills is hidden by a one-frame switch on the fade's last frame, as AD-22 requires.
- Only one machine, one viewport and Chrome were run, at 165 Hz, with no framerate measured. The look of the fade is unjudged, and `FADE_SECONDS` is a starting value for Epic 8.
- This branch must not merge before Epic 8.
