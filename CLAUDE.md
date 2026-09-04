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
