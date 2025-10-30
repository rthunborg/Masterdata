import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteColumnModal } from "@/components/admin/delete-column-modal";
import { columnService } from "@/lib/services/column-service";
import { toast } from "sonner";
import type { ColumnConfig } from "@/lib/types/column-config";

vi.mock("@/lib/services/column-service");
vi.mock("sonner");

describe("DeleteColumnModal", () => {
  const mockColumn: ColumnConfig = {
    id: "test-column-id-123",
    column_name: "Test Column",
    column_type: "text",
    is_masterdata: false,
    role_permissions: {
      sodexo: { view: true, edit: true },
    },
    category: null,
    created_at: "2025-01-01T00:00:00.000Z",
  };

  const mockOnClose = vi.fn();
  const mockOnDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders confirmation message with column name", () => {
    renderWithI18n(
      <DeleteColumnModal
        column={mockColumn}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    expect(
      screen.getByText(/Delete Column "Test Column"\?/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /All data in this column will be permanently removed from all employees/i
      )
    ).toBeInTheDocument();
  });

  it("does not render when column is null", () => {
    const { container } = renderWithI18n(
      <DeleteColumnModal
        column={null}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("calls deleteColumn service on confirm", async () => {
    const mockDeleteColumn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(columnService).deleteColumn = mockDeleteColumn;

    renderWithI18n(
      <DeleteColumnModal
        column={mockColumn}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    const deleteButton = screen.getByRole("button", {
      name: /Delete Column/i,
    });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteColumn).toHaveBeenCalledWith("test-column-id-123");
      expect(mockOnDeleted).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        'Column "Test Column" deleted successfully'
      );
    });
  });

  it("closes modal on cancel without deleting", () => {
    const mockDeleteColumn = vi.fn();
    vi.mocked(columnService).deleteColumn = mockDeleteColumn;

    renderWithI18n(
      <DeleteColumnModal
        column={mockColumn}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockDeleteColumn).not.toHaveBeenCalled();
    expect(mockOnDeleted).not.toHaveBeenCalled();
  });

  it("displays error toast on deletion failure", async () => {
    const mockDeleteColumn = vi
      .fn()
      .mockRejectedValue(new Error("Deletion failed"));
    vi.mocked(columnService).deleteColumn = mockDeleteColumn;

    renderWithI18n(
      <DeleteColumnModal
        column={mockColumn}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    const deleteButton = screen.getByRole("button", {
      name: /Delete Column/i,
    });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Deletion failed");
      expect(mockOnDeleted).not.toHaveBeenCalled();
      // onClose may be called by the AlertDialog component, which is acceptable
      // The important thing is that onDeleted is not called on error
    });
  });

  it("disables buttons during deletion", async () => {
    const mockDeleteColumn = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
    vi.mocked(columnService).deleteColumn = mockDeleteColumn;

    renderWithI18n(
      <DeleteColumnModal
        column={mockColumn}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    const deleteButton = screen.getByRole("button", {
      name: /Delete Column/i,
    });
    fireEvent.click(deleteButton);

    // Buttons should be disabled during deletion
    await waitFor(() => {
      expect(deleteButton).toBeDisabled();
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
      expect(screen.getByText(/Deleting.../i)).toBeInTheDocument();
    });
  });

  it("shows 'cannot be undone' warning", () => {
    renderWithI18n(
      <DeleteColumnModal
        column={mockColumn}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    expect(
      screen.getByText(/This action cannot be undone/i)
    ).toBeInTheDocument();
  });
});

