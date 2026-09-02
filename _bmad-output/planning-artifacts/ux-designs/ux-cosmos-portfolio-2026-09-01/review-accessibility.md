---
title: "Accessibility Review — EXPERIENCE.md + DESIGN.md (Cosmos Portfolio)"
status: draft
created: 2026-09-01
reviewer: Senior Accessibility Architect (spec review, not code audit)
scope:
  - ../ux-cosmos-portfolio-2026-09-01/EXPERIENCE.md
  - ../ux-cosmos-portfolio-2026-09-01/DESIGN.md
target: WCAG 2.2 Level AA
---

# Accessibility Review — Cosmos Portfolio Specification Pair

## Verdict

The spine is unusually accessibility-literate for a design document — it names
WCAG-shaped concerns before being asked to (hover/focus parity, non-colour
signalling, reduced motion, a keyboard index as a first-class layer) and it
is honest about what it hasn't tested. That honesty is also the finding: on
every point that actually determines whether this product is operable by a
screen-reader or keyboard-only visitor, the spec is either silent
(`[NOTE FOR UX]`, "Genuine gap") or asserts a behaviour without the ARIA/DOM
structure that would make it true. §11's own framing — "this is a
consumer-grade floor, not an enterprise checkbox exercise" — is not yet
backed by a specification that a developer could implement and pass. The
single most consequential item is E-G5 / the "camera is presentational, the
index is the interface" model: it is the right instinct, but as written it
describes an outcome, not a structure, and two of its unstated assumptions
(that the index is DOM-persistent and independent of camera animation state,
and that Focus entry does not require the index item to scroll or animate
out of the accessibility tree) are exactly the kind of thing that silently
fails first in a Three.js/WebGL build, where the natural implementation
puts everything — including the "index" — inside a `<canvas>` or an
`aria-hidden` overlay. Separately, DESIGN.md's own contrast floor table
contains an arithmetic error that understates its own failures: recomputing
the flagged pairs from the stated hex values gives ratios lower than the
document reports, meaning corner chrome and Mote tier-3 labels are worse
than DESIGN.md itself already admits. The Fallback is correctly identified
as the load-bearing accessible surface, but it is specified for content
parity, not for interaction or navigation parity, and relying on it as *the*
accessibility path for capable-desktop screen-reader and switch users
(rather than only for mobile/incapable-machine users) drifts toward a
segregated-experience anti-pattern unless EXPERIENCE.md closes that gap
explicitly.

---

## Blocker

### B1 — The keyboard index is asserted, never structurally specified

**File / lines:** `EXPERIENCE.md` §6.5 (L543–564), §7.3 (L608–621), §11 point 1
and 6 (L881–883, L894–898).
**WCAG 2.2:** 2.1.1 Keyboard (A), 2.4.3 Focus Order (A), 4.1.2 Name, Role,
Value (A).

**Problem.** The spec states the keyboard index "addresses the same
destination set as click-to-fly" and that Tab/Shift+Tab "traverse the
destination index." It never specifies what DOM structure carries this
index, whether it exists at all times or only in some states, whether it is
visually hidden, or how its order is computed from the entity graph (§2)
independent of camera position. This matters specifically because the
canonical implementation of a WebGL scrollytelling scene puts the entire
visible surface inside a `<canvas>`, which is opaque to assistive
technology. "The keyboard index is the accessibility path" is true only if
that index is real, persistent, focusable HTML (or ARIA-tree-exposed SVG)
that exists in the DOM independent of whether the canvas has rendered
anything — the spec never says so. As written, an implementer could satisfy
every line of §6.5/§7.3 by wiring `tabindex` handlers to invisible hit
regions positioned over canvas coordinates, which breaks the moment the
camera moves (every position shifts every frame) and produces a focus order
that visibly desyncs from the visual scene for sighted keyboard users, and
is simply absent for screen-reader users if the elements have no accessible
name markup — which the spec also does not specify (see B2).

**This spec is silent**, not wrong: there is no statement to contradict, only
an unfilled precondition for every claim built on top of it (§11.1, §11.6,
E-G5).

**Fix.** Add to EXPERIENCE.md §6.5 or a new §7.3a:

> The keyboard index is a persistent, off-canvas DOM structure — a `<nav>`
> containing one `<button>` or link per destination (Client, then its
> Projects), rendered in normal HTML/SVG and visually hidden via a
> clip-path/sr-only technique, never via `display:none` or `visibility:hidden`
> on the interactive elements themselves. It exists before the 3D scene has
> streamed in a single Body (consistent with §5.6's streaming model) and its
> order is computed from the entity graph directly, never read off camera or
> render state. Tab order in this index is independent of Rail position: a
> keyboard user who has not scrolled can Tab directly to the last Client.
> Activating an index item triggers the same Focus/fly behaviour as clicking
> the rendered Body, and moves DOM focus to the corresponding on-canvas
> proxy element (see B2) so that subsequent Tab presses continue in scene
> order, not back to the top of the index.

---

### B2 — No accessible name, role, or DOM anchor specified for canvas-rendered Bodies

**File / lines:** `EXPERIENCE.md` §11 point 6 (L894–898); `DESIGN.md` §7.1–7.4
(L660–780, entirely canvas-described).
**WCAG 2.2:** 4.1.2 Name, Role, Value (A), 1.1.1 Non-text Content (A).

**Problem.** §11.6 says: "the canvas or SVG root carries a meaningful
accessible name and the destination index is exposed as real focusable
elements with real accessible names — Client name, Project title, role, and
whether it carries a Notable." This conflates two different things without
resolving the relationship between them: (a) a single accessible name on the
canvas/SVG *root* and (b) a list of "real focusable elements" that must
*also* exist. If the renderer is `<canvas>` (near-certain for a Three.js
WebGL scene — DESIGN.md's shape vocabulary, stroke weights, and depth model
in §5–§6 all describe canvas/WebGL primitives, not SVG DOM nodes), then
"real focusable elements with real accessible names" cannot be children of
that canvas; they must be a sibling DOM tree (this is B1's index), and each
must individually expose: role (`link` or `button`), name (Client name /
Project title), and state (whether it carries a Notable — an `aria-label`
suffix or `aria-describedby`, not a Ring, since a Ring is not perceivable to
a screen reader at all per §11.7's own logic extended one step further than
the document takes it). None of this is specified. The document names *what*
must be announced (§11.6's list) but never *how* it attaches to an element a
screen reader can reach — which is the actual accessibility requirement,
not the aspiration.

**This spec is silent**, over-trusting the word "exposed" to do structural
work it cannot do alone.

**Fix.** Add to EXPERIENCE.md §11 (extending point 6):

> Each destination-index entry (B1) is an `<a>` or `<button>` with:
> `aria-label` = "{Client name}" for a Client entry, or "{Project title},
> {role}, {team size}, carries a Notable" / "{Project title}, {role}, {team
> size}" for a Project entry, matching exactly the secondary-line content
> specified for hover in §4.3 — the accessible name is the hover content,
> not a paraphrase of it. The canvas element itself carries `role="img"`
> (or is `aria-hidden="true"` if the index fully duplicates its content —
> ratify one) and a static `aria-label` describing the scene at a category
> level ("An animated 3D star chart of clients and projects; use the
> destination list to navigate it"), never a per-frame-updated name.

---

### B3 — Motes are specified as visual/spatial objects with no stated DOM or announcement mechanism

**File / lines:** `EXPERIENCE.md` §4.4 (L300–320), §11 point 8 (L903–905);
`DESIGN.md` §7.4 (L743–780).
**WCAG 2.2:** 1.1.1 Non-text Content (A), 1.3.1 Info and Relationships (A),
4.1.2 Name, Role, Value (A).

**Problem.** §11.8 states: "Mote labels are text, not decoration... must be
exposed as such, not baked into a canvas texture. When a Project is
Focused, its Skills are announced." "Announced" implies a live region or a
focus-triggered read, but the document specifies neither. Motes are also
explicitly designed with **no interaction model** (§4.4: "no second
interaction — no hover, no tooltip, no click"), which is correct for sighted
users (the label is always visible) but leaves no stated mechanism by which
a screen-reader user's focus ever lands on a Mote or its label content at
all, since Motes carry no `tabindex` anywhere in the spec and are explicitly
decorative-adjacent orbiting geometry. "Announced" cannot mean an
`aria-live="polite"` region firing all nine skill names the instant Focus
completes (this would be announced as an unstructured wall of nine words
with no relationship to the Notable being read, competing with whatever the
screen reader is doing when the user actually starts reading the panel —
likely landing focus in the panel per B4). Nor can it mean each Mote is a
focusable DOM node the user must Tab through one-by-one to hear the stack,
since that contradicts "no second interaction" and would place nine new Tab
stops between the destination index and the panel content, which is not
mentioned in §7.3's keyboard table at all.

**This spec is silent** on the actual mechanism — it names the outcome
("Skills are announced") without choosing between the two structurally
incompatible ways to achieve it, and the incompatibility is not noted
anywhere, including in E-G6 which only concerns *visual* label degradation
above ~12 Motes.

**Fix.** Add to EXPERIENCE.md §4.4 or §11:

> On Focus, the condensed Skill set is exposed as a static, non-live list
> inside the panel DOM (§4.5), positioned after the field table — e.g. a
> `<ul aria-label="Skills">` — not as an `aria-live` announcement and not as
> individually focusable canvas Motes. This list is the accessible
> equivalent of the Dust/Mote visualisation, not a duplicate "Skills field
> row" (which §4.4 forbids for sighted users): it is present in the
> accessibility tree only, visually hidden, satisfying "the Dust is the
> display" for sighted users while giving screen-reader users the
> equivalent information through the panel's normal reading flow rather
> than through a separate interaction the sighted experience does not have.
> This resolves the apparent conflict between "no second interaction" and
> "must be exposed as text": the second interaction that Motes forbid is a
> *sighted* one (hover/tooltip/click); an always-present, silently-read DOM
> list is not a second interaction, it is the first and only one for that
> modality.

---

### B4 — Focus management on Focus-transition and Focus-release is unspecified

**File / lines:** `EXPERIENCE.md` §5.4 (L398–408), §5.5 (L410–417), §6.3
(L498–518).
**WCAG 2.2:** 2.4.3 Focus Order (A), 2.4.7 Focus Visible (AA), 2.4.11 Focus
Not Obscured (Minimum) (AA — new in 2.2), 3.2.2 On Input (A).

**Problem.** The Focus transition (§6.3) is specified purely as a camera and
panel animation. There is no statement of where DOM focus moves when a
keyboard user activates a Project (Enter/Space per §7.3): does focus move
into the panel (to the title? to the first line of the Notable? to a close
button?), or does it stay on the index item that triggered it while the
panel opens beside it? This is not a cosmetic omission — §4.5 states the
panel "contains, in order: Client kicker, Project title, the reading
position, the field table," implying a reading start point, but nothing
routes keyboard focus there. Symmetrically, §5.5's release triggers
("Escape, activating the panel's close affordance, activating a different
Project, resuming journey scroll via an explicit gesture") never state
where focus returns to. If focus is left on a now-decayed or
now-differently-tabindexed canvas proxy element after release, or if it is
simply dropped to `<body>`, that is a WCAG 2.4.3 failure and, practically,
a lost-place failure for exactly the audience (engineering leads,
potentially using a screen reader or keyboard-only navigation to evaluate
technical rigor) this product is trying to impress.

Separately, §6.3's "the panel opens in the other column" beside a camera
recompose raises 2.4.11 (Focus Not Obscured): if the panel visually
overlaps, or z-index-stacks over, the destination-index proxy element that
currently holds focus during the transition animation, that is a new-in-2.2
AA failure. The "scene is never occluded" rule (§1 invariant 4, §6.3) is
stated as a *visual* rule about the 3D scene, not a focus-visibility rule
about the DOM — it does not obviously cover this case and should be
checked explicitly.

**This spec is silent.**

**Fix.** Add to EXPERIENCE.md §5.4/§5.5:

> On Focus entry, DOM focus moves to the panel's title element
> (`panel-title`, tabindex="-1", programmatically focused), which is
> announced by the screen reader as "{Project title}, heading" — orienting
> the user at the top of the record, consistent with the panel's own stated
> reading order in §4.5. From there Tab proceeds through the reading
> position, then the field table, then the Skills list (B3), then the panel
> close control, then out to the next destination-index item in Rail order.
> On Focus release by any of §5.5's triggers, DOM focus returns
> deterministically to the destination-index entry for the Project just
> released (not to `<body>`, not to whatever the camera happens to be
> nearest), so a keyboard user's place in the index is never lost.

---

## Should fix

### S1 — DESIGN.md's own contrast floor table understates its two admitted failures

**File / lines:** `DESIGN.md` §2, table at L455–461, resolution at L466–474.
**WCAG 2.2:** 1.4.3 Contrast (Minimum) (AA).

**Problem.** DESIGN.md computes two failing pairs and states their ratios:
`ink-quiet-dark` (#5E5E68) on `surface-raised-dark` (#0D0D10) at "~3.6:1",
and the same ink on `surface-base-dark` (#08080A) at "~3.8:1" (used for both
Mote tier-3 labels and, per §7.9/L461, corner chrome). Recomputing WCAG
relative luminance directly from the stated hex values:

- `#5E5E68` on `#0D0D10` → **≈3.03:1** (document states ~3.6:1)
- `#5E5E68` on `#08080A` → **≈3.12:1** (document states ~3.8:1)

(Method cross-checked against the document's own passing rows: recomputing
`ink-lift-dark` #F2F2F4 on `surface-raised-dark` #0D0D10 gives 17.42:1
against the document's stated 17.4:1, and `ink-prose-dark` #B6B6BE on the
same ground gives 9.63:1 against the document's stated ~9.5:1 — both match
closely, which indicates the method is sound and the error is specific to
the two failing rows, not a systematic miscalibration.)

Both of the document's own numbers are already below its 4.5:1 floor and are
correctly flagged as failing — that part of the review target is not in
dispute. The problem is that the *actual* ratios are meaningfully lower
still (roughly 15–18% lower than stated), which matters because:

1. Corner chrome (`DESIGN.md` §7.9, L856–865; row at L461) is claimed to
   pass its own separately-stated, lower bar of "≥3:1 (incidental)". At the
   corrected ~3.12:1 it still technically clears 3:1, but with almost no
   margin, and the "incidental" classification is itself the deeper issue
   (see S2) — chrome text ("THOMAS NAVARRO", "scroll ↓ — time runs
   backward") is *prose text content*, not a graphical UI boundary, so its
   correct WCAG floor is 1.4.3's 4.5:1 for normal-size text, not the 3:1
   floor for graphical objects/UI components (1.4.11). Against the correct
   4.5:1 text floor, corner chrome fails outright at ~3.12:1.
2. The prescribed fix for field labels/editorial rule and Mote labels
   (raise to `ink-label-dark` #8A8A94) is correct and, independently
   recomputed, does clear 4.5:1 (I compute ≈5.68:1 on `surface-raised-dark`,
   consistent with the document's stated ~5.8:1 — this row's arithmetic is
   fine). The fix is not in question; only the diagnostic table's numbers
   for the *un-fixed* pairs are wrong, and corner chrome was never included
   in the fix instruction (L466–474 only remediates field labels/editorial
   rule and Mote labels) despite sharing the same failing ink token.

**This spec is wrong** (the two failing ratios are arithmetic errors, not
omissions) **and additionally silent** on remediating corner chrome, which
the fix list never mentions despite using the same `ink-quiet-dark` token
flagged as failing one row above it.

**Fix.** Correct DESIGN.md §2's table entries to the recomputed ratios, and
extend the binding resolution to a third point:

> 3. **Corner chrome must also move off `ink-quiet-dark`.** It is prose text
>    content (an identity line and a navigation instruction), not
>    incidental graphical decoration, and is therefore held to the 4.5:1
>    text floor (WCAG 1.4.3), not the 3:1 non-text floor. Raise corner
>    chrome to `ink-label-dark` (`#8A8A94`) on `surface-base-dark`,
>    consistent with the treatment already prescribed for field labels and
>    Mote labels.

---

### S2 — "Incidental ≥3:1" is the wrong WCAG classification for corner chrome and needs correcting at the standard level, not just the number level

**File / lines:** `DESIGN.md` §2 (L461), §7.9 (L856–865).
**WCAG 2.2:** 1.4.3 Contrast (Minimum) (AA) vs 1.4.11 Non-text Contrast (AA).

**Problem.** Independent of S1's arithmetic, the document's classification
of corner chrome as subject to a 3:1 "incidental" floor is a category
error under WCAG 2.2. 1.4.11 (Non-text Contrast) governs UI component
boundaries, states, and graphical objects required to understand content
(e.g., an icon, a focus ring, an input border) — not text. Corner chrome
(`"THOMAS NAVARRO"`, `"scroll ↓ — time runs backward"`) is normal prose
text and is unambiguously subject to 1.4.3's 4.5:1 floor (large-text
exception does not apply at 9.5px/300-weight). Treating it as "incidental"
appears to be inherited from a reasonable instinct — chrome is small and
low-emphasis by design intent (§1 invariant, "spent-almost-nothing"
posture) — but design intent does not change the applicable success
criterion. This is worth calling out as distinct from S1 because fixing
only the arithmetic (a corrected number that happens to clear 3:1) would
still leave the document asserting a floor that is legally/technically the
wrong one, and a future editor tuning tokens against "the floor" recorded
here will tune against 3:1 and ship an AA failure.

**This spec is wrong.**

**Fix.** Delete the "incidental ≥3:1" classification and row-note in §2
entirely; fold corner chrome into the same "≥4.5:1 (AA text)" floor as
field labels and Mote labels, per S1's fix.

---

### S3 — `prefers-reduced-motion` treatment does not address vestibular safety during Rail scroll, only Focus/Condensation

**File / lines:** `EXPERIENCE.md` §6.6 (L566–576).
**WCAG 2.2:** 2.3.3 Animation from Interactions (AAA, but the closest
applicable SC; treat as a hard requirement here given NFR-7's stated
tie-breaker and the product's own stakes framing in §11) and, more directly
applicable at AA, 2.2.2 Pause, Stop, Hide is not engaged (the motion is not
"automatically moving" independent of user scroll — it is scroll-driven —
so 2.2.2 does not strictly apply, but the spirit of the concern is the same
and should be noted) — the operative concern is best framed against the
general reduced-motion expectation WCAG 2.2 AA holds sites to via 1.4.2 is
not applicable either; the correct anchor is that **the product markets
itself on continuous camera motion as its core mechanism**, so treat
`prefers-reduced-motion` here as a product-safety requirement independent
of a single clean SC citation.

**Problem.** §6.6 says reduced motion "shortens durations sharply, removes
orbital rotation and Mote drift, and holds the camera still while a panel
is open." This addresses Condensation and the Focus state. It does **not**
address the Rail itself — the primary, continuous, scroll-coupled camera
translation through 3D space that runs for the entire On-Rail state
(§5.1), which is the single largest source of vestibular trigger content
in the whole product (translation + implied depth + parallax, sustained
over the "plausibly under a minute" journey length noted as untested in
E-G4). "Shortens durations sharply" describes making transitions between
states *faster*, which is orthogonal to and can worsen vestibular
discomfort (rapid position change is often more provocative than slow
continuous motion, not less). The unratified assumption in the sidebar
(E-A7) only mentions Condensation and Focus-state orbital stop; it never
mentions the Rail's continuous fly-through, which is the one motion a
vestibular-sensitive user cannot avoid simply by not Focusing anything —
it happens on ordinary scroll, the default state, to every visitor who
scrolls at all.

**This spec is silent** on the Rail specifically, while appearing (by
covering the other two motion sources) to have covered the topic
completely.

**Fix.** Extend EXPERIENCE.md §6.6:

> Under reduced motion, Rail translation itself is dampened: parallax depth
> cues and any camera roll/tilt are removed, forward velocity is capped at
> a low constant rather than following scroll-velocity-with-mass (§6.2), and
> Client-stop arrivals settle with no overshoot. The Rail does not stop
> being continuous — cuts are still forbidden — but its motion is
> flattened toward a near-linear pan, trading cinematic weight for vestibular
> safety, consistent with NFR-7 (legibility, here read as *usability*, wins
> over awe).

---

### S4 — Reduced motion and the Fallback are two different needs and the spec risks conflating their populations, without actually stating a wrong rule

**File / lines:** `EXPERIENCE.md` §6.6 (L566–576), §10 (L833–866), §11 point
5 and 9 (L893, L906–908).
**WCAG 2.2:** 1.4.10 Reflow (AA, adjacent concern), general AA principle of
providing the full experience under user preference rather than a reduced
one.

**Problem.** The document does the right thing structurally —
`prefers-reduced-motion` gets its own treatment (§6.6) distinct from the
Fallback (§10) — and never states that reduced-motion users should be
routed to the Fallback. That is correct and should be explicitly credited:
this is not a finding of a wrong rule. The gap is that nothing in §10's
routing logic (or E-G2's "Fallback detection mechanism... capability-based,
performance-based, or device-class-based") explicitly **excludes**
`prefers-reduced-motion: reduce` as a signal. Given E-G2 is already marked
a genuine unresolved gap, and given that a plausible naive implementation
of "detect capability before rendering" (§FR-22, §5.7, §10) might fold "user
prefers reduced motion" into the same capability/eligibility check that
also determines Fallback routing (they are, after all, both "does this
visitor get the full 3D thing"), there is a real risk that whoever resolves
E-G2 conflates the two axes: a capable-desktop, motion-sensitive
engineering lead (exactly the target audience, per NFR-4's laptop profile)
could be silently routed to the Fallback instead of receiving the reduced-
motion 3D scene the product is otherwise fully specified to support. The
Fallback is a *content* parity surface (§4.6, §10: "every Project, every
field, every Notable"); it is not specified as a UI/interaction parity
surface (no free flight, no Focus transition, no keyboard index test — see
F1 below), so silently substituting it for reduced-motion users would be a
worse experience than the 3D-scene-with-reduced-motion the spec already
designs for them, not a neutral one.

**This spec is silent** on the interaction between these two axes, which is
exactly the condition under which they get accidentally merged during
implementation.

**Fix.** Add to EXPERIENCE.md §10 or §6.6:

> `prefers-reduced-motion` and Fallback eligibility (E-G2) are independent
> axes and must never be combined into one detection check. A capable
> desktop machine with `prefers-reduced-motion: reduce` set receives the
> full 3D scene, unmodified in content or navigation, with the motion
> treatment specified in §6.6 (extended per S3). It never receives the
> Fallback on the basis of a motion preference alone.

---

### S5 — The Fallback is specified for content parity but not for interaction/navigation parity, which is what "accessibility floor's floor" (§11.9) actually requires

**File / lines:** `EXPERIENCE.md` §4.6 (L341–349), §10 (L833–866), §11 point
9 (L906–908); `DESIGN.md` §7.10 (L867–884, including its own flagged gap
D-G4).
**WCAG 2.2:** 2.4.5 Multiple Ways (AA), 1.3.1 Info and Relationships (A),
2.4.6 Headings and Labels (AA).

**Problem.** §11.9 states: "The Fallback is the accessibility floor's floor
... Any visitor for whom the scene is hostile has a full-quality route to
every word of the content." This is the document's explicit justification
for relying on the Fallback as (part of) the accessibility strategy. But
every specification of the Fallback (§4.6, §10, DESIGN.md §7.10) is phrased
entirely in terms of **content completeness** ("every Project, every
field, every Notable, no truncation") and **visual design parity** ("same
palette, same type ramp"). None of it specifies document structure:
heading levels and hierarchy (is each Client an `<h2>`, each Project an
`<h3>`? — unstated), landmark regions, list semantics for the Client→Project
grouping, or how the Ring-only Deep/Shallow signal (§4.6, DESIGN.md §7.10)
is exposed to a screen reader — DESIGN.md explicitly defers this: "the
Fallback's visual density, chart projection, and how ten Projects across
six Clients are laid out on one flat plate are unspecified" (D-G4, L879).
If the Fallback turns out to be, structurally, a single long scroll with
no headings (plausible under "a conventional scrolling document," §7.4),
it fails 2.4.6/1.3.1 for exactly the screen-reader users it is being relied
upon to serve, and it fails 2.4.5 in spirit — a document a sighted user can
skim in seconds but a screen-reader user can only access linearly, with no
navigation-by-heading, is not equivalent, even if every word is present.
"Content-complete" and "operable by assistive technology" are different
properties and only the first is currently specified.

Separately: §10's routing table sends "any machine that fails detection"
and "all mobile" to the Fallback, but says nothing about how a capable-
desktop screen-reader or switch-access user who does *not* fail capability
detection is meant to reach the Fallback if they need it as an escape
hatch from a 3D scene whose keyboard index (B1) turns out, in
implementation, to be incomplete or broken. §2's "one click from the scene"
promise (L119, L344, L850) is a pointer/visual affordance; nothing confirms
it is itself keyboard-reachable and announced, which would be self-
undermining if missed (the accessible escape route must itself be
accessible).

**This spec is silent** on Fallback document structure and is not wrong
about content parity — but §11.9's claim that the Fallback discharges the
accessibility floor is currently **unsupported** by the rest of the
document, because the properties that would make that claim true
(headings, landmarks, keyboard-reachable route in) are nowhere specified.

**Fix.** Add to EXPERIENCE.md §4.6 (cross-referencing DESIGN.md §7.10 to
close D-G4 jointly):

> The Fallback is a single semantic document: one `<h1>` (site identity),
> one `<h2>` per Client in reading order (§2, present→past), one `<h3>` per
> Project within it, with Deep/Shallow exposed as a text-adjacent state
> (e.g. "carries a Notable" in the heading's accessible name or an adjacent
> `<span>`, not solely a visual Ring) so it survives without CSS or
> perception of a ring shape at all. The one-click route from the scene to
> the Fallback (§2, §4.6) is itself a real, keyboard-reachable, named
> control — present as the first or last item of the destination index
> (B1), not a pointer-only affordance — so that a keyboard or screen-reader
> user encountering a broken or incomplete 3D implementation has the same
> one-click escape a mouse user has.

---

### S6 — Escape's dual meaning (release Focus / return from free flight) is a potential mode-confusion trap at the boundary state

**File / lines:** `EXPERIENCE.md` §7.3 (L616), §11 point 2 (L884–886).
**WCAG 2.2:** 2.1.2 No Keyboard Trap (A) — not violated as stated, but the
ambiguity is adjacent enough to flag; 3.2.2 On Input (A) is the more precise
fit for the ambiguity itself.

**Problem.** §7.3's table gives Escape exactly two behaviours: "Release
Focus. From free flight, return to the Rail." §11.2 restates this as
proof of no keyboard trap. The gap: what does Escape do to a user who is
**simultaneously** in free flight *and* has a Project Focused — the
ordinary case of UJ-2 (§9.2 step 4–5: she free-flies via click-to-fly,
which per §6.5's table is itself one of the three free-flight entry
layers, then Focuses a Project). One Escape press here is overloaded
between two stated behaviours ("release Focus" and "return to Rail from
free flight") and the document does not state which one fires, or whether
it takes two presses (release Focus, then a second Escape to exit free
flight), or whether Focus release *also* silently exits free flight as a
side effect no other trigger in §5.5 mentions. This is not a trap — every
path eventually reaches the Rail — but an unstated precedence order on the
single most important safety key in the whole interaction model (the one
species of finding that most directly damages the "consumer-grade floor"
claim in §11 if it ships ambiguous) is a real risk of the exact keyboard
confusion §11.2 is trying to rule out.

**This spec is silent.**

**Fix.** Add a clause to §5.5 or §7.3:

> Escape is evaluated against the innermost open state first: if a Project
> is Focused, the first Escape releases Focus only (returning to whichever
> of On-Rail or free flight was active beforehand, per §5.5) and does not
> also exit free flight. A second Escape, with no Project Focused, then
> returns from free flight to the Rail. Escape never requires more than
> these two presses to reach the Rail from any reachable state.

---

## Consider

### C1 — "The camera is presentational, the index is the interface" is sound as a principle but needs an explicit statement about what happens to a screen reader during camera motion that the user did *not* request

**File / lines:** `EXPERIENCE.md` §11, closing note (L912–917); E-G5
(L949).
**WCAG 2.2:** 4.1.3 Status Messages (AA).

**Problem.** The document already correctly identifies this as untested and
un-precedented, and explicitly declines to ratify a live-region approach —
that caution is the right call and this is not a Blocker because the
document does not assert a wrong answer, it defers. Worth recording for
the eventual test: the model implies that when a Client is reached via
Rail scroll (which is driven by the *sighted* scroll gesture, not
necessarily by the screen-reader user's own Tab/Enter activation — a
screen-reader user could be using a mouse-and-scrollwheel-plus-screen-
reader combination, or simply scrolling a touchpad while listening), the
camera moves but nothing is announced. That silence is very likely correct
(a `aria-live` region narrating continuous position would be exactly the
"unusable noise" the note already anticipates) but it should be paired
with a stated compensating behaviour: on **arrival** at a new Client stop
via scroll (not only via index activation), something should update the
accessible name or a `aria-live="polite"` **single, debounced** announcement
of the new Client name only — once per stop, not per frame, not describing
the flight — so a screen-reader user scrolling passively (mirroring the
sighted UJ-1 experience of "he scrolls, time runs backward") gets the same
"a new thing has arrived" signal a sighted user gets from the frame
resolving. Without this, a screen-reader user's only way to know Rail
position changed at all is to abandon scrolling entirely and use the index
exclusively — which technically satisfies "every destination is keyboard-
reachable" (§11.1) but silently removes the scroll-driven experience the
rest of the product is built around, for this population only. That may be
an acceptable, honestly-scoped trade-off — but it should be a stated
decision, not a byproduct of silence.

**Fix (for the eventual ratification, not binding today):** When E-G5 is
tested, evaluate a single debounced `aria-live="polite"` announcement of
Client name only, fired on Rail-stop arrival (not mid-transit), capped to
fire at most once per stop regardless of scroll velocity, and confirm with
actual screen-reader testing (NVDA + Chrome at minimum, given NFR-4's
Windows-laptop audience profile) that it does not fire during the
continuous fly-through itself.

---

### C2 — Target size for hover/focus-revealed leader-line labels is unaddressed

**File / lines:** `EXPERIENCE.md` §4.3 (L269–299); `DESIGN.md` §7.3
(L705–741).
**WCAG 2.2:** 2.5.8 Target Size (Minimum) (AA).

**Problem.** The clickable/activatable region is the Body itself (a
circle whose radius "derives from nothing authored" per DESIGN.md §7.1,
meaning small, far, or Shallow-and-old Bodies can be visually tiny), not
the leader-line label that hover/focus reveals. Nothing in either document
states a minimum hit-target radius independent of the Body's rendered
size, or confirms 24×24 CSS px minimum spacing/target per 2.5.8. Given
this is a pointer-primary desktop product (mobile is explicitly
out-of-scope, §7.4), 2.5.8's practical urgency is lower than on a touch
product, and 2.5.8 does carry a documented exception for equivalent
alternatives (the keyboard index, B1, would qualify as an equivalent
means of activation) — which is likely why the spec doesn't address it.
Flagging only because the exception's applicability depends on B1 actually
existing and being genuinely equivalent, not merely present.

**Fix.** Add a line to EXPERIENCE.md §4.3: "A Body's pointer hit-region has
a minimum radius independent of its rendered visual radius, floor TBD at
M1 greybox, sufficient that a Shallow, old, small Body remains reliably
clickable without invoking 2.5.8's equivalent-alternative exception as the
sole compliance path."

### C3 — Redundant Entry (3.3.7) is not applicable to this product and its absence from §11 is correctly not a gap

Checked: the product has no forms, no multi-step process, and the contact
route (§7.5) is a single copy affordance, not data entry. 3.3.7 does not
apply. No finding; recorded to show the criterion was checked rather than
missed.

### C4 — Error Identification / Input Assistance (3.3.1, 3.3.3) not applicable

Checked: §5.7 correctly notes there is no form and near-no error state by
construction; the one genuine error surface (contact route failure, §7.5)
is not detailed enough to assess against 3.3.1/3.3.3 but is low-severity
(a copy-to-clipboard failure, not data loss) and can be deferred to
implementation without a spec-level finding.

---

## Summary table

| ID | Severity | File | WCAG SC | One-line issue |
|---|---|---|---|---|
| B1 | Blocker | EXPERIENCE.md §6.5/§7.3 | 2.1.1, 2.4.3, 4.1.2 | Keyboard index has no stated DOM structure |
| B2 | Blocker | EXPERIENCE.md §11.6 | 4.1.2, 1.1.1 | No accessible name/role attachment for canvas Bodies |
| B3 | Blocker | EXPERIENCE.md §4.4/§11.8 | 1.1.1, 1.3.1, 4.1.2 | Mote "announcement" mechanism unspecified and self-contradictory as stated |
| B4 | Blocker | EXPERIENCE.md §5.4/§5.5/§6.3 | 2.4.3, 2.4.7, 2.4.11 | No stated DOM focus target on Focus entry/release |
| S1 | Should fix | DESIGN.md §2 | 1.4.3 | Contrast table arithmetic wrong; failures worse than stated |
| S2 | Should fix | DESIGN.md §2/§7.9 | 1.4.3 vs 1.4.11 | Corner chrome misclassified as non-text (3:1) instead of text (4.5:1) |
| S3 | Should fix | EXPERIENCE.md §6.6 | vestibular safety | Reduced motion doesn't address the Rail itself, only Focus/Condensation |
| S4 | Should fix | EXPERIENCE.md §6.6/§10 | AA principle | Reduced-motion and Fallback-routing axes need explicit independence |
| S5 | Should fix | EXPERIENCE.md §4.6/§10 | 2.4.5, 2.4.6, 1.3.1 | Fallback spec covers content parity, not structural/navigation parity |
| S6 | Should fix | EXPERIENCE.md §7.3/§11.2 | 3.2.2 | Escape overloaded between Focus-release and free-flight-return with no precedence stated |
| C1 | Consider | EXPERIENCE.md §11 note | 4.1.3 | Live-region-on-arrival worth testing explicitly, not left fully open |
| C2 | Consider | EXPERIENCE.md §4.3 | 2.5.8 | Hit-target floor for small Bodies unaddressed |
| C3/C4 | Consider | — | 3.3.7, 3.3.1/3.3.3 | Checked, not applicable — no finding |
