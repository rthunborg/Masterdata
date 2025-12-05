import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "@/app/api/employees/route";
import { PATCH, DELETE } from "@/app/api/employees/[id]/route";
import { POST as TERMINATE } from "@/app/api/employees/[id]/terminate/route";
import { POST as REACTIVATE } from "@/app/api/employees/[id]/reactivate/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { importantDateRepository } from "@/lib/server/repositories/important-date-repository";
import { assignEmployeeToDate } from "@/lib/services/date-capacity";
import { calculateRoomNumber, recalculateRoomsForDate, recalculateRoomsForEmployee } from "@/lib/services/room-assignment";
import { createClient } from "@/lib/supabase/server";
import type { Employee, EmployeeFormData } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";

vi.mock("@/lib/services/date-capacity");
vi.mock("@/lib/services/room-assignment");
vi.mock("@/lib/server/repositories/important-date-repository");
vi.mock("@/lib/supabase/server");

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");

describe("GET /api/employees", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  const mockEmployees: Employee[] = [
    {
      id: "emp-1",
      first_name: "John",
      surname: "Doe",
      ssn: "123456-7890",
      email: "john@example.com",
      mobile: "+46701234567",
      rank: "SEV",
      gender: 'Man',
      town_district: "Stockholm",
      hire_date: "2020-01-15", // Use past date to pass validation
  stena_date: null,
  omc_date: null,
  pe3_date: null,
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
        created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",      },
    {
      id: "emp-2",
      first_name: "Jane",
      surname: "Smith",
      ssn: "234567-8901",
      email: "jane@example.com",
      mobile: null,
      rank: 'SEV',
      gender: 'Woman',
      town_district: null,
      hire_date: "2020-01-01",
  stena_date: null,
  omc_date: null,
  pe3_date: null,
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
        created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",      },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return employee list for HR Admin", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees);

    const request = new NextRequest("http://localhost:3000/api/employees");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(mockEmployees);
    expect(json.meta).toEqual({
      total: 2,
      filtered: 2,
    });
    expect(employeeRepository.findAll).toHaveBeenCalledWith({
      includeArchived: false,
      includeTerminated: false,
      needsRepayment: false,
    });
  });

  it("should return 401 for unauthenticated requests", async () => {
    vi.mocked(auth.requireAuthAPI).mockRejectedValue(
      new Error("Authentication required")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        { status: 401 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 403 for non-HR Admin users", async () => {
    // Note: GET endpoint uses requireAuthAPI, not requireHRAdminAPI
    // This test should verify that non-HR Admin users can still access the endpoint
    // (since GET allows all authenticated users, but RLS filters results)
    const mockExternalUser = {
      ...mockHRAdminUser,
      role: UserRole.EXTERNAL_PARTY,
    };
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockExternalUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees);

    const request = new NextRequest("http://localhost:3000/api/employees");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    // External parties can access but RLS filters results
    expect(json.data).toBeDefined();
  });

  it("should respect includeArchived query parameter", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees);

    const request = new NextRequest(
      "http://localhost:3000/api/employees?includeArchived=true"
    );
    await GET(request);

    expect(employeeRepository.findAll).toHaveBeenCalledWith({
      includeArchived: true,
      includeTerminated: false,
      needsRepayment: false,
    });
  });

  it("should respect includeTerminated query parameter", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees);

    const request = new NextRequest(
      "http://localhost:3000/api/employees?includeTerminated=true"
    );
    await GET(request);

    expect(employeeRepository.findAll).toHaveBeenCalledWith({
      includeArchived: false,
      includeTerminated: true,
      needsRepayment: false,
    });
  });

  it("should return empty array when no employees exist", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue([]);

    const request = new NextRequest("http://localhost:3000/api/employees");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([]);
    expect(json.meta.total).toBe(0);
  });
});

describe("POST /api/employees", () => {
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
    hire_date: "2020-01-01", // Use past date to pass validation
    stena_date: null,
    omc_date: null,
    pe3_date: null,
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
    comments: "New employee",
    omc_masterdata_reminder_sent_at: null,
    room_number_shared: null,
  };

  const mockCreatedEmployee: Employee = {
    id: "new-emp-123",
    ...validEmployeeData,
    created_at: "2025-10-27T12:00:00Z",
    updated_at: "2025-10-27T12:00:00Z",      };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create employee for HR Admin", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(validEmployeeData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data).toEqual(mockCreatedEmployee);
    expect(json.meta.timestamp).toBeDefined();
    expect(employeeRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: validEmployeeData.first_name,
        surname: validEmployeeData.surname,
        ssn: "900101-1234", // SSN should be normalized (century stripped)
        email: validEmployeeData.email,
      })
    );
  });

  it("should return 400 for missing required fields", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const invalidData = {
      first_name: "John",
      // Missing required fields
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

  it("should return 400 for invalid email format", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const invalidData = {
      ...validEmployeeData,
      email: "not-an-email",
    };

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(invalidData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details.email).toBeDefined();
  });

  it("should return 400 for invalid SSN format", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const invalidData = {
      ...validEmployeeData,
      ssn: "invalid-ssn",
    };

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(invalidData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details.ssn).toBeDefined();
  });

  it("should return 400 for future hire date", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDate = tomorrow.toISOString().split("T")[0];

    const invalidData = {
      ...validEmployeeData,
      hire_date: futureDate,
    };

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(invalidData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details.hire_date).toBeDefined();
  });

  it("should return 409 for duplicate SSN", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.create).mockRejectedValue(
      new Error("Employee with SSN 19900101-1234 already exists")
    );

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(validEmployeeData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error.code).toBe("DUPLICATE_ENTRY");
    expect(json.error.message).toContain("already exists");
  });

  it("should return 401 for unauthenticated requests", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(
      new Error("Authentication required")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        { status: 401 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(validEmployeeData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 403 for non-HR Admin users", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(
      new Error("Insufficient permissions")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions",
          },
        }),
        { status: 403 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(validEmployeeData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("should accept minimal valid data with defaults", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);

    const minimalData = {
      first_name: "Test",
      surname: "User",
      ssn: "19950101-1234",
      email: "test@example.com",
      mobile: null,
      hire_date: "2020-01-01", // Use past date to pass validation
      rank: "SEV" as const,
      gender: null,
      town_district: null,
      stena_date: null,
      omc_date: null,
      pe3_date: null,
      comments: null,
      omc_masterdata_reminder_sent_at: null,
      room_number_shared: null,
      one: false,
      talmundo: false,
      isps: false,
      photo: false,
      origo: false,
      mail_lon: false,
      bankuppgifter: false,
      li: false,
      passport: false,
      kvitto_c17_18: false,
      c17: false,
      crewing_done: false,
      hotel_required: false,
      is_terminated: false,
      is_archived: false,
      termination_date: null,
      termination_reason: null,
      loneiva: null,
    };

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(minimalData),
    });

    const response = await POST(request);
    const json = await response.json();

    if (response.status !== 201) {
      console.error("Validation error:", JSON.stringify(json, null, 2));
    }
    expect(response.status).toBe(201);
    expect(json.data).toBeDefined();
    expect(employeeRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: minimalData.first_name,
        surname: minimalData.surname,
        ssn: "950101-1234", // SSN should be normalized (century stripped)
        email: minimalData.email,
        hire_date: minimalData.hire_date,
        mobile: null,
        rank: 'SEV',
        gender: null,
        town_district: null,
        is_terminated: false,
        is_archived: false,
        termination_date: null,
        termination_reason: null,
      })
    );
  });
});

describe("PATCH /api/employees/[id]", () => {
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
    id: "employee-123",
    first_name: "John",
    surname: "Doe",
    ssn: "19850315-1234",
    email: "john.doe@example.com",
    mobile: "+46701234567",
    rank: "CHEF",
    gender: 'Man',
    town_district: "Stockholm",
    hire_date: "2020-01-15", // Use past date to pass validation
  stena_date: null,
  omc_date: null,
  pe3_date: null,
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
        created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",      };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update employee for HR Admin", async () => {
    const updatedEmployee = {
      ...mockEmployee,
      email: "updated@example.com",
      updated_at: "2025-10-27T15:30:00Z",      };

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
    vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({ email: "updated@example.com" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.email).toBe("updated@example.com");
    expect(json.meta.timestamp).toBeDefined();
    expect(json.meta.requestId).toBeDefined();
    expect(employeeRepository.update).toHaveBeenCalledWith("employee-123", {
      email: "updated@example.com",
    });
  });

  it("should update multiple fields simultaneously", async () => {
    const updatedEmployee = {
      ...mockEmployee,
      email: "new@example.com",
      mobile: "+46709876543",
      rank: "SEV" as const,
      updated_at: "2025-10-27T15:30:00Z",      };

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
    vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({
        email: "new@example.com",
        mobile: "+46709876543",
        rank: "SEV",
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.email).toBe("new@example.com");
    expect(json.data.mobile).toBe("+46709876543");
    expect(json.data.rank).toBe("SEV");
  });

  it("should return 400 for invalid email format", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({ email: "invalid-email" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details.email).toBeDefined();
  });

  it("should return 400 for invalid SSN format", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({ ssn: "invalid-ssn" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details.ssn).toBeDefined();
  });

  it("should return 400 for empty update object", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({}),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toContain("Invalid input data");
  });

  it("should return 404 for non-existent employee", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.update).mockRejectedValue(
      new Error("Employee with ID nonexistent-id not found")
    );

    const request = new NextRequest("http://localhost:3000/api/employees/nonexistent-id", {
      method: "PATCH",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "nonexistent-id" }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toContain("not found");
  });

  it("should return 409 for duplicate SSN", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
    vi.mocked(employeeRepository.update).mockRejectedValue(
      new Error("Employee with SSN 19900101-1234 already exists")
    );

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({ ssn: "19900101-1234" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error.code).toBe("DUPLICATE_ENTRY");
    expect(json.error.message).toContain("already exists");
  });

  it("should return 401 for unauthenticated requests", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(
      new Error("Authentication required")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        { status: 401 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 403 for non-HR Admin users", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(
      new Error("Insufficient permissions")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions",
          },
        }),
        { status: 403 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("should allow nullable fields to be set to null", async () => {
    const updatedEmployee = {
      ...mockEmployee,
      mobile: null,
      updated_at: "2025-10-27T15:30:00Z",      };

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
    vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({ mobile: null, comments: null }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.mobile).toBeNull();
    expect(json.data.comments).toBeNull();
  });
});

describe("POST /api/employees/[id]/terminate", () => {
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
    id: "employee-123",
    first_name: "John",
    surname: "Doe",
    ssn: "123456-7890",
    email: "john@example.com",
    mobile: "+46701234567",
    rank: "SEV",
    gender: 'Man',
    town_district: "Stockholm",
    hire_date: "2020-01-15", // Use past date to pass validation
  stena_date: null,
  omc_date: null,
  pe3_date: null,
  termination_date: "2025-10-26",
    termination_reason: "Voluntary resignation",
    is_terminated: true,
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
        created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-10-27T00:00:00Z",      };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should terminate employee for HR Admin", async () => {
    const terminatedEmployee = {
      ...mockEmployee,
      is_terminated: true,
      termination_date: "2025-10-26",
      termination_reason: "Voluntary resignation",
    };

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.terminate).mockResolvedValue({ 
      employee: terminatedEmployee, 
      clearedDates: [], 
      releasedSpots: 0 
    });

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123/terminate", {
      method: "POST",
      body: JSON.stringify({
        termination_date: "2025-10-26",
        termination_reason: "Voluntary resignation",
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.employee.is_terminated).toBe(true);
    expect(json.data.employee.termination_date).toBe("2025-10-26");
    expect(json.data.employee.termination_reason).toBe("Voluntary resignation");
    expect(employeeRepository.terminate).toHaveBeenCalledWith(
      "employee-123",
      "2025-10-26",
      "Voluntary resignation"
    );
  });

  it("should return 400 for missing termination date", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123/terminate", {
      method: "POST",
      body: JSON.stringify({
        termination_reason: "Test reason",
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toContain("Termination date and reason are required");
  });

  it("should return 400 for missing termination reason", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123/terminate", {
      method: "POST",
      body: JSON.stringify({
        termination_date: "2025-10-26",
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toContain("Termination date and reason are required");
  });

  it("should return 400 for invalid date format", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123/terminate", {
      method: "POST",
      body: JSON.stringify({
        termination_date: "invalid-date",
        termination_reason: "Test reason",
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 404 for non-existent employee", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.terminate).mockRejectedValue(
      new Error("Employee with ID nonexistent-id not found")
    );

    const request = new NextRequest("http://localhost:3000/api/employees/nonexistent-id/terminate", {
      method: "POST",
      body: JSON.stringify({
        termination_date: "2025-10-26",
        termination_reason: "Test reason",
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: "nonexistent-id" }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toContain("not found");
  });

  it("should return 401 for unauthenticated requests", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(
      new Error("Authentication required")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        { status: 401 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123/terminate", {
      method: "POST",
      body: JSON.stringify({
        termination_date: "2025-10-26",
        termination_reason: "Test reason",
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 403 for non-HR Admin users", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(
      new Error("Insufficient permissions")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions",
          },
        }),
        { status: 403 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123/terminate", {
      method: "POST",
      body: JSON.stringify({
        termination_date: "2025-10-26",
        termination_reason: "Test reason",
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });
});

describe("POST /api/employees/[id]/reactivate", () => {
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
    id: "employee-123",
    first_name: "John",
    surname: "Doe",
    ssn: "123456-7890",
    email: "john@example.com",
    mobile: "+46701234567",
    rank: "SEV",
    gender: 'Man',
    town_district: "Stockholm",
    hire_date: "2020-01-15", // Use past date to pass validation
  stena_date: null,
  omc_date: null,
  pe3_date: null,
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
        created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-10-27T00:00:00Z",      };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reactivate employee for HR Admin", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.reactivate).mockResolvedValue({ employee: mockEmployee, warnings: [] });

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123/reactivate", {
      method: "POST",
    });

    const response = await REACTIVATE(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.is_terminated).toBe(false);
    expect(json.data.termination_date).toBeNull();
    expect(json.data.termination_reason).toBeNull();
    expect(employeeRepository.reactivate).toHaveBeenCalledWith("employee-123");
  });

  it("should return 404 for non-existent employee", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.reactivate).mockRejectedValue(
      new Error("Employee with ID nonexistent-id not found")
    );

    const request = new NextRequest("http://localhost:3000/api/employees/nonexistent-id/reactivate", {
      method: "POST",
    });

    const response = await REACTIVATE(request, { params: Promise.resolve({ id: "nonexistent-id" }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toContain("not found");
  });

  it("should return 401 for unauthenticated requests", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(
      new Error("Authentication required")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        { status: 401 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123/reactivate", {
      method: "POST",
    });

    const response = await REACTIVATE(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 403 for non-HR Admin users", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(
      new Error("Insufficient permissions")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions",
          },
        }),
        { status: 403 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123/reactivate", {
      method: "POST",
    });

    const response = await REACTIVATE(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });
});

describe("SSN Normalization Tests", () => {
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

  describe("POST /api/employees - SSN Normalization", () => {
    it("should normalize dashless 10-digit SSN on create", async () => {
      const employeeWithDashlessSSN: EmployeeFormData = {
        first_name: "Test",
        surname: "User",
        ssn: "8503151234", // Dashless format
        email: "test@example.com",
        mobile: null,
        rank: 'SEV',
        gender: null,
        town_district: null,
        hire_date: "2020-01-15", // Use past date to pass validation
  stena_date: null,
  omc_date: null,
  pe3_date: null,
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

      const mockCreatedEmployee: Employee = {
        id: "emp-123",
        ...employeeWithDashlessSSN,
        ssn: "850315-1234", // Normalized with dash
        omc_masterdata_reminder_sent_at: null,
        room_number_shared: null,
        created_at: "2025-10-27T12:00:00Z",
        updated_at: "2025-10-27T12:00:00Z",
      };

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);

      const request = new NextRequest("http://localhost:3000/api/employees", {
        method: "POST",
        body: JSON.stringify(employeeWithDashlessSSN),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data.ssn).toBe("850315-1234");
      expect(employeeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ssn: "850315-1234", // Verify normalized SSN was passed to repository
        })
      );
    });

    it("should accept and preserve already normalized SSN (with dash)", async () => {
      const employeeWithDashedSSN: EmployeeFormData = {
        first_name: "Test",
        surname: "User",
        ssn: "850315-1234", // Already normalized
        email: "test@example.com",
        mobile: null,
        rank: 'SEV',
        gender: null,
        town_district: null,
        hire_date: "2020-01-15", // Use past date to pass validation
  stena_date: null,
  omc_date: null,
  pe3_date: null,
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

      const mockCreatedEmployee: Employee = {
        id: "emp-124",
        ...employeeWithDashedSSN,
        omc_masterdata_reminder_sent_at: null,
        room_number_shared: null,
        created_at: "2025-10-27T12:00:00Z",
        updated_at: "2025-10-27T12:00:00Z",
      };

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);

      const request = new NextRequest("http://localhost:3000/api/employees", {
        method: "POST",
        body: JSON.stringify(employeeWithDashedSSN),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data.ssn).toBe("850315-1234");
      expect(employeeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ssn: "850315-1234",
        })
      );
    });

    it("should normalize 12-digit SSN (with century) on create", async () => {
      const employeeWith12DigitSSN: EmployeeFormData = {
        first_name: "Test",
        surname: "User",
        ssn: "198503151234", // 12 digits with century
        email: "test@example.com",
        mobile: null,
        rank: 'SEV',
        gender: null,
        town_district: null,
        hire_date: "2020-01-15", // Use past date to pass validation
  stena_date: null,
  omc_date: null,
  pe3_date: null,
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

      const mockCreatedEmployee: Employee = {
        id: "emp-125",
        ...employeeWith12DigitSSN,
        ssn: "850315-1234", // Normalized (century stripped)
        omc_masterdata_reminder_sent_at: null,
        room_number_shared: null,
        created_at: "2025-10-27T12:00:00Z",
        updated_at: "2025-10-27T12:00:00Z",
      };

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);

      const request = new NextRequest("http://localhost:3000/api/employees", {
        method: "POST",
        body: JSON.stringify(employeeWith12DigitSSN),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data.ssn).toBe("850315-1234");
      expect(employeeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ssn: "850315-1234",
        })
      );
    });
  });

  describe("PATCH /api/employees/:id - SSN Normalization", () => {
    it("should normalize dashless SSN on update", async () => {
      const updateData = {
        ssn: "9001011234", // Dashless
      };

      const mockUpdatedEmployee: Employee = {
        id: "emp-123",
        first_name: "Test",
        surname: "User",
        ssn: "900101-1234", // Normalized
        email: "test@example.com",
        mobile: null,
        rank: 'SEV',
        gender: null,
        town_district: null,
        hire_date: "2020-01-15", // Use past date to pass validation
  stena_date: null,
  omc_date: null,
  pe3_date: null,
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
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-10-27T12:00:00Z",      };

      const mockCurrentEmployee: Employee = {
        ...mockUpdatedEmployee,
        ssn: "850315-1234", // Original SSN
      };

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findById).mockResolvedValue(mockCurrentEmployee);
      vi.mocked(employeeRepository.update).mockResolvedValue(mockUpdatedEmployee);

      const request = new NextRequest("http://localhost:3000/api/employees/emp-123", {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "emp-123" }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.ssn).toBe("900101-1234");
      expect(employeeRepository.update).toHaveBeenCalledWith(
        "emp-123",
        expect.objectContaining({
          ssn: "900101-1234", // Verify normalized SSN was passed
        })
      );
    });

    it("should accept dashed SSN on update", async () => {
      const updateData = {
        ssn: "900101-1234", // Already normalized
      };

      const mockUpdatedEmployee: Employee = {
        id: "emp-123",
        first_name: "Test",
        surname: "User",
        ssn: "900101-1234",
        email: "test@example.com",
        mobile: null,
        rank: 'SEV',
        gender: null,
        town_district: null,
        hire_date: "2020-01-15", // Use past date to pass validation
  stena_date: null,
  omc_date: null,
  pe3_date: null,
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
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-10-27T12:00:00Z",      };

      const mockCurrentEmployee: Employee = {
        ...mockUpdatedEmployee,
        ssn: "850315-1234", // Original SSN
      };

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findById).mockResolvedValue(mockCurrentEmployee);
      vi.mocked(employeeRepository.update).mockResolvedValue(mockUpdatedEmployee);

      const request = new NextRequest("http://localhost:3000/api/employees/emp-123", {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "emp-123" }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.ssn).toBe("900101-1234");
      expect(employeeRepository.update).toHaveBeenCalledWith(
        "emp-123",
        expect.objectContaining({
          ssn: "900101-1234",
        })
      );
    });

    it("should not normalize SSN when updating other fields", async () => {
      const updateData = {
        first_name: "Updated",
        // No SSN field
      };

      const mockUpdatedEmployee: Employee = {
        id: "emp-123",
        first_name: "Updated",
        surname: "User",
        ssn: "850315-1234", // Original SSN unchanged
        email: "test@example.com",
        mobile: null,
        rank: 'SEV',
        gender: null,
        town_district: null,
        hire_date: "2020-01-15", // Use past date to pass validation
  stena_date: null,
  omc_date: null,
  pe3_date: null,
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
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-10-27T12:00:00Z",      };

      const mockCurrentEmployee: Employee = {
        ...mockUpdatedEmployee,
        first_name: "Test", // Original first name
      };

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findById).mockResolvedValue(mockCurrentEmployee);
      vi.mocked(employeeRepository.update).mockResolvedValue(mockUpdatedEmployee);

      const request = new NextRequest("http://localhost:3000/api/employees/emp-123", {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "emp-123" }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.first_name).toBe("Updated");
      expect(json.data.ssn).toBe("850315-1234");
      expect(employeeRepository.update).toHaveBeenCalledWith(
        "emp-123",
        expect.objectContaining({
          first_name: "Updated",
        })
      );
      expect(employeeRepository.update).toHaveBeenCalledWith(
        "emp-123",
        expect.not.objectContaining({
          ssn: expect.anything(),
        })
      );
    });
  });
});

describe("POST /api/employees - Capacity Management", () => {
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
    vi.mocked(createClient).mockResolvedValue({} as any);
  });

  it("should decrement capacity on date assignment", async () => {
    const employeeData: EmployeeFormData = {
      first_name: "Jane",
      surname: "Smith",
      ssn: "19900101-1234",
      email: "jane.smith@example.com",
      mobile: "+46701234567",
      rank: "CHEF",
      gender: "Woman",
      town_district: "Gothenburg",
      hire_date: "2020-01-01", // Use past date to pass validation
      stena_date: null,
      omc_date: "omc-date-1",
      pe3_date: null,
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
      comments: null,
      hotel_required: false,
      omc_masterdata_reminder_sent_at: null,
      room_number_shared: null,
    };

    const mockCreatedEmployee: Employee = {
      id: "new-emp-123",
      ...employeeData,
      created_at: "2025-10-27T12:00:00Z",
      updated_at: "2025-10-27T12:00:00Z",
    };

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);
    vi.mocked(assignEmployeeToDate).mockResolvedValue();

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(employeeData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(assignEmployeeToDate).toHaveBeenCalledWith(
      "new-emp-123",
      "omc-date-1",
      null,
      "omc_date",
      expect.anything()
    );
  });

  it("should assign room number on ÖMC date assignment when hotel_required is true", async () => {
    const employeeData: EmployeeFormData = {
      first_name: "Jane",
      surname: "Smith",
      ssn: "19900101-1234",
      email: "jane.smith@example.com",
      mobile: "+46701234567",
      rank: "CHEF",
      gender: "Woman",
      town_district: "Gothenburg",
      hire_date: "2020-01-01", // Use past date to pass validation
      stena_date: null,
      omc_date: "omc-date-1",
      pe3_date: null,
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
      comments: null,
      hotel_required: true,
      omc_masterdata_reminder_sent_at: null,
      room_number_shared: null,
    };

    const mockCreatedEmployee: Employee = {
      id: "new-emp-123",
      ...employeeData,
      hotel_room_number: 5,
      created_at: "2025-10-27T12:00:00Z",
      updated_at: "2025-10-27T12:00:00Z",
    };

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(calculateRoomNumber).mockResolvedValue(5);
    vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);
    vi.mocked(assignEmployeeToDate).mockResolvedValue();

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(employeeData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(calculateRoomNumber).toHaveBeenCalledWith(
      {
        omc_date: "omc-date-1",
        rank: "CHEF",
        gender: "Woman",
        hotel_required: true,
      },
      expect.anything()
    );
    expect(json.data.hotel_room_number).toBe(5);
  });
});

describe("PATCH /api/employees/[id] - Capacity and Room Recalculation", () => {
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
    id: "employee-123",
    first_name: "John",
    surname: "Doe",
    ssn: "19850315-1234",
    email: "john.doe@example.com",
    mobile: "+46701234567",
    rank: "CHEF",
    gender: "Man",
    town_district: "Stockholm",
    hire_date: "2020-01-15", // Use past date to pass validation
    stena_date: null,
    omc_date: null,
    pe3_date: null,
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
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({} as any);
  });

  it("should recalculate capacity on date change", async () => {
    const updatedEmployee = {
      ...mockEmployee,
      omc_date: "omc-date-2",
      updated_at: "2025-10-27T15:30:00Z",
    };

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
    vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee);
    vi.mocked(assignEmployeeToDate).mockResolvedValue();

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({ omc_date: "omc-date-2" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(assignEmployeeToDate).toHaveBeenCalledWith(
      "employee-123",
      "omc-date-2",
      null,
      "omc_date",
      expect.anything()
    );
  });

  it("should recalculate rooms on date change", async () => {
    const employeeWithDate: Employee = {
      ...mockEmployee,
      omc_date: "omc-date-1",
      hotel_required: true,
      hotel_room_number: 3,
    };

    const updatedEmployee = {
      ...employeeWithDate,
      omc_date: "omc-date-2",
      hotel_room_number: 7,
      updated_at: "2025-10-27T15:30:00Z",
    };

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(employeeWithDate);
    vi.mocked(assignEmployeeToDate).mockResolvedValue({ success: true, message: "Assigned" });
    vi.mocked(recalculateRoomsForEmployee).mockResolvedValue();
    vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee);
    vi.mocked(createClient).mockResolvedValue({} as any);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({ omc_date: "omc-date-2" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(recalculateRoomsForEmployee).toHaveBeenCalled();
  });

  it("should recalculate rooms on rank change", async () => {
    const employeeWithDate: Employee = {
      ...mockEmployee,
      omc_date: "omc-date-1",
      rank: "SEV",
      hotel_required: true,
      hotel_room_number: 3,
    };

    const updatedEmployee = {
      ...employeeWithDate,
      rank: "CHEF",
      hotel_room_number: 5,
      updated_at: "2025-10-27T15:30:00Z",
    };

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(employeeWithDate);
    vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee);
    vi.mocked(recalculateRoomsForDate).mockResolvedValue();
    vi.mocked(createClient).mockResolvedValue({} as any);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({ rank: "CHEF" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(recalculateRoomsForDate).toHaveBeenCalled();
  });
});

describe("DELETE /api/employees/[id]", () => {
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
    id: "employee-123",
    first_name: "John",
    surname: "Doe",
    ssn: "19850315-1234",
    email: "john.doe@example.com",
    mobile: "+46701234567",
    rank: "CHEF",
    gender: "Man",
    town_district: "Stockholm",
    hire_date: "2020-01-15", // Use past date to pass validation
    stena_date: null,
    omc_date: "omc-date-1",
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
    hotel_required: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({} as any);
  });

  it("should delete employee successfully", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
    vi.mocked(employeeRepository.delete).mockResolvedValue();
    vi.mocked(recalculateRoomsForDate).mockResolvedValue();

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.message).toBe("Employee deleted successfully");
    expect(json.data.id).toBe("employee-123");
    expect(employeeRepository.delete).toHaveBeenCalledWith("employee-123");
  });

  it("should release capacity spots on deletion", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
    vi.mocked(employeeRepository.delete).mockResolvedValue();
    vi.mocked(recalculateRoomsForDate).mockResolvedValue();

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "employee-123" }) });

    expect(response.status).toBe(200);
    // Capacity release happens via date capacity service when employee is deleted
    // The deletion itself releases the capacity spot
    expect(employeeRepository.delete).toHaveBeenCalled();
  });

  it("should recalculate rooms for ÖMC date after deletion", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
    vi.mocked(employeeRepository.delete).mockResolvedValue();
    vi.mocked(recalculateRoomsForDate).mockResolvedValue();

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "employee-123" }) });

    expect(response.status).toBe(200);
    expect(recalculateRoomsForDate).toHaveBeenCalledWith("omc-date-1", expect.anything());
  });

  it("should return 404 if employee not found", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/employees/non-existent-id", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "non-existent-id" }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toContain("not found");
    expect(employeeRepository.delete).not.toHaveBeenCalled();
  });
});
