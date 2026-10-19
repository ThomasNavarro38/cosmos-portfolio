# Epic 4 Context: The Fallback and Capability Routing

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A visitor on a phone, a locked-down corporate laptop, or any machine without WebGL2 gets a complete, designed flat star chart, not an error or a degraded scene, and any visitor on any machine can reach that chart in one click. Capability detection runs before anything heavy is fetched or rendered, so nobody ever sees a broken 3D scene. The Fallback is content-complete: every Project, every field and every Notable, with nothing truncated. It is not a degradation path. It is the surface "The Forward" (a cold, often mobile, Slack-link opener on whom the main success metric depends) most often lands on, so it is held to its own design quality bar. The epic also gives the three surfaces (scene, Fallback, Colophon) one router with real browser history. Stories 4.1–4.6 are done; the epic was accepted with open items, and stories 4.7–4.10 schedule the four retrospective action items Thomas accepted. All four must land before Epic 5 starts.

## Stories

- Story 4.1: Capability detection in the thin entry
- Story 4.2: Surface routing with real history
- Story 4.3: The Fallback star chart
- Story 4.4: The Deep/Shallow signal on a flat chart
- Story 4.5: One-click movement between surfaces
- Story 4.6: Performance offers, never forces
- Story 4.7: The render harness
- Story 4.8: Follow-up review of stories 4.5 and 4.6
- Story 4.9: Deferred-work register housekeeping
- Story 4.10: Fallback accessibility

## Requirements & Constraints

- **Detection comes before rendering.** Capability is detected, never assumed. Nothing gates the first frame: no error state, loading screen, splash, skeleton or click-to-enter.
- **Content parity is absolute.** The Fallback shows every Project, every field and every Notable. It is never a teaser, stub, summary or error page. Launch gate: a reader who has never seen the site can use the Fallback alone to say what Thomas does **and** which entries are worth reading.
- **No apology anywhere.** No banner, badge, "best viewed on desktop" line or apologetic microcopy. Links present the Fallback as a surface in its own right.
- **Mobile always gets the Fallback.** Mobile means a coarse primary pointer, never viewport width. There is no third tier.
- **Reduced motion is not a capability signal.** It never routes a visitor to the Fallback.
- **Performance offers, never forces.** Below the sustained floor, the Fallback is offered through the existing link, and the visitor is never rerouted.
  - The floor is not the 30fps target.
  - It is one named constant (`FALLBACK_FLOOR_FPS = 24`), still awaiting ratification.
- **Quality holds, frames drop.** Never strip render quality or features to gain frames. A stable framerate beats a higher, fluctuating one.
- **Target hardware.** Measure on a three-year-old laptop with integrated graphics at 1080p, never on the dev machine.
- **Accessibility floor.** The Fallback is a conventional semantic document with headings in order and no canvas. The remediation story extends the floor to:
  - moving focus to the new surface, naming the surface in `document.title`, and announcing it once on each route change;
  - keeping table semantics at 640px and below;
  - giving focus to the record on a `/chart#<id>` landing, without forcing a visible focus ring for pointer visitors;
  - 3:1 non-text contrast for the link underline, the focus outline, the Ring and the Notable glyphs.
- **Open by Thomas's choice.** The M2 reader test on the Fallback and the NFR-4 hardware measurement have no evidence yet. Neither is tracked.

## Technical Decisions

- **Thin entry.** The entry contains no React and no Three, and its module graph reaches neither the scene, nor the solver, nor `src/data/`.
  - `detect()` is plain JS that tests only whether a WebGL2 context can be created. It does not use `failIfMajorPerformanceCaveat` (ruling Q2a), and no performance probe runs on the First Paint path.
  - The entry imports only `route.ts` from the router (`Route`, `ROUTE_PATHS`, `resolveRoute`), so `createRouter` stays out of the entry chunk (ruling Q3).
  - The entry budget stays at 4,000 bytes, enforced by the CI bundle assertion over bundler output.
- **One mount chunk (ruling Q2).** The entry dynamically imports exactly one module, the mount. The mount then requests only the renderer chunk for the chosen surface.
- **Router.** There are exactly three routes: `/`, `/chart` and `/colophon`.
  - Every route change is a real history entry.
  - The scene's position is kept as `scrollProgress` in the navigation store (ruling R1: `railPosition` no longer exists). It is saved on leaving the scene and restored on return, never reset to First Paint.
  - Focus is not a route. Escape releases it, never Back.
  - URL fragments name stable entity IDs.
- **`src/render-fallback/`** reads only the committed layout artifact: the time-axis scalar, `isDeep` and every derived value.
  - It never imports from `src/data/` or from the scene, and it never classifies Projects.
  - A missing value is fixed in the artifact schema and its derivation, never computed locally.
- **Testing.** `node --test` cannot load `.tsx`. The React wiring is guarded only by source-text regexes today. The harness must:
  - render the shipped components server-side with no new runtime dependency and nothing added to any shipped chunk;
  - retire the regexes it replaces, and move the remaining audits beside the modules they pin.
- **Deferral register.** `deferred-work.md` is where new story specs pull their deferrals from. Story 4.9 settles whether the log or each spec's frontmatter is the one register.

## UX & Interaction Patterns

- **Layout.** Time is the axis: horizontal on desktop, vertical on a phone. The page is a conventional scrolling document with no bespoke touch handling.
- **Identity.** The Fallback uses the same DESIGN.md tokens as the scene: square corners, no shadow or glow, and no vignette. `surface-edge` frames each plate.
- **Deep/Shallow signal.** The Ring alone carries it, through three channels: around the plate marker, in the index row's Notable column, and in that cell's accessible name. Marker size and luminance never carry it.
- **Text content.** Skills are shown as text. A Shallow Project carries the same editorial rule line as the scene's panel. Each Client shows its derived span in years.
- **Moving between surfaces.**
  - The scene's left-top line reads `THOMAS NAVARRO · the model · the chart`. Only `the chart` is a link (ruling Q1), and it is present in every scene state.
  - The chart's chrome links `the model` to `/colophon`.
  - It shows `the scene` (to `/`) only on a capable machine.
  - Once offered, `the chart` gains a hairline underline at rest (ruling Q1a). No new element or copy is added.

## Cross-Story Dependencies

- **Upstream:** Epic 1 supplies the artifact. Epics 2 and 3 supply the navigation store, Escape and Focus, the corner chrome, and the rule-line copy and tokens.
- **Within the epic:**
  - 4.7 replaces the regex audits from 4.2–4.6, including the offer latch on `CornerChrome`.
  - 4.8 reviews `6582786^..cd61915`, weighting the 4.2 × 4.5 router seam and the 4.5 × 4.6 link seam. It then clears `followup_review_recommended` in both specs.
  - 4.9 files the 4.5 and 4.6 deferrals and refiles the misplaced 4.3 and 4.4 entries without changing their text.
  - 4.10 builds on 4.5's links and the identity audit.
- **Downstream:**
  - Story 5.1 must make the scene's `the model` a link and give `/colophon` a way out.
  - Epic 6 checks First Paint and the link preview against this Fallback.
