import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationsDirectory = resolve(process.cwd(), "supabase/migrations");
const seedPath = resolve(process.cwd(), "supabase/seed.sql");

function loadStoryMigration(): string {
  const matchingMigrations = readdirSync(migrationsDirectory).filter((name) =>
    name.endsWith("_remediate_pr_91_security_findings.sql")
  );

  expect(
    matchingMigrations,
    "Story 22.13 must have exactly one checked-in security migration"
  ).toHaveLength(1);

  return readFileSync(
    resolve(migrationsDirectory, matchingMigrations[0]),
    "utf8"
  );
}

describe("Story 22.13 database hardening migration", () => {
  it("authorizes staffing updates internally and rejects a spoofed actor id", () => {
    const sql = loadStoryMigration();

    expect(sql).toMatch(
      /create\s+or\s+replace\s+function\s+public\.update_staffing_need\s*\(/i
    );
    expect(sql).toMatch(/security\s+definer\s+set\s+search_path\s*=\s*''/i);
    expect(sql).toMatch(/auth\.uid\s*\(\s*\)/i);
    expect(sql).toMatch(/hr_admin/i);
    expect(sql).toMatch(/crewing/i);
    expect(sql).toMatch(/p_user_id\s+is\s+distinct\s+from/i);
  });

  it("creates custom-column metadata and DDL atomically without physical collisions", () => {
    const sql = loadStoryMigration();

    expect(sql).toMatch(
      /create\s+or\s+replace\s+function\s+public\.add_custom_column_to_employees\s*\(/i
    );
    expect(sql).toMatch(
      /revoke\s+execute\s+on\s+function\s+public\.add_custom_column_to_employees\s*\(\s*text\s*,\s*text\s*\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i
    );
    expect(sql).toMatch(
      /create\s+or\s+replace\s+function\s+public\.create_employee_column_config\s*\(/i
    );
    expect(sql).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.create_employee_column_config[^;]*to\s+service_role/i
    );
    expect(sql).toMatch(
      /information_schema\.columns[\s\S]*column_name\s*=\s*p_db_column_name[\s\S]*already exists/i
    );
    expect(sql).toMatch(
      /create_employee_column_config[\s\S]*insert\s+into\s+public\.column_config[\s\S]*alter\s+table\s+public\.employees/i
    );
  });

  it("replaces direct users-table updates with a caller-bound activity RPC", () => {
    const sql = loadStoryMigration();

    expect(sql).toMatch(
      /revoke\s+update\s+on\s+table\s+public\.users\s+from\s+authenticated/i
    );
    expect(sql).toMatch(
      /create\s+or\s+replace\s+function\s+public\.update_own_last_active_at\s*\(/i
    );
    expect(sql).toMatch(/where\s+auth_user_id\s*=\s*auth\.uid\s*\(\s*\)/i);
    expect(sql).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.update_own_last_active_at\s*\(\s*\)\s+to\s+authenticated/i
    );
  });

  it("prevents forged audit inserts and scopes reads through visible employees", () => {
    const sql = loadStoryMigration();

    expect(sql).toMatch(
      /revoke\s+insert\s+on\s+table\s+public\.employee_column_changes\s+from\s+authenticated/i
    );
    expect(sql).toMatch(
      /create\s+policy\s+"Authorized roles can read visible employee changes"/i
    );
    expect(sql).toMatch(
      /exists\s*\(\s*select\s+1\s+from\s+public\.employees/i
    );
    expect(sql).toMatch(/visible_column\.is_masterdata\s*=\s*true/i);
    expect(sql).toMatch(/caller\.is_active\s*=\s*true/i);
  });

  it("makes column configuration lifecycle HR Admin-only at the database boundary", () => {
    const sql = loadStoryMigration();

    expect(sql).toMatch(
      /drop\s+policy\s+if\s+exists\s+"Manage column configs"\s+on\s+public\.column_config/i
    );
    const policy = sql.match(
      /create\s+policy\s+"Manage column configs"[\s\S]*?;/i
    )?.[0];
    expect(policy).toBeDefined();
    expect(policy).toMatch(/caller\.auth_user_id\s*=\s*auth\.uid\s*\(\s*\)/i);
    expect(policy).toMatch(/caller\.role\s*=\s*'hr_admin'/i);
    expect(policy).toMatch(/caller\.is_active\s*=\s*true/i);
    expect(policy).not.toMatch(/sodexo|omc|payroll|toplux/);
  });

  it("preserves the revokes after seed.sql grants local API-role parity", () => {
    const seedSql = readFileSync(seedPath, "utf8");

    expect(seedSql).toMatch(
      /revoke\s+update\s+on\s+table\s+public\.users\s+from\s+authenticated/i
    );
    expect(seedSql).toMatch(
      /revoke\s+insert\s+on\s+table\s+public\.employee_column_changes\s+from\s+authenticated/i
    );
  });
});
