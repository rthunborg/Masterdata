/**
 * Integration Tests for Export Edge Cases
 * Story 13.7: Write Comprehensive Export Tests
 * 
 * Tests verify:
 * - Export with single employee
 * - Export with all employees
 * - Export with employees from multiple pages
 * - Export with employees that have null values
 * - Export with employees that have special characters
 * - Export with very large selection (performance)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/employees/export/route";
import { POST as POSTCrewReady } from "@/app/api/employees/export-crew-ready/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import type { Employee } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";
import { createClient } from "@/lib/supabase/server";
import Papa from "papaparse";
import { canEditCrewingDone } from "@/lib/services/crewing-validation";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");
vi.mock("@/lib/server/repositories/column-config-repository", () => ({
  columnConfigRepository: {
    findAll: vi.fn().mockResolvedValue([
      // Mock common masterdata fields with hr_admin view permission
      { id: "col-1", column_name: "First Name", db_column_name: "first_name", column_type: "text", is_masterdata: true, role_permissions: { hr_admin: { view: true, edit: true } }, category: null, category_color: null, display_order: 0, is_visible: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      { id: "col-2", column_name: "Surname", db_column_name: "surname", column_type: "text", is_masterdata: true, role_permissions: { hr_admin: { view: true, edit: true } }, category: null, category_color: null, display_order: 1, is_visible: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      { id: "col-3", column_name: "Email", db_column_name: "email", column_type: "text", is_masterdata: true, role_permissions: { hr_admin: { view: true, edit: true } }, category: null, category_color: null, display_order: 2, is_visible: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      { id: "col-4", column_name: "Mobile", db_column_name: "mobile", column_type: "text", is_masterdata: true, role_permissions: { hr_admin: { view: true, edit: true } }, category: null, category_color: null, display_order: 3, is_visible: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      { id: "col-5", column_name: "Town District", db_column_name: "town_district", column_type: "text", is_masterdata: true, role_permissions: { hr_admin: { view: true, edit: true } }, category: null, category_color: null, display_order: 4, is_visible: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      { id: "col-6", column_name: "Comments", db_column_name: "comments", column_type: "text", is_masterdata: true, role_permissions: { hr_admin: { view: true, edit: true } }, category: null, category_color: null, display_order: 5, is_visible: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      { id: "col-7", column_name: "Hire Date", db_column_name: "hire_date", column_type: "date", is_masterdata: true, role_permissions: { hr_admin: { view: true, edit: true } }, category: null, category_color: null, display_order: 6, is_visible: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
    ]),
  },
}));
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/services/crewing-validation");
vi.mock("papaparse");

describe("Story 13.7: Export Edge Cases", () => {
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
    town_district: "Göteborg",
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

  describe("Export with single employee", () => {
    it("should export single employee successfully", async () => {
      const emp1 = createMockEmployee({ id: "emp-1" });
      const allEmployees = [emp1];

      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
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

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Employees-Exported")).toBe("1");
      
      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data).toHaveLength(1);
    });
  });

  describe("Export with all employees", () => {
    it("should export all employees when all are selected", async () => {
      const employees = Array.from({ length: 10 }, (_, i) => 
        createMockEmployee({ id: `emp-${i + 1}` })
      );

      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(employees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const allEmployeeIds = employees.map(emp => emp.id);
      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: allEmployeeIds,
          fields: ["first_name", "surname"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Employees-Exported")).toBe("10");
      
      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data).toHaveLength(10);
    });
  });

  describe("Export with employees from multiple pages", () => {
    /**
     * Test scenario: User selects employees from different table pages
     * This verifies that the export API correctly handles employee IDs that
     * may not be visible on the current page, ensuring pagination doesn't
     * affect export functionality.
     */
    it("should export employees selected from different pages", async () => {
      // Simulate employees that would be on different pages
      const page1Employees = Array.from({ length: 5 }, (_, i) => 
        createMockEmployee({ id: `emp-page1-${i + 1}` })
      );
      const page2Employees = Array.from({ length: 5 }, (_, i) => 
        createMockEmployee({ id: `emp-page2-${i + 1}` })
      );
      const allEmployees = [...page1Employees, ...page2Employees];

      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
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

      // Select some from page 1 and some from page 2
      const selectedIds = [
        page1Employees[0].id,
        page1Employees[2].id,
        page2Employees[1].id,
        page2Employees[3].id,
      ];

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: selectedIds,
          fields: ["first_name", "surname"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Employees-Exported")).toBe("4");
      
      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data).toHaveLength(4);
    });
  });

  describe("Export with employees that have null values", () => {
    it("should handle employees with multiple null values", async () => {
      const emp1 = createMockEmployee({
        id: "emp-1",
        email: null,
        mobile: null,
        comments: null,
        termination_date: null,
      });
      const allEmployees = [emp1];

      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
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
          fields: ["first_name", "email", "mobile", "comments"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      
      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data[0]).toEqual(["John", "", "", ""]);
    });
  });

  describe("Export with employees that have special characters", () => {
    it("should handle employees with special characters in names", async () => {
      const emp1 = createMockEmployee({
        id: "emp-1",
        first_name: "José",
        surname: "O'Brien",
        email: "jose.o'brien@example.com",
      });
      const allEmployees = [emp1];

      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
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
          fields: ["first_name", "surname", "email"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      
      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data[0]).toContain("José");
      expect(unparseCall.data[0]).toContain("O'Brien");
      expect(unparseCall.data[0]).toContain("jose.o'brien@example.com");
    });

    it("should handle employees with Swedish characters", async () => {
      const emp1 = createMockEmployee({
        id: "emp-1",
        first_name: "Åsa",
        surname: "Öberg",
        town_district: "Göteborg",
      });
      const allEmployees = [emp1];

      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
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

      const response = await POST(request);

      expect(response.status).toBe(200);
      
      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data[0]).toContain("Åsa");
      expect(unparseCall.data[0]).toContain("Öberg");
      expect(unparseCall.data[0]).toContain("Göteborg");
    });
  });

  describe("Export with very large selection (performance)", () => {
    /**
     * Performance test: Export with large selection
     * This test verifies that the export API can handle bulk exports
     * without performance degradation. The test uses 100 employees as
     * a reasonable upper bound for typical use cases.
     * 
     * Note: In production, consider implementing pagination or streaming
     * for very large exports (>1000 employees) to avoid memory issues.
     */
    it("should handle large selection efficiently", async () => {
      // Create a large number of employees (simulating performance test)
      const employees = Array.from({ length: 100 }, (_, i) => 
        createMockEmployee({ id: `emp-${i + 1}` })
      );

      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(employees);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const allEmployeeIds = employees.map(emp => emp.id);
      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: allEmployeeIds,
          fields: ["first_name", "surname"],
        }),
      });

      const startTime = Date.now();
      const response = await POST(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Employees-Exported")).toBe("100");
      
      // Performance check: should complete in reasonable time (e.g., less than 5 seconds)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000);
      
      const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[]; data: string[][] };
      expect(unparseCall.data).toHaveLength(100);
    });

    it("should handle export-crew-ready with large selection", async () => {
      const employees = Array.from({ length: 50 }, (_, i) => 
        createMockEmployee({ id: `emp-${i + 1}`, crewing_done: false })
      );

      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(employees);
      vi.mocked(canEditCrewingDone).mockReturnValue(true);
      vi.mocked(employeeRepository.update).mockResolvedValue(employees[0]);

      const allEmployeeIds = employees.map(emp => emp.id);
      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: allEmployeeIds }),
      });

      const startTime = Date.now();
      const response = await POSTCrewReady(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Employees-Exported")).toBe("50");
      
      // Performance check
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });
});

