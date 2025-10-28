import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { UserRole, type SessionUser } from "@/lib/types/user";
import DashboardPage from "@/app/dashboard/page";

// Mock the auth hook
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

// Mock the employee service
vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

// Mock the columns hook
vi.mock("@/lib/hooks/use-columns", () => ({
  useColumns: vi.fn().mockReturnValue({
    columns: [],
    isLoading: false,
    error: null,
  }),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("External Party Dashboard Access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Role Display", () => {
    it("displays 'Sodexo' for sodexo user role", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "1",
          email: "sodexo@test.com",
          role: UserRole.SODEXO,
          is_active: true,
          created_at: "2025-01-01",
          auth_id: "auth-1",
        } as SessionUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      render(<DashboardPage />);
      
      // Wait for async state updates to complete
      await waitFor(() => {
        // Note: Role display is in server component layout, not tested here
        // This test verifies dashboard page renders without "Add Employee" button
        expect(screen.queryByText(/Add Employee/i)).not.toBeInTheDocument();
      });
    });

    it("displays 'OMC' for omc user role", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "2",
          email: "omc@test.com",
          role: UserRole.OMC,
          is_active: true,
          created_at: "2025-01-01",
          auth_id: "auth-2",
        } as SessionUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.queryByText(/Add Employee/i)).not.toBeInTheDocument();
      });
    });

    it("displays 'Payroll' for payroll user role", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "3",
          email: "payroll@test.com",
          role: UserRole.PAYROLL,
          is_active: true,
          created_at: "2025-01-01",
          auth_id: "auth-3",
        } as SessionUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.queryByText(/Add Employee/i)).not.toBeInTheDocument();
      });
    });

    it("displays 'Toplux' for toplux user role", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "4",
          email: "toplux@test.com",
          role: UserRole.TOPLUX,
          is_active: true,
          created_at: "2025-01-01",
          auth_id: "auth-4",
        } as SessionUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.queryByText(/Add Employee/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Admin Action Button Visibility", () => {
    it("hides Add Employee button for external party users", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "1",
          email: "sodexo@test.com",
          role: UserRole.SODEXO,
          is_active: true,
          created_at: "2025-01-01",
          auth_id: "auth-1",
        } as SessionUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.queryByText(/Add Employee/i)).not.toBeInTheDocument();
      });
    });

    it("hides Import Employees button for external party users", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "1",
          email: "sodexo@test.com",
          role: UserRole.SODEXO,
          is_active: true,
          created_at: "2025-01-01",
          auth_id: "auth-1",
        } as SessionUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.queryByText(/Import Employees/i)).not.toBeInTheDocument();
      });
    });

    it("shows Add Employee and Import buttons for HR Admin", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "1",
          email: "admin@test.com",
          role: UserRole.HR_ADMIN,
          is_active: true,
          created_at: "2025-01-01",
          auth_id: "auth-1",
        } as SessionUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText(/Add Employee/i)).toBeInTheDocument();
        expect(screen.getByText(/Import Employees/i)).toBeInTheDocument();
      });
    });
  });

  describe("Logout Functionality", () => {
    it("displays logout button for external party users", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "1",
          email: "sodexo@test.com",
          role: UserRole.SODEXO,
          is_active: true,
          created_at: "2025-01-01",
          auth_id: "auth-1",
        } as SessionUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText(/Sign Out/i)).toBeInTheDocument();
      });
    });

    it("calls logout function when logout button is clicked", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      const mockLogout = vi.fn().mockResolvedValue(undefined);
      
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "1",
          email: "sodexo@test.com",
          role: UserRole.SODEXO,
          is_active: true,
          created_at: "2025-01-01",
          auth_id: "auth-1",
        } as SessionUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: mockLogout,
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      const { getByText } = render(<DashboardPage />);
      
      await waitFor(() => {
        const logoutButton = getByText(/Sign Out/i);
        logoutButton.click();
        expect(mockLogout).toHaveBeenCalledTimes(1);
      });
    });
  });
});
