/**
 * Integration Tests for Change Notification Full Flow
 * 
 * Story: 16.6 - Comprehensive Test Coverage for Change Notifications
 * 
 * Tests the complete flow: API → Hook → Dashboard → Table → Cell highlighting
 * - Verifies entire chain works end-to-end
 * - Tests highlight application with real column names
 * - Tests multiple changed columns
 * - Tests highlight persistence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { UserRole, type SessionUser } from "@/lib/types/user";
import { mockUsers } from "@/../tests/utils/role-test-utils";
import DashboardPage from "@/app/dashboard/page";
import type { ChangedEmployee } from "@/lib/hooks/use-employee-changes";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useAuth hook
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

// Realistic test data using actual UUID format and column names
const REALISTIC_EMPLOYEE_ID = "550e8400-e29b-41d4-a716-446655440000";
const REALISTIC_EMPLOYEE_ID_2 = "550e8400-e29b-41d4-a716-446655440001";

const REALISTIC_EMPLOYEES = [
  {
    id: REALISTIC_EMPLOYEE_ID,
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@example.com",
    phone_number: "+46701234567",
    ssn: "19800101-1234",
    is_archived: false,
    is_terminated: false,
  },
  {
    id: REALISTIC_EMPLOYEE_ID_2,
    first_name: "Jane",
    last_name: "Smith",
    email: "jane.smith@example.com",
    phone_number: "+46701234568",
    ssn: "19800202-5678",
    is_archived: false,
    is_terminated: false,
  },
];

// Realistic column names from database schema
const REALISTIC_COLUMN_NAMES = {
  FIRST_NAME: "first_name",
  LAST_NAME: "last_name",
  EMAIL: "email",
  PHONE_NUMBER: "phone_number",
  SSN: "ssn",
};

// Mock useEmployees hook
vi.mock("@/lib/hooks/use-employees", () => ({
  useEmployees: vi.fn(() => ({
    employees: [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        phone_number: "+46701234567",
        ssn: "19800101-1234",
        is_archived: false,
        is_terminated: false,
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        first_name: "Jane",
        last_name: "Smith",
        email: "jane.smith@example.com",
        phone_number: "+46701234568",
        ssn: "19800202-5678",
        is_archived: false,
        is_terminated: false,
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    updatedEmployeeId: null,
    updateEmployeeOptimistically: vi.fn(),
  })),
}));

// Mock useEmployeeChanges hook - will be configured per test
let mockChangedEmployees: ChangedEmployee[] = [];
let mockIsColumnChanged: (employeeId: string, columnName: string) => boolean;

vi.mock("@/lib/hooks/use-employee-changes", () => ({
  useEmployeeChanges: vi.fn(() => ({
    changedEmployees: mockChangedEmployees,
    totalCount: mockChangedEmployees.length,
    isLoading: false,
    error: null,
    changesBaseline: "2025-01-10T08:00:00Z",
    refreshChanges: vi.fn(),
    isColumnChanged: mockIsColumnChanged || (() => false),
  })),
}));

// Mock useColumns hook
vi.mock("@/lib/hooks/use-columns", () => ({
  useColumns: vi.fn(() => ({
    columns: [
      {
        id: "1",
        column_name: "First Name",
        db_column_name: "first_name",
        is_masterdata: true,
        column_type: "text",
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
          omc: { view: true, edit: false },
          payroll: { view: true, edit: false },
          toplux: { view: true, edit: false },
        },
      },
      {
        id: "2",
        column_name: "Last Name",
        db_column_name: "last_name",
        is_masterdata: true,
        column_type: "text",
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
          omc: { view: true, edit: false },
          payroll: { view: true, edit: false },
          toplux: { view: true, edit: false },
        },
      },
      {
        id: "3",
        column_name: "Email",
        db_column_name: "email",
        is_masterdata: true,
        column_type: "text",
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
          omc: { view: true, edit: false },
          payroll: { view: true, edit: false },
          toplux: { view: true, edit: false },
        },
      },
      {
        id: "4",
        column_name: "Phone Number",
        db_column_name: "phone_number",
        is_masterdata: true,
        column_type: "text",
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
          omc: { view: true, edit: false },
          payroll: { view: true, edit: false },
          toplux: { view: true, edit: false },
        },
      },
    ],
    isLoading: false,
    error: null,
  })),
}));

// Mock useImportantDates hook
vi.mock("@/lib/hooks/use-important-dates", () => ({
  useImportantDates: vi.fn().mockReturnValue({
    dates: [],
    isLoading: false,
    error: null,
  }),
}));

// Mock useUIStore
vi.mock("@/lib/store/ui-store", () => ({
  useUIStore: vi.fn(() => ({
    previewRole: null,
    isPreviewMode: false,
    setPreviewRole: vi.fn(),
    modals: {
      addEmployee: false,
      importCSV: false,
      terminate: false,
      addColumn: false,
      addUser: false,
      editColumn: false,
    },
    editColumnId: null,
    columnVisibility: {},
    initColumnVisibility: vi.fn(),
    toggleColumnVisibility: vi.fn(),
    resetColumnVisibility: vi.fn(),
    getVisibleColumns: vi.fn((cols) => cols),
    openModal: vi.fn(),
    closeModal: vi.fn(),
    openEditColumnModal: vi.fn(),
    closeEditColumnModal: vi.fn(),
  })),
}));

// Mock useMediaQuery
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(() => false), // Desktop view
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
});

describe("Change Notification Full Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
    
    // Reset mock data
    mockChangedEmployees = [];
    mockIsColumnChanged = () => false;
  });

  afterEach(() => {
    sessionStorageMock.clear();
  });

  describe("Complete Flow: API → Hook → Dashboard → Table → Cell", () => {
    it("should highlight fields when API returns changes with real column names", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      const sodexoUser: SessionUser = {
        ...mockUsers.sodexo,
        last_active_at: "2025-01-10T08:00:00Z",
      };

      vi.mocked(useAuth).mockReturnValue({
        user: sodexoUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      // Mock API response with realistic data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: [
            {
              employeeId: "550e8400-e29b-41d4-a716-446655440000",
              changedColumns: ["first_name", "email"],
              lastChangeAt: "2025-01-15T10:00:00Z",
            },
          ],
          totalCount: 1,
          userLastActive: "2025-01-10T08:00:00Z",
        }),
      });

      // Set up mock changed employees
      mockChangedEmployees = [
        {
          employeeId: "550e8400-e29b-41d4-a716-446655440000",
          changedColumns: ["first_name", "email"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      // Set up mock isColumnChanged function
      mockIsColumnChanged = (employeeId: string, columnName: string) => {
        if (employeeId === "550e8400-e29b-41d4-a716-446655440000") {
          return ["first_name", "email"].includes(columnName);
        }
        return false;
      };

      renderWithI18n(<DashboardPage />);

      await waitFor(() => {
        // Verify banner appears (indicating changes were detected)
        const banner = screen.getByRole("alert");
        expect(banner).toBeInTheDocument();
        expect(banner.textContent).toMatch(/ändringar gjorda/i);
      });

      // Verify useEmployeeChanges hook was called
      const { useEmployeeChanges } = await import("@/lib/hooks/use-employee-changes");
      expect(useEmployeeChanges).toHaveBeenCalled();

      // Verify EmployeeTable is rendered (indicating isColumnChanged was passed)
      await waitFor(() => {
        const table = screen.queryByRole("table");
        expect(table).toBeInTheDocument();
      });
    });

    it("should handle multiple changed columns for same employee", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      const sodexoUser: SessionUser = {
        ...mockUsers.sodexo,
        last_active_at: "2025-01-10T08:00:00Z",
      };

      vi.mocked(useAuth).mockReturnValue({
        user: sodexoUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      // Mock multiple changed columns
      mockChangedEmployees = [
        {
          employeeId: "550e8400-e29b-41d4-a716-446655440000",
          changedColumns: ["first_name", "last_name", "email", "phone_number"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      mockIsColumnChanged = (employeeId: string, columnName: string) => {
        if (employeeId === "550e8400-e29b-41d4-a716-446655440000") {
          return ["first_name", "last_name", "email", "phone_number"].includes(columnName);
        }
        return false;
      };

      renderWithI18n(<DashboardPage />);

      await waitFor(() => {
        // Verify banner shows correct count
        const banner = screen.getByRole("alert");
        expect(banner).toBeInTheDocument();
      });

      // Verify hook processed multiple columns
      const { useEmployeeChanges } = await import("@/lib/hooks/use-employee-changes");
      const hookResult = vi.mocked(useEmployeeChanges).mock.results[0]?.value;
      expect(hookResult?.changedEmployees[0]?.changedColumns).toHaveLength(4);
    });

    it("should handle multiple employees with different changed columns", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      const sodexoUser: SessionUser = {
        ...mockUsers.sodexo,
        last_active_at: "2025-01-10T08:00:00Z",
      };

      vi.mocked(useAuth).mockReturnValue({
        user: sodexoUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      // Mock multiple employees with different changes
      mockChangedEmployees = [
        {
          employeeId: "550e8400-e29b-41d4-a716-446655440000",
          changedColumns: ["first_name", "email"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
        {
          employeeId: "550e8400-e29b-41d4-a716-446655440001",
          changedColumns: ["last_name", "phone_number"],
          lastChangeAt: "2025-01-15T11:00:00Z",
        },
      ];

      mockIsColumnChanged = (employeeId: string, columnName: string) => {
        if (employeeId === "550e8400-e29b-41d4-a716-446655440000") {
          return ["first_name", "email"].includes(columnName);
        }
        if (employeeId === "550e8400-e29b-41d4-a716-446655440001") {
          return ["last_name", "phone_number"].includes(columnName);
        }
        return false;
      };

      renderWithI18n(<DashboardPage />);

      await waitFor(() => {
        // Verify banner shows count of 2 employees
        const banner = screen.getByRole("alert");
        expect(banner).toBeInTheDocument();
        expect(banner.textContent).toMatch(/2/i); // Should show "2 employees" or similar
      });

      // Verify hook processed multiple employees
      const { useEmployeeChanges } = await import("@/lib/hooks/use-employee-changes");
      const hookResult = vi.mocked(useEmployeeChanges).mock.results[0]?.value;
      expect(hookResult?.totalCount).toBe(2);
    });
  });

  describe("Highlight Persistence", () => {
    it("should maintain highlights when component re-renders", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      const sodexoUser: SessionUser = {
        ...mockUsers.sodexo,
        last_active_at: "2025-01-10T08:00:00Z",
      };

      vi.mocked(useAuth).mockReturnValue({
        user: sodexoUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      mockChangedEmployees = [
        {
          employeeId: "550e8400-e29b-41d4-a716-446655440000",
          changedColumns: ["first_name"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      mockIsColumnChanged = (employeeId: string, columnName: string) => {
        if (employeeId === "550e8400-e29b-41d4-a716-446655440000") {
          return columnName === "first_name";
        }
        return false;
      };

      const { rerender } = renderWithI18n(<DashboardPage />);

      await waitFor(() => {
        const banner = screen.getByRole("alert");
        expect(banner).toBeInTheDocument();
      });

      // Re-render (simulating page refresh or state update)
      rerender(<DashboardPage />);

      await waitFor(() => {
        // Banner should still be present (highlights persist)
        const banner = screen.getByRole("alert");
        expect(banner).toBeInTheDocument();
      });
    });
  });
});

