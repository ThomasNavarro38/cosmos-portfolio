# Epic 5 Context: The Colophon

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Build the Colophon: a conventional document, outside the 3D scene, where a visitor can inspect the actual data file the site reads and the layout artifact emitted from it, see the three mapping rules worked against real values from that file, and read what the site deliberately does not have (no backend, no CMS, no position overrides, no per-entry camera work). The site's transfer claim is that it shows how its author works, and the architecture is the evidence for that, not the graphics. The claim holds only if a visitor can check the reasoning. A page that describes the model in prose fails, however well written. A page that shows the real file, with `mass ← duration` worked on a real Project with its real numbers, passes. This is a launch requirement. Its one observable is that a technical reader who has never seen the site can describe at least one architectural decision it makes.

## Stories

- Story 5.1: The Colophon as a fourth lazy chunk
- Story 5.2: The three mapping rules, worked on real entities
- Story 5.3: The data file rendered in full
- Story 5.4: Stating what is not there
- Story 5.5: The live re-solve, honestly framed

## Requirements & Constraints

- **Show, do not paraphrase.** The real `career.json` is present in full: not summarised, not excerpted, not behind a fold. Every byte the scene reads can be read here. The emitted `layout.generated.json` is exhibited too, with the mapping rules between the two files, so the transformation itself is what the visitor inspects.
- **Exactly three mapping rules, each worked on a named real entity** with its input value and resulting visual property: mass from duration, brightness from recency, and distance from the Rail from `weight`. There is no fourth rule.
- **Nothing is authored twice.** Every value on the page comes from the data at render time, and no number is hand-maintained anywhere. When an entry changes and the site is rebuilt, the Colophon reflects it with no edit to the Colophon.
- **State the absences and contracts in prose:** no backend, no CMS, no position overrides, no per-entry camera work. Also state the entity-relative Shot contract (Shots name entities, never coordinates) and the no-position-overrides rule. This is the only place on the page where prose does the work.
- **Voice:** concrete and unboastful. Make no discountable claims ("improved maintainability" and the like), do not narrate how the site was built, do not boast about difficulty, and use no "work in progress" or apologetic copy. Every statement must be checkable against the file rendered on the page. It is not a features list: it shows how the layout is derived, then stops. The Colophon's annotations on the mapping rules are one of the product's five sanctioned copy places, so the page carries no tooltips, help text or captions explaining marks.
- **Live re-solve framing:** the browser re-solve may legitimately settle differently from the committed Node solve. Determinism is a same-environment guarantee. The page must say explicitly that the re-solve is a demonstration of the mechanism, not a reproduction of the shipped layout. Concede this in a clause and move on: no banner, no disclaimer, no apologetic register.

## Technical Decisions

- **Fourth lazy chunk.** `colophon/` is dynamically imported, loaded on navigation only, and never reached by the entry chunk's module graph. The solver is a separate lazy chunk that loads on demand when the visitor triggers the live re-run, never on the entry path or from either renderer. The CI bundle assertion enforces the entry graph and its size budget.
- **Data arrives as emitted data.** The raw `career.json` is copied into the build output as an asset and fetched by the chunk. It is never statically imported, which would hoist it into a bundle.
- **Import boundaries.** No module outside `src/derive/` may import from `src/data/`, and that includes `colophon/`. The colophon may reach `src/derive/` (the solver) only through a dynamic import. The ESLint and CI boundary checks cover it.
- **The committed artifact stays authoritative.** No renderer reads the re-solve's output. `layout.generated.json` remains the only layout any renderer reads. All derived quantities shown on the page should come from the emitted artifact; nothing outside `src/derive/` recomputes a mapping rule.
- **Routing.** Scene, Fallback and Colophon are the only three addressable routes, all resolved in `shell/`. A route change is a real history entry, so Back works. Surface position, meaning the Client stop the scene was left at, is saved on departure and restored on return. Focus is not a route.

## UX & Interaction Patterns

- **Document, not canvas.** The ground is the dark base surface (the same void as the scene, so the page does not feel like a different site). Prose sits at the standard prose measure, with real headings in order. Derivations go in a real `<table>` with real headers. The JSON goes in a `<pre>` with an accessible name. None of the canvas accessibility preconditions apply: a screen-reader user gets exactly what a sighted user gets.
- **Derivation row:** the rule name is set at `field-label` in `ink-label`, and the input and output values at `field-value` in `ink-prose`. The **derived quantity lifts to `ink-lift`**, the same device the Notable uses.
- **JSON block:** set at `field-value` on `surface-raised`, with a 1px `surface-edge` left border, no radius and no shadow. It sits in a horizontally scrollable container and runs to its natural width (exempt from the prose measure). **Syntax setting is luminance only:** keys at `ink-lift`, values at `ink-prose`, punctuation and structure at `ink-label`. No hues. It uses the system monospace stack, and monospace appears nowhere else in the product. The size (12px/1.7) and the choice to render inline rather than as a download link are assumptions that have not been ratified. A link to the raw file may sit alongside the block.
- **No illustration:** the page never draws a small version of the scene. The scene is one click away.
- **Entry:** the left-top corner chrome reads `THOMAS NAVARRO · the model`. This keeps the two-line chrome rule (never a third line). The Fallback carries the same route in its own chrome.
- **Return:** the scene resumes at the stop it was left at, never at First Paint. A visitor sent back to the start has been punished for looking.
- **Page layout is still open.** No layout mock exists for how the JSON block and the derivations sit together on the page.
- **Token naming:** the story text names the light-mode surface tokens, while the design spec uses the `-dark` variants (`surface-base-dark`, `ink-lift-dark` and so on). Use the dark variants, which is what the rest of the product renders.

## Cross-Story Dependencies

- Builds on Epic 4's routing: the `/colophon` route, the history-backed router, the `colophon-host` lazy edge with its error boundary, corner chrome and the arrival/focus handling already exist. The Colophon surface itself is currently a placeholder `<h1>` that 5.1 fills in.
- Reads Epic 1's outputs: the committed layout artifact and the deterministic solver. 5.5 reuses the solver through its own chunk.
- 5.1 (the chunk, emitting the data asset, route and return) comes first. 5.2, 5.3 and 5.4 compose the page. 5.5 depends on 5.1's chunk isolation.
