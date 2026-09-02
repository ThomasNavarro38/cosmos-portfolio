---
title: "Input Reconciliation — Full PRFAQ vs. PRD"
input: "_bmad-output/planning-artifacts/prfaq-cosmos-portfolio.md"
compared_against: "_bmad-output/planning-artifacts/prfaq-cosmos-portfolio-distillate.md"
target: "prd.md + addendum.md (prd-cosmos-portfolio-2026-09-01)"
created: 2026-09-01
---

# Input Reconciliation: Full PRFAQ (917 lines) → PRD

## Method and headline finding

The PRD was drafted from `prfaq-cosmos-portfolio-distillate.md`. That distillate is
**unusually faithful on decisions and unusually lossy on language**. Every drift flag,
every rejected alternative, every threshold, and every verdict crack survives into the
distillate essentially intact, and the PRD carries them well.

What the distillate compressed away is almost entirely **one category**: the
**press release as written text** and the **Customer FAQ as written answers**. The
distillate preserves the *conclusions* of Stages 2 and 3 (headline choice, positioning,
gap dispositions) but discards the **prose that carried the product's voice, its
emotional register, and the visitor's felt experience**. The distillate mentions the
chosen headline in a "rejected framings" list; it never quotes the press release body,
the author quote, the reader quote, the "How It Works" walkthrough, or a single
Customer FAQ answer in full.

The consequence for the PRD is specific and consistent: the PRD is an excellent
**specification of mechanisms** and a thin **specification of experience**. It knows
Dwell derives from data; it does not know that the PRFAQ said the visitor *"finds them
by noticing where the journey lingers."* It knows the Fallback must not be an error
page; it does not know the PRFAQ's phrasing that it is *"a designed view rather than an
apology."* The addendum even flags this itself — *"Copy tone and voice remain open"* and
*"The information layer has no specified form at all"* — without knowing that the full
PRFAQ contains roughly 1,500 words of exactly that material, already written, already
pressure-tested.

Severity legend: **CRITICAL** (PRD would be wrong or would mislead downstream) ·
**HIGH** (materially incomplete; downstream will re-derive or invent) ·
**MEDIUM** (worth carrying; improves fidelity) · **LOW** (nice to have).

---

# Part 1 — Lost In Distillation

## L-1. The entire press release body is absent from the distillate — HIGH

**What was lost:** The distillate quotes only the headline and two rejected headlines.
The ~900-word press release itself — subheadline, lede, problem paragraph, the honesty
paragraph, the architecture paragraph, "How It Works," "How to Visit" — appears nowhere.
The PRD therefore never saw the canonical statement of what this product *is* in the
voice it intends to speak.

**Exact quote (subheadline, PRFAQ line 341):**

> "A ten-year consulting career you can fly through — where the camera slows down only
> for the work that was actually argued about."

**Exact quote (lede, lines 344–350):**

> "Thomas Navarro has published a portfolio that answers the question a CV structurally
> cannot: not *where* he worked, but *what he decided*. Visitors arriving from his
> LinkedIn profile land inside a cosmos. Each client is a star. Each project delivered
> for them is a planet in orbit. Every technology exists as a faint haze of interstellar
> dust filling the space between — until you focus on a single project, and the dust
> condenses into bodies orbiting that work alone. Look away and it disperses. Scrolling
> runs time backward, from this year's work into the past."

**Exact quote (the problem paragraph, lines 352–359):**

> "For a senior engineer, the two-page CV is a machine for deleting the interesting part.
> It keeps the employer, the title, and the dates — the facts a keyword filter can match.
> It discards the problem, what made it hard, and what you chose to do about it. For
> consultants the deletion cuts deeper: the employer column lists the agencies that held
> the contract and processed the invoices, saying nothing about the environments where
> the work actually happened. Two engineers with identical CVs can be entirely different
> hires, and the document is built so you cannot tell which is which."

**Does it matter, and where would it go:** Yes — **HIGH**. Two distinct uses.

1. **§1 Vision.** The PRD's Vision (lines 20–26) is accurate but written in PRD register.
   The press release lede is the same content in the register the product itself must
   speak. The phrases *"a machine for deleting the interesting part"* and *"the agencies
   that held the contract and processed the invoices"* are the sharpest articulation of
   the problem anywhere in the chain and are strictly better than the PRD's *"the part a
   two-page CV compresses out by design"* (§2.1).
2. **A new "Voice and Register" subsection**, either in PRD §6 Constraints and Guardrails
   or in the addendum's *Visual System — Notes for `bmad-ux`*. The addendum explicitly
   says *"Copy tone and voice remain open from the brainstorm"* (line 57) — that is
   false. The voice is fully established by this press release; it simply never reached
   the PRD. This is the single highest-leverage correction in this review.

---

## L-2. The author quote — the product's thesis in one paragraph — CRITICAL

**What was lost:** The distillate does not contain the author quote at all. It is the
most compact statement of intent in the entire planning chain, and it contains an
explicit prioritisation rule that appears nowhere in the PRD.

**Exact quote (lines 378–384):**

> "I kept writing CVs that were accurate and told you nothing. Every real decision I have
> made — the thing I argued for, the thing I argued against, the constraint that made it
> a hard call — came out in the compression. So I built the document I actually wanted to
> hand someone. It has one job: **if you read two projects, you should know how I think.
> Everything else on screen is in service of getting you to slow down long enough to read
> two projects.**"
> — Thomas Navarro

**Does it matter, and where would it go:** Yes — **CRITICAL**, and it is the most
important single item in this review.

The final sentence is a **hierarchy rule for the entire product**: every visual, motion,
and interaction decision is subordinate to getting the visitor to read two `notable`
entries. The PRD has nothing equivalent. It has NFR-7 (*"Legibility ... is a hard
requirement, equal in weight to awe"*) — but the PRFAQ is stronger than "equal in
weight": it makes awe **instrumental**. Everything else is *in service of*.

This resolves conflicts the PRD currently leaves open. When Schematic Identity (FR-20)
and Dwell (FR-18) and Condensation (FR-13) compete for attention, the PRFAQ has a
tie-breaker and the PRD does not. Downstream UX and architecture will hit that conflict
and have no rule.

**Where it goes:** PRD §1 Vision as the closing line, and/or promoted to a first-class
guardrail in §6. Suggested form: *"Product hierarchy rule: the site has one job — if you
read two projects, you know how he thinks. Every other element is in service of getting
the visitor to slow down long enough to read two projects. Where visual, motion, or
interaction decisions conflict, this rule decides."*

---

## L-3. The reader quote — the target emotional reaction, in the reader's voice — HIGH

**What was lost:** The distillate mentions the reader quote only as an item in the
*Cracks* list ("labelled aspirational rather than fabricated, but asserts a reaction
nobody has had"). It never quotes it. The PRD inherits the *risk* (R-2) but not the
*target state* the risk is about.

**Exact quote (lines 418–421):**

> "I have read a hundred portfolios and they all show me a grid of logos. This one made
> me stop on the Oracle migration for a full minute — not because of the graphics,
> because he told me what he argued against and why. I know more about how he works from
> one paragraph than from an hour of interviews."
> — a reader Thomas hopes exists

**Also lost — the design notes on the quote (lines 493–499):**

> "**The reader quote is unattributed by design.** It is written as an aspiration ('a
> reader Thomas hopes exists') rather than fabricated as a testimonial, since no user
> exists yet. It states the target reaction in the reader's own voice without inventing a
> person."
>
> "The quote deliberately cites the Oracle/MDM migration — the one entry drafted to
> publishable depth — to keep even the aspirational quote anchored to real material."

**Does it matter, and where would it go:** Yes — **HIGH**.

Three concrete things the PRD lacks:

1. **A duration target.** *"stop ... for a full minute."* The PRD's SM-2 asks whether a
   stranger can state discipline/seniority/environments; it has no dwell-on-content
   target. "A full minute on one entry" is a measurable success criterion and directly
   calibrates FR-18 Dwell numbers (§13 Q7 asks *"how much longer on a Deep entry"* — this
   is the answer's anchor).
2. **The explicit disclaimer of the wrong reason.** *"not because of the graphics."* This
   is the strongest available statement that visual fidelity is not the success channel —
   it belongs beside SM-C4 (Visual fidelity before launch, do-not-optimize) and reinforces
   L-2.
3. **The comparison baseline.** *"a grid of logos"* is what the target reader has seen a
   hundred of. The PRD's §7 correctly says no competitive claim is made, but this is not a
   competitive claim — it is the reader's mental default, and it is the thing the opening
   frame has to break in the first eight seconds (UJ-1). Useful UX input.

**Where it goes:** PRD §11 Success Metrics (sharpen SM-2 with the one-minute anchor), and
§2.3 UJ-2, whose *climax* is currently *"she finishes the paragraph and thinks this
person can think"* — the PRFAQ's version is richer and testable.

---

## L-4. "How It Works" — the second-person walkthrough of the visitor's experience — HIGH

**What was lost:** ~450 words of the site described from inside the visitor's head, in
second person, moment by moment. The distillate reduces all of this to mechanism bullets
("skills = dust that condenses on focus and decays back on release"). The **felt
experience** is gone entirely.

**Exact quote (lines 388–416, abridged to the load-bearing passages):**

> "You arrive from a link — usually LinkedIn, sometimes the CV itself. You already know
> the job titles and the dates; that is not why you clicked. **You clicked because
> something suggested this person built a universe.**"

> "The first thing you see is a star field rendered as a technical drawing: monochrome,
> precise, deliberately schematic rather than photographic. **It reads as a blueprint of
> a career, and the drafting is the point — this is a diagram someone designed, not
> decoration someone downloaded.**"

> "You scroll, and the camera moves. **It does not jump; it flies**, on a route composed
> shot by shot."

> "When the camera settles on a project, the dust between the bodies gathers and condenses
> into a ring of orbiting objects: the technologies that project ran on. **They are not a
> list in a sidebar. They arrive and they leave.** Move on, and they disperse back into
> the medium they came from."

> "On some projects that is where it ends, and the journey moves on. On others the camera
> stays, and there is a paragraph... **Those are the entries the site exists for. You find
> them by noticing where the journey lingers.**"

> "Free flight is available whenever you want to leave the route and look around."

**Does it matter, and where would it go:** Yes — **HIGH**. This is the missing
experiential spec the addendum admits to needing.

Specific gains over the PRD:

- **"It does not jump; it flies."** FR-17 specifies Shots as entity+framing. It says
  nothing about transitions between Shots. This is a real behavioural requirement — cuts
  are forbidden; the camera interpolates. Downstream architecture would otherwise be free
  to implement Rail traversal as discrete jumps and violate nothing in the PRD.
- **"They are not a list in a sidebar. They arrive and they leave."** FR-10 says
  technologies never appear in `notable` prose; it does not forbid a sidebar list. The
  PRFAQ does, explicitly, and gives the reason (the geometric channel *is* the expression).
  This is a missing Out of Scope on FR-10 or FR-13.
- **"You find them by noticing where the journey lingers."** This is the *user-facing
  mechanism* of FR-9 (two classes render distinguishably) and FR-18 (derived Dwell). The
  PRD treats FR-9 and FR-18 as separate requirements; the PRFAQ says the pacing **is** the
  wayfinding. §13 Q5 ("does a Shallow Project look different in the scene, or only in the
  information layer?") has a partial answer here that the PRD does not know it has: dwell
  is itself the primary signal, and the visual distinction is secondary reinforcement.
- **"a diagram someone designed, not decoration someone downloaded."** The clearest
  articulation of the Schematic Identity's *communicative goal* — belongs in the addendum's
  UX notes, which currently list only formal properties (palette, line weight, typography).

**Where it goes:** PRD §2.3 (enrich UJ-1/UJ-2), FR-17 (transition requirement), FR-10 or
FR-13 (no-sidebar Out of Scope), and addendum *Visual System* notes.

---

## L-5. "How to Visit" — the plainest statement of the site's affordances, and "for now" — MEDIUM

**What was lost:** The closing section of the press release, and the deliberate
acknowledgment attached to it.

**Exact quote (lines 425–432):**

> "The site is at [domain], linked from Thomas's LinkedIn profile and from the footer of
> his CV. **There is nothing to install, no account, and nothing to accept.** It runs in a
> desktop browser; a flat star chart serves machines and phones that cannot run the 3D
> scene, **carrying the same content in a simpler form**."
>
> "The whole thing is a single page with no backend and no CMS. The career lives in one
> data file inside it. To reach Thomas, the contact route is where you would expect it —
> **for now**."

**And the note on it (lines 477–479):**

> "The closing 'for now' on the contact route is a deliberate, small acknowledgment rather
> than a concealment."

**Does it matter, and where would it go:** **MEDIUM**, with one sharp item.

- **"nothing to accept."** No cookie banner, no consent dialog, no interstitial. This is a
  real constraint that appears nowhere in the PRD and that a downstream implementer could
  easily violate (analytics → consent banner). It also directly threatens NFR-1 First
  Paint: a consent modal over the opening frame destroys the exact moment funnel
  positioning depends on. **Should be an explicit Out of Scope / guardrail.**
- **"carrying the same content in a simpler form."** Sharper than FR-22's *"conveys what
  the site is and what Thomas does."* The PRFAQ's Q8 answer is stronger still — see L-8.
  Addendum §*Open Design Territory* asks *"What the Fallback actually shows"*; the PRFAQ
  answers it: **everything.**
- **The "for now" register.** FR-23 says the M2 contact route is *"explicitly
  unglamorous."* The PRFAQ adds that the site should **say so lightly** rather than hide
  it. Small, but it is a voice decision and it is consistent with the whole editorial
  stance.

---

## L-6. Customer FAQ Q1 and Q2 — the greybox defence and the fifteen-second contract — HIGH

**What was lost:** The distillate carries the *decision* (M2 ships as deliberate
schematic) but not the *argument as the site would make it to a skeptical visitor*, and
not the fifteen-second scope contract at all.

**Exact quote (Q1, lines 511–520):**

> "**Q: Why is this a wireframe? Did you not finish it?**"
>
> "It is finished for what it is. The site ships as a technical drawing — monochrome,
> precise, schematic — because that is a deliberate visual language, not an unpainted
> version of a different one. **A career is structure: relations, durations, and
> decisions. A blueprint is the honest way to draw structure.**"
>
> "...That ordering is deliberate: **meaning first, surface second. If the schematic
> version cannot tell you what this person does, no amount of texture would have fixed
> it.**"

**Exact quote (Q2, lines 522–532):**

> "**Q: I clicked from LinkedIn. I have fifteen seconds. What do I get?**"
>
> "A career rendered as a system you can see the shape of — and the immediate
> understanding that this was built, not filled in. **Within fifteen seconds you should
> register three things: this is a real person's work history, it is organised by
> something rather than listed, and someone made deliberate choices about how it looks.**"
>
> "That is the whole job of the opening. **This site is built to earn a second visit and a
> forward, not to complete an argument in one scroll.** If you leave after fifteen seconds
> having thought 'that was unusual,' it worked."

**Does it matter, and where would it go:** Yes — **HIGH**.

- **Q2 is a testable three-part acceptance criterion for the opening frame** and it does
  not exist in the PRD. UJ-1 says Marc *"forms an opinion in eight seconds"* and the
  climax is *"he keeps scrolling"* — behavioural, but not specified as content. The
  PRFAQ's three registrations (real work history / organised not listed / deliberately
  designed) are directly checkable and should be **acceptance criteria on FR-20**, and
  arguably a success metric alongside SM-2.
- **Note the number discrepancy.** PRFAQ Q2 says **fifteen seconds**; PRD UJ-1 says
  **eight seconds** and NFR-1 assumes **2.5s** first paint; UJ-3 says *"the first two and
  a half seconds is the entire product."* Three different time budgets are now circulating
  with no stated relationship. Worth reconciling explicitly: 2.5s to paint, 15s to form
  the three registrations, and eight seconds is an unsourced PRD invention.
- **Q1's *"A blueprint is the honest way to draw structure"*** is the justification the
  Schematic Identity needs and does not have. PRD §4.5 asserts the idiom is legitimate;
  the PRFAQ says *why it is the right one for this content specifically*. The addendum's
  UX notes list precedents (technical drawing, orbital mechanics diagrams) but not this
  argument.
- **"meaning first, surface second"** is a four-word statement of the entire milestone
  ordering and would serve well in §9 Milestones as the ordering rationale.

---

## L-7. Customer FAQ Q4 — the concession to the PDF, and *relation* as the thing only 3D gives — HIGH

**What was lost:** The distillate never mentions Q4 except obliquely ("the only comparison
made is against the reader's existing alternative, a PDF CV"). The answer itself contains
the clearest statement of **what the 3D medium uniquely delivers** — and the PRD has no
equivalent justification for its own existence as a 3D artifact.

**Exact quote (lines 552–565):**

> "**Q: I have to scroll through space to read a CV now? I can read a PDF in ninety
> seconds.**"
>
> "Then read the PDF — it exists, it is linked, and for the facts it is genuinely faster.
> This is not a replacement for it."
>
> "**What the PDF cannot show you is relation.** Which technologies recur across which
> clients over a decade, which engagements were long and which were brief, what sits at
> the centre of the work and what sits at the edge. **On paper that is a table you would
> not read. Here it is the shape of the thing, and you take it in without parsing
> anything.**"
>
> "If you want facts in ninety seconds, the CV wins and I will not pretend otherwise. **If
> you want to know what kind of engineer this is, the CV was never going to tell you.**"

**And the coaching note on it (lines 708–710):**

> "Q4 (why not a PDF) holds because **it concedes the PDF's advantage rather than disputing
> it; the concession is what makes the rest believable.**"

**Does it matter, and where would it go:** Yes — **HIGH**. This is the most substantive
omission after L-2.

1. **"Relation" is the medium's justification and it is missing from the PRD.** PRD §1
   Vision justifies the product by *visible reasoning* (the architecture). §7 says it is
   not a CV. Neither says what the cosmos **shows that no other format can**: recurrence
   of technologies across clients over time, relative engagement duration, centre vs.
   edge. That is a *requirement* on the resting scene — the visitor should be able to
   perceive those three relations **without focusing anything**, taking them in *"without
   parsing anything."* Nothing in FR-1..FR-24 requires that. FR-3's three mapping rules
   produce it incidentally; the PRD never states it as an intent, so nothing tests it.
2. **The concession is a voice principle.** *"the CV wins and I will not pretend
   otherwise."* The coaching note explicitly identifies the concession as the mechanism of
   credibility. This is the same move as *"most professional work is competent delivery"*
   (which the PRD does carry, via FR-8 and §8.3). The pattern — **concede the honest
   limitation, and the rest becomes believable** — is a reusable editorial rule for all
   downstream copy and belongs in the addendum's copy-tone section.
3. **The PDF must be linked from the site.** *"it exists, it is linked."* Q7 repeats this
   twice more. The PRD never requires a link to the CV/PDF anywhere. This is a genuine
   missing FR — small, but it is asserted three separate times in the FAQ as an available
   escape hatch, and both Q4 and Q7 depend on it being true.

---

## L-8. Customer FAQ Q8 — the Fallback as "a designed view rather than an apology," and its full content scope — HIGH

**What was lost:** The distillate reduces the Fallback to "flat star-chart fallback for
incapable machines." The answer's substance — the framing, the completeness guarantee,
and the reason the hardware profile is what it is — is gone.

**Exact quote (lines 617–628):**

> "**Q: I am on a corporate laptop with integrated graphics and locked-down drivers. What
> happens when I open this?**"
>
> "Either the 3D scene runs, or you are served a flat star chart carrying the same content
> in a simpler form. **Capability is detected rather than assumed, and the fallback is a
> designed view rather than an apology — it holds every project, every field, and every
> narrative entry.**"
>
> "The 3D path targets a locked framerate at 1080p on roughly three-year-old integrated
> graphics — **deliberately the corporate work-laptop profile rather than a developer
> machine, because that is what you are reading this on.** Where the machine cannot hold
> it, frames drop before quality does."

**Does it matter, and where would it go:** Yes — **HIGH**, because it **answers an open
question the PRD and addendum both leave open.**

- PRD §13 Q9 asks: *"What detects an incapable machine, and how much must the flat chart
  convey?"* The addendum's *Open Design Territory* repeats it: *"'Flat star chart' names a
  form, not a content set."* **The full PRFAQ answers the second half definitively:
  every project, every field, every narrative entry.** The Fallback is content-complete.
  That is a real scope decision the PRD believes is open and is not.
- *"Capability is detected rather than assumed"* answers the first half in principle
  (feature detection, not UA sniffing or a device-class guess) — FR-22's first consequence
  says only that detection occurs *before* a degraded scene is shown, which is weaker.
- *"a designed view rather than an apology"* is the register instruction. FR-22 says *"it
  is not an error page"* — negative framing. The PRFAQ's positive framing is what a
  designer can actually work from.
- *"because that is what you are reading this on"* is the rationale for NFR-4 and it is
  the most persuasive form of it. Worth carrying verbatim.

**Where it goes:** FR-22 Consequences (content-completeness as a testable), §13 Q9 (close
the second half), addendum *Open Design Territory* (delete the open item).

---

## L-9. Customer FAQ Q5 — the LOW-confidence flag naming an unmarked-lottery failure mode — MEDIUM

**What was lost:** The distillate carries the dwell-derivation requirement but not the
**stated consequence of getting it wrong**, which the PRFAQ marks as a launch blocker in
unusually vivid terms.

**Exact quote (lines 578–582):**

> "**⚠ Confidence: LOW — this answer depends on an unresolved decision.** See Drift Flag
> 02. If camera dwell is authored rather than derived, this answer is not true and **there
> is no way for a visitor to distinguish a deep entry from a shallow one before entering
> it — which makes the selectivity in the previous answer invisible and turns the
> two-body-class model into an unmarked lottery.** **Launch blocker.**"

**And the visitor-facing half (lines 569–575):**

> "The journey slows down where there is something to read... You do not have to know which
> is which in advance; **the pacing tells you, and the pacing cannot drift out of sync with
> the content because it is computed from it.**"

**Does it matter, and where would it go:** **MEDIUM–HIGH**.

The PRD has FR-9 and FR-18 as separate requirements with separate notes, and R-3 covers
the *shallow-entry treatment* risk. What it does not state is the **coupling failure**:
if the reader cannot distinguish classes pre-commitment, the entire two-class model —
which is Flag 01, the largest amendment in the chain — degrades from *editorial honesty*
into a *lottery*, and the honesty the site claims becomes invisible. That reframing is
worth a sentence in §4.2's description or in R-3, because it explains why FR-9 is
load-bearing rather than cosmetic.

*"The pacing cannot drift out of sync with the content because it is computed from it"*
is also the clean one-line statement of why FR-18 is a rot defence and not just a feature
— it belongs in FR-18's Consequences or the addendum's architecture note on derived Dwell.

---

## L-10. Customer FAQ Q6 — the three named constraint examples, and the four-second sanity check — MEDIUM

**What was lost:** The distillate carries the constraint-as-falsifiability argument and
the *"nobody invents 'no container runtime on prem'"* line. It drops the **other two
worked examples** and the mechanism by which the reader verifies.

**Exact quote (lines 588–594):**

> "Every narrative entry names a specific condition of the environment it happened in — **on-premise
> hardware with no container runtime, an incumbent product whose real behaviour had to be
> recovered from the running system because the documentation was years stale, a mostly
> junior team on a business-critical referential.** Those details are not flattering and
> they are not generic. **They are the kind of thing you only write if you were there, and
> the kind of thing your own experience lets you sanity-check in about four seconds.**"

**Does it matter, and where would it go:** **MEDIUM**.

- **Three worked examples, not one.** The PRD's FR-8 Out of Scope note carries only the
  container-runtime example. The other two are calibration samples for the ~9 remaining
  entries — the content-authoring pass (addendum, *Content Authoring* notes) would benefit
  from all three as a reference set for "what a good constraint looks like."
- **"not flattering and not generic"** is a testable authoring rule and sharper than the
  PRD's 90-word floor. A constraint that flatters the author is probably not a constraint.
- **"sanity-check in about four seconds"** names the verification mechanism: the reader's
  own experience, not references or metrics. That is the actual credibility model and it
  is stated nowhere in the PRD.

---

## L-11. Customer FAQ Q9's inline warning — the colophon requirement's origin, stated as a failure — MEDIUM

**What was lost:** The distillate says the transfer claim *"requires the reasoning to be
visible to visitors."* The PRFAQ states it as a **discovered defect in the current design**,
in language that makes the failure mode concrete.

**Exact quote (lines 654–658):**

> "**⚠ Note: this answer requires the reasoning to be VISIBLE.** **An engineering lead
> cannot admire a data model they cannot see.** As currently designed, all of the above
> lives in internal planning documents that no visitor reads. See Stage 3 coaching notes —
> this promotes a visible technical colophon from 'nice to have' to 'required for the
> primary claim to land.'"

**And Q9's closing (lines 648–652):**

> "Those are the same instincts I bring to a Spring Boot migration: **design for the change
> you know is coming, refuse the shortcut that will rot, and make the maintenance cost of
> the tenth addition equal to the cost of the second.** The domain is different. **The
> judgment is not, and the judgment is what you are actually hiring.**"

**Does it matter, and where would it go:** **MEDIUM**.

- *"An engineering lead cannot admire a data model they cannot see"* is the one-line
  justification for FR-21 and is more persuasive than §4.6's current description. Direct
  quote candidate.
- The three-clause instinct statement (*design for the change you know is coming / refuse
  the shortcut that will rot / make the maintenance cost of the tenth addition equal to the
  second*) is **the actual content the Colophon must communicate.** FR-21 requires showing
  the JSON, the three mapping rules, the Shot contract, and the no-overrides rule — all
  *mechanisms*. It never states the *claim those mechanisms support*. Without it a visitor
  reads a config file and infers nothing. The addendum's open question *"Whether the
  Colophon is discoverable or hidden"* is downstream of a more basic one: **what argument
  does it make?** This is the answer.
- *"the judgment is what you are actually hiring"* is the transfer claim's closing line and
  belongs in §1 Vision or FR-21's description.

---

## L-12. Customer FAQ Q3 — "the shallow entries are labelled by being shallow" — MEDIUM

**What was lost:** The distillate carries the two-class rationale from Flag 01. It does not
carry Q3's articulation, which contains a design principle the PRD contradicts by omission.

**Exact quote (lines 536–550, abridged):**

> "Because they answer different questions, and you are asking both."
>
> "The ten establish that the career is real, varied, and long — which clients, what scale
> of system, what kind of environment, what size of team. **That is breadth, and it is
> verifiable and unglamorous.**"
>
> "The two or three that carry a written decision establish how I think when something is
> actually at stake. **That is depth, and it is the part a CV deletes.**"
>
> "...Showing all ten at equal depth would mean padding seven of them with prose that
> describes responsibility rather than choice — **and you would spot that immediately,
> because every candidate writes those sentences.** **The shallow entries are shallow on
> purpose, and they are labelled by being shallow.**"

**Does it matter, and where would it go:** **MEDIUM**.

*"They are labelled by being shallow"* is a **strong constraint on FR-9's assumption.** The
PRD's `[ASSUMPTION]` proposes Shallow Projects render *dimmer*, with *no moon at rest* and
*label only on Focus*. The PRFAQ's principle says the absence **is itself the label** — no
badge, no "no decision recorded" marker, no apologetic treatment. The addendum's UX note
asks exactly the right question (*"is the distinction legible as meaning ... or does it
read as incomplete data?"*) and the PRFAQ supplies the governing rule: it must read as
*deliberate absence*, and the emptiness must not be annotated.

Also: *"verifiable and unglamorous"* and *"you would spot that immediately, because every
candidate writes those sentences"* are the reader-model justification behind SM-C3 and R-3.
Useful in §4.2.

---

## L-13. Q10's closing candour — "I wanted to build it" in the author's own voice — LOW

**What was lost:** The distillate abstracts this to *"Author motive, stated plainly: he
wanted to build it."* The PRD carries it faithfully (§1, §2.1, §6 Editorial constraint).
What is lost is only the phrasing.

**Exact quote (lines 675–676):**

> "And yes — I wanted to build it. Those two things are not in conflict, but **I am not
> going to claim the professional case came first.**"

**Does it matter:** **LOW** for content — the PRD's §6 editorial constraint covers it. But
the *sentence construction* — stating the honest thing and refusing the flattering framing
in the same breath — is the site's voice in miniature and is a useful specimen for the
copy-tone material recommended in L-1.

---

## L-14. Stage 1 coaching notes — three items with no distillate representation — MEDIUM

The distillate skips the Stage 1 coaching notes entirely. Three items in them are not
recoverable from anywhere else in the chain.

### L-14a. The 3D-modelling avoidance is *why space was chosen* — MEDIUM

**Exact quote (lines 91–94):**

> "3D modelling skill sits below the quality bar he refuses to lower. **Space was chosen
> partly because it is the rare subject needing almost no modelling.** Note the unresolved
> tension: the two Blender bookends still require the skill the approach was designed to
> route around."

**Why it matters:** The PRD's R-6 says the Blender dependency *"needs exactly the 3D
modelling skill the entire technical approach was chosen to avoid"* — correct, and the
addendum reinforces it. But the PRD nowhere records that **the cosmos metaphor itself was
partly selected for this reason.** That is a load-bearing constraint on every future
visual decision: any M3/M5 addition requiring modelled geometry re-introduces the avoided
dependency. Belongs in §6 Constraints as a standing guardrail, not only as R-6's
backstory. It also independently strengthens the R-6 `[ASSUMPTION]` (procedural in-engine
collapse) — that assumption is not merely convenient, it is the only option consistent
with the metaphor's original selection criterion.

### L-14b. The three rot defences all exist to defend against one self-identified trait — MEDIUM

**Exact quote (lines 88–90):**

> "Self-identifies as lazy about maintenance. This is load-bearing, not an aside: **the
> no-position-overrides rule, the one-knob maintenance model, and the entity-relative
> camera rails all exist to defend against it.**"

**Why it matters:** The PRD mentions this once, in FR-2's Out of Scope (*"they rot, and the
author self-identifies as lazy about upkeep"*). It never states that **all three** rot
defences share this single origin. That matters for downstream architecture: they are one
coherent defence, not three independent design choices, and weakening any one of them
weakens the same thing. The addendum's architecture notes treat them separately.

### L-14c. The difficulty-is-invisible constraint was the *central drafting constraint*, not a rejected framing — MEDIUM

**Exact quote (lines 51–56):**

> "*'The advantage is that the thing is difficult to build well.'* **Difficulty is invisible
> in the finished artifact. The reader sees a result, not a struggle.** The press release
> must state what the visitor **experiences and infers**, not what it cost to make.
> Carried into Stage 2 as the central drafting constraint."

**Why it matters:** The distillate files this under *Rejected Framings* as a positioning
that was cut. The PRD carries it in §7 as *"Build difficulty is never claimed."* Both treat
it as a **content exclusion**. The full PRFAQ treats it as a **writing rule that governs
every downstream document**: describe what the visitor experiences and infers, never what
it cost to make. The Stage 2 coaching notes confirm the rule caught a violation in the
subheadline (*"the ignition-stage trap ... reappearing in the subheadline"* — line 453).
As a rule it is far more useful than as an exclusion, and it should govern the Colophon in
particular, which is the one surface most at risk of tipping from *showing the model* into
*boasting about the model*. Belongs in §6 or the addendum's copy-tone notes.

---

## L-15. Verdict — "The one thing standing between this and a live URL" — MEDIUM

**What was lost:** The distillate carries all four cracks as actionable items and the PRD
carries them as R-1..R-6. What is lost is the **Bottom Line's ranking**, which subordinates
every design question to one non-design question.

**Exact quote (lines 908–917):**

> "The thinking is sound and, in places, unusually good... the changes that got it there
> were **reframings rather than retreats** — selectivity became an editorial position, the
> greybox became a visual language, the launch moved from M5 to M2."
>
> "**The one thing standing between this and a live URL is not a design question. It is
> whether anyone but the author ever expects to see it. Fix that — a date, or a first
> reader — and the rest of this document is a build plan.**"

**Does it matter, and where would it go:** **MEDIUM**.

The PRD ranks R-1 as *Critical* and the assumption proposes *both* a reader and a date.
Faithful. What the PRD loses is the **framing**: the entire PRD is conditionally valid —
it is *"a build plan"* only once the forcing function exists. That is worth a sentence in
§0 Document Purpose or §10's preamble, because it tells a downstream workflow (epics,
stories, architecture) that consuming this PRD before Q3 is resolved is building against
an unmitigated critical risk. Also note the PRD escalates slightly: the PRFAQ says *"a
date, **or** a first reader"*; the PRD's assumption says *"Both, not either."* That is a
defensible strengthening, but it is a change from the source and is not flagged as one.

---

## L-16. The press release's own framing note — what M2 "as shipped" means — LOW

**Exact quote (lines 335–337):**

> "_Describes **M2 as shipped**: computed layout, authored rails, information layer,
> deliberate schematic visual language. No realism pass, no collapse ending — both are
> post-launch upgrades to a live site._"

**Why it matters:** **LOW** — the PRD's §8.1 is more precise. Noted only because it
confirms the press release is a description of the *launch* artifact, which means every
quote in L-1 through L-5 is directly applicable to M2 scope rather than aspirational for
M4/M5. This matters when deciding whether to import the experiential language: it is all
in-scope now.

---

# Part 2 — Faithfully Distilled

These reached the PRD intact and need no action. Listed for completeness.

**Drift flags — all four, in full reasoning:**
- Flag 01 (uniform depth → two body classes): the 2-of-10 fact, the quality-promise
  analysis, padding-vs-stalling, the ~70% sampling figure, the planet-with-no-moon framing,
  classification-by-absence consistency, the claim restatement, both rejected alternatives.
- Flag 02 (authored rails vs. derived dwell): the compose-not-compete resolution, framing
  authored / dwell derived, the addendum's table-in-3D tension, M2 scope confirmation.
- Flag 03 (launch milestone): M2 as the smallest linkable version, the non-negotiables
  reconciliation, "first point at which the thing is true," the deliberate schematic
  mitigation, all three consequences, both rejected alternatives.
- Flag 04 (funnel positioning vs. load time): the pre-qualified-therefore-patient
  weakening, the forward as the least patient reader, the M2-textures pressure, the split
  budget, shareability as newly in scope.

**Positioning and claims:** top-of-funnel resolution and its narrowing versus the brief;
the transfer claim ("proves how I work") and its visibility requirement; author motive
stated plainly and the instruction not to sanitise it; no competitive claim, deliberately
not researched, with the downstream research obligation.

**Content model:** the full field set; `notable` as prose not list; the 90-word floor; the
named-rejected-alternative rule; the excavation question and the SNCF inverted-draft
proof; problem/constraint/decision replacing problem/decision/outcome and why; the
container-runtime line; which numbers do exist (team size, duration, scale, what was
replaced); real client names; client-friction exclusion.

**Inventory magnitude and cardinality:** 2 companies, ~5–6 clients, ~10 projects, ~18
bodies, unbounded skills; one engagement → several projects; the SNCF split example.

**Architecture and rot defences:** no position overrides; classification by absence; the
one-knob model; entity-relative Shots and the silent-drift failure they prevent;
condensation/decay as one reversed implementation; the background-drift residual risk;
solver bounding retained as a safety net; incremental history-pinning held in reserve.

**Thresholds:** framerate proposal and its unratified status; the 30-over-60 rationale;
degradation policy (quality holds, frames drop) and the stable-vs-fluctuating argument;
target hardware profile; first-paint accepted in principle without a number.

**Rejected alternatives:** all three headline framings; build-difficulty as positioning;
mid-funnel and "it's for me"; "it proves I finish things" / "it doesn't prove anything";
the full architecture set (seed lock, emergent composition, solver bounding; constellations,
shared light, static binding, demotion to text, meteors; projects-as-stars,
intermediates-as-stars, two-body systems).

**Verdict:** all five "needs more heat" items; all four cracks with their fixes; Stage 4
declined on economic grounds with the non-economic half carried forward.

---

# Recommended PRD Actions, Ranked

| # | Action | Severity | Target |
|---|---|---|---|
| 1 | Add the **product hierarchy rule** from the author quote ("everything else is in service of getting you to read two projects") as a governing tie-breaker | CRITICAL | §1 Vision + §6 |
| 2 | Add a **Voice and Register** section sourced from the press release; retire the addendum's "copy tone remains open" | HIGH | §6 or addendum UX notes |
| 3 | Add **Q2's three fifteen-second registrations** as acceptance criteria on FR-20; reconcile the 2.5s / 8s / 15s budgets | HIGH | FR-20, NFR-1, §2.3 |
| 4 | Add **"relation" as the medium's justification** — recurrence, duration, centre-vs-edge perceptible without focusing | HIGH | §1 Vision + a new/extended FR on the resting scene |
| 5 | Close **§13 Q9** on Fallback scope: every project, every field, every narrative entry; capability detected not assumed | HIGH | FR-22, §13 Q9, addendum |
| 6 | Add **camera transitions are continuous, never cuts** ("it does not jump; it flies") | HIGH | FR-17 |
| 7 | Add **no sidebar list of technologies** as Out of Scope ("they are not a list in a sidebar") | HIGH | FR-10 / FR-13 |
| 8 | Add **"nothing to install, no account, nothing to accept"** as a guardrail (no consent banner over first paint) | MEDIUM | §6 / §7 |
| 9 | State what the **Colophon argues**, not just what it shows — the three-clause instinct statement | MEDIUM | FR-21 |
| 10 | Add **link to the CV/PDF** as a requirement (Q4 and Q7 both depend on it) | MEDIUM | new FR under §4.7 |
| 11 | Record the **unmarked-lottery failure mode** coupling FR-9 and FR-18 | MEDIUM | §4.2 / R-3 |
| 12 | Constrain FR-9's assumption with **"labelled by being shallow"** — absence is the label, no annotation | MEDIUM | FR-9, §13 Q5 |
| 13 | Record that **space was chosen partly to avoid 3D modelling** as a standing constraint | MEDIUM | §6, R-6 |
| 14 | Record that the **three rot defences share one origin** | MEDIUM | addendum architecture notes |
| 15 | Promote **"describe what the visitor experiences and infers, never what it cost to make"** from exclusion to writing rule | MEDIUM | §6 / addendum |
| 16 | Add the **other two constraint examples** to the content-authoring reference set | MEDIUM | addendum content notes |
| 17 | Add the **one-minute dwell target** and "not because of the graphics" to success metrics | MEDIUM | SM-2, SM-C4 |
| 18 | Note the PRD **strengthened "a date or a reader" to "both"** — flag as a deliberate change from source | LOW | R-1 |
