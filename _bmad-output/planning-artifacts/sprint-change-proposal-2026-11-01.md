# Sprint Change Proposal — M3 readiness corrections

Date: 2026-11-01. Status: **approved by Thomas and applied, 2026-11-01.** Mode: batch. Source: `implementation-readiness.md`.

## 1. Issue summary

The M3 readiness gate, run before any Epic 7 story started, found that three stories' acceptance criteria collide with M2 audits, and that the shader has no route to a value it must read. Each was found by reading the audit patterns and the boundary table against the spine; no M3 code exists yet. All are planning-text errors of the kind AD-19's closed audit list was written to catch early.

| # | Finding | Evidence | Type |
| --- | --- | --- | --- |
| 1 | The shader cannot read a map's mean luminance | `src/derive/boundaries.ts:196`; `epics.md:2691` | Missing decision |
| 2 | Map source URLs fail the off-site URL scan | `src/first-paint.test.ts:113`; `epics.md:2919` | Audit collision |
| 3 | The `GLOW` constant fails the effects scan | `src/render-scene/scene-model.test.ts:1458`, `:1477` | Audit collision |
| 4 | The `loading` status fails the gate-word scan | `src/first-paint.test.ts:236` | Naming collision |

Three smaller concerns are fixed in the same pass (section 4, E and F).

## 2. Impact analysis

- **Epics:** Epics 7 and 8 stay as they are, in the same order, with no story added or removed. The stop rule in 7.1 is untouched.
- **Stories changed:** 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.10 and 8.2. Stories 7.1, 7.2, 7.9, 8.1, 8.3, 8.4 and 8.5 are unchanged.
- **Epics inventory:** AR-M3-3, AR-M3-5, AR-M3-6, AR-M3-7.
- **Architecture spine:** AD-19, AD-21, AD-24, AD-25; memlog gains the rulings.
- **PRD, DESIGN.md, EXPERIENCE.md:** no change. None of them states the audit list, the `appearance` shape or the status names.
- **Code:** none now. Each audit change below is a story's work when that story is built.
- **Deployment and CI:** none.
- **Sprint tracking:** item 46 closed (F). Epics 7 and 8 enter tracking after the gate passes.

## 3. Recommended approach

**Direct adjustment.** Low effort, low risk, no timeline impact, since nothing is built. Rollback has nothing to revert, and no MVP review is warranted: M3's scope and rulings stand. Alternatives considered and rejected:

- **Finding 1, a boundary exception letting `render-scene` read the library:** it breaks AD-3 and would pull URLs and credit text into the scene chunk.
- **Finding 3, renaming the constant to dodge the scan:** the scan would pass while the code stopped saying what it does.
- **Concern E, changing the drift guard:** it changes a shipped M2 guard to silence one known warning. The guard's own header already lists this case as a blind spot.

## 4. Detailed change proposals

### A. Finding 1 — the mean luminance is emitted in the artifact (Thomas's ruling, 2026-11-01)

**Spine, AD-21**

OLD: A **Planet's** `appearance` is `{ map, tilt, spinRate, spinPhase }`, assigned in `src/derive/` from its **entity ID alone**, the map by rendezvous hashing so neither a new Project nor a new map disturbs other Bodies' assignments beyond the ones the new map wins.

NEW: A **Planet's** `appearance` is `{ map, meanLuminance, tilt, spinRate, spinPhase }`, assigned in `src/derive/` from its **entity ID alone**, the map by rendezvous hashing so neither a new Project nor a new map disturbs other Bodies' assignments beyond the ones the new map wins. `meanLuminance` is the library entry's value for that map, copied so the renderer reads it from the artifact (AD-14) and never imports the library.

**Epics, AR-M3-6**

OLD: A Planet's `appearance` is `{ map, tilt, spinRate, spinPhase }`, from its entity ID alone, the map by rendezvous hashing.

NEW: A Planet's `appearance` is `{ map, meanLuminance, tilt, spinRate, spinPhase }`, from its entity ID alone, the map by rendezvous hashing, with `meanLuminance` copied from that map's library entry so the renderer never imports the library.

**Story 7.4**

OLD: **Then** each Planet carries `appearance: { map, tilt, spinRate, spinPhase }` from its entity ID alone, under a new `SCHEMA_VERSION`

NEW: **Then** each Planet carries `appearance: { map, meanLuminance, tilt, spinRate, spinPhase }` from its entity ID alone, under a new `SCHEMA_VERSION`, with `meanLuminance` copied from that map's library entry

**Story 7.6**

OLD: **Then** the material normalises to the map's recorded mean, no pixel exceeds `stroke-active`, and the ceiling is a shader constant pinned by a test against the token

NEW: **Then** the material normalises to `appearance.meanLuminance`, no `realism/` module imports the library, no pixel exceeds `stroke-active`, and the ceiling is a shader constant pinned by a test against the token

OLD: **Then** recency stays on the outline's `luminanceBand`, the subject on the white stroke, Deep/Shallow on Ring and Moon, and no realism module reads a data-derived property to shade a fill

NEW: **Then** recency stays on the outline's `luminanceBand`, the subject on the white stroke, Deep/Shallow on Ring and Moon, and no realism module reads a data-derived property to shade a fill; `appearance.meanLuminance` is admitted by name, since it describes a map and not career data

No gate wording changes: 7.4's "a committed assignment differs from a re-derivation" already covers a library mean edited without a re-solve.

### B. Finding 2 — a sixth allowance for the library's URLs

**Spine, AD-19, and epics AR-M3-3.** Both carry the list.

OLD (AD-19): M3 changes M2 audits only where it must, and each change names its one allowance: the render-order pins, `scene.tsx`'s residual audit (one new mount), the `chart-offer.ts` importer table (AD-22), the glow/bloom scan (`realism/` only), and the achromatic audit (the `realism-*` prefix only).

NEW (AD-19): M3 changes M2 audits only where it must, and each change names its one allowance: the render-order pins, `scene.tsx`'s residual audit (one new mount), the `chart-offer.ts` importer table (AD-22), the glow/bloom scan (`realism/`, and `GLOW_RENDER_ORDER` in `scene-model.ts`), the achromatic audit (the `realism-*` prefix only), and the collection scan's off-site URL rule (`nasa.gov` and `usgs.gov` hosts in `src/derive/map-library.ts` only, never requested by the page).

OLD (AR-M3-3): M3 changes M2 audits only where it must, each naming its one allowance: the render-order pins, `scene.tsx`'s residual audit (one new mount), the `chart-offer.ts` importer table, the glow/bloom scan (`realism/` only), the achromatic audit (the `realism-*` prefix only).

NEW (AR-M3-3): M3 changes M2 audits only where it must, each naming its one allowance: the render-order pins, `scene.tsx`'s residual audit (one new mount), the `chart-offer.ts` importer table, the glow/bloom scan (`realism/`, and `GLOW_RENDER_ORDER` in `scene-model.ts`), the achromatic audit (the `realism-*` prefix only), the collection scan's off-site URL rule (`nasa.gov` and `usgs.gov` hosts in `src/derive/map-library.ts` only).

**Story 7.10**

OLD: **Then** the only ones are the render-order pins, `scene.tsx`'s residual audit (one new mount), the `chart-offer.ts` importer table, the glow/bloom scan (`realism/` only) and the achromatic audit (`realism-*` only)

NEW: **Then** the only ones are the render-order pins, `scene.tsx`'s residual audit (one new mount), the `chart-offer.ts` importer table, the glow/bloom scan (`realism/`, and `GLOW_RENDER_ORDER` in `scene-model.ts`), the achromatic audit (`realism-*` only) and the collection scan's off-site URL rule (`map-library.ts` only)

**Story 7.3, a new AC after the admission test**

NEW:

**Given** the collection scan rejects off-site URLs in shipped source (`first-paint.test.ts`)
**When** the library's source URLs are added
**Then** the scan admits an `https://` URL on a `nasa.gov` or `usgs.gov` host, or a subdomain of either, in `src/derive/map-library.ts` alone
**And** mutation rows prove that the same URL in any other file, another host in that file, and a lookalike host each still fail

**Story 8.2**

OLD: **Then** every map in the library is listed with its credit line, licence wording and a real link to its source, whether or not a Planet is assigned it, because every committed file is publicly served (Thomas, 2026-11-01)

NEW: **Then** every map in the library is listed with its credit line, licence wording and a real link to its source, the `href` read from the library with no URL written in `colophon/`, whether or not a Planet is assigned it, because every committed file is publicly served (Thomas, 2026-11-01)

### C. Finding 3 — the `GLOW` constant

The allowance wording is in B above. **Story 7.7**

OLD: **Then** the pure model counts 2 added draws per Star and 0 for Dust, and the glow/bloom scan admits this in `realism/` only

NEW: **Then** the pure model counts 2 added draws per Star and 0 for Dust, and the glow/bloom scan admits this in `realism/` and for `GLOW_RENDER_ORDER` in `scene-model.ts` only, with a mutation row proving any other `glow` in `render-scene/` or `shell/` still fails

### D. Finding 4 — the status is `fetching`

**Spine, AD-25**

OLD: **Document:** `idle → loading → decoded → shown`, or `failed`, which is terminal for the document.

NEW: **Document:** `idle → fetching → decoded → shown`, or `failed`, which is terminal for the document.

**Epics, AR-M3-7**

OLD: Document status runs `idle → loading → decoded → shown`, or `failed`, terminal for the document;

NEW: Document status runs `idle → fetching → decoded → shown`, or `failed`, terminal for the document;

**Story 7.5**

OLD: **Then** the document runs `idle → loading → decoded → shown`, or `failed`, terminal for the document; `uploaded` resets with every new `<Canvas>`

NEW: **Then** the document runs `idle → fetching → decoded → shown`, or `failed`, terminal for the document; `uploaded` resets with every new `<Canvas>`
**And** the status and every identifier avoid the gate words `loading` and `loader` (`first-paint.test.ts`), which stays unchanged

### E. Smaller concerns — preview drift and the First Paint record

**Spine, AD-24**

OLD: A re-solve still means a re-capture.

NEW: A re-solve that moves anything still means a re-capture; one that changes only `appearance` and the version does not, and the drift guard's warning after it is expected.

**Story 7.4, a new AC**

NEW:

**Given** this re-solve moves nothing, so `public/preview.png` is not recaptured (AD-24)
**When** `scripts/preview-drift.ts` warns on a full-history checkout
**Then** `src/derive/README.md` states that the warning is expected until the next recapture and why, and the guard is unchanged

**Story 7.8, a new AC**

NEW:

**Given** `first-paint-6-4.md` says nothing streams and `compileAsync` is not used
**When** this story closes
**Then** row 5 and the known limits name the realism fade and its executed test, say that Bodies still all draw in the first frame, and say that `compileAsync` runs only after the mark, so the first frame's compile stays synchronous
**And** every test named in that record still resolves

### F. Tracking and records

- **Action item 46 → done.** Resolution: "2026-11-01: items 38–43 are done, each with its own resolution; item 44 stays open as its own process item." Items 1, 44, 45 and 47 stay open for Thomas.
- **Architecture memlog:** one ruling line for A, and one decision line for B to E.
- **`implementation-readiness.md`:** the re-run's verdict is added.
- **Spine:** the sixth allowance sits in the `updated` date already set to 2026-11-01, so frontmatter does not change.

## 5. Implementation handoff

**Scope: minor.** Planning-text edits, applied by this session on approval, then the gate re-run and `sprint_plan.py generate`. Nothing is committed unless Thomas asks. Epic 7 then starts at story 7.1 with `bmad-build`.

**Success criteria**

- Every OLD string above is gone from the spine and `epics.md`, and every NEW string is present.
- `npm test` passes, since a test may read these documents.
- The gate re-run passes, and `sprint-status.yaml` holds Epics 7 and 8 at `backlog`.
