/**
 * Integration Tests for useEmployeeChanges Hook
 * 
 * Story: 16.3 - Frontend Change Tracking Hook
 * 
 * Tests hook integration with API endpoint and real-world scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEmployeeChanges } from "@/lib/hooks/use-employee-changes";
import type { SessionUser } from "@/lib/types/user";
import { UserRole } from "@/lib/types/user";

// Mock useAuth hook
const mockUser: SessionUser = {
  id: "user-1",
  email: "test@example.com",
  role: UserRole.HR_ADMIN,
  is_active: true,
  created_at: "2025-01-01T00:00:00Z",
  last_active_at: "2025-01-10T08:00:00Z",
  auth_id: "auth-1",
};

vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
  })),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
});

describe("useEmployeeChanges Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
  });

  afterEach(() => {
    sessionStorageMock.clear();
  });

  describe("Hook Integration with API", () => {
    it("should fetch changes from API endpoint on mount", async () => {
      const mockChanges = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name", "email"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
        {
          employeeId: "emp-2",
          changedColumns: ["mobile"],
          lastChangeAt: "2025-01-16T11:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: mockChanges,
          totalCount: 2,
          userLastActive: mockUser.last_active_at,
        }),
      });

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/employees/changes-since-last-active")
      );
      expect(result.current.changedEmployees).toEqual(mockChanges);
      expect(result.current.totalCount).toBe(2);
    });

    it("should pass baseline parameter correctly to API", async () => {
      const baseline = "2025-01-10T08:00:00Z";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: [],
          totalCount: 0,
          userLastActive: baseline,
        }),
      });

      renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain(`baseline=${encodeURIComponent(baseline)}`);
    });

    it("should handle API error responses correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch changes",
          },
        }),
      });

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain("Failed to fetch changes");
    });

    it("should handle network failures gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network request failed"));

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain("Network request failed");
    });
  });

  describe("Real-world Scenarios", () => {
    it("should handle empty changes response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: [],
          totalCount: 0,
          userLastActive: mockUser.last_active_at,
        }),
      });

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.changedEmployees).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.isColumnChanged("emp-1", "first_name")).toBe(false);
    });

    it("should handle large number of changes", async () => {
      const largeChanges = Array.from({ length: 100 }, (_, i) => ({
        employeeId: `emp-${i}`,
        changedColumns: ["first_name"],
        lastChangeAt: "2025-01-15T10:00:00Z",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: largeChanges,
          totalCount: 100,
          userLastActive: mockUser.last_active_at,
        }),
      });

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalCount).toBe(100);
      expect(result.current.isColumnChanged("emp-50", "first_name")).toBe(true);
    });

    it("should handle multiple changed columns per employee", async () => {
      const mockChanges = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name", "email", "mobile", "rank"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: mockChanges,
          totalCount: 1,
          userLastActive: mockUser.last_active_at,
        }),
      });

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isColumnChanged("emp-1", "first_name")).toBe(true);
      expect(result.current.isColumnChanged("emp-1", "email")).toBe(true);
      expect(result.current.isColumnChanged("emp-1", "mobile")).toBe(true);
      expect(result.current.isColumnChanged("emp-1", "rank")).toBe(true);
      expect(result.current.isColumnChanged("emp-1", "surname")).toBe(false);
    });

    it("should maintain state across re-renders", async () => {
      const mockChanges = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: mockChanges,
          totalCount: 1,
          userLastActive: mockUser.last_active_at,
        }),
      });

      const { result, rerender } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const stateBeforeRerender = result.current.changedEmployees;
      rerender();
      const stateAfterRerender = result.current.changedEmployees;

      expect(stateBeforeRerender).toEqual(stateAfterRerender);
      expect(result.current.totalCount).toBe(1);
    });
  });

  describe("Session Management Integration", () => {
    it("should persist baseline across page refreshes in same session", async () => {
      const baseline = "2025-01-10T08:00:00Z";
      sessionStorageMock.setItem("employee-changes-baseline", baseline);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: [],
          totalCount: 0,
          userLastActive: baseline,
        }),
      });

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.changesBaseline).toBe(baseline);
      expect(sessionStorageMock.getItem("employee-changes-baseline")).toBe(baseline);
    });

    it("should update baseline on refreshChanges", async () => {
      const initialBaseline = "2025-01-10T08:00:00Z";
      const newBaseline = "2025-01-20T12:00:00Z";

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          changedEmployees: [],
          totalCount: 0,
          userLastActive: newBaseline,
        }),
      });

      const { useAuth } = await import("@/lib/hooks/use-auth");
      
      // Start with initial user
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      const { result, rerender } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update user's last_active_at and re-render
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, last_active_at: newBaseline },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      rerender();

      result.current.refreshChanges();

      await waitFor(() => {
        expect(result.current.changesBaseline).toBe(newBaseline);
      });

      expect(sessionStorageMock.getItem("employee-changes-baseline")).toBe(newBaseline);
    });
  });

  describe("Performance and Memoization", () => {
    it("should memoize isColumnChanged function to prevent unnecessary re-renders", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: [
            {
              employeeId: "emp-1",
              changedColumns: ["first_name"],
              lastChangeAt: "2025-01-15T10:00:00Z",
            },
          ],
          totalCount: 1,
          userLastActive: mockUser.last_active_at,
        }),
      });

      const { result, rerender } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstReference = result.current.isColumnChanged;
      rerender();
      const secondReference = result.current.isColumnChanged;

      // Function should be memoized (same reference)
      expect(firstReference).toBe(secondReference);
    });

    it("should update isColumnChanged when changedEmployees updates", async () => {
      const initialChanges = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: initialChanges,
          totalCount: 1,
          userLastActive: mockUser.last_active_at,
        }),
      });

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isColumnChanged("emp-1", "first_name")).toBe(true);

      // Simulate new changes
      const newChanges = [
        ...initialChanges,
        {
          employeeId: "emp-2",
          changedColumns: ["email"],
          lastChangeAt: "2025-01-16T11:00:00Z",
        },
      ];

      // This would normally happen via a new API call
      // For testing, we verify the function updates correctly
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: newChanges,
          totalCount: 2,
          userLastActive: mockUser.last_active_at,
        }),
      });

      result.current.refreshChanges();

      await waitFor(() => {
        expect(result.current.totalCount).toBe(2);
      });

      expect(result.current.isColumnChanged("emp-2", "email")).toBe(true);
    });
  });
});

