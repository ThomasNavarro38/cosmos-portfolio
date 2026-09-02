---
title: 'Story 1.2: Authored career data with a build-gating schema'
type: 'feature'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 1
baseline_commit: 'ac61ea335e76fc89647ac1d41e020354d39f6bf6'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Entities are classified by which fields they lack (FR-5), so a misspelled field name does not error — it silently reclassifies an entry. A `notabel` typo turns a Deep Project into a Shallow one, and every downstream derivation, position, and rendered panel inherits that lie without a single warning.

**Approach:** Author `src/data/career.json` as the one hand-authored source, and gate it with a strict schema in `src/data/schema.ts` that rejects unknown fields outright. A validation script exits non-zero on any violation, naming both the offending field and the human-readable entry it appeared on.

## Boundaries & Constraints

**Always:**
- The Project field set is exactly: `client`, `project`, `company`, `role`, `built`, `team_size`, `duration`, `notable`, `skills`, `weight`. No entry has a field another lacks.
- `duration` is required on every Project — FR-3 derives both mass and recency from it.
- `weight` is optional, defaults to `1`, and is the only hand-authored number in the file.
- Unknown fields are rejected, not ignored. Failure is loud: non-zero exit naming the field and the entry.
- Deep/Shallow is decided by `notable` alone. Absent, `null`, and `""` are all Shallow and must be accepted as valid.
- All dates are ISO 8601. No display formatting appears in authored data.
- Exact version pins, no `^`/`~`, no prerelease lines.

**Ask First:**
- Any dependency beyond `zod@4.5.4`.
- Any change to the ten-field Project set, or to `duration`'s shape.
- Publishing a real end-client name not already approved in the inventory draft.

**Never:**
- No type flag, `kind` field, or schema variant distinguishing Deep from Shallow.
- No second hand-authored number beyond `weight`.
- No derivation, mapping rule, or `isDeep` computation — Story 1.3 owns those.
- No solver, artifact emission, or `generated/` write — Stories 1.4/1.5.
- No import of `src/data/` from outside `src/derive/`.
- No network fetch, CMS, API, or environment variable.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid file | `career.json` with the approved SNCF entry | Validation passes, exit 0 | N/A |
| Unknown field | An entry carrying `notabel` | Exit non-zero; message names `notabel` **and** the entry by `client` — `project` | Fail the build |
| Deep by absence | Entry with populated `notable` | Passes; Deep with no type flag in the file | N/A |
| Shallow, three ways | `notable` absent, `null`, or `""` | All pass; all Shallow; no schema variant | N/A |
| Missing `duration` | Entry with no `duration` | Exit non-zero naming the entry and `duration` | Fail the build |
| Omitted `weight` | Entry with no `weight` | Passes; resolves to `1` | N/A |
| Non-ISO date | `duration.start` is `"March 2019"` | Exit non-zero naming the ISO 8601 requirement | Fail the build |
| Malformed JSON | `career.json` is not parseable | Exit non-zero with the parse error, not a stack trace | Fail the build |

</frozen-after-approval>

## Code Map

- `src/data/career.json` -- **to create.** The single authored source. Ships with the approved SNCF MDM entry; the second SNCF project is undrafted and stays out.
- `src/data/schema.ts` -- **to create.** Zod schema, exported inferred types (`Project`, `Career`), and the strict-object definitions. The only place the field set is written down.
- `src/data/validate.ts` -- **to create.** Reads + parses the JSON, runs the schema, formats failures, exits 0/1. Invoked by the `validate` npm script.
- `src/data/README.md` -- **exists, extend.** Already states the AD-3 import boundary. Add what `career.json` and the schema are, and how to run validation.
- `package.json` -- **exists, extend.** Add `zod@4.5.4` to `dependencies` (exact pin) and a `validate` script. Existing pins are untouched.
- `tsconfig.json` -- **read-only.** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `resolveJsonModule` all on. Verified this session: the Zod schema below typechecks clean under every one of these flags.
- `_bmad-output/planning-artifacts/briefs/brief-cosmos-portfolio-2026-08-31/inventory-draft.md` -- **read-only.** L29–48 hold the approved SNCF entry: client, project, role, team of 11, the `built` summary, the two-paragraph `notable`, and the skills list. `company` is `_(intermediate — to fill)_`; no dates are recorded anywhere.
- `_bmad-output/planning-artifacts/epics.md` -- **read-only.** Story 1.2 ACs at L473–500.

**Library verification (registry + live probe, this session):** `zod@4.5.4` is the stable `latest`; `4.x` publishes `4.1.13-beta.0` and `4.5.0-canary.*` on separate tags, so the exact pin takes no prerelease. A probe under this project's exact tsconfig flags confirmed all six behaviours: `weight` default, `unrecognized_keys` on a typo, the three Shallow forms, missing-`duration` rejection, non-ISO rejection, and inferred types surviving `exactOptionalPropertyTypes`.

**Reuse:** nothing to reuse — `src/data/` holds only its README stub. Story 1.1 established the pinning discipline and stub conventions this story follows.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- add `"zod": "4.5.4"` to `dependencies`, a `"validate": "node src/data/validate.ts"` script, and a `"test": "node --test src/data/*.test.ts"` script -- without a `test` script the suite is reachable only by a hand-typed path, and the schema's load-bearing line can be deleted with every documented command still green
- [x] `src/data/schema.ts` -- define `DurationSchema` and `ProjectSchema` with `z.strictObject`, export inferred `Project`/`Career` types -- `strictObject` is what turns an unknown field from silent reclassification into a build failure
- [x] `src/data/schema.ts` -- constrain the four fields whose loose values corrupt derivation silently: `duration` refined so `end` is `null` or `>= start`; `notable` trimmed so whitespace-only is Shallow; `weight` positive; `client`/`project` trimmed non-empty -- each of these otherwise reaches Story 1.3 as a plausible-looking wrong value rather than an error
- [x] `src/data/career.json` -- author the approved SNCF MDM entry across all ten fields -- proves the schema against real content, not a fixture
- [x] `src/data/validate.ts` -- read, parse, validate; on failure print each issue as `<client> — <project>: <message>` and `process.exit(1)` -- Zod reports the entry as an array index, so the formatter must resolve it back to names for the log to be usable
- [x] `src/data/validate.ts` -- reject duplicate JSON keys during parse -- `JSON.parse` collapses `"notable":"prose"` then `"notable":""` to the empty string before the schema sees it, silently demoting a Deep Project; `strictObject` structurally cannot catch this
- [x] `src/data/validate.test.ts` -- cover every I/O matrix row against in-memory fixtures; assert on message content, never on issue count; add a subprocess test asserting the CLI's exit code both ways -- the matrix is the contract, and the exit code is the script's only externally observable behaviour
- [x] `src/data/README.md` -- document `career.json`, the schema, both scripts, and the add-an-entry procedure -- the maintenance promise is the epic's stated value

**Acceptance Criteria:**
- Given the schema, when it is inspected, then it defines exactly the ten Project fields, `duration` required, `weight` optional defaulting to `1`, and no field encodes entity kind.
- Given a clean checkout, when `npm run validate` runs against the committed `career.json`, then it exits 0.
- Given the SNCF entry's populated `notable`, when validation runs, then it passes and the entry is Deep by absence-classification alone, with no type flag anywhere in the file.
- Given `npm run typecheck`, when it runs, then it exits 0 with the schema's inferred types in use.
- Given the repository is searched, when `career.json` is inspected, then `weight` is the only hand-authored *tuning* number and every date is ISO 8601. (`team_size` is factual content required by the ten-field set, not a tuning value.)
- Given `npm test`, when it runs, then it executes the full suite and exits 0.
- Given `z.strictObject` is weakened to `z.object` in the schema, when `npm test` runs, then it fails — the guard is pinned by a reachable command, not only by a hand-typed one.
- Given invalid data, when `src/data/validate.ts` is run as a process, then it exits 1 and writes the failure lines to stderr.

## Spec Change Log

**2026-09-02 — SNCF dates are placeholders pending the maintainer.** The approved inventory entry records no dates, and `duration` is required because FR-3 derives mass and recency from it. The entry ships with clearly-marked placeholder `start`/`end` months so the story is shippable and the schema is exercised against real content. Thomas replaces them with the actual engagement months; no schema or structural change is involved.

**2026-09-02 — `company` is `null` on the SNCF entry.** The inventory records the intermediate consultancy as `_(intermediate — to fill)_`. Decided at planning: `company` is `string | null` in the schema and `null` in the data, rather than a placeholder string that the Colophon (Epic 5) would render verbatim. Filling it later needs no schema change.

**2026-09-02 — The gate was unreachable, and the schema accepted data that corrupts derivation silently (review loop 1).**

*Triggering findings.* All three review layers independently found that `validate.test.ts` is reachable from no project command: the spec's Verification section named `node --test src/data/validate.test.ts`, but the task list never required a `test` script. Mutation-verified during triage — replacing `z.strictObject` with `z.object` (the story's single load-bearing line) leaves `npm run validate`, `npm run typecheck`, and `npm run build` all exiting 0, while the two tests that catch it never run. Separately, direct execution against the built schema confirmed it accepts `end` before `start`, whitespace-only `notable`, and non-positive `weight`; and that `JSON.parse` silently collapses duplicate keys, so `"notable":"prose"` followed by `"notable":""` validates clean as Shallow.

*What was amended.* Added a `test` script to the `package.json` task and three acceptance criteria pinning it (suite runs from `npm test`; weakening `strictObject` fails that command; the CLI exits 1 on invalid data). Added a schema task constraining the four silent-misclassifiers, a validator task rejecting duplicate JSON keys, and a test-task instruction to assert on message content rather than issue count. Clarified the "only hand-authored number" AC to say *tuning* number, since `team_size` is factual content required by the frozen ten-field set and the original wording read as a contradiction.

*Known-bad state avoided.* Shipping a story whose entire deliverable — a loud gate against silent reclassification — could be deleted with every documented command reporting success, while the schema itself passed three further classes of silent reclassification straight through to Story 1.3's derivation.

*Scope decisions (Thomas, review loop 1).* Tighten the silent-misclassifiers only — `end >= start`, trimmed `notable`, positive `weight`, trimmed `client`/`project`. Empty `skills`, empty `projects`, and year plausibility bounds are deliberately left accepted and documented, not enforced: each is a judgement call this story never scoped and could fight real data during authoring. Duplicate-key detection is in scope for this story rather than deferred to 1.8, because Stories 1.3–1.7 author data against this gate.

*KEEP — must survive re-derivation.* The index-to-name error resolution in `labelFor` (Zod reports `["projects", 1]`; the log needs `SNCF — Client referential`), including its graceful fallbacks for a missing `client`/`project`. The split of `validateCareer` from `readCareerFile` so tests drive in-memory fixtures. The guarded `main()` so importing the module in tests does not execute it. The `notable: nullish()` treatment of absent/`null`/`""` as one Shallow case. `career.json`'s authored content exactly as it stands — the SNCF entry, `company: null`, and the placeholder `duration` are all settled and must not be re-litigated. The `src/data/README.md` structure and its `strictObject` rationale. The `@types/node` + `allowImportingTsExtensions` decision (see next entry).

**2026-09-02 — Round 2 review: two patches, no loopback.** The edge-case layer returned 26 findings; the blind-hunter and verification-gap layers terminated on a session rate limit and were not re-run (Thomas's call — round 1 had run all three layers on substantially the same code and driven a full loopback, and round 2's confirmations were verified directly by mutation and duplicate-key testing). No `intent_gap` or `bad_spec` finding, so no second loopback. Applied: a 30s `timeout` on the subprocess helper's `execFileSync` (`validate.test.ts`), since an unbounded hung child blocks the whole suite; and an explicit Node-major guard in `main()` (`validate.ts`), because `engines` is advisory and an older Node otherwise fails as an opaque TypeScript syntax error naming the symptom rather than the cause. Notable refutations, each verified by execution rather than reading: `node --test` expands the `src/data/*.test.ts` glob itself, so the suite does not pass vacuously on a shell that leaves it unexpanded; `weight: Infinity` is already rejected; and `labelFor`'s fallbacks degrade cleanly on `null`, a non-array `projects`, and a non-string `client`. `team_size` upper bounds and duplicate `skills` entries were deferred, consistent with the standing scope decision to document rather than enforce.

**2026-09-02 — `@types/node` and `allowImportingTsExtensions` ratified (review loop 1).** The implementation added `@types/node@24.13.3` and set `allowImportingTsExtensions` in `tsconfig.json`, which this spec listed as read-only and gated behind "Ask First." Both are forced by the spec's own acceptance criterion that `npm run typecheck` exits 0: Node-executed TypeScript cannot typecheck without Node's ambient types, and Node 24's native type stripping requires `.ts` import specifiers that `tsc` otherwise rejects. Story 1.1's `vite.config.ts` comment had already named `@types/node` as the deferred correct fix. Verified during review: neither reaches the browser bundle — `npm run build` output is unchanged and no file outside `src/data/` imports the schema. Ratified rather than treated as a deviation. Scoping `allowImportingTsExtensions` to a separate tsconfig is logged as deferred work for Story 1.8, which owns config and lint gates.

## Design Notes

**Why `strictObject` and not `object`.** Zod's default `object` strips unknown keys silently — which is precisely the failure this story exists to prevent. `strictObject` raises `unrecognized_keys` instead. This is the single most load-bearing line in the schema.

**The error path needs translating.** A verified probe returns path `["projects", 1]` for a typo — an array index. The AC demands the message name "the entry it appeared on," and an index is a poor answer in a build log. The formatter resolves the index back to the raw entry's `client` and `project`:

```ts
for (const issue of result.error.issues) {
  const [, index] = issue.path;                  // ["projects", 1]
  const entry = raw.projects?.[Number(index)];
  const label = entry ? `${entry.client} — ${entry.project}` : `entry #${index}`;
  console.error(`${label}: ${issue.message}`);
}
```

**`duration` shape.** `{ start, end }` as ISO `YYYY-MM`, `end: null` meaning ongoing. Mass derives from the span and recency from `end`; both come from one authored value, so no second hand-authored number appears. Story 1.3 consumes this and it is deliberately not derived here.

**`notable: z.string().nullish()`** accepts absent, `null`, and `""` identically. The schema does not classify — it only permits all three forms so Story 1.3 can treat them as one. Promotion of a Shallow entry to Deep stays free: populate the string, change nothing else. Trim before the check so `"   "` is Shallow too, and note in the README that the three forms differ in *parsed shape* (absent yields nine keys, `null` and `""` yield ten) even though all three mean Shallow — Story 1.3's classifier must handle `undefined`, `null`, and `""` as one case.

**Constrain only what corrupts silently.** The four added constraints share one property: without them the value is not rejected, it is *accepted as something plausible and wrong*. An inverted `duration` yields a negative span into FR-3's mass derivation; a whitespace-only `notable` classifies as Deep and renders a blank panel; a `weight` of `0` is a degenerate distance. Empty `skills` and empty `projects` fail visibly and immediately instead, so they stay accepted and documented rather than enforced.

**Duplicate keys need a parse-time guard.** `strictObject` compares against the *parsed* object, by which point `JSON.parse` has already collapsed `"notable":"prose"` then `"notable":""` into the empty string. The check therefore belongs in `readCareerFile`, before validation — walk the raw text (or use a reviver that records seen paths) and fail naming the repeated key and its entry.

**Assert on content, not issue count.** Zod aggregates rather than short-circuiting: an entry with a typo *plus* a bad `team_size` *plus* a bad date returns three issues, not one. `assert.equal(failures.length, 1)` therefore pins the fixture's pristineness rather than the behaviour under test. Use `assert.ok(failures.some(l => /notabel/.test(l)))`.

## Verification

**Commands:**
- `npm install` -- expected: exits 0, no peer-dependency warnings
- `npm run validate` -- expected: exits 0 on the committed data
- `npm run typecheck` -- expected: exits 0
- `npm test` -- expected: exits 0, full suite runs (this is the reachable command; a hand-typed path is not sufficient)
- **Mutation check** — replace `z.strictObject` with `z.object` in `src/data/schema.ts`, run `npm test`, expect **failure**, then restore -- proves the story's load-bearing line is pinned by a command the project actually runs
- **Duplicate-key check** — author `"notable"` twice in one entry, run `npm run validate`, expect exit 1 naming the repeated key, then restore
- `node -e "const p=require('./package.json');console.log(/^[\^~]/.test(p.dependencies.zod)||/alpha|beta|canary|rc/.test(p.dependencies.zod)?'BAD':'exact')"` -- expected: `exact`
- `grep -rn "kind\|type.*:.*'deep'\|isDeep" src/data/` -- expected: no matches; entity kind is never a field

## Suggested Review Order

**The gate itself**

- The load-bearing line: rejects unknown fields instead of silently stripping them.
  [`schema.ts:77`](../../src/data/schema.ts#L77)

- Makes that line reachable — without it the gate can be deleted with every command green.
  [`package.json:15`](../../package.json#L15)

- Proves the gate is pinned: weakening the schema fails this suite.
  [`validate.test.ts:76`](../../src/data/validate.test.ts#L76)

**Silent-misclassification guards**

- Duplicate keys collapse in `JSON.parse` before the schema sees them; scanned in raw text.
  [`validate.ts:81`](../../src/data/validate.ts#L81)

- Runs after parse, before validation — malformed input still reports a parse error first.
  [`validate.ts:196`](../../src/data/validate.ts#L196)

- Inverted spans reach FR-3's mass derivation as a negative number otherwise.
  [`schema.ts:55`](../../src/data/schema.ts#L55)

- Trimmed so whitespace-only collapses into the existing Shallow set, not a fourth form.
  [`schema.ts:85`](../../src/data/schema.ts#L85)

- Positive: `0` and `-5` are degenerate as a distance from the Rail.
  [`schema.ts:90`](../../src/data/schema.ts#L90)

- Shared trim-then-reject, so whitespace-only names cannot produce an unnamed Star.
  [`schema.ts:25`](../../src/data/schema.ts#L25)

**Error legibility**

- Resolves Zod's array index back to `client — project`; an index is useless in a build log.
  [`validate.ts:26`](../../src/data/validate.ts#L26)

- Split from file reading so tests drive in-memory fixtures without touching disk.
  [`validate.ts:54`](../../src/data/validate.ts#L54)

- Names the cause, not the symptom, when Node predates native type stripping.
  [`validate.ts:223`](../../src/data/validate.ts#L223)

**Supporting**

- Asserts on message content, never issue count — Zod aggregates rather than short-circuiting.
  [`validate.test.ts:49`](../../src/data/validate.test.ts#L49)

- The exit code is the script's only external contract; in-process tests never see it.
  [`validate.test.ts:375`](../../src/data/validate.test.ts#L375)

- The approved SNCF entry. `company` and `duration` carry documented placeholders.
  [`career.json:1`](../../src/data/career.json#L1)
