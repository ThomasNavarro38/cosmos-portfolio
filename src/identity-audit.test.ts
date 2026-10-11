/**
 * The Schematic Identity's definition-of-done audit (3.9), executed: every epic
 * AC that a machine can hold, as one audit function each, run over the shipped
 * source and then over a mutation of it that must fail with that audit's own
 * message. The human ACs (NFR-1a, FR-9, the voice refusals, nothing reading as a
 * placeholder) are protocols in `identity-audit-3-9.md`, beside this file's test
 * names.
 *
 * - **Achromatic** — every `-dark` colour token has OKLCH chroma < 0.02 (ruling
 *   1b). The cool cast (hue ≈ 286°, chroma ≤ 0.016) is deliberate and stays.
 * - **Contrast** — one table maps each text role to its ink and its ground, both
 *   read from the shipping source (a CSS declaration or a model constant), never
 *   restated here.
 * - **Copy** — every visible literal string shipped from `src/` or `index.html`
 *   is in one closed allowlist; accessible names are a second, separate list.
 * - **Voice** — no work-in-progress, beta or apologetic word in any shipped
 *   string, in `career.json` or in `index.html`.
 * - **Bands** — no Body in the committed artifact carries `stroke-dust` (ruling
 *   4b-i).
 * - **Page** and **Index** — the full-viewport page (ruling 7a) and the index
 *   hidden until keyboard focus (ruling 8a), as exact declaration sets.
 *
 * This file sits directly in `src/`, so the entry stub's boundary row governs it:
 * `src/render-scene/` and `src/data/` are read here as text, never imported.
 */

import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { codeOf, languageOf } from '../scripts/colour-literals.ts';
import { IDENTITY_LINE, SLOT_TEXT } from './shell/chrome-model.ts';
import { contrast, channels, linear } from './shell/contrast.ts';
import { DEPTH_LABELS } from './shell/index-model.ts';
import { EDITORIAL_RULE, FIELD_LABELS, RELEASE_LABEL, panelStyle } from './shell/panel-model.ts';
import { tokens } from './tokens/tokens.ts';

const SRC = fileURLToPath(new URL('.', import.meta.url));
const at = (path: string): string => fileURLToPath(new URL(path, import.meta.url));
/** A file as the mutations see it: LF line endings, whatever the checkout wrote. */
const read = (path: string): string => readFileSync(at(path), 'utf8').replace(/\r\n/g, '\n');

// --- Achromatic (UX-DR7, ruling 1b) -----------------------------------------------------------

/** The OKLCH chroma and hue of a `#rrggbb` colour (Björn Ottosson's OKLab). */
export function oklch(hex: string): { readonly chroma: number; readonly hue: number } {
  const [r, g, b] = channels(hex).map(linear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const hue = (Math.atan2(bb, a) * 180) / Math.PI;
  return { chroma: Math.hypot(a, bb), hue: hue < 0 ? hue + 360 : hue };
}

/** The achromatic threshold: OKLCH chroma below this reads as no hue (ruling 1b). */
const ACHROMATIC_CHROMA = 0.02;

function auditAchromatic(colors: Readonly<Record<string, string>>): string[] {
  const failures: string[] = [];
  const dark = Object.entries(colors).filter(([key]) => key.endsWith('-dark'));
  if (dark.length === 0) return ['achromatic: no -dark colour token to inspect'];
  for (const [key, value] of dark) {
    let chroma: number;
    try {
      ({ chroma } = oklch(value));
    } catch {
      failures.push(`achromatic: ${key} is ${value}, which is not a #rrggbb colour`);
      continue;
    }
    if (chroma >= ACHROMATIC_CHROMA) {
      failures.push(`achromatic: ${key} (${value}) carries a hue — OKLCH chroma ${chroma.toFixed(4)} ≥ ${ACHROMATIC_CHROMA}`);
    }
  }
  return failures;
}

test('achromatic: every -dark colour token has OKLCH chroma < 0.02', () => {
  assert.deepEqual(auditAchromatic(tokens.colors), []);
  assert.ok(Object.keys(tokens.colors).filter((key) => key.endsWith('-dark')).length >= 14, 'every surface, stroke and ink step is inspected');
});

/**
 * The cool cast as recorded (ruling 1b, Design Notes): every `-dark` token at
 * chroma ≤ 0.016, and every one with a perceptible lean (chroma > 0.004) leaning
 * the same way, within 20° of hue 286°. A token drifting toward the threshold, or
 * warming, is a second cast — not the deliberate neutral the record names.
 */
function auditCast(colors: Readonly<Record<string, string>>): string[] {
  const failures: string[] = [];
  for (const [key, value] of Object.entries(colors).filter(([name]) => name.endsWith('-dark'))) {
    const { chroma, hue } = oklch(value);
    if (chroma > 0.016) failures.push(`cast: ${key} (${value}) has chroma ${chroma.toFixed(4)} > 0.016 — beyond the recorded neutral`);
    else if (chroma > 0.004 && Math.abs(hue - 286) >= 20) failures.push(`cast: ${key} (${value}) leans to hue ${hue.toFixed(1)}° — the cast is one cool neutral, near 286°`);
  }
  return failures;
}

test('achromatic: the cool cast is a deliberate neutral — hue near 286°, chroma at most 0.016', () => {
  assert.deepEqual(auditCast(tokens.colors), []);
});

test('achromatic: a token drifting toward the threshold, or warming, fails the cast with its own line', () => {
  // #7F7F8B is OKLCH chroma ≈ 0.018 at hue 286°: achromatic by ruling 1b, yet past the recorded cast.
  const drifted = { ...tokens.colors, 'ink-label-dark': '#7F7F8B' };
  assert.deepEqual(auditAchromatic(drifted), [], 'the drift is still under the achromatic threshold');
  assert.match(auditCast(drifted).join('\n'), /^cast: ink-label-dark \(#7F7F8B\) has chroma 0\.01\d+ > 0\.016/);
  // #857F7A is chroma ≈ 0.010 at hue ≈ 60°: a warm grey beside cool ones.
  assert.match(auditCast({ ...tokens.colors, 'ink-label-dark': '#857F7A' }).join('\n'), /^cast: ink-label-dark \(#857F7A\) leans to hue \d+\.\d°/);
});

test('achromatic: a hue in any -dark token fails, naming it', () => {
  assert.deepEqual(oklch('#808080').chroma < 1e-6, true, 'a true grey has no chroma');
  const tinted = { ...tokens.colors, 'ink-label-dark': '#8A8AB4' };
  assert.match(auditAchromatic(tinted).join('\n'), /^achromatic: ink-label-dark \(#8A8AB4\) carries a hue/);
  assert.match(auditAchromatic({ ...tokens.colors, 'stroke-rest-dark': 'teal' }).join('\n'), /^achromatic: stroke-rest-dark is teal, which is not a #rrggbb/);
  assert.deepEqual(auditAchromatic({}), ['achromatic: no -dark colour token to inspect']);
});

// --- CSS, parsed just enough --------------------------------------------------------------------

/** One rule: its at-rule context (`''` at top level), its selector list, its declarations. */
interface CssRule {
  readonly at: string;
  readonly selector: string;
  readonly declarations: readonly string[];
}

const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** Every rule in a stylesheet, one level of at-rule nesting, comments blanked. */
function parseCss(source: string, at = ''): CssRule[] {
  const text = codeOf(source, 'css');
  const rules: CssRule[] = [];
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf('{', index);
    if (open < 0) break;
    const prelude = squash(text.slice(index, open));
    if (prelude.startsWith('@')) {
      let depth = 1;
      let close = open + 1;
      for (; close < text.length && depth > 0; close += 1) {
        if (text[close] === '{') depth += 1;
        else if (text[close] === '}') depth -= 1;
      }
      rules.push(...parseCss(text.slice(open + 1, close - 1), prelude));
      index = close;
      continue;
    }
    const close = text.indexOf('}', open);
    const body = text.slice(open + 1, close < 0 ? text.length : close);
    rules.push({
      at,
      selector: prelude.replace(/\s*,\s*/g, ', '),
      declarations: body
        .split(';')
        .map((declaration) => squash(declaration).replace(/\s*:\s*/, ': '))
        .filter((declaration) => declaration !== ''),
    });
    index = close < 0 ? text.length : close + 1;
  }
  return rules;
}

/**
 * A stylesheet against its exact ruled treatment: every expected rule present
 * with exactly its declarations, and no rule the treatment does not list. Each
 * difference is its own line, prefixed by `label`.
 */
function auditDeclarations(label: string, source: string, expected: readonly CssRule[]): string[] {
  const failures: string[] = [];
  const actual = parseCss(source);
  const key = (rule: CssRule): string => `${rule.at === '' ? '' : `${rule.at} `}${rule.selector}`;
  for (const rule of expected) {
    // Exactly once: a second rule with a listed selector would otherwise go
    // unread, and it is the later one the cascade applies.
    const matches = actual.filter((candidate) => key(candidate) === key(rule));
    const found = matches[0];
    if (found === undefined) {
      failures.push(`${label}: the rule \`${key(rule)}\` is missing`);
      continue;
    }
    if (matches.length > 1) {
      failures.push(`${label}: the rule \`${key(rule)}\` appears ${matches.length} times — one rule per selector`);
      continue;
    }
    for (const declaration of rule.declarations) {
      if (!found.declarations.includes(declaration)) failures.push(`${label}: \`${key(rule)}\` lacks \`${declaration}\``);
    }
    for (const declaration of found.declarations) {
      if (!rule.declarations.includes(declaration)) failures.push(`${label}: \`${key(rule)}\` carries the unlisted \`${declaration}\``);
    }
  }
  for (const rule of actual) {
    if (!expected.some((candidate) => key(candidate) === key(rule))) failures.push(`${label}: the unlisted rule \`${key(rule)}\``);
  }
  return failures;
}

/** The bans every identity stylesheet holds, each with its own line. */
function auditBans(label: string, source: string): string[] {
  const code = codeOf(source, 'css');
  const failures: string[] = [];
  if (/\btext-transform\s*:/.test(code)) failures.push(`${label}: text-transform — strings are set as authored`);
  if (/\bfont-weight\s*:(?!\s*var\()/.test(code)) failures.push(`${label}: a literal font-weight — weight is the token's, and never above 400`);
  if (/(?<![\w-])font\s*:/.test(code)) failures.push(`${label}: the font shorthand — it sets a weight of its own; the type role's properties are set one by one`);
  if (/\bdisplay\s*:\s*none\b/.test(code)) failures.push(`${label}: display: none — it removes the element from the accessibility tree`);
  if (/\bvisibility\s*:\s*(?:hidden|collapse)\b/.test(code)) failures.push(`${label}: visibility: hidden — it removes the element from the accessibility tree`);
  return failures;
}

// --- Contrast (UX-DR44) ----------------------------------------------------------------------------

/** Where a role's ink is read from: a CSS rule's `color`, or a model constant. */
type InkSource =
  | { readonly css: string; readonly selector: string }
  | { readonly model: string; readonly pattern: RegExp };

interface Role {
  readonly role: string;
  readonly floor: 7 | 4.5;
  readonly ink: InkSource;
  readonly ground: 'panel' | 'page';
}

const PANEL_CSS = 'shell/focus-panel.css';
const CHROME_CSS = 'shell/corner-chrome.css';
const INDEX_CSS = 'shell/index-nav.css';
const PAGE_CSS = 'shell/page.css';
const AFFORDANCE_TS = 'render-scene/affordance-model.ts';
const MOTE_TS = 'render-scene/mote-model.ts';

/** Each text role, its floor and its ground. The ink is read off the shipping source. */
const ROLES: readonly Role[] = [
  { role: 'Notable prose', floor: 7, ink: { css: PANEL_CSS, selector: '.panel-prose' }, ground: 'panel' },
  { role: 'Notable constraint sentence', floor: 7, ink: { css: PANEL_CSS, selector: '.panel-lift' }, ground: 'panel' },
  { role: 'panel title', floor: 7, ink: { css: PANEL_CSS, selector: '.panel-title' }, ground: 'panel' },
  { role: 'field values', floor: 7, ink: { css: PANEL_CSS, selector: '.panel-fields td' }, ground: 'panel' },
  { role: 'field labels', floor: 4.5, ink: { css: PANEL_CSS, selector: '.panel-fields th' }, ground: 'panel' },
  { role: 'panel kicker', floor: 4.5, ink: { css: PANEL_CSS, selector: '.panel-kicker' }, ground: 'panel' },
  { role: 'editorial rule', floor: 4.5, ink: { css: PANEL_CSS, selector: '.panel-rule' }, ground: 'panel' },
  { role: 'Skills', floor: 4.5, ink: { css: PANEL_CSS, selector: '.panel-skills' }, ground: 'panel' },
  { role: 'release', floor: 4.5, ink: { css: PANEL_CSS, selector: '.panel-release' }, ground: 'panel' },
  { role: 'release, raised', floor: 4.5, ink: { css: PANEL_CSS, selector: '.panel-release:hover, .panel-release:focus-visible' }, ground: 'panel' },
  { role: 'Mote label', floor: 4.5, ink: { model: MOTE_TS, pattern: /export const MOTE_LABEL_COLOR = tokens\.colors\['([\w-]+)'\];/ }, ground: 'page' },
  { role: 'chrome', floor: 4.5, ink: { css: CHROME_CSS, selector: '.chrome-identity, .chrome-slot' }, ground: 'page' },
  { role: 'chrome control, raised', floor: 4.5, ink: { css: CHROME_CSS, selector: '.chrome-slot-control:hover, .chrome-slot-control:focus-visible' }, ground: 'page' },
  {
    role: 'affordance title',
    floor: 4.5,
    ink: { model: AFFORDANCE_TS, pattern: /export function affordanceTitleLabelStyle\(\) \{\s*return \{[^}]*\bcolor: tokens\.colors\['([\w-]+)'\]/ },
    ground: 'page',
  },
  {
    role: 'affordance secondary line',
    floor: 4.5,
    ink: { model: AFFORDANCE_TS, pattern: /export function affordanceSecondaryLabelStyle\(\) \{\s*return \{[^}]*\bcolor: tokens\.colors\['([\w-]+)'\]/ },
    ground: 'page',
  },
  { role: 'index reveal', floor: 4.5, ink: { css: INDEX_CSS, selector: '.index-nav button' }, ground: 'page' },
  // The document's own text: the `<noscript>` line, inheriting `body`'s ink.
  { role: 'noscript line', floor: 4.5, ink: { css: PAGE_CSS, selector: 'body' }, ground: 'page' },
];

/** The token key a `var(--color-…)` value names, or undefined. */
const tokenOfVar = (value: string | undefined): string | undefined => /^var\(--color-([\w-]+)\)$/.exec(value ?? '')?.[1];

/**
 * The value `property` takes for `selector`, top level only: every top-level
 * rule whose selector list shares a member with `selector`'s and sets
 * `property` is counted. Exactly one may — a second, later rule is what the
 * cascade applies, so reading the first would measure the wrong ink.
 */
function declared(source: string, selector: string, property: string): { readonly value?: string; readonly rules: number } {
  const members = new Set(selector.split(', '));
  const values = parseCss(source)
    .filter((rule) => rule.at === '' && rule.selector.split(', ').some((member) => members.has(member)))
    .flatMap((rule) => rule.declarations.filter((line) => line.startsWith(`${property}: `)).slice(-1))
    .map((line) => line.slice(property.length + 2));
  const [only] = values;
  return values.length === 1 && only !== undefined ? { value: only, rules: 1 } : { rules: values.length };
}

/**
 * Every role measured against its ground. `sources` maps a path under `src/` to
 * its text, so a mutation is a changed map; the panel ground is `panelStyle`'s
 * own background, the page ground `page.css`'s.
 */
function auditContrast(sources: Readonly<Record<string, string>>, panelBackground: string): string[] {
  const failures: string[] = [];
  const colors = tokens.colors as Readonly<Record<string, string>>;
  const grounds = {
    panel: tokenOfVar(panelBackground),
    page: tokenOfVar(declared(sources[PAGE_CSS] ?? '', 'html, body', 'background').value),
  };
  for (const { role, floor, ink, ground } of ROLES) {
    const where = 'css' in ink ? `${ink.css} \`${ink.selector}\`` : ink.model;
    let inkKey: string | undefined;
    if ('css' in ink) {
      const { value, rules } = declared(sources[ink.css] ?? '', ink.selector, 'color');
      if (rules > 1) {
        failures.push(`contrast: ${role}'s ink is set by ${rules} top-level rules in ${ink.css} — one rule may set it`);
        continue;
      }
      inkKey = tokenOfVar(value);
    } else {
      inkKey = ink.pattern.exec(sources[ink.model] ?? '')?.[1];
    }
    const groundKey = grounds[ground];
    if (inkKey === undefined || colors[inkKey] === undefined) {
      failures.push(`contrast: ${role}'s ink could not be read off ${where} as a colour token`);
      continue;
    }
    if (groundKey === undefined || colors[groundKey] === undefined) {
      failures.push(`contrast: the ${ground} ground could not be read as a colour token`);
      continue;
    }
    const ratio = contrast(colors[inkKey] as string, colors[groundKey] as string);
    if (ratio < floor) failures.push(`contrast: ${role} is ${inkKey} on ${groundKey}, ${ratio.toFixed(2)}:1 — below its ${floor}:1 floor`);
  }
  return failures;
}

function contrastSources(): Record<string, string> {
  return Object.fromEntries([PANEL_CSS, CHROME_CSS, INDEX_CSS, PAGE_CSS, AFFORDANCE_TS, MOTE_TS].map((path) => [path, read(`./${path}`)]));
}

test('contrast: every text role clears its floor on its ground, read from the shipping source', () => {
  assert.equal(panelStyle(true).background, 'var(--color-surface-raised-dark)', 'the panel ground is surface-raised');
  assert.deepEqual(auditContrast(contrastSources(), panelStyle(true).background), []);
});

test('contrast: a role moved to a dimmer ink, or one whose ink cannot be read, fails with its own line', () => {
  const real = contrastSources();
  const failing = (path: string, edit: (source: string) => string): string => {
    const mutated = { ...real, [path]: edit(real[path] as string) };
    assert.notEqual(mutated[path], real[path], 'the mutation must apply');
    return auditContrast(mutated, panelStyle(true).background).join('\n');
  };
  // Notable prose at ink-label: about 5.7:1 on the raised ground, under 7.
  assert.match(
    failing(PANEL_CSS, (s) => s.replace(/(\.panel-prose \{[^}]*color: )var\(--color-ink-prose-dark\)/, '$1var(--color-ink-label-dark)')),
    /^contrast: Notable prose is ink-label-dark on surface-raised-dark, \d\.\d\d:1 — below its 7:1 floor$/,
  );
  // The chrome at the quiet step, the one the contrast floor rules out.
  assert.match(
    failing(CHROME_CSS, (s) => s.replace('color: var(--color-ink-label-dark);', 'color: var(--color-ink-quiet-dark);')),
    /^contrast: chrome is ink-quiet-dark on surface-base-dark/,
  );
  assert.match(
    failing(MOTE_TS, (s) => s.replace("MOTE_LABEL_COLOR = tokens.colors['ink-label-dark']", "MOTE_LABEL_COLOR = tokens.colors['ink-faint-dark']")),
    /^contrast: Mote label is ink-faint-dark/,
  );
  assert.match(
    failing(INDEX_CSS, (s) => s.replace(/(\.index-nav button \{[^}]*)color: var\(--color-ink-label-dark\);/, '$1')),
    /^contrast: index reveal's ink could not be read off shell\/index-nav\.css/,
  );
  // A second top-level rule setting the same selector's colour wins in the
  // cascade; measuring the first one would be measuring the wrong ink.
  assert.match(
    failing(PANEL_CSS, (s) => `${s}\n.panel-prose {\n  color: var(--color-ink-prose-dark);\n}\n`),
    /^contrast: Notable prose's ink is set by 2 top-level rules in shell\/focus-panel\.css — one rule may set it$/,
  );
  // The `<noscript>` line: a body with no ink is the browser's black on the void.
  assert.match(
    failing(PAGE_CSS, (s) => s.replace('  color: var(--color-ink-label-dark);\n', '')),
    /^contrast: noscript line's ink could not be read off shell\/page\.css `body`/,
  );
  assert.match(
    auditContrast(real, 'var(--color-stroke-active-dark)').join('\n'),
    /contrast: panel title is ink-lift-dark on stroke-active-dark/,
    'a lighter panel ground is measured too',
  );
});

// --- Copy (UX-DR45, ruling 3) ----------------------------------------------------------------------

/**
 * The closed allowlist of visible copy, verbatim — the structural labels ruled in
 * (3). Anything visible that is not here, or not data from `career.json`, fails.
 */
const VISIBLE_COPY: ReadonlySet<string> = new Set([
  'THOMAS NAVARRO · the model',
  'scroll ↓ — time runs backward',
  '↩ resume the journey',
  'esc — release',
  'Entries carry a written argument only where there was an argument to have.',
  'release',
  'Role',
  'Team',
  'Built',
  'Deep',
  'Shallow',
  // The static words of the affordance's secondary line,
  // `{role} · team of {team_size} · {Deep|Shallow}` (3.4), ruled a structural
  // label on 2026-10-11 (finding F4 in `identity-audit-3-9.md`).
  'team of',
  'overview',
  'Cosmos Portfolio',
  'This portfolio needs JavaScript.',
]);

/** Accessible names — announced, never drawn — listed separately. */
const ACCESSIBLE_NAMES: ReadonlySet<string> = new Set(['Destinations', 'Skills']);

/** The constants the renderers draw copy from; any other upper-case constant drawn as text fails. */
const COPY_CONSTANTS: ReadonlySet<string> = new Set(['IDENTITY_LINE', 'SLOT_TEXT', 'EDITORIAL_RULE', 'RELEASE_LABEL', 'FIELD_LABELS', 'DEPTH_LABELS']);

/**
 * The separators a template sets between data, and nothing else: whitespace and
 * the ` · ` of the ruled formats. A digit, a `?` or an emoji is drawn text, and
 * must be in the list like any other.
 */
const SEPARATOR_EDGES = /^[\s·]+|[\s·]+$/gu;

/** A visible piece of text, separators trimmed: nothing left, or in the allowlist. */
const isAllowed = (text: string): boolean => {
  const core = text.replace(SEPARATOR_EDGES, '');
  return core === '' || VISIBLE_COPY.has(core);
};

/** The static parts of a string or template literal's body. */
const staticParts = (body: string): string[] => body.split(/\$\{[^}]*\}/);

/**
 * Every shipped script, stylesheet and markup file under `src/`, as path → text.
 * "Shipped" is the colour gate's own classification (`languageOf` in
 * `scripts/colour-literals.ts`), so the two scans cannot disagree about what a
 * test is (`.test.mts`, `.spec.tsx`…); the generated tokens and dot-paths are
 * skipped as the gate skips them.
 */
function shippedFiles(): Record<string, string> {
  const found: Record<string, string> = {};
  for (const entry of readdirSync(SRC, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || languageOf(entry.name) === undefined) continue;
    const path = relative(SRC, join(entry.parentPath, entry.name)).split(sep).join('/');
    if (path.startsWith('tokens/') || path.split('/').some((part) => part.startsWith('.'))) continue;
    found[path] = readFileSync(join(entry.parentPath, entry.name), 'utf8').replace(/\r\n/g, '\n');
  }
  return found;
}

// --- JSX, read as JSX ----------------------------------------------------------------------------

/** What a JSX tree draws: a text run, a string literal in a child expression, or a constant drawn whole. */
interface Drawn {
  readonly kind: 'text' | 'literal' | 'constant';
  readonly text: string;
}

/** The index just past the string or template literal opening at `at`. */
function skipString(code: string, at: number): number {
  const quote = code[at];
  let index = at + 1;
  while (index < code.length) {
    const char = code[index];
    if (char === '\\') index += 2;
    else if (char === quote) return index + 1;
    else if (quote === '`' && char === '$' && code[index + 1] === '{') index = skipBraces(code, index + 1);
    else index += 1;
  }
  return index;
}

/** The index just past the balanced `{…}` opening at `at`, strings skipped whole. */
function skipBraces(code: string, at: number): number {
  let depth = 0;
  let index = at;
  while (index < code.length) {
    const char = code[index] as string;
    if (char === '"' || char === "'" || char === '`') {
      index = skipString(code, index);
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
    index += 1;
  }
  return index;
}

/** The last non-blank character before `at`, and the word it ends, for telling JSX from a comparison. */
function before(code: string, at: number): { readonly char: string; readonly word: string; readonly two: string } {
  let index = at - 1;
  while (index >= 0 && /\s/.test(code[index] as string)) index -= 1;
  const word = /[\w$]*$/.exec(code.slice(Math.max(0, index - 20), index + 1))?.[0] ?? '';
  return { char: code[index] ?? '', word, two: code.slice(Math.max(0, index - 1), index + 1) };
}

/** The first non-blank character from `at`. */
function after(code: string, at: number): string {
  let index = at;
  while (index < code.length && /\s/.test(code[index] as string)) index += 1;
  return code[index] ?? '';
}

/**
 * One JSX element opening at `at` (a `<`): its attributes skipped — the drawn
 * ones are audited separately — and its children read. Returns the index past
 * it, or -1 when what opened at `at` is not JSX after all.
 */
function scanElement(code: string, at: number, out: Drawn[]): number {
  const name = /^[A-Za-z][\w.:-]*/.exec(code.slice(at + 1, at + 101))?.[0] ?? '';
  let index = at + 1 + name.length;
  for (;;) {
    if (index >= code.length) return -1;
    const char = code[index] as string;
    if (char === '{') index = skipBraces(code, index);
    else if (char === '"' || char === "'") index = skipString(code, index);
    else if (char === '/' && code[index + 1] === '>') return index + 2;
    else if (char === '>') break;
    else if (char === '<' || char === ';') return -1;
    else index += 1;
  }
  index += 1;
  let textStart = index;
  while (index < code.length) {
    const char = code[index];
    if (char !== '<' && char !== '{') {
      index += 1;
      continue;
    }
    const text = squash(code.slice(textStart, index));
    if (text !== '') out.push({ kind: 'text', text });
    if (char === '{') index = scanExpression(code, index, out);
    else if (code[index + 1] === '/') {
      const close = code.indexOf('>', index);
      return close < 0 ? -1 : close + 1;
    } else {
      const end = scanElement(code, index, out);
      if (end < 0) return -1;
      index = end;
    }
    textStart = index;
  }
  return -1;
}

/**
 * A child expression container opening at `at` (a `{`). A constant drawn whole
 * (`{IDENTITY_LINE}`, `{SLOT_TEXT.x}`) is reported as one; a string literal in
 * a drawn position — after `{`, `?`, `:`, `&&`, `||`, `??` or a grouping `(` —
 * as a literal, unless it is a comparison operand (`slot.kind === 'control'`);
 * nested JSX is read as JSX. Returns the index past the closing `}`.
 */
function scanExpression(code: string, at: number, out: Drawn[]): number {
  const constant = /^\{\s*([A-Z][A-Z0-9_]+)\b/.exec(code.slice(at, at + 80));
  if (constant !== null) out.push({ kind: 'constant', text: constant[1] as string });
  let depth = 0;
  let index = at;
  while (index < code.length) {
    const char = code[index] as string;
    if (char === '"' || char === "'" || char === '`') {
      const end = skipString(code, index);
      const prior = before(code, index);
      const drawn =
        ['{', '?', ':'].includes(prior.char) ||
        ['&&', '||', '??'].includes(prior.two) ||
        (prior.char === '(' && !/[\w$]/.test(code[code.lastIndexOf('(', index) - 1] ?? ''));
      const comparison = /^[=!<>]/.test(after(code, end)) || /[=!<>]=?$/.test(prior.two.trim());
      if (drawn && !comparison) out.push({ kind: 'literal', text: code.slice(index + 1, end - 1) });
      index = end;
      continue;
    }
    if (char === '<' && /[A-Za-z>]/.test(code[index + 1] ?? '')) {
      const prior = before(code, index);
      if (['(', '?', ':', '{'].includes(prior.char) || ['&&', '||', '??', '=>'].includes(prior.two) || prior.word === 'return') {
        const end = scanElement(code, index, out);
        if (end > 0) {
          index = end;
          continue;
        }
      }
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
    index += 1;
  }
  return index;
}

/**
 * Everything a `.tsx` file's JSX draws. A JSX root is a `<` that opens an
 * element where only an expression can stand — after `(`, `return` or `=>` —
 * so `useRef<HTMLDivElement>(null)` and `Component<Props, State>` are type
 * arguments, not elements. Run over comment-blanked code.
 */
function jsxDrawn(code: string): Drawn[] {
  const out: Drawn[] = [];
  let index = 0;
  while (index < code.length) {
    const char = code[index] as string;
    if (char === '"' || char === "'" || char === '`') {
      index = skipString(code, index);
      continue;
    }
    if (char === '<' && /[A-Za-z>]/.test(code[index + 1] ?? '')) {
      const prior = before(code, index);
      if (prior.char === '(' || prior.word === 'return' || prior.two === '=>') {
        const end = scanElement(code, index, out);
        if (end > 0) {
          index = end;
          continue;
        }
      }
    }
    index += 1;
  }
  return out;
}

/** The visible text nodes of `index.html`: everything outside a tag, a comment, a script or a style. */
function htmlText(source: string): string[] {
  return codeOf(source, 'markup')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .split(/<[^>]*>/)
    .map(squash)
    .filter((text) => text !== '');
}

/**
 * Every visible literal, by where it is drawn, checked against the lists. Run
 * over comment-blanked code: a comment is prose for the next reader, not copy.
 *
 * - what a `.tsx` file's JSX draws, read as JSX (`jsxDrawn`): every text run
 *   between tags and expressions, every string literal in a drawn position
 *   inside a child expression (`{x ? 'a' : null}`), and every constant drawn
 *   whole — no punctuation heuristic decides what is text;
 * - generated `content:` strings in a shipped stylesheet;
 * - a drawn attribute (`title`, `alt`, `placeholder`, `aria-*` descriptions) —
 *   `aria-label` against the accessible names;
 * - a literal written into the DOM (`textContent`, `innerText`, `innerHTML`,
 *   `createTextNode`, `setAttribute` of a drawn attribute);
 * - a literal under a copy key in a model (`text:`, `label:`, `title:`,
 *   `secondary:`, `kicker:`, `caption:`, `tooltip:`, `heading:`), template
 *   fragments included;
 * - an upper-case constant drawn as a JSX child, which must be a copy constant;
 * - the text nodes of `index.html` and of any `.html`/`.svg` shipped under `src/`.
 */
function auditCopy(files: Readonly<Record<string, string>>, html: string): string[] {
  const failures: string[] = [];
  const flag = (where: string, text: string, what = 'visible text'): void => {
    failures.push(`copy: ${where} draws the ${what} ${JSON.stringify(text.trim())}, which is not in the closed allowlist`);
  };
  for (const [path, source] of Object.entries(files)) {
    const where = `src/${path}`;
    if (languageOf(path) === 'markup') {
      for (const text of htmlText(source)) if (!isAllowed(text)) flag(where, text);
      continue;
    }
    if (languageOf(path) === 'css') {
      // Generated content is drawn text, in a stylesheet as much as in markup.
      for (const [, , text] of codeOf(source, 'css').matchAll(/\bcontent\s*:\s*(['"])((?:(?!\1)[^\\\n])*)\1/g)) {
        if (!isAllowed(text as string)) flag(where, text as string, 'generated content');
      }
      continue;
    }
    const code = codeOf(source, 'script');
    if (path.endsWith('.tsx')) {
      for (const drawn of jsxDrawn(code)) {
        if (drawn.kind === 'constant') {
          if (!COPY_CONSTANTS.has(drawn.text)) failures.push(`copy: ${where} draws the constant ${drawn.text}, which is not one of the copy constants`);
        } else {
          for (const part of drawn.kind === 'literal' ? staticParts(drawn.text) : [drawn.text]) if (!isAllowed(part)) flag(where, part);
        }
      }
    }
    for (const [, attribute, , text] of code.matchAll(
      /\b(aria-label|aria-description|aria-roledescription|aria-valuetext|title|alt|placeholder)\s*=\s*\{?\s*(['"`])((?:(?!\2)[^\\\n])*)\2/g,
    )) {
      if (attribute === 'aria-label') {
        if (!ACCESSIBLE_NAMES.has(text as string)) failures.push(`copy: ${where} names something ${JSON.stringify(text)}, which is not in the accessible-names list`);
      } else if (!isAllowed(text as string)) flag(where, text as string, `${attribute}`);
    }
    for (const [, , text] of code.matchAll(
      /(?:\.(?:textContent|innerText|innerHTML|outerHTML)\s*=|createTextNode\s*\(|setAttribute\s*\(\s*['"](?:title|alt|aria-label|placeholder)['"]\s*,)\s*(['"`])((?:(?!\1)[^\\\n])*)\1/g,
    )) {
      for (const part of staticParts(text as string)) if (!isAllowed(part)) flag(where, part, 'DOM text');
    }
    for (const [, , , text] of code.matchAll(/\b(text|label|title|secondary|kicker|caption|tooltip|heading)\s*:\s*(['"`])((?:(?!\2)[^\\\n])*)\2/g)) {
      for (const part of staticParts(text as string)) if (!isAllowed(part)) flag(where, part, 'model copy');
    }
  }
  for (const text of htmlText(html)) if (!isAllowed(text)) flag('index.html', text);
  return failures;
}

/** Each copy constant's value, by name, against the closed allowlist. */
function auditCopyConstants(constants: Readonly<Record<string, string>>): string[] {
  return Object.entries(constants)
    .filter(([, value]) => !VISIBLE_COPY.has(value))
    .map(([name, value]) => `copy: the constant ${name} is ${JSON.stringify(value)}, which is not in the closed allowlist`);
}

function copyConstants(): Record<string, string> {
  const entries = (name: string, record: Readonly<Record<string, string>>) => Object.entries(record).map(([key, value]) => [`${name}.${key}`, value] as const);
  return Object.fromEntries([
    ['IDENTITY_LINE', IDENTITY_LINE],
    ['EDITORIAL_RULE', EDITORIAL_RULE],
    ['RELEASE_LABEL', RELEASE_LABEL],
    ...entries('SLOT_TEXT', SLOT_TEXT),
    ...entries('FIELD_LABELS', FIELD_LABELS),
    ...entries('DEPTH_LABELS', DEPTH_LABELS),
  ]);
}

test('copy: the copy constants are each in the closed allowlist', () => {
  const constants = copyConstants();
  assert.ok(Object.keys(constants).length >= 9, 'every copy constant is inspected');
  assert.deepEqual(auditCopyConstants(constants), []);
  assert.deepEqual(
    auditCopyConstants({ ...constants, RELEASE_LABEL: 'Close panel' }),
    ['copy: the constant RELEASE_LABEL is "Close panel", which is not in the closed allowlist'],
  );
  assert.deepEqual(htmlText(read('../index.html')), ['Cosmos Portfolio', 'This portfolio needs JavaScript.'], 'index.html draws its title and its noscript line, and nothing else');
});

test('copy: every visible literal shipped from src/ and index.html is in the closed allowlist', () => {
  const scripts = shippedFiles();
  assert.ok('shell/index-nav.tsx' in scripts && 'render-scene/affordance-model.ts' in scripts, 'the walk reaches the renderers and the models');
  assert.ok(!Object.keys(scripts).some((path) => path.endsWith('.test.ts')), 'tests are not shipped');
  // The JSX reader reaches what the renderers draw, or the scan is vacuous.
  const nav = jsxDrawn(codeOf(scripts['shell/index-nav.tsx'] as string, 'script'));
  assert.ok(nav.some((drawn) => drawn.kind === 'text' && drawn.text === 'overview'), 'the index’s overview text is read');
  const chrome = jsxDrawn(codeOf(scripts['shell/corner-chrome.tsx'] as string, 'script'));
  assert.ok(chrome.some((drawn) => drawn.kind === 'constant' && drawn.text === 'IDENTITY_LINE'), 'the chrome’s identity constant is read');
  // The panel draws only expressions, so nothing literal is found in it — and a
  // word planted in its deepest JSX (a `case` block's button) is.
  const planted = (scripts['shell/focus-panel.tsx'] as string).replace('{block.label}\n', 'Close {block.label}\n');
  assert.ok(
    jsxDrawn(codeOf(planted, 'script')).some((drawn) => drawn.kind === 'text' && drawn.text === 'Close'),
    'the panel’s JSX is read, down to the release button',
  );
  assert.ok('shell/focus-panel.css' in scripts, 'stylesheets are shipped files too');
  assert.deepEqual(auditCopy(scripts, read('../index.html')), []);
});

test('copy: a tooltip, a caption, help text or a narrated noscript fails with its own line', () => {
  const scripts = shippedFiles();
  const html = read('../index.html');
  const failing = (path: string, edit: (source: string) => string): string => {
    const mutated = { ...scripts, [path]: edit(scripts[path] as string) };
    assert.notEqual(mutated[path], scripts[path], 'the mutation must apply');
    return auditCopy(mutated, html).join('\n');
  };
  assert.match(
    failing('shell/index-nav.tsx', (s) => s.replace('<button type="button" id={OVERVIEW_ID}', '<button type="button" title="Back to the overview" id={OVERVIEW_ID}')),
    /^copy: src\/shell\/index-nav\.tsx draws the title "Back to the overview"/,
  );
  assert.match(
    failing('shell/index-nav.tsx', (s) => s.replace(/\n(\s*)overview\n/, '\n$1see everything\n')),
    /^copy: src\/shell\/index-nav\.tsx draws the visible text "see everything"/,
  );
  assert.match(
    failing('shell/corner-chrome.tsx', (s) => s.replace('<p className="chrome-identity">{IDENTITY_LINE}</p>', '<p className="chrome-identity">{IDENTITY_LINE}</p>\n      <p>{\'Use the arrow keys to move.\'}</p>')),
    /copy: src\/shell\/corner-chrome\.tsx draws the visible text "Use the arrow keys to move\."/,
  );
  assert.match(
    failing('shell/corner-chrome.tsx', (s) => s.replace('{IDENTITY_LINE}</p>', '{IDENTITY_LINE}</p>\n      <p>{HELP_TEXT}</p>')),
    /^copy: src\/shell\/corner-chrome\.tsx draws the constant HELP_TEXT/,
  );
  // A parenthetical caption: punctuation is no proof that text is code.
  assert.match(
    failing('shell/corner-chrome.tsx', (s) => s.replace('<p className="chrome-identity">{IDENTITY_LINE}</p>', '<p className="chrome-identity">{IDENTITY_LINE}</p>\n      <p>Scroll to travel (Tab opens the index)</p>')),
    /^copy: src\/shell\/corner-chrome\.tsx draws the visible text "Scroll to travel \(Tab opens the index\)"/,
  );
  // Text beside an expression, on either side.
  assert.match(
    failing('shell/corner-chrome.tsx', (s) => s.replace('<p className="chrome-identity">{IDENTITY_LINE}</p>', '<p className="chrome-identity">Hello {IDENTITY_LINE} and welcome</p>')),
    /^copy: src\/shell\/corner-chrome\.tsx draws the visible text "Hello",[^\n]*\ncopy: src\/shell\/corner-chrome\.tsx draws the visible text "and welcome",/,
  );
  // A literal inside an expression container, behind a ternary.
  assert.match(
    failing('shell/corner-chrome.tsx', (s) => s.replace('<p className="chrome-identity">{IDENTITY_LINE}</p>', "<p className=\"chrome-identity\">{IDENTITY_LINE}</p>\n      <p>{slot.kind === 'control' ? 'Press Escape to leave' : null}</p>")),
    /^copy: src\/shell\/corner-chrome\.tsx draws the visible text "Press Escape to leave", which is not in the closed allowlist$/,
  );
  // Generated content in a shipped stylesheet is drawn text too.
  assert.match(
    failing('shell/focus-panel.css', (s) => s.replace("content: '';", "content: 'Close';")),
    /^copy: src\/shell\/focus-panel\.css draws the generated content "Close"/,
  );
  assert.match(
    failing('shell/panel-model.ts', (s) => s.replace("{ kind: 'release', label: RELEASE_LABEL }", "{ kind: 'release', label: 'Close' }")),
    /^copy: src\/shell\/panel-model\.ts draws the model copy "Close"/,
  );
  assert.match(
    failing('render-scene/affordance-model.ts', (s) => s.replace('} · team of ${', '} · a team of ${')),
    /^copy: src\/render-scene\/affordance-model\.ts draws the model copy "· a team of"/,
  );
  // A digit, a `?` or an emoji is drawn text, not a separator.
  for (const drawn of ['?', '42', '✨']) {
    assert.match(
      failing('shell/corner-chrome.tsx', (s) => s.replace('<p className="chrome-identity">{IDENTITY_LINE}</p>', `<p className="chrome-identity">{IDENTITY_LINE}</p>\n      <p>${drawn}</p>`)),
      new RegExp(`^copy: src/shell/corner-chrome\\.tsx draws the visible text "${drawn.replace('?', '\\?')}"`),
    );
  }
  // Markup shipped under `src/` is read as markup.
  assert.match(
    auditCopy({ ...scripts, 'shell/mark.svg': '<svg><!-- a note --><title>Loading the cosmos</title></svg>\n' }, html).join('\n'),
    /^copy: src\/shell\/mark\.svg draws the visible text "Loading the cosmos"/,
  );
  assert.match(
    failing('render-scene/affordance-model.ts', (s) => s.replace('title.textContent = draw.title;', "title.textContent = 'Loading…';")),
    /^copy: src\/render-scene\/affordance-model\.ts draws the DOM text "Loading…"/,
  );
  assert.match(
    failing('shell/index-nav.tsx', (s) => s.replace('aria-label="Destinations"', 'aria-label="Site menu"')),
    /^copy: src\/shell\/index-nav\.tsx names something "Site menu", which is not in the accessible-names list/,
  );
  assert.match(
    auditCopy(scripts, html.replace('This portfolio needs JavaScript.', 'This portfolio is rendered client-side by React.')).join('\n'),
    /^copy: index\.html draws the visible text "This portfolio is rendered client-side by React\."/,
  );
});

// --- Voice (UX-DR46) ---------------------------------------------------------------------------------

/**
 * The work-in-progress, beta and apologetic register, case-insensitive. `apolog`
 * is a stem; each multi-word phrase matches spaced or hyphenated
 * (`work-in-progress`, `under-construction`, `coming-soon`), and `in progress`
 * stands on its own.
 */
const VOICE =
  /\b(?:work[\s-]+in[\s-]+progress|in[\s-]+progress|wip|beta|alpha|coming[\s-]+soon|under[\s-]+construction|sorry|apolog\w*|placeholder|lorem|todo|tbd|draft)\b/i;

/**
 * Every string and template literal, in one left-to-right pass so neither form
 * is read inside the other. A template may run across lines; a quoted string
 * may not.
 */
const LITERAL = /(['"])((?:(?!\1)[^\\\n]|\\.)*)\1|`((?:[^`\\]|\\.)*)`/g;

/** Every string in a JSON document, values and keys alike. */
function jsonStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(jsonStrings);
  if (value !== null && typeof value === 'object') return Object.entries(value).flatMap(([key, inner]) => [key, ...jsonStrings(inner)]);
  return [];
}

/**
 * The register scan over every string shipped: each string and template literal
 * (multi-line templates included) in the shipped scripts and stylesheets —
 * comments are not shipped — the JSX text runs, the whole of any shipped
 * `.html`/`.svg`, every string in `career.json`, and the whole of `index.html`.
 */
function auditVoice(files: Readonly<Record<string, string>>, career: string, html: string): string[] {
  const failures: string[] = [];
  const check = (where: string, text: string): void => {
    const hit = VOICE.exec(text);
    if (hit !== null) failures.push(`voice: ${where} says ${JSON.stringify(hit[0])} — ${JSON.stringify(text.trim().slice(0, 80))}`);
  };
  for (const [path, source] of Object.entries(files)) {
    const language = languageOf(path) ?? 'script';
    if (language === 'markup') {
      check(`src/${path}`, codeOf(source, 'markup'));
      continue;
    }
    const code = codeOf(source, language);
    for (const [, , quoted, template] of code.matchAll(LITERAL)) check(`src/${path}`, (quoted ?? template) as string);
    if (path.endsWith('.tsx')) for (const drawn of jsxDrawn(code)) if (drawn.kind === 'text') check(`src/${path}`, drawn.text);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(career);
  } catch {
    failures.push('voice: src/data/career.json is not JSON, so it could not be read');
  }
  for (const text of jsonStrings(parsed)) check('src/data/career.json', text);
  check('index.html', html);
  return failures;
}

test('voice: no work-in-progress, beta or apologetic word in shipped strings, career.json or index.html', () => {
  assert.deepEqual(auditVoice(shippedFiles(), read('./data/career.json'), read('../index.html')), []);
});

test('voice: a beta tag, an apology or a placeholder fails with its own line', () => {
  const scripts = shippedFiles();
  const career = read('./data/career.json');
  const html = read('../index.html');
  assert.match(
    auditVoice({ ...scripts, 'shell/chrome-model.ts': (scripts['shell/chrome-model.ts'] as string).replace("'THOMAS NAVARRO · the model'", "'THOMAS NAVARRO · the model (beta)'") }, career, html).join('\n'),
    /^voice: src\/shell\/chrome-model\.ts says "beta"/,
  );
  assert.match(auditVoice(scripts, career.replace(/"notable": "/, '"notable": "Sorry, this is still a draft. '), html).join('\n'), /^voice: src\/data\/career\.json says "Sorry"/);
  assert.match(auditVoice(scripts, career, html.replace('</title>', ' — Work in progress</title>')).join('\n'), /^voice: index\.html says "Work in progress"/);
  // The hyphenated forms, and a word on the second line of a template literal.
  assert.match(auditVoice(scripts, career, html.replace('</title>', ' (under-construction)</title>')).join('\n'), /^voice: index\.html says "under-construction"/);
  assert.match(
    auditVoice({ 'x.ts': 'export const banner = `the model\n— coming-soon`;\n' }, career, html).join('\n'),
    /^voice: src\/x\.ts says "coming-soon"/,
  );
  // A comment is prose for the next reader, not shipped copy.
  assert.deepEqual(auditVoice({ 'x.ts': '// TODO: none\nexport const a = 1;\n' }, career, html), []);
  // Markup shipped under `src/` is scanned, its comments aside.
  assert.match(auditVoice({ 'x.svg': '<svg><text>beta</text></svg>\n' }, career, html).join('\n'), /^voice: src\/x\.svg says "beta"/);
  assert.deepEqual(auditVoice({ 'x.svg': '<svg><!-- draft --></svg>\n' }, career, html), []);
});

// --- Bands (ruling 4b-i) -----------------------------------------------------------------------------

interface BandArtifact {
  readonly clients: readonly { readonly projects: readonly { readonly id: string; readonly luminanceBand: string }[] }[];
}

function auditBands(artifact: BandArtifact): string[] {
  const projects = artifact.clients.flatMap((client) => client.projects);
  if (projects.length === 0) return ['bands: the artifact holds no Body to inspect'];
  return projects
    .filter((project) => project.luminanceBand === 'stroke-dust')
    .map((project) => `bands: ${project.id} carries stroke-dust — the Rail's and the Dust's step, never a Body's`);
}

test('bands: no Body in generated/layout.generated.json carries stroke-dust', () => {
  const artifact = JSON.parse(read('../generated/layout.generated.json')) as BandArtifact;
  assert.deepEqual(auditBands(artifact), []);
  const mutated = structuredClone(artifact) as { clients: { projects: { id: string; luminanceBand: string }[] }[] };
  const first = mutated.clients[0]?.projects[0];
  assert.ok(first !== undefined);
  first.luminanceBand = 'stroke-dust';
  assert.deepEqual(auditBands(mutated), [`bands: ${first.id} carries stroke-dust — the Rail's and the Dust's step, never a Body's`]);
  assert.deepEqual(auditBands({ clients: [] }), ['bands: the artifact holds no Body to inspect']);
});

// --- The page (ruling 7a) -----------------------------------------------------------------------------

const PAGE_RULES: readonly CssRule[] = [
  { at: '', selector: 'html, body', declarations: ['margin: 0', 'overflow: hidden', 'background: var(--color-surface-base-dark)'] },
  // The document's own text — the `<noscript>` line, the one thing drawn with no
  // stylesheet of its own — in the chrome role's family, size and ink.
  {
    at: '',
    selector: 'body',
    declarations: ['color: var(--color-ink-label-dark)', 'font-family: var(--type-chrome-font-family)', 'font-size: var(--type-chrome-font-size)'],
  },
  { at: '', selector: '.scene-host', declarations: ['position: fixed', 'inset: 0'] },
];

/**
 * The full-viewport page: `page.css` exactly, imported once by `App.tsx`, the
 * host carrying its class beside the wheel listener's ref, and the scene's
 * wrapper and Canvas at `100%` by `100%`.
 */
function auditPage(files: { readonly css: string; readonly app: string; readonly host: string; readonly scene: string }): string[] {
  const failures = [...auditBans('page', files.css), ...auditDeclarations('page', files.css, PAGE_RULES)];
  const app = codeOf(files.app, 'script');
  if ((app.match(/^import\s+'\.\/shell\/page\.css'\s*;/gm) ?? []).length !== 1) failures.push('page: App.tsx does not import ./shell/page.css, once');
  const host = codeOf(files.host, 'script');
  if ((host.match(/<div ref=\{host\} className="scene-host">/g) ?? []).length !== 1) failures.push('page: the scene host is not the one <div ref={host} className="scene-host">');
  const scene = codeOf(files.scene, 'script');
  if (!/<div style=\{\{ position: 'relative', width: '100%', height: '100%' \}\}>\s*<Canvas\b/.test(scene)) failures.push('page: the scene wrapper is not 100% by 100%');
  if (!/<Canvas\b[^>]*?style=\{\{ width: '100%', height: '100%' \}\}/.test(scene)) failures.push('page: the Canvas is not 100% by 100%');
  if (/\d[dsl]?v(?:[hwib]|min|max)\b/.test(scene)) failures.push('page: the scene is sized in viewport units — the host is the viewport');
  return failures;
}

function pageFiles() {
  return { css: read(`./${PAGE_CSS}`), app: read('./App.tsx'), host: read('./shell/scene-host.tsx'), scene: read('./render-scene/scene.tsx') };
}

test('page: surface-base edge to edge, no page scroll, the scene host fixed and the canvas filling it', () => {
  assert.deepEqual(auditPage(pageFiles()), []);
});

test('page: each guarantee removed fails with its own line', () => {
  const real = pageFiles();
  const cases: readonly (readonly [keyof ReturnType<typeof pageFiles>, (source: string) => string, RegExp])[] = [
    ['css', (s) => s.replace('  margin: 0;\n', ''), /^page: `html, body` lacks `margin: 0`$/],
    ['css', (s) => s.replace('  overflow: hidden;\n', ''), /^page: `html, body` lacks `overflow: hidden`$/],
    ['css', (s) => s.replace('var(--color-surface-base-dark)', 'var(--color-surface-raised-dark)'), /`html, body` lacks `background: var\(--color-surface-base-dark\)`/],
    ['css', (s) => s.replace('position: fixed;', 'position: absolute;'), /`\.scene-host` lacks `position: fixed`/],
    ['css', (s) => s.replace('  inset: 0;\n', '  inset: 0;\n  z-index: 3;\n'), /^page: `\.scene-host` carries the unlisted `z-index: 3`$/],
    ['css', (s) => s.replace('  inset: 0;\n', '  inset: 0;\n  text-transform: uppercase;\n'), /^page: text-transform/],
    ['css', (s) => s.replace('  color: var(--color-ink-label-dark);\n', ''), /^page: `body` lacks `color: var\(--color-ink-label-dark\)`$/],
    // A later rule with a listed selector is checked too, not shadowed by the first.
    ['css', (s) => `${s}\n.scene-host {\n  position: static;\n}\n`, /^page: the rule `\.scene-host` appears 2 times — one rule per selector$/],
    ['app', (s) => s.replace("import './shell/page.css';\n", ''), /^page: App\.tsx does not import \.\/shell\/page\.css, once$/],
    ['host', (s) => s.replace('<div ref={host} className="scene-host">', '<div ref={host}>'), /^page: the scene host is not the one/],
    ['scene', (s) => s.replace("style={{ width: '100%', height: '100%' }}", "style={{ width: '100%', height: '70vh' }}"), /^page: the Canvas is not 100% by 100%/],
    // Every viewport unit, not only `vh`.
    ['scene', (s) => s.replace("<RailCamera rail={rail}", "<RailCamera data-h=\"100dvh\" rail={rail}"), /^page: the scene is sized in viewport units/],
    ['scene', (s) => s.replace("<RailCamera rail={rail}", "<RailCamera data-w=\"80vmin\" rail={rail}"), /^page: the scene is sized in viewport units/],
    ['scene', (s) => s.replace("<RailCamera rail={rail}", "<RailCamera data-w=\"100svi\" rail={rail}"), /^page: the scene is sized in viewport units/],
    ['scene', (s) => s.replace("<RailCamera rail={rail}", "<RailCamera data-h=\"100vb\" rail={rail}"), /^page: the scene is sized in viewport units/],
    ['scene', (s) => s.replace("<div style={{ position: 'relative', width: '100%', height: '100%' }}>", "<div style={{ position: 'relative' }}>"), /^page: the scene wrapper is not 100% by 100%$/],
  ];
  for (const [file, mutate, message] of cases) {
    const mutated = { ...real, [file]: mutate(real[file]) };
    assert.notEqual(mutated[file], real[file], `the mutation ${String(message)} must apply`);
    assert.match(auditPage(mutated).join('\n'), message);
  }
});

// --- The index (ruling 8a) -----------------------------------------------------------------------------

const INDEX_TYPE = [
  'font-family: var(--type-chrome-font-family)',
  'font-size: var(--type-chrome-font-size)',
  'font-weight: var(--type-chrome-font-weight)',
  'line-height: var(--type-chrome-line-height)',
  'letter-spacing: var(--type-chrome-letter-spacing)',
  'color: var(--color-ink-label-dark)',
];

const INDEX_RULES: readonly CssRule[] = [
  { at: '', selector: '.index-nav ul', declarations: ['margin: 0', 'padding: 0', 'list-style: none'] },
  {
    at: '',
    selector: '.index-nav button',
    declarations: [
      'position: fixed',
      'left: var(--space-xl)',
      'bottom: var(--space-xl)',
      'z-index: 1',
      'margin: 0',
      'padding: 0',
      'background: none',
      'border: 0',
      'white-space: nowrap',
      'clip-path: inset(50%)',
      ...INDEX_TYPE,
    ],
  },
  { at: '', selector: '.index-nav button:focus-visible', declarations: ['clip-path: none', 'outline: none'] },
  { at: '@media (forced-colors: active)', selector: '.index-nav button:focus-visible', declarations: ['outline: 1px solid CanvasText'] },
];

/**
 * The index: a real `<nav>` from First Paint, hidden by the clip pattern and
 * revealed only under `:focus-visible` — `index-nav.css` exactly, imported once
 * by `index-nav.tsx`, whose `<nav>` carries the class and none of the attributes
 * that would take it out of the tree or the tab order.
 */
function auditIndex(css: string, tsx: string): string[] {
  const failures = [...auditBans('index', css), ...auditDeclarations('index', css, INDEX_RULES)];
  const code = codeOf(tsx, 'script');
  if ((code.match(/^import\s+'\.\/index-nav\.css'\s*;/gm) ?? []).length !== 1) failures.push('index: index-nav.tsx does not import ./index-nav.css, once');
  if (!/<nav className="index-nav" aria-label="Destinations"(?=[\s>])/.test(code)) failures.push('index: the <nav> does not carry the index-nav class beside its landmark name');
  if (/\baria-hidden\b|\shidden(?=[\s>=/])|\binert\b|tabIndex/.test(code)) failures.push('index: the index is taken out of the tree or the tab order (aria-hidden, hidden, inert or tabIndex)');
  if (/\bstyle=\{/.test(code)) failures.push('index: an inline style — the treatment is the stylesheet\'s');
  return failures;
}

test('index: in the tree and the tab order, clipped from sight, one entry revealed under :focus-visible', () => {
  assert.deepEqual(auditIndex(read(`./${INDEX_CSS}`), read('./shell/index-nav.tsx')), []);
});

test('index: each guarantee removed fails with its own line', () => {
  const css = read(`./${INDEX_CSS}`);
  const tsx = read('./shell/index-nav.tsx');
  const cssCases: readonly (readonly [(source: string) => string, RegExp])[] = [
    [(s) => s.replace('  clip-path: inset(50%);\n', '  display: none;\n'), /^index: display: none/],
    [(s) => s.replace('  clip-path: inset(50%);\n', '  visibility: hidden;\n'), /^index: visibility: hidden/],
    [(s) => s.replace('.index-nav button:focus-visible {\n  clip-path', '.index-nav button:focus {\n  clip-path'), /^index: the rule `\.index-nav button:focus-visible` is missing/],
    [(s) => s.replace('  clip-path: none;\n', ''), /^index: `\.index-nav button:focus-visible` lacks `clip-path: none`$/],
    [(s) => s.replace('  left: var(--space-xl);\n', '  right: var(--space-xl);\n'), /`\.index-nav button` lacks `left: var\(--space-xl\)`/],
    [(s) => s.replace('  border: 0;\n', '  border: 0;\n  text-transform: lowercase;\n'), /^index: text-transform/],
    [(s) => s.replace('font-weight: var(--type-chrome-font-weight)', 'font-weight: 500'), /^index: a literal font-weight/],
    [(s) => s.replace('  white-space: nowrap;\n', '  white-space: nowrap;\n  font: 700 1rem serif;\n'), /^index: the font shorthand/],
    [(s) => s.replace('  clip-path: inset(50%);\n', '  visibility: collapse;\n'), /^index: visibility: hidden/],
    [(s) => s.replace('  background: none;\n', '  background: var(--color-surface-raised-dark);\n'), /`\.index-nav button` lacks `background: none`/],
    [(s) => s.replace('    outline: 1px solid CanvasText;\n', ''), /`@media \(forced-colors: active\) \.index-nav button:focus-visible` lacks `outline: 1px solid CanvasText`/],
    // A second `.index-nav button` that unclips every entry at rest.
    [(s) => `${s}\n.index-nav button {\n  clip-path: none;\n}\n`, /^index: the rule `\.index-nav button` appears 2 times — one rule per selector$/],
  ];
  for (const [mutate, message] of cssCases) {
    const mutated = mutate(css);
    assert.notEqual(mutated, css, `the mutation ${String(message)} must apply`);
    assert.match(auditIndex(mutated, tsx).join('\n'), message);
  }
  const tsxCases: readonly (readonly [(source: string) => string, RegExp])[] = [
    [(s) => s.replace("import './index-nav.css';\n", ''), /^index: index-nav\.tsx does not import \.\/index-nav\.css, once$/],
    [(s) => s.replace('<nav className="index-nav" aria-label="Destinations">', '<nav aria-label="Destinations">'), /^index: the <nav> does not carry the index-nav class/],
    [(s) => s.replace('<nav className="index-nav" aria-label="Destinations">', '<nav className="index-nav" aria-label="Destinations" aria-hidden="true">'), /^index: the index is taken out of the tree/],
    [(s) => s.replace('<button type="button" id={OVERVIEW_ID}', '<button type="button" tabIndex={-1} id={OVERVIEW_ID}'), /^index: the index is taken out of the tree/],
    [(s) => s.replace('<nav className="index-nav" aria-label="Destinations">', '<nav className="index-nav" aria-label="Destinations" hidden>'), /^index: the index is taken out of the tree/],
  ];
  for (const [mutate, message] of tsxCases) {
    const mutated = mutate(tsx);
    assert.notEqual(mutated, tsx, `the mutation ${String(message)} must apply`);
    assert.match(auditIndex(css, mutated).join('\n'), message);
  }
});
