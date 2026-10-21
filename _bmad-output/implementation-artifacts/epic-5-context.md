# Epic 5 Context: The Colophon

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Build the Colophon: a conventional document, outside the 3D scene, where a visitor can inspect the actual data file the site reads and the layout artifact emitted from it, see the three mapping rules worked against real values from that data, and read what the site deliberately does not have (no backend, no CMS, no position overrides, no per-entry camera work). The site's transfer claim is that it shows how its author works, and the evidence is the architecture, not the graphics. That claim holds only if a visitor can check the reasoning. A page that describes the model in prose fails however well it is written. A page that shows the real file, with `mass ← duration` worked on a real Project with its real numbers, passes. This is a launch requirement. Its one observable: a technical reader who has never seen the site can describe at least one architectural decision it makes.

## Stories

- Story 5.1: The Colophon as a fourth lazy chunk
- Story 5.2: The three mapping rules, worked on real entities
- Story 5.3: The data file rendered in full
- Story 5.4: Stating what is not there
- Story 5.5: The live re-solve, honestly framed

## Requirements & Constraints

- **Show, do not paraphrase.** The authored `career.json` is present in full: not summarised, not excerpted, not behind a fold. Every byte the scene reads can be read here. The emitted `layout.generated.json` is exhibited too, with the mapping rules between the two, so the transformation itself is what the visitor inspects.
- **Exactly three mapping rules**, each worked on a named real entity with its input value and resulting visual property: mass from duration, brightness from recency, distance from the Rail from `weight`.
- **Nothing is authored twice.** Every value on the page comes from the data at render time. No number is hand-maintained anywhere. After an entry changes and the site is rebuilt, the Colophon reflects the change with no edit to the Colophon.
- **State the absences and contracts in prose:** no backend, no CMS, no position overrides, no per-entry camera work. Also state the entity-relative Shot contract (Shots name entities, never coordinates) and the no-position-overrides rule. This is the one place on the page where prose does the work, because an absence cannot be shown by rendering data.
- **Voice:** concrete and unboastful. No discountable claims ("improved maintainability" and the like), no narrating how the site was built, no boasting about difficulty, no "work in progress", beta or apologetic copy. Every statement must be checkable against the file rendered on the page. It is not a features list: it shows how the layout is derived, then stops. The annotations on the mapping rules are one of the product's five sanctioned places for copy, so there are no tooltips, help text or captions explaining marks.
- **Live re-solve framing:** the browser re-solve may settle differently from the committed Node solve, because determinism is only guaranteed within one environment. The page must say plainly that the re-solve demonstrates the mechanism and does not reproduce the shipped layout. Concede this in a clause and move on: no banner, no disclaimer, no apologetic register.

## Technical Decisions

- **Fourth lazy chunk.** `colophon/` is dynamically imported, loads on navigation only, and the entry chunk's module graph never reaches it. The solver is its own lazy chunk. It loads on demand when the visitor triggers the live re-run, and never on the entry path or from either renderer. The CI bundle assertion enforces the entry graph and its size budget, and it checks bundler output, not source intent.
- **Data arrives as emitted data.** Both exhibited files are copied into the build output as assets and fetched by the chunk. They are never statically imported, which would hoist them into a bundle. Hosting stays static: no backend, server function or runtime data path.
- **Import boundaries.** No module outside `src/derive/` may import from `src/data/`, and that includes `colophon/`. The only route from the colophon to the solver in `src/derive/` is a dynamic import. The lint and CI boundary checks enforce this.
- **Single derivation point.** Mapping rules are computed once in `src/derive/` and resolved in the emitted artifact. The Colophon reads derived quantities from the artifact and never recomputes a rule. If a value is missing from the versioned artifact schema, add it to the schema and the derivation, never compute it locally.
- **The committed artifact stays authoritative.** No renderer reads the re-solve's output. `layout.generated.json` is the only layout any renderer reads. It is generated, committed and never hand-edited.
- **Routing.** Scene, Fallback and Colophon are the only three addressable routes, all resolved in `shell/`. A route change is a real history entry, so Back works. The Client stop the scene was left at is saved on departure and restored on return. Focus is not a route.

## UX & Interaction Patterns

- **Document, not canvas.** The ground is `surface-base-dark`, the same void as the scene, so the page does not feel like a different site. Prose sits at `measure-prose` (56ch) under real headings in order. The derivations go in a real `<table>` with real headers. Each JSON file goes in a `<pre>` with an accessible name. None of the canvas accessibility preconditions apply: a screen-reader user gets exactly what a sighted user gets.
- **Derivation row** (`colophon-derivation`): rule name at `field-label` in `ink-label-dark`, input and output values at `field-value` in `ink-prose-dark`. The **derived quantity lifts to `ink-lift-dark`**, the same device the Notable uses.
- **JSON block** (`colophon-json`): `field-value` typography on `surface-raised-dark`, with a 1px `surface-edge-dark` left border, no radius and no shadow. It sits in a horizontally scrollable container at its natural width, exempt from the prose measure. **Syntax setting is luminance only:** keys at `ink-lift-dark`, values at `ink-prose-dark`, punctuation and structure at `ink-label-dark`. No hues.
- **Monospace exception.** The JSON body uses the system mono stack, the `typography.fontFamily.mono` token (`ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`). Monospace appears nowhere else in the product. Two points remain unratified assumptions: the 12px/1.7 sizing, and rendering the JSON inline rather than as a download. A link to the raw file may sit next to the block.
- **Weight is never emphasis.** There is no bold anywhere; the type is a light grotesque at weight 300.
- **No illustration.** The page never draws a small version of the scene. The scene is one click away.
- **Entry:** the left-top corner chrome reads `THOMAS NAVARRO · the model`, which keeps the rule of exactly two chrome lines (never three). The Fallback carries the same route in its own chrome.
- **Return:** the scene resumes at the stop it was left at, never at First Paint.
- **Page layout is still open.** No mock exists for how the JSON blocks and the derivations sit together on the page.

## Cross-Story Dependencies

- The epic builds on Epic 4's routing (the `/colophon` route, history-backed navigation, corner chrome, arrival focus handling) and on Epic 1's committed artifact and deterministic solver.
- 5.1 comes first: the chunk, the two data files emitted as assets, the route and the return. 5.2 (derivation table) and 5.3 (both files in full) compose the page around those exhibits. 5.4's prose has to be checkable against what 5.2 and 5.3 render.
- 5.5 depends on 5.1's chunk isolation and adds the solver as a separate on-demand chunk. Its output must never feed a renderer.
