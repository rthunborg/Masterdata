import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddEmployeeModal } from '@/components/dashboard/add-employee-modal';
import { useImportantDates } from '@/lib/hooks/use-important-dates';
import { useAvailablePE3Dates } from '@/lib/hooks/use-available-pe3-dates';

// Mock dependencies
vi.mock('@/lib/services/employee-service');
vi.mock('@/lib/hooks/use-important-dates');
vi.mock('@/lib/hooks/use-available-pe3-dates');
vi.mock('sonner');

describe('Add Employee Modal - Unsaved Changes', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Important Dates hooks
    (useImportantDates as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      dates: [
        {
          id: 'stena-1',
          category: 'Stena Dates',
          date_value: '2025-11-15',
          date_description: 'Fredag 15/11',
        },
      ],
      isLoading: false,
    });

    (useAvailablePE3Dates as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      availableDates: [
        {
          id: 'pe3-1',
          category: 'PE3 Dates',
          date_value: '2025-11-20',
          date_description: 'Wednesday 20/11',
        },
      ],
      totalAvailable: 1,
      isLoading: false,
    });
  });

  it('shows confirmation dialog when clicking Cancel with dirty form', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <AddEmployeeModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Enter data in First Name field to make form dirty
    const firstNameInput = screen.getByPlaceholderText('John');
    await user.type(firstNameInput, 'John');

    // Click Cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/are you sure you want to exit this view/i)).toBeInTheDocument();
  });

  it('closes modal immediately when clicking Cancel with pristine form', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <AddEmployeeModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Click Cancel button without entering any data
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Modal should close immediately without confirmation
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
  });

  it('shows confirmation dialog when clicking backdrop with dirty form', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <AddEmployeeModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Enter data to make form dirty
    const firstNameInput = screen.getByPlaceholderText('John');
    await user.type(firstNameInput, 'Jane');

    // Click backdrop (dialog overlay)
    // Note: This simulates the backdrop click by triggering the onOpenChange handler
    const dialogOverlay = screen.getByRole('dialog').parentElement?.querySelector('[data-radix-dialog-overlay]');
    if (dialogOverlay) {
      await user.click(dialogOverlay);

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      });
    }
  });

  it('shows confirmation dialog when pressing Escape with dirty form', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <AddEmployeeModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Enter data to make form dirty
    const firstNameInput = screen.getByPlaceholderText('John');
    await user.type(firstNameInput, 'Bob');

    // Press Escape key
    await user.keyboard('{Escape}');

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });
  });

  it('closes modal when clicking Discard Changes in confirmation dialog', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <AddEmployeeModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Enter data to make form dirty
    const firstNameInput = screen.getByPlaceholderText('John');
    await user.type(firstNameInput, 'Alice');

    // Click Cancel to trigger confirmation
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });

    // Click Discard Changes
    const discardButton = screen.getByRole('button', { name: /discard changes/i });
    await user.click(discardButton);

    // Modal should close
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('returns to form when clicking Continue Editing in confirmation dialog', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <AddEmployeeModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Enter data to make form dirty
    const firstNameInput = screen.getByPlaceholderText('John');
    await user.type(firstNameInput, 'Charlie');

    // Click Cancel to trigger confirmation
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });

    // Click Continue Editing
    const continueButton = screen.getByRole('button', { name: /continue editing/i });
    await user.click(continueButton);

    // Confirmation dialog should close, data should still be in form
    await waitFor(() => {
      expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
    });
    expect((firstNameInput as HTMLInputElement).value).toBe('Charlie');
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('isDirty becomes true after modifying First Name field', async () => {
    const user = userEvent.setup();

    const { unmount } = renderWithI18n(
      <AddEmployeeModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    
    // Initially pristine - clicking Cancel should close immediately
    let cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Unmount first render
    unmount();

    // Reset mock
    mockOnClose.mockClear();

    // Re-render with open modal
    renderWithI18n(
      <AddEmployeeModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Type in field to make it dirty
    const firstNameInput = screen.getByPlaceholderText('John');
    await user.type(firstNameInput, 'David');

    // Now clicking Cancel should show confirmation
    cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });
  });

  it('isDirty remains false when no fields modified', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <AddEmployeeModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Don't enter any data
    // Click Cancel - should close immediately
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
  });
});
