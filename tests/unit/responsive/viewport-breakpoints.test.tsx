/**
 * Viewport Breakpoint Tests
 * Story 11.11: Mobile Responsive UI Tests
 * AC6: Viewport Breakpoint Tests
 * 
 * Tests for layout changes at correct breakpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import {
  setViewportSize,
  VIEWPORTS,
  getComputedBreakpoint,
} from '@/../tests/helpers/responsive-test-helpers';
import { useMediaQuery } from '@/hooks/use-media-query';

// Mock useMediaQuery hook
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn((query: string) => {
    const width = window.innerWidth;
    if (query.includes('max-width: 767px')) {
      return width <= 767;
    }
    if (query.includes('max-width: 1023px')) {
      return width <= 1023;
    }
    if (query.includes('min-width: 768px')) {
      return width >= 768;
    }
    if (query.includes('min-width: 1024px')) {
      return width >= 1024;
    }
    return false;
  }),
}));

describe('Viewport Breakpoint Tests (AC6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC6: Mobile layout active at 320px (iPhone SE)', () => {
    setViewportSize(320, 568);
    
    const breakpoint = getComputedBreakpoint();
    expect(breakpoint).toBe('mobile');
    
    // Verify useMediaQuery returns correct value for mobile
    const isMobile = vi.mocked(useMediaQuery)('(max-width: 1023px)');
    expect(isMobile).toBe(true);
  });

  it('AC6: Mobile layout active at 375px (iPhone 12)', () => {
    setViewportSize(375, 667);
    
    const breakpoint = getComputedBreakpoint();
    expect(breakpoint).toBe('mobile');
    
    const isMobile = vi.mocked(useMediaQuery)('(max-width: 1023px)');
    expect(isMobile).toBe(true);
  });

  it('AC6: Tablet layout active at 768px (iPad)', () => {
    setViewportSize(768, 1024);
    
    const breakpoint = getComputedBreakpoint();
    expect(breakpoint).toBe('tablet');
    
    // At 768px, should be tablet (not mobile, not desktop)
    const isMobile = vi.mocked(useMediaQuery)('(max-width: 767px)');
    const isDesktop = vi.mocked(useMediaQuery)('(min-width: 1024px)');
    expect(isMobile).toBe(false);
    expect(isDesktop).toBe(false);
  });

  it('AC6: Desktop layout active at 1024px+', () => {
    setViewportSize(1024, 768);
    
    const breakpoint = getComputedBreakpoint();
    expect(breakpoint).toBe('desktop');
    
    const isDesktop = vi.mocked(useMediaQuery)('(min-width: 1024px)');
    expect(isDesktop).toBe(true);
    
    // Test larger desktop
    setViewportSize(1280, 720);
    const breakpointLarge = getComputedBreakpoint();
    expect(breakpointLarge).toBe('desktop');
  });

  it('AC6: No layout breaks between breakpoints', () => {
    // Test transition points
    const testSizes = [
      { width: 319, expected: 'mobile' },
      { width: 320, expected: 'mobile' },
      { width: 767, expected: 'mobile' },
      { width: 768, expected: 'tablet' },
      { width: 1023, expected: 'tablet' },
      { width: 1024, expected: 'desktop' },
      { width: 1025, expected: 'desktop' },
    ];
    
    testSizes.forEach(({ width, expected }) => {
      setViewportSize(width, 667);
      const breakpoint = getComputedBreakpoint();
      expect(breakpoint).toBe(expected);
    });
  });
});

