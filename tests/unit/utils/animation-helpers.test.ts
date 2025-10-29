import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { highlightRow, debounce, performanceTracker } from "@/lib/utils/animation-helpers";

describe("animation-helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("highlightRow", () => {
    it("should set highlighted row ID and clear it after duration", () => {
      const mockSetter = vi.fn();
      const rowId = "employee-123";

      highlightRow(rowId, mockSetter, 2000);

      // Should immediately set the row ID
      expect(mockSetter).toHaveBeenCalledWith(rowId);
      expect(mockSetter).toHaveBeenCalledTimes(1);

      // Fast-forward time
      vi.advanceTimersByTime(2000);

      // Should clear the row ID after duration
      expect(mockSetter).toHaveBeenCalledWith(null);
      expect(mockSetter).toHaveBeenCalledTimes(2);
    });

    it("should use default duration of 2000ms", () => {
      const mockSetter = vi.fn();
      
      highlightRow("test-id", mockSetter);
      
      vi.advanceTimersByTime(1999);
      expect(mockSetter).toHaveBeenCalledTimes(1);
      
      vi.advanceTimersByTime(1);
      expect(mockSetter).toHaveBeenCalledTimes(2);
    });
  });

  describe("debounce", () => {
    it("should debounce function calls", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn("call1");
      debouncedFn("call2");
      debouncedFn("call3");

      // Should not call immediately
      expect(mockFn).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(100);

      // Should only call once with last arguments
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith("call3");
    });

    it("should cancel pending calls", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn("test");
      debouncedFn.cancel();

      vi.advanceTimersByTime(100);

      expect(mockFn).not.toHaveBeenCalled();
    });

    it("should handle multiple cancel calls safely", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn.cancel();
      debouncedFn.cancel();

      expect(() => debouncedFn.cancel()).not.toThrow();
    });
  });

  describe("performanceTracker", () => {
    describe("trackEventLatency", () => {
      it("should calculate latency correctly", () => {
        const timestamp = new Date(Date.now() - 1000).toISOString();
        const latency = performanceTracker.trackEventLatency(timestamp, 2000);

        expect(latency).toBeGreaterThanOrEqual(1000);
        expect(latency).toBeLessThan(1100);
      });

      it("should warn when latency exceeds threshold", () => {
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const timestamp = new Date(Date.now() - 3000).toISOString();

        performanceTracker.trackEventLatency(timestamp, 2000);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Real-time latency exceeded 2000ms")
        );

        consoleWarnSpy.mockRestore();
      });

      it("should not warn when latency is within threshold", () => {
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const timestamp = new Date(Date.now() - 500).toISOString();

        performanceTracker.trackEventLatency(timestamp, 2000);

        expect(consoleWarnSpy).not.toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
      });
    });

    describe("trackMemoryUsage", () => {
      it("should log memory usage when available", () => {
        const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        
        // Mock performance.memory
        const originalPerformance = global.performance;
        (global.performance as any) = {
          ...originalPerformance,
          memory: {
            usedJSHeapSize: 50 * 1024 * 1024, // 50MB
          },
        };

        performanceTracker.trackMemoryUsage();

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining("Memory usage: 50.00MB")
        );

        consoleLogSpy.mockRestore();
        global.performance = originalPerformance;
      });

      it("should handle missing memory API gracefully", () => {
        const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        performanceTracker.trackMemoryUsage();

        // Should not throw or log if memory API is not available
        expect(() => performanceTracker.trackMemoryUsage()).not.toThrow();

        consoleLogSpy.mockRestore();
      });
    });
  });
});
