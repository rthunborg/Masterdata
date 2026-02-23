/**
 * Story 19.5: Framsteg (Progress) Column Visibility Tests
 *
 * Tests that the Framsteg column is only visible to internal users
 * (hr_admin, recruiter, admin_limited) and hidden from external parties.
 */

import { screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";
import { UserRole } from "@/lib/types/user";

// Mock the hooks
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/hooks/use-columns", () => ({
  useColumns: vi.fn(),
}));

vi.mock("@/lib/hooks/use-important-dates", () => ({
  useImportantDates: vi.fn(() => ({
    dates: [],
    isLoading: false,
    error: null,
  })),
}));

// Mock the UI store - this provides previewRole
// Use vi.hoisted to ensure the mock function is available when vi.mock is hoisted
const { mockUseUIStore } = vi.hoisted(() => ({
  mockUseUIStore: vi.fn(),
}));

vi.mock("@/lib/stores/ui-store", () => ({
  useUIStore: mockUseUIStore,
}));

const createMockUIStore = (previewRole: string | null = null) => ({
  previewRole,
  isPreviewMode: previewRole !== null,
  initColumnVisibility: vi.fn(),
  columnVisibility: {},
  density: 'normal',
  setDensity: vi.fn(),
});

vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    update: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    reactivate: vi.fn(),
  },
}));

vi.mock("@/lib/services/custom-data-service", () => ({
  customDataService: {
    updateCustomData: vi.fn(),
  },
}));

vi.mock("@/lib/services/mutation-queue", () => ({
  mutationQueueService: {
    enqueue: vi.fn(),
    getPendingMutations: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuth } from "@/lib/hooks/use-auth";
import { useColumns } from "@/lib/hooks/use-columns";

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

describe("Framsteg Column Visibility", () => {
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

  const mockEmployees: Employee[] = [
    {
      id: "emp-1",
      first_name: "John",
      surname: "Doe",
      ssn: "123-45-6789",
      email: "john.doe@example.com",
      mobile: "+1234567890",
      hire_date: "2020-01-15",
      gender: "Man",
      rank: "SEV",
      town_district: "Trelleborg",
      stena_date: null,
      omc_date: null,
      pe3_date: null,
      is_archived: false,
      is_terminated: false,
      termination_date: null,
      termination_reason: null,
      repayment_needed_omc: null,
      repayment_needed_pe3: null,
      comments: null,
      one: true,
      one_marked_at: "2024-01-01T00:00:00Z",
      talmundo: false,
      isps: null,
      photo: null,
      origo: null,
      loneiva: null,
      mail_lon: null,
      bankuppgifter: null,
      li: null,
      passport: null,
      kvitto_c17_18: null,
      c17: null,
      crewing_done: false,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
  ];

  // Column configs with checklist items (required for Framsteg column to appear)
  const mockColumnConfigsWithChecklist: ColumnConfig[] = [
    {
      id: "col-first-name",
      column_name: "First Name",
      db_column_name: "first_name",
      column_type: "text",
      role_permissions: {
        hr_admin: { view: true, edit: true },
        recruiter: { view: true, edit: true },
        admin_limited: { view: true, edit: false },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: true, edit: false },
        crewing: { view: true, edit: false },
      },
      is_masterdata: true,
      category: "Personal",
      category_color: "#FFFFFF",
      display_order: 0,
      is_visible: true,
      is_checklist_item: false,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
    {
      id: "col-one",
      column_name: "One",
      db_column_name: "one",
      column_type: "boolean",
      role_permissions: {
        hr_admin: { view: true, edit: true },
        recruiter: { view: true, edit: true },
        admin_limited: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: true, edit: false },
        crewing: { view: true, edit: false },
      },
      is_masterdata: true,
      category: "Checklist",
      category_color: "#00FF00",
      display_order: 1,
      is_visible: true,
      is_checklist_item: true, // This is a checklist item
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
    {
      id: "col-talmundo",
      column_name: "Talmundo",
      db_column_name: "talmundo",
      column_type: "boolean",
      role_permissions: {
        hr_admin: { view: true, edit: true },
        recruiter: { view: true, edit: true },
        admin_limited: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: true, edit: false },
        crewing: { view: true, edit: false },
      },
      is_masterdata: true,
      category: "Checklist",
      category_color: "#00FF00",
      display_order: 2,
      is_visible: true,
      is_checklist_item: true, // This is a checklist item
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
  ];

  const createMockUser = (role: UserRole) => ({
    id: `user-${role}`,
    email: `${role}@example.com`,
    role,
    auth_id: `auth-${role}`,
    is_active: true,
    created_at: "2020-01-01T00:00:00Z",
    last_active_at: new Date().toISOString(),
  });

  const setupMocks = (role: UserRole, previewRole: string | null = null) => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser(role),
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(useColumns).mockReturnValue({
      columns: mockColumnConfigsWithChecklist,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseUIStore.mockReturnValue(createMockUIStore(previewRole));
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Internal Users - Should see Framsteg column", () => {
    it("shows Framsteg column for HR Admin", () => {
      setupMocks(UserRole.HR_ADMIN);
      renderWithQueryClient(
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      );

      expect(screen.getByText("Framsteg")).toBeInTheDocument();
    });

    it("shows Framsteg column for Recruiter", () => {
      setupMocks(UserRole.RECRUITER);
      renderWithQueryClient(
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      );

      expect(screen.getByText("Framsteg")).toBeInTheDocument();
    });

    it("shows Framsteg column for Admin Limited", () => {
      setupMocks(UserRole.ADMIN_LIMITED);
      renderWithQueryClient(
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      );

      expect(screen.getByText("Framsteg")).toBeInTheDocument();
    });
  });

  describe("External Parties - Should NOT see Framsteg column", () => {
    it("hides Framsteg column for Sodexo users", () => {
      setupMocks(UserRole.SODEXO);
      renderWithQueryClient(
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      );

      expect(screen.queryByText("Framsteg")).not.toBeInTheDocument();
    });

    it("hides Framsteg column for OMC users", () => {
      setupMocks(UserRole.OMC);
      renderWithQueryClient(
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      );

      expect(screen.queryByText("Framsteg")).not.toBeInTheDocument();
    });

    it("hides Framsteg column for Payroll users", () => {
      setupMocks(UserRole.PAYROLL);
      renderWithQueryClient(
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      );

      expect(screen.queryByText("Framsteg")).not.toBeInTheDocument();
    });

    it("hides Framsteg column for Toplux users", () => {
      setupMocks(UserRole.TOPLUX);
      renderWithQueryClient(
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      );

      expect(screen.queryByText("Framsteg")).not.toBeInTheDocument();
    });

    it("hides Framsteg column for Crewing users", () => {
      setupMocks(UserRole.CREWING);
      renderWithQueryClient(
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      );

      expect(screen.queryByText("Framsteg")).not.toBeInTheDocument();
    });
  });

  describe("No Checklist Items", () => {
    const mockColumnConfigsWithoutChecklist: ColumnConfig[] = [
      {
        id: "col-first-name",
        column_name: "First Name",
        db_column_name: "first_name",
        column_type: "text",
        role_permissions: {
          hr_admin: { view: true, edit: true },
        },
        is_masterdata: true,
        category: "Personal",
        category_color: "#FFFFFF",
        display_order: 0,
        is_visible: true,
        is_checklist_item: false,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      },
    ];

    it("hides Framsteg column for internal users when no checklist items exist", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: createMockUser(UserRole.HR_ADMIN),
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      vi.mocked(useColumns).mockReturnValue({
        columns: mockColumnConfigsWithoutChecklist,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseUIStore.mockReturnValue(createMockUIStore(null));

      renderWithQueryClient(
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      );

      // Framsteg should not appear even for internal users when there are no checklist items
      expect(screen.queryByText("Framsteg")).not.toBeInTheDocument();
    });
  });

  describe("Default sort by checklist progress", () => {
    // 3 employees with different checklist completion (one + talmundo = 2 checklist items)
    const employeesByProgress: Employee[] = [
      {
        ...mockEmployees[0],
        id: "emp-few",
        first_name: "Few",
        surname: "Done",
        one: false,
        talmundo: false,
      },
      {
        ...mockEmployees[0],
        id: "emp-some",
        first_name: "Some",
        surname: "Done",
        one: true,
        talmundo: false,
      },
      {
        ...mockEmployees[0],
        id: "emp-all",
        first_name: "All",
        surname: "Done",
        one: true,
        talmundo: true,
      },
    ];

    it("sorts by checklist progress ascending by default (fewest completed at top)", () => {
      setupMocks(UserRole.HR_ADMIN);
      renderWithQueryClient(
        <EmployeeTable employees={employeesByProgress} isLoading={false} />
      );

      const rows = screen.getAllByRole("row");
      const dataRows = rows.slice(1); // Skip header row
      expect(dataRows).toHaveLength(3);

      // Default sort: checklist_progress asc → fewest completed first
      expect(within(dataRows[0]).getByText("Few")).toBeInTheDocument();
      expect(within(dataRows[1]).getByText("Some")).toBeInTheDocument();
      expect(within(dataRows[2]).getByText("All")).toBeInTheDocument();
    });
  });
});
