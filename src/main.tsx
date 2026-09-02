import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Placeholder mount. Story 1.7+ replaces this with the real shell entry
// (detection + dynamic import); nothing here is load-bearing.
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
