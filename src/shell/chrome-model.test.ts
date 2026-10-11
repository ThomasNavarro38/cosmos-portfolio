/**
 * The corner chrome's rules, executed — the slot's matrix, its style, the
 * contrast of the chrome ink — plus the source scans that ratchet what
 * `node --test` cannot load: `corner-chrome.tsx` and `corner-chrome.css`. Every
 * scan is driven over mutations of the shipped file, so each can be seen to
 * fail. The mount order in `App.tsx` (index, chrome, scene host, panel) is held
 * by `auditMount` in `panel-model.test.ts`, the one audit of that file.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { tokens } from '../tokens/tokens.ts';
import { IDENTITY_LINE, SLOT_TEXT, chromeSlot, slotStyle, type ChromeSlot } from './chrome-model.ts';
import { FOCUS_SECONDS, focusEasingCss } from './focus-motion.ts';
import { contrast } from './contrast.ts';
import { REDUCED_MOTION_PACE, motionPace } from './motion-preference.ts';
import { panelStyle, panelWidthCss } from './panel-model.ts';

const MODEL_TS = fileURLToPath(new URL('./chrome-model.ts', import.meta.url));
const CHROME_TSX = fileURLToPath(new URL('./corner-chrome.tsx', import.meta.url));
const CHROME_CSS = fileURLToPath(new URL('./corner-chrome.css', import.meta.url));
const TOKENS_CSS = fileURLToPath(new URL('../tokens/tokens.css', import.meta.url));

/** Comments blanked in place, so a scan reads code and a line keeps its number. */
function blank(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

/** A file as the mutations see it: LF line endings, whatever the checkout wrote. */
const read = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// --- The two lines ---------------------------------------------------------------------

test('the identity line is THOMAS NAVARRO · the model, verbatim', () => {
  assert.equal(IDENTITY_LINE, 'THOMAS NAVARRO · the model');
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
  const code = blank(source);
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
  const code = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
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
  // Forced colours flatten the ink step, so keyboard focus there is the system outline.
  [FORCED_COLORS, '.chrome-slot-control:focus-visible', 'outline', '1px solid CanvasText'],
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
    ['a missing token', (s) => s.replace('var(--color-ink-label-dark)', 'var(--color-ink-chrome-dark)')],
    ['a declaration with no colon', (s) => s.replace('cursor: pointer;', 'cursor pointer;')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditStylesheet(mutated, tokensCss), [], `"${name}" must be rejected`);
  }
});

// --- The renderer stays thin -----------------------------------------------------------------

/**
 * `corner-chrome.tsx` as a pure function over its source: exactly two chrome
 * elements — the identity `<p>` and one persistent slot `<p>`, mounted in every
 * state and carrying the style, whose content is the instruction text or one
 * `<button>` — two selector subscriptions, the pace, and the hand-back, each
 * pinned positively; no name but the visible text, no store event, no rule of
 * its own.
 *
 * The slot is one element so its `right` transition runs on Rail ↔ Focus too: a
 * slot swapped between a `<p>` and a `<button>` mounts the new element at its
 * final `right`, and jumps (Spec Change Log, loop 1). The hand-back runs only
 * when the button's last action — its own `data-action`, not the store — was
 * `return`: a release's focus target is `focusMove`'s alone.
 */
function auditChrome(source: string): string[] {
  const code = blank(source);
  const failures: string[] = [];
  if (!/const\s+mode\s*=\s*useStore\(\s*navigationStore\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*\1\.mode\s*\)/.test(code)) failures.push('does not subscribe to mode with a selector');
  if (!/const\s+focusedProjectId\s*=\s*useStore\(\s*navigationStore\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*\1\.focusedProjectId\s*\)/.test(code)) {
    failures.push('does not subscribe to focusedProjectId with a selector');
  }
  if ((code.match(/\buseStore\s*\(/g) ?? []).length !== 2) failures.push('subscribes other than twice');
  if (/\bgetState\b|\bsubscribe\s*\(/.test(code)) failures.push('reads the store outside its two selectors');
  if (!/const\s+pace\s*=\s*motionPace\(\s*useSyncExternalStore\(\s*subscribeReducedMotion\s*,\s*reducedMotion\s*\)\s*\)\s*;/.test(code)) {
    failures.push('the pace is not motionPace of the preference, read through useSyncExternalStore');
  }
  if ((code.match(/\buseSyncExternalStore\s*\(/g) ?? []).length !== 1) failures.push('the preference is read other than once');
  if (/\bsetReducedMotion\b/.test(code)) failures.push('the chrome writes the preference — scene-host.tsx is its one writer');
  if (!/const\s+slot\s*=\s*chromeSlot\(\s*mode\s*,\s*focusedProjectId\s*\)\s*;/.test(code)) failures.push('the slot is not chromeSlot(mode, focusedProjectId)');
  if (!/const\s+style\s*=\s*slotStyle\(\s*focusedProjectId\s*!==\s*null\s*,\s*pace\s*\)\s*;/.test(code)) failures.push('the style is not slotStyle(focused, pace)');
  if ((code.match(/\bchromeSlot\(/g) ?? []).length !== 1 || (code.match(/\bslotStyle\(/g) ?? []).length !== 1) failures.push('the model is asked other than once');
  // Exactly two chrome elements: the identity line, and one persistent slot.
  if (!/<p\s+className="chrome-identity"\s*>\s*\{\s*IDENTITY_LINE\s*\}\s*<\/p>/.test(code)) failures.push('the identity line is not one <p class="chrome-identity"> of IDENTITY_LINE');
  const slot =
    /<p\s+className="chrome-slot"\s+style=\{\s*style\s*\}\s*>\s*\{\s*slot\.kind\s*===\s*'control'\s*\?\s*\(\s*<button\s+type="button"\s+ref=\{\s*handBack\s*\}\s+className="chrome-slot-control"\s+data-action=\{\s*slot\.action\s*\}\s+onClick=\{\(\s*(\w+)\s*\)\s*=>\s*\(\s*\1\.detail\s*>\s*1\s*\?\s*undefined\s*:\s*slot\.action\s*===\s*'return'\s*\?\s*returnToRail\(\)\s*:\s*releaseLayer\(\)\s*\)\}\s+onKeyDown=\{\(\s*(\w+)\s*\)\s*=>\s*\{\s*if\s*\(\s*\2\.repeat\s*&&\s*\2\.key\s*===\s*'Enter'\s*\)\s*\2\.preventDefault\(\)\s*;?\s*\}\s*\}\s*>\s*\{\s*slot\.text\s*\}\s*<\/button>\s*\)\s*:\s*\(\s*slot\.text\s*\)\s*\}\s*<\/p>/;
  if (!slot.test(code)) {
    failures.push('the slot is not one persistent <p> carrying the style, holding the control <button> — its action carried, a multi-click’s later clicks and a held Enter’s repeats ignored, its door by action, its text its name — or the instruction text');
  }
  if ((code.match(/\bstyle=\{/g) ?? []).length !== 1) failures.push('the style is not on the one persistent slot element');
  if (/\bkey=\{/.test(code)) failures.push('a key — a keyed slot remounts, and jumps');
  if ((code.match(/<button\b/g) ?? []).length > 1) failures.push('more than one <button>');
  if (
    (code.match(/className="chrome-identity"/g) ?? []).length !== 1 ||
    (code.match(/className="chrome-slot"/g) ?? []).length !== 1 ||
    (code.match(/className="chrome-slot-control"/g) ?? []).length !== 1
  ) {
    failures.push('a third chrome line, or a slot drawn twice');
  }
  const elements = code.match(/<[a-zA-Z][\w.]*/g) ?? [];
  if (elements.length !== 3) failures.push(`elements other than the identity, the slot and its button — found ${elements.join(' ')}`);
  // The name is the visible text.
  if (/\baria-[\w-]+=|\btitle=|\balt=/.test(code)) failures.push('an ARIA or title attribute — the name is the visible text');
  if (/<a\b|\bhref=/.test(code)) failures.push('a link — the model’s route is 5.1’s');
  if (/\btabIndex=/.test(code)) failures.push('a tabIndex — the instruction is text, the button focusable by default');
  // No store event, and only the two doors.
  if (/\b(?:selectClient|focusProject|enterFreeFlight|enterRail|releaseFocus|advanceScroll|hoverProject|keyboardApproach|resetNavigation)\b|\.setState\b|\bsetState\b\s*[:,)}]/.test(code)) {
    failures.push('a store event called directly — the slot opens a door in activate.ts');
  }
  if (/\b(?:pullBack|goHome|activateClient|activateProject|approachByKeyboard|leaveByKeyboard)\b/.test(code)) failures.push('a door other than return and release');
  if (!/import\s*\{\s*releaseLayer\s*,\s*returnToRail\s*\}\s*from\s*'\.\/activate\.ts'/.test(code)) failures.push('the doors are not activate.ts’s');
  if ((code.match(/\bonClick\b/g) ?? []).length !== 1) failures.push('a handler beyond the slot’s');
  if (/\bon(?:Mouse|Pointer|Key(?!Down=)|Focus|Blur|Wheel|Scroll)\w*=/.test(code) || (code.match(/\bonKeyDown=/g) ?? []).length !== 1) failures.push('reacts to hover, pointer, keys or focus — the slot is a plain control');
  // The hand-back: a stable ref cleanup, focus to overview by its id, exactly when
  // the button held it and its last action was `return`, read off the element.
  if (
    !/const\s+handBack\s*=\s*useCallback\(\s*\(\s*button\s*:\s*HTMLButtonElement\s*\|\s*null\s*\)\s*=>\s*\(\)\s*=>\s*\{\s*if\s*\(\s*button\?\.dataset\.action\s*===\s*'return'\s*&&\s*button\.matches\(\s*':focus'\s*\)\s*\)\s*document\.getElementById\(\s*OVERVIEW_ID\s*\)\?\.focus\(\)\s*;\s*\}\s*,\s*\[\s*\]\s*,?\s*\)/.test(
      code,
    )
  ) {
    failures.push('the button’s unmount does not hand DOM focus to overview — only after a return, exactly when it holds focus — from a stable ref cleanup');
  }
  if (!/import\s*\{\s*OVERVIEW_ID\s*\}\s*from\s*'\.\/index-model\.ts'/.test(code)) failures.push('OVERVIEW_ID is not the model’s');
  if ((code.match(/\.focus\(/g) ?? []).length !== 1) failures.push('DOM focus is moved other than once, in the hand-back');
  if ((code.match(/\bref=\{/g) ?? []).length !== 1) failures.push('a ref other than the hand-back');
  // No rule and no state of its own.
  if (/\buseState\b|\buseReducer\b|\buseMemo\b|\buseRef\b|\buseEffect\b|\buseLayoutEffect\b/.test(code)) failures.push('keeps state or effects of its own');
  if (/\bwindow\b|innerWidth|innerHeight|getBoundingClientRect|matchMedia/.test(code)) failures.push('reads the viewport');
  if (/\bstyle=\{\{|textTransform|fontWeight|toUpperCase|toLowerCase/.test(code)) failures.push('an inline style literal or a recasing — the treatment is corner-chrome.css and the model');
  if (/(?:'|")(?:THOMAS|scroll ↓|↩|esc —)/.test(code)) failures.push('a chrome string written in the renderer — the strings are the model’s');
  if ((code.match(/^import\s+'\.\/corner-chrome\.css'\s*;/gm) ?? []).length !== 1) failures.push('the stylesheet is not imported, once');
  return failures;
}

test('the chrome renderer is a mapping over the model, and holds only what the header names', () => {
  assert.deepEqual(auditChrome(read(CHROME_TSX)), []);
});

/** The slot as attempt 1 drew it: a `<p>` or a `<button>` swapped by kind — the element that jumped. */
const SWAPPED_SLOT = `{slot.kind === 'control' ? (
        <button
          type="button"
          ref={handBack}
          className="chrome-slot-control"
          data-action={slot.action}
          style={style}
          onClick={() => (slot.action === 'return' ? returnToRail() : releaseLayer())}
        >
          {slot.text}
        </button>
      ) : (
        <p className="chrome-slot" style={style}>
          {slot.text}
        </p>
      )}
`;

/**
 * The failure each renderer mutation targets: a mutation that trips some other
 * check alone would pass while its own check lay dead. Where the slot's one
 * expression is the only check for a guarantee, the target is that expression.
 */
const CHROME_TARGETS: ReadonlyMap<string, string> = new Map([
  ['a whole-store subscription', 'does not subscribe to mode with a selector'],
  ['the wrong field selected', 'does not subscribe to focusedProjectId'],
  ['a third subscription', 'subscribes other than twice'],
  ['the slot read off the hover', 'the slot is not chromeSlot(mode, focusedProjectId)'],
  ['the pace ignoring the preference', 'the pace is not motionPace'],
  ['the style never focused', 'the style is not slotStyle(focused, pace)'],
  ['the style at full motion always', 'the style is not slotStyle(focused, pace)'],
  ['a third line', 'elements other than the identity, the slot and its button'],
  ['a second button', 'more than one <button>'],
  ['the identity a link', 'a link — the model’s route is 5.1’s'],
  ['the identity a button', 'the identity line is not one <p class="chrome-identity">'],
  ['the identity written out', 'the identity line is not one <p class="chrome-identity">'],
  ['the identity recased', 'a recasing'],
  ['an aria-label', 'an ARIA or title attribute'],
  ['an aria-labelledby', 'an ARIA or title attribute'],
  ['a title', 'an ARIA or title attribute'],
  ['the button named by something else', 'the slot is not one persistent'],
  ['every action returns', 'the slot is not one persistent'],
  ['the doors transposed', 'the slot is not one persistent'],
  ['the store called directly', 'a store event called directly'],
  ['the overview door', 'a door other than return and release'],
  ['the instruction focusable', 'a tabIndex'],
  ['the instruction a button', 'more than one <button>'],
  ['the control always shown', 'the slot is not one persistent'],
  ['two button elements for two actions', 'the slot is not one persistent'],
  ['the slot swapped between a <p> and a <button>', 'the style is not on the one persistent slot element'],
  ['the style on the button, not the slot', 'the slot is not one persistent'],
  ['the slot remounted by kind', 'a key — a keyed slot remounts'],
  ['the action not carried', 'the slot is not one persistent'],
  ['the action read off the store', 'reads the store outside its two selectors'],
  ['a hand-back on a release too', 'the button’s unmount does not hand DOM focus'],
  ['a hand-back keyed on a release', 'the button’s unmount does not hand DOM focus'],
  ['the hand-back dropped', 'a ref other than the hand-back'],
  ['focus left on the unmounted button', 'DOM focus is moved other than once'],
  ['focus taken whether or not the button held it', 'the button’s unmount does not hand DOM focus'],
  ['focus moved on mount, not on unmount', 'the button’s unmount does not hand DOM focus'],
  ['a hand-back with dependencies', 'the button’s unmount does not hand DOM focus'],
  ['an inline hand-back', 'DOM focus is moved other than once'],
  ['focus to an id written here', 'the button’s unmount does not hand DOM focus'],
  ['focus moved by the click as well', 'DOM focus is moved other than once'],
  ['the multi-click guard dropped', 'the slot is not one persistent'],
  ['the guard ignoring the first click too', 'the slot is not one persistent'],
  ['the guard inverted', 'the slot is not one persistent'],
  ['the repeat guard dropped', 'reacts to hover, pointer, keys or focus'],
  ['the repeat guard inverted', 'the slot is not one persistent'],
  ['the repeat guard on every held key', 'the slot is not one persistent'],
  ['the repeat guard on another key', 'the slot is not one persistent'],
  ['the repeat guard stops propagation instead', 'the slot is not one persistent'],
  ['a second key handler', 'reacts to hover, pointer, keys or focus'],
  ['an inline style literal', 'an inline style literal'],
  ['the stylesheet not imported', 'the stylesheet is not imported'],
  ['local state', 'keeps state or effects of its own'],
  ['a hover handler', 'reacts to hover, pointer, keys or focus'],
  ['a viewport read', 'reads the viewport'],
]);

test('the chrome audit rejects the real renderer with any one guarantee broken', () => {
  const real = read(CHROME_TSX);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a whole-store subscription', (s) => s.replace('useStore(navigationStore, (state) => state.mode)', 'useStore(navigationStore).mode')],
    ['the wrong field selected', (s) => s.replace('(state) => state.focusedProjectId', '(state) => state.hoveredProjectId')],
    ['a third subscription', (s) => s.replace('const pace =', 'const origin = useStore(navigationStore, (state) => state.focusOrigin);\n  const pace =')],
    ['the slot read off the hover', (s) => s.replace('chromeSlot(mode, focusedProjectId)', 'chromeSlot(mode, navigationStore.getState().hoveredProjectId)')],
    ['the pace ignoring the preference', (s) => s.replace('motionPace(useSyncExternalStore(subscribeReducedMotion, reducedMotion))', 'motionPace(false)')],
    ['the style never focused', (s) => s.replace('slotStyle(focusedProjectId !== null, pace)', 'slotStyle(false, pace)')],
    ['the style at full motion always', (s) => s.replace('slotStyle(focusedProjectId !== null, pace)', 'slotStyle(focusedProjectId !== null)')],
    ['a third line', (s) => s.replace('<p className="chrome-identity">{IDENTITY_LINE}</p>', '<p className="chrome-identity">{IDENTITY_LINE}</p>\n      <p className="chrome-hud">{mode}</p>')],
    ['a second button', (s) => s.replace('<p className="chrome-identity">{IDENTITY_LINE}</p>', '<p className="chrome-identity">{IDENTITY_LINE}</p>\n      <button type="button" onClick={() => releaseLayer()}>esc</button>')],
    ['the identity a link', (s) => s.replace('<p className="chrome-identity">{IDENTITY_LINE}</p>', '<a className="chrome-identity" href="/colophon">{IDENTITY_LINE}</a>')],
    ['the identity a button', (s) => s.replace('<p className="chrome-identity">{IDENTITY_LINE}</p>', '<button className="chrome-identity">{IDENTITY_LINE}</button>')],
    ['the identity written out', (s) => s.replace('{IDENTITY_LINE}</p>', 'THOMAS NAVARRO · the model</p>')],
    ['the identity recased', (s) => s.replace('{IDENTITY_LINE}', '{IDENTITY_LINE.toUpperCase()}')],
    ['an aria-label', (s) => s.replace('className="chrome-slot-control"', 'className="chrome-slot-control"\n            aria-label={slot.text}')],
    ['an aria-labelledby', (s) => s.replace('type="button"', 'type="button" aria-labelledby="chrome"')],
    ['a title', (s) => s.replace('type="button"', 'type="button" title="Escape"')],
    ['the button named by something else', (s) => s.replace('{slot.text}\n          </button>', '{slot.action}\n          </button>')],
    ['every action returns', (s) => s.replace("slot.action === 'return' ? returnToRail() : releaseLayer()", 'returnToRail()')],
    ['the doors transposed', (s) => s.replace("slot.action === 'return' ? returnToRail() : releaseLayer()", "slot.action === 'return' ? releaseLayer() : returnToRail()")],
    ['the store called directly', (s) => s.replace("slot.action === 'return' ? returnToRail() : releaseLayer()", "slot.action === 'return' ? enterRail() : releaseFocus()")],
    ['the overview door', (s) => s.replace("slot.action === 'return' ? returnToRail() : releaseLayer()", "slot.action === 'return' ? pullBack() : releaseLayer()")],
    ['the instruction focusable', (s) => s.replace('<p className="chrome-slot" style={style}>', '<p className="chrome-slot" style={style} tabIndex={0}>')],
    ['the instruction a button', (s) => s.replace(') : (\n          slot.text\n        )}', ') : (\n          <button type="button">{slot.text}</button>\n        )}')],
    ['the control always shown', (s) => s.replace("{slot.kind === 'control' ? (", '{true ? (')],
    ['two button elements for two actions', (s) => s.replace("{slot.kind === 'control' ? (", "{slot.kind === 'control' && slot.action === 'return' ? (")],
    // Loop 1: the slot must be one persistent element, so it moves rather than jumps.
    ['the slot swapped between a <p> and a <button>', (s) => s.replace(/<p className="chrome-slot" style=\{style\}>[\s\S]*?\n {6}<\/p>\n/, SWAPPED_SLOT)],
    [
      'the style on the button, not the slot',
      (s) => s.replace('<p className="chrome-slot" style={style}>', '<p className="chrome-slot">').replace('className="chrome-slot-control"', 'className="chrome-slot-control"\n            style={style}'),
    ],
    ['the slot remounted by kind', (s) => s.replace('<p className="chrome-slot" style={style}>', '<p className="chrome-slot" key={slot.kind} style={style}>')],
    ['the action not carried', (s) => s.replace(/\s*data-action=\{slot\.action\}/, '')],
    ['the action read off the store', (s) => s.replace("button?.dataset.action === 'return'", 'navigationStore.getState().focusedProjectId === null')],
    ['a hand-back on a release too', (s) => s.replace("button?.dataset.action === 'return' && ", 'button !== null && ')],
    ['a hand-back keyed on a release', (s) => s.replace("button?.dataset.action === 'return'", "button?.dataset.action === 'release'")],
    ['the hand-back dropped', (s) => s.replace(/\s*ref=\{handBack\}/, '')],
    [
      'focus left on the unmounted button',
      (s) => s.replace(/\s*if \(button\?\.dataset\.action === 'return' && button\.matches\(':focus'\)\) document\.getElementById\(OVERVIEW_ID\)\?\.focus\(\);/, ''),
    ],
    ['focus taken whether or not the button held it', (s) => s.replace(" && button.matches(':focus')", '')],
    ['focus moved on mount, not on unmount', (s) => s.replace(/\(\) => \{\s*if \(button\?\.dataset/, '{\n      if (button?.dataset')],
    ['a hand-back with dependencies', (s) => s.replace(/\},\s*\[\],\s*\);/, '},\n    [mode],\n  );')],
    [
      'an inline hand-back',
      (s) => s.replace('ref={handBack}', "ref={(button) => () => { if (button?.dataset.action === 'return' && button.matches(':focus')) document.getElementById(OVERVIEW_ID)?.focus(); }}"),
    ],
    ['focus to an id written here', (s) => s.replace('document.getElementById(OVERVIEW_ID)', "document.getElementById('index-overview')")],
    ['focus moved by the click as well', (s) => s.replace("onClick={(event) => (event.detail > 1 ? undefined : slot.action === 'return' ? returnToRail() : releaseLayer())}", 'onClick={() => { returnToRail(); document.body.focus(); }}')],
    // One click, one layer: the reused button must not let a double-click unwind two.
    ['the multi-click guard dropped', (s) => s.replace("onClick={(event) => (event.detail > 1 ? undefined : slot.action === 'return' ? returnToRail() : releaseLayer())}", "onClick={() => (slot.action === 'return' ? returnToRail() : releaseLayer())}")],
    ['the guard ignoring the first click too', (s) => s.replace('event.detail > 1 ?', 'event.detail > 0 ?')],
    ['the guard inverted', (s) => s.replace('event.detail > 1 ?', 'event.detail <= 1 ?')],
    // One press, one layer: a held Enter's repeats must not click the reused button again.
    ['the repeat guard dropped', (s) => s.replace(/\s*onKeyDown=\{\(event\) => \{\s*if \(event\.repeat && event\.key === 'Enter'\) event\.preventDefault\(\);\s*\}\}/, '')],
    ['the repeat guard inverted', (s) => s.replace("if (event.repeat && event.key === 'Enter')", "if (!event.repeat && event.key === 'Enter')")],
    ['the repeat guard on every held key', (s) => s.replace(" && event.key === 'Enter'", '')],
    ['the repeat guard on another key', (s) => s.replace("event.key === 'Enter'", "event.key === ' '")],
    ['the repeat guard stops propagation instead', (s) => s.replace("'Enter') event.preventDefault();", "'Enter') event.stopPropagation();")],
    ['a second key handler', (s) => s.replace('type="button"', 'type="button" onKeyUp={() => releaseLayer()}')],
    ['an inline style literal', (s) => s.replace('<p className="chrome-identity">', '<p className="chrome-identity" style={{ textTransform: "uppercase" }}>')],
    ['the stylesheet not imported', (s) => s.replace("import './corner-chrome.css';", '')],
    ['local state', (s) => s.replace('const slot =', 'const [open] = useState(false);\n  const slot =')],
    ['a hover handler', (s) => s.replace('type="button"', 'type="button" onMouseEnter={() => releaseLayer()}')],
    ['a viewport read', (s) => s.replace('const slot =', 'const wide = window.innerWidth > 1200;\n  const slot =')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    const target = CHROME_TARGETS.get(name);
    assert.ok(target !== undefined, `"${name}" names the check it targets`);
    const failures = auditChrome(mutated);
    assert.ok(failures.some((failure) => failure.includes(target)), `"${name}" must be rejected by its own check (${target}) — found ${JSON.stringify(failures)}`);
  }
  assert.deepEqual([...CHROME_TARGETS.keys()].sort(), mutations.map(([name]) => name).sort(), 'every target names a mutation');
});
