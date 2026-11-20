# Epic 9 Context: The Scene Becomes the Sky

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Thomas rejected M3 on screen (8.4, 2026-11-17): the line-work read as a schematic laid over the realism, and the Stars did not read as stars. Epic 9 fixes this on a capable machine. Once realism has arrived, each stroke is replaced by a physical object that carries the same meaning: Stars shine with a limb-darkened, granulating, pulsing core in a colour of their own; orbits become faint debris belts; the Rail becomes a nebula ribbon; a Deep Planet wears a real ring disc and moon sphere; a Planet's recency shows in its atmosphere rim; and every Star is named with its Client, in every session. First Paint, the Fallback, the link preview and the failure path keep the M2 line-work, and colour still means nothing. M3's merge to `main` (8.5) waits until Thomas passes this epic's second judgement (9.11).

## Stories

- Story 9.1: The cost spike (done)
- Story 9.2: The rulings (done)
- Story 9.3: Client names on the Stars (done)
- Story 9.4: Stars that shine (done)
- Story 9.5: A colour per Star (done)
- Story 9.6: Orbits as debris belts (done)
- Story 9.7: The Rail as a nebula (done)
- Story 9.8: Deep Planets wear a ring and a moon (done)
- Story 9.9: The atmosphere rim
- Story 9.10: The handover
- Story 9.11: The second judgement

## Requirements & Constraints

- **Delivery:** work continues on `m3-realism`; nothing reaches `main` before 8.5. The dated 2026-11-17 and 2026-11-18 amendments in the PRD, spine and design documents are the rules each build story is held to.
- **Invariants every story keeps:**
  - First Paint stays schematic. If realism fails, the line-work stays at its token values, with no error and no message.
  - The Fallback, phones and the link preview are unchanged. Dust stays exactly as M2 draws it.
  - No post pass, composer, full-screen render target, shadow map, scene light, raymarching or new runtime dependency.
  - Colour encodes nothing; white is spent once per frame.
  - Every label keeps its contrast floor over fills, tinted glows and the nebula, checked on rendered pixels.
- **Recency (FR-3), still one rule:** a more recent entry renders brighter. Without realism the outline carries it. Under realism it is carried by a Star's light, a Planet's atmosphere rim and an orbit's belt (at its Planet's band), all in ladder order (a `stroke-near` belt is brighter than the `stroke-rest` hairline it replaces; that is intended). Star colour, like map, tilt and spin, comes from the ID and is not a mapping rule.
- **Deep/Shallow (FR-9):** under realism a Deep Project has a ring disc and a moon sphere, a Shallow one neither. Both achromatic, using neither size nor brightness, readable at client-stop distance at 1080p.
- **Colophon (FR-21):** copy place 4 gets the heading "what a Star and a Planet look like" and the ruled statement, verbatim, shipped in 9.5 and pinned by `credits.test.ts` and the identity audit.
- **Byte budgets are unchanged:** `realism` 24,000 B, `scene` 960,000 B. On the 9.8 build: `realism` 23,437 B (only 563 B of headroom left for 9.9's rim, which lives in the fill shader) and `scene` 957,915 B, so 2,085 B of `scene` headroom remains for 9.9's `scene`-side exports and the 9.10 crossfade wiring (9.7: 19,593 B and 957,756 B) (9.6, after its review, was 14,665 B and 957,602 B). 9.1 prototyped the belt, nebula and disc together at about 14,752 B `realism` and 953,093 B `scene`; these are lower bounds, because shipped wiring adds cost. Keep new code in the lazy `realism` chunk. A limit changes only by a memlog ruling with a measured figure.
- **Added draw calls:** 1 per Planet (fill, rim in the same shader); 2 per Star (core, glow); 2 per Deep Project (ring disc, moon sphere on the shared geometry; 9.8 measures the moon's share, and over 1 needs a ruling); 1 for all belts (one merged mesh, built in 9.6 as `BELT_DRAWS_BUDGET = 1`; `addedDraws` = planets + 2 × stars + 1 when any Planet, 21 on the committed artifact); 1 for the nebula (built in 9.7 as `NEBULA_DRAWS_BUDGET = 1`, counted when the drawn Rail has two points or more; `addedDraws(planets, stars, railPoints)` is 22 on the committed artifact); 2 per Deep Project built in 9.8 as `DEEP_PROJECT_DRAWS_BUDGET = 2` (the moon's measured share is 1, no ruling; `addedDraws(planets, stars, railPoints, deepPlanets)` is 24 on the committed artifact); 0 for Dust.
- **Success:** 9.11 passes at 1920×1080 and on the Odyssey Ark (32:9). Ladder order, white once per frame and an achromatic structural Deep/Shallow signal are tested. The NFR-2 record still reads **not yet passed**.

## Technical Decisions

- **Replace, don't underlay:** once realism arrives, each piece of `body-field.tsx` line-work fades to zero as its replacement arrives, and returns if realism fails. Outline and dot become the Star's core light, the Planet outline the rim, the orbit the belt, the Rail the nebula, Ring and Moon the ring disc and moon sphere. Line-work in every session: hover/keyboard affordance, leaders, label plates, Mote orbits, Dust. A Body's own fill never hides its rim, ring disc or moon sphere.
- **Draw order** stays declared once in `scene-model.ts`, strictly pinned:
  `DUST 1 < NEBULA 1.1 < GLOW 1.25 < FILL 1.5 (+rim) < BELT 1.6 < RING_DISC 1.75 < BODY 2 < MOON 3 (+moon sphere)`.
  The rim lives in the fill shader; the moon sphere shares `MOON_RENDER_ORDER`. The nebula draws before fills so it never hazes a Planet or plate; the belt is depth-tested after fills so its near side passes over its Planet. Each story adds its own constant and pin: `BELT_RENDER_ORDER` 1.6 is in (9.6), `NEBULA_RENDER_ORDER` 1.1 is in (9.7), `RING_DISC_RENDER_ORDER` 1.75 is in (9.8).
- **Star look (built in 9.4):** unlit, emissive, no map; procedural limb-darkened core into its glow, slow granulation and a pulse phased from the ID. A Star's band is its Client's `luminanceBand` (`deriveLuminanceBand` over the Client's rank by the latest `recencyOf` among its Projects), emitted on `clients[]` and re-derived by the gate; the schematic Star outline stays `stroke-rest`. Each band has a disjoint, ordered rest range under `stroke-active`; the pulse stays within it, and the subject's pulse only dims, peaking at `stroke-focus` at its centre alone. The luminance ceiling holds for every new object, pinned by test.
- **Line-work fade path (9.4):** a Star's outline and core dot fall as `1 - fade` on the layer's one fade, read through the owner's `lineWorkFade()` and written by `body-field.tsx` each frame (whole with no layer, while warming, and after failure), under one named `auditBodyField` allowance. 9.6 extended it to the orbit hairlines, and 9.7 to the Rail's hairline (`line-fade.ts` `holdReplacedLine`, renamed from 9.6's `holdOrbitLine`, holding `orbit:*` and `rail` only; whole with the Star marks, same allowance). 9.8 extended it to the Rings (`ring:` in `holdReplacedLine`, on the Ring `<Line>`'s ref) and the Moons (`moon-field.tsx`'s loop hands its pool to `fadeStarMarks`, which skips unmounted handles). 9.9 and 9.10 extend this path rather than add new ones.
- **Motion:** granulation, pulse and nebula drift hold when `reducedMotion()` is true, read as spin is (not `motionPace`). The belt is static and particle-free so it cannot read as Dust.
- **Star appearance:** derived from the entity ID alone in `src/derive/appearance.ts` (`starAppearanceOf`). It ships as `{ tint, pulsePhase }` under `SCHEMA_VERSION` 12, tint a short name (`blue`…`red`) that `realism/` resolves to `realism-star-<tint>-dark`, read by core and glow (never changing in time), with no authored field or per-Body override, `solveLive` byte-identical and the gate re-deriving it.
- **Belt (built in 9.6):** one merged `BufferGeometry`/`ShaderMaterial` mesh, a flat annulus per Planet from 0.92 to 1.08 of its orbit radius on `orbitPoints` in the solved orbit plane; normal-blended, depth-tested, no depth write, DoubleSide with `forceSinglePass` (otherwise three.js draws it twice). Each belt's peak linear luminance is its Planet's band stroke token's own (`stroke-rest-dark` ~0.026, `stroke-near-dark` ~0.061), pinned against the tokens; hue `realism-belt` divided by its luminance, the same for every belt. Static: no time uniform, no particles, no threshold, so nothing changes with `reducedMotion()`.
- **Crossfade (9.10):** the one existing fade uniform becomes a crossfade; realism rises and the replaced line-work falls, together and whole, never Body by Body.
- **Nebula (built in 9.7):** one additive, noise-shaded ribbon mesh (`BufferGeometry`/`ShaderMaterial`/`Mesh` named `nebula`) along exactly `railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT)`, sampled by `realism-mount.tsx` and handed to the owner as `RealismArtifact.railLine`, so `realism/` imports no Rail code. Half-width 3, turned to the camera in the vertex stage with a degenerate fallback; depth-tested, no depth write, DoubleSide with `forceSinglePass`, at `NEBULA_RENDER_ORDER` 1.1, on the layer's one fade. Hue `realism-nebula` divided by its luminance at a peak of 0.0076: over the void it decodes to about 0.01252 against `stroke-dust-dark`'s 0.01255 (essentially no headroom), a Mote label keeps about 4.9:1, and stacked under two near glows (or the subject's and a near one) it stays under `stroke-active` (or `stroke-focus`) for every pair of tints, all for one layer of ribbon; self-overlap on screen is 9.11's to check. Density is a `smoothstep` over a periodic fbm with a sine-free hash, no threshold; the drift holds under `reducedMotion()` and wraps on the period. The Rail hairline falls on `lineWorkFade()` with the Star marks and orbits.
- **Tokens** (placeholders, tuned on screen, normalised under the ceiling, read only by `realism/`): `realism-star-blue #A9BFFF`, `-white #F8EDD8` (warmed from `#F4F1EA` by the 9.5 review, Thomas, 2026-11-18, so a resting Star never reads as the subject's white), `-yellow #FFE6B0`, `-orange #FFC27A`, `-red #FF9A5C`, `realism-nebula #4A5A7A`, `realism-belt #6E6A62`. Each story declares its tokens in DESIGN.md's frontmatter (and so the generated outputs): 9.5 declared the five tints and retired `realism-star-glow`; 9.6 `realism-belt`; 9.7 `realism-nebula`.
- **Must-stay-unchanged:** `mote-field.tsx` left the list in 9.3 (it hands the Mote label pass `sceneLabelObstacles`); `mote-model*` and `mote-label.ts` stay on it, pinned by `auditMoteField`.
- **Code placement:** new shaders go in the lazy `realism` chunk. The crossfade wiring touches the `scene` chunk.
- **Tests to update:** the identity audit, `credits.test.ts`, the render-order pins and the draw-call counts.
- **Audits:** M2 audits change only where they must, each change naming its one allowance. In 9.10 every audit passes: render order, draw calls, luminance ceiling, achromatic (`realism-*` prefix only), reduced motion, bundle.

## UX & Interaction Patterns

- Under realism a Star has no circle and no core dot; one Star is white per frame, never two.
- **Client names (built in 9.3) must survive every later story:** `scene-label-client`, `ink-lift` for the subject and `ink-label` when receded; opaque `surface-base` plate 1px past the text, no edge, radius, shadow or fade. A name is hidden, never faded or moved, when its box enters the outer 12% of the frame, crosses the panel edge while a Project is Focused, its Star is behind the camera, its plate meets another Body's disc (a Deep Planet's out to its Ring or Moon, at any depth), or it meets the affordance or a stronger name (4px gap). Mote labels yield to shown names.
- Glow only on the Star sprite and the nebula, both under the ceiling; no bloom, no lens flare. Under realism, depth's first channel is the luminance of the replacing carriers, in ladder order.
- Ring disc: thin, tilted, semi-transparent. Moon: a small lit sphere.
- The stroke ladder remains the identity of the schematic frame, First Paint, the Fallback and the preview.

## Cross-Story Dependencies

- **Order:** 9.6 → 9.7 → 9.8 → 9.9 → 9.10 → 9.11 → 8.5.
- 9.5's tint feeds 9.4's Star look and glow. Client-name contrast must be rechecked under the tints (9.5) and over the nebula (9.7).
- The Client-name hide rule reads Body discs out to the Ring and Moon, so 9.8 must keep it correct.
- 9.10 completes the crossfade across the replacements from 9.4 and 9.6–9.9. It also owns a known artefact: during the fade the fills write no depth, so a belt's far side shows through a Planet's fill until the fade reaches 1.
- **9.11** builds its sheet in the 8.3 record (`nfr-2-record-8-3.md`) beside 8.4's section, which stays as written: build commit and chunk names, 8.4's four poses plus a Star close-up at both displays; 8.4's dark-ring point closed as superseded by 9.4, overlapping rest glows re-checked under tints. Carried over: fill over glow, half-disc Planets, the fill-tilt wording (now including the disc), Jupiter worn by none, and the plate and outline band (now also on Client plates). The agent writes no verdict and stops; `npm test` passes only once every field and named screenshot is present.
- A failed judgement returns to the tunable values of Epics 7 and 9; moving more line-work or adding a composer needs a new ruling. 8.5 needs a 9.11 pass. On the live site the Stars must show their names and tints, and the crossfade must be seen to happen.
