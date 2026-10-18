# Epic 4 Context: The Fallback and Capability Routing

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A visitor on a phone, a locked-down corporate laptop, or any machine without WebGL2 gets a complete, designed flat star chart, not an error or a degraded scene, and any visitor on any machine can reach that chart in one click. Capability detection runs before anything heavy is fetched or rendered, so nobody ever sees a broken 3D scene. The Fallback is content-complete: every Project, every field and every Notable, with nothing truncated. It is not a degradation path. It is the surface "The Forward" (a cold, often mobile, Slack-link opener on whom the main success metric depends) most often lands on, so it is treated as a second product with its own design quality bar. The epic also gives the three surfaces (scene, Fallback, Colophon) one router with real browser history.

## Stories

- Story 4.1: Capability detection in the thin entry
- Story 4.2: Surface routing with real history
- Story 4.3: The Fallback star chart
- Story 4.4: The Deep/Shallow signal on a flat chart
- Story 4.5: One-click movement between surfaces
- Story 4.6: Performance offers, never forces

## Requirements & Constraints

- **Detection precedes rendering.** Capability is detected, never assumed. No visitor sees a failed or degraded scene before being routed. Nothing gates the first frame: no error state, loading screen, splash, progress bar, skeleton or click-to-enter.
- **Content parity is absolute.** Every Project, every field, every Notable; never a teaser, stub, summary or error page. Launch gate: someone who has never seen the site can use the Fallback alone to say what Thomas does **and** which entries are worth reading.
- **No apology anywhere.** No banner, badge, "best viewed on desktop", disclaimer or apologetic microcopy in any register. The link to the Fallback presents it as a surface in its own right, never as a downgrade, a "fallback" or a compatibility mode.
- **Mobile always gets the Fallback.** Mobile means a coarse primary pointer, never viewport width. A narrow desktop window keeps the scene with a narrower panel. There is no third tier.
- **Reduced motion is independent of routing.** A `prefers-reduced-motion` visitor on a capable machine gets the scene with adapted motion. No code path treats the motion preference as a capability signal.
- **Performance offers, never forces.** Below the sustained Fallback floor (24fps, unratified), the Fallback is *offered* through the existing persistent affordance; the visitor is never rerouted without acting.
  - The floor is deliberately not the 30fps M3 target; a scene just above the floor keeps running.
  - The threshold is one named constant, changeable without touching detection or routing, with a code note that its value awaits ratification.
- **Quality holds, frames drop.** Never strip render quality, simplify geometry or disable features for frames. A stable framerate beats a higher, fluctuating one.
- **Target hardware.** Measure on a three-year-old laptop with integrated graphics at 1080p, never on the dev machine or current Apple silicon.
- **Accessibility floor.** The Fallback is a conventional document: real semantic HTML, headings in order, no canvas. Every word of content is reachable by a visitor for whom the scene is hostile.

## Technical Decisions

- **Thin entry (`src/shell/entry.ts`).** No React, no Three; its module graph must not reach the scene, the solver or `src/data/`. `detect()` is plain JS (not a React component), runs before any dynamic import resolves, and tests **WebGL2 context creation only**: no performance probe on the First Paint path.
- **Ruling Q2 (amends AD-4 and the DOM-index requirement).** The entry dynamically imports exactly one module, the mount (React, `App`, the DOM index), which requests only the one renderer chunk for the chosen surface. The DOM index therefore renders from the mount chunk, still ahead of any renderer chunk, not from the entry chunk.
- **Lazy chunks:** `render-scene`, `render-fallback`, `colophon` and `solver` (Colophon live re-run only) load independently. A CI assertion over **bundler output** fails the build on an entry size-budget breach or a forbidden reach; a stray re-export can silently pull a chunk into the entry.
- **Router (`src/shell/router.ts`).** Exactly three addressable routes (scene, Fallback, Colophon), resolved by the entry before any chunk loads.
  - Every route change is a real history entry, so Back works.
  - Surface-level position (the Client stop the scene was left at) is saved on departure and restored on return, never reset to First Paint.
  - **Focus is not a route.** It creates no history entry and is released by Escape via the navigation store, never by Back.
- **Ruling R1 (rail position).** `railPosition` and `selectClient` no longer exist. The Rail's position is `scrollProgress` in the navigation store (integer `k` = the `k`-th Client stop); scene-position save and restore go through it.
- **URL fragments** name stable entity IDs, never positional indexes.
- **`src/render-fallback/`** is DOM plus semantic HTML reading only the committed versioned layout artifact.
  - It uses the artifact's **time-axis scalar**, not the solved 3D positions.
  - No import from `src/data/`, no classification test, no mapping-rule computation. `isDeep` and every derived value come from the artifact, so scene and Fallback cannot disagree.
  - A missing value is fixed by changing the artifact schema and derivation in `src/derive/`, never by computing locally.
  - It shares no rendering code with the scene; import boundaries are gated and fail the build.

## UX & Interaction Patterns

- **Layout (ratified; mocked in the UX `keyscreen-fallback.html`).** Time is the axis: horizontal on desktop, transposed to vertical on a phone. A conventional scrolling document; no bespoke touch handling.
- **Identity.** Inherits every DESIGN.md token: same palette, type ramp, square corners (radius 0), no shadow/glow. The vignette is dropped (the plate has no centre). `surface-edge` draws a plate's outer frame.
- **Deep/Shallow.** No Moon on a flat chart; the **Ring alone** carries the signal through three redundant channels: a ring on the plate marker, the same ring on that Project's index row, and a real `Notable` text column. Marker size and luminance must never carry it.
- **Skills** are shown as text: the no-duplicating-the-Dust rule does not apply where there is no Dust; content parity outranks it.
- **Voice.** Same as the scene's; a Shallow Project carries the identical editorial rule line the scene's panel shows.
- **Moving between surfaces.**
  - The scene has a persistent affordance reaching the Fallback in one click, from any state.
  - The Fallback's own chrome carries the same `THOMAS NAVARRO · the model` Colophon route, so the accessible surface reaches the Colophon without the scene.
  - A Fallback visitor on a capable machine can choose the scene; that choice is a real history entry.
- **Date navigation.** The Fallback is the preferred surface for navigating by date; its time axis serves it directly.

## Cross-Story Dependencies

- **On Epic 1:** the committed artifact supplies the time-axis scalar, `isDeep` and the full content payload. Epic 4 is orderable independently once Epic 1 is done.
- **On Epics 2 and 3:** 4.2 restores the scene's Client stop and leaves Focus/Escape to the navigation store; 4.5 places the affordance in the scene chrome without breaking the two-line corner-chrome rule (left-top identity, right-bottom instruction slot); 4.6 attaches to the running scene; rule-line copy and tokens come from Epic 3.
- **Within the epic:** 4.1 precedes 4.2; 4.3 is the base for 4.4; 4.5 needs 4.2 and 4.3; 4.6 reuses 4.5's affordance and adds no new UI.
- **Downstream:** Epic 5's Colophon route uses 4.2's router. Epic 6 verifies First Paint and the link preview against this Fallback; the preview must not promise a 3D scene to a mobile visitor.
