---
stepsCompleted: [1, 2, 3, 4]
status: final
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-cosmos-portfolio-2026-09-01/prd.md
  - _bmad-output/planning-artifacts/prds/prd-cosmos-portfolio-2026-09-01/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/EXPERIENCE.md
  - _bmad-output/planning-artifacts/briefs/brief-cosmos-portfolio-2026-08-31/inventory-draft.md
---

# Cosmos Portfolio - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Cosmos Portfolio, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

Scope is **M2 — the launch milestone** (PRD §8.1, frozen). M3 realism, M4 collapse ending, and M5 fun layer are out of scope and are not decomposed here.

**Reading order for anyone building from this document:** the UX spine (EXPERIENCE.md) and the architecture spine (ARCHITECTURE-SPINE.md) both **amend the PRD in effect** on the navigational model. See AD-4a and EXPERIENCE.md §9.2 — the Rail stops at Clients (~5–6), never at Projects. A unit built from the PRD alone will produce a structurally different product. This is recorded again in the Additional Requirements below because it is the single highest-consequence divergence available.

## Requirements Inventory

### Functional Requirements

**4.1 Data Model and Computed Layout**

FR-1: The site reads all career data from one JSON file embedded in the project — no network request to any backend, CMS, or API; editing the JSON and rebuilding is the only content-authoring path; the file is retrievable by a visitor for inspection.

FR-2: A force simulation computes the position of every Body from the JSON — no Body position appears as a literal coordinate in any source or data file; re-running from identical input settles every Client Star holding its own Projects in orbit; adding an entry requires no other file change.

FR-3: Body appearance derives from data via exactly three mapping rules and no fourth — mass from duration, brightness from recency, distance from the Rail by relevance (`weight`).

FR-4: Each entry carries one manual relevance value, `weight`, default `1` — the only hand-authored number in the data file; an entry omitting it is treated as `1`.

FR-5: Entity kind is determined by which fields an entry lacks, not by a type flag — an entry with no parent and no duration is transient; a Project with an empty `notable` is Shallow with no schema change, no flag, no special case; a later-populated `notable` promotes it to Deep with no structural change.

FR-6: Company is a field on a Project and is never positioned in space — no Star or Planet represents a Company; it displays as a label or tint on the information layer; the company ↔ client many-to-many resolves as a field lookup, not a graph edge.

**4.2 Career Content and the Two Project Classes**

FR-7: Every Project carries the identical field set — `client`, `project`, `company`, `role`, `built`, `team_size`, `duration`, `notable`, `skills`, `weight`. No Project has a field another lacks except by that field being empty; no hero-entry or minor-entry schema variant exists.

FR-8: Where populated, `notable` is 100–150 words of connected prose naming a problem, a specific environmental constraint, and a decision including its rejected alternative — no list, no bullets, no technology roll-call; ~90 words is the hard floor.

FR-9: A visitor can tell which entries carry a Notable before committing to reading one — the Deep/Shallow distinction is visible in the scene, not only in the information layer, and **the distinguishing channel is not brightness** (FR-3 binds brightness to recency).

FR-10: The stack is expressed geometrically as Dust; `notable` may name a technology only where the decision *is about* that technology. A Project's full stack is reachable only through Condensation, never by reading `notable`. The rule is *no roll-calls*, not *no names*.

FR-11: End client names are published as-is — no anonymisation, no genericisation.

FR-12: A Client Star holds 1..n Project Planets; one engagement producing two distinct problems renders as two Planets around one Star, each retaining its own problem, constraint, and decision.

**4.3 Skills as Condensing Dust**

FR-12a: A visitor can enter, hold, and leave Focus on a Project, and reading is possible while Focus is held. **While Focus is held, scroll does not advance the journey.** Leaving Focus returns scroll control to the journey and triggers Decay. Focus is reachable both on-Rail and in free flight. A Shallow Project can be Focused; it simply has no `notable` to reveal.

FR-13: Focusing a Project resolves its Skills from Dust into discrete orbiting Motes; releasing Focus reverses the process. No Mote exists while its Project is unfocused; Condensation and Decay use **the same implementation, reversed**; no Skill is instantiated in more than one place at one time; nothing spawns from nothing and nothing teleports.

FR-14: Project ↔ Skill relations are never rendered as lines or edges — the scene contains no connector geometry between Bodies.

FR-15: Skills exist as a visible diffuse medium when nothing is focused — Dust is visible between Bodies at rest, and its density does not obscure Bodies or read as fog.

**4.4 Backward-Time Navigation and Camera**

FR-16: Scrolling moves the visitor from the present into the past — the most recent entry is encountered first.

FR-17: The default journey follows Shots, each defined as an entity ID plus relative framing parameters (angle, distance, framing) — **no Shot definition contains a world coordinate**; re-settling the simulation leaves every existing Shot framing its intended subject; a Shot transition is continuous camera movement, never a cut.

FR-17a: A newly added Project is reached by the Rail with no hand-authored Shot — a default Shot template, parameterised by entity kind and Project class, supplies framing for any entity lacking one; a hand-authored Shot overrides the default for that entity. **Amended in effect by EXPERIENCE.md §2** — satisfied by the new Project being *framed at its Client's stop*, not by receiving a Shot of its own.

FR-18: How long the journey rests on a Body follows from whether it carries a Notable, not from a hand-tuned number — no per-entry Dwell value is authored; adding an entry requires no Dwell tuning. **Amended in effect** — derives at Client granularity (EXPERIENCE.md §5.3, AD-4a).

FR-19: The visitor may leave the Rail and navigate freely — free flight is opt-in, the default is on-rail, and a visitor in free flight can return to the Rail.

**4.5 Schematic Visual Identity**

FR-20: The site presents a deliberate monochrome Schematic Identity across scene and information layer — a defined palette, line weight, typography, label treatment, and UI chrome exist and are applied consistently; no element reads as a placeholder; **no "work in progress" disclaimer appears anywhere.**

**4.6 Technical Colophon**

FR-21: A surface outside the 3D scene shows the actual data and the rules that act on it — the real JSON is shown or directly retrievable, not paraphrased; the three mapping rules are stated and visibly tied to actual values from the data; the entity-relative Shot contract and the no-position-overrides rule are stated.

**4.7 Fallback and Contact**

FR-22: Visitors on incapable machines receive the Fallback — **capability is detected, not assumed, and detection precedes rendering**; the Fallback is **content-complete** (every Project, every field, every `notable`), not a teaser or stub; a Fallback visitor can satisfy the M2 gate without the 3D scene; mobile visitors receive the Fallback.

FR-23: A working contact mechanism exists at M2 without the designed ending — a visitor can initiate contact; the mechanism requires no backend; **a bare `mailto:` is insufficient** (it dead-links on the corporate laptops NFR-4 names), so a visible, copyable address or equivalent is required alongside or instead.

FR-24: The link renders as a composed artifact when pasted into Slack, LinkedIn, or a message — a deliberately composed preview image exists; the opening frame is composed knowing it will be screenshotted; **preview and title do not overstate what a mobile or Fallback visitor will receive.**

### NonFunctional Requirements

NFR-1: **First Paint.** The first frame of the Schematic scene renders within 2.5 seconds on the target hardware profile over a median broadband connection; everything behind it may stream in. A **launch requirement**, not tradeable. **Nothing gates the first frame** — no consent banner, no cookie notice, no splash, no "click to enter". `[The 2.5s NUMBER IS UNRATIFIED — principle adopted, number carried. PRD §13 Q1, §15 Flag 04, D-T4, E-T5.]`

NFR-1a: **The opening fifteen seconds.** Within roughly fifteen seconds of First Paint an unprompted visitor should register three things: that this is a **real work history**, that it is **organised rather than listed**, and that it is **deliberately designed**. Sets what the opening Shot must frame.

NFR-2: **Runtime framerate.** 30fps at 1080p on 2023-era integrated graphics with full post-FX. **An M3 gate, not a launch gate.** `[UNRATIFIED — carried, not adopted. PRD §13 Q2. Until ratified the M3 gate has no testable threshold.]`

NFR-2a: **Fallback floor.** The Fallback is offered below 24fps sustained, not below 30 — deliberately different from NFR-2's target. `[UNRATIFIED. PRD §13 Q16.]`

NFR-3: **Degradation policy: quality holds, frames drop.** Better the real thing at 24fps than a lesser thing at 30. A stable framerate reads smooth where a fluctuating one reads broken at a higher average.

NFR-4: **Target hardware profile.** A three-year-old laptop with integrated graphics at 1080p — the corporate work-laptop profile of the actual audience. Explicitly not a current Apple-silicon machine and not the dev machine.

NFR-5: **Maintenance cost.** Adding a Project costs one JSON entry plus one `weight` value — no layout work, no camera rework, no repositioning.

NFR-6: **No backend.** No CMS, no API, no server-side component, at any milestone.

NFR-7: **Content legibility outranks awe.** *If you read two Projects, you should know how Thomas thinks.* Awe is instrumental. **This is the tie-breaker:** where FR-20, FR-18, or FR-13 conflict with legibility, legibility wins.

### Additional Requirements

Technical requirements extracted from ARCHITECTURE-SPINE.md that impact epic and story creation.

**Starter template: NONE.** The architecture specifies no greenfield starter, boilerplate, or scaffold. It specifies a **paradigm** (build-time derivation pipeline feeding two read-only renderers), an exact **structural seed** (directory tree), and a **pinned stack**. Epic 1 Story 1 is therefore a hand-rolled Vite scaffold conforming to that seed, not a template instantiation.

**Pinned stack — exact versions, verified against the npm registry 2026-09-01. Pairing is load-bearing, not incidental:**
- TypeScript 7.0.x · Vite 8.2.x · React 19.x
- @react-three/fiber 9.7.x (stable — **not** v10 alpha)
- three 0.185.x · @react-three/drei 10.7.x (stable — **not** v11 alpha)
- zod 4.5.x (build-time only — devDependencies; schema gate in src/data/ and src/derive/)
- d3-force-3d 3.0.6 · zustand 5.0.x · Node 24 LTS (build only)
- drei 10 is the only stable major whose peers accept R3F 9 + React 19. drei 9 declares react ^18 / R3F ^8 and will not install. three >= 0.159 is drei 10's binding constraint.

**AD-1 — Force settling runs at build time.** The simulation runs during the build and writes settled positions into a committed artifact. The runtime scene never solves. `solve` is a **separate npm script that `build` never invokes**; `build` fails if the committed artifact is missing or fails AD-14's schema.

**AD-2 — The solve is deterministic.** Identical input must produce byte-identical output. Seed all randomness explicitly (`randomSource`), fix the iteration count rather than settling on an energy threshold, never rely on object-key or float-accumulation ordering. A determinism regression test (solve twice, assert byte-identical) is part of the test suite, and **each solve must construct a fresh generator** — d3's default LCG is module-level state with a hardcoded seed that does not reset between runs, so a test reusing it would pass while proving nothing.

**AD-3 — Single derivation point.** Every data-to-visual derivation (`isDeep`, mass, luminance band, dwell tempo, mote tier, shot framing) is computed once in `src/derive/` and resolved in the emitted artifact. No renderer contains a classification test or mapping-rule computation. **No module outside `src/derive/` may import from `src/data/`** — not renderers, not `shell/`, not `tokens/`, not `colophon/`.

**AD-4 — The DOM index is the source of truth for destinations.** A persistent DOM navigation lists every destination, generated from the layout artifact. It never reads render state, never re-projects, never moves with the camera. The canvas is `aria-hidden`. **The camera reacts to DOM focus, never the reverse.** No module outside `render-scene/` may import camera state; no state field is written by the camera.

**AD-4a — The Rail is Client-granular; Projects are never Rail stops. [ADOPTED — STRUCTURAL DEVIATION FROM THE PRD]** The Rail has one stop per **Client** (~5–6), never per Project. A Client stop frames that Client's entire system so every one of its Projects is on screen and selectable at once. **Dwell derives at Client granularity** (from the count of Deep Projects in that system), never per Project. The **default Shot template operates on Clients** and must frame the Client's full system including its widest-orbit Project. `railPosition` indexes Clients. Projects are reached only by deliberate selection, never by the Rail arriving at one. *This is flagged as the single largest divergence available to anyone building from the spine — a unit built from the PRD alone produces ~15–16 Rail stops, per-Project Dwell, and a per-Project default Shot, and none of it surfaces until the camera exists.*

**AD-5 — Destinations are addressed by stable entity ID.** Every destination reference — index entry, Shot subject, raycast hit, focus target, URL fragment — names an entity ID. Never a screen position, render-order index, or array offset.

**AD-6 — Routing decides before the 3D bundle is fetched.** Capability detection runs in the entry module as plain JavaScript, before any dynamic import resolves. Detection is **not** a React component and must not transitively load the scene.

**AD-7 — Four lazy chunks, one thin entry.** `src/shell/entry` contains no React and no Three. Four chunks load dynamically and independently: `render-scene`, `render-fallback`, `colophon`, and `solver` (Colophon live re-run only). **Nothing on the critical entry path may statically import the scene, the solver, or the raw career JSON.** A CI check fails the build if the entry chunk exceeds its size budget or if its module graph reaches Three, the solver, or `src/data/`.

**AD-8 — Capability routes; performance offers.** `detect()` tests WebGL2 context creation only — no performance probe in the First Paint path. Mobile always routes to the Fallback, where **mobile means a coarse primary pointer, never viewport width**. If the running scene later fails the NFR-2a floor, the Fallback is **offered** through the persistent one-click affordance, never forced. Reduced-motion is an independent axis — a `prefers-reduced-motion` visitor on a capable machine keeps the scene with adapted motion and is never rerouted.

**AD-9 — One state machine owns navigation.** A single store holds `{ mode: rail | freeflight, focusedProjectId: ProjectId | null, railPosition: ClientId }`. Camera and index are both subscribers; neither owns state nor mutates it directly. All transitions are named events. Focus is exclusive. Escape releases exactly one layer, innermost first.

**AD-10 — Scroll meaning is resolved by mode alone.** Scroll's two meanings are selected **solely** by reading the state machine's mode, never by event-target inspection or DOM hit testing. While `focusedProjectId` is non-null, scroll belongs to the panel and the camera subscribes to nothing.

**AD-11 — Schema validation is a hard build gate.** `career.json` is validated against an explicit schema before derivation and the build **fails** on violation. Validation must **reject unknown fields**, not merely check known ones — because entities are typed by field *absence*, a misspelled field name silently changes an entity's type rather than raising an error (`notabel` turns a Deep Project Shallow with no symptom).

**AD-12 — Design tokens are generated from one source.** DESIGN.md's frontmatter is the token source of truth. It is transformed once into CSS custom properties (DOM surfaces) and a typed JS object (scene materials). **Neither is hand-transcribed**, and no colour or type value is written literally in a component.

**AD-13 — Two files, one authored.** `career.json` is authored and is the sole source of truth. `layout.generated.json` is emitted, committed, never hand-edited, and carries a generated-file banner. The Colophon renders **both, with the mapping rules between them**.

**AD-14 — The layout artifact has a declared, versioned schema.** The artifact's shape is declared as an explicit, versioned schema in `src/derive/`, and the build fails if the emitted artifact does not validate against it. It carries **every surface's needs in one document**: entity IDs and kinds; solved 3D positions (scene); the time-axis scalar (Fallback); all derived visual properties; Dwell tempo at Client granularity; Shot framing; and the full content payload every surface renders. A consumer needing a value the schema lacks is a change to the schema and the derivation, never a local computation.

**AD-15 — One emitted destination set.** The derivation emits **one `destinations` list**; the DOM index and the raycast target set are both built from it and from nothing else. Their cardinality is asserted equal at the build gate.

**AD-16 — One writer per state field.** Every state field has exactly one writer. The store carries `focusOrigin` (`rail | freeflight`) explicitly, stored at Focus entry rather than inferred at release. Continuous scroll progress and the discrete current Client are **separate fields**.

**AD-17 — The Colophon is a fourth chunk and re-solves in isolation.** Loaded on navigation, never on the critical path. Both files it exhibits reach it as **emitted data** — the raw JSON is copied into the build output as an asset, never statically imported. Its live re-solve is presented as a **demonstration of the mechanism, not a reproduction of the shipped layout**, and the page says so.

**AD-18 — Three addressable surfaces, one router.** Scene, Fallback, Colophon are the only addressable routes, resolved in `shell/` by AD-6's entry before any chunk loads. Route changes are real history entries, so Back works. Surface-level position is preserved on departure and restored on return. **Focus is not a route** and does not create a history entry.

**Consistency conventions (binding):**
- Vocabulary is PRD §3 Glossary verbatim. **Moon** and **Ring** are the two ratified Deep/Shallow channels added by DESIGN.md (`satellite` is superseded by `Moon`). A synonym in code or copy is a discipline violation.
- Entity IDs: stable, derived from authored content, never positional. An ID must survive a re-solve and a re-order unchanged.
- Naming: derived properties are named for what they *are*, not their source — `isDeep`, not `hasNotable`; `luminanceBand`, not `recencyValue`.
- Generated files carry a header banner naming the generator and forbidding hand-editing. Committed, and diffable on purpose.
- **Boundary enforcement is by tooling, not honour** — an ESLint import-boundary rule fails the build on violation, and the AD-7 bundle assertion runs in CI.
- Scene state reads inside `useFrame` use `store.getState()` — never a reactive hook binding, which would re-render every frame.
- Dates: ISO 8601 in authored data; all display formatting derived, never authored.
- **Config: none.** No environment variables, no secrets, no runtime configuration.

**Deployment:** `validate → derive+solve (deliberate) → vite build → dist/`. Any static file host. Production only — no staging tier. Rollback is redeploying a previous commit.

**Architecture open questions (unresolved, affect stories):**
- **FR-24 preview drift** — `preview.png` can silently diverge from the opening frame if the layout is re-solved without regenerating it. Proposed: a build-time warning when `layout.generated.json` is newer than `preview.png`. **Not ratified.**
- **Host choice** — Cloudflare Pages vs Netlify is preference, not architecture.
- **`weight` semantics in the solver** — whether distance-from-Rail is a force parameter or a post-solve transform is unsettled. Affects AD-2's determinism surface; cheapest to settle when `solve.ts` is first written.

**Content authoring constraint (gates M2, PRD §8.3 + inventory-draft.md):**
- One entry (SNCF MDM replacement) is drafted and approved. **Roughly nine remain** across ~5–6 clients and 2 intermediate companies. A second SNCF project (platform upgrade programme) has raw material but no identified decision.
- **`inventory-draft.md`'s field set is missing `duration` and `weight`** — the same omission FR-7 corrects. **Fix it there before drafting the remaining nine entries**, or every entry needs revisiting (PRD §13 Q13).
- The excavation method is two explicit questions per entry: *"what did you argue for, and what did you argue against?"* (produces the decision) and *"what was annoying about this project?"* (produces the constraint, which FR-8 designates as the entire falsifiability substitute for absent metrics).
- Numbers that do exist and should be used: team size, engagement duration, system scale, what was replaced or consolidated.
- **Promotion is free**, so incomplete excavation is not a launch blocker — an entry that later yields a decision gains a `notable` and self-promotes.

### UX Design Requirements

Extracted from the DESIGN.md / EXPERIENCE.md spine pair. Both are `status: final`. Where a mock in `.working/` disagrees with either spine, **the spine wins and the mock is stale.**

**Design tokens and identity**

UX-DR1: Generate the token layer from DESIGN.md frontmatter as the single source (AD-12) — CSS custom properties for DOM surfaces and a typed JS object for scene materials, neither hand-transcribed. Every colour is a semantic light/dark pair; the bare key is light, the `-dark` key is the shipped M2 value. **M2 ships dark only**; light values are real and retained so the theme is later a token swap, not a redesign. A build that hardcodes `#08080A` has broken the light theme before it exists.

UX-DR2: Implement the **five-step stroke ladder** (`stroke-dust`, `stroke-rest`, `stroke-near`, `stroke-active`, `stroke-focus`) as the primary depth channel. The step encodes **distance and state, never category**. Data-derived brightness (FR-3) modulates only within the resting band (`stroke-dust`…`stroke-near`); `stroke-active` and `stroke-focus` are reserved for camera state and applied on top. A recent Shallow Project never reaches white while unfocused.

UX-DR3: Implement the **five-step ink ladder** (`ink-faint`, `ink-quiet`, `ink-label`, `ink-prose`, `ink-lift`). Type never borrows a stroke token and a stroke never borrows an ink token, even where the hex is identical — the ladders are separately tunable and diverge at M3. **`ink-quiet-dark` (`#5E5E68`) is not used for text anywhere in the product** (2.92:1 / 3.12:1 — below floor); it survives only for the Dust medium and non-meaningful strokes. Any future use of it on a glyph is a defect.

UX-DR4: **White is spent once per frame.** `stroke-focus` / `ink-lift` apply to the Focused Body, the Client Star the camera is heading for, and nothing else. If two things are white, the frame has no subject.

UX-DR5: Implement the type ramp exactly as specified — `chrome` 9.5px/0.34em, `scene-label-client` 11px/0.36em, `scene-label-project` 12px/0.12em, `scene-label-secondary` 9.5px/0.17em, `mote-label` 9.5px/0.16em, `panel-kicker` 9.5px/0.4em, `panel-title` 23px/**200 weight**/22ch, `notable-prose` 16px/1.85/56ch, `editorial-rule` 13.5px/1.8/48ch, `field-label` 9.5px/0.24em uppercase, `field-value` 13.5px. One family (Helvetica Neue stack), weight 200–300, **never above 400 — bold does not exist in this system.** Tracking scales inversely with size. The measure is a hard constraint: widening the panel does not widen the measure.

UX-DR6: Implement the spacing scale — 4/8/12/20/28/40/52/56, with **no 16 and no 24**. Fewer available gaps means fewer arbitrary ones.

UX-DR7: **No shadows anywhere, at any milestone.** No `box-shadow` on the panel, a label, a Body, or the Fallback. Depth is carried by stroke luminance, emptiness, the vignette, and tonal surface layering — in that priority order. **No glow, no bloom, no lens flare at M2.** Never scale-on-hover, blur, or opacity fades on Bodies.

UX-DR8: Implement the shape vocabulary and nothing else — the circle (Bodies, Motes, Moons; `fill:none` at M2 with a filled core dot at ~15% radius on Client Stars only), the ellipse (orbits only, off-axis Mote orbits at −16°/+26°/−46°), the straight line (leader lines only, single segment, **no elbows, no dog-legs, no curves**), and the square-cornered rectangle (radius `0` everywhere — **not one rounded corner in this product**). No polygons, no icons, no glyphs beyond the type family. The one permitted text arrow is the corner-chrome scroll instruction.

UX-DR9: Implement the vignette as a radial gradient of `vignette` (always identical to `surface-base` by rule) over the whole frame — 0 opacity to 42% radius, rising to 0.9 at the edge.

**The Deep/Shallow signal — the M2 gate's second clause**

UX-DR10: Implement the **Moon + Ring** signal, layered, both derived from Notable presence alone. Deep Project: Moon (filled dot, `stroke-active`, radius ≈ 0.27 × body radius, min 2.4px, offset ≈ 2 × body radius) **and** Ring (continuous concentric circle, `stroke-near`, 0.7px, radius ≈ 2.2 × body radius). Shallow Project: neither. Body geometry is otherwise identical.

UX-DR11: **Neither size nor brightness may carry the Deep/Shallow signal.** FR-3 binds mass to duration and brightness to recency; a long-ago Shallow Project can legitimately be the largest Body in a system and a recent one the brightest. Any implementation leaning on scale or luminance will invert on real data.

UX-DR12: **THE COLLISION RULE — binding on both spines.** The Deep Project's rest-state Ring and the hover affordance **must not both be rings.** Hover reveals a **leader line and label, never a shape**: a straight 0.6px `stroke-rest` leader from Body edge to label anchor with no elbow, the Project title at `scene-label-project` in `ink-lift`, one secondary line (role, team size, class) at `scene-label-secondary`, and the Body's own stroke stepping `stroke-rest` → `stroke-active` — a luminance step, not new geometry. This is the single rule most likely to be lost in implementation, because both treatments are individually reasonable and only their combination fails.

UX-DR13: The `:focus-visible` treatment is **identical to hover** plus a 1px `stroke-focus` square-cornered outline at 3px offset **around the label block, never around the Body** — an outline on the Body would reintroduce the ring collision through the back door. Focus visibility is never suppressed or opacity-reduced.

**Motes and Dust**

UX-DR14: A Mote carries its label **automatically on Condensation — no hover, no tooltip, no click.** An unlabelled Mote delivers no information and reduces the mechanic to ornament.

UX-DR15: Implement Mote tiering by **dot radius and orbit distance, never by ink below the contrast floor** — three tiers at 2.6px / 2.1px / 1.8px on three distinct orbits, all labels at `ink-label` or above. `[ASSUMPTION D-A4: tier derives from how many Projects share the Skill — the most-shared sit on the inner orbit. Derivable with no new authored field. Not ratified; the alternative is JSON array order, which is authored and therefore rots.]`

UX-DR16: Implement the Mote **angular quota** — the orbit ring is divided into slots and no two labels occupy adjacent slots on the same orbit. With three orbits and nine Skills this is comfortable. `[GAP D-G3/E-G6: degradation above ~12 simultaneous labels is unspecified. No entry exceeds nine today.]`

UX-DR17: Implement Mote **label side-flip and radial anchoring** — a label anchors outward from the Body (left of the dot on the left half of the orbit, right on the right half) so no label crosses the Focused Body or the panel edge. A label that would land under the panel column is **suppressed and its Mote re-slotted on the next frame, never truncated with an ellipsis.**

UX-DR18: Implement Dust at rest as two components at `stroke-dust` — the **medium** (broad radial gradients centred on each Client system, `stroke-rest` at 0.42 opacity to 0 at the edge) and the **particles** (circles at 0.6–0.9px radius, scattered sparsely). Dust never obscures a Body and never reads as fog: if a Body's stroke-ladder step is ambiguous against the Dust behind it, the Dust is too dense.

**The panel and the information layer**

UX-DR19: Implement the panel as a fixed side column — `surface-raised`, 1px `surface-edge` left border, no other boundary, no radius, no shadow, padding 56/56/60. It is the only rectilinear element in the product. `[ASSUMPTION D-A3: 560px fixed on desktop; below ~1200px viewport it becomes a percentage (proposed 46%) with the measure clamped at 56ch and padding stepping to 40px. Untested; verify at M1.]`

UX-DR20: **The scene is never occluded.** The panel takes column width and the camera composes the Focused Body and its Motes into the remaining half. **No modal, no scrim, no dimmed backdrop, no full-screen overlay** — the Motes must stay visible while the Notable is read, because their being visible *is* the answer to "where is the stack?"

UX-DR21: Implement the panel's vertical rhythm exactly — kicker→title 22px, title→first prose **40px**, prose ¶→¶ 20px, prose→editorial rule 34px, last prose→field table **52px**, field row→row 12px + 1px rule. The spacing is the argument: the 52px gap is what makes the panel put the argument before the record.

UX-DR22: Panel contents in order: `panel-kicker` (Client name), `panel-title` (Project title), **the reading position**, the field table (`Role`, `Team`, `Built`), `panel-release`. **There is no `Skills` field row** — the Dust is the display (FR-10). Any field table listing technologies has reintroduced the duplication the Dust mechanic exists to remove; the direction-03 mock is stale on this point.

UX-DR23: **The Shallow panel is the Deep panel with a different final block in the reading position — not the Deep panel minus a block.** No skeleton, no placeholder, no empty state, no visible hole. This is both the promotion contract (adding a Notable in 2029 swaps the rule line for the Notable and nothing else changes) and the R-3 mitigation.

UX-DR24: Implement the **Notable block typesetting** — the whole Notable at `notable-prose` in `ink-prose`, with the **one sentence carrying the constraint set in `ink-lift`** and nothing else. **NOT bold. NOT labelled. NOT indented, boxed, ruled, or given its own paragraph.** It stays inside the flow of the paragraph. A labelled constraint would read as a filled-in form and destroy the one thing the Notable is for.

UX-DR25: Implement the **editorial rule block** for Shallow Projects — one line in the author's voice in the reading position, at `editorial-rule` in `ink-label` (raised from the mock's `ink-quiet` per the contrast floor). Working text: *"Entries carry a written argument only where there was an argument to have."* `[ASSUMPTION D-A5/E-A1: identical wording on all ~7 Shallow Projects. A convention repeated is a convention; a convention reworded is a defence. Needs cold-read validation at M0.]`

UX-DR26: Implement the **panel release affordance** — the word `release` in `{typography.chrome}` at `ink-label-dark`, preceded by a 12px hairline rule, positioned at the bottom of the panel after the field table, left-aligned to the text column. Hover and `:focus-visible` raise it to `ink-prose-dark` and extend the hairline to 20px. **Never a floating X, never top-right, never overlapping the scene, never an icon without its word.**

**Chrome, motion, and interaction**

UX-DR27: Implement **exactly two corner chrome lines per frame**, inset 40px, in opposite corners, at `chrome` in `ink-label-dark`. Left-top carries identity plus the Colophon route: `THOMAS NAVARRO · the model`. Right-bottom is the **stateful instruction slot**: on-Rail `scroll ↓ — time runs backward`; free flight `↩ resume the journey`; Focused `esc — release`. **Never three lines. Never a persistent HUD, minimap, or nav bar.** The free-flight return does not add a third line — it replaces the second. The affordance is a real focusable control in free-flight and Focused states, not decorative text.

UX-DR28: **"It does not jump; it flies."** There are **no cuts anywhere in the product** — not between Shots, not snapping to a destination in free flight, not the panel appearing while the camera is stationary, not instant re-framing on window resize, and not a transition that begins after the previous one has stopped.

UX-DR29: Implement the **Focus transition as ONE continuous combined move** — the camera flies toward the Project and recomposes it off-centre into the half the panel will not occupy, the panel opens in the other column, and Condensation begins, as **one animation with one easing curve**. Release is the same move reversed.

UX-DR30: Implement Rail motion — scroll drives position along the Rail, scroll velocity maps to camera velocity **damped** (the camera has mass and does not stop the instant the wheel does). Arrival at a Client stop frames the whole system with every Project on screen and selectable; the default Shot template must guarantee the widest-orbit Project is inside the frame, since a Project framed out of shot is unreachable from the Rail. Departure begins before the visitor has finished scrolling in — the "stop" is a slowdown, not a halt.

UX-DR31: Implement **Condensation fast** — faster than the reader's decision to look; it delivers information the visitor asked for and the visitor must not wait to read. Decay is the same curve reversed, one tuning pass. Governing metaphor: **"Skills are weather, not furniture."** Nothing spawns from nothing; every Mote arrives from Dust that was already visible.

UX-DR32: Implement the **three free-flight layers addressing one destination set** — click-to-fly (pointer; activating any visible Body flies the camera to it), pull-back overview (wayfinding; frames the whole universe, making the boundary legible rather than enforcing it with an invisible wall), and the keyboard index (a first-class path, not a fallback). Return to the Rail is guaranteed.

UX-DR33: Implement **scroll's two meanings separated by state, never overlapping** — on-Rail/free-flight scroll advances the journey; in Focus scroll scrolls the panel and does not move the camera.

UX-DR34: Implement **Escape precedence — innermost first, unconditional.** Focused in free flight → releases Focus only, leaving free flight at the same Body. Focused on the Rail → releases Focus only, leaving the Rail at the same stop. Free flight, not Focused → releases free flight, the Rail resumes. On the Rail, not Focused → inert. One press releases one layer, never two.

UX-DR35: Implement the pointer grammar — hover reveals the affordance; click on a Project enters Focus; click on a Client Star flies to that Client's stop; **click on empty space does nothing** (a visitor exploring a mostly-empty frame will click empty space constantly and must not be punished for it). **No drag, no orbit-by-drag, no pinch-zoom at M2** — free flight is addressed, not piloted.

UX-DR36: Implement the keyboard map — `Tab`/`Shift+Tab` traverse the destination index (Clients, and Projects within a Client, in Rail order present→past); `Enter`/`Space` activate; `Escape` releases per UX-DR34; `↑`/`↓` advance and reverse along the Rail; `Home` returns to the opening frame. Every keyboard destination is the same set pointer users reach.

UX-DR37: Implement streaming without visible popping — Bodies arriving after First Paint fade up their stroke through the ladder rather than appearing at final luminance. **No loading screen, no progress bar, no splash, no click-to-enter, no skeleton screens.**

**Accessibility floor (behavioural)**

UX-DR38: **P1 — the index is a real DOM tree, independent of render state.** A persistent `<nav>` containing a nested list, one item per Client, each with a nested list of its Projects. It exists in the document from First Paint, is populated from the layout artifact, and **never derives its structure, order, or focusability from camera state, viewport position, or canvas hit-testing.**

UX-DR39: **P2 — every Body has a DOM proxy carrying its accessible name.** Each index entry is a `<button>` whose accessible name is the Client name or Project title, and **whose Deep/Shallow state is exposed as text within the entry** — not as an ARIA attribute and not as a visual marker alone, because only text lets a screen-reader user answer *which entries are worth reading*. `aria-pressed` reflects Focus. The canvas root is `aria-hidden="true"`.

UX-DR40: **P3 — focus is moved deliberately and returned deliberately.** On Focus entry, DOM focus moves to the panel container (`tabindex="-1"`, labelled by the entry's heading). On release, focus returns to **the index entry that opened it** — never the document root, never lost to the canvas. (WCAG 2.4.3, 2.4.11.)

UX-DR41: **P4 — Motes reach assistive technology through the panel, not the orbit.** Skills are present in the panel's DOM **as a list** at the moment Condensation begins — rendered visually as orbiting Motes and read as a plain list by a screen reader, from the same markup. **No live region** — a live region here would narrate an orbit, which is noise.

UX-DR42: **No keyboard trap.** Focus opens a panel, `Escape` always releases it, `Tab` from the panel returns to the scene's destination order. There is no state the keyboard can enter and not leave.

UX-DR43: Implement **reduced motion across the whole product, the Rail included** — durations shorten to the floor of the easing curve **without introducing a cut**; parallax, drift, and idle orbital motion stop (orbits are drawn, not animated); **Dwell is unchanged** because reading time is not motion. **Reduced motion and Fallback routing are independent** — a reduced-motion visitor on a capable machine keeps the scene and is never rerouted.

UX-DR44: Meet the **contrast floor as a hard minimum**: Notable prose and panel title ≥7:1 (AAA); field values and prose at rest ≥7:1; field labels, editorial rule, Mote labels (all tiers), corner chrome, and scene labels ≥4.5:1. **Corner chrome is text and takes the 4.5:1 floor, not the 3:1 incidental floor.** `[ASSUMPTION D-A2: no readable scene label composed inside the outer 12% of the frame, because the vignette pulls edge labels below their computed ratio; labels landing there are re-anchored inward by the leader line. Verify on the greybox at M1.]`

**Voice and copy**

UX-DR45: Implement copy in **exactly five places and no sixth** — Notables and field values, the Shallow Project rule line, two lines of corner chrome, the Colophon's annotations on the mapping rules, and the contact route. **No tooltips, no onboarding, no empty states, no help text, no captions explaining marks.** If a mark needs a caption, the mark is wrong.

UX-DR46: Enforce the voice refusals absolutely — no discountable claims ("improved maintainability", "enhanced performance", "delivered value"); no boasting about build difficulty; no describing how it was made; no responsibility-instead-of-choice prose in a Notable; no fabricated testimonials; **no "work in progress" disclaimer, badge, beta tag, or apologetic microcopy in any surface or register, including the Fallback and the link preview**; no published criticism of a named Client. Microcopy pattern for genuine incompleteness: **acknowledge in three words, never in a banner** — "for now" is the entire pattern.

**The Fallback**

UX-DR47: The Fallback inherits **every token in DESIGN.md** — same palette, same type ramp, same square corners, same absence of shadow. It is **a designed view, not an apology**, and never presented as a lesser destination. Ratified layout: **time is the axis** — horizontal on desktop, transposed to vertical on phone. The vignette is dropped (the plate has no centre and every corner carries content).

UX-DR48: On the Fallback the **Ring carries the Deep/Shallow signal alone** — there is no 3D Moon on a flat chart. Three redundant structural channels ship: a ring on the plate marker, the ring repeated per index row, and a real `Notable` text column. **Skills are shown on the Fallback** — the prohibition is on duplicating the Dust, and the Fallback has no Dust to duplicate; content parity outranks it.

UX-DR49: The Fallback is reachable in **one click from the scene at any time by any visitor**, and is the preferred surface for date navigation. It carries the same voice, the same rule line, and the same absence of disclaimers. **It must not, anywhere, tell the visitor they are missing something** — no banner, no "best viewed on desktop".

**The Colophon**

UX-DR50: Implement the Colophon as a **conventional document, not a canvas** — ground `surface-base-dark` (same void as the scene, so the transition does not feel like a different site), prose at `measure-prose`, real headings in order, a real `<table>` for the derivations, and the JSON in a `<pre>` with an accessible name. It requires none of the §11.1 preconditions and is the one surface where a screen-reader user receives exactly what a sighted user receives.

UX-DR51: Render each of the three mapping rules as a derivation row on a **named real entity** — rule name at `field-label`, input and output values at `field-value`, with the **derived quantity lifted to `ink-lift`** (the same device the Notable uses). `mass ← duration`, worked on one real Project. Prose exists only to name what is being shown.

UX-DR52: Render the JSON **in full, syntax-set and readable, not summarised and not excerpted behind a fold**, at `field-value` on `surface-raised-dark` with a 1px `surface-edge-dark` left border, no radius, no shadow, in a horizontally scrollable container. **Syntax setting is luminance only** — keys at `ink-lift`, values at `ink-prose`, punctuation and structure at `ink-label`. **No syntax colouring**: the palette is achromatic everywhere else and four hues here would break the identity at the exact moment the page argues for the author's consistency. `[ASSUMPTION D-A6/§7.11: monospaced system stack at 12px/1.7, rendered inline rather than linked as a download. Not ratified.]`

UX-DR53: The Colophon **states what is not there** — no backend, no CMS, no position overrides, no per-entry camera work — because several load-bearing claims are about absences and an absence cannot be shown by rendering data. This is the one place prose does the work. **It is not a features list** and **it does not draw a small version of the scene to explain itself.**

UX-DR54: Colophon entry is the **left-top corner chrome slot appended to identity** (`THOMAS NAVARRO · the model`), preserving the two-line chrome rule. The Fallback carries the same route in its own chrome. **Return resumes the scene at the stop it was left at, not at First Paint** — a visitor who inspects the model and is returned to the beginning has been punished for looking.

**Shareability**

UX-DR55: Compose the link preview image from the same system — the opening frame at `surface-base`, one white Client Star, the Rail at `stroke-dust`, corner chrome. **It must not overstate what a mobile visitor receives** (they get the Fallback), and the forbidden move is any disclaimer. `[GAP D-G5: "honest without being self-deprecating" — no treatment decided.]`

### FR Coverage Map

Every FR is mapped to exactly one owning epic. NFRs are listed against the epic that verifies them, not every epic that respects them.

| Req | Epic | Coverage |
|---|---|---|
| FR-1 | Epic 1 | Embedded `career.json` as sole source of truth; no backend fetch; retrievable for inspection |
| FR-2 | Epic 1 | Force-directed solve computes every Body position; no literal coordinates anywhere |
| FR-3 | Epic 1 | Exactly three mapping rules — mass←duration, brightness←recency, distance←weight |
| FR-4 | Epic 1 | Single `weight` knob per entry, default `1` |
| FR-5 | Epic 1 | Classification by field absence; no type flags |
| FR-6 | Epic 1 | Company as attribute, never a Body; resolved by field lookup |
| FR-7 | Epic 1 | Fixed schema for every Project, enforced by the AD-11 build gate |
| FR-8 | Epic 3 | Notable typesetting — prose, constraint sentence lifted in ink |
| FR-9 | Epic 3 | Deep/Shallow distinguishable at rest via Moon + Ring (derived in Epic 1, rendered here) |
| FR-10 | Epic 3 | Skills as a separate geometric channel; no Skills row in the panel |
| FR-11 | Epic 3 | Real client names ship unanonymised |
| FR-12 | Epic 1 | One Client Star holds 1..n Project Planets |
| FR-12a | Epic 2 | Focus interaction model; scroll does not advance the journey while Focus is held |
| FR-13 | Epic 2 | Condensation on Focus, Decay on release — one implementation, reversed |
| FR-14 | Epic 2 | No drawn connector lines between a Project and its Motes |
| FR-15 | Epic 2 | Dust present at rest, never fog |
| FR-16 | Epic 2 | Backward-time scroll, present → past |
| FR-17 | Epic 2 | Authored entity-relative Shots; no world coordinates; continuous motion, never a cut |
| FR-17a | Epic 2 | Default Shot template at Client granularity; every Project framed without authoring a Shot |
| FR-18 | Epic 2 | Dwell derived at Client granularity from Deep Project count |
| FR-19 | Epic 2 | Free flight on request, three layers, one destination set; return guaranteed |
| FR-20 | Epic 3 | Coherent Schematic Identity across scene and information layer; no disclaimer anywhere |
| FR-21 | Epic 5 | Colophon exhibits raw JSON, derived artifact, and the rules between them |
| FR-22 | Epic 4 | Capability-detected Fallback, content-complete, one click from the scene |
| FR-23 | Epic 6 | Conventional contact route; visible copyable address, no bare `mailto:` alone |
| FR-24 | Epic 6 | Designed shareability — composed preview image, honest about the Fallback |
| NFR-1 | Epic 6 | First Paint budget **verified** on target hardware (enablers built in Epics 1 and 4) |
| NFR-1a | Epic 3 | The opening fifteen seconds — what the opening Shot must accomplish |
| NFR-2 | — | **M3 gate, not launch.** Out of M2 scope. Unratified threshold. |
| NFR-2a | Epic 4 | Fallback floor — the scene is offered, never forced, below the sustained-fps floor |
| NFR-3 | Epic 4 | Degradation policy: quality holds, frames drop |
| NFR-4 | Epic 4 | Target hardware profile governs detection and verification |
| NFR-5 | Epic 1 | Maintenance contract — one entry plus one number, verified by an add-an-entry test |
| NFR-6 | Epic 1 | No backend, enforced structurally: no fetch, no config, no runtime data path |
| NFR-7 | Epic 3 | Legibility outranks awe — the tie-breaker where identity conflicts with reading |

**Out of scope for this breakdown** (recorded so the omission is deliberate, not an oversight):
- **M0 — the cold-read** (PRD §9). Needs no code; mitigates R-2 and R-3; tracked outside this document by user decision.
- **Content authoring** (PRD §8.3). ~9 entries remain and they gate M2, but the work is editorial rather than developmental; tracked outside this document by user decision. **The `inventory-draft.md` schema fix (`duration`, `weight`) belongs to that workstream and blocks drafting the remaining nine.**
- **M3 realism, M4 collapse ending, M5 fun layer.** Post-launch by PRD §8.2.

## Epic List

### Epic 1: The Data Model and the Build Pipeline

Thomas can author a career entry in one JSON file and have the build reject it if it is malformed, derive every visual property from it, solve the layout deterministically, and commit the result as a versioned artifact. Adding an entry costs one JSON object and one `weight` value — no layout work, no camera work, no repositioning. Nothing renders yet; what exists is a validated, committed layout artifact that every later epic reads and no later epic re-derives.

**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-12
**NFRs verified:** NFR-5, NFR-6
**ADs realised:** AD-1, AD-2, AD-3, AD-5, AD-11, AD-13, AD-14, AD-15, plus the AD-3/AD-7 boundary enforcement tooling
**Standalone:** Produces a complete build pipeline and committed artifact with no renderer in existence. Enables every other epic; requires none of them.

### Epic 2: The Greybox Scene — Bodies, Rail, and Focus

A visitor can scroll backward through time along a Client-granular Rail, arrive at a Client stop that frames the whole system with every Project on screen and selectable, deliberately focus one Project, watch its Skills condense out of the Dust into labelled Motes, and read beside the scene without the camera moving off what is being read. A keyboard visitor reaches every destination a pointer visitor reaches. This is the PRD's M1 milestone: the pacing works with no visual polish at all.

**FRs covered:** FR-12a, FR-13, FR-14, FR-15, FR-16, FR-17, FR-17a, FR-18, FR-19
**ADs realised:** AD-4, AD-4a, AD-9, AD-10, AD-16; EXPERIENCE.md §11.1 P1–P4
**Standalone:** A complete, interactive, untextured scene. Reads Epic 1's artifact; requires no later epic to function.

### Epic 3: The Schematic Identity and the Information Layer

A visitor sees a deliberate monochrome design system rather than an unfinished greybox — and, crucially, can tell which entries are worth reading before opening any of them. The Deep/Shallow signal is present at rest on every Project simultaneously, carried by two redundant structural channels that survive a compressed screenshot and a low-DPI corporate laptop. This epic closes both clauses of the M2 gate.

**FRs covered:** FR-8, FR-9, FR-10, FR-11, FR-20
**NFRs verified:** NFR-1a, NFR-7
**ADs realised:** AD-12
**Standalone:** Takes Epic 2's greybox to launch-quality visual identity. Requires Epics 1 and 2; requires no later epic.
**Highest-variance epic in the set (PRD R-4):** FR-20 gates launch and sits in the author's self-identified weakest discipline. It is a first-class deliverable with its own definition of done, not a styling pass appended to the end.

### Epic 4: The Fallback and Capability Routing

A visitor on a phone, a locked-down corporate laptop, or any machine without WebGL2 receives a complete, designed flat star chart instead of an error or a degraded scene — and any visitor on any machine can reach it in one click. Detection precedes rendering, so nobody ever sees a broken 3D scene. The Fallback is content-complete: every Project, every field, every Notable, no truncation.

**FRs covered:** FR-22
**NFRs verified:** NFR-2a, NFR-3, NFR-4
**ADs realised:** AD-6, AD-7, AD-8, AD-18
**Standalone:** The PRD calls this "a second product with one FR." It reads Epic 1's artifact and shares no rendering code with the scene. Independently orderable after Epic 1.

### Epic 5: The Colophon

A visitor can inspect the actual data file the site reads, see the three mapping rules worked against real values drawn from it, and read what the site deliberately does *not* have — no backend, no CMS, no position overrides, no per-entry camera work. It shows rather than describes, which is the only form that satisfies the transfer claim.

**FRs covered:** FR-21
**ADs realised:** AD-13, AD-17, AD-18
**Standalone:** A conventional document reachable from both scene and Fallback. Requires Epic 1's artifact; independently orderable thereafter.

### Epic 6: Launch Surface — Shareability, Contact, and First Paint

A visitor who receives the link in Slack sees a composed image rather than a blank card, one that does not overstate what a mobile visitor will receive. Anyone who wants to reach Thomas can, without depending on a configured mail client. And the first frame of the Schematic scene arrives fast enough on a real target machine that The Forward — who has no context and no reason to wait — is still there when it does.

**FRs covered:** FR-23, FR-24
**NFRs verified:** NFR-1
**Standalone:** The last mile before the CV link goes live. Requires a scene to measure and a Fallback to be honest about, so it lands after Epics 2 and 4.

### Dependency flow

```
Epic 1 (pipeline + artifact)
  ├─→ Epic 2 (scene) ─→ Epic 3 (identity)
  ├─→ Epic 4 (fallback + routing)
  ├─→ Epic 5 (colophon)
  └─→ Epic 6 (launch surface — needs Epic 2 and Epic 4 in place to verify)
```

Epic 1 → 2 → 3 is a hard chain. Epics 4, 5, and 6 depend only on Epic 1's artifact; 6 additionally needs 2 and 4 present to verify against. No epic requires a later epic to function.

---

## Epic 1: The Data Model and the Build Pipeline

Thomas can author a career entry in one JSON file and have the build reject it if it is malformed, derive every visual property from it, solve the layout deterministically, and commit the result as a versioned artifact. Adding an entry costs one JSON object and one `weight` value. Nothing renders yet; what exists is a validated, committed layout artifact that every later epic reads and no later epic re-derives.

**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-12 · **NFRs:** NFR-5, NFR-6
**ADs realised:** AD-1, AD-2, AD-3, AD-5, AD-11, AD-13, AD-14, AD-15

### Story 1.1: Project scaffold on the pinned stack

As Thomas the maintainer,
I want a Vite + TypeScript project scaffolded on the exact pinned stack and the architecture's directory seed,
So that every later story builds on the dependency set the architecture verified, and a rebuild in five years starts from a known-good foundation.

**Acceptance Criteria:**

**Given** an empty repository
**When** the project is scaffolded
**Then** `package.json` pins exact versions: TypeScript 7.0.x, Vite 8.2.x, React 19.x, @react-three/fiber 9.7.x, three 0.185.x, @react-three/drei 10.7.x, d3-force-3d 3.0.6, zustand 5.0.x
**And** no dependency resolves to an alpha line — R3F v10 and drei v11 are explicitly excluded
**And** `npm install` completes with no peer-dependency warnings, proving the drei 10 / R3F 9 / React 19 pairing

**Given** the architecture's Structural Seed
**When** the directory tree is created
**Then** `src/data/`, `src/derive/`, `src/shell/`, `src/render-scene/`, `src/render-fallback/`, `src/colophon/`, `src/tokens/`, `generated/`, and `public/` all exist
**And** each directory carries a stub naming its role and its import constraints

**Given** the project targets Node 24 LTS for the build
**When** the toolchain is configured
**Then** `.nvmrc` or the `engines` field declares Node 24
**And** `npm run build` succeeds on a clean checkout

**Given** NFR-6 forbids any backend
**When** the project is configured
**Then** no environment variable, `.env` file, secret, or runtime configuration mechanism exists
**And** no server, serverless function, or API route is scaffolded

### Story 1.2: Authored career data with a build-gating schema

As Thomas the maintainer,
I want `career.json` validated against an explicit schema that rejects unknown fields before anything derives from it,
So that a misspelled field name fails the build loudly instead of silently changing an entity's type.

**Acceptance Criteria:**

**Given** entities are classified by field absence (FR-5)
**When** the schema is written
**Then** it defines the Project field set exactly: `client`, `project`, `company`, `role`, `built`, `team_size`, `duration`, `notable`, `skills`, `weight`
**And** `duration` is required on every Project, because FR-3 derives mass from it and brightness from its recency
**And** `weight` is optional with a default of `1`, and is the only hand-authored number in the file

**Given** a field name is misspelled — `notabel` instead of `notable`
**When** validation runs
**Then** the build **fails** with an error naming the unknown field and the entry it appeared on
**And** the failure is loud: a non-zero exit code, not a warning

**Given** `career.json` contains the approved SNCF entry
**When** validation runs
**Then** it passes
**And** the entry's `notable` is present, making it a Deep Project by absence-classification alone, with no type flag anywhere in the file

**Given** a Project omits `notable` entirely or carries it as an empty string
**When** validation runs
**Then** it passes and the entry is a Shallow Project
**And** no schema variant, flag, or special case distinguishes it

**Given** dates are authored in the data
**When** any date value is written
**Then** it is ISO 8601, and no display formatting appears in the authored file

### Story 1.3: The three mapping rules and classification by absence

As a visitor,
I want every Body's visual properties to follow from the career data by a small fixed set of rules,
So that what I see is the record itself rather than an author's arrangement of it.

**Acceptance Criteria:**

**Given** the three mapping rules are the whole visual derivation (FR-3)
**When** `derive/rules.ts` is implemented
**Then** mass derives from `duration`, luminance band derives from recency, and distance-from-Rail derives from `weight`
**And** exactly three rules exist — no fourth mapping rule is present anywhere in the module

**Given** two Projects with different durations
**When** mass is derived
**Then** the longer engagement yields the greater mass

**Given** two Projects with different recency
**When** the luminance band is derived
**Then** the more recent entry lands in a brighter band
**And** the band is confined to the resting range and never reaches the values reserved for camera state

**Given** derived properties are consumed by renderers that must not re-derive
**When** properties are named
**Then** they are named for what they are, not their source: `isDeep`, never `hasNotable`; `luminanceBand`, never `recencyValue`

**Given** a Project carries a populated `notable`
**When** `isDeep` is derived
**Then** it is `true`, and the derivation treats a `null` and an empty-string `notable` identically, so no two consumers can disagree about the entry's class

**Given** Company is an attribute and never a Body (FR-6)
**When** derivation runs
**Then** no Star or Planet is emitted for a Company
**And** the company-to-client relation resolves as a field lookup, not a graph edge

**Given** a Client holds several Projects (FR-12)
**When** the entity graph is derived
**Then** each Client owns 1..n Projects, and one engagement producing two distinct problems yields two Projects under one Client

**Given** these derivations are pure functions
**When** the test suite runs
**Then** each rule is unit-tested against fixture data with no DOM, no React, and no Three imported

### Story 1.4: A deterministic force solve

As Thomas the maintainer,
I want the force simulation to produce byte-identical output from identical input,
So that the committed layout does not churn on every build and the composed opening frame stays reproducible.

**Acceptance Criteria:**

**Given** the solve must be reproducible (AD-2)
**When** `derive/solve.ts` is implemented with d3-force-3d
**Then** all randomness is seeded explicitly through an injected `randomSource`
**And** the simulation runs a fixed iteration count rather than settling on an energy threshold
**And** no logic depends on object-key ordering or float-accumulation ordering

**Given** d3's default LCG is module-level state with a hardcoded seed that does not reset between runs
**When** a solve is invoked
**Then** it constructs a **fresh generator**, so a test that reuses the module default cannot pass while proving nothing

**Given** a determinism regression test is part of the suite
**When** the solve runs twice against identical input in one process
**Then** the two outputs are byte-identical
**And** the test fails if either run mutates shared state that would affect the other

**Given** the simulation solves positions from data (FR-2)
**When** the solve completes
**Then** every Client Star holds its own Projects in orbit
**And** no literal position coordinate appears in `src/data/` or in any authored source file

**Given** ~15–16 Bodies is the expected scale
**When** the solve runs on the target profile
**Then** it settles within the generous budget the small inventory allows, and is not over-engineered for scale that will not arrive

### Story 1.5: The versioned layout artifact

As a downstream renderer,
I want one committed artifact with a declared, versioned schema carrying every surface's needs,
So that the scene and the Fallback consume the same document and cannot drift apart.

**Acceptance Criteria:**

**Given** the artifact is the contract every consumer reads (AD-14)
**When** its schema is declared in `derive/artifact-schema.ts`
**Then** it carries a version field, entity IDs and kinds, solved 3D positions for the scene, the time-axis scalar for the Fallback, all derived visual properties (`isDeep`, mass, `luminanceBand`, mote tier), Dwell tempo at Client granularity, Shot framing, and the full content payload every surface renders
**And** content parity is absolute: the payload carries every field the Fallback must show, since FR-22 admits no truncation

**Given** the emitted artifact must satisfy its own contract
**When** the pipeline emits `generated/layout.generated.json`
**Then** the build **fails** if the emitted artifact does not validate against the declared schema

**Given** the artifact is generated and the source is authored (AD-13)
**When** the artifact is written
**Then** it carries a header banner naming the generator and forbidding hand-editing
**And** it is committed to the repository and diffable on purpose

**Given** solving is a deliberate act (AD-1)
**When** the npm scripts are defined
**Then** `solve` is a separate script that `build` **never** invokes
**And** `build` fails if the committed artifact is missing or fails schema validation
**And** deliberateness is therefore a property of the scripts, not of the author's memory

**Given** a consumer needs a value the schema lacks
**When** that situation arises
**Then** the documented resolution is a change to the schema and the derivation — never a local computation in a renderer

### Story 1.6: One emitted destination set

As a keyboard visitor,
I want every destination reachable by every input path to come from a single list,
So that nothing is reachable by pointer but invisible to the keyboard, or the reverse.

**Acceptance Criteria:**

**Given** two input paths will later address destinations — the DOM index and pointer raycasting (AD-15)
**When** `derive/destinations.ts` emits
**Then** it produces exactly **one** `destinations` list in the artifact
**And** both consumers are documented as building from it and from nothing else

**Given** destinations must survive a re-solve (AD-5)
**When** each destination is addressed
**Then** it names a stable entity ID derived from authored content
**And** no destination reference is a screen position, a render-order index, or an array offset
**And** an ID survives a re-solve and a re-order unchanged

**Given** the two consumer sets must not diverge
**When** the build gate runs
**Then** the cardinality of the destination set is asserted, and the build fails on mismatch
**And** the rule is explicit: an entity not in `destinations` is reachable by no input path, and one that is must be reachable by all of them

**Given** the entity graph contains Clients and Projects
**When** destinations are emitted
**Then** every Client and every Project appears exactly once

### Story 1.7: Client-granular Dwell and default Shot framing

As a visitor,
I want the journey to slow down where there is something worth reading, without anyone hand-tuning a number per entry,
So that pacing carries meaning and the site still works when an entry is added in five years.

**Acceptance Criteria:**

**Given** the Rail stops at Clients, never at Projects (AD-4a)
**When** Dwell is derived in `derive/dwell.ts`
**Then** it derives at **Client** granularity from the count of Deep Projects in that Client's system
**And** no per-Project Dwell value exists
**And** no Dwell value is authored by hand anywhere in `career.json`

**Given** a Client system containing one or more Deep Projects, and one containing only Shallow Projects
**When** their tempos are derived
**Then** the Deep-bearing stop receives a measurably longer tempo
**And** the emitted value is a ratio or tempo class, not a millisecond duration — numbers are tuned on the greybox at M1

**Given** the default Shot template operates on Clients (AD-4a, FR-17a)
**When** `derive/shots.ts` emits framing
**Then** every Client receives framing parameters expressed as an entity ID plus angle, distance, and framing
**And** **no Shot definition contains a world coordinate**
**And** the framing is computed to include the Client's full system, its widest-orbit Project included

**Given** a Project is added to an existing Client in the future
**When** the pipeline re-runs
**Then** that Project is framed at its Client's stop with no Shot authored for it
**And** no existing Shot definition requires editing

**Given** some entities may earn a hand-authored Shot
**When** one is present
**Then** it overrides the default for that entity, and its absence changes nothing for any other entity

### Story 1.8: Enforced boundaries and the maintenance contract

As Thomas the maintainer,
I want the architecture's import rules enforced by tooling and the add-an-entry promise covered by a test,
So that the rules keeping this site healthy for a decade do not erode under pressure in a solo project.

**Acceptance Criteria:**

**Given** there must be exactly one read path to the source of truth (AD-3)
**When** any module outside `src/derive/` imports from `src/data/`
**Then** an ESLint import-boundary rule (or equivalent) **fails the build**
**And** the ban covers renderers, `shell/`, `tokens/`, and `colophon/` without exception

**Given** nothing on the critical entry path may reach heavy modules (AD-7)
**When** the CI bundle assertion runs
**Then** it fails if the entry chunk's module graph reaches Three, the solver, or `src/data/`
**And** it fails if the entry chunk exceeds its declared size budget
**And** the assertion inspects **bundler output**, not source intent, because a stray re-export can hoist a chunk silently

**Given** NFR-5 promises that adding a Project costs one entry plus one number
**When** the maintenance test runs
**Then** it adds a fixture Project to a copy of `career.json`, sets only `weight`, re-runs validate and solve, and asserts the pipeline succeeds
**And** it asserts that no file other than `career.json` and the emitted artifact changed
**And** the test fails if any layout, camera, Dwell, or position value required hand-editing

**Given** a Shallow Project later gains a `notable` (FR-5, promotion)
**When** the promotion test runs
**Then** the entry becomes Deep with no schema change and no structural change
**And** its derived `isDeep`, Moon, Ring, and Dwell contribution all follow automatically

**Given** NFR-6 forbids a backend at any milestone
**When** the codebase is audited by test or lint
**Then** no `fetch`, XHR, or network call for career data exists anywhere in `src/`

---

## Epic 2: The Greybox Scene — Bodies, Rail, and Focus

A visitor can scroll backward through time along a Client-granular Rail, arrive at a Client stop that frames the whole system with every Project on screen and selectable, deliberately focus one Project, watch its Skills condense out of the Dust into labelled Motes, and read beside the scene without the camera moving off what is being read. A keyboard visitor reaches every destination a pointer visitor reaches. This is the PRD's M1 milestone, and its gate is: does the pacing work with no visual polish at all?

**FRs covered:** FR-12a, FR-13, FR-14, FR-15, FR-16, FR-17, FR-17a, FR-18, FR-19
**ADs realised:** AD-4, AD-4a, AD-9, AD-10, AD-16 · EXPERIENCE.md §11.1 P1–P4
**UX-DRs covered:** UX-DR14, UX-DR16, UX-DR17, UX-DR18, UX-DR28–UX-DR43

**Build-order note.** The DOM index (Story 2.1) precedes the camera deliberately. AD-4 requires that focus live in the DOM and the camera react to it; building the camera first produces the inverted architecture the AD exists to forbid, and the inversion is invisible until assistive technology meets it.

### Story 2.1: The DOM destination index

As a keyboard or screen-reader visitor,
I want a persistent, ordered list of every Client and Project that exists in the document from the first frame,
So that I can reach every destination without depending on a canvas I cannot perceive.

**Acceptance Criteria:**

**Given** the index is the interface and the camera is presentational (AD-4, P1, UX-DR38)
**When** `shell/index-nav.tsx` renders
**Then** it produces a persistent `<nav>` containing a nested list: one item per Client, each with a nested list of its Projects
**And** it is present in the document from First Paint, before any 3D chunk has loaded
**And** it is built from the artifact's single `destinations` list and from nothing else (AD-15)

**Given** the index must not depend on render state (P1)
**When** the camera moves, the viewport resizes, or the scene re-renders
**Then** the index's structure, order, and focusability are unchanged
**And** no code path derives an index entry from camera state, viewport position, or canvas hit-testing

**Given** every Body needs a DOM proxy carrying its accessible name (P2, UX-DR39)
**When** an index entry is rendered
**Then** it is a `<button>` whose accessible name is the Client name or the Project title
**And** its Deep/Shallow state is exposed as **text within the entry** — not as an ARIA attribute and not as a visual marker alone
**And** a screen-reader user can therefore answer *which entries are worth reading* from the index alone

**Given** order follows the journey (FR-16)
**When** the index is traversed with `Tab` / `Shift+Tab`
**Then** Clients appear in Rail order, present → past, with each Client's Projects nested beneath it

**Given** the canvas duplicates the index (P2)
**When** the scene later mounts
**Then** the canvas root carries `aria-hidden="true"`, because narrating it twice is worse than not narrating it once

### Story 2.2: The navigation state machine

As a visitor,
I want one authority deciding what is focused and where I am on the journey,
So that the camera and the index never disagree about where I am.

**Acceptance Criteria:**

**Given** one store owns navigation (AD-9)
**When** `shell/state.ts` is implemented with zustand
**Then** it holds `mode` (`rail` | `freeflight`), `focusedProjectId` (`ProjectId | null`), and `railPosition` (a **ClientId**, per AD-4a)
**And** it holds `focusOrigin` (`rail` | `freeflight`), stored at Focus entry rather than inferred at release (AD-16)
**And** continuous scroll progress and the discrete current Client are **separate fields**

**Given** every field has exactly one writer (AD-16)
**When** the store is implemented
**Then** each field's single writer is documented and enforced
**And** the camera reads progress and writes nothing; the index reads the discrete Client and writes nothing the camera owns

**Given** all transitions are named events (AD-9)
**When** state changes
**Then** it changes only through a named event, never by direct mutation from a component
**And** camera and index are both subscribers; neither owns the state

**Given** Focus is exclusive
**When** a Project is focused while another is already focused
**Then** at most one `focusedProjectId` is ever set

**Given** scene state is read inside the render loop
**When** a `useFrame` callback reads the store
**Then** it uses `store.getState()` and never a reactive hook binding, which would re-render every frame

### Story 2.3: Bodies at rest in the 3D scene

As a visitor,
I want to see Client Stars with their Projects in orbit, positioned by the committed layout,
So that the shape of a career is visible before I interact with anything.

**Acceptance Criteria:**

**Given** the renderer reads the artifact and never derives (AD-3)
**When** `render-scene/` mounts
**Then** it reads solved positions and derived visual properties from `layout.generated.json`
**And** it contains no classification test, no mapping-rule computation, and no conditional on a raw content field
**And** it never imports from `src/data/`

**Given** the scene renders Bodies (FR-2, FR-12)
**When** the resting scene is drawn
**Then** every Client Star appears at its solved position with its Projects in orbit around it
**And** ~15–16 Bodies are present: ~5–6 Stars and ~10 Planets
**And** no Body is rendered for a Company (FR-6)

**Given** the scene must not run the solver (AD-1, AD-7)
**When** the scene chunk is inspected
**Then** it contains no force-simulation code and imports nothing from the solver
**And** positions arrive already solved

**Given** no connector geometry is permitted (FR-14)
**When** the scene is inspected
**Then** it contains no line, edge, or connector between any two Bodies
**And** orbits are the only relational geometry

**Given** the greybox has no visual identity yet
**When** Bodies are drawn
**Then** they use placeholder geometry sufficient to judge composition and pacing, with the Schematic Identity deferred to Epic 3

### Story 2.4: Dust at rest

As a visitor,
I want the space between Bodies to be filled with a faint medium,
So that fifteen objects read as a universe rather than as a sparse diagram.

**Acceptance Criteria:**

**Given** Skills exist as a visible diffuse medium when nothing is focused (FR-15)
**When** the resting scene renders
**Then** Dust is visible in the space between Bodies

**Given** Dust has two components (UX-DR18)
**When** it is implemented
**Then** it comprises a **medium** — broad radial gradients centred on each Client system — and **particles**, individual small circles scattered sparsely

**Given** Dust must never read as fog (FR-15)
**When** density is set
**Then** no Body is obscured by the Dust in front of or behind it
**And** if a Body's luminance step is ambiguous against the Dust behind it, the density is too high and is reduced

**Given** density is a tuning item deferred to M1 (D-T1, E-T2)
**When** the value is chosen
**Then** it is expressed as a ratio or a density parameter that can be tuned without structural change
**And** the shape is fixed: dense enough that ~15 Bodies read as space, sparse enough that no Body is ambiguous

**Given** no Skill is permanently positioned
**When** the resting scene is inspected
**Then** no Mote exists anywhere in it (FR-13)

### Story 2.5: Backward-time Rail traversal

As a visitor,
I want scrolling to fly me backward through time along a continuous trajectory,
So that I am taken somewhere without having to decide where to go.

**Acceptance Criteria:**

**Given** time runs backward (FR-16)
**When** the visitor scrolls forward
**Then** the camera moves from the present into the past, encountering the most recent Client first

**Given** the Rail stops at Clients, never at Projects (AD-4a)
**When** the Rail is constructed
**Then** it is a continuous trajectory through ~5–6 **Client** stops
**And** `railPosition` indexes Clients
**And** no Rail stop exists for any Project

**Given** Shots name entities, never coordinates (FR-17)
**When** the camera resolves a Shot
**Then** it resolves an entity ID plus relative framing from the artifact
**And** no world coordinate appears in any Shot definition or in camera code

**Given** the camera has mass (UX-DR30)
**When** scroll velocity changes
**Then** camera velocity follows it damped — the camera does not stop the instant the wheel does

**Given** the governing law is *it does not jump; it flies* (FR-17, UX-DR28)
**When** the camera moves between any two stops
**Then** the movement is continuous, with no cut, no snap, and no transition that begins only after the previous one has fully stopped
**And** a window resize re-frames continuously rather than instantly

**Given** the Rail is a slowdown, not a halt (UX-DR30)
**When** the visitor scrolls through a stop
**Then** departure begins before the visitor has finished scrolling into it

**Given** the camera reacts to focus and never the reverse (AD-4)
**When** the camera module is inspected
**Then** it writes no state field
**And** no module outside `render-scene/` imports camera state

### Story 2.6: Client-stop framing and derived Dwell

As a visitor,
I want arriving at a Client to show me that whole system at once and to linger where there is something worth reading,
So that I can see what is on offer and sense which stops matter without being told.

**Acceptance Criteria:**

**Given** a Client stop frames the entire system (AD-4a)
**When** the camera arrives at a Client stop
**Then** every one of that Client's Projects is on screen simultaneously and every one is selectable
**And** the framing includes the widest-orbit Project, because a Project framed out of shot is unreachable from the Rail

**Given** framing comes from the default Shot template (FR-17a)
**When** a Client has no hand-authored Shot
**Then** the default template supplies its framing and the stop composes correctly
**And** a hand-authored Shot, where present, overrides the default for that Client only

**Given** Dwell derives at Client granularity (FR-18, AD-4a)
**When** the camera reaches a stop
**Then** its Dwell comes from the artifact's derived tempo, not from a hand-authored per-stop value
**And** a Client system containing one or more Deep Projects is held measurably longer than one containing only Shallow Projects

**Given** pacing must read as deliberate (E-T3, E-T4)
**When** Dwell is tuned on the greybox
**Then** the difference between a held stop and a passed stop is perceptible
**And** it does not read as stalling
**And** uniform Dwell across all stops is treated as a failure, because it teaches the visitor nothing about where to look

**Given** a Project is added to a Client in future (UJ-4, FR-17a)
**When** the pipeline re-runs and the scene reloads
**Then** the new Project is framed at its Client's stop with no Shot authored and no camera work performed

### Story 2.7: Focus entry, the panel shell, and scroll's two meanings

As a visitor,
I want to deliberately open a Project and read about it without the camera drifting off what I am reading,
So that I can finish a paragraph.

**Acceptance Criteria:**

**Given** Focus is always deliberate (E-A3, FR-12a)
**When** a visitor activates a Project by click, tap, or `Enter`/`Space` on a keyboard-focused entry
**Then** Focus is entered
**And** Focus is **never** triggered by dwell, proximity, scroll-stop, or pointer-hover — a Client stop frames several Projects at once, so a resting cursor must not fire

**Given** scroll's meaning is resolved by mode alone (AD-10, UX-DR33)
**When** `focusedProjectId` is non-null
**Then** scroll scrolls the panel and the camera subscribes to nothing
**And** the meaning is selected **solely** by reading the state machine's mode — never by event-target inspection or DOM hit testing

**Given** reading must not move the camera (FR-12a, UJ-2)
**When** a visitor scrolls while Focus is held
**Then** the journey does not advance and the camera does not move

**Given** the scene is never occluded (UX-DR20)
**When** the panel opens
**Then** it takes column width beside the scene
**And** no modal, scrim, dimmed backdrop, or full-screen overlay appears at any point

**Given** the Focus transition is one combined move (UX-DR29)
**When** Focus is entered
**Then** the camera flies to the Project and recomposes it off-centre into the half the panel will not occupy, the panel opens in the other column, and Condensation begins — as one animation on one easing curve
**And** the panel never appears while the camera is stationary

**Given** focus is moved deliberately (P3, UX-DR40)
**When** Focus is entered
**Then** DOM focus moves to the panel container, which carries `tabindex="-1"` and is labelled by the entry's heading
**And** `aria-pressed` on the originating index entry reflects the Focus state

**Given** focus is returned deliberately (P3)
**When** Focus is released
**Then** DOM focus returns to **the index entry that opened it** — never to the document root and never lost to the canvas

**Given** a Shallow Project can be Focused (FR-12a)
**When** a visitor focuses one
**Then** Focus is entered normally and the panel opens; there is simply no `notable` to reveal
**And** no error, empty state, or skeleton appears

**Given** the panel is a shell at this stage
**When** it renders
**Then** it carries the Client kicker, the Project title, the reading position, and the field table in that order, with typography and the Notable treatment deferred to Epic 3

### Story 2.8: Condensation and Decay

As a visitor,
I want a Project's Skills to resolve out of the Dust when I focus it and dissolve back when I let go,
So that I can see the stack without it being listed at me.

**Acceptance Criteria:**

**Given** Condensation and Decay are one implementation reversed (FR-13)
**When** the mechanic is built
**Then** a single implementation drives both directions, so the two cannot drift apart under tuning
**And** the same easing curve governs both

**Given** no Mote exists while its Project is unfocused (FR-13)
**When** the resting scene is inspected
**Then** no Mote is present anywhere

**Given** nothing spawns from nothing and nothing teleports (FR-13, UX-DR31)
**When** Condensation runs
**Then** every Mote arrives from Dust that was already visible

**Given** a Mote always carries its label (UX-DR14)
**When** Condensation completes
**Then** each Mote displays its Skill name automatically — with **no hover, no tooltip, and no click required**

**Given** Motes are never connected to their Project (FR-14)
**When** the focused state is inspected
**Then** no line, edge, or connector is drawn between a Project and any Mote
**And** orbit is the only expression of the relation

**Given** no Skill is instantiated twice (FR-13)
**When** two Projects share a Skill
**Then** only one Mote for that Skill can ever exist at one time, because only one Project is ever Focused

**Given** Motes must remain visible while reading (UX-DR20)
**When** the panel is open
**Then** the Motes stay visible and in motion throughout, because their visibility is the answer to *where is the stack?*

**Given** labels must not collide (UX-DR16, UX-DR17)
**When** Motes are placed
**Then** they occupy three distinct orbits with an angular quota preventing adjacent-slot labels on the same orbit
**And** a label anchors outward from the Body, flipping side by orbit half
**And** a label that would land under the panel column is suppressed and its Mote re-slotted on the next frame, never truncated with an ellipsis

**Given** Condensation is fast (E-T1, UX-DR31)
**When** timing is tuned on the greybox
**Then** it completes faster than the reader's decision to look — the information was asked for and the reader must not wait

**Given** Focus moves directly from Project A to Project B (E-A5)
**When** B is activated while A is focused
**Then** the move is a single continuous transition — A's Motes begin decaying as the camera begins flying to B, and B's condense as it arrives, overlapping
**And** there is no full decay followed by a re-condense, which would read as a cut in everything but pixels
**And** panel content cross-fades on the same curve rather than closing and reopening

### Story 2.9: Free flight in three layers

As a visitor who wants to explore rather than be driven,
I want to leave the Rail and address any destination directly by pointer or keyboard,
So that I can go where I want and still get back.

**Acceptance Criteria:**

**Given** free flight is opt-in and the default is on-rail (FR-19)
**When** the visitor first uses click-to-fly, the pull-back overview, or keyboard traversal
**Then** that first use **is** the opt-in — no separate "enter free flight" control exists
**And** `mode` transitions to `freeflight` through a named event

**Given** three layers address one destination set (UX-DR32)
**When** each layer resolves a target
**Then** all three resolve to the same emitted `destinations` list — every Client Star and every Project Planet
**And** a keyboard visitor is never given a smaller map than a pointer visitor

**Given** click-to-fly is the primary pointer layer
**When** a visible Body is activated
**Then** the camera flies to it continuously, never jumping
**And** activating a Client flies to its stop and frames the system; activating a Project enters Focus

**Given** the pull-back overview answers *how far may I roam* (UX-DR32)
**When** the visitor pulls back
**Then** the camera frames the whole universe so a lost visitor can see everything at once and pick
**And** the boundary is made legible rather than enforced with an invisible wall

**Given** the keyboard index is a first-class path (UX-DR36)
**When** a visitor traverses with `Tab` and activates with `Enter`/`Space`
**Then** every destination is reachable and activation behaves identically to the pointer equivalent
**And** `↑` / `↓` advance and reverse along the Rail as the keyboard equivalent of scroll
**And** `Home` returns to the opening frame

**Given** return to the Rail is guaranteed (FR-19)
**When** a visitor in free flight chooses to return
**Then** the journey resumes from where the Rail was left, or from the nearest Client stop
**And** the return affordance is always present while off-Rail

**Given** free flight is addressed, not piloted (UX-DR35)
**When** the visitor interacts with the scene
**Then** no drag, orbit-by-drag, or pinch-zoom is available at M2

**Given** an exploring visitor clicks empty space constantly (UX-DR35)
**When** a click lands on the void
**Then** nothing happens — there is no click-to-dismiss and the visitor is not punished for it

**Given** pointer raycasting resolves a target (AD-15)
**When** a raycast hits a Body
**Then** it resolves to an emitted destination ID, never to a camera-dependent position

### Story 2.10: Escape precedence and reduced motion

As a visitor using a keyboard or preferring reduced motion,
I want one predictable key that releases exactly one layer, and a journey that respects my motion preference without becoming a slideshow,
So that I am never ejected across the product and never made unwell by it.

**Acceptance Criteria:**

**Given** `Escape` is bound to two releases and must never contend (UX-DR34)
**When** `Escape` is pressed while Focused in free flight
**Then** Focus releases only, leaving free flight at the same Body

**Given** the same key in a different state
**When** `Escape` is pressed while Focused on the Rail
**Then** Focus releases only, leaving the Rail at the same stop

**Given** the visitor is off-Rail but not Focused
**When** `Escape` is pressed
**Then** free flight releases and the Rail resumes

**Given** the visitor is on the Rail and not Focused
**When** `Escape` is pressed
**Then** nothing happens — `Escape` is inert

**Given** one press releases one layer (UX-DR34)
**When** any `Escape` is handled
**Then** it never releases two states at once and never returns the visitor further than one step from where they were
**And** `focusOrigin` determines which layer Focus returns to, read from the store rather than inferred (AD-16)

**Given** there is no keyboard trap (UX-DR42)
**When** a keyboard visitor enters any state
**Then** they can leave it — `Escape` always releases Focus, and `Tab` from the panel returns to the scene's destination order

**Given** `prefers-reduced-motion: reduce` is set (UX-DR43)
**When** the visitor traverses the Rail
**Then** traversal shortens to the floor of its easing curve — the camera still travels, it travels briefly
**And** **no cut is introduced**: the law *it does not jump; it flies* is about continuity, not duration

**Given** the same preference
**When** Focus and Condensation run
**Then** they shorten identically
**And** parallax, drift, and idle orbital motion stop — orbits are drawn, not animated
**And** **Dwell is unchanged**, because reading time is not motion

**Given** reduced motion and Fallback routing are independent (UX-DR43, AD-8)
**When** a reduced-motion visitor arrives on a capable machine
**Then** they receive the 3D scene with motion reduced, and are **never** rerouted to the Fallback
**And** no code path reads the motion preference to make a capability judgement

---

## Epic 3: The Schematic Identity and the Information Layer

A visitor sees a deliberate monochrome design system rather than an unfinished greybox — and, crucially, can tell which entries are worth reading before opening any of them. The Deep/Shallow signal is present at rest on every Project simultaneously, carried by two redundant structural channels that survive a compressed screenshot and a low-DPI corporate laptop. This epic closes both clauses of the M2 gate.

**FRs covered:** FR-8, FR-9, FR-10, FR-11, FR-20 · **NFRs:** NFR-1a, NFR-7
**ADs realised:** AD-12
**UX-DRs covered:** UX-DR1–UX-DR13, UX-DR15, UX-DR19, UX-DR21–UX-DR27, UX-DR44–UX-DR46

**Risk note (PRD R-4).** FR-20 gates launch and sits in the author's self-identified weakest discipline, giving it the widest confidence interval of any launch task. It is treated here as a first-class deliverable with its own definition of done (Story 3.9), not as a styling pass appended to the end.

**Gate note.** Under AD-4a the camera no longer leads anyone to a Notable. The at-rest Deep/Shallow signal (Story 3.3) carries the entire selectivity burden alone, which is why EXPERIENCE.md records R-3 as materially higher than the PRD does.

### Story 3.1: Generated design tokens from a single source

As Thomas the maintainer,
I want the design tokens generated from DESIGN.md's frontmatter into both CSS custom properties and a typed JS object,
So that the scene and the DOM surfaces cannot drift apart on colour, type, or stroke.

**Acceptance Criteria:**

**Given** DESIGN.md's frontmatter is the token source of truth (AD-12)
**When** the token build step runs
**Then** it transforms that frontmatter once into CSS custom properties for DOM surfaces and a typed JS object for scene materials
**And** **neither output is hand-transcribed**

**Given** tokens are generated (AD-13 convention)
**When** the outputs are written to `src/tokens/`
**Then** each carries a header banner naming the generator and forbidding hand-editing

**Given** every colour is a semantic light/dark pair (UX-DR1)
**When** tokens are emitted
**Then** the bare key is the light-theme value and the `-dark` key is the shipped M2 value
**And** both are emitted, so shipping light later is a token swap rather than a redesign

**Given** no colour may be written literally in a component (AD-12, UX-DR1)
**When** the codebase is linted
**Then** a hardcoded hex, rgb, or hsl value in any component fails the check
**And** the ban covers scene materials as well as CSS

**Given** `src/tokens/` must not reach the source of truth (AD-3)
**When** imports are checked
**Then** `tokens/` imports nothing from `src/data/`

**Given** the type ramp is part of the token set (UX-DR5)
**When** tokens are emitted
**Then** every role in the ramp is present — `chrome`, `scene-label-client`, `scene-label-project`, `scene-label-secondary`, `mote-label`, `panel-kicker`, `panel-title`, `notable-prose`, `editorial-rule`, `field-label`, `field-value` — each with its size, weight, line height, and tracking
**And** the spacing scale emits 4/8/12/20/28/40/52/56 with **no 16 and no 24** (UX-DR6)

### Story 3.2: The stroke and ink ladders applied to the scene

As a visitor,
I want depth and state carried by line brightness alone,
So that the scene reads as a deep-field plate rather than as an untextured 3D model.

**Acceptance Criteria:**

**Given** the stroke ladder is the primary depth channel (UX-DR2, UX-DR7)
**When** Bodies and orbits are drawn
**Then** every line takes one of the five steps: `stroke-dust`, `stroke-rest`, `stroke-near`, `stroke-active`, `stroke-focus`
**And** the step encodes **distance and state, never category**

**Given** FR-3 binds brightness to recency and the ladder carries state (UX-DR2)
**When** a Body's stroke is computed
**Then** its data-derived `luminanceBand` modulates only within the resting band (`stroke-dust` … `stroke-near`)
**And** `stroke-active` and `stroke-focus` are applied on top, reserved for camera state
**And** a recent Shallow Project is bright *for a resting Body* but **never reaches white while unfocused**

**Given** white is a scarce resource (UX-DR4)
**When** any frame is rendered
**Then** at most one element in the scene carries `stroke-focus` — the Focused Body, or the Client Star the camera is heading for
**And** if two elements are white, the frame is treated as having no subject and the render is incorrect

**Given** the ink ladder mirrors the strokes (UX-DR3)
**When** any text is rendered
**Then** it takes one of `ink-faint`, `ink-quiet`, `ink-label`, `ink-prose`, `ink-lift`
**And** type never borrows a stroke token and a stroke never borrows an ink token, even where the hex is identical

**Given** `ink-quiet-dark` fails the contrast floor (UX-DR3, UX-DR44)
**When** the codebase is audited
**Then** `ink-quiet-dark` appears on **no glyph anywhere in the product**
**And** it is used only for the Dust medium and non-meaningful strokes

**Given** there are no shadows in this product (UX-DR7)
**When** any surface is inspected — scene, panel, label, or Fallback
**Then** no `box-shadow`, drop shadow, glow, bloom, or lens flare exists at any milestone
**And** depth is never carried by scale-on-hover, blur, or opacity fades on Bodies

**Given** the shape vocabulary is four items (UX-DR8)
**When** the scene is inspected
**Then** Bodies and Motes are true circles with `fill: none`, Client Stars carrying a filled core dot at ~15% radius
**And** ellipses are used for orbits and nothing else
**And** leader lines are single straight segments with no elbow, dog-leg, or curve
**And** the only curve that is not an orbit is the Rail itself, drawn at `stroke-dust`
**And** no rectangle anywhere carries a corner radius

**Given** the vignette replaces elevation (UX-DR9)
**When** the frame is composed
**Then** a radial gradient of `vignette` runs from 0 opacity at 42% radius to 0.9 at the edge
**And** its hex is identical to `surface-base` by rule

### Story 3.3: The Deep/Shallow signal — Moon and Ring

As a visitor,
I want to see which Projects carry a written argument before I open any of them,
So that I know which entries are worth my attention.

**Acceptance Criteria:**

**Given** the signal is two layered structural channels (UX-DR10, FR-9)
**When** a Deep Project is drawn at rest
**Then** it carries a **Moon** — a filled dot at `stroke-active`, radius ≈ 0.27 × body radius with a 2.4px minimum, offset ≈ 2 × body radius
**And** it carries a **Ring** — a continuous concentric circle at `stroke-near`, 0.7px, radius ≈ 2.2 × body radius

**Given** a Shallow Project at rest
**When** it is drawn
**Then** it carries **neither** Moon nor Ring
**And** its Body geometry is otherwise identical to a Deep Project's

**Given** both channels derive from Notable presence alone (FR-9, FR-5)
**When** the renderer draws them
**Then** it reads `isDeep` from the artifact and performs no classification test of its own (AD-3)
**And** adding a `notable` in future produces both channels automatically, with no flag and no schema change

**Given** neither size nor brightness may carry this signal (UX-DR11, FR-9)
**When** the implementation is reviewed
**Then** no code path uses scale or luminance to mark a Deep Project
**And** the review explicitly verifies that a long-ago Shallow Project rendering as the largest Body, or a recent one as the brightest, does not invert the signal

**Given** the signal must survive poor conditions (UX-DR10)
**When** the scene is viewed at client-stop distance, in a compressed screenshot, or on a low-DPI display
**Then** the Ring carries the signal where the Moon is not reliably resolvable
**And** the redundancy is structural, making the signal greyscale-safe and colour-blind-safe by construction

**Given** the signal is present at rest, before interaction (FR-9)
**When** the camera arrives at a Client stop
**Then** every Project in that system displays its signal simultaneously
**And** a visitor can state which entries are worth reading without focusing any of them

**Given** the Ring means *carries a Notable* (UX-DR10)
**When** any caption, label, or microcopy is reviewed
**Then** no text anywhere states or implies that a ring means "it opens" — everything opens

### Story 3.4: The hover and keyboard-focus affordance

As a visitor moving a cursor or a keyboard across the scene,
I want approaching a Project to tell me what it is,
So that I learn something from the approach rather than merely learning that it is clickable.

**Acceptance Criteria:**

**Given** nothing is marked at rest (UX-DR12)
**When** the resting frame is inspected
**Then** it carries no selection marks of any kind

**Given** **THE COLLISION RULE** is binding (UX-DR12)
**When** hover is implemented
**Then** it draws **no ring, and no new geometry, around any Body**
**And** a hovered Shallow Project is never rendered such that it resembles a resting Deep Project

**Given** hover reveals a label rather than a shape (UX-DR12)
**When** a Project is hovered
**Then** a single straight leader line is drawn from Body edge to label anchor at `stroke-rest`, 0.6px, with no elbow
**And** the Project title renders at `scene-label-project` in `ink-lift`
**And** one secondary line renders at `scene-label-secondary` carrying role, team size, and class
**And** the Body's own stroke steps from `stroke-rest` to `stroke-active` — a luminance step on an existing channel

**Given** keyboard equivalence is non-optional (UX-DR13, floor point 4)
**When** a Project receives `:focus-visible`
**Then** it renders the identical leader-and-label treatment
**And** anything hover reveals, keyboard focus reveals identically — there is no pointer-only information anywhere

**Given** the focus outline must not reintroduce the collision (UX-DR13)
**When** the focus indicator is drawn
**Then** it is a 1px `stroke-focus` square-cornered outline at 3px offset **around the label block**
**And** **never around the Body**

**Given** focus visibility is never suppressed (floor point 3)
**When** any focus state renders
**Then** it is never hidden, never opacity-reduced, and never relies on the Body's luminance step alone

**Given** labels near the frame edge lose contrast to the vignette (UX-DR44, D-A2)
**When** a label would compose inside the outer 12% of the frame
**Then** it is re-anchored inward by its leader line
**And** the rule is verified on the greybox rather than assumed

### Story 3.5: Mote tiering and label legibility

As a visitor reading a Notable,
I want nine orbiting Skill labels to be readable without competing with the prose,
So that the stack is visible and the paragraph is still readable.

**Acceptance Criteria:**

**Given** tiering is carried by geometry, never by ink below the floor (UX-DR15)
**When** Motes are drawn
**Then** three tiers exist at 2.6px / 2.1px / 1.8px dot radius on three distinct orbits
**And** **all three tiers' labels sit at `ink-label` or above**

**Given** tier derives from data, not from authoring (UX-DR15, D-A4)
**When** tier is assigned
**Then** it comes from the artifact's derived `mote tier` and the renderer performs no computation of its own (AD-3)
**And** no new authored field is introduced, preserving FR-4's single-knob constraint

**Given** Mote orbits must not imply hierarchy among Skills (UX-DR8)
**When** the orbits are drawn
**Then** they are rotated off-axis so a Focused Project's Motes read as a cloud settling rather than as a planetary system
**And** Mote orbit lines are drawn at `stroke-dust`

**Given** a Mote label is information, not decoration (floor point 8, P4, UX-DR41)
**When** Condensation begins
**Then** the Skills are present in the panel's DOM **as a list**, from the same markup a screen reader reads
**And** they are not baked into a canvas texture
**And** **no live region is used** — the Skills are static content arriving with the panel, not an event to announce

**Given** the SNCF entry carries nine Skills (UX-DR16)
**When** it is focused
**Then** all nine labels render legibly and simultaneously without overlapping each other or the panel

**Given** degradation above ~12 labels is unspecified (D-G3, E-G6)
**When** the implementation is written
**Then** the angular-quota system is structured so a degradation rule can be added without redesign
**And** the current inventory maximum of nine is recorded as the tested case

### Story 3.6: The information panel

As a visitor,
I want the record laid out so the argument comes before the facts,
So that I read the reasoning rather than scanning a table.

**Acceptance Criteria:**

**Given** the panel is the only rectilinear element (UX-DR19)
**When** it renders
**Then** it is `surface-raised` with a 1px `surface-edge` left border and no other boundary
**And** it has no radius and no shadow
**And** padding is 56 / 56 / 60

**Given** the vertical rhythm is the argument (UX-DR21)
**When** the panel is composed
**Then** the gaps are exactly: kicker→title 22px, title→first prose **40px**, prose ¶→¶ 20px, prose→editorial rule 34px, last prose→field table **52px**, field row→row 12px plus a 1px rule

**Given** contents appear in a fixed order (UX-DR22)
**When** the panel renders
**Then** it carries, in order: `panel-kicker` (Client name), `panel-title` (Project title), the reading position, the field table, and the release affordance

**Given** the Dust is the display (FR-10, UX-DR22)
**When** the field table renders
**Then** it carries `Role`, `Team`, and `Built` — and **no `Skills` row**
**And** no technology name appears in the field table anywhere

**Given** Company is displayed but never positioned (FR-6)
**When** the panel renders
**Then** the Company appears as a label on the information layer

**Given** real client names ship (FR-11)
**When** the kicker renders
**Then** the actual end-client name is displayed, unanonymised and ungenericised

**Given** the measure is a hard constraint (UX-DR5)
**When** the panel width changes
**Then** the prose measure stays at 56ch — widening the panel does not widen the measure
**And** below ~1200px the panel becomes a percentage with the measure clamped and padding stepping down

**Given** the panel is a document and documents end (UX-DR26)
**When** the release affordance renders
**Then** it is the word `release` in `chrome` type at `ink-label`, preceded by a 12px hairline rule, at the bottom of the panel after the field table, left-aligned to the text column
**And** hover and `:focus-visible` raise it to `ink-prose` and extend the hairline to 20px
**And** it is **never** a floating X, never top-right, never overlapping the scene, and never an icon without its word

### Story 3.7: The Notable and the editorial rule line

As a visitor,
I want the unfakeable part of each argument to be findable in a four-second scan without the entry reading like a filled-in form,
So that I can judge whether this person can think.

**Acceptance Criteria:**

**Given** the Notable is connected prose (FR-8)
**When** a Deep Project's panel renders
**Then** the whole Notable sets at `notable-prose` — 16px, weight 300, line height 1.85, measure 56ch — in `ink-prose`

**Given** the constraint is the falsifiability substitute for absent metrics (FR-8, UX-DR24)
**When** the Notable renders
**Then** the one sentence carrying the constraint is set in `ink-lift` — brighter ink and nothing else
**And** it is **NOT bold, NOT labelled, NOT indented, NOT boxed, NOT ruled, and NOT given its own paragraph**
**And** it stays inside the flow of the paragraph so it reads as writing rather than as a form

**Given** weight is not an emphasis channel (UX-DR5)
**When** any text in the product renders
**Then** no glyph exceeds weight 400 anywhere

**Given** a technology may be named only as a term of a decision (FR-10)
**When** a Notable is reviewed at authoring time
**Then** it contains no list, no bullets, and no roll-call of technologies
**And** a technology name appears only as the thing chosen or the thing rejected

**Given** a Shallow Project occupies the same slot (UX-DR23, UX-DR25)
**When** its panel renders
**Then** the editorial rule line appears in the reading position where a Notable would be
**And** it sets at `editorial-rule` — 13.5px, line height 1.8, measure 48ch — in `ink-label`, never `ink-quiet`

**Given** the rule line is a convention, not a defence (UX-DR25, E-A1)
**When** it renders on any Shallow Project
**Then** the wording is identical on every one of them

**Given** nothing is missing on a Shallow Project (UX-DR23)
**When** its panel renders
**Then** no skeleton, no placeholder, no empty-state graphic, and no visible gap appears
**And** the panel is the Deep panel with a different final block in the reading position — not the Deep panel minus a block

**Given** promotion must be free (UJ-4, FR-5)
**When** a Shallow Project later gains a `notable`
**Then** the rule line is replaced by the Notable in the same slot and **nothing else changes** — no layout rework, no schema change, no special case

**Given** legibility outranks awe (NFR-7)
**When** any visual treatment in this epic conflicts with a reader's ability to read a Notable
**Then** the treatment yields and legibility wins

### Story 3.8: Corner chrome and the stateful instruction slot

As a visitor,
I want exactly one instruction on screen at a time and a route to the Colophon,
So that the frame stays quiet and I always know what to do next.

**Acceptance Criteria:**

**Given** there are exactly two chrome lines per frame (UX-DR27)
**When** any state of the scene renders
**Then** two lines appear in opposite corners, inset 40px, at `chrome` in `ink-label`
**And** **never a third line, never a persistent HUD, never a minimap, never a nav bar**

**Given** left-top carries authorship and the Colophon route (UX-DR27, UX-DR54)
**When** it renders
**Then** it reads `THOMAS NAVARRO · the model`, with the Colophon route sharing the identity slot

**Given** right-bottom is a single stateful slot (UX-DR27)
**When** the visitor is on-Rail
**Then** it reads `scroll ↓ — time runs backward`

**Given** the visitor is in free flight
**When** the slot renders
**Then** it reads `↩ resume the journey`

**Given** the visitor is Focused
**When** the slot renders
**Then** it reads `esc — release`

**Given** the free-flight return must always be available (UX-DR27)
**When** the visitor is off-Rail or Focused
**Then** the slot is a real focusable control whose accessible name is the action
**And** it is reachable in the DOM order defined by the accessibility floor
**And** it **replaces** the second line rather than adding a third

**Given** corner chrome is text (UX-DR44)
**When** contrast is measured
**Then** it meets the 4.5:1 floor, not the 3:1 incidental-graphics floor
**And** the scroll arrow is the one permitted text glyph, because it is an instruction and must not read as decoration

### Story 3.9: Identity definition-of-done audit

As Thomas the maintainer,
I want the Schematic Identity audited against an explicit definition of done before launch,
So that the highest-variance launch blocker is verified rather than assumed finished.

**Acceptance Criteria:**

**Given** FR-20 requires a coherent, deliberate visual system
**When** the audit runs across scene, panel, and chrome
**Then** a defined palette, line weight, typography, label treatment, and UI chrome exist and are applied consistently
**And** no element reads as a placeholder or as an untextured asset awaiting a pass

**Given** the identity must be confident (FR-20, UX-DR46)
**When** every surface and every string is reviewed
**Then** **no "work in progress" disclaimer, badge, beta tag, or apologetic microcopy appears anywhere, in any register**

**Given** copy exists in exactly five places (UX-DR45)
**When** the product is audited
**Then** copy appears only in Notables and field values, the Shallow rule line, the two chrome lines, the Colophon annotations, and the contact route
**And** there are **no tooltips, no onboarding, no empty states, no help text, and no captions explaining marks**

**Given** the voice refusals are absolute (UX-DR46)
**When** all shipped copy is reviewed
**Then** it contains no discountable claims, no boasting about build difficulty, no narration of how the site was made, no responsibility-instead-of-choice prose in a Notable, no fabricated testimonials, and no published criticism of a named Client

**Given** the contrast floor is a hard minimum (UX-DR44)
**When** every text role is measured against its ground
**Then** Notable prose and panel title meet ≥7:1
**And** field values and prose at rest meet ≥7:1
**And** field labels, the editorial rule, all three Mote label tiers, corner chrome, and scene labels meet ≥4.5:1

**Given** the opening frame must accomplish three things (NFR-1a)
**When** an unprompted viewer sees the first frame and the first fifteen seconds
**Then** they register that this is a real work history, that it is organised rather than listed, and that it is deliberately designed

**Given** the M2 gate's second clause is the hardest one (FR-9, R-3)
**When** a reader who has not seen the site is shown a Client stop
**Then** they can state which Projects carry a written argument, without focusing any of them

**Given** the palette is achromatic by design (UX-DR7)
**When** every shipped colour value is inspected
**Then** not one carries a hue — no accent, no status colour, no syntax highlight, no hover tint

**Remediation note (added 2026-10-12).** Stories 3.10–3.19 schedule the open action items of the Epic 1, 2 and 3 retrospectives (`sprint-status.yaml` `action_items`), per `epic-2-retro-item-6` and `epic-3-retro-item-7`. Epic 3's retrospective verdict is **rejected**; the epic is not counted as passing until these land and it is re-judged. All of them precede Story 4.1. Three items stay as action items rather than stories because they are not code: `epic-2-retro-item-5` (review story 2.10), `epic-3-retro-item-1` (the P1–P4 protocols, run by Thomas), and the two process items this scheduling closes.

### Story 3.10: CI pipeline and packaging enforcement

As Thomas the maintainer,
I want the test suite, typecheck and gate to run on every push, and the pinned stack enforced rather than declared,
So that the drift guard, determinism test and ratchets stop depending on my recall.

Closes `epic-1-retro-item-1`, `-12`, `-13`.

**Acceptance Criteria:**

**Given** a push to any branch
**When** CI runs
**Then** `npm test`, `npm run typecheck` and `npm run gate` all run, and any failure fails the run

**Given** the pinned stack (AC 1.1)
**When** `npm run gate` runs
**Then** a `check:pins` step fails on any dependency not pinned to an exact version
**And** `.npmrc` carries `engine-strict=true` and `package.json` carries a `packageManager` field

**Given** `zod` is build-time only
**When** the dependency list is inspected
**Then** `zod` sits in `devDependencies`, the entry chunk does not reach it, and the epic spec's pinned-stack list records it

### Story 3.11: The bundle assertion over bundler output

As Thomas the maintainer,
I want the build to fail when the entry chunk reaches Three, the solver or `src/data/`, or exceeds its byte budget,
So that the thin entry Story 4.1 depends on is enforced by the bundler, not only by the import gate.

Closes `epic-1-retro-item-5` (Story 1.8 AC group 2). Prerequisite for AC 4.1 #2.

**Acceptance Criteria:**

**Given** `vite build` emits its chunks
**When** a `generateBundle` plugin walks the entry chunk's module graph
**Then** the build fails if the graph reaches `three`, `@react-three/*`, `d3-force-3d`, `src/derive/` or `src/data/`
**And** the failure names the offending module and the import chain to it

**Given** a declared byte budget for the entry chunk
**When** the entry chunk exceeds it
**Then** the build fails naming the measured size and the budget

**Given** the assertion must be shown to bite
**When** a test injects a static import of `three` into the entry
**Then** the assertion fails, and removing the import makes it pass

### Story 3.12: Data validation on the build path and the gate's content checks

As Thomas the maintainer,
I want `npm run build` to refuse data that `npm run validate` rejects, and the gate to re-assert the artifact's content invariants,
So that no hand-edit or drift between `career.json` and the artifact ships silently.

Closes `epic-1-retro-item-2`, `-3`, `-4`, `-8`, `-9`, `story-2-1-review-item-1-rail-sequence-ungated`.

**Acceptance Criteria:**

**Given** `career.json` fails `npm run validate`
**When** `npm run build` runs
**Then** the build fails before `vite build`

**Given** the schema bounds `asOf` and the empty cases
**When** `asOf` precedes any `duration.start`, or `projects`, `clients`, `destinations`, `dwell` or `shots` is empty
**Then** validation fails naming the field

**Given** the artifact carries a `sourceDigest` (sha256 of `career.json`)
**When** `career.json` changes without a re-solve
**Then** the gate fails naming the digest mismatch

**Given** the gate re-asserts the artifact alone (AD-1)
**When** a Project's `clientId` disagrees with its carrying Client, `isDeep` disagrees with `content.notable`, a Client owns no Projects, two Bodies share coordinates, or `rail` is the correct set in the wrong order
**Then** the gate fails naming the case, and each case has a mutation test

**Given** two differently spelled Clients fold to one slug
**When** the pipeline runs
**Then** it warns naming both spellings, and the deliberate fold still applies

### Story 3.13: Boundary table and boundary parser hardening

As Thomas the maintainer,
I want every boundary the READMEs declare to be a gate row, and the parser to refuse what it cannot resolve,
So that an unenforced boundary or an unreadable import cannot pass as clean.

Closes `epic-1-retro-item-6` (in progress), `-7`.

**Acceptance Criteria:**

**Given** the remaining boundary-table gaps
**When** the gate runs
**Then** `ROOT_RULE` and the `derive` row ban the renderer and solver packages, `render-fallback` bans `@react-three/fiber` and `@react-three/drei`, the cross-renderer edge is forbidden, and the `src/types/` exemption covers only `.d.ts`
**And** each row has a mutation test

**Given** a `require`, a `createRequire`, or a non-literal dynamic-import specifier
**When** the boundary parser reads it
**Then** the gate reports it as unresolvable and fails, rather than passing silently
**And** `src/data/README.md` narrows its absolute claim to literal specifiers

### Story 3.14: Test infrastructure

As Thomas the maintainer,
I want one sanctioned home for test utilities, mutants written outside the tree, and the derive tests' verification gaps closed,
So that test scans stop racing each other and the multi-Client path is exercised for real.

Closes `epic-2-retro-item-9` (in progress), `epic-3-retro-item-4`, `epic-1-retro-item-10`, `-11`.

**Acceptance Criteria:**

**Given** test utilities have a sanctioned home
**When** the suite is inspected
**Then** one directory walker and one single-pass comment/string stripper exist, the seven walkers are collapsed onto them, and the renderer scans are parameterised over the directory

**Given** a test writes a mutant source file
**When** it runs
**Then** the mutant is written under `os.tmpdir()`, never beside `solve.test.ts` or anywhere a tree scan reads

**Given** a verification-gap pass over `src/derive/*.test.ts`
**When** it completes
**Then** its findings are recorded, and the multi-Client cross-process comparison lead is either closed by a test or recorded as accepted

**Given** a new Client is appended (not a Project to an existing one)
**When** the maintenance test re-solves
**Then** `dwell` and `shots` each grow by one, `destinations` by two, the new Shot contains its own widest orbit, and no existing Client's tempo or framing moves

### Story 3.15: Navigation and panel correctness fixes

As a visitor,
I want refocusing, closing the panel and the keyboard to behave the same whatever I did a moment before,
So that the camera never cuts and keys never act on a scene that is not there.

Closes `epic-2-retro-item-2`, `-3`, `-4`.

**Acceptance Criteria:**

**Given** a release slide-out from Project A is in progress
**When** a different Project B is focused
**Then** the camera does not cut, and the shortened slide applies only when reopening A
**And** a `stepFocus` test covers B far from A

**Given** the panel closes on a reversed slide
**When** the slide finishes
**Then** the panel's `visibility` delay follows the reversed slide's duration, not the full one
**And** a test pairs `panelStyle` with `flipSlide`

**Given** the scene is not mounted
**When** a Rail key or wheel input arrives
**Then** no Rail input is bound, and `auditKeyWiring` / `keyAction` cover the scene-absent case

### Story 3.16: Scene colour management

As a visitor,
I want the scene's whites drawn at the values the design tokens name,
So that the identity I see is the one that was designed.

Closes `epic-3-retro-item-2`. Needed for the Epic 3 re-judgement.

**Acceptance Criteria:**

**Given** ACES tone mapping draws `stroke-focus` 242 at 222
**When** colour management is decided (`<Canvas flat>` or per-material `toneMapped={false}`) and applied
**Then** a drawn white matches `stroke-focus` within one level, asserted by a test or a recorded pixel read
**And** the M1/M2 frames are looked at again and the result is recorded

### Story 3.17: No technology names in field values

As a visitor reading a Project,
I want field values that describe what was built, not which tools were used,
So that the field table honours FR-10.

Closes `epic-3-retro-item-3`. Needed for the Epic 3 re-judgement.

**Acceptance Criteria:**

**Given** `Built` values in `career.json` name technologies (AV-3a)
**When** Thomas rules (Ask First) to rewrite them or to reconcile FR-10 / AC 3.6
**Then** the ruling is applied, and the content or the spec is changed to match

**Given** a content check over every field value
**When** any value names a Skill
**Then** validation fails naming the Project, field and Skill
**And** the check has a mutation test

### Story 3.18: The Mote label pass and the degradation ruling

As a visitor on a Project with many Skills,
I want Mote labels that stay legible and still,
So that dense Projects read as deliberate rather than noisy.

Closes `epic-3-retro-item-6`.

**Acceptance Criteria:**

**Given** the label pass lives inside `mote-model.ts`
**When** it is split into its own module
**Then** behaviour is unchanged and existing tests pass unmodified

**Given** a Project carrying more than ~12 labels
**When** Thomas makes the degradation ruling
**Then** it covers label flicker as orbits turn, overlap with the affordance label, and the reduced-motion case (Epic 2 F-6)
**And** the ruling is recorded, implemented in the label module, and tested at 7, 12 and 25 Skills

### Story 3.19: Spec and doc reconciliation, and housekeeping

As Thomas the maintainer,
I want the specs, READMEs and comments to say what the code does,
So that the next reader is not misled by drift the retrospectives already found.

Closes `epic-1-retro-item-14`, `epic-2-retro-item-7`, `-8`, `epic-3-retro-item-5`. Item 5 is needed for the Epic 3 re-judgement.

**Acceptance Criteria:**

**Given** `railPosition` is undecided (AC 2.2 / AD-4a)
**When** Thomas rules
**Then** either the Rail follows a Client flown to, or the field is dropped from AC 2.2 and AD-4a, and the code matches

**Given** the Epic 3 reconciliations
**When** the specs are edited
**Then** UX-DR27 / AC 3.8 carry the revealed-index-entry exception, AC 3.2 and DESIGN.md name the two-step band (ruling 4b-i), and AC 3.5 records the nine-Skill case as superseded (7–25 per Project)

**Given** the Epic 2 doc drift
**When** the docs are edited
**Then** the release goal reads "the pose beneath Focus", Home is the `goHome` door, and `render-scene/README.md` lists the five `shell/` modules it imports

**Given** the Epic 1 housekeeping
**When** it lands
**Then** the `byId` comparator and the derive test fixture each exist once, `checkEmittedArtifact`'s header matches what it runs, the gate's success message names the path it checked, and the `Story 1.7+` comments are corrected

---

## Epic 4: The Fallback and Capability Routing

A visitor on a phone, a locked-down corporate laptop, or any machine without WebGL2 receives a complete, designed flat star chart instead of an error or a degraded scene — and any visitor on any machine can reach it in one click. Detection precedes rendering, so nobody ever sees a broken 3D scene. The Fallback is content-complete: every Project, every field, every Notable, no truncation.

**FRs covered:** FR-22 · **NFRs:** NFR-2a, NFR-3, NFR-4
**ADs realised:** AD-6, AD-7, AD-8, AD-18
**UX-DRs covered:** UX-DR47, UX-DR48, UX-DR49

**Scope note.** The PRD records this as "a second product with one FR" that "deserves proportionate attention." It is not a degradation path; it is the surface The Forward (SM-1) most often lands on, and a large share of Slack-link opens are mobile.

### Story 4.1: Capability detection in the thin entry

As a visitor on a machine that cannot run WebGL2,
I want the site to decide what to serve me before it downloads anything heavy,
So that I get a fast, complete surface instead of a slow, broken one.

**Acceptance Criteria:**

**Given** routing decides before the 3D bundle is fetched (AD-6)
**When** `shell/entry.ts` runs
**Then** capability detection executes as plain JavaScript before any dynamic import resolves
**And** detection is **not** a React component and does not transitively load the scene

**Given** the entry must stay thin (AD-7)
**When** the entry chunk is inspected
**Then** it contains no React and no Three
**And** its module graph reaches neither the scene, nor the solver, nor `src/data/`
**And** the CI bundle assertion from Story 1.8 covers this and fails the build on violation

**Given** detection tests capability only (AD-8)
**When** `detect()` runs
**Then** it tests WebGL2 context creation and nothing else
**And** **no performance probe runs in the First Paint path**, because probing would spend the one budget NFR-1 exists to protect

**Given** mobile always routes to the Fallback (AD-8, FR-22)
**When** the primary pointer is coarse
**Then** the visitor is routed to the Fallback
**And** **mobile is determined by pointer coarseness, never by viewport width** — a narrow desktop window keeps the scene with a narrower panel

**Given** reduced motion is an independent axis (AD-8, UX-DR43)
**When** a visitor with `prefers-reduced-motion` arrives on a capable machine
**Then** they are routed to the **scene**, never the Fallback
**And** no code path reads the motion preference as a capability signal

**Given** detection precedes rendering (FR-22, UX-DR37)
**When** any visitor arrives
**Then** no visitor ever sees a failed, broken, or degraded 3D scene before being routed
**And** no error state, loading screen, splash, or click-to-enter gates the first frame

**Given** one chunk is chosen (AD-6, AD-7)
**When** the entry completes detection
**Then** it dynamically imports exactly one renderer chunk and loads only that

### Story 4.2: Surface routing with real history

As a visitor who follows a link to the Colophon and presses Back,
I want to return to where I was in the journey,
So that inspecting the model does not cost me my place.

**Acceptance Criteria:**

**Given** there are three addressable surfaces (AD-18)
**When** routing is implemented in `shell/router.ts`
**Then** the scene, the Fallback, and the Colophon are the only addressable routes
**And** they are resolved by AD-6's entry before any chunk loads

**Given** route changes are real history entries (AD-18)
**When** a visitor moves between surfaces
**Then** the browser Back button returns them to the previous surface

**Given** surface-level position is preserved (AD-18, UX-DR54)
**When** a visitor leaves the scene and returns
**Then** the scene resumes at the Client stop it was left at, **not at First Paint**

**Given** Focus is scene state, not a route (AD-18)
**When** a visitor focuses a Project
**Then** no history entry is created
**And** Focus is released by `Escape`, never by the Back button

**Given** destinations are addressed by entity ID (AD-5)
**When** a URL fragment names a destination
**Then** it names a stable entity ID, never a positional index

### Story 4.3: The Fallback star chart

As a visitor on a phone or an incapable machine,
I want a complete, well-made flat chart of the whole career,
So that I can do everything a desktop visitor can do, without being told what I am missing.

**Acceptance Criteria:**

**Given** the Fallback reads the artifact and never derives (AD-3, AD-14)
**When** `render-fallback/` renders
**Then** it reads the same `layout.generated.json` the scene reads, using the time-axis scalar rather than the solved 3D positions
**And** it contains no classification test and no mapping-rule computation
**And** it never imports from `src/data/`

**Given** content parity is absolute (FR-22)
**When** the Fallback renders
**Then** it shows **every Project, every field, and every Notable, with no truncation**
**And** it is not a teaser, a stub, a summary, or an error page

**Given** time is the axis (UX-DR47)
**When** the chart is laid out
**Then** time runs along the horizontal axis on desktop
**And** it transposes to vertical on a phone

**Given** the Fallback inherits the identity (UX-DR47)
**When** it renders
**Then** it uses the same palette, the same type ramp, the same square corners, and the same absence of shadow as the scene
**And** the vignette is dropped, because the plate has no centre and every corner carries content

**Given** Skills are shown here (UX-DR48)
**When** a Project's row renders
**Then** its Skills are displayed as text
**And** this does not violate FR-10, because the prohibition is on duplicating the Dust and the Fallback has no Dust to duplicate — content parity outranks it

**Given** the Fallback is the accessibility floor's floor (floor point 9)
**When** it is inspected
**Then** it is a conventional document with real semantic HTML, real headings in order, and no canvas
**And** every word of content is reachable by any visitor for whom the scene is hostile

**Given** it is a designed view, not an apology (UX-DR49, FR-20)
**When** every string on the surface is reviewed
**Then** **no banner, badge, or line of copy tells the visitor they are missing anything**
**And** there is no "best viewed on desktop", no disclaimer, and no apologetic microcopy in any register

**Given** the same voice governs both surfaces (UX-DR49)
**When** a Shallow Project renders on the Fallback
**Then** it carries the identical editorial rule line the scene's panel carries

### Story 4.4: The Deep/Shallow signal on a flat chart

As a visitor on the Fallback,
I want to tell which entries carry a written argument,
So that I can answer the M2 gate's second clause without the 3D scene.

**Acceptance Criteria:**

**Given** there is no 3D Moon on a flat chart (UX-DR48)
**When** a Deep Project renders on the Fallback
**Then** the **Ring carries the signal alone**, drawn around the Project's chart marker

**Given** the signal is carried by three redundant structural channels here (UX-DR48)
**When** the Fallback renders
**Then** a ring appears on the plate marker, the ring is repeated on the corresponding index row, and a real `Notable` text column is present

**Given** the signal derives from Notable presence alone (AD-3, FR-9)
**When** the Fallback draws it
**Then** it reads `isDeep` from the artifact and performs no classification of its own
**And** the scene and the Fallback therefore cannot disagree about any Project's class

**Given** neither size nor brightness may carry the signal (UX-DR11)
**When** the chart is inspected
**Then** no marker scale or luminance is used to mark a Deep Project

**Given** a Fallback visitor must satisfy the M2 gate (FR-22)
**When** a technical reader who has not seen the site is shown the Fallback
**Then** they can state what Thomas does **and** which entries are worth reading

### Story 4.5: One-click movement between surfaces

As a visitor on a capable desktop who would rather read a list,
I want to reach the Fallback in one click and come back,
So that the choice of surface is mine.

**Acceptance Criteria:**

**Given** the Fallback is reachable from the scene at any time (UX-DR49, FR-22)
**When** a visitor on the scene wants the flat chart
**Then** a persistent affordance takes them there in **one click**, from any state

**Given** the Fallback is never a lesser destination (UX-DR49)
**When** the affordance is labelled
**Then** its copy presents the Fallback as a surface, not as a downgrade, a fallback, or a compatibility mode

**Given** the Fallback carries its own route to the Colophon (UX-DR54)
**When** the Fallback's chrome renders
**Then** it carries the same `THOMAS NAVARRO · the model` route
**And** the accessible surface therefore reaches the Colophon without passing through the scene

**Given** a Fallback visitor on a capable machine may want the scene
**When** they choose it
**Then** they are routed to the scene, and the choice creates a real history entry (AD-18)

**Given** the Fallback is the preferred surface for date navigation (EXPERIENCE.md §4.6)
**When** a visitor needs to navigate by date
**Then** the Fallback's time axis serves that need directly

### Story 4.6: Performance offers, never forces

As a visitor whose machine is struggling with the scene,
I want to be offered a smoother surface rather than having one imposed on me,
So that I judge the real thing rather than a stripped-down version of it.

**Acceptance Criteria:**

**Given** capability routes and performance offers (AD-8)
**When** the running scene sustains a framerate below the NFR-2a floor
**Then** the Fallback is **offered** through the existing persistent one-click affordance
**And** it is **never forced**, and the visitor is never rerouted without acting

**Given** quality holds and frames drop (NFR-3)
**When** the scene is under load
**Then** no render quality is stripped, no geometry is simplified, and no visual feature is disabled to chase frames
**And** the real thing at a lower framerate is preferred over a lesser thing at a higher one

**Given** a stable framerate reads smooth where a fluctuating one reads broken (NFR-3)
**When** performance behaviour is tuned
**Then** stability is preferred over a higher fluctuating average

**Given** the floor and the target are deliberately different numbers (NFR-2a, NFR-2)
**When** the offer threshold is implemented
**Then** it is the sustained Fallback floor, not the M3 framerate target
**And** a scene running just above the floor keeps running rather than being abandoned

**Given** the floor value is unratified (NFR-2a, PRD §13 Q16)
**When** the threshold is implemented
**Then** it is a single named constant, changeable without touching detection or routing logic
**And** the code records that the value awaits ratification

**Given** the target hardware profile governs verification (NFR-4)
**When** performance is measured
**Then** it is measured on a three-year-old laptop with integrated graphics at 1080p
**And** **never on the dev machine and never on current Apple silicon**

---

## Epic 5: The Colophon

A visitor can inspect the actual data file the site reads, see the three mapping rules worked against real values drawn from it, and read what the site deliberately does *not* have — no backend, no CMS, no position overrides, no per-entry camera work. It shows rather than describes, which is the only form that satisfies the transfer claim.

**FRs covered:** FR-21 · **Success metric:** SM-3 (a reader can describe at least one architectural decision the site makes)
**ADs realised:** AD-13, AD-17, AD-18
**UX-DRs covered:** UX-DR50, UX-DR51, UX-DR52, UX-DR53, UX-DR54

**Why this is a launch requirement rather than a flourish.** The transfer claim is that the site proves *how its author works*, and the evidence is the architecture rather than the graphics. That claim only holds if the reasoning is visible to a visitor. A page that explains the force simulation in prose fails the test however well it is written; a page that shows the actual file, with `mass ← duration` demonstrated on a real entry with its real numbers, passes it.

### Story 5.1: The Colophon as a fourth lazy chunk

As a visitor who never opens the Colophon,
I want its cost kept off the path to the first frame,
So that the surface proving the site's engineering does not slow the site down.

**Acceptance Criteria:**

**Given** the Colophon is a fourth lazy chunk (AD-17, AD-7)
**When** the bundle is built
**Then** `colophon/` is a separate dynamically imported chunk, loaded on navigation and never on the critical path
**And** the entry chunk's module graph does not reach it

**Given** FR-21 requires the real `career.json` while AD-7 forbids it on the entry path
**When** the raw file reaches the Colophon
**Then** it arrives as **emitted data** — copied into the build output as an asset and fetched by the chunk
**And** it is **never statically imported**, which would hoist it into a bundle

**Given** no module outside `src/derive/` may import from `src/data/` (AD-3)
**When** `colophon/` is inspected
**Then** it imports nothing from `src/data/`
**And** the CI boundary check from Story 1.8 covers it

**Given** the Colophon is an addressable surface (AD-18)
**When** a visitor navigates to it
**Then** the route change is a real history entry and Back returns them to the surface they came from

**Given** return must not cost the visitor their place (UX-DR54)
**When** a visitor returns to the scene from the Colophon
**Then** the scene resumes at the Client stop it was left at, **not at First Paint**

**Given** it is entered from the identity slot (UX-DR54, UX-DR27)
**When** the route is exposed
**Then** it sits in the left-top corner chrome as `THOMAS NAVARRO · the model`, preserving the two-line chrome rule
**And** the Fallback carries the same route in its own chrome

### Story 5.2: The three mapping rules, worked on real entities

As a technical visitor,
I want to see each mapping rule applied to a named entry with its actual numbers,
So that I can check the claim rather than take it.

**Acceptance Criteria:**

**Given** the page renders rather than narrates (UX-DR51, FR-21)
**When** each of the three rules is presented
**Then** it appears as a derivation row naming a **real entity**, showing the input value from the data and the resulting visual property
**And** `mass ← duration` is worked on one real Project with its real duration

**Given** all three rules are shown (FR-3, FR-21)
**When** the derivations render
**Then** mass from duration, brightness from recency, and distance-from-Rail from `weight` are each present and each tied to actual values

**Given** the derived quantity is the consequence the eye should reach (UX-DR51)
**When** a derivation row renders
**Then** the rule name sets at `field-label` in `ink-label`, the input and output values at `field-value` in `ink-prose`, and the **derived quantity lifts to `ink-lift`**
**And** the lift is the same device the Notable uses

**Given** nothing is authored twice (UX-DR53, FR-21)
**When** any value on the page renders
**Then** it comes from the data at render time
**And** no hand-maintained copy of any number exists anywhere on the page

**Given** the derivations are a table of record (UX-DR50)
**When** they render
**Then** they use a real `<table>` with real headers, readable by a screen reader as a table

**Given** the page must not rot (FR-21)
**When** an entry changes and the site is rebuilt
**Then** the Colophon reflects the change with no edit to the Colophon itself

### Story 5.3: The data file rendered in full

As a technical visitor,
I want to read every byte the scene reads,
So that the evidence is in front of me rather than described to me.

**Acceptance Criteria:**

**Given** the real file is shown, not paraphrased (FR-21, UX-DR52)
**When** the JSON block renders
**Then** the file is present **in full** — not summarised, not excerpted, and not hidden behind a fold
**And** a visitor may read every byte the scene reads

**Given** both files are exhibited with the rules between them (AD-13)
**When** the page is composed
**Then** it renders the authored `career.json` and the emitted `layout.generated.json`, with the mapping rules between them
**And** the transformation itself is therefore what a visitor inspects

**Given** the palette is achromatic everywhere else (UX-DR52)
**When** the JSON is syntax-set
**Then** setting is **luminance only** — keys at `ink-lift`, values at `ink-prose`, punctuation and structure at `ink-label`
**And** **no syntax colouring is used**, because four hues here would break the identity at the exact moment the page argues for the author's consistency

**Given** code that wraps arbitrarily cannot be read (UX-DR52)
**When** the JSON block renders
**Then** it sits in a horizontally scrollable container and runs to its natural width
**And** the prose measure does not apply to it

**Given** it is the same kind of thing as the panel — the record, shown (UX-DR52)
**When** the block renders
**Then** it sits on `surface-raised` with a 1px `surface-edge` left border, no radius, and no shadow

**Given** the JSON must be accessible (UX-DR50)
**When** it renders
**Then** it is in a `<pre>` with an accessible name

**Given** a monospaced family is defensible here and nowhere else (DESIGN.md §7.11)
**When** the JSON body renders
**Then** it uses the system monospace stack, and monospace appears nowhere else in the product

### Story 5.4: Stating what is not there

As a technical visitor,
I want the site to name the things it deliberately does not have,
So that I can judge the decisions, not just the output.

**Acceptance Criteria:**

**Given** several load-bearing claims are about absences (UX-DR53, FR-21)
**When** the page states them
**Then** it names that there is no backend, no CMS, no position overrides, and no per-entry camera work
**And** this is the one place on the page where prose does the work, because an absence cannot be shown by rendering data

**Given** FR-21 requires the contracts to be stated (FR-21)
**When** the page renders
**Then** the entity-relative Shot contract is stated — Shots name entities, never coordinates
**And** the no-position-overrides rule is stated

**Given** the voice is concrete and unboastful (UX-DR46, EXPERIENCE.md §3)
**When** the prose is reviewed
**Then** it makes no discountable claim, does not narrate how the site was built, and does not boast about build difficulty
**And** every statement is checkable against the file rendered above it

**Given** it is not a features list (UX-DR53)
**When** the page is reviewed
**Then** it does not enumerate what the site does — it shows how the layout is derived, and stops

**Given** it does not illustrate itself (UX-DR53)
**When** the page is composed
**Then** it draws no small version of the scene to explain itself — the scene is one click away

**Given** the Colophon is a conventional document (UX-DR50)
**When** it renders
**Then** it uses real headings in order on `surface-base` ground, with prose at the standard measure
**And** it requires none of the canvas accessibility preconditions, being the one surface where a screen-reader user receives exactly what a sighted user receives

**Given** SM-3 is the transfer claim's only observable
**When** a technical reader who has not seen the site reads the Colophon
**Then** they can describe at least one architectural decision the site makes

### Story 5.5: The live re-solve, honestly framed

As a technical visitor,
I want to watch the layout mechanism actually run,
So that I can see it is a real solver rather than a stored picture.

**Acceptance Criteria:**

**Given** the solver is a fourth lazy chunk loaded only here (AD-7, AD-17)
**When** a visitor triggers the live re-run
**Then** the solver chunk loads on demand
**And** it is never loaded on the critical entry path or by either renderer

**Given** AD-2's determinism is a same-environment guarantee (AD-17)
**When** the live re-solve runs in the browser
**Then** it may legitimately settle differently from the committed Node solve

**Given** that difference must not read as rot (AD-17)
**When** the re-solve is presented
**Then** it is framed as a **demonstration of the mechanism, not a reproduction of the shipped layout**
**And** **the page says so explicitly**, so the one surface built to prove the site cannot rot is never caught appearing to demonstrate it rotting

**Given** the committed artifact remains authoritative (AD-1, AD-13)
**When** the re-solve completes
**Then** no renderer reads its output
**And** the committed `layout.generated.json` remains the only layout any renderer reads

**Given** the concession is made in the voice of the product (UX-DR46)
**When** the framing copy is written
**Then** it concedes the point in a clause and moves on — no banner, no disclaimer, no apologetic register

---

## Epic 6: Launch Surface — Shareability, Contact, and First Paint

A visitor who receives the link in Slack sees a composed image rather than a blank card, one that does not overstate what a mobile visitor will receive. Anyone who wants to reach Thomas can, without depending on a configured mail client. And the first frame of the Schematic scene arrives fast enough on a real target machine that The Forward — who has no context and no reason to wait — is still there when it does.

**FRs covered:** FR-23, FR-24 · **NFRs:** NFR-1
**UX-DRs covered:** UX-DR55

**Sequencing note.** NFR-1's architectural enablers — build-time solving (AD-1), four lazy chunks and a thin entry (AD-7), detection before the bundle fetch (AD-6) — are built in Epics 1 and 4. What remains here is **verification on real target hardware**, which cannot happen until there is a scene to paint and a Fallback to be honest about.

### Story 6.1: The composed link preview

As The Forward, receiving a URL and the word "look" in Slack,
I want the link to render as a composed image rather than a blank card,
So that I have a reason to tap it.

**Acceptance Criteria:**

**Given** shareability is a designed property, not an observed outcome (FR-24)
**When** the link is pasted into Slack, LinkedIn, or a message
**Then** a deliberately composed preview image renders
**And** it is neither blank nor auto-derived from an arbitrary screenshot

**Given** the preview is composed from the same system (UX-DR55)
**When** the image is made
**Then** it uses `surface-base` ground, one white Client Star, the Rail at `stroke-dust`, and the corner chrome
**And** it obeys the same identity rules as the scene: no hue, no shadow, no glow, square corners

**Given** the opening frame is composed knowing it will be screenshotted (FR-24)
**When** the opening Shot is framed
**Then** it is composed to survive being captured as a still
**And** the preview image and the opening frame are visibly the same composition

**Given** the preview must not overstate what a visitor receives (FR-24, UX-DR55)
**When** a mobile visitor taps through
**Then** what arrives is the Fallback, and the preview did not promise an interactive 3D scene
**And** the title and description are honest about this

**Given** a disclaimer is forbidden (FR-20, UX-DR46)
**When** honesty is achieved
**Then** it is achieved through composition and wording rather than through any "best viewed on desktop" note, badge, or caveat
**And** the copy concedes nothing in an apologetic register

**Given** the image ships as a committed asset
**When** the build runs
**Then** `public/preview.png` is present and referenced by the appropriate `og:` and `twitter:` metadata
**And** the metadata carries a title and description that do not overstate the product

**Given** no fabricated endorsement may appear anywhere (UX-DR46)
**When** the preview and its metadata are reviewed
**Then** they contain no quote, testimonial, or invented praise

### Story 6.2: Preview drift guard

As Thomas the maintainer,
I want the build to warn me when the committed preview no longer matches the committed layout,
So that a re-solve does not silently leave the link preview showing a frame the site no longer renders.

**Acceptance Criteria:**

**Given** the preview can silently diverge from the opening frame (Architecture Open Questions)
**When** `layout.generated.json` is newer than `public/preview.png`
**Then** the build emits a warning naming both files and stating that the preview may be stale

**Given** headless WebGL at build time was rejected as a solution
**When** the guard is implemented
**Then** it introduces no native dependency and no headless browser
**And** it remains cheap to run in a rebuild years from now, which is the property UJ-4 depends on

**Given** the guard fails loud but does not block (Architecture Open Questions, unratified)
**When** the warning fires
**Then** it is visible in build output rather than silent
**And** whether it should escalate to a build failure is recorded as an open decision rather than assumed

**Given** re-solving is already a deliberate act (AD-1)
**When** a visitor re-solves
**Then** regenerating the preview is documented as part of that deliberate act

### Story 6.3: The contact route

As a visitor who wants to start a conversation,
I want a contact route that works on a locked-down corporate laptop,
So that the site's only call to action is not a dead link.

**Acceptance Criteria:**

**Given** a bare `mailto:` dead-links on exactly the machines NFR-4 names (FR-23)
**When** the contact route renders
**Then** a **visible, copyable address** is present alongside or instead of any `mailto:` link
**And** the route works without depending on a configured mail client

**Given** the mechanism requires no backend (FR-23, NFR-6)
**When** the route is implemented
**Then** it uses no form service, no API, no serverless function, and no third-party endpoint
**And** nothing is submitted anywhere

**Given** copy feedback is microcopy, never furniture (E-A8)
**When** a visitor copies the address
**Then** the success feedback is a three-word in-place microcopy change
**And** it is **never a toast, a banner, or a modal**

**Given** the route is one of exactly five places copy exists (UX-DR45)
**When** it renders
**Then** it carries no help text, no tooltip, and no explanatory caption

**Given** it is explicitly unglamorous (FR-23)
**When** it is reviewed
**Then** it works and does not embarrass, and the designed ending remains M4
**And** no apology is made for its plainness

**Given** it is the one genuine runtime error surface in the product (EXPERIENCE.md §5.7)
**When** the copy affordance fails on a browser that blocks clipboard access
**Then** the visible address remains readable and selectable by hand

**Given** the route is reachable from the accessible surface
**When** a Fallback visitor looks for it
**Then** it is present there too, and is keyboard-reachable with a real accessible name

### Story 6.4: First Paint verified on target hardware

As The Forward, tapping a link between meetings with no context and no reason to wait,
I want the first frame to arrive before my patience does,
So that I see the product at all.

**Acceptance Criteria:**

**Given** nothing gates the first frame (NFR-1, UX-DR37)
**When** any visitor arrives
**Then** no consent banner, cookie notice, splash, loading screen, progress bar, or click-to-enter appears
**And** there is nothing to accept, because the site collects nothing

**Given** First Paint is measured on the target hardware profile (NFR-1, NFR-4)
**When** the measurement is taken
**Then** it is taken on a three-year-old laptop with integrated graphics at 1080p over a median broadband connection
**And** **never on the dev machine and never on current Apple silicon**

**Given** the budget's number is unratified (NFR-1, PRD §13 Q1, E-T5)
**When** the result is recorded
**Then** the measured value is recorded against the carried 2.5s figure
**And** the record states that the **principle is adopted and the number is not ratified**, so a miss is a decision point rather than an automatic failure

**Given** everything behind the first frame may stream (NFR-1)
**When** the scene loads
**Then** full Dust density, remaining Bodies, and the complete Rail may arrive after the first frame

**Given** streaming must never be visible as popping (UX-DR37)
**When** a Body arrives after First Paint
**Then** it fades its stroke up through the ladder rather than appearing at final luminance
**And** no skeleton screen or placeholder stands in for it — a Body that has not arrived is simply not there yet, in a frame that is already mostly empty

**Given** the architectural enablers must still hold at launch (AD-1, AD-6, AD-7)
**When** the shipped bundle is inspected
**Then** the runtime performs no force solve
**And** the entry chunk still reaches neither Three, nor the solver, nor `src/data/`
**And** the CI assertions from Stories 1.8 and 4.1 pass against the production build

**Given** the opening frame has fifteen seconds to do its job (NFR-1a)
**When** an unprompted viewer watches the first fifteen seconds
**Then** they register a real work history, organised rather than listed, and deliberately designed

### Story 6.5: Launch readiness pass

As Thomas,
I want the M2 gate tested against a real stranger before the CV links here,
So that the link goes live only once the site answers the question it exists to answer.

**Acceptance Criteria:**

**Given** the M2 gate has two clauses (PRD §8.1, SM-2)
**When** a technical reader who has not seen the site explores two or three entries
**Then** they can state Thomas's discipline, seniority, and the kinds of environments he works in
**And** they can say **which entries were worth reading**

**Given** the same gate must hold without the scene (FR-22)
**When** the same test is run on the Fallback alone
**Then** the reader can answer both clauses

**Given** the site must be reachable and deployable (Architecture, Deployment)
**When** the site is deployed
**Then** it is served from a static file host with no Node process, no serverless function, no database, no environment variable, and no secret
**And** rollback is redeploying a previous commit

**Given** the build pipeline gates on its own contracts
**When** `npm run build` runs on a clean checkout
**Then** schema validation passes (AD-11), the committed artifact validates against its declared schema (AD-14), destination cardinality is asserted (AD-15), and the import-boundary and bundle assertions pass (AD-3, AD-7)
**And** the build fails if any of them does not

**Given** all three surfaces are addressable (AD-18)
**When** a visitor moves between the scene, the Fallback, and the Colophon
**Then** each is reachable, Back works, and the scene resumes where it was left

**Given** no disclaimer may appear anywhere (FR-20)
**When** every surface is reviewed one final time — scene, panel, Fallback, Colophon, preview, and contact route
**Then** no "work in progress" note, beta tag, badge, or apologetic microcopy exists in any register

**Given** SM-1 is measured anecdotally by construction (SM-1, NFR-6)
**When** launch readiness is assessed
**Then** no analytics, tracking, or measurement instrumentation is added to observe it
**And** the weak instrument is accepted rather than solved, because instrumenting it would contradict NFR-6 and serve the counter-metric SM-C1
