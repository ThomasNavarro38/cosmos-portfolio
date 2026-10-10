import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The design tokens as custom properties on `:root`, once, and ahead of `App` so
// they precede every DOM stylesheet it imports (AD-12). Values only — it styles
// no element. `panel-model.test.ts` holds the import.
import './tokens/tokens.css';
import { App } from './App';

// The mount, and only the mount. `App` renders the DOM destination index
// synchronously from the committed artifact, so the index is in the document at
// First Paint. Capability detection and the dynamic renderer import arrive in
// `src/shell/entry.ts` later; a static import of a renderer here would hoist
// Three onto this chunk (AD-7), so a renderer must be reached only through
// `src/shell/`.
//
// That last part is a convention here, not yet a gate. `ROOT_RULE`
// (`derive/boundaries.ts`) bans `src/data/` and `src/derive/` from the entry
// stub — the two bans `README.md:45` declares — and the rule table states
// nothing the prose does not, deliberately. A `dynamicOnly` rule for the
// renderers belongs with the story that introduces the first one, together with
// the README sentence that would license it.
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
