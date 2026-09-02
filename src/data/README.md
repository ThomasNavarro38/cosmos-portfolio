# src/data/

The single authored source: `career.json` and the schema that gates it. One hand-authored file, no CMS, no API, no fetch. Adding a career entry means adding one JSON object plus, at most, one `weight` number.

**Imports:** nothing. This directory is data and its schema, not logic.
**Imported by:** `src/derive/` only. No other directory may import from here (AD-3) — enforced by an import-boundary lint rule in Story 1.8, not by convention. (See the Reference section of the root README for where AD-* IDs and story numbers are defined.)
