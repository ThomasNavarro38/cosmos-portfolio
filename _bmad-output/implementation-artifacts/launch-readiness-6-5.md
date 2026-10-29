# Launch readiness — Story 6.5

Record date: 2026-10-23. Baseline: `d1eac40`. Spec: `spec-6-5-launch-readiness-pass.md`.

This is the last gate before the CV links to the site. Automated rows name the tests that hold them; `src/launch-readiness.test.ts` checks that every named test exists (`scripts/record-table.ts`, the reader shared with `first-paint-6-4.md`). Manual rows give a protocol and leave the **Result** column empty for Thomas. Nothing was deployed for this record, and no reader, verdict, URL or measurement was invented.

`src/launch-readiness.test.ts` carries three `todo` tests, one per human run:

- `the M2 gate passes on the scene`: the `### M2 runs — scene` table holds at least three filled reader rows, no reader number twice, every row as wide as the header, every reader meeting both clauses, and row 1's Result says `pass`.
- `the M2 gate passes on the Fallback alone`: the same, for `### M2 runs — Fallback` and row 2.
- `the site is deployed to a static host and rolled back once`: the `### Deployment` table holds a filled row with an `https://` URL, the host, the deployed commit, `yes` for the direct loads, a rollback commit that differs from the deployed one, `yes` for the head redeployed, `none` for the host configuration, and row 3's Result says `pass`.

**What a `todo` does and does not do.** node:test reports a `todo` test as todo whether its body passes or fails, and a todo never fails `npm test`. It keeps the owed run visible on every run; it does not enforce it. Once a table is filled and its todo test's body passes (the line shows `✔ … # Thomas, before launch`), remove the `{ todo }` option from that test so it runs as a normal assertion — the way 6.3's `the real address is supplied` was promoted once the address was supplied.

A `|` written inside a cell is escaped as `\|`.

Commands: `npm test`, `npm run typecheck`, `npm run build`.

## Epic ACs

| # | Epic AC (Story 6.5) | Kind | Held by / protocol | Result |
| --- | --- | --- | --- | --- |
| 1 | The M2 gate on the scene: a technical reader who has not seen the site explores two or three entries, states Thomas's discipline, seniority and the kinds of environments he works in, and says which entries were worth reading (PRD §8.1, SM-2) | **Manual** | See protocol L1 below | |
| 2 | The same gate holds on the Fallback alone, without the scene (FR-22) | **Manual** | See protocol L2 below | |
| 3 | The site is deployed to a static file host with no Node process, serverless function, database, environment variable or secret, and rollback is redeploying a previous commit (Architecture, Deployment & environments; NFR-6) | **Manual** | See protocol L3 below | |
| 3b | The repo cannot ask the host for more than static files: no environment read in shipped source, no serverless or server-config path tracked, no module or page in `public/`, and `public/_redirects` holds the catch-all and only rewrites root-relative paths to `/index.html` with `200` (NFR-6) | Automated | `src/launch-readiness.test.ts` "the deploy envelope holds: no environment read in shipped source, no module in public/, and only the SPA rewrite"; `src/launch-readiness.test.ts` "the deploy envelope tracks no server or secret path" (skipped, with its reason, when git is unavailable); mutations: `src/launch-readiness.test.ts` "the envelope’s environment scan rejects each read, and ignores one written in a comment", `src/launch-readiness.test.ts` "the envelope’s path scan rejects each server or secret path, and passes ordinary ones", `src/launch-readiness.test.ts` "the envelope’s public/ scan rejects a module or a page", `src/launch-readiness.test.ts` "the envelope’s _redirects scan rejects any target but /index.html 200, and ignores comments and blank lines". Host-side configuration is L3 step 6 | |
| 4 | `npm run build` on a clean checkout passes schema validation (AD-11), validates the artifact against its declared schema (AD-14), asserts destination cardinality (AD-15) and the import-boundary and bundle assertions (AD-3, AD-7), and fails if any does not | Automated | `src/derive/artifact.test.ts` "the gate fails on a stale-shaped artifact, naming the failing path"; `src/derive/artifact.test.ts` "the gate rejects an artifact declaring a different schemaVersion"; `src/derive/artifact.test.ts` "the gate fails when a destination is dropped, naming the unreachable entity"; `src/derive/artifact.test.ts` "the --check branch exits 0 against the committed artifact"; `src/derive/artifact.test.ts` "the gate reports an import-boundary violation in the source root it is given"; `scripts/bundle-assertion.test.ts` "`npm run build` ends in `vite build`, so CI's Build step runs the assertion"; `scripts/bundle-assertion.test.ts` "the shipped app builds under the assertion, measured within its budget"; the bundle assertion failing: `scripts/bundle-assertion.test.ts` "an entry graph over budget fails naming the measured size and the budget", `scripts/bundle-assertion.test.ts` "the shipped config fails a build whose entry statically imports three, naming it and the chain"; `src/data/validate.test.ts` "the committed career.json passes validation"; `src/data/validate.test.ts` "a `notabel` typo fails and names both the field and the entry"; and CI runs it on every push (`.github/workflows/ci.yml`): `scripts/ci-workflow.test.ts` "each of test, typecheck, gate and build runs in exactly one step, carrying the !cancelled() guard" | |
| 5 | The scene, the Fallback and the Colophon are each reachable, Back works, and the scene resumes where it was left (AD-18) | Automated | `src/shell/router.test.ts` "resolveRoute: the three paths, trailing slashes ignored, anything else is home"; `src/shell/router.test.ts` "leaving the scene saves its position into the departing entry, then pushes the target with no fragment and the same position"; `src/shell/router.test.ts` "Back to the scene restores the saved position and tells subscribers"; `src/shell/router.test.ts` "Back through the real store: advanceScroll(2.4), so the rig’s first frame is 2.4"; `src/App.test.ts` "the chart anywhere: on /chart whatever the machine, and at home on a fallback machine — alone"; `src/App.test.ts` "the Colophon: its chrome row alone — the heading, the contact route and a route out — on either machine"; `src/shell/route-link.test.ts` "the chart’s links: the model to /colophon on every machine, the scene to / on a capable one"; `src/shell/route-link.test.ts` "the Colophon’s route line: the scene then the chart on a capable machine; the chart alone on the fallback surface; never the Colophon"; `src/shell/route-link.test.ts` "the Colophon’s links: hrefs in order, a primary click routed, a modified click left to the browser"; `src/shell/colophon-host.test.ts` "the links the host hands down route a primary click through router.navigate — the scene to home, the chart to the chart — and leave a modified click to the browser". A direct load of `/chart` and `/colophon` on the real host is L3 step 3 | |
| 6 | No "work in progress" note, beta tag, badge or apologetic microcopy on any surface — scene, panel, Fallback, Colophon, preview and contact route (FR-20) | Automated | `src/identity-audit.test.ts` "voice: no work-in-progress, beta or apologetic word in shipped strings, career.json or index.html"; mutations: `src/identity-audit.test.ts` "voice: a beta tag, an apology or a placeholder fails with its own line"; `src/identity-audit.test.ts` "copy: every visible literal shipped from src/ and index.html is in the closed allowlist"; `src/identity-audit.test.ts` "copy: every page-metadata string in index.html is in META_COPY"; `src/identity-audit.test.ts` "copy: a praising description, a disclaimer in the alt text or a missing tag fails with its own line"; the preview's chrome: `scripts/preview.test.ts` "chrome: the two lines are the shell’s constants, in the chrome role at ink-label, at the space-xl inset" | |
| 7 | No analytics, tracking or measurement instrumentation is added to observe SM-1, and the weak instrument is accepted (SM-1, NFR-6, SM-C1) | Automated | `src/first-paint.test.ts` "the site collects nothing: no storage, no request and no off-site URL in shipped source"; `src/derive/maintenance.test.ts` "nothing under src/ reaches the network"; `src/derive/maintenance.test.ts` "the admitted fetch is the Colophon’s alone, and admits nothing else there"; and the acceptance, verbatim, under "SM-1" below: `src/launch-readiness.test.ts` "the record has every AC row, the three run tables, the checklist and SM-1’s acceptance" | |

## SM-1

**No analytics, tracking or measurement instrument is added to observe SM-1; the weak instrument is accepted rather than solved.** The Forward is observed only when someone mentions it — a message, a conversation, a referral that names the site. Instrumenting it would contradict NFR-6 and serve the counter-metric SM-C1, which the PRD declines to optimise.

## Manual protocols

**L1 — The M2 gate on the scene (AC 1, SM-2).**

1. **The build.** Run `npm run build` at the commit under test and serve `dist/` — the L3 deployment, or `npm run preview`. Never `npm run dev`. Record the commit.
2. **The readers.** At least three technical readers who have never seen the site, each tested separately, none watching another's run. Record each one's background in a few words (for example `backend engineer, 6 years`), never their name.
3. **The machine.** A desktop or laptop with WebGL2 and a mouse or trackpad, the browser window at **1440×900**, loaded at `/` so the scene is drawn. If the Fallback chart appears instead, this machine cannot run L1: record it and change machine.
4. **The framing.** Say only: "this is a personal site; explore two or three entries". Nothing about who made it, what the site does, or how to move in it. No time limit. Do not lead, hint or answer questions about the content while they explore.
5. **The questions.** When they say they are done, ask in this order, writing down their own words:
   1. What is the person's discipline?
   2. How senior is the person?
   3. What kinds of environments does the person work in?
   4. Which entries were worth reading?
6. **Scoring.** Against `src/data/career.json`, never against what Thomas hoped they would say:
   - **Clause 1** is met when all three of the first answers are consistent with `career.json`. "I don't know", or no answer, on any of the three is not met.
   - **Clause 2** is met when the reader names at least one entry as worth reading and every entry they name is Deep (a Project with `notable` populated). Naming none is not met.
   - A reader meets the gate when both clauses are met. Write `yes` or `no` in each clause column, with a note after it when useful (`no — named a Shallow entry`).
7. **The verdict.** **L1 passes only when every reader meets the gate.** Put `pass` or `fail` in row 1's Result, with the date and the number of readers. A fail is recorded as it is and brought to Thomas; it is never re-run with a reader chosen to pass.
8. **After a fail.** If something is changed and L1 is run again, it is run with fresh readers who took no earlier attempt. Before the re-run, move the failed attempt's rows, unchanged, under `#### Earlier attempts — scene` below the table, and its verdict beside them; the main table then starts empty again. The todo tests read only the main table.

**L2 — The M2 gate on the Fallback alone (AC 2, FR-22).** Self-contained: L1's machine rule does not apply here.

1. **The build.** As L1 step 1.
2. **The readers.** At least three technical readers who have never seen the site and did not take L1, each tested separately. Record each one's background, never their name.
3. **The machine and the route.** Either:
   - **(a)** a capable machine (WebGL2, mouse or trackpad), window at 1440×900, loading **`/chart` directly** by URL: on any machine `/chart` shows the chart, never the scene; or
   - **(b)** a machine the detection sends to the Fallback — no WebGL2, or a touch device — loading `/`.

   Record which, with the machine, in the table's "Machine and route" column (for example `(a) laptop, /chart direct`).
4. **The framing.** Say only: "this is a personal site; explore two or three entries. Stay on this view; don't follow its link to the scene." Nothing else, no time limit, no leading.
5. **A run that reaches the scene is discarded.** If the reader reaches the scene anyway (the chart's link to it, or `/` on a capable machine), stop. That run does not count and is not scored; note it under the table and repeat with another fresh reader.
6. **The questions, the scoring, the verdict and a fail.** As L1 steps 5–8, with row 2's Result, and `#### Earlier attempts — Fallback` for a failed attempt.

**L3 — Deployed to a static host, and rolled back once (AC 3).**

1. **The host.** Choose a static file host (Thomas's choice; the production origin it gives also decides the absolute `og:` URLs, see the checklist). Configure it with build command `npm run build`, output directory `dist`, and Node from `.nvmrc`. Production only: no preview or staging environment is required.
2. **The deployment.** Deploy the head of `main` from the repository (a clean checkout, not a local working tree). Record the date, the URL (`https://…`), the host and the deployed commit.
3. **The SPA rewrite.** In a new private window, load `/chart` and `/colophon` directly by URL. Each must answer with its surface, not a 404. `public/_redirects` (`/* /index.html 200`) is the rewrite on a host that reads it (Netlify, Cloudflare Pages); on any other host, configure the same single-page rewrite and record how. Write `yes` in the table when both answer.
4. **The rollback.** Redeploy the previous commit through the host (redeploying a previous commit is the rollback; nothing else is). Confirm it is served from the **host's deploy record**: the live deploy's ID and commit label, as the host shows them, are the previous commit's. Comparing the page's script asset names is only a supplementary check, and only when the two commits differ in shipped code: when the built output is byte-identical (6.5 changes no shipped code) the names are the same and prove nothing. Record the rollback commit and how it was confirmed.
5. **Back to the head.** Redeploy the head and confirm from the host's deploy record that it is live again. Write `yes`.
6. **The host's configuration.** Confirm that no environment variable, function, edge worker or secret is configured on the host — nothing the build or the site reads. Two things are not findings: a Node-version pin (such as `NODE_VERSION`), admitted only when the host cannot read `.nvmrc`; and a host-provided default (such as `CI`) that Thomas did not configure, which is noted, not removed. Write `none`, followed by any such note; anything else found is removed, then recorded.
7. **The verdict.** Put `pass` in row 3's Result when steps 2–6 hold, with the date.

### M2 runs — scene

| Reader | Date | Background (technical; has never seen the site) | Discipline (their words) | Seniority (their words) | Environments (their words) | Entries named worth reading | Clause 1: all three consistent with `career.json` | Clause 2: at least one named, every one Deep |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |

### M2 runs — Fallback

| Reader | Date | Background (technical; has never seen the site; did not take L1) | Machine and route (L2 step 3) | Discipline (their words) | Seniority (their words) | Environments (their words) | Entries named worth reading | Clause 1: all three consistent with `career.json` | Clause 2: at least one named, every one Deep |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |
| 3 | | | | | | | | | |

More readers are added as rows 4, 5, … in either table. A failed attempt moves under an `#### Earlier attempts` subsection (L1 step 8), never overwritten.

### Deployment

| Deploy | Date | URL | Host | Deployed commit | `/chart` and `/colophon` answer on a direct load (`yes` / `no`) | Rollback commit (and how the host showed it live) | Head redeployed and live (`yes` / `no`) | Host configuration: env vars, functions, secrets (`none`, plus any note) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | | |

## Pre-launch checklist

Every item open before the CV links to the site, with its Status. Item 7 closed on 2026-10-29 (`spec-e5-r39-r40-favicon-colophon-layout-and-copy.md`); every other item is still open.

| # | Item | Source | Status |
| --- | --- | --- | --- |
| 1 | L1: the M2 gate on the scene, at least three readers | This record, row 1; `src/launch-readiness.test.ts` (todo) | open |
| 2 | L2: the M2 gate on the Fallback alone, at least three new readers | This record, row 2; `src/launch-readiness.test.ts` (todo) | open |
| 3 | L3: the deployment to a static host, with one rollback rehearsed | This record, row 3; `src/launch-readiness.test.ts` (todo) | open |
| 4 | 6.4's P1: First Paint measured on the target hardware, three runs and the median against the carried 2.5 s | `first-paint-6-4.md` row 2 and P1; `src/first-paint.test.ts` (todo); `deferred-work.md`, "Deferred from: spec-6-4" | open |
| 5 | NFR-1a: the opening fifteen seconds, at least three unprompted viewers, against the built site | 3.9's P3 (`identity-audit-3-9.md`), pointed at by `first-paint-6-4.md` row 7; `deferred-work.md`, "Deferred from: spec-6-4" | open |
| 6 | The absolute `og:image`, `og:url` and `twitter:image` once the production origin is chosen (L3 chooses it) | 6.1 Q4 (b); `deferred-work.md`, "Deferred from 6.1" | open |
| 7 | The favicon, ruled and closed 2026-10-29 by `spec-e5-r39-r40-favicon-colophon-layout-and-copy.md` (Thomas's ruling 1): `public/favicon.svg`, one body on a 32×32 viewBox in three token colours, linked once from `index.html` by `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`, held by `src/identity-audit.test.ts` "favicon: …" and the literal-colour scan's `FAVICON_PATH` admission. No `.ico` ships. A browser that still asks for `/favicon.ico` on its own is answered by the SPA rewrite with `index.html` and a `200`; the honest 404 for it is owed with item 8 | `deferred-work.md`, "Deferred from 6.1"; `spec-e5-r39-r40-favicon-colophon-layout-and-copy.md` | closed |
| 8 | The stale-chunk 404: after a redeploy, a stale hashed chunk is answered with `index.html` and a `200`; an `/assets/* 404` line before the catch-all in `public/_redirects` would make it an honest 404. It is host-specific, so it waits for L3's host. Adding that line also means widening row 3b's `_redirects` rule, which today admits only rewrites to `/index.html 200`. `/assets/* 404` does not cover `/favicon.ico` (item 7): the same work should add a `/favicon.ico 404` line before the catch-all too | 4.2; `deferred-work.md`, "Deferred from: code review of spec-4-2" | open |

When an item closes, its Status changes and the checklist test (`the record has every AC row, …`) is updated with it: today it requires item 7 `closed` and every other Status `open`.

## Known limits

- **The envelope audit is source-level.** It holds what the repo can ask of a host. A variable, function or secret configured in the host's dashboard is invisible to it; L3 step 6 checks that by hand.
- **The tracked-path check reads `git ls-files`.** Without git it is skipped, with the reason, rather than passing. It sees only tracked files: a deploy from a local working tree (a host CLI run in the repo) would ship untracked files too, and Vite loads an untracked `.env*` file at build time. L3 step 2 deploys from a clean checkout of the repository, and step 6 checks the host, which covers both.
- **The environment scan follows no alias.** `const m = import.meta; m.env` is not caught; the dotted, bracketed and destructured forms, `loadEnv(` and `index.html`'s `%NAME%` are.
- **AC 6 is held by scans of the shipped copy**, the closed allowlist and the preview's composition, not by a person rereading every surface. L1 and L2 put strangers in front of every surface they visit, and any disclaimer they report is a finding.
- **The M2 scoring is a judgement.** "Consistent with `career.json`" and "Deep" are scored by the person running the protocol; the record keeps the readers' own words so the scoring can be reread.
