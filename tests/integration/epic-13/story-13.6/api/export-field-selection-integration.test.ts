import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/employees/export/route";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { createAPIClient } from "@/lib/supabase/server-api";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Papa from "papaparse";

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
  createErrorResponse: vi.fn((error) => new Response(JSON.stringify({ error: error.message }), { status: 500 })),
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
      {
        id: "col-2",
        column_name: "Surname",
        db_column_name: "surname",
        column_type: "text",
        is_masterdata: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
        },
        category: null,
        category_color: null,
        display_order: 1,
        is_visible: true,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      // Add mocks for custom columns used in tests
      {
        id: "col-custom-shoe",
        column_name: "Shoe Size",
        db_column_name: "shoe_size",
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
      {
        id: "col-custom-tshirt",
        column_name: "T-Shirt Size",
        db_column_name: "t_shirt_size",
        column_type: "text",
        is_masterdata: false,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
        },
        category: null,
        category_color: null,
        display_order: 101,
        is_visible: true,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "col-3",
        column_name: "Repayment Needed (ÖMC)",
        db_column_name: "repayment_needed_omc",
        column_type: "date",
        is_masterdata: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
        },
        category: null,
        category_color: null,
        display_order: 2,
        is_visible: true,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "col-4",
        column_name: "Termination Date",
        db_column_name: "termination_date",
        column_type: "date",
        is_masterdata: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
        },
        category: null,
        category_color: null,
        display_order: 3,
        is_visible: true,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "col-5",
        column_name: "Mobile",
        db_column_name: "mobile",
        column_type: "text",
        is_masterdata: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
        },
        category: null,
        category_color: null,
        display_order: 4,
        is_visible: true,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ]),
  },
}));

vi.mock("@/lib/supabase/server-api", () => ({
  createAPIClient: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("papaparse", () => ({
  default: {
    unparse: vi.fn(() => "csv_content"),
  },
}));

describe("Export Field Selection Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should correctly map masterdata and custom fields to CSV columns", async () => {
    // Setup mock data
    const mockEmployees = [
      { 
        id: "emp1", 
        first_name: "John", 
        surname: "Doe", 
        email: "john@example.com",
        hire_date: "2023-01-01",
        is_active: true
      },
    ];
     
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees as unknown as import("@/lib/types/employee").Employee[]);

    const mockCustomData = [
      { 
        employee_id: "emp1", 
        data: { 
          "shoe_size": "42", 
          "t_shirt_size": "L" 
        } 
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ data: [], error: null }),
          in: vi.fn().mockReturnValue({ data: mockCustomData, error: null }),
        }),
      }),
    };
     
    vi.mocked(createAPIClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createAPIClient>);
    vi.mocked(createServiceRoleClient).mockReturnValue(mockSupabase as never);

    // Execute request
    const request = new Request("http://localhost/api/employees/export", {
      method: "POST",
      body: JSON.stringify({ 
        employeeIds: ["emp1"], 
        fields: ["first_name", "surname", "shoe_size", "t_shirt_size"] 
      }),
    });

    const response = await POST(request);
    
    // Verify response
    expect(response.status).toBe(200);
    
    // Verify CSV generation
     
    const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[], data: string[][] };
    
    // Check headers (now uses user-friendly column names from column_config)
    expect(unparseCall.fields).toEqual(["First Name", "Surname", "Shoe Size", "T-Shirt Size"]);
    
    // Check data row
    expect(unparseCall.data[0]).toEqual(["John", "Doe", "42", "L"]);
  });

  it("should handle mixed field types (boolean, null, undefined)", async () => {
    const mockEmployees = [
      { 
        id: "emp1", 
        first_name: "John", 
        repayment_needed_omc: 'omc-date-uuid-123', // Story 19.14: Now stores UUID
        termination_date: null, // null
        // mobile is undefined
      },
    ];
     
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees as unknown as import("@/lib/types/employee").Employee[]);

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ data: [], error: null }),
          in: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
      }),
    };
     
    vi.mocked(createAPIClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createAPIClient>);
    vi.mocked(createServiceRoleClient).mockReturnValue(mockSupabase as never);

    const request = new Request("http://localhost/api/employees/export", {
      method: "POST",
      body: JSON.stringify({ 
        employeeIds: ["emp1"], 
        fields: ["first_name", "repayment_needed_omc", "termination_date", "mobile"] 
      }),
    });

    await POST(request);
    
     
    const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as { fields: string[], data: string[][] };
    
    // Check data row: first_name, repayment_needed_omc, termination_date, mobile
    // repayment_needed_omc is currently exported as-is (UUID) per route; only stena_date/omc_date/pe3_date are resolved.
    // null -> "", undefined -> ""
    expect(unparseCall.data[0]).toEqual(["John", "omc-date-uuid-123", "", ""]);
  });
});
