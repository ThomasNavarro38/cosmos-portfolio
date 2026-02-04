import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import CosmosCanvas from './CosmosCanvas';
import React from 'react';

// Mock @react-three/fiber Canvas
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) => (
    <div data-testid="r3f-canvas" style={style}>{children}</div>
  ),
}));

// Mock @react-three/drei Preload
vi.mock('@react-three/drei', () => ({
  Preload: () => null,
  Cloud: () => null,
}));

// Mock Nebula component
vi.mock('./Nebula', () => ({
  default: () => <div data-testid="nebula-mock" />,
}));

// Mock CameraRail component
vi.mock('./CameraRail', () => ({
  default: () => <div data-testid="camera-rail-mock" />,
}));

describe('CosmosCanvas', () => {
  it('renders correctly and contains the canvas container', () => {
    const { getByTestId } = render(
      <CosmosCanvas>
        <div data-testid="child">Test</div>
      </CosmosCanvas>
    );
    
    expect(getByTestId('r3f-canvas')).toBeInTheDocument();
    expect(getByTestId('child')).toBeInTheDocument();
  });

  it('has correct CSS classes for full-screen background', () => {
    const { container } = render(<CosmosCanvas />);
    const div = container.firstChild as HTMLElement;
    
    expect(div).toHaveClass('fixed');
    expect(div).toHaveClass('inset-0');
    expect(div).toHaveClass('z-0');
    expect(div).toHaveAttribute('aria-hidden', 'true');
  });

  it('responds to resize implicitly through R3F Canvas styling', () => {
    const { getByTestId } = render(<CosmosCanvas />);
    const canvasContainer = getByTestId('r3f-canvas');
    
    // In our mock, Canvas is just a div receiving style.
    // In reality, R3F handles resize. 
    // We verify the container has full width/height style.
    expect(canvasContainer).toHaveStyle({ width: '100%', height: '100%' });
  });
});
