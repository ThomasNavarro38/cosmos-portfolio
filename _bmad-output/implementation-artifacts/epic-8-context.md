# Epic 8 Context: M3 Goes Live, Credited and Honest

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Ship M3 to the live site and be honest about it. M3 is the realism layer built in Epic 7 and reworked into physical objects in Epic 9. The Colophon tells the visitor that a Body's appearance is assigned and encodes nothing, and it credits every map. A record says exactly what M3 has and has not proven. The 30fps framerate target is **not yet passed**, because no target-profile machine exists. The one shipped frame monitor keeps its worst window, so a single future run on such a machine can settle the question with no new instrument. The framerate gate can't run, so Thomas's on-screen judgement is what lets M3 ship. His first judgement (8.4) rejected the build, and its points became Epic 9. His second (9.11, 2026-11-26) passed. Only 8.5 remains: merging `m3-realism` into `main`, which publishes, then checking the live site. A green CI must never be read as a framerate pass, and colour must never be read as data.

## Stories

- Story 8.1: The worst window, on the visitor's own timeline (done)
- Story 8.2: The Colophon credits the maps (done)
- Story 8.3: The record says "not yet passed" (done)
- Story 8.4: Thomas's on-screen judgement (done, verdict: rejected)
- Story 8.5: M3 reaches the live site (next; was blocked on 9.11, which passed)

## Requirements & Constraints

- **Framerate target: recorded, not passed.** The target is 30fps at 1080p on the target profile, a laptop about three years old with integrated graphics. It is never Apple silicon and never the dev machine. Every five-second window across one complete forward-and-back Rail scroll must hold 30fps. Only a target-profile run can change "not yet passed"; no proxy counts. Going live is not a framerate result.
- **The floor is unchanged.** The Fallback is offered below 24fps sustained over a five-second mean. 24–30fps is accepted as degraded, not a pass.
- **No backend and no analytics, ever.** Nothing is sent anywhere.
- **No disclaimer on any surface.** "Not yet passed" appears only in the record, and no surface claims a framerate.
- **Other visitors are untouched.** The phone and Fallback chart and the link preview do not change. Neither reading surface requests a map or the `realism` chunk. First Paint stays schematic.

## Technical Decisions

- **The instrument.** `shell/chart-offer.ts` stays the only monitor. It is pure and import-free. A sink writes one performance mark, `scene-worst-window`, with detail `{ fps, frames, seconds, gaps }`. A pass needs `fps` not null, `gaps === 0` and `fps >= 30`. A run needs a fresh load and no tab switch.
- **No adaptive quality.** `dpr` stays `[1, 2]`.
- **Budgets** live in `src/render-scene/realism/budgets.ts` and change only by a memlog ruling. Chunk limits: `realism` 25,000 B (ruled up from 24,000 B on 2026-11-22), `scene` 960,000 B, entry 4,000 B. Both byte chunks are now under 2,000 B free (`scene` about 1,364 B, `realism` about 181 B), so any growth of either needs a spec and a memlog RULING in the same commit. Other budgets: 12 maps, at most 1024×512 WebP each, 4 MB in total; one sphere of at most 64×32 segments; 0 full-screen passes, render targets, shadows or lights; 0 new runtime dependencies.
- **Deployment.** The site is static on GitHub Pages at `https://thomasnavarro38.github.io/cosmos-portfolio/` (base `/cosmos-portfolio/`). `.github/workflows/deploy.yml` deploys it on a push to `main`, and it runs `npm run check:followup` before the build. Rollback means redeploying the previous commit and recording the failure.
- **The record** is `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md`, and `scripts/nfr-2-record.test.ts` guards it. The 8.4 and 9.11 sections stay as written. A new judgement gets its own section after them.
- **The 9.11 judged build:**
  - Commit `e73313eb78e1db00ce80b7cfdb7084f9072877f0`.
  - `npm run build` emits the entry `index-LIDA_8Wh.js`, `scene-Cx1RF68j.js` and `realism-CrU47Alr.js`.
  - Verdict: Passed (Thomas, 2026-11-26). It was judged on the Odyssey Ark in its 16:9 mode (3840×2160) and at a 1920×1080 viewport emulated on the Ark, at DPR 1. All 14 checklist looks passed.
- **Before judging, confirm the build** (the record's rule):
  - After `npm run build`, compare the three chunk names in `dist/assets/` with those above.
  - At a later HEAD, also check that `git diff --stat e73313eb78e1db00ce80b7cfdb7084f9072877f0 -- src public index.html` is empty, or check out the build commit first.
  - If either differs, it is another build, and the judgement does not carry over to it. The names are necessary but not sufficient, since they cover only the JavaScript.
- **The record's "Live (8.5)" section** is a stub today. 8.5 fills it with the live commit, and it must keep the line "The status stays 'not yet passed': going live is not a framerate result."

## UX & Interaction Patterns

- The Colophon keeps the ruled copy and credits verbatim: one `<id>.webp: <credit>, <licence>.` entry per library map with a `source` link, every map listed whether worn or not. It also stays a conventional, achromatic, screen-reader-complete document.
- Colour encodes nothing on any surface.

## Cross-Story Dependencies

- **8.5's merge gates:**
  - A passing 9.11 verdict **for the exact build being merged**.
  - Green `npm test` (with any skip named), `tsc` and `npm run build`.
  - `npm run check:followup` prints `no follow-up review flags held`. It did on 2026-11-27, after `review-followup-12-flags-2026-11-27.md`.
  - Thomas's explicit go-ahead, since merging publishes.
- **Open blocker (2026-11-27).** The last `/bmad-build-auto 8-5` run (`bmad-build-auto-result-8-5-m3-reaches-the-live-site.md`) HALTed `blocked`. HEAD is not the judged build: about 14 shipped non-test modules differ from `e73313e`. Some changes are visible, such as the label inks raised to `ink-prose` and the affordance plate padding. Others include shader hardening and lost-WebGL-context handling. No ruling carries the verdict over. Thomas must choose one of two routes:
  - re-judge HEAD's build in a third judgement section, with its commit, chunk names, five poses on both displays and a verdict;
  - or rule that 9.11's pass covers HEAD, as a dated RULING in the architecture `.memlog.md` and beside the 9.11 verdict.

  Until then, 8.5 must not merge.
- **8.5's live check:**
  - On a real browser, every map and the `realism` chunk return 200 under the base path, and the fade is actually seen. "No error on screen" is not evidence.
  - The live Stars show their Client names and tints, and the crossfade from line-work to realism is seen to happen, not just the fade-in.
  - First Paint is measured by 6.4's P1 procedure (`first-paint-6-4.md`) and recorded beside the M2 figure, with its machine. M2's median was 1,938.3 ms, measured on the dev machine as a proxy by ruling (4× CPU throttling, Fast 4G, live site).
  - The chart (including on a phone), the Colophon and the preview are checked.
  - On close, the record names the live commit and still reads "not yet passed".
- **Deferred work that names 8.5.** `spikes/realism-failure/results/routes.txt` still records `/colophon/`'s requests from 7.10. Since 8.2, the Colophon requests the solver chunk (`live-*.js`) on mount, and `checkRoutes` still passes. 8.5's live check should re-record `/colophon/`'s requests.
- **Still open, carried toward 8.5:**
  - Epic 7 retro item 50: record the 2026-11-16 rulings in `deferred-work.md` and annotate the ACs.
  - Epic 7 retro item 52: settle the depth-margin check with a `scripts/` check or a ruling.
  - From 8.2's review: a failed solver import stays cached and disables "solve it again" until reload (deferred, medium).
- **The never-run list beside NFR-2:**
  - the depth bias on integrated GPUs, phones and depth buffers below 24 bits;
  - Firefox and Safari, including `imageOrientation: 'flipY'`;
  - 60 Hz displays;
  - three's program-info-log warning on other drivers.
- An 8.5 live-site driver would be a seventh Chrome driver, so consider a shared driver module first.
