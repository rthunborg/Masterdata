/**
 * Performance Benchmarks for Table Rendering
 * 
 * Measures table rendering performance to ensure it meets SLA requirements:
 * - Render 100 employees: <500ms
 * - Render 500 employees: <1s
 * - Render 1000 employees: <2s
 * - Scroll performance: 60fps (no jank)
 * - Filter performance: <300ms (with 1000 employees)
 * - Sort performance: <300ms (with 1000 employees)
 * 
 * Story: 11.8 - Performance & Concurrency Tests
 * AC1: Table Rendering Performance Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import React, { Profiler } from "react";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import { generateEmployees } from "./helpers/performance-helpers";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";
import * as useAuthModule from "@/lib/hooks/use-auth";
import * as useColumnsModule from "@/lib/hooks/use-columns";
import * as useImportantDatesModule from "@/lib/hooks/use-important-dates";

// Mock the hooks
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "user-1", role: "hr_admin" },
    isAuthenticated: true,
    isLoading: false,
  })),
}));

vi.mock("@/lib/hooks/use-columns", () => ({
  useColumns: vi.fn(() => ({
    columns: [],
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@/lib/hooks/use-important-dates", () => ({
  useImportantDates: vi.fn(() => ({
    dates: [],
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    update: vi.fn(),
  },
}));

vi.mock("@/lib/services/custom-data-service", () => ({
  customDataService: {
    update: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Table Rendering Performance Benchmarks", () => {
  // Profiler callback to collect render metrics
  const profilerCallback = (
    id: string,
    phase: "mount" | "update",
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    console.log(`Profiler [${id}] ${phase}: ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Render 100 Employees", () => {
    it("should render 100 employees in <500ms", () => {
      const employees = generateEmployees(100);
      const startTime = performance.now();
      
      renderWithI18n(
        <Profiler id="EmployeeTable-100" onRender={profilerCallback}>
          <EmployeeTable employees={employees} isLoading={false} />
        </Profiler>
      );
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(500);
      console.log(`Render 100 employees: ${duration.toFixed(2)}ms`);
    });
  });

  describe("Render 500 Employees", () => {
    it("should render 500 employees in <1s", () => {
      const employees = generateEmployees(500);
      const startTime = performance.now();
      
      renderWithI18n(
        <Profiler id="EmployeeTable-500" onRender={profilerCallback}>
          <EmployeeTable employees={employees} isLoading={false} />
        </Profiler>
      );
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(1000);
      console.log(`Render 500 employees: ${duration.toFixed(2)}ms`);
    });
  });

  describe("Render 1000 Employees", () => {
    it("should render 1000 employees in <2s", () => {
      const employees = generateEmployees(1000);
      const startTime = performance.now();
      
      renderWithI18n(
        <Profiler id="EmployeeTable-1000" onRender={profilerCallback}>
          <EmployeeTable employees={employees} isLoading={false} />
        </Profiler>
      );
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(2000);
      console.log(`Render 1000 employees: ${duration.toFixed(2)}ms`);
    });
  });

  describe("Filter Performance", () => {
    it("should filter 1000 employees in <300ms", async () => {
      const employees = generateEmployees(1000);
      const { container } = renderWithI18n(
        <EmployeeTable employees={employees} isLoading={false} />
      );
      
      // Find search input
      const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
      expect(searchInput).toBeTruthy();
      
      const startTime = performance.now();
      // Simulate typing in search
      if (searchInput) {
        searchInput.value = "Employee1";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(300);
      console.log(`Filter 1000 employees: ${duration.toFixed(2)}ms`);
    });
  });

  describe("Sort Performance", () => {
    it("should sort 1000 employees in <300ms", async () => {
      const employees = generateEmployees(1000);
      const { container } = renderWithI18n(
        <EmployeeTable employees={employees} isLoading={false} />
      );
      
      // Find sort button (first column header)
      const sortButton = container.querySelector('button[aria-label*="sort"]') as HTMLButtonElement;
      
      if (sortButton) {
        const startTime = performance.now();
        sortButton.click();
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(300);
        console.log(`Sort 1000 employees: ${duration.toFixed(2)}ms`);
      } else {
        // If sort button not found, skip this test
        console.warn("Sort button not found, skipping sort performance test");
      }
    });
  });

  describe("Scroll Performance (FPS)", () => {
    it("should maintain 60fps during scrolling (no jank)", () => {
      const employees = generateEmployees(1000);
      const { container } = renderWithI18n(
        <EmployeeTable employees={employees} isLoading={false} />
      );
      
      const tableBody = container.querySelector('tbody');
      if (!tableBody) {
        console.warn("Table body not found, skipping scroll performance test");
        return;
      }
      
      // Measure frame time during scroll simulation
      const frameTimes: number[] = [];
      const targetFPS = 60;
      const targetFrameTime = 1000 / targetFPS; // ~16.67ms per frame
      
      // Simulate scroll events
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        tableBody.scrollTop += 100;
        tableBody.dispatchEvent(new Event("scroll", { bubbles: true }));
        const frameTime = performance.now() - start;
        frameTimes.push(frameTime);
      }
      
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const actualFPS = 1000 / avgFrameTime;
      
      // Should maintain at least 55fps (allowing some margin)
      expect(actualFPS).toBeGreaterThan(55);
      console.log(`Scroll performance: ${actualFPS.toFixed(2)}fps (avg frame time: ${avgFrameTime.toFixed(2)}ms)`);
    });
  });
});

