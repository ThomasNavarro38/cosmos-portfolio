# Epic 4 Context: The Fallback and Capability Routing

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A visitor on a phone, a locked-down corporate laptop, or any machine without WebGL2 gets a complete, designed flat star chart, not an error or a degraded scene. Any visitor on any machine can also reach that chart in one click. Capability detection runs before anything heavy is fetched or rendered, so nobody ever sees a broken 3D scene. The Fallback is content-complete: every Project, every field and every Notable, with nothing truncated. This matters because the Fallback is not a degradation path. It is the surface "The Forward" (a cold mobile Slack-link opener, on whom the main success metric depends) most often lands on, so it is treated as a second product with its own design quality bar. This epic also gives the three surfaces (scene, Fallback, Colophon) one router with real browser history.

## Stories

- Story 4.1: Capability detection in the thin entry
- Story 4.2: Surface routing with real history
- Story 4.3: The Fallback star chart
- Story 4.4: The Deep/Shallow signal on a flat chart
- Story 4.5: One-click movement between surfaces
- Story 4.6: Performance offers, never forces

## Requirements & Constraints

- **Detection comes before rendering.** Capability is detected, never assumed. No visitor sees a failed or degraded scene before being routed. Nothing gates the first frame: no error state, loading screen, splash, progress bar, skeleton or click-to-enter.
- **Content parity is absolute.** The Fallback shows every Project, every field and every Notable. It is not a teaser, stub, summary or error page. Someone who has never seen the site must be able to use the Fallback alone to say what Thomas does **and** which entries are worth reading (the launch gate).
- **No apology anywhere.** No banner, badge, "best viewed on desktop", disclaimer, beta tag or apologetic microcopy on any surface or in any register. The affordance that links to the Fallback must present it as a surface in its own right, not as a downgrade, a "fallback" or a compatibility mode.
- **Mobile always gets the Fallback.** "Mobile" means the primary pointer is coarse, never a viewport-width check. A narrow desktop window keeps the scene and gets a narrower panel. There is no third tier.
- **Reduced motion is independent of routing.** A `prefers-reduced-motion` visitor on a capable machine gets the scene with adapted motion and is never rerouted. No code path may treat the motion preference as a capability signal.
- **Performance offers the Fallback and never forces it.** When the running scene stays below the sustained Fallback floor (24fps, unratified), the Fallback is *offered* through the existing persistent affordance. The visitor is never rerouted without acting.
  - The floor is deliberately different from the 30fps M3 target. A scene running just above the floor keeps running.
  - The threshold is a single named constant that can be changed without touching detection or routing, and the code records that its value awaits ratification.
- **Quality holds and frames drop.** Never strip render quality, simplify geometry or disable features to gain frames. A stable framerate is better than a higher, fluctuating one.
- **Target hardware.** Performance is measured on a three-year-old laptop with integrated graphics at 1080p. It is never measured on the dev machine or on current Apple silicon.
- **Accessibility floor.** The Fallback is the floor beneath the floor: a conventional document with real semantic HTML, headings in order and no canvas. Every word of content must be reachable by a visitor for whom the scene is hostile.

## Technical Decisions

- **Thin entry (`src/shell/entry.ts`).** No React and no Three. Its module graph must not reach the scene, the solver or `src/data/`. `detect()` is plain JS, not a React component. It runs before any dynamic import resolves and tests **WebGL2 context creation only**: no performance probe runs on the First Paint path. The entry then dynamically imports **exactly one** module, the mount (`src/shell/mount.tsx`: React, `App` and the DOM index), which requests at most one renderer chunk for the chosen surface (ruling Q2, recorded on AD-4).
- **Four independent lazy chunks:** `render-scene`, `render-fallback`, `colophon` and `solver` (the solver is for the Colophon's live re-run only). The thin-entry property is asserted against **bundler output** in CI, which fails the build on a size-budget breach or a forbidden reach, because a stray re-export can silently pull a chunk into the entry. The existing bundle assertion must cover the Epic 4 entry.
- **Router (`src/shell/router.ts`).** It owns exactly three addressable routes: scene, Fallback and Colophon, resolved by the entry before any chunk loads.
  - Every route change is a real history entry, so Back works.
  - Surface-level position (the Client stop the scene was left at) is preserved on departure and restored on return. It is never reset to First Paint.
  - **Focus is not a route.** It creates no history entry and is released by Escape (innermost layer first, via the navigation store), never by Back.
- **Rail position.** The Rail's position is `scrollProgress` in the navigation store: an integer `k` is the `k`-th Client stop. `railPosition` and `selectClient` no longer exist (ruling R1). Preserving and restoring scene position must go through `scrollProgress`.
- **URL fragments** name stable entity IDs, never positional indexes.
- **`src/render-fallback/`** is DOM plus semantic HTML and reads only the committed `layout.generated.json`.
  - It uses the **time-axis scalar**, not the solved 3D positions.
  - It must not import from `src/data/` or contain any classification test, mapping-rule computation or conditional on a raw content field.
  - It reads `isDeep` and every other derived value from the artifact, so the scene and the Fallback cannot disagree about a Project's class.
  - If a needed value is missing, the fix is a change to the artifact schema and derivation in `src/derive/`, never a local computation.
  - It shares no rendering code with the scene. Import boundaries are enforced by the repo's boundary gate (`npm run gate`, `src/derive/boundaries.ts`) and the bundle assertion, and fail the build.

## UX & Interaction Patterns

- **Layout (ratified, mocked in `ux-designs/.../.working/keyscreen-fallback.html`).** Time is the axis: horizontal on desktop, transposed to vertical on a phone. It is a conventional scrolling document and needs no bespoke touch handling.
- **Identity.** The Fallback inherits every DESIGN.md token: the same palette, type ramp, square corners (radius 0) and absence of shadow, glow or bloom. The vignette is dropped because the plate has no centre. `surface-edge` draws the plate's outer frame.
- **Deep/Shallow.** There is no Moon on a flat chart, so the **Ring alone** carries the signal through three redundant channels:
  - a ring on the plate marker;
  - the same ring repeated on that Project's index row;
  - a real `Notable` text column.

  Marker size and luminance must never carry the signal.
- **Skills** are shown as text on the Fallback. The rule against duplicating the Dust does not apply here, because content parity outranks it.
- **Voice.** The voice is the same as the scene's. A Shallow Project carries the identical editorial rule line that the scene's panel shows.
- **Moving between surfaces.**
  - The scene has a persistent affordance that reaches the Fallback in one click, from any state.
  - The Fallback's chrome carries the same `THOMAS NAVARRO · the model` Colophon route, so the accessible surface reaches the Colophon without passing through the scene.
  - A Fallback visitor on a capable machine can choose the scene, and that choice creates a real history entry.
- **Date navigation.** The Fallback is the preferred surface for navigating by date, and its time axis serves that need directly.

## Cross-Story Dependencies

- **On Epic 1:** reads the committed versioned artifact, which carries the time-axis scalar, `isDeep` and the full content payload. Epic 4 can be ordered independently once Epic 1 is done.
- **On Epics 2 and 3:**
  - Story 4.2 restores the scene's Client stop and leaves Focus/Escape to the navigation store.
  - Story 4.5 places the affordance in the scene's chrome without breaking the two-line corner-chrome rule.
  - Story 4.6 attaches to the running scene.
  - Rule-line copy and tokens come from Epic 3.
- **Within the epic:**
  - 4.1 (entry and detection) comes before 4.2 (router).
  - 4.3 (the chart) is the base for 4.4 (the signal).
  - 4.5 needs both 4.2 and 4.3.
  - 4.6 reuses 4.5's affordance and adds no new UI.
- **Downstream:** Epic 5's Colophon route depends on 4.2's router. Epic 6 verifies First Paint and the link preview against this Fallback; the preview must not promise a 3D scene to a mobile visitor.
