import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/employees/import/route";
import { NextRequest, NextResponse } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import type { Employee } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");

// Helper to create a mock NextRequest with FormData
function createRequestWithFormData(formData: FormData): NextRequest {
  const request = new NextRequest("http://localhost:3000/api/employees/import", {
    method: "POST",
  });
  
  // Mock the formData method to return our FormData
  // Also need to ensure File objects in the FormData have a text() method
  vi.spyOn(request, 'formData').mockResolvedValue(formData);
  
  return request;
}

// Helper to create a File object with text() method for testing
function createMockFile(content: string, filename: string, mimeType: string = "text/csv"): File {
  const blob = new Blob([content], { type: mimeType });
  const file = new File([blob], filename, { type: mimeType });
  
  // Ensure the text() method exists and works
  if (!file.text) {
    Object.defineProperty(file, 'text', {
      value: async () => content,
      writable: false
    });
  }
  
  return file;
}

describe("POST /api/employees/import", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should import employees successfully for HR Admin", async () => {
    const csvContent = `First Name,Surname,SSN,Email,Hire Date
John,Doe,19850315-1234,john@example.com,2025-01-15
Jane,Smith,19900520-5678,jane@example.com,2025-02-01`;

    const mockInsertedEmployees: Employee[] = [
      {
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "19850315-1234",
        email: "john@example.com",
        mobile: null,
        rank: null,
        gender: null,
        town_district: null,
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
        ssn: "19900520-5678",
        email: "jane@example.com",
        mobile: null,
        rank: null,
        gender: null,
        town_district: null,
        hire_date: "2025-02-01",
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.createMany).mockResolvedValue({
      inserted: mockInsertedEmployees,
      errors: [],
    });

    const formData = new FormData();
    formData.append(
      "file",
      createMockFile(csvContent, "employees.csv"),
    );

    const request = createRequestWithFormData(formData);

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.imported).toBe(2);
    expect(json.data.skipped).toBe(0);
    expect(json.data.errors).toEqual([]);
  });

  it("should handle duplicate SSN errors", async () => {
    const csvContent = `First Name,Surname,SSN,Email,Hire Date
John,Doe,19850315-1234,john@example.com,2025-01-15
Jane,Smith,19850315-1234,jane@example.com,2025-02-01`;

    const mockInsertedEmployees: Employee[] = [
      {
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "19850315-1234",
        email: "john@example.com",
        mobile: null,
        rank: null,
        gender: null,
        town_district: null,
        hire_date: "2025-01-15",
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.createMany).mockResolvedValue({
      inserted: mockInsertedEmployees,
      errors: [
        {
          row: 3,
          error: "Duplicate SSN: 19850315-1234",
          data: {
            first_name: "Jane",
            surname: "Smith",
            ssn: "19850315-1234",
            email: "jane@example.com",
            mobile: null,
            rank: null,
            gender: null,
            town_district: null,
            hire_date: "2025-02-01",
            is_terminated: false,
            is_archived: false,
            termination_date: null,
            termination_reason: null,
            comments: null,
          },
        },
      ],
    });

    const formData = new FormData();
    formData.append(
      "file",
      createMockFile(csvContent, "employees.csv"),
    );

    const request = createRequestWithFormData(formData);

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.imported).toBe(1);
    expect(json.data.skipped).toBe(1);
    expect(json.data.errors[0].error).toContain("Duplicate SSN");
  });

  it("should handle validation errors for missing required fields", async () => {
    const csvContent = `First Name,Surname,SSN,Email,Hire Date
John,Doe,,john@example.com,2025-01-15
Jane,Smith,19900520-5678,,`;

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.createMany).mockResolvedValue({
      inserted: [],
      errors: [],
    });

    const formData = new FormData();
    formData.append(
      "file",
      createMockFile(csvContent, "employees.csv"),
    );

    const request = createRequestWithFormData(formData);

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toContain("No valid employees found");
  });

  it("should handle invalid date format errors", async () => {
    const csvContent = `First Name,Surname,SSN,Email,Hire Date
John,Doe,19850315-1234,john@example.com,2025-13-45`;

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.createMany).mockResolvedValue({
      inserted: [],
      errors: [],
    });

    const formData = new FormData();
    formData.append(
      "file",
      createMockFile(csvContent, "employees.csv"),
    );

    const request = createRequestWithFormData(formData);

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 403 for non-HR Admin users", async () => {
    const csvContent = `First Name,Surname,SSN,Email,Hire Date
John,Doe,19850315-1234,john@example.com,2025-01-15`;

    vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(
      new Error("Insufficient permissions")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions",
          },
        },
        { status: 403 }
      )
    );

    const formData = new FormData();
    formData.append(
      "file",
      createMockFile(csvContent, "employees.csv"),
    );

    const request = createRequestWithFormData(formData);

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("should return 400 for missing file", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const formData = new FormData();

    const request = createRequestWithFormData(formData);

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toBe("No file provided");
  });

  it("should return 400 for non-CSV file", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["some text"], { type: "text/plain" }),
      "employees.txt"
    );

    const request = createRequestWithFormData(formData);

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toBe("File must be a CSV file");
  });

  it("should return 400 for empty CSV file", async () => {
    const csvContent = "";

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const formData = new FormData();
    formData.append(
      "file",
      createMockFile(csvContent, "employees.csv"),
    );

    const request = createRequestWithFormData(formData);

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toBe("CSV parsing error: Unable to auto-detect delimiting character; defaulted to ','");
  });

  it("should handle partial success scenario", async () => {
    const csvContent = `First Name,Surname,SSN,Email,Hire Date
John,Doe,19850315-1234,john@example.com,2025-01-15
Jane,Smith,19900520-5678,jane@example.com,2025-02-01
Bob,Johnson,invalid-ssn,bob@example.com,2025-03-01`;

    const mockInsertedEmployees: Employee[] = [
      {
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "19850315-1234",
        email: "john@example.com",
        mobile: null,
        rank: null,
        gender: null,
        town_district: null,
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
        ssn: "19900520-5678",
        email: "jane@example.com",
        mobile: null,
        rank: null,
        gender: null,
        town_district: null,
        hire_date: "2025-02-01",
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.createMany).mockResolvedValue({
      inserted: mockInsertedEmployees,
      errors: [],
    });

    const formData = new FormData();
    formData.append(
      "file",
      createMockFile(csvContent, "employees.csv"),
    );

    const request = createRequestWithFormData(formData);

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.imported).toBe(2);
    expect(json.data.skipped).toBeGreaterThan(0);
  });
});
