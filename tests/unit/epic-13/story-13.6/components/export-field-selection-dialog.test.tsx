import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ExportFieldSelectionDialog } from "@/components/dashboard/export-field-selection-dialog";
import { ColumnConfig } from "@/lib/types/column-config";

// Mock translations
vi.mock("@/lib/i18n", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useAuth
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "test@example.com",
      role: "hr_admin",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      last_active_at: null,
      auth_id: "auth-1",
    },
  }),
}));

// Mock useUIStore
vi.mock("@/lib/store/ui-store", () => ({
  useUIStore: () => ({
    previewRole: null,
  }),
}));

// Mock constants
vi.mock("@/lib/constants/export-fields", () => ({
  EXPORTABLE_EMPLOYEE_FIELDS: [
    { key: "first_name", label: "First Name" },
    { key: "last_name", label: "Last Name" },
  ],
}));

// Mock UI components
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div>{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, id }: { checked: boolean; onCheckedChange: (checked: boolean) => void; id: string }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid={`checkbox-${id}`}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

describe("ExportFieldSelectionDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnExport = vi.fn();

  const mockColumnConfigs: ColumnConfig[] = [
    {
      id: "col1",
      column_name: "Custom Field 1",
      db_column_name: "custom_field_1",
      column_type: "text",
      is_masterdata: false,
      category: "Category A",
      category_color: null,
      is_visible: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
      },
      display_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "col2",
      column_name: "Custom Field 2",
      db_column_name: "custom_field_2",
      column_type: "text",
      is_masterdata: false,
      category: "Category B",
      category_color: null,
      is_visible: false,
      role_permissions: {
        hr_admin: { view: true, edit: true },
      },
      display_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "col3",
      column_name: "First Name",
      db_column_name: "first_name",
      column_type: "text",
      is_masterdata: true,
      category: null,
      category_color: null,
      is_visible: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
      },
      display_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockVisibleColumnIds = new Set(["col1", "col3"]);

  it("renders correctly when open", () => {
    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={mockColumnConfigs}
        visibleColumnIds={mockVisibleColumnIds}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText("export.selectFields")).toBeDefined();
    expect(screen.getByText("First Name")).toBeDefined();
    expect(screen.getByText("Custom Field 1")).toBeDefined();
    expect(screen.getByText("Custom Field 2")).toBeDefined();
  });

  it("pre-selects visible columns", () => {
    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={mockColumnConfigs}
        visibleColumnIds={mockVisibleColumnIds}
        onExport={mockOnExport}
      />
    );

    // First Name (masterdata) is visible (col3)
    const firstNameCheckbox = screen.getByTestId("checkbox-masterdata_first_name") as HTMLInputElement;
    expect(firstNameCheckbox.checked).toBe(true);

    // Custom Field 1 is visible (col1)
    const customField1Checkbox = screen.getByTestId("checkbox-col1") as HTMLInputElement;
    expect(customField1Checkbox.checked).toBe(true);

    // Custom Field 2 is NOT visible (col2)
    const customField2Checkbox = screen.getByTestId("checkbox-col2") as HTMLInputElement;
    expect(customField2Checkbox.checked).toBe(false);
    
    // Last Name (masterdata) is NOT visible (no matching visible column config)
    const lastNameCheckbox = screen.getByTestId("checkbox-masterdata_last_name") as HTMLInputElement;
    expect(lastNameCheckbox.checked).toBe(false);
  });

  it("allows toggling fields", () => {
    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={mockColumnConfigs}
        visibleColumnIds={mockVisibleColumnIds}
        onExport={mockOnExport}
      />
    );

    const customField2Checkbox = screen.getByTestId("checkbox-col2") as HTMLInputElement;
    expect(customField2Checkbox.checked).toBe(false);

    fireEvent.click(customField2Checkbox);
    expect(customField2Checkbox.checked).toBe(true);

    fireEvent.click(customField2Checkbox);
    expect(customField2Checkbox.checked).toBe(false);
  });

  it("calls onExport with selected field keys", () => {
    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={mockColumnConfigs}
        visibleColumnIds={mockVisibleColumnIds}
        onExport={mockOnExport}
      />
    );

    // Initially selected: First Name (first_name), Custom Field 1 (custom_field_1)
    // Select Custom Field 2 (custom_field_2)
    const customField2Checkbox = screen.getByTestId("checkbox-col2");
    fireEvent.click(customField2Checkbox);

    const exportButton = screen.getByText("export");
    fireEvent.click(exportButton);

    expect(mockOnExport).toHaveBeenCalledWith(expect.arrayContaining([
      "first_name",
      "custom_field_1",
      "custom_field_2"
    ]));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onOpenChange when cancel is clicked", () => {
    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={mockColumnConfigs}
        visibleColumnIds={mockVisibleColumnIds}
        onExport={mockOnExport}
      />
    );

    const cancelButton = screen.getByText("cancel");
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables export button when no fields are selected", () => {
    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={mockColumnConfigs}
        visibleColumnIds={new Set()} // No visible columns
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByText("export") as HTMLButtonElement;
    expect(exportButton.disabled).toBe(true);
  });
});
