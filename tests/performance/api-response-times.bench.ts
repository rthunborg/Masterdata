/**
 * Performance Benchmarks for API Response Times
 * 
 * Measures API response times to ensure they meet SLA requirements:
 * - GET /api/employees: <50ms (p95)
 * - POST /api/employees: <100ms (p95)
 * - PATCH /api/employees/[id]: <100ms (p95)
 * - DELETE /api/employees/[id]: <100ms (p95)
 * - POST /api/employees/[id]/terminate: <200ms (p95)
 * - GET /api/important-dates: <50ms (p95)
 * 
 * Story: 11.8 - Performance & Concurrency Tests
 * AC2: API Response Time Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/employees/route";
import { PATCH, DELETE } from "@/app/api/employees/[id]/route";
import { POST as TERMINATE } from "@/app/api/employees/[id]/terminate/route";
import { GET as GET_DATES } from "@/app/api/important-dates/route";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { importantDateRepository } from "@/lib/server/repositories/important-date-repository";
import { runBenchmark, calculatePercentile } from "./helpers/performance-helpers";
import { UserRole } from "@/lib/types/user";
import type { Employee } from "@/lib/types/employee";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");
vi.mock("@/lib/server/repositories/important-date-repository");
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

const mockEmployee: Employee = {
  id: "emp-123",
  first_name: "Test",
  surname: "Employee",
  ssn: "19900101-1234",
  email: "test@example.com",
  mobile: "+46701234567",
  rank: "SEV",
  gender: "Man",
  town_district: "Göteborg",
  hire_date: "2025-01-01",
  stena_date: null,
  omc_date: null,
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
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

describe("API Response Time Benchmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
  });

  describe("GET /api/employees", () => {
    it("should respond in <50ms (p95)", async () => {
      vi.mocked(employeeRepository.findAll).mockResolvedValue({
        data: [mockEmployee],
        total: 1,
      });

      const results = await runBenchmark(async () => {
        const request = new NextRequest("http://localhost:3000/api/employees");
        await GET(request);
      }, 100);

      expect(results.p95).toBeLessThan(50);
      console.log(`GET /api/employees - p95: ${results.p95.toFixed(2)}ms, avg: ${results.avg.toFixed(2)}ms`);
    });
  });

  describe("POST /api/employees", () => {
    it("should respond in <100ms (p95)", async () => {
      vi.mocked(employeeRepository.create).mockResolvedValue(mockEmployee);

      const employeeData = {
        first_name: "New",
        surname: "Employee",
        ssn: "19900101-5678",
        email: "new@example.com",
        hire_date: "2025-01-01",
      };

      const results = await runBenchmark(async () => {
        const request = new NextRequest("http://localhost:3000/api/employees", {
          method: "POST",
          body: JSON.stringify(employeeData),
        });
        await POST(request);
      }, 100);

      expect(results.p95).toBeLessThan(100);
      console.log(`POST /api/employees - p95: ${results.p95.toFixed(2)}ms, avg: ${results.avg.toFixed(2)}ms`);
    });
  });

  describe("PATCH /api/employees/[id]", () => {
    it("should respond in <100ms (p95)", async () => {
      vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
      vi.mocked(employeeRepository.update).mockResolvedValue({
        ...mockEmployee,
        email: "updated@example.com",
      });

      const results = await runBenchmark(async () => {
        const request = new NextRequest("http://localhost:3000/api/employees/emp-123", {
          method: "PATCH",
          body: JSON.stringify({ email: "updated@example.com" }),
        });
        await PATCH(request, { params: Promise.resolve({ id: "emp-123" }) });
      }, 100);

      expect(results.p95).toBeLessThan(100);
      console.log(`PATCH /api/employees/[id] - p95: ${results.p95.toFixed(2)}ms, avg: ${results.avg.toFixed(2)}ms`);
    });
  });

  describe("DELETE /api/employees/[id]", () => {
    it("should respond in <100ms (p95)", async () => {
      vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
      vi.mocked(employeeRepository.delete).mockResolvedValue();

      const results = await runBenchmark(async () => {
        const request = new NextRequest("http://localhost:3000/api/employees/emp-123", {
          method: "DELETE",
        });
        await DELETE(request, { params: Promise.resolve({ id: "emp-123" }) });
      }, 100);

      expect(results.p95).toBeLessThan(100);
      console.log(`DELETE /api/employees/[id] - p95: ${results.p95.toFixed(2)}ms, avg: ${results.avg.toFixed(2)}ms`);
    });
  });

  describe("POST /api/employees/[id]/terminate", () => {
    it("should respond in <200ms (p95)", async () => {
      vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
      vi.mocked(employeeRepository.update).mockResolvedValue({
        ...mockEmployee,
        is_terminated: true,
        termination_date: "2025-01-27",
      });

      const results = await runBenchmark(async () => {
        const request = new NextRequest("http://localhost:3000/api/employees/emp-123/terminate", {
          method: "POST",
          body: JSON.stringify({ termination_date: "2025-01-27", termination_reason: "Test" }),
        });
        await TERMINATE(request, { params: Promise.resolve({ id: "emp-123" }) });
      }, 100);

      expect(results.p95).toBeLessThan(200);
      console.log(`POST /api/employees/[id]/terminate - p95: ${results.p95.toFixed(2)}ms, avg: ${results.avg.toFixed(2)}ms`);
    });
  });

  describe("GET /api/important-dates", () => {
    it("should respond in <50ms (p95)", async () => {
      vi.mocked(importantDateRepository.findAll).mockResolvedValue({
        data: [],
        total: 0,
      });

      const results = await runBenchmark(async () => {
        const request = new NextRequest("http://localhost:3000/api/important-dates");
        await GET_DATES(request);
      }, 100);

      expect(results.p95).toBeLessThan(50);
      console.log(`GET /api/important-dates - p95: ${results.p95.toFixed(2)}ms, avg: ${results.avg.toFixed(2)}ms`);
    });
  });
});

