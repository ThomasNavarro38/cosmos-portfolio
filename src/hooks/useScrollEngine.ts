import { useEffect, useRef } from 'react';
import { useStore } from '../engine/store';

/**
 * Hook to track window scroll and update scrollProgress in the Zustand store.
 * Uses requestAnimationFrame for high-performance updates.
 */
export const useScrollEngine = () => {
  const setScrollProgress = useStore((state) => state.setScrollProgress);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (rafId.current) return;

      rafId.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        
        // Prevent division by zero if content is shorter than viewport
        const progress = docHeight > 0 ? Math.min(Math.max(scrollTop / docHeight, 0), 1) : 0;
        
        setScrollProgress(progress);
        rafId.current = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [setScrollProgress]);
};
