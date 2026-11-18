---
title: 'Story 9.2: The rulings'
type: 'chore'
created: '2026-11-18'
status: 'done'
baseline_revision: 'caf377490e9a6f0056d88f1609f8fac2c075ebab'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-17.md'
  - '{project-root}/_bmad-output/implementation-artifacts/sky-cost-9-1.md'
warnings: ['oversized']
deferred:
  - summary: >-
      The ruled crossfade does not say how the belt and ring disc are occluded while the fills write no depth during the fade, nor that the earlier-drawn nebula shows through fills below opacity 1.
    evidence: |-
      AD-22 (unamended) has no depth written during the fade. The 2026-11-18 order relies on the belt and disc being depth-tested against the fills.
    location: >-
      ARCHITECTURE-SPINE.md AD-19 2026-11-18 block, AD-22; owner 9.10
    severity: medium
  - summary: >-
      AD-19's amendment says line-work fades 'as each arrives', while AD-22's says 'together, whole'. Failure after the crossfade starts is unstated.
    evidence: |-
      Both texts are approved verbatim from Proposals 3 and 4. A builder could take either reading.
    location: >-
      ARCHITECTURE-SPINE.md AD-19/AD-22 amendments; owner 9.10
    severity: medium
  - summary: >-
      The luminance ceiling's original sentence allows only the subject's Star above stroke-active. The amended subject Planet rim turning white, and the subject core's pulse at stroke-focus, are not reconciled with it.
    evidence: |-
      AD-20's original ceiling sentence stands beside the amendment, which adds the rim as a white carrier and a pulse on every Star.
    location: >-
      ARCHITECTURE-SPINE.md AD-20; owner 9.4 and 9.9
    severity: medium
  - summary: >-
      The five Star tints differ in luminance, so unless each is normalised to equal luminance before the band, an old white Star can outshine a recent red one. Whether the subject core turns white or keeps its tint at stroke-focus is unstated.
    evidence: |-
      red #FF9A5C is darker than white #F4F1EA. FR-3 needs the ladder order across carriers.
    location: >-
      DESIGN.md §2 tint rows, AD-21; owner 9.5
    severity: medium
  - summary: >-
      Proposal 7's approved Colophon statement omits the belt as a recency carrier, describes realism carriers that a Fallback or schematic visitor never sees, and says a rim 'glows' where DESIGN §5/§8 admit glow only on the Star sprite and nebula.
    evidence: |-
      The approved text was applied verbatim to EXPERIENCE.md. It ships in 9.5 and needs Thomas's ruling to change.
    location: >-
      EXPERIENCE.md copy place 4; owner 9.5
    severity: medium
  - summary: >-
      The occlusion of the moon sphere at MOON 3 behind a semi-transparent ring disc at 1.75 is unstated.
    evidence: |-
      The moon sphere draws later than the disc, so a far-side Moon may draw over the disc.
    location: >-
      ARCHITECTURE-SPINE.md AD-19 2026-11-18 block; owner 9.8
    severity: low
  - summary: >-
      The spine does not carry the nebula drift stopping under reducedMotion() or the belt having no motion and no particles, both of which are in epics.md ACs 9.6/9.7 and the epic context.
    evidence: |-
      AD-20's amendment names only granulation and pulse.
    location: >-
      ARCHITECTURE-SPINE.md AD-20; owner 9.6 and 9.7
    severity: low
  - summary: >-
      DESIGN §6's four-item shape vocabulary and AD-19's 'contrast floor over a fill or glow' are not extended to the ribbon, belt, ring disc and spheres.
    evidence: |-
      Proposal 6 amends only §6's circle, so the older sentences stand.
    location: >-
      DESIGN.md §6, ARCHITECTURE-SPINE.md AD-19; owner 9.3 and 9.6–9.8
    severity: low
---

<intent-contract>

## Intent

**Problem:** The Sprint Change Proposal of 2026-11-17 approved proposals 2–7, but none of them is in the PRD, the spine or DESIGN/EXPERIENCE yet, and no memlog records the rulings. Build stories 9.3–9.10 may not start until they are written down (the epic's stop rule).

**Approach:** Apply proposals 2–7 verbatim to `prd.md` (FR-3), `ARCHITECTURE-SPINE.md` (AD-19..AD-23, the budget table), `DESIGN.md` (§1, §2, §5, §6, §7.1, §7.2, §8) and `EXPERIENCE.md` (copy place 4), each dated 2026-11-17. Then append the rulings to the three memlogs, citing 9.1's measured figures, and regenerate `epic-8-context.md` and `epic-9-context.md`.

## Boundaries & Constraints

**Always:**
- Use the approved text **verbatim** wherever a proposal gives it: Proposal 2 NEW, Proposals 3–4 amendment blocks, the Proposal 5 NEW row, and the Proposal 7 heading and statement.
- Append amendments as `*[amended 2026-11-17 for Epic 9: …]*`, the spine's existing convention. Do not rewrite the ruled original text.
- Make memlog entries only through `py _bmad/scripts/memlog.py append`. Memlogs are append-only, and each entry names Thomas, the date and its source (`sprint-change-proposal-2026-11-17.md`, proposal N).
- Budget: 9.1 measured every object within its limit (`realism` 14,752 of 24,000 B ship-like, `scene` 953,093 of 960,000 B, +1 draw gross each). Per Proposal 5 the byte limits stay unchanged. Record that ruling with the figures, plus the lower-bound caveat and the ~6.9 KB `scene` headroom that 9.3 and 9.10 share.
- Lens flare stays Deferred (`ARCHITECTURE-SPINE.md:354`).

**Rulings taken (Thomas, 2026-11-18, accepting the recommendations of the first run):**
- **Q1, draw order:** `DUST 1 < NEBULA 1.1 < GLOW 1.25 < FILL 1.5 (+rim) < BELT 1.6 < RING_DISC 1.75 < BODY 2 < MOON 3 (+moon sphere)`.
  - The rim has no slot, because it is inside the fill shader.
  - The moon sphere shares `MOON_RENDER_ORDER`.
  - Each constant is added to `scene-model.ts`, with its strict-order pin, by its own build story (9.6 belt, 9.7 nebula, 9.8 ring disc), not by 9.2.
  - In the documents this ruling is dated **2026-11-18**, not 2026-11-17.
- **Q2, tokens:** 9.2 amends DESIGN.md §2's prose and table only. The frontmatter is untouched. Each token is declared in the frontmatter by its story: the five `realism-star-*` tokens and the retirement of `realism-star-glow` in 9.5, `realism-belt` in 9.6, and `realism-nebula` in 9.7.

**Block If:**
- Applying an approved text verbatim would contradict a ruled sentence that it does not explicitly supersede. HALT `blocked`: `amendment conflicts with ruled text`.

**Never:**
- Change `src/`, `scripts/`, `generated/`, `public/` or any test. 9.2 writes rulings, and each build story implements its own part.
- Edit or reorder an existing memlog entry or ruled text.
- Write "RATIFIED (Thomas…)" for anything Thomas has not approved.

</intent-contract>

## Code Map

- `_bmad-output/planning-artifacts/prds/prd-cosmos-portfolio-2026-09-01/prd.md:122,124` -- FR-3's two bullets, replaced by Proposal 2 NEW.
- `_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md`
  - AD-19 heading at `:177`, rule at `:181` (it also holds the draw-order sentence);
  - AD-20 rule at `:187`;
  - AD-21 at `:189`;
  - AD-22 at `:195`;
  - AD-23 budget row at `:213`, replaced by the Proposal 5 NEW row;
  - Deferred list at `:354-357`.

  The AD-19 heading "Realism draws beneath the line-work" is ruled text. Keep it, because the amendment supersedes it.
- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md`
  - §1 `:374` (M3 attachment surface ~`:405-425`);
  - §2 `:429`, with the token table row `realism-star-glow` at `:468`;
  - §5 `:687` (~`:719-723`);
  - §6 `:727` (~`:731-734`);
  - §7 `:759` (§7.1 Client Star ~`:761-770`, §7.2 Deep/Shallow);
  - §8 `:1136`, with the bloom/flare line at `:1159`.
- DESIGN.md **frontmatter** `:74-75` (`realism-star-glow`, `-dark`) -- **code-coupled**:
  - `scripts/tokens.test.ts:119` requires the committed `generated/` outputs to be byte-identical to a generation from the live DESIGN.md;
  - `:579-582` pins the realism family;
  - `src/identity-audit.test.ts:171-184` and `src/render-scene/realism/star-layer.ts` read `realism-star-glow-dark`.
- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/EXPERIENCE.md:227` -- copy place 4 heading, plus its statement. The copy ships in 9.5 (`src/colophon/credits.ts:31`, `credits.test.ts:41`, `identity-audit.test.ts:811,1358`). Only the document changes here.
- Memlogs: `architecture/…/.memlog.md`, `prds/…/.memlog.md`, `ux-designs/…/.memlog.md`. Entry form: `- (decision) RATIFIED (Thomas, <date>, <source>): …`. See the arch memlog's last entries.
- `src/render-scene/scene-model.ts:359-404` -- today's order, `DUST 1 < GLOW 1.25 < FILL 1.5 < BODY 2 < MOON 3`. `BODY 2` carries every line-work draw: outlines, orbits, Rail, Ring and the affordance (`body-field.tsx:26,62-88`). Read-only here.
- `_bmad-output/implementation-artifacts/sky-cost-9-1.md` -- the bytes (`:51-80`), the draws (`:114-130`) and "none exceeded" (`:132-138`). The spike's orders 0.9/1.1/1.6 are placeholders, explicitly not proposed (`:30`).
- `_bmad-output/implementation-artifacts/epic-8-context.md`, `epic-9-context.md` -- regenerated after the planning edits, see the task for the prompt file.

## Tasks & Acceptance

**Execution:**
- `prd.md` -- replace FR-3's two bullets with Proposal 2 NEW, plus a dated amendment note.
- `ARCHITECTURE-SPINE.md` -- append the Proposal 3 block to AD-19 and the Proposal 4 blocks to AD-20/21/22. Replace the `:213` row with Proposal 5 NEW. State the extended draw order exactly as ruled in Q1 (dated 2026-11-18), and the byte limits as unchanged, with 9.1's figures.
- `DESIGN.md` -- apply Proposal 6 to §1, §2 (prose and table only, frontmatter untouched, per Q2), §5, §6, §7.1, §7.2 and §8, each dated.
- `EXPERIENCE.md` -- apply Proposal 7's heading and statement to copy place 4, with "ships in 9.5".
- `architecture/…/.memlog.md` -- one `(decision)` entry for each of the six rulings:
  1. line-work under realism (Proposal 3);
  2. the Star look (Proposal 4, AD-20);
  3. Star colour (Proposal 4, AD-21, and the Proposal 6 tokens, with Q2's per-story frontmatter split);
  4. the physical Deep/Shallow signal (Proposals 5 and 6 §7.2);
  5. the extended draw order (Q1, Thomas 2026-11-18);
  6. the budget, unchanged, with 9.1's figures and the shared ~6.9 KB `scene` headroom.

  Add an `(event)` entry for the upstream edits applied.
- `prds/…/.memlog.md` -- one `(decision)` entry: FR-3 amended per Proposal 2 (one rule, a carrier per layer; Star colour is not a mapping rule).
- `ux-designs/…/.memlog.md` -- `(decision)` entries:
  - DESIGN.md Proposal 6 applied, per section, with Q2's frontmatter split;
  - EXPERIENCE.md copy place 4 per Proposal 7, shipping in 9.5.
- `epic-8-context.md`, `epic-9-context.md` -- regenerate each, after every planning edit above, by following `E:\Development\cosmos-portfolio\_bmad\render\bmad-build-auto\cosmos-portfolio-e9c911a0bde2\ef14e94994aaf5bddbae\compile-epic-context.md`. Inputs: the epic number, `_bmad-output/planning-artifacts/epics.md`, the planning-artifacts folder, and output `_bmad-output/implementation-artifacts/epic-<N>-context.md`. Overwrite the existing files.

**Acceptance Criteria:**
- Given proposals 2–7, when the four documents are read, then each carries the approved text verbatim, dated 2026-11-17.
- Given the memlogs, when they are read, then they record the six rulings, the budget one citing 9.1's measured figures.
- Given the planning edits, when the epic contexts are checked, then both start with their `# Epic <N> Context:` header and are newer than every planning artifact.
- Given `npm test` and `npm run typecheck`, when run, then they pass unchanged (no code touched).

## Design Notes

Why the Q1 order is what it is:
- **The nebula precedes `FILL`, with the glow.** The fills always paint over it, so it never hazes a Planet, its rim or a label plate. Its order against the glow (1.1 < 1.25) is cosmetic, because both are additive.
- **The belt follows `FILL`.** It is depth-tested against the fills, so its near side passes over its Planet, as an M2 orbit's near half does.
- **The ring disc sits between the belt and `BODY 2`.** As a mark, it draws over the belt, and the line-work that stays (the affordance, leaders, Mote orbits) draws over it.
- **The moon sphere shares `MOON 3`.** A Moon still draws over its Ring.

## Verification

**Commands:**
- `npm test` and `npm run typecheck` -- expected: pass, with 2181 pass, 0 fail, 1 skipped, as at `caf3774`.
- `npm run tokens` followed by `git status --short generated` -- expected: no change (the frontmatter is untouched).
- `git diff --stat caf3774 -- src scripts generated public` -- expected: empty.

## Auto Run Result

### First run (2026-11-18)
Status: blocked. Blocking condition: intent gap on Q1 (the draw order) and Q2 (the token swap). Resolved by Thomas on 2026-11-18 by accepting the recommendations, recorded under Boundaries above. Status reset to `draft`.

### Second run (2026-11-18)

**Summary:** Proposals 2–7 of the 2026-11-17 Sprint Change Proposal are applied:
- verbatim where a text was given, which the intent auditor checked by script;
- dated 2026-11-17, with Q1's draw order dated 2026-11-18;
- with Q2's split, under which DESIGN.md's frontmatter is untouched and each token is declared by its build story.

The rulings are in the three memlogs, and the byte limits stay unchanged, with 9.1's figures. Both epic contexts are regenerated. No code changed.

**Files changed:**
- `prds/…/prd.md`: FR-3's two bullets are replaced by Proposal 2 NEW, with a dated note.
- `architecture/…/ARCHITECTURE-SPINE.md`:
  - the Proposal 3 block on AD-19, and a 2026-11-18 block with the extended draw order;
  - the Proposal 4 blocks on AD-20, AD-21 and AD-22;
  - the Proposal 5 row, and a note on the unchanged budget with 9.1's figures;
  - two notes in the Deferred list.
- `ux-designs/…/DESIGN.md`: dated amendments to §1, §2 (prose and table, plus seven new token rows), §5, §6, §7.1, §7.2 and §8.
- `ux-designs/…/EXPERIENCE.md`: Proposal 7's heading and statement in copy place 4, marked "ships in 9.5".
- The three `.memlog.md` files:
  - architecture: six decisions and one event;
  - PRD: one decision;
  - UX: two decisions.

  All were written by `memlog.py append`.
- [epic-8-context.md](epic-8-context.md) and [epic-9-context.md](epic-9-context.md): regenerated.
- [deferred-work.md](deferred-work.md): eight deferred findings, under a new section.

**Review findings:** 3 patches applied (medium 1, low 2), 8 deferred (medium 5, low 3), 24 rejected.
- The deferred findings are open design questions in the approved texts. Each has an owning build story: 9.4, 9.5, 9.6–9.10 and 9.3.
- Two of them (the Colophon statement, the tint luminance) need Thomas's ruling before 9.5.

**Follow-up review recommended:** `true`. Patched: high 0, medium 1, low 2; score 3 × 1 + 1 × 2 = 5 (≥ 5).

**Verification:**
- `npm run typecheck`: pass.
- `npm test`: 2181 pass, 0 fail, 1 skipped, as at `caf3774`.
- `npm run tokens`: no change under `generated/`.
- `git diff --stat caf3774 -- src scripts generated public`: empty.
- No planning artifact is newer than either epic context.

**Residual risks:**
- Some original ruled sentences (for example, AD-21's "A Star has no `appearance`" and DESIGN §5/§8's "one glow") stand beside the appended amendments that supersede them, by the spine's append-only convention.
- `epic-9-context.md` was updated by targeted edits, not recompiled from scratch.
- Until 9.5 lands, the shipped Colophon copy and tokens disagree with the documents by design.
- `sprint-status.yaml` was not updated by this run.
