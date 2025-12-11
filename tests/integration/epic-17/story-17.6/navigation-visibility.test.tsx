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

// Mock i18n - used for other components but Layout uses local object now
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

describe("Story 17.6: Navigation Visibility Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC1: Navigation Area for External Users", () => {
    it("should show basic navigation but hide admin tabs for sodexo user", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.sodexo);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div>Dashboard Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        // Desktop navigation SHOULD be visible (Employee list link)
        const nav = screen.getByRole("navigation");
        expect(nav).toBeInTheDocument();

        // Basic links SHOULD be visible (English labels as per implementation)
        expect(screen.getByText("Employees")).toBeInTheDocument();

        // Admin links should NOT be visible
        expect(screen.queryByText("User Management")).not.toBeInTheDocument();
        expect(screen.queryByText("Column Settings")).not.toBeInTheDocument();
      });
    });

    it("should show basic navigation but hide admin tabs for omc user", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.omc);

      await act(async () => {
        const LayoutResult = await DashboardLayout({ children: <div>Dashboard Content</div> });
        renderWithI18n(LayoutResult);
      });

      await waitFor(() => {
        expect(screen.getByRole("navigation")).toBeInTheDocument();
        expect(screen.queryByText("User Management")).not.toBeInTheDocument();
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
        const employeesLink = screen.getByText("Employees");
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
        expect(screen.getByText("Employees")).toBeInTheDocument();
        expect(screen.getByText("Important Dates")).toBeInTheDocument();
        expect(screen.getByText("User Management")).toBeInTheDocument();
        expect(screen.getByText("Column Settings")).toBeInTheDocument();
      });
    });
  });

  describe("AC5: Layout Consistency", () => {
    it("should maintain consistent layout for all users", async () => {
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

        // Navigation element should exist in DOM now (changed requirement)
        const nav = container!.querySelector("nav");
        expect(nav).toBeInTheDocument();
      });
    });
  });
});
