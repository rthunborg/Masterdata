/**
 * Responsive Test Helpers
 * Story 11.11: Mobile Responsive UI Tests
 * 
 * Utilities for testing responsive layouts and mobile UI behavior
 */

import { vi } from 'vitest';

/**
 * Tailwind breakpoints used in the application
 */
export const BREAKPOINTS = {
  sm: 640,   // Small devices (landscape phones)
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (desktops)
  xl: 1280,  // Extra large devices
} as const;

/**
 * Common viewport sizes for testing
 */
export const VIEWPORTS = {
  mobileSmall: { width: 320, height: 568 },   // iPhone SE (1st gen)
  mobile: { width: 375, height: 667 },        // iPhone 12/13/14
  mobileLarge: { width: 414, height: 896 },   // iPhone 11 Pro Max
  tablet: { width: 768, height: 1024 },        // iPad
  desktop: { width: 1024, height: 768 },      // Desktop
  desktopLarge: { width: 1280, height: 720 },  // Large desktop
} as const;

/**
 * Sets the viewport size and updates window.matchMedia mocks
 * @param width - Viewport width in pixels
 * @param height - Viewport height in pixels (default: 667)
 */
export function setViewportSize(width: number, height: number = 667): void {
  // Update window.innerWidth and innerHeight
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  // Update window.matchMedia to return correct matches based on width
  const matchMediaMock = vi.fn().mockImplementation((query: string) => {
    let matches = false;

    // Parse common Tailwind breakpoint queries
    if (query.includes('max-width')) {
      const match = query.match(/max-width:\s*(\d+)px/);
      if (match) {
        const maxWidth = parseInt(match[1], 10);
        matches = width <= maxWidth;
      }
    } else if (query.includes('min-width')) {
      const match = query.match(/min-width:\s*(\d+)px/);
      if (match) {
        const minWidth = parseInt(match[1], 10);
        matches = width >= minWidth;
      }
    }

    // Handle combined queries (e.g., "(min-width: 768px) and (max-width: 1023px)")
    if (query.includes('and')) {
      const parts = query.split('and');
      let allMatch = true;
      for (const part of parts) {
        let partMatches = false;
        if (part.includes('max-width')) {
          const match = part.match(/max-width:\s*(\d+)px/);
          if (match) {
            partMatches = width <= parseInt(match[1], 10);
          }
        } else if (part.includes('min-width')) {
          const match = part.match(/min-width:\s*(\d+)px/);
          if (match) {
            partMatches = width >= parseInt(match[1], 10);
          }
        }
        allMatch = allMatch && partMatches;
      }
      matches = allMatch;
    }

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: matchMediaMock,
  });

  // Trigger resize event to notify components
  window.dispatchEvent(new Event('resize'));
}

/**
 * Measures the touch target size of an element
 * @param element - DOM element to measure
 * @returns Object with width and height in pixels
 */
export function measureTouchTarget(element: HTMLElement): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Asserts that a container has no horizontal overflow
 * @param container - Container element to check
 * @returns true if no overflow, throws error if overflow detected
 */
export function assertNoOverflow(container: HTMLElement): boolean {
  const scrollWidth = container.scrollWidth;
  const clientWidth = container.clientWidth;

  if (scrollWidth > clientWidth) {
    throw new Error(
      `Horizontal overflow detected: scrollWidth (${scrollWidth}px) > clientWidth (${clientWidth}px)`
    );
  }

  return true;
}

/**
 * Asserts that elements are stacked vertically (flex-col layout)
 * @param container - Container element with flex layout
 * @returns true if stacked vertically, throws error otherwise
 */
export function assertStackedVertically(container: HTMLElement): boolean {
  const styles = window.getComputedStyle(container);
  const flexDirection = styles.flexDirection;

  if (flexDirection !== 'column') {
    throw new Error(
      `Expected flex-col layout but got flex-direction: ${flexDirection}`
    );
  }

  return true;
}

/**
 * Determines the active breakpoint based on current viewport width
 * @returns Breakpoint name ('mobile', 'tablet', 'desktop') or null
 */
export function getComputedBreakpoint(): 'mobile' | 'tablet' | 'desktop' | null {
  const width = window.innerWidth;

  if (width < BREAKPOINTS.md) {
    return 'mobile';
  } else if (width < BREAKPOINTS.lg) {
    return 'tablet';
  } else if (width >= BREAKPOINTS.lg) {
    return 'desktop';
  }

  return null;
}

/**
 * Resets viewport to default desktop size (1024x768)
 */
export function resetViewport(): void {
  setViewportSize(1024, 768);
}

/**
 * Checks if an element is fully visible within the viewport
 * @param element - Element to check
 * @returns true if fully visible, false if partially or fully hidden
 */
export function isFullyVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  return (
    rect.left >= 0 &&
    rect.top >= 0 &&
    rect.right <= viewportWidth &&
    rect.bottom <= viewportHeight
  );
}

/**
 * Gets computed styles for an element
 * @param element - Element to get styles for
 * @returns Computed CSS styles
 */
export function getComputedStyles(element: HTMLElement): CSSStyleDeclaration {
  return window.getComputedStyle(element);
}

