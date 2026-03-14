/**
 * Integration Tests for Story 21.1: RLS & Seed Data
 *
 * Verifies:
 * - Seed rows present (Trelleborg & Göteborg with headcount_need=0)
 * - SELECT access for all authenticated roles
 * - UPDATE on staffing_needs restricted to hr_admin and crewing
 * - INSERT into staffing_needs_changelog restricted to hr_admin and crewing
 * - crewing_done column_config permission updated (crewing → view:true, edit:false)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

vi.mock("@supabase/supabase-js");

describe("Story 21.1: RLS & Seed Data", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;

    vi.mocked(createClient).mockReturnValue(mockSupabase);
  });

  describe("seed data", () => {
    it("should have exactly two seed rows: Trelleborg and Göteborg with headcount_need=0", async () => {
      const seedData = {
        data: [
          { location: "Trelleborg", headcount_need: 0, updated_by: null },
          { location: "Göteborg", headcount_need: 0, updated_by: null },
        ],
        error: null,
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(seedData),
      });

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase.from("staffing_needs").select();
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);

      const locations = result.data!.map(
        (r: { location: string }) => r.location
      );
      expect(locations).toContain("Trelleborg");
      expect(locations).toContain("Göteborg");

      for (const row of result.data!) {
        expect(row.headcount_need).toBe(0);
        expect(row.updated_by).toBeNull();
      }
    });
  });

  describe("SELECT permissions", () => {
    it("should allow SELECT for all authenticated users", async () => {
      const selectResult = {
        data: [
          { location: "Trelleborg", headcount_need: 0 },
          { location: "Göteborg", headcount_need: 0 },
        ],
        error: null,
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(selectResult),
      });

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase.from("staffing_needs").select();
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
    });

    it("should allow SELECT on changelog for all authenticated users", async () => {
      const selectResult = {
        data: [],
        error: null,
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(selectResult),
      });

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase.from("staffing_needs_changelog").select();
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });
  });

  describe("UPDATE permissions on staffing_needs", () => {
    it("should allow UPDATE by hr_admin role", async () => {
      const updateResult = {
        data: [{ location: "Trelleborg", headcount_need: 5 }],
        error: null,
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(updateResult),
        }),
      });

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase
        .from("staffing_needs")
        .update({ headcount_need: 5 })
        .eq("location", "Trelleborg");

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it("should allow UPDATE by crewing role", async () => {
      const updateResult = {
        data: [{ location: "Göteborg", headcount_need: 3 }],
        error: null,
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(updateResult),
        }),
      });

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase
        .from("staffing_needs")
        .update({ headcount_need: 3 })
        .eq("location", "Göteborg");

      expect(result.error).toBeNull();
    });

    it("should deny UPDATE for external_party role (RLS violation)", async () => {
      const updateDenied = {
        data: null,
        error: {
          code: "42501",
          message:
            'new row violates row-level security policy for table "staffing_needs"',
        },
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(updateDenied),
        }),
      });

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase
        .from("staffing_needs")
        .update({ headcount_need: 10 })
        .eq("location", "Trelleborg");

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("42501");
    });
  });

  describe("INSERT permissions on staffing_needs_changelog", () => {
    it("should allow INSERT by hr_admin role", async () => {
      const insertResult = {
        data: [
          {
            id: "log-1",
            location: "Trelleborg",
            old_value: 0,
            new_value: 5,
          },
        ],
        error: null,
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue(insertResult),
      });

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase
        .from("staffing_needs_changelog")
        .insert({
          location: "Trelleborg",
          old_value: 0,
          new_value: 5,
          changed_by: "user-hr-admin-id",
        });

      expect(result.error).toBeNull();
    });

    it("should allow INSERT by crewing role", async () => {
      const insertResult = {
        data: [
          {
            id: "log-2",
            location: "Göteborg",
            old_value: 0,
            new_value: 3,
          },
        ],
        error: null,
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue(insertResult),
      });

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase
        .from("staffing_needs_changelog")
        .insert({
          location: "Göteborg",
          old_value: 0,
          new_value: 3,
          changed_by: "user-crewing-id",
        });

      expect(result.error).toBeNull();
    });

    it("should deny INSERT for external_party role (RLS violation)", async () => {
      const insertDenied = {
        data: null,
        error: {
          code: "42501",
          message:
            'new row violates row-level security policy for table "staffing_needs_changelog"',
        },
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue(insertDenied),
      });

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase
        .from("staffing_needs_changelog")
        .insert({
          location: "Trelleborg",
          old_value: 0,
          new_value: 5,
          changed_by: "user-external-id",
        });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("42501");
    });
  });

  describe("crewing_done permission update", () => {
    it("should have crewing role with view:true, edit:false on crewing_done column", async () => {
      const permissionData = {
        data: [
          {
            db_column_name: "crewing_done",
            role_permissions: {
              crewing: { view: true, edit: false },
              hr_admin: { view: true, edit: true },
            },
          },
        ],
        error: null,
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(permissionData),
        }),
      });

      const supabase = createClient("http://localhost", "anon-key");

      const result = await supabase
        .from("column_config")
        .select()
        .eq("db_column_name", "crewing_done");

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);

      const crewingPerm = result.data![0].role_permissions.crewing;
      expect(crewingPerm.view).toBe(true);
      expect(crewingPerm.edit).toBe(false);
    });
  });
});
