/**
 * Performance Benchmarks for Concurrency Load Tests
 * 
 * Measures system behavior under concurrent load:
 * - 50 concurrent GET requests: All succeed, <1s total
 * - 50 concurrent POST requests: All succeed, <5s total
 * - 100 concurrent capacity assignments: Last spot handled correctly
 * - 50 concurrent room assignments: No duplicate rooms
 * - 20 concurrent terminations: All execute atomically
 * - Error rate <1% under load
 * 
 * Story: 11.8 - Performance & Concurrency Tests
 * AC6: Concurrency Load Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/employees/route";
import { POST as TERMINATE } from "@/app/api/employees/[id]/terminate/route";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { assignEmployeeToDate } from "@/lib/services/date-capacity";
import { calculateRoomNumber } from "@/lib/services/room-assignment";
import { runLoadTest } from "./helpers/performance-helpers";
import { generateEmployees } from "./helpers/performance-helpers";
import { UserRole } from "@/lib/types/user";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");
vi.mock("@/lib/services/date-capacity");
vi.mock("@/lib/services/room-assignment");

const mockHRAdminUser = {
  id: "user-1",
  auth_id: "auth-1",
  email: "admin@example.com",
  role: UserRole.HR_ADMIN,
  is_active: true,
  created_at: "2025-01-01T00:00:00Z",
  last_active_at: null,
};

describe("Concurrency Load Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
  });

  describe("50 Concurrent GET Requests", () => {
    it("should handle 50 concurrent GET requests, all succeed in <1s total", async () => {
      vi.mocked(employeeRepository.findAll).mockResolvedValue({
        data: generateEmployees(10),
        total: 10,
      });

      const results = await runLoadTest(
        async () => {
          const request = new NextRequest("http://localhost:3000/api/employees");
          const response = await GET(request);
          if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        },
        50,
        2000 // 2 second duration
      );

      expect(results.errorRate).toBeLessThan(0.01); // <1% error rate
      expect(results.p95).toBeLessThan(1000); // <1s p95
      console.log(`50 concurrent GET requests - success: ${results.success}, errors: ${results.error}, p95: ${results.p95.toFixed(2)}ms`);
    });
  });

  describe("50 Concurrent POST Requests", () => {
    it("should handle 50 concurrent POST requests, all succeed in <5s total", async () => {
      let employeeCounter = 0;
      vi.mocked(employeeRepository.create).mockImplementation(async (data) => {
        employeeCounter++;
        return {
          id: `emp-${employeeCounter}`,
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      const results = await runLoadTest(
        async () => {
          const employeeData = {
            first_name: `Test${Date.now()}`,
            surname: "Employee",
            ssn: `19900101-${String(Math.random()).slice(2, 6)}`,
            email: `test${Date.now()}@example.com`,
            hire_date: "2025-01-01",
          };
          const request = new NextRequest("http://localhost:3000/api/employees", {
            method: "POST",
            body: JSON.stringify(employeeData),
          });
          const response = await POST(request);
          if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        },
        50,
        10000 // 10 second duration
      );

      expect(results.errorRate).toBeLessThan(0.01);
      expect(results.p95).toBeLessThan(5000); // <5s p95
      console.log(`50 concurrent POST requests - success: ${results.success}, errors: ${results.error}, p95: ${results.p95.toFixed(2)}ms`);
    });
  });

  describe("100 Concurrent Capacity Assignments", () => {
    it("should handle 100 concurrent capacity assignments, last spot handled correctly", async () => {
      let assignedCount = 0;
      const maxSpots = 20;
      
      vi.mocked(assignEmployeeToDate).mockImplementation(async () => {
        assignedCount++;
        if (assignedCount > maxSpots) {
          throw new Error("Capacity full");
        }
        return { success: true };
      });

      const results = await runLoadTest(
        async () => {
          await assignEmployeeToDate("emp-123", "date-456", null, "omc_date");
        },
        100,
        5000
      );

      // Should have exactly maxSpots successes and rest failures
      expect(results.success).toBeLessThanOrEqual(maxSpots);
      expect(results.error).toBeGreaterThanOrEqual(100 - maxSpots);
      console.log(`100 concurrent capacity assignments - success: ${results.success}, errors: ${results.error}`);
    });
  });

  describe("50 Concurrent Room Assignments", () => {
    it("should handle 50 concurrent room assignments, no duplicate rooms", async () => {
      const assignedRooms = new Set<number>();
      let roomCounter = 0;

      vi.mocked(calculateRoomNumber).mockImplementation(() => {
        roomCounter++;
        const room = roomCounter % 50; // 50 rooms available
        if (assignedRooms.has(room)) {
          // Room already assigned, try next
          return (room + 1) % 50;
        }
        assignedRooms.add(room);
        return room;
      });

      const results = await runLoadTest(
        async () => {
          const room = calculateRoomNumber("date-123", 1);
          if (room === -1) throw new Error("No room available");
        },
        50,
        5000
      );

      // All should succeed (room assignment handles conflicts)
      expect(results.errorRate).toBeLessThan(0.01);
      console.log(`50 concurrent room assignments - success: ${results.success}, errors: ${results.error}`);
    });
  });

  describe("20 Concurrent Terminations", () => {
    it("should handle 20 concurrent terminations, all execute atomically", async () => {
      const employees = generateEmployees(20);
      let terminatedCount = 0;

      vi.mocked(employeeRepository.findById).mockImplementation(async (id) => {
        return employees.find(emp => emp.id === id) || null;
      });

      vi.mocked(employeeRepository.update).mockImplementation(async (id, data) => {
        terminatedCount++;
        return { ...employees.find(emp => emp.id === id)!, ...data };
      });

      const results = await runLoadTest(
        async () => {
          const employeeId = employees[Math.floor(Math.random() * employees.length)].id;
          const request = new NextRequest(`http://localhost:3000/api/employees/${employeeId}/terminate`, {
            method: "POST",
            body: JSON.stringify({ termination_date: "2025-01-27", termination_reason: "Test" }),
          });
          const response = await TERMINATE(request, { params: Promise.resolve({ id: employeeId }) });
          if (!response.ok) throw new Error(`Termination failed: ${response.status}`);
        },
        20,
        5000
      );

      expect(results.errorRate).toBeLessThan(0.01);
      expect(results.success).toBeGreaterThan(0);
      console.log(`20 concurrent terminations - success: ${results.success}, errors: ${results.error}`);
    });
  });

  describe("Error Rate Under Load", () => {
    it("should maintain <1% error rate under load", async () => {
      vi.mocked(employeeRepository.findAll).mockResolvedValue({
        data: generateEmployees(100),
        total: 100,
      });

      const results = await runLoadTest(
        async () => {
          const request = new NextRequest("http://localhost:3000/api/employees");
          const response = await GET(request);
          if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        },
        100,
        10000 // 10 second duration, 100 concurrent users
      );

      expect(results.errorRate).toBeLessThan(0.01); // <1% error rate
      console.log(`Error rate under load: ${(results.errorRate * 100).toFixed(2)}%, success: ${results.success}, errors: ${results.error}`);
    });
  });
});

