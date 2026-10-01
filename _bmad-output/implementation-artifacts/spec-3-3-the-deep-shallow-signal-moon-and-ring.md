---
title: 'The Deep/Shallow signal — Moon and Ring'
type: 'feature'
created: '2026-10-01'
status: 'done'
review_loop_iteration: 0
baseline_commit: '0e5ad6424e1873f1342df02d3ffc8c788802e256'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `isDeep` reaches every Planet in the scene and is never drawn, so a visitor cannot tell which Projects carry a Notable without opening each one — the second clause of the M2 gate fails.

**Approach:** Draw two layered structural marks on every Deep Planet, at rest and always: a **Ring** (concentric `stroke-near` 0.7px hairline at 2.2 × body radius, in `body-field.tsx`) and a **Moon** (filled `stroke-active` dot, radius 0.27 × body radius floored at 2.4 CSS px per frame, centred 2 × body radius out, in a new `moon-field.tsx`). A pure `notable-model.ts` holds every rule; both read `isDeep` and nothing else.

## Boundaries & Constraints

**Always:** Marks depend on `body.isDeep === true` alone — never on band, mass, subject or navigation state, so every Deep Planet in a system shows both at once and at rest. Shallow Planets and Stars get neither. Outline step, colour, weight and radius stay exactly as 3.2 computes them for a Planet whatever its `isDeep`. Ring and Moon face the camera (`<Billboard>`), unlit, `transparent` at opacity 1; the Ring at `BODY_RENDER_ORDER`, the Moon at `MOON_RENDER_ORDER` (`BODY_RENDER_ORDER + 1`, so it always draws over its coplanar Ring). Colours via `strokeColor`, weight via `strokeWidthPx('hairline')`. Moon pixel floor: `max(0.27·r, 2.4 · worldPerPixel)` with `worldPerPixel = 2·depth / (P[5] · heightPx)`, `depth` the Planet's view-space depth (floor not applied when `depth ≤ 0`); applied as a mesh scale, the Moon's centre fixed.

**Ask First:** Any npm dependency. Any change to `bodyStroke`, `bodyRadius`, `sceneSubject`, click semantics, or the artifact schema.

**Never:** Hover, leader lines, labels or a focus outline (3.4); size, brightness, dash or opacity as the signal; a ring on anything but a Deep Planet; any text, caption or comment string saying a ring means it "opens"; a schema change or a type flag; reading `notable` or any `content` field.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Deep Planet | `isDeep: true`, r = 0.45 | one Ring r 0.99 `stroke-near` 0.7px; one Moon r 0.1215 `stroke-active` at 0.9 from centre | N/A |
| Shallow Planet | `isDeep: false` | no Ring, no Moon; outline identical to the Deep case | N/A |
| Star | `kind: 'star'` | no Ring, no Moon | N/A |
| Moon near | depth 15, P5 = 1/tan 25°, height 800 | scale 1 (≈ 6.9px > 2.4px) | N/A |
| Moon far / short view | world radius < 2.4px | scale = floor / world radius > 1 | N/A |
| Behind camera | depth ≤ 0, or non-finite input | scale 1 | N/A |
| Deep Planet is subject / Focused | `subject === planet.id` | outline white per 3.2; Ring and Moon unchanged | N/A |

</frozen-after-approval>

## Code Map

- `src/render-scene/stroke-model.ts:82,149,194,205` -- reuse `strokeColor`, `strokeWidthPx`, `bodyRadius`, `circlePoints`, `CIRCLE_SEGMENTS`, `LinePoint`. Do not edit its rules.
- `src/render-scene/scene-model.ts:181,254` -- `Body.isDeep` already carried from the artifact; `BODY_RENDER_ORDER`.
- `src/render-scene/body-field.tsx:58-73` -- Billboard per Body: add a `notableRings(body).map(...)` `<Line>` beside the outline.
- `src/render-scene/mote-field.tsx:65-70` -- the per-frame binding pattern to copy for `moon-field.tsx`: `useFrame(({ camera, size }) => …)`, `camera.updateMatrixWorld()`, pass `camera.matrixWorldInverse.elements`, `camera.projectionMatrix.elements`, `size.height`; refs per pooled mesh; an `apply*` helper tested over fakes.
- `src/render-scene/scene.tsx:183` -- mount `<MoonField bodies={bodies} />` once, inside the Canvas, after `<BodyField>`.
- `src/render-scene/scene-model.test.ts` -- `auditBodyField` :1045 (lines 2→3, renderOrders 3→4, allowed colour `ring.color`, ring `<Line>` from `notableRings(body)` inside the Billboard; add mutations); module path lists :804, :846, :1518, :2087 (add `NOTABLE_MODEL_TS`, `MOON_FIELD_TSX`); `auditDrawOrder` :1636 (accept the one `<MoonField>` mount); new `auditMoonField` + mutations modelled on `auditMoteField` :2401; directory coverage `known` :2609.
- `src/render-scene/stroke-model.test.ts:190,415` -- the reachable-state AC proof and purity-audit shape to reuse.
- `src/shell/index-model.ts:84` -- `DEPTH_LABELS` is the only shipped Deep/Shallow copy; must stay free of "open".
- `src/render-scene/README.md` -- module table rows and a "Deep/Shallow signal (3.3)" section.

## Tasks & Acceptance

**Execution:**
- [x] `src/render-scene/notable-model.ts` (+ `notable-model.test.ts`) -- pure: constants `RING_RADIUS_RATIO 2.2`, `MOON_RADIUS_RATIO 0.27`, `MOON_MIN_RADIUS_PX 2.4`, `MOON_OFFSET_RATIO 2`, `MOON_ANGLE`; `notableRings(body)` → `[]` or one `{ id, points, color, widthPx }`; `notableMoons(bodies)` → per Deep Planet `{ id, bodyId, position, center (billboard-local), radius, color }`; `moonScale(moon, viewElements, projectionElements, heightPx)`; `applyMoonScale(mesh, scale)`. Tests cover the I/O matrix, constants pinned to DESIGN.md values, a purity audit, and the signal-invariance proof below.
- [x] `src/render-scene/body-field.tsx` -- draw each `notableRings(body)` entry as a `<Line>` in the Body's Billboard.
- [x] `src/render-scene/moon-field.tsx` -- new binding: one positioned group + `<Billboard>` + `circleGeometry` mesh per `notableMoons(bodies)` entry; per frame, `moonScale` → `applyMoonScale`. No store read, no state.
- [x] `src/render-scene/scene.tsx` -- mount `<MoonField bodies={bodies} />`; docblock line.
- [x] `src/render-scene/scene-model.test.ts` -- the audit updates in the Code Map, plus a scan: no non-test source under `src/` holds a string literal matching both `ring` and `open` (case-insensitive).
- [x] `src/render-scene/README.md` -- module rows and the signal section.

**Acceptance Criteria:**
- Given every Planet of the committed artifact and every reachable subject, when `bodyStroke` and `bodyRadius` are evaluated with `isDeep` flipped, then results are identical; and `notableRings`/`notableMoons` are unchanged when `luminanceBand`, `mass` or the subject change.
- Given the committed artifact, when the marks are built, then exactly the `isDeep` Planets carry one Ring and one Moon, and no other Body carries either.
- Given the committed tree, when `npm test`, `npm run typecheck`, `npm run gate` run, then all pass.
- Given `npm run dev`, when the camera arrives at a Client stop holding a Deep Project, then its Ring and Moon are visible at rest with no interaction, and Shallow Planets show bare outlines.

### Review Findings

- [x] [Review][Decision] Moon render order deviates from the frozen Always clause — The frozen constraint says Ring and Moon draw at `BODY_RENDER_ORDER`; the Moon ships at `MOON_RENDER_ORDER = BODY_RENDER_ORDER + 1` (`notable-model.ts:61`, `moon-field.tsx:330`), and `auditMoonField` rejects `BODY_RENDER_ORDER` outright. Rationale (coplanar overlap would flicker under three's depth sort) is sound, but the frozen section was not renegotiated, so the spec contradicts itself. Resolved: keep `+1`; frozen clause amended by Thomas (2026-10-01).
- [x] [Review][Decision] "Ring opens" scan skips comments — The Never clause bans "any text, caption or comment string" saying a ring opens; the scan (`scene-model.test.ts` `stringLiterals`/`jsxTexts`) runs on `blankComments(source)` and its fixtures explicitly accept `// a ring never means it opens`. Nothing violates today; the question is whether "comment string" means source comments. Resolved: scope is shipped copy, not source comments; recorded in Design Notes (Thomas, 2026-10-01).
- [x] [Review][Patch] No test holds the Moon straddling the Ring [src/render-scene/notable-model.test.ts:465]
- [x] [Review][Patch] `ISDEEP_WRITE` misses `isDeep &&=` and an object-literal `isDeep: true|false` [src/render-scene/scene-model.test.ts:963]
- [x] [Review][Patch] Deferred click-target entry names the Ring only; the Moon is outside the hit sphere too [_bmad-output/implementation-artifacts/deferred-work.md:713]
- [x] [Review][Patch] Design Notes say the Moon "touches" the Ring; it straddles it (1.73–2.27 × r across 2.2 × r) [_bmad-output/implementation-artifacts/spec-3-3-the-deep-shallow-signal-moon-and-ring.md:81]

## Design Notes

Moon direction: a fixed billboard-local angle (`MOON_ANGLE = π/12`, up-right, as in the direction-03 mock) so it reads as one consistent mark, not noise. Centred at 2 × r with radius 0.27 × r, the Moon's disc spans 1.73–2.27 × r along its direction, so the 2.2 × r Ring runs through it, as in the mock (body 11, ring 24, moon at 24); held by `notable-model.test.ts`.

Pixel floor, from the column-major matrices three exposes: `zView = V[2]x + V[6]y + V[10]z + V[14]`, `depth = −zView`; `P[5] = 1/tan(fov/2)`; one CSS pixel spans `2·depth / (P[5]·heightPx)` world units at that depth.

"Comment string" in the Never clause means shipped, visitor-facing copy (string literals and JSX text), not source-code comments: the scan in `scene-model.test.ts` blanks comments deliberately, so a developer comment that restates the rule ("a ring never means it opens") does not trip it.

Ring at `stroke-near` on a recent Planet at band `stroke-near` is the same token — legal: the Ring is a structural channel, its distinctness is geometric (2.2 × r), never tonal.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate` -- all green.

**Manual checks:**
- `npm run dev`: scroll to the stop holding the Deep Project; Ring and Moon present; Shallow siblings bare; focus the Deep Planet — outline goes white, Ring and Moon stay; shrink the window height — the Moon never drops below ~2.4px.

## Suggested Review Order

**One input: `isDeep` decides both marks**

- Entry point: a Planet the artifact classified Deep — nothing else marks.
  [`notable-model.ts:64`](../../src/render-scene/notable-model.ts#L64)

- The AC proof: flipping `isDeep` changes no outline; band, mass, subject change no mark.
  [`notable-model.test.ts:314`](../../src/render-scene/notable-model.test.ts#L314)

- On the committed artifact, exactly the Deep Planets carry one Ring and one Moon.
  [`notable-model.test.ts:302`](../../src/render-scene/notable-model.test.ts#L302)

**The Ring**

- Concentric `stroke-near` hairline at 2.2 × r, built from the stroke model's circle.
  [`notable-model.ts:84`](../../src/render-scene/notable-model.ts#L84)

- Drawn inside the Body's billboard beside the outline, so it stays a true circle.
  [`body-field.tsx:70`](../../src/render-scene/body-field.tsx#L70)

**The Moon and its pixel floor**

- `stroke-active` dot, 0.27 × r, centred 2 × r out at a fixed up-right angle.
  [`notable-model.ts:117`](../../src/render-scene/notable-model.ts#L117)

- Floor from view depth and `P[5]`: scale up, never down; scale 1 when unmeasurable.
  [`notable-model.ts:151`](../../src/render-scene/notable-model.ts#L151)

- Proved through a real three camera: the scaled Moon projects to exactly 2.4px.
  [`notable-model.test.ts:222`](../../src/render-scene/notable-model.test.ts#L222)

- One above the Bodies' order, so the Moon always covers its coplanar Ring.
  [`notable-model.ts:61`](../../src/render-scene/notable-model.ts#L61)

- Binding: per frame, `moonScale` → `applyMoonScale`; no store, no state.
  [`moon-field.tsx:39`](../../src/render-scene/moon-field.tsx#L39)

- Mounted once in the Canvas, after the Bodies.
  [`scene.tsx:188`](../../src/render-scene/scene.tsx#L188)

**Enforcement**

- Moon binding audit: imports, mount, scale write, order, unlit transparent material.
  [`scene-model.test.ts:2711`](../../src/render-scene/scene-model.test.ts#L2711)

- Body binding audit widened to the Ring: third `<Line>`, fourth renderOrder.
  [`scene-model.test.ts:1070`](../../src/render-scene/scene-model.test.ts#L1070)

- No shipped string or JSX text says a ring "opens".
  [`scene-model.test.ts:2896`](../../src/render-scene/scene-model.test.ts#L2896)

- Depth is read, never assigned or defaulted — comparisons now allowed.
  [`scene-model.test.ts:842`](../../src/render-scene/scene-model.test.ts#L842)

**Peripherals**

- README: the signal's invariants and the real Ring/Moon geometry.
  [`README.md:53`](../../src/render-scene/README.md#L53)
