import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// The mount, and only the mount. `App` renders the DOM destination index
// synchronously from the committed artifact, so the index is in the document at
// First Paint. Capability detection and the dynamic renderer import arrive in
// `src/shell/entry.ts` later; nothing here may become a 3D entry point, because
// a static import of a renderer would hoist Three onto this chunk (AD-7).
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
