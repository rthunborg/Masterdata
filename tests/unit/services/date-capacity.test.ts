/**
 * Unit Tests for Date Capacity Service
 * 
 * Tests capacity validation, atomic assignment transactions, and edge cases.
 * Story: 8.7 - Important Dates Capacity Management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  assignEmployeeToDate,
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

  describe("Edge Cases and Integration", () => {
    it("should handle rapid consecutive calls without interference", async () => {
      // Mock chaining carefully to handle multiple calls with interleaving
      
      mockSupabaseFrom.mockImplementation((table: string) => {
        const mockSingle = vi.fn();
        const chainMock: any = {
          single: mockSingle,
        };
        // Explicitly return chainMock instead of using mockReturnThis() to avoid 'this' context issues
        chainMock.select = vi.fn().mockReturnValue(chainMock);
        chainMock.eq = vi.fn().mockReturnValue(chainMock);

        if (table === 'employees') {
          // Mock employee data fetch
          mockSingle.mockResolvedValue({
            data: {
              id: 'emp-123',
              first_name: 'John',
              surname: 'Doe',
              email: 'john@example.com',
            },
            error: null,
          });
        } else {
          // Default for important_dates (including deadline check)
          mockSingle.mockResolvedValue({
            data: { deadline_submit: null, deadline_cancel: null, remaining_spots: 10 },
            error: null,
          });
        }
        return chainMock;
      });

      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const promises = [
        assignEmployeeToDate("emp-1", "date-1", null, "omc_date", mockSupabaseClient as any),
        assignEmployeeToDate("emp-2", "date-1", null, "omc_date", mockSupabaseClient as any),
        assignEmployeeToDate("emp-3", "date-1", null, "omc_date", mockSupabaseClient as any),
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
