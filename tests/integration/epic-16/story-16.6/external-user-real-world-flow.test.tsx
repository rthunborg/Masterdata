/**
 * Integration tests for External User Real-World Flow
 * 
 * Story 16.6: Change Notification Banner
 * AC 5: External User Real-World Flow
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";
import DashboardPage from "@/app/dashboard/page";
import { UserRole } from "@/lib/types/user";

// Mock auth hook
const mockUseAuth = vi.fn();
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useEmployees hook
const mockUseEmployees = vi.fn();
vi.mock("@/lib/hooks/use-employees", () => ({
  useEmployees: () => mockUseEmployees(),
}));

// Mock useEmployeeChanges hook
const mockUseEmployeeChanges = vi.fn();
vi.mock("@/lib/hooks/use-employee-changes", () => ({
  useEmployeeChanges: () => mockUseEmployeeChanges(),
}));

// Mock media query
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false, // Desktop view
}));

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: "Dashboard",
      "actions.addEmployee": "Lägg till anställd",
      "actions.importEmployees": "Importera",
      "actions.addColumn": "Lägg till kolumn",
      employeeList: "Employee List",
      banner: "Updates Available",
    };
    return translations[key] || key;
  },
}));

// Mock UI Store
vi.mock("@/lib/store/ui-store", () => ({
  useUIStore: () => ({
    openModal: vi.fn(),
    isPreviewMode: false,
    modals: {
      addEmployee: false,
      importEmployees: false,
      manageColumns: false,
      addColumn: false,
    },
  }),
}));

// Mock components
vi.mock("@/components/dashboard/responsive-employee-view", () => ({
  ResponsiveEmployeeView: () => <div data-testid="responsive-employee-view">Responsive View</div>,
}));

vi.mock("@/components/dashboard/manage-columns-dropdown", () => ({
  ManageColumnsDialog: () => <button>Manage Columns</button>,
}));

vi.mock("@/components/dashboard/role-selector", () => ({
  RoleSelector: () => <div>Role Selector</div>,
}));

vi.mock("@/components/dashboard/change-notification-banner", () => ({
  ChangeNotificationBanner: () => <div>Change Notification Banner</div>,
}));

describe("External User Real-World Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show banner only for external users when changes exist", async () => {
    // Setup Sodexo user (External)
    mockUseAuth.mockReturnValue({
      user: { role: UserRole.SODEXO },
      isLoading: false,
    });

    // Setup employees data
    mockUseEmployees.mockReturnValue({
      employees: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    // Setup changes exist
    mockUseEmployeeChanges.mockReturnValue({
      isColumnChanged: vi.fn().mockReturnValue(true),
      totalCount: 5,
      changesBaseline: 0,
      isLoading: false,
      error: null,
    });

    await act(async () => {
      renderWithI18n(<DashboardPage />);
    });

    // Banner should be visible (Checking for mock text)
    expect(screen.getByText("Change Notification Banner")).toBeInTheDocument();
  });

  it("should render employee list even when loading data", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: UserRole.SODEXO },
      isLoading: false,
    });

    mockUseEmployees.mockReturnValue({
      employees: [],
      isLoading: true, // Loading
      error: null,
      refetch: vi.fn(),
    });

    mockUseEmployeeChanges.mockReturnValue({
      isColumnChanged: vi.fn(),
      totalCount: 0,
      changesBaseline: 0,
      isLoading: false,
      error: null,
    });

    await act(async () => {
      renderWithI18n(<DashboardPage />);
    });

    // Should still show the card structure
    expect(screen.getByText("Employee List")).toBeInTheDocument();
    
    // Should render the view (which handles the loading state internally)
    expect(screen.getByTestId("responsive-employee-view")).toBeInTheDocument();
  });
});
