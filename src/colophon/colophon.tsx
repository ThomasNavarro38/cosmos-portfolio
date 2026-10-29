/**
 * The Colophon (4.2, 5.1, 5.2, 5.3, 5.4, 5.5): the `/colophon` route's surface, reached only through
 * `lazy(() => import('./colophon.tsx'))` in `src/shell/colophon-host.tsx`, so it
 * is its own chunk and never on the entry graph or the scene's.
 *
 * **The exhibits, fetched** (5.1, AD-17). The default `Colophon` fetches the two
 * raw files the build publishes — `/career.json`, then `/layout.generated.json`
 * (`exhibits.ts`, `scripts/exhibits.ts`) — once, in an effect whose whole body
 * is `startExhibits` (executed in `exhibits.test.ts`; this file is audited in
 * `colophon.test.ts`), its stop aborting on unmount, so a visitor who leaves
 * mid-fetch causes no state update. A failed fetch is logged once and draws nothing more: the
 * chrome row alone, nothing thrown into React, no loading indicator and no retry. An
 * abort is swallowed silently.
 *
 * `ColophonPage` draws: the chrome row, then, once the files have arrived, each
 * file's text verbatim and in full in its own `<pre>`, career first.
 *
 * **The chrome row** (Epic 5 item 38, ruling (a) 2026-10-23), the chart's
 * mirrored, drawn unconditionally — before the exhibits arrive, and when they
 * never do: a `div.colophon-chrome` holding the `<h1>` (`h1.colophon-chrome-heading`,
 * `IDENTITY_NAME`, ` · ` and `IDENTITY_MODEL`: the identity line, `the model`
 * unlinked because it is this page), the contact route directly after it, and
 * the route line opposite (`p.colophon-routes`): the `links` prop's routes, each
 * an `<a href>` whose click is the link's own `follow`, joined by ` · ` —
 * `the scene · the chart` on a capable machine, `the chart` alone otherwise.
 * The links are built by `src/shell/colophon-host.tsx` (`colophonLinks`), so
 * this file reads no router, store or machine surface; their type is declared
 * here structurally, as `chart-model.ts` declares `ChartLinks`, with React's
 * own `MouseEvent` as the click so no click rule is restated in a `.tsx` file.
 *
 * **The exhibits, set** (5.3, DESIGN.md `components.colophon-json`). Each
 * `<pre>` is a named, keyboard-scrollable region — `role="region"`, its
 * `aria-label` the file's name read off `EXHIBIT_PATHS` (`career.json`,
 * `layout.generated.json`), `tabIndex={0}` — since a bare `<pre>` is generic
 * and cannot be named, and a box that scrolls sideways must be reachable from
 * the keyboard. Its text is `jsonRuns` (`json-setting.ts`): key runs in
 * `span.colophon-json-key`, scalar value runs in `span.colophon-json-value`,
 * structure as bare text — spans marked over the bytes, never a parse, so the
 * `<pre>`'s text content is the fetched file exactly, with no fold and no
 * truncation. The luminance setting, the raised ground and the mono family
 * are `colophon.css`'s.
 *
 * **The derivations** (5.2). Between the two `<pre>`s, a real `<table>`: one
 * row per mapping rule, each worked on the artifact's first Project, its input
 * and its derived value read from the layout text by `derivationRows`
 * (`derivations.ts`) — nothing recomputed, nothing authored here. Column
 * headers are `th scope="col"` and each row's rule a `th scope="row"`, so a
 * value cell is announced with both. Numbers are drawn as `String(value)`; an
 * ongoing duration draws `{start} –`, as the chart's dates do. A layout the
 * rows cannot be read from throws, naming the field, into the
 * `colophon-host` error boundary. The treatment (DESIGN.md
 * `components.colophon-derivation`) is `colophon.css`'s. The table's copy is
 * `DERIVATION_LABELS` alone: the exhibits are named by their files' names,
 * with no visible heading or caption.
 *
 * **What is not there** (5.4, FR-21, UX-DR53). After the layout `<pre>`, an
 * `<h2>` (`ABSENCES_HEADING`) and one `<p className="colophon-prose">` per
 * entry of `ABSENCES` (`absences.ts`), in order — the ruled copy, verbatim,
 * and the page's only prose. It is drawn with the exhibits and never without
 * them: every sentence points at "the files above". No `<section>`, no
 * landmark beyond the host's `<main>`.
 *
 * **The live re-solve** (5.5, FR-21, rulings Q1–Q5 (a)). Last, drawn only with
 * the exhibits: an `h2.colophon-heading` (`LIVE_SOLVE.heading`), one
 * `p.colophon-prose` (`LIVE_SOLVE.framing`, the ruled framing) and a
 * `button.colophon-solve` of type `button` (`LIVE_SOLVE.action`), marked
 * `aria-disabled` while a run is in flight — never `disabled`, which would
 * drop keyboard focus from the button just pressed. Pressing it hands
 * `exhibits.career`, the text already on the page (no second fetch), to the
 * tracker `createLiveSolve` (`live-solve.ts`, executed in `live-solve.test.ts`),
 * built once with this file's one dynamic import,
 * `import('../derive/live.ts')` — the solver's own lazy chunk, requested on
 * the press and never before — and this component's two setters. A press while
 * a run is in flight is ignored there. The solved text is held in this
 * component's state alone and drawn in full as a third exhibit, named
 * `LIVE_SOLVE.result`; no store, no shell module and no renderer reads it, so
 * the committed `layout.generated.json` stays the only layout the scene reads.
 * A new run's stop replaces the old one, and the unmount calls the tracker's
 * stop; a success replaces the previous result; a failure is logged once with
 * `console.error` and leaves the page as it was. No loading indicator, no
 * motion, no live region, and no other copy.
 *
 * **The contact route** (6.3): `ContactRoute`, the shell's shared component
 * (`src/shell/contact-route.tsx`, in the `ui` chunk, so the colophon chunk
 * still holds `src/colophon/` alone), drawn directly after the `<h1>`, before
 * the route line, inside the chrome row.
 *
 * It imports React, `exhibits.ts`, `derivations.ts`, `json-setting.ts`,
 * `absences.ts`, `live-solve.ts`, `../shell/chrome-model.ts` (the identity's
 * two words, in the `ui` chunk), `../shell/contact-route.tsx` and
 * `colophon.css`, and nothing else: no other shell module — never the router,
 * `route-link.ts` or detection — not the motion
 * preference, never `src/data/` or `generated/`, and
 * `src/derive/` only through the one dynamic import of `live.ts`, never
 * statically.
 */

import { Fragment, useEffect, useState, type MouseEvent } from 'react';
import { EXHIBIT_PATHS, startExhibits, type Exhibits } from './exhibits.ts';
import { DERIVATION_LABELS, derivationRows, type DerivationInput } from './derivations.ts';
import { jsonRuns } from './json-setting.ts';
import { ABSENCES, ABSENCES_HEADING } from './absences.ts';
import { LIVE_SOLVE, createLiveSolve } from './live-solve.ts';
import { IDENTITY_MODEL, IDENTITY_NAME } from '../shell/chrome-model.ts';
import { ContactRoute } from '../shell/contact-route.tsx';
import './colophon.css';

/** One link on the route line, as the shell builds it: its key, its text, its `href`, and its click. */
export interface ColophonLink {
  readonly key: string;
  readonly text: string;
  readonly href: string;
  readonly follow: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/** The Colophon's links: its route line — `the scene` where this machine is capable, then `the chart`. */
export interface ColophonLinks {
  readonly routes: readonly ColophonLink[];
}

/** A rule's input: the weight as `String(weight)`, or the duration as `start – end`, `start –` while ongoing. */
function Input({ input }: { readonly input: DerivationInput }) {
  if ('weight' in input) return <>{String(input.weight)}</>;
  if (input.end === null) return <>{input.start} –</>;
  return (
    <>
      {input.start} – {input.end}
    </>
  );
}

/** The three rules, worked on the artifact's first Project, each value read from the layout text. */
function Derivations({ layout }: { readonly layout: string }) {
  return (
    <table className="colophon-derivations">
      <thead>
        <tr>
          <th scope="col">{DERIVATION_LABELS.rule}</th>
          <th scope="col">{DERIVATION_LABELS.project}</th>
          <th scope="col">{DERIVATION_LABELS.input}</th>
          <th scope="col">{DERIVATION_LABELS.output}</th>
        </tr>
      </thead>
      <tbody>
        {derivationRows(layout).map((row) => (
          <tr key={row.rule}>
            <th scope="row">{row.rule}</th>
            <td>{row.project}</td>
            <td>
              <Input input={row.input} />
            </td>
            <td className="colophon-derived">{String(row.output)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * One file, verbatim and in full: a named, focusable region whose text is the
 * file's runs — keys and scalar values in their spans, structure bare.
 */
function Exhibit({ name, text }: { readonly name: string; readonly text: string }) {
  return (
    <pre className="colophon-exhibit" role="region" aria-label={name} tabIndex={0}>
      {jsonRuns(text).map((run, index) => {
        if (run.kind === 'key') return <span key={index} className="colophon-json-key">{run.text}</span>;
        if (run.kind === 'value') return <span key={index} className="colophon-json-value">{run.text}</span>;
        return run.text;
      })}
    </pre>
  );
}

/** What the live re-solve hands the page: the solved text, whether a run is in flight, and the press. */
export interface LiveSolveState {
  readonly solved: string | null;
  readonly running: boolean;
  readonly onSolve: () => void;
}

/**
 * The surface as drawn: one `div.colophon` — the page's column, the chart's
 * `.chart` mirrored (D-G6, Epic 5 item 39) — holding the chrome row — the
 * heading, the contact route and the route line — and, once the files have
 * arrived, the two files with the derivations between them, what is not there, the live
 * re-solve's heading, framing and button, and its result once a run has
 * succeeded.
 */
export function ColophonPage({ links, exhibits, solved, running, onSolve }: { readonly links: ColophonLinks; readonly exhibits: Exhibits | null } & LiveSolveState) {
  return (
    <div className="colophon">
      <div className="colophon-chrome">
        <h1 className="colophon-chrome-heading">{IDENTITY_NAME} · {IDENTITY_MODEL}</h1>
        <ContactRoute />
        <p className="colophon-routes">
          {links.routes.map((link, index) => (
            <Fragment key={link.key}>
              {index === 0 ? null : ' · '}
              <a href={link.href} onClick={link.follow}>
                {link.text}
              </a>
            </Fragment>
          ))}
        </p>
      </div>
      {exhibits === null ? null : (
        <>
          <Exhibit name={EXHIBIT_PATHS.career.slice(1)} text={exhibits.career} />
          <Derivations layout={exhibits.layout} />
          <Exhibit name={EXHIBIT_PATHS.layout.slice(1)} text={exhibits.layout} />
          <h2 className="colophon-heading">{ABSENCES_HEADING}</h2>
          {Object.entries(ABSENCES).map(([key, text]) => (
            <p key={key} className="colophon-prose">
              {text}
            </p>
          ))}
          <h2 className="colophon-heading">{LIVE_SOLVE.heading}</h2>
          <p className="colophon-prose">{LIVE_SOLVE.framing}</p>
          <button type="button" className="colophon-solve" aria-disabled={running} onClick={onSolve}>
            {LIVE_SOLVE.action}
          </button>
          {solved === null ? null : <Exhibit name={LIVE_SOLVE.result} text={solved} />}
        </>
      )}
    </div>
  );
}

export default function Colophon({ links }: { readonly links: ColophonLinks }) {
  const [exhibits, setExhibits] = useState<Exhibits | null>(null);
  const [solved, setSolved] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => startExhibits(fetch, setExhibits, (error) => console.error('the colophon could not load its exhibits.', error)), []);
  const [live] = useState(() => createLiveSolve(() => import('../derive/live.ts'), { setSolved, setRunning, log: (error) => console.error('the colophon could not solve career.json here.', error) }));
  useEffect(() => () => live.stop(), [live]);
  const onSolve = () => {
    if (exhibits !== null) live.press(exhibits.career);
  };
  return <ColophonPage links={links} exhibits={exhibits} solved={solved} running={running} onSolve={onSolve} />;
}
