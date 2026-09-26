# src/shell/

Entry, capability detection, routing, navigation state machine, and the persistent DOM destination index. `entry.ts` carries no React and no Three — it detects and dynamically imports, so the entry path never statically reaches Three, the solver, or the raw career JSON (AD-7; see the root README's Reference section).

**Imports:** `generated/layout.generated.json` and `src/tokens/` statically; `src/render-scene/`, `src/render-fallback/` and `src/colophon/` through dynamic import only. Never `src/data/`, never `src/derive/`.
**Imported by:** the app entry point. Renderers are reached only through dynamic import from here.

## Files

| File | Role |
| --- | --- |
| `index-model.ts` | The DOM destination index as a pure view model: the artifact's `rail` read present → past, each Client's Projects nested beneath it, names and Deep/Shallow as text. Every AC-bearing rule lives here. |
| `index-model.test.ts` | Ordering against a fixture where the Rail opposes the emitted `clients` order, nesting, the Deep/Shallow text, invariance under repeated builds, and source scans pinning that neither module derives, sorts, or reads render state. |
| `index-nav.tsx` | The thin renderer: model → `<nav>` / nested `<ul>` / `<button>`. Mapping only, no logic. |

```sh
npm test        # every *.test.ts under src/, this suite included
npm run typecheck
```

## The index reads, and never derives

Every ordering rule the index obeys was resolved in `src/derive/` and emitted into the artifact (AD-3). The Rail's sequence arrives as `rail`, each Client's Projects arrive already ID-ordered inside `clients[]`, and Deep/Shallow arrives as `isDeep`. Nothing in this directory sorts on a `duration`, a `timeAxis`, or a coordinate, and a source scan in `index-model.test.ts` fails if it starts to.

That matters because the Rail's ordering is not the artifact's `clients` ordering: `clients[]` is `timeAxis` order (max recency), and the Rail sorts on earliest `duration.start`. For a portfolio holding a long early engagement beside a short late one the two genuinely differ, so an index reconstructing the Rail from the tree would walk a different sequence from the one the camera travels — and it would put the Rail's sort key in a second place, where the two copies drift.

**Index order is Rail order reversed: present → past.** The artifact emits `rail` oldest-engagement-first, because that is the direction the camera travels; a reader arriving at a portfolio wants the current work first. It is the same ordering read the other way, not a second one.

## Why the model and the renderer are separate files

`node --test` under Node 24's built-in type stripping cannot load a `.tsx` file **in any position** — `ERR_UNKNOWN_FILE_EXTENSION` at module resolution, before any transform, so a `.ts` test cannot even import a `.tsx` module. Adding a transform means adding dependencies to a set that is deliberately closed at fifteen exactly-pinned versions, in a repo that rejected ESLint on exactly that ground.

So every rule an acceptance criterion names lives in `index-model.ts`, which is pure `.ts` and testable with zero new dependencies, and `index-nav.tsx` is a mapping thin enough that reading it is sufficient verification. The residual risk — that the JSX mapping itself is unasserted — is accepted and ratcheted: `index-model.test.ts` scans the renderer's source and fails if it grows a sort, a filter, a hook, a re-derivation, or a reach into render state.

## Deep and Shallow are text, never an attribute

A screen-reader user must be able to answer *which of these is worth reading* from the index alone. An `aria-*` attribute does not answer it, and a dot or a colour answers it for nobody who cannot see. So the state is rendered as the words `Deep` and `Shallow` inside the entry, where they land in its accessible name. The vocabulary is load-bearing and pinned by test: no synonyms.

## Every entry is a real `<button>`

A destination is an action inside this page, not a document to navigate to. A `<button>` is focusable, activated by both Enter and Space, and announced as a button without an attribute saying so; nothing sets `tabIndex`, so the tab order is the document order, which is the model's order. The buttons carry no handler yet — Story 2.2 owns navigation state and wires selection to the entity ID each entry carries.

## The index precedes the camera

`src/App.tsx` renders the index synchronously from the statically imported artifact, so it is in the document at First Paint, before any 3D chunk has been asked for. This is AD-4 and it is the ordering, not a detail: building the camera first produces an architecture where the canvas is the real interface and the accessible surface is a translation of it, and the inversion stays invisible until assistive technology meets it.

Nothing here reads camera state, viewport size, or canvas hit-testing, so the index's structure, order and focusability are invariant under re-render and resize by construction rather than by care.
