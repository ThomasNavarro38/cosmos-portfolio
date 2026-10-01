---
title: 'Generated design tokens from a single source'
type: 'feature'
created: '2026-09-30'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'f30ca01f24d5b2749c17e175644fd7d0c0e95d4a'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The only token source is the YAML frontmatter of DESIGN.md. `src/tokens/` is still a stub, and the scene hardcodes two greybox colours. Nothing stops the scene and the DOM from drifting apart on colour, type or stroke (AD-12).

**Approach:** A build-time generator parses DESIGN.md's frontmatter once and writes two committed files to `src/tokens/`: CSS custom properties and a typed TS object, each with a banner. `npm run gate` then fails when those files are stale or hand-edited, or when a component writes a literal colour. The two existing literals move onto tokens.

## Boundaries & Constraints

**Always:** Emit only what DESIGN.md states: `colors` (every bare/`-dark` pair), `typography` (font families plus all 11 ramp roles, each with size, weight, line height and tracking, `{a.b}` aliases resolved), `spacing`, `rounded`, `components.stroke-weight`. The generator is deterministic, so the same source gives the same bytes. It fails loudly, naming the key, on: an unresolvable alias, a colour without its pair, a missing ramp role or field, a spacing value of 16px or 24px, or a YAML construct outside the supported subset. Generated `src/tokens/*` files import nothing, keeping the leaf rule (`boundaries.ts:123-127`).

**Ask First:** Adding any npm dependency. Emitting other `components.*` blocks. Touching motion constants.

**Never:** Motion or timing constants (`FOCUS_SECONDS` etc. stay in `shell/`; AV-2 is out of scope). Applying the stroke/ink ladders, vignette, or panel/chrome styling (stories 3.2–3.8). ESLint. Banning `0x` numeric literals (`DUST_SEED` is a seed, not a colour).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Generate | `npm run tokens` | `src/tokens/tokens.css` and `src/tokens/tokens.ts` written; line 1 of each is the banner naming `scripts/tokens.ts` and `npm run tokens` | N/A |
| Fresh | committed outputs match a regeneration | gate passes | N/A |
| Hand-edited / stale | one byte of an output differs, or its banner is missing | gate fails naming the file and `npm run tokens` | exit 1 |
| Broken source | `{colors.nope}`, `ink-lift` without `ink-lift-dark`, `panel-title` missing `lineHeight`, `spacing.x: "16px"` | generation fails naming the key | exit 1, nothing written |
| Literal colour | `'#8a8a8a'`, `"#FFF"`, `rgb(`, `rgba(`, `hsl(`, `hsla(` in code under `src/` (outside `src/tokens/` and `*.test.ts`) | gate fails with `file:line` | exit 1 |
| Decoys | the same patterns inside a comment; `0x2a5d17`; `'#section'` | pass | N/A |

</frozen-after-approval>

## Code Map

- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md:1-335` -- source. YAML subset: comments, nested block maps, single- and double-quoted and plain scalars, one `>` folded scalar (`description`), one `- ` list (`sources`). Only the emitted groups need values.
- `src/derive/boundaries.ts:282` -- `stripCommentsAndStrings`, the single-pass stripper. Add a comments-only mode to the same pass rather than a second stripper (retro item 9).
- `src/derive/index.ts:29,520,564-573` -- the gate's `--check` path and failure-line/exit convention to mirror.
- `src/derive/artifact.ts:131-170` -- banner convention (AD-13).
- `src/render-scene/dust-model.ts:76`, `mote-model.ts:112,382`, `scene.tsx:214,229`, `mote-field.tsx:82` -- the only colour literals and their uses.
- `src/render-scene/scene-model.test.ts` -- source-scan ratchets on `scene.tsx`. Expect them to need the new token import and `background` element admitted.
- `src/tokens/README.md` -- stub; says "motion values", which DESIGN.md does not carry.
- `package.json` scripts, `tsconfig.json` `include` -- `node --test` and `tsc` currently see `src` only.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/tokens.ts` -- frontmatter extractor, subset YAML parser, alias resolver, validators, CSS and TS emitters, `--check` (compare bytes and run the literal scan) -- the generator lives outside `src/` because `tokens/` is a leaf and may not import `node:fs`.
- [x] `scripts/colour-literals.ts` -- walk `src/` (skip `tokens/`, `*.test.ts`, dot-dirs, `node_modules`), strip comments only, report `#hex` of 3/4/6/8 digits and `rgb[a]( / hsl[a](` as `file:line`.
- [x] `src/derive/boundaries.ts` -- export the comments-only variant from the existing pass.
- [x] `scripts/tokens.test.ts`, `scripts/colour-literals.test.ts` -- every I/O matrix row, including the committed outputs matching a fresh generation.
- [x] `src/tokens/tokens.css`, `src/tokens/tokens.ts` -- generated, committed.
- [x] `src/render-scene/{dust-model,mote-model,scene,mote-field}` -- replace the literals: Dust particles `stroke-dust-dark`, Dust medium `stroke-rest-dark`, Motes `stroke-active-dark` (DESIGN.md `dust-field`/`mote`). Add the scene background `surface-base-dark`, so these read as designed rather than as dark dots on white. Update the source scans they trip.
- [x] `package.json`, `tsconfig.json` -- add a `tokens` script; `gate` also runs `node scripts/tokens.ts --check`; the `test` glob and tsconfig `include` add `scripts`.
- [x] `src/tokens/README.md` -- describe the generator, the outputs, and "never hand-edit"; drop the motion claim.

**Acceptance Criteria:**
- Given the committed tree, when `npm run gate` runs, then it passes, and it fails after any single-byte edit to either output.
- Given `src/tokens/tokens.ts`, when imported, then `tokens.colors['stroke-dust-dark']` is `'#1D1D22'` and `tokens.typography['panel-title'].fontFamily` is the resolved sans stack, not an alias, and its type is literal (`as const`).
- Given a fresh generation, when `tokens.css` is read, then every colour key appears as `--color-<key>`, and `--space-*` covers 4/8/12/20/28/40/52/56 with no 16 or 24.
- Given `src/tokens/`, when boundaries are checked, then no generated file imports anything.

### Review Findings

- [x] [Review][Patch] The `as const` literal-type guarantee is enforced by nothing automated: `npm test`/`gate`/`build` never run `tsc`, so emitting `'};'` instead of `'} as const;'` keeps every check green [scripts/tokens.test.ts:485]
- [x] [Review][Patch] The colour scan's function arm is case-sensitive (`RGB(`, `HSLA(` in CSS pass) and lacks the hex arm's lookbehind, so method calls like `color.rgb(` would be reported [scripts/colour-literals.ts:61]
- [x] [Review][Patch] A JSX numeric entity (`&#160;`, `&#123;`) is reported as a literal colour: `&` is not in the hex arm's lookbehind [scripts/colour-literals.ts:61]
- [x] [Review][Patch] The render-scene README still names the removed `DUST_COLOR` and the "transparent over a white document" rationale [src/render-scene/README.md:59]
- [x] [Review][Patch] The stale-output test asserts only `failures.length === 2`, not that both failures name `tokens.css`/`tokens.ts` as stale or hand-edited [scripts/tokens.test.ts:232]
- [x] [Review][Defer] Mote labels are coloured with `stroke-active-dark`, a stroke token, while DESIGN.md §6 puts labels at `ink-label` or above [src/render-scene/mote-model.ts:116] — deferred to story 3.5 (same hex as `ink-prose-dark`, so no visible change today)
- [x] [Review][Defer] `tokens.ts` emits unit strings (`'0.7px'`, `'9.5px'`, `'50%'`) where scene materials need numbers [src/tokens/tokens.ts] — deferred to story 3.2, its first numeric consumer
- [x] [Review][Defer] Colour-scan coverage gaps beyond the AC: `.svg`/`.html` files and `*.test.tsx`/`*.spec.ts`, CSS id selectors made of hex letters (`#face {`), CSS strings containing `/*`, `}` inside a string within `${...}` (`keepTemplateText`) [scripts/colour-literals.ts:86] — deferred, hardening beyond the AC
- [x] [Review][Defer] Generator YAML/validation hardening: `True`/`NULL`/`- - x`/big integers read silently, closing fence with trailing space or `---x`, ramp field types and units not checked, 16/24 written as `1rem`/`calc()` [scripts/tokens.ts] — deferred, DESIGN.md is the only input and uses none of these
- [x] [Review][Defer] Write/gate robustness: the second `renameSync` can fail after the first, a crashed run leaves `*.tmp` that fails the gate, `gate` uses `&&` so a derive failure hides the token check, a non-ENOENT scan error drops collected failures, a repeated `--out=` silently wins [scripts/tokens.ts:766] — deferred, every case fails loudly or self-heals on rerun
- [x] [Review][Defer] Nothing enforces that `src/**` never imports `scripts/` (the README states it, no boundary rule checks it) [src/derive/boundaries.ts] — deferred

## Design Notes

Why no YAML dependency: the repo pins a deliberately closed set of dependencies (`boundaries.ts:15-22` makes the same call against ESLint). A subset parser that rejects anything unsupported is safer than a general one quietly accepting a construct it misreads.

CSS naming: `--color-<key>`, `--space-<key>`, `--radius-<key>`, `--stroke-<key>`, `--type-<role>-{font-family,font-size,font-weight,line-height,letter-spacing}`. The CSS file is not imported anywhere yet; the first DOM story wires it in.

## Verification

**Commands:**
- `npm run tokens` -- expected: writes both files; a second run gives a zero `git diff`.
- `npm test` -- expected: all green, new suites included.
- `npm run typecheck` -- expected: clean, including `scripts/`.
- `npm run gate` -- expected: passes; fails after hand-editing `src/tokens/tokens.css`, and after adding `'#fff'` to `src/shell/panel-model.ts`.

**Manual checks:**
- `npm run dev`: the scene has a near-black background, the Dust is dim, and the Motes are light grey. No other visual change.

## Suggested Review Order

**Generation: one source, two outputs**

- Entry point: frontmatter → parse → resolve → validate → both emitters, all or nothing.
  [`tokens.ts:639`](../../scripts/tokens.ts#L639)

- Validation rules: pairs, 11 ramp roles × 5 fields, #RRGGBB, no 16/24 spacing, reserved keys.
  [`tokens.ts:506`](../../scripts/tokens.ts#L506)

- Subset YAML parser: rejects anything DESIGN.md doesn't use, rather than guessing.
  [`tokens.ts:347`](../../scripts/tokens.ts#L347)

- Alias resolution with cycle detection; failures name the key holding the alias.
  [`tokens.ts:375`](../../scripts/tokens.ts#L375)

- Emitted-value guard against CSS breakouts (`;`, `*/`, `!important`, unbalanced quotes).
  [`tokens.ts:471`](../../scripts/tokens.ts#L471)

- CSS and TS emitters; banner on line one of each.
  [`tokens.ts:573`](../../scripts/tokens.ts#L573)

**Enforcement: the gate**

- `--check`: byte comparison, stray files in `src/tokens/`, literal scan, all reported together.
  [`tokens.ts:716`](../../scripts/tokens.ts#L716)

- Entry guard compares real paths so a Windows path mismatch can't silently skip the gate.
  [`tokens.ts:854`](../../scripts/tokens.ts#L854)

- Unknown arguments rejected, so a typo can never become a write.
  [`tokens.ts:801`](../../scripts/tokens.ts#L801)

- Literal-colour scan: comments stripped, strings kept; CSS gets its own `/* */` stripper.
  [`colour-literals.ts:72`](../../scripts/colour-literals.ts#L72)

- Comments-only mode of the existing single-pass stripper, not a second stripper.
  [`boundaries.ts:297`](../../src/derive/boundaries.ts#L297)

- Gate wiring: `gate` now also runs the token check.
  [`package.json:12`](../../package.json#L12)

**Scene: literals onto tokens**

- Dust split into particle (`stroke-dust-dark`) and medium (`stroke-rest-dark`) colours.
  [`dust-model.ts:80`](../../src/render-scene/dust-model.ts#L80)

- Motes onto `stroke-active-dark`; tiering stays with 3.5.
  [`mote-model.ts:116`](../../src/render-scene/mote-model.ts#L116)

- Opaque `surface-base-dark` ground, so the dark palette reads as designed.
  [`scene.tsx:186`](../../src/render-scene/scene.tsx#L186)

**Tests and peripherals**

- Source audit of which colour each scene material reads, with seven negative mutations.
  [`scene-model.test.ts:1389`](../../src/render-scene/scene-model.test.ts#L1389)

- Generator tests on a frozen fixture; one test ties outputs to the live DESIGN.md.
  [`tokens.test.ts:1`](../../scripts/tokens.test.ts#L1)

- Colour-scan matrix rows and decoys.
  [`colour-literals.test.ts:1`](../../scripts/colour-literals.test.ts#L1)

- Generated outputs (never hand-edit).
  [`tokens.ts:1`](../../src/tokens/tokens.ts#L1)
