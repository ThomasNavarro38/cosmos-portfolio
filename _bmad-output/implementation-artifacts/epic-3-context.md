# Epic 3 Context: The Schematic Identity and the Information Layer

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Turn the greybox into a deliberate, monochrome, line-art design system ("Deep Field") and build the information layer, so a visitor reads the site as intentionally designed and can tell which Projects carry a written argument (Deep) before opening any of them. The Deep/Shallow signal is visible at rest on every Project and survives compressed screenshots and low-DPI laptops. This closes both clauses of the M2 launch gate. Identity has its own definition-of-done audit. Stories 3.10–3.19, from the retrospectives, make enforcement automatic (CI, pins, bundle assertion, build-path validation, boundaries, test infrastructure), fix navigation defects, and close what the Epic 3 re-judgement needs.

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
- Story 3.10: CI pipeline and packaging enforcement
- Story 3.11: The bundle assertion over bundler output
- Story 3.12: Data validation on the build path and the gate's content checks
- Story 3.13: Boundary table and boundary parser hardening
- Story 3.14: Test infrastructure
- Story 3.15: Navigation and panel correctness fixes
- Story 3.16: Scene colour management
- Story 3.17: No technology names in field values
- Story 3.18: The Mote label pass and the degradation ruling
- Story 3.19: Spec and doc reconciliation, and housekeeping

## Requirements & Constraints

- **Legibility wins every conflict.** Identity, Dwell or Condensation treatment yields wherever it hurts reading.
- **Deep/Shallow signal:** in the scene, at rest, no type flag; **never** carried by brightness (recency) or size (duration).
- **Notable:** 100–150 words of connected prose. A technology appears only as the thing chosen or rejected; the stack is shown only geometrically. **Field values describe what was built and never name a Skill/technology**; a content check enforces this.
- **Achromatic:** no hue anywhere. **No weight above 400.**
- **Contrast:** Notable prose, panel title, field values ≥ 7:1; labels, rule line, Mote labels, chrome ≥ 4.5:1. `ink-quiet-dark` on no glyph. Drawn scene whites must match their token values (tone mapping must not shift them).
- **Copy lives in five places only** (Notables + field values, Shallow rule line, two chrome lines, Colophon, contact route); no tooltips, captions or apologetic copy.
- **Enforcement is by tooling, not recall:** every failure mode named is caught by a test or gate step, and each check is proven to bite with a mutation test. Rulings (field values, Mote degradation, `railPosition`) are Ask First.

## Technical Decisions

- **Stack, exact pins:** TypeScript 7.0.x, Vite 8.2.x, React 19.x, @react-three/fiber 9.7.x and drei 10.7.x (stable — not the v10/v11 alphas; the pairing is load-bearing), three 0.185.x, d3-force-3d 3.0.6, zustand 5.0.x, Node 24 LTS (build only). Every dependency pinned to an exact version; `zod` is build-time only (devDependency).
- **Build path:** `validate → derive+solve → vite build`. `solve` is a separate script `build` never invokes; `build` fails if the committed artifact is missing or off-schema. Validation rejects unknown fields.
- **Artifact:** `layout.generated.json` is the versioned contract every surface reads. Committed, never hand-edited; the solve is byte-deterministic. The gate re-asserts invariants from the artifact alone.
- **Single derivation point:** all classification lives in `src/derive/`. No module outside `src/derive/` imports `src/data/`; renderers read only the artifact, with no conditional on raw content fields.
- **Thin entry:** `src/shell/entry` has no React, no Three; scene, Fallback, Colophon and solver are separate lazy chunks. This is a property of bundler output, so the build asserts the entry chunk's graph never reaches Three, R3F, the solver, `src/derive/` or `src/data/` and stays under a byte budget. Epic 4 depends on this.
- **Boundaries:** import bans are gate rows (ESLint or equivalent); an import the parser cannot resolve fails rather than passes.
- **Tokens from one source:** DESIGN.md frontmatter (with `{group.key}` aliases) generates CSS custom properties and a typed JS object under `src/tokens/`. Literal colours in any component fail the build.
- **Ladders:** stroke step encodes distance and state, never category; at most one `stroke-focus` per frame.
- **Vocabulary:** glossary terms exactly; `Moon`, never `satellite`.

## UX & Interaction Patterns

- **Geometry:** `fill: none` circles; no shadow, glow, blur, scale-on-hover or opacity fades on Bodies.
- **Moon + Ring (Deep only):** Moon = filled dot at `stroke-active`; Ring = concentric circle at `stroke-near`. The Ring means "carries a Notable", never "it opens".
- **Hover/focus:** no new geometry around a Body — a leader line plus title and one secondary line; Body steps to `stroke-active`. `:focus-visible` adds a 1px `stroke-focus` outline around the **label block**.
- **Motes:** three tiers on off-axis orbits at `stroke-dust`; labels ≥ `ink-label`; Skills also listed in the panel DOM. Projects carry 7–25 Skills; labels must stay legible and still as orbits turn, including under reduced motion.
- **Panel:** `surface-raised`, left `surface-edge` border; field table `Role`, `Team`, `Built`; `release` at the bottom. Deep → Notable with the constraint sentence in `ink-lift`; Shallow → the identical editorial rule line in the same slot.
- **Chrome:** two lines, opposite corners, 40px inset. Bottom-right is a stateful slot (Rail / free flight / Focused).
- **Navigation:** the camera never cuts on refocus mid-release; panel close follows the actual slide duration; no Rail input binds when the scene is absent.

## Cross-Story Dependencies

- Depends on Epic 1 (derive pipeline, artifact schema, gate, boundary rules) and Epic 2 (scene, Focus, Condensation, state machine, DOM index).
- 3.1 precedes the identity stories; 3.9 audits them.
- 3.10 puts the gate in CI, which the checks from 3.11–3.14 and 3.17 then run under. 3.14's shared walker/stripper and out-of-tree mutants serve every later scan test. 3.18 splits the label pass out of `mote-model.ts` before changing behaviour.
- 3.16, 3.17 and 3.19's Epic 3 reconciliation are required before Epic 3 is re-judged.
- Epic 4 needs 3.11's bundle assertion and reuses these tokens, carrying the Deep/Shallow signal by Ring alone.
