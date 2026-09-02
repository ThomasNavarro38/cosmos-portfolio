---
title: "Input Reconciliation — PRFAQ Distillate vs PRD"
source_input: "_bmad-output/planning-artifacts/prfaq-cosmos-portfolio-distillate.md"
target: "_bmad-output/planning-artifacts/prds/prd-cosmos-portfolio-2026-09-01/prd.md"
also_checked: "addendum.md"
created: 2026-09-01
authority: "Distillate is AUTHORITATIVE — supersedes the product brief. PRD was drafted primarily from it."
---

# Reconciliation: PRFAQ Distillate → PRD

**Overall verdict:** carry-through is high. The distillate's spine — funnel positioning, the transfer claim, two body classes, M2-as-launch, the schematic idiom, derived dwell, first paint, the content model, the rejected sets — is present and mostly stated in the distillate's own words. Gaps are concentrated in three places: (1) **reasoning stripped from otherwise-carried conclusions** (Flags 01 and 04 lose their causal arguments), (2) **the unratified-threshold discipline is broken in one place** (NFR-2 silently ratifies), and (3) **the M2 scope list drops one item and softens another**.

Fourteen gaps found: 2 High, 7 Medium, 5 Low. One true contradiction. Nine additions not in source, all defensible but listed for visibility.

---

## 1. Gaps Found

### G-01 — HIGH — Flag 04's framerate threshold is silently RATIFIED, violating "Unratified Thresholds"

**Distillate (§Unratified Thresholds, line 120):**
> "**Framerate target** — proposed locked 30fps @ 1080p on 2023-era integrated graphics with full post-FX, falling back to the flat star chart below that. **Never ratified by the author.** M3 gate has no testable threshold until it is."

**PRD (§5, NFR-2):**
> "`[ASSUMPTION: Locked 30fps at 1080p on 2023-era integrated graphics with full post-FX, **ratifying the addendum's proposal**. Below that threshold, serve the Fallback.]`"

And §14 Assumptions Index: "**§5 NFR-2** — **Ratifies the addendum's proposal**".

**Why this is a gap, not a nitpick:** the distillate marks this as *never ratified by the author*, and the section it lives in exists specifically to prevent silent ratification. The PRD uses the verb "ratifying" — twice — inside an `[ASSUMPTION]` tag. The `[ASSUMPTION]` wrapper and §13 Q2 ("Ratify 30fps... or amend") partially rescue it, and §0 states all six assumptions are "proposals awaiting ratification, not decisions." But the local wording contradicts the wrapper. A downstream reader scanning §5 or §14 sees the word "ratifies" and treats the number as settled.

**Also lost:** the distillate names the *author* as the missing ratifier ("Never ratified by the author") and states the consequence ("M3 gate has no testable threshold until it is"). The PRD's Q2 carries the consequence; the PRD nowhere carries that the addendum's proposal was never author-approved.

**Fix / where it belongs:** §5 NFR-2 — replace "ratifying the addendum's proposal" with "**proposing** the addendum's number, which the author has never ratified." Same change in §14. Optionally add to §13 Q2: "the addendum proposed this; the author has not confirmed it."

---

### G-02 — HIGH — Flag 01's forcing fact and the padding/stalling dilemma are gone

**Distillate (§Flag 01, lines 32–34):**
> "**Fact that forced it:** of ~10 projects, the author can name what he argued for and against on **2 or 3**, from memory."
> "**Why it broke:** uniform depth was silently acting as a *quality promise*, which can only be kept at the level of the weakest entry. Forced either **padding** (7 entries whose `notable` states responsibility rather than choice — the exact failure the addendum identified, and what the target reader discounts) or **stalling** (never shipping). **A reader sampling 2–3 of 10 has ~70% chance of landing on a padded entry.**"

**PRD (§4.2 description):** carries only the conclusion — "it replaces the brief's uniform-depth promise, which could only be kept at the level of the weakest entry."

**What dropped:**
- The **2-or-3-from-memory fact** — the empirical trigger for the entire two-class model. Nowhere in the PRD. §8.3 says "roughly nine remain" and "roughly seven engagements plausibly contain no publishable decision," which is the *consequence*, not the fact that produced it.
- The **padding-or-stalling fork** — the PRD never names stalling (never shipping) as the alternative branch. This matters because R-1 (capacity) and SM-C4 are both about not shipping; the distillate ties the depth decision directly to the shipping risk, and the PRD severs that link.
- The **~70% sampling statistic** — the sharpest single argument in Flag 01, and the direct justification for FR-9 (two classes must render *distinguishably*) and for the M2 gate's second clause. Nowhere in the PRD.
- The distillate's framing that padding is "**what the target reader discounts**" — the PRD carries a cousin of this at FR-8 Out of Scope (unfalsifiable claims discounted) but not for padded `notable`s specifically.

**Fix / where it belongs:** §4.2 Description, one or two sentences. The 70% figure in particular should sit next to FR-9 or in R-3, since it is the quantified case for why the two classes must be visually distinguishable.

---

### G-03 — MEDIUM — Flag 01's "why it is consistent, not a compromise" argument is only half carried

**Distillate (line 36):**
> "**Why it is consistent, not a compromise:** it *is* classification by absence, already the governing schema rule; **it mirrors the consultancy demotion** (real, labelled, not a positioned object); **it derives camera hierarchy from data**; entry eleven still needs no curation call."

**PRD:** carries "classification by absence applied to content" (§4.2) and FR-5/FR-9's no-type-flag consequence. Carries the camera-hierarchy-from-data link only implicitly via FR-18.

**Dropped:**
- **"It mirrors the consultancy demotion"** — the structural rhyme between Company-as-attribute (FR-6) and Shallow-project-as-absence. This is the argument that the two-class model is *the same move already made elsewhere in the schema*, which is what makes it principled rather than expedient. FR-6 and FR-9 sit in the PRD with no stated relationship.
- **"Entry eleven still needs no curation call"** — the PRD preserves the maintenance property in NFR-5 and UJ-4 but never states that it survived the depth change. A reader of the brief would reasonably fear the two-class model *reintroduced* a curation decision; the distillate pre-empts that and the PRD does not.

**Fix:** §4.2 Description or FR-9 note.

---

### G-04 — MEDIUM — Flag 04's causal chain (why the brief's rationale weakened) is dropped

**Distillate (lines 59–62):**
> "**Brief locked:** load time explicitly tradeable, on the rationale that the visitor is 'already curious rather than triaging eleven tabs.'"
> "**Why the original rationale weakened:** 'pre-qualified therefore patient' holds for the first-order reader who already decided to invest attention. **It fails for the forward**, who has no context and no reason to wait."
> "**Extra pressure from M2:** photographic textures were the largest expected payload, and M2 does not ship them. First paint at M2 should be cheap, making a slow one harder to justify."

**PRD (NFR-1):** carries the conclusion and both supporting reasons in compressed form — "It exists because of The Forward, who has no context and no reason to wait, and it is affordable specifically because M2 ships no photographic textures."

**Dropped:** the *superseded* rationale. The PRD never records that the brief locked load time as tradeable **on a stated rationale that has now been shown to be conditionally false** ("pre-qualified therefore patient" holds for the first-order reader, fails for the forward). §6 says "First Paint is carved out" without saying what it was carved out of or why the original reasoning failed.

**Why it matters:** the distillate's Downstream Notes say the conflict rule matters "when reading the brief directly." Anyone reading the brief will find "load time is tradeable, because the visitor is already curious" — a plausible, self-contained argument. The PRD gives them no ammunition to reject it beyond an assertion. Without the "holds for reader A, fails for reader B" distinction this is the most likely flag to be re-litigated.

**Fix:** one clause in §6 Tradeable, or a note under NFR-1.

---

### G-05 — MEDIUM — Flag 04 is marked OPEN in the distillate; the PRD presents it as settled

**Distillate (line 57):** "### Flag 04 — Funnel positioning vs. tradeable load time (**OPEN — needs ratification**)" and line 63: "**Proposed resolution:** split the budget."

**PRD (§0):** "**Where this PRD and the product brief conflict, the PRFAQ's four drift flags govern** — they are reflected here as settled."

**PRD (§6):** "**First Paint is carved out** and is not tradeable (NFR-1)." Stated flatly, no open marker.

**Assessment:** partially mitigated. The PRD marks the *number* as unratified (NFR-1 `[ASSUMPTION]`, Q1). But Flag 04's open status in the distillate covers the *split itself* ("Proposed resolution"), not just the number. §0's blanket "reflected here as settled" is accurate for Flags 01–03 and overstated for Flag 04.

**Fix:** §0 — "Flags 01–03 are reflected as settled; Flag 04's principle (split the budget, first paint non-tradeable) is carried forward as proposed and its number is unratified (Q1)."

---

### G-06 — MEDIUM — M2 scope list: "Information layer with the fixed field set" is silently merged into the two-class bullet

**Distillate (§M2 Launch Scope, In list, line 69):** first item is "**Information layer with the fixed field set**". Separate from line 77, "2–3 entries with full `notable` narrative; ~7 shallow entries."

**PRD (§8.1):** merges them — "Information layer with the fixed field set; two Project classes; ~2–3 Deep and ~7 Shallow entries (FR-7..FR-12)".

**Item-for-item check of §8.1 against the distillate's In list:**

| # | Distillate In item | PRD §8.1 | Status |
|---|---|---|---|
| 1 | Information layer with the fixed field set | merged into bullet 2 | Present (merged) |
| 2 | Computed force layout + 3 mapping rules + `weight` knob | bullet 1 | ✅ |
| 3 | Backward-time scroll; authored rails; free flight | bullet 4 | ✅ |
| 4 | Skills as dust, condensation/decay | bullet 3 | ✅ |
| 5 | Deliberate schematic visual identity (new) | bullet 5 | ✅ (with "new" noted) |
| 6 | Technical colophon (new) | bullet 6 | ✅ |
| 7 | Derived camera dwell (new) | folded into bullet 4 | ⚠️ **"(new)" marker lost** |
| 8 | First-paint budget (new) | bullet 7 | ✅ |
| 9 | 2–3 full `notable`; ~7 shallow | merged into bullet 2 | ✅ |
| 10 | Flat star-chart fallback | bullet 8 | ✅ |
| 11 | Conventional contact route | bullet 9 | ✅ |

**The real finding:** the distillate marks **four** items as "(new — was an open question / required by X)": schematic identity, colophon, derived dwell, first-paint budget. This four-item set is the direct evidence for Crack 2 ("**M2 roughly doubled in one session**"). The PRD annotates two of them (schematic identity "promoted from open question to launch blocker"; colophon "required by the transfer claim"), leaves first-paint unannotated, and buries derived dwell inside the camera bullet with no marker at all. The visible "what grew" set is therefore incomplete exactly where §6's scope guardrail needs it.

**Fix:** §8.1 — give derived Dwell its own bullet or an inline "(new at PRFAQ)" marker, and annotate all four consistently. A reader should be able to see the four-item growth set at a glance.

---

### G-07 — MEDIUM — The distillate's per-item *reasons* for the four new M2 items are compressed away

**Distillate (lines 74–76):**
> "**Technical colophon making the architecture visible** (new — **required by the Q9 transfer claim**)"
> "**Derived camera dwell** (new — **required by the Q5 answer**)"
> "**First-paint budget** (new — **required by funnel positioning**)"

The distillate deliberately traces each addition to the PRFAQ stage question that forced it. The PRD carries the colophon's reason (§4.6, well) and first paint's (NFR-1, well), but **derived dwell has no stated reason anywhere in the PRD**. FR-18's rationale in §4.4 is "framing is authored; Dwell is derived" plus the Flag 02 composition argument — but the distillate's Flag 02 reasoning is itself thin in the PRD (see G-08).

**Fix:** FR-18 or §4.4 Description.

---

### G-08 — MEDIUM — Flag 02's "why it improves things" argument is dropped

**Distillate (§Flag 02, line 44):**
> "**Why it improves things:** the addendum flagged an unresolved tension — uniform depth '**risks reading as a table in 3D**,' so '**variation must come from the camera**,' making hierarchy an authored judgment that **must be re-tuned as the inventory grows**. Derived dwell removes that hand-tuned number while keeping authored composition."

**PRD (§4.4 Description):** carries the tension's resolution — "Framing is authored; Dwell is derived" — and the solver-has-no-judgment argument. FR-18's consequences carry "no per-entry Dwell value is authored by hand" and "adding an entry requires no Dwell tuning."

**Dropped:**
- **"risks reading as a table in 3D"** — the failure mode derived dwell defends against. The PRD has a sibling phrase ("a LinkedIn export in 3D," R-3) but that is about *shallow entries*, a different failure. The table-in-3D risk is about the *whole scene* being flat-feeling, and it is not recorded anywhere.
- **"variation must come from the camera"** — the design principle that makes dwell load-bearing rather than a nicety.
- **"must be re-tuned as the inventory grows"** — the maintenance-rot framing that ties derived dwell to NFR-5 and UJ-4. FR-18 states the consequence but not that this was a *rot* problem, which is the family of problem this whole product is built to defeat.
- The distillate notes derived dwell "**resembles the rejected emergent-composition option**" and explains why it is not the same thing (framing authored, only duration derived). The PRD lists emergent composition as rejected in §12 with no note that derived dwell was checked against it. **A downstream reader could reasonably challenge FR-18 as reintroducing a rejected idea, and the PRD has no answer on file.**

**Fix:** §4.4 Description (the table-in-3D risk and the camera-carries-variation principle) and a §12 note under Composition ("derived Dwell is not emergent composition — framing stays authored").

---

### G-09 — MEDIUM — Flag 03's "why this is the session's highest-value outcome" is dropped

**Distillate (line 52):**
> "**Why this is the session's highest-value outcome:** M5-launch has no forcing function; **M2-launch does. It is the first point at which the thing is true.**"

**PRD (§8.1):** carries the second half verbatim — "it is the first point at which the thing is true." **Drops "M5-launch has no forcing function; M2-launch does."**

**Why it matters:** this is the direct link between Flag 03 and Crack 1 (capacity / no forcing function) and R-1. The distillate's claim is that *moving the launch to M2 is itself a partial mitigation of the capacity risk*. The PRD's R-1 lists only the external mitigations (a date, a first reader) and never notes that M2-as-launch already did some of that work. This is arguably the single most load-bearing sentence of the whole session and half of it is missing.

Also dropped: the distillate's framing that the non-negotiables "**had been functioning as preconditions to existing**" is carried in §6 — good — but the accompanying "**The lists were simply never reconciled**" (i.e. this was an oversight, not a change of mind) is dropped. Minor.

**Fix:** §8.1 or R-1 mitigation column.

---

### G-10 — MEDIUM — The excavation question's *failure mode* is carried; its companion question is not

**Distillate (line 102):**
> "**The question that surfaces the decision:** *'what did you argue for, and what did you argue against?'* Raw recall does not reliably produce it — the first SNCF draft produced a plausible-but-wrong decision (a conservative design for a junior team) which **inverted what actually happened** (deliberate modernisation, junior team a reason *to* modernise). Ask explicitly for every entry."

**PRD (§8.3):** carries the question, "asked explicitly, every time," and "the first SNCF draft produced a plausible-but-wrong decision that inverted what actually happened."

**Dropped from the PRD:** the *specific content* of the inversion — "a conservative design for a junior team" vs "deliberate modernisation, junior team a reason *to* modernise." The PRD's abstract "inverted what actually happened" is much weaker as a warning: a content author reading it has no worked example of what the failure looks like.

**Also — a separate finding:** the **addendum** (Content Authoring notes) adds a second question the distillate does not have — "Asking what was *annoying* produces excellent constraint material but not the decision. Two different questions, both needed." That is an *addition* by the addendum, not a distillate gap, and is listed in §3 below (A-09). But note the PRD itself carries neither question's texture.

**Fix:** §8.3 — restore the parenthetical inversion example. It is eleven words and it is the whole teaching.

---

### G-11 — MEDIUM — The `notable` 90-word floor is carried into the PRD but its *reason* is truncated, and the addendum carries it better than the PRD

**Distillate (line 100):**
> "**`notable` must be prose, not a list** — a list **fragments the causal chain, which is the only reason the field is worth reading**. Below ~90 words the decision **loses its rejected alternative and reverts to a job description**."

**PRD (FR-8):**
- "contains no list, no bullets" — ✅ carried as a consequence
- "Content below roughly 90 words is rejected at authoring time as reverting to a job description" — ✅ carried, and correctly framed as an authoring-time gate

**Dropped:** "**a list fragments the causal chain, which is the only reason the field is worth reading**." The PRD states the no-list rule as a bare consequence with no reason. This is the kind of rule that gets relaxed in six months ("bullets would be more scannable") precisely because its rationale is not recorded next to it. The addendum's Content Authoring note carries the 90-word floor's status ("a quality gate, not a style preference") but not the prose-vs-list reasoning either.

**Fix:** FR-8 Description or a note. One clause.

---

### G-12 — LOW — Cardinality: the SNCF worked example is dropped

**Distillate (line 99):**
> "**Cardinality:** one engagement may yield several projects. A client star holds 1..n planets. Splitting keeps each problem/constraint/decision sharp rather than blurred (**e.g. SNCF yields both an MDM replacement and a platform upgrade programme**)."

**PRD (FR-12):** carries the rule and the rationale ("Each retains its own problem, constraint, and decision rather than blurring them together") but drops the concrete SNCF example. Defensible — §0 states the inventory is out of scope and lives in `inventory-draft.md` — but the example is what makes the rule operable during authoring, and §8.3 already names SNCF anyway, so the exclusion is inconsistent rather than principled.

**Fix:** optional. FR-12 consequences.

---

### G-13 — LOW — "Numbers that do exist and should be used" is dropped entirely

**Distillate (line 104):**
> "**Numbers that do exist and should be used:** team size, engagement duration, system scale, what was replaced or consolidated. Only measured performance metrics are absent."

**PRD:** FR-8 Out of Scope correctly carries "Measured outcomes. None exist..." and the constraint-as-falsifiability-substitute argument (well — near-verbatim including the container-runtime quote). But the **positive** half — the four categories of number that *do* exist and should be used — appears nowhere. `team_size` is in the schema (FR-7) and duration drives mass (FR-3), but "system scale" and "what was replaced or consolidated" have no home at all, and the affirmative instruction to *use* these numbers in content is absent.

**Why it is more than cosmetic:** the PRD reads as "no numbers exist." The distillate says "one class of number is absent; four classes are available and should be used." A content author working from the PRD would under-use the numbers that exist.

**Fix:** FR-8 note, or §8.3 content-authoring bullets.

---

### G-14 — LOW — Requirements Signals: the "reserve option" and the colophon's cheapest-form reasoning are thinned

Signal-by-signal audit of §Requirements Signals (distillate lines 110–116):

| Signal | PRD home | Status |
|---|---|---|
| Colophon must **show** not describe; cheapest form static HTML outside 3D | §4.6, FR-21 + `[ASSUMPTION]`, Q11 | ✅ Strong |
| Dwell derivation needs numbers; tune at M1 | FR-18 note, Q7, §9 | ✅ Strong |
| Shallow entries need designed treatment; draft two and read cold; most likely M2 gate failure | FR-9 note, R-3, Q5, addendum | ✅ Strong |
| Schematic identity needs palette/line weight/type/label/chrome; widest CI; weakest discipline | FR-20, R-4, addendum | ✅ Strong |
| Condensation open questions (4 sub-items) | FR-15 note, Q6 | ✅ All four carried |
| Camera residual risk (background drift); solver bounding survives as safety net; check at M1 | R-7, §6, §9 | ✅ Strong |
| **Reserve option: pinning solver history** | §4.1 `[NOTE FOR PM]`, R-7 | ⚠️ Partial |

**The one thinning:** the distillate says history-pinning "**Bounds drift to newest additions and would make old shots permanently valid. Seed-locking applied incrementally rather than globally.**" The PRD's §4.1 note carries the mechanism ("old entries settle once and freeze, new entries find space around them") and the trigger condition, but drops **why it works** (bounds drift to newest additions; old shots become permanently valid) and its **relationship to the rejected global seed lock** — though §12 does say "global seed lock (survives only as incremental history-pinning)," which recovers half of it.

**Verdict on this section overall: this is the best-carried section of the distillate.** All seven signals have a home. Only this one detail thins.

**Fix:** optional. §4.1 note, one clause.

---

## 2. Contradictions

### C-01 — "Ratifying" vs "Never ratified by the author" (NFR-2)

The only hard contradiction. Distillate: "**Never ratified by the author.**" PRD §5 and §14: "**ratifying** the addendum's proposal." Detailed above as **G-01**. The `[ASSUMPTION]` wrapper and §13 Q2 make this recoverable rather than fatal, but the word choice directly contradicts the source and must change.

### C-02 (near-contradiction) — §0 "reflected here as settled" vs Flag 04's OPEN status

Detailed above as **G-05**. Not a factual contradiction of content, but a status contradiction: the distillate marks one of the four flags OPEN and the PRD's framing sentence says all four are settled.

### No other contradictions found.

Specifically checked and found **consistent**:
- Positioning: top of funnel, does not change a hiring decision — PRD §1, §7 match distillate line 18 exactly, including the "narrower than the brief's implied claim" framing.
- Transfer claim: "proves how the author works," evidence is architecture not graphics, requires visible reasoning — PRD §1, §4.6 match line 19.
- Author motive candour and the non-sanitisation instruction — PRD §1, §2.1, §6 Editorial constraint. **Carried unusually well**, including the distillate's own instruction that it "should not be sanitised in downstream docs" turned into a PRD constraint.
- Audience three-tier structure including The Forward as "the least patient visitor the site will ever have" — PRD §2, Glossary, UJ-3.
- Content model schema, field-for-field — PRD FR-7 lists exactly the distillate's eight fields in order.
- Inventory magnitude (2 companies, 5–6 clients, ~10 projects, ~18 bodies, unbounded skills) — PRD Glossary matches exactly.
- Framerate rationale (30-over-60, slow camera through static geometry, cost to texture/post-FX) — NFR-2 near-verbatim.
- Degradation policy (quality holds, frames drop; stable reads smooth, fluctuating reads broken) — NFR-3 near-verbatim.
- Target hardware profile (three-year-old laptop, integrated, 1080p, not Apple silicon, not the dev machine) — NFR-4 verbatim.
- Real client names ship / no NDA / recognisable names convert polish into credibility — FR-11 verbatim.
- Client relationship friction exclusion, all three reasons + "not silently revisited" — FR-11 Out of Scope verbatim.
- Company-never-a-body — FR-6, Glossary.
- Settling budget and "guardrail against future carelessness, not a live threat from body count" — §4.1 NFR + addendum.

---

## 3. Additions Not In Source

None of these are wrong. All are flagged for visibility because they are PRD inventions the distillate does not contain, and several are marked `[ASSUMPTION]` while others are not.

| # | Addition | PRD location | Marked? | Assessment |
|---|---|---|---|---|
| A-01 | **All four counter-metrics SM-C1..SM-C4** | §11 | No | **Wholly new.** The distillate has no success metrics section at all. Each is well-derived (SM-C2 from padding, SM-C4 from the receding finish line, SM-C1 from the non-recruiter decision) but none is sourced. SM-C4 in particular asserts "the single most likely way this never ships" — a strong claim the distillate does not make. |
| A-02 | **All five primary/secondary metrics SM-1..SM-5** | §11 | No | Also wholly new. SM-2 is a faithful restatement of the M2 gate; SM-1 restates the funnel success condition; SM-3, SM-4, SM-5 are derived. Reasonable, unsourced. |
| A-03 | **FR-24 Designed shareability as a full FR** | §4.7 | Partially — §4.7 note says "new" | The distillate has this only as a half-sentence under Flag 04: "**Also newly in scope:** shareability as a designed property... link preview image, opening-frame composition, what a screenshot looks like pasted in Slack. None of this is in the brief." The PRD promotes it to a numbered FR with three testable consequences including an **honesty constraint** ("Preview and title do not overstate what a mobile or Fallback visitor will receive") that is a PRD invention. Good invention; unsourced. Note: the PRD includes FR-24 in §8.1 M2 scope — **the distillate's M2 In list does not list shareability as an item.** It is a reasonable read of Flag 04, but it is a scope addition to a list §6 declares frozen. |
| A-04 | **UJ-1..UJ-4 as named personas with named characters** | §2.3 | No | Marc, Priya, Tom, Thomas. Entirely a PRD construction. UJ-3's "first two and a half seconds" pre-commits the unratified NFR-1 number into a narrative. Minor. |
| A-05 | **FR-14 "No drawn connector lines"** | §4.3 | No | Not in the distillate at all (it comes from the brief addendum). Correct and consistent — but note the distillate's rejected-framings list covers constellations and static binding, not connector lines. Fine, sourced elsewhere. |
| A-06 | **NFR-7 Content legibility "equal in weight to awe"** | §5 | No | From the brief, not the distillate. Consistent with the distillate's spirit. |
| A-07 | **R-6 mitigation: procedural in-engine collapse** | §10 | Yes — `[ASSUMPTION]`, Q4 | The distillate's Crack 3 says "**decide now** whether the collapse is bought (asset packs, commissioned, procedural in-engine rather than modelled) **or dropped**." The PRD picks one of the four options as a proposal. Correctly marked and routed to Q4. **But**: the distillate's instruction was "decide now"; the PRD converts it into an open question, which is a *softening* of an explicit "decide now." Borderline gap; recorded here since the option chosen is itself the addition. |
| A-08 | **R-1 mitigation: "Both, not either"** | §10 | Yes — `[ASSUMPTION]`, Q3 | The distillate says "*Fix: a date, **or** a first reader.*" The PRD proposes **both**. Marked as an assumption, and the reasoning given ("the reader also retires R-2") is sound and traceable to Crack 4. Strengthening, not contradicting. |
| A-09 | **The "what was annoying" companion question** | addendum, Content Authoring | No | Addendum-only: "Asking what was *annoying* produces excellent constraint material but not the decision. Two different questions, both needed." Not in the distillate. Good addition; note it is in the addendum and **not** in the PRD's §8.3, where a content author would look for it. |
| A-10 | **Q10 "Contact mechanism at M2 — a mailto is the zero-infrastructure option"** | §13 | No | The distillate says only "conventional contact route (unglamorous)." Mailto is a PRD suggestion. Harmless. Addendum expands it further (third-party form services vs NFR-6's spirit) — also addendum-only. |

**Competitive-research warning check (Downstream Notes):** ✅ **Correctly and fully carried, twice.** PRD §7 Non-Goals: "No competitive claim... Competitive research was deliberately not run and judged unnecessary rather than skipped... `[NOTE FOR PM]` If any downstream document asserts otherwise, it must research it first." Addendum §Deliberately Excluded repeats it in bold. **No competitive or landscape claim appears anywhere in the PRD.** I checked §1, §2, §7, §11 specifically. This is the single best-executed carry-through in the document.

**Stage 4 / Internal FAQ note check:** ✅ Carried — but only in the **addendum**, not the PRD. Distillate line 160 says the non-economic half "remains uninterrogated as Q&A." Addendum: "carried as PRD risks R-1, R-5, and R-6 rather than as Q&A, but it has never been interrogated in that form." Faithful. Acceptable placement (workflow metadata).

---

## 4. Correctly Carried

### The four drift flags — resolution fidelity

| Flag | Resolution carried? | Reasoning carried? | Status |
|---|---|---|---|
| **01 — Two body classes** | ✅ Fully. FR-5, FR-7, FR-9, §4.2, Glossary Deep/Shallow, "planet with no moon," "a full career, with the arguable moments actually argued" (§4.2, verbatim). Both rejected options in §12. | ⚠️ **Partial** — see G-02, G-03 | Resolution excellent, reasoning thin |
| **02 — Authored rails + derived dwell** | ✅ Fully. FR-17 (framing authored, entity-relative, no coordinates), FR-18 (dwell derived), §4.4 "Framing is authored; Dwell is derived." M2-scope status carried. "Unspecified numerically" carried via Q7. | ⚠️ **Partial** — see G-07, G-08 | Resolution excellent, reasoning thin |
| **03 — M2 launch** | ✅ **Fully, and best of the four.** §8.1, §9, §6. All three consequences carried explicitly: (1) visual identity promoted from open question to M2 blocker (§4.5, §8.1); (2) "M3 stops being a launch gate and becomes an upgrade to a live site — this inverts the completion dynamic entirely" (§8.2, near-verbatim); (3) contact stops blocking launch (§4.7, FR-23). Both rejected options in §12 with reasons. The greybox/intentional-language argument in §4.5 verbatim. | ✅ **Near-complete** — only G-09 (the forcing-function half-sentence) | **Model carry-through** |
| **04 — First paint** | ✅ Split-the-budget resolution carried (§6, NFR-1). Shareability carried and expanded (FR-24). | ⚠️ **Partial** — see G-04, and status issue G-05 | Good, but weakest of the four |

### Verdict Findings — "Needs more heat" (5 items)

| # | Item | PRD home | Status |
|---|---|---|---|
| 1 | Design shallow-entry treatment; draft two, read cold | FR-9 `[NOTE FOR PM]`, R-3, Q5, addendum ("cheapest de-risking action in the entire plan, no dependencies") | ✅ **Excellent** — the addendum strengthens it beyond source |
| 2 | Turn "monochrome blueprint" into an actual visual system | FR-20 (palette, line weight, typography, label treatment, UI chrome — the exact five), R-4, addendum UX notes | ✅ **Excellent** |
| 3 | Specify dwell derivation numerically; tune at M1 | FR-18 note, Q7, §9 "M1 is the cheapest place to tune" | ✅ |
| 4 | Decide the colophon's form; show data and rules | §4.6, FR-21 + assumption, Q11. Addendum adds the discoverability gap. | ✅ **Excellent** |
| 5 | Put numbers on first paint and ratify the framerate target | NFR-1 + Q1; NFR-2 + Q2 | ⚠️ First paint ✅; framerate **compromised by G-01** |

**4.5 of 5 carried.** Item 5's ratification half is the G-01 defect.

### Verdict Findings — "Cracks" (4 items)

| # | Crack | PRD home | Status |
|---|---|---|---|
| 1 | **Capacity is the whole risk** — no estimate, deadline, forcing function; M2 doubled | **R-1, Critical.** Fix carried (date or reader), strengthened to both, routed to Q3. Escape hatch preserved: "If neither, R-1 is accepted as a named risk rather than mitigated." | ✅ **Excellent** — except G-09's missing forcing-function link |
| 2 | **Scope grew with no defence against recurrence** | **R-5** + **§6 scope guardrail**, with the exact bar verbatim: "the site is actively misleading without it," not "this makes it better." "M2 is frozen as defined in §8.1." Route-to-M3 default carried. | ✅ **Excellent** — the strongest single carry in the PRD |
| 3 | **Blender dependency at M4** | **R-6**, Medium (post-launch). All the reasoning carried: routed around a skill below his bar, bookends need exactly that skill, most likely to stall, holds the emotional climax. | ⚠️ ✅ carried, but the "**decide now**" instruction became Q4 — see A-07 |
| 4 | **The core bet is untested** | **R-2**, High. "The press-release reader quote is aspirational" carried. Fix (one real reader at M2, cold) carried, tied to R-1's person. Also embedded in UJ-2's climax: "the core bet of the entire product, and the one thing that has never been tested." | ✅ **Excellent** |

**All 4 cracks have PRD homes as risks.** Only Crack 3's "decide now" is softened.

### Unratified Thresholds (3 items)

| Item | Marked unratified? | Status |
|---|---|---|
| **Framerate target** | ⚠️ `[ASSUMPTION]` + Q2, **but text says "ratifying"** | **G-01 / C-01** |
| **First-paint budget** ("accepted in principle, no number") | ✅ `[ASSUMPTION]` NFR-1, Q1, §14 | ✅ Correct |
| **Target hardware profile** | Presented as fact in NFR-4 | ✅ Correct — the distillate lists it under Unratified Thresholds as context for the framerate gate, not as itself unratified. NFR-4's declarative treatment is faithful. |

### Rejected Framings — completeness of §12

**Press release headlines: ❌ ENTIRELY ABSENT from §12** — but this is correct, not a gap. The three headline candidates ("The Career That Runs Backwards," the "never drawn by hand" line, the chosen "Look Closer and the Detail Assembles") are PRFAQ-stage artifacts about press-release copy, not product decisions. Their *reasoning* survives where it matters: §7 "Build difficulty is never claimed" carries the engineering-boast rejection, and FR-16's "one decision, three payoffs" carries the backward-time argument verbatim. **Noted, not flagged.** One could argue the chosen headline belongs somewhere as a tone anchor; the addendum's "Copy tone and voice remain open" says the site's chrome voice is unspecified, so there is a small missed opportunity there.

**Positioning rejections — completeness check:**

| Distillate rejection | §12 | Status |
|---|---|---|
| "The advantage is that the thing is difficult to build well" | Not in §12 — but in **§7 Non-Goals** verbatim with full reasoning ("cannot appear without becoming a boast, and the reader never perceives it... capability is inferred from an artifact that works") | ✅ Present, different section |
| Mid-funnel | §12 Positioning ✅ | ✅ |
| "It's for me and that's fine" | §12 ✅ with reasoning | ✅ |
| "It proves I finish things" | §12 ✅ | ✅ (reason not carried — distillate gives none either) |
| "It doesn't prove anything, and I say so" | §12 ✅ | ✅ |

**Architecture rejections — completeness check (all 11 items):**

| Group | Distillate items | §12 | Status |
|---|---|---|---|
| Composition | seed lock (global), emergent composition, bound the solver (NOT rejected) | All 3 ✅, including the crucial "solver bounding (not rejected — retained as a safety net)" and "global seed lock (survives only as incremental history-pinning)" | ✅ **Complete** |
| Graph expression | constellations, shared light/spectral colour, static gravitational binding, demote to text, skills as meteors | All 5 ✅ with reasons, near-verbatim | ✅ **Complete** |
| Hierarchy | projects as stars, intermediates as stars, two-body client+intermediate | All 3 ✅ with reasons, including "a universe whose suns are staffing agencies" | ✅ **Complete** |

**§12 additionally carries** (correctly, from Flags 01 and 03, which the distillate lists as flag-local rejections rather than in the Rejected Framings section): ship only 3 strong entries; excavate all 10 first; honest beta framing; M2 internal / M3 public. **All four present with reasons.**

**Verdict on §12: complete for every architectural and positioning rejection.** Press-release headlines are the only omitted category and their omission is defensible.

### Content Model — detail check

| Detail | PRD | Status |
|---|---|---|
| Eight-field schema, exact names and order | FR-7 ✅ verbatim | ✅ |
| `company` = ATTRIBUTE, never a body, "billing infrastructure" | FR-6, Glossary. "Billing infrastructure" phrase not carried but §12 has "makes the billing relationship a visual centrepiece" | ✅ |
| `notable` 100–150 words | FR-8, Glossary ✅ | ✅ |
| "POPULATED ONLY WHERE A REAL DECISION EXISTS" | FR-8, FR-9, Glossary (bolded) ✅ | ✅ |
| `skills` never in `notable` prose | FR-10 ✅ with a testable consequence | ✅ |
| Inventory magnitude (2 / 5–6 / ~10 / ~18 / unbounded) | Glossary ✅ exact | ✅ |
| Settling budget generous; framerate a carelessness guardrail | §4.1 NFR + addendum ✅ | ✅ |
| Cardinality 1..n, splitting keeps decisions sharp | FR-12, Glossary ✅ | ✅ (SNCF example dropped — G-12) |
| **90-word floor** | FR-8 ✅ as an authoring-time rejection; addendum ✅ as "a quality gate, not a style preference" | ✅ (reason thinned — G-11) |
| Prose not list | FR-8 ✅ | ✅ (reason dropped — G-11) |
| Decision needs a named rejected alternative, else it states responsibility (covered by `role`) | FR-8 ✅ ("names an alternative that was argued against"); addendum ✅ (the `role` argument) | ✅ |
| **The excavation question** | §8.3 ✅ verbatim, "asked explicitly, every time"; addendum ✅ "the whole method... never inferred" | ✅ (inversion example dropped — G-10) |
| Why problem/constraint/decision replaced problem/decision/outcome; constraint as falsifiability substitute; the container-runtime quote | FR-8 Out of Scope ✅ **near-verbatim including the quote** | ✅ **Excellent** |
| Numbers that do exist | — | ❌ **G-13** |
| Real client names ship | FR-11 ✅ | ✅ |
| Client friction excluded, all three reasons, "not silently revisited" | FR-11 Out of Scope ✅ verbatim; addendum ✅ | ✅ |

### M2 gate wording

Distillate: *"can a stranger tell what he does — **and can he tell which entries are worth reading?**"* plus "The second clause became load-bearing the moment two body classes were adopted."

PRD §8.1 and §9: both clauses ✅, and the load-bearing note ✅ verbatim. SM-2 also encodes both clauses. **Correct.**

### Out / post-launch list

Distillate Out list vs PRD §8.2, item for item: realism (M3) ✅, collapse + black-hole contact (M4) ✅, fun layer (M5) ✅, mobile 3D ✅, astronomical scale ✅, per-entry position overrides ✅ ("permanently rejected, not deferred" — stronger than source, correct), CMS/backend ✅ ("permanently rejected"), belt-merging with the ~18-too-few reason and the several-fold-growth revisit condition ✅ verbatim. **9 of 9.** PRD adds a tenth bullet (nebula gaps, meteor taxonomy, mass-damped scroll, date readout) sourced from the brainstorm — an addition, harmless.

---

## 5. Recommended Actions, Ordered

1. **G-01 / C-01** — Change "ratifying" to "proposing" in NFR-2 and §14; add "never ratified by the author" to Q2. *Mandatory: this contradicts the source.*
2. **G-02** — Restore Flag 01's forcing fact (2-or-3-from-memory), the padding-or-stalling fork, and the ~70% sampling statistic into §4.2 / FR-9 / R-3.
3. **G-09** — Restore "M5-launch has no forcing function; M2-launch does" into §8.1 or R-1.
4. **G-06 / G-07** — Give derived Dwell its own §8.1 bullet with a "(new)" marker and state its reason; annotate all four new-at-PRFAQ items consistently so the growth set is visible against §6's freeze.
5. **G-08** — Add the "table in 3D" risk and "variation must come from the camera" to §4.4; add a §12 note that derived Dwell is not emergent composition.
6. **G-04 / G-05** — Record the superseded "pre-qualified therefore patient" rationale and why it fails for The Forward; soften §0's "all four settled" to exempt Flag 04's principle.
7. **G-10, G-11, G-13** — Content-model restorations: the SNCF inversion example, the prose-not-list reason, the four categories of number that do exist.
8. **G-03, G-12, G-14** — Optional polish.
9. **A-07** — Reconsider whether Crack 3's "decide now" should remain an open question (Q4) or become a decision.
10. **A-01 / A-02** — No change needed, but the user should know §11 is entirely PRD-originated.
