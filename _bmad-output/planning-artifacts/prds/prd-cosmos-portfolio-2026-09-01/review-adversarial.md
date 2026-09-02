---
title: "Adversarial Review: Cosmos Portfolio PRD"
status: review
created: 2026-09-01
reviewer: adversarial
target: prd.md + addendum.md (prd-cosmos-portfolio-2026-09-01)
---

# Adversarial Review — Cosmos Portfolio PRD

Read against the PRD, its addendum, the PRFAQ distillate, the brief addendum, and `inventory-draft.md`. Findings ordered most-severe first. No softening.

**Overall verdict: NOT READY. This is an unusually well-written document about a project that is unlikely to ship in its current form.** The prose quality is doing active harm — it is so articulate about its own risks that naming a risk has come to feel like handling it. Every one of the four things that could actually kill this project (capacity, untested core bet, unbounded scope, unwritten content) is *named accurately* and *mitigated with a proposal the user has not agreed to*. The document has confused self-awareness with mitigation.

The single most damning structural fact: **the PRD contains no task, gate, or sequencing rule that forces any of its own critical de-risking actions to happen before the expensive work starts.** The cheapest test of the core thesis costs an afternoon and has no dependencies — and the PRD schedules it nowhere.

---

## F-1 — CRITICAL — R-1's mitigation is a proposal the user has never agreed to, which means the project's only critical risk is unmitigated and the PRD says otherwise

**The attack.** R-1 is graded Critical and self-described as "the whole risk." Its Mitigation cell contains an `[ASSUMPTION]` block. §14 states flatly that no assumption is a ratified decision. Therefore the mitigation column for the project's only Critical risk contains **a suggestion the owner has not accepted**. The risk table renders this as mitigated. It is not. A risk register where the Critical row's mitigation is unratified is a risk register that lies at a glance — and the glance is how risk tables are read.

Worse, §13 Q3 concedes the real state and then buries it: *"If neither, R-1 is accepted as a named risk rather than mitigated."* That sentence is the true status of the project's Critical risk, and it is parked at position 3 of 12 in an Open Questions list, in the conditional mood, in the back half of the document. A launch-stakes PRD does not hide its own kill condition in a subordinate clause.

Compounding it: R-2's mitigation is *the same unratified person*. And R-1's own text says the reader "also retires R-2." So **one unratified assumption is carrying the mitigation for both the Critical risk and one of the High risks** — a single point of failure in the mitigation layer that the table's row-by-row format conceals. If that person is never named, two rows go dark simultaneously.

There is also a substantive gap nobody has costed: a "committed date" with no external party is not a forcing function, it is a New Year's resolution. A solo builder with no deadline, no team, and no budget committing a date to himself has invented nothing. The only load-bearing half of the R-1 assumption is the *named external person who has agreed*, and that half requires an actual conversation with an actual human that has not happened.

> `[ASSUMPTION: A named first reader who has agreed to answer the M2 gate question cold, plus a committed date by which the site is linked from the CV. Both, not either — the reader also retires R-2.]` See §13 Q3.

> **All six are proposals filling gaps the upstream chain left explicitly open — none is a decision the user has ratified.**

**What would have to change.**
1. R-1's Mitigation cell must read `NONE — UNMITIGATED` until a person is named and has said yes. Not an assumption block. The word "unmitigated," in the table.
2. Add a §0-level status banner: *"This PRD has one Critical risk and it is currently unmitigated. The project's expected outcome is non-completion until R-1 has a name in it."* If that sentence is too harsh to publish, the risk grading is wrong, not the sentence.
3. Split R-1's mitigation in two and grade them separately: the named reader (external, load-bearing, requires a conversation) and the self-committed date (internal, near-worthless alone, do not count it).
4. Decouple R-2's mitigation from R-1's. Two risks must not share one unratified dependency.
5. Add a hard gate before any M1 code: **"R-1 has a name in it, or the project is explicitly re-scoped as a hobby with no external success signal."** Note that §12 already considered and rejected the "it's for me and that's fine" framing *specifically because it worsens completion risk* — which means the PRD has already reasoned that the no-external-signal path is the losing one, and then left the project standing on exactly that path.

---

## F-2 — CRITICAL — M2 is not a minimum, and calling it frozen has not made it smaller

**The attack.** §8.1 is titled "M2 — Launch Scope (frozen)" and §8 calls it "the smallest version worth linking from a CV." Count what a skeptical reader actually sees in that list:

- A force-directed 3D layout engine with three derived mapping rules
- An authored camera rail system with an entity-relative shot contract, plus free-flight mode with an on-ramp and off-ramp
- A particle/volumetric dust system, present at rest, that condenses into orbiting bodies and decays back, sharing one implementation both directions
- A complete visual identity from zero — palette, line weight, typography, label treatment, UI chrome — in the builder's **self-declared weakest discipline**
- An information layer whose form is *entirely unspecified* (the addendum admits this: "no specified form at all")
- A second full renderer: the flat star-chart Fallback, which must independently pass the same M2 gate
- A Colophon: a separate surface rendering live JSON with annotated rules
- A first-paint performance budget on integrated graphics
- Designed shareability: composed preview image, composed opening frame, honest title
- A contact route
- **~10 career entries written, of which ~9 do not yet exist**

That is not a minimum viable anything. That is a full product with two renderers, a bespoke design system, a particle system, and a book's worth of unwritten prose. The word "minimum" is doing pure emotional work here — it makes the pile feel survivable without removing anything from it.

The PRD *knows* this. It states the mechanism of its own failure and then declines to act on it:

> M2 roughly doubled in a single session and there is no architectural equivalent of the rot defence for scope — this rule is the substitute.

A guardrail against *future* additions is not a response to a scope that **already doubled**. The freeze was applied at the top of the inflated number. Nobody re-examined whether the pre-doubling M2 was the right launch scope; the doubling was ratified by being frozen. That is scope creep laundered into a guardrail.

Second failure: the freeze rule is unenforceable by construction. The bar is *"the site is actively misleading without it."* The sole judge is the same person who wants each feature, arguing with himself, with no counterparty and no cost signal. Compare the rot defence, which the PRD (correctly, in its own addendum) argues should be **structural** — *"a Shot type that structurally cannot hold a coordinate is worth more than a rule someone remembers."* The document understands that conventions fail and structure holds, applies that insight to camera coordinates, and then defends its **Critical scope risk with a convention someone has to remember.** By its own stated standard, the scope defence is the weaker kind.

Third: several M2 items fail the freeze bar *right now* if it were honestly applied. Is the site "actively misleading" without free flight (FR-19)? Without dust visible at rest (FR-15)? Without condensation *and* decay both hand-tuned? No. Those are "this makes it better." They are inside the frozen scope anyway. The rule was written and immediately not applied to the contents of the thing it was written to protect.

> **Scope guardrail.** M2 is frozen as defined in §8.1. Every subsequent addition routes to M3 by default. The bar for adding to M2 is **"the site is actively misleading without it,"** not "this makes it better."

**What would have to change.**
1. Apply the freeze bar retroactively to every item currently in §8.1, in writing, one line of justification each. Anything that cannot honestly clear "actively misleading without it" moves to M3. Expect FR-19 (free flight), FR-15 (dust at rest), and at minimum the decay half of FR-13 to fail that test.
2. Introduce a real **M2a / M2b** split, where M2a is a genuinely linkable minimum and M2b is the rest. Candidate M2a: layout + backward scroll + rails + information layer + schematic identity + 3 entries + fallback + contact. That is still large. It is at least honest.
3. Delete the word "minimum" from §8.1 and §8. The scope is not minimal, and pretending otherwise is exactly the self-deception that keeps the finish line receding — the failure mode SM-C4 names.
4. Make the freeze structural, not conventional: a written scope ledger where every M2 item carries a date and a one-line justification, and any addition requires deleting something. Trade, don't add.

---

## F-3 — CRITICAL — The core bet is tested last, after everything downstream of it is already built

**The attack.** The product's entire thesis is UJ-2's climax: a technical reader stops and reads 150 words. Everything else — dust, rails, dwell, schematic identity, first paint — exists to deliver a reader to that paragraph in a receptive state. R-2 concedes the bet has never been observed:

> **The core bet is untested.** That a technical reader will stop and read a full paragraph is asserted, not observed. The press-release reader quote is aspirational. | High | One real reader at M2, answering the gate question cold.

Read that mitigation carefully. **The test happens at M2.** M2 is the launch milestone. That means the core, unfalsified, load-bearing product hypothesis is scheduled to be tested *after* the force simulation, the rail system, the dust system, the visual identity, the fallback renderer, the colophon, and ten written entries all exist. If the answer is no, 100% of the build was spent finding out.

This is the exact inversion of how an untested core assumption is supposed to be sequenced, and the document contains the proof that the builder already knows better. The addendum says of the cold-read test:

> **The two-entries-cold-read is available now** and costs almost nothing. It de-risks R-3 before any code exists, and it may change the FR-9 assumption before it is ever implemented. This is the cheapest de-risking action in the entire plan and it has no dependencies.

"Available now." "No dependencies." "Cheapest de-risking action in the entire plan." And it is scheduled **nowhere** — not in §8.3, not in §9 Milestones, not as an M1 gate, not as an M0. It exists as a `[NOTE FOR PM]` in §4.2 and a Mitigation cell in R-3, and neither is a task with a position in the sequence. A launch-stakes PRD that identifies its cheapest, highest-value, zero-dependency de-risking action and then does not put it in the plan has not planned.

Worse still: the PRD scopes the cold-read to R-3 (does the *Shallow* treatment read as a LinkedIn export) and never notices it also tests R-2. The one drafted `notable` — SNCF, in `inventory-draft.md` — is a complete, publishable instance of the core bet. **The paragraph that has to make a technical reader stop already exists.** It could be put in front of a real engineering lead this week, with no site, no WebGL, no schematic identity, no rails, and the answer to *"does a technical reader stop and read this?"* would come back before a single line of code is written. The PRD does not propose this. It is the single largest missed move in the document.

There is a further honesty problem in the test design. The R-2 mitigation and the R-1 mitigation are **the same person**. That means the one human who validates the core bet is also the person who has been recruited as the builder's accountability partner — an invested party who knows the builder, knows how much work went in, and is being asked whether it was worth it. That is not a cold read. That is a friend being polite. n=1, and n=1 with a relationship, on the only external signal the product has.

**What would have to change.**
1. Add **M0 — Paper Validation**, before M1, gating all code. Contents: (a) the SNCF `notable` plus two drafted Shallow entries, as plain text, in front of 3–5 technical readers who do not know Thomas; (b) gate question: *did you read the whole paragraph, and can you say what was decided and what was rejected?* Cost: days. Kills or confirms the product before the expensive part.
2. Separate the R-2 reader from the R-1 accountability partner. Different people, structurally. The validator must have no stake in the answer.
3. Raise n above 1. Three to five readers on a text-only test is trivially achievable and n=1 is not evidence of anything.
4. State explicitly what happens if M0 fails. Right now there is no written answer to *"what if a technical reader doesn't read the paragraph?"* — which means the PRD has no plan for its own most likely falsification. A cheap alternative exists and is unexplored: if the prose does not hold attention, the constraint alone might (a single unfakeable line, not 150 words).

---

## F-4 — HIGH — The PRD declares the four PRFAQ flags "settled." The distillate marks Flag 04 OPEN. NFR-1 is built on the flag that was never closed.

**The attack.** §0 makes a governance claim:

> **Where this PRD and the product brief conflict, the PRFAQ's four drift flags govern** — they are reflected here as settled.

The distillate does not agree. Flag 04's own heading:

> ### Flag 04 — Funnel positioning vs. tradeable load time (OPEN — needs ratification)

and its resolution is labelled **"Proposed resolution."** Three flags were resolved; the fourth was explicitly not. The PRD promoted an unresolved flag to settled by writing "settled" next to it.

This is not a bookkeeping nit, because everything downstream of Flag 04 is now load-bearing in the PRD and carries an inherited, unratified foundation:

- **NFR-1 (First Paint)** is declared a launch requirement and "not a tradeable" — while being an `[ASSUMPTION]` whose *number* is unratified (§13 Q1) **and** whose *existence as a carve-out* rests on an unratified flag. Two levels of unratified, presented as a hard launch gate.
- **§6 Constraints** repeats the carve-out as established fact: *"**First Paint is carved out** and is not tradeable (NFR-1)."*
- **FR-24 (Designed shareability)** is introduced entirely by Flag 04 — the PRD's own note admits *"it appears nowhere in the brief and was introduced by funnel positioning."* An unratified flag added a launch-scope feature.

So an unratified flag has produced: one non-tradeable launch NFR, one new launch-scope FR, and a constraints-section entry stated as settled. That is scope and gating manufactured out of an open question, then sealed by a sentence in §0 asserting closure.

**What would have to change.**
1. Correct §0: *"Flags 01–03 are settled. Flag 04 is open and its consequences (NFR-1, FR-24) inherit that status."*
2. Tag NFR-1 as doubly-unratified — the carve-out and the number — and add both to §13 Q1.
3. Decide whether FR-24 survives if Flag 04 does not. If it does survive, justify it independently of funnel positioning. If it does not, it is not M2 scope.
4. Add a rule to the addendum's document-routing table: a downstream document may not upgrade an upstream OPEN item to settled. Only the owner can close a flag.

---

## F-5 — HIGH — NFR-6 (no backend, any milestone) contradicts FR-23 (working contact route), and the PRD hides the contradiction behind a wrong cross-reference

**The attack.** NFR-6 is absolute:

> **NFR-6 — No backend.** No CMS, no API, no server-side component, at any milestone.

FR-23 requires a functioning contact mechanism, and its testable consequence reads:

> - The mechanism requires no backend (satisfies FR-1's no-backend constraint).

Two defects in one line. First, the cross-reference is **wrong** — FR-1 is "embedded JSON as sole source of truth," and its no-backend clause is about *obtaining career data*. The no-backend-anywhere constraint is NFR-6. An FR asserting compliance with a constraint it misidentifies has not been checked against the real constraint.

Second, and substantively: the set of contact mechanisms that satisfy NFR-6 as written is **{mailto:, a link to LinkedIn}**. That is the whole set. Every form service (Formspree, Netlify Forms, Basin), every serverless function, every mail relay is an API or a server-side component. §13 Q10 half-admits it — *"A mailto is the zero-infrastructure option"* — while still framing the question as open, and the addendum makes the conflict explicit and then declines to resolve it:

> Third-party form services would violate NFR-6's spirit if not its letter — worth a deliberate call.

"Worth a deliberate call" is the PRD deferring a decision it has already logically foreclosed. Either NFR-6 means what it says and the answer is `mailto:` (decide it now, one line), or NFR-6 needs an explicit carve-out for third-party form endpoints. It cannot stay absolute *and* open.

There is a real product consequence, not just a doc-hygiene one: `mailto:` on a corporate laptop frequently opens nothing at all, or opens an unconfigured Outlook. On the exact target hardware profile in NFR-4 — *"the corporate work-laptop profile of the actual audience"* — the launch contact route has a meaningful chance of being a dead link. The PRD specified a hardware profile precisely enough to make this predictable, and then didn't apply it to the one interaction that converts the whole funnel.

**What would have to change.**
1. Fix the cross-reference: FR-23 must cite NFR-6, not FR-1.
2. Close Q10 in the PRD. Recommended: `mailto:` **plus** a visible plain-text email address and a LinkedIn link, so the route survives a broken mail handler. Costs nothing, removes the failure mode.
3. Either amend NFR-6 to *"no backend Thomas operates; third-party static-form endpoints permitted for contact only"* — or state that no such carve-out exists and form services are out, permanently.
4. Add a testable consequence with teeth: *"the contact route functions on a machine with no configured mail client."* The current consequence, *"a visitor can initiate contact,"* is unfalsifiable — a `mailto:` that opens nothing technically lets a visitor "initiate."

---

## F-6 — HIGH — FR-9 (classes must be visually distinguishable) is in unresolved tension with FR-7 + FR-5, and the PRD's own addendum identifies the failure without resolving it

**The attack.** FR-7 requires an identical schema; FR-5 requires typing by absence with no flags; FR-9 requires the visitor to *see* which entries are Deep before committing to read one. The tension is not that these are logically impossible — absence can drive rendering. It is that **FR-9's requirement is a reader-perception claim, and the PRD treats it as a rendering claim.** The addendum names the real problem precisely:

> is the distinction *legible as meaning* (this one has something to say) or does it read as *incomplete data* (this one is missing information)? Those are opposite readings of the same visual.

That is the correct question, and it appears in the addendum, addressed to `bmad-ux`, not in the PRD as an acceptance criterion. So the PRD's FR-9 consequence — *"A Deep Project is visually distinguishable from a Shallow Project in the scene"* — is satisfiable by a build that fails the actual requirement completely. Dimmer + no moon + no label is *distinguishable*. It is also **exactly what "we have no data for this one" looks like** in every data visualisation ever built. The proposed treatment renders absence-of-decision using the universal visual vocabulary for absence-of-data. The PRD proposes it in an `[ASSUMPTION]` and does not notice.

And this lands directly on the M2 gate's second clause — *"can he tell which entries are worth reading?"* — which means the most likely failure mode of the launch gate is encoded in an unratified assumption whose known failure mode is documented in a different file.

Compounding: FR-9 depends on ~7 Shallow entries reading as *career breadth*. Seven of ten planets dim, unlabelled, moonless. The PRD never asks the obvious adversarial question: **what does a universe look like when 70% of it is deliberately de-emphasised?** UJ-2's Priya "can tell which of the remaining entries are worth the same attention" — but if seven of ten are dim and mute, what she can tell is that most of this is empty. Nobody has looked at that composition, and the force layout's aesthetic justification (18 bodies, dust to fill space) assumed bodies that read as present.

**What would have to change.**
1. Promote the addendum's meaning-vs-missing-data question into FR-9 as its primary acceptance criterion: *"Shown a Shallow Project cold, a reader describes it as an entry without a highlighted decision, not as an entry with missing information."* That is testable on paper, today, with a sketch.
2. Block FR-9's assumption on the M0 cold-read (F-3). §13 Q5 already says "resolve after the two-entries-cold-read" — so make the cold-read a scheduled gate rather than a Note.
3. Add a composition check to M1: render 3 Deep and 7 Shallow at the proposed treatment and ask whether the scene reads as a career or as a mostly-empty field.
4. Consider the inverse treatment, which nobody has argued: Shallow entries rendered at *full* presence with Deep entries *additively* marked. Same data rule, opposite failure mode. It is not in §12 Rejected Alternatives, which means it was never considered.

---

## F-7 — HIGH — NFR-1 (2.5s first paint) is asserted against a system whose initialisation cost nobody has estimated, and the PRD's own settling budget contradicts it

**The attack.** NFR-1 is a hard, explicitly non-tradeable launch gate:

> `[ASSUMPTION: The first frame of the Schematic scene renders within 2.5 seconds on the target hardware profile over a median broadband connection.]` ... This is a **launch requirement**, not a tradeable.

Now count what must complete before that first frame exists on a three-year-old integrated-graphics laptop (NFR-4): WebGL context creation and shader compilation, JS bundle parse and execute (a 3D engine is not small), JSON parse, **force simulation run to settled**, dust particle system initialisation, rail/shot resolution against settled positions, and first render. The PRD budgets one piece of that:

> Force layout of ~18 Bodies must settle within one second on the target hardware profile. The count is small enough that this is generous rather than tight.

**The settling budget alone consumes 40% of the total first-paint budget** — and the PRD calls that one second "generous," meaning it is not a measured figure, it is a comfort estimate. Add shader compilation on integrated graphics (routinely hundreds of ms to seconds, and highly variable by driver), plus engine bundle parse, and 2.5s is not obviously achievable. Nobody has measured anything. The number was chosen because 2.5s is a number people say.

The deeper structural problem: NFR-1 is declared non-tradeable while the mechanisms that would make it achievable — deferring dust, streaming bodies, pre-computing the layout at build time — are neither specified nor required. The PRD says *"Everything behind it ... may stream in,"* which is permission, not a plan. And one obvious resolution goes unmentioned anywhere: **the simulation could be run at build time and the settled positions baked into the artifact.** That removes settling from the critical path entirely. It does not violate FR-2 (positions still solved by the simulation, never authored) and it does not violate FR-1. The document's own no-coordinates rhetoric — *"No Body position appears as a literal coordinate in any source or data file"* — may be what blocked anyone from seeing it, but a build-time artifact is not a source file, and the FR-2 consequence as written would need one word of clarification to permit the single most effective first-paint optimisation available. That is a rule shaped by aesthetics constraining an engineering option nobody noticed it was constraining.

**What would have to change.**
1. Downgrade NFR-1 from "launch requirement, not tradeable" to "launch target, unvalidated" until one measurement exists on real target hardware. A non-tradeable gate with no measurement behind it is a gate that will either be missed or quietly dropped.
2. Produce a **budget breakdown**: bundle parse, shader compile, JSON parse, settle, first render — with a number against each summing to 2.5s. If they don't sum, the gate is already failed and it is better to know now.
3. Measure shader compile time on the actual target profile at M1. It is the largest unknown and the one most likely to blow the budget.
4. Explicitly resolve build-time-baked layout: permit it (clarifying FR-2 to mean *no hand-authored positions*, which is what it actually cares about) or reject it in writing with a reason. Leaving it unconsidered is the expensive option.

---

## F-8 — HIGH — Content is the largest task, gates launch, is ~90% unwritten, and is the only M2 item with no gate, no estimate, and no place in the milestone table

**The attack.** §8.3 states it plainly:

> The career inventory is the single largest remaining task and it gates the launch milestone. One entry (SNCF, MDM replacement) is drafted and approved; roughly nine remain across ~5–6 clients.

Verified against `inventory-draft.md`: one entry drafted. One more (SNCF platform upgrade) has raw material and an explicit *"The decision is not yet identified."* The other ~8 do not exist in any form — not even client names. So the launch-gating deliverable is **~10% complete and is the only M2 line item with no gate, no sequencing, and no appearance in §9's milestone table.**

Every engineering item got a milestone, a gate, and a "tune at M1" instruction. The largest item got a section number.

This matters more than a scheduling nit because content is the one task with a **non-mechanical failure mode**. Code either compiles or doesn't. The excavation question — *"what did you argue for, and what did you argue against?"* — has an outcome nobody can force, and the PRD documents that memory is actively unreliable here:

> the first SNCF draft produced a plausible-but-wrong decision that inverted what actually happened.

The most successful entry in the inventory required a correction pass because raw recall produced a *confidently wrong* answer. That is the base rate: on the one entry attempted, unassisted recall failed. Nine more to go, at an unknown hit rate, on engagements progressively further in the past, and the PRD's estimate of 2–3 Deep entries is an extrapolation from n=1-and-a-half.

And there is an unfaced dependency: if the excavation yields **only** the one SNCF decision — entirely possible, since the second SNCF project already came up empty — then the site ships with one Deep entry and nine Shallow. At that point FR-9's "which entries are worth reading" is answered by pointing at a single planet, UJ-2 has one possible instance, and the claim *"a full career, with the arguable moments actually argued"* rests on one argued moment. **The PRD has no stated floor for the number of Deep entries and no plan for landing below it.**

**What would have to change.**
1. Put content in §9 as its own milestone with a gate, sequenced **before or parallel to M1**, not discovered at M2.
2. State a **hard floor**: minimum Deep entries for the product to be worth shipping (2 is arguably the floor; 1 is not a pattern). Add the branch: if excavation yields fewer, the product changes shape or does not ship. Decide now, not at M2.
3. Sequence the excavation *first*, not last. It has no dependency on any code, it is the largest task, it has the most uncertain outcome, and its result can invalidate FR-9, FR-18, and the two-class model itself. Everything about it says do it now.
4. Add an interview protocol beyond the single question. The PRD's own evidence says one question plus recall produced an inverted answer; the addendum notes *"asking what was annoying produces excellent constraint material but not the decision. Two different questions, both needed."* That is in the addendum, not in §8.3 where the work actually happens.
5. Estimate it. "Roughly nine remain" is a count, not an estimate. Nine paragraphs of 100–150 words, each requiring recovered memory of a contested decision, is plausibly the single largest time cost in the project — larger than the dust system — and it is the one item with no number attached.

---

## F-9 — MEDIUM — Testability theatre: a substantial share of "Consequences (testable)" are restatements, aesthetic judgments, or rationale

**The attack.** The `Consequences (testable)` heading is a promise of falsifiability. Many bullets do not keep it. Named offenders:

**Rationale masquerading as a test.** FR-16:
> - Backward time serves three masters at once: an aesthetic conceit, the correct ordering for a professional reader, and a non-arbitrary home for the ending. One decision, three payoffs.

This is an argument for the decision. It has no truth condition. It cannot fail. It is in a list labelled testable.

**Aesthetic judgment with no rubric.** FR-15:
> - Dust density does not obscure Bodies or read as fog.

"Reads as fog" has no threshold, no measurement, and no judge. FR-20:
> - No element reads as a placeholder or as an untextured asset awaiting a pass.

This is the *entire* schematic-identity risk (R-4, "widest confidence interval of any launch task") compressed into one unfalsifiable bullet. There is no defined pass condition for the highest-variance item in the launch set.

**Restatement of the requirement.** FR-13's requirement is "condense on Focus and decay on release"; its consequence is *"No Skill body exists in the scene while its Project is unfocused."* That is the requirement with the polarity flipped — it tests nothing the requirement didn't already assert.

**Design assertion, not consequence.** FR-14:
> - The scene contains no connector geometry between Bodies. A network diagram in a space costume would be read as exactly that by the target audience.

First clause is genuinely testable. Second is an unverified claim about audience perception — and note §7 explicitly forbids assertions about "what technical readers do with such sites" without research. The PRD violates its own rule inside a testability bullet.

**Vacuous.** FR-3: *"No fourth mapping rule exists."* FR-10: *"Two channels, no duplication: prose carries reasoning, geometry carries the stack."* The first tests a count of things the author chose to write; the second is a design summary.

**Unmeasured comparatives.** FR-18: *"A Deep Project receives measurably longer Dwell than a Shallow Project."* "Measurably" with no number is satisfied by 50ms, which would be invisible. §13 Q7 concedes the numbers don't exist — so the testable consequence is deferred to an open question and is untestable until it closes.

**Genuinely good ones, for contrast** — proving the author can do this when the requirement is mechanical: FR-2 ("No Body position appears as a literal coordinate in any source or data file"), FR-17 ("No Shot definition contains a world coordinate"), FR-8 ("`notable` contains no list, no bullets, and no technology names"), FR-1's no-network-request bullet. These are checkable by grep or by a test. The pattern is unmistakable: **everything mechanical got a real test; everything perceptual got prose.** And every launch-critical risk in §10 lives on the perceptual side.

**What would have to change.**
1. Split the heading into `Consequences (automatically verifiable)` and `Acceptance criteria (human judgment)`. Stop calling the second kind testable.
2. For each judgment criterion, name the **judge, the artifact, and the question**. "R-1's first reader, shown the resting scene, asked: does anything here look unfinished?" is a test. "No element reads as a placeholder" is a wish.
3. Delete rationale from consequence lists. FR-16's second bullet and FR-14's second sentence belong in Description.
4. Put a number on FR-18 or move the consequence to Open Questions where it currently actually lives.

---

## F-10 — MEDIUM — Derived Dwell (FR-18) and authored Rails (FR-17) are declared compatible, but the interaction that breaks them is documented and unowned

**The attack.** Flag 02 resolved the tension by division of labour: framing authored, duration derived. Clean in the abstract. The PRD then lists the case that breaks it and calls it an open question:

> **Dwell numbers.** How much longer on a Deep entry; whether the transition reads as deliberate or as stalling, **and behaviour across three consecutive Shallow entries.** Tune at M1.

A run of three consecutive Shallow entries is not a tuning parameter — it is a **composition problem**, and composition is the thing FR-17 says must stay authored. If Dwell is purely derived, a Shallow run produces three short, near-identical beats: the camera hurrying past a third of the career. Rail order is authored (backward time, FR-16, which fixes the order to chronology) but Dwell is derived, so **nobody owns the rhythm.** The author owns framing, the data owns duration, and the sequence-level pacing — the thing a reader actually experiences — belongs to neither.

This is exactly the failure the addendum warned about in the opposite direction: *"a force solver has no judgment."* Derived Dwell reintroduces judgment-free pacing at the sequence level after the PRD spent a whole rejected-alternatives entry establishing that emergent composition is unacceptable for a work sample. Flag 02 solved the tension for a single shot and left it unsolved for a sequence.

Second, unnoticed: **backward time (FR-16) plus derived Dwell (FR-18) means pacing is a function of when decisions happened to occur in the career.** If the two or three Deep entries are all recent, the site front-loads every slow beat and then sprints through seven years. If they are all old, the opening — the part UJ-1 and UJ-3 say is the entire product for an impatient reader — is a fast skim past dim, moonless planets. **The single most important frame of the product, the one NFR-1 and FR-24 exist to protect, is determined by an accident of the builder's career chronology, and no requirement gives anyone the power to override it.** Nobody has checked which case is true, and `inventory-draft.md` does not contain enough entries to tell.

Third: the addendum flags the coupling as needing an interface — *"a change to the two-class model propagates into pacing. Worth an explicit interface"* — but the PRD offers no override, no floor, no ceiling, and no authored escape hatch. It is a pure function with no manual bypass, in the one system whose output is judged aesthetically.

**What would have to change.**
1. Add a sequence-level pacing requirement, distinct from per-shot Dwell: something owns the rhythm across a run. State who.
2. Permit an authored Dwell override with a stated cost, or explicitly reject overrides the way FR-2 rejects position overrides — with reasoning. Right now the PRD is silent, which is the worst of the three.
3. Check the actual chronological distribution of the Deep entries as soon as the inventory exists, and treat an unfavourable distribution (all Deep entries old) as a **launch risk**, since it directly degrades the opening frame that UJ-3 says is the whole product.
4. Note that rail *order* is effectively authored-by-chronology and therefore unable to compensate for a bad Deep/Shallow distribution. If order can never be adjusted, say so; if it can, FR-16 needs an exception clause.

---

## F-11 — MEDIUM — The Fallback is a second product, sharing the M2 gate, with no requirements

**The attack.** FR-22 is four lines and one open question. What it actually commits to, once assembled from the PRD and the addendum, is enormous:

- It serves **100% of mobile visitors** (§2.2, FR-22).
- It serves every machine failing WebGL detection — on a target audience explicitly defined as corporate laptops (NFR-4), a non-trivial share.
- The addendum says it must clear the same bar as the main product: *"It must satisfy the same M2 gate — can a stranger tell what he does — with none of the scene's affordances."*
- UJ-3's Tom — the Forward, "the mechanism funnel positioning depends on" — is explicitly a mobile visitor, so **the second-order reader the entire positioning rests on receives the Fallback, not the product.**

Follow that to its conclusion. SM-1 ("the forward happens") is the primary success metric. UJ-3 says the forward is typically read on a phone. Phones get the Fallback. Therefore **the primary success metric is largely measured against a deliverable that has one FR, no design, no gate, and one unresolved open question about what it should even contain.** The PRD has invested ten FRs in the experience of the first-order reader and one in the experience of the reader it says the concept depends on.

Meanwhile the design of the Fallback is deferred to `bmad-ux` via a bullet in the addendum: *"'Flat star chart' names a form, not a content set."* It is scoped as a fallback and functions as the primary surface for the mechanism the product is built around.

**What would have to change.**
1. Give FR-22 real requirements: what content, what layout, what the reader can learn, and whether Deep `notable` prose is reachable there. If a mobile reader cannot reach the paragraph, the core bet cannot fire for the majority of forwarded visits — and that should be stated as a known limitation, not left to be discovered.
2. Resolve the tension with FR-24's honesty constraint: *"Preview and title do not overstate what a mobile or Fallback visitor will receive."* A preview image honest enough for the Fallback is a preview image that undersells the product to desktop readers. That is a genuine conflict between two M2 FRs and neither one acknowledges the other.
3. Decide whether the mobile Fallback deserves a first-class design pass. Given SM-1, the honest answer is probably yes — which means M2 contains **two** designed surfaces, worsening F-2.
4. Close Q9 (detection mechanism) before M2. Feature detection vs. benchmark vs. UA sniffing have wildly different costs and failure modes, and the wrong choice serves the Fallback to capable machines.

---

## F-12 — MEDIUM — Success metrics are unmeasurable in practice, and the primary one is unobservable by construction

**The attack.** SM-1 is the primary metric and the concept's success condition:

> **SM-1 — The forward happens.** The link is sent onward by someone other than Thomas, unprompted. This is the funnel-positioning success condition and the only external signal the concept rests on.

There is no backend (NFR-6), no analytics specified anywhere, and a forward happening in a private Slack DM is **structurally unobservable**. So the primary success metric of a launch-stakes product cannot be measured by any mechanism the PRD permits. Thomas learns a forward happened only if someone tells him. That is not a metric; it is a hope with an ID number.

This interacts badly with SM-C1 ("do not optimise total visits"). The PRD rules out the one signal that could weakly proxy for forwards (a traffic bump from a domain he didn't share) while relying on a signal it cannot see. The result: **the product ships with no instrumentation and no way to know whether it worked.** For a personal project that is survivable — but the PRD is written at launch stakes and claims an external success signal, and §12 explicitly rejected the "it's for me and that's fine" framing *because* it removes the external signal. The PRD rejected the no-signal framing and then built a no-signal product.

SM-2 (a stranger passes the gate) is n=1, and per F-3 that stranger is the same invested person as R-1/R-2 — so the primary validation metric is a single friendly reader. SM-3 (reader describes an architectural decision after reaching the Colophon) requires knowing that a reader reached the Colophon, which is unobservable for the same reason, and the addendum concedes the Colophon's discoverability is unspecified *"and it materially affects SM-3, its only observable."* SM-4 is the only metric Thomas can genuinely evaluate alone, and it measures maintenance cost — the least important thing about whether this product works.

**What would have to change.**
1. Decide whether any analytics exist. A privacy-respecting, cookieless referrer count is arguably compatible with NFR-6 (no backend *he* operates) and would make SM-1 weakly observable. If the answer is no, mark SM-1 **unobservable** and say plainly that success will be anecdotal.
2. Replace SM-1's binary with something detectable: *"at least one person tells Thomas, unprompted, that they sent it on."* Weaker, but real.
3. Fix SM-2's n and independence (see F-3).
4. Resolve Colophon discoverability, since SM-3 is otherwise dead on arrival.

---

## F-13 — LOW — Assumption tagging is applied unevenly, so §14 understates how much of the PRD is unratified

**The attack.** §14 lists six assumptions and asserts completeness — *"Every `[ASSUMPTION]` above, surfaced for confirmation."* That is true of formally tagged blocks and false of the document's actual inference load. Untagged inferences of equal or greater weight:

- **~18 primary Bodies, ~5–6 clients, ~10 projects, 2–3 Deep, ~7 Shallow.** These drive the settling budget, the dust-versus-sparseness argument, the rejection of belt-merging, and FR-9's whole premise. The Deep count is extrapolated from **one** completed entry (per `inventory-draft.md`), and the second attempt at a Deep entry has already failed to produce a decision. Untagged, stated as approximation, load-bearing everywhere.
- **"Force layout of ~18 Bodies must settle within one second"** — presented as a feature NFR with the editorialising *"generous rather than tight,"* no measurement, and it consumes 40% of NFR-1 (F-7). Untagged.
- **FR-8's 100–150 word range and 90-word floor** — a specific quantitative content rule derived from one drafted entry. Untagged.
- **"Roughly seven engagements plausibly contain no publishable decision"** — this is the two-class model's entire justification, and it is a guess about memories not yet excavated. Untagged.
- **NFR-3's degradation psychology** — *"A viewer served a stripped-down render judges the stripped-down render"* — an untested claim about viewer perception, in a document that forbids unresearched claims about reader behaviour (§7). Untagged.

The effect is that §14 makes the document look 6-assumptions-uncertain when it is considerably more. Six formal tags reads as disciplined; it is disciplined about the six things someone happened to tag.

**What would have to change.**
1. Add the five above to §14, or add a §14b for untagged quantitative estimates with their provenance (measured / drafted / recalled / guessed).
2. Tag every count in the Glossary with its source. "Approximately 10 exist" derived from memory is not the same kind of fact as "1 drafted."
3. Re-derive the 2–3 Deep estimate after excavating three more entries, and treat the current figure as provisional in every place it is load-bearing.

---

## F-14 — LOW — Missing from a launch-stakes PRD

Specific gaps, beyond the findings above:

1. **No effort estimate anywhere.** Not one hour, day, or week figure in a document whose Critical risk is capacity. Capacity risk cannot be reasoned about without a size, and the PRD explicitly names *"no estimate"* as part of R-1 and then does not produce one. This is the most consequential absence in the document after F-1.
2. **No definition of "done" for M2 as a whole.** The gate is a question a stranger answers. There is no checklist, no exit criteria, no way for the builder to know he has arrived — which for a solo builder with no deadline is precisely how a project idles at 95% forever.
3. **No abandonment or de-scope trigger.** No sentence anywhere of the form "if X hasn't happened by Y, cut Z / ship the fallback only / stop." A project whose top risk is non-completion needs a written stop-loss.
4. **No hosting, domain, or deployment plan.** "Linked from the CV" is the R-1 forcing function and there is no URL, no host, no build pipeline, no deploy step mentioned in any milestone. The last mile is missing entirely.
5. **No browser support matrix.** WebGL2 vs WebGL1, Safari behaviour, corporate policy blocking (which the PRD half-anticipates with Marc's edge case) — all undefined, while FR-22's detection requirement depends on knowing exactly what "incapable" means.
6. **No accessibility position at all.** A scroll-driven WebGL site with prose locked inside a 3D scene has obvious keyboard, screen-reader, and motion-sensitivity implications. `prefers-reduced-motion` is not mentioned once. The honest answer may be "the Fallback is the accessible path" — but that must be *stated*, and it makes the Fallback more load-bearing still (F-11).
7. **No content licensing / client-name risk note.** FR-11 ships real client names on the assertion *"There is no NDA constraint."* No contract was checked; consultancy agreements routinely restrict naming end clients, and the intermediate consultancies are also named as attributes. One line: verified or assumed. Currently it reads as verified and is not marked as an assumption.
8. **No rollback or takedown plan.** If a named client objects post-launch, what happens? Two minutes to write, and it removes a real (if unlikely) launch-day fire.
9. **No M0.** See F-3. The absence of a validation milestone before the build milestone is the single most consequential structural omission in the plan.

---

## Summary of required changes, ordered by leverage

1. **Add M0 — Paper Validation.** SNCF `notable` plus two drafted Shallow entries, in front of 3–5 cold technical readers, before any code. Tests R-2 and R-3 simultaneously for the price of an afternoon. (F-3, F-6)
2. **Mark R-1 unmitigated in the table, and gate all work on naming a real external reader.** (F-1)
3. **Re-apply the freeze bar to M2's existing contents and split M2a/M2b.** Delete "minimum." (F-2)
4. **Sequence content excavation first and set a hard floor for Deep entries, with a written branch if it isn't met.** (F-8)
5. **Correct Flag 04's status to open, and propagate that to NFR-1 and FR-24.** (F-4)
6. **Produce a first-paint budget breakdown and resolve build-time-baked layout.** (F-7)
7. **Close Q10 (contact) and fix NFR-6's contradiction.** (F-5)
8. **Separate verifiable consequences from judgment criteria, and name a judge for each judgment.** (F-9)
9. **Add an effort estimate, an M2 definition of done, and a stop-loss trigger.** (F-14)

**The one-sentence verdict:** this PRD is an excellent map of a project's risks and a poor plan for surviving them — it defers every cheap test until after the expensive work, calls a doubled scope "minimum" and "frozen," and rests its only Critical risk on a person who does not yet exist.
