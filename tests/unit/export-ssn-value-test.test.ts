/**
 * Test to verify SSN values are correctly populated in Excel exports
 * 
 * This test verifies the complete flow:
 * 1. Column config has db_column_name: 'ssn' (matches Employee property)
 * 2. Employee has property: ssn
 * 3. Value is directly accessible (no mapping needed)
 * 4. Value is correctly extracted and included in export
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/employees/export/route";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as ExcelJS from "exceljs";

// Mock auth
vi.mock("@/lib/server/auth", () => ({
  requireAuthAPI: vi.fn(),
  createErrorResponse: vi.fn((error) => 
    NextResponse.json({ error: error.message }, { status: 500 })
  ),
  createUnauthorizedResponse: vi.fn((message) => 
    NextResponse.json({ error: message }, { status: 401 })
  ),
}));

// Mock repositories
vi.mock("@/lib/server/repositories/employee-repository", () => ({
  employeeRepository: {
    findAll: vi.fn(),
  },
}));

vi.mock("@/lib/server/repositories/column-config-repository", () => ({
  columnConfigRepository: {
    findAll: vi.fn(),
  },
}));

// Mock Supabase
type MockSupabaseQueryChain = {
  select: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
};

const mockSupabaseClient = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock("papaparse", () => ({
  default: {
    unparse: vi.fn(() => "csv_content"),
  },
}));

// Don't mock ExcelJS - we want to test the actual Excel generation
// Just import it normally

import { requireAuthAPI } from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";

describe("Export SSN Value Test", () => {
  const mockHRAdmin = {
    id: "hr-admin-1",
    email: "admin@example.com",
    role: "hr_admin",
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
    auth_id: "auth-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should correctly include SSN values in Excel export", async () => {
    // Mock auth
    vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdmin);

    // Mock Supabase custom_data query
    const mockQueryChain: MockSupabaseQueryChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };
    vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQueryChain as never);

    // Mock employee with SSN
    const mockEmployee = {
      id: "emp-1",
      first_name: "John",
      surname: "Doe",
      ssn: "850101-1234", // ✅ Employee has ssn property
      email: "john@example.com",
      mobile: "0701234567",
      rank: "SEV" as const,
      gender: "Man" as const,
      town_district: null,
      hire_date: "2025-01-01",
      stena_date: null,
      omc_date: null,
      pe3_date: null,
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      archived_at: null,
      is_anonymized: false,
      repayment_needed_omc: null,
      repayment_needed_pe3: null,
      special_diet: false,
      diet_details: null,
      comments: null,
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
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    vi.mocked(employeeRepository.findAll).mockResolvedValue([mockEmployee]);

    // Mock column config
    const mockColumns = [
      {
        id: "col-fname",
        column_name: "First Name",
        db_column_name: "first_name",
        column_type: "text" as const,
        is_masterdata: true,
        category: null,
        category_color: null,
        is_visible: true,
        is_checklist_item: false,
        display_order: 1,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          omc: { view: true, edit: false },
        },
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "col-ssn",
        column_name: "Social Security No.",
        db_column_name: "ssn", // ✅ Matches Employee property
        column_type: "text" as const,
        is_masterdata: true,
        category: null,
        category_color: null,
        is_visible: true,
        is_checklist_item: false,
        display_order: 2,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          omc: { view: true, edit: false },
        },
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    vi.mocked(columnConfigRepository.findAll).mockResolvedValue(mockColumns);

    // Create request
    const request = new NextRequest("http://localhost:3000/api/employees/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employeeIds: ["emp-1"],
        fields: ["first_name", "ssn"],
        format: "xlsx",
      }),
    });

    // Call API
    const response = await POST(request);

    // Verify response
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Read the Excel file to verify contents
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.getWorksheet('Employees');
    expect(worksheet).toBeDefined();

    // Get header row
    const headerRow = worksheet?.getRow(1);
    const headers = headerRow?.values as string[];
    
    console.log("Headers:", headers);
    
    // Verify headers (headers[0] is undefined, actual headers start at index 1)
    expect(headers[1]).toBe("First Name");
    expect(headers[2]).toBe("Social Security No.");

    // Get data row
    const dataRow = worksheet?.getRow(2);
    const values = dataRow?.values as string[];
    
    console.log("Data row values:", values);
    
    // ✅ CRITICAL TEST: Verify SSN value is present
    expect(values[1]).toBe("John");
    expect(values[2]).toBe("850101-1234"); // ✅ SSN should have the actual value, not empty!
  });

  it("should handle multiple employees with different SSN values", async () => {
    vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdmin);

    // Mock Supabase custom_data query
    const mockQueryChain2: MockSupabaseQueryChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };
    vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQueryChain2 as never);

    const mockEmployees = [
      {
        id: "emp-1",
        first_name: "Alice",
        surname: "Smith",
        ssn: "900202-5678",
        email: "alice@example.com",
        mobile: null,
        rank: "SEV" as const,
        gender: "Woman" as const,
        town_district: null,
        hire_date: "2025-01-01",
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        archived_at: null,
        is_anonymized: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        special_diet: false,
        diet_details: null,
        comments: null,
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
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "emp-2",
        first_name: "Bob",
        surname: "Johnson",
        ssn: "880303-9012",
        email: "bob@example.com",
        mobile: null,
        rank: "CHEF" as const,
        gender: "Man" as const,
        town_district: null,
        hire_date: "2025-01-02",
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        archived_at: null,
        is_anonymized: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        special_diet: false,
        diet_details: null,
        comments: null,
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
        created_at: "2025-01-02T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
      },
    ];

    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees);

    const mockColumns = [
      {
        id: "col-ssn",
        column_name: "Social Security No.",
        db_column_name: "ssn",
        column_type: "text" as const,
        is_masterdata: true,
        category: null,
        category_color: null,
        is_visible: true,
        is_checklist_item: false,
        display_order: 1,
        role_permissions: {
          hr_admin: { view: true, edit: true },
        },
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    vi.mocked(columnConfigRepository.findAll).mockResolvedValue(mockColumns);

    const request = new NextRequest("http://localhost:3000/api/employees/export", {
      method: "POST",
      body: JSON.stringify({
        employeeIds: ["emp-1", "emp-2"],
        fields: ["ssn"],
        format: "xlsx",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Read Excel file
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.getWorksheet('Employees');

    // Verify both SSN values are present
    const row2 = worksheet?.getRow(2);
    const row3 = worksheet?.getRow(3);
    
    const values2 = row2?.values as string[];
    const values3 = row3?.values as string[];
    
    console.log("Row 2 SSN:", values2[1]);
    console.log("Row 3 SSN:", values3[1]);
    
    // Both rows should have their respective SSN values
    expect(values2[1]).toBe("900202-5678");
    expect(values3[1]).toBe("880303-9012");
  });
});
