---
title: "PRFAQ Distillate: cosmos-portfolio"
type: llm-distillate
source: "prfaq-cosmos-portfolio.md"
created: "2026-08-31"
purpose: "Token-efficient context for downstream PRD creation"
---

# PRFAQ Distillate: Cosmos Portfolio

Dense context pack for PRD creation. Supersedes the product brief where they
conflict — four brief decisions were amended during the PRFAQ session.

## Concept Identity

- **Type:** personal work-sample / portfolio. Non-commercial. No budget, headcount, revenue, or ROI case. Standard commercial FAQ framing (unit economics, pricing, first-100-customers, competitive switching) does not apply and was deliberately not used.
- **What it is:** single-page desktop-first WebGL site rendering a consulting career as a navigable cosmos. Clients = stars; projects = planets orbiting their client; skills/technologies = interstellar dust that condenses into orbiting bodies on focus and decays back on release. Scroll runs time backward (present → past).
- **Positioning (resolved in Stage 3, Q10):** **top of funnel.** The site does not change a hiring decision; it changes whether the conversation happens and whether the link gets forwarded. Job: make a CV memorable among forty, and give a champion something to forward with "look at this." This is narrower than the brief's implied claim ("a technical reader forms a judgment about capability and taste") and is the operative positioning.
- **Transfer claim (resolved in Stage 3, Q9):** the site proves *how the author works* — evidence is the architecture (schema by field absence, no position overrides, one-knob maintenance, entity-relative camera framing), not the graphics. Domain differs; engineering judgment transfers. **This claim requires the reasoning to be visible to visitors.**
- **Author motive, stated plainly:** he wanted to build it; the professional case is real but was not retrofitted as primary. This candour is consistent with the site's own editorial stance and should not be sanitised in downstream docs.

## Audience

- **Primary:** technical readers who click through from LinkedIn or the CV — engineering leads, senior peers, technical founders, hiring managers with engineering backgrounds. **Pre-qualified**: they already hold titles, employers, and dates before clicking.
- **Second-order and newly load-bearing:** *the forward* — a colleague who receives the link with no context, no prior interest, and no reason to wait. Under funnel positioning this reader is the mechanism the whole concept depends on, and is the least patient visitor the site will ever have.
- **Secondary, explicitly not optimised for:** non-technical recruiters. Accepted: the CV that linked here already served them.

## Amended Brief Decisions (4 drift flags — supersede the brief)

### Flag 01 — Uniform depth to two body classes (RESOLVED)

- **Fact that forced it:** of ~10 projects, the author can name what he argued for and against on **2 or 3**, from memory. Roughly seven engagements plausibly contain no publishable decision — much professional work is competent delivery where no alternative was contested. This is not a writing backlog.
- **Brief said:** ten projects at uniform depth, no hero entries, no minor entries; justified as a maintenance principle (no curation decision when adding entry eleven).
- **Why it broke:** uniform depth was silently acting as a *quality promise*, which can only be kept at the level of the weakest entry. Forced either **padding** (7 entries whose `notable` states responsibility rather than choice — the exact failure the addendum identified, and what the target reader discounts) or **stalling** (never shipping). A reader sampling 2–3 of 10 has ~70% chance of landing on a padded entry.
- **Resolution:** schema identical for every project; `notable` populated where a real decision exists, empty where it does not. A project without a decision is "a planet with no moon" — still carries client, role, duration, team size, stack, condensing dust.
- **Why it is consistent, not a compromise:** it *is* classification by absence, already the governing schema rule; it mirrors the consultancy demotion (real, labelled, not a positioned object); it derives camera hierarchy from data; entry eleven still needs no curation call.
- **Claim becomes:** not "ten projects, uniformly deep" but *a full career, with the arguable moments actually argued.*
- **Rejected:** (a) ship only the 3 strong ones — ~5 bodies too sparse for force layout to mean anything, deletes career breadth, and the dust model was partly justified as filling space around ~18 bodies; (b) excavate all 10 before deciding — defensible since decisions do not surface from raw recall, but rejected as *sequencing*; under two body classes it becomes optional and incremental (any entry later excavated simply gains a `notable` and self-promotes, no schema or layout change).

### Flag 02 — Authored rails vs. derived dwell (RESOLVED via M2 scope confirmation)

- **Tension:** the addendum locked entity-targeted **authored** rails as rot defence, arguing a force solver "has no judgment" and a badly composed hero shot "reads as having no eye." Deriving camera behaviour from data resembles the rejected emergent-composition option.
- **Resolution — they compose:** **framing stays authored** (what a shot frames, from what angle and distance, entity-relative — the eye is preserved); **dwell duration derives from the data** (how long the journey rests on a body follows from whether it carries a `notable`).
- **Why it improves things:** the addendum flagged an unresolved tension — uniform depth "risks reading as a table in 3D," so "variation must come from the camera," making hierarchy an authored judgment that must be re-tuned as the inventory grows. Derived dwell removes that hand-tuned number while keeping authored composition.
- **Status:** in M2 scope as confirmed by the author. Unspecified numerically.

### Flag 03 — Launch milestone vs. stated non-negotiables (RESOLVED)

- **Fact that forced it:** smallest version the author would actually link from his CV = **M2, greybox with the information layer.** No textures, no realism pass, no collapse ending, no contact surface.
- **Conflict:** the brief lists realism of materials/lighting, immersion, visitor awe, and runtime framerate as *not tradeable*. M2 delivers none of the first three.
- **Reconciliation:** the non-negotiables were **never launch gates** — they are quality gates for the finished artifact that had been functioning as preconditions to existing. The build order already encoded the right priority: the M2 gate is *"can a stranger tell what he does?"*, deliberately placed before the realism pass. The lists were simply never reconciled. Realism/immersion/awe convert *"this person can think"* into *"this person can build"*; they are not required for the site to be worth linking.
- **Why this is the session's highest-value outcome:** M5-launch has no forcing function; M2-launch does. It is the first point at which the thing is true.
- **Cost and its mitigation — the deliberate schematic:** a greybox reads as unfinished only when pretending to be finished. M2 ships as an **intentional visual language** (monochrome, blueprint, schematic, structure as the aesthetic), a legitimate idiom with its own rigor that signals structure over decoration to this exact audience.
- **Consequences:** (1) **visual identity promoted from open question to M2 blocker**; (2) **M3 stops being a launch gate and becomes an upgrade to a live site** — this inverts the completion dynamic entirely; (3) **contact mechanism stops blocking launch** (it blocks M4, now post-launch); M2 needs only a conventional contact route.
- **Rejected:** (a) honest beta framing ("work in progress" note) — cheapest, but invites the exact "unfinished" judgment the addendum warns of; a disclaimer does not neutralise a first impression; (b) M2 internal / M3 public — protects the first impression but restores the receding finish line and the abandonment risk that is the entire concern.

### Flag 04 — Funnel positioning vs. tradeable load time (OPEN — needs ratification)

- **Brief locked:** load time explicitly tradeable, on the rationale that the visitor is "already curious rather than triaging eleven tabs."
- **Funnel positioning requires:** fast first paint. The opening seconds are the *product*, not the packaging. A visitor lost during load never reaches the schematic, never reads an entry, and never forwards the link.
- **Why the original rationale weakened:** "pre-qualified therefore patient" holds for the first-order reader who already decided to invest attention. It fails for **the forward**, who has no context and no reason to wait — and the forward is the mechanism funnel positioning rests on.
- **Extra pressure from M2:** photographic textures were the largest expected payload, and M2 does not ship them. First paint at M2 should be cheap, making a slow one harder to justify.
- **Proposed resolution:** split the budget — load time stays tradeable for the *full experience*; **first meaningful paint becomes a launch requirement.** Opening frame must arrive fast; everything behind it may stream.
- **Also newly in scope:** shareability as a designed property rather than an observed outcome — link preview image, opening-frame composition, what a screenshot looks like pasted in Slack. None of this is in the brief.

## M2 Launch Scope (author-confirmed, "yes — all of it")

**In:**
- Information layer with the fixed field set
- Computed force-directed layout from embedded JSON + the three mapping rules (mass=duration, brightness=recency, distance=relevance) + single `weight` knob
- Backward-time scroll; authored entity-targeted camera rails; free flight on request
- Skills as interstellar dust with condensation on focus, decay on release
- **Deliberate schematic visual identity** (new — was an open question)
- **Technical colophon making the architecture visible** (new — required by the Q9 transfer claim)
- **Derived camera dwell** (new — required by the Q5 answer)
- **First-paint budget** (new — required by funnel positioning)
- 2–3 entries with full `notable` narrative; ~7 shallow entries
- Flat star-chart fallback for incapable machines
- Conventional contact route (unglamorous; the designed ending is M4)

**Out / post-launch:** realism pass (M3), collapse ending + black-hole contact surface (M4), fun layer (M5), mobile 3D, astronomically accurate scale, per-entry position overrides, CMS/backend of any kind, belt-merging of clustered small items (~18 bodies is far too few; revisit only on several-fold growth).

**M2 gate should be sharpened to:** *"can a stranger tell what he does — and can he tell which entries are worth reading?"* The second clause became load-bearing the moment two body classes were adopted.

## Content Model

```
client      end client (star)
project     name or short description
company     intermediate consultancy — ATTRIBUTE, never a body (billing infrastructure)
role        role on the engagement
built       short description of what was built
team_size   integer
notable     problem -> constraint -> decision, 100-150 words prose. POPULATED ONLY WHERE A REAL DECISION EXISTS.
skills      relation to technologies (rendered as condensing dust, never in `notable` prose)
```

- **Inventory magnitude:** 2 companies, ~5–6 clients, ~10 projects, unbounded unpositioned skills. ~18 primary bodies. Force layout of 18 nodes settles fast; performance budget is generous; framerate constraint is a guardrail against future carelessness (post-FX stacking, texture resolution), not a live threat from body count.
- **Cardinality:** one engagement may yield several projects. A client star holds 1..n planets. Splitting keeps each problem/constraint/decision sharp rather than blurred (e.g. SNCF yields both an MDM replacement and a platform upgrade programme).
- **`notable` must be prose, not a list** — a list fragments the causal chain, which is the only reason the field is worth reading. Below ~90 words the decision loses its rejected alternative and reverts to a job description.
- **A decision needs a named rejected alternative**, or the field states responsibility (already covered by `role`) rather than choice.
- **The question that surfaces the decision:** *"what did you argue for, and what did you argue against?"* Raw recall does not reliably produce it — the first SNCF draft produced a plausible-but-wrong decision (a conservative design for a junior team) which inverted what actually happened (deliberate modernisation, junior team a reason *to* modernise). Ask explicitly for every entry.
- **Why problem/constraint/decision replaced problem/decision/outcome:** no measured outcomes exist (never captured or not retained; as a consultant he frequently left before outcomes were visible). Without a number an outcome degrades into an unfalsifiable claim the target reader discounts entirely. The **constraint** is the falsifiability substitute — specific, unfakeable environmental conditions prove presence and reveal judgment. *"Anyone can claim a performance improvement. Nobody invents 'no container runtime on prem.'"*
- **Numbers that do exist and should be used:** team size, engagement duration, system scale, what was replaced or consolidated. Only measured performance metrics are absent.
- **Real client names ship** — no NDA constraint; recognisable names convert visual polish into credibility.
- **Deliberately excluded content:** client relationship friction (SNCF). A reader cannot verify it, both sides always exist, and published criticism of a named former client reflects on the author. Recorded so the decision is not silently revisited.

## Requirements Signals

- **Colophon must show the data file and the rules**, not describe them — the argument is "look at the model." Cheapest defensible form: static HTML outside the 3D scene, no 3D work required.
- **Dwell derivation needs actual numbers**: how much longer on a `notable` entry, whether the transition reads as deliberate or as stalling, behaviour on a run of 3 consecutive shallow entries. Tune at M1 on the greybox where it is cheapest.
- **Shallow entries need a designed treatment** — currently just "client, role, team size, duration, stack." Whether that reads as useful breadth or as a LinkedIn export in 3D is unspecified and is the most likely M2 gate failure. Cheap de-risk: draft two shallow entries in full text and read them cold.
- **Schematic identity needs palette, line weight, typography, label treatment, UI chrome.** Widest confidence interval of any M2 task — it now gates launch while sitting in the author's self-identified weakest discipline.
- **Condensation open questions:** timing of condensation/decay; how much dust is visible at rest without becoming fog; whether skill labels are legible only while condensed; behaviour when focus moves directly from project A to project B (cross-fade vs. full decay then re-condense).
- **Camera residual risk:** entity-relative framing fixes *what is centred* but not *what is behind it* — a shot composed against a clean background may later have a body drift into frame. Bounded by small inventory; check at M1. Bounding the solver (minimum separation, bounding volume, no-fly zones) was not rejected outright and survives as a safety net beneath the rails, specifically for this risk.
- **Reserve option:** pinning solver history — old entries settle once and freeze, new entries find space around them. Bounds drift to newest additions and would make old shots permanently valid. Seed-locking applied incrementally rather than globally.

## Unratified Thresholds (gates that cannot be tested)

- **Framerate target** — proposed locked 30fps @ 1080p on 2023-era integrated graphics with full post-FX, falling back to the flat star chart below that. **Never ratified by the author.** M3 gate has no testable threshold until it is. Rationale for 30 over 60: slow camera movement through mostly static geometry is the exact case where 30 reads cinematic rather than broken; holding 60 on integrated graphics would cost texture resolution and post-FX, both serving the realism non-negotiable. Degradation policy: **quality holds, frames drop** — a viewer served a stripped-down render judges the stripped-down render, unaware a better version existed. A stable framerate reads smooth where a fluctuating one reads broken even at a higher average.
- **First-paint budget** — accepted in principle (Flag 04), no number.
- **Target hardware profile:** three-year-old laptop, integrated graphics, 1080p — the corporate work-laptop profile of the actual audience, explicitly not a 2023 Apple-silicon machine and not the dev machine.

## Rejected Framings (do not revisit without new information)

**Press release headlines:**
- *"The Career That Runs Backwards"* — leads with the mechanic. Backward time is elegant (aesthetic conceit + correct professional ordering + non-arbitrary home for the contact form, one decision three payoffs) but the reader learns nothing about why to look. Fails "so what?"
- *"...where the layout was never drawn by hand, only computed"* — engineering boast aimed at engineers; fails the mom test; describes *how it was made*. No visitor experiences "this was computed"; they experience "this looks right."
- **Chosen:** *"Look Closer and the Detail Assembles"* — describes the reader's action and its reward, and doubles as a literal description of the condensation mechanic and the site's thesis.

**Positioning:**
- *"The advantage is that the thing is difficult to build well"* (the brief's own differentiator) — tested as press-release material and **cut**. Build difficulty cannot appear without becoming a boast, and the reader never perceives it. Survives implicitly: capability is inferred from an artifact that works.
- *Mid-funnel* (changes the interview) and *"it's for me and that's fine"* — both rejected in favour of top-of-funnel. The latter would have worsened completion risk by removing any external success signal.
- *"It proves I finish things"* and *"it doesn't prove anything, and I say so"* — rejected as the Q9 transfer answer in favour of "it proves how I work."

**Architecture (from brainstorm/brief, retained here so they are not re-litigated):**
- *Composition:* seed lock (rejected globally, survives as incremental history-pinning); accept emergent composition (a solver has no judgment; a random seed would decide the hero frame; under work-sample framing a badly composed hero shot reads as having no eye); bound the solver (not rejected — retained as a safety net).
- *Graph expression:* constellations (flat, close to the obvious answer); shared light / spectral colour (physically true but breaks past ~6 skills, inventory exceeds that); static gravitational binding (elegant and free but **invisible** — the visitor sees a clump and cannot know why); demote to text (relegates the best evidence of range to where every other portfolio puts it); skills as meteors (physically most correct, but dust achieves the same permanence-free property with a gentler atmospheric read).
- *Hierarchy:* projects as stars (loses where the work happened; duration-derived mass becomes uniformly small); intermediates as stars (would build a universe whose suns are staffing agencies); two-body client+intermediate systems (physically honest to the contract but makes the billing relationship a visual centrepiece — precisely backwards).

## Verdict Findings as Actionable Items

**Needs more heat:**
1. Design the shallow-entry treatment; de-risk by drafting two in full text and reading cold.
2. Turn "monochrome blueprint" into an actual visual system (palette, line weight, type, chrome).
3. Specify dwell derivation numerically; tune at M1.
4. Decide the colophon's form; make it show the data and rules.
5. Put numbers on first paint and ratify the framerate target.

**Cracks:**
1. **Capacity is the whole risk.** No estimate, no deadline, no external forcing function, and M2 roughly doubled in one session. *Fix: a date, or a first reader.* Either an external commitment ("linked from my CV by X") or a named person who has agreed to give the M2 verdict.
2. **Scope grew under pressure with no defence against recurrence.** The brief's rot defence was architectural; there is no equivalent for scope. *Fix: freeze M2 as defined; route every subsequent addition to M3 by default. Bar for adding to M2 = "the site is actively misleading without it," not "this makes it better."*
3. **Blender dependency at M4 is unresolved and structurally awkward** — the whole technical approach was chosen to route around a 3D modelling skill the author places below his bar, and the two bookends need exactly that skill. Post-launch under Flag 03, but the most likely milestone to stall, and it holds the concept's emotional climax. *Fix: decide now whether the collapse is bought (asset packs, commissioned, procedural in-engine rather than modelled) or dropped. Do not leave it as an open dependency on the avoided skill.*
4. **The core bet is untested** — that a technical reader will stop and read a full paragraph. The press-release reader quote is labelled aspirational rather than fabricated, but asserts a reaction nobody has had. *Fix: one real reader at M2, answering the gate question cold.*

## Downstream Notes

- **The PRFAQ supersedes the product brief** in the planning pipeline. Where they conflict, the four drift flags win.
- **Competitive/market research was deliberately not run.** No competitive claim appears anywhere in the PRFAQ — the only comparison made is against the reader's existing alternative (a PDF CV), which needs no external data. This was judged unnecessary rather than skipped by omission. **If a downstream doc asserts anything about the WebGL-portfolio landscape or about what technical readers actually do with such sites, research it first.**
- **Stage 4 (Internal FAQ) was not run**, declined on the grounds that no economic impacts exist — correct for budget/headcount/ROI questions. The non-economic half (capacity, scope stability, Blender dependency) is carried into the Verdict cracks above and remains uninterrogated as Q&A.
