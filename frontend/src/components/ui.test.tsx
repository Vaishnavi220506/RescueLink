import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './ui';

describe('shared UI', () => {
  it('fires button actions and preserves the accessible name', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Request help</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Request help' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
