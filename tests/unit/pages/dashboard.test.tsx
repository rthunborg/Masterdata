/**
 * Unit tests for Dashboard Page
 * 
 * Story 11.8: Performance & Concurrency Tests
 * AC: Component rendering tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";
import DashboardPage from "@/app/dashboard/page";
import { UserRole } from "@/lib/types/user";

// Mock dependencies
const mockUseAuth = vi.fn();
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseEmployees = vi.fn();
vi.mock("@/lib/hooks/use-employees", () => ({
  useEmployees: () => mockUseEmployees(),
}));

const mockUseEmployeeChanges = vi.fn();
vi.mock("@/lib/hooks/use-employee-changes", () => ({
  useEmployeeChanges: () => mockUseEmployeeChanges(),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

vi.mock("@/lib/i18n", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: "Dashboard",
      "actions.addEmployee": "Lägg till anställd",
      "actions.importEmployees": "Importera",
      "actions.addColumn": "Lägg till kolumn",
      employeeList: "Employee List",
    };
    return translations[key] || key;
  },
}));

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

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT render sign-out button in page body", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: UserRole.HR_ADMIN },
      isLoading: false,
    });

    mockUseEmployees.mockReturnValue({
      employees: [],
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseEmployeeChanges.mockReturnValue({
      isColumnChanged: vi.fn(),
      totalCount: 0,
      isLoading: false,
    });

    await act(async () => {
      renderWithI18n(<DashboardPage />);
    });

    expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
  });

  it("renders Add Employee and Import buttons for HR Admin", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: UserRole.HR_ADMIN },
      isLoading: false,
    });

    mockUseEmployees.mockReturnValue({
      employees: [],
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseEmployeeChanges.mockReturnValue({
      isColumnChanged: vi.fn(),
      totalCount: 0,
      isLoading: false,
    });

    await act(async () => {
      renderWithI18n(<DashboardPage />);
    });

    expect(screen.getByText("Lägg till anställd")).toBeInTheDocument();
    expect(screen.getByText("Importera")).toBeInTheDocument();
  });
});
