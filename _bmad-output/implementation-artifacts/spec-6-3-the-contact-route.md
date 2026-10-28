---
title: 'The contact route'
type: 'feature'
created: '2026-10-22'
baseline_revision: '66f2bc13f1a1cc5181cbedc374c5ca5bc7d47ead'
status: 'done'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** The site has no way to reach Thomas (FR-23). A bare `mailto:` dead-links on the locked-down corporate laptops NFR-4 names, so the route must show a visible address that can be copied, and it must not need a backend.

**Approach:** One shared shell component draws the address as a `mailto:` link, with a `copy` button beside it. The button's label changes in place: `copied` on success, `not copied` when the clipboard is blocked. The component is drawn on the Fallback chart beside its heading and on the Colophon after its `<h1>`. It is never drawn on the scene. Its copy and its press logic live in an import-free module.

## Boundaries & Constraints

**Thomas's rulings (2026-10-22):**
- **Q1, deferred.** The real address is not known yet. Ship with the placeholder `address@example.invalid`; the reserved `.invalid` TLD can never deliver. A `todo` test makes the placeholder visible in every `npm test`. The address must be supplied before the 6.5 launch pass.
- **Q2 (d).** Not drawn on the scene. The Colophon and the Fallback only.
- **Q3 (a).** On the chart, beside the heading.
- **Q4 (b).** The address is itself a `mailto:` link, with a separate copy button.
- **Q5.** Keep it simple. A blocked clipboard shows its own text. Strings: `copy`, then `copied` or `not copied`. The label stays until the next press: no timer, no toast, no live region.

**Always:**
- **Copy.** It lives in `src/shell/contact.ts` as one single-line literal: `export const CONTACT = { address: 'address@example.invalid', copy: 'copy', copied: 'copied', failed: 'not copied' } as const;`. Everything is held verbatim by the identity audit.
- **The mailto link.** The address is the link's visible text and its accessible name, and it can be selected by hand. The `href` is exactly `mailto:` + `CONTACT.address`.
- **The button.** A `<button type="button">` whose text is the current label. It is never `disabled`.
- **The press runs in a tracker.** `createContactCopy(writeText, setState)` in `contact.ts` is pure and import-free, and receives `writeText` as an argument. The `.tsx` passes it a bound `navigator.clipboard.writeText` when present, or `undefined`.
  - Every press attempts a copy.
  - The newest press's outcome wins; an older press's late result is dropped.
  - `stop()` (unmount) drops any late result.
  - A missing `writeText`, a synchronous throw, or a rejection each give `failed`.
- **No backend.** No form, no fetch or network, no third-party endpoint. Nothing is submitted.
- **Styles.** Token-only, in `src/shell/contact-route.css`, mirroring the chart's chrome links and `.colophon-solve`:
  - type: the chrome type role
  - colour: `ink-label`, raised to `ink-lift`/`ink-prose`
  - focus: `outline: 1px solid var(--color-stroke-focus-dark)`
  - a forced-colors rule
  - nothing the identity audit bans

**Block If:**
- The `ui` manual-chunk placement (`vite.config.ts:44-48`) cannot hold the new shell modules without React or the component reaching the entry chunk, or without breaking the entry's 4,000-byte budget.

**Never:**
- Drawn on the scene or in the corner chrome.
- A tooltip or `title=`, help text, a caption, a toast, a banner, a modal, `aria-live`/`role="status"`, a timer, or an apology.
- `<code>`/`<kbd>` around the address.
- A third chrome line.
- Changing the chart's `<h1>` or `p.chart-routes` contents (`chart.test.ts:66-70`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Copy works | `writeText` resolves | label `copied` | — |
| Clipboard blocked | `writeText` rejects | label `not copied`; address still readable/selectable | no throw, nothing logged |
| No clipboard API | `writeText` undefined (insecure context) | label `not copied` | no throw |
| Sync throw | `writeText` throws | label `not copied` | caught |
| Press again | after `copied`/`not copied` | new attempt; label reflects newest outcome | older late result dropped |
| Unmounted | result arrives after `stop()` | no state update | — |
| First render | — | label `copy` | — |

</intent-contract>

## Code Map

- `src/render-fallback/chart.tsx:99-110`: the `.chart-chrome` row. Render `<ContactRoute />` as a sibling **directly after the `<h1>`, before `p.chart-routes`**: beside the heading, per ruling Q3 (a). It stays outside the `<h1>` and the routes line. Its header doc (:12-14) names the chrome row and the imports; update both.
- `src/render-fallback/chart.css` (`.chart-chrome`, ruled in `identity-audit.test.ts` `CHART_RULES` ~:1726-1733): the row is `flex` + `justify-content: space-between`, built for two items.
  - Lay it out so the heading and the route sit together at the start, and `p.chart-routes` stays opposite at the end. For example: `justify-content` at the start, a token column gap, and `margin-left: auto` (or `margin-inline-start: auto`) on `.chart-routes`.
  - The ≤640px stacking still holds.
  - Narrow `.chart-chrome a` to the heading's and the route line's links (e.g. `.chart-heading a, .chart-routes a`), so `contact-route.css` alone styles the address on both surfaces.
  - Update `CHART_RULES` and its mutation rows to match.
- `src/render-fallback/chart-model.test.ts:724`: the `PERMITTED_SPECIFIER` import allowlist. Admit `../shell/contact-route.tsx` and nothing else; React stays banned in chart.tsx. `src/render-fallback/README.md:5` restates the list.
- `src/render-fallback/chart.test.ts`: renders via `scripts/render.ts` (static markup, no effects). Pins hold: exactly two `onClick=` in chart.tsx (:307), two `aria-hidden` (:269), and the `<h1>`/routes contents (:66-70). Add assertions for the route in the render.
- `src/colophon/colophon.tsx:153-158`: render `<ContactRoute />` directly after `<h1>the model</h1>`, unconditionally (drawn even before the exhibits arrive). Update the header doc's import sentence (:70-74, "not the shell").
  - `src/colophon/colophon.test.ts` renders `ColophonPage` and audits wiring by source regex (:526-565).
  - `identity-audit.test.ts:2043-2047` (`auditColophon`) pins counts and imports: two `<h2`, two `<p`, one `<button` in colophon.tsx. Those stay true because the route's markup is in its own file. Widen the pinned import lines.
- `src/derive/maintenance.test.ts:690-694`: the exact colophon.tsx import list and its title. Widen it. Add `importsOf('src/shell/contact.ts')` = `[]` with red rows (pattern :734-747). Update `src/colophon/README.md:5`.
- `scripts/bundle-assertion.test.ts`:
  - :222-224 `exhibitFailures` fails any non-colophon module inside the colophon chunk. The new shell modules must land in the `ui` chunk, not the colophon chunk.
  - :417-421 and :492-496 pin the chunks' own modules.
  - :521-560 must still find no react-dom, scene or mount chunk reachable from a renderer.
- `vite.config.ts:20-48`: the `ui` group. Add `src/shell/contact.ts` and `src/shell/contact-route.tsx` (and its CSS) per the comment's rule for shell modules shared with the mount.
- `src/colophon/live-solve.ts` / `live-solve.test.ts:173-276`: the tracker pattern to mirror. Sinks arrive as arguments, there are no DOM globals, and it is executed directly.
- `src/shell/chrome-model.test.ts:150`: the "no DOM global" scan pattern. Apply it to `contact.ts`, including `navigator`.
- `src/identity-audit.test.ts`. Mirror 5.5:
  - `VISIBLE_COPY` :677-682: add all four strings.
  - `COPY_CONSTANTS` :697: add `CONTACT`.
  - A reader like `liveSolve()` :1042-1045, spread into `copyConstants()` :1062-1064.
  - Key, visible and red rows: :1084-1111.
  - JSX-reader rows: :1159-1163.
  - New rule set for `contact-route.css`, audited like `CHART_RULES` :1719-1812 / `COLOPHON_RULES` :1928-1988 with `auditDeclarations`/`auditBans`.
  - Contrast `ROLES` :335-339 pattern.
  - `NON_TEXT_ROLES` :352-363: the focus outline and underline.
  - `src/shell/` modules are imported directly (:51-56); `contact.ts` can be.
- `src/colophon/colophon.css:1976-1987` (`.colophon-solve`) and `chart.css` chrome links: the treatments to mirror.
- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/EXPERIENCE.md:716-724`: replace §7.5's `[ASSUMPTION…]` with the ruled route. Cover the placement and the strings, and note the address is deferred.
- `_bmad-output/implementation-artifacts/deferred-work.md`: append the address deferral.
- `_bmad-output/implementation-artifacts/sprint-status.yaml:108`: `6-3-the-contact-route` becomes `done`.

## Tasks & Acceptance

**Execution:**
- `src/shell/contact.test.ts`: write first.
  - The tracker: every I/O row, newest-press-wins, `stop()`, and no `writeText` calls beyond the presses.
  - The copy literal's exact values.
  - Import-free, with no DOM globals.
  - `test('the real address is supplied', { todo: 'Thomas to supply before 6.5' }, …)`, asserting the address does not end in `.invalid` and matches a plain address shape (`/^[^@\s]+@[^@\s]+\.[^@\s.]+$/`).
- `src/shell/contact.ts`: `CONTACT`, `ContactCopyState` (`'idle' | 'copied' | 'failed'`), `createContactCopy`, and `contactLabel(state)`.
- `src/shell/contact-route.tsx` + `contact-route.css`:
  - `ContactRoute` holds `useState`, builds the tracker once and stops it on unmount.
  - It renders `<p className="contact-route"><a className="contact-address" href=…>{address}</a> <button type="button" className="contact-copy">{label}</button></p>`.
  - Export a `ContactRouteView({ label, onCopy })` (or equivalent) for static-render tests.
  - `.contact-address` carries `overflow-wrap: anywhere`, so a long real address never scrolls the page sideways at phone width.
- `src/shell/contact-route.test.ts`: execute the bound clipboard lookup, not only a regex over it. Install a fake `navigator.clipboard` with a recording `writeText`, render `ContactRoute`, take the button's recorded `onClick` and call it. Then assert:
  - `writeText` received `CONTACT.address`, with the fake clipboard as `this`;
  - with no clipboard, and with a clipboard lacking `writeText`, nothing is written and nothing throws.

  Export the lookup (e.g. `clipboardWrite`) if that is the cleanest way to execute it.
- `vite.config.ts`: the `ui` group.
- `src/render-fallback/chart.tsx`, `chart-model.test.ts`, `chart.test.ts`, `README.md`: place and test the route.
- `src/colophon/colophon.tsx`, `colophon.test.ts`, `README.md`, `src/derive/maintenance.test.ts`: place and test the route, and widen the pins.
- `scripts/bundle-assertion.test.ts`: assert the new modules sit in neither the entry nor the colophon chunk, and that no renderer reaches react-dom. Widen only what the build shows must change.
- `src/identity-audit.test.ts`: admit the copy, the CSS rules, contrast rows and markup hooks, with mutation rows.
- EXPERIENCE.md §7.5, `deferred-work.md`, `sprint-status.yaml`: as in the Code Map.
  - The deferred-work entry lists **every** place the address swap touches: `contact.ts`, the `VISIBLE_COPY` row, and the placeholder literals in `contact.test.ts` and EXPERIENCE.md §7.5.
  - Leave `sprint-status.yaml` 6-3 alone until the run finalizes.
- `_bmad-output/implementation-artifacts/epic-6-context.md`: make it agree with the rulings.
  - The route is on the Fallback and the Colophon, never the scene.
  - Placement and copy are ruled (Q1–Q5, 2026-10-22), not open.
  - 6.1 and 6.2 are done, and 6.3 is in progress.
- Stale prose that this change makes untrue:
  - `src/render-fallback/README.md`'s "no import from `react`" line, and the `PERMITTED_SPECIFIER` comment in `chart-model.test.ts`: chart.tsx itself still imports no React, but reaches it through `contact-route.tsx` in the `ui` chunk. Say so.
  - `colophon.test.ts`'s header "the `<h1>` alone".

**Acceptance Criteria:**
- **The route is drawn.** Given the built site on `/chart` (or the Fallback), when it renders, then the chrome row shows the address as a `mailto:` link and a `copy` button, both reachable by Tab. The link's accessible name is the address.
- **The Colophon.** Given `/colophon`, when it renders, then the same route appears directly under `the model` heading, before the exhibits arrive.
- **Not on the scene.** Given the scene, when it renders, then no contact route appears.
- **The press.** Given a browser that allows the clipboard, when `copy` is pressed, then the button reads `copied` in place, with no other element added.
  - When the clipboard is blocked, it reads `not copied`.
  - The address stays visible in both cases.
- **Nothing breaks.** Given `npm run build`, then the gate is green and the entry stays under 4,000 bytes with no React. The bundle assertions hold.
- **The deferral is visible.** Given `npm test`, then everything passes, and the address `todo` is reported as pending.

### Review Findings

Follow-up review, 2026-10-28, over `175942c` and `f5d735c` (code and tests), read against HEAD (the Colophon's chrome row, `5b534e5`, included). No acceptance criterion is violated; the AC wording on the placeholder and "directly under `the model`" is overtaken by the Q1 closure and ruling (a).

- [x] [Review][Patch] The route line's `margin-inline-start: auto` works only by cascade order (after the shared `margin: 0` rule, before the phone override), in `chart.css` and `colophon.css` alike, and `auditDeclarations` checks no order: a reordering keeps every test green and drops the placement ruling Q3 (a) asks for [src/identity-audit.test.ts]
- [x] [Review][Patch] `src/shell/README.md`'s `contact.test.ts` row still ends with "the `todo` that keeps the placeholder address visible"; f5d735c removed it [src/shell/README.md:58]
- [x] [Review][Patch] The Colophon's route is still described as "under its `<h1>`"; since `5b534e5` it sits in the chrome row beside the heading [src/shell/README.md:59, src/shell/contact-route.tsx:4]
- [x] [Review][Patch] `src/colophon/README.md` says the live result touches "no shell module", beside the same row listing two shell imports; it means no shell state [src/colophon/README.md:12]
- [x] [Review][Patch] `src/shell/README.md`'s Imported by names only `index.html` and dynamic imports, but the renderers and the Colophon import shell modules statically (now `contact-route.tsx` too) [src/shell/README.md:6]
- [x] [Review][Defer] That a screen reader re-announces the focused button's changed name (`copied` / `not copied`, the route's only feedback, live regions ruled out) is asserted in a comment but checked nowhere, by test or recorded manual protocol [src/shell/contact-route.tsx] — deferred, pre-existing
- [x] [Review][Defer] `VISIBLE_COPY` admits `copy`, `copied`, `not copied` globally, not only through `CONTACT` in `contact-route.tsx` [src/identity-audit.test.ts] — deferred, pre-existing
- [x] [Review][Defer] `PERMITTED_SPECIFIER` admits `../shell/contact-route.tsx` for every `render-fallback/` module, so the pure `chart-model.ts` could import the React component [src/render-fallback/chart-model.test.ts] — deferred, pre-existing

## Spec Change Log

### 2026-10-22, loopback 1
- **Triggering findings (bad_spec):**
  - (1) The Code Map placed `<ContactRoute />` after `p.chart-routes`. That contradicts ruling Q3 (a), "beside the heading". In the `space-between` chrome row it also moved `the scene` to the middle on capable machines.
  - (2) The tasks never required executing the bound clipboard lookup. A flipped guard in `clipboardWrite()` would ship a permanently failing `copy` while `npm test` stayed green.
- **Amended:**
  - The Code Map's chart.tsx line now places the route directly after the `<h1>`.
  - A new `chart.css` line covers the row layout, and narrows `.chart-chrome a` so it stops overriding `.contact-address`.
  - Tasks gained:
    - the executed binding test;
    - `overflow-wrap: anywhere`;
    - an address-shape check in the `todo`;
    - a complete deferred-work swap list;
    - `epic-6-context.md` aligned with the rulings;
    - stale-prose fixes;
    - `sprint-status` left until finalization.
- **Known-bad states avoided:**
  - the route line in the middle of the chart's chrome row;
  - two stylesheets competing for the address on the chart;
  - an untested clipboard binding.
- **KEEP:** start by applying the pass-1 implementation, which is everything else and reviewed sound: `git apply "C:/Users/Thomas/AppData/Local/Temp/claude/E--Development-cosmos-portfolio/3b8edbe3-36d1-4aa6-9597-e72689def294/scratchpad/keep-6-3-pass1.patch"`. Then change only what this amendment requires. Specifically keep:
  - the `contact.ts` tracker (newest press wins; `stop()` drops late results without retiring the tracker, for StrictMode; the `setCopyState` name, because `state.test.ts` flags `setState`);
  - `ContactRouteView` + `ContactRoute`;
  - the `ui` manual-chunk placement and its bundle assertions (entry 3,033 bytes);
  - the identity-audit admissions (`VISIBLE_COPY`, `COPY_CONSTANTS`, `CONTACT_RULES`/`auditContact`, contrast rows);
  - the Colophon placement directly under `<h1>`;
  - the maintenance, router, App and colophon-host test widenings;
  - EXPERIENCE.md §7.5.

## Review Triage Log

### 2026-10-22 — Review pass
- intent_gap: 0
- bad_spec: 2 (high 0, medium 2, low 0)
- patch: 6 (high 0, medium 0, low 6)
- defer: 0
- reject: 15 (high 0, medium 5, low 10)
- addressed_findings:
  - `[medium]` `[bad_spec]` The chart route sat after the route line, not beside the heading, and broke the `space-between` row. The spec was amended to place it after the `<h1>` and to lay out `chart.css`; loopback to step 3.
  - `[medium]` `[bad_spec]` The bound `clipboardWrite()` was held only by a source regex. The spec was amended to require an executed binding test; loopback.
  - The six low patches are folded into the amended tasks and applied by the re-derivation: the `.chart-chrome a` override, `overflow-wrap`, the stale `epic-6-context.md`, stale prose, the incomplete swap list, and the `todo` address shape.

### 2026-10-22 — Review pass (loop 1)
- intent_gap: 0
- bad_spec: 0
- patch: 5 (high 0, medium 0, low 5)
- defer: 0
- reject: 19 (high 0, medium 4, low 15)
- addressed_findings:
  - `[low]` `[patch]` `clipboardWrite()` threw on a `null` `navigator.clipboard` during render. The guard is now `== null`, with a new executed row, "a null clipboard".
  - `[low]` `[patch]` On a mid-width window the chart's three-item chrome row could squeeze. `.chart-chrome` now gets `flex-wrap: wrap`, and the `CHART_RULES` row is updated.
  - `[low]` `[patch]` The identity-audit header said the route sits "after the chart's route line". It now says directly after the `<h1>`, before the route line.
  - `[low]` `[patch]` The comments overstated the mirroring: `CONTACT_RULES` ("declaration for declaration") and `contact-route.css` ("is `.colophon-solve`").
  - `[low]` `[patch]` The `deferred-work.md` swap list was missing EXPERIENCE.md's E-A8 row and `epic-6-context.md`.
- **Rejected as medium:**
  - There is no executed test of the label re-rendering: the repo has no DOM test library, and two browser runs observed `copied` and `not copied`.
  - There is no build gate on the placeholder; ruling Q1 chose the `todo` and the 6.5 deferral.
  - A changed button name may not be announced; Q5 and the Never clause rule out a live region.
  - Hand-selection inside an `<a>`; ruling Q4 (b) made the address the link.

## Design Notes

**Why a shared shell component rather than one in each surface.** chart.tsx may not import React (its allowlist), and the colophon chunk may hold only `src/colophon/` modules. A `src/shell/` component in the `ui` chunk is one copy of the markup that both may import, as `chrome-model.ts` already is for the chart.

**Why the label is the feedback.** With no live region (per-component precedent bans them), the change in place is the feedback. A screen-reader user hears the new name on the focused button.

**The placeholder.** `example.invalid` (RFC 2606) cannot resolve, so a premature launch dead-links visibly rather than mailing a stranger. Swapping in the real address touches `contact.ts`, the audit's `VISIBLE_COPY` row, and the placeholder literals listed in the `deferred-work.md` entry.

## Verification

**Commands:**
- `npm test`: expected all pass, the previous environmental skip, plus one `todo`.
- `npm run typecheck`: expected clean.
- `npm run build`: expected the gate green, entry ≤ 4,000 bytes, and no drift warning.

**Manual checks:**
- `npm run preview`, then in a browser:
  - `/chart` and `/colophon` show the route.
  - Tabbing reaches the link, then the button.
  - Pressing `copy` reads `copied`.
  - With clipboard permission denied, it reads `not copied`.

## Auto Run Result

**Summary.** The site now has a contact route (FR-23). It is the address as a `mailto:` link plus a `copy` button whose label changes in place: `copied`, or `not copied` when the clipboard is blocked or absent. There is no backend, no toast and no live region.
- **Where it appears:** on the Fallback chart beside the heading (Q3 (a)), and on the Colophon directly under its `<h1>`. It is never on the scene (Q2 (d)).
- **The address is a placeholder.** It is `address@example.invalid`, deferred by ruling Q1. A `todo` test keeps it visible, and `deferred-work.md` records it as a 6.5 launch blocker.

**Files changed**
- New:
  - `src/shell/contact.ts`: the `CONTACT` copy and the press tracker `createContactCopy` (newest press wins, `stop()` drops late results).
  - `src/shell/contact-route.tsx`: `clipboardWrite`, `ContactRouteView` and `ContactRoute`.
  - `src/shell/contact-route.css`: token-only styles.
  - `src/shell/contact.test.ts` and `src/shell/contact-route.test.ts`.
- Placement:
  - `src/render-fallback/chart.tsx`: the route after the `<h1>`.
  - `src/render-fallback/chart.css`: the row packs from the start and wraps; the route line takes an auto margin; the link selectors are narrowed.
  - `src/colophon/colophon.tsx`: the route under the `<h1>`.
- Bundle:
  - `vite.config.ts`: the route modules join the `ui` group. React and the JSX runtime fold into `ui`, a `rolldown-runtime` chunk appears, and the entry goes from 3,057 to 3,033 bytes.
  - `scripts/bundle-assertion.ts` and `scripts/bundle-assertion.test.ts`: the contact chunk is off the entry graph, shared by both surfaces and holds no react-dom.
- Tests and audits:
  - `src/identity-audit.test.ts`: copy, `CONTACT_RULES`/`auditContact`, contrast rows, placement.
  - Widened: `chart-model.test.ts`, `chart.test.ts`, `colophon.test.ts`, `maintenance.test.ts`, `router.test.ts`, `App.test.ts`, `colophon-host.test.ts`.
- Docs:
  - READMEs for `src/shell/`, `src/render-fallback/` and `src/colophon/`.
  - EXPERIENCE.md §7.5 and its E-A8 row are now ruled.
  - `epic-6-context.md` is regenerated and aligned with the rulings.
  - `deferred-work.md` has the address deferral with the full swap list.
  - `sprint-status.yaml`: 6-3 is done.

**Review.**
- Pass 1 found two bad_spec findings, both medium: the chart placement contradicted Q3 (a), and the clipboard binding was never executed. It also found six low patches folded into the amendment, and 15 rejects. This looped back once.
- Pass 2 applied five low patches, with 0 deferred and 19 rejected.

**Follow-up review recommended: true.** Pass 2 patched medium 0 and low 5, a score of 3×0 + 5 = 5, which is ≥ 5.

**Verification**
- `npm test`: 1670 tests; 1668 pass, 0 fail, 1 environmental skip, 1 `todo` ("the real address is supplied", pending).
- `npm run typecheck`: clean.
- `npm run build`: gate green, entry 3,033 of 4,000 bytes, no drift warning.
- Browser runs of `npm run preview` (implementer, passes 1 and 2):
  - `/chart` at 1280px shows the heading, the route and then `the scene` at the far end; at narrow width the three stack.
  - `/colophon` shows the `<h1>` and then the route.
  - The press reads `copied`; with a rejecting `writeText` it reads `not copied`.
  - The scene has no route.
- Limits of that browser check:
  - The click was scripted, not a real gesture.
  - The block was simulated, not a denied permission.
  - The narrowest width reached was 502px, not 375px.

**Residual risks**
- **The placeholder address** could deploy, because only a `todo` guards it. 6.5 must swap it.
- **Feedback for screen readers:**
  - A screen reader may not announce the focused button's name change.
  - A second press with the same outcome changes nothing visible.
  - The button's name is just `copy`.
- **Untested wiring.** The label wiring in `ContactRoute` is held by a source audit plus a manual browser check; no executed DOM test exists.
- **React now sits in the `ui` chunk,** which the mount preloads. Nothing pins the chunk shape beyond the bundle assertions.
- **The Colophon still has no page shell (D-G6).** The route sits flush under the `<h1>`.
