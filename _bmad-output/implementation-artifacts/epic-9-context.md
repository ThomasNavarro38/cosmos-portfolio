# Epic 9 Context: The Scene Becomes the Sky

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Thomas rejected M3 on screen (8.4, 2026-11-17). The line-work read as a schematic laid over the realism, the Stars did not read as stars (the outline and core dot looked wrong), and every Star was the same colour. Epic 9 fixes this on a capable machine: once realism has arrived, each stroke is replaced by a physical object that carries the same meaning.
- Stars shine with a limb-darkened, granulating, pulsing core in a colour of their own.
- Orbits become faint debris belts, and the Rail becomes a nebula ribbon.
- A Deep Planet wears a real ring disc and moon sphere.
- A Planet's recency shows in its atmosphere rim.
- Every Star is named with its Client, in every session.

First Paint, the Fallback, the link preview and the failure path keep the M2 line-work, and colour still means nothing. M3's merge to `main` (8.5) waits until Thomas passes this epic's second judgement (9.11).

## Stories

- Story 9.1: The cost spike (done)
- Story 9.2: The rulings (done)
- Story 9.3: Client names on the Stars (done)
- Story 9.4: Stars that shine
- Story 9.5: A colour per Star
- Story 9.6: Orbits as debris belts
- Story 9.7: The Rail as a nebula
- Story 9.8: Deep Planets wear a ring and a moon
- Story 9.9: The atmosphere rim
- Story 9.10: The handover
- Story 9.11: The second judgement

## Requirements & Constraints

- **Delivery:** work continues on `m3-realism`. Nothing reaches `main` before 8.5. The amended PRD, spine and design documents (2026-11-17 and 2026-11-18 blocks) are the rules each build story is held to.
- **Invariants every story keeps:**
  - First Paint stays schematic. If realism fails, the line-work stays at its token values, with no error and no message.
  - The Fallback, phones and the link preview are unchanged. Dust stays exactly as M2 draws it.
  - No post pass, composer, full-screen render target, shadow map, scene light, raymarching or new runtime dependency.
  - Colour encodes nothing, and white is spent once per frame.
  - Every label keeps its contrast floor over fills, tinted glows and the nebula, checked on rendered pixels.
- **Recency (FR-3), still one rule:** a more recent entry renders brighter. Before realism (and wherever realism is absent) the outline carries it. Under realism it is carried by a Star's light, a Planet's atmosphere rim and an orbit's debris belt (at its Planet's band), all in ladder order. A Star's colour, like map, tilt and spin, comes from the ID and is not a mapping rule.
- **Deep/Shallow (FR-9):** under realism a Deep Project has a ring disc and a moon sphere, and a Shallow one has neither. Both are achromatic, use neither size nor brightness, and stay readable at client-stop distance at 1080p.
- **Colophon (FR-21):** copy place 4 gets the new heading ("what a Star and a Planet look like") and the new statement, both verbatim. They ship in 9.5, pinned by `credits.test.ts` and the identity audit. Until then the page keeps the old wording.
- **Byte budgets are unchanged:** `realism` 24,000 B and `scene` 960,000 B.
  - 9.1 prototyped the belt, nebula and disc together and measured about 14,752 B for `realism` and 953,093 B for `scene`. These are lower bounds, because shipped wiring adds cost.
  - About 6.9 KB of `scene` headroom was left before 9.3. The 9.3 labels, the 9.10 crossfade and each story's `scene`-side exports all share it.
  - A limit changes only by a memlog ruling with a measured figure.
- **Draw calls (added):**
  - 1 per Planet (fill, with the rim in the same shader)
  - 2 per Star (core and glow)
  - 2 per Deep Project (ring disc and moon sphere). 9.8 measures the moon sphere's share, and a figure over 1 needs a ruling.
  - 1 for all belts (one merged mesh)
  - 1 for the nebula
  - 0 for Dust
- **Success:** 9.11 passes at 1920×1080 and on the Odyssey Ark (32:9). Ladder order, white once per frame and an achromatic structural Deep/Shallow signal are all tested. The NFR-2 record still reads **not yet passed**.

## Technical Decisions

- **Replace, don't underlay (AD-19):** once realism arrives, each piece of `body-field.tsx` line-work fades to zero as its replacement arrives, and it returns if realism fails.
  - The replacements: outline and dot become the core light, the Planet outline becomes the rim, the orbit becomes the belt, the Rail becomes the nebula, and Ring and Moon become the ring disc and moon sphere.
  - Line-work in every session: the hover and keyboard affordance, leaders, label plates, Mote orbits and Dust.
  - A Body's own fill never hides its rim, ring disc or moon sphere.
- **Draw order (ruled 2026-11-18):** still declared once in `scene-model.ts` and strictly pinned:
  `DUST 1 < NEBULA 1.1 < GLOW 1.25 < FILL 1.5 (+rim) < BELT 1.6 < RING_DISC 1.75 < BODY 2 < MOON 3 (+moon sphere)`
  - The rim has no slot of its own; it lives in the fill shader. The moon sphere shares `MOON_RENDER_ORDER`, so a Moon still draws over its Ring.
  - The nebula draws before the fills, so it never hazes a Planet, a rim or a plate.
  - The belt is depth-tested after the fills, so its near side passes over its Planet.
  - The disc draws over the belt, and the `BODY 2` line-work draws over the disc.
  - Each story adds its own constant and its strict-order pin: the belt in 9.6, the nebula in 9.7, the disc in 9.8. The order numbers used in the 9.1 spike were placeholders.
- **Star look (AD-20):** unlit, emissive, with no map.
  - The core is procedural, limb-darkened from centre to edge into its glow, with slow granulation and a slow pulse phased from its ID.
  - Rest luminance follows `luminanceBand`, and the pulse never leaves the band.
  - Only the core of `sceneSubject` rises above `stroke-active`, and it reaches `stroke-focus` at its centre alone.
  - The rim carries the same band, with white only on the subject. The luminance ceiling holds for every new object, pinned by test.
- **Motion:** granulation, pulse and nebula drift stop when `reducedMotion()` is true, read the same way spin is. The belt is static and particle-free, so it cannot be read as Dust.
- **Star appearance (AD-21):** a Star gets `appearance: { tint, pulsePhase }`, derived from its entity ID alone.
  - `tint` is one of five `realism-star-*` tokens and never changes over time. The glow takes the tint.
  - It ships under a new `SCHEMA_VERSION`, with no authored field and no per-Body override. `solveLive` stays byte-identical.
- **Crossfade (AD-22):** the one existing fade uniform becomes a crossfade. The realism layer rises and the replaced line-work falls, together and whole, never Body by Body.
- **Nebula:** a single noise-shaded ribbon mesh along the Rail's curve, in `realism-nebula`.
- **Tokens (placeholders, tuned on screen and normalised under the ceiling, read only by `realism/`):**
  - New: `realism-star-blue #A9BFFF`, `-white #F4F1EA`, `-yellow #FFE6B0`, `-orange #FFC27A`, `-red #FF9A5C`, `realism-nebula #4A5A7A`, `realism-belt #6E6A62`.
  - Each story declares its own tokens in the frontmatter, and so in the generated outputs. 9.5 adds the five tints and retires `realism-star-glow` (read by the star layer and the identity audit). 9.6 adds `realism-belt`, and 9.7 adds `realism-nebula`.
- **Mote labels (ruled 2026-11-18, done in 9.3):**
  - `mote-field.tsx` hands the Mote label pass `sceneLabelObstacles` (the affordance boxes, then the shown Client plates) in place of `affordanceObstacles`, and it reads the subject from the Rail.
  - That file has left the must-stay-unchanged list. `mote-model*` and `mote-label.ts` remain on it, and `auditMoteField` still pins the binding.
- **Code placement:** new shaders go in the lazy `realism` chunk. The crossfade wiring touches the `scene` chunk.
- **Tests to update:** the identity audit, `credits.test.ts`, the render-order pins and the draw-call counts. In 9.10 every audit must pass (render order, draw calls, luminance ceiling, achromatic, reduced motion, bundle), and each change names its allowance.

## UX & Interaction Patterns

- **Under realism a Star has no circle and no core dot.** The limb-darkened core makes it read as emitting. One Star is white per frame, never two.
- **Client names (9.3, as ruled 2026-11-18):** these are built and must stay intact when the build stories land.
  - Every name is `scene-label-client`, in `ink-lift` when its Star is the subject and `ink-label` when receded (never `ink-quiet` or `ink-faint`, which fall below 4.5:1).
  - Each name sits on an opaque `surface-base` plate, 1px past the text, with no edge, radius, shadow or fade.
  - A name is hidden, never faded or moved, when any of these is true:
    - its estimated box enters the outer 12% of the frame
    - a Project is Focused and the box crosses the panel's edge
    - its Star is behind the camera
    - its plate meets another Body's disc, at any depth; for a Deep Planet the disc extends out to its Ring or Moon
    - it meets the affordance's label or leader
    - it meets a stronger name (the subject's first, then the nearer Star's); a 4px gap is kept from both
  - Mote labels yield to every shown name. Later stories (the belt, nebula, disc and tints) must keep this layout and its contrast.
- **Glow** is allowed only on the Star sprite and the nebula, both under the ceiling. There is no bloom or lens flare. Under realism, depth's first channel is the luminance of the replacing carriers, in ladder order.
- **Ring disc:** thin, tilted and semi-transparent. **Moon:** a small lit sphere.
- **The stroke ladder** stays the identity of the schematic frame, First Paint, the Fallback and the preview.

## Cross-Story Dependencies

- **Order:** 9.4 → 9.5 → 9.6 → 9.7 → 9.8 → 9.9 → 9.10 → 9.11 → 8.5. 9.1–9.3 are done.
- 9.5's tint feeds the Star look from 9.4. Client-label contrast (9.3) must be rechecked under the 9.5 tints and over the 9.7 nebula.
- The Client-name hide rule reads Body discs out to the Ring and Moon, so changes in 9.8 must keep it correct.
- 9.10 builds the crossfade across the replacements from 9.4 and 9.6–9.9.
- **9.11** rebuilds 8.4's sheet in `nfr-2-record-8-3.md`, beside 8.4's section, which stays as written.
  - Poses: 8.4's four plus a Star close-up, at both displays.
  - 8.4's dark-ring point is closed as superseded by 9.4. Overlapping rest glows are re-checked under the tints.
  - Carried over: fill over glow, half-disc Planets, the fill-tilt wording (now including the disc), Jupiter worn by none, and the plate and outline band (now also on Client plates).
  - The agent writes no verdict and stops.
- A failed judgement goes back to the tunable values of Epics 7 and 9. Moving more line-work or adding a composer needs a new ruling.
- 8.5 needs a 9.11 pass. On the live site the Stars must show their names and tints, and the crossfade must be seen to happen.
