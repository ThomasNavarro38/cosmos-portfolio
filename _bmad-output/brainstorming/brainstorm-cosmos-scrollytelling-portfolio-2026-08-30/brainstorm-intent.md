# Brainstorm Intent — Cosmos Scrollytelling Portfolio

## Project
An immersive, realistic cosmos-themed scrollytelling web portfolio presenting Thomas's professional life (studies, companies, projects) as a navigable universe.

## Mission
- Audience: OTHERS (recruiters, peers, clients) — outward-facing, not introspective.
- Success: a visitor learns what Thomas worked on and what his skills are, delivered with fun and awe.
- Communication is the job; awe is the delivery mechanism. Content legibility is a hard requirement, equal to awe.
- Must be a living document: updatable and still useful in 5+ years as the career grows.

## Non-negotiables
- **Realism** — materials, lighting, textures. NOT astronomical scale accuracy.
- **Immersion**.
- **Visitor awe**.

## Explicitly tradeable
Load time · mobile 3D parity · breadth of content · build time.

## Core structural decisions
- Time runs **backward**: scroll goes present → past.
- Navigation: **guided trajectory on rails by default**, free flight available on request.
- Ending: after the reversed big bang, the system **collapses into a black hole that becomes the contact form**. No wormhole-to-contact.
- Emotional arc of the ending: **awe → calm**. The universe dies peacefully. Not violent, not ominous.
- **Embedded JSON in the project is the single source of truth.** No CMS, no backend.
- Original three-phase framing (education / professional / contact, wormhole-linked) is superseded by the continuous backward-time cosmos with a collapse ending.

## Layout & data architecture
- Layout is **computed**, never authored: force-directed from the JSON.
- Mapping rules:
  - `mass` = duration
  - `brightness` = recency
  - `distance from rail` = relevance
- **Classification by field ABSENCE** (no special-casing):
  - no parent + no duration ⇒ transient / meteor (certs, talks, languages, OSS)
  - gaps in the timeline auto-emit as nebulae
  - clustered small items auto-merge into belts
- Maintenance model: **ONE KNOB** — an entry plus a single `weight` / relevance number, default `1`.
- **No position overrides.** Deliberate: overrides would rot; the author self-identifies as lazy about maintenance.
- Scroll pacing may be mass-damped (gravity-driven) only if complexity stays low.
- Collapse is implemented by disabling repulsion in the same force system.

## Technical approach
Hybrid, chosen because the author's 3D modelling skill is below the quality bar he refuses to lower — but this subject needs almost no modelling.
- **Interactive middle: real-time 3D.** Spheres + NASA/ESA public-domain texture maps + drei built-ins + post-processing film artifacts. Realism is bought/borrowed/baked, not modelled.
- **Two bookends: pre-rendered Blender**, scroll-scrubbed — the opening shot and the final collapse.

## Scope (MoSCoW)
**Must**
- Backward scroll; collapse-into-contact-form ending; rails navigation
- Embedded JSON source; force-directed layout; the 3 mapping rules; single `weight` knob
- Readable information layer (skills + work legible to a stranger)
- NASA/ESA textures + drei + post-FX realism; pre-rendered collapse
- Flat star-chart fallback

**Should**
- Free flight; nebula gaps; meteor taxonomy; mass-damped scroll; annotations; progressive loading; date readout

**Could**
- Gravity-driven pacing beyond basic mass damping; extended fun layer (M5)

**Won't**
- Mobile 3D; real astronomical distances; per-entry position overrides; CMS/backend

## Build order
No vertical slice first — deliberate decision; straight into M1.
- **M1 — Greybox**: schema + force layout + rails + backward scroll. *Gate: does the pacing work untextured?*
- **M2 — Information layer**. *Gate: can a stranger tell what he does?*
- **M3 — Realism pass** (textures, lighting, post-FX).
- **M4 — Collapse ending** (Blender bookends + contact form).
- **M5 — Fun layer**.

## Open questions
- Actual inventory of Thomas's career entries (studies, companies, projects, certs, talks, OSS) — not yet collected.
- Specific content per role: what is said about each entry, at what depth.
- Visual identity: palette, typography, UI chrome specifics.
- Copy tone and voice for the information layer.
- Concrete JSON schema field names and validation rules.
- Where the flat star-chart fallback is triggered and how much it must convey.
- Contact form backend/handling (no backend was decided — mechanism unresolved).
