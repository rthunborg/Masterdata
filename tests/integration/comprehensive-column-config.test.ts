/**
 * Integration Test: Comprehensive Column Configuration
 * Story 7.1 - Tests column configuration for all 24 masterdata columns
 */

import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { ColumnConfig } from "@/lib/types/column-config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe("Comprehensive Column Configuration - Story 7.1", () => {
  it("should have all 24 masterdata columns configured", async () => {
    const { data: columns, error } = await supabase
      .from("column_config")
      .select("*")
      .eq("is_masterdata", true)
      .order("display_order");

    expect(error).toBeNull();
    expect(columns).toBeDefined();
    expect(columns).toHaveLength(24);
  });

  it("should have correct display order for all columns", async () => {
    const { data: columns } = await supabase
      .from("column_config")
      .select("column_name, display_order")
      .eq("is_masterdata", true)
      .order("display_order");

    const expectedOrder = [
      "Stena Date", "ÖMC Date", "PE3 Date", "First Name", "Surname",
      "Town District", "Mobile", "Email", "Social Security No.", "Rank",
      "Gender", "Comments", "One", "ISPS", "Photo", "Origo",
      "Lönenivå", "Mail lön", "Bankuppgifter", "LI", "Passport",
      "Kvitto C17/18", "C17", "Crewing/Done"
    ];

    expect(columns?.map(c => c.column_name)).toEqual(expectedOrder);
  });

  it("should have correct ÖMC permissions", async () => {
    const { data: columns } = await supabase
      .from("column_config")
      .select("column_name, role_permissions")
      .eq("is_masterdata", true);

    const omcVisibleColumns = columns?.filter(c => {
      const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
      const omcPerms = perms.omc;
      return omcPerms && omcPerms.view === true;
    });

    const expectedOmcColumns = [
      "ÖMC Date", "First Name", "Surname", "Mobile", 
      "Email", "Social Security No.", "Rank", "Gender"
    ];

    expect(omcVisibleColumns?.map(c => c.column_name).sort()).toEqual(expectedOmcColumns.sort());
  });

  it("should have correct Payroll permissions", async () => {
    const { data: columns } = await supabase
      .from("column_config")
      .select("column_name, role_permissions")
      .eq("is_masterdata", true);

    const payrollVisibleColumns = columns?.filter(c => {
      const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
      const payrollPerms = perms.payroll;
      return payrollPerms && payrollPerms.view === true;
    });

    const expectedPayrollColumns = [
      "Stena Date", "First Name", "Surname", "Mobile",
      "Email", "Social Security No.", "Rank"
    ];

    expect(payrollVisibleColumns?.map(c => c.column_name).sort()).toEqual(expectedPayrollColumns.sort());
  });

  it("should have correct Sodexo permissions", async () => {
    const { data: columns } = await supabase
      .from("column_config")
      .select("column_name, role_permissions")
      .eq("is_masterdata", true);

    const sodexoVisibleColumns = columns?.filter(c => {
      const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
      const sodexoPerms = perms.sodexo;
      return sodexoPerms && sodexoPerms.view === true;
    });

    const expectedSodexoColumns = ["Stena Date", "First Name", "Surname"];

    expect(sodexoVisibleColumns?.map(c => c.column_name).sort()).toEqual(expectedSodexoColumns.sort());
  });

  it("should have correct Toplux permissions", async () => {
    const { data: columns } = await supabase
      .from("column_config")
      .select("column_name, role_permissions")
      .eq("is_masterdata", true);

    const topluxVisibleColumns = columns?.filter(c => {
      const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
      const topluxPerms = perms.toplux;
      return topluxPerms && topluxPerms.view === true;
    });

    const expectedTopluxColumns = [
      "Stena Date", "First Name", "Surname", "Town District",
      "Mobile", "Email", "Social Security No.", "Rank"
    ];

    expect(topluxVisibleColumns?.map(c => c.column_name).sort()).toEqual(expectedTopluxColumns.sort());
  });

  it("should have HR Admin with full edit permissions on all columns", async () => {
    const { data: columns } = await supabase
      .from("column_config")
      .select("column_name, role_permissions")
      .eq("is_masterdata", true);

    const hrAdminColumns = columns?.filter(c => {
      const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
      const hrPerms = perms.hr_admin;
      return hrPerms && hrPerms.view === true && hrPerms.edit === true;
    });

    expect(hrAdminColumns).toHaveLength(24);
  });

  it("should have correct column types", async () => {
    const { data: columns } = await supabase
      .from("column_config")
      .select("column_name, column_type")
      .eq("is_masterdata", true);

    const allText = columns?.every(c => c.column_type === "text");
    expect(allText).toBe(true);
  });
});
