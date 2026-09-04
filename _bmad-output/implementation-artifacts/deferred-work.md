
## Deferred from: code review of spec-1-1-project-scaffold-on-the-pinned-stack (2026-09-02)

- **No `solve` script exists** though `src/derive/README.md` describes one [package.json:9-14] — belongs to Story 1.5, which owns artifact emission.
- **AD-3 import boundary is prose only** [src/data/README.md:6] — seven stubs declare it; nothing enforces it. Story 1.8 owns enforcement and the spec's "Ask First" forbids adding a linter here. Note that 1.8 inherits a boundary which accumulated four declared consumers while unenforced.
- **Exact-pin invariant has no automated check** [package.json:15-31] — the spec's line-118 one-liner lives only in prose. A routine `npm install <pkg>` writes a caret back and every repo command stays green. Promote to a `check:pins` script under Story 1.8's gates.
- **`engines` is advisory** with no `engine-strict` or preinstall guard [package.json:6-8] — spec Design Notes explicitly assign hard enforcement to Story 1.8.
- **No `packageManager` field** [package.json:2-4] — a contributor running pnpm/yarn ignores the committed lockfile and re-resolves the eight pins the story exists to freeze.
- **`vite.config.ts` sets no `base`, `build.target`, or manual chunks** [vite.config.ts:6-8] — `base` defaults to `/`, breaking a subpath static deploy. AD-7's four-chunk split and entry-graph assertion belong to later stories.
- **`index.html` carries no `og:`/description/icon tags** [index.html:3-7] — FR-24 shareability; Epic 6 owns `public/preview.png`.
- **`public/.gitkeep` ships into `dist/`** [public/.gitkeep] — Vite copies `publicDir` verbatim. Fixing it needs either `@types/node` (a dependency this story does not carry) or a custom build hook; both cost more than the empty file they remove. The marker becomes unnecessary once `preview.png` lands in Epic 6 — delete it then. Constraint is documented in `vite.config.ts`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-authored-career-data-with-a-build-gating-schema.md`
  summary: Decide whether `zod` belongs in `dependencies` or `devDependencies` once `src/derive/` imports the schema.
  evidence: Its only importer today is `src/data/schema.ts`, reached exclusively by the Node-executed validation path; nothing in the browser bundle imports it. If Story 1.3 imports types only, they erase at compile time and `zod` never enters the bundle. The root README justifies `@types/node` as build-only but makes no equivalent statement for `zod`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-authored-career-data-with-a-build-gating-schema.md`
  summary: Scope `allowImportingTsExtensions` away from the shared tsconfig, or lint against `.ts` import specifiers outside `src/data/`.
  evidence: The flag was added repo-wide to permit `./schema.ts` imports under Node's native type stripping. It now also permits `.ts` specifiers in browser sources, where Vite resolves differently — a `./x.ts` import in app code would typecheck but break the build. Story 1.8 owns config and lint gates.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-authored-career-data-with-a-build-gating-schema.md`
  summary: Decide whether duplicate `client` + `project` pairs should be rejected.
  evidence: Two byte-identical Project objects validate cleanly. Since `client` becomes a Star, a duplicated entry silently produces two overlapping Stars, and error labels become ambiguous between identical entries. Not enforced in 1.2 because the correct behaviour depends on how Story 1.3 derives entity IDs from authored content.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-authored-career-data-with-a-build-gating-schema.md`
  summary: Wire `npm run validate` into a real build gate so invalid data cannot ship.
  evidence: `validate` is a standalone script invoked by nothing — no `prebuild`, no git hook, no CI. A developer can `npm run build` and ship invalid data. The root README's wording ("gates the authored career data") overstates today's enforcement. Story 1.8 owns build gates.

## Deferred from: code review of spec-1-3-the-three-mapping-rules-and-classification-by-absence (2026-09-02)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Make `readonly` on the entity graph real, or document it as a type-level convention.
  evidence: `ClientEntity.projects` is `readonly ProjectEntity[]`, but `deriveEntities` returns the live arrays it built. Verified: `graph.clients[0].projects.push(...)` succeeds at runtime. The module's stated purpose is being the single derivation point no consumer re-computes, so `Object.freeze` would make that guarantee enforceable rather than advisory.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Decide and pin the luminance band distribution across set sizes.
  evidence: `Math.floor(t * 3)` over ordinal ranks distributes unevenly — a 2-entry set yields `[stroke-dust, stroke-near]`, never using the middle band; 4 entries give `dust/rest/near/near`; 16 give 5/5/6. The existing test only asserts monotonicity and `Set(bands).size > 1`. Whether the uneven split is intended is undocumented. Relevant as the file grows from 1 to ~16 entries.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Rename `deriveLuminanceBand`'s first parameter and give ranks a distinct type from spans.
  evidence: The signature reads `deriveLuminanceBand(recency: number, range: Range)` but receives an ordinal rank, while `deriveMass` receives a month count — two different meanings sharing one `Range` type. A `Rank`/`RankRange` distinction would make passing a span where a rank belongs a type error, which is the class of confusion the module's own naming rules argue against.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Hoist the tunable constants to exported module constants.
  evidence: `MIN_MASS = 1`, `MAX_MASS = 4` and `BASE_DISTANCE = 10` are declared inside function bodies and not exported. The README says these endpoints get tuned against the greybox in a later epic; tuning them means editing separate function bodies with no single place listing the tuning surface, and no test can reference them to assert a relationship without pinning absolute values.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Extract the shared test fixture used by both derive suites.
  evidence: `rules.test.ts` and `entities.test.ts` each define their own `baseEntry`, `derive`, `allProjects` and `AS_OF` — roughly 25 duplicated lines whose `built` strings have already drifted apart between the two copies.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Decide whether an empty `projects: []` is legal, and handle it explicitly.
  evidence: `CareerSchema` has no `.min(1)`, so `{projects: []}` validates. `Math.min(...[])` is `Infinity` and `Math.max(...[])` is `-Infinity`, giving `spanRange: {min: Infinity, max: -Infinity}` and `recencyRange: {min: 0, max: -1}`. Harmless today only because the loop body never runs — verified it returns `{clients: []}`. Either reject it at the schema or handle it here with a comment saying why.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Assert that the authored Project record is carried through the graph unmodified.
  evidence: `ProjectEntity.project` is documented as "the validated authored record, carried whole — content parity is absolute", the strongest claim in the interface, yet the only assertion touching it reads `entity.project.company`. The Shallow-forms test explicitly strips `project` out before comparing. A `deepEqual` against the parsed input would actually pin the claim.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-a-deterministic-force-solve.md`
  summary: `ORBIT_MIN_SEPARATION` makes crowding worse at the only counts where it activates.
  evidence: `const angle = slot * Math.max(step, ORBIT_MIN_SEPARATION)` has no modulo, so once the floor binds the angles stop closing the circle and wrap onto earlier slots. Measured at radius 1: count 18 gives a minimum chord of 0.3316 (floor just binding), count 19 gives 0.0168 — twenty times worse than the 0.331 the plain even spread would have given. The floor only binds at >=18 Projects for one Client, which is out of reach at the stated ~15-16 Bodies across ~5-6 Clients, so this is latent rather than live. Fix is a modulo plus a throw when `count * ORBIT_MIN_SEPARATION > 2*pi`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-a-deterministic-force-solve.md`
  summary: `inclination` is unbounded, so a large Client's orbits fold back through the plane.
  evidence: `(slot - (count - 1) / 2) * ORBIT_PITCH` exceeds +/-pi/2 once a Client holds more than about 8 Projects, at which point `Math.cos(inclination)` turns negative and the Project mirrors to the opposite side of its Star at the correct radius. The radius contract still holds, so the radius assertions cannot see it. Clamp into (-pi/2, pi/2) or scale by `count`. Latent at the expected scale.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-a-deterministic-force-solve.md`
  summary: Nothing asserts the Rail is still in chronological order after the solve.
  evidence: Time order is the Rail's defining property (EXPERIENCE.md 6.2, "a continuous trajectory through ~5-6 Client stops, running backward through time"), and `RAIL_STRENGTH`/`STAR_CHARGE` are documented as provisional and due for greybox tuning. A tuner who lowers `RAIL_STRENGTH` or raises `STAR_CHARGE` can permute Stars along the axis with the suite green — `assertOrbitOwnership` only catches ownership. An assertion that solved Star positions are monotonic in Rail order would close it.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-a-deterministic-force-solve.md`
  summary: The ownership invariant is vacuous below two Clients, which is the committed data's shape.
  evidence: `assertOrbitOwnership`'s inner loop needs a second Client to compare against, so a one-Client graph performs no structural check at all. `career.json` holds exactly one Client today, so a green suite is not evidence the real data is checked. Worth stating in the module doc rather than fixing, until the inventory grows.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-a-deterministic-force-solve.md`
  summary: `ProjectEntity.mass` is derived but reaches nothing in the solve.
  evidence: The spec's Code Map calls `mass` and `railDistance` "the two solved-layout inputs already derived", but `mass` appears in `solve.ts` only in a doc comment. Either it legitimately belongs to the renderer as Body scale — in which case the README should say so, since an unused derived input reads as an oversight — or the solve should consume it as a `forceManyBody` strength or per-Body `collide` radius. Resolve when Story 1.5 defines what the artifact carries.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-a-deterministic-force-solve.md`
  summary: The unstopped-simulation mutation guard leaks a live d3 timer and a global on the failure path.
  evidence: `an unstopped simulation really does drift` stores nodes on `globalThis.__solveNodes` and deletes the key only on the success path, and the mutant's simulation is never stopped — so an assertion failure leaves both the global and a running `d3-timer` for the remainder of the suite, competing for the event loop. Wrap the cleanup in `try/finally` and stop the leaked simulation explicitly. Harmless while the test passes.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-the-versioned-layout-artifact.md`
  summary: An artifact with an empty `clients` array validates clean and passes the build gate.
  evidence: `career.json` may author `projects: []`, which yields `clients: []`. Every consumer then renders nothing with no error anywhere. A `.min(1)` on the schema, or a guard in `buildArtifact`, would make the empty case loud.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-the-versioned-layout-artifact.md`
  summary: `content.weight` defaults to 1 during artifact validation, so a truncated payload passes the parity check for that one field.
  evidence: `ArtifactProjectSchema.content` reuses `ProjectSchema`, whose `weight` carries `.default(1)`. An artifact whose `content` omits `weight` therefore validates clean, softening FR-22 parity for exactly one of the ten fields. The emitter is well covered; this matters only for a hand-edited or externally produced artifact reaching the gate.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-the-versioned-layout-artifact.md`
  summary: The build gate detects shape drift but not content drift between `career.json` and the committed artifact.
  evidence: A shape-valid artifact whose `content` no longer matches the authored data passes `npm run gate` cleanly. Editing `career.json` without re-solving therefore ships stale data on a fresh clone, caught only by `npm test`. A content hash of the authored file carried in the artifact would close it.
