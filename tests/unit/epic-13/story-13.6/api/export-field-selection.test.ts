import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/employees/export/route";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/lib/server/auth", () => ({
  requireHRAdminAPI: vi.fn().mockResolvedValue(undefined),
  createErrorResponse: vi.fn((error) => NextResponse.json({ error: error.message }, { status: 500 })),
}));

vi.mock("@/lib/server/repositories/employee-repository", () => ({
  employeeRepository: {
    findAll: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ data: [], error: null })),
        in: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
  })),
}));

vi.mock("papaparse", () => ({
  default: {
    unparse: vi.fn(() => "csv_content"),
  },
}));

import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
// Mock Employee type locally to avoid import issues
interface Employee {
  id: string;
  first_name: string;
  surname?: string;
  email?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

describe("POST /api/employees/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if employeeIds is missing or empty", async () => {
    const request = new Request("http://localhost/api/employees/export", {
      method: "POST",
      body: JSON.stringify({ employeeIds: [], fields: ["first_name"] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("NO_EMPLOYEES_SELECTED");
  });

  it("returns 400 if fields is missing or empty", async () => {
    const request = new Request("http://localhost/api/employees/export", {
      method: "POST",
      body: JSON.stringify({ employeeIds: ["emp1"], fields: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("NO_FIELDS_SELECTED");
  });

  it("returns 404 if no employees found matching IDs", async () => {
    vi.mocked(employeeRepository.findAll).mockResolvedValue([]);

    const request = new Request("http://localhost/api/employees/export", {
      method: "POST",
      body: JSON.stringify({ employeeIds: ["emp1"], fields: ["first_name"] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NO_EMPLOYEES_FOUND");
  });

  it("generates CSV with selected fields for selected employees", async () => {
    const mockEmployees = [
      { id: "emp1", first_name: "John", surname: "Doe", email: "john@example.com" },
      { id: "emp2", first_name: "Jane", surname: "Smith", email: "jane@example.com" },
    ] as Employee[];
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees);

    const mockCustomData = [
      { employee_id: "emp1", data: { custom_field_1: "Value 1" } },
      { employee_id: "emp2", data: { custom_field_1: "Value 2" } },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ data: [], error: null }), // important_dates
          in: vi.fn().mockReturnValue({ data: mockCustomData, error: null }), // custom_data
        }),
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const request = new Request("http://localhost/api/employees/export", {
      method: "POST",
      body: JSON.stringify({ 
        employeeIds: ["emp1", "emp2"], 
        fields: ["first_name", "custom_field_1"] 
      }),
    });

    const response = await POST(request);
    
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(Papa.unparse).toHaveBeenCalled();
    
    // Verify Papa.unparse was called with correct data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as any;
    expect(unparseCall.fields).toEqual(["First Name", "custom_field_1"]);
    expect(unparseCall.data).toEqual([
      ["John", "Value 1"],
      ["Jane", "Value 2"],
    ]);
  });

  it("handles missing custom data gracefully", async () => {
    const mockEmployees = [
      { id: "emp1", first_name: "John" },
    ] as Employee[];
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees);

    // Mock empty custom data
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ data: [], error: null }),
          in: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const request = new Request("http://localhost/api/employees/export", {
      method: "POST",
      body: JSON.stringify({ 
        employeeIds: ["emp1"], 
        fields: ["first_name", "custom_field_1"] 
      }),
    });

    await POST(request);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as any;
    expect(unparseCall.data).toEqual([
      ["John", ""], // custom_field_1 should be empty string
    ]);
  });
});
