/**
 * Integration Tests for Export Crew Ready API
 * Story 13.7: Write Comprehensive Export Tests
 * 
 * Tests verify:
 * - POST /api/employees/export-crew-ready with selected IDs
 * - Only selected employees are exported
 * - Only selected employees are marked as done
 * - Empty selection returns 400 error
 * - CSV contains correct employee data
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/employees/export-crew-ready/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import type { Employee } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";
import { canEditCrewingDone } from "@/lib/services/crewing-validation";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");
vi.mock("@/lib/services/crewing-validation");

describe("Story 13.7: Export Crew Ready API Integration", () => {
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
  });

  describe("POST /api/employees/export-crew-ready with selected IDs", () => {
    it("should export only selected employees", async () => {
      const eligible1 = createMockEmployee({
        id: "emp-1",
        crewing_done: false,
      });
      const eligible2 = createMockEmployee({
        id: "emp-2",
        crewing_done: false,
      });
      const notSelected = createMockEmployee({
        id: "emp-3",
        crewing_done: false,
      });

      const allEmployees = [eligible1, eligible2, notSelected];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);
      vi.mocked(canEditCrewingDone).mockReturnValue(true);
      vi.mocked(employeeRepository.update).mockResolvedValue(eligible1);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: ["emp-1", "emp-2"] }),
      });

      const response = await POST(request);
      const csvText = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Employees-Exported")).toBe("2");
      expect(csvText).toContain("emp-1");
      expect(csvText).toContain("emp-2");
      expect(csvText).not.toContain("emp-3");
    });

    it("should exclude non-selected employees even if they meet eligibility criteria", async () => {
      const eligible1 = createMockEmployee({
        id: "emp-1",
        crewing_done: false,
      });
      const eligible2 = createMockEmployee({
        id: "emp-2",
        crewing_done: false,
      });
      const notSelectedButEligible = createMockEmployee({
        id: "emp-3",
        crewing_done: false,
      });

      const allEmployees = [eligible1, eligible2, notSelectedButEligible];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);
      vi.mocked(canEditCrewingDone).mockReturnValue(true);
      vi.mocked(employeeRepository.update).mockResolvedValue(eligible1);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: ["emp-1", "emp-2"] }),
      });

      const response = await POST(request);
      const csvText = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Employees-Exported")).toBe("2");
      expect(csvText).not.toContain("emp-3");
      
      // Verify emp-3 was not updated
      expect(employeeRepository.update).not.toHaveBeenCalledWith("emp-3", expect.anything());
    });
  });

  describe("Only selected employees are marked as done", () => {
    it("should only mark selected employees as crewing_done = true", async () => {
      const eligible1 = createMockEmployee({
        id: "emp-1",
        crewing_done: false,
      });
      const eligible2 = createMockEmployee({
        id: "emp-2",
        crewing_done: false,
      });
      const notSelected = createMockEmployee({
        id: "emp-3",
        crewing_done: false,
      });

      const allEmployees = [eligible1, eligible2, notSelected];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);
      vi.mocked(canEditCrewingDone).mockReturnValue(true);
      vi.mocked(employeeRepository.update).mockResolvedValue(eligible1);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: ["emp-1", "emp-2"] }),
      });

      await POST(request);

      expect(employeeRepository.update).toHaveBeenCalledWith("emp-1", { crewing_done: true });
      expect(employeeRepository.update).toHaveBeenCalledWith("emp-2", { crewing_done: true });
      expect(employeeRepository.update).not.toHaveBeenCalledWith("emp-3", expect.anything());
    });

    it("should not mark employees that are already crewing_done = true", async () => {
      const eligible1 = createMockEmployee({
        id: "emp-1",
        crewing_done: false,
      });
      const alreadyDone = createMockEmployee({
        id: "emp-2",
        crewing_done: true,
      });

      const allEmployees = [eligible1, alreadyDone];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);
      vi.mocked(canEditCrewingDone).mockReturnValue(true);
      vi.mocked(employeeRepository.update).mockResolvedValue(eligible1);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: ["emp-1", "emp-2"] }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Employees-Exported")).toBe("1");
      
      // Only emp-1 should be updated (emp-2 is already done)
      expect(employeeRepository.update).toHaveBeenCalledWith("emp-1", { crewing_done: true });
      expect(employeeRepository.update).not.toHaveBeenCalledWith("emp-2", expect.anything());
    });

    it("should only mark selected employees that meet eligibility criteria", async () => {
      const eligible1 = createMockEmployee({
        id: "emp-1",
        crewing_done: false,
      });
      const eligible2 = createMockEmployee({
        id: "emp-2",
        crewing_done: false,
      });
      const ineligible = createMockEmployee({
        id: "emp-3",
        crewing_done: false,
        isps: false, // Missing prerequisite
      });

      const allEmployees = [eligible1, eligible2, ineligible];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);
      vi.mocked(canEditCrewingDone).mockImplementation((emp) => emp.id !== "emp-3");
      vi.mocked(employeeRepository.update).mockResolvedValue(eligible1);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: ["emp-1", "emp-2", "emp-3"] }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Employees-Exported")).toBe("2");
      
      // Only eligible selected employees should be updated
      expect(employeeRepository.update).toHaveBeenCalledWith("emp-1", { crewing_done: true });
      expect(employeeRepository.update).toHaveBeenCalledWith("emp-2", { crewing_done: true });
      expect(employeeRepository.update).not.toHaveBeenCalledWith("emp-3", expect.anything());
    });
  });

  describe("Empty selection returns 400 error", () => {
    it("should return 400 when selectedEmployeeIds is empty", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: [] }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("NO_EMPLOYEES_SELECTED");
      expect(json.error.message).toBe("No employees selected. Please select employees to export.");
      
      // Verify no employees were updated
      expect(employeeRepository.update).not.toHaveBeenCalled();
    });

    it("should return 400 when selectedEmployeeIds is missing", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("NO_EMPLOYEES_SELECTED");
      
      // Verify no employees were updated
      expect(employeeRepository.update).not.toHaveBeenCalled();
    });

    it("should return 400 when selectedEmployeeIds is not an array", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: "not-an-array" }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("NO_EMPLOYEES_SELECTED");
    });
  });

  describe("CSV contains correct employee data", () => {
    it("should include all required fields in CSV", async () => {
      const eligibleEmployee = createMockEmployee({
        id: "emp-1",
        crewing_done: false,
      });

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([eligibleEmployee]);
      vi.mocked(canEditCrewingDone).mockReturnValue(true);
      vi.mocked(employeeRepository.update).mockResolvedValue(eligibleEmployee);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: ["emp-1"] }),
      });

      const response = await POST(request);
      const csvText = await response.text();

      expect(response.status).toBe(200);
      
      // Verify CSV contains required fields
      expect(csvText).toContain("Employee ID");
      expect(csvText).toContain("First Name");
      expect(csvText).toContain("Surname");
      expect(csvText).toContain("SSN");
      expect(csvText).toContain("Email");
      expect(csvText).toContain("Mobile");
      expect(csvText).toContain("Rank");
      expect(csvText).toContain("Hire Date");
      expect(csvText).toContain("ISP");
      expect(csvText).toContain("Photo");
      expect(csvText).toContain("Origo");
      expect(csvText).toContain("Mail");
      expect(csvText).toContain("Salary Level");
      expect(csvText).toContain("Bankuppgifter");
      expect(csvText).toContain("LI");
      expect(csvText).toContain("Passport");
      expect(csvText).toContain("Kvitto C17/18");
      expect(csvText).toContain("C17");
      expect(csvText).toContain("All Prerequisites Met");
      expect(csvText).toContain("Ready for Crew Assignment");
    });

    it("should include employee data values in CSV", async () => {
      const eligibleEmployee = createMockEmployee({
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "123456-7890",
        email: "john@example.com",
        crewing_done: false,
      });

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([eligibleEmployee]);
      vi.mocked(canEditCrewingDone).mockReturnValue(true);
      vi.mocked(employeeRepository.update).mockResolvedValue(eligibleEmployee);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: ["emp-1"] }),
      });

      const response = await POST(request);
      const csvText = await response.text();

      expect(response.status).toBe(200);
      
      // Verify CSV contains employee data
      expect(csvText).toContain("John");
      expect(csvText).toContain("Doe");
      expect(csvText).toContain("123456-7890");
      expect(csvText).toContain("john@example.com");
    });

    it("should format boolean values as Yes/No in CSV", async () => {
      const eligibleEmployee = createMockEmployee({
        id: "emp-1",
        isps: true,
        photo: false,
        crewing_done: false,
      });

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([eligibleEmployee]);
      vi.mocked(canEditCrewingDone).mockReturnValue(true);
      vi.mocked(employeeRepository.update).mockResolvedValue(eligibleEmployee);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: ["emp-1"] }),
      });

      const response = await POST(request);
      const csvText = await response.text();

      expect(response.status).toBe(200);
      
      // Verify boolean formatting
      expect(csvText).toContain("Yes"); // isps: true
      expect(csvText).toContain("No"); // photo: false
    });
  });
});

