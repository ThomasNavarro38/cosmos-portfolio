# src/shell/

Entry, capability detection, routing, navigation state machine, and the persistent DOM destination index. `entry.ts` carries no React and no Three — it detects and dynamically imports, so the entry path never statically reaches Three, the solver, or the raw career JSON (AD-7; see the root README's Reference section).

**Imports:** `generated/layout.generated.json` and `src/tokens/` statically; `src/render-scene/`, `src/render-fallback/` and `src/colophon/` through dynamic import only. Never `src/data/`, never `src/derive/`.
**Imported by:** the app entry point. Renderers are reached only through dynamic import from here.

## Files

| File | Role |
| --- | --- |
| `index-model.ts` | The DOM destination index as a pure view model: the artifact's `rail` read present → past, each Client's Projects nested beneath it, names and Deep/Shallow as text. Every AC-bearing rule lives here. |
| `index-model.test.ts` | Ordering against a fixture where the Rail opposes the emitted `clients` order, nesting, the Deep/Shallow text, invariance under repeated builds, and source scans pinning that neither module derives, sorts, or reads render state. |
| `index-nav.tsx` | The thin renderer: model → `<nav>` / nested `<ul>` / `<button>`. Mapping only, no logic. Subscribes to the store with a selector and hands clicks to its named events. |
| `state.ts` | The navigation state machine: the one authority on where the visitor is. Five fields, one documented writer each, every transition a named event. Pure `.ts`, `zustand/vanilla` — no React import. |
| `state.test.ts` | The whole transition matrix executed rather than scanned: Focus exclusivity, origin-at-entry, writer separation over all seven events, the malformed-input rejections, subscription, plus a tree-wide `setState` audit and source scans pinning that the store stays React-free and derives nothing. |

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

A destination is an action inside this page, not a document to navigate to. A `<button>` is focusable, activated by both Enter and Space, and announced as a button without an attribute saying so; nothing sets `tabIndex`, so the tab order is the document order, which is the model's order. Each button hands its entity ID to a named event on the store: a Client button to `selectClient`, a Project button to `focusProject`.

`aria-pressed` on the Project buttons carries Focus, and only Focus. It is allowed where `aria-label` is banned because it is a different kind of attribute: it adds state and replaces nothing, so the announced name is still the title plus Deep/Shallow with "pressed" alongside it. The ARIA ban in `index-model.test.ts` is therefore the name-replacing family — `aria-label`, `aria-labelledby`, `aria-describedby` — and a case there proves the original `aria-label={project.depth}` regression still fails.

## One authority on where the visitor is

`state.ts` owns navigation state; the camera and the DOM index are both consumers and neither owns position (AD-9). Building the camera first and letting the canvas hold the current destination produces the inverted architecture AD-4 exists to forbid — one where the index translates render state rather than commanding it — so the authority lands before its second consumer exists, and the index subscribes to it today.

An authority with no subscriber is unfalsifiable, which is why the index is wired now rather than in 2.7. Selection sets state; nothing yet reacts to that state visually beyond `aria-pressed`, and that is the correct amount of behaviour for a story whose camera does not exist.

### One writer per field

**The one-writer table lives in the `state.ts` module header, and that is the only copy.** It is the one a test pins — `state.test.ts` asserts a row exists there for every field the store actually holds — so a second copy here would be a table nobody checks, and the two would disagree on wording and ordering within a story. A test also asserts this file has not grown its own rows back.

Continuous `scrollProgress` and discrete `railPosition` are separate fields with separate writers, and **no event writes two writers' fields**. Collapsing them would make "the Rail is between two Clients" and "the Rail stops at this Client" the same statement, and the two consumers would fight over it every frame. A camera that wants the discrete stop to follow its progress calls `selectClient` too — two named transitions rather than one event quietly writing both.

`focusOrigin` is stored at Focus entry and read at release (AD-16). Inferring it at release would answer a question about the past with the present, which is right until the first time `mode` has moved in between.

State changes **only through the named events** exported from `state.ts`. A `setState` in a renderer would be a transition nobody can find, nobody tested, and nothing stops from writing two writers' fields at once — see the tree-wide scan below.

### A render loop reads with `getState()`, never with a hook

A camera subscribed reactively would re-render its whole tree on every progress write, sixty times a second, to obtain a value it is about to read anyway. So a frame callback calls `navigationStore.getState()` and takes the current value without subscribing. React consumers do the opposite — `useStore(navigationStore, selector)`, a selector and never the whole store, so a Client selection does not re-render every Project. The loop itself arrives with the camera; `state.ts` is what makes the path available.

### Why the store is pure `.ts` rather than a `create()` hook

`zustand`'s default `create` pulls React into the module graph, which would push the store's AC-bearing rules — exclusivity, writer separation, origin-at-entry — back onto source scans, the residual risk the model/renderer split below accepts. `createStore` from `zustand/vanilla` has no React import, and `zustand/react`'s `useStore(api, selector)` accepts exactly that store, so a pure store plus a React subscription is the supported shape rather than a workaround. Every rule the store obeys is therefore executed by `state.test.ts` rather than read off source.

### Malformed input fails loudly, for every writer

An unknown ID **throws** rather than no-ops. The store cannot validate membership — `src/shell/` may not import `src/derive/`, and no artifact is passed in — so validation is the caller's; what the store guarantees is that a malformed handle fails loudly naming the field and the value, rather than parking the visitor at a destination that does not exist. Same posture as `startsAt` in the derive layer.

The guarantee has to hold for *every* writer or it holds for none. Two ways it did not, both closed:

- **A padded ID is stored trimmed.** The guard validated `id.trim()` and then stored the raw `id`, so `'  client-zulu  '` passed the check and was parked as a string matching no artifact ID — a destination that does not exist, reached through the guard written to prevent exactly that. The value checked and the value kept are now one string.
- **`advanceScroll` rejects a non-finite value.** `NaN` is what arithmetic on an undefined scroll offset produces, and it propagates in silence: every comparison against it is false, so a camera reading it places the visitor nowhere and reports nothing. A store that threw on `''` while accepting `NaN` made its own claim true of one writer and false of the other.

Progress stays **unclamped**: what range a value may take is the camera's question, and a clamp here would be a derivation rule in the one directory forbidden to hold any (AD-3). The guard checks that the value is a number, not what it means.

### The named-event contract is scanned for the tree, not for one file

`zustand` puts `setState` on the store object, so the type cannot forbid a consumer calling it; the contract that none does is held by a source scan — and that scan walks **every shipped file under `src/`**, exempting `state.ts` by name. A scan of one hard-coded file left `App.tsx`, a future `entry.ts` and `render-scene/` — which `src/render-scene/README.md:5` already declares imports this store — free to write two writers' fields in one statement, which is the precise thing the rule exists to prevent. The audit is a pure function over files, so it is driven over fixtures as well as over the real tree: a checker only ever run against a clean tree proves nothing about what it would reject.

## The index precedes the camera

`src/App.tsx` renders the index synchronously from the statically imported artifact, so it is in the document at First Paint, before any 3D chunk has been asked for. This is AD-4 and it is the ordering, not a detail: building the camera first produces an architecture where the canvas is the real interface and the accessible surface is a translation of it, and the inversion stays invisible until assistive technology meets it.

Nothing here reads camera state, viewport size, or canvas hit-testing, so the index's structure, order and focusability are invariant under re-render and resize by construction rather than by care.
