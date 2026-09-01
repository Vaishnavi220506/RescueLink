import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RequestForm } from './Requests';

describe('request form', () => {
  it('submits a detailed help request from the modal', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RequestForm open onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Short title'), { target: { value: 'Need transport to shelter' } });
    fireEvent.change(screen.getByLabelText('What is happening?'), { target: { value: 'Two people need a safe ride away from the flooded street.' } });
    fireEvent.change(screen.getByLabelText('Area or landmark'), { target: { value: 'Adyar bridge' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form') as HTMLFormElement);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Need transport to shelter', peopleAffected: 1, contactPreference: 'IN_APP' })));
  });
});
