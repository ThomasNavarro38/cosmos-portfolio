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
 */
export const DurationSchema = z
  .strictObject({
    start: IsoYearMonth,
    end: IsoYearMonth.nullable(),
  })
  .refine((d) => d.end === null || d.end >= d.start, {
    error: 'end must not precede start',
    path: ['end'],
  });

/**
 * The Project field set, exactly ten fields. No entry has a field another lacks.
 *
 * `notable` is `nullish()`: absent, `null`, and `""` are all accepted and all
 * mean Shallow. Promoting a Shallow Project to Deep is free — populate the
 * string, change nothing else. It is trimmed first, so a whitespace-only value
 * normalizes to `""` and joins that set rather than passing as Deep prose and
 * rendering a blank panel.
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
    .nullish(),
  skills: z.array(NonBlankString),
  weight: z.number().positive().default(1),
});

/** The whole authored file: one list of Projects. */
export const CareerSchema = z.strictObject({
  projects: z.array(ProjectSchema),
});

/** A validated Project, with `weight` resolved to its default where omitted. */
export type Project = z.infer<typeof ProjectSchema>;

/** A validated career file. */
export type Career = z.infer<typeof CareerSchema>;

/** One engagement span, validated. */
export type Duration = z.infer<typeof DurationSchema>;
