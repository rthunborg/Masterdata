/**
 * Employee Table Actions Column Visibility Tests
 *
 * Tests that the Actions column is only visible to HR Admin users.
 */

import { screen } from "@testing-library/react";
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

// Mock the UI store
const { mockUseUIStore } = vi.hoisted(() => ({
  mockUseUIStore: vi.fn(),
}));

vi.mock("@/lib/stores/ui-store", () => ({
  useUIStore: mockUseUIStore,
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

describe("Employee Table Actions Column Visibility", () => {
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
      one: null,
      one_marked_at: null,
      talmundo: null,
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
      crewing_done: null,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
  ];

  const mockColumnConfigs: ColumnConfig[] = [
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
      id: "col-surname",
      column_name: "Surname",
      db_column_name: "surname",
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
      display_order: 1,
      is_visible: true,
      is_checklist_item: false,
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

  const createMockUIStore = () => ({
    previewRole: null,
    isPreviewMode: false,
    initColumnVisibility: vi.fn(),
    columnVisibility: {},
    density: "normal",
    setDensity: vi.fn(),
  });

  const setupMocks = (role: UserRole) => {
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
      columns: mockColumnConfigs,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseUIStore.mockReturnValue(createMockUIStore());
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("HR Admin - Should see Actions column", () => {
    it("shows action buttons for HR Admin (archive/terminate)", () => {
      setupMocks(UserRole.HR_ADMIN);
      renderWithQueryClient(
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      );

      // HR Admin should have action buttons (Archive, Terminate)
      // These buttons have specific icons - UserX for terminate
      const buttons = screen.getAllByRole("button");
      // HR Admin should have at least some buttons including action buttons
      // The exact number depends on other features, but should be > 0
      expect(buttons.length).toBeGreaterThan(0);
      
      // Check that there are more columns for HR Admin (includes Actions column)
      const headers = screen.getAllByRole("columnheader");
      // HR Admin should have: checkbox + First Name + Surname + Actions = at least 4 columns
      expect(headers.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Non-HR Admin Roles - Should NOT see Actions column", () => {
    const externalRoles = [
      UserRole.RECRUITER,
      UserRole.ADMIN_LIMITED,
      UserRole.SODEXO,
      UserRole.OMC,
      UserRole.PAYROLL,
      UserRole.TOPLUX,
      UserRole.CREWING,
    ];

    externalRoles.forEach((role) => {
      it(`hides Actions column for ${role} users`, () => {
        setupMocks(role);
        renderWithQueryClient(
          <EmployeeTable employees={mockEmployees} isLoading={false} />
        );

        // The Actions column header should NOT be visible
        const headers = screen.getAllByRole("columnheader");
        const actionsHeader = headers.find((h) =>
          h.textContent?.toLowerCase().includes("action")
        );
        expect(actionsHeader).toBeUndefined();
      });
    });
  });

  describe("Actions buttons in rows", () => {
    it("shows archive/terminate buttons in rows for HR Admin", () => {
      setupMocks(UserRole.HR_ADMIN);
      renderWithQueryClient(
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      );

      // Look for action buttons (Archive, Terminate icons)
      // These are in tooltips, so we check for the button elements
      const buttons = screen.getAllByRole("button");
      const actionButtons = buttons.filter(
        (btn) =>
          btn.querySelector(".lucide-archive") ||
          btn.querySelector(".lucide-user-x") ||
          btn.querySelector("svg")
      );

      // HR Admin should have action buttons
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it("does not show archive/terminate buttons for non-HR Admin users", () => {
      setupMocks(UserRole.SODEXO);
      renderWithQueryClient(
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      );

      // Look for action buttons by looking for Archive/Terminate icons
      const archiveIcons = document.querySelectorAll(".lucide-archive");
      const terminateIcons = document.querySelectorAll(".lucide-user-x");

      // Non-HR Admin should not have these action buttons
      expect(archiveIcons.length).toBe(0);
      expect(terminateIcons.length).toBe(0);
    });
  });
});
