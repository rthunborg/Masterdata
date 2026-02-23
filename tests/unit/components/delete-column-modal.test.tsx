import { screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteColumnModal } from "@/components/admin/delete-column-modal";
import { columnService } from "@/lib/services/column-service";
import { toast } from "sonner";
import type { ColumnConfig } from "@/lib/types/column-config";

vi.mock("@/lib/services/column-service");
vi.mock("sonner");

describe("DeleteColumnModal", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

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
  db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    };

  const mockOnClose = vi.fn();
  const mockOnDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders confirmation message with column name", () => {
    renderWithQueryClient(
      <DeleteColumnModal
        column={mockColumn}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    expect(
      screen.getByText(/Ta bort kolumn "Test Column"\?/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /All data i denna kolumn kommer att tas bort permanent från alla medarbetare/i
      )
    ).toBeInTheDocument();
  });

  it("does not render when column is null", () => {
    const { container } = renderWithQueryClient(
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

    renderWithQueryClient(
      <DeleteColumnModal
        column={mockColumn}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    const deleteButton = screen.getByRole("button", {
      name: /Ta bort kolumn/i,
    });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteColumn).toHaveBeenCalledWith("test-column-id-123");
      expect(mockOnDeleted).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        'Kolumn "Test Column" borttagen'
      );
    });
  });

  it("closes modal on cancel without deleting", () => {
    const mockDeleteColumn = vi.fn();
    vi.mocked(columnService).deleteColumn = mockDeleteColumn;

    renderWithQueryClient(
      <DeleteColumnModal
        column={mockColumn}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /Avbryt/i });
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

    renderWithQueryClient(
      <DeleteColumnModal
        column={mockColumn}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    const deleteButton = screen.getByRole("button", {
      name: /Ta bort kolumn/i,
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

    renderWithQueryClient(
      <DeleteColumnModal
        column={mockColumn}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    const deleteButton = screen.getByRole("button", {
      name: /Ta bort kolumn/i,
    });
    fireEvent.click(deleteButton);

    // Buttons should be disabled during deletion
    await waitFor(() => {
      expect(deleteButton).toBeDisabled();
      expect(screen.getByRole("button", { name: /Avbryt/i })).toBeDisabled();
      expect(screen.getByText(/Tar bort.../i)).toBeInTheDocument();
    });
  });

  it("shows 'cannot be undone' warning", () => {
    renderWithQueryClient(
      <DeleteColumnModal
        column={mockColumn}
        isOpen={true}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    expect(
      screen.getByText(/Denna åtgärd kan inte ångras/i)
    ).toBeInTheDocument();
  });
});

