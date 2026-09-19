import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useEmployees, _clearEmployeeCache } from "@/lib/hooks/use-employees";
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
    rank: 'SEV',
    gender: 'Man',
    town_district: "Göteborg",
    hire_date: "2020-01-01",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        comments: null,
        one: null,
        one_marked_at: null,
        talmundo: null,
        isps: null,
        photo: null,
        origo: null,
        loneiva: null,
        mail_lon: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
        crewing_done: null,
        created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",      },
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
    _clearEmployeeCache();
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

  it("should use customData included inline from the API for external party users", async () => {
    const { employeeService } = await import("@/lib/services/employee-service");
    const employeesWithCustomData = mockEmployees.map(e => ({
      ...e,
      customData: { custom_field: "value" },
    }));
    vi.mocked(employeeService.getAll).mockResolvedValueOnce(employeesWithCustomData);

    const { result } = renderHook(() =>
      useEmployees({
        userRole: "sodexo",
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.employees[0]).toHaveProperty("customData");
    expect(result.current.employees[0].customData).toEqual({ custom_field: "value" });
  });

  it("should not include customData for HR admin", async () => {
    const { result } = renderHook(() =>
      useEmployees({
        userRole: "hr_admin",
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.employees[0].customData).toBeUndefined();
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
    await act(async () => {
      await result.current.refetch();
    });

    expect(employeeService.getAll).toHaveBeenCalledTimes(1);
  });

  it("should indicate real-time connection status", async () => {
    const { result } = renderHook(() =>
      useEmployees({
        enableRealtime: true,
        userRole: "hr_admin",
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isConnected).toBe(true);
  });

  it("should disable raw employee realtime for external party users", async () => {
    const { useRealtime } = await import("@/lib/hooks/use-realtime");

    renderHook(() =>
      useEmployees({
        enableRealtime: true,
        userRole: "sodexo",
      })
    );

    await waitFor(() => {
      expect(useRealtime).toHaveBeenLastCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });
  });

  it("should keep raw employee realtime disabled until the user role is known", async () => {
    const { useRealtime } = await import("@/lib/hooks/use-realtime");

    renderHook(() =>
      useEmployees({
        enableRealtime: true,
        userRole: undefined,
      })
    );

    await waitFor(() => {
      expect(useRealtime).toHaveBeenLastCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });
  });

  it("should refresh external employee data through the filtered API on focus", async () => {
    const { employeeService } = await import("@/lib/services/employee-service");

    const { result } = renderHook(() =>
      useEmployees({
        enableRealtime: true,
        userRole: "sodexo",
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    vi.mocked(employeeService.getAll).mockClear();

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => {
      expect(employeeService.getAll).toHaveBeenCalledTimes(1);
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("should periodically refresh external employee data through the filtered API", async () => {
    const { employeeService } = await import("@/lib/services/employee-service");
    vi.useFakeTimers();

    const { result, unmount } = renderHook(() =>
      useEmployees({
        enableRealtime: true,
        userRole: "sodexo",
      })
    );

    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(result.current.isLoading).toBe(false);
      vi.mocked(employeeService.getAll).mockClear();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      expect(employeeService.getAll).toHaveBeenCalledTimes(1);
      expect(result.current.isLoading).toBe(false);
    } finally {
      unmount();
      vi.useRealTimers();
    }
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
