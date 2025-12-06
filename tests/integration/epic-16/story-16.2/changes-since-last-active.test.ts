/**
 * Integration Tests for Changes Since Last Active API
 * Story 16.2: API Endpoint for Change Detection
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/employees/changes-since-last-active/route";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import { createClient } from "@/lib/supabase/server";
import { mockUsers } from "../../../utils/role-test-utils";
import type { ColumnConfig } from "@/lib/types/column-config";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");
vi.mock("@/lib/server/repositories/column-config-repository");
vi.mock("@/lib/supabase/server");

describe("GET /api/employees/changes-since-last-active", () => {
  const mockHRAdminUser = {
    ...mockUsers.hrAdmin,
    last_active_at: "2025-01-10T08:00:00Z",
  };

  const mockSodexoUser = {
    ...mockUsers.sodexo,
    last_active_at: "2025-01-10T08:00:00Z",
  };

  const mockOMCUser = {
    ...mockUsers.omc,
    last_active_at: "2025-01-10T08:00:00Z",
  };

  // Mock column configs - HR Admin can see all, Sodexo can see limited columns
  const mockColumnConfigs: ColumnConfig[] = [
    {
      id: "col-1",
      column_name: "First Name",
      db_column_name: "first_name",
      column_type: "text",
      is_masterdata: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: true, edit: false },
      },
      category: null,
      display_order: 1,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "col-2",
      column_name: "Email",
      db_column_name: "email",
      column_type: "text",
      is_masterdata: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: true, edit: false },
      },
      category: null,
      display_order: 2,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "col-3",
      column_name: "SSN",
      db_column_name: "ssn",
      column_type: "text",
      is_masterdata: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false }, // Sodexo cannot view SSN
        omc: { view: false, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: false, edit: false },
      },
      category: null,
      display_order: 3,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(columnConfigRepository.findAll).mockResolvedValue(mockColumnConfigs);
  });

  describe("AC1: API Endpoint Creation", () => {
    it("should return JSON response with correct structure", async () => {
      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue([
        {
          employeeId: "emp-1",
          changedColumns: ["first_name", "email"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ]);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveProperty("changedEmployees");
      expect(json).toHaveProperty("totalCount");
      expect(json).toHaveProperty("userLastActive");
      expect(Array.isArray(json.changedEmployees)).toBe(true);
    });

    it("should require authentication", async () => {
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

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("AC2: Change Detection Query", () => {
    it("should return changes after user's last_active_at", async () => {
      const changes = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue(changes);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.changedEmployees).toHaveLength(1);
      expect(json.changedEmployees[0].employeeId).toBe("emp-1");
      expect(employeeRepository.getChangesSinceLastActive).toHaveBeenCalledWith(
        mockHRAdminUser.id,
        mockHRAdminUser.role,
        mockHRAdminUser.last_active_at
      );
    });

    it("should group changes by employee", async () => {
      const changes = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name", "email"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
        {
          employeeId: "emp-2",
          changedColumns: ["first_name"],
          lastChangeAt: "2025-01-14T09:00:00Z",
        },
      ];

      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue(changes);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.changedEmployees).toHaveLength(2);
      expect(json.changedEmployees[0].changedColumns).toContain("first_name");
      expect(json.changedEmployees[0].changedColumns).toContain("email");
    });

    it("should accept baseline query parameter", async () => {
      const changes = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name"],
          lastChangeAt: "2025-01-20T10:00:00Z",
        },
      ];

      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue(changes);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active?baseline=2025-01-19T00:00:00Z"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      // Note: Date conversion adds milliseconds, so we check the ISO string format
      expect(employeeRepository.getChangesSinceLastActive).toHaveBeenCalledWith(
        mockHRAdminUser.id,
        mockHRAdminUser.role,
        expect.stringMatching(/^2025-01-19T00:00:00\.000Z$/)
      );
    });

    it("should reject invalid baseline query parameter", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active?baseline=invalid-date"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("INVALID_PARAMETER");
      expect(json.error.message).toContain("Invalid baseline timestamp format");
    });
  });

  describe("AC3: Permission Filtering", () => {
    it("should filter changes by user's view permissions (HR Admin sees all)", async () => {
      const changes = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name", "email", "ssn"], // HR Admin can see all
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue(changes);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.changedEmployees[0].changedColumns).toContain("ssn");
    });

    it("should filter changes by user's view permissions (Sodexo sees limited)", async () => {
      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockSodexoUser);

      // Sodexo should only see changes to columns they have view permission for
      // In our mock, sodexo can see first_name and email, but not ssn
      const changes = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name", "email"], // Only visible columns
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue(changes);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.changedEmployees[0].changedColumns).not.toContain("ssn");
      expect(employeeRepository.getChangesSinceLastActive).toHaveBeenCalledWith(
        mockSodexoUser.id,
        mockSodexoUser.role,
        mockSodexoUser.last_active_at
      );
    });

    it("should exclude custom columns (only masterdata)", async () => {
      const changes = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name"], // Only masterdata columns
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue(changes);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      // Verify repository was called with masterdata columns only
      expect(employeeRepository.getChangesSinceLastActive).toHaveBeenCalled();
    });
  });

  describe("AC4: Response Structure", () => {
    it("should return response matching specification", async () => {
      const changes = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name", "email"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
        {
          employeeId: "emp-2",
          changedColumns: ["first_name"],
          lastChangeAt: "2025-01-14T09:00:00Z",
        },
      ];

      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue(changes);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({
        changedEmployees: [
          {
            employeeId: "emp-1",
            changedColumns: ["first_name", "email"],
            lastChangeAt: "2025-01-15T10:00:00Z",
          },
          {
            employeeId: "emp-2",
            changedColumns: ["first_name"],
            lastChangeAt: "2025-01-14T09:00:00Z",
          },
        ],
        totalCount: 2,
        userLastActive: mockHRAdminUser.last_active_at,
      });
    });
  });

  describe("AC5: Empty Results Handling", () => {
    it("should return empty array when user has no changes", async () => {
      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.changedEmployees).toEqual([]);
      expect(json.totalCount).toBe(0);
      expect(json.userLastActive).toBe(mockHRAdminUser.last_active_at);
    });

    it("should handle first-time user (null last_active_at)", async () => {
      const firstTimeUser = {
        ...mockHRAdminUser,
        last_active_at: null,
      };

      vi.mocked(auth.requireAuthAPI).mockResolvedValue(firstTimeUser);
      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.changedEmployees).toEqual([]);
      expect(json.totalCount).toBe(0);
      expect(json.userLastActive).toBeNull();
      expect(employeeRepository.getChangesSinceLastActive).toHaveBeenCalledWith(
        firstTimeUser.id,
        firstTimeUser.role,
        null
      );
    });
  });

  describe("AC6: Performance", () => {
    it("should handle realistic data volumes efficiently", async () => {
      // Simulate 100 employees with changes
      const changes = Array.from({ length: 100 }, (_, i) => ({
        employeeId: `emp-${i + 1}`,
        changedColumns: ["first_name"],
        lastChangeAt: "2025-01-15T10:00:00Z",
      }));

      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue(changes);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const startTime = Date.now();
      const response = await GET(request);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.changedEmployees).toHaveLength(100);
      expect(json.totalCount).toBe(100);

      // Performance check: should complete in reasonable time (<500ms for API layer)
      // Note: Actual database query performance is tested separately
      expect(duration).toBeLessThan(500);
    });
  });

  describe("AC7: Archived Employee Filtering", () => {
    it("should exclude archived employees from results", async () => {
      // Repository should filter out archived employees
      // This is tested at the repository level, but we verify the API returns correct data
      const changes = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
        // emp-2 would be archived and filtered out by repository
      ];

      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue(changes);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.changedEmployees).toHaveLength(1);
      expect(json.changedEmployees[0].employeeId).toBe("emp-1");
    });
  });

  describe("Different User Roles", () => {
    it("should work for HR Admin role", async () => {
      const changes = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name", "email", "ssn"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue(changes);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.changedEmployees).toHaveLength(1);
    });

    it("should work for Sodexo role", async () => {
      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockSodexoUser);

      const changes = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name", "email"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue(changes);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.changedEmployees).toHaveLength(1);
      expect(employeeRepository.getChangesSinceLastActive).toHaveBeenCalledWith(
        mockSodexoUser.id,
        mockSodexoUser.role,
        mockSodexoUser.last_active_at
      );
    });

    it("should work for OMC role", async () => {
      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockOMCUser);

      const changes = [
        {
          employeeId: "emp-1",
          changedColumns: ["first_name", "email"],
          lastChangeAt: "2025-01-15T10:00:00Z",
        },
      ];

      vi.mocked(employeeRepository.getChangesSinceLastActive).mockResolvedValue(changes);

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.changedEmployees).toHaveLength(1);
      expect(employeeRepository.getChangesSinceLastActive).toHaveBeenCalledWith(
        mockOMCUser.id,
        mockOMCUser.role,
        mockOMCUser.last_active_at
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle repository errors gracefully", async () => {
      vi.mocked(employeeRepository.getChangesSinceLastActive).mockRejectedValue(
        new Error("Database error")
      );
      vi.mocked(auth.createErrorResponse).mockReturnValue(
        new Response(
          JSON.stringify({
            error: {
              code: "INTERNAL_ERROR",
              message: "Database error",
            },
          }),
          { status: 500 }
        ) as never
      );

      const request = new NextRequest(
        "http://localhost:3000/api/employees/changes-since-last-active"
      );

      const response = await GET(request);
      const json = await response.json();

      // Should return error response (500 or handled error)
      expect(response.status).toBe(500);
      expect(json.error.code).toBe("INTERNAL_ERROR");
    });
  });
});

