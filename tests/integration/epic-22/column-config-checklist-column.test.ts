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

/**
 * Regression guard for the dashboard-era drift fixed by
 * 20260615000000_add_is_checklist_item_to_column_config.sql.
 *
 * `column_config.is_checklist_item` (Story 19.5) was added on the hosted DB via
 * the dashboard but never by a migration, so on a migration-built environment the
 * column was absent and custom-column creation failed with
 * "Could not find the 'is_checklist_item' column of 'column_config'".
 */
describe("column_config.is_checklist_item (adopted hosted column)", () => {
  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it("exists as a boolean NOT NULL column on a migration-built schema", async () => {
    const res = await client.query<{
      data_type: string;
      is_nullable: string;
    }>(
      `SELECT data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'column_config'
         AND column_name = 'is_checklist_item'`
    );

    expect(res.rows, "is_checklist_item should exist on column_config").toHaveLength(1);
    expect(res.rows[0].data_type).toBe("boolean");
    expect(res.rows[0].is_nullable).toBe("NO");
  });

  it("lets a custom column_config row be inserted with is_checklist_item (service role)", async () => {
    await client.query("BEGIN");
    try {
      const insert = await client.query(
        `INSERT INTO public.column_config
           (id, column_name, db_column_name, column_type, is_masterdata, role_permissions, is_checklist_item)
         VALUES (gen_random_uuid(), 'Checklist Probe', 'checklist_probe', 'boolean', false, '{}'::jsonb, false)
         RETURNING is_checklist_item`
      );
      expect(insert.rowCount).toBe(1);
      expect(insert.rows[0].is_checklist_item).toBe(false);
    } finally {
      await client.query("ROLLBACK");
    }
  });
});
