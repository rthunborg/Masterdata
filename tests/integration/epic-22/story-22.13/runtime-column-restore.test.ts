import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  assertEpic22DatabaseFingerprint,
  formatEpic22SupabaseSkipDiagnostic,
  isEpic22DatabaseReachable,
  loadEpic22SupabaseTestEnvironment,
} from "../../../helpers/epic-22-supabase-test-environment";

const testEnvironment = loadEpic22SupabaseTestEnvironment();
const client = new Client({ connectionString: testEnvironment.dbUrl });
const databaseReachable = await isEpic22DatabaseReachable(
  testEnvironment.dbUrl
);
const syncSql = readFileSync(
  resolve(
    process.cwd(),
    ".github/backup/sync-runtime-employee-columns.sql"
  ),
  "utf8"
);
const runtimeColumn = `story_22_13_restore_${randomUUID().replaceAll("-", "")}`;

if (!databaseReachable) {
  console.warn(formatEpic22SupabaseSkipDiagnostic(testEnvironment));
}

describe.skipIf(!databaseReachable)(
  "Story 22.13 runtime employee-column restore",
  () => {
    beforeAll(async () => {
      await client.connect();
      await assertEpic22DatabaseFingerprint(client);
      await client.query("BEGIN");
    });

    afterAll(async () => {
      await client.query("ROLLBACK").catch(() => {});
      await client.end();
    });

    it("creates a missing config-backed boolean column before employee replay", async () => {
      await client.query(
        `INSERT INTO public.column_config
          (column_name, db_column_name, column_type, is_masterdata, role_permissions)
         VALUES ('Story 22.13 restore probe', $1, 'boolean', true, '{}'::jsonb)`,
        [runtimeColumn]
      );

      await client.query(syncSql);

      const physicalColumn = await client.query<{
        data_type: string;
      }>(
        `SELECT data_type
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'employees'
           AND column_name = $1`,
        [runtimeColumn]
      );
      const configuration = await client.query<{
        column_type: string;
        is_masterdata: boolean;
      }>(
        `SELECT column_type, is_masterdata
         FROM public.column_config
         WHERE db_column_name = $1`,
        [runtimeColumn]
      );

      expect(physicalColumn.rows).toEqual([{ data_type: "boolean" }]);
      expect(configuration.rows).toEqual([
        { column_type: "boolean", is_masterdata: true },
      ]);
    });

    it("fails closed when a migration-owned employee column is missing", async () => {
      await client.query("SAVEPOINT missing_migration_owned_column");
      await client.query(
        "ALTER TABLE public.employees DROP COLUMN first_name"
      );

      await expect(client.query(syncSql)).rejects.toThrow(
        /Missing migration-owned employee column: first_name/
      );

      await client.query("ROLLBACK TO SAVEPOINT missing_migration_owned_column");
      await client.query("RELEASE SAVEPOINT missing_migration_owned_column");
    });

    it("rejects an unsafe identifier without executing injected SQL", async () => {
      await client.query("SAVEPOINT unsafe_runtime_column");
      await client.query(
        `INSERT INTO public.column_config
          (column_name, db_column_name, column_type, is_masterdata, role_permissions)
         VALUES ('Unsafe restore probe', $1, 'text', false, '{}'::jsonb)`,
        ['unsafe"; DROP TABLE public.users; --']
      );

      await expect(client.query(syncSql)).rejects.toThrow(
        /Invalid runtime employee column identifier/
      );
      await client.query("ROLLBACK TO SAVEPOINT unsafe_runtime_column");
      await client.query("RELEASE SAVEPOINT unsafe_runtime_column");

      const usersTable = await client.query<{ table_name: string | null }>(
        "SELECT to_regclass('public.users')::text AS table_name"
      );
      expect(usersTable.rows).toEqual([{ table_name: "users" }]);
    });
  }
);
