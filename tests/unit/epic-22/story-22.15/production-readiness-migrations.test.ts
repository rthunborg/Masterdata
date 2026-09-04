import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type Manifest = {
  repositoryMigrationCount: number;
  reviewedSupabaseCliVersion: string;
  catalogVerifier: string;
  restoredMigrationProvenance: {
    version: string;
    sourceCommit: string;
    sourceBlob: string;
    sha256: string;
  };
  classifications: {
    "repair-after-catalog-proof": string[];
    execute: string[];
  };
  unsafeReplayVersions: Record<string, string>;
  catalogProofExceptions: {
    productionUserFiltersUpdatePolicy: {
      acceptedPreApplyState: string;
      reconciledByExecuteVersion: string;
    };
  };
  environmentPlans: {
    staging: {
      "repair-after-catalog-proof": string[];
      execute: string[];
    };
    production: {
      "repair-after-catalog-proof": string;
      execute: string;
    };
  };
};

const root = process.cwd();
const migrationDir = resolve(root, "supabase/migrations");
const manifest = JSON.parse(
  readFileSync(resolve(root, "supabase/migration-baseline-manifest.json"), "utf8")
) as Manifest;
const migrationSql = readFileSync(
  resolve(
    root,
    "supabase/migrations/20260831200026_enforce_active_authorization_and_atomic_user_deletion.sql"
  ),
  "utf8"
);
const verifierSql = readFileSync(
  resolve(root, "supabase/verify/production-baseline-catalog.sql"),
  "utf8"
);
const liveDatabaseEvidenceTest = readFileSync(
  resolve(
    root,
    "tests/integration/epic-22/story-22.15/inactive-authorization-and-atomic-delete.test.ts"
  ),
  "utf8"
);
const gitAttributes = readFileSync(resolve(root, ".gitattributes"), "utf8");
const testSetup = readFileSync(resolve(root, "tests/setup.ts"), "utf8");
const localSeedSql = readFileSync(resolve(root, "supabase/seed.sql"), "utf8");
const cutoverRunbook = readFileSync(
  resolve(root, "docs/commercial-readiness/27_supabase_cutover_runbook.md"),
  "utf8"
);
const storyCarrier = readFileSync(
  resolve(
    root,
    "docs/sprint-artifacts/story-22.15-production-readiness-remediation.md"
  ),
  "utf8"
);
const frozenSpecification = readFileSync(
  resolve(
    root,
    "_bmad-output/implementation-artifacts/spec-22-15-production-readiness-remediation.md"
  ),
  "utf8"
);

function exactFunctionBodySha256(functionName: string) {
  const definition = migrationSql.match(
    new RegExp(
      `CREATE OR REPLACE FUNCTION public\\.${functionName}\\([\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;`
    )
  );
  if (!definition?.[1]) {
    throw new Error(`Missing function body for ${functionName}`);
  }

  return createHash("sha256")
    .update(definition[1], "utf8")
    .digest("hex");
}

describe("Story 22.15 migration baseline safety", () => {
  it("classifies every repository migration exactly once", () => {
    const repositoryVersions = readdirSync(migrationDir)
      .map((name) => name.match(/^(\d{14})_.*\.sql$/)?.[1])
      .filter((version): version is string => Boolean(version))
      .sort();
    const repair = manifest.classifications["repair-after-catalog-proof"];
    const execute = manifest.classifications.execute;
    const classified = [...repair, ...execute];

    expect(repositoryVersions).toHaveLength(63);
    expect(manifest.repositoryMigrationCount).toBe(63);
    expect(manifest.reviewedSupabaseCliVersion).toBe("2.115.0");
    expect(new Set(classified).size).toBe(classified.length);
    expect([...classified].sort()).toEqual(repositoryVersions);
    expect(repair).toHaveLength(57);
    expect(execute).toHaveLength(6);
  });

  it("keeps every replay-dangerous historical version out of the execute set", () => {
    const repair = new Set(
      manifest.classifications["repair-after-catalog-proof"]
    );
    const execute = new Set(manifest.classifications.execute);

    for (const version of Object.keys(manifest.unsafeReplayVersions)) {
      expect(repair.has(version), `${version} must require catalog proof`).toBe(
        true
      );
      expect(execute.has(version), `${version} must never be replayed`).toBe(
        false
      );
    }
  });

  it("pins the exact staging and production repair/apply plans", () => {
    expect(
      manifest.environmentPlans.staging["repair-after-catalog-proof"]
    ).toEqual(["20250113000000"]);
    expect(manifest.environmentPlans.staging.execute).toEqual([
      "20260615000000",
      "20260709194903",
      "20260710144000",
      "20260710150000",
      "20260831200026",
    ]);
    expect(manifest.environmentPlans.production).toEqual({
      "repair-after-catalog-proof":
        "classifications.repair-after-catalog-proof",
      execute: "classifications.execute",
    });
  });

  it("keeps the duplicated runbook repair/apply lists aligned with the manifest", () => {
    const repairBlock = cutoverRunbook.match(
      /readonly -a PRODUCTION_REPAIR_VERSIONS=\(\s*([\s\S]*?)\n\)/
    )?.[1];
    const stagingApplyBlock = cutoverRunbook.match(
      /The dry run must list exactly these five applies, in this order:([\s\S]*?)Stop unless the dry run is exactly/
    )?.[1];
    const productionApplyBlock = cutoverRunbook.match(
      /After the 57 repairs, the dry run must list exactly these six versions:([\s\S]*?)Stop unless the dry run is exact/
    )?.[1];

    expect(repairBlock).toBeDefined();
    expect(repairBlock?.match(/(?<!\d)\d{14}(?!\d)/g) ?? []).toEqual(
      manifest.classifications["repair-after-catalog-proof"]
    );
    expect(stagingApplyBlock?.match(/(?<!\d)\d{14}(?!\d)/g) ?? []).toEqual(
      manifest.environmentPlans.staging.execute
    );
    expect(productionApplyBlock?.match(/(?<!\d)\d{14}(?!\d)/g) ?? []).toEqual(
      manifest.classifications.execute
    );
    expect(cutoverRunbook).toContain("set -euo pipefail");
    expect(cutoverRunbook).toContain(
      'if ! node supabase/verify/run-reviewed-supabase-cli.mjs migration repair --status applied "$version" --linked; then'
    );
    expect(cutoverRunbook).toContain(
      "node supabase/verify/run-reviewed-supabase-cli.mjs migration list --linked"
    );

    const productionRepairLoop = cutoverRunbook.match(
      /for version in "\$\{PRODUCTION_REPAIR_VERSIONS\[@\]\}"; do([\s\S]*?)done/
    )?.[1];
    expect(productionRepairLoop).toBeDefined();
    expect(productionRepairLoop?.indexOf("verify-target-binding.mjs")).toBeGreaterThanOrEqual(0);
    expect(productionRepairLoop?.indexOf("verify-target-binding.mjs")).toBeLessThan(
      productionRepairLoop?.indexOf("run-reviewed-supabase-cli.mjs migration repair") ?? -1
    );
  });

  it("restores the original immutable room-assignment migration byte-for-byte", () => {
    const digest = createHash("sha256")
      .update(
        readFileSync(
          resolve(
            migrationDir,
            "20250113000000_add_room_assignment_rpc.sql"
          )
        )
      )
      .digest("hex");

    expect(manifest.restoredMigrationProvenance).toEqual({
      version: "20250113000000",
      sourceCommit: "3784d6f2a33072cab021256431da65d7ac5057cd",
      sourceBlob: "02c23b974ba681663dec487d69bd9733986f1cee",
      sha256:
        "1e3ec6aa1ec00b768806743ae4cf07500fe1717efc4c399088cca11a459e003a",
    });
    expect(digest).toBe(manifest.restoredMigrationProvenance.sha256);
  });

  it("provides a read-only catalog verifier for every unsafe replay surface", () => {
    const executableSql = verifierSql
      .replace(/^\s*--.*$/gm, "")
      .replace(/'(?:''|[^'])*'/g, "''");

    expect(executableSql).not.toMatch(
      /\b(?:insert|update|delete|alter|create|drop|truncate|grant|revoke)\b/i
    );
    expect(verifierSql).not.toMatch(/^\s*\\/m);
    for (const evidence of [
      "room_assignment_function_signatures",
      "repayment_boolean_columns",
      "repayment_indexes_and_config",
      "staffing_objects",
      "staffing_columns",
      "staffing_constraints_and_rls",
      "dietary_columns_and_permissions",
      "user_filters_objects",
      "user_filters_trigger_function_contract",
      "represented_column_contracts",
      "represented_function_contracts",
      "represented_policy_contracts",
      "staffing_crewing_done_permission_state",
    ]) {
      expect(verifierSql).toContain(evidence);
    }
    expect(verifierSql).toContain("production_pre_apply");
    expect(verifierSql).toContain("staging_pre_apply");
    expect(verifierSql).toContain("post_apply");
    expect(verifierSql).toContain("verifier_phase");
    expect(verifierSql).toContain("story_22_15_phase_contracts");
    expect(verifierSql).toContain(":'catalog_phase'");
    expect(verifierSql).toContain("BEGIN TRANSACTION READ ONLY;");
    expect(verifierSql.trimEnd()).toMatch(/COMMIT;$/);
    expect(verifierSql).toContain("staffing_needs_select_authenticated");
    expect(verifierSql).toContain("staffing_needs_update_hr_admin_crewing");
    expect(verifierSql).toContain("Users can read own filters");
    expect(verifierSql).toContain("Users can insert own filters");
    expect(verifierSql).toContain("Users can delete own filters");
    expect(verifierSql).toContain("missing_update_policy");
    expect(verifierSql).toContain("missing_user_filters_update_policy");
    expect(verifierSql).toContain("policy.permissive = 'PERMISSIVE'");
    expect(verifierSql).toContain("policy.roles = expected.roles");
    expect(verifierSql).toContain("'{authenticated}'");
    expect(verifierSql).toContain("'{public}'");
    expect(verifierSql).toContain("staffing_pre_or_post_apply");
    expect(verifierSql).toContain("updated_by=v_actor_id");
    expect(verifierSql).toContain(
      "(((selectauth.uid()asuid)=user_id)and((selectget_user_role()asget_user_role)isnotnull))"
    );
    expect(verifierSql).toContain("app_user_auth_cleanup_outbox");
    expect(verifierSql).toContain("complete_app_user_auth_cleanup");
    expect(verifierSql).toContain("pg_catalog.sha256");
    for (const functionName of [
      "get_user_role",
      "delete_app_user",
      "complete_app_user_auth_cleanup",
    ]) {
      expect(verifierSql).toContain(exactFunctionBodySha256(functionName));
    }
    expect(verifierSql).toContain(
      "ifv_actor_idisnullorv_actor_role<>''hr_admin''then"
    );
    expect(verifierSql).toContain("ifp_user_id=v_actor_idthen");
    expect(verifierSql).toContain(
      "pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended"
    );
    expect(verifierSql).toContain("ifv_active_hr_admin_count<=1then");
    expect(verifierSql).toContain("relforcerowsecurity");
    expect(verifierSql).not.toContain("\\");
    expect(verifierSql).toContain("'[[:space:]]+'");
    expect(verifierSql).toContain("'public[.]'");
    expect(verifierSql).toContain("actual.is_nullable = expected.is_nullable");
    expect(verifierSql).toContain("actual.column_default");
    expect(verifierSql).toContain("pg_get_functiondef(functions.oid)");
    expect(verifierSql).toContain("functions.prosecdef");
    expect(verifierSql).toContain("functions.proconfig");
    expect(verifierSql).toContain("owner_name = 'postgres'");
    expect(verifierSql).toContain("privileges.non_owner_execute_grants");
    expect(verifierSql).toContain("pg_catalog.aclexplode");
    expect(verifierSql).not.toContain("information_schema.role_table_grants");
    expect(verifierSql).toContain(
      '\"crewing\":{\"view\":true,\"edit\":false}'
    );
    expect(
      manifest.catalogProofExceptions.productionUserFiltersUpdatePolicy
    ).toMatchObject({
      acceptedPreApplyState: expect.stringContaining(
        "Users can read own filters"
      ),
      reconciledByExecuteVersion: "20260614000000",
    });
  });

  it("pins the complete exact 17-policy post-apply profile", () => {
    type PolicyContract = {
      table: string;
      name: string;
      roles: string;
      command: string;
      qual: string | null;
      withCheck: string | null;
    };

    const expected: PolicyContract[] = [
      {
        table: "employees",
        name: "HR Admin and Recruiter can manage employees",
        roles: "{authenticated}",
        command: "ALL",
        qual:
          "((selectget_user_role()asget_user_role)=any(array['hr_admin'::text,'recruiter'::text]))",
        withCheck: null,
      },
      {
        table: "employees",
        name: "External parties can view employees",
        roles: "{authenticated}",
        command: "SELECT",
        qual:
          "(((selectget_user_role()asget_user_role)=any(array['sodexo'::text,'omc'::text,'payroll'::text,'toplux'::text,'crewing'::text]))and(is_archived=false))",
        withCheck: null,
      },
      {
        table: "column_config",
        name: "Everyone can read column configs",
        roles: "{public}",
        command: "SELECT",
        qual: "true",
        withCheck: null,
      },
      {
        table: "column_config",
        name: "Manage column configs",
        roles: "{authenticated}",
        command: "ALL",
        qual:
          "(exists(select1fromuserscallerwhere((caller.auth_user_id=auth.uid())and(caller.role='hr_admin'::text)and(caller.is_active=true))))",
        withCheck:
          "(exists(select1fromuserscallerwhere((caller.auth_user_id=auth.uid())and(caller.role='hr_admin'::text)and(caller.is_active=true))))",
      },
      {
        table: "important_dates",
        name: "Everyone can read important dates",
        roles: "{public}",
        command: "SELECT",
        qual: "true",
        withCheck: null,
      },
      {
        table: "important_dates",
        name: "HR Admin and Recruiter can manage important dates",
        roles: "{authenticated}",
        command: "ALL",
        qual:
          "((selectget_user_role()asget_user_role)=any(array['hr_admin'::text,'recruiter'::text]))",
        withCheck: null,
      },
      {
        table: "employee_column_changes",
        name: "Authorized roles can read visible employee changes",
        roles: "{authenticated}",
        command: "SELECT",
        qual:
          "((exists(select1fromuserscallerwhere((caller.auth_user_id=auth.uid())and(caller.is_active=true)and(caller.role=any(array['hr_admin'::text,'recruiter'::text,'sodexo'::text,'omc'::text,'payroll'::text,'toplux'::text,'crewing'::text])))))and(exists(select1fromemployeesvisible_employeewhere(visible_employee.id=employee_column_changes.employee_id)))and(((selectget_user_role()asget_user_role)=any(array['hr_admin'::text,'recruiter'::text]))or(exists(select1fromcolumn_configvisible_columnwhere((lower(visible_column.db_column_name)=lower(employee_column_changes.column_name))and(visible_column.is_masterdata=true)and(coalesce(((visible_column.role_permissions->(selectget_user_role()asget_user_role))->>'view'::text),'false'::text)='true'::text))))))",
        withCheck: null,
      },
      {
        table: "users",
        name: "HR Admin can insert users",
        roles: "{authenticated}",
        command: "INSERT",
        qual: null,
        withCheck:
          "((selectget_user_role()asget_user_role)='hr_admin'::text)",
      },
      {
        table: "users",
        name: "Users can read users",
        roles: "{authenticated}",
        command: "SELECT",
        qual:
          "(((selectget_user_role()asget_user_role)='hr_admin'::text)or(auth_user_id=(selectauth.uid()asuid)))",
        withCheck: null,
      },
      {
        table: "staffing_needs",
        name: "staffing_needs_select",
        roles: "{authenticated}",
        command: "SELECT",
        qual: "((selectget_user_role()asget_user_role)isnotnull)",
        withCheck: null,
      },
      {
        table: "staffing_needs",
        name: "staffing_needs_update",
        roles: "{authenticated}",
        command: "UPDATE",
        qual:
          "((selectget_user_role()asget_user_role)=any(array['hr_admin'::text,'crewing'::text]))",
        withCheck: null,
      },
      {
        table: "staffing_needs_changelog",
        name: "staffing_needs_changelog_insert",
        roles: "{authenticated}",
        command: "INSERT",
        qual: null,
        withCheck:
          "((selectget_user_role()asget_user_role)=any(array['hr_admin'::text,'crewing'::text]))",
      },
      {
        table: "staffing_needs_changelog",
        name: "staffing_needs_changelog_select",
        roles: "{authenticated}",
        command: "SELECT",
        qual: "((selectget_user_role()asget_user_role)isnotnull)",
        withCheck: null,
      },
      {
        table: "user_filters",
        name: "Users can view their own filters",
        roles: "{authenticated}",
        command: "SELECT",
        qual:
          "(((selectauth.uid()asuid)=user_id)and((selectget_user_role()asget_user_role)isnotnull))",
        withCheck: null,
      },
      {
        table: "user_filters",
        name: "Users can create their own filters",
        roles: "{authenticated}",
        command: "INSERT",
        qual: null,
        withCheck:
          "(((selectauth.uid()asuid)=user_id)and((selectget_user_role()asget_user_role)isnotnull))",
      },
      {
        table: "user_filters",
        name: "Users can update their own filters",
        roles: "{authenticated}",
        command: "UPDATE",
        qual:
          "(((selectauth.uid()asuid)=user_id)and((selectget_user_role()asget_user_role)isnotnull))",
        withCheck:
          "(((selectauth.uid()asuid)=user_id)and((selectget_user_role()asget_user_role)isnotnull))",
      },
      {
        table: "user_filters",
        name: "Users can delete their own filters",
        roles: "{authenticated}",
        command: "DELETE",
        qual:
          "(((selectauth.uid()asuid)=user_id)and((selectget_user_role()asget_user_role)isnotnull))",
        withCheck: null,
      },
    ];

    const sqlLiteral = (value: string | null) =>
      value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`;
    const expectedRows = expected.map(
      ({ table, name, roles, command, qual, withCheck }) =>
        `('post_apply', '${table}', '${name}', '${roles}', '${command}', ${sqlLiteral(qual)}, ${sqlLiteral(withCheck)})`
    );
    const contractsStart = verifierSql.indexOf(
      "expected_policy_contracts AS ("
    );
    const contractsEnd = verifierSql.indexOf(
      "story_22_15_functions AS (",
      contractsStart
    );
    const contractsSql = verifierSql.slice(contractsStart, contractsEnd);
    const actualRows = contractsSql
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/,$/, ""))
      .filter((line) => line.startsWith("('post_apply'"));

    expect(contractsStart).toBeGreaterThanOrEqual(0);
    expect(contractsEnd).toBeGreaterThan(contractsStart);
    expect(actualRows).toEqual(expectedRows);
    expect(actualRows).toHaveLength(17);
    expect(
      contractsSql.match(/^\s*\('production_pre_apply'/gm) ?? []
    ).toHaveLength(7);
    expect(
      contractsSql.match(/^\s*\('staging_pre_apply'/gm) ?? []
    ).toHaveLength(8);

    const representedPoliciesSql = verifierSql.slice(
      verifierSql.indexOf("represented_policies AS ("),
      contractsStart
    );
    expect(representedPoliciesSql).toContain("WHERE schemaname = 'public'");
    expect(representedPoliciesSql).not.toMatch(/tablename\s+IN/i);
    expect(representedPoliciesSql).not.toContain("'[()]'");
    expect(representedPoliciesSql).toContain("lower(qual)");
    expect(representedPoliciesSql).toContain("lower(with_check)");

    expect(verifierSql).toContain(
      "profile.expected_count = profile.actual_count"
    );
    expect(verifierSql).toContain(
      "WHERE expected.profile_name = 'post_apply'"
    );
    expect(verifierSql).toContain(
      "WHERE scoped.profile_name = expected.profile_name"
    );
    expect(verifierSql).toContain(
      "policy.normalized_qual IS NOT DISTINCT FROM expected.normalized_qual"
    );
    expect(verifierSql).toContain(
      "policy.normalized_with_check IS NOT DISTINCT FROM expected.normalized_with_check"
    );
    expect(liveDatabaseEvidenceTest).toContain(
      "regrouped employee-audit visibility predicate"
    );
    expect(liveDatabaseEvidenceTest).toContain(
      "unexpected policy on unrelated public log table"
    );
    expect(liveDatabaseEvidenceTest).toContain(
      "unrelated extra cannot compensate for a missing expected policy"
    );
    expect(liveDatabaseEvidenceTest).toContain(
      "ON public.pe3_notifications_log"
    );
  });

  it("pins exact staffing headcount and saved-filter catalog contracts", () => {
    const staffingStart = verifierSql.indexOf("'staffing_constraints_and_rls'");
    const staffingEnd = verifierSql.indexOf("'dietary_columns_and_permissions'");
    const userFiltersStart = verifierSql.indexOf("'user_filters_objects'");
    const userFiltersEnd = verifierSql.indexOf("'represented_column_contracts'");

    expect(staffingStart).toBeGreaterThanOrEqual(0);
    expect(staffingEnd).toBeGreaterThan(staffingStart);
    expect(userFiltersStart).toBeGreaterThanOrEqual(0);
    expect(userFiltersEnd).toBeGreaterThan(userFiltersStart);

    const staffingContract = verifierSql.slice(staffingStart, staffingEnd);
    const userFiltersContract = verifierSql.slice(
      userFiltersStart,
      userFiltersEnd
    );

    expect(staffingContract).toContain(
      "conname = 'staffing_needs_headcount_need_check'"
    );
    expect(staffingContract).toContain(
      "lower(pg_get_expr(conbin, conrelid, true))"
    );
    expect(staffingContract).toContain(
      "'headcount_need>=0andheadcount_need<=9999'"
    );
    expect(staffingContract).not.toContain("ILIKE '%headcount_need%>= 0%'");

    for (const columnContract of [
      "(1, 'id', 'uuid', 'NO', 'gen_random_uuid()')",
      "(2, 'user_id', 'uuid', 'NO', NULL)",
      "(3, 'name', 'text', 'NO', NULL)",
      "(4, 'filters', 'jsonb', 'NO', NULL)",
      "(5, 'created_at', 'timestamp with time zone', 'NO', 'now()')",
      "(6, 'updated_at', 'timestamp with time zone', 'NO', 'now()')",
    ]) {
      expect(userFiltersContract).toContain(columnContract);
    }
    expect(userFiltersContract).toContain("actual.ordinal_position = expected.ordinal_position");
    expect(userFiltersContract).toContain("actual.is_nullable = expected.is_nullable");
    expect(userFiltersContract).toContain("actual.column_default");

    for (const exactConstraint of [
      "('user_filters_pkey', 'p', 'primarykeyid')",
      "'foreignkeyuser_idreferencesauth.usersidondeletecascade'",
      "'uniqueuser_id,name'",
      "'checkchar_lengthname>0andchar_lengthname<=50'",
    ]) {
      expect(userFiltersContract).toContain(exactConstraint);
    }
    expect(userFiltersContract).toContain("SELECT count(*) = 4");
    expect(userFiltersContract).toContain(
      "actual.contype::text = expected.constraint_type"
    );
    expect(userFiltersContract).toContain(
      "lower(pg_get_constraintdef(actual.oid, true))"
    );

    for (const exactIndex of [
      "'createindexidx_user_filters_user_idonuser_filtersusingbtree(user_id)'",
      "'createindexidx_user_filters_nameonuser_filtersusingbtree(user_id,lower(name))'",
    ]) {
      expect(userFiltersContract).toContain(exactIndex);
    }
    expect(userFiltersContract).toContain("SELECT count(*) = 2");
    expect(userFiltersContract).toContain("backing_constraint.oid IS NULL");
    expect(userFiltersContract).toContain("indexes.indisvalid");
    expect(userFiltersContract).toContain("NOT indexes.indisunique");

    expect(userFiltersContract).toContain("SELECT count(*) = 1");
    expect(userFiltersContract).toContain("tgname = 'set_updated_at'");
    expect(userFiltersContract).toContain("tgenabled = 'O'");
    expect(userFiltersContract).toContain("tgtype = 19");
    expect(userFiltersContract).toContain(
      "tgfoid = to_regprocedure('public.trigger_set_updated_at()')"
    );
    expect(userFiltersContract).toContain("tgattr::text = ''");
    expect(userFiltersContract).toContain("tgqual IS NULL");
    expect(userFiltersContract).toContain("octet_length(tgargs) = 0");

    expect(userFiltersContract).toContain(
      "'user_filters_trigger_function_contract'"
    );
    expect(userFiltersContract).toContain("language.lanname = 'plpgsql'");
    expect(userFiltersContract).toContain(
      "functions.prorettype = 'trigger'::regtype"
    );
    expect(userFiltersContract).toContain("NOT functions.proretset");
    expect(userFiltersContract).toContain("NOT functions.prosecdef");
    expect(userFiltersContract).toContain("functions.provolatile = 'v'");
    expect(userFiltersContract).toContain("functions.proparallel = 'u'");
    expect(userFiltersContract).toContain("NOT functions.proisstrict");
    expect(userFiltersContract).toContain("functions.proconfig IS NULL");
    expect(userFiltersContract).toContain(
      "ARRAY['search_path=public, pg_temp']::text[]"
    );
    expect(userFiltersContract).toContain(
      "'beginnew.updated_at=now();returnnew;end;'"
    );
  });

  it("forces LF normalization for migration and verifier SQL", () => {
    expect(gitAttributes).toContain(
      "supabase/migrations/*.sql text eol=lf"
    );
    expect(gitAttributes).toContain("supabase/verify/*.sql text eol=lf");
    expect(gitAttributes).toContain(
      "supabase/migrations/20250113000000_add_room_assignment_rpc.sql whitespace=-trailing-space,-blank-at-eof"
    );
  });

  it("commits the linked frozen specification as the Story 22.15 source of truth", () => {
    expect(storyCarrier).toContain(
      "../../_bmad-output/implementation-artifacts/spec-22-15-production-readiness-remediation.md"
    );
    expect(frozenSpecification).toContain("<frozen-after-approval");
    expect(frozenSpecification).toContain("## Tasks & Acceptance");
  });

  it("isolates default test probes to this repository's local Supabase ports", () => {
    expect(testSetup).toContain(
      "NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:15421'"
    );
    expect(testSetup).not.toContain("NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'");
    expect(testSetup).toContain(
      "SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'"
    );
  });

  it("requires the pinned CLI, a signed per-version proof ledger, and an exact dry run", () => {
    expect(cutoverRunbook).toContain(
      `Supabase CLI version **\`${manifest.reviewedSupabaseCliVersion}\`**`
    );
    expect(cutoverRunbook).toContain("57-row proof ledger");
    expect(cutoverRunbook).toContain("--dry-run --skip-vault");
    expect(cutoverRunbook).toContain("EXPECTED_SUPABASE_PROJECT_REF");
    expect(cutoverRunbook).toContain("SUPABASE_DB_CONNECTION_MODE");
    expect(cutoverRunbook).toContain("EXPECTED_SUPABASE_POOLER_HOST");
    expect(cutoverRunbook).toContain("`session-pooler` mode");
    expect(cutoverRunbook).toContain("port `5432`");
    expect(cutoverRunbook).toContain(
      "Port `6543` is transaction pooling and is never permitted"
    );
    expect(cutoverRunbook).toContain("SUPABASE_CLI_EXECUTABLE");
    expect(cutoverRunbook).toContain("EXPECTED_SUPABASE_CLI_SHA256");
    expect(cutoverRunbook).toContain(
      "node supabase/verify/run-reviewed-supabase-cli.mjs"
    );
    expect(cutoverRunbook).not.toMatch(
      /^\s*(?:if\s+!\s+)?supabase\s+(?:migration|db)\s+/mu
    );
    expect(cutoverRunbook).toContain("EXPECTED_PSQL_VERSION");
    expect(cutoverRunbook).toContain("EXPECTED_PSQL_SHA256");
    expect(cutoverRunbook).toContain("SUPABASE_SSL_ROOT_CERT");
    expect(cutoverRunbook).toContain(
      "EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256"
    );
    expect(cutoverRunbook).toContain("sslmode=verify-full");
    expect(cutoverRunbook).toContain(
      "A bare command resolved from `PATH`"
    );
    expect(cutoverRunbook).toContain(
      "rejects every backslash byte in the verifier source"
    );
    expect(cutoverRunbook).toContain(
      "Session-pooler mode additionally binds the project reference embedded in the username"
    );
    expect(cutoverRunbook).toContain(
      "URL hostname to equal the separately approved exact pooler hostname"
    );
    expect(cutoverRunbook).toContain(
      "verify-production-baseline-catalog.mjs staging_pre_apply"
    );
    expect(cutoverRunbook).toContain(
      "verify-production-baseline-catalog.mjs production_pre_apply"
    );
    expect(cutoverRunbook).toContain(
      "verify-production-baseline-catalog.mjs post_apply"
    );
    expect(cutoverRunbook).not.toContain(
      'psql "$SUPABASE_DB_URL" --set ON_ERROR_STOP=1'
    );
    expect(cutoverRunbook).toContain(
      'a five/six-file `db push` is **not** an all-or-nothing batch'
    );
    expect(cutoverRunbook).toContain(
      "do not repair a failed forward version as applied"
    );
    expect(cutoverRunbook).toContain(
      "Disable the Supabase Data API"
    );
    expect(cutoverRunbook).toContain(
      "network restrictions do not cover HTTPS APIs"
    );
    expect(cutoverRunbook).toContain(
      "fresh production backup -> publication/connection inventory -> technical traffic and Realtime isolation -> history repair"
    );
    expect(cutoverRunbook).toContain("pg_publication_tables");
    expect(cutoverRunbook).toContain("Connected Clients");
    expect(cutoverRunbook).toContain("Enable Realtime service");
    expect(cutoverRunbook).toContain("RealtimeDisabledForTenant");
    expect(cutoverRunbook).toContain(
      "Vercel/application ingress blocking and Data API disablement do not close existing Realtime WebSockets"
    );
    expect(cutoverRunbook).toContain(
      "representative Realtime connection established before isolation is disconnected"
    );
    expect(cutoverRunbook).toContain(
      "fresh WebSocket/subscription reconnect is rejected"
    );
    expect(cutoverRunbook).toContain(
      "deploy the exact reviewed immutable candidate SHA"
    );
    expect(cutoverRunbook).toContain(
      "If isolation cannot be proven, the production cutover is NO-GO"
    );
    expect(cutoverRunbook).toContain(
      "restore only the previously recorded Data API state"
    );
    expect(cutoverRunbook).toContain(
      "operator-only application bypass"
    );
    expect(cutoverRunbook).toContain(
      "direct API clients can reach only the now-verified final RLS/grant state"
    );
    expect(cutoverRunbook).toContain(
      "restore the exact prior **Enable Realtime service** state"
    );
    expect(cutoverRunbook).toContain(
      "Epic 23 remains on hold; temporary Data API/Realtime/network cutover controls were restored"
    );
    expect(cutoverRunbook).not.toMatch(/migration repair[^\n]*(?:\*|--include-all)/i);
  });
});

describe("Story 22.15 active authorization migration", () => {
  it("repairs represented column configuration only when rows are missing", () => {
    for (const dbColumnName of [
      "crewing_done",
      "repayment_needed_omc",
      "repayment_needed_pe3",
    ]) {
      expect(migrationSql).toContain(`'${dbColumnName}'`);
    }
    expect(migrationSql).toContain("WHERE NOT EXISTS");
    expect(migrationSql).toContain(
      "lower(existing.db_column_name) = lower(expected.db_column_name)"
    );
    expect(migrationSql).not.toMatch(/ON CONFLICT[\s\S]*DO UPDATE/i);
  });

  it("keeps the local parity seed from reopening the restricted cleanup outbox", () => {
    const blanketGrant = localSeedSql.indexOf(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public"
    );
    const outboxRevoke = localSeedSql.indexOf(
      "REVOKE ALL ON TABLE public.app_user_auth_cleanup_outbox"
    );

    expect(blanketGrant).toBeGreaterThanOrEqual(0);
    expect(outboxRevoke).toBeGreaterThan(blanketGrant);
    expect(localSeedSql.slice(outboxRevoke)).toContain(
      "FROM PUBLIC, anon, authenticated, service_role"
    );
  });

  it("returns roles only for active application users and active-gates saved filters", () => {
    expect(migrationSql).toMatch(
      /WHERE auth_user_id = auth\.uid\(\)\s+AND is_active = true/i
    );
    expect(
      migrationSql.match(
        /AND \(SELECT public\.get_user_role\(\)\) IS NOT NULL/gi
      )
    ).toHaveLength(5);
  });

  it("performs invariant checks and app-row deletion in one caller-bound transaction", () => {
    const lock = migrationSql.indexOf("pg_catalog.pg_advisory_xact_lock");
    const actorCheck = migrationSql.indexOf(
      "WHERE auth_user_id = auth.uid()",
      lock
    );
    const targetLock = migrationSql.indexOf("FOR UPDATE", actorCheck);
    const deletion = migrationSql.indexOf("DELETE FROM public.users", targetLock);
    const handoff = migrationSql.indexOf(
      "INSERT INTO public.app_user_auth_cleanup_outbox",
      deletion
    );
    const commit = migrationSql.indexOf("COMMIT;", handoff);

    expect(lock).toBeGreaterThan(-1);
    expect(actorCheck).toBeGreaterThan(lock);
    expect(targetLock).toBeGreaterThan(actorCheck);
    expect(deletion).toBeGreaterThan(targetLock);
    expect(handoff).toBeGreaterThan(deletion);
    expect(commit).toBeGreaterThan(handoff);
    expect(migrationSql.slice(targetLock, deletion)).not.toMatch(
      /UPDATE public\.users/i
    );
    expect(migrationSql).toContain("Cannot delete the final active HR Admin");
    expect(migrationSql).toContain("'auth_user_id', v_cleanup.auth_user_id");
    expect(migrationSql).toContain("'cleanup_id', v_cleanup.cleanup_id");
    expect(migrationSql).toContain("'cleanup_state', v_cleanup.cleanup_state");
  });

  it("creates a restricted minimal cleanup outbox with retry-safe app-only tombstones", () => {
    const tableStart = migrationSql.indexOf(
      "CREATE TABLE public.app_user_auth_cleanup_outbox"
    );
    const tableEnd = migrationSql.indexOf(");", tableStart);
    const tableDefinition = migrationSql.slice(tableStart, tableEnd);
    const retryLookup = migrationSql.indexOf(
      "FROM public.app_user_auth_cleanup_outbox",
      tableEnd
    );
    const targetLookup = migrationSql.indexOf(
      "FROM public.users",
      retryLookup
    );

    expect(tableDefinition).toMatch(/auth_user_id uuid UNIQUE/i);
    expect(tableDefinition).not.toMatch(/auth_user_id uuid NOT NULL/i);
    expect(tableDefinition).not.toMatch(/email|name|profile/i);
    expect(migrationSql).toMatch(
      /ALTER TABLE public\.app_user_auth_cleanup_outbox FORCE ROW LEVEL SECURITY;/i
    );
    expect(migrationSql).toMatch(
      /REVOKE ALL ON TABLE public\.app_user_auth_cleanup_outbox\s+FROM PUBLIC, anon, authenticated, service_role;/i
    );
    expect(migrationSql).toContain(
      "CASE WHEN v_target.auth_user_id IS NULL THEN 'completed' ELSE 'pending' END"
    );
    expect(migrationSql).toContain(
      "CASE WHEN v_target.auth_user_id IS NULL THEN now() ELSE NULL END"
    );
    expect(retryLookup).toBeGreaterThan(tableEnd);
    expect(targetLookup).toBeGreaterThan(retryLookup);
  });

  it("exposes atomic deletion only to authenticated callers", () => {
    expect(migrationSql).toMatch(
      /ALTER FUNCTION public\.get_user_role\(\) OWNER TO postgres;/i
    );
    expect(migrationSql).toMatch(
      /ALTER FUNCTION public\.delete_app_user\(uuid\) OWNER TO postgres;/i
    );
    expect(migrationSql).toMatch(
      /ALTER FUNCTION public\.complete_app_user_auth_cleanup\(uuid\) OWNER TO postgres;/i
    );
    expect(migrationSql).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.delete_app_user\(uuid\)\s+FROM PUBLIC, anon, service_role;/i
    );
    expect(migrationSql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.delete_app_user\(uuid\)\s+TO authenticated;/i
    );
  });

  it("reserves cleanup completion attestation for the service role", () => {
    const completionStart = migrationSql.indexOf(
      "CREATE OR REPLACE FUNCTION public.complete_app_user_auth_cleanup"
    );
    const completionEnd = migrationSql.indexOf("COMMIT;", completionStart);
    const completionSql = migrationSql.slice(completionStart, completionEnd);

    expect(completionSql).not.toContain("auth.uid()");
    expect(completionSql).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.complete_app_user_auth_cleanup\(uuid\)\s+FROM PUBLIC, anon, authenticated;/i
    );
    expect(completionSql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.complete_app_user_auth_cleanup\(uuid\)\s+TO service_role;/i
    );
  });

  it("binds live evidence to the fail-closed flag and a synchronized two-client race", () => {
    expect(liveDatabaseEvidenceTest).toContain(
      "REQUIRE_STORY_22_15_DB_EVIDENCE"
    );
    expect(liveDatabaseEvidenceTest).toContain("createStartBarrier(2)");
    expect(liveDatabaseEvidenceTest).toContain(
      "synchronizedTransactionAttempt"
    );
    expect(liveDatabaseEvidenceTest).toContain(
      "await database.query(\"COMMIT\")"
    );
    expect(liveDatabaseEvidenceTest).toContain(
      "DELETE FROM public.app_user_auth_cleanup_outbox"
    );
    expect(liveDatabaseEvidenceTest).toContain(
      "delete function without active HR actor authorization"
    );
    expect(liveDatabaseEvidenceTest).toContain(
      "delete function with a different advisory-lock key"
    );
    expect(liveDatabaseEvidenceTest).toContain(
      "PUBLIC cleanup-outbox SELECT grant"
    );
    expect(liveDatabaseEvidenceTest).toContain(
      "PUBLIC cleanup-outbox TRUNCATE grant"
    );
    expect(liveDatabaseEvidenceTest).toContain(
      "SECURITY DEFINER function owned by an untrusted role"
    );
    expect(liveDatabaseEvidenceTest).toContain("expectCallerBoundDeleteDenied");
    expect(liveDatabaseEvidenceTest).toContain('"active non-HR"');
    expect(liveDatabaseEvidenceTest).toContain('"inactive HR"');
  });
});
