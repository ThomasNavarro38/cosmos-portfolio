import { create } from 'zustand';
import { type ResumeData, ResumeSchema } from '../schemas/resumeSchema';

interface AppState {
  // UI State
  ready: boolean;
  setReady: (ready: boolean) => void;
  
  // Data State
  resumeData: ResumeData | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadResumeData: () => Promise<void>;
}

const DEFAULT_RESUME_DATA: ResumeData = {
  contact: {
    name: "Thomas Navarro",
    title: "Cosmic Architect",
    email: "thomas@cosmos.dev",
    location: "The Astral Plane",
    socials: []
  },
  summary: "Logic and wonder in harmony.",
  skills: [],
  impactAreas: [],
  projects: []
};

export const useStore = create<AppState>((set) => ({
  ready: false,
  setReady: (ready) => set({ ready }),
  
  resumeData: null,
  isLoading: false,
  error: null,
  
  loadResumeData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}resume.json`);
      if (!response.ok) {
        throw new Error(`Failed to load resume data: ${response.statusText}`);
      }
      const rawData = await response.json();
      
      const validatedData = ResumeSchema.parse(rawData);
      
      set({ resumeData: validatedData, isLoading: false, ready: true });
    } catch (err: any) {
      console.error('Resume validation error:', err);
      
      // Fallback to default data instead of crashing/leaving empty if possible
      // But we still want to show the error state if it's a critical failure
      set({ 
        resumeData: DEFAULT_RESUME_DATA,
        error: err instanceof Error ? err.message : 'Unknown error during validation', 
        isLoading: false,
        ready: true // Mark as ready even with fallback
      });
    }
  },
}));
