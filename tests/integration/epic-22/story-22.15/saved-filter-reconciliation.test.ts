import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { Client, type QueryResult } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const fixtureUrlValue =
  process.env.STORY_22_15_RECONCILIATION_FIXTURE_DATABASE_URL;
const requireFixture =
  process.env.REQUIRE_STORY_22_15_RECONCILIATION_DB_EVIDENCE === 'true';

if (!fixtureUrlValue && requireFixture) {
  throw new Error(
    'REQUIRE_STORY_22_15_RECONCILIATION_DB_EVIDENCE requires a local fixture URL'
  );
}

const fixtureUrl = fixtureUrlValue ? new URL(fixtureUrlValue) : null;
if (
  fixtureUrl &&
  (fixtureUrl.hostname !== '127.0.0.1' || fixtureUrl.port !== '45432')
) {
  throw new Error(
    'Story 22.15 reconciliation evidence only permits the guarded loopback fixture'
  );
}

if (!fixtureUrl) {
  console.warn(
    'Skipping Story 22.15 reconciliation fixture evidence: set STORY_22_15_RECONCILIATION_FIXTURE_DATABASE_URL for the guarded local PostgreSQL fixture.'
  );
}

const migrationSql = readFileSync(
  'supabase/migrations/20260909115242_reconcile_saved_filters_and_room_acl.sql',
  'utf8'
);
const staffingMigrationSql = readFileSync(
  'supabase/migrations/20260314000001_add_update_staffing_need_rpc.sql',
  'utf8'
);
const staffingHardeningMigrationSql = readFileSync(
  'supabase/migrations/20260709194903_remediate_pr_91_security_findings.sql',
  'utf8'
);
const catalogSql = readFileSync(
  'supabase/verify/production-baseline-catalog.sql',
  'utf8'
);
const fixtureDatabaseName = `story_2215_reconciliation_${randomUUID()
  .replaceAll('-', '')
  .slice(0, 20)}`;
const administrationUrl = fixtureUrl ? new URL(fixtureUrl) : null;
if (administrationUrl) administrationUrl.pathname = '/template1';

type CatalogCheck = {
  check_name: string;
  passed: boolean;
  observed: {
    staging_pre_apply_data_prerequisites?: {
      orphan_auth_references: number;
      empty_names: number;
      overlength_names: number;
    };
  };
};

function catalogFor(phase: string, includeTransaction = true) {
  const phaseSql = catalogSql.replaceAll(
    ":'catalog_phase'",
    `'${phase}'`
  );
  return includeTransaction
    ? phaseSql
    : phaseSql
        .replace('BEGIN TRANSACTION READ ONLY;', '')
        .replace(/\r?\nCOMMIT;\s*$/, '');
}

async function readCatalog(client: Client, phase: string, includeTransaction = true) {
  const result = (await client.query(
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

describe.skipIf(!fixtureUrl)(
  'Story 22.15 saved-filter forward reconciliation',
  () => {
    const adminClient = administrationUrl
      ? new Client({ connectionString: administrationUrl.toString() })
      : null;
    let fixtureClient: Client;
    let adminConnected = false;
    let fixtureDatabaseCreated = false;
    const validAuthUserId = randomUUID();

    beforeAll(async () => {
      if (!adminClient) throw new Error('Fixture administration URL is unavailable');
      await adminClient.connect();
      adminConnected = true;
      await adminClient.query(
        `CREATE DATABASE ${fixtureDatabaseName} TEMPLATE postgres`
      );
      fixtureDatabaseCreated = true;
      const databaseUrl = new URL(fixtureUrlValue!);
      databaseUrl.pathname = `/${fixtureDatabaseName}`;
      fixtureClient = new Client({ connectionString: databaseUrl.toString() });
      await fixtureClient.connect();

      await fixtureClient.query(`
        ALTER TABLE public.user_filters
          ALTER COLUMN filters SET DEFAULT '[]'::jsonb;
        ALTER TABLE public.user_filters
          DROP CONSTRAINT user_filters_user_id_fkey,
          DROP CONSTRAINT unique_user_filter_name,
          DROP CONSTRAINT valid_name_length;
        ALTER TABLE public.user_filters
          ADD CONSTRAINT user_filters_user_id_name_key UNIQUE (user_id, name),
          ADD CONSTRAINT user_filters_name_check CHECK (char_length(name) <= 50);
        DROP INDEX public.idx_user_filters_user_id;
        DROP INDEX public.idx_user_filters_name;
        DROP TRIGGER set_updated_at ON public.user_filters;
        DROP FUNCTION public.trigger_set_updated_at();
      `);

      await fixtureClient.query(
        `INSERT INTO auth.users (
           instance_id, id, aud, role, email, encrypted_password,
           email_confirmed_at, confirmation_token, recovery_token,
           email_change_token_new, email_change, raw_app_meta_data,
           raw_user_meta_data, created_at, updated_at, is_super_admin
         ) VALUES (
           '00000000-0000-0000-0000-000000000000', $1, 'authenticated',
           'authenticated', $2, '', now(), '', '', '', '', '{}'::jsonb,
           '{}'::jsonb, now(), now(), false
         )`,
        [
          validAuthUserId,
          `story-22-15-reconciliation-${validAuthUserId}@example.test`,
        ]
      );

      const representedBody = '\r\nBEGIN\r\n  NEW.updated_at = NOW();\r\n  RETURN NEW;\r\nEND;\r\n';
      await fixtureClient.query(`
        CREATE OR REPLACE FUNCTION public.update_user_filters_updated_at()
        RETURNS trigger
        LANGUAGE plpgsql
        SET search_path = public, pg_temp
        AS $function$${representedBody}$function$;
        CREATE TRIGGER user_filters_updated_at
          BEFORE UPDATE ON public.user_filters
          FOR EACH ROW
          EXECUTE FUNCTION public.update_user_filters_updated_at();
        UPDATE public.column_config
        SET role_permissions = role_permissions || jsonb_build_object(
          'admin_limited',
          jsonb_build_object('view', true, 'edit', false)
        )
        WHERE db_column_name IN ('diet_details', 'special_diet');
        GRANT EXECUTE ON FUNCTION public.recalculate_rooms_for_date(uuid)
          TO anon, service_role;
        GRANT EXECUTE ON FUNCTION public.calculate_room_number(uuid, text, text)
          TO anon, service_role;
      `);

      // Staging has applied the search-path and ACL hardening for the original
      // staffing RPC, but not the later active-actor implementation. Rebuild
      // that exact pre-July function contract so the complete amended group is
      // exercised without claiming that this post-63 clone is full staging.
      await fixtureClient.query(staffingMigrationSql);
      await fixtureClient.query(`
        ALTER FUNCTION public.update_staffing_need(text, integer, uuid)
          SET search_path = public, pg_temp;
        REVOKE EXECUTE ON FUNCTION public.update_staffing_need(text, integer, uuid)
          FROM PUBLIC, anon, authenticated, service_role;
        GRANT EXECUTE ON FUNCTION public.update_staffing_need(text, integer, uuid)
          TO authenticated, service_role;
      `);
    });

    afterAll(async () => {
      let cleanupFailure: unknown = null;

      if (fixtureClient) {
        try {
          await fixtureClient.end();
        } catch (error) {
          cleanupFailure ??= error;
        }
      }

      if (adminClient && adminConnected && fixtureDatabaseCreated) {
        try {
          await adminClient.query(`DROP DATABASE ${fixtureDatabaseName}`);
          const result = await adminClient.query<{ exists: boolean }>(
            `SELECT EXISTS (
               SELECT 1 FROM pg_database WHERE datname = $1
             ) AS exists`,
            [fixtureDatabaseName]
          );
          if (result.rows[0]?.exists) {
            throw new Error('Story 22.15 reconciliation fixture database still exists');
          }
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

    it('recognizes the reviewed staging representation before reconciliation', async () => {
      const checks = await readCatalog(fixtureClient, 'staging_pre_apply');
      for (const checkName of [
        'dietary_columns_and_permissions',
        'user_filters_objects',
        'user_filters_trigger_function_contract',
        'represented_function_contracts',
      ]) {
        expect(checks.find((check) => check.check_name === checkName)?.passed).toBe(
          true
        );
      }

      const grants = await fixtureClient.query<{ grants: string }>(`
        SELECT array_agg(
          CASE WHEN grantor.grantee = 0 THEN 'PUBLIC' ELSE role.rolname END
          ORDER BY CASE WHEN grantor.grantee = 0 THEN 'PUBLIC' ELSE role.rolname END
        ) AS grants
        FROM pg_proc AS function
        CROSS JOIN LATERAL aclexplode(
          coalesce(function.proacl, acldefault('f', function.proowner))
        ) AS grantor
        LEFT JOIN pg_roles AS role ON role.oid = grantor.grantee
        WHERE function.oid = to_regprocedure(
          'public.recalculate_rooms_for_date(uuid)'
        )
          AND grantor.privilege_type = 'EXECUTE'
          AND grantor.grantee <> function.proowner
      `);
      expect(grants.rows[0].grants).toBe(
        '{PUBLIC,anon,authenticated,service_role}'
      );
    });

    it.each([
      {
        label: 'mixed foreign key',
        checkName: 'user_filters_objects',
        sql: `ALTER TABLE public.user_filters
                ADD CONSTRAINT user_filters_user_id_fkey
                  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;`,
      },
      {
        label: 'missing reviewed array default',
        checkName: 'user_filters_objects',
        sql: `ALTER TABLE public.user_filters ALTER COLUMN filters DROP DEFAULT;`,
      },
      {
        label: 'canonical trigger function alongside the represented alias',
        checkName: 'user_filters_trigger_function_contract',
        sql: `CREATE FUNCTION public.trigger_set_updated_at()
              RETURNS trigger LANGUAGE plpgsql
              SET search_path = public, pg_temp
              AS $function$BEGIN RETURN NEW; END;$function$;`,
      },
      {
        label: 'changed represented trigger source',
        checkName: 'user_filters_trigger_function_contract',
        sql: `CREATE OR REPLACE FUNCTION public.update_user_filters_updated_at()
              RETURNS trigger LANGUAGE plpgsql
              SET search_path = public, pg_temp
              AS $function$BEGIN RETURN NEW; END;$function$;`,
      },
      {
        label: 'orphan auth reference',
        checkName: 'user_filters_objects',
        expectedDataPrerequisites: {
          orphan_auth_references: 1,
          empty_names: 0,
          overlength_names: 0,
        },
        sql: `INSERT INTO public.user_filters (id, user_id, name, filters)
              VALUES ('${randomUUID()}', '${randomUUID()}', 'orphan', '[]'::jsonb);`,
      },
      {
        label: 'empty saved-filter name',
        checkName: 'user_filters_objects',
        expectedDataPrerequisites: {
          orphan_auth_references: 0,
          empty_names: 1,
          overlength_names: 0,
        },
        sql: `INSERT INTO public.user_filters (id, user_id, name, filters)
              VALUES ('${randomUUID()}', '${validAuthUserId}', '', '[]'::jsonb);`,
      },
      {
        label: 'overlength saved-filter name',
        checkName: 'user_filters_objects',
        expectedDataPrerequisites: {
          orphan_auth_references: 0,
          empty_names: 0,
          overlength_names: 1,
        },
        sql: `ALTER TABLE public.user_filters
                DROP CONSTRAINT user_filters_name_check;
              ALTER TABLE public.user_filters
                ADD CONSTRAINT user_filters_name_check CHECK (true);
              INSERT INTO public.user_filters (id, user_id, name, filters)
              VALUES ('${randomUUID()}', '${validAuthUserId}', repeat('x', 51), '[]'::jsonb);`,
      },
      {
        label: 'unexpected dietary permission role',
        checkName: 'dietary_columns_and_permissions',
        sql: `UPDATE public.column_config
              SET role_permissions = role_permissions || jsonb_build_object(
                'unreviewed_role', jsonb_build_object('view', true, 'edit', false)
              )
              WHERE db_column_name = 'diet_details';`,
      },
      {
        label: 'admin-limited dietary edit access',
        checkName: 'dietary_columns_and_permissions',
        sql: `UPDATE public.column_config
              SET role_permissions = jsonb_set(
                role_permissions,
                '{admin_limited,edit}',
                'true'::jsonb
              )
              WHERE db_column_name = 'diet_details';`,
      },
      {
        label: 'unexpected room RPC execute grant',
        checkName: 'represented_function_contracts',
        sql: `GRANT EXECUTE ON FUNCTION public.recalculate_rooms_for_date(uuid)
              TO pg_monitor;`,
      },
    ])('rejects $label', async ({ checkName, sql, expectedDataPrerequisites }) => {
      await fixtureClient.query('BEGIN');
      try {
        await fixtureClient.query(sql);
        const checks = await readCatalog(
          fixtureClient,
          'staging_pre_apply',
          false
        );
        const check = checks.find((candidate) => candidate.check_name === checkName);
        expect(check?.passed).toBe(false);
        if (expectedDataPrerequisites) {
          expect(
            check?.observed.staging_pre_apply_data_prerequisites
          ).toMatchObject(expectedDataPrerequisites);
        }
      } finally {
        await fixtureClient.query('ROLLBACK');
      }
    });

    it('stops before schema changes when data cleanup becomes necessary', async () => {
      await fixtureClient.query('BEGIN');
      try {
        await fixtureClient.query(`
          INSERT INTO public.user_filters (id, user_id, name, filters)
          VALUES ('${randomUUID()}', '${validAuthUserId}', '', '[]'::jsonb);
        `);
        await expect(fixtureClient.query(migrationSql)).rejects.toThrow(
          'user_filters requires approved data cleanup before reconciliation'
        );
      } finally {
        await fixtureClient.query('ROLLBACK');
      }
    });

    it('converges the represented fixture on the strict post-apply catalog', async () => {
      // This forward migration is ordered before the reconciliation migration
      // in the staging plan. Apply the real staffing hardening here because
      // the exact staging representation intentionally still has the earlier
      // staffing implementation that the post-apply contract rejects.
      await fixtureClient.query(staffingHardeningMigrationSql);
      await fixtureClient.query(migrationSql);
      const checks = await readCatalog(fixtureClient, 'post_apply');
      expect(checks.filter((check) => !check.passed)).toEqual([]);

      await fixtureClient.query('BEGIN');
      try {
        await fixtureClient.query(`
          CREATE FUNCTION public.update_user_filters_updated_at()
          RETURNS trigger
          LANGUAGE plpgsql
          SET search_path = public, pg_temp
          AS $function$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $function$;
        `);
        const withLegacyAlias = await readCatalog(
          fixtureClient,
          'post_apply',
          false
        );
        for (const checkName of [
          'user_filters_objects',
          'user_filters_trigger_function_contract',
        ]) {
          expect(
            withLegacyAlias.find((check) => check.check_name === checkName)
              ?.passed
          ).toBe(false);
        }
      } finally {
        await fixtureClient.query('ROLLBACK');
      }

      const canonical = await fixtureClient.query<{
        column_default: string | null;
        unique_name: string | null;
        check_name: string | null;
        trigger_name: string | null;
      }>(`
        SELECT
          (SELECT column_default FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'user_filters'
             AND column_name = 'filters') AS column_default,
          (SELECT conname FROM pg_constraint
           WHERE conrelid = 'public.user_filters'::regclass
             AND conname = 'unique_user_filter_name') AS unique_name,
          (SELECT conname FROM pg_constraint
           WHERE conrelid = 'public.user_filters'::regclass
             AND conname = 'valid_name_length') AS check_name,
          (SELECT tgname FROM pg_trigger
           WHERE tgrelid = 'public.user_filters'::regclass
             AND NOT tgisinternal) AS trigger_name
      `);
      expect(canonical.rows).toEqual([
        {
          column_default: null,
          unique_name: 'unique_user_filter_name',
          check_name: 'valid_name_length',
          trigger_name: 'set_updated_at',
        },
      ]);
    });
  }
);
