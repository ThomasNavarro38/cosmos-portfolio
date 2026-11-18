# Epic 9 Context: The Scene Becomes the Sky

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Thomas rejected M3 on screen (8.4, 2026-11-17): the line-work reads as a schematic laid over the realism, Stars do not read as stars (the outline and core dot look wrong), and every Star is the same colour. On a capable machine, once realism has arrived, Epic 9 replaces each stroke with a physical object that carries the same meaning. Stars shine with a limb-darkened, granulating, pulsing core in a colour of their own. Orbits become faint debris belts, the Rail becomes a nebula ribbon, a Deep Planet wears a real ring disc and moon sphere, and a Planet's recency shows in its atmosphere rim. Every Star is also named with its Client, in every session. First Paint, the Fallback, the link preview and the failure path keep the M2 line-work, and colour still means nothing. M3's merge to `main` (8.5) waits on Thomas passing this epic's second judgement (9.11).

## Stories

- Story 9.1: The cost spike
- Story 9.2: The rulings
- Story 9.3: Client names on the Stars
- Story 9.4: Stars that shine
- Story 9.5: A colour per Star
- Story 9.6: Orbits as debris belts
- Story 9.7: The Rail as a nebula
- Story 9.8: Deep Planets wear a ring and a moon
- Story 9.9: The atmosphere rim
- Story 9.10: The handover
- Story 9.11: The second judgement

## Requirements & Constraints

- **Delivery:** work continues on `m3-realism`. Nothing reaches `main` before 8.5.
- **Stop rule:** 9.1 (the spike) came first, and no build story (9.3–9.10) starts before 9.2's rulings are recorded. 9.2 applies proposals 2–7 of the 2026-11-17 Sprint Change Proposal to the PRD, the spine and the design documents as dated amendments, and records the rulings in the memlogs. The amended documents are the rules each build story is held to.
- **Invariants every story keeps:**
  - First Paint stays schematic, and on realism failure the line-work stays at its token values, with no error and no message.
  - The Fallback, phones and the link preview are unchanged. Dust stays exactly as M2 draws it.
  - There is no post pass, composer, full-screen target, render target, shadow map, scene light, raymarching or new runtime dependency.
  - Colour encodes nothing, and white is spent once per frame.
  - Every label keeps its contrast floor over fills, tinted glows and the nebula, checked on rendered pixels.
- **Recency is still one rule (FR-3):** a more recent entry renders brighter. Before realism the carrier is the outline. Under realism the carriers are a Star's light, a Planet's atmosphere rim and an orbit's debris belt (its Planet's band), all in the ladder's order. Star colour, like map, tilt and spin, comes from the ID and is not a mapping rule.
- **Deep/Shallow (FR-9):** under realism the signal is a ring disc plus a moon sphere on a Deep Project, and neither on a Shallow one. Both are achromatic, use neither size nor brightness, and stay readable at client-stop distance at 1080p.
- **Client names (FR-11):** published as-is, in the scene, in every session (realism or not).
- **Colophon (FR-21):** copy place 4's heading becomes "what a Star and a Planet look like", with the new statement from proposal 7 verbatim. It ships in 9.5, pinned by `credits.test.ts` and the identity audit.
- **Budgets:** the byte limits are ruled unchanged (2026-11-17, from 9.1's measurement): `realism` 24,000 B, `scene` 960,000 B. Shipped today: 8,560 and 953,039. With the belt, nebula and ring disc prototyped together, 9.1 measured 14,752 B and 953,093 B, each object +1 draw gross, all within limit. Those figures are lower bounds: a shipped object also needs wiring the spike charged to its wrapper. The `scene` chunk has about 6.9 KB left, shared by the Client labels (9.3), the crossfade wiring (9.10) and every story's own `scene`-side exports, none of them measured yet. A limit changes only by a new memlog ruling with a measured figure.
- **Draw calls:**
  - 1 per Planet (fill, with the rim inside the same shader)
  - 2 per Star (core, glow)
  - 2 per Deep Project (ring disc, moon sphere on the shared geometry)
  - 1 for all debris belts together (one merged mesh)
  - 1 for the nebula
  - 0 for Dust
- **Success:** 9.11 is a pass at 1920×1080 and on the Odyssey Ark (32:9). Ladder order, white once per frame and an achromatic structural Deep/Shallow signal are all tested. The NFR-2 record still reads **not yet passed**.

## Technical Decisions

- **Replace, don't underlay (AD-19 amended):** once realism has arrived, each piece of `body-field.tsx` line-work fades to zero as its replacement arrives, and returns if realism fails. These stay line-work in every session: the hover/keyboard affordance, leaders, label plates, Mote orbits and Dust. Under realism a Body's own fill never hides its rim, ring disc or moon sphere.
- **Draw order (ruled 2026-11-18):** still declared once in `scene-model.ts` and strictly pinned: `DUST 1 < NEBULA 1.1 < GLOW 1.25 < FILL 1.5 (+rim) < BELT 1.6 < RING_DISC 1.75 < BODY 2 < MOON 3 (+moon sphere)`.
  - The rim has no slot; it lives inside the fill shader. The moon sphere shares `MOON_RENDER_ORDER`, so a Moon still draws over its Ring.
  - The nebula precedes the fills, so it never hazes a Planet, its rim or a label plate. The belt follows the fills and is depth-tested, so its near side passes over its Planet. The ring disc draws over the belt, and the line-work that stays (affordance, leaders, Mote orbits) draws over it.
  - Each story adds its own constant and strict-order pin: the belt in 9.6, the nebula in 9.7, the ring disc in 9.8. 9.1's spike orders were placeholders.
- **Star look (AD-20 amended):** a Star stays unlit and emissive, with no map. Its procedural core is limb-darkened from centre to edge into its glow, with slow granulation and a slow pulse whose phase comes from the ID. At rest its luminance follows `luminanceBand`, and the pulse never leaves the band. Only the core of `sceneSubject` rises above `stroke-active`, and it reaches `stroke-focus` at its centre alone. The luminance ceiling holds for every new object and is pinned by test.
- **Motion:** granulation, pulse and nebula drift stop when `reducedMotion()` is true. The binding reads it the same way it reads spin. The debris belt has no particles and no motion, so it cannot be read as Dust.
- **Star appearance (AD-21 amended):** a Star gains `appearance: { tint, pulsePhase }`, derived from its entity ID alone (salted). `tint` is one of five `realism-star-*` tokens. It ships under a new `SCHEMA_VERSION`, with no authored field and no per-Body override, and `solveLive` stays byte-identical. The tint never changes over time, and the Star's glow takes its tint.
- **Crossfade (AD-22 amended):** the one existing fade uniform drives a crossfade. The realism layer rises and the line-work it replaces falls, together and whole, never Body by Body.
- **Nebula:** one noise-shaded ribbon mesh along the Rail's curve, in `realism-nebula`.
- **Tokens:** `realism-star-glow` is replaced by `realism-star-blue #A9BFFF`, `-white #F4F1EA`, `-yellow #FFE6B0`, `-orange #FFC27A` and `-red #FF9A5C`. `realism-nebula #4A5A7A` and `realism-belt #6E6A62` are added. All are placeholders, tuned on screen and normalised under the ceiling, and are read only by `realism/`. The design document's prose and table already list them; each story declares its own in the token frontmatter (and so in the generated outputs): the five Star tints, and the retirement of `realism-star-glow` (read today by the star layer and the identity audit), in 9.5, `realism-belt` in 9.6, `realism-nebula` in 9.7.
- **Code placement:** new shaders go in the lazy `realism` chunk. Client labels and the crossfade wiring touch the `scene` chunk.
- **Tests to update:** the identity audit, `credits.test.ts`, the render-order pins and the draw-call counts. In 9.10 every audit must pass (render order, draw calls, luminance ceiling, achromatic, reduced motion, bundle), and each change names its allowance.
- **Spike hygiene:** 9.1 is a throwaway prototype outside `src/`. Its captures are labelled as a spike, not a judgement.

## UX & Interaction Patterns

- **Client Star label:** the name sits below the Star in `scene-label-client` (11px, 300, 0.36em tracking). It is in `ink-lift` when the Star is the subject and `ink-quiet`/`ink-faint` when receded, on an opaque `surface-base` plate like the Project label's (1px past the text box, with no edge, radius, shadow or fade). It keeps "one label per object" and "no readable label near the frame edge".
- **Under realism, a Star has no circle and no core dot.** Its limb-darkened core makes it read as emitting. One Star is white per frame, never two.
- **Glow:** glow is allowed only on the Star sprite and the nebula, and both stay under the ceiling. There is no bloom or lens flare, at M2 or M3. Under realism, depth's first channel is the luminance of the replacing carriers, in ladder order.
- **Ring disc:** thin, tilted and semi-transparent. The moon is a small lit sphere.
- **The stroke ladder** remains the identity of the schematic frame, First Paint, the Fallback and the preview.

## Cross-Story Dependencies

- The sequence is 9.1 → 9.2 → 9.4 → 9.5 → 9.6 → 9.7 → 9.8 → 9.9 → 9.10 → 9.11 → 8.5. 9.3 is independent and may run in parallel once 9.2 is done.
- 9.5's tint feeds the Star look from 9.4. Label contrast from 9.3 must be rechecked under the 9.5 tints and the 9.7 nebula.
- 9.10 builds the crossfade across the replacements from 9.4 and 9.6–9.9.
- 9.11 rebuilds 8.4's sheet in the 8.3 record (`nfr-2-record-8-3.md`), beside 8.4's section, which stays as written. It uses 8.4's four poses plus a Star close-up, at both displays.
  - 8.4's looks it carries: the Star's dark ring is closed as superseded by 9.4, and overlapping rest glows are re-checked under the tints.
  - The others are carried: fill over glow, half-disc Planets, the fill-tilt wording (now including the ring disc), Jupiter worn by none, and the plate and outline band (now also on Client plates).
  - The agent writes no verdict and stops.
- A failed judgement goes back to the tunable values of Epics 7 and 9. Moving line-work further or adding a composer needs a new ruling.
- 8.5 requires a 9.11 pass. It also requires the live Stars to show their names and tints, with the crossfade seen to happen.
