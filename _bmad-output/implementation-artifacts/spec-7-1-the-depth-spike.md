---
title: 'Story 7.1: The depth spike'
type: 'chore'
created: '2026-11-04'
status: 'done'
baseline_revision: 'ecccae125d666500889513c76522fe71027177f6'
review_loop_iteration: 2
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
warnings: ['oversized']
deferred: ['deferred-work.md, code review of spec-7-1 (2026-11-04), 4 entries']
---

<intent-contract>

## Intent

**Problem:** AD-19 draws each Planet fill behind its own line-work by a small depth bias, and nothing has shown such a bias works: too small and the marks z-fight, too large and another Body's marks show through a fill that should hide them. Every later Epic 7 story builds on this.

**Approach:** A throwaway scene outside `src/` mounts the shipped `BodyField` and `MoonField` from the committed artifact, adds billboard fills, and measures both failures from read-back pixels in real Chrome on the real GPU, across both bias mechanisms, while the camera moves. The result goes in the architecture memlog, or the epic stops.

## Boundaries & Constraints

**Always:**
- Every result comes from pixels read back in Chrome on the hardware GPU. Before any measurement, the harness records `UNMASKED_RENDERER_WEBGL`, and a renderer matching `SwiftShader`, `llvmpipe` or `Software` makes the run invalid.
- The camera uses the shipped models (`buildRail`, `railPose`, `focusPose`, `frameBodies`, `railFarPlane`) and the shipped near and far values, and the Canvas keeps `flat` and R3F's default depth and antialias settings.
- The record states that the dev machine is not NFR-4's target profile, and that the result does not show the bias holds on integrated graphics.
- A failing or inconclusive result is reported as what it is. No threshold or pose is relaxed to reach a pass.

**Block If:**
- No value of either mechanism passes every pose (the epic's stop rule). Record the measurements and the failure in the memlog, then HALT `blocked` with condition `AD-19 bias failed; ruling needed from Thomas`. No later story starts.
- A control fails (see the design notes), so the harness cannot be trusted. HALT `blocked` with condition `depth spike controls failed`.
- Chrome exposes only a software renderer. HALT `blocked` with condition `no hardware GPU in the browser`.

**Never:**
- Change anything under `src/`, `scripts/`, `generated/`, `public/`, `package.json`, `package-lock.json`, `tsconfig.json` or the root `vite.config.ts`. Add no dependency.
- Add realism tokens, render-order constants, maps or shaders to shipped code (7.2 onward).
- Measure or claim a framerate (NFR-2).
- Amend AD-19's text, or edit existing memlog lines. The memlog is append-only.

</intent-contract>

## Code Map

- `src/render-scene/body-field.tsx:48` -- `BodyField({ bodies, rail })`: shipped line-work. Imported, unmodified. Each mark sits in a drei `<Billboard>` inside a group at the Body's position. Top-level `<Line>`s are orbits and the Rail; lines inside a Billboard are marks.
- `src/render-scene/moon-field.tsx:35` -- `MoonField({ bodies })`: shipped Moons. Imported, unmodified. Its scale runs in `useFrame`.
- `src/render-scene/scene.tsx:157-175` -- the Canvas props and camera to reproduce (`flat`, near, `far: Math.max(framing.far, railFarPlane(rail, bodies))`, background `surface-base-dark` from `src/tokens/tokens.ts`). Not imported: it would mount Dust, Motes and the rig.
- `src/render-scene/rail-camera.tsx:70-71` -- how a pose reaches the camera: `camera.position.set(...)`, then `camera.lookAt(...)`.
- `src/render-scene/rail-model.ts:250,454,609` -- `buildRail`, `railStopCount`, `railPose(rail, progress, aspect)`.
- `src/render-scene/focus-model.ts:97` -- `focusPose(rail, bodies, id, aspect, fraction)`; `PANEL_FRACTION` is imported there, so find its home from that file's imports.
- `src/render-scene/scene-model.ts:221,438` -- `buildScene`, `frameBodies`; `DEFAULT_NEAR` is 0.1.
- `src/render-scene/stroke-model.ts:192-210` -- `bodyRadius`: Star 1, Planet 0.45.
- `src/render-scene/notable-model.ts:34,43` -- the Ring (2.2 × radius) and Moon offset (2 × radius) lie outside their own Planet's fill, so a fill can only threaten them when it belongs to another Body.
- `generated/layout.generated.json` -- the committed artifact: 14 Bodies, one Deep Planet (`project:sncf/client-referential`, the only Ring and Moon). The closest pair is about 10.0 units apart (Star to its Planet).
- `_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/.memlog.md` -- append-only record, one `- (type) TEXT` line per entry.
- `tsconfig.json:22` and `package.json` `test` -- cover `src`, `scripts` and `vite.config.ts` only, so `spikes/` stays outside typecheck, tests and the build.
- Measured on this machine, 2026-11-04: Chrome 156, `ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER (0x00002702) Direct3D11 vs_5_0 ps_5_0, D3D11)`, 24 depth bits, 4 samples, driver 32.0.16.1088, i9-14900KF. The chrome-devtools MCP browser reaches this GPU.
- That window reports `devicePixelRatio` 3 and is only 500 CSS px wide, and the desktop is 3840×2160 at high scaling, so a 1920×1080 viewport cannot be relied on. Size the canvas with a fixed-size element and an explicit `dpr` instead.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/depth-bias/vite.config.ts`, `index.html`, `main.tsx` -- create a standalone Vite root (port 5199, `server.fs.allow` reaching the repo root, the React plugin only) that imports the shipped modules by relative path. Runs with `npx vite --config spikes/depth-bias/vite.config.ts` -- the scene stays out of `src/` and every shipped chunk.
- [x] `spikes/depth-bias/fill.tsx` -- a fill per Body inside its own `<Billboard>`, per the design notes -- this is the mechanism under test.
- [x] `spikes/depth-bias/harness.ts` -- pose matrix, camera sweep, comparators and controls, exposed as `window.runSpike()`, returning JSON -- driven through chrome-devtools `evaluate_script`.
- [x] `spikes/depth-bias/README.md` -- how to rerun it on another machine, what each number means, and that it is throwaway -- a target-profile laptop may repeat the run later.
- [x] `_bmad-output/implementation-artifacts/depth-spike-7-1.md` -- the measurement record: environment, sweep table per mechanism, per-pose results for the chosen value, control results, depth gaps, and how three inspected screenshots looked (saved beside the record as `depth-spike-7-1-<pose>.png`; at each, the fill in a visible grey with orbits and the Rail present).
- [x] `_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/.memlog.md` -- append one `(decision)` line per the AC below -- 7.6 reads the value from here.

**Acceptance Criteria:**
- Given the spike's scene, when `git diff` is read and `npm run build` runs, then nothing under `src/`, `scripts/` or the shipped config changed, and no file in `dist/` contains a spike module.
- Given the widest Rail distance, every Client stop and the closest Focus pose, at both viewports, when the camera sweeps each pose with fills on, then at the chosen value no Star core dot, Planet outline, Ring or Moon pixel differs from the same frame without fills by more than 2 in any channel, with orbits and the Rail hidden in both and pixels under a nearer Body's fill excluded, in any frame.
- Given another Body's fill in front, when its fill covers the first Body's marks at a real pair's separation, at the same three pose classes, then none of those marks shows inside the fill, in any frame.
- Given the sweep ends, when the memlog is read, then its new line names the chosen mechanism and value, machine, GPU, browser with version, depth-buffer bits and the record's path.
- Given the dev machine is not the target profile, when the memlog line and the record are read, then each says this does not show the bias holds on integrated graphics.
- Given the controls in the design notes, when the record is read, then each control's measured result is present, showing that the comparators detect both failures.
- Given no value passes every pose, when the sweep ends, then the failure is recorded and the run HALTs per Block If, with no value chosen.

### Review Findings

- [x] [Review][Decision] Confirm the comparator ruling is Thomas's — Resolved 2026-11-05: Thomas confirmed the ruling is his, so the result stands and the stop rule did not fire.
- [x] [Review][Patch] Record's headline says every pose, though the own-marks test cannot fail at Focus on 390×844 and no pixel was attributed to a Ring or Moon; Thomas ruled 2026-11-05 to accept the limit, with 7.6's existing recheck covering it, so narrow the headline and answer the "For Thomas" note [_bmad-output/implementation-artifacts/depth-spike-7-1.md:3]
- [x] [Review][Patch] Hardware check runs only at the first viewport in `runShowControl`, and the record says each passed [spikes/depth-bias/harness.ts:806]
- [x] [Review][Patch] 7.6's acceptance criterion omits the flattening the bias depends on [_bmad-output/planning-artifacts/epics.md:2779]
- [x] [Review][Patch] Scatter reading only probes marks leading the fill, yet supports the value chosen [_bmad-output/implementation-artifacts/depth-spike-7-1.md:83]
- [x] [Review][Patch] Rerun pointer names a revision with no harness, and gives no check that the integrated GPU was used [spikes/depth-bias/README.md:5]
- [x] [Review][Patch] `lostAsWritten` is described as the same test, but it skips pixels with no mark [spikes/depth-bias/README.md:64]

## Spec Change Log

- 2026-11-04, Thomas's ruling, after the first full sweep. **Finding:** as first written, the own-marks comparator failed every value of both mechanisms, so the stop rule would have fired. 227,566 of 227,794 lost pixels still matched marks alone once orbits and the Rail were removed: the fill was hiding a line beneath the mark, as the epic intends (a fill hides the far half of an orbit). The other 228 were the same 6 pixels on the Rail run, 12 per sweep value at 1920×1080, where a nearer Star's fill hides a farther Star's outline. **Amended:** the second AC and the own-marks comparator judge marks with orbits and the Rail hidden, and exclude a pixel when a mark there lies under a nearer fill. **Avoids:** stopping Epic 7 over correct occlusion. **KEEP:** the first comparator still runs and is reported as `lostAsWritten`, so the record shows both results; thresholds, poses and the spec's sweep values are unchanged.
- 2026-11-04, review of the first implementation. **Finding:** the show-through evidence at the widest distance rested on enlarged-disc rows the spec never named, and 3 of them tested pixels yet stayed at 0 in the 1.5× control, because the front Body's marks covered the rear marks. `rearPixelsInDisc` counted those pixels as tested. **Amended:** the other-body comparator names the enlarged-disc rows, hides the front Body's marks in them, and counts `testablePixels`; the show-through control is judged per row; the sweep may add values to locate an edge. **Avoids:** a control that reads "detected" in aggregate over rows that cannot detect, and a limit set by an unlogged mechanism. **KEEP:** the harness was changed in place, not reverted, along with the first ruling and the amended own-marks comparator.

## Review Triage Log

**Round 1 (2026-11-04), three reviewers.** Loopback for `bad_spec`: the enlarged-disc rows were unlogged and 3 of them stayed silent in the 1.5× control; the spec was amended, the harness changed in place and every measurement rerun. Patched: per-viewport hardware check, enforced fill-colour check, WARP in the software pattern, WebGL errors end a run, sink failures handled, `testablePixels`, a `passes` field, the record's formula, gaps and limits.

**Round 2 (2026-11-04), three reviewers.** Patched: the record's false claim that a Moon is safe by geometry, its unreliable mark labels, and "stricter than a visitor could see"; the memlog line now states the fill's conditions and the poses that cannot fail; `runShowControl` guards the fill colour and throws on a silent row (control rerun); raw results indexed; AC terms brought into line with the ruling. Rejected as out of proportion for a throwaway harness: concurrent-run locks, tag and option validation, sink origin checks and overwrite refusal, a built-in control preflight (the README requires the controls instead). Deferred: 4 entries in `deferred-work.md`.

**For Thomas:** the own-marks control loses nothing at `focus-deep`, or at `focus-closest` on 390×844, so a Ring and a Moon are not tested against their own fill at their closest, as the epic's AC reads. The record says so, and this was not treated as a failed control, since the spec's own code map says they lie outside their fill there. **Answer (2026-11-05):** Thomas accepted this limit, with 7.6's recheck against real fills covering it.

## Design Notes

**Fill.** `SphereGeometry(1, 64, 32)` with a `ShaderMaterial`, `transparent`, `opacity`-equivalent 1, `depthWrite` on, `FrontSide`, `renderOrder` 1.5 (literal in the spike; 7.2 declares the constant), radius `0.96 × bodyRadius(body)` (spike's value; 7.6 owns the constant). The vertex shader flattens to the Billboard's plane:

```glsl
vec4 p = modelViewMatrix * vec4(position.xy * uRadius, 0.0, 1.0); // the plane of the marks
gl_Position = projectionMatrix * p;
gl_Position.z += uClipOffset * gl_Position.w;                     // clip-space mechanism
```

The polygon mechanism sets `polygonOffset: true`, `polygonOffsetFactor: 0`, `polygonOffsetUnits: N` and `uClipOffset` 0. A flattened fill faces the camera, so slope contributes nothing.

**Sweep values.** Polygon units `0, 1, 2, 4, 8, 16, 32, 64, 128`. Clip offset `0, 1e-7, 2e-7, 5e-7, 1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5`. A run may add values to locate an edge; the record marks them.

**Pose matrix**, each at `1920×1080 dpr 1` and `390×844 dpr 2`:
- *Widest:* the sampled Rail pose (progress step 1/32 from 0 to the stop count) with the greatest camera-to-Body distance among Bodies in its frustum. Include keyframe 0.
- *Client stop:* `railPose` at each integer progress from 1 to the stop count.
- *Closest Focus:* the smallest-distance `focusPose` across all Planets at fractions `0` and `PANEL_FRACTION`, plus Focus on the Deep Planet, so a Ring and a Moon are tested at their closest.

**Camera moves.** Each pose runs at least 120 frames, with `frameloop="never"` and `advance()`. The position moves on a small continuous path around the pose (radius 1% of the camera-to-target distance) with the target fixed, so depth values cross many rounding boundaries. Separately, the whole Rail runs forward and back in steps of 1/60 stop per frame.

**Own-marks comparator (z-fighting).** Draw the fill in exactly the background colour, then render each frame at one camera: `M`, marks only, with orbits and the Rail hidden (walk the scene: lines outside a Billboard); `C`, those marks with fills shown; and, for the as-written figure, `A`, full line-work with fills hidden, and `B`, full line-work with fills shown. With a good bias `C` equals `M`, because a background-coloured fill changes nothing, and that holds for antialiased edge pixels too. A *lost pixel* is one where `M` differs from the background and any channel of `M` and `C` differs by more than 2. Exclude a pixel when a mark there lies inside the projected disc (dilated 2px) of another Body's fill that is nearer than that mark, since that hiding is correct, and report how many were excluded. Also report `lostAsWritten`, the same test on `A` and `B`, which counts a line hidden beneath a mark; it does not decide a pass (see the change log). Read back with `gl.readPixels` straight after each `advance()`.

**Other-body comparator (show-through).** Draw fills in a magenta used only by the spike. Pick the real closest pair (about 10 units apart), and aim the camera along the line through both from each pose class's distance, with small sweeps, each Body taking the front place in turn. Render `R`, only the rear Body's marks, unoccluded, with no fills, and `B`, both Bodies with fills. A *show-through pixel* lies within the front fill's projected disc (inset 2px), where `R` differs from the background and `B` is not exactly the fill colour and not the front Body's own marks (from a render of the front Body's marks alone). Bodies are subsets of the real list, each Star with its Planets' orbit lines unaffected: mount only what `sceneLines` accepts, meaning a Planet needs its Star present. A row's evidence is `testablePixels`, the rear-mark pixels in the disc not under the front Body's own marks; a row with none is no evidence. Where the real disc holds no rear pixel after its inset, as at the widest distance, the same frames run again as a `|probe` row: the disc enlarged to 16px and the front Body's marks hidden, testing the same depth ordering (front fill against rear mark) on pixels that exist.

**Controls (must behave as stated, or Block If).**
- Own-marks negative: a bias in *front* of the plane (negative value of the same magnitude as the chosen one) must produce lost pixels.
- Show-through negative: a bias larger than the pair's depth gap (compute the clip offset from the formula below) must produce show-through pixels in every row with `testablePixels` above 0.
- Zero bias: measured and reported; it may pass or fail, and either result is recorded, not a control failure.

**World-space gap.** Record it per pose class for the chosen value: `gap ≈ δ·d²/(2·near)` for clip offset `δ` at distance `d`. This is why a clip or polygon offset suits this scene: the gap grows with `d²`, as depth resolution coarsens at the same rate, so close poses keep a negligible gap. For each pose class, the record compares the gap with the smallest depth gap two Bodies can have while overlapping on screen (about 10 units less the radii, on the committed artifact). It states that this margin comes from the committed solve, and a future solve with closer Bodies changes it.

**Choosing.** A value *passes* with zero lost pixels and zero show-through pixels at every pose and viewport, and no row lacking evidence. A pose where the own-marks control loses nothing cannot fail that test, so the record names it as no evidence rather than counting it toward the result. Choose at least twice the smallest passing value that also has its doubled value passing, so the choice sits inside a passing range rather than on its edge. If both mechanisms hold, choose the clip-space offset: its arithmetic is defined by the shader, whereas polygon units scale by an implementation-specific constant, and integrated graphics is the untested target. The fill needs a custom shader either way.

**Memlog line (shape).** `- (decision) MEASURED (<date>, story 7.1): the fill's depth bias is <mechanism> <value>; ... seen on <machine>, <GPU>, Chrome <version>, <n>-bit depth; this does not show the bias holds on integrated graphics (NFR-4); record: <path>.`

## Verification

**Commands:**
- `npm test` -- expected: 1775/1776, one environmental skip, as before this story.
- `npm run typecheck` -- expected: clean.
- `npm run gate` -- expected: passes.
- `npm run build` -- expected: succeeds; a search of `dist/` for `runSpike` and `depth-bias` finds nothing.
- `git status --short` -- expected: only `spikes/depth-bias/`, the record and its screenshots, the memlog, this spec, `epic-7-context.md`, `sprint-status.yaml` and `deferred-work.md`.

**Manual checks:**
- `window.runSpike()` returns the hardware renderer string, and the control runs (`runSpike` at a negative value, `runShowControl`) behave as stated.
- The saved screenshots show a grey disc inside each outline, with the core dot, Ring and Moon intact, wherever a Body is large enough to see; the record says where it is not.

## Suggested Review Order

**The result and how far it reaches**

- Start here: the value, three limits, and the fill conditions it depends on.
  [`depth-spike-7-1.md:1`](depth-spike-7-1.md#L1)

- The line 7.6 reads its value from.
  [`.memlog.md:100`](../planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/.memlog.md#L100)

- Why 1e-6: measured above, a judgement below.
  [`depth-spike-7-1.md:87`](depth-spike-7-1.md#L87)

- Poses where control lost is 0 cannot fail, so they aren't evidence.
  [`depth-spike-7-1.md:97`](depth-spike-7-1.md#L97)

- What the run does not show, including line flicker over a fill.
  [`depth-spike-7-1.md:193`](depth-spike-7-1.md#L193)

**The ruling**

- As written, every value failed; why Thomas amended the comparator.
  [`depth-spike-7-1.md:181`](depth-spike-7-1.md#L181)

- Own-marks comparator: M against C decides; A against B is reported only.
  [`harness.ts:428`](../../spikes/depth-bias/harness.ts#L428)

- The amended exclusion, with the stricter first version kept alongside it.
  [`harness.ts:375`](../../spikes/depth-bias/harness.ts#L375)

**The mechanism under test**

- Flattens the fill to the marks' plane, then offsets its depth.
  [`fill.tsx:19`](../../spikes/depth-bias/fill.tsx#L19)

- Fills draw before marks, so draw order may be resolving ties.
  [`fill.tsx:15`](../../spikes/depth-bias/fill.tsx#L15)

**Show-through and its controls**

- Counts testable pixels; front marks hidden on enlarged-disc rows.
  [`harness.ts:502`](../../spikes/depth-bias/harness.ts#L502)

- Enlarged disc: the only rows that set the upper limit.
  [`harness.ts:657`](../../spikes/depth-bias/harness.ts#L657)

- A silent row in the 1.5× control now ends the run.
  [`harness.ts:801`](../../spikes/depth-bias/harness.ts#L801)

- Measured control results, per row.
  [`depth-spike-7-1.md:141`](depth-spike-7-1.md#L141)

**Scene and run setup**

- Mounts shipped BodyField and MoonField with the shipped Canvas props.
  [`main.tsx:95`](../../spikes/depth-bias/main.tsx#L95)

- Pose matrix from the shipped camera models.
  [`harness.ts:235`](../../spikes/depth-bias/harness.ts#L235)

- Pass rule and evidence field for each value.
  [`harness.ts:760`](../../spikes/depth-bias/harness.ts#L760)

**Peripherals**

- Rerun steps, pass rule and raw-results index.
  [`README.md:38`](../../spikes/depth-bias/README.md#L38)

- Four follow-ups for later stories.
  [`deferred-work.md:1312`](deferred-work.md#L1312)

