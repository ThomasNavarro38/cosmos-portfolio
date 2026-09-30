/**
 * The DOM destination index, rendered.
 *
 * **A mapping, and nothing else.** Every rule the index obeys — the walk order,
 * the nesting, the accessible names, the Deep/Shallow text — lives in
 * `index-model.ts`, which is pure and fully tested. Every rule about *where the
 * visitor is* lives in `state.ts`, which is pure and fully tested. This file
 * turns the one into elements and hands events to the other, and makes no
 * decision of its own: no sort, no filter, no local state, no re-derivation, no
 * reach into render or camera state.
 *
 * The split is not stylistic. `node --test` under Node 24's built-in type
 * stripping cannot load a `.tsx` file in any position — `ERR_UNKNOWN_FILE_EXTENSION`
 * at module resolution, before any transform, so a `.ts` test cannot even import
 * this module. Adding a transform means adding dependencies to a set that is
 * deliberately closed at fifteen exactly-pinned versions. So the AC-bearing
 * logic lives where the runner can reach it, and what is left here is kept
 * trivial enough that reading it is sufficient verification. That residual is
 * ratcheted by a source scan in `index-model.test.ts`, which fails the moment
 * this file grows a rule.
 *
 * **The index is the store's first subscriber, and that is the point.** An
 * authority with no consumer is unfalsifiable: "the camera and the index are both
 * subscribers; neither owns the state" cannot be shown by a store alone. The
 * index is the consumer that already exists, so selection is wired to the named
 * events now and the camera joins the same surface later, symmetrically.
 *
 * It subscribes with a **selector**, never the whole store. `useStore(store, s =>
 * s.focusedProjectId)` re-renders this tree when Focus changes and not when the
 * camera writes `scrollProgress` sixty times a second.
 *
 * **Greybox.** No styling, no design token, no visual identity — Epic 3 dresses
 * this. Semantics only.
 */

import { useCallback, useRef } from 'react';
import { useStore } from 'zustand/react';
import { activateClient, activateProject, pullBack, returnToRail } from './activate.ts';
import { buildDestinationIndex, type IndexArtifact } from './index-model.ts';
import { indexEntryId } from './panel-model.ts';
import { navigationStore } from './state.ts';

/** What the index needs: the artifact, and nothing else. */
export interface DestinationNavProps {
  readonly artifact: IndexArtifact;
}

/**
 * A `<nav>` holding the Client → Projects walk, one `<button>` per destination.
 *
 * `<button>` rather than a link or a div-with-a-role: a destination is an action
 * inside this page, not a document to navigate to, and a real button is
 * focusable, activated by both Enter and Space, and announced as a button
 * without an ARIA attribute saying so. Nothing here sets `tabIndex`, so the tab
 * order is the document order, which is the model's order.
 *
 * The Deep/Shallow state is rendered as **text inside the button**, so it lands
 * in the accessible name rather than in an attribute a reader may never hear and
 * a marker nobody who cannot see can read.
 *
 * `aria-pressed` on the Project buttons carries Focus, and only Focus. It adds
 * state and touches the accessible name not at all — which is why it is allowed
 * where `aria-label` is banned: the announced name is still the title plus
 * Deep/Shallow, with "pressed" alongside it. Exactly one button can report
 * pressed, because the store holds exactly one `focusedProjectId`.
 *
 * Each Project button carries `id={indexEntryId(project.id)}` (2.7), so releasing
 * Focus can return DOM focus to the released Project's own entry (UX-DR40). The ID
 * is the model's, never composed here.
 *
 * **Every button is a door in `activate.ts`** (2.9), the same doors the scene's
 * picks call: a Client flies to its stop, a Project focuses (flying to its Client
 * first when already in free flight), `overview` pulls back to frame the whole
 * universe, and `↩ resume the journey` returns to the Rail where it was left. The
 * return button exists only while `mode === 'freeflight'`, read through a second
 * selector so a `scrollProgress` write re-renders nothing here either.
 *
 * Leaving free flight unmounts the return button, which would drop DOM focus to
 * `<body>` if the button held it. That happens on a click and on `Escape`
 * (2.10) alike, so it is handled where the unmount is, not in either handler: a
 * React 19 ref cleanup on the button hands DOM focus to `overview` — the button
 * beside it that stays, through the one `useRef` this renderer holds — exactly
 * when the button still has focus as it goes. The callback is stable
 * (`useCallback`, no dependencies), so its cleanup runs on unmount and never on a
 * re-render. Refs to elements, not copies of any state.
 */
export function DestinationNav({ artifact }: DestinationNavProps) {
  const index = buildDestinationIndex(artifact);
  const focusedProjectId = useStore(navigationStore, (state) => state.focusedProjectId);
  const mode = useStore(navigationStore, (state) => state.mode);
  const overview = useRef<HTMLButtonElement>(null);
  // Stable, so React calls its cleanup only when the button unmounts — an inline
  // callback would be cleaned up on every re-render and move focus spuriously.
  const handBack = useCallback(
    (button: HTMLButtonElement | null) => () => {
      if (button?.matches(':focus') === true) overview.current?.focus();
    },
    [],
  );

  return (
    <nav aria-label="Destinations">
      <button type="button" ref={overview} onClick={() => pullBack()}>
        overview
      </button>
      {mode === 'freeflight' ? (
        <button type="button" ref={handBack} onClick={() => returnToRail()}>
          ↩ resume the journey
        </button>
      ) : null}
      <ul>
        {index.clients.map((client) => (
          <li key={client.id}>
            <button type="button" onClick={() => activateClient(client.id)}>
              {client.name}
            </button>
            <ul>
              {client.projects.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    id={indexEntryId(project.id)}
                    aria-pressed={project.id === focusedProjectId}
                    onClick={() => activateProject(project.id, client.id)}
                  >
                    <span>{project.title}</span> <span>{project.depth}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
