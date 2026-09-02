---
title: "Input Reconciliation: Brief Addendum → PRD"
status: draft
created: 2026-09-01
updated: 2026-09-01
---

# Input Reconciliation — Brief Addendum vs. PRD (+ PRD Addendum)

**Source input:** `_bmad-output/planning-artifacts/briefs/brief-cosmos-portfolio-2026-08-31/addendum.md`
**Targets:** `prds/prd-cosmos-portfolio-2026-09-01/prd.md`, `prds/prd-cosmos-portfolio-2026-09-01/addendum.md`

**Reconciliation rule applied.** The PRD addendum states it is additive to the brief addendum and does not repeat it, and it publishes a routing table pointing downstream readers back to the brief addendum for the domain model, condensation rationale, camera rot defence, format validation, and rejected alternatives. Material that stays only in the brief addendum is therefore *acceptable* — unless (a) a PRD requirement's rationale or constraint lives only there and would be lost to a reader working from the PRD alone, or (b) genuinely actionable detail was dropped from **both** documents. Only those two categories are reported as gaps.

---

## 1. Gaps Found

### GAP-1 — MEDIUM — `notable` word floor is stated as a rule but its measured basis is dropped, and the "90 words" number contradicts the 100–150 range without explanation

**What dropped:** The brief addendum derives the length spec empirically and explains *why* two different numbers exist. The PRD carries both numbers as bare assertions.

**Exact source quote:**
> "`notable` must be prose, not a list. The original brainstorm called for 'a short list of noticeable things.' A list fragments the causal chain from problem to constraint to decision, which is the only reason the field is worth reading. 100–150 words of connected prose is the working length; below roughly 90 the decision loses its rejected alternative and reverts to a job description."

**What the PRD says:** FR-8 requires "100–150 words of connected prose" and its consequence says "Content below roughly 90 words is rejected at authoring time as reverting to a job description." The PRD addendum says "The 90-word floor is a quality gate, not a style preference. Below it the decision loses its rejected alternative and reverts to a job description."

**Why this is a gap:** The PRD addendum recovers the *floor* rationale but neither document explains the relationship between the 100–150 **target** and the 90 **floor**, nor that the prose-not-list rule overrides an explicit earlier brainstorm instruction ("a short list of noticeable things"). A downstream reader (content authoring, or a UX spec sizing the information layer) sees two conflicting numbers and no statement that 100–150 is the working length while 90 is the hard reject line. This is a live ambiguity in an authoring gate that gates M2 (§8.3).

**Where it belongs:** PRD §4.2 FR-8 consequences — one clause distinguishing target from floor. Optionally a line in the PRD addendum's *Content Authoring* section noting the prose rule supersedes the brainstorm's list formulation.

---

### GAP-2 — MEDIUM — "Numbers that do exist and should be used" is dropped entirely from both documents

**What dropped:** The brief addendum, immediately after explaining why measured outcomes are absent, lists the quantitative material that *is* available and instructs it be used.

**Exact source quote:**
> "**Numbers that do exist and should be used where available:** team size (already a field), engagement duration, scale of the system, what was replaced or consolidated. Only measured performance metrics are absent."

**What the PRD says:** FR-8's *Out of Scope* covers only the negative half — "Measured outcomes. None exist… The **constraint** is the falsifiability substitute." The positive instruction is nowhere in the PRD or the PRD addendum.

**Why this is a gap:** This is (b) — actionable authoring guidance dropped from both. A reader working from the PRD alone concludes "no numbers exist" and writes nine `notable` entries with no quantitative anchoring at all, when three named categories of number are explicitly available and mandated. It also matters to FR-7: `team_size` is in the schema and `duration` drives FR-3's mass rule, so the guidance is already partially load-bearing on requirements the PRD does state. Note also that the brief addendum's field list includes `team_size integer` — the PRD's FR-7 field list adds `client`, `company`, and `skills` and drops the type annotation, which is a reasonable expansion but leaves duration's presence in the schema implicit rather than stated (FR-3 requires it).

**Where it belongs:** PRD §4.2 FR-8 (a consequence or a note), or the PRD addendum's *Content Authoring — Notes for the inventory pass*, which is the natural home and currently omits it.

---

### GAP-3 — MEDIUM — The "known tension — uniform depth" note is superseded, but its surviving half (variation must come from the camera) is not carried as an M2 gate check

**What dropped:** The brief addendum's uniform-depth tension has two halves. Flag 01 (two Project classes) supersedes the *premise* — depth is no longer uniform — but the second half is a distinct claim about where hierarchy lives, and its verification instruction was dropped.

**Exact source quote:**
> "**Known tension — uniform depth.** Ten projects with an identical five-field block risks reading as a table in 3D: the rhythm never varies, so a visitor may stop reading around entry four. Uniformity was chosen deliberately for maintainability (no curation decision when adding project eleven, nothing to rot). The consequence is that **variation must come from the camera** — the rails cannot linger equally on ten things, so the hierarchy now lives in the cinematography rather than in the content. This should be verified at the M2 gate."

**Why this is a gap:** The PRD *does* carry the mechanism — FR-18 derives Dwell from Notable presence, and §13 Q7 sends Dwell tuning to M1. What it does not carry is the framing that **hierarchy lives in the cinematography**, nor the explicit instruction to **verify at the M2 gate**. The PRD addendum's routing table sends "Why depth is non-uniform" to PRFAQ Flag 01, which handles the superseded half but not this one. The consequence is a real verification gap: FR-18's consequences are testable in isolation ("Deep receives measurably longer Dwell"), but nothing in §8.1's M2 gate, §9's milestone table, or §11's SM-2 asks whether the pacing hierarchy actually reads. The M2 gate question — "can he tell which entries are worth reading?" — is close but is answered by FR-9's *visual* distinction, not by the camera's.

Related: the brief addendum names "a visitor may stop reading around entry four" as the failure mode. The PRD's risk register carries R-3 (Shallow entries read as LinkedIn export) but not the attrition-by-monotony risk that the camera hierarchy is meant to defend against.

**Where it belongs:** PRD §4.4 FR-18 note (one clause: hierarchy now lives in the cinematography rather than the content; verify at the M2 gate), and/or §9's M2 gate row. Alternatively as a second question on §13 Q7.

---

### GAP-4 — LOW/MEDIUM — Free-flight boundaries are flagged open (Q8, FR-19) with no recorded constraint, while the brief addendum's realism non-negotiable and composition reasoning bear directly on it

**What dropped:** Nothing verbatim — this is an inherited-constraint gap rather than a deletion. The brief addendum's rails section establishes that composition is authored *because* "a force solver has no judgment, and the hero frame would be decided by a random seed. Under a work-sample framing, a badly composed hero shot reads as having no eye."

**Why this is a gap:** The PRD carries that reasoning for the Rail (§4.4 description, FR-17, §12) but FR-19 permits free flight with no recorded acknowledgement that off-rail views are, by that same argument, uncomposed. §13 Q8 asks the question but frames it purely mechanically ("how far may a visitor roam, and how do they return?"). A downstream UX reader resolving Q8 from the PRD alone has no reason to weigh composition quality in the answer. The brief addendum's *solver bounding* reserve — which the PRD does retain in §6 — is the natural mitigation and is not connected to Q8.

**Where it belongs:** PRD §13 Q8, one added clause; or FR-19's note.

---

### GAP-5 — LOW — Cross-project skill sharing ("one skill can serve nine projects") loses its numeric anchor and its origin in relation dissolution

**Exact source quote:**
> "**project ↔ skill** disappears because a skill is never permanently anywhere. Condensation resolves the relation *per focus*, in time rather than in space — one skill can serve nine projects because it is only ever instantiated beside the one being looked at."

**What the PRD says:** §4.3 description — "because a Skill is never permanently anywhere, one Skill can serve every Project that used it without duplication" — and FR-13's consequence "No Skill is ever instantiated in more than one place at one time."

**Assessment:** This is *mostly* carried and is arguably the closest call in this review. The reason it is listed: the PRD keeps the *property* but not the framing that this is a **relation dissolution** — that condensation is the mechanism by which the project↔skill many-to-many is removed from the model entirely, in time rather than space. FR-6 states the parallel dissolution explicitly for company↔client ("resolves as a field lookup, not a graph edge"); FR-13/FR-14 do not state the matching claim for project↔skill. The asymmetry is likely to prompt an architect to model project↔skill as a stored many-to-many edge — which is exactly what the design dissolved. The routing table does point at the brief addendum for this, which is why severity is LOW rather than higher.

**Where it belongs:** PRD §4.3 FR-14 consequences, or the PRD addendum's architecture notes — one sentence mirroring FR-6's phrasing.

---

## 2. Correctly Carried

The following brief-addendum material survives into the PRD or the PRD addendum with its substance and, where load-bearing, its rationale intact.

**Domain model — entity table.** Fully carried into PRD §3 Glossary. Company/Client/Project/Skill each retain meaning, celestial role, and count. The glossary adds counts the brief addendum kept in a separate *Inventory Magnitude* section (2 companies, ~5–6 clients, ~10 projects, unbounded skills, ~18 Bodies) and folds them into the term definitions — a net improvement in locality.

**Company↔client dissolution.** FR-6 carries both the rule and the reasoning: "Company is an attribute, never a Body… The company ↔ client many-to-many relation resolves as a field lookup, not a graph edge."

**Clean tree consequence.** Carried implicitly via glossary cardinality ("Client… Holds 1..n Projects"; "Project — one delivery for exactly one Client") and FR-12.

**Camera rails — the no-coordinates rule.** Carried strongly and in three places. Glossary *Shot* ("an entity ID plus relative framing parameters… **Never world coordinates**"), FR-17 with all three testable consequences, FR-17 *Out of Scope* carrying the silent-failure rationale verbatim in substance ("a bad shot throws no error — it just quietly looks worse"), and §1 Vision. The PRD addendum adds materially — the argument for a lint or schema-level guard rather than a convention — which is a genuine advance on the source.

**Camera rails — residual background-drift risk.** Carried as R-7 with the source's exact framing ("Entity-relative framing fixes what is centred, not what is behind it") plus its severity, its bounding ("bounded by the small inventory"), and its check point ("Check at M1"). Both reserves are carried: solver bounding as a safety net (§6) and incremental history-pinning (§4.1 note).

**Incremental history-pinning reserve.** Carried in §4.1 `[NOTE FOR PM]`, §12, and R-7 — explicitly flagged "recorded so it is not re-derived from scratch," which is the correct handling.

**Condensation mechanic — resting state, focus, release.** Carried in §4.3 description, FR-13, FR-15, and the glossary. The compositional justification survives near-verbatim: "eighteen objects in a void reads as sparse, eighteen objects in a medium reads as space."

**Condensation — why this shape.** Four of five reasons carried: realism/no-spawning (FR-13 consequences), no connector lines with the network-diagram-in-a-space-costume argument (FR-14), same-implementation-reversed with the one-tuning-pass rationale (FR-13, and expanded in the PRD addendum's architecture notes), and rehearsing the ending (PRD addendum: "Every unfocus is already a miniature collapse," developed further into a build-order argument for M1). The fifth — "it is not a UI panel, so immersion survives" — is not restated, but immersion is carried as a §6 quality gate and the omission is not load-bearing.

**Condensation open implementation questions.** All four carried verbatim in substance, twice: §4.3 `[NOTE FOR PM]` and §13 Q6 — condensation/decay timing, dust density before fog, skill-label legibility while condensed, and A→B focus transition (cross-fade vs. full decay then re-condense). Also correctly routed to M1 as the cheapest tuning point.

**Format validation — decision needs a rejected alternative.** Carried in FR-8 ("a decision including its rejected alternative") and as a testable consequence ("Each populated `notable` names an alternative that was argued against").

**Format validation — raw recall does not surface the decision.** Carried in §8.3 with the SNCF evidence ("the first SNCF draft produced a plausible-but-wrong decision that inverted what actually happened") and the excavation question in bold. The PRD addendum strengthens it into method: "Asking what was *annoying* produces excellent constraint material but not the decision. Two different questions, both needed" — which recovers the annoyance-question half that §8.3 alone drops.

**Format validation — why constraint replaced outcome.** Carried nearly whole in FR-8 *Out of Scope*, including the unfalsifiability argument, the consultant-left-early reason, and the memorable proof line ("anyone can claim a performance improvement; nobody invents 'no container runtime on prem'").

**Fixed field set / no hero entries.** Carried as FR-7, with the schema expanded to include `client`, `company`, and `skills`. The "no hero entries, no minor entries" rule survives as a testable consequence. Note this rule is *deliberately* superseded in effect by the two-class model (Flag 01) — FR-7 keeps schema uniformity while FR-9 introduces content-level classes, which is the correct resolution and is explained in §4.2.

**Technologies not in `notable`.** Carried as FR-10 with the two-channel framing ("prose carries reasoning, geometry carries the stack").

**Cardinality — one engagement, several projects.** Carried as FR-12 including the SNCF-derived reasoning ("Each retains its own problem, constraint, and decision rather than blurring them together"). The specific SNCF example (MDM replacement + platform upgrade programme) is not named in the PRD but is not needed there.

**Performance target — all five components.** Fully carried and improved: the proposed 30fps@1080p threshold (NFR-2, correctly marked `[ASSUMPTION]` and cross-referenced to §13 Q2 and §14), the not-yet-ratified status ("Until ratified, the M3 gate has no testable threshold" — a direct carry of the source's warning), the target hardware profile with its exclusions (NFR-4: "Explicitly not a current Apple-silicon machine and not the dev machine"), the why-30-not-60 reasoning (NFR-2), and the degradation policy verbatim in substance (NFR-3). The PRD additionally corrects the gate placement: M3, not launch.

**Inventory magnitude consequences.** Force-layout settling budget carried as a feature-specific NFR under §4.1 and elaborated in the PRD addendum ("Architecture should not over-engineer for scale that will not arrive"). The guardrail-not-live-threat framing for the framerate constraint is carried verbatim in substance in the PRD addendum's *Settling budget*. Belt-merging demotion carried in §8.2 with its revisit condition ("Revisit only on several-fold growth").

**Audience reasoning — pre-qualified visitor.** Carried in §1 Vision and §2. All three retroactive justifications survive: backward time (§2.2 "which is why backward time is not user-hostile here"), mobile 3D cut (§2.2, §8.2), and load time tradeability (§6 Tradeable). Note the PRD *amends* the third under Flag 04 — First Paint is carved out as non-tradeable (NFR-1) — and correctly attributes the amendment.

**Audience reasoning — work-sample framing raises the bar.** Carried in §1 Vision, §4.4 description ("under a work-sample framing a badly composed hero frame reads as having no eye"), and §4.5. The source's key consequence — that runtime framerate separated from load time and became non-negotiable — is carried in §6 with the correct Flag-03 amendment (non-negotiable as a *quality gate*, not as a launch gate). The source's diagnostic line ("they see a WebGL scene at 34fps, overlapping labels, or a stretched low-res texture") is not quoted but its force is preserved.

**Rejected alternatives — all three groups.** §12 carries composition (3), graph expression (5), and hierarchy (3) with a one-line reason each, and explicitly points at the brief addendum for full reasoning. The compressions are faithful: "a universe whose suns are staffing agencies," "elegant and free but invisible," "breaks past ~6 skills," "makes the billing relationship a visual centrepiece — precisely backwards." Correct handling under the additive rule.

---

## 3. Acceptably Left In Source

Material that lives only in the brief addendum and is fine there, because no PRD requirement depends on it being restated and the PRD addendum's routing table names the brief addendum as authoritative for it.

- **Full rejected-alternatives argumentation.** The five graph-expression alternatives, three composition strategies, and three hierarchy options each carry a paragraph of reasoning in the source. §12 compresses to one line each and links out. Correct — §12's stated purpose is "recorded so they are not re-litigated," not re-argued.
- **The originally-stated relation forms.** "company ↔ client: many-to-many… client → project: one-to-many… project ↔ skill: many-to-many" as a pre-dissolution snapshot. The PRD glossary states the *post*-dissolution cardinalities, which is what implementation needs. The pre-state is history.
- **The "clean tree" phrasing** — "client → project → (transient skills) — which is what lets the solar-system metaphor hold without special cases." Design-history framing; the constraint it produces is fully expressed in the glossary and FR-6/FR-12.
- **The SNCF format-validation walkthrough.** That the field set was tested against one real project before committing, and that the SNCF decision "only became legible once the rejected option — the client's own house standard — was named." §8.3 carries the actionable outcome; the walkthrough itself belongs to the inventory pass.
- **"Skills as meteors" and the field-absence-rule consistency note.** Design-history detail behind an alternative already recorded in §12.
- **The two-companies count as a standalone inventory line.** Absorbed into the glossary's Company definition ("Approximately 2 exist").
- **"It is not a UI panel, so immersion survives."** One of five condensation justifications; immersion is a §6 quality gate and the specific argument is not load-bearing on any FR.
- **"Physics lies read louder than material lies."** A memorable formulation of the realism non-negotiable. The rule itself is carried (FR-13: "No object spawns from nothing or teleports at any point"); the aphorism is source colour.
- **The `notable` field-block code listing** (`project / role / built / team_size / notable` with inline descriptions). FR-7 states the schema in prose and expands it. See GAP-2 for the one detail from this section that *should* have been carried.

---

## 4. Summary Table

| ID | Severity | Gap | Home |
|---|---|---|---|
| GAP-1 | Medium | `notable` 100–150 target vs. 90 floor unexplained; prose-not-list rule loses its origin | PRD §4.2 FR-8 |
| GAP-2 | Medium | "Numbers that do exist and should be used" (team size, duration, system scale, what was replaced/consolidated) dropped from both docs | PRD §4.2 FR-8 / PRD addendum, Content Authoring |
| GAP-3 | Medium | "Variation must come from the camera — hierarchy lives in the cinematography" and its M2-gate verification instruction dropped | PRD §4.4 FR-18 note, §9 M2 gate |
| GAP-4 | Low/Med | Free-flight (FR-19, Q8) inherits no composition constraint despite the rails' authored-composition reasoning | PRD §13 Q8 / FR-19 note |
| GAP-5 | Low | project↔skill relation *dissolution* not stated as FR-6 states company↔client's; risk an architect models a stored edge | PRD §4.3 FR-14 / PRD addendum architecture notes |

**Overall assessment.** Carry-over fidelity is high. The camera rot defence, the performance target block, the condensation mechanic and its open questions, the audience reasoning, and the rejected-alternatives set are all carried faithfully, and in several places the PRD and its addendum improve on the source (the lint-vs-convention argument for FR-17, the M1 generality argument for the force system, the correct re-gating of framerate to M3). The gaps are concentrated in the *content-authoring* half of the source — the Format Validation and Information Layer sections — where the PRD carried the prohibitions but not the positive instructions, and in one verification instruction (M2-gate check on camera-borne hierarchy) that fell between the two documents because its premise was superseded while its consequence was not.
