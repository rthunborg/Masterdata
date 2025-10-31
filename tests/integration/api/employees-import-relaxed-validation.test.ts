import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/employees/import/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { UserRole } from "@/lib/types/user";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");

// Helper to create a mock NextRequest with FormData
function createRequestWithFormData(formData: FormData): NextRequest {
  const request = new NextRequest("http://localhost:3000/api/employees/import", {
    method: "POST",
  });
  
  vi.spyOn(request, 'formData').mockResolvedValue(formData);
  
  return request;
}

// Helper to create a File object with text() method for testing
function createMockFile(content: string, filename: string, mimeType: string = "text/csv"): File {
  const blob = new Blob([content], { type: mimeType });
  const file = new File([blob], filename, { type: mimeType });
  
  if (!file.text) {
    Object.defineProperty(file, 'text', {
      value: async () => content,
      writable: false
    });
  }
  
  return file;
}

describe("POST /api/employees/import - Relaxed Validation", () => {
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
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
  });

  it("should accept employee with empty email", async () => {
    const csvContent = `First Name,Surname,SSN,Email,Rank,Hire Date
John,Doe,19850315-1234,,Manager,2025-01-15`;

    vi.mocked(employeeRepository.createMany).mockResolvedValue({
      inserted: [{
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "850315-1234",
        email: null,
        mobile: null,
        rank: "Manager",
        gender: null,
        town_district: null,
        hire_date: "2025-01-15",
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        comments: null,
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      }],
      errors: [],
    });

    const file = createMockFile(csvContent, "test.csv");
    const formData = new FormData();
    formData.append("file", file);

    const request = createRequestWithFormData(formData);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.imported).toBe(1);
    expect(body.data.skipped).toBe(0);
  });

  it("should reject employee with empty rank", async () => {
    const csvContent = `First Name,Surname,SSN,Email,Rank,Hire Date
John,Doe,19850315-1234,john@example.com,,2025-01-15`;

    const file = createMockFile(csvContent, "test.csv");
    const formData = new FormData();
    formData.append("file", file);

    const request = createRequestWithFormData(formData);
    const response = await POST(request);

    expect(response.status).toBe(400); // Returns 400 when no valid employees
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("No valid employees found in CSV");
    expect(body.error.details[0].error).toContain("Rank is required");
  });

  it("should reject employee with invalid email format", async () => {
    const csvContent = `First Name,Surname,SSN,Email,Rank,Hire Date
John,Doe,19850315-1234,invalid-email,Manager,2025-01-15`;

    const file = createMockFile(csvContent, "test.csv");
    const formData = new FormData();
    formData.append("file", file);

    const request = createRequestWithFormData(formData);
    const response = await POST(request);

    expect(response.status).toBe(400); // Returns 400 when no valid employees
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("No valid employees found in CSV");
    expect(body.error.details[0].error).toContain("Invalid email format");
  });

  it("should accept employee with only required fields", async () => {
    const csvContent = `First Name,Surname,SSN,Rank,Hire Date
John,Doe,19850315-1234,Manager,2025-01-15`;

    vi.mocked(employeeRepository.createMany).mockResolvedValue({
      inserted: [{
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "850315-1234",
        email: null,
        mobile: null,
        rank: "Manager",
        gender: null,
        town_district: null,
        hire_date: "2025-01-15",
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        comments: null,
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      }],
      errors: [],
    });

    const file = createMockFile(csvContent, "test.csv");
    const formData = new FormData();
    formData.append("file", file);

    const request = createRequestWithFormData(formData);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.imported).toBe(1);
    expect(body.data.skipped).toBe(0);
  });

  it("should accept employee with mixed empty and populated optional fields", async () => {
    const csvContent = `First Name,Surname,SSN,Email,Mobile,Gender,Town District,Rank,Hire Date,Comments
Jane,Smith,19900520-5678,,+46709876543,,Stockholm,Manager,2024-06-01,`;

    vi.mocked(employeeRepository.createMany).mockResolvedValue({
      inserted: [{
        id: "emp-1",
        first_name: "Jane",
        surname: "Smith",
        ssn: "900520-5678",
        email: null,
        mobile: "+46709876543",
        rank: "Manager",
        gender: null,
        town_district: "Stockholm",
        hire_date: "2024-06-01",
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        comments: null,
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      }],
      errors: [],
    });

    const file = createMockFile(csvContent, "test.csv");
    const formData = new FormData();
    formData.append("file", file);

    const request = createRequestWithFormData(formData);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.imported).toBe(1);
    expect(body.data.skipped).toBe(0);
  });

  it("should accept employees with empty date fields", async () => {
    const csvContent = `First Name,Surname,SSN,Email,Rank,Hire Date,Stena Date,ÖMC Date,PE3 Date
John,Doe,19850315-1234,john@example.com,Manager,2025-01-15,,,`;

    vi.mocked(employeeRepository.createMany).mockResolvedValue({
      inserted: [{
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "850315-1234",
        email: "john@example.com",
        mobile: null,
        rank: "Manager",
        gender: null,
        town_district: null,
        hire_date: "2025-01-15",
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        comments: null,
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      }],
      errors: [],
    });

    const file = createMockFile(csvContent, "test.csv");
    const formData = new FormData();
    formData.append("file", file);

    const request = createRequestWithFormData(formData);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.imported).toBe(1);
    expect(body.data.skipped).toBe(0);
  });
});
