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
import { assessProductionStaffingPreExecuteProof } from '../../../../src/lib/release/production-staffing-pre-execute-contract.mjs';

const sourceSha = 'a'.repeat(40);
const sourceTree = 'b'.repeat(40);
const sourceManifestSha256 = 'c'.repeat(64);
const targetBindingSha256 = 'd'.repeat(64);
const staffingSql = readFileSync(
  path.join(process.cwd(), 'src/lib/release/production-staffing-pre-execute.sql'),
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

describe('Story 22.15 guarded local staffing pre-execute SQL admission', () => {
  it.skipIf(!admission && !requiredMatrix)(
    'is skipped without an explicit fresh matrix admission in ordinary or CI environments',
    () => {
      expect(admission).not.toBeNull();
    }
  );
});

describe.sequential.skipIf(!admission)('Story 22.15 guarded local staffing pre-execute SQL', () => {
  it('accepts only the exact initial pre-forward structural profile and rejects changed routine/constraint states', async () => {
    const binding = admission!;
    const database = `staffing_preexecute_${randomBytes(10).toString('hex')}`;
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
          collectionStartedAtUtc, capturedAtUtc: now.toISOString(), ...parsed,
        }, { sourceSha, sourceTree, sourceManifestSha256, targetBindingSha256, now }),
        raw: parsed,
      };
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

    await query(database, PRODUCTION_CLI_MATRIX_BOOTSTRAP_SQL);
    await query(database, staffingFunctionSql);
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
      outOfRangeHeadcountCount: 0,
    });
    expect(initial.result).toMatchObject({
      disposition: 'staffing_pre_execute_proved_not_execution_authority',
      reason: 'fresh_replacement_compatibility_and_acl_contract_proven',
    });
    expect(initial.raw.bodyProvenance).toMatchObject({ kind: 'non_admitted_sha256' });
    expect(initial.raw.routine.signature).toBe('public.update_staffing_need(text,integer,uuid)');
    expect(initial.raw.routine.outputArguments).toEqual([
      { mode: 'OUT', name: 'old_value', type: 'integer' },
      { mode: 'OUT', name: 'new_value', type: 'integer' },
    ]);

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
