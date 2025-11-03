/**
 * Integration Test: External Party Custom Column Seeding
 * Story 7.2 - Tests custom columns for ÖMC, Payroll, Toplux, and Sodexo
 */

import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load actual environment variables for integration tests
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe("External Party Custom Columns - Story 7.2", () => {
  describe("ÖMC Custom Columns (AC 1, 5, 6)", () => {
    it("should have all 13 ÖMC custom columns configured", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("*")
        .eq("is_masterdata", false)
        .order("display_order");

      const omcColumns = columns?.filter(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.omc?.view === true;
      });

      expect(omcColumns).toBeDefined();
      expect(omcColumns).toHaveLength(13);
    });

    it("should have correct ÖMC column names in order", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("column_name, display_order")
        .eq("is_masterdata", false)
        .gte("display_order", 100)
        .lt("display_order", 200)
        .order("display_order");

      const expectedColumns = [
        "Hotel Required?",
        "Room Number (Shared)",
        "Dietary Requirement?",
        "Joining Instructions sent",
        "Candidate Confirmed",
        "Seably",
        "Receipt C-17",
        "C-17 Certificate",
        "Receipt C-18",
        "C-18 Certificate",
        "ÖMC Certificate",
        "Uploaded in CrewSF",
        "Completed"
      ];

      expect(columns?.map(c => c.column_name)).toEqual(expectedColumns);
    });

    it("should have correct ÖMC column types (11 boolean, 2 text)", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("column_name, column_type")
        .eq("is_masterdata", false)
        .gte("display_order", 100)
        .lt("display_order", 200);

      const booleanColumns = columns?.filter(c => c.column_type === "boolean");
      const textColumns = columns?.filter(c => c.column_type === "text");

      expect(booleanColumns).toHaveLength(11);
      expect(textColumns).toHaveLength(2);
      expect(textColumns?.map(c => c.column_name).sort()).toEqual(["Room Number (Shared)", "Seably"]);
    });

    it("should have ÖMC edit permissions for ÖMC role", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("role_permissions")
        .eq("is_masterdata", false)
        .gte("display_order", 100)
        .lt("display_order", 200);

      const allEditableByOmc = columns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.omc?.view === true && perms.omc?.edit === true;
      });

      expect(allEditableByOmc).toBe(true);
    });
  });

  describe("Payroll Custom Columns (AC 2, 5, 6)", () => {
    it("should have all 4 Payroll custom columns configured", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("*")
        .eq("is_masterdata", false)
        .gte("display_order", 200)
        .lt("display_order", 300)
        .order("display_order");

      expect(columns).toBeDefined();
      expect(columns).toHaveLength(4);
    });

    it("should have correct Payroll column names in order", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("column_name, display_order")
        .eq("is_masterdata", false)
        .gte("display_order", 200)
        .lt("display_order", 300)
        .order("display_order");

      const expectedColumns = ["Ersatt", "Fartyg", "Klart/sign", "Notering"];

      expect(columns?.map(c => c.column_name)).toEqual(expectedColumns);
    });

    it("should have all Payroll columns as text type", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("column_type")
        .eq("is_masterdata", false)
        .gte("display_order", 200)
        .lt("display_order", 300);

      const allText = columns?.every(c => c.column_type === "text");
      expect(allText).toBe(true);
    });

    it("should have Payroll edit permissions for Payroll role", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("role_permissions")
        .eq("is_masterdata", false)
        .gte("display_order", 200)
        .lt("display_order", 300);

      const allEditableByPayroll = columns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.payroll?.view === true && perms.payroll?.edit === true;
      });

      expect(allEditableByPayroll).toBe(true);
    });
  });

  describe("Toplux Custom Columns (AC 4, 5, 6)", () => {
    it("should have all 9 Toplux custom columns configured", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("*")
        .eq("is_masterdata", false)
        .gte("display_order", 300)
        .lt("display_order", 400)
        .order("display_order");

      expect(columns).toBeDefined();
      expect(columns).toHaveLength(9);
    });

    it("should have correct Toplux column names in order", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("column_name, display_order")
        .eq("is_masterdata", false)
        .gte("display_order", 300)
        .lt("display_order", 400)
        .order("display_order");

      const expectedColumns = [
        "Stena ID- Origo nummer",
        "Beställning gjord",
        "Fartyg (Toplux)",
        "Skickat beställning till Fartyg/Warehouse",
        "Mottaget",
        "Kontaktat medarbetare",
        "Uthämtat",
        "Mottagit kort",
        "Skickat kort till fartyg"
      ];

      expect(columns?.map(c => c.column_name)).toEqual(expectedColumns);
    });

    it("should have correct Toplux column types (3 text, 6 date)", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("column_name, column_type")
        .eq("is_masterdata", false)
        .gte("display_order", 300)
        .lt("display_order", 400);

      const textColumns = columns?.filter(c => c.column_type === "text");
      const dateColumns = columns?.filter(c => c.column_type === "date");

      expect(textColumns).toHaveLength(3);
      expect(dateColumns).toHaveLength(6);
      expect(textColumns?.map(c => c.column_name).sort()).toEqual([
        "Fartyg (Toplux)",
        "Kontaktat medarbetare",
        "Stena ID- Origo nummer"
      ].sort());
    });

    it("should have Toplux edit permissions for Toplux role", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("role_permissions")
        .eq("is_masterdata", false)
        .gte("display_order", 300)
        .lt("display_order", 400);

      const allEditableByToplux = columns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.toplux?.view === true && perms.toplux?.edit === true;
      });

      expect(allEditableByToplux).toBe(true);
    });
  });

  describe("Sodexo Configuration (AC 3)", () => {
    it("should have no custom columns visible to Sodexo role", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("*")
        .eq("is_masterdata", false);

      const sodexoVisibleColumns = columns?.filter(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.sodexo?.view === true;
      });

      expect(sodexoVisibleColumns).toHaveLength(0);
    });
  });

  describe("Column Isolation Between Roles (AC 7)", () => {
    it("should isolate ÖMC columns from Payroll, Toplux, and Sodexo", async () => {
      const { data: omcColumns } = await supabase
        .from("column_config")
        .select("role_permissions")
        .eq("is_masterdata", false)
        .gte("display_order", 100)
        .lt("display_order", 200);

      const noPayrollAccess = omcColumns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.payroll?.view === false;
      });

      const noTopluxAccess = omcColumns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.toplux?.view === false;
      });

      const noSodexoAccess = omcColumns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.sodexo?.view === false;
      });

      expect(noPayrollAccess).toBe(true);
      expect(noTopluxAccess).toBe(true);
      expect(noSodexoAccess).toBe(true);
    });

    it("should isolate Payroll columns from ÖMC, Toplux, and Sodexo", async () => {
      const { data: payrollColumns } = await supabase
        .from("column_config")
        .select("role_permissions")
        .eq("is_masterdata", false)
        .gte("display_order", 200)
        .lt("display_order", 300);

      const noOmcAccess = payrollColumns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.omc?.view === false;
      });

      const noTopluxAccess = payrollColumns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.toplux?.view === false;
      });

      const noSodexoAccess = payrollColumns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.sodexo?.view === false;
      });

      expect(noOmcAccess).toBe(true);
      expect(noTopluxAccess).toBe(true);
      expect(noSodexoAccess).toBe(true);
    });

    it("should isolate Toplux columns from ÖMC, Payroll, and Sodexo", async () => {
      const { data: topluxColumns } = await supabase
        .from("column_config")
        .select("role_permissions")
        .eq("is_masterdata", false)
        .gte("display_order", 300)
        .lt("display_order", 400);

      const noOmcAccess = topluxColumns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.omc?.view === false;
      });

      const noPayrollAccess = topluxColumns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.payroll?.view === false;
      });

      const noSodexoAccess = topluxColumns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.sodexo?.view === false;
      });

      expect(noOmcAccess).toBe(true);
      expect(noPayrollAccess).toBe(true);
      expect(noSodexoAccess).toBe(true);
    });
  });

  describe("HR Admin Preview Mode (AC 10)", () => {
    it("should allow HR Admin view access to all custom columns", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("role_permissions")
        .eq("is_masterdata", false);

      const allViewableByHrAdmin = columns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.hr_admin?.view === true;
      });

      expect(allViewableByHrAdmin).toBe(true);
    });

    it("should NOT allow HR Admin edit access to custom columns", async () => {
      const { data: columns } = await supabase
        .from("column_config")
        .select("role_permissions")
        .eq("is_masterdata", false);

      const noEditByHrAdmin = columns?.every(c => {
        const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
        return perms.hr_admin?.edit === false;
      });

      expect(noEditByHrAdmin).toBe(true);
    });
  });

  describe("Display Order Strategy (AC 6)", () => {
    it("should have ÖMC columns in display order 100-199", async () => {
      const { data: omcColumns } = await supabase
        .from("column_config")
        .select("display_order")
        .eq("is_masterdata", false)
        .gte("display_order", 100)
        .lt("display_order", 200);

      expect(omcColumns).toHaveLength(13);
      expect(omcColumns?.every(c => c.display_order >= 100 && c.display_order < 200)).toBe(true);
    });

    it("should have Payroll columns in display order 200-299", async () => {
      const { data: payrollColumns } = await supabase
        .from("column_config")
        .select("display_order")
        .eq("is_masterdata", false)
        .gte("display_order", 200)
        .lt("display_order", 300);

      expect(payrollColumns).toHaveLength(4);
      expect(payrollColumns?.every(c => c.display_order >= 200 && c.display_order < 300)).toBe(true);
    });

    it("should have Toplux columns in display order 300-399", async () => {
      const { data: topluxColumns } = await supabase
        .from("column_config")
        .select("display_order")
        .eq("is_masterdata", false)
        .gte("display_order", 300)
        .lt("display_order", 400);

      expect(topluxColumns).toHaveLength(9);
      expect(topluxColumns?.every(c => c.display_order >= 300 && c.display_order < 400)).toBe(true);
    });
  });
});
