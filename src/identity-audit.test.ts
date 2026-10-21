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
 *   restated here; a second maps the chart's non-text indicators — the link
 *   underline, the focus outline, the Ring and the Notable glyph's marker — to
 *   theirs, at the 3:1 non-text floor (4.10, WCAG 1.4.11).
 * - **Copy** — every visible literal string shipped from `src/` or `index.html`
 *   is in one closed allowlist; accessible names are a second, separate list.
 * - **Page metadata** — every copy `<meta>` in `index.html` (description, the
 *   `og:`/`twitter:` title, description and image alt) is in `META_COPY` (6.1).
 * - **Voice** — no work-in-progress, beta or apologetic word in any shipped
 *   string, in `career.json` or in `index.html`.
 * - **Bands** — no Body in the committed artifact carries `stroke-dust` (ruling
 *   4b-i).
 * - **Page** and **Index** — the full-viewport page (ruling 7a) and the index
 *   hidden until keyboard focus (ruling 8a), as exact declaration sets.
 * - **Chart** — the flat star chart's stylesheet (4.3), as an exact declaration
 *   set, its two `display: none` admitted only on the plates, by width.
 * - **Colophon** — the derivation table's stylesheet (5.2) and the exhibits'
 *   (5.3), as an exact declaration set, and its markup's hooks: rule labels and
 *   headers at field-label/ink-label, values at field-value/ink-prose, the
 *   derived value lifted to ink-lift; each exhibit a named, focusable region on
 *   surface-raised, keys at ink-lift, values at ink-prose, structure at
 *   ink-label.
 * - **Monospace** — `--font-mono` set by the one exhibit rule and named by no
 *   other shipped file, the word `monospace` nowhere under `src/` but the
 *   tokens, no `<code>`/`<kbd>`/`<samp>`/`<tt>` drawn and `<pre>` drawn only by
 *   the Colophon (5.3); and every `var(--…)` a stylesheet reads is a token.
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
import { SURFACE_NAMES, SURFACE_TITLES } from './shell/arrival.ts';
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
  | { readonly css: string; readonly selector: string; readonly property?: 'fill' | NonTextProperty }
  | { readonly model: string; readonly pattern: RegExp };

/** Where a non-text indicator's colour is set (4.10): a rule, an outline, an SVG stroke. */
type NonTextProperty = 'border-bottom' | 'border-bottom-color' | 'outline' | 'stroke';

interface Role {
  readonly role: string;
  readonly floor: 7 | 4.5 | 3;
  readonly ink: InkSource;
  readonly ground: 'panel' | 'page' | 'exhibit';
}

const PANEL_CSS = 'shell/focus-panel.css';
const CHROME_CSS = 'shell/corner-chrome.css';
const INDEX_CSS = 'shell/index-nav.css';
const PAGE_CSS = 'shell/page.css';
const CHART_CSS = 'render-fallback/chart.css';
const COLOPHON_CSS = 'colophon/colophon.css';
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
  // The offer (4.6): the same link raised at rest once the scene has run below the floor.
  { role: 'chrome chart link, offered', floor: 4.5, ink: { css: CHROME_CSS, selector: '.chrome-route-offered' }, ground: 'page' },
  // Its hover and focus step past that rest, to ink-lift (WCAG 2.4.7).
  { role: 'chrome chart link, offered, raised', floor: 4.5, ink: { css: CHROME_CSS, selector: '.chrome-route-offered:hover, .chrome-route-offered:focus-visible' }, ground: 'page' },
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
  // The Colophon's derivation table (5.2), on the page ground: headers and rule
  // names at field-label/ink-label, values at field-value/ink-prose, the derived
  // quantity lifted to ink-lift (DESIGN.md `components.colophon-derivation`).
  { role: 'derivation headers and rules', floor: 4.5, ink: { css: COLOPHON_CSS, selector: '.colophon-derivations th' }, ground: 'page' },
  { role: 'derivation values', floor: 7, ink: { css: COLOPHON_CSS, selector: '.colophon-derivations td' }, ground: 'page' },
  { role: 'derivation derived values', floor: 7, ink: { css: COLOPHON_CSS, selector: '.colophon-derivations .colophon-derived' }, ground: 'page' },
  // The Colophon's exhibits (5.3), on their own raised ground (read off
  // `.colophon-exhibit`'s background): keys at ink-lift and values at ink-prose,
  // both field-value text at the derivation values' floor, and the structure at
  // the block's own ink-label (DESIGN.md `components.colophon-json`).
  { role: 'exhibit keys', floor: 7, ink: { css: COLOPHON_CSS, selector: '.colophon-exhibit .colophon-json-key' }, ground: 'exhibit' },
  { role: 'exhibit values', floor: 7, ink: { css: COLOPHON_CSS, selector: '.colophon-exhibit .colophon-json-value' }, ground: 'exhibit' },
  { role: 'exhibit structure', floor: 4.5, ink: { css: COLOPHON_CSS, selector: '.colophon-exhibit' }, ground: 'exhibit' },
  // What is not there (5.4), on the page ground: the heading at field-label/ink-label,
  // the prose at notable-prose/ink-prose, the Notable prose's floor.
  { role: 'absences heading', floor: 4.5, ink: { css: COLOPHON_CSS, selector: '.colophon-heading' }, ground: 'page' },
  { role: 'absences prose', floor: 7, ink: { css: COLOPHON_CSS, selector: '.colophon-prose' }, ground: 'page' },
  // The live re-solve's button (5.5), on the page ground: the panel's release
  // treatment, ink-label at rest at the chrome floor, ink-prose raised at the
  // prose floor.
  { role: 'live re-solve button', floor: 4.5, ink: { css: COLOPHON_CSS, selector: '.colophon-solve' }, ground: 'page' },
  { role: 'live re-solve button, raised', floor: 7, ink: { css: COLOPHON_CSS, selector: '.colophon-solve:hover:not([aria-disabled="true"]), .colophon-solve:focus-visible:not([aria-disabled="true"])' }, ground: 'page' },
];

/**
 * The chart's non-text indicators (4.10, WCAG 1.4.11 and 2.4.11), each at the
 * 3:1 floor on the page ground, its colour read off the shipping CSS as `ROLES`
 * reads an ink: the link underline at rest and raised, the links' focus
 * outline, the Ring and the Notable glyph's marker (one rule each colours the
 * plate, the index glyph and the legend glyph). `stroke-near-dark` is 2.11:1
 * on the ground, so the underline, the Ring and the marker stroke at
 * `ink-label` (Thomas, ruling Q1 (b)); the scene's `ring-notable` keeps
 * `stroke-near`, and is not measured here.
 */
const NON_TEXT_ROLES: readonly Role[] = [
  { role: 'index link underline', floor: 3, ink: { css: CHART_CSS, selector: '.chart-index a', property: 'border-bottom' }, ground: 'page' },
  { role: 'index link underline, raised', floor: 3, ink: { css: CHART_CSS, selector: '.chart-index a:hover, .chart-index a:focus-visible', property: 'border-bottom-color' }, ground: 'page' },
  { role: 'index link focus outline', floor: 3, ink: { css: CHART_CSS, selector: '.chart-index a:focus-visible', property: 'outline' }, ground: 'page' },
  { role: 'chart chrome link underline', floor: 3, ink: { css: CHART_CSS, selector: '.chart-chrome a', property: 'border-bottom' }, ground: 'page' },
  { role: 'chart chrome link underline, raised', floor: 3, ink: { css: CHART_CSS, selector: '.chart-chrome a:hover, .chart-chrome a:focus-visible', property: 'border-bottom-color' }, ground: 'page' },
  { role: 'chart chrome link focus outline', floor: 3, ink: { css: CHART_CSS, selector: '.chart-chrome a:focus-visible', property: 'outline' }, ground: 'page' },
  { role: 'chart Ring', floor: 3, ink: { css: CHART_CSS, selector: '.chart-ring', property: 'stroke' }, ground: 'page' },
  { role: 'Notable glyph marker', floor: 3, ink: { css: CHART_CSS, selector: '.chart-marker', property: 'stroke' }, ground: 'page' },
  // The Colophon's exhibit focus outline (5.3), drawn 3px outside the block, on the page ground.
  { role: 'exhibit focus outline', floor: 3, ink: { css: COLOPHON_CSS, selector: '.colophon-exhibit:focus-visible', property: 'outline' }, ground: 'page' },
];

/** The token key a `var(--color-…)` value names, or undefined. */
const tokenOfVar = (value: string | undefined): string | undefined => /^var\(--color-([\w-]+)\)$/.exec(value ?? '')?.[1];

/**
 * The colour token a declaration's value names: the whole value, or the one
 * space-separated `var(--color-…)` part of a shorthand (`1px solid var(…)`).
 * Two colours, or none, read as none.
 */
const colourTokenOf = (value: string | undefined): string | undefined => {
  const parts = (value ?? '').split(' ').map(tokenOfVar).filter((key) => key !== undefined);
  return parts.length === 1 ? parts[0] : undefined;
};

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
function auditContrast(sources: Readonly<Record<string, string>>, panelBackground: string, roles: readonly Role[] = ROLES): string[] {
  const failures: string[] = [];
  const colors = tokens.colors as Readonly<Record<string, string>>;
  const grounds = {
    panel: tokenOfVar(panelBackground),
    page: tokenOfVar(declared(sources[PAGE_CSS] ?? '', 'html, body', 'background').value),
    exhibit: tokenOfVar(declared(sources[COLOPHON_CSS] ?? '', '.colophon-exhibit', 'background').value),
  };
  for (const { role, floor, ink, ground } of roles) {
    const where = 'css' in ink ? `${ink.css} \`${ink.selector}\`` : ink.model;
    let inkKey: string | undefined;
    if ('css' in ink) {
      const { value, rules } = declared(sources[ink.css] ?? '', ink.selector, ink.property ?? 'color');
      if (rules > 1) {
        failures.push(`contrast: ${role}'s ink is set by ${rules} top-level rules in ${ink.css} — one rule may set it`);
        continue;
      }
      inkKey = colourTokenOf(value);
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
  return Object.fromEntries([PANEL_CSS, CHROME_CSS, INDEX_CSS, PAGE_CSS, CHART_CSS, COLOPHON_CSS, AFFORDANCE_TS, MOTE_TS].map((path) => [path, read(`./${path}`)]));
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
    failing(CHROME_CSS, (s) => s.replace(/(\.chrome-route-offered \{\n  color: )var\(--color-ink-prose-dark\)/, '$1var(--color-ink-faint-dark)')),
    /^contrast: chrome chart link, offered is ink-faint-dark on surface-base-dark/,
  );
  assert.match(
    failing(CHROME_CSS, (s) => s.replace(/(\.chrome-route-offered:focus-visible \{\n  color: )var\(--color-ink-lift-dark\)/, '$1var(--color-ink-faint-dark)')),
    /^contrast: chrome chart link, offered, raised is ink-faint-dark on surface-base-dark/,
  );
  // 5.2: the derivation table's derived value at ink-label, its values at the quiet step, its labels unread.
  assert.match(
    failing(COLOPHON_CSS, (s) => s.replace(/(\.colophon-derivations \.colophon-derived \{\n  color: )var\(--color-ink-lift-dark\)/, '$1var(--color-ink-label-dark)')),
    /^contrast: derivation derived values is ink-label-dark on surface-base-dark, \d\.\d\d:1 — below its 7:1 floor$/,
  );
  assert.match(
    failing(COLOPHON_CSS, (s) => s.replace(/(\.colophon-derivations td \{[^}]*color: )var\(--color-ink-prose-dark\)/, '$1var(--color-ink-quiet-dark)')),
    /^contrast: derivation values is ink-quiet-dark on surface-base-dark/,
  );
  assert.match(
    failing(COLOPHON_CSS, (s) => s.replace(/(\.colophon-derivations th \{[^}]*)color: var\(--color-ink-label-dark\);/, '$1')),
    /^contrast: derivation headers and rules's ink could not be read off colophon\/colophon\.css/,
  );
  // 5.3: the exhibits' keys and values at ink-label, under 7 on the raised ground; the structure at the quiet step; the ground lightened or unread.
  assert.match(
    failing(COLOPHON_CSS, (s) => s.replace(/(\.colophon-exhibit \.colophon-json-key \{\n  color: )var\(--color-ink-lift-dark\)/, '$1var(--color-ink-label-dark)')),
    /^contrast: exhibit keys is ink-label-dark on surface-raised-dark, \d\.\d\d:1 — below its 7:1 floor$/,
  );
  assert.match(
    failing(COLOPHON_CSS, (s) => s.replace(/(\.colophon-exhibit \.colophon-json-value \{\n  color: )var\(--color-ink-prose-dark\)/, '$1var(--color-ink-label-dark)')),
    /^contrast: exhibit values is ink-label-dark on surface-raised-dark, \d\.\d\d:1 — below its 7:1 floor$/,
  );
  assert.match(
    failing(COLOPHON_CSS, (s) => s.replace(/(\.colophon-exhibit \{[^}]*color: )var\(--color-ink-label-dark\)/, '$1var(--color-ink-quiet-dark)')),
    /^contrast: exhibit structure is ink-quiet-dark on surface-raised-dark/,
  );
  assert.match(
    failing(COLOPHON_CSS, (s) => s.replace('  background: var(--color-surface-raised-dark);\n', '  background: var(--color-stroke-active-dark);\n')),
    /contrast: exhibit keys is ink-lift-dark on stroke-active-dark/,
  );
  assert.match(
    failing(COLOPHON_CSS, (s) => s.replace('  background: var(--color-surface-raised-dark);\n', '')),
    /^contrast: the exhibit ground could not be read as a colour token$/m,
  );
  // 5.4: the prose at ink-label, under 7 on the page ground; the heading at the quiet step.
  assert.match(
    failing(COLOPHON_CSS, (s) => s.replace(/(\.colophon-prose \{[^}]*color: )var\(--color-ink-prose-dark\)/, '$1var(--color-ink-label-dark)')),
    /^contrast: absences prose is ink-label-dark on surface-base-dark, \d\.\d\d:1 — below its 7:1 floor$/m,
  );
  assert.match(
    failing(COLOPHON_CSS, (s) => s.replace(/(\.colophon-heading \{[^}]*color: )var\(--color-ink-label-dark\)/, '$1var(--color-ink-quiet-dark)')),
    /^contrast: absences heading is ink-quiet-dark on surface-base-dark/m,
  );
  assert.match(
    auditContrast(real, 'var(--color-stroke-active-dark)').join('\n'),
    /contrast: panel title is ink-lift-dark on stroke-active-dark/,
    'a lighter panel ground is measured too',
  );
});

test('contrast: every non-text indicator on the chart clears 3:1 on the page ground, read from the shipping source', () => {
  // The failing step the ruling replaced, measured: stroke-near on the ground.
  const colors = tokens.colors as Readonly<Record<string, string>>;
  assert.equal(contrast(colors['stroke-near-dark'] as string, colors['surface-base-dark'] as string).toFixed(2), '2.11', 'stroke-near-dark is 2.11:1 on surface-base-dark');
  assert.equal(contrast(colors['ink-label-dark'] as string, colors['surface-base-dark'] as string).toFixed(2), '5.85', 'ink-label-dark is 5.85:1 on surface-base-dark');
  assert.equal(contrast(colors['stroke-focus-dark'] as string, colors['surface-base-dark'] as string).toFixed(2), '17.90', 'stroke-focus-dark is 17.90:1 on surface-base-dark');
  assert.deepEqual(auditContrast(contrastSources(), panelStyle(true).background, NON_TEXT_ROLES), []);
});

/**
 * A non-text row's colour moved to `token` in the shipping CSS: the first
 * top-level rule written `selector {` (a list one member per line) whose
 * `property` names a colour token.
 */
function retoken(css: string, selector: string, property: NonTextProperty, token: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/, /g, ',\\n');
  return css.replace(new RegExp(`(\\n${escaped} \\{[^}]*?\\n  ${property}: [^;\\n]*?)var\\(--color-[\\w-]+\\)`), `$1var(--color-${token})`);
}

test('contrast: each non-text indicator moved back to stroke-near fails with its own line', () => {
  const real = contrastSources();
  for (const { role, ink } of NON_TEXT_ROLES) {
    assert.ok('css' in ink && ink.property !== undefined && ink.property !== 'fill');
    const css = retoken(real[ink.css] as string, ink.selector, ink.property, 'stroke-near-dark');
    assert.notEqual(css, real[ink.css], `the mutation of ${role} must apply`);
    const failures = auditContrast({ ...real, [ink.css]: css }, panelStyle(true).background, NON_TEXT_ROLES);
    assert.deepEqual(failures, [`contrast: ${role} is stroke-near-dark on surface-base-dark, 2.11:1 — below its 3:1 floor`], `${role} moved back fails alone`);
  }
  // An underline whose colour cannot be read — none, or two — fails as unread, not as a pass.
  const css = real[CHART_CSS] as string;
  for (const value of ['1px solid', '1px solid var(--color-ink-label-dark) var(--color-ink-lift-dark)']) {
    const unread = css.replace('  border-bottom: 1px solid var(--color-ink-label-dark);\n}\n\n.chart-index a:hover', `  border-bottom: ${value};\n}\n\n.chart-index a:hover`);
    assert.notEqual(unread, css);
    assert.match(
      auditContrast({ ...real, [CHART_CSS]: unread }, panelStyle(true).background, NON_TEXT_ROLES).join('\n'),
      /^contrast: index link underline's ink could not be read off render-fallback\/chart\.css `\.chart-index a` as a colour token$/,
    );
  }
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
  // The Colophon's `<h1>` (4.2); its exhibits (5.1) are data, drawn as expressions.
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
  // `index.html`'s static `<title>` (6.1, ruling Q3 (a)): the link preview's.
  'Thomas Navarro',
  'This portfolio needs JavaScript.',
  // `document.title` per shown surface (4.10, ruling Q2); the `<main>` labels
  // are the surfaces' names, `the scene`, `the chart` and `the model`, above.
  'Thomas Navarro · the scene',
  'Thomas Navarro · the chart',
  'Thomas Navarro · the model',
  // The Colophon's derivation table (5.2): its headers (`Project` is the
  // chart's, above) and the three mapping rules' names — the rule annotations,
  // a sanctioned copy place. The values in it are data, drawn as expressions.
  'Rule',
  'Input',
  'Output',
  'mass ← duration',
  'brightness ← recency',
  'distance from the Rail ← weight',
  // The Colophon's statement of what is not there (5.4, ruling Q1 (a)): its
  // heading and five paragraphs, verbatim — the absences and the Shot
  // contract, each checkable against the files above it (`absences.test.ts`),
  // under the rule annotations' copy place (EXPERIENCE.md §3, place 4).
  'what is not there',
  'The layout is never authored; the camera is.',
  'There is no backend and no CMS. The two files above are all the data there is: career.json is written by hand, and layout.generated.json is produced from it and never edited. This page fetched both from this site as static files.',
  'There are no position overrides. career.json holds no coordinate, and no entry can pin its own place: every position in layout.generated.json is solved from the three rules above.',
  'Shots name entities, never coordinates. Each shot gives a subject, an angle and a distance, so when a solve moves a Client, its shot moves with it.',
  'There is no per-entry camera work. Every shot’s subject is a Client; a Project is framed at its Client’s stop, never on its own.',
  // The live re-solve (5.5, rulings Q2 (a), Q3 (a)): its heading, the one
  // framing paragraph and the button's label, verbatim — widening the same
  // copy place (EXPERIENCE.md §3, place 4, ruling Q5 (a)).
  'solve it here',
  'This runs the same solver on career.json, here in your browser. It shows the mechanism at work; it does not reproduce the shipped layout, which was solved once and is the only one the scene reads.',
  'solve it again',
]);

/** Accessible names — announced, never drawn — listed separately. */
const ACCESSIBLE_NAMES: ReadonlySet<string> = new Set([
  'Destinations',
  'Skills',
  // The chart's Notable glyph on a Shallow row (4.4); its Deep name is the
  // visible `Carries a notable`, the legend's phrase.
  'No notable',
  // The live re-solve's result exhibit (5.5): its name, announced, never drawn.
  'layout, solved in this browser',
]);

/** The constants the renderers draw copy from; any other upper-case constant drawn as text fails. */
const COPY_CONSTANTS: ReadonlySet<string> = new Set(['IDENTITY_LINE', 'IDENTITY_NAME', 'IDENTITY_MODEL', 'CHART_LINK_TEXT', 'SCENE_LINK_TEXT', 'SLOT_TEXT', 'EDITORIAL_RULE', 'RELEASE_LABEL', 'FIELD_LABELS', 'DEPTH_LABELS', 'CHART_LABELS', 'DERIVATION_LABELS', 'ABSENCES_HEADING', 'ABSENCES', 'LIVE_SOLVE']);

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

/** The copy constants announced and never drawn: the Notable glyph's name on a Shallow row (4.4), and the live re-solve's result exhibit's name (5.5). */
const ANNOUNCED_CONSTANTS: ReadonlySet<string> = new Set(['CHART_LABELS.none', 'LIVE_SOLVE.result']);

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

/**
 * The Colophon's copy constant (5.2), read off `colophon/derivations.ts` as
 * text, as the chart's is: every `key: 'value'` pair of the one-line object
 * literal; none found reads as empty, which fails the key check below.
 */
function derivationLabels(): Record<string, string> {
  const literal = /export const DERIVATION_LABELS = \{([^}]*)\} as const;/.exec(codeOf(read('./colophon/derivations.ts'), 'script'))?.[1] ?? '';
  return Object.fromEntries([...literal.matchAll(/(\w+):\s*'([^']*)'/g)].map(([, key, value]) => [key as string, value as string]));
}

/**
 * The Colophon's statement of what is not there (5.4), read off
 * `colophon/absences.ts` as text, as the derivation labels are: the heading's
 * one string, and every `key: 'value'` pair of the paragraphs' one-line object
 * literal; none found reads as empty, which fails the checks below.
 */
function absencesHeading(): Record<string, string> {
  const value = /export const ABSENCES_HEADING = '([^']*)';/.exec(codeOf(read('./colophon/absences.ts'), 'script'))?.[1];
  return value === undefined ? {} : { ABSENCES_HEADING: value };
}

function absences(): Record<string, string> {
  const literal = /export const ABSENCES = \{([^}]*)\} as const;/.exec(codeOf(read('./colophon/absences.ts'), 'script'))?.[1] ?? '';
  return Object.fromEntries([...literal.matchAll(/(\w+):\s*'([^']*)'/g)].map(([, key, value]) => [key as string, value as string]));
}

/**
 * The live re-solve's copy (5.5), read off `colophon/live-solve.ts` as text,
 * as the derivation labels are: every `key: 'value'` pair of the one-line
 * object literal; none found reads as empty, which fails the key check below.
 */
function liveSolve(): Record<string, string> {
  const literal = /export const LIVE_SOLVE = \{([^}]*)\} as const;/.exec(codeOf(read('./colophon/live-solve.ts'), 'script'))?.[1] ?? '';
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
    ...entries('DERIVATION_LABELS', derivationLabels()),
    ...Object.entries(absencesHeading()),
    ...entries('ABSENCES', absences()),
    ...entries('LIVE_SOLVE', liveSolve()),
    ...entries('SURFACE_TITLES', SURFACE_TITLES),
    ...entries('SURFACE_NAMES', SURFACE_NAMES),
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
  assert.deepEqual(Object.keys(derivationLabels()), ['rule', 'project', 'input', 'output', 'mass', 'brightness', 'distance'], 'the derivation table’s labels are read off its module (5.2)');
  // 5.2: a rule annotated beyond its name, or a fourth rule, is not in the allowlist.
  for (const [name, value] of [['DERIVATION_LABELS.mass', 'mass ← duration (in months)'], ['DERIVATION_LABELS.distance', 'size ← skills']] as const) {
    assert.deepEqual(auditCopyConstants({ ...constants, [name]: value }), [`copy: the constant ${name} is ${JSON.stringify(value)}, which is not in the closed allowlist`]);
  }
  // 5.4: the heading and the five paragraphs, read off their module; a paragraph reworded, or a sixth, is not in the allowlist.
  assert.deepEqual(Object.keys(absencesHeading()), ['ABSENCES_HEADING'], 'the absences heading is read off its module (5.4)');
  assert.deepEqual(Object.keys(absences()), ['thesis', 'data', 'positions', 'shots', 'camera'], 'the absences are read off their module (5.4)');
  for (const [name, value] of [
    ['ABSENCES_HEADING', 'What is not there'],
    ['ABSENCES.data', 'There is no backend and no CMS.'],
    ['ABSENCES.thesis', 'The layout is never authored; the camera is'],
    ['ABSENCES.boast', 'Built with care and attention to maintainability.'],
  ] as const) {
    assert.deepEqual(auditCopyConstants({ ...constants, [name]: value }), [`copy: the constant ${name} is ${JSON.stringify(value)}, which is not in the closed allowlist`]);
  }
  // 5.5: the live re-solve's copy, read off its module, each value held by key —
  // heading, framing and action as visible copy, result as an accessible name
  // alone; a framing that apologises or a label that narrates is in neither set,
  // and the result's name drawn as a label is not admitted.
  assert.deepEqual(Object.keys(liveSolve()), ['heading', 'framing', 'action', 'result'], 'the live re-solve’s copy is read off its module (5.5)');
  assert.ok(VISIBLE_COPY.has(liveSolve().heading as string) && VISIBLE_COPY.has(liveSolve().framing as string) && VISIBLE_COPY.has(liveSolve().action as string), 'heading, framing and action are visible copy');
  assert.ok(ACCESSIBLE_NAMES.has(liveSolve().result as string) && !VISIBLE_COPY.has(liveSolve().result as string), 'the result is an accessible name, never visible copy');
  for (const [name, value] of [
    ['LIVE_SOLVE.heading', 'Solve it here'],
    ['LIVE_SOLVE.framing', 'Note: this is only a demo and may not match the real layout.'],
    ['LIVE_SOLVE.action', 'Re-run the solver'],
    ['LIVE_SOLVE.action', 'layout, solved in this browser'],
    ['LIVE_SOLVE.result', 'solve it again'.replace('again', 'once')],
    ['LIVE_SOLVE.status', 'solved in 412 ms'],
  ] as const) {
    assert.deepEqual(auditCopyConstants({ ...constants, [name]: value }), [`copy: the constant ${name} is ${JSON.stringify(value)}, which is not in the closed allowlist`]);
  }
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
  assert.deepEqual(htmlText(read('../index.html')), ['Thomas Navarro', 'This portfolio needs JavaScript.'], 'index.html draws its title and its noscript line, and nothing else');
});

test('copy: every visible literal shipped from src/ and index.html is in the closed allowlist', () => {
  const scripts = shippedFiles();
  assert.ok('shell/index-nav.tsx' in scripts && 'render-scene/affordance-model.ts' in scripts, 'the walk reaches the renderers and the models');
  assert.ok(!Object.keys(scripts).some((path) => path.endsWith('.test.ts')), 'tests are not shipped');
  // The JSX reader reaches what the renderers draw, or the scan is vacuous.
  const nav = jsxDrawn(codeOf(scripts['shell/index-nav.tsx'] as string, 'script'));
  assert.ok(nav.some((drawn) => drawn.kind === 'text' && drawn.text === 'overview'), 'the index’s overview text is read');
  const chrome = jsxDrawn(codeOf(scripts['shell/corner-chrome.tsx'] as string, 'script'));
  assert.ok(chrome.some((drawn) => drawn.kind === 'constant' && drawn.text === 'IDENTITY_NAME'), 'the chrome’s identity name is read');
  assert.ok(chrome.some((drawn) => drawn.kind === 'constant' && drawn.text === 'IDENTITY_MODEL'), 'the chrome’s link to the model is read (5.1)');
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
  // The Colophon's derivation table (5.2) draws its headers as a constant and its duration separator as a text run.
  const colophon = jsxDrawn(codeOf(scripts['colophon/colophon.tsx'] as string, 'script'));
  assert.ok(colophon.some((drawn) => drawn.kind === 'constant' && drawn.text === 'DERIVATION_LABELS'), 'the derivation table’s headers are read');
  assert.ok(colophon.some((drawn) => drawn.kind === 'text' && drawn.text === '–'), 'the duration separator is read');
  // 5.4: the absences heading is drawn as a constant; a line of prose written into the markup is not admitted.
  assert.ok(colophon.some((drawn) => drawn.kind === 'constant' && drawn.text === 'ABSENCES_HEADING'), 'the absences heading is read');
  assert.match(
    auditCopy({ ...scripts, 'colophon/colophon.tsx': (scripts['colophon/colophon.tsx'] as string).replace('<h2 className="colophon-heading">{ABSENCES_HEADING}</h2>', '<h2 className="colophon-heading">{ABSENCES_HEADING}</h2>\n          <p className="colophon-prose">Everything here is open source.</p>') }, read('../index.html')).join('\n'),
    /^copy: src\/colophon\/colophon\.tsx draws the visible text "Everything here is open source\."/,
    'a paragraph written beside the ruled copy fails',
  );
  assert.match(
    auditCopy({ ...scripts, 'colophon/colophon.tsx': (scripts['colophon/colophon.tsx'] as string).replace('<thead>', '<caption>How the layout is derived</caption>\n      <thead>') }, read('../index.html')).join('\n'),
    /^copy: src\/colophon\/colophon\.tsx draws the visible text "How the layout is derived"/,
    'a caption on the derivation table fails',
  );
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
    failing('render-fallback/chart.tsx', (s) => s.replace('<table className="chart-index" role="table">', '<table className="chart-index" role="table">\n        <caption>The fallback index</caption>')),
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

// --- Page metadata (6.1, ruling Q5 (a)(a)) ------------------------------------------------------------

/**
 * The closed set of page metadata copy: the document's title, its description
 * and the preview image's alt text (6.1, rulings Q3 (a), Q5 (a)(a)). Never drawn
 * on any surface, so not a sixth copy place (EXPERIENCE.md §3), and held to the
 * same voice: the voice audit scans the whole of `index.html`.
 */
const META_COPY: ReadonlySet<string> = new Set([
  'Thomas Navarro',
  'A work history, mapped.',
  'Six stars on a dark field, one of them white, joined by a faint line, with smaller bodies in orbit.',
]);

/** The metadata names whose `content` is copy, by `name` or `property`. */
const META_COPY_NAMES: ReadonlySet<string> = new Set([
  'description',
  'og:title',
  'og:description',
  'og:image:alt',
  'twitter:title',
  'twitter:description',
  'twitter:image:alt',
]);

/**
 * A tag's attribute value, double- or single-quoted; `undefined` when absent.
 * The name must follow the tag's start or whitespace, so `data-name=` and
 * `data-content=` are never read as `name=` or `content=`.
 */
function metaAttribute(tag: string, names: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)(?:${names})\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag);
  return match === null ? undefined : (match[1] ?? match[2]);
}

/**
 * Every `<meta>` whose name is a copy name and whose `content` is not in
 * `META_COPY` (a copy-named tag with no `content` among them), and every copy
 * name that does not appear exactly once — so a duplicated tag paired with a
 * missing one still fails, on both lines.
 */
function auditMetaCopy(html: string): string[] {
  const failures: string[] = [];
  const counts = new Map<string, number>([...META_COPY_NAMES].map((name) => [name, 0]));
  for (const [tag] of codeOf(html, 'markup').matchAll(/<meta\b[^>]*>/gi)) {
    // Compared lower-cased: `og:Title` is still the og:title tag.
    const name = metaAttribute(tag, 'name|property')?.toLowerCase();
    if (name === undefined || !META_COPY_NAMES.has(name)) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
    const content = metaAttribute(tag, 'content');
    if (content === undefined || !META_COPY.has(content)) {
      failures.push(`copy: index.html's ${name} is ${JSON.stringify(content ?? null)}, which is not in the metadata copy`);
    }
  }
  for (const [name, count] of counts) {
    if (count !== 1) failures.push(`copy: index.html carries ${name} ${count} times, not once`);
  }
  return failures;
}

test('copy: every page-metadata string in index.html is in META_COPY', () => {
  const html = read('../index.html');
  assert.deepEqual(auditMetaCopy(html), []);
  // The title, too, is metadata copy.
  assert.ok(META_COPY.has(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? ''), 'the title is in META_COPY');
});

test('copy: a praising description, a disclaimer in the alt text or a missing tag fails with its own line', () => {
  const html = read('../index.html');
  const mutate = (from: string, to: string): string => {
    const mutated = html.replace(from, to);
    assert.notEqual(mutated, html, 'the mutation must apply');
    return mutated;
  };
  assert.deepEqual(
    auditMetaCopy(mutate('<meta name="description" content="A work history, mapped." />', '<meta name="description" content="An award-winning engineer." />')),
    [`copy: index.html's description is "An award-winning engineer.", which is not in the metadata copy`],
  );
  assert.deepEqual(
    auditMetaCopy(mutate('<meta property="og:image:alt" content="Six', '<meta property="og:image:alt" content="Best viewed on desktop. Six')),
    [`copy: index.html's og:image:alt is "Best viewed on desktop. Six stars on a dark field, one of them white, joined by a faint line, with smaller bodies in orbit.", which is not in the metadata copy`],
  );
  const twitterTitle = /<meta name="twitter:title"[^>]*>\n\s*/.exec(html)?.[0] ?? '<none>';
  assert.deepEqual(auditMetaCopy(mutate(twitterTitle, '')), ['copy: index.html carries twitter:title 0 times, not once']);
  // One tag duplicated and another missing: the total is unchanged, and both still fail.
  const ogTitle = /<meta property="og:title"[^>]*>\n\s*/.exec(html)?.[0] ?? '<none>';
  assert.deepEqual(auditMetaCopy(mutate(twitterTitle, ogTitle)), [
    'copy: index.html carries og:title 2 times, not once',
    'copy: index.html carries twitter:title 0 times, not once',
  ]);
  // Single-quoted attributes are read too: a praising single-quoted description fails.
  assert.deepEqual(
    auditMetaCopy(mutate('<meta name="description" content="A work history, mapped." />', `<meta name='description' content='The best engineer.' />`)),
    [`copy: index.html's description is "The best engineer.", which is not in the metadata copy`],
  );
  assert.deepEqual(
    auditMetaCopy(mutate('<meta name="description" content="A work history, mapped." />', `<meta name='description' content='A work history, mapped.' />`)),
    [],
  );
  // A `data-content=` is not `content=`: a praising description hidden behind one fails.
  assert.deepEqual(
    auditMetaCopy(mutate('<meta name="description" content="A work history, mapped." />', '<meta name="description" data-content="A work history, mapped." content="Visionary." />')),
    [`copy: index.html's description is "Visionary.", which is not in the metadata copy`],
  );
  // A `data-name=` is not `name=`: a tag named only through it is no description, so the description is missing.
  assert.deepEqual(
    auditMetaCopy(mutate('<meta name="description" content="A work history, mapped." />', '<meta data-name="description" content="A work history, mapped." />')),
    ['copy: index.html carries description 0 times, not once'],
  );
  // Names are read case-insensitively: an upper-cased name is still that tag, and its copy is still held.
  assert.deepEqual(
    auditMetaCopy(mutate('<meta property="og:title" content="Thomas Navarro" />', '<meta property="OG:Title" content="Thomas Navarro, award winner" />')),
    [`copy: index.html's og:title is "Thomas Navarro, award winner", which is not in the metadata copy`],
  );
  // A copy-named tag with no content fails rather than being skipped.
  assert.deepEqual(
    auditMetaCopy(mutate('<meta name="twitter:description" content="A work history, mapped." />', '<meta name="twitter:description" />')),
    [`copy: index.html's twitter:description is null, which is not in the metadata copy`],
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
  // 4.10: the one `<main>`, focused by script on arrival, is not a control and draws no outline.
  { at: '', selector: 'main:focus', declarations: ['outline: none'] },
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
    // 4.10: the arrival target's outline rule gone, or widened to every focus.
    ['css', (s) => s.replace('main:focus {\n  outline: none;\n}\n', ''), /^page: the rule `main:focus` is missing$/],
    ['css', (s) => s.replace('main:focus {', ':focus {'), /^page: the rule `main:focus` is missing\npage: the unlisted rule `:focus`$/],
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
  // 4.10, ruling Q1 (b): every non-text indicator on the chart at ink-label, 3:1 and over (`NON_TEXT_ROLES`).
  { at: '', selector: '.chart-chrome a', declarations: ['color: var(--color-ink-label-dark)', 'text-decoration: none', 'border-bottom: 1px solid var(--color-ink-label-dark)'] },
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
  { at: '', selector: '.chart-marker', declarations: ['fill: var(--color-surface-base-dark)', 'stroke: var(--color-ink-label-dark)', 'stroke-width: var(--stroke-body-near)'] },
  // DESIGN.md `components.ring-notable-chart` (4.4, 4.10): ink-label, the hairline, no fill, no dash.
  { at: '', selector: '.chart-ring', declarations: ['fill: none', 'stroke: var(--color-ink-label-dark)', 'stroke-width: var(--stroke-hairline)'] },
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
  { at: '', selector: '.chart-index a', declarations: ['color: var(--color-ink-prose-dark)', 'text-decoration: none', 'border-bottom: 1px solid var(--color-ink-label-dark)'] },
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
  // 4.10: the fragment targets, focused by script on a landing, are not controls and draw no outline.
  { at: '', selector: '.chart-section:focus, .chart-record:focus', declarations: ['outline: none'] },
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
  if (!/<td className="chart-index-notable" role="cell">\s*<svg className="chart-glyph"[^>]*\brole="img" aria-label=\{row\.notable\.label\}/.test(script)) failures.push('chart: the Notable cell is not an image named by the model');
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
    [(s) => s.replace('  fill: var(--color-surface-base-dark);\n  stroke: var(--color-ink-label-dark);\n  stroke-width: var(--stroke-body-near);', '  fill: var(--color-surface-base-dark);\n  stroke: var(--color-stroke-near-dark);\n  stroke-width: var(--stroke-body-near);'), /`\.chart-marker` lacks `stroke: var\(--color-ink-label-dark\)`/],
    [(s) => s.replace('  background: var(--color-surface-raised-dark);\n', ''), /`\.chart-record` lacks `background: var\(--color-surface-raised-dark\)`/],
    // The Deep/Shallow signal (4.4) is the Ring alone, undashed, unfilled, at ink-label (4.10).
    [(s) => s.replace('  fill: none;\n  stroke: var(--color-ink-label-dark);\n  stroke-width: var(--stroke-hairline);', '  fill: var(--color-ink-label-dark);\n  stroke: var(--color-ink-label-dark);\n  stroke-width: var(--stroke-hairline);'), /`\.chart-ring` lacks `fill: none`/],
    [(s) => s.replace('  fill: none;\n  stroke: var(--color-ink-label-dark);', '  fill: none;\n  stroke: var(--color-stroke-near-dark);'), /`\.chart-ring` lacks `stroke: var\(--color-ink-label-dark\)`/],
    [(s) => s.replace('  stroke-width: var(--stroke-hairline);\n}\n\n.chart-glyph', '  stroke-width: var(--stroke-hairline);\n  stroke-dasharray: 2 2;\n}\n\n.chart-glyph'), /`\.chart-ring` carries the unlisted `stroke-dasharray: 2 2`/],
    [(s) => s.replace('  stroke: var(--color-ink-label-dark);\n  stroke-width: var(--stroke-hairline);\n}\n\n.chart-glyph', '  stroke: var(--color-ink-label-dark);\n  stroke-width: var(--stroke-body-near);\n}\n\n.chart-glyph'), /`\.chart-ring` lacks `stroke-width: var\(--stroke-hairline\)`/],
    [(s) => s.replace('.chart-legend {\n  display: flex;', '.chart-legend {\n  display: none;'), /`\.chart-legend` sets display: none/],
    [(s) => s.replace('  .chart-legend {\n    flex-direction: column;', '  .chart-legend {\n    display: none;\n    flex-direction: column;'), /`@media \(max-width: 640px\) \.chart-legend` sets display: none/],
    [(s) => s.replace('.chart-index th:first-child {\n  white-space: nowrap;\n}\n', ''), /`\.chart-index th:first-child` is missing/],
    // 4.5: the chrome row, its links and the span label.
    [(s) => s.replace('  justify-content: space-between;\n', ''), /`\.chart-chrome` lacks `justify-content: space-between`/],
    [(s) => s.replace('.chart-routes:empty {\n  display: none;\n}\n', ''), /`\.chart-routes:empty` is missing/],
    [(s) => s.replace('.chart-routes:empty {', '.chart-routes {'), /`\.chart-routes` sets display: none/],
    [(s) => s.replace('  .chart-chrome {\n    flex-direction: column;', '  .chart-chrome {\n    flex-direction: row;'), /`@media \(max-width: 640px\) \.chart-chrome` lacks `flex-direction: column`/],
    [(s) => s.replace('.chart-chrome a {\n  color: var(--color-ink-label-dark);\n  text-decoration: none;', '.chart-chrome a {\n  color: var(--color-ink-label-dark);\n  text-decoration: underline;'), /`\.chart-chrome a` lacks `text-decoration: none`/],
    [(s) => s.replace('.chart-chrome a {\n  color: var(--color-ink-label-dark);\n  text-decoration: none;\n  border-bottom: 1px solid var(--color-ink-label-dark);', '.chart-chrome a {\n  color: var(--color-ink-label-dark);\n  text-decoration: none;'), /`\.chart-chrome a` lacks `border-bottom/],
    // 4.10: the links' underline back at stroke-near, 2.11:1.
    [(s) => s.replace('.chart-index a {\n  color: var(--color-ink-prose-dark);\n  text-decoration: none;\n  border-bottom: 1px solid var(--color-ink-label-dark);', '.chart-index a {\n  color: var(--color-ink-prose-dark);\n  text-decoration: none;\n  border-bottom: 1px solid var(--color-stroke-near-dark);'), /`\.chart-index a` lacks `border-bottom: 1px solid var\(--color-ink-label-dark\)`/],
    // 4.10: the fragment targets' outline rule gone, or reaching the links' focus too.
    [(s) => s.replace('.chart-section:focus,\n.chart-record:focus {\n  outline: none;\n}\n', ''), /`\.chart-section:focus, \.chart-record:focus` is missing/],
    [(s) => s.replace('.chart-section:focus,\n.chart-record:focus {', '.chart-section:focus,\n.chart-record:focus,\n.chart a:focus {'), /the rule `\.chart-section:focus, \.chart-record:focus` is missing/],
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
    // 4.10: the cell's explicit role is part of the hook.
    [(s) => s.replace('<td className="chart-index-notable" role="cell">', '<td className="chart-index-notable">'), /the Notable cell is not an image named by the model/],
    [(s) => s.replace('<circle className="chart-ring"', '<circle className="chart-ring" stroke="white"'), /a colour on the plate’s markup/],
  ];
  for (const [mutate, message] of tsxCases) {
    const mutated = mutate(tsx);
    assert.notEqual(mutated, tsx, `the mutation ${String(message)} must apply`);
    assert.match(auditChart(css, mutated).join('\n'), message);
  }
});

// --- The Colophon's derivation table (5.2) -----------------------------------------------------------

const COLOPHON_TSX = 'colophon/colophon.tsx';

const COLOPHON_RULES: readonly CssRule[] = [
  { at: '', selector: '.colophon-derivations', declarations: ['max-width: 100%', 'margin: var(--space-xxl) 0', 'border-collapse: collapse', 'border-spacing: 0'] },
  // Review of 5.2: at phone width the cells break rather than push the page sideways.
  { at: '', selector: '.colophon-derivations th, .colophon-derivations td', declarations: ['overflow-wrap: anywhere'] },
  // The rule label and the headers: field-label at ink-label, as the chart index sets its headers.
  {
    at: '',
    selector: '.colophon-derivations th',
    declarations: ['padding: var(--space-sm) var(--space-lg) var(--space-sm) 0', 'text-align: left', 'vertical-align: baseline', ...CHART_TYPE('field-label'), 'color: var(--color-ink-label-dark)'],
  },
  // The Project and Input cells: field-value at ink-prose.
  {
    at: '',
    selector: '.colophon-derivations td',
    declarations: ['padding: var(--space-sm) var(--space-lg) var(--space-sm) 0', 'vertical-align: baseline', ...CHART_TYPE('field-value'), 'color: var(--color-ink-prose-dark)'],
  },
  { at: '', selector: '.colophon-derivations tbody th, .colophon-derivations td', declarations: ['border-top: 1px solid var(--color-surface-edge-dark)'] },
  // The derived quantity, lifted to ink-lift — the device the Notable uses.
  { at: '', selector: '.colophon-derivations .colophon-derived', declarations: ['color: var(--color-ink-lift-dark)'] },
  // The exhibits (5.3, `components.colophon-json`): the raised ground and its
  // 1px left edge, the field-value role in the mono family, structure at
  // ink-label, and a long line scrolling inside the block, never the page.
  {
    at: '',
    selector: '.colophon-exhibit',
    declarations: [
      'margin: 0',
      'padding: var(--space-md) var(--space-lg)',
      'overflow-x: auto',
      'background: var(--color-surface-raised-dark)',
      'border-left: 1px solid var(--color-surface-edge-dark)',
      'font-family: var(--font-mono)',
      ...CHART_TYPE('field-value').filter((line) => !line.startsWith('font-family')),
      'color: var(--color-ink-label-dark)',
    ],
  },
  { at: '', selector: '.colophon-exhibit:focus-visible', declarations: ['outline: 1px solid var(--color-stroke-focus-dark)', 'outline-offset: 3px'] },
  { at: '', selector: '.colophon-exhibit .colophon-json-key', declarations: ['color: var(--color-ink-lift-dark)'] },
  { at: '', selector: '.colophon-exhibit .colophon-json-value', declarations: ['color: var(--color-ink-prose-dark)'] },
  // What is not there (5.4, ruling Q2 (a)): the heading at field-label/ink-label,
  // the prose at notable-prose/ink-prose held to measure-prose, as `.panel-prose`.
  { at: '', selector: '.colophon-heading', declarations: ['margin: var(--space-xxl) 0 var(--space-md)', ...CHART_TYPE('field-label'), 'color: var(--color-ink-label-dark)'] },
  { at: '', selector: '.colophon-prose', declarations: ['margin: 0 0 var(--space-md)', 'max-width: var(--space-measure-prose)', ...CHART_TYPE('notable-prose'), 'color: var(--color-ink-prose-dark)'] },
  // The live re-solve's button (5.5): `.panel-release` declaration for
  // declaration, but for its `::before` hairline and the flex layout that
  // places it — the chrome role set property by property, ink-label at rest,
  // ink-prose raised — plus the exhibits' focus outline, and no pointer while
  // a run is in flight.
  {
    at: '',
    selector: '.colophon-solve',
    declarations: ['margin: var(--space-xl) 0 0', 'padding: 0', 'background: none', 'border: 0', 'cursor: pointer', ...CHART_TYPE('chrome'), 'color: var(--color-ink-label-dark)'],
  },
  // Raised only while it can be pressed: no lift while a run is in flight.
  { at: '', selector: '.colophon-solve:hover:not([aria-disabled="true"]), .colophon-solve:focus-visible:not([aria-disabled="true"])', declarations: ['color: var(--color-ink-prose-dark)'] },
  { at: '', selector: '.colophon-solve:focus-visible', declarations: ['outline: 1px solid var(--color-stroke-focus-dark)', 'outline-offset: 3px'] },
  // While a run is in flight the button is aria-disabled (never `disabled`, which drops focus): no pointer.
  { at: '', selector: '.colophon-solve[aria-disabled="true"]', declarations: ['cursor: default'] },
  { at: '@media (forced-colors: active)', selector: '.colophon-exhibit:focus-visible', declarations: ['outline: 1px solid CanvasText'] },
  { at: '@media (forced-colors: active)', selector: '.colophon-solve:focus-visible', declarations: ['outline: 1px solid CanvasText'] },
];

/**
 * The derivation table's treatment: `colophon.css` exactly, with the identity
 * bans, imported once by `colophon.tsx`; no hex, radius, shadow or filter; and
 * the markup's hooks: the table's class, four `th scope="col"` drawn from
 * `DERIVATION_LABELS`, each row's rule a `th scope="row"`, the Project and
 * Input cells plain value cells, and the derived cell marked
 * `colophon-derived`. The exhibits (5.3): one `<pre>` drawn, a region named by
 * its `name`, focusable, classed `colophon-exhibit`, its runs `jsonRuns(text)`
 * — keys in `span.colophon-json-key`, values in `span.colophon-json-value`,
 * structure bare — and the two drawn career, table, layout, each named off
 * `EXHIBIT_PATHS`. What is not there (5.4): after the layout exhibit, one
 * `<h2 className="colophon-heading">{ABSENCES_HEADING}</h2>`, then one
 * `<p className="colophon-prose">` per `ABSENCES` entry, keyed by its name,
 * from `./absences.ts`; no `<section>`. The live re-solve (5.5), last: one
 * `<h2 className="colophon-heading">{LIVE_SOLVE.heading}</h2>`, one
 * `<p className="colophon-prose">{LIVE_SOLVE.framing}</p>`, one
 * `<button type="button" className="colophon-solve" aria-disabled={running}
 * onClick={onSolve}>{LIVE_SOLVE.action}</button>`, and the result drawn by the
 * same `Exhibit`, named `LIVE_SOLVE.result`, from `./live-solve.ts`. No inline
 * style.
 */
function auditColophon(css: string, tsx: string): string[] {
  const failures = [...auditBans('colophon', css), ...auditDeclarations('colophon', css, COLOPHON_RULES)];
  const code = codeOf(css, 'css');
  if (/#[0-9a-f]{3,8}\b/i.test(code)) failures.push('colophon: a hex colour — every colour is a token');
  if (/\b(?:border-radius|box-shadow|text-shadow|filter)\s*:/.test(code)) failures.push('colophon: a radius, shadow or filter — corners are square and nothing glows');
  const script = codeOf(tsx, 'script');
  if ((script.match(/^import\s+'\.\/colophon\.css'\s*;/gm) ?? []).length !== 1) failures.push('colophon: colophon.tsx does not import ./colophon.css, once');
  if (!/<table className="colophon-derivations">/.test(script)) failures.push('colophon: the derivation table does not carry its class');
  const headers = [...script.matchAll(/<th scope="col">\{DERIVATION_LABELS\.(\w+)\}<\/th>/g)].map((match) => match[1]);
  if (JSON.stringify(headers) !== JSON.stringify(['rule', 'project', 'input', 'output'])) failures.push('colophon: the headers are not four th scope="col" from DERIVATION_LABELS, in order');
  if (!/<th scope="row">\{row\.rule\}<\/th>/.test(script)) failures.push('colophon: the rule label is not a th scope="row"');
  if (!/<td>\{row\.project\}<\/td>\s*<td>\s*<Input input=\{row\.input\} \/>\s*<\/td>/.test(script)) failures.push('colophon: the Project and Input cells are not plain value cells');
  if (!/<td className="colophon-derived">\{String\(row\.output\)\}<\/td>/.test(script)) failures.push('colophon: the derived cell is not marked colophon-derived');
  if ((script.match(/<pre\b/g) ?? []).length !== 1 || !/<pre className="colophon-exhibit" role="region" aria-label=\{name\} tabIndex=\{0\}>/.test(script)) {
    failures.push('colophon: the exhibit is not one <pre className="colophon-exhibit" role="region" aria-label={name} tabIndex={0}>');
  }
  if (!/\{jsonRuns\(text\)\.map\(/.test(script) || !/^import \{ jsonRuns \} from '\.\/json-setting\.ts';$/m.test(script)) failures.push('colophon: the exhibit’s text is not jsonRuns(text), from ./json-setting.ts');
  if (!/if \(run\.kind === 'key'\) return <span key=\{index\} className="colophon-json-key">\{run\.text\}<\/span>;/.test(script)) failures.push('colophon: a key run is not a span.colophon-json-key');
  if (!/if \(run\.kind === 'value'\) return <span key=\{index\} className="colophon-json-value">\{run\.text\}<\/span>;\s*return run\.text;/.test(script)) failures.push('colophon: a value run is not a span.colophon-json-value, or structure is not bare text');
  if (!/<Exhibit name=\{EXHIBIT_PATHS\.career\.slice\(1\)\} text=\{exhibits\.career\} \/>\s*<Derivations layout=\{exhibits\.layout\} \/>\s*<Exhibit name=\{EXHIBIT_PATHS\.layout\.slice\(1\)\} text=\{exhibits\.layout\} \/>/.test(script)) {
    failures.push('colophon: the exhibits are not career, table, layout, each named off EXHIBIT_PATHS');
  }
  if (
    !/<Exhibit name=\{EXHIBIT_PATHS\.layout\.slice\(1\)\} text=\{exhibits\.layout\} \/>\s*<h2 className="colophon-heading">\{ABSENCES_HEADING\}<\/h2>\s*\{Object\.entries\(ABSENCES\)\.map\(\(\[key, text\]\) => \(\s*<p key=\{key\} className="colophon-prose">\s*\{text\}\s*<\/p>\s*\)\)\}\s*<h2 className="colophon-heading">\{LIVE_SOLVE\.heading\}/.test(script)
  ) {
    failures.push('colophon: what is not there is not the h2.colophon-heading then one p.colophon-prose per ABSENCES entry, after the layout exhibit');
  }
  if (
    !/\)\)\}\s*<h2 className="colophon-heading">\{LIVE_SOLVE\.heading\}<\/h2>\s*<p className="colophon-prose">\{LIVE_SOLVE\.framing\}<\/p>\s*<button type="button" className="colophon-solve" aria-disabled=\{running\} onClick=\{onSolve\}>\s*\{LIVE_SOLVE\.action\}\s*<\/button>\s*\{solved === null \? null : <Exhibit name=\{LIVE_SOLVE\.result\} text=\{solved\} \/>\}\s*<\/>/.test(script)
  ) {
    failures.push('colophon: the live re-solve is not the h2.colophon-heading, the p.colophon-prose framing, the button.colophon-solve and the result Exhibit named LIVE_SOLVE.result, after what is not there');
  }
  if ((script.match(/<h2\b/g) ?? []).length !== 2 || (script.match(/<p\b/g) ?? []).length !== 2) failures.push('colophon: a heading or paragraph other than the absences’ and the live re-solve’s');
  if ((script.match(/<button\b/g) ?? []).length !== 1) failures.push('colophon: a button other than the live re-solve’s');
  if (!/^import \{ LIVE_SOLVE, createLiveSolve \} from '\.\/live-solve\.ts';$/m.test(script)) failures.push('colophon: the live re-solve’s copy is not read from ./live-solve.ts');
  if (/<section\b/.test(script)) failures.push('colophon: a <section> — the page’s one landmark is the host’s <main>');
  if (!/^import \{ ABSENCES, ABSENCES_HEADING \} from '\.\/absences\.ts';$/m.test(script)) failures.push('colophon: the absences are not read from ./absences.ts');
  if (/\bstyle=\{/.test(script)) failures.push('colophon: an inline style — the treatment is the stylesheet’s');
  return failures;
}

test('colophon: the derivation table’s stylesheet, declaration by declaration, and its markup’s hooks', () => {
  assert.deepEqual(auditColophon(read(`./${COLOPHON_CSS}`), read(`./${COLOPHON_TSX}`)), []);
});

test('colophon: each guarantee removed fails with its own line', () => {
  const css = read(`./${COLOPHON_CSS}`);
  const tsx = read(`./${COLOPHON_TSX}`);
  const cssCases: readonly (readonly [(source: string) => string, RegExp])[] = [
    // The rule label and headers off field-label or ink-label.
    [(s) => s.replace('  font-size: var(--type-field-label-font-size);\n', '  font-size: var(--type-field-value-font-size);\n'), /`\.colophon-derivations th` lacks `font-size: var\(--type-field-label-font-size\)`/],
    [(s) => s.replace(/(\.colophon-derivations th \{[^}]*color: )var\(--color-ink-label-dark\)/, '$1var(--color-ink-prose-dark)'), /`\.colophon-derivations th` lacks `color: var\(--color-ink-label-dark\)`/],
    // The value cells off field-value or ink-prose.
    [(s) => s.replace('  font-family: var(--type-field-value-font-family);\n', '  font-family: var(--type-field-label-font-family);\n'), /`\.colophon-derivations td` lacks `font-family: var\(--type-field-value-font-family\)`/],
    [(s) => s.replace(/(\.colophon-derivations td \{[^}]*color: )var\(--color-ink-prose-dark\)/, '$1var(--color-ink-lift-dark)'), /`\.colophon-derivations td` lacks `color: var\(--color-ink-prose-dark\)`/],
    // The derived cell not lifted, or its rule weakened below the value cells' specificity.
    [(s) => s.replace('.colophon-derivations .colophon-derived {\n  color: var(--color-ink-lift-dark);', '.colophon-derivations .colophon-derived {\n  color: var(--color-ink-prose-dark);'), /`\.colophon-derivations \.colophon-derived` lacks `color: var\(--color-ink-lift-dark\)`/],
    [(s) => s.replace('.colophon-derivations .colophon-derived {', '.colophon-derived {'), /the rule `\.colophon-derivations \.colophon-derived` is missing/],
    // The narrow-width guard: the table unbounded, or its cells unbreakable.
    [(s) => s.replace('  max-width: 100%;\n', ''), /`\.colophon-derivations` lacks `max-width: 100%`/],
    [(s) => s.replace('  overflow-wrap: anywhere;\n', ''), /`\.colophon-derivations th, \.colophon-derivations td` lacks `overflow-wrap: anywhere`/],
    // A hue, a radius, a shadow, a literal weight, a transform, an unlisted rule.
    [(s) => s.replace('color: var(--color-ink-lift-dark);', 'color: #F2F2F4;'), /colophon: a hex colour/],
    [(s) => s.replace('  border-spacing: 0;\n', '  border-spacing: 0;\n  border-radius: 4px;\n'), /colophon: a radius, shadow or filter/],
    [(s) => s.replace('  color: var(--color-ink-lift-dark);\n', '  color: var(--color-ink-lift-dark);\n  text-shadow: 0 0 4px white;\n'), /colophon: a radius, shadow or filter/],
    [(s) => s.replace('font-weight: var(--type-field-label-font-weight)', 'font-weight: 700'), /^colophon: a literal font-weight/],
    [(s) => s.replace('  text-align: left;\n', '  text-align: left;\n  text-transform: uppercase;\n'), /^colophon: text-transform/],
    [(s) => `${s}\n.colophon-derivations caption {\n  color: var(--color-ink-label-dark);\n}\n`, /^colophon: the unlisted rule `\.colophon-derivations caption`$/m],
    // 5.3: the exhibit off its ground, its edge, its family, its role, its scroll; folded or wrapped; its focus outline or the forced-colours one gone; a key or value off its ink.
    [(s) => s.replace('  background: var(--color-surface-raised-dark);\n', ''), /`\.colophon-exhibit` lacks `background: var\(--color-surface-raised-dark\)`/],
    [(s) => s.replace('  border-left: 1px solid var(--color-surface-edge-dark);\n  font-family', '  border-left: 2px solid var(--color-surface-edge-dark);\n  font-family'), /`\.colophon-exhibit` lacks `border-left: 1px solid var\(--color-surface-edge-dark\)`/],
    [(s) => s.replace('  font-family: var(--font-mono);\n', '  font-family: var(--type-field-value-font-family);\n'), /`\.colophon-exhibit` lacks `font-family: var\(--font-mono\)`/],
    [(s) => s.replace('  overflow-x: auto;\n', ''), /`\.colophon-exhibit` lacks `overflow-x: auto`/],
    [(s) => s.replace('  overflow-x: auto;\n', '  overflow-x: auto;\n  max-height: 40em;\n  overflow-y: auto;\n'), /`\.colophon-exhibit` carries the unlisted `max-height: 40em`/],
    [(s) => s.replace('  overflow-x: auto;\n', '  overflow-x: auto;\n  white-space: pre-wrap;\n'), /`\.colophon-exhibit` carries the unlisted `white-space: pre-wrap`/],
    [(s) => s.replace('  margin: 0;\n  padding: var(--space-md) var(--space-lg);\n', '  margin: 0;\n  padding: var(--space-md);\n'), /`\.colophon-exhibit` lacks `padding: var\(--space-md\) var\(--space-lg\)`/],
    [(s) => s.replace('  line-height: var(--type-field-value-line-height);\n  letter-spacing: var(--type-field-value-letter-spacing);\n  color: var(--color-ink-label-dark);', '  line-height: 1.7;\n  letter-spacing: var(--type-field-value-letter-spacing);\n  color: var(--color-ink-label-dark);'), /`\.colophon-exhibit` lacks `line-height: var\(--type-field-value-line-height\)`/],
    [(s) => s.replace('.colophon-exhibit:focus-visible {\n  outline: 1px solid var(--color-stroke-focus-dark);', '.colophon-exhibit:focus-visible {\n  outline: none;'), /`\.colophon-exhibit:focus-visible` lacks `outline: 1px solid var\(--color-stroke-focus-dark\)`/],
    [(s) => s.replace('    outline: 1px solid CanvasText;\n', ''), /`@media \(forced-colors: active\) \.colophon-exhibit:focus-visible` lacks `outline: 1px solid CanvasText`/],
    [(s) => s.replace('.colophon-exhibit .colophon-json-key {\n  color: var(--color-ink-lift-dark);', '.colophon-exhibit .colophon-json-key {\n  color: var(--color-ink-prose-dark);'), /`\.colophon-exhibit \.colophon-json-key` lacks `color: var\(--color-ink-lift-dark\)`/],
    [(s) => s.replace('.colophon-exhibit .colophon-json-value {\n  color: var(--color-ink-prose-dark);', '.colophon-exhibit .colophon-json-value {\n  color: var(--color-ink-lift-dark);'), /`\.colophon-exhibit \.colophon-json-value` lacks `color: var\(--color-ink-prose-dark\)`/],
    [(s) => s.replace('  border-left: 1px solid var(--color-surface-edge-dark);\n  font-family', '  border-left: 1px solid var(--color-surface-edge-dark);\n  border-radius: 2px;\n  font-family'), /colophon: a radius, shadow or filter/],
    [(s) => `${s}\n.colophon-exhibit .colophon-json-key {\n  color: #7FB8FF;\n}\n`, /colophon: a hex colour/],
    // 5.4: the heading off field-label, ink-label or its margin; the prose off notable-prose, ink-prose or the measure; bold, a transform.
    [(s) => s.replace('.colophon-heading {\n  margin: var(--space-xxl) 0 var(--space-md);', '.colophon-heading {\n  margin: var(--space-xl) 0 var(--space-md);'), /`\.colophon-heading` lacks `margin: var\(--space-xxl\) 0 var\(--space-md\)`/],
    [(s) => s.replace(/(\.colophon-heading \{[^}]*)font-size: var\(--type-field-label-font-size\)/, '$1font-size: var(--type-notable-prose-font-size)'), /`\.colophon-heading` lacks `font-size: var\(--type-field-label-font-size\)`/],
    [(s) => s.replace(/(\.colophon-heading \{[^}]*color: )var\(--color-ink-label-dark\)/, '$1var(--color-ink-lift-dark)'), /`\.colophon-heading` lacks `color: var\(--color-ink-label-dark\)`/],
    [(s) => s.replace(/(\.colophon-heading \{[^}]*)font-weight: var\(--type-field-label-font-weight\)/, '$1font-weight: bold'), /`\.colophon-heading` lacks `font-weight: var\(--type-field-label-font-weight\)`/],
    [(s) => s.replace('.colophon-heading {\n', '.colophon-heading {\n  text-transform: uppercase;\n'), /^colophon: text-transform/m],
    [(s) => s.replace('  max-width: var(--space-measure-prose);\n', ''), /`\.colophon-prose` lacks `max-width: var\(--space-measure-prose\)`/],
    [(s) => s.replace(/(\.colophon-prose \{[^}]*)font-family: var\(--type-notable-prose-font-family\)/, '$1font-family: var(--type-field-value-font-family)'), /`\.colophon-prose` lacks `font-family: var\(--type-notable-prose-font-family\)`/],
    [(s) => s.replace(/(\.colophon-prose \{[^}]*)line-height: var\(--type-notable-prose-line-height\)/, '$1line-height: 1.5'), /`\.colophon-prose` lacks `line-height: var\(--type-notable-prose-line-height\)`/],
    [(s) => s.replace(/(\.colophon-prose \{[^}]*color: )var\(--color-ink-prose-dark\)/, '$1var(--color-ink-lift-dark)'), /`\.colophon-prose` lacks `color: var\(--color-ink-prose-dark\)`/],
    [(s) => s.replace('.colophon-prose {\n  margin: 0 0 var(--space-md);', '.colophon-prose {\n  margin: 0;'), /`\.colophon-prose` lacks `margin: 0 0 var\(--space-md\)`/],
    [(s) => `${s}\n.colophon-prose strong {\n  color: var(--color-ink-lift-dark);\n}\n`, /^colophon: the unlisted rule `\.colophon-prose strong`$/m],
    // 5.5: the button off the chrome role or ink-label; raised off ink-prose; its focus outline or the forced-colours one gone; the pointer kept while disabled; a box, a bold, a transform, a shorthand.
    [(s) => s.replace(/(\.colophon-solve \{[^}]*)font-size: var\(--type-chrome-font-size\)/, '$1font-size: var(--type-field-value-font-size)'), /`\.colophon-solve` lacks `font-size: var\(--type-chrome-font-size\)`/],
    [(s) => s.replace(/(\.colophon-solve \{[^}]*color: )var\(--color-ink-label-dark\)/, '$1var(--color-ink-prose-dark)'), /`\.colophon-solve` lacks `color: var\(--color-ink-label-dark\)`/],
    [(s) => s.replace('.colophon-solve:focus-visible:not([aria-disabled="true"]) {\n  color: var(--color-ink-prose-dark);', '.colophon-solve:focus-visible:not([aria-disabled="true"]) {\n  color: var(--color-ink-lift-dark);'), /`\.colophon-solve:hover:not\(\[aria-disabled="true"\]\), \.colophon-solve:focus-visible:not\(\[aria-disabled="true"\]\)` lacks `color: var\(--color-ink-prose-dark\)`/],
    [(s) => s.replace('.colophon-solve:focus-visible {\n  outline: 1px solid var(--color-stroke-focus-dark);', '.colophon-solve:focus-visible {\n  outline: none;'), /`\.colophon-solve:focus-visible` lacks `outline: 1px solid var\(--color-stroke-focus-dark\)`/],
    [(s) => s.replace('  .colophon-solve:focus-visible {\n    outline: 1px solid CanvasText;\n  }\n', ''), /`@media \(forced-colors: active\) \.colophon-solve:focus-visible` lacks `outline: 1px solid CanvasText`|the rule `@media \(forced-colors: active\) \.colophon-solve:focus-visible` is missing/],
    [(s) => s.replace('.colophon-solve[aria-disabled="true"] {\n  cursor: default;', '.colophon-solve[aria-disabled="true"] {\n  cursor: pointer;'), /`\.colophon-solve\[aria-disabled="true"\]` lacks `cursor: default`/],
    // The lift applied while a run is in flight, or the cursor rule keyed on `:disabled` again.
    [(s) => s.replaceAll(':not([aria-disabled="true"])', ''), /the rule `\.colophon-solve:hover:not\(\[aria-disabled="true"\]\), \.colophon-solve:focus-visible:not\(\[aria-disabled="true"\]\)` is missing/],
    [(s) => s.replace('.colophon-solve[aria-disabled="true"] {', '.colophon-solve:disabled {'), /the rule `\.colophon-solve\[aria-disabled="true"\]` is missing/],
    [(s) => s.replace(/(\.colophon-solve \{[^}]*)border: 0;/, '$1border: 1px solid var(--color-stroke-rest-dark);'), /`\.colophon-solve` lacks `border: 0`/],
    [(s) => s.replace(/(\.colophon-solve \{[^}]*)border: 0;/, '$1border: 0;\n  border-radius: 2px;'), /colophon: a radius, shadow or filter/],
    [(s) => s.replace(/(\.colophon-solve \{[^}]*)font-weight: var\(--type-chrome-font-weight\)/, '$1font-weight: 600'), /^colophon: a literal font-weight/m],
    [(s) => s.replace('.colophon-solve {\n', '.colophon-solve {\n  text-transform: lowercase;\n'), /^colophon: text-transform/m],
    [(s) => s.replace(/(\.colophon-solve \{[^}]*)font-family: var\(--type-chrome-font-family\);\n  font-size: var\(--type-chrome-font-size\);/, '$1font: var(--type-chrome-font-size) var(--type-chrome-font-family);'), /`\.colophon-solve` lacks `font-family: var\(--type-chrome-font-family\)`/],
    [(s) => `${s}\n.colophon-solve::before {\n  content: '';\n}\n`, /^colophon: the unlisted rule `\.colophon-solve::before`$/m],
  ];
  for (const [mutate, message] of cssCases) {
    const mutated = mutate(css);
    assert.notEqual(mutated, css, `the mutation ${String(message)} must apply`);
    assert.match(auditColophon(mutated, tsx).join('\n'), message);
  }
  const tsxCases: readonly (readonly [(source: string) => string, RegExp])[] = [
    [(s) => s.replace("import './colophon.css';\n", ''), /colophon\.tsx does not import \.\/colophon\.css, once/],
    [(s) => s.replace("import './colophon.css';\n", "import './colophon.css';\nimport './colophon.css';\n"), /colophon\.tsx does not import \.\/colophon\.css, once/],
    [(s) => s.replace('<table className="colophon-derivations">', '<table>'), /the derivation table does not carry its class/],
    [(s) => s.replace('<th scope="col">{DERIVATION_LABELS.input}</th>', '<th>{DERIVATION_LABELS.input}</th>'), /the headers are not four th scope="col"/],
    [(s) => s.replace('<th scope="row">{row.rule}</th>', '<td>{row.rule}</td>'), /the rule label is not a th scope="row"/],
    [(s) => s.replace('<td>\n              <Input input={row.input} />', '<td className="colophon-derived">\n              <Input input={row.input} />'), /the Project and Input cells are not plain value cells/],
    [(s) => s.replace('<td className="colophon-derived">{String(row.output)}</td>', '<td>{String(row.output)}</td>'), /the derived cell is not marked colophon-derived/],
    [(s) => s.replace('<table className="colophon-derivations">', '<table className="colophon-derivations" style={{ margin: 0 }}>'), /an inline style/],
    // 5.3: the exhibit's name, role, focus or class dropped; a second <pre>; its runs unset; a span class swapped; the names or the order off.
    [(s) => s.replace(' aria-label={name}', ''), /the exhibit is not one <pre className="colophon-exhibit"/],
    [(s) => s.replace(' role="region"', ''), /the exhibit is not one <pre className="colophon-exhibit"/],
    [(s) => s.replace(' tabIndex={0}', ''), /the exhibit is not one <pre className="colophon-exhibit"/],
    [(s) => s.replace('<pre className="colophon-exhibit"', '<pre'), /the exhibit is not one <pre className="colophon-exhibit"/],
    [(s) => s.replace('<Derivations layout={exhibits.layout} />', '<Derivations layout={exhibits.layout} />\n          <pre>{exhibits.layout}</pre>'), /the exhibit is not one <pre className="colophon-exhibit"/],
    [(s) => s.replace('{jsonRuns(text).map(', '{[{ kind: \'structure\', text }].map('), /the exhibit’s text is not jsonRuns\(text\)/],
    [(s) => s.replace('className="colophon-json-key"', 'className="colophon-json-value"'), /a key run is not a span\.colophon-json-key/],
    [(s) => s.replace('className="colophon-json-value"', 'className="colophon-json-key"'), /a value run is not a span\.colophon-json-value/],
    [(s) => s.replace('return run.text;', 'return <span key={index}>{run.text}</span>;'), /structure is not bare text/],
    [(s) => s.replace('<Exhibit name={EXHIBIT_PATHS.career.slice(1)}', '<Exhibit name="career.json"'), /the exhibits are not career, table, layout/],
    [(s) => s.replace('<Exhibit name={EXHIBIT_PATHS.layout.slice(1)} text={exhibits.layout} />', '<Exhibit name={EXHIBIT_PATHS.layout.slice(1)} text={exhibits.career} />'), /the exhibits are not career, table, layout/],
    // 5.4: the heading unclassed, an h3, its constant replaced; the prose unclassed, drawn from elsewhere, before the layout; a second paragraph; a section; the import off.
    [(s) => s.replace('<h2 className="colophon-heading">', '<h2>'), /what is not there is not the h2\.colophon-heading/],
    [(s) => s.replace('<h2 className="colophon-heading">{ABSENCES_HEADING}</h2>', '<h3 className="colophon-heading">{ABSENCES_HEADING}</h3>'), /what is not there is not the h2\.colophon-heading/],
    [(s) => s.replace('<p key={key} className="colophon-prose">', '<p key={key}>'), /what is not there is not the h2\.colophon-heading/],
    [(s) => s.replace('{Object.entries(ABSENCES).map(', '{Object.entries(DERIVATION_LABELS).map('), /what is not there is not the h2\.colophon-heading/],
    [
      (s) => s.replace('<Exhibit name={EXHIBIT_PATHS.layout.slice(1)} text={exhibits.layout} />\n          <h2', '<h2').replace('          ))}\n          <h2 className="colophon-heading">{LIVE_SOLVE.heading}', '          ))}\n          <Exhibit name={EXHIBIT_PATHS.layout.slice(1)} text={exhibits.layout} />\n          <h2 className="colophon-heading">{LIVE_SOLVE.heading}'),
      /what is not there is not the h2\.colophon-heading/,
    ],
    [(s) => s.replace('<h1>the model</h1>', '<h1>the model</h1>\n      <p className="colophon-prose">{ABSENCES.thesis}</p>'), /a heading or paragraph other than the absences’/],
    [(s) => s.replace('<h2 className="colophon-heading">', '<section>\n          <h2 className="colophon-heading">').replace('          ))}\n          <h2 className="colophon-heading">{LIVE_SOLVE.heading}', '          ))}\n          </section>\n          <h2 className="colophon-heading">{LIVE_SOLVE.heading}'), /a <section>/],
    [(s) => s.replace("import { ABSENCES, ABSENCES_HEADING } from './absences.ts';", "import { ABSENCES, ABSENCES_HEADING } from './copy.ts';"), /the absences are not read from \.\/absences\.ts/],
    // 5.5: the button dropped, unclassed, a submit, never disabled, unwired; the label or heading off its constant; the result misnamed or drawn in a bare <pre>; the block before the absences; a status line; a second button; the import off.
    [(s) => s.replace(/\s*<button type="button" className="colophon-solve"[^>]*>\s*\{LIVE_SOLVE\.action\}\s*<\/button>/, ''), /the live re-solve is not the h2\.colophon-heading/],
    [(s) => s.replace('<button type="button" className="colophon-solve"', '<button type="button"'), /the live re-solve is not the h2\.colophon-heading/],
    [(s) => s.replace('<button type="button" className="colophon-solve"', '<button type="submit" className="colophon-solve"'), /the live re-solve is not the h2\.colophon-heading/],
    [(s) => s.replace(' aria-disabled={running}', ''), /the live re-solve is not the h2\.colophon-heading/],
    // `disabled` would drop keyboard focus from the pressed button.
    [(s) => s.replace(' aria-disabled={running}', ' disabled={running}'), /the live re-solve is not the h2\.colophon-heading/],
    [(s) => s.replace(' onClick={onSolve}', ''), /the live re-solve is not the h2\.colophon-heading/],
    [(s) => s.replace('{LIVE_SOLVE.action}', '{LIVE_SOLVE.heading}'), /the live re-solve is not the h2\.colophon-heading/],
    [(s) => s.replace('<h2 className="colophon-heading">{LIVE_SOLVE.heading}</h2>', '<h3 className="colophon-heading">{LIVE_SOLVE.heading}</h3>'), /the live re-solve is not the h2\.colophon-heading/],
    [(s) => s.replace('<Exhibit name={LIVE_SOLVE.result} text={solved} />', '<Exhibit name={EXHIBIT_PATHS.layout.slice(1)} text={solved} />'), /the live re-solve is not the h2\.colophon-heading/],
    [(s) => s.replace('<Exhibit name={LIVE_SOLVE.result} text={solved} />', '<pre aria-label={LIVE_SOLVE.result}>{solved}</pre>'), /the exhibit is not one <pre className="colophon-exhibit"/],
    [(s) => s.replace('<p className="colophon-prose">{LIVE_SOLVE.framing}</p>', '<p className="colophon-prose">{LIVE_SOLVE.framing}</p>\n          <p className="colophon-prose">{LIVE_SOLVE.result}</p>'), /a heading or paragraph other than the absences’ and the live re-solve’s/],
    [(s) => s.replace('            {LIVE_SOLVE.action}\n          </button>', '            {LIVE_SOLVE.action}\n          </button>\n          <button type="button">{LIVE_SOLVE.action}</button>'), /a button other than the live re-solve’s/],
    [(s) => s.replace("import { LIVE_SOLVE, createLiveSolve } from './live-solve.ts';", "import { LIVE_SOLVE, createLiveSolve } from './copy.ts';"), /the live re-solve’s copy is not read from \.\/live-solve\.ts/],
  ];
  for (const [mutate, message] of tsxCases) {
    const mutated = mutate(tsx);
    assert.notEqual(mutated, tsx, `the mutation ${String(message)} must apply`);
    assert.match(auditColophon(css, mutated).join('\n'), message);
  }
});

// --- Monospace: the exhibits alone (5.3) ------------------------------------------------------------

/** The one rule that may set the mono family. */
const MONO_RULE = { path: COLOPHON_CSS, selector: '.colophon-exhibit' } as const;

/**
 * The mono family is the Colophon's JSON body's, and nowhere else's
 * (DESIGN.md §3, §7.11): over every shipped file under `src/` (`shippedFiles`,
 * the tokens skipped), `--font-mono` is named exactly once, by the one
 * `.colophon-exhibit` rule's `font-family`; the word `monospace` appears in no
 * file at all, comments included; no `.tsx` draws `<code>`, `<kbd>`, `<samp>`
 * or `<tt>`, and only `colophon.tsx` draws `<pre>`; no model reads the mono
 * family off the tokens; and every `var(--…)` a stylesheet reads is a custom
 * property `tokens.css` defines, so the family named is a real token.
 */
function auditMonospace(files: Readonly<Record<string, string>>, tokensCss: string): string[] {
  const failures: string[] = [];
  const tokenNames = new Set([...codeOf(tokensCss, 'css').matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
  let named = 0;
  for (const [path, source] of Object.entries(files)) {
    const where = `src/${path}`;
    if (/monospace/i.test(source)) failures.push(`monospace: ${where} names monospace — the family is the token's, and the exhibits' alone`);
    const language = languageOf(path);
    if (language === undefined) continue;
    const code = codeOf(source, language);
    const mentions = (code.match(/--font-mono\b/g) ?? []).length;
    named += mentions;
    if (mentions > 0 && path !== MONO_RULE.path) failures.push(`monospace: ${where} names --font-mono — only ${MONO_RULE.selector} sets it`);
    if (language === 'css') {
      for (const rule of parseCss(source)) {
        for (const declaration of rule.declarations) {
          for (const [, name] of declaration.matchAll(/var\(\s*(--[\w-]+)/g)) {
            if (!tokenNames.has(name)) failures.push(`monospace: ${where} \`${rule.selector}\` reads ${name}, which no token defines`);
          }
          if (/--font-mono\b/.test(declaration) && !(path === MONO_RULE.path && rule.at === '' && rule.selector === MONO_RULE.selector && declaration === 'font-family: var(--font-mono)')) {
            failures.push(`monospace: ${where} \`${rule.at === '' ? '' : `${rule.at} `}${rule.selector}\` sets ${declaration} — only ${MONO_RULE.selector}'s font-family is the mono family`);
          }
        }
      }
    }
    if (language === 'script') {
      if (/\bfontFamily\s*(?:\.\s*mono\b|\[\s*['"]mono['"]\s*\])/.test(code)) failures.push(`monospace: ${where} reads the mono family off the tokens — only ${MONO_RULE.selector} sets it`);
      if (path.endsWith('.tsx')) {
        const tag = /<(code|kbd|samp|tt)\b/.exec(code);
        if (tag !== null) failures.push(`monospace: ${where} draws <${tag[1]}> — set in a mono face by the browser`);
        if (/<pre\b/.test(code) && path !== 'colophon/colophon.tsx') failures.push(`monospace: ${where} draws <pre> — only the Colophon's exhibits do`);
      }
    }
  }
  if (named !== 1) failures.push(`monospace: --font-mono is named ${named} times in shipped source — exactly once, by ${MONO_RULE.selector}`);
  return failures;
}

test('monospace: the mono family is the exhibits’ alone, and every var(--…) a stylesheet reads is a token', () => {
  const files = shippedFiles();
  assert.ok(COLOPHON_CSS in files && 'render-fallback/chart.tsx' in files && 'colophon/json-setting.ts' in files, 'the walk reaches the stylesheets, the renderers and the setting');
  assert.ok(!Object.keys(files).some((path) => path.startsWith('tokens/')), 'the tokens, which define the family, are skipped');
  assert.equal(tokens.typography.fontFamily.mono, 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace', 'the family is the system mono stack, a token');
  assert.deepEqual(auditMonospace(files, read('./tokens/tokens.css')), []);
});

test('monospace: each guarantee removed fails with its own line', () => {
  const files = shippedFiles();
  const tokensCss = read('./tokens/tokens.css');
  const edit = (path: string, change: (source: string) => string): Record<string, string> => {
    const source = files[path];
    assert.ok(source !== undefined, `${path} is shipped`);
    const changed = change(source);
    assert.notEqual(changed, source, `the mutation of ${path} must apply`);
    return { ...files, [path]: changed };
  };
  for (const [name, mutated, message] of [
    ['the family on a second rule', edit(CHART_CSS, (s) => `${s}\n.chart-index td {\n  font-family: var(--font-mono);\n}\n`), /^monospace: src\/render-fallback\/chart\.css names --font-mono/m],
    ['the family on another Colophon rule', edit(COLOPHON_CSS, (s) => s.replace('.colophon-derivations td {\n  padding', '.colophon-derivations td {\n  font-family: var(--font-mono);\n  padding')), /^monospace: src\/colophon\/colophon\.css `\.colophon-derivations td` sets font-family: var\(--font-mono\)/m],
    ['the family dropped', edit(COLOPHON_CSS, (s) => s.replace('  font-family: var(--font-mono);\n', '  font-family: var(--type-field-value-font-family);\n')), /^monospace: --font-mono is named 0 times in shipped source/m],
    ['a literal stack', edit(CHART_CSS, (s) => `${s}\n.chart-index td {\n  font-family: Menlo, monospace;\n}\n`), /^monospace: src\/render-fallback\/chart\.css names monospace/m],
    ['the word in a comment', edit('colophon/colophon.tsx', (s) => s.replace(' * The surface as drawn:', ' * In a monospace face. The surface as drawn:')), /^monospace: src\/colophon\/colophon\.tsx names monospace/m],
    ['the family in a model', edit(AFFORDANCE_TS, (s) => s.replace('fontFamily: type.fontFamily,', 'fontFamily: tokens.typography.fontFamily.mono,')), /^monospace: src\/render-scene\/affordance-model\.ts reads the mono family off the tokens/m],
    ['a <code> drawn', edit('render-fallback/chart.tsx', (s) => s.replace('<h1 className="chart-heading">', '<code>x</code>\n<h1 className="chart-heading">')), /^monospace: src\/render-fallback\/chart\.tsx draws <code>/m],
    ['a <kbd> drawn', edit('shell/index-nav.tsx', (s) => s.replace('<button type="button" id={OVERVIEW_ID}', '<kbd>Tab</kbd><button type="button" id={OVERVIEW_ID}')), /^monospace: src\/shell\/index-nav\.tsx draws <kbd>/m],
    ['a <samp> drawn', edit('colophon/colophon.tsx', (s) => s.replace('<h1>the model</h1>', '<samp>x</samp><h1>the model</h1>')), /^monospace: src\/colophon\/colophon\.tsx draws <samp>/m],
    ['a <tt> drawn', edit('colophon/colophon.tsx', (s) => s.replace('<h1>the model</h1>', '<tt>x</tt><h1>the model</h1>')), /^monospace: src\/colophon\/colophon\.tsx draws <tt>/m],
    ['a <pre> elsewhere', edit('render-fallback/chart.tsx', (s) => s.replace('<h1 className="chart-heading">', '<pre>x</pre>\n<h1 className="chart-heading">')), /^monospace: src\/render-fallback\/chart\.tsx draws <pre>/m],
    ['an undefined family', edit(COLOPHON_CSS, (s) => s.replace('  font-family: var(--font-mono);\n', '  font-family: var(--font-code);\n')), /^monospace: src\/colophon\/colophon\.css `\.colophon-exhibit` reads --font-code, which no token defines/m],
    ['an undefined colour', edit(CHART_CSS, (s) => s.replace('var(--color-ink-prose-dark)', 'var(--color-ink-prose-darker)')), /^monospace: src\/render-fallback\/chart\.css `[^`]+` reads --color-ink-prose-darker, which no token defines/m],
  ] as const) {
    assert.match(auditMonospace(mutated, tokensCss).join('\n'), message, `"${name}" must be rejected`);
  }
  // The token itself gone: the one reference names nothing.
  assert.match(auditMonospace(files, tokensCss.replace(/\n\s*--font-mono:[^;]*;/, '')).join('\n'), /reads --font-mono, which no token defines/);
});
