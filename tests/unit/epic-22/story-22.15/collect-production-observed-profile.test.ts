import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EventEmitter } from 'node:events';

import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ sourceBinding: vi.fn() }));
vi.mock('../../../../src/lib/release/production-collector-source-binding.mjs', () => ({
  bindProductionCollectorSource: mocks.sourceBinding,
}));

import {
  assertObservedProfileSchemaSql,
  collectProductionObservedProfile,
  redactObservedProfileSchema,
  runTwoPhaseObservedProfileAggregate,
  splitObservedProfileAggregateSql,
  sourceBoundObservedCatalogSpawn,
} from '../../../../src/lib/release/collect-production-observed-profile.mjs';
import * as redaction from '../../../../src/lib/release/production-profile-redaction.mjs';
import * as profile from '../../../../src/lib/release/production-observed-profile.mjs';

const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

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
      sourceTree: 'b'.repeat(40),
      sourceManifestSha256: 'c'.repeat(64),
    };
    const sourceOptions = { commit: source.sourceSha, gitExecutable: 'C:\\reviewed-git.exe', expectedGitSha256: 'd'.repeat(64) };
    const schemaSql = readFileSync(resolve('src/lib/release/production-observed-schema.sql'), 'utf8');
    const aggregateSql = readFileSync(resolve('src/lib/release/production-observed-aggregate.sql'), 'utf8');
    mocks.sourceBinding.mockReturnValue({
      workspace: resolve('.'),
      source,
      sql: {
        'src/lib/release/production-observed-schema.sql': schemaSql,
        'src/lib/release/production-observed-aggregate.sql': aggregateSql,
      },
      recheck: vi.fn(() => true),
    });
    const target = vi.fn(async () => { throw new Error('target must not reach psql'); });
    const spawnSyncProcess = vi.fn();
    await expect(collectProductionObservedProfile({
      source,
      sourceOptions,
      targetVerifier: target,
      spawnSyncProcess,
    })).rejects.toThrow('details suppressed');
    expect(target).toHaveBeenCalledOnce();
    expect(spawnSyncProcess).not.toHaveBeenCalled();

    const noTarget = vi.fn();
    mocks.sourceBinding.mockImplementation(() => { throw new Error('source binding refused'); });
    await expect(collectProductionObservedProfile({
      source,
      sourceOptions,
      targetVerifier: noTarget,
      spawnSyncProcess,
    })).rejects.toThrow('details suppressed');
    expect(noTarget).not.toHaveBeenCalled();
  });

  it('records one start before schema collection and closes it after aggregate and catalog collection', async () => {
    vi.stubEnv('EXPECTED_SUPABASE_ENVIRONMENT', 'production');
    vi.stubEnv('SUPABASE_DB_CONNECTION_MODE', 'session-pooler');
    vi.stubEnv('EXPECTED_SUPABASE_PROJECT_REF', 'abcdefghijklmnopqrst');
    vi.stubEnv('SUPABASE_DB_URL', 'postgresql://postgres.synthetic:synthetic@pooler.invalid:5432/postgres');
    const source = { sourceSha: 'a'.repeat(40), sourceTree: 'b'.repeat(40), sourceManifestSha256: 'c'.repeat(64) };
    const sourceOptions = { commit: source.sourceSha, gitExecutable: 'C:\\reviewed-git.exe', expectedGitSha256: 'd'.repeat(64) };
    mocks.sourceBinding.mockReturnValue({ workspace: resolve('.'), source, sql: Object.fromEntries([
      'src/lib/release/production-observed-schema.sql', 'src/lib/release/production-observed-aggregate.sql', 'supabase/verify/production-baseline-catalog.sql',
    ].map(path => [path, readFileSync(resolve(path), 'utf8')])), recheck: vi.fn(() => true) });
    // Catalog/profile semantics have independent strict contract tests. These
    // seams isolate the collector's real query/clock ordering without a DB.
    vi.spyOn(redaction, 'parseOneRedactedJsonLine').mockImplementation((_text, phase) => phase === 'catalog' ? {} : { history: { table_exists: false } });
    vi.spyOn(redaction, 'catalogPrerequisites').mockReturnValue({ satisfied: true, branch: 'absent' });
    const assess = vi.spyOn(profile, 'assessProductionObservedProfile').mockReturnValue({ disposition: 'profile_match_not_admission' });
    const events: string[] = [];
    const start = new Date('2026-09-28T11:59:00.000Z'), completion = new Date('2026-09-28T12:00:00.000Z');
    const clock = vi.fn(() => { events.push(events.includes('schema') ? 'completed' : 'started'); return events.includes('schema') ? completion : start; });
    const schemaSpawn = vi.fn(() => { events.push('schema'); return { status: 0, stdout: JSON.stringify(schemaCapture()) }; });
    const aggregateSpawn = vi.fn(() => {
      events.push('aggregate-open');
      const child = new EventEmitter() as EventEmitter & Record<string, unknown>;
      const stdout = new EventEmitter() as EventEmitter & { setEncoding: (encoding: string) => void };
      stdout.setEncoding = () => {};
      const stdin = new EventEmitter() as EventEmitter & { write: (sql: string) => void; end: () => void };
      stdin.write = () => { events.push('aggregate-query'); queueMicrotask(() => stdout.emit('data', '{}\n')); };
      stdin.end = () => { events.push('aggregate-closed'); queueMicrotask(() => child.emit('close', 0)); };
      Object.assign(child, { stdout, stdin, stderr: new EventEmitter(), kill: vi.fn() });
      return child;
    });
    const catalogObserver = vi.fn(async () => { events.push('catalog'); return { count: 16, failedChecks: [] }; });
    const options = { source, sourceOptions, profilePhase: 'post_cleanup', now: clock,
      targetVerifier: vi.fn(async () => ({})), psqlVerifier: () => 'reviewed-psql', rootCertificateVerifier: () => 'reviewed-ca',
      spawnSyncProcess: schemaSpawn, spawnProcess: aggregateSpawn, catalogObserver };
    const receipt = await collectProductionObservedProfile(options);
    expect(events).toEqual(['started', 'schema', 'aggregate-open', 'aggregate-query', 'aggregate-query', 'aggregate-closed', 'catalog', 'completed']);
    expect(clock).toHaveBeenCalledTimes(2);
    expect(receipt.observation).toMatchObject({ collectionStartedAtUtc: start.toISOString(), capturedAtUtc: completion.toISOString() });
    expect(assess).toHaveBeenCalledWith(expect.objectContaining({ observation: receipt.observation, now: completion }));
    schemaSpawn.mockClear();
    await expect(collectProductionObservedProfile({ ...options, now: () => new Date(NaN) })).rejects.toThrow('details suppressed');
    expect(schemaSpawn).not.toHaveBeenCalled();
    assess.mockClear();
    const backwards = vi.fn().mockReturnValueOnce(completion).mockReturnValueOnce(start);
    await expect(collectProductionObservedProfile({ ...options, now: backwards })).rejects.toThrow('details suppressed');
    expect(assess).not.toHaveBeenCalled();
  });
});

describe('reviewed observed-profile catalog process boundary', () => {
  const workspace = resolve('.');
  const args = () => [
    '--no-psqlrc', '--quiet', '--csv', '--set', 'ON_ERROR_STOP=1', '--set',
    'catalog_phase=production_pre_apply', '--file',
    resolve(workspace, 'supabase/verify/production-baseline-catalog.sql'),
  ];
  const catalogSql = readFileSync(resolve(workspace, 'supabase/verify/production-baseline-catalog.sql'), 'utf8');

  it('uses pinned SQL instead of rereading the live file after verifier preflight', () => {
    const recheck = vi.fn(() => true);
    const spawn = vi.fn(() => ({ status: 0, stdout: 'checked catalog CSV' }));
    const invoke = sourceBoundObservedCatalogSpawn({ bound: { workspace, recheck }, catalogSql, spawnSyncProcess: spawn });
    expect(invoke('approved-psql', args(), { cwd: workspace, input: 'unreviewed input', timeout: 999999, env: { PGSSLMODE: 'verify-full' } })).toEqual({ status: 0, stdout: 'checked catalog CSV' });
    expect(recheck).toHaveBeenCalledOnce();
    expect(recheck.mock.invocationCallOrder[0]).toBeLessThan(spawn.mock.invocationCallOrder[0]);
    expect(spawn).toHaveBeenCalledWith('approved-psql', args().slice(0, -2), expect.objectContaining({ input: catalogSql, timeout: 45000, maxBuffer: 1024 * 1024, env: { PGSSLMODE: 'verify-full' } }));
    expect(spawn.mock.calls[0]?.[1]).not.toContain('--file');
  });

  it('refuses source mutation during verifier preflight with zero catalog processes', () => {
    const spawn = vi.fn();
    const invoke = sourceBoundObservedCatalogSpawn({ bound: { workspace, recheck: () => { throw new Error('source mutation'); } }, catalogSql, spawnSyncProcess: spawn });
    expect(() => invoke('approved-psql', args(), { cwd: workspace })).toThrow('source mutation');
    expect(spawn).not.toHaveBeenCalled();
  });

  it.each([
    (value: string[]) => [...value, '--command', 'unreviewed statement'],
    (value: string[]) => [...value.slice(0, -1), resolve(workspace, 'other-query.sql')],
    (value: string[]) => value.map(v => v === 'catalog_phase=production_pre_apply' ? 'catalog_phase=post_apply' : v),
  ])('refuses substituted verifier commands before source recheck or spawn', (mutate) => {
    const recheck = vi.fn(); const spawn = vi.fn();
    const invoke = sourceBoundObservedCatalogSpawn({ bound: { workspace, recheck }, catalogSql, spawnSyncProcess: spawn });
    expect(() => invoke('approved-psql', mutate(args()), { cwd: workspace })).toThrow('details suppressed');
    expect(recheck).not.toHaveBeenCalled(); expect(spawn).not.toHaveBeenCalled();
  });

  it('refuses a different workspace before any catalog process', () => {
    const recheck = vi.fn(); const spawn = vi.fn();
    const invoke = sourceBoundObservedCatalogSpawn({ bound: { workspace, recheck }, catalogSql, spawnSyncProcess: spawn });
    expect(() => invoke('approved-psql', args(), { cwd: resolve(workspace, 'other-workspace') })).toThrow('details suppressed');
    expect(recheck).not.toHaveBeenCalled(); expect(spawn).not.toHaveBeenCalled();
  });
});
