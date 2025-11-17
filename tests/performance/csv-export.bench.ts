/**
 * Performance Benchmarks for CSV Export
 * 
 * Measures CSV export performance to ensure it meets targets:
 * - Export 100 employees: <2s
 * - Export 500 employees: <5s
 * - Export 1000 employees: <10s
 * - Export with field selection: <10% overhead
 * - Export with filtering: <10% overhead
 * - Memory usage: <100MB for 1000 employees
 * 
 * Story: 11.8 - Performance & Concurrency Tests
 * AC3: CSV Export Performance Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { generateCSV } from "@/lib/utils/csv-export";
import { generateEmployees, getMemoryUsage, formatMemoryMB } from "./helpers/performance-helpers";
import type { Employee } from "@/lib/types/employee";

describe("CSV Export Performance Benchmarks", () => {
  describe("Export 100 Employees", () => {
    it("should export 100 employees in <2s", () => {
      const employees = generateEmployees(100);
      const headers = ["ID", "First Name", "Surname", "SSN", "Email", "Rank"];
      const rows = employees.map(emp => [
        emp.id,
        emp.first_name,
        emp.surname,
        emp.ssn,
        emp.email || "",
        emp.rank,
      ]);

      const startTime = performance.now();
      const csv = generateCSV(headers, rows);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(2000);
      expect(csv.length).toBeGreaterThan(0);
      console.log(`Export 100 employees: ${duration.toFixed(2)}ms, CSV size: ${(csv.length / 1024).toFixed(2)}KB`);
    });
  });

  describe("Export 500 Employees", () => {
    it("should export 500 employees in <5s", () => {
      const employees = generateEmployees(500);
      const headers = ["ID", "First Name", "Surname", "SSN", "Email", "Rank"];
      const rows = employees.map(emp => [
        emp.id,
        emp.first_name,
        emp.surname,
        emp.ssn,
        emp.email || "",
        emp.rank,
      ]);

      const startTime = performance.now();
      const csv = generateCSV(headers, rows);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(csv.length).toBeGreaterThan(0);
      console.log(`Export 500 employees: ${duration.toFixed(2)}ms, CSV size: ${(csv.length / 1024).toFixed(2)}KB`);
    });
  });

  describe("Export 1000 Employees", () => {
    it("should export 1000 employees in <10s", () => {
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

      const startTime = performance.now();
      const csv = generateCSV(headers, rows);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(10000);
      expect(csv.length).toBeGreaterThan(0);
      console.log(`Export 1000 employees: ${duration.toFixed(2)}ms, CSV size: ${(csv.length / 1024).toFixed(2)}KB`);
    });
  });

  describe("Export with Field Selection", () => {
    it("should have <10% overhead with field selection", () => {
      const employees = generateEmployees(1000);
      
      // Full export
      const fullHeaders = ["ID", "First Name", "Surname", "SSN", "Email", "Rank", "Gender", "Town", "Hire Date"];
      const fullRows = employees.map(emp => [
        emp.id, emp.first_name, emp.surname, emp.ssn, emp.email || "", emp.rank,
        emp.gender || "", emp.town_district || "", emp.hire_date,
      ]);
      const fullStart = performance.now();
      generateCSV(fullHeaders, fullRows);
      const fullDuration = performance.now() - fullStart;

      // Selected fields only
      const selectedHeaders = ["ID", "First Name", "Surname"];
      const selectedRows = employees.map(emp => [emp.id, emp.first_name, emp.surname]);
      const selectedStart = performance.now();
      generateCSV(selectedHeaders, selectedRows);
      const selectedDuration = performance.now() - selectedStart;

      const overhead = ((selectedDuration - fullDuration) / fullDuration) * 100;
      expect(Math.abs(overhead)).toBeLessThan(10);
      console.log(`Field selection overhead: ${overhead.toFixed(2)}%`);
    });
  });

  describe("Export with Filtering", () => {
    it("should have <10% overhead with filtering", () => {
      const employees = generateEmployees(1000);
      const headers = ["ID", "First Name", "Surname", "SSN", "Email", "Rank"];
      
      // Unfiltered export
      const allRows = employees.map(emp => [
        emp.id, emp.first_name, emp.surname, emp.ssn, emp.email || "", emp.rank,
      ]);
      const allStart = performance.now();
      generateCSV(headers, allRows);
      const allDuration = performance.now() - allStart;

      // Filtered export (only SEV rank)
      const filteredRows = employees
        .filter(emp => emp.rank === "SEV")
        .map(emp => [emp.id, emp.first_name, emp.surname, emp.ssn, emp.email || "", emp.rank]);
      const filteredStart = performance.now();
      generateCSV(headers, filteredRows);
      const filteredDuration = performance.now() - filteredStart;

      const overhead = ((filteredDuration - allDuration) / allDuration) * 100;
      expect(Math.abs(overhead)).toBeLessThan(10);
      console.log(`Filtering overhead: ${overhead.toFixed(2)}%`);
    });
  });

  describe("Memory Usage", () => {
    it("should use <100MB memory for 1000 employees", () => {
      const initialMemory = getMemoryUsage();
      const employees = generateEmployees(1000);
      const headers = ["ID", "First Name", "Surname", "SSN", "Email", "Rank"];
      const rows = employees.map(emp => [
        emp.id, emp.first_name, emp.surname, emp.ssn, emp.email || "", emp.rank,
      ]);

      generateCSV(headers, rows);
      
      const finalMemory = getMemoryUsage();
      const memoryUsed = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryMB = memoryUsed / 1024 / 1024;

      expect(memoryMB).toBeLessThan(100);
      console.log(`Memory usage for 1000 employees: ${formatMemoryMB(memoryUsed)}`);
    });
  });
});

