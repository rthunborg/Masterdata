import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

import { PRODUCTION_CLI_MATRIX_BOOTSTRAP_SQL } from '../../../support/production-cli-matrix-fixture.mjs';
import {
  assertGuardedPostgresSystemIdentifierHash,
  createGuardedFixtureDatabaseWithHash,
} from '../../../support/guarded-postgres-fixture.mjs';
import {
  MATRIX_ADMISSION_ENV,
  MATRIX_REQUIRED_ENV,
  requireMatrixAdmission,
} from '../../../support/production-cli-matrix-gate.mjs';
import { assessProductionStaffingPreExecuteProof, PRODUCTION_STAFFING_UPDATED_BY_FK_RECONCILIATION_VERSION } from '../../../../src/lib/release/production-staffing-pre-execute-contract.mjs';

const sourceSha = 'a'.repeat(40);
const sourceTree = 'b'.repeat(40);
const sourceManifestSha256 = 'c'.repeat(64);
const targetBindingSha256 = 'd'.repeat(64);
const staffingSql = readFileSync(
  path.join(process.cwd(), 'src/lib/release/production-staffing-pre-execute.sql'),
  'utf8'
);
const staffingForeignKeyReconciliationSql = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260930091123_reconcile_staffing_updated_by_foreign_key.sql'),
  'utf8'
);

const admissionPath = process.env[MATRIX_ADMISSION_ENV];
const requiredMatrix = process.env[MATRIX_REQUIRED_ENV] === 'true';
const MATRIX_ADMISSION_MAX_AGE_MS = 15 * 60 * 1000;

const staffingFunctionSql = `
CREATE OR REPLACE FUNCTION public.update_staffing_need(
  p_location text, p_new_value integer, p_user_id uuid
) RETURNS TABLE(old_value integer, new_value integer)
LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE
AS $$ BEGIN RETURN QUERY SELECT 0::integer, 0::integer; END; $$;
REVOKE ALL ON FUNCTION public.update_staffing_need(text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_staffing_need(text, integer, uuid)
  TO PUBLIC, anon, authenticated, service_role;
`;

function readFreshGuardedAdmission() {
  requireMatrixAdmission(process.env);
  if (!admissionPath) return null;
  if (!path.isAbsolute(admissionPath)) {
    throw new Error('staffing_local_fixture_admission_invalid');
  }
  const value = JSON.parse(readFileSync(admissionPath, 'utf8'));
  const binding = value?.guardBinding;
  const observedAt = Date.parse(binding?.observedAtUtc ?? '');
  if (
    !binding ||
    binding.owned !== true ||
    binding.verified !== true ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(binding.resourceId ?? '') ||
    !/^[a-f0-9]{64}$/u.test(binding.composeSha256 ?? '') ||
    !/^[a-f0-9]{64}$/u.test(binding.expectedSystemIdentifierSha256 ?? '') ||
    !Number.isInteger(binding.port) || binding.port < 1024 || binding.port > 65535 ||
    typeof binding.password !== 'string' || !/^[a-f0-9]{32,64}$/u.test(binding.password) ||
    !Number.isFinite(observedAt) || Date.now() - observedAt < 0 ||
    Date.now() - observedAt >= MATRIX_ADMISSION_MAX_AGE_MS
  ) {
    throw new Error('staffing_local_fixture_admission_invalid');
  }
  return Object.freeze({ ...binding });
}

const admission = readFreshGuardedAdmission();

async function createTestDatabase(prefix: string) {
  const binding = admission!;
  const database = `${prefix}_${randomBytes(10).toString('hex')}`;
  const connection = (databaseName: string) => new pg.Client({
    host: '127.0.0.1', port: binding.port, user: 'postgres', password: binding.password,
    database: databaseName, ssl: false, connectionTimeoutMillis: 5000,
    statement_timeout: 20_000, query_timeout: 25_000,
  });
  async function query(databaseName: string, text: string) {
    const client = connection(databaseName);
    try {
      await client.connect();
      await assertGuardedPostgresSystemIdentifierHash({
        adminClient: client,
        expectedSystemIdentifierSha256: binding.expectedSystemIdentifierSha256,
      });
      return await client.query(text);
    } finally {
      await client.end().catch(() => {});
    }
  }
  const admin = connection('postgres');
  try {
    await admin.connect();
    await createGuardedFixtureDatabaseWithHash({
      adminClient: admin,
      expectedSystemIdentifierSha256: binding.expectedSystemIdentifierSha256,
      databaseName: database,
    });
  } finally {
    await admin.end().catch(() => {});
  }
  return { database, query };
}

const unexpectedForeignKeys = [
  { name: 'missing FK', setup: '' },
  { name: 'wrong name', setup: 'ADD CONSTRAINT unrelated_actor_fk FOREIGN KEY (updated_by) REFERENCES public.users(id)' },
  { name: 'wrong target', setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)' },
  { name: 'unvalidated FK', setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) NOT VALID' },
  { name: 'deferrable FK', setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) DEFERRABLE' },
  { name: 'initially deferred FK', setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED' },
  { name: 'delete cascade', setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE CASCADE' },
  { name: 'delete restrict', setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT' },
  { name: 'delete set default', setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET DEFAULT' },
  { name: 'update cascade', setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL' },
  { name: 'MATCH FULL', setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) MATCH FULL' },
  {
    name: 'competing FK',
    setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id), ADD CONSTRAINT extra_actor_fk FOREIGN KEY (updated_by) REFERENCES public.users(id)',
  },
  {
    name: 'composite mapping',
    before: 'ALTER TABLE public.users ADD CONSTRAINT test_actor_pair UNIQUE (id, auth_user_id); ALTER TABLE public.staffing_needs ADD COLUMN alternate_actor uuid;',
    setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (updated_by, alternate_actor) REFERENCES public.users(id, auth_user_id)',
  },
  {
    name: 'wrong source column',
    before: 'ALTER TABLE public.staffing_needs ADD COLUMN alternate_actor uuid;',
    setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (alternate_actor) REFERENCES public.users(id)',
  },
  {
    name: 'renamed actor column at the expected ordinal',
    before: 'ALTER TABLE public.staffing_needs RENAME COLUMN updated_by TO legacy_actor;',
    setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (legacy_actor) REFERENCES public.users(id)',
    expectedError: 'Unexpected staffing actor column profile',
  },
  {
    name: 'renamed parent column at the expected ordinal',
    before: 'ALTER TABLE public.users RENAME COLUMN id TO legacy_id;',
    setup: 'ADD CONSTRAINT staffing_needs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(legacy_id)',
    expectedError: 'Unexpected staffing actor column profile',
  },
];

describe('Story 22.15 guarded local staffing pre-execute SQL admission', () => {
  it.skipIf(!admission && !requiredMatrix)(
    'is skipped without an explicit fresh matrix admission in ordinary or CI environments',
    () => {
      expect(admission).not.toBeNull();
    }
  );
});

describe.sequential.skipIf(!admission)('Story 22.15 guarded local staffing pre-execute SQL', () => {
  it.each(unexpectedForeignKeys)('rejects $name without changing catalog or rows', async (variant) => {
    const { database, query } = await createTestDatabase('staffing_fk_negative');
    await query(database, PRODUCTION_CLI_MATRIX_BOOTSTRAP_SQL);
    await query(database, `
      INSERT INTO public.staffing_needs (location, headcount_need, updated_by)
      VALUES ('Trelleborg', 11, NULL), ('Göteborg', 12, NULL);
      ALTER TABLE public.staffing_needs DROP CONSTRAINT staffing_needs_updated_by_fkey;
      ${variant.before ?? ''}
      ${variant.setup ? `ALTER TABLE public.staffing_needs ${variant.setup};` : ''}
    `);
    const snapshotSql = `
      SELECT jsonb_build_object(
        'constraints', (SELECT jsonb_agg(jsonb_build_object(
          'oid', oid::text, 'name', conname, 'definition', pg_get_constraintdef(oid),
          'validated', convalidated
        ) ORDER BY oid) FROM pg_constraint WHERE conrelid = 'public.staffing_needs'::regclass),
        'columns', (SELECT jsonb_agg(jsonb_build_object(
          'position', attnum, 'name', attname, 'type', atttypid
        ) ORDER BY attnum) FROM pg_attribute
          WHERE attrelid IN ('public.staffing_needs'::regclass, 'public.users'::regclass)
            AND attnum > 0 AND NOT attisdropped),
        'rows', (SELECT jsonb_agg(to_jsonb(needs) ORDER BY location) FROM public.staffing_needs needs)
      ) AS snapshot;
    `;
    const before = await query(database, snapshotSql) as unknown as { rows: unknown[] };
    await expect(query(database, staffingForeignKeyReconciliationSql)).rejects.toThrow(
      variant.expectedError ?? 'Unexpected staffing updated_by foreign key profile'
    );
    const after = await query(database, snapshotSql) as unknown as { rows: unknown[] };
    expect(after.rows).toEqual(before.rows);
  }, 30_000);

  it('accepts only the exact initial pre-forward structural profile and rejects changed routine/constraint states', async () => {
    const { database, query } = await createTestDatabase('staffing_preexecute');
    async function observation() {
      const collectionStartedAtUtc = new Date().toISOString();
      const result = await query(database, staffingSql);
      const parts = Array.isArray(result) ? result : [result];
      const rows = parts.flatMap((part) => Array.isArray(part.rows) ? part.rows : []);
      const values = rows.flatMap((row) => Object.values(row));
      expect(values).toHaveLength(1);
      const parsed = JSON.parse(String(values[0]));
      const now = new Date();
      return {
        result: assessProductionStaffingPreExecuteProof({
          schemaVersion: 1, kind: 'production-staffing-pre-execute-observation', environment: 'production',
          sourceSha, sourceTree, sourceManifestSha256, targetBindingSha256,
          reconciliationExecuteVersion: PRODUCTION_STAFFING_UPDATED_BY_FK_RECONCILIATION_VERSION,
          collectionStartedAtUtc, capturedAtUtc: now.toISOString(), ...parsed,
        }, { sourceSha, sourceTree, sourceManifestSha256, targetBindingSha256, now }),
        raw: parsed,
      };
    }

    await query(database, PRODUCTION_CLI_MATRIX_BOOTSTRAP_SQL);
    await query(database, staffingFunctionSql);
    await query(database, `
      INSERT INTO auth.users (id) VALUES ('00000000-0000-4000-8000-000000000001');
      INSERT INTO public.users (id, auth_user_id, email, role)
      VALUES ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'staffing-fk@example.invalid', 'hr_admin');
      INSERT INTO public.staffing_needs (location, headcount_need, updated_by)
      VALUES ('Trelleborg', 17, '00000000-0000-4000-8000-000000000002');
    `);
    const canonicalBefore = await query(database, `
      SELECT oid::text, (SELECT count(*)::text FROM public.staffing_needs) AS row_count
      FROM pg_constraint WHERE conname = 'staffing_needs_updated_by_fkey';
    `) as unknown as { rows: { oid: string; row_count: string }[] };
    await query(database, staffingForeignKeyReconciliationSql);
    const canonicalAfter = await query(database, `
      SELECT oid::text, (SELECT count(*)::text FROM public.staffing_needs) AS row_count,
        confdeltype FROM pg_constraint WHERE conname = 'staffing_needs_updated_by_fkey';
    `) as unknown as { rows: { oid: string; row_count: string; confdeltype: string }[] };
    expect(canonicalAfter.rows).toEqual([{ ...canonicalBefore.rows[0], confdeltype: 'a' }]);
    const initial = await observation();
    const expressionProbe = await query(database, `
      SELECT jsonb_build_object(
        'locationCanonical', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staffing_needs_location_check' AND regexp_replace(pg_get_expr(conbin, conrelid), '\\s+', '', 'g') = '(location=ANY(ARRAY[''Trelleborg''::text,''Göteborg''::text]))'),
        'locationExtraParens', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staffing_needs_location_check' AND regexp_replace(pg_get_expr(conbin, conrelid), '\\s+', '', 'g') = '((location=ANY(ARRAY[''Trelleborg''::text,''Göteborg''::text])))'),
        'headcountCanonical', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staffing_needs_headcount_need_check' AND regexp_replace(pg_get_expr(conbin, conrelid), '\\s+', '', 'g') = '(headcount_need>=0)'),
        'headcountExtraParens', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staffing_needs_headcount_need_check' AND regexp_replace(pg_get_expr(conbin, conrelid), '\\s+', '', 'g') = '((headcount_need>=0))')
      ) AS result;
    `);
    expect((expressionProbe as unknown as { rows: { result: Record<string, boolean> }[] }).rows[0].result).toMatchObject({
      locationCanonical: true, locationExtraParens: false,
      headcountCanonical: true, headcountExtraParens: false,
    });
    const collectorPredicateProbe = await query(database, `
      WITH expected AS (SELECT to_regclass('public.staffing_needs') AS needs_oid),
      constraints AS (
        SELECT c.*, regexp_replace(pg_get_expr(c.conbin, c.conrelid), '\\s+', '', 'g') AS check_expression
        FROM expected JOIN pg_constraint c ON c.conrelid = expected.needs_oid
      ) SELECT jsonb_build_object(
        'location', (SELECT count(*) = 1 FROM constraints, expected WHERE conrelid = needs_oid AND contype = 'c' AND convalidated AND conname = 'staffing_needs_location_check' AND check_expression = '(location=ANY(ARRAY[''Trelleborg''::text,''Göteborg''::text]))'),
        'headcount', (SELECT count(*) = 1 FROM constraints, expected WHERE conrelid = needs_oid AND contype = 'c' AND convalidated AND conname = 'staffing_needs_headcount_need_check' AND check_expression = '(headcount_need>=0)')
      ) AS result;
    `);
    expect((collectorPredicateProbe as unknown as { rows: { result: Record<string, boolean> }[] }).rows[0].result).toEqual({ location: true, headcount: true });
    expect(initial.raw.dependencies).toMatchObject({
      staffingNeedsPrimaryKey: true, staffingNeedsLocationUnique: true,
      staffingNeedsLocationCheck: true, staffingNeedsHeadcountCheck: true,
      staffingNeedsUpdatedByUsersForeignKey: true, staffingChangelogPrimaryKey: true,
      staffingChangelogChangedByUsersForeignKey: true, bothTablesRlsEnabled: true,
      outOfRangeHeadcountCount: 0, nonNullUpdatedByCount: 1,
      orphanPublicUsersCount: 0, orphanAuthUsersCount: 0,
    });
    expect(initial.result).toMatchObject({
      disposition: 'staffing_pre_execute_proved_not_execution_authority',
      reason: 'fresh_canonical_staffing_fk_and_replacement_compatibility_proven',
    });
    expect(initial.raw.bodyProvenance).toMatchObject({ kind: 'non_admitted_sha256' });
    expect(initial.raw.routine.signature).toBe('public.update_staffing_need(text,integer,uuid)');
    expect(initial.raw.routine.outputArguments).toEqual([
      { mode: 'OUT', name: 'old_value', type: 'integer' },
      { mode: 'OUT', name: 'new_value', type: 'integer' },
    ]);

    await query(database, `
      DELETE FROM public.staffing_needs;
      ALTER TABLE public.staffing_needs DROP CONSTRAINT staffing_needs_updated_by_fkey;
      ALTER TABLE public.staffing_needs ADD CONSTRAINT staffing_needs_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
      INSERT INTO public.staffing_needs (location, headcount_need, updated_by)
      VALUES ('Trelleborg', 11, NULL), ('Göteborg', 12, NULL);
    `);
    const captured = await observation();
    expect(captured.result).toMatchObject({
      disposition: 'staffing_pre_execute_proved_not_execution_authority',
      reason: 'fresh_captured_staffing_fk_reconciliation_prerequisites_proven',
    });
    const capturedRows = await query(database, `
      SELECT location, headcount_need FROM public.staffing_needs ORDER BY location;
    `) as unknown as { rows: { location: string; headcount_need: number }[] };
    await query(database, staffingForeignKeyReconciliationSql);
    const reconciledRows = await query(database, `
      SELECT location, headcount_need FROM public.staffing_needs ORDER BY location;
    `) as unknown as { rows: { location: string; headcount_need: number }[] };
    expect(reconciledRows.rows).toEqual(capturedRows.rows);
    expect((await query(database, `
      SELECT confdeltype FROM pg_constraint WHERE conname = 'staffing_needs_updated_by_fkey';
    `) as unknown as { rows: { confdeltype: string }[] }).rows).toEqual([{ confdeltype: 'a' }]);

    await query(database, `
      ALTER TABLE public.staffing_needs DROP CONSTRAINT staffing_needs_updated_by_fkey;
      ALTER TABLE public.staffing_needs ADD CONSTRAINT staffing_needs_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
      UPDATE public.staffing_needs
      SET updated_by = '00000000-0000-4000-8000-000000000002'
      WHERE location = 'Trelleborg';
    `);
    await expect(query(database, staffingForeignKeyReconciliationSql)).rejects.toThrow(
      'Staffing actor rows prevent foreign key reconciliation'
    );
    expect((await query(database, `
      SELECT confdeltype, count(*)::text AS row_count FROM pg_constraint, public.staffing_needs
      WHERE conname = 'staffing_needs_updated_by_fkey' GROUP BY confdeltype;
    `) as unknown as { rows: { confdeltype: string; row_count: string }[] }).rows).toEqual([{ confdeltype: 'n', row_count: '2' }]);

    await query(database, 'ALTER FUNCTION public.update_staffing_need(text, integer, uuid) SECURITY DEFINER;');
    expect((await observation()).result).toMatchObject({
      disposition: 'blocked_insufficient_staffing_pre_execute_proof', reason: 'routine_contract_not_proven',
    });
    await query(database, 'ALTER FUNCTION public.update_staffing_need(text, integer, uuid) SECURITY INVOKER;');
    await query(database, `
      ALTER TABLE public.staffing_needs DROP CONSTRAINT staffing_needs_headcount_need_check;
      ALTER TABLE public.staffing_needs ADD CONSTRAINT staffing_needs_headcount_need_check
        CHECK (headcount_need >= 0 AND headcount_need <= 9999);
    `);
    expect((await observation()).result).toMatchObject({
      disposition: 'blocked_insufficient_staffing_pre_execute_proof', reason: 'dependency_contract_not_proven',
    });
  }, 120_000);
});
