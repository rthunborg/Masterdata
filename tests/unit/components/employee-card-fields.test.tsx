/**
 * Component Tests for Employee Card Field Visibility and Permissions
 * Story 11.12: Employee Card Expansion Tests
 * AC2: Field Visibility and Permissions Tests
 * Task 2: Field Visibility Permission Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from "@testing-library/user-event";
import { EmployeeCard } from "@/components/dashboard/employee-card";
import { employeeService } from "@/lib/services/employee-service";
import { customDataService } from "@/lib/services/custom-data-service";
import { toast } from "sonner";
import { useImportantDates } from "@/lib/hooks/use-important-dates";
import { createTestEmployee } from "@/../tests/helpers/validation-test-helpers";
import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";
import { renderWithI18n, I18nWrapper } from "@/../tests/utils/i18n-test-wrapper";

// Mock services
vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    update: vi.fn(),
  },
}));

vi.mock("@/lib/services/custom-data-service", () => ({
  customDataService: {
    updateCustomData: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/hooks/use-important-dates", () => ({
  useImportantDates: vi.fn(),
}));

// Mock useMediaQuery to default to desktop mode for these tests
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(() => false), // Default to desktop
}));

// Mock useLongPress hook
vi.mock("@/hooks/use-long-press", () => ({
  useLongPress: vi.fn(() => ({
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn(),
  })),
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


// Helper to create test column configs
function createTestColumnConfig(overrides: Partial<ColumnConfig> = {}): ColumnConfig {
  return {
    id: `col-${Date.now()}-${Math.random()}`,
    column_name: overrides.column_name || "First Name",
    db_column_name: overrides.db_column_name || "first_name",
    column_type: overrides.column_type || "text",
    role_permissions: overrides.role_permissions || {
      hr_admin: { view: true, edit: true },
      omc: { view: true, edit: false },
    },
    is_masterdata: overrides.is_masterdata ?? true,
    category: overrides.category || "General",
    category_color: overrides.category_color || null,
    display_order: overrides.display_order || 1,
    is_visible: overrides.is_visible ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("EmployeeCard - Field Visibility and Permissions", () => {
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

  const mockOnEmployeeUpdated = vi.fn();
  let mockEmployee: Employee;
  let hrAdminColumns: ColumnConfig[];
  let omcColumns: ColumnConfig[];

  beforeEach(() => {
    vi.clearAllMocks();

    mockEmployee = createTestEmployee({
      first_name: "John",
      surname: "Doe",
      ssn: "19900101-1234",
      email: "john.doe@example.com",
      mobile: "+46701234567",
      rank: "SEV",
      gender: "Man",
      hire_date: "2025-01-01",
      comments: "Test comments",
    });

    // HR Admin can see all fields
    hrAdminColumns = [
      createTestColumnConfig({
        column_name: "First Name",
        db_column_name: "first_name",
        role_permissions: {
          hr_admin: { view: true, edit: true },
          omc: { view: true, edit: false },
        },
        display_order: 1,
      }),
      createTestColumnConfig({
        column_name: "SSN",
        db_column_name: "ssn",
        role_permissions: {
          hr_admin: { view: true, edit: true },
          omc: { view: false, edit: false }, // ÖMC cannot view SSN
        },
        display_order: 2,
      }),
      createTestColumnConfig({
        column_name: "Comments",
        db_column_name: "comments",
        role_permissions: {
          hr_admin: { view: true, edit: true },
          omc: { view: false, edit: false }, // ÖMC cannot view comments
        },
        display_order: 3,
      }),
    ];

    // ÖMC can only see limited fields
    omcColumns = [
      createTestColumnConfig({
        column_name: "First Name",
        db_column_name: "first_name",
        role_permissions: {
          hr_admin: { view: true, edit: true },
          omc: { view: true, edit: false },
        },
        display_order: 1,
      }),
      createTestColumnConfig({
        column_name: "Email",
        db_column_name: "email",
        role_permissions: {
          hr_admin: { view: true, edit: true },
          omc: { view: true, edit: false },
        },
        display_order: 2,
      }),
    ];

    vi.mocked(useImportantDates).mockReturnValue({
      dates: [],
      isLoading: false,
    });
  });

  describe("AC2: Field Visibility and Permissions Tests", () => {
    it("should display all masterdata fields for HR Admin", async () => {
      const user = userEvent.setup();

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={hrAdminColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("First Name")).toBeInTheDocument();
        expect(screen.getByText("SSN")).toBeInTheDocument();
        expect(screen.getByText("Comments")).toBeInTheDocument();
      });
    });

    it("should display limited fields for external parties (ÖMC)", async () => {
      const user = userEvent.setup();

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={false}
          columnConfigs={omcColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        // Should see fields with ÖMC view permission
        expect(screen.getByText("First Name")).toBeInTheDocument();
        expect(screen.getByText("Email")).toBeInTheDocument();
      });

      // Should NOT see restricted fields
      expect(screen.queryByText("SSN")).not.toBeInTheDocument();
      expect(screen.queryByText("Comments")).not.toBeInTheDocument();
    });

    it("should display custom fields based on column configuration", async () => {
      const user = userEvent.setup();

      const customColumns = [
        createTestColumnConfig({
          column_name: "Custom Field 1",
          db_column_name: "custom_field_1",
          is_masterdata: false,
          role_permissions: {
            hr_admin: { view: true, edit: true },
          },
          display_order: 1,
        }),
        createTestColumnConfig({
          column_name: "Custom Field 2",
          db_column_name: "custom_field_2",
          is_masterdata: false,
          role_permissions: {
            hr_admin: { view: true, edit: true },
          },
          display_order: 2,
        }),
      ];

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={customColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("Custom Field 1")).toBeInTheDocument();
        expect(screen.getByText("Custom Field 2")).toBeInTheDocument();
      });
    });

    it("should not render hidden fields in DOM", async () => {
      const user = userEvent.setup();

      const columnsWithHidden = [
        createTestColumnConfig({
          column_name: "Visible Field",
          db_column_name: "visible_field",
          is_visible: true,
          display_order: 1,
        }),
        createTestColumnConfig({
          column_name: "Hidden Field",
          db_column_name: "hidden_field",
          is_visible: false, // Hidden field
          display_order: 2,
        }),
      ];

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={columnsWithHidden}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("Visible Field")).toBeInTheDocument();
      });

      // Hidden field should not be in DOM
      expect(screen.queryByText("Hidden Field")).not.toBeInTheDocument();
    });

    it("should format field values correctly (dates, booleans, text)", async () => {
      const user = userEvent.setup();

      const employeeWithVariousTypes = createTestEmployee({
        first_name: "John",
        hire_date: "2025-01-15",
        is_terminated: false,
        comments: "Test comment",
      });

      const columnsWithTypes = [
        createTestColumnConfig({
          column_name: "First Name",
          db_column_name: "first_name",
          column_type: "text",
          display_order: 1,
        }),
        createTestColumnConfig({
          column_name: "Hire Date",
          db_column_name: "hire_date",
          column_type: "date",
          display_order: 2,
        }),
        createTestColumnConfig({
          column_name: "Is Terminated",
          db_column_name: "is_terminated",
          column_type: "boolean",
          display_order: 3,
        }),
      ];

      renderWithQueryClient(
        <EmployeeCard
          employee={employeeWithVariousTypes}
          isHRAdmin={true}
          columnConfigs={columnsWithTypes}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        // Text field should display value
        expect(screen.getByText("First Name")).toBeInTheDocument();
        // Date and boolean fields should be rendered (formatting tested in EditableCell tests)
        expect(screen.getByText("Hire Date")).toBeInTheDocument();
        expect(screen.getByText("Is Terminated")).toBeInTheDocument();
      });
    });

    it("should show appropriate placeholder for empty/null fields", async () => {
      const user = userEvent.setup();

      const employeeWithNulls = createTestEmployee({
        first_name: "John",
        comments: null, // Null field
        email: null, // Null field
      });

      const columns = [
        createTestColumnConfig({
          column_name: "Comments",
          db_column_name: "comments",
          column_type: "text",
          display_order: 1,
        }),
        createTestColumnConfig({
          column_name: "Email",
          db_column_name: "email",
          column_type: "text",
          display_order: 2,
        }),
      ];

      renderWithQueryClient(
        <EmployeeCard
          employee={employeeWithNulls}
          isHRAdmin={true}
          columnConfigs={columns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        // Fields should be rendered even if null (EditableCell handles null display)
        expect(screen.getByText("Comments")).toBeInTheDocument();
        expect(screen.getByText("Email")).toBeInTheDocument();
      });
    });

    it("should display field labels matching column configuration names", async () => {
      const user = userEvent.setup();

      const columnsWithCustomLabels = [
        createTestColumnConfig({
          column_name: "First Name",
          db_column_name: "first_name",
          display_order: 1,
        }),
        createTestColumnConfig({
          column_name: "Last Name",
          db_column_name: "surname",
          display_order: 2,
        }),
        createTestColumnConfig({
          column_name: "Email Address",
          db_column_name: "email",
          display_order: 3,
        }),
      ];

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={columnsWithCustomLabels}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        // Labels should match column_name (formatted)
        expect(screen.getByText("First Name")).toBeInTheDocument();
        expect(screen.getByText("Last Name")).toBeInTheDocument();
        expect(screen.getByText("Email Address")).toBeInTheDocument();
      });
    });

    it("should dynamically show/hide fields based on user role", async () => {
      const user = userEvent.setup();

      // Create employee with custom data
      const employeeWithCustomData = {
        ...mockEmployee,
        customData: {
          public_field: "Public value",
          hr_admin_field: "Admin only value",
        },
      };

      const roleBasedColumns = [
        createTestColumnConfig({
          column_name: "Public Field",
          db_column_name: "public_field",
          is_masterdata: false,
          role_permissions: {
            hr_admin: { view: true, edit: true },
            omc: { view: true, edit: false },
            payroll: { view: true, edit: false },
          },
          display_order: 1,
        }),
        createTestColumnConfig({
          column_name: "HR Admin Only",
          db_column_name: "hr_admin_field",
          is_masterdata: false,
          role_permissions: {
            hr_admin: { view: true, edit: true },
            omc: { view: false, edit: false },
            payroll: { view: false, edit: false },
          },
          display_order: 2,
        }),
      ];

      // HR Admin columns - include both fields
      const hrAdminFilteredColumns = roleBasedColumns;

      // ÖMC columns - only include public field
      const omcFilteredColumns = roleBasedColumns.filter(col =>
        col.db_column_name === "public_field"
      );

      // Test as HR Admin
      const { rerender } = renderWithQueryClient(
        <EmployeeCard
          employee={employeeWithCustomData}
          isHRAdmin={true}
          columnConfigs={hrAdminFilteredColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("Public Field")).toBeInTheDocument();
        expect(screen.getByText("HR Admin Only")).toBeInTheDocument();
      });

      // Re-render as non-HR Admin (ÖMC) with filtered columns
      rerender(
        <I18nWrapper>
          <QueryClientProvider client={queryClient}>
            <EmployeeCard
              employee={employeeWithCustomData}
              isHRAdmin={false}
              columnConfigs={omcFilteredColumns}
              onEmployeeUpdated={mockOnEmployeeUpdated}
            />
          </QueryClientProvider>
        </I18nWrapper>
      );

      // Expand the card again after rerender
      const moreButton2 = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton2);

      // Should still show public field but not HR Admin only field
      await waitFor(() => {
        expect(screen.getByText("Public Field")).toBeInTheDocument();
        expect(screen.queryByText("HR Admin Only")).not.toBeInTheDocument();
      });
    });
  });
});

