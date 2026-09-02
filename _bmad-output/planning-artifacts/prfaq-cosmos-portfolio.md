---
title: "PRFAQ: Cosmos Portfolio"
status: "complete"
created: "2026-08-31"
updated: "2026-08-31"
stage: 5
concept_type: "personal work-sample / portfolio (non-commercial)"
pressure_focus: "completion risk — whether it ships"
brief_stance: "settled, flag drift"
inputs:
  - "_bmad-output/planning-artifacts/briefs/brief-cosmos-portfolio-2026-08-31/brief.md"
  - "_bmad-output/planning-artifacts/briefs/brief-cosmos-portfolio-2026-08-31/addendum.md"
  - "_bmad-output/planning-artifacts/briefs/brief-cosmos-portfolio-2026-08-31/inventory-draft.md"
  - "_bmad-output/brainstorming/brainstorm-cosmos-scrollytelling-portfolio-2026-08-30/brainstorm-intent.md"
---

# PRFAQ: Cosmos Portfolio

_Working document. Stage 1 complete; press release in progress._

<!-- coaching-notes-stage-1 -->
## Coaching Notes — Stage 1: Ignition

**Concept type:** Personal work-sample / portfolio. Non-commercial. This calibrates
every downstream FAQ: there are no unit economics, no first-100-customers, no
pricing, no market share. The equivalent questions are *stakeholder value*
(does a technical reader change their assessment of Thomas?), *adoption*
(does anyone click through, and does anyone share it?), and *sustainability*
(does it survive five years of career growth at near-zero upkeep?).

**Fast-tracked ignition.** All four essentials were already present and specific
in the existing brief, so extended discovery was skipped:

- **Customer:** technical readers who click through from LinkedIn or the CV —
  engineering leads, senior peers, technical founders, engineering-background
  hiring managers. Pre-qualified: they already hold the titles and dates.
  Secondary, explicitly not optimised for: non-technical recruiters.
- **Problem:** a consultant's CV structurally deletes the most distinguishing
  information — problem, constraint, decision — and lists intermediaries rather
  than the environments where the work happened. Second problem: a conventional
  portfolio proves only that its author can build a conventional portfolio.
- **Stakes:** the medium undercuts the message for someone whose claim is that
  he builds difficult things.
- **Solution:** a desktop-first WebGL cosmos; clients as stars, projects as
  orbiting planets, skills as condensing interstellar dust; backward-time scroll
  ending in a collapse into a black hole that is the contact surface. Layout
  computed from embedded JSON, never authored. Camera is the only authored
  composition.

**Assumptions challenged at ignition:**

1. *"The advantage is that the thing is difficult to build well."* Difficulty is
   invisible in the finished artifact. The reader sees a result, not a struggle.
   The press release must state what the visitor **experiences and infers**,
   not what it cost to make. Carried into Stage 2 as the central drafting
   constraint.
2. *Architecture is more finished than substance.* One of ten inventory entries
   is drafted. The layout solver — the interesting engineering problem — is
   fully reasoned; the content that gives it meaning is 10% written. Flagged as
   the primary risk to the M2 gate.
3. *Non-commercial framing.* Running the stock template unadapted would produce
   a well-formed document answering questions nobody asks. Template language
   shifts: "announce the initiative", "How to Visit", "reader quote".

**Direction chosen over alternatives (user decision):**

- **Pressure focus:** *completion risk* — chosen over reader-experience and
  content-gap angles. Rationale: the honest failure mode for a solo, unpaid,
  deadline-free five-milestone build is not a wrong metaphor, it is a beautiful
  greybox abandoned at M3 and never linked from the CV.
- **Brief stance:** *settled, flag drift* — locked decisions (cosmos metaphor,
  backward time, dust condensation, clients-as-stars, problem/constraint/decision)
  are built upon, but any contradiction the PRFAQ surfaces gets named explicitly
  rather than silently worked around. The user decides each reopen.

**Context gathering — deviation from standard flow.** Subagents were not fanned
out. The user did not request them, and the standard rationale for the
Artifact Analyzer (finding and summarising relevant local documents) was already
satisfied: the full brief, addendum, inventory draft, and brainstorm intent were
read directly and are compact enough to hold in working context. Web research is
deferred rather than skipped — the concept makes no competitive or market claims
that require external verification at this stage. If Stage 4 produces a claim
about the WebGL-portfolio landscape or about what technical readers actually do
with such sites, that claim gets researched before it ships.

**User context captured, not belonging in the PRFAQ itself:**

- Self-identifies as lazy about maintenance. This is load-bearing, not an aside:
  the no-position-overrides rule, the one-knob maintenance model, and the
  entity-relative camera rails all exist to defend against it.
- 3D modelling skill sits below the quality bar he refuses to lower. Space was
  chosen partly because it is the rare subject needing almost no modelling.
  Note the unresolved tension: the two Blender bookends still require the skill
  the approach was designed to route around.
- No NDA constraint; real client names ship.
- No measured outcome metrics exist for any project — they were never captured
  or not retained. This is why the narrative format is problem/constraint/decision
  rather than problem/decision/outcome.
- Performance target (locked 30fps @ 1080p, 2023-era integrated graphics) is
  proposed but **not yet ratified by the author**. The M3 gate has no testable
  threshold until it is.
<!-- /coaching-notes-stage-1 -->

<!-- drift-flag-01 -->
## Drift Flag 01 — Uniform Depth vs. Available Substance

**Status:** RESOLVED — brief decision amended by user during Stage 2.

**Surfaced by:** attempting to draft the press release. Every concrete sentence
available described the vessel (stars, orbits, dust, collapse). The reader's
actual takeaway — the evidence of thinking — rested on a single drafted entry.

**The fact:** of ~10 projects, the author can name what he argued for and against
on **2 or 3**, from memory, today. Not a writing backlog — roughly seven
engagements plausibly contain no publishable decision, because much professional
work is competent delivery where no alternative was seriously contested.

**The conflict:**

- *The PR needed:* a reader sampling two or three projects to come away able to
  state discipline, seniority, and environments (the M2 gate).
- *The brief locked:* ten projects at uniform depth, no hero entries, no minor
  entries — justified as a maintenance principle (no curation decision when
  adding entry eleven).
- *Why they conflict:* uniform depth was chosen to serve maintainability but was
  silently also acting as a **quality promise**, and a quality promise can only
  be kept at the level of the weakest entry. With 3 strong and 7 thin, uniform
  depth forces either **padding** (7 entries whose `notable` states responsibility
  rather than choice — the exact failure the addendum §Format Validation already
  identified, and the exact thing the target reader discounts) or **stalling**
  (never publishing until all ten are good, which they cannot all be). Padding
  is worse than it appears: a reader sampling 2–3 of 10 has a ~70% chance of
  landing on a padded entry.

**Resolution — two body classes.** Schema stays identical for every project.
`notable` is populated where a real decision exists and left empty where it does
not. A project without a decision is not a failed planet; it is a planet with no
moon — it still carries client, role, duration, team size, stack, and the dust
that condenses around it.

**Why this is consistent rather than a compromise:**

1. It is **classification by absence**, already the governing schema rule. Bodies
   are typed by which fields they lack. This adds no special case.
2. It mirrors the consultancy demotion — real, labelled, but not a positioned
   object competing for attention.
3. It **derives the camera hierarchy from the data.** The addendum deferred a
   known tension ("uniform depth risks reading as a table in 3D; variation must
   come from the camera") to the M2 gate. Under two body classes the rails dwell
   where there is something to read, so emphasis stops being an authored
   judgment that can rot and becomes a computed one. One less hand-tuned thing.
4. Entry eleven still needs no curation decision: it has a decision or it does
   not.

**What the claim becomes:** not "ten projects, uniformly deep" but *a full career,
with the arguable moments actually argued.* Breadth comes from the inventory;
depth comes from the entries that earned it.

**Consequence for build order:** the M2 gate ("can a stranger tell what he does?")
now rests on 2–3 narratives rather than 10. This substantially reduces the
content work blocking M2 — the largest completion risk identified at ignition —
and converts the remaining seven entries into structured-field work that requires
no recall of forgotten arguments.

**Alternatives rejected:**

- *Ship only the strong ones (3 projects, ~2 clients).* Zero padding risk and the
  fastest route to M2, but ~5 bodies is too sparse for the force-directed layout
  to be meaningful, and it deletes career breadth — the consultant's actual
  selling point. The dust model was itself partly justified as filling space
  around eighteen bodies.
- *Excavate all ten before deciding.* Defensible — the addendum proves decisions
  do not surface from raw recall, so the true count might exceed three. Rejected
  as sequencing, not as an activity: it is real work before any code, and it may
  still return three. Under two body classes it becomes optional and incremental
  — any entry later excavated simply gains a `notable` and promotes itself
  without schema change or layout rework.
<!-- /drift-flag-01 -->

<!-- drift-flag-02 -->
## Drift Flag 02 — Authored Rails vs. Derived Dwell

**Status:** RESOLVED — the proposed resolution was ratified when the author
confirmed the enlarged M2 scope ("yes — all of it"), which includes derived dwell.

**Surfaced by:** the two-body-class resolution (Drift Flag 01). If only some
projects carry a `notable` narrative, the camera has a data signal telling it
where substance lives.

**The tension:** the addendum locked **entity-targeted authored rails**, chosen
over three alternatives (seed lock, emergent composition, bounded solver),
explicitly as rot defence — and argued that a force solver "has no judgment,"
so a badly composed hero shot "reads as having no eye." Deriving camera
behaviour from data is closer to the emergent composition that was rejected.

**Proposed resolution — they compose rather than compete.** Split the two things
the camera decides:

- **Framing stays authored.** What a shot frames, from what angle, at what
  distance — entity-relative, exactly as the addendum specifies. The eye is
  preserved; composition is never left to the solver.
- **Dwell duration derives from the data.** How long the journey rests on a body
  follows from whether it carries a `notable`. Substance sets pacing.

**Why this is an improvement rather than a dilution:** the addendum flagged a
known tension it could not resolve — uniform depth "risks reading as a table in
3D," so "variation must come from the camera," making hierarchy an authored
judgment that must be re-tuned as the inventory grows. Derived dwell removes
that hand-tuned number while keeping authored composition. One less thing to rot.

**In M2 scope.** Numerically unspecified — how much longer the camera holds, whether
the transition reads as deliberate or as stalling, and what happens on a run of
three consecutive shallow entries all need tuning at M1, where it is cheapest.
The residual background-drift risk the addendum logs is separate and still open.
<!-- /drift-flag-02 -->

<!-- drift-flag-03 -->
## Drift Flag 03 — Launch Milestone vs. Stated Non-Negotiables

**Status:** RESOLVED — reconciled by the author during Stage 2.

**Surfaced by:** asking for the smallest version the author would actually link
from his CV. Answer: **M2 — greybox with the information layer.** No textures,
no realism pass, no collapse ending, no contact surface.

**The conflict:** the brief lists **realism of materials and lighting, immersion,
visitor awe, and runtime framerate** as *not tradeable*. M2 delivers none of the
first three.

**The reconciliation — the non-negotiables were never launch gates.** They are
quality gates for the finished artifact, and had been functioning as
preconditions to existing at all. The build order already encoded the correct
priority: the M2 gate is *"can a stranger tell what he does?"* — legibility
placed deliberately **before** the realism pass. The non-negotiables list was
simply never reconciled with the build order. Realism, immersion, and awe are
required for the claim to fully land (they convert *"this person can think"*
into *"this person can build"*); they are not required for the site to be worth
linking.

**Why this matters more than any other decision in this document:** the
difference between shipping at M2 and shipping at M5 is the difference between a
project with a finish line and a project that ends when its author loses
interest. M5 has no forcing function. M2 does — it is the first point at which
the thing is true.

**The cost, stated plainly.** The addendum warns that under a work-sample framing
the site *is* the claim, and work samples are graded on execution. A greybox
invites that judgment in a different register: not "34fps" but "unfinished."
Engineering leads hold strong views about people who ship half-built things.

**Resolution — the deliberate schematic.** A greybox reads as unfinished only
when it is pretending to be finished. M2 ships as an **intentional visual
language** — monochrome, blueprint, schematic, structure as the aesthetic — so
it reads as a designed thing in a different register rather than a failed attempt
at the intended one. Technical drawing is a legitimate idiom with its own rigor,
and it signals structure over decoration to precisely this audience.

**Consequences:**

1. **Visual identity moves from open question to M2 blocker.** It cannot stay
   deferred; M2 now requires a deliberate design decision rather than a default
   material.
2. **M3 stops being a launch gate and becomes an upgrade to a live site.** The
   realism pass improves something real, with a link already in the CV. This
   inverts the completion dynamic: progress after launch is enhancement, not the
   receding prerequisite it is today.
3. **The contact mechanism stops blocking launch.** It blocks M4, and M4 is now
   post-launch. M2 needs only a conventional, unglamorous contact route.

**Alternatives rejected:**

- *Honest beta framing* (ship the default greybox with a visible "work in
  progress" note). Cheapest, but invites exactly the judgment the addendum warns
  about; a disclaimer does not neutralise a first impression.
- *M2 internal, M3 public* (private gate with 2–3 trusted readers, launch at M3).
  Protects the first impression and keeps the non-negotiables intact, but
  restores the receding finish line and with it the abandonment risk that is the
  primary concern of this entire PRFAQ.
<!-- /drift-flag-03 -->


<!-- drift-flag-04 -->
## Drift Flag 04 — Funnel Positioning vs. Tradeable Load Time

**Status:** OPEN — surfaced by the Stage 3 positioning decision; needs the
author's ratification.

**Surfaced by:** Q10. The author resolved the site's job as **top of funnel** —
it does not change a hiring decision; it changes whether the conversation happens
and whether the link gets forwarded.

**The conflict:**

- *The brief locked:* load time is **explicitly tradeable**, alongside breadth of
  content and build time. The stated rationale: the visitor "is already curious
  rather than triaging eleven tabs," having arrived pre-qualified from LinkedIn
  or the CV.
- *Funnel positioning requires:* the first paint to be fast, because under a
  funnel model the opening seconds are not the packaging — they are the product.
  A visitor lost during a slow load never reaches the schematic, never reads an
  entry, and above all never forwards the link. A link that loads slowly does not
  get shared, and sharing is the mechanism the entire positioning rests on.

**Why the original rationale weakened.** "Pre-qualified therefore patient" holds
for a reader who has already decided to invest attention. It does not hold for
the forward — the second-order visitor who receives the link from a colleague
with no context, no prior interest in the author, and no reason to wait. That
visitor is the one the funnel positioning depends on, and they are the least
patient reader the site will ever have.

**Additional pressure from the M2 decision.** The schematic version has no
photographic textures, which were the largest expected payload. The thing that
made load time expensive is precisely the thing M2 does not ship. First paint at
M2 should be cheap — which makes accepting a slow one harder to justify.

**Proposed resolution — split the budget.** Load time stays tradeable for the
*full experience*; **first meaningful paint becomes a launch requirement.** The
opening frame — enough of the star field to read as designed and deliberate —
must arrive fast. Everything behind it may stream in.

**Implication if accepted:** first-paint budget becomes an M2 gate criterion
alongside "can a stranger tell what he does?" Needs a number, and that number
needs ratifying — as does the framerate target, which remains unratified from the
brief.

**Related, from the same positioning decision:** shareability becomes a property
to design for rather than an outcome to observe. Link preview image, the opening
frame's composition, and what a screenshot of this looks like pasted into a Slack
channel are all now in scope for M2, and none appear in the brief.
<!-- /drift-flag-04 -->
---

# The Press Release

_Describes **M2 as shipped**: computed layout, authored rails, information layer,
deliberate schematic visual language. No realism pass, no collapse ending — both
are post-launch upgrades to a live site._

# Look Closer and the Detail Assembles

## A ten-year consulting career you can fly through — where the camera slows down only for the work that was actually argued about.

**Grenoble, [Launch Date]** — Thomas Navarro has published a portfolio that
answers the question a CV structurally cannot: not *where* he worked, but *what
he decided*. Visitors arriving from his LinkedIn profile land inside a cosmos.
Each client is a star. Each project delivered for them is a planet in orbit.
Every technology exists as a faint haze of interstellar dust filling the space
between — until you focus on a single project, and the dust condenses into bodies
orbiting that work alone. Look away and it disperses. Scrolling runs time
backward, from this year's work into the past.

For a senior engineer, the two-page CV is a machine for deleting the interesting
part. It keeps the employer, the title, and the dates — the facts a keyword
filter can match. It discards the problem, what made it hard, and what you chose
to do about it. For consultants the deletion cuts deeper: the employer column
lists the agencies that held the contract and processed the invoices, saying
nothing about the environments where the work actually happened. Two engineers
with identical CVs can be entirely different hires, and the document is built so
you cannot tell which is which.

This site does not answer that by writing more. It answers it by being honest
about where depth exists. Every engagement is present — client, role, team size,
duration, and the stack that condenses around it. A few carry something further:
a hundred and fifty words on a problem, the specific constraint of the
environment it lived in, and the decision that followed, including what was
argued against. Most professional work is competent delivery where no alternative
was ever seriously contested, and those projects are shown as exactly that. The
ones where something was genuinely at stake are the ones the journey slows down
for.

Nothing in the layout was placed by hand. A single data file describes the
clients, the projects, and the technologies; a physics simulation decides where
everything sits, deriving mass from how long an engagement ran, brightness from
how recent it is, and distance from how much it matters. Adding a project in five
years costs one entry and one number — no repositioning, no re-framing, no layout
work. The universe absorbs new work by construction.

> "I kept writing CVs that were accurate and told you nothing. Every real
> decision I have made — the thing I argued for, the thing I argued against, the
> constraint that made it a hard call — came out in the compression. So I built
> the document I actually wanted to hand someone. It has one job: if you read two
> projects, you should know how I think. Everything else on screen is in service
> of getting you to slow down long enough to read two projects."
> — Thomas Navarro

### How It Works

You arrive from a link — usually LinkedIn, sometimes the CV itself. You already
know the job titles and the dates; that is not why you clicked. You clicked
because something suggested this person built a universe.

The first thing you see is a star field rendered as a technical drawing:
monochrome, precise, deliberately schematic rather than photographic. It reads
as a blueprint of a career, and the drafting is the point — this is a diagram
someone designed, not decoration someone downloaded.

You scroll, and the camera moves. It does not jump; it flies, on a route composed
shot by shot. Time runs backward — the most recent work first, which is the order
a professional reader wants anyway. You pass a star, and planets resolve around
it. The star is a client. The planets are what was delivered there.

When the camera settles on a project, the dust between the bodies gathers and
condenses into a ring of orbiting objects: the technologies that project ran on.
They are not a list in a sidebar. They arrive and they leave. Move on, and they
disperse back into the medium they came from. Because a technology is never
permanently anywhere, the same one can serve nine different projects without
appearing nine times.

Alongside it, the record: role, what was built, how many people were on it. On
some projects that is where it ends, and the journey moves on. On others the
camera stays, and there is a paragraph — a problem, the constraint that made it
awkward, and what was decided, with the rejected option named. Those are the
entries the site exists for. You find them by noticing where the journey lingers.

Free flight is available whenever you want to leave the route and look around.

> "I have read a hundred portfolios and they all show me a grid of logos. This one
> made me stop on the Oracle migration for a full minute — not because of the
> graphics, because he told me what he argued against and why. I know more about
> how he works from one paragraph than from an hour of interviews."
> — a reader Thomas hopes exists

### How to Visit

The site is at [domain], linked from Thomas's LinkedIn profile and from the
footer of his CV. There is nothing to install, no account, and nothing to accept.
It runs in a desktop browser; a flat star chart serves machines and phones that
cannot run the 3D scene, carrying the same content in a simpler form.

The whole thing is a single page with no backend and no CMS. The career lives in
one data file inside it. To reach Thomas, the contact route is where you would
expect it — for now.

<!-- coaching-notes-stage-2 -->
## Coaching Notes — Stage 2: The Press Release

**What the drafting process itself exposed.** Draft 1 could not be completed
honestly. Every concrete sentence available described the vessel — stars, orbits,
dust, collapse — and the paragraph that should have described the reader's
takeaway had one drafted project behind it. The press release format did its job:
it made the content gap structural rather than a to-do item, which produced
Drift Flag 01.

**Rejected headline framings:**

- *"The Career That Runs Backwards"* — leads with the mechanic. Backward time is
  a genuinely elegant decision serving three purposes at once, but a reader
  learns nothing about why they would look. Fails "so what?"
- *"...where the layout was never drawn by hand, only computed"* (subheadline) —
  an engineering boast aimed at engineers. Fails the mom test, and worse, it
  describes **how it was made**. No visitor experiences "this was computed"; they
  experience "this looks right." This was the ignition-stage trap (difficulty is
  invisible in the finished artifact) reappearing in the subheadline.
- The chosen headline, *"Look Closer and the Detail Assembles"*, describes the
  reader's action and its reward, and doubles as a literal description of the
  condensation mechanic and of the site's whole thesis: it rewards attention.

**Positioning that survived challenge.** The paragraph beginning *"Most
professional work is competent delivery where no alternative was ever seriously
contested"* is the strongest credibility move in the document, and it exists only
because of Drift Flag 01. Almost no portfolio prints that sentence. Printing it
demonstrates the discriminating judgment the site claims — the author can tell
the difference between work that mattered and work that merely happened, and says
so at his own apparent expense. Selectivity is converted from a shortfall into an
editorial position.

**Differentiator explored and deliberately not used.** The brief's own framing —
*"there is no moat and none is claimed; the advantage is that the thing is
difficult to build well"* — was tested as press-release material and cut. Build
difficulty cannot appear in a press release without becoming a boast, and the
reader never perceives it. It survives implicitly: the reader infers capability
from an artifact that works, not from being told it was hard.

**Deliberate omissions from the release.** No realism, immersion, or awe claims —
M2 does not deliver them, and the release must describe what ships. The collapse
ending and black-hole contact surface are absent for the same reason; they are
the emotional climax of the finished design, and their absence is the most
visible cost of launching at M2. The closing "for now" on the contact route is a
deliberate, small acknowledgment rather than a concealment.

**Contact mechanism — no longer a launch blocker.** Previously listed as an open
question blocking M4. Under the M2 launch decision, M4 is post-launch, so M2
needs only a conventional contact route. The unresolved design question (a form
needs a backend; a mailto weakens the ending) now applies only to the collapse
ending it will eventually live inside.

**Out-of-scope context surfaced this stage:**

- **Visual identity is promoted from open question to M2 blocker.** The
  deliberate-schematic decision means M2 requires a real design pass — palette,
  typography, line weight, UI chrome — before launch. This is new work not in the
  original M2 scope and should be reflected in the build order.
- **The reader quote is unattributed by design.** It is written as an aspiration
  ("a reader Thomas hopes exists") rather than fabricated as a testimonial, since
  no user exists yet. It states the target reaction in the reader's own voice
  without inventing a person.
- The quote deliberately cites the Oracle/MDM migration — the one entry drafted to
  publishable depth — to keep even the aspirational quote anchored to real
  material.
<!-- /coaching-notes-stage-2 -->

---

# Customer FAQ

_The visitor: an engineering lead, ten years in, who hires people. Arrived from
LinkedIn or the CV. Fourteen tabs open. Has seen a lot of portfolios._

### Q: Why is this a wireframe? Did you not finish it?

A: It is finished for what it is. The site ships as a technical drawing —
monochrome, precise, schematic — because that is a deliberate visual language,
not an unpainted version of a different one. A career is structure: relations,
durations, and decisions. A blueprint is the honest way to draw structure.

Photographic realism is coming as a later pass, and when it lands it will be an
upgrade to a site that already works rather than the thing that finally made it
launchable. That ordering is deliberate: meaning first, surface second. If the
schematic version cannot tell you what this person does, no amount of texture
would have fixed it.

### Q: I clicked from LinkedIn. I have fifteen seconds. What do I get?

A: A career rendered as a system you can see the shape of — and the immediate
understanding that this was built, not filled in. Within fifteen seconds you
should register three things: this is a real person's work history, it is
organised by something rather than listed, and someone made deliberate choices
about how it looks.

That is the whole job of the opening. This site is built to earn a second visit
and a forward, not to complete an argument in one scroll. If you leave after
fifteen seconds having thought "that was unusual," it worked.

### Q: You said most of your work was competent delivery where nothing was seriously contested. So why show ten projects instead of the two that mattered?

A: Because they answer different questions, and you are asking both.

The ten establish that the career is real, varied, and long — which clients, what
scale of system, what kind of environment, what size of team. That is breadth,
and it is verifiable and unglamorous.

The two or three that carry a written decision establish how I think when
something is actually at stake. That is depth, and it is the part a CV deletes.

Showing only the deep ones would leave you unable to tell whether I have worked
in your kind of environment. Showing all ten at equal depth would mean padding
seven of them with prose that describes responsibility rather than choice — and
you would spot that immediately, because every candidate writes those sentences.
The shallow entries are shallow on purpose, and they are labelled by being
shallow.

### Q: I have to scroll through space to read a CV now? I can read a PDF in ninety seconds.

A: Then read the PDF — it exists, it is linked, and for the facts it is genuinely
faster. This is not a replacement for it.

What the PDF cannot show you is relation. Which technologies recur across which
clients over a decade, which engagements were long and which were brief, what
sits at the centre of the work and what sits at the edge. On paper that is a
table you would not read. Here it is the shape of the thing, and you take it in
without parsing anything.

If you want facts in ninety seconds, the CV wins and I will not pretend
otherwise. If you want to know what kind of engineer this is, the CV was never
going to tell you.

### Q: How do I find the entries worth reading without doing the whole tour?

A: The journey slows down where there is something to read. Dwell time is derived
from the content — projects carrying a written decision hold the camera; projects
that do not are passed through. You do not have to know which is which in
advance; the pacing tells you, and the pacing cannot drift out of sync with the
content because it is computed from it.

Free flight is available at any point if you would rather navigate yourself, and
the flat fallback view lists everything directly.

**⚠ Confidence: LOW — this answer depends on an unresolved decision.** See Drift
Flag 02. If camera dwell is authored rather than derived, this answer is not true
and there is no way for a visitor to distinguish a deep entry from a shallow one
before entering it — which makes the selectivity in the previous answer invisible
and turns the two-body-class model into an unmarked lottery. **Launch blocker.**

### Q: This is all your account of your own decisions, with no outcomes and no references. Why should I believe it?

A: You should not take the decisions on faith. You should check the constraints.

Every narrative entry names a specific condition of the environment it happened
in — on-premise hardware with no container runtime, an incumbent product whose
real behaviour had to be recovered from the running system because the
documentation was years stale, a mostly junior team on a business-critical
referential. Those details are not flattering and they are not generic. They are
the kind of thing you only write if you were there, and the kind of thing your
own experience lets you sanity-check in about four seconds.

There are deliberately no outcome metrics. They were never captured, or not
retained, and as a consultant I frequently left before any outcome was visible.
Rather than write "improved maintainability" — a sentence you have learned to
discount because everyone writes it — the entries stop at the decision and let
the constraint carry the credibility. Anyone can claim a performance improvement.
Nobody invents "no container runtime on prem."

### Q: Backward time is a nice idea, but if I want to know what you were doing in 2019, how do I get there?

A: Scroll to it, or use free flight, or read the CV — which is linked, and which
is the correct tool for a date lookup.

The honest answer is that this site is built for readers who already have the
dates. You arrived from LinkedIn or from the CV itself, so the chronology is
upstream of the click and you are not here hunting for it. Backward time is
ordered the way a professional reader actually wants — most recent first — and it
gives the journey somewhere to end.

If you genuinely need to navigate by year, the flat view is the better surface
and it is one click away.

### Q: I am on a corporate laptop with integrated graphics and locked-down drivers. What happens when I open this?

A: Either the 3D scene runs, or you are served a flat star chart carrying the
same content in a simpler form. Capability is detected rather than assumed, and
the fallback is a designed view rather than an apology — it holds every project,
every field, and every narrative entry.

The 3D path targets a locked framerate at 1080p on roughly three-year-old
integrated graphics — deliberately the corporate work-laptop profile rather than
a developer machine, because that is what you are reading this on. Where the
machine cannot hold it, frames drop before quality does.

**⚠ Confidence: MEDIUM — the specific framerate target is proposed but not yet
ratified by the author.** Until it is, the M3 gate has no testable threshold.
Note that under the M2 launch decision this is a post-launch concern: the
schematic version is far cheaper to render than the textured one.

### Q: You are a backend consultant. Why does a WebGL site tell me anything about whether you can lead a migration for me?

A: Because the interesting engineering here is not the graphics.

The layout is not drawn. One data file describes the career, and a simulation
derives every position from it — mass from duration, brightness from recency,
distance from relevance. There are no manual position overrides anywhere, and
that is a deliberate constraint rather than a missing feature: overrides would
rot the moment the data changed. Entities are typed by which fields they lack
rather than by explicit type flags, so the schema does not accumulate special
cases as the career grows. Camera shots reference entities rather than
coordinates, so adding an entry in five years cannot silently leave a shot
framing empty space.

Those are the same instincts I bring to a Spring Boot migration: design for the
change you know is coming, refuse the shortcut that will rot, and make the
maintenance cost of the tenth addition equal to the cost of the second. The
domain is different. The judgment is not, and the judgment is what you are
actually hiring.

**⚠ Note: this answer requires the reasoning to be VISIBLE.** An engineering lead
cannot admire a data model they cannot see. As currently designed, all of the
above lives in internal planning documents that no visitor reads. See Stage 3
coaching notes — this promotes a visible technical colophon from "nice to have"
to "required for the primary claim to land."

### Q: If I am hiring, I will read your CV, check LinkedIn, and talk to you for an hour. Where does this site actually change my decision?

A: It probably does not change the decision. It changes whether the conversation
happens.

The honest positioning: this is a top-of-funnel instrument. Its job is to make a
CV memorable among forty others, and to give someone who already liked it
something to forward to a colleague with "look at this." By the time you and I
are talking for an hour, the site has already done its work and the conversation
should be about your actual problem.

The secondary effect is that if you do read two entries first, that hour starts
somewhere better than "so, tell me about yourself." You would arrive already
knowing what I argue for and what I argue against.

And yes — I wanted to build it. Those two things are not in conflict, but I am
not going to claim the professional case came first.

<!-- coaching-notes-stage-3 -->
## Coaching Notes — Stage 3: Customer FAQ

**Positioning resolved (Q10) — top of funnel.** The site does not change a hiring
decision; it changes whether the conversation happens and whether the link gets
forwarded. This is a narrower and more defensible claim than the brief's implied
one ("a technical reader forms a judgment about capability and taste"), and it
reorders several priorities. See Drift Flag 04.

**Transfer argument resolved (Q9) — it proves how I work.** The evidence of
backend judgment is the architecture: schema by field absence, no position
overrides as deliberate rot defence, one-knob maintenance, entity-relative camera
shots. Domain differs; judgment transfers. **This answer creates a new
requirement** — the reasoning must be visible to the visitor. It currently exists
only in planning documents. A technical colophon (or equivalent visible surface)
moves from optional to required, because the primary transfer claim depends on it.

**Gaps revealed, with dispositions:**

| Gap | Disposition |
|---|---|
| Camera dwell derivation unresolved (Q5) | **Launch blocker.** Without it, selectivity is invisible and the two-body-class model becomes an unmarked lottery for the reader. |
| Architecture reasoning not visible to visitors (Q9) | **Launch blocker.** The primary transfer claim depends on it. Cheapest form: a static colophon; no 3D work required. |
| First-paint speed under a funnel model (Q2) | **Launch blocker.** Contradicts the brief's "load time is tradeable." See Drift Flag 04. |
| Framerate target not ratified (Q8) | **Accepted for now.** Post-launch under the M2 decision; the schematic renders far cheaper than the textured version. Must be resolved before M3. |
| Shallow entries risk reading as a LinkedIn export in 3D (Q3) | **Accepted trade-off, verify at M2 gate.** The answer holds only if shallow entries carry genuinely useful breadth — client, scale, environment, team size — rather than name-plus-stack. |
| Date navigation is weak (Q7) | **Accepted.** Deliberate: chronology is upstream of the click. The flat view and the CV both serve it. |

**Answers that held up without modification.** Q6 (credibility without metrics) is
the strongest answer in the set and required no work — the constraint-as-
falsifiability-substitute argument from the addendum survives adversarial framing
intact. Q4 (why not a PDF) holds because it concedes the PDF's advantage rather
than disputing it; the concession is what makes the rest believable.

**Competitive intelligence — deliberately not researched.** No competitive claim
appears in the customer FAQ. Q4 compares the site to the reader's existing
alternative (a PDF CV), not to other portfolios, so no external landscape data is
required for these answers to hold. Web research was considered and judged
unnecessary at this stage rather than skipped by omission. If Stage 4 or 5
produces a claim about what technical readers do with such sites, or about the
WebGL-portfolio landscape, that claim gets researched before it ships.

**Scope signals for the distillate:**

- Two new launch blockers created this stage (visible colophon, first-paint
  budget), one confirmed (dwell derivation). None existed in the brief.
- The M2 gate question should arguably be sharpened from "can a stranger tell what
  he does?" to "can a stranger tell what he does, and can he tell which entries
  are worth reading?" The second half is now load-bearing.
- Under the funnel framing, **shareability becomes a success signal worth
  designing for** — the brief already names being forwarded as the signal to watch
  for, but treats it as an outcome to observe rather than a property to build for
  (link preview, opening frame, what a screenshot of this looks like in a Slack
  channel).
<!-- /coaching-notes-stage-3 -->

---

# Internal FAQ

**Not run — declined by the author.** Rationale: this is a personal,
self-funded project with no budget, headcount, revenue, or ROI case, so the
economic half of a standard internal FAQ does not apply.

Noted for the record: the non-economic half of Stage 4 — sustained personal
capacity, scope stability, and the Blender dependency at M4 — does apply under
the completion-risk focus chosen at ignition. That material is carried into
The Verdict as direct assessment rather than as a question-and-answer round.
The one input the verdict required (whether the enlarged M2 is still the version
the author would ship) was taken directly: **yes, all of it.**

---

# The Verdict

## Concept Strength

**Forged, with a live fault line that is scheduling rather than thinking.**

The concept entered this process stronger than most and left it materially
changed — not because the idea was wrong, but because two facts that had been
sitting outside the design got pulled inside it: only 2–3 of ~10 projects carry a
publishable decision, and the author would ship at M2, before any of the stated
non-negotiables are delivered. Both were known before today. Neither had been
allowed to reshape the plan. Both now have.

What survives is a sharper and smaller proposition than the brief described: not
"a career rendered as a universe, uniformly deep," but *a career whose arguable
moments are actually argued, shipped as a technical drawing, whose job is to get
the conversation started rather than to win it.* Every one of those qualifications
was earned by something failing under pressure in this session.

The remaining risk is almost entirely execution capacity, and it is not addressed
by this document.

---

## Forged in Steel

**The credibility argument.** Constraint-as-falsifiability-substitute is the
strongest reasoning in the entire concept, and it survived adversarial framing
without a word changed. *"Anyone can claim a performance improvement. Nobody
invents 'no container runtime on prem.'"* It solves a real problem — no retained
outcome metrics — without special pleading, and it turns a documentation gap into
an editorial principle that happens to be more persuasive than the metrics would
have been.

**Selectivity as an editorial position.** *"Most professional work is competent
delivery where no alternative was ever seriously contested, and those projects are
shown as exactly that."* Almost no portfolio prints that sentence. Printing it
demonstrates the discriminating judgment the site claims, at apparent cost to the
author, to a reader whose skepticism is specifically calibrated against people who
claim everything mattered. This began the session as a content shortfall and ended
it as the most credible paragraph in the press release.

**The maintenance architecture.** No position overrides, classification by field
absence, entity-relative camera framing, one-knob weighting. These hold up as
engineering reasoning independent of the visual concept, and under the resolved
Q9 answer they are the actual evidence of professional judgment the site offers.
They were designed against a real, self-identified failure mode (the author's own
maintenance laziness) rather than against a hypothetical.

**The M2 launch decision.** Reframing realism, immersion, and awe as quality gates
for the finished artifact rather than preconditions to existing is the single
highest-value outcome of this session. It converts a project whose finish line
receded indefinitely into one with a definite first arrival, and it turns M3–M5
from prerequisites into upgrades to something live.

**Honest positioning.** Top-of-funnel is a narrower claim than the brief implied,
and narrower is better: it is defensible, it is testable (does the link get
forwarded?), and the author stated plainly that he wanted to build the thing
without retrofitting a business case. That candour is consistent with the site's
own editorial stance, which matters — a portfolio arguing for honest constraint
reporting cannot itself be built on an inflated rationale.

---

## Needs More Heat

**The seven shallow entries are undesigned.** The two-body-class model resolves
the schema question but not the experience question. A shallow entry currently
means "client, role, team size, duration, stack." Whether that reads as useful
breadth or as a LinkedIn export in 3D depends entirely on execution that has not
been specified. This is the most likely way the M2 gate fails, and it is cheap to
de-risk: draft two shallow entries in full, in text, and read them cold.

**The schematic visual language is a decision, not yet a design.** "Monochrome,
precise, blueprint" is a direction. Palette, line weight, typography, label
treatment, and UI chrome are unresolved, and they now gate launch. Note the
uncomfortable inversion this creates: the visual identity was an open question
this morning and is a launch blocker tonight, while the author's stated strength
is systems reasoning rather than visual design. This is the M2 task with the
widest confidence interval.

**Dwell derivation is decided but unspecified.** In scope as of this session, and
the Q5 answer now depends on it. But "camera dwells longer where `notable` is
populated" needs actual numbers — how much longer, whether the transition reads as
deliberate or as stalling, and what happens on a run of three consecutive shallow
entries. Verify at M1 with the greybox, where it is cheapest to tune.

**The colophon has no form yet.** Required for the Q9 transfer claim, but whether
it is a footer link, a dedicated view, an in-world surface, or annotations on the
scene itself is undecided. Cheapest defensible version is static HTML outside the
3D scene. It should show the data file and the rules, because the argument is
"look at the model," not "here is a description of the model."

**First-paint budget has no number.** Accepted in principle as a launch
requirement (Drift Flag 04), unquantified in practice. It joins the framerate
target, still unratified from the brief, in the category of gates that cannot be
tested because no threshold exists.

---

## Cracks in the Foundation

**Capacity is the whole risk, and this document does not address it.**

M2 grew during this session — visual identity, colophon, dwell derivation,
first-paint budget, all added in roughly an hour — and the author confirmed he
still intends to ship all of it. That confirmation is a scope judgment, not a
schedule. No estimate exists, no deadline exists, no external forcing function
exists, and the work now sitting in front of M2 includes a visual design pass in
the one discipline the author has explicitly identified as below his own quality
bar. Stage 4 was declined on economic grounds, which is legitimate — but the
non-economic half of that stage was where this would have been interrogated, and
it went uninterrogated.

*What it would take:* a date, or a first reader. Either an external commitment
("this is linked from my CV by X") or a named person who has agreed to look at it
and give the M2 verdict. One is a deadline, the other is an obligation; both are
forcing functions, and this project currently has neither.

**Scope grew under pressure in a single session.** Four drift flags in one sitting
— three resolved by expanding M2. Each addition was individually justified and
closed a hole the FAQ opened. Collectively they represent roughly a doubling of
launch scope in an hour of conversation, with no mechanism proposed to prevent the
next session doing the same. The brief's own defence against rot was
architectural; there is no equivalent defence against scope.

*What it would take:* freeze M2 as now defined and route every subsequent addition
to M3 by default. The bar for adding to M2 should be "the site is actively
misleading without it," not "this makes it better."

**The Blender dependency at M4 is unresolved and structurally awkward.** The
technical approach was explicitly chosen to route around a 3D modelling skill the
author places below his quality bar — and the two pre-rendered bookends require
precisely that skill. Deferred rather than solved. Under the M2 launch decision
this is post-launch and therefore no longer urgent, but it is the milestone most
likely to stall, and the collapse ending is the emotional climax of the entire
concept. A site that launches at M2 and never reaches M4 is missing its ending
permanently.

*What it would take:* decide now whether the collapse is bought (asset packs,
commissioned, procedural in-engine rather than modelled) or dropped. The one
option that should be rejected is leaving it as an open dependency on a skill the
whole approach was designed to avoid needing.

**The reader quote in the press release is aspirational.** Labelled honestly as
such rather than fabricated, but it remains the least-evidenced claim in the
document: it asserts a reaction no one has had, to a site that does not exist.
Its underlying assumption — that a technical reader will stop and read a full
paragraph — is the core bet of the entire concept and has never been tested
against a real person.

*What it would take:* the same fix as the capacity crack. One real reader, at M2,
answering the gate question cold. That single test validates or kills the central
assumption for the cost of one conversation.

---

## Bottom Line

The thinking is sound and, in places, unusually good. The concept is more honest
and more shippable than it was this morning, and the changes that got it there
were reframings rather than retreats — selectivity became an editorial position,
the greybox became a visual language, the launch moved from M5 to M2.

The one thing standing between this and a live URL is not a design question. It is
whether anyone but the author ever expects to see it. Fix that — a date, or a
first reader — and the rest of this document is a build plan.
