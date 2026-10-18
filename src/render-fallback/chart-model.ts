/**
 * The flat star chart as a pure model (4.3): what the chart draws, in what
 * order, and where. Every rule an acceptance criterion names lives here, for the
 * reason `src/shell/index-model.ts` gives: `node --test` cannot load a `.tsx`
 * file, so `chart.tsx` is kept a mapping thin enough that reading it suffices,
 * and `chart-model.test.ts` scans it for anything that would be a rule of its own.
 *
 * **Time is the axis, and the only thing read from the solve.** Layout uses each
 * entity's `timeAxis` scalar (1 is the present, 0 the earliest engagement) and
 * nothing else the solver wrote: the 3D placement, the Body's size and band, the
 * Mote tier and the orbit are the scene's, and a chart reading them would be a
 * second projection of the scene rather than a chart of the career.
 *
 * - **Across** (desktop): one row per Client, present on the left —
 *   `x = past − t·(past − present)` — so reading left to right walks backward
 *   in time, as the scene's scroll does. The Star sits `starOffset` left of its
 *   newest marker (a Client's `timeAxis` is its newest Project's, so drawn at
 *   its own `t` it would cover that marker); its name above it; the baseline
 *   hairline from the Star to the oldest marker; each Project label below its
 *   marker on a leader, alternating two depths by in-row index so neighbours
 *   in one row never share a line.
 * - **Down** (phone): the same chart transposed. Client stems stacked present
 *   first; each stem a Star and its name, then its Projects at a fixed step,
 *   labels running right and wrapped to the plate's width.
 *
 * Every Project marker is one size and one class: no Deep/Shallow mark, no
 * ring (story 4.4), and no year marks (date navigation is story 4.5).
 *
 * **The records are the scene panel's** (AD-3). Each Project's blocks are
 * `buildPanel(artifact, id).blocks` minus the release button, so the kicker, the
 * reading position — the Notable on a Deep Project, `EDITORIAL_RULE` on a
 * Shallow one, branched on `isDeep` inside `buildPanel` — the field table and
 * the Skills are the panel's to the character. The dates ride beside them as
 * authored: `start` and `end`, `end` `null` while ongoing, drawn as two
 * elements so an ongoing engagement draws nothing after its separator.
 *
 * **Pure.** No React, no DOM, no artifact import: the document arrives as an
 * argument (`App` passes it through `src/shell/fallback-host.tsx`), and the
 * label widths are estimated from the type tokens, never measured.
 */

import { buildPanel, type PanelArtifact, type PanelArtifactClient, type PanelArtifactProject, type PanelBlock } from '../shell/panel-model.ts';
import { tokens } from '../tokens/tokens.ts';

/** The chart's own visible copy: the index table's headers (Role is `FIELD_LABELS.role`). */
export const CHART_LABELS = { client: 'Client', project: 'Project', dates: 'Dates' } as const;

/** A Project as the chart reads it: the panel's slice, plus its time-axis scalar and its dates. */
export interface ChartArtifactProject extends PanelArtifactProject {
  readonly timeAxis: number;
  readonly content: PanelArtifactProject['content'] & {
    readonly duration: { readonly start: string; readonly end: string | null };
  };
}

export interface ChartArtifactClient extends PanelArtifactClient {
  readonly timeAxis: number;
  readonly projects: readonly ChartArtifactProject[];
}

/** The slice of the artifact the chart reads, restated structurally; it extends the panel's. */
export interface ChartArtifact extends PanelArtifact {
  readonly clients: readonly ChartArtifactClient[];
}

/** A record's block: the scene panel's, without the release button. */
export type RecordBlock = Exclude<PanelBlock, { readonly kind: 'release' }>;

/** An engagement's dates as authored; `end` is `null` while it is ongoing. */
export interface ChartDates {
  readonly start: string;
  readonly end: string | null;
}

/** One Project's full record. */
export interface ChartRecord {
  readonly id: string;
  readonly blocks: readonly RecordBlock[];
  readonly dates: ChartDates;
}

/** One Client's section of records. */
export interface ChartSection {
  readonly id: string;
  readonly name: string;
  readonly records: readonly ChartRecord[];
}

/** One row of the index table. */
export interface IndexRow {
  readonly id: string;
  /** The record's anchor: `#` and the entity ID, so a fragment names an entity. */
  readonly href: string;
  readonly client: string;
  readonly title: string;
  readonly role: string;
  readonly dates: ChartDates;
}

/** A hairline: a baseline (across), a stem (down) or a leader. */
export interface PlateLine {
  readonly key: string;
  readonly entity: string;
  readonly className: 'chart-baseline' | 'chart-stem' | 'chart-leader';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** A Star, its core dot, or a Project marker. */
export interface PlateCircle {
  readonly key: string;
  readonly entity: string;
  readonly className: 'chart-star' | 'chart-star-core' | 'chart-marker';
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

/** One line of a label, with its estimated width and its font size (for the box). */
export interface PlateLabel {
  readonly key: string;
  readonly entity: string;
  readonly className: 'chart-label-client' | 'chart-label-project';
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle';
  readonly text: string;
  readonly width: number;
  readonly size: number;
}

/** One plate, in viewBox units, in drawing order: lines, then marks, then labels. */
export interface Plate {
  readonly width: number;
  readonly height: number;
  readonly viewBox: string;
  readonly lines: readonly PlateLine[];
  readonly circles: readonly PlateCircle[];
  readonly labels: readonly PlateLabel[];
}

/** The whole chart. */
export interface ChartModel {
  readonly across: Plate;
  readonly down: Plate;
  readonly rows: readonly IndexRow[];
  readonly sections: readonly ChartSection[];
  /** Every entity a fragment may name: the Clients, then the Projects, in reading order. */
  readonly ids: readonly string[];
}

/** The across plate's frame (viewBox units). */
export const ACROSS = { width: 1160, present: 260, past: 1120, top: 64, rowStep: 110, starOffset: 44, edge: 8 } as const;

/** The down plate's frame (viewBox units). */
export const DOWN = { width: 350, stemX: 40, top: 32, edge: 8, firstStep: 46, projectStep: 40, lineStep: 16, clientGap: 60 } as const;

/** The Star's ring, its core dot, and the one Project marker radius. */
export const STAR_R = 11;
export const CORE_R = 1.7;
export const MARKER_R = 7;

/** The across plate's two label depths below the row, as baselines; the first Project takes the deeper. */
const LABEL_DEPTHS = [52, 34] as const;

/**
 * An estimate of a glyph's advance, in ems, before letter-spacing. Generous for
 * Helvetica's mixed case, so an estimate errs wide and a label kept inside the
 * plate by it stays inside when drawn.
 */
const CHAR_EM = 0.6;

/** A type role's size and tracking, in viewBox units (the plate is drawn about 1:1). */
interface LabelType {
  readonly size: number;
  readonly tracking: number;
}

const typeOf = (role: 'scene-label-client' | 'scene-label-project'): LabelType => ({
  size: Number.parseFloat(tokens.typography[role].fontSize),
  tracking: Number.parseFloat(tokens.typography[role].letterSpacing),
});

const CLIENT_TYPE = typeOf('scene-label-client');
const PROJECT_TYPE = typeOf('scene-label-project');

/** A string's estimated width in a type role. */
function widthOf(text: string, type: LabelType): number {
  return round([...text].length * type.size * (CHAR_EM + type.tracking));
}

/** One decimal: the plate's coordinates, without float noise. */
const round = (value: number): number => Math.round(value * 10) / 10;

const clamp = (value: number, low: number, high: number): number => Math.min(Math.max(value, low), high);

/** Present first: `timeAxis` descending, ties by ID ascending. */
function byPresent(a: { readonly id: string; readonly timeAxis: number }, b: { readonly id: string; readonly timeAxis: number }): number {
  if (a.timeAxis !== b.timeAxis) return b.timeAxis - a.timeAxis;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

interface Ordered {
  readonly client: ChartArtifactClient;
  readonly projects: readonly ChartArtifactProject[];
}

/** The artifact in reading order, present to past, without reordering it in place. */
function ordered(artifact: ChartArtifact): Ordered[] {
  return [...artifact.clients].sort(byPresent).map((client) => ({ client, projects: [...client.projects].sort(byPresent) }));
}

const isRecordBlock = (block: PanelBlock): block is RecordBlock => block.kind !== 'release';

/** A Project's record: the scene panel's blocks without release, and its dates. */
function recordOf(artifact: ChartArtifact, project: ChartArtifactProject): ChartRecord {
  const panel = buildPanel(artifact, project.id);
  if (panel === null) throw new Error(`the chart could not build the record of ${project.id}`);
  return { id: project.id, blocks: panel.blocks.filter(isRecordBlock), dates: project.content.duration };
}

/** The across plate: one row per Client, time running left (present) to right (past). */
export function acrossPlate(artifact: ChartArtifact): Plate {
  const { width, present, past, top, rowStep, starOffset, edge } = ACROSS;
  const xAt = (t: number): number => round(past - t * (past - present));
  const lines: PlateLine[] = [];
  const circles: PlateCircle[] = [];
  const labels: PlateLabel[] = [];
  const rows = ordered(artifact);
  const centred = (entity: string, className: PlateLabel['className'], at: number, y: number, text: string, type: LabelType): PlateLabel => {
    const labelWidth = widthOf(text, type);
    const x = round(clamp(at, edge + labelWidth / 2, width - edge - labelWidth / 2));
    return { key: `${className}:${entity}`, entity, className, x, y, anchor: 'middle', text, width: labelWidth, size: type.size };
  };
  rows.forEach(({ client, projects }, row) => {
    const y = top + row * rowStep;
    const newest = projects[0];
    const oldest = projects[projects.length - 1];
    const starX = round(xAt(newest === undefined ? client.timeAxis : newest.timeAxis) - starOffset);
    const endX = oldest === undefined ? starX : xAt(oldest.timeAxis);
    lines.push({ key: `chart-baseline:${client.id}`, entity: client.id, className: 'chart-baseline', x1: starX, y1: y, x2: endX, y2: y });
    circles.push({ key: `chart-star:${client.id}`, entity: client.id, className: 'chart-star', cx: starX, cy: y, r: STAR_R });
    circles.push({ key: `chart-star-core:${client.id}`, entity: client.id, className: 'chart-star-core', cx: starX, cy: y, r: CORE_R });
    labels.push(centred(client.id, 'chart-label-client', starX, y - STAR_R - 10, client.name, CLIENT_TYPE));
    projects.forEach((project, index) => {
      const x = xAt(project.timeAxis);
      const baseline = y + LABEL_DEPTHS[index % 2 === 0 ? 0 : 1];
      circles.push({ key: `chart-marker:${project.id}`, entity: project.id, className: 'chart-marker', cx: x, cy: y, r: MARKER_R });
      lines.push({ key: `chart-leader:${project.id}`, entity: project.id, className: 'chart-leader', x1: x, y1: y + MARKER_R + 3, x2: x, y2: baseline - PROJECT_TYPE.size - 2 });
      labels.push(centred(project.id, 'chart-label-project', x, baseline, project.content.project, PROJECT_TYPE));
    });
  });
  const height = top + Math.max(rows.length - 1, 0) * rowStep + LABEL_DEPTHS[0] + 24;
  return { width, height, viewBox: `0 0 ${width} ${height}`, lines, circles, labels };
}

/** A label's text broken into lines no wider than `room`, greedily by word; a word wider than `room` keeps a line of its own. */
function wrap(text: string, type: LabelType, room: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter((part) => part !== '')) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (current !== '' && widthOf(candidate, type) > room) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current !== '') lines.push(current);
  return lines;
}

/** The down plate: the across plate transposed — Client stems stacked, time running down. */
export function downPlate(artifact: ChartArtifact): Plate {
  const { width, stemX, top, edge, firstStep, projectStep, lineStep, clientGap } = DOWN;
  const lines: PlateLine[] = [];
  const circles: PlateCircle[] = [];
  const labels: PlateLabel[] = [];
  const clientX = stemX + STAR_R + 10;
  const projectX = stemX + MARKER_R + 18;
  const label = (entity: string, className: PlateLabel['className'], x: number, y: number, text: string, type: LabelType, index: number): PlateLabel => ({
    key: `${className}:${entity}:${index}`,
    entity,
    className,
    x,
    y,
    anchor: 'start',
    text,
    width: widthOf(text, type),
    size: type.size,
  });
  let cursor: number = top;
  let bottom: number = top;
  for (const { client, projects } of ordered(artifact)) {
    const starY = cursor;
    const name = wrap(client.name, CLIENT_TYPE, width - edge - clientX);
    name.forEach((text, index) => labels.push(label(client.id, 'chart-label-client', clientX, starY + 4 + index * 15, text, CLIENT_TYPE, index)));
    circles.push({ key: `chart-star:${client.id}`, entity: client.id, className: 'chart-star', cx: stemX, cy: starY, r: STAR_R });
    circles.push({ key: `chart-star-core:${client.id}`, entity: client.id, className: 'chart-star-core', cx: stemX, cy: starY, r: CORE_R });
    let y = starY + firstStep + (name.length - 1) * 15;
    let last = starY;
    let lastLines = 1;
    for (const project of projects) {
      const text = wrap(project.content.project, PROJECT_TYPE, width - edge - projectX);
      circles.push({ key: `chart-marker:${project.id}`, entity: project.id, className: 'chart-marker', cx: stemX, cy: y, r: MARKER_R });
      lines.push({ key: `chart-leader:${project.id}`, entity: project.id, className: 'chart-leader', x1: stemX + MARKER_R + 3, y1: y, x2: projectX - 5, y2: y });
      text.forEach((line, index) => labels.push(label(project.id, 'chart-label-project', projectX, y + 4 + index * lineStep, line, PROJECT_TYPE, index)));
      last = y;
      lastLines = text.length;
      y += Math.max(projectStep, (text.length - 1) * lineStep + projectStep);
    }
    lines.unshift({ key: `chart-stem:${client.id}`, entity: client.id, className: 'chart-stem', x1: stemX, y1: starY, x2: stemX, y2: last });
    bottom = last + (lastLines - 1) * lineStep + 24;
    cursor = last + (lastLines - 1) * lineStep + clientGap;
  }
  const height = bottom;
  return { width, height, viewBox: `0 0 ${width} ${height}`, lines, circles, labels };
}

/** The chart for an artifact: both plates, the index rows and the records, present to past. */
export function buildChart(artifact: ChartArtifact): ChartModel {
  const order = ordered(artifact);
  const sections: ChartSection[] = order.map(({ client, projects }) => ({
    id: client.id,
    name: client.name,
    records: projects.map((project) => recordOf(artifact, project)),
  }));
  const rows: IndexRow[] = order.flatMap(({ client, projects }) =>
    projects.map((project) => ({
      id: project.id,
      href: `#${project.id}`,
      client: client.name,
      title: project.content.project,
      role: project.content.role,
      dates: project.content.duration,
    })),
  );
  return {
    across: acrossPlate(artifact),
    down: downPlate(artifact),
    rows,
    sections,
    ids: [...sections.map((section) => section.id), ...rows.map((row) => row.id)],
  };
}

/**
 * The entity a location's fragment names, when it is one the chart draws:
 * `#` and an ID, percent-decoded. Anything else — no fragment, a bare `#`, an
 * ID the chart does not hold, a malformed escape that fails to decode — is no
 * target, and nothing scrolls.
 */
export function fragmentTarget(hash: string, ids: readonly string[]): string | null {
  if (!hash.startsWith('#')) return null;
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
  return ids.includes(id) ? id : null;
}

/** What the chart scrolls into view: an element, as `document.getElementById` returns it. */
export interface Landable {
  scrollIntoView(): void;
}

/**
 * The landing on a fragment, decided once per chart root: when `root` is
 * attached (not `null`) and not already in `landed`, it is marked, and the
 * entity `hash` names — by `fragmentTarget` — is looked up and scrolled into
 * view. No target, or no element by that ID, scrolls nothing. Everything the
 * browser holds is injected (`hash`, `lookup`, `landed`), so the decision runs
 * under `node --test`; `chart.tsx`'s ref callback is one call to it, and
 * `landed` is what keeps a re-attached ref (a development double mount) from
 * scrolling twice.
 */
export function landOnFragment(root: object | null, hash: string, ids: readonly string[], lookup: (id: string) => Landable | null, landed: WeakSet<object>): void {
  if (root === null || landed.has(root)) return;
  landed.add(root);
  const target = fragmentTarget(hash, ids);
  if (target === null) return;
  lookup(target)?.scrollIntoView();
}
