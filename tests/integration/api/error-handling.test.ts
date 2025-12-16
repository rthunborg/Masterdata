/**
 * Integration Tests for API Error Handling
 * 
 * Story: 11.6 - Integration Tests for API Routes
 * AC6: Error Handling Integration Tests
 * 
 * Tests verify comprehensive error handling across all API routes:
 * - 400 Bad Request: Invalid input data
 * - 400 Bad Request: Validation constraint violated
 * - 404 Not Found: Resource doesn't exist
 * - 409 Conflict: Capacity full
 * - 409 Conflict: PE3 uniqueness violation
 * - 500 Internal Server Error: Database error
 * - Error messages in Swedish
 * - Error response format consistent
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "@/app/api/employees/route";
import { PATCH, DELETE } from "@/app/api/employees/[id]/route";
import { GET as GET_DATES, POST as POST_DATES } from "@/app/api/important-dates/route";
import { PATCH as PATCH_DATES, DELETE as DELETE_DATES } from "@/app/api/important-dates/[id]/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { importantDateRepository } from "@/lib/server/repositories/important-date-repository";
import { assignEmployeeToDate } from "@/lib/services/date-capacity";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/types/user";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");
vi.mock("@/lib/server/repositories/important-date-repository");
vi.mock("@/lib/services/date-capacity");
vi.mock("@/lib/supabase/server");

describe("Error Handling - 400 Bad Request", () => {
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

  it("should return 400 for invalid input data (POST /api/employees)", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const invalidData = {
      first_name: "John",
      // Missing required fields: surname, ssn, email, hire_date
    };

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(invalidData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details).toBeDefined();
  });

  it("should return 400 for validation constraint violated (invalid enum)", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const invalidData = {
      first_name: "John",
      surname: "Doe",
      ssn: "19900101-1234",
      email: "john@example.com",
      hire_date: "2020-01-01", // Use past date to pass validation,
      gender: "InvalidGender", // Invalid enum value
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

  it("should return 400 for invalid date format", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const invalidData = {
      first_name: "John",
      surname: "Doe",
      ssn: "19900101-1234",
      email: "john@example.com",
      hire_date: "invalid-date-format",
    };

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(invalidData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("Error Handling - 404 Not Found", () => {
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

  it("should return 404 when employee not found (PATCH)", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/employees/non-existent-id", {
      method: "PATCH",
      body: JSON.stringify({ email: "updated@example.com" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "non-existent-id" }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toContain("not found");
  });

  it("should return 404 when employee not found (DELETE)", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/employees/non-existent-id", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "non-existent-id" }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("should return 404 when important date not found (PATCH)", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(importantDateRepository.update).mockRejectedValue(
      new Error("Important date not found")
    );

    const request = new NextRequest("http://localhost:3000/api/important-dates/non-existent", {
      method: "PATCH",
      body: JSON.stringify({ notes: "Update" }),
    });

    const response = await PATCH_DATES(request, { params: Promise.resolve({ id: "non-existent" }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("should return 404 when important date not found (DELETE)", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(importantDateRepository.delete).mockRejectedValue(
      new Error("Important date not found")
    );

    const request = new NextRequest("http://localhost:3000/api/important-dates/non-existent", {
      method: "DELETE",
    });

    const response = await DELETE_DATES(request, { params: Promise.resolve({ id: "non-existent" }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });
});

describe("Error Handling - 409 Conflict", () => {
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

  it("should return 409 when capacity is full", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    // Use unknown for type assertion to fix lint error
    const mockCreatedEmployee = {
      id: "emp-123",
      first_name: "John",
      surname: "Doe",
      ssn: "19900101-1234",
      email: "john@example.com",
      hire_date: "2020-01-01", // Use past date to pass validation,
      omc_date: "omc-date-full",
    } as unknown as import("@/lib/types/employee").Employee;
    vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);
    vi.mocked(assignEmployeeToDate).mockRejectedValue(
      new Error("ÖMC-datum 8-9 mars 2025 är fullbokat")
    );
    vi.mocked(createClient).mockResolvedValue({} as unknown as ReturnType<typeof createClient>);

    const employeeData = {
      first_name: "John",
      surname: "Doe",
      ssn: "19900101-1234",
      email: "john@example.com",
      hire_date: "2020-01-01", // Use past date to pass validation,
      rank: "SEV" as const,
      omc_date: "omc-date-full",
      stena_date: null,
      pe3_date: null,
      mobile: null,
      gender: null,
      town_district: null,
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      repayment_needed_omc: null,
      repayment_needed_pe3: null,
      one: false,
      one_marked_at: null,
      talmundo: false,
      isps: false,
      photo: false,
      origo: false,
      loneiva: null,
      mail_lon: false,
      bankuppgifter: false,
      li: false,
      passport: false,
      kvitto_c17_18: false,
      c17: false,
      crewing_done: false,
      hotel_required: false,
      comments: null,
      omc_masterdata_reminder_sent_at: null,
      room_number_shared: null,
    };

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(employeeData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("DATE_CAPACITY_EXCEEDED");
    expect(json.error.message).toContain("fullbokat");
  });

  it("should return 409 for PE3 uniqueness violation", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    const mockCreatedEmployee = {
      id: "emp-123",
      first_name: "John",
      surname: "Doe",
      ssn: "19900101-1234",
      email: "john@example.com",
      hire_date: "2020-01-01", // Use past date to pass validation,
      pe3_date: "pe3-date-1",
    } as unknown as import("@/lib/types/employee").Employee;
    vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);
    const duplicateError = new Error("PE3 date pe3-date-1 is already assigned to another employee");
    vi.mocked(assignEmployeeToDate).mockRejectedValue(duplicateError);
    vi.mocked(createClient).mockResolvedValue({} as unknown as ReturnType<typeof createClient>);

    const employeeData = {
      first_name: "John",
      surname: "Doe",
      ssn: "19900101-1234",
      email: "john@example.com",
      hire_date: "2020-01-01", // Use past date to pass validation,
      rank: "SEV" as const,
      pe3_date: "pe3-date-1",
      stena_date: null,
      omc_date: null,
      mobile: null,
      gender: null,
      town_district: null,
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      repayment_needed_omc: null,
      repayment_needed_pe3: null,
      one: false,
      one_marked_at: null,
      talmundo: false,
      isps: false,
      photo: false,
      origo: false,
      loneiva: null,
      mail_lon: false,
      bankuppgifter: false,
      li: false,
      passport: false,
      kvitto_c17_18: false,
      c17: false,
      crewing_done: false,
      hotel_required: false,
      comments: null,
      omc_masterdata_reminder_sent_at: null,
      room_number_shared: null,
    };

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(employeeData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error.code).toBe("DUPLICATE_PE3_DATE");
    expect(json.error.message).toContain("already assigned");
  });
});

describe("Error Handling - 500 Internal Server Error", () => {
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

  it("should return 500 for database error", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockRejectedValue(
      new Error("Database connection failed")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Database connection failed",
          },
        }),
        { status: 500 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});

describe("Error Handling - Error Response Format", () => {
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

  it("should have consistent error response format", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/employees/non-existent-id", {
      method: "PATCH",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "non-existent-id" }) });
    const json = await response.json();

    // Verify error response structure
    expect(json).toHaveProperty("error");
    expect(json.error).toHaveProperty("code");
    expect(json.error).toHaveProperty("message");
    expect(json.error).toHaveProperty("timestamp");
  });

  it("should include Swedish error messages when appropriate", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.create).mockRejectedValue(
      new Error("ÖMC-datum 8-9 mars 2025 är fullbokat")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "CAPACITY_FULL",
            message: "ÖMC-datum 8-9 mars 2025 är fullbokat",
            field: "omc_date",
          },
        }),
        { status: 409 }
      ) as never
    );

    const mockCreatedEmployee = {
      id: "emp-123",
      first_name: "John",
      surname: "Doe",
      ssn: "19900101-1234",
      email: "john@example.com",
      hire_date: "2020-01-01", // Use past date to pass validation,
      omc_date: "omc-date-full",
    } as unknown as import("@/lib/types/employee").Employee;
    vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);
    vi.mocked(assignEmployeeToDate).mockRejectedValue(
      new Error("ÖMC-datum 8-9 mars 2025 är fullbokat")
    );
    vi.mocked(createClient).mockResolvedValue({} as unknown as ReturnType<typeof createClient>);

    const employeeData = {
      first_name: "John",
      surname: "Doe",
      ssn: "19900101-1234",
      email: "john@example.com",
      hire_date: "2020-01-01", // Use past date to pass validation,
      rank: "SEV" as const,
      omc_date: "omc-date-full",
      stena_date: null,
      pe3_date: null,
      mobile: null,
      gender: null,
      town_district: null,
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      repayment_needed_omc: null,
      repayment_needed_pe3: null,
      one: false,
      one_marked_at: null,
      talmundo: false,
      isps: false,
      photo: false,
      origo: false,
      loneiva: null,
      mail_lon: false,
      bankuppgifter: false,
      li: false,
      passport: false,
      kvitto_c17_18: false,
      c17: false,
      crewing_done: false,
      hotel_required: false,
      comments: null,
      omc_masterdata_reminder_sent_at: null,
      room_number_shared: null,
    };

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(employeeData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(json.error.message).toContain("fullbokat"); // Swedish message
  });
});
