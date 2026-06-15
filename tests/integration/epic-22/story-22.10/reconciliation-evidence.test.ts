import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { validateNonProductionSupabaseEnvironment } from "@/lib/env/non-production-supabase-guard";

loadEnv({ path: ".env.test", override: true });

const dbUrl =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

validateNonProductionSupabaseEnvironment({
  ...process.env,
  NODE_ENV: "test",
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  SUPABASE_DB_URL: dbUrl,
});

const client = new Client({ connectionString: dbUrl });

// Functions that Story 22.10 pins search_path on (function_search_path_mutable).
const SEARCH_PATH_FUNCTIONS = [
  "public.get_user_role()",
  "public.update_updated_at_column()",
  "public.trigger_set_updated_at()",
  "public.remove_jsonb_key(text, text)",
  "public.add_custom_column_to_employees(text, text)",
  "public.update_staffing_need(text, integer, uuid)",
  "public.update_date_spots(uuid, uuid, uuid, text, jsonb)",
  "public.release_date_capacity(uuid, uuid)",
  "public.recalculate_rooms_for_date(uuid)",
  "public.calculate_room_number(uuid, text, text)",
  "public.track_employee_column_changes()",
];

async function execPrivilege(role: string, signature: string) {
  const res = await client.query<{ allowed: boolean }>(
    "SELECT has_function_privilege($1, $2, 'EXECUTE') AS allowed",
    [role, signature]
  );
  return res.rows[0]?.allowed ?? false;
}

describe("Story 22.10 Supabase reconciliation evidence", () => {
  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it("pins search_path on every flagged function", async () => {
    for (const fn of SEARCH_PATH_FUNCTIONS) {
      const res = await client.query<{ proconfig: string[] | null }>(
        "SELECT proconfig FROM pg_proc WHERE oid = to_regprocedure($1)",
        [fn]
      );
      expect(res.rows, `${fn} should exist`).toHaveLength(1);
      const hasSearchPath = (res.rows[0].proconfig ?? []).some((c) =>
        c.toLowerCase().startsWith("search_path=")
      );
      expect(hasSearchPath, `${fn} should pin search_path`).toBe(true);
    }
  });

  it("locks down remove_jsonb_key to service_role (no anon/authenticated execute)", async () => {
    const sig = "public.remove_jsonb_key(text, text)";
    expect(await execPrivilege("anon", sig)).toBe(false);
    expect(await execPrivilege("authenticated", sig)).toBe(false);
    expect(await execPrivilege("service_role", sig)).toBe(true);
  });

  it("keeps authenticated execute but drops anon on privileged SECURITY DEFINER RPCs", async () => {
    for (const sig of [
      "public.add_custom_column_to_employees(text, text)",
      "public.update_staffing_need(text, integer, uuid)",
    ]) {
      expect(await execPrivilege("anon", sig), `${sig} anon`).toBe(false);
      expect(
        await execPrivilege("authenticated", sig),
        `${sig} authenticated`
      ).toBe(true);
    }
  });

  it("keeps get_user_role executable for RLS evaluation (documented residual)", async () => {
    const sig = "public.get_user_role()";
    expect(await execPrivilege("authenticated", sig)).toBe(true);
    expect(await execPrivilege("anon", sig)).toBe(true);
  });

  it("removes staging-only junk columns from employees", async () => {
    const res = await client.query<{ column_name: string }>(
      `
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'employees'
        AND column_name IN ('asdas', 'testerere')
      `
    );
    expect(res.rows).toEqual([]);
  });

  it("adopts the hosted important_dates deadline columns into migrations", async () => {
    const res = await client.query<{ column_name: string }>(
      `
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'important_dates'
        AND column_name IN ('deadline_submit', 'deadline_cancel')
      ORDER BY column_name
      `
    );
    expect(res.rows.map((r) => r.column_name)).toEqual([
      "deadline_cancel",
      "deadline_submit",
    ]);
  });

  it("drops dashboard-era hosted-only policies", async () => {
    const res = await client.query<{ policyname: string }>(
      `
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND policyname IN (
        'HR Admin can do anything with employees',
        'External parties can view active employees',
        'Admin Limited can view all employees',
        'Admin Limited can update employees',
        'Admin Limited can view important dates',
        'Anyone can read column config',
        'staffing_needs_select_authenticated',
        'staffing_needs_update_hr_admin_crewing'
      )
      `
    );
    expect(res.rows).toEqual([]);
  });

  it("collapses users policies to one per action (merged select/update)", async () => {
    const res = await client.query<{ cmd: string; n: string }>(
      `
      SELECT cmd, count(*)::text AS n FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'users'
      GROUP BY cmd ORDER BY cmd
      `
    );
    const byCmd = Object.fromEntries(res.rows.map((r) => [r.cmd, Number(r.n)]));
    expect(byCmd.SELECT).toBe(1);
    expect(byCmd.UPDATE).toBe(1);
    expect(byCmd.INSERT).toBe(1);
  });

  it("lets an authenticated HR admin manage custom column_config rows (R-023)", async () => {
    const hrSub = "44444444-4444-4444-4444-444444444444";
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE service_role");
      await client.query(
        `INSERT INTO public.users (id, auth_user_id, email, role, is_active)
         VALUES (gen_random_uuid(), $1, 'recon-hr@example.test', 'hr_admin', true)`,
        [hrSub]
      );
      await client.query(
        `INSERT INTO public.column_config (id, column_name, db_column_name, column_type, is_masterdata, role_permissions)
         VALUES (gen_random_uuid(), 'Recon Custom', 'recon_custom', 'text', false, '{}'::jsonb)`
      );
      await client.query("RESET ROLE");
      await client.query("SET LOCAL ROLE authenticated");
      await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [
        hrSub,
      ]);
      await client.query(
        "SELECT set_config('request.jwt.claim.role', 'authenticated', true)"
      );

      // HR admin must be able to create AND delete a custom (is_masterdata=false)
      // column via RLS — the app's column-admin feature depends on it.
      const insert = await client.query(
        `INSERT INTO public.column_config (column_name, db_column_name, column_type, is_masterdata, role_permissions)
         VALUES ('Recon Custom 2', 'recon_custom2', 'text', false, '{}'::jsonb) RETURNING id`
      );
      expect(insert.rowCount).toBe(1);

      const del = await client.query(
        "DELETE FROM public.column_config WHERE db_column_name = 'recon_custom'"
      );
      expect(del.rowCount).toBe(1);
    } finally {
      await client.query("RESET ROLE");
      await client.query("ROLLBACK");
    }
  });

  it("scopes role-checked policies to authenticated and wraps auth lookups in (select ...)", async () => {
    const res = await client.query<{
      roles: string;
      qual: string | null;
    }>(
      `
      SELECT roles::text AS roles, qual FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'employees'
        AND policyname = 'External parties can view employees'
      `
    );
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].roles).toBe("{authenticated}");
    // auth_rls_initplan optimization: get_user_role() is wrapped in a sub-select.
    expect(res.rows[0].qual?.toLowerCase()).toContain("select get_user_role");
  });

  it("recreates exactly the canonical policy set on every managed table (catches drops and extras)", async () => {
    // The reconciliation migration drops ALL policies on these tables and
    // recreates this exact set. Asserting the full per-table set catches both a
    // missing policy (e.g. a user_filters lockout) and an unintended extra.
    const expected: Record<string, string[]> = {
      employees: [
        "External parties can view employees",
        "HR Admin and Recruiter can manage employees",
      ],
      column_config: [
        "Everyone can read column configs",
        "Manage column configs",
      ],
      important_dates: [
        "Everyone can read important dates",
        "HR Admin and Recruiter can manage important dates",
      ],
      staffing_needs: ["staffing_needs_select", "staffing_needs_update"],
      staffing_needs_changelog: [
        "staffing_needs_changelog_insert",
        "staffing_needs_changelog_select",
      ],
      user_filters: [
        "Users can create their own filters",
        "Users can delete their own filters",
        "Users can update their own filters",
        "Users can view their own filters",
      ],
      employee_column_changes: [
        "Enable insert for authenticated users",
        "Enable select for authenticated users",
      ],
      users: [
        "HR Admin can insert users",
        "Users can read users",
        "Users can update users",
      ],
    };

    let total = 0;
    for (const [table, names] of Object.entries(expected)) {
      const res = await client.query<{ policyname: string }>(
        `SELECT policyname FROM pg_policies
         WHERE schemaname = 'public' AND tablename = $1`,
        [table]
      );
      // Sort both sides in JS so the comparison is collation-independent.
      const got = res.rows.map((r) => r.policyname).sort();
      expect(got, `${table} canonical policy set`).toEqual([...names].sort());
      total += names.length;
    }
    expect(total, "total canonical policies across managed tables").toBe(19);
  });
});
