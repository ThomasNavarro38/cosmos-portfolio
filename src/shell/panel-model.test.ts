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
// Comments blanked in place by the shared stripper, so a scan reads code and a
// line keeps its number.
import { stripComments } from '../../scripts/source-scan.ts';
import { FOCUS_SECONDS, advanceSlide, easeFocus, flipSlide, focusEasingCss, reversingFactor, settledSlide } from './focus-motion.ts';
import { motionPace } from './motion-preference.ts';
import {
  FIELD_LABELS,
  FOCUS_PANEL_ID,
  FOCUS_PANEL_TITLE_ID,
  PANEL_FRACTION,
  PANEL_MAX_PX,
  PANEL_PADDING,
  EDITORIAL_RULE,
  LIFT_CLOSE,
  LIFT_OPEN,
  PARAGRAPH_BREAK,
  RELEASE_LABEL,
  buildPanel,
  kickerText,
  crossFade,
  crossFadeLayerStyle,
  crossFadeTiming,
  flightKey,
  focusMove,
  leavingAfter,
  indexEntryId,
  panelFraction,
  panelSlide,
  panelStyle,
  panelWidth,
  panelWidthCss,
  type PanelArtifact,
  type PanelArtifactProject,
} from './panel-model.ts';
import { stripCssComments } from '../../scripts/colour-literals.ts';

const MODEL_TS = fileURLToPath(new URL('./panel-model.ts', import.meta.url));
const PANEL_TSX = fileURLToPath(new URL('./focus-panel.tsx', import.meta.url));
const NAV_TSX = fileURLToPath(new URL('./index-nav.tsx', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));
const SCHEMA_TS = fileURLToPath(new URL('../data/schema.ts', import.meta.url));

// --- Fixtures ---------------------------------------------------------------

function project(id: string, isDeep: boolean, notable: string | null | undefined, company: string | null = null): PanelArtifactProject {
  return {
    id,
    isDeep,
    content: {
      project: `Title of ${id}`,
      company,
      role: 'Lead',
      team_size: 6,
      built: `What ${id} built.`,
      skills: ['Java', 'Kafka', 'Java', 'Spring Boot'],
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
          project('project:a/deep', true, 'First paragraph.\n\nSecond paragraph. [[A lifted sentence,\nwrapped.]] After.\n\n\n  Third.  ', 'Capgemini'),
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

test('the panel carries kicker, title, reading position, fields, Skills and release, in that order', () => {
  for (const id of ['project:a/deep', 'project:a/shallow', 'project:b/shallow-with-prose']) {
    assert.deepEqual(kinds(id), ['kicker', 'title', 'reading', 'fields', 'skills', 'release'], id);
  }
});

test('the kicker is the Client’s name, then the Company after a mid-dot, and the title the Project’s', () => {
  assert.deepEqual(block('project:a/deep', 'kicker'), { kind: 'kicker', text: 'Alpha · Capgemini' });
  assert.deepEqual(block('project:a/shallow', 'kicker'), { kind: 'kicker', text: 'Alpha' }, 'no Company: the Client alone, no separator');
  assert.deepEqual(block('project:b/shallow-with-prose', 'kicker'), { kind: 'kicker', text: 'Bravo' });
  assert.deepEqual(block('project:a/deep', 'title'), { kind: 'title', text: 'Title of project:a/deep' });
});

test('kickerText names the Client verbatim and the Company only when there is one', () => {
  assert.equal(kickerText('SNCF', 'Capgemini'), 'SNCF · Capgemini');
  assert.equal(kickerText('SNCF', null), 'SNCF');
  assert.equal(kickerText('Decathlon', 'Sfeir'), 'Decathlon · Sfeir');
});

test('the committed artifact’s kickers carry each real Client and Company verbatim', () => {
  const committed = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as PanelArtifact;
  let seen = 0;
  for (const client of committed.clients) {
    for (const entry of client.projects) {
      const { company } = entry.content;
      assert.ok(company === null || (company.trim() === company && company !== ''), `${entry.id}: a Company is null or a trimmed, non-blank name`);
      const text = company === null ? client.name : `${client.name} · ${company}`;
      assert.deepEqual(block(entry.id, 'kicker', committed), { kind: 'kicker', text }, entry.id);
      seen += 1;
    }
  }
  assert.ok(seen > 0, 'the artifact carries Projects');
});

const run = (text: string, lifted = false) => ({ text, lifted });

test('a Deep Project’s reading position holds its Notable, one paragraph per blank-line break, its marked sentence lifted in place', () => {
  assert.deepEqual(block('project:a/deep', 'reading'), {
    kind: 'reading',
    reading: {
      kind: 'notable',
      paragraphs: [
        [run('First paragraph.')],
        [run('Second paragraph. '), run('A lifted sentence,\nwrapped.', true), run(' After.')],
        [run('Third.')],
      ],
    },
  });
});

test('a lift at a paragraph’s start or end is one run beside the rest, never an empty run', () => {
  const reading = (notable: string) => {
    const source: PanelArtifact = { clients: [{ id: 'c', name: 'C', projects: [project('p', true, notable)] }] };
    return block('p', 'reading', source);
  };
  assert.deepEqual(reading('[[First.]] Then.'), { kind: 'reading', reading: { kind: 'notable', paragraphs: [[run('First.', true), run(' Then.')]] } });
  assert.deepEqual(reading('Then. [[Last.]]'), { kind: 'reading', reading: { kind: 'notable', paragraphs: [[run('Then. '), run('Last.', true)]] } });
  // Hand-edited past the gate, a Notable with no marks is still prose, lifted nowhere.
  assert.deepEqual(reading('Unmarked.'), { kind: 'reading', reading: { kind: 'notable', paragraphs: [[run('Unmarked.')]] } });
  // …and so is a stray mark: a lone open, or a close before the open, lifts nothing.
  for (const stray of ['Before. [[Never closed.', 'Before.]] The middle. [[After.']) {
    assert.deepEqual(reading(stray), { kind: 'reading', reading: { kind: 'notable', paragraphs: [[run(stray)]] } }, stray);
  }
});

test('a Shallow Project’s reading position holds the editorial rule line — no error, placeholder or skeleton', () => {
  const rule = { kind: 'reading', reading: { kind: 'rule', text: EDITORIAL_RULE } };
  assert.equal(EDITORIAL_RULE, 'Entries carry a written argument only where there was an argument to have.');
  assert.deepEqual(block('project:a/shallow', 'reading'), rule);
  // The branch is on isDeep, never on notable: prose on a Shallow Project stays hidden…
  assert.deepEqual(block('project:b/shallow-with-prose', 'reading'), rule);
  // …and a Deep Project with no prose is not an error either.
  for (const notable of [null, undefined, '', '  \n\n  ']) {
    const source: PanelArtifact = { clients: [{ id: 'c', name: 'C', projects: [project('p', true, notable)] }] };
    assert.deepEqual(block('p', 'reading', source), { kind: 'reading', reading: { kind: 'notable', paragraphs: [] } }, JSON.stringify(notable));
  }
});

test('promotion changes the reading block and nothing else: the rule line gives way to the Notable in the same slot', () => {
  const shallow = project('p', false, null);
  const deep: PanelArtifactProject = { ...shallow, isDeep: true, content: { ...shallow.content, notable: 'Before. [[The constraint.]] After.' } };
  const panelOf = (entry: PanelArtifactProject) => buildPanel({ clients: [{ id: 'c', name: 'C', projects: [entry] }] }, 'p')?.blocks ?? [];
  const before = panelOf(shallow);
  const after = panelOf(deep);
  assert.deepEqual(before.map((b) => b.kind), after.map((b) => b.kind));
  const index = before.findIndex((b) => b.kind === 'reading');
  assert.deepEqual(before.filter((_, i) => i !== index), after.filter((_, i) => i !== index));
  assert.deepEqual(before[index], { kind: 'reading', reading: { kind: 'rule', text: EDITORIAL_RULE } });
  assert.equal(after[index]?.kind === 'reading' && after[index].reading.kind, 'notable');
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
  assert.doesNotMatch(JSON.stringify(fields), /skill|Java/i, 'no Skills row in the field table');
});

test('a Project with no Skills carries no Skills block — no empty list', () => {
  const bare: PanelArtifactProject = { ...project('p', false, null), content: { ...project('p', false, null).content, skills: [] } };
  const source: PanelArtifact = { clients: [{ id: 'c', name: 'C', projects: [bare] }] };
  assert.deepEqual(kinds('p', source), ['kicker', 'title', 'reading', 'fields', 'release']);
});

test('the Skills block lists the Project’s Skills in authored order, each once (3.5)', () => {
  assert.deepEqual(block('project:a/deep', 'skills'), { kind: 'skills', items: ['Java', 'Kafka', 'Spring Boot'] });
  const committed = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as PanelArtifact;
  for (const client of committed.clients) {
    for (const entry of client.projects) {
      const skills = block(entry.id, 'skills', committed);
      assert.ok(skills.kind === 'skills');
      assert.deepEqual(skills.items, [...new Set(entry.content.skills)], `${entry.id}: every Skill, in the DOM`);
    }
  }
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

/** Every Project of the committed artifact, with its panel. */
function committedPanels() {
  const committed = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as PanelArtifact;
  return committed.clients.flatMap((client) =>
    client.projects.map((entry) => {
      const panel = buildPanel(committed, entry.id);
      assert.ok(panel !== null, entry.id);
      const reading = panel.blocks.find((b) => b.kind === 'reading');
      assert.ok(reading?.kind === 'reading', entry.id);
      return { client, entry, panel, reading: reading.reading };
    }),
  );
}

test('the panel splits on the very marks the schema gates', () => {
  // `src/shell/` may not import `src/data/`, so the schema's constants are read from its source.
  const schema = readFileSync(SCHEMA_TS, 'utf8');
  const literal = (name: string) => new RegExp(`export const ${name} = '([^']*)';`).exec(schema)?.[1];
  assert.equal(literal('LIFT_OPEN'), LIFT_OPEN);
  assert.equal(literal('LIFT_CLOSE'), LIFT_CLOSE);
  // …and on the paragraph break it reads the marks within.
  assert.equal(/export const PARAGRAPH_BREAK = (\/.*\/);/.exec(schema)?.[1], String(PARAGRAPH_BREAK));
  assert.ok(schema.includes('.split(PARAGRAPH_BREAK)'), 'the schema finds the marked paragraph by the same break');
});

test('every committed Deep Project shows its authored prose verbatim, with exactly one sentence lifted', () => {
  const deep = committedPanels().filter(({ entry }) => entry.isDeep);
  assert.ok(deep.length > 0, 'the artifact carries a Deep Project, or this case is vacuous');
  for (const { entry, reading } of deep) {
    assert.ok(reading.kind === 'notable', entry.id);
    // Re-marked and re-joined, the runs are the authored paragraphs: nothing dropped, nothing added.
    const rejoined = reading.paragraphs.map((runs) => runs.map((r) => (r.lifted ? `${LIFT_OPEN}${r.text}${LIFT_CLOSE}` : r.text)).join('')).join('\n\n');
    const authored = (entry.content.notable ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p !== '').join('\n\n');
    assert.equal(rejoined, authored, entry.id);
    assert.equal(reading.paragraphs.flat().filter((r) => r.lifted).length, 1, `${entry.id}: one lifted sentence`);
  }
});

test('SNCF Client referential lifts its authored second sentence, verbatim', () => {
  const found = committedPanels().find(({ client, entry }) => client.name === 'SNCF' && entry.content.project === 'Client referential');
  assert.ok(found !== undefined && found.reading.kind === 'notable');
  const lifted = found.reading.paragraphs.flat().filter((r) => r.lifted).map((r) => r.text);
  assert.deepEqual(lifted, [
    "Replacing it meant rebuilding a mature product's behaviour with no specification to work from — documentation was absent or years stale, so the incumbent's real rules had to be recovered from the system itself.",
  ]);
});

test('every committed Shallow Project carries the same rule line, in a panel ordered like the Deep one', () => {
  const panels = committedPanels();
  const shallow = panels.filter(({ entry }) => !entry.isDeep);
  const deep = panels.find(({ entry }) => entry.isDeep);
  assert.ok(shallow.length > 1 && deep !== undefined, 'two Shallow Projects and a Deep one, or this case is vacuous');
  const deepKinds = deep.panel.blocks.map((b) => b.kind);
  assert.ok(deepKinds.includes('skills'), 'the Deep panel carries Skills, or the full-order case is vacuous');
  let withSkills = 0;
  for (const { entry, panel, reading } of shallow) {
    assert.deepEqual(reading, shallow[0]?.reading, entry.id);
    assert.deepEqual(reading, { kind: 'rule', text: EDITORIAL_RULE }, entry.id);
    const kinds = panel.blocks.map((b) => b.kind);
    // Skills is the one conditional block (3.5): absent, every other kind keeps the Deep order; present, so does it.
    if (kinds.includes('skills')) {
      withSkills += 1;
      assert.deepEqual(kinds, deepKinds, entry.id);
    } else {
      assert.deepEqual(kinds, deepKinds.filter((k) => k !== 'skills'), entry.id);
    }
  }
  assert.ok(withSkills > 0, 'a Shallow Project carries Skills, or the full-order case is vacuous');
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

// --- The close follows the actual slide (3.15, F-2) ------------------------------

test('closing on a reversed slide hides the panel at the reversed slide’s end; the transform keeps its full duration', () => {
  for (const pace of [1, motionPace(true)]) {
    const seconds = FOCUS_SECONDS * pace;
    const curve = `${seconds}s ${focusEasingCss()}`;
    for (const factor of [0, 0.25, 0.5, 1]) {
      const closed = panelStyle(false, pace, factor);
      assert.equal(closed.transition, `transform ${curve}, visibility 0s linear ${FOCUS_SECONDS * factor * pace}s`, `factor ${factor}, pace ${pace}`);
      assert.equal(closed.visibility, 'hidden');
      assert.equal(closed.transform, 'translateX(100%)');
      // Opening is visible from its first frame, whatever the factor.
      assert.equal(panelStyle(true, pace, factor).transition, `transform ${curve}, visibility 0s linear 0s`);
    }
  }
  assert.deepEqual(panelStyle(false, 1, 1), panelStyle(false), 'a settled open closes as it always did');
});

test('a factor that is not in [0, 1] is clamped, and a non-finite one reads as 1', () => {
  assert.deepEqual(panelStyle(false, 1, 2), panelStyle(false, 1, 1));
  assert.deepEqual(panelStyle(false, 1, -1), panelStyle(false, 1, 0));
  for (const factor of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.deepEqual(panelStyle(false, 1, factor), panelStyle(false, 1, 1), `factor ${factor}`);
  }
});

test('paired with flipSlide: a release mid opening slide hides the panel when CSS’s reversed slide ends', () => {
  for (const pace of [1, motionPace(true)]) {
    const opening = advanceSlide(flipSlide(settledSlide(false), true), 0.3 * FOCUS_SECONDS);
    const closing = flipSlide(opening, false);
    assert.ok(closing.factor > 0 && closing.factor < 1);
    const delay = /visibility 0s linear ([\d.e-]+)s$/.exec(panelStyle(closing.open, pace, closing.factor).transition)?.[1];
    assert.equal(Number(delay), closing.seconds * pace, 'the reversed slide’s length, at the pace the slide runs');
  }
});

test('panelSlide mirrors the slide in wall time: unchanged while open is, flipped and advanced when it changes', () => {
  const first = panelSlide(null, false, 1000, 1);
  assert.deepEqual(first, { ...settledSlide(false), at: 1000, pace: 1 }, 'a first render is at rest');
  assert.equal(panelSlide(first, false, 5000, 1), first, 'the same object while open is unchanged');
  const opened = panelSlide(first, true, 2000, 1);
  assert.deepEqual(opened, { ...flipSlide(settledSlide(false), true), at: 2000, pace: 1 }, 'a settled slide flips at full length');
  assert.equal(panelSlide(opened, true, 2100, 1), opened);
  // Released 0.3 × FOCUS_SECONDS into the opening slide.
  const released = panelSlide(opened, false, 2000 + 0.3 * FOCUS_SECONDS * 1000, 1);
  assert.equal(released.open, false);
  assert.equal(released.at, 2000 + 0.3 * FOCUS_SECONDS * 1000);
  assert.ok(Math.abs(released.factor - reversingFactor(easeFocus(0.3), 1)) < 1e-9);
  // Released after the opening slide settled: the whole duration back.
  const late = panelSlide(opened, false, 2000 + FOCUS_SECONDS * 1000 + 50, 1);
  assert.equal(late.factor, 1);
  assert.equal(late.seconds, FOCUS_SECONDS);
});

test('panelSlide reads wall time at the pace the slide runs, and an unusable pace as 1', () => {
  const pace = motionPace(true);
  const opened = panelSlide(panelSlide(null, false, 0, pace), true, 1000, pace);
  // The same share of a slide that runs FOCUS_SECONDS × pace takes pace times the wall time.
  const reduced = panelSlide(opened, false, 1000 + 0.3 * FOCUS_SECONDS * pace * 1000, pace);
  const full = panelSlide(panelSlide(panelSlide(null, false, 0, 1), true, 1000, 1), false, 1000 + 0.3 * FOCUS_SECONDS * 1000, 1);
  assert.ok(Math.abs(reduced.factor - full.factor) < 1e-9);
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const start = panelSlide(panelSlide(null, false, 0, bad), true, 1000, bad);
    const end = panelSlide(start, false, 1000 + 0.3 * FOCUS_SECONDS * 1000, bad);
    assert.ok(Math.abs(end.factor - full.factor) < 1e-9, `pace ${bad}`);
  }
  // A clock read earlier than the slide started does not run it backwards.
  assert.equal(panelSlide(opened, false, 500, pace).factor, 0);
  // The usable pace is what the slide records, at the flip.
  assert.equal(opened.pace, pace);
  assert.equal(panelSlide(null, true, 0, Number.NaN).pace, 1);
});

test('a pace that changes mid-slide: the time already run is read at the pace that slide started with', () => {
  const pace = motionPace(true);
  const wall = 0.3 * FOCUS_SECONDS * 1000;
  // Opened at full motion, released after the preference turned reduced.
  const openedFull = panelSlide(panelSlide(null, false, 0, 1), true, 1000, 1);
  const releasedReduced = panelSlide(openedFull, false, 1000 + wall, pace);
  assert.ok(Math.abs(releasedReduced.factor - reversingFactor(easeFocus(0.3), 1)) < 1e-9, 'the open ran at pace 1');
  assert.equal(releasedReduced.pace, pace, 'and the reversal runs at the new pace');
  // Opened reduced, released at full motion.
  const openedReduced = panelSlide(panelSlide(null, false, 0, pace), true, 1000, pace);
  const releasedFull = panelSlide(openedReduced, false, 1000 + wall * pace, 1);
  assert.ok(Math.abs(releasedFull.factor - reversingFactor(easeFocus(0.3), 1)) < 1e-9, 'the open ran at the reduced pace');
  assert.equal(releasedFull.pace, 1);
});

test('the panel paints its own column and nothing else — no scrim, no backdrop, no overlay', () => {
  const allowed = [
    'position', 'top', 'right', 'bottom', 'zIndex', 'width', 'boxSizing', 'overflowY', 'overscrollBehavior',
    'padding', 'background', 'color', 'borderLeft', 'outline', 'transform', 'visibility', 'transition',
  ];
  for (const style of [panelStyle(true), panelStyle(false)]) {
    assert.deepEqual(Object.keys(style).sort(), [...allowed].sort());
    assert.notEqual(style.width, '100%');
    assert.notEqual(style.width, '100vw');
    assert.doesNotMatch(JSON.stringify(style), /\binset\b|\bleft\b|backdrop|filter|box-shadow/i);
  }
});

test('the panel is surface-raised with one surface-edge left border, from tokens, and nothing else bounds it', () => {
  for (const style of [panelStyle(true), panelStyle(false)]) {
    assert.equal(style.background, 'var(--color-surface-raised-dark)');
    assert.equal(style.color, 'var(--color-ink-prose-dark)');
    assert.equal(style.borderLeft, '1px solid var(--color-surface-edge-dark)');
    assert.equal(style.outline, 'none', 'a focus ring on the container would be a second boundary');
    assert.equal(style.padding, 'var(--panel-padding)', 'the stylesheet steps it at 1200px');
    assert.doesNotMatch(JSON.stringify(style), /Canvas|GrayText|radius/, 'no system colour, no radius');
  }
  assert.equal(PANEL_PADDING, 'var(--panel-padding)');
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
  const open: Record<string, unknown> = { ...panelStyle(true, pace) };
  const closed: Record<string, unknown> = { ...panelStyle(false, pace) };
  assert.deepEqual(Object.keys(open).sort(), Object.keys(closed).sort());
  assert.deepEqual(Object.keys(open).filter((key) => open[key] !== closed[key]).sort(), ['transform', 'transition', 'visibility']);
  assert.equal(open.visibility, 'visible');
  assert.equal(closed.visibility, 'hidden');
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

function auditModel(source: string): string[] {
  const code = stripComments(source);
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
  if (/label:\s*['"]Skills?['"]|FIELD_LABELS\s*=\s*\{[^}]*skill/i.test(code)) failures.push('a Skills row — the Skills are their own list, never a field');
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
    ['a branch on notable', (s) => s.replace("reading: project.isDeep ? { kind: 'notable'", "reading: content.notable ? { kind: 'notable'")],
    ['a Skills row', (s) => s.replace("{ label: FIELD_LABELS.built, value: content.built },", "{ label: FIELD_LABELS.built, value: content.built },\n              { label: 'Skills', value: '' },")],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditModel(mutated), [], `"${name}" must be rejected`);
  }
});

// --- The stylesheet ---------------------------------------------------------------------

/** One declaration of `focus-panel.css`, with the selector and `@media` condition it sits under. */
interface CssDeclaration {
  readonly media: string | null;
  readonly selector: string;
  readonly property: string;
  readonly value: string;
}

/**
 * The stylesheet as a flat list of declarations. Enough CSS for this file: rules
 * and one level of `@media`, comments blanked. Whitespace inside a selector or a
 * value is collapsed so a reformat is not a failure.
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
          // A fragment with no colon is a typo the browser drops; keep it so the audit fails on it.
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

/** The type roles each block is set in (DESIGN.md §3), and the five properties a role sets. */
const TYPE_ROLES: readonly (readonly [string, string])[] = [
  ['.panel-kicker', 'panel-kicker'],
  ['.panel-title', 'panel-title'],
  ['.panel-prose', 'notable-prose'],
  ['.panel-rule', 'editorial-rule'],
  ['.panel-fields th', 'field-label'],
  ['.panel-fields td', 'field-value'],
  ['.panel-skills', 'field-value'],
  ['.panel-release', 'chrome'],
];
const TYPE_PROPERTIES = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing'] as const;

/** The two `@media` conditions the stylesheet may hold: the 1200px padding step and forced colours. */
const BREAKPOINT = '(max-width: 1199.98px)';
const FORCED_COLORS = '(forced-colors: active)';

/**
 * Every other declaration of the treatment, as `[media, selector, property, value]`.
 * With `TYPE_ROLES` this is the whole stylesheet: a declaration in neither fails,
 * so a dropped `display: flex` or a stray rule is a failure, not a silent pass.
 */
const EXPECTED: readonly (readonly [string | null, string, string, string])[] = [
  // Padding: 56/56/60, the sides stepping down below 1200px (DESIGN.md §4, D-A3).
  [null, `#${FOCUS_PANEL_ID}`, '--panel-padding', 'var(--space-panel-pad-top) var(--space-panel-pad-x) var(--space-panel-pad-bottom)'],
  [null, `#${FOCUS_PANEL_ID}`, 'color-scheme', 'dark'],
  // A long word, URL or Skill breaks rather than overflow a narrow column; no width changes.
  [null, `#${FOCUS_PANEL_ID}`, 'overflow-wrap', 'anywhere'],
  [BREAKPOINT, `#${FOCUS_PANEL_ID}`, '--panel-padding', 'var(--space-panel-pad-top) clamp(16px, 5vw, var(--space-xl)) var(--space-panel-pad-bottom)'],
  // Rhythm (DESIGN.md §4): kicker→title 22, title→prose 40, title→rule 34, ¶→¶ 20, reading→table 52.
  // The title carries no bottom margin, so each reading child's own top margin is the gap.
  [null, '.panel-kicker', 'margin', '0 0 22px'],
  [null, '.panel-title', 'margin', '0'],
  [null, '.panel-reading', 'margin', '0'],
  [null, '.panel-prose', 'margin', '0 0 var(--space-md)'],
  [null, '.panel-prose:first-child', 'margin-top', 'var(--space-xl)'],
  [null, '.panel-prose:last-child', 'margin-bottom', '0'],
  [null, '.panel-rule', 'margin', '34px 0 0'],
  [null, '.panel-fields', 'margin', 'var(--space-xxl) 0 0'],
  [null, '.panel-fields', 'width', '100%'],
  [null, '.panel-fields', 'border-collapse', 'collapse'],
  [null, '.panel-fields', 'border-spacing', '0'],
  // Field rows: 12px each side of a 1px surface-edge rule; a 74px label column and a 28px gap.
  [null, '.panel-fields th, .panel-fields td', 'padding', 'var(--space-sm) 0'],
  [null, '.panel-fields th, .panel-fields td', 'border-top', '1px solid var(--color-surface-edge-dark)'],
  [null, '.panel-fields th', 'width', '74px'],
  [null, '.panel-fields th', 'padding-right', 'var(--space-lg)'],
  [null, '.panel-fields th, .panel-fields td', 'text-align', 'left'],
  [null, '.panel-fields th, .panel-fields td', 'vertical-align', 'baseline'],
  // Measures: they do not widen with the panel.
  [null, '.panel-title', 'max-width', 'var(--space-measure-title)'],
  [null, '.panel-prose', 'max-width', 'var(--space-measure-prose)'],
  [null, '.panel-rule', 'max-width', 'var(--space-measure-rule)'],
  // Ink.
  [null, '.panel-kicker', 'color', 'var(--color-ink-label-dark)'],
  [null, '.panel-title', 'color', 'var(--color-ink-lift-dark)'],
  [null, '.panel-prose', 'color', 'var(--color-ink-prose-dark)'],
  // The constraint sentence: brighter ink, and nothing else (DESIGN.md §7.7).
  [null, '.panel-lift', 'color', 'var(--color-ink-lift-dark)'],
  // The rule line is raised to ink-label, never ink-quiet (DESIGN.md §7.8).
  [null, '.panel-rule', 'color', 'var(--color-ink-label-dark)'],
  [null, '.panel-fields th', 'color', 'var(--color-ink-label-dark)'],
  [null, '.panel-fields td', 'color', 'var(--color-ink-prose-dark)'],
  [null, '.panel-skills', 'color', 'var(--color-ink-label-dark)'],
  [null, '.panel-release', 'color', 'var(--color-ink-label-dark)'],
  // Plate designations are uppercase (DESIGN.md §3 Rules).
  [null, '.panel-kicker', 'text-transform', 'uppercase'],
  [null, '.panel-fields th', 'text-transform', 'uppercase'],
  // The Skills: 28px below the table, an inline run with no bullets.
  [null, '.panel-skills', 'margin', 'var(--space-lg) 0 0'],
  [null, '.panel-skills', 'padding', '0'],
  [null, '.panel-skills', 'list-style', 'none'],
  [null, '.panel-skills', 'display', 'flex'],
  [null, '.panel-skills', 'flex-wrap', 'wrap'],
  [null, '.panel-skills', 'column-gap', 'var(--space-sm)'],
  // Release (DESIGN.md §7.6a): 40px below, a 12px stroke-rest hairline 8px before the word…
  [null, '.panel-release', 'margin', 'var(--space-xl) 0 0'],
  [null, '.panel-release', 'display', 'flex'],
  [null, '.panel-release', 'align-items', 'center'],
  [null, '.panel-release', 'gap', 'var(--space-xs)'],
  [null, '.panel-release', 'padding', '0'],
  [null, '.panel-release', 'background', 'none'],
  [null, '.panel-release', 'border', '0'],
  [null, '.panel-release', 'cursor', 'pointer'],
  [null, '.panel-release::before', 'content', "''"],
  [null, '.panel-release::before', 'flex', 'none'],
  [null, '.panel-release::before', 'width', 'var(--space-sm)'],
  [null, '.panel-release::before', 'border-top', 'var(--stroke-hairline) solid var(--color-stroke-rest-dark)'],
  // …raised to ink-prose and a 20px hairline on hover and keyboard focus — no box.
  [null, '.panel-release:hover, .panel-release:focus-visible', 'color', 'var(--color-ink-prose-dark)'],
  [null, '.panel-release:hover, .panel-release:focus-visible', 'outline', 'none'],
  [null, '.panel-release:hover::before, .panel-release:focus-visible::before', 'width', 'var(--space-md)'],
  // Forced colours flatten the ink step, so keyboard focus there is the system outline.
  [FORCED_COLORS, '.panel-release:focus-visible', 'outline', '1px solid CanvasText'],
  // …and the lift, whose ink step is flattened there, takes the system accent — ink alone (ruled 2026-10-10).
  [FORCED_COLORS, '.panel-lift', 'color', 'Highlight'],
];

/**
 * Literal lengths the stylesheet may write, in any unit: rhythm values DESIGN.md
 * states without a token, the 1px rule, the padding step's phone floor and slope,
 * the breakpoint, and the field table's full width.
 */
const LITERAL_LENGTHS = new Set(['22px', '34px', '74px', '1px', '16px', '5vw', '1199.98px', '100%']);

/** The only selectors that may draw a `border-top`: the field rows' rule and the release hairline. */
const TOP_RULES = new Set(['.panel-fields th, .panel-fields td', '.panel-release::before']);

function auditStylesheet(css: string, tokensCss: string): string[] {
  const declarations = declarationsOf(css);
  const failures: string[] = [];
  const find = (media: string | null, selector: string, property: string) =>
    declarations.filter((d) => d.media === media && d.selector === selector && d.property === property).map((d) => d.value);
  for (const [media, selector, property, value] of EXPECTED) {
    const found = find(media, selector, property);
    if (found.length !== 1 || found[0] !== value) failures.push(`${media ?? ''} ${selector} { ${property}: ${value} } — found ${JSON.stringify(found)}`);
  }
  for (const [selector, role] of TYPE_ROLES) {
    for (const property of TYPE_PROPERTIES) {
      const value = `var(--type-${role}-${property})`;
      const found = find(null, selector, property);
      if (found.length !== 1 || found[0] !== value) failures.push(`${selector} is not set in ${role}: ${property} found ${JSON.stringify(found)}`);
    }
  }
  const known = new Set([
    ...EXPECTED.map(([media, selector, property]) => `${media ?? ''}|${selector}|${property}`),
    ...TYPE_ROLES.flatMap(([selector]) => TYPE_PROPERTIES.map((property) => `|${selector}|${property}`)),
  ]);
  for (const { media, selector, property, value } of declarations) {
    if (selector !== '@' && !known.has(`${media ?? ''}|${selector}|${property}`)) {
      failures.push(`${media ?? ''} ${selector} { ${property}: ${value} } is not part of the treatment`);
    }
  }
  const tokens = new Set([...tokensCss.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  for (const { media, selector, property, value } of declarations) {
    if (selector === '@') {
      failures.push(`an unread at-rule ${property} — its declarations would escape this audit`);
      continue;
    }
    for (const [, name] of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (name !== '--panel-padding' && !tokens.has(name)) failures.push(`${selector} reads ${name}, which no token defines`);
    }
    for (const [length] of value.matchAll(/-?\d*\.?\d+(?:px|rem|em|ch|pt|vh|vw|vmin|vmax|%)(?![\w-])/g)) {
      if (!LITERAL_LENGTHS.has(length)) failures.push(`${selector} { ${property} } writes ${length} — read it from a token`);
    }
    if (property === 'font-weight' && !/^var\(--type-[\w-]+-font-weight\)$/.test(value)) failures.push(`${selector} sets a weight of its own — weight is not an emphasis channel`);
    if (/radius|shadow|filter|backdrop/.test(property)) failures.push(`${selector} sets ${property} — no radius, shadow or blur`);
    if (
      /^border-(?:right|bottom|left|inline|block|width|color|style)/.test(property) ||
      (property === 'border' && value !== '0') ||
      (property === 'border-top' && !TOP_RULES.has(selector))
    ) {
      failures.push(`${selector} draws a ${property} — the panel has one boundary, its left border`);
    }
    if (/^outline/.test(property) && value !== 'none' && media !== FORCED_COLORS) failures.push(`${selector} draws an outline — no box (DESIGN.md §7.6a)`);
    if (/ink-quiet|ink-faint/.test(value)) failures.push(`${selector} uses ${value} — below the contrast floor`);
  }
  for (const media of new Set(declarations.map((d) => d.media))) {
    if (media !== null && media !== BREAKPOINT && media !== FORCED_COLORS) failures.push(`an @media ${media} beyond the 1200px step and forced colours`);
  }
  return failures;
}

const ENTRY_TS = fileURLToPath(new URL('./entry.ts', import.meta.url));

/**
 * `src/shell/entry.ts` loads `tokens.css`, once, ahead of `page.css` (4.1). Every
 * colour, size and padding the panel draws is a `var()` of it; without the import
 * each one is invalid at computed-value time and the panel is a transparent column
 * with no padding — while every other test here stays green. The stylesheets `App`
 * brings follow it necessarily: they arrive with the mount, a dynamic import, and
 * a static import is hoisted ahead of any dynamic one wherever it is written.
 */
function auditTokensImport(source: string): string[] {
  const code = stripComments(source);
  const imports = [...code.matchAll(/^import\s+'\.\.\/tokens\/tokens\.css'\s*;/gm)];
  if (imports.length !== 1) return ['src/shell/entry.ts does not import ../tokens/tokens.css exactly once'];
  const at = imports[0]?.index ?? Infinity;
  const page = code.search(/^import\s+'\.\/page\.css'\s*;/m);
  return page === -1 || at > page ? ['the tokens are imported after page.css — it would precede them'] : [];
}

test('the entry loads the design tokens once, ahead of the page', () => {
  const real = readFileSync(ENTRY_TS, 'utf8').replace(/\r\n/g, '\n');
  assert.deepEqual(auditTokensImport(real), []);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['the import dropped', (s) => s.replace("import '../tokens/tokens.css';", '')],
    ['the import commented out', (s) => s.replace("import '../tokens/tokens.css';", "// import '../tokens/tokens.css';")],
    ['the import twice', (s) => s.replace("import '../tokens/tokens.css';", "import '../tokens/tokens.css';\nimport '../tokens/tokens.css';")],
    ['the import after the page', (s) => s.replace("import '../tokens/tokens.css';\n", '').replace("import './page.css';", "import './page.css';\nimport '../tokens/tokens.css';")],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditTokensImport(mutated), [], `"${name}" must be rejected`);
  }
});

const PANEL_CSS = fileURLToPath(new URL('./focus-panel.css', import.meta.url));
const TOKENS_CSS = fileURLToPath(new URL('../tokens/tokens.css', import.meta.url));

test('the stylesheet sets the surface, rhythm, type, ink, measure and release states from tokens', () => {
  assert.deepEqual(auditStylesheet(readFileSync(PANEL_CSS, 'utf8'), readFileSync(TOKENS_CSS, 'utf8')), []);
});

test('the stylesheet audit rejects the real stylesheet with any one departure', () => {
  const real = readFileSync(PANEL_CSS, 'utf8');
  const tokensCss = readFileSync(TOKENS_CSS, 'utf8');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['kicker→title at 24px', (s) => s.replace('margin: 0 0 22px;', 'margin: 0 0 24px;')],
    ['title→prose at 20px', (s) => s.replace('margin-top: var(--space-xl);', 'margin-top: var(--space-md);')],
    ['a title margin back', (s) => s.replace(/(\.panel-title \{\s*)margin: 0;/, '$1margin: 0 0 var(--space-xl);')],
    ['title→rule at 40px', (s) => s.replace('margin: 34px 0 0;', 'margin: var(--space-xl) 0 0;')],
    ['the rule at the prose measure', (s) => s.replace('max-width: var(--space-measure-rule);', 'max-width: var(--space-measure-prose);')],
    ['the rule in quiet ink', (s) => s.replace(/(\.panel-rule \{[^}]*?)color: var\(--color-ink-label-dark\);/, '$1color: var(--color-ink-quiet-dark);')],
    ['the rule in prose type', (s) => s.replace('font-size: var(--type-editorial-rule-font-size);', 'font-size: var(--type-notable-prose-font-size);')],
    ['no lift', (s) => s.replace(/(\.panel-lift \{\s*)color: var\(--color-ink-lift-dark\);/, '$1color: var(--color-ink-prose-dark);')],
    ['a boxed lift', (s) => s.replace('.panel-lift {', '.panel-lift {\n  background: var(--color-surface-edge-dark);')],
    ['a lift on its own line', (s) => s.replace('.panel-lift {', '.panel-lift {\n  display: block;')],
    ['an indented lift', (s) => s.replace('.panel-lift {', '.panel-lift {\n  padding-left: var(--space-md);')],
    ['a bold lift', (s) => s.replace('.panel-lift {', '.panel-lift {\n  font-weight: var(--type-panel-title-font-weight);')],
    ['prose→table at 40px', (s) => s.replace('margin: var(--space-xxl) 0 0;', 'margin: var(--space-xl) 0 0;')],
    ['no 1200px step', (s) => s.replace('(max-width: 1199.98px)', '(max-width: 799.98px)')],
    ['the panel selector renamed', (s) => s.replace(/#focus-panel \{/g, '#panel {')],
    ['no dark color-scheme', (s) => s.replace('color-scheme: dark;', '')],
    ['no forced-colours focus', (s) => s.replace('outline: 1px solid CanvasText;', 'outline: none;')],
    ['no forced-colours lift', (s) => s.replace('color: Highlight;', '')],
    ['a forced-colours lift boxed', (s) => s.replace('color: Highlight;', 'color: Highlight;\n    outline: 1px solid Highlight;')],
    ['an outline on hover', (s) => s.replace(/(:focus-visible \{\s*color: var\(--color-ink-prose-dark\);\s*)outline: none;/, '$1outline: 1px solid var(--color-stroke-focus-dark);')],
    ['an @supports block', (s) => `${s}\n@supports (display: grid) {\n  .panel-title {\n    font-size: 30px;\n  }\n}\n`],
    ['a rem literal', (s) => s.replace('margin: var(--space-lg) 0 0;', 'margin: 1.75rem 0 0;')],
    ['a rule under the title', (s) => s.replace('.panel-title {', '.panel-title {\n  border-top: 1px solid var(--color-surface-edge-dark);')],
    ['a logical border', (s) => s.replace('.panel-kicker {', '.panel-kicker {\n  border-inline-end: 1px solid var(--color-surface-edge-dark);')],
    ['a prose measure that widens', (s) => s.replace('max-width: var(--space-measure-prose);', 'max-width: none;')],
    ['the hover ink unchanged', (s) => s.replace(/color: var\(--color-ink-prose-dark\);(\r?\n\s*)outline/, 'color: var(--color-ink-label-dark);$1outline')],
    ['the hairline not extended', (s) => s.replace('width: var(--space-md);', 'width: var(--space-sm);')],
    ['a radius', (s) => s.replace('.panel-title {', '.panel-title {\n  border-radius: 2px;')],
    ['a weight', (s) => s.replace('.panel-title {', '.panel-title {\n  font-weight: 500;')],
    ['a missing token', (s) => s.replace('var(--color-ink-lift-dark)', 'var(--color-ink-brightest-dark)')],
    ['a right border', (s) => s.replace('.panel-kicker {', '.panel-kicker {\n  border-right: 1px solid var(--color-surface-edge-dark);')],
    ['a quiet kicker', (s) => s.replace(/color: var\(--color-ink-label-dark\);(\r?\n\s*)text-transform: uppercase;/, 'color: var(--color-ink-quiet-dark);$1text-transform: uppercase;')],
    ['a literal size', (s) => s.replace('font-size: var(--type-panel-title-font-size);', 'font-size: 23px;')],
    ['a mixed-case kicker', (s) => s.replace('text-transform: uppercase;', 'text-transform: none;')],
    ['the release not a flex row', (s) => s.replace(/(\.panel-release \{\s*)display: flex;/, '$1')],
    ['the Skills not a flex run', (s) => s.replace(/(\.panel-skills \{[^}]*?)display: flex;/, '$1')],
    ['the field rules not collapsed', (s) => s.replace('border-collapse: collapse;', '')],
    ['no overflow-wrap', (s) => s.replace('overflow-wrap: anywhere;', '')],
    ['a stray rule', (s) => `${s}\n#focus-panel h2 {\n  margin: 0;\n}\n`],
    ['an !important', (s) => s.replace('margin: 0 0 22px;', 'margin: 0 0 22px !important;')],
    ['a font shorthand', (s) => s.replace('.panel-title {', '.panel-title {\n  font: 500 30px serif;')],
    ['a border-top longhand', (s) => s.replace('.panel-kicker {', '.panel-kicker {\n  border-top-style: solid;')],
    ['an ex literal', (s) => s.replace('margin: var(--space-lg) 0 0;', 'margin: 3ex 0 0;')],
    ['a label set as a value', (s) => s.replace('font-family: var(--type-field-label-font-family);', 'font-family: var(--type-field-value-font-family);')],
    ['a declaration with no colon', (s) => s.replace('cursor: pointer;', 'cursor pointer;')],
    ['no last-paragraph reset', (s) => s.replace(/\.panel-prose:last-child \{\s*margin-bottom: 0;\s*\}/, '')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditStylesheet(mutated, tokensCss), [], `"${name}" must be rejected`);
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
  const code = stripComments(source);
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
  if ((code.match(/\bpace\b/g) ?? []).length !== 4) failures.push('the pace is used other than by the slide mirror, the slide and the cross-fade');
  if (/\bsetReducedMotion\b/.test(code)) failures.push('the panel writes the preference — mount.tsx is its one writer');
  if (!/const\s+previousFlight\s*=\s*useRef\(\s*flight\s*\)/.test(code)) failures.push('the flight key last seen is not a ref seeded at mount');
  if (/\buseState\b|\buseReducer\b|\buseMemo\b|\bsubscribe\s*\(/.test(code)) {
    failures.push('keeps state of its own — the store is the one authority');
  }
  // One layout effect, for the cross-fade alone (2.8): it must start before paint.
  // Two layout effects: the cross-fade's (2.8), which must start before paint, and
  // the one recording the slide mirror on commit (3.15).
  if ((code.match(/\buseLayoutEffect\s*\(/g) ?? []).length !== 2) failures.push('a layout effect other than the cross-fade’s and the slide mirror’s');
  if (/\.sort\s*\(|\.filter\s*\(|\.reverse\s*\(|\.slice\s*\(/.test(code)) failures.push('orders or selects — the model owns the order');
  if (/\bisDeep\b|\bnotable\b|\bteam_size\b|\bcontent\s*\./.test(code)) failures.push('reads the artifact directly — the model owns the blocks');
  if (/\bwindow\b|innerWidth|innerHeight|getBoundingClientRect|matchMedia/.test(code)) failures.push('reads the viewport');
  if (/\.setState\b|\bsetState\b\s*[:,)}]/.test(code)) failures.push('writes the store with setState');
  if (/\b(?:focusProject|advanceScroll|enterRail|enterFreeFlight|resetNavigation)\b/.test(code)) {
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
    if (!/\bstyle=\{\s*panelStyle\(\s*slide\.open\s*,\s*pace\s*,\s*slide\.factor\s*\)\s*\}/.test(attributes)) {
      failures.push('the style is not panelStyle(slide.open, pace, slide.factor) — the close would not follow the slide the browser runs');
    }
  }
  if (!/<h2\b[^>]*\bid=\{\s*titleId\s*\}[^>]*>\s*\{\s*block\.text\s*\}\s*<\/h2>/.test(code)) {
    failures.push('the title is not the <h2> carrying its layer’s title id');
  }
  if (!/case\s*'kicker'\s*:\s*return\s*\(?\s*<p\b[^>]*>\s*\{\s*block\.text\s*\}\s*<\/p>/.test(code)) {
    failures.push('the kicker case does not render block.text');
  }
  // The reading position (3.7): the rule line, or the Notable's paragraphs with the lifted run an inline span in its <p>.
  if (!/case\s*'reading'\s*:\s*return\s*\(?\s*<div\b[^>]*>\s*\{\s*block\.reading\.kind\s*===\s*'rule'\s*\?\s*\(?\s*<p\s+className="panel-rule"\s*>\s*\{\s*block\.reading\.text\s*\}\s*<\/p>/.test(code)) {
    failures.push('the Shallow reading position is not one <p class="panel-rule"> of the model’s rule text');
  }
  if (
    !/block\.reading\.paragraphs\.map\(\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*=>\s*\(?\s*<p\s+key=\{\s*\2\s*\}\s+className="panel-prose"\s*>\s*\{\s*\1\.map\(\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*=>\s*\(?\s*\3\.lifted\s*\?\s*<span\s+key=\{\s*\4\s*\}\s+className="panel-lift"\s*>\s*\{\s*\3\.text\s*\}\s*<\/span>\s*:\s*\3\.text\s*\)?\s*\)\s*\}\s*<\/p>/.test(
      code,
    )
  ) {
    failures.push('the Notable is not one <p class="panel-prose"> per paragraph, its lifted run a <span class="panel-lift"> in the flow');
  }
  // Weight is not an emphasis channel (UX-DR5), and the lift is ink and nothing else (DESIGN.md §7.7).
  if (/<(?:strong|b|em|i|mark|u|s|small|big|cite|q|dfn|ins|del|code|kbd|samp|var|sup|sub|abbr)\b|fontWeight|fontStyle|fontVariant|textDecoration|textTransform/.test(code)) {
    failures.push('an element or style that carries weight or emphasis — the lift is ink alone');
  }
  if (
    !/block\.rows\.map\(\s*\(\s*row\s*\)\s*=>[\s\S]*?<th\b[^>]*>\s*\{\s*row\.label\s*\}\s*<\/th>\s*<td\b[^>]*>\s*\{\s*row\.value\s*\}\s*<\/td>/.test(
      code,
    )
  ) {
    failures.push('the fields case does not put row.label in <th> and row.value in <td>');
  }
  // The Skills list (3.5): a static <ul> named for assistive tech, one <li> per Skill, no heading and no live region.
  if (
    !/case\s*'skills'\s*:\s*return\s*\(?\s*<ul\s+key=\{\s*block\.kind\s*\}(?:\s+className="panel-skills")?\s+aria-label="Skills"\s*>\s*\{\s*block\.items\.map\(\s*\(\s*(\w+)\s*\)\s*=>\s*\(?\s*<li\s+key=\{\s*\1\s*\}\s*>\s*\{\s*\1\s*\}\s*<\/li>\s*\)?\s*\)\s*\}\s*<\/ul>/.test(
      code,
    )
  ) {
    failures.push('the Skills are not a <ul aria-label="Skills"> of one <li> per item');
  }
  // Each block carries the class `focus-panel.css` sets it by, and the stylesheet is imported here, once.
  const classed: readonly (readonly [string, RegExp])[] = [
    ['kicker', /case\s*'kicker'\s*:\s*return\s*\(?\s*<p\b[^>]*\bclassName="panel-kicker"/],
    ['title', /case\s*'title'\s*:\s*return\s*\(?\s*<h2\b[^>]*\bclassName="panel-title"/],
    ['reading', /case\s*'reading'\s*:\s*return\s*\(?\s*<div\s+key=\{\s*block\.kind\s*\}\s+className="panel-reading"\s*>/],
    ['fields', /case\s*'fields'\s*:\s*return\s*\(?\s*<table\b[^>]*\bclassName="panel-fields"/],
    ['skills', /case\s*'skills'\s*:\s*return\s*\(?\s*<ul\b[^>]*\bclassName="panel-skills"/],
    ['release', /case\s*'release'\s*:\s*return\s*\(?\s*<button\b[^>]*\bclassName="panel-release"/],
  ];
  for (const [kind, pattern] of classed) if (!pattern.test(code)) failures.push(`the ${kind} block does not carry its panel-${kind} class`);
  if ((code.match(/^import\s+'\.\/focus-panel\.css'\s*;/gm) ?? []).length !== 1) failures.push('the stylesheet is not imported, once');
  if (/\bstyle=\{\{/.test(code)) failures.push('an inline style literal — the treatment lives in focus-panel.css and the model');
  if (/aria-live|role=["'](?:status|alert|log|marquee|timer)["']/.test(code)) failures.push('a live region — the Skills list is static');
  if (/<h[1-6]\b[^>]*>\s*Skills\b|>\s*Skills\s*</.test(code)) failures.push('a visible Skills heading');
  // The slide mirror (3.15): a ref seeded null, from which each render computes
  // the slide (one clock read, open exactly while a known Project is focused) for
  // the style, and which a layout effect alone writes, once the render commits —
  // so a render React discards never records a flip.
  if (!/const\s+slideMirror\s*=\s*useRef<PanelSlide\s*\|\s*null>\(\s*null\s*\)/.test(code)) failures.push('the slide is not mirrored in a ref seeded null');
  if (
    !/const\s+slide\s*=\s*panelSlide\(\s*slideMirror\.current\s*,\s*focusedProjectId\s*!==\s*null\s*&&\s*panel\s*!==\s*null\s*,\s*performance\.now\(\s*\)\s*,\s*pace\s*\)\s*;/.test(
      code,
    )
  ) {
    failures.push('the slide is not panelSlide(mirror, open, performance.now(), pace), open exactly while a known Project is focused');
  }
  if (!/useLayoutEffect\(\s*\(\)\s*=>\s*\{\s*slideMirror\.current\s*=\s*slide\s*;\s*\}\s*,\s*\[\s*slide\s*\]\s*\)\s*;/.test(code)) {
    failures.push('the slide mirror is not recorded by a layout effect keyed on the slide — a discarded render would record its flip');
  }
  if ((code.match(/\bslideMirror\.current\s*=(?!=)/g) ?? []).length !== 1) failures.push('the slide mirror is written other than once, in its layout effect');
  if ((code.match(/\bperformance\.now\(/g) ?? []).length !== 1) failures.push('the clock is read other than once, for the slide mirror');
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
    ['the wrong field selected', (s) => s.replace('(state) => state.focusedProjectId', '(state) => state.hoveredProjectId')],
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
    ['the title unmarked', (s) => s.replace('<h2 key={block.kind} id={titleId}', '<h2 key={block.kind}')],
    ['the kicker unclassed', (s) => s.replace(' className="panel-kicker"', '')],
    ['the title unclassed', (s) => s.replace(' className="panel-title"', '')],
    ['the release unclassed', (s) => s.replace(' className="panel-release"', '')],
    ['the reading slot unclassed', (s) => s.replace(' className="panel-reading"', '')],
    ['the prose unclassed', (s) => s.replace(' className="panel-prose"', '')],
    ['the lift unclassed', (s) => s.replace(' className="panel-lift"', '')],
    ['the rule unclassed', (s) => s.replace(' className="panel-rule"', '')],
    ['the lift dropped', (s) => s.replace(/\(run\.lifted \? <span[^]*?<\/span> : run\.text\)/, 'run.text')],
    ['the lift in bold', (s) => s.replace(/<span key=\{at\} className="panel-lift">\{run\.text\}<\/span>/, '<strong key={at} className="panel-lift">{run.text}</strong>')],
    ['the lift as its own paragraph', (s) => s.replace(/<span key=\{at\} className="panel-lift">\{run\.text\}<\/span>/, '<p key={at} className="panel-lift">{run.text}</p>')],
    ['an underlined lift', (s) => s.replace('<span key={at} className="panel-lift">', '<span key={at} className="panel-lift"><ins>').replace('{run.text}</span> : run.text', '{run.text}</ins></span> : run.text')],
    ['the lift as code', (s) => s.replace(/<span key=\{at\} className="panel-lift">\{run\.text\}<\/span>/, '<code key={at} className="panel-lift">{run.text}</code>')],
    ['a small-caps lift', (s) => s.replace('<span key={at} className="panel-lift">', '<span key={at} className="panel-lift" style={{ fontVariant: "small-caps" }}>')],
    ['an emphasised rule',(s) => s.replace('<p className="panel-rule">{block.reading.text}</p>', '<p className="panel-rule"><em>{block.reading.text}</em></p>')],
    ['a rule worded in the renderer', (s) => s.replace('<p className="panel-rule">{block.reading.text}</p>', '<p className="panel-rule">Nothing to read here.</p>')],
    ['the field table unclassed', (s) => s.replace(' className="panel-fields"', '')],
    ['the stylesheet not imported', (s) => s.replace("import './focus-panel.css';", '')],
    ['an inline style', (s) => s.replace('<h2 key={block.kind}', '<h2 style={{ fontWeight: 700 }} key={block.kind}')],
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
    ['the slide at full length always', (s) => s.replace('panelStyle(slide.open, pace, slide.factor)', 'panelStyle(slide.open, 1, slide.factor)')],
    ['the slide cut', (s) => s.replace('panelStyle(slide.open, pace, slide.factor)', 'panelStyle(slide.open, 0, slide.factor)')],
    // 3.15's slide mirror: the close follows the slide the browser actually runs.
    ['the factor dropped', (s) => s.replace('panelStyle(slide.open, pace, slide.factor)', 'panelStyle(slide.open, pace)')],
    ['the factor a literal', (s) => s.replace('panelStyle(slide.open, pace, slide.factor)', 'panelStyle(slide.open, pace, 1)')],
    ['the clock replaced by a literal', (s) => s.replace('performance.now(), pace)', '0, pace)')],
    ['the clock read twice', (s) => s.replace('const container = useRef', 'const started = performance.now();\n  const container = useRef')],
    ['the slide ignored', (s) => s.replace('panelStyle(slide.open, pace, slide.factor)', 'panelStyle(focusedProjectId !== null && panel !== null, pace)')],
    ['the slide never remembered', (s) => s.replace('panelSlide(slideMirror.current,', 'panelSlide(null,')],
    ['the mirror at full motion always', (s) => s.replace('performance.now(), pace)', 'performance.now(), 1)')],
    ['the mirror open on any Focus', (s) => s.replace('panelSlide(slideMirror.current, focusedProjectId !== null && panel !== null,', 'panelSlide(slideMirror.current, focusedProjectId !== null,')],
    ['the mirror written twice', mirrorWrittenTwice],
    ['the mirror written during render', (s) => s.replace(/\r?\n\s*useLayoutEffect\(\(\) => \{\s*slideMirror\.current = slide;\s*\}, \[slide\]\);/, '').replace('const container = useRef', 'slideMirror.current = slide;\n  const container = useRef')],
    ['the mirror never recorded', (s) => s.replace(/\r?\n\s*useLayoutEffect\(\(\) => \{\s*slideMirror\.current = slide;\s*\}, \[slide\]\);/, '')],
    ['the mirror recorded after paint', (s) => s.replace(/useLayoutEffect\(\(\) => \{(\s*)slideMirror\.current = slide;/, 'useEffect(() => {$1slideMirror.current = slide;')],
    ['the mirror recorded once only', (s) => s.replace(/(slideMirror\.current = slide;\s*\}, )\[slide\]/, '$1[]')],
    ['the mirror seeded with a slide', (s) => s.replace('useRef<PanelSlide | null>(null)', 'useRef<PanelSlide | null>(panelSlide(null, true, 0))')],
    ['the pace ignoring the preference', (s) => s.replace('motionPace(useSyncExternalStore(subscribeReducedMotion, reducedMotion))', 'motionPace(false)')],
    ['the preference read without subscribing', (s) => s.replace('motionPace(useSyncExternalStore(subscribeReducedMotion, reducedMotion))', 'motionPace(reducedMotion())')],
    ['the preference written from the panel', (s) => s.replace('const container = useRef', 'setReducedMotion(true);\n  const container = useRef')],
    ['a fade on entry too', (s) => s.replace('if (fade !== null && incoming.current !== null)', 'if (incoming.current !== null)')],
    [
      'the previous ID overwritten before the fade reads it',
      (s) => s.replace('    const fade = crossFade(', '    previous.current = focusedProjectId;\n    const fade = crossFade('),
    ],
    ['inert on the whole panel', (s) => s.replace('tabIndex={-1}', 'tabIndex={-1}\n      inert')],
    ['always open', (s) => s.replace('panelStyle(slide.open, pace, slide.factor)', 'panelStyle(true, pace, slide.factor)')],
    ['blank on close', (s) => s.replace('buildPanel(artifact, shown.current)', 'buildPanel(artifact, focusedProjectId)')],
    ['no focus on entry', (s) => s.replace('container.current?.focus({ preventScroll: true });', '')],
    ['no focus on release', (s) => s.replace('document.getElementById(indexEntryId(move.entry))?.focus();', '')],
    ['focus to the root on release', (s) => s.replace('document.getElementById(indexEntryId(move.entry))?.focus();', 'document.body.focus();')],
    ['the previous ID forgotten', (s) => s.replace('previous.current = focusedProjectId;', '')],
    ['a viewport read', (s) => s.replace('const container = useRef', 'const wide = window.innerWidth > 1200;\n  const container = useRef')],
    ['the kicker shows the wrong field', (s) => s.replace(/(className="panel-kicker">\s*)\{block\.text\}/, '$1{block.kind}')],
    ['the reading position dropped', (s) => s.replace("case 'reading':", "case 'reading':\n            return null;")],
    ['paragraphs not in <p>', (s) => s.replace(/<p key=\{index\} className="panel-prose">([^]*?)<\/p>/, '<span key={index} className="panel-prose">$1</span>')],
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
    // 3.5's Skills list.
    ['the Skills list dropped', (s) => s.replace("case 'skills':", "case 'skills':\n        return null;")],
    ['the Skills list unnamed', (s) => s.replace(' aria-label="Skills"', '')],
    ['the Skills list announced', (s) => s.replace(' aria-label="Skills"', ' aria-label="Skills" aria-live="polite"')],
    ['a visible Skills heading', (s) => s.replace('<ul key={block.kind} className="panel-skills"', '<h3>Skills</h3>\n          <ul key={block.kind} className="panel-skills"')],
    ['the Skills unclassed', (s) => s.replace(' className="panel-skills"', '')],
    ['the Skills as one string', (s) => s.replace('<li key={item}>{item}</li>', '<li key={item}>{block.items.join(", ")}</li>')],
    ['the previous ID written twice', (s) => s.replace('previous.current = focusedProjectId;', 'previous.current = focusedProjectId;\n    previous.current = null;')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditPanel(mutated), [], `"${name}" must be rejected`);
  }
});

/**
 * A second write to the slide mirror, in the scroll listener: the layout effect
 * that records it is untouched, so only the write count can see it.
 */
function mirrorWrittenTwice(source: string): string {
  return source.replace('scrolled.current = element.scrollTop;', 'scrolled.current = element.scrollTop;\n      slideMirror.current = null;');
}

test('the mirror’s write count is red on its own: a second write breaks no other clause', () => {
  const real = readFileSync(PANEL_TSX, 'utf8');
  const mutated = mirrorWrittenTwice(real);
  assert.notEqual(mutated, real, 'the mutation must apply');
  assert.deepEqual(auditPanel(mutated), ['the slide mirror is written other than once, in its layout effect']);
});

// --- Index entries carry their ID -----------------------------------------------------
// (`App.tsx`'s mount of the panel is `src/App.test.ts`'s since 4.7: rendered, and its structural audit.)

function auditEntryIds(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  const projectButton = /<button\b([^>]*\bonClick=\{\s*\(\)\s*=>\s*activateProject\(\s*project\.id\s*,\s*client\.id\s*\)\s*\}[^>]*)>/.exec(code);
  if (projectButton === null) return ['no Project button'];
  if (!/\bid=\{\s*indexEntryId\(\s*project\.id\s*\)\s*\}/.test(projectButton[1] ?? '')) {
    failures.push('the Project button does not carry id={indexEntryId(project.id)} — focus cannot return to it');
  }
  // Two ids: the Project entry's, and `overview`'s (3.8), where the corner slot hands focus back.
  const ids = code.match(/\bid=\{[^}]*\}+/g) ?? [];
  if (ids.length !== 2 || !ids.includes('id={OVERVIEW_ID}')) failures.push('an id other than the Project entry’s and overview’s');
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
    ['a third id', (s: string) => s.replace('<button type="button" onClick={() => activateClient', '<button type="button" id={client.id} onClick={() => activateClient')],
    ['the overview id swapped for another', (s: string) => s.replace('id={OVERVIEW_ID} onClick', 'id={FOCUS_PANEL_ID} onClick')],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditEntryIds(mutated), [], `"${name}" must be rejected`);
  }
});
