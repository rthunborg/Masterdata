import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddColumnModal } from "@/components/dashboard/add-column-modal";
import { columnConfigService } from "@/lib/services/column-config-service";
import { useUIStore } from "@/lib/store/ui-store";
import { useColumns } from "@/lib/hooks/use-columns";
import { toast } from "sonner";

// Mock dependencies
vi.mock("@/lib/services/column-config-service");
vi.mock("@/lib/hooks/use-columns");
vi.mock("sonner");

// Mock Zustand store
vi.mock("@/lib/store/ui-store", () => ({
  useUIStore: vi.fn(),
}));

describe("AddColumnModal", () => {
  const mockCloseModal = vi.fn();
  const mockRefetch = vi.fn();
  const mockCreateCustomColumn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    (useUIStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      modals: { addColumn: true },
      closeModal: mockCloseModal,
    });

    (useColumns as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      columns: [
        {
          id: "1",
          column_name: "Existing Column",
          column_type: "text",
          is_masterdata: false,
          role_permissions: { sodexo: { view: true, edit: true } },
          category: "Test Category",
          created_at: "2025-10-28T10:00:00Z",
        db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    },
      ],
      refetch: mockRefetch,
    });

    (columnConfigService.createCustomColumn as ReturnType<typeof vi.fn>) =
      mockCreateCustomColumn;
  });

  it("renders form fields correctly when modal is open", () => {
    renderWithI18n(<AddColumnModal />);

    const nameInputs = screen.getAllByLabelText(/Kolumnnamn/i);
    expect(nameInputs[0]).toBeInTheDocument(); // Display name
    expect(nameInputs[1]).toBeInTheDocument(); // Database name
    expect(screen.getByText(/Kolumntyp/i)).toBeInTheDocument();
    expect(screen.getByText(/Kategori \(Valfritt\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Skapa kolumn/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Avbryt/i })).toBeInTheDocument();
  });

  it("does not render when modal is closed", () => {
    (useUIStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      modals: { addColumn: false },
      closeModal: mockCloseModal,
    });

    renderWithI18n(<AddColumnModal />);

    expect(screen.queryByLabelText(/Kolumnnamn/i)).not.toBeInTheDocument();
  });

  it("validates required column name field", async () => {
    renderWithI18n(<AddColumnModal />);

    const submitButton = screen.getByRole("button", { name: /Skapa kolumn/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/column name is required/i)).toBeInTheDocument();
    });

    expect(mockCreateCustomColumn).not.toHaveBeenCalled();
  });

  it("validates duplicate column name", async () => {
    renderWithI18n(<AddColumnModal />);

    const nameInput = screen.getAllByLabelText(/Kolumnnamn/i)[0];
    fireEvent.change(nameInput, { target: { value: "Existing Column" } });

    const submitButton = screen.getByRole("button", { name: /Skapa kolumn/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/column name already exists/i)
      ).toBeInTheDocument();
    });

    expect(mockCreateCustomColumn).not.toHaveBeenCalled();
  });

  it("validates column name format", async () => {
    renderWithI18n(<AddColumnModal />);

    const nameInput = screen.getAllByLabelText(/Kolumnnamn/i)[0];
    fireEvent.change(nameInput, { target: { value: "Invalid@Name!" } });

    const submitButton = screen.getByRole("button", { name: /Skapa kolumn/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/can only contain letters, numbers/i)
      ).toBeInTheDocument();
    });

    expect(mockCreateCustomColumn).not.toHaveBeenCalled();
  });

  it("calls columnConfigService.createCustomColumn on valid submit", async () => {
    const mockNewColumn = {
      id: "new-id",
      column_name: "New Column",
      column_type: "text" as const,
      is_masterdata: false,
      role_permissions: { sodexo: { view: true, edit: true } },
      category: null,
      created_at: "2025-10-28T10:00:00Z",
    db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    };

    mockCreateCustomColumn.mockResolvedValue(mockNewColumn);

    renderWithI18n(<AddColumnModal />);

    const nameInput = screen.getAllByLabelText(/Kolumnnamn/i)[0];
    fireEvent.change(nameInput, { target: { value: "New Column" } });

    const submitButton = screen.getByRole("button", { name: /Skapa kolumn/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateCustomColumn).toHaveBeenCalledWith({
        column_name: "New Column",
        column_type: "text",
        category: undefined,
      });
    });
  });

  it("shows success toast and closes modal after successful creation", async () => {
    const mockNewColumn = {
      id: "new-id",
      column_name: "New Column",
      column_type: "text" as const,
      is_masterdata: false,
      role_permissions: { sodexo: { view: true, edit: true } },
      category: null,
      created_at: "2025-10-28T10:00:00Z",
    db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    };

    mockCreateCustomColumn.mockResolvedValue(mockNewColumn);

    renderWithI18n(<AddColumnModal />);

    const nameInput = screen.getAllByLabelText(/Kolumnnamn/i)[0];
    fireEvent.change(nameInput, { target: { value: "New Column" } });

    const submitButton = screen.getByRole("button", { name: /Skapa kolumn/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Note: i18n placeholder interpolation happens in the component
      // The test receives the format string with {name} placeholder
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("Column")
      );
      expect(mockRefetch).toHaveBeenCalled();
      expect(mockCloseModal).toHaveBeenCalledWith("addColumn");
    });
  });

  it("displays error toast on API failure", async () => {
    mockCreateCustomColumn.mockRejectedValue(
      new Error("Failed to create column")
    );

    renderWithI18n(<AddColumnModal />);

    const nameInput = screen.getAllByLabelText(/Kolumnnamn/i)[0];
    fireEvent.change(nameInput, { target: { value: "New Column" } });

    const submitButton = screen.getByRole("button", { name: /Skapa kolumn/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create column");
    });

    expect(mockCloseModal).not.toHaveBeenCalled();
  });

  it("disables form during submission", async () => {
    mockCreateCustomColumn.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    renderWithI18n(<AddColumnModal />);

    const nameInput = screen.getAllByLabelText(/Kolumnnamn/i)[0];
    fireEvent.change(nameInput, { target: { value: "New Column" } });

    const submitButton = screen.getByRole("button", { name: /Skapa kolumn/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Skapar/i })).toBeDisabled();
    });
  });

  it("allows selecting column type", async () => {
    renderWithI18n(<AddColumnModal />);

    const typeSelect = screen.getByRole("combobox", { name: /Kolumntyp/i });
    fireEvent.click(typeSelect);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Text/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /Nummer/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /Datum/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /Boolesk/i })).toBeInTheDocument();
    });
  });

  it("shows existing categories in category combobox", async () => {
    renderWithI18n(<AddColumnModal />);

    const categoryButton = screen.getByRole("combobox", { name: /Kategori/i });
    fireEvent.click(categoryButton);

    await waitFor(() => {
      expect(screen.getByText("Test Category")).toBeInTheDocument();
    });
  });

  it("allows creating column with category", async () => {
    const mockNewColumn = {
      id: "new-id",
      column_name: "New Column",
      column_type: "number" as const,
      is_masterdata: false,
      role_permissions: { sodexo: { view: true, edit: true } },
      category: "Custom Category",
      created_at: "2025-10-28T10:00:00Z",
    db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    };

    mockCreateCustomColumn.mockResolvedValue(mockNewColumn);

    renderWithI18n(<AddColumnModal />);

    const nameInput = screen.getAllByLabelText(/Kolumnnamn/i)[0];
    fireEvent.change(nameInput, { target: { value: "New Column" } });

    const categoryButton = screen.getByRole("combobox", { name: /Kategori/i });
    fireEvent.click(categoryButton);

    const categoryInput = screen.getByPlaceholderText(/Sök eller skriv/i);
    fireEvent.change(categoryInput, { target: { value: "Custom Category" } });

    const submitButton = screen.getByRole("button", { name: /Skapa kolumn/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateCustomColumn).toHaveBeenCalledWith({
        column_name: "New Column",
        column_type: "text",
        category: "Custom Category",
      });
    });
  });
});

