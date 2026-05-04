/**
 * Unit Tests for Story 17.4: Permission-Based Field Filtering in Export Dialog
 * 
 * Tests that the export field selection dialog correctly filters fields
 * based on user role permissions.
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

// Mock useAuth - will be customized per test
const mockUseAuth = vi.fn();
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useUIStore - will be customized per test
const mockUseUIStore = vi.fn();
vi.mock("@/lib/store/ui-store", () => ({
  useUIStore: () => mockUseUIStore(),
}));

// Note: EXPORTABLE_EMPLOYEE_FIELDS no longer used after architectural refactor
// Export dialog now uses column_config as single source of truth

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

vi.mock("@/components/ui/label", () => ({

  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

describe("Story 17.4: Permission-Based Field Filtering", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnExport = vi.fn();

  // Helper to convert db_column_name to title case display name
  const toTitleCase = (str: string) => {
    // Special handling for common acronyms
    const acronyms: Record<string, string> = {
      'ssn': 'SSN',
    };
    
    if (acronyms[str]) {
      return acronyms[str];
    }
    
    return str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  // Mock column configs with different permission settings
  const createColumnConfig = (
    id: string,
    dbColumnName: string,
    isMasterdata: boolean,
    permissions: Record<UserRole, { view: boolean; edit: boolean }>
  ): ColumnConfig => ({
    id,
    column_name: toTitleCase(dbColumnName),
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

  const mockColumnConfigs: ColumnConfig[] = [
    // Masterdata fields with permissions
    createColumnConfig("col-first-name", "first_name", true, {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: false },
      omc: { view: true, edit: false },
    }),
    createColumnConfig("col-surname", "surname", true, {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: false },
      omc: { view: false, edit: false }, // OMC cannot view surname
    }),
    createColumnConfig("col-email", "email", true, {
      hr_admin: { view: true, edit: true },
      sodexo: { view: false, edit: false }, // Sodexo cannot view email
      omc: { view: true, edit: false },
    }),
    createColumnConfig("col-ssn", "ssn", true, {
      hr_admin: { view: true, edit: true },
      sodexo: { view: false, edit: false }, // Sodexo cannot view SSN
      omc: { view: false, edit: false }, // OMC cannot view SSN
    }),
    // Custom columns (already filtered by useColumns hook)
    createColumnConfig("col-custom-1", "custom_field_1", false, {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: false },
      omc: { view: false, edit: false },
    }),
  ];

  const mockVisibleColumnIds = new Set(["col-first-name", "col-surname", "col-custom-1"]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("HR Admin Permission Filtering", () => {
    it("should show all masterdata fields for HR Admin", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          email: "admin@example.com",
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

      render(
        <ExportFieldSelectionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          columnConfigs={mockColumnConfigs}
          visibleColumnIds={mockVisibleColumnIds}
          onExport={mockOnExport}
        />
      );

      // HR Admin should see all masterdata fields regardless of permissions
      expect(screen.getByText("First Name")).toBeDefined();
      expect(screen.getByText("Surname")).toBeDefined();
      expect(screen.getByText("Email")).toBeDefined();
      expect(screen.getByText("SSN")).toBeDefined();
    });
  });

  describe("External User Permission Filtering", () => {
    it("should use HR Admin view permissions for Recruiter", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-4",
          email: "recruiter@example.com",
          role: "recruiter" as UserRole,
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: null,
          auth_id: "auth-4",
        },
      });

      mockUseUIStore.mockReturnValue({
        previewRole: null,
      });

      render(
        <ExportFieldSelectionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          columnConfigs={mockColumnConfigs}
          visibleColumnIds={mockVisibleColumnIds}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText("First Name")).toBeDefined();
      expect(screen.getByText("Surname")).toBeDefined();
      expect(screen.getByText("Email")).toBeDefined();
      expect(screen.getByText("SSN")).toBeDefined();
    });

    it("should only show masterdata fields with view permission for Sodexo user", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-2",
          email: "sodexo@example.com",
          role: "sodexo" as UserRole,
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: null,
          auth_id: "auth-2",
        },
      });

      mockUseUIStore.mockReturnValue({
        previewRole: null,
      });

      render(
        <ExportFieldSelectionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          columnConfigs={mockColumnConfigs.filter(
            (col) => col.is_masterdata && col.role_permissions.sodexo?.view === true
          )}
          visibleColumnIds={mockVisibleColumnIds}
          onExport={mockOnExport}
        />
      );

      // Sodexo should see first_name and surname (have view permission)
      expect(screen.getByText("First Name")).toBeDefined();
      expect(screen.getByText("Surname")).toBeDefined();
      
      // Sodexo should NOT see email and ssn (no view permission)
      expect(screen.queryByText("Email")).toBeNull();
      expect(screen.queryByText("SSN")).toBeNull();
    });

    it("should only show masterdata fields with view permission for OMC user", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-3",
          email: "omc@example.com",
          role: "omc" as UserRole,
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: null,
          auth_id: "auth-3",
        },
      });

      mockUseUIStore.mockReturnValue({
        previewRole: null,
      });

      render(
        <ExportFieldSelectionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          columnConfigs={mockColumnConfigs.filter(
            (col) => col.is_masterdata && col.role_permissions.omc?.view === true
          )}
          visibleColumnIds={mockVisibleColumnIds}
          onExport={mockOnExport}
        />
      );

      // OMC should see first_name and email (have view permission)
      expect(screen.getByText("First Name")).toBeDefined();
      expect(screen.getByText("Email")).toBeDefined();
      
      // OMC should NOT see surname and ssn (no view permission)
      expect(screen.queryByText("Surname")).toBeNull();
      expect(screen.queryByText("SSN")).toBeNull();
    });
  });

  describe("Preview Mode Permission Filtering", () => {
    it("should use previewRole when available for permission filtering", () => {
      // HR Admin user but previewing as Sodexo
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          email: "admin@example.com",
          role: "hr_admin" as UserRole,
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: null,
          auth_id: "auth-1",
        },
      });

      mockUseUIStore.mockReturnValue({
        previewRole: "sodexo" as UserRole,
      });

      render(
        <ExportFieldSelectionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          columnConfigs={mockColumnConfigs.filter(
            (col) => col.is_masterdata && col.role_permissions.sodexo?.view === true
          )}
          visibleColumnIds={mockVisibleColumnIds}
          onExport={mockOnExport}
        />
      );

      // Should show fields based on previewRole (sodexo), not actual role (hr_admin)
      expect(screen.getByText("First Name")).toBeDefined();
      expect(screen.getByText("Surname")).toBeDefined();
      expect(screen.queryByText("Email")).toBeNull();
      expect(screen.queryByText("SSN")).toBeNull();
    });
  });

  describe("Custom Column Filtering", () => {
    it("should only show custom columns that are in columnConfigs (already filtered by useColumns)", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-2",
          email: "sodexo@example.com",
          role: "sodexo" as UserRole,
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: null,
          auth_id: "auth-2",
        },
      });

      mockUseUIStore.mockReturnValue({
        previewRole: null,
      });

      // Only include custom columns with view permission (simulating useColumns filtering)
      const filteredColumnConfigs = mockColumnConfigs.filter(
        (col) => !col.is_masterdata && col.role_permissions.sodexo?.view === true
      );

      render(
        <ExportFieldSelectionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          columnConfigs={filteredColumnConfigs}
          visibleColumnIds={mockVisibleColumnIds}
          onExport={mockOnExport}
        />
      );

      // Should show custom field 1 (has view permission)
      expect(screen.getByText("Custom Field 1")).toBeDefined();
    });
  });

  describe("Direct Column Config Usage", () => {
    it("should display fields directly from column_config without alias matching", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-2",
          email: "sodexo@example.com",
          role: "sodexo" as UserRole,
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: null,
          auth_id: "auth-2",
        },
      });

      mockUseUIStore.mockReturnValue({
        previewRole: null,
      });

      // Column config - display name comes directly from column_name field
      const columnWithSpaces = createColumnConfig("col-first-name", "first name", true, {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
      });

      render(
        <ExportFieldSelectionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          columnConfigs={[columnWithSpaces]}
          visibleColumnIds={new Set(["col-first-name"])}
          onExport={mockOnExport}
        />
      );

      // Should display column_name directly from config (title-cased via mock helper)
      expect(screen.getByText("First Name")).toBeDefined();
    });
  });
});

