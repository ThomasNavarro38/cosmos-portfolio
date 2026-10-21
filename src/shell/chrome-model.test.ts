/**
 * The corner chrome's rules, executed — the slot's matrix, its style, the
 * contrast of the chrome ink, the offer's class — plus the scans of
 * `chrome-model.ts` and `corner-chrome.css`. Every scan is driven over
 * mutations of the shipped file, so each can be seen to fail. Since 4.7 the
 * renderer, `corner-chrome.tsx`, is `corner-chrome.test.ts`'s — rendered through
 * the harness, and its source audit — and the mount order in `App.tsx` (index,
 * chrome, scene host, panel) is `src/App.test.ts`'s, rendered.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
// Comments blanked in place by the shared stripper, so a scan reads code and a
// line keeps its number.
import { stripComments } from '../../scripts/source-scan.ts';
import { tokens } from '../tokens/tokens.ts';
import { IDENTITY_LINE, IDENTITY_MODEL, IDENTITY_NAME, SLOT_TEXT, chartRouteClass, chromeSlot, slotStyle, type ChromeSlot } from './chrome-model.ts';
import { FOCUS_SECONDS, focusEasingCss } from './focus-motion.ts';
import { contrast } from './contrast.ts';
import { REDUCED_MOTION_PACE, motionPace } from './motion-preference.ts';
import { panelStyle, panelWidthCss } from './panel-model.ts';
import { stripCssComments } from '../../scripts/colour-literals.ts';

const MODEL_TS = fileURLToPath(new URL('./chrome-model.ts', import.meta.url));
const CHROME_CSS = fileURLToPath(new URL('./corner-chrome.css', import.meta.url));
const TOKENS_CSS = fileURLToPath(new URL('../tokens/tokens.css', import.meta.url));

/** A file as the mutations see it: LF line endings, whatever the checkout wrote. */
const read = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// --- The two lines ---------------------------------------------------------------------

test('the identity line is THOMAS NAVARRO · the model, verbatim', () => {
  assert.equal(IDENTITY_LINE, 'THOMAS NAVARRO · the model');
  // 5.1: the chrome draws the line as its two parts, so the parts must make the line.
  assert.equal(`${IDENTITY_NAME} · ${IDENTITY_MODEL}`, IDENTITY_LINE, 'the two parts make the line');
});

test('the slot follows the table: instruction on the Rail, resume in flight, release while Focused in either mode', () => {
  assert.deepEqual(chromeSlot('rail', null), { kind: 'instruction', text: 'scroll ↓ — time runs backward' });
  assert.deepEqual(chromeSlot('freeflight', null), { kind: 'control', action: 'return', text: '↩ resume the journey' });
  assert.deepEqual(chromeSlot('rail', 'project:a/1'), { kind: 'control', action: 'release', text: 'esc — release' });
  assert.deepEqual(chromeSlot('freeflight', 'project:a/1'), { kind: 'control', action: 'release', text: 'esc — release' }, 'release, not resume');
  assert.deepEqual(SLOT_TEXT, { instruction: 'scroll ↓ — time runs backward', return: '↩ resume the journey', release: 'esc — release' });
});

test('each slot variant carries its own text, so the type checker rejects a control with another’s', () => {
  // Checked by `npm run typecheck`: each line below must be a type error.
  // @ts-expect-error — a release control reading resume.
  const releaseAsResume: ChromeSlot = { kind: 'control', action: 'release', text: SLOT_TEXT.return };
  // @ts-expect-error — a return control reading the instruction.
  const returnAsInstruction: ChromeSlot = { kind: 'control', action: 'return', text: SLOT_TEXT.instruction };
  // @ts-expect-error — the instruction reading release.
  const instructionAsRelease: ChromeSlot = { kind: 'instruction', text: SLOT_TEXT.release };
  assert.equal([releaseAsResume, returnAsInstruction, instructionAsRelease].length, 3);
});

test('the slot reads the Focus as present or absent, never which Project it is', () => {
  for (const id of ['project:a/1', 'project:zulu/9', 'x']) {
    for (const mode of ['rail', 'freeflight'] as const) assert.deepEqual(chromeSlot(mode, id), chromeSlot(mode, 'project:a/1'));
  }
});

test('a release in flight keeps the slot a control, so the renderer keeps its one button', () => {
  // Focused in flight, released → resume: both are `control`, so the one JSX
  // `<button>` stays the same element and only its text and door change.
  assert.equal(chromeSlot('freeflight', 'project:a/1').kind, 'control');
  assert.equal(chromeSlot('freeflight', null).kind, 'control');
  // The two that unmount the button: resume (its last action `return`, where the
  // hand-back runs) and a release from the Rail (its last action `release`, where
  // focus is `focusMove`'s alone).
  assert.equal(chromeSlot('rail', null).kind, 'instruction');
  assert.deepEqual(chromeSlot('rail', 'project:a/1'), { kind: 'control', action: 'release', text: SLOT_TEXT.release });
});

test('the slot’s style is the same shape in every state, so one persistent element carries the move', () => {
  // Rail ↔ Focus changes the slot's kind but never its style's keys: the one
  // `<p class="chrome-slot">` keeps the transition and moves rather than jumps.
  assert.deepEqual(Object.keys(slotStyle(false)), Object.keys(slotStyle(true)));
  assert.notEqual(slotStyle(false).right, slotStyle(true).right);
});

test('the slot sits 40px in with nothing focused, and 40px left of the panel while Focused', () => {
  assert.equal(slotStyle(false).right, 'var(--space-xl)');
  assert.equal(slotStyle(true).right, `calc(${panelWidthCss()} + var(--space-xl))`);
  assert.equal(slotStyle(true).right, 'calc(min(560px, 46vw) + var(--space-xl))');
  assert.deepEqual(Object.keys(slotStyle(true)).sort(), ['right', 'transition'], 'the state-dependent declarations and nothing else');
});

test('the slot moves on the panel’s slide: right, over FOCUS_SECONDS × pace, on the Focus curve', () => {
  for (const focused of [false, true]) {
    assert.equal(slotStyle(focused).transition, `right ${FOCUS_SECONDS}s ${focusEasingCss()}`);
    assert.equal(slotStyle(focused, motionPace(false)).transition, `right ${FOCUS_SECONDS}s ${focusEasingCss()}`);
    assert.equal(slotStyle(focused, motionPace(true)).transition, `right ${FOCUS_SECONDS * REDUCED_MOTION_PACE}s ${focusEasingCss()}`, 'reduced: × the pace');
  }
});

test('the slot’s move is the panel’s own slide: the same duration and curve, at full and reduced pace', () => {
  for (const pace of [1, REDUCED_MOTION_PACE]) {
    for (const open of [false, true]) {
      const slide = /^transform (\S+ cubic-bezier\([^)]*\))(?:,|$)/.exec(panelStyle(open, pace).transition)?.[1];
      assert.ok(slide !== undefined, `the panel slides on transform (pace ${pace})`);
      assert.equal(slotStyle(open, pace).transition, `right ${slide}`, `pace ${pace}, ${open ? 'open' : 'closed'}`);
    }
  }
});

test('a pace that is not a positive finite number reads as 1 — never a 0s cut or a NaN duration', () => {
  for (const pace of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(slotStyle(true, pace).transition, `right ${FOCUS_SECONDS}s ${focusEasingCss()}`, `pace ${pace}`);
  }
});

// --- The offer (4.6) ---------------------------------------------------------------------

test('the cue: the chart link is chrome-route at rest, and chrome-route chrome-route-offered once offered', () => {
  assert.equal(chartRouteClass(false), 'chrome-route');
  assert.equal(chartRouteClass(true), 'chrome-route chrome-route-offered');
  assert.ok(chartRouteClass(true).split(' ').includes(chartRouteClass(false)), 'the offered link keeps every rest declaration');
});

// --- Contrast ----------------------------------------------------------------------------

// `contrast` is the shared test support in `contrast.ts` (3.9), one arithmetic for every floor.

test('the contrast arithmetic is WCAG’s', () => {
  assert.ok(Math.abs(contrast('#000000', '#FFFFFF') - 21) < 1e-9, 'black on white is 21:1');
  assert.equal(contrast('#777777', '#777777'), 1, 'a colour on itself is 1:1');
  assert.ok(Math.abs(contrast('#767676', '#FFFFFF') - 4.54) < 0.01, '#767676 on white is the familiar 4.54:1');
});

test('the chrome ink clears the 4.5:1 floor on the ground, from the generated tokens', () => {
  const ground = tokens.colors['surface-base-dark'];
  const ratio = contrast(tokens.colors['ink-label-dark'], ground);
  assert.ok(ratio >= 4.5, `ink-label-dark on surface-base-dark is ${ratio.toFixed(2)}:1`);
  assert.ok(contrast(tokens.colors['ink-prose-dark'], ground) >= 4.5, 'and the raised ink on hover and focus');
  assert.ok(contrast(tokens.colors['ink-quiet-dark'], ground) < ratio, 'ink-quiet is the step below — never the chrome’s');
});

// --- Purity of the model -----------------------------------------------------------------

function auditModel(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  for (const [, specifier] of code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (specifier !== './focus-motion.ts' && specifier !== './panel-model.ts') failures.push(`imports ${specifier} — the chrome model imports the timing and the panel width only`);
  }
  if (/\bwindow\b|\bdocument\b|\bnavigator\b|innerWidth|matchMedia/.test(code)) failures.push('reads a DOM global — state arrives as arguments');
  if (/\bnavigationStore\b|\bgetState\b|\buseStore\b/.test(code)) failures.push('reads the store — the renderer subscribes');
  if (/\breducedMotion\b|\bmotionPace\b|REDUCED_MOTION/.test(code)) failures.push('reads the preference — the pace arrives as an argument');
  if (/text-?transform|toUpperCase|toLowerCase/i.test(code)) failures.push('recases a string — the strings are set as authored');
  if (!/export function chromeSlot\(mode: 'rail' \| 'freeflight', focusedProjectId: string \| null\): ChromeSlot \{/.test(code)) {
    failures.push('chromeSlot does not take mode and focusedProjectId, and nothing else');
  }
  const body = /export function chromeSlot\([^)]*\): ChromeSlot \{([\s\S]*?)\n\}/.exec(code)?.[1] ?? '';
  const names = new Set(body.match(/\b[A-Za-z_]\w*\b/g) ?? []);
  for (const name of names) {
    if (!['if', 'return', 'null', 'kind', 'action', 'text', 'control', 'release', 'instruction', 'freeflight', 'mode', 'focusedProjectId', 'SLOT_TEXT'].includes(name)) {
      failures.push(`the slot rule reads ${name} — it reads mode and focusedProjectId alone`);
    }
  }
  if (!/export const IDENTITY_LINE = 'THOMAS NAVARRO · the model';/.test(code)) failures.push('the identity line is not the ruled string');
  return failures;
}

test('the chrome model is pure, and the slot rule reads mode and focusedProjectId alone', () => {
  assert.deepEqual(auditModel(read(MODEL_TS)), []);
});

test('the model audit rejects the real model with any one impurity added', () => {
  const real = read(MODEL_TS);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a store import', (s) => `import { navigationStore } from './state.ts';\n${s}`],
    ['a preference import', (s) => `import { reducedMotion } from './motion-preference.ts';\n${s}`],
    ['a viewport read', (s) => s.replace("'var(--space-xl)',\n", "window.innerWidth > 1200 ? 'var(--space-xl)' : '0',\n")],
    ['the slot reads the hover', (s) => s.replace('if (mode === \'freeflight\')', "if (mode === 'freeflight' || hoveredProjectId !== null)")],
    ['the slot reads a third argument', (s) => s.replace("focusedProjectId: string | null): ChromeSlot {", 'focusedProjectId: string | null, origin: string): ChromeSlot {')],
    ['the line recased', (s) => s.replace("'THOMAS NAVARRO · the model'", "'THOMAS NAVARRO · THE MODEL'")],
    ['the line recased in code', (s) => s.replace("text: SLOT_TEXT.release }", 'text: SLOT_TEXT.release.toUpperCase() }')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditModel(mutated), [], `"${name}" must be rejected`);
  }
});

// --- The stylesheet ------------------------------------------------------------------------

/** One declaration of the stylesheet, with the selector and `@media` condition it sits under. */
interface CssDeclaration {
  readonly media: string | null;
  readonly selector: string;
  readonly property: string;
  readonly value: string;
}

/**
 * The stylesheet as a flat list of declarations: rules and one level of
 * `@media`, comments blanked, whitespace collapsed. The parser
 * `panel-model.test.ts` holds `focus-panel.css` with, restated because a test
 * file is not a module to import.
 */
function declarationsOf(css: string): CssDeclaration[] {
  const code = stripCssComments(css);
  const out: CssDeclaration[] = [];
  const squash = (text: string) => text.trim().replace(/\s+/g, ' ');
  const rules = (body: string, media: string | null) => {
    for (const [, selector, block] of body.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
      for (const declaration of (block ?? '').split(';')) {
        const colon = declaration.indexOf(':');
        if (colon === -1) {
          if (declaration.trim() !== '') out.push({ media, selector: squash(selector ?? ''), property: squash(declaration), value: '' });
          continue;
        }
        out.push({ media, selector: squash(selector ?? ''), property: squash(declaration.slice(0, colon)), value: squash(declaration.slice(colon + 1)) });
      }
    }
  };
  let rest = code;
  for (const media of code.matchAll(/@media\s*([^{]+)\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
    rules(media[2] ?? '', squash(media[1] ?? ''));
    rest = rest.replace(media[0], ' ');
  }
  for (const [atRule] of rest.matchAll(/@[\w-]+/g)) out.push({ media: null, selector: '@', property: atRule, value: '' });
  rules(rest.replace(/@[\w-]+[^{;]*[{;]/g, ' '), null);
  return out;
}

const FORCED_COLORS = '(forced-colors: active)';
/** The panel's own layer, read from its model rather than restated: the chrome must sit below it. */
const PANEL_LAYER = panelStyle(true).zIndex;
const LINES = '.chrome-identity, .chrome-slot';
const CONTROL = '.chrome-slot-control';
const RAISED = '.chrome-slot-control:hover, .chrome-slot-control:focus-visible';
const FOCUSED = '.chrome-slot-control:focus-visible';
const ROUTE = '.chrome-route';
const ROUTE_RAISED = '.chrome-route:hover, .chrome-route:focus-visible';
const ROUTE_FOCUSED = '.chrome-route:focus-visible';
const ROUTE_OFFERED = '.chrome-route-offered';
const ROUTE_OFFERED_RAISED = '.chrome-route-offered:hover, .chrome-route-offered:focus-visible';
const TYPE_PROPERTIES = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing'] as const;

/**
 * The whole treatment, as `[media, selector, property, value]`, with the `chrome`
 * type role on both lines below. A declaration in neither fails.
 */
const EXPECTED: readonly (readonly [string | null, string, string, string])[] = [
  // Both lines: fixed, below the panel (`PANEL_LAYER`), no pointer, in ink-label (DESIGN.md §7.9).
  [null, LINES, 'position', 'fixed'],
  [null, LINES, 'z-index', '1'],
  [null, LINES, 'margin', '0'],
  [null, LINES, 'pointer-events', 'none'],
  [null, LINES, 'color', 'var(--color-ink-label-dark)'],
  // The 40px inset: identity top-left, slot bottom (its `right` is the model's, inline).
  [null, '.chrome-identity', 'top', 'var(--space-xl)'],
  [null, '.chrome-identity', 'left', 'var(--space-xl)'],
  [null, '.chrome-slot', 'bottom', 'var(--space-xl)'],
  // The button inside the slot mirrors `.panel-release`: no box, the line's type
  // and ink inherited, and it alone takes the pointer.
  [null, CONTROL, 'margin', '0'],
  [null, CONTROL, 'padding', '0'],
  [null, CONTROL, 'background', 'none'],
  [null, CONTROL, 'border', '0'],
  [null, CONTROL, 'font', 'inherit'],
  [null, CONTROL, 'letter-spacing', 'inherit'],
  [null, CONTROL, 'color', 'inherit'],
  [null, CONTROL, 'cursor', 'pointer'],
  [null, CONTROL, 'pointer-events', 'auto'],
  [null, RAISED, 'color', 'var(--color-ink-prose-dark)'],
  [null, RAISED, 'outline', 'none'],
  // Keyboard focus is not the ink step alone (about 1.7:1 between the two inks):
  // a hairline underline, in the raised ink, a hair below the line.
  [null, FOCUSED, 'text-decoration-line', 'underline'],
  [null, FOCUSED, 'text-decoration-thickness', 'var(--stroke-hairline)'],
  [null, FOCUSED, 'text-underline-offset', 'var(--space-hair)'],
  // The identity line's link to the chart (4.5) mirrors the button: the line's
  // type and ink, no box, no rest underline; it alone on that line takes the pointer.
  [null, ROUTE, 'color', 'inherit'],
  [null, ROUTE, 'text-decoration', 'none'],
  [null, ROUTE, 'pointer-events', 'auto'],
  [null, ROUTE_RAISED, 'color', 'var(--color-ink-prose-dark)'],
  [null, ROUTE_RAISED, 'outline', 'none'],
  [null, ROUTE_FOCUSED, 'text-decoration-line', 'underline'],
  [null, ROUTE_FOCUSED, 'text-decoration-thickness', 'var(--stroke-hairline)'],
  [null, ROUTE_FOCUSED, 'text-underline-offset', 'var(--space-hair)'],
  // The offer (4.6, ruling Q1a): raised and underlined at rest, by the focus hairline's own declarations.
  [null, ROUTE_OFFERED, 'color', 'var(--color-ink-prose-dark)'],
  [null, ROUTE_OFFERED, 'text-decoration-line', 'underline'],
  [null, ROUTE_OFFERED, 'text-decoration-thickness', 'var(--stroke-hairline)'],
  [null, ROUTE_OFFERED, 'text-underline-offset', 'var(--space-hair)'],
  // Its hover and focus step past that rest — which is the plain link's focus —
  // so keyboard focus on an offered link stays visible (WCAG 2.4.7).
  [null, ROUTE_OFFERED_RAISED, 'color', 'var(--color-ink-lift-dark)'],
  [null, ROUTE_OFFERED_RAISED, 'text-decoration-thickness', 'var(--stroke-body-focus)'],
  // Forced colours flatten the ink step, so keyboard focus there is the system outline.
  [FORCED_COLORS, '.chrome-route:focus-visible, .chrome-slot-control:focus-visible', 'outline', '1px solid CanvasText'],
];

function auditStylesheet(css: string, tokensCss: string): string[] {
  const declarations = declarationsOf(css);
  const failures: string[] = [];
  const find = (media: string | null, selector: string, property: string) =>
    declarations.filter((d) => d.media === media && d.selector === selector && d.property === property).map((d) => d.value);
  for (const [media, selector, property, value] of EXPECTED) {
    const found = find(media, selector, property);
    if (found.length !== 1 || found[0] !== value) failures.push(`${media ?? ''} ${selector} { ${property}: ${value} } — found ${JSON.stringify(found)}`);
  }
  for (const property of TYPE_PROPERTIES) {
    const value = `var(--type-chrome-${property})`;
    const found = find(null, LINES, property);
    if (found.length !== 1 || found[0] !== value) failures.push(`the lines are not set in chrome: ${property} found ${JSON.stringify(found)}`);
  }
  const known = new Set([...EXPECTED.map(([media, selector, property]) => `${media ?? ''}|${selector}|${property}`), ...TYPE_PROPERTIES.map((property) => `|${LINES}|${property}`)]);
  const tokenNames = new Set([...tokensCss.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  for (const { media, selector, property, value } of declarations) {
    if (selector === '@') {
      failures.push(`an unread at-rule ${property} — its declarations would escape this audit`);
      continue;
    }
    if (!known.has(`${media ?? ''}|${selector}|${property}`)) failures.push(`${media ?? ''} ${selector} { ${property}: ${value} } is not part of the treatment`);
    for (const [, name] of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (!tokenNames.has(name)) failures.push(`${selector} reads ${name}, which no token defines`);
    }
    for (const [length] of value.matchAll(/-?\d*\.?\d+(?:px|rem|em|ex|ch|pt|vh|vw|vmin|vmax|%)(?![\w-])/g)) {
      if (length !== '1px' || media !== FORCED_COLORS) failures.push(`${selector} { ${property} } writes ${length} — read it from a token`);
    }
    if (/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i.test(value)) failures.push(`${selector} writes a literal colour`);
    if (property === 'text-transform') failures.push(`${selector} recases the chrome — the strings are set as authored`);
    if (property === 'font-weight' && value !== 'var(--type-chrome-font-weight)') failures.push(`${selector} sets a weight of its own`);
    if (property === 'z-index' && !(Number(value) < PANEL_LAYER)) failures.push(`${selector} is not below the panel (z-index ${PANEL_LAYER})`);
    if (/radius|shadow|filter|backdrop/.test(property)) failures.push(`${selector} sets ${property} — no radius, shadow or blur`);
    if (/^outline/.test(property) && value !== 'none' && media !== FORCED_COLORS) failures.push(`${selector} draws an outline — no box`);
    if (/ink-quiet|ink-faint/.test(value)) failures.push(`${selector} uses ${value} — below the contrast floor`);
    if (/!important/.test(value)) failures.push(`${selector} { ${property} } is !important`);
  }
  for (const media of new Set(declarations.map((d) => d.media))) {
    if (media !== null && media !== FORCED_COLORS) failures.push(`an @media ${media} beyond forced colours`);
  }
  // The offer (4.6) wins over the rest state at the same specificity only by
  // coming after it; and its underline is the focus hairline's, declaration for declaration.
  const order = declarations.map((d) => d.selector);
  if (!(order.lastIndexOf(ROUTE) < order.indexOf(ROUTE_OFFERED))) failures.push('the offer is not after .chrome-route — the rest state would win');
  if (!(order.lastIndexOf(ROUTE_OFFERED) < order.indexOf(ROUTE_OFFERED_RAISED))) failures.push('the offered link’s hover and focus are not after its rest');
  for (const property of ['color', 'text-decoration-thickness']) {
    const rest = find(null, ROUTE_OFFERED, property);
    const raised = find(null, ROUTE_OFFERED_RAISED, property);
    if (raised.length === 0 || JSON.stringify(raised) === JSON.stringify(rest)) failures.push(`the offered link’s focus ${property} equals its rest — focus would be invisible`);
  }
  // Forced colours: the system outline on the link's focus covers the offered link (it keeps .chrome-route).
  if (!declarations.some((d) => d.media === FORCED_COLORS && d.selector.split(', ').includes(ROUTE_FOCUSED) && d.property === 'outline')) {
    failures.push('forced colours draw no outline on the chart link’s focus, offered or not');
  }
  for (const property of ['text-decoration-line', 'text-decoration-thickness', 'text-underline-offset']) {
    if (JSON.stringify(find(null, ROUTE_OFFERED, property)) !== JSON.stringify(find(null, ROUTE_FOCUSED, property))) {
      failures.push(`the offer's ${property} is not the focus hairline's`);
    }
  }
  return failures;
}

test('the chrome layer is below the panel’s, read from the panel model', () => {
  assert.equal(typeof PANEL_LAYER, 'number');
  const layers = declarationsOf(read(CHROME_CSS)).filter((d) => d.property === 'z-index');
  assert.ok(layers.length > 0, 'the chrome declares its layer');
  for (const { selector, value } of layers) assert.ok(Number(value) < PANEL_LAYER, `${selector} z-index ${value} < the panel's ${PANEL_LAYER}`);
});

test('--space-xl, the chrome inset, is 40px in the generated tokens (DESIGN.md §7.9)', () => {
  const declared = [...read(TOKENS_CSS).matchAll(/--space-xl\s*:\s*([^;]+);/g)].map((m) => (m[1] ?? '').trim());
  assert.deepEqual(declared, ['40px']);
});

test('the stylesheet sets the chrome type, ink-label, the 40px inset and the button states from tokens', () => {
  assert.deepEqual(auditStylesheet(read(CHROME_CSS), read(TOKENS_CSS)), []);
});

test('the stylesheet audit rejects the real stylesheet with any one departure', () => {
  const real = read(CHROME_CSS);
  const tokensCss = read(TOKENS_CSS);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['capitals', (s) => s.replace('margin: 0;', 'margin: 0;\n  text-transform: uppercase;')],
    ['a heavier weight', (s) => s.replace('font-weight: var(--type-chrome-font-weight);', 'font-weight: 500;')],
    ['another role', (s) => s.replace('font-size: var(--type-chrome-font-size);', 'font-size: var(--type-scene-label-client-font-size);')],
    ['quiet ink', (s) => s.replace(/(z-index: 1;\s*margin: 0;[\s\S]*?)color: var\(--color-ink-label-dark\);/, '$1color: var(--color-ink-quiet-dark);')],
    ['a literal colour', (s) => s.replace(/(z-index: 1;\s*margin: 0;[\s\S]*?)color: var\(--color-ink-label-dark\);/, '$1color: #8a8a94;')],
    ['a 32px inset', (s) => s.replace('top: var(--space-xl);', 'top: var(--space-lg);')],
    ['a literal inset', (s) => s.replace('left: var(--space-xl);', 'left: 40px;')],
    ['the slot at the top', (s) => s.replace('bottom: var(--space-xl);', 'top: var(--space-xl);')],
    ['the slot’s right fixed in the stylesheet', (s) => s.replace('bottom: var(--space-xl);', 'bottom: var(--space-xl);\n  right: var(--space-xl);')],
    ['not fixed', (s) => s.replace('position: fixed;', 'position: absolute;')],
    ['over the panel', (s) => s.replace('z-index: 1;', 'z-index: 3;')],
    ['the lines take the pointer', (s) => s.replace('pointer-events: none;', 'pointer-events: auto;')],
    ['the slot takes the pointer', (s) => s.replace('bottom: var(--space-xl);', 'bottom: var(--space-xl);\n  pointer-events: auto;')],
    ['the button takes no pointer', (s) => s.replace('pointer-events: auto;', 'pointer-events: none;')],
    ['the button in the UA font', (s) => s.replace('font: inherit;', '')],
    ['the button in the UA letter-spacing', (s) => s.replace('letter-spacing: inherit;', '')],
    ['the button in its own ink', (s) => s.replace('color: inherit;', 'color: var(--color-ink-prose-dark);')],
    ['the button boxed', (s) => s.replace('border: 0;', 'border: 1px solid var(--color-surface-edge-dark);')],
    ['the button filled', (s) => s.replace('background: none;', 'background: var(--color-surface-raised-dark);')],
    ['the button padded', (s) => s.replace(/(\.chrome-slot-control \{\s*margin: 0;\s*)padding: 0;/, '$1padding: var(--space-xs);')],
    ['the hover not raised', (s) => s.replace('color: var(--color-ink-prose-dark);', 'color: var(--color-ink-label-dark);')],
    ['an outline on focus', (s) => s.replace(/(color: var\(--color-ink-prose-dark\);\s*)outline: none;/, '$1outline: 1px solid var(--color-stroke-focus-dark);')],
    ['focus shown by colour alone', (s) => s.replace(/\n\.chrome-slot-control:focus-visible \{[^}]*text-decoration-line[^}]*\}\n/, '\n')],
    ['the focus underline on hover too', (s) => s.replace('.chrome-slot-control:focus-visible {\n  text-decoration-line', '.chrome-slot-control:hover,\n.chrome-slot-control:focus-visible {\n  text-decoration-line')],
    ['a heavy focus underline', (s) => s.replace('text-decoration-thickness: var(--stroke-hairline);', 'text-decoration-thickness: 2px;')],
    ['the focus underline flush on the text', (s) => s.replace('text-underline-offset: var(--space-hair);', 'text-underline-offset: 0;')],
    ['no forced-colours focus', (s) => s.replace('outline: 1px solid CanvasText;', 'outline: none;')],
    ['a forced-colours block for something else', (s) => s.replace('(forced-colors: active)', '(prefers-contrast: more)')],
    ['a radius', (s) => s.replace('cursor: pointer;', 'cursor: pointer;\n  border-radius: 2px;')],
    ['a stray rule', (s) => `${s}\n.chrome-identity::after {\n  content: '';\n}\n`],
    ['an @supports block', (s) => `${s}\n@supports (display: grid) {\n  .chrome-slot {\n    font-size: 12px;\n  }\n}\n`],
    ['an !important', (s) => s.replace('z-index: 1;', 'z-index: 1 !important;')],
    // 4.5: the chart link.
    ['the link takes no pointer', (s) => s.replace('  text-decoration: none;\n  pointer-events: auto;', '  text-decoration: none;\n  pointer-events: none;')],
    ['the link underlined at rest', (s) => s.replace('  color: inherit;\n  text-decoration: none;', '  color: inherit;\n  text-decoration: underline;')],
    ['the link in its own ink', (s) => s.replace('.chrome-route {\n  color: inherit;', '.chrome-route {\n  color: var(--color-ink-prose-dark);')],
    ['the link not raised', (s) => s.replace('.chrome-route:focus-visible {\n  color: var(--color-ink-prose-dark);', '.chrome-route:focus-visible {\n  color: var(--color-ink-label-dark);')],
    ['the link focus by colour alone', (s) => s.replace(/\n\.chrome-route:focus-visible \{[^}]*text-decoration-line[^}]*\}\n/, '\n')],
    ['the link boxed', (s) => s.replace('  text-decoration: none;\n  pointer-events: auto;', '  text-decoration: none;\n  pointer-events: auto;\n  border: 1px solid var(--color-surface-edge-dark);')],
    ['no forced-colours focus on the link', (s) => s.replace('.chrome-route:focus-visible,\n  .chrome-slot-control:focus-visible {', '.chrome-slot-control:focus-visible {')],
    // 4.6: the offer.
    ['the offer dropped', (s) => s.replace(/\n\.chrome-route-offered \{[^}]*\}\n/, '\n')],
    ['the offer not raised', (s) => s.replace('.chrome-route-offered {\n  color: var(--color-ink-prose-dark);', '.chrome-route-offered {\n  color: inherit;')],
    ['the offer not underlined', (s) => s.replace('.chrome-route-offered {\n  color: var(--color-ink-prose-dark);\n  text-decoration-line: underline;', '.chrome-route-offered {\n  color: var(--color-ink-prose-dark);')],
    ['the offer heavier than the hairline', (s) => s.replace(/(\.chrome-route-offered \{[^}]*?)text-decoration-thickness: var\(--stroke-hairline\);/, '$1text-decoration-thickness: var(--stroke-medium);')],
    ['the offer in another ink', (s) => s.replace('.chrome-route-offered {\n  color: var(--color-ink-prose-dark);', '.chrome-route-offered {\n  color: var(--color-ink-lift-dark);')],
    ['the offer boxed', (s) => s.replace('.chrome-route-offered {\n', '.chrome-route-offered {\n  border: 1px solid var(--color-surface-edge-dark);\n')],
    ['the offered focus dropped', (s) => s.replace(/\n\.chrome-route-offered:hover,\n\.chrome-route-offered:focus-visible \{[^}]*\}\n/, '\n')],
    ['the offered focus equal to its rest', (s) => s.replace('  color: var(--color-ink-lift-dark);\n  text-decoration-thickness: var(--stroke-body-focus);', '  color: var(--color-ink-prose-dark);\n  text-decoration-thickness: var(--stroke-hairline);')],
    ['the offered focus not raised', (s) => s.replace('  color: var(--color-ink-lift-dark);\n  text-decoration-thickness: var(--stroke-body-focus);', '  color: var(--color-ink-prose-dark);\n  text-decoration-thickness: var(--stroke-body-focus);')],
    ['the offered focus thickness dropped', (s) => s.replace('  color: var(--color-ink-lift-dark);\n  text-decoration-thickness: var(--stroke-body-focus);', '  color: var(--color-ink-lift-dark);')],
    ['the offered focus on hover alone', (s) => s.replace('.chrome-route-offered:hover,\n.chrome-route-offered:focus-visible {', '.chrome-route-offered:hover {')],
    ['the offer before the rest state', (s) => {
      const block = /\n\.chrome-route-offered \{[^}]*\}\n/.exec(s)?.[0] ?? '';
      return s.replace(block, '\n').replace('.chrome-route {', `${block.trim()}\n\n.chrome-route {`);
    }],
    ['a missing token', (s) => s.replace('var(--color-ink-label-dark)', 'var(--color-ink-chrome-dark)')],
    ['a declaration with no colon', (s) => s.replace('cursor: pointer;', 'cursor pointer;')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditStylesheet(mutated, tokensCss), [], `"${name}" must be rejected`);
  }
});
