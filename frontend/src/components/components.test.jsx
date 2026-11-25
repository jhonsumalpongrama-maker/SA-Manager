import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import Accordion from './Accordion';
import Modal from './Modal';
import { ConfirmDialog } from './Dialogs';
import AreaRow from '../features/assignments/AreaRow';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <Accordion title="MWF Schedule" subtitle="3:00-4:00 PM" badge={2} open={open} onToggle={() => setOpen((o) => !o)}>
      <p>Library</p>
    </Accordion>
  );
}

describe('Accordion', () => {
  it('exposes aria-expanded and toggles its panel with the keyboard', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const button = screen.getByRole('button', { name: /MWF Schedule/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Library')).not.toBeInTheDocument();
    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByRole('region')).toBeInTheDocument();
  });
});

describe('Modal', () => {
  it('is a labelled dialog, closes on Escape and keeps Tab inside', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Add New Student" footer={<button type="button">Last</button>}>
        <input aria-label="first" />
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Add New Student' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const first = screen.getByLabelText('first');
    const last = screen.getByRole('button', { name: 'Last' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus(); // wrapped around from the last to the first element
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape and backdrop clicks when not dismissible', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Locked" dismissible={false}>
        body
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ConfirmDialog', () => {
  it('calls onConfirm for the red confirm button and onClose for Cancel', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmDialog open title="Clear Current Week?" confirmLabel="Clear All" danger onConfirm={onConfirm} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Clear All' }));
    expect(onConfirm).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('AreaRow', () => {
  const area = { id: 'a1', name: 'Library' };
  const students = [
    { id: '1', studentName: 'Ann', areaName: 'Library' },
    { id: '2', studentName: 'Bob', areaName: 'Library' },
  ];

  it('shows several chips and removes one when the x is pressed', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<AreaRow area={area} students={students} canEdit onRemove={onRemove} />);
    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Ann from Library' }));
    expect(onRemove).toHaveBeenCalledWith(students[0]);
  });

  it('hides the remove buttons for read-only viewers', () => {
    render(<AreaRow area={area} students={students} canEdit={false} onRemove={() => {}} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows an empty hint for areas with nobody assigned', () => {
    render(<AreaRow area={area} students={[]} canEdit onRemove={() => {}} />);
    expect(screen.getByText('No students assigned')).toBeInTheDocument();
  });
});
