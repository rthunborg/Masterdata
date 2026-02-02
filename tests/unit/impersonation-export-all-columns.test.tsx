/**
 * Tests for Story 17.4: Impersonation Export - All Columns Included
 * 
 * Verifies that when HR Admin impersonates another role and exports employees,
 * ALL columns that the impersonated role has view permission for are included
 * in the export dialog, regardless of:
 * - Whether HR Admin has permission for those columns
 * - Whether the column values are null/empty for selected employees
 */

import { render, screen, waitFor } from "@testing-library/react";
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/dashboard",
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ""),
  }),
  usePathname: () => "/dashboard",
}));

  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

describe("Impersonation Export - All Columns Included", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create column config
  const createColumnConfig = (
    id: string,
    columnName: string,
    dbColumnName: string,
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
    display_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  it("should include ALL columns that OMC has permission for, even if HR Admin doesn't", () => {
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

    // Create columns where OMC has view permission but HR Admin doesn't
    const omcColumn1 = createColumnConfig("omc-1", "OMC Field 1", "omc_field_1", false, {
      hr_admin: { view: false, edit: false }, // HR Admin has NO permission
      omc: { view: true, edit: true },         // OMC has full permission
      sodexo: { view: false, edit: false },
      payroll: { view: false, edit: false },
      toplux: { view: false, edit: false },
    });

    const omcColumn2 = createColumnConfig("omc-2", "OMC Field 2", "omc_field_2", false, {
      hr_admin: { view: false, edit: false }, // HR Admin has NO permission
      omc: { view: true, edit: false },        // OMC has view permission
      sodexo: { view: false, edit: false },
      payroll: { view: false, edit: false },
      toplux: { view: false, edit: false },
    });

    const omcColumn3 = createColumnConfig("omc-3", "OMC Field 3", "omc_field_3", false, {
      hr_admin: { view: false, edit: false }, // HR Admin has NO permission
      omc: { view: true, edit: false },        // OMC has view permission
      sodexo: { view: false, edit: false },
      payroll: { view: false, edit: false },
      toplux: { view: false, edit: false },
    });

    // Pass ALL columns (including ones HR Admin doesn't have permission for)
    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={[omcColumn1, omcColumn2, omcColumn3]}
        visibleColumnIds={new Set()}
        onExport={mockOnExport}
      />
    );

    // All OMC columns should be visible since we're impersonating OMC
    expect(screen.getByText("OMC Field 1")).toBeDefined();
    expect(screen.getByText("OMC Field 2")).toBeDefined();
    expect(screen.getByText("OMC Field 3")).toBeDefined();
  });

  it("should include columns even if their values are null/empty for selected employees", () => {
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
      previewRole: "sodexo" as UserRole,
    });

    // Create columns that might have null/empty values
    const columnWithNullValues = createColumnConfig("sodexo-1", "Diet Preferences", "diet_preferences", false, {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: true },
      omc: { view: false, edit: false },
      payroll: { view: false, edit: false },
      toplux: { view: false, edit: false },
    });

    const columnWithEmptyValues = createColumnConfig("sodexo-2", "Special Notes", "special_notes", false, {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: false },
      omc: { view: false, edit: false },
      payroll: { view: false, edit: false },
      toplux: { view: false, edit: false },
    });

    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={[columnWithNullValues, columnWithEmptyValues]}
        visibleColumnIds={new Set()}
        onExport={mockOnExport}
      />
    );

    // Columns should be available even if values might be null/empty
    // The export dialog shows STRUCTURE, not data values
    expect(screen.getByText("Diet Preferences")).toBeDefined();
    expect(screen.getByText("Special Notes")).toBeDefined();
  });

  it("should show ALL 10+ OMC columns when impersonating OMC", () => {
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

    // Create 10+ OMC columns to simulate real scenario
    const omcColumns = Array.from({ length: 12 }, (_, i) => 
      createColumnConfig(
        `omc-col-${i}`, 
        `OMC Column ${i + 1}`, 
        `omc_column_${i + 1}`, 
        false,
        {
          hr_admin: { view: i < 2, edit: i < 2 }, // HR Admin only has permission for first 2
          omc: { view: true, edit: true },         // OMC has permission for all
          sodexo: { view: false, edit: false },
          payroll: { view: false, edit: false },
          toplux: { view: false, edit: false },
        }
      )
    );

    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={omcColumns}
        visibleColumnIds={new Set()}
        onExport={mockOnExport}
      />
    );

    // All 12 OMC columns should be visible (not just the 2 HR Admin has permission for)
    for (let i = 1; i <= 12; i++) {
      expect(screen.getByText(`OMC Column ${i}`)).toBeDefined();
    }
  });

  it("should NOT show columns that impersonated role doesn't have permission for", () => {
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
      previewRole: "payroll" as UserRole,
    });

    const payrollColumn = createColumnConfig("payroll-1", "Payroll Data", "payroll_data", false, {
      hr_admin: { view: true, edit: true },
      payroll: { view: true, edit: true },
      sodexo: { view: false, edit: false },  // Sodexo has NO permission
      omc: { view: false, edit: false },
      toplux: { view: false, edit: false },
    });

    const sodexoColumn = createColumnConfig("sodexo-1", "Sodexo Data", "sodexo_data", false, {
      hr_admin: { view: true, edit: true },
      payroll: { view: false, edit: false },  // Payroll has NO permission
      sodexo: { view: true, edit: true },
      omc: { view: false, edit: false },
      toplux: { view: false, edit: false },
    });

    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={[payrollColumn, sodexoColumn]}
        visibleColumnIds={new Set()}
        onExport={mockOnExport}
      />
    );

    // When impersonating Payroll, should see payroll column but NOT sodexo column
    expect(screen.getByText("Payroll Data")).toBeDefined();
    expect(screen.queryByText("Sodexo Data")).toBeNull(); // Should NOT be visible
  });

  it("should handle masterdata columns with impersonated role permissions", () => {
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
      previewRole: "toplux" as UserRole,
    });

    const masterdataCol1 = createColumnConfig("master-1", "First Name", "first_name", true, {
      hr_admin: { view: true, edit: true },
      toplux: { view: true, edit: false },
      sodexo: { view: true, edit: false },
      omc: { view: true, edit: false },
      payroll: { view: true, edit: false },
    });

    const masterdataCol2 = createColumnConfig("master-2", "SSN", "ssn", true, {
      hr_admin: { view: true, edit: true },
      toplux: { view: true, edit: false },  // Toplux CAN view SSN
      sodexo: { view: false, edit: false },
      omc: { view: false, edit: false },
      payroll: { view: true, edit: false },
    });

    const masterdataCol3 = createColumnConfig("master-3", "Email", "email", true, {
      hr_admin: { view: true, edit: true },
      toplux: { view: false, edit: false },  // Toplux CANNOT view Email
      sodexo: { view: true, edit: false },
      omc: { view: true, edit: false },
      payroll: { view: true, edit: false },
    });

    render(
      <ExportFieldSelectionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        columnConfigs={[masterdataCol1, masterdataCol2, masterdataCol3]}
        visibleColumnIds={new Set()}
        onExport={mockOnExport}
      />
    );

    // Toplux should see First Name and SSN, but NOT Email
    expect(screen.getByText("First Name")).toBeDefined();
    expect(screen.getByText("SSN")).toBeDefined();
    expect(screen.queryByText("Email")).toBeNull();
  });
});
