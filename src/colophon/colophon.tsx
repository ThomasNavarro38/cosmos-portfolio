/**
 * The Colophon (4.2, 5.1, 5.2): the `/colophon` route's surface, reached only through
 * `lazy(() => import('./colophon.tsx'))` in `src/shell/colophon-host.tsx`, so it
 * is its own chunk and never on the entry graph or the scene's.
 *
 * **The exhibits, fetched** (5.1, AD-17). The default `Colophon` fetches the two
 * raw files the build publishes — `/career.json`, then `/layout.generated.json`
 * (`exhibits.ts`, `scripts/exhibits.ts`) — once, in an effect whose whole body
 * is `startExhibits` (executed in `exhibits.test.ts`; this file is audited in
 * `colophon.test.ts`), its stop aborting on unmount, so a visitor who leaves
 * mid-fetch causes no state update. A failed fetch is logged once and draws nothing more: the
 * `<h1>` alone, nothing thrown into React, no loading indicator and no retry. An
 * abort is swallowed silently.
 *
 * `ColophonPage` draws: the `<h1>`, then, once the files have arrived, each
 * file's text verbatim in its own `<pre>`, career first. The `<pre>`s are
 * deliberately unset in 5.1 — no name, no measure, no syntax setting; 5.3 owns
 * their treatment.
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
 * `DERIVATION_LABELS` alone; no other copy (5.3–5.5).
 *
 * It imports React, `exhibits.ts`, `derivations.ts` and `colophon.css`, and
 * nothing else: not the shell, not the motion preference, never `src/data/`,
 * `generated/` or `src/derive/`.
 */

import { useEffect, useState } from 'react';
import { startExhibits, type Exhibits } from './exhibits.ts';
import { DERIVATION_LABELS, derivationRows, type DerivationInput } from './derivations.ts';
import './colophon.css';

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

/** The surface as drawn: the heading, and, once the files have arrived, the two files with the derivations between them. */
export function ColophonPage({ exhibits }: { readonly exhibits: Exhibits | null }) {
  return (
    <>
      <h1>the model</h1>
      {exhibits === null ? null : (
        <>
          <pre>{exhibits.career}</pre>
          <Derivations layout={exhibits.layout} />
          <pre>{exhibits.layout}</pre>
        </>
      )}
    </>
  );
}

export default function Colophon() {
  const [exhibits, setExhibits] = useState<Exhibits | null>(null);
  useEffect(() => startExhibits(fetch, setExhibits, (error) => console.error('the colophon could not load its exhibits.', error)), []);
  return <ColophonPage exhibits={exhibits} />;
}
