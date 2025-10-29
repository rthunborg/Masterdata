/**
 * Animation helper utilities for real-time updates
 */

/**
 * Triggers a brief highlight animation on a row
 * @param rowId - The ID of the row to highlight
 * @param setHighlightedRowId - State setter for highlighted row ID
 * @param duration - Duration of highlight in milliseconds (default: 2000)
 */
export function highlightRow(
  rowId: string,
  setHighlightedRowId: (id: string | null) => void,
  duration: number = 2000
): void {
  setHighlightedRowId(rowId);
  setTimeout(() => setHighlightedRowId(null), duration);
}

/**
 * Debounces a function call
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function with cancel method
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = function (...args: Parameters<T>) {
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  } as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

/**
 * Tracks performance metrics for real-time events
 */
export const performanceTracker = {
  /**
   * Tracks and logs event latency
   * @param eventTimestamp - ISO timestamp from the event
   * @param warningThreshold - Threshold in ms to trigger warning (default: 2000)
   */
  trackEventLatency(eventTimestamp: string, warningThreshold: number = 2000): number {
    const latency = Date.now() - new Date(eventTimestamp).getTime();
    
    if (latency > warningThreshold) {
      console.warn(`Real-time latency exceeded ${warningThreshold}ms: ${latency}ms`);
    }
    
    return latency;
  },

  /**
   * Tracks memory usage (if available in browser)
   */
  trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as { memory?: { usedJSHeapSize: number } }).memory;
      if (memory) {
        const usage = memory.usedJSHeapSize / 1024 / 1024;
        console.log(`Memory usage: ${usage.toFixed(2)}MB`);
      }
    }
  }
};
