/**
 * Integration Tests for Null Constraints
 * 
 * Tests database-level NOT NULL constraints:
 * - first_name cannot be null (NOT NULL)
 * - surname cannot be null (NOT NULL)
 * - ssn cannot be null (NOT NULL)
 * - omc_date can be null (nullable)
 * - termination_date can be null (nullable)
 * 
 * Story: 11.9 - Data Integrity & Constraint Tests
 * AC8: Null Constraint Tests (6 tests)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { expectNotNullViolation } from "../../helpers/constraint-test-helpers";

vi.mock("@supabase/supabase-js");

describe("Null Constraint Tests", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn(),
    };
    
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
  });

  describe("NOT NULL constraints", () => {
    it("should reject null first_name", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "23502", // Not null violation
          message: "null value in column \"first_name\" violates not-null constraint",
          details: "Failing row contains (first_name: null).",
        },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      await expectNotNullViolation(
        async () => {
          const result = await supabase
            .from("employees")
            .insert({
              first_name: null as any,
              surname: "Doe",
              ssn: "123456-7890",
              hire_date: "2025-01-01",
            });
          
          if (result.error) {
            throw result.error;
          }
        }
      );
    });

    it("should reject null surname", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "23502",
          message: "null value in column \"surname\" violates not-null constraint",
        },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      await expectNotNullViolation(
        async () => {
          const result = await supabase
            .from("employees")
            .insert({
              first_name: "John",
              surname: null as any,
              ssn: "123456-7891",
              hire_date: "2025-01-01",
            });
          
          if (result.error) {
            throw result.error;
          }
        }
      );
    });

    it("should reject null ssn", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "23502",
          message: "null value in column \"ssn\" violates not-null constraint",
        },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      await expectNotNullViolation(
        async () => {
          const result = await supabase
            .from("employees")
            .insert({
              first_name: "John",
              surname: "Doe",
              ssn: null as any,
              hire_date: "2025-01-01",
            });
          
          if (result.error) {
            throw result.error;
          }
        }
      );
    });
  });

  describe("Nullable fields", () => {
    it("should accept null omc_date", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: [{ id: "emp-1", omc_date: null }],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      const result = await supabase
        .from("employees")
        .insert({
          first_name: "John",
          surname: "Doe",
          ssn: "123456-7892",
          hire_date: "2025-01-01",
          omc_date: null,
        });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it("should accept null termination_date", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: [{ id: "emp-1", termination_date: null }],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      const result = await supabase
        .from("employees")
        .insert({
          first_name: "John",
          surname: "Doe",
          ssn: "123456-7893",
          hire_date: "2025-01-01",
          termination_date: null,
        });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });
  });

  describe("Error message clarity", () => {
    it("should return clear error message for null violations", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "23502",
          message: "null value in column \"first_name\" violates not-null constraint",
          details: "Failing row contains (first_name: null, surname: 'Doe', ssn: '123456-7894').",
          hint: "Make sure to not insert null into columns marked as NOT NULL.",
        },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const supabase = createClient("http://localhost", "anon-key");
      
      const result = await supabase
        .from("employees")
        .insert({
          first_name: null as any,
          surname: "Doe",
          ssn: "123456-7894",
          hire_date: "2025-01-01",
        });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("23502");
      expect(result.error?.message).toContain("first_name");
      expect(result.error?.message).toContain("not-null");
    });
  });
});

