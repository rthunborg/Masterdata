'use client';

/**
 * Performance Tracker Component
 * Story 12.5: Mobile Performance Optimizations - AC1
 * 
 * Tracks and logs performance metrics (FCP, TTI, LCP, FID, CLS)
 * for validation against Story 12.5 acceptance criteria.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { PerformanceMetrics } from '@/lib/utils/performance-monitor';
import { logPerformanceMetrics, getCurrentPagePath } from '@/lib/utils/performance-monitor';

export function PerformanceTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Only track in browser environment
    if (typeof window === 'undefined') return;

    const metrics: PerformanceMetrics = {
      fcp: null,
      tti: null,
      lcp: null,
      fid: null,
      cls: 0,
      pageLoadTime: null,
    };

    // Track page load time
    const pageLoadStart = performance.now();
    if (document.readyState === 'complete') {
      metrics.pageLoadTime = performance.now() - pageLoadStart;
    } else {
      window.addEventListener('load', () => {
        metrics.pageLoadTime = performance.now() - pageLoadStart;
      });
    }

    // Track First Contentful Paint (FCP)
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            metrics.fcp = Math.round(entry.startTime);
            paintObserver.disconnect();
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      // PerformanceObserver not supported
      console.warn('PerformanceObserver not supported');
    }

    // Track Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
        if (lastEntry) {
          // LCP is the renderTime or loadTime, whichever is larger
          const lcpValue = lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime;
          metrics.lcp = Math.round(lcpValue);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // PerformanceObserver not supported
    }

    // Track First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming;
          if (fidEntry.processingStart && fidEntry.startTime) {
            metrics.fid = Math.round(fidEntry.processingStart - fidEntry.startTime);
            fidObserver.disconnect();
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // PerformanceObserver not supported
    }

    // Track Cumulative Layout Shift (CLS)
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as LayoutShift;
          if (!('hadRecentInput' in layoutShift) || !layoutShift.hadRecentInput) {
            metrics.cls = (metrics.cls || 0) + layoutShift.value;
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // PerformanceObserver not supported
    }

    // Track Time to Interactive (TTI)
    // TTI is more complex - we approximate it as when the page is fully loaded
    // and the main thread is idle for 5 seconds
    const ttiStartTime = performance.now();
    let ttiIdleStart: number | null = null;
    const TTI_IDLE_THRESHOLD = 5000; // 5 seconds of idle time

    // Polyfill for requestIdleCallback
    const requestIdleCallbackPolyfill = (
      callback: (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void,
      options?: { timeout?: number }
    ): number => {
      if ('requestIdleCallback' in window) {
        return window.requestIdleCallback(callback, options);
      } else {
        // Fallback: use setTimeout
        return Number(setTimeout(() => {
          callback({
            timeRemaining: () => 0,
            didTimeout: false,
          });
        }, options?.timeout || 1));
      }
    };

    const checkTTI = () => {
      if (document.readyState === 'complete') {
        // Check if main thread is idle
        requestIdleCallbackPolyfill(
          () => {
            if (ttiIdleStart === null) {
              ttiIdleStart = performance.now();
            } else if (performance.now() - ttiIdleStart >= TTI_IDLE_THRESHOLD) {
              metrics.tti = Math.round(ttiIdleStart - ttiStartTime);
            } else {
              // Reset idle timer if activity detected
              setTimeout(checkTTI, 100);
            }
          },
          { timeout: 1000 }
        );
      }
    };

    // Start TTI tracking after a short delay to allow initial render
    setTimeout(checkTTI, 100);

    // Log metrics after a delay to allow all metrics to be collected
    const logTimeout = setTimeout(() => {
      logPerformanceMetrics(metrics, pathname || getCurrentPagePath());
    }, 6000); // Wait 6 seconds to allow TTI to be measured

    return () => {
      clearTimeout(logTimeout);
    };
  }, [pathname]);

  // This component doesn't render anything
  return null;
}

// Type definitions for Performance API extensions
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput?: boolean;
}

