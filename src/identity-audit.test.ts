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
 * - **Chart** — the flat star chart's stylesheet (4.3), as an exact declaration
 *   set, its two `display: none` admitted only on the plates, by width.
 *
 * This file sits directly in `src/`, so the root-file boundary row governs it:
 * `src/render-scene/`, `src/render-fallback/` and `src/data/` are read here as
 * text, never imported.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { basename, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { codeOf, languageOf } from '../scripts/colour-literals.ts';
import { filesUnder } from '../scripts/source-scan.ts';
import { IDENTITY_LINE, IDENTITY_MODEL, IDENTITY_NAME, SLOT_TEXT } from './shell/chrome-model.ts';
import { contrast, channels, linear } from './shell/contrast.ts';
import { DEPTH_LABELS } from './shell/index-model.ts';
import { EDITORIAL_RULE, FIELD_LABELS, RELEASE_LABEL, panelStyle } from './shell/panel-model.ts';
import { CHART_LINK_TEXT, SCENE_LINK_TEXT } from './shell/route-link.ts';
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

/**
 * Where a role's ink is read from: a CSS rule's `color` — or its `fill`, for
 * SVG text (4.3) — or a model constant.
 */
type InkSource =
  | { readonly css: string; readonly selector: string; readonly property?: 'fill' }
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
const CHART_CSS = 'render-fallback/chart.css';
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
  // The scene's link to the chart (4.5) takes the line's ink at rest (`inherit`,
  // measured as `chrome` above) and the raised ink on hover and focus.
  { role: 'chrome chart link, raised', floor: 4.5, ink: { css: CHROME_CSS, selector: '.chrome-route:hover, .chrome-route:focus-visible' }, ground: 'page' },
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
  // The flat star chart (4.3), on the page ground; its records take the panel's
  // classes on the panel's ground, measured above. The plate's labels are SVG
  // text, so their ink is the rule's `fill`.
  { role: 'chart heading', floor: 4.5, ink: { css: CHART_CSS, selector: '.chart-heading' }, ground: 'page' },
  // The chart's chrome links (4.5): `the model` and `the scene`.
  { role: 'chart chrome links', floor: 4.5, ink: { css: CHART_CSS, selector: '.chart-chrome a' }, ground: 'page' },
  { role: 'chart chrome links, raised', floor: 4.5, ink: { css: CHART_CSS, selector: '.chart-chrome a:hover, .chart-chrome a:focus-visible' }, ground: 'page' },
  { role: 'chart Client heading', floor: 4.5, ink: { css: CHART_CSS, selector: '.chart-client' }, ground: 'page' },
  { role: 'index headers', floor: 4.5, ink: { css: CHART_CSS, selector: '.chart-index th' }, ground: 'page' },
  { role: 'chart legend', floor: 4.5, ink: { css: CHART_CSS, selector: '.chart-legend' }, ground: 'page' },
  { role: 'index cells', floor: 7, ink: { css: CHART_CSS, selector: '.chart-index td' }, ground: 'page' },
  { role: 'index links', floor: 7, ink: { css: CHART_CSS, selector: '.chart-index a' }, ground: 'page' },
  { role: 'index links, raised', floor: 7, ink: { css: CHART_CSS, selector: '.chart-index a:hover, .chart-index a:focus-visible' }, ground: 'page' },
  { role: 'plate Client label', floor: 4.5, ink: { css: CHART_CSS, selector: '.chart-label-client', property: 'fill' }, ground: 'page' },
  { role: 'plate Project label', floor: 4.5, ink: { css: CHART_CSS, selector: '.chart-label-project', property: 'fill' }, ground: 'page' },
  // A Client's date span on the plate (4.5).
  { role: 'plate span label', floor: 4.5, ink: { css: CHART_CSS, selector: '.chart-label-span', property: 'fill' }, ground: 'page' },
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
      const { value, rules } = declared(sources[ink.css] ?? '', ink.selector, ink.property ?? 'color');
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
  return Object.fromEntries([PANEL_CSS, CHROME_CSS, INDEX_CSS, PAGE_CSS, CHART_CSS, AFFORDANCE_TS, MOTE_TS].map((path) => [path, read(`./${path}`)]));
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
  // The plate's SVG labels are read off `fill`: a dimmer fill fails, and a
  // `color` in its place is not what the text is drawn in.
  assert.match(
    failing(CHART_CSS, (s) => s.replace(/(\.chart-label-project \{[^}]*fill: )var\(--color-ink-prose-dark\)/, '$1var(--color-ink-faint-dark)')),
    /^contrast: plate Project label is ink-faint-dark on surface-base-dark, \d\.\d\d:1 — below its 4\.5:1 floor$/,
  );
  assert.match(
    failing(CHART_CSS, (s) => s.replace(/(\.chart-label-client \{[^}]*)fill: var\(--color-ink-lift-dark\);/, '$1color: var(--color-ink-lift-dark);')),
    /^contrast: plate Client label's ink could not be read off render-fallback\/chart\.css `\.chart-label-client`/,
  );
  assert.match(
    failing(CHART_CSS, (s) => s.replace(/(\.chart-index td \{[^}]*color: )var\(--color-ink-prose-dark\)/, '$1var(--color-ink-label-dark)')),
    /^contrast: index cells is ink-label-dark on surface-base-dark, \d\.\d\d:1 — below its 7:1 floor$/,
  );
  // 4.5: the span label and the chrome links at the quiet step.
  assert.match(
    failing(CHART_CSS, (s) => s.replace(/(\.chart-label-span \{[^}]*fill: )var\(--color-ink-label-dark\)/, '$1var(--color-ink-quiet-dark)')),
    /^contrast: plate span label is ink-quiet-dark on surface-base-dark/,
  );
  assert.match(
    failing(CHART_CSS, (s) => s.replace(/(\.chart-chrome a \{\n  color: )var\(--color-ink-label-dark\)/, '$1var(--color-ink-faint-dark)')),
    /^contrast: chart chrome links is ink-faint-dark on surface-base-dark/,
  );
  assert.match(
    failing(CHROME_CSS, (s) => s.replace(/(\.chrome-route:focus-visible \{\n  color: )var\(--color-ink-prose-dark\)/, '$1var(--color-ink-faint-dark)')),
    /^contrast: chrome chart link, raised is ink-faint-dark on surface-base-dark/,
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
  // The identity line's name, drawn alone in the chart's heading beside its
  // `the model` link (4.5).
  'THOMAS NAVARRO',
  // The links between surfaces (4.5): the scene's to the chart, the chart's to
  // the scene. Each surface named as a surface, never a fallback or a version.
  'the chart',
  'the scene',
  // The Colophon's one `<h1>` (4.2), minimal until 5.1 fills the surface in.
  'the model',
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
  // The flat star chart's index headers (4.3); its Role header is `Role` above.
  'Client',
  'Project',
  'Dates',
  // The Deep/Shallow signal on the chart (4.4): the index's first header and
  // the legend's two phrases, a glyph beside each — no sentence beyond them.
  'Notable',
  'Carries a notable',
  'Does not',
  // The date separator on the chart (4.3): `start – end`, drawn between two
  // data elements. Admitted as copy alone, so a word with a dash at its edge is
  // still that word plus a dash, and fails.
  '–',
  'Cosmos Portfolio',
  'This portfolio needs JavaScript.',
]);

/** Accessible names — announced, never drawn — listed separately. */
const ACCESSIBLE_NAMES: ReadonlySet<string> = new Set([
  'Destinations',
  'Skills',
  // The chart's Notable glyph on a Shallow row (4.4); its Deep name is the
  // visible `Carries a notable`, the legend's phrase.
  'No notable',
]);

/** The constants the renderers draw copy from; any other upper-case constant drawn as text fails. */
const COPY_CONSTANTS: ReadonlySet<string> = new Set(['IDENTITY_LINE', 'IDENTITY_NAME', 'IDENTITY_MODEL', 'CHART_LINK_TEXT', 'SCENE_LINK_TEXT', 'SLOT_TEXT', 'EDITORIAL_RULE', 'RELEASE_LABEL', 'FIELD_LABELS', 'DEPTH_LABELS', 'CHART_LABELS']);

/**
 * The separators a template sets between data, and nothing else: whitespace
 * and the ` · ` of the ruled formats. A digit, a `?`, an emoji or the chart's
 * en dash is drawn text, and must be in the list like any other.
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
 * test is (`.test.mts`, `.spec.tsx`…), and the walk is the gate's own
 * (`scripts/source-scan.ts`): dot-files read, dot-directories and `node_modules`
 * skipped. The generated tokens are skipped as the gate skips them.
 */
function shippedFiles(): Record<string, string> {
  const found: Record<string, string> = {};
  for (const file of filesUnder(SRC)) {
    if (languageOf(basename(file)) === undefined) continue;
    const path = relative(SRC, file).split(sep).join('/');
    if (path.startsWith('tokens/')) continue;
    found[path] = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
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

/** The one copy constant announced and never drawn (4.4): the Notable glyph's name on a Shallow row. */
const ANNOUNCED_CONSTANTS: ReadonlySet<string> = new Set(['CHART_LABELS.none']);

/**
 * Each copy constant's value, by name, against the closed allowlist. Only an
 * announced constant (`ANNOUNCED_CONSTANTS`) may instead be an accessible name;
 * every other constant is drawn, so it must be visible copy.
 */
function auditCopyConstants(constants: Readonly<Record<string, string>>): string[] {
  const allowed = (name: string, value: string): boolean => VISIBLE_COPY.has(value) || (ANNOUNCED_CONSTANTS.has(name) && ACCESSIBLE_NAMES.has(value));
  return Object.entries(constants)
    .filter(([name, value]) => !allowed(name, value))
    .map(([name, value]) => `copy: the constant ${name} is ${JSON.stringify(value)}, which is not in the closed allowlist`);
}

/**
 * The chart's copy constant (4.3), read off `render-fallback/chart-model.ts` as
 * text: the root-file row permits `src/render-fallback/` only dynamically. Every
 * `key: 'value'` pair of the one-line object literal; none found reads as empty,
 * which fails the count below.
 */
function chartLabels(): Record<string, string> {
  const literal = /export const CHART_LABELS = \{([^}]*)\} as const;/.exec(codeOf(read('./render-fallback/chart-model.ts'), 'script'))?.[1] ?? '';
  return Object.fromEntries([...literal.matchAll(/(\w+):\s*'([^']*)'/g)].map(([, key, value]) => [key as string, value as string]));
}

function copyConstants(): Record<string, string> {
  const entries = (name: string, record: Readonly<Record<string, string>>) => Object.entries(record).map(([key, value]) => [`${name}.${key}`, value] as const);
  return Object.fromEntries([
    ['IDENTITY_LINE', IDENTITY_LINE],
    ['IDENTITY_NAME', IDENTITY_NAME],
    ['IDENTITY_MODEL', IDENTITY_MODEL],
    ['CHART_LINK_TEXT', CHART_LINK_TEXT],
    ['SCENE_LINK_TEXT', SCENE_LINK_TEXT],
    ['EDITORIAL_RULE', EDITORIAL_RULE],
    ['RELEASE_LABEL', RELEASE_LABEL],
    ...entries('SLOT_TEXT', SLOT_TEXT),
    ...entries('FIELD_LABELS', FIELD_LABELS),
    ...entries('DEPTH_LABELS', DEPTH_LABELS),
    ...entries('CHART_LABELS', chartLabels()),
  ]);
}

test('copy: the copy constants are each in the closed allowlist', () => {
  const constants = copyConstants();
  assert.ok(Object.keys(constants).length >= 16, 'every copy constant is inspected');
  // 4.5: a link named as a downgrade is not in the allowlist.
  for (const [name, value] of [['CHART_LINK_TEXT', 'the fallback'], ['SCENE_LINK_TEXT', 'the 3D version'], ['CHART_LINK_TEXT', 'list view']] as const) {
    assert.deepEqual(auditCopyConstants({ ...constants, [name]: value }), [`copy: the constant ${name} is ${JSON.stringify(value)}, which is not in the closed allowlist`]);
  }
  assert.deepEqual(Object.keys(chartLabels()), ['notable', 'client', 'project', 'dates', 'carries', 'doesNot', 'none'], 'the chart’s labels are read off its model');
  assert.equal(chartLabels().none, 'No notable', 'the Shallow glyph’s name is read off the model');
  assert.deepEqual(auditCopyConstants(constants), []);
  assert.deepEqual(
    auditCopyConstants({ ...constants, RELEASE_LABEL: 'Close panel' }),
    ['copy: the constant RELEASE_LABEL is "Close panel", which is not in the closed allowlist'],
  );
  // An accessible name is admitted for the chart's labels alone; a sentence explaining the Ring is in neither set.
  assert.deepEqual(
    auditCopyConstants({ ...constants, RELEASE_LABEL: 'No notable' }),
    ['copy: the constant RELEASE_LABEL is "No notable", which is not in the closed allowlist'],
  );
  // A drawn chart label set to an accessible-only name is not admitted: only CHART_LABELS.none is announced, never drawn.
  for (const [name, value] of [['CHART_LABELS.client', 'Skills'], ['CHART_LABELS.notable', 'No notable'], ['CHART_LABELS.doesNot', 'Destinations']] as const) {
    assert.deepEqual(auditCopyConstants({ ...constants, [name]: value }), [`copy: the constant ${name} is ${JSON.stringify(value)}, which is not in the closed allowlist`]);
  }
  assert.deepEqual(
    auditCopyConstants({ ...constants, 'CHART_LABELS.carries': 'A ring means it opens' }),
    ['copy: the constant CHART_LABELS.carries is "A ring means it opens", which is not in the closed allowlist'],
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
  assert.ok(chrome.some((drawn) => drawn.kind === 'constant' && drawn.text === 'CHART_LINK_TEXT'), 'the chrome’s link to the chart is read');
  // The panel draws only expressions, so nothing literal is found in it — and a
  // word planted in its deepest JSX (a `case` block's button) is.
  const planted = (scripts['shell/focus-panel.tsx'] as string).replace('{block.label}\n', 'Close {block.label}\n');
  assert.ok(
    jsxDrawn(codeOf(planted, 'script')).some((drawn) => drawn.kind === 'text' && drawn.text === 'Close'),
    'the panel’s JSX is read, down to the release button',
  );
  assert.ok('shell/focus-panel.css' in scripts, 'stylesheets are shipped files too');
  // The chart (4.3) draws its headers and identity line as constants, and its
  // date separator as a text run, `–`, admitted as copy.
  const chart = jsxDrawn(codeOf(scripts['render-fallback/chart.tsx'] as string, 'script'));
  assert.ok(chart.some((drawn) => drawn.kind === 'constant' && drawn.text === 'CHART_LABELS'), 'the chart’s headers are read');
  assert.ok(chart.some((drawn) => drawn.kind === 'constant' && drawn.text === 'IDENTITY_NAME'), 'the chart’s <h1> is read');
  assert.ok(chart.some((drawn) => drawn.kind === 'text' && drawn.text === '–'), 'the date separator is read');
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
  /** Markup added after the chrome's identity line (4.5: the line ends on the chart link). */
  const afterIdentity = (s: string, markup: string): string => s.replace('{CHART_LINK_TEXT}</a>\n      </p>', `{CHART_LINK_TEXT}</a>\n      </p>\n      ${markup}`);
  assert.match(
    failing('shell/index-nav.tsx', (s) => s.replace('<button type="button" id={OVERVIEW_ID}', '<button type="button" title="Back to the overview" id={OVERVIEW_ID}')),
    /^copy: src\/shell\/index-nav\.tsx draws the title "Back to the overview"/,
  );
  assert.match(
    failing('shell/index-nav.tsx', (s) => s.replace(/\n(\s*)overview\n/, '\n$1see everything\n')),
    /^copy: src\/shell\/index-nav\.tsx draws the visible text "see everything"/,
  );
  assert.match(
    failing('shell/corner-chrome.tsx', (s) => afterIdentity(s, '<p>{\'Use the arrow keys to move.\'}</p>')),
    /copy: src\/shell\/corner-chrome\.tsx draws the visible text "Use the arrow keys to move\."/,
  );
  assert.match(
    failing('shell/corner-chrome.tsx', (s) => s.replace('{CHART_LINK_TEXT}</a>\n      </p>', '{CHART_LINK_TEXT}</a>\n      </p>\n      <p>{HELP_TEXT}</p>')),
    /^copy: src\/shell\/corner-chrome\.tsx draws the constant HELP_TEXT/,
  );
  // A parenthetical caption: punctuation is no proof that text is code.
  assert.match(
    failing('shell/corner-chrome.tsx', (s) => afterIdentity(s, '<p>Scroll to travel (Tab opens the index)</p>')),
    /^copy: src\/shell\/corner-chrome\.tsx draws the visible text "Scroll to travel \(Tab opens the index\)"/,
  );
  // Text beside an expression, on either side.
  assert.match(
    failing('shell/corner-chrome.tsx', (s) => afterIdentity(s, '<p className="chrome-identity">Hello {IDENTITY_LINE} and welcome</p>')),
    /^copy: src\/shell\/corner-chrome\.tsx draws the visible text "Hello",[^\n]*\ncopy: src\/shell\/corner-chrome\.tsx draws the visible text "and welcome",/,
  );
  // A literal inside an expression container, behind a ternary.
  assert.match(
    failing('shell/corner-chrome.tsx', (s) => afterIdentity(s, "<p>{slot.kind === 'control' ? 'Press Escape to leave' : null}</p>")),
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
      failing('shell/corner-chrome.tsx', (s) => afterIdentity(s, `<p>${drawn}</p>`)),
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
  // The en dash is admitted as the chart's date separator, a copy entry of its
  // own, never as a separator edge: an allowlisted word with a dash at either
  // side is not that word, and fails in any shipped renderer.
  assert.match(
    failing('render-fallback/chart.tsx', (s) => s.replace('<ul className="panel-skills" aria-label="Skills">', '<ul className="panel-skills" aria-label="Skills">\n          <li>– Role</li>')),
    /^copy: src\/render-fallback\/chart\.tsx draws the visible text "– Role"/,
  );
  assert.match(
    failing('shell/corner-chrome.tsx', (s) => afterIdentity(s, '<p>Built –</p>')),
    /^copy: src\/shell\/corner-chrome\.tsx draws the visible text "Built –"/,
  );
  // 4.5: a link named as a downgrade, or apologising, in either renderer.
  assert.match(
    failing('shell/corner-chrome.tsx', (s) => s.replace('>{CHART_LINK_TEXT}</a>', '>{CHART_LINK_TEXT} (lite version)</a>')),
    /^copy: src\/shell\/corner-chrome\.tsx draws the visible text "\(lite version\)"/,
  );
  assert.match(
    failing('render-fallback/chart.tsx', (s) => s.replace('<p className="chart-routes">', '<p className="chart-routes">\n          Switch to 3D')),
    /^copy: src\/render-fallback\/chart\.tsx draws the visible text "Switch to 3D"/,
  );
  assert.match(
    failing('render-fallback/chart.tsx', (s) => s.replace('{links.model.text}</a>', '{links.model.text}</a> {FALLBACK_NOTE}')),
    /^copy: src\/render-fallback\/chart\.tsx draws the constant FALLBACK_NOTE/,
  );
  // The chart: an apology beside the plate, a caption over the index, a header constant of its own.
  assert.match(
    failing('render-fallback/chart.tsx', (s) => s.replace('<div className="chart-chrome">', '<p>Best viewed on desktop</p>\n      <div className="chart-chrome">')),
    /^copy: src\/render-fallback\/chart\.tsx draws the visible text "Best viewed on desktop"/,
  );
  assert.match(
    failing('render-fallback/chart.tsx', (s) => s.replace('<table className="chart-index">', '<table className="chart-index">\n        <caption>The fallback index</caption>')),
    /^copy: src\/render-fallback\/chart\.tsx draws the visible text "The fallback index"/,
  );
  assert.match(
    failing('render-fallback/chart.tsx', (s) => s.replace('{CHART_LABELS.dates}</th>\n          </tr>', '{CHART_LABELS.dates}</th>\n            <th scope="col">{NOTABLE_HEADER}</th>\n          </tr>')),
    /^copy: src\/render-fallback\/chart\.tsx draws the constant NOTABLE_HEADER/,
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
  { at: '', selector: 'html, body', declarations: ['margin: 0', 'background: var(--color-surface-base-dark)'] },
  // 4.3: only the scene's page is locked; the chart and the Colophon scroll natively.
  { at: '', selector: 'html:has(.scene-host), html:has(.scene-host) body', declarations: ['overflow: hidden'] },
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
 * The full-viewport page: `page.css` exactly, imported once by the thin entry
 * (`shell/entry.ts`, since 4.1, so the first frame is the ground before React
 * arrives) and not by `App.tsx`, the host carrying its class beside the wheel
 * listener's ref, and the scene's wrapper and Canvas at `100%` by `100%`.
 */
function auditPage(files: { readonly css: string; readonly entry: string; readonly app: string; readonly host: string; readonly scene: string }): string[] {
  const failures = [...auditBans('page', files.css), ...auditDeclarations('page', files.css, PAGE_RULES)];
  const entry = codeOf(files.entry, 'script');
  if ((entry.match(/^import\s+'\.\/page\.css'\s*;/gm) ?? []).length !== 1) failures.push('page: shell/entry.ts does not import ./page.css, once');
  const app = codeOf(files.app, 'script');
  if (/^import\s+'[^']*page\.css'/m.test(app)) failures.push('page: App.tsx imports page.css — the entry carries it');
  const host = codeOf(files.host, 'script');
  if ((host.match(/<div ref=\{host\} className="scene-host">/g) ?? []).length !== 1) failures.push('page: the scene host is not the one <div ref={host} className="scene-host">');
  const scene = codeOf(files.scene, 'script');
  if (!/<div style=\{\{ position: 'relative', width: '100%', height: '100%' \}\}>\s*<Canvas\b/.test(scene)) failures.push('page: the scene wrapper is not 100% by 100%');
  if (!/<Canvas\b[^>]*?style=\{\{ width: '100%', height: '100%' \}\}/.test(scene)) failures.push('page: the Canvas is not 100% by 100%');
  if (/\d[dsl]?v(?:[hwib]|min|max)\b/.test(scene)) failures.push('page: the scene is sized in viewport units — the host is the viewport');
  return failures;
}

function pageFiles() {
  return { css: read(`./${PAGE_CSS}`), entry: read('./shell/entry.ts'), app: read('./App.tsx'), host: read('./shell/scene-host.tsx'), scene: read('./render-scene/scene.tsx') };
}

test('page: surface-base edge to edge, no page scroll under the scene host, the host fixed and the canvas filling it', () => {
  assert.deepEqual(auditPage(pageFiles()), []);
});

test('page: each guarantee removed fails with its own line', () => {
  const real = pageFiles();
  const cases: readonly (readonly [keyof ReturnType<typeof pageFiles>, (source: string) => string, RegExp])[] = [
    ['css', (s) => s.replace('  margin: 0;\n', ''), /^page: `html, body` lacks `margin: 0`$/],
    ['css', (s) => s.replace('  overflow: hidden;\n', ''), /^page: `html:has\(\.scene-host\), html:has\(\.scene-host\) body` lacks `overflow: hidden`$/],
    // 4.3: the lock back on every page, or locking the html alone, fails.
    ['css', (s) => s.replace('  margin: 0;\n', '  margin: 0;\n  overflow: hidden;\n'), /^page: `html, body` carries the unlisted `overflow: hidden`$/],
    ['css', (s) => s.replace('html:has(.scene-host),\nhtml:has(.scene-host) body {', 'html:has(.scene-host) {'), /page: the rule `html:has\(\.scene-host\), html:has\(\.scene-host\) body` is missing/],
    ['css', (s) => s.replace('html:has(.scene-host),\nhtml:has(.scene-host) body {', 'html,\nbody {'), /page: the rule `html:has\(\.scene-host\), html:has\(\.scene-host\) body` is missing/],
    ['css', (s) => s.replace('var(--color-surface-base-dark)', 'var(--color-surface-raised-dark)'), /`html, body` lacks `background: var\(--color-surface-base-dark\)`/],
    ['css', (s) => s.replace('position: fixed;', 'position: absolute;'), /`\.scene-host` lacks `position: fixed`/],
    ['css', (s) => s.replace('  inset: 0;\n', '  inset: 0;\n  z-index: 3;\n'), /^page: `\.scene-host` carries the unlisted `z-index: 3`$/],
    ['css', (s) => s.replace('  inset: 0;\n', '  inset: 0;\n  text-transform: uppercase;\n'), /^page: text-transform/],
    ['css', (s) => s.replace('  color: var(--color-ink-label-dark);\n', ''), /^page: `body` lacks `color: var\(--color-ink-label-dark\)`$/],
    // A later rule with a listed selector is checked too, not shadowed by the first.
    ['css', (s) => `${s}\n.scene-host {\n  position: static;\n}\n`, /^page: the rule `\.scene-host` appears 2 times — one rule per selector$/],
    ['entry', (s) => s.replace("import './page.css';\n", ''), /^page: shell\/entry\.ts does not import \.\/page\.css, once$/],
    ['entry', (s) => s.replace("import './page.css';\n", "import './page.css';\nimport './page.css';\n"), /^page: shell\/entry\.ts does not import \.\/page\.css, once$/],
    ['app', (s) => s.replace("import { SceneHost } from './shell/scene-host.tsx';\n", "import { SceneHost } from './shell/scene-host.tsx';\nimport './shell/page.css';\n"), /^page: App\.tsx imports page\.css — the entry carries it$/],
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

// --- The chart (4.3) -----------------------------------------------------------------------------

const CHART_TSX = 'render-fallback/chart.tsx';

const CHART_TYPE = (role: string): string[] => [
  `font-family: var(--type-${role}-font-family)`,
  `font-size: var(--type-${role}-font-size)`,
  `font-weight: var(--type-${role}-font-weight)`,
  `line-height: var(--type-${role}-line-height)`,
  `letter-spacing: var(--type-${role}-letter-spacing)`,
];

/** SVG text takes no line-height: the plate's labels are the role's family, size, weight and tracking. */
const PLATE_TYPE = (role: string): string[] => CHART_TYPE(role).filter((line) => !line.startsWith('line-height'));

const PHONE = '@media (max-width: 640px)';

const CHART_RULES: readonly CssRule[] = [
  {
    at: '',
    selector: '.chart',
    declarations: ['box-sizing: border-box', 'max-width: 1242px', 'margin: 0 auto', 'padding: var(--space-xxl) var(--space-xl) var(--space-xxl)', 'color: var(--color-ink-prose-dark)', 'overflow-wrap: anywhere'],
  },
  // The chrome row (4.5): the heading and the route line, opposite each other on one baseline.
  { at: '', selector: '.chart-chrome', declarations: ['display: flex', 'justify-content: space-between', 'align-items: baseline', 'gap: var(--space-md)', 'margin: 0 0 var(--space-xxl)'] },
  { at: '', selector: '.chart-heading, .chart-routes', declarations: ['margin: 0', ...CHART_TYPE('chrome'), 'color: var(--color-ink-label-dark)'] },
  // 4.5: the route line, empty on the fallback surface, leaves no gap in the column.
  { at: '', selector: '.chart-routes:empty', declarations: ['display: none'] },
  { at: '', selector: '.chart-chrome a', declarations: ['color: var(--color-ink-label-dark)', 'text-decoration: none', 'border-bottom: 1px solid var(--color-stroke-near-dark)'] },
  { at: '', selector: '.chart-chrome a:hover, .chart-chrome a:focus-visible', declarations: ['color: var(--color-ink-lift-dark)', 'border-bottom-color: var(--color-stroke-focus-dark)'] },
  { at: '', selector: '.chart-chrome a:focus-visible', declarations: ['outline: 1px solid var(--color-stroke-focus-dark)', 'outline-offset: 3px'] },
  { at: '', selector: '.chart-plate', declarations: ['border: 1px solid var(--color-surface-edge-dark)'] },
  { at: '', selector: '.chart-plate svg', declarations: ['display: block', 'width: 100%', 'height: auto'] },
  { at: '', selector: '.chart-plate-across', declarations: ['overflow-x: auto'] },
  { at: '', selector: '.chart-plate-across svg', declarations: ['min-width: 1160px', 'max-width: 1160px'] },
  { at: '', selector: '.chart-plate-down', declarations: ['display: none'] },
  { at: '', selector: '.chart-plate-down svg', declarations: ['max-width: 350px', 'margin: 0 auto'] },
  { at: '', selector: '.chart-baseline, .chart-stem', declarations: ['stroke: var(--color-stroke-rest-dark)', 'stroke-width: var(--stroke-hairline)'] },
  { at: '', selector: '.chart-leader', declarations: ['stroke: var(--color-stroke-rest-dark)', 'stroke-width: var(--stroke-hairline-leader)'] },
  { at: '', selector: '.chart-star', declarations: ['fill: var(--color-surface-base-dark)', 'stroke: var(--color-stroke-active-dark)', 'stroke-width: var(--stroke-body-client)'] },
  { at: '', selector: '.chart-star-core', declarations: ['fill: var(--color-stroke-active-dark)'] },
  { at: '', selector: '.chart-marker', declarations: ['fill: var(--color-surface-base-dark)', 'stroke: var(--color-stroke-near-dark)', 'stroke-width: var(--stroke-body-near)'] },
  // DESIGN.md `components.ring-notable` (4.4): stroke-near, the hairline, no fill, no dash.
  { at: '', selector: '.chart-ring', declarations: ['fill: none', 'stroke: var(--color-stroke-near-dark)', 'stroke-width: var(--stroke-hairline)'] },
  { at: '', selector: '.chart-glyph', declarations: ['display: block'] },
  {
    at: '',
    selector: '.chart-legend',
    declarations: ['display: flex', 'flex-wrap: wrap', 'gap: var(--space-xl)', 'margin: var(--space-md) 0 0', ...CHART_TYPE('field-label'), 'color: var(--color-ink-label-dark)'],
  },
  { at: '', selector: '.chart-legend-entry', declarations: ['display: flex', 'align-items: center', 'gap: var(--space-sm)'] },
  { at: '', selector: '.chart-label-client', declarations: [...PLATE_TYPE('scene-label-client'), 'fill: var(--color-ink-lift-dark)'] },
  // A Client's span (4.5): the scene's secondary label role, at ink-label.
  { at: '', selector: '.chart-label-span', declarations: [...PLATE_TYPE('scene-label-secondary'), 'fill: var(--color-ink-label-dark)'] },
  { at: '', selector: '.chart-label-project', declarations: [...PLATE_TYPE('scene-label-project'), 'fill: var(--color-ink-prose-dark)'] },
  { at: '', selector: '.chart-index', declarations: ['width: 100%', 'margin: var(--space-xxl) 0 0', 'border-collapse: collapse', 'border-spacing: 0'] },
  {
    at: '',
    selector: '.chart-index th',
    declarations: ['padding: 0 var(--space-lg) var(--space-sm) 0', 'text-align: left', 'vertical-align: baseline', ...CHART_TYPE('field-label'), 'color: var(--color-ink-label-dark)'],
  },
  {
    at: '',
    selector: '.chart-index td',
    declarations: [
      'padding: var(--space-sm) var(--space-lg) var(--space-sm) 0',
      'border-top: 1px solid var(--color-surface-edge-dark)',
      'vertical-align: baseline',
      ...CHART_TYPE('field-value'),
      'color: var(--color-ink-prose-dark)',
    ],
  },
  // The Notable header on one line: `.chart`'s `overflow-wrap: anywhere` broke it letter by letter.
  { at: '', selector: '.chart-index th:first-child', declarations: ['white-space: nowrap'] },
  { at: '', selector: '.chart-index-notable', declarations: ['width: 20px'] },
  { at: '', selector: '.chart-index-dates', declarations: ['white-space: nowrap'] },
  { at: '', selector: '.chart-index a', declarations: ['color: var(--color-ink-prose-dark)', 'text-decoration: none', 'border-bottom: 1px solid var(--color-stroke-near-dark)'] },
  { at: '', selector: '.chart-index a:hover, .chart-index a:focus-visible', declarations: ['color: var(--color-ink-lift-dark)', 'border-bottom-color: var(--color-stroke-focus-dark)'] },
  { at: '', selector: '.chart-index a:focus-visible', declarations: ['outline: 1px solid var(--color-stroke-focus-dark)', 'outline-offset: 3px'] },
  { at: '', selector: '.chart-section', declarations: ['margin: var(--space-xxl) 0 0'] },
  { at: '', selector: '.chart-client', declarations: ['margin: 0 0 var(--space-lg)', ...CHART_TYPE('scene-label-client'), 'color: var(--color-ink-lift-dark)'] },
  {
    at: '',
    selector: '.chart-record',
    declarations: [
      'margin: 0 0 var(--space-xl)',
      'padding: var(--space-panel-pad-top) var(--space-panel-pad-x) var(--space-panel-pad-bottom)',
      'background: var(--color-surface-raised-dark)',
      'border-left: 1px solid var(--color-surface-edge-dark)',
    ],
  },
  { at: PHONE, selector: '.chart', declarations: ['padding: var(--space-lg) var(--space-md) var(--space-xxl)'] },
  { at: PHONE, selector: '.chart-chrome', declarations: ['flex-direction: column', 'gap: var(--space-xs)'] },
  { at: PHONE, selector: '.chart-plate-across', declarations: ['display: none'] },
  { at: PHONE, selector: '.chart-plate-down', declarations: ['display: block'] },
  { at: PHONE, selector: '.chart-legend', declarations: ['flex-direction: column', 'gap: var(--space-md)'] },
  { at: PHONE, selector: '.chart-index, .chart-index tbody, .chart-index tr, .chart-index td', declarations: ['display: block'] },
  { at: PHONE, selector: '.chart-index thead', declarations: ['position: absolute', 'width: 1px', 'height: 1px', 'overflow: hidden', 'clip-path: inset(50%)', 'white-space: nowrap'] },
  { at: PHONE, selector: '.chart-index tr', declarations: ['position: relative', 'padding: var(--space-sm) 0 var(--space-sm) var(--space-xl)', 'border-top: 1px solid var(--color-surface-edge-dark)'] },
  { at: PHONE, selector: '.chart-index td', declarations: ['padding: 0', 'border-top: 0'] },
  // The Notable cell stays first in each stacked row, in its left gutter.
  { at: PHONE, selector: '.chart-index-notable', declarations: ['position: absolute', 'top: var(--space-sm)', 'left: 0'] },
  { at: PHONE, selector: '.chart-record', declarations: ['margin: 0 0 var(--space-md)', 'padding: var(--space-lg) var(--space-md) var(--space-xl)'] },
  { at: PHONE, selector: '.chart-record .panel-fields th, .chart-record .panel-fields td', declarations: ['display: block'] },
  { at: PHONE, selector: '.chart-record .panel-fields th', declarations: ['padding: var(--space-sm) 0 var(--space-hair)'] },
  { at: PHONE, selector: '.chart-record .panel-fields td', declarations: ['padding: 0 0 var(--space-sm)', 'border-top: 0'] },
  { at: '@media (forced-colors: active)', selector: '.chart-chrome a:focus-visible, .chart-index a:focus-visible', declarations: ['outline: 1px solid CanvasText'] },
];

/**
 * The two rules that may hide an element: each plate, outside its own width.
 * Both plates are `aria-hidden`. One query decides both, so no width — a
 * fractional one under zoom included — shows both plates or neither.
 */
const PLATE_SWAP = new Set(['.chart-plate-down', '@media (max-width: 640px) .chart-plate-across', '.chart-routes:empty']);

/**
 * The chart's treatment: `chart.css` exactly, with the identity bans — `display:
 * none` admitted on the two plate rules alone — imported once by `chart.tsx`
 * beside the panel's stylesheet, the plates `aria-hidden` and no inline style,
 * hex, radius, shadow or filter anywhere in the stylesheet.
 */
function auditChart(css: string, tsx: string): string[] {
  const swapped = parseCss(css).filter((rule) => rule.declarations.includes('display: none'));
  const hidden = swapped.map((rule) => `${rule.at === '' ? '' : `${rule.at} `}${rule.selector}`);
  // Blank the admitted `display: none` before the bans read the sheet, so any other is still caught.
  const admitted = hidden.every((key) => PLATE_SWAP.has(key));
  const banned = auditBans('chart', css).filter((line) => !(admitted && line.startsWith('chart: display: none')));
  const failures = [...banned, ...auditDeclarations('chart', css, CHART_RULES)];
  for (const key of hidden) if (!PLATE_SWAP.has(key)) failures.push(`chart: \`${key}\` sets display: none — only the plates, by width, may`);
  const code = codeOf(css, 'css');
  if (/#[0-9a-f]{3,8}\b/i.test(code)) failures.push('chart: a hex colour — every colour is a token');
  if (/\b(?:border-radius|box-shadow|text-shadow|filter)\s*:/.test(code)) failures.push('chart: a radius, shadow or filter — corners are square and nothing glows');
  const script = codeOf(tsx, 'script');
  if ((script.match(/^import\s+'\.\/chart\.css'\s*;/gm) ?? []).length !== 1) failures.push('chart: chart.tsx does not import ./chart.css, once');
  if ((script.match(/^import\s+'\.\.\/shell\/focus-panel\.css'\s*;/gm) ?? []).length !== 1) failures.push('chart: chart.tsx does not import the panel’s stylesheet, once');
  if (!/<div className=\{className\} aria-hidden="true">\s*<svg\b/.test(script)) failures.push('chart: the plate is not an aria-hidden wrapper around its svg');
  if (!/<div className="chart-legend" aria-hidden="true">/.test(script)) failures.push('chart: the legend is not aria-hidden — it decodes the aria-hidden plate');
  if (!/<td className="chart-index-notable">\s*<svg className="chart-glyph"[^>]*\brole="img" aria-label=\{row\.notable\.label\}/.test(script)) failures.push('chart: the Notable cell is not an image named by the model');
  if (/\bstyle=\{/.test(script)) failures.push('chart: an inline style — the treatment is the stylesheet’s');
  if (/\b(?:fill|stroke)=/.test(script)) failures.push('chart: a colour on the plate’s markup — fill and stroke are the stylesheet’s');
  return failures;
}

test('chart: the flat chart’s stylesheet, declaration by declaration, and its markup’s hooks', () => {
  assert.deepEqual(auditChart(read(`./${CHART_CSS}`), read(`./${CHART_TSX}`)), []);
});

test('chart: each guarantee removed fails with its own line', () => {
  const css = read(`./${CHART_CSS}`);
  const tsx = read(`./${CHART_TSX}`);
  const cssCases: readonly (readonly [(source: string) => string, RegExp])[] = [
    // A third `display: none`, on the index, or the plate swap at top level.
    [(s) => s.replace('  .chart-index thead {\n    position: absolute;', '  .chart-index thead {\n    display: none;\n    position: absolute;'), /`@media \(max-width: 640px\) \.chart-index thead` sets display: none/],
    [(s) => s.replace('.chart-plate-down {\n  display: none;\n}', '@media (min-width: 640.02px) {\n  .chart-plate-down {\n    display: none;\n  }\n}'), /`@media \(min-width: 640\.02px\) \.chart-plate-down` sets display: none/],
    [(s) => s.replace('  .chart-plate-across {\n    display: none;\n  }\n', ''), /`@media \(max-width: 640px\) \.chart-plate-across` is missing/],
    [(s) => s.replace('  .chart-plate-down {\n    display: block;\n  }\n', ''), /`@media \(max-width: 640px\) \.chart-plate-down` is missing/],
    [(s) => s.replace('  min-width: 1160px;\n', ''), /`\.chart-plate-across svg` lacks `min-width: 1160px`/],
    [(s) => s.replace('  overflow-x: auto;\n', ''), /`\.chart-plate-across` lacks `overflow-x: auto`/],
    [(s) => s.replace('  clip-path: inset(50%);\n', '  visibility: hidden;\n'), /^chart: visibility: hidden/],
    [(s) => s.replace('fill: var(--color-ink-lift-dark);', 'fill: #F2F2F4;'), /chart: a hex colour/],
    [(s) => s.replace('  border: 1px solid var(--color-surface-edge-dark);\n', '  border: 1px solid var(--color-surface-edge-dark);\n  border-radius: 4px;\n'), /chart: a radius, shadow or filter/],
    [(s) => s.replace('  stroke-width: var(--stroke-body-near);\n', '  stroke-width: var(--stroke-body-near);\n  filter: drop-shadow(0 0 4px white);\n'), /chart: a radius, shadow or filter/],
    [(s) => s.replace('font-weight: var(--type-chrome-font-weight)', 'font-weight: 700'), /^chart: a literal font-weight/],
    [(s) => s.replace('  color: var(--color-ink-lift-dark);\n}', '  color: var(--color-ink-lift-dark);\n  text-transform: uppercase;\n}'), /^chart: text-transform/],
    [(s) => s.replace('  stroke: var(--color-stroke-near-dark);\n', '  stroke: var(--color-stroke-active-dark);\n'), /`\.chart-marker` lacks `stroke: var\(--color-stroke-near-dark\)`/],
    [(s) => s.replace('  background: var(--color-surface-raised-dark);\n', ''), /`\.chart-record` lacks `background: var\(--color-surface-raised-dark\)`/],
    // The Deep/Shallow signal (4.4) is the Ring alone, undashed, unfilled, at stroke-near.
    [(s) => s.replace('  fill: none;\n  stroke: var(--color-stroke-near-dark);\n  stroke-width: var(--stroke-hairline);', '  fill: var(--color-stroke-near-dark);\n  stroke: var(--color-stroke-near-dark);\n  stroke-width: var(--stroke-hairline);'), /`\.chart-ring` lacks `fill: none`/],
    [(s) => s.replace('  fill: none;\n  stroke: var(--color-stroke-near-dark);', '  fill: none;\n  stroke: var(--color-stroke-active-dark);'), /`\.chart-ring` lacks `stroke: var\(--color-stroke-near-dark\)`/],
    [(s) => s.replace('  stroke-width: var(--stroke-hairline);\n}\n\n.chart-glyph', '  stroke-width: var(--stroke-hairline);\n  stroke-dasharray: 2 2;\n}\n\n.chart-glyph'), /`\.chart-ring` carries the unlisted `stroke-dasharray: 2 2`/],
    [(s) => s.replace('  stroke: var(--color-stroke-near-dark);\n  stroke-width: var(--stroke-hairline);\n}\n\n.chart-glyph', '  stroke: var(--color-stroke-near-dark);\n  stroke-width: var(--stroke-body-near);\n}\n\n.chart-glyph'), /`\.chart-ring` lacks `stroke-width: var\(--stroke-hairline\)`/],
    [(s) => s.replace('.chart-legend {\n  display: flex;', '.chart-legend {\n  display: none;'), /`\.chart-legend` sets display: none/],
    [(s) => s.replace('  .chart-legend {\n    flex-direction: column;', '  .chart-legend {\n    display: none;\n    flex-direction: column;'), /`@media \(max-width: 640px\) \.chart-legend` sets display: none/],
    [(s) => s.replace('.chart-index th:first-child {\n  white-space: nowrap;\n}\n', ''), /`\.chart-index th:first-child` is missing/],
    // 4.5: the chrome row, its links and the span label.
    [(s) => s.replace('  justify-content: space-between;\n', ''), /`\.chart-chrome` lacks `justify-content: space-between`/],
    [(s) => s.replace('.chart-routes:empty {\n  display: none;\n}\n', ''), /`\.chart-routes:empty` is missing/],
    [(s) => s.replace('.chart-routes:empty {', '.chart-routes {'), /`\.chart-routes` sets display: none/],
    [(s) => s.replace('  .chart-chrome {\n    flex-direction: column;', '  .chart-chrome {\n    flex-direction: row;'), /`@media \(max-width: 640px\) \.chart-chrome` lacks `flex-direction: column`/],
    [(s) => s.replace('.chart-chrome a {\n  color: var(--color-ink-label-dark);\n  text-decoration: none;', '.chart-chrome a {\n  color: var(--color-ink-label-dark);\n  text-decoration: underline;'), /`\.chart-chrome a` lacks `text-decoration: none`/],
    [(s) => s.replace('.chart-chrome a {\n  color: var(--color-ink-label-dark);\n  text-decoration: none;\n  border-bottom: 1px solid var(--color-stroke-near-dark);', '.chart-chrome a {\n  color: var(--color-ink-label-dark);\n  text-decoration: none;'), /`\.chart-chrome a` lacks `border-bottom/],
    [(s) => s.replace('  .chart-chrome a:focus-visible,\n  .chart-index a:focus-visible {', '  .chart-index a:focus-visible {'), /`@media \(forced-colors: active\) \.chart-chrome a:focus-visible, \.chart-index a:focus-visible` is missing/],
    [(s) => s.replace('  font-size: var(--type-scene-label-secondary-font-size);\n', '  font-size: var(--type-scene-label-project-font-size);\n'), /`\.chart-label-span` lacks `font-size: var\(--type-scene-label-secondary-font-size\)`/],
    [(s) => s.replace('.chart-routes {\n  margin: 0;', '.chart-routes {\n  display: none;\n  margin: 0;'), /sets display: none/],
    [(s) => `${s}\n.deep .chart-marker {\n  transform: scale(1.4);\n}\n`, /^chart: the unlisted rule `\.deep \.chart-marker`$/m],
    [(s) => `${s}\n.chart-halo {\n  stroke: var(--color-stroke-near-dark);\n}\n`, /^chart: the unlisted rule `\.chart-halo`$/m],
    [(s) => s.replace('  .chart-index-notable {\n    position: absolute;', '  .chart-index-notable {\n    display: none;\n    position: absolute;'), /`@media \(max-width: 640px\) \.chart-index-notable` sets display: none/],
    [(s) => s.replace('  color: var(--color-ink-label-dark);\n}\n\n.chart-legend-entry', '  color: var(--color-ink-label-dark);\n  text-transform: uppercase;\n}\n\n.chart-legend-entry'), /^chart: text-transform/m],
  ];
  for (const [mutate, message] of cssCases) {
    const mutated = mutate(css);
    assert.notEqual(mutated, css, `the mutation ${String(message)} must apply`);
    assert.match(auditChart(mutated, tsx).join('\n'), message);
  }
  const tsxCases: readonly (readonly [(source: string) => string, RegExp])[] = [
    [(s) => s.replace("import './chart.css';\n", ''), /chart\.tsx does not import \.\/chart\.css, once/],
    [(s) => s.replace("import '../shell/focus-panel.css';\n", ''), /does not import the panel’s stylesheet, once/],
    [(s) => s.replace('<div className={className} aria-hidden="true">', '<div className={className}>'), /the plate is not an aria-hidden wrapper/],
    [(s) => s.replace('<div className="chart" ', '<div className="chart" style={{ overflow: \'hidden\' }} '), /an inline style/],
    [(s) => s.replace('<circle key={circle.key} className={circle.className}', '<circle key={circle.key} className={circle.className} fill="white"'), /a colour on the plate’s markup/],
    [(s) => s.replace('<div className="chart-legend" aria-hidden="true">', '<div className="chart-legend">'), /the legend is not aria-hidden/],
    [(s) => s.replace('role="img" aria-label={row.notable.label}', 'aria-hidden="true"'), /the Notable cell is not an image named by the model/],
    [(s) => s.replace('<circle className="chart-ring"', '<circle className="chart-ring" stroke="white"'), /a colour on the plate’s markup/],
  ];
  for (const [mutate, message] of tsxCases) {
    const mutated = mutate(tsx);
    assert.notEqual(mutated, tsx, `the mutation ${String(message)} must apply`);
    assert.match(auditChart(css, mutated).join('\n'), message);
  }
});
