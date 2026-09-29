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
import {
  FIELD_LABELS,
  FOCUS_PANEL_ID,
  FOCUS_PANEL_TITLE_ID,
  PANEL_FRACTION,
  PANEL_MAX_PX,
  RELEASE_LABEL,
  buildPanel,
  focusMove,
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
  assert.equal(focusMove(null, 'project:a'), 'panel');
  assert.equal(focusMove('project:a', 'project:b'), 'panel', 'focus stays in the panel as its content swaps');
  assert.deepEqual(focusMove('project:a', null), { entry: 'project:a' }, 'the entry that opened it');
  assert.equal(focusMove('project:a', 'project:a'), null);
  assert.equal(focusMove(null, null), null);
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
 * header describes, and the three things it is allowed to hold — one selector
 * subscription, a ref for the last shown Project, an effect applying
 * `focusMove` — each pinned positively.
 */
function auditPanel(source: string): string[] {
  const code = blank(source);
  const failures: string[] = [];
  if (!/const\s+focusedProjectId\s*=\s*useStore\(\s*navigationStore\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*\1\.focusedProjectId\s*\)/.test(code)) {
    failures.push('does not subscribe to focusedProjectId with a selector');
  }
  if ((code.match(/\buseStore\s*\(/g) ?? []).length !== 1) failures.push('subscribes other than once');
  if (/\buseState\b|\buseReducer\b|\buseMemo\b|\buseLayoutEffect\b|\bsubscribe\s*\(/.test(code)) {
    failures.push('keeps state of its own — the store is the one authority');
  }
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
  if (/\bscrim\b|\bbackdrop\b|\boverlay\b|aria-modal|role=["']dialog|<dialog\b|\binert\b|showModal/i.test(code)) {
    failures.push('a scrim, backdrop, overlay or modal — the scene is never occluded');
  }
  const container = /<aside\b([^>]*)>/.exec(code);
  if (container === null) {
    failures.push('no <aside> container');
  } else {
    const attributes = container[1] ?? '';
    if (!/\bid=\{\s*FOCUS_PANEL_ID\s*\}/.test(attributes)) failures.push('the container is not FOCUS_PANEL_ID — the wheel cannot find it');
    if (!/\btabIndex=\{\s*-1\s*\}/.test(attributes)) failures.push('the container is not tabindex="-1" — focus cannot land on it');
    if (!/\baria-labelledby=\{\s*FOCUS_PANEL_TITLE_ID\s*\}/.test(attributes)) failures.push('the container is not labelled by its title');
    if (!/\bref=\{\s*container\s*\}/.test(attributes)) failures.push('the container is not the element focus moves to');
    if (!/\bstyle=\{\s*panelStyle\(\s*focusedProjectId\s*!==\s*null\s*&&\s*panel\s*!==\s*null\s*\)\s*\}/.test(attributes)) {
      failures.push('the style is not panelStyle(open), open exactly while a known Project is focused');
    }
  }
  if (!/<h2\b[^>]*\bid=\{\s*FOCUS_PANEL_TITLE_ID\s*\}[^>]*>\s*\{\s*block\.text\s*\}\s*<\/h2>/.test(code)) {
    failures.push('the title is not the <h2> carrying FOCUS_PANEL_TITLE_ID');
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
  const effect = /useEffect\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[\s*focusedProjectId\s*\]\s*\)/.exec(code);
  if (effect === null) {
    failures.push('no effect keyed on focusedProjectId');
  } else {
    const body = effect[1] ?? '';
    if (!/const\s+move\s*=\s*focusMove\(\s*previous\.current\s*,\s*focusedProjectId\s*\)/.test(body)) {
      failures.push('the effect does not ask focusMove(previous, next)');
    }
    if (!/previous\.current\s*=\s*focusedProjectId/.test(body)) failures.push('the effect does not remember the previous ID');
    if (!/if\s*\(\s*move\s*===\s*'panel'\s*\)\s*\{[\s\S]*container\.current\?\.focus\(/.test(body)) {
      failures.push('entry does not move DOM focus to the panel container');
    }
    if (!/if\s*\(\s*move\s*===\s*'panel'\s*\)\s*\{\s*container\.current\?\.scrollTo\(\s*\{\s*top\s*:\s*0\s*\}\s*\)\s*;/.test(body)) {
      failures.push('entry does not reset the panel to its top — B would open at A’s reading position');
    }
    if (!/document\.getElementById\(\s*indexEntryId\(\s*move\.entry\s*\)\s*\)\?\.focus\(\s*\)/.test(body)) {
      failures.push('release does not return DOM focus to the entry that opened the panel');
    }
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
    ['unlabelled', (s) => s.replace('aria-labelledby={FOCUS_PANEL_TITLE_ID}', '')],
    ['the wrong id', (s) => s.replace('id={FOCUS_PANEL_ID}', 'id="panel"')],
    ['the title unmarked', (s) => s.replace('<h2 key={block.kind} id={FOCUS_PANEL_TITLE_ID}>', '<h2 key={block.kind}>')],
    ['always open', (s) => s.replace('panelStyle(focusedProjectId !== null && panel !== null)', 'panelStyle(true)')],
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
  const projectButton = /<button\b([^>]*\bonClick=\{\s*\(\)\s*=>\s*focusProject\(\s*project\.id\s*\)\s*\}[^>]*)>/.exec(code);
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

test('App.tsx mounts the panel after the scene host', () => {
  const code = blank(readFileSync(APP_TSX, 'utf8'));
  assert.match(code, /import\s*\{\s*FocusPanel\s*\}\s*from\s*'\.\/shell\/focus-panel\.tsx'/);
  assert.match(code, /<FocusPanel\s+artifact=\{\s*artifact\s*\}\s*\/>/);
  assert.ok(code.indexOf('<SceneHost') < code.indexOf('<FocusPanel'), 'the panel follows the scene in document order');
});
