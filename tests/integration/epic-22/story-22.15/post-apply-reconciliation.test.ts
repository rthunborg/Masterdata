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
  'represented_column_contracts',
  'represented_function_contracts',
  'staffing_crewing_done_permission_state',
  'represented_policy_contracts',
].sort();

function normalize(expression: string) {
  return expression.toLowerCase().replace(/\s+/g, '');
}

function isCanonicalPolicyExpression(expression: string) {
  return normalize(expression).includes(
    'caller.auth_user_id=(selectauth.uid()asuid)'
  );
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
      expect(checks).toHaveLength(15);
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
      expect(checks).toHaveLength(15);
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
  }
);
