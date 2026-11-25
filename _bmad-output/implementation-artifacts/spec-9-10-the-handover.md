---
title: 'Story 9.10: The handover'
type: 'feature'
created: '2026-11-25'
status: 'done'
baseline_revision: 'd157b65d9482c15d79e54890d6a7042e1509716b'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred:
  - summary: >-
      The 2026-11-25 effects-scan allowance (`textShadow` in `client-label-model.ts`, AD-19) and the label restyle's ~500 B of `scene` have no memlog entry.
    evidence: |-
      Commit d157b65 amended AD-19 and DESIGN.md, but `.memlog.md` has no 2026-11-25 entry before 9.10's; AD-23 says a budget or allowance changes only by a ruling recorded in the memlog.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/.memlog.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** Every replaced stroke already falls on `1 - fade` (9.4, 9.6–9.9). But `body-field.tsx` and `moon-field.tsx` each read `lineWorkFade()` in their own `useFrame`, and both run before `<RealismMount>`'s, so they read the fade one frame late. While realism rises, the line-work and the layer are therefore one step apart, and when realism fails mid-fade there is one frame with neither the marks nor the realism layer (9.4's residual risk). That breaks AD-22 as amended ("together and whole", "on failure the line-work stays at its token values"). The 9.2, 9.6 and 9.8 reviews also deferred to 9.10 two spine readings, two fade-time artefacts and a naming drift.

**Approach:** Write the line-work's fade inside the mount's own frame callback, right after `owner.frame(...)`, from the same `owner.lineWorkFade()` read. Then the line-work and the layer change on the same frame, from the same value, and a failure that the owner catches in that frame returns the line-work whole on that frame. `body-field.tsx` and `moon-field.tsx` stop running a fade loop and register their held marks with the mount instead. Then rename the fade names to match their role, pin the crossfade with tests, and record how 9.10 resolves each deferred item.

## Boundaries & Constraints

**Always:**
- **One write per frame, in the mount.**
  - `realism-mount.tsx` keeps a module-scope set of line-work sources. A source is a thunk returning the currently held objects.
  - It exports `holdLineWork(source): () => void`, which adds the source and returns its remover, for a `useEffect` cleanup.
  - Its one `useFrame` calls `owner.frame(...)`, then `fadeLineWork(sources, owner.lineWorkFade())`.
  - `lineWorkFade` is no longer exported. Nothing else reads it.
- **`line-fade.ts`, pure:**
  - Renames: `StarMarks` becomes `ReplacedMarks`, and `fadeStarMarks` becomes `fadeMarks`. The behaviour of `fadeMarks` is unchanged: non-finite reads as 1, values are clamped to [0,1], `visible = value > 0`, every material's opacity is set, and a `null`/`undefined` handle is skipped.
  - New `fadeLineWork(sources, fade)`. It calls `fadeMarks(source(), fade)` for each source. A source that throws is skipped, and the others are still written, so the mount can never throw into R3F.
  - `holdBodyMarks` and `holdReplacedLine` are unchanged.
- **Bindings:**
  - `body-field.tsx`: no `useFrame`. Its maps are renamed to `bodyMarks` and `replacedLines` (both `useRef(new Map<string, ReplacedMarks>())`), and it has one `useEffect(() => holdLineWork(() => [...bodyMarks.current.values(), ...replacedLines.current.values()]), [])`.
  - `moon-field.tsx`: its `useFrame` keeps the camera update and the scale write only. It has one `useEffect(() => holdLineWork(() => meshes.current), [])`.
- **Unchanged in every session:**
  - The affordance (`affordance-field.tsx`), the leaders, the Client-name and Mote plates, the Mote orbits (`mote-field.tsx`) and the Dust (`scene.tsx`).
  - A source audit holds that `holdLineWork` is called only in `body-field.tsx` and `moon-field.tsx`, and that `line-fade.ts` is imported only by those two, the mount and its own test.
- **Audits:**
  - `auditBodyField`, `auditMoonField` and `auditRealismMount` (`MOUNT_LINES`) are rewritten to the new shape. Each changed allowance names itself in its doc ("9.10: the fade is written by the mount"), and its mutations are kept or inverted against the new text.
  - The render order, draw calls (still 24), luminance ceiling, achromatic, reduced motion, effects and bundle audits all pass unchanged.
- **Resolutions, recorded as dated 2026-11-25 notes on AD-22 (spine) and in the memlog:**
  - (a) **"As each arrives" and "together, whole".** Every replacement arrives on the one fade, so each stroke falls as its replacement rises, and all of them together. There is no per-Body arrival.
  - (b) **Failure after the crossfade starts.** The layer goes, and the line-work returns to 1 on that same frame.
  - (c) **Fills write no depth while the fade runs (AD-22 as ruled), so some realism shows through a nearer fill until the fade reaches 1.** This covers a far ring disc, a moon, the nebula, and a belt behind a sibling Planet. It is accepted for at most `FADE_SECONDS × pace` and left to 9.11 to judge.
  - (d) **The M2 Moon dot and the moon sphere share `MOON_RENDER_ORDER`**, which AD-19 as amended on 2026-11-18 ruled. Their sort may alternate while both are partly drawn. This is accepted under the same window and is 9.11's to judge, since changing the ruled order needs a ruling.

**Block If:**
- `realism` > 25,000 B or `scene` > 960,000 B after `npm run build` → HALT `blocked` (`budget exceeded`).

**Never:**
- A new draw, mesh, uniform, render-order step or token. Any change to `realism/` shaders, the arrival model, `FADE_SECONDS` or the depth rule.
- A rise or animation of the rim, which needs its own ruling. The instant rim switch against the Star's 0.6 s subject rise stays 9.11's.
- Touching First Paint, the Fallback, the preview, `mote-model*`, `mote-label.ts`, `markPx`, the affordance's leader and label, or the Client labels.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No layer / warming / warm draw | owner not `arrived` | every held mark at opacity 1, visible | No error expected |
| Rising | the layer's fade `f` after this frame's `owner.frame` | every held mark at `1 - f` on that same frame; `f + (1 - f) = 1` each frame | No error expected |
| Reduced motion | pace `REDUCED_MOTION_PACE` | same sum each frame, over the shorter fade | No error expected |
| Arrived | fade 1 | marks at 0, `visible = false` | No error expected |
| Fails mid-fade | layer frame throws at fade 0.4 | the owner fails and the marks are at 1 on that same frame | silent, no message |
| A source throws | one thunk throws | the others are still written | skipped silently |
| Unmounted field | cleanup ran | its source is no longer written | No error expected |

</intent-contract>

## Code Map

- `src/render-scene/line-fade.ts` (whole file, 78 lines): the renames and `fadeLineWork`. The doc block's "9.10 extends this path" becomes the shipped statement.
- `src/render-scene/realism-mount.tsx:53-73`: the owner binding, `lineWorkFade` (to remove) and the frame callback. The doc block at :27 ("read through this module's `lineWorkFade`") must be rewritten.
- `src/render-scene/realism-status.ts:180-186, 347-357`: `lineWorkFade()` on the owner. This stays as is: it already returns 1 after `fail()`, and `frame` catches and fails inside its own `try` before returning.
- `src/render-scene/body-field.tsx:30-72`: the doc (9.4's "reads the fade one frame late, which is accepted" is now false) and the `useFrame` to remove.
- `src/render-scene/moon-field.tsx:1-52`: the doc ("one frame late") and the fade call inside `useFrame`.
- `src/render-scene/realism/ring-layer.ts:22-25`: the "owned by 9.10" artefact note, rewritten to say they are accepted under AD-22 (2026-11-25) and 9.11's.
- `src/render-scene/scene-model.test.ts`:
  - `auditBodyField`: :1119-1440. `STAR_MARKS_FRAME` is at :1137, the import list at :1151-1157, the counts at :1182-1193, and the mutations at :1383-1398.
  - `auditMoonField`: :3964-4150. The import and count checks are at :4027-4029, and the mutations at :4143-4147.
- `src/render-scene/realism-status.test.ts`:
  - `MOUNT_LINES`: :955-982.
  - The mount mutations: :1043-1045 (line-work fade fixed, read off status, owner handed out). Replace them with mutations on the new frame write: dropped, fixed value, written before `owner.frame`, and a second set.
  - The `lineWorkFade` owner tests at :1219-1268 stay.
- `src/render-scene/line-fade.test.ts`: the imports at :14 and the renames throughout. Add the `fadeLineWork` cases.
- `src/render-scene/README.md` and `src/render-scene/realism/README.md`: the `line-fade.ts`, `body-field.tsx`, `moon-field.tsx` and `realism-mount.tsx` rows, and the "one frame late" statement.
- Records:
  - Spine AD-22, the 2026-11-25 note.
  - `.memlog.md` decision entry: `py _bmad/scripts/memlog.py append`.
  - `epic-9-context.md:56` ("written each frame by `body-field.tsx`") and `:92`.
  - `realism-done-7-10.md`: a note that the draws are unchanged at 24.
  - `src/colophon/credits.ts:33`: the APPEARANCE statement is re-verified against 9.8 and 9.9 as shipped. It needs no change, and the 9.5 deferral is closed.

## Tasks & Acceptance

**Execution:**
1. `line-fade.ts` and `line-fade.test.ts`, red first:
   - the renames;
   - `fadeLineWork`, including a throwing source, an empty set, and a source returning `null` handles;
   - a real-three case: Line2, Mesh and Group over two sources at 1, 0.4, 0 and NaN.
2. `realism-mount.tsx`:
   - the source set, `holdLineWork`, and the write after `owner.frame`;
   - `lineWorkFade` removed;
   - the doc rewritten.
3. `realism-status.test.ts`:
   - `MOUNT_LINES` and the mutations.
   - A new owner-level test with a fake layer, driven frame by frame at pace 1 and at `REDUCED_MOTION_PACE`. It checks that `layer.fade() + owner.lineWorkFade() === 1` after each `frame`.
   - A layer `frame` that throws at fade 0.4 makes the next `lineWorkFade()` read 1 with no further `frame` call.
4. `body-field.tsx`, `moon-field.tsx`, `auditBodyField` and `auditMoonField`:
   - the new shape and the named allowance;
   - mutations for: a fade loop re-added, the source dropped, no cleanup returned, one map left out, and a second `holdLineWork`.
5. `scene-model.test.ts`: the new `holdLineWork`/`line-fade.ts` caller audit, with its rejecting mutations.
6. `ring-layer.ts` note, both READMEs, spine AD-22 note (resolutions a–d), memlog entry, `epic-9-context.md`, `realism-done-7-10.md` note.
7. Append the closures to `deferred-work.md` under a "## Resolved by spec-9-10-the-handover.md (2026-11-25)" section, with resolution a–d per item. Add the 9.6 rename and the 9.5 Colophon re-verify.

**Acceptance Criteria:**
- Given realism is fading in, when any frame is drawn, then every replaced stroke's opacity is `1 - f`, where `f` is the fade value the layer draws on that same frame, at both paces.
- Given realism fails at any point, including mid-fade, when the owner catches it, then on that same frame every replaced stroke is at opacity 1 and visible, with no error and no message.
- Given any session, when the scene runs, then the affordance, leaders, plates, Mote orbits and Dust are drawn by code that never registers with or imports the fade.
- Given the committed artifact, when `npm run build` runs, then the gate passes, `addedDraws` is 24, `realism` ≤ 25,000 B and `scene` ≤ 960,000 B, and every audit passes, with each changed audit's doc naming its 9.10 allowance.

## Spec Change Log

## Review Triage Log

### 2026-11-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12 (high 0, medium 1, low 11)
- defer: 1 (high 0, medium 0, low 1)
- reject: 14 (high 0, medium 1, low 13)
- addressed_findings:
  - `[medium]` `[patch]` `fadeLineWork` skipped per source, but `body-field.tsx` hands one combined source, so one throwing mark left the rest stale. Each mark is now faded in its own `try`, and a test puts a throwing mark in the middle of a source.
  - `[low]` `[patch]` `auditLineWorkReach`'s doc claimed it rejects calls in tests. It is reworded to say it counts calls in shipped source only.
  - `[low]` `[patch]` `auditLineWorkReach`'s import detection was single-line. It now sees multi-line, side-effect, re-export and dynamic imports, with rejecting mutations.
  - `[low]` `[patch]` `LINE_FADE_IMPORTERS` still allowed `moon-field.tsx`. It is removed, and the README row and the memlog entry are corrected.
  - `[low]` `[patch]` The crossfade tests hard-coded the reduced-pace frame count and compared a float sum strictly.
    - Frame counts now derive from `FADE_SECONDS`.
    - The check is now `|lineWorkFade() − (1 − fade)| ≤ 1e-12`.
    - The tests moved to `realism/arrival-model.test.ts`, because the bundle assertion forbids `realism-status.test.ts` from importing `FADE_SECONDS`.
  - `[low]` `[patch]` The docs rested same-frame correctness on mount order. They now rest on two facts: the write follows `owner.frame` in the same callback, and opacity is read at render. The spine's tautological `f + (1 − f) = 1` line is replaced.
  - `[low]` `[patch]` Resolution (c) put the nebula under "fills write no depth". It is now split into the depth case and the nebula's blending case.
  - `[low]` `[patch]` `realism/README.md` still gave the artefacts to 9.10, and its "superseded" note was unclear. Both fixed.
  - `[low]` `[patch]` In `src/render-scene/README.md`, the `budgets.ts` row said 24,000 B and now says 25,000 B. The `body-field.tsx` row is back in story order.
  - `[low]` `[patch]` `epic-9-context.md` still asked 9.10 to look at the rim timing. That is now 9.11's, and the post-9.10 bytes are added.
  - `[low]` `[patch]` The audit doc named Client-name plates. It now names the Client-name halo and the Mote plates.
  - `[low]` `[patch]` The memlog's 9.10 entry was written and left uncommitted in this run, so it was corrected in place rather than by a second entry.

## Design Notes

**Why the mount writes, not a later frame priority.** R3F 9 runs `useFrame` callbacks in mount order within a priority. A positive priority takes over rendering. A negative one would make the mount run before the camera rig, and the layer's frame reads the camera the rig has just moved. So the mount keeps its place, last, and writes the line-work after the layer. The line-work's opacity is read only at render, which follows every callback, so writing it last is exactly in time.

```ts
useFrame(({ scene, camera, gl }, delta) => {
  const reduced = reducedMotion();
  owner.frame(drawn, BASE, { ... });
  fadeLineWork(lineWork, owner.lineWorkFade());
});
```

**Why (c) and (d) are accepted, not fixed.** AD-22 rules that fills write no depth during the fade, so nothing behind a half-faded fill vanishes early. AD-19 (2026-11-18) rules that the moon sphere shares `MOON_RENDER_ORDER`. Each artefact is bounded by the fade's ≤ 1 s and gone at `f = 1`. Fixing either would contradict a ruling, so 9.11 judges them on screen.

## Verification

**Commands:**
- `npm run typecheck` -- expected: clean.
- `npm test` -- expected: all pass.
- `npm run build` -- expected: the gate passes; record `realism` and `scene` bytes.

## Auto Run Result

**Summary.**
- The crossfade is now written in one place, the mount. `realism-mount.tsx` keeps a module-scope set of line-work sources (`holdLineWork`). Its one `useFrame` calls `owner.frame(...)`, then `fadeLineWork(lineWork, owner.lineWorkFade())`.
- Every replaced stroke is therefore at `1 − f`, for the `f` the layer draws on that same frame. A failure the owner catches mid-fade returns the strokes whole on that frame.
- This removes 9.4's one-frame-late read, and with it the one frame showing neither the marks nor the layer.
- `body-field.tsx` has no frame loop, and `moon-field.tsx`'s frame loop only scales. Both register their held marks with the mount.
- `StarMarks` and `fadeStarMarks` are renamed `ReplacedMarks` and `fadeMarks`.
- The 9.2, 9.5, 9.6 and 9.8 deferrals are resolved by (a)–(d) on AD-22 (2026-11-25). The fade-time artefacts are accepted for the length of the fade and left to 9.11.

**Files changed:**
- `src/render-scene/line-fade.ts`: the renames, `LineWorkSource`, and `fadeLineWork` (per mark, never throws).
- `src/render-scene/realism-mount.tsx`: the source set, `holdLineWork`, and the write after `owner.frame`. `lineWorkFade` is no longer exported.
- `src/render-scene/body-field.tsx`, `moon-field.tsx`: they register their marks instead of running the fade loop.
- `src/render-scene/realism-status.ts`, `realism/ring-layer.ts`: doc comments only.
- Tests:
  - `line-fade.test.ts`.
  - `realism-status.test.ts`: `MOUNT_LINES` and its mutations.
  - `realism/arrival-model.test.ts`: the crossfade at both paces, and failure at 0.4.
  - `scene-model.test.ts`: `auditBodyField`, `auditMoonField`, and the new `auditLineWorkReach`.
- Docs and records: both READMEs, the spine's AD-22 note, a memlog decision, `epic-9-context.md`, `realism-done-7-10.md` and `deferred-work.md`.

**Review findings.** 12 patches applied (medium 1, low 11), 1 deferred, 14 rejected. The rejections:
- The mount unmounting while the fields stay, or `owner.frame` throwing past its own `try`. Neither can happen: the mount is the Canvas's audited last child, and the owner catches every frame.
- Registration in `useEffect`. It always runs before arrival, which needs later frames and an async decode.
- No test running a real R3F frame loop. The `.tsx` bindings are held by exact source audits, which is the repo's practice.
- The "uniform rather than opacity" reading. The strokes take the same frame's value.
- The rest are cosmetic, or about how short the compiled context is.

**Follow-up review recommended: true.** Patched: high 0, medium 1, low 11. Score 3 × 1 + 11 = 14, which is 5 or more.

**Verification.**
- `npm run typecheck`: clean.
- `npm test`: 2,374 tests, 2,373 pass, 0 fail, 1 skipped (the existing symlink skip).
- `npm run build`: the gate passes.
  - `realism` is 24,786 of 25,000 B, unchanged.
  - `scene` is 958,632 of 960,000 B: +167 B over `d157b65`, leaving 1,368 B of headroom.
  - `addedDraws` is still 24.
- Matrix audit: every row is covered by a test that ran and passed.
  - `line-fade.test.ts`: the throwing source and the removed source.
  - `arrival-model.test.ts`: rising, reduced pace and the mid-fade failure.
  - `realism-status.test.ts`: no layer, warming and arrived.

**Residual risks:**
- Nothing has been checked on screen. The crossfade must be seen in 9.11 and 8.5.
- Artefacts during the fade, all bounded by the fade's length and 9.11's to judge:
  - a far ring disc, a moon or a belt behind a sibling Planet shows through a nearer fill, because fills write no depth;
  - the nebula shows through a half-faded fill, by blending;
  - the Moon dot and the moon sphere may alternate in sort order.
- Two looks stay 9.11's: the belt cut across a sibling Planet at full fade, and the instant rim switch against the Star's 0.6 s subject rise.
- `realism` has 214 B of headroom and `scene` 1,368 B.
