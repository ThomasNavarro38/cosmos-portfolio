# src/render-scene/

The 3D surface: React Three Fiber, drei, three. Reads solved positions and derived visual properties from the artifact and renders them. Contains no classification test and no data-to-visual mapping — those live in `src/derive/`.

**Imports:** `generated/layout.generated.json`, `src/tokens/`, and `src/shell/` state. Never `src/data/`, never `src/derive/`.
**Imported by:** `src/shell/` via dynamic import only, so Three stays off the entry path.

## Files

| File | Role |
| --- | --- |
| `scene-model.ts` | The scene as a pure view model: the artifact flattened into one `Body` list — a Star per Client, a Planet per Project, each at its solved position — plus the default framing computed from those Bodies. Every AC-bearing rule lives here. Imports nothing at all. |
| `scene-model.test.ts` | The whole Body matrix executed over in-memory fixtures — cardinality at 5 Clients / 10 Projects, identity, ordering, Company-is-an-attribute, the duplicate-ID and non-finite-coordinate guards — plus frustum containment through a real `three.PerspectiveCamera`, and the source scans that ratchet what the runner cannot load. |
| `scene.tsx` | The thin renderer: `<Canvas aria-hidden="true">` mapping the model's Bodies to placeholder spheres, sized by `kind`. No rule of its own, no state, no subscription, no frame callback, no interaction. |

```sh
npm test        # every *.test.ts under src/, this suite included
npm run typecheck
```

## The scene reads, and never derives

Every value this surface draws was resolved in `src/derive/` and emitted into the artifact (AD-3). Positions arrive solved; `mass`, `luminanceBand`, `railDistance`, `moteTier` and `isDeep` arrive resolved. Nothing here classifies a Project, recomputes a mapping rule, branches on a raw `content` field, or runs a force simulation — and `scene-model.ts` imports **nothing at all**, so that is structural rather than asserted. A renderer that re-derived any of them would put that rule in a second place, and the two would drift the first time either changed. `neverPackages: ['d3-force-3d']` on this directory's boundary row makes "imports nothing from the solver" enforced rather than declared.

**A Company is an attribute, never a Body.** `content.company` names who the work was done through; it adds no entity, so it adds no mesh. **And there is no connector geometry of any kind** — no line, edge, or link between two Bodies. A Planet's orbit is expressed as its solved *position* around its Star, never as a drawn ring. The ban covers drei's `Line`, `QuadraticBezierLine`, `CubicBezierLine` and `Segments` by name as well as Three's `lineSegments` intrinsics, because drei is a pinned dependency and its `<Line>` is the idiomatic line in this stack — a scan matching lowercase intrinsics alone passed a reconstructed `<Line points={…} />` at full green.

## Why the model and the renderer are separate files

`node --test` under Node 24's built-in type stripping cannot load a `.tsx` file **in any position** — `ERR_UNKNOWN_FILE_EXTENSION` at module resolution, before any transform, so a `.ts` test cannot even import a `.tsx` module. Adding a transform means adding dependencies to a set deliberately closed at fifteen exactly-pinned versions.

So every rule an acceptance criterion names lives in `scene-model.ts`: the flattening, the identity guarantees, the ordering, both guards, and the framing. `three` itself *does* load under the built-in runner, so frustum containment is executed too — a real `PerspectiveCamera` at the framing's position and rotation, and `Frustum.containsPoint` for every Body. What is left in `scene.tsx` is the mesh mapping, which is the part no unit test would meaningfully assert anyway: scene correctness is perceptual and is tested by looking at it. That residual is ratcheted — `scene-model.test.ts` scans the renderer and fails if it grows a sort, a filter, a hook, a store write, a re-derivation, or a connector.

## Why the canvas root is `aria-hidden="true"`

The DOM destination index is the interface (AD-4). This surface draws the same destinations a second time, and narrating them twice is worse than not narrating them once: a screen-reader user would walk a list of destinations, then walk a WebGL canvas that announces nothing useful about the same ones. So the canvas subtree is hidden from the accessibility tree and every destination stays reachable through the index.

**The attribute lands on R3F's wrapper `<div>`, not on the `<canvas>`.** `CanvasProps extends React.HTMLAttributes<HTMLDivElement>`, so every DOM attribute written on `<Canvas>` goes to the wrapper R3F mounts. That satisfies the rule rather than departing from it — `aria-hidden` applies to a subtree, so the `<canvas>` and anything R3F places beside it are hidden together — and the wrapper *is* the canvas root. Verified in a browser against both the dev server and the production build: walking up from the rendered `<canvas>` reaches `aria-hidden="true"`, and the document's only focusable elements are the index's buttons. The scan that holds it asserts the attribute's **value**, not its presence: `aria-hidden="false"` and `aria-hidden={false}` both passed a presence-keyed scan at full green.

## The surface has extent, and the camera is aimed

R3F's wrapper is `width: 100%; height: 100%`, and this repo holds no CSS at all — so a `<Canvas>` mounted in a bare `<main>` collapses to zero height and draws nothing. That shipped once and was caught in a browser rather than by a test. The canvas therefore carries an inline size, and the default camera is computed from the Bodies rather than hard-coded, because the solver decides where they land: a constant distance framed the one committed Planet by luck and would lose the first Body solved beyond it. Neither is the visual identity Epic 3 owns — colour, tokens and typography are deferred; whether the surface *exists* and whether the Bodies are inside the frustum are this story's own acceptance.

**The camera's orientation is passed, never inherited.** React Three Fiber calls `camera.lookAt(0, 0, 0)` whenever the `camera` prop carries no `rotation` (`@react-three/fiber/dist/events-156d8d12.esm.js:15786`). A framing that returned a position and a target and trusted the default therefore aimed at the **world origin** rather than at the Bodies' centre, and the committed Planet at `x: 10` fell outside the frustum with all 488 tests green. So `frameBodies` returns an explicit `rotation` of `[0, 0, 0]` and stands the camera on the `+z` side at the centre's own `x` and `y` — an unrotated Three camera looks down `-z`, so looking down `-z` *is* looking at the centre, and there is no target left for a dependency to choose. `near` and `far` are passed for the same reason.

Containment is asserted through a **real** `three.PerspectiveCamera` built at that position and rotation, never by re-deriving the projection. Axis-aligned arithmetic around the camera's own `x`/`y` is valid only if the camera looks down `-z`, so it cannot observe the orientation being wrong — which is precisely how this shipped off-frame twice.

`NARROWEST_ASPECT` is why the fit takes the larger of the vertical and horizontal distances: Three derives the horizontal field of view from the vertical one times the viewport aspect, so a portrait viewport narrows the `x` axis — the axis the Rail runs along. A vertical-only fit lost the outermost Body at 390 × 844.

## The scene reacts to nothing, and writes nothing

No interaction in this story: no raycasting, no click-to-fly, no hover, no Rail traversal, no Shot, no Dwell, no scroll handling, no Dust, no Motes, no Focus. Bodies at rest, and a static view that sees them.

**No write to the navigation store, ever.** `src/shell/state.ts` is the one authority on where the visitor is (AD-9) and every transition is a named event; a `setState` from a renderer would be a transition nobody can find. A tree-wide scan in `state.test.ts` enforces that for every shipped file under `src/`, this directory included.

**And no reactive binding in a frame callback.** A camera subscribed with a hook would re-render its whole tree on every progress write, sixty times a second, to obtain a value it is about to read anyway; the path is `navigationStore.getState()` inside the callback. That rule is held by a **source scan** rather than by a boundary row, and the reason is worth stating: `packageOf` in `src/derive/boundaries.ts` reduces every bare specifier to its package, so `zustand/react` and `zustand/vanilla` are both `zustand` — a `neverPackages: ['zustand']` row here would ban the navigation store this file's import line explicitly permits. So `scene-model.test.ts` scans for a `zustand/react` import, for `useStore` and for `useFrame`, and `boundaries.test.ts` asserts the row is absent so re-adding it fails with this explanation attached. The scan is narrower than the row would have been: it names `scene.tsx` and the forms listed, not every route to a subscription — `deferred-work.md` records what it does not reach.
