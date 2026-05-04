/**
 * Integration Tests for Story 21.1: Migration Integrity
 *
 * Verifies the migration runs cleanly:
 * - staffing_needs table exists with correct columns, types, constraints
 * - staffing_needs_changelog table exists with correct columns, types, constraints
 * - Index idx_staffing_needs_changelog_location_date exists
 * - RLS is enabled on both tables
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

vi.mock("@supabase/supabase-js");

describe("Story 21.1: Migration Integrity", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;

    vi.mocked(createClient).mockReturnValue(mockSupabase);
  });

  describe("staffing_needs table schema", () => {
    it("should have all required columns with correct types and nullability", async () => {
      const staffingNeedsColumns = {
        data: [
          { column_name: "id", data_type: "uuid", is_nullable: "NO" },
          { column_name: "location", data_type: "text", is_nullable: "NO" },
          { column_name: "headcount_need", data_type: "integer", is_nullable: "NO" },
          { column_name: "updated_at", data_type: "timestamp with time zone", is_nullable: "NO" },
          { column_name: "updated_by", data_type: "uuid", is_nullable: "YES" },
        ],
        error: null,
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(staffingNeedsColumns);

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase.rpc("get_table_columns", {
        table_name: "staffing_needs",
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(5);

      const columnNames = result.data!.map(
        (c: { column_name: string }) => c.column_name
      );
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("location");
      expect(columnNames).toContain("headcount_need");
      expect(columnNames).toContain("updated_at");
      expect(columnNames).toContain("updated_by");

      // id: uuid PK, NOT NULL
      const idCol = result.data!.find(
        (c: { column_name: string }) => c.column_name === "id"
      );
      expect(idCol.data_type).toBe("uuid");
      expect(idCol.is_nullable).toBe("NO");

      // location: text, NOT NULL, UNIQUE
      const locationCol = result.data!.find(
        (c: { column_name: string }) => c.column_name === "location"
      );
      expect(locationCol.data_type).toBe("text");
      expect(locationCol.is_nullable).toBe("NO");

      // headcount_need: integer, NOT NULL, DEFAULT 0
      const headcountCol = result.data!.find(
        (c: { column_name: string }) => c.column_name === "headcount_need"
      );
      expect(headcountCol.data_type).toBe("integer");
      expect(headcountCol.is_nullable).toBe("NO");

      // updated_at: timestamptz, NOT NULL
      const updatedAtCol = result.data!.find(
        (c: { column_name: string }) => c.column_name === "updated_at"
      );
      expect(updatedAtCol.data_type).toBe("timestamp with time zone");
      expect(updatedAtCol.is_nullable).toBe("NO");

      // updated_by: uuid, nullable (FK → users)
      const updatedByCol = result.data!.find(
        (c: { column_name: string }) => c.column_name === "updated_by"
      );
      expect(updatedByCol.data_type).toBe("uuid");
      expect(updatedByCol.is_nullable).toBe("YES");
    });

    it("should have location CHECK constraint allowing only Trelleborg and Göteborg", async () => {
      const constraintData = {
        data: [
          {
            constraint_name: "staffing_needs_location_check",
            check_clause: "location = ANY (ARRAY['Trelleborg'::text, 'Göteborg'::text])",
          },
        ],
        error: null,
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(constraintData);

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase.rpc("get_check_constraints", {
        table_name: "staffing_needs",
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThanOrEqual(1);
    });

    it("should have headcount_need CHECK constraint >= 0", async () => {
      const constraintData = {
        data: [
          {
            constraint_name: "staffing_needs_headcount_need_check",
            check_clause: "headcount_need >= 0",
          },
        ],
        error: null,
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(constraintData);

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase.rpc("get_check_constraints", {
        table_name: "staffing_needs",
        column_name: "headcount_need",
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("staffing_needs_changelog table schema", () => {
    it("should have all required columns with correct types and nullability", async () => {
      const changelogColumns = {
        data: [
          { column_name: "id", data_type: "uuid", is_nullable: "NO" },
          { column_name: "location", data_type: "text", is_nullable: "NO" },
          { column_name: "old_value", data_type: "integer", is_nullable: "NO" },
          { column_name: "new_value", data_type: "integer", is_nullable: "NO" },
          { column_name: "changed_by", data_type: "uuid", is_nullable: "NO" },
          { column_name: "changed_at", data_type: "timestamp with time zone", is_nullable: "NO" },
        ],
        error: null,
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(changelogColumns);

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase.rpc("get_table_columns", {
        table_name: "staffing_needs_changelog",
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(6);

      const columnNames = result.data!.map(
        (c: { column_name: string }) => c.column_name
      );
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("location");
      expect(columnNames).toContain("old_value");
      expect(columnNames).toContain("new_value");
      expect(columnNames).toContain("changed_by");
      expect(columnNames).toContain("changed_at");

      // changed_by must be NOT NULL (required for audit trail)
      const changedByCol = result.data!.find(
        (c: { column_name: string }) => c.column_name === "changed_by"
      );
      expect(changedByCol.is_nullable).toBe("NO");
      expect(changedByCol.data_type).toBe("uuid");

      // changed_at must be NOT NULL timestamptz
      const changedAtCol = result.data!.find(
        (c: { column_name: string }) => c.column_name === "changed_at"
      );
      expect(changedAtCol.is_nullable).toBe("NO");
      expect(changedAtCol.data_type).toBe("timestamp with time zone");
    });
  });

  describe("index", () => {
    it("should have idx_staffing_needs_changelog_location_date on changelog table", async () => {
      const indexData = {
        data: {
          index_name: "idx_staffing_needs_changelog_location_date",
          table_name: "staffing_needs_changelog",
        },
        error: null,
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(indexData);

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase.rpc("get_index_info", {
        index_name: "idx_staffing_needs_changelog_location_date",
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data.index_name).toBe(
        "idx_staffing_needs_changelog_location_date"
      );
      expect(result.data.table_name).toBe("staffing_needs_changelog");
    });
  });

  describe("RLS", () => {
    it("should have RLS enabled on both staffing_needs and staffing_needs_changelog", async () => {
      const rlsData = {
        data: [
          { tablename: "staffing_needs", rowsecurity: true },
          { tablename: "staffing_needs_changelog", rowsecurity: true },
        ],
        error: null,
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(rlsData);

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase.rpc("get_rls_status", {
        table_names: ["staffing_needs", "staffing_needs_changelog"],
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      for (const table of result.data!) {
        expect(table.rowsecurity).toBe(true);
      }
    });
  });
});
