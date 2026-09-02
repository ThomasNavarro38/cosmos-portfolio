/**
 * Validates `career.json` against the schema and fails the build on any violation.
 *
 * Run with `npm run validate`. Node 24 strips TypeScript types natively, so this
 * needs no build step. Exits 0 on success, 1 on any failure — the failure is
 * loud by design, because a misspelled field name would otherwise silently
 * reclassify an entry (FR-5).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CareerSchema } from './schema.ts';

const CAREER_JSON = fileURLToPath(new URL('./career.json', import.meta.url));

/** The raw shape before validation — used only to name entries in error output. */
interface RawEntry {
  readonly client?: unknown;
  readonly project?: unknown;
}

/**
 * Zod reports a failing entry as an array index (`["projects", 1]`). An index is
 * a poor answer in a build log, so resolve it back to the raw entry's names.
 */
function labelFor(raw: unknown, path: readonly PropertyKey[]): string {
  const [root, index] = path;
  if (root !== 'projects' || typeof index !== 'number') return 'career.json';

  const projects = (raw as { projects?: unknown })?.projects;
  const entry: RawEntry | undefined = Array.isArray(projects)
    ? (projects[index] as RawEntry | undefined)
    : undefined;

  const client = typeof entry?.client === 'string' ? entry.client : undefined;
  const project = typeof entry?.project === 'string' ? entry.project : undefined;

  if (client !== undefined && project !== undefined) return `${client} — ${project}`;
  if (client !== undefined) return `${client} — entry #${index}`;
  return `entry #${index}`;
}

/** The field the issue is about, as a dotted path below the entry itself. */
function fieldFor(path: readonly PropertyKey[]): string | undefined {
  const rest = path.slice(2);
  return rest.length > 0 ? rest.join('.') : undefined;
}

/**
 * Validates already-parsed data. Returns the lines a failure should print, empty
 * on success. Split out from file reading so the test suite can drive it with
 * in-memory fixtures.
 */
export function validateCareer(raw: unknown): string[] {
  const result = CareerSchema.safeParse(raw);
  if (result.success) return [];

  return result.error.issues.map((issue) => {
    const label = labelFor(raw, issue.path);
    const field = fieldFor(issue.path);
    const where = field === undefined ? '' : ` [${field}]`;
    return `${label}${where}: ${issue.message}`;
  });
}

/**
 * Finds keys repeated within one JSON object, returning their dotted paths.
 *
 * This has to run against the raw text. `JSON.parse` collapses a repeated key
 * to its last occurrence before any schema sees the result, so
 * `"notable":"prose"` followed by `"notable":""` arrives as an empty string and
 * validates clean — silently demoting a Deep Project to Shallow. `strictObject`
 * structurally cannot catch it: it compares against the already-collapsed
 * object. A `JSON.parse` reviver is no help either, for the same reason.
 *
 * The scan is a small string walk rather than a full parser: it tracks string
 * literals (so a brace or quote inside a value is not mistaken for structure),
 * and records the key set of each open object scope. Malformed input is left
 * for `JSON.parse` to report — this pass only looks for repeats.
 */
function findDuplicateKeys(text: string): string[] {
  interface Scope {
    readonly seen: Set<string>;
    readonly isArray: boolean;
    /** The key this scope was opened under — fixed at open, never reassigned. */
    readonly key: string | undefined;
    index: number;
  }

  const duplicates: string[] = [];
  const stack: Scope[] = [];
  let lastString: string | undefined;
  /** The key a `{` or `[` is about to become the value of. */
  let pendingKey: string | undefined;
  let expectingKey = false;

  const pathTo = (key: string): string => {
    let path = '';
    for (const scope of stack) {
      if (scope.key !== undefined) path += path === '' ? scope.key : `.${scope.key}`;
      if (scope.isArray) path += `[${scope.index}]`;
    }
    return path === '' ? key : `${path}.${key}`;
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      let value = '';
      i += 1;
      for (; i < text.length; i += 1) {
        const c = text[i];
        if (c === '\\') {
          value += text[i + 1] ?? '';
          i += 1;
          continue;
        }
        if (c === '"') break;
        value += c;
      }
      lastString = value;
      continue;
    }

    if (char === '{' || char === '[') {
      stack.push({
        seen: new Set<string>(),
        isArray: char === '[',
        key: stack.length > 0 ? pendingKey : undefined,
        index: 0,
      });
      expectingKey = char === '{';
      lastString = undefined;
      pendingKey = undefined;
      continue;
    }

    if (char === '}' || char === ']') {
      stack.pop();
      expectingKey = false;
      lastString = undefined;
      pendingKey = undefined;
      continue;
    }

    if (char === ':') {
      const scope = stack[stack.length - 1];
      if (expectingKey && scope !== undefined && lastString !== undefined) {
        if (scope.seen.has(lastString)) duplicates.push(pathTo(lastString));
        else scope.seen.add(lastString);
        pendingKey = lastString;
      }
      expectingKey = false;
      lastString = undefined;
      continue;
    }

    if (char === ',') {
      const scope = stack[stack.length - 1];
      if (scope !== undefined) {
        if (scope.isArray) scope.index += 1;
        else expectingKey = true;
      }
      lastString = undefined;
      pendingKey = undefined;
      continue;
    }
  }

  return duplicates;
}

/**
 * Reads and parses the file. A malformed JSON file reports the parse error, not
 * a stack trace. Duplicate keys are rejected here, before validation, because
 * parsing destroys the evidence.
 */
export function readCareerFile(path: string): { ok: true; data: unknown } | { ok: false; message: string } {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `could not read ${path}: ${message}` };
  }

  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `career.json is not valid JSON: ${message}` };
  }

  const duplicates = findDuplicateKeys(text);
  if (duplicates.length > 0) {
    const named = duplicates.map((p) => labelDuplicate(data, p)).join('; ');
    return {
      ok: false,
      message: `career.json repeats a key, which JSON parsing would silently collapse: ${named}`,
    };
  }

  return { ok: true, data };
}

/** Names a duplicate by its entry, matching the style of validation failures. */
function labelDuplicate(data: unknown, dottedPath: string): string {
  const match = /^projects\[(\d+)\]\.(.+)$/.exec(dottedPath);
  if (match === null) return `"${dottedPath}"`;

  const [, rawIndex, key] = match;
  const index = Number(rawIndex);
  const label = labelFor(data, ['projects', index]);
  return `"${key}" repeated on ${label}`;
}

function main(): void {
  // `engines` is advisory: npm does not enforce it without `engine-strict`. On an
  // older Node this file fails as a TypeScript syntax error, which names the
  // symptom rather than the cause, so say the cause plainly.
  const major = Number(process.versions.node.split('.')[0]);
  if (Number.isFinite(major) && major < 24) {
    console.error(
      `validation needs Node 24 or newer for native TypeScript support; this is Node ${process.versions.node}`,
    );
    process.exit(1);
  }

  const read = readCareerFile(CAREER_JSON);
  if (!read.ok) {
    console.error(read.message);
    process.exit(1);
  }

  const failures = validateCareer(read.data);
  if (failures.length > 0) {
    console.error('career.json failed validation:');
    for (const line of failures) console.error(`  ${line}`);
    process.exit(1);
  }

  console.log('career.json is valid.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
