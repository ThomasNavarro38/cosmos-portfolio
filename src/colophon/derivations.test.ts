/**
 * `derivations.ts` (5.2): the three rows read from the real artifact equal the
 * artifact's own first Project — asserted against the parsed file, never a
 * literal, so a re-solve moves both sides together; an altered artifact (its
 * name, dates, an ongoing end, mass, band, weight, rail distance) is reflected
 * with no code edit; each malformed shape throws a `TypeError` naming its
 * field; and a source audit holds that the module recomputes nothing: no rule
 * function, no numeric literal, no arithmetic, no import.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { DERIVATION_LABELS, derivationRows, type DerivationRow } from './derivations.ts';

const LAYOUT = readFileSync(new URL('../../generated/layout.generated.json', import.meta.url), 'utf8');
const SOURCE = readFileSync(new URL('./derivations.ts', import.meta.url), 'utf8');

interface Project {
  mass: unknown;
  luminanceBand: unknown;
  railDistance: unknown;
  content: { project: unknown; duration: { start: unknown; end: unknown }; weight: unknown };
}

type Layout = { clients: { projects: Project[] }[] };

const parsed = (): Layout => JSON.parse(LAYOUT) as Layout;
const firstProject = (layout: Layout): Project => layout.clients[0]?.projects[0] as Project;

/** The rows the artifact `layout` should yield: its first Project's values, read here independently. */
function expectedRows(layout: Layout): DerivationRow[] {
  const project = firstProject(layout);
  const name = project.content.project as string;
  const duration = { start: project.content.duration.start as string, end: project.content.duration.end as string | null };
  return [
    { rule: 'mass ← duration', project: name, input: duration, output: project.mass as number },
    { rule: 'brightness ← recency', project: name, input: duration, output: project.luminanceBand as string },
    { rule: 'distance from the Rail ← weight', project: name, input: { weight: project.content.weight as number }, output: project.railDistance as number },
  ];
}

/** The real artifact, `edit`ed, as text. */
function altered(edit: (project: Project, layout: Layout) => void): string {
  const layout = parsed();
  edit(firstProject(layout), layout);
  return JSON.stringify(layout, null, 2);
}

test('the copy constant: four headers and the three rules, verbatim', () => {
  assert.deepEqual(DERIVATION_LABELS, {
    rule: 'Rule',
    project: 'Project',
    input: 'Input',
    output: 'Output',
    mass: 'mass ← duration',
    brightness: 'brightness ← recency',
    distance: 'distance from the Rail ← weight',
  });
});

test('the real artifact: three rows, in order, worked on its first Project, each value the artifact’s own', () => {
  const layout = parsed();
  const rows = derivationRows(LAYOUT);
  assert.deepEqual(rows, expectedRows(layout));
  assert.equal(new Set(rows.map((row) => row.project)).size, 1, 'the same Project in all three rows');
  // The values the artifact carries today, drawn from it: a mass, a band name and a distance.
  assert.equal(typeof rows[0]?.output, 'number');
  assert.equal(typeof rows[1]?.output, 'string');
  assert.equal(typeof rows[2]?.output, 'number');
});

test('an altered artifact is reflected, with no code edit', () => {
  for (const [name, edit] of [
    ['the name', (p: Project) => (p.content.project = 'Another project')],
    ['the start', (p: Project) => (p.content.duration.start = '2015-01')],
    ['the end', (p: Project) => (p.content.duration.end = '2019-12')],
    ['an ongoing end', (p: Project) => (p.content.duration.end = null)],
    ['the mass', (p: Project) => (p.mass = 3.7)],
    ['the band', (p: Project) => (p.luminanceBand = 'stroke-near')],
    ['the weight', (p: Project) => (p.content.weight = 2.5)],
    ['the rail distance', (p: Project) => (p.railDistance = 42)],
    ['another Client first', (_: Project, layout: Layout) => layout.clients.reverse()],
  ] as const) {
    const text = altered(edit);
    assert.ok(text !== JSON.stringify(parsed(), null, 2), `the alteration "${name}" must apply`);
    const rows = derivationRows(text);
    assert.deepEqual(rows, expectedRows(JSON.parse(text) as Layout), `${name} is reflected`);
    assert.notDeepEqual(rows, derivationRows(LAYOUT), `${name} changes the rows`);
  }
  const ongoing = derivationRows(altered((p) => (p.content.duration.end = null)));
  assert.deepEqual(ongoing[0]?.input, { start: firstProject(parsed()).content.duration.start, end: null }, 'an ongoing duration carries end null');
});

test('each malformed shape throws a TypeError naming its field', () => {
  const at = 'clients[0].projects[0]';
  for (const [text, field] of [
    ['not json', 'not JSON'],
    ['[]', 'document'],
    ['{}', 'clients'],
    ['{"clients": []}', 'clients is empty'],
    ['{"clients": [1]}', 'clients[0]'],
    ['{"clients": [{}]}', 'clients[0].projects'],
    ['{"clients": [{"projects": []}]}', 'clients[0].projects is empty'],
    [altered((p) => delete (p as Partial<Project>).content), `${at}.content`],
    [altered((p) => delete (p.content as Partial<Project['content']>).project), `${at}.content.project`],
    [altered((p) => (p.content.project = 7)), `${at}.content.project`],
    [altered((p) => delete (p.content as Partial<Project['content']>).duration), `${at}.content.duration`],
    [altered((p) => (p.content.duration.start = 2016)), `${at}.content.duration.start`],
    [altered((p) => delete (p.content.duration as Partial<Project['content']['duration']>).end), `${at}.content.duration.end`],
    [altered((p) => (p.content.duration.end = 2017)), `${at}.content.duration.end`],
    [altered((p) => delete (p.content as Partial<Project['content']>).weight), `${at}.content.weight`],
    [altered((p) => (p.content.weight = '1')), `${at}.content.weight`],
    [altered((p) => delete (p as Partial<Project>).mass), `${at}.mass`],
    [altered((p) => (p.mass = null)), `${at}.mass`],
    [altered((p) => delete (p as Partial<Project>).luminanceBand), `${at}.luminanceBand`],
    [altered((p) => (p.luminanceBand = 3)), `${at}.luminanceBand`],
    [altered((p) => delete (p as Partial<Project>).railDistance), `${at}.railDistance`],
    [altered((p) => (p.railDistance = '10')), `${at}.railDistance`],
  ] as const) {
    assert.throws(
      () => derivationRows(text),
      (error: unknown) => error instanceof TypeError && error.message.includes(field),
      `a layout lacking ${field} throws, naming it`,
    );
  }
});

// --- Nothing recomputed -------------------------------------------------------------------------

/**
 * `derivations.ts` as source: no rule function or helper of `src/derive/` named,
 * no numeric literal (the first entries are reached by destructuring, not an
 * index), no arithmetic operator and no `Math`, and no import — every value it
 * returns is a value it read.
 */
function auditRecompute(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const failures: string[] = [];
  const named = /\b(?:deriveMass|deriveLuminanceBand|deriveRailDistance|durationInMonths|recencyOf)\b/.exec(code);
  if (named !== null) failures.push(`it names ${named[0]} — a rule is src/derive/'s`);
  if (/\b\d/.test(code)) failures.push('a numeric literal — every number is the artifact’s');
  if (/[+\-*/%]/.test(code)) failures.push('an arithmetic operator — nothing is computed');
  if (/\bMath\b/.test(code)) failures.push('Math — nothing is computed');
  if (/^\s*import\b|\bimport\s*\(|\brequire\s*\(/m.test(code)) failures.push('an import — the module is import-free');
  return failures;
}

test('derivations.ts recomputes nothing: no rule, no numeric literal, no arithmetic, no import', () => {
  assert.deepEqual(auditRecompute(SOURCE), []);
});

test('the recompute audit rejects the real source with a rule worked in it', () => {
  const real = SOURCE.replace(/\r\n/g, '\n');
  for (const [name, mutate] of [
    ['a rule function', (s: string) => s.replace('const mass = numberAt(', 'const mass = deriveMass(')],
    ['a month count', (s: string) => s.replace('const weight = numberAt(', 'const months = durationInMonths(start, end);\n  const weight = numberAt(')],
    ['an index literal', (s: string) => s.replace("const [first] = value as readonly unknown[];", 'const first = (value as readonly unknown[])[0];')],
    ['arithmetic on a field', (s: string) => s.replace('output: railDistance }', 'output: weight * railDistance }')],
    ['a rounding', (s: string) => s.replace('output: mass }', 'output: Math.round(mass) }')],
    ['an import', (s: string) => `import { deriveMass as d } from '../derive/rules.ts';\n${s}`],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditRecompute(mutated), [], `"${name}" must be rejected`);
  }
});
