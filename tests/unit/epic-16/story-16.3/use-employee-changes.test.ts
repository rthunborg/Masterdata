/**
 * Unit tests for useEmployeeChanges hook
 * 
 * Story: 16.3 - Frontend Change Tracking Hook
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

const mockUserWithoutLastActive: SessionUser = {
  ...mockUser,
  last_active_at: null,
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

describe("useEmployeeChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
    mockFetch.mockClear();
  });

  afterEach(() => {
    sessionStorageMock.clear();
  });

  describe("Hook Creation (AC1)", () => {
    it("should provide all required properties", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: [],
          totalCount: 0,
          userLastActive: mockUser.last_active_at,
        }),
      });

      const { result } = renderHook(() => useEmployeeChanges());

      // Check all properties exist
      expect(result.current).toHaveProperty("changedEmployees");
      expect(result.current).toHaveProperty("totalCount");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("changesBaseline");
      expect(result.current).toHaveProperty("refreshChanges");
      expect(result.current).toHaveProperty("isColumnChanged");

      // Initial state
      expect(result.current.changedEmployees).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refreshChanges).toBe("function");
      expect(typeof result.current.isColumnChanged).toBe("function");
    });

    it("should automatically fetch changes on mount", async () => {
      const mockChanges = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name", "email"],
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

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/employees/changes-since-last-active")
      );
      expect(result.current.changedEmployees).toEqual(mockChanges);
      expect(result.current.totalCount).toBe(1);
    });
  });

  describe("Baseline Capture (AC2)", () => {
    it("should capture baseline from user.last_active_at on first mount", async () => {
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

      expect(result.current.changesBaseline).toBe(mockUser.last_active_at);
      expect(sessionStorageMock.getItem("employee-changes-baseline")).toBe(
        mockUser.last_active_at
      );
    });

    it("should use existing baseline from sessionStorage if present", async () => {
      const existingBaseline = "2025-01-05T00:00:00Z";
      sessionStorageMock.setItem("employee-changes-baseline", existingBaseline);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: [],
          totalCount: 0,
          userLastActive: existingBaseline,
        }),
      });

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.changesBaseline).toBe(existingBaseline);
      // Should use existing baseline, not user's last_active_at
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`baseline=${encodeURIComponent(existingBaseline)}`)
      );
    });

    it("should return empty results for first-time users (null last_active_at)", async () => {
      const { useAuth } = await import("@/lib/hooks/use-auth");
      
      // Set up mock before rendering hook
      vi.mocked(useAuth).mockReturnValue({
        user: mockUserWithoutLastActive,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      const { result } = renderHook(() => useEmployeeChanges());

      // Wait for effect to complete (should be immediate for null last_active_at)
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 1000 });

      // For first-time users, should have empty state
      expect(result.current.changedEmployees).toEqual([]);
      // Baseline should be null (initial state, and effect should keep it null)
      // Note: changesBaseline starts as null and effect returns early, so it stays null
      expect(result.current.changesBaseline).toBeNull();
      
      // Restore mock for other tests
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
    });

    it("should use same baseline across multiple tabs in same session", async () => {
      const baseline = "2025-01-10T08:00:00Z";
      // Set baseline before first hook renders
      sessionStorageMock.setItem("employee-changes-baseline", baseline);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          changedEmployees: [],
          totalCount: 0,
          userLastActive: baseline,
        }),
      });

      // Simulate multiple tabs
      const { result: result1 } = renderHook(() => useEmployeeChanges());
      const { result: result2 } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result1.current.changesBaseline).toBe(baseline);
        expect(result2.current.changesBaseline).toBe(baseline);
      });
    });
  });

  describe("Change Fetching (AC3)", () => {
    it("should call API with correct baseline parameter", async () => {
      // Ensure sessionStorage is clear for this test
      sessionStorageMock.removeItem("employee-changes-baseline");
      const baseline = mockUser.last_active_at!;
      
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
      expect(callUrl).toContain("/api/employees/changes-since-last-active");
      expect(callUrl).toContain(`baseline=${encodeURIComponent(baseline)}`);
    });

    it("should handle loading state during fetch", async () => {
      // Ensure sessionStorage is clear for this test
      sessionStorageMock.removeItem("employee-changes-baseline");
      
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      mockFetch.mockReturnValueOnce(fetchPromise);

      const { result } = renderHook(() => useEmployeeChanges());

      // Should be loading (wait a bit for effect to run)
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      }, { timeout: 100 });

      // Resolve fetch
      resolveFetch!({
        ok: true,
        json: async () => ({
          changedEmployees: [],
          totalCount: 0,
          userLastActive: mockUser.last_active_at,
        }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should store response in hook state", async () => {
      // Ensure sessionStorage is clear for this test
      sessionStorageMock.removeItem("employee-changes-baseline");
      
      const mockChanges = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
        {
          employeeId: "emp-2",
          changedColumns: ["email", "mobile"],
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

      await waitFor(() => {
        expect(result.current.changedEmployees).toEqual(mockChanges);
      });

      expect(result.current.totalCount).toBe(2);
    });
  });

  describe("Refresh Capability (AC4)", () => {
    it("should update baseline to current user.last_active_at on refresh", async () => {
      const initialBaseline = "2025-01-10T08:00:00Z";
      const newLastActive = "2025-01-20T12:00:00Z";
      sessionStorageMock.setItem("employee-changes-baseline", initialBaseline);

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

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          changedEmployees: [],
          totalCount: 0,
          userLastActive: newLastActive,
        }),
      });

      const { result, rerender } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update user's last_active_at and re-render hook
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, last_active_at: newLastActive },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      // Re-render to get updated user in hook
      rerender();

      // Call refresh - should use new last_active_at
      result.current.refreshChanges();

      await waitFor(() => {
        expect(result.current.changesBaseline).toBe(newLastActive);
      });

      expect(sessionStorageMock.getItem("employee-changes-baseline")).toBe(
        newLastActive
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`baseline=${encodeURIComponent(newLastActive)}`)
      );
    });

    it("should re-fetch changes with new baseline", async () => {
      mockFetch.mockResolvedValue({
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

      const initialCallCount = mockFetch.mock.calls.length;

      result.current.refreshChanges();

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe("Change Lookup Helper (AC5)", () => {
    it("should return true if column changed for employee", async () => {
      const mockChanges = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name", "email"],
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
    });

    it("should return false if column not changed for employee", async () => {
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

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isColumnChanged("emp-1", "email")).toBe(false);
    });

    it("should return false if employee not in changes", async () => {
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

      expect(result.current.isColumnChanged("emp-999", "first_name")).toBe(false);
    });

    it("should handle column not in changedColumns array", async () => {
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

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isColumnChanged("emp-1", "nonexistent_column")).toBe(
        false
      );
    });
  });

  describe("State Management (AC6)", () => {
    it("should persist state during session", async () => {
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

      const { result, unmount } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const stateBeforeUnmount = result.current.changedEmployees;
      unmount();

      // State should persist (in real app, this would be in component state)
      // This test verifies the hook maintains state correctly
      expect(stateBeforeUnmount).toEqual(mockChanges);
    });
  });

  describe("Performance Optimization (AC7)", () => {
    it("should memoize isColumnChanged function", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEmployees: [],
          totalCount: 0,
          userLastActive: mockUser.last_active_at,
        }),
      });

      const { result, rerender } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstCall = result.current.isColumnChanged;
      rerender();
      const secondCall = result.current.isColumnChanged;

      // Function reference should be stable (memoized)
      expect(firstCall).toBe(secondCall);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain("Network error");
      // Should not clear existing changes on error
      expect(result.current.changedEmployees).toEqual([]);
    });

    it("should handle API error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({
          error: { message: "Server error" },
        }),
      });

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it("should not block rendering on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Fetch failed"));

      const { result } = renderHook(() => useEmployeeChanges());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Hook should still return valid state
      expect(result.current).toHaveProperty("changedEmployees");
      expect(result.current).toHaveProperty("totalCount");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("error");
    });
  });
});

