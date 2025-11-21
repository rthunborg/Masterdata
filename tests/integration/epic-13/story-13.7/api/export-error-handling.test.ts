/**
 * Integration Tests for Export Error Handling
 * Story 13.7: Write Comprehensive Export Tests
 * 
 * Tests verify:
 * - API handles database errors gracefully
 * - API handles invalid request body
 * - API handles missing required fields
 * - API returns appropriate error messages
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/employees/export/route";
import { POST as POSTCrewReady } from "@/app/api/employees/export-crew-ready/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { UserRole } from "@/lib/types/user";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse } from "@/lib/server/auth";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");
vi.mock("@/lib/supabase/server");
vi.mock("papaparse");

describe("Story 13.7: Export Error Handling Integration", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock createErrorResponse to return a proper Response
    vi.mocked(createErrorResponse).mockImplementation((error) => {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        { status: 500 }
      ) as never;
    });
  });

  describe("API handles database errors gracefully", () => {
    it("should handle database error when fetching employees", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockRejectedValue(new Error("Database connection failed"));

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: ["first_name"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(createErrorResponse).toHaveBeenCalled();
    });

    /**
     * Test scenario: Custom data fetch fails but employee data is available
     * This verifies graceful degradation - if custom column data cannot be
     * fetched, the export should still succeed with masterdata fields only.
     * This ensures export functionality is resilient to partial data failures.
     */
    it("should handle database error when fetching custom data", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([
        { id: "emp-1", first_name: "John" } as any,
      ]);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            in: vi.fn().mockReturnValue({ data: null, error: { message: "Database error" } }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: ["first_name"],
        }),
      });

      // Should not throw, but handle error gracefully
      const response = await POST(request);
      
      // Should still return 200 if employee data is available
      // Custom data errors are logged but don't block export
      expect(response.status).toBe(200);
    });

    it("should handle database error in export-crew-ready", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockRejectedValue(new Error("Database connection failed"));

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: ["emp-1"] }),
      });

      const response = await POSTCrewReady(request);

      expect(response.status).toBe(500);
      expect(createErrorResponse).toHaveBeenCalled();
    });
  });

  describe("API handles invalid request body", () => {
    it("should handle malformed JSON in request body", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: "invalid json{",
      });

      // The request.json() will throw, which should be caught
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(createErrorResponse).toHaveBeenCalled();
    });

    it("should handle null request body", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: null as any,
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it("should handle request body with wrong data types", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: "not-an-array",
          fields: "not-an-array",
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("NO_EMPLOYEES_SELECTED");
    });
  });

  describe("API handles missing required fields", () => {
    it("should return error when employeeIds is missing", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          fields: ["first_name"],
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("NO_EMPLOYEES_SELECTED");
    });

    it("should return error when fields is missing", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("NO_FIELDS_SELECTED");
    });

    it("should return error when selectedEmployeeIds is missing in export-crew-ready", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POSTCrewReady(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("NO_EMPLOYEES_SELECTED");
    });
  });

  describe("API returns appropriate error messages", () => {
    it("should return descriptive error message for no employees selected", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: [],
          fields: ["first_name"],
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("NO_EMPLOYEES_SELECTED");
      expect(json.error.message).toBe("No employees selected. Please select employees to export.");
      expect(json.error.timestamp).toBeDefined();
    });

    it("should return descriptive error message for no fields selected", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: [],
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("NO_FIELDS_SELECTED");
      expect(json.error.message).toBe("No fields selected. Please select at least one field to export.");
      expect(json.error.timestamp).toBeDefined();
    });

    it("should return descriptive error message for no employees found", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-999"],
          fields: ["first_name"],
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error.code).toBe("NO_EMPLOYEES_FOUND");
      expect(json.error.message).toBe("No employees found matching the selected IDs.");
      expect(json.error.timestamp).toBeDefined();
    });

    it("should return descriptive error message for no eligible employees in export-crew-ready", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: ["emp-1"] }),
      });

      const response = await POSTCrewReady(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error.code).toBe("NO_ELIGIBLE_EMPLOYEES");
      expect(json.error.message).toContain("No selected employees found");
      expect(json.error.timestamp).toBeDefined();
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(new Error("Authentication required"));
      vi.mocked(createErrorResponse).mockReturnValue(
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

      const request = new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: ["emp-1"],
          fields: ["first_name"],
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error.code).toBe("UNAUTHORIZED");
    });
  });
});

