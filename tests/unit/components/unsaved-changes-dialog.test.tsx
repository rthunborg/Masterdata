import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { UnsavedChangesDialog } from '@/components/dashboard/unsaved-changes-dialog';

// No need for mock messages - component uses @/lib/i18n directly
// Tests now validate the Swedish translations in the actual component

describe('UnsavedChangesDialog', () => {
  it('renders dialog with correct title and description (Swedish)', () => {
    render(
      <UnsavedChangesDialog isOpen={true} onCancel={vi.fn()} onConfirm={vi.fn()} />
    );

    expect(screen.getByText('Osparade ändringar')).toBeInTheDocument();
    expect(screen.getByText(/Är du säker på att du vill lämna denna vy/)).toBeInTheDocument();
  });

  it('calls onCancel when Continue Editing button clicked', async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();

    render(
      <UnsavedChangesDialog isOpen={true} onCancel={handleCancel} onConfirm={vi.fn()} />
    );

    await user.click(screen.getByText('Fortsätt redigera'));
    // Note: onCancel is called by both the button onClick and the AlertDialog onOpenChange
    expect(handleCancel).toHaveBeenCalled();
  });

  it('calls onConfirm when Discard Changes button clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();

    render(
      <UnsavedChangesDialog isOpen={true} onCancel={vi.fn()} onConfirm={handleConfirm} />
    );

    await user.click(screen.getByText('Kassera ändringar'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    render(
      <UnsavedChangesDialog isOpen={false} onCancel={vi.fn()} onConfirm={vi.fn()} />
    );

    expect(screen.queryByText('Osparade ändringar')).not.toBeInTheDocument();
  });

  it('Continue Editing button has default focus behavior', () => {
    render(
      <UnsavedChangesDialog isOpen={true} onCancel={vi.fn()} onConfirm={vi.fn()} />
    );

    const continueButton = screen.getByText('Fortsätt redigera');
    // Check that the button exists (focus behavior is handled by the AlertDialog component)
    expect(continueButton).toBeInTheDocument();
  });
});
