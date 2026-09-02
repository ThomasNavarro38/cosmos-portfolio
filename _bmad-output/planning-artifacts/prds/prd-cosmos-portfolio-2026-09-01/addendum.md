---
title: "PRD Addendum: Cosmos Portfolio"
status: draft
created: 2026-09-01
updated: 2026-09-01
---

# PRD Addendum: Cosmos Portfolio

Depth surfaced during PRD authoring that belongs to a downstream document — architecture, UX spec, or the content-authoring pass — rather than to the PRD itself.

This is additive to the [brief addendum](../../briefs/brief-cosmos-portfolio-2026-08-31/addendum.md), which remains the authoritative record of the domain model, the condensation mechanic's rationale, the camera rot defence, the format validation findings, and the full rejected-alternatives set. Nothing there is repeated here — where this document touches that material, it names it and states only the consequence for the consumer at hand.

## Where the Reasoning Lives — Document Routing

Three planning documents now carry overlapping material, and downstream workflows need to know which to read for what. This mapping is not in the PRD because it is workflow metadata, not product requirement.

| Question | Authoritative source |
|---|---|
| What must be built, and what is in or out of launch scope | **This PRD** (§4, §8) |
| Why the domain model resolves both many-to-many relations | Brief addendum, *Domain Model* |
| Why condensation beat constellations, shared light, binding, text, meteors | Brief addendum, *Rejected Alternatives* |
| Why `notable` is prose and needs a rejected alternative | Brief addendum, *Format Validation* |
| Why depth is non-uniform, and what the claim became | PRFAQ distillate, *Flag 01* |
| Why M2 is the launch milestone | PRFAQ distillate, *Flag 03* |
| Why first paint is carved out of tradeable load time | PRFAQ distillate, *Flag 04* |
| What the actual career content is | `inventory-draft.md` (in progress) |

**Scope of the conflict rule.** The PRD states it (§0): where the PRD and the brief conflict, the PRFAQ's four drift flags govern. What the PRD does not say is when it bites. The PRD already reflects the post-flag state throughout, so a reader working only from it is never at risk; the rule matters only when reading the brief directly.

## Architectural Contract — Notes for `bmad-architecture`

The PRD states these as requirements, with the reasoning compressed to fit. The architecture will need them as constraints, so the reasoning is expanded here.

**The no-coordinates rule is the whole rot defence, and it is fragile in one specific way.** FR-17 forbids world coordinates in Shot definitions. The failure mode it prevents is silent: a coordinate-addressed shot that drifts off its subject after the simulation re-settles throws no error, renders fine, and simply looks worse. There is no test that naturally catches this, which argues for a lint or schema-level guard rather than a convention — a Shot type that structurally cannot hold a coordinate is worth more than a rule someone remembers.

**Derived Dwell couples the camera to the content model.** FR-18 makes Dwell a function of `notable` presence. That is a deliberate coupling — it is what removes the hand-tuned number — but it means the camera system reads content state, and a change to the two-class model propagates into pacing. Worth an explicit interface rather than an ad-hoc lookup.

**Condensation and Decay must share one implementation.** FR-13 requires it and the brief addendum gives the reasons. The architectural point is the failure mode: split into two code paths, the coherence guarantee is lost silently — both paths keep working, and only the tuning drifts apart. Shared implementation is the enforcement, not a convention.

**The collapse and the condensation are the same mechanism at different scales.** The brainstorm notes collapse is implemented by disabling repulsion in the existing force system. Every unfocus is already a miniature collapse. If the M4 procedural assumption (R-6) holds, this is one system used three ways — condensation, decay, and ending — which is a strong argument for building the force system with that generality at M1 rather than retrofitting it at M4.

**Settling budget.** The consequence of the brief addendum's magnitude figures, which architecture should read before sizing anything: the budget is generous, and the constraint guards against future carelessness rather than against body count. Do not over-engineer for scale that will not arrive.

## Visual System — Notes for `bmad-ux`

**The Schematic Identity is a launch blocker sitting in the author's weakest discipline.** That combination (R-4) makes it the highest-variance task in the launch set, and it deserves a first-class UX pass rather than a styling sweep at the end. Concretely undefined and all needed: palette, line weight, typography, label treatment, UI chrome.

**The idiom has precedent worth borrowing from.** "Monochrome blueprint schematic" is a real design language with its own rigour, and the reference set is specific: technical drawing, orbital mechanics diagrams, engineering schematics, early vector displays. Borrow from those rather than inventing the language from nothing.

**The greybox trap.** A greybox reads as unfinished only when it pretends to be finished. The failure mode is a scene that looks like it is waiting for textures. The success mode is a scene that looks like it chose not to have them. What separates the two is consistency and commitment — a half-schematic with one realistic element reads as broken, not as restrained.

**Two Project classes need a visual grammar, not just a difference.** FR-9's assumption proposes the satellite as the channel — a moon at rest on a Deep Project, none on a Shallow one — and rules brightness out, since FR-3 has already bound it to recency. The deeper question for UX: is the distinction *legible as meaning* (this one has something to say) or does it read as *incomplete data* (this one is missing information)? Those are opposite readings of the same visual. Getting this wrong is R-3, the most likely gate failure.

**The information layer has no specified form.** Overlay, panel, in-scene text, typographic treatment of 150 words of prose in a 3D context — all open. The PRD specifies the layer's content (FR-7, FR-8) and its legibility requirement (NFR-7) but not its presentation. This belongs squarely to UX.

**The form is open. The voice is not — go to the full PRFAQ.** An earlier draft of this addendum claimed copy tone and voice remained open alongside the form. That was wrong. `prfaq-cosmos-portfolio.md` contains roughly 1,500 words of pressure-tested material on exactly this: the press release body, its voice, and ten Customer FAQ answers written as prose. The distillate compressed all of it away — it is faithful on *decisions* and lossy on *language* — so the PRD, drafted from the distillate, never saw it. **UX must read the full PRFAQ directly.** Load-bearing examples: *"the two-page CV is a machine for deleting the interesting part"*; *"the agencies that held the contract and processed the invoices"*; *"it does not jump; it flies"*; *"they are not a list in a sidebar"*; and the shallow entries being *"labelled by being shallow"*, which constrains FR-9.

**The relation argument justifies the medium itself.** From the full PRFAQ: *"What the PDF cannot show you is relation… On paper that is a table you would not read. Here it is the shape of the thing, and you take it in without parsing anything."* This is the reason the site is 3D rather than a page, and it implies a requirement no FR states — that the resting scene must make recurrence, duration, and centrality perceptible **without** Focusing anything. Worth a requirement of its own if UX agrees.

## Content Authoring — Notes for the inventory pass

**The excavation question is the whole method.** *"What did you argue for, and what did you argue against?"* — asked explicitly, per entry, never inferred. The SNCF case is the proof: drafting from raw recall produced a plausible decision that inverted what actually happened. Asking what was *annoying* produces excellent constraint material but not the decision. Two different questions, both needed.

**Roughly seven entries will have no answer, and that is the expected outcome, not a failure.** Much professional work is competent delivery where no alternative was contested. The two-class model exists precisely so those entries can ship honestly rather than being padded into a `notable` that states responsibility — which `role` already covers.

**Promotion is free.** An entry that later yields a decision simply gains a `notable` and self-promotes to Deep. No schema change, no layout change, no camera change. This means the excavation pass does not have to be complete before launch, and incomplete excavation is not a blocker.

**The 90-word floor is a quality gate, not a style preference.** Below it the decision loses its rejected alternative and reverts to a job description. Enforce at authoring time.

**The two-entries-cold-read is available now** and has no dependencies. It de-risks R-3 before any code exists, and it may change the FR-9 assumption before that assumption is ever implemented. This is the cheapest de-risking action in the entire plan.

## Open Design Territory Not Yet Owned

Items with no natural home in the PRD's FR structure and no assigned downstream document.

- **The M2 contact route's form.** A mailto weakens the ending conceptually, but the designed ending is M4 anyway, so the M2 route only has to work and not embarrass. Third-party form services would violate NFR-6's spirit if not its letter — worth a deliberate call.
- **Link preview composition** (FR-24). Requires a composed image and an honest title. The honesty constraint is real: a preview promising a 3D cosmos to a mobile visitor who will receive the Fallback is a broken promise at the exact moment funnel positioning depends on.
- **What the Fallback actually shows.** The Glossary names its form, not its content set. It must satisfy the same M2 gate — can a stranger tell what he does, and which entries are worth reading — with none of the scene's affordances.
- **Whether the Colophon is discoverable or hidden.** FR-21 requires it to exist and to show rather than describe. Whether a visitor stumbles onto it, is led to it by the Rail, or has to look for it is unspecified — and it materially affects SM-3, its only observable.

## Deliberately Excluded from the PRD

Recorded so these exclusions are not silently revisited.

- **Client relationship friction (SNCF).** Excluded from publication for the reasons FR-11 records. Noted here because the material is still sitting in `inventory-draft.md`, where the content pass will meet it and has to leave it there.
- **Competitive and market research.** Deliberately not run, and judged unnecessary rather than skipped by omission (§7). Restated because it binds a document that does not exist yet: **any downstream document asserting anything about the WebGL-portfolio landscape, or about what technical readers actually do with such sites, must research it first.**
- **Build difficulty as a claim.** Never stated (§7). It survives implicitly: capability is inferred from an artifact that works.
- **Internal FAQ (PRFAQ Stage 4).** Not run, correctly — no economic impacts exist to interrogate. The non-economic half (capacity, scope stability, the Blender dependency) is carried as PRD risks R-1, R-5, and R-6 rather than as Q&A, but it has never been interrogated in that form.
