/**
 * The Focus panel's rules, executed — block order, Deep/Shallow, width, the
 * open/closed style, where DOM focus goes — plus the source scans that ratchet
 * what `node --test` cannot load: `focus-panel.tsx` and the entry IDs
 * `index-nav.tsx` now carries. Every scan is driven over mutations of the
 * shipped file, so each can be seen to fail.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FOCUS_SECONDS, focusEasingCss } from './focus-motion.ts';
import { motionPace } from './motion-preference.ts';
import {
  FIELD_LABELS,
  FOCUS_PANEL_ID,
  FOCUS_PANEL_TITLE_ID,
  PANEL_FRACTION,
  PANEL_MAX_PX,
  PANEL_PADDING,
  RELEASE_LABEL,
  buildPanel,
  crossFade,
  crossFadeLayerStyle,
  crossFadeTiming,
  flightKey,
  focusMove,
  leavingAfter,
  indexEntryId,
  panelFraction,
  panelStyle,
  panelWidth,
  panelWidthCss,
  type PanelArtifact,
  type PanelArtifactProject,
} from './panel-model.ts';

const MODEL_TS = fileURLToPath(new URL('./panel-model.ts', import.meta.url));
const PANEL_TSX = fileURLToPath(new URL('./focus-panel.tsx', import.meta.url));
const NAV_TSX = fileURLToPath(new URL('./index-nav.tsx', import.meta.url));
const APP_TSX = fileURLToPath(new URL('../App.tsx', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));

// --- Fixtures ---------------------------------------------------------------

function project(id: string, isDeep: boolean, notable: string | null | undefined): PanelArtifactProject {
  return {
    id,
    isDeep,
    content: {
      project: `Title of ${id}`,
      role: 'Lead',
      team_size: 6,
      built: `What ${id} built.`,
      ...(notable === undefined ? {} : { notable }),
    },
  };
}

function artifact(): PanelArtifact {
  return {
    clients: [
      {
        id: 'client:a',
        name: 'Alpha',
        projects: [
          project('project:a/deep', true, 'First paragraph.\n\nSecond paragraph,\nwrapped.\n\n\n  Third.  '),
          project('project:a/shallow', false, null),
        ],
      },
      {
        id: 'client:b',
        name: 'Bravo',
        // Hand-edited past the gate: Shallow, yet carrying prose. The reading
        // position must follow `isDeep`, not the prose's presence.
        projects: [project('project:b/shallow-with-prose', false, 'Prose that must not show.')],
      },
    ],
  };
}

const kinds = (id: string, source: PanelArtifact = artifact()) => buildPanel(source, id)?.blocks.map((block) => block.kind);

function block<K extends string>(id: string, kind: K, source: PanelArtifact = artifact()) {
  const found = buildPanel(source, id)?.blocks.find((entry) => entry.kind === kind);
  assert.ok(found !== undefined, `${id} has a ${kind} block`);
  return found;
}

// --- Contents and order -----------------------------------------------------

test('the panel carries kicker, title, reading position, fields and release, in that order', () => {
  for (const id of ['project:a/deep', 'project:a/shallow', 'project:b/shallow-with-prose']) {
    assert.deepEqual(kinds(id), ['kicker', 'title', 'reading', 'fields', 'release'], id);
  }
});

test('the kicker is the Client’s name and the title the Project’s', () => {
  assert.deepEqual(block('project:a/deep', 'kicker'), { kind: 'kicker', text: 'Alpha' });
  assert.deepEqual(block('project:b/shallow-with-prose', 'kicker'), { kind: 'kicker', text: 'Bravo' });
  assert.deepEqual(block('project:a/deep', 'title'), { kind: 'title', text: 'Title of project:a/deep' });
});

test('a Deep Project’s reading position holds its notable, one paragraph per blank-line break', () => {
  assert.deepEqual(block('project:a/deep', 'reading'), {
    kind: 'reading',
    paragraphs: ['First paragraph.', 'Second paragraph,\nwrapped.', 'Third.'],
  });
});

test('a Shallow Project opens normally, with an empty reading position — no error, placeholder or skeleton', () => {
  assert.deepEqual(block('project:a/shallow', 'reading'), { kind: 'reading', paragraphs: [] });
  // The branch is on isDeep, never on notable: prose on a Shallow Project stays hidden…
  assert.deepEqual(block('project:b/shallow-with-prose', 'reading'), { kind: 'reading', paragraphs: [] });
  // …and a Deep Project with no prose is not an error either.
  for (const notable of [null, undefined, '', '  \n\n  ']) {
    const source: PanelArtifact = { clients: [{ id: 'c', name: 'C', projects: [project('p', true, notable)] }] };
    assert.deepEqual(block('p', 'reading', source), { kind: 'reading', paragraphs: [] }, JSON.stringify(notable));
  }
});

test('the field table is Role, Team, Built — and no Skills row', () => {
  const fields = block('project:a/deep', 'fields');
  assert.deepEqual(fields, {
    kind: 'fields',
    rows: [
      { label: 'Role', value: 'Lead' },
      { label: 'Team', value: '6' },
      { label: 'Built', value: 'What project:a/deep built.' },
    ],
  });
  assert.deepEqual(Object.values(FIELD_LABELS), ['Role', 'Team', 'Built']);
  assert.doesNotMatch(JSON.stringify(buildPanel(artifact(), 'project:a/deep')), /skill/i, 'the Dust is the display');
});

test('the panel ends with the release button, named by its word', () => {
  assert.equal(RELEASE_LABEL, 'release');
  assert.deepEqual(block('project:a/deep', 'release'), { kind: 'release', label: 'release' });
});

test('no ID, or an ID no Project carries, yields no panel', () => {
  assert.equal(buildPanel(artifact(), null), null);
  assert.equal(buildPanel(artifact(), 'project:missing'), null);
  assert.equal(buildPanel(artifact(), 'client:a'), null, 'a Client is not a Project');
  assert.equal(buildPanel({ clients: [] }, 'project:a/deep'), null);
});

test('the committed artifact opens its one Project with its authored prose', () => {
  const committed = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as PanelArtifact;
  const first = committed.clients[0]?.projects[0];
  assert.ok(first !== undefined);
  const panel = buildPanel(committed, first.id);
  assert.ok(panel !== null);
  assert.equal(panel.projectId, first.id);
  const reading = panel.blocks.find((entry) => entry.kind === 'reading');
  assert.ok(reading?.kind === 'reading');
  // The expectation is derived from the artifact's own prose by the same split rule
  // (blank-line breaks, trimmed, none empty), so editing the prose cannot break it.
  const authored = (first.content.notable ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');
  assert.deepEqual(reading.paragraphs, first.isDeep ? authored : []);
  if (first.isDeep) assert.ok(authored.length > 0, 'a Deep Project carries prose, or this case is vacuous');
});

test('the model is identical across repeated builds and never mutates the artifact', () => {
  const source = artifact();
  const before = JSON.stringify(source);
  assert.deepEqual(buildPanel(source, 'project:a/deep'), buildPanel(source, 'project:a/deep'));
  assert.equal(JSON.stringify(source), before);
});

// --- Width -------------------------------------------------------------------

test('the panel is min(560px, 46% of the width) wide, and its share never exceeds 46%', () => {
  assert.equal(PANEL_MAX_PX, 560);
  assert.equal(PANEL_FRACTION, 0.46);
  assert.equal(panelWidth(1600), 560);
  assert.equal(panelWidth(1000), 460);
  assert.ok(Math.abs(panelWidth(390) - 179.4) < 1e-9);
  assert.equal(panelFraction(1600), 0.35);
  assert.ok(Math.abs(panelFraction(390) - PANEL_FRACTION) < 1e-12);
  for (const width of [200, 390, 800, 1217, 1218, 1920, 5000]) {
    assert.ok(panelFraction(width) > 0 && panelFraction(width) <= PANEL_FRACTION, `${width}`);
  }
  for (const width of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(panelWidth(width), 0, `width ${width}`);
    assert.equal(panelFraction(width), 0, `width ${width}`);
  }
});

test('the CSS width is the same rule, from the same constants', () => {
  assert.equal(panelWidthCss(), `min(${PANEL_MAX_PX}px, ${PANEL_FRACTION * 100}vw)`);
});

// --- Open and closed -----------------------------------------------------------

test('open, the panel is visible at rest in its column; closed, it is off the edge and hidden', () => {
  const open = panelStyle(true);
  const closed = panelStyle(false);
  assert.equal(open.visibility, 'visible');
  assert.equal(closed.visibility, 'hidden', 'out of the tab order and the accessibility tree');
  assert.equal(open.transform, 'translateX(0)');
  assert.equal(closed.transform, 'translateX(100%)');
  for (const style of [open, closed]) {
    assert.equal(style.position, 'fixed');
    assert.equal(style.right, 0);
    assert.equal(style.top, 0);
    assert.equal(style.bottom, 0);
    assert.equal(style.width, panelWidthCss(), 'the column the camera leaves free');
    assert.equal(style.overflowY, 'auto', 'its own scroll container, so a wheel over it scrolls natively');
  }
});

test('the slide runs on the Focus duration and curve, and hides the panel only once it ends', () => {
  const curve = `${FOCUS_SECONDS}s ${focusEasingCss()}`;
  assert.equal(panelStyle(true).transition, `transform ${curve}, visibility 0s linear 0s`, 'visible from the first frame of opening');
  assert.equal(
    panelStyle(false).transition,
    `transform ${curve}, visibility 0s linear ${FOCUS_SECONDS}s`,
    'visible for the whole slide out, hidden exactly when it ends',
  );
});

test('the panel paints its own column and nothing else — no scrim, no backdrop, no overlay', () => {
  const allowed = [
    'position', 'top', 'right', 'bottom', 'zIndex', 'width', 'boxSizing', 'overflowY', 'overscrollBehavior',
    'padding', 'background', 'color', 'borderLeft', 'transform', 'visibility', 'transition',
  ];
  for (const style of [panelStyle(true), panelStyle(false)]) {
    assert.deepEqual(Object.keys(style).sort(), [...allowed].sort());
    assert.notEqual(style.width, '100%');
    assert.notEqual(style.width, '100vw');
    assert.doesNotMatch(JSON.stringify(style), /\binset\b|\bleft\b|backdrop|filter|box-shadow/i);
  }
});

// --- DOM focus -------------------------------------------------------------------

test('DOM focus moves to the panel on entry and on A → B, back to the entry on release, and nowhere otherwise', () => {
  assert.equal(focusMove(null, 'project:a', false), 'panel');
  assert.equal(focusMove('project:a', 'project:b', false), 'panel', 'focus stays in the panel as its content swaps');
  assert.deepEqual(focusMove('project:a', null, false), { entry: 'project:a' }, 'the released Project’s own entry');
  assert.equal(focusMove('project:a', 'project:a', false), null);
  assert.equal(focusMove(null, null, false), null);
});

test('a release that travelled leaves DOM focus on the door the visitor took; travel changes no other move', () => {
  assert.equal(focusMove('project:a', null, true), null, 'a Client, the overview or a Star took the visitor elsewhere');
  assert.equal(focusMove(null, 'project:a', true), 'panel', 'a Project focused in flight still opens the panel');
  assert.equal(focusMove('project:a', 'project:b', true), 'panel', 'and a move between Projects still stays in it');
  assert.equal(focusMove('project:a', 'project:a', true), null);
  assert.equal(focusMove(null, null, true), null);
});

test('the flight key changes exactly when the camera is sent somewhere new', () => {
  const rail = flightKey({ mode: 'rail', flightTarget: null });
  assert.equal(flightKey({ mode: 'rail', flightTarget: 'client:c' }), rail, 'on the Rail the standing target is not read');
  const overview = flightKey({ mode: 'freeflight', flightTarget: null });
  const client = flightKey({ mode: 'freeflight', flightTarget: 'client:c' });
  const other = flightKey({ mode: 'freeflight', flightTarget: 'client:d' });
  assert.equal(new Set([rail, overview, client, other]).size, 4, 'the Rail, the overview and each Client are distinct');
  assert.equal(flightKey({ mode: 'freeflight', flightTarget: 'client:c' }), client, 'and a key is a value: equal state, equal key');
  assert.notEqual(flightKey({ mode: 'freeflight', flightTarget: 'null' }), overview, 'a Client named "null" is not the overview');
});

// --- The A → B cross-fade (2.8) -----------------------------------------------------

test('only A → B cross-fades: entry and release slide the panel, and no change changes nothing', () => {
  assert.equal(crossFade('project:a', 'project:b'), 'project:a', 'the outgoing Project is the one left');
  assert.equal(crossFade('project:b', 'project:a'), 'project:b');
  assert.equal(crossFade(null, 'project:a'), null, 'entry slides');
  assert.equal(crossFade('project:a', null), null, 'release slides');
  assert.equal(crossFade('project:a', 'project:a'), null);
  assert.equal(crossFade(null, null), null);
  // DOM focus is unchanged by the fade: A → B still lands on the panel.
  assert.equal(focusMove('project:a', 'project:b', false), 'panel');
});

test('the outgoing layer is held through a release, so a running A → B fade finishes as the panel slides out', () => {
  assert.equal(leavingAfter(null, 'project:a', 'project:b'), 'project:a', 'A → B: A leaves');
  assert.equal(leavingAfter('project:a', 'project:b', 'project:c'), 'project:b', 'B → C: B leaves');
  assert.equal(leavingAfter('project:a', 'project:b', null), 'project:a', 'release mid-fade: A keeps fading, never cut');
  assert.equal(leavingAfter(null, 'project:a', null), null, 'release with nothing leaving');
  assert.equal(leavingAfter('project:a', null, 'project:c'), null, 'entry slides: the held layer goes');
  assert.equal(leavingAfter(null, null, 'project:a'), null);
});

test('reduced motion: the slide, its visibility delay and the cross-fade run on FOCUS_SECONDS × pace — brief, never cut', () => {
  const pace = motionPace(true);
  const seconds = FOCUS_SECONDS * pace;
  assert.ok(seconds > 0 && seconds < FOCUS_SECONDS);
  const curve = `${seconds}s ${focusEasingCss()}`;
  assert.equal(panelStyle(true, pace).transition, `transform ${curve}, visibility 0s linear 0s`);
  assert.equal(panelStyle(false, pace).transition, `transform ${curve}, visibility 0s linear ${seconds}s`, 'hidden exactly when the shorter slide ends');
  assert.equal(crossFadeTiming('1', pace).options.duration, seconds * 1000);
  assert.equal(crossFadeTiming('0.4', pace).options.easing, focusEasingCss(), 'the same curve, only shorter');
  assert.deepEqual(crossFadeTiming('0.4', pace).outgoing, crossFadeTiming('0.4').outgoing, 'and the same keyframes');
  // At full motion the pace is 1, and the default is full motion.
  assert.deepEqual(panelStyle(false, motionPace(false)), panelStyle(false));
  assert.deepEqual(crossFadeTiming('1', motionPace(false)), crossFadeTiming('1'));
  // Open and closed differ only in the three fields they always did.
  const open = panelStyle(true, pace);
  assert.equal(open.visibility, 'visible');
  assert.equal(panelStyle(false, pace).visibility, 'hidden');
});

test('a pace that is not a positive finite number reads as 1 — never a 0s or NaN duration', () => {
  for (const pace of [0, -0.25, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.deepEqual(panelStyle(true, pace), panelStyle(true, 1), `open at ${pace}`);
    assert.deepEqual(panelStyle(false, pace), panelStyle(false, 1), `closed at ${pace}`);
    assert.deepEqual(crossFadeTiming('0.5', pace), crossFadeTiming('0.5', 1), `cross-fade at ${pace}`);
    assert.doesNotMatch(panelStyle(false, pace).transition, /NaN|Infinity/);
    assert.ok(crossFadeTiming('1', pace).options.duration > 0);
  }
});

test('the cross-fade runs on the Focus duration and curve, incoming 0 → 1 and outgoing from where it was drawn → 0', () => {
  const timing = crossFadeTiming('1');
  assert.deepEqual(timing.incoming, [{ opacity: 0 }, { opacity: 1 }]);
  assert.deepEqual(timing.outgoing, [{ opacity: 1 }, { opacity: 0 }]);
  assert.equal(timing.options.duration, FOCUS_SECONDS * 1000, 'WAAPI counts milliseconds');
  assert.equal(timing.options.easing, focusEasingCss(), 'the camera’s and the Motes’ curve');
  assert.equal(timing.options.fill, 'forwards', 'the end holds, so the outgoing layer stays gone');
  // B → C during A → B: B fades out from the opacity it had reached, never from a cut to full.
  assert.deepEqual(crossFadeTiming('0.35').outgoing, [{ opacity: 0.35 }, { opacity: 0 }]);
  assert.deepEqual(crossFadeTiming(0.6).outgoing, [{ opacity: 0.6 }, { opacity: 0 }]);
  const odd: readonly (readonly [string | number, number])[] = [
    ['', 1],
    ['auto', 1],
    ['NaN', 1],
    ['-2', 0],
    ['7', 1],
    [Number.NaN, 1],
    [Number.POSITIVE_INFINITY, 1],
  ];
  for (const [drawn, expected] of odd) {
    assert.deepEqual(crossFadeTiming(drawn).outgoing[0], { opacity: expected }, `drawn ${String(drawn)}`);
  }
});

test('the outgoing layer lies over the incoming content, clipped to the panel, and takes no pointer', () => {
  const layer = crossFadeLayerStyle();
  assert.equal(layer.position, 'absolute');
  assert.equal(layer.top, 0);
  assert.equal(layer.left, 0);
  assert.equal(layer.right, 0);
  assert.equal(layer.padding, PANEL_PADDING, 'the panel’s own padding, so the two layers align');
  assert.equal(panelStyle(true).padding, PANEL_PADDING);
  assert.equal(layer.height, '100%');
  assert.equal(layer.boxSizing, 'border-box', 'the padding sits inside 100%, so the layer is never taller than the panel');
  assert.equal(layer.overflow, 'hidden', 'a longer outgoing Project never lengthens the panel’s scroll');
  assert.equal(layer.pointerEvents, 'none');
});

test('an index entry’s id is unique per Project, whitespace-free, and not the panel’s', () => {
  const ids = ['project:sncf/client-referential-mdm-replacement', 'project:a/1', 'project:a/2'].map(indexEntryId);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.doesNotMatch(id, /\s/);
    assert.notEqual(id, FOCUS_PANEL_ID);
    assert.notEqual(id, FOCUS_PANEL_TITLE_ID);
  }
  assert.ok(indexEntryId('project:a/1').endsWith('project:a/1'), 'the entity ID verbatim');
});

// --- Purity of the model -----------------------------------------------------------

function blank(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

function auditModel(source: string): string[] {
  const code = blank(source);
  const failures: string[] = [];
  for (const [, specifier] of code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (specifier !== './focus-motion.ts') failures.push(`imports ${specifier} — the panel model imports the timing module only`);
  }
  if (/\bwindow\b|\bdocument\b|\bnavigator\b|innerWidth/.test(code)) failures.push('reads a DOM global — widths arrive as arguments');
  if (/\bnavigationStore\b|\bgetState\b/.test(code)) failures.push('reads the store — the renderer subscribes');
  if (/\.sort\s*\(/.test(code)) failures.push('sorts — the artifact’s order is the order');
  if (/\bnotable\s*(?:\?\s|!==?|===?|&&|\|\|)|if\s*\(\s*!?\s*\w*\.?notable\b/.test(code)) {
    failures.push('branches on notable — Deep/Shallow is isDeep’s');
  }
  if (/\bskills?\b/i.test(code.replace(/No `Skills` row/g, ''))) failures.push('names Skills — no Skills row');
  return failures;
}

test('the panel model is pure and branches on isDeep alone', () => {
  assert.deepEqual(auditModel(readFileSync(MODEL_TS, 'utf8')), []);
});

test('the model audit rejects the real model with any one impurity added', () => {
  const real = readFileSync(MODEL_TS, 'utf8');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a store import', (s) => `import { navigationStore } from './state.ts';\n${s}`],
    ['a viewport read', (s) => s.replace('return Math.min(PANEL_MAX_PX, PANEL_FRACTION * width);', 'return Math.min(PANEL_MAX_PX, PANEL_FRACTION * window.innerWidth);')],
    ['a branch on notable', (s) => s.replace('project.isDeep ? paragraphsOf', "content.notable ? paragraphsOf")],
    ['a Skills row', (s) => s.replace("{ label: FIELD_LABELS.built, value: content.built },", "{ label: FIELD_LABELS.built, value: content.built },\n              { label: 'Skills', value: '' },")],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditModel(mutated), [], `"${name}" must be rejected`);
  }
});

// --- The renderer stays thin ----------------------------------------------------------

/**
 * `focus-panel.tsx` as a pure function over its source: the thin mapping the
 * header describes, and the things it is allowed to hold — two selector
 * subscriptions (Focus, and the flight key), a ref for the last shown Project,
 * an effect applying `focusMove` — each pinned positively.
 */
function auditPanel(source: string): string[] {
  const code = blank(source);
  const failures: string[] = [];
  if (!/const\s+focusedProjectId\s*=\s*useStore\(\s*navigationStore\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*\1\.focusedProjectId\s*\)/.test(code)) {
    failures.push('does not subscribe to focusedProjectId with a selector');
  }
  if (!/const\s+flight\s*=\s*useStore\(\s*navigationStore\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*flightKey\(\s*\1\s*\)\s*\)/.test(code)) {
    failures.push('does not subscribe to the flight key with a selector — a travelled release cannot be told from a plain one');
  }
  if ((code.match(/\buseStore\s*\(/g) ?? []).length !== 2) failures.push('subscribes other than twice');
  // The reduced-motion pace (2.10): read from the preference module, once, through
  // useSyncExternalStore, and handed to both the slide and the cross-fade.
  if (!/const\s+pace\s*=\s*motionPace\(\s*useSyncExternalStore\(\s*subscribeReducedMotion\s*,\s*reducedMotion\s*\)\s*\)\s*;/.test(code)) {
    failures.push('the pace is not motionPace of the preference, read through useSyncExternalStore');
  }
  if ((code.match(/\buseSyncExternalStore\s*\(/g) ?? []).length !== 1) failures.push('the preference is read other than once');
  if ((code.match(/\bpace\b/g) ?? []).length !== 3) failures.push('the pace is used other than by the slide and the cross-fade');
  if (/\bsetReducedMotion\b/.test(code)) failures.push('the panel writes the preference — scene-host.tsx is its one writer');
  if (!/const\s+previousFlight\s*=\s*useRef\(\s*flight\s*\)/.test(code)) failures.push('the flight key last seen is not a ref seeded at mount');
  if (/\buseState\b|\buseReducer\b|\buseMemo\b|\bsubscribe\s*\(/.test(code)) {
    failures.push('keeps state of its own — the store is the one authority');
  }
  // One layout effect, for the cross-fade alone (2.8): it must start before paint.
  if ((code.match(/\buseLayoutEffect\s*\(/g) ?? []).length !== 1) failures.push('a layout effect other than the cross-fade’s');
  if (/\.sort\s*\(|\.filter\s*\(|\.reverse\s*\(|\.slice\s*\(/.test(code)) failures.push('orders or selects — the model owns the order');
  if (/\bisDeep\b|\bnotable\b|\bteam_size\b|\bcontent\s*\./.test(code)) failures.push('reads the artifact directly — the model owns the blocks');
  if (/\bwindow\b|innerWidth|innerHeight|getBoundingClientRect|matchMedia/.test(code)) failures.push('reads the viewport');
  if (/\.setState\b|\bsetState\b\s*[:,)}]/.test(code)) failures.push('writes the store with setState');
  if (/\b(?:focusProject|selectClient|advanceScroll|enterRail|enterFreeFlight|resetNavigation)\b/.test(code)) {
    failures.push('names a navigation event other than releaseFocus');
  }
  if (!/<button\b[^>]*\bonClick=\{\s*releaseFocus\s*\}[^>]*>\s*\{\s*block\.label\s*\}\s*<\/button>/.test(code)) {
    failures.push('the release button does not call releaseFocus with its word as its name');
  }
  if ((code.match(/\bonClick\b/g) ?? []).length !== 1) failures.push('a handler beyond release');
  if (/\bonMouse\w+|\bonPointer\w+|\bonFocus\b|\bonBlur\b|\bonWheel\b|\bonScroll\b/.test(code)) {
    failures.push('reacts to hover, pointer, focus or scroll — Focus is deliberate, and the panel scrolls natively');
  }
  if (/\bscrim\b|\bbackdrop\b|\boverlay\b|aria-modal|role=["']dialog|<dialog\b|showModal/i.test(code)) {
    failures.push('a scrim, backdrop, overlay or modal — the scene is never occluded');
  }
  // `inert` exactly once, on the outgoing layer (2.8). Anywhere else it is the
  // modal half of a dialog: the page behind the panel made unreachable.
  if ((code.match(/\binert\b/g) ?? []).length !== 1) failures.push('inert other than once, on the outgoing layer — a modal by another name');
  const layer = /<div\b([^>]*\bref=\{\s*outgoing\s*\}[^>]*)>([\s\S]*?)<\/div>/.exec(code);
  if (layer === null) {
    failures.push('no outgoing layer — A → B would swap its content with no transition');
  } else {
    const attributes = layer[1] ?? '';
    if (!/\baria-hidden="true"/.test(attributes)) failures.push('the outgoing layer is not aria-hidden="true" — A would be read beside B');
    if (!/\binert(?![\w=-])/.test(attributes)) failures.push('the outgoing layer is not inert — its release button stays in the tab order');
    if (/\bid=/.test(attributes)) failures.push('the outgoing layer carries an id — two elements would answer to it');
    if (!/\bstyle=\{\s*crossFadeLayerStyle\(\s*\)\s*\}/.test(attributes)) failures.push('the outgoing layer is not laid over the content');
    if (!/<PanelBlocks\s+blocks=\{\s*leaving\.blocks\s*\}\s+titleId=\{\s*undefined\s*\}\s*\/>/.test(layer[2] ?? '')) {
      failures.push('the outgoing layer does not render the leaving Project’s blocks with no title id');
    }
  }
  if (!/\{\s*leaving\s*===\s*null\s*\?\s*null\s*:\s*\(\s*<div\b[^>]*\bref=\{\s*outgoing\s*\}/.test(code)) {
    failures.push('the outgoing layer is not rendered exactly while a Project is leaving');
  }
  // The leaving Project is held, not derived: written only on a render where the
  // store's ID differs from the one the focus effect last recorded, so a re-render
  // after the effect commits cannot recompute it as null and unmount A mid-fade.
  if (!/const\s+leavingId\s*=\s*useRef<string\s*\|\s*null>\(\s*null\s*\)/.test(code)) failures.push('the leaving Project is not held in a ref');
  if (
    !/if\s*\(\s*focusedProjectId\s*!==\s*previous\.current\s*\)\s*leavingId\.current\s*=\s*leavingAfter\(\s*leavingId\.current\s*,\s*previous\.current\s*,\s*focusedProjectId\s*\)\s*;/.test(
      code,
    )
  ) {
    failures.push('the leaving Project is not leavingAfter(leaving, previous, next), written only when Focus has changed');
  }
  if ((code.match(/\bleavingId\.current\s*=/g) ?? []).length !== 1) failures.push('the leaving Project is written other than once');
  if (!/const\s+leaving\s*=\s*buildPanel\(\s*artifact\s*,\s*leavingId\.current\s*\)/.test(code)) {
    failures.push('the outgoing layer is not the held leaving Project');
  }
  // The reading position, tracked as the reader scrolls: read after the swap, the
  // browser may already have clamped it to the incoming Project's length.
  if (!/const\s+scrolled\s*=\s*useRef\(\s*0\s*\)/.test(code)) failures.push('the reading position is not a ref');
  const listener = /useEffect\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[\s*\]\s*\)/.exec(code)?.[1] ?? '';
  if (
    !/const\s+element\s*=\s*container\.current\s*;/.test(listener) ||
    !/scrolled\.current\s*=\s*element\.scrollTop\s*;/.test(listener) ||
    !/element\.addEventListener\(\s*'scroll'\s*,\s*track\s*,\s*\{\s*passive\s*:\s*true\s*\}\s*\)/.test(listener) ||
    !/return\s*\(\)\s*=>\s*element\.removeEventListener\(\s*'scroll'\s*,\s*track\s*\)/.test(listener)
  ) {
    failures.push('the reading position is not tracked by a passive scroll listener on the panel, removed on unmount');
  }
  const layout = /useLayoutEffect\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[\s*focusedProjectId\s*\]\s*\)/.exec(code);
  if (layout === null) {
    failures.push('no layout effect keyed on focusedProjectId — the fade would start after a frame of A and B at full');
  } else {
    const body = layout[1] ?? '';
    if (!/const\s+fade\s*=\s*crossFade\(\s*previous\.current\s*,\s*focusedProjectId\s*\)/.test(body)) {
      failures.push('the layout effect does not ask crossFade(previous, next)');
    }
    if (/previous(?:Flight)?\.current\s*=/.test(body)) {
      failures.push('the layout effect writes the previous ID or flight key — the focus effect after it would read the new one');
    }
    const fadeBlock =
      /if\s*\(\s*fade\s*!==\s*null\s*&&\s*incoming\.current\s*!==\s*null\s*\)\s*\{\s*const\s+timing\s*=\s*crossFadeTiming\(\s*getComputedStyle\(\s*incoming\.current\s*\)\.opacity\s*,\s*pace\s*\)\s*;\s*incoming\.current\.animate\(\s*timing\.incoming\s*,\s*timing\.options\s*\)\s*;\s*outgoing\.current\?\.animate\(\s*timing\.outgoing\s*,\s*timing\.options\s*\)\s*;\s*outgoing\.current\?\.scrollTo\(\s*\{\s*top\s*:\s*scrolled\.current\s*\}\s*\)\s*;\s*\}/;
    if (!fadeBlock.test(body)) {
      failures.push('A → B does not fade both layers on crossFadeTiming and keep the outgoing one where the reader was');
    }
    const reset =
      /if\s*\(\s*focusMove\(\s*previous\.current\s*,\s*focusedProjectId\s*,\s*flight\s*!==\s*previousFlight\.current\s*\)\s*===\s*'panel'\s*\)\s*container\.current\?\.scrollTo\(\s*\{\s*top\s*:\s*0\s*\}\s*\)\s*;/;
    if (!reset.test(body)) failures.push('entry does not reset the panel to its top — B would open at A’s reading position');
    if ((code.match(/scrollTo\(\s*\{\s*top\s*:\s*0\s*\}\s*\)/g) ?? []).length !== 1) failures.push('the panel is reset to its top other than once');
    if (body.search(reset) !== -1 && body.search(fadeBlock) !== -1 && body.search(reset) < body.search(fadeBlock)) {
      failures.push('the panel is reset before the outgoing layer takes the reading position');
    }
  }
  if (
    !/<div\s+ref=\{\s*incoming\s*\}\s*>\s*\{\s*panel\s*===\s*null\s*\?\s*null\s*:\s*<PanelBlocks\s+blocks=\{\s*panel\.blocks\s*\}\s+titleId=\{\s*FOCUS_PANEL_TITLE_ID\s*\}\s*\/>\s*\}\s*<\/div>/.test(
      code,
    )
  ) {
    failures.push('the incoming layer does not render the shown Project’s blocks with the title id');
  }
  if ((code.match(/<PanelBlocks\b/g) ?? []).length !== 2) failures.push('the blocks are rendered other than once per layer');
  if ((code.match(/\bFOCUS_PANEL_TITLE_ID\b/g) ?? []).length !== 3) {
    failures.push('FOCUS_PANEL_TITLE_ID is used other than in the import, the label and the incoming title');
  }
  const container = /<aside\b([^>]*)>/.exec(code);
  if (container === null) {
    failures.push('no <aside> container');
  } else {
    const attributes = container[1] ?? '';
    if (!/\bid=\{\s*FOCUS_PANEL_ID\s*\}/.test(attributes)) failures.push('the container is not FOCUS_PANEL_ID — the wheel cannot find it');
    if (!/\btabIndex=\{\s*-1\s*\}/.test(attributes)) failures.push('the container is not tabindex="-1" — focus cannot land on it');
    if (!/\baria-labelledby=\{\s*panel\s*===\s*null\s*\?\s*undefined\s*:\s*FOCUS_PANEL_TITLE_ID\s*\}/.test(attributes)) {
      failures.push('the container is not labelled by its title exactly while the title is rendered');
    }
    if (!/\bref=\{\s*container\s*\}/.test(attributes)) failures.push('the container is not the element focus moves to');
    if (!/\bstyle=\{\s*panelStyle\(\s*focusedProjectId\s*!==\s*null\s*&&\s*panel\s*!==\s*null\s*,\s*pace\s*\)\s*\}/.test(attributes)) {
      failures.push('the style is not panelStyle(open, pace), open exactly while a known Project is focused');
    }
  }
  if (!/<h2\b[^>]*\bid=\{\s*titleId\s*\}[^>]*>\s*\{\s*block\.text\s*\}\s*<\/h2>/.test(code)) {
    failures.push('the title is not the <h2> carrying its layer’s title id');
  }
  if (!/case\s*'kicker'\s*:\s*return\s*\(?\s*<p\b[^>]*>\s*\{\s*block\.text\s*\}\s*<\/p>/.test(code)) {
    failures.push('the kicker case does not render block.text');
  }
  if (
    !/case\s*'reading'\s*:\s*return\s*\(?\s*<div\b[^>]*>\s*\{\s*block\.paragraphs\.map\(\s*\(\s*(\w+)\s*,\s*\w+\s*\)\s*=>\s*\(?\s*<p\b[^>]*>\s*\{\s*\1\s*\}\s*<\/p>/.test(
      code,
    )
  ) {
    failures.push('the reading case does not map block.paragraphs to <p> elements');
  }
  if (
    !/block\.rows\.map\(\s*\(\s*row\s*\)\s*=>[\s\S]*?<th\b[^>]*>\s*\{\s*row\.label\s*\}\s*<\/th>\s*<td\b[^>]*>\s*\{\s*row\.value\s*\}\s*<\/td>/.test(
      code,
    )
  ) {
    failures.push('the fields case does not put row.label in <th> and row.value in <td>');
  }
  if (!/const\s+shown\s*=\s*useRef<string\s*\|\s*null>\(\s*null\s*\)/.test(code) ||
    !/if\s*\(\s*focusedProjectId\s*!==\s*null\s*\)\s*shown\.current\s*=\s*focusedProjectId\s*;/.test(code) ||
    !/const\s+panel\s*=\s*buildPanel\(\s*artifact\s*,\s*shown\.current\s*\)/.test(code)) {
    failures.push('the content is not the last shown Project — the panel would slide out blank');
  }
  const effect = /useEffect\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[\s*focusedProjectId\s*,\s*flight\s*\]\s*\)/.exec(code);
  if (effect === null) {
    failures.push('no effect keyed on focusedProjectId and flight — a flight change alone would leave the last key stale');
  } else {
    const body = effect[1] ?? '';
    if (!/const\s+move\s*=\s*focusMove\(\s*previous\.current\s*,\s*focusedProjectId\s*,\s*flight\s*!==\s*previousFlight\.current\s*\)/.test(body)) {
      failures.push('the effect does not ask focusMove(previous, next, travelled)');
    }
    if ((body.match(/previousFlight\.current\s*=\s*flight\s*;/g) ?? []).length !== 1) failures.push('the effect does not remember the flight key exactly once');
    const travelAsked = body.search(/focusMove\(/);
    const flightRemembered = body.search(/previousFlight\.current\s*=/);
    if (travelAsked !== -1 && flightRemembered !== -1 && flightRemembered < travelAsked) {
      failures.push('the flight key is overwritten before focusMove reads it — no release would ever count as travel');
    }
    if (!/previous\.current\s*=\s*focusedProjectId/.test(body)) failures.push('the effect does not remember the previous ID');
    if ((body.match(/previous\.current\s*=/g) ?? []).length > 1) failures.push('the effect writes the previous ID more than once');
    const asked = body.search(/focusMove\(/);
    const remembered = body.search(/previous\.current\s*=/);
    if (asked !== -1 && remembered !== -1 && remembered < asked) {
      failures.push('the previous ID is overwritten before focusMove reads it — every move would be null');
    }
    if (!/\}\s*else\s+if\s*\(\s*move\s*!==\s*null\s*\)\s*\{\s*document\.getElementById\(\s*indexEntryId\(\s*move\.entry\s*\)\s*\)/.test(body)) {
      failures.push('release is not exactly the branch where move is { entry } — the else of `panel`, guarded by `move !== null`');
    }
    if (!/if\s*\(\s*move\s*===\s*'panel'\s*\)\s*\{[\s\S]*container\.current\?\.focus\(/.test(body)) {
      failures.push('entry does not move DOM focus to the panel container');
    }
    if (!/document\.getElementById\(\s*indexEntryId\(\s*move\.entry\s*\)\s*\)\?\.focus\(\s*\)/.test(body)) {
      failures.push('release does not return DOM focus to the released Project’s entry');
    }
    if (/\.animate\(|scrollTo\(/.test(body)) failures.push('the focus effect fades or scrolls — after paint, a frame late');
  }
  return failures;
}

test('the panel renderer is a mapping over the model, and holds only what the header names', () => {
  assert.deepEqual(auditPanel(readFileSync(PANEL_TSX, 'utf8')), []);
});

test('the panel audit rejects the real renderer with any one guarantee broken', () => {
  const real = readFileSync(PANEL_TSX, 'utf8');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a whole-store subscription', (s) => s.replace('useStore(navigationStore, (state) => state.focusedProjectId)', 'useStore(navigationStore).focusedProjectId')],
    ['the wrong field selected', (s) => s.replace('(state) => state.focusedProjectId', '(state) => state.railPosition')],
    ['local state', (s) => s.replace('const shown = useRef', 'const [open, setOpen] = useState(false);\n  const shown = useRef')],
    ['a branch on depth', (s) => s.replace("case 'reading':", "case 'reading':\n            if (!artifact.clients[0]?.projects[0]?.isDeep) return null;")],
    ['a Skills row read', (s) => s.replace('<td>{row.value}</td>', '<td>{row.value}</td><td>{String(content.skills)}</td>')],
    ['no release', (s) => s.replace('onClick={releaseFocus}', '')],
    ['a hover release', (s) => s.replace('onClick={releaseFocus}', 'onClick={releaseFocus} onMouseLeave={releaseFocus}')],
    ['a scrim', (s) => s.replace('<aside', '<div className="scrim" />\n    <aside')],
    ['a modal', (s) => s.replace('tabIndex={-1}', 'tabIndex={-1}\n      aria-modal="true"')],
    ['not focusable', (s) => s.replace('tabIndex={-1}', '')],
    ['unlabelled', (s) => s.replace('aria-labelledby={panel === null ? undefined : FOCUS_PANEL_TITLE_ID}', '')],
    ['labelled before any title exists', (s) => s.replace('aria-labelledby={panel === null ? undefined : FOCUS_PANEL_TITLE_ID}', 'aria-labelledby={FOCUS_PANEL_TITLE_ID}')],
    ['the wrong id', (s) => s.replace('id={FOCUS_PANEL_ID}', 'id="panel"')],
    ['the title unmarked', (s) => s.replace('<h2 key={block.kind} id={titleId}>', '<h2 key={block.kind}>')],
    // 2.8's cross-fade, one guarantee removed at a time.
    ['the outgoing layer dropped', (s) => s.replace(/\{leaving === null \? null : \([\s\S]*?\)\}\r?\n/, '')],
    ['the outgoing layer narrated', (s) => s.replace('<div ref={outgoing} aria-hidden="true" inert', '<div ref={outgoing} inert')],
    ['the outgoing layer focusable', (s) => s.replace('<div ref={outgoing} aria-hidden="true" inert', '<div ref={outgoing} aria-hidden="true"')],
    ['the outgoing title keeps the id', (s) => s.replace('titleId={undefined}', 'titleId={FOCUS_PANEL_TITLE_ID}')],
    ['the outgoing layer carries an id', (s) => s.replace('<div ref={outgoing}', '<div ref={outgoing} id="focus-panel-outgoing"')],
    ['the outgoing layer in flow', (s) => s.replace(' style={crossFadeLayerStyle()}', '')],
    ['the outgoing layer shows the incoming Project', (s) => s.replace('blocks={leaving.blocks}', 'blocks={panel.blocks}')],
    ['a fade on every change', (s) => s.replace('buildPanel(artifact, leavingId.current)', 'buildPanel(artifact, previous.current)')],
    ['the leaving Project recomputed on every render', (s) => s.replace('if (focusedProjectId !== previous.current) leavingId.current =', 'leavingId.current =')],
    [
      'a release cuts a running fade',
      (s) => s.replace('leavingAfter(leavingId.current, previous.current, focusedProjectId)', 'crossFade(previous.current, focusedProjectId)'),
    ],
    [
      'the leaving Project derived at render',
      (s) => s.replace('const leaving = buildPanel(artifact, leavingId.current);', 'const leaving = buildPanel(artifact, crossFade(previous.current, focusedProjectId));'),
    ],
    ['the fade after paint', (s) => s.replace('useLayoutEffect(() => {', 'useEffect(() => {')],
    ['the reading position dropped from the outgoing layer', (s) => s.replace('outgoing.current?.scrollTo({ top: scrolled.current });', '')],
    ['the reading position read after the swap', (s) => s.replace('{ top: scrolled.current }', '{ top: container.current?.scrollTop ?? 0 }')],
    ['the reading position never tracked', (s) => s.replace('scrolled.current = element.scrollTop;', '')],
    ['the listener never removed', (s) => s.replace("return () => element.removeEventListener('scroll', track);", 'return undefined;')],
    [
      'the reset before the reading position is taken',
      (s) =>
        s.replace(
          '    const fade = crossFade(',
          "    if (focusMove(previous.current, focusedProjectId, flight !== previousFlight.current) === 'panel') container.current?.scrollTo({ top: 0 });\n    const fade = crossFade(",
        ),
    ],
    ['a fade in the focus effect too', (s) => s.replace('container.current?.focus({ preventScroll: true });', 'container.current?.focus({ preventScroll: true });\n      incoming.current?.animate([], {});')],
    ['the incoming title loses the id', (s) => s.replace('titleId={FOCUS_PANEL_TITLE_ID}', 'titleId={undefined}')],
    ['no incoming fade', (s) => s.replace('incoming.current.animate(timing.incoming, timing.options);', '')],
    ['no outgoing fade', (s) => s.replace('outgoing.current?.animate(timing.outgoing, timing.options);', '')],
    ['the fade on its own timing', (s) => s.replace('animate(timing.incoming, timing.options)', 'animate(timing.incoming, { duration: 300 })')],
    ['the fade from full every time', (s) => s.replace('crossFadeTiming(getComputedStyle(incoming.current).opacity, pace)', "crossFadeTiming('1', pace)")],
    // 2.10's pace.
    ['the fade at full length always', (s) => s.replace('crossFadeTiming(getComputedStyle(incoming.current).opacity, pace)', 'crossFadeTiming(getComputedStyle(incoming.current).opacity)')],
    ['the slide at full length always', (s) => s.replace('panelStyle(focusedProjectId !== null && panel !== null, pace)', 'panelStyle(focusedProjectId !== null && panel !== null)')],
    ['the slide cut', (s) => s.replace('panelStyle(focusedProjectId !== null && panel !== null, pace)', 'panelStyle(focusedProjectId !== null && panel !== null, 0)')],
    ['the pace ignoring the preference', (s) => s.replace('motionPace(useSyncExternalStore(subscribeReducedMotion, reducedMotion))', 'motionPace(false)')],
    ['the preference read without subscribing', (s) => s.replace('motionPace(useSyncExternalStore(subscribeReducedMotion, reducedMotion))', 'motionPace(reducedMotion())')],
    ['the preference written from the panel', (s) => s.replace('const container = useRef', 'setReducedMotion(true);\n  const container = useRef')],
    ['a fade on entry too', (s) => s.replace('if (fade !== null && incoming.current !== null)', 'if (incoming.current !== null)')],
    [
      'the previous ID overwritten before the fade reads it',
      (s) => s.replace('    const fade = crossFade(', '    previous.current = focusedProjectId;\n    const fade = crossFade('),
    ],
    ['inert on the whole panel', (s) => s.replace('tabIndex={-1}', 'tabIndex={-1}\n      inert')],
    ['always open', (s) => s.replace('panelStyle(focusedProjectId !== null && panel !== null, pace)', 'panelStyle(true, pace)')],
    ['blank on close', (s) => s.replace('buildPanel(artifact, shown.current)', 'buildPanel(artifact, focusedProjectId)')],
    ['no focus on entry', (s) => s.replace('container.current?.focus({ preventScroll: true });', '')],
    ['no focus on release', (s) => s.replace('document.getElementById(indexEntryId(move.entry))?.focus();', '')],
    ['focus to the root on release', (s) => s.replace('document.getElementById(indexEntryId(move.entry))?.focus();', 'document.body.focus();')],
    ['the previous ID forgotten', (s) => s.replace('previous.current = focusedProjectId;', '')],
    ['a viewport read', (s) => s.replace('const container = useRef', 'const wide = window.innerWidth > 1200;\n  const container = useRef')],
    ['the kicker shows the wrong field', (s) => s.replace('return <p key={block.kind}>{block.text}</p>;', 'return <p key={block.kind}>{block.kind}</p>;')],
    ['the reading position dropped', (s) => s.replace("case 'reading':", "case 'reading':\n            return null;")],
    ['paragraphs not in <p>', (s) => s.replace('<p key={index}>{paragraph}</p>', '<span key={index}>{paragraph}</span>')],
    ['the label not a header cell', (s) => s.replace('<th scope="row">{row.label}</th>', '<td>{row.label}</td>')],
    ['the value replaced by the label', (s) => s.replace('<td>{row.value}</td>', '<td>{row.label}</td>')],
    ['no scroll reset on entry', (s) => s.replace('container.current?.scrollTo({ top: 0 });', '')],
    [
      'the previous ID overwritten before it is read',
      (s) =>
        s.replace(
          /(const move = focusMove\(previous\.current, focusedProjectId, flight !== previousFlight\.current\);)(\r?\n\s*)(previous\.current = focusedProjectId;)/,
          '$3$2$1',
        ),
    ],
    ['the release branch inverted', (s) => s.replace('} else if (move !== null) {', '} else if (move === null) {')],
    ['the release branch unguarded', (s) => s.replace('} else if (move !== null) {', '} else {')],
    // A release by travel leaves DOM focus on the door taken.
    ['the flight key not subscribed', (s) => s.replace('useStore(navigationStore, (state) => flightKey(state))', "'rail'")],
    ['a whole-store flight subscription', (s) => s.replace('useStore(navigationStore, (state) => flightKey(state))', 'flightKey(useStore(navigationStore))')],
    [
      'travel ignored',
      (s) => s.replace('const move = focusMove(previous.current, focusedProjectId, flight !== previousFlight.current);', 'const move = focusMove(previous.current, focusedProjectId, false);'),
    ],
    [
      'every release counted as travel',
      (s) => s.replace('const move = focusMove(previous.current, focusedProjectId, flight !== previousFlight.current);', 'const move = focusMove(previous.current, focusedProjectId, true);'),
    ],
    ['the flight key never remembered', (s) => s.replace('previousFlight.current = flight;', '')],
    [
      'the flight key remembered before it is read',
      (s) =>
        s
          .replace('previousFlight.current = flight;', '')
          .replace('    const move = focusMove(', '    previousFlight.current = flight;\n    const move = focusMove('),
    ],
    ['the focus effect blind to flight', (s) => s.replace('}, [focusedProjectId, flight]);', '}, [focusedProjectId]);')],
    ['the last flight key seeded blank', (s) => s.replace('const previousFlight = useRef(flight);', "const previousFlight = useRef('');")],
    ['the layout effect remembers the flight key', (s) => s.replace('    const fade = crossFade(', '    previousFlight.current = flight;\n    const fade = crossFade(')],
    ['the previous ID written twice', (s) => s.replace('previous.current = focusedProjectId;', 'previous.current = focusedProjectId;\n    previous.current = null;')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditPanel(mutated), [], `"${name}" must be rejected`);
  }
});

// --- Index entries carry their ID; App mounts the panel -------------------------------

function auditEntryIds(source: string): string[] {
  const code = blank(source);
  const failures: string[] = [];
  const projectButton = /<button\b([^>]*\bonClick=\{\s*\(\)\s*=>\s*activateProject\(\s*project\.id\s*,\s*client\.id\s*\)\s*\}[^>]*)>/.exec(code);
  if (projectButton === null) return ['no Project button'];
  if (!/\bid=\{\s*indexEntryId\(\s*project\.id\s*\)\s*\}/.test(projectButton[1] ?? '')) {
    failures.push('the Project button does not carry id={indexEntryId(project.id)} — focus cannot return to it');
  }
  if ((code.match(/\bid=\{/g) ?? []).length !== 1) failures.push('an id other than the Project entry’s');
  if (!/import\s*\{\s*indexEntryId\s*\}\s*from\s*'\.\/panel-model\.ts'/.test(code)) failures.push('the id is not the model’s');
  return failures;
}

test('each Project entry in the index carries the id focus returns to', () => {
  assert.deepEqual(auditEntryIds(readFileSync(NAV_TSX, 'utf8')), []);
  const real = readFileSync(NAV_TSX, 'utf8');
  // The attribute as the JSX carries it, not as the header quotes it: `replace`
  // takes the first match, and the prose comes first.
  const ENTRY_ID_LINE = /\s+id=\{indexEntryId\(project\.id\)\}(?=\r?\n)/;
  for (const [name, mutate] of [
    ['the id dropped', (s: string) => s.replace(ENTRY_ID_LINE, '')],
    ['the Client’s id instead', (s: string) => s.replace(ENTRY_ID_LINE, ' id={indexEntryId(client.id)}')],
    ['a composed id', (s: string) => s.replace(ENTRY_ID_LINE, ' id={`entry-${project.id}`}')],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditEntryIds(mutated), [], `"${name}" must be rejected`);
  }
});

function auditMount(source: string): string[] {
  const code = blank(source);
  const failures: string[] = [];
  if (!/import\s*\{\s*FocusPanel\s*\}\s*from\s*'\.\/shell\/focus-panel\.tsx'/.test(code)) failures.push('FocusPanel is not imported from the shell');
  const mounts = code.match(/<FocusPanel\b[^>]*>/g) ?? [];
  if (mounts.length !== 1) failures.push(`FocusPanel is mounted ${mounts.length} times`);
  if (!/<FocusPanel\s+artifact=\{\s*artifact\s*\}\s*\/>/.test(code)) failures.push('FocusPanel is not handed the artifact');
  const scene = code.indexOf('<SceneHost');
  const panel = code.indexOf('<FocusPanel');
  if (scene === -1 || panel === -1 || panel < scene) failures.push('the panel does not follow the scene in document order');
  return failures;
}

test('App.tsx mounts the panel after the scene host', () => {
  const real = readFileSync(APP_TSX, 'utf8');
  assert.deepEqual(auditMount(real), []);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['the panel not mounted', (s) => s.replace(/^\s*<FocusPanel artifact=\{artifact\} \/>\r?\n/m, '')],
    ['the panel before the scene', (s) => s.replace('<SceneHost artifact={artifact} />', '<FocusPanel artifact={artifact} />\n      <SceneHost artifact={artifact} />').replace(/(<SceneHost artifact=\{artifact\} \/>\s*)<FocusPanel artifact=\{artifact\} \/>/, '$1')],
    ['the scene removed', (s) => s.replace(/^\s*<SceneHost artifact=\{artifact\} \/>\r?\n/m, '')],
    ['mounted twice', (s) => s.replace('<FocusPanel artifact={artifact} />', '<FocusPanel artifact={artifact} />\n      <FocusPanel artifact={artifact} />')],
    ['no artifact', (s) => s.replace('<FocusPanel artifact={artifact} />', '<FocusPanel artifact={{ clients: [] }} />')],
    ['imported from elsewhere', (s) => s.replace("from './shell/focus-panel.tsx'", "from './panel.tsx'")],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditMount(mutated), [], `"${name}" must be rejected`);
  }
});
