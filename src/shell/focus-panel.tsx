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
 *   - **Two selector subscriptions** — `focusedProjectId`, and the flight key
 *     (`flightKey`: the mode, plus the target in free flight) — never the whole
 *     store, so the Rail's sixty progress writes a second re-render nothing.
 *   - **A ref for the last shown Project**, so the panel keeps its content while
 *     it slides out after release. Reading the store alone, it would empty the
 *     moment Focus clears and slide out blank.
 *   - **An effect applying `focusMove`** — DOM focus is a side effect, and it has
 *     to run after the panel is visible: on entry to the panel container
 *     (`tabindex="-1"`, labelled by its `<h2>` — and only once there is one,
 *     so the label never points at an `id` not yet in the document), on release back to the released
 *     Project's own index entry (UX-DR40) — the one the visitor was reading,
 *     whether Focus came from the index, a Planet click or a move from another
 *     Project. Unless the release travelled: a Client, the overview or a Star
 *     releases Focus and changes the flight key in the same batched render, and
 *     then DOM focus stays on the door the visitor took. So the effect also
 *     remembers the flight key it last saw, a ref beside the previous ID.
 *   - **The outgoing layer** (2.8): on `A → B`, `crossFade` names A, and A's
 *     blocks render once more in a layer over B's — `aria-hidden`, `inert`, no
 *     `id` on its title. The leaving ID is kept in a ref, written only on a render
 *     where the store's ID differs from the one the focus effect last recorded,
 *     so it is the same however often React repeats that render, and it survives
 *     any later re-render until the next Focus change. `leavingAfter` keeps it
 *     through a release, so a fade still running finishes as the panel slides
 *     out; entry clears it — the layer is never unmounted mid-fade.
 *   - **A layout effect for the cross-fade**, so it starts before the first paint
 *     of the swapped content: it fades the incoming layer in and the outgoing
 *     one out on `crossFadeTiming`, scrolls the outgoing layer to where the reader
 *     was in A, and only then returns the panel to its top for B. The reading
 *     position is tracked by a passive `scroll` listener rather than read after
 *     the swap, because by then the browser may have clamped it to B's length.
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

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useStore } from 'zustand/react';
import {
  FOCUS_PANEL_ID,
  FOCUS_PANEL_TITLE_ID,
  buildPanel,
  crossFade,
  crossFadeLayerStyle,
  crossFadeTiming,
  flightKey,
  focusMove,
  indexEntryId,
  leavingAfter,
  panelStyle,
  type PanelArtifact,
  type PanelBlock,
} from './panel-model.ts';
import { navigationStore, releaseFocus } from './state.ts';

/** What the panel needs: the artifact, and nothing else. */
export interface FocusPanelProps {
  readonly artifact: PanelArtifact;
}

/** The panel column. Always in the document; hidden, and out of the tab order, while closed. */
export function FocusPanel({ artifact }: FocusPanelProps) {
  const focusedProjectId = useStore(navigationStore, (state) => state.focusedProjectId);
  const flight = useStore(navigationStore, (state) => flightKey(state));
  const shown = useRef<string | null>(null);
  if (focusedProjectId !== null) shown.current = focusedProjectId;
  const panel = buildPanel(artifact, shown.current);
  const container = useRef<HTMLElement>(null);
  const previous = useRef<string | null>(null);
  const leavingId = useRef<string | null>(null);
  if (focusedProjectId !== previous.current) leavingId.current = leavingAfter(leavingId.current, previous.current, focusedProjectId);
  const leaving = buildPanel(artifact, leavingId.current);
  const incoming = useRef<HTMLDivElement>(null);
  const outgoing = useRef<HTMLDivElement>(null);
  const scrolled = useRef(0);
  const previousFlight = useRef(flight);

  useLayoutEffect(() => {
    const fade = crossFade(previous.current, focusedProjectId);
    if (fade !== null && incoming.current !== null) {
      const timing = crossFadeTiming(getComputedStyle(incoming.current).opacity);
      incoming.current.animate(timing.incoming, timing.options);
      outgoing.current?.animate(timing.outgoing, timing.options);
      outgoing.current?.scrollTo({ top: scrolled.current });
    }
    if (focusMove(previous.current, focusedProjectId, flight !== previousFlight.current) === 'panel') container.current?.scrollTo({ top: 0 });
  }, [focusedProjectId]);

  useEffect(() => {
    const move = focusMove(previous.current, focusedProjectId, flight !== previousFlight.current);
    previous.current = focusedProjectId;
    previousFlight.current = flight;
    if (move === 'panel') {
      container.current?.focus({ preventScroll: true });
    } else if (move !== null) {
      document.getElementById(indexEntryId(move.entry))?.focus();
    }
  }, [focusedProjectId, flight]);

  useEffect(() => {
    const element = container.current;
    if (element === null) return undefined;
    const track = (): void => {
      scrolled.current = element.scrollTop;
    };
    element.addEventListener('scroll', track, { passive: true });
    return () => element.removeEventListener('scroll', track);
  }, []);

  return (
    <aside
      id={FOCUS_PANEL_ID}
      ref={container}
      tabIndex={-1}
      aria-labelledby={panel === null ? undefined : FOCUS_PANEL_TITLE_ID}
      style={panelStyle(focusedProjectId !== null && panel !== null)}
    >
      <div ref={incoming}>{panel === null ? null : <PanelBlocks blocks={panel.blocks} titleId={FOCUS_PANEL_TITLE_ID} />}</div>
      {leaving === null ? null : (
        <div ref={outgoing} aria-hidden="true" inert style={crossFadeLayerStyle()}>
          <PanelBlocks blocks={leaving.blocks} titleId={undefined} />
        </div>
      )}
    </aside>
  );
}

interface PanelBlocksProps {
  readonly blocks: readonly PanelBlock[];
  /** The title's `id`: the panel's, on the incoming layer only, so the label points at one `<h2>`. */
  readonly titleId: string | undefined;
}

/** One Project's blocks, in the model's order. */
function PanelBlocks({ blocks, titleId }: PanelBlocksProps) {
  return blocks.map((block) => {
    switch (block.kind) {
      case 'kicker':
        return <p key={block.kind}>{block.text}</p>;
      case 'title':
        return (
          <h2 key={block.kind} id={titleId}>
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
  });
}
