---
title: 'The composed link preview'
type: 'feature'
created: '2026-10-21'
status: 'done'
baseline_revision: 'ad466ad94a591c760207438ec222a95561f70d1c'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** A link to the site pasted into Slack, LinkedIn or a message renders a blank card titled `Cosmos Portfolio`. `index.html` has no `og:`/`twitter:` metadata, no description and no image. The Forward has no reason to tap it (FR-24, UX-DR55).

**Approach:** Thomas ruled on 2026-10-21: Q1 (b), Q2 (a), Q3 (a) with alt text, Q4 (b), Q5 (a)(a).
- A new `scripts/preview.ts` composes the opening frame as a deterministic 1200×630 SVG. It uses the scene's own pure models and the generated tokens, with the opening camera framed at the card's aspect.
- That SVG is captured once to a committed `public/preview.png` with headless Chrome (a manual, documented step, not a build step).
- `index.html` gains a title, a description and root-relative `og:`/`twitter:` metadata. Tests hold the composition, the PNG and the metadata.

## Boundaries & Constraints

**Always:**
- **Composition (Q1 (b)).** Camera = `frameBodies(bodies, DEFAULT_FOV, 1200 / 630)` from `src/render-scene/scene-model.ts`. It has the same direction and target as keyframe 0, framed for the card. The scene itself is unchanged.
  - Project with the perspective camera: vertical fov, looking down −z, depth `d = camera.z − z`, `px = ((x − cx) / (d·tan(fov/2)·A) + 1)/2·W`, `py = (1 − (y − cy)/(d·tan(fov/2)))/2·H`.
  - Draw what First Paint draws, in the scene's draw order and with its models' values:
    - ground `surface-base-dark`
    - each Dust medium as a radial gradient of `DUST_MEDIUM_COLOR` (stops from `falloffAt`, peak `medium.opacity`, projected radius)
    - Dust particles
    - `sceneLines(bodies, railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT))`, i.e. the orbits and the Rail at `stroke-dust-dark`
    - Body outlines as screen circles at the projected `bodyRadius`, with `bodyStroke(body, sceneSubject({scrollProgress: 0,…}, rail))` (so exactly `client:decathlon` is `stroke-focus-dark`)
    - `coreDots`
    - `notableRings`, and `notableMoons` held at `MOON_MIN_RADIUS_PX`
    - the vignette as a radial gradient: `vignette-dark`, 0 opacity inside `VIGNETTE_INNER_STOP`% and `VIGNETTE_OUTER_OPACITY` at the farthest corner
  - Stroke widths are the models' px values.
- **Chrome (Q2 (a)).** The two corner-chrome lines verbatim, as rendered on the scene at First Paint. Their text comes from the shell's constants (`src/shell/chrome-model.ts`, `route-link.ts`), never retyped:
  - top-left: `THOMAS NAVARRO · the model · the chart`
  - bottom-right: `scroll ↓ — time runs backward`
  - Both use the `chrome` type role (family, 9.5px, weight 300, letter-spacing 0.34em) in `ink-label-dark` at the `space-xl` (40px) insets. The line box's top-left / bottom-right corner sits at the inset.
- **Identity.** Every colour, family, size and inset in the SVG is read from `src/tokens/tokens.ts`; no literal hex in `scripts/preview.ts`. There is no `filter`, `feGaussianBlur`, shadow, `rx`/`ry` on rects, or hue.
- **The PNG** is `public/preview.png`, exactly 1200×630, captured from the composed SVG by headless Chrome with LCD text off. The exact command is in `scripts/preview.ts`'s header and `src/derive/README.md`'s re-solve section.
- **Metadata (Q3 (a), Q4 (b)).** `index.html` `<head>`:
  - `<title>Thomas Navarro</title>`
  - `<meta name="description" content="A work history, mapped.">`
  - `og:type` `website`, `og:title` `Thomas Navarro`, `og:description` `A work history, mapped.`
  - `og:image` `/preview.png`, with `og:image:width` 1200 and `og:image:height` 630
  - `og:image:alt` `Six stars on a dark field, one of them white, joined by a faint line, with smaller bodies in orbit.`
  - `twitter:card` `summary_large_image`, and `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt` with the same values
  - No `og:url`, and no absolute URL; that is deferred to 6.5.
- **Copy (Q5 (a)(a)).** EXPERIENCE.md §3 "Where copy exists at all" gains one sentence after the list: `Page metadata — the document's title, its description and the preview image's alt text — is never drawn on any surface; it is not a sixth place, and it is held to the same voice.` The identity audit holds every metadata `content` to a closed `META_COPY` set.

**Block If:**
- A decoded `public/preview.png` pixel exceeds the identity audit's chroma bound (OKLCH C ≥ 0.02), and grayscale capture flags cannot fix it.
- The framed cluster does not fill the card (Star centres span < 50% of the width), meaning `frameBodies` at aspect 1.91 does not answer Q1 (b) on this artifact.

**Never:**
- Changing `frameBodies`, the Rail or anything the scene draws.
- A new dependency, a canvas/sharp/headless-browser package, or a build step that renders.
- The 6.2 drift guard.
- Any disclaimer, badge, "best viewed on desktop", quote or praise.
- A hand-retyped chrome string.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Compose | committed `generated/layout.generated.json` | SVG 1200×630; one `stroke-focus-dark` Star (`client:decathlon`) plus its core; Rail at `stroke-dust-dark`; two chrome `<text>` | No error expected |
| CLI | `node scripts/preview.ts --out <file>` | writes the SVG to `<file>` and prints the capture command | Missing `--out` → exit 1 naming the flag |
| Bad artifact | artifact fails `buildScene` | the models' own throw propagates | non-zero exit, nothing written |

</intent-contract>

## Code Map

- `src/render-scene/scene-model.ts:438` -- `frameBodies(bodies, fov, aspect)`, `DEFAULT_FOV`, `buildScene`. Reuse it; read-only.
- `src/render-scene/rail-model.ts:250,481` -- `buildRail`, `railLine`, `RAIL_LINE_SAMPLES_PER_SEGMENT`. Read-only. Imports `shell/motion-preference.ts`, which is safe under Node.
- `src/render-scene/stroke-model.ts:135-384` -- `sceneSubject`, `bodyStroke`, `bodyRadius`, `coreDots`, `sceneLines`, `strokeWidthPx`, `VIGNETTE_*`. Read-only.
- `src/render-scene/dust-model.ts:59-345` -- `buildDust`, `falloffAt`, `DUST_*`.
- `src/render-scene/notable-model.ts:34-117` -- `notableRings`, `notableMoons`, `MOON_MIN_RADIUS_PX`.
- `src/render-scene/scene.tsx:138-238` -- First Paint draw order. It is the reference; do not edit it.
- `src/shell/chrome-model.ts:42-66`, `src/shell/route-link.ts:37`, `src/shell/corner-chrome.css:29-50` -- the chrome strings and their placement.
- `src/tokens/tokens.ts` -- colours `*-dark`, `typography.chrome`, `spacing.xl` (the `space-xl` token, read as `tokens.spacing.xl`).
- `scripts/` -- outside the `src/` boundary table (`src/derive/boundaries.ts:38`). Its scripts run with `node file.ts`.
- `index.html` -- metadata target.
- `public/.gitkeep` -- delete. `vite.config.ts:7-11`'s comment mentions it, so update that comment.
- `src/identity-audit.test.ts` -- `VISIBLE_COPY` at 609 (`'Cosmos Portfolio'` at 648), `htmlText` pin at 1127, `auditVoice` at 1323, which already scans attributes.
- `src/shell/contrast.ts` -- OKLCH helpers the audit's chroma bound uses. Reuse them for the PNG check.
- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/EXPERIENCE.md:219-230` -- §3 copy places.
- `_bmad-output/implementation-artifacts/deferred-work.md:335-342` -- the two Epic 6 items this resolves.

## Tasks & Acceptance

**Execution:**
- `scripts/preview.test.ts` -- write first. Tests:
  - the I/O rows
  - the camera equals `frameBodies(…, 1200/630)`
  - every Star centre is inside the card, and they span ≥ 50% of its width
  - exactly one `stroke-focus-dark` outline, which is decathlon's
  - every `fill`/`stroke`/`stop-color` value is a token
  - no forbidden element or attribute
  - the chrome text equals the shell constants
  - the PNG: signature, IHDR 1200×630, decoded via `node:zlib` with the filters undone, every pixel's chroma < 0.02, and the white Star is present: the card's brightest pixel lies on the subject's projected outline (within 2px) and is brighter than `stroke-active-dark`, the next step down. The 0.9px `body-client` stroke anti-aliases to about 220/255, so a "within 8/255 of `stroke-focus-dark`" check cannot hold without widening the stroke, which is forbidden.
  - the subject is read from `sceneSubject`, never hard-coded, and asserted to be `client:decathlon` once on the committed artifact
  - every projected mark (outlines, Rings, Moons, cores) lies inside the card, not just the Star centres
  - the alt text's three claims against the artifact: the count word equals the Client count, exactly one outline is `stroke-focus-dark`, and the Rail has at least two points
  - the CLI test asserts the literal `--screenshot=<absolute path to public/preview.png>` and that the printed URL round-trips to `out` through `fileURLToPath`
  - `metas()` fails on a duplicated meta name
  - `index.html`'s metadata as listed
  - `og:image` resolves to an existing file under `public/`
  - the alt text's "Six" equals the artifact's Client count
- `scripts/preview.ts` -- `composePreview(artifact): string` plus the CLI. The header documents the capture command, using Chrome flags `--headless --screenshot --window-size=1200,630 --hide-scrollbars --force-device-scale-factor=1 --disable-lcd-text`. Hardening:
  - The printed command is cwd-independent: an absolute, quoted `--screenshot` path to `public/preview.png` and a `pathToFileURL` URL. A note says that on Windows `chrome` means the full `chrome.exe` path.
  - `project` refuses a point at or behind the camera.
  - The number formatter throws on a non-finite value.
  - A null opening subject throws.
  - A missing or unparseable `--artifact` file, or a missing `--out` directory, exits 1 with one line naming the file, not a stack trace.
- `package.json` -- add `"compose:preview": "node scripts/preview.ts"` (`preview` is taken by `vite preview`). The README and the header use it.
- `public/preview.png` -- capture and commit. `public/.gitkeep` -- delete, and fix `vite.config.ts`'s comment.
- `index.html` -- the metadata above.
- `src/identity-audit.test.ts`:
  - `'Cosmos Portfolio'` → `'Thomas Navarro'` in `VISIBLE_COPY` and the 1127 pin
  - add `META_COPY` and an audit that every `<meta … content>` with a copy name (description, `og:title`/`og:description`/`og:image:alt`, `twitter:title`/`twitter:description`/`twitter:image:alt`) is in it, and that each copy name appears exactly once, with double- or single-quoted attributes both read
  - mutation cases, including one duplicated tag plus one missing tag
- `EXPERIENCE.md` §3 -- the ruled sentence. DESIGN.md §7.12 -- record D-G5's decided treatment (6.1, Q2 (a), Q3 (a)).
- `src/derive/README.md` -- the re-solve section names regenerating the preview (compose, then capture).
- `deferred-work.md` -- mark the two Epic 6 items resolved, except the icon half of the `og:`/description/icon item, which stays open ("no favicon ruled; `/favicon.ico` 404s"), re-appended as an open item. Append the deferral "og:image/og:url/twitter:image absolute once the production origin is chosen (6.1 Q4 (b)) — 6.5".
- `epic-6-context.md` -- regenerate if needed. `sprint-status.yaml` -- 6-1 done. Delete `bmad-build-auto-result-6-1-the-composed-link-preview.md`, since its rulings are recorded here.

**Acceptance Criteria:**
- Given the committed artifact, when `node scripts/preview.ts --out x.svg` runs and x.svg is opened in a browser at 1200×630, then it shows the opening frame's arrangement filling the card: one white Star (decathlon), the Rail at `stroke-dust`, the two chrome lines, with no hue, shadow, glow or radius.
- Given `npm run build`, when `dist/` is inspected, then `dist/preview.png` exists (1200×630) and `dist/index.html` carries the ruled title, description, `og:` and `twitter:` tags pointing at `/preview.png`.
- Given the voice and copy audits, when they run over `index.html`, then no disclaimer, quote or praise is present and every metadata string is in `META_COPY`.

### Review Findings

Follow-up review, 2026-10-28, over `53e5fb5` (code and tests), read against HEAD, beside 6.2. The committed `public/preview.png` was confirmed current: the SVG composed at HEAD is byte-identical to the one at `53e5fb5`.

- [x] [Review][Patch] `writeFileSync(parsed.out, svg)` is unguarded: an `--out` naming a directory, or an unwritable or locked file, throws a stack trace, against the CLI's one-line exit-1 contract [scripts/preview.ts:370]
- [x] [Review][Patch] The documented recipe writes `preview.svg` into the repo root and relies on "then delete the SVG"; nothing ignores it, so it can be committed by accident — add it to `.gitignore` [.gitignore]
- [x] [Review][Patch] The no-absolute-URL assertion still reads "until 6.5", but 6.5 has landed and the item is open on its pre-launch checklist; name the checklist item, so whoever closes it knows to invert this assertion [scripts/preview.test.ts:558]

## Spec Change Log

### 2026-10-21 — review pass 1 (loop 1)
- **Trigger (bad_spec, medium):** the implementation relaxed the Tasks' "some pixel within 8/255 of `stroke-focus-dark`" PNG check inside a test comment. The 0.9px outline anti-aliases to about 220/255, so the check cannot hold without widening the stroke, which the Never list forbids.
- **Amended:** the PNG check, now "brightest pixel on the subject outline, above `stroke-active-dark`". Folded in the review's low patches so they are not re-found:
  - CLI hardening and a cwd-independent capture command
  - the `compose:preview` script
  - duplicate- and missing-tag detection in both meta parsers
  - alt-text claims, marks-inside-card and `sceneSubject`-derived assertions
  - the favicon item kept open
- **Known-bad state avoided:** a spec criterion silently weakened in a test, with the spec and the code disagreeing.
- **KEEP:** the first pass is saved at `spec-6-1-review-1-keep-base.patch` (beside this spec, `git apply --binary`). Start from it; everything else in it is right and must survive:
  - the composer's model reuse and draw order
  - the committed `public/preview.png` (it composed correctly, so recapture only if the SVG output changes)
  - the `index.html` metadata
  - the `META_COPY` audit
  - the doc edits to EXPERIENCE.md §3, DESIGN.md §7.12 / D-G5, `src/derive/README.md`, README and `vite.config.ts`
  - the sprint-status and deferral edits
  
  Do not set the spec's `status` and do not delete the build-auto result file: the orchestrator owns both. Delete the `.patch` file once applied.

## Review Triage Log

### 2026-10-21 — Review pass
- intent_gap: 0
- bad_spec: 1 (medium 1)
- patch: 9 (low 9)
- defer: 0
- reject: 27 (medium 3, low 24)
- addressed_findings:
  - `[medium]` `[bad_spec]` PNG white-Star check relaxed in a test comment. The spec is amended to the achievable check, and the code is reverted for re-derivation from the KEEP base patch.

### 2026-10-21 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11 (medium 1, low 10)
- defer: 0
- reject: 30 (medium 3, low 27)
- addressed_findings:
  - `[medium]` `[patch]` Drawn values were never held to the models. Outline, Ring and Moon radii, the Dust medium radii and gradient stops, and the vignette stops are now recomputed from the model functions and compared, with three mutations that bite.
  - `[low]` `[patch]` The chrome `<text>` `y` and `dominant-baseline` are asserted.
  - `[low]` `[patch]` Both meta parsers: a start-or-whitespace attribute boundary (so `data-name=`/`data-content=` no longer match), case-insensitive names, and a copy meta without `content` fails, each with a mutation case.
  - `[low]` `[patch]` `assertOnAxis` makes `composePreview` refuse an off-axis camera.
  - `[low]` `[patch]` An artifact the models refuse exits 1 with one line and writes nothing.
  - `[low]` `[patch]` The PNG decoder checks chunk bounds, IEND and the inflated length.
  - `[low]` `[patch]` Docs: the PowerShell `&` call operator.
  - `[low]` `[patch]` Docs: recapture after a chrome-copy or token change, not only after a re-solve.
  - `[low]` `[patch]` Docs: the capture font is recorded (Windows, Arial fallback).
  - `[low]` `[patch]` README's `public/` description names `_redirects`.
  - `[low]` `[patch]` Code Map token path is `spacing.xl`.
- Rejected mediums, all settled by ruling:
  - the `scroll ↓` line in a still (Q2 (a))
  - legibility at thumbnail size (Q1 (b), at the models' stroke weights)
  - the root-relative `og:image` (Q4 (b), deferred to 6.5)

## Design Notes

**Rulings (Thomas, 2026-10-21), from the halted first run.**
- Q1 (b): frame at the card's aspect; the scene is unchanged.
- Q2 (a): both chrome lines verbatim.
- Q3 (a): `Thomas Navarro` / `A work history, mapped.`, with alt text.
- Q4 (b): root-relative now; the absolute URL in 6.5, since the origin is undecided.
- Q5 (a)(a): an SVG composer plus a one-off headless capture; page metadata sits outside the five copy places.

Honesty (D-G5) is carried by the wording: "mapped" holds on the scene and on the chart, and nothing promises 3D or interaction. The still shows `the chart`.

## Verification

**Commands:**
- `npm test` -- expected: all pass (one environmental skip as before)
- `npm run typecheck` -- expected: clean
- `npm run build` -- expected: gate green, entry under 4,000 bytes, `dist/preview.png` present

**Manual checks:**
- Open `public/preview.png`. It should be the opening composition at card size, legible, with one white Star and the two chrome lines.

## Auto Run Result

**Summary.** A link to the site now unfurls as a composed preview, built as Thomas ruled on 2026-10-21 (Q1 (b), Q2 (a), Q3 (a) with alt text, Q4 (b), Q5 (a)(a)).
- `scripts/preview.ts` composes the opening frame as a deterministic 1200×630 SVG.
  - It uses the scene's own pure models and the generated tokens. The camera is `frameBodies` at the card's aspect: keyframe 0's aim, framed for the card. The scene is unchanged.
  - Its contents: one white Star (decathlon, read through `sceneSubject`), the Rail at `stroke-dust`, the orbits, the Ring and Moon, the Dust, the vignette, and both corner-chrome lines from the shell's constants.
- The SVG was captured once with headless Chrome to the committed `public/preview.png`.
- `index.html` carries the title `Thomas Navarro`, the description `A work history, mapped.`, and root-relative `og:`/`twitter:` tags with alt text.
- Page metadata sits outside the five copy places (EXPERIENCE.md §3), held to a closed `META_COPY` list. DESIGN.md D-G5 is resolved.

**Files changed**
- `scripts/preview.ts` (new): the composer, `assertOnAxis`, the CLI (`npm run compose:preview -- --out <file>`), and a cwd-independent capture command.
- `scripts/preview.test.ts` (new), 18+ tests:
  - composition, camera, bounds, drawn values against the models, token-only paint, chrome text and placement
  - the CLI paths
  - the PNG, decoded: size, chroma < 0.02, white Star present
  - the metadata, the alt text's claims against the artifact, and duplicate- and missing-tag detection
- `public/preview.png` (new, 1200×630); `public/.gitkeep` deleted.
- `index.html`: the title, description, and `og:`/`twitter:` metadata.
- `package.json`: the `compose:preview` script.
- `src/identity-audit.test.ts`: `Thomas Navarro` replaces `Cosmos Portfolio`. Adds `META_COPY` and `auditMetaCopy` (exactly once, quote- and case-tolerant, content required), with mutation cases.
- `vite.config.ts`: the `public/` comment.
- `README.md`: the `public/` description.
- `src/derive/README.md`: regenerating the preview (compose, then capture; when to recapture; PowerShell note; capture font).
- EXPERIENCE.md §3: the metadata sentence.
- DESIGN.md §7.12 and D-G5: the decided treatment.
- `deferred-work.md`: the Epic 6 items are resolved; the favicon stays open, and the absolute `og:image`/`og:url` is deferred to 6.5.
- `sprint-status.yaml`: 6-1 is done and epic-6 is in-progress.
- `epic-6-context.md`: compiled.

**Review**
- Pass 1: 1 bad_spec (medium), a spec criterion that was weakened inside a test. The spec was amended, the code reverted and re-derived from a KEEP patch, and the pass's 9 low patches were folded in.
- Pass 2: 11 patches applied (medium 1, low 10), none deferred, 30 rejected.

**Follow-up review recommended: true.** Pass 2 patched medium 1 and low 10, so the score is 3×1 + 10 = 13, which is ≥ 5.

**Verification**
- `npm test`: 1617 tests, 1616 pass, 1 environmental skip.
- `npm run typecheck`: clean.
- `npm run build`: gate green, entry 3,057 of 4,000 bytes, `dist/preview.png` present, and `dist/index.html` carries the tags.
- The PNG was inspected by eye: it shows the opening composition, one white Star, and both chrome lines.

**Residual risks**
- **Legibility at card size.** Strokes are at the models' 0.7–0.9px and the chrome is at 9.5px. At a 400–550px Slack or LinkedIn thumbnail the card reads dim and the chrome is unreadable. This was ruled (Q1 (b)), but it is worth a look at a real unfurl in 6.5.
- **The still shows `scroll ↓ — time runs backward`**, an instruction to a Fallback visitor that the Fallback may not honour. This was ruled (Q2 (a)); Thomas may want Q2 (b) or (c).
- **The relative `og:image`.** LinkedIn and Facebook may show no image until 6.5 makes it absolute.
- **The capture is manual.** It depends on the local Chrome and fonts (Arial on Windows). Nothing ties the PNG's content to the current SVG; the 6.2 drift guard compares only timestamps.
- **Thin Star spread.** The Stars span 51% of the card's width against the 50% block threshold, so a re-solve could trip it.
- **One unguarded failure.** A write failure other than a missing `--out` directory still prints a stack trace.
