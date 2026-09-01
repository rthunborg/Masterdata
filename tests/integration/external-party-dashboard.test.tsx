/**
 * Integration tests for External Party Dashboard
 * 
 * Story 4.1: External Party View
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";
import DashboardPage from "@/app/dashboard/page";
import { UserRole } from "@/lib/types/user";

// Mock hooks
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

describe("External Party Dashboard Access", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Admin Action Button Visibility", () => {
    it("shows Add Employee and Import buttons for HR Admin", async () => {
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
        renderWithQueryClient(<DashboardPage />);
      });

      expect(screen.getByText("Lägg till anställd")).toBeInTheDocument();
      expect(screen.getByText("Importera")).toBeInTheDocument();
    });

    it("hides custom-column lifecycle controls from external parties", async () => {
      mockUseAuth.mockReturnValue({
        user: { role: UserRole.SODEXO },
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
        renderWithQueryClient(<DashboardPage />);
      });

      expect(screen.queryByText("Lägg till kolumn")).not.toBeInTheDocument();
      expect(screen.getByText("Manage Columns")).toBeInTheDocument();
    });
  });
});
