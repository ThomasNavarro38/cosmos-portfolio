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
| `realism` chunk | `REALISM_CHUNK_BYTES_BUDGET` | 24,000 B | 8,560 B | A budget; 8,560 is the starting value. |
| `scene` chunk | `SCENE_CHUNK_BYTES_BUDGET` | 960,000 B | 953,039 B (6,961 of headroom) | A budget; 953,039 is the starting value. |
| Sphere width segments | `SPHERE_WIDTH_SEGMENTS_BUDGET` | 64 | 64 (`FILL_SPHERE_WIDTH_SEGMENTS`), one shared geometry | A budget; 64 is the starting value. |
| Sphere height segments | `SPHERE_HEIGHT_SEGMENTS_BUDGET` | 32 | 32 (`FILL_SPHERE_HEIGHT_SEGMENTS`), one shared geometry | A budget; 32 is the starting value. |
| Added draws per Planet | `PLANET_DRAWS_BUDGET` | 1 per Planet | 1 per Planet; 8 Planets, 8 draws | A budget; 1 is the starting value. |
| Added draws per Star | `STAR_DRAWS_BUDGET` | 2 per Star | 2 per Star; 6 Stars, 12 draws | A budget; 2 is the starting value. |
| Added draws for Dust | `DUST_DRAWS_BUDGET` | 0 | 0 | A budget; 0 is the starting value. |
| Entry chunk (M2) | `ENTRY_BUDGET_BYTES` | 4,000 B | 3,278 B | M2's budget, unchanged; 3,278 is the starting value. |
| Full-screen passes, render targets, shadow maps, scene lights | (none: held by `done.test.ts`'s scan) | 0 of each | 0 of each | A budget; 0 is the starting value. |
| New runtime dependencies | (none: held by `check-pins.ts`'s closed list, M2's) | 0 | 0 (7 dependencies, M2's list) | A budget; 0 is the starting value. |

In all, the realism layer adds 20 draws over the committed artifact (8 × 1 + 6 × 2). Every value is within its budget.

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
- `window.devicePixelRatio`, the OS display scaling, and the canvas's drawing-buffer size once the scene is up. R3F's `dpr` of `[1, 2]` follows `devicePixelRatio`, so these fix how many pixels the run drew.

### The steps

1. Open a new tab and open DevTools (the Console) in it, and keep it open for the whole run, so reading the mark adds no stall. Then, in that tab, make a fresh load of `/`. A reload of a tab that was already open does not count, nor does a load followed by any earlier interaction.
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

Below 30, the bands are:

- `fps >= 24` (`FALLBACK_FLOOR_FPS`): accepted degraded, not a pass. The status stays "not yet passed".
- Below 24: below the floor, a fail. The Fallback is offered at that rate, so the scene has missed both the target and the floor.

A pass changes the status line above, with the run recorded here beside it. Nothing else does.

## Never run

None of these has been run on any machine. Each is listed beside NFR-2 so its absence is on the record, not mistaken for a pass (Epic 7 retro item 54).

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

- **Date:** To be written by Thomas.
- **Machine:** To be written by Thomas.
- **Browser:** To be written by Thomas.
- **Commit:** `2adeaa5c20f9602250f5aed4c251b0927a301457`, the build above, unless another build was judged.
- **Poses:** the four above: `opening frame`, `Client stop` (stop 1, Decathlon), `Focus` (Store labelling generation), `rail(p=2.8333)`.
- **Verdict:** Not yet given.
- **Screenshots:** None yet.

## Live (8.5)

Story 8.5 names the live commit here when M3 reaches the live site. The status stays "not yet passed": going live is not a framerate result.
