/**
 * Integration Tests for Enum Validation at API Level
 * Story 11.4: Field Validation & Prerequisites Tests
 * AC3: Enum Validation Tests (API Integration)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/employees/route";
import { PATCH } from "@/app/api/employees/[id]/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { UserRole } from "@/lib/types/user";
import { createTestEmployee } from "@/../tests/helpers/validation-test-helpers";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");

describe("API Enum Validation - Gender", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  const baseEmployeeData = {
    first_name: "Jane",
    surname: "Smith",
    ssn: "19900101-1234",
    email: "jane.smith@example.com",
    mobile: "+46701234567",
    rank: "CHEF" as const,
    town_district: "Gothenburg",
    hire_date: "2020-01-01", // Use past date to pass validation,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject invalid gender enum value via API", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const invalidData = {
      ...baseEmployeeData,
      gender: 'male' as unknown as import("@/lib/types/employee").Gender, // Invalid enum value
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
});

describe("API Enum Validation - Rank", () => {
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

  it("should reject invalid rank enum value via API", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const invalidData = {
      first_name: "John",
      surname: "Doe",
      ssn: "19900101-1234",
      email: "john@example.com",
      hire_date: "2020-01-01", // Use past date to pass validation,
      rank: 'sev' as unknown as import("@/lib/types/employee").Rank, // Invalid enum value (lowercase)
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

  it("should reject invalid rank enum on PATCH", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    const employee = createTestEmployee();
    vi.mocked(employeeRepository.findById).mockResolvedValue(employee);

    const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
      method: "PATCH",
      body: JSON.stringify({ rank: 'Manager' as unknown as import("@/lib/types/employee").Rank }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details.rank).toBeDefined();
  });
});
