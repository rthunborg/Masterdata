import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { Client, type QueryResult } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const fixtureUrlValue =
  process.env.STORY_22_15_POST_APPLY_FIXTURE_DATABASE_URL;
const requireFixture =
  process.env.REQUIRE_STORY_22_15_POST_APPLY_DB_EVIDENCE === 'true';

if (!fixtureUrlValue && requireFixture) {
  throw new Error(
    'REQUIRE_STORY_22_15_POST_APPLY_DB_EVIDENCE requires a local fixture URL'
  );
}

const fixtureUrl = fixtureUrlValue ? new URL(fixtureUrlValue) : null;
if (
  fixtureUrl &&
  (fixtureUrl.hostname !== '127.0.0.1' || fixtureUrl.port !== '45432')
) {
  throw new Error(
    'Story 22.15 post-apply evidence only permits the guarded loopback fixture'
  );
}

const templateDatabaseName = fixtureUrl?.pathname.slice(1) ?? null;
if (
  fixtureUrl &&
  (!templateDatabaseName ||
    !/^[a-z_][a-z0-9_]{0,62}$/.test(templateDatabaseName))
) {
  throw new Error(
    'Story 22.15 post-apply fixture URL must name one guarded template database'
  );
}

if (!fixtureUrl) {
  console.warn(
    'Skipping Story 22.15 post-apply evidence: set STORY_22_15_POST_APPLY_FIXTURE_DATABASE_URL for the guarded local PostgreSQL fixture.'
  );
}

const migrationSql = readFileSync(
  'supabase/migrations/20260910115024_reconcile_post_apply_acl_and_policy_initplans.sql',
  'utf8'
);
const triggerReconciliationMigrationSql = readFileSync(
  'supabase/migrations/20260910184841_reconcile_column_config_timestamp_and_audit_trigger.sql',
  'utf8'
);
const februaryAuditFunctionSql = readFileSync(
  'supabase/migrations/20260223000000_add_dietary_columns_to_change_trigger.sql',
  'utf8'
).match(
  /CREATE OR REPLACE FUNCTION track_employee_column_changes\([\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;/
)?.[0];
if (!februaryAuditFunctionSql) {
  throw new Error('Story 22.15 February audit trigger definition is unavailable');
}
const stagingForwardMigrationSources = [
  'supabase/migrations/20260615000000_add_is_checklist_item_to_column_config.sql',
  'supabase/migrations/20260709194903_remediate_pr_91_security_findings.sql',
  'supabase/migrations/20260710144000_atomic_external_column_presentation.sql',
  'supabase/migrations/20260710150000_atomic_user_status_transition.sql',
  'supabase/migrations/20260831200026_enforce_active_authorization_and_atomic_user_deletion.sql',
  'supabase/migrations/20260909115242_reconcile_saved_filters_and_room_acl.sql',
  'supabase/migrations/20260910094517_reconcile_repayment_defaults.sql',
].map((path) => readFileSync(path, 'utf8'));
const catalogSql = readFileSync(
  'supabase/verify/production-baseline-catalog.sql',
  'utf8'
);
const fixtureDatabaseName = `story_2215_post_apply_${randomUUID()
  .replaceAll('-', '')
  .slice(0, 20)}`;
const administrationUrl = fixtureUrl ? new URL(fixtureUrl) : null;
if (administrationUrl) administrationUrl.pathname = '/template1';

const ids = {
  activeHrAuth: randomUUID(),
  activeHrApp: randomUUID(),
  inactiveHrAuth: randomUUID(),
  inactiveHrApp: randomUUID(),
  activeExternalAuth: randomUUID(),
  activeExternalApp: randomUUID(),
  inactiveExternalAuth: randomUUID(),
  inactiveExternalApp: randomUUID(),
  activeEmployee: randomUUID(),
  archivedEmployee: randomUUID(),
  visibleConfig: randomUUID(),
  hiddenConfig: randomUUID(),
};
const visibleColumn = `post_apply_visible_${ids.visibleConfig.replaceAll('-', '')}`;
const hiddenColumn = `post_apply_hidden_${ids.hiddenConfig.replaceAll('-', '')}`;

type RlsSemantics = {
  activeHrRole: string | null;
  inactiveHrRole: string | null;
  activeExternalRole: string | null;
  inactiveExternalRole: string | null;
  activeHrConfigInsert: boolean;
  inactiveHrConfigInsertDenied: boolean;
  activeExternalConfigInsertDenied: boolean;
  activeExternalVisibleAuditCount: number;
  inactiveExternalAuditCount: number;
};

type CatalogCheck = {
  check_name: string;
  passed: boolean;
};

const expectedCatalogCheckNames = [
  'verifier_phase',
  'story_22_15_phase_contracts',
  'room_assignment_function_signatures',
  'repayment_boolean_columns',
  'repayment_indexes_and_config',
  'staffing_objects',
  'staffing_columns',
  'staffing_constraints_and_rls',
  'dietary_columns_and_permissions',
  'user_filters_objects',
  'user_filters_trigger_function_contract',
  'represented_trigger_contracts',
  'represented_column_contracts',
  'represented_function_contracts',
  'staffing_crewing_done_permission_state',
  'represented_policy_contracts',
].sort();
const completeProfilePolicyTables = [
  'employees',
  'column_config',
  'important_dates',
  'employee_column_changes',
  'users',
  'staffing_needs',
  'staffing_needs_changelog',
  'user_filters',
];

function rlsDisableFailures(tableName: string) {
  if (
    tableName === 'staffing_needs' ||
    tableName === 'staffing_needs_changelog'
  ) {
    return ['represented_policy_contracts', 'staffing_constraints_and_rls'];
  }
  if (tableName === 'user_filters') {
    return ['represented_policy_contracts', 'user_filters_objects'];
  }
  return ['represented_policy_contracts'];
}

function normalize(expression: string) {
  return expression.toLowerCase().replace(/\s+/g, '');
}

function isCanonicalPolicyExpression(expression: string) {
  return normalize(expression).includes(
    'caller.auth_user_id=(selectauth.uid()asuid)'
  );
}

function canonicalizeDirectAuthUid(expression: string) {
  const canonical = expression.replace(/\bauth[.]uid\(\)/gi, '(SELECT auth.uid())');
  if (canonical === expression) {
    throw new Error('Expected a direct auth.uid() policy predicate');
  }
  return canonical;
}

function restoreDirectAuthUid(expression: string) {
  const direct = expression.replace(
    /\(\s*select\s+auth[.]uid\(\)(?:\s+as\s+uid)?\s*\)/gi,
    'auth.uid()'
  );
  if (direct === expression) {
    throw new Error('Expected an initplan auth.uid() policy predicate');
  }
  return direct;
}

function catalogFor(phase: string, includeTransaction = true) {
  const boundPhaseSql = catalogSql.replaceAll(":'catalog_phase'", `'${phase}'`);
  return includeTransaction
    ? boundPhaseSql
    : boundPhaseSql
        .replace('BEGIN TRANSACTION READ ONLY;', '')
        .replace(/\r?\nCOMMIT;\s*$/, '');
}

describe.skipIf(!fixtureUrl)(
  'Story 22.15 post-apply ACL and RLS reconciliation',
  () => {
    const adminClient = administrationUrl
      ? new Client({ connectionString: administrationUrl.toString() })
      : null;
    let fixtureClient: Client;
    let adminConnected = false;
    let fixtureCreated = false;
    let correctionApplied = false;
    let triggerCorrectionApplied = false;

    async function asAuthenticated<T>(
      authUserId: string,
      assertion: () => Promise<T>
    ) {
      await fixtureClient.query('RESET ROLE');
      await fixtureClient.query('SET LOCAL ROLE authenticated');
      await fixtureClient.query(
        `SELECT set_config(
           'request.jwt.claims',
           json_build_object('sub', $1::text, 'role', 'authenticated')::text,
           true
         )`,
        [authUserId]
      );
      try {
        return await assertion();
      } finally {
        // Preserve the assertion failure if it aborts the fixture transaction;
        // RESET ROLE cannot recover an aborted transaction.
        await fixtureClient.query('RESET ROLE').catch(() => {});
      }
    }

    async function attempt(statement: string) {
      const savepoint = `sp_${randomUUID().replaceAll('-', '')}`;
      await fixtureClient.query(`SAVEPOINT ${savepoint}`);
      try {
        const result = await fixtureClient.query(statement);
        await fixtureClient.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        await fixtureClient.query(`RELEASE SAVEPOINT ${savepoint}`);
        return { ok: true as const, rowCount: result.rowCount ?? 0 };
      } catch (error) {
        await fixtureClient.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        await fixtureClient.query(`RELEASE SAVEPOINT ${savepoint}`);
        return { ok: false as const, code: (error as { code?: string }).code };
      }
    }

    async function getUserRole(authUserId: string) {
      return asAuthenticated(authUserId, async () => {
        const result = await fixtureClient.query<{ role: string | null }>(
          'SELECT public.get_user_role() AS role'
        );
        return result.rows[0]?.role ?? null;
      });
    }

    async function getGetUserRoleGrants() {
      const result = await fixtureClient.query<{ grantee: string }>(`
        SELECT CASE WHEN privilege.grantee = 0 THEN 'PUBLIC' ELSE role.rolname END AS grantee
        FROM pg_proc AS function
        CROSS JOIN LATERAL aclexplode(
          coalesce(function.proacl, acldefault('f', function.proowner))
        ) AS privilege
        LEFT JOIN pg_roles AS role ON role.oid = privilege.grantee
        WHERE function.oid = to_regprocedure('public.get_user_role()')
          AND privilege.privilege_type = 'EXECUTE'
          AND privilege.grantee <> function.proowner
        ORDER BY grantee
      `);
      return result.rows.map(({ grantee }) => grantee);
    }

    async function getPolicyExpressions() {
      const result = await fixtureClient.query<{
        policyname: string;
        using_expression: string;
        check_expression: string | null;
      }>(`
        SELECT
          policy.polname AS policyname,
          pg_get_expr(policy.polqual, policy.polrelid) AS using_expression,
          pg_get_expr(policy.polwithcheck, policy.polrelid) AS check_expression
        FROM pg_policy AS policy
        WHERE policy.polname IN (
          'Manage column configs',
          'Authorized roles can read visible employee changes'
        )
        ORDER BY policy.polname
      `);
      return result.rows;
    }

    async function policyExpression(
      policyname: string,
      field: 'using_expression' | 'check_expression'
    ) {
      const policy = (await getPolicyExpressions()).find(
        (candidate) => candidate.policyname === policyname
      );
      const expression = policy?.[field];
      if (typeof expression !== 'string') {
        throw new Error(`Policy ${policyname} has no ${field}`);
      }
      return expression;
    }

    async function alteredPolicyUsingSql(
      policyname: string,
      tableName: string,
      transform: (expression: string) => string
    ) {
      const expression = transform(
        await policyExpression(policyname, 'using_expression')
      );
      return `ALTER POLICY "${policyname}" ON public.${tableName} USING ${expression}`;
    }

    async function alteredManageWithCheckSql(
      transform: (expression: string) => string
    ) {
      const expression = transform(
        await policyExpression('Manage column configs', 'check_expression')
      );
      return `ALTER POLICY "Manage column configs" ON public.column_config WITH CHECK ${expression}`;
    }

    async function readCatalog(phase: string, includeTransaction = true) {
      const result = (await fixtureClient.query(
        catalogFor(phase, includeTransaction)
      )) as unknown as QueryResult[] | QueryResult;
      const results = Array.isArray(result) ? result : [result];
      const checks = results.find((entry) =>
        entry.rows.some((row: { check_name?: unknown }) =>
          typeof row.check_name === 'string'
        )
      );
      if (!checks) throw new Error('Catalog verifier returned no checks');
      return checks.rows as CatalogCheck[];
    }

    async function expectCatalogPasses(phase: string, includeTransaction = true) {
      const checks = await readCatalog(phase, includeTransaction);
      expect(checks).toHaveLength(16);
      expect(checks.map(({ check_name }) => check_name).sort()).toEqual(
        expectedCatalogCheckNames
      );
      expect(checks.every(({ passed }) => passed)).toBe(true);
    }

    async function expectCatalogFails(
      phase: string,
      expectedFailedChecks: string[],
      includeTransaction = true
    ) {
      const checks = await readCatalog(phase, includeTransaction);
      expect(checks).toHaveLength(16);
      expect(checks.map(({ check_name }) => check_name).sort()).toEqual(
        expectedCatalogCheckNames
      );
      expect(
        checks
          .filter(({ passed }) => !passed)
          .map(({ check_name }) => check_name)
          .sort()
      ).toEqual([...expectedFailedChecks].sort());
    }

    async function applyCorrection() {
      if (correctionApplied) return;
      await fixtureClient.query(migrationSql);
      correctionApplied = true;
    }

    async function applyTriggerCorrection() {
      if (triggerCorrectionApplied) return;
      await fixtureClient.query(triggerReconciliationMigrationSql);
      triggerCorrectionApplied = true;
    }

    async function restoreObservedChangedByForeignKey() {
      await fixtureClient.query(
        `ALTER TABLE public.employee_column_changes
           DROP CONSTRAINT employee_column_changes_changed_by_fkey;
         UPDATE public.employee_column_changes AS changes
         SET changed_by = users.auth_user_id
         FROM public.users AS users
         WHERE changes.changed_by = users.id;
         ALTER TABLE public.employee_column_changes
           ADD CONSTRAINT employee_column_changes_changed_by_fkey
             FOREIGN KEY (changed_by) REFERENCES public.users(auth_user_id)
             ON DELETE SET NULL`
      );
    }

    async function collectRlsSemantics(): Promise<RlsSemantics> {
      const activeHrConfigInsert = await asAuthenticated(
        ids.activeHrAuth,
        async () => {
          const result = await attempt(`
            INSERT INTO public.column_config (
              id, column_name, db_column_name, column_type, is_masterdata, role_permissions
            ) VALUES (
              gen_random_uuid(), 'Post-apply HR check',
              'post_apply_hr_${randomUUID().replaceAll('-', '')}',
              'text', false, '{"hr_admin":{"view":true,"edit":true}}'::jsonb
            )
          `);
          return result.ok && result.rowCount === 1;
        }
      );
      const inactiveHrConfigInsert = await asAuthenticated(
        ids.inactiveHrAuth,
        () =>
          attempt(`
            INSERT INTO public.column_config (
              id, column_name, db_column_name, column_type, is_masterdata, role_permissions
            ) VALUES (
              gen_random_uuid(), 'Post-apply inactive HR check',
              'post_apply_inactive_hr_${randomUUID().replaceAll('-', '')}',
              'text', false, '{"hr_admin":{"view":true,"edit":true}}'::jsonb
            )
          `)
      );
      const activeExternalConfigInsert = await asAuthenticated(
        ids.activeExternalAuth,
        () =>
          attempt(`
            INSERT INTO public.column_config (
              id, column_name, db_column_name, column_type, is_masterdata, role_permissions
            ) VALUES (
              gen_random_uuid(), 'Post-apply external check',
              'post_apply_external_${randomUUID().replaceAll('-', '')}',
              'text', false, '{"sodexo":{"view":true,"edit":true}}'::jsonb
            )
          `)
      );
      const activeExternalVisibleAuditCount = await asAuthenticated(
        ids.activeExternalAuth,
        async () => {
          const result = await fixtureClient.query<{ count: string }>(
            `SELECT count(*)::text AS count
             FROM public.employee_column_changes
             WHERE employee_id IN ($1, $2)`,
            [ids.activeEmployee, ids.archivedEmployee]
          );
          return Number(result.rows[0]?.count);
        }
      );
      const inactiveExternalAuditCount = await asAuthenticated(
        ids.inactiveExternalAuth,
        async () => {
          const result = await fixtureClient.query<{ count: string }>(
            `SELECT count(*)::text AS count
             FROM public.employee_column_changes
             WHERE employee_id IN ($1, $2)`,
            [ids.activeEmployee, ids.archivedEmployee]
          );
          return Number(result.rows[0]?.count);
        }
      );

      return {
        activeHrRole: await getUserRole(ids.activeHrAuth),
        inactiveHrRole: await getUserRole(ids.inactiveHrAuth),
        activeExternalRole: await getUserRole(ids.activeExternalAuth),
        inactiveExternalRole: await getUserRole(ids.inactiveExternalAuth),
        activeHrConfigInsert,
        inactiveHrConfigInsertDenied:
          !inactiveHrConfigInsert.ok && inactiveHrConfigInsert.code === '42501',
        activeExternalConfigInsertDenied:
          !activeExternalConfigInsert.ok &&
          activeExternalConfigInsert.code === '42501',
        activeExternalVisibleAuditCount,
        inactiveExternalAuditCount,
      };
    }

    beforeAll(async () => {
      if (!adminClient || !fixtureUrlValue) {
        throw new Error('Fixture administration URL is unavailable');
      }
      await adminClient.connect();
      adminConnected = true;
      await adminClient.query(
        `CREATE DATABASE ${fixtureDatabaseName} TEMPLATE ${templateDatabaseName}`
      );
      fixtureCreated = true;
      const databaseUrl = new URL(fixtureUrlValue);
      databaseUrl.pathname = `/${fixtureDatabaseName}`;
      fixtureClient = new Client({ connectionString: databaseUrl.toString() });
      await fixtureClient.connect();
      for (const source of stagingForwardMigrationSources) {
        await fixtureClient.query(source);
      }
      // The guarded template ends at the reviewed 58-row staging baseline.
      // Reproduce the exact 65-row hosted diagnosis before this correction.
      await fixtureClient.query(
        'GRANT EXECUTE ON FUNCTION public.get_user_role() TO service_role'
      );
      // The production API role can read the audit relation. The retained
      // 58-version fixture deliberately omits this application grant, so add
      // it only to the disposable clone before exercising its RLS predicate.
      await fixtureClient.query(
        `GRANT SELECT ON TABLE public.employee_column_changes,
          public.users, public.employees, public.column_config TO authenticated`
      );
      await fixtureClient.query(
        'GRANT INSERT ON TABLE public.column_config TO authenticated'
      );
      // The migration-built fixture intentionally has only its minimum table
      // grants. Add the application update grants to this disposable clone so
      // the trigger assertions exercise RLS and function behavior, rather
      // than failing at relation privilege resolution.
      await fixtureClient.query(
        'GRANT UPDATE ON TABLE public.employees, public.column_config TO authenticated'
      );

      await fixtureClient.query(
        `INSERT INTO auth.users (
           instance_id, id, aud, role, email, encrypted_password,
           email_confirmed_at, confirmation_token, recovery_token,
           email_change_token_new, email_change, raw_app_meta_data,
           raw_user_meta_data, created_at, updated_at, is_super_admin
         ) VALUES
           ('00000000-0000-0000-0000-000000000000', $1, 'authenticated',
            'authenticated', $2, '', now(), '', '', '', '', '{}'::jsonb,
            '{}'::jsonb, now(), now(), false),
           ('00000000-0000-0000-0000-000000000000', $3, 'authenticated',
            'authenticated', $4, '', now(), '', '', '', '', '{}'::jsonb,
            '{}'::jsonb, now(), now(), false),
           ('00000000-0000-0000-0000-000000000000', $5, 'authenticated',
            'authenticated', $6, '', now(), '', '', '', '', '{}'::jsonb,
            '{}'::jsonb, now(), now(), false),
           ('00000000-0000-0000-0000-000000000000', $7, 'authenticated',
            'authenticated', $8, '', now(), '', '', '', '', '{}'::jsonb,
            '{}'::jsonb, now(), now(), false)`,
        [
          ids.activeHrAuth,
          `post-apply-active-hr-${ids.activeHrAuth}@example.test`,
          ids.inactiveHrAuth,
          `post-apply-inactive-hr-${ids.inactiveHrAuth}@example.test`,
          ids.activeExternalAuth,
          `post-apply-active-external-${ids.activeExternalAuth}@example.test`,
          ids.inactiveExternalAuth,
          `post-apply-inactive-external-${ids.inactiveExternalAuth}@example.test`,
        ]
      );
      await fixtureClient.query(
        `INSERT INTO public.users (id, auth_user_id, email, role, is_active)
         VALUES
           ($1, $2, $3, 'hr_admin', true),
           ($4, $5, $6, 'hr_admin', false),
           ($7, $8, $9, 'sodexo', true),
           ($10, $11, $12, 'sodexo', false)`,
        [
          ids.activeHrApp,
          ids.activeHrAuth,
          `post-apply-active-hr-${ids.activeHrApp}@example.test`,
          ids.inactiveHrApp,
          ids.inactiveHrAuth,
          `post-apply-inactive-hr-${ids.inactiveHrApp}@example.test`,
          ids.activeExternalApp,
          ids.activeExternalAuth,
          `post-apply-active-external-${ids.activeExternalApp}@example.test`,
          ids.inactiveExternalApp,
          ids.inactiveExternalAuth,
          `post-apply-inactive-external-${ids.inactiveExternalApp}@example.test`,
        ]
      );
      await fixtureClient.query(
        `INSERT INTO public.employees (
           id, first_name, surname, ssn, email, mobile, rank, gender,
           town_district, hire_date, is_archived, is_terminated, comments,
           one, talmundo, isps, photo, origo, loneiva, mail_lon,
           bankuppgifter, li, passport, kvitto_c17_18, c17, crewing_done,
           hotel_required, special_diet, diet_details
         ) VALUES
           ($1, 'Post', 'Apply Active', $3, $4, '+46700002219', 'SEV', 'Woman',
            'Göteborg', '2020-01-01', false, false, 'Before', false, false,
            false, false, false, 1, false, false, false, false, false, false,
            false, false, false, null),
           ($2, 'Post', 'Apply Archived', $5, $6, '+46700002220', 'SEV', 'Woman',
            'Göteborg', '2020-01-01', true, false, 'Archived', false, false,
            false, false, false, 1, false, false, false, false, false, false,
            false, false, false, null)`,
        [
          ids.activeEmployee,
          ids.archivedEmployee,
          `221519-${ids.activeEmployee.slice(0, 4)}`,
          `post-apply-active-${ids.activeEmployee}@example.test`,
          `221520-${ids.archivedEmployee.slice(0, 4)}`,
          `post-apply-archived-${ids.archivedEmployee}@example.test`,
        ]
      );
      await fixtureClient.query(
        `INSERT INTO public.column_config (
           id, column_name, db_column_name, column_type, is_masterdata, role_permissions
         ) VALUES
           ($1, 'Post apply visible', $2, 'text', true,
            '{"sodexo":{"view":true,"edit":false}}'::jsonb),
           ($3, 'Post apply hidden', $4, 'text', true,
            '{"sodexo":{"view":false,"edit":false}}'::jsonb)`,
        [ids.visibleConfig, visibleColumn, ids.hiddenConfig, hiddenColumn]
      );
      await fixtureClient.query(
        `INSERT INTO public.employee_column_changes (
           employee_id, column_name, changed_by
         ) VALUES
           ($1, $3, $5), ($2, $3, $5), ($1, $4, $5)`,
        [
          ids.activeEmployee,
          ids.archivedEmployee,
          visibleColumn,
          hiddenColumn,
          ids.activeHrApp,
        ]
      );
    });

    afterAll(async () => {
      let cleanupFailure: unknown = null;
      if (fixtureClient) {
        try {
          await fixtureClient.query('ROLLBACK');
          await fixtureClient.end();
        } catch (error) {
          cleanupFailure ??= error;
        }
      }
      if (adminClient && adminConnected && fixtureCreated) {
        try {
          await adminClient.query(`DROP DATABASE ${fixtureDatabaseName}`);
        } catch (error) {
          cleanupFailure ??= error;
        }
      }
      if (adminClient && adminConnected) {
        try {
          await adminClient.end();
        } catch (error) {
          cleanupFailure ??= error;
        }
      }
      if (cleanupFailure) throw cleanupFailure;
    });

    it('accepts only the bounded production lower-only headcount contract before its immutable apply', async () => {
      const constraint = 'staffing_needs_headcount_need_check';
      const checkPasses = async (phase: string) =>
        (await readCatalog(phase, false)).find(
          (row) => row.check_name === 'staffing_constraints_and_rls'
        )?.passed;
      await fixtureClient.query('BEGIN');
      try {
        await fixtureClient.query(`ALTER TABLE public.staffing_needs DROP CONSTRAINT ${constraint};
          ALTER TABLE public.staffing_needs ADD CONSTRAINT ${constraint} CHECK (headcount_need >= 0)`);
        expect(await checkPasses('production_pre_apply')).toBe(true);
        expect(await checkPasses('post_apply')).toBe(false);
        expect(await checkPasses('staging_pre_apply')).toBe(false);
        await fixtureClient.query('SAVEPOINT lower_only');
        const outsideRange = await fixtureClient.query('UPDATE public.staffing_needs SET headcount_need = 10000');
        expect(outsideRange.rowCount).toBeGreaterThan(0);
        expect(await checkPasses('production_pre_apply')).toBe(false);
        await fixtureClient.query('ROLLBACK TO SAVEPOINT lower_only');
        await fixtureClient.query('ALTER TABLE public.staffing_needs ADD CONSTRAINT unexpected_headcount CHECK (headcount_need >= 0)');
        expect(await checkPasses('production_pre_apply')).toBe(false);
        await fixtureClient.query('ROLLBACK TO SAVEPOINT lower_only');
        await fixtureClient.query(`ALTER TABLE public.staffing_needs DROP CONSTRAINT ${constraint};
          ALTER TABLE public.staffing_needs ADD CONSTRAINT ${constraint} CHECK (headcount_need >= -1)`);
        expect(await checkPasses('production_pre_apply')).toBe(false);
        await fixtureClient.query('ROLLBACK TO SAVEPOINT lower_only');
        await fixtureClient.query(`ALTER TABLE public.staffing_needs DROP CONSTRAINT ${constraint};
          ALTER TABLE public.staffing_needs ADD CONSTRAINT ${constraint} CHECK (headcount_need >= 0) NOT VALID`);
        expect(await checkPasses('production_pre_apply')).toBe(false);
        await fixtureClient.query('ROLLBACK TO SAVEPOINT lower_only');
        const immutableApply = readFileSync('supabase/migrations/20260314000002_add_headcount_upper_bound.sql', 'utf8')
          .replace(/^BEGIN;\s*/m, '').replace(/^COMMIT;\s*/m, '');
        await fixtureClient.query(immutableApply);
        expect(await checkPasses('production_pre_apply')).toBe(false);
        expect(await checkPasses('post_apply')).toBe(true);
        await expect(fixtureClient.query('UPDATE public.staffing_needs SET headcount_need = 10000')).rejects.toThrow();
      } finally {
        await fixtureClient.query('ROLLBACK');
      }
    });

    it('reconciles the precise ACL and policy-initplan drift without changing RLS behavior', async () => {
      const beforeGrants = await getGetUserRoleGrants();
      const beforePolicies = await getPolicyExpressions();
      await fixtureClient.query('BEGIN');
      const beforeSemantics = await (async () => {
        try {
          return await collectRlsSemantics();
        } finally {
          await fixtureClient.query('ROLLBACK').catch(() => {});
        }
      })();

      expect(beforeGrants).toEqual(['anon', 'authenticated', 'service_role']);
      expect(beforePolicies).toHaveLength(2);
      expect(beforePolicies.every(({ using_expression }) =>
        !isCanonicalPolicyExpression(using_expression)
      )).toBe(true);
      expect(beforeSemantics).toEqual({
        activeHrRole: 'hr_admin',
        inactiveHrRole: null,
        activeExternalRole: 'sodexo',
        inactiveExternalRole: null,
        activeHrConfigInsert: true,
        inactiveHrConfigInsertDenied: true,
        activeExternalConfigInsertDenied: true,
        activeExternalVisibleAuditCount: 1,
        inactiveExternalAuditCount: 0,
      });

      await expectCatalogPasses('staging_reconciliation_pre_apply');
      await expectCatalogFails('post_apply', [
        'represented_policy_contracts',
        'story_22_15_phase_contracts',
      ]);

      await fixtureClient.query('BEGIN');
      try {
        const verifyPreApplyViolation = async (
          savepoint: string,
          sql: string,
          expectedFailedChecks: string[]
        ) => {
          await fixtureClient.query(`SAVEPOINT ${savepoint}`);
          try {
            await fixtureClient.query(sql);
            await expectCatalogFails(
              'staging_reconciliation_pre_apply',
              expectedFailedChecks,
              false
            );
          } finally {
            await fixtureClient.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
            await fixtureClient.query(`RELEASE SAVEPOINT ${savepoint}`);
          }
        };

        await verifyPreApplyViolation(
          'pre_missing_service_role',
          'REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM service_role',
          ['story_22_15_phase_contracts']
        );
        await verifyPreApplyViolation(
          'pre_missing_anon',
          'REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon',
          ['story_22_15_phase_contracts']
        );
        await verifyPreApplyViolation(
          'pre_public_execute_grant',
          'GRANT EXECUTE ON FUNCTION public.get_user_role() TO PUBLIC',
          ['story_22_15_phase_contracts']
        );
        for (const grantee of ['anon', 'authenticated', 'service_role']) {
          await verifyPreApplyViolation(
            `pre_${grantee}_execute_grant_option`,
            `GRANT EXECUTE ON FUNCTION public.get_user_role() TO ${grantee} WITH GRANT OPTION`,
            ['story_22_15_phase_contracts']
          );
        }
        for (const tableName of completeProfilePolicyTables) {
          await verifyPreApplyViolation(
            `pre_rls_disabled_${tableName}`,
            `ALTER TABLE public.${tableName} DISABLE ROW LEVEL SECURITY`,
            rlsDisableFailures(tableName)
          );
        }
        await verifyPreApplyViolation(
          'pre_mixed_policy_phase',
          `ALTER POLICY "Manage column configs"
             ON public.column_config
             USING (
               EXISTS (
                 SELECT 1 FROM public.users AS caller
                 WHERE caller.auth_user_id = (SELECT auth.uid())
                   AND caller.role = 'hr_admin'
                   AND caller.is_active = true
               )
             )
             WITH CHECK (
               EXISTS (
                 SELECT 1 FROM public.users AS caller
                 WHERE caller.auth_user_id = (SELECT auth.uid())
                   AND caller.role = 'hr_admin'
                   AND caller.is_active = true
               )
             )`,
          ['represented_policy_contracts']
        );
        await verifyPreApplyViolation(
          'pre_audit_policy_canonicalized_only',
          await alteredPolicyUsingSql(
            'Authorized roles can read visible employee changes',
            'employee_column_changes',
            canonicalizeDirectAuthUid
          ),
          ['represented_policy_contracts']
        );
        await verifyPreApplyViolation(
          'pre_removed_active_predicate',
          `ALTER POLICY "Manage column configs"
             ON public.column_config
             USING (
               EXISTS (
                 SELECT 1 FROM public.users AS caller
                 WHERE caller.auth_user_id = auth.uid()
                   AND caller.role = 'hr_admin'
               )
             )
             WITH CHECK (
               EXISTS (
                 SELECT 1 FROM public.users AS caller
                 WHERE caller.auth_user_id = auth.uid()
                   AND caller.role = 'hr_admin'
               )
             )`,
          ['represented_policy_contracts']
        );
        await verifyPreApplyViolation(
          'pre_unexpected_public_policy',
          `CREATE POLICY "Pre apply unexpected employee policy"
             ON public.employees
             FOR SELECT
             TO PUBLIC
             USING (true)`,
          ['represented_policy_contracts']
        );
      } finally {
        await fixtureClient.query('ROLLBACK');
      }

      await applyCorrection();

      await expectCatalogPasses('post_apply');
      await expectCatalogFails('staging_reconciliation_pre_apply', [
        'represented_policy_contracts',
        'story_22_15_phase_contracts',
      ]);

      await fixtureClient.query('BEGIN');
      try {
        const afterGrants = await getGetUserRoleGrants();
        const afterPolicies = await getPolicyExpressions();
        const afterSemantics = await collectRlsSemantics();
        expect(afterGrants).toEqual(['anon', 'authenticated']);
        expect(afterPolicies).toHaveLength(2);
        expect(afterPolicies.every(({ using_expression }) =>
          isCanonicalPolicyExpression(using_expression)
        )).toBe(true);
        expect(
          afterPolicies.find(({ policyname }) => policyname === 'Manage column configs')
            ?.check_expression
        ).toSatisfy((expression: string | null) =>
          typeof expression === 'string' && isCanonicalPolicyExpression(expression)
        );
        expect(afterSemantics).toEqual(beforeSemantics);
      } finally {
        await fixtureClient.query('ROLLBACK');
      }
    });

    it('rejects missing or unknown ACL grants and every requested policy-contract drift', async () => {
      await applyCorrection();
      await fixtureClient.query('BEGIN');
      try {
        const verifyViolation = async (
          savepoint: string,
          sql: string,
          expectedFailedChecks: string[]
        ) => {
          await fixtureClient.query(`SAVEPOINT ${savepoint}`);
          try {
            await fixtureClient.query(sql);
            await expectCatalogFails(
              'post_apply',
              expectedFailedChecks,
              false
            );
          } finally {
            await fixtureClient.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
            await fixtureClient.query(`RELEASE SAVEPOINT ${savepoint}`);
          }
        };

        await verifyViolation(
          'unknown_execute_grant',
          'GRANT EXECUTE ON FUNCTION public.get_user_role() TO PUBLIC',
          ['story_22_15_phase_contracts']
        );
        await verifyViolation(
          'missing_anon_grant',
          'REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon',
          ['story_22_15_phase_contracts']
        );
        for (const grantee of ['anon', 'authenticated']) {
          await verifyViolation(
            `post_${grantee}_execute_grant_option`,
            `GRANT EXECUTE ON FUNCTION public.get_user_role() TO ${grantee} WITH GRANT OPTION`,
            ['story_22_15_phase_contracts']
          );
        }
        for (const [signature, grantee] of [
          ['public.delete_app_user(uuid)', 'authenticated'],
          ['public.complete_app_user_auth_cleanup(uuid)', 'service_role'],
        ]) {
          await verifyViolation(
            `post_${signature.slice(7, signature.indexOf('('))}_execute_grant_option`,
            `GRANT EXECUTE ON FUNCTION ${signature} TO ${grantee} WITH GRANT OPTION`,
            ['story_22_15_phase_contracts']
          );
        }
        await verifyViolation(
          'post_staffing_function_execute_grant_option',
          'GRANT EXECUTE ON FUNCTION public.update_staffing_need(text, integer, uuid) TO authenticated WITH GRANT OPTION',
          ['represented_function_contracts']
        );
        for (const signature of [
          'public.recalculate_rooms_for_date(uuid)',
          'public.calculate_room_number(uuid, text, text)',
        ]) {
          await verifyViolation(
            `post_${signature.slice(7, signature.indexOf('('))}_execute_grant_option`,
            `GRANT EXECUTE ON FUNCTION ${signature} TO authenticated WITH GRANT OPTION`,
            ['represented_function_contracts']
          );
        }
        for (const tableName of completeProfilePolicyTables) {
          await verifyViolation(
            `post_rls_disabled_${tableName}`,
            `ALTER TABLE public.${tableName} DISABLE ROW LEVEL SECURITY`,
            rlsDisableFailures(tableName)
          );
        }
        await verifyViolation(
          'mixed_policy_phase',
          `ALTER POLICY "Manage column configs"
             ON public.column_config
             USING (
               EXISTS (
                 SELECT 1 FROM public.users AS caller
                 WHERE caller.auth_user_id = auth.uid()
                   AND caller.role = 'hr_admin'
                   AND caller.is_active = true
               )
             )
             WITH CHECK (
               EXISTS (
                 SELECT 1 FROM public.users AS caller
                 WHERE caller.auth_user_id = auth.uid()
                   AND caller.role = 'hr_admin'
                   AND caller.is_active = true
               )
             )`,
          ['represented_policy_contracts']
        );
        await verifyViolation(
          'post_audit_policy_restored_direct_only',
          await alteredPolicyUsingSql(
            'Authorized roles can read visible employee changes',
            'employee_column_changes',
            restoreDirectAuthUid
          ),
          ['represented_policy_contracts']
        );
        await verifyViolation(
          'post_manage_with_check_restored_direct_only',
          await alteredManageWithCheckSql(restoreDirectAuthUid),
          ['represented_policy_contracts']
        );
        await verifyViolation(
          'removed_active_predicate',
          `ALTER POLICY "Manage column configs"
             ON public.column_config
             USING (
               EXISTS (
                 SELECT 1 FROM public.users AS caller
                 WHERE caller.auth_user_id = (SELECT auth.uid())
                   AND caller.role = 'hr_admin'
               )
             )
             WITH CHECK (
               EXISTS (
                 SELECT 1 FROM public.users AS caller
                 WHERE caller.auth_user_id = (SELECT auth.uid())
                   AND caller.role = 'hr_admin'
               )
             )`,
          ['represented_policy_contracts']
        );
        await verifyViolation(
          'unexpected_public_policy',
          `CREATE POLICY "Post apply unexpected employee policy"
             ON public.employees
             FOR SELECT
             TO PUBLIC
             USING (true)`,
          ['represented_policy_contracts']
        );
      } finally {
        await fixtureClient.query('ROLLBACK');
      }
    });

    it('accepts only the reviewed trigger pre-state and rejects post-apply trigger or ACL drift', async () => {
      await applyCorrection();
      const observedAuditRows = [
        {
          columnName: 'observed_auth_fk_nonnull',
          changedAt: '2020-01-02T03:04:05.000Z',
          observedActorId: ids.activeExternalAuth,
          canonicalActorId: ids.activeExternalApp,
        },
        {
          columnName: 'observed_auth_fk_null',
          changedAt: '2020-01-02T03:04:06.000Z',
          observedActorId: null,
          canonicalActorId: null,
        },
      ];
      await restoreObservedChangedByForeignKey();
      await fixtureClient.query(
        `INSERT INTO public.employee_column_changes (
           employee_id, column_name, changed_at, changed_by
         ) VALUES
           ($1, $2, $3::timestamptz, $4),
           ($1, $5, $6::timestamptz, $7)`,
        [
          ids.activeEmployee,
          observedAuditRows[0].columnName,
          observedAuditRows[0].changedAt,
          observedAuditRows[0].observedActorId,
          observedAuditRows[1].columnName,
          observedAuditRows[1].changedAt,
          observedAuditRows[1].observedActorId,
        ]
      );
      const observedAuditHistoryCount = await fixtureClient.query<{
        count: string;
      }>('SELECT count(*)::text AS count FROM public.employee_column_changes');
      const observedAuditHistory = await fixtureClient.query<{
        column_name: string;
        changed_at: Date;
        changed_by: string | null;
      }>(
        `SELECT column_name, changed_at, changed_by
         FROM public.employee_column_changes
         WHERE column_name = ANY ($1::text[])
         ORDER BY column_name`,
        [observedAuditRows.map(({ columnName }) => columnName)]
      );
      expect(
        observedAuditHistory.rows.map(({ column_name, changed_at, changed_by }) => ({
          column_name,
          changed_at: changed_at.toISOString(),
          changed_by,
        }))
      ).toEqual(
        observedAuditRows.map(({ columnName, changedAt, observedActorId }) => ({
          column_name: columnName,
          changed_at: changedAt,
          changed_by: observedActorId,
        }))
      );
      await fixtureClient.query(
        'DROP TRIGGER update_column_config_updated_at ON public.column_config'
      );
      await fixtureClient.query(
        'ALTER TABLE public.column_config DROP COLUMN updated_at'
      );
      await fixtureClient.query(februaryAuditFunctionSql);
      await fixtureClient.query(
        'ALTER FUNCTION public.track_employee_column_changes() SET search_path = public, pg_temp'
      );
      await fixtureClient.query(
        'REVOKE EXECUTE ON FUNCTION public.track_employee_column_changes() FROM PUBLIC, anon, authenticated, service_role'
      );
      await fixtureClient.query(
        'GRANT EXECUTE ON FUNCTION public.track_employee_column_changes() TO service_role'
      );
      await fixtureClient.query(
        'GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO anon, authenticated, service_role'
      );

      await expectCatalogPasses('staging_trigger_reconciliation_pre_apply');
      await expectCatalogFails('post_apply', ['represented_trigger_contracts']);

      await fixtureClient.query('BEGIN');
      try {
        const oldAuditWrite = await asAuthenticated(ids.activeHrAuth, () =>
          attempt(
            `UPDATE public.employees
             SET comments = 'old-audit-body-records-auth-uuid'
             WHERE id = '${ids.activeEmployee}'`
          )
        );
        expect(oldAuditWrite).toEqual({ ok: true, rowCount: 1 });
      } finally {
        await fixtureClient.query('ROLLBACK');
      }

      await fixtureClient.query('BEGIN');
      try {
        await fixtureClient.query('GRANT USAGE, CREATE ON SCHEMA public TO authenticated');
        await fixtureClient.query(
          'ALTER FUNCTION public.track_employee_column_changes() OWNER TO authenticated'
        );
        await expectCatalogFails(
          'staging_trigger_reconciliation_pre_apply',
          ['represented_trigger_contracts'],
          false
        );
        await expect(
          fixtureClient.query(triggerReconciliationMigrationSql)
        ).rejects.toThrow('Unexpected represented trigger function attributes');
      } finally {
        await fixtureClient.query('ROLLBACK');
      }
      await expectCatalogPasses('staging_trigger_reconciliation_pre_apply');

      await fixtureClient.query(
        `CREATE TRIGGER trigger_reconciliation_unexpected
         BEFORE UPDATE ON public.column_config
         FOR EACH ROW
         EXECUTE FUNCTION public.update_updated_at_column()`
      );
      await expect(
        fixtureClient.query(triggerReconciliationMigrationSql)
      ).rejects.toThrow();
      await fixtureClient.query('ROLLBACK');
      const absentAfterRefusal = await fixtureClient.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'column_config'
           AND column_name = 'updated_at'`
      );
      expect(absentAfterRefusal.rows[0]?.count).toBe('0');
      await fixtureClient.query(
        'DROP TRIGGER trigger_reconciliation_unexpected ON public.column_config'
      );
      await expectCatalogPasses('staging_trigger_reconciliation_pre_apply');

      const changedByForeignKeyVariants = [
        {
          name: 'delete_cascade',
          definition: 'ON DELETE CASCADE',
        },
        {
          name: 'delete_restrict',
          definition: 'ON DELETE RESTRICT',
        },
        {
          name: 'update_cascade',
          definition: 'ON DELETE SET NULL ON UPDATE CASCADE',
        },
        {
          name: 'update_restrict',
          definition: 'ON DELETE SET NULL ON UPDATE RESTRICT',
        },
        {
          name: 'match_full',
          definition: 'MATCH FULL ON DELETE SET NULL',
        },
        {
          name: 'deferrable',
          definition: 'ON DELETE SET NULL DEFERRABLE',
        },
        {
          name: 'initially_deferred',
          definition: 'ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED',
        },
      ];
      const verifyChangedByForeignKeyViolations = async (
        phase: 'staging_trigger_reconciliation_pre_apply' | 'post_apply',
        expectMigrationRefusal: boolean
      ) => {
        const referencedColumn =
          phase === 'staging_trigger_reconciliation_pre_apply'
            ? 'auth_user_id'
            : 'id';
        await fixtureClient.query('BEGIN');
        try {
          const verifyViolation = async (
            name: string,
            sql: string,
            expectedMigrationFailure = 'Expected audit foreign key'
          ) => {
            const savepoint = `changed_by_fk_${phase}_${name}`;
            await fixtureClient.query(`SAVEPOINT ${savepoint}`);
            try {
              await fixtureClient.query(sql);
              await expectCatalogFails(
                phase,
                ['represented_trigger_contracts'],
                false
              );
              if (expectMigrationRefusal) {
                await expect(
                  fixtureClient.query(triggerReconciliationMigrationSql)
                ).rejects.toThrow(expectedMigrationFailure);
              }
            } finally {
              await fixtureClient.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
              await fixtureClient.query(`RELEASE SAVEPOINT ${savepoint}`);
            }
          };

          for (const { name, definition } of changedByForeignKeyVariants) {
            await verifyViolation(
              name,
              `ALTER TABLE public.employee_column_changes
                 DROP CONSTRAINT employee_column_changes_changed_by_fkey;
               ALTER TABLE public.employee_column_changes
                 ADD CONSTRAINT employee_column_changes_changed_by_fkey
                   FOREIGN KEY (changed_by) REFERENCES public.users(${referencedColumn}) ${definition}`
            );
          }
          await verifyViolation(
            'duplicate',
            `ALTER TABLE public.employee_column_changes
               ADD CONSTRAINT employee_column_changes_changed_by_duplicate_fkey
                 FOREIGN KEY (changed_by) REFERENCES public.users(${referencedColumn}) ON DELETE SET NULL`
          );
          await verifyViolation(
            'renamed',
            `ALTER TABLE public.employee_column_changes
               DROP CONSTRAINT employee_column_changes_changed_by_fkey;
             ALTER TABLE public.employee_column_changes
               ADD CONSTRAINT employee_column_changes_changed_by_renamed_fkey
                 FOREIGN KEY (changed_by) REFERENCES public.users(${referencedColumn}) ON DELETE SET NULL`
          );
          await verifyViolation(
            'unexpected_trigger',
            `CREATE FUNCTION public.employee_column_changes_noop_trigger()
               RETURNS trigger LANGUAGE plpgsql AS $$
               BEGIN
                 RETURN NEW;
               END;
               $$;
             CREATE TRIGGER employee_column_changes_unexpected_trigger
               BEFORE UPDATE ON public.employee_column_changes
               FOR EACH ROW
               EXECUTE FUNCTION public.employee_column_changes_noop_trigger()`,
            'Unexpected audit write side effects'
          );
          await verifyViolation(
            'unexpected_rule',
            `CREATE RULE employee_column_changes_unexpected_rule AS
               ON UPDATE TO public.employee_column_changes
               DO INSTEAD NOTHING`,
            'Unexpected audit write side effects'
          );
          await verifyViolation(
            'unmapped_actor',
            `SET LOCAL session_replication_role = 'replica';
             UPDATE public.employee_column_changes
             SET changed_by = '${ids.hiddenConfig}'
             WHERE column_name = '${observedAuditRows[0].columnName}';
             SET LOCAL session_replication_role = 'origin'`,
            'Unmapped audit actor prevents reconciliation'
          );
        } finally {
          await fixtureClient.query('ROLLBACK');
        }
      };

      await verifyChangedByForeignKeyViolations(
        'staging_trigger_reconciliation_pre_apply',
        true
      );
      await expectCatalogPasses('staging_trigger_reconciliation_pre_apply');

      await applyTriggerCorrection();
      const canonicalAuditHistoryCount = await fixtureClient.query<{
        count: string;
      }>('SELECT count(*)::text AS count FROM public.employee_column_changes');
      expect(canonicalAuditHistoryCount.rows[0]?.count).toBe(
        observedAuditHistoryCount.rows[0]?.count
      );
      const canonicalAuditHistory = await fixtureClient.query<{
        column_name: string;
        changed_at: Date;
        changed_by: string | null;
      }>(
        `SELECT column_name, changed_at, changed_by
         FROM public.employee_column_changes
         WHERE column_name = ANY ($1::text[])
         ORDER BY column_name`,
        [observedAuditRows.map(({ columnName }) => columnName)]
      );
      expect(
        canonicalAuditHistory.rows.map(
          ({ column_name, changed_at, changed_by }) => ({
            column_name,
            changed_at: changed_at.toISOString(),
            changed_by,
          })
        )
      ).toEqual(
        observedAuditRows.map(({ columnName, changedAt, canonicalActorId }) => ({
          column_name: columnName,
          changed_at: changedAt,
          changed_by: canonicalActorId,
        }))
      );
      await expectCatalogPasses('post_apply');
      await expectCatalogFails('staging_trigger_reconciliation_pre_apply', [
        'represented_trigger_contracts',
      ]);

      await verifyChangedByForeignKeyViolations('post_apply', true);
      await expectCatalogPasses('post_apply');

      await fixtureClient.query('BEGIN');
      try {
        await fixtureClient.query('GRANT USAGE, CREATE ON SCHEMA public TO authenticated');
        await fixtureClient.query(
          'ALTER FUNCTION public.update_updated_at_column() OWNER TO authenticated'
        );
        await expectCatalogFails(
          'post_apply',
          ['represented_trigger_contracts'],
          false
        );
      } finally {
        await fixtureClient.query('ROLLBACK');
      }
      await expectCatalogPasses('post_apply');

      await fixtureClient.query('BEGIN');
      try {
        const configBefore = await fixtureClient.query<{
          column_name: string;
          db_column_name: string;
          column_type: string;
          is_masterdata: boolean;
          role_permissions: unknown;
        }>(
          `SELECT column_name, db_column_name, column_type, is_masterdata,
                  role_permissions
           FROM public.column_config
           WHERE id = $1`,
          [ids.visibleConfig]
        );
        const auditBefore = await fixtureClient.query<{ count: string }>(
          `SELECT count(*)::text AS count
           FROM public.employee_column_changes
           WHERE employee_id = $1
             AND column_name = 'comments'
             AND changed_by = $2`,
          [ids.activeEmployee, ids.activeHrApp]
        );

        const configUpdate = await asAuthenticated(ids.activeHrAuth, () =>
          fixtureClient.query<{
            updated_at: Date;
          }>(
            `UPDATE public.column_config
             SET column_name = column_name || ' timestamp proof',
                 updated_at = '2000-01-01T00:00:00Z'::timestamptz
             WHERE id = $1
             RETURNING updated_at`,
            [ids.visibleConfig]
          )
        );
        expect(configUpdate.rowCount).toBe(1);
        expect(configUpdate.rows[0]?.updated_at.toISOString()).not.toBe(
          '2000-01-01T00:00:00.000Z'
        );

        const employeeUpdate = await asAuthenticated(ids.activeHrAuth, () =>
          fixtureClient.query(
            `UPDATE public.employees
             SET comments = 'canonical-audit-body-records-app-user'
             WHERE id = $1`,
            [ids.activeEmployee]
          )
        );
        expect(employeeUpdate.rowCount).toBe(1);
        await fixtureClient.query('RESET ROLE');

        const configAfter = await fixtureClient.query<{
          db_column_name: string;
          column_type: string;
          is_masterdata: boolean;
          role_permissions: unknown;
        }>(
          `SELECT db_column_name, column_type, is_masterdata, role_permissions
           FROM public.column_config
           WHERE id = $1`,
          [ids.visibleConfig]
        );
        expect(configAfter.rows[0]).toEqual({
          db_column_name: configBefore.rows[0]?.db_column_name,
          column_type: configBefore.rows[0]?.column_type,
          is_masterdata: configBefore.rows[0]?.is_masterdata,
          role_permissions: configBefore.rows[0]?.role_permissions,
        });

        const auditAfter = await fixtureClient.query<{ count: string }>(
          `SELECT count(*)::text AS count
           FROM public.employee_column_changes
           WHERE employee_id = $1
             AND column_name = 'comments'
             AND changed_by = $2`,
          [ids.activeEmployee, ids.activeHrApp]
        );
        expect(Number(auditAfter.rows[0]?.count)).toBe(
          Number(auditBefore.rows[0]?.count) + 1
        );
      } finally {
        await fixtureClient.query('ROLLBACK');
      }

      await fixtureClient.query('BEGIN');
      try {
        await fixtureClient.query(
          'ALTER TABLE public.column_config DISABLE TRIGGER update_column_config_updated_at'
        );
        await expectCatalogFails(
          'post_apply',
          ['represented_trigger_contracts'],
          false
        );
        await fixtureClient.query('ROLLBACK');

        await fixtureClient.query('BEGIN');
        await fixtureClient.query(
          'GRANT EXECUTE ON FUNCTION public.track_employee_column_changes() TO service_role'
        );
        await expectCatalogFails(
          'post_apply',
          ['represented_trigger_contracts'],
          false
        );
      } finally {
        await fixtureClient.query('ROLLBACK');
      }
    });

    it('rejects a mixed observed/canonical trigger profile before it can be reconciled', async () => {
      await applyCorrection();
      await applyTriggerCorrection();
      await expectCatalogPasses('post_apply');

      await fixtureClient.query('BEGIN');
      try {
        await fixtureClient.query(
          'DROP TRIGGER update_column_config_updated_at ON public.column_config'
        );
        await fixtureClient.query(
          'ALTER TABLE public.column_config DROP COLUMN updated_at'
        );
        await fixtureClient.query(februaryAuditFunctionSql);
        await fixtureClient.query(
          'ALTER FUNCTION public.track_employee_column_changes() SET search_path = public, pg_temp'
        );
        await fixtureClient.query(
          'REVOKE EXECUTE ON FUNCTION public.track_employee_column_changes() FROM PUBLIC, anon, authenticated, service_role'
        );
        await fixtureClient.query(
          'GRANT EXECUTE ON FUNCTION public.track_employee_column_changes() TO service_role'
        );
        await fixtureClient.query(
          'GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO anon, authenticated, service_role'
        );
        await restoreObservedChangedByForeignKey();
        await expectCatalogPasses(
          'staging_trigger_reconciliation_pre_apply',
          false
        );

        await fixtureClient.query(
          'ALTER TABLE public.column_config ADD COLUMN updated_at timestamptz DEFAULT now()'
        );
        await expectCatalogFails(
          'staging_trigger_reconciliation_pre_apply',
          ['represented_trigger_contracts'],
          false
        );
        await expect(
          fixtureClient.query(triggerReconciliationMigrationSql)
        ).rejects.toThrow('Unexpected represented trigger function');
      } finally {
        await fixtureClient.query('ROLLBACK');
      }

      await expectCatalogPasses('post_apply');
    });
  }
);
