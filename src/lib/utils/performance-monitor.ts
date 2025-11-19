/**
 * Performance Monitoring Utilities
 * Story 12.5: Mobile Performance Optimizations - AC1
 * 
 * Tracks and logs performance metrics including:
 * - First Contentful Paint (FCP)
 * - Time to Interactive (TTI)
 * - Largest Contentful Paint (LCP)
 * - First Input Delay (FID)
 * - Cumulative Layout Shift (CLS)
 */

export interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint (ms)
  tti: number | null; // Time to Interactive (ms)
  lcp: number | null; // Largest Contentful Paint (ms)
  fid: number | null; // First Input Delay (ms)
  cls: number | null; // Cumulative Layout Shift
  pageLoadTime: number | null; // Total page load time (ms)
}

export interface PerformanceTargets {
  fcp: number; // Target: 1500ms (1.5s)
  tti: number; // Target: 3500ms (3.5s)
  lcp: number; // Target: 2500ms (2.5s)
  fid: number; // Target: 100ms
  cls: number; // Target: 0.1
  pageLoadTime: number; // Target: 3000ms (3s)
}

export const DEFAULT_TARGETS: PerformanceTargets = {
  fcp: 1500,
  tti: 3500,
  lcp: 2500,
  fid: 100,
  cls: 0.1,
  pageLoadTime: 3000,
};

/**
 * Check if performance metrics meet targets
 */
export function checkPerformanceTargets(
  metrics: PerformanceMetrics,
  targets: PerformanceTargets = DEFAULT_TARGETS
): {
  passed: boolean;
  failures: string[];
} {
  const failures: string[] = [];

  if (metrics.fcp !== null && metrics.fcp > targets.fcp) {
    failures.push(`FCP: ${metrics.fcp}ms > ${targets.fcp}ms target`);
  }
  if (metrics.tti !== null && metrics.tti > targets.tti) {
    failures.push(`TTI: ${metrics.tti}ms > ${targets.tti}ms target`);
  }
  if (metrics.lcp !== null && metrics.lcp > targets.lcp) {
    failures.push(`LCP: ${metrics.lcp}ms > ${targets.lcp}ms target`);
  }
  if (metrics.fid !== null && metrics.fid > targets.fid) {
    failures.push(`FID: ${metrics.fid}ms > ${targets.fid}ms target`);
  }
  if (metrics.cls !== null && metrics.cls > targets.cls) {
    failures.push(`CLS: ${metrics.cls} > ${targets.cls} target`);
  }
  if (metrics.pageLoadTime !== null && metrics.pageLoadTime > targets.pageLoadTime) {
    failures.push(`Page Load: ${metrics.pageLoadTime}ms > ${targets.pageLoadTime}ms target`);
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Log performance metrics to console (development) or analytics (production)
 */
export function logPerformanceMetrics(
  metrics: PerformanceMetrics,
  page: string = 'unknown'
): void {
  const targets = checkPerformanceTargets(metrics);
  
  const logData = {
    page,
    metrics,
    targets: DEFAULT_TARGETS,
    passed: targets.passed,
    failures: targets.failures,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'development') {
    // Development: Detailed console logging
    console.group(`📊 Performance Metrics - ${page}`);
    console.log('FCP:', metrics.fcp !== null ? `${metrics.fcp}ms` : 'N/A', 
      metrics.fcp !== null && metrics.fcp <= DEFAULT_TARGETS.fcp ? '✅' : '❌');
    console.log('TTI:', metrics.tti !== null ? `${metrics.tti}ms` : 'N/A',
      metrics.tti !== null && metrics.tti <= DEFAULT_TARGETS.tti ? '✅' : '❌');
    console.log('LCP:', metrics.lcp !== null ? `${metrics.lcp}ms` : 'N/A',
      metrics.lcp !== null && metrics.lcp <= DEFAULT_TARGETS.lcp ? '✅' : '❌');
    console.log('FID:', metrics.fid !== null ? `${metrics.fid}ms` : 'N/A',
      metrics.fid !== null && metrics.fid <= DEFAULT_TARGETS.fid ? '✅' : '❌');
    console.log('CLS:', metrics.cls !== null ? metrics.cls.toFixed(3) : 'N/A',
      metrics.cls !== null && metrics.cls <= DEFAULT_TARGETS.cls ? '✅' : '❌');
    console.log('Page Load:', metrics.pageLoadTime !== null ? `${metrics.pageLoadTime}ms` : 'N/A',
      metrics.pageLoadTime !== null && metrics.pageLoadTime <= DEFAULT_TARGETS.pageLoadTime ? '✅' : '❌');
    
    if (!targets.passed) {
      console.warn('⚠️ Performance targets not met:', targets.failures);
    }
    console.groupEnd();
  } else {
    // Production: Send to analytics (can be extended to send to Vercel Analytics, etc.)
    // For now, log as JSON for external collection
    console.log('[PERF]', JSON.stringify(logData));
  }
}

/**
 * Get current page path for performance tracking
 */
export function getCurrentPagePath(): string {
  if (typeof window === 'undefined') return 'unknown';
  return window.location.pathname;
}

