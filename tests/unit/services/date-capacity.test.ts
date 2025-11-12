/**
 * Unit Tests for Date Capacity Service
 * 
 * Tests capacity validation, atomic assignment transactions, and edge cases.
 * Story: 8.7 - Important Dates Capacity Management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  canAssignEmployeeToDate,
  assignEmployeeToDate,
  releaseDateCapacity,
  getCapacityStatus,
  hasCapacityForBulkAssignment,
} from "@/lib/services/date-capacity";
import { createClient } from "@/lib/supabase/client";

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("date-capacity service", () => {
  let mockSupabaseFrom: ReturnType<typeof vi.fn>;
  let mockSupabaseRpc: ReturnType<typeof vi.fn>;
  let mockSupabaseClient: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a flexible chainable mock that returns different data based on the table
    mockSupabaseFrom = vi.fn((table: string) => {
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      if (table === 'employees') {
        // Mock employee data fetch
        chainMock.single.mockResolvedValue({
          data: {
            id: 'emp-123',
            first_name: 'John',
            surname: 'Doe',
            email: 'john@example.com',
          },
          error: null,
        });
      } else {
        // Default for important_dates and other tables
        chainMock.single.mockResolvedValue({
          data: { deadline_submit: null, deadline_cancel: null, remaining_spots: 10 },
          error: null,
        });
      }

      return chainMock;
    });

    mockSupabaseRpc = vi.fn().mockResolvedValue({ data: null, error: null });

    mockSupabaseClient = {
      from: mockSupabaseFrom,
      rpc: mockSupabaseRpc,
    };

    // Mock createClient to return our mock client
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabaseClient
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("canAssignEmployeeToDate", () => {
    it("should return true when spots are available", async () => {
      // Mock Supabase chain: from().select().eq().single()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { remaining_spots: 5 },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await canAssignEmployeeToDate("date-123");

      expect(mockSupabaseFrom).toHaveBeenCalledWith("important_dates");
      expect(mockSelect).toHaveBeenCalledWith("remaining_spots");
      expect(mockEq).toHaveBeenCalledWith("id", "date-123");
      expect(result).toBe(true);
    });

    it("should return false when remaining_spots is 0", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { remaining_spots: 0 },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await canAssignEmployeeToDate("date-full");

      expect(result).toBe(false);
    });

    it("should return false when date is not found", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await canAssignEmployeeToDate("invalid-date");

      expect(result).toBe(false);
    });

    it("should return false and log error when Supabase query fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await canAssignEmployeeToDate("date-error");

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error checking date capacity:",
        { message: "Database connection failed" }
      );

      consoleErrorSpy.mockRestore();
    });

    it("should return true when remaining_spots is exactly 1", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { remaining_spots: 1 },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await canAssignEmployeeToDate("date-last-spot");

      expect(result).toBe(true);
    });
  });

  describe("assignEmployeeToDate", () => {
    it("should successfully assign employee to date with no old date", async () => {
      // Mock the deadline check query (from().select().eq().single())
      const mockSingle = vi.fn().mockResolvedValue({
        data: { deadline_submit: null, deadline_cancel: null },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await assignEmployeeToDate(
        "emp-123",
        "date-456",
        null,
        "omc_date"
      );

      expect(mockSupabaseFrom).toHaveBeenCalledWith("important_dates");
      expect(mockSupabaseFrom).toHaveBeenCalledWith("employees");
      expect(mockSupabaseRpc).toHaveBeenCalledWith("update_date_spots",
        expect.objectContaining({
          employee_id: "emp-123",
          new_date_id: "date-456",
          old_date_id: null,
          date_type: "omc_date",
          employee_data: expect.objectContaining({
            room_number: null,
          }),
        })
      );

      expect(result).toEqual({
        success: true,
        message: "Employee assigned successfully",
      });
    });

    it("should successfully assign employee when changing dates", async () => {
      // Mock the deadline check query
      const mockSingle = vi.fn().mockResolvedValue({
        data: { deadline_submit: null, deadline_cancel: null },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await assignEmployeeToDate(
        "emp-123",
        "date-new",
        "date-old",
        "stena_date"
      );

      expect(mockSupabaseFrom).toHaveBeenCalledWith("important_dates");
      expect(mockSupabaseFrom).toHaveBeenCalledWith("employees");
      expect(mockSupabaseRpc).toHaveBeenCalledWith("update_date_spots",
        expect.objectContaining({
          employee_id: "emp-123",
          new_date_id: "date-new",
          old_date_id: "date-old",
          date_type: "stena_date",
          employee_data: expect.objectContaining({
            room_number: null,
          }),
        })
      );

      expect(result.success).toBe(true);
    });

    it("should throw error when date is fully booked", async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: "No remaining spots available" },
      });

      await expect(
        assignEmployeeToDate("emp-123", "date-full", null, "pe3_date")
      ).rejects.toThrow(
        "Cannot assign employee - date is fully booked (0 spots remaining)"
      );

      expect(mockSupabaseRpc).toHaveBeenCalled();
    });

    it("should throw error on constraint violation", async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: "Constraint remaining_spots_check violated" },
      });

      await expect(
        assignEmployeeToDate("emp-123", "date-456", null, "omc_date")
      ).rejects.toThrow("Cannot assign employee - date capacity would be exceeded");
    });

    it("should throw generic error for other failures", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: "Network timeout" },
      });

      await expect(
        assignEmployeeToDate("emp-123", "date-456", null, "stena_date")
      ).rejects.toThrow("Failed to assign employee to date: Network timeout");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error assigning employee to date:",
        { message: "Network timeout" }
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle all three date types correctly", async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: null,
      });

      // Test omc_date
      await assignEmployeeToDate("emp-1", "date-1", null, "omc_date");
      expect(mockSupabaseRpc).toHaveBeenLastCalledWith("update_date_spots", {
        employee_id: "emp-1",
        new_date_id: "date-1",
        old_date_id: null,
        date_type: "omc_date",
        employee_data: {
          id: 'emp-123',
          name: 'John Doe',
          email: 'john@example.com',
          room_number: null,
        },
      });

      // Test stena_date
      await assignEmployeeToDate("emp-2", "date-2", null, "stena_date");
      expect(mockSupabaseRpc).toHaveBeenLastCalledWith("update_date_spots", {
        employee_id: "emp-2",
        new_date_id: "date-2",
        old_date_id: null,
        date_type: "stena_date",
        employee_data: {
          id: 'emp-123',
          name: 'John Doe',
          email: 'john@example.com',
          room_number: null,
        },
      });

      // Test pe3_date
      await assignEmployeeToDate("emp-3", "date-3", null, "pe3_date");
      expect(mockSupabaseRpc).toHaveBeenLastCalledWith("update_date_spots", {
        employee_id: "emp-3",
        new_date_id: "date-3",
        old_date_id: null,
        date_type: "pe3_date",
        employee_data: {
          id: 'emp-123',
          name: 'John Doe',
          email: 'john@example.com',
          room_number: null,
        },
      });

      expect(mockSupabaseRpc).toHaveBeenCalledTimes(3);
    });
  });

  describe("releaseDateCapacity", () => {
    it("should successfully release capacity for a date", async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: null,
      });

      await releaseDateCapacity("date-123", "employee-456");

      expect(mockSupabaseRpc).toHaveBeenCalledWith("release_date_capacity", {
        date_id: "date-123",
        employee_id: "employee-456",
      });
    });

    it("should throw error when release fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: "Date not found" },
      });

      await expect(releaseDateCapacity("invalid-date", "employee-456")).rejects.toThrow(
        "Failed to release date capacity: Date not found"
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error releasing date capacity:",
        { message: "Date not found" }
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle multiple release calls", async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: null,
      });

      await releaseDateCapacity("date-1", "employee-1");
      await releaseDateCapacity("date-2", "employee-2");
      await releaseDateCapacity("date-3", "employee-3");

      expect(mockSupabaseRpc).toHaveBeenCalledTimes(3);
      expect(mockSupabaseRpc).toHaveBeenNthCalledWith(1, "release_date_capacity", {
        date_id: "date-1",
        employee_id: "employee-1",
      });
      expect(mockSupabaseRpc).toHaveBeenNthCalledWith(2, "release_date_capacity", {
        date_id: "date-2",
        employee_id: "employee-2",
      });
      expect(mockSupabaseRpc).toHaveBeenNthCalledWith(3, "release_date_capacity", {
        date_id: "date-3",
        employee_id: "employee-3",
      });
    });
  });

  describe("getCapacityStatus", () => {
    it("should return 'full' when remaining_spots is 0", () => {
      expect(getCapacityStatus(0)).toBe("full");
    });

    it("should return 'almost-full' when remaining_spots is less than 5", () => {
      expect(getCapacityStatus(1)).toBe("almost-full");
      expect(getCapacityStatus(2)).toBe("almost-full");
      expect(getCapacityStatus(3)).toBe("almost-full");
      expect(getCapacityStatus(4)).toBe("almost-full");
    });

    it("should return 'available' when remaining_spots is 5 or more", () => {
      expect(getCapacityStatus(5)).toBe("available");
      expect(getCapacityStatus(10)).toBe("available");
      expect(getCapacityStatus(99)).toBe("available");
    });

    it("should handle edge case of exactly 5 spots as available", () => {
      expect(getCapacityStatus(5)).toBe("available");
    });
  });

  describe("hasCapacityForBulkAssignment", () => {
    it("should return true when sufficient capacity exists", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { remaining_spots: 10 },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await hasCapacityForBulkAssignment("date-123", 5);

      expect(result).toBe(true);
    });

    it("should return false when insufficient capacity", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { remaining_spots: 3 },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await hasCapacityForBulkAssignment("date-123", 5);

      expect(result).toBe(false);
    });

    it("should return true when exactly enough capacity", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { remaining_spots: 10 },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await hasCapacityForBulkAssignment("date-123", 10);

      expect(result).toBe(true);
    });

    it("should return false when date not found", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await hasCapacityForBulkAssignment("invalid-date", 5);

      expect(result).toBe(false);
    });

    it("should return false and log error on query failure", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await hasCapacityForBulkAssignment("date-123", 5);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error checking bulk capacity:",
        { message: "Query failed" }
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle bulk assignment request for 0 spots", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { remaining_spots: 5 },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await hasCapacityForBulkAssignment("date-123", 0);

      expect(result).toBe(true);
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle rapid consecutive calls without interference", async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const promises = [
        assignEmployeeToDate("emp-1", "date-1", null, "omc_date"),
        assignEmployeeToDate("emp-2", "date-1", null, "omc_date"),
        assignEmployeeToDate("emp-3", "date-1", null, "omc_date"),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it("should handle UUID format validation implicitly", async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: null,
      });

      // UUIDs are validated by database, service just passes them through
      await expect(
        assignEmployeeToDate(
          "550e8400-e29b-41d4-a716-446655440000",
          "550e8400-e29b-41d4-a716-446655440001",
          null,
          "omc_date"
        )
      ).resolves.toEqual({
        success: true,
        message: "Employee assigned successfully",
      });
    });
  });
});
