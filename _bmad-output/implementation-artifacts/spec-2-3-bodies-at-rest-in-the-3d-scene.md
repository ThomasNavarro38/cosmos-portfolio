---
title: 'Story 2.3: Bodies at rest in the 3D scene'
type: 'feature'
created: '2026-09-27'
status: 'done'
review_loop_iteration: 2
context: []
baseline_commit: 'efa01701e76b4ee5061af7bdfcbd1788d8703abe'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `src/render-scene/` holds a README and no code. The artifact has carried solved positions and derived visual properties since Epic 1 and nothing draws them, so the shape of a career is unreadable and the pacing question this epic exists to answer cannot be asked. This is also where the entry-chunk split first becomes real: a renderer reached statically would hoist Three onto the entry chunk (AD-7), and today nothing forbids it.

**Approach:** A pure `.ts` scene model resolves the artifact into a flat, renderer-ready list of Bodies — Stars and Planets at their solved positions, nothing derived — and a thin R3F renderer maps that list to placeholder geometry inside an `aria-hidden` canvas. The shell reaches it through dynamic import only, and the boundary table gains the rows that make "only through `src/shell/`" enforced rather than declared.

## Boundaries & Constraints

**Always:**
- The scene **reads and never derives** (AD-3). Positions, `mass`, `luminanceBand`, `railDistance`, `moteTier` and `isDeep` arrive from the artifact. No classification test, no mapping-rule computation, no conditional on a raw `content` field, no force simulation.
- Every AC-bearing rule lives in a pure `.ts` model (`scene-model.ts`), testable under `node --test` — the same lever `index-model.ts` and `state.ts` used. The `.tsx` renderer stays a mapping thin enough that reading it suffices, ratcheted by a source scan. Verified: `three` imports cleanly under Node 24 from inside the project.
- The scene restates the artifact slice it reads **structurally**, as `index-model.ts` does — `src/render-scene/` may not import `src/derive/`, type-only included.
- The scene is reached by **dynamic import from `src/shell/` only**, so Three stays off the entry chunk. The DOM index remains in the document at First Paint, before the scene chunk is requested.
- The canvas root carries `aria-hidden="true"` — the index is the interface, and narrating the scene twice is worse than not narrating it once.
- Inside a frame callback, read the store with `navigationStore.getState()`, never a reactive hook binding.
- Placeholder geometry only. Vocabulary is fixed: Body, Star, Planet, Client, Project.

**Ask First:**
- Adding any dependency. The set is closed at fifteen exact pins; `three`, `@react-three/fiber` and `@react-three/drei` are already among them.
- Rendering anything the artifact does not carry, or moving a value's derivation into the scene.
- Any change to the emitted artifact's shape or to `SCHEMA_VERSION`.

**Never:**
- No connector geometry of any kind — no line, edge, or link between two Bodies or between a Body and anything else. Orbits are the only relational geometry, and in this story they are Planet *positions*, not drawn rings.
- No Body for a Company. Company is an attribute.
- No camera work, no Rail traversal, no Shot, no Dwell, no scroll handling — 2.5 and 2.6 own those. A static default view only.
- No Dust (2.4), no Motes or Condensation (2.8), no Focus entry, panel, or DOM focus move (2.7), no Escape handling (2.10).
- No interaction: no raycasting, no click-to-fly, no hover. The scene reacts to nothing in this story.
- No styling, design token, colour system, or visual identity — Epic 3.
- No authored-data change. `career.json` is not touched here.
- No `setState` from the scene; no writes to the navigation store at all.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nominal artifact | N Clients, each with ≥1 Project | One Star Body per Client at its `position`; one Planet Body per Project at its `position`; `N + ΣP` Bodies total, no more | N/A |
| Multi-Client fixture | 5 Clients / 10 Projects | 15 Bodies — proves the ~15–16 case without authored data | N/A |
| Body identity | any Client or Project | Each Body carries its entity `id` verbatim and a `kind` of `'star'` or `'planet'`; a Planet carries its `clientId` | N/A |
| Ordering is the artifact's | `clients[]` in `timeAxis` order | Bodies emitted in `clients[]` order, each Client's Star before its Planets; no sort of the model's own | N/A |
| Company present | `content.company` set on a Project | No additional Body; count unchanged | N/A |
| Duplicate entity ID | two Bodies resolving to one `id` | Rejected: throws naming the duplicated ID | Throws — a duplicate silently renders two coincident Bodies |
| Non-finite coordinate | a position component `NaN`/`Infinity` | Rejected: throws naming the entity and the axis | Throws — an unguarded coordinate places a Body nowhere, silently |
| Scene chunk requested | shell dynamically imports the scene | Scene mounts; Three is absent from the entry chunk's module graph | N/A |

</frozen-after-approval>

## Code Map

**New — the model (pure `.ts`, where every AC-bearing rule lives):**
- `src/render-scene/scene-model.ts` — **new.** Restates the artifact slice structurally (`SceneArtifact`/`SceneArtifactClient`/`SceneArtifactProject`), mirroring `index-model.ts:52-68`'s narrow-restatement idiom and its WHY-not-WHAT header style. Exports `buildScene(artifact): SceneBodies` returning a flat `readonly Body[]` where `Body = { id, kind: 'star'|'planet', position: {x,y,z}, mass, luminanceBand, moteTier, isDeep?, clientId? }`. Reads only; no sort, no classification. Guards: duplicate ID and non-finite coordinate both throw naming the offender — the `startsAt`/`requireId` posture (`state.ts:179`).
- `src/render-scene/scene-model.test.ts` — **new.** The whole I/O matrix behaviourally over in-memory fixtures, including a **5-Client / 10-Project fixture proving the ~15–16 Body case** that authored data cannot yet produce. Plus source scans pinning what cannot be executed: no `src/data/` or `src/derive/` import, no derivation vocabulary, no `d3-force-3d`, and the renderer's thinness. House idioms: `node:test` + `node:assert/strict`, flat `test()`, lowercase titles naming behaviour *and* reason, in-memory fixtures.
  **Every ratchet scan must be driven over reconstructed bad forms, not only over the clean file.** This repo already solved this: `src/shell/index-model.test.ts` extracts `auditAria` as a pure function and runs it over *fabricated violations*, with a comment stating that a negative scan over a file no longer containing the bad form cannot show the pattern still catches it — the pattern rots into vacuity and the scan keeps passing. Review proved both predicted failures in this very story: `aria-hidden="false"` passed the ARIA scan, and a drei `<Line>` passed the connector ban, each at 32/32 green. So each scan here is a pure function over source text, exercised against strings that must be rejected as well as against the real file:
  - **ARIA:** assert the *value*, not the attribute's presence — `aria-hidden="true"` or `{true}` on the `<Canvas>` — and prove the checker rejects `aria-hidden="false"` and `aria-hidden={false}`.
  - **Connector:** `@react-three/drei` is a pinned dependency exporting `Line`, `QuadraticBezierLine`, `CubicBezierLine` and `Segments`, so match elements case-insensitively and name drei's components; prove the checker rejects a reconstructed `<Line points={…} />` and `<lineSegments>`.
  - Drop scans that cannot fail by construction: a case-insensitive `\balpha\b` ban over a pure-structure module is not coverage, and it will misfire on a future token name or a fixture Client named `alpha`.

**New — the renderer (thin `.tsx`):**
- `src/render-scene/scene.tsx` — **new.** `<Canvas aria-hidden="true">` mapping `buildScene()`'s list to placeholder meshes — a sphere per Body. Size discriminates on `body.kind`, never on `mass === undefined`: the union is what the model defined, and a Planet arriving without mass must surface rather than silently render Star-sized. No hook state, no store subscription, no raycast, no `useFrame` in this story. Mirrors `index-nav.tsx`'s posture: a mapping and nothing else.
  **The surface must have extent, and the camera must see it.** R3F's wrapper `<div>` is `width:100%; height:100%` and this repo has no CSS at all, so a `<Canvas>` mounted in a bare `<main>` collapses to zero height and renders nothing — the state review found. Give the canvas real extent (an inline `style` on `<Canvas>`, or a sized wrapper), and pass a `camera` prop positioned to frame the artifact's solved extent, read off the Bodies rather than hard-coded. **This is not the visual identity the Never list defers**: Epic 3 owns colour, tokens, and typography; whether the surface exists and whether the Bodies are inside the frustum are this story's own acceptance.
  **The camera's orientation must be pinned, not assumed.** R3F 9.7.0 calls `camera.lookAt(0, 0, 0)` whenever the `camera` prop carries no `rotation` (`@react-three/fiber/dist/events-156d8d12.esm.js:15786`), so a framing that returns a `target` and trusts the default orientation aims at the world origin instead — and the committed Planet lands outside the frustum. Pin it: supply `rotation`, apply `lookAt` on the camera object, or centre the framing so that origin-aiming *is* correct. Any of the three is acceptable; leaving it to a default that a dependency chooses is not.
  **And assert containment through a real camera, never by re-deriving the projection.** `three` loads under `node --test` from inside this project (verified). Build a `PerspectiveCamera(fov, NARROWEST_ASPECT, near, far)`, set its position, apply exactly the orientation the renderer produces, and assert `new Frustum().setFromProjectionMatrix(…).containsPoint(…)` for every Body. Axis-aligned arithmetic around the camera's own `x`/`y` is what let this ship twice: it is valid only if the camera looks down `-z`, so it cannot observe the orientation being wrong.
- `src/render-scene/README.md:1-6` — already declares the imports and the dynamic-only edge. Add a `## Files` table (shell README's format, `README.md:8-16`) and the reasoning sections.

**Wiring the lazy chunk:**
- `src/App.tsx:20-35` — currently renders the index alone, with a header comment (`:16`) saying **"Do not grow this file"** and placing entry/dynamic-import in `src/shell/`. So the scene mount belongs in a new `src/shell/scene-host.tsx` holding `lazy(() => import('../render-scene/scene.tsx'))` + `<Suspense>`, which `App.tsx` renders beside the index — one added element there, not a growth of responsibility.
  **The host needs an error boundary, and it is the index that makes it necessary.** `buildScene` throws inside the render path, and a lazy chunk can simply fail to arrive — a stale hash after a deploy, an offline visitor. Under a bare `<Suspense>` either one unmounts the whole React root, taking the DOM destination index with it. That inverts the story's own architecture: the index is the interface and the scene is presentational, so the presentational surface failing must never remove the interface. A class component with `componentDidCatch` rendering `null` is the whole requirement (React has no hook form); the page then holds the index alone, which is exactly the state First Paint already ships.
  **`App.tsx`'s mount must be pinned by test.** No test reads this file's contents today, so deleting both the import and the element leaves the suite, the typecheck and the gate all green while the story's entire deliverable disappears. Add a positive source scan — in `scene-model.test.ts`, beside the existing `scene-host.tsx` scan — asserting the `SceneHost` import and the `<SceneHost` element are both present, and that `<DestinationNav` precedes `<SceneHost` in the source, which is the AD-4 ordering the file's header claims.
- `src/main.tsx:12-17` — its own comment states the renderer `dynamicOnly` rule "belongs with the story that introduces the first one, together with the README sentence that would license it." **This is that story.**

**Boundary rows this story must add** (`src/derive/boundaries.ts:112-161`, `ROOT_RULE` at `:221`):
- `ROOT_RULE` gains `dynamicOnly: ['render-scene','render-fallback','colophon']` and `neverPackages: ['three','@react-three/fiber','@react-three/drei']` — closing story-2-1 review item 2. Requires the licensing sentence in root `README.md:45` first; the table states nothing the prose does not.
- The `shell` row (`:139`) gains the same `neverPackages` — `src/shell/README.md:3` already declares "`entry.ts` carries no React and no Three"; verified today a `shell/entry.ts` importing `three` passes clean.
- The `render-scene` row (`:151`) gains `neverPackages: ['d3-force-3d','zustand/react']` — the first makes "contains no force-simulation code and imports nothing from the solver" enforced rather than asserted; the second makes the `getState()`-in-render-loop rule real (deferred-work, spec-2-2). Check `packageOf` handles the `zustand/react` subpath as `zustand` — if it does, banning the bare package is wrong (the scene legitimately reaches `zustand/vanilla` state via `src/shell/`), so **confirm the parser's subpath granularity before writing this row**; if it cannot express it, use a source scan in `scene-model.test.ts` instead and record why.
- A cross-renderer `never` edge between `render-scene` and `render-fallback` (deferred-work) is **out of scope** — `render-fallback` holds no code, so the row has no subject yet.

**Read-only evidence / constraints:**
- `generated/layout.generated.json` — `schemaVersion: 4`; `clients[].position{x,y,z}`, `clients[].projects[]` with `mass`, `luminanceBand`, `railDistance`, `moteTier`, `isDeep`, `position`. **Currently 1 Client / 1 Project** — see Design Notes.
- `src/derive/artifact-schema.ts:163-169,226-229` — `ArtifactClientSchema` / `ArtifactSchema`, the shape being restated. Not importable from `render-scene/`.
- `src/shell/state.ts:182` — `navigationStore` (`zustand/vanilla`), the store a later camera reads with `getState()`. Not subscribed in this story.
- `src/derive/maintenance.test.ts:447` — `shippedFilesUnder`, the whole-tree walker to reuse for any tree-wide scan; keep its `assert.ok(files.length > 0)` guard.
- `src/derive/boundaries.ts:241` — `stripCommentsAndStrings`, used by every source scan so prose discussing a banned token is not a finding.
- `package.json:29` — `three` 0.185.1, `@react-three/fiber` 9.7.0, `@react-three/drei` 10.7.8 all pinned in `dependencies`; peers satisfied against React 19.2.8 (verified). No dependency change.
- `package.json:17` — test glob `src/**/*.test.ts`; a `.tsx` test cannot exist.
- `tsconfig.json` — `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `allowImportingTsExtensions` (write `.ts`/`.tsx` in specifiers), `jsx: react-jsx`.
- House style: single quotes, semicolons, trailing commas, 2-space indent, named exports only, `readonly` pervasive, no linter.

## Tasks & Acceptance

**Execution:**
- [x] `src/render-scene/scene-model.ts` -- the structural artifact restatement and `buildScene`: Stars and Planets flattened with their solved positions and derived properties, plus the duplicate-ID and non-finite-coordinate guards -- every AC-bearing rule must live where `node --test` can execute it, not in the `.tsx` it cannot load
- [x] `src/render-scene/scene-model.test.ts` -- the whole I/O matrix over in-memory fixtures, including the 5-Client / 10-Project case and the Company-attribute case -- the ~15–16 Body AC is provable today only against a fixture, since authored data holds one Project
- [x] `src/render-scene/scene-model.test.ts` -- source scans: no `src/data/` or `src/derive/` import, no `d3-force-3d`, no classification or mapping vocabulary, and `scene.tsx` holds no sort, filter, hook, re-derivation, or store write -- the renderer's thinness is the residual the model/renderer split accepts, and a scan is the only ratchet available
- [x] `src/render-scene/scene-model.test.ts` -- every ratchet scan as a pure function driven over reconstructed bad forms: ARIA asserted on its *value* and proven to reject `aria-hidden="false"`/`{false}`; the connector ban case-insensitive, naming drei's `Line`/`Segments`, proven to reject `<Line …/>` -- review proved both current scans pass their own violations at 32/32 green, which is the vacuity `auditAria` was written to prevent
- [x] `src/render-scene/scene.tsx` -- `<Canvas aria-hidden="true">` mapping the model's Bodies to placeholder meshes, sized by `body.kind` -- the canvas duplicates the index, so narrating it twice is worse than not narrating it once; and discriminating on the union rather than on a missing field surfaces a Planet without mass instead of absorbing it
- [x] `src/render-scene/scene.tsx` -- give the canvas real extent and a default camera framing the solved extent -- R3F's wrapper is `height:100%` with no CSS anywhere in the repo, so the surface collapsed to zero height and rendered nothing; a story called "Bodies at rest in the 3D scene" must show the Bodies
- [x] `src/render-scene/scene.tsx` -- pin the camera's orientation explicitly rather than relying on R3F's default -- R3F aims at the world origin when no `rotation` is passed, which puts the committed Planet outside the frustum while every test stays green
- [x] `src/render-scene/scene-model.test.ts` -- assert frustum containment through a real `three.PerspectiveCamera` under the orientation the renderer produces, and prove the assertion fails when the camera is aimed at the origin instead -- re-deriving the projection in the test is what let Bodies ship off-frame twice
- [x] `src/shell/scene-host.tsx` -- `lazy` + `Suspense` + an error boundary around the dynamic import -- `App.tsx:16` forbids growing itself, and without the boundary a failed chunk fetch or a throwing model unmounts the root and takes the DOM index with it, inverting the architecture the story exists to protect
- [x] `src/App.tsx` -- render the scene host beside the index -- one element, no new responsibility; the index still renders synchronously at First Paint
- [x] `src/render-scene/scene-model.test.ts` -- positive source scan on `src/App.tsx`: the `SceneHost` import, the `<SceneHost` element, and `<DestinationNav` preceding it -- deleting both lines currently leaves the suite, typecheck and gate green while the whole deliverable disappears
- [x] `README.md` -- the sentence licensing the renderer `dynamicOnly` and no-Three-on-the-entry-path rules -- `boundaries.ts` deliberately states nothing the prose does not, and `main.tsx:12-17` names this story as the one that adds both
- [x] `src/derive/boundaries.ts` -- `dynamicOnly` renderers and `neverPackages` Three on `ROOT_RULE` and the `shell` row; `neverPackages` on `render-scene` for the solver (and the reactive binding if the parser's subpath granularity allows) -- a static renderer import is the AD-7 hoist the gate exists to prevent and passes clean today
- [x] `src/derive/boundaries.test.ts` -- mutation cases proving each new row rejects: a static renderer import at root, `three` in the shell, `d3-force-3d` in the scene -- a rule only ever run against a clean tree proves nothing about what it would reject
- [x] `src/render-scene/README.md` -- the `## Files` table and the reasoning sections: reads-never-derives, why the model and renderer are separate, why the canvas is `aria-hidden` -- house style expects a row per module, and `boundaries.ts` cites line 5
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- record the authored-data shortfall: the artifact carries 1 Client / 1 Project against an AC naming ~5–6 and ~10 -- the pacing judgement this epic gates on cannot be made honestly at two Bodies
- [x] `npm test`, `npm run typecheck`, `npm run gate`, `npm run build` -- all green, dependency set unchanged at fifteen pins

**Acceptance Criteria:**
- Given the scene model is built from an artifact of N Clients and ΣP Projects, when `buildScene` runs, then exactly `N + ΣP` Bodies are returned, one Star per Client and one Planet per Project, each at the artifact's solved position and carrying its entity ID
- Given a Project whose `content.company` is set, when the model runs, then no additional Body exists — Company is an attribute, not a Body
- Given the scene source is scanned, when the scan runs, then it contains no import of `src/data/` or `src/derive/`, no `d3-force-3d`, no force-simulation code, and no classification or mapping-rule computation
- Given the scene is inspected for geometry, when the renderer is read and scanned, then it draws no line, edge, or connector between any two Bodies — placeholder meshes only, with orbit expressed as Planet position
- Given the app loads, when First Paint occurs, then the DOM destination index is in the document before the scene chunk is requested, and the entry chunk's module graph contains no Three
- Given a static import of a renderer, or of `three`, is added on the entry path, when `npm run gate` runs, then it fails naming the file, the line, and the README rule
- Given the scene has mounted, when a screen reader traverses the document, then the canvas root is `aria-hidden="true"` and every destination is still reachable through the index
- Given the app is opened in a browser, when the scene has mounted, then the canvas occupies real area on the page and every Body in the committed artifact is inside the camera's frustum — a Body solved off-frame is a Body the visitor cannot see
- Given a real `three.PerspectiveCamera` is built at the framing's position and given the orientation the renderer actually produces, when `Frustum.containsPoint` is tested for every Body at `NARROWEST_ASPECT`, then every Body is contained — and the same assertion fails if the camera is aimed anywhere else, so it observes the orientation rather than assuming it
- Given the scene chunk fails to load, or the model throws on a malformed artifact, when React renders, then the DOM destination index remains in the document and focusable — the presentational surface failing never removes the interface
- Given a ratchet scan is written for a rule this story states, when the scan runs, then it is exercised against a reconstructed violation and rejects it, not only against the clean file — a scan that cannot fail is not a ratchet
- Given `npm test`, `npm run typecheck`, `npm run gate` and `npm run build` run, then all pass with no new dependency added

## Spec Change Log

**The `zustand/react` boundary row was checked and is not writable — the source scan is what shipped.** The Code Map required confirming `packageOf`'s subpath granularity before writing the row. Confirmed: `packageOf` in `src/derive/boundaries.ts` splits a bare specifier on `/` and returns the first segment (or the first two for a scoped package), so `zustand/react` and `zustand/vanilla` both reduce to `zustand`. A `neverPackages: ['zustand']` row on `render-scene` would therefore ban the navigation store that `src/render-scene/README.md:5` explicitly permits. The stated fallback was taken: `scene-model.test.ts` scans `scene.tsx` for a `zustand/react` import, for `useStore`, and for `useFrame`, and `src/render-scene/README.md` carries the reason in prose rather than a row banning more than the prose does. `boundaries.test.ts` asserts the row is *absent*, so re-adding it turns the suite red with the explanation attached. `neverPackages: ['d3-force-3d']` on that row shipped as specified.

**`aria-hidden` lands on R3F's wrapper `<div>`, which is the canvas root, not on the `<canvas>` element.** `CanvasProps extends React.HTMLAttributes<HTMLDivElement>`, so every DOM attribute written on `<Canvas>` goes to the wrapper R3F mounts. This satisfies the AC rather than departing from it — `aria-hidden` applies to a subtree, so the `<canvas>` and anything R3F places beside it are hidden together — but the spec's wording implied the attribute would land on the `<canvas>` itself, so the distinction is recorded and is written into `src/render-scene/README.md` and the renderer's header. Verified in a real browser against both the dev server and the production build: walking up from the rendered `<canvas>` reaches `aria-hidden="true"`, and the document's only focusable elements are the index's two buttons.

**`src/shell/scene-host.tsx` restates the artifact's shape inline rather than importing `SceneArtifact`.** An `import type` counts as an import to the boundary parser, and `src/shell/README.md:5` permits `src/render-scene/` only dynamically, so the type-only edge fails the gate — the same reason `index-model.ts` restates its own slice. The two shapes are still checked against each other, because `lazy` types the element's props from the dynamically imported module. Recorded in `deferred-work.md` as a third copy of the artifact's shape.

### Review iteration 1 — six findings, all rooted in this spec rather than in the code

**Triggering findings.** Three review layers ran; the Verification Gap layer proved its findings by executing mutations against the real tree. Six were routed `bad_spec`:

1. **The scene rendered at zero height.** R3F's `<Canvas>` wrapper is `width:100%; height:100%`, the repo contains no CSS at all, and `<div id="root">` has no height — so the surface collapsed and no Body was visible. The spec's `**Never:** No styling… Epic 3` was read, reasonably, as forbidding the sizing that gives the surface extent.
2. **The default camera could not frame the Bodies.** The committed Planet sits at `x: 10`; R3F's default camera sits near the origin looking down `-z` at a modest distance. The spec said "a static default view only" without saying it must *see* the Bodies.
3. **A failed chunk fetch destroyed the DOM index.** `buildScene` throws inside the render path under a bare `<Suspense>` with no error boundary, so a stale chunk hash after deploy unmounts the whole root — including the index AD-4 guarantees survives independently of the 3D surface.
4. **The `aria-hidden` scan never checked the value.** Proven: `aria-hidden="false"` and `aria-hidden={false}` both pass the scan, because the pattern stops at the opening quote or brace.
5. **The connector ban missed drei's `<Line>`.** Proven: importing `Line` from `@react-three/drei` — a pinned dependency, and the idiomatic line in this stack — and rendering it passes every check. The element regex is case-sensitive and the substring list names only lowercase intrinsics.
6. **Nothing asserted that `App.tsx` mounts the scene.** Proven by deletion: removing both the import and the element leaves 487/487 green, typecheck clean, gate clean. The story's entire deliverable can vanish silently.

**What was amended.** The Code Map and Tasks gained: an explicit licence to size the surface and to place a default camera that frames the solved extent, both distinguished from the visual identity the Never list defers; a required error boundary around the lazy edge, with the index's survival as its stated purpose; and the `auditAria` idiom — every new ratchet scan must be driven over *reconstructed bad forms* and asserted to reject them, not merely to pass over a clean file. Acceptance Criteria gained a visible-extent criterion, a value-checked ARIA criterion, and a mount-pinned criterion.

**Known-bad state avoided.** Shipping a story titled "Bodies at rest in the 3D scene" in which no Body is visible, guarded by three ratchets that report green while the rules they name are violable — and a lazy boundary whose failure mode removes the accessible surface the epic is built around.

**KEEP — these were right and must survive re-derivation:**
- `scene-model.ts` importing **nothing at all**. Pure structure, zero imports, so AD-3 is structural rather than asserted. Its duplicate-ID and non-finite-coordinate guards throw naming the offender; keep both and their messages.
- The **structural restatement** of the artifact slice in `scene-model.ts`, and the separate one in `scene-host.tsx` with its reason (an `import type` is still an import to the boundary parser).
- The **boundary rows exactly as shipped**: `dynamicOnly` renderers plus `neverPackages` Three on `ROOT_RULE` and `shell`; `neverPackages: ['d3-force-3d']` on `render-scene`. And the **negative controls** — "the entry path keeps React, and `src/render-scene/` keeps Three", "the scene may still reach the navigation store" — which prove the rows do not over-ban.
- The **`zustand/react` finding and its resolution**: `packageOf` reduces every subpath to its package, so the row would ban the permitted store. The source-scan fallback, the absent-row assertion in `boundaries.test.ts`, and the prose reason in the README all stay.
- The **5-Client / 10-Project fixture with its anti-vacuity guard**, and the reversed-order fixture that makes a hidden sort separable.
- `radiusOf`'s **refusal to sum a Star's mass** — that would be a fourth mapping rule in the directory forbidden to hold any. (Re-derive it discriminating on `body.kind`, not on `mass === undefined`.)
- The **chunk split itself**: entry 196 kB with zero Three across five symbol probes, scene 881 kB separate.

### Review iteration 2 — the camera is aimed at the wrong point, and the test cannot see it

**Triggering finding.** `frameBodies` returns a `position`/`target` pair and documents that `target` is returned rather than applied, on the reasoning that "a camera at its default orientation — looking down `-z`, which is Three's — is already pointing at the centre." That is false for the pinned renderer. React Three Fiber 9.7.0 calls `camera.lookAt(0, 0, 0)` whenever the `camera` prop carries no `rotation` (`node_modules/@react-three/fiber/dist/events-156d8d12.esm.js:15786`, under its own comment "Always look at center by default"). So the shipped camera aims at the **world origin**, not at the Bodies' centre, and `framing.target` is consumed nowhere in shipped code.

Proven by executing the pinned `three` build against the committed artifact — centre `[5,0,0]`, camera `[5,0,38.12]`, fov 50, at `NARROWEST_ASPECT`:

```
aim = origin (what R3F actually does)     aim = target (what the model assumes)
  client:sncf                  IN          client:sncf                  IN
  project:sncf/client-refer…   OUT         project:sncf/client-refer…   IN
```

The one committed Planet is outside the frustum on the surface the story ships, with all 488 tests green.

**Why this is the spec's failure.** Iteration 1's amendment said "pass a `camera` prop positioned to frame the artifact's solved extent" — it specified **position** and said nothing about **orientation**. Worse, it licensed a containment test built from axis-aligned arithmetic around the camera's own `x`/`y` (`|x - cx| <= tan(halfFov) * aspect * depth`), which is valid only if the camera's forward axis is exactly `-z`. A test that assumes the orientation cannot observe the orientation being wrong. **This is the second time this story has shipped Bodies off-frame with a green suite** — first through the horizontal fit, now through aiming. The pattern is the lesson: geometry asserted by re-deriving the same arithmetic the code uses proves only that the arithmetic is self-consistent.

**What was amended.** The Code Map and Tasks now require: the camera's orientation pinned explicitly (supply `rotation`, or apply `lookAt` on the real camera object, or centre the framing so origin-aiming is correct — the choice is the implementer's, the *pinning* is not); and containment asserted by constructing a real `three.PerspectiveCamera`, applying the orientation the renderer actually produces, and testing `Frustum.containsPoint` for every Body — never by re-deriving the projection in the test. `three` loads under `node --test` from inside this project, already verified, so this is available at zero dependency cost. A new AC states it.

**Known-bad state avoided.** Shipping a scene whose one visible Body is outside the frustum, guarded by a containment test that passes precisely because it shares the code's own false assumption — the third instance of a ratchet that reports green while the rule it names is violated.

**KEEP — everything in iteration 1's KEEP list still holds, plus:**
- **`NARROWEST_ASPECT` and the horizontal-fit `Math.max`.** The distance work is correct and its mutation test bites: reverting to vertical-only fails 3 tests (verified). The bug is aiming, not distance; do not undo the fit while fixing the aim.
- **`frameBodies` as a pure model function**, computed from the Bodies rather than hard-coded, with its empty-artifact and degenerate-fov fallbacks.
- **The ratchets that now bite**, all re-verified by mutation this round: `aria-hidden="false"` fails, a drei `<Line>` fails, deleting `App.tsx`'s mount fails, removing the canvas extent fails, disabling both error-boundary hooks fails.
- **The directory-coverage test** — it does fire on a module in a subdirectory (reviewer probed it), so keep it while widening the scans.
- **The error boundary wrapping `<Suspense>`** in that order, with its ordering assertion.

**Fold in these patch-level fixes during re-derivation:**
- `radiusOf` keys on `body.kind` correctly but **no scan pins it** — add one, or move it into the model where a runner reaches it.
- `<directionalLight position={[...framing.position]}>` sits exactly at the camera, producing the flat silhouettes its own adjacent comment says two sources exist to prevent. Offset it.
- `BODY_MARGIN` (`scene-model.ts`) and `STAR_RADIUS` (`scene.tsx`) are uncoupled across two files; safe at 3 > 1 today, silently wrong if Epic 3 raises the radius. Couple or assert.
- Two `node:fs` imports on consecutive lines; house style is one destructured import per module.
- `readdirSync` without `withFileTypes`, so a subdirectory reads as an unscanned module.
- `SceneHostArtifact`'s element objects are mutable where `SceneArtifact`'s are `readonly`; the docstring claims the shapes cannot drift.
- No `near` is returned or passed, so R3F's default `0.1` governs while the containment test asserts only `depth > 0`.

## Design Notes

**Why the ~15–16 Body count is proven against a fixture, not against authored data.** The AC names ~5–6 Stars and ~10 Planets; `src/data/career.json` holds one Project under one Client, so the artifact emits one Star and one Planet. The renderer reads and never derives (AD-3), so no scene code can close that gap — it is a data question, and authoring real career content is a second, independently shippable deliverable that needs facts the repo does not hold. So `buildScene` is proven correct at *any* cardinality over an in-memory 5-Client / 10-Project fixture, exactly as `index-model.test.ts` proves ordering over a fixture whose Rail opposes the emitted `clients` order, and the authored-data shortfall is recorded in `deferred-work.md`. What this story cannot deliver is the *pacing judgement* the epic gates on — that needs real Bodies on screen, and it should be re-asked once the data lands.

**Why the model/renderer split repeats here.** `node --test` under Node 24's type stripping cannot load a `.tsx` file in any position, and adding a transform means adding dependencies to a set closed at fifteen pins. Story 2.1 accepted that residual for `index-nav.tsx` and 2.2 improved on it by keeping the store in pure `.ts`. The same lever is available here and is worth more: `three` imports cleanly under the built-in runner (verified by probe from inside the project), so the flattening, the identity guarantees and both guards are *executed* rather than read off source. What stays in `.tsx` is the mesh mapping, which is the part no unit test would meaningfully assert anyway — scene correctness is perceptual and is tested by looking at it.

**Why the boundary rows land in this story and not earlier.** `main.tsx:12-17` states the case exactly: the renderer `dynamicOnly` rule "belongs with the story that introduces the first one, together with the README sentence that would license it." Until now there was no renderer to import, so the row would have had no subject and the prose no reason to exist. Both arrive together here, which is also when the hoist first becomes reachable — a static `import { Scene } from './render-scene/scene.tsx'` in `App.tsx` would put Three on the entry chunk and pass the gate green today.

**The `zustand/react` ban needs a parser check before it is written.** The scene must not subscribe reactively, but it *may* legitimately reach `src/shell/` state, which imports `zustand/vanilla`. Whether `neverPackages` can express `zustand/react` without also banning `zustand` depends on how `packageOf` treats a subpath — the deferred-work entry proposes the row but does not verify it. Confirm first; if the table cannot express the distinction, a source scan in `scene-model.test.ts` is the honest fallback, and the reason belongs in the README rather than in a row that bans more than the prose does.

## Verification

**Commands:**
- `npm test` -- expected: all pass, 448 existing plus the new `scene-model.test.ts` and `boundaries.test.ts` cases, zero failures
- `npm run typecheck` -- expected: clean, no errors
- `npm run gate` -- expected: "the layout artifact is present and valid."
- `npm run build` -- expected: gate passes, then Vite builds
- `git diff --stat package.json package-lock.json` -- expected: empty; the dependency set is unchanged at fifteen pins
- Inspect `dist/assets/` after `npm run build` -- expected: the entry chunk contains no Three; the scene is a separate chunk

**Manual checks (if no CLI):**
- `npm run dev`: a Star and its orbiting Planet are drawn at their solved positions; no line or connector anywhere; the index renders before the canvas appears
- The canvas element carries `aria-hidden="true"`; tabbing reaches every index entry and never lands inside the canvas

## Suggested Review Order

**The model — where every rule lives**

- Start here: the artifact slice restated structurally, because `render-scene/` may not import `derive/`.
  [`scene-model.ts:54`](../../src/render-scene/scene-model.ts#L54)

- The whole story in one function: Clients and Projects flattened to Bodies, read and never derived.
  [`scene-model.ts:163`](../../src/render-scene/scene-model.ts#L163)

- Zero imports in this module is what makes AD-3 structural rather than asserted.
  [`scene-model.ts:1`](../../src/render-scene/scene-model.ts#L1)

**The camera — the part that broke twice**

- Framing returns an explicit rotation; an omitted one is what R3F replaces with `lookAt(0,0,0)`.
  [`scene-model.ts:324`](../../src/render-scene/scene-model.ts#L324)

- The narrowest supported aspect, stated as a bound — portrait viewports narrow the Rail's own axis.
  [`scene-model.ts:247`](../../src/render-scene/scene-model.ts#L247)

- Position, rotation, near and far all passed, so no frustum plane is a dependency default.
  [`scene.tsx:109`](../../src/render-scene/scene.tsx#L109)

**The renderer and its host**

- A mapping and nothing else: one sphere per Body inside an `aria-hidden` canvas.
  [`scene.tsx:97`](../../src/render-scene/scene.tsx#L97)

- Radius keys on `body.kind`, never on a missing field, so a mass-less Planet surfaces.
  [`scene.tsx:82`](../../src/render-scene/scene.tsx#L82)

- The error boundary wraps Suspense: a failed chunk must not remove the DOM index.
  [`scene-host.tsx:109`](../../src/shell/scene-host.tsx#L109)

- The one dynamic edge into the scene, which is what keeps Three off the entry chunk.
  [`scene-host.tsx:52`](../../src/shell/scene-host.tsx#L52)

- One element, index first — `App.tsx` stays a mount point.
  [`App.tsx:40`](../../src/App.tsx#L40)

**The boundary rows that make AD-7 enforced**

- The entry stub gains dynamic-only renderers and a Three ban by package name.
  [`boundaries.ts:254`](../../src/derive/boundaries.ts#L254)

- The scene may never reach the solver — a force step here needs no `derive/` import.
  [`boundaries.ts:163`](../../src/derive/boundaries.ts#L163)

**Tests worth reading — each proven to fail, not merely to pass**

- Containment through a real `PerspectiveCamera` and `Frustum`, never re-derived arithmetic.
  [`scene-model.test.ts:520`](../../src/render-scene/scene-model.test.ts#L520)

- The negative control: aimed at the origin, the same assertion fails — it observes the aim.
  [`scene-model.test.ts:540`](../../src/render-scene/scene-model.test.ts#L540)

- The ARIA checker rejects a false value, which the first implementation's scan accepted.
  [`scene-model.test.ts:886`](../../src/render-scene/scene-model.test.ts#L886)

- The connector ban rejects drei's `<Line>` — the idiomatic line in this pinned stack.
  [`scene-model.test.ts:977`](../../src/render-scene/scene-model.test.ts#L977)

- The mount is pinned, because deleting it once left the whole suite green.
  [`scene-model.test.ts:1154`](../../src/render-scene/scene-model.test.ts#L1154)

- Directory coverage, so story 2.5's camera arrives with a red suite naming itself.
  [`scene-model.test.ts:1179`](../../src/render-scene/scene-model.test.ts#L1179)

- A static renderer import from the entry stub fails; the dynamic form is accepted.
  [`boundaries.test.ts:312`](../../src/derive/boundaries.test.ts#L312)
