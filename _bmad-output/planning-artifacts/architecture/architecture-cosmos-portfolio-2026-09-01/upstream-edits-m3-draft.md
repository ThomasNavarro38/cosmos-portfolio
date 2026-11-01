# Upstream edits for M3: draft

Status: **draft, not applied.** `DESIGN.md`, `EXPERIENCE.md` and `prd.md` are unchanged. Date: 2026-11-01.

These edits bring the three source documents into line with the final spine (AD-12, AD-19 to AD-25) and Thomas's rulings of 2026-11-01. They change wording only and make no new product decision, except the one marked in "Needs a ruling". Sally owns `DESIGN.md` and `EXPERIENCE.md`, and John owns `prd.md`.

Each "Now" block is verbatim and occurs exactly once in its document. Line numbers are those at commit 565d32b.

## What changed from the reconcile list

`reviews/review-reconcile-m3.md` lists 35 sentences, but it was written before the last five rulings.

- **Four sentences no longer need an edit (#10, #11, #19, #34).** They all describe the link preview, and AD-24 now keeps the schematic card.
- **The other 31 are covered below,** and each edit names its reconcile numbers.
- **Six passages are added.** They are D28-29, D428-430, D475, P122, P413's definition of the realism pass and E1098.
- **No edit is needed for the rest of the reconcile's conditional list:** D457, D728, D1086, E458, E827-828, P54, P405, D1061-1062, D1075-1076 and E725. The luminance ceiling and the schematic card keep them true.
- **No edit is needed for P505 and P565.** They plan "shaders and post-FX" for M4, not M3. Using a composer at M4 would still need a new ruling and reopened budgets.

## Needs a ruling

**Light values for the `realism-*` tokens (edit D6).** The token generator requires a light value for every colour, but realism is dark-only, and `DESIGN.md` says its light values "are real, not placeholders". I recommend a named exception: each `realism-*` token carries a placeholder light value, and the document says so. The alternative is teaching the generator to allow dark-only tokens, which is more code to protect a theme that has no milestone.

## DESIGN.md

### D0: frontmatter date

```text
updated: 2026-09-01
```

```text
updated: 2026-11-01
```

### D1: L20, frontmatter description (#1)

```text
  and thirteen pixels; there is no chromatic accent anywhere. White is a scarce
```

```text
  and thirteen pixels; there is no chromatic accent in the line-work or on any
  DOM surface, and only the M3 realism layer carries colour. White is a scarce
```

### D2: L28-29, token comment

```text
# direction-02-draughtsman. Light is not built at M2. It is declared so the
# theme is later a token swap and not a redesign.
```

```text
# direction-02-draughtsman. Light is not built at M2. It is declared so the
# theme is later a token swap and not a redesign, for the line-work and the DOM
# surfaces. M3 realism is dark-only; a light scene needs its own decision.
```

### D3: L369-370 (#2)

```text
and every Body. There is no chromatic accent anywhere in the system — not one
hex in the palette has a hue. Type sits at nine and thirteen pixels and rises
```

```text
and every Body. There is no chromatic accent in the line-work or on any DOM
surface — no stroke, ink or surface hex has a hue. Colour lives only in the M3
realism layer and encodes nothing. Type sits at nine and thirteen pixels and rises
```

### D4: L393-401, the attachment surface (#3, #4, #5)

```text
The realism pass is M3 and it must attach without invalidating this system. It
attaches at exactly three points, and nowhere else:

1. **Body fill.** Every Body is `fill: none` at M2. A texture map takes that
   slot. Stroke, ring, moon and label geometry are unaffected.
2. **The Dust medium.** The radial-gradient medium becomes a volumetric.
   Particle count, colour and the never-fog rule (FR-15) carry over unchanged.
3. **The vignette.** The vignette term is replaced by real optics. Its role —
   see §5 — is already exactly what a lens does.
```

```text
The realism pass is M3 and it must attach without invalidating this system. It
attaches at exactly two points, and nowhere else (AD-19):

1. **Body fill.** Every Body is `fill: none` at M2. At M3 a Planet's fill is a
   colour texture map, lit by its own Star so it has a lit and a dark side
   (AD-20). A Star's fill is procedural and unlit. Stroke, ring, moon and label
   geometry are unaffected.
2. **Star glow.** Each Star gets one additive glow sprite, drawn beneath the
   fills.

At rest no fill or glow exceeds `stroke-active`. Only the current subject's Star
may rise above that, and never above `stroke-focus`, so white is still spent once
per frame (AD-20). Every label keeps its contrast floor over a fill or glow.

M3 adds no post-processing. The Dust medium stays exactly as M2 draws it, and the
vignette stays the CSS overlay.
```

### D5: L410-413, §2 opening (#6)

```text
Every colour in this system is achromatic. That is not a limitation carried
from the greybox; it is the identity. A hue introduced anywhere would become
the loudest thing on screen and would immediately read as decoration in a
product whose whole argument is structure.
```

```text
Every colour in the line-work, Dust and the DOM surfaces is achromatic. That is
not a limitation carried from the greybox; it is the identity. A hue introduced
into any of them would become the loudest thing on screen and would immediately
read as decoration in a product whose whole argument is structure. The one
exception is the M3 realism layer: the pixels of a texture map and the
`realism-*` tokens. They sit beneath the line-work and encode nothing (AD-12,
AD-21).
```

### D6: L428-430, light/dark pairs (needs a ruling)

```text
that shipping light later is a token swap rather than a redesign. Do not
hardcode a hex anywhere in the build; reference the token. A build that
hardcodes `#08080A` has already broken the light theme before it exists.
```

```text
that shipping light later is a token swap rather than a redesign, for the
line-work and the DOM surfaces. Do not hardcode a hex anywhere in the build;
reference the token. A build that hardcodes `#08080A` has already broken the
light theme before it exists.

**The one exception is the `realism-*` family (M3).** Star glow and the ambient
floor are the only hued tokens, and the achromatic audit exempts that prefix and
nothing else (AD-12). Realism is dark-only, because additive glow and a dark side
both assume a dark void. Each of these tokens still has a bare light key because
the generator requires a pair, but that value is a placeholder. A light theme
would need its own decision for the scene, not a token swap.
```

### D7: L474-475, the ink ladder

```text
stroke never borrows an ink token, even where the hex is the same — the two
ladders are separately tunable and will diverge at M3.
```

```text
stroke never borrows an ink token, even where the hex is the same — the two
ladders are separately tunable.
```

### D8: L650-653, §5 shadows (#7)

```text
**There are no shadows in this product.** Not on the panel, not on a label, not
on a Body, not on the Fallback. A drop shadow implies a light source and a
surface, and this system has neither: it is line-art in a void. A single
`box-shadow` anywhere breaks the idiom more completely than a wrong hex would.
```

```text
**There are no drop shadows in this product.** Not on the panel, not on a label,
not on the Fallback, and no Body casts a shadow on another. A drop shadow implies
a light source and a surface, and the line-art has neither. A single `box-shadow`
anywhere breaks the idiom more completely than a wrong hex would. The one shading
in the system is a Planet's dark side at M3, which is lighting from its own Star
and belongs to the realism layer (AD-20).
```

### D9: L670-671, the vignette (#8)

```text
   like a box), and it is the exact term that M3's real lens optics will
   replace. It is also the reason the "no readable label near the frame edge"
```

```text
   like a box), and M3 keeps it as it is, as the CSS overlay (AD-19). It is
   also the reason the "no readable label near the frame edge"
```

### D10: L679-681, glow (#9)

```text
Depth is never carried by scale-on-hover, blur, opacity fades on Bodies, or
any form of glow. Glow in particular is forbidden: it is the single most common
way a schematic space scene degrades into a screensaver.
```

```text
Depth is never carried by scale-on-hover, blur, opacity fades on Bodies, or
any form of glow. Glow in particular is forbidden: it is the single most common
way a schematic space scene degrades into a screensaver. The one exception is
M3's Star glow sprite, held under the luminance ceiling (§1, AD-20).
```

### D11: L1099-1104, Don't list (#12, #13, #14)

```text
- **No shadows.** Not one, anywhere, at any milestone.
- **No hue.** Not an accent, not a status colour, not a syntax highlight, not a
  hover tint. The palette is achromatic by design and one hue would become the
  loudest thing in the product.
- **No glow, no bloom, no lens flare at M2.** These are M3 post-FX and applying
  them early is the fastest route from schematic to screensaver.
```

```text
- **No drop shadows.** Not one, anywhere, at any milestone. No Body casts a
  shadow on another; a Planet's dark side at M3 is lighting (§5).
- **No hue outside the M3 realism layer.** Not an accent, not a status colour,
  not a syntax highlight, not a hover tint. The line-work, Dust and every DOM
  surface are achromatic by design, and one hue there would become the loudest
  thing in the product.
- **No glow at M2, and no bloom or lens flare at M2 or M3.** M3's one glow is the
  Star sprite (§1). Reaching for more is the fastest route from schematic to
  screensaver.
```

## prd.md

### P0: frontmatter date

```text
updated: 2026-10-30
```

```text
updated: 2026-11-01
```

### P1: L118, FR-3 (#15)

```text
Body appearance derives from data via exactly three rules: mass from duration, brightness from recency, distance from the Rail by relevance.
```

```text
Data reaches Body appearance through exactly three rules: mass from duration, brightness from recency, distance from the Rail by relevance.
```

### P2: L122, FR-3 consequence

```text
- A more recent entry renders brighter than an older one.
```

```text
- A more recent entry's outline renders brighter than an older one's.
```

### P3: L124, FR-3 consequence (#16)

```text
- No fourth mapping rule exists.
```

```text
- No fourth mapping rule exists. M3's map, tilt and spin are assigned from the entity ID and encode nothing, so they are not a mapping rule (AD-21).
```

### P4: L343, FR-20 (#17)

```text
The site presents a deliberate monochrome Schematic Identity across scene and information layer. Realises UJ-1.
```

```text
At M2 the site presents a deliberate monochrome Schematic Identity across scene and information layer. At M3 the line-work, Dust and the information layer stay monochrome, and colour enters only through the scene's realism layer (AD-12, AD-19). Realises UJ-1.
```

### P5: L351, FR-20 out of scope (#18)

```text
- Photographic textures, realistic lighting, and post-processing. These are M3, and M3 is now an upgrade to a live site rather than a launch gate.
```

```text
- Photographic textures and realistic lighting. These are M3, and M3 is now an upgrade to a live site rather than a launch gate. M3 itself has no post-processing (AD-19).
```

### P6: L413, NFR-2 defines the realism pass

```text
with the full M3 realism pass running.
```

```text
with the full M3 realism pass running: Body fills and Star glow, with no post pass (AD-19).
```

### P7: L413, NFR-2 (#20)

```text
would cost texture resolution and post-FX, both of which serve realism.
```

```text
would cost texture resolution and lighting, both of which serve realism.
```

### P8: L413, NFR-2 (#21)

```text
M3 does not pass NFR-2 until it is measured on a target-profile machine; a run on any other hardware is not a pass.
```

```text
M3 does not pass NFR-2 until it is measured on a target-profile machine; a run on any other hardware is not a pass. **M3 may go live before that** (Thomas, 2026-11-01), behind CI-enforced budgets and recorded as "not yet passed". A budget is never a pass (AD-23).
```

### P9: L423, not tradeable (#22)

```text
**These are not launch gates.** They had been functioning as preconditions to existing, which is what kept the finish line receding. Reconciling them was Flag 03.
```

```text
**These are not launch gates.** They had been functioning as preconditions to existing, which is what kept the finish line receding. Reconciling them was Flag 03. M3 going live before NFR-2 is measured does not trade runtime framerate away: the gate stays open until a target-profile run closes it (AD-23).
```

### P10: L427, realism is borrowed (#23)

```text
The visual bar is met with NASA/ESA public-domain texture maps, drei built-ins, and post-processing film artifacts — not with authored 3D models.
```

```text
The visual bar is met with NASA and USGS texture maps, each admitted and credited one by one (AD-21), one shared sphere, and one light direction per Planet — not with authored 3D models. ESA material and any other CC-licensed or author-copyright set is refused, and M3 has no post-processing (AD-19).
```

### P11: L461, out of scope for MVP (#24)

```text
- **Realism pass** — textures, lighting, post-processing. **M3.**
```

```text
- **Realism pass** — textures and lighting, with no post-processing (AD-19). **M3.**
```

### P12: L488, milestone table (#25)

```text
| M3 | Realism pass — textures, lighting, post-FX | NFR-2, NFR-2a | Does it hold NFR-2 on the target hardware profile? *(Unrunnable until a target-profile machine is available — §5 NFR-2.)* |
```

```text
| M3 | Realism pass — textures and lighting, no post-FX | NFR-2, NFR-2a | Does it hold NFR-2 on the target hardware profile? *(Unrunnable until a target-profile machine is available — §5 NFR-2. M3 may go live with this unanswered, recorded as "not yet passed".)* |
```

### P13: L519, SM-5 (#26)

```text
locked framerate at M3 (NFR-2), on the target hardware profile rather than the dev machine.
```

```text
locked framerate at M3 (NFR-2), on the target hardware profile rather than the dev machine. Not yet shown at M3 until a target-profile run exists (AD-23).
```

### P14: L580, deferred for architecture (#27)

```text
- "Full post-FX" in NFR-2 is undefined until the M3 architecture names the realism stack. NFR-2's threshold (ratified 2026-10-30) applies to whatever that stack becomes; the architecture should define it with the 30fps window in view, not after.
```

```text
- ~~"Full post-FX" in NFR-2 is undefined until the M3 architecture names the realism stack.~~ *Resolved 2026-11-01 by AD-19: "full post-FX" means no post pass, and the realism stack is Body fills and Star glow. NFR-2's threshold applies to that stack, and AD-23 sets its budgets.*
```

## EXPERIENCE.md

### E0: frontmatter date

```text
updated: 2026-09-01
```

```text
updated: 2026-11-01
```

### E1: L226, copy place 4 (#28)

```text
4. The Colophon's annotations on the mapping rules, its statement of what is not there, and the framing of its live re-solve (§4.7).
```

```text
4. The Colophon's annotations on the mapping rules, its statement of what is not there, the framing of its live re-solve (§4.7), and at M3 its one statement that a Planet's appearance is assigned, with the map credits (AD-21; exact wording ruled when that story is built).
```

### E2: L381-382, Colophon (#29)

```text
3. **Nothing is authored twice.** Every value on the page comes from the JSON at
   render time. There is no hand-maintained copy of any number.
```

```text
3. **Nothing is authored twice.** Every career value on the page comes from the
   JSON at render time. There is no hand-maintained copy of any number. M3's map
   credits come from the one map library (AD-21), and they are not career data.
```

### E3: L524-526, no 3D error state (#30)

```text
- **No 3D error state.** Capability is detected *before* rendering (FR-22), so
  no visitor ever sees a failed or degraded scene. The Fallback is served
  instead, and it is a designed view rather than an apology.
```

```text
- **No 3D error state.** Capability is detected *before* rendering (FR-22), so
  no visitor ever sees a failed scene. The Fallback is served instead, and it is
  a designed view rather than an apology. If M3's realism layer fails to load,
  the schematic scene simply stays, with no error, no retry and no message
  (AD-22). The visitor is not told that realism is missing.
```

### E4: L527-528, no offline state (#31)

```text
- **No offline state.** There is no backend and no network request for career
  data (FR-1, NFR-6). Once the page is loaded there is nothing to fail.
```

```text
- **No offline state.** There is no backend and no network request for career
  data (FR-1, NFR-6). Once the page is loaded, only M3's realism layer is still
  to arrive, and losing it leaves the schematic scene whole (AD-22).
```

### E5: L530, error surface (#32)

```text
The one genuine error surface is the contact route failing — see §7.5.
```

```text
The one error surface a visitor ever sees is the contact route failing — see §7.5.
```

### E6: L538-539, motion and camera (#33)

```text
and in scope for launch; only textures, lighting and post-FX are deferred to
M3.
```

```text
and in scope for launch; only textures and lighting are deferred to M3, and M3
adds no post-FX (AD-19).
```

### E7: L1017, accessibility (#35)

```text
   remediation. The whole palette is achromatic, so this is free.
```

```text
   remediation. The line-work and every DOM surface are achromatic, so this is
   free; M3's colour encodes nothing and carries no part of the signal.
```

### E8: L1098, reduced motion

```text
- Parallax, drift, and idle orbital motion stop. Orbits are drawn, not animated.
```

```text
- Parallax, drift, and idle orbital motion stop. Orbits are drawn, not animated.
  M3's Planet spin stops too (AD-20).
```

## Stale lines in the spine

The spine is committed as finalized, and these lines are not edited. They are its own wording, and I found them while drafting this. None changes a decision.

| Line | Says | Proposed |
| --- | --- | --- |
| S35 | "At runtime nothing derives, nothing solves, and nothing computes a visual property" | "At runtime nothing derives from career data and nothing solves. Realism's light direction and spin are composition read off positions and time (AD-20)." |
| S252 | "no backend, no fetch, no auth; the contact route is the one genuine exception" | "no backend, no auth, and no fetch beyond M3's same-origin maps, which fail silently (AD-22); the contact route is the one error a visitor sees." |
| S358 | "35 sentences ... `reviews/review-reconcile-m3.md` lists each" | Point to this file, and say 31 sentences. |
| S361 | M4: AD-1 "is the only thing it must respect" | Add: "A post pass at M4 also needs a new ruling and AD-23's budgets reopened (AD-19)." |
