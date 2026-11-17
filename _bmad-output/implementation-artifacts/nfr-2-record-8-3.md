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

No verdict has been recorded. Story 8.4 records Thomas's on-screen judgement here: the date, the machine, the browser, the commit, the poses, the verdict in Thomas's words, and the screenshots stored beside this record. The entry must say that the machine is not the target profile, so a judgement made on it is not a framerate result and leaves the status unchanged.

## Live (8.5)

Story 8.5 names the live commit here when M3 reaches the live site. The status stays "not yet passed": going live is not a framerate result.
