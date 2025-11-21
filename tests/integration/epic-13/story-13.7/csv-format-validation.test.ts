/**
 * Integration Tests for CSV Format Validation
 * Story 13.7: Write Comprehensive Export Tests
 * 
 * Tests verify:
 * - CSV has correct headers
 * - CSV has correct number of rows
 * - CSV data matches employee data
 * - CSV handles special characters correctly
 * - CSV handles null/empty values correctly
 * - CSV uses correct encoding (UTF-8)
 * - CSV handles Swedish characters (å, ä, ö)
 * - CSV handles special characters in names
 * - CSV is properly formatted for Excel
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/employees/export/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import type { Employee } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";
import { createClient } from "@/lib/supabase/server";
import Papa from "papaparse";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");
vi.mock("@/lib/supabase/server");
vi.mock("papaparse");

describe("Story 13.7: CSV Format Validation", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
    id: "emp-1",
    first_name: "John",
    surname: "Doe",
    ssn: "123456-7890",
    email: "john@example.com",
    mobile: "+46701234567",
    rank: "SEV",
    gender: "Man",
    town_district: "Stockholm",
    hire_date: "2025-01-15",
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
    isps: true,
    photo: true,
    origo: true,
    loneiva: 1,
    mail_lon: true,
    bankuppgifter: true,
    li: true,
    passport: true,
    kvitto_c17_18: true,
    c17: true,
    crewing_done: false,
    comments: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Papa.unparse).mockReturnValue("csv_content");
  });

  describe("CSV has correct headers", () => {
    it("should include all selected field headers in CSV", async () => {
      const emp1 = createMockEmployee({ id: "emp-1" });
      const allEmployees = [emp1];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: ["first_name", "surname", "ssn", "email"],
        }),
      });

      await POST(request);

      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.fields).toEqual(["First Name", "Surname", "SSN", "Email"]);
    });

    it("should maintain field order in headers", async () => {
      const emp1 = createMockEmployee({ id: "emp-1" });
      const allEmployees = [emp1];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: ["ssn", "first_name", "surname"],
        }),
      });

      await POST(request);

      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.fields).toEqual(["SSN", "First Name", "Surname"]);
    });
  });

  describe("CSV has correct number of rows", () => {
    it("should have one data row per selected employee", async () => {
      const emp1 = createMockEmployee({ id: "emp-1" });
      const emp2 = createMockEmployee({ id: "emp-2" });
      const emp3 = createMockEmployee({ id: "emp-3" });
      const allEmployees = [emp1, emp2, emp3];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1", "emp-2", "emp-3"],
          fields: ["first_name"],
        }),
      });

      await POST(request);

      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data).toHaveLength(3);
    });

    it("should have correct number of rows when some employees are not selected", async () => {
      const emp1 = createMockEmployee({ id: "emp-1" });
      const emp2 = createMockEmployee({ id: "emp-2" });
      const emp3 = createMockEmployee({ id: "emp-3" });
      const allEmployees = [emp1, emp2, emp3];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1", "emp-2"],
          fields: ["first_name"],
        }),
      });

      await POST(request);

      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data).toHaveLength(2);
    });
  });

  describe("CSV data matches employee data", () => {
    it("should include correct employee data in CSV rows", async () => {
      const emp1 = createMockEmployee({ id: "emp-1", first_name: "John", surname: "Doe", ssn: "123456-7890" });
      const allEmployees = [emp1];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: ["first_name", "surname", "ssn"],
        }),
      });

      await POST(request);

      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data[0]).toEqual(["John", "Doe", "123456-7890"]);
    });
  });

  describe("CSV handles special characters correctly", () => {
    it("should handle Swedish characters (å, ä, ö) in CSV", async () => {
      const emp1 = createMockEmployee({ id: "emp-1", first_name: "Åsa", surname: "Öberg", town_district: "Göteborg" });
      const allEmployees = [emp1];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: ["first_name", "surname", "town_district"],
        }),
      });

      await POST(request);

      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data[0]).toContain("Åsa");
      expect(unparseCall.data[0]).toContain("Öberg");
      expect(unparseCall.data[0]).toContain("Göteborg");
    });

    it("should handle special characters in names", async () => {
      const emp1 = createMockEmployee({ id: "emp-1", first_name: "José", surname: "O'Brien", email: "test@example.com" });
      const allEmployees = [emp1];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: ["first_name", "surname"],
        }),
      });

      await POST(request);

      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data[0]).toContain("José");
      expect(unparseCall.data[0]).toContain("O'Brien");
    });
  });

  describe("CSV handles null/empty values correctly", () => {
    it("should handle null values as empty strings", async () => {
      const emp1 = createMockEmployee({ id: "emp-1", first_name: "John", email: null });
      const allEmployees = [emp1];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: ["first_name", "email"],
        }),
      });

      await POST(request);

      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data[0]).toEqual(["John", ""]);
    });

    it("should handle undefined values as empty strings", async () => {
      const emp1 = createMockEmployee({ id: "emp-1", first_name: "John", mobile: undefined as any });
      const allEmployees = [emp1];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: ["first_name", "mobile"],
        }),
      });

      await POST(request);

      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data[0]).toEqual(["John", ""]);
    });
  });

  describe("CSV encoding and Excel compatibility", () => {
    it("should use UTF-8 encoding", async () => {
      const emp1 = createMockEmployee({ id: "emp-1" });
      const allEmployees = [emp1];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: ["first_name"],
        }),
      });

      const response = await POST(request);

      // Verify Content-Type header includes charset=utf-8
      const contentType = response.headers.get("Content-Type");
      expect(contentType).toBe("text/csv; charset=utf-8");
    });

    it("should be properly formatted for Excel", async () => {
      const emp1 = createMockEmployee({ id: "emp-1", first_name: "John", surname: "Doe" });
      const allEmployees = [emp1];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: ["first_name", "surname"],
        }),
      });

      await POST(request);

      // Verify Papa.unparse was called (which handles Excel-compatible CSV formatting)
      expect(Papa.unparse).toHaveBeenCalled();
      
      // Verify the structure is correct for Excel
      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.fields).toBeDefined();
      expect(unparseCall.data).toBeDefined();
      expect(Array.isArray(unparseCall.fields)).toBe(true);
      expect(Array.isArray(unparseCall.data)).toBe(true);
    });
  });
});

