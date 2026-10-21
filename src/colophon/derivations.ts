/**
 * The three mapping rules, worked on a real entity (5.2): one row per rule —
 * `mass ← duration`, `brightness ← recency`, `distance from the Rail ← weight` —
 * each naming a Project, its input as the data holds it, and the visual
 * property the solver derived from it.
 *
 * **Read, never recomputed.** Every value comes from the fetched
 * `layout.generated.json` text at render time. Each Project in the artifact
 * carries its authored `content` (the duration, the resolved `weight`) beside
 * its derived `mass`, `luminanceBand` and `railDistance`, so a row is the two
 * read side by side: no rule, no month count and no recency is computed here —
 * those are `src/derive/rules.ts`'s alone, and this module imports nothing.
 *
 * **The worked entity** is the first Project in the artifact's order — the
 * first Client's first Project — chosen here, positionally, so it is the first
 * entry a visitor meets in both exhibits and survives any edit to the data. It
 * is the same Project in all three rows.
 *
 * **Narrowed, not trusted.** The text is parsed to `unknown` and each field
 * read is checked; the first one missing or mistyped throws a `TypeError`
 * naming it (the `colophon-host` error boundary takes it from there).
 */

/** The derivation table's copy (5.2): its four headers and the three rules' names. */
export const DERIVATION_LABELS = { rule: 'Rule', project: 'Project', input: 'Input', output: 'Output', mass: 'mass ← duration', brightness: 'brightness ← recency', distance: 'distance from the Rail ← weight' } as const;

/** A rule's input, as the artifact's `content` holds it: a duration (`end` `null` while ongoing) or the resolved weight. */
export type DerivationInput = { readonly start: string; readonly end: string | null } | { readonly weight: number };

/** One worked rule: its name, the Project, the input and the derived visual property, each the artifact's own value. */
export interface DerivationRow {
  readonly rule: string;
  readonly project: string;
  readonly input: DerivationInput;
  readonly output: number | string;
}

type Fields = Readonly<Record<string, unknown>>;

const isObject = (value: unknown): value is Fields => typeof value === 'object' && value !== null && !Array.isArray(value);

function objectAt(value: unknown, path: string): Fields {
  if (!isObject(value)) throw new TypeError(`the layout's ${path} is missing or not an object`);
  return value;
}

function firstOf(value: unknown, path: string): unknown {
  if (!Array.isArray(value)) throw new TypeError(`the layout's ${path} is missing or not an array`);
  const [first] = value as readonly unknown[];
  if (first === undefined) throw new TypeError(`the layout's ${path} is empty`);
  return first;
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new TypeError(`the layout's ${path} is missing or not a string`);
  return value;
}

function numberAt(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`the layout's ${path} is missing or not a finite number`);
  return value;
}

/** The three rows, in order, worked on the artifact's first Project, read from the layout text. */
export function derivationRows(layoutText: string): readonly DerivationRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(layoutText);
  } catch {
    throw new TypeError('the layout is not JSON');
  }
  const layout = objectAt(parsed, 'document');
  const client = objectAt(firstOf(layout['clients'], 'clients'), 'clients[0]');
  const entity = objectAt(firstOf(client['projects'], 'clients[0].projects'), 'clients[0].projects[0]');
  const at = 'clients[0].projects[0]';
  const content = objectAt(entity['content'], `${at}.content`);
  const project = stringAt(content['project'], `${at}.content.project`);
  const duration = objectAt(content['duration'], `${at}.content.duration`);
  const start = stringAt(duration['start'], `${at}.content.duration.start`);
  const end = duration['end'] === null ? null : stringAt(duration['end'], `${at}.content.duration.end`);
  const weight = numberAt(content['weight'], `${at}.content.weight`);
  const mass = numberAt(entity['mass'], `${at}.mass`);
  const luminanceBand = stringAt(entity['luminanceBand'], `${at}.luminanceBand`);
  const railDistance = numberAt(entity['railDistance'], `${at}.railDistance`);
  return [
    { rule: DERIVATION_LABELS.mass, project, input: { start, end }, output: mass },
    { rule: DERIVATION_LABELS.brightness, project, input: { start, end }, output: luminanceBand },
    { rule: DERIVATION_LABELS.distance, project, input: { weight }, output: railDistance },
  ];
}
