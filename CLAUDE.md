# CLAUDE.md

Project-level instructions for AI agents working in this repository.

## Python: `uv` is NOT installed — use Python directly

`uv` is **not available** on this machine. It is absent from `PATH` in both Bash
and PowerShell, and from every standard install location (`~/.local/bin`,
`~/.cargo/bin`, `%LOCALAPPDATA%\Programs\uv`, `%LOCALAPPDATA%\uv`,
`%APPDATA%\uv`, scoop shims, chocolatey bin). Any command starting with
`uv run` will fail with `uv: command not found` (exit code 127).

**Invoke Python through the `py` launcher instead.**

```bash
py <script.py> [args...]
```

Do not use bare `python` or `python3`: both resolve to the Windows Store alias
stubs under `%LOCALAPPDATA%\Microsoft\WindowsApps\`, which fail with "Le chemin
d'accès spécifié est introuvable" (the specified path could not be found).

| Command   | Status                                                              |
| --------- | ------------------------------------------------------------------- |
| `uv`      | Not installed                                                       |
| `python`  | Broken Windows Store alias stub                                     |
| `python3` | Broken Windows Store alias stub                                     |
| `py`      | Works — the launcher to use                                         |

Interpreters available via `py --list-paths`: 3.13 (default), 3.12, 3.10, 3.6.
The default resolves to:

```
C:\Users\Thomas\AppData\Local\Programs\Python\Python313\python.exe
```

### Translating documented `uv run` commands

BMad skills and other tooling document their entry points as `uv run ...`.
Drop the `uv run` prefix (and its flags, such as `--no-cache`) and call the
script with `py`:

```bash
# Documented:
uv run --no-cache "{project-root}/_bmad/scripts/render_skill.py" --project-root "{project-root}" --skill "{skill-root}"

# Run this instead:
py "{project-root}/_bmad/scripts/render_skill.py" --project-root "{project-root}" --skill "{skill-root}"
```

This substitution is safe for the scripts in `_bmad/scripts/`: their PEP 723
headers declare only `requires-python = ">=3.11"` with **no third-party
dependencies**, so there is no dependency resolution for `uv` to perform. They
import only the standard library (including `tomllib`, stdlib since 3.11) plus
the sibling module `_bmad/scripts/config_utils.py`. Python 3.13 satisfies this.

If a *new* script ever declares third-party dependencies in its PEP 723 header,
this substitution no longer holds — install those packages with
`py -m pip install ...` first, or install `uv`.

### Installing `uv` (optional)

If you would rather restore the documented workflow, install it and restart the
session so the updated `PATH` is picked up:

```powershell
irm https://astral.sh/uv/install.ps1 | iex
# or
winget install --id=astral-sh.uv -e
```

## Rulings, allowances and budgets: spec and memlog first

Source: Thomas, Epic 9 retro item 9 (F-P2), with the scope ruled 2026-11-27
(`spec-e9-r9-off-story-rulings-need-a-spec-and-a-memlog-entry.md`). It exists
because `d157b65` amended AD-19 and `DESIGN.md` and spent 507 B of `scene`
headroom with no spec and no memlog entry, against AD-23.

**Who it binds:** any change whose ruling, allowance or budget effect is not
already covered by an epic story's spec. That includes ad-hoc fixes, retro
remediation items (`spec-e*-r*`), and review fix-ups after a story is `done`.

**What triggers it** (any one):

- **(a) A ruling:** a change to an AD ruling in
  `_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md`.
- **(b) An allowance:** a change to a named audit allowance, meaning AD-19's
  list in the spine or any allowlist in the audit tests that enforce it:
  `src/render-scene/scene-model.test.ts` (the effects scan, `PREFERENCE_ROLES`),
  `scripts/bundle-assertion.test.ts` (the chunk module lists) and
  `src/render-scene/realism/done.test.ts` (`UNCHANGED`, `SINCE_M2`).
- **(c) Design:** a change to a ruled section or a token value in
  `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md`.
- **(d) A budget:** changing a limit in `src/render-scene/realism/budgets.ts`
  (AD-23), or a single change that grows a byte budget's chunk (`realism` or
  `scene`) by 20% or more of its remaining headroom, or grows it to leave less
  than 2,000 B free. Measure with `scripts/bundle-assertion.test.ts` before
  and after the change. Today both chunks are already under 2,000 B free
  (`scene` 1,364 B, `realism` 181 B), so any growth of either triggers (d).

**What is required, no later than the change's own commit** ("lands" means
the commit; `abdbac2` carried both records in the same commit):

1. a spec in `_bmad-output/implementation-artifacts/`;
2. a dated RULING entry in each memlog whose trigger applies: the architecture
   `.memlog.md`
   (`_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/.memlog.md`)
   for (a), (b) and (d), and the UX `.memlog.md`
   (`_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/.memlog.md`)
   for (c). A change like `d157b65` needs both. The entry gives the measured
   cost when there is one.

`abdbac2` is the model: it has `spec-belt-soft-planet-junction.md` and the
2026-11-22 RULING entry (architecture `.memlog.md:124`).

**Who rules:** an agent records Thomas's ruling; it never makes one. If Thomas
has not given the ruling, `bmad-build-auto` HALTs with status `blocked` and
names the ruling needed. Any other session asks Thomas, and does not commit
without the ruling.

## Follow-up review flags hold the merge to `main`

Source: Thomas, Epic 9 retro item 10 (F-P1, F-P3), with the design ruled
2026-11-27 (`spec-e9-r10-hold-the-merge-on-follow-up-flags.md`). Follow-up
reviews piled up unrun, and the lenses that looked across story boundaries
found what each story's own review missed.

**The hold:** no merge into `main` and no push to `main` while any flag counts
in the tree `main` would have after it, so the commit that records a review or
a waiver may itself land. A flag counts when a `.md` file anywhere under
`_bmad-output/implementation-artifacts/` (subfolders included, not only the
branch's own specs) has `followup_review_recommended: true` (in any case) in its
leading frontmatter and no `followup_review_waived:` value in the ruled form
below. Clear a flag by running the follow-up review it asks for; that review's
own run sets the flag to `false`, as Epic 9 retro item 2 did for 17 flags.

**The waiver:** `followup_review_waived: "Thomas, <YYYY-MM-DD>, <reason>"` in
the spec's frontmatter. The check accepts only that form, so a placeholder such
as `''`, `null`, `false` or `TODO` waives nothing. The flag stays `true` for history. Only Thomas grants a
waiver; an agent writes the field only when quoting Thomas's ruling.

**Review order:** an epic whose last story is an on-screen judgement runs its
epic-wide follow-up review before that judgement, not after.

**The check:** `npm run check:followup` (`scripts/check-followup.ts`) lists each
counted file and exits 1, or prints `no follow-up review flags held`. It runs in
`ci.yml` on pull requests into `main` and in `deploy.yml` before the build, so a
direct push to `main` does not deploy. It is not part of `npm test` or
`npm run gate`, so branch work stays green while flags are open. A missing
artifacts folder fails the check, never passes it. A red PR check blocks the
merge button only once `Follow-up flags` is a required status check in GitHub
branch protection, a setting outside the repo; a local merge pushed to `main`
is held only at the deploy.

**Who rules:** if asked to merge or push to `main` while a flag counts,
`bmad-build-auto` HALTs with status `blocked` and names the flagged specs. Any
other session asks Thomas to review or waive them first.
