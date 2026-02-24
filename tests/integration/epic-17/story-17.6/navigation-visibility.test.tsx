/**
 * Integration Tests for Story 17.6: Remove Navigation Area for External Users
 * 
 * Tests the full layout rendering with navigation visibility based on user role.
 * Tests both desktop navigation (in layout) and mobile navigation (in header).
 * 
 * AC #1: Navigation Area Hidden for external users (Admin tabs only)
 * AC #2: Header Preserved for all users
 * AC #3: Dashboard Content Visible (no spacing issues)
 * AC #4: HR Admin Unaffected (navigation still visible)
 * AC #5: Layout Consistency
 *
 * NOTE: The dashboard layout was refactored to remove server-side auth.
 * Navigation is now rendered by the client-side DashboardNav component
 * which reads from the Zustand auth store via useAuth().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { UserRole, type SessionUser } from "@/lib/types/user";
import { mockUsers } from "@/../tests/utils/role-test-utils";
import DashboardLayout from "@/app/dashboard/layout";
import { useAuthStore } from "@/lib/store/auth-store";
import React from "react";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  usePathname: vi.fn(() => "/dashboard"),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock Header component (client component) - needs to be a real component for testing
vi.mock("@/components/layout/header", () => ({
  Header: () => (
    <header data-testid="header" role="banner">
      <div>Header Content</div>
    </header>
  ),
}));

// Mock Toaster component
vi.mock("sonner", () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  t: {
    navigation: {
      employees: "Employees",
      importantDates: "Important Dates",
    },
    admin: {
      userManagement: "User Management",
      columnSettings: "Column Settings",
    },
  },
}));

function setAuthUser(user: SessionUser | null) {
  useAuthStore.setState({
    user,
    isAuthenticated: !!user,
    isLoading: false,
    _hasHydrated: true,
  });
}

describe("Story 17.6: Navigation Visibility Integration Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: true,
    });
  });

  const renderLayout = (children: React.ReactNode) => {
    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <DashboardLayout>{children}</DashboardLayout>
      </QueryClientProvider>
    );
  };

  describe("AC1: Navigation Area for External Users", () => {
    it("should show basic navigation but hide admin tabs for sodexo user", async () => {
      setAuthUser(mockUsers.sodexo);

      renderLayout(<div>Dashboard Content</div>);

      await waitFor(() => {
        const nav = screen.getByRole("navigation");
        expect(nav).toBeInTheDocument();

        expect(screen.getByText("Employees")).toBeInTheDocument();

        expect(screen.queryByText("User Management")).not.toBeInTheDocument();
        expect(screen.queryByText("Column Settings")).not.toBeInTheDocument();
      });
    });

    it("should show basic navigation but hide admin tabs for omc user", async () => {
      setAuthUser(mockUsers.omc);

      renderLayout(<div>Dashboard Content</div>);

      await waitFor(() => {
        expect(screen.getByRole("navigation")).toBeInTheDocument();
        expect(screen.queryByText("User Management")).not.toBeInTheDocument();
      });
    });
  });

  describe("AC2: Header Preserved for All Users", () => {
    it("should show header for external user", async () => {
      setAuthUser(mockUsers.sodexo);

      renderLayout(<div>Dashboard Content</div>);

      await waitFor(() => {
        const header = screen.getByTestId("header");
        expect(header).toBeInTheDocument();
      });
    });
  });

  describe("AC3: Dashboard Content Visible", () => {
    it("should show dashboard content for external user without spacing issues", async () => {
      setAuthUser(mockUsers.sodexo);

      renderLayout(<div data-testid="dashboard-content">Dashboard Content</div>);

      await waitFor(() => {
        const content = screen.getByTestId("dashboard-content");
        expect(content).toBeInTheDocument();
        expect(content).toHaveTextContent("Dashboard Content");
      });

      const main = screen.getByRole("main");
      expect(main).toBeInTheDocument();
    });
  });

  describe("AC4: HR Admin Unaffected - Navigation Still Visible", () => {
    it("should show desktop navigation for HR Admin", async () => {
      setAuthUser(mockUsers.hrAdmin);

      renderLayout(<div>Dashboard Content</div>);

      await waitFor(() => {
        const nav = screen.getByRole("navigation");
        expect(nav).toBeInTheDocument();

        const employeesLink = screen.getByText("Employees");
        expect(employeesLink).toBeInTheDocument();
      });
    });

    it("should show all navigation links for HR Admin", async () => {
      setAuthUser(mockUsers.hrAdmin);

      renderLayout(<div>Dashboard Content</div>);

      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
        expect(screen.getByText("Important Dates")).toBeInTheDocument();
        expect(screen.getByText("User Management")).toBeInTheDocument();
        expect(screen.getByText("Column Settings")).toBeInTheDocument();
      });
    });
  });

  describe("AC5: Layout Consistency", () => {
    it("should maintain consistent layout for all users", async () => {
      setAuthUser(mockUsers.sodexo);

      const { container } = renderLayout(<div data-testid="content">Content</div>);

      await waitFor(() => {
        const main = screen.getByRole("main");
        expect(main).toBeInTheDocument();

        const nav = container.querySelector("nav");
        expect(nav).toBeInTheDocument();
      });
    });
  });
});
