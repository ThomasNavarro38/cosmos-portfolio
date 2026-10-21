---
title: "Cosmos Portfolio — DESIGN.md (Visual Identity Spine)"
status: final
created: 2026-09-01
updated: 2026-09-01
sources:
  - ../../prds/prd-cosmos-portfolio-2026-09-01/prd.md
  - ../../prfaq-cosmos-portfolio.md
  - ../../briefs/brief-cosmos-portfolio-2026-08-31/brief.md
  - ../../briefs/brief-cosmos-portfolio-2026-08-31/addendum.md
  - ../../briefs/brief-cosmos-portfolio-2026-08-31/inventory-draft.md
  - ./.memlog.md
  - ./.working/direction-03-deep-field.html
  - ./.working/direction-02-draughtsman.html

name: Deep Field
description: >
  The Schematic Identity of Cosmos Portfolio (FR-20). Line-art in a true-neutral
  void. One uniform hairline draws every orbit and every Body; type sits at nine
  and thirteen pixels; there is no chromatic accent anywhere. White is a scarce
  resource, spent only on Focus and on reading prose. Authored as semantic
  light/dark token pairs from the outset; M2 ships dark only.

# ---------------------------------------------------------------------------
# COLORS — flat, kebab-case, hex strings.
# Every `-dark` key is the SHIPPED M2 value, taken from direction-03-deep-field.
# Every bare key is the FUTURE LIGHT THEME value, taken from
# direction-02-draughtsman. Light is not built at M2. It is declared so the
# theme is later a token swap and not a redesign.
# ---------------------------------------------------------------------------
colors:
  # --- surfaces ---
  surface-base: "#F2EFE9"
  surface-base-dark: "#08080A"
  surface-raised: "#E7E3DA"
  surface-raised-dark: "#0D0D10"
  surface-edge: "#DCD7CB"
  surface-edge-dark: "#1D1D22"

  # --- strokes: the five-step luminance ladder that replaces elevation ---
  stroke-dust: "#BCB6A8"
  stroke-dust-dark: "#1D1D22"
  stroke-rest: "#8C8579"
  stroke-rest-dark: "#2C2C33"
  stroke-near: "#5C574D"
  stroke-near-dark: "#45454E"
  stroke-active: "#2E2B25"
  stroke-active-dark: "#B6B6BE"
  stroke-focus: "#16150F"
  stroke-focus-dark: "#F2F2F4"

  # --- ink: the five-step type ladder ---
  ink-faint: "#BCB6A8"
  ink-faint-dark: "#2C2C33"
  ink-quiet: "#8C8579"
  ink-quiet-dark: "#5E5E68"
  ink-label: "#5C574D"
  ink-label-dark: "#8A8A94"
  ink-prose: "#2E2B25"
  ink-prose-dark: "#B6B6BE"
  ink-lift: "#16150F"
  ink-lift-dark: "#F2F2F4"

  # --- vignette: the atmospheric term. Same hex as surface-base by rule. ---
  vignette: "#F2EFE9"
  vignette-dark: "#08080A"

typography:
  fontFamily:
    sans: '"Helvetica Neue", Helvetica, Arial, sans-serif'
    sans-light-theme: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif'
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

  chrome:
    fontFamily: "{typography.fontFamily.sans}"
    fontSize: "9.5px"
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: "0.34em"

  scene-label-client:
    fontFamily: "{typography.fontFamily.sans}"
    fontSize: "11px"
    fontWeight: 300
    lineHeight: 1.3
    letterSpacing: "0.36em"

  scene-label-project:
    fontFamily: "{typography.fontFamily.sans}"
    fontSize: "12px"
    fontWeight: 300
    lineHeight: 1.3
    letterSpacing: "0.12em"

  scene-label-secondary:
    fontFamily: "{typography.fontFamily.sans}"
    fontSize: "9.5px"
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: "0.17em"

  mote-label:
    fontFamily: "{typography.fontFamily.sans}"
    fontSize: "9.5px"
    fontWeight: 300
    lineHeight: 1.2
    letterSpacing: "0.16em"

  panel-kicker:
    fontFamily: "{typography.fontFamily.sans}"
    fontSize: "9.5px"
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: "0.4em"

  panel-title:
    fontFamily: "{typography.fontFamily.sans}"
    fontSize: "23px"
    fontWeight: 200
    lineHeight: 1.35
    letterSpacing: "0.01em"

  notable-prose:
    fontFamily: "{typography.fontFamily.sans}"
    fontSize: "16px"
    fontWeight: 300
    lineHeight: 1.85
    letterSpacing: "0"

  editorial-rule:
    fontFamily: "{typography.fontFamily.sans}"
    fontSize: "13.5px"
    fontWeight: 300
    lineHeight: 1.8
    letterSpacing: "0"

  field-label:
    fontFamily: "{typography.fontFamily.sans}"
    fontSize: "9.5px"
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: "0.24em"

  field-value:
    fontFamily: "{typography.fontFamily.sans}"
    fontSize: "13.5px"
    fontWeight: 300
    lineHeight: 1.65
    letterSpacing: "0"

rounded:
  none: "0"
  # Every rectangular surface in the product is square-cornered. The only round
  # geometry in the system is celestial and therefore a true circle.
  circle: "50%"

spacing:
  hair: "4px"
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "28px"
  xl: "40px"
  xxl: "52px"
  xxxl: "56px"
  panel-pad-x: "56px"
  panel-pad-top: "56px"
  panel-pad-bottom: "60px"
  measure-prose: "56ch"
  measure-rule: "48ch"
  measure-title: "22ch"

components:
  stroke-weight:
    hairline: "0.7px"
    hairline-leader: "0.6px"
    body-near: "0.8px"
    body-client: "0.9px"
    body-focus: "1.0px"

  star-client:
    stroke: "{colors.stroke-focus-dark}"
    strokeWidth: "{components.stroke-weight.body-client}"
    coreFill: "{colors.stroke-focus-dark}"
    coreRadiusRatio: 0.15
    label: "{typography.scene-label-client}"
    labelColor: "{colors.ink-lift-dark}"

  star-client-receded:
    stroke: "{colors.stroke-rest-dark}"
    strokeWidth: "{components.stroke-weight.hairline}"
    label: "{typography.scene-label-secondary}"
    labelColor: "{colors.ink-label-dark}"

  planet-shallow:
    stroke: "{colors.stroke-rest-dark}"
    strokeWidth: "{components.stroke-weight.hairline}"
    fill: "none"
    moon: "none"
    ring: "none"

  planet-deep:
    stroke: "{colors.stroke-rest-dark}"
    strokeWidth: "{components.stroke-weight.hairline}"
    fill: "none"
    moon: "{components.moon-notable}"
    ring: "{components.ring-notable}"

  moon-notable:
    fill: "{colors.stroke-active-dark}"
    radiusRatio: 0.27
    minRadius: "2.4px"
    orbitOffsetRatio: 2.0

  ring-notable:
    stroke: "{colors.stroke-near-dark}"
    strokeWidth: "{components.stroke-weight.hairline}"
    dash: "none"
    radiusRatio: 2.2
    geometry: "continuous concentric circle"

  ring-notable-chart:
    stroke: "{colors.ink-label-dark}"
    strokeWidth: "{components.stroke-weight.hairline}"
    dash: "none"
    radiusRatio: 2.2
    geometry: "continuous concentric circle"

  affordance-hover:
    geometry: "leader line plus label — NEVER a ring"
    leaderStroke: "{colors.stroke-rest-dark}"
    leaderStrokeWidth: "{components.stroke-weight.hairline-leader}"
    label: "{typography.scene-label-project}"
    labelColor: "{colors.ink-lift-dark}"
    subLabel: "{typography.scene-label-secondary}"
    subLabelColor: "{colors.ink-label-dark}"
    bodyStroke: "{colors.stroke-active-dark}"

  affordance-focus-ring:
    geometry: "same leader-and-label as hover, plus a 2px offset square-cornered outline on the label block"
    outlineStroke: "{colors.stroke-focus-dark}"
    outlineWidth: "1px"
    outlineOffset: "3px"

  orbit-line:
    stroke: "{colors.stroke-rest-dark}"
    strokeWidth: "{components.stroke-weight.hairline}"
    fill: "none"

  mote-orbit-line:
    stroke: "{colors.stroke-dust-dark}"
    strokeWidth: "{components.stroke-weight.hairline}"

  mote:
    fillTier1: "{colors.stroke-active-dark}"
    fillTier2: "{colors.ink-label-dark}"
    fillTier3: "{colors.ink-label-dark}"
    radiusTier1: "2.6px"
    radiusTier2: "2.1px"
    radiusTier3: "1.8px"
    label: "{typography.mote-label}"

  dust-field:
    particleFill: "{colors.stroke-dust-dark}"
    particleRadius: "0.6px – 0.9px"
    mediumGradientStop0: "{colors.stroke-rest-dark}"
    mediumGradientOpacity0: 0.42
    mediumGradientOpacity1: 0

  vignette:
    fill: "{colors.vignette-dark}"
    innerStop: "42%"
    innerOpacity: 0
    outerStop: "100%"
    outerOpacity: 0.9

  panel:
    background: "{colors.surface-raised-dark}"
    borderLeft: "1px solid {colors.surface-edge-dark}"
    padding: "{spacing.panel-pad-top} {spacing.panel-pad-x} {spacing.panel-pad-bottom}"
    radius: "{rounded.none}"
    shadow: "none"

  panel-field-row:
    borderTop: "1px solid {colors.surface-edge-dark}"
    paddingY: "{spacing.sm}"
    gap: "{spacing.lg}"
    labelWidth: "74px"
    label: "{typography.field-label}"
    labelColor: "{colors.ink-label-dark}"
    value: "{typography.field-value}"
    valueColor: "{colors.ink-prose-dark}"

  notable-block:
    color: "{colors.ink-lift-dark}"
    liftedSentenceColor: "{colors.ink-lift-dark}"
    restSentenceColor: "{colors.ink-prose-dark}"
    fontWeight: 300
    measure: "{spacing.measure-prose}"

  panel-release:
    label: "release"
    typography: "{typography.chrome}"
    color: "{colors.ink-label-dark}"
    colorHover: "{colors.ink-prose-dark}"
    rule: "12px"
    ruleHover: "20px"
    ruleColor: "{colors.stroke-rest-dark}"
    position: "panel-bottom-left"

  colophon-derivation:
    ruleLabel: "{typography.field-label}"
    ruleLabelColor: "{colors.ink-label-dark}"
    value: "{typography.field-value}"
    valueColor: "{colors.ink-prose-dark}"
    derivedColor: "{colors.ink-lift-dark}"

  colophon-json:
    typography: "{typography.field-value}"
    keyColor: "{colors.ink-lift-dark}"
    valueColor: "{colors.ink-prose-dark}"
    punctuationColor: "{colors.ink-label-dark}"
    background: "{colors.surface-raised-dark}"
    borderLeft: "1px {colors.surface-edge-dark}"
    syntaxColoring: "none — luminance only"

  corner-slot-instruction:
    typography: "{typography.chrome}"
    color: "{colors.ink-label-dark}"
    inset: "40px"
    stateful: true

  editorial-rule-block:
    color: "{colors.ink-label-dark}"
    typography: "{typography.editorial-rule}"
    measure: "{spacing.measure-rule}"
    marginTop: "34px"

  chrome-corner:
    typography: "{typography.chrome}"
    color: "{colors.ink-label-dark}"
    inset: "40px"
---

# DESIGN.md — Cosmos Portfolio Visual Identity

**This spine wins.** Where any mock, wireframe, screenshot or working HTML in
`.working/` disagrees with this document, this document is correct and the mock
is stale. The directions were probes; this is the contract.

Peer document: [EXPERIENCE.md](./EXPERIENCE.md), which owns behaviour, states,
motion and accessibility. This document owns nothing that moves.

Vocabulary is the PRD §3 Glossary, used verbatim throughout: Company, Client,
Project, Skill, Body, Mote, Notable, Deep Project, Shallow Project, Weight,
Focus, Condensation, Rail, Shot, Dwell, Schematic Identity, Colophon, Fallback,
First Paint, The Forward. A synonym introduced here is a discipline violation.

---

## 1. Brand & Style

The Schematic Identity is line-art in a void. It is a deliberate idiom with its
own rigour — a deep-field plate, not an untextured asset awaiting a pass
(FR-20). Nothing on screen is decorated. Objects read because of the emptiness
around them, not because of anything applied to them.

The posture is **spent-almost-nothing**. One uniform hairline draws every orbit
and every Body. There is no chromatic accent anywhere in the system — not one
hex in the palette has a hue. Type sits at nine and thirteen pixels and rises
above sixteen only inside the reading panel. Annotation is one label per object:
no graticule, no ticks, no console furniture, no frame. The chosen direction is
[direction-03-deep-field.html](./.working/direction-03-deep-field.html), ranked
first by the author over the denser instrument and catalogue idioms, which
reads as a preference for restraint over apparatus.

`[ASSUMPTION: The restraint-over-apparatus read is inferred from the ranking
(03 > 01 > 04 > 02), not stated by the author. It governs every close call in
this document — when in doubt, remove the mark. Confirm on first review.]`

Two rules hold the identity together and both are inherited, not invented here:

- **NFR-7 — legibility outranks awe.** Where this document's own aesthetic
  conflicts with a reader's ability to read a Notable, the aesthetic loses. A
  more beautiful, less legible version of this site is a worse version.
- **FR-20 — no disclaimer.** No "work in progress" note appears anywhere, in
  any register, including microcopy. The identity must be confident or it is
  not this identity.

### The M3 attachment surface

M2 ships no textures, no photographic lighting and no post-processing (§8.2).
The realism pass is M3 and it must attach without invalidating this system. It
attaches at exactly three points, and nowhere else:

1. **Body fill.** Every Body is `fill: none` at M2. A texture map takes that
   slot. Stroke, ring, moon and label geometry are unaffected.
2. **The Dust medium.** The radial-gradient medium becomes a volumetric.
   Particle count, colour and the never-fog rule (FR-15) carry over unchanged.
3. **The vignette.** The vignette term is replaced by real optics. Its role —
   see §5 — is already exactly what a lens does.

Everything else in this file — the stroke ladder, the ink ladder, the type
ramp, the label system, the panel — is the identity and survives M3 intact.

---

## 2. Colors

Every colour in this system is achromatic. That is not a limitation carried
from the greybox; it is the identity. A hue introduced anywhere would become
the loudest thing on screen and would immediately read as decoration in a
product whose whole argument is structure.

The palette is a **luminance ladder in two registers** — one for stroke, one
for ink — plus three surfaces and one atmospheric term.

### Light/dark token pairs — read this before using any value

Every colour is declared as a semantic pair. The bare key (`surface-base`) is
the **light theme**; the `-dark` suffixed key (`surface-base-dark`) is the
**dark theme**.

**M2 ships dark only.** The light values are real, not placeholders — they are
lifted from
[direction-02-draughtsman.html](./.working/direction-02-draughtsman.html),
retained by ratified decision as the future light theme. They are present so
that shipping light later is a token swap rather than a redesign. Do not
hardcode a hex anywhere in the build; reference the token. A build that
hardcodes `#08080A` has already broken the light theme before it exists.

`[NOTE FOR UX] Direction 02 pairs its palette with an editorial serif and a
graded (not uniform) line weight. The colour swap alone will not reproduce
direction 02 — the light theme will need a typography and stroke-weight
decision of its own when it is scheduled. The `sans-light-theme` family token
is recorded for that purpose and is unused at M2.`

### The surfaces

| Token | Dark | Light | Story |
|---|---|---|---|
| `surface-base` | `#08080A` | `#F2EFE9` | The void. Page ground and scene ground, one value for both — the scene does not sit *on* a page, it *is* the page. True neutral, warmed by nothing. **Not used for:** any panel, any card, anything that needs to read as separate from space. |
| `surface-raised` | `#0D0D10` | `#E7E3DA` | The information layer's barely-raised plane. Five points of luminance above the void — just enough that the panel reads as a distinct plane without reading as a floating card. **Not used for:** anything inside the 3D scene. If it appears in the scene, the scene has grown a UI. |
| `surface-edge` | `#1D1D22` | `#DCD7CB` | Hairline separators: the panel's left border, the rules between field rows, the outer frame of a Fallback plate. **Not used for:** emphasis. A separator that is noticed has failed. |

### The stroke ladder

Five steps. Every line and every Body outline in the scene takes one of them,
and the step encodes **distance and state**, never category.

| Token | Dark | Light | Story |
|---|---|---|---|
| `stroke-dust` | `#1D1D22` | `#BCB6A8` | The faintest visible stroke. Dust particles, Mote orbit paths, and the Rail itself. The Rail is drawn at the very bottom of the ladder deliberately: it is the spine of the whole product and it must be nearly invisible, because a visible track would turn a journey into a diagram. **Not used for:** any Body. |
| `stroke-rest` | `#2C2C33` | `#8C8579` | The standard hairline. Client orbits, Project orbits, Shallow and Deep Project Bodies at rest, leader lines. This is the default; a stroke with no reason to be another step is this one. |
| `stroke-near` | `#45454E` | `#5C574D` | One step nearer. The Notable ring, and a Body a rank closer to the camera than the resting field. **Not used for:** the hover step on a Body, which raises that Body one step from its own resting value rather than to this fixed token (see §7). |
| `stroke-active` | `#B6B6BE` | `#2E2B25` | A Body the camera has moved toward but has not Focused; the Moon that marks a Notable; the brightest Mote tier. The step below white. |
| `stroke-focus` | `#F2F2F4` | `#16150F` | **The scarce resource.** The Focused Body, the Client Star the camera is heading for, and nothing else in the scene. The rule is absolute: *white is spent once per frame*. If two things are white, the frame has no subject. |

**On the collision between the stroke ladder and FR-3.** FR-3 binds brightness
to recency. The ladder above is *state*, not data. These two must not be
conflated in implementation: a Body's data-derived brightness modulates within
the resting band (~~`stroke-dust` … `stroke-near`~~ the two steps `stroke-rest`,
`stroke-near` — *superseded 2026-10-14 by ruling 4b-i, story 3.9: `stroke-dust`
is used for no Body, as its row above says*); `stroke-active` and
`stroke-focus` are reserved for camera state and are applied on top. A recent
Shallow Project is bright *for a resting Body*; it never reaches white while
unfocused. This is the discipline that stops the mock's misleading composition
(where the biggest and brightest planet happened also to be the Deep one) from
inverting on real data.

### The ink ladder

Five steps, mirroring the strokes. Type never borrows a stroke token and a
stroke never borrows an ink token, even where the hex is the same — the two
ladders are separately tunable and will diverge at M3.

| Token | Dark | Light | Story |
|---|---|---|---|
| `ink-faint` | `#2C2C33` | `#BCB6A8` | A label on a Body at the far edge of the frame. Deliberately at the threshold of legibility: it says *there is something there* and nothing more. **Not used for:** anything a reader is expected to read. |
| `ink-quiet` | `#5E5E68` | `#8C8579` | The quietest legible text. Corner chrome, field labels, the editorial rule line on a Shallow Project, secondary scene annotation. |
| `ink-label` | `#8A8A94` | `#5C574D` | Standard label text. The default for a scene label and for a mid-tier Mote. |
| `ink-prose` | `#B6B6BE` | `#2E2B25` | Reading prose at rest, and field values in the panel. Everything the reader reads that is not being lifted. |
| `ink-lift` | `#F2F2F4` | `#16150F` | The Notable prose, the panel title, the Focused Body's label, and the **lifted constraint sentence**. Same hex as `stroke-focus` and the same discipline: scarce. |

### The atmospheric term

| Token | Dark | Light | Story |
|---|---|---|---|
| `vignette` | `#08080A` | `#F2EFE9` | Always identical to `surface-base`, by rule. It is not a colour decision; it is the ground applied as a radial gradient over the frame at 0 opacity inside 42% radius rising to 0.9 at the edge. It replaces elevation — see §5. |

### Contrast floor (visual accessibility)

The audience is technical professionals judging the author's competence. An
unreadable contrast ratio undercuts the product's own claim, so these are hard
minimums, not targets. Behavioural accessibility lives in EXPERIENCE.md.

| Text role | Token pair | Ratio on ground | Floor |
|---|---|---|---|
| Notable prose, panel title | `ink-lift-dark` on `surface-raised-dark` | ~17.4:1 | ≥ 7:1 (AAA) |
| Field values, prose at rest | `ink-prose-dark` on `surface-raised-dark` | ~9.5:1 | ≥ 7:1 (AAA) |
| Field labels, editorial rule | ~~`ink-quiet-dark`~~ → `ink-label-dark` on `surface-raised-dark` | **5.47:1** | ≥ 4.5:1 — **passes** |
| Mote labels (tier 3) | ~~`ink-quiet-dark`~~ → `ink-label-dark` on `surface-base-dark` | **5.85:1** | ≥ 4.5:1 — **passes** |
| Corner chrome | ~~`ink-quiet-dark`~~ → `ink-label-dark` on `surface-base-dark` | **5.85:1** | ≥ 4.5:1 (it is text) — **passes** |
| Scene labels, secondary | `ink-label-dark` on `surface-base-dark` | **5.85:1** | ≥ 4.5:1 — passes |
| Chart link underline (index, chrome) — non-text | ~~`stroke-near-dark`~~ (2.11:1) → `ink-label-dark` on `surface-base-dark` | **5.85:1** | ≥ 3:1 (WCAG 1.4.11) — **passes** |
| Chart Ring (`ring-notable-chart`) — non-text | ~~`stroke-near-dark`~~ (2.11:1) → `ink-label-dark` on `surface-base-dark` | **5.85:1** | ≥ 3:1 (WCAG 1.4.11) — **passes** |
| Chart Notable glyph marker — non-text | ~~`stroke-near-dark`~~ (2.11:1) → `ink-label-dark` on `surface-base-dark` | **5.85:1** | ≥ 3:1 (WCAG 1.4.11) — **passes** |
| Chart focus outline — non-text | `stroke-focus-dark` on `surface-base-dark` | **17.90:1** | ≥ 3:1 (WCAG 1.4.11, 2.4.11) — passes |

**Correction, recorded rather than quietly amended.** An earlier draft of this
table stated the three failing pairs at ~3.6:1 and ~3.8:1 and classified corner
chrome as incidental non-text at a 3:1 floor. All four figures were wrong. The
real ratios for `ink-quiet-dark` (`#5E5E68`) are **2.92:1** on
`surface-raised-dark` and **3.12:1** on `surface-base-dark` — materially worse
than reported — and corner chrome is text, so it never had a 3:1 allowance.
`ink-quiet-dark` is consequently **not used for text anywhere in the product.**
It survives in the palette for the Dust medium and for non-meaningful strokes
only. Any future use of it on a glyph is a defect.

**Two failures, both real, both from the direction-03 mock.** Resolve as
follows, and this is binding:

1. **Field labels and the editorial rule line must be raised to `ink-label`**
   (`#8A8A94`, ~5.8:1 on `surface-raised-dark`). The editorial rule is the
   Shallow Project's entire answer to R-3; setting it below the contrast floor
   would make the site's stated thesis the least readable line in the panel.
   That is the exact opposite of the intent.
2. **Every Mote label must sit at `ink-label` or above.** The three-tier Mote
   luminance in the mock exists to manage density, not to hide labels. Tier
   separation is carried by **Mote dot radius and orbit distance**, not by
   pushing label ink below the floor. See §7.

`[ASSUMPTION: The ratios above are computed against the flat token values.
The vignette darkens the frame edge by up to 0.9 opacity, which will pull any
scene label near the frame edge below its computed ratio. Proposed rule: no
readable scene label is composed inside the outer 12% of the frame; labels
that would land there are re-anchored inward by the leader line. Needs
verification on the greybox at M1.]`

---

## 3. Typography

One family. `"Helvetica Neue", Helvetica, Arial, sans-serif` — a light
grotesque, weight 200–300 throughout, never above 400. There is no second
family at M2, with one exception: the Colophon's JSON body is set in the system
monospace stack, `typography.fontFamily.mono`, and nowhere else (§7.11). The
serif recorded in `typography.fontFamily.sans-light-theme` is for the future
light theme only and must not appear in the dark build.

**Weight is not an emphasis channel.** Bold does not exist in this system. This
is not stylistic fastidiousness — it is load-bearing for the ratified Notable
typesetting (§7), where the constraint sentence is lifted by *ink*, not by
weight, so that it reads as writing rather than as a filled-in form.

### The ramp

| Role | Size | Weight | Tracking | Where |
|---|---|---|---|---|
| `chrome` | 9.5px | 300 | 0.34em | Two corner lines per frame. Never a third. |
| `scene-label-client` | 11px | 300 | 0.36em | A Client Star's name. Widest tracking in the system — a Star's name should read as a plate designation, not a word. |
| `scene-label-project` | 12px | 300 | 0.12em | A Project's title on hover or Focus. Nearly untracked, because it is a sentence fragment and must read at speed. |
| `scene-label-secondary` | 9.5px | 300 | 0.17em | The sub-line under a hovered Project: role, team size, class. |
| `mote-label` | 9.5px | 300 | 0.16em | Skill names on condensed Motes. |
| `panel-kicker` | 9.5px | 300 | 0.4em | The Client name above the panel title. Widest tracking in the panel; it is a label, not a heading. |
| `panel-title` | 23px | **200** | 0.01em | The Project title. The only 200-weight in the system. Large and thin, so it occupies the frame without shouting. Measure capped at 22ch, which forces a two-line title and makes the 40px of silence beneath it read as intentional. |
| `notable-prose` | 16px | 300 | 0 | The Notable. 1.85 line height, 56ch measure. |
| `editorial-rule` | 13.5px | 300 | 0 | The Shallow Project's stated convention. Smaller than the Notable and set to a shorter 48ch measure so it reads as an aside in the author's voice, not as a truncated paragraph. |
| `field-label` | 9.5px | 300 | 0.24em | `Role`, `Team`, `Built`. Uppercase. |
| `field-value` | 13.5px | 300 | 0 | The values. |

**There is no `Skills` field row.** The Dust is the display (FR-10, ratified).
Any field table that lists technologies has reintroduced the duplication the
Dust mechanic exists to remove, and the direction-03 mock — which still shows a
`Skills` row in screens C and D — is stale on this point. Delete the row.

### Rules

- **Never above 400 weight.** Emphasis is ink, size, and silence.
- **Tracking scales inversely with size.** 9.5px chrome is tracked to 0.34em;
  16px prose is untracked. Small type is a plate marking and needs air; reading
  type is a sentence and does not.
- **One label per object in the scene.** A Body gets a title and, when hovered
  or Focused, one secondary line. Never three.
- **Uppercase is for plate designations only** — Client names, field labels,
  corner chrome. Project titles and all prose are sentence case, because they
  are language.
- **The measure is a hard constraint, not a suggestion.** 56ch on the Notable
  is what makes 16px at 1.85 readable in a side panel. Widening the panel does
  not widen the measure.

---

## 4. Layout & Spacing

The spacing scale is a 4px base with a deliberately sparse set of steps: 4, 8,
12, 20, 28, 40, 52, 56. There is no 16 and no 24. Fewer available gaps means
fewer arbitrary ones.

### The two zones

The product has exactly two layout zones and they never overlap.

**The scene** occupies the full viewport and has no layout in the CSS sense —
composition is the camera's job, governed by Shots (FR-17) and specified in
EXPERIENCE.md. The scene's only fixed furniture is **two corner chrome lines,
inset 40px, in opposite corners**. Never three. Never one in the middle.

**The panel** is a fixed side column, `surface-raised`, with a 1px
`surface-edge` left border and no other boundary. Padding 56/56/60. It is the
only rectilinear element in the product.

The ratified Focus behaviour is **side panel plus camera recompose as one
combined move** (see EXPERIENCE.md §Motion and Camera). The visual consequence
that belongs here: **the scene is never occluded**. The panel does not overlay;
it takes column width and the camera composes the Focused Body and its Motes
into the remaining half. A modal, a scrim, a dimmed backdrop, or any treatment
that hides the scene behind the panel is forbidden — the Motes must stay
visible while the Notable is read, because their being visible *is* the answer
to "where is the stack?".

`[ASSUMPTION: Panel width 560px fixed on desktop, from the direction-03 mock's
grid (1fr 560px). At 560px with 56px padding the prose measure lands at
~56ch at 16px, which is the target. Below ~1200px viewport width the panel
becomes a percentage (proposed 46%) with the measure clamped at 56ch and the
padding stepping down to 40px. Untested; verify at M1.]`

### Vertical rhythm inside the panel

The panel's spacing is the argument. Reading order is enforced by silence:

| Gap | Size | Why |
|---|---|---|
| kicker → title | 22px | Tight. The Client name belongs to the title. |
| title → first prose | **40px** | The largest gap above the fold. Nothing competes with the first sentence of the Notable. |
| prose ¶ → prose ¶ | 20px | |
| prose → editorial rule (Shallow) | 34px | Smaller than title→prose, larger than ¶→¶. The rule is an aside, and the gap says so before the type does. |
| last prose → field table | **52px** | The field table is the record, and the record comes second. This gap is what makes the panel put the argument first. |
| field row → field row | 12px + 1px rule | |

**The Shallow panel is not shorter by omission.** It is the Deep panel with a
different final block in the reading position. Its total height differs because
its content differs, and that difference is a signal that the entry is briefer,
not that something failed to load. No skeleton, no placeholder, no gap.

---

## 5. Elevation & Depth

**There are no shadows in this product.** Not on the panel, not on a label, not
on a Body, not on the Fallback. A drop shadow implies a light source and a
surface, and this system has neither: it is line-art in a void. A single
`box-shadow` anywhere breaks the idiom more completely than a wrong hex would.

Depth is carried by four things instead, in this priority order:

1. **Stroke luminance.** The primary depth channel. The five-step stroke ladder
   *is* the z-axis. A Body at `stroke-dust` is far; one at `stroke-focus` is
   here. Four receding Client Stars stepping down through the ladder need no
   label and no perspective cue to read as receding — that is the whole
   mechanism, and it is why the ladder has five steps rather than three.
2. **Emptiness.** Mass and distance read because of how much nothing surrounds
   an object. The negative space is not leftover; it is the material. An
   object crowded by other objects has lost its depth cue regardless of its
   stroke value.
3. **The vignette.** A radial gradient of `vignette` over the whole frame — 0
   opacity to 42% radius, rising to 0.9 at the edge. It does three jobs at
   once: it establishes a centre without drawing one, it prevents the frame
   corners from reading as a cut-off rectangle (which would make the void look
   like a box), and it is the exact term that M3's real lens optics will
   replace. It is also the reason the "no readable label near the frame edge"
   rule in §2 exists.
4. **Tonal layering of surfaces.** Five points of luminance between
   `surface-base` and `surface-raised` is the entire elevation vocabulary of
   the information layer. It is deliberately at the edge of perceptibility: the
   panel should read as *a plane in the same space*, not as a card sitting on
   top of the scene.

Depth is never carried by scale-on-hover, blur, opacity fades on Bodies, or
any form of glow. Glow in particular is forbidden: it is the single most common
way a schematic space scene degrades into a screensaver.

---

## 6. Shapes

The shape vocabulary is four items and nothing else.

- **The circle.** Every Body, every Mote, every Moon. A true circle, never an
  ellipse. Bodies are drawn `fill: none` at M2 (the M3 texture attachment
  point) with a small filled core dot at ~15% of body radius on Client Stars
  only, which is what makes a Star read as emitting rather than as an outline.
- **The ellipse.** Every orbit, and only orbits. An orbit is a circle seen at
  an angle; that is the only reason an ellipse exists in this system. Orbit
  ellipses are drawn at `stroke-rest` on the same hairline as everything else —
  there is no graded orbit weight. Mote orbits are drawn at `stroke-dust` and
  are rotated off-axis (the mock uses −16°, +26°, −46°) so that a Focused
  Project's Motes read as a cloud settling rather than as a planetary system,
  which would falsely imply hierarchy among Skills.
- **The straight line.** Leader lines only. Always a single straight segment
  from Body edge to label baseline. **No elbows, no dog-legs, no curves.** An
  elbowed leader is a diagram convention and this is not a diagram. The one
  exception is the Rail itself, which is a long continuous bezier at
  `stroke-dust` — the only curve in the product that is not an orbit.
- **The square-cornered rectangle.** The panel, the field-row rules, the
  Fallback's plate edges, and the keyboard focus outline. Radius is `0`
  everywhere. There is not one rounded corner in this product. A rounded
  rectangle is app furniture, and app furniture is what this design refuses.

No polygons. No icons. No glyphs beyond the type family — including no arrow
glyph in the corner chrome, which the mock uses (`scroll ↓`) and which is the
one place a text arrow is permitted, because it is a scroll instruction and
must not be mistaken for a decoration.

---

## 7. Components

### 7.1 Client Star

A circle at `stroke-focus` weight 0.9px when it is the Star the camera is
heading for; at `stroke-rest`/`stroke-near` weight 0.7–0.8px otherwise. A
filled core dot at ~15% radius. Label below at `scene-label-client`, tracked to
0.36em, in `ink-lift` when it is the subject and `ink-quiet` or `ink-faint`
when receded. Radius derives from nothing authored — a Star's scale is a
function of its Projects, not a design decision.

**One Star is white per frame. Never two.**

### 7.2 Project Planet — the Deep/Shallow signal

This is the most consequential component in the system, because it carries the
second clause of the M2 gate: *can a stranger tell which entries are worth
reading?*

**Ratified: the signal is MOON + RING, layered.** Two independent structural
channels, both derived from Notable presence alone.

| | Shallow Project | Deep Project |
|---|---|---|
| Body | circle, `stroke-rest`, 0.7px, `fill:none` | identical |
| Moon | **none** | filled dot, `stroke-active`, radius ≈ 0.27 × body radius (min 2.4px), offset ≈ 2 × body radius |
| Ring | **none** | continuous concentric circle, `stroke-near`, 0.7px, radius ≈ 2.2 × body radius |

The **Moon** is the in-world truth — "a planet with no moon" made literal, per
the Glossary. The **Ring** is the legibility aid: at client-stop distance a
2.4px dot is not reliably resolvable, and the ring is what carries the signal
across a poor screen, a compressed screenshot pasted into Slack (FR-24), and a
low-DPI corporate laptop (NFR-4). The redundancy is deliberate and is what
makes the signal greyscale-safe and colour-blind-safe by construction — both
channels are structural, neither is chromatic.

**Size and brightness are NOT available for this signal.** FR-3 binds mass to
duration and brightness to recency. A long-ago Shallow Project can legitimately
be the largest Body in a system and a recent Shallow Project the brightest. Any
implementation that leans on scale or luminance to mark a Deep Project will
invert on real data. This is a hard constraint, and it is the correction of
what the direction-03 mock accidentally demonstrated.

`[NOTE FOR UX] The direction-03 mock's screen-B caption reads "a ring means it
opens." That caption is wrong under the ratified decisions and must not survive
into any build. The ring means **carries a Notable**. Everything opens.`

### 7.3 The selectable affordance — and the collision rule

**Ratified: nothing at rest. The affordance is hover-revealed.** A resting
frame carries no selection marks at all; that silence is the direction.

> **THE COLLISION RULE — binding on both spines.**
> The Deep Project's rest-state Ring and the hover affordance **must not both
> be rings.** If hover draws a ring around any Body, a hovered Shallow Project
> becomes visually indistinguishable from a resting Deep Project, and the
> Deep/Shallow signal — the second clause of the M2 gate — silently inverts
> under the visitor's own cursor.

**Adopted resolution (Sally's recommendation): hover brings the LABEL on a
leader line, not a shape.**

On hover, a Project renders:

- a single straight leader line, `stroke-rest` at 0.6px, from Body edge to
  label anchor, no elbow;
- the Project title at `scene-label-project` in `ink-lift`;
- one secondary line at `scene-label-secondary` in `ink-quiet` carrying role,
  team size, and class;
- the Body's own stroke steps from `stroke-rest` to `stroke-active` — **a
  luminance step, not a new shape.**

No new geometry is added around the Body. The Ring stays exclusively the
Notable's mark and its meaning never becomes ambiguous. As a bonus, hover
delivers information (what this Project is) rather than merely delivering
clickability, which is the more useful thing to spend the interaction on.

**The `:focus` equivalent is non-optional.** Keyboard traversal is the
accessibility path for free flight, so a Body reached by keyboard renders the
identical leader-and-label treatment, plus a 1px `stroke-focus` square-cornered
outline at 3px offset around the label block. The outline is on the *label*,
not on the Body — putting a keyboard outline around the Body would reintroduce
the ring collision through the back door. Focus visibility is never suppressed;
`:focus-visible` semantics are specified in EXPERIENCE.md.

### 7.4 Mote — and the label density problem

A Mote is a Skill condensed. A small filled dot plus its label, always
together, on an off-axis hairline orbit at `stroke-dust`.

**The label is not optional and requires no second interaction.** Ratified: a
Mote carries its label automatically on Condensation — no hover, no tooltip, no
click. Motes without labels do not deliver information and would reduce the
mechanic to ornament.

**This is the hard problem of the Focus state.** The SNCF entry carries nine
Skills, so nine labels orbit one Body simultaneously, in motion, over a Notable
the reader is trying to read. The strategy has three parts, in priority order:

1. **Tiering by dot radius and orbit distance, never by ink below the floor.**
   Three tiers exist — 2.6px / 2.1px / 1.8px dot radius on three distinct
   orbits. Tier is derived from Skill prominence on that Project.
   `[ASSUMPTION: Tier derives from how many Projects share the Skill — the
   most-shared Skills are the author's actual through-line and sit on the
   inner orbit. This is derivable from the existing relation with no new
   authored field, satisfying FR-4's single-knob constraint. Not ratified;
   the alternative is JSON array order, which is authored and therefore rots.]`
   All three tiers sit at `ink-label` or above, per the contrast floor in §2.
2. **Angular quota.** The orbit ring is divided into slots and no two labels
   occupy adjacent slots on the same orbit. With three orbits and nine Skills
   this is comfortable; the system must degrade gracefully above twelve.
   `[NOTE FOR UX] No entry above nine Skills exists in the inventory today.
   The degradation rule above ~12 is unspecified and is a genuine gap.]`
3. **Label side-flip and radial anchoring.** A label anchors outward from the
   Body — left of the dot on the left half of the orbit, right on the right
   half — so no label ever crosses the Focused Body or the panel edge. A label
   that would land under the panel column is suppressed and its Mote is
   re-slotted on the next frame, never truncated with an ellipsis.

**Motes are never connected to their Project by a drawn line** (FR-14). Orbit
is the relation. A connector would make this a network diagram in a space
costume, which the target audience would read as exactly that.

### 7.5 Dust at rest

Two components, both at `stroke-dust`:

- **The medium.** Broad radial gradients centred on each Client system, from
  `stroke-rest` at 0.42 opacity to 0 at the edge. This is what makes fifteen
  objects read as *space* rather than as *sparse*.
- **The particles.** Individual circles at 0.6–0.9px radius, `stroke-dust`
  fill, scattered sparsely — the mock uses fourteen across a
  1120×700 frame.

**Dust never obscures a Body and never reads as fog** (FR-15). If a Body's
stroke ladder step is ambiguous against the Dust behind it, the Dust is too
dense. Density at rest is a §13 Q6 item and is tuned at M1 on the greybox — see
Open Items.

### 7.6 The panel

`surface-raised`, 1px `surface-edge` left border, no other boundary, no radius,
no shadow. Vertical rhythm per §4. Contains, in order:

1. `panel-kicker` — the Client name.
2. `panel-title` — the Project title, 23px/200, capped at 22ch.
3. **The reading position** — a Notable on a Deep Project, the editorial rule
   on a Shallow one. Same slot, always.
4. The field table — `Role`, `Team`, `Built`. No `Skills` row (see §3).
5. `panel-release` — the close affordance. See §7.6a.

### 7.6a The panel release affordance

EXPERIENCE.md's Focus-release behaviour depends on a control the panel spec did
not previously carry. It is specified here rather than left implied, because an
unspecified close control becomes a 44px grey circle with an X in it, and that
belongs to a different product.

- **Form.** A text affordance, not an icon and not a glyph in a box: the word
  `release` set in `{typography.chrome}` at `{colors.ink-label-dark}`, preceded
  by a 12px hairline rule at `{colors.stroke-rest-dark}`.
- **Position.** Bottom of the panel, after the field table, left-aligned to the
  panel's text column. It sits *below* the content because it is the end of the
  reading, not a dismissal hovering over it.
- **States.** Hover and `:focus-visible` raise it to
  `{colors.ink-prose-dark}` and extend the hairline to 20px. No fill, no box,
  no radius.
- **Never** a floating X, never top-right, never overlapping the scene, never
  an icon without its word. The panel is a document, and documents end.

`[ASSUMPTION: The word is "release" rather than "close" because Focus is a
state the scene holds, not a window the visitor opened. Not ratified.]`

### 7.7 The Notable block — ratified typesetting

**One block, with the constraint sentence typographically lifted.**

- The whole Notable is `notable-prose`, 16px/300, 1.85, 56ch measure, in
  `ink-prose`.
- The **one sentence carrying the constraint** is set in `ink-lift` — brighter
  ink and nothing else.
- **NOT bold.** **NOT labelled.** **NOT indented, boxed, ruled, or given its
  own paragraph.** It stays inside the flow of the paragraph.

This serves the reader's four-second constraint sanity-check — the constraint
is FR-8's entire falsifiability substitute for absent metrics, so it must be
findable at a scan — while preserving the PRFAQ's "a paragraph." It reads as
writing. A labelled constraint would read as a filled-in form and would destroy
the one thing the Notable is for.

**Authoring constraint created by this decision:** every Notable must place its
constraint in one findable, liftable sentence. This is a content rule for the
remaining ~9 entries, not merely a design rule.

`[NOTE FOR UX] The approved SNCF Notable currently splits its constraint across
a clause inside a longer sentence — "documentation was absent or years stale"
sits mid-sentence. It does not lift cleanly as specified. Either the sentence
is re-cut at authoring time, or the lift granularity is redefined to a clause,
which weakens the four-second scan. Resolve at the content pass; do not resolve
it by adding a label.]`

### 7.8 The editorial rule block — Shallow Projects

One line in the author's voice, in the reading position where the Notable would
be, at `editorial-rule` (13.5px/300, 1.8, 48ch measure) in `ink-label` — raised
from the mock's `ink-quiet` per the contrast floor in §2.

Working text: *"Entries carry a written argument only where there was an
argument to have."*

This converts an absence into the site's thesis at the exact point a reader
notices it. In a design built from emptiness, a missing block leaves no visible
hole — the page is already empty by intent — so the risk is not that it looks
broken; the risk is that it reads as an excuse. That is a voice problem and is
owned by EXPERIENCE.md.

`[ASSUMPTION: Identical wording on every Shallow Project — all ~7 of them. A
convention repeated is a convention; a convention reworded is a defence.
Varying the wording per entry was rejected on principle. Showing it once per
session was considered and not chosen. Needs cold-read validation at M0.]`

### 7.9 Corner chrome

Two lines per frame, in opposite corners, inset 40px, at `chrome` in
`{colors.ink-label-dark}`. **Corner chrome is text and takes the 4.5:1 floor,
not the 3:1 incidental floor** — it was previously specified at `ink-quiet`
(2.92:1) and misclassified as non-text. It carries the only instruction on
screen; a visitor who cannot read it cannot use the product.

Left-top carries identity, and the Colophon route sits with it:
`THOMAS NAVARRO · the model`. The route belongs to authorship rather than to
features — it says who made this and how, which is why it shares the identity
slot instead of claiming one of its own. Right-bottom carries the single active
instruction, stateful per the table below.

**Never three lines. Never a persistent HUD.** If a third piece of chrome is
needed, something in the scene has failed to communicate and the fix is in the
scene. *[Except, reconciled 2026-10-14 (story 3.19): the DOM index entry revealed
by `:focus-visible` (ruling 8a, story 3.9) draws while it holds keyboard focus. It
is not chrome: the index is visually hidden otherwise, and only the one focused
entry shows.]*

**The free-flight return does not add a third line — it replaces the second.**
EXPERIENCE.md requires an always-present return affordance while off-Rail, and
the right-bottom slot is already spent on the active instruction. The resolution
is that the slot is *stateful*: it carries whatever single instruction is live.

| State | Right-bottom slot reads |
|---|---|
| On-Rail | `scroll ↓ — time runs backward` |
| Free flight | `↩ resume the journey` |
| Focused | `esc — release` |

One slot, one live instruction, always the one that applies. This keeps the
two-line rule intact and removes the need for a control that persists through
states where it means nothing. The affordance is a real focusable control in
free-flight and Focused states, not decorative text — its accessible name is the
action, and it is reachable in the DOM order defined by EXPERIENCE.md §11.1 P1.

### 7.10 The Fallback

The Fallback (FR-22) inherits every token in this file. It is a flat star chart
and it is content-complete — every Project, every field, every Notable, no
truncation. It is **a designed view, not an apology**: same palette, same type
ramp, same square corners, same absence of shadow.

Its one differing rule: the Deep/Shallow signal cannot rely on a 3D Moon, so on
the Fallback the **Ring** carries the signal alone, drawn around the Project's
chart marker. This is exactly why the ratified signal is two redundant channels
rather than one.

The chart's non-text indicators — the index and chrome link underline, the Ring
(`components.ring-notable-chart`) and the Notable glyph's marker — take
`ink-label` (5.85:1), because `stroke-near` measures 2.11:1 on the page ground,
under the 3:1 non-text floor; the scene's `ring-notable` keeps `stroke-near`
(Thomas, ruling Q1 (b), 2026-10-20, story 4.10).

`[NOTE FOR UX] The Fallback's visual density, chart projection, and how ten
Projects across six Clients are laid out on one flat plate are unspecified. The
memlog records the Fallback's requirements (content parity, designed quality,
one-click reachability, preferred surface for date navigation) but no visual
treatment was designed. This is a genuine gap and the second-largest visual
deliverable in M2 after the scene itself. See PRD §13 Q9.]`

### 7.11 The Colophon

The Colophon (FR-21) is a static surface outside the scene showing the real JSON
and the three mapping rules annotated against real values. It is a conventional
document in the same type system as the panel: not a plate, not a drawn surface.
It is the one place in the product where the schematic idiom gives way to a
document, and the choice is deliberate. It exhibits evidence, and evidence is
read, not composed.

- **Ground.** `{colors.surface-base-dark}`. Same void as the scene, so the
  transition does not feel like a different site.
- **Measure.** `{spacing.measure-prose}` for prose. The JSON block is exempt and
  may run to its natural width inside a horizontally scrollable container — code
  that wraps arbitrarily is code that cannot be read.
- **The derivations.** Each of the three rules is a row: rule name in
  `{typography.field-label}` at `{colors.ink-label-dark}`, the input value and
  the output value in `{typography.field-value}` at `{colors.ink-prose-dark}`,
  with the derived quantity lifted to `{colors.ink-lift-dark}`. The lift is the
  same device the Notable uses — the eye goes to the consequence.
- **The JSON.** `{typography.field-value}` at `{colors.ink-prose-dark}` on
  `{colors.surface-raised-dark}`, 1px `{colors.surface-edge-dark}` left border,
  no radius, no shadow — the same treatment as the panel, because it is the same
  kind of thing: the record, shown.
- **Syntax setting is luminance only.** Keys at `{colors.ink-lift-dark}`, values
  at `{colors.ink-prose-dark}`, punctuation and structure at
  `{colors.ink-label-dark}`. **No syntax colouring.** The palette is achromatic
  everywhere else; a page that introduces four hues to highlight a data file
  would break the identity at the exact moment it is arguing for the author's
  consistency.
- **No illustration.** The Colophon does not draw a small version of the scene
  to explain itself. The scene is one click away.

This is the one surface where a monospaced family is defensible, for the JSON
body only.

`[ASSUMPTION: JSON is rendered in a monospaced family — the system UI mono
stack — at 12px/1.7 in `ink-prose` on `surface-raised`, with the three mapping
rules set in `field-label`/`field-value` beside the values they act on. Not
ratified; see PRD §13 Q11.]`

`[ASSUMPTION: The JSON is rendered inline on the page rather than linked as a
downloadable file, keeping the evidence in front of the reader. Not ratified;
see PRD §13 Q11.]`

### 7.12 The link preview image

FR-24 makes shareability a designed property. The preview image is composed
from the same system: the opening frame at `surface-base`, one white Client
Star, the Rail at `stroke-dust`, corner chrome. It must not overstate what a
mobile visitor receives — a mobile visitor gets the Fallback, so the preview
must be honest about being a still, not a promise of an interactive scene.

`[NOTE FOR UX] "Honest without being self-deprecating" is a real tension here
and no treatment was decided. The forbidden move is any disclaimer (FR-20).
Genuine gap.]`

---

## 8. Do's and Don'ts

**Do**

- Spend white once per frame. One subject, always.
- Draw every line at 0.7px unless it is a Body outline (0.8–1.0px) or a leader
  (0.6px).
- Let emptiness do the work of emphasis. Removing a mark is almost always the
  correct fix.
- Reference tokens, never hexes. The light theme depends on it.
- Keep the Deep/Shallow signal structural and redundant — Moon *and* Ring.
- Keep every Mote label above the contrast floor.
- Set the constraint sentence in brighter ink, inside the paragraph.
- Square every corner.

**Don't**

- **No shadows.** Not one, anywhere, at any milestone.
- **No hue.** Not an accent, not a status colour, not a syntax highlight, not a
  hover tint. The palette is achromatic by design and one hue would become the
  loudest thing in the product.
- **No glow, no bloom, no lens flare at M2.** These are M3 post-FX and applying
  them early is the fastest route from schematic to screensaver.
- **No ring on hover.** The collision rule in §7.3 is absolute.
- **No bold.** Weight never exceeds 400.
- **No rounded corners.**
- **No connector lines between a Project and its Motes** (FR-14).
- **No Skills row in the field table.** The Dust is the display.
- **No third line of corner chrome, no HUD, no minimap, no persistent nav bar.**
  *[Except the index entry revealed by `:focus-visible` while it holds keyboard
  focus — ruling 8a, story 3.9; reconciled 2026-10-14, story 3.19.]*
- **No scrim, modal, or dimmed backdrop behind the panel.** The scene is never
  occluded.
- **No "work in progress" disclaimer, badge, beta tag, or apologetic microcopy**
  anywhere, in any surface, including the Fallback and the link preview
  (FR-20).
- **No skeleton screens or empty-state graphics on a Shallow Project.** Nothing
  is missing; a different block is present.
- **No size or brightness carrying the Deep/Shallow signal.** They are bound to
  duration and recency (FR-3) and will invert on real data.
- **No label caption explaining a mark.** "A ring means it opens" is exactly
  the kind of microcopy this system must not need, and it is now factually
  wrong besides.

---

## Open Items

Every unratified proposal and genuine gap in this document, in one place.
`[ASSUMPTION]` items carry a proposed value and need ratification.
`[NOTE FOR UX]` items are gaps where nothing upstream gave a value.

### Assumptions requiring ratification

| # | Item | § | PRD Q |
|---|---|---|---|
| D-A1 | Restraint-over-apparatus is the governing read of the direction ranking | §1 | — |
| D-A2 | No readable scene label composed inside the outer 12% of the frame (vignette contrast) | §2 | — |
| D-A3 | Panel width 560px fixed desktop; 46% with 56ch clamp below ~1200px | §4 | — |
| D-A4 | Mote tier derives from Skill share-count across Projects, not JSON order | §7.4 | Q6 |
| D-A5 | Identical editorial-rule wording on all ~7 Shallow Projects | §7.8 | Q5 |
| D-A6 | Colophon JSON rendered inline rather than linked as a downloadable file | §7.11 | Q11 |

### Gaps — nothing upstream to work from

| # | Item | § | PRD Q |
|---|---|---|---|
| D-G1 | Light theme needs its own typography and stroke-weight decision; colour swap alone will not reproduce direction 02 | §2 | — |
| D-G2 | The approved SNCF Notable's constraint does not lift cleanly as one sentence | §7.7 | §15 content pass |
| D-G3 | Mote label degradation strategy above ~12 simultaneous labels | §7.4 | Q6 |
| D-G6 | Colophon page layout — how the JSON block and the three derivations sit together. Last unillustrated surface. | §7.11 | Q11 |
| D-G5 | Link preview composition: honest about the Fallback without a disclaimer | §7.12 | — |

### Resolved since drafting

| # | Item | Resolution |
|---|---|---|
| ~~D-G4~~ | Fallback visual treatment | **Closed.** Rendered as [`.working/keyscreen-fallback.html`](.working/keyscreen-fallback.html). Time is the axis — horizontal on desktop, transposed to vertical on phone. Deep/Shallow carried by three redundant structural channels: ring on the plate marker, ring repeated per index row, and a real `Notable` text column. Skills are shown (the prohibition is on duplicating the Dust; the Fallback has no Dust to duplicate, and content parity outranks it). Vignette dropped — the plate has no centre and every corner carries content. |
| ~~Colophon form~~ | FR-21 launch requirement | **Closed.** §7.11 — a conventional document rendering the live JSON, entered from the left-top identity chrome. Syntax setting is luminance only. |

### Deferred to M1 greybox tuning — specify shape and ratio, never milliseconds

These are numbers this document deliberately does not invent. The PRD directs
that they are cheapest to tune on the greybox at M1.

| # | Item | Shape this document fixes | PRD Q |
|---|---|---|---|
| D-T1 | Dust density at rest | Ratio, not count: dense enough that fifteen Bodies read as *space*, sparse enough that no Body's stroke-ladder step is ambiguous against it. The fog threshold is the ceiling. | Q6 |
| D-T2 | Condensation and Decay timing | Fast — faster than the reader's decision to look. Condensation delivers information that was asked for; the reader must not wait to read. Decay is the same curve reversed (FR-13), one tuning pass. | Q6 |
| D-T3 | Dwell ratio, Deep vs Shallow | A ratio, not a duration. Deep must be *measurably* longer and must read as deliberate, never as stalling. | Q7 |
| D-T4 | First Paint budget | The principle — nothing gates the first frame, no splash, no consent, no click-to-enter — is adopted. **The number (2.5s) is unratified** and is carried, not adopted. | Q1 |

### Owned by EXPERIENCE.md, recorded here for cross-reference

Focus trigger and release (Q15), Fallback detection mechanism (Q9), default
Shot template (Q14), free-flight boundaries and return (Q8), and sequence-level
pacing across a run of Shallow Projects (§15, unowned upstream).
