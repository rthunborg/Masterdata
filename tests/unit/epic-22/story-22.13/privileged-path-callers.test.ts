import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Story 22.13 controlled privileged callers", () => {
  it("creates custom-column metadata and DDL through one server-only RPC", () => {
    const repository = source(
      "src/lib/server/repositories/column-config-repository.ts"
    );
    const route = source("src/app/api/columns/route.ts");

    expect(repository).toContain("createServiceRoleClient");
    expect(repository).toMatch(
      /createServiceRoleClient\(\)[\s\S]*?\.rpc\(\s*['"]create_employee_column_config['"]/m
    );
    expect(repository).not.toMatch(/\.rpc\(\s*['"]add_custom_column_to_employees['"]/);
    expect(route).toMatch(/const\s+user\s*=\s*await\s+requireHRAdminAPI\(request\)/);
  });

  it("uses the caller-bound activity RPC in repository and middleware paths", () => {
    const repository = source(
      "src/lib/server/repositories/user-repository.ts"
    );
    const middleware = source("middleware.ts");

    expect(repository).toMatch(
      /\.rpc\(\s*['"]update_own_last_active_at['"]\s*\)/
    );
    expect(middleware).toMatch(
      /\.rpc\(\s*['"]update_own_last_active_at['"]\s*\)/
    );
    expect(repository).not.toMatch(
      /\.from\(\s*['"]users['"]\s*\)[\s\S]{0,160}?\.update\(/
    );
    expect(middleware).not.toMatch(
      /\.from\(\s*['"]users['"]\s*\)[\s\S]{0,160}?\.update\(/
    );
  });

  it("keeps admin status mutation caller-bound and serializes the last-admin guard", () => {
    const route = source("src/app/api/admin/users/[id]/route.ts");
    const migrationPath = resolve(
      process.cwd(),
      "supabase/migrations/20260710150000_atomic_user_status_transition.sql"
    );

    expect(existsSync(migrationPath)).toBe(true);
    if (!existsSync(migrationPath)) return;
    const migration = readFileSync(migrationPath, "utf8");

    expect(route).toMatch(
      /supabase[\s\S]*?\.rpc\(\s*['"]set_user_active_status['"]/m
    );
    expect(route).not.toMatch(
      /supabaseServiceRole[\s\S]*?\.from\(\s*['"]users['"]\s*\)[\s\S]*?\.update\(/m
    );
    expect(migration).toMatch(/pg_advisory_xact_lock/i);
    expect(migration).toMatch(/count\(\*\)[\s\S]*role\s*=\s*'hr_admin'/i);
  });

  it("binds the activity endpoint path id to the authenticated app user", () => {
    const route = source(
      "src/app/api/admin/users/[id]/update-activity/route.ts"
    );

    expect(route).toMatch(/if\s*\(\s*userId\s*!==\s*currentUser\.id\s*\)/);
    expect(route).toMatch(/userRepository\.updateLastActive\(\s*\)/);
  });

  it("keeps retrying E2E fixtures unique and cleanup scoped to generated names", () => {
    const inlineEdit = source("tests/e2e/inline-edit.spec.ts");
    const exportFilters = source(
      "tests/e2e/epic-20/story-20.7/export-with-filters.spec.ts"
    );
    const seedCleanup = source("tests/e2e/helpers/seed-data.ts");

    expect(inlineEdit).toMatch(/testInfo\.retry/);
    expect(seedCleanup).not.toContain("ssn.ilike.19881231%");
    expect(seedCleanup).not.toContain("ssn.ilike.19871130%");
    expect(exportFilters).toContain("FilterExport");
  });

  it("does not retain pnpm's invalid allowBuilds placeholder mapping", () => {
    const workspace = source("pnpm-workspace.yaml");
    expect(workspace).not.toMatch(/^allowBuilds:/m);
    expect(workspace).not.toContain("set this to true or false");
  });

  it("keeps leaked-password work assigned to Story 23.4 in binding Story 22.10 text", () => {
    const story = source(
      "_bmad-output/implementation-artifacts/22-10-reconcile-supabase-environments-and-baseline-migration-history.md"
    );

    expect(story).not.toMatch(/Phase A —[^\n]*enable leaked-password/i);
    expect(story).not.toMatch(/Phase B —[^\n]*enable leaked-password/i);
    expect(story).not.toMatch(/In scope \(Phase A\)[^\n]*enabling leaked-password/i);
    expect(story).not.toMatch(/ordered production steps[^\n]*enable leaked-password/i);
  });

  it("documents the scoped employee audit policy rather than the superseded broad policy", () => {
    const permissions = source(
      "docs/commercial-readiness/05_user_roles_and_permissions.md"
    );

    expect(permissions).not.toMatch(/allows select for authenticated users/i);
    expect(permissions).toMatch(/employee_column_changes[\s\S]*active caller/i);
    expect(permissions).toMatch(/employee_column_changes[\s\S]*column visibility/i);
  });
});
