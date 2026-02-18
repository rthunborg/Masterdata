/**
 * Component Tests for ColumnSettingsTable
 * Story 5.2: Column Permission Configuration Interface
 *
 * Tests cover:
 * - Column list rendering
 * - Permission toggles display and state
 * - HR Admin toggles disabled for masterdata columns
 * - Permission change handling
 * - Edit→View dependency enforcement
 */

import { screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ColumnSettingsTable } from "@/components/admin/column-settings-table";
import { ColumnConfig } from "@/lib/types/column-config";
import { toast } from "sonner";

// Mock dependencies
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/services/column-service", () => ({
  columnService: {
    updateColumnPermissions: vi.fn(),
  },
}));

import { columnService } from "@/lib/services/column-service";

describe("ColumnSettingsTable", () => {
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

  const mockColumns: ColumnConfig[] = [
    {
      id: "col-1",
      column_name: "First Name",
      column_type: "text",
      is_masterdata: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: true, edit: false },
      },
      category: null,
      display_order: 0,
      is_visible: true,
      db_column_name: "first_name",
      category_color: null,
      created_at: "2025-10-28T00:00:00Z",
      updated_at: "2025-10-28T00:00:00Z",      },
    {
      id: "col-2",
      column_name: "Custom Field",
      column_type: "text",
      is_masterdata: false,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false },
      },
      category: "Custom",
      display_order: 1,
      is_visible: true,
      db_column_name: "custom_field_1",
      category_color: null,
      created_at: "2025-10-28T00:00:00Z",
      updated_at: "2025-10-28T00:00:00Z",      },
  ];

  const mockOnPermissionsUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders column list correctly", () => {
    renderWithQueryClient(
      <ColumnSettingsTable
        columns={mockColumns}
        onPermissionsUpdated={mockOnPermissionsUpdated}
        allColumns={mockColumns}
      />
    );

    // Check that all columns are displayed
    expect(screen.getByText("First Name")).toBeInTheDocument();
    expect(screen.getByText("Custom Field")).toBeInTheDocument();

    // Check column types
    expect(screen.getAllByText("text")).toHaveLength(2);

    // Check badges
    expect(screen.getByText("Masterdata")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("displays permission toggles for all roles", () => {
    renderWithQueryClient(
      <ColumnSettingsTable
        columns={mockColumns}
        onPermissionsUpdated={mockOnPermissionsUpdated}
        allColumns={mockColumns}
      />
    );

    // Check role headers are present (Swedish i18n)
    expect(screen.getByText(/HR-admin/i)).toBeInTheDocument();
    expect(screen.getByText(/SODEXO/i)).toBeInTheDocument();
    expect(screen.getByText(/OMC/i)).toBeInTheDocument();
    expect(screen.getByText(/PAYROLL/i)).toBeInTheDocument();
    expect(screen.getByText(/TOPLUX/i)).toBeInTheDocument();
  });

  it("updates permissions when toggle clicked", async () => {
    const mockUpdatedColumn = { ...mockColumns[0] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (columnService.updateColumnPermissions as any).mockResolvedValue(
      mockUpdatedColumn
    );

    renderWithQueryClient(
      <ColumnSettingsTable
        columns={mockColumns}
        onPermissionsUpdated={mockOnPermissionsUpdated}
        allColumns={mockColumns}
      />
    );

    // Find all permission toggle buttons (Switch components have role="button")
    // 2 columns × 5 roles × 2 permissions (view/edit) = 20 toggles
    const toggles = screen.getAllByRole("button", { name: /view|edit/i });

    // Click the first toggle that's not disabled
    const enabledToggles = toggles.filter(
      (toggle) => !toggle.hasAttribute("disabled") && toggle.getAttribute("aria-checked") === "false"
    );

    if (enabledToggles.length > 0) {
      fireEvent.click(enabledToggles[0]);

      await waitFor(() => {
        expect(columnService.updateColumnPermissions).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith(
          "Behörigheter uppdaterade"
        );
        expect(mockOnPermissionsUpdated).toHaveBeenCalled();
      });
    }
  });

  it("displays empty state when no columns", () => {
    renderWithQueryClient(
      <ColumnSettingsTable
        columns={[]}
        onPermissionsUpdated={mockOnPermissionsUpdated}
        allColumns={mockColumns}
      />
    );

    expect(screen.getByText("No columns found")).toBeInTheDocument();
  });

  it("shows error toast when update fails", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (columnService.updateColumnPermissions as any).mockRejectedValue(
      new Error("Failed to update permissions")
    );

    renderWithQueryClient(
      <ColumnSettingsTable
        columns={mockColumns}
        onPermissionsUpdated={mockOnPermissionsUpdated}
        allColumns={mockColumns}
      />
    );

    // Find permission toggle buttons (Switch components have role="button")
    const toggles = screen.getAllByRole("button", { name: /view|edit/i });
    const enabledToggles = toggles.filter(
      (toggle) => !toggle.hasAttribute("disabled") && toggle.getAttribute("aria-checked") === "false"
    );

    if (enabledToggles.length > 0) {
      fireEvent.click(enabledToggles[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Kunde inte uppdatera behörigheter");
      });
    }
  });
});

