---
title: 'Story 1.5: The versioned layout artifact'
type: 'feature'
created: '2026-09-04'
status: 'done'
baseline_commit: '2ce1f693c5c73ef7fae274b27308bfb35f419847'
review_loop_iteration: 3
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The pipeline derives entities and solves positions, but emits nothing — `generated/` holds only a `.gitkeep`. Every later epic is specified to read one committed artifact, and until that document exists with a declared shape, the scene and the Fallback have no contract to agree on. AD-14 names this the highest-leverage divergence in the system.

**Approach:** Declare the artifact's shape as a versioned Zod schema in `src/derive/artifact-schema.ts`, add a pipeline entry at `src/derive/index.ts` that runs validate → derive → solve → emit and writes `generated/layout.generated.json`, and wire two npm scripts: `solve` (deliberate, out-of-band) and a `build` that gates on the committed artifact validating but never re-solves it.

## Boundaries & Constraints

**Always:**
- The artifact validates against its own declared schema before it is written; a failure exits non-zero and writes nothing.
- `build` fails when the artifact is missing or fails validation, and **never** invokes `solve` (AD-1).
- The emitted JSON carries a generated-file banner and LF newlines — `.gitattributes` justifies LF by this artifact being diffed.
- `schemaVersion` is a literal in the schema; changing the shape means changing it.
- Content parity is absolute: the payload carries the whole authored record per Project (FR-22).
- Every derivation stays in `src/derive/`; the emitter computes nothing a rule could own (AD-3).
- The emitter lives under `src/` so `tsc --noEmit` covers it.

**Ask First:**
- Adding a mapping from authored data to a visual property. `moteTier` and `timeAxis` here derive from values already on the entity graph — they are projections, not a fourth rule (FR-3).
- Any change to `dwell`, `shots`, or `destinations` beyond declaring that they are absent at this version.

**Never:**
- No `new Date()`, no `Math.random()`, no clock or environment read anywhere in the pipeline.
- No emitter code inside `solve.ts` — `solve.test.ts` asserts that module does no I/O.
- No `dwell`, `shots`, or `destinations` fields in this version's schema; those are stories 1.7 and 1.6.
- No hand-editing of the emitted file, and no consumer reading `src/data/` to work around a missing field.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Valid `career.json` with `asOf` | `generated/layout.generated.json` written; exit 0 | N/A |
| Re-solve is byte-identical | `solve` run twice, no input change | Second write is byte-for-byte the first | N/A |
| Authored data invalid | `career.json` fails `CareerSchema` | Nothing written; the same failure lines `validate` prints | exit 1 |
| Emitted artifact fails own schema | A derivation produces a bad shape | Nothing written; names the failing path | exit 1 |
| `asOf` missing | No top-level `asOf` | Validation fails naming `asOf` | exit 1 |
| `asOf` malformed | `asOf` is `2026-13` | Validation fails naming `asOf` | exit 1 |
| Build gate, artifact missing | `generated/` empty, `build` runs | Build fails naming the missing artifact and the `solve` script | exit 1 |
| Build gate, artifact stale-shaped | Artifact fails `ArtifactSchema` | Build fails naming the failing path | exit 1 |
| Build never solves | `build` runs with valid artifact | Artifact's bytes unchanged | N/A |

</frozen-after-approval>

## Code Map

- `src/derive/artifact-schema.ts` — **to create.** Zod schema and inferred types for the artifact. Declares `schemaVersion` (literal), `asOf`, and `clients[]` (id, name, timeAxis, projects[]), each Project carrying `id`, `clientId`, `isDeep`, `mass`, `luminanceBand`, `railDistance`, `moteTier`, `timeAxis`, `position`, and `content` (the authored record, whole). Exports `ArtifactSchema`, `validateArtifact(raw): string[]`, `SCHEMA_VERSION`.
- `src/derive/index.ts` — **to create.** Pipeline entry and CLI. Reads `career.json`, validates, derives, solves, assembles, validates the result, writes LF JSON with the banner. `main()` guarded by `process.argv[1] === fileURLToPath(import.meta.url)` so importing never exits — the idiom at `src/data/validate.ts` [L247].
- `src/derive/artifact.ts` — **to create.** Pure assembly: `buildArtifact(graph, layout, asOf): Artifact`. No I/O, so parity is unit-testable without the filesystem. If it re-derives the recency ranking `deriveEntities` already computes, a test must bind the two — a mirror held by comment alone drifts silently.
- `src/derive/rules.ts` — **extend.** Add `deriveMoteTier` and `deriveTimeAxis`. **`timeAxis` measures recency — the same quantity `luminanceBand` ranks — never `duration.start`.** The two must order a set identically, or the Fallback's timeline contradicts the scene's brightness. `LuminanceBand` [L28] and `RESTING_BANDS` [L34] are the union idiom to copy. `deriveMass` [L113] and `deriveLuminanceBand` [L130] both take `(value, range: Range)` — match that shape. `MIN_MASS`/`MAX_MASS`/`BASE_DISTANCE` are function-local; keep new constants local too.
- `src/derive/entities.ts` — **read-only, the input.** `ProjectEntity` [L25-44] carries `id`, `clientId`, `isDeep`, `mass`, `luminanceBand`, `railDistance`, `project`. `ClientEntity` [L47-54] has `id`, `name`, `projects`. `EntityGraph` [L57-59] is `{ clients }`. `deriveEntities(career, { asOf })` [L134]. **[L70] states "Story 1.5 pins the value it emits with"** — this story resolves that comment; update it to name the authored field.
- `src/derive/solve.ts` — **read-only.** `solveLayout(graph, { randomSource }): SolvedLayout` [L543]. `SolvedLayout.positions` [L49-51] is `Readonly<Record<string, Position>>` keyed by entity ID in Rail order, already `JSON.stringify`-stable. `Position` [L37-41] is `{x, y, z}` rounded to 4 decimals. **`inRailOrder` [L210] sorts Clients by earliest `duration.start`, which is not the recency `timeAxis` measures** — a Client's `timeAxis` must be the *most recent* of its Projects', and a test must bind the two orderings. Header [L19-20] names this story as the emitter's owner — correct it once emitted.
- `src/data/schema.ts` — **extend.** `CareerSchema` [L115] is `z.strictObject({ projects })`; add `asOf` using the private `IsoYearMonth` [L31]. Because `strictObject` rejects unknown top-level keys, adding the field to the schema is the only way `asOf` can be authored at all.
- `src/data/career.json` — **extend.** Add the top-level `asOf`. The only authored change in this story.
- `src/data/validate.ts` — **read-only, the idiom.** `validateCareer(raw): string[]` [L54] closes over `CareerSchema` and returns lines, never throws; `readCareerFile(path)` [L179] returns `{ok:true,data} | {ok:false,message}`. `validateArtifact` mirrors this result-value shape. Its `findDuplicateKeys` is **not exported** — do not reach for it.
- `src/data/validate.test.ts` — **read-only, the test idiom.** `node:test` flat `test()` calls, no `describe`; `strict as assert` with a rationale third argument; `.ts` import specifiers; a factory cloned per test; `assertFails(failures, pattern, why)` matching message content, never issue count; temp dirs via `mkdtempSync` cleaned in one `after`; subprocess via `execFileSync(process.execPath, [SCRIPT])`.
- `package.json` — **extend.** Add `solve` and a build gate. `validate` [L14] is `node src/data/validate.ts` — bare `node` on a `.ts` path, Node 24 native type stripping, no loader. Follow that form exactly. `zod` [L28] is already in `dependencies`.
- `tsconfig.json` — **read-only constraint.** `include: ["src", "vite.config.ts"]` — a `scripts/` directory would escape typecheck. `verbatimModuleSyntax` requires `import type`; `.ts` specifiers are load-bearing at runtime; `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are on.
- `.gitattributes` — **read-only.** `* text=auto eol=lf`, justified by this artifact being diffed. Write `\n`, never `os.EOL`.
- `src/derive/README.md` — **extend.** The `## Files` table [L10-20] takes rows per new module; append a `##` section on the artifact after `## The solve` [L98].
- `src/data/README.md` — **extend.** `## Adding an entry` step 4 is a forward reference to "the solve when it exists (Story 1.5)" — fill in the real command.

## Tasks & Acceptance

**Execution:**
- [x] `src/data/schema.ts` + `src/data/career.json` — add the required top-level `asOf` reference month, reusing `IsoYearMonth` — authored beside the entries it measures, so a re-solve is reproducible and no clock is ever read
- [x] `src/derive/rules.ts` — add `deriveMoteTier` and `deriveTimeAxis` as projections of values already on the graph — a fourth data-to-appearance mapping violates FR-3, so these derive from `mass`/`isDeep` and `duration`, never from a new authored field
- [x] `src/derive/artifact-schema.ts` — declare `ArtifactSchema` with a literal `SCHEMA_VERSION` and `validateArtifact` returning failure lines — an undeclared contract is no contract (AD-14)
- [x] `src/derive/artifact.ts` — pure `buildArtifact(graph, layout, asOf)` assembling the document and carrying each authored record whole — separated from I/O so parity is testable in memory
- [x] `src/derive/index.ts` — the pipeline CLI: validate → derive → solve → assemble → validate → write LF JSON with the banner, exiting non-zero and writing nothing on any failure — a partially written artifact is worse than none
- [x] `package.json` — add `solve`, and a `build` that gates on the artifact validating without invoking `solve` — deliberateness must be a property of the scripts, not of memory (AD-1)
- [x] `src/derive/artifact.test.ts` — bind `timeAxis` to `luminanceBand` and to the Rail over a fixture whose `duration.start` order deliberately opposes its recency order — the previous implementation passed 191 tests with the two orderings inverted, so only an opposing fixture can catch it
- [x] `src/derive/artifact.test.ts` + `src/derive/artifact-schema.test.ts` — cover every matrix row, prove parity field-by-field against the authored record, and pin the gate by mutation: a `build` that reaches `solve`, or a schema accepting `dwell`, must fail the suite
- [x] `generated/layout.generated.json` — emit and commit it
- [x] `src/derive/README.md` + `src/data/README.md` + `src/derive/entities.ts` [L70] + `src/derive/solve.ts` [L19-20] — document the artifact and resolve the two forward references naming this story

**Acceptance Criteria:**
- Given `npm run solve`, when it runs twice against unchanged input, then `git status --porcelain generated/` reports no modification after the second run.
- Given `npm run build`, when the artifact is deleted, then the build fails naming the missing artifact and the script that produces it.
- Given `npm run build`, when it succeeds, then the artifact's bytes are unchanged — the build reads it and never writes it.
- Given the emitted artifact, when its first line is inspected, then it carries a banner naming the generator and forbidding hand-editing, and the file's bytes contain no carriage return.
- Given the emitted artifact, when each Project is compared to its authored entry, then every authored field is present and equal — no truncation (FR-22).
- Given `src/derive/index.ts` and `src/derive/artifact.ts`, when inspected, then neither contains `new Date(`, `Math.random`, nor any environment read.
- Given `npm test`, when it runs, then the data, rules, entities, solve, and artifact suites all execute and it exits 0.
- Given `npm run typecheck`, when it runs, then it exits 0 under `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- Given a set whose `duration.start` order opposes its recency order, when the Projects are sorted by `timeAxis` and by `luminanceBand`, then the two orderings are identical.
- Given that same set, when `recencyRanks` is changed to rank on `duration.start`, then `npm test` fails — the binding is pinned by mutation, not asserted in prose.
- Given a Client, when its `timeAxis` is compared to its Projects', then it equals the greatest of them.
- Given the artifact schema, when inspected, then it declares no `dwell`, `shots`, or `destinations` field — those belong to stories 1.7 and 1.6.

### Review Findings

Review iteration 3 (2026-09-04). Four layers ran as subagents against the diff from `2ce1f69`; every finding below was independently reproduced before triage, and six subagent claims were dismissed as false or overstated.

- [x] [Review][Decision] `npm test` writes the committed artifact, and a corrupted artifact is silently repaired — **resolved: copy/restore in the test.** `artifact.test.ts:765` calls `runIndex()` with no arguments, running the real CLI, which writes `ARTIFACT_PATH`; the seam at `index.ts:200` is the *input* path, so no argument can redirect the write. The test now reads the bytes first and rewrites them in a `finally`, chosen over adding a CLI output argument so the emitter's public surface stays as the story specified it. The `finally` is what makes it hold: the regression this test exists to catch is the one that leaves the artifact wrong, so restoring only on the success path would still lose the evidence. Verified by reproduction — before: run 1 failed 3 and run 2 passed 188/188 with the corruption erased; after: run 1 and run 2 both fail 6 identically and the corruption survives. Note a deleted artifact was never silently recreated; that case already failed honestly and stably at 182/6.
- [x] [Review][Decision] The Client `timeAxis` tie-break is unverified and the tie is reachable by construction — **resolved: the tie fixture was added.** Deleting the tie-break at `artifact.ts:97` left the suite at 188/188; no fixture gave two Clients an equal `timeAxis`. `entities.ts:120` ranks equal recency identically by design, and every ongoing engagement clamps to the same `asOf` month, so ties are reachable rather than hypothetical — and once they occur, re-ordering `career.json` changes the artifact's bytes for no data change. `tiedEntries()` authors `Zeta` before `Alpha` with a shared `duration.end`, so authored order and ID order disagree and only the tie-break decides the emitted order. It carries its own opposition-style guard, matching `opposedEntries()`: if a future edit stops the two Clients tying, the guard fails rather than letting the ordering assertion pass vacuously. Verified by mutation — deleting the tie-break now fails the ordering test while the guard stays green, confirming the failure is the tie-break and not a broken fixture.
- [x] [Review][Patch] Build gate accepts an artifact with no banner [src/derive/index.ts:148] — fixed: `checkArtifact` now asserts the banner on line one, after schema validation so a malformed artifact still reports its real failure
- [x] [Review][Patch] Build gate accepts a CRLF artifact [src/derive/index.ts:148] — fixed: the gate rejects any artifact carrying a carriage return
- [x] [Review][Patch] Malformed-JSON gate branch is unpinned [src/derive/index.ts:151] — fixed: a test now drives `checkArtifact` with unparseable JSON; `catch { return []; }` no longer passes the suite
- [x] [Review][Patch] README overstates what the build gate catches [README.md:41] — fixed: the paragraph now states the gate catches malformed and hand-edited artifacts but not content drift, which `npm test` catches
- [x] [Review][Patch] `moteTier` graph range is unpinned [src/derive/entities.ts:239] — fixed: a graph-level test holds depth equal and varies span; the `massRange`→`spanRange` mutation that passed 188/188 now fails on exactly this test
- [x] [Review][Defer] An empty `clients` array validates clean [src/derive/artifact-schema.ts:110] — deferred, pre-existing
- [x] [Review][Defer] `content.weight` defaults past the FR-22 parity check [src/derive/artifact-schema.ts:127] — deferred, pre-existing
- [x] [Review][Defer] The gate detects shape drift but not content drift [src/derive/index.ts:148] — deferred, pre-existing
- [x] [Review][Defer] A single-entry set lands at the top of the mote ladder [src/derive/rules.ts:208] — deferred, pre-existing

## Spec Change Log

### Review iteration 2 — patches only, no loopback

The re-derived code was re-reviewed. The three parallel review subagents all terminated on a session rate limit before returning findings, so the layers were run inline instead — the fallback step-04 provides for when subagents are unavailable. No `intent_gap` and no `bad_spec` finding: the amended spec named the ordering constraint correctly and the implementation honoured it.

**Verified fixed, by mutation.** Replacing `recencyOf` with `duration.start` in `recencyRanks` now fails 95 tests. The same mutation passed 191/191 in iteration 1. The duplication that caused the original defect is gone — `recencyRanks` is a single exported function in `entities.ts`, so the two rankings can no longer drift rather than being held in step by a comment.

**Patched.** (1) The banner had slipped to line two while the AC, and `artifact.ts`'s own doc comment, both said line one — and the test titled "the first line carries a banner" was asserting against `split('
')[1]`. The serializer now lifts it and throws if the replacement no-ops; both tests read line one. (2) `checkArtifact` reported every read failure as "missing" and prescribed `npm run solve`; a directory standing where the file belongs throws EISDIR and was misreported — reproduced, then split so only ENOENT is "missing". (3) `writeFileSync` was unguarded, so a read-only file or full disk surfaced as a raw stack trace instead of a named failure and exit 1.

**KEEP — carried forward from iteration 1 and still true.** Everything in that entry's KEEP list survived re-derivation. Added to it: `recencyRanks` as one exported function rather than two mirrored copies; the positional career-path argument replacing iteration 1's `flagValue` helper, which removes the whole class of flag-parsing defects that review found; and the fixture-opposition guard, which fails if the opposing fixture stops opposing and would otherwise make every binding test silently vacuous.

**Deferred, not fixed:** an empty `clients` array validating clean, `content.weight` defaulting past a hand-edited artifact's parity check, and the gate not detecting content drift between `career.json` and a shape-valid artifact.

### Review iteration 1 — bad_spec loopback

Three review layers (blind-hunter, edge-case-hunter, verification-gap) ran against the diff from `2ce1f69`. All three converged on one root cause, and it was reproduced two ways before triage.

**The finding.** The Client's `timeAxis` is documented as reproducing the scene's Rail order, and does not. `solve.ts`'s `inRailOrder` sorts Clients by earliest `duration.start`; `timeAxis` derives from `recencyOf`, which reads `duration.end` clamped to `asOf`. For any portfolio holding a long early engagement beside a short late one the two orderings separate — reproduced with Alpha (2010-01 → 2025-01) and Beta (2012-01 → 2013-01), where the Fallback timeline reads Beta → Alpha while the Rail reads Alpha → Beta. The verification-gap layer independently swapped `recencyOf` for `duration.start` in `recencyRanks` and got 191/191 green, proving nothing binds the two. This is the scene/Fallback divergence AD-14 exists to prevent, shipping with the suite green.

**Why bad_spec, not patch.** The spec named `timeAxis` only as "the time-axis scalar (Fallback)" and never said which temporal quantity it measures, nor that Client ordering must agree with the Rail. An implementer could not have derived the constraint from the spec, and the choice between the two readings changes what every later Fallback story consumes. The amendment is in the Code Map and Design Notes; `<frozen-after-approval>` is untouched.

**What the amendment adds.** `timeAxis` is defined as measuring recency, the same quantity `luminanceBand` ranks; a Client's `timeAxis` is the most recent of its Projects', not the earliest; the two orderings must be bound by a test over a fixture where start order and recency order deliberately oppose; and the duplicated ranking in `recencyRanks` must be bound to `deriveEntities`' ranking rather than mirroring it by comment.

**KEEP — must survive re-derivation.**
- The `$banner` JSON field lifted onto line one by `serializeArtifact` and removed by `stripBanner` before validation, with the schema neither declaring nor accepting it. JSON has no comment syntax and this satisfies AD-13 without polluting the contract.
- The `--check` argv branch in `index.ts` rather than a second script file, so the artifact path and schema are named in exactly one place and `tsconfig`'s `include: ["src"]` still covers the gate.
- The transitive `package.json` script-graph walk that fails if `build` reaches `solve` through any depth of `npm run` indirection — strictly stronger than the assertion it replaced in `solve.test.ts`.
- The signature-level FR-3 guard in `rules.test.ts`, which reads the projections' actual parameter lists and fails if either names `Project`, `Duration`, or an authored field. It replaced a `derive*` prefix count and is a structural test of the property rather than of a naming convention.
- The test-parallelism fix: `validate.ts` and `index.ts` taking optional path arguments so no test writes into `src/`. A test corrupting the committed `career.json` under `node --test`'s parallelism is a real hazard that already bit once.
- `buildArtifact` staying pure, with `index.ts` owning all I/O and exit codes.
- Content parity asserted field-by-field against the authored record rather than by field count.


## Design Notes

**`asOf` is authored, not clocked or passed.** `entities.ts` [L70] deferred this choice to this story. A clock read makes the committed artifact churn monthly for no authored change, defeating AD-2. A CLI argument lives in nobody's file, so the artifact could not be reproduced without knowing what was typed. Authoring it in `career.json` puts the reference month beside the entries it measures, gets `strictObject` validation for free, and makes bumping it the same deliberate one-line gesture as adding an entry.

**`timeAxis` measures recency, and a Client sits at its most recent Project.** The scene and the Fallback project the same data two ways, so the one thing they must never do is order Clients differently. `timeAxis` ranks the same quantity `luminanceBand` does — `recencyOf`, which is `duration.end` clamped to `asOf` — so a brighter Body is always further along the Fallback's axis. A Client therefore takes the **maximum** of its Projects' `timeAxis`, not the minimum: a Client is as recent as the most recent work done for it, which is what a reader means by where an engagement sits in time. Taking the minimum instead places a Client by its oldest Project, so a long early engagement outranks a short late one on the Fallback while the scene's Rail — which sorts on `duration.start` — disagrees. Note the Rail's own sort key is `start` and stays that way; the artifact must not claim the two orderings coincide, so whichever ordering the Fallback reproduces has to be the one it actually carries, bound by a test rather than by a comment.

**`moteTier` and `timeAxis` are projections, not a fourth rule.** FR-3 permits exactly three mappings from authored data to appearance. Both read values the graph already carries — `moteTier` from `mass` and `isDeep`, `timeAxis` from `duration` — so no new authored field reaches a visual property. They exist here because AD-14 requires the artifact to carry them and no other story in the epic derives them: 1.6 is destinations, 1.7 is Dwell and Shots, 1.8 is boundaries.

**The version starts at 1 and the schema is closed.** `dwell`, `shots`, and `destinations` are deliberately absent rather than declared-and-empty. A required field nothing populates would make the emitted artifact fail its own gate until 1.7 lands — precisely what the gate exists to prevent. Stories 1.6 and 1.7 each add their fields and bump `SCHEMA_VERSION`.

**Assembly is separate from I/O.** `buildArtifact` is pure so content parity can be asserted field-by-field in memory. `index.ts` owns reading, writing, and exit codes — the same split `validate.ts` already uses, and the reason `solve.test.ts` can assert its own module touches no filesystem.

## Verification

**Commands:**
- `npm run solve` — expected: exits 0, writes `generated/layout.generated.json`.
- `npm run solve` then `git status --porcelain generated/` — expected: no output after a second run; the solve is deterministic.
- `npm run build` — expected: exits 0 against the committed artifact, and does not rewrite it.
- `npm test` — expected: exits 0; data, rules, entities, solve, and artifact suites all run.
- `npm run typecheck` — expected: exits 0 with no diagnostics.
- `npm run validate` — expected: exits 0 against `career.json` carrying its new `asOf`.

## Suggested Review Order

**The contract**

- The shape every later epic reads; start here to grasp the design intent.
  [`artifact-schema.ts:107`](../../src/derive/artifact-schema.ts#L107)

- A literal, so changing the shape means changing this line.
  [`artifact-schema.ts:32`](../../src/derive/artifact-schema.ts#L32)

- Returns failure lines and never throws, mirroring `validateCareer`.
  [`artifact-schema.ts:136`](../../src/derive/artifact-schema.ts#L136)

**The ordering constraint that failed review once**

- One exported ranking, so `timeAxis` and `luminanceBand` cannot drift apart.
  [`entities.ts:124`](../../src/derive/entities.ts#L124)

- Measures recency, never `duration.start` — the defect iteration 1 shipped.
  [`rules.ts:234`](../../src/derive/rules.ts#L234)

- Splits the tier ladder so depth reads at every mass.
  [`rules.ts:208`](../../src/derive/rules.ts#L208)

**Assembly and emission**

- Pure, so parity is provable without touching the filesystem.
  [`artifact.ts:89`](../../src/derive/artifact.ts#L89)

- Lifts the banner to line one and throws rather than shipping it below the fold.
  [`artifact.ts:136`](../../src/derive/artifact.ts#L136)

- Two modes, one file, so the gate and emitter name one path.
  [`index.ts:77`](../../src/derive/index.ts#L77)

- Reads and validates only; ENOENT is "missing", anything else is not.
  [`index.ts:132`](../../src/derive/index.ts#L132)

**The build gate (AD-1)**

- `build` reaches `gate`, never `solve` — the deliberateness the epic requires.
  [`package.json:11`](../../package.json#L11)

- The authored reference month, without which no clock is read.
  [`schema.ts:131`](../../src/data/schema.ts#L131)

**Tests that pin the guarantees**

- Fails if the fixture stops opposing, which would make every binding vacuous.
  [`artifact.test.ts:106`](../../src/derive/artifact.test.ts#L106)

- The binding that iteration 1 lacked; the `duration.start` mutation now fails 95 tests.
  [`artifact.test.ts:126`](../../src/derive/artifact.test.ts#L126)

- States honestly that `timeAxis` is not the Rail order, and neither claims to be.
  [`artifact.test.ts:213`](../../src/derive/artifact.test.ts#L213)

- Walks the script graph, so indirection cannot hide a solve in the build.
  [`artifact.test.ts:631`](../../src/derive/artifact.test.ts#L631)
