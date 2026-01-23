"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StickyScrollbarProps {
  /**
   * Ref to the scrollable container element (the element with overflow-x: auto)
   */
  containerRef: React.RefObject<HTMLElement | null>;
  /**
   * Optional className for the sticky scrollbar wrapper
   */
  className?: string;
  /**
   * Optional z-index override (default: 40, below modals but above table content)
   */
  zIndex?: number;
}

/**
 * StickyScrollbar component
 *
 * Creates a duplicated horizontal scrollbar that stays fixed at the bottom of the viewport
 * when the actual table scrollbar is scrolled out of view. The scrollbars are synchronized
 * bidirectionally.
 *
 * @example
 * ```tsx
 * const containerRef = React.useRef<HTMLDivElement>(null);
 *
 * return (
 *   <>
 *     <div ref={containerRef} className="overflow-x-auto">
 *       <table>...</table>
 *     </div>
 *     <StickyScrollbar containerRef={containerRef} />
 *   </>
 * );
 * ```
 */
export function StickyScrollbar({
  containerRef,
  className,
  zIndex = 40,
}: StickyScrollbarProps) {
  const stickyScrollbarRef = React.useRef<HTMLDivElement>(null);
  const stickyContentRef = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [contentWidth, setContentWidth] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const isSyncingRef = React.useRef(false);

  // Check if sticky scrollbar should be visible
  const updateVisibility = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setIsVisible(false);
      return;
    }

    const hasHorizontalOverflow = container.scrollWidth > container.clientWidth;
    if (!hasHorizontalOverflow) {
      setIsVisible(false);
      return;
    }

    // Always show sticky scrollbar when there's horizontal overflow
    // This allows users to scroll horizontally even when at the top of the page
    setIsVisible(true);
  }, [containerRef]);

  // Update content width to match table scroll width
  const updateDimensions = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setContentWidth(container.scrollWidth);
    setContainerWidth(container.clientWidth);
    updateVisibility();
  }, [containerRef, updateVisibility]);

  // Sync scroll position from container to sticky scrollbar
  const handleContainerScroll = React.useCallback(() => {
    if (isSyncingRef.current) return;

    const container = containerRef.current;
    const stickyScrollbar = stickyScrollbarRef.current;
    if (!container || !stickyScrollbar) return;

    isSyncingRef.current = true;
    stickyScrollbar.scrollLeft = container.scrollLeft;
    // Use requestAnimationFrame to reset the flag after the scroll event has been processed
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [containerRef]);

  // Sync scroll position from sticky scrollbar to container
  const handleStickyScroll = React.useCallback(() => {
    if (isSyncingRef.current) return;

    const container = containerRef.current;
    const stickyScrollbar = stickyScrollbarRef.current;
    if (!container || !stickyScrollbar) return;

    isSyncingRef.current = true;
    container.scrollLeft = stickyScrollbar.scrollLeft;
    // Use requestAnimationFrame to reset the flag after the scroll event has been processed
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [containerRef]);

  // Set up event listeners and observers
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial update
    updateDimensions();

    // Listen to container scroll
    container.addEventListener("scroll", handleContainerScroll, { passive: true });

    // Listen to window scroll and resize for visibility updates
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateDimensions, { passive: true });

    // Use ResizeObserver to detect content size changes
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(container);

    // Also observe the first child (table) for size changes
    if (container.firstElementChild) {
      resizeObserver.observe(container.firstElementChild);
    }

    // Use IntersectionObserver to detect when container bottom enters/exits viewport
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // We're observing a sentinel at the bottom of the container
          // When it's visible, the actual scrollbar is visible too
          // When it's not visible, we should show the sticky scrollbar
          const hasHorizontalOverflow = container.scrollWidth > container.clientWidth;
          if (hasHorizontalOverflow) {
            setIsVisible(!entry.isIntersecting);
          }
        }
      },
      {
        // Observe when the bottom of the container enters/exits the viewport
        rootMargin: "0px 0px 0px 0px",
        threshold: 0,
      }
    );

    // Create a sentinel element at the bottom of the container to observe
    const sentinel = document.createElement("div");
    sentinel.style.height = "1px";
    sentinel.style.width = "100%";
    sentinel.style.position = "absolute";
    sentinel.style.bottom = "0";
    sentinel.style.pointerEvents = "none";
    sentinel.setAttribute("data-sticky-scrollbar-sentinel", "true");

    // We need to make the container position relative if it isn't already
    const containerPosition = getComputedStyle(container).position;
    if (containerPosition === "static") {
      container.style.position = "relative";
    }
    container.appendChild(sentinel);
    intersectionObserver.observe(sentinel);

    return () => {
      container.removeEventListener("scroll", handleContainerScroll);
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      // Clean up sentinel
      const existingSentinel = container.querySelector("[data-sticky-scrollbar-sentinel]");
      if (existingSentinel) {
        container.removeChild(existingSentinel);
      }
    };
  }, [containerRef, handleContainerScroll, updateDimensions, updateVisibility]);

  // Listen to sticky scrollbar scroll
  React.useEffect(() => {
    const stickyScrollbar = stickyScrollbarRef.current;
    if (!stickyScrollbar) return;

    stickyScrollbar.addEventListener("scroll", handleStickyScroll, { passive: true });
    return () => {
      stickyScrollbar.removeEventListener("scroll", handleStickyScroll);
    };
  }, [handleStickyScroll]);

  // Sync initial scroll position when component becomes visible
  React.useEffect(() => {
    if (isVisible && containerRef.current && stickyScrollbarRef.current) {
      stickyScrollbarRef.current.scrollLeft = containerRef.current.scrollLeft;
    }
  }, [isVisible, containerRef]);

  // Don't render if there's no horizontal overflow
  if (!isVisible || contentWidth <= containerWidth) {
    return null;
  }

  return (
    <div
      ref={stickyScrollbarRef}
      className={cn(
        "fixed bottom-0 left-0 right-0 overflow-x-auto overflow-y-hidden",
        "bg-background/80 backdrop-blur-sm border-t",
        // Ensure sticky scrollbar doesn't cause page-level overflow
        "max-w-[100vw]",
        className
      )}
      style={{
        zIndex,
        height: "17px", // Standard scrollbar height
        // Explicitly constrain width to viewport
        width: "100vw",
        // Create a new containing block and isolate from document width calculations
        // Using transform creates a containing block that prevents child widths from affecting document scroll
        transform: "translateZ(0)",
        // CSS containment to prevent layout from affecting ancestors
        contain: "layout size style paint",
      }}
      aria-hidden="true"
      data-testid="sticky-scrollbar"
    >
      <div
        ref={stickyContentRef}
        style={{
          width: contentWidth,
          height: "1px",
        }}
      />
    </div>
  );
}

/**
 * Hook to manage sticky scrollbar state
 * Returns a ref to attach to the scrollable container and the scrollbar props
 */
export function useStickyScrollbar<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = React.useRef<T>(null);

  return {
    containerRef,
    stickyScrollbarProps: {
      containerRef,
    },
  };
}
