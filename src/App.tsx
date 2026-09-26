/**
 * The app root.
 *
 * It renders the DOM destination index and nothing else, and it does so from the
 * committed artifact, statically imported — so the index is in the document at
 * First Paint, before any 3D chunk has been asked for, let alone loaded. That
 * ordering is the story's point (AD-4): an accessible surface retrofitted after
 * the canvas produces an inverted architecture, and the inversion stays
 * invisible until assistive technology meets it.
 *
 * `generated/layout.generated.json` resolves outside `src/`, so importing it
 * crosses no declared boundary — `src/shell/` names it explicitly as a permitted
 * static import, and the entry stub's own rule bans only `src/data/` and
 * `src/derive/`. Nothing here reaches either.
 *
 * **Do not grow this file.** The shell's entry, capability detection and dynamic
 * renderer import belong in `src/shell/`; this stays a mount point.
 */

import artifact from '../generated/layout.generated.json';
import { DestinationNav } from './shell/index-nav.tsx';

export function App() {
  // The artifact is JSON, so its inferred type is structural rather than the
  // schema's. `DestinationNav` asks only for the five fields the index reads,
  // and TypeScript checks the document against that here — the one place the
  // artifact and the shell meet. The schema stays the single declaration of the
  // document's shape; `src/shell/` may not import it (AD-3), and a `derive/`
  // import for a type alone would be exactly the edge the boundary gate forbids.
  return (
    <main>
      <DestinationNav artifact={artifact} />
    </main>
  );
}
