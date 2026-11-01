# Adversarial review: M3 update to the architecture spine

**Reviewed:** the uncommitted `ARCHITECTURE-SPINE.md` and `.memlog.md` (AD-19 to AD-24; AD-7 and AD-12 amended), dated 2026-11-01.
**Lens:** two units one level down, each obeying every AD to the letter, that still build incompatibly.
**Scope:** nothing was edited but this file. One throwaway script was run from the session scratchpad (method in Appendix A).

**Evidence labels:**

- **[CODE]**: read in the repo or in `node_modules` at the pinned version.
- **[COMPUTED]**: calculated from the shipped pure models and the committed `generated/layout.generated.json`.
- **[INFERENCE]**: reasoned from how three or the bundler works, not run. Nothing here was run on a GPU.

## Verdict

The update is not buildable as written. AD-19's depth rule contradicts itself, AD-22 forbids something the shipped code and R3F already do, and `appearance`, the manifest and the realism lifecycle each have room for two incompatible owners. Close P1 to P5 before any story is cut. P6 to P12 are cheap tightenings that can land in the same pass.

| # | Severity | Hole | ADs |
| --- | --- | --- | --- |
| P1 | Critical | A depth-writing sphere hides the Star's core dot, and "inside the outline at every pose" forces a visible gap | AD-19, AD-23, AD-20 |
| P2 | Critical | `appearance` and the manifest: three owners, three shapes, and a live solve that can't reach `public/` | AD-21, AD-3, AD-13, AD-14, AD-17 |
| P3 | High | Realism lifecycle has no owner; the Suspense rule is already false; a remount can't "reuse what is loaded" | AD-22, AD-9, AD-16, AD-7 |
| P4 | High | The sampling reset comes after the stall it exists to absorb, and the caller is banned by a test | AD-22, AD-8, AD-23 |
| P5 | High | The noise-textured Dust can't satisfy the fade, zero draw calls and the `scene.tsx` audit at once | AD-19, AD-22, AD-23, AD-21 |
| P6 | Medium | Render-order ladder has no declared values and no owner | AD-19 |
| P7 | Medium | "Fills at opacity 1 and write depth" against "the layer fades in" | AD-19, AD-22 |
| P8 | Medium | Budgets in "one module" that the gate may not import and that no single check can read | AD-23, AD-7, AD-21 |
| P9 | Medium | The Colophon's "rules between" exhibit against a new derived field | AD-13, AD-21 |
| P10 | Medium | Star glow token against the achromatic audit | AD-12, AD-19, AD-20 |
| P11 | Low | `motionPace` can't make a Planet hold still | AD-20, AD-22 |
| P12 | Low | The worst-window exposure has no home, and the monitor stops at the latch | AD-23 |

---

## P1. Critical: a Star's core dot does not survive its own fill, and the outline rule forces a gap

**ADs:** AD-19 ("write depth", "never its own Body's marks: its radius stays inside the outline at every reachable pose"), AD-23 (sphere geometry), AD-20.

**Unit A, the fill unit.** A `realism/` mesh on the shared sphere geometry at the Star's position, drawn at the realism order, `depthWrite` on, radius just inside the outline. It obeys AD-19 and AD-23 exactly.

**Unit B, the line-work.** `body-field.tsx` unchanged, as AD-19 requires ("everything else stays as M2 draws it", "an exemption may name `realism/` only").

**Why they clash.**

- [CODE] The core dot is a `circleGeometry` in the Star's `<Billboard>`, so it lies on the plane through the Star's centre (`body-field.tsx:87-92`). Its `meshBasicMaterial` leaves `depthTest` at its default, on. `CORE_RADIUS_RATIO` is 0.15.
- [INFERENCE, plain geometry] A sphere's front hemisphere is nearer the camera than that plane, at every pixel inside its silhouette. So any fill with a radius above 0.15 fails the dot on the depth test and removes it. The AD's radius clause protects the outline and says nothing about marks *inside* the outline.
- [CODE] The dot is not decoration: it takes the outline's colour, so "the subject's core is white" (`stroke-model.ts:238-245`). Removing it removes part of the one-white-subject signal.
- The fix can't go in `body-field.tsx`, because `depthTest={false}` there would need an exemption that doesn't name `realism/`. It would also make the dot show through a nearer Planet's fill.

**The outline half is also broken.** A sphere projects as an ellipse stretched radially off-axis. The outline is a billboard parallel to the image plane, so it stays a true circle. [COMPUTED] The largest fill radius, as a share of the outline, that stays inside it:

| Pose set | Largest fill / outline |
| --- | --- |
| A stop Star, its own stop, 16:9 | 0.998 |
| The Focused Planet, 16:9, panel 0.46 (outline radius 60px at 1080p) | 0.918 |
| Rail travel, 16:9, Bodies at least 20px in radius | 0.750 (a Star of radius 90px at 0.752) |
| Rail travel, 21:9 | 0.654 (a Planet of radius 37px) |

So two units read the same sentence and diverge:

- A fill tuned at 0.95 in Focus, where it looks right, spills past its outline during Rail travel.
- A fill at 0.75, which meets "every reachable pose", leaves a dark ring about 15px wide around the Focused Planet. That defeats the realism the pass exists for.

**Also unsettled.** A Planet's own orbit runs through its centre (`stroke-model.ts:253-255`), so any depth-writing fill interrupts it. `sceneLines` keys it to the Planet (`orbit:<id>`), so whether it counts as "its own Body's marks" is open. The same applies to the Rail, which runs through each stop Star (`rail-model.ts:485`).

**Proposed AD-19 tightening.**

> A fill is drawn with its Body's billboard transform, not as a world-space sphere. The shared sphere's vertices are placed in view space at the Body's centre depth (`gl_Position = P * vec4(c.xy + (MV3 * position).xy, c.z, 1)`), so its silhouette is a true circle of radius `FILL_RADIUS_RATIO × bodyRadius` concentric with the outline at every pose, and its depth is the depth of the plane its marks are drawn on, biased behind them. `FILL_RADIUS_RATIO` is one constant, below 1, pinned by a test against the outline's own radius. "A Body's marks" means its outline, core dot, Ring and Moon. An orbit and the Rail are not marks: the near half of an orbit passes over its Planet and the far half behind it.

The sphere geometry budget, its UVs and the lighting normals all stay. No change to `body-field.tsx` is needed.

Unproven: the bias against z-fighting at Rail distances (D about 150, far plane large). That is a spike for the first story, and it is [INFERENCE] that a polygon offset is enough.

---

## P2. Critical: `appearance` and the manifest have room for three owners

**ADs:** AD-21, AD-3, AD-13, AD-14, AD-17, AD-24.

AD-21 fixes that `src/derive/` assigns appearance from the ID, and that a manifest sits in `public/textures/`. It doesn't fix how derive learns what maps exist, what `appearance.map` holds, or who reads the manifest.

**Unit A: derive imports the manifest.** `import manifest from '../../public/textures/manifest.json'` in a new `derive/appearance.ts`. `targetDirectoryOf` returns `undefined` for a path outside `src/`, so no boundary row sees it ([CODE] `boundaries.ts:482-489`). `map` holds a URL, and the renderer loads what it finds.

**Unit B: the manifest reaches derive as an argument.** `index.ts` reads the file, which is permitted because it already owns the filesystem, and passes it down through `solveArtifact(career, digest, library)`. `map` holds an index or short ID, and the scene builds the URL.

**Unit C: derive keeps its own list.** A constant `MAP_IDS`, in the repo's mirrored-constant idiom, with the manifest a second copy for credits. The Colophon then fetches `textures/manifest.json`.

All three obey AD-21. They can't be combined, and each breaks something the spine doesn't mention:

- [CODE] **Unit B breaks the live re-solve.** `solveLive(careerText)` takes the career text alone and must stay browser-safe, with no `node:*` (`live.ts:25-27`). `colophon-claims.test.ts:149-151` pins `committed === solveLive(career.json)` byte for byte. An extra argument means an extra fetch in the Colophon or a red test.
- [CODE] **Unit C breaks ratified copy.** `ABSENCES.data` reads "The two files above are all the data there is", and the thesis reads "only career.json is authored". `absences.test.ts:198-202` pins "two" to the count of `EXHIBIT_PATHS`. A manifest fetched as a third file, holding authored URLs and licences, falsifies both claims, and the copy is Thomas's ruling verbatim.
- [INFERENCE] **Unit A takes a public asset into the `solver` chunk.** Vite warns on importing from `public/`, and `node --test` needs an import attribute there. It also makes the map list part of the solve without being covered by `sourceDigest`.
- [CODE] **Nothing catches a stale artifact.** `sourceDigest` covers `career.json` only (`index.ts:821-841`). If a map is removed or renamed without a re-solve, the gate stays green, the fetch 404s, and AD-22's silent failure hides it: every visitor sees the schematic scene and no error appears anywhere. AD-21's gate only covers a map with no manifest entry, not an artifact naming a map that doesn't exist.

**Further shape gaps, each one a clash on first contact.**

- **Stars.** "Each Body's appearance (map, axial tilt, spin rate, spin phase)". But AD-20 says only a Planet spins, and a Star is "unlit and emissive". [CODE] `ArtifactClientSchema` is a `strictObject` carrying no derived visual fields today, and `Body` documents Stars as absent for those fields. One unit emits the full shape on Clients. Another emits `map` only, or nothing, and draws Stars from a token.
- **One library, two kinds.** Nothing stops the hash from giving a Star an Earth map or a Planet a solar map. "By hash" doesn't say *within which set*.
- **"Adding a Project reassigns no other Body" is true, but adding a map isn't covered.** `hash % library.length` reassigns nearly every Body when the library grows from 11 to 12. AD-23 allows up to 12 and AD-24 treats a library change as a re-capture, so growth is expected.
- **Preload set.** The renderer can upload the maps the artifact names (a distinct set) or every map in the manifest. Both are defensible, and they differ on cost.
- **Restatements.** [CODE] The artifact's shape is restated in `SceneArtifact` and `SceneHostArtifact`, and both need the new field. That's the existing idiom and not a hole, but the first story should expect it.

**Proposed AD-21 tightening.**

> The library is one pure, browser-safe module in `src/derive/` (`map-library.ts`): for each map its bare `id`, the Body kinds it may be assigned to, its source URL and its licence. `public/textures/` holds pixels only, named `<id>.webp`; there is no JSON manifest in `public/`. `appearance.map` is that bare `id`, and the scene resolves it by one rule, `<base>textures/<id>.webp`. Assignment is rendezvous hashing over the eligible IDs, so adding a map moves only the Bodies that map wins. A Planet's `appearance` is `{ map, tilt, spinRate, spinPhase }`; a Star's is `{ map }`, and a Star doesn't spin. Only `solveArtifact`'s path reads the library, so `solveLive(career.json)` stays byte-identical. The gate checks both directions: every `appearance.map` has a library entry and a file, and every file in `public/textures/` has an entry. The Colophon reads credits through its existing dynamic edge into `src/derive/`, never by fetching a third file. The scene preloads the distinct maps the artifact names.

**This needs a ruling.** Even this design strains "layout.generated.json is solved from [career.json]", because an appearance now also depends on the library. The thesis and data paragraphs may need a re-ruling beside it. It's still the smallest disturbance available: no third file, no third fetch, and the byte-equality test still holds.

---

## P3. High: the realism lifecycle has no owner, and AD-22 forbids what already ships

**ADs:** AD-22, AD-9, AD-16, AD-7; `scene.tsx`'s audit.

**Who owns "loaded".** [CODE] `scene.tsx` may hold no hook, state, effect or `useFrame` (`scene-model.test.ts:917-920`). AD-22 says "the scene imports the `realism` chunk" and doesn't name which module. So:

- **Unit A** adds `realismReady` to `navigationStore`, with a named event and one writer. It obeys AD-9 and AD-16 to the letter, and `BodyField`-style subscribers read it.
- **Unit B** copies the `motion-preference.ts` and `chart-offer.ts` shape, a module-level value, citing chart-offer's own reasoning: "it is not where the visitor is, so it has no place in `navigationStore`". That lands in `shell/` or in `render-scene/`.
- **Unit C** keeps the state inside the `realism` chunk. Nothing outside the chunk can then read it without importing the chunk, which is what the state was meant to gate.

Each is consistent with the spine. A fade, a remount and a failure then each get implemented three ways.

**The Suspense rule is already false.** AD-22 reads: "No Suspense boundary may enclose the `<Canvas>` or the line-work."

- [CODE] `scene-host.tsx:313` wraps `<Scene>`, and so the `<Canvas>`, in `<Suspense fallback={null}>`. `scene-model.test.ts:2567-2573` pins that nesting.
- [CODE] R3F wraps every Canvas child, line-work included, in its own `React.Suspense` (`react-three-fiber.esm.js:105`).

A literal reader must remove the first, which breaks `lazy(Scene)`, and can't remove the second. A lenient reader takes it to mean "no new boundary", which leaves the real danger open.

- [CODE] **The real danger.** With no inner boundary, a child that suspends (`lazy`, `useTexture`, `useLoader`) reaches R3F's `Block`, which sets a never-resolving promise that R3F's Canvas component then throws (`events-156d8d12.esm.js:66-73`, `react-three-fiber.esm.js:58`). That suspends to `scene-host`'s boundary, which hides the whole canvas. The `SceneMounted` layout effect clears too, and the Rail input goes dead. Hence a unit that writes `const Fills = lazy(...)` with no inner boundary blanks the scene at the moment realism starts loading.
- [CODE] **The failure path is the same trap.** An error thrown by any realism component goes through R3F's `ErrorBoundary`, is rethrown, and lands in `SceneBoundary`, which renders `null` and logs (`scene-host.tsx:176-193`). So the scene disappears, where AD-22 says "the schematic scene simply stays". A throw inside a `useFrame` stops the whole frame loop, with no boundary to catch it (`focus-model.ts:92-95` already records this).

**A remount can't reuse what's loaded.** AD-22: "A remount in the same document reuses what is loaded and draws realism from its first frame."

- [CODE] Leaving for `/chart` or `/colophon` unmounts `<SceneHost>`, because each surface is an early return in `App.tsx`. Canvas cleanup runs `unmountComponentAtNode`, which calls `gl.forceContextLoss()` 500ms later (`events-156d8d12.esm.js:15974-15988`). The return mounts a new `<canvas>` with a new renderer.
- [INFERENCE, high confidence] GPU textures and linked programs belong to the old context. Decoded images and JS modules survive; uploads and compiles don't. So the same sentence collides with "Maps are uploaded and shaders compiled before anything shows": the remount must upload 12 maps and compile again *inside* its first frame, or show one schematic frame first.
- A remount mid-fade, mid-load or after a failure is unspecified. Does a failed load retry on return? "No retry" is plausibly per-attempt or per-document. A unit that closes `ImageBitmap`s after upload to save memory obeys everything and then can't re-upload at all.

**AD-7's fifth chunk isn't enforced.** [CODE] Boundary rows resolve to the first path segment only, so `render-scene/realism/` isn't a separate directory (`boundaries.ts:482-489`). Therefore `shell/` may `import('../render-scene/realism/x.ts')` and `scene.tsx` may import realism statically, hoisting it onto the First Paint path. Both pass the gate. The bundle assertion checks the entry graph and has no idea a `realism` chunk should exist, so its absence passes by vacuity.

**Proposed new AD-25: one owner for the realism lifecycle.**

> `render-scene/realism-mount.tsx`, mounted once in `scene.tsx` with no conditional, is the only module that imports `./realism/`, and it does so by one memoised `import()` per document. Its status lives in a pure sibling (`realism-status.ts`, in `motion-preference.ts`'s shape) and never in `navigationStore`: it is not where the visitor is. Status has two scopes. **Document:** `idle → loading → decoded → shown`, or `failed`. `failed` is terminal for the document, so there's no retry across a remount. **Context:** `uploaded`, reset by every new Canvas. It starts on the frame after the first draw. The first entry to `shown` fades in; every later Canvas in that document uploads again and compiles before its first draw, then draws realism with no fade. A remount mid-fade counts as shown. Decoded images are never closed.
>
> **Nothing under the `<Canvas>` may suspend:** no `lazy`, no `use`, no `useLoader`, no `useTexture`. Loading is imperative and every rejection is caught there, so no realism failure reaches R3F's boundary or `SceneBoundary`. Realism's frame callback catches its own errors and sets `failed`. (This replaces AD-22's Suspense sentence, which describes a boundary that shipping code and R3F require.)
>
> The bundle assertion requires a chunk whose facade is `render-scene/realism/index.ts`, fails if it's missing, and fails if any `render-scene/realism/` module is in the static closure of the scene chunk or the entry.

The audit for `realism-mount.tsx` has to follow the existing pattern, with the logic in a `.ts` model, because `node --test` can't load a `.tsx`.

---

## P4. High: the sampling reset arrives after the damage, and its caller is banned

**ADs:** AD-22 ("The frame-time sampling resets when the fade begins"; prevents "an upload stall latching the chart offer"), AD-8, AD-23.

**The timing doesn't deliver the stated purpose.** AD-22's own order is: upload and compile, *then* fade, and only then reset. [CODE] The latch is one-way (`if (offered) return`; "The latch is kept"), so a reset after the stall can't undo it.

Worked through `chart-offer.ts`'s real arithmetic:

- A delta above 1s is a gap and resets the window. So one big stall is harmless, and the danger is many stalled frames under 1s, which are counted as frames.
- On a machine at exactly NFR-2's 30fps, a five-second window holding `s` seconds of stall has about `(150 − 30s + n) / 5` fps, for `n` stalled frames. That falls under 24fps at `s > 1 + n/30`.
- So about **1.1 to 1.4 seconds** of upload and compile, spread over 3 to 12 frames, latches the offer permanently. Uploading one map per frame, the considerate design, is the worst case for the monitor.
- It only applies once the warm-up is spent, 2s after the host's reset. On a cold load with 4MB of maps that's when the maps arrive. [INFERENCE] 1.1s across 12 maps plus shader compile is plausible on integrated graphics; `first-frame-mark.tsx` itself says a shader compile there "can take hundreds of milliseconds".

**The caller is banned.** [CODE] `chart-offer.test.ts:263-315` pins the importers to the chrome, the scene host and the sampler. `scene-model.test.ts:3265` pins the sampler's imports exactly, and its mutation list rejects "the sampler resets". `chart-offer.ts:32` and `frame-sampler.tsx` both state that resets are `scene-host.tsx`'s. But the host can't know when the fade begins, because `shell/` reaches `render-scene/` by dynamic import only.

So:

- **Unit A** has `realism/` import `resetFrameSampling`. It obeys AD-22 and fails the importer pin.
- **Unit B** has `scene-host` subscribe to a new realism signal in `shell/`. It keeps the pin and adds a shared module AD-22 never mentions.

Both are readings of the spine, and each one's tests fail against the other's code.

**Proposed AD-22 tightening.**

> Sampling resets twice, when upload begins and when the fade begins, so an upload is always inside a warm-up. `realism-mount.tsx` (AD-25) is the one caller of those two resets, and takes `resetFrameSampling` alone from `chart-offer.ts`. The host keeps its two. `chart-offer.test.ts`'s importer table and the module's header both change in the same story. A remount needs no extra reset: the host's own mount reset already covers its first frames.

An upload running longer than warm-up plus window, about 7s, may still latch, and that's correct: that machine is below the floor.

---

## P5. High: the noise-textured Dust fits nowhere

**ADs:** AD-19 ("a noise-textured Dust medium", "one medium per Client"), AD-22 (the layer fades in "once, whole"), AD-23 ("Added draw calls: 0 for Dust"; the library admits only NASA maps), AD-21.

Today [CODE] the medium is `<sprite>`s mapped directly in `scene.tsx`, sharing one module-scope `MEDIUM_TEXTURE`, the falloff `DataTexture` (`scene.tsx:121-128, 191-206`). `auditDrawOrder` holds those sprites, and `scene.tsx` may hold no state.

| Unit | Design | Breaks |
| --- | --- | --- |
| A | Realism draws its own noisy medium sprite per Client and fades it in | "0 for Dust" (6 added draws); "one medium per Client" |
| B | Realism swaps `map` on the M2 sprites when the fade starts | "Fades in once, whole": the Dust pops. Also needs `MEDIUM_TEXTURE` or the sprites exported from a file that holds neither ref nor state |
| C | Noise baked into `mediumFalloff` in the scene chunk | "The first frame is the M2 schematic frame": the noise is in First Paint, outside the `realism` chunk |
| D | Realism mutates `MEDIUM_TEXTURE.image.data` in steps during the fade | Re-uploads a texture per fade frame, unbudgeted; still needs the export |

Each unit satisfies some of those sentences, and none satisfies all of them. Two more gaps:

- **Where the noise comes from.** `public/textures/` admits "only NASA public-domain imagery", and "the build gate fails on a map with no manifest entry". A generated noise tile placed there can't be licensed that way. Does it count against the 12 maps?
- **Colour.** AD-12 keeps Dust achromatic, and its token is `DUST_MEDIUM_COLOR`. That one is fine as long as the noise is a luminance mask.

**Proposed AD-19 tightening.**

> The medium's noise is procedural, built by a pure function in `realism/`, luminance only, never a file and never in the library. At fade start `realism-mount` replaces the `SpriteMaterial` on the existing sprites through one exported handle from `dust-model.ts`, with a material whose shader cross-fades falloff to falloff × noise on the fade's one uniform. The sprites, their draw order and their count don't change, and `scene.tsx` doesn't change. So: 0 added draws, one medium, one fade.

If that's too much machinery for faint Dust, the honest alternative is to exclude Dust from the fade and accept a small pop, or to drop noise from M3. Thomas should choose. The current wording can't all be true.

---

## P6. Medium: the render-order ladder has no values and no owner

**ADs:** AD-19 ("Dust < realism < line-work < Moon").

[CODE] `BODY_RENDER_ORDER = 2` in `scene-model.ts:369`; `DUST_RENDER_ORDER = BODY_RENDER_ORDER - 1` in `dust-model.ts:140`; `MOON_RENDER_ORDER = BODY_RENDER_ORDER + 1` in `notable-model.ts:61`. So Dust and Body are adjacent integers. Tests pin `DUST < BODY` and `MOON === BODY + 1`.

- **Unit A** declares `REALISM_RENDER_ORDER = 1.5` in `realism/`. That works: [CODE] three compares `a.renderOrder - b.renderOrder` as numbers (`three.module.js:8148-8150`).
- **Unit B** makes room with integers, setting `BODY = 3` and keeping `DUST = BODY - 1`, which is now 2. The Moon follows to 4 automatically. Every M2 test stays green, and Unit A's fill at 1.5 now draws *under* the Dust, which paints over it.

Also undeclared: **glow against fill within the realism layer.** A Star's fill and glow share a position. At one order, three sorts by depth and then falls back to creation order (`three.module.js:8152-8158`), so which draws first is a mount-order accident. Drawn after the fill, the glow washes over the Star's face. Drawn before, the fill overwrites its centre and leaves a halo.

**Proposed AD-19 tightening.**

> The ladder is declared once in `scene-model.ts`, which imports nothing and which `realism/` may import: `DUST 1 < GLOW 1.25 < FILL 1.5 < BODY 2 < MOON 3`, as named constants with M2's values unchanged, and a test pins the strict order. Glow writes no depth, tests depth, and draws before every fill.

---

## P7. Medium: "opacity 1 and write depth" against "fades in"

**ADs:** AD-19, AD-22.

AD-19 says fills "stay in the transparent pass at opacity 1 and write depth". AD-22 says the layer fades in. During a fade, neither unit can obey both:

- **Unit A** ramps opacity with `depthWrite` on, reading AD-19 as a property of the material. At fade frame 1 a nearly invisible fill already cuts other Bodies' line-work out of the frame. The hidden lines pop at the start, against a "half-realistic frame".
- **Unit B** ramps opacity with `depthWrite` off and flips it at the end. It obeys the fade, breaks AD-19's literal text during the ramp, and pops at the end instead.

[COMPUTED] The pop is rare today: no Planet's outline overlaps a nearer Body's fill at any of the six stops. It's still a real difference in behaviour, and a test for one design fails against the other.

**Proposed AD-19 and AD-22 tightening.**

> "Opacity 1 and depth-writing" describes a fill at rest. During the fade, fills take one shared fade uniform and write no depth. On the frame the fade ends, all of them write depth at once.

---

## P8. Medium: "one module" that the gate can't import and no single check can read

**ADs:** AD-23, AD-7, AD-21.

AD-23 says the budgets "live in one module, are enforced by `npm test` and the bundle assertion". The seed puts budgets in `realism/`, and AD-21 puts a gate on the maps.

**Unit A, the gate.** `derive/index.ts --check` is "the build gate" and already owns filesystem checks. [CODE] But derive's boundary row is `never: ['render-scene', ...]` (`boundaries.ts:151`), so it can't import the module. It mirrors `12` and `4 MB` with a text-pinned literal, the repo's standing idiom (`ORBIT_PLANE_TOLERANCE`).

**Unit B, the budget author.** One module, in `realism/`, imported by `scripts/bundle-assertion.ts`. A mirror in derive is exactly what AD-23 forbids.

What each row can actually be measured by:

| Budget | Visible to | Note |
| --- | --- | --- |
| `realism` chunk, 24 KB | Bundle assertion, and `npm test` via its real `write: false` build [CODE] | "KB of code" is undefined. The repo's convention is minified bytes, not gzip (`bundle-assertion.ts:34-35`). 24,000 or 24,576? One chunk, or the realism graph if it splits? |
| Texture library | `npm test` or the gate, by filesystem only | [CODE] Vite copies `public/` outside `generateBundle`, so the plugin can't see it |
| Sphere segments | A constant the shipped code must import | Forces budget code into the chunk unless the module is a pure leaf |
| Draw calls | **Nothing** | `node --test` can't load a `.tsx` and has no WebGL. A pure model's count can be tested, and only a source audit ties the binding to it |
| Passes, lights, shadow maps | Source scan | Already in `scene-model.test.ts`; the new `realism/` files need the same scan |
| Dependencies | `check-pins` | Already held |

**The unbudgeted side door.** [CODE] AD-23 budgets the `realism` chunk, while the scene chunk has no budget at all (`checkBundle` only measures the entry graph). A helper with long shader strings, placed beside `scene-model.ts` and imported statically, costs First Paint and shows up on no budget. [CODE] R3F's `extend(THREE)` (`react-three-fiber.esm.js:40`) means all of three is probably in the scene chunk already, so three imports in realism should add little to either. [INFERENCE] Whether Rolldown keeps it there or splits a shared chunk once `realism` also imports three isn't checked, and it's worth one build at story time.

**Proposed AD-23 tightening.**

> The budgets are one pure, import-free module, `src/render-scene/realism/budgets.ts`, as the seed has it. Only `realism/` and `scripts/` import it: no boundary row governs `scripts/`, so a gate step there may read it, and the map checks are that step, added to `npm run gate`, not part of `derive/`. Each row names its instrument: chunk bytes (minified, 24,000) by the bundle assertion, summed over the realism facade's static closure excluding the scene chunk's; the library by filesystem in the gate; draw calls by a pure model's count, with a source audit tying the binding to it; passes and lights by the existing scan extended to `realism/`. The scene chunk gets a budget too, set at today's measured size plus a small allowance, since its growth is what NFR-1 pays for. A check with nothing to measure fails instead of passing.

---

## P9. Medium: the Colophon's "rules between" exhibit against `appearance`

**ADs:** AD-13 ("renders both, with the mapping rules between them"), AD-21 ("credits the manifest and says the appearance is assigned rather than meaningful").

[CODE] `derivationRows` returns exactly three rows, `DERIVATION_LABELS` names exactly three rules, and `derivations.test.ts:51` pins them verbatim. `absences.test.ts:215` bans any count of rules in the copy. The layout exhibit is the raw file, so `appearance` becomes visible in it with nothing beside it to explain it.

- **Unit A** obeys AD-13 by adding a fourth row, `appearance ← id`. Every rule in that table is a data-to-visual mapping, so the row tells the visitor exactly what AD-21 says isn't true: that appearance is mapped.
- **Unit B** obeys AD-21 with a prose sentence, and leaves a derived field in the exhibit that the "rules between" don't account for. AD-13's literal text then fails.

Also unspecified: where the credit goes, and whether it's inside the "what is not there" statement, whose paragraphs are a closed, ruled list.

**Proposed AD-21 tightening.**

> `appearance` is not a mapping rule and never takes a row in the derivation table, which stays three rows. The Colophon gives it one separate statement and the credit list, under their own heading after the derivation table: "assigned from the entity's ID, encodes nothing". AD-13's "mapping rules" means FR-3's rules. The new copy is a ruling, like the rest of that page's copy.

---

## P10. Medium: a Star glow token fails the achromatic audit

**ADs:** AD-12's amendment ("Star glow and the ambient floor are tokens. Hue is confined to the realism layer"), AD-19 ("an exemption may name `realism/` only"), AD-20; the spine's Deferred list.

[CODE] `auditAchromatic` fails any `-dark` token at OKLCH chroma of 0.02 or above, and `auditCast` tightens that to 0.016 (`identity-audit.test.ts:88-128`). Tokens live in `src/tokens/`, not in `realism/`, and are generated from DESIGN.md.

- **Unit A** adds a warm `star-glow-dark` to DESIGN.md, because a realistic Star glows warm. The token build passes and the audit goes red. The exemption it needs can't name `realism/`, because the token doesn't live there.
- **Unit B** keeps the glow achromatic to stay green, or puts the warm value in a `realism/` literal. AD-12 calls the glow a token, and only a map's pixels are allowed outside tokens.

And AD-12 makes DESIGN.md the source of these tokens, while the Deferred section defers DESIGN.md's update ("Upstream wording").

**Proposed AD-12 tightening.** Thomas should rule on one of these.

> (a) Star glow is achromatic, a `-dark` token that passes the audit as it stands, and only maps carry hue. Or (b) a `realism-*` token family is declared in DESIGN.md's frontmatter in the first M3 story, and the audit exempts that one prefix by name, with no other exemption.

Either way, DESIGN.md's token additions are not deferred; only its prose is.

---

## P11. Low: `motionPace` can't make a Planet hold still

**ADs:** AD-20 ("it holds still under reduced motion (`motionPace`)"), AD-22 (fade "at the `motionPace` duration").

[CODE] `motionPace(true)` is 0.25, documented as "never `0`, so nothing ever cuts". Every model uses it as `dt / motionPace(reduced)` (`focus-model.ts:237`, `mote-model.ts:627`, `flight-model.ts:118`), meaning a move *finishes sooner*. So a unit following the idiom spins a Planet **four times faster** under reduced motion. A unit multiplying spins it at a quarter speed. Neither holds still, and a third unit that zeroes the rate on `reducedMotion()` doesn't use `motionPace` at all. [CODE] The readers of `reducedMotion()` are pinned by a source audit, so a new reader is itself a test change.

**Proposed AD-20 tightening.**

> Spin stops when `reducedMotion()` is true; the binding reads it once per frame and hands it to the pure model, as the Rail's does. Spin doesn't use `motionPace`. The fade's duration is `FADE_SECONDS × motionPace(reduced)`.

**AD-24 can reuse this.** "Settled opening frame" has no fixed spin state, since spin moves with time. Capture with reduced motion on, so every Planet sits at its emitted phase and the capture can be reproduced.

---

## P12. Low: the worst-window exposure has no home

**ADs:** AD-23 ("it exposes its worst window on the visitor's own performance timeline, sending nothing and changing no latch").

[CODE] `chart-offer.ts` "imports nothing and touches no DOM". `sampleFrame` starts with `if (offered) return`. The sampler's body and imports are pinned exactly. So:

- **Unit A** calls `performance.measure` inside `chart-offer.ts`, ending its purity, and stops at the latch. On the machines where this matters most, the recorded worst is simply the first window under 24fps, not the worst.
- **Unit B** exports `worstWindow()` and has the sampler or a new binding publish it. That breaks the sampler's audit, or adds a publisher.

And every reset wipes the window: warm-up, fade start, a gap, a tab returning. So "worst window" excludes the stalls NFR-2's run most wants to see, unless the run's protocol says so.

**Proposed AD-23 tightening.**

> The monitor keeps tracking its worst full window past the latch, pure and with no side effect, and takes a sink injected at module binding in `first-frame-mark.tsx`'s pattern. It writes one `performance.mark` whenever the worst falls. A window never spans a reset. The record in `implementation-artifacts/` says resets and gaps are excluded by construction, so a target run reads the worst window and the gap count together.

---

## Pressed and found sound

- **Hit spheres.** [CODE] R3F raycasts only objects registered in `internal.interaction`, meaning objects with handlers (`events-156d8d12.esm.js:461-465`). A fill with no handler can't take a click, and `visible={false}` hit spheres are unchanged. AD-19's sentence holds.
- **Moons against their own fill.** [CODE] The Moon sits 2 × radius out with radius 0.27 × radius, so its inner edge is at 1.73 × radius, clear of any fill inside the outline. The Ring is at 2.2 × radius.
- **Motes against fills, on today's artifact.** [COMPUTED] At each of the 8 Focus poses (16:9, panel 0.46, fill at 0.95 of outline) no resting orbit position on any of the three orbits, sampled at 720 points, falls behind the focused Planet's fill or any other Body's. So the case of a DOM label standing beside a hidden dot doesn't occur now. Limits: other aspects and a Mote's condensation path weren't computed, and a new Project could change it. The rule has a gap, not a live defect. If it's ever wanted: "a Mote's dot and label hide together", or leave AD-19's "whatever passes behind it" and accept it.
- **Bodies occluded at a stop (AD-4a: every Project on screen).** [COMPUTED] No Planet's outline is cut by a nearer Body's fill at any of the six stops at 16:9, and the one Deep Planet's Moon is clear at its stop. During Rail travel, a Planet's centre is hidden in 18 of 2,408 samples. Acceptable, and AD-19 accepts it in terms.
- **Dust against fills.** Dust writes no depth and draws first, so a fill always wins, whichever way the sprite faces. The transparent-pass reasoning in AD-19 is right.
- **Fractional render order.** Works in three (see P6). The hole is who owns it, not whether it's possible.

---

## Recommended order of closing

1. P1 and P6 together, since they settle how a fill is drawn. Spike the view-space sphere against the core dot and z-fighting before writing the AD.
2. P2 with a ruling on the Colophon copy, then bump `SCHEMA_VERSION` once.
3. P3 as new AD-25, which gives P4, P5 and P7 their owner.
4. P4, P5 (Thomas's choice), P7.
5. P8 to P12 as a wording pass, with Thomas ruling on P10.

## Appendix A: how the numbers were computed

A throwaway script (`occl.ts` in the session scratchpad, not in the repo) imported the shipped `buildScene`, `buildRail`, `railPose`, `focusPose`, `notableMoons` and `orbitPoint`, and read the committed artifact: 14 Bodies, 6 stops, `PANEL_FRACTION` 0.46.

- **Largest fill radius.** For a sphere at off-axis angle θ and distance L, with α = asin(R / L), the outer silhouette edge sits at tan(θ + α) on an image plane at unit focal distance, and the circle's centre at tan θ. The outline is r / D at view depth D. R was solved by bisection for `tan(θ + α) − tan θ = r / D`, over Rail progress 0 to 6 in steps of 0.05 and every Focus pose, at aspects 16:9, 21:9, 4:3, 1 and 0.6, for on-screen Bodies only.
- **Assumption, checked in drei.** `Billboard` copies the camera's world quaternion, so the outline is parallel to the image plane.
- **Occlusion.** Ray against sphere at 0.95 × outline radius, testing eight points on each outline plus its centre, each Moon's centre, and 720 points per Mote orbit via `orbitPoint`. Fills were treated as true spheres, which is AD-19's current reading.
- **Not done.** No GPU run, no build, and no timing of real uploads. The 1.1 to 1.4 second figure in P4 is the monitor's arithmetic at 30fps; whether a real upload takes that long is inference.
