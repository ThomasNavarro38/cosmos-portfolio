# Epic 6 Context: Launch Surface — Shareability, Contact, and First Paint

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic is the last mile before the CV link goes live. It covers three things. First, a link pasted into Slack, LinkedIn or a message renders as a deliberately composed preview image, never a blank card, and it does not promise more than a mobile visitor will get (the Fallback). Second, anyone can reach Thomas through a contact route that works on a locked-down corporate laptop with no mail client configured. Third, the first frame of the Schematic scene is verified on real target hardware, fast enough that The Forward is still there when it arrives. The Forward is the cold, context-free recipient that SM-1 (the link being sent onward unprompted) depends on. Most of the First Paint enablers already exist from Epics 1 and 4. What remains is verification against the real scene and Fallback, plus a final launch-readiness pass against the M2 gate.

## Stories

- Story 6.1: The composed link preview
- Story 6.2: Preview drift guard
- Story 6.3: The contact route
- Story 6.4: First Paint verified on target hardware
- Story 6.5: Launch readiness pass

## Requirements & Constraints

- **Shareability is designed, not observed.** A committed `public/preview.png` is referenced by `og:` and `twitter:` metadata. It is deliberately composed, never auto-derived from a screenshot. The opening Shot is framed to survive being captured as a still, and the preview and the opening frame must be visibly the same composition.
- **Honest without a disclaimer.** The preview, title and description must not promise an interactive 3D scene, because mobile visitors get the Fallback. Achieve honesty through composition and wording only. No "best viewed on desktop", badge, caveat or apologetic register. No quote, testimonial or invented praise anywhere, including the metadata. Story 6.1 decided the treatment (DESIGN.md §7.12, D-G5 closed): the opening frame framed for the card, both corner-chrome lines verbatim, the title `Thomas Navarro` and the description `A work history, mapped.`, with plain alt text.
- **Contact route:** a visible, copyable address, alongside or instead of `mailto:`, because a bare mailto dead-links on exactly the corporate laptops the target profile names. No backend, form service, API, serverless function or third-party endpoint. Nothing is submitted anywhere. It is explicitly unglamorous (the designed black-hole ending is M4) and makes no apology. It is one of the five sanctioned places for copy, so it has no help text, tooltip or caption. The route must also be present on the Fallback, keyboard-reachable and with a real accessible name.
- **Copy feedback** is a three-word in-place microcopy change (e.g. "copied"), never a toast, banner or modal. This is the product's one genuine runtime error surface. If the clipboard is blocked, the address stays readable and hand-selectable.
- **First Paint:** nothing gates the first frame: no consent banner, cookie notice, splash, loading screen, progress bar or click-to-enter. The site collects nothing, so there is nothing to accept. Measure on a three-year-old laptop with integrated graphics at 1080p over median broadband, **never** on the dev machine or Apple silicon. Record the result against the carried 2.5s figure and state that **the principle is adopted and the number is not ratified**, so a miss is a decision point, not an automatic failure.
- **Opening fifteen seconds:** an unprompted viewer registers a real work history, organised rather than listed, and deliberately designed.
- **M2 gate (launch):** a technical stranger who explores two or three entries can state Thomas's discipline, seniority and the kinds of environments he works in, *and* can say which entries were worth reading. This must hold on the scene and on the Fallback alone.
- **No disclaimer anywhere** in a final review of the scene, panel, Fallback, Colophon, preview and contact route: no "work in progress", beta tag, badge or apologetic microcopy.
- **No analytics, ever.** SM-1 is measured anecdotally by construction. Adding instrumentation would contradict the no-backend rule and serve the total-visits counter-metric.

## Technical Decisions

- **The build-time layout makes the preview possible.** The layout is solved at build time and committed, so the opening frame is reproducible and a matching static preview is meaningful. The runtime performs no force solve.
- **Preview drift guard:** when `layout.generated.json` is newer than `public/preview.png`, the build warns, naming both files and saying the preview may be stale. It warns loud but does not block, and whether it should escalate to a build failure is recorded as an open decision. Headless WebGL at build time was rejected: no native dependency, no headless browser, and the guard must stay cheap for a rebuild years from now. Document regenerating the preview as part of the deliberate re-solve act.
- **Entry and chunk boundaries must still hold at launch.** The entry chunk has no React and no Three. Detection (a WebGL2 context only, with mobile meaning a coarse primary pointer) runs before any dynamic import. Four lazy chunks: render-scene, render-fallback, colophon and solver. The entry graph reaches neither Three, nor the solver, nor `src/data/`. The CI size-budget and module-graph assertions run against the **production build**, the bundler output.
- **Build gates on its own contracts.** On a clean checkout, `npm run build` must pass schema validation, artifact-against-schema validation, destination-cardinality assertion, import-boundary and bundle assertions. It fails if any of them does not.
- **Deployment:** any static file host. No Node process, serverless function, database, environment variable or secret. Production only. Rollback means redeploying a previous commit. The choice between hosts (Cloudflare Pages, Netlify and similar) is preference, not architecture.
- **Routing:** scene, Fallback and Colophon are each addressable. Back works, and the scene resumes at the stop it was left at, never at First Paint.

## UX & Interaction Patterns

- **Preview composition** uses the same system as the scene: `surface-base` ground, exactly one white Client Star, the Rail at `stroke-dust`, and the two corner-chrome lines (never a third). It follows the identity rules: no hue, no shadow, no glow, square corners, and it references tokens rather than hexes.
- **Streaming after First Paint** (full Dust density, remaining Bodies, the complete Rail) must never pop. A late Body fades its stroke up through the luminance ladder. There are no skeletons or placeholders: a Body that has not arrived is simply not there yet.
- **The Fallback never tells the visitor they are missing something.** If copy concedes anything, it does so in three words, in the flow, and moves on.

## Cross-Story Dependencies

- Depends on Epic 2 (a scene to measure and frame), Epic 4 (the Fallback, routing, detection and bundle assertions) and Epic 1 (the committed artifact, schema gates and the deliberate re-solve).
- 6.2 depends on 6.1's committed `public/preview.png`. 6.1's preview must match the opening Shot as currently solved.
- 6.3's route must appear on both the scene and the Fallback surfaces.
- 6.5 comes last. It re-verifies 6.1–6.4 together with the routing and build gates from earlier epics, and it needs a real deployment.
