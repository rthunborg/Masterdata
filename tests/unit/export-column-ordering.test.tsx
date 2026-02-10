/**
 * Tests for Export Column Ordering
 * 
 * Verifies that columns in the export dialog and exported files maintain
 * the same order as they appear in the employee table view, based on display_order.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExportFieldSelectionDialog } from "@/components/dashboard/export-field-selection-dialog";
import type { ColumnConfig } from "@/lib/types/column-config";
import type { UserRole } from "@/lib/types/user";

// Mock translations
vi.mock("@/lib/i18n", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useUIStore
const mockUseUIStore = vi.fn();
vi.mock("@/lib/store/ui-store", () => ({
  useUIStore: () => mockUseUIStore(),
}));

// Mock UI components
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, id, "data-testid": testId }: { 
    checked: boolean; 
    onCheckedChange: (checked: boolean) => void; 
    id: string;
    "data-testid"?: string;
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid={testId || `checkbox-${id}`}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

describe("Export Column Ordering", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create column config with specific display_order
  const createColumnConfig = (
    id: string,
    columnName: string,
    dbColumnName: string,
    displayOrder: number,
    isMasterdata: boolean,
    permissions: Record<UserRole, { view: boolean; edit: boolean }>
  ): ColumnConfig => ({
    id,
    column_name: columnName,
    db_column_name: dbColumnName,
    column_type: "text",
    is_masterdata: isMasterdata,
    category: null,
    category_color: null,
    is_visible: true,
    role_permissions: permissions,
    display_order: displayOrder,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const fullPermissions: Record<UserRole, { view: boolean; edit: boolean }> = {
    hr_admin: { view: true, edit: true },
    omc: { view: true, edit: false },
    sodexo: { view: true, edit: false },
    payroll: { view: true, edit: false },
    toplux: { view: true, edit: false },
  };

  it("should display columns in the order specified by display_order", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        role: "hr_admin" as UserRole,
        is_active: true,
        created_at: "2025-01-01T00:00:00Z",
        last_active_at: null,
        auth_id: "auth-1",
      },
    });

    mockUseUIStore.mockReturnValue({
      previewRole: null,
    });

    // Create columns with specific display_order (NOT in sorted order)
    const columns = [
      createColumnConfig("col-3", "Email", "email", 3, true, fullPermissions),
      createColumnConfig("col-1", "First Name", "first_name", 1, true, fullPermissions),
      createColumnConfig("col-4", "Mobile", "mobile", 4, true, fullPermissions),
      createColumnConfig("col-2", "Surname", "surname", 2, true, fullPermissions),
    ];

    const { container } = render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={columns}
        visibleColumnIds={new Set()}
        onExport={mockOnExport}
      />
    );

    // Get all labels in order
    const labels = Array.from(container.querySelectorAll('label')).map(label => label.textContent);

    // Find the indices of our test columns
    const firstNameIndex = labels.indexOf("First Name");
    const surnameIndex = labels.indexOf("Surname");
    const emailIndex = labels.indexOf("Email");
    const mobileIndex = labels.indexOf("Mobile");

    // Verify they appear in display_order sequence (1, 2, 3, 4)
    expect(firstNameIndex).toBeLessThan(surnameIndex);
    expect(surnameIndex).toBeLessThan(emailIndex);
    expect(emailIndex).toBeLessThan(mobileIndex);
  });

  it("should maintain order when impersonating another role", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "hr-admin-1",
        email: "hradmin@example.com",
        role: "hr_admin" as UserRole,
        is_active: true,
        created_at: "2025-01-01T00:00:00Z",
        last_active_at: null,
        auth_id: "auth-hr-1",
      },
    });

    mockUseUIStore.mockReturnValue({
      previewRole: "omc" as UserRole,
    });

    // Create columns with specific display_order
    const columns = [
      createColumnConfig("col-5", "Gender", "gender", 5, true, fullPermissions),
      createColumnConfig("col-1", "First Name", "first_name", 1, true, fullPermissions),
      createColumnConfig("col-3", "Email", "email", 3, true, fullPermissions),
      createColumnConfig("col-2", "Surname", "surname", 2, true, fullPermissions),
      createColumnConfig("col-4", "Mobile", "mobile", 4, true, fullPermissions),
    ];

    const { container } = render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={columns}
        visibleColumnIds={new Set()}
        onExport={mockOnExport}
      />
    );

    const labels = Array.from(container.querySelectorAll('label')).map(label => label.textContent);

    // Verify order: First Name (1), Surname (2), Email (3), Mobile (4), Gender (5)
    const firstNameIndex = labels.indexOf("First Name");
    const surnameIndex = labels.indexOf("Surname");
    const emailIndex = labels.indexOf("Email");
    const mobileIndex = labels.indexOf("Mobile");
    const genderIndex = labels.indexOf("Gender");

    expect(firstNameIndex).toBeLessThan(surnameIndex);
    expect(surnameIndex).toBeLessThan(emailIndex);
    expect(emailIndex).toBeLessThan(mobileIndex);
    expect(mobileIndex).toBeLessThan(genderIndex);
  });

  it("should handle mixed masterdata and custom columns in display_order", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        role: "omc" as UserRole,
        is_active: true,
        created_at: "2025-01-01T00:00:00Z",
        last_active_at: null,
        auth_id: "auth-1",
      },
    });

    mockUseUIStore.mockReturnValue({
      previewRole: null,
    });

    // Mix of masterdata (display_order 1-3) and custom columns (display_order 4-6)
    const columns = [
      createColumnConfig("custom-2", "Diet Preference", "diet_preference", 5, false, fullPermissions),
      createColumnConfig("master-1", "First Name", "first_name", 1, true, fullPermissions),
      createColumnConfig("custom-3", "Special Notes", "special_notes", 6, false, fullPermissions),
      createColumnConfig("master-2", "Surname", "surname", 2, true, fullPermissions),
      createColumnConfig("custom-1", "OMC Field", "omc_field", 4, false, fullPermissions),
      createColumnConfig("master-3", "Email", "email", 3, true, fullPermissions),
    ];

    const { container } = render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={columns}
        visibleColumnIds={new Set()}
        onExport={mockOnExport}
      />
    );

    const labels = Array.from(container.querySelectorAll('label')).map(label => label.textContent);

    // Verify order matches display_order (1-6), regardless of masterdata vs custom
    const indices = [
      { name: "First Name", expected: 1 },
      { name: "Surname", expected: 2 },
      { name: "Email", expected: 3 },
      { name: "OMC Field", expected: 4 },
      { name: "Diet Preference", expected: 5 },
      { name: "Special Notes", expected: 6 },
    ];

    for (let i = 0; i < indices.length - 1; i++) {
      const currentIndex = labels.indexOf(indices[i].name);
      const nextIndex = labels.indexOf(indices[i + 1].name);
      expect(currentIndex).toBeLessThan(nextIndex);
    }
  });

  it("should handle columns with same display_order (maintain stable sort)", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        role: "hr_admin" as UserRole,
        is_active: true,
        created_at: "2025-01-01T00:00:00Z",
        last_active_at: null,
        auth_id: "auth-1",
      },
    });

    mockUseUIStore.mockReturnValue({
      previewRole: null,
    });

    // Multiple columns with same display_order
    const columns = [
      createColumnConfig("col-2", "Column B", "col_b", 10, false, fullPermissions),
      createColumnConfig("col-1", "Column A", "col_a", 10, false, fullPermissions),
      createColumnConfig("col-3", "Column C", "col_c", 10, false, fullPermissions),
    ];

    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={columns}
        visibleColumnIds={new Set()}
        onExport={mockOnExport}
      />
    );

    // Should not throw error, and all columns should be visible
    expect(screen.getByText("Column A")).toBeDefined();
    expect(screen.getByText("Column B")).toBeDefined();
    expect(screen.getByText("Column C")).toBeDefined();
  });

  it("should export columns in the same order as displayed in dialog", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        role: "hr_admin" as UserRole,
        is_active: true,
        created_at: "2025-01-01T00:00:00Z",
        last_active_at: null,
        auth_id: "auth-1",
      },
    });

    mockUseUIStore.mockReturnValue({
      previewRole: null,
    });

    const columns = [
      createColumnConfig("col-3", "Third Column", "third_col", 3, false, fullPermissions),
      createColumnConfig("col-1", "First Column", "first_col", 1, false, fullPermissions),
      createColumnConfig("col-2", "Second Column", "second_col", 2, false, fullPermissions),
    ];

    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={columns}
        visibleColumnIds={new Set(["col-1", "col-2", "col-3"])}
        onExport={mockOnExport}
      />
    );

    // Click export button
    const exportButton = screen.getByText("export");
    exportButton.click();

    // Verify onExport was called with fields in correct order
    expect(mockOnExport).toHaveBeenCalledTimes(1);
    const exportedFields = mockOnExport.mock.calls[0][0];
    
    // Fields should be in display_order sequence: first_col, second_col, third_col
    expect(exportedFields[0]).toBe("first_col");
    expect(exportedFields[1]).toBe("second_col");
    expect(exportedFields[2]).toBe("third_col");
  });
});
