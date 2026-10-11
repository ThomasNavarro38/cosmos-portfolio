# Identity definition-of-done audit — Story 3.9

Audit date: 2026-10-11. Baseline: `3b6402a`. Spec: `spec-3-9-identity-definition-of-done-audit.md`.

Automated rows name the test that holds them. Each audit runs over the shipped source and over at least one mutation that must fail with that audit's own message. Manual rows give a protocol and leave the **Result** column empty for Thomas (ruling 2: the story closes once the protocol is written and the automated checks pass).

Commands: `npm test`, `npm run typecheck`, `npm run gate`.

## Epic ACs

| # | Epic AC (Story 3.9) | Kind | Held by / protocol | Result |
| --- | --- | --- | --- | --- |
| 1a | FR-20: a defined palette, line weight, typography, label treatment and UI chrome exist and are applied consistently | Automated | Palette and type: `scripts/tokens.test.ts` (generated tokens from DESIGN.md, banners, freshness) and the gate's colour scan, `scripts/colour-literals.test.ts` (all `3.9:` tests). Line weights and ladders: `src/render-scene/stroke-model.test.ts`, `scene-model.test.ts` "no ink token on a line, and no stroke token on a label". Labels: `affordance-model.test.ts`, `mote-model.test.ts`. Panel: `panel-model.test.ts` exact-declaration audit of `focus-panel.css`. Chrome: `chrome-model.test.ts` exact-declaration audit of `corner-chrome.css`. Page and index: `src/identity-audit.test.ts` "page: …" and "index: …" | pass |
| 1b | No element reads as a placeholder or as an untextured asset awaiting a pass | **Manual** | See protocol P1 below | |
| 2 | No "work in progress" disclaimer, badge, beta tag or apologetic microcopy, in any register | Automated (scan) + manual (register) | `src/identity-audit.test.ts` "voice: no work-in-progress, beta or apologetic word in shipped strings, career.json or index.html" and "voice: a beta tag, an apology or a placeholder fails with its own line". The register the word list cannot see is in protocol P2 | scan: pass. Register (P2): |
| 3 | Copy only in the five places; no tooltips, onboarding, empty states, help text, or captions explaining marks | Automated | `src/identity-audit.test.ts` "copy: the copy constants are each in the closed allowlist", "copy: every visible literal shipped from src/ and index.html is in the closed allowlist", "copy: a tooltip, a caption, help text or a narrated noscript fails with its own line". Structural labels are allowed in a closed list (ruling 3). JSX is read as JSX (text runs, literals in child expressions, constants drawn whole), and stylesheet `content:` strings are scanned. `team of` is in the closed list (F4, ruled 2026-10-11). Text with no letters passes only as separators (whitespace, ` · `): a digit, a `?` or an emoji is drawn text. `.html`/`.svg` under `src/` are read as markup. The Colophon annotations and the contact route are not built yet (Epic 5), so they hold no copy today | pass |
| 4 | Voice refusals: no discountable claims, no boasting about build difficulty, no narration of how the site was made, no responsibility-instead-of-choice prose in a Notable, no fabricated testimonials, no published criticism of a named Client | **Manual** | See protocol P2 below | |
| 5 | Contrast: Notable prose and panel title ≥ 7:1; field values and prose at rest ≥ 7:1; field labels, editorial rule, all three Mote label tiers, corner chrome and scene labels ≥ 4.5:1 | Automated | `src/identity-audit.test.ts` "contrast: every text role clears its floor on its ground, read from the shipping source" and "contrast: a role moved to a dimmer ink, or one whose ink cannot be read, fails with its own line". `chrome-model.test.ts` "the chrome ink clears the 4.5:1 floor". All Mote label tiers share one ink, `MOTE_LABEL_COLOR` | pass |
| 6 | NFR-1a: an unprompted viewer of the first frame and first fifteen seconds registers a real work history, organised rather than listed, deliberately designed | **Manual** | See protocol P3 below | |
| 7 | FR-9 / R-3: a reader who has not seen the site, shown a Client stop, can state which Projects carry a written argument without focusing any | **Manual** | See protocol P4 below | |
| 8 | UX-DR7: not one shipped colour value carries a hue | Automated | `src/identity-audit.test.ts` "achromatic: every -dark colour token has OKLCH chroma < 0.02", "achromatic: the cool cast is a deliberate neutral", "achromatic: a token drifting toward the threshold, or warming, fails the cast with its own line", "achromatic: a hue in any -dark token fails, naming it". No literal colour can bypass the tokens: `scripts/colour-literals.test.ts`. **One ruled exception:** under `@media (forced-colors: active)` the system's own colours are drawn — `CanvasText` (chrome, index, panel) and the constraint sentence's `Highlight` (`focus-panel.css`, ruled in 3.6) — because there the user's palette, not ours, is the point. The scan exempts system colours only inside that block | pass |

### The contrast table, as measured

**The test is the authority; these figures are a snapshot** taken on 2026-10-11. The contrast test reads each ink and ground off the shipping source on every run, so a change to a stylesheet or a token is measured there, not here.

Grounds: `surface-raised-dark` (`#0D0D10`) for panel roles, read off `panelStyle(true).background`. `surface-base-dark` (`#08080A`) for every other role, read off `page.css`'s `html, body` background.

| Role | Ink (read from) | Ground | Ratio | Floor |
| --- | --- | --- | --- | --- |
| Notable prose | `ink-prose-dark`, `focus-panel.css .panel-prose` | raised | 9.63 | 7 |
| Notable constraint sentence | `ink-lift-dark`, `.panel-lift` | raised | 17.36 | 7 |
| Panel title | `ink-lift-dark`, `.panel-title` | raised | 17.36 | 7 |
| Field values | `ink-prose-dark`, `.panel-fields td` | raised | 9.63 | 7 |
| Field labels | `ink-label-dark`, `.panel-fields th` | raised | 5.68 | 4.5 |
| Panel kicker | `ink-label-dark`, `.panel-kicker` | raised | 5.68 | 4.5 |
| Editorial rule | `ink-label-dark`, `.panel-rule` | raised | 5.68 | 4.5 |
| Skills | `ink-label-dark`, `.panel-skills` | raised | 5.68 | 4.5 |
| `release` (and raised on hover/focus) | `ink-label-dark` / `ink-prose-dark`, `.panel-release` | raised | 5.68 / 9.63 | 4.5 |
| Mote label (all tiers) | `ink-label-dark`, `mote-model.ts MOTE_LABEL_COLOR` | base | 5.85 | 4.5 |
| Chrome (and the slot raised) | `ink-label-dark` / `ink-prose-dark`, `corner-chrome.css` | base | 5.85 / 9.93 | 4.5 |
| Affordance title | `ink-lift-dark`, `affordance-model.ts affordanceTitleLabelStyle` | base | 17.90 | 4.5 |
| Affordance secondary line | `ink-label-dark`, `affordanceSecondaryLabelStyle` | base | 5.85 | 4.5 |
| Index reveal | `ink-label-dark`, `index-nav.css .index-nav button` | base | 5.85 | 4.5 |
| `<noscript>` line | `ink-label-dark`, `page.css body` | base | 5.85 | 4.5 |

### Achromatic, as measured

**The test is the authority; these figures are a snapshot** taken on 2026-10-11, computed from `src/tokens/tokens.ts`.

Every `-dark` token sits at OKLCH hue ≈ 286° with chroma between 0.0027 (`ink-lift`, `stroke-focus`) and 0.0159 (`ink-quiet`). All are below the 0.02 threshold (ruling 1b).

## Manual protocols

Run each one in the dev server (`npm run dev`) at 1440×900, in a desktop browser at 100% zoom, unless the protocol says otherwise. Record the date, the viewer and the verdict in the **Result** column above.

**P1 — Nothing reads as a placeholder (AC 1b).**
1. Load the page cold. Then Tab through every index entry, focus one Deep and one Shallow Project, release, enter free flight, and return.
2. At each state, look for anything that reads as unfinished: a default browser control, a system font, an unstyled list, a white or grey box, a default focus ring, a bare or untextured mesh, a flat-shaded or default-material object, a loading spinner, or an empty area that looks like it is waiting for content.
3. Pass when none is found. Note each one that is found, with its state.

**P2 — The voice refusals (ACs 2 and 4).**
1. Read every shipped string: the copy allowlist in `src/identity-audit.test.ts` (`VISIBLE_COPY`), the accessible names (`ACCESSIBLE_NAMES`: `Destinations`, `Skills`), the affordance's secondary-line format (`{role} · team of {team_size} · {Deep|Shallow}`, read on at least one real Project), every Notable and field value in `src/data/career.json`, and the `<noscript>` line.
2. For each string, check for: a discountable claim ("world-class", "best-in-class", "expert"); boasting about build difficulty; narration of how the site was made; responsibility-instead-of-choice prose in a Notable ("I was tasked with" in place of "I chose"); a testimonial; criticism of a named Client; and any WIP, beta or apologetic register the word scan cannot see.
3. Pass when none is found. Note each one that is found, with its string. Fixing a hit in `career.json` is Ask First.

**P3 — The opening fifteen seconds (AC 6, NFR-1a).** At least three viewers, each tested separately.
1. Find a viewer who has never seen the site. Tell them only "this is a personal site". Load it cold in front of them.
2. Let them look for fifteen seconds without prompting. Then ask, without leading: what is this? Is it organised, and how? Was it designed deliberately, or is it a template?
3. A viewer meets it when they unprompted name a real work history, an organisation (by client, or by time), and deliberate design. **P3 passes only when every viewer meets it**; record each viewer's answer.

**P4 — Deep is legible at a Client stop (AC 7, FR-9 / R-3).** At least three viewers, each tested separately; none of them may have taken P3 in the same sitting.
1. Find a viewer who has never seen the site. Explain nothing about Moons or Rings.
2. Scroll the Rail to a Client stop that holds both Deep and Shallow Projects. Do not hover and do not focus anything.
3. Ask: "Which of these projects carry a written argument?" Let them answer by pointing.
4. A viewer meets it when every Deep Project is named and no Shallow one is. Repeat on a compressed screenshot of the same frame (JPEG, quality 60) and on a low-DPI display if one is available. **P4 passes only when every viewer meets it**, on every surface tried; record each viewer's answer.

## Findings and how each was closed

| # | Finding | Closed by |
| --- | --- | --- |
| F1 | The page was still greybox. The document's white ground and default margin showed around a `70vh` canvas, the page scrolled, and the identity line overlapped the scene band. | Ruling 7a. `src/shell/page.css`: `html`/`body` at margin 0, `overflow: hidden`, `surface-base-dark`. `.scene-host` is `position: fixed; inset: 0`, imported once by `App.tsx`. The wrapper and the Canvas in `scene.tsx` are `100%` by `100%`. Held by "page: …" in `identity-audit.test.ts`, and by `auditCanvasSurface` and `auditVignette` in `scene-model.test.ts` (the `70vh` fixtures were re-pinned to `100%`, and `70vh` was added as a rejected form). In the browser at 1440×900 the canvas is the full frame, the ground is `rgb(8, 8, 10)` and nothing scrolls. In review: `body` carried no ink, so the `<noscript>` line would have been the browser's black on the void; `body` now takes `ink-label` in the chrome family and size, held by the page audit and the contrast table's `<noscript>` row. |
| F2 | The DOM index drew as default buttons and lists on screen, `Deep`/`Shallow` included. | Ruling 8a. `src/shell/index-nav.css`, applied through `<nav className="index-nav">`. Every entry is clipped (`clip-path: inset(50%)`, fixed). Only `:focus-visible` unclips it, bottom-left at the `--space-xl` inset, in `chrome` / `ink-label`, with no box, and with a `1px solid CanvasText` outline under forced colours. The `<nav>` stays in the accessibility tree and the tab order. Held by "index: …". In the browser, Tab reveals exactly one entry, and a Project entry also draws its scene affordance. |
| F3 | The colour ban missed whole classes of literal: CSS named colours, system colours, the CSS Color 4 functions, `0x` numbers handed to a colour, and every file outside `src/` scripts and stylesheets. | Ruling 4a. `scripts/colour-literals.ts` now flags all of these. It also scans `index.html`, every governed file under `public/` (scripts, stylesheets, `.html`, `.svg` — the same classification as `src/`), and `.html`/`.svg` under `src/` (HTML comments skipped), and skips `*.test.tsx` and `*.spec.ts`. In review: a system-colour word is flagged only where it is paint (a CSS value, a markup paint attribute, a script string under a colour-shaped key), so `createElement('canvas')`, `'mark'` and `<canvas id="canvas">` pass; `.set(0x…)` is flagged on a colour-named receiver only (`material.color.set(`, not `map.set(`, ruled 2026-10-11); markup is read for declarations only in `style` attributes and `<style>` blocks, never in a URL or body text; `href="#add"` and `url(#bed)` are fragments, not hex; a quoted string inside a CSS value is read past (`url("a.png") white` fails); the boolean `@media (forced-colors)` exempts like `: active`; a script's `'the lab (Paris)'` is prose; extensions match in any case, `.htm` included; `@media not (forced-colors: active)` exempts nothing; a fixture `src` with no `site` now scans the site beside it, not the real repo's; and the remaining numeric blind spots (`Color(16777215)`, `Color(1, 1, 1)`, `setHSL`) are listed in the scan's header. `color-mix(`, `transparent`, `currentColor` and `DUST_SEED = 0x2a5d17` pass. `scripts/tokens.ts` runs the second root (`--site=` seam). The widened scan found no new hit in the shipped tree. Held by the `3.9:` tests in `scripts/colour-literals.test.ts` and "the gate runs the second root" in `scripts/tokens.test.ts`. |
| F4 | The affordance's secondary line `{role} · team of {team_size} · {Deep\|Shallow}` (ruled in 3.4) ships the words `team of`, and the 3.9 allowlist does not name them. | Thomas ruled on 2026-10-11: `team of` is a structural label. It joins `VISIBLE_COPY`, and the separate `FORMAT_FRAGMENTS` list is gone. Any other fragment still fails, as the mutation `a team of` shows. |
| F5 | The oldest Planets were drawn at `stroke-dust`, the Rail's and the Dust's step, below their own `stroke-rest` orbit (contrary to DESIGN.md §2). | Ruling 4b-i. `RESTING_BANDS = ['stroke-rest', 'stroke-near']`, the fallback is `'stroke-rest'`, and `SCHEMA_VERSION` went 6 → 7. The artifact was regenerated (`npm run solve`). The scene's `RESTING_STEPS` mirrors this, and `bodyStroke` throws on a `stroke-dust` Planet. Held by `rules.test.ts` "the resting band is two steps…", `artifact-schema.test.ts` (version 7, `stroke-dust` rejected, a version 6 artifact rejected), `stroke-model.test.ts`, and "bands: no Body in generated/layout.generated.json carries stroke-dust". |
| F6 | Every `-dark` token carries a cool cast (hue ≈ 286°). | Ruling 1b: recorded as a deliberate neutral, not fixed. Chroma ≤ 0.016 < 0.02. Changing it would move every contrast ratio for no visible gain. Held by the "achromatic" tests. |
| F7 | The `<noscript>` narrated how the site is served ("Its content is served by the page itself, not a server…"), which is a voice refusal (narration of how the site was made). | `index.html` now reads `This portfolio needs JavaScript.`, which is in the allowlist. |
| F8 | The WCAG contrast arithmetic lived inside `chrome-model.test.ts`, so a second floor would have meant a second copy. | It moved to `src/shell/contrast.ts` (test support, imported by no shipped module), which `chrome-model.test.ts` and `identity-audit.test.ts` share. |

## Known limits

- **Contrast is measured on the flat ground only**: `surface-base-dark` or `surface-raised-dark`. It is not measured over strokes, the Dust, or the vignette's gradient, where a label can sit on a lighter or darker pixel than the token ground.
- **Opacity fades are not measured.** A label mid-fade (the panel's cross-fade, a Mote condensing or decaying) is drawn at less than its token's contrast for the length of the fade.
- **Non-text contrast (WCAG 1.4.11) is not audited**: strokes, Rings, Moons, the focus outline and the hairline underline have no floor here.
- **The copy scan is a heuristic.** It reads JSX as JSX and the drawn attributes, DOM writes and copy-keyed model literals by pattern; a string that reaches the page some other way (built from a variable in a model, say) is outside it.
- **The colour scan's numeric blind spots** are listed in `scripts/colour-literals.ts`'s header.

## Follow-ups

- **The epic AC's band range is superseded.** The epic text binds `luminanceBand` to `stroke-dust … stroke-near`; ruling 4b-i narrowed it to `stroke-rest`, `stroke-near`. The epic and DESIGN.md wording should follow (DESIGN.md is Ask First).
- **A recency check on the two-step band.** With two steps, recency reads coarser; confirm in the browser that the recent/old split still reads as recency at a Client stop and across the Rail, and that no Client stop is all one band where the split matters.

Deferred items stay deferred, and this audit does not touch them: 4c (font-measured label widths), 4d (stripper bugs), and the 3.8 deferrals (resize lag, safe-area insets, banner landmark).
