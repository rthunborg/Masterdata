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
 * Creates a duplicated horizontal scrollbar fixed to the bottom of the viewport,
 * positioned and sized to exactly match the referenced container. Only visible when
 * the container's native scrollbar is scrolled out of view. The two scrollbars are
 * synchronized bidirectionally.
 *
 * Key design decision: uses getBoundingClientRect() to match the container's exact
 * position/width instead of 100vw, which prevents page-level horizontal scrollbar.
 */
export function StickyScrollbar({
  containerRef,
  className,
  zIndex = 40,
}: StickyScrollbarProps) {
  const stickyScrollbarRef = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [contentWidth, setContentWidth] = React.useState(0);
  const [position, setPosition] = React.useState({ left: 0, width: 0 });
  const isSyncingRef = React.useRef(false);

  const updateLayout = React.useCallback(() => {
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

    const rect = container.getBoundingClientRect();

    // Hide if the container is entirely out of view
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      setIsVisible(false);
      return;
    }

    // Only show when the native scrollbar (at container bottom) is below the viewport
    if (rect.bottom <= window.innerHeight) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    setContentWidth(container.scrollWidth);
    setPosition({ left: rect.left, width: rect.width });
  }, [containerRef]);

  const handleContainerScroll = React.useCallback(() => {
    if (isSyncingRef.current) return;

    const container = containerRef.current;
    const stickyScrollbar = stickyScrollbarRef.current;
    if (!container || !stickyScrollbar) return;

    isSyncingRef.current = true;
    stickyScrollbar.scrollLeft = container.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [containerRef]);

  const handleStickyScroll = React.useCallback(() => {
    if (isSyncingRef.current) return;

    const container = containerRef.current;
    const stickyScrollbar = stickyScrollbarRef.current;
    if (!container || !stickyScrollbar) return;

    isSyncingRef.current = true;
    container.scrollLeft = stickyScrollbar.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [containerRef]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      updateLayout();
      setTimeout(updateLayout, 100);
    });

    container.addEventListener("scroll", handleContainerScroll, { passive: true });
    window.addEventListener("scroll", updateLayout, { passive: true });
    window.addEventListener("resize", updateLayout, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      updateLayout();
    });
    resizeObserver.observe(container);
    if (container.firstElementChild) {
      resizeObserver.observe(container.firstElementChild);
    }

    return () => {
      container.removeEventListener("scroll", handleContainerScroll);
      window.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
      resizeObserver.disconnect();
    };
  }, [containerRef, handleContainerScroll, updateLayout]);

  React.useEffect(() => {
    const stickyScrollbar = stickyScrollbarRef.current;
    if (!stickyScrollbar || !isVisible) return;

    stickyScrollbar.addEventListener("scroll", handleStickyScroll, { passive: true });
    return () => {
      stickyScrollbar.removeEventListener("scroll", handleStickyScroll);
    };
  }, [handleStickyScroll, isVisible]);

  React.useEffect(() => {
    if (isVisible && containerRef.current && stickyScrollbarRef.current) {
      stickyScrollbarRef.current.scrollLeft = containerRef.current.scrollLeft;
    }
  }, [isVisible, containerRef]);

  if (!isVisible || contentWidth <= position.width) {
    return null;
  }

  return (
    <div
      ref={stickyScrollbarRef}
      className={cn(
        "fixed bottom-0 overflow-x-auto overflow-y-hidden",
        "bg-background/80 backdrop-blur-sm border-t",
        className
      )}
      style={{
        zIndex,
        height: "17px",
        left: position.left,
        width: position.width,
      }}
      aria-hidden="true"
      data-testid="sticky-scrollbar"
    >
      <div
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
