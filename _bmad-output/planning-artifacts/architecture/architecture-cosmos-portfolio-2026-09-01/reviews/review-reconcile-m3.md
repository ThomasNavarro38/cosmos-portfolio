# Reconciliation review: M3 realism pass (AD-19 to AD-24)

Date: 2026-11-01. Spine: `ARCHITECTURE-SPINE.md` (uncommitted, updated 2026-11-01), with `.memlog.md`. Sources read in full: `prd.md`, `DESIGN.md`, `EXPERIENCE.md`. The shipped code was read only to test whether a finding is real.

Line references: **P** is `prd.md`, **D** is `DESIGN.md`, **E** is `EXPERIENCE.md`, **S** is the spine, **M** is the memlog.

## Verdict

The mechanics landed (First Paint, budgets, no adaptive quality, reduced motion, NFR-5), but the visual discipline did not: nothing in AD-19 to AD-24 bounds how bright or how loud realism may be. That leaves the one-white rule, FR-3's recency reading, the label contrast floor and the "screensaver" guard unprotected. AD-24 also drops FR-24's honesty clause. The 'Upstream wording' item lists 11 of the 35 source sentences that the decisions contradict.

## Findings

### F1. High: realism has no luminance bound, so two binding rules fail without any ruling

**Source.**
- White once per frame: D457, D728, D1086, E458, E827-828.
- Brightness carries recency: P122; D459-469 ("modulates within the resting band"); D753-758.
- Brightness must not read as depth or worth: P193.
- Receding by ladder: D657-661.

**What the spine does.** AD-20 makes every Star "unlit and emissive, with one additive glow sprite", with no reference to camera state. AD-21 makes every Body's map arbitrary. AD-21 also says recency "stays on the outline's `luminanceBand`".

**Why it fails.** The resting outlines are `#2C2C33` to `#45454E`, drawn around a lit fill that can be far brighter than they are. Three things follow:
- Six emissive Stars can show six near-white objects in one frame, and receded Stars no longer recede.
- A pale map on an old Project out-reads a dark map on a recent one, so P122's test ("a more recent entry renders brighter") fails on real data. This is the same inversion D466-469 was written to stop.
- "Colour and surface encode nothing" is a statement about the data. Nothing stops a visitor reading brightness as meaning.

**Rulings.** M77 and M82 rule on colour and on keeping the line-work. Neither rules on luminance. M79 saw the risk and left it open.

**Fix: add to AD-20 and AD-21.**
- A Star's emissive level and glow follow its stroke state. Only the subject Star reaches peak, and receded Stars step down with the ladder.
- Library maps are normalised to one mean luminance, recorded in the manifest and checked by the gate.
- A Planet's fill is scaled by its emitted `luminanceBand`. No new data rule is needed, and recency is then visible on the fill.
- No realism pixel at rest exceeds `stroke-active`, so white stays scarce.

If Thomas prefers physical brightness, that is a ruling, and D457, D728, D1086, E458 and P122 join the upstream list.

### F2. High: AD-24 keeps FR-24's composition and drops its honesty clause

**Source.**
- P405: "Preview and title do not overstate what a mobile or Fallback visitor will receive."
- P54: "the preview image has to have been honest about that."
- D1061-1062, and D1075-1076: "nothing promises 3D or interaction".
- E725: the Fallback "must not, anywhere, tell the visitor they are missing something."
- E965-966: "never presented as a lesser destination".

**What the spine does.** AD-24 cards a full-colour, textured 3D render. Tom, the mobile Forward that SM-1 depends on, taps it and receives an achromatic flat chart. AD-21 confirms "The Fallback reads no appearance". This is the widest gap the product has ever had between card and chart, and it sits on the funnel's one mechanism.

**Rulings.** M88 accepted "recaptured by hand ... loosening FR-24", which relaxes the *match* to the opening frame. It does not address overstatement. AD-24's Binds cite FR-24, but its rule never mentions this clause.

**Also unaddressed by AD-24.**
- D-G5's ruled Q2 (a), both corner-chrome lines verbatim so the still shows `the chart` (D1073). This is the only thing in the card that carries the honesty today.
- The 1.91:1 opening framing, Q1 (b) (D1070-1071).
- The alt text in `index.html` lines 16 and 21 ("Six stars on a dark field, one of them white..."), which is pinned by the identity audit's `META_COPY` and becomes false if the capture changes.

**Fix: put the question to Thomas, with two options.**
- (a) Keep the schematic card, which is honest on both surfaces and keeps D-G5. AD-24 then shrinks to "the card stays schematic; FR-24's frame is the schematic first frame".
- (b) Rule the realistic card explicitly, and have AD-24 require chrome lines verbatim, D-G5's framing and new alt text in the same change. P405 and D1075-1076 then join the upstream list.

### F3. Medium-high: the tone guard and NFR-7 have no operative rule in M3

**Source.**
- Tone guard:
  - D1103-1104: "the fastest route from schematic to screensaver".
  - D680-681: glow as "the single most common way a schematic space scene degrades into a screensaver".
  - D378-379: "when in doubt, remove the mark" (an unratified assumption, D-A1).
  - P337: "signals structure over decoration to exactly this audience".
  - D411-413.
- Legibility:
  - P419: "A version of this site that is more beautiful and less legible is a worse version."
  - D497-508 and D533-538: the contrast floor is computed on flat grounds only.

**What the spine does.** The spine contains none of the words screensaver, restraint, legibility or contrast. NFR-7 appears only in its frontmatter and in AD-21's Binds, and AD-21's rule says nothing about reading. M12 inherited NFR-7 as the tie-breaker, and it did not survive into any M3 rule.

**Why it is real, not only wording.** Scene and Mote labels are drei `<Html>` DOM layers (`mote-field.tsx`, `affordance-field.tsx`), so they sit on top of whatever realism draws. The audited ratios assume `surface-base-dark`. A Client label sits under its Star, inside the glow. `ink-label` has 5.85:1 on the flat ground and an unmeasured value on a halo.

**Rulings.** M77 says the result "should feel realistic". That sets the goal, and it does not cancel the guard. Line 345 and line 346 of the spine defer judgement "on screen" but name no criterion, no poses and no record.

**Fix: add to AD-19.** "Realism yields to legibility (NFR-7): every readable label keeps its contrast floor against the realism behind it, and glow's reach and fill brightness are bounded to hold that. Structure stays the argument: where a value is in doubt, turn it down." Then add one human line to AD-23's record: Thomas's on-screen judgement at the opening frame, one Client stop and one Focus, against "realistic, not a screensaver" and the labels' contrast.

### F4. Medium: the upstream update is a build prerequisite, and the light theme is unowned

See also the light-theme section below.

**Source.**
- D420: "Every colour is declared as a semantic pair."
- D428: shipping light later "is a token swap rather than a redesign".
- D29: the same statement in the frontmatter comment.
- AD-12: DESIGN.md's frontmatter is the token source.

**What the spine does.** AD-12's amendment makes "Star glow and the ambient floor" tokens, while the Deferred list treats DESIGN.md as wording to update later.

**Why it blocks.**
- These tokens must be added to DESIGN.md's frontmatter before any unit can use them.
- The generator fails on "a colour without its pair" (`src/tokens/README.md` line 23), so each needs a light value, and nothing defines one.
- The identity audit requires every `-dark` colour token to have chroma below 0.02 (`src/identity-audit.test.ts`). A hued glow token therefore fails an audit that AD-19 says stays in force, and an exemption naming `realism/` cannot cover the token file. AD-12 does not say whether glow is achromatic.

**Fix.**
- In AD-12, state that glow and ambient tokens are achromatic pairs, or rule otherwise.
- Move the DESIGN.md frontmatter change from Deferred to the first M3 unit.
- Add the Deferred light-theme line proposed below.

### F5. Medium: two of AD-19's rules cannot be built as written

**(a) The own-marks guarantee misses the Star's core dot.** AD-19 says a fill never hides "its own Body's marks", and its stated mechanism is "its radius stays inside the outline". The core dot (D691-692, D723, "what makes a Star read as emitting") is drawn on the billboard plane through the Star's centre (`body-field.tsx`, `stroke-model.ts` `coreDots`) with depth testing on. A depth-writing sphere's near hemisphere is in front of that plane, so the dot fails the depth test. The radius rule does not help, because the dot is well inside the outline.

Fix: AD-19 names the mechanism for marks inside the outline: the Star's fill writes no depth, or the core dot ignores depth.

**(b) "Opacity 1 and write depth" conflicts with AD-22's fade.** AD-19 fixes fills at opacity 1. AD-22 fades the layer in. If fills write depth from the start of the fade, other Bodies' line-work behind them vanishes at once while the fill is still invisible, which is the popping E508 forbids and a cut under E545.

Fix: state how the fade and the depth write interact, for example a fade by shader uniform with occlusion arriving last, and test that no line-work disappears in one frame.

### F6. Medium: spine statements these ADs made stale

| Spine line | Says | Now |
|---|---|---|
| S35 | "At runtime nothing derives, nothing solves, and nothing computes a visual property" | AD-20 computes light direction at runtime, and spin is time-dependent. Amend the sentence, or emit the direction from `derive/`. |
| S245 | Runtime has "no fetch"; "the contact route is the one genuine exception" | AD-22 fetches maps and has a failure path. |
| S349 | M4: AD-1 "is the only thing it must respect" | P505 plans "shaders and post-FX" for M4, and AD-19 and AD-23 now hold full-screen passes at 0. |
| S141 (AD-13 title) | "Two files, one authored" | The texture manifest is a second hand-kept file. It is not career data, so FR-1 holds, but the AD should say so and name how `derive/` and `colophon/` read it. |

### F7. Medium-low: FR-3's "no fourth mapping rule" and the Colophon's copy limit

**FR-3.** P118 says "Body appearance derives from data via exactly three rules", and P124 says "No fourth mapping rule exists". AD-21 assigns a field actually named `appearance` from the entity ID. It is defensible as "assigned, not meaningful", and M88 accepted the assignment, but neither source line is on the Deferred list. A technical reader of the Colophon will notice a fourth derivation beside a claim of three, so the wording needs care. FR-21 (P365) and E375-378 keep the three rules as the exhibit.

**Colophon copy.** E226 enumerates what the Colophon may say, and E221 says "There is no sixth". AD-21 adds a licence credit and a sentence about assignment. E381 says "Every value on the page comes from the JSON", but the credit comes from the manifest. Fix: an upstream amendment, and the credit and sentence added to the identity audit's copy allowlist.

**Library size.** 14 Bodies today and at most 12 maps guarantee repeats, and Stars and Planets need different maps. AD-21 hashes "each Body" without saying the library is split by kind. Fix: one clause.

### F8. Low: signal occlusion is clean on today's data, but nothing guards it

AD-19 lets a fill hide another Body's line-work and FR-9 needs Moon and Ring at rest at every stop (E265, E565-568). I measured this with a scratch script: ray against sphere from the shipped `railPose` and `focusPose`, the committed artifact, 16:9, the fill taken at full outline radius.

| Poses | Result |
|---|---|
| All 7 rail keyframes | No Ring or Moon occluded |
| Rail sweep, 401 poses | 74 of 19,649 Ring and Moon samples occluded (73 Ring, 1 Moon), all on `project:sncf/client-referential` behind `client:sncf-connect-tech`, in transit only |
| Client stops 1 and 6 | Outline-only overlap on Shallow or foreign Bodies |
| Focus, 8 Planets at panel fraction 0.46 | No Mote orbit sample hidden, by the Focused Planet or any other fill |

So this is not a defect today. A re-solve (UJ-4) could change it with nothing failing, because this is what the "bad Shot throws no error" line at P301 warns about. Fix: add this check to `npm test` over the integer stops. The script models spheres only and did not cover glow.

### F9. Low: smaller gaps

- **Silent failure against E524-526.** "No visitor ever sees a failed or degraded scene." A failed map load leaves a schematic scene with no signal. M88 accepted this, so it is on the upstream list below, not a defect. P415's point, that a viewer judges the lesser render unaware, is the cost being accepted.
- **Dust motion.** E1098 stops drift and idle motion under reduced motion. AD-20 holds spin, but AD-19 does not say whether the noise-textured medium moves. M2's Dust is static. Add: "if it moves, it holds still under `motionPace`, as spin does."
- **Frame stability.** P415 and E972-973 say a stable rate reads smoothly and a fluctuating one reads as broken. AD-23 covers no adaptation, and nothing covers stability. AD-22's main-thread upload and compile stall is excused from sampling. That is reasonable for the latch, but it is exactly the kind of hitch the sentence warns about, and it falls in the opening seconds (NFR-1a). Name it as an accepted cost.
- **Ink and stroke ladders.** D474-475 says they "will diverge at M3". AD-19 keeps both at token value. This is harmless, and the prediction should be removed.
- **Provenance.** AD-20 binds "Thomas's ruling of 2026-11-01", but own-Star-only lighting is the lean at M81 and M83 ("stands unless vetoed"), and the ruling at M77 says only "lit on the side facing their Star". The AD-21 and AD-22 defaults are "no objection" at M88. They stand, but the upstream offer should present them as accepted defaults.

## Thomas's 2026-11-01 rulings: source sentences they now contradict

The rulings stand. These are not findings. **35 sentences** need an upstream update. "Listed" means the sentence is covered by the spine's 'Upstream wording' Deferred item (S348): 11 are listed and 24 are not.

Ruling keys:
- **R-col**: colour and lit side (M77).
- **R-pass**: no composer (M86).
- **R-nfr**: ship unmeasured (M87).
- **R-def**: accepted defaults (M88).

M82 (line-work and Focus framing stay) contradicts nothing. It agrees with D396-397 and D403-404.

### DESIGN.md (14)

| # | Line | Sentence | Ruling | Listed |
|---|---|---|---|---|
| 1 | D20 | "there is no chromatic accent anywhere." | R-col | yes |
| 2 | D369-370 | "There is no chromatic accent anywhere in the system" | R-col | yes |
| 3 | D393-394 | "It attaches at exactly three points, and nowhere else" (glow sprite added, vignette removed) | R-pass | **no** |
| 4 | D398 | "The radial-gradient medium becomes a volumetric." | R-def | yes |
| 5 | D400-401 | "The vignette term is replaced by real optics." | R-pass | yes |
| 6 | D410-413 | "Every colour in this system is achromatic ... A hue introduced anywhere" | R-col | yes |
| 7 | D650-653 | "There are no shadows in this product ... implies a light source and a surface, and this system has neither" | R-col | yes |
| 8 | D670-671 | "the exact term that M3's real lens optics will replace" | R-pass | yes |
| 9 | D679-681 | "or any form of glow. Glow in particular is forbidden" (Star glow sprites) | R-pass | **no** |
| 10 | D1058-1060 | The preview composed with "one white Client Star, the Rail at `stroke-dust`, corner chrome" | R-def | **no** |
| 11 | D1068-1073 | D-G5: "drawn by `scripts/preview.ts` ... captured once" (composer retired) | R-def | **no** |
| 12 | D1099 | "No shadows. Not one, anywhere, at any milestone." | R-col | yes |
| 13 | D1100-1102 | "No hue ... one hue would become the loudest thing" | R-col | yes |
| 14 | D1103-1104 | "These are M3 post-FX" (glow is now a sprite; bloom and flare are out of M3) | R-pass | **no** |

### prd.md (13)

| # | Line | Sentence | Ruling | Listed |
|---|---|---|---|---|
| 15 | P118 | "via exactly three rules" (`appearance` field) | R-def | **no** |
| 16 | P124 | "No fourth mapping rule exists." | R-def | **no** |
| 17 | P343 | "deliberate monochrome Schematic Identity across scene and information layer" (needs an M2 scope) | R-col | **no** |
| 18 | P351 | "Photographic textures, realistic lighting, and post-processing. These are M3" | R-pass | **no** |
| 19 | P404 | "The opening frame is composed ..." (AD-24 moves the frame to the settled one) | R-def | yes |
| 20 | P413 | "would cost texture resolution and post-FX, both of which serve realism" | R-pass | **no** |
| 21 | P413 | "This is an **M3 gate**" (M3 goes live with it unpassed; "M3 does not pass until measured" survives unchanged) | R-nfr | **no** |
| 22 | P423 | "Not tradeable (quality gates for the finished artifact): ... runtime framerate" | R-nfr | **no** |
| 23 | P427 | "NASA/ESA public-domain texture maps, drei built-ins, and post-processing film artifacts" | R-pass, R-def | yes |
| 24 | P461 | "Realism pass — textures, lighting, post-processing." | R-pass | **no** |
| 25 | P488 | M3 row: "textures, lighting, post-FX" and its gate | R-pass, R-nfr | **no** |
| 26 | P519 | "locked framerate at M3" | R-nfr | **no** |
| 27 | P580 | "Full post-FX ... undefined until the M3 architecture" (now answered by AD-19, close it) | R-pass | **no** |

### EXPERIENCE.md (8)

| # | Line | Sentence | Ruling | Listed |
|---|---|---|---|---|
| 28 | E226 | Copy place 4's list of what the Colophon says (credit and assignment sentence added; E221 "no sixth") | R-def | **no** |
| 29 | E381 | "Every value on the page comes from the JSON at render time." (credit comes from the manifest) | R-def | **no** |
| 30 | E524-526 | "no visitor ever sees a failed or degraded scene" (silent map failure) | R-def | **no** |
| 31 | E528 | "Once the page is loaded there is nothing to fail." | R-def | **no** |
| 32 | E530 | "The one genuine error surface is the contact route failing" | R-def | **no** |
| 33 | E538-539 | "only textures, lighting and post-FX are deferred to M3" | R-pass | **no** |
| 34 | E894-896 | The preview is "built from the same tokens as the scene" | R-def | **no** |
| 35 | E1017 | "The whole palette is achromatic, so this is free." (the structural claim in E1014-1016 still holds) | R-col | **no** |

### Still true, no update needed

- P48 and E824-825 ("monochrome"): AD-22 keeps the first frame schematic, though they describe only its first moments.
- P411: M2 is correctly named.
- D392 and D690: scoped "at M2".
- D396-397 and D403-404.
- D1037: about the palette, in the Colophon.
- E536-537 ("cinematic ... filmic"): now rests on the camera and the light alone, a loss but not a contradiction.
- P435.

### Conditional: these join the list only if Thomas rules that way

- D457, D728, D1086, E458, E827-828 and P122 (F1).
- P405, P54, D1061-1062, D1075-1076 and E725 (F2).
- D29, D420 and D428 (F4 and the light theme).

## Light theme

**Does DESIGN.md define a light theme for the scene? Only as colour values, with no behaviour, and it says nothing about realism.**

What exists:
- Every colour has a bare light value (D33-66), including the scene's own: `surface-base` `#F2EFE9` is explicitly "Page ground and scene ground" (D442), plus the stroke ladder and the `vignette`.
- A reserved serif (D71, D548-549).
- A statement that "M2 ships dark only" (D424), and that light is a "future light theme" (D27-29, D427) with no milestone.

What does not exist:
- Every `components.*` token references `-dark` only (D173-342).
- D432-436 and gap D-G1 (D1149) already concede the colour swap alone "will not reproduce direction 02", and that typography and stroke weight need their own decision.
- PRD and EXPERIENCE.md never mention a light theme. E288-289 and E458 name `-dark` tokens directly.
- The M3 attachment surface (D390-404) has no theme clause. In the code, `src/tokens/tokens.ts` carries the pairs and nothing switches them: there is no `prefers-color-scheme` or theme attribute.

**How realism behaves there: undefined, and the rulings make it harder.**
- The spine never uses the words "light theme".
- A lit Planet's dark side and an additive glow both assume a dark void. Additive glow on `#F2EFE9` nearly disappears.
- The maps are not tokens, so D428's "token swap" no longer covers the scene.
- `stroke-focus` inverts to `#16150F`, so "spend white once" (D1086) already has no literal meaning there.
- AD-12's new tokens need a light value at once (F4).

**Proposed spine line (Deferred).** "Light theme: unscheduled. M3 realism is dark-only. New realism tokens carry a placeholder light pair to satisfy the generator. If a light theme is scheduled, the scene needs its own decision (likely a dark scene on a light page, which contradicts D442's one ground), not a token swap."

The D428 sentence then goes to Thomas for an update.

## What landed

| Requirement | Where |
|---|---|
| NFR-1, First Paint schematic, nothing gates it (P411, E504) | AD-22, AD-7 amendment |
| Fade without popping (E508, UX-DR37) | AD-22, subject to F5(b) |
| NFR-2's window and one instrument (P413, P580) | AD-19, AD-23 |
| "Not a pass" off the target profile (P413) | AD-23 |
| NFR-2a, unchanged floor (P414) | AD-23 |
| NFR-3, quality holds, no adaptive quality (P415, E970) | AD-23 |
| FR-14, no connectors | Nothing added; AD-19's list is closed |
| FR-15, never fog, Dust keeps count and colour (D399, D851) | AD-19, AD-12; beneath fills, so cannot obscure a Body |
| FR-13, FR-12a, panel, Focus | Unchanged by AD-19 and AD-20 |
| FR-9, signal stays structural | AD-21, AD-19; F8 on guarding it |
| Attachment surface: stroke, Moon, Ring and label geometry unaffected (D396-397) | AD-19 |
| Reduced motion for spin and fade; routing independence (E1098, E1101-1106) | AD-20, AD-22, AD-8; F9 on Dust |
| NFR-5, no art decision on add | AD-21 (hash by ID); one exception: manual re-capture of the card |
| NFR-6, same origin, instrument sends nothing | AD-22, AD-23 |
| No modelling (P427) | AD-23's one shared sphere; implicit, never stated |
| No astronomical accuracy (P435) | AD-20 changes no position or scale |
| Licence, ESA question (M71) | AD-21 |
