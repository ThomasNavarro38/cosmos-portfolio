# src/shell/

Entry, capability detection, routing, navigation state machine, and the persistent DOM destination index. `entry.ts` carries no React and no Three — it detects and dynamically imports, so the entry path never statically reaches Three, the solver, or the raw career JSON (AD-7; see the root README's Reference section).

**Imports:** `generated/layout.generated.json` and `src/tokens/` statically; `src/render-scene/`, `src/render-fallback/` and `src/colophon/` through dynamic import only. Never `src/data/`, never `src/derive/`.
**Imported by:** the app entry point. Renderers are reached only through dynamic import from here.

## Files

| File | Role |
| --- | --- |
| `index-model.ts` | The DOM destination index as a pure view model: the artifact's `rail` read present → past, each Client's Projects nested beneath it, names and Deep/Shallow as text. Every AC-bearing rule lives here. |
| `index-model.test.ts` | Ordering against a fixture where the Rail opposes the emitted `clients` order, nesting, the Deep/Shallow text, invariance under repeated builds, and source scans pinning that neither module derives, sorts, or reads render state. |
| `index-nav.tsx` | The thin renderer: model → `<nav>` / nested `<ul>` / `<button>`. No rule of its own and no *local* state — it subscribes to the store with a selector and hands clicks to its named events. |
| `state.ts` | The navigation state machine: the one authority on where the visitor is. Five fields, one documented writer each, every transition a named event. Pure `.ts`, `zustand/vanilla` — no React import. |
| `state.test.ts` | The whole transition matrix executed rather than scanned: Focus exclusivity, origin-at-entry, writer separation over all seven events, the malformed-input rejections, subscription, plus a tree-wide `setState` audit and source scans pinning that the store stays React-free and derives nothing. |
| `scene-host.tsx` | The one edge into the 3D surface: `lazy(() => import('../render-scene/scene.tsx'))` behind `<Suspense>`, behind an error boundary. The boundary is what keeps the DOM index in the document when the chunk fails to arrive or the model throws. It also wraps the boundary in a `<div>` carrying the Rail's non-passive `wheel` listener. |
| `rail-input.ts` | The scene's scroll input as a pure rule: `wheelProgress(current, { deltaY, deltaMode, ctrlKey }, stopCount, pageHeight)` normalises a wheel delta to pixels (line and page modes included), divides by `WHEEL_PIXELS_PER_STOP` and clamps to `[0, N]` — or returns `null` when the event is not the Rail's (ctrl+wheel / pinch-zoom, a horizontal-only wheel, a non-finite delta, an unknown mode). `wheelIntent(focusedProjectId, …)` picks scroll's meaning from `focusedProjectId` alone: `{ rail }`, `{ panel: pixels }` or `null`. `railStopCount` counts the distinct Clients `rail` names; a test in `src/render-scene/rail-model.test.ts` pins it to the Rail model's own count. Imports nothing. |
| `focus-motion.ts` | The Focus move's timing: `FOCUS_SECONDS`, `FOCUS_EASING` as cubic-bezier control points, `easeFocus(t)` (the same curve solved in JS for the camera) `focusEasingCss()` (the same curve for the panel's `transition`), and `reversingFactor(progress, factor)` (CSS Transitions' reversing shortening factor, which the camera applies so a reversed move ends when the panel's reversed slide does). One duration and one curve for both surfaces. Imports nothing. |
| `focus-motion.test.ts` | The solver against CSS `ease` and `linear` at known values and against the parametric curve wherever it is sampled, the Focus curve's exact ends, monotonicity and self-reversal, the CSS string carrying the same points, rejection of a curve CSS rejects, and a purity scan. |
| `panel-model.ts` | The Focus panel as a pure model: `buildPanel(artifact, id)` (kicker, title, reading position, `Role`/`Team`/`Built`, release — in that order; the reading position holds `notable` paragraphs when `isDeep` and nothing otherwise; unknown ID → `null`), `panelWidth` / `panelFraction` / `panelWidthCss` (`min(560px, 46vw)`), `panelStyle(open)` (fixed right column, the Focus slide, `visibility: hidden` once closed), `FOCUS_PANEL_ID`, `indexEntryId`, `focusMove(previous, next)` → `'panel'` / `{ entry }` / `null`, and the A → B cross-fade (2.8): `crossFade(previous, next)` (the outgoing ID, for `A → B` only), `crossFadeTiming(drawn)` (WAAPI keyframes and timing on `FOCUS_SECONDS` and the Focus curve, the outgoing layer starting from the opacity it was drawn at) and `crossFadeLayerStyle()` (the outgoing layer laid over the content, clipped, no pointer). |
| `panel-model.test.ts` | The panel matrix — order, Deep, Shallow (and Shallow carrying prose), the field table without Skills, unknown IDs, width and share, open/closed style and the no-scrim key set, the focus-move matrix, entry IDs, the cross-fade matrix — plus audits of `focus-panel.tsx`, of the entry IDs in `index-nav.tsx` and of the mount in `App.tsx`, each driven over mutations of the shipped file. |
| `focus-panel.tsx` | The thin panel: one selector subscription on `focusedProjectId`, a ref for the last shown Project (so it slides out with its content), and an effect applying `focusMove` and starting the A → B cross-fade; model → `<aside tabindex="-1">` labelled by its `<h2>`, with the outgoing Project's blocks in an `aria-hidden`, `inert`, id-less layer over the incoming ones while Focus moves between Projects. |
| `rail-input.test.ts` | The wheel matrix — pixel/line/page, clamping at both ends and on an empty Rail, the `null` cases — plus a purity scan and an audit of the wiring in `scene-host.tsx` (listener on the host element, the store's progress and the event passed unchanged, `railStopCount(artifact.rail)`, return on `null` before `preventDefault`) driven over mutations of the shipped file. |

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

An authority with no subscriber is unfalsifiable, which is why the index is wired now rather than in 2.7. Selection sets state. Focus now has a second and third consumer — the panel and the camera's Focus move (2.7) — while `railPosition` still has none beyond the index: the Rail rig reads `scrollProgress`, not `railPosition`; click-to-fly is 2.9's.

### One writer per field

**The one-writer table lives in the `state.ts` module header, and that is the only copy.** It is the one a test pins — `state.test.ts` asserts a row exists there for every field the store actually holds — so a second copy here would be a table nobody checks, and the two would disagree on wording and ordering within a story. A test also asserts this file has not grown its own rows back.

Continuous `scrollProgress` and discrete `railPosition` are separate fields with separate writers, and **no event writes two writers' fields**. Collapsing them would make "the Rail is between two Clients" and "the Rail stops at this Client" the same statement, and the two writers would fight over it every frame. If the discrete stop should ever follow scroll progress, that is `selectClient` called too — two named transitions rather than one event quietly writing both. Today it does not: scroll never selects a Client.

`focusOrigin` is stored at Focus entry and read at release (AD-16). Inferring it at release would answer a question about the past with the present, which is right until the first time `mode` has moved in between.

State changes **only through the named events** exported from `state.ts`. A `setState` in a renderer would be a transition nobody can find, nobody tested, and nothing stops from writing two writers' fields at once — see the tree-wide scan below.

### The Rail's scroll input is the one writer of `scrollProgress`

A wheel over the scene — and only over the scene: the listener sits on the `<div>` wrapping the scene boundary, so a wheel over the index scrolls the page normally — asks `wheelProgress(...)` and, only when the answer is not `null`, prevents the default and calls `advanceScroll(next)`. A pinch-zoom (ctrl+wheel) and a horizontal-only wheel are therefore left to the browser. The listener is registered by hand with `{ passive: false }` because React attaches `wheel` passively, and a passive listener cannot stop the page scrolling under the camera. Progress is measured in stops: 0 is the opening frame and `k` the `k`-th Client stop, present first. The camera rig reads it and writes nothing back, and scrolling never calls `selectClient`: `railPosition` keeps the index as its one writer. The store itself stays unclamped; the range is `rail-input.ts`'s to enforce.

### Scroll has two meanings, chosen by state alone (2.7)

With a Project focused, the same wheel over the scene scrolls the panel instead: `wheelIntent` answers `{ panel: pixels }`, the handler prevents the default and calls `scrollBy` on the element named `FOCUS_PANEL_ID`, and `scrollProgress` is not written — so reading never moves the camera. The meaning comes from `focusedProjectId` and nothing else; the handler never reads the event's target and never hit-tests, and a scan in `rail-input.test.ts` fails if it starts to. A wheel over the panel itself never reaches the scene's listener: the panel is its own scroll container (`overflow-y: auto`, `overscroll-behavior: contain`) and scrolls natively.

## The Focus panel sits beside the scene, never over it (2.7)

Focus is one combined move: the camera eases to a pose that puts the Project off-centre in the half the panel leaves free (`src/render-scene/focus-model.ts`), and the panel slides in over the same `FOCUS_SECONDS` on the same curve (`focus-motion.ts`: CSS for the panel, the same control points solved in JS for the camera). Release is the same move reversed, and a release while the panel is still sliding in is shortened on both halves: the browser shortens the panel's reversed slide by the reversing shortening factor, and the camera's ease applies the same factor, so the two still end together. The canvas keeps its full width; the panel is `position: fixed` on the right at `min(560px, 46vw)`, and there is no scrim, dim, backdrop or modal (UX-DR20).

Focus is entered deliberately — the index `<button>` or a Planet click — and released by the panel's `release` button. Nothing hovers. DOM focus follows `focusMove`: on entry to the panel container (`tabindex="-1"`, labelled by its `<h2>`), on release back to the released Project's own index entry, found by `indexEntryId` (UX-DR40) — whichever door Focus came through. Closed, the panel is `visibility: hidden` once the slide ends, so it leaves the tab order and the accessibility tree without a `transitionend` listener. Escape and reduced motion are 2.10's; the Notable treatment and typography are Epic 3's.

**A → B cross-fades (2.8).** Moving Focus between Projects leaves the panel open, so its content changes in place: `crossFade` names the outgoing Project for `A → B` only, its blocks render once more in a layer over the incoming ones, and a layout effect — before the first paint of the swap — fades the incoming layer 0 → 1 and the outgoing one → 0 with WAAPI over `FOCUS_SECONDS` on `focusEasingCss()` — the duration the camera moves and the Motes condense in, so the three surfaces are one transition. The outgoing layer is `aria-hidden` and `inert` and its title carries no `id`, so the label, the accessibility tree and the tab order see only the incoming Project; DOM focus moves exactly as in 2.7. The leaving ID is held in a ref, written only on a render where the store's ID differs from the one the focus effect last recorded: repeated renders agree, and a re-render after the effect commits cannot unmount A mid-fade. The layer is scrolled to where the reader was in A (tracked by a passive `scroll` listener, since after the swap the browser may clamp the position to B's length) before the panel returns to its top for B.

### A render loop reads with `getState()`, never with a hook

A camera subscribed reactively would re-render its whole tree on every progress write, sixty times a second, to obtain a value it is about to read anyway. So a frame callback calls `navigationStore.getState()` and takes the current value without subscribing. React consumers do the opposite — `useStore(navigationStore, selector)`, a selector and never the whole store, so a Client selection does not re-render every Project. `src/render-scene/rail-camera.tsx` is that loop; `state.ts` is what makes the path available.

### Why the store is pure `.ts` rather than a `create()` hook

`zustand`'s default `create` pulls React into the module graph, which would push the store's AC-bearing rules — exclusivity, writer separation, origin-at-entry — back onto source scans, the residual risk the model/renderer split below accepts. `createStore` from `zustand/vanilla` has no React import, and `zustand/react`'s `useStore(api, selector)` accepts exactly that store, so a pure store plus a React subscription is the supported shape rather than a workaround. Every rule the store obeys is therefore executed by `state.test.ts` rather than read off source.

### Malformed input fails loudly, for every writer

An unknown ID **throws** rather than no-ops. The store cannot validate membership — `src/shell/` may not import `src/derive/`, and no artifact is passed in — so validation is the caller's; what the store guarantees is that a malformed handle fails loudly naming the field and the value, rather than parking the visitor at a destination that does not exist. Same posture as `startsAt` in the derive layer.

The guarantee has to hold for *every* writer or it holds for none. Two ways it did not, both closed:

- **A padded ID is stored trimmed.** The guard validated `id.trim()` and then stored the raw `id`, so `'  client-zulu  '` passed the check and was parked as a string matching no artifact ID — a destination that does not exist, reached through the guard written to prevent exactly that. The value checked and the value kept are now one string.
- **`advanceScroll` rejects a non-finite value.** `NaN` is what arithmetic on an undefined scroll offset produces, and it propagates in silence: every comparison against it is false, so a camera reading it places the visitor nowhere and reports nothing. A store that threw on `''` while accepting `NaN` made its own claim true of one writer and false of the other.

Progress stays **unclamped in the store**: the store knows nothing of the Rail's length, so the range is enforced by its one writer, `rail-input.ts`, which clamps to `[0, N]`. The store's guard checks that the value is a number, not what it means.

### The named-event contract is scanned for the tree, not for one file

`zustand` puts `setState` on the store object, so the type cannot forbid a consumer calling it; the contract that none does is held by a source scan — and that scan walks **every shipped file under `src/`**, exempting `state.ts` by name. A scan of one hard-coded file left `App.tsx`, a future `entry.ts` and `render-scene/` — which `src/render-scene/README.md:5` already declares imports this store — free to write two writers' fields in one statement, which is the precise thing the rule exists to prevent. The audit is a pure function over files, so it is driven over fixtures as well as over the real tree: a checker only ever run against a clean tree proves nothing about what it would reject.

What the scan reaches, and what it does not, is worth stating because the gap is permanent rather than a to-do. It catches a call (`store.setState(…)`), a bracket access (`store['setState']`) and a destructured alias (`const { setState: write } = store`); a computed key — `store['set' + 'State']` — defeats it, and no scan over text can close that. Comments and string literals are blanked before matching, in all three shapes prose takes, so these module headers can discuss `setState` at length without the audit firing on them. The contract is therefore enforced at the cost of having to write a violation deliberately, which is the honest claim; a stronger one would stop anyone checking.

## The index precedes the camera

`src/App.tsx` renders the index synchronously from the statically imported artifact, so it is in the document at First Paint, before any 3D chunk has been asked for. This is AD-4 and it is the ordering, not a detail: building the camera first produces an architecture where the canvas is the real interface and the accessible surface is a translation of it, and the inversion stays invisible until assistive technology meets it.

Nothing here reads camera state, viewport size, or canvas hit-testing, so the index's structure, order and focusability are invariant under re-render and resize by construction rather than by care.
