import { z } from 'zod';

/**
 * The schema that gates `career.json`.
 *
 * This is the only place the Project field set is written down. Entities are
 * classified by which fields they lack (FR-5), so a misspelled field name would
 * silently reclassify an entry rather than error. `z.strictObject` is therefore
 * load-bearing: it raises `unrecognized_keys` where `z.object` would strip the
 * unknown key and hand back a plausible-looking, wrong entity.
 *
 * The schema permits; it does not classify. No `kind` field, no type flag, no
 * schema variant separates Deep from Shallow — Story 1.3 owns that derivation.
 */

/**
 * A string that carries actual content.
 *
 * Trimmed before the emptiness check, so `"   "` is rejected rather than
 * accepted as a name. A whitespace-only `client` would otherwise produce an
 * unnamed Star and break the error label that names the entry — the value is
 * not malformed, it is plausible and wrong, which is the class of defect this
 * schema exists to catch.
 */
const NonBlankString = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, { error: 'must not be empty or whitespace-only' });

/** ISO 8601 year-month, e.g. `2019-03`. No display formatting in authored data. */
const IsoYearMonth = z
  .string()
  .regex(
    /^\d{4}-(0[1-9]|1[0-2])$/,
    'must be an ISO 8601 year-month, e.g. "2019-03"',
  );

/**
 * The furthest month an authored `end` may name.
 *
 * A closed engagement ending after the reference month outranks an ongoing one
 * on recency, which inverts the rule that an ongoing engagement is the most
 * recent thing in the set — it would dim the work being done right now. The
 * ceiling is a fixed constant rather than `new Date()` because a schema that
 * reads the clock rejects different files in different months with no authored
 * change, the same churn the derive layer avoids by injecting its reference
 * month. Raise it deliberately when the horizon is genuinely reached.
 */
const AUTHORING_HORIZON = '2027-12';

/**
 * One engagement span. `end: null` means ongoing.
 *
 * FR-3 derives both mass (from the span) and recency (from `end`) out of this
 * single authored value, so no second hand-authored number is needed.
 *
 * `end` must not precede `start`. An inverted span is not caught by the field
 * formats — both halves are well-formed ISO — so it would reach Story 1.3 as a
 * negative span and silently corrupt the mass derivation. Because `YYYY-MM`
 * strings sort lexicographically in chronological order, a string compare is
 * the whole check.
 *
 * `end` must also not run past `AUTHORING_HORIZON`. A future end date is well
 * formed and not inverted, so neither check above catches it, and it reaches
 * the derivation as an engagement more recent than one that is still ongoing.
 */
export const DurationSchema = z
  .strictObject({
    start: IsoYearMonth,
    end: IsoYearMonth.nullable(),
  })
  .refine((d) => d.end === null || d.end >= d.start, {
    error: 'end must not precede start',
    path: ['end'],
  })
  .refine((d) => d.end === null || d.end <= AUTHORING_HORIZON, {
    error: `end must not be later than ${AUTHORING_HORIZON}; use null for an ongoing engagement`,
    path: ['end'],
  });

/** The marks around a Notable's one constraint sentence, which the panel lifts in brighter ink. */
export const LIFT_OPEN = '[[';
export const LIFT_CLOSE = ']]';
/** A paragraph break in a Notable: a blank line. The panel splits on the same rule. */
export const PARAGRAPH_BREAK = /\n\s*\n/;

/** Sentence-ending punctuation, optionally closed by a quote, guillemet or bracket. */
const END = String.raw`[.!?…]["'”’»)\]]*`;
const SENTENCE_END = new RegExp(`${END}$`);
/** The end of a sentence before the lift: its punctuation, then whitespace. */
const SENTENCE_BEFORE = new RegExp(`${END}\\s+$`);
/**
 * One sentence ending and another beginning inside the marks. A heuristic, like
 * every sentence test here: an abbreviation such as `e.g.` mid-sentence reads as
 * a break, and the author re-words or keeps it out of the lifted sentence.
 */
const SENTENCE_BREAK = new RegExp(`${END}\\s+\\S`);

/** A line set like a list item: a bullet or dash, or a number or letter followed by `.` or `)`. */
const LIST_LINE = /^\s*(?:[-*•+–—]|\d+[.)]|[a-z]\))\s/m;

/**
 * Why a non-empty Notable is not authorable prose, one message per problem.
 *
 * The Notable is connected prose (FR-8, FR-10), so no line may be set like a
 * list item. It places its constraint in one findable sentence (DESIGN.md §7.7),
 * which the author marks `[[…]]`: exactly one span, inside one paragraph,
 * holding a whole sentence — it starts a paragraph or follows a sentence's end,
 * and ends one — and never the whole paragraph, since the lift must stay in the
 * flow of the prose.
 */
function notableProblems(notable: string): string[] {
  const problems: string[] = [];
  if (LIST_LINE.test(notable)) problems.push('must be connected prose — no line may be set as a list item');
  const opens = notable.split(LIFT_OPEN).length - 1;
  const closes = notable.split(LIFT_CLOSE).length - 1;
  const open = notable.indexOf(LIFT_OPEN);
  const close = notable.indexOf(LIFT_CLOSE);
  if (opens !== 1 || closes !== 1 || close < open || /\[\[\[|\]\]\]/.test(notable)) {
    problems.push(`must mark its constraint sentence exactly once, as ${LIFT_OPEN}…${LIFT_CLOSE}`);
    return problems;
  }
  const paragraph = notable.split(PARAGRAPH_BREAK).find((p) => p.includes(LIFT_OPEN)) ?? '';
  if (!paragraph.includes(LIFT_CLOSE)) {
    problems.push('must keep the marked constraint sentence inside one paragraph');
    return problems;
  }
  const at = paragraph.indexOf(LIFT_OPEN);
  const end = paragraph.indexOf(LIFT_CLOSE);
  const before = paragraph.slice(0, at).trim() === '' ? '' : paragraph.slice(0, at);
  const inner = paragraph.slice(at + LIFT_OPEN.length, end);
  const after = paragraph.slice(end + LIFT_CLOSE.length);
  if (inner.trim() === '' || inner !== inner.trim() || !SENTENCE_END.test(inner)) {
    problems.push('must mark a whole sentence, ending in . ! ? or …, with no space just inside the marks');
  } else if (SENTENCE_BREAK.test(inner)) {
    problems.push('must mark one sentence, not several');
  } else if ((before !== '' && !SENTENCE_BEFORE.test(before)) || (after !== '' && !/^\s/.test(after))) {
    problems.push('must mark a whole sentence, not part of one');
  } else if (before === '' && after.trim() === '') {
    problems.push('must keep the marked constraint sentence inside the paragraph, not as a paragraph of its own');
  }
  return problems;
}

/**
 * The Project field set, exactly ten fields. No entry has a field another lacks.
 *
 * `notable` is `nullish()`: absent, `null`, and `""` are all accepted and all
 * mean Shallow. Promoting a Shallow Project to Deep is free — populate the
 * string, its constraint sentence marked, and change nothing else. It is
 * trimmed first, so a whitespace-only value normalizes to `""` and joins that
 * set rather than passing as Deep prose and rendering a blank panel. A non-empty Notable must pass `notableProblems`:
 * connected prose with its one constraint sentence marked `[[…]]`.
 *
 * Note the three Shallow forms differ in *parsed shape* — absent yields nine
 * keys, `null` and `""` yield ten — so Story 1.3's classifier must treat
 * `undefined`, `null` and `""` as one case.
 *
 * `weight` is the only hand-authored *tuning* number in the file: optional,
 * default `1`, and positive, since `0` is a degenerate distance from the Rail.
 * (`team_size` is factual content, not a value anyone tunes.)
 */
export const ProjectSchema = z.strictObject({
  client: NonBlankString,
  project: NonBlankString,
  company: NonBlankString.nullable(),
  role: NonBlankString,
  built: NonBlankString,
  team_size: z.number().int().positive(),
  duration: DurationSchema,
  notable: z
    .string()
    .transform((s) => s.trim())
    .superRefine((s, ctx) => {
      if (s === '') return;
      for (const message of notableProblems(s)) ctx.addIssue({ code: 'custom', message });
    })
    .nullish(),
  skills: z.array(NonBlankString),
  weight: z.number().positive().default(1),
});

/**
 * The whole authored file: one list of Projects, and the month they are measured
 * against.
 *
 * `asOf` is the reference month an ongoing engagement's span and recency are
 * computed to. It is **authored**, not clocked and not passed on a command line.
 * A clock read would churn the committed artifact every month for no authored
 * change, defeating the deliberate-solve rule; a CLI argument would live in
 * nobody's file, so the artifact could not be reproduced without knowing what
 * someone typed. Authored here it sits beside the entries it measures, gets this
 * schema's validation for free, and bumping it is the same one-line gesture as
 * adding an entry.
 *
 * Required rather than optional: a default would be a second place the reference
 * month is written down, and the two would drift.
 */
export const CareerSchema = z.strictObject({
  asOf: IsoYearMonth,
  projects: z.array(ProjectSchema),
});

/** A validated Project, with `weight` resolved to its default where omitted. */
export type Project = z.infer<typeof ProjectSchema>;

/** A validated career file. */
export type Career = z.infer<typeof CareerSchema>;

/** One engagement span, validated. */
export type Duration = z.infer<typeof DurationSchema>;
