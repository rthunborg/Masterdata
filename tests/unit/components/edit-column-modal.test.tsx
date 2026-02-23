/**
 * Edit Column Modal Tests
 * Story 17.1: Swedish Translations for Custom Column Management
 * 
 * Tests that all UI text in edit-column-modal uses Swedish translations
 */

import { screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditColumnModal } from "@/components/dashboard/edit-column-modal";
import { useColumns } from "@/lib/hooks/use-columns";
import { useUIStore } from "@/lib/store/ui-store";
import { columnService } from "@/lib/services/column-service";
import { toast } from "sonner";
import type { ColumnConfig } from "@/lib/types/column-config";

// Mock dependencies
vi.mock("@/lib/hooks/use-columns");
vi.mock("@/lib/store/ui-store");
vi.mock("@/lib/services/column-service");
vi.mock("sonner");

describe("EditColumnModal - Translations", () => {
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

  const mockCloseEditColumnModal = vi.fn();
  const mockRefetch = vi.fn();

  const mockColumns: ColumnConfig[] = [
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

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useColumns).mockReturnValue({
      columns: mockColumns,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    vi.mocked(useUIStore).mockReturnValue({
      modals: { editColumn: true },
      editColumnId: "col-1",
      closeEditColumnModal: mockCloseEditColumnModal,
      openModal: vi.fn(),
      openEditColumnModal: vi.fn(),
      isPreviewMode: false,
      previewRole: null,
      setPreviewRole: vi.fn(),
      setIsPreviewMode: vi.fn(),
      columnVisibility: {},
      initColumnVisibility: vi.fn(),
      setColumnVisibility: vi.fn(),
      toggleColumnVisibility: vi.fn(),
    });

    vi.mocked(columnService.updateCustomColumn).mockResolvedValue({
      ...mockColumns[0],
      column_name: "Updated Name",
    });
  });

  it("should display Swedish translation for modal title", () => {
    renderWithQueryClient(<EditColumnModal />);
    
    // Modal title should be in Swedish (from modals.editColumn.title)
    expect(screen.getByText("Redigera kolumn")).toBeInTheDocument();
  });

  it("should display Swedish translation for modal description", () => {
    renderWithQueryClient(<EditColumnModal />);
    
    // Modal description should be in Swedish
    expect(screen.getByText(/Uppdatera kolumnnamn eller kategori/i)).toBeInTheDocument();
  });

  it("should display Swedish translation for 'Titel' field label", () => {
    renderWithQueryClient(<EditColumnModal />);
    
    // AC3: Field label should be "Titel" (not "Column Name")
    const label = screen.getByText(/Titel/i);
    expect(label).toBeInTheDocument();
  });

  it("should display Swedish translation for category placeholder", async () => {
    // Use a column without a category to see the placeholder
    const columnWithoutCategory: ColumnConfig = {
      ...mockColumns[0],
      category: null,
    };
    
    vi.mocked(useColumns).mockReturnValue({
      columns: [columnWithoutCategory],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    vi.mocked(useUIStore).mockReturnValue({
      modals: { editColumn: true },
      editColumnId: columnWithoutCategory.id,
      closeEditColumnModal: mockCloseEditColumnModal,
      openModal: vi.fn(),
      openEditColumnModal: vi.fn(),
      isPreviewMode: false,
      previewRole: null,
      setPreviewRole: vi.fn(),
      setIsPreviewMode: vi.fn(),
      columnVisibility: {},
      initColumnVisibility: vi.fn(),
      setColumnVisibility: vi.fn(),
      toggleColumnVisibility: vi.fn(),
    });

    renderWithQueryClient(<EditColumnModal />);
    
    // AC3: Category combobox placeholder should be "Välj eller skriv en kategori"
    // There are two comboboxes (column type and category), so we need to find the category one
    await waitFor(() => {
      const comboboxes = screen.getAllByRole("combobox");
      // The category combobox is the second one (index 1)
      const categoryButton = comboboxes[1];
      expect(categoryButton).toHaveTextContent("Välj eller skriv en kategori");
    });
  });

  it("should display Swedish translation for save button", () => {
    renderWithQueryClient(<EditColumnModal />);
    
    // AC3: Save button should display "Spara"
    const saveButton = screen.getByRole("button", { name: /Spara/i });
    expect(saveButton).toBeInTheDocument();
  });

  it("should display Swedish translation for cancel button", () => {
    renderWithQueryClient(<EditColumnModal />);
    
    // Cancel button should be in Swedish
    const cancelButton = screen.getByRole("button", { name: /Avbryt/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it("should display 'Sparar...' when submitting", async () => {
    // Mock a slow update
    vi.mocked(columnService.updateCustomColumn).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ...mockColumns[0],
        column_name: "Updated Name",
      }), 100))
    );

    renderWithQueryClient(<EditColumnModal />);
    
    // Change the column name
    const input = screen.getByDisplayValue("Recruitment Team");
    fireEvent.change(input, { target: { value: "Updated Name" } });

    // Submit the form
    const saveButton = screen.getByRole("button", { name: /Spara/i });
    fireEvent.click(saveButton);

    // Should show "Sparar..." during submission
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sparar\.\.\./i })).toBeInTheDocument();
    });
  });

  it("should populate form with existing column data", () => {
    renderWithQueryClient(<EditColumnModal />);
    
    // Form should be pre-filled with column data
    expect(screen.getByDisplayValue("Recruitment Team")).toBeInTheDocument();
  });
});

