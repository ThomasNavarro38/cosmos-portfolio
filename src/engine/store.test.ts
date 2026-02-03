import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../engine/store';

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      hoveredId: null,
      activeId: null,
      scrollProgress: 0,
      resumeData: null,
      isLoading: false,
      error: null,
    });
  });

  it('should initialize with default values', () => {
    const state = useStore.getState();
    expect(state.hoveredId).toBeNull();
    expect(state.activeId).toBeNull();
    expect(state.scrollProgress).toBe(0);
  });

  it('should update hoveredId', () => {
    useStore.getState().setHoveredId('test-id');
    expect(useStore.getState().hoveredId).toBe('test-id');
  });

  it('should update activeId', () => {
    useStore.getState().setActiveId('test-id');
    expect(useStore.getState().activeId).toBe('test-id');
  });

  it('should update scrollProgress', () => {
    useStore.getState().setScrollProgress(0.5);
    expect(useStore.getState().scrollProgress).toBe(0.5);
  });

  it('should generate proxy ID correctly', () => {
    const id = useStore.getState().generateProxyId('React / TypeScript');
    expect(id).toBe('react-/-typescript');
  });
});
