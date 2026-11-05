# Realism failure check (story 7.5)

**Run:** 2026-11-05, after the review patches. Production build of the working tree on `m3-realism` (baseline `007106e` plus story 7.5, uncommitted when run), served by `spikes/realism-failure/serve.mjs` in each mode. The baseline is `007106e` built from `git archive` and served by `vite preview`. Each mode ran in its own isolated browser context and port, so nothing was shared through a cache.

**Browser:** Chrome 156 on Windows, driven through DevTools, with real WebGL: `ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER, Direct3D11)`. Every capture is at an emulated 1440×900 at device pixel ratio 1. This is the dev machine, and it says nothing about framerate or a target-profile laptop.

**Result:**

- Every failure mode's settled first frame is pixel-identical to the baseline's: 0 of 1,296,000 pixels differ. So is `ok`'s.
- Rail input changes the frame in every mode, two captures with no input between them do not, and the settled frame at the next stop is identical to the baseline's.
- The real `decodeMaps` reaches its images under `ok`, and rejects or fails at the import in the failure modes.
- The mark came before the first realism request in all four modes, and no request repeated.

## Requests, the mark and the DOM

Times are milliseconds from navigation start, from Resource Timing. "Repeats" come from the server's log, read after each page had been open for over a minute.

| Mode | `schematic-first-frame` | First realism request | Realism requests (status) | Repeats | DOM nodes after 11 s |
| --- | --- | --- | --- | --- | --- |
| baseline | 522.7 | none | none | n/a | 298 |
| `ok` | 528.7 | 543 | chunk 200; `io`, `mars`, `moon` 200 | none | 298 |
| `map-404` | 535.1 | 548 | chunk 200; `io` 404; `mars`, `moon` 200 | none | 298 |
| `map-corrupt` | 585.7 | 594 | chunk 200; `io` 200 with bad bytes; `mars`, `moon` 200 | none | 298 |
| `chunk-404` | 566.1 | 576 | chunk 404, and no map requested | none | 298 |

The element-tag fingerprint of the DOM (`spikes/realism-failure/probe.js`) matched the baseline's in all four modes, with no `role="alert"`, `role="status"` or `<dialog>`. That is the "no added DOM" evidence: the same tags in the same order as a build without realism. It compares tags only, not attributes or text.

The DOM was read about 11 seconds after load, plus an earlier reading whose timing varied: in the baseline and `map-corrupt` the earlier reading caught the page still mounting (147 and 251 nodes). The 11-second figure is the one compared.

**Console:**

| Mode | Lines |
| --- | --- |
| baseline, `ok`, `map-corrupt` | The `THREE.Clock` deprecation warning. It appears in the baseline, so realism does not cause it. |
| `map-404`, `chunk-404` | That warning, and the browser's own `Failed to load resource: 404`. |

The browser writes the 404 line itself for any failed request, so shipped code cannot stop it. Nothing from the site's code was logged, and no uncaught rejection appeared.

## The frame, against the baseline

`spikes/realism-failure/compare.mjs` counts pixels differing in any channel, of 1,296,000. There is no tolerance.

| Mode | Settled first frame vs the baseline's | Control: two captures 3 s apart, no input | After the wheel: 6 events, 2.5 s | Settled at the next stop (`scrollProgress` 2.25) vs the baseline's |
| --- | --- | --- | --- | --- |
| baseline | n/a | 0 | not captured at 2.5 s | n/a |
| `ok` | **0** | 0 | 815,540 | **0** |
| `map-404` | **0** | 0 | 816,246 | **0** |
| `map-corrupt` | **0** | 0 | 815,803 | **0** |
| `chunk-404` | **0** | 0 | 815,085 | **0** |

So the change comes from the input: 0 pixels without it and over 815,000 with it.

- **The 2.5-second captures were not settled.** Against each other they differ by 5,000 to 14,000 pixels, because the spring was still moving when each was taken. So the last column waited longer, at least 12 seconds after the wheel, and all four match the baseline exactly.
- **The `ok` settled capture came after a trip to `/chart` and back**, so it is also a remounted Canvas, and it still matches.

**One run was discarded, and why.** The first `ok` comparison differed from the baseline by 808,596 pixels. That page had been wheeled in an earlier run at another viewport, and was navigated to the same URL in the same tab. Reading the page showed `history.state.scrollProgress` at 4.5, so it had opened at a later stop: the site's existing restore, and my harness's mistake. The `ok` row above comes from a fresh context with `history.state` null, which reads 0. The three failure modes and the baseline were each loaded once at this viewport with no earlier wheel, so they could not carry this. The baseline's tab had also not been wheeled when its first frame was taken.

**Captures kept** in `spikes/realism-failure/results/`: `baseline-first.png` and `baseline-settled.png`. Every mode's first frame had SHA-256 `935650d014198885…`, the same as `baseline-first.png`, and every mode's settled frame, `ok`'s return from `/chart` included, had `6017f0a3a9f6baff…`, the same as `baseline-settled.png`. So the duplicates were removed before commit. The control and 2.5-second captures were deleted after counting, so those columns can be reproduced only by a rerun.

## The real path to `decoded`

Production exposes no way to read the owner's status, and no debug hook was added. So `spikes/realism-failure/decode-probe.js` imports the built chunk by URL in the page and calls its real `decodeMaps`, with the served `layout.generated.json` and the base. This runs the shipped function by the same path, though not the owner around it.

| Mode | Stage | Result |
| --- | --- | --- |
| `ok` | decode | `io`, `mars`, `moon`, each an `ImageBitmap` at 1024×512 |
| `map-404` | decode | rejected: `InvalidStateError: The source image could not be decoded.` |
| `map-corrupt` | decode | rejected: `InvalidStateError: The source image could not be decoded.` |
| `chunk-404` | import | rejected: `TypeError: Failed to fetch dynamically imported module` |

The chunk's only export is `decodeMaps`. The owner's own `decoded` and `failed` transitions were not read in the browser: they are executed in `src/render-scene/realism-status.test.ts`.

## Leaving the scene and returning, under `ok`

In one document (one navigation entry, a marker on `window` surviving), I clicked the page's `/chart` link, waited, went back in history and waited 13.5 seconds:

| Step | Path | Canvas present |
| --- | --- | --- |
| Before | `/cosmos-portfolio/` | yes |
| Left | `/cosmos-portfolio/chart` | no |
| Returned | `/cosmos-portfolio/` | yes |

The realism requests were the same four entries before and after, with no new line in the server's log, and the mark stayed at one entry. The console gained `THREE.WebGLRenderer: Context Lost` on leaving and the `THREE.Clock` warning again from the second Canvas.

Exactly the distinct maps were requested: the committed artifact wears `io`, `mars` and `moon`, and `jupiter` is in the library on no Planet today.

## `/chart` and `/colophon`, loaded directly

Each in a fresh context, read after 11 seconds, under `ok`:

| Route | Realism chunk requests | Map requests | Scene chunk requests | Canvas |
| --- | --- | --- | --- | --- |
| `/chart` | 0 | 0 | 0 | no |
| `/colophon` | 0 | 0 | 0 | no |

## The flip

`mars.webp` through `createImageBitmap` with and without `imageOrientation: 'flipY'`, each drawn to a 2D canvas at 1024×512 and read back: **0** of 2,097,152 channel values differ between the flipped image and a vertical mirror of the unflipped one, and 1,508,438 differ between the flipped and unflipped images as they stand. So in Chrome the option is a vertical flip, and it does change this map. Whether the flipped map is the right way up on a sphere is for 7.6, which first draws one.

## Where three landed, and the budgets

**Three's classes land in the `scene` chunk, not `realism`.** `realism` imports `ImageBitmapLoader` from the scene chunk statically and holds no three. So the material and shader classes 7.6 to 7.8 bring from three count against `scene`, and **`scene` has 8,648 bytes of headroom left** (960,000 − 951,352). `realism`'s 23,422 bytes of headroom cannot absorb them, however roomy it looks. Those stories' own code may land in `realism`; three's may not.

| Chunk | Bytes |
| --- | --- |
| `assets/scene-S9E4myci.js`, holding three | 948,172 |
| `assets/tokens-C7aYfGEI.js` | 3,180 |
| `assets/realism-BveCNj2B.js` | 578 |

| Measure | Bytes | Budget |
| --- | --- | --- |
| `scene`: the scene chunk plus `tokens`, its closure outside the mount's | **951,352** | 960,000 |
| `realism`: its own chunk, nothing else outside the scene's closure | **578** | 24,000 |

These are the figures of the build the browser ran. After that run, a guard for a missing `fetch` was removed from `decode-maps.ts`, so the committed build's `realism` is 551 bytes, with `scene` unchanged. The browser rows were not rerun on it.

The scene chunk grew by 918 bytes from the baseline build's 947,254. It now holds `ImageBitmapLoader`, the mount and the owner; the growth was not broken down further.

**The entry graph's 7 bytes, traced.** It went from 3,271 to 3,278 of its 4,000. Diffing the two entry chunks, the only difference besides the mount's hash in two places (the same length) is the export list:

```
baseline: export{d as a,c as i,s as n,l as o,u as r,h as t};
new:      export{c as a,u as i,o as n,d as o,s as r,l as s,h as t};
```

The new list has one more binding, `o as n,`, which is 7 bytes: `o` is `BASE` (`var o='/cosmos-portfolio/'`). `route.ts` lives in the entry chunk and `realism-mount.tsx` imports `BASE` from it, so the entry now exports it. The entry gained no realism module and no code.

## Not covered

- **Firefox and Safari were not run.** This matters most for the flip: `imageOrientation: 'flipY'` is browser-dependent, and 0 differing values here says nothing about either. `createImageBitmap`'s options and failures may differ there too.
- A frame callback throwing was run only in the test, against a fake port.
- Each failing map mode broke `io`, the first worn map by name. The rule does not depend on which map, and `one of many` is in the tests.
- An image body served under a 404 status would decode and be used, as the spec's Design Notes accept. A test pins it against faked ports; it was not served here.
- The `ok` images were decoded by the probe's own call; those the owner holds in the same page are not readable, and nothing draws either until 7.6.
- Only one viewport was compared. Nothing here measures framerate.

## Rerun

From the repo root. `<scratch>` is an empty scratch directory outside the repo. The hashed names change with the build.

**1. Build, and start the servers.**

```bash
npm run build
node spikes/realism-failure/serve.mjs ok 5281
node spikes/realism-failure/serve.mjs map-404 5282
node spikes/realism-failure/serve.mjs map-corrupt 5283
node spikes/realism-failure/serve.mjs chunk-404 5284
```

Keep each server's stdout: it is the request log that "Repeats" reads.

**2. Build and serve the baseline, without git metadata.** On Windows, in Git Bash:

```bash
git archive 007106e188ee4eaf074eb9487f7266963b471cab | tar -x -C <scratch>
cmd //c mklink //J "$(cygpath -w <scratch>/node_modules)" "$(cygpath -w "$PWD/node_modules")"
(cd <scratch> && npx vite build && npx vite preview --port 5290 --strictPort --host 127.0.0.1)
```

**3. Open each site in a new isolated context**, in a tab that stays visible, starting from `about:blank`. Set the viewport by device emulation to 1440×900 at ratio 1, then navigate. Resizing the window is not enough, as it gave captures one pixel apart at a fractional ratio. Never reuse a tab that has been wheeled: a same-URL navigation restores `history.state.scrollProgress`.

**4. In each page:**

1. Evaluate `spikes/realism-failure/probe.js` (its header says how). It waits 11 seconds and returns the mark, the realism requests and the DOM fingerprint.
2. Screenshot as `<mode>-first.png`, wait 3 seconds, and screenshot as `<mode>-control.png`.
3. In a mode other than the baseline, dispatch six `WheelEvent('wheel', { deltaY: 300, bubbles: true, cancelable: true })` on `.scene-host`, 60 ms apart. Wait 2.5 seconds and screenshot as `<mode>-wheel.png`.
4. Read the console messages.

Do the same six events on the baseline tab after step 2, then wait at least 12 seconds. Screenshot every tab as `<mode>-settled.png`.

**5. Compare**, once for each mode:

```bash
node spikes/realism-failure/compare.mjs <mode>-first.png baseline-first.png
node spikes/realism-failure/compare.mjs <mode>-first.png <mode>-control.png
node spikes/realism-failure/compare.mjs <mode>-control.png <mode>-wheel.png
node spikes/realism-failure/compare.mjs <mode>-settled.png baseline-settled.png
```

**6. Read the repeats** from each server's log: no chunk or map line after the page's first set. Do this before step 8, which requests the maps itself.

**7. Leave and return, under `ok`.** Click the page's `/chart` link, wait, call `history.back()`, wait over 10 seconds, and read the Resource Timing entries for `realism-` and `textures/` before and after, the navigation entries, the mark and the server's log.

**8. The real `decodeMaps`.** In each page, evaluate `spikes/realism-failure/decode-probe.js`.

**9. The flip.** In the `ok` page, fetch one worn map as a blob. Call `createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })`, and again with `imageOrientation: 'flipY'` added. Draw each to an `OffscreenCanvas`, read with `getImageData`, and count the channel values differing from the vertical mirror and from the unflipped image.

**10. `/chart` and `/colophon`.** Open each directly on the `ok` server in a new isolated context, wait 11 seconds, and list the same-origin Resource Timing entries.

**11. Chunks and budgets.** `npm run build` prints both measures, and `dist/assets/` gives the chunks' bytes. Three's place is `checkRealism`'s to hold. To trace the entry graph, diff `dist/assets/index-*.js` between the two builds.

**12. Clean up.** Stop the servers. Remove the junction first, with `cmd //c rmdir "$(cygpath -w <scratch>/node_modules)"`, and only then the directory, so the removal cannot follow it into the repo's `node_modules`.
