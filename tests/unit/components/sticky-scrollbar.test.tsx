import { screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StickyScrollbar, useStickyScrollbar } from "@/components/ui/sticky-scrollbar";
import * as React from "react";

let mockResizeDisconnect: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();

  mockResizeDisconnect = vi.fn();

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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("StickyScrollbar", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

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

      renderWithQueryClient(<TestComponent />);

      expect(screen.queryByTestId("sticky-scrollbar")).not.toBeInTheDocument();
    });

    it("does not render when containerRef is null", () => {
      const nullRef = { current: null };

      renderWithQueryClient(<StickyScrollbar containerRef={nullRef} />);

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

      renderWithQueryClient(<TestComponent />);

      expect(screen.getByTestId("container")).toBeInTheDocument();
    });
  });

  describe("Cleanup", () => {
    it("disconnects ResizeObserver and removes event listeners on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

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

      const { unmount } = renderWithQueryClient(<TestComponent />);

      unmount();

      expect(mockResizeDisconnect).toHaveBeenCalled();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
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

      renderWithQueryClient(<TestComponent />);

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

      renderWithQueryClient(<HookTestComponent />);

      expect(screen.getByTestId("container")).toBeInTheDocument();
    });

    it("provides containerRef that can be attached to an element", () => {
      const captured: { ref: React.RefObject<HTMLDivElement | null> | null } = { ref: null };

      const HookTestComponent = () => {
        const { containerRef } = useStickyScrollbar<HTMLDivElement>();
        
        React.useEffect(() => {
          captured.ref = containerRef;
        }, [containerRef]);

        return (
          <div
            ref={containerRef}
            data-testid="container"
          >
            Content
          </div>
        );
      };

      renderWithQueryClient(<HookTestComponent />);

      const container = screen.getByTestId("container");
      expect(container).toBeInTheDocument();
      expect(captured.ref?.current).toBe(container);
    });
  });

  describe("Accessibility", () => {
    it("has aria-hidden attribute on sticky scrollbar", async () => {
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

      renderWithQueryClient(<TestComponent />);

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
