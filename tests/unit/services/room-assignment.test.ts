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
import { calculateRoomNumber, recalculateRoomsForDate } from "@/lib/services/room-assignment";
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
  let mockSupabaseClient: {
    from: ReturnType<typeof vi.fn>;
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

    mockSupabaseFrom = vi.fn((table: string) => createChainMock());

    mockSupabaseClient = {
      from: mockSupabaseFrom,
    };

    // Mock createClient to return our mock client
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabaseClient
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to setup Supabase mock with existing employees
  function setupSupabaseMock(existingEmployees: Array<{ rank: 'SEV' | 'CHEF'; gender: 'Man' | 'Woman' | null; room_number_shared: number | null; hire_date?: string }>) {
    const mockOrder2 = vi.fn().mockResolvedValue({
      data: existingEmployees.map((emp, idx) => ({
        id: `emp-${idx}`,
        rank: emp.rank,
        gender: emp.gender,
        room_number_shared: emp.room_number_shared,
        hire_date: emp.hire_date || `2025-01-${String(idx + 1).padStart(2, '0')}`,
      })),
      error: null,
    });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockNot = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockEq2 = vi.fn().mockReturnValue({ not: mockNot });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

    mockSupabaseFrom.mockReturnValue({
      select: mockSelect,
    });
  }

  // Helper to create mock employee with room assignment fields
  function createMockEmployee(overrides: Partial<Employee & { hotel_required?: boolean; room_number_shared?: number | null }>): Employee & { hotel_required?: boolean; room_number_shared?: number | null } {
    return {
      id: `emp-${Math.random().toString(36).substr(2, 9)}`,
      first_name: "Test",
      surname: "Employee",
      ssn: "19900101-1234",
      email: "test@example.com",
      mobile: "+46701234567",
      rank: "SEV",
      gender: "Man",
      town_district: "Stockholm",
      hire_date: "2025-01-01",
      omc_date: null,
      stena_date: null,
      pe3_date: null,
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      repayment_needed_omc: null,
      repayment_needed_pe3: null,
      one: null,
      one_marked_at: null,
      talmundo: null,
      isps: null,
      photo: null,
      origo: null,
      loneiva: null,
      mail_lon: null,
      bankuppgifter: null,
      li: null,
      passport: null,
      kvitto_c17_18: null,
      c17: null,
      crewing_done: null,
      comments: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      hotel_required: true,
      room_number_shared: null,
      ...overrides,
    };
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

    it.skip("should recalculate rooms when date changes", async () => {
      // SKIPPED: This test requires complex mocking of recalculateRoomsForDate
      // which involves multiple database update operations and transaction handling.
      // 
      // Rationale: The recalculation logic is better tested in integration tests
      // (tests/integration/room-assignment-api.test.ts) where we can test the full
      // flow including API routes, repository methods, and database interactions.
      // 
      // The functionality is implemented and verified working in:
      // - Integration tests for date change scenarios
      // - Integration tests for employee deletion (which triggers recalculation)
      // - Manual testing in production-like scenarios
      //
      // Story 8.20 - Review Follow-up: Documented as acceptable to skip per review findings.
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

  describe("recalculateRoomsForDate", () => {
    it.skip("should recalculate all rooms for a date when called", async () => {
      // SKIPPED: This test requires complex mocking of database update operations.
      // 
      // recalculateRoomsForDate performs multiple database operations:
      // 1. Fetch all employees for date (with RPC function or fallback query)
      // 2. Calculate new room assignments for all employees
      // 3. Update each employee's room_number_shared in batch
      // 4. Handle RPC function calls with SELECT FOR UPDATE locking (AC6)
      //
      // Rationale: This is better tested in integration tests where we can:
      // - Test the full flow including RPC function calls
      // - Verify atomic recalculation behavior
      // - Test concurrency scenarios with proper database mocking
      //
      // The functionality is implemented and verified working in:
      // - Integration tests for date change scenarios (triggers recalculation)
      // - Integration tests for employee deletion (triggers recalculation)
      // - RPC function tests in migration file
      //
      // Story 8.20 - Review Follow-up: Documented as acceptable to skip per review findings.
    });
  });
});

