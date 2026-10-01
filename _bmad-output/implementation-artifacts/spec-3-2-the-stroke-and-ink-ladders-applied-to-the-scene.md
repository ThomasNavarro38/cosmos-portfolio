---
title: 'The stroke and ink ladders applied to the scene'
type: 'feature'
created: '2026-10-01'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'd6e060edd5b2cd4fb0be22e2118bf90edb287de4'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Bodies are lit, filled white spheres; `luminanceBand` reaches the renderer and is never drawn; orbits and the Rail are not drawn at all (and a connector ban forbids them). The scene reads as an untextured 3D model, not a deep-field plate.

**Approach:** Redraw the scene as line-art on the stroke ladder: camera-facing `fill: none` circle outlines, a core dot on Stars, orbit ellipses and the Rail as drei `Line` hairlines, a full-frame vignette, no lights. A pure model picks the one subject per frame that may be white. Derive emits each Project's orbit plane so orbits are drawn, not computed.

## Boundaries & Constraints

**Always:** Every scene line takes one of the five `stroke-*-dark` tokens and a weight from `components.stroke-weight`; every scene glyph takes an `ink-*-dark` token, never a stroke token, and vice versa. Planet resting stroke = its `luminanceBand` token; Star resting stroke = `stroke-rest`. Subject (white, `stroke-focus`): the Focused Planet if any, else the free-flight `flightTarget` Star, else on the Rail the Star of keyframe `clamp(ceil(scrollProgress), 1, stops)`; else none. At most one Body is white. Orbits `stroke-rest` 0.7px; Rail `stroke-dust` 0.7px, a curve through the stop Stars' centres. Body materials stay `transparent` at opacity 1 and after the Dust in draw order. Orbit planes come from the artifact (AD-3).

**Ask First:** Any npm dependency. Changing `scene-pick.ts` click semantics. Any Body geometry beyond circle, core dot, orbit and Rail.

**Never:** Moon, Ring (3.3); hover, leader lines, Body labels (3.4); Mote shape/tiering/size (3.5); panel or chrome ink (3.6–3.8); `stroke-active` on a Body. Shadows, glow, bloom, blur, scale or opacity animation on a Body, corner radius, lights. Literal colours.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Opening frame | rail, progress 0, no focus | first stop's Star white (0.9px); all else resting | N/A |
| Between stops | rail, progress 2.3 | stop 3's Star white | N/A |
| Focused | any mode, `focusedProjectId` set | that Planet white (1.0px); no Star white | N/A |
| Free flight | `flightTarget` set / null | that Star white / nothing white | N/A |
| Recent Shallow at rest | band `stroke-near` | `stroke-near`, never `stroke-focus` | N/A |
| One stop | rail with a single Star | no Rail line drawn | N/A |
| Bad artifact | Project without `orbitNormal`, non-unit normal, old `schemaVersion` | rejected | schema validation fails, gate exit 1 |
| Bad weight token | `stroke-weight` value not `<n>px` | parser throws naming the key | throw |

</frozen-after-approval>

## Code Map

- `src/derive/solve.ts:414-445` -- `solveOrbits`: slot angle `A`, inclination `I`. Orbit normal = `(sin I·cos A, −cos I, sin I·sin A)` (= e1 × e2, e1 toward the Planet, e2 = `(−sin A, 0, cos A)`).
- `src/derive/{entities,artifact,artifact-schema}.ts` -- carry `orbitNormal`; `SCHEMA_VERSION` 4→5 (`artifact-schema.ts:41`), unit-length refine; `generated/layout.generated.json` regenerated via `npm run solve`.
- `src/render-scene/scene-model.ts:113-177,241-248` -- `SceneArtifactProject`/`Body` gain `orbitNormal`; Planets carry `clientId`.
- `src/render-scene/rail-model.ts:570-600,797` -- `railPose`'s `catmullRom` over keyframe targets; reuse for the Rail line (stop keyframes only, keyframe 0 has `subject: null`).
- `src/shell/state.ts:133-179,210` -- `navigationStore` fields `mode`, `flightTarget`, `scrollProgress`, `focusedProjectId`.
- `src/render-scene/scene.tsx:186-256` -- drop lights and `bodies.map`; mount the new field. `auditRenderer` (`scene-model.test.ts:840`) forbids hooks here, so per-frame state lives in a bound component, like `mote-field.tsx:65`.
- `src/render-scene/scene-model.test.ts` -- `auditConnectors` :1067-1153 (narrow: drei `Line` only in the new field, fed only from named model functions); `auditDrawOrder` :1206-1377 (move to the new file); `auditSceneColours` :1389; light offset :1515 (delete); radius check :682; directory coverage :2173. Regex ban at :825 rejects names like `luminanceFor(`/`bandOf(`.
- `src/render-scene/mote-model.ts:116,382`, `mote-model.test.ts:1164` -- label colour onto `ink-prose-dark`.
- `src/tokens/tokens.ts` -- generated; `stroke-weight` values are strings (`'0.7px'`), deferred here by 3-1.
- `src/render-scene/README.md:28,39,51,53` -- invariants to rewrite.

## Tasks & Acceptance

**Execution:**
- [x] `src/derive/solve.ts`, `entities.ts`, `artifact.ts`, `artifact-schema.ts` (+ tests) -- emit unit `orbitNormal` per Project, bump schema to 5, regenerate the artifact -- orbit plane is a derived fact.
- [x] `src/render-scene/stroke-model.ts` (+ test) -- pure: `strokeWidthPx(key)` parser; `sceneSubject(nav, rail)`; `bodyStroke(body, subjectId)`; `circlePoints(n)`; `orbitPoints(planet, star, n)`; `vignetteStyle()` -- every ladder rule executable under `node --test`.
- [x] `src/render-scene/rail-model.ts` (+ test) -- `railLine(rail, samplesPerSegment)` through stop targets, `[]` under two stops.
- [x] `src/render-scene/body-field.tsx` -- new bound component: subscribes with a selector returning the subject ID; draws per Body a drei `Billboard` circle `Line` + Star core dot (`circleGeometry`, radius 0.15×), a `visible={false}` sphere hit target whose `onClick` is `activateBody`, the orbits and the Rail.
- [x] `src/render-scene/scene.tsx` -- remove lights and Body meshes; mount `<BodyField>`; wrap the canvas with the vignette overlay (`pointer-events: none`).
- [x] `src/render-scene/mote-model.ts` (+ test) -- `MOTE_LABEL_COLOR = ink-prose-dark`.
- [x] `src/render-scene/scene-model.test.ts` -- re-home and narrow the audits above; add: no `ink-*` on a line material, no `stroke-*` on a label style; `ink-quiet` referenced nowhere under `src/` outside `tokens/`; no `box-shadow|boxShadow|textShadow|drop-shadow|blur(|borderRadius|castShadow|shadows|bloom|glow|(ambient|directional|point|spot|hemisphere)Light` in code (comments stripped) under `src/render-scene`, `src/shell`.
- [x] `src/render-scene/README.md`, `src/derive/README.md` -- rewrite the connector, lighting and greybox paragraphs.

**Acceptance Criteria:**
- Given every reachable navigation state over the committed artifact, when `bodyStroke` is evaluated for every Body, then at most one returns `stroke-focus` and no Body other than the subject exceeds `stroke-near`.
- Given the committed tree, when `npm test`, `npm run typecheck`, `npm run gate` run, then all pass.
- Given `vignetteStyle()`, when read, then it is a radial gradient of `vignette-dark` at 0 opacity at 42% rising to 0.9 at 100%, written without `rgb(`/`hsl(`/`#`.
- Given `npm run dev`, when the opening frame renders, then Bodies are outline circles, exactly one Star is white with a filled core, orbits and the Rail are faint hairlines, corners darken, and clicking a Body still flies/focuses.

### Review Findings

- [x] [Review][Patch] Vignette overlay paints over Mote labels — raise labels to `zIndexRange={[1, 1]}` and the Focus panel to `zIndex: 2` (decided: fix now) [src/render-scene/mote-field.tsx:83]
- [x] [Review][Decision] Resting Star core dot is near-invisible — `coreDots` takes the outline colour, so a receded Star's core is `stroke-rest-dark` (#2C2C33) on `surface-base` (#08080A); DESIGN §6 says the core is what makes a Star read as emitting, but names a core fill only for the subject. Pick a resting core token, or accept outline-only receded Stars. — **Decided: accept outline-only resting Stars; confirm visually under AC4.**
- [x] [Review][Patch] Amend AC1 to "no Body other than the subject exceeds `stroke-near`" to match the I/O matrix (decided: amend) [spec AC1]
- [x] [Review][Patch] `RESTING_STEPS` mirrors derive's `RESTING_BANDS` with no pin; a derive-only band change passes every test and the gate, then throws in `bodyStroke` at render [src/render-scene/stroke-model.ts:46]
- [x] [Review][Patch] Gate cosine divides by radius only and uses the raw normal; `orbitPoints` normalises — a normal of length ≠ 1 can pass the gate and be refused by the renderer at the boundary [src/derive/artifact-schema.ts:225]
- [x] [Review][Patch] "under 1e-3 for any orbit radius above a tenth of a unit" is false (4-place rounding gives ~1.7e-4/r); `weight` is unbounded (`src/data/schema.ts:111`), so a large weight fails the gate with an opaque cosine/NaN message — correct the comment and give solve a named error for an orbit below solve precision [src/derive/artifact-schema.ts:69]
- [x] [Review][Patch] No positive audit that `scene.tsx` mounts the `aria-hidden` vignette inside a `position: 'relative'` wrapper — deleting it passes all tests [src/render-scene/scene.tsx:186]
- [x] [Review][Patch] Effects scan misses `receiveShadow`, `border-radius`, `text-shadow` [src/render-scene/scene-model.test.ts:1335]
- [x] [Review][Patch] `StrokeWeightKey` exported but unused; `strokeWidthPx(key: string)` lets a typo'd key through the type check [src/render-scene/stroke-model.ts:52]
- [x] [Review][Patch] "0.9 at the edge" is only true at the corners (`farthest-corner`) — reword docblock, README and test title [src/render-scene/stroke-model.ts:347]
- [x] [Review][Patch] Tests hard-code `1e-3` instead of importing `ORBIT_PLANE_TOLERANCE` [src/derive/solve.test.ts:565]

## Design Notes

Rail = Catmull-Rom through stop Stars' centres, as in the direction-03 mock, not the camera path (the camera rides that path, so it could never be seen).

Vignette: `radial-gradient(ellipse farthest-corner at 50% 50%, color-mix(in srgb, <vignette-dark> 0%, transparent) 42%, color-mix(in srgb, <vignette-dark> 90%, transparent) 100%)` -- `color-mix` keeps the literal-colour gate meaningful.

DESIGN.md §2 says `stroke-dust` is "not used for any Body", yet derive's `luminanceBand` emits `stroke-dust` for the oldest Projects and the epic AC binds the band to `stroke-dust … stroke-near`. Followed the AC; flagged for the 3.9 audit.

## Verification

**Commands:**
- `npm run solve` -- then a second run gives zero `git diff`.
- `npm test`, `npm run typecheck`, `npm run gate` -- all green.

**Manual checks:**
- `npm run dev`: scroll the Rail; the white moves Star to Star, never two at once; focus a Planet: it alone is white; release; free-flight to a Star.

## Suggested Review Order

**White is spent once: the subject**

- Entry point: one rule picks the single white Body — Focus, then flight target, then Rail stop.
  [`stroke-model.ts:120`](../../src/render-scene/stroke-model.ts#L120)

- Resting band vs camera-state overlay: data modulates only dust…near; white is state.
  [`stroke-model.ts:143`](../../src/render-scene/stroke-model.ts#L143)

- The AC proof: every reachable navigation state, at most one white, nothing unfocused above near.
  [`stroke-model.test.ts:186`](../../src/render-scene/stroke-model.test.ts#L186)

**Orbit planes: derived, not computed in the renderer**

- Normal emitted beside the solved position, from the slot's angle and inclination.
  [`solve.ts:452`](../../src/derive/solve.ts#L452)

- Schema v5: unit normal, and each Planet must lie in its own plane.
  [`artifact-schema.ts:216`](../../src/derive/artifact-schema.ts#L216)

- Orbit drawn in the emitted plane; rejects non-finite or off-plane normals.
  [`stroke-model.ts:238`](../../src/render-scene/stroke-model.ts#L238)

- Shared tolerance with the schema, pinned equal by a text-reading test.
  [`stroke-model.ts:288`](../../src/render-scene/stroke-model.ts#L288)

**Drawing: the bound line-art field**

- One selector subscription; re-renders only when the subject ID changes.
  [`body-field.tsx:41`](../../src/render-scene/body-field.tsx#L41)

- Invisible hit sphere keeps `activateBody` click semantics without drawing a sphere.
  [`body-field.tsx:74`](../../src/render-scene/body-field.tsx#L74)

- Orbits at stroke-rest, Rail at stroke-dust, all on the 0.7px hairline.
  [`stroke-model.ts:306`](../../src/render-scene/stroke-model.ts#L306)

- Rail through the stop Stars, not the camera path (which the camera could never see).
  [`rail-model.ts:481`](../../src/render-scene/rail-model.ts#L481)

- Lights and spheres gone; field and vignette mounted.
  [`scene.tsx:183`](../../src/render-scene/scene.tsx#L183)

- Vignette via `color-mix`, keeping the literal-colour gate meaningful.
  [`stroke-model.ts:354`](../../src/render-scene/stroke-model.ts#L354)

**Ink ladder**

- Mote label moves off a stroke token onto `ink-prose-dark` (same hex).
  [`mote-model.ts:125`](../../src/render-scene/mote-model.ts#L125)

**Enforcement and peripherals**

- Binding audit: subscription, Billboard, position, hit radius, keys, with mutations.
  [`scene-model.test.ts:1045`](../../src/render-scene/scene-model.test.ts#L1045)

- Stroke/ink crossover, `ink-quiet` on no glyph, no shadow/glow/blur/lights.
  [`scene-model.test.ts:1223`](../../src/render-scene/scene-model.test.ts#L1223)

- Connector ban narrowed: drei `Line` only in the field, fed by model functions.
  [`scene-model.test.ts:1486`](../../src/render-scene/scene-model.test.ts#L1486)

- Weight tokens parsed from `'<n>px'`, throwing on anything else.
  [`stroke-model.ts:59`](../../src/render-scene/stroke-model.ts#L59)

- Artifact carries the normal; scene type gains it.
  [`artifact.ts:47`](../../src/derive/artifact.ts#L47)
