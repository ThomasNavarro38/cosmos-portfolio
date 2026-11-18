# Epic 8 Context: M3 Goes Live, Credited and Honest

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Ship M3, the realism layer built in Epic 7 and reworked in Epic 9, to the live site, and be honest about it. The Colophon tells the visitor that a Body's appearance is assigned and encodes nothing, and credits every map. A record says exactly what M3 has and has not proven: the 30fps framerate target is **not yet passed**, because no target-profile machine exists. The one shipped frame monitor keeps its worst window, so a single future run on such a machine can settle the question with no new instrument. Since the framerate gate can't run, Thomas's on-screen judgement is what lets M3 ship. His first judgement (8.4, 2026-11-17) rejected the build, and its points became Epic 9; the merge to `main` (8.5), which publishes, now waits on a passing second judgement (9.11). A green CI must never be read as a framerate pass, and colour must never be read as data.

## Stories

- Story 8.1: The worst window, on the visitor's own timeline (done)
- Story 8.2: The Colophon credits the maps (done)
- Story 8.3: The record says "not yet passed" (done)
- Story 8.4: Thomas's on-screen judgement (done, verdict: rejected)
- Story 8.5: M3 reaches the live site (blocked on 9.11)

## Requirements & Constraints

- **Framerate target, recorded, not passed.** 30fps at 1080p on the target profile, a roughly three-year-old corporate laptop with integrated graphics (never Apple silicon, never the dev machine). Every five-second window across one complete forward-and-back Rail scroll must hold 30fps. Only a target-profile run can change "not yet passed"; no proxy exists.
- **The floor is unchanged.** The Fallback is offered below 24fps sustained over a five-second mean. 24–30fps is accepted as degraded, not a pass. One instrument reads both.
- **No backend, no analytics, ever.** Nothing is sent anywhere. The Forward stays anecdotal by design.
- **No disclaimer on any surface.** "Not yet passed" and its equivalents appear only in the record, and no surface claims a framerate.
- **Untouched visitors.** The phone and Fallback chart and the link preview do not change. Neither reading surface requests a map or the `realism` chunk. First Paint stays schematic.
- **Copy places are closed.** The appearance statement and credits live in the Colophon's existing copy place.

## Technical Decisions

- **The instrument (built in 8.1).** `shell/chart-offer.ts` stays the only monitor: pure, import-free, no DOM, latch unchanged. It tracks its worst *full* window past the latch; no window spans a reset, gap or tab return, and gaps are counted. A sink in `first-frame-mark.tsx`'s pattern writes one performance mark, `scene-worst-window`, with detail `{ fps, frames, seconds, gaps }` (`fps` null with no full window). The worst window covers the page's whole life past warm-up, so the protocol requires a fresh load and no tab switch. Realism's frame path is not held to "allocates nothing per frame"; only the sampler is.
- **No adaptive quality.** No `PerformanceMonitor`, no adaptive DPR, no quality tier; `dpr` stays `[1, 2]`.
- **Budgets** live in the import-free `src/render-scene/realism/budgets.ts` and change only by a memlog ruling. A check with nothing to measure fails. The byte limits were ruled unchanged on 2026-11-17 after 9.1's spike:

  | Budget | Limit (measured) |
  | --- | --- |
  | `realism` chunk | 24,000 B (8,560 shipped; 14,752 with 9.1's belt, nebula and ring disc, a lower bound) |
  | `scene` chunk | 960,000 B (953,039 shipped; 953,093 with 9.1's objects, about 6.9 KB left and shared by Epic 9's Client labels and crossfade) |
  | Entry chunk | 4,000 B (3,278 at 8.1) |
  | Texture library | 12 maps, each at most 1024×512 WebP, 4 MB in total |
  | Sphere geometry | one shared geometry, at most 64×32 segments |
  | Added draw calls | 1 per Planet (rim inside the fill shader), 2 per Star, 2 per Deep Project, 1 for all debris belts, 1 for the nebula, 0 for Dust |
  | Full-screen passes, render targets, shadow maps, scene lights | 0 |
  | New runtime dependencies | 0 |

- **Map library.** `src/derive/map-library.ts` owns each map's id, source URL, licence, credit, retrieval date and mean luminance. Only NASA or USGS maps with no third-party copyright and a recorded credit are admitted; the credits acknowledge NASA, and Jupiter's "NASA/JPL/Space Science Institute" is credited as given.
- **Colophon data path (built in 8.2).** The Colophon requests the solver chunk (`src/derive/live.ts`, which re-exports the library) on mount, through the one shared dynamic import also used by the live re-solve. No third fetch, no URL written in `colophon/`, and the entry and scene chunks gain nothing. Every map is listed, worn or not. `EXHIBIT_PATHS` stays two, the derivation table three rows, and `solveLive` byte-identical.
- **Deployment.** Static on GitHub Pages at `https://thomasnavarro38.github.io/cosmos-portfolio/` (base `/cosmos-portfolio/`), deployed by `.github/workflows/deploy.yml` on merge to `main`. Rollback means redeploying the previous commit and recording the failure.
- **The record** in `_bmad-output/implementation-artifacts/` states NFR-2 not yet passed, each budget with its measured value (labelled a budget, never a framerate), the target-run protocol and the pass condition. 8.4's rejected section stays as written; 9.11 adds its own beside it.

## UX & Interaction Patterns

- **Colophon copy.** Shipped today, as ruled on 2026-11-16: heading `what a Planet looks like`, the Planet-surface statement, lead-in `Every map this site serves, worn or not:`, and one `<id>.webp: <credit>, <licence>.` entry per library map with a `source` link. Ruled on 2026-11-17 and shipping in 9.5 (not in this epic): heading `what a Star and a Planet look like` and a statement covering Star colours too. Whatever ships must be verbatim in the page, in the copy place's document and in the identity audit.
- The Colophon stays a conventional document: headings in order, achromatic, contrast floor kept, full screen-reader parity, reachable from the scene and the Fallback.
- Colour encodes nothing on any surface.

## Cross-Story Dependencies

- **Delivery.** The epic continues on `m3-realism`. Only 8.5 reaches `main`.
- **8.5 needs Epic 9.** Its gate is a passing **9.11** verdict for the exact build being merged (8.4's rejection stays on record), plus green `npm test` (any skip named), `tsc` and `npm run build`, and Thomas's explicit go-ahead, since merging publishes.
- **A failed judgement** returns to the tunable values of Epics 7 and 9, inside the budgets. Moving line-work further, changing Focus framing, adding a composer or post pass, or changing a budget needs a new memlog ruling.
- **8.5's live check:**
  - On a real browser, every map and the `realism` chunk return 200 under the base path, and the fade is actually seen. "No error on screen" is not evidence.
  - The live Stars show their Client names and tints, and the crossfade from line-work to realism is seen to happen, not just the fade-in.
  - First Paint is measured by story 6.4's P1 procedure and recorded beside the M2 figure, with its machine.
  - The chart (including on a phone), the Colophon and the preview are checked; `/colophon/`'s requests are re-recorded.
  - On close, the record names the live commit and still reads "not yet passed".
- **Carried before 8.5 merges:**
  - the follow-up code review over 7.4–7.8 (`007106e^..a36eef7`), and the recommended follow-up reviews for 8.1 and 8.2
  - the depth-margin check, settled by a `scripts/` check or an accepted ruling
  - the 2026-11-16 rulings recorded in `deferred-work.md`, with their ACs annotated
  - open from 8.2's review: a failed solver import on open stays cached and disables "solve it again" until reload (deferred, medium)
  - the never-run list beside NFR-2: the depth bias on integrated graphics, phones and sub-24-bit depth; Firefox and Safari (including `imageOrientation: 'flipY'`); 60 Hz displays; three's program-info-log warning on other drivers
  - 8.5's live-site driver would be a seventh Chrome driver; consider a shared driver module first.

## Working Detail Carried Forward

These items are kept from the previous compile because 8.5 and 9.11 still depend on them.

- **Reading the worst window.**
  - The sink re-marks `scene-worst-window` on every new worst and on every gap.
  - A target run reads it with `performance.getEntriesByName('scene-worst-window')`, and reads the entry together with the gap count.
  - The window covers the page's whole life past warm-up. A pass is therefore conservative, but a failure may come from outside the Rail scroll. So a run needs a fresh load and no tab switch, and a non-zero gap count is reported, never read as a pass.
- **Per-frame allocation.** Only the sampler is held to "allocates nothing per frame". Realism's frame path is not: the draw literal and subject closure in `realism-mount.tsx`, and `mapFromWorld` in `fill-layer.ts`. This was decided in 8.1 and is open for Thomas to overturn on evidence from a target run.
- **Judgement records** give the date, machine, browser, commit, poses, the verdict in Thomas's words and screenshots stored beside the record. Each record says the machine is not the target profile.
- **8.4's sheet:**
  - The poses are the opening frame, a Client stop, Focus, the Rail at p=2.8333 and the keyboard band.
  - The Epic 7 looks checked were: a farther fill over a nearer glow, half-disc Planets, the Star's dark ring, the fill-tilt axis wording, Jupiter worn by no Planet, the band between the plate and the keyboard outline, and overlapping rest glows.
  - 9.11 inherits them as `epic-9-context.md` describes: the dark ring is superseded by 9.4, overlapping glows are re-checked under the tints, and the rest are carried.
