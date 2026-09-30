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

# design.fixture.md

A frozen copy of DESIGN.md's frontmatter, taken when story 3.1 shipped. The generator's tests mutate this, not the live DESIGN.md, so a routine design edit breaks only the one test that compares the committed outputs with the live source. Never update it to track DESIGN.md.
