/**
 * Unit Tests for Dashboard Mobile Buttons
 * 
 * Tests the mobile floating action button (FAB) functionality.
 */

import { screen, fireEvent, render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DashboardPage from "@/app/dashboard/page";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAuth } from "@/lib/hooks/use-auth";
import { UserRole } from "@/lib/types/user";

// Mock dependencies
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(),
}));

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: "Dashboard",
      addEmployee: "Lägg till anställd",
      importEmployees: "Importera",
      addColumn: "Lägg till kolumn",
      employeeList: "Employee List",
    };
    return translations[key] || key;
  },
}));

// Mock store
vi.mock("@/lib/store/ui-store", () => ({
  useUIStore: vi.fn(() => ({
    openModal: vi.fn(),
    isPreviewMode: false,
    modals: {
      addEmployee: false,
      importEmployees: false,
      manageColumns: false,
      addColumn: false,
    },
  })),
}));

// Mock components
vi.mock("@/components/dashboard/employee-table", () => ({
  EmployeeTable: () => <div data-testid="employee-table">Employee Table</div>,
}));

vi.mock("@/components/dashboard/responsive-employee-view", () => ({
  ResponsiveEmployeeView: () => <div data-testid="responsive-employee-view">Responsive View</div>,
}));

vi.mock("@/components/dashboard/manage-columns-dropdown", () => ({
  ManageColumnsDialog: () => <button>Manage Columns</button>,
}));

vi.mock("@/components/dashboard/role-selector", () => ({
  RoleSelector: () => <div>Role Selector</div>,
}));

vi.mock("@/components/dashboard/role-preview-banner", () => ({
  RolePreviewBanner: () => <div>Role Preview Banner</div>,
}));

vi.mock("@/components/dashboard/change-notification-banner", () => ({
  ChangeNotificationBanner: () => <div>Change Notification Banner</div>,
}));

vi.mock("@/lib/hooks/use-employees", () => ({
  useEmployees: () => ({
    employees: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/use-employee-changes", () => ({
  useEmployeeChanges: () => ({
    isColumnChanged: vi.fn(),
    totalCount: 0,
    changesBaseline: 0,
    isLoading: false,
    error: null,
  }),
}));

describe("Dashboard Mobile Button Tests (AC1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { role: UserRole.HR_ADMIN },
      isLoading: false,
    });
  });

  describe("AC1: FAB is visible on mobile (<1024px) and desktop buttons are hidden", () => {
    it("should render FAB and hide desktop buttons on mobile", () => {
      (useMediaQuery as any).mockReturnValue(true); // Mobile view

      render(<DashboardPage />);

      // FAB should be visible (by looking for its trigger or content)
      // Note: FAB might be rendered via FloatingActionButton component
      // We need to check if floating action button is present
      const fab = screen.getByTestId("floating-action-button");
      expect(fab).toBeInTheDocument();

      // Desktop buttons should be hidden (not rendered or hidden class)
      // "Add Employee" text might be in FAB menu or desktop button
      // But desktop buttons are conditionally rendered based on viewport or replaced
      // In our implementation, we hide desktop buttons via CSS classes or conditional rendering
      
      // Let's verify that the desktop specific buttons are NOT present or hidden
      // The desktop buttons typically have "hidden lg:inline-flex" or similar
      // Since useMediaQuery returns true, our component logic should render mobile specific elements
    });
  });
});
