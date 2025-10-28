import { describe, it, expect, beforeEach, vi } from "vitest";
import { employeeService } from "@/lib/services/employee-service";
import type { Employee, EmployeeFormData } from "@/lib/types/employee";

// Mock fetch globally
global.fetch = vi.fn();

describe("employeeService", () => {
  const mockEmployees: Employee[] = [
    {
      id: "emp-1",
      first_name: "John",
      surname: "Doe",
      ssn: "123456-7890",
      email: "john@example.com",
      mobile: "+46701234567",
      rank: "SEV",
      gender: "Male",
      town_district: "Stockholm",
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("should fetch all employees", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockEmployees,
          meta: { total: 1, filtered: 1 },
        }),
      } as Response);

      const result = await employeeService.getAll();

      expect(global.fetch).toHaveBeenCalledWith("/api/employees");
      expect(result).toEqual(mockEmployees);
    });

    it("should pass includeArchived filter", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockEmployees,
          meta: { total: 1, filtered: 1 },
        }),
      } as Response);

      await employeeService.getAll({ includeArchived: true });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/employees?includeArchived=true"
      );
    });

    it("should pass includeTerminated filter", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockEmployees,
          meta: { total: 1, filtered: 1 },
        }),
      } as Response);

      await employeeService.getAll({ includeTerminated: true });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/employees?includeTerminated=true"
      );
    });

    it("should pass both filters", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockEmployees,
          meta: { total: 1, filtered: 1 },
        }),
      } as Response);

      await employeeService.getAll({
        includeArchived: true,
        includeTerminated: true,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/employees?includeArchived=true&includeTerminated=true"
      );
    });

    it("should throw error on failed request", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: "Unauthorized" },
        }),
      } as Response);

      await expect(employeeService.getAll()).rejects.toThrow("Unauthorized");
    });

    it("should throw generic error when no error message", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(employeeService.getAll()).rejects.toThrow(
        "Failed to fetch employees"
      );
    });
  });

  describe("getById", () => {
    it("should fetch employee by id", async () => {
      const mockEmployee = mockEmployees[0];
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: mockEmployee,
        }),
      } as Response);

      const result = await employeeService.getById("emp-1");

      expect(global.fetch).toHaveBeenCalledWith("/api/employees/emp-1");
      expect(result).toEqual(mockEmployee);
    });

    it("should return null for 404", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: { message: "Not found" },
        }),
      } as Response);

      const result = await employeeService.getById("nonexistent");

      expect(result).toBeNull();
    });

    it("should throw error on failed request", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: "Internal error" },
        }),
      } as Response);

      await expect(employeeService.getById("emp-1")).rejects.toThrow(
        "Internal error"
      );
    });
  });

  describe("create", () => {
    const mockEmployeeData: EmployeeFormData = {
      first_name: "Jane",
      surname: "Smith",
      ssn: "19900101-1234",
      email: "jane.smith@example.com",
      mobile: "+46701234567",
      rank: "CHEF",
      gender: "Female",
      town_district: "Gothenburg",
      hire_date: "2025-01-01",
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      comments: "New employee",
    };

    const mockCreatedEmployee: Employee = {
      id: "new-emp-123",
      ...mockEmployeeData,
      created_at: "2025-10-27T12:00:00Z",
      updated_at: "2025-10-27T12:00:00Z",
    };

    it("should create an employee", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: mockCreatedEmployee,
          meta: { timestamp: "2025-10-27T12:00:00Z" },
        }),
      } as Response);

      const result = await employeeService.create(mockEmployeeData);

      expect(global.fetch).toHaveBeenCalledWith("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockEmployeeData),
      });
      expect(result).toEqual(mockCreatedEmployee);
    });

    it("should throw error with validation details for 400", async () => {
      const validationError = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: {
            email: ["Invalid email format"],
          },
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => validationError,
      } as Response);

      try {
        await employeeService.create({
          ...mockEmployeeData,
          email: "invalid",
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).toBe("Invalid input data");
        expect((error as Error & { details?: Record<string, string[]> }).details).toEqual({
          email: ["Invalid email format"],
        });
      }
    });

    it("should throw error for duplicate SSN (409)", async () => {
      const duplicateError = {
        error: {
          code: "DUPLICATE_ENTRY",
          message: "Employee with SSN 19900101-1234 already exists",
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => duplicateError,
      } as Response);

      await expect(employeeService.create(mockEmployeeData)).rejects.toThrow(
        "Employee with SSN 19900101-1234 already exists"
      );
    });

    it("should throw generic error for other failures", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: "Internal server error" },
        }),
      } as Response);

      await expect(employeeService.create(mockEmployeeData)).rejects.toThrow(
        "Internal server error"
      );
    });

    it("should throw generic error when no error message", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(employeeService.create(mockEmployeeData)).rejects.toThrow(
        "Failed to create employee"
      );
    });
  });

  describe("update", () => {
    const mockEmployee: Employee = {
      id: "employee-123",
      first_name: "John",
      surname: "Doe",
      ssn: "19850315-1234",
      email: "john.doe@example.com",
      mobile: "+46701234567",
      rank: "CHEF",
      gender: "Male",
      town_district: "Stockholm",
      hire_date: "2025-01-15",
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      comments: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    it("should update an employee", async () => {
      const updatedEmployee = {
        ...mockEmployee,
        email: "updated@example.com",
        updated_at: "2025-10-27T15:30:00Z",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: updatedEmployee,
          meta: { timestamp: "2025-10-27T15:30:00Z", requestId: "req_123" },
        }),
      } as Response);

      const result = await employeeService.update("employee-123", { email: "updated@example.com" });

      expect(global.fetch).toHaveBeenCalledWith("/api/employees/employee-123", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "updated@example.com" }),
      });
      expect(result).toEqual(updatedEmployee);
    });

    it("should update multiple fields", async () => {
      const updatedEmployee = {
        ...mockEmployee,
        email: "new@example.com",
        mobile: "+46709876543",
        rank: "SEV",
        updated_at: "2025-10-27T15:30:00Z",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: updatedEmployee,
          meta: { timestamp: "2025-10-27T15:30:00Z", requestId: "req_124" },
        }),
      } as Response);

      const result = await employeeService.update("employee-123", {
        email: "new@example.com",
        mobile: "+46709876543",
        rank: "SEV",
      });

      expect(result.email).toBe("new@example.com");
      expect(result.mobile).toBe("+46709876543");
      expect(result.rank).toBe("SEV");
    });

    it("should throw error with validation details for 400", async () => {
      const validationError = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: {
            email: ["Invalid email format"],
          },
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => validationError,
      } as Response);

      try {
        await employeeService.update("employee-123", { email: "invalid" });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).toBe("Invalid input data");
        expect((error as Error & { details?: Record<string, string[]> }).details).toEqual({
          email: ["Invalid email format"],
        });
      }
    });

    it("should throw error for not found (404)", async () => {
      const notFoundError = {
        error: {
          code: "NOT_FOUND",
          message: "Employee with ID nonexistent-id not found",
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => notFoundError,
      } as Response);

      await expect(employeeService.update("nonexistent-id", { email: "test@example.com" })).rejects.toThrow(
        "Employee with ID nonexistent-id not found"
      );
    });

    it("should throw error for duplicate SSN (409)", async () => {
      const duplicateError = {
        error: {
          code: "DUPLICATE_ENTRY",
          message: "Employee with SSN 19900101-1234 already exists",
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => duplicateError,
      } as Response);

      await expect(employeeService.update("employee-123", { ssn: "19900101-1234" })).rejects.toThrow(
        "Employee with SSN 19900101-1234 already exists"
      );
    });

    it("should throw generic error for other failures", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: "Internal server error" },
        }),
      } as Response);

      await expect(employeeService.update("employee-123", { email: "test@example.com" })).rejects.toThrow(
        "Internal server error"
      );
    });

    it("should throw generic error when no error message", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(employeeService.update("employee-123", { email: "test@example.com" })).rejects.toThrow(
        "Failed to update employee"
      );
    });
  });

  describe("archive", () => {
    it("should archive an employee", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: "employee-123",
            is_archived: true,
            updated_at: "2025-10-27T15:30:00Z",
          },
          meta: { timestamp: "2025-10-27T15:30:00Z", requestId: "req_123" },
        }),
      } as Response);

      await employeeService.archive("employee-123");

      expect(global.fetch).toHaveBeenCalledWith("/api/employees/employee-123/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    it("should throw error for not found (404)", async () => {
      const notFoundError = {
        error: {
          code: "NOT_FOUND",
          message: "Employee with ID nonexistent-id not found",
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => notFoundError,
      } as Response);

      await expect(employeeService.archive("nonexistent-id")).rejects.toThrow(
        "Employee with ID nonexistent-id not found"
      );
    });

    it("should throw error for forbidden (403)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: "FORBIDDEN",
            message: "HR Admin access required",
          },
        }),
      } as Response);

      await expect(employeeService.archive("employee-123")).rejects.toThrow(
        "You do not have permission to archive employees"
      );
    });

    it("should throw generic error for other failures", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: "Internal server error" },
        }),
      } as Response);

      await expect(employeeService.archive("employee-123")).rejects.toThrow(
        "Internal server error"
      );
    });

    it("should throw generic error when no error message", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(employeeService.archive("employee-123")).rejects.toThrow(
        "Failed to archive employee"
      );
    });
  });

  describe("unarchive", () => {
    it("should unarchive an employee", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: "employee-123",
            is_archived: false,
            updated_at: "2025-10-27T15:30:00Z",
          },
          meta: { timestamp: "2025-10-27T15:30:00Z", requestId: "req_124" },
        }),
      } as Response);

      await employeeService.unarchive("employee-123");

      expect(global.fetch).toHaveBeenCalledWith("/api/employees/employee-123/unarchive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    it("should throw error for not found (404)", async () => {
      const notFoundError = {
        error: {
          code: "NOT_FOUND",
          message: "Employee with ID nonexistent-id not found",
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => notFoundError,
      } as Response);

      await expect(employeeService.unarchive("nonexistent-id")).rejects.toThrow(
        "Employee with ID nonexistent-id not found"
      );
    });

    it("should throw error for forbidden (403)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: "FORBIDDEN",
            message: "HR Admin access required",
          },
        }),
      } as Response);

      await expect(employeeService.unarchive("employee-123")).rejects.toThrow(
        "You do not have permission to unarchive employees"
      );
    });

    it("should throw generic error for other failures", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: "Internal server error" },
        }),
      } as Response);

      await expect(employeeService.unarchive("employee-123")).rejects.toThrow(
        "Internal server error"
      );
    });

    it("should throw generic error when no error message", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(employeeService.unarchive("employee-123")).rejects.toThrow(
        "Failed to unarchive employee"
      );
    });
  });

  describe("terminate", () => {
    it("should terminate an employee", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: "employee-123",
            is_terminated: true,
            termination_date: "2025-10-26",
            termination_reason: "Voluntary resignation",
            updated_at: "2025-10-27T15:30:00Z",
          },
          meta: { timestamp: "2025-10-27T15:30:00Z", requestId: "req_123" },
        }),
      } as Response);

      await employeeService.terminate("employee-123", "2025-10-26", "Voluntary resignation");

      expect(global.fetch).toHaveBeenCalledWith("/api/employees/employee-123/terminate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          termination_date: "2025-10-26",
          termination_reason: "Voluntary resignation",
        }),
      });
    });

    it("should throw error for validation errors (400)", async () => {
      const validationError = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Termination date and reason are required",
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => validationError,
      } as Response);

      await expect(
        employeeService.terminate("employee-123", "", "Test reason")
      ).rejects.toThrow("Termination date and reason are required");
    });

    it("should throw error for not found (404)", async () => {
      const notFoundError = {
        error: {
          code: "NOT_FOUND",
          message: "Employee with ID nonexistent-id not found",
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => notFoundError,
      } as Response);

      await expect(
        employeeService.terminate("nonexistent-id", "2025-10-26", "Test reason")
      ).rejects.toThrow("Employee with ID nonexistent-id not found");
    });

    it("should throw error for forbidden (403)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: "FORBIDDEN",
            message: "HR Admin access required",
          },
        }),
      } as Response);

      await expect(
        employeeService.terminate("employee-123", "2025-10-26", "Test reason")
      ).rejects.toThrow("You do not have permission to terminate employees");
    });

    it("should throw generic error for other failures", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: "Internal server error" },
        }),
      } as Response);

      await expect(
        employeeService.terminate("employee-123", "2025-10-26", "Test reason")
      ).rejects.toThrow("Internal server error");
    });

    it("should throw generic error when no error message", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(
        employeeService.terminate("employee-123", "2025-10-26", "Test reason")
      ).rejects.toThrow("Failed to terminate employee");
    });
  });

  describe("reactivate", () => {
    it("should reactivate an employee", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: "employee-123",
            is_terminated: false,
            termination_date: null,
            termination_reason: null,
            updated_at: "2025-10-27T15:30:00Z",
          },
          meta: { timestamp: "2025-10-27T15:30:00Z", requestId: "req_123" },
        }),
      } as Response);

      await employeeService.reactivate("employee-123");

      expect(global.fetch).toHaveBeenCalledWith("/api/employees/employee-123/reactivate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    it("should throw error for not found (404)", async () => {
      const notFoundError = {
        error: {
          code: "NOT_FOUND",
          message: "Employee with ID nonexistent-id not found",
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => notFoundError,
      } as Response);

      await expect(employeeService.reactivate("nonexistent-id")).rejects.toThrow(
        "Employee with ID nonexistent-id not found"
      );
    });

    it("should throw error for forbidden (403)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: "FORBIDDEN",
            message: "HR Admin access required",
          },
        }),
      } as Response);

      await expect(employeeService.reactivate("employee-123")).rejects.toThrow(
        "You do not have permission to reactivate employees"
      );
    });

    it("should throw generic error for other failures", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: "Internal server error" },
        }),
      } as Response);

      await expect(employeeService.reactivate("employee-123")).rejects.toThrow(
        "Internal server error"
      );
    });

    it("should throw generic error when no error message", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(employeeService.reactivate("employee-123")).rejects.toThrow(
        "Failed to reactivate employee"
      );
    });
  });
});
