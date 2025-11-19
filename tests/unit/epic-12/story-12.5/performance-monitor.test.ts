/**
 * Unit Tests: Performance Monitor Utilities
 * Story 12.5: Mobile Performance Optimizations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkPerformanceTargets,
  logPerformanceMetrics,
  DEFAULT_TARGETS,
  type PerformanceMetrics,
} from '@/lib/utils/performance-monitor';

describe('Performance Monitor Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  describe('checkPerformanceTargets', () => {
    it('should pass when all metrics meet targets', () => {
      const metrics: PerformanceMetrics = {
        fcp: 1200,
        tti: 3000,
        lcp: 2000,
        fid: 50,
        cls: 0.05,
        pageLoadTime: 2500,
      };

      const result = checkPerformanceTargets(metrics);

      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('should fail when FCP exceeds target', () => {
      const metrics: PerformanceMetrics = {
        fcp: 2000, // Exceeds 1500ms target
        tti: 3000,
        lcp: 2000,
        fid: 50,
        cls: 0.05,
        pageLoadTime: 2500,
      };

      const result = checkPerformanceTargets(metrics);

      expect(result.passed).toBe(false);
      expect(result.failures).toContain('FCP: 2000ms > 1500ms target');
    });

    it('should fail when TTI exceeds target', () => {
      const metrics: PerformanceMetrics = {
        fcp: 1200,
        tti: 4000, // Exceeds 3500ms target
        lcp: 2000,
        fid: 50,
        cls: 0.05,
        pageLoadTime: 2500,
      };

      const result = checkPerformanceTargets(metrics);

      expect(result.passed).toBe(false);
      expect(result.failures).toContain('TTI: 4000ms > 3500ms target');
    });

    it('should fail when multiple metrics exceed targets', () => {
      const metrics: PerformanceMetrics = {
        fcp: 2000, // Exceeds target
        tti: 4000, // Exceeds target
        lcp: 3000, // Exceeds target
        fid: 150, // Exceeds target
        cls: 0.2, // Exceeds target
        pageLoadTime: 4000, // Exceeds target
      };

      const result = checkPerformanceTargets(metrics);

      expect(result.passed).toBe(false);
      expect(result.failures.length).toBeGreaterThan(1);
    });

    it('should handle null metrics gracefully', () => {
      const metrics: PerformanceMetrics = {
        fcp: null,
        tti: null,
        lcp: null,
        fid: null,
        cls: null,
        pageLoadTime: null,
      };

      const result = checkPerformanceTargets(metrics);

      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('should use custom targets when provided', () => {
      const metrics: PerformanceMetrics = {
        fcp: 1000,
        tti: 2000,
        lcp: 1500,
        fid: 50,
        cls: 0.05,
        pageLoadTime: 2000,
      };

      const customTargets = {
        fcp: 800, // Stricter target
        tti: 1500,
        lcp: 1200,
        fid: 50,
        cls: 0.1,
        pageLoadTime: 2000,
      };

      const result = checkPerformanceTargets(metrics, customTargets);

      expect(result.passed).toBe(false);
      expect(result.failures).toContain('FCP: 1000ms > 800ms target');
    });
  });

  describe('logPerformanceMetrics', () => {
    it('should log metrics in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const metrics: PerformanceMetrics = {
        fcp: 1200,
        tti: 3000,
        lcp: 2000,
        fid: 50,
        cls: 0.05,
        pageLoadTime: 2500,
      };

      logPerformanceMetrics(metrics, '/dashboard');

      expect(console.group).toHaveBeenCalledWith('📊 Performance Metrics - /dashboard');
      expect(console.log).toHaveBeenCalled();
      expect(console.groupEnd).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should log JSON in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const metrics: PerformanceMetrics = {
        fcp: 1200,
        tti: 3000,
        lcp: 2000,
        fid: 50,
        cls: 0.05,
        pageLoadTime: 2500,
      };

      logPerformanceMetrics(metrics, '/dashboard');

      expect(console.log).toHaveBeenCalledWith(
        '[PERF]',
        expect.stringContaining('"page":"/dashboard"')
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should warn when targets are not met', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const metrics: PerformanceMetrics = {
        fcp: 2000, // Exceeds target
        tti: 3000,
        lcp: 2000,
        fid: 50,
        cls: 0.05,
        pageLoadTime: 2500,
      };

      logPerformanceMetrics(metrics, '/dashboard');

      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Performance targets not met:',
        expect.arrayContaining([expect.stringContaining('FCP')])
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('DEFAULT_TARGETS', () => {
    it('should have correct target values for Story 12.5 AC1', () => {
      expect(DEFAULT_TARGETS.fcp).toBe(1500); // 1.5s
      expect(DEFAULT_TARGETS.tti).toBe(3500); // 3.5s
      expect(DEFAULT_TARGETS.pageLoadTime).toBe(3000); // 3s
    });
  });
});

