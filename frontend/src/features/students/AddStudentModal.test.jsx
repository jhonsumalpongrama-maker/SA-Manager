import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddStudentModal from './AddStudentModal';

describe('AddStudentModal', () => {
  it('lists the three schedules and submits the typed name with the chosen schedule', async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn().mockResolvedValue({ ok: true });
    render(<AddStudentModal open onClose={() => {}} onAssign={onAssign} />);

    expect(screen.getByRole('dialog', { name: 'Add New Student' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'MWF 3:00-4:00 PM' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Everyday 7:00 PM+' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Monthly Cleaner' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Full Name'), '  Juan Dela Cruz ');
    await user.selectOptions(screen.getByLabelText('Select Schedule'), 'EVERYDAY');
    await user.click(screen.getByRole('button', { name: 'Assign' }));

    await waitFor(() => expect(onAssign).toHaveBeenCalledWith({ name: '  Juan Dela Cruz ', scheduleType: 'EVERYDAY' }));
  });

  it('shows the validation error returned by the caller and clears it when typing', async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn().mockResolvedValue({ ok: false, error: 'Full name is required.' });
    render(<AddStudentModal open onClose={() => {}} onAssign={onAssign} />);

    await user.click(screen.getByRole('button', { name: 'Assign' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Full name is required.');

    await user.type(screen.getByLabelText('Full Name'), 'A');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onClose from Cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddStudentModal open onClose={onClose} onAssign={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
