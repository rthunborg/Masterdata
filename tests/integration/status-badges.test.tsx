import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableCell } from '@/components/dashboard/editable-cell';

// Mock the StatusBadge component
vi.mock('@/components/dashboard/status-badge', () => ({
  StatusBadge: ({ status }: { status: string | null }) => {
    if (!status) return null;
    return <span data-testid="status-badge" className={`badge-${status}`}>✓</span>;
  }
}));

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
      expect(screen.getByText('Yes')).toBeInTheDocument();
      
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
      expect(screen.getByText('No')).toBeInTheDocument();
      
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

      expect(screen.getByText('Yes')).toBeInTheDocument();
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

      expect(screen.getByText('No')).toBeInTheDocument();
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
      await user.click(screen.getByText('No'));

      // Find and toggle checkbox
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

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
  });
});
