# The NFR-2 record (story 8.3)

What M3 has and has not proven about its framerate.

`scripts/nfr-2-record.test.ts` guards this record's limits, labels and protocol wording against the code: every limit against `budgets.ts` and `ENTRY_BUDGET_BYTES`, the mark's name against `worst-window.ts`, and the floor and gap threshold against `chart-offer.ts`. A change to any of them fails `npm test` until this record follows. The guard does not re-check the measured values. They are this run's starting values, recorded once. What enforces the real limits is the bundle assertion and `check-maps`, on every build.

## Status

**NFR-2: not yet passed.** Only a run on a machine matching NFR-4's target profile may change it. No other hardware counts: not the dev machine (the RTX 4080 SUPER), and not any Apple silicon machine, however either scores. No proxy exists: not a green CI, not the budgets below, not a throttled browser, not a run on other hardware scaled by any factor.

NFR-2 is 30fps at 1080p on NFR-4's target profile, a laptop about three years old with integrated graphics, the corporate work-laptop profile of the actual audience. It must hold in every five-second window across one complete forward-and-back scroll of the Rails.

A budget is never a pass (AD-23). The budgets below cap what M3 may cost. They say nothing about the rate a target-profile machine draws it at.

## Run

- **Date:** 2026-11-17.
- **Machine:** the dev machine (Windows 11 Pro 10.0.26200, Node 24.13.0, the RTX 4080 SUPER). It is not the target profile, and nothing measured on it bears on NFR-2.
- **Commit:** `c441eeceb8d50bdec5fd04b3351634fd1e73a082` (`git rev-parse HEAD`), plus this story's files. They are test-only and this record, and change no shipped module, so the figures are the commit's own.
- **How measured:** `npm run build` (the entry, `realism` and `scene` bytes, from the bundle assertion, as it prints "scene is N of M bytes"), `node scripts/check-maps.ts` (the maps), `node scripts/check-pins.ts` (the runtime dependencies), `fillPlans` and `starPlans` over `generated/layout.generated.json` (the draws), and `src/render-scene/realism/done.test.ts`'s scan (the passes, targets, shadows, lights).

## Budgets

Every limit is a budget. Every measured value is a starting value: where M3 stands at this commit, recorded so a later change can be read against it. Neither is a framerate.

The chunk figures are the bundle assertion's bytes: minified, as emitted, counted as `scripts/bundle-assertion.ts` says. They are not gzip or transfer sizes, and not Vite's kB display, which shows the scene file at about 949.85 kB. The map bytes are the files' sizes on disk, as `check-maps` sums them.

| Budget | Constant | Limit | Measured at this commit | Reading |
| --- | --- | --- | --- | --- |
| Map count | `MAP_COUNT_BUDGET` | 12 maps | 4 maps (moon, mars, io, jupiter) | A budget; 4 is the starting value. |
| Map width | `MAP_WIDTH_BUDGET` | 1024 px | 1024 px, every map | A budget; 1024 is the starting value. |
| Map height | `MAP_HEIGHT_BUDGET` | 512 px | 512 px, every map | A budget; 512 is the starting value. |
| Map bytes, in total | `MAP_TOTAL_BYTES_BUDGET` | 4,000,000 B | 196,450 B | A budget; 196,450 is the starting value. |
| `realism` chunk | `REALISM_CHUNK_BYTES_BUDGET` | 25,000 B | 8,560 B | A budget; 8,560 is the starting value. |
| `scene` chunk | `SCENE_CHUNK_BYTES_BUDGET` | 960,000 B | 953,039 B (6,961 of headroom) | A budget; 953,039 is the starting value. |
| Sphere width segments | `SPHERE_WIDTH_SEGMENTS_BUDGET` | 64 | 64 (`FILL_SPHERE_WIDTH_SEGMENTS`), one shared geometry | A budget; 64 is the starting value. |
| Sphere height segments | `SPHERE_HEIGHT_SEGMENTS_BUDGET` | 32 | 32 (`FILL_SPHERE_HEIGHT_SEGMENTS`), one shared geometry | A budget; 32 is the starting value. |
| Added draws per Planet | `PLANET_DRAWS_BUDGET` | 1 per Planet | 1 per Planet; 8 Planets, 8 draws | A budget; 1 is the starting value. |
| Added draws per Star | `STAR_DRAWS_BUDGET` | 2 per Star | 2 per Star; 6 Stars, 12 draws | A budget; 2 is the starting value. |
| Added draws for all belts (9.6) | `BELT_DRAWS_BUDGET` | 1 for all belts | none at this commit, which has no belt; 9.6 (2026-11-19) counts 1, one merged single-pass mesh, recorded in the note below | A budget; 1 is the starting value. |
| Added draws for the Rail's nebula (9.7) | `NEBULA_DRAWS_BUDGET` | 1 for the nebula | none at this commit, which has no nebula; 9.7 (2026-11-19) counts 1, one single-pass ribbon mesh, recorded in the note below | A budget; 1 is the starting value. |
| Added draws per Deep Project (9.8) | `DEEP_PROJECT_DRAWS_BUDGET` | 2 per Deep Project | none at this commit, which has no ring disc or moon sphere; 9.8 (2026-11-20) counts 2 per Deep Project (the disc and the moon, each single-pass), 1 Deep Project, 2 draws, recorded in the note below | A budget; 2 is the starting value. |
| Added draws for Dust | `DUST_DRAWS_BUDGET` | 0 | 0 | A budget; 0 is the starting value. |
| Entry chunk (M2) | `ENTRY_BUDGET_BYTES` | 4,000 B | 3,278 B | M2's budget, unchanged; 3,278 is the starting value. |
| Full-screen passes, render targets, shadow maps, scene lights | (none: held by `done.test.ts`'s scan) | 0 of each | 0 of each | A budget; 0 is the starting value. |
| New runtime dependencies | (none: held by `check-pins.ts`'s closed list, M2's) | 0 | 0 (7 dependencies, M2's list) | A budget; 0 is the starting value. |

In all, the realism layer adds 20 draws over the committed artifact (8 × 1 + 6 × 2). Every value is within its budget. *[9.6, 2026-11-19: the sentence above is 8.3's, kept as history; it measured the commit this record names. At the 9.6 working tree the layer adds 21 draws (8 × 1 + 6 × 2 + 1, the belts' one merged, single-pass draw), and the chunks measure `realism` 14,665 B and `scene` 957,602 B (2,398 B of headroom), within their budgets. The table's measured column stays 8.3's.]* *[9.7, 2026-11-19: at the 9.7 working tree the layer adds 22 draws (8 × 1 + 6 × 2 + 1 + 1, the belts' one merged draw and the Rail's nebula ribbon, one single-pass draw, counted because the drawn Rail has 121 points), and the chunks measure `realism` 19,593 B and `scene` 957,756 B (2,244 B of headroom), within their budgets. The table's measured column stays 8.3's.]* *[9.8, 2026-11-20: at the 9.8 working tree the layer adds 24 draws (8 × 1 + 6 × 2 + 1 + 1 + 2, a Deep Project's ring disc and moon sphere, one single-pass draw each, for the committed artifact's one Deep Project), and the chunks measure `realism` 23,437 B (563 B of headroom) and `scene` 957,915 B (2,085 B of headroom), within their budgets. The table's measured column stays 8.3's.]* *[2026-11-22, the belt's soft junction with its Planet: Thomas ruled the `realism` budget up from 24,000 B to 25,000 B (the limit was 24,000 B until that ruling, including when 8.3 measured this commit), so a belt can fade out before its Planet's sphere and fill disc instead of being cut straight across by the fill's flat depth. The layer still adds 24 draws, the belts still one. At that working tree the chunks measure `realism` 24,786 B (214 B of headroom) and `scene` 957,958 B (2,042 B of headroom), within their budgets. The table's measured column stays 8.3's.]*

## Target-run protocol

The protocol for the one run that can change the status. The instrument is already shipped (8.1): the frame monitor in `shell/chart-offer.ts` keeps its worst full window, and a sink writes it to one performance mark. No new instrument is needed, and none may be substituted.

### The machine

- A machine matching NFR-4's target profile: a laptop about three years old, with integrated graphics. Not Apple silicon, and not the dev machine.
- The display at 1080p (1920×1080), the browser window maximised, at 100% zoom, on mains power.
- The browser the machine has (Chrome or Edge), with no extension that draws on or injects into the page.
- Corporate security software that cannot be removed is part of the target profile. The run stays valid with it. Record any origin it injects beside the result, as 7.10 did.
- The live site, or a production build (`npm run build`, then `npm run preview`) of the commit being judged. Never the dev server.

### Before the run

Record, beside the result:

- `chrome://gpu` (or `edge://gpu`): WebGL and WebGL2 show hardware accelerated. A software renderer is not the target profile's GPU, and the run is void.
- The display's refresh rate. The browser paints at most once per refresh, so the reading can never exceed it.
- `window.devicePixelRatio`, the OS display scaling, and the canvas's drawing-buffer size once the scene is up. R3F's `dpr` of `[1, 2]` follows `devicePixelRatio`, so these fix how many pixels the run drew.

### The steps

1. Open a new tab and open DevTools (the Console) in it, undocked (a separate window, so the viewport keeps its 1920×1080), and keep it open for the whole run, so reading the mark adds no stall. Then, in that tab, make a fresh load of the site's root under its base, `/cosmos-portfolio/` (`https://thomasnavarro38.github.io/cosmos-portfolio/` live, `http://localhost:4173/cosmos-portfolio/` on `npm run preview`). A reload of a tab that was already open does not count, nor does a load followed by any earlier interaction.
2. Wait, without input, until the realism fade has finished and the Planets' fills and the Stars' glows are fully up.
3. From then on, give no input except the scroll. No click, no key, no hover over the chrome, no resize.
4. Scroll the Rails once, completely forward to their end and completely back to their start: one complete forward-and-back scroll, at a steady reading pace.
5. Do not switch tab or window, let the machine sleep or lock, open a dialog, attach a debugger, or open DevTools mid-run, at any point from step 1 to step 6. A gap created by opening DevTools mid-run makes the run void.
6. Straight after the return, in the Console already open, read `performance.getEntriesByName('scene-worst-window')`. Record the one entry's `detail`: `fps`, `frames`, `seconds` and `gaps`. Record also the date, the machine (model, CPU, GPU, RAM), the browser and its version, and the commit.

If the chart offer appears during the run (the `the chart` link raised: the floor latched), do not click it. Finish the scroll, read the mark, and record that the offer appeared. The run is below the floor.

### Reading the mark

- The list holds at most one entry: each write clears the mark and marks it again. Its `detail.fps` is the worst full five-second window's rate, `frames / seconds`, over the page's whole life past warm-up, the fade and the scroll alike. So a pass read from it is conservative, and a failure may come from outside the scroll: hence steps 1 to 5.
- An empty list means no full window was ever completed and no gap ever occurred. It is not a pass: there is nothing to read. Repeat the run.
- The windows slide. Once five seconds of frame time are full, the window is re-evaluated at every frame, so every five-second span within an unbroken run of frames is a candidate. After every reset (the host's mount, a tab return, the realism upload's start and its first visible frame) and every gap, the first 2 s are warm-up and discarded, and the window starts empty. A run of frames shorter than five seconds between gaps or resets is never measured. That is why any gap is not a pass.
- `fps` is null when there is no full window yet. It is not a pass.
- `gaps` is the page-life count of gaps. A reset never clears it. So a stall during the load or during the realism upload counts too, and under the gap rule makes the run not a pass. Changing that needs a ruling recorded in the memlog.

### The gap rule

A gap is a frame delta above `MAX_FRAME_SECONDS`, 1 s. The monitor resets on a gap instead of windowing it, so a gap never enters a window, and the worst window is blind to exactly the stall that most clearly breaks 30fps. Therefore any `gaps > 0` means the run is not a pass, whatever `fps` reads.

- If the gap was caused by something the protocol forbids (a tab switch, sleep, a debugger, a dialog), the run is void. Discard it and repeat it from a fresh load in a new tab.
- Otherwise the stall is the scene's own, and the run fails.

### Pass condition

The run passes NFR-2 when, and only when, all three hold:

- `fps` is not null;
- `gaps === 0`;
- `fps >= 30`, so every full window held 30fps.

With `fps` not null and `gaps === 0`, the bands below 30 are (a run with any gap is not a pass and falls under the gap rule, whatever `fps` reads):

- `fps >= 24` (`FALLBACK_FLOOR_FPS`): accepted degraded, not a pass. The status stays "not yet passed".
- Below 24: below the floor, a fail. The Fallback is offered at that rate, so the scene has missed both the target and the floor.

A pass changes the status line above, with the run recorded here beside it. Nothing else does.

## Never run

None of these has been run beyond the dev machine and Chrome, and none on the target profile. Each is listed beside NFR-2 so its absence is on the record, not mistaken for a pass (Epic 7 retro item 54).

- The depth bias (`FILL_CLIP_OFFSET`, 1e-6) on integrated GPUs, on phones, and on depth buffers below 24 bits. Only the dev machine has run it.
- Firefox and Safari, including the maps' upload with `imageOrientation: 'flipY'`. No run has been made in either; only Chrome has drawn the scene.
- 60 Hz displays. No run has been made on one, so no run has been bound to a 60 Hz refresh.
- three's program-info-log warning on other drivers. Only the dev machine's driver has been observed.

## On-screen judgement (8.4)

The framerate gate cannot run, so M3 ships on Thomas's own judgement of the realism layer on a real display. This section is the sheet for it: the build to judge, the poses to judge it at, the looks Epic 7 routed here (Epic 7 retro F4, item 53), the route back if a pose is rejected, and the fields for the verdict. The agent that prepared it wrote no verdict and judged no look.

The machine the judgement is made on is not the target profile, so nothing about framerate follows from it, whatever it shows. The status stays "not yet passed" after any verdict, pass or reject.

### The build

- **Build commit:** `2adeaa5c20f9602250f5aed4c251b0927a301457` (`git rev-parse HEAD` at preparation, 2026-11-17). Story 8.4's own commit adds only `scripts/nfr-2-record.test.ts`, this record, its spec (`spec-8-4-thomas-s-on-screen-judgement.md`) and the sprint status, and changes no shipped module, so a build of it is this build.
- **Emitted by `npm run build`** (in `dist/assets/`): the entry `index-ClN-7EAw.js`, `scene-BK7T607y.js` and `realism-TxJryhhe.js`. The names are content hashes of the JavaScript alone. A build that emits other names is not the judged build, and the judgement does not carry over to it. The same three names are necessary, not sufficient: they say nothing of the stylesheets or the maps, so 8.5 also checks the build commit. The bundle assertion read the entry at 3,278 of 4,000 bytes, `realism` at 8,560 of 24,000 and `scene` at 953,039 of 960,000, all within budget.
- **Serve:** `npm run build`, then `npm run preview`, then open `http://localhost:4173/cosmos-portfolio/`. Never the dev server.

### The poses

At each pose Thomas judges two things (AC 8.4-1): whether the layer reads as realistic, not a screensaver, and label contrast, whether every label still reads against what realism draws behind it.

Each pose was reached by its steps on this build at 1920×1080 (the dev machine, Chrome 157.0.8103.79, a fresh profile), by real key and mouse input over the DevTools protocol, except `rail(p=2.8333)`, whose one wheel event is dispatched from the Console, as its steps say. Coordinates are for a 1920×1080 viewport; at another size the Bodies keep their places in the frame, not their pixels.

| Pose | Steps | What it shows |
| --- | --- | --- |
| `opening frame` | Open a new tab and load the URL above (a fresh load). Give no input for about 9 s, until the realism fade has finished. `history.state` reads `null`. | The whole field from keyframe 0: all six Stars and eight Planets, small, at rest. |
| `Client stop` (stop 1) | From the opening frame, press ArrowDown once and wait about 5 s. `history.state.scrollProgress` reads `1`. If the arrow does nothing, the page lacks keyboard focus: click an empty corner once (an empty click does nothing in the scene), then press it. | Stop 1's Client, Decathlon (`client:decathlon`, `buildRail(...).keyframes[1].subject`): its Star lit as the subject at the centre, its one Planet to the right. |
| `Focus` | From Client stop 1, click the Planet to the right of Decathlon's Star, at about (1651, 540): Store labelling generation (`project:decathlon/store-labelling-generation`, the moon map). Wait about 6 s. The panel opens titled "Store labelling generation". Escape releases it, back to Client stop 1 with the path unchanged. | The Planet's fill at its largest, its Motes and labels, and the panel. |
| `rail(p=2.8333)` | A fresh load in a new tab; wait about 9 s for the fade. Open DevTools undocked (a separate window, so the viewport keeps its size) and run in the Console: `document.querySelector('.scene-host').dispatchEvent(new WheelEvent('wheel', { deltaY: 2266.64, bubbles: true, cancelable: true }))`. That is 2.8333 × `WHEEL_PIXELS_PER_STOP` (800): one event through the shipped wheel path, so the store moves with the camera. After about 1 s, `history.state.scrollProgress` reads `2.8333`. Close DevTools before judging the pose or taking its screenshot; the pose stays where the wheel left it. | Between stops 2 and 3, near SNCF Connect & Tech: the worst pose 7.7 measured for a farther fill over a nearer glow. |

**The landing, confirmed on this build:** the wheel event was taken (`defaultPrevented` true), and `history.state.scrollProgress` read `null` at 250 ms (the router's trailing save not yet written), then `2.8333` at 0.5 s, 1 s, 2 s, 4 s and 8 s. A reload cannot carry the pose: the router restores a saved position only at creation or on a route-changing pop, and `pagehide` saves the store's own value first.

The captures made while confirming the poses are not the judgement's screenshots, and are not stored here.

### The checklist

Each look is judged at the poses named, on Thomas's display. The evidence is the entry in `deferred-work.md` that routed it here. "Levers" names what a rejection may change by AC 8.4-3 (below); a lever outside Epic 7's tunable values is marked as needing a ruling.

| Look | Where to look | Evidence | Levers if rejected | Thomas's call |
| --- | --- | --- | --- | --- |
| A farther fill over a nearer glow | `rail(p=2.8333)`, lower left: inside the glow of SNCF Connect & Tech (the large Star left of centre), SNCF's Star and its Planet Client referential (the mars map) are farther and draw over the glow. | `deferred-work.md:1355`: 549 pixels at this pose (462 under SNCF's fill, 87 under Client referential's), 0 at every stop and Focus; the draw order stands by AD-19. Screenshot `realism-glow-7-7-overlap-worst.png` (its strokes are keyframe 0's, not this pose's). | Glow values (`GLOW_SUBJECT_PEAK`, `GLOW_REST_PEAK`, `GLOW_RADIUS_RATIO`) or the map choice. Reversing the draw order needs a ruling. | |
| Half-disc Planets | Every pose; largest at `Focus`, where Store labelling generation is lit on one half with a straight terminator. | `deferred-work.md:1430`: the light's in-plane share is 0.995 or 1 at every stop and Focus (`realism-fills-7-6.md`, Lit by its own Star). | The ambient floor (`realism-ambient-floor-dark`), which lifts the night side; the map choice. Moving the light is not a tunable value and needs a ruling. | |
| The Star's dark ring | The Stars at rest: at `rail(p=2.8333)` SNCF (lower left) and Air France-KLM (right of centre), and the opening frame's six. The stroke-rest outline and the core dot read dark on a fill near its ceiling. | `deferred-work.md:1454-1456`, `realism-glow-7-7-overlap-worst.png`; 7.9 passed it on unchanged. | Glow values: the Star fill's rest ceiling and `GLOW_REST_PEAK`. The outline and the dot are line-work: moving them needs a ruling. | |
| The fill-tilt axis wording | `Focus`: the map's features and terminator against the screen's horizontal. The fill tilts about world x, while `src/derive/appearance.ts:18` documents tilt as about the Billboard's horizontal; the two differ with the camera's heading. | `deferred-work.md:1408`; `mapFromWorld` in `src/render-scene/realism/fill-model.ts`. | The spin rates. The tilt values (`TILT_MIN`, `TILT_MAX`) are not among Epic 7's tunable values: changing them needs a ruling, as does changing the axis itself. Correcting the wording changes a comment, not the look. | |
| Jupiter worn by no Planet | No pose shows it. The Colophon (`/colophon/`) lists `jupiter.webp` with its credit, and the build requests only `io.webp`, `mars.webp` and `moon.webp` (checked on this build). | `deferred-work.md:1375`: moon 5, io 2, mars 1, jupiter 0, in `generated/layout.generated.json`. | The map choice: the library (`src/derive/map-library.ts`) or the salt in `src/derive/appearance.ts`. AD-21 forbids a per-Body override. | |
| The band between the plate and the keyboard outline | `Client stop`, by keyboard: reach Client stop 1 by its steps above, then press Tab until the index entry "Store labelling generation" shows bottom-left. With no click on the way, that is three Tabs (overview, Decathlon, Store labelling generation); if the empty click was needed, the count may differ, so Tab until the entry shows. The affordance rises on the Planet with its surface-base plate and the keyboard outline 3 px off it; look at the band of scene between the two. | `deferred-work.md:1564` (`realism-labels-7-9.md`, After the ruling); `affordance-model.ts:70-73`. | Glow values, for what shows through the band. The outline and its offset are line-work: moving them needs a ruling. | |
| Overlapping rest glows | Where two Stars' rest glows meet: the opening frame's central cluster, and along the Rail. | `deferred-work.md:1498-1500`: at most two overlap on the committed layout, 0.4536 against the ceiling 0.47119; nothing in the code limits how many may. | `GLOW_REST_PEAK`, lowered (a glow value). A layout check in `scripts/` would guard a re-solve but changes no look. | |

### If a pose is rejected

The change goes to Epic 7's tunable values, inside AD-23's budgets: the map choice, the ambient floor, the glow and fade values, and the spin rates. Then the build is made again and the judgement is taken again, at every pose, against the new build commit and chunk names written here.

Moving line-work, changing Focus framing, adding a post pass or changing a budget needs a new ruling recorded in the memlog (spine, Deferred) before it is made.

### The verdict

Thomas writes these. Each field stays on its own line, its value after the label. A verdict is given by replacing `Not yet given.`; from then on `npm test` requires the date (as `YYYY-MM-DD`), the machine and the browser written, the Commit field holding the judged build's full 40-hex commit, the Poses field written, and the Screenshots field naming at least one screenshot, each stored beside this record as `judgement-8-4-<pose>.png`: `judgement-8-4-opening-frame.png`, `judgement-8-4-client-stop.png`, `judgement-8-4-focus.png`, `judgement-8-4-rail-2.8333.png`, and `judgement-8-4-keyboard-band.png` for the band. If another build is judged, its commit and chunk names replace those under The build too. The machine is named with its model, CPU, GPU and display, and is not the target profile.

- **Date:** 2026-11-17.
- **Machine:** Intel(R) Core(TM) i9-14900KF (3.20 GHz), NVIDIA GeForce RTX 4080 SUPER (16 Go), display Samsung Odyssey Ark 55; not the target profile.
- **Browser:** Chrome 157.0.8103.79.
- **Commit:** `2adeaa5c20f9602250f5aed4c251b0927a301457`, the build above (its three chunk names emitted as listed).
- **Poses:** the four above: `opening frame`, `Client stop` (stop 1, Decathlon), `Focus` (Store labelling generation), `rail(p=2.8333)`; and the keyboard band from Client stop 1.
- **Verdict:** Rejected. "The strokes look off (the rail track, planets and satelites orbits). The stars don't look real, the stroke around and the circle inside looks weird. The stars colors should change, it's always the same and doesn't feel real."
- **Screenshots:** `judgement-8-4-opening-frame.png`, `judgement-8-4-client-stop.png`, `judgement-8-4-focus.png`, `judgement-8-4-rail-2.8333.png`, `judgement-8-4-keyboard-band.png`.

## Second judgement (9.11)

Thomas rejected M3 at 8.4 (its verdict above stands as written). Epic 9 replaced the line-work with physical objects, and M3 reaches `main` (8.5) only on a passing judgement of that scene. This section is the sheet for it. It holds the build to judge, the five poses to judge it at, each at 1920×1080 and on the Odyssey Ark, and the looks routed here: 8.4's seven, re-sorted by the 2026-11-17 proposal, and the artefacts 9.6 to 9.10 left to this judgement. It also holds the route back if a pose is rejected, and the fields for the verdict. The agent that prepared it wrote no verdict and judged no look (AC 9.11-1).

The machine the judgement is made on is not the target profile, so nothing about framerate follows from it, whatever it shows. NFR-2 stays **not yet passed** after any verdict, pass or reject.

### The build

- **Build commit:** `e73313eb78e1db00ce80b7cfdb7084f9072877f0` (`git rev-parse HEAD` at preparation, 2026-11-26). Story 9.11's own commit adds only `scripts/nfr-2-record.test.ts`, this record, its spec (`spec-9-11-the-second-judgement.md`) and the sprint status. It changes no shipped module, so a build of it is this build.
- **Emitted by `npm run build`** (in `dist/assets/`): the entry `index-LIDA_8Wh.js`, `scene-Cx1RF68j.js` and `realism-CrU47Alr.js`. The names are content hashes of the JavaScript alone. A build that emits other names is not the judged build, and the judgement does not carry over to it. The same three names are necessary, not sufficient: they say nothing of the stylesheets or the maps, so 8.5 also checks the build commit. The bundle assertion read the entry at 3,278 of 4,000 bytes, `realism` at 24,786 of 25,000 and `scene` at 958,632 of 960,000, all within budget and unchanged from 9.10.
- **Serve:** `npm run build`, then `npm run preview`, then open `http://localhost:4173/cosmos-portfolio/`. Never the dev server.
- **Before judging, confirm the build:** after `npm run build`, compare the three names in `dist/assets/` with those above. At a later HEAD, also check `git diff --stat e73313eb78e1db00ce80b7cfdb7084f9072877f0 -- src public index.html` is empty, or check out the build commit first. If either differs, the build is another one: its commit and chunk names replace those above before it is judged.

### The poses

At each pose Thomas judges two things (AC 8.4-1, carried): whether the scene reads as realistic, not a screensaver, and label contrast, whether every label still reads against what realism draws behind it. Since 8.4's verdict, the second question also covers whether the Stars read as stars and whether the line-work still reads as a schematic laid over them.

**Every pose is judged at both displays:** a 1920×1080 display, and the Odyssey Ark (3840×1080, 32:9), each with the browser maximised at 100% zoom. The Bodies keep their places in the frame, not their pixels, so where a step gives coordinates, it gives them for each display.

**Judge with the OS's reduce-motion setting off**, as the poses were confirmed. Under reduced motion the crossfade and the Star's rise run shorter and the Star's pulse and granulation hold still (`arrival-model.ts`, `star-model.ts`), so the crossfade, rise and Star looks are not the ones routed here.

**Keep the pointer off the scene while judging and taking a screenshot:** over the empty corner clicked, or outside the window. A pointer resting over a Body raises its hover affordance, and it is re-picked as the camera moves under a still pointer (`affordance-field.tsx`), so it changes what the pose shows.

Each pose was reached by its steps on this build, at a 1920×1080 viewport and at a 3840×1080 viewport (the Ark's 32:9, set by `Emulation.setDeviceMetricsOverride`). The check ran on the dev machine, in Chrome 159.0.8154.34 with a fresh profile and hardware WebGL (ANGLE, D3D11). Keys and clicks were real input over the DevTools protocol. The two wheel poses' one event is dispatched from the Console, as their steps say. The Ark was emulated by that 3840×1080 viewport on the dev machine. Nothing was checked on the real panel.

**Coordinates, centres and radii are for those viewports**, at `devicePixelRatio` 1 (100% browser zoom, 100% OS scaling). A maximised window on a real display has a smaller viewport, since the browser's tabs and toolbar take part of the height. At another scaling the CSS pixels differ again. So the fallback coordinates and the sizes shift on Thomas's displays: find the Planet by its place in the frame, not by its pixels. The Displays field names each display's `devicePixelRatio` and OS scaling.

| Pose | Steps | What it shows |
| --- | --- | --- |
| `opening frame` | Open a new tab and load the URL above (a fresh load). Give no input for about 9 s, until the crossfade has finished. `history.state` reads `null`. | The whole field from keyframe 0, small and central at both displays: six Stars with their names (SIMSU, Transilien, SNCF, SNCF Connect & Tech, Air France-KLM, Decathlon), each in its tint, their Planets, and the nebula along the Rail between them. On the Ark this opening field projects to the same pixel sizes, shifted to the wider frame's centre, so the void widens on both sides. At the other poses the Bodies draw somewhat larger on the Ark than at 1920×1080, as their rows give. |
| `Client stop` (stop 1) | From the opening frame, press ArrowDown once and wait about 5 s. `history.state.scrollProgress` reads `1`. If the arrow does nothing, the page lacks keyboard focus: click an empty corner once (an empty click does nothing in the scene), then press it. | Stop 1's Client, Decathlon (`client:decathlon`, `buildRail(...).keyframes[1].subject`). Its Star is lit as the subject at the centre, red-tinted, with a white core at `stroke-focus`. Its one Planet, Store labelling generation (the moon map), sits to the right on its belt. Decathlon's core is about 69 px in radius at 1920×1080 and 77 px on the Ark. On the Ark, Air France-KLM's Star, belt and Planet show to the left. |
| `Focus` | From Client stop 1, press Tab until the index entry "Store labelling generation" shows bottom-left. From a fresh load with no click, that is three Tabs (overview, Decathlon, Store labelling generation), at both displays. If the empty click was needed, the count may differ: Tab until the entry "Store labelling generation" shows. Then press Enter. Wait about 6 s. The panel opens titled "Store labelling generation". The click fallback, also from Client stop 1, is a click on the Planet to the right of Decathlon's Star, at about (1651, 540) at 1920×1080 and about (2692, 540) on the Ark. Escape releases Focus, back to Client stop 1 with the path unchanged and `history.state.scrollProgress` at `1`. | The Planet (`project:decathlon/store-labelling-generation`) at its largest: its fill, its atmosphere rim at `stroke-focus`, its Motes and labels, and the panel on the right. |
| `rail(p=2.8333)` | A fresh load in a new tab; wait about 9 s for the fade. Open DevTools undocked (a separate window, so the viewport keeps its size) and run in the Console: `document.querySelector('.scene-host').dispatchEvent(new WheelEvent('wheel', { deltaY: 2266.64, bubbles: true, cancelable: true }))`. That is 2.8333 × `WHEEL_PIXELS_PER_STOP` (800): one event through the shipped wheel path, so the store moves with the camera. After about 1 s, `history.state.scrollProgress` reads `2.8333`. Close DevTools before judging the pose or taking its screenshot; the pose stays where the wheel left it. Chrome may refuse the first paste into the Console until `allow pasting` is typed there; type it, then paste the line again. | Between stops 2 and 3, near SNCF Connect & Tech (white-tinted, the large Star left of centre). SNCF's red Star, its two Planets and their belts, and the one Deep Project, Client referential (`project:sncf/client-referential`, with its ring disc and moon), sit lower left inside that glow. Air France-KLM is right of centre, and the nebula crosses the frame. On the Ark, Decathlon's Star and Planet also show at the far right. 8.4 measured its worst farther-fill-over-glow here. |
| `Star close-up`, `rail(p=1.25)` | A fresh load in a new tab; wait about 9 s for the fade. As for `rail(p=2.8333)`, run in the Console: `document.querySelector('.scene-host').dispatchEvent(new WheelEvent('wheel', { deltaY: 1000, bubbles: true, cancelable: true }))`. That is 1.25 × 800. After about 1 s, `history.state.scrollProgress` reads `1.25`. Close DevTools before judging. | Decathlon's Star, whole and near the largest a visitor's input draws any Star: no shipped camera comes closer to a Star than the Rail does, and the largest whole Star is near p≈1.28, as the Rail passes Decathlon; p=1.25 is taken for its round wheel step. Its core is about 121 px in radius at 1920×1080, centred near (1050, 367), and about 148 px on the Ark, near (2030, 327), against 69 px and 77 px at its stop. Its limb darkening, granulation and tint fill the upper centre, with its belt arcing over it and its name below. Its glow (3 × the core radius) stays inside the frame at 1920×1080, by about 4 px at the top. On the Ark it runs off the top of the frame (about 444 px against 327 px), and in a maximised window, shorter than 1080 px, it may at both displays: the core stays whole. On the Ark, Store labelling generation and Air France-KLM's system also show. |

**The landings, confirmed on this build at both viewports:** ArrowDown reached `scrollProgress` `1` with no click needed. Three Tabs focused "Store labelling generation", and Enter opened its panel, as did the click fallback at each display's coordinates. Escape slid the panel out and left `scrollProgress` at `1`. Each wheel event was taken (`defaultPrevented` true). `history.state` read `null` at 250 ms (the router's trailing save not yet written), then `{"scrollProgress":2.8333}` and `{"scrollProgress":1.25}` at 0.5 s, 1 s, 2 s, 4 s and 8 s. A reload cannot carry a pose: the router restores a saved position only at creation or on a route-changing pop, and `pagehide` saves the store's own value first.

The captures made while confirming the poses are not the judgement's screenshots, and are not stored here.

### The checklist

Each look is judged at the poses named, at both displays. The evidence is the `deferred-work.md` entry or the spec that routed it here. "Levers" names what a rejection may change by the route below. A lever outside the tunable values of Epics 7 and 9 is marked as needing a ruling. `GLOW_REST_PEAK`, which 8.4's sheet names, is now the resting rows of `GLOW_BAND_PEAK` (`src/render-scene/realism/star-model.ts`).

| Look | Where to look | Evidence | Levers if rejected | Thomas's call |
| --- | --- | --- | --- | --- |
| 8.4's rejection, answered | Every pose, against 8.4's verdict above, point by point. The strokes: under realism the Rail track and the orbits are gone, replaced by the nebula and the belts (`holdReplacedLine`, `line-fade.ts`); the line-work that stays in every session is the hover and keyboard affordance, the leaders, the Mote orbits and Dust. The Stars: whether each reads as a star, closest at `Star close-up`. The colours: whether the six Stars' tints vary enough. They are SIMSU blue, Transilien yellow, SNCF Connect & Tech and Air France-KLM white, SNCF and Decathlon red, all seen at the opening frame. Each tint is fixed per Star and does not change in time. | 8.4's Verdict field above; `epic-9-context.md` (Replace, don't underlay; Star appearance); `spec-9-4-stars-that-shine.md`; `spec-9-5-a-colour-per-star.md`; `spec-9-6-orbits-as-debris-belts.md`. | The strokes: the belt and nebula levers in their rows below. The Stars: `star-model.ts`'s constants under the route below, and the glow values. The colours: the `realism-star-*` token values. Which tint a Star gets is derived from its ID (`starAppearanceOf`, `src/derive/appearance.ts`), so reassigning tints needs a ruling, as does a tint that changes in time. Removing the line-work that stays needs a ruling. | Pass. |
| The Star's dark ring (from 8.4; **superseded by 9.4**) | Every Star at rest, and closest at `Star close-up`. Under realism a Star has no outline and no core dot: 9.4 replaced them with the core light, and the line-work fades to 0 as the layer arrives (`holdBodyMarks`, `line-fade.ts`). Thomas confirms the dark ring and dark spot are gone. | `deferred-work.md:1454-1456`; `spec-9-4-stars-that-shine.md`; `epic-9-context.md` (Replace, don't underlay). | None to tune: a ring still seen after the fade means the line-work did not fall, a defect, not a tunable value. | Pass. |
| Overlapping rest glows (re-checked under the tints) | Where two Stars' rest glows meet, now each in its tint: the opening frame's central cluster, and along the Rail. | `deferred-work.md:1498-1500`: at most two overlap on the committed layout, 0.4536 against the ceiling 0.47119, measured before the tints; `spec-9-5-a-colour-per-star.md`. | `GLOW_BAND_PEAK`'s resting rows, lowered, and `GLOW_RADIUS_RATIO` (glow values); the `realism-star-*` tints. | Pass. |
| A farther fill over a nearer glow | `rail(p=2.8333)`, lower left: SNCF's Star and Client referential, farther, inside the glow of SNCF Connect & Tech. | `deferred-work.md:1355`: 549 pixels at this pose in 7.7; the draw order stands by AD-19. | Glow values (`GLOW_BAND_PEAK`, `GLOW_SUBJECT_PEAK`, `GLOW_RADIUS_RATIO`) or the map choice. Reversing the draw order needs a ruling. | Pass. |
| Half-disc Planets | Every pose; largest at `Focus`, where Store labelling generation is lit on one half. | `deferred-work.md:1430`. | The ambient floor (`realism-ambient-floor-dark`), which lifts the night side; the map choice. Moving the light needs a ruling. | Pass. |
| The fill-tilt axis wording (now including the ring disc) | `Focus`: the map's features and terminator against the screen's horizontal. The fill tilts about world x, while `src/derive/appearance.ts:18` documents tilt as about the Billboard's horizontal. Now also the ring disc, tilted a fixed `RING_DISC_TILT` (0.7 rad) from the camera's facing, on Client referential at `rail(p=2.8333)`. | `deferred-work.md:1408`; `mapFromWorld` in `src/render-scene/realism/fill-model.ts`; `src/render-scene/realism/ring-model.ts`. | The spin rates; `RING_DISC_TILT` (Epic 9). The tilt values (`TILT_MIN`, `TILT_MAX`) and the fill's axis need a ruling. Correcting the wording changes a comment, not the look. | Pass. |
| Jupiter worn by no Planet | No pose shows it. The Colophon (`/colophon/`) lists `jupiter.webp` with its credit, and the build requests only `io.webp`, `mars.webp` and `moon.webp` (checked on this build). | `deferred-work.md:1375`: moon 5, io 2, mars 1, jupiter 0, in `generated/layout.generated.json`. | The map choice: the library (`src/derive/map-library.ts`) or the salt in `src/derive/appearance.ts`. AD-21 forbids a per-Body override. | Pass. |
| The band between the plate and the keyboard outline | `Focus`'s first steps: at Client stop 1, Tab until the index entry "Store labelling generation" shows. The affordance rises on the Planet with its surface-base plate and the keyboard outline 3 px off it; look at the band of scene between the two. Since 2026-11-25 the Client names have a halo, not a plate, so the band is the affordance plate's only. | `deferred-work.md:1564`; `src/render-scene/affordance-model.ts:70-73`. | Glow values, for what shows through the band. The outline and its offset are line-work: moving them needs a ruling. | Pass. |
| Client names and their halo over the glows | Every pose: the opening frame's six names; Decathlon under its core at `Client stop` and `Star close-up`; at `rail(p=2.8333)` "SNCF" and "SNCF Connect & Tech" inside the white glow, and "Air France-KLM". Also between poses, while the wheel or an arrow moves the Rail. | `deferred-work.md:1651` (proven only on the model at integer stops), `:1655` (no hysteresis at the edge or the 4 px clearance); `spec-9-3-client-names-on-the-stars.md`, restyled 2026-11-25 (`CLIENT_LABEL_HALO`, `client-label-model.ts`). | Glow values (`GLOW_BAND_PEAK`, `GLOW_SUBJECT_PEAK`, `GLOW_RADIUS_RATIO`) and the `realism-star-*` tints, for what the names sit on. The halo, the names' type and the hide rule are Thomas's 2026-11-25 look: changing them needs a ruling. | Pass. |
| The crossfade and its fade-time artefacts | A fresh load, watched from the first frame through `opening frame`: the M2 schematic frame, then the realism layer rising while the line-work it replaces falls, once and whole. The artefacts are accepted, but only for the fade: a far disc, moon, belt or the nebula over a nearer fill, and the M2 Moon dot and the moon sphere alternating. At keyframe 0 the Bodies are a few pixels across, so they may not show. | `deferred-work.md:1711-1713` (accepted under AD-22, 2026-11-25), `:1716`; `spec-9-10-the-handover.md`. | `FADE_SECONDS` (a fade value). Depth writes during the fade, and the shared `MOON_RENDER_ORDER`, are AD-22 and AD-19 as ruled: changing them needs a ruling. | Pass. |
| The belt across a sibling Planet (with its dark stripe and sibling overlap) | `rail(p=2.8333)`, lower left: SNCF's two Planets and their belts, and Transilien's at the top left. Look for a belt cut straight across a sibling Planet, at full fade. Look also for a belt's dark centreline across its own Planet or through a glow, and for sibling belts overlapping. Also at `Client stop` and `Star close-up` on Decathlon's belt over its Planet. | `deferred-work.md:1703-1704` (sibling cut, junction softness), `:1673` (dark stripe), `:1678` (sibling overlap); `:1716` keeps the sibling cut with 9.11. | `realism-belt`; `BELT_HALF_WIDTH_RATIO`, `BELT_DENSITY_FLOOR`, `BELT_NOISE_CELLS`, `BELT_JUNCTION_SOFTNESS` (`belt-model.ts`). Fading against every Planet of the Star, or a lighten blend, changes the ruled near side and needs a ruling. | Pass. |
| The nebula's self-overlap | Where the ribbon covers itself on screen: along the Rail at the opening frame, and where it crosses the frame at `rail(p=2.8333)` (lower left, and on the Ark across the left half). Its brightness stacks there, and its noise runs in float32 on the GPU. | `deferred-work.md:1690-1691`. | `realism-nebula`; `NEBULA_PEAK_LUMINANCE`, `NEBULA_HALF_WIDTH`, `NEBULA_DENSITY_LOW`, `NEBULA_DENSITY_HIGH`, `NEBULA_NOISE_SCALE`, `NEBULA_OCTAVES`, `NEBULA_DRIFT`, `NEBULA_END_UNITS` (`nebula-model.ts`). | Pass. |
| The ring disc at the opening frame | `opening frame`: Client referential, beside SNCF's Star, whose ring disc's minor half-axis is about 1.1 px (the M2 Ring was about 1.4 px). Deep/Shallow at the first view. Compare it at `rail(p=2.8333)`, lower left, where the disc and moon are large. | `deferred-work.md:1699`; `signal.test.ts`. | `RING_DISC_INNER_RATIO`, `RING_DISC_TILT`, `RING_DISC_OPACITY`, `RING_DISC_BAND_FLOOR`, `RING_DISC_EDGE`, `RING_DISC_MIN_PX`, `RING_DISC_MIN_BAND_PX` (`ring-model.ts`). The Ring radius is M2 geometry: changing it needs a ruling. | Pass. |
| The rim switch against the Star's rise | `Focus`, entered and released: the Planet's atmosphere rim switches to `stroke-focus` at once, while Decathlon's subject core falls over 0.6 s, so both show briefly. Escape reverses it. | `epic-9-context.md` (Atmosphere rim); `spec-9-10-the-handover.md`, residual risks. | `RISE_SECONDS` (`star-model.ts`); `RIM_WIDTH`, `RIM_MIN_PX` (`rim-model.ts`). A rise or animation of the rim needs its own ruling. | Pass. |

### If a pose is rejected

The change goes to the tunable values of Epics 7 and 9, inside AD-23's budgets. Epic 7's are the map choice, the ambient floor, the glow and fade values, and the spin rates. Epic 9's are the placeholder `realism-*` tokens (`realism-star-*`, `realism-nebula`, `realism-belt`, in DESIGN.md's frontmatter), and the greybox constants its models export, as named in the checklist above:
- `src/render-scene/realism/star-model.ts`: `STAR_CORE_LIMB`, `STAR_GRAIN_DEPTH`, `STAR_GRAIN_SCALE`, `STAR_GRAIN_DRIFT`, `STAR_CORE_EDGE`, `STAR_CORE_ALPHA_FLOOR`, `STAR_PULSE_SECONDS`, `STAR_SUBJECT_DIP` and `RISE_SECONDS`;
- `belt-model.ts`, `nebula-model.ts`, `ring-model.ts` and `rim-model.ts`: the constants listed in the checklist rows above, and `NEBULA_NOISE_PERIOD` and `RING_DISC_BAND_CELLS`. The others they export are not levers: they are derived from other values (`BELT_JUNCTION_RADIUS`, `MOON_RADIUS`, `MOON_ALBEDO_LUMINANCE`), pinned to a token by test (`MOON_FLOOR_LUMINANCE` and the `*_LUMINANCE` band values), or geometry (`RING_DISC_SEGMENTS`).

Then the build is made again, and the judgement is taken again at every pose, at both displays, against the new build commit and chunk names.

A rejected 9.11 verdict stays as written, as 8.4's did. The new judgement takes a new section of its own after this one, rather than overwriting it.

`realism` has 214 B of headroom (24,786 of 25,000 B) and `scene` 1,368 B (958,632 of 960,000 B). A tuning change that adds code to either, rather than changing a value, may need a budget ruling first.

Moving more line-work, adding a composer or a post pass, changing Focus framing or changing a budget needs a new ruling recorded in the memlog (spine, Deferred) before it is made. So does any lever the checklist marks as needing a ruling.

### The verdict

Thomas writes these. Each field stays on its own line, its value after the label. A verdict is given by replacing `Not yet given.`. From then on, `npm test` requires:
- the date, as `YYYY-MM-DD`;
- the machine, the browser and the displays, written;
- the Commit field holding the judged build's full 40-hex commit, the one under The build;
- the Poses field, written;
- the Screenshots field naming at least one screenshot, each stored beside this record as `judgement-9-11-<pose>-<display>.png`, where `<display>` is `1920x1080` or `ark`.

The ten names are:
- `judgement-9-11-opening-frame-1920x1080.png`, `judgement-9-11-opening-frame-ark.png`;
- `judgement-9-11-client-stop-1920x1080.png`, `judgement-9-11-client-stop-ark.png`;
- `judgement-9-11-focus-1920x1080.png`, `judgement-9-11-focus-ark.png`;
- `judgement-9-11-rail-2.8333-1920x1080.png`, `judgement-9-11-rail-2.8333-ark.png`;
- `judgement-9-11-star-close-up-1920x1080.png`, `judgement-9-11-star-close-up-ark.png`.

If another build is judged, its commit and chunk names replace those under The build too. The machine is named with its model, CPU and GPU, and is not the target profile. The displays are named with their models and resolutions, each with its `devicePixelRatio` and OS scaling, and must name both the 1920×1080 display and the Ark. The Commit and Poses fields are filled as defaults Thomas confirms.

- **Date:** 2026-11-26
- **Machine:** MSI MS-7E25, Intel Core i9-14900KF, NVIDIA GeForce RTX 4080 SUPER (the dev machine, not the target profile).
- **Browser:** Chrome 159.0.8154.34
- **Displays:** Samsung Odyssey Ark at 3840×2160 (its 16:9 mode, not 32:9), `devicePixelRatio` 1, 100% OS scaling; 1920×1080 emulated in Chrome DevTools on the Ark at `devicePixelRatio` 1, no physical 1920×1080 display.
- **Commit:** `e73313eb78e1db00ce80b7cfdb7084f9072877f0`, the build above (its three chunk names emitted as listed).
- **Poses:** the five above, each at 1920×1080 and on the Odyssey Ark: `opening frame`, `Client stop` (stop 1, Decathlon), `Focus` (Store labelling generation), `rail(p=2.8333)`, `Star close-up` (`rail(p=1.25)`).
- **Verdict:** Passed.
- **Screenshots:** `judgement-9-11-opening-frame-ark.png`

## Live (8.5)

Story 8.5 names the live commit here when M3 reaches the live site. The status stays "not yet passed": going live is not a framerate result.
