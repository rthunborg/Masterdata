/**
 * Integration Tests for Story 17.6: Remove Navigation Area for External Users
 * 
 * Tests the full layout rendering with navigation visibility based on user role.
 * Tests both desktop navigation (in layout) and mobile navigation (in header).
 * 
 * AC #1: Navigation Area Hidden for external users
 * AC #2: Header Preserved for all users
 * AC #3: Dashboard Content Visible (no spacing issues)
 * AC #4: HR Admin Unaffected (navigation still visible)
 * AC #5: Layout Consistency
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { UserRole, type SessionUser } from "@/lib/types/user";
import { mockUsers } from "@/../tests/utils/role-test-utils";
import DashboardLayout from "@/app/dashboard/layout";
import React from "react";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  Link: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock server-side auth function
const mockGetUserFromSession = vi.fn();
vi.mock("@/lib/server/auth", () => ({
  getUserFromSession: () => mockGetUserFromSession(),
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
      employees: "Anställda",
      importantDates: "Viktiga datum",
    },
    admin: {
      userManagement: "Användarhantering",
      columnSettings: "Kolumninställningar",
    },
  },
}));

describe("Story 17.6: Navigation Visibility Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC1: Navigation Area Hidden for External Users", () => {
    it("should hide desktop navigation for sodexo user", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.sodexo);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div>Dashboard Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        // Desktop navigation should NOT be visible
        const nav = screen.queryByRole("navigation");
        expect(nav).not.toBeInTheDocument();

        // Navigation links should NOT be visible
        const employeesLink = screen.queryByText("Anställda");
        expect(employeesLink).not.toBeInTheDocument();
      });
    });

    it("should hide desktop navigation for omc user", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.omc);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div>Dashboard Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        const nav = screen.queryByRole("navigation");
        expect(nav).not.toBeInTheDocument();
      });
    });

    it("should hide desktop navigation for payroll user", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.payroll);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div>Dashboard Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        const nav = screen.queryByRole("navigation");
        expect(nav).not.toBeInTheDocument();
      });
    });

    it("should hide desktop navigation for toplux user", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.toplux);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div>Dashboard Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        const nav = screen.queryByRole("navigation");
        expect(nav).not.toBeInTheDocument();
      });
    });
  });

  describe("AC2: Header Preserved for All Users", () => {
    it("should show header for external user", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.sodexo);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div>Dashboard Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        const header = screen.getByTestId("header");
        expect(header).toBeInTheDocument();
      });
    });

    it("should show header for HR Admin", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.hrAdmin);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div>Dashboard Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        const header = screen.getByTestId("header");
        expect(header).toBeInTheDocument();
      });
    });
  });

  describe("AC3: Dashboard Content Visible", () => {
    it("should show dashboard content for external user without spacing issues", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.sodexo);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div data-testid="dashboard-content">Dashboard Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        const content = screen.getByTestId("dashboard-content");
        expect(content).toBeInTheDocument();
        expect(content).toHaveTextContent("Dashboard Content");
      });

      // Verify main element exists (layout structure)
      const main = screen.getByRole("main");
      expect(main).toBeInTheDocument();
    });
  });

  describe("AC4: HR Admin Unaffected - Navigation Still Visible", () => {
    it("should show desktop navigation for HR Admin", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.hrAdmin);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div>Dashboard Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        // Desktop navigation SHOULD be visible for HR Admin
        const nav = screen.getByRole("navigation");
        expect(nav).toBeInTheDocument();

        // Navigation links should be visible
        const employeesLink = screen.getByText("Anställda");
        expect(employeesLink).toBeInTheDocument();
      });
    });

    it("should show all navigation links for HR Admin", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.hrAdmin);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div>Dashboard Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        expect(screen.getByText("Anställda")).toBeInTheDocument();
        expect(screen.getByText("Viktiga datum")).toBeInTheDocument();
        expect(screen.getByText("Användarhantering")).toBeInTheDocument();
        expect(screen.getByText("Kolumninställningar")).toBeInTheDocument();
      });
    });
  });

  describe("AC5: Layout Consistency", () => {
    it("should maintain consistent layout when navigation is hidden", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.sodexo);

      let container: HTMLElement;
      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div data-testid="content">Content</div> });
        const result = renderWithI18n(LayoutResult);
        container = result.container;
      });

      await waitFor(() => {
        // Main content should be in correct position
        const main = screen.getByRole("main");
        expect(main).toBeInTheDocument();

        // No navigation element should exist in DOM
        const nav = container!.querySelector("nav");
        expect(nav).not.toBeInTheDocument();
      });
    });

    it("should maintain consistent layout when navigation is visible", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.hrAdmin);

      let container: HTMLElement;
      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div data-testid="content">Content</div> });
        const result = renderWithI18n(LayoutResult);
        container = result.container;
      });

      await waitFor(() => {
        // Navigation should exist
        const nav = container!.querySelector("nav");
        expect(nav).toBeInTheDocument();

        // Main content should still be present
        const main = screen.getByRole("main");
        expect(main).toBeInTheDocument();
      });
    });
  });

  describe("Role-Based Conditional Rendering", () => {
    it("should conditionally render navigation based on role", async () => {
      // Test external user
      mockGetUserFromSession.mockResolvedValue(mockUsers.sodexo);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div>Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
      });

      // Clear and test HR Admin
      screen.getByTestId("header").remove(); // Clear previous render
      mockGetUserFromSession.mockResolvedValue(mockUsers.hrAdmin);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div>Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        expect(screen.getByRole("navigation")).toBeInTheDocument();
      });
    });
  });
});

