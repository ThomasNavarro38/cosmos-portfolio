# src/data/

The single authored source: `career.json` and the schema that gates it. One hand-authored file, no CMS, no API, no fetch. Adding a career entry means adding one JSON object plus, at most, one `weight` number.

**Imports:** its own schema dependency (`zod`) and Node builtins for the validation entry point — nothing from any sibling directory under `src/`, which is the part the gate enforces. This directory is data and its schema, not logic.
**Imported by:** `src/derive/` only. No other directory may import from here (AD-3) — enforced by the build gate, not by convention: `npm run gate` walks `src/`, evaluates the rules this and every sibling README declares, and fails `npm run build` naming the offending `file:line` and specifier. A dynamic `import(...)` does not escape it. The rule table is `src/derive/boundaries.ts`; adding a directory under `src/` without a row there fails the gate too, so the ban cannot be sidestepped by creating a layer nobody wrote a rule for. (See the Reference section of the root README for where AD-* IDs and story numbers are defined.)

## Files

| File | Role |
| --- | --- |
| `career.json` | The one hand-authored source. Every career entry lives here and nowhere else. |
| `schema.ts` | The Zod schema. The only place the Project field set is written down. |
| `validate.ts` | Reads, parses, validates, and exits non-zero on any violation. Backs `npm run validate`. |
| `validate.test.ts` | Covers every row of the story's edge-case matrix. Backs `npm test`. |

## Validation

```sh
npm run validate     # exits 0 on valid data, 1 on any violation
npm test             # the full suite, including the schema's guards
```

Node 24 strips TypeScript types natively, so both run straight from source with no build step.

Both commands matter. `npm run validate` gates the committed data; `npm test` gates the schema itself. Without the second, the schema's load-bearing line could be deleted with `validate`, `typecheck`, and `build` all still reporting success — the tests that catch it would simply never run.

**Why validation is strict.** Entities are classified by which fields they *lack* (FR-5): a Project with a populated `notable` is Deep, one without is Shallow. That makes a misspelled field name dangerous in a way it normally is not — `notabel` instead of `notable` does not error, it silently turns a Deep Project into a Shallow one, and every downstream derivation, position, and rendered panel inherits the mistake without a warning.

So the schema uses `z.strictObject`, not `z.object`. Zod's default `object` *strips* unknown keys silently, which is precisely the failure this guards against; `strictObject` raises `unrecognized_keys` instead. That is the single most load-bearing line in the schema. Failure is loud: a non-zero exit naming both the offending field and the entry it appeared on, resolved back from Zod's array index to the entry's `client — project` names.

**Duplicate keys are caught before parsing.** `strictObject` compares against the *parsed* object, and `JSON.parse` has already collapsed a repeated key by then: `"notable": "real prose"` followed later by `"notable": ""` in the same entry arrives as the empty string and validates clean, silently demoting a Deep Project to Shallow. No schema can see this, so `validate.ts` scans the raw text for repeated keys before parsing and fails naming the key and its entry.

**What the schema constrains beyond shape.** Four values are rejected not because they are malformed but because they would be accepted as *plausible and wrong*, reaching the derivation as corrupt input rather than an error:

| Constraint | Left unchecked |
| --- | --- |
| `duration.end` must not precede `start` | A negative span feeds FR-3's mass derivation. Both halves are valid ISO, so only an ordering check catches it. |
| `notable` is trimmed before the emptiness check | `"   "` classifies as Deep and renders a blank panel. Trimmed, it means Shallow. |
| `weight` must be positive | `0` is a degenerate distance from the Rail; a negative one is meaningless. |
| `client` and `project` trimmed non-empty | `"   "` produces an unnamed Star and breaks the error label that names the entry. |

Deliberately **not** enforced: empty `skills`, an empty `projects` array, and year plausibility bounds. Each fails visibly and immediately rather than silently, and each is a judgement call that could fight real data during authoring. They are accepted by design, not by oversight.

## The reference month

`career.json` carries one top-level field beside `projects`:

| Field | Type | Notes |
| --- | --- | --- |
| `asOf` | string | **Required.** ISO `YYYY-MM`. The month an ongoing engagement is measured against. |

An engagement with `end: null` is ongoing, so its span and its recency have to be measured *to* something. That something is authored here rather than read from the clock or passed on a command line, and the choice is load-bearing:

- **A clock read** would make `generated/layout.generated.json` churn every month for no authored change — every Body's mass and band shifting because time passed. The artifact is committed and diffed on purpose; monthly churn defeats that.
- **A CLI argument** would live in nobody's file. The artifact could not be reproduced without knowing what someone typed, which is the opposite of a committed contract.

Authored, the reference month sits beside the entries it measures, gets this schema's validation for free, and bumping it is the same deliberate one-line gesture as adding an entry. Because `CareerSchema` is a `strictObject`, declaring it in the schema is the only way it *can* be authored at all.

**Bump it when you re-solve after real time has passed**, and commit the new artifact with it. Raising `asOf` lengthens every ongoing span and can move a Body's band — which is a real change to the layout, and should show up in a diff as one.

## The Project field set

Exactly ten fields. No entry has a field another lacks — there are no hero-entry and minor-entry variants.

| Field | Type | Notes |
| --- | --- | --- |
| `client` | string | The end client. Becomes a Star. Trimmed; must not be blank. |
| `project` | string | Name or short description. Trimmed; must not be blank. |
| `company` | string \| null | The intermediate consultancy. An attribute, never a Body. `null` where not yet filled. |
| `role` | string | Thomas's role on the engagement. |
| `built` | string | Short description of what was built. |
| `team_size` | integer | Positive. Factual content, not a tuning value. |
| `duration` | `{ start, end }` | **Required.** ISO `YYYY-MM`; `end: null` means ongoing, and otherwise must not precede `start`. |
| `notable` | string, optional | Problem → constraint → decision. Absent, `null`, `""`, and whitespace-only all mean Shallow. |
| `skills` | string[] | Each entry trimmed and non-blank. May be empty. |
| `weight` | number, optional | Positive. Defaults to `1`. |

**`duration` is required** because FR-3 derives *both* mass (from the span) and recency (from `end`) out of it. One authored value feeds two mapping rules, which is why no second hand-authored number is needed.

**`weight` is the only hand-authored *tuning* number in the file.** It sets distance from the Rail, and must be positive. Omit it unless an entry genuinely needs to sit closer or further out. (`team_size` is factual content required by the ten-field set, not a value anyone tunes.)

**All dates are ISO 8601.** No display formatting appears in authored data — formatting is derived, never authored.

## Deep and Shallow

Entity kind is **not** a field. There is no `kind`, no type flag, no schema variant, and no `isDeep` in this directory. A Project is Deep if `notable` is populated and Shallow otherwise, and that determination happens once in `src/derive/` (Story 1.3) — never here, and never in a renderer.

The schema accepts all three Shallow forms — `notable` absent, `notable: null`, and `notable: ""` — and all three mean Shallow. A whitespace-only `notable` is trimmed and joins them. This is deliberate. Promoting a Shallow entry to Deep must be free: populate the string, change nothing else. No structural edit, no flag to flip, no second file to touch.

They are equivalent in *meaning*, but not identical in *parsed shape*: an absent `notable` yields an object with nine keys, while `null` and `""` yield ten. **Story 1.3's classifier must therefore treat `undefined`, `null`, and `""` as one case** rather than assuming a single representation reaches it. The schema deliberately does not normalize the three into one, because doing so would mean writing a value the author did not author — and the classification belongs in the derive layer regardless.

## Adding an entry

1. Add one object to the `projects` array in `career.json`, filling all ten fields — or nine, omitting `weight` to accept the default of `1`.
2. Leave `notable` out (or empty) if the decision behind the work is not yet articulated. The entry ships Shallow and can be promoted later at no cost.
3. Run `npm run validate`. A typo, a repeated key, a missing `duration`, an inverted span, or a non-ISO date fails here rather than silently downstream.
4. Run `npm run solve` and **commit `generated/layout.generated.json`** alongside the data change. The solve is deliberate and out-of-band: `npm run build` gates on the committed artifact and never invokes the solve, so a data change without a re-solve fails the build rather than shipping a stale layout.

Run `npm test` too if you touched the schema rather than only the data.

Nothing else needs touching — no layout, no camera, no position, no Dwell value. That is the maintenance guarantee this epic exists to deliver.
