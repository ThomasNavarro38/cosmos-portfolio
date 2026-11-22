---
title: 'The belt meets its Planet softly'
type: 'bugfix'
created: '2026-11-22'
status: 'done'
baseline_commit: '636e08e8aba2528c949a5c33985d79edafc0215d'
review_loop_iteration: 1
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A debris belt is depth-tested against its Planet's fill, and the fill writes depth as a flat camera-facing disc through the Planet's centre (`fill-shader.ts` flattens the sphere to z = 0). The belt's plane meets that disc's plane in a line, so the belt is cut straight across the Planet (Thomas, 2026-11-22).

**Approach:** The belt's fragment shader fades its alpha to 0 over the last `BELT_JUNCTION_SOFTNESS` before whichever it meets first: its Planet's sphere (the fill's radius) or the fill disc's plane. It does this only where the fragment lies over the fill disc's footprint. Nothing visible is ever depth-cut, and the near side still passes over its Planet, as ruled (AD-19, 9.6). The one remaining edge lies on the Planet's silhouette, where the belt passes behind its outline (Thomas, 2026-11-22). The `realism` budget is raised to 25,000 B by ruling (Thomas, 2026-11-22).

## Boundaries & Constraints

**Always:**
- Still one merged mesh and one draw (`BELT_DRAWS_BUDGET = 1`).
- Still static: no time uniform, no particles, no discard, `forceSinglePass`.
- The material declares only `uColor` and `uFade`.
- The radius is the fill's own, `FILL_RADIUS_RATIO * PLANET_RADIUS`, pinned by test.
- A pure JS mirror, `beltJunction`, computes the shader's factor and is tested, as `beltAlpha` is.

**Ask First:**
- Raising the budget beyond 25,000 B.
- Any change to the render order, the blending, the fill, or the ruled "near side passes over its Planet".

**Never:**
- No depth texture or extra pass.
- No change to the belt's width, profile, noise or colour.
- No fade against a sibling Planet (deferred).
- No story references in source comments.

## I/O & Edge-Case Matrix

The view-space camera is at the origin.

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Off the fill | The ray from the camera through the fragment meets the disc plane outside the fill's radius | Factor 1 | N/A |
| Well in front | Over the footprint, at least S before both the sphere's front surface and the disc plane | Factor 1 | N/A |
| At the junction | On the sphere's front surface, or on the disc plane | Factor 0, rising continuously to 1 over S | N/A |
| Behind the disc plane | Over the footprint, beyond the plane | Factor 0, also while the fills write no depth | N/A |
| Off-axis band | Over the footprint, but the ray misses the sphere | The plane term alone governs | N/A |
| Camera inside the sphere | The front hit is behind the camera | The plane term alone governs | N/A |
| Silhouette | Crossing the footprint's edge | The factor may step; the only edge, ruled to lie on the outline | N/A |
| Degenerate fragment | The fragment is at the camera, or the ray is parallel to the disc plane | Factor 1, never NaN | Guarded |

</frozen-after-approval>

## Code Map

- `src/render-scene/realism/fill-shader.ts:41-51` -- (read-only) `FILL_VERTEX_SHADER` flattens the sphere to a disc of `radius` at local z = 0. That disc is the depth the belt meets.
- `src/render-scene/realism/fill-layer.ts:150` -- (read-only) The disc radius is `FILL_RADIUS_RATIO * PLANET_RADIUS`, and the mesh takes the camera's quaternion each frame, so the disc plane is a constant view-z. The doc lines on the far-belt fade artefact need updating.
- `src/render-scene/realism/belt-model.ts`:
  - Add `planet: Point` to `BeltPlan`, from `project.position`.
  - Add a 3-per-vertex `planet` array to `beltArrays`.
  - Add `BELT_JUNCTION_SOFTNESS` (0.2) and `BELT_JUNCTION_RADIUS`.
  - Add `beltJunction(view, centre)` in view space.
- `src/render-scene/realism/belt-shader.ts`:
  - Vertex stage: `vView = (modelViewMatrix * vec4(position, 1)).xyz` and `vCentre` from `aPlanet` in the same way. Both are affine, so they interpolate exactly.
  - Fragment stage: multiply the alpha by `junction(vView, vCentre)`.
- `src/render-scene/realism/belt-layer.ts` -- Wire the `aPlanet` attribute, and add a doc sentence.
- `src/render-scene/realism/belt-model.test.ts`:
  - Line 303 pins the uniforms; keep it.
  - Line 296 pins `gl_FragColor`; update it.
  - The old `step(` ban must not match `smoothstep(`.
  - The runtime `createBelt` test is near line 540.
- `src/render-scene/realism/README.md` -- Update the `belt-model.ts` import (it now takes `FILL_RADIUS_RATIO` from `fill-model.ts`) and its row of exports.
- `src/render-scene/realism/budgets.ts:20`, `scripts/bundle-assertion.test.ts:223,224,254` -- Raise to 25,000. Derive the messages' figures from the constant.
- `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md` -- `scripts/nfr-2-record.test.ts` ties its budget table to `budgets.ts`, so it must change.
- Spine `ARCHITECTURE-SPINE.md:209` and its amendment note, the architecture `.memlog.md` (the ruling, with the measured bytes), and `epic-9-context.md:35,72` (the bytes, and the headroom left for 9.10, stated plainly).

## Tasks & Acceptance

**Execution:**
- [x] `belt-model.test.ts` -- Write the tests first and watch them fail:
  - every row of the edge-case matrix, through `beltJunction`;
  - each vertex's Planet centre in `beltArrays`;
  - `createBelt`'s `aPlanet` attribute (`itemSize` 3, the same values as `beltArrays`);
  - the shader pins, with the expected constants built from `glslFloat`.
- [x] `belt-model.ts`, `belt-shader.ts`, `belt-layer.ts` -- Implement the junction as the Design Notes give it.
- [x] `README.md`, `fill-layer.ts` doc -- Update for the new imports and exports, and the fade artefact. Keep the wrap width.
- [x] Budget: `budgets.ts`, `bundle-assertion.test.ts` and `nfr-2-record-8-3.md`.
- [x] Records: the spine, the memlog and `epic-9-context`. Record the ruling, the measured bytes and the headroom. Say that the belt's far side is hidden behind its own Planet at any fade.

**Acceptance Criteria:**
- Given realism has arrived, when a belt crosses its Planet, then no straight cut shows, and the near side still passes over the Planet.
- Given the change, when `npm test` and `npm run build` run, then both pass, `realism` is at or under 25,000 B, and the measured figure is in the memlog.

## Spec Change Log

- **Iteration 1 (2026-11-22, review)**
  - **Finding:** the edge-case hunter and the blind hunter found that the fill writes depth as a camera-facing disc, not a sphere. A sphere-only fade with a half-chord limb term left a short hard cut near the limb. On off-centre Planets, the cut came back wherever the disc plane lies in front of the sphere's surface. The far side also showed through within S of the limb, against what the docs claimed.
  - **Amended:**
    - Thomas ruled that the remaining edge lies on the silhouette.
    - The disc-plane term and the footprint test were added.
    - The half-chord term was removed.
    - Everything is now in view space, with the stable perpendicular-distance form for the ray-sphere test.
    - There is now a degenerate guard.
  - **KEEP:**
    - The `aPlanet` attribute carries each belt's Planet centre.
    - The uniforms stay `uColor` and `uFade` only.
    - The `\bstep\(` ban is narrowed so that `smoothstep(` passes.
    - The budget raise touches `budgets.ts`, `bundle-assertion.test.ts`, `nfr-2-record-8-3.md`, the spine, the memlog and `epic-9-context`.
    - The GLSL stays terse for bytes. The first attempt measured 24,978 B.
  - **Patches carried in:** a test that runs `createBelt`'s `aPlanet`; regexes built from `glslFloat`; budget figures derived from the constant; wrapped comments; plain headroom wording in `epic-9-context`.
- **Review round 2 (2026-11-22, patches only, no loopback):** the plane gap is measured along the ray, in the sphere gap's units. The `c.z >= 0` guard is added to the Design Notes. Over the footprint the ray always meets the sphere first, so the matrix's "Off-axis band" row cannot occur. The plane term governs only when the camera is inside the sphere. The test magic numbers are now derived from R and S, the GLSL `junction` is pinned as one block, and the NFR-2 limit cell holds only 25,000 B. Sibling Planets and the absolute softness are deferred (`deferred-work.md`).

## Design Notes

In view space, `v` is the fragment, `c` its Planet's centre, `R` the radius and `S` the softness. The camera is at the origin, looking down −z.

```
if (v.z >= 0 || c.z >= 0) return 1           // degenerate: fragment or Planet not in front of the camera
q = v.xy * (c.z / v.z) - c.xy                // where the ray meets the disc plane
if (dot(q, q) >= R*R) return 1               // off the fill: the silhouette edge
g = (v.z - c.z) * length(v) / -v.z           // the gap in front of the disc plane, along the ray
d = normalize(v); k = dot(c, d); p = c - k*d; h = R*R - dot(p, p)
if (h > 0 && k - sqrt(h) > 0) g = min(g, k - sqrt(h) - length(v))   // the gap in front of the sphere
return smoothstep(0, S, g)
```

## Verification

**Commands:**
- `npm test` -- expected: all pass.
- `npx tsc --noEmit` -- expected: clean.
- `npm run build` -- expected: the gate passes. Record `realism` and `scene`.

**Manual checks:**
- In the dev server, a belt crossing a Planet shows no straight cut. This is Thomas's on-screen check.

## Suggested Review Order

**The junction (the fix)**

- Entry point: the factor, over the fill's footprint, fading before the sphere or the disc plane.
  [`belt-shader.ts:66`](../../src/render-scene/realism/belt-shader.ts#L66)

- Applied once, to the alpha. The uniforms are unchanged.
  [`belt-shader.ts:83`](../../src/render-scene/realism/belt-shader.ts#L83)

- View space through `modelViewMatrix`, which is affine, so the varyings interpolate exactly.
  [`belt-shader.ts:39`](../../src/render-scene/realism/belt-shader.ts#L39)

- The JS mirror the tests exercise. It must match the GLSL line for line.
  [`belt-model.ts:207`](../../src/render-scene/realism/belt-model.ts#L207)

- The radius is the fill's own; the softness is a starting value.
  [`belt-model.ts:69`](../../src/render-scene/realism/belt-model.ts#L69)

**Carrying the Planet centre**

- Each plan takes its Planet's position, the same source as the fill mesh.
  [`belt-model.ts:132`](../../src/render-scene/realism/belt-model.ts#L132)

- Written once per vertex into the merged arrays.
  [`belt-model.ts:160`](../../src/render-scene/realism/belt-model.ts#L160)

- Wired as the `aPlanet` attribute. It is still one mesh and one draw.
  [`belt-layer.ts:54`](../../src/render-scene/realism/belt-layer.ts#L54)

**The budget ruling**

- `realism` is raised to 25,000 B; it measures 24,786 B.
  [`budgets.ts:21`](../../src/render-scene/realism/budgets.ts#L21)

- The ruling with the measured figures.
  [`.memlog.md:124`](../planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/.memlog.md#L124)

- The drift-guarded limit cell, which holds only the current figure.
  [`nfr-2-record-8-3.md:34`](nfr-2-record-8-3.md#L34)

**Tests**

- The matrix cases, derived from R and S.
  [`belt-model.test.ts:160`](../../src/render-scene/realism/belt-model.test.ts#L160)

- The GLSL `junction` pinned whole and in order.
  [`belt-model.test.ts:474`](../../src/render-scene/realism/belt-model.test.ts#L474)

- `createBelt` really builds `aPlanet`.
  [`belt-model.test.ts:603`](../../src/render-scene/realism/belt-model.test.ts#L603)

- The budget pin.
  [`bundle-assertion.test.ts:256`](../../scripts/bundle-assertion.test.ts#L256)
