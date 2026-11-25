# Epic 9 Context: The Scene Becomes the Sky

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Thomas rejected M3 on screen (8.4, 2026-11-17): the line-work read as a schematic laid over the realism, and the Stars did not read as stars. Epic 9 fixes this on a capable machine. Once realism has arrived, each stroke is replaced by a physical object that carries the same meaning. Stars shine with a limb-darkened, granulating, pulsing core in a colour of their own. Orbits become faint debris belts and the Rail becomes a nebula ribbon. A Deep Planet wears a real ring disc and moon sphere, and a Planet's recency shows in its atmosphere rim. Every Star is named with its Client, in every session. First Paint, the Fallback, the link preview and the failure path keep the M2 line-work, and colour still means nothing. M3's merge to `main` (8.5) waits until Thomas passes this epic's second judgement (9.11).

## Stories

- Story 9.1: The cost spike (done)
- Story 9.2: The rulings (done)
- Story 9.3: Client names on the Stars (done; restyled by Thomas's ruling of 2026-11-25)
- Story 9.4: Stars that shine (done)
- Story 9.5: A colour per Star (done)
- Story 9.6: Orbits as debris belts (done)
- Story 9.7: The Rail as a nebula (done)
- Story 9.8: Deep Planets wear a ring and a moon (done)
- Story 9.9: The atmosphere rim (done)
- Story 9.10: The handover
- Story 9.11: The second judgement

## Requirements & Constraints

- **Delivery:** work continues on `m3-realism`, and nothing reaches `main` before 8.5. Each build story is held to the dated amendments (2026-11-17 onward) in the PRD, the spine and the design documents.
- **Invariants every story keeps:**
  - First Paint stays schematic. If realism fails, the line-work stays at its token values, with no error and no message.
  - The Fallback, phones and the link preview are unchanged. Dust stays exactly as M2 draws it.
  - No post pass, composer, full-screen render target, shadow map, scene light, raymarching or new runtime dependency.
  - Colour encodes nothing, and white is spent once per frame.
  - Every label keeps its contrast floor over fills, tinted glows and the nebula, checked on rendered pixels.
- **Recency (FR-3) is still one rule:** a more recent entry renders brighter. Without realism the outline carries it. Under realism a Star's light, a Planet's atmosphere rim and an orbit's belt (at its Planet's band) carry it, all in ladder order. Star colour comes from the ID, like map, tilt and spin, and is not a mapping rule.
- **Deep/Shallow (FR-9):** under realism a Deep Project has a ring disc and a moon sphere, and a Shallow one has neither. Both are achromatic, use neither size nor brightness, and stay readable at client-stop distance at 1080p.
- **Colophon (FR-21):** copy place 4 carries the heading "what a Star and a Planet look like" and the ruled statement, verbatim. Both shipped in 9.5 and are pinned by `credits.test.ts` and the identity audit.
- **Byte budgets:** the limits are `realism` 25,000 B (raised from 24,000 B by Thomas's ruling of 2026-11-22, for the belt's soft junction) and `scene` 960,000 B. The build at `d157b65` measures `realism` 24,786 B (214 B of headroom) and `scene` 958,465 B (1,535 B of headroom). The 2026-11-25 label restyle added about 500 B to `scene`. After 9.10 the build measures `realism` 24,786 B (214 B of headroom) and `scene` 958,632 B (1,368 B of headroom). 9.10 may add code only within that headroom, or after a new memlog ruling backed by a measured figure. Keep new code in the lazy `realism` chunk.
- **Draw calls the layer adds:**
  - 1 per Planet (the fill, with the rim inside its shader).
  - 2 per Star (core and glow).
  - 1 for all belts (`BELT_DRAWS_BUDGET`).
  - 1 for the nebula when the drawn Rail has two points or more (`NEBULA_DRAWS_BUDGET`).
  - 2 per Deep Project (`DEEP_PROJECT_DRAWS_BUDGET`).
  - 0 for Dust.
  - `addedDraws(planets, stars, railPoints, deepPlanets)` is 24 on the committed artifact.
- **Success:** 9.11 passes at 1920×1080 and on the Odyssey Ark (32:9). Tests cover ladder order, white once per frame and an achromatic, structural Deep/Shallow signal. The NFR-2 record still reads **not yet passed**.

## Technical Decisions

- **Replace, don't underlay:** once realism arrives, each piece of `body-field.tsx` line-work fades to zero as its replacement arrives, and it returns if realism fails. Each stroke maps to one replacement:
  - Star outline and core dot become the Star's core light.
  - Planet outline becomes the rim.
  - Orbit becomes the belt, and the Rail becomes the nebula.
  - Ring and Moon become the ring disc and the moon sphere.

  Some line-work stays in every session: the hover and keyboard affordance, leaders, Mote orbits and Dust. A Body's own fill never hides its rim, ring disc or moon sphere.
- **Crossfade (AD-22, 9.10):** the first frame is the M2 schematic frame. After a hidden warm draw, the layer fades in once, whole, never Body by Body, over `FADE_SECONDS × motionPace(reduced)`. The one fade uniform is a crossfade: the realism layer rises while the line-work it replaces falls, together and whole. During the fade the fills share the uniform and write no depth. On the frame the fade ends, all of them write depth at once. `realism-mount.tsx` stays the one added caller of `resetFrameSampling`. On failure the schematic scene stays, with no error, no retry and no message.
- **Line-work fade path (9.10 moved the write into the mount, on the same path):** `realism-mount.tsx`'s one frame callback calls `owner.frame(...)`, then writes every registered stroke at the owner's `lineWorkFade()`, read once, through `fadeLineWork`. `body-field.tsx` and `moon-field.tsx` only register their held marks by `holdLineWork`. Each replaced stroke falls on `1 - fade` on the same frame the layer draws `fade`. The stroke is whole when no layer exists, while the layer warms, and on the frame realism fails.
  - `line-fade.ts` holds the replaced strokes. `holdBodyMarks` holds every Body's billboard, Star or Planet. `holdReplacedLine` holds `orbit:*`, `rail` and `ring:`.
  - The Moon dots fall through `moon-field.tsx`'s pool.
  - All of it runs under one named `auditBodyField` allowance, plus a matching allowance in `auditMoonField`.
- **Draw order** is declared once in `scene-model.ts` and strictly pinned:
  `DUST 1 < NEBULA 1.1 < GLOW 1.25 < FILL 1.5 (+rim) < BELT 1.6 < RING_DISC 1.75 < BODY 2 < MOON 3 (+moon sphere)`.
  The nebula draws before the fills, so it never hazes a Planet. The belt is depth-tested after the fills, so its near side passes over its Planet.
- **Star look:** unlit and emissive. A procedural limb-darkened core blends into its glow, with slow granulation and a pulse phased from the ID. A Star's band is its Client's `luminanceBand`, and each band has a disjoint, ordered rest range under `stroke-active`. Only the subject's core reaches `stroke-focus`, at its centre alone.
- **Star appearance:** `starAppearanceOf` in `src/derive/appearance.ts` derives `{ tint, pulsePhase }` from the entity ID alone, under `SCHEMA_VERSION` 12, and `solveLive` stays byte-identical. `realism/` resolves the tint to `realism-star-<tint>-dark`. The tint never changes in time.
- **Belt:** one merged single-pass mesh, a flat annulus per Planet at 0.92–1.08 of its orbit radius. It is normal-blended, depth-tested and writes no depth. Its peak luminance is the Planet's band stroke token. It is static, with no particles, so it cannot read as Dust. It fades to 0 before its own Planet's sphere or fill disc (the soft junction, 2026-11-22), so its far side is hidden behind its own Planet at any fade.
- **Nebula:** one additive, noise-shaded ribbon along `railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT)`, handed to the owner as `RealismArtifact.railLine` so that `realism/` imports no Rail code. It is turned to the camera in the vertex stage, and its drift holds under `reducedMotion()`. Over the void its peak sits right at `stroke-dust-dark`, so it has no headroom.
- **Ring disc and moon:** every disc shares one annulus, from 1.35 body radii out to the Ring radius, tilted a fixed 0.7 rad from the camera's facing. The moon sphere sits on the shared sphere at the M2 Moon's place, at `MOON_RENDER_ORDER`. Placement matches the M2 marks, so the Client-name hide rule and `markPx` are unchanged.
- **Atmosphere rim:** an additive, achromatic limb term inside the fill shader, driven by a per-Planet `uRim` that `rimStep` writes in `realism/rim-model.ts`. The subject gets focus, the approached Planet gets active, and every other Planet gets its band. The ceiling becomes `max(CEILING, uRim × w)`. The rim switches instantly, but a Star's subject core rises over 0.6 s, so a Star-to-Planet subject change briefly shows both. 9.10 left it untouched, since a rim rise needs its own ruling; it is 9.11's to judge.
- **Motion:** granulation, pulse and nebula drift hold when `reducedMotion()` is true. They read it the way spin does, not through `motionPace`.
- **Tokens** are placeholders, read only by `realism/`: `realism-star-blue #A9BFFF`, `-white #F8EDD8`, `-yellow #FFE6B0`, `-orange #FFC27A`, `-red #FF9A5C`, `realism-nebula #4A5A7A`, `realism-belt #6E6A62`. They are declared in DESIGN.md's frontmatter, and the generated outputs follow from it.
- **Audits:** M2 audits change only where they must, and each change names its one allowance. The effects scan now has one more allowance: the identifier `textShadow`, in `src/render-scene/client-label-model.ts` only. No other blur, glow or shadow is admitted. In 9.10 every audit passes: render order, draw calls, luminance ceiling, achromatic (the `realism-*` prefix only), reduced motion and bundle.

## UX & Interaction Patterns

- Under realism a Star has no circle and no core dot. Only one Star is white per frame.
- **Client names (2026-11-25 look):** `scene-label-client` is set at 12px, weight 300, tracked 0.22em (it was 11px at 0.36em). The font stack is `"Helvetica Neue", "Segoe UI Variable Text", "Segoe UI", Helvetica, Arial`, so light weights render light on Windows. The subject's name is in `ink-lift`, and receded names are in `ink-label`.
- **Client name halo:** the opaque plate is gone. In its place is `CLIENT_LABEL_HALO`: two unoffset `text-shadow`s of the opaque `surface-base` at 1px and 2px, pinned within 2px. The ground at every glyph's edge is still the page ground, so the contrast floor holds. A wider, feathered halo was rejected because it smudged the glow.
- **Client name hide rule:** a name is hidden, never faded or moved, in each of these cases:
  - Its box enters the outer 12% of the frame.
  - It crosses the panel edge while a Project is Focused.
  - Its Star is behind the camera.
  - Its box meets another Body's disc (a Deep Planet's out to its Ring or Moon, at any depth).
  - It comes within 4px of the affordance or of a stronger name.

  Mote labels yield to shown names.
- Glow appears only on the Star sprite and the nebula, both under the ceiling, with no bloom and no lens flare. The ring disc is thin, tilted and semi-transparent. The moon is a small lit sphere.
- The stroke ladder remains the identity of the schematic frame, First Paint, the Fallback and the preview.

## Cross-Story Dependencies

- **Order:** 9.10, then 9.11, then 8.5. 8.5 needs a 9.11 pass. On the live site the Stars must show their names and tints, and the crossfade must be seen to happen.
- **9.10** completes the crossfade over the replacements from 9.4 and 9.6–9.9: the line-work and the layer change on the same frame, from one read. Its known artefacts are accepted under AD-22 (2026-11-25) and left to 9.11 to judge: while the fills write no depth during the fade, a far disc, a moon, the nebula, or a belt behind a sibling Planet shows through a nearer fill until the fade reaches 1; and the M2 Moon dot and the moon sphere, which share `MOON_RENDER_ORDER`, may alternate while both are partly drawn. A belt behind its own Planet no longer shows the first artefact.
- **9.11** builds its sheet in `nfr-2-record-8-3.md`, beside 8.4's section, which stays as written. The sheet names:
  - The build commit and chunk names.
  - 8.4's four poses plus a Star close-up, at both displays.
  - 8.4's dark-ring point, closed as superseded by 9.4.
  - Overlapping rest glows, re-checked under the tints.
  - The carried-over looks.
  - The new Client-name look and halo over the glows.

  The agent writes no verdict and stops. `npm test` passes only once every field and every named screenshot is present.
- A failed judgement returns to the tunable values of Epics 7 and 9. Moving more line-work, or adding a composer, needs a new ruling.
