---
title: 'Story 9.3: Client names on the Stars'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_revision: 'aa0d93d4716ba16c6447c03e7bfd4d607a884571'
review_loop_iteration: 0
followup_review_recommended: false
followup_review: review-epic-7-9-followup-2026-11-26.md
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-9-labels-and-the-signal-survive-realism.md'
warnings: ['oversized']
deferred:
  - summary: >-
      An incumbent Mote label that ends up under a shown Client name is held by moteLabelLayout (it keeps its box and a place under the cap of 12) for as long as the name stays shown, possibly the whole Focus under reduced motion, and is never re-slotted. The held rule was ruled for a passing hover, not a persistent obstacle.
    evidence: |-
      mote-label.ts:235-244,269-280 hold an obstacle-only-hidden incumbent; mote-model.ts:827-828 re-slots from labelPlacement only. The Client plates are persistent obstacles since 9.3. No test runs an incumbent under a plate. Fixing it needs mote-label.ts or mote-model.ts, which stay on the M2 must-stay-unchanged list (realism/done.test.ts).
    location: >-
      src/render-scene/mote-label.ts:235-280, src/render-scene/mote-model.ts:827
    severity: medium
  - summary: >-
      mote-model.ts's doc comments still name affordanceObstacles as what moteFrame receives, though mote-field.tsx now passes sceneLabelObstacles.
    evidence: |-
      mote-model.ts:53-54 and :676. The file stays frozen (realism/done.test.ts), so the drift can be fixed only by a ruling.
    location: >-
      src/render-scene/mote-model.ts:53,676
    severity: low
  - summary: >-
      The names are proven on the pure model at integer Rail stops (plates inside the bounds, clear of each other, covering no other Body) and on flat tokens. Poses between stops, Focus framing, hover, real glyph widths against the estimate and rendered pixels are not measured.
    evidence: |-
      No test mounts the R3F tree or captures pixels. The 7.9 driver (spikes/realism-fills/prod-labels.mjs) was not extended. The width estimate is conservative (capitals 0.72em) but unmeasured against the shipped font.
    location: >-
      src/render-scene/client-label-model.test.ts; spikes/realism-fills/prod-labels.mjs
    severity: low
---

<intent-contract>

## Intent

**Problem:** The scene shows no Client names today. A Star's name appears only on the Fallback chart (`.chart-label-client`). Thomas's 8.4 verdict asks for each Star to show its Client's name, and FR-11 publishes those names as-is.

**Approach:** Add one DOM label per Client Star, below the Star, on the scene's `zIndexRange` overlay. It uses `scene-label-client` type on an opaque `surface-base-dark` plate (the 7.9 affordance plate: 1px pad, no edge, radius, shadow or fade), in every session. Its ink is `ink-lift` for the subject and the receded ink otherwise. Placement is a pure model, as `mote-label.ts` and `affordance-model.ts` are. The ink is pinned by an identity-audit role.

## Boundaries & Constraints

**Always:**
- The label is built in every session: First Paint, after realism arrives, after realism fails.
- There is one label per Client Star, and the affordance's Project label stays the Project's own.
- The plate is opaque `surface-base-dark`, so the label's ground is the plate in every session, over a fill, a glow or the nebula.
  > **Superseded 2026-11-25** (`d157b65`, Thomas's ruling of 2026-11-23): the plate gave way to `CLIENT_LABEL_HALO`, two unoffset `text-shadow`s of the `surface-base-dark` page ground within 2px, with no box, because the opaque plate's hard box cut through the Stars' glow. The estimated box, padding included, is still what the hides measure. Whether the halo proves the contrast floor is epic-9 retro item 3 (F-S2).
- Placement is estimated, never measured from the DOM, and it is pure under `node --test`.
- The `scene` chunk stays ≤ 960,000 B (about 6.9 KB left, shared with 9.10).

**Rulings taken (Thomas, 2026-11-18, accepting the first run's recommendations):**
- **Q1, receded ink:** every receded name is `ink-label-dark` (5.85:1 on `surface-base-dark`). The subject's name is `ink-lift-dark`. §7.1's "`ink-quiet` or `ink-faint`" prose is stale, superseded by the 2026-09 fix (`.memlog.md:90`) and the frontmatter's `star-client-receded.labelColor`.
  - *Superseded 2026-11-26 (Thomas, Epic 9 retro item 3): the receded ink is `ink-prose-dark`. On the halo composited over a near Star's glow, `ink-label-dark` held 4.5:1 only at the glyph edge. See `client-label-ground.test.ts`.*
- **Q2, type:** every name, subject or receded, is `scene-label-client`. Subject and receded differ by ink alone.
- **Q3, the frame edge, reading (a):** a name is hidden, never faded or moved, while its estimated box enters the outer `EDGE_SHARE` (12%) of the frame on any side, or, while a Project is Focused, crosses the panel edge. Every name that is shown is readable and at its floor.
- **Collisions (the plan, unopposed):** a Client name yields to the affordance block and is hidden while its box meets it. The Motes' labels yield to a shown Client name, which joins their obstacles. No cap, because there are fewer Stars than 12.

**Block If:** a ruling above would force a change to a Never file. Then HALT `blocked`: `ruling conflicts with Never list`.

**Never:**
- Touch `src/render-scene/realism/`, line-work strokes, the draw order or the tokens' frontmatter.
- Change Fallback or link-preview output.
- Use `ink-quiet-dark` on a glyph (DESIGN §2: "Any future use of it on a glyph is a defect").

</intent-contract>

## Code Map

- `generated/layout.generated.json` `clients[]` -- `{ id: "client:simsu", name: "SIMSU", … }`. There are 6 Clients. The name is `clients[].name`, published as-is (FR-11): no uppercase transform, as `.chart-label-client` sets it (`src/render-fallback/chart.css:220-226`).
- `src/render-scene/scene-model.ts` `Body` -- `{ id; kind: 'star'|'planet'; position; … }`, with no name. A Star's `id` is its Client's id. `SceneArtifactClient` (:108) has no `name`, so a new slice is needed.
- `src/render-scene/stroke-model.ts:109,135` -- `SubjectState`, `sceneSubject(nav, rail): string | null`. It returns the Focused Planet's id first (so **no Star is the subject while Focused**), otherwise the free-flight target, otherwise the Rail keyframe's Client id. `body-field.tsx:49` subscribes. The new binding reads `sceneSubject(navigationStore.getState(), rail)` inside the model's frame instead.
- `src/render-scene/affordance-model.ts`:
  - `EDGE_SHARE` (:68), `LABEL_CHAR_EM` 0.6 (:81);
  - `projectToScreen(point, view, projection, viewport): {x,y,depth}|null` (:204);
  - `labelBounds(viewport, focused): {left,right,top,bottom}` (:319), the inner 76% with the panel edge as the right bound while Focused. This is the exact edge rule for Q3;
  - `affordanceObstacles(nav, artifact, bodies, view, projection, viewport): ScreenRect[]` (:522), `ScreenRect` (:490);
  - `overlayOrigin` (:551), `keepOverlay` (:561), `affordanceOverlayStyle()` (:580);
  - `PLATE_PAD_PX` 1 (:613), `affordanceBlockStyle()` (:615), the plate to copy: `background: surface-base-dark`, `padding: 1px`, `whiteSpace: nowrap`, `visibility: hidden`.

  `labelBounds`, `projectToScreen` and `PLATE_PAD_PX` may need `export`. `typeMetrics` is closed to two roles: don't widen it, compute the client role's metrics locally with `cssNumber` from `mote-label.ts`. The import allowlist is at `affordance-model.test.ts:692`.
- `src/render-scene/mote-label.ts:166,255` -- `LabelBox` (same shape as `ScreenRect`), `moteLabelLayout(…, obstacles)`. `src/render-scene/mote-model.ts:678` -- `moteFrame(…, reduced, obstacles)`.
- `src/render-scene/mote-field.tsx:93` -- the obstacles argument is `affordanceObstacles(state, artifact, bodies, …, size)`. It is pinned verbatim at `scene-model.test.ts:3218-3222` and quoted in `src/render-scene/README.md:37`.
- `src/render-scene/affordance-field.tsx` -- the binding to mirror: one `<Html fullscreen calculatePosition={overlayOrigin} onOcclude={keepOverlay} zIndexRange={[1, 1]} pointerEvents="none">`, an `aria-hidden` overlay div, and refs written by an `apply*` function.
- `src/render-scene/scene.tsx` -- mounts the bindings. It may hold no rule (`auditRenderer`, `scene-model.test.ts:917`). `auditDrawOrder` (:1928, mount pins :1976-1988, mutation table :2103-2108) pins each mount and its import. `<RealismMount …/>` must stay last (`realism-status.test.ts:1015`).
- `src/render-scene/scene-model.test.ts`:
  - `auditAffordanceField` (:4014-4119, tests :4121-4158) is the model for a new `auditClientLabelField`;
  - `auditMoteField` pins the Mote frame statement (:3218);
  - `sceneModules()` (:125) walks the directory, so a new file gets the forbidden-import, vocabulary, effects (`EFFECTS` :1465 bans `box-shadow`, `border-radius`, the word `glow`) and coordinate-literal audits automatically.
- `src/identity-audit.test.ts`:
  - `ROLES` (:311-380), a `{ model, pattern }` ink resolved at :519;
  - `contrastSources()` (:537) is a fixed list: add the new model as a const, like `AFFORDANCE_TS` (:312).
- `src/render-scene/README.md:37,46` -- one row per binding.
- `src/render-scene/realism/budgets.ts:19` -- `SCENE_CHUNK_BYTES_BUDGET` 960,000, checked by the Vite plugin on `npm run build`. Baseline 953,039.
- `_bmad/scripts/memlog.py append` -- the only way to write a memlog entry (as 9.2 did).

## Tasks & Acceptance

**Execution:**
1. `src/render-scene/client-label-model.test.ts` (new) -- red first. Cover the matrix below over a hand-built two-Star artifact and the committed artifact at each Rail stop, at 1920×1080 and 3840×1080:
   - the ink by subject;
   - below the Star;
   - the edge hide;
   - the panel hide while Focused;
   - behind the camera;
   - yielding to the affordance;
   - Client-against-Client collisions;
   - the plate (opaque six-digit hex, 1px pad, `scene-label-client` metrics);
   - `sceneLabelObstacles` = the affordance's rects plus the shown names';
   - purity (import allowlist).
2. `src/render-scene/client-label-model.ts` (new, pure) -- the model:
   - `ClientLabelArtifact = { clients: readonly { id; name }[] }`;
   - `CLIENT_LABEL_SUBJECT_INK = tokens.colors['ink-lift-dark']`, `CLIENT_LABEL_RECEDED_INK = tokens.colors['ink-label-dark']`;
   - `clientLabels(artifact)`, the pool in artifact order;
   - `clientLabelFrame(nav, artifact, bodies, rail, view, projection, viewport): ClientLabelDraw[]`;
   - `sceneLabelObstacles(...)`;
   - `applyClientLabels(handles, draws)`;
   - `clientLabelOverlayStyle()`, `clientLabelPlateStyle()`.

   It reuses `projectToScreen`, `labelBounds`, `affordanceObstacles`, `sceneSubject` and `bodyRadius`, exported where needed.
3. `src/render-scene/client-label-field.tsx` (new) -- the binding, in the affordance's shape. It has one `useFrame` (`camera.updateMatrixWorld()`, one `clientLabelFrame(navigationStore.getState(), …)`, `applyClientLabels(…)`) and one `<Html>` overlay with one plate `div` per `clientLabels(artifact)` entry, each holding `{label.name}`.
4. `src/render-scene/scene.tsx` -- mount `<ClientLabelField artifact={artifact} bodies={bodies} rail={rail} />` right after `<AffordanceField …/>`, and widen `SceneProps.artifact` with `ClientLabelArtifact`. Pass `rail={rail}` to `<MoteField>`.
5. `src/render-scene/mote-field.tsx` -- replace the obstacle argument with `sceneLabelObstacles(state, artifact, bodies, rail, …, size)`, and add `rail` to the props and the artifact type.
6. `src/render-scene/scene-model.test.ts` -- add `auditClientLabelField` with its tests and mutations. Add the new mount and import to `auditDrawOrder` and its mutations, and update `auditMoteField`'s pinned statement.
7. `src/identity-audit.test.ts` -- add a `CLIENT_LABEL_TS` const to `contrastSources()`, and two roles, `Client name, subject` and `Client name, receded` (floor 4.5, ground `page`), read off the two ink constants.
8. `src/render-scene/README.md`, plus the headers of `mote-field.tsx` and `affordance-model.ts` where they name the obstacle chain -- document the binding.
9. Docs:
   - Add an amendment to DESIGN.md §7.1, `*[amended 2026-11-18 for story 9.3 (Thomas's rulings Q1–Q3): …]*`, prose only.
   - Append one `(decision)` entry to the UX memlog via `py _bmad/scripts/memlog.py append`.

**Edge-case matrix (tested in task 1):**

| Scenario | State | Expected |
|---|---|---|
| Rail stop | Client k is the subject (`sceneSubject` = its id) | k's name is `ink-lift-dark`, the others `ink-label-dark`; each label's top edge is below its Star's projected radius plus a gap, centred on x |
| Focused | `focusedProjectId` set | no name is `ink-lift`; a name whose box crosses `labelBounds(…, true).right` is hidden |
| Edge | box enters the outer 12% on any side | hidden, not moved or faded |
| Behind / off-frame | `projectToScreen` null | hidden |
| Another Body | the opaque plate meets another Body's disc (a Deep Planet's out to its Ring or Moon, by `markPx`), at any depth | hidden (follow-up review, Thomas 2026-11-18) |
| Affordance | box comes within `CLIENT_LABEL_CLEARANCE_PX` (4) of an `affordanceObstacles` rect | hidden |
| Two names meet | boxes come within `CLIENT_LABEL_CLEARANCE_PX` (4) | the subject's wins, then the nearer (smaller depth); the other is hidden |
| Motes | a shown name's box | in `sceneLabelObstacles`, so the Mote pass hides a Mote label near it |

**Acceptance Criteria:**
- Given any session, realism or not, when the scene draws at a Rail stop, then each Client Star whose box clears the inner-76% bounds, the affordance and a stronger name shows its Client's `name` below it:
  - in `scene-label-client`, on an opaque `surface-base-dark` plate padded 1px;
    > **Superseded 2026-11-25** (`d157b65`, Thomas's ruling of 2026-11-23): the plate gave way to `CLIENT_LABEL_HALO`, two unoffset `text-shadow`s of the `surface-base-dark` page ground within 2px, with no box, because the opaque plate's hard box cut through the Stars' glow. The estimated box, padding included, is still what the hides measure. Whether the halo proves the contrast floor is epic-9 retro item 3 (F-S2).
  - in `ink-lift-dark` when it is `sceneSubject`, and `ink-label-dark` otherwise.
- Given `npm test`, when the identity audit runs, then both Client name roles are read off `client-label-model.ts` and pass 4.5:1 on `surface-base-dark`. A mutation to `ink-quiet-dark` fails, naming the role.
- Given the committed artifact at every Rail stop at 16:9 and 32:9, when the frame is computed, then no shown name's box lies outside `labelBounds` and no two shown names' boxes overlap. No Star has a second label.
- Given `npm run build`, when the bundle assertion runs, then `scene` ≤ 960,000 B and `realism` is unchanged. `git diff` over `src/render-scene/realism/`, `src/render-fallback/`, `generated/` and the DESIGN.md frontmatter is empty.

### Review Findings

Code review of 1da2e53 against aa0d93d, 2026-11-18 (follow-up review). All patches applied: `npm test` 2206 pass, 0 fail, 1 skipped; typecheck clean; `scene` 956,505 of 960,000 B (3,495 B left), `realism` 8,560 B unchanged. The edge-hidden test was mutation-checked: moving the bounds hide after the collision pass fails it.

- [x] [Review][Patch] Opaque name plates are not kept off Bodies away from the Rail stops. Resolved by Thomas (2026-11-18): a name whose plate meets another Body's disc (its Ring and Moon included) is hidden, and DESIGN §7.1 records the hide [src/render-scene/client-label-model.ts:245-254]
- [x] [Review][Patch] The "a hidden name blocks nothing" check for the edge proves nothing: both Stars at x=14 and x=14.2 are past the edge, so `[false, false]` holds whatever the rule. Replace it with a stronger name hidden by the edge (and one by the affordance) whose box overlaps an in-bounds neighbour, and assert the neighbour shows [src/render-scene/client-label-model.test.ts:325]
- [x] [Review][Patch] The model header still gives the width as `chars × fontPx × (LABEL_CHAR_EM + letterSpacing)`, without `CLIENT_LABEL_CAPITAL_EM` [src/render-scene/client-label-model.ts:16]
- [x] [Review][Patch] The model header and the README model row name only `cssNumber` from `mote-label.ts`; the model also imports `MOTE_LABEL_CLEARANCE_PX` [src/render-scene/client-label-model.ts:50, src/render-scene/README.md:47]
- [x] [Review][Patch] The README test row and the test header list the committed sweep at 1920×1080 and 3840×1080 (16:9, 32:9) only; they omit 1440×900 and the plate-over-Body guard [src/render-scene/README.md:48, src/render-scene/client-label-model.test.ts:6]
- [x] [Review][Patch] "No cap, because there are fewer Stars than 12" is unguarded. Add a test asserting that the committed artifact's Client count stays below the Motes' cap of 12 [src/render-scene/client-label-model.test.ts]
- [x] [Review][Patch] The spec's Design Notes still give the width as `chars × fontPx × (LABEL_CHAR_EM + 0.36)`, and the matrix rows say "meets" and "overlap" where the code hides within the 4px `CLIENT_LABEL_CLEARANCE_PX` [spec-9-3-client-names-on-the-stars.md: Design Notes "Placement", matrix rows "Affordance" and "Two names meet"]
- [x] [Review][Patch] The third run's Files changed list says "`affordance-model.ts` -- exports for reuse", but the diff there only changes a header comment; every reused symbol was already exported at aa0d93d [spec-9-3-client-names-on-the-stars.md: Third run]
- [x] [Review][Defer] Names have no hysteresis at the edge, at the clearance or at a depth tie, unlike the Mote pass (incumbent 0px, newcomer 4 + 8px) [src/render-scene/client-label-model.ts:245-254] — deferred, design follow-up
- [x] [Review][Defer] The width estimate is narrow for wide glyphs (`m`, `w`, CJK, emoji at 0.6em); the committed names are capitals or mean-width text [src/render-scene/client-label-model.ts:151] — deferred, no committed name triggers it
- [x] [Review][Defer] CSS adds the 0.36em tracking after the last glyph, so under `translateX(-50%)` the glyphs sit about 2px left of the Star's centre [src/render-scene/client-label-model.ts:263,337] — deferred, cosmetic
- [x] [Review][Defer] The name bounds switch on `focusedProjectId !== null`, not on the panel's slide, as the affordance's do [src/render-scene/client-label-model.ts:232] — deferred, pre-existing pattern (affordance-model.ts:453)
- [x] [Review][Defer] 9.3 spent about 3.2 KB of the `scene` headroom; 3,791 B is left, and 9.10 and the scene-side exports of 9.6–9.8 share it with no re-plan recorded [spec-9-3-client-names-on-the-stars.md: Verification] — deferred, sprint planning
- [x] [Review][Defer] The matrix tests run at 1920×1080 only; Task 1 asked for 1920×1080 and 3840×1080 (only the committed sweeps loop over viewports) [src/render-scene/client-label-model.test.ts] — deferred, low

## Spec Change Log

- **2026-11-18, Thomas's ruling, option (a): the M2 Mote freeze is amended.** The second run halted `ruling conflicts with Never list`: making the Motes yield needs `mote-field.tsx`, which `src/render-scene/realism/done.test.ts` held unchanged since M2. Thomas chose (a). The amendment:
  - `mote-field.tsx` leaves `UNCHANGED`, with a comment citing the ruling. `mote-model*` and `mote-label.ts` stay frozen, so the Mote layout is still M2's.
  - AD-20 gains a dated note, and the architecture memlog a `(decision)` entry.
  - This lifts the Never list's "touch `src/render-scene/realism/`" for that one list entry only. The AC's realism diff is therefore exactly `done.test.ts`.
  - The saved patch is applied. `<MoteField>` takes `rail={rail}`. `auditMoteField` pins `sceneLabelObstacles(state, artifact, bodies, rail, …)`, with two new mutations (the affordance's boxes alone, no Rail), and `auditMoteMount` pins the Rail, with a "no Rail" mutation.

## Review Triage Log

### 2026-11-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12 (high 0, medium 2, low 10)
- defer: 3 (high 0, medium 1, low 2)
- reject: 16 (high 0, medium 3, low 13)
- addressed_findings:
  - `[medium]` `[patch]` The plate was placed from the estimated width, so any estimate error moved it off-centre. The real plate is now centred by `translateX(-50%)` about the Star.
  - `[medium]` `[patch]` The 0.6em advance under-estimates capital-heavy names (`SIMSU`, `SNCF`). A capital or digit now takes `CLIENT_LABEL_CAPITAL_EM` 0.72, so the box errs wide.
  - `[low]` `[patch]` An obstacle with a non-finite side hid every name, by NaN comparison. It is now ignored, as the Mote pass ignores it.
  - `[low]` `[patch]` Names had zero clearance from the affordance and from each other. They now keep `CLIENT_LABEL_CLEARANCE_PX` (4, the Motes' clearance).
  - `[low]` `[patch]` A blank name would mount an empty opaque plate. `clientLabels` now throws, naming the Client.
  - `[low]` `[patch]` The "cannot disagree" claim was false across the affordance's re-pick. The model header now states the one-frame trail.
  - `[low]` `[patch]` `sceneLabelObstacles`' throw for a Client with no Star was untested. `assert.throws` is added.
  - `[low]` `[patch]` `auditDrawOrder`'s message still said the affordance is mounted "last". The message and comment are reworded.
  - `[low]` `[patch]` The committed sweep ran at 16:9 and 32:9 only. 1440×900 is added.
  - `[low]` `[patch]` Nothing guarded an opaque plate covering another Body or its Ring or Moon. A committed-stop guard test is added at all three viewports.
  - `[low]` `[patch]` The UX memlog and DESIGN §7.1 attributed the name-against-name order to Thomas's ruling. DESIGN now marks it as the story's own rule, and a clarifying `(event)` memlog entry is appended, since the memlog is append-only.
  - `[low]` `[patch]` The applied `mote-yield-9-3.patch` was a stray work file. It is removed before commit.

## Design Notes

**Why the plate is the contrast proof.** The plate is opaque `surface-base-dark` and covers the text box by 1px (7.9's D1). So the ground under every glyph is the plate in every session, whatever is behind it: fill, glow or nebula. The flat-token audit on the `page` ground is therefore exact, not an approximation, and needs no real-pixel driver. The plate test pins opacity, so a later alpha would fail here first.

**Placement.** The label goes below the Star, centred on x. Its top is `centre.y + starRadiusPx + CLIENT_LABEL_GAP_PX` (a tunable 8px). `starRadiusPx` is `bodyRadius(star) × projection[5] × h / 2 / depth`, from the matrices already handed in. The estimated width is, per code point, `fontPx × (advance + 0.36)` with the advance `CLIENT_LABEL_CAPITAL_EM` 0.72 for a capital or digit and `LABEL_CHAR_EM` 0.6 otherwise, plus `2 × PLATE_PAD_PX`, and the height is `fontPx × 1.3 + 2 × PLATE_PAD_PX`. It is estimated and never measured from the DOM, the same as every scene label.

## Verification

**Commands:**
- `npm test` -- expected: all pass (baseline 2181 pass, 0 fail, 1 skipped, plus the new tests).
- `npm run typecheck` -- expected: clean.
- `npm run build` -- expected: gate clean, and the log reads `scene is ≤ 960,000` with `realism` unchanged at baseline.
- `git diff --stat aa0d93d -- src/render-scene/realism src/render-fallback generated public` -- expected: empty.

## Auto Run Result

### First run (2026-11-18)

Status: blocked. Blocking condition: **intent gap**. The documents give the three choices below more than one defensible reading, and the readings produce different frames. Nothing in the intent selects between them. Code is untouched and the tree is clean at `aa0d93d4716ba16c6447c03e7bfd4d607a884571`.

**Q1, the receded name's ink.**
- The AC and the §7.1 prose say `ink-quiet` or `ink-faint`.
- The same AC says every name keeps its contrast floor. `ink-quiet-dark` on `surface-base-dark` is 3.12:1 and `ink-faint-dark` is about 1.3:1, both under 4.5:1.
- The 2026-09 memlog fix (`.memlog.md:90`) and the frontmatter's `star-client-receded` put receded Star labels at `ink-label-dark` (5.85:1).
- **Recommended:** `ink-label-dark` for every receded name, with the §7.1 prose recorded as stale.

**Q2, the receded name's type.**
- The AC says `scene-label-client` for each name, and the Fallback chart uses it for every Star.
- The frontmatter's `star-client-receded` says `scene-label-secondary` (9.5px, 0.17em).
- **Recommended:** `scene-label-client` for every name, as the AC and the chart do, with the subject and receded names told apart by ink alone.

**Q3, a name near the frame edge** (the "no readable label near the frame edge" rule). Three readings:
- (a) Hide a name whose box enters the outer 12% (or crosses the panel edge while Focused), as the Motes hide at the canvas edge.
- (b) Draw it at `ink-faint`, the token DESIGN reserves for "a label … at the far edge of the frame". It would then sit below the floor by design.
- (c) Re-anchor it inward, as the affordance does. That breaks "below the Star".
- **Recommended:** (a), because it is the only reading that keeps every shown name at its floor.

**Follow-on, collisions.** The plan is for a Client name to yield to the affordance block and the Motes' labels, joining `affordanceObstacles` and the Mote pass. A shown name would stay put, with no degradation cap, because there are fewer Stars than 12. A different preference here is the one place this plan could be wrong.

**To resume:** record the answers under Boundaries, set `status: draft`, and rerun `/bmad-build-auto 9-3`.

Resolved by Thomas on 2026-11-18 by accepting all three recommendations (Q1 `ink-label`, Q2 `scene-label-client`, Q3 (a)), recorded under Boundaries. Status reset to `draft`.

### Second run (2026-11-18)

Status: blocked on one item, `ruling conflicts with Never list`; everything else is built and green.

**Built:** `client-label-model.ts` (pure: pool, estimated plate, below-the-Star placement, subject/receded ink, hides for the inner-76% bounds and the panel edge, behind the camera, the affordance and a stronger name, `sceneLabelObstacles`, `applyClientLabels`, the plate and overlay styles), its test (the matrix, the committed artifact at every Rail stop at 1920×1080 and 3840×1080, purity), `client-label-field.tsx`, the mount in `scene.tsx` right after `<AffordanceField>`, `auditClientLabelField` and the mount pins in `auditDrawOrder`, the two identity-audit roles (with `ink-quiet-dark` mutations failing by role name), the README rows, the DESIGN.md §7.1 amendment and the UX memlog decision. `SceneHostArtifact` (`src/shell/scene-host.tsx`) gains `clients[].name` so the lazy element still type-checks against `SceneProps`.

**Blocked:** task 5 (the Motes yield to a shown Client name). Wiring `sceneLabelObstacles` into `mote-field.tsx` fails `src/render-scene/realism/done.test.ts` "the preview, camera, Rail, Focus and Mote sets are unchanged since M2, committed and in the working tree" (7.10 AC4, AD-20/AD-24's must-stay-unchanged list names `mote-field.tsx`, `mote-model*` and `mote-label.ts`). That test is under `src/render-scene/realism/`, a Never path, so the collision ruling cannot ship without a ruling that amends that list. `mote-field.tsx`, its audit and its mount are left at baseline; `sceneLabelObstacles` is built and tested but not yet called.

**Verification:** `npm test` 2201 pass, 0 fail, 1 skipped; `npm run typecheck` clean; `npm run build` clean, `realism` 8,560 (unchanged) and `scene` 955,744 of 960,000; `git diff --stat aa0d93d -- src/render-scene/realism src/render-fallback generated public` empty; the DESIGN.md frontmatter untouched.

**Orchestrator check (2026-11-18):**
- Verification was rerun independently, and every figure above matches: 2201 pass, 0 fail, 1 skipped; typecheck clean; build `scene` 955,744 of 960,000; the realism, Fallback, generated and public diff empty.
- The freeze was confirmed at `src/render-scene/realism/done.test.ts:490-495`.
- Review (step 4) has not run, because the run halted at the Block If.
- The withheld Mote wiring was saved as `mote-yield-9-3.patch` (applied in the third run, then removed). It also needs `rail={rail}` on `<MoteField>` and updates to `auditMoteField` and `auditMoteMount`.

**To resume, Thomas rules on one of:**
- (a) Amend the M2 must-stay-unchanged list (AD-20/AD-24, 7.10 AC4) so `mote-field.tsx` may change. Then apply the patch.
- (b) Drop the "Motes yield to a Client name" half of the collisions ruling. A Mote label may then draw over a Client name while a Project is Focused, and `sceneLabelObstacles` is removed.
- (c) Reverse the direction: a Client name hides while a Mote label meets it. This needs only the Client side, and reading the Mote boxes without changing the Mote files may not be possible.

Then set `status: in-review` (the rest is built) and rerun `/bmad-build-auto 9-3`.

### Third run (2026-11-18)

Thomas ruled option (a), recorded in the Spec Change Log. The Mote wiring is applied.
- `npm test`: 2201 pass, 0 fail, 1 skipped.
- `npm run typecheck`: clean.
- `npm run build`: `realism` 8,560 B (unchanged), `scene` 955,882 of 960,000 B.
- The diff over realism, the Fallback, `generated/` and `public/`: only `src/render-scene/realism/done.test.ts`, as the ruling allows.

**Summary:** every Client Star shows its Client's name below it, in every session.
- Type is `scene-label-client`, on an opaque 1px-padded `surface-base-dark` plate. The subject's name is `ink-lift-dark` and every other is `ink-label-dark`.
- A name is hidden, never faded or moved:
  - behind the camera;
  - outside the inner 76% of the frame, or the panel's edge while Focused;
  - within 4px of the affordance or of a stronger name.
- The Mote labels yield to every shown name, by Thomas's option (a).

**Files changed:**
- `src/render-scene/client-label-model.ts` (new) -- the pure model: pool, estimate, placement, inks, hides, `sceneLabelObstacles`, plate styles and apply.
- `src/render-scene/client-label-model.test.ts` (new) -- the matrix, plus the committed artifact at every stop at 1920×1080, 3840×1080 and 1440×900 (bounds, clearance, no plate over another Body), the plate, the inks and a purity audit.
- `src/render-scene/client-label-field.tsx` (new) -- the binding: one `<Html fullscreen>` overlay at `zIndexRange [1, 1]` and one plate per Client.
- `src/render-scene/scene.tsx` -- mounts `<ClientLabelField>` after the affordance and passes `rail` to `<MoteField>`. `SceneProps` is widened.
- `src/render-scene/mote-field.tsx` -- passes `sceneLabelObstacles` and takes `rail`.
- `src/render-scene/affordance-model.ts` -- header comment only; every reused symbol was already exported.
- `src/shell/scene-host.tsx` -- `clients[].name` in its artifact type.
- `src/render-scene/scene-model.test.ts` -- `auditClientLabelField`, the mount pins, and the Mote field and mount audits rewired.
- `src/identity-audit.test.ts` -- two Client name contrast roles.
- `src/render-scene/realism/done.test.ts` -- `mote-field.tsx` leaves the M2 list (the ruling).
- `src/render-scene/README.md` -- the binding and model rows.
- Docs:
  - DESIGN.md §7.1, a prose amendment;
  - ARCHITECTURE-SPINE.md AD-20, a note;
  - the architecture memlog, one decision;
  - the UX memlog, one decision and one clarification.
- `deferred-work.md` -- three deferrals.

**Review findings:** 12 patches applied (medium 2, low 10), 3 deferred (medium 1, low 2), 16 rejected.

**Follow-up review recommended:** `true`. Patched: high 0, medium 2, low 10; score 3 × 2 + 1 × 10 = 16 (≥ 5).

**Verification:**
- `npm test`: 2203 pass, 0 fail, 1 skipped.
- `npm run typecheck`: clean.
- `npm run build`: gate clean, `realism` 8,560 B unchanged, `scene` 956,209 of 960,000 B (3,791 B left for 9.10).
- The diff over realism, the Fallback, `generated/` and `public/`: only `realism/done.test.ts`, as ruled.

**Residual risks:**
- No real-browser or pixel check was run. Contrast rests on the opaque plate, and the box on a conservative estimate.
- Poses between stops, Focus and hover are unmeasured (deferred).
- Incumbent Mote labels under a persistent plate are held for the plate's life (deferred, frozen files).
- The tests were written alongside the model, not strictly red first.
- `sprint-status.yaml` is not updated by this run.
