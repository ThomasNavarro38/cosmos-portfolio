---
title: "Story 7.4: A Planet's appearance in the artifact"
type: 'feature'
created: '2026-11-05'
status: 'done'
baseline_revision: '5f70ab173d7a9300c4337948922856a02f7a4506'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      The Colophon's "only career.json is authored" and the artifact banner's "from src/data/career.json" no longer say all of it, since the layout now carries map and meanLuminance from map-library.ts.
    evidence: |-
      src/colophon/absences.ts:35 and BANNER in src/derive/artifact.ts. Changing the banner now would move artifact bytes beyond appearance and the version. AD-21 and AR-M3-14 leave the Colophon's wording to Thomas's ruling in the story adding the statement and credits, so settle the banner with it, before the merge.
    location: >-
      src/colophon/absences.ts:35
    severity: medium
  - summary: >-
      Jupiter is worn by no Planet (moon 5, io 2, mars 1, jupiter 0), yet jupiter.webp ships, counts against the budget and needs a credit.
    evidence: |-
      generated/layout.generated.json. This is correct rendezvous output, and AD-21 forbids a per-Body override, so the levers are the library or the salt. For Thomas's on-screen judgement in Epic 8.
    location: >-
      generated/layout.generated.json
    severity: low
---

<intent-contract>

## Intent

**Problem:** Realism needs each Planet to have a map, a tilt and a spin, and adding a Project must stay one JSON entry and one `weight`, with no art decision. Nothing yet assigns these, and the renderer may not import the library.

**Approach:** Derive `appearance` for each Planet from its entity ID and the map library in one pure `src/derive/` module, emit it under `SCHEMA_VERSION` 10, and have the gate fail when the committed assignments differ from a re-derivation. Nothing draws with it yet: 7.5 requests the maps, 7.6 shades them.

## Boundaries & Constraints

**Always:**
- The entity ID and the library are the only inputs. Same ID, same library: same `appearance`, whatever the career holds and whatever order the library lists.
- `meanLuminance` is the winning map's library value, copied.
- The field is required on every Project and refused on a Client, by the closed schema.
- `solveLive(career.json)` stays byte-identical to the committed artifact, with no new argument and no fetch.
- Every number is finite and rounded to four places, as the solve's coordinates are, so a browser and Node emit the same text.

**Block If:**
- The re-solve changes anything beyond `appearance` and `schemaVersion`. HALT `blocked` with condition `re-solve moved more than appearance`, since `public/preview.png` would then need a recapture (AD-24).
- A test can only pass by changing an audit beyond AD-19's named allowances or by changing `scripts/preview-drift.ts`. HALT `blocked` with condition `audit change outside AD-19's allowances`.

**Never:**
- Add a field or override to `career.json`, a row to the derivation table, or a fourth mapping rule.
- Import the library from `render-scene/`, `render-fallback/`, `shell/` or `colophon/`; request a map (7.5); draw a fill (7.6); add Colophon credits or a statement (Epic 8).
- Solve inside the gate (AD-1): the check re-derives `appearance` only, from IDs in the document.
- Touch `career.json`, `public/preview.png`, `scripts/preview.ts`, `scripts/preview-drift.ts` or their tests.
- Add a dependency, or use `node:crypto` in the assignment: `live.ts` runs it in a browser, synchronously.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Planet | any Project ID | `{ map, meanLuminance, tilt, spinRate, spinPhase }`, each in range | n/a |
| Star | a Client | no `appearance` | a Client carrying one fails the schema |
| Project added | career plus one entry, known or new Client | every prior Project's `appearance` unchanged | n/a |
| Project edited | changed `weight`, `notable`, dates or skills, same ID | `appearance` unchanged | n/a |
| Map added | library plus one entry | only IDs the new map wins change; each changed ID now names it | n/a |
| Map removed | library minus one entry | only IDs that map held change | n/a |
| Library reordered | same entries, reversed | no assignment changes | n/a |
| Empty library | `[]` | throws naming the ID | the pipeline reports one failure line |
| Missing or extra | no `appearance` on a Project; an extra key in it | schema fails naming the path | failure line |
| Out of range | `tilt`, `spinRate`, `spinPhase` or `meanLuminance` outside its range, `NaN`, or a non-bare `map` | schema fails naming the path | failure line |
| Old version | `schemaVersion` 9 | schema fails | failure line |
| Unknown map | committed `appearance.map` with no library entry | gate fails naming the Project and the map | failure line, then `npm run solve` |
| Hand edit | committed `map`, `meanLuminance`, `tilt`, `spinRate` or `spinPhase` differs from a re-derivation | gate fails naming the Project and the field | failure line, then `npm run solve` |
| Library changed, no re-solve | a library entry's mean or set changes | gate fails as above | failure line |
| Entry with no file | a map the artifact names has no `public/textures/<id>.webp` | `check-maps` fails naming the id, in the same `npm run gate` | existing failure line |

</intent-contract>

## Code Map

- `src/derive/artifact-schema.ts:50` -- `SCHEMA_VERSION`, with its history comment; `:135`, `ArtifactProjectSchema`, gains the field after `orbitNormal`.
- `src/derive/artifact.ts:60` -- `projectOf`; the assembler looks values up and computes nothing a module owns.
- `src/derive/pipeline.ts:68` -- `solveArtifact`, shared with `live.ts`; needs no change, since `projectOf` reads the ID.
- `src/derive/index.ts:103` -- `checkEmittedArtifact`, the pre-write checks; `:632`, `inspectArtifact`, whose artifact-alone checks run in order with a heading line and `Run npm run solve`; the new check goes after `checkContent`, before the import boundaries.
- `src/derive/map-library.ts` -- `MAP_LIBRARY`, `MapEntry`; pure, no import.
- `src/derive/map-library.test.ts:107` -- `LIBRARY_READERS`, empty on purpose until a change names the reader; `:158`, the audit title; `:173`, the `solve.ts` mutation row, which must keep failing. `MAP_REQUESTERS` stays empty: this story names no map path.
- `scripts/check-maps.ts:302` -- already fails an entry with no file; its row is in `scripts/check-maps.test.ts`. `package.json:13` runs it after `index.ts --check` in `gate`.
- `src/derive/solve.ts:278` -- `round`, private to the solve, four places with `-0` removed; mirror its behaviour rather than export it, so the solve's module surface is unchanged.
- `src/derive/live.test.ts:33`, `src/derive/colophon-claims.test.ts` -- hold the live re-solve to the committed bytes.
- `src/derive/maintenance.test.ts:145` -- `writeTemp`, `appendedEntry`, `committedCareer`, the pipeline-level pattern for "a Project is added".
- `src/derive/artifact-schema.test.ts:31` -- `valid()`, `copy()`, `assertFails()`; `:100`, the version pin; `:660`, the old-version row to copy.
- `src/colophon/derivations.test.ts:63` -- already pins three rows on the real artifact; no change.
- `src/render-fallback/` -- `chart.tsx`, `chart-model.ts`, `chart.css`; no file names `appearance` today.
- `src/render-scene/scene-model.ts:157` -- reads the artifact structurally, so an added field needs no change here.
- `scripts/source-scan.ts` -- `filesUnder`, `isTestFile`, `stripComments`, `stripCommentsAndStrings`; `src/derive/boundaries.ts` -- `findImports`.
- `src/derive/README.md:5` -- says derivation "knows nothing of appearance", now untrue as worded; `src/tokens/README.md:6`, `src/derive/boundaries.ts:147` and the label at `src/derive/boundaries.test.ts:286` say the same. `:36`, the library's row, says nothing reads it. `:163`, the preview paragraph.

## Tasks & Acceptance

**Execution:**
- `src/derive/appearance.test.ts`, `src/derive/artifact-schema.test.ts`, `src/derive/artifact.test.ts`, `src/derive/maintenance.test.ts`, `src/derive/map-library.test.ts` -- red first: every matrix row, the audits below, and the README claim.
- `src/derive/appearance.ts` -- create `appearanceOf(id, library = MAP_LIBRARY)`, the hash and the range constants, per Design Notes; imports `./map-library.ts` alone.
- `src/derive/artifact-schema.ts` -- add the closed `AppearanceSchema` to `ArtifactProjectSchema`, set `SCHEMA_VERSION` to 10 and extend its history comment.
- `src/derive/artifact.ts` -- `projectOf` calls `appearanceOf(entity.id)`, placing the key after `orbitNormal`.
- `src/derive/index.ts` -- add `checkAppearance(artifact, library = MAP_LIBRARY)`, called from `checkEmittedArtifact` and `inspectArtifact`, naming the Project and field; update the "Five of them" header.
- `src/derive/map-library.test.ts` -- `LIBRARY_READERS` becomes `['src/derive/appearance.ts', 'src/derive/index.ts']`, the assignment and the gate, with its comment and the audit's title corrected; add rows that these two alone are admitted.
- `generated/layout.generated.json` -- regenerate with `npm run solve`; never by hand.
- `src/derive/README.md` -- file rows for `appearance.ts` and its test, a new `### A Planet's appearance` section under The artifact, the library row corrected, and the preview paragraph's statement that the drift warning is expected until the next recapture, and why.
- `src/derive/README.md:5`, `src/tokens/README.md:6`, `src/derive/boundaries.ts:147`, `src/derive/boundaries.test.ts:286` -- change "knows nothing of appearance" to say derivation knows nothing of tokens or how a value is drawn; the rule itself is unchanged.

**Acceptance Criteria:**
- Given `src/derive/appearance.ts`, when audited, then it imports `./map-library.ts` alone, and holds no `node:`, DOM, clock or `Math.random` use, with mutation rows; and only `artifact.ts`, `index.ts` and, for the range constants alone, `artifact-schema.ts` among shipped modules import it, so the solve, the entities and the rules cannot read it.
- Given the committed artifact, when read, then every Project's `appearance` equals `appearanceOf(project.id)`, every `meanLuminance` equals its map's library entry, and no Client has the key.
- Given the career fixtures, when a Project is appended through `runPipeline`, under a known Client and under a new one, then every prior Project's `appearance` is deep-equal, and `career.json`'s schema gains no field.
- Given the re-solve, when the new artifact is compared with the one at the baseline revision, with each `appearance` object removed and the version line set back, then the two are byte-identical.
- Given `solveLive(career.json)`, when it runs under Node, then it equals the committed artifact, with `solveLive`'s signature and `live.ts` unchanged.
- Given `npm run gate` on the committed tree, when it runs, then it passes; and given a hand-edited or unknown `appearance.map` in a scratch artifact, `node src/derive/index.ts --check <artifact>` exits 1 naming it.
- Given `src/render-fallback/`, when each non-test file is scanned, then none contains the word `appearance`, with a mutation row each for a `.ts`, `.tsx` and `.css` file, and the existing chart parity tests pass unchanged.
- Given the Colophon's derivation table, when `derivations.test.ts` runs, then it still holds three rows, with that test unchanged.
- Given `src/derive/README.md`, when read, then the preview paragraph states that a re-solve changing only `appearance` and the version needs no recapture and that the drift warning after it is expected; a test fails if it stops saying so, and `scripts/preview-drift.ts` is unchanged.

## Spec Change Log

- 2026-11-05, Thomas's ruling after the run blocked. AD-19 gains a seventh allowance: the solver chunk's closed module list in `scripts/bundle-assertion.test.ts` admits `src/derive/appearance.ts` and `src/derive/map-library.ts` only, recorded in the spine, AR-M3-3, 7.10 and the memlog. The importer criterion now names `artifact-schema.ts`, for the range constants alone, as the Design Notes require.

## Review Triage Log

### 2026-11-05 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 18 (high 0, medium 2, low 16)
- defer: 2 (high 0, medium 1, low 1)
- reject: 6 (high 0, medium 0, low 6)
- addressed_findings:
  - `[medium]` `[patch]` Nothing drove an empty or grown library through the real CLI; child-process tests now substitute the library, covering the empty-library line, a grown re-solve and a stale `--check`, with a control.
  - `[medium]` `[patch]` The preview claims did not pin "until the next recapture" or the reason, as the story requires; they do now.
  - `[low]` `[patch]` Spread threshold now scales with the library.
  - `[low]` `[patch]` Reach audit catches a built dynamic import, a glob and a reader's re-export (2 findings).
  - `[low]` `[patch]` `valueChain` and the schema's bounds check read extensionless and dynamic forms (2 findings).
  - `[low]` `[patch]` Source audit catches `Temporal`, `Math['random']` and a destructured `random`.
  - `[low]` `[patch]` The rounding is pinned against `solve.ts`'s `PRECISION`.
  - `[low]` `[patch]` `gate`'s two steps are pinned, for the composition behind "no entry or no file".
  - `[low]` `[patch]` The Fallback audit also reads `src/shell/fallback-host.tsx`.
  - `[low]` `[patch]` The career-schema refusal must name `appearance`, and the fixture parses without it.
  - `[low]` `[patch]` `checkAppearance` compares every key rather than a hand list, and reports an extra key.
  - `[low]` `[patch]` Corrected the determinism comment and the pipeline's catch comment (2 findings).
  - `[low]` `[patch]` README: the opening list, five file rows and the version sentence corrected, and what a rename does and the committed map spread stated (3 findings).

## Design Notes

**The hash.** A 32-bit FNV-1a over the string's UTF-16 code units with `Math.imul`, then the MurmurHash3 finaliser, since IDs share long prefixes (`project:simsu/`) and bare FNV-1a mixes the last characters poorly into the high bits. Returned unsigned. `crypto.subtle` is asynchronous and `solveArtifact` is not, so a small pure hash is the only option that keeps one code path. It is not a security boundary.

**Rendezvous.** For each library entry, score `hash(`map\0${entry.id}\0${id}`)`. The highest score wins; a tie goes to the lower map id by codepoint, so library order cannot matter.

```ts
const unit = (salt: string, id: string): number => hash(`${salt}\0${id}`) / 2 ** 32; // [0, 1)
tilt: round(TILT_MIN + unit('tilt', id) * (TILT_MAX - TILT_MIN))
```

**Ranges, starting values and unjudged.** Each field has its own salt, so the three do not move together. Nothing has been seen lit; Epic 8's judgement may tune them, and tuning changes only `appearance`.

| Field | Unit | Range | Why |
|---|---|---|---|
| `tilt` | radians about the Billboard's horizontal, signed | -0.5 to 0.5 | visibly different axes, none lying on its side |
| `spinRate` | radians per second, always positive | 0.02 to 0.1 | one turn in about one to five minutes, so a surface moves without drawing the eye |
| `spinPhase` | radians | 0 to 6.2832 inclusive | a full turn, with the upper bound being 2π rounded to four places |

The schema holds these bounds, imported from `appearance.ts`. A rounded value can land exactly on a bound, so the schema's bounds are inclusive.

**No file check in `index.ts`.** AD-21's "every `appearance.map` has a library entry and a file" holds by composition in one `npm run gate`: `checkAppearance` holds map to entry, and `check-maps` holds entry to file and file to entry. This keeps file reads out of the artifact gate and keeps `MAP_REQUESTERS` empty.

**Why the gate may re-derive.** AD-1 forbids solving in the gate. `appearanceOf` runs no force solve and reads no authored field: AD-21 asks for this re-derivation by name.

**The live chunk carries the library.** `live.ts` reaches `appearance.ts`, so the Colophon's press now loads `MAP_LIBRARY`, source URLs included. Nothing requests those URLs. The entry and scene chunks stay free of it, and the build check below confirms this.

**The preview's wording.** A re-solve changing only `appearance` and the version moves nothing the card draws, so AD-24 needs no recapture. The guard sees times, not frames, and will warn until the next recapture. That warning is expected and is not a stale card.

## Verification

**Commands:**
- `npm test` -- expected: all pass, the one environmental skip as before, count above 1823.
- `npm run typecheck` -- expected: clean.
- `npm run gate` -- expected: passes.
- `npm run build` -- expected: succeeds, printing the expected drift warning on this full-history checkout once the artifact is committed.
- `git diff --stat -- src/data/career.json public/preview.png scripts/preview.ts scripts/preview.test.ts scripts/preview-drift.ts scripts/preview-drift.test.ts src/derive/live.ts src/colophon/derivations.test.ts` -- expected: empty.

**Manual checks:**
- With a small script in the scratch directory, compare `git show 5f70ab1:generated/layout.generated.json` with the new artifact, removing each `appearance` object and restoring the version; expected: byte-identical. Record the result.
- After the build, search `dist/assets/` for `nasa.gov` and `usgs.gov`; expected: only the live re-solve's chunk. No `.js`, `.css` or `.html` names `textures/` or `.webp`.

## Auto Run Result

Status: done

**Summary.** Every Planet now carries `appearance: { map, meanLuminance, tilt, spinRate, spinPhase }`, derived from its entity ID and the map library under `SCHEMA_VERSION` 10. Maps are assigned by rendezvous hashing. The gate fails when a committed assignment differs from a re-derivation or names no library entry, and `check-maps` holds entry to file in the same `npm run gate`. Nothing draws with it or requests a map yet.

**The block and its ruling.** The run first halted because the solver chunk's closed module list could not hold the two new modules under AD-19's six allowances. Thomas ruled on 2026-11-05 to add a seventh allowance, recorded in the spine, AR-M3-3, 7.10 and the memlog.

**Files changed.**
- `src/derive/appearance.ts`, `src/derive/appearance.test.ts` -- the assignment, the hash and the ranges, and their audits and child-process tests.
- `src/derive/artifact-schema.ts`, `src/derive/artifact.ts`, `src/derive/index.ts` -- the closed schema and version 10, the emission, and `checkAppearance`.
- `generated/layout.generated.json` -- regenerated with `npm run solve`.
- `src/derive/artifact-schema.test.ts`, `artifact.test.ts`, `maintenance.test.ts`, `map-library.test.ts` -- schema, gate and "a Project is added" rows, and the library's two admitted readers.
- `scripts/bundle-assertion.test.ts` -- the seventh allowance, two lines, with the list still closed.
- `src/derive/README.md`, `src/tokens/README.md`, `src/derive/boundaries.ts`, `src/derive/boundaries.test.ts` -- the appearance section and rows, the preview claim, and "knows nothing of appearance" reworded with the rule unchanged.
- `ARCHITECTURE-SPINE.md`, its `.memlog.md`, `epics.md`, `epic-7-context.md`, `deferred-work.md`, `sprint-status.yaml` -- the ruling, the recompiled context, the deferrals and the tracking.

**Review.** 18 patches applied, 2 deferred, 6 rejected. Follow-up review recommended: **true**. Patched: 0 high, 2 medium, 16 low; score 3 × 2 + 16 = 22, at or above 5.

**Verification, re-run by the orchestrator after the patches.** `npm test` 1872 tests, 1871 pass, 0 fail, the one environmental skip. `npm run typecheck`, `npm run gate` and `npm run build` pass. The protected-files diff is empty. With the 8 `appearance` objects removed and the version set back, the artifact is byte-identical to `5f70ab1`'s at 23,466 bytes. `nasa.gov` and `usgs.gov` appear only in `dist/assets/live-DNPcx7vl.js`. Matrix audit: each row has a test that ran and passed. The "entry with no file" row rests on `scripts/check-maps.test.ts` plus the pin that `gate` runs both steps.

**Residual risks.**
- **Unjudged.** Tilt and spin ranges are starting values, and no map has been seen lit.
- **Map spread.** Jupiter is worn by no Planet (deferred, Epic 8).
- **Colophon and banner wording.** Neither names the library yet (deferred, for Thomas's ruling with the credits, before the merge).
- **Browser.** `solveLive`'s byte-identity was checked under Node only. The Colophon's framing already claims no outcome for a browser run.
- **Byte-identity is a one-time check.** No test can compare with a past artifact once HEAD moves. The lasting guard is that the solve, entities and rules cannot reach the assignment or the library.
- **Drift warning.** So far it has fired on the uncommitted artifact's mtime. After this commit it fires on commit times, as expected until the next recapture.
- **Review delivery.** Reviewers read the diff from a scratch file, and subagents ran in the background because this platform launches them so; each was awaited before going on. The diff excluded `epic-7-context.md`, a regenerated planning summary.
