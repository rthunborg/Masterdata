/**
 * Default sort behaviour and fallbacks for EmployeeTable.
 *
 * Verifies:
 * - Internal users (hr_admin, recruiter, admin_limited) with checklist items: default sort = checklist progress asc.
 * - Other users (external or no progress column): default sort = hire_date desc when hire_date column exists.
 * - Fallbacks: no hire_date in column config, or no checklist items → no default sort applied, no errors.
 */

import { screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";
import { UserRole } from "@/lib/types/user";

vi.mock("@/lib/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/hooks/use-columns", () => ({ useColumns: vi.fn() }));
vi.mock("@/lib/hooks/use-important-dates", () => ({
  useImportantDates: vi.fn(() => ({ dates: [], isLoading: false, error: null })),
}));

const { mockUseUIStore } = vi.hoisted(() => ({ mockUseUIStore: vi.fn() }));
vi.mock("@/lib/stores/ui-store", () => ({ useUIStore: mockUseUIStore }));

vi.mock("@/lib/services/employee-service", () => ({
  employeeService: { update: vi.fn(), archive: vi.fn(), unarchive: vi.fn(), reactivate: vi.fn() },
}));
vi.mock("@/lib/services/custom-data-service", () => ({
  customDataService: { updateCustomData: vi.fn() },
}));
vi.mock("@/lib/services/mutation-queue", () => ({
  mutationQueueService: { enqueue: vi.fn(), getPendingMutations: vi.fn(() => Promise.resolve([])) },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useAuth } from "@/lib/hooks/use-auth";
import { useColumns } from "@/lib/hooks/use-columns";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), pathname: "/dashboard" }),
  useSearchParams: () => ({ get: vi.fn(), toString: vi.fn(() => "") }),
  usePathname: () => "/dashboard",
}));

const baseEmployee: Employee = {
  id: "emp-1",
  first_name: "John",
  surname: "Doe",
  ssn: "123-45-6789",
  email: "john@example.com",
  mobile: null,
  rank: "SEV",
  gender: "Man",
  town_district: "Trelleborg",
  hire_date: "2020-01-15",
  stena_date: null,
  omc_date: null,
  pe3_date: null,
  termination_date: null,
  termination_reason: null,
  is_terminated: false,
  is_archived: false,
  archived_at: null,
  is_anonymized: false,
  repayment_needed_omc: null,
  repayment_needed_pe3: null,
  special_diet: false,
  diet_details: null,
  comments: null,
  one: false,
  one_marked_at: null,
  talmundo: false,
  isps: false,
  photo: false,
  origo: false,
  loneiva: null,
  mail_lon: false,
  bankuppgifter: false,
  li: false,
  passport: false,
  kvitto_c17_18: false,
  c17: false,
  crewing_done: false,
  hotel_required: false,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

const rolePerms = {
  hr_admin: { view: true, edit: true },
  recruiter: { view: true, edit: true },
  admin_limited: { view: true, edit: false },
  sodexo: { view: true, edit: false },
  omc: { view: true, edit: false },
  payroll: { view: true, edit: false },
  toplux: { view: true, edit: false },
  crewing: { view: true, edit: false },
};

function createColumn(
  id: string,
  column_name: string,
  db_column_name: string,
  column_type: "text" | "date" | "boolean",
  is_checklist_item = false
): ColumnConfig {
  return {
    id,
    column_name,
    db_column_name,
    column_type,
    role_permissions: rolePerms,
    is_masterdata: true,
    category: "Personal",
    category_color: "#FFFFFF",
    display_order: 0,
    is_visible: true,
    is_checklist_item,
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
  };
}

describe("EmployeeTable default sort and fallbacks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  const renderTable = (employees: Employee[], columns: ColumnConfig[], role: UserRole) => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: `user-${role}`,
        email: `${role}@example.com`,
        role,
        auth_id: `auth-${role}`,
        is_active: true,
        created_at: "2020-01-01T00:00:00Z",
        last_active_at: new Date().toISOString(),
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });
    vi.mocked(useColumns).mockReturnValue({
      columns,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseUIStore.mockReturnValue({
      previewRole: null,
      isPreviewMode: false,
      initColumnVisibility: vi.fn(),
      columnVisibility: {},
      density: "normal",
      setDensity: vi.fn(),
    });

    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <EmployeeTable employees={employees} isLoading={false} />
      </QueryClientProvider>
    );
  };

  describe("Internal users with checklist items (progress column visible)", () => {
    const columnsWithChecklistAndHireDate: ColumnConfig[] = [
      createColumn("col-first-name", "First Name", "first_name", "text"),
      createColumn("col-hire-date", "Hire Date", "hire_date", "date"),
      createColumn("col-one", "One", "one", "boolean", true),
      createColumn("col-talmundo", "Talmundo", "talmundo", "boolean", true),
    ];

    it("default sort is checklist progress ascending (fewest completed at top)", () => {
      const employees: Employee[] = [
        { ...baseEmployee, id: "e1", first_name: "Few", one: false, talmundo: false },
        { ...baseEmployee, id: "e2", first_name: "Some", one: true, talmundo: false },
        { ...baseEmployee, id: "e3", first_name: "All", one: true, talmundo: true },
      ];

      renderTable(employees, columnsWithChecklistAndHireDate, UserRole.HR_ADMIN);

      const rows = screen.getAllByRole("row");
      const dataRows = rows.slice(1);
      expect(dataRows).toHaveLength(3);
      expect(within(dataRows[0]).getByText("Few")).toBeInTheDocument();
      expect(within(dataRows[1]).getByText("Some")).toBeInTheDocument();
      expect(within(dataRows[2]).getByText("All")).toBeInTheDocument();
    });

    it("recruiter gets same default sort by progress", () => {
      const employees: Employee[] = [
        { ...baseEmployee, id: "e1", first_name: "Low", one: false, talmundo: false },
        { ...baseEmployee, id: "e2", first_name: "High", one: true, talmundo: true },
      ];
      renderTable(employees, columnsWithChecklistAndHireDate, UserRole.RECRUITER);
      const rows = screen.getAllByRole("row");
      expect(within(rows[1]).getByText("Low")).toBeInTheDocument();
      expect(within(rows[2]).getByText("High")).toBeInTheDocument();
    });

    it("admin_limited gets same default sort by progress", () => {
      const employees: Employee[] = [
        { ...baseEmployee, id: "e1", first_name: "Zero", one: false, talmundo: false },
        { ...baseEmployee, id: "e2", first_name: "Full", one: true, talmundo: true },
      ];
      renderTable(employees, columnsWithChecklistAndHireDate, UserRole.ADMIN_LIMITED);
      const rows = screen.getAllByRole("row");
      expect(within(rows[1]).getByText("Zero")).toBeInTheDocument();
      expect(within(rows[2]).getByText("Full")).toBeInTheDocument();
    });
  });

  describe("External users (or no progress column) with hire_date column", () => {
    const columnsWithHireDateOnly: ColumnConfig[] = [
      createColumn("col-first-name", "First Name", "first_name", "text"),
      createColumn("col-hire-date", "Hire Date", "hire_date", "date"),
    ];

    it("default sort is hire_date descending (most recently hired at top)", () => {
      const employees: Employee[] = [
        { ...baseEmployee, id: "e1", first_name: "Old", hire_date: "2019-06-01" },
        { ...baseEmployee, id: "e2", first_name: "New", hire_date: "2025-02-01" },
        { ...baseEmployee, id: "e3", first_name: "Mid", hire_date: "2022-01-15" },
      ];

      renderTable(employees, columnsWithHireDateOnly, UserRole.SODEXO);

      const rows = screen.getAllByRole("row");
      const dataRows = rows.slice(1);
      expect(dataRows).toHaveLength(3);
      // Newest first (2025), then Mid (2022), then Old (2019)
      expect(within(dataRows[0]).getByText("New")).toBeInTheDocument();
      expect(within(dataRows[1]).getByText("Mid")).toBeInTheDocument();
      expect(within(dataRows[2]).getByText("Old")).toBeInTheDocument();
    });

    it("OMC user gets default sort by hire_date desc", () => {
      const employees: Employee[] = [
        { ...baseEmployee, id: "e1", first_name: "A", hire_date: "2020-01-01" },
        { ...baseEmployee, id: "e2", first_name: "B", hire_date: "2024-01-01" },
      ];
      renderTable(employees, columnsWithHireDateOnly, UserRole.OMC);
      const rows = screen.getAllByRole("row");
      expect(within(rows[1]).getByText("B")).toBeInTheDocument();
      expect(within(rows[2]).getByText("A")).toBeInTheDocument();
    });
  });

  describe("Fallbacks: no hire_date in column config", () => {
    const columnsWithoutHireDate: ColumnConfig[] = [
      createColumn("col-first-name", "First Name", "first_name", "text"),
      // no hire_date - e.g. role without permission to view it
    ];

    it("external user without hire_date column: table renders with no default sort, no error", () => {
      const employees: Employee[] = [
        { ...baseEmployee, id: "e1", first_name: "Alice" },
        { ...baseEmployee, id: "e2", first_name: "Bob" },
      ];

      expect(() => renderTable(employees, columnsWithoutHireDate, UserRole.PAYROLL)).not.toThrow();

      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThanOrEqual(2);
      // Order is unchanged (data order) - we just assert table rendered
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("Sodexo user without hire_date: table renders without error", () => {
      const employees: Employee[] = [{ ...baseEmployee, id: "e1", first_name: "Only" }];
      expect(() => renderTable(employees, columnsWithoutHireDate, UserRole.SODEXO)).not.toThrow();
      expect(screen.getByText("Only")).toBeInTheDocument();
    });
  });

  describe("Fallbacks: no checklist items (no progress column)", () => {
    const columnsNoChecklistWithHireDate: ColumnConfig[] = [
      createColumn("col-first-name", "First Name", "first_name", "text"),
      createColumn("col-hire-date", "Hire Date", "hire_date", "date"),
      // no boolean checklist columns
    ];

    it("internal user (HR Admin) with no checklist items: default sort is hire_date desc, no error", () => {
      const employees: Employee[] = [
        { ...baseEmployee, id: "e1", first_name: "Older", hire_date: "2018-01-01" },
        { ...baseEmployee, id: "e2", first_name: "Newer", hire_date: "2024-06-01" },
      ];

      renderTable(employees, columnsNoChecklistWithHireDate, UserRole.HR_ADMIN);

      const rows = screen.getAllByRole("row");
      expect(within(rows[1]).getByText("Newer")).toBeInTheDocument();
      expect(within(rows[2]).getByText("Older")).toBeInTheDocument();
    });

    it("Framsteg column is not shown when no checklist items", () => {
      renderTable(
        [{ ...baseEmployee, id: "e1", first_name: "X" }],
        columnsNoChecklistWithHireDate,
        UserRole.HR_ADMIN
      );
      expect(screen.queryByText("Framsteg")).not.toBeInTheDocument();
    });
  });

  describe("Fallbacks: neither hire_date nor progress available", () => {
    const columnsFirstNameOnly: ColumnConfig[] = [
      createColumn("col-first-name", "First Name", "first_name", "text"),
    ];

    it("table renders with no default sort, no error", () => {
      const employees: Employee[] = [
        { ...baseEmployee, id: "e1", first_name: "First" },
        { ...baseEmployee, id: "e2", first_name: "Second" },
      ];

      expect(() => renderTable(employees, columnsFirstNameOnly, UserRole.TOPLUX)).not.toThrow();

      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();
    });

    it("Crewing user with minimal columns: no error", () => {
      const employees: Employee[] = [{ ...baseEmployee, id: "e1", first_name: "Solo" }];
      expect(() => renderTable(employees, columnsFirstNameOnly, UserRole.CREWING)).not.toThrow();
      expect(screen.getByText("Solo")).toBeInTheDocument();
    });
  });
});
