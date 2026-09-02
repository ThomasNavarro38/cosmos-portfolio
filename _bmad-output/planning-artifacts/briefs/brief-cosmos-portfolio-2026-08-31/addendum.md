---
title: "Addendum: Cosmos Portfolio"
status: draft
created: 2026-08-31
updated: 2026-08-31
---

# Addendum: Cosmos Portfolio

Depth captured during the brief conversation that belongs downstream — in the architecture, the schema, or the UX spec — rather than in the brief itself.

## Domain Model

Thomas works as a consultant, not a direct employee. Three distinct entity kinds, and the distinction drives the whole visual hierarchy:

| Entity | Meaning | Celestial role |
|---|---|---|
| **Company** | The intermediate consultancy that holds both the client contract and Thomas's contract. The payer. | Not a body. An attribute of the project (label / tint). |
| **Client** | The final client company where the work actually happened. | **Star.** |
| **Project** | A delivery for exactly one client. | **Planet**, orbiting its client. |
| **Skill / technology** | Capability used on one or more projects. | **Dust**, condensing on focus. |

**Relations as originally stated:**

- company ↔ client: many-to-many (a company serves 1..n clients; a client may be reached through 1..n different intermediates over time)
- client → project: one-to-many (a project has exactly **one** client)
- project ↔ skill: many-to-many

**How both many-to-many relations were dissolved.** Neither is modelled as a graph edge in the final design:

- **company ↔ client** disappears because the company stops being a body. Once the consultancy is an attribute of the project rather than a positioned object, it needs no place in space, and the relation becomes a field lookup.
- **project ↔ skill** disappears because a skill is never permanently anywhere. Condensation resolves the relation *per focus*, in time rather than in space — one skill can serve nine projects because it is only ever instantiated beside the one being looked at.

The result is a clean tree — client → project → (transient skills) — which is what lets the solar-system metaphor hold without special cases.

## Inventory Magnitude

- 2 companies (intermediates)
- ~5–6 clients
- ~10 projects
- Skills / technologies: unbounded, but not positioned

Roughly **18 primary bodies**. Consequences:

- Force-directed layout of 18 nodes settles fast and costs almost nothing at runtime.
- The performance budget is generous. The framerate constraint is a guardrail against future carelessness (post-FX stacking, texture resolution), not a live threat from body count.
- **Belt-merging of clustered small items is premature** and was demoted from the brainstorm's MUST list. There are not enough items to cluster. Revisit only if the inventory grows several-fold.

## Camera Rails — Rot Defence

Rails were chosen over three other composition strategies (see Rejected Alternatives). The critical implementation detail:

**Shots reference entity IDs plus relative framing parameters, never world coordinates.**

A shot is defined as *"frame entity `client-x` at this angle, this distance, this framing"* — not *"fly to (12, −4, 30)."*

Rationale: authored rails reintroduce exactly the rot that banning position overrides was meant to prevent. If a shot names a coordinate, then adding four entries in 2029 re-settles the simulation, the subject drifts, and the shot silently frames empty space. A bad shot throws no error — it just quietly looks worse. Entity-relative framing absorbs the drift.

**Residual risk not yet solved:** entity-relative framing fixes *what is centred* but not *what is behind it*. A shot composed against a clean background may later have another body drift into frame. Bounded by the small inventory, but worth checking at M1.

**Option worth keeping in reserve:** pinning solver history — old entries settle once and freeze, only new entries find space around them. This bounds drift to the newest additions and would make old shots valid permanently. It is seed-locking applied incrementally rather than globally.

## Skills: Condensation Mechanic

**Resting state:** diffuse interstellar dust. Always present, unresolved, everywhere. This is not only a mechanic — it also fills what would otherwise be conspicuous empty space between only 18 bodies. Eighteen objects in a void reads as sparse; eighteen objects in a medium reads as space.

**On focus:** the focused project's skills condense out of the dust into discrete orbiting bodies.

**On release:** they decay back into dust.

**Why this shape was chosen over the alternatives:**

- Nothing spawns and nothing teleports, so the realism non-negotiable survives. Physics lies read louder than material lies.
- No drawn connector lines — a network diagram in a space costume would be read as exactly that by the target audience.
- It is not a UI panel, so immersion survives.
- Arrival and departure are **the same process reversed** — one implementation, one tuning pass, guaranteed visual coherence between the two.
- It rehearses the ending. Every unfocus is a miniature version of the final collapse, so the visual language of the climax is already familiar by the time the visitor reaches it.

**Open implementation questions:** condensation and decay timing; how much dust is visible at rest without becoming fog; whether skill labels are legible only while condensed; behaviour when focus moves directly from project A to project B (cross-fade, or full decay then re-condense).

## Information Layer

**Fixed field set, identical for every project.** No hero entries, no minor entries.

```
project        name or short description
role           Thomas's role on the engagement
built          short description of what he built
team_size      integer
notable        problem → constraint → decision, 100-150 words of prose
```

Technologies are **not** in `notable`. They are a separate relation, rendered as condensing dust.

**Cardinality:** one engagement may produce several project entries. A client star holds 1..n project planets, and a long engagement usually contains more than one distinct problem. The SNCF engagement, for example, yielded both an MDM replacement and a platform upgrade programme — different problems, different constraints, different decisions. Forcing them into one entry blurs all three; splitting them keeps each sharp.

## Format Validation

The field set was tested against one real project (SNCF, MDM replacement) before committing to it. Three findings:

**`notable` must be prose, not a list.** The original brainstorm called for "a short list of noticeable things." A list fragments the causal chain from problem to constraint to decision, which is the only reason the field is worth reading. 100–150 words of connected prose is the working length; below roughly 90 the decision loses its rejected alternative and reverts to a job description.

**A decision needs a rejected alternative.** Without one, the field states what Thomas was responsible for rather than what he chose, and responsibility is already covered by `role`. In the SNCF entry the decision only became legible once the rejected option — the client's own house standard — was named.

**Raw recall does not reliably surface the decision.** Asking what was *annoying* about a project produces excellent constraint material: the specific, unfakeable environmental detail. It does not produce the decision. Drafting from annoyance alone produced a plausible but wrong decision on the first attempt (a conservative design for a junior team), which inverted what actually happened (a deliberate modernisation, with the junior team as a reason *to* modernise rather than a reason to play safe).

The question that surfaces the decision is: **what did you argue for, and what did you argue against?** Ask it explicitly for every remaining entry.

**Why problem / constraint / decision replaced problem / decision / outcome.** No measured outcomes exist — metrics were either never captured or not retained. Without a number, an outcome degrades into an unfalsifiable claim (*more maintainable*, *improved performance*, *the team adopted it*), which the target reader discounts entirely because every candidate writes that sentence. The **constraint** is the falsifiability substitute: a specific, unfakeable condition of the real environment proves presence and reveals judgment without needing a metric. Anyone can claim improved performance; nobody invents "no container runtime on prem."

It is also truer to the work: as a consultant, Thomas frequently left before any outcome was visible.

**Numbers that do exist and should be used where available:** team size (already a field), engagement duration, scale of the system, what was replaced or consolidated. Only measured performance metrics are absent.

**Known tension — uniform depth.** Ten projects with an identical five-field block risks reading as a table in 3D: the rhythm never varies, so a visitor may stop reading around entry four. Uniformity was chosen deliberately for maintainability (no curation decision when adding project eleven, nothing to rot). The consequence is that **variation must come from the camera** — the rails cannot linger equally on ten things, so the hierarchy now lives in the cinematography rather than in the content. This should be verified at the M2 gate.

## Rejected Alternatives

**Composition strategy** (rejected in favour of authored entity-targeted rails):

- *Seed lock* — run the solver, freeze a good seed. Rejected as a global solution, but survives in reserve as incremental history-pinning.
- *Accept emergent composition* — let the solver compose. Rejected: a force solver has no judgment, and the hero frame would be decided by a random seed. Under a work-sample framing, a badly composed hero shot reads as having no eye.
- *Bound the solver* — add constraints (minimum separation, bounding volume, no-fly zones) so any outcome is acceptable. Not rejected outright; still useful as a safety net beneath the rails, since it guards the background-drift risk that entity-relative framing does not cover.

**Graph expression** (rejected in favour of on-demand condensation):

- *Constellations* — skills as drawn lines between stars. Astronomically honest, and "Rust" as a named constellation is genuinely appealing, but flat by nature and close to the obvious answer.
- *Shared light* — skills as spectral colour signatures. Physically true (stellar classification is colour), but breaks past ~6 skills, and the inventory exceeds that.
- *Static gravitational binding* — shared skills as attractive forces, expressed as emergent clustering. Elegant and free, but **invisible**: the visitor sees a clump and cannot know why.
- *Demote the graph to text* — skills as annotation only. Cheap and honest, but relegates the best evidence of range to exactly where every other portfolio already puts it.
- *Skills as meteors* — transient objects streaking through. Consistent with the field-absence rule, and physically the most correct (gravitational capture is real), but the dust model achieved the same permanence-free property with a gentler, more atmospheric read.

**Hierarchy** (rejected in favour of clients-as-stars):

- *Projects as stars* — maximum focus on substance, but loses the narrative of where the work happened, and duration-derived mass becomes uniformly small.
- *Intermediates as stars* — defensible only if consultancy names carry weight. They do not; they are billing infrastructure, and making them the brightest objects would build a universe whose suns are staffing agencies.
- *Two-body systems* — client and intermediate as a bound pair with projects orbiting the barycentre. Physically honest to the contractual truth, but makes the billing relationship a visual centrepiece, which is precisely backwards.

## Audience Reasoning

The entry point determines the requirements, and it was nearly the first thing settled.

Visitors arrive from **LinkedIn or the CV**, therefore **pre-qualified**: job titles, employers, and dates are already known before the click. They are not hunting for facts — the facts are upstream. They clicked because something suggested this person built a universe.

This retroactively justifies several brainstorm decisions that would otherwise be risky:

- Backward time is not user-hostile if nobody is scanning for a date.
- Load time is genuinely tradeable if the visitor is already curious rather than triaging eleven tabs.
- Cutting mobile 3D is acceptable if the click typically comes from a desktop LinkedIn session.

**But the work-sample framing raises the bar rather than lowering it.** Under a CV-substitute framing, "good enough" is a real category. Under a work-sample framing, the site *is* the claim, and a work sample is graded on execution, not ambition. The audience that stays — peers, engineering leads — does not see a cosmos; they see a WebGL scene at 34fps, overlapping labels, or a stretched low-res texture.

This is why **runtime framerate separated from load time** and became non-negotiable. A slow load reads as a tradeoff; a janky scene reads as incapability.

## Performance Target

⚠️ **Not yet ratified by the author.** The M3 gate has no testable threshold until this is confirmed or replaced.

**Proposed:** locked 30fps at 1080p on 2023-era integrated graphics, with full post-FX. Below that, fall back to the flat star chart.

**Target hardware:** a three-year-old laptop with integrated graphics at 1080p — the corporate work-laptop profile of the actual audience, not a 2023 Apple-silicon machine and not the dev machine.

**Why 30 rather than 60:** the content is slow camera movement through mostly static geometry, the exact case where 30 reads as cinematic rather than broken. Holding 60 on integrated graphics would cost texture resolution and post-processing, both of which serve the realism non-negotiable.

**Degradation policy:** quality holds, frames drop. A viewer served a stripped-down render judges the stripped-down render, unaware that a better version existed. Better the real thing at 24fps than a lesser thing at 30. A stable framerate also reads as smooth where a fluctuating one reads as broken even at a higher average.
