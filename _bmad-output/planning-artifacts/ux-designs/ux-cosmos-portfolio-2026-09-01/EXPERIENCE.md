---
title: "Cosmos Portfolio — EXPERIENCE.md (Behaviour Spine)"
status: final
created: 2026-09-01
updated: 2026-09-01
sources:
  - ../../prds/prd-cosmos-portfolio-2026-09-01/prd.md
  - ../../prfaq-cosmos-portfolio.md
  - ../../briefs/brief-cosmos-portfolio-2026-08-31/brief.md
  - ../../briefs/brief-cosmos-portfolio-2026-08-31/addendum.md
  - ../../briefs/brief-cosmos-portfolio-2026-08-31/inventory-draft.md
  - ./.memlog.md
  - ./.working/direction-03-deep-field.html
  - ./.working/direction-02-draughtsman.html
---

# EXPERIENCE.md — Cosmos Portfolio Behaviour Spine

**This spine wins.** Where any mock, wireframe, screenshot or working HTML in
`.working/` disagrees with this document, this document is correct and the mock
is stale.

Peer document: [DESIGN.md](./DESIGN.md), which owns the visual identity. This
document owns everything that changes over time: architecture, states, motion,
interaction, voice, accessibility behaviour, and the journeys. Visual tokens are
referenced by name in `{path.to.token}` form and are defined there, never here.

Vocabulary is the PRD §3 Glossary, used verbatim: Company, Client, Project,
Skill, Body, Mote, Notable, Deep Project, Shallow Project, Weight, Focus,
Condensation, Rail, Shot, Dwell, Schematic Identity, Colophon, Fallback, First
Paint, The Forward. A synonym introduced here is a discipline violation.

---

## 1. Foundation

### The one job

*If you read two Projects, you should know how Thomas thinks.* Everything else
on screen exists to get a visitor to slow down long enough to read two
Projects. NFR-7 makes this the tie-breaker: where visual identity, Dwell, or
Condensation conflict with legibility, **legibility wins**. Awe is the delivery
mechanism, never the product.

### The M2 gate, as a behavioural contract

*Can a stranger tell what Thomas does — and can he tell which entries are worth
reading?*

The second clause is the harder one and it is the one this document's structure
is organised around. It became load-bearing the moment two Project classes were
adopted, and it got harder still under the ratified Clients-only Rail, which
removes camera Dwell as a per-Project selectivity signal (see §4.5 and §9.2).

### The five design invariants

1. **It does not jump; it flies.** FR-17's motion law, adopted verbatim and
   extended by ratified decision to *every* transition in the product, including
   the Focus transition. There are no cuts anywhere.
2. **Focus is always deliberate.** Nothing opens by itself. The Rail visits
   Clients, frames their systems, and stops there. A visitor who reads a Notable
   chose to.
3. **Nothing is authored per entry except one number.** Weight. Every camera
   framing, every Dwell, every class distinction, every Mote tier derives from
   the data. A behaviour that requires touching an entry on add has broken
   UJ-4 and NFR-5.
4. **The scene is never occluded.** No modal, no scrim, no full-screen overlay.
   Reading happens beside the scene, not on top of it.
5. **Nothing gates the first frame.** No splash, no consent banner, no cookie
   notice, no click-to-enter (NFR-1). There is nothing to accept.

---

## 2. Information Architecture

### The entity graph

```
Client (Star)  ×5–6
  └── Project (Planet)  ×~10 total, 1..n per Client
        ├── Company    — an attribute, never a Body
        ├── Notable    — present ⇒ Deep Project; absent ⇒ Shallow Project
        └── Skill      — Dust at rest; Mote while Focused. Shared, never duplicated.
```

Classification is by field absence, not by a type flag. A Deep Project is a
Project with a populated Notable and nothing more. Promotion is free: an entry
that later gains a Notable becomes Deep with no schema change, no layout
change, and no camera work.

### The navigational spine — Clients only

**Ratified: the Rail visits Clients only, ~5–6 stops.** Not ~15–16. It does not
stop at Projects.

Arriving at a Client stop **frames that Client's whole system** so that every
one of its Projects is on screen and selectable simultaneously. The visitor
steers into detail from there. This is the structural decision the rest of this
document follows from, and it has three consequences that must be honoured:

- **FR-17a is amended in effect.** Its testable consequence — "adding a Project
  produces a journey that visits it" — is now satisfied by the new Project
  being *framed at its Client's stop*, not by its receiving a Shot of its own.
  The default Shot template (Q14) therefore operates at **Client granularity**
  and must frame the Client's full system including its widest-orbit Project.
- **FR-18's derived Dwell moves up a level.** Dwell cannot derive per-Project
  from Notable presence if the Rail never stops at a Project. It derives at
  Client granularity instead. What derives it is open — see §5.3.
- **The Client-stop framing carries the entire selectivity burden.** Nobody is
  led to a Notable any more. This is why the Deep/Shallow signal (§4.2) is
  redundant by design and why R-3 is materially higher than the PRD records.

### The four surfaces

| Surface | Role | Reachability |
|---|---|---|
| **The scene** | The product. Rail, free flight, Focus. | Default, if the machine can run it. |
| **The panel** | The record. Opens beside the scene on Focus. | Focus only. Not addressable on its own. |
| **The Fallback** | Content-complete flat star chart. Every Project, every field, every Notable, no truncation. Preferred surface for date navigation. | Served automatically to incapable machines and all mobile; **one click from the scene** at any time. |
| **The Colophon** | The data file and the three mapping rules, shown not described. | A persistent route from both scene and Fallback. |

The Fallback is not a downgrade path a visitor falls into. It is a second
product, reachable deliberately, and a visitor on a capable desktop who prefers
to read a list must be able to get there in one click.

### Reading order

Time runs backward: present → past (FR-16). The most recent Client is
encountered first. Backward time is not a puzzle to solve — the dates are not
the point and are upstream in the CV. Within a Client stop, Projects have no
prescribed order; they are all present at once and the visitor picks.

---

## 3. Voice and Tone

### The governing rule

**Candour at apparent self-cost.** Every line of copy in this product concedes
something a normal portfolio would hide. This is not modesty — it is the
credibility mechanism. The reader has seen forty portfolios that claim; a
portfolio that concedes is immediately in a different category.

The load-bearing statement, verbatim from the PRFAQ: *"Most professional work
is competent delivery where no alternative was ever seriously contested, and
those projects are shown as exactly that."* Selectivity is an editorial
position, not a shortfall, and the copy must never apologise for it.

### Refusals — absolute

- **No discountable claims.** "Improved maintainability," "enhanced
  performance," "delivered value." Anyone can write these; nobody believes
  them. If a claim could be pasted into any other CV unchanged, it is deleted.
- **No boasting about build difficulty.** It cannot be said without becoming a
  boast, and the reader never perceives it anyway. Capability is inferred from
  an artifact that works.
- **No describing how it was made.** The Colophon *shows* the data and the
  rules. It does not narrate the build.
- **No responsibility-instead-of-choice prose.** "Responsible for architecture"
  is a job description. "I argued for X against the house standard Y" is a
  decision. The first is forbidden in a Notable.
- **No fabricated testimonials.** No quotes, no endorsements, no invented
  praise, anywhere, including in the link preview.
- **No "work in progress" disclaimer** — FR-20, absolute, in any surface and
  any register. A disclaimer invites the exact judgement it tries to pre-empt.
- **No published criticism of a named Client** (FR-11 out-of-scope). A reader
  cannot verify it and it reflects on the author.

### The concessive register

Concede the competitor's advantage first, then make the narrower true claim.
The competitor here is the reader's PDF CV. The model sentence, from the PRFAQ:

> *"Then read the PDF — it exists, it is linked, and for the facts it is
> genuinely faster."*

That sentence is the whole tone. It gives away the speed argument entirely, and
by doing so earns the right to the argument it actually wants to make.

### Texture — abstractions cashed out immediately

Every abstraction is followed by a concrete noun within the same breath. The
canonical pair:

> *"Anyone can claim a performance improvement. Nobody invents 'no container
> runtime on prem.'"*

This is why the **constraint** is the Notable's falsifiability substitute for
absent metrics (FR-8), and why DESIGN.md lifts the constraint sentence in
brighter ink. The constraint is the unfakeable part.

### Microcopy pattern

**Acknowledge incompleteness in three words, never in a banner.** "for now" is
the entire pattern. Where something is genuinely absent or unfinished, the copy
concedes it in a clause and moves on. It never gets its own surface, its own
badge, or its own sentence.

### The Shallow Project rule line

One line in the author's voice, in the reading position where a Notable would
be, on every Shallow Project.

> **"Entries carry a written argument only where there was an argument to
> have."**

This is the voice's most important single application, because it lands at the
exact point a reader would otherwise conclude the entry is thin (R-3). It
converts an absence into the site's thesis.

`[ASSUMPTION: Identical wording every time, on all ~7 Shallow Projects. A
convention repeated is a convention; a convention reworded is a defence.
Varying the wording per entry was rejected on principle — it would read as
evasion. Showing it once per session was considered and not chosen, because a
visitor who arrives mid-scene would never see it. The open risk is that it
wears thin or reads as an excuse by the third encounter. Needs cold-read
validation at M0 (PRD §9), which is the cheapest test in the plan.]`

### Where copy exists at all

Copy exists in exactly five places. There is no sixth.

1. Notables and field values — the record.
2. The Shallow Project rule line.
3. Two lines of corner chrome per frame, `{typography.chrome}`.
4. The Colophon's annotations on the mapping rules, its statement of what is not there, and the framing of its live re-solve (§4.7).
5. The contact route.

Page metadata — the document's title, its description and the preview image's alt text — is never drawn on any surface; it is not a sixth place, and it is held to the same voice.

No tooltips. No onboarding. No empty states. No help text. No captions
explaining marks — if a mark needs a caption, the mark is wrong.

---

## 4. Component Patterns

Behavioural contracts only. Visual specifications for every component below
live in DESIGN.md §7.

### 4.1 Client Star

Not selectable in the usual sense — a Client is a place, not a record. Clicking
or activating a Client Star flies the camera to that Client's stop and frames
its system. There is no Client-level panel: a Client has no record of its own,
only Projects.

### 4.2 Project Planet — the Deep/Shallow signal

**Ratified: Moon + Ring, layered.** Two independent structural channels, both
derived from Notable presence alone.

- **Moon** — the in-world truth. "A planet with no moon" made literal.
- **Ring** — the legibility aid, readable at client-stop distance where a small
  Moon is not reliably resolvable.

Behavioural rules:

- Both channels are **derived, never authored**. Adding a Notable in 2029
  produces both automatically.
- **Neither size nor brightness participates.** FR-3 binds mass to duration and
  brightness to recency. Any implementation that reaches for scale or luminance
  will invert on real data: a long-ago Shallow Project can legitimately be the
  largest Body in a system.
- The signal is present **at rest**, before any interaction, on every Project
  simultaneously at a Client stop. This is what lets a visitor state which
  entries are worth reading without Focusing any of them (FR-9).
- The Ring means **carries a Notable**. It does not mean "opens." *Everything
  opens.* Any surviving mock caption saying otherwise is stale.

### 4.3 The selectable affordance — hover-revealed, with the collision rule

**Ratified: nothing at rest.** A resting frame carries no selection marks. The
affordance appears on approach.

> ### THE COLLISION RULE — binding
> The Deep Project's rest-state Ring and the hover affordance **must not both
> be rings.** If hover draws a ring around any Body, a hovered Shallow Project
> becomes indistinguishable from a resting Deep Project, and the M2 gate's
> second clause silently inverts under the visitor's own cursor.

**Adopted resolution: hover brings the LABEL on a leader line, not a shape.**

On hover (and on keyboard focus, identically), a Project reveals:

- a straight leader line and its title, `{components.affordance-hover}`;
- one secondary line: role, team size, class;
- a luminance step on the Body itself — `{colors.stroke-rest-dark}` →
  `{colors.stroke-active-dark}` — which is a step on an existing channel, not a
  new shape.

No geometry is added around the Body. This also spends the interaction on
*information* rather than merely on *clickability*, which is the better use of
it.

**Keyboard equivalence is non-optional.** `:focus-visible` renders the
identical leader-and-label treatment plus
`{components.affordance-focus-ring}` — a 1px outline on the **label block**,
never on the Body, because an outline on the Body would reintroduce the ring
collision through the back door.

### 4.4 Mote

A Skill condensed. Behavioural contract:

- **A Mote always carries its label.** Automatically, on Condensation, with
  **no second interaction** — no hover, no tooltip, no click. Ratified. An
  unlabelled Mote delivers no information and reduces the mechanic to ornament.
- A Mote exists **only** while its Project is Focused (FR-13). No Mote is
  visible in a resting scene.
- No Skill is instantiated in more than one place at one time. Two Projects
  sharing `Java` never show two `Java` Motes simultaneously, because only one
  Project is ever Focused.
- **No connector line** between a Project and its Motes (FR-14). Orbit is the
  relation. A connector makes this a network diagram in a space costume, which
  the target audience reads as exactly that.
- Motes stay visible and in motion while the panel is open. Their visibility
  *is* the answer to "where is the stack?"

**There is no technology text list in the panel.** The Dust is the display
(FR-10, ratified). Any `Skills` field row has reintroduced the duplication the
mechanic exists to remove.

### 4.5 The panel

- Opens on Focus, beside the scene, never over it.
- Its opening is **one continuous combined move** with the camera recompose —
  see §6.3. It is not a panel that slides in over a static scene.
- Scroll inside the panel scrolls the panel and **does not advance the
  journey** (FR-12a). This is the collision the PRD's FR-12a exists to
  prevent, and it is the single behaviour UJ-2's climax depends on.
- Contains, in order: Client kicker, Project title, **the reading position**,
  the field table.
- The **reading position** holds a Notable on a Deep Project and the editorial
  rule line on a Shallow one. Same slot, same layout, always.

**The Shallow panel is the Deep panel with a different final block — not the
Deep panel minus a block.** This is the promotion contract: in 2029, adding a
Notable swaps the rule line for the Notable and nothing else changes. No layout
rework, no schema change, no special case. It is also the R-3 mitigation: there
is no visible hole for a reader to interpret as thinness.

### 4.6 The Fallback

- Content-complete: every Project, every field, every Notable, no truncation.
- Reachable in **one click from the scene**, at any time, by any visitor.
- Carries the Deep/Shallow signal via the **Ring alone** — there is no 3D Moon
  on a flat chart. This is precisely why the ratified signal is two redundant
  channels.
- Carries the same voice, the same rule line, the same absence of disclaimers.
- Is the preferred surface for date navigation.

### 4.7 The Colophon

**Ratified form: a static page outside the 3D scene that renders the live
JSON** — the same embedded file the simulation reads — with the three mapping
rules annotated against real values drawn from it. It is a conventional
document, not a canvas.

**Why this form.** FR-21 exists because the transfer claim needs evidence a
visitor can inspect: the argument is *look at the model*, not *here is a
description of the model*. A page that explains the force simulation in prose
fails that test however well it is written. A page that shows the actual file,
with `mass ← duration` demonstrated on a real entry with its real numbers,
passes it.

**Why it cannot rot.** The Colophon reads the source of truth rather than
restating it. A hand-written page describing the data would drift the first time
an entry changed — a page arguing against rot, rotting. This is the same
constraint that produced the no-position-overrides rule, applied to the surface
that exhibits it.

#### Behaviour

1. **It renders, it does not narrate.** Each of the three rules is shown as a
   derivation on a named entity: the rule, the input value from the JSON, and
   the resulting visual property. `mass ← duration`, worked on one real Project.
   Prose exists only to name what is being shown.
2. **The file is present in full**, syntax-set and readable, not summarised and
   not excerpted behind a fold. A visitor may read every byte the scene reads.
3. **Nothing is authored twice.** Every value on the page comes from the JSON at
   render time. There is no hand-maintained copy of any number.
4. **It states what is *not* there** — no backend, no CMS, no position
   overrides, no per-entry camera work — because several of the load-bearing
   claims are about absences, and an absence cannot be shown by rendering data.
   This is the one place prose does the work, and it is stated in the voice of
   §3: concrete, unboastful, and checkable against the file above it.
5. **It is not a features list.** It does not enumerate what the site does. It
   shows how the layout is derived, and stops.

#### Entry and return

**Ratified: the left-top corner chrome slot, appended to identity.** The slot
carries `THOMAS NAVARRO · the model`. It sits with authorship because that is
what it is — who made this, and how — rather than a feature advertised in the
frame. The two-line chrome rule (DESIGN.md §7.9) is preserved: left-top is
identity, right-bottom remains the stateful instruction slot.

The Fallback carries the same route in its own chrome, so the accessible surface
reaches it without passing through the scene.

Return is a conventional back route to the surface the visitor came from — the
scene resumes at the stop it was left at, not at First Paint. A visitor who
inspects the model and is returned to the beginning of the journey has been
punished for looking.

#### Accessibility

The Colophon is a conventional document and therefore the most accessible
surface in the product by construction: real headings in order, a real
`<table>` for the derivations, the JSON in a `<pre>` with an accessible name.
It requires none of the §11.1 preconditions, because it has no canvas. It is
also the only surface where a screen-reader user receives *exactly* what a
sighted user receives, with no equivalence argument required.

`[ASSUMPTION: The JSON is rendered inline on the page rather than linked as a
downloadable file. Inline keeps the evidence in front of the reader, where a
link asks them to leave and open a raw file most will not. A link to the raw
file may sit alongside it. Not ratified.]`

`[NOTE FOR UX] The Colophon has no visual mock. It is spine-only, and its
layout — how the JSON block and the three derivations sit together on one page
— has not been drawn. Lower risk than the Fallback was, because it is a
conventional document in an established type system, but it is the last
unillustrated surface.]`

---

## 5. State Patterns

### 5.1 The five states of the product

| State | What is true | How you leave |
|---|---|---|
| **First Paint** | The Schematic scene's first frame. Nothing gates it. | Automatically, into On-Rail. |
| **On-Rail** | Scroll advances the journey backward through time, Client to Client. Default. | Focus a Project, or enter free flight. |
| **Free flight** | Opt-in. Scroll no longer drives the journey; the visitor addresses destinations directly. | Return to Rail (guaranteed, FR-19), or Focus a Project. |
| **Focus** | One Project is Focused. Its Motes are condensed and labelled; its panel is open; scroll reads rather than travels. | Release (§5.5). Returns to whichever of On-Rail or Free flight it was entered from. |
| **Fallback** | The flat star chart. | It is a destination, not an error. Return to the scene if the machine can run it. |

### 5.2 Body states

| State | Trigger | Behaviour |
|---|---|---|
| Rest | default | Stroke per the data-derived luminance band. Deep Projects show Moon + Ring. No affordance marks. |
| Hover / `:focus-visible` | pointer proximity or keyboard traversal | Leader line + title + secondary line; Body steps to `{colors.stroke-active-dark}`. **No ring.** |
| Focused | deliberate activation | Body at `{colors.stroke-focus-dark}` — the only white in the frame. Motes condensed. Panel open. |
| Receded | camera has moved past | Steps down the stroke ladder. Labels drop to `{colors.ink-faint-dark}` or vanish. |

**Only one Body is Focused at a time.** Focus is exclusive.

### 5.3 Dwell — derived, at Client granularity

Dwell derives from data, never from a hand-tuned per-entry number (FR-18). It
now derives at Client granularity, because the Rail stops at Clients.

`[ASSUMPTION: Dwell at a Client stop derives from the count of Deep Projects in
that system. A Client whose system contains something worth reading is held
longer, which preserves FR-18's intent — pacing carries selectivity — at the
only granularity the Rail still has. The rejected alternatives were total
Project count (which rewards volume, contradicting SM-C3) and total engagement
duration (which is already spent on mass via FR-3, and reusing it would make a
long dull engagement feel important). Not ratified. See PRD §13 Q7.]`

**The numbers are not specified here.** The shape is: Deep-bearing Client stops
are *measurably* longer than others, and the difference must read as deliberate
rather than as stalling. Tune on the greybox at M1, where it is cheapest.

### 5.4 Focus entry — trigger

`[ASSUMPTION: Focus is entered by explicit activation — click or tap on a
Project, or Enter/Space on a keyboard-focused Project. Not by dwell, not by
proximity, not by scroll-stop. Rationale: the ratified IA states that "Focus is
always deliberate," and proximity- or dwell-triggered Focus would open panels
the visitor did not ask for while merely looking around a Client system that,
by design, has every Project on screen at once. Dwell-triggered Focus is
specifically dangerous here: a Client stop frames 6 Projects simultaneously, so
a cursor resting anywhere would fire. PRD §13 Q15 leaves this deliberately
open; this is a proposal, not a ratified decision.]`

### 5.5 Focus release

`[ASSUMPTION: Focus releases on Escape, on activating the panel's close
affordance, on activating a different Project (which transitions Focus rather
than releasing it — see §6.4), and on resuming journey scroll via an explicit
gesture at the scene rather than inside the panel. It does NOT release on
pointer-out: a reader whose cursor drifts off a 150-word paragraph must not
lose the paragraph. Not ratified. See PRD §13 Q15.]`

### 5.6 Loading and First Paint

There is no loading screen, no progress bar, no splash, and no click-to-enter
(NFR-1). The first Schematic frame is the first thing the visitor sees.
Everything else — full Dust density, remaining Bodies, the complete Rail —
streams in behind it.

Streaming must never be visible as popping. Bodies arriving after First Paint
fade up their stroke through the ladder rather than appearing at final
luminance.

`[NOTE FOR UX] The First Paint *principle* — nothing gates the first frame — is
adopted. **The number is not.** NFR-1's 2.5s is carried as an unratified
assumption in the PRD and is not adopted here. See PRD §13 Q1 and §15 Flag 04.]`

### 5.7 Error and absence states

**There are almost none, by construction.**

- **No empty state on a Shallow Project.** Nothing is missing; a different
  block is present.
- **No skeleton screens.** A Body that has not streamed in is not there
  yet, in a frame that is already mostly empty.
- **No 3D error state.** Capability is detected *before* rendering (FR-22), so
  no visitor ever sees a failed or degraded scene. The Fallback is served
  instead, and it is a designed view rather than an apology.
- **No offline state.** There is no backend and no network request for career
  data (FR-1, NFR-6). Once the page is loaded there is nothing to fail.

The one genuine error surface is the contact route failing — see §7.5.

---

## 6. Motion and Camera

*This product's defining concern.* The register is cinematic, not interface —
the reference is filmic. Orbital motion, mass and rotation are M1/M2 geometry
and in scope for launch; only textures, lighting and post-FX are deferred to
M3.

### 6.1 The governing law

> ## "It does not jump; it flies."

FR-17, adopted verbatim. **There are no cuts anywhere in the product.** This
was ratified as extending beyond Rail transitions to *every* camera change,
including the Focus transition. Specifically forbidden:

- Cuts between Shots.
- Snapping to a destination in free flight.
- The panel appearing while the camera is stationary.
- Instant re-framing on window resize.
- Any transition that begins after the previous one has stopped, which reads as
  a cut with extra steps.

### 6.2 Rail motion

The Rail is a continuous trajectory through ~5–6 Client stops, running backward
through time. Shots name entities, never coordinates, so a re-settled
simulation carries every Shot with its subject (FR-17).

- Scroll drives position along the Rail. Scroll velocity maps to camera
  velocity, damped — the camera has mass and does not stop the instant the
  wheel does.
- Arrival at a Client stop **frames the whole system**: every Project on
  screen, every one selectable. The default Shot template must guarantee the
  widest-orbit Project is inside the frame, since a Project framed out of
  shot is unreachable from the Rail.
- Departure from a stop begins before the visitor has finished scrolling into
  it. The Rail is continuous; the "stop" is a slowdown, not a halt.

`[NOTE FOR UX] The default Shot template (PRD §13 Q14) is unspecified — what
angle, what distance, what framing rule an un-authored Client receives, and
which entities earn a hand-authored Shot. Under the Clients-only Rail this
template now does far more work than the PRD anticipated: it is the sole
composition for most of the journey and it carries the entire selectivity
burden. Genuine gap; this is the highest-leverage unspecified item in this
document.]`

### 6.3 The Focus transition — one combined move

**Ratified: side panel + camera recompose, as ONE continuous combined move.**

Not two moves. Not a panel that slides in over a settled camera. Focus is a
single gesture in which, simultaneously:

1. the camera flies toward the Project and **recomposes it off-centre**, into
   the half of the frame the panel will not occupy;
2. the panel opens in the other column;
3. Condensation begins — Dust resolves into labelled Motes around the Project.

The three are one animation with one easing curve. **The scene is never
occluded**: no scrim, no dim, no modal. The Motes remain visible and in motion
throughout the read, which is what makes "the Dust is the display" true rather
than merely asserted.

Releasing Focus is the same move reversed — the camera re-centres, the panel
closes, the Motes decay back into Dust. One implementation, run backward, which
is what guarantees the two directions feel like the same thing (FR-13's
principle applied to camera).

### 6.4 Condensation and Decay

**Condensation is fast.** This is a service to comprehension, not a style
choice: it delivers information the visitor asked for, and the visitor must not
wait to read. Decay is the same curve reversed — one tuning pass, guaranteed
coherence (FR-13).

The governing metaphor, from PRD §15: **"Skills are weather, not furniture."**
Dust is a medium that condenses and disperses. It has no permanent position and
no permanent form. This one line answers most of Q6's sub-questions: Motes are
not objects being shown and hidden, they are a medium changing state.

**Nothing spawns from nothing and nothing teleports.** Every Mote arrives from
Dust that was already visible.

**A → B Focus transition.** `[ASSUMPTION: Focusing Project B while Project A is
Focused is a single continuous move — A's Motes begin decaying as the camera
begins flying to B, and B's condense as it arrives, with the two overlapping.
Not a full decay followed by a re-condense, which would produce a dead beat in
the middle and read as a cut in everything but pixels. The panel content
cross-fades on the same curve rather than closing and reopening. Not ratified.
See PRD §13 Q6.]`

### 6.5 Free flight — layered by input modality

**Ratified: free flight is layered by input modality, not by mechanic.** All
three layers address **the same destination set** — every Client Star and every
Project Planet. They are three doors into one room, not three different rooms.

| Layer | Modality | Behaviour |
|---|---|---|
| **Click-to-fly** *(primary)* | pointer | Activating any visible Body flies the camera to it. Continuous, never a jump. A Client flies to its stop and frames the system; a Project flies to Focus. |
| **Pull-back overview** *(wayfinding)* | pointer / scroll gesture | Pulls the camera back to frame the whole universe, so a visitor who is lost can see everything at once and pick. This is the answer to "how far may I roam" — the boundary is the universe, and the overview makes the boundary legible rather than enforcing it with an invisible wall. |
| **Keyboard index** *(accessibility)* | keyboard | A reachable, ordered list of every destination. Not a fallback for the other two — a first-class path, and the reason `:focus` equivalence in §4.3 is non-optional. |

**Return to the Rail is guaranteed** (FR-19). A visitor in free flight can
always resume the journey from where the Rail was left, or from the nearest
Client stop.

`[ASSUMPTION: Free flight is entered by using any of the three layers — there
is no separate "enter free flight" control. The first click-to-fly, the first
pull-back, or the first keyboard traversal *is* the opt-in, which satisfies
FR-19's "opt-in, default on-rail" without spending a control on it. Return is
an explicit, always-present affordance in the corner chrome slot. Not ratified.
See PRD §13 Q8.]`

### 6.6 Motion accessibility

`prefers-reduced-motion: reduce` is honoured across the whole product, the Rail
included. The law "it does not jump; it flies" is a *statement about
continuity*, not about duration, so reduced motion shortens durations sharply
and never introduces a cut.

**Full specification, including the independence of reduced motion from Fallback
routing, is in §11.2.** It lives in the Accessibility Floor because it is a
floor obligation rather than a motion-design choice.

---

## 7. Interaction Primitives

### 7.1 Scroll

Scroll has exactly two meanings and they are separated by state, never
overlapping:

- **On-Rail / free flight:** scroll advances the journey backward through time.
- **Focus:** scroll reads. It scrolls the panel and **does not move the
  camera** (FR-12a). Reading 150 words cannot move the camera off the thing
  being read.

This separation is what makes UJ-2's climax possible. Getting it wrong makes
UJ-2 unbuildable.

### 7.1a Escape — precedence

`Escape` is bound to two different releases and they must never contend. The
rule is **innermost first**, and it is unconditional:

| State when `Escape` is pressed | What releases | What is left |
|---|---|---|
| Focused, in free flight | Focus only | free flight, at the same Body |
| Focused, on the Rail | Focus only | the Rail, at the same stop |
| Free flight, not Focused | free flight | the Rail resumes |
| On the Rail, not Focused | nothing | `Escape` is inert |

One press releases one layer. `Escape` never releases two states at once and
never returns a visitor further than one step from where they were — a key that
sometimes closes a panel and sometimes ejects you across the product is a key
nobody presses twice.

### 7.2 Pointer

- **Hover** reveals the affordance: leader line, title, secondary line, Body
  luminance step. Never a ring.
- **Click on a Project** enters Focus.
- **Click on a Client Star** flies to that Client's stop.
- **Click on empty space** does nothing. There is no click-to-dismiss on the
  void, because a visitor exploring a mostly-empty frame will click empty space
  constantly and must not be punished for it.
- No drag, no orbit-by-drag, no pinch-zoom at M2. Free flight is addressed, not
  piloted — it is random access for the impatient or returning visitor, not
  sightseeing.

### 7.3 Keyboard

The keyboard is a first-class path, not a compliance afterthought.

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Traverse the destination index — Clients, and Projects within a Client. Order follows the Rail: present → past. |
| `Enter` / `Space` | Activate. On a Client, fly to its stop. On a Project, enter Focus. |
| `Escape` | Release Focus. From free flight, return to the Rail. |
| `↑` / `↓` | Advance and reverse along the Rail — the keyboard equivalent of scroll. |
| `Home` | Return to the opening frame. |

Every keyboard destination is the same set of destinations pointer users reach.
A keyboard visitor is never given a lesser map.

### 7.4 Touch

Touch devices receive the **Fallback** at M2 — mobile 3D is out of scope. The
Fallback is a conventional scrolling document and needs no bespoke touch
grammar. It must not, anywhere, tell the visitor they are missing something.

### 7.5 The contact route

Unglamorous by design; the collapse ending is M4. A `mailto:` alone is
insufficient — it dead-links on exactly the corporate laptops NFR-4 names — so
a **visible, copyable address** ships alongside or instead (FR-23).

**Ruled (Thomas, 2026-10-22, story 6.3).** One shared line: the address,
itself a `mailto:` link whose visible text and accessible name is the address,
selectable by hand, and beside it a `copy` button (Q4 (b)).

- **Placement.** On the Fallback chart, in the chrome row beside the heading,
  directly after the `<h1>`, with the route line opposite at the row's end
  (Q3 (a)); on the Colophon, directly under its `<h1>`,
  drawn before the exhibits arrive. **Never on the scene** or in its corner
  chrome (Q2 (d)).
- **Strings.** The button reads `copy`; on press it changes in place to
  `copied`, or to `not copied` when the clipboard is blocked or absent. The
  label stays until the next press — no timer, no toast, no banner, no modal,
  no live region, no tooltip, no caption, no apology (Q5). The changed name on
  the focused button is the announcement.
- **Failure.** A blocked clipboard is the one runtime error surface: the label
  reads `not copied`, and the address stays visible and hand-selectable.
  Nothing else degrades. No form and no endpoint: nothing is submitted.
- **The address** (Q1). `t.navarro9@laposte.net`, supplied by Thomas 2026-10-22, closing the
  deferral; a test holds it to a plain address shape.

---

## 8. Sequence Pacing

*Invented section. PRD §15 records this as unowned: derived Dwell sets
per-Body duration, but nothing governs rhythm across a run.*

Under the Clients-only Rail the problem changed shape. The PRD's worry was
"three consecutive Shallow Projects." The Rail no longer visits Projects, so
the actual risk is now **a run of Client stops whose systems contain nothing
Deep** — a stretch of journey with no reason to slow down anywhere.

### The principles this document fixes

1. **Rhythm is derived, like everything else.** No per-stop pacing value is
   authored. A pacing knob would rot on the first addition and would break
   NFR-5.
2. **Variation must exist, and it must mean something.** A journey with uniform
   Dwell across ~5–6 stops reads as a conveyor belt and teaches the visitor
   nothing about where to look. A journey whose variation is arbitrary is
   worse: it teaches a false signal.
3. **The site's own tagline bets on this.** The shipped PRFAQ subheadline
   promises *"a camera [that] slows down only for the work that was actually
   argued about."* The Clients-only Rail removed camera Dwell as a *per-Project*
   signal, so pacing must still carry selectivity at Client granularity or the
   product's own headline is false.
4. **Ratios, never durations.** This document specifies shape only; the numbers
   are tuned on the greybox at M1.

### The proposed shape

`[ASSUMPTION: The journey has three tempos, derived:
(a) **Held** — a Client stop containing one or more Deep Projects. Longest
    Dwell, slowest approach, the camera settles fully before departing.
(b) **Passed** — a Client stop containing only Shallow Projects. Shorter Dwell;
    the camera frames the system, holds long enough for the Deep/Shallow signal
    to register as *absent*, and moves on.
(c) **Traversed** — the space between stops, which is where the journey's
    length actually lives. Longer between distant Clients, shorter between
    near ones, derived from the solver's own geometry at no authoring cost.
The rhythm therefore emerges from the data without a pacing field existing.
Not ratified. See PRD §13 Q7 and §15.]`

`[NOTE FOR UX] Two genuine gaps remain here, neither with anything upstream to
work from:
1. **The run-of-Shallow problem is not solved, only relocated.** If several
   consecutive Clients hold only Shallow Projects, the journey has a flat
   stretch and nothing in the ratified decisions addresses it. Whether that
   stretch should compress, or should be reordered (it cannot — time order is
   FR-16 and is not negotiable), or should be accepted as honest, is
   undecided.
2. **Total journey length is unknown and untested.** ~5–6 stops is a short
   spine — plausibly under a minute. Whether that satisfies UJ-1 ("he keeps
   scrolling instead of closing the tab") or whether it ends before Marc has
   formed an opinion is untested. Check at M1 alongside Dwell tuning.]`

---

## 9. Key Flows

Each flow uses the PRD's named protagonists and ends at a named climax beat.

### 9.1 UJ-1 — Marc, fifteen seconds

*An engineering lead screening candidates. PDF in one tab, eleven behind it. He
clicks a URL because of how the line above it was phrased.*

1. **First Paint.** The Schematic scene's first frame arrives with nothing in
   front of it — no splash, no consent, no click-to-enter. A near-empty field:
   one white Client Star, hairline orbits, a handful of receding Stars, two
   lines of corner chrome in opposite corners. Monochrome, structural, visibly
   not a template.
2. **He reads nothing.** He is deciding whether this earns attention. The frame
   answers with composition alone: `{colors.stroke-focus-dark}` spent exactly
   once, so his eye lands on the subject before he has processed a word.
3. **He scrolls.** Time runs backward. The camera moves along the Rail rather
   than dumping him into free flight — the journey is on rails precisely so
   that a visitor who has made no decision is still going somewhere.
4. **The first Client stop resolves.** The system frames; several Projects
   appear at once; two of them carry a Moon and a Ring. He has now registered
   the three things NFR-1a requires: a real work history, organised rather than
   listed, deliberately designed.
5. **CLIMAX — he keeps scrolling instead of closing the tab.**
6. **Resolution.** He is inside UJ-2's path.
7. **Edge case — no WebGL.** Capability is detected *before* render, so he never
   sees a broken scene. He gets the Fallback, and it tells him what this is
   rather than showing an error or an apology.

### 9.2 UJ-2 — Priya reads a full Notable

*A senior peer, sent the link by a colleague. Exploring rather than screening.*

> **STRUCTURAL DEVIATION FROM THE PRD — read this before building.**
> UJ-2 as written in the PRD has *the camera bring Priya to a Deep Project and
> dwell on it noticeably longer.* Under the ratified Clients-only Rail that is
> no longer how it works. **The Rail stops at Clients, not Projects. Nobody is
> led to a Notable.** Priya must select it herself. The Client-stop framing and
> the at-rest Moon + Ring signal now carry the entire burden of telling her
> which Project is worth selecting — a burden the camera used to share. This
> raises R-3 materially above where the PRD records it, and it is why the
> Deep/Shallow signal is redundant by design. The flow below is how it actually
> works.

1. **The Rail brings her to a Client stop** and frames the whole system: six
   Projects on screen at once, all selectable. The camera slows here — this
   Client holds a Deep Project, and Dwell derives accordingly — but it does not
   single out any one Project.
2. **She reads the field, not the words.** Two of the six carry a Moon and a
   Ring; four do not. This is the moment the M2 gate's second clause is either
   won or lost, and it happens before any interaction, at rest, in silence.
3. **She approaches one.** Hover reveals a leader line and a title —
   *"Client referential — MDM replacement"* — plus one secondary line: role,
   team size, and that it carries a Notable. **No ring is drawn**, so the
   Deep/Shallow signal she just read stays true under her own cursor.
4. **She selects it.** Focus is deliberate; she chose this.
5. **One combined move.** The camera flies the Project off-centre into the free
   half of the frame; the panel opens in the other column; Dust condenses fast
   into nine labelled Motes — `Java`, `Spring Boot`, `Tomcat`, `Oracle`,
   `Cloudera`, `MDM`, and three more — each carrying its own name with no
   second interaction from her. The scene is never occluded. It does not jump;
   it flies.
6. **She scrolls to read, and the camera does not move.** Scroll is reading
   now, not travelling.
7. **She scans the constraint in about four seconds.** One sentence inside the
   paragraph sits in brighter ink — not bold, not labelled — carrying the
   unfakeable environmental fact. It reads as writing, never as a form.
8. **CLIMAX — she finishes the paragraph and thinks *this person can think*.**
   The core bet of the entire product, and the one thing that has never been
   tested. It is mitigated only by M0, the cold-read, which needs no code.
9. **Resolution.** She releases Focus; the Motes decay back to Dust on the same
   curve reversed. She continues, reading rather than skimming, and — because
   the Moon and Ring are at rest on every Project in every system — she can
   tell which of the remaining entries deserve the same attention.

### 9.3 UJ-3 — Tom, cold forward, mobile → Fallback

*A Slack message containing only a URL and the word "look." No context, no
prior interest, no investment. He is The Forward, and SM-1 depends entirely on
him.*

1. **The link preview renders as a composed image**, not a blank card (FR-24).
   This is a designed surface, built from the same tokens as the scene, and it
   is the entire product as far as Tom's decision to tap is concerned.
2. **He taps between meetings, on a phone.** Capability detection routes him to
   the Fallback before anything renders. He never sees a degraded scene.
3. **The Fallback lands as a designed view.** Same palette, same type ramp, same
   square corners, same silence. **No banner explains that he is on a fallback.**
   No "best viewed on desktop." No disclaimer of any kind (FR-20). If the copy
   concedes anything it concedes it in three words, in the flow, and moves on.
4. **CLIMAX — the opening frame lands before his patience does.** Whatever
   arrives in the first couple of seconds is the whole product to him.
5. **He can do the same job Marc and Priya can.** The Fallback is
   content-complete: every Project, every field, every Notable, no truncation.
   The Ring carries the Deep/Shallow signal alone on the flat chart, so he too
   can tell which entries are worth reading.
6. **Resolution.** He scrolls — entering UJ-1's path with less context — or he
   leaves. If he leaves, funnel positioning has failed at its only mechanism.

`[NOTE FOR UX] The Fallback's detection mechanism is unspecified (PRD §13 Q9):
what actually determines "incapable machine," and whether the check is
capability-based, performance-based (NFR-2a's disputed 24fps floor), or
device-class-based. This decision also silently determines whether a capable
tablet gets the scene or the Fallback. Genuine gap.]`

### 9.4 UJ-4 — Thomas adds a Project in 2029

*Three years on. An engagement worth publishing.*

1. **He opens the embedded JSON** and adds one entry with the fixed field set.
2. **He sets one number: `weight`.** That is the entire authored surface.
3. **He positions nothing.** No coordinate, no camera Shot, no layout, no Dwell
   value, no class flag.
4. **The simulation re-settles.** The new Planet finds its place around its
   Client Star. Every existing Shot still frames its subject, because Shots
   name entities rather than coordinates.
5. **The new Project is reachable without a Shot being authored.** Under the
   Clients-only Rail it is reached by being **framed at its Client's stop** —
   the default Shot template frames the Client's full system including its
   widest-orbit Project. This is the amended reading of FR-17a and it is the
   only reading consistent with the ratified IA.
6. **CLIMAX — the site is current again, and the edit took minutes.**
7. **Resolution.** The document is still true, which is the difference between
   a living portfolio and a snapshot that rotted.
8. **Edge case — the entry has no publishable decision.** `notable` stays
   empty. It renders as a Planet with no Moon and no Ring, and its panel
   carries the editorial rule line in the reading position. No schema change,
   no special case, no layout rework.
9. **Edge case — promotion.** A Shallow Project he later excavates gains a
   `notable`. The rule line is replaced by the Notable in the same slot; the
   Moon and Ring appear automatically. **Nothing else changes.** Promotion is
   free, which was a hard constraint on the whole design.

---

## 10. Responsive & Platform

This product is multi-surface by construction, not by breakpoint. There are two
renderers and they are different products sharing content.

| Surface | Who gets it | Contract |
|---|---|---|
| **3D scene** | Capable desktop machines. | The full experience. Rail, free flight, Focus, Condensation. |
| **Fallback** | All mobile; any machine that fails detection; any visitor who clicks through deliberately. | Content-complete flat star chart. A designed view, not an apology. |

### Rules

- **Detection precedes rendering** (FR-22). No visitor sees a failed or
  degraded 3D scene before being routed. This is a hard sequencing requirement,
  not a preference.
- **Content parity is absolute.** Every Project, every field, every Notable.
  The Fallback is not a teaser, a stub, or a summary.
- **The Fallback is one click from the scene** and is never presented as a
  lesser destination.
- **The target hardware profile is a three-year-old laptop with integrated
  graphics at 1080p** (NFR-4) — the corporate work-laptop of the actual
  audience. Not a current Apple-silicon machine, and never the dev machine.
- **Quality holds, frames drop** (NFR-3). A scene at 24fps is preferable to a
  stripped-down scene at 30, because a viewer served a lesser render judges the
  lesser render, unaware a better one existed. A *stable* framerate reads
  smooth where a fluctuating one reads broken at a higher average.
- **Within the scene, the panel is the only responsive element.** Its width
  adapts; the prose measure does not. See DESIGN.md §4.

`[ASSUMPTION: Between the mobile Fallback and the full desktop scene there is
no third tier. A small-window desktop visitor gets the scene with a narrower
panel, not the Fallback, because window size is not a capability signal. Not
ratified.]`

---

## 11. Accessibility Floor

Behavioural. Visual contrast is DESIGN.md §2.

**Stakes.** The audience is technical professionals judging the author's
competence from the artifact. A keyboard trap or an unreachable destination
does not merely inconvenience a visitor — it undercuts the product's entire
claim, in the one dimension the audience is most likely to notice. This is a
consumer-grade floor, not an enterprise checkbox exercise.

### The floor

1. **Every destination is keyboard-reachable.** The keyboard index is one of
   the three ratified free-flight layers and addresses the same destination set
   as click-to-fly. A keyboard visitor is never given a smaller map.
2. **No keyboard trap.** Focus opens a panel; `Escape` always releases it;
   `Tab` from the panel returns to the scene's destination order. There is no
   state the keyboard can enter and not leave.
3. **Visible focus, always.** `:focus-visible` renders the full
   leader-and-label treatment plus `{components.affordance-focus-ring}`. Focus
   indication is never suppressed, never opacity-reduced, and never relies on
   the Body's own luminance step alone.
4. **Focus equivalence with hover.** Anything hover reveals, keyboard focus
   reveals identically. There is no pointer-only information anywhere.
5. **`prefers-reduced-motion` honoured** without introducing cuts. See §6.6.
6. **The scene is described, not just drawn.** The canvas or SVG root carries a
   meaningful accessible name and the destination index is exposed as real
   focusable elements with real accessible names — Client name, Project title,
   role, and whether it carries a Notable. A screen-reader user must be able to
   answer the M2 gate's second clause: *which entries are worth reading?*
7. **The Deep/Shallow signal is never carried by colour alone.** Both ratified
   channels — Moon and Ring — are structural, which makes the signal
   greyscale-safe and colour-blind-safe by construction rather than by
   remediation. The whole palette is achromatic, so this is free.
8. **Mote labels are text, not decoration.** Nine simultaneous Skill labels are
   information (FR-10's second channel) and must be exposed as such, not baked
   into a canvas texture. When a Project is Focused, its Skills are announced.
9. **The Fallback is the accessibility floor's floor.** It is a conventional
   document, content-complete, one click away. Any visitor for whom the scene is
   hostile has a full-quality route to every word of the content.
10. **No time-limited interaction.** Nothing dismisses itself, nothing expires,
    no Dwell-triggered state change removes something a visitor was reading.

`[NOTE FOR UX] Screen-reader behaviour during camera motion is unspecified —
whether Rail progress is announced, and how a live-region would avoid narrating
a continuous camera move into unusable noise. Proposed direction: the scene is
not narrated at all; the destination index is the accessible interface and the
camera is presentational. Not ratified, and it needs testing with an actual
screen reader rather than reasoning. Genuine gap.]`

### 11.1 The structure the floor rests on

The ten points above state outcomes. This section states the structure that
produces them, because an outcome asserted without a mechanism is an aspiration
an implementer cannot verify. *The camera is presentational; the index is the
interface* is sound as a principle and unbuildable as written until the
following four preconditions hold.

**P1 — The index is a real DOM tree, independent of render state.**
The destination index is a persistent `<nav>` containing a nested list: one item
per Client, each with a nested list of its Projects. It exists in the document
from First Paint, is populated from the same JSON that seeds the simulation, and
**never derives its structure, order, or focusability from camera state,
viewport position, or canvas hit-testing.** Bodies move; the index does not. An
implementation that hit-tests canvas coordinates to build the index breaks the
moment the camera moves and is invisible to assistive technology — it is the
failure this precondition exists to forbid.

**P2 — Every Body has a DOM proxy carrying its accessible name.**
Bodies are drawn to canvas and canvas has no accessibility tree, so each Body's
name, role, and state live on its index entry, not on the drawing. Each entry is
a `<button>` (it acts; it does not navigate) whose accessible name is the
Client name or the Project title, and whose Deep/Shallow state is exposed as
**text within the entry**, not as an ARIA attribute and not as a visual marker
alone — floor point 6 requires a screen-reader user to answer *which entries are
worth reading*, and only text does that. `aria-pressed` reflects Focus.
The canvas root is `aria-hidden="true"`: it duplicates the index and narrating
it twice is worse than not narrating it once.

**P3 — Focus is moved deliberately, and returned deliberately.**
On Focus entry, DOM focus moves to the panel's container (`tabindex="-1"`,
labelled by the entry's heading). On release, focus returns to **the index entry
that opened it** — never to the document root, never lost to the canvas. This is
WCAG 2.4.3 (Focus Order) and 2.4.11 (Focus Not Obscured); it is also what
makes the keyboard usable. A visitor who releases Focus and finds themselves at
the top of the document has been ejected from their place in a career.

**P4 — Motes reach assistive technology through the panel, not the orbit.**
Floor point 8 says Skills are announced; the ratified no-second-interaction rule
says a Mote must never require a hover or a click. Both hold only if the Skills
are **present in the panel's DOM as a list** at the moment Condensation begins —
visually rendered as orbiting Motes for sighted visitors, and read as a plain
list by a screen reader, from the same markup. There is no live region: the
Skills are static content that arrives with the panel, not an event to announce.
A live region here would narrate an orbit, which is noise.

`[NOTE FOR UX] P1–P4 are the minimum structure the principle needs; they are
Sally's specification, not a ratified user decision, and they have not been
tested with a real screen reader. Testing is the open item — the structure is
not.]`

### 11.2 Reduced motion

`prefers-reduced-motion: reduce` is honoured **across the whole product, the
Rail included** — not only Focus and Condensation. The Rail is the largest
continuous camera movement in the product and omitting it would leave the
setting cosmetic.

Under reduced motion, and without introducing a cut (FR-17 holds — the
transition shortens, it does not become a jump):

- Rail traversal between Client stops shortens to the floor of its easing curve
  rather than playing its full arc. The camera still travels; it travels briefly.
- Focus recompose and Condensation shorten identically.
- Parallax, drift, and idle orbital motion stop. Orbits are drawn, not animated.
- Dwell is unchanged. Reading time is not motion.

**Reduced motion and Fallback routing are independent.** A visitor who prefers
reduced motion on a capable machine receives the 3D scene with motion reduced —
never the Fallback. Conflating the two silently demotes a stated preference into
a capability judgement, and takes the scene away from someone who did not ask to
lose it. Capability detection (Q9) decides the Fallback; the media query decides
motion; neither reads the other.

---

## Open Items

`[ASSUMPTION]` items carry a proposed value and need ratification.
`[NOTE FOR UX]` items are gaps where nothing upstream gave a value.

### Assumptions requiring ratification

| # | Item | § | PRD Q |
|---|---|---|---|
| E-A1 | Shallow rule line uses identical wording on all ~7 entries | §3 | Q5 |
| E-A2 | Dwell at a Client stop derives from count of Deep Projects in that system | §5.3 | Q7 |
| E-A3 | Focus entered by explicit activation only — not dwell, proximity, or scroll-stop | §5.4 | **Q15** |
| E-A4 | Focus released by Escape / close / different Project / explicit scene gesture; **never** on pointer-out | §5.5 | **Q15** |
| E-A5 | A→B Focus transition overlaps decay and condensation; no dead beat | §6.4 | Q6 |
| E-A6 | Free flight is entered implicitly by first use of any of the three layers; return occupies the stateful right-bottom chrome slot | §6.5 | **Q8** |
| E-A7 | Reduced motion: durations shorten to the floor of the easing curve, Rail included; no cuts introduced | §11.2 | — |
| E-A8 | Contact = visible copyable address; copy feedback is in-place microcopy, never a toast — **ruled 2026-10-22 (6.3)**, the address `t.navarro9@laposte.net` supplied the same day | §7.5 | Q10 |
| E-A9 | Three derived tempos — Held / Passed / Traversed | §8 | Q7, §15 |
| E-A10 | No third tier between mobile Fallback and desktop scene; window size is not a capability signal | §10 | Q9 |

### Gaps — nothing upstream to work from

| # | Item | § | PRD Q |
|---|---|---|---|
| E-G1 | **Default Shot template** — angle, distance, framing rule for an un-authored Client; which entities earn a hand-authored Shot. Now the sole composition for most of the journey and carrier of the selectivity burden. Highest-leverage gap in this document. | §6.2 | **Q14** |
| E-G2 | **Fallback detection mechanism** — capability-based, performance-based, or device-class-based; and what a capable tablet receives. | §9.3, §10 | **Q9** |
| E-G3 | **The run-of-Shallow problem is relocated, not solved.** Consecutive Client stops with no Deep Project leave a flat stretch; nothing ratified addresses it. Time order (FR-16) forbids reordering. | §8 | §15 |
| E-G4 | **Total journey length untested.** ~5–6 stops is plausibly under a minute; whether that satisfies UJ-1 is unknown. Check at M1 with Dwell. | §8 | — |
| E-G5 | **Screen-reader behaviour during camera motion.** Whether Rail progress is announced at all. Needs testing, not reasoning. | §11 | — |
| E-G6 | **Mote label degradation above ~12 simultaneous labels.** No entry exceeds nine today. | §4.4 | Q6 |

### Resolved since drafting

| # | Item | Resolution |
|---|---|---|
| ~~Colophon~~ | FR-21 launch requirement with no state, interaction, or accessibility spec | **Closed.** §4.7 — a static page rendering the live JSON, entered from left-top identity chrome, returning to the stop the visitor left. The most accessible surface in the product: no canvas, so none of the §11.1 preconditions apply. |
| ~~A11y B1–B4~~ | Index DOM structure, canvas accessible names, Mote announcement, focus management | **Closed.** §11.1 P1–P4 state the structure the *camera is presentational, index is the interface* model rests on. Testing remains open (E-G5); the structure does not. |
| ~~Escape overload~~ | `Escape` bound to both Focus-release and free-flight-return with no precedence | **Closed.** §7.1a — innermost first, one press releases one layer, never two. |
| ~~Reduced motion scope~~ | Covered Focus and Condensation but not the Rail | **Closed.** §11.2 — covers the Rail, and states that reduced-motion and Fallback routing are independent. |

### Deferred to M1 greybox tuning — shape and ratio only, never milliseconds

| # | Item | Shape this document fixes | PRD Q |
|---|---|---|---|
| E-T1 | Condensation and Decay timing | Fast — faster than the visitor's decision to look. Information was asked for; the reader must not wait. Decay is the same curve reversed. | Q6 |
| E-T2 | Dust density at rest | Enough medium that ~15 Bodies read as space; never fog; never ambiguous against a Body's stroke. | Q6 |
| E-T3 | Dwell ratio, Deep-bearing vs not | Measurably longer, and it must read as deliberate rather than as stalling. | Q7 |
| E-T4 | Sequence rhythm across a run | Variation must exist and must mean something; uniform Dwell reads as a conveyor belt, arbitrary variation teaches a false signal. | Q7, §15 |
| E-T5 | First Paint | **Principle adopted** — nothing gates the first frame, no splash, no consent, no click-to-enter. **The 2.5s number is NOT adopted** and is carried unratified. | **Q1**, §15 Flag 04 |

### Cross-references

Visual specification of every component behaviour above lives in
[DESIGN.md](./DESIGN.md). The **collision rule** (§4.3 here, §7.3 there) is
written into both spines deliberately and must stay consistent in both — it is
the single rule most likely to be lost in implementation, because both
treatments are individually reasonable and only their combination fails.
