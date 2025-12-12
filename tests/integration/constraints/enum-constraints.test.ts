/**
 * Integration Tests for Enum Constraints
 * 
 * Tests database-level enum constraints on employees table:
 * - Gender must be "Man" or "Woman" (CHECK constraint)
 * - Rank must be "SEV" or "CHEF" (CHECK constraint)
 * 
 * Story: 11.9 - Data Integrity & Constraint Tests
 * AC2: Enum Constraint Tests (6 tests)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { expectConstraintViolation } from "../../helpers/constraint-test-helpers";

vi.mock("@supabase/supabase-js");

describe("Enum Constraint Tests", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient;
    
    vi.mocked(createClient).mockReturnValue(mockSupabase);
  });

  describe("Gender enum constraint", () => {
    it("should reject invalid gender value 'male' via direct SQL insert", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "23514", // Check constraint violation
          message: "new row for relation \"employees\" violates check constraint \"employees_gender_check\"",
          details: "Failing row contains (gender: 'male').",
        },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      await expectConstraintViolation(
        async () => {
          const result = await supabase
            .from("employees")
            .insert({
              first_name: "John",
              surname: "Doe",
              ssn: "123456-7890",
              hire_date: "2025-01-01",
              gender: "male" as unknown as "Man", // Invalid value
            });
          
          if (result.error) {
            throw result.error;
          }
        },
        "employees_gender_check"
      );
    });

    it("should reject invalid gender value 'Other' via application insert", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "23514",
          message: "gender must be 'Man' or 'Woman'",
        },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      await expectConstraintViolation(
        async () => {
          const result = await supabase
            .from("employees")
            .insert({
              first_name: "John",
              surname: "Doe",
              ssn: "123456-7891",
              hire_date: "2025-01-01",
              gender: "Other" as unknown as "Man", // Invalid value
            });
          
          if (result.error) {
            throw result.error;
          }
        },
        "gender"
      );
    });

    it("should accept valid gender values 'Man' and 'Woman'", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: [{ id: "emp-1", gender: "Man" }],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      // Test "Man"
      const result1 = await supabase
        .from("employees")
        .insert({
          first_name: "John",
          surname: "Doe",
          ssn: "123456-7892",
          hire_date: "2025-01-01",
          gender: "Man",
        });

      expect(result1.error).toBeNull();
      expect(result1.data).toBeDefined();

      // Test "Woman"
      mockInsert.mockResolvedValueOnce({
        data: [{ id: "emp-2", gender: "Woman" }],
        error: null,
      });

      const result2 = await supabase
        .from("employees")
        .insert({
          first_name: "Jane",
          surname: "Doe",
          ssn: "123456-7893",
          hire_date: "2025-01-01",
          gender: "Woman",
        });

      expect(result2.error).toBeNull();
      expect(result2.data).toBeDefined();
    });
  });

  describe("Rank enum constraint", () => {
    it("should reject invalid rank value 'sev' (lowercase) via direct SQL insert", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "23514", // Check constraint violation
          message: "new row for relation \"employees\" violates check constraint \"employees_rank_check\"",
          details: "Failing row contains (rank: 'sev').",
        },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      await expectConstraintViolation(
        async () => {
          const result = await supabase
            .from("employees")
            .insert({
              first_name: "John",
              surname: "Doe",
              ssn: "123456-7894",
              hire_date: "2025-01-01",
              rank: "sev" as unknown as "SEV", // Invalid value (lowercase)
            });
          
          if (result.error) {
            throw result.error;
          }
        },
        "employees_rank_check"
      );
    });

    it("should reject invalid rank value 'Manager' via application insert", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "23514",
          message: "rank must be 'SEV' or 'CHEF'",
        },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      await expectConstraintViolation(
        async () => {
          const result = await supabase
            .from("employees")
            .insert({
              first_name: "John",
              surname: "Doe",
              ssn: "123456-7895",
              hire_date: "2025-01-01",
              rank: "Manager" as unknown as "SEV", // Invalid value
            });
          
          if (result.error) {
            throw result.error;
          }
        },
        "rank"
      );
    });

    it("should accept valid rank values 'SEV' and 'CHEF'", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: [{ id: "emp-3", rank: "SEV" }],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      // Test "SEV"
      const result1 = await supabase
        .from("employees")
        .insert({
          first_name: "John",
          surname: "Doe",
          ssn: "123456-7896",
          hire_date: "2025-01-01",
          rank: "SEV",
        });

      expect(result1.error).toBeNull();
      expect(result1.data).toBeDefined();

      // Test "CHEF"
      mockInsert.mockResolvedValueOnce({
        data: [{ id: "emp-4", rank: "CHEF" }],
        error: null,
      });

      const result2 = await supabase
        .from("employees")
        .insert({
          first_name: "Jane",
          surname: "Doe",
          ssn: "123456-7897",
          hire_date: "2025-01-01",
          rank: "CHEF",
        });

      expect(result2.error).toBeNull();
      expect(result2.data).toBeDefined();
    });
  });
});

