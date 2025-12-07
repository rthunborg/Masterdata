/**
 * Unit Tests for Story 17.6: Remove Navigation Area for External Users
 * 
 * Tests that navigation (both desktop and mobile) is conditionally rendered
 * based on user role - hidden for external users, visible for HR Admin.
 * 
 * AC #1: Navigation Area Hidden for external users
 * AC #4: HR Admin Unaffected (navigation still visible)
 */

import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { Header } from "@/components/layout/header";
import { UserRole, type SessionUser } from "@/lib/types/user";
import { mockUsers } from "@/../tests/utils/role-test-utils";

// Mock the auth hook
const mockUseAuth = vi.fn();
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Next.js router
vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock MobileNav component
vi.mock("@/components/layout/mobile-nav", () => ({
  MobileNav: ({ user }: { user: SessionUser }) => (
    <div data-testid="mobile-nav">Mobile Navigation for {user.role}</div>
  ),
}));

describe("Story 17.6: Navigation Conditional Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC1: Navigation Area Hidden for External Users", () => {
    it("should hide mobile navigation for sodexo user", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.sodexo,
        logout: vi.fn(),
      });

      await act(async () => {
        renderWithI18n(<Header />);
      });

      // Mobile navigation should NOT be visible for external users
      const mobileNav = screen.queryByTestId("mobile-nav");
      expect(mobileNav).not.toBeInTheDocument();
    });

    it("should hide mobile navigation for omc user", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.omc,
        logout: vi.fn(),
      });

      await act(async () => {
        renderWithI18n(<Header />);
      });

      const mobileNav = screen.queryByTestId("mobile-nav");
      expect(mobileNav).not.toBeInTheDocument();
    });

    it("should hide mobile navigation for payroll user", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.payroll,
        logout: vi.fn(),
      });

      await act(async () => {
        renderWithI18n(<Header />);
      });

      const mobileNav = screen.queryByTestId("mobile-nav");
      expect(mobileNav).not.toBeInTheDocument();
    });

    it("should hide mobile navigation for toplux user", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.toplux,
        logout: vi.fn(),
      });

      await act(async () => {
        renderWithI18n(<Header />);
      });

      const mobileNav = screen.queryByTestId("mobile-nav");
      expect(mobileNav).not.toBeInTheDocument();
    });
  });

  describe("AC2: Header Preserved for All Users", () => {
    it("should show header with logo and logout button for external user", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.sodexo,
        logout: vi.fn(),
      });

      await act(async () => {
        renderWithI18n(<Header />);
      });

      // Header should be visible
      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();

      // Logo should be visible
      const logo = screen.getByAltText("Stena Line");
      expect(logo).toBeInTheDocument();

      // Logout button should be visible
      const logoutButton = screen.getByRole("button", { name: /sign out|logga ut/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it("should show header with logo and logout button for HR Admin", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.hrAdmin,
        logout: vi.fn(),
      });

      await act(async () => {
        renderWithI18n(<Header />);
      });

      // Header should be visible
      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();

      // Logo should be visible
      const logo = screen.getByAltText("Stena Line");
      expect(logo).toBeInTheDocument();

      // Logout button should be visible
      const logoutButton = screen.getByRole("button", { name: /sign out|logga ut/i });
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe("AC4: HR Admin Unaffected - Navigation Still Visible", () => {
    it("should show mobile navigation for HR Admin", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.hrAdmin,
        logout: vi.fn(),
      });

      await act(async () => {
        renderWithI18n(<Header />);
      });

      // Mobile navigation SHOULD be visible for HR Admin
      const mobileNav = screen.getByTestId("mobile-nav");
      expect(mobileNav).toBeInTheDocument();
      expect(mobileNav).toHaveTextContent("Mobile Navigation for hr_admin");
    });
  });

  describe("Role-Based Conditional Rendering Logic", () => {
    it("should conditionally render mobile nav based on role check", async () => {
      // Test external user first
      mockUseAuth.mockReturnValue({
        user: mockUsers.sodexo,
        logout: vi.fn(),
      });

      const { rerender } = await act(async () => {
        return renderWithI18n(<Header />);
      });

      expect(screen.queryByTestId("mobile-nav")).not.toBeInTheDocument();

      // Switch to HR Admin
      mockUseAuth.mockReturnValue({
        user: mockUsers.hrAdmin,
        logout: vi.fn(),
      });

      await act(async () => {
        rerender(<Header />);
      });

      expect(screen.getByTestId("mobile-nav")).toBeInTheDocument();
    });

    it("should use exact role string comparison (hr_admin)", async () => {
      // Test that only "hr_admin" role shows navigation
      const roles = [
        { role: UserRole.SODEXO, shouldShowNav: false },
        { role: UserRole.OMC, shouldShowNav: false },
        { role: UserRole.PAYROLL, shouldShowNav: false },
        { role: UserRole.TOPLUX, shouldShowNav: false },
        { role: UserRole.HR_ADMIN, shouldShowNav: true },
      ];

      for (const { role, shouldShowNav } of roles) {
        mockUseAuth.mockReturnValue({
          user: { ...mockUsers.sodexo, role },
          logout: vi.fn(),
        });

        const { unmount } = await act(async () => {
          return renderWithI18n(<Header />);
        });

        if (shouldShowNav) {
          expect(screen.getByTestId("mobile-nav")).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId("mobile-nav")).not.toBeInTheDocument();
        }

        unmount();
      }
    });
  });
});

