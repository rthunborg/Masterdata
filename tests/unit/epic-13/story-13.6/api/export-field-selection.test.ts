import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/employees/export/route";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/lib/server/auth", () => ({
  requireAuthAPI: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "test@example.com",
    role: "hr_admin",
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
    auth_id: "auth-1",
  }),
  requireHRAdminAPI: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "test@example.com",
    role: "hr_admin",
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
    auth_id: "auth-1",
  }),
  createErrorResponse: vi.fn((error) => NextResponse.json({ error: error.message }, { status: 500 })),
}));

vi.mock("@/lib/server/repositories/employee-repository", () => ({
  employeeRepository: {
    findAll: vi.fn(),
  },
}));

vi.mock("@/lib/server/repositories/column-config-repository", () => ({
  columnConfigRepository: {
    findAll: vi.fn().mockResolvedValue([
      {
        id: "col-1",
        column_name: "First Name",
        db_column_name: "first_name",
        column_type: "text",
        is_masterdata: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
        },
        category: null,
        category_color: null,
        display_order: 0,
        is_visible: true,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      // Add mock for custom_field_1 (custom column)
      {
        id: "col-custom-1",
        column_name: "Custom Field 1",
        db_column_name: "custom_field_1",
        column_type: "text",
        is_masterdata: false,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
        },
        category: null,
        category_color: null,
        display_order: 100,
        is_visible: true,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ]),
  },
}));

vi.mock("@/lib/supabase/server-api", () => ({
  createAPIClient: vi.fn(() => ({
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
import { createAPIClient } from "@/lib/supabase/server-api";
// Mock Employee type locally to avoid import issues
interface Employee {
  id: string;
  first_name: string;
  surname?: string;
  email?: string;
  [key: string]: unknown;
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
    vi.mocked(createAPIClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createAPIClient>);

    const request = new Request("http://localhost/api/employees/export", {
      method: "POST",
      body: JSON.stringify({ 
        employeeIds: ["emp1", "emp2"], 
        fields: ["first_name", "custom_field_1"] 
      }),
    });

    const response = await POST(request);
    
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(Papa.unparse).toHaveBeenCalled();
    
    // Verify Papa.unparse was called with correct data
    // Note: Headers now use user-friendly column names from column_config (improvement)
    const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[], data: string[][] };
    expect(unparseCall.fields).toEqual(["First Name", "Custom Field 1"]);
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
    vi.mocked(createAPIClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createAPIClient>);

    const request = new Request("http://localhost/api/employees/export", {
      method: "POST",
      body: JSON.stringify({ 
        employeeIds: ["emp1"], 
        fields: ["first_name", "custom_field_1"] 
      }),
    });

    await POST(request);
    
    const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[], data: string[][] };
    expect(unparseCall.data).toEqual([
      ["John", ""], // custom_field_1 should be empty string
    ]);
  });
});
