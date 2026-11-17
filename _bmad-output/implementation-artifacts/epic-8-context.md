# Epic 8 Context: M3 Goes Live, Credited and Honest

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Ship M3, the realism layer built in Epic 7, to the live site, and be honest about it. The Colophon tells the visitor that a Planet's appearance is assigned and encodes nothing, and credits every map. A record says exactly what M3 has and has not proven: the 30fps framerate target is **not yet passed**, because no target-profile machine exists. The one shipped frame monitor now keeps its worst window, so a single future run on such a machine can settle the question with no new instrument. Since the framerate gate can't run, Thomas's own on-screen judgement is what lets M3 ship. Then `m3-realism` merges to `main`, which publishes. The epic matters because a green CI must never be read as a framerate pass, and colour must never be read as data.

## Stories

- Story 8.1: The worst window, on the visitor's own timeline (done)
- Story 8.2: The Colophon credits the maps (done)
- Story 8.3: The record says "not yet passed"
- Story 8.4: Thomas's on-screen judgement
- Story 8.5: M3 reaches the live site

## Requirements & Constraints

- **Framerate target, recorded, not passed.** The target is 30fps at 1080p on the target profile: a roughly three-year-old corporate laptop with integrated graphics. It is never Apple silicon and never the dev machine. It is measured as the mean over five-second windows across one complete forward-and-back scroll of the Rails, and every window must hold 30fps. Only a run on a target-profile machine can change "not yet passed". No proxy exists, and no other hardware counts.
- **The floor is unchanged.** The Fallback is still offered below 24fps sustained over a five-second mean. The 24–30fps band is accepted as degraded, but it is not a pass. Target and floor are read by one instrument.
- **No backend, no analytics, ever.** There is no server, API or CMS, and nothing is sent anywhere. The Forward (the primary success signal) stays anecdotal by design. Instrumenting it is refused.
- **No disclaimer on any surface.** No "work in progress" note, badge or apology. "Not yet passed" and its equivalents appear only in the record, and no surface claims a framerate.
- **Untouched visitors.** The phone and Fallback chart and the link preview do not change. Neither reading surface requests a map or the `realism` chunk. First Paint stays schematic.
- **Copy places are closed.** The appearance statement and credits live in the Colophon's existing copy place; there is no new place.

## Technical Decisions

- **The instrument (built in 8.1).** `shell/chart-offer.ts` stays the only monitor: pure, import-free, no DOM, latch unchanged. It tracks its worst *full* window past the latch; no window spans a reset, gap or tab return, and gaps are counted.
  - A sink bound outside the monitor writes one performance mark named `scene-worst-window`, re-marked on every new worst and every gap, with detail `{ fps, frames, seconds, gaps }` (`fps` is null with no full window). The sink follows `first-frame-mark.tsx`'s pattern, and any new importer of the monitor is the one named change to `chart-offer.test.ts`'s importer table. A target run reads `performance.getEntriesByName('scene-worst-window')`.
  - The worst window covers the page's whole life past warm-up, not only the Rail scroll. So a pass read from it is conservative, but a failure may come from outside the scroll. 8.3's protocol must therefore require a fresh load and no tab switch, and must give reading rules for a non-zero gap count.
  - Decided in 8.1 and open for Thomas to overturn: only the sampler is held to "allocates nothing per frame". Realism's frame path (the draw literal and subject closure in `realism-mount.tsx`, and `mapFromWorld` in `fill-layer.ts`) is not. A target run is the evidence that would overturn this.
- **No adaptive quality.** No `PerformanceMonitor`, no adaptive DPR and no quality tier; `dpr` stays `[1, 2]`.
- **Budgets** live in the import-free `src/render-scene/realism/budgets.ts`. They change only by a ruling recorded in the memlog. A check with nothing to measure fails. Measured values as of 8.2:

  | Budget | Limit (measured) |
  | --- | --- |
  | `realism` chunk | 24,000 B (8,560) |
  | `scene` chunk | 960,000 B (953,039 as the bundle assertion counts it at 8.3, so headroom is about 6,961 B; Vite's display of the emitted file reads about 949.86 kB) |
  | Entry chunk | 4,000 B (3,278 at 8.1) |
  | Texture library | 12 maps, each at most 1024×512 WebP, 4 MB in total |
  | Sphere geometry | one shared geometry, at most 64×32 segments |
  | Added draw calls | 1 per Planet, 2 per Star, 0 for Dust |
  | Full-screen passes, render targets, shadow maps, scene lights | 0 |
  | New runtime dependencies | 0 |

- **Map library.** `src/derive/map-library.ts` is the single owner of each map's id, source URL, licence, credit, retrieval date and mean luminance. A map is admitted only if NASA or USGS published it, its page shows no third-party copyright, and it has a recorded credit line. The portfolio counts as informational use under NASA's guidelines, so the credits must acknowledge NASA. Jupiter's "NASA/JPL/Space Science Institute" credit stands and is credited as given.
- **Colophon data path (built in 8.2).** The Colophon requests the solver chunk (`src/derive/live.ts`, which re-exports the library) **on mount**, through the one shared dynamic import. The live re-solve press uses the same import. The old rule that the solver chunk is "requested on the press, never before" no longer holds. There is no third fetch. The colophon chunk holds `src/colophon/` alone, and the entry and scene chunks gain nothing. No URL is written in `colophon/`. Every map is listed, worn or not, because every committed file is publicly served. `EXHIBIT_PATHS` stays two, the derivation table stays three rows, and `solveLive` stays byte-identical to the committed artifact.
- **Deployment.** The site is static on GitHub Pages at `https://thomasnavarro38.github.io/cosmos-portfolio/` (base `/cosmos-portfolio/`). `.github/workflows/deploy.yml` deploys it on merge to `main`. Production is the only environment. Rollback means redeploying the previous commit and recording the failure.
- **The record** lives in `_bmad-output/implementation-artifacts/` and states:
  - NFR-2 is not yet passed.
  - Each budget's limit and its measured value, labelled as a budget and a starting value, never as a framerate.
  - The target-run protocol: a target-profile machine, 1080p, a fresh load, one full forward-and-back Rail scroll, with the worst-window entry read together with the gap count.
  - The pass condition.

## UX & Interaction Patterns

- **Colophon copy as ruled by Thomas (2026-11-16) and shipped.** These strings are verbatim in the page, in EXPERIENCE.md copy place 4 and in the identity audit:
  - Heading: `what a Planet looks like`.
  - Statement: A Planet's surface is not data. It is assigned one of the maps from its ID alone, so colour and texture encode nothing. Recency is the outline's brightness, the subject is the white stroke, and Deep or Shallow is the Ring and the Moon.
  - Lead-in: `Every map this site serves, worn or not:`.
  - Entries: one per library map, in library order, as `<id>.webp: <credit>, <licence>.`, each with a `source` link to the map's source page.
  - The absences thesis now says layout.generated.json is solved from career.json "and from the map list below". The data line now reads "all the career data there is".
- The Colophon stays a conventional document: headings in order, achromatic, contrast floor kept, full screen-reader parity, and it works from both the scene and the Fallback.
- Colour encodes nothing on any surface.

## Cross-Story Dependencies

- **Delivery.** The epic continues on `m3-realism`. Only 8.5 reaches `main`.
- **Human gates.**
  - 8.4: the agent prepares a production build and the record, then stops. It never records a verdict.
  - 8.5: merging publishes, so it needs Thomas's explicit go-ahead.
- **8.3 → 8.4 → 8.5.**
  - 8.4 needs Epic 7 and 8.1–8.3 done. Its verdict goes into 8.3's record with the date, machine, browser, commit, poses, the verdict in Thomas's words, and screenshots stored beside the record. It must say the machine is not the target profile.
  - 8.5 needs a passing 8.4 verdict for the exact build being merged, plus green `npm test` (any skip named), `tsc` and `npm run build`.
  - When 8.5 closes, it names the live commit in the record, which still reads "not yet passed".
- **A failed judgement** goes back to Epic 7's tunable values, inside the budgets: map choice, ambient floor, glow and fade values, spin rates. Moving line-work, changing Focus framing, adding a post pass or changing a budget needs a new memlog ruling.
- **8.5's live check:**
  - On a real browser, every map and the `realism` chunk return 200 under the base path, and the fade is actually seen. "No error on screen" is not evidence.
  - First Paint is measured by story 6.4's P1 procedure and recorded beside the M2 figure, with its machine.
  - The chart (including on a phone), the Colophon and the preview are checked.
  - `/colophon/`'s requests are re-recorded, since it now loads the solver chunk on open.
- **Carried items:**
  - **8.3** lists beside NFR-2, as never run:
    - the depth bias on integrated graphics, phones and depth buffers below 24 bits
    - Firefox and Safari, including `imageOrientation: 'flipY'`
    - 60 Hz displays
    - three's program-info-log warning on other drivers
  - **8.4's spec** adds a Rail pose at p=2.8333 and a checklist of the Epic 7 looks routed to it:
    - a farther fill over a nearer glow
    - half-disc Planets
    - the Star's dark ring
    - the fill-tilt axis wording
    - Jupiter worn by no Planet
    - the band between the plate and the keyboard outline
    - overlapping rest glows
  - **Before 8.5 merges:**
    - the follow-up code review over 7.4–7.8 (`007106e^..a36eef7`)
    - follow-up reviews for 8.1 and 8.2, which were both recommended
    - the depth-margin check, settled by a `scripts/` check or an accepted ruling
    - the 2026-11-16 rulings recorded in `deferred-work.md`, with their ACs annotated
  - **Open from 8.2's review:** a failed solver import on open stays cached, which disables "solve it again" until reload. This is deferred at medium severity.
  - **8.5's live-site driver** would be a seventh Chrome driver. Consider extracting a shared driver module first.
