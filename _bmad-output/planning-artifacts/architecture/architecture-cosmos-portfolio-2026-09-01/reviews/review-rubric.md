---
title: "Rubric Review — ARCHITECTURE-SPINE.md (Cosmos Portfolio)"
reviewer: rubric-walking architecture reviewer
target: ../ARCHITECTURE-SPINE.md
inputs:
  - ../../../prds/prd-cosmos-portfolio-2026-09-01/prd.md
  - ../../../ux-designs/ux-cosmos-portfolio-2026-09-01/EXPERIENCE.md
  - ../../../ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md
  - ../.memlog.md
date: 2026-09-01
verdict: revise — strong spine, four blocking gaps
---

# Rubric Review — Architecture Spine, Cosmos Portfolio

## Verdict

**Revise.** This is a genuinely good spine — better than most at this altitude. The
paradigm is real (not a slogan), it converts three product constraints into
structural properties rather than ongoing discipline, and roughly two-thirds of the
ADs carry rules that are mechanically checkable. AD-3, AD-7, AD-11 and AD-12 are
model examples of enforceable invariants.

But it fails the rubric in four places that matter, and one of them is structural:
**the single most consequential UX ratification — the Clients-only Rail — never
reached this document.** Epics written from this spine will encode the wrong
navigational granularity. Three of eight version pins are stale despite an explicit
"verified current" claim, one of them by a full major version. Two dimensions the
feature altitude owns are silent. And the vocabulary row does not do what it claims.

Scores by rubric criterion:

| # | Criterion | Result |
|---|---|---|
| 1 | Fixes the real divergence points, misses none | **FAIL** — Clients-only Rail missing; routing/URL unowned |
| 2 | Every AD's Rule is enforceable | **PARTIAL** — AD-1, AD-4, AD-8 have unenforceable clauses |
| 3 | Nothing Deferred could let two units diverge | **PARTIAL** — two deferrals are divergence-capable |
| 4 | Named tech verified-current | **FAIL** — 3 of 8 pins stale; drei wrong by a major |
| 5 | Every owned dimension decided/deferred/open | **PARTIAL** — routing and quality-gate envelope silent |
| 6 | Vocabulary discipline as claimed | **PARTIAL** — enumeration incomplete, imports un-glossaried terms |

Operational envelope (criterion 5's named special case) is **PASS** — the
Deployment & environments section is present, decided, and correctly scoped. That is
the failure mode this criterion usually catches, and this spine avoids it.

---

## Criterion 1 — Does it fix the real divergence points for epics/stories?

### [CRITICAL] C1-1. The Clients-only Rail is absent from the spine entirely

This is the finding that most threatens downstream work.

EXPERIENCE.md §2 ratifies, in bold, as "the structural decision the rest of this
document follows from":

> **Ratified: the Rail visits Clients only, ~5–6 stops.** Not ~15–16. It does not
> stop at Projects.

It then names three consequences it says "must be honoured": FR-17a is amended in
effect, FR-18's derived Dwell moves up a level to Client granularity, and the
Client-stop framing carries the entire selectivity burden.

The spine mentions none of this. A search for `client-only`, `client stop`,
`client granularity`, or `5–6` across ARCHITECTURE-SPINE.md returns **one** hit, and
it is a code comment in the Structural Seed:

```
dwell.ts             #   client-granularity tempo
```

A comment in a directory listing is not an invariant. It binds nothing, prevents
nothing, and is the first thing to be silently contradicted when `dwell.ts` is
actually written.

Meanwhile the spine's actual normative statements point the other way:

- **AD-9's state shape** is `{ mode, focusedProjectId, railPosition }`. `railPosition`
  is untyped as to what it indexes. Under Clients-only it indexes ~5–6 Client stops;
  a reader who has only this document will reasonably index ~15–16 Bodies, because
  nothing here says otherwise and the PRD (which the spine cites as a source) says
  the Rail visits Bodies.
- **The Capability Map** row reads `FR-16..FR-19 rails, dwell, free flight` with no
  granularity note, and FR-18's PRD text — which the spine does not amend — says
  Dwell derives per-Project from Notable presence. EXPERIENCE.md says that is
  impossible under the ratified Rail.
- **AD-5** requires every destination reference to name an entity ID, which is
  correct and necessary, but says nothing about the *Rail* addressing a strictly
  smaller set (Clients) than the *destination index* (Clients **and** Projects).
  That asymmetry is exactly the kind of thing two epics will resolve differently.

**Why this is CRITICAL rather than HIGH.** The spine's stated job is to fix the
divergence points for the level below. Rail granularity is not a detail — it
determines the shape of `derive/shots.ts`, the shape of `derive/dwell.ts`, what
`railPosition` means, how many Shots exist, and whether FR-17a is satisfied by a
per-Project Shot or by Client-system framing. Two epics written a week apart from
this document will disagree, and the disagreement will not surface until the camera
is built. EXPERIENCE.md even flags this as a "STRUCTURAL DEVIATION FROM THE PRD —
read this before building" in §9.2. The spine read that file (it is in `sources`)
and did not carry the deviation forward.

**Fix.** Add an AD. Suggested shape:

> ### AD-14 — The Rail addresses Clients; the index addresses everything
>
> - **Binds:** FR-16, FR-17a, FR-18, FR-19, EXPERIENCE.md §2, §5.3, §9.2
> - **Prevents:** Two epics encoding different Rail granularity; `railPosition`
>   indexing Bodies in one module and Client stops in another; Dwell being derived
>   per-Project, which is impossible when the Rail never stops at a Project.
> - **Rule:** The Rail is an ordered sequence of **Client stops only** (~5–6),
>   never Projects. `railPosition` indexes that sequence and nothing else. A Client
>   stop's Shot must frame the Client's entire system including its widest-orbit
>   Project — a Project framed out of shot is unreachable from the Rail, which is
>   the testable form of FR-17a under this amendment. Dwell derives at **Client**
>   granularity (AD-3). The destination index (AD-4) addresses the strictly larger
>   set — every Client *and* every Project — and this asymmetry is deliberate.

Also add a line to the Capability Map and note in the header that FR-17a and FR-18
are consumed **as amended by EXPERIENCE.md §2**, not as written in the PRD.

### [HIGH] C1-2. Routing, URL state, and history are unowned

AD-5's rule enumerates destination references and includes "URL fragment":

> Every destination reference — index entry, Shot subject, raycast hit, focus
> target, **URL fragment** — names an entity ID.

That is the only appearance of URL, fragment, history, or router anywhere in the
spine. No AD owns them. Yet the product demonstrably needs a routing story:

- EXPERIENCE.md §2 defines **four surfaces**, of which three are independently
  reachable: the scene, the Fallback ("one click from the scene, at any time"), and
  the Colophon ("a persistent route from both scene and Fallback").
- EXPERIENCE.md §4.7 specifies a **return contract**: "the scene resumes at the stop
  it was left at, not at First Paint. A visitor who inspects the model and is
  returned to the beginning of the journey has been punished for looking."
- EXPERIENCE.md §2 explicitly states the panel is **"Not addressable on its own"** —
  a routing decision, stated in UX, unrecorded in architecture.
- FR-24 requires a shareable link; the spine handles `og:image` but not what the URL
  space looks like.

Open questions this leaves for two epics to answer differently: Is the Colophon a
route, a separate HTML entry, or a client-side view? Does the browser Back button
work, and if so against what? Does Focus push history? How is "resume at the stop
you left" persisted across a Colophon round-trip — in-memory state, `sessionStorage`,
or the URL? Does the Fallback have its own URL a visitor can bookmark?

Note this interacts with AD-7. If the Colophon is a client-side route inside the
single Vite app, then the entry module must know about it — but AD-7 says
`src/shell/entry` "contains no React and no Three" and names exactly three lazy
chunks (`render-scene`, `render-fallback`, `solver`). The Colophon appears in the
Structural Seed as `colophon/` but is not one of AD-7's three chunks. Is the
Colophon a fourth chunk? A separate page? AD-7's rule is enforceable but its chunk
list appears incomplete.

**Fix.** Add an AD owning URL/route shape, or record it as an explicit Open
Question. Either is acceptable under criterion 5; silence is not.

### C1-3. Divergence points the spine gets right — credit where due

For balance, these are real and well-handled:

- **AD-3** catches the highest-value divergence in the product, and its worked
  example (`notable != null` vs `!== ""` on an empty string, unnoticed because
  nobody views both surfaces at once) is exactly the reasoning this altitude is for.
- **AD-11** catches the data model's most dangerous failure — `notabel` silently
  flipping a Deep Project to Shallow — and its "reject unknown fields, not merely
  check known ones" is the precise, checkable form.
- **AD-6** correctly strengthens FR-22 from "detect before render" to "detect before
  *fetch*", with the ~1MB consequence spelled out. That is a genuine improvement on
  the PRD, not a restatement.
- **AD-10** is tightly scoped to one bug and names the wrong implementation
  (event-target inspection) it exists to forbid.
- **The collision rule** (EXPERIENCE.md §4.3, flagged there as "the single rule most
  likely to be lost in implementation") is arguably a visual concern and its absence
  here is defensible — DESIGN.md and EXPERIENCE.md both carry it. Not counted as a
  finding, but worth a cross-reference line.

---

## Criterion 2 — Is every AD's Rule enforceable?

Assessment per AD. "Enforceable" = a reviewer or a tool can decide violation without
appeal to intent.

| AD | Enforceable? | Note |
|---|---|---|
| AD-1 | **Partial** | Sentence 3 is a wish — see C2-1 |
| AD-2 | **Yes** | Byte-identical assertion + named regression test |
| AD-3 | **Yes** | Greppable import ban; property list is closed |
| AD-4 | **Partial** | "Nothing depends on the camera" is unenforceable as written — C2-2 |
| AD-5 | **Yes** | Type-checkable if IDs are a branded type |
| AD-6 | **Yes** | "not a React component", "before any dynamic import resolves" |
| AD-7 | **Yes** | Static-import ban is lint-checkable; chunk list may be incomplete (C1-2) |
| AD-8 | **Partial** | "Mobile always routes to Fallback" has no definition of mobile — C2-3 |
| AD-9 | **Yes** | State shape is explicit; "all transitions are named events" is checkable |
| AD-10 | **Yes** | Names the forbidden mechanism, not just the desired outcome |
| AD-11 | **Yes** | "build fails on violation"; "reject unknown fields" |
| AD-12 | **Yes** | "neither is hand-transcribed"; "no colour or type value written literally" |
| AD-13 | **Yes** | Banner requirement + "never hand-edited" |

### [MEDIUM] C2-1. AD-1's third sentence is a wish, not a constraint

> Re-solving is a deliberate, explicit act — never a side effect of building.

The first two sentences are enforceable (the solver runs at build time; the runtime
scene never solves — the latter is enforced structurally by AD-7's static-import
ban). The third is not. Nothing states *what makes it deliberate*. The memlog is
more precise than the spine here: it says step 2 "must be re-runnable independently
and its output committed. A build that skips step 2 uses the committed artifact."
That is a checkable rule and it did not survive into the spine.

**Fix.** State the mechanism: `npm run build` must **not** invoke the solver;
re-solving is a separate script (`npm run solve`) whose output is committed. Then
the rule is violable by inspecting one line of `package.json`.

This matters more than it looks, because AD-2's determinism guarantee and the Open
Question about `preview.png` drift both assume the solve is *not* running on every
build. If a future contributor wires `solve` into `build` for convenience, AD-1 is
broken with no test failing.

### [MEDIUM] C2-2. AD-4's "Nothing in the system depends on the camera" is unenforceable

The rest of AD-4 is strong and mechanically checkable: the index never reads render
state, never re-projects, never moves with the camera; the canvas is `aria-hidden`;
the camera reacts to DOM focus and never the reverse.

The closing sentence is a global negative over an unbounded system. It cannot be
checked in review, and it is also *not quite true as stated* — the spine's own
memlog records the accepted cost that "pointer hover still requires raycasting
against the 3D scene (you cannot hover a Body by hovering a list)." Raycasting is
a camera-dependent operation. AD-5 is what actually resolves this (both paths
address by entity ID), so the system is sound; the sentence overstates it.

**Fix.** Replace with the checkable form: "No module outside `render-scene/` reads
camera state. The raycast path (AD-5) resolves to an entity ID before crossing that
boundary." That is greppable and it is what is actually meant.

### [MEDIUM] C2-3. AD-8's "Mobile always routes to the Fallback" has no definition of mobile

AD-8 is otherwise excellent — the capability/performance split is the right call and
the reduced-motion independence axis is correctly carried from EXPERIENCE.md §11.2.

But `detect()` is specified precisely for capability ("tests WebGL2 context creation
only") and left entirely unspecified for mobile. User-agent sniffing? Pointer
coarseness (`pointer: coarse`)? Touch capability? Viewport width? These give
different answers, and two of them give the *wrong* answer for cases the UX
explicitly rules on:

- EXPERIENCE.md §10 assumption E-A10: "A small-window desktop visitor gets the scene
  with a narrower panel, not the Fallback, because **window size is not a capability
  signal**." A viewport-width implementation violates a ratified UX position.
- EXPERIENCE.md E-G2 flags "what a capable tablet receives" as a genuine open gap. A
  touch-capability implementation silently answers it (tablet → Fallback); a UA
  implementation may answer it differently. The spine should either decide this or
  name it open — it does neither.

Note the spine's Open Questions list has three entries and this is not among them,
while EXPERIENCE.md carries it as E-G2, one of its highest-flagged gaps.

**Fix.** Either specify the mobile test, or add it to Open Questions with the
tablet case named. Given E-A10, `pointer: coarse` plus no-hover is the likely answer
and it needs stating either way.

---

## Criterion 3 — Could anything under Deferred let two units diverge?

Six of eight deferrals are clean. Two are not.

### [HIGH] C3-1. "Testing beyond the pipeline" defers the quality gate itself

> **Testing beyond the pipeline.** Derivations are pure and unit-tested; determinism
> has a regression test; the Fallback's semantics are checkable. Scene correctness is
> perceptual and is tested by looking at it at M1, per the PRD's own plan.

The reasoning about *scene* testing is correct and well-argued. The problem is what
this bullet quietly takes with it. The spine names **no** test runner, **no** linter,
and **no** CI quality gate anywhere — `vitest`, `eslint`, and `lint` return zero hits
across the document. Yet the spine's own enforcement model depends on tooling that
does not exist:

- AD-3's load-bearing constraint is "**No module under `src/render-*/` may import
  from `src/data/`**". The memlog calls this "that single greppable constraint" and
  explicitly notes the discipline "erodes under pressure. It needs to be
  **enforceable**." Greppable is not enforced. This wants an ESLint
  `no-restricted-imports` rule or a dependency-cruiser config, and nothing says so.
- AD-7's "Nothing on the critical entry path may statically import the scene, the
  solver, or the raw career JSON" has the same shape and the same gap.
- AD-2 names a determinism regression test but not what runs it.
- AD-11 says the build fails on schema violation — this one *is* self-enforcing,
  correctly.

So the spine's two most important structural rules are enforced by nothing but
reviewer memory, in a single-maintainer project where the reviewer is the author, on
a codebase he will return to in 2029. That is precisely the rot the whole document
is built to prevent.

**Why this is divergence-capable.** One epic adds a lint rule with one severity and
one path glob; another adds a different one; a third adds none and imports from
`data/` in `render-fallback/` because it was locally easier. The AD-3 violation is
invisible until the two renderers disagree — which, by AD-3's own argument, nobody
notices because nobody views both surfaces at once.

**Fix.** Move the boundary-enforcement mechanism out of Deferred and into AD-3 and
AD-7 as an explicit clause, or add a Consistency Conventions row naming the tool.
The *scene* testing deferral is fine and should stay.

### [MEDIUM] C3-2. "Content authoring tooling" is fine; "Fallback visual layout" is borderline

> **Fallback visual layout.** Ratified in UX (time-as-axis, transposing on phone) and
> drafted as a mock. No architectural call remains beyond AD-3's shared derivation.

This is *mostly* right — AD-3 does cover the derivation, and DESIGN.md owns the
visual. But EXPERIENCE.md §4.6 states the Fallback "Carries the Deep/Shallow signal
via the **Ring alone** — there is no 3D Moon on a flat chart." That is a real
renderer asymmetry: the two renderers consume the *same* derived `isDeep` but express
it through a **different number of channels** (scene: Moon + Ring; Fallback: Ring).

AD-3 guarantees they agree on *whether* a Project is Deep. It does not say the
expression may legitimately differ per renderer, and FR-22's "content parity" plus
AD-3's framing ("neither one interprets the source data") could be read as requiring
identical treatment. A story author could reasonably build a Moon into the flat chart
to satisfy parity, or could strip the Ring from the scene for symmetry — both wrong.

**Fix.** One clause in AD-3: "Content parity is parity of *derived values*, not of
visual channels. A renderer may express a derived property through fewer channels
than its sibling where its medium requires (the Fallback carries `isDeep` via Ring
alone); it may never *compute* the property differently."

### Deferrals that are correctly clean

M3 realism pass, M4 collapse, dwell/condensation/dust numbers, free-flight
interpolation, analytics. Each names why no architectural call is needed and each is
genuinely value-only or post-launch. The analytics deferral is especially well
reasoned — it ties the exclusion to NFR-6 and the SM-C1 counter-metric rather than
just saying "later."

---

## Criterion 4 — Is named tech verified-current?

The Stack section opens with an explicit claim:

> Verified current 2026-09-01. Pin exact versions; stay off the R3F v10 / drei v11
> alpha line.

Verified against the npm registry today, 2026-09-01:

| Named | Spine says | Actual latest | Status |
|---|---|---|---|
| @react-three/drei | **9.x** (stable — not v11 alpha) | **10.7.8** | **WRONG — off by a major** |
| Vite | **7.x** | **8.2.2** | **STALE** |
| Node (build only) | **22 LTS** | 22 is **Maintenance**; **24** is Active LTS | **STALE** |
| React | 19.x | 19.2.8 | OK |
| @react-three/fiber | 9.7.x | 9.7.0 latest; alpha is 10.0.0-alpha.4 | OK |
| d3-force-3d | 3.0.6 | 3.0.6 | OK |
| zustand | 5.x | R3F 9.7.0 depends on `^5.0.3` | OK |
| three | "latest compatible with R3F 9" | R3F 9 peer: `>=0.156` | Vague but not wrong |

### [HIGH] C4-1. drei is pinned a full major version behind, and the stated reason is wrong

The spine pins `@react-three/drei` at **9.x** and justifies it as "stable — **not**
v11 alpha." But the drei dist-tags today are:

```
latest: 10.7.8
rc:     10.0.0-rc.3
alpha:  11.0.0-alpha.6
beta:   9.0.0-beta.6
```

**drei 10.7.8 is the current stable release**, and its peer dependencies are exactly
this stack:

```
react:              ^19
three:              >=0.159
@react-three/fiber: ^9.0.0
```

So drei 10 is *the* stable pairing for R3F 9 + React 19. The spine's own reasoning
supports drei 10 and lands on drei 9 anyway. The error looks like a false symmetry
with R3F: R3F's stable is 9 and its alpha is 10, so the spine appears to have assumed
drei's stable must also be 9 and its alpha 11 — but drei's major line runs one ahead
of R3F's. The memlog entry that verified R3F ("@react-three/fiber stable is v9.7.x,
pairs with React 19... R3F v10 alpha and drei v11 alpha exist — AVOID") checked R3F
carefully and inferred drei rather than checking it.

**Consequence if built as written.** Installing drei 9 against R3F 9.7 + React 19
will produce peer-dependency conflicts (drei 9's peers target R3F 8 / React 18), and
drei 9 will be roughly two years stale on a project whose maintenance claim (NFR-5,
UJ-4) is that it stays healthy for a decade.

**Fix.** `@react-three/drei` → **10.x** (currently 10.7.8), stable, not the 11 alpha.
The "stay off the alpha line" guidance is right; only the number is wrong.

### [MEDIUM] C4-2. Vite 7 and Node 22 are both one cycle stale

- **Vite** latest is **8.2.2**. Vite 8 requires Node `^20.19.0 || >=22.12.0`, so it
  is compatible with the project's other choices. Pinning 7 on a greenfield project
  started today means starting one major behind.
- **Node 22** entered **Maintenance LTS** and **Node 24** is the current Active LTS
  (LTS start 2025-10-28, EOL 2028-04-30). Node 26 exists but does not enter Active
  LTS until 2026-10-28, so 24 is the correct choice today. For a build-only
  dependency this is low-severity, but "22 LTS" reads as a current recommendation
  and is not one.

**Fix.** Vite → 8.x. Node → 24 LTS.

### C4-3. `three` is under-pinned against the section's own instruction

The section says "**Pin exact versions**" and then lists three as "latest compatible
with R3F 9." That is a lookup instruction, not a pin, and it is the one dependency
where drift is most likely to break silently (three's minor releases routinely make
breaking material/renderer changes). R3F 9.7's peer range is `>=0.156` — wide open on
the upper end. Low severity, but the section contradicts itself.

---

## Criterion 5 — Is every dimension the altitude owns decided, deferred, or open?

### Operational / environmental envelope — PASS

This is the criterion's named special case and the usual failure. This spine does
**not** fail it. `### Deployment & environments` is present and decides, concretely:

- Build pipeline order, with the deliberate-solve step called out
- Host class (any static file host, four named candidates)
- Explicit absences: no Node process, no serverless function, no database, no env
  vars, no secrets — tied to NFR-6, "at any milestone"
- Environments: production only, **with a reason** ("A personal portfolio has no
  reader for a staging tier") — a deferral with a rationale, not a silence
- Rollback: redeploy a previous commit
- Config: a Consistency Conventions row explicitly stating "None," with reasoning

The host choice is correctly parked in Open Questions as preference-not-architecture.
This section is a model of proportionate operational scoping for a static personal
site — sized to the project rather than to a template.

### Dimensions that ARE silent

**[HIGH] C5-1. Routing / URL / history** — covered fully at C1-2. Genuinely silent,
genuinely owned by this altitude, and needed by three reachable surfaces plus a
stated return contract.

**[HIGH] C5-2. Quality gates / lint / CI enforcement** — covered at C3-1. The spine
mentions CI only inside the deployment mermaid diagram (`CI: npm run build`). No
linter, no test runner, no boundary enforcement, no pre-commit. Since AD-3 and AD-7
are *defined* in terms of import restrictions, the tooling that checks them is part
of the architecture, not an implementation detail.

**[MEDIUM] C5-3. Browser support baseline** — nothing states target browsers or
whether any transpilation/polyfill floor applies. Normally trivial, but here the
entry module is hand-written plain JS that runs **before** any bundled chunk (AD-6),
so its syntax floor is a real decision: it must parse on the oldest browser in scope,
including whatever runs on the corporate laptops NFR-4 names. AD-6 and AD-7 make this
architectural rather than incidental.

**[LOW] C5-4. `preview.png` generation ownership** — the Open Question covers *drift
detection* well, but no AD or convention states who generates the image, from what,
or that it is a committed manual artifact. The memlog has this (rendered once from
the real browser scene, committed, regenerated deliberately); the spine records only
the drift question, not the decision it followed from. The Capability Map row for
FR-24 points at `public/preview.png` governed by AD-1, but AD-1 says nothing about
images.

### Dimensions correctly covered

Data model and derivation (AD-3, AD-11, AD-13); rendering split (AD-6, AD-7, AD-8);
state and interaction (AD-9, AD-10); accessibility structure (AD-4, AD-5 — and these
map cleanly onto EXPERIENCE.md §11.1 P1–P4); design tokens (AD-12); build determinism
(AD-1, AD-2); error surface (Consistency Conventions row, correctly noting the
contact route as the one genuine runtime exception); dates; naming.

---

## Criterion 6 — Vocabulary discipline: does it use the PRD Glossary verbatim?

The claim, in Consistency Conventions:

> **Vocabulary** | PRD §3 Glossary verbatim — Client, Project, Skill, Body, Mote,
> Notable, Deep/Shallow Project, Weight, Focus, Condensation, Rail, Shot, Dwell,
> Colophon, Fallback, First Paint. A synonym in code or copy is a discipline
> violation. `satellite` is superseded by `Moon`.

Checked term by term against PRD §3.

### [MEDIUM] C6-1. The enumeration drops three Glossary terms

PRD §3 defines **twenty** terms. The spine's row lists **sixteen** (counting
"Deep/Shallow Project" as two). Missing:

- **Company** — PRD §3: "an intermediate consultancy... **Never a body**; an
  attribute of a Project." This is a live architectural distinction. FR-6 exists
  solely to enforce it ("Company is an attribute, never a Body") and the PRD notes
  the company↔client many-to-many "resolves as a field lookup, not a graph edge."
  FR-6 appears in the spine's `binds` frontmatter (via `FR-1..FR-6`) but appears
  **nowhere** in the Capability Map, and Company is absent from the vocabulary row.
  A term this load-bearing being dropped from a list that claims to be the Glossary
  is exactly the drift the row exists to prevent.
- **Schematic Identity** — used in the spine's own `scope` field ("the 3D Schematic
  scene") and governs FR-20, which the spine maps to `tokens/`.
- **The Forward** — the second-order visitor. Referenced in substance throughout
  (AD-6's reasoning is entirely about him, UJ-3) but never by name.

A vocabulary rule that claims to reproduce a glossary and reproduces 80% of it
teaches downstream authors that the list is approximate.

### [MEDIUM] C6-2. It imports `Moon` without glossing it, and omits `Ring`

The row ends: "`satellite` is superseded by `Moon`."

This is the right *call* — PRD FR-9's assumption used "satellite," EXPERIENCE.md §4.2
ratified "Moon + Ring," and recording the supersession is good discipline. But:

1. **`Moon` is not in the PRD Glossary.** The row says the vocabulary is "PRD §3
   Glossary verbatim" and then adds a term from a different document. The provenance
   should be stated (EXPERIENCE.md §4.2, ratified) or the row's claim narrowed.
2. **`Ring` is missing.** EXPERIENCE.md §4.2 ratifies **two** channels — "Moon +
   Ring, layered" — and §4.6 makes Ring the *sole* Deep/Shallow channel on the
   Fallback. Naming Moon and not Ring is worse than naming neither: it implies the
   supersession was one-for-one (satellite → Moon) when the ratified signal is two
   channels. This compounds C3-2 — a story author reading only this spine learns the
   Deep signal is "a Moon," builds a Moon, and has no vocabulary for the thing the
   flat chart actually needs.

**Fix.** Restore Company, Schematic Identity, and The Forward. Add Ring alongside
Moon. Attribute both to EXPERIENCE.md §4.2 rather than to PRD §3.

### C6-3. Body-text usage is clean

Setting the enumeration aside, the spine's prose uses the vocabulary correctly
throughout: Body, Mote, Notable, Deep/Shallow Project, Rail, Shot, Dwell, Focus,
Condensation, Colophon, Fallback, First Paint all appear in their Glossary senses. No
synonym drift was found — no "node," no "entity" used where "Body" is meant, no
"tooltip" for panel, no "card." The `AD-3` property list (`isDeep`, mass,
`luminanceBand`, dwell tempo, mote tier, shot framing) and the Naming convention row
("Derived properties are named for what they *are*, not their source: `isDeep`, not
`hasNotable`") are both good, and the latter is a genuinely useful invariant the PRD
did not supply.

---

## Consolidated findings

| # | Sev | Finding | Criterion |
|---|---|---|---|
| C1-1 | **CRITICAL** | Clients-only Rail absent; spine implies Project-granularity Rail, contradicting the ratified UX structural decision | 1 |
| C1-2 | **HIGH** | Routing / URL / history unowned; three reachable surfaces + a return contract need it | 1, 5 |
| C4-1 | **HIGH** | drei pinned 9.x; current stable is 10.7.8 and it is the correct R3F-9 pairing | 4 |
| C3-1 | **HIGH** | Boundary enforcement (AD-3, AD-7) has no tooling; lint/test/CI gates silent | 3, 5 |
| C4-2 | MEDIUM | Vite 7 (latest 8.2.2) and Node 22 (24 is Active LTS) both one cycle stale | 4 |
| C2-1 | MEDIUM | AD-1's "re-solving is deliberate" is a wish; no mechanism stated | 2 |
| C2-2 | MEDIUM | AD-4's "nothing depends on the camera" unenforceable and overstated vs. raycast | 2 |
| C2-3 | MEDIUM | AD-8's "mobile" undefined; interacts with ratified E-A10 and open E-G2 | 2 |
| C3-2 | MEDIUM | Renderer channel asymmetry (Moon+Ring vs Ring) not licensed by AD-3 | 3 |
| C6-1 | MEDIUM | Vocabulary row drops Company, Schematic Identity, The Forward | 6 |
| C6-2 | MEDIUM | Imports `Moon` un-attributed; omits `Ring` | 6 |
| C5-3 | MEDIUM | Browser baseline silent — matters because AD-6's entry runs pre-bundle | 5 |
| C4-3 | LOW | `three` under-pinned against the section's own "pin exact versions" | 4 |
| C5-4 | LOW | `preview.png` generation ownership unstated (only drift is recorded) | 5 |

## Recommended order of work

1. **C1-1** — add AD-14 (Rail granularity). Blocks epic decomposition; everything
   about the camera, Shots, Dwell and `railPosition` depends on it.
2. **C4-1, C4-2** — correct the three version pins. Five-minute fix, and the Stack
   section currently carries a "verified current" claim it does not honour.
3. **C3-1** — name the boundary-enforcement tooling inside AD-3 and AD-7. Without it
   the spine's two most important rules are honour-system.
4. **C1-2** — decide routing or record it as an Open Question.
5. **C2-1, C2-2, C2-3** — tighten the three soft rules into checkable form.
6. **C6-1, C6-2** — repair the vocabulary row.
7. **C3-2, C5-3, C4-3, C5-4** — clauses and one-liners.

## Closing note

None of the above touches the paradigm, which is sound and well-argued. The
build-time derivation pipeline genuinely does convert NFR-1, FR-24 and FR-22 from
disciplines into structural properties, and the acyclic dependency direction
(camera → index → layout → JSON, nothing depending on the camera) is the right spine
for this product. AD-3 and AD-11 in particular show real engagement with how *this*
data model fails rather than generic best practice.

The failures are of completeness and currency, not of judgement — with the single
exception of C1-1, where a ratified upstream decision did not cross the document
boundary. That one is worth treating as a process signal as well as a defect: the
spine cites EXPERIENCE.md as a source, and EXPERIENCE.md flagged the deviation in
bold with "read this before building." A checklist step that reconciles every
upstream **ratified** and **amended-in-effect** marker against the spine before
sign-off would have caught it.
