import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAvailablePE3Dates } from "@/lib/hooks/use-available-pe3-dates";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Mock fetch
global.fetch = vi.fn();

// Create mock functions with proper typing
const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockReturnThis();

// Mock Supabase client
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
} as unknown as RealtimeChannel;

const mockRemoveChannel = vi.fn();
const mockSupabaseClient = {
  channel: vi.fn(() => mockChannel),
  removeChannel: mockRemoveChannel,
  from: vi.fn(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe("useAvailablePE3Dates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch available dates on mount", async () => {
    const mockDates = [
      {
        id: "date-1",
        week_number: 10,
        year: 2025,
        category: "PE3 Dates",
        date_description: "Fredag 7/3",
        date_value: "2025-03-07",
        notes: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "date-2",
        week_number: 14,
        year: 2025,
        category: "PE3 Dates",
        date_description: "Fredag 4/4",
        date_value: "2025-04-04",
        notes: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockDates,
        meta: { total: 2, timestamp: new Date().toISOString() },
      }),
    });

    const { result } = renderHook(() => useAvailablePE3Dates());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.availableDates).toHaveLength(2);
    expect(result.current.totalAvailable).toBe(2);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith("/api/important-dates/available-pe3");
  });

  it("should refetch when important_dates table changes", async () => {
    let importantDatesHandler: (() => void) | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOn.mockImplementation((type: any, config: any, handler: any) => {
      if (config.table === "important_dates") {
        importantDatesHandler = handler;
      }
      return mockChannel;
    });

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, timestamp: new Date().toISOString() },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "new-date",
              week_number: 20,
              year: 2025,
              category: "PE3 Dates",
              date_description: "Fredag 16/5",
              date_value: "2025-05-16",
              notes: null,
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z",
            },
          ],
          meta: { total: 1, timestamp: new Date().toISOString() },
        }),
      });

    const { result } = renderHook(() => useAvailablePE3Dates());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.availableDates).toHaveLength(0);

    // Verify that handler was registered
    expect(importantDatesHandler).toBeDefined();

    // Trigger real-time event
    importantDatesHandler?.();

    // Wait for debounced refetch (the hook uses 500ms debounce)
    await waitFor(() => {
      expect(result.current.availableDates).toHaveLength(1);
    }, { timeout: 2000 });

    expect(result.current.availableDates[0].id).toBe("new-date");
  });

  it("should refetch when employee pe3_date changes", async () => {
    let employeeHandler: ((payload: { old: { pe3_date?: string | null }, new: { pe3_date?: string | null } }) => void) | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOn.mockImplementation((type: any, config: any, handler: any) => {
      if (config.table === "employees" && config.event === "UPDATE") {
        employeeHandler = handler;
      }
      return mockChannel;
    });

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: "date-1" }],
          meta: { total: 1, timestamp: new Date().toISOString() },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: "date-1" }, { id: "date-2" }],
          meta: { total: 2, timestamp: new Date().toISOString() },
        }),
      });

    const { result } = renderHook(() => useAvailablePE3Dates());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.availableDates).toHaveLength(1);

    // Verify handler was registered
    expect(employeeHandler).toBeDefined();

    // Simulate employee pe3_date change (cleared)
    employeeHandler?.({
      old: { pe3_date: "date-2" },
      new: { pe3_date: null },
    });

    // Wait for debounced refetch
    await waitFor(() => {
      expect(result.current.availableDates).toHaveLength(2);
    }, { timeout: 2000 });
  });

  it("should debounce multiple rapid changes", async () => {
    let handler: (() => void) | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOn.mockImplementation((type: any, config: any, h: any) => {
      if (config.table === "important_dates") {
        handler = h;
      }
      return mockChannel;
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        meta: { total: 0, timestamp: new Date().toISOString() },
      }),
    });

    renderHook(() => useAvailablePE3Dates());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Verify handler exists
    expect(handler).toBeDefined();

    // Trigger 5 rapid changes
    handler?.();
    handler?.();
    handler?.();
    handler?.();
    handler?.();

    // Wait for debounced fetch - should only fetch once more despite 5 triggers
    await waitFor(() => {
      // Should have fetched only once more (debounced the 5 calls into 1)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, { timeout: 2000 });
  });

  it("should include current PE3 date when currentPE3DateId provided", async () => {
    const currentDate = {
      id: "current-date",
      week_number: 30,
      year: 2025,
      category: "PE3 Dates",
      date_description: "Fredag 25/7",
      date_value: "2025-07-25",
      notes: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "date-1",
            week_number: 10,
            year: 2025,
            category: "PE3 Dates",
            date_description: "Fredag 7/3",
            date_value: "2025-03-07",
            notes: null,
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          },
        ],
        meta: { total: 1, timestamp: new Date().toISOString() },
      }),
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: currentDate,
            error: null,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useAvailablePE3Dates("current-date"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have both available date and current date
    expect(result.current.availableDates).toHaveLength(2);
    expect(result.current.availableDates.some((d) => d.id === "current-date")).toBe(true);
    expect(result.current.availableDates.some((d) => d.id === "date-1")).toBe(true);
  });

  it("should handle fetch errors gracefully", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      statusText: "Internal Server Error",
    });

    const { result } = renderHook(() => useAvailablePE3Dates());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain("Failed to fetch available PE3 dates");
    expect(result.current.availableDates).toHaveLength(0);
    expect(result.current.totalAvailable).toBe(0);
  });

  it("should cleanup subscription on unmount", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: { total: 0, timestamp: new Date().toISOString() },
      }),
    });

    const { unmount } = renderHook(() => useAvailablePE3Dates());

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });
});
