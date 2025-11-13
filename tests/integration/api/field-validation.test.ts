/**
 * Integration Tests for API-Level Field Validation
 * Story 11.4: Field Validation & Prerequisites Tests
 * AC5: API-Level Validation Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/employees/route";
import { PATCH } from "@/app/api/employees/[id]/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import type { Employee, EmployeeFormData } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";
import { createEmployeeWithPrerequisites, setOneDateWithTimer, createTestEmployee } from "@/../tests/helpers/validation-test-helpers";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");

describe("API Field Validation - POST /api/employees", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  const validEmployeeData: EmployeeFormData = {
    first_name: "Jane",
    surname: "Smith",
    ssn: "19900101-1234",
    email: "jane.smith@example.com",
    mobile: "+46701234567",
    rank: "CHEF",
    gender: 'Woman',
    town_district: "Gothenburg",
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
    comments: "New employee",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Enum Validation", () => {
    it("should return 400 for invalid gender enum value", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const invalidData = {
        ...validEmployeeData,
        gender: 'male' as any, // Invalid enum value
      };

      const request = new NextRequest("http://localhost:3000/api/employees", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.details.gender).toBeDefined();
    });

    it("should return 400 for invalid rank enum value", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const invalidData = {
        ...validEmployeeData,
        rank: 'sev' as any, // Invalid enum value (lowercase)
      };

      const request = new NextRequest("http://localhost:3000/api/employees", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.details.rank).toBeDefined();
    });
  });

  describe("Range Validation", () => {
    it("should return 400 for lönenivå out of range (above maximum)", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const invalidData = {
        ...validEmployeeData,
        loneiva: 8, // Above maximum (0-7)
      };

      const request = new NextRequest("http://localhost:3000/api/employees", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.details.loneiva).toBeDefined();
    });

    it("should return 400 for lönenivå out of range (below minimum)", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const invalidData = {
        ...validEmployeeData,
        loneiva: -1, // Below minimum (0-7)
      };

      const request = new NextRequest("http://localhost:3000/api/employees", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.details.loneiva).toBeDefined();
    });
  });
});

describe("API Field Validation - PATCH /api/employees/[id]", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Crewing/Done Prerequisite Validation", () => {
    it("should return 400 if prerequisites not met when updating crewing_done", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      
      // Employee with missing prerequisites
      const incompleteEmployee = createTestEmployee({
        isps: false, // Missing prerequisite
        crewing_done: false,
      });
      
      vi.mocked(employeeRepository.findById).mockResolvedValue(incompleteEmployee);

      const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
        method: "PATCH",
        body: JSON.stringify({ crewing_done: true }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("CREWING_DONE_PREREQUISITES_NOT_MET");
      expect(json.error.message).toContain("prerequisites not met");
      expect(json.error.details.incompleteFields).toBeDefined();
    });
  });

  describe("Talmundo Lock Validation", () => {
    it("should return 400 if Talmundo locked when <24h since one=true", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      
      // Employee with One=true but <24h elapsed
      const oneData = setOneDateWithTimer(12); // 12 hours ago
      const employee = createTestEmployee({
        one: true,
        one_marked_at: oneData.one_marked_at,
        talmundo: false,
      });
      
      vi.mocked(employeeRepository.findById).mockResolvedValue(employee);

      const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
        method: "PATCH",
        body: JSON.stringify({ talmundo: true }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("TALMUNDO_EDIT_NOT_ALLOWED");
      expect(json.error.message).toContain("24 hours");
    });
  });

  describe("Enum Validation on Update", () => {
    it("should return 400 for invalid gender enum on PATCH", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      const employee = createTestEmployee();
      vi.mocked(employeeRepository.findById).mockResolvedValue(employee);

      const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
        method: "PATCH",
        body: JSON.stringify({ gender: 'Other' as any }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.details.gender).toBeDefined();
    });

    it("should return 400 for invalid rank enum on PATCH", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      const employee = createTestEmployee();
      vi.mocked(employeeRepository.findById).mockResolvedValue(employee);

      const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
        method: "PATCH",
        body: JSON.stringify({ rank: 'Manager' as any }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.details.rank).toBeDefined();
    });
  });

  describe("Range Validation on Update", () => {
    it("should return 400 for lönenivå out of range on PATCH", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      const employee = createTestEmployee();
      vi.mocked(employeeRepository.findById).mockResolvedValue(employee);

      const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
        method: "PATCH",
        body: JSON.stringify({ loneiva: 8 }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.details.loneiva).toBeDefined();
    });
  });
});

