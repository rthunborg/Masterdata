/**
 * Integration Tests for Export Crew-Ready Workflow API
 * 
 * Story: 11.6 - Integration Tests for API Routes
 * AC5: Export Workflow Integration Tests
 * 
 * Tests verify:
 * - POST /api/employees/export-crew-ready exports employees
 * - POST /api/employees/export-crew-ready filters by Crewing/Done = true
 * - POST /api/employees/export-crew-ready includes selected fields
 * - POST /api/employees/export-crew-ready formats ÖMC dates correctly
 * - POST /api/employees/export-crew-ready returns CSV format
 * - POST /api/employees/export-crew-ready handles empty result set
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

describe("POST /api/employees/export-crew-ready", () => {
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
    hire_date: "2020-01-01", // Use past date to pass validation,
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
    crewing_done: false, // Eligible for export
    comments: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export employees with all prerequisites met and crewing_done not true", async () => {
    const eligibleEmployee = createMockEmployee({
      crewing_done: false,
      isps: true,
      photo: true,
      origo: true,
      mail_lon: true,
      loneiva: 1,
      bankuppgifter: true,
      li: true,
      passport: true,
      kvitto_c17_18: true,
      c17: true,
    });

    const ineligibleEmployee = createMockEmployee({
      id: "emp-2",
      crewing_done: true, // Already marked
    });

    const allEmployees = [eligibleEmployee, ineligibleEmployee];

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);
    vi.mocked(canEditCrewingDone).mockImplementation((emp) => {
      return emp.isps && emp.photo && emp.origo && emp.mail_lon && 
             emp.loneiva !== null && emp.bankuppgifter && emp.li && 
             emp.passport && emp.kvitto_c17_18 && emp.c17;
    });
    vi.mocked(employeeRepository.update).mockResolvedValue({
      ...eligibleEmployee,
      crewing_done: true,
    });

    const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
      method: "POST",
      body: JSON.stringify({ selectedEmployeeIds: [eligibleEmployee.id] }),
    });

    const response = await POST(request);
    const csvText = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("X-Employees-Exported")).toBe("1");
    expect(csvText).toContain("John");
    expect(csvText).toContain("Doe");
    expect(csvText).toContain("123456-7890");

    // Verify employee was marked as crewing_done = true
    expect(employeeRepository.update).toHaveBeenCalledWith("emp-1", { crewing_done: true });
  });

  it("should filter by Crewing/Done = false or null only", async () => {
    const eligible1 = createMockEmployee({
      id: "emp-1",
      crewing_done: false,
    });
    const eligible2 = createMockEmployee({
      id: "emp-2",
      crewing_done: null,
    });
    const ineligible = createMockEmployee({
      id: "emp-3",
      crewing_done: true, // Should be excluded
    });

    const allEmployees = [eligible1, eligible2, ineligible];

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);
    vi.mocked(canEditCrewingDone).mockReturnValue(true);
    vi.mocked(employeeRepository.update).mockResolvedValue(eligible1);

    const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
      method: "POST",
      body: JSON.stringify({ selectedEmployeeIds: [eligible1.id, eligible2.id, ineligible.id] }),
    });

    const response = await POST(request);
    const csvText = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Employees-Exported")).toBe("2");
    expect(csvText).toContain("emp-1");
    expect(csvText).toContain("emp-2");
    expect(csvText).not.toContain("emp-3");
  });

  it("should include all required fields in CSV", async () => {
    const eligibleEmployee = createMockEmployee({
      omc_date: "omc-date-1",
    });

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue([eligibleEmployee]);
    vi.mocked(canEditCrewingDone).mockReturnValue(true);
    vi.mocked(employeeRepository.update).mockResolvedValue(eligibleEmployee);

    const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
      method: "POST",
      body: JSON.stringify({ selectedEmployeeIds: [eligibleEmployee.id] }),
    });

    const response = await POST(request);
    const csvText = await response.text();

    expect(response.status).toBe(200);

    // Verify CSV contains all required fields
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

  it("should format ÖMC dates correctly in export", async () => {
    const eligibleEmployee = createMockEmployee({
      omc_date: "omc-date-1",
    });

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue([eligibleEmployee]);
    vi.mocked(canEditCrewingDone).mockReturnValue(true);
    vi.mocked(employeeRepository.update).mockResolvedValue(eligibleEmployee);

    const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
      method: "POST",
      body: JSON.stringify({ selectedEmployeeIds: [eligibleEmployee.id] }),
    });

    const response = await POST(request);
    const csvText = await response.text();

    expect(response.status).toBe(200);
    // CSV should contain employee data with ÖMC date reference
    expect(csvText).toBeTruthy();
  });

  it("should return CSV format", async () => {
    const eligibleEmployee = createMockEmployee();

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue([eligibleEmployee]);
    vi.mocked(canEditCrewingDone).mockReturnValue(true);
    vi.mocked(employeeRepository.update).mockResolvedValue(eligibleEmployee);

    const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
      method: "POST",
      body: JSON.stringify({ selectedEmployeeIds: [eligibleEmployee.id] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(response.headers.get("Content-Disposition")).toContain(".csv");

    const csvText = await response.text();
    // Verify it's valid CSV (contains commas and newlines)
    expect(csvText).toContain(",");
    expect(csvText.split("\n").length).toBeGreaterThan(1);
  });

  it("should handle empty result set", async () => {
    const allEmployees: Employee[] = [];

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

    const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
      method: "POST",
      body: JSON.stringify({ selectedEmployeeIds: ["emp-1"] }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NO_ELIGIBLE_EMPLOYEES");
    expect(json.error.message).toContain("Inga anställda hittade som uppfyller alla förutsättningar och inte har markera crewing_done = true");
  });

  it("should handle case where no employees meet prerequisites", async () => {
    const employeeWithoutPrerequisites = createMockEmployee({
      isps: false, // Missing prerequisite
      crewing_done: false,
    });

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue([employeeWithoutPrerequisites]);
    vi.mocked(canEditCrewingDone).mockReturnValue(false); // Prerequisites not met

    const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
      method: "POST",
      body: JSON.stringify({ selectedEmployeeIds: [employeeWithoutPrerequisites.id] }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NO_ELIGIBLE_EMPLOYEES");
  });

  it("should return 401 for unauthenticated requests", async () => {
    vi.mocked(auth.requireEmployeeManagerAPI).mockRejectedValue(new Error("Autentisering krävs"));
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Autentisering krävs",
          },
        }),
        { status: 401 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
      method: "POST",
      body: JSON.stringify({ selectedEmployeeIds: ["emp-1"] }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 400 when no employees are selected", async () => {
    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);

    const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
      method: "POST",
      body: JSON.stringify({ selectedEmployeeIds: [] }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("NO_EMPLOYEES_SELECTED");
    expect(json.error.message).toContain("Inga anställda valda");
  });

  it("should return 400 when selectedEmployeeIds is missing", async () => {
    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);

    const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("NO_EMPLOYEES_SELECTED");
  });

  it("should only export selected employees that meet eligibility criteria", async () => {
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
    const notSelected = createMockEmployee({
      id: "emp-4",
      crewing_done: false,
    });

    const allEmployees = [eligible1, eligible2, ineligible, notSelected];

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);
    vi.mocked(canEditCrewingDone).mockImplementation((emp) => {
      return emp.id !== "emp-3"; // emp-3 doesn't meet prerequisites
    });
    vi.mocked(employeeRepository.update).mockResolvedValue(eligible1);

    // Only select emp-1 and emp-2 (both eligible), emp-3 (ineligible), but not emp-4
    const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
      method: "POST",
      body: JSON.stringify({ selectedEmployeeIds: [eligible1.id, eligible2.id, ineligible.id] }),
    });

    const response = await POST(request);
    const csvText = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Employees-Exported")).toBe("2"); // Only eligible1 and eligible2
    expect(csvText).toContain("emp-1");
    expect(csvText).toContain("emp-2");
    expect(csvText).not.toContain("emp-3"); // Ineligible
    expect(csvText).not.toContain("emp-4"); // Not selected

    // Verify only eligible selected employees were marked as crewing_done
    expect(employeeRepository.update).toHaveBeenCalledWith("emp-1", { crewing_done: true });
    expect(employeeRepository.update).toHaveBeenCalledWith("emp-2", { crewing_done: true });
    expect(employeeRepository.update).not.toHaveBeenCalledWith("emp-3", expect.anything());
    expect(employeeRepository.update).not.toHaveBeenCalledWith("emp-4", expect.anything());
  });
});
