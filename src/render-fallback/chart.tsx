/**
 * The flat star chart, rendered (4.3): the surface every phone, every machine
 * without WebGL2 and every `/chart` visitor reads.
 *
 * **A mapping, and nothing else.** The order, both plates' geometry, the records
 * and the fragment rule live in `chart-model.ts`, which is pure and executed
 * under `node --test`. This file cannot be loaded by that runner (`.tsx`), so it
 * is kept thin enough that reading it suffices, and `chart-model.test.ts` scans
 * it: no sort, no filter, no conditional operator. `chart.test.ts` renders it
 * (`scripts/render.ts`) and holds its links and anchors in the markup.
 *
 * A conventional document, top to bottom: the chrome row — the `<h1>` (the
 * identity line, `the model` its link to the Colophon) and the route line
 * opposite it (`the scene` where this machine is capable, else nothing) — the
 * plate twice — across for a wide window, down for a narrow one, `chart.css`
 * showing one by width — the legend, the index table (Notable, Client, Project
 * as a link to its record, Role, Dates), then a `<section>` per Client (`<h2>`, its entity ID as
 * the `id`) holding an `<article>` per Project (its entity ID as the `id`, the
 * title an `<h3>`). The plates are `aria-hidden`: the table and the records
 * repeat every word they draw.
 *
 * **The Deep/Shallow signal** (4.4) is the model's, drawn three ways: the
 * plate's `chart-ring` circles; each index row's first cell, a
 * `svg` glyph of `role="img"`, named by `row.notable.label`; and that name. The
 * glyph maps `row.notable.kind` by `switch` — `ring` draws the marker and the
 * Ring, `plain` the marker alone — in the plate's own `chart-marker` and
 * `chart-ring` classes, so one rule colours both. The legend (the same glyph at
 * the plate's size, beside each phrase) sits once under the plates and is
 * `aria-hidden`: it decodes the `aria-hidden` plate, and the Notable column
 * already carries the signal for assistive technology.
 *
 * The records mirror the scene panel's markup (`src/shell/focus-panel.tsx`) and
 * take its classes from `focus-panel.css`, so the voice, the lift and the rule
 * line read identically on both surfaces. The dates are a fourth row of the
 * field table: `start`, the separator, `end` — two elements, so an ongoing
 * engagement's `null` end draws nothing.
 *
 * **The links** (4.5) are the `links` prop, built by `src/shell/fallback-host.tsx`
 * from the router and the machine's surface, each `{ key, text, href, follow }`:
 * an `<a href>` whose click is the link's own `follow`. The chart imports no
 * router or store and reads no machine surface; which links exist, where they
 * go and which clicks they keep are decided before they arrive. The heading's
 * text is `IDENTITY_NAME`, ` · ` and `the model`: the identity line.
 *
 * **The fragment** is read once, when the chart is attached: a ref callback —
 * the commit-time hook that needs no import from `react`, which would tie this
 * chunk to the mount's — makes one call to the model's `landOnFragment`,
 * handing it the element, `location.hash`, the chart's IDs,
 * `document.getElementById` and the module's `WeakSet` of landed roots. The
 * decision is the model's and is executed by `chart-model.test.ts`: a Client or
 * Project the fragment names is scrolled into view, anything else scrolls
 * nothing, and a re-attached ref (a development double mount) does not scroll
 * twice.
 */

import { IDENTITY_NAME } from '../shell/chrome-model.ts';
import { FIELD_LABELS, type PanelReading, type PanelRun } from '../shell/panel-model.ts';
import {
  CHART_LABELS,
  INDEX_GLYPH,
  LEGEND_GLYPH,
  buildChart,
  landOnFragment,
  type ChartArtifact,
  type ChartDates,
  type ChartLinks,
  type ChartRecord,
  type Glyph as GlyphFrame,
  type NotableKind,
  type Plate,
  type RecordBlock,
} from './chart-model.ts';
import '../shell/focus-panel.css';
import './chart.css';

/** The chart roots already landed on, so the fragment is honoured once per chart. */
const landed = new WeakSet<object>();

/** What the chart needs: the artifact, passed by `App` through the fallback host, and its links, built there. */
export interface ChartProps {
  readonly artifact: ChartArtifact;
  readonly links: ChartLinks;
}

export default function Chart({ artifact, links }: ChartProps) {
  const chart = buildChart(artifact);
  return (
    <div className="chart" ref={(element) => landOnFragment(element, window.location.hash, chart.ids, (id) => document.getElementById(id), landed)}>
      <div className="chart-chrome">
        <h1 className="chart-heading">
          {IDENTITY_NAME} · <a href={links.model.href} onClick={links.model.follow}>{links.model.text}</a>
        </h1>
        <p className="chart-routes">
          {links.routes.map((link) => (
            <a key={link.key} href={link.href} onClick={link.follow}>
              {link.text}
            </a>
          ))}
        </p>
      </div>
      <PlateView plate={chart.across} className="chart-plate chart-plate-across" />
      <PlateView plate={chart.down} className="chart-plate chart-plate-down" />
      <div className="chart-legend" aria-hidden="true">
        {chart.legend.map((entry) => (
          <div key={entry.kind} className="chart-legend-entry">
            <svg className="chart-glyph" viewBox={LEGEND_GLYPH.viewBox} width={LEGEND_GLYPH.size} height={LEGEND_GLYPH.size} focusable="false">
              <Glyph glyph={LEGEND_GLYPH} kind={entry.kind} />
            </svg>
            <span>{entry.text}</span>
          </div>
        ))}
      </div>
      <table className="chart-index">
        <thead>
          <tr>
            <th scope="col">{CHART_LABELS.notable}</th>
            <th scope="col">{CHART_LABELS.client}</th>
            <th scope="col">{CHART_LABELS.project}</th>
            <th scope="col">{FIELD_LABELS.role}</th>
            <th scope="col">{CHART_LABELS.dates}</th>
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((row) => (
            <tr key={row.id}>
              <td className="chart-index-notable">
                <svg className="chart-glyph" viewBox={INDEX_GLYPH.viewBox} width={INDEX_GLYPH.size} height={INDEX_GLYPH.size} role="img" aria-label={row.notable.label} focusable="false">
                  <Glyph glyph={INDEX_GLYPH} kind={row.notable.kind} />
                </svg>
              </td>
              <td className="chart-index-client">{row.client}</td>
              <td className="chart-index-project">
                <a href={row.href}>{row.title}</a>
              </td>
              <td className="chart-index-role">{row.role}</td>
              <td className="chart-index-dates">
                <Dates dates={row.dates} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {chart.sections.map((section) => (
        <section key={section.id} id={section.id} className="chart-section">
          <h2 className="chart-client">{section.name}</h2>
          {section.records.map((record) => (
            <Record key={record.id} record={record} />
          ))}
        </section>
      ))}
    </div>
  );
}

interface PlateViewProps {
  readonly plate: Plate;
  readonly className: string;
}

/** One plate: lines, then marks, then labels, every colour and stroke from `chart.css`. */
function PlateView({ plate, className }: PlateViewProps) {
  return (
    <div className={className} aria-hidden="true">
      <svg viewBox={plate.viewBox} focusable="false">
        {plate.lines.map((line) => (
          <line key={line.key} className={line.className} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
        ))}
        {plate.circles.map((circle) => (
          <circle key={circle.key} className={circle.className} cx={circle.cx} cy={circle.cy} r={circle.r} />
        ))}
        {plate.labels.map((label) => (
          <text key={label.key} className={label.className} x={label.x} y={label.y} textAnchor={label.anchor}>
            {label.text}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** A Project's mark as a glyph: the marker, and the Ring around it on a Deep one — the kind is the model's. */
function Glyph({ glyph, kind }: { readonly glyph: GlyphFrame; readonly kind: NotableKind }) {
  switch (kind) {
    case 'ring':
      return (
        <>
          <circle className="chart-marker" cx={glyph.centre} cy={glyph.centre} r={glyph.markerR} />
          <circle className="chart-ring" cx={glyph.centre} cy={glyph.centre} r={glyph.ringR} />
        </>
      );
    case 'plain':
      return <circle className="chart-marker" cx={glyph.centre} cy={glyph.centre} r={glyph.markerR} />;
  }
}

/** An engagement's dates: start, the separator, end — an ongoing end draws nothing. */
function Dates({ dates }: { readonly dates: ChartDates }) {
  return (
    <>
      <span>{dates.start}</span> – <span>{dates.end}</span>
    </>
  );
}

/** One Project's record: the scene panel's blocks, in its order. */
function Record({ record }: { readonly record: ChartRecord }) {
  return (
    <article id={record.id} className="chart-record">
      {record.blocks.map((block) => (
        <RecordBlockView key={block.kind} block={block} dates={record.dates} />
      ))}
    </article>
  );
}

function RecordBlockView({ block, dates }: { readonly block: RecordBlock; readonly dates: ChartDates }) {
  switch (block.kind) {
    case 'kicker':
      return <p className="panel-kicker">{block.text}</p>;
    case 'title':
      return <h3 className="panel-title">{block.text}</h3>;
    case 'reading':
      return (
        <div className="panel-reading">
          <Reading reading={block.reading} />
        </div>
      );
    case 'fields':
      return (
        <table className="panel-fields">
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">{CHART_LABELS.dates}</th>
              <td>
                <Dates dates={dates} />
              </td>
            </tr>
          </tbody>
        </table>
      );
    case 'skills':
      return (
        <ul className="panel-skills" aria-label="Skills">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
  }
}

/** The reading position: the Notable's paragraphs on a Deep Project, the rule line on a Shallow one. */
function Reading({ reading }: { readonly reading: PanelReading }) {
  switch (reading.kind) {
    case 'rule':
      return <p className="panel-rule">{reading.text}</p>;
    case 'notable':
      return reading.paragraphs.map((runs, index) => (
        <p key={index} className="panel-prose">
          {runs.map((run, at) => (
            <Run key={at} run={run} />
          ))}
        </p>
      ));
  }
}

/** One run of a paragraph: the lifted constraint sentence in `panel-lift`, any other as text. */
function Run({ run }: { readonly run: PanelRun }) {
  switch (run.lifted) {
    case true:
      return <span className="panel-lift">{run.text}</span>;
    case false:
      return run.text;
  }
}
