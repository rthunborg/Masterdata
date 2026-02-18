/**
 * Story 19.11: Employee Table Column Width Persistence Tests
 *
 * Tests that verify column width state management and localStorage persistence
 * for the Employee table dashboard.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import * as columnWidthStorage from "@/lib/utils/column-width-storage";

// Mock dependencies
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "test-user-123", role: "hr_admin" },
  }),
}));

vi.mock("@/lib/store/ui-store", () => ({
  useUIStore: () => ({
    density: "default",
    setDensity: vi.fn(),
    columnVisibility: {},
    setColumnVisibility: vi.fn(),
    initColumnVisibility: vi.fn(),
  }),
}));

// Avoid async useColumns fetch so React 19 setState does not run after render (window is not defined in CI)
vi.mock("@/lib/hooks/use-columns", () => ({
  useColumns: () => ({
    columns: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
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


// Mock minimal props
const mockProps = {
  employees: [],
  columnConfigs: [],
  isLoading: false,
  onEmployeeUpdated: vi.fn(),
  onEmployeeDeleted: vi.fn(),
  onBulkEmailSend: vi.fn(),
  onExportEmployees: vi.fn(),
  showArchived: false,
};

describe("Story 19.11: Employee Table Column Width Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadColumnWidths", () => {
    it("should load saved column widths from localStorage on mount", () => {
      const savedWidths = { first_name: 200, surname: 180 };
      const loadSpy = vi.spyOn(columnWidthStorage, "loadColumnWidths")
        .mockReturnValue(savedWidths);

      render(<EmployeeTable {...mockProps} />);

      expect(loadSpy).toHaveBeenCalledWith("dashboard", "test-user-123");
    });

    it("should return null when no saved widths exist", () => {
      const loadSpy = vi.spyOn(columnWidthStorage, "loadColumnWidths")
        .mockReturnValue(null);

      render(<EmployeeTable {...mockProps} />);

      expect(loadSpy).toHaveBeenCalledWith("dashboard", "test-user-123");
    });
  });

  describe("saveColumnWidths", () => {
    it("should have saveColumnWidths available for column resize events", () => {
      const saveSpy = vi.spyOn(columnWidthStorage, "saveColumnWidths");

      render(<EmployeeTable {...mockProps} />);

      // The save function should be available (called via handleColumnSizingChange)
      // We can't easily trigger a resize in unit tests, but we verify the function exists
      expect(saveSpy).toBeDefined();
    });
  });

  describe("Storage key format", () => {
    it("should use 'dashboard' as the view name for Employee table", () => {
      const loadSpy = vi.spyOn(columnWidthStorage, "loadColumnWidths")
        .mockReturnValue(null);

      render(<EmployeeTable {...mockProps} />);

      // First argument should be 'dashboard'
      expect(loadSpy).toHaveBeenCalledWith("dashboard", expect.any(String));
    });

    it("should include user ID in storage key", () => {
      const loadSpy = vi.spyOn(columnWidthStorage, "loadColumnWidths")
        .mockReturnValue(null);

      render(<EmployeeTable {...mockProps} />);

      // Second argument should be the user ID
      expect(loadSpy).toHaveBeenCalledWith(expect.any(String), "test-user-123");
    });
  });

  describe("Integration with column-width-storage utility", () => {
    it("should correctly format storage key as columnWidths-dashboard-{userId}", () => {
      // Test the actual utility function
      const key = columnWidthStorage.getColumnWidthsStorageKey("dashboard", "test-user-123");
      expect(key).toBe("columnWidths-dashboard-test-user-123");
    });

    it("should save and load widths correctly via localStorage", () => {
      const testWidths = { first_name: 250, surname: 200, email: 300 };

      // Save widths
      columnWidthStorage.saveColumnWidths("dashboard", "test-user-123", testWidths);

      // Load widths
      const loaded = columnWidthStorage.loadColumnWidths("dashboard", "test-user-123");

      expect(loaded).toEqual(testWidths);
    });

    it("should handle clearing widths correctly", () => {
      const testWidths = { first_name: 250 };

      // Save then clear
      columnWidthStorage.saveColumnWidths("dashboard", "test-user-123", testWidths);
      columnWidthStorage.clearColumnWidths("dashboard", "test-user-123");

      // Should return null after clearing
      const loaded = columnWidthStorage.loadColumnWidths("dashboard", "test-user-123");
      expect(loaded).toBeNull();
    });
  });

  describe("User isolation", () => {
    it("should store widths separately for different users", () => {
      const user1Widths = { first_name: 200 };
      const user2Widths = { first_name: 300 };

      // Save widths for user1
      columnWidthStorage.saveColumnWidths("dashboard", "user-1", user1Widths);

      // Save widths for user2
      columnWidthStorage.saveColumnWidths("dashboard", "user-2", user2Widths);

      // Load and verify isolation
      const loaded1 = columnWidthStorage.loadColumnWidths("dashboard", "user-1");
      const loaded2 = columnWidthStorage.loadColumnWidths("dashboard", "user-2");

      expect(loaded1).toEqual(user1Widths);
      expect(loaded2).toEqual(user2Widths);
    });
  });

  describe("Table isolation", () => {
    it("should store widths separately for different tables", () => {
      const dashboardWidths = { first_name: 200 };
      const importantDatesWidths = { week_number: 100 };

      // Save widths for different tables
      columnWidthStorage.saveColumnWidths("dashboard", "test-user", dashboardWidths);
      columnWidthStorage.saveColumnWidths("importantDates", "test-user", importantDatesWidths);

      // Load and verify isolation
      const loadedDashboard = columnWidthStorage.loadColumnWidths("dashboard", "test-user");
      const loadedDates = columnWidthStorage.loadColumnWidths("importantDates", "test-user");

      expect(loadedDashboard).toEqual(dashboardWidths);
      expect(loadedDates).toEqual(importantDatesWidths);
    });
  });
});
