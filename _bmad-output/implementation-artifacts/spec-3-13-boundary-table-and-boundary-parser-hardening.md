---
title: 'Boundary table and boundary parser hardening'
type: 'feature'
created: '2026-10-12'
status: 'done'
review_loop_iteration: 1
baseline_commit: 'bf381999162c49682f36d22d0519c54821bc31a0'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Four boundaries the READMEs declare are not gate rows, and each was verified to pass clean (retro B-3, B-4, B-5, and the derive half of B-2): `src/derive/` importing `three`; `render-fallback` importing `@react-three/fiber` or `drei`; `render-scene` ↔ `render-fallback`; and any runtime module under `src/types/`, which escapes every rule. The entry path does not ban `d3-force-3d`. Separately, `findImports` silently returns nothing for `require(...)`, `createRequire`, and `import(p)`, so `src/data/README.md:6`'s "a dynamic `import(...)` does not escape it" is false. Closes `epic-1-retro-item-6` and `-7`.

**Approach:** Add the missing rows, and narrow the `types` exemption to ambient declaration files. Teach the parser a third import kind, `unresolvable`, which every governed non-test file fails on. Test files are excused because they never ship, and `solve.test.ts`'s mutant loader needs a computed `import()` (Thomas, 2026-10-12). Narrow the README claim to literal specifiers.

## Boundaries & Constraints

**Always:** Every new row and every new failure class gets a mutation test over a `treeOf` temp fixture, written as a fixed expectation rather than a loop over `BOUNDARY_RULES`. Each row's prose lives on the README line its `source` cites. Failure lines name `file:line` and what was written. Line numbers survive stripping. The committed `src/` tree stays clean. No new dependency.

**Ask First:** Any new rule beyond those listed here, such as a `colophon` package ban.

**Never:** Resolve or evaluate a computed specifier. Rejecting it is the fix. Do not switch to ESLint or the TS AST. Do not ban `zustand` anywhere (`packageOf` cannot express `zustand/react`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Derive + Three/React | `derive/x.ts` imports `three`, `@react-three/fiber`, `@react-three/drei`, `react`, `react-dom` | each fails naming the package | violation |
| Entry + solver | `App.tsx` or `shell/entry.ts` imports `d3-force-3d` | fails | violation |
| Fallback + R3F | `render-fallback/x.ts` imports `@react-three/fiber` or `@react-three/drei` | fails | violation |
| Cross-renderer | `render-scene` → `../render-fallback/x`, and the reverse, static or dynamic | fails `never` | violation |
| Types runtime module | `types/probe.ts` (any content) | fails: only `.d.ts`/`.d.mts`/`.d.cts` may live in `src/types/` | violation |
| Types ambient | `types/x.d.ts` | accepted | N/A |
| require | `require('../data/x')`, `import x = require('y')` | `unresolvable`, fails | violation |
| createRequire | any `createRequire` identifier (import clause or call) | `unresolvable`, fails | violation |
| Computed import | `import(p)`, `import('../data/' + n)`, `` import(`../${d}/x`) `` | `unresolvable`, fails | violation |
| Test file | `*.test.ts` with `import(pathToFileURL(p).href)` or `require` | accepted (never shipped); the literal-specifier rules still apply | N/A |
| Literal import | `import('x')`, `` import(`x`) ``, `import('x', { with: … })`, multi-line | `dynamic`, as today | N/A |
| Decoys | `require(` / `createRequire` / `import(p)` in a comment or string; `obj.require(x)` | no finding | N/A |

</frozen-after-approval>

## Code Map

- `src/derive/boundaries.ts` -- `BOUNDARY_RULES`:112 (`derive`:128, `shell`:139, `render-scene`:162, `render-fallback`:183); `UNGOVERNED`:197; `ROOT_RULE`:254; `ImportKind`:50; `findImports`:545 (the `dynamic` regex at :570 is replaced by a scan; `statik` at :583 still skips `import(`); `checkImportBoundaries`:699, where the per-file loop skips `types/` via `rule === undefined` at :731.
- `src/derive/boundaries.test.ts` -- `treeOf`:49, `assertRejects`/`assertAccepts`:70-84, `DECLARED_NEVER_EDGES`:149 (add the two cross-renderer edges), the classifier test:479, and the template dynamic test:513 (stays `dynamic`).
- `src/derive/maintenance.test.ts:484` and `scripts/tokens.test.ts:581` -- consumers of `findImports`. They ignore unknown kinds; the tokens test expects `[]`.
- READMEs cited by `source`: `README.md:45` (add `d3-force-3d`), `src/shell/README.md:5`, `src/derive/README.md:5`, `src/render-scene/README.md:5`, `src/render-fallback/README.md:5`, and `src/data/README.md:6` (narrow the claim). The test at boundaries.test.ts:714 keeps the citations honest.
- Only string fixtures under `src/` contain `require(`, and they are stripped. Verify that the committed tree stays clean.

## Tasks & Acceptance

**Execution:**
- [x] `src/derive/boundaries.test.ts` -- write the matrix rows first, red against the current code -- TDD.
- [x] `src/derive/boundaries.ts` -- rows:
  - `derive` gets `neverPackages` for the three 3D packages plus `react` and `react-dom` (approved by Thomas).
  - `ROOT_RULE` and `shell` add `d3-force-3d`.
  - `render-fallback` adds R3F and drei.
  - `render-scene` and `render-fallback` each `never` the other.
  - A `types/` file that is not a declaration file fails, counted as a violation.

  Parser: `ImportKind` gains `'unresolvable'`, with `specifier` holding the authored excerpt (trimmed, capped). `checkImportBoundaries` fails any `unresolvable` in a governed file with a line saying the gate cannot resolve it and to write a string literal -- items 6 and 7.
- [x] READMEs listed in the Code Map -- state each new ban on the cited line. In `src/data/README.md:6`: a literal specifier does not escape the ban, and a specifier the gate cannot read fails as unresolvable -- AC 2.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml`, `deferred-work.md` -- mark items 6 and 7 done and strike the closed deferred entries.

**Acceptance Criteria:**
- Given the committed tree, when `npm run gate` runs, then it exits 0. Given any matrix violation in a fixture, then `checkImportBoundaries` fails naming `file:line`.
- Given a rule row from this story is deleted, when the suite runs, then a test goes red (verified by reverting each row once).

### Review Findings

- [x] [Review][Decision] Test-module import ban added without Ask First sign-off — resolved: kept, approved by Thomas (2026-10-12); matcher to be widened (patch below).
- [x] [Review][Patch] `TEST_SPECIFIER` is relative-only (`^\.`), so an aliased, root-absolute or `?raw`-suffixed test specifier is not caught — match any specifier whose path ends `.test` (extension optional), query stripped [src/derive/boundaries.ts:232]
- [x] [Review][Patch] `require` scan's object-key exclusion `(?!\s*:)` misfires: `flag ? require : null` passes silently (verified `[]`), and an optional key `require?: boolean` fails the gate. Exclude only a key position (preceded by `{`/`,`, followed by `\??\s*:`) [src/derive/boundaries.ts:688]
- [x] [Review][Patch] Template interpolation brace counting ignores strings: `` `${'}' + require('../data/x.ts')}` `` closes the span early and the `require` is blanked (verified `[]`) [src/derive/boundaries.ts:529]
- [x] [Review][Patch] A class/object method named `import` (`class A { import(p) {} }`) is reported unresolvable and would fail the gate (verified) [src/derive/boundaries.ts:657]
- [x] [Review][Patch] Excerpt appends `…` when the construct ends exactly at the 120-char cap, though nothing was cut [src/derive/boundaries.ts:649]
- [x] [Review][Patch] `src/types/` runtime-module failure line names no `file:line`, against "Failure lines name `file:line`" [src/derive/boundaries.ts:869]
- [x] [Review][Patch] Unread load forms undocumented: member forms (`System.import`, `module.require`, `globalThis.require`, `{ require: r } = globalThis` — all verified `[]`; `System.import` was reported before this change), `eval`/`new Function`, `new Worker('…')`, `import.meta.resolve`, `?url`/`?worker` queries. Name them in the caveat and the deferred entry; root README omits the caveat entirely [src/data/README.md:6]
- [x] [Review][Patch] Design Notes describe regexes the code does not use (`require` is any reference, not only a call; `import(` excludes members) [spec-3-13 Design Notes]
- [x] [Review][Patch] Struck deferred-work entries keep stale present-tense bodies and anchors ("nothing stops `render-scene/`…", `src/derive/README.md:24`) [_bmad-output/implementation-artifacts/deferred-work.md:45]
- [x] [Review][Patch] AC 2's per-row revert proof is unrecorded — revert each new row once and record which test goes red [spec-3-13 Tasks & Acceptance]
- [x] [Review][Defer] Test-file excuse is `*.test.*` only — `*.spec.*`, `__tests__/` and the planned 3.14 shared test helpers would be governed shipped files [src/derive/boundaries.ts:229] — deferred, pre-existing

**AC 2 revert proof (2026-10-12, code review):** each row reverted once alone, `node --test src/derive/boundaries.test.ts` red every time:

| Row reverted | Goes red |
|---|---|
| `derive` `neverPackages` | every package ban the READMEs declare is rejected… |
| `shell` bans `d3-force-3d` | same |
| `ROOT_RULE` bans `d3-force-3d` | same |
| `render-fallback` bans R3F and drei | same |
| `render-scene` never `render-fallback` | every never edge…; the cross-renderer edge is refused…; the rule table declares no fewer never edges… |
| `render-fallback` never `render-scene` | same three |
| `src/types/` declaration-only | a runtime module under src/types/ fails…; …names file and line… |
| unresolvable fails in shipped files | an unresolvable import fails the gate…; a test file may load a module it cannot name… |
| test-module import ban | a shipped module may not import a test module…; a test module is refused however… |


## Design Notes

A dynamic import matches `(?<![\w$.])import\s*\(`, so a member call (`loader.import(x)`, `System.import(x)`) or a `$`-prefixed name is not one. It is `dynamic` only when the stripped code after `import(` holds exactly one string literal, followed by `)` or `,`. For a template, the original text must hold no `${`. A method *definition* named `import` is skipped: it sits at a member position and its parameters are followed by a body on the same line. Anything else is `unresolvable`. `require` matches any reference, `(?<![\w$.])require(?![\w$])`, not only a call, because `require?.(x)` and `const r = require` load too. A key is excluded (`require:` or `require?:` not preceded by `?`), so a ternary branch still counts. `createRequire` matches `\bcreateRequire\b`, so an aliased import is still caught. Template interpolations are closed by brace depth, skipping strings and comments. The member and string-built forms that are left are listed in `src/data/README.md:6` and in `deferred-work.md`.

## Verification

**Commands:**
- `npm test` -- expected: all green
- `npm run typecheck` -- expected: exit 0
- `npm run gate` -- expected: exit 0

## Suggested Review Order

**The unresolvable kind**

- Entry point: a third import kind, so a load the scan cannot read is reported, never dropped.
  [`boundaries.ts:56`](../../src/derive/boundaries.ts#L56)

- Every governed shipped file fails on one; test files excused because they never ship.
  [`boundaries.ts:881`](../../src/derive/boundaries.ts#L881)

- The excuse's premise, enforced: a shipped module may not import a test module.
  [`boundaries.ts:900`](../../src/derive/boundaries.ts#L900)

**The parser**

- Dynamic only when the argument is one string literal then `)` or `,`.
  [`boundaries.ts:657`](../../src/derive/boundaries.ts#L657)

- Any `require` reference, not only a call; members and object keys excluded.
  [`boundaries.ts:688`](../../src/derive/boundaries.ts#L688)

- `createRequire` caught wherever spelled, so an aliased import cannot hide the call.
  [`boundaries.ts:696`](../../src/derive/boundaries.ts#L696)

- Failure-line excerpt: structure read from stripped code, one line, capped with an ellipsis.
  [`boundaries.ts:630`](../../src/derive/boundaries.ts#L630)

- Template interpolations now stripped in turn, so strings inside `${}` are not code.
  [`boundaries.ts:552`](../../src/derive/boundaries.ts#L552)

- Four scans merged back into file order, line and column.
  [`boundaries.ts:718`](../../src/derive/boundaries.ts#L718)

**The rule table**

- Derive bans Three and React by name; its own solver and schema stay allowed.
  [`boundaries.ts:152`](../../src/derive/boundaries.ts#L152)

- Entry path bans the solver beside Three, in the shell and the root stub.
  [`boundaries.ts:173`](../../src/derive/boundaries.ts#L173)
  [`boundaries.ts:304`](../../src/derive/boundaries.ts#L304)

- The two renderers never import each other, dynamic form included.
  [`boundaries.ts:188`](../../src/derive/boundaries.ts#L188)
  [`boundaries.ts:209`](../../src/derive/boundaries.ts#L209)

- `src/types/` exempt for declaration files only; anything else fails.
  [`boundaries.ts:857`](../../src/derive/boundaries.ts#L857)

**Docs**

- The absolute claim narrowed to literal specifiers, with unread forms named.
  [`README.md:6`](../../src/data/README.md#L6)

**Tests**

- Package bans written as fixed expectations, not a loop over the table.
  [`boundaries.test.ts:802`](../../src/derive/boundaries.test.ts#L802)

- Unresolvable forms, the test-file excuse, and the excerpt's shape.
  [`boundaries.test.ts:880`](../../src/derive/boundaries.test.ts#L880)
  [`boundaries.test.ts:953`](../../src/derive/boundaries.test.ts#L953)
  [`boundaries.test.ts:1013`](../../src/derive/boundaries.test.ts#L1013)
