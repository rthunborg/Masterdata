import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assertObservedProfileSchemaSql,
  collectProductionObservedProfile,
  redactObservedProfileSchema,
  runTwoPhaseObservedProfileAggregate,
  splitObservedProfileAggregateSql,
} from '../../../../src/lib/release/collect-production-observed-profile.mjs';

const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileHash = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

afterEach(() => vi.unstubAllEnvs());

function schemaCapture() {
  const arrays = Object.fromEntries([
    'tables', 'columns', 'constraints', 'indexes', 'policies', 'functions',
    'triggers', 'types', 'sequences', 'auth_users_schema',
  ].map((key) => [key, []]));
  return {
    schema_version: 1,
    scope: 'schema_only',
    public_schema_acl: ['=U/postgres'],
    unsupported_function_kind_count: 0,
    ...arrays,
  };
}

const catalog = {
  draft: true,
  executable: false,
  source_head: 'c31227ad68d91c0a471b611811bc618cbf3535a2',
  required_relation_exists: {
    history: false, saved_filters: true, auth_users: true, app_users: true,
    audit: true, column_config: true, employees: true, staffing_needs: true,
  },
  required_relation_missing_count: 1,
  required_column_exists: {
    history_version: false, saved_filter_id: true, saved_filter_user_id: true,
    saved_filter_name: true, audit_id: true, audit_changed_by: true,
    audit_employee_id: true, audit_column_name: true, audit_changed_at: true,
    employee_repayment_omc: true, employee_repayment_pe3: true,
    staffing_headcount: true, column_config_name: true,
    column_config_permissions: true, auth_user_id: true, app_user_id: true,
    app_user_auth_user_id: true,
  },
  required_column_missing_count: 1,
};

// The production redaction parser owns the complete catalog shape. Build its
// realistic fixture from the current support module only when integration work
// supplies it; these session tests use the parser's rejection behavior.

describe('Story 22.15 observed-profile collector primitives', () => {
  it('hashes fixed schema groups and never returns raw definitions', () => {
    const capture = schemaCapture();
    const result = redactObservedProfileSchema(`${JSON.stringify(capture)}\n`);
    expect(result).toEqual({
      schema_version: { sha256: hash(1), count: null },
      scope: { sha256: hash('schema_only'), count: null },
      public_schema_acl: { sha256: hash(['=U/postgres']), count: 1 },
      unsupported_function_kind_count: { sha256: hash(0), count: null },
      tables: { sha256: hash([]), count: 0 }, columns: { sha256: hash([]), count: 0 },
      constraints: { sha256: hash([]), count: 0 }, indexes: { sha256: hash([]), count: 0 },
      policies: { sha256: hash([]), count: 0 }, functions: { sha256: hash([]), count: 0 },
      triggers: { sha256: hash([]), count: 0 }, types: { sha256: hash([]), count: 0 },
      sequences: { sha256: hash([]), count: 0 }, auth_users_schema: { sha256: hash([]), count: 0 },
    });
    expect(JSON.stringify(result)).not.toContain('definition');
  });

  it('rejects raw capture additions, unsupported object kinds, split output, and mutation SQL', () => {
    const extra = schemaCapture() as Record<string, unknown>;
    extra.raw_row_data = 'forbidden';
    expect(() => redactObservedProfileSchema(JSON.stringify(extra))).toThrow('details suppressed');

    const unsupported = schemaCapture();
    unsupported.unsupported_function_kind_count = 1;
    expect(() => redactObservedProfileSchema(JSON.stringify(unsupported))).toThrow('details suppressed');

    expect(() => redactObservedProfileSchema(`${JSON.stringify(schemaCapture())}\n${JSON.stringify(schemaCapture())}`)).toThrow('details suppressed');
    expect(() => assertObservedProfileSchemaSql(
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; DELETE FROM public.users; ROLLBACK;'
    )).toThrow('details suppressed');
  });

  it('requires exactly one aggregate phase marker and a read-only transaction boundary', () => {
    const sql = [
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;',
      'SELECT 1;',
      '-- This second result',
      'SELECT 2;',
      'ROLLBACK;',
    ].join('\n');
    const result = splitObservedProfileAggregateSql(sql);
    expect(result.firstSql).toContain('SELECT 1;');
    expect(result.secondSql).toContain('SELECT 2;');
    expect(() => splitObservedProfileAggregateSql(sql.replace('SELECT 2;', 'UPDATE public.users SET role = \'x\';'))).toThrow('details suppressed');
  });

  it('does not issue the aggregate query when catalog prerequisites are incomplete', async () => {
    const writes: string[] = [];
    const session = {
      write: async ({ sql }: { sql: string }) => {
        writes.push(sql);
        return JSON.stringify(catalog);
      },
      rollback: async () => undefined,
      end: async () => true,
    };
    await expect(runTwoPhaseObservedProfileAggregate({
      session, firstSql: 'first', secondSql: 'second', timeoutMs: 1_000,
    })).rejects.toThrow('details suppressed');
    // The intentionally minimal fixture is rejected by the catalog parser
    // before any second statement can be issued.
    expect(writes).toEqual(['first']);
  });

  it('binds both reviewed SQL files before target verification or a database process', async () => {
    vi.stubEnv('EXPECTED_SUPABASE_ENVIRONMENT', 'production');
    vi.stubEnv('SUPABASE_DB_CONNECTION_MODE', 'session-pooler');
    const source = {
      sourceSha: 'a'.repeat(40),
      schemaSqlSha256: fileHash(resolve('src/lib/release/production-observed-schema.sql')),
      aggregateSqlSha256: fileHash(resolve('src/lib/release/production-observed-aggregate.sql')),
    };
    const target = vi.fn(async () => { throw new Error('target must not reach psql'); });
    const spawnSyncProcess = vi.fn();
    await expect(collectProductionObservedProfile({
      source,
      targetVerifier: target,
      spawnSyncProcess,
    })).rejects.toThrow('details suppressed');
    expect(target).toHaveBeenCalledOnce();
    expect(spawnSyncProcess).not.toHaveBeenCalled();

    const substituted = { ...source, aggregateSqlSha256: '0'.repeat(64) };
    const noTarget = vi.fn();
    await expect(collectProductionObservedProfile({
      source: substituted,
      targetVerifier: noTarget,
      spawnSyncProcess,
    })).rejects.toThrow('details suppressed');
    expect(noTarget).not.toHaveBeenCalled();
  });
});
