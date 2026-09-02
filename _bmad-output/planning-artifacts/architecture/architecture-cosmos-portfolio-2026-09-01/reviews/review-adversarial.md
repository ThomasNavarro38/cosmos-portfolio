---
title: Adversarial Architecture Review — Cosmos Portfolio Spine
target: ../ARCHITECTURE-SPINE.md
method: divergence-attack — construct two compliant units that build incompatibly
reviewer: adversarial architecture review
date: 2026-09-01
verdict: STRUCTURALLY SOUND, UNDER-SPECIFIED AT THE SEAMS
---

# Adversarial Architecture Review — Cosmos Portfolio Spine

## Method

The spine is not attacked for being wrong. It is attacked for being *insufficient*: for each finding I construct **two units one level down** — two epics, two stories, or two developers working in parallel — where **both obey every AD to the letter**, both pass code review against the spine, and the result still does not compose. Every such pair is a hole, and every hole is closed with a new or tightened AD.

Ground truth beyond the spine itself: `prd.md` (FR-1..FR-24), `EXPERIENCE.md` (§4–§11), `DESIGN.md` (token frontmatter), `.memlog.md`, and `mockups/keyscreen-fallback.html`.

## Verdict

The paradigm is genuinely load-bearing and the acyclicity claim survives inspection. The ADs are well-chosen at the level they operate. **The failures are all of one kind: the spine names `layout.generated.json` as the shared contract thirteen times and never says what is in it.** Every critical finding below is downstream of that single omission. A second, smaller class of failure is ADs that forbid a *mechanism* while leaving the *obligation* unowned — AD-3 forbids renderers from deriving, but does not say the derivation must be complete, so the first renderer that needs an undelivered property has no lawful move.

Counts: **4 CRITICAL, 5 HIGH, 4 MEDIUM, 3 LOW.** No AD contradicts another AD outright; two pairs are in unresolved tension (F12, F13). The dependency graph is acyclic as drawn but the drawing omits two real edges (F14).

---

# CRITICAL

## F1 [CRITICAL] — `layout.generated.json` has no schema, and its two renderers need incompatible ones

**The hole.** AD-3 says every derivation "is computed once in `src/derive/` and resolved in the emitted artifact." AD-13 names the artifact. AD-4 generates the index from it. The Capability Map routes six FRs through it. **Nowhere does the spine state one field of it.** It is the single most-referenced object in the document and the only one with no contract.

**Unit A — Story: "Scene renders Client systems from the layout artifact"** (`render-scene/`).
The scene needs 3D positions, so the developer writes the consumer that the solver obviously implies:

```json
{ "bodies": [ { "id": "sncf-referential", "kind": "project",
                "position": [12.4, -3.1, 8.9], "mass": 1.8,
                "luminanceBand": 3, "isDeep": true, "moteTier": 1 } ] }
```

Flat array of bodies, positions as 3-tuples, parent expressed as a `clientId` field. Every property pre-derived. Fully AD-3 compliant, imports nothing from `src/data/`.

**Unit B — Story: "Fallback renders the flat star chart"** (`render-fallback/`).
The developer reads `EXPERIENCE.md` §4.6 and `keyscreen-fallback.html` and finds the ratified Fallback layout is **time-as-axis**: one row per Client, projects placed left-to-right by date, transposing on phone. The solver's 3D positions are *useless to him* — worse, using them would produce a scrambled chart. He also needs the Client→Projects nesting as a tree, because his markup is a nested list. So he writes his consumer against:

```json
{ "clients": [ { "id": "sncf", "label": "SNCF",
                 "projects": [ { "id": "...", "isDeep": true,
                                 "axisPosition": 0.18, "year": 2024 } ] } ] }
```

Nested tree, no 3D positions, a derived `axisPosition` normalised 0..1.

**The incompatibility.** Both stories pass review. Both obey AD-3 (no classification test in either renderer), AD-13 (neither hand-edits), AD-5 (both address by ID). They consume **two different documents that happen to share a filename**. Whoever lands second either rewrites the emitter — silently changing the shape the other renderer reads — or, far more likely under deadline, writes an adapter inside his own renderer. That adapter is a derivation living in `render-*/`: AD-3 violated through a door AD-3 does not guard, because AD-3's enforceable clause is *"no module under `src/render-*/` may import from `src/data/`"* and the adapter imports from the artifact, which is legal.

Note this is not hypothetical divergence — `EXPERIENCE.md` §4.6 and the shipped mock make it **certain**: the Fallback's ratified layout is not a projection of the 3D solve. The artifact must carry both geometries or the Fallback must derive its own, and the spine picks neither.

**Close it — AD-14 (new): The layout artifact has a versioned, validated schema.**
> `layout.generated.json` conforms to an explicit schema in `src/derive/artifact-schema.ts`, checked in the same build gate as AD-11 and versioned by a `schemaVersion` field. The artifact carries **every property every renderer needs, for every surface** — including the Fallback's time-axis placement, which is a derived visual property under AD-3 and therefore is emitted, not computed in `render-fallback/`. Adding a consumer requirement means extending the schema and the emitter, never adapting the artifact at the point of use. The renderers' own type definitions are generated from this schema, never hand-declared.

**Also tighten AD-3:** add *"A renderer may not reshape, re-key, re-nest, normalise, or adapt the artifact. If the shape a renderer needs differs from the shape emitted, the emitter changes."*

---

## F2 [CRITICAL] — Two owners of the destination set: AD-4's index and AD-5's raycast resolve different entities

**The hole.** AD-4 makes the DOM index the source of truth for destinations. AD-5 says every reference names an entity ID. Neither AD says the two input paths address the **same set**, and `.memlog.md` line 30 explicitly records this as an accepted cost requiring "an explicit rule" — which was then written only as "address by ID," which is necessary and not sufficient.

**Unit A — Story: "Persistent DOM destination index"** (`shell/index-nav.tsx`).
Per `EXPERIENCE.md` §11.1 P1, the developer builds a `<nav>` with one entry per Client and a nested list of its Projects. Clients and Projects are the destination set. Motes are not in it — §11.1 P4 is explicit that Skills reach AT through the *panel*, not the index. Correct.

**Unit B — Story: "Pointer interaction and click-to-fly"** (`render-scene/`).
Per §6.5, "activating any visible Body flies the camera to it." The developer raycasts. What is a `Body`? The PRD Glossary and `DESIGN.md` `components` give him: Client Star, Project Planet, **Moon**, Mote, orbit-line, dust. He makes the Moon non-interactive (sensible), but the Moon is a child mesh of the Deep Project and its raycast hit returns the Moon's own object. He resolves via `object.userData.entityId` — which he sets on the Moon to the Deep Project's ID, because that is the correct target. Also correct, also AD-5 compliant (he names an ID; he never uses a screen position).

**The incompatibility.** It bites in three places, none caught by review:

1. **Hover on a Moon.** §11 floor point 4 requires focus/hover equivalence. Hovering the Moon reveals the parent Project's affordance. There is no index entry *for the Moon*, so keyboard focus can never reach the Moon's own state — fine, but Unit A has no way to know that a hover state can originate from an object that is not in its list, so the two representations of "what is currently hovered" are populated from different vocabularies.
2. **The Client Star.** §4.1 says a Client "flies to its stop and frames the system." Unit B's raycast hit on a Client Star yields the Client entity. Unit A's index entry for a Client is a `<button>` with `aria-pressed` reflecting Focus (§11.1 P2) — but **a Client can never be Focused** (§4.1: "There is no Client-level panel"). Unit A writes `aria-pressed` on an element that can only ever be `false`; Unit B fires `focusProject` on nothing. Neither is wrong under any AD. The state machine (AD-9) holds `focusedProjectId`, which cannot represent "at a Client stop" — so Unit A and Unit B invent two different conventions for what "the Client is current" means.
3. **Off-screen bodies.** AD-4's *Prevents* clause names this exactly. Unit A lists every destination including ones behind the camera. Unit B can only raycast what is rendered. Two destination sets of different cardinality, both lawful.

**Close it — AD-15 (new): One destination registry, emitted, addressed identically by both input paths.**
> The artifact emits a single `destinations` list — the complete, ordered set of addressable entities with their kind (`client` | `project`). It is the only definition of "what can be navigated to." `shell/index-nav.tsx` renders it one-to-one. Every raycastable object in `render-scene/` carries `userData.destinationId` drawn from that same list, and any mesh that is not a destination (Moon, Ring, orbit, Mote, dust) is `raycast = null` or resolves to its owning destination's ID. **Two paths, one list, identical cardinality.** A destination that exists in one path and not the other is a build-gate failure, not a bug report.

---

## F3 [CRITICAL] — AD-9's state shape cannot represent Rail-at-a-Client, so two consumers invent conflicting mutation paths

**The hole.** AD-9 fixes the store as `{ mode: rail | freeflight, focusedProjectId: id | null, railPosition }`. But `EXPERIENCE.md` §5.1 defines **five** states, the ratified Rail visits **Clients** (`.memlog.md` line 13 — "AMENDS PRD FR-17a and FR-18 in effect"), and §7.1a's Escape table distinguishes "Focused, on the Rail" from "Focused, in free flight" — which requires knowing *where Focus was entered from*. None of that fits in three fields.

**Unit A — Story: "Rail scroll and Client stops"** (`shell/state.ts` + camera subscriber).
`railPosition` is unspecified, so the developer makes it a **continuous scalar** — a normalised 0..1 arc-length along the trajectory. This is the only shape that supports §6.2's "departure begins before the visitor has finished scrolling in" and "the stop is a slowdown, not a halt." Damped scroll velocity writes it every frame. He adds `advanceRail(delta)`. Lawful: named event, single store, camera is a subscriber.

**Unit B — Story: "Keyboard destination index navigation"** (`shell/index-nav.tsx`).
Per §7.3, `↑`/`↓` "advance and reverse along the Rail," and `Enter` on a Client "flies to its stop." The developer needs to know **which Client is current** to render `aria-current` and to compute the next one. A continuous scalar does not answer that. So he adds — lawfully, via a named event — `goToClientStop(clientId)`, and derives current-client by nearest-stop lookup from `railPosition`.

**The incompatibility.** Two writers to one field with different semantics:

- Unit A writes `railPosition` continuously, at frame rate, from damped scroll. Unit B writes it discretely, by jumping it to a stop's arc-length value. When a keyboard user presses `↓` while Unit A's damping still has residual velocity, the two writes fight: the scalar is set to the stop, then immediately dragged off it by the decaying velocity integrator. The camera drifts past a stop the index says it is at. **`aria-current` and the camera disagree — precisely the failure AD-9's *Prevents* clause names, reached without violating AD-9.**
- Worse: Unit B's nearest-stop derivation makes "which Client is current" a **computed** property with a threshold, and that threshold lives in `index-nav.tsx`. That is a data-to-visual derivation in a non-`derive/` module. AD-3 forbids this only for `render-*/`; `shell/` is unguarded (see F5).
- §7.1a's Escape table cannot be implemented at all: releasing Focus must return to "free flight, at the same Body" *or* "the Rail, at the same stop," and the store has no field recording which. Both developers will add one — Unit A as `previousMode`, Unit B as an entry in a local component ref. One of those is not in the store, so AD-9's "neither owns state" is violated by whichever developer is second and in a hurry.

**Close it — AD-16 (new, replaces AD-9's state literal): The store's shape is complete for §5.1's five states and has exactly one writer per field.**
> The navigation store holds `{ mode: rail | freeflight, railPosition: number, currentClientId: id, focusedProjectId: id | null, focusOrigin: rail | freeflight | null }`. `currentClientId` is **stored, not derived** — set only by the transition that arrives at a stop — so no consumer computes "which Client is current" from geometry. `focusOrigin` exists solely to satisfy §7.1a's Escape precedence and is written only by `focusProject`. Each field names its single writing event in `state.ts`; a second writer is a review failure. Continuous camera interpolation state (velocity, easing phase) is **not** in the store — it is camera-local, because it is presentational and AD-4 says nothing depends on the camera.

---

## F4 [CRITICAL] — "Derived once" and "the Colophon re-runs the solve live" are two mutation paths to one entity

**The hole.** AD-1 says the runtime never solves. AD-7 permits a `solver` chunk loaded by the Colophon only, so FR-21 can "re-run the solve live as demonstration" (`.memlog.md` line 19). AD-13 says the Colophon renders both files and the rules between them. **No AD says what the Colophon may do with the solver's output.**

**Unit A — Story: "Colophon renders the derivation"** (`colophon/`).
Renders the raw JSON, the three rules worked on real values, the derived artifact. Loads nothing heavy. Fully compliant. This is the *literal* reading of FR-21 and §4.7 — "it renders, it does not narrate."

**Unit B — Story: "Colophon live re-solve demonstration"** (`colophon/` + `derive/solve.ts`).
Reads `.memlog.md` line 19 as ratified, dynamic-imports the solver, runs it in the browser on the raw JSON, and shows the layout settling. Lawful under AD-7, which explicitly names `solver (the Colophon's live re-run only)` as a permitted chunk.

**The incompatibility.**

1. **Two owners of "the layout."** Unit B produces a *second* layout at runtime. If it renders identically to the committed one, AD-2's determinism must hold **across environments** (Node 22 build vs. an arbitrary browser JS engine) — and AD-2 only requires "identical input produces byte-identical output," which is a same-environment claim. Float ordering and `Math.random` seeding are per-engine concerns AD-2 does not reach. So Unit B's demo will, in some browser, visibly settle to a *different* layout than the site is running. **The surface whose entire purpose is proving the site cannot rot demonstrates it rotting.** SM-3's only observable inverts.
2. **State mutation path.** If Unit B's re-solve writes anywhere the scene can read — a store, a module singleton, a cached artifact object — the runtime now has a solver-driven mutation path AD-1 exists to forbid. AD-1 says "the runtime scene never solves," which does not forbid *the Colophon* solving and the scene reading the result.
3. **AD-7 conflict with itself.** AD-7 forbids the critical entry path from statically importing "the solver, or the raw career JSON." But Unit B *needs the raw career JSON at runtime* — FR-21 and §4.7 require the file rendered in full, in a `<pre>`. So `colophon/` must import `src/data/career.json`. Is `colophon/` on the critical entry path? It is reached from the corner chrome slot present on every surface (§4.7 Entry and return), so its *link* is, but its chunk is not. The spine never says whether `colophon/` is a fourth lazy chunk. AD-7 says "three lazy chunks" and lists `render-scene`, `render-fallback`, `solver` — **the Colophon itself is not among them**, so a literal reading puts the Colophon (and therefore the raw JSON) in the entry bundle, defeating AD-7's own rule.

**Close it — AD-17 (new): The Colophon is a fourth chunk; its solver output is demonstrative and terminal.**
> `colophon/` is its own lazy chunk, the only module besides `derive/` permitted to import `src/data/career.json` (it must, to satisfy FR-21's "every byte"). The solver chunk is loaded only from within `colophon/`, on explicit visitor action, never on Colophon mount. **The live re-solve's output is display-only: it is never written to any store, never cached, never read by any renderer, and never compared for equality against the committed artifact.** The demonstration shows *the process*, not a reproduction claim — because AD-2's determinism guarantee is scoped to the build environment (Node 22) and is not asserted across browser engines. AD-2 is amended to state that scope explicitly.

---

# HIGH

## F5 [HIGH] — `shell/` is ungoverned: AD-3's only enforceable clause names `render-*/` and nothing else

**The hole.** AD-3's teeth are one greppable rule: *"No module under `src/render-*/` may import from `src/data/`."* `.memlog.md` line 52 says the same. But the Structural Seed puts `shell/`, `colophon/`, and `tokens/` outside that rule, and the AD-13 dependency diagram draws `SH → A` (shell reads the artifact) with **no arrow forbidding `SH → D`**.

**Unit A — Story: "Destination index"** (`shell/index-nav.tsx`). Reads the artifact. Compliant and correct.

**Unit B — Story: "Document head, title, and og tags"** (`shell/entry.ts`). Needs the person's name, the project count, the date range for `<title>` and meta description. The artifact is a *layout* artifact — a reasonable developer does not expect prose in it — so he imports `career.json` directly. **No AD forbids this.** He has now (a) put the raw career JSON on the critical entry path, violating AD-7's *intent* while satisfying nothing that forbids it (AD-7 forbids *static import of* the raw JSON on the entry path — so actually this one *is* caught, but only for `entry.ts`; the same import in `shell/state.ts` or `shell/index-nav.tsx` is entirely lawful), and (b) created a second read path to the source of truth.

The concrete divergence: Unit A gets Client labels from the artifact (post-derivation, where AD-3's naming convention has renamed and normalised things); Unit B gets them from `career.json`. A Client renamed in derivation — trimmed, title-cased, deduplicated — now appears two ways on one page.

**Close it — tighten AD-3:**
> **No module outside `src/derive/` may import from `src/data/`, with exactly one exception: `src/colophon/`, which imports it as displayed text and never as a value it computes on (AD-17).** `src/shell/`, `src/render-scene/`, `src/render-fallback/`, and `src/tokens/` read the artifact and nothing else.

---

## F6 [HIGH] — AD-12 splits one token source into two artifacts with no rule that they agree in units

**The hole.** AD-12 says tokens are transformed "into CSS custom properties (DOM surfaces) and a typed JS object (scene materials)" from one source, neither hand-transcribed. It does not say the two transforms produce *equivalent* values.

**Unit A — Story: "CSS custom property generation"** (`tokens/`). Emits `--stroke-rest-dark: #2C2C33; --stroke-weight-hairline: 0.7px;`. Consumed by the Fallback, panel, Colophon. Correct.

**Unit B — Story: "Scene material token object"** (`tokens/`). Three.js takes linear-space colors and **world units, not pixels**. A `0.7px` hairline is meaningless to a `LineBasicMaterial`. So Unit B's generator emits `{ strokeRest: new Color(0x2C2C33).convertSRGBToLinear(), hairline: 0.7 }` — and now: is `hairline` pixels, world units, or a `lineWidth` the WebGL renderer ignores entirely? Whatever he picks, it is a **transform of a DESIGN.md value made in the token generator**, i.e. a mapping decision, and AD-3 says mapping decisions live in `derive/`. AD-12 says tokens come from `tokens/`. **Neither AD owns the px→world conversion**, and it is exactly the kind of value that will be tuned by eye in one place and forgotten in the other.

The divergence that ships: `DESIGN.md` `components.ring-notable.radiusRatio: 2.2` and `moon-notable.minRadius: "2.4px"`. The Fallback (SVG, px space) applies both literally — the mock does. The scene (world space) applies the ratio and *silently drops* `minRadius`, because there is no px in a 3D scene. On a distant Client stop the Moon falls below a pixel and disappears. **FR-9's Deep/Shallow signal degrades on exactly one surface, invisibly, with both units fully AD-12 compliant.**

Also: `colors` are authored as light/dark **pairs** and M2 ships dark only. AD-12 does not say which half is selected or where. Unit A will emit both and select in CSS with a media query or a `data-theme`; Unit B has no CSS and must select in JS. Two selection mechanisms, one of which nobody will remember to flip when light theme lands.

**Close it — tighten AD-12 (or add AD-18):**
> The token generator emits **three** outputs from `DESIGN.md`: CSS custom properties, a typed JS object, and a **shared unit-and-theme contract** stating, per token, its unit domain (`px` | `world` | `ratio` | `color`) and its theme selection. Values whose unit domain differs between DOM and scene carry **both representations in the generated artifact**, computed by the generator — never by the consumer. Theme selection is one mechanism: the generator emits the M2 dark values as the token's value and the light pair as a sibling, so no consumer performs a light/dark conditional. Any token a scene material cannot express in its native domain (`minRadius` in px) is emitted with an explicit world-space equivalent or is marked `dom-only` and is a build error if the scene reads it.

---

## F7 [HIGH] — AD-3 forbids derivation but never obliges completeness, so the first missing property has no lawful home

**The hole.** AD-3 lists what is derived: `isDeep`, mass, luminance band, dwell tempo, mote tier, shot framing. `.memlog.md` line 34 records the discipline cost — "every NEW visual property must be added to the derivation step" — but the AD as written states a **prohibition** without a corresponding **obligation** on the emitter.

**Unit A — Story: "Deep/Shallow signal at rest"** (`render-scene/`). Needs Ring radius = `2.2 × bodyRadius`. `bodyRadius` derives from mass. Mass is in the artifact. He computes `2.2 * mass_derived_radius` in the component. Is that a "mapping-rule computation"? **AD-3's own text is ambiguous here.** It forbids "a classification test, a mapping-rule computation, or any conditional on a raw content field." `2.2 × r` is a token application, not a mapping rule, and it conditions on nothing raw. He is compliant on a defensible reading.

**Unit B — Story: "Fallback Deep/Shallow signal"** (`render-fallback/`). Same ratio, SVG, px. He computes `2.2 * r` too.

**The incompatibility.** They agree today. They diverge the moment either is tuned — and §4.2's tuning is deferred to M1 greybox. The whole point of AD-3 is that *nobody views both surfaces at once*, so the divergence is unobservable. Worse, both developers reached for `2.2` because AD-12 gave them the token and AD-3 gave them no property to read; **the ADs cooperated to produce the duplication.**

The deeper version: `EXPERIENCE.md` §8's three tempos (Held / Passed / Traversed) are a *Client-granularity* derivation — `dwellTempo` is a Client property derived from the count of Deep Projects in its system (§5.3). AD-3's list says "dwell tempo" without saying at what granularity, and the Capability Map routes FR-18 to `derive/dwell.ts`. A developer implementing §5.3 must know whether the artifact carries `dwellTempo` on Clients or on Projects — and the ratified answer (Clients, per `.memlog.md` line 13, which **amends the PRD**) is nowhere in the spine.

**Close it — tighten AD-3 with a completeness clause:**
> The artifact schema (AD-14) is **complete**: if a renderer needs a value it does not carry, the correct action is to extend the emitter, and computing it locally is a violation regardless of how simple the computation is. **"Simple enough to inline" is not an exemption** — a ratio applied in two renderers is two implementations of one rule. Derived properties are emitted **at the granularity the ratified behaviour uses**: `dwellTempo` on Clients (per the Clients-only Rail, which amends FR-18), not on Projects.

---

## F8 [HIGH] — The Fallback's URL fragments and the scene's URL fragments are two ID namespaces

**The hole.** AD-5 says "URL fragment" is one of the reference forms that must name an entity ID. The Consistency Conventions say IDs are "stable, derived from authored content." **Neither says the derivation is single-valued or where it happens.**

**Unit A — Story: "Fallback anchors and in-page navigation"** (`render-fallback/`). The shipped mock uses `#r-sncf-referential`, `#r-02a`, `#r-02b`. The developer builds anchors from those — human-readable slugs, because they are visible in the URL bar of a document a person might link into. Lawful: derived from authored content, non-positional, stable.

**Unit B — Story: "Deep-link to a Focused Project in the scene"** (`shell/`). FR-24 shareability and §4.7's "return to the stop it was left at" both want addressable state. He uses the artifact's `id`. If `derive/` generated IDs as content hashes, or as `client-project` composites, or preserved an authored `id` field — the spine does not say which — his fragment is `#sncf-referential` or `#a3f9c2` or something else.

**The incompatibility.** `https://…/#r-sncf-referential` opens the right entry on the Fallback and resolves to nothing in the scene, or vice versa. Since the Fallback is *one click from the scene* (§4.6) and is the surface The Forward lands on (SM-1), the shared-link case — the product's primary success metric — is exactly the one that breaks. And AD-5 is satisfied by both: both name an entity ID; they are just not the *same* entity ID.

Compounding: the Fallback mock's `#r-02a` is a **positional** slug (project A of client 02), which the Consistency Conventions forbid ("never positional") — but that rule sits in a conventions table, not in an AD, and conventions tables lose to shipped mocks.

**Close it — tighten AD-5:**
> Entity IDs are generated **once, in `derive/`**, by a single documented function, and are emitted in the artifact. **No surface derives, slugifies, prefixes, or transforms an ID.** The URL fragment for an entity is its artifact ID verbatim on every surface, so a link shared from the Fallback opens the same entity in the scene and the reverse. The ID generation function's output is covered by AD-2's determinism test.

---

## F9 [HIGH] — Nothing governs the streaming boundary, and §5.6 requires one

**The gap between ADs.** `EXPERIENCE.md` §5.6 is ratified: "the first Schematic frame is the first thing the visitor sees. Everything else — full Dust density, remaining Bodies, the complete Rail — **streams in behind it**. Streaming must never be visible as popping." AD-1 removes the *solve* from First Paint. AD-6 and AD-7 govern *chunk* loading. **No AD governs progressive rendering of the artifact's contents.** The territory between "the chunk arrived" and "the scene is complete" is unowned.

**Unit A — Story: "First Paint scene bootstrap"** (`render-scene/`). Renders the opening Shot's framed subjects first, then adds remaining Bodies over subsequent frames, fading each up the stroke ladder per §5.6. To know *which* bodies are in the opening frame he needs the opening Shot's frustum — which is derived (`derive/shots.ts`) — so he asks for a `firstPaintSet` in the artifact. Reasonable.

**Unit B — Story: "Destination index"** (`shell/index-nav.tsx`). §11.1 P1 is explicit: the index "**exists in the document from First Paint**" and lists every destination. It does not stream. Correct — an index that grows as bodies arrive would move focusable elements under a keyboard user, which is the exact failure AD-4 exists to prevent.

**The incompatibility.** For a window of several hundred milliseconds, the index lists destinations that have no rendered Body. A keyboard user tabbing immediately (a real behaviour — it is how a screen-reader user orients) activates an entry, the state machine sets `focusedProjectId`, and the camera flies to a Body that is not in the scene yet. AD-4 says "the camera reacts to DOM focus" — it does, faithfully, to a phantom. Unit B has no way to know Unit A is still streaming, because **AD-4 forbids the index from reading render state**, which is right, and no AD provides the alternative channel.

Note also that §5.6's streaming and AD-1's "the browser receives geometry rather than a physics problem" are in mild tension: with ~15–16 bodies and a pre-solved layout, there is nothing meaningful to stream. Either §5.6 is obsolete under AD-1 (likely, and worth stating) or it is a real requirement and needs an owner.

**Close it — AD-19 (new): Scene completeness is a state, not an assumption.**
> With the layout pre-solved (AD-1) and ~16 Bodies, the scene renders **complete on first frame**; §5.6's streaming provision is superseded for M2 and no progressive-arrival path is built. If streaming is later reintroduced, the store (AD-16) gains a `sceneReady: boolean` written only by `render-scene/` and read by `shell/` to defer camera reaction — the index itself still never reads render state; the *state machine* mediates. **The index is complete from First Paint in either case.**

---

# MEDIUM

## F10 [MEDIUM] — AD-8's "Mobile always routes to the Fallback" has no definition of mobile, and two units will define it differently

**The hole.** AD-8 states the rule; `detect()` is specified as "tests WebGL2 context creation only." Mobile detection is a *second* test the AD mandates and does not specify.

**Unit A — `shell/entry.ts`.** Uses `navigator.maxTouchPoints > 0`. An iPad and a touchscreen Windows laptop route to the Fallback. Defensible — §7.4 says "touch devices receive the Fallback."

**Unit B — a later story adding the "return to the scene" affordance** (§4.6: the Fallback is never a lesser destination; §5.1: "Return to the scene if the machine can run it"). This developer needs the same predicate to decide whether to *show* the return affordance. He uses a viewport-width check, because that is what he has in CSS. The touchscreen laptop is routed away by A and offered a return by B; the small-window desktop (which §10 explicitly says must get the scene) is offered no return by B though A gave it the scene.

**Close it:** AD-8 gains — *`detect()` returns a single frozen capability object `{ webgl2, isMobile, reducedMotion }` computed once in `entry.ts` and published to the store. No other module re-tests capability by any means, including CSS media queries used as logic. `isMobile`'s predicate is defined in one function and stated in the Colophon.* Note `EXPERIENCE.md` §10's ratified assumption — window size is **not** a capability signal — must be honoured by that predicate.

## F11 [MEDIUM] — AD-4's "generated from the layout artifact" contradicts §11.1 P1's "populated from the same JSON that seeds the simulation"

Two source documents name two sources for one component. Under AD-3+AD-13 the artifact is correct and P1's phrasing is loose — but P1 is the *ratified a11y precondition*, and a developer reading UX first will import `career.json` into `index-nav.tsx`, which F5 shows is currently lawful. **Close it:** state the reconciliation in AD-4 explicitly — *"the artifact, not `career.json`; EXPERIENCE.md §11.1 P1's wording predates AD-3 and is superseded on this point."* Cheap, and it stops one developer from being right in the wrong document.

## F12 [MEDIUM] — Unresolved tension: AD-1 (build-time solve, committed) vs. AD-11 (validation is a build gate)

Not a contradiction, but a gap in ordering. The Deployment section says `validate → derive+solve (deliberate) → vite build`, and `.memlog.md` line 50 says a build that **skips step 2 uses the committed artifact** — "normal and correct." So the common path is: validate `career.json`, skip the solve, build against a **possibly stale artifact**. Nothing verifies the committed artifact corresponds to the current `career.json`. Add an entry to `career.json`, forget to re-solve, and the build succeeds while the new Project exists in the Colophon's raw JSON and in nothing else — silently failing UJ-4's entire promise, on the exact operation UJ-4 describes.

**Close it — AD-20 (new):** *The artifact carries a `sourceHash` of the validated `career.json`. `vite build` fails if it does not match. Re-solving stays deliberate; **building on a stale artifact does not.*** This also subsumes the spine's own Open Question on `preview.png` drift: extend the same hash check to the committed preview as a warning.

## F13 [MEDIUM] — Unresolved tension: AD-3's "no conditional on a raw content field" vs. the panel's content rendering

The panel renders `notable` prose, the field table, the Client kicker (§4.5) — all raw content fields, and §4.5's Shallow rule requires *"the reading position holds a Notable on a Deep Project and the editorial rule line on a Shallow one."* That is a conditional, in a renderer, whose branch depends on content. It is lawful **only** if written as `if (body.isDeep)` and not `if (body.notable)`, and AD-3 says exactly that — but AD-3's framing ("resolved in the emitted artifact," "no renderer contains a classification test") reads to a careful developer as *prose does not belong in a layout artifact at all*, which pushes him back to `career.json`. **Close it:** AD-14's schema states that the artifact carries **content as well as layout** — the artifact is the renderers' complete input, prose included — and AD-3 adds *"reading a derived boolean to select a content block is not a classification test; recomputing that boolean is."*

---

# LOW

- **F14 [LOW] — The dependency graph is acyclic, but the AD-13 diagram omits two real edges.** `shell/ → tokens/` and `render-*/ → tokens/` are not drawn, nor is `colophon/` present at all despite owning the only lawful `data/` import (F4/F5). Neither omission introduces a cycle — `tokens/` depends only on `DESIGN.md`, and `colophon/` is a leaf — so **the acyclicity claim holds**. The diagram should still be completed, because the missing `colophon/` node is what let F4's chunk ambiguity survive. Also worth noting: the *paradigm* diagram draws `E → H` (index → camera) and `H -.-> F` labelled "reads, never writes," while AD-4 says "nothing depends on the camera" — the dashed arrow's direction implies the scene depends on the camera. It is a drawing artifact, not a real cycle, but it reads as one.
- **F15 [LOW] — "Re-solving is a deliberate, explicit act" (AD-1) has no named mechanism.** Two units will invent `npm run solve` and a `--force` flag on `npm run build`. Name one.
- **F16 [LOW] — `weight` semantics (spine Open Question) is a genuine AD-2 determinism hazard, not just a modelling choice.** If `weight` becomes a force parameter, it enters the iterative solve and its float accumulation order matters; as a post-solve transform it does not. The Open Question notes it "affects AD-2's determinism surface" and then defers it to when `solve.ts` is written — which is when a developer will pick the easier one under time pressure. Recommend pre-deciding **post-solve transform**, which keeps the determinism surface minimal and makes `weight` re-tunable without a re-solve.

---

# AD-by-AD contradiction check

| Pair | Status |
|---|---|
| AD-1 ↔ AD-7 (solver ships in bundle) | **No contradiction** — AD-7's isolation is what makes them compatible. But see F4: AD-7's "three lazy chunks" list omits `colophon/`, which is an omission, not a conflict. |
| AD-1 ↔ AD-11 | Ordering gap, not contradiction — **F12**. |
| AD-3 ↔ AD-12 | Overlap without conflict, but the px→world transform falls between them — **F6**. |
| AD-3 ↔ §4.5 panel content | Apparent conflict, resolvable by wording — **F13**. |
| AD-4 ↔ AD-9 | Compatible: AD-4 says camera reacts to DOM focus, AD-9 says both subscribe to the store. The chain (DOM focus → event → store → camera) satisfies both. Worth stating, since AD-4's literal "the camera reacts to DOM focus" invites a direct DOM→camera wire that AD-9 forbids. |
| AD-4 ↔ EXPERIENCE §11.1 P1 | Source conflict — **F11**. |
| AD-6 ↔ AD-8 | Compatible and mutually reinforcing. |
| AD-8 ↔ NFR-3 / §10 | Compatible — "quality holds, frames drop" and "offer, never force" agree. |
| AD-9 ↔ EXPERIENCE §5.1 / §7.1a | **State shape insufficient** — F3. Not a contradiction; an under-specification that forces one. |
| AD-10 ↔ AD-9 | Compatible. AD-10 is a corollary of AD-9 and could arguably be folded in; keeping it separate is defensible given UJ-2's stakes. |
| AD-13 ↔ AD-7 | **Tension** — AD-13 requires the Colophon to render the raw JSON; AD-7 forbids the entry path from importing it. Resolved by making `colophon/` a chunk — **F4**. |

**Acyclicity: confirmed.** `data/ → derive/ → artifact → {shell/, render-scene/, render-fallback/, colophon/}`, with `tokens/` a parallel leaf from `DESIGN.md`, and camera a terminal subscriber. No back-edge exists once F4's `colophon/ → data/` is declared (it is `derive/`-parallel, not `derive/`-dependent) and F9's `sceneReady` is routed through the store rather than read directly.

---

# Summary of proposed ADs

| ID | Closes | One line |
|---|---|---|
| **AD-14** | F1, F13 | The layout artifact has a versioned, build-gated schema and carries every property every surface needs — content included. |
| **AD-15** | F2 | One emitted `destinations` list; DOM index and raycast address it identically, with equal cardinality. |
| **AD-16** | F3 | Store shape complete for §5.1's five states (`currentClientId`, `focusOrigin` stored, not derived); one writer per field; camera interpolation stays camera-local. |
| **AD-17** | F4 | `colophon/` is a fourth chunk and the sole non-`derive/` importer of `career.json`; the live re-solve is display-only and makes no reproduction claim. |
| **AD-19** | F9 | Scene is complete on first frame at M2; §5.6 streaming superseded; index complete from First Paint regardless. |
| **AD-20** | F12 | The artifact carries a `sourceHash`; the build fails on a stale artifact. |
| *tighten* **AD-3** | F1, F5, F7 | Ban `data/` imports outside `derive/` (not just `render-*/`); ban reshaping the artifact; add a completeness obligation with granularity. |
| *tighten* **AD-5** | F8 | IDs generated once in `derive/`; no surface slugifies; the fragment is the ID verbatim everywhere. |
| *tighten* **AD-8** | F10 | One frozen capability object from `entry.ts`; `isMobile` has exactly one predicate. |
| *tighten* **AD-12** | F6 | Unit-and-theme contract per token; dual representation where domains differ; one theme-selection mechanism. |
| *tighten* **AD-2** | F4 | Determinism is scoped to the build environment; state it, so the Colophon cannot imply a cross-engine guarantee. |
| *tighten* **AD-4** | F11 | Source is the artifact; EXPERIENCE §11.1 P1's "same JSON" is superseded on this point. |

**The single highest-leverage fix is AD-14.** F1, F2, F7, F8, F9, and F13 all reduce to "the shared object has no declared shape." Writing that schema before either renderer story starts closes six findings at once.
