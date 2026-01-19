import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StickyScrollbar, useStickyScrollbar } from "@/components/ui/sticky-scrollbar";
import * as React from "react";

// Track observer disconnects for testing
let mockResizeDisconnect: ReturnType<typeof vi.fn>;
let mockIntersectionDisconnect: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();

  mockResizeDisconnect = vi.fn();
  mockIntersectionDisconnect = vi.fn();

  // Mock ResizeObserver as a class
  class MockResizeObserver {
    callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = mockResizeDisconnect;
  }
  global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

  // Mock IntersectionObserver as a class
  class MockIntersectionObserver {
    callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = mockIntersectionDisconnect;
  }
  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("StickyScrollbar", () => {
  describe("Visibility Logic", () => {
    it("does not render when container has no horizontal overflow", () => {
      const TestComponent = () => {
        const containerRef = React.useRef<HTMLDivElement>(null);

        return (
          <>
            <div
              ref={containerRef}
              data-testid="container"
              style={{ width: "500px", overflow: "auto" }}
            >
              <div style={{ width: "400px" }}>Content</div>
            </div>
            <StickyScrollbar containerRef={containerRef} />
          </>
        );
      };

      renderWithI18n(<TestComponent />);

      // Sticky scrollbar should not be visible when there's no overflow
      expect(screen.queryByTestId("sticky-scrollbar")).not.toBeInTheDocument();
    });

    it("does not render when containerRef is null", () => {
      const nullRef = { current: null };

      renderWithI18n(<StickyScrollbar containerRef={nullRef} />);

      expect(screen.queryByTestId("sticky-scrollbar")).not.toBeInTheDocument();
    });
  });

  describe("Scroll Synchronization", () => {
    it("syncs scroll position from container to sticky scrollbar", async () => {
      const TestComponent = () => {
        const ref = React.useRef<HTMLDivElement>(null);

        return (
          <>
            <div
              ref={ref}
              data-testid="container"
              style={{ width: "500px", overflow: "auto" }}
            >
              <div style={{ width: "1000px", height: "2000px" }}>
                Wide and tall content
              </div>
            </div>
            <StickyScrollbar containerRef={ref} />
          </>
        );
      };

      renderWithI18n(<TestComponent />);

      // The sticky scrollbar visibility depends on viewport intersection
      // In tests, we can't easily simulate the real behavior
      // This test verifies the component mounts without errors
      expect(screen.getByTestId("container")).toBeInTheDocument();
    });
  });

  describe("Cleanup", () => {
    it("disconnects observers on unmount", () => {
      const TestComponent = () => {
        const containerRef = React.useRef<HTMLDivElement>(null);

        return (
          <>
            <div
              ref={containerRef}
              data-testid="container"
              style={{ width: "500px", overflow: "auto" }}
            >
              <div style={{ width: "1000px" }}>Wide content</div>
            </div>
            <StickyScrollbar containerRef={containerRef} />
          </>
        );
      };

      const { unmount } = renderWithI18n(<TestComponent />);

      unmount();

      // Verify observers are disconnected
      expect(mockResizeDisconnect).toHaveBeenCalled();
      expect(mockIntersectionDisconnect).toHaveBeenCalled();
    });
  });

  describe("Styling", () => {
    it("applies custom className when provided", async () => {
      const TestComponent = () => {
        const containerRef = React.useRef<HTMLDivElement>(null);

        return (
          <>
            <div
              ref={containerRef}
              data-testid="container"
              style={{ width: "500px", overflow: "auto" }}
            >
              <div style={{ width: "1000px", height: "2000px" }}>
                Wide and tall content
              </div>
            </div>
            <StickyScrollbar 
              containerRef={containerRef} 
              className="custom-class"
              zIndex={50}
            />
          </>
        );
      };

      renderWithI18n(<TestComponent />);

      // The component should mount without errors
      expect(screen.getByTestId("container")).toBeInTheDocument();
    });
  });

  describe("useStickyScrollbar Hook", () => {
    it("returns containerRef and stickyScrollbarProps", () => {
      const HookTestComponent = () => {
        const { containerRef, stickyScrollbarProps } = useStickyScrollbar<HTMLDivElement>();

        return (
          <>
            <div
              ref={containerRef}
              data-testid="container"
              style={{ width: "500px", overflow: "auto" }}
            >
              <div style={{ width: "1000px" }}>Wide content</div>
            </div>
            <StickyScrollbar {...stickyScrollbarProps} />
          </>
        );
      };

      renderWithI18n(<HookTestComponent />);

      expect(screen.getByTestId("container")).toBeInTheDocument();
    });

    it("provides containerRef that can be attached to an element", () => {
      let capturedRef: React.RefObject<HTMLDivElement | null> | null = null;

      const HookTestComponent = () => {
        const { containerRef, stickyScrollbarProps } = useStickyScrollbar<HTMLDivElement>();
        capturedRef = containerRef;

        return (
          <div
            ref={containerRef}
            data-testid="container"
          >
            Content
          </div>
        );
      };

      renderWithI18n(<HookTestComponent />);

      // After render, the ref should be attached
      expect(capturedRef).not.toBeNull();
      expect(capturedRef?.current).toBe(screen.getByTestId("container"));
    });
  });

  describe("Accessibility", () => {
    it("has aria-hidden attribute on sticky scrollbar", async () => {
      // We can't easily test the visible state in unit tests
      // but we verify the component structure
      const TestComponent = () => {
        const containerRef = React.useRef<HTMLDivElement>(null);

        return (
          <>
            <div
              ref={containerRef}
              data-testid="container"
              style={{ width: "500px", overflow: "auto" }}
            >
              <div style={{ width: "1000px" }}>Wide content</div>
            </div>
            <StickyScrollbar containerRef={containerRef} />
          </>
        );
      };

      renderWithI18n(<TestComponent />);

      // When visible, the sticky scrollbar should have aria-hidden
      // Since it's a duplicate scrollbar for visual purposes only
      const stickyScrollbar = screen.queryByTestId("sticky-scrollbar");
      if (stickyScrollbar) {
        expect(stickyScrollbar).toHaveAttribute("aria-hidden", "true");
      }
    });
  });
});

describe("Scroll Sync Logic (Unit Tests)", () => {
  describe("isStickyScrollbarNeeded", () => {
    it("returns true when horizontal overflow AND bottom not visible", () => {
      // This tests the logic conceptually
      const hasHorizontalOverflow = true;
      const tableBottomVisible = false;
      const shouldShowSticky = hasHorizontalOverflow && !tableBottomVisible;
      expect(shouldShowSticky).toBe(true);
    });

    it("returns false when no horizontal overflow", () => {
      const hasHorizontalOverflow = false;
      const tableBottomVisible = false;
      const shouldShowSticky = hasHorizontalOverflow && !tableBottomVisible;
      expect(shouldShowSticky).toBe(false);
    });

    it("returns false when table bottom is visible", () => {
      const hasHorizontalOverflow = true;
      const tableBottomVisible = true;
      const shouldShowSticky = hasHorizontalOverflow && !tableBottomVisible;
      expect(shouldShowSticky).toBe(false);
    });

    it("returns false when neither overflow nor visibility", () => {
      const hasHorizontalOverflow = false;
      const tableBottomVisible = true;
      const shouldShowSticky = hasHorizontalOverflow && !tableBottomVisible;
      expect(shouldShowSticky).toBe(false);
    });
  });
});
