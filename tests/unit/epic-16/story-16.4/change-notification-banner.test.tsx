/**
 * Unit tests for ChangeNotificationBanner component
 * 
 * Story: 16.4 - Change Notification Banner Component
 */

import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChangeNotificationBanner } from "@/components/dashboard/change-notification-banner";
import { useEmployeeChanges } from "@/lib/hooks/use-employee-changes";

// Mock the hook
vi.mock("@/lib/hooks/use-employee-changes");

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
});

describe("ChangeNotificationBanner", () => {
  const mockUseEmployeeChanges = vi.mocked(useEmployeeChanges);

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
  });

  afterEach(() => {
    sessionStorageMock.clear();
  });

  describe("Banner Display (AC1)", () => {
    it("renders banner when there are changes", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 5,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      const banner = screen.getByRole("alert");
      expect(banner.textContent).toMatch(/Changes made to 5 employees/i);
      expect(banner.textContent).toMatch(/since your last login/i);
      expect(banner.textContent).toMatch(/See highlighted fields below/i);
    });

    it("displays correct singular form for single employee", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 1,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      const banner = screen.getByRole("alert");
      expect(banner.textContent).toMatch(/Changes made to 1 employee/i);
    });

    it("displays formatted date in banner", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 3,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      // Date should be formatted and visible
      const banner = screen.getByRole("alert");
      expect(banner).toBeInTheDocument();
      // The formatted date should be in the text
      expect(banner.textContent).toContain("2025");
    });

    it("has dismiss button with X icon", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 2,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      const dismissButton = screen.getByRole("button", { name: /Dismiss banner/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it("has correct ARIA attributes", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 1,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      const banner = screen.getByRole("alert");
      expect(banner).toHaveAttribute("aria-live", "polite");
      expect(banner).toHaveAttribute("aria-atomic", "true");
    });
  });

  describe("Dismiss Functionality (AC2)", () => {
    it("hides banner when dismiss button is clicked", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 3,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      const dismissButton = screen.getByRole("button", { name: /Dismiss banner/i });
      fireEvent.click(dismissButton);

      // Banner should be hidden
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("stores dismissal state in sessionStorage", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 2,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      const dismissButton = screen.getByRole("button", { name: /Dismiss banner/i });
      fireEvent.click(dismissButton);

      expect(sessionStorageMock.getItem("employee-changes-banner-dismissed")).toBe("true");
    });

    it("restores dismissal state from sessionStorage on mount", () => {
      sessionStorageMock.setItem("employee-changes-banner-dismissed", "true");

      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 5,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      // Banner should not render because it's dismissed
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("banner remains hidden after dismissal in same session", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 3,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      const { rerender } = renderWithI18n(<ChangeNotificationBanner />);

      const dismissButton = screen.getByRole("button", { name: /Dismiss banner/i });
      fireEvent.click(dismissButton);

      // Re-render component
      rerender(<ChangeNotificationBanner />);

      // Banner should still be hidden
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("No Changes State (AC3)", () => {
    it("does not render when totalCount is 0", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 0,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("does not render when changesBaseline is null (first-time user)", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 0,
        changesBaseline: null,
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Date/Time Formatting (AC4)", () => {
    it("formats date correctly", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 1,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      const banner = screen.getByRole("alert");
      // Date should be formatted (contains year at minimum)
      expect(banner.textContent).toContain("2025");
    });

    it("handles invalid date gracefully", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 1,
        changesBaseline: "invalid-date",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      // Should not throw error, should display the invalid date string
      renderWithI18n(<ChangeNotificationBanner />);

      const banner = screen.getByRole("alert");
      expect(banner).toBeInTheDocument();
    });
  });

  describe("Loading State (AC6)", () => {
    it("does not render when loading", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 5,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: true,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("renders when loading completes and changes exist", async () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 3,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });
  });

  describe("Error State (AC7)", () => {
    it("does not render when error occurs", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 5,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: new Error("Failed to fetch changes"),
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Banner Styling (AC5)", () => {
    it("has correct styling classes", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 2,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      const banner = screen.getByRole("alert");
      // Should have blue/info styling
      expect(banner.className).toContain("bg-blue-50");
      expect(banner.className).toContain("border-blue-200");
    });

    it("is responsive (flex layout)", () => {
      mockUseEmployeeChanges.mockReturnValue({
        totalCount: 1,
        changesBaseline: "2025-01-15T08:00:00Z",
        isLoading: false,
        error: null,
        changedEmployees: [],
        refreshChanges: vi.fn(),
        isColumnChanged: vi.fn(() => false),
      });

      renderWithI18n(<ChangeNotificationBanner />);

      const banner = screen.getByRole("alert");
      const content = banner.querySelector(".flex");
      expect(content).toBeInTheDocument();
    });
  });
});

