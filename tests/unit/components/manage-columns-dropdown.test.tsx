/**
 * Manage Columns Dropdown Tests
 * Story 17.1: Swedish Translations for Custom Column Management
 * Story 17.2: Delete Functionality for Custom Columns
 * 
 * Tests that all UI text uses Swedish translations and delete functionality works
 */

import { screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ManageColumnsDialog } from "@/components/dashboard/manage-columns-dropdown";
import { useColumns } from "@/lib/hooks/use-columns";
import { useUIStore } from "@/lib/store/ui-store";
import { columnService } from "@/lib/services/column-service";
import { toast } from "sonner";
import type { ColumnConfig } from "@/lib/types/column-config";

// Mock dependencies
vi.mock("@/lib/hooks/use-columns");
vi.mock("@/lib/store/ui-store");
vi.mock("@/lib/services/column-service");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ManageColumnsDialog - Translations", () => {
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

  const mockOpenEditColumnModal = vi.fn();

  const mockCustomColumns: ColumnConfig[] = [
    {
      id: "col-1",
      column_name: "Recruitment Team",
      column_type: "text",
      is_masterdata: false,
      category: "Team",
      role_permissions: {
        sodexo: { view: true, edit: true },
      },
      display_order: 1,
      is_visible: true,
      db_column_name: "recruitment_team",
      category_color: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "col-2",
      column_name: "Training Status",
      column_type: "text",
      is_masterdata: false,
      category: null, // Uncategorized
      role_permissions: {
        sodexo: { view: true, edit: true },
      },
      display_order: 2,
      is_visible: true,
      db_column_name: "training_status",
      category_color: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useColumns).mockReturnValue({
      columns: mockCustomColumns,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useUIStore).mockReturnValue({
      modals: {},
      openEditColumnModal: mockOpenEditColumnModal,
      closeModal: vi.fn(),
      openModal: vi.fn(),
      isPreviewMode: false,
      previewRole: null,
      setPreviewRole: vi.fn(),
      setIsPreviewMode: vi.fn(),
      columnVisibility: {},
      initColumnVisibility: vi.fn(),
      setColumnVisibility: vi.fn(),
      toggleColumnVisibility: vi.fn(),
      editColumnId: null,
      closeEditColumnModal: vi.fn(),
    });
  });

  it("should display Swedish translation for 'Manage Columns' button", () => {
    renderWithQueryClient(<ManageColumnsDialog />);
    
    // AC1: Button should display "Hantera kolumner"
    const button = screen.getByRole("button", { name: /Hantera kolumner/i });
    expect(button).toBeInTheDocument();
  });

  it("should display Swedish translations in modal when opened", async () => {
    renderWithQueryClient(<ManageColumnsDialog />);
    
    // Open the modal
    const button = screen.getByRole("button", { name: /Hantera kolumner/i });
    fireEvent.click(button);

    // AC2: Modal title should be "Hantera anpassade kolumner"
    await waitFor(() => {
      expect(screen.getByText("Hantera anpassade kolumner")).toBeInTheDocument();
    });

    // AC2: Modal description should be "Redigera dina anpassade kolumnnamn och kategorier"
    expect(screen.getByText("Redigera dina anpassade kolumnnamn och kategorier")).toBeInTheDocument();
  });

  it("should display 'Okategoriserad' for uncategorized columns", async () => {
    renderWithQueryClient(<ManageColumnsDialog />);
    
    // Open the modal
    const button = screen.getByRole("button", { name: /Hantera kolumner/i });
    fireEvent.click(button);

    // AC2: "Uncategorized" should translate to "Okategoriserad"
    await waitFor(() => {
      expect(screen.getByText("Okategoriserad")).toBeInTheDocument();
    });
  });

  it("should display category name for categorized columns", async () => {
    renderWithQueryClient(<ManageColumnsDialog />);
    
    // Open the modal
    const button = screen.getByRole("button", { name: /Hantera kolumner/i });
    fireEvent.click(button);

    // Should display the actual category name (not translated)
    await waitFor(() => {
      expect(screen.getByText("Team")).toBeInTheDocument();
    });
  });

  it("should display column names in the list", async () => {
    renderWithQueryClient(<ManageColumnsDialog />);
    
    // Open the modal
    const button = screen.getByRole("button", { name: /Hantera kolumner/i });
    fireEvent.click(button);

    // Should display column names
    await waitFor(() => {
      expect(screen.getByText("Recruitment Team")).toBeInTheDocument();
      expect(screen.getByText("Training Status")).toBeInTheDocument();
    });
  });

  it("should not render when there are no custom columns", () => {
    vi.mocked(useColumns).mockReturnValue({
      columns: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = renderWithQueryClient(<ManageColumnsDialog />);
    expect(container.firstChild).toBeNull();
  });
});

describe("ManageColumnsDialog - Delete Functionality", () => {
  let queryClient: QueryClient;
  const mockOpenEditColumnModal = vi.fn();
  const mockRefetch = vi.fn();

  const mockCustomColumns: ColumnConfig[] = [
    {
      id: "col-1",
      column_name: "Recruitment Team",
      column_type: "text",
      is_masterdata: false,
      category: "Team",
      role_permissions: {
        sodexo: { view: true, edit: true },
      },
      display_order: 1,
      is_visible: true,
      db_column_name: "recruitment_team",
      category_color: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ];

  const renderWithQueryClient = (component: React.ReactElement) => {
    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    
    vi.mocked(useColumns).mockReturnValue({
      columns: mockCustomColumns,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    vi.mocked(useUIStore).mockReturnValue({
      modals: {},
      openEditColumnModal: mockOpenEditColumnModal,
      closeModal: vi.fn(),
      openModal: vi.fn(),
      isPreviewMode: false,
      previewRole: null,
      setPreviewRole: vi.fn(),
      setIsPreviewMode: vi.fn(),
      columnVisibility: {},
      initColumnVisibility: vi.fn(),
      setColumnVisibility: vi.fn(),
      toggleColumnVisibility: vi.fn(),
      editColumnId: null,
      closeEditColumnModal: vi.fn(),
    });

    vi.mocked(columnService.deleteCustomColumn).mockResolvedValue(undefined);
  });

  it("should display delete button for each column", async () => {
    renderWithQueryClient(<ManageColumnsDialog />);
    
    // Open the modal
    const button = screen.getByRole("button", { name: /Hantera kolumner/i });
    fireEvent.click(button);

    // Wait for modal to open and find delete button
    await waitFor(() => {
      const deleteButton = screen.getByRole("button", { name: /Ta bort \(permanent\)/i });
      expect(deleteButton).toBeInTheDocument();
    });
  });

  it("should open confirmation dialog when delete button is clicked", async () => {
    renderWithQueryClient(<ManageColumnsDialog />);
    
    // Open the modal
    const button = screen.getByRole("button", { name: /Hantera kolumner/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Recruitment Team")).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole("button", { name: /Ta bort \(permanent\)/i });
    fireEvent.click(deleteButton);

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ta bort kolumn/i })).toBeInTheDocument();
      expect(screen.getByText(/Är du säker på att du vill ta bort kolumnen/i)).toBeInTheDocument();
    });
  });

  it("should delete column when confirmed", async () => {
    renderWithQueryClient(<ManageColumnsDialog />);
    
    // Open the modal
    const button = screen.getByRole("button", { name: /Hantera kolumner/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Recruitment Team")).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole("button", { name: /Ta bort \(permanent\)/i });
    fireEvent.click(deleteButton);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ta bort kolumn/i })).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByRole("button", { name: /Ta bort/i });
    fireEvent.click(confirmButton);

    // Should call delete service
    await waitFor(() => {
      expect(columnService.deleteCustomColumn).toHaveBeenCalledWith("col-1");
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it("should show success toast after successful deletion", async () => {
    renderWithQueryClient(<ManageColumnsDialog />);
    
    // Open the modal
    const button = screen.getByRole("button", { name: /Hantera kolumner/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Recruitment Team")).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole("button", { name: /Ta bort \(permanent\)/i });
    fireEvent.click(deleteButton);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ta bort kolumn/i })).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByRole("button", { name: /Ta bort/i });
    fireEvent.click(confirmButton);

    // Should show success toast
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("should show error toast on deletion failure", async () => {
    vi.mocked(columnService.deleteCustomColumn).mockRejectedValue(new Error("Failed to delete"));

    renderWithQueryClient(<ManageColumnsDialog />);
    
    // Open the modal
    const button = screen.getByRole("button", { name: /Hantera kolumner/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Recruitment Team")).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole("button", { name: /Ta bort \(permanent\)/i });
    fireEvent.click(deleteButton);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ta bort kolumn/i })).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByRole("button", { name: /Ta bort/i });
    fireEvent.click(confirmButton);

    // Should show error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("should close confirmation dialog when cancel is clicked", async () => {
    renderWithQueryClient(<ManageColumnsDialog />);
    
    // Open the modal
    const button = screen.getByRole("button", { name: /Hantera kolumner/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Recruitment Team")).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole("button", { name: /Ta bort \(permanent\)/i });
    fireEvent.click(deleteButton);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ta bort kolumn/i })).toBeInTheDocument();
    });

    // Click cancel button
    const cancelButton = screen.getByRole("button", { name: /Avbryt/i });
    fireEvent.click(cancelButton);

    // Dialog should close, delete should not be called
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /Ta bort kolumn/i })).not.toBeInTheDocument();
      expect(columnService.deleteCustomColumn).not.toHaveBeenCalled();
    });
  });
});

