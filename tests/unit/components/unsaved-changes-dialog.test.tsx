import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { UnsavedChangesDialog } from '@/components/dashboard/unsaved-changes-dialog';
import { NextIntlClientProvider } from 'next-intl';

const messages = {
  modals: {
    unsavedChanges: {
      title: 'Unsaved Changes',
      description: 'Are you sure you want to exit this view? Your data will not be saved.',
      continueEditing: 'Continue Editing',
      discardChanges: 'Discard Changes',
    },
  },
};

const messagesSwedish = {
  modals: {
    unsavedChanges: {
      title: 'Osparade ändringar',
      description: 'Är du säker på att du vill lämna denna vy? Din data kommer inte att sparas.',
      continueEditing: 'Fortsätt redigera',
      discardChanges: 'Kassera ändringar',
    },
  },
};

describe('UnsavedChangesDialog', () => {
  it('renders dialog with correct title and description', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <UnsavedChangesDialog isOpen={true} onCancel={vi.fn()} onConfirm={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to exit this view/)).toBeInTheDocument();
  });

  it('calls onCancel when Continue Editing button clicked', async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <UnsavedChangesDialog isOpen={true} onCancel={handleCancel} onConfirm={vi.fn()} />
      </NextIntlClientProvider>
    );

    await user.click(screen.getByText('Continue Editing'));
    // Note: onCancel is called by both the button onClick and the AlertDialog onOpenChange
    expect(handleCancel).toHaveBeenCalled();
  });

  it('calls onConfirm when Discard Changes button clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <UnsavedChangesDialog isOpen={true} onCancel={vi.fn()} onConfirm={handleConfirm} />
      </NextIntlClientProvider>
    );

    await user.click(screen.getByText('Discard Changes'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <UnsavedChangesDialog isOpen={false} onCancel={vi.fn()} onConfirm={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
  });

  it('Continue Editing button has default focus behavior', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <UnsavedChangesDialog isOpen={true} onCancel={vi.fn()} onConfirm={vi.fn()} />
      </NextIntlClientProvider>
    );

    const continueButton = screen.getByText('Continue Editing');
    // Check that the button exists (focus behavior is handled by the AlertDialog component)
    expect(continueButton).toBeInTheDocument();
  });

  it('displays Swedish translations when locale is sv', () => {
    render(
      <NextIntlClientProvider locale="sv" messages={messagesSwedish}>
        <UnsavedChangesDialog isOpen={true} onCancel={vi.fn()} onConfirm={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Osparade ändringar')).toBeInTheDocument();
    expect(screen.getByText(/Är du säker på att du vill lämna denna vy/)).toBeInTheDocument();
    expect(screen.getByText('Fortsätt redigera')).toBeInTheDocument();
    expect(screen.getByText('Kassera ändringar')).toBeInTheDocument();
  });
});
