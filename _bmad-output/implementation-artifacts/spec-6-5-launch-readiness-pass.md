---
title: 'Launch readiness pass'
type: 'chore'
created: '2026-10-23'
baseline_revision: 'd1eac40d40bfe30046ebe119ad31d77aa306eaa2'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Story 6.5 is the last gate before the CV links to the site. It has seven epic ACs:
- Two are human runs: the M2 gate (SM-2), run on the scene and on the Fallback alone.
- One needs a real deployment to a static host.
- Four are contracts that existing tests already hold: the build gates, routing and Back, no disclaimer, and no analytics.

Today no record ties the ACs to their evidence. Nothing pins the deploy envelope, which forbids an env var read, a serverless directory, a secret file and an off-site proxy rule. And the items owed before launch are scattered across `deferred-work.md`.

**Approach:**
- Write a launch-readiness record, `launch-readiness-6-5.md`, in 6.4's format: automated rows name the tests that hold them; manual rows give a protocol with an empty Result.
- Add one new site-wide audit for the static deploy envelope.
- Add `todo` tests that keep the three human runs visible on every `npm test`.
- Collect every still-open launch item in one checklist.
- Nothing is deployed, and no viewer result is invented.

## Boundaries & Constraints

**Always:**
- The record's automated rows name tests that exist. A cross-check test enforces this, reusing 6.4's reader, which moves into a shared module so the code is not copied.
- **The deploy-envelope audit** checks four things. Each fails on its own mutation with its own message.
  - Shipped source (non-test `src/**`, `index.html`, `vite.config.ts`) reads no `import.meta.env` or `process.env` outside comments.
  - The repo tracks no serverless or server-config path: `functions/`, `netlify/`, `api/`, `.env*`, `netlify.toml`, `vercel.json`, `wrangler.toml`/`wrangler.json*`, `_worker.js`.
  - `public/` holds no module or page (`.js`, `.mjs`, `.cjs`, `.ts`, `.html`).
  - Every non-comment line of `public/_redirects` rewrites to `/index.html` with status `200`. Rewriting off-site, or to any other target, fails.
- **The `todo` tests.** Each holds only when its table has the required filled rows and a verdict:
  - `the M2 gate passes on the scene` and `the M2 gate passes on the Fallback alone`: at least three filled reader rows, each meeting both clauses, and a Result saying `pass`.
  - `the site is deployed to a static host and rolled back once`: a filled deployment row with an `https://` URL, the host, the commit, and a rollback rehearsal commit.
  - All three use `{ todo: 'Thomas, before launch' }`.
- The **pre-launch checklist** lists every item still open, with its source. It carries these existing items forward and closes none of them:
  - 6.4's P1 measurement;
  - NFR-1a, which is 3.9's P3;
  - the absolute `og:image`/`og:url` once the origin is chosen (6.1 Q4 (b));
  - the favicon;
  - the stale-chunk `_redirects` 404 (4.2).

**Block If:**
- Moving the reader changes what any `first-paint.test.ts` test asserts, or any of them fails.

**Never:**
- Deploying, choosing a host or a production origin, or editing `index.html`'s URLs.
- Inventing a reader, a verdict, a URL or a measurement.
- Adding analytics, a probe or any instrument, because SM-1 stays anecdotal.
- Editing `public/_redirects`: the 404 rule is host-specific, so it waits for the host.
- Editing planning artifacts, `identity-audit.test.ts`, or `src/**` runtime code.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Envelope clean | the committed repo | no finding | — |
| Env read | a `src` module with `import.meta.env.MODE` | `envelope: <path>:<line> reads the environment` | test fails |
| Env read in comment | `// import.meta.env` | no finding | — |
| Server path | tracked `functions/x.ts` or `.env.local` | `envelope: <path> is a server or secret path` | test fails |
| Public script | `public/a.js` | `envelope: public/a.js is a module or page` | test fails |
| Off-site rewrite | `/* https://x.example/:splat 200` | `envelope: _redirects line N rewrites to ...` | test fails |
| Empty or comment line | `# note` or a blank line in `_redirects` | ignored | — |
| Record row missing | no `M2 runs — scene` table | the reader throws naming the table | never `undefined` |

</intent-contract>

## Code Map

- `src/first-paint.test.ts:254-383`: the reader code that moves.
  - `cellsOf` (the cell splitter; it reads `\|` as an escaped pipe) and the automated-row check. The check matches `` `file.test.ts` "title" `` pairs and looks for `test('title'` in the file.
  - Extract both into `scripts/record-table.ts` as `cellsOf(line)`, `tableUnder(record, heading)` and `missingNamedTests(record, repoRoot)`, which returns failure strings.
  - `readMeasurement` stays in `first-paint.test.ts` and uses the shared `cellsOf`.
- `scripts/source-scan.ts`: `filesUnder`, `isTestFile`, `SOURCE_MODULE`, `stripComments`. Reuse them for the env scan.
- `public/_redirects`: holds `/* /index.html 200`. Read-only.
- `vite.config.ts`: has no env or server block. It is scanned, not edited.
- `.github/workflows/ci.yml` and `scripts/ci-workflow.test.ts`: CI runs test, typecheck, gate and build on every push. Cite them in AC 4.
- **Evidence for the automated rows.** Cite these exact titles, and confirm each one exists:
  - **Build gates (AC 4):**
    - `src/derive/artifact.test.ts` "the gate fails on a stale-shaped artifact, naming the failing path";
    - "the gate rejects an artifact declaring a different schemaVersion";
    - "the gate fails when a destination is dropped, naming the unreachable entity";
    - "the --check branch exits 0 against the committed artifact";
    - "the gate reports an import-boundary violation in the source root it is given";
    - `scripts/bundle-assertion.test.ts` "`npm run build` ends in `vite build`, so CI's Build step runs the assertion" and "the shipped app builds under the assertion, measured within its budget";
    - `src/data/validate.test.ts` "the committed career.json passes validation" and "a `notabel` typo fails and names both the field and the entry";
    - `scripts/ci-workflow.test.ts` "each of test, typecheck, gate and build runs in exactly one step, carrying the !cancelled() guard".
  - **Routing (AC 5):**
    - `src/shell/router.test.ts` "resolveRoute: the three paths, trailing slashes ignored, anything else is home";
    - "leaving the scene saves its position into the departing entry, then pushes the target with no fragment and the same position";
    - "Back to the scene restores the saved position and tells subscribers";
    - "Back through the real store: advanceScroll(2.4), so the rig’s first frame is 2.4";
    - `src/App.test.ts` "the chart anywhere: on /chart whatever the machine, and at home on a fallback machine — alone" and "the Colophon: its one heading and the contact route alone, on either machine";
    - `src/shell/route-link.test.ts` "the chart’s links: the model to /colophon on every machine, the scene to / on a capable one".
  - **No disclaimer (AC 6):** `src/identity-audit.test.ts`:
    - "voice: no work-in-progress, beta or apologetic word in shipped strings, career.json or index.html" and its mutation row;
    - "copy: every visible literal shipped from src/ and index.html is in the closed allowlist";
    - "copy: every page-metadata string in index.html is in META_COPY";
    - "copy: a praising description, a disclaimer in the alt text or a missing tag fails with its own line";
    - `scripts/preview.test.ts` "chrome: the two lines are the shell’s constants, in the chrome role at ink-label, at the space-xl inset".
  - **No analytics (AC 7):**
    - `src/first-paint.test.ts` "the site collects nothing: no storage, no request and no off-site URL in shipped source";
    - `src/derive/maintenance.test.ts` "nothing under src/ reaches the network" and "the admitted fetch is the Colophon’s alone, and admits nothing else there".
  - Curly apostrophes (’) in titles are literal. Copy them exactly.
- `_bmad-output/implementation-artifacts/first-paint-6-4.md` and `identity-audit-3-9.md` (P3, P4): the format precedent. Reference P3 and do not duplicate it.
- `_bmad-output/implementation-artifacts/deferred-work.md:351-354` (the og URLs and the favicon), `:997-999` (the stale-chunk 404) and `:1149-1160` (6.4's owed runs): the sources for the checklist.
- PRD SM-2 (`prd.md:513`), SM-1 (`:512`), FR-22's Fallback clause (`:382`), and ARCHITECTURE-SPINE "Deployment & environments" (static host, production only, rollback by redeploying a previous commit).

## Tasks & Acceptance

**Execution:**
1. `scripts/record-table.test.ts` (new, write it first). Cover:
   - `cellsOf` with an escaped pipe;
   - `tableUnder` throwing on a missing heading and on a heading with no table;
   - `missingNamedTests` on a synthetic record: an automated row naming no test, naming a missing test, and naming an existing one; curly quotes are matched literally.
2. `scripts/record-table.ts` (new): the three pure functions above. The only I/O is `missingNamedTests`'s file reads, under the root it is given.
3. `src/first-paint.test.ts`: import `cellsOf` and `missingNamedTests`, and delete the local copies. Its 11 tests keep their titles and assertions.
4. `src/launch-readiness.test.ts` (new). Header doc in the style of `first-paint.test.ts`. Contents:
   - the deploy-envelope audit over the real repo, with each I/O row as a mutation over synthetic input. The tracked-path check reads `git ls-files` through `execFileSync`; it is skipped with a reason when git is unavailable, as in `preview-drift.ts`;
   - the record cross-check (`missingNamedTests` is empty) and the record's structure: the AC rows 1 to 7, the three run tables and the checklist heading;
   - a reader for the run tables, which names what is missing;
   - the three `todo` tests.
5. `_bmad-output/implementation-artifacts/launch-readiness-6-5.md` (new). It contains:
   - the epic AC table: rows 1 (M2 on the scene), 2 (M2 on the Fallback) and 3 (deployed and rolled back) are Manual, with protocols L1, L2 and L3; rows 4 to 7 are Automated, each naming tests from the Code Map, plus row 3b (the envelope audit, Automated);
   - **L1**, the M2 gate on the scene:
     - at least three technical readers who have never seen the site, each tested separately, on the built site at 1440×900;
     - the only framing is "this is a personal site; explore two or three entries";
     - with no time limit and no leading, ask: what is his discipline? How senior is he? What kinds of environments does he work in? Which entries were worth reading?
     - a reader meets the gate when they answer all three of the first questions consistent with `career.json`, and name entries worth reading that are Deep;
     - the gate passes only when every reader meets it;
   - **L2**: L1 run on `/chart` alone, with readers who did not take L1;
   - **L3**, the deployment:
     - choose a static host, with build `npm run build`, output `dist`, and Node from `.nvmrc`;
     - confirm that the SPA rewrite answers `/chart` and `/colophon` on a direct load;
     - record the URL, the host and the deployed commit;
     - rehearse the rollback by redeploying the previous commit, confirm it is served, then redeploy the head;
     - confirm no env var, function or secret is configured on the host;
   - the tables `### M2 runs — scene`, `### M2 runs — Fallback` and `### Deployment`;
   - `## Pre-launch checklist`, with the five carried items and their sources;
   - SM-1's acceptance sentence: no analytics, and the weak instrument is accepted.
6. `README.md`, Deploying paragraph: the host settings from L3, the SPA rewrite, production only, and rollback by redeploying a previous commit.
7. `_bmad-output/implementation-artifacts/deferred-work.md`: append a 6.5 section listing L1, L2 and L3 as owed before launch. It points at the checklist rather than copying it.

**Acceptance Criteria:**
- **The tests run.** Given the repo, when `npm test` runs, then:
  - 0 tests fail;
  - the todos pending are exactly four: 6.4's, plus the three new ones;
  - every pre-existing `first-paint.test.ts` test passes under its old title.
- **The record holds.** Given `launch-readiness-6-5.md`, when the cross-check runs, then every automated row names at least one test, and every named test exists.
- **The build holds.** Given a clean tree, when `npm run build` runs, then the gate is green and the entry stays at 3,033 bytes (no shipped code changed).
- **The envelope audit bites.** Given a synthetic `import.meta.env` read, `functions/` path, `public/*.js` or off-site rewrite, when the audit runs on it, then it fails naming that file.

## Spec Change Log

## Review Triage Log

### 2026-10-23 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 18: (high 0, medium 5, low 13)
- defer: 0
- reject: 14: (high 0, medium 0, low 14)
- addressed_findings:
  - `[medium]` `[patch]` `deploymentFailures` only checked that cells were non-empty, so `404`, `no` or `found API_KEY` passed. It now requires `yes` / `yes` / `none`, with a mutation row for each.
  - `[medium]` `[patch]` `auditRedirects` passed an empty, comment-only or missing file and never checked the `from` field. It now requires a catch-all `/* /index.html 200` rule and root-relative sources, and gives a named `envelope:` failure for a missing file.
  - `[medium]` `[patch]` L3's rollback check (comparing asset names) cannot tell apart two deploys with byte-identical shipped output. It now confirms the rollback from the host's deploy record (deploy ID and commit label).
  - `[medium]` `[patch]` The wording implied a todo becomes pending-free on its own. The record, the test header and deferred-work now say what node:test's `todo` does and does not do, and give the step that removes it.
  - `[medium]` `[patch]` L2 contradicted L1 step 3 and did not stop readers reaching the scene. L2 is now self-contained: `/chart` directly, or a Fallback machine on `/`; stay on the view; a run that reaches the scene is discarded. A "Machine and route" column was added.
  - `[low]` `[patch]` Thirteen low fixes:
    - the checklist test requires every item `open` and exactly 8 items;
    - duplicate reader numbers and short rows fail;
    - the cross-check reads `**Automated**` rows;
    - the env scan catches bracket, whitespace and destructured forms plus `loadEnv(`;
    - the server-path list now covers `_worker.js/`, root middleware, `_routes.json` and `.vercel/`;
    - `public/` rejects `.xhtml`, `.shtml`, `.php` and `.wasm`;
    - the Known-limits claim about untracked files is corrected;
    - the Node-version pin and host defaults are ruled in L3 and the README;
    - the README names the hosts that read `_redirects`;
    - the M2 scoring edge cases are covered and the questions are worded neutrally;
    - a re-run procedure after a fail ("Earlier attempts");
    - row 4 cites the failing half of the bundle assertion;
    - row 3b's test title is made honest.

## Design Notes

**Why no deployment here.** Deploying publishes the site. The host and the production origin are Thomas's choices, and the origin decides the absolute `og:` URLs (6.1 Q4 (b)). So 6.5 follows 6.4's precedent: everything that can be held is held, and what only a human can do is a protocol with an empty Result, kept visible by a `todo`.

**Why the envelope audit is source-level.** NFR-6's ban on Node, functions, env and secrets fails in the repo before it fails on a host: a `functions/` directory, an `import.meta.env` read, or a `_redirects` proxy to another origin. Host-side configuration is L3's manual check.

## Verification

**Commands:**
- `npm test`: expected 0 fail, the environmental skip, and 4 `todo`.
- `npm run typecheck`: expected clean.
- `npm run build`: expected the gate green and the entry at 3,033 of 4,000 bytes.

## Auto Run Result

**Summary.** Story 6.5 adds the launch-readiness instrument. Everything an agent can hold is now held. The three human-only ACs are protocols with empty Results, kept visible by `todo` tests. Nothing was deployed, and no reader, verdict, URL or measurement was invented.
- **ACs 4–7** (build gates, routing and Back, no disclaimer, no analytics) are rows in `launch-readiness-6-5.md` that cite existing tests. A cross-check confirms that every cited test exists.
- **AC 3's deploy envelope** has a new source-level audit with mutation rows. It checks for env reads, tracked server or secret paths, modules or pages in `public/`, and anything in `_redirects` beyond the SPA rewrite.
- **ACs 1–3** are protocols for Thomas: L1 (the M2 gate on the scene), L2 (the M2 gate on the Fallback alone) and L3 (a static-host deploy plus a rollback rehearsal).

**Files changed**
- `scripts/record-table.ts` (new): the shared record reader (`cellsOf`, `tableUnder`, `missingNamedTests`), moved out of `first-paint.test.ts`.
- `scripts/record-table.test.ts` (new): its tests.
- `src/first-paint.test.ts`: now uses the shared reader. Its 11 titles and assertions are unchanged.
- `src/launch-readiness.test.ts` (new): the envelope audit and its mutations, the record cross-check and structure checks, the run-table readers, and three `todo` tests (`Thomas, before launch`).
- `_bmad-output/implementation-artifacts/launch-readiness-6-5.md` (new): the AC table, protocols L1, L2 and L3, the run and deployment tables, an 8-item pre-launch checklist (all open), SM-1's acceptance, and Known limits.
- `README.md`: a new Deploying section.
- `_bmad-output/implementation-artifacts/deferred-work.md`: L1, L2 and L3 recorded as owed before launch.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: 6-5 is done.

**Review.** One pass. 18 patches were applied (medium 5, low 13), 0 deferred, and 14 rejected, all low:
- reader robustness nits (separator dashes, a trailing backslash, `../` paths, template-literal titles, a title in a comment);
- `tableUnder`'s tighter heading match, with every first-paint test green;
- the git listing running at module load;
- build-time scripts reading `process.env`, which is not a host env;
- the spec's `deferred: []` set against the deferred-work entry, which records owed human runs, not deferred review findings;
- an unasserted todo count, which is checked in the verification output.

**Follow-up review recommended: true.** The patched findings are medium 5 and low 13. The score is 3×5 + 13 = 28, which is at least 5.

**Verification**
- `npm test`: 1713 tests; 1708 pass, 0 fail, 1 environmental skip, 4 `todo` (6.4's P1, plus the M2 gate on the scene, the M2 gate on the Fallback, and the deploy).
- `npm run typecheck`: clean.
- `npm run build`: the gate is green and the entry is 3,033 of 4,000 bytes. No shipped code changed.

**Residual risks**
- **The launch is not ready until Thomas acts.** The checklist holds 8 open items:
  - L1, L2 and L3;
  - 6.4's P1 measurement;
  - NFR-1a (3.9's P3);
  - the absolute `og:` URLs once an origin is chosen;
  - the favicon;
  - the stale-chunk 404 rule in `_redirects`, which waits for the host choice.
- A `todo` never fails `npm test`, so only discipline enforces the gate.
- The envelope audit works at source level. Host-side configuration is L3's manual check, and the env scan does not follow aliases.
- The checklist test pins exactly 8 open items, so it must be edited as each item closes.
