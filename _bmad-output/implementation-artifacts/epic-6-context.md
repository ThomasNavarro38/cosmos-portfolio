# Epic 6 Context: Launch Surface — Shareability, Contact, and First Paint

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic is the last mile before the CV link goes live. A link pasted into Slack, LinkedIn or a message unfurls as a deliberately composed image that does not promise more than a mobile visitor (who gets the Fallback) will receive. Anyone can reach Thomas through a contact route that works on a locked-down corporate laptop with no mail client configured. The first frame of the Schematic scene is verified on real target hardware, fast enough that The Forward (the cold, context-free recipient that the link being forwarded depends on) is still there when it arrives. The preview and its drift guard are done; the contact route is done, then hardware verification and a final launch-readiness pass against the M2 gate.

## Stories

- Story 6.1: The composed link preview (done)
- Story 6.2: Preview drift guard (done)
- Story 6.3: The contact route (done)
- Story 6.4: First Paint verified on target hardware
- Story 6.5: Launch readiness pass

## Requirements & Constraints

- **Contact route:** a visible, copyable address, alongside or instead of `mailto:`, because a bare mailto dead-links on exactly the corporate laptops of the target hardware profile. The route must work without a configured mail client.
- **No backend for contact:** no form service, API, serverless function or third-party endpoint. Nothing is submitted anywhere.
- **Ruled (Thomas, 2026-10-22, Q1–Q5).** The address is itself a `mailto:` link (its visible text and accessible name the address, selectable by hand) with a separate `copy` button beside it (Q4 (b)). The button's label is the feedback, changed in place: `copy`, then `copied`, or `not copied` when the clipboard is blocked or absent. It stays until the next press: no timer, toast, banner, modal, live region or tooltip (Q5). The address is `t.navarro9@laposte.net` (Q1, supplied by Thomas 2026-10-22).
- **The one genuine runtime error surface.** If clipboard access is blocked or fails, the visible address stays readable and hand-selectable. Nothing else degrades.
- **One of exactly five copy places.** The contact route is copy place 5. It has no help text, tooltip or explanatory caption. Every string must be held to the product voice.
- **Unglamorous, without apology.** It works and does not embarrass. The designed ending (the collapse into a black hole that becomes the contact surface) is M4 and stays out of scope.
- **Where it is drawn:** on the Fallback chart, in its chrome row beside the heading (Q3 (a)), and on the Colophon, directly under its `<h1>`. **Never on the scene** or in its corner chrome (Q2 (d)). Keyboard-reachable, with a real accessible name.
- **No disclaimer anywhere:** no "work in progress", beta tag, badge, "best viewed on desktop" or apologetic register on any surface (scene, panel, Fallback, Colophon, preview, contact route). No quote, testimonial or invented praise.
- **First Paint (6.4):** nothing gates the first frame (no consent banner, cookie notice, splash, loader, progress bar or click-to-enter). The site collects nothing. Measure on a three-year-old laptop with integrated graphics at 1080p over median broadband, never on the dev machine or Apple silicon. Record against the carried 2.5 s figure and state that the principle is adopted and the number is not ratified, so a miss is a decision point. In the first fifteen seconds, an unprompted viewer must register a real, organised, deliberately designed work history.
- **M2 gate (6.5):** a technical stranger exploring two or three entries can state Thomas's discipline, seniority and environments, and can say which entries were worth reading. This must hold on the scene and on the Fallback alone.
- **No analytics, ever.** Forwarding success is measured anecdotally by construction.

## Technical Decisions

- **Static and backend-free.** The runtime has almost no error surface: no fetch for career data, no auth, no backend. Deploy to any static host with no Node process, serverless function, database, environment variable or secret. Rollback means redeploying a previous commit.
- **Entry and chunk boundaries must hold at launch.** The entry chunk has no React and no Three. Detection (WebGL2 context only; mobile means a coarse primary pointer) runs before any dynamic import. The lazy chunks are render-scene, render-fallback, colophon and solver. The entry graph reaches neither Three, nor the solver, nor `src/data/`. Size-budget and module-graph assertions run against the production build. The contact route, drawn on the chart and the Colophon, must not break these boundaries or the entry byte budget: it is one shared shell component in the `ui` manual chunk.
- **Build gates on its own contracts.** `npm run build` fails unless schema validation, artifact-against-schema validation, destination cardinality, import-boundary and bundle assertions all pass.
- **The layout is solved at build time and committed.** The runtime performs no force solve. `public/preview.png` is regenerated through `scripts/preview.ts` as part of the deliberate re-solve. The build warns but does not fail when the layout is newer than the preview; escalating that warning is an open decision.
- **Routing:** scene, Fallback and Colophon are each addressable. Back works, and the scene resumes at the stop it was left at.

## UX & Interaction Patterns

- **Identity rules apply to the contact route:** token-only colour, no hue, no shadow, no glow, square corners. White is scarce: it is spent once per frame on the Focused subject. Keyboard focus is shown with the square-cornered focus ring and is never suppressed.
- **The contact route's treatment** mirrors its neighbours: the chrome type role at `ink-label`, raised to `ink-lift`/`ink-prose`, the links' 1px `stroke-focus` focus outline and a forced-colours outline. Placement and copy are ruled (Q1–Q5, 2026-10-22), not open; EXPERIENCE.md §7.5 records them.
- **Page metadata** (title `Thomas Navarro`, description `A work history, mapped.`, the preview alt text) is not a sixth copy place.
- **The Fallback never tells the visitor they are missing something.**
- **Streaming after First Paint** never pops: a late Body fades its stroke up through the luminance ladder, with no skeletons or placeholders.

## Cross-Story Dependencies

- This epic builds on Epic 1 (the committed artifact, schema gates and deliberate re-solve), Epic 2 (the scene) and Epic 4 (the Fallback, routing, detection and bundle assertions).
- 6.3's route appears on the Fallback and the Colophon, never the scene. 6.5's final no-disclaimer review covers it; its address is supplied.
- 6.4 measures the shipped scene, so it should follow any additions to the entry graph or the first frame. 6.3 adds nothing to the scene.
- 6.5 comes last. It re-verifies 6.1–6.4 with the earlier routing and build gates, and it needs a real deployment.
