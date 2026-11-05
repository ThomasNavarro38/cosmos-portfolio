---
title: "Story 7.6: Planets, lit by their own Star"
type: 'feature'
created: '2026-11-05'
status: 'done'
baseline_revision: '7921ec4dd0cdd06c823b90c916b7e536f9bb2a42'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/depth-spike-7-1.md'
warnings: ['oversized']
deferred:
  - summary: >-
      A shader failing to compile, or a map failing to upload, happens inside three's render and does not reach the owner, so `uploaded` and `shown` are set before anything has been drawn, and three logs a compile failure.
    evidence: |-
      drawLayer marks both in useFrame, before the render that uploads and compiles. Story 7.8's text owns upload failure and compileAsync, so the epic places it there.
    location: >-
      src/render-scene/realism-status.ts
    severity: medium
  - summary: >-
      All compiles and uploads land on one frame, inside frame-time sampling, until 7.8 adds the resets.
    evidence: |-
      resetFrameSampling is 7.8's by AD-22, and no framerate was measured. The branch does not merge before Epic 8.
    location: >-
      src/render-scene/realism-mount.tsx
    severity: low
  - summary: >-
      The context-loss AC's "no console line" is not met as written: three logs Context Lost and Context Restored itself. Thomas decides whether the AC means the site's own code.
    evidence: |-
      realism-fills-7-6.md, Context loss. The lines appear with or without realism, and leaving after a restore logs WebGL delete warnings in the baseline too.
    location: >-
      src/render-scene/realism/fill-layer.ts
    severity: low
  - summary: >-
      Show-through under real Rail motion has no evidence, because no Rail frame has a testable pixel while only Planets have fills.
    evidence: |-
      realism-fills-7-6.md: 0 testable pixels at both viewports, and the recorded pixels come from a staged pose. 7.7 should measure it once Stars draw.
    location: >-
      spikes/realism-fills/harness.ts
    severity: low
  - summary: >-
      A fill's tilt is about world x, while src/derive/appearance.ts documents it as about the Billboard's horizontal.
    evidence: |-
      mapFromWorld in fill-model.ts against appearance.ts:18. Settle the wording or the axis at the on-screen judgement in Epic 8.
    location: >-
      src/render-scene/realism/fill-model.ts
    severity: low
  - summary: >-
      What a Mote crossing a fill does, now that fills write depth, is unmeasured.
    evidence: |-
      realism-fills-7-6.md, Focus with Motes: 0 pixels differ outside the disc, at one held clock with no Mote over the disc.
    location: >-
      src/render-scene/mote-field.tsx
    severity: low
  - summary: >-
      The fill's seam and pole handling are unmeasured on screen.
    evidence: |-
      Source audits hold the text only.
    location: >-
      src/render-scene/realism/fill-shader.ts
    severity: low
  - summary: >-
      Every Planet reads as a half-disc at every stop and Focus, since the light's in-plane share is 0.995 or 1 at all of them.
    evidence: |-
      realism-fills-7-6.md, Lit by its own Star. This follows from the solve and the Shots, for Thomas's on-screen judgement in Epic 8.
    location: >-
      src/render-scene/realism/fill-model.ts
    severity: low
  - summary: >-
      Firefox and Safari have not run the fills, and no story owns that run; a browser ignoring imageOrientation 'flipY' would turn every map upside down with nothing to detect it.
    evidence: |-
      Every browser check ran in Chrome on the dev machine. No epic story names another browser.
    location: >-
      src/render-scene/realism/decode-maps.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** The maps decode and nothing draws with them. A Planet has no surface, so the scene is still schematic once realism has arrived.

**Approach:** Add one fill per Planet from the `realism` chunk: a shared sphere flattened to a disc under the outline, sampling its map through a spinning, tilted normal and lit by one world-space direction toward its own Star, plus the ambient floor. Fills appear at once when the maps have decoded; 7.8 adds warm-up and the fade, and 7.7 does Stars.

## Boundaries & Constraints

**Always:**
- The fill uses the 7.1 mechanism exactly: `vec4(position.xy * radius, 0, 1)` through `modelViewMatrix`, `gl_Position.z += 1e-6 * gl_Position.w`, render order `FILL_RENDER_ORDER`, transparent pass, opacity 1, `depthWrite` and `depthTest` on, `FrontSide`.
- One shared `SphereGeometry(1, 64, 32)`, exported as constants and budgeted; 1 added draw per Planet, 0 per Star and Dust in this story.
- The mesh takes the camera's world quaternion each frame, which is what drei's `Billboard` computes, so the disc lies in the marks' plane at every pose.
- The light is one world-space unit vector from a Planet to its own Star, from solved positions in a pure model; it never moves. Spin and tilt move only the map.
- `reducedMotion()` is read once per frame by the binding and handed to the pure model. Spin holds while it is true and does not use `motionPace`.
- The map's `colorSpace` is `SRGBColorSpace` and the fragment includes `<colorspace_fragment>`. Nothing is tone-mapped: `flat` stays.
- The material normalises to `appearance.meanLuminance`. At rest no fragment's luminance exceeds the ceiling, a shader constant pinned by a test against `stroke-active-dark`.
- Any failure in building, attaching or updating the layer ends in `markFailed`, removes the fills and leaves the schematic scene with its frame loop alive. Nothing is thrown, logged or retried.
- A later `<Canvas>` builds the layer again from the held images, with no network. Images are never closed.
- `realism-mount.tsx` stays the only shipped importer of `./realism/`, and everything testable stays out of it.

**Block If:**
- A test can only pass by changing an M2 audit beyond AD-19's named allowances: HALT `blocked` with `audit change outside AD-19's allowances`. The eight allowances are in AD-19; the eighth, ratified by Thomas on 2026-11-05, is `realism-mount.tsx` as a `reader` in `PREFERENCE_ROLES`, and this story makes that change.
- `scene` exceeds 960,000 or `realism` exceeds 24,000: HALT `blocked` with `realism budget exceeded`.
- A real browser cannot run WebGL here: HALT `blocked` with `no real browser for the fill check`.
- A mark is lost on a real fill with the final ratio at the recheck's poses, and no ratio below 1 clears it: HALT `blocked` with `own marks lost on real fills`, since the depth mechanism is a measured ruling.

**Never:**
- Draw a Star's fill or a glow (7.7); call `initTexture`, `compileAsync` or `resetFrameSampling`, or add a fade (7.8); change label ink, position or plates (7.9).
- Use a composer, render target, shadow map or scene light; use `lazy`, `use`, `useLoader` or `useTexture`.
- Change `body-field.tsx`, `moon-field.tsx`, `scene-model.ts`, hit spheres, `destinations`, raycasting, the camera, Rail, Focus or Mote models, `public/preview.png`, `career.json` or the artifact. Add a dependency.
- Import `src/derive/` from the chunk. Read `luminanceBand`, `mass`, `isDeep`, `moteTier` or any data-derived property to shade a fill.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Before decode | status `idle` or `fetching` | no fill in the scene; frames match M2 | n/a |
| Maps decoded | first frame at `decoded` | one fill per Planet that same frame; `markUploaded`, then `markShown` | n/a |
| Decode failed | status `failed` | no layer built; schematic scene | silent |
| Build throws | a shader, texture or port throws | `failed`, nothing added or everything removed | silent |
| Frame throws | an update throws | `failed`, fills removed, loop alive | silent |
| New Canvas | status `shown`, `uploaded` false | a new layer from held images, no fade, no request | n/a |
| Canvas gone | unmount | layer's materials and textures disposed, shared geometry too; images kept | silent |
| Context restored | lost, then restored under one Canvas | three re-uploads from the kept images on the next draw; `uploaded` stays true | n/a |
| Reduced motion on | `reduced` true | spin clock holds where it is; light unchanged | n/a |
| Reduced motion off | `reduced` back to false | spin resumes from where it held, with no jump | n/a |
| Planet at its Star | zero vector to the Star | model throws, so the build fails silently | `failed` |
| Unknown Star | a Project's `clientId` names no Client | model throws, so the build fails silently | `failed` |
| Unknown map | `appearance.map` not in the images | model throws, so the build fails silently | `failed` |

</intent-contract>

## Code Map

- `src/render-scene/realism-mount.tsx:29` -- gains the frame and unmount wiring and the one `reducedMotion()` read; its whole source is pinned by `MOUNT_LINES` in `realism-status.test.ts:328`, a 7.5 audit that this story updates.
- `src/render-scene/realism-status.ts:46` -- `RealismChunk` gains the layer builder; `markUploaded`, `markShown`, `markFailed` get their first shipped caller. `RealismArtifact:37` widens structurally to `position`, `id` and `appearance`.
- `src/render-scene/scene-model.test.ts:4118` -- `PREFERENCE_ROLES`, a closed M2 table, gains exactly one row, `'src/render-scene/realism-mount.tsx': 'reader'`, with a comment naming AD-19's eighth allowance. `:4144`, `preferenceReaders`, and its mutation rows do not change. `src/shell/motion-preference.ts:25`, the header's list of readers, gains the realism mount.
- `src/render-scene/scene-model.ts:388` -- `FILL_RENDER_ORDER`; `scene-model.test.ts:1578` admits exactly `mesh.renderOrder = FILL_RENDER_ORDER;`.
- `src/render-scene/stroke-model.ts:210` -- `bodyRadius`, the outline radius; `:201`, `CIRCLE_SEGMENTS` 64, which matches the sphere's 64-gon silhouette at z = 0.
- `spikes/depth-bias/fill.tsx:19` -- the vertex shader to reuse; no `<colorspace_fragment>` there, which this story adds.
- `src/render-scene/realism/decode-maps.ts:30` -- maps arrive flipped by `imageOrientation`, so the texture sets `flipY = false`.
- `src/render-scene/realism/map-urls.test.ts:50` -- the facade audit, "`decodeMaps` and nothing else"; `:105`, the directory's file list. Both widen for the new modules.
- `src/render-scene/moon-field.tsx:39` -- the frame-loop pattern: `camera.updateMatrixWorld()`, then write. The mount is last, so the rig has already moved the camera.
- `src/render-scene/scene-model.test.ts:1464` -- `EFFECTS`: the chunk must not contain `shadows`, `glow` or `*Light` in code; `ambient-floor` as a token name passes.
- `src/identity-audit.test.ts:896` -- `realism-*` tokens are read only by `realism/`.
- `generated/layout.generated.json` -- moon 5, io 2, mars 1 across 8 Planets; `src/derive/appearance.ts:18,:22`, tilt in radians about the Billboard's horizontal, spin in radians per second.
- `_bmad-output/implementation-artifacts/deferred-work.md:1315,:1319,:1324,:1379` -- what 7.1 and 7.5 left to this story.

## Tasks & Acceptance

**Execution:**
- `src/render-scene/realism/fill-model.test.ts`, `src/render-scene/realism-status.test.ts`, `src/render-scene/scene-model.test.ts` (the one `PREFERENCE_ROLES` row, and nothing else in that file) -- red first: the matrix, the pins and the source audits, seen failing against missing code.
- `src/render-scene/realism/fill-model.ts` -- pure, imports types only: `FILL_RADIUS_RATIO`, `FILL_SPHERE_WIDTH_SEGMENTS`, `FILL_SPHERE_HEIGHT_SEGMENTS`, `FILL_CLIP_OFFSET`, `lightDirection(planet, star)`, `fillPlans(artifact)`, `nextSpinSeconds(seconds, delta, reduced)`, `spinAngle(phase, rate, seconds)`, `addedDraws(planets)`, ceiling and target constants.
- `src/render-scene/realism/fill-shader.ts` -- vertex and fragment source, with the ceiling written in from the model's constant.
- `src/render-scene/realism/fill-layer.ts` -- builds one `Mesh` per plan over one geometry and one texture per map; `attach(scene)`, `frame(camera, delta, reduced)`, `dispose()`.
- `src/render-scene/realism/index.ts` -- re-exports `decodeMaps` and `createFillLayer`, and never `budgets.ts`.
- `src/render-scene/realism-status.ts` -- `chunk()` and `frame` take a draw port; layer lifetime per Canvas; every error to `fail`, which disposes.
- `src/render-scene/realism-mount.tsx` -- `useFrame(({ scene, camera }, delta) => owner.frame(artifact, BASE, { scene, camera, delta, reduced: reducedMotion() }))`, and the effect's cleanup leaving the Canvas.
- `src/render-scene/realism/budgets.ts` -- `SPHERE_WIDTH_SEGMENTS_BUDGET = 64`, `SPHERE_HEIGHT_SEGMENTS_BUDGET = 32`, `PLANET_DRAWS_BUDGET = 1`.
- `src/render-scene/scene.tsx`, `src/shell/scene-host.tsx` -- the artifact's prop type and the header paragraph only; the mount line is unchanged.
- `spikes/realism-fills/` -- a harness over the shipped models for the recheck, and `_bmad-output/implementation-artifacts/realism-fills-7-6.md`, the record.
- `src/render-scene/README.md`, `src/render-scene/realism/README.md`, `_bmad-output/implementation-artifacts/deferred-work.md` -- the layer, its rules, and each deferred item closed or passed on.

**Acceptance Criteria:**
- Given the model, when pinned, then `0 < FILL_RADIUS_RATIO < 1` against `bodyRadius`, the segments are within budget, and `FILL_CLIP_OFFSET` is exactly `1e-6`; given the shader source, the flattening and the bias appear as written and mutation rows for relief, a changed offset and a removed `<colorspace_fragment>` fail.
- Given a real build in a real browser at 1920×1080 and 390×844, when each Planet is drawn, then its fill's read-back edge is a circle concentric with the outline at a stop, at Focus and on the Rail.
- Given the same build, when `sceneSubject` and Focus states are drawn with the final ratio, then no own mark is lost, with a Ring and a Moon at their closest at both viewports and a control showing each pose can fail. This discharges the 2026-11-05 ruling.
- Given the same build, when the Rail moves, then show-through under real camera motion and flicker where an orbit or the Rail crosses a fill are measured and recorded, whatever they show.
- Given two Clients, when one Planet's light is computed, then it points to its own Star alone, and is unchanged by time, spin, camera or reduced motion; given the source, there is no per-frame write to it and no second light.
- Given a fill at rest, when real pixels are read over every Planet at every Client stop and Focus, then none exceeds `stroke-active`'s luminance; given the shader, the ceiling equals that token's linear luminance by a test.
- Given `reduced` true, when frames pass, then the model's spin angle is constant; at full motion it equals `phase + rate × seconds`; given the source, `motionPace` is absent from `realism/`.
- Given the source scan over `realism/` and the mount, then `luminanceBand`, `mass`, `isDeep`, `moteTier` are absent, `appearance.meanLuminance` is read by name, and there is no composer, render target, shadow map or scene light, each with a mutation row.
- Given `addedDraws`, when counted, then Planets × 1 and no Star; a source audit ties `fill-layer.ts` to one `Mesh` per plan and one `SphereGeometry`, with a row for a second draw.
- Given a real browser, when `map-404`, `map-corrupt` and `chunk-404` are served, then the frames match the baseline and Rail input moves them, as in 7.5; and a click on a Planet behind a fill still enters Focus.
- Given `WEBGL_lose_context`, when the context is lost and restored under one Canvas, then the fills return with no request and no console line.
- Given the shipped app, then `git diff` over `body-field.tsx`, `moon-field.tsx`, `first-paint.test.ts`, `first-frame-mark.tsx`, `public/preview.png`, `career.json` and the artifact is empty, and the chunk budgets hold.

## Spec Change Log

### 2026-11-05 — Blocked in planning, resumed on Thomas's ruling
- **Trigger:** the story needs the binding to read `reducedMotion()`, and `PREFERENCE_ROLES` is a closed M2 table outside AD-19's seven allowances, so planning halted with `audit change outside AD-19's allowances`.
- **Amended:** Thomas ratified an eighth allowance, recorded in the memlog, AD-19, AR-M3-3, the 7.10 list and `epic-7-context.md`. The Block If line, Code Map and task now state it.
- **Avoids:** a second `matchMedia`, or a renamed re-export, reading the preference around the audit.
- **KEEP:** `realism-mount.tsx` is the one added reader. No file under `realism/` names the preference; the pure model takes `reduced` as an argument. `realism/` is not a `model` role, because it never uses `motionPace`.

## Review Triage Log

### 2026-11-05 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 18 (high 0, medium 6, low 12)
- defer: 9 (high 0, medium 1, low 8)
- reject: 14 (high 0, medium 0, low 14)
- addressed_findings:
  - `[medium]` `[patch]` Nothing rendered showed the lit side faces the Star; harness rows now compare the two halves of each disc, with a negated-light control: toward brighter in 32 of 32 rows, and all 32 flip.
  - `[medium]` `[patch]` The shader audit skipped map sampling and normalisation; rows with mutations now hold them, source-only and saying so.
  - `[medium]` `[patch]` Layer tests used one appearance for every Planet; a varied fixture now asserts each mesh's uniforms and map, and the ambient floor's value.
  - `[medium]` `[patch]` 5 of 6 approached rows hovered an off-screen Planet; they now use an on-screen Planet of the stop's Client, and throw otherwise.
  - `[medium]` `[patch]` Fills write depth and nothing showed Motes and Dust survive; a Focus frame with Motes, Dust and the rig differs from the baseline by 0 pixels outside the disc.
  - `[medium]` `[patch]` `results/run.json` did not come from the committed harness; it was rerun on the final code, with raw ratio files, production tables rerun and the tree identified by a diff hash.
  - `[low]` `[patch]` Owner: `enterCanvas` no longer releases the layer, so a frame before its effect builds once.
  - `[low]` `[patch]` Model: `FILL_RADIUS_RATIO` pinned at 0.995, `fillPlans` throws on non-finite values, `FILL_NEAR_CEILING` moved beside the ceiling, the exact pole guarded (4 findings).
  - `[low]` `[patch]` Tests: a cull-bound row, the committed-artifact test checks direction and Bodies, and two hollow titles fixed (3 findings).
  - `[low]` `[patch]` Docs: overclaims on shader and upload failure corrected, and drifted comments fixed (2 findings).
  - `[low]` `[patch]` Harness: guards, the radius achieved after the clamp, flicker positive controls, and the record's headings, Result section and `summarize.mjs` corrected; the trusted click traced why the earlier dispatch missed (2 findings).

## Design Notes

**The fragment.** With `xy` the flat disc coordinate, the exact sphere normal is `n = vec3(xy, sqrt(1 - dot(xy, xy)))`, not an interpolated vertex, so 64×32 facets do not show. `mat3(modelMatrix) * n` gives the world normal, which turns with the camera's view of the sphere and not with the billboard's own spin. The lit term is `max(dot(N, L), 0)`. The map coordinate is `N` through the inverse of the tilt and spin rotation, then longitude and latitude. Longitude is computed per fragment, so the seam needs the two-candidate `fwidth` choice, with `RepeatWrapping` on S, to avoid a one-pixel mip line.

```glsl
vec3 albedo = texture2D(uMap, uv).rgb * (FILL_TARGET_LUMINANCE / uMeanLuminance);
vec3 lit = albedo * max(dot(N, uLight), 0.0) + uAmbient;
float y = dot(lit, vec3(0.2126, 0.7152, 0.0722));
gl_FragColor = vec4(y > CEILING ? lit * (CEILING / y) : lit, 1.0);
#include <colorspace_fragment>
```

The ceiling is on luminance, so a saturated pixel may carry one channel above the token's. `FILL_TARGET_LUMINANCE` is a starting value for Epic 8.

**Why the layer is imperative.** The chunk holds no `.tsx` and the mount renders `null`, so nothing under the Canvas can suspend. `scene.add` adds to R3F's scene without React. R3F raycasts only objects with handlers, so fills cannot take a click from a hit sphere. The owner stays import-free: it holds the layer behind a port typed in `realism-status.ts`.

**Context loss, deferred from 7.5.** Three prevents the default on `webglcontextlost` and rebuilds its properties on restore, so a texture re-uploads on its next use from the kept `ImageBitmap`. So a restore neither resets `uploaded` nor fails the document in this story, which the browser check must confirm. 7.8 adds explicit `initTexture` and must revisit this.

**Colour encodes nothing.** Rendezvous hashing picks the map from the ID, so `meanLuminance` describes a map. Lit side and dark side follow solved positions, as Dust does, and are composition rather than a data mapping (AD-3, AD-20).

## Verification

**Commands:**
- `npm test` -- expected: all pass, the one environmental skip as before, count above 1935.
- `npm run typecheck` -- expected: clean.
- `npm run gate` -- expected: passes.
- `npm run build` -- expected: succeeds, printing both realism byte counts, with `scene` within 960,000 from 8,648 bytes of headroom.

**Manual checks:**
- Drive a production build in a real browser per the Acceptance Criteria, recording pixels, requests and console lines in `realism-fills-7-6.md`. Say which runs are this machine only: it is not the target profile, and no framerate is measured.

## Auto Run Result

Status: done

**Summary.** Each Planet now has a fill from the `realism` chunk, on the first frame after its maps decode: one shared sphere flattened under the outline by the 7.1 mechanism at ratio 0.995, sampling its map through a tilted, spinning rotation, lit by one world-space direction toward its own Star plus the ambient floor, normalised to `appearance.meanLuminance` and held under the `stroke-active` luminance ceiling. Spin holds under reduced motion. The realism layer reaches the scene through `realism-mount.tsx` alone. By Thomas's ruling of 2026-11-05, AD-19's allowances grew to eight, for that mount's one `reducedMotion()` read. Stars, glow, warm-up and the fade are still to come (7.7, 7.8).

**Files changed.**
- `src/render-scene/realism/fill-model.ts`, `fill-shader.ts`, `fill-layer.ts`, `fill-model.test.ts` -- the model, shader, layer and their tests and audits.
- `src/render-scene/realism-status.ts`, `realism-status.test.ts` -- the owner builds and removes the layer, per Canvas and scene.
- `src/render-scene/realism-mount.tsx` -- the frame wiring, leaving a Canvas, and the one preference read.
- `src/render-scene/realism/index.ts`, `budgets.ts`, `map-urls.test.ts`, `decode-maps.test.ts` -- the facade, three budgets and the audits that follow.
- `src/render-scene/scene.tsx`, `src/shell/scene-host.tsx`, `src/shell/motion-preference.ts` -- the artifact type, headers and list of readers.
- `src/render-scene/scene-model.test.ts` -- the one ruled `PREFERENCE_ROLES` row and its comment, and nothing else.
- `scripts/bundle-assertion.test.ts` -- a 7.5 reach audit admits `spikes/realism-fills/main.tsx` importing the facade, with rejection rows. The spec did not list this; the harness needs it.
- `src/render-scene/README.md`, `src/render-scene/realism/README.md` -- the layer and its rules.
- `spikes/realism-fills/`, `realism-fills-7-6.md` -- the recheck harness, its results and the record.
- `ARCHITECTURE-SPINE.md`, `.memlog.md`, `epics.md`, `epic-7-context.md` -- the ruling.
- `deferred-work.md`, `sprint-status.yaml` -- deferrals, closures and tracking.

**Review.** 18 patches applied, 9 deferred, 14 rejected. Follow-up review recommended: **true**. Patched: 0 high, 6 medium, 12 low; score 3 × 6 + 12 = 30, at or above 5.

**Verification, re-run by the orchestrator after the patches.** `npm test` 1986 tests, 1985 pass, 0 fail, the one environmental skip. `npm run typecheck`, `npm run gate` and `npm run build` pass; the build prints entry 3,278 of 4,000, `realism` 4,440 of 24,000 and `scene` 952,040 of 960,000. The frozen files show no diff. Matrix audit: each row has a test that ran and passed.

**Browser, by the implementer in Chrome on the dev machine (`realism-fills-7-6.md`), on the final code.**
- Toward the Star is brighter in 32 of 32 rows, and all flip when the light is negated.
- 0 own marks lost in every pose at both viewports, each pose with a control that can fail.
- 0 pixels over the ceiling, peak 0.46657 and 0.42863 against 0.47119.
- `map-404`, `map-corrupt` and `chunk-404` differ from the baseline by 0 pixels; wheel input moves them.
- A Focus frame with Motes, Dust and the rig differs by 0 pixels outside the disc.
- A remount in the same page and a context restore give 0 pixels and no request; held spin gives 0 pixels; a trusted click enters Focus.

**Residual risks.**
- **An AC is not met as written.** Context loss logs three's two console lines, in the baseline too. Thomas decides whether the AC means the site's own code. The WebGL delete warnings after leaving a restored context were not rerun on the final build.
- **One intermittent test crash.** Before the review patches, 1 of 5 `npm test` runs failed when a child process exited with `0xC0000409` where a test expected 1. Only the end of that output was kept, so the test is not identified. The other four runs and the final run passed. It was not investigated.
- **Shader evidence is one manual run.** CI compiles no shader, so the audits read source only. A shader or upload failure inside render does not reach the owner until 7.8.
- **Own-marks evidence is thin for two marks.** A Ring never reaches its own fill at any sampled pose, and a Moon only with the Planet a few pixels across.
- **Flicker has no verdict.** Rail 29 and 33 pixels against a control of 103 and 89, so that measure sees little; held at Focus, 0 and 2 against 1,192 and 1,036. No threshold says what is acceptable.
- **Not run.** Other GPUs including the target profile, Firefox, Safari and framerate. The look is unjudged, and every Planet reads as a half-disc at every stop and Focus.
- **Accepted without a fix.** Spin's clock restarts with each layer, so a surface returns to its emitted phase on coming back to the scene; and a long frame gap turns the map by that gap. One remount capture across two contexts differed by 430 pixels in the DOM header text, 0 in the disc, and was not traced.
- **Tests were red first only in part.** The implementer's report does not establish red-first for every row, and this run did not check it.
- **Maps still download with no credit.** This branch must not merge before Epic 8.
- **Review delivery.** Reviewers read the diff from a scratch file, with `epic-7-context.md` and this spec excluded. Subagents ran in the background because this platform launches them so; each was awaited before going on.
