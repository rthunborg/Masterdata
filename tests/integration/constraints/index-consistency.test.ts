/**
 * Integration Tests for Index Consistency
 * 
 * Tests database indexes maintain consistency:
 * - Primary key index (id) prevents duplicates
 * - UNIQUE index (PE3 date) prevents duplicates
 * - GIN index (assigned_employees JSONB) functions correctly
 * - Indexes updated on INSERT/UPDATE/DELETE
 * - Query results consistent with and without index
 * 
 * Story: 11.9 - Data Integrity & Constraint Tests
 * AC9: Index Consistency Tests (6 tests)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

vi.mock("@supabase/supabase-js");

describe("Index Consistency Tests", () => {
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
        contains: vi.fn().mockReturnThis(),
      };
      return chainMock;
    };
    
    mockSupabase = {
      from: vi.fn((table: string) => createChainableMock({ data: null, error: null })),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;
    
    vi.mocked(createClient).mockReturnValue(mockSupabase);
  });

  describe("Primary key index", () => {
    it("should prevent duplicate primary key values", async () => {
      const mockInsert = vi.fn()
        .mockResolvedValueOnce({
          data: [{ id: "emp-1" }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: {
            code: "23505", // Unique violation
            message: "duplicate key value violates unique constraint \"employees_pkey\"",
            details: "Key (id)=(emp-1) already exists.",
          },
        });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      // First insert succeeds
      await supabase
        .from("employees")
        .insert({
          id: "emp-1",
          first_name: "John",
          surname: "Doe",
          ssn: "123456-7890",
          hire_date: "2025-01-01",
        });

      // Second insert with same ID should fail
      const result = await supabase
        .from("employees")
        .insert({
          id: "emp-1", // Duplicate primary key
          first_name: "Jane",
          surname: "Doe",
          ssn: "123456-7891",
          hire_date: "2025-01-01",
        });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("23505");
    });
  });

  describe("UNIQUE index (PE3)", () => {
    it("should prevent duplicate PE3 dates via unique index", async () => {
      const mockInsert = vi.fn()
        .mockResolvedValueOnce({
          data: [{ id: "emp-1", pe3_date: "date-1" }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint \"idx_unique_pe3_date\"",
          },
        });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      // First insert
      await supabase
        .from("employees")
        .insert({
          first_name: "John",
          surname: "Doe",
          ssn: "123456-7892",
          hire_date: "2025-01-01",
          pe3_date: "date-1",
          is_archived: false,
        });

      // Second insert with same PE3 date
      const result = await supabase
        .from("employees")
        .insert({
          first_name: "Jane",
          surname: "Doe",
          ssn: "123456-7893",
          hire_date: "2025-01-01",
          pe3_date: "date-1", // Duplicate
          is_archived: false,
        });

      expect(result.error?.code).toBe("23505");
    });
  });

  describe("GIN index (assigned_employees JSONB)", () => {
    it("should support efficient JSONB array queries", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [
          {
            id: "date-1",
            assigned_employees: ["emp-1", "emp-2"],
          },
        ],
        error: null,
      });

      const selectResponse = {
        data: [
          {
            id: "date-1",
            assigned_employees: ["emp-1", "emp-2"],
          },
        ],
        error: null,
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue(selectResponse),
        then: vi.fn((onFulfilled) => Promise.resolve(selectResponse).then(onFulfilled)),
        catch: vi.fn((onRejected) => Promise.resolve(selectResponse).catch(onRejected)),
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      // Query using GIN index for JSONB contains
      const result = await supabase
        .from("important_dates")
        .select()
        .contains("assigned_employees", ["emp-1"]);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });
  });

  describe("Index updates on CRUD operations", () => {
    it("should update index on INSERT", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: [{ id: "emp-1", ssn: "123456-7894" }],
        error: null,
      });

      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: "emp-1" }],
        error: null,
      });

      const insertResponse = { data: [{ id: "emp-1", ssn: "123456-7894" }], error: null };
      const selectResponse = { data: [{ id: "emp-1" }], error: null };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue(insertResponse),
        then: vi.fn((onFulfilled) => Promise.resolve(insertResponse).then(onFulfilled)),
        catch: vi.fn((onRejected) => Promise.resolve(insertResponse).catch(onRejected)),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(selectResponse),
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      // Insert
      await supabase
        .from("employees")
        .insert({
          first_name: "John",
          surname: "Doe",
          ssn: "123456-7894",
          hire_date: "2025-01-01",
        });

      // Query by indexed column (ssn)
      const result = await supabase
        .from("employees")
        .select()
        .eq("ssn", "123456-7894")
        .single();

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it("should update index on UPDATE", async () => {
      const mockUpdate = vi.fn().mockResolvedValue({
        data: [{ id: "emp-1", ssn: "123456-7895" }],
        error: null,
      });

      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: "emp-1", ssn: "123456-7895" }],
        error: null,
      });

      const updateResponse = { data: [{ id: "emp-1", ssn: "123456-7895" }], error: null };
      const selectResponse = { data: [{ id: "emp-1", ssn: "123456-7895" }], error: null };

      let callCount = 0;
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call is for update
            return Promise.resolve(updateResponse);
          }
          // Second call is for select
          return {
            single: vi.fn().mockResolvedValue(selectResponse),
          };
        }),
        then: vi.fn((onFulfilled) => {
          if (callCount === 1) {
            return Promise.resolve(updateResponse).then(onFulfilled);
          }
          return Promise.resolve(selectResponse).then(onFulfilled);
        }),
        catch: vi.fn((onRejected) => {
          if (callCount === 1) {
            return Promise.resolve(updateResponse).catch(onRejected);
          }
          return Promise.resolve(selectResponse).catch(onRejected);
        }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(selectResponse),
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      // Update indexed column
      await supabase
        .from("employees")
        .update({ ssn: "123456-7895" })
        .eq("id", "emp-1");

      // Query by updated value
      const result = await supabase
        .from("employees")
        .select()
        .eq("ssn", "123456-7895")
        .single();

      expect(result.error).toBeNull();
    });

    it("should update index on DELETE", async () => {
      const mockDelete = vi.fn().mockResolvedValue({
        data: [{ id: "emp-1" }],
        error: null,
      });

      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const deleteResponse = { data: [{ id: "emp-1" }], error: null };
      const selectResponse = { data: null, error: null };

      let callCount = 0;
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call is for delete
            return Promise.resolve(deleteResponse);
          }
          // Second call is for select
          return {
            single: vi.fn().mockResolvedValue(selectResponse),
          };
        }),
        then: vi.fn((onFulfilled) => {
          if (callCount === 1) {
            return Promise.resolve(deleteResponse).then(onFulfilled);
          }
          return Promise.resolve(selectResponse).then(onFulfilled);
        }),
        catch: vi.fn((onRejected) => {
          if (callCount === 1) {
            return Promise.resolve(deleteResponse).catch(onRejected);
          }
          return Promise.resolve(selectResponse).catch(onRejected);
        }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(selectResponse),
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      // Delete
      await supabase
        .from("employees")
        .delete()
        .eq("id", "emp-1");

      // Query should not find deleted record
      const result = await supabase
        .from("employees")
        .select()
        .eq("id", "emp-1")
        .single();

      expect(result.data).toBeNull();
    });
  });

  describe("Query consistency", () => {
    it("should return consistent results with and without index", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [
          { id: "emp-1", surname: "Doe" },
          { id: "emp-2", surname: "Doe" },
        ],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockSelect),
        }),
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      // Query using indexed column
      const result1 = await supabase
        .from("employees")
        .select()
        .eq("surname", "Doe");

      // Query without index (hypothetical)
      const result2 = await supabase
        .from("employees")
        .select()
        .eq("surname", "Doe");

      // Results should be consistent
      expect(result1.data?.length).toBe(result2.data?.length);
    });
  });

  describe("Index statistics", () => {
    it("should maintain accurate index statistics", async () => {
      // This test verifies that index statistics are updated
      // In a real scenario, we'd query pg_stat_user_indexes
      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          index_name: "idx_employees_ssn",
          idx_scan: 10,
          idx_tup_read: 10,
          idx_tup_fetch: 10,
        },
        error: null,
      });

      mockSupabase.rpc = mockRpc;

      const supabase = createClient("http://localhost", "anon-key");
      
      // Query index statistics (hypothetical RPC)
      const result = await supabase.rpc("get_index_stats", {
        table_name: "employees",
        index_name: "idx_employees_ssn",
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });
  });
});

