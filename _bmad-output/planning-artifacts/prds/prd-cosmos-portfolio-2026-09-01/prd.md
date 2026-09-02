---
title: Cosmos Portfolio
status: draft
created: 2026-09-01
updated: 2026-09-01
---

# PRD: Cosmos Portfolio

## 0. Document Purpose

This PRD is for Thomas as builder and sole owner, and for the downstream BMad workflows that consume it — UX, architecture, and epic/story breakdown. It builds on a completed planning chain and does not duplicate it: the [brainstorm](../../../brainstorming/brainstorm-cosmos-scrollytelling-portfolio-2026-08-30/brainstorm-intent.md) established the concept and build order, the [product brief](../../briefs/brief-cosmos-portfolio-2026-08-31/brief.md) and its [addendum](../../briefs/brief-cosmos-portfolio-2026-08-31/addendum.md) established the domain model and architectural rot defences, and the [PRFAQ](../../prfaq-cosmos-portfolio.md) stress-tested the concept customer-first and amended four brief decisions. **Where this PRD and the product brief conflict, the PRFAQ's four drift flags govern.** Flags 01, 02, and 03 are resolved and are reflected here as settled. **Flag 04 (First Paint vs. tradeable load time) is marked OPEN in the source and remains open here** — its principle is adopted, its number is not ratified (NFR-1, §13 Q1).

Structure: vocabulary is anchored in a Glossary (§3) that the rest of the document uses verbatim; features are grouped with functional requirements nested and numbered globally FR-1..FR-24, plus FR-12a and FR-17a added at finalisation to close contradictions; user journeys are numbered UJ-1..UJ-4 and referenced by ID from FRs; inferences are tagged inline `[ASSUMPTION]` and indexed in §14, and open items carry `[NOTE FOR PM]` callouts. Six assumptions carry proposed values for items the upstream chain left explicitly unresolved — each has a corresponding entry in §13 Open Questions. **They are proposals awaiting ratification, not decisions.** §15 records findings from the finalisation review gate that were deferred rather than fixed, each with an owner.

The career inventory itself — the actual client, project, and `notable` content — is not in this PRD. It lives in [inventory-draft.md](../../briefs/brief-cosmos-portfolio-2026-08-31/inventory-draft.md) and is tracked here only as a scope-and-gate concern (§8.3, FR-9).

## 1. Vision

Cosmos Portfolio presents a consulting career as a navigable universe. Clients are stars. The projects delivered for them are planets in orbit. The skills behind each project exist as interstellar dust that condenses into visible bodies when a project is examined, and decays back when attention moves on. Scrolling runs time backward, from the present into the past.

It is not a CV, and it does not try to be. Visitors arrive from LinkedIn or from the CV itself, already holding the job titles and the dates. They click because something suggested this person built a universe. The site's job is narrow and it is honest about being narrow: it does not change a hiring decision, it changes whether the conversation happens at all, and whether the link gets forwarded. It is top of funnel. Its success condition is a champion sending it to a colleague with *"look at this."*

What makes it a work sample rather than decoration is that the reasoning is visible. The layout is never authored — positions are solved by a force simulation from a single embedded JSON file, so adding a project in five years costs one entry and one number. Entities are typed by which fields they lack rather than by explicit type flags. Camera shots name entities rather than coordinates, so a re-settled simulation moves the shot with its subject instead of stranding it in empty space. These are the claims the site actually makes about how its author works, and a visitor can inspect every one of them.

The author wanted to build it. The professional case is real and was not retrofitted as primary. That candour is consistent with the site's own editorial stance and is preserved deliberately throughout this document.

## 2. Target User

### 2.1 Jobs To Be Done

- **Be memorable among forty.** A technical reader has a stack of similar CVs. This makes one of them stick.
- **Be forwardable.** Give a champion an artifact worth sending onward with no accompanying explanation.
- **Show judgement, not just delivery.** Convey what the problem was, what made it hard, and what was decided — the part a two-page CV compresses out by design.
- **Prove capability by demonstration.** For someone whose claim is that they can build difficult things, be the evidence rather than a description of the evidence.
- **Stay true without upkeep.** Absorb new work by construction so it is still accurate in five years at near-zero maintenance cost.
- **Be built.** The author wanted to make this. Stated plainly, not sanitised.

### 2.2 Non-Users (v1)

- **Non-technical recruiters.** They will visit and many will not scroll far. Accepted. The CV that linked here already served them, and the Fallback (FR-22) is the floor they land on if their machine cannot run the scene.
- **Mobile 3D visitors.** No 3D on mobile in v1. The Fallback serves them.
- **Anyone seeking dates and employers.** That information is upstream in the CV and LinkedIn profile, which is why backward time is not user-hostile here.

### 2.3 Key User Journeys

- **UJ-1. Marc follows the link from a CV and forms an opinion in the first fifteen seconds.**
  > Marc, an engineering lead screening candidates for a senior backend role, has the PDF open in one tab and eleven others behind it. A line at the top of the CV points at a URL, and something about the phrasing makes him click. The scene resolves fast — a schematic starfield, monochrome, structural, clearly not a template. He scrolls. Time runs backward and the camera moves through the universe on a rail rather than dumping him into free flight. He does not read anything yet. He is deciding whether this is worth attention, and the opening frame answers yes. **Climax:** he keeps scrolling instead of closing the tab. **Resolution:** he is now inside UJ-2. **Edge case:** his corporate laptop cannot run WebGL, so he gets the Fallback, and it still tells him what this is rather than showing an error.

- **UJ-2. Priya slows down on one entry and reads a full paragraph.**
  > Priya, a senior peer who was sent the link by a colleague, is exploring rather than screening. The camera brings her to a client star with several planets around it. One planet holds a `notable`; the camera dwells on it noticeably longer than the ones before, and the information layer offers a hundred and fifty words of connected prose — a problem, a specific unfakeable constraint about the real environment, and a decision with the rejected alternative named. As she focuses the project, the dust around it condenses into orbiting bodies carrying the technologies. **Climax:** she finishes the paragraph and thinks *this person can think* — the core bet of the entire product, and the one thing that has never been tested. **Resolution:** she continues, now reading rather than skimming, and can tell which of the remaining entries are worth the same attention.

- **UJ-3. Tom receives the link cold and has no reason to wait.**
  > Tom gets a Slack message from a colleague containing only a URL and the word "look." He has no context, no prior interest, and no investment. The link preview renders as a composed image rather than a blank card. He taps it between meetings. Whatever arrives in the first two and a half seconds is the entire product as far as he is concerned. **Climax:** the opening frame lands before his patience does. **Resolution:** he either scrolls, entering UJ-1's path with less context, or he leaves — and if he leaves, funnel positioning has failed at its only mechanism. **Edge case:** he is on a phone, so he gets the Fallback, and the preview image has to have been honest about that.

- **UJ-4. Thomas adds a project in 2029 and the site absorbs it.**
  > Three years on, Thomas finishes an engagement worth publishing. He opens the embedded JSON, adds one entry, and sets one `weight` value. He does not position anything, does not touch a camera shot, does not rebalance a layout. The simulation re-settles, the new body finds its place, and every existing shot still frames its subject because shots name entities rather than coordinates. **Climax:** the site is current again, and the edit took minutes. **Resolution:** the document is still true, which is the difference between a living portfolio and a snapshot that rotted. **Edge case:** the new entry has no publishable decision, so `notable` stays empty and it renders as a planet with no moon — no schema change, no special case.

## 3. Glossary

Downstream workflows and readers use these terms exactly. Introducing a synonym anywhere is a discipline violation.

- **Company** — an intermediate consultancy holding both the client contract and Thomas's contract. The payer. **Never a body**; an attribute of a Project. Approximately 2 exist.
- **Client** — the end company where work actually happened. Rendered as a **Star**. Approximately 5–6 exist. Holds 1..n Projects.
- **Project** — one delivery for exactly one Client. Rendered as a **Planet** orbiting its Client. Approximately 10 exist. Carries a Company as an attribute.
- **Skill** — a capability or technology used on one or more Projects. Rendered as **Dust** at rest and as a condensed orbiting Mote while its Project is Focused. Never positioned permanently. Unbounded in count.
- **Body** — any permanently positioned object in the scene: a Star or a Planet. Roughly 15–16 total (5–6 Stars plus ~10 Planets; Companies are never Bodies). Condensed Skills are **Motes**, not Bodies.
- **Mote** — a Skill in its condensed state, orbiting a Focused Project. Transient by definition: it exists only while its Project is Focused, and is never counted among the Bodies.
- **Notable** — the prose field on a Project carrying problem → constraint → decision in 100–150 words. **Populated only where a real decision exists.** Its presence or absence defines the two Project classes.
- **Deep Project** — a Project with a populated Notable. Approximately 2–3 at launch.
- **Shallow Project** — a Project with an empty Notable. Approximately 7 at launch. Carries every other field. Referred to informally as "a planet with no moon."
- **Weight** — the single manual relevance knob per entry, default `1`. The only number authored by hand.
- **Focus** — the state of a Project being examined, which triggers Condensation of its Skills and reveals its information layer.
- **Condensation** — Dust resolving into discrete orbiting Motes on Focus. **Decay** is the same process reversed, on release.
- **Rail** — an authored camera trajectory. Composed of Shots.
- **Shot** — one camera framing, defined as an entity ID plus relative framing parameters (angle, distance, framing). **Never world coordinates.**
- **Dwell** — how long the journey rests on a Body. Derived from data, not authored.
- **Schematic Identity** — the M2 visual language: monochrome, blueprint, structural. A deliberate idiom, not an unfinished state.
- **Colophon** — the static surface outside the 3D scene that shows the data file and the mapping rules.
- **Fallback** — the flat star chart served to machines that cannot run the 3D scene.
- **First Paint** — the first frame of the Schematic scene, the launch-gated performance moment.
- **The Forward** — the second-order visitor who receives the link from a colleague with no context. The mechanism funnel positioning depends on.

## 4. Features

### 4.1 Data Model and Computed Layout

**Description:** A single embedded JSON file is the sole source of truth. A force-directed simulation solves every position from it using three mapping rules. Nothing is hand-positioned, ever, and no CMS or backend exists. Entities are typed by which fields they lack rather than by explicit type flags — classification by absence — which is what keeps the schema from accumulating special cases as the career grows. This feature is the load-bearing claim of the whole product: it is what UJ-4 tests and what the Colophon (§4.6) exhibits.

**Functional Requirements:**

#### FR-1: Embedded JSON as sole source of truth

The site reads all career data from one JSON file embedded in the project. Realises UJ-4.

**Consequences (testable):**
- No network request to any backend, CMS, or API is made to obtain career data.
- Editing the JSON file and rebuilding is the only content-authoring path.
- The file is retrievable by a visitor for inspection (see FR-21).

**Out of Scope:**
- Runtime editing, admin UI, or authenticated content management of any kind.

#### FR-2: Force-directed layout solves all positions

A force simulation computes the position of every Body from the JSON. Realises UJ-4.

**Consequences (testable):**
- No Body position appears as a literal coordinate in any source or data file.
- Re-running the simulation from identical input produces a settled layout in which every Client Star holds its own Projects in orbit.
- Adding an entry and re-running requires no other file change.

**Out of Scope:**
- Per-entry position overrides. Explicitly and permanently rejected — they rot, and the author self-identifies as lazy about upkeep.

#### FR-3: Three mapping rules drive visual properties

Body appearance derives from data via exactly three rules: mass from duration, brightness from recency, distance from the Rail by relevance.

**Consequences (testable):**
- A longer engagement yields a more massive Body than a shorter one.
- A more recent entry renders brighter than an older one.
- A higher `weight` places a Body nearer the Rail.
- No fourth mapping rule exists.

#### FR-4: Single `weight` knob per entry

Each entry carries one manual relevance value, default `1`. Realises UJ-4.

**Consequences (testable):**
- An entry omitting `weight` is treated as `1`.
- `weight` is the only hand-authored number in the data file.

#### FR-5: Classification by field absence

Entity kind is determined by which fields an entry lacks, not by a type flag.

**Consequences (testable):**
- An entry with no parent and no duration is treated as a transient object.
- A Project with an empty `notable` is a Shallow Project and requires no schema change, no flag, and no special case (realises UJ-4 edge case).
- Adding a Project with a populated `notable` later promotes it to Deep with no structural change.

#### FR-6: Company is an attribute, never a Body

The intermediate consultancy is a field on a Project and is never positioned in space.

**Consequences (testable):**
- No Star or Planet represents a Company.
- Company is displayed as a label or tint on the Project's information layer.
- The company ↔ client many-to-many relation resolves as a field lookup, not a graph edge.

**Feature-specific NFRs:**
- Force layout of ~15–16 Bodies must settle within one second on the target hardware profile. The count is small enough that this is generous rather than tight.

**Notes:** `[NOTE FOR PM]` The addendum retains **incremental history-pinning** in reserve — old entries settle once and freeze, new entries find space around them — as a defence should layout drift prove disruptive to existing Shots after several additions. Not in v1 scope; recorded so it is not re-derived from scratch.

### 4.2 Career Content and the Two Project Classes

**Description:** Every Project carries the same schema. The `notable` field is populated only where a real decision exists, producing two classes that the reader can distinguish: Deep Projects with a full narrative, and Shallow Projects that carry client, role, team size, duration, and stack. This is not a quality compromise — it is classification by absence applied to content, and it replaces the brief's uniform-depth promise, which could only be kept at the level of the weakest entry. The claim becomes *a full career, with the arguable moments actually argued.* Realises UJ-2.

**Functional Requirements:**

#### FR-7: Fixed schema for every Project

Every Project carries the identical field set: `client`, `project`, `company`, `role`, `built`, `team_size`, `duration`, `notable`, `skills`, `weight`.

**Consequences (testable):**
- No Project has a field another Project lacks, except by that field being empty.
- No hero-entry or minor-entry variant of the schema exists.
- `duration` is present on every Project, because FR-3 derives mass from it and brightness from its recency, and FR-5 types transient objects by its absence.
- `weight` is present on every Project (default `1`), because NFR-5 and SM-4 make it the entire maintenance contract.

**Notes:** `[NOTE FOR PM]` **`inventory-draft.md` carries the same omission** — its field set lists neither `duration` nor `weight`. Fix it there **before drafting the remaining nine entries**, or every entry will need revisiting. See §13 Q13.

#### FR-8: `notable` is prose carrying problem → constraint → decision

Where populated, `notable` is 100–150 words of connected prose naming a problem, a specific environmental constraint, and a decision including its rejected alternative. Realises UJ-2.

**Consequences (testable):**
- `notable` contains no list, no bullets, and no technology names.
- Each populated `notable` names an alternative that was argued against.
- Content below roughly 90 words is rejected at authoring time as reverting to a job description.

**Out of Scope:**
- Measured outcomes. None exist — metrics were never captured or not retained, and as a consultant Thomas frequently left before outcomes were visible. The **constraint** is the falsifiability substitute: anyone can claim a performance improvement; nobody invents "no container runtime on prem."

#### FR-9: Two Project classes render distinguishably

A visitor can tell which entries carry a Notable before committing to reading one. Realises UJ-2.

**Consequences (testable):**
- A Deep Project is visually distinguishable from a Shallow Project in the scene, not only in the information layer.
- **The distinguishing channel is not brightness.** FR-3 already binds brightness to recency; reusing it for depth would make a dim Body ambiguous between *old* and *not worth reading* — exactly the distinction the M2 gate's second clause tests.
- `[ASSUMPTION: The channel is the Deep Project's satellite — a Deep Project carries a visible companion at rest, a Shallow Project does not. The data-level distinction — "a planet with no moon" — is made literal and needs no channel of its own. Label treatment may reinforce it; brightness may not.]`
- The distinction requires no type flag (satisfies FR-5).
- A visitor can state which entries are worth reading without Focusing any of them.

**Notes:** `[NOTE FOR PM]` The Shallow Project treatment is the **most likely M2 gate failure**. The open risk is whether it reads as useful career breadth or as a LinkedIn export in 3D. Cheap de-risk, and a gate-blocking task rather than a decision: **draft two Shallow entries in full text and read them cold** before committing to the visual treatment. See §13 Q5.

#### FR-10: Skills are a separate relation from prose

The stack is expressed geometrically as Dust. `notable` may name a technology only where the decision *is about* that technology.

**Consequences (testable):**
- No `notable` contains a list, roll-call, or inventory of technologies.
- A technology name appears in `notable` only as a term of the decision — the thing chosen, or the thing rejected.
- A Project's full stack is reachable only through Condensation (FR-13), never by reading `notable`.
- Two channels, no duplication: prose carries reasoning, geometry carries the stack.

**Notes:** `[NOTE FOR PM]` **The draft's absolute ban was contradicted by the one approved entry.** The SNCF `notable` names Oracle, Spring, Spring Boot, and Tomcat — necessarily, because the decision *is* "Spring Boot with embedded Tomcat over the house standard of Spring on external Tomcat." Enforced literally across the remaining nine entries, the ban would flatten precisely the decisions FR-8 exists to capture. The real rule is *no roll-calls*, not *no names*.

#### FR-11: Real client names ship

End client names are published as-is.

**Consequences (testable):**
- No client name is anonymised or genericised. There is no NDA constraint, and recognisable names convert visual polish into credibility.

**Out of Scope:**
- Client relationship friction. Deliberately excluded from publication: a reader cannot verify it, both sides of such an account always exist, and published criticism of a named former client reflects on the author. Recorded so the decision is not silently revisited.

#### FR-12: One engagement may yield several Projects

A Client Star holds 1..n Project Planets.

**Consequences (testable):**
- A single engagement producing two distinct problems renders as two Planets around one Star.
- Each retains its own problem, constraint, and decision rather than blurring them together.

### 4.3 Skills as Condensing Dust

**Description:** Every Skill exists permanently as diffuse interstellar Dust filling the space between Bodies. Focusing a Project condenses its Skills out of that Dust into orbiting Motes; releasing Focus decays them back. Nothing spawns and nothing teleports, so the physics stays honest — and because a Skill is never permanently anywhere, one Skill can serve every Project that used it without duplication. The Dust also solves a compositional problem: fifteen objects in a void reads as sparse, fifteen objects in a medium reads as space. Realises UJ-2.

**Functional Requirements:**

#### FR-12a: Focus interaction model

A visitor can enter, hold, and leave Focus on a Project, and reading is possible while Focus is held. Realises UJ-2.

**Consequences (testable):**
- Entering Focus on a Project reveals its information layer and triggers Condensation (FR-13).
- **While Focus is held, scroll does not advance the journey.** Reading 150 words of prose cannot move the camera off the thing being read.
- Leaving Focus returns scroll control to the journey (FR-16) and triggers Decay.
- Focus is reachable both on-Rail and in free flight (FR-19).
- A Shallow Project can be Focused; it simply has no `notable` to reveal.

**Notes:** `[NOTE FOR PM]` **This FR closes a gap that made UJ-2 unbuildable.** The Glossary defined Focus and four requirements depended on it, but nothing said how a visitor triggers or releases it — and scroll was doing double duty, driving both the camera (FR-16) and, implicitly, reading. UJ-2's climax ("she finishes the paragraph") could not happen if scrolling to read moved the camera away. Whether Focus is entered by dwell, click, scroll-stop, or proximity is a **UX decision, deliberately not made here**; what this FR fixes is that the two scroll behaviours must not collide. See §13 Q15.

#### FR-13: Skills condense on Focus and decay on release

Focusing a Project resolves its Skills from Dust into discrete orbiting Motes; releasing Focus reverses the process. Realises UJ-2.

**Consequences (testable):**
- No Mote exists in the scene while its Project is unfocused.
- Condensation and Decay use the same implementation, reversed — one tuning pass, guaranteed visual coherence.
- No Skill is ever instantiated in more than one place at one time.
- No object spawns from nothing or teleports at any point.

#### FR-14: No drawn connector lines

Project ↔ Skill relations are never rendered as lines or edges.

**Consequences (testable):**
- The scene contains no connector geometry between Bodies. A network diagram in a space costume would be read as exactly that by the target audience.

#### FR-15: Dust is present at rest

Skills exist as a visible diffuse medium when nothing is focused.

**Consequences (testable):**
- Dust is visible in the space between Bodies in the resting scene.
- Dust density does not obscure Bodies or read as fog.

**Notes:** `[NOTE FOR PM]` Open implementation questions carried from the addendum, all cheapest to tune at M1: condensation and decay timing; how much Dust is visible at rest before it becomes fog; whether Skill labels are legible only while condensed; and behaviour when Focus moves directly from Project A to Project B — cross-fade, or full decay then re-condense. See §13 Q6.

### 4.4 Backward-Time Navigation and Camera

**Description:** Scrolling runs time backward, present to past. The camera follows authored Rails by default, with free flight available on request. Rails are the composition — a force solver has no judgement, and under a work-sample framing a badly composed hero frame reads as having no eye. But Shots name entities rather than coordinates, so a re-settled simulation moves the Shot with its subject. Framing is authored; Dwell is derived. Realises UJ-1, UJ-2, UJ-4.

**Functional Requirements:**

#### FR-16: Backward-time scroll

Scrolling moves the visitor from the present into the past. Realises UJ-1.

**Consequences (testable):**
- The most recent entry is encountered first.
- Backward time serves three masters at once: an aesthetic conceit, the correct ordering for a professional reader, and a non-arbitrary home for the ending. One decision, three payoffs.

#### FR-17: Authored entity-relative camera Rails

The default journey follows Shots, each defined as an entity ID plus relative framing parameters. Realises UJ-1, UJ-4.

**Consequences (testable):**
- No Shot definition contains a world coordinate.
- Adding entries and re-settling the simulation leaves every existing Shot framing its intended subject.
- A Shot specifies angle, distance, and framing relative to its named entity.
- A Shot transition is continuous camera movement, never a cut. *"It does not jump; it flies."*

**Out of Scope:**
- Coordinate-addressed Shots. A Shot naming a coordinate silently frames empty space after the simulation re-settles, and a bad Shot throws no error — it just quietly looks worse.

#### FR-17a: Every Project is visited without authoring a Shot

A newly added Project is reached by the Rail with no hand-authored Shot. Realises UJ-4.

**Consequences (testable):**
- Adding a Project to the JSON and rebuilding produces a journey that visits it, with no edit to any Shot definition.
- A default Shot template, parameterised by entity kind and Project class, supplies framing for any entity lacking a hand-authored Shot.
- A hand-authored Shot, where one exists, overrides the default for that entity.

**Notes:** `[NOTE FOR PM]` **This FR resolves a direct contradiction in the draft.** FR-17 makes Rails authored; NFR-5 and UJ-4 promise that adding a Project costs one JSON entry and one number with *no camera work*. Both could not be true: entity-relative framing absorbs drift for Shots that already exist, but conjures no Shot for a new entity. The resolution is a **default-plus-override** model — every entity is framed by template, and hand-authoring is an optional upgrade for entities that earn it. This preserves the authored eye where it matters (the opening, the Deep Projects, the ending) without making entry eleven a camera task. The alternative — hand-authoring every Shot — would break the maintenance claim that NFR-5, SM-4, UJ-4, and the Colophon all rest on. See §13 Q14.

#### FR-18: Dwell derives from data

How long the journey rests on a Body follows from whether it carries a Notable, not from a hand-tuned number. Realises UJ-2.

**Consequences (testable):**
- A Deep Project receives measurably longer Dwell than a Shallow Project.
- No per-entry Dwell value is authored by hand.
- Adding an entry requires no Dwell tuning (satisfies UJ-4).

**Notes:** `[NOTE FOR PM]` Dwell needs actual numbers: how much longer on a Deep entry, whether the transition reads as deliberate or as stalling, and behaviour across a run of three consecutive Shallow entries. Tune at M1 on the greybox where it is cheapest. See §13 Q7.

#### FR-19: Free flight on request

The visitor may leave the Rail and navigate freely.

**Consequences (testable):**
- Free flight is opt-in; the default experience is on-rail.
- A visitor in free flight can return to the Rail.

**Notes:** `[NOTE FOR PM]` Free-flight boundaries — how far a visitor may roam and how they return — are unresolved from the brief. See §13 Q8.

### 4.5 Schematic Visual Identity

**Description:** M2 ships with no realism pass, and this is the launch milestone. A greybox reads as unfinished only when it pretends to be finished, so M2 ships as an intentional visual language — monochrome, blueprint, schematic, structure as the aesthetic. This is a legitimate idiom with its own rigour, and it signals structure over decoration to exactly this audience. It was promoted from open question to launch blocker by Flag 03, and it sits in the author's self-identified weakest discipline, giving it the widest confidence interval of any launch task.

**Functional Requirements:**

#### FR-20: Coherent schematic visual system

The site presents a deliberate monochrome Schematic Identity across scene and information layer. Realises UJ-1.

**Consequences (testable):**
- A defined palette, line weight, typography, label treatment, and UI chrome exist and are applied consistently.
- No element reads as a placeholder or as an untextured asset awaiting a pass.
- No "work in progress" disclaimer appears anywhere. A disclaimer invites the exact judgement it tries to pre-empt and does not neutralise a first impression.

**Out of Scope:**
- Photographic textures, realistic lighting, and post-processing. These are M3, and M3 is now an upgrade to a live site rather than a launch gate.

### 4.6 Technical Colophon

**Description:** The transfer claim is that the site proves *how its author works* — and the evidence is the architecture, not the graphics. Domain differs; engineering judgement transfers. That claim only holds if the reasoning is visible to visitors, which makes the Colophon a launch requirement rather than a flourish. The argument is *look at the model*, so the Colophon must show the data and the rules rather than describe them.

**Functional Requirements:**

#### FR-21: Colophon exhibits the data file and mapping rules

A surface outside the 3D scene shows the actual data and the rules that act on it. Realises UJ-2.

**Consequences (testable):**
- The real JSON is shown or directly retrievable, not paraphrased.
- The three mapping rules are stated and visibly tied to actual values from the data.
- The entity-relative Shot contract and the no-position-overrides rule are stated.
- `[ASSUMPTION: The Colophon is a static HTML page outside the 3D scene, rendering the live JSON alongside the three mapping rules annotated against real values from it — mass from this duration, brightness from this date, distance from this weight. No 3D work required, which is the cheapest defensible form that still shows rather than describes.]`

### 4.7 Fallback and Contact

**Description:** Machines that cannot run the 3D scene get the Fallback rather than an error, and it must still do the job. The designed ending — the collapse into a black hole that becomes the contact surface — is M4, post-launch. M2 therefore needs only a conventional contact route, and the contact mechanism no longer blocks launch.

**Functional Requirements:**

#### FR-22: Flat star-chart Fallback

Visitors on incapable machines receive the Fallback. Realises UJ-1 edge case, UJ-3 edge case.

**Consequences (testable):**
- **Capability is detected, not assumed.** Detection precedes rendering — no visitor sees a failed or degraded 3D scene before being routed.
- **The Fallback is content-complete:** every Project, every field, and every `notable`. It is not a teaser, a stub, or an error page.
- A Fallback visitor can satisfy the M2 gate — state what Thomas does and which entries are worth reading — without the 3D scene.
- Mobile visitors receive the Fallback (mobile 3D is out of scope).
- The Fallback is subject to NFR-7: legibility is the job, and here it is the only job.

**Notes:** `[NOTE FOR PM]` **Scope was settled in the PRFAQ and the draft wrongly carried it as open.** The Fallback serves The Forward — the reader SM-1 depends on — and mobile, which is a large share of Slack-link opens. It is a second product with one FR, and it deserves proportionate attention. What remains genuinely open is only the *detection mechanism*, not the content scope. See §13 Q9.

#### FR-23: Conventional contact route at launch

A working contact mechanism exists at M2 without the designed ending.

**Consequences (testable):**
- A visitor can initiate contact from the launched site.
- The mechanism requires no backend (satisfies **NFR-6**).
- The route works on the target hardware profile (NFR-4) without depending on a configured mail client — a bare `mailto:` dead-links on exactly the corporate laptops NFR-4 names, so a visible, copyable address or an equivalent is required alongside or instead.
- It is explicitly unglamorous; the designed ending is M4.

#### FR-24: Designed shareability

The link renders as a composed artifact when pasted into Slack, LinkedIn, or a message. Realises UJ-3.

**Consequences (testable):**
- A link preview image exists and is deliberately composed rather than auto-derived or blank.
- The opening frame is composed with the knowledge that it will be screenshotted.
- Preview and title do not overstate what a mobile or Fallback visitor will receive.

**Notes:** Shareability as a *designed property* rather than an observed outcome is new — it appears nowhere in the brief and was introduced by funnel positioning, under which The Forward is the mechanism the whole concept rests on.

## 5. Cross-Cutting NFRs

- **NFR-1 — First Paint.** `[ASSUMPTION: The first frame of the Schematic scene renders within 2.5 seconds on the target hardware profile over a median broadband connection. Everything behind it — full Dust density, remaining Bodies, complete Rail — may stream in.]` This is a **launch requirement**, not a tradeable. It exists because of The Forward, who has no context and no reason to wait, and it is affordable specifically because M2 ships no photographic textures. **Nothing gates the first frame:** no consent banner, no cookie notice, no splash, no "click to enter" — there is nothing to accept, and anything interposed spends the budget this NFR exists to protect.
- **NFR-1a — The opening fifteen seconds.** Within roughly fifteen seconds of First Paint, an unprompted visitor should register three things: that this is a **real work history**, that it is **organised rather than listed**, and that it is **deliberately designed**. This is the contract UJ-1 and UJ-3 are both testing, and it sets what the opening Shot must frame. *(NFR-1 governs how fast the frame arrives; this governs what it must accomplish once it does.)*
- **NFR-2 — Runtime framerate.** `[ASSUMPTION: 30fps at 1080p on 2023-era integrated graphics with full post-FX is the M3 target. This value is PROPOSED in the brief addendum and has never been ratified by the author — it is carried here unratified, not adopted.]` This is an **M3 gate, not a launch gate** — M2 ships no realism pass. Thirty rather than sixty because the content is slow camera movement through mostly static geometry, the exact case where 30 reads cinematic rather than broken, and holding 60 on integrated graphics would cost texture resolution and post-FX, both of which serve realism. **Until ratified, the M3 gate has no testable threshold.**
- **NFR-2a — Fallback floor.** `[ASSUMPTION: The Fallback is served below 24fps sustained, not below 30.]` NFR-2 sets the *target*; this sets the *floor at which the 3D scene is abandoned*. The two numbers are deliberately different, and conflating them was an error in the draft: a scene running at 26fps should keep running, because NFR-3 says the real thing at 24fps beats a lesser thing at 30. See §13 Q16.
- **NFR-3 — Degradation policy: quality holds, frames drop.** A viewer served a stripped-down render judges the stripped-down render, unaware a better version existed. Better the real thing at 24fps than a lesser thing at 30. A stable framerate reads smooth where a fluctuating one reads broken even at a higher average.
- **NFR-4 — Target hardware profile.** A three-year-old laptop with integrated graphics at 1080p: the corporate work-laptop profile of the actual audience. Explicitly not a current Apple-silicon machine and not the dev machine.
- **NFR-5 — Maintenance cost.** Adding a Project costs one JSON entry plus one `weight` value: no layout work, no camera rework, no repositioning. A living document that stays true for a decade at near-zero upkeep is an explicit requirement, not a nice-to-have.
- **NFR-6 — No backend.** No CMS, no API, no server-side component, at any milestone.
- **NFR-7 — Content legibility outranks awe.** The site has one job: *if you read two Projects, you should know how Thomas thinks.* Everything else on screen is in service of getting the visitor to slow down long enough to read two Projects. Awe is **instrumental**, not co-equal — it is the delivery mechanism, and communication is the job. **This is the tie-breaker:** where FR-20 (visual identity), FR-18 (Dwell), or FR-13 (Condensation) conflict with legibility, legibility wins. A version of this site that is more beautiful and less legible is a worse version.

## 6. Constraints and Guardrails

- **Not tradeable (quality gates for the finished artifact):** realism of materials and lighting, immersion, visitor awe, runtime framerate. **These are not launch gates.** They had been functioning as preconditions to existing, which is what kept the finish line receding. Reconciling them was Flag 03.
- **Tradeable:** total load time for the full experience, breadth of content, build time. **First Paint is carved out** and is not tradeable (NFR-1).
- **Scope guardrail.** M2 is frozen as defined in §8.1. Every subsequent addition routes to M3 by default. The bar for adding to M2 is **"the site is actively misleading without it,"** not "this makes it better." M2 roughly doubled in a single session and there is no architectural equivalent of the rot defence for scope — this rule is the substitute.
- **Solver bounding as a safety net.** Bounding the force solver — minimum separation, bounding volume, no-fly zones — was never rejected outright and is retained specifically to guard background drift, which entity-relative framing does not cover.
- **Realism is borrowed, not modelled.** This is the feasibility argument for the entire product and it constrains M3. The visual bar is met with NASA/ESA public-domain texture maps, drei built-ins, and post-processing film artifacts — not with authored 3D models. The subject was chosen partly *because* it needs almost no modelling: spheres, textures, and light. The author places his own 3D modelling skill below the quality bar he refuses to lower, so any requirement that reintroduces modelling reintroduces the risk the whole approach was designed to route around. This is a standing constraint, not backstory — it is why R-6 is scoped to the two bookend shots and nothing else.
- **Editorial constraint.** The author's motive (he wanted to build it) is stated plainly and is not to be sanitised in this or any downstream document.

## 7. Non-Goals (Explicit)

- **Not a CV, and not a CV substitute.** The facts are upstream and stay there.
- **Does not change a hiring decision.** Top of funnel. It changes whether the conversation happens and whether the link is forwarded — a deliberately narrower claim than the brief's implied one.
- **Not optimised for non-technical recruiters.** Accepted, not regretted.
- **No astronomical accuracy.** Realism of materials and light, never of scale or distance.
- **No competitive claim.** No assertion is made anywhere about the WebGL-portfolio landscape or about what technical readers do with such sites. Competitive research was deliberately not run and judged unnecessary rather than skipped — the only comparison made is against the reader's existing alternative, a PDF CV, which needs no external data. `[NOTE FOR PM]` If any downstream document asserts otherwise, it must research it first.
- **Build difficulty is never claimed.** It cannot appear without becoming a boast, and the reader never perceives it. Capability is inferred from an artifact that works.
- **Not a general-purpose visualisation engine.** That the same engine could lay out anything with duration, relation, and relevance is a vision note, not a v1 requirement.

## 8. Scope

### 8.1 M2 — Launch Scope (frozen)

The launched site is M2: greybox with the information layer. This is the smallest version worth linking from a CV, and it is the first point at which the thing is true.

- Computed force-directed layout from embedded JSON; the three mapping rules; the single `weight` knob (FR-1..FR-6)
- Information layer with the fixed field set; two Project classes; ~2–3 Deep and ~7 Shallow entries (FR-7..FR-12)
- Skills as Dust with Condensation on Focus and Decay on release (FR-13..FR-15)
- Backward-time scroll; authored entity-relative Rails; derived Dwell; free flight on request (FR-16..FR-19)
- Deliberate Schematic Identity (FR-20) — promoted from open question to launch blocker
- Technical Colophon (FR-21) — required by the transfer claim
- First Paint budget (NFR-1)
- Flat star-chart Fallback (FR-22)
- Conventional contact route (FR-23)
- Designed shareability: link preview and composed opening frame (FR-24)

**M2 gate:** *Can a stranger tell what Thomas does — and can he tell which entries are worth reading?* The second clause became load-bearing the moment two Project classes were adopted.

### 8.2 Out of Scope for MVP

- **Realism pass** — textures, lighting, post-processing. **M3.** No longer a launch gate; an upgrade to a live site. This inverts the completion dynamic entirely.
- **Collapse ending and black-hole contact surface** — **M4.** Holds the emotional climax; the arc is awe then calm, and the universe ends peacefully.
- **Fun layer** — **M5.** Anything remaining that earns its place.
- **Mobile 3D** — the Fallback serves mobile.
- **Astronomically accurate distance or scale.**
- **Per-entry position overrides** — permanently rejected, not deferred.
- **CMS or backend of any kind** — permanently rejected.
- **Belt-merging of clustered small items** — ~15–16 Bodies is far too few to cluster. Revisit only on several-fold growth.
- **Nebula gaps, meteor taxonomy, mass-damped scroll, date readout** — brainstorm "Should" items, none load-bearing for the M2 gate.

### 8.3 Content authoring (gates M2)

The career inventory is the single largest remaining task and it gates the launch milestone. One entry (SNCF, MDM replacement) is drafted and approved; roughly nine remain across ~5–6 clients.

- Every entry needs the full field set regardless of class.
- Deep entries additionally need a `notable`, and the question that surfaces one is **"what did you argue for, and what did you argue against?"** — asked explicitly, every time. Raw recall does not reliably produce the decision: the first SNCF draft produced a plausible-but-wrong decision that inverted what actually happened.
- Roughly seven engagements plausibly contain no publishable decision. That is not a writing backlog — much professional work is competent delivery where no alternative was contested. Those ship Shallow.

## 9. Milestones

Each milestone has a gate. No vertical slice first — deliberate.

| # | Milestone | FRs | Gate |
|---|---|---|---|
| **M0** | **Cold-read — no code.** Draft two Shallow Projects and one Deep Project in full text. Hand them to a technical reader with no context. | — | **Does a reader stop and read the `notable`? Can they tell the two classes apart on the page?** |
| M1 | Greybox — schema, force layout, Rails, backward scroll, Focus, untextured | FR-1..FR-6, FR-12a, FR-16..FR-19, FR-17a | Does the pacing work with no visual polish at all? |
| **M2** | **Information layer + Schematic Identity + Colophon — LAUNCH** | FR-7..FR-15, FR-20..FR-24, NFR-1 | **Can a stranger tell what he does, and which entries are worth reading?** |
| M3 | Realism pass — textures, lighting, post-FX | NFR-2, NFR-2a | Does it hold NFR-2 on the target hardware profile? |
| M4 | Collapse ending — bookends and contact surface | — | Does the ending land as awe then calm? |
| M5 | Fun layer | — | Does each addition earn its place? |

**M0 is new, and it is the highest-value item in this table.** It needs no code, no design, and no infrastructure. The SNCF `notable` already exists, so M0 is one Deep entry plus two Shallow entries away from testing the assumption every other milestone is built on: *that a technical reader will stop and read 150 words of prose.* R-2 says that bet is untested; R-3 says the Shallow treatment is the most likely gate failure. **M0 tests both, this week, for the cost of writing three entries** — and if the bet fails, it fails before a line of code exists. Scheduling it after the build, which the draft did implicitly, was the largest missed move in this plan.

**M1 is the cheapest place to tune** Dwell numbers, Dust density, Condensation timing, and background-drift risk. Do that work there rather than at M2.

## 10. Risks and Mitigations

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R-1 | **Capacity — the whole risk.** No estimate, no deadline, no external forcing function, and M2 roughly doubled in one session. | Critical | **UNMITIGATED.** A named first reader and a committed CV-link date were proposed and are **not ratified**. No mitigation is in place. Until a real name or a real date exists, this PRD has no forcing function, and the most likely outcome for this project is that it is never finished. Stated plainly because the alternative — a risk table that renders a proposal as a mitigation — would make this document read safer than the project is. See §13 Q3. |
| R-2 | **The core bet is untested.** That a technical reader will stop and read a full paragraph is asserted, not observed. The press-release reader quote is aspirational. | High | **M0** (§9) — the cold-read. Needs no code, no named reader, and no date. Available now. This is a real mitigation and it does not depend on R-1 being resolved. |
| R-3 | **Shallow Project treatment may read as a LinkedIn export in 3D.** Most likely M2 gate failure. | High | **M0** (§9) — the same action mitigates both. Draft two Shallow Projects in full text and read them cold before committing to a visual treatment. |
| R-4 | **Schematic Identity sits in the author's weakest discipline** and now gates launch. Widest confidence interval of any launch task. | High | Treat as a first-class M2 deliverable with its own definition of done (palette, line weight, type, label treatment, chrome). It is not a styling pass appended to the end. |
| R-5 | **Scope grew under pressure with no defence against recurrence.** The rot defence is architectural; there is no equivalent for scope. | High | The §6 scope guardrail: M2 frozen, additions route to M3, bar is "actively misleading without it." |
| R-6 | **Blender dependency at M4** needs exactly the 3D modelling skill the entire technical approach was chosen to avoid. Most likely milestone to stall, and it holds the emotional climax. | Medium (post-launch) | `[ASSUMPTION: The collapse is done procedurally in-engine — disabling repulsion in the existing force system, plus shaders and post-FX — rather than as pre-rendered Blender bookends. This removes the dependency on the avoided skill rather than deferring it, and the brainstorm already identifies disabling repulsion as the collapse mechanism.]` See §13 Q4. |
| R-7 | **Background drift.** Entity-relative framing fixes what is centred, not what is behind it. A Shot composed against a clean background may later have a Body drift into frame. | Low | Bounded by the small inventory. Check at M1. Solver bounding is retained as a safety net (§6); incremental history-pinning is held in reserve (§4.1 note). |

## 11. Success Metrics

**Primary**

- **SM-1 — The Forward happens.** The link is sent onward by someone other than Thomas, unprompted. This is the funnel-positioning success condition and the only external signal the concept rests on. Validates FR-24, FR-20, NFR-1. **Measurement is anecdotal by construction:** NFR-6 forbids a backend and no analytics are in scope, so this is observed only when someone mentions it — a message, a conversation, a referral that names the site. That is a weak instrument for the PRD's primary metric, and the weakness is accepted rather than solved: adding analytics to measure it would contradict NFR-6 and serve SM-C1, the counter-metric this document explicitly declines to optimise.
- **SM-2 — A stranger passes the gate.** A technical reader who has not seen the site explores two or three entries and can state Thomas's discipline, seniority, and the kinds of environments he works in — *and* can say which entries were worth reading. This is the M2 gate and the primary test. Validates FR-7..FR-12, FR-9, FR-20.

**Secondary**

- **SM-3 — The reasoning lands.** A reader who reaches the Colophon can describe at least one architectural decision the site makes. This is the transfer claim's only observable. Validates FR-21.
- **SM-4 — It stays alive.** Adding a Project costs one JSON entry and one `weight` value, with no layout, camera, or positioning work. Testable directly and at any time. Validates FR-1..FR-6, FR-18, NFR-5.
- **SM-5 — It performs on a real machine.** First Paint within budget at launch (NFR-1); locked framerate at M3 (NFR-2), on the target hardware profile rather than the dev machine.

**Counter-metrics (do not optimise)**

- **SM-C1 — Total visits.** Counterbalances SM-1. This is top of funnel by design, not a traffic product. Optimising for visitor count would pull toward the non-technical recruiter audience §2.2 explicitly declines to serve, and would justify exactly the SEO and breadth work §7 rules out.
- **SM-C2 — Time on site.** Counterbalances SM-2. A visitor who understands quickly and forwards the link is a success, not a failure. Optimising dwell time would reward padding entries — the precise failure two Project classes were adopted to avoid.
- **SM-C3 — Number of entries published.** Counterbalances SM-4. More entries is not better if the added ones are padded. Ten honest entries with three real decisions beat ten uniformly deep ones where seven state responsibility rather than choice.
- **SM-C4 — Visual fidelity before launch.** Counterbalances SM-5. Optimising realism ahead of M2 restores the receding finish line that Flag 03 removed and is the single most likely way this never ships.

## 12. Rejected Alternatives

Recorded so they are not re-litigated. Full reasoning lives in the [addendum](../../briefs/brief-cosmos-portfolio-2026-08-31/addendum.md) and [PRFAQ distillate](../../prfaq-cosmos-portfolio-distillate.md).

- **Composition:** global seed lock (survives only as incremental history-pinning); emergent composition (a solver has no judgement, and a random seed would decide the hero frame); solver bounding (not rejected — retained as a safety net).
- **Graph expression:** constellations (flat, and close to the obvious answer); shared light / spectral colour (physically true but breaks past ~6 skills); static gravitational binding (elegant and free but invisible — a visitor sees a clump and cannot know why); demotion to text (relegates the best evidence of range to where every other portfolio puts it); skills as meteors (physically most correct, but Dust achieves the same permanence-free property with a gentler read).
- **Hierarchy:** projects as stars (loses where the work happened); intermediates as stars (a universe whose suns are staffing agencies); two-body client+intermediate systems (makes the billing relationship a visual centrepiece — precisely backwards).
- **Content depth:** ship only the 3 strong entries (~5 Bodies is too sparse for force layout to mean anything, and deletes career breadth); excavate all 10 before deciding (defensible, but rejected as sequencing — under two classes it becomes optional and incremental).
- **Launch framing:** honest beta framing with a "work in progress" note (cheapest, but invites the exact judgement it tries to pre-empt); M2 internal / M3 public (protects the first impression but restores the receding finish line).
- **Positioning:** mid-funnel (changes the interview); "it's for me and that's fine" (removes any external success signal and worsens completion risk); "it proves I finish things"; "it doesn't prove anything, and I say so."

## 13. Open Questions

1. **First Paint budget.** Is 2.5s to first Schematic frame right, and is "first frame of the scene" the correct definition of the gate as against first pixel of anything, or scene-plus-first-entity-legible? (NFR-1)
2. **Framerate target.** Ratify 30fps @ 1080p on 2023-era integrated graphics, or amend the number or the hardware profile? Until ratified, the M3 gate has no testable threshold. (NFR-2)
3. **Forcing function.** A committed date, a named first reader, or both? If neither, R-1 is accepted as a named risk rather than mitigated. (R-1, R-2)
4. **M4 collapse implementation.** Procedural in-engine, bought, commissioned, or dropped? Decide now rather than leaving an open dependency on the avoided skill. (R-6)
5. **Shallow-entry treatment.** Does a Shallow Project look different in the scene, or only in the information layer? Resolve after the two-entries-cold-read. (FR-9, R-3)
6. **Condensation details.** Timing of Condensation and Decay; Dust density at rest; whether Skill labels are legible only while condensed; behaviour when Focus moves directly from Project A to Project B. Tune at M1. (FR-13, FR-15)
7. **Dwell numbers.** How much longer on a Deep entry; whether the transition reads as deliberate or as stalling; behaviour across three consecutive Shallow entries. Tune at M1. (FR-18)
8. **Free-flight boundaries.** How far may a visitor roam off-Rail, and how do they return? (FR-19)
9. **Fallback trigger and scope.** What detects an incapable machine, and how much must the Fallback convey? (FR-22)
10. **Contact mechanism at M2.** What is the unglamorous route, given no backend? A mailto is the zero-infrastructure option. (FR-23)
11. **Colophon form.** Is a static HTML page rendering the live JSON with annotated mapping rules the right shape and the right effort? (FR-21)
12. **Remaining inventory.** Roughly nine entries to draft, with "what did you argue for, and what did you argue against?" asked explicitly for each. Gates M2. (§8.3)
13. **Schema fix in `inventory-draft.md`.** `duration` and `weight` are missing there as well as here. Fix before drafting the remaining nine entries. (FR-7)
14. **Default Shot template.** What framing does an un-authored entity get, and which entities earn a hand-authored Shot? (FR-17a)
15. **Focus trigger.** Dwell, click, scroll-stop, or proximity — and how is Focus released? A UX decision, deliberately left open. (FR-12a)
16. **Fallback floor.** Is 24fps sustained the right threshold for abandoning the 3D scene, given NFR-2 targets 30? (NFR-2a)

## 14. Assumptions Index

Every `[ASSUMPTION]` above, surfaced for confirmation. **All six are proposals filling gaps the upstream chain left explicitly open — none is a decision the author has ratified.** Each carries a pointer to the Open Question that resolves it.

- **§4.2 FR-9** — Deep Projects carry a visible satellite at rest and Shallow Projects do not; brightness is explicitly *not* the distinguishing channel, being already bound to recency by FR-3. (§13 Q5)
- **§4.6 FR-21** — The Colophon is a static HTML page outside the 3D scene rendering the live JSON with the three mapping rules annotated against real values from it. (§13 Q11)
- **§5 NFR-1** — First Paint is the first frame of the Schematic scene within 2.5s on target hardware over a median connection, with everything else streaming. (§13 Q1)
- **§5 NFR-2** — 30fps @ 1080p on 2023-era integrated graphics with full post-FX is the M3 target. **Carried unratified** — proposed in the brief addendum, never confirmed by the author. (§13 Q2)
- **§5 NFR-2a** — The Fallback floor is 24fps sustained, deliberately below NFR-2's 30fps target. (§13 Q16)
- **§10 R-6** — The M4 collapse is procedural in-engine (disabling repulsion in the existing force system plus shaders and post-FX) rather than pre-rendered Blender bookends. (§13 Q4)

**R-1 no longer carries an assumption.** The proposed forcing function — a named first reader plus a committed date — was moved out of the mitigation column and the risk is now recorded as unmitigated. A proposal presented as a mitigation made the document read safer than the project is. (§13 Q3)

## 15. Deferred Findings

A nine-reviewer gate ran against this PRD at finalisation: a rubric walker, an adversarial pass, a downstream-usability pass, a mechanical-consistency pass, and five input-reconciliation passes against the brainstorm, brief, brief addendum, PRFAQ, and PRFAQ distillate. Full reviews are retained alongside this document as `review-*.md` and `reconcile-*.md`.

All critical findings and both mechanical blockers were resolved in place. The following were **triaged as deferred** — real, recorded, and not blocking. Each names its owner.

**For `bmad-architecture`:**
- Build-time vs. runtime force settling is unstated, and it silently determines NFR-1's streaming plan, FR-24's reproducible opening frame, and FR-21's demonstrability. Highest-leverage missing decision.
- Six FRs are epics rather than stories: FR-2, FR-13, FR-17, FR-20, FR-21, FR-22. Expect decomposition.
- The project ↔ skill relation dissolves through Condensation the way company ↔ client dissolves into a field lookup (FR-6). Neither is a stored graph edge. Stated in the brief addendum, not restated in FR-13.

**For `bmad-ux`:**
- The information layer has no specified presentation form. Genuine gap — but note the full PRFAQ contains roughly 1,500 words of pressure-tested language on voice and reader experience that never reached this PRD, because the distillate compressed the press release body and all ten Customer FAQ answers. **Read `prfaq-cosmos-portfolio.md` directly, not the distillate.**
- FR-20 has no definition of done despite being the highest-variance launch blocker (R-4).
- *"Skills are weather, not furniture"* — the governing metaphor for the Dust mechanic, and the one-line answer to three open condensation questions (§13 Q6).
- Sequence-level pacing is unowned: derived Dwell (FR-18) sets per-Body duration, but nothing governs rhythm across a run of Shallow Projects.

**For the content pass:**
- The second excavation question — *"what was annoying about this project?"* — produces the **constraint**, which FR-8 designates as the entire falsifiability substitute for absent metrics. §8.3 carries only the decision question.
- Numbers that *do* exist and should be used: team size, engagement duration, system scale, what was replaced or consolidated. FR-8 currently carries only the negative (no measured outcomes).
- 100–150 words is the working target; ~90 is the hard floor. The draft stated both without distinguishing them.

**Recorded, not actioned:**
- Nebula gaps (empty timeline stretches) were cut in a compound bullet with no reasoning, leaving "what does the scene show across a career gap?" unanswered — live, given §4.3's own sparse-vs-medium argument.
- The transient/meteor class is defined by FR-5 but has no visual requirement, no Glossary entry, no count, and no statement that zero exist at launch.
- **M2 is not "minimum" in any ordinary sense.** It contains two renderers, a bespoke design system, a particle system, an unspecified information layer, and ~9 unwritten entries. The §6 freeze was applied at the top of a scope that had just doubled, and several current M2 items would fail the freeze's own bar if proposed today. Recorded because the honest framing is *"the smallest version worth linking,"* not *"small."*
