---
title: 'Story 8.5: M3 reaches the live site'
type: 'chore'
created: '2026-11-27'
status: 'in-progress'
baseline_revision: '2a80b3aea4beab4d0296d832ab2a2d10646cf193'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** M3 (Epics 7 and 9) is finished and judged on `m3-realism`, but the live site still serves M2. AC 8.5 asks for the merge to `main`, which publishes, and then positive evidence from the live site. "No error on screen" does not count as evidence. The record must name the live commit and still read NFR-2 **not yet passed**.

**Approach:** First confirm the gates at HEAD. Then fast-forward `main` to `m3-realism` and push it. Thomas gave the go-ahead in the invocation: "8-5, merge go-ahead given". Wait for the Deploy run. Then check the live site with one throwaway Chrome driver over the DevTools protocol, as the 7.10 and 6.4 drivers did: the scene, the reading surfaces, a phone, the preview and First Paint. Record the results in the NFR-2 record's `## Live (8.5)` section.

## Boundaries & Constraints

**Always:**
- **Gates before the push:**
  - `npm test`, `npm run typecheck`, `npm run build` and `npm run gate` pass at the pushed commit. The one skip is named: "the walk keeps a symlinked file, as the walkers it replaced did" (symlinks cannot be created here).
  - `npm run check:followup` prints `no follow-up review flags held`.
  - The 9.11 gate is met by Thomas's 2026-11-27 carry-over ruling. That ruling covers shipped code as of `2a80b3a`.
- **The merge is a fast-forward:** `origin/main` is an ancestor of HEAD. Push `HEAD:main`, and push `m3-realism`. No merge commit, no force push, no rewrite of `main`.
- **Every live check reads the live origin,** `https://thomasnavarro38.github.io/cosmos-portfolio/`, in a visible Chrome on this machine with a fresh profile per load. It starts only once the live `index.html` names the entry chunk that `npm run build` emitted locally for the pushed commit.
- **The scene check passes only on positive evidence:**
  - every map request (`textures/*.webp`) and the `realism` chunk answer 200 under `/cosmos-portfolio/`;
  - screenshots taken over the load show the schematic first frame, the crossfade in progress (realism rising while the line-work falls), and the finished layer with the Stars' tints and their Client names.
- **The reading surfaces:**
  - `/chart/` and `/colophon/` request no `textures/` file and no `realism` chunk, both on the 1920×1080 desktop and on an emulated phone. The phone is a coarse pointer with a mobile viewport of 390×844.
  - On the phone, `/` lands on the chart.
  - The Colophon's visible text contains the ruled appearance statement and one credit line per library map.
  - The live `preview.png` is byte-identical to `public/preview.png`.
  - Nothing under `src/render-fallback/`, nor `index.html` or `public/preview.png`, differs between `origin/main` (before the push) and the pushed commit.
- **First Paint follows 6.4's P1 on the proxy,** under Thomas's 2026-10-29 ruling (`first-paint-6-4.md`, "Ruling: a proxy for the target hardware"). That means three cold loads of the live `/` at 1920×1080 and DPR 1, with 4× CPU throttling and Fast 4G set before navigation. Read `schematic-first-frame`'s `startTime`, the step-6 count before and after `/chart` → Back, and whether the realism chunk was requested after the mark. Record the median beside M2's 1,938.3 ms, labelled as the dev machine, a proxy and not the target profile.
- **The record:** `nfr-2-record-8-3.md` `## Live (8.5)` names the live commit (full 40 hex) and keeps "The status stays 'not yet passed': going live is not a framerate result." The status line is unchanged.

**Block If:**
- The push to `main` is rejected (for example by branch protection or a non-fast-forward).
- The Deploy run fails, or the live entry chunk does not match within 20 minutes.
- Any live check fails. Record the failure in the record, then halt. Rollback (redeploy the previous commit, `4782a71`, by re-running its Deploy run) needs GitHub access that this machine's tooling lacks (`gh` is not installed), so Thomas performs it.
- Fixing anything would change shipped code, a budget, an allowance or a ruled section. That needs a ruling first (CLAUDE.md).

**Never:**
- Change `src/`, `public/`, `index.html`, the budgets or any workflow file.
- Count a framerate result, or change the NFR-2 status line.
- Treat "no error on screen", a green CI or a 200 alone as the fade being seen.
- Push `main` again after the merge. This story's later docs-only commits land on `m3-realism`. Fast-forwarding them to `main` is left to Thomas, because every push to `main` redeploys.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Deploy lands | Push accepted, Deploy run green | Live `index.html` names the local entry chunk, then the checks run | Poll every 30 s, up to 20 min, then Block |
| A map 404s | A `textures/*.webp` or `realism-*.js` answers non-200 | The scene check fails, naming the URL and status | Record the failure, Block, Thomas rolls back |
| Fade not seen | Screenshots show no realism, or no line-work falling | The scene check fails | Record, Block |
| A reading surface reaches realism | `/chart/` or `/colophon/` requests `textures/` or the realism chunk | That route fails, naming the request | Record, Block |
| Phone misroutes | The emulated phone's `/` does not land on the chart | The phone check fails | Record, Block |
| Injected origin | The machine's security software injects a script (as in 7.10) | Listed as the machine's, not a failure | Record its origin only |
| No first-frame mark | A P1 run has no `schematic-first-frame` entry | Not a run: recorded as a finding | Repeat the run once, then Block |

</intent-contract>

## Code Map

- `spikes/realism-failure/routes.mjs` -- the model driver. It spawns `C:/Program Files/Google/Chrome/Application/chrome.exe` with `--remote-debugging-port` and a fresh `--user-data-dir`, opens the page target's WebSocket, logs `Network.requestWillBeSent`, finds the realism chunk as "the one script naming a map", reads `SURFACE_TITLES` from `src/shell/arrival.ts`, and detects injected scripts. Reuse its patterns. It serves local `dist/` (`serve.mjs`). Re-running it after `npm run build` refreshes `spikes/realism-failure/results/routes.txt`, the deferred `/colophon/` re-record (`deferred-work.md`, 8.2's deferral: the Colophon now requests the solver chunk `live-*.js` on open).
- `spikes/realism-failure/results/routes.txt` -- the 7.10 record, which the re-run overwrites.
- `src/shell/detect.ts:50,85` -- `COARSE_POINTER_QUERY = '(pointer: coarse)'`. `chooseSurface` sends a coarse pointer to the chart. Phone emulation over CDP is `Emulation.setDeviceMetricsOverride` (`mobile: true`) plus `Emulation.setTouchEmulationEnabled`.
- `first-paint-6-4.md:33-62` (P1), `:64-70` (the proxy ruling), `:72-79` (the M2 runs, median 1,938.3 ms) -- the procedure and the figure. Throttling over CDP is `Emulation.setCPUThrottlingRate { rate: 4 }` and `Network.emulateNetworkConditions` with Fast 4G.
- `index.html:13-20` -- `og:image` points at `https://thomasnavarro38.github.io/cosmos-portfolio/preview.png`. `public/preview.png` is the file to compare against. `scripts/preview-drift.ts` is the existing drift guard.
- `src/colophon/credits.ts` (`creditLine`) and `src/derive/map-library.ts` (`MAP_LIBRARY`, 4 entries) -- the expected credit lines. `src/colophon/absences.ts` and `src/identity-audit.test.ts` `VISIBLE_COPY` hold the ruled appearance statement.
- `.github/workflows/deploy.yml` -- builds and deploys on a push to `main`. It runs `check:followup`, `npm test`, typecheck and build. Pages environment: `main` only.
- `nfr-2-record-8-3.md` `## Live (8.5)` (the last section) -- the stub to fill. `scripts/nfr-2-record.test.ts:572` `auditLive` requires "not yet passed" there. Keep the status line and every earlier section unchanged.
- `_bmad-output/implementation-artifacts/sprint-status.yaml:131` -- `8-5-m3-reaches-the-live-site: backlog`, with its comment.
- Git state: `origin/main` `4782a71` → local `main` `4669784` → HEAD, linear, 66 commits. `origin/m3-realism` is 60 commits behind.

## Tasks & Acceptance

**Execution:**
- Run the gates at HEAD: `npm test`, `npm run typecheck`, `npm run gate`, `npm run build` and `npm run check:followup`. Record each result, the skip's name and the three chunk names.
- `spikes/realism-failure/routes.mjs` -- run it unchanged against the new `dist/`, refreshing `results/routes.txt`. This closes 8.2's `/colophon/` re-record deferral.
- Push: `git push origin HEAD:main`, then `git push origin m3-realism`. Record the pushed commit.
- `spikes/live-check/live.mjs` (new, throwaway, outside `src/`, the tests and the build) -- one driver over the live origin. It waits for the deploy (the entry chunk match), then runs:
  - (1) the scene at 1920×1080, with every request and response status, and screenshots at about 0.5 s, every 1 s through the fade, and after it settles;
  - (2) `/chart/` and `/colophon/` on the desktop;
  - (3) `/` and `/chart/` on the emulated phone;
  - (4) the Colophon text check;
  - (5) the `preview.png` byte compare;
  - (6) three P1 runs.

  It writes `spikes/live-check/results/live.txt` and PNGs. It exits 1 on any failure. Withhold the injected script's install-ID paths, as routes.mjs does.
- `nfr-2-record-8-3.md` -- fill `## Live (8.5)`:
  - the live commit, the deploy confirmation and its date;
  - each check's result, with pointers to `live.txt` and the screenshots;
  - First Paint's three runs and median beside M2's 1,938.3 ms, labelled as the proxy;
  - the reading-surface and preview results;
  - the line "The status stays 'not yet passed': going live is not a framerate result."
- `sprint-status.yaml` -- `8-5` to `done` and its comment updated, `epic-8` to `done`.

**Acceptance Criteria:**
- Given the gates, when the push is made, then the gates passed at the pushed commit with the skip named, `check:followup` was clean, and `origin/main` equals the pushed commit.
- Given the live site serves the pushed build, when the driver loads `/`, then every map and the `realism` chunk answered 200 under `/cosmos-portfolio/`, and the screenshots show the schematic frame, the crossfade in progress, and the tinted Stars with their Client names.
- Given First Paint, when the three P1 runs are read, then each has a `schematic-first-frame` mark with count 1 / 1, the realism chunk was requested after the mark, and the median is recorded beside 1,938.3 ms, labelled as the dev-machine proxy.
- Given other visitors, when `/chart/` and `/colophon/` load on the desktop and on the phone, then neither requests a map or the realism chunk, the phone's `/` is the chart, the Colophon shows the ruled statement and the four credits, and `preview.png` is byte-identical.
- Given the record, when this story closes, then `## Live (8.5)` names the live commit and reads "not yet passed", and `node --test scripts/nfr-2-record.test.ts` passes.

## Spec Change Log

## Review Triage Log

## Design Notes

**The live commit.** The record names the commit that the Deploy run built and that the live check read. Later docs-only commits on `m3-realism` do not change the shipped files, so they do not change what is live.

**"Seen" means pixels, not logs.** The fade is shown by a screenshot sequence from a visible Chrome, kept beside the record. This is the same kind of evidence 9.11 used. A 200 or a clean console alone never counts.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate`, `npm run build` -- expected: pass (one named skip).
- `npm run check:followup` -- expected: `no follow-up review flags held`.
- `node spikes/realism-failure/routes.mjs` -- expected: exit 0, `findings: none` on each route.
- `node spikes/live-check/live.mjs` -- expected: exit 0, every check passed.
- `git rev-parse origin/main` -- expected: the pushed commit.

**Manual checks:**
- Look at the screenshot sequence in `spikes/live-check/results/`. Expected: schematic first, then realism rising, then tinted Stars with their names.
