import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEmployees } from "@/lib/hooks/use-employees";
import type { Employee } from "@/lib/types/employee";

// Mock employee service
const mockEmployees: Employee[] = [
  {
    id: "1",
    first_name: "John",
    surname: "Doe",
    ssn: "123456789",
    email: "john@example.com",
    mobile: "1234567890",
    rank: "Manager",
    gender: "Male",
    town_district: "District 1",
    hire_date: "2020-01-01",
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    comments: null,
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
  },
];

vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    getAll: vi.fn(() => Promise.resolve(mockEmployees)),
  },
}));

vi.mock("@/lib/services/custom-data-service", () => ({
  customDataService: {
    getCustomData: vi.fn(() => Promise.resolve({})),
  },
}));

// Mock useRealtime hook
vi.mock("@/lib/hooks/use-realtime", () => ({
  useRealtime: vi.fn(() => ({
    status: "connected",
    isConnected: true,
    error: null,
    lastEvent: null,
  })),
}));

describe("useEmployees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch employees on mount", async () => {
    const { result } = renderHook(() => useEmployees());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.employees).toEqual(mockEmployees);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch errors", async () => {
    const { employeeService } = await import("@/lib/services/employee-service");
    vi.mocked(employeeService.getAll).mockRejectedValueOnce(new Error("Fetch failed"));

    const { result } = renderHook(() => useEmployees());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe("Fetch failed");
    expect(result.current.employees).toEqual([]);
  });

  it("should support filters", async () => {
    const { employeeService } = await import("@/lib/services/employee-service");

    renderHook(() =>
      useEmployees({
        filters: {
          includeArchived: true,
          includeTerminated: true,
        },
      })
    );

    await waitFor(() => {
      expect(employeeService.getAll).toHaveBeenCalledWith({
        includeArchived: true,
        includeTerminated: true,
      });
    });
  });

  it("should fetch custom data for external party users", async () => {
    const { customDataService } = await import("@/lib/services/custom-data-service");

    const { result } = renderHook(() =>
      useEmployees({
        userRole: "sodexo",
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(customDataService.getCustomData).toHaveBeenCalledWith("1");
    expect(result.current.employees[0]).toHaveProperty("customData");
  });

  it("should not fetch custom data for HR admin", async () => {
    const { customDataService } = await import("@/lib/services/custom-data-service");

    const { result } = renderHook(() =>
      useEmployees({
        userRole: "hr_admin",
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(customDataService.getCustomData).not.toHaveBeenCalled();
  });

  it("should provide refetch function", async () => {
    const { employeeService } = await import("@/lib/services/employee-service");

    const { result } = renderHook(() => useEmployees());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear previous calls
    vi.mocked(employeeService.getAll).mockClear();

    // Trigger refetch
    await result.current.refetch();

    expect(employeeService.getAll).toHaveBeenCalledTimes(1);
  });

  it("should indicate real-time connection status", async () => {
    const { result } = renderHook(() =>
      useEmployees({
        enableRealtime: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isConnected).toBe(true);
  });

  it("should disable real-time when requested", async () => {
    const { useRealtime } = await import("@/lib/hooks/use-realtime");

    renderHook(() =>
      useEmployees({
        enableRealtime: false,
      })
    );

    await waitFor(() => {
      expect(useRealtime).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });
  });
});
