import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddColumnModal } from "@/components/dashboard/add-column-modal";
import { columnConfigService } from "@/lib/services/column-config-service";
import { useUIStore } from "@/lib/store/ui-store";
import { useColumns } from "@/lib/hooks/use-columns";
import { useAuth } from "@/lib/hooks/use-auth";

// Mock dependencies
vi.mock("@/lib/services/column-config-service");
vi.mock("@/lib/hooks/use-columns");
vi.mock("@/lib/hooks/use-auth");
vi.mock("sonner");

// Mock Zustand store
vi.mock("@/lib/store/ui-store", () => ({
  useUIStore: vi.fn(),
}));

describe("Column Creation Integration Flow", () => {
  const mockRefetch = vi.fn();
  const mockCreateCustomColumn = vi.fn();
  const mockCloseModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock authenticated Sodexo user
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        id: "user-1",
        email: "sodexo@test.com",
        role: "sodexo",
      },
      isAuthenticated: true,
    });

    (useUIStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      modals: { addColumn: true },
      closeModal: mockCloseModal,
    });

    (columnConfigService.createCustomColumn as ReturnType<typeof vi.fn>) =
      mockCreateCustomColumn;
  });

  it("creates column and triggers refetch on success", async () => {
    const existingColumns = [
      {
        id: "1",
        column_name: "First Name",
        column_type: "text" as const,
        is_masterdata: true,
        role_permissions: { sodexo: { view: true, edit: false } },
        category: null,
        created_at: "2025-10-28T10:00:00Z",
      },
    ];

    const newColumn = {
      id: "2",
      column_name: "Recruitment Team",
      column_type: "text" as const,
      is_masterdata: false,
      role_permissions: { sodexo: { view: true, edit: true } },
      category: "HR",
      created_at: "2025-10-28T11:00:00Z",
    };

    (useColumns as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      columns: existingColumns,
      refetch: mockRefetch,
    });

    mockCreateCustomColumn.mockResolvedValue(newColumn);

    render(<AddColumnModal />);

    // Fill form
    const nameInput = screen.getByLabelText(/column name/i);
    fireEvent.change(nameInput, { target: { value: "Recruitment Team" } });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /create column/i });
    fireEvent.click(submitButton);

    // Verify API call
    await waitFor(() => {
      expect(mockCreateCustomColumn).toHaveBeenCalledWith({
        column_name: "Recruitment Team",
        column_type: "text",
        category: undefined,
      });
    });

    // Verify refetch triggered
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });

    // Verify modal closed
    await waitFor(() => {
      expect(mockCloseModal).toHaveBeenCalledWith("addColumn");
    });
  });

  it("prevents duplicate column names across roles", async () => {
    const existingColumns = [
      {
        id: "1",
        column_name: "Test Column",
        column_type: "text" as const,
        is_masterdata: false,
        role_permissions: { sodexo: { view: true, edit: true } },
        category: null,
        created_at: "2025-10-28T10:00:00Z",
      },
    ];

    (useColumns as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      columns: existingColumns,
      refetch: mockRefetch,
    });

    render(<AddColumnModal />);

    const nameInput = screen.getByLabelText(/column name/i);
    fireEvent.change(nameInput, { target: { value: "Test Column" } });

    const submitButton = screen.getByRole("button", { name: /create column/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/column name already exists/i)
      ).toBeInTheDocument();
    });

    expect(mockCreateCustomColumn).not.toHaveBeenCalled();
  });

  it("allows creating multiple columns sequentially", async () => {
    const column1 = {
      id: "1",
      column_name: "Column 1",
      column_type: "text" as const,
      is_masterdata: false,
      role_permissions: { sodexo: { view: true, edit: true } },
      category: null,
      created_at: "2025-10-28T10:00:00Z",
    };

    const column2 = {
      id: "2",
      column_name: "Column 2",
      column_type: "number" as const,
      is_masterdata: false,
      role_permissions: { sodexo: { view: true, edit: true } },
      category: "Test",
      created_at: "2025-10-28T11:00:00Z",
    };

    (useColumns as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      columns: [],
      refetch: mockRefetch,
    });

    mockCreateCustomColumn
      .mockResolvedValueOnce(column1)
      .mockResolvedValueOnce(column2);

    const { rerender } = render(<AddColumnModal />);

    // Create first column
    const nameInput = screen.getByLabelText(/column name/i);
    fireEvent.change(nameInput, { target: { value: "Column 1" } });

    const submitButton = screen.getByRole("button", { name: /create column/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateCustomColumn).toHaveBeenCalledTimes(1);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    // Reopen modal and create second column
    (useUIStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      modals: { addColumn: true },
      closeModal: mockCloseModal,
    });

    (useColumns as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      columns: [column1],
      refetch: mockRefetch,
    });

    rerender(<AddColumnModal />);

    const nameInput2 = screen.getByLabelText(/column name/i);
    fireEvent.change(nameInput2, { target: { value: "Column 2" } });

    const submitButton2 = screen.getByRole("button", { name: /create column/i });
    fireEvent.click(submitButton2);

    await waitFor(() => {
      expect(mockCreateCustomColumn).toHaveBeenCalledTimes(2);
      expect(mockRefetch).toHaveBeenCalledTimes(2);
    });
  });

  it("handles API errors gracefully", async () => {
    (useColumns as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      columns: [],
      refetch: mockRefetch,
    });

    mockCreateCustomColumn.mockRejectedValue(
      new Error("Server error: Failed to create column")
    );

    render(<AddColumnModal />);

    const nameInput = screen.getByLabelText(/column name/i);
    fireEvent.change(nameInput, { target: { value: "New Column" } });

    const submitButton = screen.getByRole("button", { name: /create column/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateCustomColumn).toHaveBeenCalled();
    });

    // Modal should remain open on error
    expect(mockCloseModal).not.toHaveBeenCalled();
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it("creates column with different field types", async () => {
    (useColumns as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      columns: [],
      refetch: mockRefetch,
    });

    mockCreateCustomColumn.mockResolvedValue({
      id: "col-text",
      column_name: "Text Column",
      column_type: "text" as const,
      is_masterdata: false,
      role_permissions: { sodexo: { view: true, edit: true } },
      category: null,
      created_at: "2025-10-28T10:00:00Z",
    });

    render(<AddColumnModal />);

    const nameInput = screen.getByLabelText(/column name/i);
    fireEvent.change(nameInput, {
      target: { value: "Text Column" },
    });

    const submitButton = screen.getByRole("button", {
      name: /create column/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateCustomColumn).toHaveBeenCalledWith(
        expect.objectContaining({
          column_name: "Text Column",
          column_type: "text",
        })
      );
    });
  });
});
