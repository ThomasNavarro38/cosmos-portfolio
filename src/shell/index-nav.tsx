/**
 * The DOM destination index, rendered.
 *
 * **A mapping, and nothing else.** Every rule the index obeys — the walk order,
 * the nesting, the accessible names, the Deep/Shallow text — lives in
 * `index-model.ts`, which is pure and fully tested. This file turns that model
 * into elements and makes no decision of its own: no sort, no filter, no state,
 * no re-derivation, no reach into render or camera state.
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
 * **Greybox.** No styling, no design token, no visual identity — Epic 3 dresses
 * this. Semantics only.
 */

import { buildDestinationIndex, type IndexArtifact } from './index-model.ts';

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
 * The buttons carry no handler yet. Story 2.2 owns navigation state and wires
 * selection to `entry.id`; this story owns the index existing, being reachable,
 * and being correctly ordered before any camera does.
 */
export function DestinationNav({ artifact }: DestinationNavProps) {
  const index = buildDestinationIndex(artifact);

  return (
    <nav aria-label="Destinations">
      <ul>
        {index.clients.map((client) => (
          <li key={client.id}>
            <button type="button">{client.name}</button>
            <ul>
              {client.projects.map((project) => (
                <li key={project.id}>
                  <button type="button">
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
