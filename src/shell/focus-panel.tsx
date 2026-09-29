/**
 * The Focus panel, rendered: a fixed column beside the scene that opens when a
 * Project is focused and closes when Focus is released.
 *
 * **A mapping, and nothing else.** Every rule the panel obeys — the block order,
 * Deep versus Shallow, the width, the slide and the moment it leaves the
 * accessibility tree, where DOM focus goes — lives in `panel-model.ts`, which is
 * pure and executed under `node --test`. This file cannot be loaded by that
 * runner at all (`.tsx`), so it is kept thin enough that reading it suffices, and
 * `panel-model.test.ts` scans it for anything that would be a rule of its own.
 *
 * What it holds, and why each is here rather than in the model:
 *
 *   - **One selector subscription** — `focusedProjectId`, never the whole store,
 *     so the Rail's sixty progress writes a second re-render nothing.
 *   - **A ref for the last shown Project**, so the panel keeps its content while
 *     it slides out after release. Reading the store alone, it would empty the
 *     moment Focus clears and slide out blank.
 *   - **An effect applying `focusMove`** — DOM focus is a side effect, and it has
 *     to run after the panel is visible: on entry to the panel container
 *     (`tabindex="-1"`, labelled by its `<h2>`), on release back to the index
 *     entry that opened it (UX-DR40).
 *
 * **No scrim, no backdrop, no modal** (UX-DR20). The panel paints its own column
 * and nothing else; the scene stays visible and interactive beside it. The
 * camera composes the Project into the free part of the canvas
 * (`src/render-scene/focus-model.ts`), on the same duration and curve as the
 * slide below.
 *
 * **Greybox.** Semantics and the slide only; typography, the Notable treatment
 * and the editorial rule are Epic 3's.
 */

import { useEffect, useRef } from 'react';
import { useStore } from 'zustand/react';
import {
  FOCUS_PANEL_ID,
  FOCUS_PANEL_TITLE_ID,
  buildPanel,
  focusMove,
  indexEntryId,
  panelStyle,
  type PanelArtifact,
} from './panel-model.ts';
import { navigationStore, releaseFocus } from './state.ts';

/** What the panel needs: the artifact, and nothing else. */
export interface FocusPanelProps {
  readonly artifact: PanelArtifact;
}

/** The panel column. Always in the document; hidden, and out of the tab order, while closed. */
export function FocusPanel({ artifact }: FocusPanelProps) {
  const focusedProjectId = useStore(navigationStore, (state) => state.focusedProjectId);
  const shown = useRef<string | null>(null);
  if (focusedProjectId !== null) shown.current = focusedProjectId;
  const panel = buildPanel(artifact, shown.current);
  const container = useRef<HTMLElement>(null);
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const move = focusMove(previous.current, focusedProjectId);
    previous.current = focusedProjectId;
    if (move === 'panel') {
      container.current?.scrollTo({ top: 0 });
      container.current?.focus({ preventScroll: true });
    } else if (move !== null) {
      document.getElementById(indexEntryId(move.entry))?.focus();
    }
  }, [focusedProjectId]);

  return (
    <aside
      id={FOCUS_PANEL_ID}
      ref={container}
      tabIndex={-1}
      aria-labelledby={FOCUS_PANEL_TITLE_ID}
      style={panelStyle(focusedProjectId !== null && panel !== null)}
    >
      {panel?.blocks.map((block) => {
        switch (block.kind) {
          case 'kicker':
            return <p key={block.kind}>{block.text}</p>;
          case 'title':
            return (
              <h2 key={block.kind} id={FOCUS_PANEL_TITLE_ID}>
                {block.text}
              </h2>
            );
          case 'reading':
            return (
              <div key={block.kind}>
                {block.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            );
          case 'fields':
            return (
              <table key={block.kind}>
                <tbody>
                  {block.rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case 'release':
            return (
              <button key={block.kind} type="button" className="panel-release" onClick={releaseFocus}>
                {block.label}
              </button>
            );
        }
      })}
    </aside>
  );
}
