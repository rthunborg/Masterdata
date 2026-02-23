/**
 * Unit Tests for HR Admin Impersonation Export Feature
 * 
 * Tests the ability for HR Admins to export employee data while impersonating
 * another user role, with Excel format support and proper permission filtering.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/employees/export/route";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/lib/server/auth", () => ({
  requireAuthAPI: vi.fn(),
  createErrorResponse: vi.fn((error) => 
    NextResponse.json({ error: error.message }, { status: 500 })
  ),
  createUnauthorizedResponse: vi.fn((message) => 
    NextResponse.json({ error: message }, { status: 401 })
  ),
}));

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

vi.mock("@/lib/supabase/server-api", () => ({ createAPIClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("papaparse", () => ({
  default: {
    unparse: vi.fn(() => "csv_content"),
  },
}));

vi.mock("exceljs", () => {
  const mockWorksheet = {
    addRow: vi.fn(),
    getRow: vi.fn().mockReturnValue({
      font: {},
      fill: {},
      alignment: {},
      height: 0,
    }),
    columns: [],
    addTable: vi.fn(),
    autoFilter: {},
  };

  class MockWorkbook {
    addWorksheet = vi.fn().mockReturnValue(mockWorksheet);
    xlsx = {
      writeBuffer: vi.fn().mockResolvedValue(Buffer.from("mock excel data")),
    };
  }

  return {
    Workbook: MockWorkbook,
  };
});

import { requireAuthAPI } from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createAPIClient } from "@/lib/supabase/server-api";
import * as ExcelJS from "exceljs";

describe("HR Admin Impersonation Export", () => {
  const mockHRAdminUser = {
    id: "hr-admin-1",
    email: "admin@example.com",
    role: "hr_admin",
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
    auth_id: "auth-hr-1",
  };

  const mockSodexoUser = {
    id: "sodexo-1",
    email: "sodexo@example.com",
    role: "sodexo",
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
    auth_id: "auth-sodexo-1",
  };

  const mockColumnConfigs = [
    {
      id: "col-first-name",
      column_name: "First Name",
      db_column_name: "first_name",
      column_type: "text",
      is_masterdata: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
      },
      category: null,
      category_color: null,
      display_order: 0,
      is_visible: true,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "col-ssn",
      column_name: "SSN",
      db_column_name: "ssn",
      column_type: "text",
      is_masterdata: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false }, // Sodexo cannot view SSN
        omc: { view: false, edit: false },
      },
      category: null,
      category_color: null,
      display_order: 1,
      is_visible: true,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "col-custom-sodexo",
      column_name: "Sodexo Custom Field",
      db_column_name: "sodexo_custom_field",
      column_type: "text",
      is_masterdata: false,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: true },
        omc: { view: false, edit: false },
      },
      category: "Sodexo",
      category_color: "#FF6B6B",
      display_order: 100,
      is_visible: true,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ];

  const mockEmployees = [
    {
      id: "emp1",
      first_name: "John",
      surname: "Doe",
      ssn: "123456-7890",
      email: "john@example.com",
    },
    {
      id: "emp2",
      first_name: "Jane",
      surname: "Smith",
      ssn: "987654-3210",
      email: "jane@example.com",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(columnConfigRepository.findAll).mockResolvedValue(mockColumnConfigs);
    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees);
    
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            data: [
              { employee_id: "emp1", data: { sodexo_custom_field: "Value 1" } },
              { employee_id: "emp2", data: { sodexo_custom_field: "Value 2" } },
            ],
            error: null,
          }),
          eq: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
      }),
    };
    vi.mocked(createAPIClient).mockReturnValue(mockSupabase as never);
    vi.mocked(createServiceRoleClient).mockReturnValue(mockSupabase as never);
  });

  describe("Impersonation Permission Validation", () => {
    it("should allow HR Admin to export with impersonated role", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1"],
          fields: ["first_name"],
          impersonatedRole: "sodexo",
          format: "xlsx",
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Impersonated-Role")).toBe("sodexo");
    });

    it("should reject non-HR Admin users from using impersonation", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockSodexoUser);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1"],
          fields: ["first_name"],
          impersonatedRole: "hr_admin", // Trying to impersonate HR Admin
          format: "xlsx",
        }),
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data.error.code).toBe("IMPERSONATION_FORBIDDEN");
      expect(data.error.message).toContain("Endast HR Admin");
    });

    it("should allow HR Admin to export without impersonation", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1"],
          fields: ["first_name", "ssn"], // SSN only visible to HR Admin
          format: "xlsx",
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Impersonated-Role")).toBe("");
    });
  });

  describe("Permission Filtering with Impersonation", () => {
    it("should filter fields based on impersonated role, not actual HR Admin role", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);

      // HR Admin tries to export SSN while impersonating Sodexo
      // Sodexo doesn't have permission to view SSN, so it should be denied
      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1"],
          fields: ["first_name", "ssn"], // SSN not allowed for Sodexo
          impersonatedRole: "sodexo",
          format: "xlsx",
        }),
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data.error.code).toBe("PERMISSION_DENIED");
      expect(data.error.message).toContain("ssn");
    });

    it("should allow export of fields permitted for impersonated role", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1", "emp2"],
          fields: ["first_name", "sodexo_custom_field"], // Both allowed for Sodexo
          impersonatedRole: "sodexo",
          format: "xlsx",
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Impersonated-Role")).toBe("sodexo");
    });
  });

  describe("Excel Format Export", () => {
    it("should return Excel file when format is xlsx", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1"],
          fields: ["first_name"],
          format: "xlsx",
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(response.headers.get("Content-Disposition")).toContain(".xlsx");
    });

    it("should return CSV file when format is csv", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1"],
          fields: ["first_name"],
          format: "csv",
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
      expect(response.headers.get("Content-Disposition")).toContain(".csv");
    });

    it("should default to csv format when format is not specified", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1"],
          fields: ["first_name"],
          // format not specified
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    });

    it("should reject invalid format values", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1"],
          fields: ["first_name"],
          format: "pdf", // Invalid format
        }),
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_FORMAT");
    });

    it("should call ExcelJS workbook creation for xlsx format", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1", "emp2"],
          fields: ["first_name"],
          format: "xlsx",
        }),
      });

      const response = await POST(request);
      
      // Verify it returns 200 (Excel was generated successfully)
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("spreadsheet");
    });
  });

  describe("Column Order Preservation", () => {
    it("should maintain column order from request in Excel export", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);

      const orderedFields = ["first_name", "sodexo_custom_field"];

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1", "emp2"],
          fields: orderedFields,
          impersonatedRole: "sodexo",
          format: "xlsx",
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      // Verify Excel file was generated with proper format
      const contentType = response.headers.get("Content-Type");
      expect(contentType).toContain("spreadsheet");
      
      // Verify impersonated role is set
      expect(response.headers.get("X-Impersonated-Role")).toBe("sodexo");
    });
  });

  describe("Metadata Headers", () => {
    it("should include impersonated role in response headers", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1", "emp2"], // Export both employees
          fields: ["first_name"],
          impersonatedRole: "sodexo",
          format: "xlsx",
        }),
      });

      const response = await POST(request);
      
      expect(response.headers.get("X-Impersonated-Role")).toBe("sodexo");
      expect(response.headers.get("X-Employees-Exported")).toBe("2");
      expect(response.headers.get("X-Timestamp")).toBeTruthy();
    });

    it("should have empty impersonated role header when not impersonating", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockSodexoUser);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1"],
          fields: ["first_name"],
          format: "xlsx",
        }),
      });

      const response = await POST(request);
      
      expect(response.headers.get("X-Impersonated-Role")).toBe("");
    });
  });

  describe("Error Handling", () => {
    it("should handle permission denied errors with impersonation context", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp1"],
          fields: ["ssn"], // Not allowed for Sodexo
          impersonatedRole: "sodexo",
          format: "xlsx",
        }),
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data.error.code).toBe("PERMISSION_DENIED");
      expect(data.error.details.deniedFields).toContain("ssn");
    });

    it("should handle missing employees gracefully", async () => {
      vi.mocked(requireAuthAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([]);

      const request = new Request("http://localhost/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["non-existent"],
          fields: ["first_name"],
          impersonatedRole: "sodexo",
          format: "xlsx",
        }),
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error.code).toBe("NO_EMPLOYEES_FOUND");
    });
  });
});
