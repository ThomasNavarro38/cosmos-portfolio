---
title: "Downstream Usability Review: Cosmos Portfolio PRD"
status: review
created: 2026-09-01
reviewer: downstream-usability
targets: [bmad-architecture, bmad-ux, bmad-create-epics-and-stories]
sources:
  - prd.md
  - addendum.md
---

# Downstream Usability Review — Cosmos Portfolio PRD

**Question asked:** can `bmad-architecture`, `bmad-ux`, and `bmad-create-epics-and-stories` each actually do their job from this PRD plus its addendum?

**Short answer:** architecture cannot start without a decision round; UX can start on the visual identity but not on the information layer or the Fallback; epics can be drafted but will mis-size at least six FRs and will invent a dependency order the PRD never states.

Severity key: **CRITICAL** = the consumer is blocked or will produce a wrong artifact. **HIGH** = the consumer will guess on something load-bearing, and the guess will be expensive to unwind. **MEDIUM** = the consumer must ask a question but can proceed around it. **LOW** = friction, note it and move on.

---

## Verdict Table

| Consumer | Verdict | Blocking count |
|---|---|---|
| `bmad-architecture` | **Blocked without a decision round.** Enough to sketch a spine, not enough to commit one. | 3 critical, 5 high |
| `bmad-ux` | **Partially unblocked.** FR-20 is designable; the information layer, Fallback, and Colophon are not. | 2 critical, 4 high |
| `bmad-create-epics-and-stories` | **Can produce epics, will produce wrong stories.** Sizing and sequencing both under-specified. | 1 critical, 4 high |

---

## Part 1 — `bmad-architecture`

### 1.1 Overall

The PRD is unusually strong on *invariants* and unusually weak on *mechanisms*. It gives architecture a genuinely valuable set of hard constraints — no backend (NFR-6), no coordinates in Shots (FR-17), no position overrides (FR-2 Out of Scope), one JSON file (FR-1), condensation and decay share one implementation (FR-13), exactly three mapping rules (FR-3) — and these are the right kind of thing for a PRD to carry. The addendum's *Architectural Contract* section adds four more that are precisely what an architect wants: the lint-vs-convention argument for the Shot type, the deliberate camera↔content coupling, the shared condensation/decay path, and the observation that collapse and condensation are one system at two scales.

What is missing is the class of decision that is not a *technology choice* but a *behavioural contract*, and the PRD's stated boundary ("tech choices belong in architecture") has been applied too broadly — it has been used to defer things that are product behaviour, not implementation detail. See 1.4.

### 1.2 The five named subsystems

#### Dust / particle system — **HIGH: specified as a mood, not a mechanism**

FR-15 says "Dust is visible in the space between Bodies in the resting scene" and "Dust density does not obscure Bodies or read as fog." That is the entire specification. What architecture cannot derive:

- **Cardinality.** The Glossary says Skills are "Unbounded in count" and are rendered as Dust "at rest." Is the dust field a *representation of the skill set* (N particles where N relates to skill count, ~30-60 skills) or an *ambient medium* (10⁵–10⁶ particles that happen to be narratively labelled as skills)? These are completely different systems — the first is a small instanced mesh with per-skill identity, the second is a GPU particle system with no per-particle addressability. FR-13 forces the question: "Condensation and Decay use the same implementation, reversed" and "No Skill is ever instantiated in more than one place at one time" both imply *identity-bearing* dust, but §4.3's compositional argument ("eighteen objects in a medium reads as space") implies *ambient* dust. **The PRD asserts both readings and never reconciles them.** This is the single largest hidden decision in the document.
- **Whether dust is spatially indexed.** FR-13's "No object spawns from nothing or teleports at any point" means condensing skills must originate from *somewhere plausible* — which means either dust near the project is preferentially recruited (spatial query per focus event) or dust is globally sampled (cheap, but the visual read of "condensed out of the local medium" is lost).
- **Simulation vs. animation.** Is dust simulated (curl noise, flow field, per-frame integration) or is it a static point cloud with a vertex-shader-driven shimmer? The framerate budget (NFR-2, 30fps on 2023 integrated graphics) makes this a real fork, and NFR-1's First Paint budget makes it worse — see 1.2/First Paint below.

The addendum acknowledges the timing questions (Q6) but frames them as *tuning*. They are not tuning; the A/B focus-transition question ("cross-fade, or full decay then re-condense") is an architectural question about whether the condensation system supports concurrent states, and it must be answered before the system is built, not after.

> **Quote (FR-15 Consequences):** "Dust density does not obscure Bodies or read as fog." This is an acceptance criterion an architect cannot design against. It is a perceptual judgement with no measurable proxy.

#### Force simulation — **CRITICAL: no specification of the force model itself**

FR-2 says a force simulation computes every Body position. FR-3 says three mapping rules drive *appearance* (mass, brightness, distance-from-Rail). The connection between them is never made:

- **Is `weight` a force parameter or a post-solve transform?** FR-3 says "distance from the Rail by relevance" — but the Rail is authored *after* the layout settles (FR-17 shots name entities that must already exist). This is circular: the layout places bodies by distance-from-Rail, but the Rail is composed against a settled layout. Architecture cannot resolve this without a decision. Either (a) the Rail is a fixed spine defined independently of the layout and the solver attracts high-weight bodies toward it, or (b) `weight` affects some other force term and "distance from the Rail" is descriptive rather than causal. **The PRD reads as (a) and the FR-17 contract implies (b).**
- **Is the simulation run at build time or at runtime?** This is not a technology choice, it is a product-behaviour choice with large consequences. Build-time settle means deterministic layout, zero settle cost at load, and NFR-1 becomes trivially achievable — but "re-running the simulation from identical input" (FR-2) becomes a build step, and the Colophon's claim (FR-21) that the reader can see the rules act on the data gets weaker. Runtime settle means the visitor may see the layout form (which could be a feature) but costs a second of CPU inside a 2.5s budget. The feature-level NFR under §4.1 ("Force layout of ~18 Bodies must settle within one second on the target hardware profile") *implies* runtime, but nothing states it. **This is the highest-leverage unstated decision in the PRD.**
- **Determinism.** §12 records "global seed lock" as rejected (surviving only as incremental history-pinning). If there is no seed lock and the sim runs at runtime, layout differs per visit, which means the composed opening frame (FR-24: "The opening frame is composed with the knowledge that it will be screenshotted") is not reproducible, and R-7 (background drift) becomes a per-load lottery rather than a per-edit risk. **FR-24 and the rejection of seed lock are in direct tension and the PRD does not notice.**
- **Hierarchy in the solver.** FR-12 requires "a Client Star holds 1..n Project Planets" and FR-2's consequence requires "every Client Star holds its own Projects in orbit." Is orbit a *solved* property (spring constraint parent↔child) or a *kinematic* one (planets are placed on parametric orbits around a solved star position)? These produce visibly different scenes and completely different code. The word "orbit" appears throughout with no definition of whether bodies actually move.
- **Do bodies move at rest?** Never stated anywhere. "Orbiting" (FR-13, Glossary) implies motion; "settled layout" (FR-2) implies stasis. Both are used. If planets orbit, every Shot's framing (FR-17) is time-dependent and the "shot still frames its subject" guarantee needs a phase-locking story.

#### Camera rail data structure — **HIGH: the contract is stated, the structure is not**

FR-17 is the best-specified requirement in the document and still leaves architecture guessing:

- Stated: a Shot is "an entity ID plus relative framing parameters (angle, distance, framing)" and contains no world coordinate. Good — that is a real type constraint, and the addendum's "a Shot type that structurally cannot hold a coordinate is worth more than a rule someone remembers" is the right architectural instruction.
- Not stated: **what a Rail is.** The Glossary says "an authored camera trajectory. Composed of Shots." Is a Rail an ordered list of Shots with interpolation between them, or a spline with Shots as constraints on it? FR-16 (backward-time scroll) implies scroll position maps monotonically onto rail parameter — but if Shot positions are entity-relative and entities move when the sim re-settles, the *arc length* of the rail changes on every data edit, which means scroll-to-rail mapping is not stable. **Nobody has thought about what happens to scroll length when the layout changes.** UJ-4 promises "does not touch a camera shot" but says nothing about total scroll distance changing.
- Not stated: **who authors the Rail and in what form.** NFR-5 and UJ-4 promise adding a project costs "one JSON entry plus one `weight` value: no layout work, no camera rework." But FR-17 says Rails are *authored*. So does a new project get a Shot automatically (rail is generated from data — contradicting "authored") or does it get no Shot (the new entry is never visited by the default journey — silently violating the spirit of UJ-4)? **This is a genuine contradiction between FR-17 and NFR-5/UJ-4 and the PRD does not resolve it.** It is arguably the most important unresolved item for architecture, because the answer determines whether the rail is a data structure or a generator.
- Not stated: what "framing" means as distinct from angle and distance. Three parameters are named, two are obvious, one is undefined.

#### Fallback detection — **CRITICAL: FR-22 requires the impossible without a mechanism**

FR-22's consequence: *"Detection occurs before the visitor sees a failed or degraded 3D scene."* Open Question 9 then says "what detects an incapable machine" is unresolved. Architecture cannot design this, because the requirement is not merely unspecified — as written it is **partially unsatisfiable**:

- WebGL *availability* is cheaply detectable pre-paint (context creation probe). Fine.
- WebGL *adequacy* — will this machine hold the framerate — is **not** detectable before rendering. NFR-2 says "Below that threshold, serve the Fallback," which requires measuring framerate, which requires having already rendered. This is a direct conflict between NFR-2's policy and FR-22's "before the visitor sees a degraded scene."
- NFR-3 ("quality holds, frames drop") further conflicts: it says a slow machine should get the real thing at 24fps rather than a lesser thing. NFR-2 says below 30fps serve the Fallback. **NFR-2 and NFR-3 give opposite instructions for the same machine.** Architecture must be told which wins, and at what measurement window.
- Mobile detection (FR-22: "Mobile visitors receive the Fallback") is a third, different mechanism — UA/pointer/viewport heuristics, none of them reliable, and the PRD gives no rule for a large tablet or a touchscreen laptop.

There are three distinct detection systems bundled into one FR with one open question. See Part 4 for the split.

#### First-paint streaming strategy — **HIGH: the budget exists, the strategy is one sentence**

NFR-1: *"the first frame of the Schematic scene renders within 2.5 seconds... Everything behind it — full Dust density, remaining Bodies, complete Rail — may stream in."* That sentence is the entire strategy, and it raises more than it answers:

- "Remaining Bodies may stream in" — but the force sim needs *all* bodies to solve *any* position correctly. A partial solve gives wrong positions that then move when the rest arrives, which is exactly the "no object teleports" violation FR-13 forbids (albeit for skills, not bodies). If the sim is build-time-settled, this is fine; if runtime, streaming bodies is incoherent. **The streaming strategy silently presupposes an answer to the build-time-vs-runtime question that the PRD never gives.**
- The data is a single embedded JSON file (FR-1) of ~10 projects — kilobytes. It is not the data that costs 2.5s; it is the JS bundle, the WebGL init, the shader compile, and the particle buffer allocation. **The PRD's streaming plan addresses the cheapest asset and says nothing about the expensive ones.** Shader compilation stall in particular is a well-known first-paint killer for WebGL and is never mentioned.
- No definition of what "first frame of the Schematic scene" means, acknowledged in Q1 — but Q1 frames this as a *measurement* question when it is also a *design* question: an architect building to "first frame of anything" ships a different loading architecture than one building to "scene plus first entity legible."
- Nothing about total bundle budget, no asset inventory, no statement about whether fonts (FR-20 requires typography) are subset/self-hosted. Fonts are a classic first-paint tax and FR-20 introduces them without an NFR touching them.

### 1.3 FRs that hide enormous unspecified complexity

| FR | Stated as | Actually is | Severity |
|---|---|---|---|
| FR-13 | "Skills condense on Focus and decay on release" | A particle lifecycle system with identity tracking, spatial recruitment, reversible animation, concurrent-state handling, and a skill→geometry mapping. Probably the largest single build item in M2. | CRITICAL |
| FR-2 | "A force simulation computes the position of every Body" | Force model design, hierarchy handling, determinism policy, build-vs-runtime, settle detection, bounding (§6 "retained as a safety net" — retained but unspecified). | CRITICAL |
| FR-17 | "Authored entity-relative camera Rails" | Rail data structure, interpolation, scroll↔rail mapping under variable arc length, per-entity shot authoring workflow, and the unresolved auto-vs-authored contradiction with NFR-5. | HIGH |
| FR-22 | "Flat star-chart Fallback" | Three detection mechanisms plus an entire second front-end (the flat chart is a separate rendering path with its own content and its own design). | HIGH |
| FR-20 | "Coherent schematic visual system" | A design system. Not a requirement — a workstream. See UX section. | HIGH |
| FR-3 | "Three mapping rules drive visual properties" | Three transfer functions with unstated domains, ranges, and curves. "Mass from duration" — linear? log? What is the visual range of "more massive"? What is the recency window for brightness? Architecture must invent all six endpoints. | MEDIUM |

### 1.4 Is the PRD/architecture boundary drawn correctly?

**Mostly no — MEDIUM to HIGH.** The PRD correctly withholds framework, library, and rendering-API choices. But it has also used that boundary to defer four things that are product behaviour and that architecture will have to invent, then hand back for ratification:

1. **Whether the layout solves at build time or at runtime.** Product-visible (does the visitor see the universe assemble?), performance-critical, and it determines whether FR-2's Colophon claim is demonstrable. Not a tech choice.
2. **Whether bodies move at rest.** Purely product/experience. Absent entirely.
3. **Whether the Rail is authored or generated for new entries.** Determines whether UJ-4's promise is true. Not a tech choice — it is the central maintenance claim.
4. **Which of NFR-2 and NFR-3 wins on a marginal machine.** A policy question about what the visitor receives. Not a tech choice.

Conversely, the PRD *over-specifies* in one place worth flagging: FR-13's "Condensation and Decay use the same implementation, reversed" is an implementation directive in a functional requirement. It happens to be right (the addendum justifies it), but it belongs in the architectural contract, which is where the addendum in fact repeats it. Low severity, noted for consistency.

### 1.5 Constraints architecture needs that the PRD dropped

- **No browser support matrix.** NFR-4 gives a hardware profile ("three-year-old laptop with integrated graphics at 1080p") but no browser/version floor. FR-22 gates on capability, so the floor matters. Corporate laptops (UJ-1's Marc, explicitly) are the exact population where this bites.
- **No accessibility floor.** Zero mention of reduced-motion, keyboard navigation, or screen readers anywhere in either document. A scroll-driven WebGL experience with no `prefers-reduced-motion` story is a real defect, and it interacts with FR-22 (is reduced-motion a Fallback trigger?). **HIGH — this is a missing NFR, not just a missing FR.**
- **No hosting/deployment constraint.** NFR-6 says no backend, which implies static hosting, but nothing states it. FR-24 (link previews) requires OG tags served on a URL, and FR-1's "file is retrievable by a visitor" (FR-1 consequence) requires a stable asset path. Both are deployment constraints.
- **No analytics position.** SM-1 ("the link is sent onward... unprompted") is the primary success metric and there is no stated mechanism for observing it, and no statement about whether any analytics is permitted. SM-C1/SM-C2 are counter-metrics that presuppose measurement exists. **MEDIUM — architecture will have to ask.**
- **No error/degradation behaviour** for a mid-session WebGL context loss. NFR-3 covers frame rate, nothing covers failure.
- **Solver bounding (§6)** is "retained as a safety net" with three named mechanisms (minimum separation, bounding volume, no-fly zones) and no statement of whether it is in M2 scope. Architecture must decide whether to build it. **MEDIUM.**

---

## Part 2 — `bmad-ux`

### 2.1 The information layer — **CRITICAL, and the PRD/addendum both know it**

The addendum states it plainly: *"The information layer has no specified form at all. The PRD specifies its content (FR-7, FR-8) and its legibility requirement (NFR-7) but not its presentation."* That framing is correct but understates the gap, because the missing pieces are not only visual:

**Missing beyond presentation form:**

- **The trigger.** FR-13 and the Glossary define Focus as "the state of a Project being examined," but nothing says how a visitor causes it. Scroll arrival on the rail? Hover? Click? All three? UJ-2 says "the camera brings her to a client star" and then "as she focuses the project" — implying focus is a consequence of camera arrival, i.e. automatic. But FR-19 (free flight) means a visitor can be off-rail with no camera arrival, and Focus must still be reachable. **There is no interaction model at all for the single most important interaction in the product.** CRITICAL.
- **Focus scope.** Is exactly one Project focused at a time? Can a Client Star be focused (it has no `notable` and no skills of its own)? UJ-2 describes camera dwell on a *client star with several planets around it* — is anything focused during that? Undefined.
- **Release.** "Releasing Focus" (FR-13) — by scrolling on? by clicking away? by a timer? Undefined.
- **Reading vs. scrolling conflict.** This is the big one and neither document raises it. Scroll drives the camera (FR-16). The information layer holds 100–150 words (FR-8). UJ-2's climax is *"she finishes the paragraph."* If scroll advances the camera, the visitor cannot scroll to read the paragraph — reading and navigating are bound to the same input. Either the prose must fit without scrolling (a hard typographic constraint nobody has stated), or the rail must pause/lock during Focus (an interaction mode nobody has specified), or the prose gets its own scroll container (nested scroll, a known usability trap). **UJ-2's entire climax depends on resolving this and it is not resolved anywhere.** CRITICAL.
- **Dwell vs. reading speed.** FR-18 derives Dwell from data, and Q7 asks "how much longer on a Deep entry." 150 words at typical reading speed is ~40 seconds. If Dwell is measured in seconds of *automatic camera motion*, the camera will leave before the reader finishes — unless Dwell is not a timer but a scroll-distance allocation, which the PRD never says. **The word "Dwell" is used without stating whether its unit is time or scroll distance.** HIGH.
- **Simultaneity with Condensation.** FR-13 condenses skills *around* the focused project while FR-8's prose appears. Do the condensed skill bodies and the prose panel compete for the same screen space? Nothing addresses composition under focus.

### 2.2 FR-20 (Schematic identity) — **is it designable? Partially. MEDIUM-HIGH.**

FR-20's Consequences are unusually good for a visual requirement because they name deliverables rather than feelings: *"A defined palette, line weight, typography, label treatment, and UI chrome exist and are applied consistently."* That is a checklist a UX pass can execute against, and R-4's mitigation restates it as a definition of done. The addendum adds real direction: "technical drawing, orbital mechanics diagrams, engineering schematics, early vector displays" is a usable reference set, and "the greybox trap" gives a genuine failure criterion (a half-schematic with one realistic element reads as broken).

**What is still missing:**

- **"Monochrome" is undefined.** One hue at varying luminance? True greyscale? Is the tint mentioned in FR-6 ("Company is displayed as a label or tint") a colour, and if so does it break monochrome? **FR-6 and FR-20 are in unnoticed tension.** MEDIUM.
- **Brightness is load-bearing and contested.** FR-3 maps brightness to recency. FR-9's assumption maps dimness to Shallow-ness. Both are brightness. **A dim body is now ambiguous between "old" and "shallow," and these are the two axes the M2 gate depends on distinguishing.** This is a direct conflict inside the visual system and UX must resolve it — it may require breaking the three-rules constraint of FR-3 or finding a second visual channel. HIGH, and it is arguably the sharpest concrete finding in this review.
- **No stated ambition level.** Is the schematic identity a spare technical-drawing aesthetic (cheap, safe, in the author's reach) or a rich vector-display aesthetic with glow, scanlines, and depth cueing (expensive, closer to the "awe" NFR-7 mentions)? R-4 says this sits in the author's weakest discipline — that argues for the cheap end, but nothing states it, and the wrong read here wastes the highest-variance task in the launch set.
- **No typographic system for prose in 3D.** FR-8 requires 150 words in a WebGL context. DOM overlay, texture-mapped text, or SDF text are three very different design and engineering paths, and the type treatment differs radically across them.

**Verdict:** FR-20 is more than a mood but less than a spec. UX can begin — that is a real credit to the PRD — but must first resolve the brightness collision and the monochrome/tint question.

### 2.3 The four user journeys — **usable for framing, not for flows. MEDIUM.**

The journeys are well written as *narratives* and each carries a labelled Climax, Resolution, and Edge case, which is more structure than most PRDs offer. They are also correctly cross-referenced from FRs ("Realizes UJ-2"), which is genuinely useful for traceability.

But they are not flows:

- **No step decomposition.** UJ-2 goes from "the camera brings her to a client star" to "she finishes the paragraph" with no intermediate states. There is no enumerable sequence of screens/states/inputs to build a flow diagram from.
- **No entry-state variance.** UJ-1 and UJ-3 are the *same flow* with different context (Marc has the CV, Tom has nothing). The difference is stated as motivational, not behavioural, and neither journey implies a different product behaviour — except the link preview (FR-24), which is pre-arrival.
- **UJ-4 is not a user journey.** It is a maintenance procedure performed by the author with a text editor. It has no UI. Treating it as a peer of UJ-1..3 in the same numbered list will mislead a UX pass into looking for an authoring interface that FR-1's Out of Scope explicitly forbids ("Runtime editing, admin UI, or authenticated content management of any kind"). **Recommend re-labelling it as a maintenance scenario.** MEDIUM.
- **No failure/edge flows beyond the three named.** Nothing for: a visitor who scrolls to the end, a visitor who reaches the Colophon, a visitor who enters free flight and gets lost (Q8 acknowledges it), a visitor who arrives mid-page from a browser restore, a visitor who resizes.
- **No journey covers the Fallback as a first-class experience.** It appears only as an edge case in UJ-1 and UJ-3, yet the addendum says the Fallback must satisfy the same M2 gate. **A surface that must pass the launch gate has no journey.** HIGH.

### 2.4 Other UX gaps

- **The Colophon has no discoverability decision.** The addendum flags it: *"Whether a visitor stumbles onto it, is led to it by the rail, or has to look for it is unspecified — and it materially affects SM-3, its only observable."* Correctly identified; still unowned. HIGH.
- **The Fallback has no content spec.** Addendum: *"'Flat star chart' names a form, not a content set."* FR-22 requires it convey "what the site is and what Thomas does." That is a whole information design task with no owner and no requirement beyond one sentence. HIGH.
- **Copy/voice for chrome is unspecified.** Addendum names it: labels, Colophon, contact route, Fallback all have no voice defined. MEDIUM.
- **No onboarding/affordance story.** The site has non-obvious interactions (scroll runs *backward* in time — FR-16; free flight is opt-in — FR-19; focus condenses dust — FR-13). Nothing states how a visitor learns any of these. FR-19's "Free flight is opt-in" requires an affordance that no FR mentions. HIGH.
- **No loading state design.** NFR-1 allows streaming; nothing says what the visitor looks at during it. Given UJ-3's "whatever arrives in the first two and a half seconds is the entire product," the loading state *is* the product for some visitors. HIGH.
- **No accessibility direction.** As in Part 1: no reduced-motion, no keyboard path, no contrast floor — and a monochrome design system with brightness as a semantic channel (FR-3) has an obvious contrast risk. HIGH.

---

## Part 3 — `bmad-create-epics-and-stories`

### 3.1 FRs that are epics in disguise

Six FRs cannot be delivered as a story. Named, with why:

| FR | Why it is an epic | Rough story count |
|---|---|---|
| **FR-13** — Skills condense on Focus and decay on release | Bundles a particle system, an identity model, a focus state machine, a reversible animation system, and a skill→geometry mapping. Carries four separate testable consequences, each a story's worth. Plus Q6 hangs four unresolved sub-decisions off it. | 5–8 |
| **FR-2** — Force-directed layout solves all positions | The entire layout engine: force model, hierarchy, settle detection, determinism, and (via §6) optional bounding. Its own feature-level NFR. | 4–6 |
| **FR-17** — Authored entity-relative camera Rails | Shot type + rail structure + interpolation + scroll binding + authoring workflow. Also carries the unresolved generated-vs-authored question. | 4–6 |
| **FR-20** — Coherent schematic visual system | Names five deliverables in one consequence bullet (palette, line weight, typography, label treatment, UI chrome), each of which is a design story with downstream implementation stories. R-4 explicitly says it is "not a styling pass appended to the end." | 5–10 |
| **FR-22** — Flat star-chart Fallback | Three detection mechanisms plus an entire alternate front-end with its own content design. Effectively a second product surface. | 4–6 |
| **FR-21** — Colophon exhibits data and mapping rules | A separate page, a JSON renderer, live annotation of three rules against real values, plus the discoverability decision. Small epic, but not a story. | 2–4 |

Additionally **FR-9** (two Project classes render distinguishably) is small in text but is the M2 gate's second clause, carries an unratified assumption, and depends on FR-3, FR-20, and content authoring. It is a story-sized *implementation* on top of an epic-sized *decision*.

By contrast these are genuinely story-sized as written: FR-4, FR-5, FR-6, FR-7, FR-11, FR-12, FR-14, FR-16, FR-23.

### 3.2 Implicit dependencies the PRD never states — **CRITICAL**

The PRD lists FRs in a numbered sequence and maps them to milestones in §8.1 by contiguous ranges (FR-1..FR-6, FR-7..FR-12, and so on). That grouping is thematic, not sequential, and **nothing in either document states a build order**. The brainstorm is cited as having "established the concept and build order" but the build order is not carried forward into the PRD. Epic sequencing will therefore be invented. Here is what is actually implied:

**Hard prerequisites (A must exist before B is testable):**

- FR-1 (JSON) → FR-2 (layout), FR-3 (mapping rules), FR-5 (classification), FR-7 (schema). Everything sits on the data model.
- FR-7 (fixed schema) → FR-5 (classification by absence), FR-9 (two classes), FR-18 (dwell from `notable`). **FR-5's "classification by absence" is meaningless until the schema exists**, yet FR-5 is numbered before FR-7.
- FR-2 (settled layout) → FR-17 (shots name entities that must be positioned) → FR-16 (scroll drives the rail) → FR-18 (dwell is a property of rail traversal). **The camera chain is strictly serial and the PRD presents it as a flat list.**
- FR-2 → FR-3's "distance from the Rail" — which, per Part 1, is circular with FR-17. **This circularity is a sequencing blocker, not just an architecture one.**
- FR-13 (condensation) → requires a Focus state machine that **no FR owns**. See 3.5.
- FR-20 (visual identity) → FR-9 (class distinction is expressed in the visual language), FR-15 (dust appearance), FR-22 (the Fallback must share the identity — though FR-22 never says so).
- Content authoring (§8.3) → FR-8, FR-9, FR-18, and the M2 gate itself. §8.3 says it "gates the launch milestone" but is not an FR and therefore will not appear in a story breakdown unless the epic pass deliberately imports it. **HIGH risk of the largest single M2 task being absent from the plan.**
- FR-24 (link preview) → FR-20 (there is no composed frame before a visual language exists).

**Soft/reverse dependencies worth flagging:**

- FR-19 (free flight) is nearly independent, but Q8 (boundaries and return) makes it non-startable.
- FR-23 (contact) is fully independent — the only true leaf. Good candidate for an early, morale-cheap story.
- FR-14 (no connector lines) is a *negative* requirement and cannot be a story at all; it is an architectural constraint or a review checklist item. Story breakdown will try to make it a story and produce nonsense. LOW-MEDIUM.

### 3.3 Milestone mapping — **HIGH: M1 has no FR mapping at all**

§8.1 maps FRs to M2 competently: every FR-1..FR-24 appears, and NFR-1 is called out. The problem is everything else:

- **M1 has no FR list.** §9 describes M1 as "Greybox — schema, force layout, Rails, backward scroll, untextured," which clearly means FR-1..FR-7, FR-16..FR-19 in some partial form, but no FR is assigned. §9 also says "M1 is the cheapest place to tune Dwell numbers, Dust density, Condensation timing, and background-drift risk" — implying FR-13, FR-15, and FR-18 have M1 components too. **So M1 shares FRs with M2 in an unstated partial way.** A sprint planner cannot split an FR across milestones without a stated split.
- **§8.1's M2 list is identical to the full FR list.** Every one of FR-1..FR-24 is in M2. Combined with M1 having no FRs, the effective plan is "build everything," and the M1/M2 distinction — which the PRD treats as important, since M1 is where the cheap tuning happens — is invisible in requirement terms. **This is the single most consequential planning gap.** CRITICAL for sprint planning.
- **No estimates, no sizing, no ordering within M2.** R-1 states this openly: "No estimate, no deadline, no external forcing function." Accepted as a risk by the PRD, but it means the epic pass has no basis for sprint boundaries. The severity is on the PRD's own record, so: HIGH but knowingly accepted.
- M3/M4/M5 are gated and described but carry no FRs at all — acceptable, since they are explicitly out of MVP scope.

### 3.4 Are acceptance criteria derivable from "Consequences (testable)"? — **Mostly yes. This is the PRD's strongest feature for this consumer.**

The Consequences bullets are the best thing in the document from a story-writing standpoint. Many are directly transcribable into Given/When/Then:

- FR-1: *"No network request to any backend, CMS, or API is made to obtain career data."* — directly testable, automatable.
- FR-2: *"No Body position appears as a literal coordinate in any source or data file."* — a lint rule.
- FR-4: *"An entry omitting `weight` is treated as `1`."* — a unit test.
- FR-5, FR-7, FR-10, FR-12, FR-17: all yield concrete assertions.

**Where they fail as acceptance criteria:**

- **Perceptual criteria with no measurable proxy.** FR-15: *"Dust density does not obscure Bodies or read as fog."* FR-20: *"No element reads as a placeholder or as an untextured asset awaiting a pass."* FR-9: *"A Deep Project is visually distinguishable from a Shallow Project in the scene."* FR-18: *"A Deep Project receives measurably longer Dwell"* — "measurably" without a number. These need either a numeric threshold or a named human judge. HIGH.
- **Rationale masquerading as a consequence.** FR-16's second bullet — *"Backward time serves three masters at once: an aesthetic conceit, the correct ordering for a professional reader, and a non-arbitrary home for the ending. One decision, three payoffs."* — is an argument, not a testable consequence, and it sits under a heading that promises testability. FR-14's bullet similarly appends *"A network diagram in a space costume would be read as exactly that by the target audience."* FR-11's bullet is entirely justification. **A story-writing pass that mechanically converts Consequences to ACs will emit unusable criteria.** MEDIUM — easily fixed by splitting rationale out.
- **Assumptions embedded as consequences.** FR-9's third bullet and FR-21's fourth bullet are `[ASSUMPTION]` blocks sitting inside the Consequences list. They are proposals, explicitly "not decisions" (§0, §14), and must not become acceptance criteria. A mechanical pass will convert them. **MEDIUM-HIGH — worth an explicit warning to the epic workflow.**
- **Criteria that require content that does not exist.** FR-8's *"Content below roughly 90 words is rejected at authoring time"* is an authoring-process gate, not a software acceptance criterion. It implies a validation tool that no FR requires.

---

## Part 4 — Bundled FRs (2+ requirements in one)

| FR | Bundled requirements | Recommended split |
|---|---|---|
| **FR-22** | (a) capability detection, (b) framerate-based downgrade policy (via NFR-2), (c) mobile routing, (d) the flat star chart surface itself, (e) its content design | Split into *FR-22a Capability gate*, *FR-22b Fallback surface*, *FR-22c Mobile routing*. Detection and surface have no reason to share a requirement. **HIGH.** |
| **FR-13** | (a) condensation on focus, (b) decay on release, (c) shared implementation constraint, (d) no-duplicate-instance rule, (e) no-spawn/no-teleport rule | (c),(d),(e) are invariants, not behaviours. Split the two behaviours from the three constraints. **HIGH.** |
| **FR-3** | Three independent mapping rules (mass←duration, brightness←recency, distance←weight) plus a closure rule ("no fourth mapping rule exists") | Three requirements plus one constraint. Each rule has its own domain/range/curve decision. **MEDIUM.** |
| **FR-9** | (a) the distinction must exist in-scene, (b) it must be legible *before* committing to read, (c) it must require no type flag | (b) is a much stronger claim than (a) and is the actual M2 gate clause. (c) is a restatement of FR-5. **MEDIUM.** |
| **FR-20** | Palette + line weight + typography + label treatment + UI chrome + "no placeholder reads" + "no WIP disclaimer" | Five design deliverables, one quality bar, one content prohibition. **HIGH.** |
| **FR-24** | (a) link preview image exists, (b) opening frame composed for screenshot, (c) preview honesty about mobile/fallback | (b) is a scene-composition requirement that belongs with FR-20/FR-17, not with metadata. (c) is a content constraint. **MEDIUM.** |
| **FR-21** | (a) show the real JSON, (b) annotate the three rules against real values, (c) state the Shot contract and no-override rule | Three distinct content deliverables on one surface; (c) has no specified form at all. **LOW-MEDIUM.** |
| **FR-8** | (a) prose structure problem→constraint→decision, (b) 100–150 word range, (c) no lists/bullets/tech names, (d) 90-word rejection gate | Authoring standard bundled with a validation rule. **LOW.** |
| **FR-1** | (a) single embedded JSON source, (b) no backend, (c) the file is visitor-retrievable | (c) is a Colophon/FR-21 concern that has drifted into FR-1. (b) duplicates NFR-6. **LOW.** |

---

## Part 5 — Missing FRs implied by the PRD's own prose

Each of these is asserted, promised, or structurally required somewhere in the PRD or addendum but never stated as a requirement.

| # | Missing requirement | Where it is implied | Severity |
|---|---|---|---|
| **M-1** | **Focus interaction model.** How a visitor causes, holds, and releases Focus. | The Glossary defines Focus; FR-13, FR-9, FR-18, and UJ-2 all depend on it. **No FR owns it.** | CRITICAL |
| **M-2** | **Scroll↔camera binding contract.** How scroll position maps to rail progress, what happens at the ends, whether reading and scrolling conflict. | FR-16 asserts backward-time scroll; FR-17 defines shots; UJ-2 requires reading a paragraph. Nothing binds them. | CRITICAL |
| **M-3** | **Information layer presentation.** Named as a gap by the addendum, still not an FR. | Addendum, *Visual System*: "The information layer has no specified form at all." | CRITICAL |
| **M-4** | **Reduced-motion / accessibility floor.** | Absent from both documents. A scroll-hijacked 3D experience without one is a defect, and NFR-7 ("legibility... a hard requirement") gestures at it. | HIGH |
| **M-5** | **Loading / first-paint visitor experience.** What is on screen during the streamed portion NFR-1 permits. | NFR-1: "Everything behind it... may stream in." UJ-3: the first 2.5s "is the entire product." | HIGH |
| **M-6** | **Journey end state.** What happens when the visitor reaches the past. §8.2 defers the *collapse ending* to M4, but M2 still needs a terminal state and none is specified. FR-16's own rationale claims backward time provides "a non-arbitrary home for the ending" — then M2 ships without one. | FR-16 rationale; §8.2. | HIGH |
| **M-7** | **Colophon discoverability.** | Addendum, *Open Design Territory*: "materially affects SM-3, its only observable." | HIGH |
| **M-8** | **Fallback content set.** | Addendum: "'Flat star chart' names a form, not a content set." FR-22 requires it satisfy the M2 gate. | HIGH |
| **M-9** | **Free-flight affordance and return.** FR-19 says free flight is "opt-in" and that a visitor "can return to the Rail" — neither the opt-in control nor the return control is specified. Q8 acknowledges the boundaries but not the controls. | FR-19; Q8. | MEDIUM |
| **M-10** | **Data validation / schema enforcement.** UJ-4 promises adding an entry "takes minutes" and works. FR-8's 90-word floor is described as "rejected at authoring time." Nothing requires a validator, and FR-2's no-coordinate rule (per the addendum) argues for a structural guard. | UJ-4; FR-8; addendum architectural contract. | MEDIUM |
| **M-11** | **Determinism / reproducible layout.** FR-24 requires a composed opening frame; §12 rejects seed lock. Something must guarantee the frame is the same twice. | FR-24 vs §12. | MEDIUM |
| **M-12** | **Analytics / observability for SM-1.** The primary success metric has no mechanism. | SM-1, SM-C1, SM-C2. | MEDIUM |
| **M-13** | **Client Star information layer.** FR-7 fixes the schema for Projects. Clients are Bodies (Stars) and a visitor will encounter them (UJ-2: "the camera brings her to a client star"), but no FR says what a Client displays or carries beyond a name. | Glossary; UJ-2; FR-12. | MEDIUM |
| **M-14** | **Browser support floor.** | NFR-4 gives hardware but not software; FR-22 gates on capability. | MEDIUM |
| **M-15** | **Static hosting / URL stability.** FR-1's "retrievable by a visitor" and FR-24's link previews both need it. | FR-1; FR-24; NFR-6. | LOW-MEDIUM |
| **M-16** | **Solver bounding scope.** §6 retains it "as a safety net" with three named mechanisms; no FR includes or excludes it from M2. | §6; R-7. | LOW-MEDIUM |

---

## Part 6 — Internal contradictions worth resolving before any downstream pass

These are not gaps; they are places where the PRD says two things.

1. **FR-17 (Rails are *authored*) vs NFR-5/UJ-4 (adding a project needs *no camera work*).** Either new entries get generated shots or they get none. Unresolved. **CRITICAL.**
2. **FR-3 (distance from the Rail drives layout) vs FR-17 (shots are defined against a settled layout).** Circular. **CRITICAL.**
3. **NFR-2 (below 30fps, serve the Fallback) vs NFR-3 (better the real thing at 24fps than a lesser thing at 30).** Opposite instructions. **HIGH.**
4. **FR-3 (brightness = recency) vs FR-9 assumption (dimmer = Shallow).** Same channel, two meanings, and the ambiguity lands exactly on the M2 gate. **HIGH.**
5. **FR-22 ("detection occurs before the visitor sees a degraded scene") vs NFR-2 (a framerate threshold, which requires rendering to measure).** **HIGH.**
6. **FR-24 (composed, screenshot-ready opening frame) vs §12 (seed lock rejected) plus runtime force settling.** **MEDIUM.**
7. **FR-6 (Company shown as "a label or tint") vs FR-20 (monochrome).** **MEDIUM.**
8. **FR-13 (dust has per-skill identity, never duplicated) vs §4.3's compositional rationale (dust as an ambient medium filling space).** **HIGH — this is the dust-cardinality question from Part 1 restated as a contradiction.**

---

## Part 7 — What the PRD does well (so it is not lost in revision)

Worth preserving explicitly, because several of these are rarer than the gaps:

- **The Glossary (§3) with a stated discipline rule** ("Introducing a synonym anywhere is a discipline violation") is genuinely load-bearing and will keep three downstream documents aligned.
- **"Consequences (testable)" as a section convention** gives story writers a head start that most PRDs do not.
- **Explicit Out of Scope per FR**, including *permanently rejected* vs *deferred* — this is the correct distinction and it is applied consistently.
- **The assumptions index (§14) with an explicit "none is a decision the user has ratified."** Downstream consumers know exactly what not to build on.
- **Named counter-metrics (SM-C1..C4)** with the failure mode each guards against.
- **§12 Rejected Alternatives** prevents re-litigation and gives architecture the reasoning behind constraints it would otherwise question.
- **The addendum's document-routing table** solves a real problem for a four-document planning chain.
- **R-4 treating the visual identity as a first-class deliverable with its own DoD** rather than a styling pass is exactly right and should survive into the UX brief.

---

## Recommended Minimum Actions Before Downstream Workflows Run

Ordered by leverage. None require new product thinking except items 1 and 3.

1. **Decide build-time vs. runtime force settling** (unblocks: FR-2, NFR-1 streaming strategy, FR-24 determinism, the whole architecture spine).
2. **Resolve the FR-17/NFR-5 rail-authoring contradiction** — are shots generated for new entries or not? (unblocks: UJ-4's central claim, camera epic sizing).
3. **Write the Focus interaction model as a new FR** (M-1) — trigger, scope, release, and its relationship to scroll (M-2). Unblocks UX entirely and roughly a third of the story breakdown.
4. **Resolve the brightness collision** (FR-3 recency vs FR-9 dimness) — one channel cannot carry both, and the M2 gate depends on the distinction.
5. **Split FR-22** into capability gate / fallback surface / mobile routing, and reconcile NFR-2 with NFR-3.
6. **Decide dust cardinality** — identity-bearing skill particles vs ambient medium (or both, explicitly, as two systems).
7. **Add an M1 FR mapping** in §8.1, including which FRs are partially delivered at M1 and what the partial delivery is.
8. **Add a reduced-motion / accessibility NFR** (M-4).
9. **Mark the rationale bullets inside "Consequences (testable)"** as rationale, so a mechanical AC pass does not consume them — and flag the two embedded `[ASSUMPTION]` bullets (FR-9, FR-21) as non-criteria.
10. **Import §8.3 content authoring into the FR/epic structure** so the largest M2 task appears in the plan.
