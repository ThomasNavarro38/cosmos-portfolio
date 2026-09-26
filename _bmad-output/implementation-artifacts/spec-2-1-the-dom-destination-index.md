---
title: 'Story 2.1: The DOM destination index'
type: 'feature'
created: '2026-09-06'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: 'a464343fd24eaf0fda6b3025de0b05713159577e'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A keyboard or screen-reader visitor has no way to reach any Client or Project: the app renders a placeholder `<main>`, and every destination the scene will hold is unreachable without a canvas they cannot perceive. The index must exist before the camera, because building the camera first produces an inverted architecture that stays invisible until assistive technology meets it (AD-4).

**Approach:** Publish the Rail's ordering into the artifact as a new `rail` list (schema v4), then render a persistent `<nav>` in the shell from the artifact alone — a nested Client → Projects list of `<button>` entries, present from First Paint. Ordering, naming, nesting and Deep/Shallow selection live in a pure, fully-tested `.ts` model; the `.tsx` is a thin renderer over it.

## Boundaries & Constraints

**Always:**
- The derive layer owns every ordering rule. The shell reads pre-derived properties and computes none (AD-3; "the renderer reads and never derives").
- `src/shell/` imports the generated artifact and `src/tokens/` statically, renderers only dynamically, and **never** `src/data/` or `src/derive/` — including `import type`, which the boundary parser counts as an import.
- Index order is Rail order, present → past: the reverse of the emitted `rail` list.
- Every entry is a `<button>` whose accessible name is the Client name or Project title, with Deep/Shallow exposed as **text inside the entry** — never an ARIA attribute, never a visual marker alone.
- The index never reads render state, camera state, viewport, or canvas hit-testing; its structure, order and focusability are invariant under re-render and resize.
- One rule, one owner: no ordering key is re-implemented anywhere a second time.
- Vocabulary is load-bearing: Body, Client, Project, Deep/Shallow, Rail, Focus. No synonyms.

**Ask First:**
- Adding any dependency (test transform, jsdom, testing-library). The dependency set is fifteen exactly-pinned versions and is deliberately closed.
- Any change to what `destinations` means or how it is ordered — it is ID-ordered by explicit design.
- Introducing navigation state, a store, or camera coupling. That is Story 2.2's, not this story's.

**Never:**
- No re-derivation of Rail order in the shell from `content.duration.start`.
- No coordinate, no `timeAxis`, no render-order index consumed for ordering.
- No ARIA attribute standing in for the Deep/Shallow text.
- No styling, design tokens, or visual identity — this is greybox; Epic 3 dresses it.
- No `aria-hidden` canvas work, no 3D chunk, no dynamic import of a renderer here.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rail order published | Graph whose `duration.start` order opposes its recency order | `rail` lists Client IDs by earliest start, ties by ID — provably not `clients[]` order | N/A |
| Index order | Artifact with `rail` = [oldest … newest] | Model emits Clients present → past, each Client's Projects nested directly beneath it | N/A |
| Deep and Shallow | Project with `isDeep: true` / `false` | Entry carries distinct text naming the state, inside the entry's accessible name region | N/A |
| Cardinality drift | `rail` naming a Project, an unknown ID, a duplicate, or missing a Client | Gate fails naming the offending ID and the granularity | Build exits non-zero |
| Single Client | Today's one-Client artifact | Exactly one Client with one nested Project; ordering degenerate but valid | N/A |

</frozen-after-approval>

## Code Map

**Derive layer — publishing the Rail order (decision 1):**
- `src/derive/solve.ts:217` — `inRailOrder`, private: sorts Clients by `startsAt` (min `duration.start`), ties by ID via `compareCodepoints`. `:176` `startsAt`. Feeds `node.index` at `:352` and `:571`, so this order already governs coordinates — publishing it changes no geometry.
- `src/derive/rail.ts` — **new.** Owns `buildRail(graph): readonly string[]`. The Rail ordering rule moves here from `solve.ts`; `solve.ts` imports it so exactly one implementation exists. Mirror `destinations.ts` in shape and header style.
- `src/derive/artifact-schema.ts:36` — `SCHEMA_VERSION = 3` → `4`; add `rail: z.array(z.string().min(1))` to `ArtifactSchema` (~`:190`) with a doc comment on why the order is emitted. Export `Rail` type if useful.
- `src/derive/artifact.ts:99` — `buildArtifact` assembles; add `rail: [...buildRail(graph)]` beside `destinations`. `:82` header documents "deliberately not the Rail's order" for `clients[]` — extend it to say the Rail order is now carried in its own field.
- `src/derive/destinations.ts:51` — header argues against Rail-ordering `destinations`. Must be amended: it stays ID-ordered; `rail` is the separate ordering channel.
- `src/derive/index.ts:250` `checkStops` — walks `dwell`/`shots` through one shared loop over `lists` (`:307`). `rail` is Client-granular too: one entry per Client, none naming a Project, no duplicates. Extend the same walk; do not write a second one.
- `src/derive/artifact.test.ts:68` `opposedEntries()` — the fixture where start-order and recency-order deliberately disagree. Reuse it: it is exactly the multi-Client case this story needs. `:215` asserts emitted order ≠ Rail order and must keep passing.
- `src/derive/artifact-schema.test.ts:118` (version literal), `:440` (closed key set `['asOf','clients','destinations','dwell','schemaVersion','shots']` → add `rail`).

**Shell — the index (decision A):**
- `src/shell/index-model.ts` — **new, pure.** Artifact → ordered nested view model. No React, no DOM, no Three. This is where every AC-bearing rule lives and is tested.
- `src/shell/index-nav.tsx` — **new, thin.** Maps the model to `<nav>` / nested `<ul>` / `<button>`. No logic beyond mapping.
- `src/shell/README.md:5` — `**Imports:**` line is load-bearing: `boundaries.ts:141` cites it as `source`. Add a `## Files` table matching `derive/`'s house style.
- `src/derive/boundaries.ts:139-144` — the `shell` rule already exists (`never: ['data','derive']`, `dynamicOnly` renderers); no new rule needed. `checkRuleCoverage` is already satisfied.
- `src/App.tsx:1` ("do not grow this file") and `src/main.tsx:5` — placeholders explicitly awaiting the real shell. Render the index here; keep them thin.
- `generated/layout.generated.json` — resolves outside `src/`, so importing it is invisible to the boundary gate and permitted (`boundaries.test.ts:458`). `resolveJsonModule: true`.

**Read-only evidence / constraints:**
- `node --test` on Node 24 built-in type stripping cannot load `.tsx` at all — `ERR_UNKNOWN_FILE_EXTENSION`, at module resolution, in test *or* import position. Verified directly. Hence the model/renderer split.
- `package.json:17` test glob is `src/**/*.test.ts`.
- `tsconfig.json`: `jsx: react-jsx` (no React import), `allowImportingTsExtensions` (write `.ts` in specifiers), `verbatimModuleSyntax`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` (both bite when mapping artifact arrays).
- Tests: `node:test` + `node:assert/strict`, flat `test()` only (no `describe`), lowercase prose titles naming behavior *and reason*, in-memory fixture builders, mutation guards.
- No linter/formatter. Single quotes, semicolons, trailing commas, 2-space indent, named exports only, `readonly` pervasive, heavy WHY-not-WHAT doc headers.

## Tasks & Acceptance

**Execution:**
- [x] `src/derive/rail.ts` -- new module owning `buildRail(graph)`: Clients by earliest `duration.start`, ties by ID -- one implementation of the Rail rule, so the shell need never re-derive it
- [x] `src/derive/solve.ts` -- import `buildRail` and drop the private `inRailOrder` -- two copies of one ordering drift the first time either changes
- [x] `src/derive/artifact-schema.ts` -- `SCHEMA_VERSION` → 4; declare `rail` -- the shape changed, so the number it declares changes with it
- [x] `src/derive/artifact.ts` -- assemble `rail` from `buildRail`; amend the `clients[]` ordering header -- the assembler arranges, never computes (AD-3)
- [x] `src/derive/destinations.ts` -- amend the header: `destinations` stays ID-ordered, `rail` is the separate ordering channel -- the comment currently argues against the field being added
- [x] `src/derive/index.ts` -- extend `checkStops`' shared list walk to cover `rail` -- Client-granularity is gated for `dwell` and `shots` and must be for `rail` too
- [x] `src/derive/rail.test.ts` -- pin the ordering on a fixture where start-order opposes recency-order -- degenerate on today's one-Client data, so only a fixture can prove it
- [x] `src/derive/artifact.test.ts`, `src/derive/artifact-schema.test.ts` -- update version literal and closed key set; assert `rail` on `opposedEntries()` -- the existing divergence test must keep passing
- [x] `npm run solve` -- regenerate the artifact at v4 -- the committed artifact must match the schema the gate enforces
- [x] `src/shell/index-model.ts` -- artifact → nested view model in Rail order reversed, with names and Deep/Shallow text -- pure, so it is testable under the existing runner
- [x] `src/shell/index-model.test.ts` -- cover the I/O matrix incl. multi-Client ordering and Deep/Shallow text -- the AC-bearing logic lives here
- [x] `src/shell/index-nav.tsx` -- thin `<nav>` renderer over the model -- mapping only, no logic
- [x] `src/App.tsx`, `src/main.tsx` -- render the index at First Paint -- it must precede any 3D chunk
- [x] `src/shell/README.md` -- add the `## Files` table -- line 5 is cited by the boundary rule and house style expects it

**Acceptance Criteria:**
- Given the artifact carries `rail`, when the gate runs, then a `rail` entry naming a Project, an unknown ID, a duplicate, or a missing Client fails the build naming the offending ID
- Given a portfolio where a long early engagement sits beside a short late one, when the index is traversed, then its order is the Rail's and demonstrably not `clients[]` order
- Given the app loads, when First Paint occurs, then the `<nav>` is in the document before any 3D chunk has loaded
- Given the camera moves, the viewport resizes, or the scene re-renders, when the index is inspected, then its structure, order and focusability are unchanged, and no code path derives an entry from camera or viewport state
- Given a screen-reader user reads the index alone, when they encounter an entry, then its accessible name is the Client name or Project title and its Deep/Shallow state is available as text
- Given the boundary gate runs, when it walks `src/shell/`, then no import of `src/data/` or `src/derive/` exists, static or dynamic
- Given `npm test`, `npm run typecheck` and `npm run gate` run, then all pass with no new dependency added

## Spec Change Log

**Review iteration 1 — 2026-09-26.** Four review layers over `a464343..d4d6871`. All
seven acceptance criteria verified met, by live command rather than by reading: AC 1
proven by driving each of the four `rail` drift modes through the gate (each fails,
names the offending ID, exits 1), AC 6 by planting an `import type` from `src/shell/`
into `src/derive/` (caught, file/line/README cited). 407 tests, typecheck, gate, build
and a byte-identical re-solve all green; dependency set unchanged at fifteen pins.

No AC was violated. What the review found instead was that two of the story's central
guarantees were *asserted* rather than *verified* — both demonstrated by applying the
regression and watching the suite stay green:

- Moving Deep/Shallow onto a button as `aria-label={project.depth}` — the exact form
  the Design Notes name as the failure — passed all 407 tests, typecheck and gate.
  `aria-label` replaces the accessible name, so the Project title was lost too. The
  renderer scan's `aria-(?!label\b)` exemption, needed for the `<nav>`, was the hole.
- Hoisting the Projects' `<ul>` out of the Client's `<li>` — the flattening the model
  tests are careful to forbid — likewise passed, because tag-presence regex cannot
  observe nesting.
- `rail.test.ts`'s solve-binding test was tautological: `buildRail(g)` is *defined* as
  `inRailOrder(g.clients).map(c => c.id)`, so it asserted an expression against itself,
  while its comment claimed assertion "against the *solved x coordinates*" it never read.

Applied, each verified red-then-green:

1. Renderer scan bans any ARIA attribute carrying a model field, and a new positive
   scan requires `client.name`, `project.title` and `project.depth` in text-node position.
2. New `solve.test.ts` case asserts Client Stars ascend in x along the emitted `rail`,
   on a fixture where Rail and recency order genuinely oppose; `rail.test.ts`'s
   tautology rewritten to pin the import seam and point at the real assertion.
3. New test pins the exact tag sequence, so the Projects' list must open inside the
   Client's list item.
4. `maintenance.test.ts` extended: `rail` is the third Client-granular list and an
   appended Project must gain no stop in it.
5. `solve.ts` dangling JSDoc → section note; `index.ts` stranded reflow rejoined.

Three decisions taken with the human:

6. `buildDestinationIndex` now walks a Client named twice in `rail` once only. The
   duplicate is the third drift mode the I/O matrix names; the other two were guarded
   and it was not, while the module header claimed the posture for all of them.
7. `main.tsx`'s comment softened: a static renderer import there is barred by
   convention, not by the gate. `ROOT_RULE` bans only `src/data/` and `src/derive/` —
   the two bans `README.md:45` declares — and the rule table deliberately states
   nothing the prose does not. Tracked for the story that introduces the first renderer.
8. `buildRail` now returns the `Rail` type rather than a bare `readonly string[]`, so
   producer and schema describe the value once. The type had no importers at all; its
   JSDoc named a consumer — the shell — structurally forbidden from importing it.

411 tests pass. Three findings deferred as not caused by this change, filed as action
items on the sprint: the Rail's sequence is ungated (membership only), `ROOT_RULE` has
no renderer ban, and the renderer emits an empty `<ul>` for a Projectless Client. The
pre-existing inline comparator in `destinations.ts:68` is already covered by
`epic-1-retro-item-14`.

## Design Notes

**Why `rail` is emitted rather than reconstructed.** The artifact carries three orderings and none was the Rail's: `clients[]` is `timeAxis` order (max recency, oldest first, `artifact.ts:82`), `destinations` is ID order (`destinations.ts:51`), and the Rail is min `duration.start` — private to `solve.ts` and unemitted. `artifact.test.ts:215` actively asserts the emitted order is *not* the Rail order over a fixture where they differ, so the divergence is deliberate, not an oversight. Reconstructing it in the shell would put `startsAt`/`inRailOrder` in a second place — the exact divergence Story 1.6 exists to forbid. Since `inRailOrder` already feeds `node.index` into d3 placement, publishing it changes no geometry; it only makes an existing commitment readable.

**Why the model/renderer split.** `node --test` under Node 24's built-in type stripping cannot load `.tsx` in any position — verified: `ERR_UNKNOWN_FILE_EXTENSION` at resolution, before any transform, so a `.ts` test cannot even import a `.tsx` module. Adding a transform means adding dependencies to a repo that rejected ESLint on exactly that ground. Putting every AC-bearing rule in a pure `.ts` model keeps it testable with zero new dependencies and matches the house posture (`destinations.test.ts`: "No DOM, no React, no Three is imported here"). Accepted residual risk: the JSX mapping itself is unasserted, and is kept trivial so that reading it suffices.

**Deep/Shallow as text.** A screen-reader user must be able to answer *which entries are worth reading* from the index alone. An ARIA attribute or a visual marker does not answer it; text inside the entry does.

## Verification

**Commands:**
- `npm test` -- expected: all pass, 358 existing plus the new rail and index-model tests, zero failures
- `npm run typecheck` -- expected: clean, no errors
- `npm run gate` -- expected: "the layout artifact is present and valid."
- `npm run solve` -- expected: regenerates `generated/layout.generated.json` at `schemaVersion: 4` carrying `rail`
- `npm run build` -- expected: gate passes then Vite builds

**Manual checks (if no CLI):**
- `npm run dev`, then inspect the DOM: a `<nav>` containing a nested list of `<button>` entries, present on first render, one Client with its Project nested beneath, Deep/Shallow readable as text
- Tab / Shift+Tab traverses every entry in order with no trap
