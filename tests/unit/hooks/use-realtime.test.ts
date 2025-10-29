import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRealtime } from "@/lib/hooks/use-realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Mock Supabase client
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
} as unknown as RealtimeChannel;

const mockRemoveChannel = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  })),
}));

describe("useRealtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with disconnected status", () => {
    const { result } = renderHook(() =>
      useRealtime({
        table: "employees",
        enabled: false,
      })
    );

    expect(result.current.status).toBe("disconnected");
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastEvent).toBeNull();
  });

  it("should subscribe to channel when enabled", async () => {
    mockChannel.subscribe.mockImplementation((callback) => {
      callback("SUBSCRIBED", null);
      return mockChannel;
    });

    const { result } = renderHook(() =>
      useRealtime({
        table: "employees",
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe("connected");
    });

    expect(result.current.isConnected).toBe(true);
    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        schema: "public",
        table: "employees",
      }),
      expect.any(Function)
    );
  });

  it("should handle event callbacks", async () => {
    const onEvent = vi.fn();
    let eventHandler: (payload: Record<string, unknown>) => void;

    mockChannel.on.mockImplementation((_type: string, _config: Record<string, unknown>, handler: (payload: Record<string, unknown>) => void) => {
      eventHandler = handler;
      return mockChannel;
    });

    mockChannel.subscribe.mockImplementation((callback: (status: string) => void) => {
      callback("SUBSCRIBED");
      return mockChannel;
    });

    renderHook(() =>
      useRealtime({
        table: "employees",
        onEvent,
        enabled: true,
      })
    );

    await waitFor(() => expect(eventHandler).toBeDefined());

    // Simulate real-time event
    const mockPayload = {
      eventType: "UPDATE",
      schema: "public",
      table: "employees",
      old: { id: "1", first_name: "John" },
      new: { id: "1", first_name: "Jonathan" },
      commit_timestamp: new Date().toISOString(),
    };

    eventHandler(mockPayload);

    await waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "UPDATE",
          table: "employees",
          old: mockPayload.old,
          new: mockPayload.new,
        })
      );
    });
  });

  it("should handle channel errors", async () => {
    const testError = new Error("Channel error");

    mockChannel.subscribe.mockImplementation((callback) => {
      callback("CHANNEL_ERROR", testError);
      return mockChannel;
    });

    const { result } = renderHook(() =>
      useRealtime({
        table: "employees",
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe("reconnecting");
      expect(result.current.error).toEqual(testError);
    });
  });

  it("should clean up on unmount", async () => {
    mockChannel.subscribe.mockImplementation((callback) => {
      callback("SUBSCRIBED", null);
      return mockChannel;
    });

    const { unmount } = renderHook(() =>
      useRealtime({
        table: "employees",
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it("should use custom schema and event type", async () => {
    mockChannel.subscribe.mockImplementation((callback) => {
      callback("SUBSCRIBED", null);
      return mockChannel;
    });

    renderHook(() =>
      useRealtime({
        table: "custom_table",
        schema: "custom_schema",
        event: "INSERT",
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        expect.objectContaining({
          event: "INSERT",
          schema: "custom_schema",
          table: "custom_table",
        }),
        expect.any(Function)
      );
    });
  });

  it("should not subscribe when disabled", () => {
    const { result } = renderHook(() =>
      useRealtime({
        table: "employees",
        enabled: false,
      })
    );

    expect(result.current.status).toBe("disconnected");
    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });
});
