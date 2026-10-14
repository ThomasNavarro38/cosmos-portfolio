---
title: 'The Mote label pass and the degradation ruling'
type: 'feature'
created: '2026-10-14'
status: 'done'
baseline_commit: '32f36f88c53f75cfdcb4408a3bcb484d2a395037'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `moteLabelPass` is stateless, so above ~12 labels (12 and 25 Skills on turning orbits) a label pops on and off whenever it crosses a threshold. It ignores the 3.4 affordance label and leader, which draw at the same `zIndexRange [1,1]`. Under reduced motion a hidden label stays hidden for the whole Focus (Epic 2 F-6), and that case has no ruling. The pass lives inside a 1138-line `mote-model.ts`.

**Approach:** First split the label pass and its geometry into `src/render-scene/mote-label.ts`, with no change in behaviour. Then implement Thomas's ruling (2026-10-14) there: 1a sticky priority with hysteresis, 2a the affordance wins, 3a the reduced-motion case is accepted and recorded, 4 the cap stays at 12. Close `epic-3-retro-item-6`.

## Boundaries & Constraints

**Always:**
- Split first. After the split, every existing test file passes byte-unmodified. `mote-model.ts` re-exports every moved name.
- `MOTE_LABEL_COLOR` and `moteLabelStyle` stay *defined* in `mote-model.ts`. `identity-audit.test.ts:249` reads the colour there by pattern.
- The ruled pass order: the focused Project's labels first; within that, labels shown last frame (incumbents) before newcomers; ties by rank. The cap `MOTE_LABEL_LIMIT` = 12 counts Mote labels only.
- Hysteresis applies only to the gap between labels. An incumbent stays while its box overlaps no box already shown (gap ≥ 0). A newcomer needs `MOTE_LABEL_CLEARANCE_PX + MOTE_LABEL_HYSTERESIS_PX` (4 + 8). The four canvas edges and the panel edge still hide a label at once, incumbent or not.
- Affordance boxes (its label block, grown by `OUTLINE_OFFSET_PX + OUTLINE_PX` when the keyboard reached it, and its leader's bounding box) are seeded into the pass as already shown. Any Mote label within `MOTE_LABEL_CLEARANCE_PX` of one is hidden.
- Reduced motion: no new behaviour. Labels the pass hides stay hidden while the orbit clock holds; the panel's Skills `<ul>` lists every Skill.
- Models stay pure (no Three, React, store or clock). The binding stays a binding.

**Ask First:** changing the cap, the margins' meaning, the pass order, or any reduced-motion behaviour; adding a fade.

**Never:** opacity fades or timers on labels; re-slotting a label the pass hid; reading the DOM to measure text; touching re-slotting (`reslot`), Condensation or the orbit spin; editing `career.json` or the artifact.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior |
|----------|--------------|---------------------------|
| Incumbent drifts close | Shown last frame; now 1px from a better-ranked shown label | Stays shown |
| Incumbent overlaps | Its box overlaps a better-placed shown box | Hidden this frame |
| Newcomer | Not shown last frame; 6px from a shown label | Hidden (needs 12px) |
| Incumbent hits edge | Shown last frame; box now crosses canvas or panel edge | Hidden at once |
| Cap full | 12 incumbents shown; a better-ranked newcomer qualifies | Newcomer hidden; incumbents keep their places |
| Affordance shown | Mote label box overlaps the block or the leader's box | Mote label hidden; the affordance is untouched |
| Keyboard affordance | Label 2px outside the block, inside its outline (3+1px) | Hidden |
| No affordance | Nothing approached, or it is the focused Project | No obstacles |
| Reduced motion | 25 Skills, `reduced = true`, condensed | The shown set is identical on every frame; ≤ 12 shown |

</frozen-after-approval>

## Code Map

- `src/render-scene/mote-model.ts:445-622` -- the "Projection and labels" section to move: `NdcPoint`, `projectNdc`, `LabelSide`, `LabelPlacement`, `labelPlacement`, `labelTransform`, `LabelBox`, `labelBox`, `LabelCandidate`, `LabelBounds`, `moteLabelPass`; plus `:152-177,186-197` (`MOTE_LABEL_TYPE`, `_FONT_PX`, `_CHAR_PX`, `_HEIGHT_PX`, `_GAP_PX`, `_LIMIT`, `_CLEARANCE_PX`, `cssNumber`) and `:970-973` `labelChars`. Move all of them so the new module never imports `mote-model.ts` (no cycle). Keep `MOTE_LABEL_COLOR` (`:184`) and `moteLabelStyle` (`:532`) here, importing the type and transform.
- `src/render-scene/mote-model.ts:758-807` `stepMotes`, `:814` `moteFrame` -- feed the pass the previous frame's shown set (`previous?.motes` with `labelVisible`) and a trailing `obstacles: readonly LabelBox[] = []` after `reduced = false`. The preference audit needs `reduced = false` to be present.
- `src/render-scene/mote-model.ts:41-59` header -- update it to point at the new module.
- `src/render-scene/affordance-model.ts:424-450` `affordanceFrame` -- add a pure `affordanceObstacles(nav, artifact, bodies, view, projection, viewport)` returning screen rects `{left,right,top,bottom}`. Reuse the same projection, `markPx`, `labelBox(text)` (`{width,height}`, a different type from Mote's `LabelBox`), `labelBounds` and `affordanceLayout` (anchor, direction, `shiftX/shiftY` semantics at `:356-370`). Factor out a shared helper rather than duplicating.
- `src/render-scene/mote-field.tsx:80` -- the one `moteFrame` call gains `affordanceObstacles(state, artifact, bodies, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, size)`. The `artifact` prop becomes `MoteArtifact & AffordanceArtifact`. `scene.tsx:173` already passes the full artifact.
- `src/render-scene/scene-model.test.ts:2980-3050` `auditMoteField` -- the expected frame-loop statement list pins that call. Update it and the doc comment.
- `src/render-scene/mote-model.test.ts:1380-1560` -- the 3.5 pass tests (`candidate`, `sweep`, `crowds`, `assertRankWins`). Tests that pin the stateless 4px rule are updated in the ruling task only.
- `generated/layout.generated.json` -- the AC sizes: 7 = `project:sncf/file-aggregator-transcoder`, 12 = `project:transilien/stream-aggregator-compiler`, 25 = `project:sncf/client-referential`.
- Read-only registries a new file must satisfy: `scene-model.test.ts` `PREFERENCE_ROLES` (`:3700`, the new module must not reference motion-preference), `COORDINATE_EXEMPT` (`:2651`, no numeric triples), `auditLadders` (`:1395`).

## Tasks & Acceptance

**Execution:**
- [x] `src/render-scene/mote-label.ts` (new), `src/render-scene/mote-model.ts` -- move the label code listed in the Code Map, re-export it from `mote-model.ts`, leave the colour and style in place, give the new module a header in house style -- AC 1.
- [x] Run `npm test`, `npm run typecheck` and `npm run gate` with **no test file changed** -- prove AC 1 before any behaviour change.
- [x] `src/render-scene/mote-label.ts` -- add `MOTE_LABEL_HYSTERESIS_PX` = 8 and give `moteLabelPass` `(candidates, bounds, incumbents = new Set(), obstacles = [])` with the ruled order, margins and seeding; rewrite its doc comment as the recorded ruling -- AC 2.
- [x] `src/render-scene/mote-model.ts` -- thread the incumbents and obstacles through `stepMotes` and `moteFrame`.
- [x] `src/render-scene/affordance-model.ts` -- add `affordanceObstacles` via the shared helper; unit-test it in `affordance-model.test.ts` (hidden → `[]`; pointer → block and leader; keyboard → block grown by 4px; the block matches the drawn transform).
- [x] `src/render-scene/mote-field.tsx`, `src/render-scene/scene-model.test.ts` -- bind the obstacle, update `auditMoteField`, and add one red row showing that the old call shape now fails.
- [x] `src/render-scene/mote-model.test.ts` -- update the 3.5 tests that pinned the stateless rule (name each one in the commit). Add every I/O-matrix row over `moteLabelPass`. Add sweeps at 7, 12 and 25 Skills (1440×900 and 390×844, one full turn): ≤ 12 shown, none clipped; every hide of a label explained by a bound, an overlap or an obstacle; total show/hide toggles with incumbents ≤ the stateless count at every size, and strictly fewer at 25 and wherever the stateless count is non-zero; with an affordance obstacle, no shown label within clearance of it; under reduced motion the shown set is constant after condensation. Prove the hysteresis bites with a mutation row (incumbents ignored → the toggle assertion fails).
- [x] `src/render-scene/README.md`, `_bmad-output/implementation-artifacts/deferred-work.md`, `sprint-status.yaml` -- record the ruling (README label paragraph and table row). Mark the 3.5 deferrals for flicker (`:736`) and affordance overlap (`:760`) and Epic 2 F-6 closed by 3.18. Close `epic-3-retro-item-6` with a resolution.

**Acceptance Criteria:**
- Given the split alone, when `npm test` runs, then every existing test passes with no test file modified.
- Given the ruling, when the label module is read, then its pass doc comment states 1a, 2a, 3a and the cap of 12, and the README and the retro item record it.
- Given Projects of 7, 12 and 25 Skills, when the suite runs, then flicker, affordance overlap and reduced motion each have a passing test at all three sizes.

### Review Findings

- [x] [Review][Decision] Held labels keep their place for as long as the obstacle lasts — resolved: Thomas accepted the hold as is (Change Log) — An incumbent hidden by the affordance alone keeps its box and its slot under the cap (`mote-label.ts:276-278`). The Change Log calls this a "Review extension"; unlike the two departures, it has no "Thomas: accepted". No limit applies while the obstacle stays. Example: keyboard focus parked on an index entry whose affordance covers labels. For the whole Focus, those held labels block newcomers and count toward the 12, so fewer than 12 labels show even when free room exists. Ask First covers "the margins' meaning" and the cap.
- [x] [Review][Patch] The ruling's doc comment is on `moteLabelLayout`, but six places point at `moteLabelPass` (AC 2's "its pass doc comment"): the README, both module headers, three comments in `mote-model.ts`, and the sprint-status resolution. Retarget them to `moteLabelLayout`, and point `moteLabelPass`'s one-line comment at the ruling [src/render-scene/README.md:83, src/render-scene/mote-label.ts:22, src/render-scene/mote-model.ts:52,511,603,818,832, sprint-status.yaml:424]
- [x] [Review][Patch] A stale deferral says the manual check was never run; the Change Log records it run on 2026-10-14. Close it [deferred-work.md:920]
- [x] [Review][Patch] The README's 3.5 label paragraph is in the present tense ("clears every shown label by `MOTE_LABEL_CLEARANCE_PX`", "in rank order"), which is no longer true since 3.18. Put it in the past tense [src/render-scene/README.md:79]
- [x] [Review][Patch] Commit 8549ec4 does not name the 3.5 tests it rewrote, which the ruling task required. Record them in the Change Log: the `collision` row, `stepped: on the committed 25-Skill Project at rest…`, `stepped: A → B…`, and `assertRankWins` → `explainHides` [spec-3-18:Spec Change Log]
- [x] [Review][Defer] The affordance obstacle's size comes from the character-count estimate (`labelBox(text)`, which errs wide), not the drawn text. A string of wide capitals could still draw past it [src/render-scene/affordance-model.ts:296] — deferred, pre-existing

## Spec Change Log

- 2026-10-14, Thomas (after review): two departures accepted.
  1. The split could not leave every test file byte-unmodified, because the purity audit in `mote-model.test.ts` allow-lists `mote-model.ts`'s imports. The one added `'./mote-label.ts'` line is accepted; no other test line changed before the behaviour change.
  2. "Strictly fewer toggles wherever the stateless count is non-zero" is replaced by: never more toggles than the stateless rule, and strictly fewer at 25 Skills and wherever an overlap causes the toggle. The remaining toggles at 7 and 12 Skills × 390 (14 = 14, 20 = 20) are all edge crossings, which the ruling keeps instant.
- Manual check (2026-10-14, Chrome, 1440×900 CSS, dev server, `sncf/client-referential` focused). Each frame's label visibility was recorded over one full orbit turn (64s, 10,561 frames):
  - 12 labels shown on every frame, none clipped or overlapping.
  - 2 toggles in the whole turn (`code review` and `legacy modernisation`), which matches the model's sweep count. No label came back within 500ms of hiding.
  - Affordance: keyboard focus was moved to each of the other 7 Projects' index entries. None drew an affordance, because from this focus pose no other Planet is on the frame. So the 2a overlap cannot be reached in the committed artifact today; it is covered by the model tests only.
  - Console: no new errors (a pre-existing 404 and a THREE.Clock deprecation warning).
- The 3.5 tests that pinned the stateless rule, rewritten by the ruling task (commit 8549ec4 did not name them):
  - `collision: a lower-ranked label whose box meets a shown one is hidden; the focused Project wins first` → `collision: a newcomer within clearance + hysteresis of a shown label is hidden; the focused Project wins first (3.5, re-pinned by 3.18)`.
  - `stepped: on the committed 25-Skill Project at rest, the shown labels are the best-ranked placeable ones` → `stepped: on the committed 25-Skill Project at rest, every hidden label is explained by the ruled order (3.18)`.
  - `stepped: A → B, a condensing B label wins a collision with a decaying A label, whatever their ranks`: same name, now checked with `explainHides` against the previous frame.
  - The helper `assertRankWins` was replaced by `explainHides`, which explains every hide by a bound, the cap, an overlap or an obstacle, given last frame's incumbents.
- Review extension (2026-10-14): an incumbent hidden by an affordance obstacle alone is *held*. It keeps its box, its place under the cap and its incumbency, so a passing hover never reshuffles the labels. Thomas (after the second review, 2026-10-14): accepted as is. There is no time limit: while an obstacle lasts (a parked keyboard focus, say), its held labels keep their places under the cap.

## Design Notes

The incumbent set is last frame's `labelVisible`, which the field already carries, so the rule stays a pure function of `(previous, frame)` with no timers. Because incumbents are visited before newcomers, the cap never swaps a shown label out for a better-ranked newcomer. A shown label gives way only to a hard bound, a real overlap, or the affordance. The affordance state is read from the same `getState()` snapshot. The affordance's pointer re-pick runs in its own `useFrame`, so the obstacle can trail a hover by one frame, which is invisible.

## Verification

**Commands:**
- `npm test` -- expected: all pass (after the split step, with `git diff --stat -- '*.test.ts'` empty).
- `npm run typecheck` -- expected: clean.
- `npm run gate` -- expected: pass.

**Manual checks:**
- At 1440×900, focus `sncf/client-referential`, watch one orbit turn and hover another Planet: no label pops back within a moment of hiding, and no Mote label sits under the affordance.

## Suggested Review Order

**The ruling, in the label pass**

- Entry point: the one degradation rule — focused, incumbents, newcomers; gaps 0 / 12; obstacles; held labels.
  [`mote-label.ts:254`](../../src/render-scene/mote-label.ts#L254)

- The hysteresis margin on the 4px clearance; the cap stays 12.
  [`mote-label.ts:71`](../../src/render-scene/mote-label.ts#L71)

- `moteLabelPass` kept as the `shown` view, so 3.5 callers read unchanged.
  [`mote-label.ts:284`](../../src/render-scene/mote-label.ts#L284)

**The step carries last frame's state**

- Last frame's shown and held labels become this frame's incumbents — pure, no timers.
  [`mote-model.ts:663`](../../src/render-scene/mote-model.ts#L663)

- `stepMotes` takes the trailing obstacles after `reduced`.
  [`mote-model.ts:618`](../../src/render-scene/mote-model.ts#L618)

**The affordance as an obstacle**

- Block (grown by the keyboard outline) and leader bounding box, from the shared placement.
  [`affordance-model.ts:522`](../../src/render-scene/affordance-model.ts#L522)

- One placement helper feeds both the drawn affordance and its obstacles.
  [`affordance-model.ts:434`](../../src/render-scene/affordance-model.ts#L434)

- The binding hands the obstacles to `moteFrame` from the same `getState()` read.
  [`mote-field.tsx:93`](../../src/render-scene/mote-field.tsx#L93)

**Tests and records**

- The I/O matrix rows, held carry and non-finite obstacles.
  [`mote-model.test.ts:1720`](../../src/render-scene/mote-model.test.ts#L1720)

- Sweeps at 7, 12, 25 Skills: flicker bound, its mutation, affordance overlap, reduced motion.
  [`mote-model.test.ts:2087`](../../src/render-scene/mote-model.test.ts#L2087)

- `moteFrame` forwards obstacles; the label module's own purity and no-cycle audit.
  [`mote-model.test.ts:829`](../../src/render-scene/mote-model.test.ts#L829)

- Affordance obstacle unit tests.
  [`affordance-model.test.ts:587`](../../src/render-scene/affordance-model.test.ts#L587)

- `auditMoteField` pins the new call shape.
  [`scene-model.test.ts:3131`](../../src/render-scene/scene-model.test.ts#L3131)

- The ruling recorded in the README.
  [`README.md:26`](../../src/render-scene/README.md#L26)
