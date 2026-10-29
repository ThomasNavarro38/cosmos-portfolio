---
title: 'The site on GitHub Pages, under /cosmos-portfolio/'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_commit: '699d297e42cb52062bbaac78ed7c43b025c6ce19'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/launch-readiness-6-5.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The host is GitHub Pages at `https://thomasnavarro38.github.io/cosmos-portfolio/` (Thomas, 2026-10-29), which today still serves the old portfolio. The build assumes the domain root (assets, routes, links, exhibit fetches, preview URLs) and relies on `public/_redirects`, which Pages ignores, so no direct load of `/chart` or `/colophon` works and nothing deploys this build.

**Approach:** Ruling 1: build for the `/cosmos-portfolio/` subpath. One base literal, added and stripped only at the browser boundary, so the router keeps app-relative routes. og: and twitter: URLs become absolute on the production URL (checklist item 6). Ruling 2: the build writes `chart/index.html`, `colophon/index.html` and `404.html` copies of `index.html`, so routes answer 200 and anything missing gets an honest 404 (checklist item 8). `_redirects` is deleted. A Pages deploy workflow is gated on test, typecheck and build.

## Boundaries & Constraints

**Always:** NFR-6 holds: no env read (`import.meta.env` stays banned, so the base is a literal), no function, no secret. The base is spelled in one Node-side module (`scripts/site.ts`). The two shipped copies (`route.ts` and `colophon/exhibits.ts`, which must import nothing) are pinned equal to it by tests. Every changed audit keeps its mutation rows (red before green). The four todo tests stay todo. Actions are pinned by full SHA with a `# vX.Y.Z` comment.

**Ask First:** Any change to the entry budget (4,000 B) or to `ci.yml`. Adding `actions/configure-pages`, a Jekyll/`.nojekyll` file, a custom domain or a CNAME. Promoting any todo.

**Never:** Running L3 (the deploy and rollback rehearsal stay Thomas's). Pushing. A 404.html redirect hack (the `?p=` query trick). Reading the base from the environment. Changing router semantics or AD-18's Back/position contract.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Home | GET `/cosmos-portfolio/` | 200, the machine's surface | N/A |
| Direct route | GET `/cosmos-portfolio/chart` | Pages 301 to `/chart/`, 200 `chart/index.html`; router canonicalizes to `/cosmos-portfolio/chart` | N/A |
| Base without slash | `location.pathname` `/cosmos-portfolio` | resolves `home` | N/A |
| Unknown path | GET `/cosmos-portfolio/nope` | 404 status, `404.html` renders home, URL canonicalized to the base | N/A |
| Stale chunk / `/favicon.ico` | GET a missing `/cosmos-portfolio/assets/x.js` | honest 404 | Colophon's fetch already rejects a non-ok or HTML answer |
| Navigation | click the model / the chart | `pushState` to `/cosmos-portfolio/colophon` or `/cosmos-portfolio/chart`; Back restores | N/A |
| Exhibits | Colophon loads | fetches `/cosmos-portfolio/career.json` and `/cosmos-portfolio/layout.generated.json` (built and served in dev) | as today |

</frozen-after-approval>

## Code Map

- `vite.config.ts` -- add `base: BASE` and the new `pages()` plugin. Rewrite the `_redirects` comment.
- `scripts/site.ts` (new) -- `BASE = '/cosmos-portfolio/'`, `SITE_URL = 'https://thomasnavarro38.github.io' + BASE`. Node-side only, never shipped.
- `src/shell/route.ts` -- imports nothing and is on the entry chunk. Keep `ROUTE_PATHS` and `resolveRoute` app-relative. Add `BASE` (literal), `routeHref(route)` and `appPath(pathname)` (strips the base, and treats `/cosmos-portfolio` as `/`). Update the header table.
- `src/shell/entry.ts:38` -- `resolveRoute(appPath(location.pathname))`.
- `src/shell/router.ts:239-255` `browserHistory` -- `pathname` goes through `appPath`, and `canonicalize`/`push` write `BASE`-prefixed URLs. `createRouter` stays unchanged, so the fake-history tests in `router.test.ts` stay put.
- `src/shell/route-link.ts:87` and `src/shell/corner-chrome.tsx:121` -- `href` from `routeHref`.
- `src/colophon/exhibits.ts:22-25` -- `EXHIBIT_PATHS` carry the base literally (the module imports nothing).
- `scripts/exhibits.ts:35-36,72-96` -- `path` is the served URL (`BASE` + file). Emit `fileName` = path minus `BASE`. The dev handler matches the based URL. Drop the `_redirects` prose.
- `scripts/pages.ts` (new) -- `enforce: 'post'`, `generateBundle`. It emits `chart/index.html`, `colophon/index.html` and `404.html` with `index.html`'s exact source, and throws if `index.html` is missing. The route directories come from `ROUTE_PATHS`.
- `index.html` -- `og:image` and `twitter:image` become `SITE_URL + 'preview.png'`. Add `og:url` = `SITE_URL`. The favicon stays `/favicon.svg` in source (Vite rewrites public URLs in HTML with `base`; verify in `dist/index.html`).
- `public/_redirects` -- delete.
- `.github/workflows/deploy.yml` (new) -- `push` to `main` and `workflow_dispatch`. `permissions: contents: read` at the top, with `pages: write` and `id-token: write` on the deploy job only. `concurrency: pages` without cancelling. Build job: checkout and setup-node at `ci.yml`'s pins, then `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, then `actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0` on `dist`. Deploy job: `actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5.0.1`, `environment: github-pages`. No `env:`, no `secrets.`.
- Tests that pin root hrefs (`route-link`, `corner-chrome`, `chart`, `fallback-host`, `colophon-host`, `App`, `colophon`, `exhibits` ×2, `scripts/render.test.ts` where it is about hrefs) -- expect based hrefs.
- `scripts/preview.test.ts:539-561` -- the metadata test inverts: absolute URLs on `SITE_URL`, plus `og:url`. The `og:image` file test resolves `SITE_URL`-relative.
- `src/first-paint.test.ts:119` off-site scan -- admit `SITE_URL`-prefixed URLs in `index.html` `<meta content>` only, with a mutation row (another origin still fails).
- `src/launch-readiness.test.ts:26,64,171-317` -- replace the `_redirects` audit with a Pages audit: no `public/_redirects`, and the built `dist/` (or the plugin, run on a fake bundle) holds the three copies byte-equal to `index.html`. Keep the path scan (`.github/workflows/deploy.yml` passes) and the record checks.
- `_bmad-output/implementation-artifacts/launch-readiness-6-5.md` -- rows 3 and 3b, the L3 protocol (Pages source = GitHub Actions; deploy = push to `main`; rollback = re-run an earlier commit's Deploy run, then re-run head's; step 6 also lists the `github-pages` environment, which is not a finding), checklist 6 and 8 `closed` citing this spec, and the checklist test.
- `_bmad-output/implementation-artifacts/deferred-work.md`, `README.md:37,47`, `ARCHITECTURE-SPINE.md` Deployment (host ruled) -- reconcile the prose.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/site.ts`, `src/shell/route.ts` (+ test) -- base, `routeHref`, `appPath`, with equality to `scripts/site.ts` -- one spelling
- [x] `src/shell/entry.ts`, `src/shell/router.ts` (+ `browserHistory` test via a stubbed `location`/`history`) -- the boundary translation
- [x] `src/shell/route-link.ts`, `src/shell/corner-chrome.tsx` + href tests -- based links
- [x] `src/colophon/exhibits.ts`, `scripts/exhibits.ts` + both tests -- based exhibit URLs, `fileName` unchanged, dev handler on the based URL
- [x] `scripts/pages.ts` (+ `scripts/pages.test.ts`), `vite.config.ts` -- copies emitted, a missing `index.html` throws
- [x] `index.html`, `scripts/preview.test.ts`, `src/first-paint.test.ts` -- absolute preview URLs and the scoped admission
- [x] `public/_redirects` delete, `src/launch-readiness.test.ts` -- the Pages envelope audit with mutation rows
- [x] `.github/workflows/deploy.yml` + `scripts/deploy-workflow.test.ts` -- a text ratchet in `ci-workflow.test.ts`'s style: triggers, permissions per job, pins, the three checks and the build before upload, no `env:` or `secrets.`
- [x] Records and prose listed in the Code Map

**Acceptance Criteria:**
- Given `npm run build`, when it finishes, then `dist/` holds `index.html`, `chart/index.html`, `colophon/index.html` and `404.html` byte-equal, every asset URL in them starts with `/cosmos-portfolio/`, and `career.json` and `layout.generated.json` are at `dist/` root.
- Given `npm run build && npx vite preview`, when `/cosmos-portfolio/`, `/cosmos-portfolio/chart` and `/cosmos-portfolio/colophon` are opened in a browser, then each draws its surface, the links route and Back works, and the Colophon shows both exhibits.
- Given the repo, when `npm test` runs, then it passes with the four todos still todo and each new or changed audit seen red once.

## Design Notes

Translating at the boundary keeps the change small: `ROUTE_PATHS` stays `/`, `/chart`, `/colophon`, `createRouter` is untouched, and only `browserHistory`, the entry, the hrefs and the exhibit URLs know the base.

```ts
export const BASE = '/cosmos-portfolio/';
export const routeHref = (route: Route): string => BASE + ROUTE_PATHS[route].slice(1);
export function appPath(pathname: string): string {
  if (pathname === BASE.slice(0, -1)) return '/';
  return pathname.startsWith(BASE) ? pathname.slice(BASE.length - 1) : pathname;
}
```

## Verification

**Commands:**
- `npm test` -- expected: all pass, 4 todo, 1 environmental skip
- `npm run typecheck` -- expected: clean
- `npm run build` -- expected: green, entry within 4,000 B, the four HTML files present

**Manual checks (if no CLI):**
- `vite preview` at the base: the three surfaces, a link click, Back, and the Colophon's exhibits (DevTools MCP).

### Review Findings

Review 2026-10-29: one bmad-code-review over the working tree against `699d297`, four layers (blind, edge-case, verification-gap, acceptance). No acceptance criterion or Never rule violated.

- [x] [Review][Patch] `/favicon.ico` is asked of the origin root, outside the base, so this build's `404.html` never answers it; the README, checklist items 7 and 8, deferred-work.md and the item-8 assertion say it does [src/launch-readiness.test.ts:404]
- [x] [Review][Patch] L3's rollback has no earlier Deploy run on the first deployment (this commit adds `deploy.yml`), and a run is re-runnable for 30 days only [_bmad-output/implementation-artifacts/launch-readiness-6-5.md L3 step 4]
- [x] [Review][Patch] `workflow_dispatch` runs from any branch; the `github-pages` environment's deployment-branch rule is the guard, so L3 step 6 confirms it holds `main` alone rather than waving it through [_bmad-output/implementation-artifacts/launch-readiness-6-5.md L3 step 6]
- [x] [Review][Patch] `pageFailures` reads only root-relative `src`/`href`, so a relative asset URL, the one that breaks one directory down in `chart/index.html`, passes [scripts/bundle-assertion.test.ts:589]
- [x] [Review][Patch] `deploy.yml` passing the path scan is not pinned among the ordinary paths [src/launch-readiness.test.ts]
- [x] [Review][Patch] Stale prose: `router.ts` header (the entry takes `appPath` too; `browserHistory` is not the one place the base is added), `route.ts` header (history writes are `browserPath`'s), `corner-chrome.tsx` and `route-link.ts` headers (root hrefs), `src/shell/README.md` route.ts row, the host-rule audit header (`CNAME`/`.nojekyll` change nothing on an Actions deploy), the CLOSED comment, the fallback-host failure message [src/shell/router.ts, src/shell/route.ts, src/shell/corner-chrome.tsx:38, src/shell/route-link.ts:7, src/shell/README.md:13, src/launch-readiness.test.ts:28,389, src/shell/fallback-host.test.ts:68]
- [x] [Review][Patch] README: `npm run preview` answers an unknown path with the page and a 200, so it cannot rehearse Pages' 404 or slash redirect [README.md]
- [x] [Review][Defer] The entry's base strip is held by a source-text audit alone; no executed test observes the route the entry hands the mount at `/cosmos-portfolio/chart` [src/shell/entry.ts:39] — deferred, the composition is one line under a regex audit with a mutation row, and the parts are executed
- [x] [Review][Defer] A direct load of `/cosmos-portfolio/chart/index.html` (a real file) resolves home and canonicalizes to the base [src/shell/route.ts appPath] — deferred, no link writes that URL
- [x] [Review][Defer] A stale chunk after a redeploy is now an honest 404 but the visitor still gets no reload or recovery [src/shell/entry.ts] — deferred, pre-existing
