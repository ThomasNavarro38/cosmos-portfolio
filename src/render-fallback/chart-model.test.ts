/**
 * The flat star chart's rules, executed (4.3): the present-to-past order and its
 * ties, content parity against the committed artifact, the Shallow rule line,
 * both plates' geometry, the Deep/Shallow Ring (4.4) on both plates and in the
 * index, the fragment target — and two source scans that hold
 * what `node --test` cannot load: the directory's purity (no solve field, no
 * `src/data`/`derive`/`render-scene`/Three, no canvas) and `chart.tsx`'s
 * thinness (no sort, filter, `if` or conditional operator). Each scan is driven over
 * mutations of the shipped file, so each can be seen to fail.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isTestFile, sourceFilesUnder, stripComments, stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { EDITORIAL_RULE, FIELD_LABELS, LIFT_CLOSE, LIFT_OPEN, PARAGRAPH_BREAK, kickerText } from '../shell/panel-model.ts';
import {
  ACROSS,
  CHART_LABELS,
  DOWN,
  INDEX_GLYPH,
  LEGEND_GLYPH,
  MARKER_R,
  RING_R,
  RING_RATIO,
  buildChart,
  fragmentTarget,
  labelTypeOf,
  landOnFragment,
  type ChartArtifact,
  type ChartArtifactClient,
  type ChartArtifactProject,
  type ChartModel,
  type Plate,
  type PlateLabel,
} from './chart-model.ts';

const DIR = fileURLToPath(new URL('.', import.meta.url));
const CHART_TSX = join(DIR, 'chart.tsx');
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));
const DESIGN_MD = fileURLToPath(new URL('../../_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md', import.meta.url));

const committed = (): ChartArtifact => JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as ChartArtifact;

// --- Fixtures ---------------------------------------------------------------

function project(id: string, timeAxis: number, extra: Partial<ChartArtifactProject['content']> = {}, isDeep = false): ChartArtifactProject {
  return {
    id,
    isDeep,
    timeAxis,
    content: {
      project: `Title of ${id}`,
      company: null,
      role: 'Developer',
      team_size: 3,
      built: `Built ${id}`,
      skills: ['Java'],
      duration: { start: '2020-01', end: '2020-06' },
      ...extra,
    },
  };
}

function client(id: string, timeAxis: number, projects: readonly ChartArtifactProject[]): ChartArtifactClient {
  return { id, name: `Name ${id}`, timeAxis, projects };
}

/** Ties at every level: two Clients at 1, two Projects at 0.5 inside one, emitted in the wrong order. */
const TIED: ChartArtifact = {
  clients: [
    client('client:b', 1, [project('project:b/x', 1)]),
    client('client:c', 0.2, [project('project:c/x', 0.2)]),
    client('client:a', 1, [project('project:a/z', 0.5), project('project:a/y', 1), project('project:a/m', 0.5)]),
  ],
};

const sectionIds = (chart: ChartModel): string[] => chart.sections.map((section) => section.id);
const recordIds = (chart: ChartModel): string[] => chart.sections.flatMap((section) => section.records.map((record) => record.id));

// --- Order ------------------------------------------------------------------

test('order: Clients present to past, Projects within each likewise, ties by ID ascending', () => {
  const chart = buildChart(TIED);
  assert.deepEqual(sectionIds(chart), ['client:a', 'client:b', 'client:c']);
  assert.deepEqual(recordIds(chart), ['project:a/y', 'project:a/m', 'project:a/z', 'project:b/x', 'project:c/x']);
  assert.deepEqual(chart.rows.map((row) => row.id), recordIds(chart), 'the index reads in the records’ order');
  assert.deepEqual(chart.ids, [...sectionIds(chart), ...recordIds(chart)]);
  // The input is not reordered in place.
  assert.deepEqual(TIED.clients.map((entry) => entry.id), ['client:b', 'client:c', 'client:a']);
});

test('order: the committed artifact reads Decathlon first and SIMSU last', () => {
  const chart = buildChart(committed());
  assert.deepEqual(sectionIds(chart), ['client:decathlon', 'client:sncf', 'client:air-france-klm', 'client:sncf-connect-tech', 'client:transilien', 'client:simsu']);
  assert.deepEqual(chart.sections[1]?.records.map((record) => record.id), ['project:sncf/client-referential', 'project:sncf/file-aggregator-transcoder']);
});

// --- Parity -----------------------------------------------------------------

/** Authored prose with the lift marks dropped, as paragraphs. */
function unmarked(prose: string): string[] {
  return prose
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
    .map((paragraph) => paragraph.replace(LIFT_OPEN, '').replace(LIFT_CLOSE, ''));
}

test('parity: every committed Client and Project is drawn, each record holding every content value', () => {
  const artifact = committed();
  const chart = buildChart(artifact);
  const projects = artifact.clients.flatMap((entry) => entry.projects.map((inner) => ({ client: entry, project: inner })));
  assert.equal(projects.length, 8);
  assert.deepEqual(new Set(sectionIds(chart)), new Set(artifact.clients.map((entry) => entry.id)));
  assert.deepEqual(new Set(recordIds(chart)), new Set(projects.map(({ project: inner }) => inner.id)));
  const records = new Map(chart.sections.flatMap((section) => section.records.map((record) => [record.id, record] as const)));
  for (const { client: owner, project: entry } of projects) {
    const record = records.get(entry.id);
    assert.ok(record !== undefined, entry.id);
    const { content } = entry;
    assert.deepEqual(record.blocks.map((block) => block.kind), [
      'kicker',
      'title',
      'reading',
      'fields',
      ...(content.skills.length === 0 ? [] : ['skills']),
    ], `${entry.id}: the scene panel's blocks, minus release`);
    assert.deepEqual(record.blocks[0], { kind: 'kicker', text: kickerText(owner.name, content.company) });
    assert.deepEqual(record.blocks[1], { kind: 'title', text: content.project });
    assert.deepEqual(record.blocks[3], {
      kind: 'fields',
      rows: [
        { label: FIELD_LABELS.role, value: content.role },
        { label: FIELD_LABELS.team, value: String(content.team_size) },
        { label: FIELD_LABELS.built, value: content.built },
      ],
    });
    const skills = record.blocks.find((block) => block.kind === 'skills');
    assert.deepEqual(skills === undefined ? [] : skills.items, [...new Set(content.skills)], `${entry.id}: every Skill as text`);
    assert.deepEqual(record.dates, content.duration, `${entry.id}: the dates as authored`);
    const reading = record.blocks[2];
    assert.ok(reading !== undefined && reading.kind === 'reading');
    if (entry.isDeep) {
      assert.equal(reading.reading.kind, 'notable');
      if (reading.reading.kind !== 'notable') continue;
      const rejoined = reading.reading.paragraphs.map((runs) => runs.map((run) => run.text).join(''));
      assert.deepEqual(rejoined, unmarked(content.notable ?? ''), `${entry.id}: every Notable paragraph, verbatim, marks dropped`);
      assert.equal(reading.reading.paragraphs.flat().filter((run) => run.lifted).length, 1, `${entry.id}: one lifted run`);
    } else {
      assert.deepEqual(reading.reading, { kind: 'rule', text: EDITORIAL_RULE }, `${entry.id}: the scene panel's exact rule line`);
    }
  }
  const row = chart.rows.find((entry) => entry.id === 'project:sncf/client-referential');
  assert.deepEqual(row, {
    id: 'project:sncf/client-referential',
    href: '#project:sncf/client-referential',
    client: 'SNCF',
    notable: { kind: 'ring', label: 'Carries a notable' },
    title: 'Client referential',
    role: projects.find(({ project: inner }) => inner.id === 'project:sncf/client-referential')?.project.content.role,
    dates: { start: '2022-08', end: '2024-02' },
  });
});

test('parity: the ongoing engagement keeps its null end, and the committed artifact holds exactly one', () => {
  const chart = buildChart(committed());
  const ongoing = chart.rows.filter((row) => row.dates.end === null);
  assert.deepEqual(ongoing.map((row) => [row.id, row.dates.start]), [['project:decathlon/store-labelling-generation', '2024-02']]);
});

test('Shallow: the reading position is EDITORIAL_RULE, string-equal; Deep: the Notable', () => {
  const chart = buildChart({
    clients: [client('client:a', 1, [project('project:a/deep', 1, { notable: 'One [[lifted]] line.\n\nTwo.' }, true), project('project:a/shallow', 0.5, { notable: 'Prose on a Shallow entry.' })])],
  });
  const [deep, shallow] = chart.sections[0]?.records ?? [];
  assert.deepEqual(deep?.blocks[2], {
    kind: 'reading',
    reading: { kind: 'notable', paragraphs: [[{ text: 'One ', lifted: false }, { text: 'lifted', lifted: true }, { text: ' line.', lifted: false }], [{ text: 'Two.', lifted: false }]] },
  });
  const reading = shallow?.blocks[2];
  assert.ok(reading !== undefined && reading.kind === 'reading' && reading.reading.kind === 'rule');
  assert.equal(reading.reading.text, EDITORIAL_RULE, 'branches on isDeep, never on notable');
  assert.ok(chart.sections.flatMap((section) => section.records).every((record) => record.blocks.every((block) => (block.kind as string) !== 'release')), 'no release on the chart');
});

test('the copy labels: the four table headers, the two legend phrases, and the one accessible name never drawn', () => {
  assert.deepEqual(CHART_LABELS, { notable: 'Notable', client: 'Client', project: 'Project', dates: 'Dates', carries: 'Carries a notable', doesNot: 'Does not', none: 'No notable' });
});

// --- The plates -------------------------------------------------------------

/** A label's estimated box. */
function box(label: PlateLabel): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } {
  const left = label.anchor === 'middle' ? label.x - label.width / 2 : label.x;
  return { left, right: left + label.width, top: label.y - label.size, bottom: label.y + label.size * 0.25 };
}

/** Every mark and label of a plate outside its viewBox, by key. */
function outside(plate: Plate): string[] {
  const out: string[] = [];
  for (const circle of plate.circles) {
    if (circle.cx - circle.r < 0 || circle.cx + circle.r > plate.width || circle.cy - circle.r < 0 || circle.cy + circle.r > plate.height) out.push(circle.key);
  }
  for (const line of plate.lines) {
    if ([line.x1, line.x2].some((x) => x < 0 || x > plate.width) || [line.y1, line.y2].some((y) => y < 0 || y > plate.height)) out.push(line.key);
  }
  for (const label of plate.labels) {
    const { left, right, top, bottom } = box(label);
    if (left < 0 || right > plate.width || top < 0 || bottom > plate.height) out.push(label.key);
  }
  return out;
}

const markers = (plate: Plate) => plate.circles.filter((circle) => circle.className === 'chart-marker');
const stars = (plate: Plate) => plate.circles.filter((circle) => circle.className === 'chart-star');

/** Every Project's timeAxis, by ID. */
function timeAxes(artifact: ChartArtifact): Map<string, number> {
  return new Map(artifact.clients.flatMap((entry) => entry.projects.map((inner) => [inner.id, inner.timeAxis] as const)));
}

for (const [name, artifact] of [['the committed artifact', committed()], ['the tied fixture', TIED]] as const) {
  test(`across-plate (${name}): x strictly decreasing in timeAxis, everything inside the viewBox`, () => {
    const { across } = buildChart(artifact);
    assert.equal(across.width, ACROSS.width);
    assert.equal(across.viewBox, `0 0 ${across.width} ${across.height}`);
    const axis = timeAxes(artifact);
    const placed = markers(across);
    assert.equal(placed.length, axis.size, 'one marker per Project');
    for (const a of placed) {
      for (const b of placed) {
        const ta = axis.get(a.entity) as number;
        const tb = axis.get(b.entity) as number;
        if (ta > tb) assert.ok(a.cx < b.cx, `${a.entity} (t=${ta}) sits left of ${b.entity} (t=${tb})`);
        if (ta === tb) assert.equal(a.cx, b.cx);
      }
    }
    assert.ok(placed.every((marker) => marker.r === MARKER_R), 'one marker size');
    assert.deepEqual(outside(across), []);
  });

  test(`across-plate (${name}): each Star sits left of its newest marker, its name above it`, () => {
    const chart = buildChart(artifact);
    const { across } = chart;
    for (const section of chart.sections) {
      const star = stars(across).find((circle) => circle.entity === section.id);
      const newest = markers(across).find((circle) => circle.entity === section.records[0]?.id);
      assert.ok(star !== undefined && newest !== undefined, section.id);
      assert.equal(star.cy, newest.cy, 'one row');
      assert.equal(newest.cx - star.cx, ACROSS.starOffset, `${section.id}: the Star is offset, not drawn on its newest marker`);
      const name = across.labels.find((label) => label.entity === section.id);
      assert.ok(name !== undefined && name.y < star.cy - star.r, `${section.id}: the name above the Star`);
      assert.equal(name.text, section.name);
    }
  });

  test(`across-plate (${name}): adjacent same-row labels on alternating levels`, () => {
    const chart = buildChart(artifact);
    for (const section of chart.sections) {
      const levels = section.records.map((record) => chart.across.labels.find((label) => label.entity === record.id)?.y);
      assert.ok(levels.every((y) => y !== undefined), section.id);
      for (let i = 1; i < levels.length; i += 1) assert.notEqual(levels[i], levels[i - 1], `${section.id}: label ${i} alternates`);
      for (let i = 2; i < levels.length; i += 1) assert.equal(levels[i], levels[i - 2], `${section.id}: two levels only`);
    }
  });

  test(`down-plate (${name}): y increasing down each stem, Client blocks in order, marks a marker diameter apart`, () => {
    const chart = buildChart(artifact);
    const { down } = chart;
    assert.equal(down.width, DOWN.width);
    let previousBottom = -Infinity;
    for (const section of chart.sections) {
      const star = stars(down).find((circle) => circle.entity === section.id);
      assert.ok(star !== undefined, section.id);
      assert.ok(star.cy > previousBottom, `${section.id}: below the Client before it`);
      let previous = star.cy;
      for (const record of section.records) {
        const marker = markers(down).find((circle) => circle.entity === record.id);
        assert.ok(marker !== undefined, record.id);
        assert.equal(marker.cx, star.cx, `${record.id}: on its Client's stem`);
        assert.ok(marker.cy > previous, `${record.id}: further down its stem`);
        previous = marker.cy;
      }
      previousBottom = previous;
      const stem = down.lines.find((line) => line.className === 'chart-stem' && line.entity === section.id);
      assert.ok(stem !== undefined && stem.y1 === star.cy && stem.y2 === previous, `${section.id}: the stem runs from the Star to the oldest marker`);
    }
    const marks = [...stars(down), ...markers(down)];
    for (const [i, a] of marks.entries()) {
      for (const b of marks.slice(i + 1)) {
        assert.ok(Math.hypot(a.cx - b.cx, a.cy - b.cy) >= 2 * MARKER_R, `${a.key} and ${b.key} are a marker diameter apart`);
      }
    }
    assert.deepEqual(outside(down), []);
  });
}

/** One `components.<name>` block of DESIGN.md's frontmatter, as `key: value` text pairs (the scene's `notable-model.test.ts` reads it alike). */
function designComponent(name: string): Record<string, string> {
  const text = readFileSync(DESIGN_MD, 'utf8').replace(/\r\n/g, '\n');
  const block = new RegExp(`\\n  ${name}:\\n((?:    [^\\n]*\\n)+)`).exec(text)?.[1] ?? '';
  return Object.fromEntries([...block.matchAll(/^    ([\w-]+):\s*(.+?)\s*$/gm)].map((match) => [match[1] ?? '', (match[2] ?? '').replace(/^"|"$/g, '')]));
}

test('the Ring is DESIGN.md’s ring-notable: 2.2 × the marker, stroke-near, hairline, undashed — and the glyphs keep the ratio', () => {
  const ring = designComponent('ring-notable');
  assert.equal(Number(ring.radiusRatio), RING_RATIO);
  assert.equal(RING_RATIO, 2.2);
  assert.equal(RING_R, 15.4);
  assert.ok(Math.abs(RING_R / MARKER_R - 2.2) < 1e-9, 'RING_R / MARKER_R is 2.2');
  assert.equal(ring.stroke, '{colors.stroke-near-dark}', 'DESIGN.md strokes the Ring at stroke-near');
  assert.equal(ring.strokeWidth, '{components.stroke-weight.hairline}', 'DESIGN.md strokes the Ring at the hairline');
  assert.equal(ring.dash, 'none');
  // chart.css draws what DESIGN.md names: `{colors.X}` is `--color-X`, `{components.stroke-weight.X}` is `--stroke-X`.
  const css = readFileSync(join(DIR, 'chart.css'), 'utf8').replace(/\r\n/g, '\n');
  const rule = /\n\.chart-ring \{\n([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(rule, new RegExp(`^  stroke: var\\(--color-${ring.stroke.replace(/^\{colors\.|\}$/g, '')}\\);$`, 'm'), 'chart.css strokes .chart-ring at DESIGN.md’s colour');
  assert.match(rule, new RegExp(`^  stroke-width: var\\(--stroke-${ring.strokeWidth.replace(/^\{components\.stroke-weight\.|\}$/g, '')}\\);$`, 'm'), 'chart.css strokes .chart-ring at DESIGN.md’s weight');
  assert.match(rule, /^ {2}fill: none;$/m, 'chart.css leaves the Ring unfilled');
  assert.doesNotMatch(rule, /dash/, 'chart.css leaves the Ring undashed');
  assert.deepEqual(INDEX_GLYPH, { size: 20, viewBox: '0 0 20 20', centre: 10, markerR: 4, ringR: 8.8 });
  assert.deepEqual(LEGEND_GLYPH, { size: 40, viewBox: '0 0 40 40', centre: 20, markerR: MARKER_R, ringR: RING_R });
  for (const glyph of [INDEX_GLYPH, LEGEND_GLYPH]) {
    assert.ok(Math.abs(glyph.ringR / glyph.markerR - 2.2) < 1e-9, `${glyph.viewBox}: the plate's ratio`);
    assert.ok(glyph.centre + glyph.ringR <= glyph.size, `${glyph.viewBox}: the Ring fits its frame`);
  }
});

const rings = (plate: Plate) => plate.circles.filter((circle) => circle.className === 'chart-ring');
const leaderOf = (plate: Plate, id: string) => plate.lines.find((line) => line.className === 'chart-leader' && line.entity === id);

/** The committed artifact with one Project's `isDeep` inverted. */
function flipped(artifact: ChartArtifact, id: string): ChartArtifact {
  return { clients: artifact.clients.map((entry) => ({ ...entry, projects: entry.projects.map((inner) => (inner.id === id ? { ...inner, isDeep: !inner.isDeep } : inner)) })) };
}

/** The Deep Project IDs of an artifact, read off `isDeep`. */
const deepIds = (artifact: ChartArtifact): Set<string> => new Set(artifact.clients.flatMap((entry) => entry.projects.filter((inner) => inner.isDeep).map((inner) => inner.id)));

test('Deep/Shallow (committed): exactly one ring per plate, at the one Deep Project, and one ringed index row', () => {
  const artifact = committed();
  assert.deepEqual([...deepIds(artifact)], ['project:sncf/client-referential']);
  const chart = buildChart(artifact);
  for (const plate of [chart.across, chart.down]) {
    const ringed = rings(plate);
    assert.deepEqual(ringed.map((circle) => circle.entity), ['project:sncf/client-referential']);
    const marker = markers(plate).find((circle) => circle.entity === 'project:sncf/client-referential');
    assert.ok(marker !== undefined);
    assert.deepEqual([ringed[0]?.cx, ringed[0]?.cy, ringed[0]?.r], [marker.cx, marker.cy, RING_R], 'concentric with its marker, at RING_R');
  }
  assert.deepEqual(chart.rows.filter((row) => row.notable.kind === 'ring').map((row) => row.id), ['project:sncf/client-referential']);
  for (const row of chart.rows) {
    assert.deepEqual(row.notable, row.id === 'project:sncf/client-referential' ? { kind: 'ring', label: 'Carries a notable' } : { kind: 'plain', label: 'No notable' }, row.id);
  }
  assert.deepEqual(chart.legend, [{ kind: 'ring', text: 'Carries a notable' }, { kind: 'plain', text: 'Does not' }]);
});

test('Deep/Shallow: the signal is isDeep alone — a notable on a Shallow Project rings nothing, a Deep one without content.notable is ringed', () => {
  const chart = buildChart({
    clients: [client('client:a', 1, [project('project:a/deep', 1, {}, true), project('project:a/shallow', 0.5, { notable: 'Prose on a Shallow entry.' })])],
  });
  for (const plate of [chart.across, chart.down]) assert.deepEqual(rings(plate).map((circle) => circle.entity), ['project:a/deep']);
  assert.deepEqual(chart.rows.map((row) => [row.id, row.notable.kind, row.notable.label]), [['project:a/deep', 'ring', 'Carries a notable'], ['project:a/shallow', 'plain', 'No notable']]);
});

test('Deep/Shallow: both plates draw every marker at one size, one class — only the Ring differs', () => {
  const artifact = committed();
  const deep = deepIds(artifact);
  assert.ok(deep.size > 0, 'the committed artifact holds a Deep Project');
  for (const plate of [buildChart(artifact).across, buildChart(artifact).down]) {
    // Each class is one of the nine the stylesheet treats; a Deep class or a halo is none of them.
    const allowed: ReadonlySet<string> = new Set(['chart-baseline', 'chart-stem', 'chart-leader', 'chart-star', 'chart-star-core', 'chart-marker', 'chart-ring', 'chart-label-client', 'chart-label-project']);
    const classes: string[] = [...plate.circles, ...plate.lines, ...plate.labels].map((item) => item.className);
    assert.deepEqual(classes.filter((name) => !allowed.has(name)), []);
    assert.deepEqual(new Set(markers(plate).map((marker) => `${marker.className} ${marker.r}`)), new Set([`chart-marker ${MARKER_R}`]), 'Deep and Shallow markers are drawn alike');
    assert.equal(markers(plate).length, artifact.clients.reduce((count, entry) => count + entry.projects.length, 0), 'one marker per Project, Deep or Shallow');
    assert.ok(rings(plate).every((ring) => deep.has(ring.entity)), 'a ring only on a Deep Project');
  }
});

/** A record's reading position kind: `notable` on a Deep Project, `rule` on a Shallow one. */
function readingKindOf(chart: ChartModel, id: string): string | undefined {
  const block = chart.sections.flatMap((section) => section.records).find((record) => record.id === id)?.blocks.find((inner) => inner.kind === 'reading');
  return block !== undefined && block.kind === 'reading' ? block.reading.kind : undefined;
}

test('Deep/Shallow: flipping one isDeep changes only that Project’s ring, leader start, index cell and reading position', () => {
  const artifact = committed();
  const base = buildChart(artifact);
  const every = artifact.clients.flatMap((entry) => entry.projects.map((inner) => inner.id));
  assert.ok(every.length > 2, 'every committed Project is flipped in turn');
  for (const id of every) {
    const after = buildChart(flipped(artifact, id));
    for (const which of ['across', 'down'] as const) {
      const [a, b] = [base[which], after[which]];
      assert.deepEqual([b.width, b.height, b.viewBox], [a.width, a.height, a.viewBox], `${which}: the frame is unchanged`);
      assert.deepEqual(b.labels, a.labels, `${which}: every label is unchanged`);
      const notRing = (plate: Plate) => plate.circles.filter((circle) => circle.className !== 'chart-ring');
      assert.deepEqual(notRing(b), notRing(a), `${which}: every Star and marker is unchanged`);
      assert.deepEqual(rings(b).filter((ring) => ring.entity !== id), rings(a).filter((ring) => ring.entity !== id), `${which}: every other ring is unchanged`);
      assert.notEqual(rings(b).some((ring) => ring.entity === id), rings(a).some((ring) => ring.entity === id), `${which}: ${id}'s ring toggles`);
      assert.deepEqual(b.lines.filter((line) => line.entity !== id), a.lines.filter((line) => line.entity !== id), `${which}: every other line is unchanged`);
      const [la, lb] = [leaderOf(a, id), leaderOf(b, id)];
      assert.ok(la !== undefined && lb !== undefined);
      assert.deepEqual([lb.x2, lb.y2], [la.x2, la.y2], `${which}: the leader's end is unchanged`);
      // The start moves along the leader, outward on Deep, by the Ring's margin over the marker.
      const shift = Math.hypot(lb.x1 - la.x1, lb.y1 - la.y1);
      assert.ok(Math.abs(shift - (RING_R - MARKER_R)) < 1e-9, `${which}: ${id}'s leader start moves by RING_R − MARKER_R, not ${shift}`);
      const toward = Math.hypot(lb.x2 - lb.x1, lb.y2 - lb.y1) - Math.hypot(la.x2 - la.x1, la.y2 - la.y1);
      const deepAfter = rings(b).some((ring) => ring.entity === id);
      assert.ok(Math.abs(toward - (deepAfter ? -1 : 1) * (RING_R - MARKER_R)) < 1e-9, `${which}: ${id}'s leader shortens on Deep, lengthens on Shallow`);
    }
    assert.deepEqual(after.rows.filter((row) => row.id !== id), base.rows.filter((row) => row.id !== id), 'every other index row is unchanged');
    const cellOf = (chart: ChartModel) => chart.rows.find((row) => row.id === id)?.notable;
    const cells = { ring: { kind: 'ring', label: 'Carries a notable' }, plain: { kind: 'plain', label: 'No notable' } } as const;
    const before = cellOf(base);
    assert.ok(before !== undefined);
    assert.deepEqual(cellOf(after), before.kind === 'ring' ? cells.plain : cells.ring, `${id}'s cell flips, kind and label`);
    // The flipped record's reading position follows isDeep (the panel's own branch); every other record is untouched.
    assert.deepEqual([readingKindOf(base, id), readingKindOf(after, id)], before.kind === 'ring' ? ['notable', 'rule'] : ['rule', 'notable'], `${id}'s reading position flips`);
    const others = (chart: ChartModel) => chart.sections.map((section) => section.records.filter((record) => record.id !== id));
    assert.deepEqual(others(after), others(base), 'every other record is unchanged');
  }
});

/** The shortest distance from a point to a line segment. */
function segmentDistance(px: number, py: number, line: { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }): number {
  const [dx, dy] = [line.x2 - line.x1, line.y2 - line.y1];
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.min(Math.max(((px - line.x1) * dx + (py - line.y1) * dy) / length, 0), 1);
  return Math.hypot(px - (line.x1 + t * dx), py - (line.y1 + t * dy));
}

/** The Deep fixture: every Project ringed, so each geometry row is checked with the most rings. */
const ALL_DEEP = (artifact: ChartArtifact): ChartArtifact => ({ clients: artifact.clients.map((entry) => ({ ...entry, projects: entry.projects.map((inner) => ({ ...inner, isDeep: true })) })) });

for (const [name, artifact] of [['the committed artifact', committed()], ['the committed artifact, every Project Deep', ALL_DEEP(committed())], ['the tied fixture, every Project Deep', ALL_DEEP(TIED)]] as const) {
  test(`Ring geometry (${name}): each leader starts beyond its mark, the Ring inside the viewBox and clear of every other mark, line and label`, () => {
    const chart = buildChart(artifact);
    const deep = deepIds(artifact);
    const owner = new Map(artifact.clients.flatMap((entry) => entry.projects.map((inner) => [inner.id, entry.id] as const)));
    const timeOf = new Map(artifact.clients.flatMap((entry) => entry.projects.map((inner) => [inner.id, inner.timeAxis] as const)));
    for (const [which, plate] of [['across', chart.across], ['down', chart.down]] as const) {
      assert.deepEqual(outside(plate), [], `${which}: everything, rings counted, inside the viewBox`);
      for (const marker of markers(plate)) {
        const leader = leaderOf(plate, marker.entity);
        assert.ok(leader !== undefined, marker.entity);
        const start = Math.hypot(leader.x1 - marker.cx, leader.y1 - marker.cy);
        const end = Math.hypot(leader.x2 - marker.cx, leader.y2 - marker.cy);
        const floor = deep.has(marker.entity) ? RING_R : MARKER_R;
        assert.ok(start >= floor, `${which}: ${marker.entity}'s leader starts at ${start}, beyond ${floor}`);
        assert.ok(end - start >= 1, `${which}: ${marker.entity}'s leader shows at least one unit (${end - start})`);
      }
      for (const ring of rings(plate)) {
        // A tie in timeAxis (4.3 draws tied Projects on one spot) is not a ring collision: only a marker or Ring of
        // another Project of the same Client at the same timeAxis is exempt, never a Star or anything else on the spot.
        const tied = (circle: Plate['circles'][number]) =>
          (circle.className === 'chart-marker' || circle.className === 'chart-ring') && owner.get(circle.entity) === owner.get(ring.entity) && timeOf.get(circle.entity) === timeOf.get(ring.entity);
        const elsewhere = (circle: Plate['circles'][number]) => circle.cx !== ring.cx || circle.cy !== ring.cy || !tied(circle);
        // Every other Star, marker and Ring: the core dot sits inside its Star, so the Star stands for it.
        for (const other of plate.circles.filter((circle) => circle.entity !== ring.entity && circle.className !== 'chart-star-core' && elsewhere(circle))) {
          assert.ok(Math.hypot(ring.cx - other.cx, ring.cy - other.cy) >= ring.r + other.r, `${which}: ${ring.key} is clear of ${other.key}`);
        }
        // Every line but the ring's own leader and its own Client's baseline or stem, which run to its marker by design.
        const own = new Set([ring.entity, owner.get(ring.entity)]);
        for (const line of plate.lines.filter((candidate) => !own.has(candidate.entity))) {
          const distance = segmentDistance(ring.cx, ring.cy, line);
          assert.ok(distance >= ring.r, `${which}: ${ring.key} is clear of ${line.key} (${distance})`);
        }
        for (const label of plate.labels) {
          const b = box(label);
          const apart = ring.cx + ring.r <= b.left || b.right <= ring.cx - ring.r || ring.cy + ring.r <= b.top || b.bottom <= ring.cy - ring.r;
          assert.ok(apart, `${which}: ${ring.key} is clear of ${label.key}`);
        }
      }
      const boxes = plate.labels.map((label) => [label.key, box(label)] as const);
      for (const [i, [keyA, a]] of boxes.entries()) {
        for (const [keyB, b] of boxes.slice(i + 1)) {
          assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, `${which}: ${keyA} and ${keyB} overlap`);
        }
      }
    }
  });
}

test('the across plate draws one baseline per Client and no stem; the down plate one stem per Client and no baseline', () => {
  for (const artifact of [committed(), TIED]) {
    const { across, down } = buildChart(artifact);
    const clients = artifact.clients.map((entry) => entry.id).sort();
    const ofClass = (plate: Plate, name: string): string[] => plate.lines.filter((line) => line.className === name).map((line) => line.entity).sort();
    assert.deepEqual(ofClass(across, 'chart-baseline'), clients, 'the across plate draws exactly one baseline for each Client');
    assert.deepEqual(ofClass(across, 'chart-stem'), [], 'the across plate draws no stem');
    assert.deepEqual(ofClass(down, 'chart-stem'), clients, 'the down plate draws exactly one stem for each Client');
    assert.deepEqual(ofClass(down, 'chart-baseline'), [], 'the down plate draws no baseline');
  }
});

for (const [name, artifact] of [['the committed artifact', committed()], ['the tied fixture', TIED]] as const) {
  test(`labels (${name}): no two label boxes intersect, on either plate`, () => {
    const chart = buildChart(artifact);
    for (const [which, plate] of [['across', chart.across], ['down', chart.down]] as const) {
      const boxes = plate.labels.map((label) => [label.key, box(label)] as const);
      assert.ok(boxes.length > 0, `${which}: the plate draws labels`);
      for (const [i, [keyA, a]] of boxes.entries()) {
        for (const [keyB, b] of boxes.slice(i + 1)) {
          const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
          assert.ok(apart, `${which}: ${keyA} and ${keyB} overlap`);
        }
      }
    }
  });
}

// --- The fragment -----------------------------------------------------------

test('fragmentTarget: an entity ID on the chart, decoded; anything else is no target', () => {
  const ids = buildChart(committed()).ids;
  assert.equal(fragmentTarget('#project:sncf/client-referential', ids), 'project:sncf/client-referential');
  assert.equal(fragmentTarget('#client:sncf', ids), 'client:sncf');
  assert.equal(fragmentTarget('#project%3Asncf%2Fclient-referential', ids), 'project:sncf/client-referential', 'percent-encoded');
  for (const hash of ['#nope', '#%E0%A4%A', '#', '', 'project:sncf/client-referential', '#project:sncf', '#PROJECT:SNCF/CLIENT-REFERENTIAL']) {
    assert.equal(fragmentTarget(hash, ids), null, JSON.stringify(hash));
  }
});

/** A lookup that records every scroll asked of an element it hands out. */
function spyLookup(present: readonly string[]): { readonly lookup: (id: string) => { scrollIntoView(): void } | null; readonly scrolled: string[] } {
  const scrolled: string[] = [];
  const lookup = (id: string) => (present.includes(id) ? { scrollIntoView: () => void scrolled.push(id) } : null);
  return { lookup, scrolled };
}

test('landOnFragment: a chart Project or Client fragment scrolls it into view once per root; anything else scrolls nothing', () => {
  const ids = buildChart(committed()).ids;
  const everything = [...ids, 'nope'];
  // A Project, then a Client.
  for (const [hash, id] of [['#project:sncf/client-referential', 'project:sncf/client-referential'], ['#client:sncf', 'client:sncf']] as const) {
    const { lookup, scrolled } = spyLookup(everything);
    landOnFragment({}, hash, ids, lookup, new WeakSet());
    assert.deepEqual(scrolled, [id], `${hash} scrolls ${id} into view, once`);
  }
  // No target: unknown, malformed, bare, empty, even where the document holds an element by that id.
  for (const hash of ['#nope', '#%E0%A4%A', '#', '']) {
    const { lookup, scrolled } = spyLookup(everything);
    landOnFragment({}, hash, ids, lookup, new WeakSet());
    assert.deepEqual(scrolled, [], `${JSON.stringify(hash)} scrolls nothing`);
  }
  // A detached ref (null) scrolls nothing.
  {
    const { lookup, scrolled } = spyLookup(everything);
    landOnFragment(null, '#client:sncf', ids, lookup, new WeakSet());
    assert.deepEqual(scrolled, [], 'a null element scrolls nothing');
  }
  // A target the chart names but the document does not hold scrolls nothing, and does not throw.
  {
    const { lookup, scrolled } = spyLookup([]);
    landOnFragment({}, '#client:sncf', ids, lookup, new WeakSet());
    assert.deepEqual(scrolled, [], 'an absent element scrolls nothing');
  }
  // The same root attached twice lands once; another root lands on its own.
  {
    const { lookup, scrolled } = spyLookup(everything);
    const landed = new WeakSet<object>();
    const root = {};
    landOnFragment(root, '#client:sncf', ids, lookup, landed);
    landOnFragment(root, '#client:sncf', ids, lookup, landed);
    assert.deepEqual(scrolled, ['client:sncf'], 'a second attach of the same root does not scroll again');
    landOnFragment({}, '#client:sncf', ids, lookup, landed);
    assert.deepEqual(scrolled, ['client:sncf', 'client:sncf'], 'another root lands on its own');
  }
});

// --- Source scans -----------------------------------------------------------

/** The solve fields the chart never reads, `weight` with them (a tuning number, not shown). */
const FORBIDDEN_FIELDS = /\b(?:position|mass|luminanceBand|moteTier|orbitNormal|railDistance|weight)\b/;

/**
 * The only modules a render-fallback module may import: the shell's two pure
 * models and the panel's stylesheet, the tokens, and the directory's own. An
 * allowlist, so React, shell state or a scene-chrome sheet fails as surely as
 * the data, the solver, the scene, Three or the artifact.
 */
const PERMITTED_SPECIFIER = /^(?:\.\.\/shell\/(?:panel-model\.ts|chrome-model\.ts|focus-panel\.css)|\.\.\/tokens\/[\w.-]+|\.\/(?:chart-model\.ts|chart\.css))$/;

/** Every reason a render-fallback module breaks the directory's purity. */
function auditPurity(files: Readonly<Record<string, string>>): string[] {
  const failures: string[] = [];
  for (const [path, source] of Object.entries(files)) {
    const code = stripCommentsAndStrings(source);
    const field = FORBIDDEN_FIELDS.exec(code);
    if (field !== null) failures.push(`${path} reads ${field[0]} — the chart's layout is timeAxis alone`);
    const kept = stripComments(source);
    for (const [, specifier] of kept.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g)) {
      if (!PERMITTED_SPECIFIER.test(specifier as string)) failures.push(`${path} imports ${specifier}`);
    }
    if (/canvas/i.test(code)) failures.push(`${path} draws a canvas`);
  }
  return failures;
}

function chartFiles(): Record<string, string> {
  return Object.fromEntries(
    sourceFilesUnder(DIR)
      .filter((path) => !isTestFile(path))
      .map((path) => [relative(DIR, path).split(sep).join('/'), readFileSync(path, 'utf8').replace(/\r\n/g, '\n')]),
  );
}

test('purity: render-fallback reads no solve field, reaches no data, derive, scene, colophon, react-dom, Three or artifact import, draws no canvas', () => {
  const files = chartFiles();
  assert.deepEqual(Object.keys(files).sort(), ['chart-model.ts', 'chart.tsx'], 'the walk reaches both modules');
  assert.deepEqual(auditPurity(files), []);
});

test('purity: each reach added to the real modules fails', () => {
  const files = chartFiles();
  const cases: readonly (readonly [string, (source: string) => string, RegExp])[] = [
    ['chart-model.ts', (s) => s.replace('export function buildChart', 'export const at = (p: { position: number }) => p.position;\nexport function buildChart'), /reads position/],
    ['chart-model.ts', (s) => s.replace('export function buildChart', 'export const heavy = (p: { mass: number }) => p.mass;\nexport function buildChart'), /reads mass/],
    ['chart.tsx', (s) => s.replace('export default function Chart', 'export const band = (p: { luminanceBand: string }) => p.luminanceBand;\nexport default function Chart'), /reads luminanceBand/],
    ['chart-model.ts', (s) => s.replace('export function buildChart', 'export const w = (c: { weight: number }) => c.weight;\nexport function buildChart'), /reads weight/],
    ['chart-model.ts', (s) => `import { CareerSchema } from '../data/schema.ts';\n${s}`, /imports \.\.\/data\/schema\.ts/],
    ['chart-model.ts', (s) => `import { solve } from '../derive/solve.ts';\n${s}`, /imports \.\.\/derive\/solve\.ts/],
    ['chart.tsx', (s) => `import { Scene } from '../render-scene/scene.tsx';\n${s}`, /imports \.\.\/render-scene\/scene\.tsx/],
    ['chart.tsx', (s) => `const later = () => import('../render-scene/scene.tsx');\n${s}`, /imports \.\.\/render-scene\/scene\.tsx/],
    ['chart.tsx', (s) => `import { Vector3 } from 'three';\n${s}`, /imports three/],
    ['chart.tsx', (s) => `import { Canvas } from '@react-three/fiber';\n${s}`, /imports @react-three\/fiber/],
    ['chart.tsx', (s) => `import { createPortal } from 'react-dom';\n${s}`, /imports react-dom$/m],
    ['chart.tsx', (s) => `import { createRoot } from 'react-dom/client';\n${s}`, /imports react-dom\/client/],
    ['chart.tsx', (s) => `import Colophon from '../colophon/colophon.tsx';\n${s}`, /imports \.\.\/colophon\/colophon\.tsx/],
    ['chart-model.ts', (s) => `const later = () => import('../colophon/colophon.tsx');\n${s}`, /imports \.\.\/colophon\/colophon\.tsx/],
    ['chart-model.ts', (s) => `import artifact from '../../generated/layout.generated.json';\n${s}`, /imports \.\.\/\.\.\/generated\/layout\.generated\.json/],
    ['chart.tsx', (s) => s.replace('<svg ', '<canvas />\n        <svg '), /draws a canvas/],
    // Outside the permitted modules, though no denylist names them: React itself
    // (the chart's JSX runtime is the compiler's), shell state, a scene-chrome sheet.
    ['chart.tsx', (s) => `import { useEffect } from 'react';\n${s}`, /imports react$/m],
    ['chart.tsx', (s) => `import { useNavigation } from '../shell/state.ts';\n${s}`, /imports \.\.\/shell\/state\.ts/],
    ['chart.tsx', (s) => `import '../shell/index-nav.css';\n${s}`, /imports \.\.\/shell\/index-nav\.css/],
    ['chart-model.ts', (s) => `import { surfaceOf } from '../shell/router.ts';\n${s}`, /imports \.\.\/shell\/router\.ts/],
  ];
  for (const [path, mutate, message] of cases) {
    const mutated = { ...files, [path]: mutate(files[path] as string) };
    assert.notEqual(mutated[path], files[path], `the mutation ${String(message)} must apply`);
    assert.match(auditPurity(mutated).join('\n'), message);
  }
  // Prose and string content are not reads.
  assert.deepEqual(auditPurity({ 'x.ts': "// the reading position\nexport const s = 'mass';\n" }), []);
  // Every permitted module stays permitted.
  const permitted = ['../shell/panel-model.ts', '../shell/chrome-model.ts', '../shell/focus-panel.css', '../tokens/tokens.ts', './chart-model.ts', './chart.css'];
  assert.deepEqual(auditPurity({ 'x.ts': permitted.map((specifier) => `import '${specifier}';`).join('\n') }), []);
});

test('label widths: a type role is read in px and em, and any other unit is refused', () => {
  assert.deepEqual(labelTypeOf({ fontSize: '12px', letterSpacing: '0.12em' }), { size: 12, tracking: 0.12 });
  assert.deepEqual(labelTypeOf({ fontSize: '11px', letterSpacing: '-0.02em' }), { size: 11, tracking: -0.02 });
  for (const token of [
    { fontSize: '0.75rem', letterSpacing: '0.12em' },
    { fontSize: '12', letterSpacing: '0.12em' },
    { fontSize: '12px', letterSpacing: '1px' },
    { fontSize: '12px', letterSpacing: 'normal' },
  ]) {
    assert.throws(() => labelTypeOf(token), /px.*em|em.*px/, `${token.fontSize} / ${token.letterSpacing} is refused`);
  }
});

test('the plates draw 1:1: chart.css holds each plate’s svg at its viewBox width', () => {
  const css = readFileSync(join(DIR, 'chart.css'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(css, new RegExp(`\\.chart-plate-across svg \\{\\n  min-width: ${ACROSS.width}px;\\n  max-width: ${ACROSS.width}px;\\n\\}`), 'the across plate is held at its width');
  assert.match(css, new RegExp(`\\.chart-plate-down svg \\{\\n  max-width: ${DOWN.width}px;`), 'the down plate is capped at its width');
  assert.match(css, new RegExp(`\\.chart-index-notable \\{\\n  width: ${INDEX_GLYPH.size}px;\\n\\}`), 'the Notable cell asks for the index glyph’s width');
});

/**
 * Every rule `chart.tsx` would hold of its own: an ordering, a filter, an `if`
 * or a conditional operator. The `switch` on a block's, a reading's or a run's
 * `kind` is allowed: it is the mapping itself, one case per kind the model
 * emits, each drawing that kind's markup, and it decides nothing the model has
 * not already decided.
 */
function auditThin(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const failures: string[] = [];
  if (/\.sort\(/.test(code)) failures.push('chart.tsx sorts — order is the model’s');
  if (/\.filter\(/.test(code)) failures.push('chart.tsx filters — what is drawn is the model’s');
  if (/\?/.test(code)) failures.push('chart.tsx holds a ?, ?? or ?. — a branch is the model’s');
  if (/&&/.test(code)) failures.push('chart.tsx holds && — a branch is the model’s');
  if (/\|\|/.test(code)) failures.push('chart.tsx holds || — a branch is the model’s');
  if (/\bif\s*\(/.test(code)) failures.push('chart.tsx holds an if — a branch is the model’s');
  return failures;
}

test('chart.tsx is a mapping: no sort, filter, if, ternary, ??, && or ||', () => {
  const real = readFileSync(CHART_TSX, 'utf8').replace(/\r\n/g, '\n');
  assert.deepEqual(auditThin(real), []);
  const cases: readonly (readonly [(source: string) => string, RegExp])[] = [
    [(s) => s.replace('chart.rows.map(', '[...chart.rows].sort().map('), /sorts/],
    [(s) => s.replace('chart.rows.map(', 'chart.rows.filter(Boolean).map('), /filters/],
    [(s) => s.replace('{row.role}', '{row.role === "" ? null : row.role}'), /holds a \?/],
    [(s) => s.replace('{row.role}', '{row.role ?? null}'), /holds a \?/],
    [(s) => s.replace('{row.role}', '{row.role !== "" && row.role}'), /holds &&/],
    [(s) => s.replace('{row.role}', '{row.role || null}'), /holds \|\|/],
    [(s) => s.replace('export default function Chart({ artifact }: ChartProps) {', 'export default function Chart({ artifact }: ChartProps) {\n  if (artifact.clients.length === 0) return null;'), /holds an if/],
  ];
  for (const [mutate, message] of cases) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation ${String(message)} must apply`);
    assert.match(auditThin(mutated).join('\n'), message);
  }
});

test('chart.tsx draws the model: the h1 identity line, the plates aria-hidden, the record anchors', () => {
  const code = stripComments(readFileSync(CHART_TSX, 'utf8'));
  assert.match(code, /export\s+default\s+function\s+Chart\(\s*\{\s*artifact\s*\}/, 'a default export for lazy()');
  assert.match(code, /<h1 className="chart-heading">\{IDENTITY_LINE\}<\/h1>/);
  assert.equal((code.match(/<h1\b/g) ?? []).length, 1, 'one <h1>');
  assert.match(code, /<section key=\{section\.id\} id=\{section\.id\}/, 'a Client section carries its entity ID');
  assert.match(code, /<h2 className="chart-client">\{section\.name\}<\/h2>/);
  assert.match(code, /<article id=\{record\.id\}/, 'a record carries its entity ID');
  assert.match(code, /<h3 className="panel-title">\{block\.text\}<\/h3>/);
  assert.equal((code.match(/aria-hidden="true"/g) ?? []).length, 2, 'the plate wrapper, once, rendered for both plates; and the legend');
  assert.match(code, /<a href=\{row\.href\}>/);
  assert.match(
    code,
    /ref=\{\(element\) => landOnFragment\(element, window\.location\.hash, chart\.ids, \(id\) => document\.getElementById\(id\), landed\)\}/,
    'the fragment read on mount, through the model, in one call',
  );
  assert.match(
    code,
    /<span>\{dates\.start\}<\/span> – <span>\{dates\.end\}<\/span>/,
    'the separator is unconditional and a null end renders nothing, so an ongoing engagement reads `2024-02 – `',
  );
  assert.equal((code.match(/<Dates dates=/g) ?? []).length, 2, 'the index row and the record fields both draw Dates');
  assert.match(code, /^import '\.\.\/shell\/focus-panel\.css';$/m);
  // The Deep/Shallow signal (4.4): the Notable column first, its glyph an image named by the model, the legend after both plates.
  const headers = [...code.matchAll(/<th scope="col">\{(\w+\.\w+)\}<\/th>/g)].map((match) => match[1]);
  assert.deepEqual(headers, ['CHART_LABELS.notable', 'CHART_LABELS.client', 'CHART_LABELS.project', 'FIELD_LABELS.role', 'CHART_LABELS.dates'], 'Notable, Client, Project, Role, Dates');
  assert.match(code, /<tr key=\{row\.id\}>\s*<td className="chart-index-notable">\s*<svg className="chart-glyph" viewBox=\{INDEX_GLYPH\.viewBox\} width=\{INDEX_GLYPH\.size\} height=\{INDEX_GLYPH\.size\} role="img" aria-label=\{row\.notable\.label\} focusable="false">\s*<Glyph glyph=\{INDEX_GLYPH\} kind=\{row\.notable\.kind\} \/>/, 'the first cell of each row: the glyph, an image named by the model');
  assert.match(code, /switch \(kind\) \{\s*case 'ring':[\s\S]*?className="chart-marker"[\s\S]*?className="chart-ring"[\s\S]*?case 'plain':[\s\S]*?className="chart-marker"/, 'ring versus plain is the model’s kind, mapped by switch, reusing the plate’s classes');
  assert.match(code, /<PlateView plate=\{chart\.down\} className="chart-plate chart-plate-down" \/>\s*<div className="chart-legend" aria-hidden="true">\s*\{chart\.legend\.map\(/, 'the legend once, after both plates, before the table, aria-hidden');
  assert.match(code, /<div className="chart-legend" aria-hidden="true">[\s\S]*?<\/div>\s*<table className="chart-index">/, 'the legend sits above the table');
  assert.equal((code.match(/className="chart-ring"/g) ?? []).length, 1, 'one ring mapping, used by the index glyph and the legend alike');
  assert.doesNotMatch(code, /isDeep|content\.notable|row\.notable\b(?!\.)/, 'the renderer reads no isDeep and no notable: the kind is the model’s');
  assert.deepEqual(auditGlyphMarkup(code), []);
});

/**
 * What `chart.tsx` must hold of the Deep/Shallow glyph: `No notable` announced
 * and never drawn, the legend's phrases and the glyph's names reaching the DOM
 * only through the model, and the glyph's radii and the legend's kind bound to
 * the model's values rather than written in.
 */
function auditGlyphMarkup(code: string): string[] {
  const failures: string[] = [];
  const spoken = /CHART_LABELS\.(none|carries|doesNot)\b/.exec(code);
  if (spoken !== null) failures.push(`chart.tsx names CHART_LABELS.${spoken[1]} — it reaches the DOM only through row.notable.label or entry.text`);
  const ring = /case 'ring':([\s\S]*?)case 'plain':([\s\S]*?)\n {2}\}/.exec(code);
  if (ring === null) failures.push('chart.tsx maps no ring and plain case');
  const [ringCase, plainCase] = [ring?.[1] ?? '', ring?.[2] ?? ''];
  if (!/<circle className="chart-marker" cx=\{glyph\.centre\} cy=\{glyph\.centre\} r=\{glyph\.markerR\} \/>\s*<circle className="chart-ring" cx=\{glyph\.centre\} cy=\{glyph\.centre\} r=\{glyph\.ringR\} \/>/.test(ringCase)) {
    failures.push('chart.tsx: the ring glyph is not the marker at glyph.markerR inside the Ring at glyph.ringR');
  }
  if (!/^\s*return <circle className="chart-marker" cx=\{glyph\.centre\} cy=\{glyph\.centre\} r=\{glyph\.markerR\} \/>;\s*$/.test(plainCase)) {
    failures.push('chart.tsx: the plain glyph is not the marker alone at glyph.markerR');
  }
  if (!/<Glyph glyph=\{LEGEND_GLYPH\} kind=\{entry\.kind\} \/>\s*<\/svg>\s*<span>\{entry\.text\}<\/span>/.test(code)) failures.push('chart.tsx: a legend entry does not draw the model’s kind and text');
  if (!/<Glyph glyph=\{INDEX_GLYPH\} kind=\{row\.notable\.kind\} \/>/.test(code)) failures.push('chart.tsx: an index glyph does not draw the model’s kind');
  if ((code.match(/row\.notable\.label/g) ?? []).length !== 1 || !/aria-label=\{row\.notable\.label\}/.test(code)) {
    failures.push('chart.tsx: row.notable.label is not the glyph’s aria-label alone — its name is announced, never drawn');
  }
  if ((code.match(/<Glyph /g) ?? []).length !== 2) failures.push('chart.tsx: a Glyph beyond the index and the legend — the records carry no ring');
  return failures;
}

test('chart.tsx glyph markup: each binding replaced fails with its own line', () => {
  const code = stripComments(readFileSync(CHART_TSX, 'utf8').replace(/\r\n/g, '\n'));
  assert.deepEqual(auditGlyphMarkup(code), []);
  const cases: readonly (readonly [(source: string) => string, RegExp])[] = [
    [(s) => s.replace('<span>{entry.text}</span>', '<span>{entry.text}</span>\n            <span>{CHART_LABELS.none}</span>'), /names CHART_LABELS\.none/],
    [(s) => s.replace('<span>{entry.text}</span>', '<span>{CHART_LABELS.doesNot}</span>'), /names CHART_LABELS\.doesNot/],
    [(s) => s.replace('aria-label={row.notable.label}', 'aria-label={CHART_LABELS.carries}'), /names CHART_LABELS\.carries/],
    [(s) => s.replace('<circle className="chart-marker" cx={glyph.centre} cy={glyph.centre} r={glyph.markerR} />\n          <circle className="chart-ring"', '<circle className="chart-marker" cx={glyph.centre} cy={glyph.centre} r={glyph.ringR} />\n          <circle className="chart-ring"'), /the ring glyph is not/],
    [(s) => s.replace('<circle className="chart-ring" cx={glyph.centre} cy={glyph.centre} r={glyph.ringR} />', '<circle className="chart-ring" cx={glyph.centre} cy={glyph.centre} r={glyph.markerR} />'), /the ring glyph is not/],
    [(s) => s.replace('return <circle className="chart-marker" cx={glyph.centre} cy={glyph.centre} r={glyph.markerR} />;', 'return <circle className="chart-marker" cx={glyph.centre} cy={glyph.centre} r={glyph.ringR} />;'), /the plain glyph is not/],
    [(s) => s.replace('<Glyph glyph={LEGEND_GLYPH} kind={entry.kind} />', '<Glyph glyph={LEGEND_GLYPH} kind="ring" />'), /a legend entry does not draw/],
    [(s) => s.replace('<Glyph glyph={INDEX_GLYPH} kind={row.notable.kind} />', '<Glyph glyph={INDEX_GLYPH} kind="plain" />'), /an index glyph does not draw/],
    [(s) => s.replace('<td className="chart-index-client">{row.client}</td>', '<td className="chart-index-client">{row.client} <span>{row.notable.label}</span></td>'), /row\.notable\.label is not the glyph’s aria-label alone/],
    [(s) => s.replace('<h3 className="panel-title">{block.text}</h3>', '<h3 className="panel-title">{block.text}</h3>\n          <svg><Glyph glyph={INDEX_GLYPH} kind="ring" /></svg>'), /a Glyph beyond the index and the legend/],
  ];
  for (const [mutate, message] of cases) {
    const mutated = mutate(code);
    assert.notEqual(mutated, code, `the mutation ${String(message)} must apply`);
    assert.match(auditGlyphMarkup(mutated).join('\n'), message);
  }
  assert.match(code, /^import '\.\/chart\.css';$/m);
});
