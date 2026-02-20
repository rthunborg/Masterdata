/**
 * Integration Tests for Export with Selection
 * Story 13.4: Export Only Selected Employees
 * 
 * Tests verify:
 * - Export crew ready only exports selected employees
 * - Export crew ready only marks selected employees as done
 * - Empty selection prevents export
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

describe("Story 13.4: Export Selected Employees Integration", () => {
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

  it("should export crew ready only exports selected employees", async () => {
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

    // Only select emp-1 and emp-2, not emp-3
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
    expect(csvText).not.toContain("emp-3"); // Not selected
  });

  it("should export crew ready only marks selected employees as done", async () => {
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

    // Verify only selected employees were marked as crewing_done
    expect(employeeRepository.update).toHaveBeenCalledWith("emp-1", { crewing_done: true });
    expect(employeeRepository.update).toHaveBeenCalledWith("emp-2", { crewing_done: true });
    expect(employeeRepository.update).not.toHaveBeenCalledWith("emp-3", expect.anything());
  });

  it("should prevent export when empty selection", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
      method: "POST",
      body: JSON.stringify({ selectedEmployeeIds: [] }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("NO_EMPLOYEES_SELECTED");
    expect(json.error.message).toBe("Inga anställda valda. Välj anställda att exportera.");

    // Verify no employees were updated
    expect(employeeRepository.update).not.toHaveBeenCalled();
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

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);
    vi.mocked(canEditCrewingDone).mockImplementation((emp) => {
      return emp.id !== "emp-3"; // emp-3 doesn't meet prerequisites
    });
    vi.mocked(employeeRepository.update).mockResolvedValue(eligible1);

    // Only select emp-1, emp-2 (both eligible), emp-3 (ineligible), but not emp-4
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

