---
title: 'Story 7.3: The map library'
type: 'feature'
created: '2026-11-04'
status: 'done'
baseline_revision: '810f76b88927ed93a4537abfb29cbe83818eba45'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      NASA's media guidelines summarise the permission behind the Moon and Jupiter entries as non-commercial use, and those entries' recorded licence wording leaves that out.
    evidence: |-
      https://www.nasa.gov/nasa-brand-center/images-and-media/ permits texture maps on Internet and personal Web pages for educational or informational purposes, summarises this as for non-commercial use, has separate commercial-use rules, and asks that NASA be acknowledged. AD-21's admission test (NASA or USGS, no third-party copyright, a recorded credit) is met, so nothing here failed it, but whether a personal portfolio counts as educational or informational is Thomas's ruling. src/derive/README.md states the full wording; the licence screen refuses non-commercial wording, so recording the summary line in the entries would refuse them. Settle before Epic 8's credits and the merge.
    location: >-
      src/derive/map-library.ts:31
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Realism needs surface maps, and an unlicensed or uncredited image must never reach the live site. Nothing yet holds a map's provenance, bounds the library's size, or fails when a file and its entry disagree.

**Approach:** Admit real NASA and USGS maps into one pure module and `public/textures/`, add a gate step that checks both directions and the budget from file headers with no decoder, and widen the collection scan by exactly one allowance. Nothing reads the library yet: 7.4 assigns maps, Epic 8 credits them.

## Boundaries & Constraints

**Always:**
- A map is admitted only if NASA or USGS publishes it, its page shows no third-party copyright, and its credit line is recorded from that page. The stored URL is the page's final URL after redirects, and the build never fetches it.
- A check with nothing to measure fails: no entries, or no `public/textures/`, is a failure.
- A recorded mean luminance is reported as recorded, not verified. CI only checks that it is a number in range, and the record says so.
- The scan's allowance is exact: an `https://` URL on `nasa.gov`, `usgs.gov` or a subdomain of either, in `src/derive/map-library.ts` alone, with mutation rows for each near miss.

**Block If:**
- No map can be admitted under the test above. HALT `blocked` with condition `no admissible map`, since the gate fails on an empty library.
- A test can only pass by changing an audit beyond AD-19's named allowances. HALT `blocked` with condition `audit change outside AD-19's allowances`.

**Never:**
- Add a dependency, an encoder or a decoder to the repo or CI; add a data file under `public/textures/`.
- Import the library or the budgets from any shipped module; request a map from the page (7.5 onward).
- Add `appearance` or change `SCHEMA_VERSION` (7.4); add Colophon credits (Epic 8).
- Add budgets other than the library's: each lands with the first code that can break it.
- Touch `career.json`, `public/preview.png`, `scripts/preview.ts` or the preview tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Committed library | real entries and files | gate passes | n/a |
| Empty library / no directory | `[]`, or `public/textures/` missing | fails naming the empty library | failure line |
| File without entry | `extra.webp` | fails naming the file | failure line |
| Entry without file | `mars` with no `mars.webp` | fails naming the id | failure line |
| Stray file | `notes.json`, `.gitkeep`, a subdirectory | fails naming it | failure line |
| Not WebP | PNG bytes in `x.webp`; truncated header; RIFF size disagreeing with the file | fails naming the file | failure line, no crash |
| Over budget | 13 maps; 1025×512; 1024×513; total above 4,000,000 bytes | fails naming the limit | failure line |
| All WebP forms | `VP8 `, `VP8L`, `VP8X` headers | dimensions read correctly | n/a |
| Bad entry | duplicate or non-bare id; `http://`, other or lookalike host; a `©`, Creative Commons or CC BY licence; empty credit; impossible date; mean 0, above 1 or `NaN` | fails naming the id and field | failure line |
| Scan near miss | same URL in another file; `example.com` in the library; `nasa.gov.evil.example`, `evilnasa.gov`, `nasa.gov@evil.example`; `http://`; a URL followed off-site | collection scan fails | failure line |

</intent-contract>

## Code Map

- `scripts/check-pins.ts` -- the gate-step pattern to copy: `CHECK_PASSED`, `checkX(root)` returning failure lines, `parseArgs` with the one `--root=` seam, `isEntryPoint`, an unreadable file being one failure line. `:192`.
- `scripts/check-pins.test.ts:48,261` -- `mkdtemp` fixture trees, and the pin that `gate` *ends* in `check-pins.ts`, so the new step goes before it.
- `package.json:13` -- the `gate` script.
- `scripts/source-scan.ts` -- `filesUnder`, `sourceFilesUnder`, `isTestFile`, `stripComments`, `stripCommentsAndStrings` for the audits.
- `src/first-paint.test.ts:98-131` -- `COLLECTION`, `withoutOwnMetaUrls`, `auditCollection`; `:137-150`, the mutation-row pattern to follow. The gate-vocabulary scan reads this library too, so its text avoids `accept`, `loading` and the rest of that list.
- `src/derive/boundaries.ts` -- `src/derive/` may not import tokens or renderers; `render-scene/realism/` falls under `render-scene`'s row. No row changes.
- `src/derive/README.md:10` -- files table; a new section records the library and its conversion.
- `src/render-scene/README.md` -- gains a line for `realism/budgets.ts`.
- `src/launch-readiness.test.ts:266` -- `auditPublic` rejects modules and pages under `public/`, not `.webp`. Unchanged.
- `.gitattributes:9` -- `*.webp binary` already holds.
- `.github/workflows/ci.yml:30` -- CI runs `npm run gate`, so the step reaches CI with no workflow change.

## Tasks & Acceptance

**Execution:**
- `C:/Users/Thomas/AppData/Local/Temp/claude/b15f7b399220260d/e12de351-76f4-440a-83dd-352819835563/scratchpad/venv/Scripts/python.exe`, `C:/Users/Thomas/AppData/Local/Temp/claude/b15f7b399220260d/e12de351-76f4-440a-83dd-352819835563/scratchpad/sources/` -- convert the four admitted sources (`moon.jpg`, `mars.jpg`, `io-full.jpg`, `jupiter.jpg`, already downloaded; `io-full.jpg` is the page's `full.jpg`) outside the repo with that venv's Pillow, per Design Notes, and measure each mean; run it with `-I` and keep any script outside `sources/` -- no encoder enters the repo.
- `src/derive/map-library.test.ts`, `scripts/check-maps.test.ts`, `src/first-paint.test.ts` -- red first: every matrix row, the audits below, and the real tree.
- `src/render-scene/realism/budgets.ts` -- create with the library's four limits and no import -- the one home AD-23 names.
- `src/derive/map-library.ts` -- create: the `MapEntry` type and `MAP_LIBRARY`, no import, no I/O -- AD-21's one module.
- `public/textures/{moon,mars,io,jupiter}.webp` -- commit the converted pixels.
- `scripts/check-maps.ts` -- create the gate step per the matrix -- reads size and header only.
- `package.json` -- add `node scripts/check-maps.ts` to `gate`, before `check-pins.ts`.
- `src/first-paint.test.ts` -- add `withoutLibrarySourceUrls` to `auditCollection`, and update the header comment.
- `src/derive/README.md`, `src/render-scene/README.md` -- the file rows, the admission test, the conversion record and the stated limit.

**Acceptance Criteria:**
- Given `src/derive/map-library.ts`, when it is read and audited, then it has no import, no `node:` or DOM use, and each entry holds a bare `id`, source URL, licence wording, credit line, retrieval date and mean luminance.
- Given `public/textures/`, when it is listed, then it holds exactly `<id>.webp` per entry and nothing else.
- Given `npm run gate` on the real tree, when it runs, then `check-maps` passes and reports what it measured; given any matrix failure in a fixture tree, then the CLI exits 1 naming it.
- Given `scripts/check-maps.ts`, when it is audited, then it holds no decoder import and no network reach; and `package.json` and the workflows name no image encoder or decoder.
- Given `budgets.ts`, when it is audited, then it has no import or re-export, and a file outside `render-scene/realism/` and `scripts/` importing it, statically or dynamically, fails an audit with mutation rows; the real tree passes.
- Given the collection scan, when it runs on the real tree, then it passes with the library's URLs present, and every near-miss row fails.
- Given the README's conversion record, when it is read, then it names the tool, version, settings and how each mean was measured, and states that CI cannot recompute a mean; a test fails if the record loses any of these.
- Given the build, when compared with the baseline, then the shipped JS chunks are byte-identical, content hashes normalised, and `dist/textures/` holds the maps with no page requesting them.

## Spec Change Log

## Review Triage Log

### 2026-11-04 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 21 (high 0, medium 3, low 18)
- defer: 1 (high 0, medium 1, low 0)
- reject: 14 (high 0, medium 0, low 14)
- addressed_findings:
  - `[medium]` `[patch]` Spelled-out copyright passed the licence screen; it now refuses `Copyright <year or holder>`, `(c) <year>`, `&copy;`, non-commercial wording, CC0 and more spellings of Creative Commons and CC BY, while NASA's wording still passes.
  - `[medium]` `[patch]` Nothing held "no shipped module reads the library and no page requests a map"; a new audit with mutation rows does.
  - `[medium]` `[patch]` Nothing tied a file's bytes to its entry; the README's table now carries each file's SHA-256 and byte count and each entry's mean, checked by a test against the real files, and the gate's pass line no longer claims more than a name match.
  - `[low]` `[patch]` `credit` is screened as `licence` is.
  - `[low]` `[patch]` An unread library, or a rejected id, no longer cascades into false file failures.
  - `[low]` `[patch]` A sparse library array no longer passes with zero maps measured.
  - `[low]` `[patch]` The gate requires 2:1 from the header.
  - `[low]` `[patch]` Self-consistent truncated files and short chunks now reach each truncated guard; the regex is tightened.
  - `[low]` `[patch]` New rows: VP8X chunk size, VP8 zero height, `public/textures` being a file.
  - `[low]` `[patch]` The VP8L fixture sets the alpha bit, pinning the height mask.
  - `[low]` `[patch]` The gate-step audit also matches `readFile` and `createReadStream`.
  - `[low]` `[patch]` The budgets reach audit takes a `?raw` or `#` suffix, `import.meta.glob`, and a re-export inside `realism/` (3 findings).
  - `[low]` `[patch]` Removed a test that could not fail.
  - `[low]` `[patch]` The README records download URLs and the conversion and measuring steps as a snippet (2 findings), the guidelines pages, and the refused candidates' pages and date.
  - `[low]` `[patch]` The README states the screen's token list and limit, and its wrong "one off-site URL" heading is corrected (2 findings).
  - `[low]` `[patch]` `src/render-scene/realism/README.md` declares the directory's rules.

## Design Notes

**Admitted, each page read on 2026-11-04.** Moon, Mars, Io and Jupiter, four maps for eight Planets, since Bodies may share a map. Map choice stays tunable in Epic 8's judgement.

| id | Page (final URL) | Credit, as the page gives it | Licence evidence | Source pixels |
|---|---|---|---|---|
| `moon` | `https://svs.gsfc.nasa.gov/4720` | NASA's Scientific Visualization Studio | No licence statement, no third-party copyright; NASA's media guidelines: "generally are not subject to copyright in the United States" | `lroc_color_poles_1k.jpg`, 1024×512 |
| `mars` | `https://astrogeology.usgs.gov/search/map/mars_viking_global_color_mosaic_925m` | USGS Astrogeology Science Center; originator Planetary Data System | Access constraints: public domain. Use constraints: None | `mars_viking_clrmosaic_global_1024.jpg`, 1024×512 |
| `io` | `https://astrogeology.usgs.gov/search/map/io_galileo_ssi_voyager_color_merged_global_mosaic_1km` | USGS Astrogeology Science Center; originator Planetary Data System | Access constraints: public domain. Use constraints: None | `full.jpg`, 1024×512 |
| `jupiter` | `https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map/` | NASA/JPL/Space Science Institute | As `moon` | `PIA07782.jpg`, 3601×1801 |

**Refused.** Triton's mosaic is about half black, with no coverage. Mercury's colour mosaic has black gaps at the north pole and across the disc. Blue Marble's page gave no credit line, so its credit could not be recorded from the page. Both refused mosaics were licensed correctly: these are pixel and evidence refusals, not licence ones.

**Conversion.** Pillow 11.3.0 with libwebp 1.5.0, in a scratch venv: `convert('RGB')`, Lanczos to 1024×512 only where the source is larger, `save(path, 'WEBP', quality=80, method=6)`, no metadata.

**Mean luminance.** Decode the WebP; sRGB to linear per channel (IEC 61966-2-1); `0.2126 R + 0.7152 G + 0.0722 B`; an unweighted mean over all pixels, so an equirectangular map's poles count more than their area. Rounded to four places. The material normalises to this number in 7.6, so a tuned map needs a re-measure.

**Budget unit.** "4 MB" is 4,000,000 bytes, the stricter reading.

**URL allowance.** On `src/derive/map-library.ts` alone, blank each `https://(?:[a-z0-9-]+\.)*(?:nasa|usgs)\.gov(?:/[\w./%-]*)?` directly followed by a closing quote. Requiring the quote is what fails `@`, a port, a query and a URL followed off-site.

**Licence refusal.** The gate refuses, in licence wording and in the credit, `©`, `&copy;`, `(c) <year>`, `Copyright <year or holder>`, Creative Commons, CC BY, CC0, non-commercial wording and `all rights reserved`, and any host but NASA's or USGS's. That is what a machine can check; reading the page was the admission. Tightened at review, as is the 2:1 requirement, which goes beyond the matrix's wording.

## Verification

**Commands:**
- `npm test` -- expected: all pass, the one environmental skip as before, count above 1785.
- `npm run typecheck` -- expected: clean.
- `npm run gate` -- expected: passes, naming what `check-maps` measured.
- `npm run build` -- expected: succeeds, budgets holding.
- `git diff --stat -- src/data/career.json generated/ public/preview.png scripts/preview.ts scripts/preview.test.ts` -- expected: empty.

**Manual checks:**
- Hashes-normalised byte comparison of the chunks against a baseline build at `810f76b`, built with `npx vite build --outDir C:/Users/Thomas/AppData/Local/Temp/claude/b15f7b399220260d/e12de351-76f4-440a-83dd-352819835563/scratchpad/dist-base --emptyOutDir` before any change, since this checkout is at that commit.

## Auto Run Result

**Summary.** Four maps (Moon, Mars, Io, Jupiter) are admitted into `src/derive/map-library.ts` and `public/textures/`. A new gate step checks library and files in both directions, and the budget, from file headers with no decoder. The collection scan admits NASA and USGS source URLs in the library alone. Nothing reads the library, and no page requests a map.

**Files changed.**
- `src/derive/map-library.ts`, `src/derive/map-library.test.ts` -- the library, its purity and reach audits, and the record's checks.
- `public/textures/{moon,mars,io,jupiter}.webp` -- 1024×512 VP8, 196,450 bytes in total.
- `scripts/check-maps.ts`, `scripts/check-maps.test.ts` -- the gate step, its matrix, and the decoder, manifest and budgets audits.
- `src/render-scene/realism/budgets.ts`, `src/render-scene/realism/README.md` -- the library's four limits, and the directory's rules.
- `package.json` -- `check-maps` in `gate`, before `check-pins`.
- `src/first-paint.test.ts` -- the URL allowance and its near-miss rows.
- `src/derive/README.md`, `src/render-scene/README.md` -- file rows, admission test, conversion record and stated limits.

**Review.** 21 patches applied, 1 deferred, 14 rejected. Follow-up review recommended: **true**. Patched: 0 high, 3 medium, 18 low; score 3 × 3 + 18 = 27, at or above 5.

**Verification.** After the patches: `npm test` 1821 tests, 1820 pass, 0 fail, the one environmental skip. `npm run typecheck` clean. `npm run gate` and `npm run build` pass. The protected-files diff is empty. Against a baseline build at `810f76b`, every shared `dist/` file is byte-identical and the only additions are the four maps; no `.js`, `.css` or `.html` file names `textures/` or `.webp` (the implementer's comparison, not repeated at finalisation). The matrix rows were checked against `scripts/check-maps.test.ts` and `src/first-paint.test.ts`, and those suites ran.

**Review delivery.** Reviewers read the diff from a scratch file instead of receiving it inline. Subagents ran in the background because this platform launched them so, and each was awaited before going on.

**Residual risks.**
- **Licence, for Thomas (deferred).** NASA's guidelines summarise the permission behind Moon and Jupiter as non-commercial use, for educational or informational purposes. Whether a personal portfolio qualifies is his ruling. Settle it before Epic 8's credits and the merge. Jupiter's credit also names the Space Science Institute, though its page shows no copyright. **Update:** Thomas ruled on 2026-11-04 that this personal portfolio counts as informational use, so the Moon and Jupiter entries stand. The credits must still acknowledge NASA. Jupiter's credit naming the Space Science Institute was not part of this ruling.
- **Unjudged.** Four maps for eight Planets, chosen without seeing them lit; the set is tunable in Epic 8. The WebP settings are also unjudged on screen.
- **Page evidence.** Pages were read once, on 2026-11-04; the gate cannot see them. The USGS general policy page answered 403 to curl and was read through WebFetch at planning; Mars and Io rest on their own pages.
- **Means.** CI cannot recompute a mean. It is an unweighted pixel mean, so an equirectangular map's poles count more than their area; 7.6 normalises to it.
- **Audit limits.** The reach audits are by name: a wide glob, or a `realism/` module exporting a budget under another name, passes. A corrupt WebP body behind a good header passes the gate, though the hash test in `npm test` catches a swapped file.
