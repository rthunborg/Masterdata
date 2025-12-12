/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Performance Testing Helpers
 * 
 * Utilities for performance benchmarks and load testing
 * Story: 11.8 - Performance & Concurrency Tests
 */

import type { Employee } from "@/lib/types/employee";

/**
 * Generate a large array of test employees
 */
export function generateEmployees(count: number): Employee[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `emp-${i + 1}`,
    first_name: `Employee${i + 1}`,
    surname: 'Test',
    ssn: `19900101${String(i).padStart(4, '0')}`,
    email: `employee${i + 1}@example.com`,
    mobile: `+4670123456${String(i).padStart(2, '0')}`,
    rank: i % 2 === 0 ? 'SEV' : 'CHEF',
    gender: i % 2 === 0 ? 'Man' : 'Woman',
    town_district: 'Stockholm',
    hire_date: '2025-01-01',
    stena_date: null,
    omc_date: i < 20 ? '2025-03-08' : null,
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    one: null,
    one_marked_at: null,
    talmundo: null,
    isps: null,
    photo: null,
    origo: null,
    loneiva: null,
    mail_lon: null,
    bankuppgifter: null,
    li: null,
    passport: null,
    kvitto_c17_18: null,
    c17: null,
    crewing_done: null,
    comments: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

/**
 * Measure render time for a React component
 * Note: Actual rendering happens in test, this is just a helper signature
 */
export function measureRenderTime(): number {
  const start = performance.now();
  // Note: Actual rendering would happen in test, this is just a helper
  // The test will call render() and measure time
  return performance.now() - start;
}

/**
 * Measure API latency
 */
export async function measureAPILatency(
  method: string,
  endpoint: string,
  body?: any
): Promise<number> {
  const start = performance.now();
  await fetch(endpoint, { 
    method, 
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  });
  return performance.now() - start;
}

/**
 * Calculate percentile from an array of values
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Run a load test with concurrent users
 */
export async function runLoadTest(
  operation: () => Promise<void>,
  concurrentUsers: number,
  duration: number
): Promise<{
  success: number;
  error: number;
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
}> {
  const startTime = Date.now();
  const results = { success: 0, error: 0, latencies: [] as number[] };
  
  const users = Array.from({ length: concurrentUsers }, async () => {
    while (Date.now() - startTime < duration) {
      try {
        const start = performance.now();
        await operation();
        results.latencies.push(performance.now() - start);
        results.success++;
      } catch (err) {
        results.error++;
      }
    }
  });
  
  await Promise.all(users);
  
  return {
    ...results,
    p50: calculatePercentile(results.latencies, 50),
    p95: calculatePercentile(results.latencies, 95),
    p99: calculatePercentile(results.latencies, 99),
    errorRate: results.error / (results.success + results.error) || 0,
  };
}

/**
 * Measure memory usage (Node.js only)
 */
export function getMemoryUsage(): {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
} {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    };
  }
  return { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 };
}

/**
 * Format memory size in MB
 */
export function formatMemoryMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

/**
 * Run performance benchmark with multiple iterations
 */
export async function runBenchmark(
  operation: () => Promise<void> | void,
  iterations: number = 100
): Promise<{
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  latencies: number[];
}> {
  const latencies: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await operation();
    latencies.push(performance.now() - start);
  }
  
  latencies.sort((a, b) => a - b);
  
  return {
    min: latencies[0],
    max: latencies[latencies.length - 1],
    avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50: calculatePercentile(latencies, 50),
    p95: calculatePercentile(latencies, 95),
    p99: calculatePercentile(latencies, 99),
    latencies,
  };
}

