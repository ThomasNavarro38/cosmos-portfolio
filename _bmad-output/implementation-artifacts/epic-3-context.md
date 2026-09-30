# Epic 3 Context: The Schematic Identity and the Information Layer

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Turn the greybox into a deliberate, monochrome, line-art design system ("Deep Field") and build the information layer, so that a visitor reads the site as intentionally designed and, above all, can tell which Projects carry a written argument (Deep) before opening any of them. The Deep/Shallow signal must be visible at rest on every Project at once and survive compressed screenshots and low-DPI corporate laptops. This epic closes both clauses of the M2 launch gate: a stranger can say what Thomas does and which entries are worth reading. The visual identity is the author's weakest discipline and the highest-variance launch blocker, so it is treated as a first-class deliverable with an explicit definition-of-done audit, not a styling pass at the end.

## Stories

- Story 3.1: Generated design tokens from a single source
- Story 3.2: The stroke and ink ladders applied to the scene
- Story 3.3: The Deep/Shallow signal — Moon and Ring
- Story 3.4: The hover and keyboard-focus affordance
- Story 3.5: Mote tiering and label legibility
- Story 3.6: The information panel
- Story 3.7: The Notable and the editorial rule line
- Story 3.8: Corner chrome and the stateful instruction slot
- Story 3.9: Identity definition-of-done audit

## Requirements & Constraints

- **Legibility wins every conflict.** Where identity, Dwell, or Condensation treatment hurts a reader's ability to read a Notable, the treatment yields.
- **Deep/Shallow signal:** distinguishable in the scene (not only the panel), present at rest, requires no type flag. It must **never** be carried by brightness (already bound to recency) or size (bound to duration).
- **Notable:** 100–150 words of connected prose (problem → constraint → decision with rejected alternative). No lists, bullets, or technology roll-calls; a technology may be named only as the thing chosen or rejected. The full stack is shown only geometrically (Dust/Motes), never in prose or the field table.
- **Real client names ship**, unanonymised. No published criticism of a named Client.
- **Palette is achromatic:** no hue anywhere — no accent, status colour, syntax highlight, or hover tint.
- **No weight above 400** on any glyph; weight is not an emphasis channel.
- **Contrast floor:** Notable prose, panel title, field values ≥ 7:1; field labels, editorial rule, all Mote label tiers, corner chrome, scene labels ≥ 4.5:1. `ink-quiet-dark` fails the floor and must appear on no glyph.
- **Confident voice:** no WIP disclaimer, beta tag, or apologetic copy. Copy lives in exactly five places (Notables + field values, Shallow rule line, two chrome lines, Colophon annotations, contact route) — no tooltips, onboarding, empty states, help text, or captions explaining marks.
- **Opening 15 seconds:** an unprompted viewer registers a real work history, organised rather than listed, deliberately designed.

## Technical Decisions

- **Tokens from one source:** DESIGN.md's YAML frontmatter is the token source of truth. A build step transforms it once into CSS custom properties (DOM) and a typed JS object (scene materials) under `src/tokens/`; neither is hand-transcribed. Frontmatter uses `{group.key}` alias references (e.g. `{colors.stroke-rest-dark}`) that the generator must resolve.
- **Generated files** carry a header banner naming the generator and forbidding hand-editing; committed and diffable.
- **Colour pairs:** bare key = future light theme, `-dark` key = shipped M2 value; emit both so light is a later token swap.
- **Lint ban:** literal hex/rgb/hsl in any component (CSS and scene materials) fails the build.
- **Import boundaries (tooling-enforced):** `tokens/` imports nothing from `src/data/`; renderers read only the layout artifact.
- **Single derivation point:** `isDeep`, `luminanceBand`, and mote tier are computed in `src/derive/` and emitted in `layout.generated.json`. Renderers perform no classification, no mapping computation, no conditional on raw content fields. A missing value means a schema + derivation change, never a local computation. Use derived names (`isDeep`, not `hasNotable`).
- **Token inventory:** surfaces, five stroke steps, five ink steps, `vignette` (= `surface-base` by rule), eleven type roles, spacing 4/8/12/20/28/40/52/56 (no 16, no 24), stroke weights 0.6–1.0px, no radius except true circles.
- **Ladder semantics:** stroke step encodes distance and state, never category. `luminanceBand` modulates only within `stroke-dust`…`stroke-near`; `stroke-active`/`stroke-focus` are camera-state overlays. At most one element per frame carries `stroke-focus`. Strokes and inks never borrow each other's tokens.
- **Vocabulary:** use the glossary terms exactly (Body, Mote, Notable, Deep/Shallow, Moon, Ring, Dust, Focus, Condensation); `satellite` is superseded by `Moon`.

## UX & Interaction Patterns

- **Geometry:** Bodies/Motes are `fill: none` circles; Client Stars have a ~15% filled core dot; ellipses only for orbits; straight single-segment leader lines; Rail drawn at `stroke-dust`. No shadows, glow, bloom, blur, scale-on-hover, or opacity fades on Bodies. Radial vignette 0 at 42% radius → 0.9 at edge.
- **Moon + Ring (Deep only):** Moon = filled dot at `stroke-active`, radius ≈ 0.27× body (min 2.4px), offset ≈ 2× body radius. Ring = continuous concentric circle at `stroke-near`, 0.7px, ≈ 2.2× body radius. The Ring carries the signal when the Moon can't resolve. The Ring means "carries a Notable," never "it opens."
- **Collision rule:** hover/focus draws no ring or new geometry around a Body. It shows a leader line (`stroke-rest`, 0.6px) plus title (`scene-label-project`, `ink-lift`) and one secondary line (role, team size, class); the Body steps to `stroke-active`. Keyboard `:focus-visible` is identical, plus a 1px `stroke-focus` square outline at 3px offset around the **label block**, never the Body. Labels in the outer 12% of the frame re-anchor inward.
- **Motes:** three tiers (2.6/2.1/1.8px) on distinct off-axis orbits at `stroke-dust`; all labels ≥ `ink-label`. Skills are also a DOM list in the panel (no canvas texture, no live region). Nine labels (SNCF) is the tested maximum; structure the angular quota so a degradation rule can be added later.
- **Panel:** `surface-raised`, 1px `surface-edge` left border only, padding 56/56/60, fixed order: kicker (Client), title, reading position, field table (`Role`, `Team`, `Built` — no Skills row), then `release` affordance (word + hairline at the bottom, never a floating X). Prose measure fixed at 56ch; below ~1200px panel width becomes a percentage. Exact vertical rhythm is specified per story.
- **Reading position:** Deep → Notable at `notable-prose` in `ink-prose`, the constraint sentence in `ink-lift` only (inline, not bold/boxed/separated). Shallow → identical editorial rule line on every entry, at `editorial-rule` in `ink-label`, same slot; no skeleton or gap. Promotion to Deep is a data change only.
- **Chrome:** exactly two lines, opposite corners, 40px inset, `chrome` in `ink-label`. Top-left: `THOMAS NAVARRO · the model` (+ Colophon route). Bottom-right stateful slot: `scroll ↓ — time runs backward` (Rail) / `↩ resume the journey` (free flight) / `esc — release` (Focused); a real focusable control when off-Rail or Focused.

## Cross-Story Dependencies

- Depends on Epic 1 (derive pipeline emitting `isDeep`, `luminanceBand`, mote tier, content payload; ESLint import-boundary rules) and Epic 2 (greybox scene, Focus, Condensation, state machine modes consumed by the chrome slot and affordances; DOM index focus model).
- Story 3.1 (tokens + lint ban) precedes every other story. 3.2's ladders underpin 3.3–3.5. 3.6 hosts 3.7's reading position and 3.5's DOM Skill list. 3.9 audits everything and runs last.
- Epic 4's Fallback reuses these tokens and carries the Deep/Shallow signal by Ring alone.
