import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Stars from './Stars';

vi.mock('@react-three/drei', () => ({
  Stars: () => <div data-testid="drei-stars" />,
}));

describe('Stars', () => {
  it('renders the Drei Stars component', () => {
    const { getByTestId } = render(<Stars />);
    expect(getByTestId('drei-stars')).toBeInTheDocument();
  });
});
