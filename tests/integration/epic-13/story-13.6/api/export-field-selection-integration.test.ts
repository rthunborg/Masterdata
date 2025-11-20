import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/employees/export/route";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { createClient } from "@/lib/supabase/server";
import Papa from "papaparse";

// Mock dependencies
vi.mock("@/lib/server/auth", () => ({
  requireHRAdminAPI: vi.fn().mockResolvedValue(undefined),
  createErrorResponse: vi.fn((error) => new Response(JSON.stringify({ error: error.message }), { status: 500 })),
}));

vi.mock("@/lib/server/repositories/employee-repository", () => ({
  employeeRepository: {
    findAll: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees as any);

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as any;
    
    // Check headers
    expect(unparseCall.fields).toEqual(["First Name", "Surname", "shoe_size", "t_shirt_size"]);
    
    // Check data row
    expect(unparseCall.data[0]).toEqual(["John", "Doe", "42", "L"]);
  });

  it("should handle mixed field types (boolean, null, undefined)", async () => {
    const mockEmployees = [
      { 
        id: "emp1", 
        first_name: "John", 
        repayment_needed_omc: true, // boolean
        termination_date: null, // null
        // mobile is undefined
      },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees as any);

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
        fields: ["first_name", "repayment_needed_omc", "termination_date", "mobile"] 
      }),
    });

    await POST(request);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unparseCall = vi.mocked(Papa.unparse).mock.calls[0][0] as any;
    
    // Check data row
    // boolean -> "Yes"/"No" (based on implementation)
    // null -> ""
    // undefined -> ""
    expect(unparseCall.data[0]).toEqual(["John", "Yes", "", ""]);
  });
});
