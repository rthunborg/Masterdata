/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit Tests for Room Assignment Service
 * 
 * Tests the ÖMC room assignment algorithm (FR40) business logic:
 * - First employee for date gets room 1
 * - CHEF rank gets private rooms (incremented)
 * - SEV rank shares room with same gender (max 2 per room)
 * - SEV creates new room when no match or room full
 * - Gender constraint enforcement
 * - Hotel required flag logic
 * 
 * Story: 11.2 - Room Assignment Algorithm Test Suite
 * AC1: Unit Test Coverage (Room Assignment Service)
 * 
 * NOTE: Story 8.20 - Service implementation complete. This test file has been partially
 * updated to use the real service. Remaining tests need to be updated to:
 * 1. Use calculateRoomNumber() directly instead of mockRoomAssignmentService
 * 2. Mock Supabase client queries properly (see first test as example)
 * 3. Update field names: hotel_room_number -> room_number_shared
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { calculateRoomNumber } from "@/lib/services/room-assignment";
import { createClient } from "@/lib/supabase/client";
import type { Employee } from "@/lib/types/employee";

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("room-assignment service", () => {
  const mockDateId = "date-omc-1";
  const mockDateValue = "2025-03-08";

  let mockSupabaseFrom: ReturnType<typeof vi.fn>;
  let mockSupabaseRpc: ReturnType<typeof vi.fn>;
  let mockSupabaseClient: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a chainable mock for Supabase queries
    // Note: order() can be called multiple times, so it needs to return itself
    const createChainMock = () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      // Make order() return itself to support chained calls
      chain.order.mockReturnValue(chain);
      return chain;
    };

    mockSupabaseFrom = vi.fn((_table: string) => createChainMock());
    
    // Mock RPC function - return error to force fallback to TypeScript implementation
    // (which is what these tests are actually validating)
    mockSupabaseRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'RPC function not available in test environment' },
    });

    mockSupabaseClient = {
      from: mockSupabaseFrom,
      rpc: mockSupabaseRpc,
    };

    // Mock createClient to return our mock client
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabaseClient
    );

    // Suppress specific console.error about RPC availability to keep test output clean
    // This error is expected as we're testing the fallback logic
    const originalConsoleError = console.error;
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      if (typeof args[0] === 'string' && args[0].includes('RPC function not available in test environment')) {
        return;
      }
      originalConsoleError(...args);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to setup Supabase mock with existing employees
  function setupSupabaseMock(existingEmployees: Array<{ rank: 'SEV' | 'CHEF'; gender: 'Man' | 'Woman' | null; room_number_shared: number | null; hire_date?: string }>) {
    const resolvedValue = {
      data: existingEmployees.map((emp, idx) => ({
        id: `emp-${idx}`,
        rank: emp.rank,
        gender: emp.gender,
        room_number_shared: emp.room_number_shared,
        hire_date: emp.hire_date || `2025-01-${String(idx + 1).padStart(2, '0')}`,
      })),
      error: null,
    };
    
    // Create an awaitable object (Promise-like) for the final order() call
    const awaitableResult = Promise.resolve(resolvedValue);
    const mockOrder2Result = {
      then: awaitableResult.then.bind(awaitableResult),
      catch: awaitableResult.catch.bind(awaitableResult),
    };
    
    const mockOrder2 = vi.fn().mockReturnValue(mockOrder2Result);
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockNot = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockEq2 = vi.fn().mockReturnValue({ not: mockNot });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

    mockSupabaseFrom.mockReturnValue({
      select: mockSelect,
    });
  }

  describe("calculateRoomNumber", () => {
    it("should assign room 1 to first employee for date", async () => {
      // Mock Supabase query to return no existing employees
      setupSupabaseMock([]);

      const result = await calculateRoomNumber(
        {
          omc_date: mockDateId,
          rank: "SEV",
          gender: "Man",
          hotel_required: true,
        },
        mockSupabaseClient as any
      );

      expect(result).toBe(1);
    });

    it("should assign room 2 to second CHEF employee (private room)", async () => {
      // Mock existing employee with room 1
      setupSupabaseMock([
        { rank: "CHEF", gender: "Man", room_number_shared: 1 },
      ]);

      const result = await calculateRoomNumber(
        {
          omc_date: mockDateId,
          rank: "CHEF",
          gender: "Woman",
          hotel_required: true,
        },
        mockSupabaseClient as any
      );

      expect(result).toBe(2);
    });

    it("should assign room 3 to third CHEF employee (private room)", async () => {
      // Mock existing employees with rooms 1 and 2
      setupSupabaseMock([
        { rank: "CHEF", gender: "Man", room_number_shared: 1 },
        { rank: "CHEF", gender: "Woman", room_number_shared: 2 },
      ]);

      const result = await calculateRoomNumber(
        {
          omc_date: mockDateId,
          rank: "CHEF",
          gender: "Man",
          hotel_required: true,
        },
        mockSupabaseClient as any
      );

      expect(result).toBe(3);
    });

    it("should assign room 1 to first SEV if first overall", async () => {
      setupSupabaseMock([]);

      const result = await calculateRoomNumber(
        {
          omc_date: mockDateId,
          rank: "SEV",
          gender: "Man",
          hotel_required: true,
        },
        mockSupabaseClient as any
      );

      expect(result).toBe(1);
    });

    it("should assign SEV to share room with same-gender SEV (max 2)", async () => {
      // Mock existing SEV with room 1 (only 1 occupant, can share)
      setupSupabaseMock([
        { rank: "SEV", gender: "Man", room_number_shared: 1 },
      ]);

      const result = await calculateRoomNumber(
        {
          omc_date: mockDateId,
          rank: "SEV",
          gender: "Man", // Same gender
          hotel_required: true,
        },
        mockSupabaseClient as any
      );

      expect(result).toBe(1); // Shares room 1
    });

    it("should assign SEV to new room if no same-gender match", async () => {
      // Mock existing SEV with different gender (can't share)
      setupSupabaseMock([
        { rank: "SEV", gender: "Man", room_number_shared: 1 },
      ]);

      const result = await calculateRoomNumber(
        {
          omc_date: mockDateId,
          rank: "SEV",
          gender: "Woman", // Different gender
          hotel_required: true,
        },
        mockSupabaseClient as any
      );

      expect(result).toBe(2); // New room
    });

    it("should assign SEV to new room if existing room full (2 occupants)", async () => {
      // Mock existing SEVs with room 1 (room is full with 2 occupants)
      setupSupabaseMock([
        { rank: "SEV", gender: "Man", room_number_shared: 1 },
        { rank: "SEV", gender: "Man", room_number_shared: 1 }, // Room 1 is full
      ]);

      const result = await calculateRoomNumber(
        {
          omc_date: mockDateId,
          rank: "SEV",
          gender: "Man", // Same gender but room full
          hotel_required: true,
        },
        mockSupabaseClient as any
      );

      expect(result).toBe(2); // New room
    });

    it("should assign CHEF to private room and SEV to share in mixed rank scenario", async () => {
      // Mock existing employees: CHEF in room 1, SEV in room 2
      setupSupabaseMock([
        { rank: "CHEF", gender: "Man", room_number_shared: 1 },
        { rank: "SEV", gender: "Man", room_number_shared: 2 },
      ]);

      // New SEV should share with sev1
      const resultSev = await calculateRoomNumber(
        {
          omc_date: mockDateId,
          rank: "SEV",
          gender: "Man",
          hotel_required: true,
        },
        mockSupabaseClient as any
      );

      expect(resultSev).toBe(2); // Shares room 2 with sev1

      // Reset mock for second call
      setupSupabaseMock([
        { rank: "CHEF", gender: "Man", room_number_shared: 1 },
        { rank: "SEV", gender: "Man", room_number_shared: 2 },
      ]);

      // New CHEF should get private room
      const resultChef = await calculateRoomNumber(
        {
          omc_date: mockDateId,
          rank: "CHEF",
          gender: "Woman",
          hotel_required: true,
        },
        mockSupabaseClient as any
      );

      expect(resultChef).toBe(3); // Private room 3
    });

    it("should enforce gender constraint: Male SEV doesn't share with Female SEV", async () => {
      // Mock existing SEV with different gender (can't share)
      setupSupabaseMock([
        { rank: "SEV", gender: "Woman", room_number_shared: 1 },
      ]);

      const result = await calculateRoomNumber(
        {
          omc_date: mockDateId,
          rank: "SEV",
          gender: "Man", // Different gender
          hotel_required: true,
        },
        mockSupabaseClient as any
      );

      expect(result).toBe(2); // New room, not sharing
    });

    it("should return null when hotel_required is false", async () => {
      const result = await calculateRoomNumber(
        {
          omc_date: mockDateId,
          rank: "SEV",
          gender: "Man",
          hotel_required: false, // No hotel required
        },
        mockSupabaseClient as any
      );

      expect(result).toBeNull();
    });

    it("should return null when omc_date is null", async () => {
      const result = await calculateRoomNumber(
        {
          omc_date: null, // No date
          rank: "SEV",
          gender: "Man",
          hotel_required: true,
        },
        mockSupabaseClient as any
      );

      expect(result).toBeNull();
    });


    it("should clear room when hotel_required toggles to false", async () => {
      // When hotel_required is false, service should return null
      const result = await calculateRoomNumber(
        {
          omc_date: mockDateId,
          rank: "SEV",
          gender: "Man",
          hotel_required: false, // Toggled to false
        },
        mockSupabaseClient as any
      );

      expect(result).toBeNull();
    });
  });

  // Note: recalculateRoomsForDate is fully tested in integration tests:
  // - tests/integration/room-recalculation.test.ts: Multiple recalculation scenarios
  // - tests/integration/room-assignment-api.test.ts: RPC function calls verified
  // - tests/integration/room-assignment-edge-cases.test.ts: Bulk deletion recalculation
  // - tests/integration/api/employees.test.ts: Date/rank/gender change recalculation
});

