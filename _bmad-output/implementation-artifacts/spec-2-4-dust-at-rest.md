---
title: 'Story 2.4: Dust at rest'
type: 'feature'
created: '2026-09-28'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'd187b877edae6baff1629046de10bd142d62d33c'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The resting scene draws Bodies on an empty field, so the space between them reads as a sparse diagram rather than a universe (FR-15). Story 2.8 needs Motes to condense out of Dust that is already visible, and no Dust exists yet.

**Approach:** A pure `.ts` Dust model derives two components from the Bodies that the scene model already emits. The first is a **medium**: one broad radial falloff centred on each Client's Star. The second is **particles**: a sparse, deterministic scatter whose count is a ratio of Bodies. `scene.tsx` maps both to placeholder geometry that is drawn strictly behind every Body and writes no depth, so Dust cannot obscure a Body from any camera.

## Boundaries & Constraints

**Always:**
- Dust is computed from the scene model's `Body` list (positions and `kind`) and from named tuning constants, and from nothing else. It does not read `content`, `skills` or any authored field, and it does not import from `src/derive/` or `src/data/`.
- Density is a **ratio** (`DUST_PARTICLES_PER_BODY`) plus a medium peak opacity (`DUST_MEDIUM_PEAK_OPACITY`, 0.42 per DESIGN.md §7.5). Retuning either one changes a constant and no structure (D-T1, E-T2).
- The scatter is deterministic: a seeded PRNG in the model, no `Math.random`, and identical output across builds and re-renders.
- **Draw order is structural.** Every Dust draw precedes every Body draw and writes no depth, so no Body is ever painted over by Dust, whether the Dust is in front of it or behind it, at any camera 2.5 later introduces.
- Every AC-bearing rule lives in pure `.ts` and executes under `node --test`. Every new ratchet scan is driven over reconstructed bad forms as well as over the real file (the `auditAria` idiom).
- The default framing still frames **Bodies** only. Dust does not widen `frameBodies`.

**Ask First:**
- Adding a dependency, changing the artifact's shape or `SCHEMA_VERSION`, or touching `career.json`.
- Introducing a scene background colour or any palette beyond one neutral greybox Dust value.

**Never:**
- No Mote, no per-Skill entity, and no Dust keyed by a Skill (FR-13). Dust does not animate: no drift, no `useFrame` (2.8 and 2.10 own motion).
- No connector geometry, no hooks, no store reads or writes, no interaction, and no DOM or `document` access in `scene.tsx`. The existing scans hold these rules and must stay green.
- No design token or visual identity (Epic 3), and no shader authoring. The medium is a billboard `sprite` whose texture data comes from the model.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nominal | N Stars, P Planets | Exactly N media, one centred on each Star's position. `round(ratio × (N+P))` particles | N/A |
| Committed artifact | 1 Star, 1 Planet (flat in y and z) | Non-degenerate scatter volume. The count equals the ratio's target | N/A |
| Neighbouring systems | 5-Client fixture | No two media overlap. Composite medium alpha at every Body is ≤ `DUST_MEDIUM_PEAK_OPACITY` | N/A |
| Clearance | any fixture | Every particle is ≥ `BODY_MARGIN` from every Body centre | Placement attempts are bounded. Test fixtures must hit the target count |
| Skills differ | same Bodies, different `content.skills` | Identical Dust | N/A |
| Empty | no Bodies | No media, no particles, no throw | N/A |

</frozen-after-approval>

## Code Map

- `src/render-scene/scene-model.ts` -- `Body`, `buildScene`, `frameBodies`, and `BODY_MARGIN` (:246, which is ≥ the largest drawn radius by an existing assertion). It is the input to Dust. **Keep its zero-import property**: Dust goes in a new module.
- `src/render-scene/dust-model.ts` -- **new.** It may import from `./scene-model.ts` only. It exports `buildDust(bodies): { media, particles }`, `mediumFalloff(size): Uint8Array` (RGBA: white RGB, alpha 255 at the centre falling to 0 at the edge, non-increasing along the radius), the tuning constants, and `DUST_RENDER_ORDER` < `BODY_RENDER_ORDER`. A medium's radius is its system's extent (Star to its farthest Planet) plus a margin, times a breadth factor, capped at half the distance to the nearest other Star.
- `src/render-scene/dust-model.test.ts` -- **new.** Covers the whole matrix behaviourally, plus determinism, the falloff profile, and the draw-order constants. It reuses `scene-model.test.ts`'s fixtures idiom (`client()`, `project()` and `fiveClients()` at :101-170). These are not exported, so they are restated or extracted.
- `src/render-scene/scene.tsx` -- one `<sprite>` per medium, with `spriteMaterial` taking `map` from `<dataTexture args={[mediumFalloff(…), size, size]} attach="map" needsUpdate />`, `opacity` from the model, `depthWrite={false}` and `renderOrder={DUST_RENDER_ORDER}`. One small sphere mesh per particle, with the same depth and order rules. Body meshes gain `renderOrder={BODY_RENDER_ORDER}` and a `transparent` material at opacity 1, **because three renders its whole opaque list before its transparent list whatever the `renderOrder`**. An opaque Body would therefore be drawn before the Dust and then painted over. `auditRenderer` (:773) bans `.slice`, `.filter`, hooks and `document`, so the texture data must arrive fully built.
- `src/render-scene/scene-model.test.ts` -- the scans resolve files by name. Add `dust-model.ts` to `auditForbiddenImports`'s file list (:713) and add both new files to the directory-coverage `known` set (:1185). Add a renderer scan, driven over bad forms, that asserts every Dust element carries `depthWrite={false}` and `DUST_RENDER_ORDER`, and that Body meshes carry `BODY_RENDER_ORDER` and `transparent`. It must reject a copy with either one removed. It also bans `Mote`/`skills` identifiers in the renderer.
- `src/render-scene/README.md` -- a `## Files` row for each of the two new modules, and a "Dust never reads as fog" section explaining the draw-order reasoning.
- House style: `node:test` with `node:assert/strict`, flat `test()`, lowercase titles naming both the behaviour and its reason, `.ts` specifiers, single quotes, `readonly`.

## Tasks & Acceptance

**Execution:**
- [x] `src/render-scene/dust-model.ts` -- media, seeded particle scatter with clearance, falloff data, tuning constants, draw-order constants -- every rule must be where `node --test` reaches it
- [x] `src/render-scene/dust-model.test.ts` -- the I/O matrix, determinism, falloff monotonicity, and `DUST_RENDER_ORDER < BODY_RENDER_ORDER` -- the ACs are only provable over fixtures, because authored data holds two Bodies
- [x] `src/render-scene/scene.tsx` -- map media to sprites and particles to spheres behind the Bodies; move Bodies into the sorted transparent pass -- this makes "never obscures" hold from any camera, not only the default one
- [x] `src/render-scene/scene-model.test.ts` -- widen the import audit and the directory coverage to cover the new module; add the draw-order scan with bad forms and the Mote/Skill ban -- an unscanned module and a scan that cannot fail are both known failure modes here
- [x] `src/render-scene/README.md` -- the file rows and the reasoning -- house style
- [x] `npm test`, `npm run typecheck`, `npm run gate`, `npm run build` -- all green, with the dependency set unchanged

**Acceptance Criteria:**
- Given the app is open in a browser, when the resting scene renders, then a faint medium around each Client system and sparse particles are visible between Bodies, and every Body stays unambiguous against them (a perceptual check, done by looking)
- Given Dust and Bodies share a camera, when any camera renders, then no Dust fragment is drawn over a Body, because the renderer scan and the model constants enforce draw order and the absence of depth writes
- Given `DUST_PARTICLES_PER_BODY` or `DUST_MEDIUM_PEAK_OPACITY` changes, when the scene rebuilds, then density changes with no other edit
- Given the resting scene, when it is inspected, then no Mote and no per-Skill entity exists in the model's output or in the renderer
- Given `npm test`, `typecheck`, `gate` and `build` run, then all pass and no dependency has been added

## Design Notes

**Why Dust is computed in the scene and not emitted in the artifact.** AD-3 binds *data-to-visual* derivations, and Dust maps no datum. It is composition read off solved positions, the same kind of work as `frameBodies`, and its parameters are M1 tuning items that AD-3's own text defers ("fixes *where* they are derived, not their values"). If Dust ever encodes Skills per Client, that becomes a derivation and moves to `src/derive/`.

**Why "no fog" is tested as three separate proxies.** The greybox has no stroke ladder yet, so "luminance ambiguity" cannot be computed against real colours. What can be executed is each way Dust could make a Body ambiguous: painting over it (draw order), piling up behind it (the composite-alpha cap from non-overlapping media), or crowding it (particle clearance). The final judgement is perceptual and is re-asked when real data lands (see the deferred entry for 1 Client and 1 Project).

## Verification

**Commands:**
- `npm test` -- expected: all pass, including the new `dust-model.test.ts`
- `npm run typecheck` -- expected: clean
- `npm run gate` -- expected: "the layout artifact is present and valid."
- `npm run build` -- expected: green. The Dust code is in the scene chunk and the entry chunk still carries no Three
- `git diff --stat package.json package-lock.json` -- expected: empty

**Manual checks:**
- `npm run dev`: a soft medium sits around the SNCF system, faint particles sit between Bodies, and both Bodies read clearly with no haze over them

## Suggested Review Order

**The Dust model — where every rule lives**

- Start here: one entry point, tuning validated before any geometry is built.
  [`dust-model.ts:194`](../../src/render-scene/dust-model.ts#L194)

- Medium radius from its own Planets, capped at half the nearest-Star distance.
  [`dust-model.ts:215`](../../src/render-scene/dust-model.ts#L215)

- Seeded, bounded scatter with clearance, no `Math.random`, so the result is deterministic.
  [`dust-model.ts:241`](../../src/render-scene/dust-model.ts#L241)

- Density as ratio plus peak opacity: the two M1 tuning handles.
  [`dust-model.ts:57`](../../src/render-scene/dust-model.ts#L57)

**Never reads as fog — draw order**

- Dust ordered strictly before Bodies, derived from the Body constant.
  [`dust-model.ts:130`](../../src/render-scene/dust-model.ts#L130)

- Body order lives beside the Body model, which still imports nothing.
  [`scene-model.ts:283`](../../src/render-scene/scene-model.ts#L283)

- Media: shared texture, no depth writes, Dust render order.
  [`scene.tsx:178`](../../src/render-scene/scene.tsx#L178)

- Bodies join the transparent pass at opacity 1, because three renders all opaque objects before any transparent one.
  [`scene.tsx:209`](../../src/render-scene/scene.tsx#L209)

- One GPU texture for every medium, linearly filtered.
  [`scene.tsx:78`](../../src/render-scene/scene.tsx#L78)

**Tests worth reading — each proven to fail**

- The draw-order ratchet, run over the renderer with each guarantee removed in turn.
  [`scene-model.test.ts:1064`](../../src/render-scene/scene-model.test.ts#L1064)

- Closes the mutation gap: removing the own-Planets filter now fails.
  [`dust-model.test.ts:206`](../../src/render-scene/dust-model.test.ts#L206)

- A crowded layout under a tight budget runs short instead of hanging.
  [`dust-model.test.ts:273`](../../src/render-scene/dust-model.test.ts#L273)

- Invalid tuning throws a RangeError naming the field.
  [`dust-model.test.ts:295`](../../src/render-scene/dust-model.test.ts#L295)

**Peripherals**

- The reasoning, including the world-space limits of the ceiling.
  [`README.md:35`](../../src/render-scene/README.md#L35)
