---
title: "Sprint Change Proposal: the scene becomes the sky"
date: 2026-11-17
author: John (PM), with Thomas
trigger: "Story 8.4, Thomas's on-screen judgement: rejected (commit 8ae4c97)"
scope: Major
mode: Incremental
status: approved by Thomas 2026-11-17; proposals 1, 8 and 9 applied, 2–7 assigned to story 9.2
---

# Sprint Change Proposal: the scene becomes the sky

## 1. Issue Summary

On 2026-11-17 Thomas judged the M3 build `2adeaa5c20f9602250f5aed4c251b0927a301457` (entry `index-ClN-7EAw.js`, `scene-BK7T607y.js`, `realism-TxJryhhe.js`) at the four 8.4 poses and the keyboard band. He judged on an i9-14900KF, an RTX 4080 SUPER and a Samsung Odyssey Ark 55, in Chrome 157.0.8103.79. That machine is not the target profile. The verdict, recorded in `nfr-2-record-8-3.md`:

> Rejected. "The strokes look off (the rail track, planets and satelites orbits). The stars don't look real, the stroke around and the circle inside looks weird. The stars colors should change, it's always the same and doesn't feel real."

Clarified with Thomas during this workflow:

- The line-work reads as **a schematic laid over the realistic layer**.
- A Star should have **no outline and no dot**. It should have a bright core fading into its glow, limb darkening, an animated surface and a slow pulse.
- A Star should **keep its colour**, and **each Star may have its own**.
- **New request:** each Star should show its Client's name, so visitors know what it represents.

**Category:** a failed approach requiring a different solution (AD-19's "realism beneath the line-work"), plus one new stakeholder requirement (Client names in the scene).

**Why AC 8.4-3's route cannot absorb it:** that route allows only Epic 7's tunable values (map choice, ambient floor, glow and fade values, spin rates). Every point in the verdict is line-work, Star geometry or a new property, so each needs a memlog ruling.

**Evidence:** `_bmad-output/implementation-artifacts/judgement-8-4-{opening-frame,client-stop,focus,rail-2.8333,keyboard-band}.png`.

The screenshots are about 3820×866, a 32:9 frame, while every pose was confirmed at 1920×1080. 9.11 judges both, to separate the display's effect from the design's.

## 2. Impact Analysis

### Checklist record

| Item | Status | Finding |
|---|---|---|
| 1.1 Trigger | [x] | Story 8.4, verdict rejected. |
| 1.2 Problem | [x] | Failed approach plus a new requirement (above). |
| 1.3 Evidence | [x] | Verdict, five screenshots, follow-up answers. |
| 2.1 Current epic | [!] | Epic 8 cannot finish as planned. 8.5 is blocked on a passing verdict. |
| 2.2 Epic changes | [!] | New Epic 9. 8.5's gate moves to 9.11. |
| 2.3 Remaining epics | [x] | Only 8.5 remains, and it is amended (Proposal 8). |
| 2.4 New or obsolete epics | [!] | Epic 9 added. Nothing becomes obsolete. |
| 2.5 Order | [!] | Epic 9 is inserted between 8.4 and 8.5. |
| 3.1 PRD | [!] | FR-3's recency carrier and its assigned-properties list (Proposal 2). MVP goals unchanged. |
| 3.2 Architecture | [!] | AD-19, AD-20, AD-21, AD-22 and AD-23 amended (Proposals 3–5). Lens flare stays Deferred. |
| 3.3 UX | [!] | DESIGN.md §1, §2, §5, §6, §7.1, §7.2 and §8 (Proposal 6). EXPERIENCE.md copy place 4 (Proposal 7). |
| 3.4 Other artifacts | [!] | `sprint-status.yaml`, `epic-8-context.md` (regenerated after 9.2), and test pins: identity audit, `credits.test.ts`, render-order and draw-call counts. |
| 4.1 Direct adjustment | Viable | Effort high, risk medium. |
| 4.2 Rollback | Not viable | Epic 7's work is kept and built upon. |
| 4.3 MVP review | Partly | Goals hold and M3 grows; the documents are amended by ruling. |
| 4.4 Selected | [x] | Hybrid: new Epic 9 plus document amendments by ruling. |

### What the line-work carries, and where it moves

The strokes are not decoration, so none can be removed without a new carrier:

| Meaning | Today (line-work) | Under realism (Epic 9) |
|---|---|---|
| Recency (FR-3) | Outline brightness | A Star's light, a Planet's atmosphere rim, an orbit's debris belt, in the ladder's order |
| The subject | The one white stroke | The one white Star core or Planet rim |
| Depth | The five-step stroke ladder | The same order, in the carriers' luminance |
| Deep or Shallow (M2 gate) | Stroke Ring plus Moon dot | Ring disc plus moon sphere, both achromatic |
| The timeline | Rail bezier at `stroke-dust` | A nebula ribbon along the same curve |
| Belonging (orbit) | Ellipse at `stroke-rest` | A faint, wide, static debris belt |

### What does not change

- First Paint stays schematic (AD-22).
- If realism fails, the line-work stays (AD-25).
- The Fallback chart, phones and the link preview (AD-24) are unchanged.
- Dust is exactly as M2 draws it.
- There is still no post pass, composer, full-screen target, shadow map or scene light.
- There are no new runtime dependencies.
- Colour encodes nothing, and white is spent once per frame.

### Technical impact

- New shaders go into the `realism` chunk (8,560 of 24,000 B used).
- Client labels and the line-work crossfade touch the `scene` chunk (953,039 of 960,000 B used, about 7 KB left).
- Byte limits are measured in 9.1 and ruled in 9.2.
- New schema version: a Star gains `appearance: { tint, pulsePhase }`, and `solveLive` stays byte-identical.

## 3. Recommended Approach

**Hybrid: a new Epic 9, with the documents amended by memlog rulings.**

**Rationale:**
- All the work is additive. Realism takes over from the line-work only after arrival, so every protected surface (First Paint, Fallback, preview, failure path) is untouched by construction.
- Each data meaning keeps a carrier, so the M2 gate's two tests ("can I tell what's recent / what's worth reading?") still hold.

**Effort and timeline:**
- Effort is high: 11 stories.
- Risk is medium:
  - the M2 gate's Deep or Shallow test must survive the move to physical objects;
  - label contrast over tinted glows;
  - the `scene` chunk's headroom.
- M3's live date moves out by Epic 9's length.

**Alternatives set aside:**
- *Recede the strokes* (a lighter ladder under realism): keeps the schematic idiom Thomas rejected.
- *Lens flare*: forbidden by DESIGN §8 and AD-19, and needs a post pass. Not chosen.
- *Meteor streams on orbits, a star stream on the Rail*: both too close to Dust, which is the Skills display (FR-14).
- *Rollback of Epic 7*: contrary to the verdict.

## 4. Detailed Change Proposals

All nine were approved one by one on 2026-11-17. Proposals 2–7 are applied by story 9.2 together with the memlog rulings. Proposals 1, 8 and 9 are applied on approval of this document.

### Proposal 1: Epic structure (`epics.md`, `sprint-status.yaml`)

**NEW: Epic 9, The Scene Becomes the Sky.** Thomas rejected M3's judgement (8.4, 2026-11-17): the line-work reads as a schematic laid over the realism, and the Stars do not read as Stars. Epic 9 replaces each stroke, once realism has arrived, with a physical object that carries the same meaning, and names every Star. First Paint, the Fallback, the link preview and the failure path keep the line-work.

| Story | Delivers |
|---|---|
| 9.1 The cost spike | Prototypes a debris belt, a nebula ribbon and a ring disc in a throwaway branch. Measures bytes and draw calls against AD-23. Judged on the dev machine at 1080p and on the ultrawide. |
| 9.2 The rulings | Records the memlog rulings and amends the PRD, architecture and DESIGN/EXPERIENCE per Proposals 2–7, with 9.1's measured budgets. |
| 9.3 Client names on the Stars | DESIGN §7.1's label in the scene: `scene-label-client`, coloured by the ink ladder, on a `surface-base` plate, in every session. |
| 9.4 Stars that shine | Under realism: no outline or dot. A limb-darkened core into the glow, with slow granulation and a slow pulse (frozen under reduced motion). Recency sets the light; only the subject reaches white. |
| 9.5 A colour per Star | A five-step blackbody-like tint assigned from the ID by salt. Colophon copy place 4 updated (Proposal 7). |
| 9.6 Orbits as debris belts | A faint, wide, static band per orbit, all in one merged mesh. Recency sets its brightness. |
| 9.7 The Rail as a nebula | A wispy, slowly drifting noise ribbon along the Rail's curve, under the luminance ceiling. |
| 9.8 Deep Planets wear a ring and a moon | A tilted, semi-transparent ring disc and a lit moon sphere, both achromatic. |
| 9.9 The atmosphere rim | A Planet's outline becomes a limb rim in the fill shader. Recency sets its brightness; white only on the subject. |
| 9.10 The handover | One crossfade: line-work falls as realism rises, whole, and returns on failure. Reduced motion and all audits are covered. |
| 9.11 The second judgement | 8.4's sheet rebuilt for the new build, plus a Star close-up pose, at 1920×1080 and on the Odyssey Ark. Thomas judges; the agent stops. |

Epic 8: 8.5 depends on a passing 9.11 verdict. 8.4 stays done, its rejection on record.

### Proposal 2: PRD FR-3 (`prd.md:116-124`)

OLD:
```
- A more recent entry's outline renders brighter than an older one's.
- No fourth mapping rule exists. M3's map, tilt and spin are assigned from the entity ID and encode nothing, so they are not a mapping rule (AD-21).
```
NEW:
```
- A more recent entry renders brighter than an older one's. Before realism arrives (and wherever it does not), the carrier is the Body's outline; under realism it is a Star's light, a Planet's atmosphere rim and an orbit's debris belt. Each carrier keeps the same order, so the rule is one rule.
- No fourth mapping rule exists. M3's map, tilt and spin, and a Star's colour, are assigned from the entity ID and encode nothing, so they are not a mapping rule (AD-21).
```
Rationale: one rule, with a different carrier per layer. Star colour is explicitly not data. No MVP impact.

### Proposal 3: AD-19 (`ARCHITECTURE-SPINE.md:177-181`), appended amendment

```
*[amended 2026-11-17 for Epic 9, after the 8.4 rejection: once realism has arrived, it replaces the line-work rather than drawing beneath it. The realism layer is Body fills, Star light (the glow sprite and an emissive core), Planet atmosphere rims, orbit debris belts, the Rail's nebula ribbon, and a Deep Project's ring disc and moon sphere. As each arrives, `body-field.tsx`'s matching line-work fades to zero, and it returns if realism fails (AD-25). Before arrival, in First Paint (AD-22), on the Fallback and in the link preview (AD-24), the line-work is unchanged. What stays line-work in every session: the hover and keyboard affordance, leaders, label plates, Mote orbits and Dust (still exactly as M2 draws it). Under realism a Body's marks are its rim, ring disc and moon sphere, and its own fill never hides them. The nebula is a noise-shaded ribbon mesh, not raymarching, and still no post pass, composer or full-screen target exists. The draw order stays declared once in `scene-model.ts` and strictly pinned; 9.2 extends it with the nebula, belt, rim and ring slots measured in 9.1.]*
```
Rationale: keeps every performance guarantee and drops only "line-work drawn over realism". Lens flare stays Deferred (`:354`).

### Proposal 4: AD-20, AD-21, AD-22, appended amendments

AD-20:
```
*[amended 2026-11-17 for Epic 9: a Star stays unlit and emissive, with no map. Its core is procedural: limb-darkened from centre to edge into its glow, with slow granulation and a slow pulse whose phase comes from its ID. Granulation and pulse stop when `reducedMotion()` is true, read as spin is. A Star's light carries recency (its rest luminance follows its `luminanceBand`) and the subject (only `sceneSubject`'s core rises above `stroke-active`, and reaches `stroke-focus` at its centre alone). A Planet's atmosphere rim carries the same band, and white only on the subject. An orbit's debris belt carries its Planet's band. The pulse never leaves the band, so a dim Star never pulses brighter than a recent one at rest. The luminance ceiling holds for every new object, pinned by test.]*
```
AD-21:
```
*[amended 2026-11-17 for Epic 9: a Star now has an `appearance`, `{ tint, pulsePhase }`, assigned from its entity ID alone, `tint` chosen from a fixed blackbody-like palette declared as `realism-star-*` tokens (AD-12). It is emitted under a new `SCHEMA_VERSION`, with no authored field and no per-Body override; `solveLive` stays byte-identical. The tint never changes in time. Colour and surface encode nothing: recency is now on the luminance band's carriers (FR-3), the subject on the white core or rim, Deep/Shallow on the ring disc and moon sphere.]*
```
AD-22:
```
*[amended 2026-11-17 for Epic 9: the one fade is a crossfade. On the fade's uniform the realism layer rises and the line-work it replaces falls, together, whole. On failure the line-work stays at its token values.]*
```
Rationale: the Star look lives in the existing emissive shader. The pulse is capped inside the recency band. Star colour follows the Planet-map rule. The crossfade keeps "never Body by Body".

### Proposal 5: AD-23 budgets (`ARCHITECTURE-SPINE.md` budget table)

OLD: `| Added draw calls | 1 per Planet, 2 per Star, 0 for Dust | …`

NEW: `| Added draw calls | 1 per Planet (fill, its atmosphere rim inside the same shader), 2 per Star (core, glow), 2 per Deep Project (ring disc, moon sphere on the shared geometry), 1 for all debris belts together (one merged mesh), 1 for the Rail's nebula, 0 for Dust | pure model count, with a source audit tying the binding to it |`

Byte limits are unchanged now (`realism` 24,000 B, `scene` 960,000 B). If 9.1's measurement needs more, 9.2 records a ruling with the measured figure plus a stated margin.

### Proposal 6: DESIGN.md

- **§1 M3 attachment surface (`:405-425`):** realism attaches at Body fill and Star light, and once arrived it replaces the line-work it carries the meaning of:
  - outline and dot → core light;
  - Planet outline → atmosphere rim;
  - orbit → debris belt;
  - Rail → nebula;
  - Ring and Moon → ring disc and moon sphere.

  The stroke ladder remains the identity of the schematic frame, First Paint, the Fallback and the preview. Under realism its order survives in the carriers' luminance. Labels, leaders, plates, the affordance, Mote orbits and Dust are unaffected.
- **§2 tokens (`:70-75`, `:457-469`):**
  - `realism-star-glow` is replaced by `realism-star-blue #A9BFFF`, `-white #F4F1EA`, `-yellow #FFE6B0`, `-orange #FFC27A` and `-red #FF9A5C`.
  - `realism-nebula #4A5A7A` and `realism-belt #6E6A62` are added.
  - All are placeholders tuned on screen, normalised under the ceiling. A Star's glow takes its tint. The ring disc and the moon stay achromatic.
- **§5 Depth (`:719-723`):** under realism, depth's first channel is the replacing carriers' luminance, in ladder order. Glow is forbidden except the Star sprite and the Rail's nebula, both under the ceiling.
- **§6 the circle (`:731-734`):** under realism the core dot is gone; the limb-darkened core makes the Star read as emitting.
- **§7.1 Client Star (`:761-770`):** under realism, no circle or dot. A limb-darkened, granulating, pulsing core in its tint, fading into its glow. Luminance is recency; only the subject's core reaches white. The label is built in every session, on a `surface-base` plate (as 7.9).
- **§7.2 Deep/Shallow:** under realism the Moon is a small lit sphere and the Ring a thin, tilted, semi-transparent ring disc, both achromatic. Two structural channels, redundant and colour-blind safe, with no size or brightness.
- **§8 Don'ts (`:1158-1160`):** no bloom or lens flare at M2 or M3. M3's luminous objects are the Star sprite and the Rail's nebula, nothing more.

### Proposal 7: Colophon copy place 4 (`EXPERIENCE.md:228`, `src/colophon/credits.ts:31`, `credits.test.ts:41`, `identity-audit.test.ts:811,1358`)

Heading: `what a Planet looks like` → `what a Star and a Planet look like`

Statement, OLD:
```
A Planet's surface is not data. Each Planet is assigned one of the maps below from its ID alone, by a fixed rule in the solver, so its colour and texture encode nothing: recency is the outline's brightness, the subject is the white stroke, and Deep or Shallow is the Ring and the Moon.
```
Statement, NEW:
```
A Body's colour is not data. Each Planet is assigned one of the maps below, and each Star one of five colours, from its ID alone, by a fixed rule in the solver, so colour and texture encode nothing: recency is how brightly a Star shines and a Planet's rim glows, the subject is the one that turns white, and Deep or Shallow is the ring and the moon.
```
Ships in 9.5. The lead-in and the credits are unchanged.

### Proposal 8: Epic 8 and story 8.5 (`epics.md:494-517`, `:3087-3119`)

- **Standalone line:** "Requires Epic 7; **8.5 also requires Epic 9**. The 8.4 judgement was rejected (2026-11-17), and its points were ruled into Epic 9 by the Sprint Change Proposal of that date. A failed judgement from now on returns to the tunable values of Epics 7 and 9; moving line-work or adding a composer still needs a new ruling."
- **Dependency flow:** `Epics 1–6 (done) ─→ Epic 7 ─→ Epic 8 (8.1–8.4) ─→ Epic 9 ─→ 8.5`
- **8.5 first AC:** "the **9.11** verdict is a pass for the build being merged (8.4's rejection stays on record)"
- **8.5 new AC:** "**And** the live Stars show their Client names and their tints, and the crossfade from line-work to realism is seen to happen, not just the fade-in."
- `epic-8-context.md` is regenerated after 9.2.

### Proposal 9: Tracking, and what 9.11 inherits

- **`sprint-status.yaml`:** `epic-9` and 9-1…9-11 added as `backlog`, plus `epic-9-retrospective: optional`. 8-5 is annotated as blocked on 9-11.
- **8.4's seven routed looks, in 9.11's sheet:**
  - *the Star's dark ring* is **superseded** by 9.4;
  - *overlapping rest glows* is re-checked under tinted glows;
  - *fill over glow*, *half-disc Planets*, *fill-tilt wording* (now including the ring disc), *Jupiter worn by none* and *the plate and outline band* (now also on Client plates) are carried.
- **9.11's poses:** 8.4's four, plus a Star close-up, at 1920×1080 and on the Odyssey Ark.
- **The record:** 8.4's section stays as written; 9.11 adds its own.

## 5. Implementation Handoff

**Scope: Major.** It amends the PRD, the architecture spine and the design system.

| Role | Responsibility |
|---|---|
| PM (John) | Apply Proposals 1, 8 and 9 to `epics.md` and `sprint-status.yaml` on approval. |
| Developer (Amelia), via `bmad-build` | 9.1 spike, then 9.3–9.10 in order. |
| Architect (Winston) and UX (Sally), with Thomas | 9.2: record the memlog rulings and apply Proposals 2–7 with 9.1's measured budgets. |
| Thomas | Rules in 9.2; judges in 9.11; gives the go-ahead to merge in 8.5. |

**Sequencing:** 9.1 → 9.2 → 9.3 (independent, may run in parallel after 9.2) → 9.4 → 9.5 → 9.6 → 9.7 → 9.8 → 9.9 → 9.10 → 9.11 → 8.5.

**Success criteria:**
- Thomas's 9.11 verdict is a pass, at 1080p and on the ultrawide.
- Every FR-3 carrier keeps the ladder's order (tested), white is spent once per frame (tested), and the Deep or Shallow signal is structural and achromatic (tested).
- Every label keeps its contrast floor over the tinted glows and the nebula.
- First Paint, the Fallback, the preview and the failure path show the M2 line-work, unchanged.
- All of AD-23's budgets hold, or were raised by a recorded ruling with measured figures.
- The record still reads NFR-2 **not yet passed**.
