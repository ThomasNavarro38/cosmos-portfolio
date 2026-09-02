---
title: "Product Brief: Cosmos Portfolio"
status: draft
created: 2026-08-31
updated: 2026-08-31
---

# Product Brief: Cosmos Portfolio

## Executive Summary

Cosmos Portfolio presents Thomas's consulting career as a navigable universe: an immersive, realistic scrollytelling website. Clients are stars, the projects delivered for them are planets in orbit, and the skills behind each project exist as interstellar dust that condenses into visible bodies when a project is examined. Scrolling runs time backward, from the present into the past, until the universe contracts through a reversed big bang and collapses into a black hole that becomes the contact form.

It is not a CV. It is the work sample. Visitors arrive from LinkedIn or from the CV itself, already knowing the job titles and the dates, and they click precisely because something suggested this person built a universe. The site's job is to reward that click twice: with awe, and — for the reader who slows down — with evidence of how Thomas thinks about engineering problems.

The layout is never authored. Positions are solved from a single embedded JSON file, so adding a project in five years costs one entry and one number. What *is* authored is the camera.

## The Problem

A consultant's CV loses the most important information by design. Two pages, skimmable, optimised for keyword matching — everything interesting gets compressed out. What survives is a list of employers, roles, dates, and technologies. What disappears is the part that distinguishes one senior engineer from another: what the problem was, what made it hard, and what they decided to do about it.

This hurts consultants specifically. The employer column lists intermediaries: consultancies that held the contract and processed the invoices, saying nothing about the work itself. The real context is the end client and the constraints of their environment, and a CV has no room for either.

There is also a second, quieter problem. A portfolio is supposed to demonstrate capability, but a conventional developer portfolio demonstrates only that its author can build a conventional developer portfolio. For someone whose claim is that they can build difficult things, the medium is undercutting the message.

## The Solution

A single-page, desktop-first WebGL experience that renders the career as a cosmos and lets the visitor move through it.

**The structure is the data.** One embedded JSON file describes clients, projects, and skills. A force-directed simulation computes where everything sits, using three mapping rules: mass from duration, brightness from recency, distance from the rail by relevance. Nothing is hand-positioned, ever.

**The camera is the composition.** Authored camera rails guide the visitor by default, on a curated trajectory through the universe, with free flight available on request. Rails target entities rather than coordinates — a shot is defined as "frame this client at this angle and distance," so when the simulation re-settles around new data, the shot follows the subject instead of drifting off it.

**Skills are weather, not furniture.** Every skill and technology exists permanently as diffuse interstellar dust, filling the space between bodies. Focus a project and its skills condense out of that dust into orbiting bodies; release focus and they decay back into it. Nothing spawns and nothing teleports, so the physics stays honest — and because a skill is never permanently anywhere, the same skill can serve every project that used it without duplication.

**The ending is the contact form.** Scrolling backward eventually reaches the beginning of the universe, which contracts and collapses into a black hole. That black hole is the contact surface. The emotional arc is awe, then calm: the universe ends peacefully.

**Realism is borrowed, not modelled.** The visual bar is met with NASA/ESA public-domain texture maps, drei built-ins, and post-processing film artifacts, plus pre-rendered Blender sequences for the two bookend shots. This is a deliberate route around a known limitation: the author's 3D modelling skill sits below the quality bar he refuses to lower, and space is the rare subject that needs almost no modelling — spheres, textures, and light.

## What Makes This Different

The honest differentiator is **execution, not concept**. Scrollytelling exists. Space visualisations exist. What is unusual here is the combination of a fully computed layout with authored cinematography, and a data model that resolves a many-to-many graph through physics rather than through drawn connector lines.

Two specific choices carry the work:

- **Backward time serves three masters at once.** It is an aesthetic conceit. It is also the correct ordering for a professional reader (most recent first), and it gives the contact form a non-arbitrary home at the end of the journey. One decision, three payoffs.
- **Classification by absence.** Entities are typed by which fields they lack rather than by explicit type flags — items with no parent and no duration are transient objects. This is what keeps the schema from accumulating special cases as the career grows.

There is no moat here and none is claimed. The advantage is that the thing is difficult to build well, and building it well is the entire point.

## Who This Serves

**Primary: technical readers who click through.** Engineering leads, senior peers, technical founders, and hiring managers with an engineering background. They arrive pre-qualified from LinkedIn or the CV, already holding the facts. They are not looking for dates. They are forming a judgment about capability and taste. Success is a reader finishing a project entry and thinking *this person can think* — and finishing the site thinking *this person can build*.

**Secondary: non-technical recruiters.** They will visit, and many will not scroll far. This is accepted. The site is not optimised for them and does not attempt to be — the CV that linked here already served that audience.

## What the Site Says

Every project carries the same fields, in the same depth — no hero entries, no minor entries:

- Project name or short description
- Thomas's role
- What he built
- Team size
- Notable work, told as **problem → constraint → decision**, in 100–150 words of connected prose

The notable field is prose, not bullets: the value is in the causal chain from problem to decision, and a list breaks it. One engagement often yields more than one project — a single client star can hold several planets, and splitting them keeps each problem and decision distinct rather than blurred together.

That last structure deliberately replaces the conventional problem/decision/outcome. No measured outcomes exist for this work, and unfalsifiable claims — *more maintainable*, *improved performance* — read as padding to the technical reader this site is built for. The **constraint** does the work instead: a specific, unfakeable condition of the real environment ("on-prem hardware with no container runtime, so it had to ship as a single JAR with an embedded scheduler") proves presence and reveals judgment without needing a number. The full rationale is in the addendum.

Technologies never appear in this text. They are a separate relation, expressed by the dust that condenses around the project. Two channels, no duplication: prose carries reasoning, geometry carries the stack.

Real client names ship. There is no NDA constraint, and recognisable names are what convert visual polish into credibility.

## Success Criteria

- **A stranger can tell what Thomas does.** A technical reader who explores two or three projects can state his discipline, his seniority, and the kinds of environments he works in. This is the M2 gate and it is the primary test.
- **The work sample lands.** The site reads as a demonstration of capability rather than a decorated CV. The signal to watch for is being shared — a lead sending it to a colleague.
- **It performs on a real machine.** Locked framerate at 1080p on a three-year-old laptop with integrated graphics. Quality holds and frames drop before the look degrades: a viewer who receives a stripped-down render judges the stripped-down render, unaware they were served the lesser version.
- **It stays alive.** Adding a project in 2029 costs one JSON entry plus one weight value, with no layout work, no camera rework, and no repositioning. A living document that stays true for a decade at near-zero maintenance cost is an explicit requirement, not a nice-to-have: the author self-identifies as lazy about upkeep, and the architecture is built around that honestly.

## Scope

**Tradeable under pressure:** load time, breadth of content, build time. **Not tradeable:** realism of materials and lighting, immersion, visitor awe, and runtime framerate. This rule governs every call below.

**In scope for v1**

- Backward-time scroll from present to past
- Force-directed layout from embedded JSON; the three mapping rules; the single `weight` knob
- Clients as stars, projects orbiting clients, consultancy as a project attribute
- Authored entity-targeted camera rails; free flight on request
- Skills as interstellar dust with condensation on focus and decay on release
- Information layer with the fixed field set and problem/constraint/decision narrative
- Realism pass: NASA/ESA textures, drei, post-processing
- Pre-rendered Blender bookends: opening shot and final collapse
- Collapse into black hole as contact surface
- Flat star-chart fallback for machines that cannot run the 3D scene

**Explicitly out**

- Mobile 3D — the fallback serves mobile
- Astronomically accurate distances or scale
- Per-entry position overrides
- CMS or backend of any kind
- Belt-merging of clustered small items — the inventory is roughly eighteen primary bodies, far too few to need it. Revisit only if the count grows substantially.

## Build Order

Sequenced with a gate at each step. No vertical slice first — this is deliberate.

1. **M1 — Greybox.** Schema, force layout, rails, backward scroll, untextured. *Gate: does the pacing work with no visual polish at all?*
2. **M2 — Information layer.** *Gate: can a stranger tell what he does?*
3. **M3 — Realism pass.** Textures, lighting, post-processing. *Gate: does it hold framerate on the target machine?*
4. **M4 — Collapse ending.** Blender bookends and the contact surface.
5. **M5 — Fun layer.** Anything remaining that earns its place.

## Open Questions

- **Contact mechanism.** No backend was decided, but the mechanism was never resolved. A form needs somewhere to send to; a mailto link is the zero-infrastructure option but weakens the ending. This blocks M4 and nothing earlier.
- **Career inventory.** The actual entries — clients, projects, roles, team sizes, and the problem/constraint/decision text for each — are not yet written. This is the single largest remaining content task and it blocks M2.
- **Fallback trigger and scope.** What detects an incapable machine, and how much the flat star chart must convey.
- **Visual identity.** Palette, typography, and UI chrome for the information layer.
- **Free-flight boundaries.** How far a visitor may roam off-rail, and how they return.

## Vision

If it works, this stops being a portfolio and becomes an instrument. Point at a thing and its context assembles around it; look away and it disperses. The same engine that lays out a career could lay out anything with duration, relation, and relevance.

The nearer-term ambition is smaller and more useful: a career document that is genuinely alive. Most portfolios are snapshots that rot the moment they ship. This one absorbs new work by construction — one entry, one number — which means in five years it will still be true, and still worth visiting.
