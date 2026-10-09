---
title: 'Mote tiering and label legibility'
type: 'feature'
created: '2026-10-09'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'd5007877e44dd0f52fa5e2e48c0ee03fc0fd17d6'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A focused Project's Motes are placed by authored list position. They all have one size, and their labels are monospace in a stroke-step ink. There is no orbit line and no cap on labels. The Skills are not in the DOM. At 25 Skills (`sncf/client-referential`), the labels overlap each other and the canvas edges.

**Approach:** Derive emits a per-Skill tier from share count (D-A4, ratified by Thomas 2026-10-09). The renderer maps tier to orbit, dot radius and fill, and draws three `stroke-dust` orbit lines. Labels are placed by a prominence-ordered greedy pass with a label cap, which is the degradation rule (Thomas, 2026-10-09). The panel gains a static Skills `<ul>`.

## Boundaries & Constraints

**Always:**
- Artifact `schemaVersion` 6 with a new top-level `skills: [{ name, tier }]`:
  - One entry per distinct Skill name across every Project.
  - Ordered by share count descending, then name ascending.
  - `tier` comes from `SKILL_TIERS = ['mote-inner', 'mote-middle', 'mote-outer']`: shared by ≥3 Projects → inner, 2 → middle, 1 → outer.
  - A gate check names any missing, extra, duplicate, misordered or mistiered entry.
- Per-Project `moteTier` stays as it is. Nothing new is authored.
- Renderer classification:
  - The renderer reads `skills` as a lookup and never counts shares itself.
  - tier index = orbit index (inner = `MOTE_ORBIT_RADII[0]`).
  - Each Mote's seat comes from its rank in `skills`. On each orbit the slots are even and never adjacent, with `max(MOTE_MIN_SLOTS, 2k)` slots.
- Dots:
  - Screen-constant radius of 2.6 / 2.1 / 1.8 px by tier, times the existing level scale.
  - Fill `stroke-active` (tier 1) or `ink-label` (tiers 2 and 3), per DESIGN.md `mote`.
- Labels: the `mote-label` typography token in `ink-label`, with the width estimate re-derived from that token.
- Label pass, per frame, visiting the focused Project's Motes in `skills` order. A label is shown only when all of these hold:
  - the pass is under `MOTE_LABEL_LIMIT` (12);
  - its estimated box lies inside the canvas on all four edges and left of the panel edge;
  - it clears every label already shown by `MOTE_LABEL_CLEARANCE_PX`.
- Panel blocking and re-slotting stay as they are. A label hidden by the cap or by overlap is not re-slotted.
- The cap and the ordering live in one replaceable function, so a later degradation rule swaps in without a redesign.
- Orbit lines: only orbits holding a Mote are drawn. Each is a full circle on the orbit's tilt at `stroke-dust` and `hairline`, with opacity equal to the highest level of any Mote on that orbit.
- Panel: a `skills` block between `fields` and `release`, rendered as `<ul aria-label="Skills">` in the Project's authored order (deduplicated). Static, with no live region.

**Ask First:** Any npm dependency. Any edit to `career.json` or DESIGN.md. A change to click/focus semantics or to the index.

**Never:**
- A label below `ink-label`, or any `stroke-*` colour on a label.
- A connector from a Mote to its Project.
- A canvas-texture label.
- `aria-live` or a visible "Skills" heading.
- A renderer that reads `moteTier`, `mass` or `isDeep` for Motes.
- An ellipsis or truncated label.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rank order | Java (7), PostgreSQL (5), Spring Boot (5) | `skills` starts Java, PostgreSQL, Spring Boot | N/A |
| Tiers | shares 4 / 2 / 1 | inner / middle / outer | N/A |
| Over the cap | 25 Motes, room for all | the first 12 by rank are labelled; the rest are dots only | N/A |
| Collision | a lower-ranked label's box meets a shown one | the lower one is hidden this frame | N/A |
| Off canvas | box crosses the top, bottom or left edge | label hidden, not re-slotted | N/A |
| Skill missing from `skills` | renderer lookup fails | throws naming the Skill | as `projectSkills` |
| Gate drift | hand-edited tier or order | `npm run gate` fails naming the Skill | exit 1 |

</frozen-after-approval>

## Code Map

- `src/derive/rules.ts:171-216` -- `MOTE_TIERS` precedent. Add `SKILL_TIERS` and a pure `deriveSkillTier(shares)`, and list it in `rules.test.ts:77-103` PROJECTIONS/HELPERS.
- `src/derive/artifact-schema.ts:41,258-292` -- bump `SCHEMA_VERSION` (and its history comment); add `SkillSchema` and a `skills` array. The test at :676 is the model for this.
- `src/derive/artifact.ts:124-145` -- `skills: [...buildSkills(graph)]`. Put `buildSkills` in a new `src/derive/skills.ts` (pattern: `rail.ts`, `destinations.ts`).
- `src/derive/index.ts:89-106,410-500` -- add `checkSkills(artifact)` to `checkEmittedArtifact` and `checkArtifact`. Mirror `checkStops`.
- `generated/layout.generated.json` -- regenerate with `npm run solve`.
- `src/render-scene/mote-model.ts`:
  - :27-31 header; :62-125 tuning: radii/fill per tier, `MOTE_LABEL_LIMIT`, `MOTE_LABEL_CLEARANCE_PX`, and a char width from `tokens.typography['mote-label']`.
  - :134-145 `MoteArtifact` (add `skills`); :197-205 `moteAssignment` (by tier); :350-402 `labelPlacement`/`moteLabelStyle`; :504-537 `stepMotes` (a label pass after `label`); `MoteView` gains `height`; `MoteDraw` gains `dotScale` and orbit-line opacities.
- `src/render-scene/notable-model.ts:151-167` -- extract `worldPerPixel(position, view, projection, heightPx)` from `moonScale` and reuse it for Mote dots.
- `src/render-scene/mote-field.tsx` -- per-tier material colour; pass `size.height`; mount three orbit lines, bound the way `sceneLines` hairlines are drawn in `scene.tsx`.
- `src/shell/scene-host.tsx:98-129`, `src/render-scene/scene-model.ts` `SceneArtifact` -- restate `skills` (readonly).
- `src/shell/panel-model.ts:100-180` -- `skills` block; `focus-panel.tsx:159-198` renders the `<ul>`. Scans are in `panel-model.test.ts` (`auditPanel`).
- `src/render-scene/mote-model.test.ts` (~:1130 classification audit; fixture :89), `src/render-scene/scene-model.test.ts` (`auditMoteField` + mutations; `known` list) -- update.
- `src/render-scene/README.md`, `src/derive/README.md`, `src/shell/README.md` -- rows and a "Mote tiers (3.5)" note.

## Tasks & Acceptance

**Execution:**
- [x] `src/derive/rules.ts`, `skills.ts`, `artifact-schema.ts`, `artifact.ts`, `index.ts` (+ tests) -- tier, list, schema v6, gate check. Test the matrix rows Rank order, Tiers and Gate drift.
- [x] `generated/layout.generated.json` -- regenerate, then `npm run gate`.
- [x] `src/render-scene/notable-model.ts` (+ test) -- `worldPerPixel` extraction; `moonScale` behaviour unchanged.
- [x] `src/render-scene/mote-model.ts` (+ test) -- tier seats, dot px scale, label token/ink, the greedy label pass with cap/clearance/four edges, orbit-line opacities. Test the rows Over the cap, Collision, Off canvas and Skill missing, plus a 25-Skill fixture.
- [x] `src/render-scene/mote-field.tsx` + `scene-model.test.ts` -- bind tiers, height, orbit lines; audits and mutations.
- [x] `src/shell/panel-model.ts`, `focus-panel.tsx`, `scene-host.tsx` (+ tests) -- Skills list block; artifact slices.
- [ ] READMEs; record in `deferred-work.md` which 2.8/3.1 Mote items this closes.

**Acceptance Criteria:**
- Given any focused Project, when its Motes condense, then each sits on the orbit of its artifact tier, at its tier's px radius, and every label is `ink-label`.
- Given the renderer source, when scanned, then no Mote code counts Skills across Projects or reads `moteTier`/`mass`/`isDeep`.
- Given a focused Project, when the panel opens, then its Skills are a `<ul>` in the panel DOM, with no `aria-live` anywhere.
- Given the 25-Skill and a 9-Skill fixture at 1440×900 and 390×844, when stepped through a full orbit turn, then no two shown labels' boxes intersect, none crosses the panel or the canvas edges, and at most 12 are shown.
- Given `npm test`, `npm run typecheck`, `npm run gate`, then all pass.

## Design Notes

Width estimate: `chars × 9.5 × (0.6 + 0.16)` ≈ 7.2px (sans advance plus letter-spacing). Box height `9.5 × 1.2`. Kept conservative and recorded as tunable. The label pass's order is `skills` rank, so inner-orbit, most-shared Skills always win a collision. The tested inventory maximum is now 25 (`sncf/client-referential`), not nine.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate` -- all green.

**Manual checks:**
- `npm run dev`: focus `sncf/client-referential` and `decathlon/store-labelling-generation` at desktop and 390px width. Check that there is no label overlap or edge clipping, that three tilted orbit lines are visible, that flicker is tolerable as orbits turn, and that the panel lists every Skill.

## Suggested Review Order

**The tier, derived once (entry point)**

- Share count → tier: ≥3 inner, 2 middle, 1 outer; the only classification.
  [`rules.ts:244`](../../src/derive/rules.ts#L244)

- The ranked Skill list: shares descending, then name; order is the payload.
  [`skills.ts:51`](../../src/derive/skills.ts#L51)

- Schema v6 and the closed `{ name, tier }` entry.
  [`artifact-schema.ts:210`](../../src/derive/artifact-schema.ts#L210)

- Gate check naming missing, extra, duplicate, misordered or mistiered Skills.
  [`index.ts:419`](../../src/derive/index.ts#L419)

**Seating and dots (renderer reads, never counts)**

- Rank lookup, memoised per artifact; throws on a duplicate or missing Skill.
  [`mote-model.ts:276`](../../src/render-scene/mote-model.ts#L276)

- Tier index is orbit index; even, non-adjacent slots per orbit.
  [`mote-model.ts:329`](../../src/render-scene/mote-model.ts#L329)

- Screen-constant dot radius per tier via the extracted world-per-pixel.
  [`mote-model.ts:1027`](../../src/render-scene/mote-model.ts#L1027)

- `worldPerPixel` pulled out of `moonScale`, shared by Moons and Motes.
  [`notable-model.ts:173`](../../src/render-scene/notable-model.ts#L173)

**The label pass (the degradation rule)**

- One replaceable function: rank order, cap of 12, four edges, clearance.
  [`mote-model.ts:597`](../../src/render-scene/mote-model.ts#L597)

- Panel edge held while Motes still decay after a release.
  [`mote-model.ts:821`](../../src/render-scene/mote-model.ts#L821)

- Width estimate from the `mote-label` token; cap constant.
  [`mote-model.ts:165`](../../src/render-scene/mote-model.ts#L165)

- Orbit phases retuned so the nine-label case shows all nine at rest.
  [`mote-model.ts:97`](../../src/render-scene/mote-model.ts#L97)

**Orbit lines**

- Condensing and decaying line per orbit; the decaying one fades as carried state.
  [`mote-model.ts:827`](../../src/render-scene/mote-model.ts#L827)

- Six memoised `stroke-dust` hairlines, no depth write.
  [`mote-field.tsx:89`](../../src/render-scene/mote-field.tsx#L89)

**Panel Skills list**

- A `skills` block in authored order; none for an empty list.
  [`panel-model.ts:197`](../../src/shell/panel-model.ts#L197)

- Rendered as a static `<ul aria-label="Skills">`, no live region.
  [`focus-panel.tsx:198`](../../src/shell/focus-panel.tsx#L198)

**Peripherals**

- Rank-order, tier and gate-drift tests.
  [`skills.test.ts:65`](../../src/derive/skills.test.ts#L65)

- Cap, collision and edge tests; 25/9-Skill sweep over a full turn.
  [`mote-model.test.ts:1415`](../../src/render-scene/mote-model.test.ts#L1415)

- Emission site of the new top-level list.
  [`artifact.ts:146`](../../src/derive/artifact.ts#L146)
