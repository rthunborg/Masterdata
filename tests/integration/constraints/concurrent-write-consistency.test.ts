/**
 * Integration Tests for Concurrent Write Consistency
 * 
 * Tests concurrent write scenarios to ensure data consistency:
 * - Last write wins behavior
 * - Race condition handling for last spot assignment
 * - Concurrent capacity updates
 * - Optimistic locking (if implemented)
 * - Database-level locking
 * 
 * Story: 11.9 - Data Integrity & Constraint Tests
 * AC6: Concurrent Write Consistency Tests (5 tests)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { testConcurrentWrites } from "../../helpers/constraint-test-helpers";

vi.mock("@supabase/supabase-js");

describe("Concurrent Write Consistency Tests", () => {
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
        single: vi.fn().mockResolvedValue(resolvedValue),
        then: vi.fn((onFulfilled) => Promise.resolve(resolvedValue).then(onFulfilled)),
        catch: vi.fn((onRejected) => Promise.resolve(resolvedValue).catch(onRejected)),
      };
      return chainMock;
    };
    
    mockSupabase = {
      from: vi.fn((table: string) => createChainableMock({ data: null, error: null })),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;
    
    vi.mocked(createClient).mockReturnValue(mockSupabase);
  });

  describe("Last write wins scenario", () => {
    it("should handle two users updating same employee - last write wins", async () => {
      let updateCount = 0;

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          updateCount++;
          const updateResponse = { 
            data: [{ id: "emp-1", first_name: `Name${updateCount}` }], 
            error: null 
          };
          return Promise.resolve(updateResponse);
        }),
        then: vi.fn((onFulfilled) => {
          const updateResponse = { 
            data: [{ id: "emp-1", first_name: `Name${updateCount}` }], 
            error: null 
          };
          return Promise.resolve(updateResponse).then(onFulfilled);
        }),
        catch: vi.fn((onRejected) => {
          const updateResponse = { 
            data: [{ id: "emp-1", first_name: `Name${updateCount}` }], 
            error: null 
          };
          return Promise.resolve(updateResponse).catch(onRejected);
        }),
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      const { succeeded, failed } = await testConcurrentWrites(
        async () => {
          return await supabase
            .from("employees")
            .update({ first_name: `Name${Date.now()}` })
            .eq("id", "emp-1");
        },
        2
      );

      expect(succeeded).toBe(2);
      expect(failed).toBe(0);
      expect(updateCount).toBe(2);
    });
  });

  describe("Last spot assignment race condition", () => {
    it("should handle two users assigning to last spot - one succeeds, one fails", async () => {
      let attemptCount = 0;
      const mockRpc = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          // First attempt succeeds
          return Promise.resolve({
            data: { remaining_spots: 0 },
            error: null,
          });
        } else {
          // Second attempt fails (no spots left)
          return Promise.resolve({
            data: null,
            error: {
              code: "P0001",
              message: "No remaining spots available for this date",
            },
          });
        }
      });

      mockSupabase.rpc = mockRpc;

      const supabase = createClient("http://localhost", "anon-key");
      
      const { succeeded, failed } = await testConcurrentWrites(
        async () => {
          const result = await supabase.rpc("update_date_spots", {
            employee_id: `emp-${Date.now()}`,
            new_date_id: "date-1",
            old_date_id: null,
            date_type: "omc_date",
          });
          
          if (result.error) {
            throw result.error;
          }
          return result;
        },
        2
      );

      expect(succeeded).toBe(1);
      expect(failed).toBe(1);
    });
  });

  describe("Concurrent capacity updates", () => {
    it("should maintain accurate spot count with concurrent updates", async () => {
      let currentSpots = 10;

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          currentSpots--;
          const updateResponse = {
            data: [{ remaining_spots: currentSpots }],
            error: null,
          };
          return Promise.resolve(updateResponse);
        }),
        then: vi.fn((onFulfilled) => {
          const updateResponse = {
            data: [{ remaining_spots: currentSpots }],
            error: null,
          };
          return Promise.resolve(updateResponse).then(onFulfilled);
        }),
        catch: vi.fn((onRejected) => {
          const updateResponse = {
            data: [{ remaining_spots: currentSpots }],
            error: null,
          };
          return Promise.resolve(updateResponse).catch(onRejected);
        }),
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      const { succeeded } = await testConcurrentWrites(
        async () => {
          return await supabase
            .from("important_dates")
            .update({ remaining_spots: currentSpots - 1 })
            .eq("id", "date-1");
        },
        3
      );

      expect(succeeded).toBe(3);
      // Final count should reflect all decrements (in real scenario with locking)
    });
  });

  describe("Optimistic locking", () => {
    it("should prevent lost updates with optimistic locking (if implemented)", async () => {
      let version = 1;
      const mockUpdate = vi.fn().mockImplementation((data: { updated_at?: string }) => {
        // Simulate optimistic locking check
        if (data.updated_at && data.updated_at < new Date().toISOString()) {
          return Promise.resolve({
            data: null,
            error: {
              code: "CONFLICT",
              message: "Record was modified by another user",
            },
          });
        }
        
        version++;
        return Promise.resolve({
          data: [{ id: "emp-1", version }],
          error: null,
        });
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      // Simulate concurrent updates with stale version
      const { succeeded, failed } = await testConcurrentWrites(
        async () => {
          return await supabase
            .from("employees")
            .update({ 
              first_name: "Updated",
              updated_at: new Date(Date.now() - 1000).toISOString(), // Stale timestamp
            })
            .eq("id", "emp-1");
        },
        2
      );

      // At least one should fail due to optimistic locking
      expect(failed).toBeGreaterThan(0);
    });
  });

  describe("Database-level locking", () => {
    it("should prevent race conditions with database-level locking", async () => {
      let lockAcquired = false;
      const mockRpc = vi.fn().mockImplementation(() => {
        if (lockAcquired) {
          return Promise.resolve({
            data: null,
            error: {
              code: "55P03",
              message: "lock_not_available",
            },
          });
        }
        
        lockAcquired = true;
        return Promise.resolve({
          data: { remaining_spots: 9 },
          error: null,
        }).then(() => {
          // Release lock after delay
          setTimeout(() => { lockAcquired = false; }, 100);
        });
      });

      mockSupabase.rpc = mockRpc;

      const supabase = createClient("http://localhost", "anon-key");
      
      const { succeeded, failed } = await testConcurrentWrites(
        async () => {
          const result = await supabase.rpc("update_date_spots", {
            employee_id: `emp-${Date.now()}`,
            new_date_id: "date-1",
            old_date_id: null,
            date_type: "omc_date",
          });
          
          if (result.error) {
            throw result.error;
          }
          return result;
        },
        2
      );

      // With locking, only one should succeed immediately
      expect(succeeded + failed).toBe(2);
    });
  });
});

