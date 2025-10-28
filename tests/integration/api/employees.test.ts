import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "@/app/api/employees/route";
import { PATCH } from "@/app/api/employees/[id]/route";
import { POST as TERMINATE } from "@/app/api/employees/[id]/terminate/route";
import { POST as REACTIVATE } from "@/app/api/employees/[id]/reactivate/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import type { Employee, EmployeeFormData } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";

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
      gender: "Male",
      town_district: "Stockholm",
      hire_date: "2025-01-15",
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      comments: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "emp-2",
      first_name: "Jane",
      surname: "Smith",
      ssn: "234567-8901",
      email: "jane@example.com",
      mobile: null,
      rank: null,
      gender: "Female",
      town_district: null,
      hire_date: "2020-01-01",
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      comments: null,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return employee list for HR Admin", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
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
    });
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

    const request = new NextRequest("http://localhost:3000/api/employees");
    const response = await GET(request);
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

    const request = new NextRequest("http://localhost:3000/api/employees");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("should respect includeArchived query parameter", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees);

    const request = new NextRequest(
      "http://localhost:3000/api/employees?includeArchived=true"
    );
    await GET(request);

    expect(employeeRepository.findAll).toHaveBeenCalledWith({
      includeArchived: true,
      includeTerminated: false,
    });
  });

  it("should respect includeTerminated query parameter", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees);

    const request = new NextRequest(
      "http://localhost:3000/api/employees?includeTerminated=true"
    );
    await GET(request);

    expect(employeeRepository.findAll).toHaveBeenCalledWith({
      includeArchived: false,
      includeTerminated: true,
    });
  });

  it("should return empty array when no employees exist", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
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
  };

  const validEmployeeData: EmployeeFormData = {
    first_name: "Jane",
    surname: "Smith",
    ssn: "19900101-1234",
    email: "jane.smith@example.com",
    mobile: "+46701234567",
    rank: "CHEF",
    gender: "Female",
    town_district: "Gothenburg",
    hire_date: "2025-01-01",
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    comments: "New employee",
  };

  const mockCreatedEmployee: Employee = {
    id: "new-emp-123",
    ...validEmployeeData,
    created_at: "2025-10-27T12:00:00Z",
    updated_at: "2025-10-27T12:00:00Z",
  };

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
        ssn: validEmployeeData.ssn,
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
      hire_date: "2024-01-01",
    };

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(minimalData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data).toBeDefined();
    expect(employeeRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ...minimalData,
        mobile: null,
        rank: null,
        gender: null,
        town_district: null,
        comments: null,
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
  };

  const mockEmployee: Employee = {
    id: "employee-123",
    first_name: "John",
    surname: "Doe",
    ssn: "19850315-1234",
    email: "john.doe@example.com",
    mobile: "+46701234567",
    rank: "CHEF",
    gender: "Male",
    town_district: "Stockholm",
    hire_date: "2025-01-15",
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    comments: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update employee for HR Admin", async () => {
    const updatedEmployee = {
      ...mockEmployee,
      email: "updated@example.com",
      updated_at: "2025-10-27T15:30:00Z",
    };

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
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
      rank: "SEV",
      updated_at: "2025-10-27T15:30:00Z",
    };

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
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
      comments: null,
      updated_at: "2025-10-27T15:30:00Z",
    };

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
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
  };

  const mockEmployee: Employee = {
    id: "employee-123",
    first_name: "John",
    surname: "Doe",
    ssn: "123456-7890",
    email: "john@example.com",
    mobile: "+46701234567",
    rank: "SEV",
    gender: "Male",
    town_district: "Stockholm",
    hire_date: "2025-01-15",
    termination_date: "2025-10-26",
    termination_reason: "Voluntary resignation",
    is_terminated: true,
    is_archived: false,
    comments: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-10-27T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should terminate employee for HR Admin", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.terminate).mockResolvedValue(mockEmployee);

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
    expect(json.data.is_terminated).toBe(true);
    expect(json.data.termination_date).toBe("2025-10-26");
    expect(json.data.termination_reason).toBe("Voluntary resignation");
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
  };

  const mockEmployee: Employee = {
    id: "employee-123",
    first_name: "John",
    surname: "Doe",
    ssn: "123456-7890",
    email: "john@example.com",
    mobile: "+46701234567",
    rank: "SEV",
    gender: "Male",
    town_district: "Stockholm",
    hire_date: "2025-01-15",
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    comments: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-10-27T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reactivate employee for HR Admin", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.reactivate).mockResolvedValue(mockEmployee);

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
