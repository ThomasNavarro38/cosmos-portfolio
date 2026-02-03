import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import App from './App.tsx'
import { useStore } from './engine/store'

const Root = () => {
  const loadResumeData = useStore(state => state.loadResumeData);

  useEffect(() => {
    loadResumeData();
  }, [loadResumeData]);

  return <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
