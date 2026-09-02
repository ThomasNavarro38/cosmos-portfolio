---
title: "Input Reconciliation — Product Brief → PRD"
source_input: "briefs/brief-cosmos-portfolio-2026-08-31/brief.md"
target: "prds/prd-cosmos-portfolio-2026-09-01/prd.md"
also_checked: "prds/prd-cosmos-portfolio-2026-09-01/addendum.md"
created: 2026-09-01
---

# Input Reconciliation: Product Brief → PRD

**Question answered:** what does the product brief contain that the PRD (or its addendum) silently dropped?

**Method:** full read of both documents plus the PRD addendum, followed by a term-level sweep for the brief's load-bearing phrasings, metaphors, and named artifacts. The PRFAQ's four drift flags (uniform depth → two classes; M5 → M2 launch; load time → first-paint carve-out; capability judgment → top-of-funnel) are treated as authoritative amendments and excluded from the gap list; they are recorded in *Correctly Amended* below.

**Headline:** the PRD is a faithful and in places superior carrier of the brief's *decisions*. What it drops is almost entirely the brief's **rhetorical and technical framing layer** — the problem statement that motivates the whole product, the technical strategy that makes the visual bar achievable, and four or five compression-resistant metaphors that downstream UX and architecture workflows will need and will otherwise re-derive badly. One gap (the realism strategy) is a genuine requirements-level loss, not merely a tonal one.

---

## Gaps Found

### G-1 — The entire Problem statement is absent. `CRITICAL`

**What was dropped:** the brief's §The Problem — three paragraphs establishing *why this product exists at all*. The PRD opens at §1 Vision with the solution already assumed and never states the problem being solved. Specifically missing: the CV-compression argument, the consultant-specific employer-column argument, and the medium-undercuts-the-message argument.

**Exact quotes from source:**

> "A consultant's CV loses the most important information by design. Two pages, skimmable, optimised for keyword matching — everything interesting gets compressed out. What survives is a list of employers, roles, dates, and technologies. What disappears is the part that distinguishes one senior engineer from another: what the problem was, what made it hard, and what they decided to do about it."

> "This hurts consultants specifically. The employer column lists intermediaries: consultancies that held the contract and processed the invoices, saying nothing about the work itself. The real context is the end client and the constraints of their environment, and a CV has no room for either."

> "There is also a second, quieter problem. A portfolio is supposed to demonstrate capability, but a conventional developer portfolio demonstrates only that its author can build a conventional developer portfolio. For someone whose claim is that they can build difficult things, the medium is undercutting the message."

**Why this matters beyond tone:** the second paragraph is the *sole justification* for the PRD's own domain model. FR-6 ("Company is an attribute, never a Body") and the Glossary's Company/Client split are stated in the PRD as facts with no rationale attached — the reasoning that produced them lives only here. A downstream architect reading the PRD alone can see *that* Company is never a Body but cannot see *why*, which makes it exactly the kind of rule that gets "simplified" in implementation. Similarly the third paragraph is the load-bearing premise under §7's "Build difficulty is never claimed" and under the whole work-sample framing.

**Where it should go in the PRD:** a new §1.1 *Problem* immediately before or inside §1 Vision. The employer-column paragraph should additionally be cited inline at FR-6 as its rationale, in the same way FR-8's Out of Scope cites the falsifiability argument.

---

### G-2 — "Realism is borrowed, not modelled" — the technical strategy for the visual bar. `CRITICAL`

**What was dropped:** the brief's entire technical approach to meeting the realism bar, including the named asset sources and the explicit statement of the author's limitation that drove the choice. The PRD says "Realism pass — textures, lighting, post-processing. **M3.**" and stops. NASA, ESA, drei, and "post-processing film artifacts" appear **nowhere** in the PRD or its addendum.

**Exact quote from source:**

> "**Realism is borrowed, not modelled.** The visual bar is met with NASA/ESA public-domain texture maps, drei built-ins, and post-processing film artifacts, plus pre-rendered Blender sequences for the two bookend shots. This is a deliberate route around a known limitation: the author's 3D modelling skill sits below the quality bar he refuses to lower, and space is the rare subject that needs almost no modelling — spheres, textures, and light."

**Why this is critical and not merely a deferral:** this is not decoration deferred to M3 — it is the *feasibility argument for the entire product*. It explains why a person who cannot model in 3D can nonetheless ship a photoreal space scene: because space needs spheres, textures, and light, and public-domain texture maps supply the textures. Drop it and M3 becomes an undefined "make it realistic" task sitting on top of the author's self-identified weakest discipline, with no strategy attached.

It also **partially orphans R-6**. R-6 correctly identifies the Blender dependency as a risk and proposes going procedural — but Blender was only ever *half* of this strategy (the two bookend shots). The other half (borrowed textures + drei + post-FX for the main scene) is the part that has no risk and no dependency, and it has vanished along with the risky half. A reader of the PRD alone cannot tell that the M3 realism pass is mostly *asset sourcing*, not *asset creation*.

Note also that "space is the rare subject that needs almost no modelling" is the single sentence that connects the *subject matter choice* to the *capability constraint*. Without it, "why space?" has no recorded answer anywhere in the PRD chain.

**Where it should go in the PRD:** §8.2 under the Realism pass bullet, as a scoped strategy note; and as a `[NOTE FOR PM]` on R-6 clarifying that only the bookends carried the Blender dependency. Ideally it also earns a line in §6 Constraints, since "borrowed, never modelled" is a genuine guardrail on future asset decisions.

---

### G-3 — "Skills are weather, not furniture." `HIGH`

**What was dropped:** the governing metaphor for §4.3. The PRD carries the full mechanic (FR-13, FR-14, FR-15), the permanence property, the no-duplication property, and even the compositional argument about eighteen objects in a medium — but not the four-word phrase that makes the intent instantly legible.

**Exact quote from source:**

> "**Skills are weather, not furniture.** Every skill and technology exists permanently as diffuse interstellar dust, filling the space between bodies."

**Why this matters:** the PRD addendum explicitly hands UX an open question about Dust density, Skill label legibility, and A→B focus transitions (§13 Q6). "Weather, not furniture" is the one-line answer to all three: weather is ambient, continuous, unlabelled at rest, and transitions by drift rather than by cut. A UX designer given the mechanic without the metaphor has to reconstruct that intent, and the most likely wrong reconstruction — discrete labelled particles at rest — is precisely "furniture."

**Where it should go in the PRD:** §4.3 Description, opening sentence. Also worth adding to the Glossary under **Dust** or **Condensation** as the intent gloss.

---

### G-4 — "The layout is never authored… What *is* authored is the camera." `HIGH`

**What was dropped:** the brief's central symmetry, stated twice and in two forms — once in the Executive Summary and once as the §Solution section heading "**The camera is the composition.**" The PRD carries both halves as separate mechanical requirements (FR-2 computed layout; FR-17 authored Rails) and states the composition argument in §4.4's Description ("Rails are the composition — a force solver has no judgment"), but never states the paired formulation that makes the architecture memorable as a single idea.

**Exact quotes from source:**

> "The layout is never authored. Positions are solved from a single embedded JSON file, so adding a project in five years costs one entry and one number. What *is* authored is the camera."

> "**The camera is the composition.** Authored camera rails guide the visitor by default, on a curated trajectory through the universe, with free flight available on request."

**Also dropped from the same passage:** "on a curated trajectory" — the PRD's FR-17 says the default journey follows authored Shots but never characterises the journey as *curated*, which is the word that makes Rails an editorial act rather than a navigation aid.

**Where it should go in the PRD:** §1 Vision (the paired formulation) and §4.4 Description (restore "curated trajectory"). This is also the crispest possible summary line for the Colophon (FR-21), which has to *state the rules* — "the layout is never authored; the camera is" is exactly such a rule and is currently unavailable to it.

---

### G-5 — "It is not a CV. It is the work sample." + the reward-the-click-twice structure. `HIGH`

**What was dropped:** the brief's framing of the site's job as a *two-part reward with different audiences for each part*, and the flat declarative "It is the work sample."

**Exact quote from source:**

> "It is not a CV. It is the work sample. Visitors arrive from LinkedIn or from the CV itself, already knowing the job titles and the dates, and they click precisely because something suggested this person built a universe. The site's job is to reward that click twice: with awe, and — for the reader who slows down — with evidence of how Thomas thinks about engineering problems."

**What the PRD has instead:** §1 carries "It is not a CV, and it does not try to be" and the arrival context, then pivots to funnel positioning. §4 has no statement of the two-tier reward. The structure survives *implicitly* in the UJ-1 → UJ-2 sequence (Marc gets awe and keeps scrolling; Priya slows down and gets the reasoning) but is never named as the design intent that produced those journeys.

**Why this matters:** "reward the click twice" is the design rule that governs *pacing and information disclosure* across the whole product. It is what tells a UX designer that the first ten seconds and the sixtieth second are serving different readers and must not be optimised against each other. Currently that rule is only inferable by reading two user journeys and noticing they are ordered.

Note this is **not** the amended positioning claim — the PRFAQ correctly narrowed "reader forms judgment about capability" to top-of-funnel. The two-tier reward structure is orthogonal to that narrowing and survives it intact.

**Where it should go in the PRD:** §1 Vision, and as an explicit design principle in §6 Constraints or as a preamble to §2.3 Key User Journeys explaining why UJ-1 and UJ-2 are sequenced rather than alternative.

---

### G-6 — The platform statement: single-page, desktop-first, WebGL. `HIGH`

**What was dropped:** the one-line technical envelope for the whole product. The words "single-page," "desktop-first," and "WebGL" (as a platform declaration rather than as a failure condition) do not appear in the PRD's requirements or NFRs.

**Exact quote from source:**

> "A single-page, desktop-first WebGL experience that renders the career as a cosmos and lets the visitor move through it."

**Current PRD state:** "WebGL" appears exactly once, inside UJ-1's edge case ("his corporate laptop cannot run WebGL"), i.e. only as a thing that can fail. Desktop-first survives only obliquely, as a negation in §2.2 ("Mobile 3D visitors… No 3D on mobile in v1"). Single-page appears nowhere at all.

**Why this matters:** stating a constraint only as its own failure mode is fragile. `bmad-architecture` reading the PRD has no positive statement of the rendering platform or the page model, and "no 3D on mobile" is a scope exclusion rather than a stated desktop-first design posture. Single-page in particular has real architectural consequences (routing, the Colophon's relationship to the scene, scroll ownership) and the PRD addendum already flags the Colophon's placement as unresolved — a question that partly *is* the single-page question.

**Where it should go in the PRD:** §5 Cross-Cutting NFRs as a new NFR ("Platform envelope"), alongside NFR-4's hardware profile which it naturally pairs with.

---

### G-7 — "Execution, not concept" — the honest differentiator. `MEDIUM`

**What was dropped:** the brief's §What Makes This Different, in substance. The PRD's §7 Non-Goals carries the *negative* half correctly and forcefully ("No competitive claim," "Build difficulty is never claimed") but drops the positive half — the honest statement of what *is* unusual here.

**Exact quotes from source:**

> "The honest differentiator is **execution, not concept**. Scrollytelling exists. Space visualisations exist. What is unusual here is the combination of a fully computed layout with authored cinematography, and a data model that resolves a many-to-many graph through physics rather than through drawn connector lines."

> "There is no moat here and none is claimed. The advantage is that the thing is difficult to build well, and building it well is the entire point."

**Why this matters:** the PRD's §7 currently reads as pure disclaiming — five bullets of what is not claimed, with nothing stated positively about differentiation. That is a subtle distortion of the brief's stance, which was not modest but *precise*: it names exactly one differentiator and defends it. "Building it well is the entire point" is also the clearest available statement of the quality bar that §6's not-tradeable list is protecting, and the phrase "authored cinematography" is a better handle on FR-17's intent than "authored Rails."

The "no moat, none claimed" line is fully compatible with §7's no-competitive-claim rule — it is a statement about the author's own posture, not a market assertion, and does not require the research §7 gates.

**Where it should go in the PRD:** §1 Vision or as a positive lead-in to §7 Non-Goals, so the section reads as *this, and therefore not those* rather than as a list of denials.

---

### G-8 — The primary audience roster and "capability and taste." `MEDIUM`

**What was dropped:** the enumerated primary audience and the word *taste*.

**Exact quote from source:**

> "**Primary: technical readers who click through.** Engineering leads, senior peers, technical founders, and hiring managers with an engineering background. They arrive pre-qualified from LinkedIn or the CV, already holding the facts. They are not looking for dates. They are forming a judgment about capability and taste."

**Current PRD state:** §2 Target User jumps straight to Jobs To Be Done and Non-Users. The primary user is never defined as a segment. "Engineering lead" and "senior peer" survive only as attributes of the fictional Marc and Priya in §2.3; "technical founders" and "hiring managers with an engineering background" are gone entirely. "Taste" appears nowhere in the PRD.

**Why *taste* matters specifically:** it is the only word in the brief that makes the Schematic Identity a *content* requirement rather than a *styling* requirement. R-4 correctly flags that Schematic Identity gates launch and sits in the author's weakest discipline — but the PRD never says why a reader's aesthetic read is load-bearing. "They are forming a judgment about capability and taste" is that justification, and it is exactly the sentence `bmad-ux` needs to treat FR-20 as first-class rather than as a styling sweep (which the PRD addendum explicitly worries about).

Note the "judgment about capability" phrasing is partly touched by Flag 04's narrowing to top-of-funnel — but *taste as a thing being judged* is independent of whether that judgment changes a hiring decision, and survives the amendment.

**Where it should go in the PRD:** a new §2.0 *Primary audience* naming the four reader types before §2.1; and "capability and taste" cited at FR-20 and R-4 as the justification for Schematic Identity's launch-blocking status.

---

### G-9 — "Backward time serves three masters" — the third master is unnamed. `MEDIUM`

**What was dropped:** the specific content of the third payoff. FR-16's Consequences carries the sentence almost verbatim — "an aesthetic conceit, the correct ordering for a professional reader, and a non-arbitrary home for the ending. One decision, three payoffs" — but drops the brief's parenthetical gloss on the second and the naming of the *ending* as the contact form.

**Exact quote from source:**

> "**Backward time serves three masters at once.** It is an aesthetic conceit. It is also the correct ordering for a professional reader (most recent first), and it gives the contact form a non-arbitrary home at the end of the journey. One decision, three payoffs."

**Delta:** "(most recent first)" and "gives the *contact form* a non-arbitrary home." The PRD says "a non-arbitrary home for the ending," which is circular — the ending's non-arbitrariness is that it is *where you ask someone to get in touch*, and that is now unstated. Since FR-23 defers the designed ending to M4 and ships a "conventional contact route" at M2, this is the sentence that explains what M4 is buying back. Low-cost restoration, real clarity gain.

**Where it should go in the PRD:** FR-16 Consequences, restoring the two clipped clauses.

---

### G-10 — The Vision's instrument framing. `MEDIUM`

**What was dropped:** the brief's §Vision, both halves. The PRD's §7 Non-Goals contains a one-line pointer — "Not a general-purpose visualisation engine. That the same engine could lay out anything with duration, relation, and relevance is a vision note, not a v1 requirement" — which correctly scopes it out but does not preserve it.

**Exact quotes from source:**

> "If it works, this stops being a portfolio and becomes an instrument. Point at a thing and its context assembles around it; look away and it disperses. The same engine that lays out a career could lay out anything with duration, relation, and relevance."

> "The nearer-term ambition is smaller and more useful: a career document that is genuinely alive. Most portfolios are snapshots that rot the moment they ship. This one absorbs new work by construction — one entry, one number — which means in five years it will still be true, and still worth visiting."

**Why this matters:** "Point at a thing and its context assembles around it; look away and it disperses" is the cleanest one-sentence description of the Focus/Condensation/Decay mechanic anywhere in the chain — better than FR-13's own phrasing for conveying *intent*. And the second paragraph's "still worth visiting" is a distinct claim from NFR-5's "still true": maintainability is about accuracy, but *worth visiting* is about the thing remaining interesting. The PRD carries the accuracy half and drops the interest half.

The PRD's §7 exclusion is correct as scope control; the loss is that a genuine long-horizon ambition now exists in the chain only as a negation.

**Where it should go in the PRD:** a short §15 *Vision beyond v1*, or an appended paragraph to §1 clearly marked as out-of-scope ambition. Keep §7's exclusion as-is; the two are complementary.

---

### G-11 — The reversed big bang and "the ending is the contact form." `MEDIUM`

**What was dropped:** the mechanism and the identity claim of the ending. The PRD's §8.2 M4 bullet carries "Collapse ending and black-hole contact surface… the arc is awe then calm, and the universe ends peacefully" — good, the emotional arc survives intact. What is gone is the *reversed big bang* as the mechanism and the flat identity statement.

**Exact quotes from source:**

> "…until the universe contracts through a reversed big bang and collapses into a black hole that becomes the contact form."

> "**The ending is the contact form.** Scrolling backward eventually reaches the beginning of the universe, which contracts and collapses into a black hole. That black hole is the contact surface."

**Delta:** "reversed big bang" appears nowhere in the PRD; nor does "reaches the beginning of the universe." The PRD says "collapse ending" and "black-hole contact surface" — the outcome without the causal chain. Since R-6 proposes implementing the collapse procedurally by disabling repulsion, the brief's framing (scroll backward far enough → reach the beginning → contraction) is exactly the design intent that the procedural implementation must honour, and it is now unrecorded.

**Where it should go in the PRD:** §8.2 M4 bullet and R-6's assumption text, restoring "reversed big bang / reaching the beginning of the universe" as the intended reading of the collapse.

---

### G-12 — "Realism is borrowed" corollary: the quality bar he refuses to lower. `MEDIUM`

**What was dropped:** the stance underneath the not-tradeable list — that the bar is fixed and the *approach* bends around it, not the reverse.

**Exact quote from source:**

> "…the author's 3D modelling skill sits below the quality bar he refuses to lower…"

**Current PRD state:** §6 lists what is not tradeable and then correctly demotes those items from launch gates (Flag 03). NFR-3's degradation policy carries the same spirit for runtime ("Better the real thing at 24fps than a lesser thing at 30"). What is missing is the general principle stated once: *when capability and quality bar conflict, route around the capability*. That principle is what generated the borrowed-realism strategy (G-2) and what should generate the M3 and M4 decisions still open.

This is listed separately from G-2 because it survives even if G-2's specific asset list becomes obsolete.

**Where it should go in the PRD:** §6 Constraints and Guardrails, as a stated principle alongside the Editorial constraint.

---

### G-13 — Two small phrasings that carry meaning. `LOW`

**a) "curated trajectory"** — covered under G-4; noted here as a discrete restorable phrase for FR-17.

**b) "Two channels, no duplication: prose carries reasoning, geometry carries the stack."** — **correctly carried**, verbatim, at FR-10. Noted here only because it is the kind of line most at risk in an FR rewrite; flagging it as protected.

**c) The consultancy-as-intermediary vocabulary.** The brief says "intermediaries: consultancies that held the contract and processed the invoices." The PRD Glossary says "an intermediate consultancy holding both the client contract and Thomas's contract. The payer." This is a *good* tightening and not a gap — but "processed the invoices" and "The payer" together were the vivid version of why a Company must never be a Star (see §12's rejected alternative: "a universe whose suns are staffing agencies"). The PRD keeps the vivid rejection but drops the vivid rationale. Minor.

---

## Correctly Carried

The following made it into the PRD intact, several in improved form:

- The core metaphor set: clients as stars, projects as orbiting planets, skills as interstellar dust (§1, Glossary).
- **Classification by absence** — carried and *strengthened*, promoted from a bullet in "What Makes This Different" to FR-5 with testable consequences, and reused to justify the two Project classes.
- The three mapping rules — mass from duration, brightness from recency, distance from rail by relevance — verbatim at FR-3, with a "no fourth rule exists" consequence the brief did not have.
- The single `weight` knob, default `1`, as the only hand-authored number (FR-4, Glossary).
- Entity-targeted camera shots and the no-world-coordinates rule (FR-17), including the silent-failure rationale, which the PRD states better than the brief did.
- "Nothing spawns and nothing teleports, so the physics stays honest" (FR-13, verbatim).
- The no-duplication property of dust — one skill serving every project that used it (§4.3, verbatim).
- No drawn connector lines (FR-14), with the network-diagram-in-a-space-costume argument added.
- The fixed field set and the 100–150 word `notable` (FR-7, FR-8).
- The problem → constraint → decision structure and the full falsifiability rationale for replacing problem/decision/outcome, including the on-prem-no-container-runtime exemplar (FR-8 Out of Scope).
- "Two channels, no duplication: prose carries reasoning, geometry carries the stack" (FR-10, verbatim).
- Real client names ship, no NDA, recognisable names convert polish into credibility (FR-11).
- One engagement may yield several projects, each keeping its own problem and decision distinct (FR-12).
- The emotional arc — awe then calm, the universe ends peacefully (§8.2, M4 gate).
- The degradation policy, expanded: the brief's "a viewer who receives a stripped-down render judges the stripped-down render, unaware they were served the lesser version" survives verbatim at NFR-3, with the stable-vs-fluctuating framerate argument added.
- Target hardware — three-year-old laptop, integrated graphics, 1080p (NFR-4), with "not the dev machine" added.
- The maintenance requirement and the author's self-identified laziness about upkeep (NFR-5, FR-2 Out of Scope).
- No CMS or backend, at any milestone (NFR-6, FR-1).
- Flat star-chart fallback, mobile served by it (FR-22, §2.2).
- Every brief-level "Explicitly out" item: mobile 3D, astronomical accuracy, per-entry position overrides, CMS/backend, belt-merging with the ~18-body rationale (§8.2).
- All five brief Open Questions carried forward: contact mechanism (Q10), career inventory (Q12), fallback trigger and scope (Q9), visual identity (absorbed into FR-20 and R-4), free-flight boundaries (Q8).
- The build order and its gates, M1 through M5, including "No vertical slice first — this is deliberate" (§9).
- The M1 pacing gate, verbatim.

## Correctly Amended

Per the PRFAQ's four drift flags. Not gaps; recorded for completeness.

- **Flag 01 — Content depth.** Brief: "Every project carries the same fields, in the same depth — no hero entries, no minor entries." PRD: two classes, Deep and Shallow, distinguished by `notable` presence (§4.2, FR-9). The PRD explicitly names the replacement and its reason.
- **Flag 03 — Launch milestone.** Brief implies M5 as the finish line. PRD makes M2 the launch, promotes Schematic Identity from open question to launch blocker, and demotes the realism pass to a post-launch upgrade (§8.1, §9, FR-20).
- **Flag 04 — Load time.** Brief: load time fully tradeable. PRD carves First Paint out as non-tradeable (NFR-1, §6), justified by The Forward.
- **Flag 02 — Positioning.** Brief: readers "forming a judgment about capability." PRD: top of funnel — does not change a hiring decision, changes whether the conversation happens and whether the link is forwarded (§1, §7, SM-1).

Also amended and correctly so, though not among the four flags:

- The brief's Success Criteria are restructured into SM-1..SM-5 with counter-metrics SM-C1..SM-C4, which have no brief antecedent and are a net addition.
- FR-24 (designed shareability) is new and the PRD says so explicitly in its own Notes.
- The brief's "signal to watch for is being shared" is promoted from a soft signal to SM-1, the primary metric.

---

## Recommended Disposition

If only three things are restored, restore these:

1. **G-2** (borrowed realism) — the only gap that loses a requirement rather than a framing, and it orphans half of R-6.
2. **G-1** (the Problem statement) — the PRD currently has no *why*, and FR-6 has no recorded rationale.
3. **G-3 + G-4** (weather-not-furniture; layout-never-authored/camera-is) — two phrases, both of which answer open questions the PRD addendum hands downstream to UX.
