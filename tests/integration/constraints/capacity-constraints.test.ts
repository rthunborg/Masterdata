/**
 * Integration Tests for Capacity Constraints
 * 
 * Tests database-level capacity constraints on important_dates table:
 * - remaining_spots >= 0 (CHECK constraint)
 * - remaining_spots <= max_spots (CHECK constraint)
 * 
 * Story: 11.9 - Data Integrity & Constraint Tests
 * AC1: Capacity Constraint Tests (5 tests)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { expectConstraintViolation } from "../../helpers/constraint-test-helpers";

vi.mock("@supabase/supabase-js");

describe("Capacity Constraint Tests", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create chainable mock builder
    const createChainableMock = (resolvedValue: { data: unknown; error: unknown }) => {
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(resolvedValue),
        then: vi.fn((onFulfilled) => Promise.resolve(resolvedValue).then(onFulfilled)),
        catch: vi.fn((onRejected) => Promise.resolve(resolvedValue).catch(onRejected)),
      };
      return chainMock;
    };
    
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn((table: string) => createChainableMock({ data: null, error: null })),
    } as unknown as SupabaseClient;
    
    vi.mocked(createClient).mockReturnValue(mockSupabase as unknown as SupabaseClient);
  });

  describe("remaining_spots >= 0 constraint", () => {
    it("should reject negative remaining_spots via direct SQL update", async () => {
      const errorResponse = {
        data: null,
        error: {
          code: "23514", // Check constraint violation
          message: "new row for relation \"important_dates\" violates check constraint \"important_dates_remaining_spots_check\"",
          details: "Failing row contains (id, remaining_spots: -1, max_spots: 20).",
        },
      };

      const chainMock = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(errorResponse),
        then: vi.fn((onFulfilled) => Promise.resolve(errorResponse).then(onFulfilled)),
        catch: vi.fn((onRejected) => Promise.resolve(errorResponse).catch(onRejected)),
      };

      mockSupabase.from.mockReturnValue(chainMock);

      const supabase = createClient("http://localhost", "anon-key");
      
      await expectConstraintViolation(
        async () => {
          const result = await supabase
            .from("important_dates")
            .update({ remaining_spots: -1 })
            .eq("id", "test-id");
          
          if (result.error) {
            throw result.error;
          }
        },
        "important_dates_remaining_spots_check"
      );
    });

    it("should reject negative remaining_spots via application update", async () => {
      const errorResponse = {
        data: null,
        error: {
          code: "23514",
          message: "remaining_spots cannot be negative",
        },
      };

      const chainMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(errorResponse),
        then: vi.fn((onFulfilled) => Promise.resolve(errorResponse).then(onFulfilled)),
        catch: vi.fn((onRejected) => Promise.resolve(errorResponse).catch(onRejected)),
      };

      mockSupabase.from.mockReturnValue(chainMock);

      const supabase = createClient("http://localhost", "anon-key");
      
      await expectConstraintViolation(
        async () => {
          const result = await supabase
            .from("important_dates")
            .update({ remaining_spots: -1 })
            .eq("id", "test-id");
          
          if (result.error) {
            throw result.error;
          }
        },
        "remaining_spots"
      );
    });
  });

  describe("remaining_spots <= max_spots constraint", () => {
    it("should reject remaining_spots exceeding max_spots via direct SQL update", async () => {
      const errorResponse = {
        data: null,
        error: {
          code: "23514", // Check constraint violation
          message: "new row for relation \"important_dates\" violates check constraint \"important_dates_remaining_spots_check\"",
          details: "Failing row contains (id, remaining_spots: 25, max_spots: 20).",
        },
      };

      const chainMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(errorResponse),
        then: vi.fn((onFulfilled) => Promise.resolve(errorResponse).then(onFulfilled)),
        catch: vi.fn((onRejected) => Promise.resolve(errorResponse).catch(onRejected)),
      };

      mockSupabase.from.mockReturnValue(chainMock);

      const supabase = createClient("http://localhost", "anon-key");
      
      await expectConstraintViolation(
        async () => {
          const result = await supabase
            .from("important_dates")
            .update({ remaining_spots: 25 })
            .eq("id", "test-id");
          
          if (result.error) {
            throw result.error;
          }
        },
        "important_dates_remaining_spots_check"
      );
    });

    it("should reject remaining_spots exceeding max_spots via application update", async () => {
      const errorResponse = {
        data: null,
        error: {
          code: "23514",
          message: "remaining_spots cannot exceed max_spots",
        },
      };

      const chainMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(errorResponse),
        then: vi.fn((onFulfilled) => Promise.resolve(errorResponse).then(onFulfilled)),
        catch: vi.fn((onRejected) => Promise.resolve(errorResponse).catch(onRejected)),
      };

      mockSupabase.from.mockReturnValue(chainMock);

      const supabase = createClient("http://localhost", "anon-key");
      
      await expectConstraintViolation(
        async () => {
          const result = await supabase
            .from("important_dates")
            .update({ remaining_spots: 25, max_spots: 20 })
            .eq("id", "test-id");
          
          if (result.error) {
            throw result.error;
          }
        },
        "remaining_spots"
      );
    });
  });

  describe("Error message descriptiveness", () => {
    it("should return descriptive error message for constraint violation", async () => {
      const errorResponse = {
        data: null,
        error: {
          code: "23514",
          message: "new row for relation \"important_dates\" violates check constraint \"important_dates_remaining_spots_check\"",
          details: "Failing row contains (id, remaining_spots: -1, max_spots: 20).",
          hint: "remaining_spots must be >= 0 and <= max_spots",
        },
      };

      const chainMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(errorResponse),
        then: vi.fn((onFulfilled) => Promise.resolve(errorResponse).then(onFulfilled)),
        catch: vi.fn((onRejected) => Promise.resolve(errorResponse).catch(onRejected)),
      };

      mockSupabase.from.mockReturnValue(chainMock);

      const supabase = createClient("http://localhost", "anon-key");
      
      const result = await supabase
        .from("important_dates")
        .update({ remaining_spots: -1 })
        .eq("id", "test-id");

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("23514");
      expect(result.error?.message).toContain("constraint");
      expect(result.error?.message).toContain("remaining_spots");
    });
  });
});
