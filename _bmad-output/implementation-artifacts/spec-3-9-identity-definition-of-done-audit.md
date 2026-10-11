---
title: 'Identity definition-of-done audit'
type: 'feature'
created: '2026-10-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: '3b6402a01160d92ad039cc6ce2745f6f4b84cc2d'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Schematic Identity is assumed done, but it has never been audited, and the live page is still greybox. The ground is white with the default margin, the DOM index shows as default buttons above a `70vh` canvas (and shows `Deep`/`Shallow` on screen), and the identity line overlaps it. On top of that, the colour ban misses whole classes of literal, and the oldest Planets are drawn at `stroke-dust`.

**Approach:** Ratchet tests cover every mechanical AC, and a written audit record covers the human ones. The audit closes the findings it raises. Thomas ruled on 2026-10-11:
- 1b: achromatic means OKLCH chroma < 0.02. The cool cast stays and is recorded as deliberate.
- 2: the story closes once the protocol is written and the automated checks pass. Thomas runs the viewer tests later.
- 3: the structural labels are allowed in a closed list.
- 4a: widen the colour scan.
- 4b-i: re-band, `RESTING_BANDS = ['stroke-rest', 'stroke-near']`.
- 7a: the page layout is fixed in this story.
- 8a: the index is visually hidden until keyboard focus.

## Boundaries & Constraints

**Always:**
- **Achromatic:** every `-dark` colour in `src/tokens/tokens.ts` has OKLCH chroma < 0.02, computed in a test.
- **Contrast:** one table test maps each text role to its ink and ground, as read from the shipping source (CSS declaration or model constant), not restated. Ground is `surface-raised-dark` for panel roles and `surface-base-dark` for everything else.
  - ≥ 7:1: Notable prose, panel title, field values.
  - ≥ 4.5:1: field labels, editorial rule, Skills, `release`, the Mote label, chrome, the affordance title and secondary line, the index reveal.
- **Copy:** every visible literal string shipped from `src/` (non-test) or `index.html` is in one closed allowlist:
  - `IDENTITY_LINE`, the three `SLOT_TEXT` strings, `EDITORIAL_RULE`
  - `RELEASE_LABEL`, `FIELD_LABELS`, `DEPTH_LABELS`
  - `overview`, the `<title>`, the `<noscript>` line
  - `aria-label` values are accessible names and listed separately.
- **Voice:** a case-insensitive scan finds none of `work in progress|wip|beta|alpha|coming soon|under construction|sorry|apolog|placeholder|lorem|todo|tbd|draft` in shipped strings, `career.json` or `index.html`.
- **Colour scan** (`scripts/colour-literals.ts`), widened. It now also flags:
  - CSS named colours, as a CSS value or as a whole string literal; `transparent` and `currentColor` stay allowed
  - CSS system colours outside `@media (forced-colors: active)`
  - the functions `oklch(`, `oklab(`, `lab(`, `lch(`, `hwb(`, `color(`
  - a `0x` literal passed to `Color(`, `.setHex(` or `.setRGB(`, or assigned to a `color`/`colour` key

  It also scans root `index.html` and every `.html`/`.svg` under `src/` and `public/`, skipping HTML comments, and it skips `*.test.tsx` and `*.spec.ts`.
  - `color-mix(` stays allowed, because its operands are scanned.
  - `DUST_SEED = 0x2a5d17` still passes.
- **Re-band:**
  - `RESTING_BANDS` becomes `['stroke-rest', 'stroke-near']` and `SCHEMA_VERSION` goes 6 → 7.
  - The artifact is regenerated.
  - A test asserts that no Body in `generated/layout.generated.json` carries `stroke-dust`.
- **Page:**
  - `html`/`body`: margin 0, background `--color-surface-base-dark`, no page scroll.
  - The scene host is `position: fixed; inset: 0`.
  - The canvas fills it (`width`/`height` `100%`).
  - The chrome and the panel stay above it.
- **Index:**
  - It stays a real, focusable `<nav>` in the AT tree from First Paint. It is hidden with the clip pattern, never `display: none`, `visibility: hidden` or `aria-hidden`.
  - Only a button holding `:focus-visible` is revealed: bottom-left, fixed, inset `--space-xl`, `chrome` role, `ink-label`, no box, and under `forced-colors` a `1px solid CanvasText` outline.
- **Audit record:** `_bmad-output/implementation-artifacts/identity-audit-3-9.md` has one row per epic AC:
  - an automated row names its test;
  - a manual row (NFR-1a, FR-9, voice, nothing-reads-as-placeholder) gives the protocol steps and an empty result column for Thomas.

  It also lists each finding and how it was closed.

**Ask First:** any edit to DESIGN.md or the tokens generator; any edit to `career.json` (including one to fix a voice-scan hit); an npm dependency; any change to `state.ts` or to a door in `activate.ts`.

**Never:**
- A hue.
- A palette value changed.
- The index taken out of the DOM or the tab order.
- A third chrome line.
- `text-transform`.
- A weight above 400.
- A literal colour or length outside the tokens.
- The deferred items 4c (font-measured label widths) or 4d (stripper bugs).
- The 3.8 deferrals (resize lag, safe-area insets, banner landmark).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First paint at 1440×900 | load | `surface-base` edge to edge, scene full viewport, no scrollbar, index not drawn, two chrome lines | N/A |
| Keyboard Tab to a Client | `:focus-visible` on `Decathlon` | that one entry is revealed bottom-left | N/A |
| Mouse focus on an entry | `:focus` without `:focus-visible` | nothing is revealed | N/A |
| Oldest Planet | recency ordinal 0 | `luminanceBand` `stroke-rest` | N/A |
| Named colour in a component | `color: 'white'` | gate fails, `file:line` | build fails |
| System colour outside forced-colours | `color: CanvasText` at top level | gate fails | build fails |
| Numeric colour | `new Color(0xffffff)` | gate fails | build fails |
| Seed | `DUST_SEED = 0x2a5d17` | passes | N/A |
| Literal in HTML | `#fff` in `index.html` | gate fails | build fails |

</frozen-after-approval>

## Code Map

- `scripts/colour-literals.ts`:
  - `COLOUR_LITERAL` (:63), `isScanned` (:88), `filesUnder`/`checkColourLiterals` (:130). Extend the patterns.
  - Add a second root for `index.html` and `public/`.
  - Strip `<!-- -->` from HTML/SVG.
  - Detect system colours only outside a forced-colours `@media` block.
  - Keep the header doc in step.
  - Called from `scripts/tokens.ts:756`, which needs the extra root as well.
- `scripts/colour-literals.test.ts`: one test per matrix row.
- `src/render-scene/stroke-model.ts:378` — the `color-mix(…, transparent)` that must stay legal.
- `src/derive/rules.ts:43,147` — `RESTING_BANDS` and the `?? 'stroke-dust'` fallback, which becomes `'stroke-rest'`.
- `src/derive/artifact-schema.ts:42` — `SCHEMA_VERSION`. The enum at :121 follows `RESTING_BANDS`.
- Tests to re-pin for the bands:
  - `src/derive/artifact-schema.test.ts:707`
  - `src/derive/artifact.test.ts:104`
  - `src/derive/rules.test.ts`
  - `src/render-scene/stroke-model.test.ts:150` (Body strokes; the Rail and Dust stay at `stroke-dust`, :390)
- Regenerate the artifact: `npm run solve`.
- `src/App.tsx`: `<main>` holds index, chrome, scene host, panel. Import a new `src/shell/page.css` (html/body ground, no scroll, scene host fixed).
- `src/shell/scene-host.tsx`: the wrapper `<div>` carrying the wheel listener gets the fixed full-viewport class.
- `src/render-scene/scene.tsx:128,136`: the outer `div` and the Canvas go to `100%`/`100%`.
  - Re-pin the `70vh` scans at `scene-model.test.ts:1564,2111-2121` to `100%`.
- `src/shell/index-nav.tsx`: `<nav>` gains a class.
- `src/shell/index-nav.css` (new): the clip pattern and the `:focus-visible` reveal.
  - Import it the way `focus-panel.tsx` imports its CSS.
  - Mirror `corner-chrome.css` for the type, the ink and the forced-colours block.
- Contrast helper: `contrast()` in `src/shell/chrome-model.test.ts:130`. Move it to a shared test helper rather than copying it.
- Ink sources for the contrast table:
  - `focus-panel.css` (:43–180)
  - `corner-chrome.css:30`
  - `affordance-model.ts:529,534`
  - `mote-model.ts:184`
  - `panel-model.ts:471`
- Copy sources for the allowlist:
  - `chrome-model.ts:37-40`
  - `panel-model.ts:61,64,141`
  - `index-model.ts:84`
  - `index-nav.tsx:96`
  - `index.html:6,10-13`
- `src/identity-audit.test.ts` (new): the achromatic, contrast, copy and voice audits, and the no-`stroke-dust`-Body check, each driven over a mutation.
- `src/shell/README.md`, `src/render-scene/README.md`, `src/derive/README.md`: document the page, the index reveal and the two-step band.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/colour-literals.ts` + test: widen the scan, red first. Fix any new hits it finds in `src/`.
- [x] `src/derive/rules.ts`, `artifact-schema.ts`, the tests, the artifact: re-band, bump the version, regenerate.
- [x] `src/identity-audit.test.ts`: the achromatic, contrast, copy-allowlist and voice audits.
- [x] `index.html`: the `<noscript>` drops its narration of how the site is served. The new line is `This portfolio needs JavaScript.`, and it goes in the allowlist.
- [x] `src/shell/page.css`, `App.tsx`, `scene-host.tsx`, `scene.tsx` + scans: the full-viewport page.
- [x] `src/shell/index-nav.css`, `index-nav.tsx` + audit: the hidden index and the keyboard reveal.
- [x] `_bmad-output/implementation-artifacts/identity-audit-3-9.md`: the AC table, the manual protocol, the findings.
- [x] READMEs.

**Acceptance Criteria:**
- Given `npm test`, `npm run typecheck`, `npm run gate`, then all pass.
- Given the dev server at 1440×900, when the page loads, then no white, no scrollbar and no index list is visible, and the scene fills the frame.
- Given each audit test, when its mutation is applied, then it fails with its own message.
- Given `identity-audit-3-9.md`, then every epic AC for 3.9 has a row, either a test name or a protocol with an empty result.

### Review Findings

- [x] [Review][Patch] F4 `team of`: Thomas ruled (2026-10-11) it is a structural label — it joins `VISIBLE_COPY`, `FORMAT_FRAGMENTS` goes, and the audit record closes F4 [src/identity-audit.test.ts:390]
- [x] [Review][Patch] The numeric arm's `.set(` matches any receiver — `map.set('k', 0x10)` fails the gate (probed). Thomas ruled (2026-10-11): narrow it to a colour-named receiver (`color.set(`, `material.color.set(`) [scripts/colour-literals.ts:152]
- [x] [Review][Patch] Markup `DECLARATION` runs over the whole document, not just `style` attributes and `<style>` blocks as the header says — `href="https://x.com/navy"` reports `navy` (probed) [scripts/colour-literals.ts:172]
- [x] [Review][Patch] Markup whole-string system colours fire on any attribute — `<canvas id="canvas">` fails (probed); limit markup whole-string hits to paint attributes (`fill`, `stroke`, `color`, `stop-color`, `flood-color`, `lighting-color`) [scripts/colour-literals.ts:272]
- [x] [Review][Patch] Markup hex arm reads fragment links as colours — `href="#add"`, `url(#bed)` fail (probed) [scripts/colour-literals.ts:143]
- [x] [Review][Patch] A quoted string inside a CSS value ends the declaration — `background: url("a.png") white` passes the ban (probed false negative) [scripts/colour-literals.ts:172]
- [x] [Review][Patch] Boolean `@media (forced-colors)` is not exempt — a legitimate `CanvasText` under it fails (probed) [scripts/colour-literals.ts:211]
- [x] [Review][Patch] The function arm allows whitespace before `(`, which CSS never does — the prose string `'the lab (Paris)'` reports `lab(` (probed) [scripts/colour-literals.ts:143]
- [x] [Review][Patch] The header's "Known blind spots" lists only numeric cases — add the script forms the scan cannot see: CSS-in-JS strings (`cssText`, `setProperty`, a multi-word style string), a system colour through a variable, numeric colours in a ternary/array/default or under a non-`color` key [scripts/colour-literals.ts:44]
- [x] [Review][Patch] The `url(…)` carve-out has no test — removing it leaves the suite green (proved by mutation); add css and markup rows, plus rows for each patch above [scripts/colour-literals.test.ts]
- [x] [Review][Patch] `languageOf` is case-sensitive and misses `.htm` — `.SVG`/`.HTML`/`.htm` escape the ban [scripts/colour-literals.ts:335]
- [x] [Review][Patch] `DEFAULT_PATHS` pins `site: SITE_DIR`, so `{ ...DEFAULT_PATHS, src: fixture }` is judged against the real `index.html`; drop it and let `siteOf` default [scripts/tokens.ts:676]
- [x] [Review][Patch] `isWordless` admits any letterless text (digits, `?`, an emoji) into the closed copy list; restrict it to whitespace and the ruled separators [src/identity-audit.test.ts:396]
- [x] [Review][Patch] The copy and voice audits skip markup under `src/` that the colour gate governs; include it, read through `htmlText` [src/identity-audit.test.ts:414]
- [x] [Review][Patch] Two audit tests have no mutation ("the cool cast is a deliberate neutral", "the copy constants are each in the closed allowlist"), against the AC "each audit test … fails with its own message" [src/identity-audit.test.ts:85]
- [x] [Review][Patch] `auditBans` misses a literal weight in the `font:` shorthand and `visibility: collapse` [src/identity-audit.test.ts:184]
- [x] [Review][Patch] The viewport-unit ban misses `vi`/`vb` and their `s`/`l`/`d` variants [src/identity-audit.test.ts:898]
- [x] [Review][Patch] Audit record row 8 claims "not one shipped colour carries a hue" without citing the ruled forced-colours `Highlight` exception (`focus-panel.css`, ruling 3.6) [_bmad-output/implementation-artifacts/identity-audit-3-9.md:20]
- [x] [Review][Patch] Audit record row 2 gives the manual register half (P2) no empty result slot [_bmad-output/implementation-artifacts/identity-audit-3-9.md:14]
- [x] [Review][Defer] `parseCss` treats a blockless statement at-rule (`@import …;`) as the next rule's prelude and handles one nesting level only [src/identity-audit.test.ts:114] — deferred, holds over today's fixed inputs
- [x] [Review][Defer] The contrast table reads only top-level, same-selector `color`; an `@media` override or an inherited ink is not measured [src/identity-audit.test.ts:256] — deferred, no such rule ships
- [x] [Review][Defer] `.json`/`.webmanifest` under `public/` are ungoverned — a future `theme_color` would bypass the ban [scripts/colour-literals.ts:335] — deferred, no `public/` exists
- [x] [Review][Defer] Markup's inline `<script>`/`<style>` are not scanned in their own language (comments, numeric arm) [scripts/colour-literals.ts:194] — deferred, `index.html` has none
- [x] [Review][Defer] A programmatically focused index entry may not match `:focus-visible`, leaving focus on an invisible button; the revealed entry shows no pressed state [src/shell/index-nav.css:52] — deferred, ruling 8a; P1 manual pass
- [x] [Review][Defer] `src/shell/contrast.ts` is test support named like a shipped module; the Code Map asked for a shared test helper [src/shell/contrast.ts] — deferred, imported by no shipped module

## Design Notes

- **Cool cast.** The hue is about 286° at chroma ≤ 0.016, which is below the threshold where people perceive a tint. It is recorded as a deliberate neutral rather than "fixed". Changing it would move every contrast ratio for no visible gain.
- **Two bands.** With two bands instead of three, recency is coarser. The oldest Planets now equal their `stroke-rest` orbit and no longer sit below it, which DESIGN.md §2 permits.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate`: all green.

**Manual checks:**
- In the dev server at 1440×900:
  - The first frame is full-bleed void, with the identity line top-left and the instruction bottom-right.
  - Tab reveals one entry at a time, bottom-left.
  - A Project entry also draws its scene affordance.

## Suggested Review Order

**The audit record (entry point)**

- One row per epic AC: a test name or a manual protocol; findings F1–F8 and how each closed.
  [`identity-audit-3-9.md:9`](./identity-audit-3-9.md#L9)

- F4 (`team of`) is still open, so AC 3 reads "pass, pending F4".
  [`identity-audit-3-9.md:78`](./identity-audit-3-9.md#L78)

**The ratchets: identity held by tests**

- Achromatic as perceptual chroma < 0.02, ruling 1b, from the generated tokens.
  [`identity-audit.test.ts:80`](../../src/identity-audit.test.ts#L80)

- Contrast per text role, ink and ground read from the shipping CSS and models.
  [`identity-audit.test.ts:310`](../../src/identity-audit.test.ts#L310)

- The closed copy allowlist; JSX read as JSX, not a punctuation guess.
  [`identity-audit.test.ts:680`](../../src/identity-audit.test.ts#L680)

- The purpose-built JSX reader. It is the riskiest heuristic, guarded against reading nothing.
  [`identity-audit.test.ts:577`](../../src/identity-audit.test.ts#L577)

- `team of` kept apart from the allowlist, awaiting the F4 ruling.
  [`identity-audit.test.ts:390`](../../src/identity-audit.test.ts#L390)

- Voice: no WIP, beta or apologetic word anywhere, hyphenated forms included.
  [`identity-audit.test.ts:821`](../../src/identity-audit.test.ts#L821)

**The page: greybox to full-bleed void**

- Ground, no margin, no page scroll; the body ink makes `<noscript>` readable.
  [`page.css:19`](../../src/shell/page.css#L19)

- The scene host fixed to the viewport, replacing the in-flow `70vh` block.
  [`page.css:38`](../../src/shell/page.css#L38)

- The canvas wrapper fills the host.
  [`scene.tsx:128`](../../src/render-scene/scene.tsx#L128)

- The host's class, on the wrapper that carries the Rail's wheel listener.
  [`scene-host.tsx:268`](../../src/shell/scene-host.tsx#L268)

**The index: hidden until the keyboard reaches it (8a)**

- Clip pattern: still in the AT tree and the tab order, drawn nowhere.
  [`index-nav.css:31`](../../src/shell/index-nav.css#L31)

- Only `:focus-visible` reveals one entry, bottom-left, in chrome type.
  [`index-nav.css:50`](../../src/shell/index-nav.css#L50)

- The one markup change: a class on the `<nav>`.
  [`index-nav.tsx:99`](../../src/shell/index-nav.tsx#L99)

**Re-band: no Body at stroke-dust (4b-i)**

- Two resting steps; recency coarsens from three levels to two.
  [`rules.ts:49`](../../src/derive/rules.ts#L49)

- Schema version 6 → 7, so a stale artifact is rejected rather than read.
  [`artifact-schema.ts:44`](../../src/derive/artifact-schema.ts#L44)

- The scene's mirror, so drawing a Planet at `stroke-dust` throws.
  [`stroke-model.ts:54`](../../src/render-scene/stroke-model.ts#L54)

**The colour scan, widened (4a)**

- Named colours; system colours only where they are paint, and outside forced-colours.
  [`colour-literals.ts:92`](../../scripts/colour-literals.ts#L92)

- `0x` numbers in colour positions; `DUST_SEED` still passes.
  [`colour-literals.ts:151`](../../scripts/colour-literals.ts#L151)

- The second root: `index.html` and every governed file under `public/`.
  [`colour-literals.ts:426`](../../scripts/colour-literals.ts#L426)

- Fixtures scan their own site, never the real repo's.
  [`tokens.ts:671`](../../scripts/tokens.ts#L671)

**Peripherals**

- `<noscript>` without the narration of how the site is served.
  [`index.html:10`](../../index.html#L10)

- The WCAG arithmetic, shared by the chrome test and the audit.
  [`contrast.ts:12`](../../src/shell/contrast.ts#L12)

- The oldest Planet at `stroke-rest`, never `stroke-dust`.
  [`rules.test.ts:434`](../../src/derive/rules.test.ts#L434)

- Colour-scan matrix rows, one test each.
  [`colour-literals.test.ts:146`](../../scripts/colour-literals.test.ts#L146)

- No Body at `stroke-dust` in the committed artifact.
  [`identity-audit.test.ts:859`](../../src/identity-audit.test.ts#L859)

- The page and index declarations, each guarantee driven over a mutation.
  [`identity-audit.test.ts:906`](../../src/identity-audit.test.ts#L906)
