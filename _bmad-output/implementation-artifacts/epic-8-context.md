# Epic 8 Context: M3 Goes Live, Credited and Honest

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Ship M3, the realism layer built in Epic 7, to the live site, and be honest about it. The Colophon tells the visitor that a Planet's appearance is assigned and encodes nothing, and credits every map. A record says exactly what M3 has and has not proven: the 30fps framerate target is **not yet passed**, because no target-profile machine exists. The one shipped frame monitor is extended so a single future run on such a machine can settle the question with no new instrument. Since the framerate gate can't run, Thomas's own on-screen judgement is what lets M3 ship. Then `m3-realism` merges to `main`, which publishes. The epic matters because a green CI must never be read as a framerate pass, and colour must never be read as data.

## Stories

- Story 8.1: The worst window, on the visitor's own timeline
- Story 8.2: The Colophon credits the maps
- Story 8.3: The record says "not yet passed"
- Story 8.4: Thomas's on-screen judgement
- Story 8.5: M3 reaches the live site

## Requirements & Constraints

- **Framerate target, recorded, not passed.** The target is 30fps at 1080p on the target profile: a roughly three-year-old corporate laptop with integrated graphics. It is never Apple silicon and never the dev machine. It is measured as the mean over five-second windows across one complete forward-and-back scroll of the Rails, and every window must hold 30fps. Only a run on a target-profile machine can change "not yet passed". No proxy exists, and no other hardware counts.
- **The floor is unchanged.** The Fallback is still offered below 24fps sustained over a five-second mean. The 24–30fps band is accepted as degraded, but it is not a pass. Target and floor are read by one instrument.
- **No backend, no analytics, ever.** There is no server, API or CMS, and nothing is sent anywhere. The Forward (the primary success signal) stays anecdotal by design. Instrumenting it is refused.
- **No disclaimer on any surface.** No "work in progress" note, badge or apology. "Not yet passed" and its equivalents appear only in the record, and no surface claims a framerate.
- **The Colophon** is a conventional document that shows the real data and the three mapping rules, not a description of them. It needs real headings in order, an achromatic palette, the contrast floor kept, and full screen-reader parity. It must work from both the scene and the Fallback.
- **Untouched visitors.** The phone and Fallback chart and the link preview do not change. Neither reading surface requests a map or the `realism` chunk. First Paint stays schematic.
- **Copy places are closed.** The appearance statement and credits are part of the Colophon's existing copy place, not a new one.

## Technical Decisions

- **The instrument.** The monitor in `shell/chart-offer.ts` stays the only instrument. It tracks its worst *full* window past the latch, stays pure, imports nothing, touches no DOM and changes no latch behaviour.
  - A window never spans a reset, a gap or a tab return. Gaps are counted, and a partial window never counts as the worst.
  - A sink bound outside the monitor, following `first-frame-mark.tsx`'s pattern, writes the worst window to the visitor's own performance timeline under one fixed entry name.
  - The sampler allocates nothing per frame. Any new importer is the one named change to `chart-offer.test.ts`'s importer table.
- **No adaptive quality.** No `PerformanceMonitor`, adaptive DPR or quality tier, and `dpr` stays `[1, 2]`.
- **Budgets** live in the import-free `src/render-scene/realism/budgets.ts`. They change only by a ruling recorded in the memlog. A check with nothing to measure fails.

  | Budget | Limit |
  | --- | --- |
  | `realism` chunk | 24,000 B (about 8,560 now) |
  | `scene` chunk | 960,000 B (about 952,633 now, so only about 7.4 KB of headroom, and 8.1's work lands in this chunk) |
  | Texture library | 12 maps, each at most 1024×512 WebP, 4 MB in total |
  | Sphere geometry | one shared geometry, at most 64×32 segments |
  | Added draw calls | 1 per Planet, 2 per Star, 0 for Dust |
  | Full-screen passes, render targets, shadow maps, scene lights | 0 |
  | New runtime dependencies | 0 |

- **Map library.** `src/derive/map-library.ts` is the single owner of each map's id, source URL, licence wording, credit line, retrieval date and mean luminance.
  - Admission rule: published by NASA or USGS, no third-party copyright on the page, and a recorded credit line.
  - Under Thomas's ruling, the portfolio counts as informational use under NASA's guidelines, so the credits must acknowledge NASA. Whether Jupiter's "NASA/JPL/Space Science Institute" credit passes the third-party test is open, and 8.2 owns it.
- **Colophon data path.** The Colophon reads the library through its existing dynamic edge into `src/derive/` (the solver/colophon chunk). It makes no third fetch, and the entry and scene chunks gain nothing.
  - No URL is written in `colophon/`. Each `href` comes from the library.
  - Every map is listed, assigned or not, because every committed file is publicly served.
  - `EXHIBIT_PATHS` stays at two unless the ruled copy changes what pins it.
  - Appearance takes no row in the derivation table, which stays three rows.
  - `solveLive` stays byte-identical to the committed artifact.
- **Deployment.** The site is static on GitHub Pages at `https://thomasnavarro38.github.io/cosmos-portfolio/`, under the `/cosmos-portfolio/` base, deployed by `.github/workflows/deploy.yml` on merge to `main`.
  - Production is the only environment.
  - Rollback is redeploying the previous commit, and the failure is recorded.
- **The record** lives in `_bmad-output/implementation-artifacts/`. It states:
  - NFR-2 is not yet passed.
  - Each budget's limit and its measured value, labelled as a budget and a starting value, never as a framerate.
  - The target-run protocol: a machine matching the target profile, 1080p, a fresh load, one full forward-and-back Rail scroll, and the worst-window entry read together with the gap count.
  - The pass condition.

## UX & Interaction Patterns

- The Colophon's appearance section is one plain statement that appearance is assigned from the entity's ID and encodes nothing, followed by the credit list. Each entry has its credit line, licence wording and a real source link.
- Colour encodes nothing. Recency stays on the outline's luminance band, the subject on the white stroke, and Deep/Shallow on Ring and Moon.
- The voice stays concrete, unboastful and checkable against the files shown. The section must sit coherently beside "only career.json is authored" and "The two files above are all the data there is".

## Cross-Story Dependencies

- **Delivery.** The epic continues on `m3-realism`. Only 8.5 reaches `main`, and `m3-realism` must not merge before then.
- **Rulings that block agents:**
  - 8.2 must first put proposed wording to Thomas and ship nothing before his ruling. The ruled copy then appears verbatim in the page, in EXPERIENCE.md copy place 4 and in the identity audit's allowlist.
  - 8.4 is a human gate: the agent prepares a production build and the record, then stops. It never records a verdict.
  - 8.5 needs Thomas's explicit go-ahead to merge, since merging publishes.
- **Ordering.**
  - 8.4 needs Epic 7 and 8.1–8.3 done. Its verdict is recorded in 8.3's record with the date, machine, browser, commit, poses, the verdict in Thomas's words, and screenshots stored beside the record. It must say the machine is not the target profile.
  - 8.5 needs a passing 8.4 verdict for the exact build being merged, plus green `npm test` (any skip named), `tsc` and `npm run build`.
  - When 8.5 closes, it names the live commit in 8.3's record, which still reads "not yet passed".
- **A failed judgement** goes back to Epic 7's tunable values, inside the budgets: map choice, ambient floor, glow and fade values, spin rates. Moving line-work, changing Focus framing, adding a post pass or changing a budget needs a new ruling recorded in the memlog.
- **8.5's live check:**
  - On a real browser, every map and the `realism` chunk return 200 under the base path, and the fade is actually seen. "No error on screen" is not evidence, since failure is silent by design.
  - First Paint is measured by story 6.4's P1 procedure and recorded beside the M2 figure, with the machine it ran on.
  - The chart (including on a phone), the Colophon and the link preview are checked.
- **Carried from the Epic 7 retro:**
  - **8.1:** decide whether realism's frame path is also held to "allocates nothing per frame": the draw literal and subject closure in `realism-mount.tsx`, and `mapFromWorld` in `fill-layer.ts`.
  - **8.3:** list beside NFR-2, as "not yet run":
    - the depth bias on integrated graphics, phones and depth buffers below 24 bits
    - Firefox and Safari, including `imageOrientation: 'flipY'`
    - 60 Hz displays
    - three's program-info-log warning on other drivers
  - **8.4:** the spec adds a Rail pose at p=2.8333 and a checklist:
    - a farther fill over a nearer glow
    - half-disc Planets
    - the Star's dark ring
    - the fill-tilt axis wording
    - Jupiter worn by no Planet
    - the band between the plate and the keyboard outline
    - overlapping rest glows
  - **Before 8.5 merges:**
    - one follow-up code review over 7.4–7.8 (`007106e^..a36eef7`)
    - the depth-margin check, settled by a check under `scripts/` or an accepted ruling
    - the three 2026-11-16 rulings recorded in `deferred-work.md` and their ACs annotated
  - **8.5's live-site driver** is a seventh Chrome driver. Consider extracting one shared driver module first.
