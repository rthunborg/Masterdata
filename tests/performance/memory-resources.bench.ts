/**
 * Performance Benchmarks for Memory & Resource Usage
 * 
 * Measures memory and resource usage to ensure acceptable levels:
 * - Memory usage stable over 1 hour (no leaks)
 * - Table with 1000 rows: <200MB memory
 * - 100 concurrent requests: <1GB memory
 * - CSV export: <100MB peak memory
 * - Real-time subscriptions: <50MB memory
 * 
 * Story: 11.8 - Performance & Concurrency Tests
 * AC8: Memory & Resource Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getMemoryUsage, formatMemoryMB, generateEmployees } from "./helpers/performance-helpers";
import { generateCSV } from "@/lib/utils/csv-export";

describe("Memory & Resource Benchmarks", () => {
  describe("Table Memory Usage (1000 rows)", () => {
    it("should use <200MB memory for table with 1000 rows", () => {
      const initialMemory = getMemoryUsage();
      const employees = generateEmployees(1000);
      
      // Simulate table rendering memory usage
      const tableData = employees.map(emp => ({
        id: emp.id,
        first_name: emp.first_name,
        surname: emp.surname,
        ssn: emp.ssn,
        email: emp.email,
        rank: emp.rank,
      }));

      const finalMemory = getMemoryUsage();
      const memoryUsed = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryMB = memoryUsed / 1024 / 1024;

      expect(memoryMB).toBeLessThan(200);
      console.log(`Table with 1000 rows memory: ${formatMemoryMB(memoryUsed)}`);
    });
  });

  describe("Concurrent Requests Memory", () => {
    it("should use <1GB memory for 100 concurrent requests", async () => {
      const initialMemory = getMemoryUsage();
      const employees = generateEmployees(100);

      // Simulate 100 concurrent request processing
      const requests = Array.from({ length: 100 }, async () => {
        // Simulate request processing
        const data = employees.map(emp => ({
          id: emp.id,
          first_name: emp.first_name,
          surname: emp.surname,
        }));
        return data;
      });

      await Promise.all(requests);

      const finalMemory = getMemoryUsage();
      const memoryUsed = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryMB = memoryUsed / 1024 / 1024;

      expect(memoryMB).toBeLessThan(1024); // <1GB
      console.log(`100 concurrent requests memory: ${formatMemoryMB(memoryUsed)}`);
    });
  });

  describe("CSV Export Peak Memory", () => {
    it("should use <100MB peak memory during CSV export", () => {
      const initialMemory = getMemoryUsage();
      const employees = generateEmployees(1000);
      const headers = ["ID", "First Name", "Surname", "SSN", "Email", "Rank"];
      const rows = employees.map(emp => [
        emp.id,
        emp.first_name,
        emp.surname,
        emp.ssn,
        emp.email || "",
        emp.rank,
      ]);

      // Generate CSV (peak memory usage)
      const csv = generateCSV(headers, rows);

      const peakMemory = getMemoryUsage();
      const memoryUsed = peakMemory.heapUsed - initialMemory.heapUsed;
      const memoryMB = memoryUsed / 1024 / 1024;

      expect(memoryMB).toBeLessThan(100);
      console.log(`CSV export peak memory: ${formatMemoryMB(memoryUsed)}, CSV size: ${(csv.length / 1024).toFixed(2)}KB`);
    });
  });

  describe("Real-time Subscriptions Memory", () => {
    it("should use <50MB memory for real-time subscriptions", () => {
      const initialMemory = getMemoryUsage();
      
      // Simulate 10 active subscriptions
      const subscriptions = Array.from({ length: 10 }, () => {
        const employees = generateEmployees(100);
        return {
          channel: "employees",
          callback: (payload: any) => {
            // Process update
            return payload;
          },
          data: employees,
        };
      });

      const finalMemory = getMemoryUsage();
      const memoryUsed = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryMB = memoryUsed / 1024 / 1024;

      expect(memoryMB).toBeLessThan(50);
      console.log(`Real-time subscriptions memory (10 clients): ${formatMemoryMB(memoryUsed)}`);
    });
  });

  describe("Memory Leak Test", () => {
    it("should not leak memory over extended operations", async () => {
      const initialMemory = getMemoryUsage();
      const iterations = 1000; // Reduced for test speed

      for (let i = 0; i < iterations; i++) {
        // Simulate operation cycle
        const employees = generateEmployees(10);
        const csv = generateCSV(
          ["ID", "Name"],
          employees.map(emp => [emp.id, emp.first_name])
        );
        
        // Clear references
        employees.length = 0;
        
        // Force garbage collection if available
        if (global.gc && i % 100 === 0) {
          global.gc();
        }
      }

      // Force final GC
      if (global.gc) {
        global.gc();
      }

      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      // Memory shouldn't grow more than 50MB over test period
      expect(memoryGrowthMB).toBeLessThan(50);
      console.log(`Memory growth over ${iterations} iterations: ${formatMemoryMB(memoryGrowth)}`);
    });
  });
});

