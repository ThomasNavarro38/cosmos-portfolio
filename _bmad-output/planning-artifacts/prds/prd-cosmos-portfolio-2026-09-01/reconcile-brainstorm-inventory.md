---
title: "Input Reconciliation: Brainstorm + Inventory Draft vs PRD"
status: review
created: 2026-09-01
reviewer: input-reconciliation pass
---

# Input Reconciliation — Brainstorm & Inventory Draft against the PRD

**Target:** `prds/prd-cosmos-portfolio-2026-09-01/prd.md` (+ its `addendum.md`)

**Sources reconciled:**

1. `brainstorming/brainstorm-cosmos-scrollytelling-portfolio-2026-08-30/brainstorm-intent.md` — the oldest document in the chain (2026-08-30). Some of its content is legitimately superseded by the brief (2026-08-31) and the PRFAQ. Supersession is called out where it applies rather than reported as loss.
2. `planning-artifacts/briefs/brief-cosmos-portfolio-2026-08-31/inventory-draft.md` — the working content file, still in progress.

**Method:** every discrete claim in each source was traced to a home in the PRD — in scope (§4/§8.1), out of scope (§7/§8.2), an open question (§13), a risk (§10), or the PRD addendum. Anything with no home is a gap. Severity is assessed by what silently breaks downstream: **Critical** = a downstream workflow (architecture, UX, epics) will produce something wrong or incomplete; **High** = a real decision is lost and will be re-derived or re-litigated; **Medium** = reasoning or rationale is lost but the decision survives; **Low** = cosmetic or already implicitly covered.

---

# SOURCE 1 — Brainstorm Intent

## 1.1 Gaps Found

### G-1 — `duration` is absent from the Project schema, but three requirements depend on it

**Severity: Critical**

The brainstorm establishes duration as load-bearing in two separate places:

> `mass` = duration

> no parent + no duration ⇒ transient / meteor (certs, talks, languages, OSS)

The PRD carries both forward — FR-3 ("mass from duration") and FR-5 ("An entry with no parent and no duration is treated as a transient object") — but **FR-7's schema does not contain a duration field, nor any date field**:

> Every Project carries the identical field set: client, project, company, role, built, team_size, notable, skills.

FR-3 also requires **recency** ("A more recent entry renders brighter than an older one"), which needs a date the schema likewise does not define. So three of the PRD's own testable consequences reference data the PRD's own schema cannot supply.

This is not purely an inherited defect: the inventory draft's field set is also missing duration/dates, and the brief's "What the Site Says" list omits them too. But the brainstorm is where duration is named as a mapping input, and the PRD is where the schema is fixed — so the PRD is where the contradiction lands. `bmad-architecture` cannot define the JSON schema from FR-7 as written, and `bmad-create-epics-and-stories` would generate a data-model story that silently drops the field the layout depends on.

**Where it belongs:** FR-7's field list, plus a note in §8.3 that every entry needs start/end (or duration + end date). The likely reason for the omission is §2.2's "Anyone seeking dates and employers — that information is upstream in the CV" — but that is a statement about *display*, not about *data*. Duration and recency must exist in the data even if no date is ever rendered. Worth stating explicitly so the distinction is not lost again.

---

### G-2 — Two of the three classification-by-absence rules were dropped, and the drop was framed as a feature cut

**Severity: High**

The brainstorm gives three rules under one heading, presented as a single mechanism with three consequences:

> **Classification by field ABSENCE** (no special-casing):
>   - no parent + no duration ⇒ transient / meteor (certs, talks, languages, OSS)
>   - gaps in the timeline auto-emit as nebulae
>   - clustered small items auto-merge into belts

The PRD's FR-5 carries **rule 1 only** (and only its transient half — see G-3). Rules 2 and 3 appear only in §8.2 Out of Scope, and are framed there as discretionary feature cuts rather than as removals from the classification mechanism:

> - **Belt-merging of clustered small items** — ~18 Bodies is far too few to cluster. Revisit only on several-fold growth.
> - **Nebula gaps, meteor taxonomy, mass-damped scroll, date readout** — brainstorm "Should" items, none load-bearing for the M2 gate.

Two problems.

**First, the belt rule's cut is well-reasoned and traceable** (brief addendum line 47 demotes it explicitly on inventory-size grounds; the PRD's §8.2 line matches). That one is fine — see §1.3 Correctly Carried.

**Second, the nebula-gap rule's cut is not reasoned anywhere.** It is disposed of in a compound bullet that lumps it with three unrelated items and dismisses all four with one clause ("brainstorm 'Should' items"). But nebula gaps are not a decorative Should in the same sense that a date readout is: the brainstorm presents them as an *automatic emission of the layout algorithm* — the system's answer to what occupies empty timeline. Cutting them is legitimate, but it leaves an unanswered question the PRD never asks: **what does the scene show where there is no work?** A career with a gap, a sabbatical, or simply a sparse early period now has undefined visual treatment, and §4.3's own argument that "eighteen objects in a void reads as sparse" makes the empty-region problem explicitly live.

**Where it belongs:** either (a) FR-5 gains a third consequence stating that timeline gaps have no special treatment in v1 and render as ordinary empty space, with the reason; or (b) §13 gains a question: *what does the scene show across an empty stretch of timeline, and is Dust alone enough?* Option (a) is cheaper and probably correct given Dust already fills inter-body space; but it should be a stated decision, not a silence.

---

### G-3 — The transient/meteor rule survived only half-intact: the *taxonomy* was cut but the *entity class* was kept

**Severity: High**

FR-5 states:

> An entry with no parent and no duration is treated as a transient object.

But "meteor taxonomy" is simultaneously listed in §8.2 as out of scope. These are in tension. FR-5 defines transient objects as a class the schema produces; §8.2 removes the rendering treatment for them; and no requirement anywhere says **what a transient object actually looks like, or whether any exist at launch**.

Compounding this, the brainstorm names the transient content set explicitly — *certs, talks, languages, OSS* — and **none of these four categories appear anywhere in the PRD**. The Glossary (§3) defines Company, Client, Project, Skill, Body, Notable, Deep/Shallow Project, Weight, Focus, Condensation, Rail, Shot, Dwell, and more, with population counts for each. There is no entry for a transient object, no count, and no statement that the launch inventory contains zero of them. §8.3 Content authoring speaks only of "roughly nine entries across ~5–6 clients" — projects only.

The likely truth is that transients are simply not in the launch inventory, which would make FR-5's first consequence untestable at M2 and the §8.2 cut correct. But that is inference. As written, a downstream reader gets a requirement (FR-5) whose realisation is out of scope (§8.2), for a content category that is never inventoried.

**Where it belongs:** the Glossary needs either a **Transient** entry with an approximate count (as every other entity type has), or §8.3 needs one line stating that certifications, talks, languages, and OSS contributions are not part of the M2 inventory and that FR-5's transient branch is therefore structural provision only, unexercised at launch. The second is likely the honest answer and costs one sentence.

---

### G-4 — "Collapse is implemented by disabling repulsion in the same force system" is architecturally load-bearing but lives only in the addendum

**Severity: Medium**

The brainstorm states it as a core structural decision:

> Collapse is implemented by disabling repulsion in the same force system.

It appears in the PRD **only inside R-6's assumption text**, as a supporting argument for the procedural-collapse proposal:

> ...and the brainstorm already identifies disabling repulsion as the collapse mechanism.

The PRD addendum develops it much further, and this is the strongest observation in the whole reconciliation set:

> **The collapse and the condensation are the same mechanism at different scales.** [...] Every unfocus is already a miniature collapse. If the M4 procedural assumption (R-6) holds, this is one system used three ways — condensation, decay, and ending — which is a strong argument for building the force system with that generality at M1 rather than retrofitting it at M4.

That is an **M1 architectural instruction with an M4 payoff**, and it is currently reachable only by a reader who opens the addendum and reads to §Architectural Contract. Everything gating it in the PRD proper is conditional on an unratified assumption (R-6, §13 Q4). If Q4 resolves as "procedural in-engine" and M1 was already built without that generality, the retrofit cost is real and was avoidable.

Not a hard gap — the material exists and is well-reasoned — but its placement inverts its urgency: the M1 consequence is buried under an M4 risk.

**Where it belongs:** §9 Milestones, M1 row, or FR-13's note — one line: *build the force system so repulsion can be disabled globally; condensation, decay, and the M4 collapse are the same mechanism at three scales.* It costs nothing at M1 and removes a dependency at M4.

---

### G-5 — The technical approach (NASA/ESA textures, drei, post-FX, Blender bookends) has no home in the PRD

**Severity: Medium**

The brainstorm dedicates a section to it:

> - **Interactive middle: real-time 3D.** Spheres + NASA/ESA public-domain texture maps + drei built-ins + post-processing film artifacts. Realism is bought/borrowed/baked, not modelled.
> - **Two bookends: pre-rendered Blender**, scroll-scrubbed — the opening shot and the final collapse.

The brief carries both forward verbatim (brief.md:38, :94–95). The PRD carries **neither**. §4.5 says only that photographic textures, realistic lighting, and post-processing "are M3"; §8.2 and the M3 milestone row say the same. The *sourcing strategy* — that realism is borrowed from public-domain NASA/ESA maps rather than modelled, which is the entire reason the project is viable given the author's stated 3D limitation — appears nowhere.

The Blender half is legitimately in flux (R-6 proposes removing it), and that is fine. But the texture-sourcing decision is independent of R-6 and is not in question. It is also the answer to the brainstorm's stated rationale:

> Hybrid, chosen because the author's 3D modelling skill is below the quality bar he refuses to lower — but this subject needs almost no modelling.

**Where it belongs:** a one-line note on §4.5's Out of Scope block or the M3 milestone row — *M3's realism is sourced (NASA/ESA public-domain texture maps, drei built-ins, post-FX film artifacts), not modelled.* Arguably defensible to omit from a PRD as an implementation choice; but it is the load-bearing feasibility argument for M3 existing at all, and R-6 already shows what happens when a milestone's implementation route goes un-interrogated.

---

### G-6 — Two brainstorm open questions were resolved without being recorded as resolved

**Severity: Low–Medium**

The brainstorm's closing list has seven items. Six are traceable. Two of the resolutions are silent:

| Brainstorm open question | Status in PRD |
|---|---|
| Actual inventory of career entries | ✅ §8.3, §13 Q12, R-1 — carried, and correctly identified as the largest task |
| Specific content per role, at what depth | ✅ **Resolved and recorded** — §4.2's two Project classes, FR-7/FR-8, §12 Rejected Alternatives |
| Visual identity: palette, typography, UI chrome | ✅ **Escalated** — FR-20, R-4, PRD addendum §Visual System |
| Copy tone and voice for the information layer | ⚠️ **Only in the PRD addendum** (§Visual System, final para): *"Copy tone and voice remain open from the brainstorm."* Not in §13 Open Questions, not an FR |
| Concrete JSON schema field names and validation rules | ⚠️ **Silently resolved** — FR-7 fixes the field names, but no §13 entry closes the question and no validation rules exist anywhere (see G-1 and the 90-word floor at FR-8, which is the only validation rule stated) |
| Where the flat star-chart fallback triggers, and how much it conveys | ✅ §13 Q9, FR-22 note, addendum §Open Design Territory |
| Contact form backend/handling | ✅ §13 Q10, FR-23 |

Two soft gaps:

**Copy tone/voice** is a real open item that the PRD addendum acknowledges but §13 does not list. §13 is where a downstream reader looks for the unresolved set; an item that exists only in the addendum's prose is easy to miss, and UX will need it (the addendum itself flags that the Colophon, contact route, Fallback, and labels have no voice specified).

**JSON schema validation rules** — the brainstorm asked for "field names *and validation rules*." FR-7 answers the first half. The second half is answered only for `notable` (the 90-word floor, FR-8) and `weight` (defaults to 1, FR-4). There is no statement of which fields are required versus optional — which matters enormously here, because **classification by absence makes optionality the type system**. Which fields may be empty *is* the schema.

**Where it belongs:** §13 gains a question for copy tone/voice (pointing at the addendum's list of unvoiced surfaces), and FR-7 gains a consequence naming which fields are required and which may be empty — `notable` empty ⇒ Shallow is already stated at FR-5, so the pattern exists; it just needs completing across the field set.

---

### G-7 — "No vertical slice first" survives as a fragment without its reasoning

**Severity: Low**

Brainstorm:

> ## Build order
> No vertical slice first — deliberate decision; straight into M1.

PRD §9:

> Each milestone has a gate. No vertical slice first — deliberate.

The decision is carried, and flagged as deliberate. But "straight into M1" and any rationale are gone, and §12 Rejected Alternatives — which exists precisely to stop re-litigation — does not list it. Given R-1 names capacity as the critical risk, "should we do a thin vertical slice first?" is exactly the kind of question that will be raised again by a downstream planning workflow. §12 is the right place to close it, but the brainstorm never gave a reason, so there is nothing to quote. Flagged as a thin spot rather than a loss.

---

## 1.2 Likely Superseded (not gaps)

### S-1 — Mission framing: "recruiters, peers, clients" → narrowed and re-pointed

**Superseded by the brief and PRFAQ. Deliberate, and better documented downstream than in the source.**

Brainstorm:

> - Audience: OTHERS (recruiters, peers, clients) — outward-facing, not introspective.
> - Success: a visitor learns what Thomas worked on and what his skills are, delivered with fun and awe.

The PRD narrows to technical readers (§2), explicitly declines non-technical recruiters (§2.2, §7), and drops "clients" as an audience entirely. This is the PRFAQ's funnel-positioning work, and §7's "Does not change a hiring decision — top of funnel" is a *deliberately narrower claim than the brief's implied one* (the PRD says so itself). Correctly superseded.

Note that the brainstorm's core success criterion survives intact and elevated: *"Communication is the job; awe is the delivery mechanism. Content legibility is a hard requirement, equal to awe"* is NFR-7, near-verbatim. Good carry.

### S-2 — Non-negotiables as preconditions → non-negotiables as quality gates

**Superseded by PRFAQ Flag 03. Explicitly and correctly.**

Brainstorm:

> ## Non-negotiables
> - **Realism** — materials, lighting, textures.
> - **Immersion**.
> - **Visitor awe**.

PRD §6:

> **Not tradeable (quality gates for the finished artifact):** realism of materials and lighting, immersion, visitor awe, runtime framerate. **These are not launch gates.** They had been functioning as preconditions to existing, which is what kept the finish line receding.

This is the single largest structural change in the chain and the PRD handles it exactly right — the non-negotiables are preserved as non-negotiable *for the finished artifact* while being removed as launch blockers. Not a gap; a well-executed supersession with its reasoning intact.

### S-3 — The five-milestone build order → same five, M2 promoted to launch

**Superseded by Flag 03.** Brainstorm M1–M5 map 1:1 onto PRD §9's table, with gates preserved almost verbatim ("does the pacing work untextured?" → "Does the pacing work with no visual polish at all?"). The change is that M2 is now LAUNCH and M3–M5 are post-launch upgrades. Correctly carried and correctly amended.

### S-4 — Pre-rendered Blender bookends → under active challenge

**Superseded-in-progress, correctly flagged.** The brainstorm's Blender bookends are challenged by R-6 and §13 Q4, which propose procedural in-engine collapse instead. This is an open decision the PRD handles well — it names the dependency, names the risk (the avoided skill), and proposes a route out. Not a gap. (The *opening* bookend, however — the brainstorm specifies **two** bookends, "the opening shot and the final collapse" — is discussed nowhere. R-6 and Q4 address the collapse only. Minor; folded into G-5 rather than raised separately, since if Blender goes, both go.)

### S-5 — "Scroll pacing may be mass-damped (gravity-driven) only if complexity stays low"

**Superseded, but see G-2 on how.** The brainstorm hedged this itself (*"only if complexity stays low"*), listed it as Should, and listed the extended version — *"Gravity-driven pacing beyond basic mass damping"* — as Could. The PRD replaces it with something better: **FR-18, derived Dwell**, which achieves the same intent (pacing follows data, not hand-tuned numbers) through content depth rather than physics. That is a genuine improvement and the substitution is sound.

The supersession is real. The complaint in G-2 is only that §8.2's disposal line does not say any of this — it files mass-damped scroll alongside date readout as an unexplained Should cut, when in fact it was *replaced by a superior mechanism that is in launch scope*. One clause would fix it: "mass-damped scroll (superseded by derived Dwell, FR-18)."

### S-6 — "Annotations" and "date readout"

**Superseded / correctly cut.** "Annotations" as a Should is ambiguous in the source and is plausibly absorbed by the information layer (FR-7/FR-8) and the Colophon (FR-21); §12 also records "demotion to text — skills as annotation only" as a rejected alternative for the *skills* sense of the word. "Date readout" is directly contradicted by §2.2 (*"Anyone seeking dates and employers — that information is upstream"*) and its cut is consistent with the PRD's positioning. Both fine. **Caveat:** cutting the date readout is a display decision, and it should not be allowed to justify dropping dates from the *data* — see G-1.

### S-7 — "Progressive loading"

**Superseded and promoted.** Brainstorm Should. The PRD converts it into NFR-1's mechanism — *"Everything behind it — full Dust density, remaining Bodies, complete Rail — may stream in"* — and makes it serve a launch-blocking budget. Better than carried: promoted. §8.2 does not list it among the cut Shoulds, correctly.

### S-8 — Free flight

**Promoted from Should to launch scope.** Brainstorm Should → PRD FR-19, in §8.1 M2 scope, with §13 Q8 for its boundaries. Note this is a *scope increase* against the brainstorm — worth flagging only because §6's scope guardrail exists specifically to resist that, and free flight arrived before the guardrail did. Not a gap; recorded for awareness.

### S-9 — "Original three-phase framing superseded"

**Self-superseding.** The brainstorm records its own supersession (education/professional/contact, wormhole-linked → continuous backward-time cosmos). Correctly absent from the PRD; nothing to carry.

---

## 1.3 Correctly Carried

Recorded so this pass is not repeated on items that are fine.

| Brainstorm item | PRD home | Quality |
|---|---|---|
| Time runs backward, present → past | FR-16 | Carried and strengthened — FR-16 adds the "three masters, one decision" argument |
| Guided rails by default, free flight on request | FR-17, FR-19, §8.1 | Full |
| Embedded JSON as single source of truth, no CMS/backend | FR-1, NFR-6, §8.2 | Full, and hardened into a permanent rejection |
| Force-directed layout, never authored | FR-2, §4.1 | Full |
| The three mapping rules (mass/brightness/distance) | FR-3 | Full, with "no fourth mapping rule exists" added as a testable — a good addition |
| ONE KNOB: `weight`, default 1 | FR-4, NFR-5, SM-4 | Full, and elevated to a success metric |
| No position overrides, with the "they'd rot / author is lazy" reasoning | FR-2 Out of Scope, §8.2 | Full — reasoning preserved verbatim, and upgraded from "deliberate" to "permanently rejected, not deferred" |
| Classification by absence, rule 1 (transient) | FR-5 | Partial — see G-3 |
| Readable information layer / legibility equal to awe | NFR-7, §4.2, M2 gate | Full — near-verbatim |
| Flat star-chart fallback | FR-22, §13 Q9 | Full, including the open trigger question |
| **Ending arc: awe → calm, dies peacefully, not violent or ominous** | §8.2, M4 gate row | **Carried — see note below** |
| Collapse into black hole that becomes the contact form; no wormhole | §8.2, FR-23, M4 | Full |
| Mobile 3D / real astronomical distances / overrides / CMS as Won't | §7, §8.2 | Full — all four Won'ts present |
| Load time, mobile parity, breadth, build time as tradeable | §6 | Full, with First Paint carved out (Flag 04) |

**On the emotional arc specifically** — this was called out for careful checking, and it survives, in two places:

> - **Collapse ending and black-hole contact surface** — **M4.** Holds the emotional climax; the arc is awe then calm, and the universe ends peacefully. (§8.2)

> | M4 | Collapse ending — bookends and contact surface | Does the ending land as awe then calm? | (§9)

Both halves of the brainstorm's phrasing are present — "awe → calm" and "dies peacefully" — and the arc is correctly made the **M4 gate criterion**, which is stronger than the brainstorm's framing. The one word not carried is the negative constraint: *"Not violent, not ominous."* That is the actionable half for whoever executes M4 (a black hole is the default-ominous object in the entire visual vocabulary; "peaceful" is the counter-instruction). **Recommendation: append "not violent, not ominous" to §8.2's M4 line.** Severity Low — it is post-launch and the positive framing survives — but it is one clause and it is the half a designer would need.

---

# SOURCE 2 — Inventory Draft

## 2.1 Gaps Found

### G-8 — FR-7's schema matches the inventory field set exactly — with one omission

**Severity: Critical (same root cause as G-1) — otherwise clean**

Checked field by field, as requested:

| Inventory field | In FR-7? |
|---|---|
| `client` | ✅ |
| `project` | ✅ |
| `company` | ✅ |
| `role` | ✅ |
| `built` | ✅ |
| `team_size` | ✅ |
| `notable` | ✅ |
| `skills` | ✅ |

**All eight fields are present in FR-7, in the same order, with the same names.** Specifically, `skills` and `company` — the two flagged for checking — are both there:

> Every Project carries the identical field set: client, project, company, role, built, team_size, notable, skills.

This is a clean carry, and better than the brief, whose "What the Site Says" list (brief.md:59–65) omits `client`, `company`, and `skills` entirely. The PRD went back to the inventory draft rather than to the brief for this. Good.

**The omission** is that neither document has a duration or date field, which G-1 covers in full. Recorded here only to note that the inventory draft is the place the fix has to *also* land — the SNCF entry as drafted carries no dates, and if the remaining nine are drafted to the current field set, the layout has no mass input for any of them. **Add duration/dates to the inventory draft's field set before the nine remaining entries are drafted**, or the excavation pass has to be revisited.

One further note: `company` is marked `_(intermediate — to fill)_` on the only drafted entry. FR-6 requires Company to render as "a label or tint on the Project's information layer," so the field is not optional in practice. Minor content-authoring item, not a PRD gap.

---

### G-9 — The excavation question is carried, but its *counterpart* question is not

**Severity: Medium**

The inventory draft states the method:

> **Before drafting each entry, answer:** what did you argue for, and what did you argue against? The decision does not reliably surface from a description of the work.

The PRD carries this well — §8.3 quotes it, §13 Q12 attaches it to the remaining nine, and the PRD addendum §Content Authoring elevates it to "the whole method" with the SNCF proof:

> drafting from raw recall produced a plausible decision that inverted what actually happened.

**What is missing from the PRD** is the second question, which appears only in the PRD addendum:

> Asking what was *annoying* produces excellent constraint material but not the decision. **Two different questions, both needed.**

The PRD proper mentions only one. But FR-8 requires *problem → constraint → decision*, and per the addendum, the two questions produce **different thirds of that structure** — "what did you argue?" yields the decision, "what was annoying?" yields the constraint. The constraint is not decorative: FR-8's Out of Scope block makes it the entire falsifiability substitute for the absent metrics —

> The **constraint** is the falsifiability substitute: anyone can claim a performance improvement; nobody invents "no container runtime on prem."

So the PRD requires a constraint, explains why the constraint carries the whole evidentiary load, and omits the elicitation question that produces it. A content pass run from §8.3 alone would ask one question and get two-thirds of a `notable`.

**Where it belongs:** §8.3, alongside the existing question. One sentence: *and separately, "what was annoying about the environment?" — which surfaces the constraint; the two questions produce different thirds of problem → constraint → decision.*

---

### G-10 — The SNCF entry validates the format, and the PRD never says what it validated

**Severity: Medium**

The inventory draft's status line:

> **Status:** drafted, approved in conversation

and its header:

> Format validated against the SNCF entry; see `addendum.md` §Format Validation.

The PRD acknowledges the entry as a *count* — "One entry (SNCF, MDM replacement) is drafted and approved; roughly nine remain" (§8.3) — and R-2 says the core bet is untested. But **it never states what the SNCF entry proved**, and the proof is substantial. Reading the drafted `notable` against FR-8's requirements, it satisfies every one:

- **Problem** — "The Oracle MDM cost twice: an expensive licence, and a team employed full-time to correct the data it produced."
- **Constraint** — "rebuilding a mature product's behaviour with no specification to work from — documentation was absent or years stale, so the incumbent's real rules had to be recovered from the system itself." Unfakeable, environment-specific, exactly the kind FR-8's Out of Scope block describes.
- **Decision with named rejected alternative** — "The house standard was Spring on a dedicated external Tomcat... **I argued for Spring Boot with embedded Tomcat instead**." The alternative is named, which FR-8 requires.
- **Length** — ~150 words, at the top of the 100–150 band and comfortably over the 90-word floor.
- **No technology names in prose?** — ⚠️ **Fails.** The `notable` names Oracle, Spring, Spring Boot, and Tomcat. FR-10 states flatly: *"No technology name appears in any `notable`."*

That last point is the substantive finding. **The one entry that validated the format violates FR-10 as written.** And it does so for a good reason: the decision *is* "Spring Boot with embedded Tomcat over Spring on external Tomcat." That decision cannot be stated without naming the technologies. Strip them and the paragraph says "I argued for a different deployment model," which is exactly the padded, unfalsifiable register FR-8 exists to prevent.

So FR-10's consequence is too absolute. Its *intent* is sound — no duplication between the prose channel and the geometry channel, technologies live in the Dust — but "no technology name appears in any `notable`" is falsified by the only approved specimen, and if enforced literally it would degrade that specimen.

**Where it belongs:** FR-10's first consequence needs amending to something like *"`notable` does not enumerate a project's stack; a technology may be named where it is the substance of the decision itself."* And §8.3 or FR-8 should record what SNCF proved — that the problem → constraint → decision structure produces a paragraph that works at ~150 words, and that the constraint clause is achievable from real material. That is meaningful evidence for R-2 (the core bet), which currently reads as though nothing has been tested at all.

---

### G-11 — "Roughly 8 more projects across ~5-6 clients and 2 intermediate companies" vs the PRD's "roughly nine"

**Severity: Low**

Inventory draft:

> Not yet drafted. Roughly 8 more projects across ~5-6 clients and 2 intermediate companies.

plus one explicitly identified but undrafted entry (SNCF — Platform upgrade programme), giving 8 + 1 = 9 undrafted, 10 total. PRD §8.3: "roughly nine remain." **These agree** — the PRD's nine counts the SNCF platform-upgrade entry among the remaining, which is correct since it is listed as "not drafted."

Recorded only to confirm the arithmetic reconciles, and to note that the Glossary's "~10 Projects" and "~2–3 Deep / ~7 Shallow" are consistent with it. No gap. The one thing the PRD does not carry is that the second SNCF entry is **already identified with raw material available** —

> Raw material available: major Java upgrades, Cloudera upgrades, significant accumulated technical debt, ageing on-premise stack, dated supervision tooling.
> **Open:** what was argued for and against here? The decision is not yet identified.

— which makes it the cheapest next entry to draft and a natural candidate for the two-entries-cold-read the addendum calls "the cheapest de-risking action in the entire plan." Worth a pointer in §8.3, but the inventory draft holds it fine.

---

## 2.2 Likely Superseded (not gaps)

### S-10 — "Every project carries the same fields, in the same depth"

The inventory draft's header presents a single uniform field set with no notion of entry classes. That framing is **superseded by PRFAQ Flag 01** — the two-class model (§4.2, FR-7/FR-9). But note the supersession is narrower than it looks: the *field set* stays uniform (FR-7 preserves it exactly), only the *depth* varies, and it varies through `notable` being empty rather than through a schema change. The inventory draft's field set is therefore still current and needs no revision on this account. Correctly handled.

### S-11 — "Responsibilities (source material, not for publication)"

The SNCF entry carries a field the schema does not:

> **Responsibilities (source material, not for publication):** most technical and business design, architecture, code reviews, junior developer growth.

Correctly absent from FR-7 — it is explicitly working material, not a publishable field, and the PRD addendum's observation that a padded `notable` "states responsibility — which `role` already covers" shows the reasoning was carried even though the field was not. No gap.

---

## 2.3 Correctly Carried

### The "Material deliberately excluded" section — carried twice, verbatim, in both documents

This was flagged for checking and it is the **best-executed carry in the entire reconciliation**. The inventory draft:

> **Client relationship friction (SNCF).** The client was demanding while deflecting responsibility for problems. Excluded from publication: a reader cannot verify it, both sides of such an account always exist, and published criticism of a named former client reflects on the author rather than the client. Retained here only so the decision is not silently revisited.

PRD FR-11 Out of Scope:

> **Client relationship friction.** Deliberately excluded from publication: a reader cannot verify it, both sides of such an account always exist, and published criticism of a named former client reflects on the author. Recorded so the decision is not silently revisited.

PRD addendum §Deliberately Excluded from the PRD carries it a third time, with attribution back to `inventory-draft.md`.

All three reasons survive intact, as does the meta-instruction ("recorded so the decision is not silently revisited"). The only thing dropped is the *specific* content of the friction ("demanding while deflecting responsibility"), which is correct — that detail belongs in the working file, not in a document that may be shared. Exemplary handling.

### Other clean carries

| Inventory item | PRD home |
|---|---|
| Client = star, company = intermediate attribute | §3 Glossary, FR-6 |
| `notable` = problem → constraint → decision, 100–150 words | FR-8, §3 Glossary |
| `skills` as "relation to skills/technologies (condensing dust)" | FR-10, FR-13, §4.3 |
| Real client names ship (SNCF named openly) | FR-11 |
| One engagement → several projects (the two SNCF entries) | FR-12 — and the inventory draft is the *evidence* for FR-12, since SNCF is exactly the case |
| "The decision does not reliably surface from a description of the work" | §8.3, PRD addendum §Content Authoring |
| Inventory gates the launch milestone | §8.3, §13 Q12, R-1 |

---

# Summary Table

| # | Severity | Gap | Belongs in |
|---|---|---|---|
| G-1 | **Critical** | `duration`/date absent from FR-7 schema, but FR-3 (mass, brightness) and FR-5 (transient rule) both require it | FR-7 field list; §8.3 |
| G-8 | **Critical** | Same omission in the inventory draft's field set — must be fixed before the nine remaining entries are drafted | inventory-draft.md field set |
| G-2 | High | Nebula-gap rule cut without reasoning; leaves "what fills an empty timeline stretch?" unanswered | FR-5 consequence, or §13 |
| G-3 | High | Transient/meteor class defined (FR-5) but its rendering cut (§8.2) and its content (certs/talks/languages/OSS) never inventoried | §3 Glossary or §8.3 |
| G-10 | Medium | SNCF `notable` violates FR-10's absolute "no technology name" rule — and is right to; FR-10 needs amending. What SNCF validated is unrecorded | FR-10 consequence; §8.3 |
| G-9 | Medium | The second excavation question ("what was annoying?") — which produces the *constraint* — is only in the addendum | §8.3 |
| G-4 | Medium | "Collapse = disabling repulsion" is an M1 architectural instruction filed under an M4 risk | §9 M1 row or FR-13 note |
| G-5 | Medium | NASA/ESA texture sourcing — the feasibility argument for M3 — appears nowhere | §4.5 or M3 milestone row |
| G-6 | Low–Med | Copy tone/voice open only in addendum, not §13; schema validation rules (required vs optional fields) unstated | §13; FR-7 |
| G-11 | Low | (No gap — counts reconcile.) Second SNCF entry is the cheapest next draft; pointer would help | §8.3, optional |
| G-7 | Low | "No vertical slice" carried without reasoning and absent from §12 | §12, optional |
| — | Low | "Not violent, not ominous" — the actionable half of the M4 emotional arc — dropped | §8.2 M4 line |

**Two mechanical fixes worth making regardless**, both one clause:
- §8.2's compound cut line should distinguish *superseded* from *deferred*: mass-damped scroll was **replaced by derived Dwell (FR-18)**, which is in launch scope; progressive loading was **promoted into NFR-1**. Filing them as unexplained "Should" cuts alongside date readout misrepresents both.
- §8.2's M4 line should regain "not violent, not ominous."

---

# Overall Assessment

The PRD is a high-fidelity carry. Every Must from the brainstorm is present and most are strengthened; the Won'ts are all four intact and hardened from "deliberate" to "permanently rejected"; the inventory draft's field set is reproduced exactly (better than the brief managed); and the deliberate-exclusion decision is carried three times with its full reasoning. The supersessions — non-negotiables from preconditions to quality gates, uniform depth to two classes, M2 to launch — are all deliberate, documented, and improvements.

The gaps cluster in one place and one pattern:

**The single real defect is G-1/G-8** — the schema cannot supply the data its own mapping rules require. Both source documents share the omission, so it is inherited rather than introduced, but the PRD is where the schema became normative and where FR-3 and FR-5 made the dependency explicit. It needs fixing in both the PRD and the inventory draft, and in the inventory draft **before the remaining nine entries are drafted**.

**The pattern is compound disposal.** §8.2's line — "Nebula gaps, meteor taxonomy, mass-damped scroll, date readout — brainstorm 'Should' items, none load-bearing" — bundles four items with four different fates (an unanswered question, a half-kept entity class, a superseded-by-something-better, and a correct cut) under one dismissal. That single line is the source of G-2, G-3, and half of S-5. Unbundling it into four clauses, each with its actual fate, would close three findings at once and is the highest-value edit in this review.

**One finding is a genuine contradiction rather than an omission: G-10.** FR-10 forbids technology names in `notable`, and the only approved `notable` names four of them because the decision cannot be stated otherwise. That rule will be enforced by whoever drafts the remaining nine, and enforcing it literally would flatten exactly the decisions FR-8 exists to capture.
