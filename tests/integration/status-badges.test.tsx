import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableCell } from '@/components/dashboard/editable-cell';

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/dashboard",
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ""),
  }),
  usePathname: () => "/dashboard",
}));

// Mock the StatusBadge component
vi.mock('@/components/dashboard/status-badge', () => ({
  StatusBadge: ({ status }: { status: string | null }) => {
    if (!status) return null;

    return <span data-testid="status-badge" className={`badge-${status}`}>✓</span>;
  }
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('Status Badges Integration', () => {
  const mockOnSave = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
    mockOnError.mockClear();
  });

  describe('Boolean Field Badge Display', () => {
    it('displays green badge when boolean value is true', () => {
      render(
        <EditableCell
          value={true}
          employeeId="test-123"
          field="isps"
          type="boolean"
          canEdit={true}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      // Check that "Yes" text is displayed
      expect(screen.getByText('Klart')).toBeInTheDocument();

      // Check that status badge is present
      const badge = screen.getByTestId('status-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge-green');
    });

    it('does not display badge when boolean value is false', () => {
      render(
        <EditableCell
          value={false}
          employeeId="test-123"
          field="isps"
          type="boolean"
          canEdit={true}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      // Check that "No" text is displayed
      expect(screen.getByText('Nej')).toBeInTheDocument();

      // Check that no badge is present
      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
    });

    it('does not display badge when boolean value is null', () => {
      render(
        <EditableCell
          value={null}
          employeeId="test-123"
          field="isps"
          type="boolean"
          canEdit={true}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      // Check that no badge is present
      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
    });
  });

  describe('Read-Only Boolean Fields', () => {
    it('displays badge for read-only fields when value is true', () => {
      render(
        <EditableCell
          value={true}
          employeeId="test-123"
          field="isps"
          type="boolean"
          canEdit={false}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Klart')).toBeInTheDocument();
      const badge = screen.getByTestId('status-badge');
      expect(badge).toBeInTheDocument();
    });

    it('does not display badge for read-only fields when value is false', () => {
      render(
        <EditableCell
          value={false}
          employeeId="test-123"
          field="isps"
          type="boolean"
          canEdit={false}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Nej')).toBeInTheDocument();
      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
    });
  });

  describe('Boolean Field Toggle Behavior', () => {
    it('shows badge after toggling from false to true', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      const { rerender } = render(
        <EditableCell
          value={false}
          employeeId="test-123"
          field="isps"
          type="boolean"
          canEdit={true}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      // Initially no badge
      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();

      // Click to edit
      await user.click(screen.getByText('Nej'));

       // Find and toggle dropdown (dropdown auto-opens on edit)
       // const combobox = screen.getByRole('combobox', { hidden: true });
       // await user.click(combobox);

      const option = await screen.findByText("Klart");
      fireEvent.click(option);

      // Wait for save to be called
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('test-123', 'isps', true);
      });

      // Simulate component re-render with new value
      rerender(
        <EditableCell
          value={true}
          employeeId="test-123"
          field="isps"
          type="boolean"
          canEdit={true}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      // Badge should now be present
      expect(screen.getByTestId('status-badge')).toBeInTheDocument();
    });

    it('does not show the green badge until the saved value is confirmed by props', async () => {
      const user = userEvent.setup();
      const save = deferred<void>();
      mockOnSave.mockReturnValue(save.promise);

      const { rerender } = render(
        <EditableCell
          value={false}
          employeeId="test-123"
          field="isps"
          type="boolean"
          canEdit={true}
          isChecklistItem={true}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();

      await user.click(screen.getByText('Nej'));
      fireEvent.click(await screen.findByText('Klart'));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('test-123', 'isps', true);
      });
      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();

      await act(async () => {
        save.resolve();
        await save.promise;
      });
      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();

      rerender(
        <EditableCell
          value={true}
          employeeId="test-123"
          field="isps"
          type="boolean"
          canEdit={true}
          isChecklistItem={true}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('status-badge')).toBeInTheDocument();
    });

    it('shows a field spinner and keeps the original checklist value while save is pending', async () => {
      const user = userEvent.setup();
      const save = deferred<void>();
      mockOnSave.mockReturnValue(save.promise);

      render(
        <EditableCell
          value={false}
          employeeId="test-123"
          field="isps"
          type="boolean"
          canEdit={true}
          isChecklistItem={true}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      await user.click(screen.getByText('Nej'));
      fireEvent.click(await screen.findByText('Klart'));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('test-123', 'isps', true);
      });

      expect(screen.getByRole('status', { name: 'Sparar' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { hidden: true })).toHaveTextContent('Nej');
      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();

      await act(async () => {
        save.resolve();
        await save.promise;
      });
    });

    it('reverts a failed checklist save to the confirmed original value', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error('Save failed'));

      render(
        <EditableCell
          value={false}
          employeeId="test-123"
          field="isps"
          type="boolean"
          canEdit={true}
          isChecklistItem={true}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      await user.click(screen.getByText('Nej'));
      fireEvent.click(await screen.findByText('Klart'));

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Save failed');
      });

      expect(screen.getByRole('gridcell')).toHaveTextContent('Nej');
      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
    });

    it('shows a green badge for true non-checklist boolean fields', () => {
      render(
        <EditableCell
          value={true}
          employeeId="test-123"
          field="hotel_required"
          type="boolean"
          canEdit={true}
          isChecklistItem={false}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Ja')).toBeInTheDocument();
      const badge = screen.getByTestId('status-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge-green');
    });
  });

  describe('Multiple Boolean Fields', () => {
    it('displays badges for multiple true boolean fields', () => {
      const fields = [
        { field: 'isps', value: true },
        { field: 'photo', value: true },
        { field: 'origo', value: false },
        { field: 'mail_lon', value: true },
      ];

      const { container } = render(
        <div>
          {fields.map((item) => (
            <div key={item.field}>
              <EditableCell
                value={item.value}
                employeeId="test-123"
                field={item.field}
                type="boolean"
                canEdit={true}
                onSave={mockOnSave}
                onError={mockOnError}
              />
            </div>
          ))}
        </div>
      );

      // Should have 3 badges (for the 3 true values)
      const badges = container.querySelectorAll('[data-testid="status-badge"]');
      expect(badges).toHaveLength(3);
    });
  });

  describe('Non-Boolean Fields', () => {
    it('does not display badge for text fields', () => {
      render(
        <EditableCell
          value="Some text value"
          employeeId="test-123"
          field="first_name"
          type="text"
          canEdit={true}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
    });

    it('does not display badge for date fields', () => {
      render(
        <EditableCell
          value="2024-01-15"
          employeeId="test-123"
          field="hire_date"
          type="date"
          canEdit={true}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
    });

    it('does not display badge for number fields', () => {
      render(
        <EditableCell
          value={42}
          employeeId="test-123"
          field="age"
          type="number"
          canEdit={true}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
    });

    it('displays green badge for lönenivå when it has a non-default value', () => {
      render(
        <EditableCell
          value={3}
          employeeId="test-123"
          field="loneiva"
          type="number"
          canEdit={true}
          isChecklistItem={false}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      const badge = screen.getByTestId('status-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge-green');
    });

    it('does not display badge for lönenivå when it is the default value', () => {
      render(
        <EditableCell
          value={0}
          employeeId="test-123"
          field="loneiva"
          type="number"
          canEdit={true}
          isChecklistItem={false}
          onSave={mockOnSave}
          onError={mockOnError}
        />
      );

      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
    });
  });
});
