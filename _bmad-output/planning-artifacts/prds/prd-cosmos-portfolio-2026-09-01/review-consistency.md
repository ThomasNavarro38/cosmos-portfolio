---
title: "PRD Consistency & Mechanical Review: Cosmos Portfolio"
status: review
created: 2026-09-01
scope: prd.md + addendum.md (prd-cosmos-portfolio-2026-09-01)
---

# Internal Consistency & Mechanical Check

Targets:
- `E:\Development\cosmos-portfolio\_bmad-output\planning-artifacts\prds\prd-cosmos-portfolio-2026-09-01\prd.md` (520 lines)
- `E:\Development\cosmos-portfolio\_bmad-output\planning-artifacts\prds\prd-cosmos-portfolio-2026-09-01\addendum.md` (88 lines)

Line numbers below refer to those files as they stand.

**Issue totals by category**

| # | Category | Issues |
|---|---|---|
| 1 | Cross-reference integrity | 6 |
| 2 | Numbering | 0 |
| 3 | Glossary discipline | 14 |
| 4 | Assumptions index completeness | 3 |
| 5 | Open questions coverage | 4 |
| 6 | File path / link validity | 0 |
| 7 | Factual self-consistency | 5 |
| | **Total** | **32** |

Severity key: **BLOCKER** = document makes a false claim about itself; **MAJOR** = a downstream consumer is misled; **MINOR** = cosmetic / discipline drift.

---

## 1. Cross-Reference Integrity

### 1.1 Every reference resolves — no dangling targets

Verified exhaustively. All of the following resolve to an existing definition:

- **FR-1..FR-24** — every one has a `#### FR-N:` heading (prd.md lines 91, 103, 115, 125, 133, 142, 162, 170, 182, 193, 202, 212, 226, 236, 243, 259, 267, 279, 290, 306, 324, 340, 351, 360). Every inline `FR-N` citation in both files points at one of these.
- **NFR-1..NFR-7** — all defined in §5 (prd.md lines 373–379). All citations resolve.
- **UJ-1..UJ-4** — all defined in §2.3 (prd.md lines 47, 50, 53, 56). All citations resolve.
- **R-1..R-7** — all defined in the §10 table (prd.md lines 456–462). All citations resolve.
- **SM-1..SM-5, SM-C1..SM-C4** — all defined in §11 (prd.md lines 468–482). The only external citation is `SM-3` in addendum.md line 78, which resolves.
- **Q1..Q12** — cited as `§13 Q3..Q9` at prd.md lines 191, 251, 288, 298, 349, 456, 461. All resolve to real numbered items in §13.
- **Section refs (§N / §N.N)** — every one of the 26 `§` refs in prd.md and the 2 in addendum.md points at a heading that exists (§2.2, §3, §4, §4.1, §4.2, §4.6, §5, §6, §7, §8, §8.1, §8.3, §10, §13, §14).

**No broken or dangling reference found in either direction of "reference → target".**

### 1.2 ISSUE C1 — FR-8 is never cited from anywhere in the PRD (MAJOR)

**Location:** prd.md line 170 (definition); no citation anywhere in prd.md.

**What is wrong:** FR-8 (`notable` is prose carrying problem → constraint → decision) is defined and then never referenced again inside the PRD. It is not in any §8.1 scope bullet range explicitly by name, not in any SM `Validates` list by name, and not in any §13 open question. It is picked up only by the addendum (line 55). Every other content-class FR is reachable through the `FR-7..FR-12` ranges (lines 406, 469), so FR-8 *is* technically covered by range — but the 90-word floor at line 177 and §8.3's authoring gate at lines 434–436 both restate FR-8's substance without citing it, which is exactly the drift the ID scheme exists to prevent.

**Exact fix:** In §8.3, line 435, change
`- Deep entries additionally need a \`notable\`, and the question that surfaces one is` →
`- Deep Projects additionally need a \`notable\` meeting FR-8, and the question that surfaces one is`.
(This also fixes glossary issue G8 below.)

### 1.3 ISSUE C2 — FR-14 is never cited (MINOR)

**Location:** prd.md line 236 (definition); zero citations.

**What is wrong:** FR-14 (No drawn connector lines) is defined but appears in no scope list by name and in no range. §8.1 line 407 covers `FR-13..FR-15`, so it is inside a range — but unlike FR-13 and FR-15, FR-14 has no open question, no risk, no success metric, and no §12 rejected-alternative link, despite "no connector lines" being an explicitly argued design decision.

**Exact fix:** In §12 Rejected Alternatives, line 489, append to the "Graph expression" bullet: `; drawn connector lines (a network diagram in a space costume — FR-14)`.

### 1.4 ISSUE C3 — FR-11, FR-16, FR-17 are cited only from inside their own definition blocks (MINOR)

**Location:** prd.md lines 202 (FR-11), 259 (FR-16), 267 (FR-17).

**What is wrong:** FR-11 (real client names) appears in no risk, metric, scope-bullet-by-name, or open question. FR-16 and FR-17 are covered only by the `FR-16..FR-19` range at line 408. FR-17 is the single most load-bearing rot defence in the document (the addendum devotes its longest architectural note to it, line 35) yet no §11 success metric validates it and no §10 risk names it. R-7 (background drift, line 462) is *about* FR-17's limit but never cites FR-17.

**Exact fix:** In R-7, line 462, change `Entity-relative framing fixes what is centred` → `Entity-relative framing (FR-17) fixes what is centred`.

### 1.5 ISSUE C4 — SM-5 has no `Validates` clause, breaking the §11 pattern (MINOR)

**Location:** prd.md line 475.

**What is wrong:** SM-1 (line 468), SM-2 (469), SM-3 (473), SM-4 (474) all end with an explicit `Validates …` list. SM-5 does not — it inlines `(NFR-1)` and `(NFR-2)` mid-sentence instead. A downstream tool extracting the validation matrix by pattern will find four entries, not five.

**Exact fix:** Append to line 475: ` Validates NFR-1, NFR-2, NFR-4.`

### 1.6 ISSUE C5 — SM-2 lists FR-9 redundantly inside a range it already contains (MINOR)

**Location:** prd.md line 469: `Validates FR-7..FR-12, FR-9, FR-20.`

**What is wrong:** FR-9 is already inside `FR-7..FR-12`. The duplicate is either noise or an attempt to emphasise; either way it makes a machine-extracted list contain FR-9 twice.

**Exact fix:** Change to `Validates FR-7..FR-12 (FR-9 especially), FR-20.`

### 1.7 ISSUE C6 — SM-C1..SM-C4 and NFR-3, NFR-4, NFR-6, NFR-7 are never cited from outside §5/§11 (MINOR — reverse direction)

**Locations:** prd.md lines 375 (NFR-3), 376 (NFR-4), 378 (NFR-6), 379 (NFR-7), 479–482 (SM-C1..C4).

**What is wrong:** These exist but nothing points at them from within the PRD. NFR-6 and NFR-7 *are* cited from the addendum (lines 75 and 55 respectively), so those two are reachable across the doc set. NFR-3 and NFR-4 are cited nowhere at all in either file — NFR-4 in particular defines "the target hardware profile," a phrase used unlinked at lines 152, 373, 374, 446, 475, and 498. The counter-metrics SM-C1..C4 are referenced by nothing.

**Exact fix:** At the first substantive use of the phrase, prd.md line 152, change `on the target hardware profile` → `on the target hardware profile (NFR-4)`. In §9's M3 gate, line 446, change `Does it hold NFR-2 on the target hardware profile?` → `Does it hold NFR-2 on the target hardware profile (NFR-4)?`. Counter-metrics needing no inbound citation is acceptable by design — no fix required, recorded for completeness.

---

## 2. Numbering

**Zero issues. All sequences are complete, in order, with no gaps and no duplicates.**

| Sequence | Expected | Found | Verdict |
|---|---|---|---|
| FR-1..FR-24 | 24 headings | 24, ascending, lines 91→360 | PASS |
| UJ-1..UJ-4 | 4 | 4, ascending, lines 47/50/53/56 | PASS |
| NFR-1..NFR-7 | 7 | 7, ascending, lines 373–379 | PASS |
| R-1..R-7 | 7 | 7, ascending, table rows 456–462 | PASS |
| SM-1..SM-5 | 5 | 5, ascending, lines 468/469/473/474/475 | PASS |
| SM-C1..SM-C4 | 4 | 4, ascending, lines 479–482 | PASS |
| §13 questions 1..12 | 12 | 12, ascending, lines 497–508 | PASS |
| §4 subsections 4.1..4.7 | 7 | 7, ascending | PASS |
| §0..§14 top-level | 15 | 15, ascending, no gaps | PASS |

Note: the FR headings are also *contiguous with their feature groupings* — FR-1..6 in §4.1, FR-7..12 in §4.2, FR-13..15 in §4.3, FR-16..19 in §4.4, FR-20 in §4.5, FR-21 in §4.6, FR-22..24 in §4.7 — which matches the §8.1 range bullets exactly (lines 405–414). No off-by-one.

---

## 3. Glossary Discipline

§3 (prd.md line 61) states: *"Downstream workflows and readers use these terms exactly. Introducing a synonym anywhere is a discipline violation."* That rule is violated repeatedly. The violations cluster into three kinds: (a) §1 and §2.3 are written in un-capitalised prose *before* the Glossary is introduced; (b) "flat star chart" is used as a synonym for the term Fallback; (c) "entry"/"entries" is used as an unglossed synonym for Project.

### ISSUE G1 — "flat star chart" used as a synonym for **Fallback** (BLOCKER)

**Locations:** prd.md lines 41, 48, 54, 336, 342 ("flat star chart"); lines 349, 505 and addendum.md line 76 ("flat chart"); addendum.md line 77 ("Flat star chart").

**What is wrong:** §3 line 79 defines **Fallback** as *"the flat star chart served to machines that cannot run the 3D scene."* The definition itself uses the descriptive phrase, which is fine — but the body then uses the phrase *instead of* the term in six places, and uses a further-shortened "flat chart" in three more. Three surface forms for one glossary term is the exact failure §3 forbids. Line 41 is especially bad: it writes "the flat star chart (FR-22)" where FR-22 is titled "Flat star-chart **Fallback**."

**Exact fix:**
- Line 41: `the flat star chart (FR-22) is the floor` → `the Fallback (FR-22) is the floor`
- Line 48: `he gets the flat star chart, and it still tells him` → `he gets the Fallback, and it still tells him`
- Line 54: `he gets the flat star chart, and the preview image` → `he gets the Fallback, and the preview image`
- Line 336: `get a flat star chart rather than an error` → `get the Fallback rather than an error`
- Line 342: `Visitors on incapable machines receive a flat star chart.` → `Visitors on incapable machines receive the Fallback.`
- Line 349: `how much the flat chart must convey` → `how much the Fallback must convey`
- Line 505: `how much must the flat chart convey?` → `how much must the Fallback convey?`
- addendum.md line 76: `who will receive a flat chart` → `who will receive the Fallback`
- addendum.md line 77: `"Flat star chart" names a form, not a content set.` → `"Flat star chart" names a form, not a content set — the Fallback's content is unspecified.` (this one is a legitimate *quotation* of the phrase and may stand, but must name the term.)
- Keep the phrase only at line 79 (the definition) and line 340 (the FR-22 heading, where it is the descriptive title) and line 412.

### ISSUE G2 — **Body** written as "object" / "objects" (MAJOR)

**Locations:** prd.md line 138, line 222 (×4), line 234.

**What is wrong:** §3 line 67 defines **Body** — "any positioned object in the scene." Line 138 says "is treated as a transient object" where the intended meaning is *not a Body* (i.e. Dust). Line 222 says "eighteen objects in a void reads as sparse, eighteen objects in a medium reads as space" — those eighteen are Bodies (§3 line 67: "Roughly 18 primary Bodies"). Line 234 says "No object spawns from nothing."

**Exact fix:**
- Line 138: `is treated as a transient object` → `is treated as Dust rather than a Body`
- Line 222: `eighteen objects in a void reads as sparse, eighteen objects in a medium reads as space` → `eighteen Bodies in a void reads as sparse, eighteen Bodies in a medium reads as space`
- Line 234: `No object spawns from nothing or teleports at any point.` → `No Body or condensed Skill spawns from nothing or teleports at any point.`

### ISSUE G3 — **Body** written as "body"/"bodies" lowercase for condensed Skills (MAJOR)

**Locations:** prd.md line 66 ("a condensed orbiting body"), line 73 ("discrete orbiting bodies"), line 222 ("into orbiting bodies"), line 228 ("into discrete orbiting bodies"), line 231 ("No Skill body exists"), line 57 ("the new body finds its place"), addendum.md line 43 ("not a live threat from body count").

**What is wrong:** This is a genuine *semantic* ambiguity, not just a capitalisation slip. §3 line 67 says "Dust is not a Body until condensed" — which implies a condensed Skill **is** a Body. But §3 line 67 also says a Body is "a Star or a Planet" (an exhaustive list that excludes condensed Skills), and line 152's NFR ("~18 Bodies") counts only Stars and Planets. So the document simultaneously says condensed Dust becomes a Body and that Bodies are only Stars and Planets. The lowercase "orbiting bodies" is doing the work of a fourth, undefined term.

**Exact fix (two parts):**
1. Resolve the contradiction in §3 line 67 — change `**Body** — any positioned object in the scene: a Star or a Planet. Dust is not a Body until condensed. Roughly 18 primary Bodies total.` → `**Body** — any permanently positioned entity in the scene: a Star or a Planet. Roughly 18 Bodies total. Condensed Skills are not Bodies; see Condensate.`
2. Add a new Glossary term after **Condensation** (line 73): `- **Condensate** — a Skill temporarily resolved out of Dust into a discrete orbiting form while its Project is Focused. Not a Body; it holds no permanent position.`
3. Then replace every lowercase "orbiting body/bodies" at lines 66, 73, 222, 228, 231 with "Condensate(s)", and line 57 `the new body finds its place` → `the new Body finds its place`.

### ISSUE G4 — **Star** / **Planet** written lowercase (MINOR, §1–§2 only)

**Locations:** prd.md line 20 ("Clients are stars… are planets in orbit"), line 51 ("a client star with several planets around it"; "One planet holds"), line 57 ("renders as a planet with no moon"), line 70 ("a planet with no moon"), line 188 ("planet with no moon"), line 514 ("planet-with-no-moon").

**What is wrong:** §1 (line 20) precedes the Glossary and is written as prose, which is arguably licensed. §2.3 line 51 is inside a user-journey block quote and is not. Lines 70/188/514 use the phrase "planet with no moon", which §3 line 70 explicitly marks as *informal* — so those are sanctioned. Line 51 is the only unambiguous violation ("a client star with several planets").

**Exact fix:** Line 51: `The camera brings her to a client star with several planets around it. One planet holds a \`notable\`` → `The camera brings her to a Client Star with several Planets around it. One Planet holds a \`notable\``. Leave lines 20, 57, 70, 188, 514 as-is; the informal phrase is glossary-sanctioned and §1 is deliberately pre-Glossary prose. If strict discipline is wanted throughout, add a one-line carve-out to §3 line 61: `§1 Vision and §2.3 journeys are narrative prose and use lower-case forms deliberately; §4 onward is strict.` **Recommended — this carve-out resolves G4, and the §1/§2.3 half of G5, G6 and G7 in one edit.**

### ISSUE G5 — **Dust** written lowercase (MINOR)

**Locations:** prd.md line 20 ("interstellar dust"), line 51 ("the dust around it condenses"), line 222 ("diffuse interstellar dust"; "out of that dust"; "The dust also solves").

**What is wrong:** Line 222 is inside §4.3's Description — squarely in the strict zone — and uses lowercase "dust" three times while the same paragraph uses "Bodies" and "Skills" capitalised. That is internally inconsistent within a single sentence pair.

**Exact fix:** Line 222: `exists permanently as diffuse interstellar dust filling` → `exists permanently as diffuse interstellar Dust filling`; `condenses its Skills out of that dust into` → `condenses its Skills out of that Dust into`; `The dust also solves a compositional problem` → `The Dust also solves a compositional problem`. Lines 20 and 51 covered by the G4 carve-out.

### ISSUE G6 — **Shot** written lowercase (MINOR)

**Locations:** prd.md line 24 ("Camera shots name entities… moves the shot with its subject"), line 57 ("does not touch a camera shot… every existing shot still frames… because shots name entities"), line 277 ("Coordinate-addressed shots. A shot naming a coordinate… and a bad shot"), line 366 ("it will be screenshotted" — not a violation), addendum.md line 35 ("a coordinate-addressed shot that drifts").

**What is wrong:** Line 277 is an **Out of Scope** bullet under FR-17 — strict zone — and uses lowercase "shots"/"shot" three times, while FR-17's own Consequences immediately above (lines 272–274) correctly capitalise "Shot" three times. Same file, nine lines apart, both surface forms. Note also "camera shot" (lines 24, 57) is a synonym of the term **Shot**; §3 line 75 defines Shot alone.

**Exact fix:**
- Line 277: `Coordinate-addressed shots. A shot naming a coordinate silently frames empty space after the simulation re-settles, and a bad shot throws no error` → `Coordinate-addressed Shots. A Shot naming a coordinate silently frames empty space after the simulation re-settles, and a bad Shot throws no error`
- addendum.md line 35: `a coordinate-addressed shot that drifts` → `a coordinate-addressed Shot that drifts`
- Lines 24, 57: covered by the G4 carve-out, but drop the "camera" modifier — `Camera shots name entities` → `Shots name entities`.

### ISSUE G7 — **Rail** written lowercase (MINOR)

**Locations:** prd.md line 48 ("the camera moves through the universe on a rail"), line 295 ("the default experience is on-rail"), line 381 heading (not a violation), line 385 (not a violation), line 460 (not a violation), addendum.md line 78 ("is led to it by the rail").

**What is wrong:** Line 295 is inside FR-19's Consequences (strict zone) and writes "on-rail" while the adjacent line 296 correctly writes "return to the Rail". Addendum line 78 writes "led to it by the rail".

**Exact fix:** Line 295: `the default experience is on-rail` → `the default experience is on-Rail` (this also matches §13 Q8's "off-Rail" at line 504, which is already correct). addendum.md line 78: `is led to it by the rail` → `is led to it by the Rail`. Line 48 covered by the G4 carve-out.

### ISSUE G8 — "entry" / "entries" is an unglossed synonym for **Project** (MAJOR — highest-frequency violation)

**Locations:** 18 occurrences of "entries" plus many of "entry" — prd.md lines 121, 123, 129, 131, 138, 140, 152 (implicit), 177, 184, 191, 286, 288, 406, 416, 427, 432, 434–436, 451, 458, 469, 480, 481, 503, and addendum.md lines 63, 65, 69.

**What is wrong:** The document uses "entry" to mean three different things and never defines any of them:
1. **A Project** — "Deep entries", "Shallow entries" (lines 191, 288, 406, 435, 458, 503) are simply Deep Projects and Shallow Projects, which *are* glossary terms (§3 lines 69–70).
2. **A JSON record** — "Adding an entry and re-running requires no other file change" (line 109), "one JSON entry" (line 377, 474).
3. **Either, ambiguously** — "An entry omitting `weight` is treated as `1`" (line 130) applies to Clients and Projects alike.

Meaning (1) is a direct synonym for a defined Glossary term and is the discipline violation. Meanings (2)/(3) are a genuinely useful data-layer concept that the Glossary is missing (see G14).

**Exact fix:** Replace the class-1 uses:
- Line 191: `draft two Shallow entries in full text` → `draft two Shallow Projects in full text`
- Line 288: `across a run of three consecutive Shallow entries` → `across a run of three consecutive Shallow Projects`
- Line 406: `~2–3 Deep and ~7 Shallow entries` → `~2–3 Deep Projects and ~7 Shallow Projects`
- Line 435: `Deep entries additionally need a \`notable\`` → `Deep Projects additionally need a \`notable\``
- Line 458: `Draft two Shallow entries in full text` → `Draft two Shallow Projects in full text`
- Line 503: `three consecutive Shallow entries` → `three consecutive Shallow Projects`
- Line 501 heading: `**Shallow-entry treatment.**` → `**Shallow Project treatment.**` (and R-3 line 458: `**Shallow-entry treatment may read as…**` → `**Shallow Project treatment may read as…**`)
- Line 177: `Content below roughly 90 words is rejected at authoring time` — fine as-is, no entity noun.

### ISSUE G9 — **Focus** written lowercase / as "focused"/"focuses" (MINOR)

**Locations:** prd.md line 51 ("As she focuses the project"), line 231 ("while its Project is unfocused"), line 245 ("when nothing is focused"), addendum.md line 41 ("Every unfocus is already a miniature collapse").

**What is wrong:** §3 line 72 defines **Focus** as a state. Lines 231 and 245 are strict-zone (FR-13 and FR-15 Consequences) and write "unfocused"/"focused" while FR-13's heading and body correctly write "Focus" (lines 226, 228). "Unfocus" (addendum line 41) is a coined verb form with no glossary basis; §3 line 73 gives the correct term for the reverse process: **Decay**.

**Exact fix:**
- Line 231: `while its Project is unfocused` → `while its Project is not Focused`
- Line 245: `Skills exist as a visible diffuse medium when nothing is focused.` → `Skills exist as a visible diffuse medium when no Project is Focused.`
- addendum.md line 41: `Every unfocus is already a miniature collapse.` → `Every Decay is already a miniature collapse.`
- Line 51: covered by G4 carve-out.

### ISSUE G10 — **Notable** vs `notable` — two forms with no stated rule (MAJOR)

**Locations:** Capitalised prose form **Notable** at prd.md lines 68, 69, 70, 184, 281. Backticked field form `notable` at lines 16, 51, 57, 139, 140, 158, 164, 170, 172, 175, 176, 195, 198, 435, and addendum.md lines 23, 37, 57, 63, 65.

**What is wrong:** This is almost certainly *intentional* — `notable` for the JSON field, **Notable** for the concept — and the split is used consistently and correctly throughout. But §3 line 68 defines only "**Notable** — the prose field on a Project" and never states the convention. A downstream author reading §3's "no synonyms" rule literally will see two forms and not know which to use where. FR-8's heading (line 170) uses the backticked form while FR-9's body (line 184) uses the capitalised form for the same thing, one screen apart.

**Exact fix:** Append to §3 line 68: ` Written **Notable** when referring to the concept and \`notable\` when referring to the JSON field; these are the same thing and no other form is permitted.`

### ISSUE G11 — **First Paint** inconsistently capitalised (MINOR)

**Locations:** Correct as **First Paint** at prd.md lines 80, 373, 384, 411, 475, 497, 516. Lowercase "first paint" at addendum.md line 26.

**What is wrong:** addendum.md line 26 — `Why first paint is carved out of tradeable load time` — in the routing table. §3 line 80 defines the term.

**Exact fix:** addendum.md line 26: `Why first paint is carved out` → `Why First Paint is carved out`. Also note prd.md line 497 uses `"first frame of the scene"` and `"first pixel of anything"` in quotes as *candidate definitions under debate* — that is legitimate and should not be changed.

### ISSUE G12 — "Deep" / "Shallow" used as bare adjectives without the noun (MINOR)

**Locations:** prd.md line 140 ("promotes it to Deep"), line 436 ("Those ship Shallow"), addendum.md line 65 ("self-promotes to Deep").

**What is wrong:** §3 defines **Deep Project** and **Shallow Project** as two-word terms. The bare adjective form is a contraction of a Glossary term.

**Exact fix:**
- Line 140: `promotes it to Deep with no structural change` → `promotes it to a Deep Project with no structural change`
- Line 436: `Those ship Shallow.` → `Those ship as Shallow Projects.`
- addendum.md line 65: `self-promotes to Deep` → `self-promotes to a Deep Project`

### ISSUE G13 — "particles" / "Dust" — clean (NO ISSUE, verified)

Grepped for "particle"/"particles" across both files: **zero occurrences**. The Dust metaphor is not diluted by a rendering-implementation synonym anywhere. Recorded as a pass.

### ISSUE G14 — Domain nouns used in the body that are NOT in the Glossary but should be (MAJOR)

Six load-bearing nouns are used repeatedly and never defined in §3:

| Term | Where used | Why it needs defining |
|---|---|---|
| **Entry** | ~25 places incl. lines 109, 130, 377, 474 | The unit of the JSON file. NFR-5 and SM-4 are both *stated in units of it* ("one JSON entry plus one `weight` value"). Undefined, it also collides with the Project synonym (G8). |
| **Information layer** | lines 51, 72, 148, 187, 308, 406, addendum 55 | Named in FR-9's testable consequence and in §8.1's scope, and the addendum's largest UX gap (line 55) is about it. It is the entire non-3D reading surface and has no definition. |
| **Moon** | lines 57, 70, 188, 514 | "planet with no moon" is used as the *literal visual rule* in FR-9's assumption ("carries no condensed-skill 'moon' at rest"). If it is literal it needs a definition; if it is only a metaphor, FR-9's assumption should not use it as a spec. |
| **Greybox** | lines 288, 444, addendum 50, 51 | It is the M1 milestone's entire definition (line 444) and the addendum devotes a whole note to "the greybox trap" (line 50). Undefined. |
| **Target hardware profile** | lines 152, 373, 374, 446, 475, 498, 517 | Defined *only* as NFR-4 (line 376), which is a requirement, not a glossary term. It is used as a noun phrase seven times. |
| **Milestone / M1..M5** | §9 table, and ~20 inline refs | M2/M3/M4/M5 are used as bare identifiers throughout §6, §8, §10, §11 before §9 defines them. |

**Exact fix:** Add to §3, after **Dwell** (line 76):
```
- **Entry** — one record in the JSON data file. A Client, a Project, or a Skill. The unit in which maintenance cost is measured.
- **Information layer** — the 2D reading surface that presents a Project's fields and its Notable. Distinct from the 3D scene.
- **Greybox** — the M1 state: correct geometry, layout, and pacing with no visual identity applied. Distinct from Schematic Identity, which is a finished idiom.
- **Target Hardware Profile** — a three-year-old laptop with integrated graphics at 1080p. See NFR-4. Never the dev machine.
```
And move the M1..M5 milestone table (§9) *before* §6, or add a one-line forward reference at §6 line 385: `(M-numbers are defined in §9.)`

---

## 4. Assumptions Index Completeness

§14 (prd.md line 510) claims: *"Every `[ASSUMPTION]` above, surfaced for confirmation. **All six are proposals…**"*

### Ground truth — `[ASSUMPTION` tags found

| # | prd.md line | Subject | Listed in §14? |
|---|---|---|---|
| — | 14 | *meta-mention* in §0 ("tagged inline `[ASSUMPTION]`") — not a real tag | n/a |
| 1 | 188 | FR-9 Shallow Project rendering | YES (line 514) |
| 2 | 332 | FR-21 Colophon form | YES (line 515) |
| 3 | 373 | NFR-1 First Paint 2.5s | YES (line 516) |
| 4 | 374 | NFR-2 30fps @ 1080p | YES (line 517) |
| 5 | 456 | R-1 forcing function | YES (line 518) |
| 6 | 461 | R-6 procedural collapse | YES (line 519) |
| — | 512 | *meta-mention* inside §14's own preamble — not a real tag | n/a |

**Six real tags. Six index entries. Exact match, correct §-and-ID attribution on every one.** The count claim ("All six") is TRUE. The addendum contains zero `[ASSUMPTION]` tags — correct, since §14 scopes itself to the PRD.

### ISSUE A1 — §14's title and preamble say "above", but two of the six are not above §14 in any meaningful reading order (MINOR)

**Location:** prd.md line 512.

**What is wrong:** Trivially true (all six precede line 512), but the entries are ordered §4.2, §4.6, §5, §5, §10, §10 — i.e. document order — while the *risk* assumptions (R-1, R-6) are materially different in kind from the *design* assumptions. No mechanical error; recorded as a pass with a note.

**Exact fix:** None required.

### ISSUE A2 — `[NOTE FOR PM]` tags: 7 exist, ZERO are indexed anywhere (MAJOR)

**Locations:** prd.md lines 154, 191, 251, 288, 298, 349, 395.

| # | Line | Section | Subject | Has §13 pointer? |
|---|---|---|---|---|
| 1 | 154 | §4.1 | Incremental history-pinning held in reserve | **NO** |
| 2 | 191 | §4.2 FR-9 | Shallow treatment / two-entries cold read | YES → §13 Q5 |
| 3 | 251 | §4.3 FR-15 | Condensation details | YES → §13 Q6 |
| 4 | 288 | §4.4 FR-18 | Dwell numbers | YES → §13 Q7 |
| 5 | 298 | §4.4 FR-19 | Free-flight boundaries | YES → §13 Q8 |
| 6 | 349 | §4.7 FR-22 | Fallback trigger and scope | YES → §13 Q9 |
| 7 | 395 | §7 | Competitive-claim research warning | **NO** |

**What is wrong:** §0 (line 14) explains the `[ASSUMPTION]` convention and its §14 index but says nothing about `[NOTE FOR PM]`, which is a second inline tag convention used 7 times with no explanation and no index. Two of the seven (lines 154 and 395) have no §13 pointer and no other home — they are unresolved directives to the PM that nothing tracks. Line 395's is a hard constraint on *downstream documents* ("If any downstream document asserts otherwise, it must research it first") sitting inside a Non-Goals bullet where an architecture or UX workflow will never look.

**Exact fix (three parts):**
1. Amend §0 line 14, after the `[ASSUMPTION]` sentence, add: ` A second tag, \`[NOTE FOR PM]\`, marks material deferred to a downstream workflow or to a later milestone; all seven are indexed in §15.`
2. Add a new **§15. Notes for PM Index** after §14, listing all seven with their line/section, subject, and disposition (→ §13 Qn, or "no owner").
3. Give the two orphans a home: line 154's history-pinning note should be cited from R-7 (line 462 already mentions it — add the §4.1 back-pointer, which it has, so this is satisfied *in one direction only*; add `(§4.1 note)` → also add to §13 as a 13th question, or explicitly mark "deferred, no decision required at PRD stage"). Line 395's research constraint duplicates addendum.md line 85 — cross-link them: change line 395's tag text to `\`[NOTE FOR PM]\` If any downstream document asserts otherwise, it must research it first. Restated as a binding constraint in the addendum, *Deliberately Excluded from the PRD*.`

### ISSUE A3 — §0 line 14 says "Six assumptions carry proposed values" but the sentence structure implies all `[ASSUMPTION]` tags are of that kind (MINOR)

**Location:** prd.md line 14.

**What is wrong:** `Six assumptions carry proposed values for items the upstream chain left explicitly unresolved` — combined with §14's "All six are proposals filling gaps the upstream chain left explicitly open," this asserts that (a) there are exactly six, and (b) all six fill *upstream-unresolved* gaps. Claim (a) is verified TRUE. Claim (b) is **false for NFR-2** (line 374), whose own text says it is *"ratifying the addendum's proposal"* — i.e. the upstream chain *did* resolve it, and this assumption ratifies rather than fills. §14 line 517 repeats the error: "Ratifies the addendum's proposal."

**Exact fix:** §14 line 512: `**All six are proposals filling gaps the upstream chain left explicitly open — none is a decision the user has ratified.**` → `**All six await ratification — five fill gaps the upstream chain left explicitly open; NFR-2 ratifies a value the addendum proposed. None is a decision the user has confirmed.**`

---

## 5. Open Questions Coverage

### 5.1 Citation-accuracy audit of all 12 questions

| Q | Line | Cites | Citation correct? | Notes |
|---|---|---|---|---|
| Q1 | 497 | (NFR-1) | **YES** | NFR-1 is First Paint. Correct. |
| Q2 | 498 | (NFR-2) | **YES** | NFR-2 is framerate. Correct. |
| Q3 | 499 | (R-1, R-2) | **YES** | R-1 capacity, R-2 untested bet — R-2's mitigation (line 457) says "Same person as R-1," so both are correctly implicated. |
| Q4 | 500 | (R-6) | **YES** | R-6 is the Blender/M4 dependency. Correct. |
| Q5 | 501 | (FR-9, R-3) | **YES** | Both correct. |
| Q6 | 502 | (FR-13, FR-15) | **PARTIAL — see O1** | Missing FR-14. |
| Q7 | 503 | (FR-18) | **YES** | Correct. |
| Q8 | 504 | (FR-19) | **YES** | Correct. |
| Q9 | 505 | (FR-22) | **YES** | Correct. |
| Q10 | 506 | (FR-23) | **PARTIAL — see O2** | Missing NFR-6. |
| Q11 | 507 | (FR-21) | **YES** | Correct. |
| Q12 | 508 | (§8.3) | **YES** | §8.3 exists (line 430) and is about the inventory. Correct. |

**No citation points at a non-existent target.** Two are incomplete.

### ISSUE O1 — Q6 cites FR-13 and FR-15 but omits the Skill-label sub-question's actual owner (MINOR)

**Location:** prd.md line 502.

**What is wrong:** Q6 asks four things: Condensation/Decay timing (FR-13 ✓), Dust density at rest (FR-15 ✓), *"whether Skill labels are legible only while condensed"* (owned by **NFR-7 Content legibility**, line 379, and by FR-20's label treatment, line 311 — neither cited), and *"behaviour when Focus moves directly from Project A to Project B"* (FR-13 ✓). The §4.3 note it mirrors (line 251) has the same gap.

**Exact fix:** Line 502: `(FR-13, FR-15)` → `(FR-13, FR-15, FR-20, NFR-7)`.

### ISSUE O2 — Q10 asks a question whose constraint is NFR-6, uncited (MINOR)

**Location:** prd.md line 506: `What is the unglamorous route, given no backend? (FR-23)`

**What is wrong:** "given no backend" *is* NFR-6 (line 378), and FR-23's own consequence (line 357) cites FR-1's no-backend constraint — which is itself arguably the wrong citation, since the cross-cutting no-backend rule is NFR-6, and FR-1 is about the JSON being the source of truth. The addendum (line 75) correctly identifies NFR-6 as the governing constraint on this exact question.

**Exact fix:** Line 506: `(FR-23)` → `(FR-23, NFR-6)`. And line 357: `The mechanism requires no backend (satisfies FR-1's no-backend constraint).` → `The mechanism requires no backend (satisfies NFR-6).`

### ISSUE O3 — §0's claim that every [ASSUMPTION] has a corresponding §13 entry is TRUE but only via indirect matching (VERIFIED — with one weak link)

**Location:** prd.md line 14: *"each has a corresponding entry in §13 Open Questions."*

**Verification — all six mapped:**

| Assumption | Line | Corresponding §13 question | Link explicit in the PRD? |
|---|---|---|---|
| FR-9 Shallow rendering | 188 | **Q5** (line 501, cites FR-9) | YES — §4.2 note line 191 says "See §13 Q5" |
| FR-21 Colophon form | 332 | **Q11** (line 507, cites FR-21) | **NO — see O4** |
| NFR-1 First Paint | 373 | **Q1** (line 497, cites NFR-1) | **NO — see O4** |
| NFR-2 Framerate | 374 | **Q2** (line 498, cites NFR-2) | **NO — see O4** |
| R-1 Forcing function | 456 | **Q3** (line 499, cites R-1, R-2) | YES — "See §13 Q3" |
| R-6 Collapse impl. | 461 | **Q4** (line 500, cites R-6) | YES — "See §13 Q4" |

**Verdict: the claim is TRUE.** Every one of the six assumptions has exactly one corresponding open question, and no open question is orphaned from an assumption without cause (Q6–Q10 and Q12 correspond to `[NOTE FOR PM]` items and §8.3 rather than to assumptions, which is consistent).

### ISSUE O4 — Three of the six assumptions carry no "See §13 Qn" pointer, unlike the other three (MAJOR)

**Locations:** prd.md line 332 (FR-21), line 373 (NFR-1), line 374 (NFR-2).

**What is wrong:** The document establishes a convention — an `[ASSUMPTION]` is followed by `See §13 Qn` — and follows it at lines 191 (Q5), 456 (Q3), and 461 (Q4). It then breaks it three times. FR-21's assumption at line 332 ends the FR block with no pointer; NFR-1 and NFR-2 at lines 373–374 have no pointer. A reader hitting the NFR-1 assumption has no signal that it is contested and is answered in §13. This makes §0's "each has a corresponding entry" claim true but *unverifiable by a reader working forward through the document*.

**Exact fix:**
- Line 332, after the closing `]` of the assumption: append ` See §13 Q11.`
- Line 373, at the end of the NFR-1 bullet after `…M2 ships no photographic textures.`: append ` See §13 Q1.`
- Line 374, at the end of the NFR-2 bullet after `…both of which serve realism.`: append ` See §13 Q2.`

---

## 6. File Path / Link Validity

**Zero broken links. All 8 distinct relative markdown links resolve to files that exist on disk.**

Both files live in `E:\Development\cosmos-portfolio\_bmad-output\planning-artifacts\prds\prd-cosmos-portfolio-2026-09-01\`. Every path was resolved from that directory and tested for existence:

| # | Source | Link text | Relative path as written | Resolved absolute path | Exists |
|---|---|---|---|---|---|
| 1 | prd.md:12 | brainstorm | `../../../brainstorming/brainstorm-cosmos-scrollytelling-portfolio-2026-08-30/brainstorm-intent.md` | `E:\Development\cosmos-portfolio\_bmad-output\brainstorming\brainstorm-cosmos-scrollytelling-portfolio-2026-08-30\brainstorm-intent.md` | **YES** |
| 2 | prd.md:12 | product brief | `../../briefs/brief-cosmos-portfolio-2026-08-31/brief.md` | `…\planning-artifacts\briefs\brief-cosmos-portfolio-2026-08-31\brief.md` | **YES** |
| 3 | prd.md:12 | addendum | `../../briefs/brief-cosmos-portfolio-2026-08-31/addendum.md` | `…\planning-artifacts\briefs\brief-cosmos-portfolio-2026-08-31\addendum.md` | **YES** |
| 4 | prd.md:12 | PRFAQ | `../../prfaq-cosmos-portfolio.md` | `…\planning-artifacts\prfaq-cosmos-portfolio.md` | **YES** |
| 5 | prd.md:16 | inventory-draft.md | `../../briefs/brief-cosmos-portfolio-2026-08-31/inventory-draft.md` | `…\planning-artifacts\briefs\brief-cosmos-portfolio-2026-08-31\inventory-draft.md` | **YES** |
| 6 | prd.md:486 | addendum | `../../briefs/brief-cosmos-portfolio-2026-08-31/addendum.md` | (same as #3) | **YES** |
| 7 | prd.md:486 | PRFAQ distillate | `../../prfaq-cosmos-portfolio-distillate.md` | `…\planning-artifacts\prfaq-cosmos-portfolio-distillate.md` | **YES** |
| 8 | addendum.md:12 | brief addendum | `../../briefs/brief-cosmos-portfolio-2026-08-31/addendum.md` | (same as #3) | **YES** |

**Note (not an issue, recorded):** `inventory-draft.md` is referenced as bare inline code (no link) at addendum.md lines 27 and 84. It exists at the path above. Consider making those links for consistency with prd.md:16. Also note that `prfaq-cosmos-portfolio-distillate.md` is cited by *name* five times in the addendum (lines 24, 25, 26, 49) as "PRFAQ distillate" with no link — the addendum contains only one markdown link (line 12). Adding a link on first mention (addendum.md line 24) would match prd.md's practice.

---

## 7. Factual Self-Consistency

### 7.1 Numbers that agree — verified

| Quantity | Stated at | Values | Verdict |
|---|---|---|---|
| Clients | §3:64 (`~5–6`), §8.3:432 (`~5–6`) | 5–6 / 5–6 | **AGREE** |
| Companies | §3:63 (`Approximately 2`) | only one statement | **CONSISTENT** (single source) |
| Bodies | §3:67 (`Roughly 18`), §4.1 NFR:152 (`~18`), §8.2:427 (`~18`), addendum:43 (`~18`), §4.3:222 (`eighteen`) | all 18 | **AGREE** |
| Deep Projects | §3:69 (`~2–3`), §8.1:406 (`~2–3`) | 2–3 / 2–3 | **AGREE** |
| Shallow Projects | §3:70 (`~7`), §8.1:406 (`~7`), §8.3:436 (`Roughly seven`), addendum:63 (`Roughly seven`) | all 7 | **AGREE** |
| Notable word count | §3:68 (`100–150`), FR-8:172 (`100–150`) | identical | **AGREE** |
| 90-word floor | FR-8:177 (`roughly 90 words`), addendum:67 (`The 90-word floor`) | identical | **AGREE** |
| Framerate | NFR-2:374 (`30fps`), Q2:498 (`30fps`), §14:517 (`30fps`) | all 30 | **AGREE** |
| Resolution | NFR-2:374 (`1080p`), NFR-4:376 (`1080p`), Q2:498, §14:517 | all 1080p | **AGREE** |
| First Paint | NFR-1:373 (`2.5 seconds`), Q1:497 (`2.5s`), §14:516 (`2.5s`), UJ-3:54 (`two and a half seconds`) | all 2.5s | **AGREE** |
| Settle time | §4.1 NFR:152 (`within one second`), addendum:43 (`within one second`) | identical | **AGREE** |
| Hardware age | NFR-2:374 (`2023-era`), NFR-4:376 (`three-year-old`), Q2:498 (`2023-era`) | consistent given 2026 date | **AGREE** |

### ISSUE F1 — Total Projects: "~10" is asserted in §3 but the component figures sum to 9–10, and §8.3 says "roughly nine remain" after one is done (MAJOR)

**Locations:** §3 line 65 (`Approximately 10 exist`); §3 lines 69–70 (`~2–3` Deep + `~7` Shallow); §8.1 line 406 (`~2–3 Deep and ~7 Shallow`); §8.3 line 432 (`One entry (SNCF…) is drafted and approved; roughly nine remain`); §13 Q12 line 508 (`Roughly nine entries to draft`); §12 line 491 (`excavate all 10`); SM-C3 line 481 (`Ten honest entries with three real decisions`).

**What is wrong:** Four different totals are implied by the same set of statements:
- §3:65 → **10** Projects total.
- §3:69 + §3:70 → 2–3 + 7 = **9 to 10**. Only the upper bound reaches 10.
- §8.3:432 → 1 drafted + 9 remaining = **10**. Consistent with §3:65.
- SM-C3:481 → `Ten honest entries with **three** real decisions` — this fixes Deep at **3**, not "2–3", making the split 3 + 7 = 10 exactly.

So SM-C3 silently resolves the `2–3` range to `3`, while §3, §8.1 keep it open. If Deep is 2, the total is 9 and §8.3's "roughly nine remain" plus the one drafted overshoots. The word "roughly" absorbs this, but a downstream epic-breakdown workflow reading §8.1 will plan for an ambiguous 9-or-10 while §8.3 plans for exactly 10.

**Exact fix:** Pick one and propagate. Recommended — make the ranges consistent and let SM-C3 stop asserting a number:
- §3 line 65: `Approximately 10 exist.` → `Approximately 10 exist (see §8.3 for the current split).`
- §3 line 69: `Approximately 2–3 at launch.` → `Approximately 3 at launch.` (matching SM-C3's assertion), **or** change SM-C3 line 481 to `Ten honest entries with two or three real decisions beat ten uniformly deep ones…` to match §3. **The second option is safer** — it changes one line rather than a glossary definition, and §13 Q12 leaves the count genuinely open.
- §8.3 line 432: `roughly nine remain across ~5–6 clients` → `roughly nine remain across ~5–6 Clients` (also fixes a G4-class casing issue).

### ISSUE F2 — NFR-3's "24fps" contradicts NFR-2's "Below that threshold, serve the Fallback" (BLOCKER)

**Locations:** NFR-2 line 374: `Locked 30fps at 1080p… **Below that threshold, serve the Fallback.**` NFR-3 line 375: `Better the real thing at 24fps than a lesser thing at 30.`

**What is wrong:** These two adjacent bullets state opposite policies for the same situation. NFR-2 says: if you cannot hold 30fps, **serve the Fallback** (i.e. abandon the 3D scene entirely). NFR-3 says: if you cannot hold 30fps, **keep full quality and drop to 24fps** (i.e. keep the 3D scene at a lower framerate). A machine that renders the full-quality scene at 24fps is, per NFR-2, a Fallback candidate and, per NFR-3, a success case. There is no reconciling clause.

The intent is almost certainly: *degrade framerate before degrading quality, and serve the Fallback only when framerate collapses far below 30* — but no floor is stated, and "Below that threshold" reads as 29.

**Exact fix:** NFR-2 line 374, change `Below that threshold, serve the Fallback.` → `Below a hard floor (see NFR-3), serve the Fallback.` And NFR-3 line 375, prepend: `**Degradation policy: quality holds, frames drop — down to a hard floor below which the Fallback is served instead.** \`[ASSUMPTION: the hard floor is 20fps sustained.]\`` — then add the new assumption to §14 and a corresponding §13 question. **Alternatively**, if 30fps is genuinely a hard cut, delete the "24fps" example from NFR-3 and rewrite it as `Better the real thing at the low end of the locked range than a lesser thing at the top of it.`

### ISSUE F3 — "eighteen objects" vs "~18 Bodies" vs "~18 Bodies is far too few to cluster" — the 18 counts different things in different places (MAJOR)

**Locations:** §3 line 67 (`Roughly 18 primary Bodies total`); §4.1 NFR line 152 (`Force layout of ~18 Bodies must settle`); §4.3 line 222 (`eighteen objects in a void… eighteen objects in a medium`); §8.2 line 427 (`~18 Bodies is far too few to cluster`).

**What is wrong:** §3:67 says 18 are *primary* Bodies — Stars + Planets. With ~5–6 Clients and ~10 Projects, that is 15–16, not 18. Adding 2 Companies would reach 17–18, but §3:63 states Companies are explicitly **never** Bodies. So the arithmetic of the Glossary's own figures (5–6 Stars + 10 Planets = 15–16) does not reach 18 by any route the Glossary permits.

Separately, §4.3:222's "eighteen objects" is a *compositional density* argument about what fills the frame, which would sensibly include Condensates and Dust — a different population from §3:67's "primary Bodies".

**Exact fix:**
- Either correct the count: §3 line 67 `Roughly 18 primary Bodies total.` → `Roughly 16 Bodies total (5–6 Stars plus ~10 Planets).` and propagate to lines 152, 427 and addendum.md line 43 (`~18` → `~16`).
- Or state what makes 18: §3 line 67 → `Roughly 18 Bodies total at launch, allowing headroom above the current 5–6 Stars and ~10 Planets.`
- Independently, §4.3 line 222 should stop reusing the number for a different population: `eighteen objects in a void reads as sparse, eighteen objects in a medium reads as space` → `sixteen Bodies in a void reads as sparse; the same Bodies in a medium reads as space` (this also fixes G2).

### ISSUE F4 — UJ-2 says "a hundred and fifty words" where FR-8 specifies a 100–150 range (MINOR)

**Locations:** UJ-2 line 51 (`offers a hundred and fifty words of connected prose`); FR-8 line 172 (`100–150 words`); addendum.md line 55 (`150 words of prose in a 3D context`).

**What is wrong:** The journey and the addendum both fix the value at the top of the range, treating 150 as *the* number. A UX spec derived from addendum.md:55 will lay out for 150 words; one derived from FR-8 must accommodate 100. The difference is a third of the block height.

**Exact fix:** UJ-2 line 51: `offers a hundred and fifty words of connected prose` → `offers a hundred-odd words of connected prose`. addendum.md line 55: `typographic treatment of 150 words of prose in a 3D context` → `typographic treatment of 100–150 words of prose in a 3D context, laid out to hold the upper bound`.

### ISSUE F5 — §12 says shared light "breaks past ~6 skills" while §3 says Skills are "Unbounded in count" (MINOR)

**Locations:** §3 line 66 (`**Skill** — … Unbounded in count.`); §12 line 489 (`shared light / spectral colour (physically true but breaks past ~6 skills)`).

**What is wrong:** Not a contradiction — §12's `~6` is the *rejected* alternative's limit, and it is precisely *why* it was rejected in favour of an unbounded mechanic. But the two figures sit unreconciled and a skim-reader may take `~6` as a Skill-count budget. Also note `~5 Bodies is too sparse` at line 491, a third loose number in the same section.

**Exact fix:** §12 line 489: `breaks past ~6 skills` → `breaks past ~6 Skills, where Dust is unbounded`. Line 491: `~5 Bodies is too sparse for force layout to mean anything` → `~5 Bodies is too sparse for force layout to mean anything, against the ~16 the full inventory yields`.

---

## Appendix: Priority-Ordered Fix List

Fix in this order — earlier fixes make later ones mechanical.

1. **F2** (BLOCKER) — NFR-2 vs NFR-3 framerate policy contradiction. Reconcile before any architecture work.
2. **G1** (BLOCKER) — "flat star chart"/"flat chart" → **Fallback**, 9 sites.
3. **F3** (MAJOR) — the ~18 Bodies count does not follow from the Glossary's own component counts.
4. **G3** (MAJOR) — the Body definition contradicts itself on whether a condensed Skill is a Body. Add **Condensate**.
5. **G8** + **G14** (MAJOR) — define **Entry**; stop using "entries" for Projects; add the four missing Glossary terms.
6. **A2** (MAJOR) — 7 `[NOTE FOR PM]` tags, no convention statement and no index; 2 orphans.
7. **O4** (MAJOR) — 3 of 6 assumptions lack their `See §13 Qn` pointer.
8. **F1** (MAJOR) — Project total 9 vs 10; SM-C3 silently fixes Deep at 3.
9. **G2**, **G10** (MAJOR) — "object" for Body; state the `notable`/**Notable** convention.
10. **C1**, **C3**, **C6** (MAJOR/MINOR) — FR-8, FR-17, NFR-4 uncited from the places that depend on them.
11. All remaining MINOR items: **C2, C4, C5, A3, O1, O2, G4–G7, G9, G11, G12, F4, F5**.

**Clean categories:** §2 Numbering (0 issues) and §6 Link validity (0 issues) both pass completely.
