# Spine Pair Review — Cosmos Portfolio (rubric walker)

**Reviewed:** `DESIGN.md` (1000 lines), `EXPERIENCE.md` (968 lines)
**Against:** PRD §3 Glossary and §13, `.memlog.md` (75 entries), `direction-03-deep-field.html`, `references/validate.md`
**Run:** 2026-09-01

---

## Verdict

This is a strong spine pair. The mechanical check that usually finds the most defects found none: **every one of the 68 distinct `{path.to.token}` references across both documents resolves to a real token in DESIGN.md's frontmatter — zero unresolvable references.** All ten ratified decisions from the memlog are present, and nine of the ten are faithfully and unambiguously represented, including the hard one (THE COLLISION RULE, which appears in both spines with matching force). Section coverage is complete against the rubric's canonical shape, vocabulary discipline against the PRD Glossary is essentially clean, and the Open Items sections are honest — the First Paint 2.5s number, Q6/Q7 timing, Q9 detection and Q14's Shot template are all correctly carried as unratified rather than laundered into settled fact. That is unusually disciplined.

The defects that exist are concentrated in three places. First, **three IA surfaces named in EXPERIENCE.md §2 are never specified** — the Colophon has no state, interaction, or accessibility treatment anywhere in the document, and the panel's own close affordance and the free-flight return control are both depended upon by behaviour specs while existing in neither spine's component inventory. Second, **DESIGN.md contains four internal self-contradictions**, two of which (the hover-luminance rule and the focus-outline offset) will produce wrong code if a builder source-extracts the token block rather than reading the prose. Third, **one ratified decision — #5, the hover affordance — is weakened by a stray "Not used for: hover" clause in the stroke ladder** that flatly denies the luminance step the same document specifies eighty lines later. None of these is a design failure; all are editing failures in a document set that is otherwise contract-grade.

**Unresolvable token references: 0.**

---

## Blocker

Findings that contradict a ratified decision, or that would cause a downstream consumer to build the wrong thing from a clean source-extract.

### B1 — DESIGN.md:415 denies the hover luminance step that both spines specify (ratified decision #5)

**File:** `DESIGN.md`, line 415 (stroke ladder table, `stroke-near` row).

The `stroke-near` row's story column reads: *"**Not used for:** hover. Hover is not a luminance change (see §7)."* This is false in this document and in its peer. DESIGN.md §7.3 line 728 specifies that on hover *"the Body's own stroke steps from `stroke-rest` to `stroke-active` — **a luminance step, not a new shape**"*, and EXPERIENCE.md §4.3 lines 286–288 and §5.2 line 375 both specify the identical `stroke-rest-dark` → `stroke-active-dark` step. Hover *is* a luminance change; it is simply a step to `stroke-active`, not to `stroke-near`. As written, line 415 tells a builder that hover must not change Body luminance, which deletes the adopted resolution to the collision rule and leaves hover with no Body-level feedback at all.

**Fix:** Rewrite the clause to name the actual exclusion: *"**Not used for:** hover. Hover steps the Body to `stroke-active`, not to this step — `stroke-near` is a camera-distance rank, not an interaction state."*

### B2 — DESIGN.md:232 vs 235 — `affordance-focus-ring` specifies two different offsets in the same token object

**File:** `DESIGN.md`, lines 232 and 235.

`components.affordance-focus-ring.geometry` (line 232) reads *"plus a **2px** offset square-cornered outline on the label block"*, while `components.affordance-focus-ring.outlineOffset` (line 235) is `"3px"`, and the §7.3 prose at line 738 says *"at **3px** offset"*. A consumer extracting the frontmatter token object gets a self-contradicting spec, and the keyboard focus indicator is the one component where an ambiguous value has an accessibility consequence.

**Fix:** Change line 232's `geometry` string to *"same leader-and-label as hover, plus a square-cornered outline on the label block"* — drop the number from the prose field entirely and let `outlineWidth`/`outlineOffset` be the single source. 3px is the correct value.

### B3 — EXPERIENCE.md:413 depends on a panel close affordance that exists in neither spine

**File:** `EXPERIENCE.md`, line 413 (§5.5 Focus release).

Focus release is specified as firing on *"activating the panel's close affordance"*, and E-A4 (line 933) repeats it. No such control exists anywhere. DESIGN.md §7.6 lines 800–806 enumerate the panel's contents as exactly four items — kicker, title, reading position, field table — and DESIGN.md §8 line 941 forbids adding chrome (*"No third line of corner chrome, no HUD..."*). A builder has a named release trigger, no geometry, no token, no placement, and a Don't list that appears to forbid inventing one.

**Fix:** Either (a) add a `panel-close` component to DESIGN.md §7.6 and the `components` frontmatter block with explicit geometry consistent with §6 Shapes (no icon, no glyph — most likely a `chrome`-typography text affordance at a stated inset), or (b) delete the clause from §5.5 and E-A4 and rely on Escape plus the explicit scene gesture, noting in the Open Items that pointer users get no visible close control by design.

### B4 — EXPERIENCE.md:563 puts the free-flight return control in a corner-chrome slot DESIGN.md has already spent

**File:** `EXPERIENCE.md`, line 563 (§6.5 free flight assumption).

*"Return is an explicit, always-present affordance in the corner chrome slot."* DESIGN.md §7.9 lines 856–865 allocates both slots: left-top carries identity or Client context, right-bottom carries *"the single active instruction"*, and §7.9 and §8 line 941 both state **"Never three lines. Never a persistent HUD."** During free flight the return affordance is either a forbidden third line, or it silently displaces the scroll instruction — and EXPERIENCE.md does not say which.

**Fix:** State the displacement explicitly in EXPERIENCE.md §6.5: *"In free flight, the right-bottom chrome slot's active instruction becomes 'return to journey'. It replaces the scroll instruction rather than joining it; the two-line limit is never exceeded."* Mirror the rule in DESIGN.md §7.9 so the slot's content is stated to be state-dependent.

### B5 — The Colophon is a named IA surface with no state, interaction, or accessibility specification

**File:** `EXPERIENCE.md`, line 120 (§2 four surfaces table); §4.7 at lines 351–354.

The Colophon is one of the four surfaces in EXPERIENCE.md §2 and is a launch requirement (FR-21, PRD §8.1). It receives four lines total in §4.7. It appears in **no** state (§5.1's table has five states and the Colophon is not among them; there is no cold-load, no error, no scroll state), in **no** interaction primitive (§7 never mentions it — how it is reached, what keyboard does there, whether Escape returns), and in **no** accessibility clause (§11's ten-point floor never names it, though it is the surface most likely to contain a long code block needing a landmark and a language attribute). §2 line 120 promises *"a persistent route from both scene and Fallback"* and no section says what that route is.

**Fix:** Add the Colophon to §5.1's state table (it is a destination state, entered and left like the Fallback), give it two or three lines in §7 Interaction Primitives naming its entry route and its return, and add one clause to §11 covering the JSON block's screen-reader treatment. If it is deliberately being left thin, it must appear in Open Items as a gap — it currently appears in neither the gap table nor the assumption table.

---

## Should fix

Coverage gaps, vocabulary drift, orphan components, and Open-Items completeness defects.

### S1 — DESIGN.md:651–654 forbids and permits the same arrow glyph in one sentence

**File:** `DESIGN.md`, lines 651–654 (§6 Shapes closing paragraph).

*"No glyphs beyond the type family — including no arrow glyph in the corner chrome, which the mock uses (`scroll ↓`) and which is the one place a text arrow is permitted, because it is a scroll instruction..."* The sentence bans the arrow and licenses it in the same breath. §7.9 line 861 then uses `scroll ↓` as the working chrome text, so the intent is clearly to permit it — but §8's Don't list is what a builder skims.

**Fix:** Split the sentence: *"No glyphs beyond the type family. The one exception is the arrow in the corner chrome's scroll instruction (`scroll ↓`), which is permitted because it is an instruction, not a decoration. No other glyph is."*

### S2 — Three DESIGN.md §7 components are orphans with no behavioural counterpart in EXPERIENCE.md §4

**File:** `DESIGN.md` §7.5 (line 781), §7.9 (line 856), §7.12 (line 899).

The rubric requires every named component in DESIGN.md §7 to have a counterpart in EXPERIENCE.md §4 Component Patterns, and vice versa. The reverse direction is clean — every EXPERIENCE.md §4 component has a DESIGN.md §7 spec. Forward, three are orphaned:

- **§7.5 Dust at rest** — no §4 entry. Dust behaviour is scattered across §6.4 (Condensation) and §5.6 (streaming), but the *resting* medium — which FR-15 makes a launch requirement and which §7.5 gives real visual rules — has no behavioural contract. Does resting Dust drift? Does it move with the camera? Does it persist during Focus, given §6.3 says Motes stay visible?
- **§7.9 Corner chrome** — no §4 entry, despite being the only persistent UI in the product, carrying state-dependent content (§7.9 line 860: *"the current Client's name and Project count"*), and now also carrying the free-flight return control per B4.
- **§7.12 The link preview image** — no §4 entry. It appears only inside flow §9.3 step 1. It is an FR-24 launch deliverable and one of the memlog's three named designable shareability surfaces.

**Fix:** Add three short §4 subsections — 4.8 Dust at rest (drift, camera-parallax, persistence through Focus), 4.9 Corner chrome (what each slot carries in each of the five states), 4.10 The link preview (it is static and has no behaviour — say so explicitly, which is itself the contract).

### S3 — EXPERIENCE.md E-G6 appears in the Open Items table with no inline tag anywhere in the document

**File:** `EXPERIENCE.md`, line 950 (Open Items, gaps table) vs §4.4 at lines 300–321.

E-G6 — *"Mote label degradation above ~12 simultaneous labels"* — is cited to §4.4, but §4.4 carries no `[NOTE FOR UX]` tag and never mentions the degradation problem. The rubric requires the Open Items sections to cross-check against inline tags; this is the inverse failure — a table row with no anchor. (DESIGN.md handles the same item correctly: D-G3 is anchored at DESIGN.md line 769.)

**Fix:** Add the inline tag to EXPERIENCE.md §4.4 after the label bullet: `` `[NOTE FOR UX] No entry above nine Skills exists in the inventory today. Behaviour above ~12 simultaneous labels is unspecified; visual strategy is DESIGN.md §7.4. Genuine gap.]` ``

### S4 — DESIGN.md:701 `[NOTE FOR UX]` is a correction, not a gap, and appears in no Open Items table

**File:** `DESIGN.md`, line 701.

The rubric requires every `[NOTE FOR UX]` to be a genuine gap where nothing upstream gave a value. This one is the opposite — it is a resolved correction (the mock's *"a ring means it opens"* caption is wrong; the ring means *carries a Notable*). It is correctly stated and correctly binding, but it is mis-tagged, and consequently it appears in neither the D-A nor the D-G table, leaving the two lists non-exhaustive against the inline tags.

**Fix:** Drop the `[NOTE FOR UX]` wrapper and set the text as a plain bold **Correction** callout under §7.2. The content is already duplicated as a Don't at DESIGN.md line 951 and in EXPERIENCE.md §4.2 line 267, so nothing is lost.

### S5 — The Rail is drawn in DESIGN.md but its visibility has no behavioural contract in EXPERIENCE.md

**File:** `DESIGN.md`, lines 413 and 644; `EXPERIENCE.md` §6.2 (line 476).

DESIGN.md line 644 specifies the Rail as *"a long continuous bezier at `stroke-dust` — the only curve in the product that is not an orbit"*, and line 413 justifies drawing it at the bottom of the ladder. So the Rail is a visible mark in the scene. EXPERIENCE.md §6.2 treats the Rail purely as a trajectory and never states whether it is rendered. Unanswered: is it visible during Focus? During free flight, where the visitor has left it? Does it show the whole journey or only the traversed part? DESIGN.md line 413's own rationale (*"a visible track would turn a journey into a diagram"*) makes this a live risk, not a detail.

**Fix:** Add a bullet to EXPERIENCE.md §6.2: state whether the Rail renders at rest, whether it dims or hides during Focus, and whether it remains visible in free flight as the return cue. If undecided, tag it `[NOTE FOR UX]` and add it to the gaps table.

### S6 — `Escape` is given two jobs with no precedence rule

**File:** `EXPERIENCE.md`, line 616 (§7.3 keyboard table).

*"`Escape` — Release Focus. From free flight, return to the Rail."* A visitor who entered free flight, then Focused a Project, is in both conditions. §5.1 line 367 says Focus *"returns to whichever of On-Rail or Free flight it was entered from"*, so the first Escape releases to free flight and a second returns to Rail — but the table does not say that, and §11 point 2 makes Escape the guarantee against a keyboard trap, so the ambiguity sits on a load-bearing accessibility claim.

**Fix:** Rewrite the row: *"`Escape` — Release Focus if Focused, returning to the state Focus was entered from. If not Focused and in free flight, return to the Rail. Never both in one press."*

### S7 — EXPERIENCE.md:448 names an error surface that §7.5 does not specify

**File:** `EXPERIENCE.md`, line 448 (§5.7) and §7.5 (lines 629–637).

§5.7 closes with *"The one genuine error surface is the contact route failing — see §7.5."* §7.5 specifies the happy path only — a visible copyable address, with copy success feedback as in-place microcopy. There is no failure behaviour: what happens when the clipboard API is unavailable or denied, which is exactly the corporate-laptop case NFR-4 and FR-23 name as the reason `mailto:` alone is insufficient. The one error state the document claims to have is the one it does not specify.

**Fix:** Add to §7.5: if the copy affordance cannot function, it is not rendered at all — the address remains selectable text and nothing announces a failure. That is consistent with §3's no-banner microcopy rule and with FR-20.

### S8 — DESIGN.md:717 leaks a persona name into a contract document

**File:** `DESIGN.md`, line 717.

*"**Adopted resolution (Sally's recommendation): hover brings the LABEL on a leader line, not a shape.**"* "Sally" is the bmad-ux agent persona, not an entity in this project's vocabulary or in the PRD Glossary. Both spines open by declaring the Glossary is used verbatim and that a synonym is a discipline violation; a process artifact in the resolution of the single most important rule in the document is a smaller version of the same problem. EXPERIENCE.md §4.3 line 280 states the same resolution correctly, with no attribution.

**Fix:** Delete the parenthetical. *"**Adopted resolution: hover brings the LABEL on a leader line, not a shape.**"*

### S9 — `components.mote` omits the orbit-distance channel §7.4 makes load-bearing

**File:** `DESIGN.md`, lines 246–253 (frontmatter) vs line 759 (§7.4).

§7.4 point 1 specifies tiering *"by dot radius **and orbit distance**, never by ink below the floor"* and names *"three distinct orbits"*. The `mote` token object carries `radiusTier1/2/3` and `fillTier1/2/3` but no orbit-distance values and no orbit-count field, and `mote-orbit-line` (lines 242–244) describes a single line with no per-tier radius. A consumer extracting tokens gets the radius channel and silently loses the orbit channel — which §7.4 relies on precisely because ink cannot be pushed below the contrast floor.

**Fix:** Add `orbitRadiusRatioTier1/2/3` (or an `orbits:` list) to `components.mote`, expressed as ratios of body radius consistent with `ring-notable.radiusRatio`. If the values are genuinely M1 tuning items, add them as named keys with `"tune at M1"` values so the channel is at least present in the extract, and cross-reference D-T1.

---

## Consider

Quality observations. None of these is a correctness defect.

### C1 — DESIGN.md:459–460 states two contrast failures as current fact after binding them fixed

**File:** `DESIGN.md`, lines 459–460.

The contrast table's Floor column reads **"≥ 4.5:1 — FAILS AS SPECIFIED"** for field labels and Mote labels, and the binding resolution immediately below (lines 463–474) raises both to `ink-label`. But the `components` frontmatter already reflects the *unfixed* values: `panel-field-row.labelColor` is `{colors.ink-quiet-dark}` (line 282) and `editorial-rule-block.color` is `{colors.ink-quiet-dark}` (line 294) — both the failing token, contradicting the binding instruction and DESIGN.md line 840's *"in `ink-label` — raised from the mock's `ink-quiet`"*. A token extract ships the failure.

**Fix:** Change lines 282 and 294 to `{colors.ink-label-dark}`, and reword the table's Floor column to *"≥ 4.5:1 — fails at the mock's value; resolved below"* so the table describes the diagnosis rather than the shipped state. (Filed as Consider rather than Blocker only because the prose resolution is unambiguous and stated as binding; a careless extract still ships an accessibility defect, so treat it as the highest-priority Consider.)

### C2 — EXPERIENCE.md §9.2 step 5 hard-codes inventory content into the flow

**File:** `EXPERIENCE.md`, lines 756–757.

The UJ-2 flow names nine specific Skills (`Java`, `Spring Boot`, `Tomcat`, `Oracle`, `Cloudera`, `MDM`, *"and three more"*) and step 3 quotes a specific Project title. This is vivid and it makes the flow concrete, which is a genuine virtue — but it couples the behaviour spine to inventory content that PRD §8.3 says is nine entries from being finished, and §15 flags the SNCF entry as needing a re-cut anyway (D-G2).

**Fix:** Keep it — the concreteness is worth more than the coupling — but add a parenthetical at first use: *"(content shown is the drafted SNCF entry; illustrative, not fixed)"*.

### C3 — DESIGN.md §7.2's Shallow/Deep table and EXPERIENCE.md §4.2 both omit the Fallback's single-channel case from the ratified-signal statement

**File:** `DESIGN.md`, line 680 (table) and `EXPERIENCE.md`, line 248.

Both state the signal as *"Moon + Ring, layered"* and both later state that the Fallback carries the Ring alone (DESIGN.md line 874, EXPERIENCE.md line 345). Ratified decision #4 is honoured in both places, and the redundancy rationale is correct — but the headline statement in each document is unqualified, and the Fallback exception arrives 190 lines later. A reader who extracts only §7.2/§4.2 gets a rule with an unflagged exception.

**Fix:** Add one clause to each headline statement: *"...both derived from Notable presence alone. On the Fallback, where there is no 3D Moon, the Ring carries the signal alone — see §7.10 / §4.6."*

### C4 — `sans-light-theme` is a declared-but-unused token with no consumer guard

**File:** `DESIGN.md`, line 71.

`typography.fontFamily.sans-light-theme` is defined in the frontmatter and DESIGN.md line 490 says it *"must not appear in the dark build"*. It is referenced by no component token. A consumer generating a stylesheet from the frontmatter will emit an unused font stack, or worse, wire it up. D-G1 correctly records that the light theme needs its own type decision, so the token is doing honest work as a placeholder — but nothing in the token block itself says "do not use".

**Fix:** Rename the key to `sans-light-theme-UNUSED-M2`, or add a sibling comment line in the frontmatter matching the style already used at lines 24–30.

---

## Ratified-decision fidelity — itemised

| # | Ratified decision | Verdict | Evidence |
|---|---|---|---|
| 1 | Rail visits Clients only (~5–6 stops); arrival frames the whole system; Focus always deliberate | **Faithful** | EXP §2 L92–111, §6.2 L476–488, invariant 2 L60; consequences honestly propagated to FR-17a (L100), FR-18 (L106), R-3 (L109) and the UJ-2 structural-deviation callout (L731–740) |
| 2 | Free flight layered: click-to-fly, pull-back, keyboard index | **Faithful** | EXP §6.5 L543–556, table L550–553; "three doors into one room" preserves the same-destination-set constraint from the memlog |
| 3 | "It does not jump; it flies" — no cuts anywhere including Focus | **Faithful** | EXP §6.1 L459–472, explicit forbidden list including *"the panel appearing while the camera is stationary"*; extended correctly to reduced motion at §6.6 L568 |
| 4 | Deep vs Shallow = Moon + Ring, both from Notable presence; size and brightness NOT used | **Faithful** | DES §7.2 L677–699 with the FR-3 inversion argument stated; EXP §4.2 L248–267; DES §2 L419–427 separates the data band from camera state; Don't at DES L949. Minor: see C3 |
| 5 | Hover-revealed affordance with mandatory `:focus` equivalent | **Weakened** | Specified correctly at DES §7.3 L707–741 and EXP §4.3 L269–298 — but **DES L415 denies the luminance step** (see **B1**), and the focus outline offset is self-contradicting (**B2**) |
| 6 | THE COLLISION RULE — Deep ring and hover affordance must not both be rings | **Faithful, in both spines, unambiguous** | DES §7.3 L710–715 (blockquote, "binding on both spines"); EXP §4.3 L274–278 (blockquote, "binding"); reinforced at DES §8 L936, EXP §4.3 L297, and the closing cross-reference EXP L965–968. The strongest-carried decision in the pair |
| 7 | Dust is the display: Motes carry labels automatically, no second interaction, no technology text list in the panel | **Faithful** | DES §7.4 L747–751, §3 L513–516 ("Delete the row"), Don't at L940; EXP §4.4 L304–306 and L318–320 |
| 8 | Notable = one block, constraint lifted with brighter ink, not bold, not labelled | **Faithful** | DES §7.7 L810–823 with the triple negative stated explicitly; supported by the no-bold typography rule at DES §3 L492–495; EXP §3 L188–190 and §9.2 step 7 L763 |
| 9 | Panel = side panel + camera recompose as ONE continuous move | **Faithful** | EXP §6.3 L498–518 ("Not two moves"), three simultaneous components enumerated, one easing curve, release is the same move reversed; DES §4 L554–561 carries the visual consequence (never occluded) without wandering into timing |
| 10 | Shallow = identity fields + `built` + editorial rule in the reading position; a DIFFERENT FINAL BLOCK, not minus a block | **Faithful** | EXP §4.5 L335–339 stated as the promotion contract; DES §4 L582–586 and §7.8 L836–849; Don't at DES L947. The `built` field is present in the field table (DES §7.6 L806) though not called out as promoted — see note below |

**One nuance on #10.** The memlog (entry 52, entry 68) describes the renderer's Shallow treatment as *"`built` promoted into the reading position at near-prose size"*. Both spines instead place `built` in the ordinary field table and put the editorial rule alone in the reading position. This is a defensible simplification — it makes the Deep and Shallow panels structurally identical, which is exactly what the promotion contract needs — and entry 68's own summary ("identity fields, 'built' at normal weight, then a rule at the reading position") supports the spines' reading. Recorded as observed, not as a defect.

---

## Open-items honesty — itemised

**Verified honest.** The four items flagged for special scrutiny are all correctly carried as unratified:

- **Flag 04 / First Paint number.** EXP §5.6 L430–432 states the principle is adopted and *"**The number is not.**"*; E-T5 (L960) repeats it in bold; DES D-T4 (L994) matches. No occurrence of 2.5s stated as a requirement anywhere in either spine.
- **Q6 / Q7 timing numbers.** Both spines route every duration to M1 greybox tuning and specify shape only. DES D-T1/D-T2/D-T3, EXP E-T1/E-T2/E-T3/E-T4. The rule *"specify shape and ratio, never milliseconds"* is stated as a section heading in both.
- **Q9 / Fallback detection.** EXP §9.3 L797–801 and E-G2 (L946) both name it a genuine gap and correctly note it silently decides the capable-tablet case. Not stated as settled anywhere.
- **Q14 / default Shot template.** EXP §6.2 L490–496 and E-G1 (L945), both flagged as *"the highest-leverage unspecified item"*. Correctly escalated rather than quietly filled.

**Assumption completeness.** All 6 DESIGN.md `[ASSUMPTION]` tags carry a proposed value; 5 of 6 carry a PRD §13 question number, and the one without (D-A1, the restraint-over-apparatus read) has no corresponding PRD question — correctly marked "—". All 10 EXPERIENCE.md `[ASSUMPTION]` tags carry proposed values, and 9 of 10 carry a §13 number (E-A7, reduced motion, correctly marked "—" as it arises from no PRD question).

**Cross-check defects found:** S3 (E-G6 table row with no inline anchor) and S4 (DES L701 inline tag in no table). Everything else reconciles in both directions.

---

## Mechanical notes

- **Token resolution: 68/68 references resolve.** Verified by parsing DESIGN.md's frontmatter into 237 dotted paths and matching every `{...}` occurrence in both files. The only non-resolving occurrence is `{path.to.token}` at EXPERIENCE.md line 26, which is the notation being explained, not a reference. **Zero unresolvable references** — the highest-value mechanical check passes clean.
- **DESIGN.md section order** matches the rubric's canonical lock exactly: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. All eight present. Frontmatter carries all five required token groups: `colors` (26 pairs), `typography` (13 roles + families), `rounded`, `spacing`, `components` (20 objects).
- **EXPERIENCE.md** carries all eight required defaults (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows), plus Responsive & Platform (correctly triggered — two renderers) and both invented sections (Motion and Camera, Sequence Pacing). Both invented sections earn their place: Motion and Camera carries the product's defining concern and four ratified decisions; Sequence Pacing addresses PRD §15's explicitly unowned finding and honestly reports that the Clients-only Rail relocated rather than solved the problem.
- **Flow coverage is complete.** All four PRD user journeys (UJ-1..UJ-4) have a Key Flow with the PRD's named protagonist, numbered steps, an explicit CLIMAX beat, a Resolution, and edge cases where the PRD names them. UJ-2's structural deviation from the PRD is disclosed in a callout rather than silently applied — good practice.
- **Vocabulary discipline is clean.** No PRD §3 Glossary term is substituted anywhere. "Planet" appears only inside the compound *"Project Planet"*, in token names (`planet-deep`, `planet-shallow`), and in the Glossary's own quoted phrase *"a planet with no moon"* — never standing in for Project. "Satellite" — the PRD's own term at FR-9 — appears **zero** times in either spine, correctly superseded by the ratified "Moon". "Panel" is used as a defined surface, established in EXPERIENCE.md §2's four-surfaces table, not as a synonym for a defined term.
- **Territory discipline is good.** DESIGN.md stays visual and defers behaviour explicitly (L311, L741, L849). EXPERIENCE.md stays behavioural and defers visuals explicitly (L26, L236, L871, L860). The two crossings found are B4 (EXPERIENCE placing a control in DESIGN's chrome slots) and, more mildly, DESIGN.md §4 L554–561 stating the Focus behaviour — though that one is correctly framed as *"the visual consequence that belongs here"* and is not a conflict.
- **Visual reference coverage.** DESIGN.md links `direction-03-deep-field.html` and `direction-02-draughtsman.html` inline at the relevant sections (L333, L386) and names what each illustrates. **EXPERIENCE.md lists both in `sources` frontmatter but links neither inline** — a minor orphan against the rubric's visual-reference rule, though defensible since the directions are visual artifacts. `direction-01-orbital-instrument.html` and `direction-04-almanac.html` exist in `.working/` and are referenced in neither spine's frontmatter; they were ranked and rejected, so this is correct. The `imports/` directory is empty. "Spines win on conflict" is stated once at the top of each file (DES L307, EXP L19) — correct.
