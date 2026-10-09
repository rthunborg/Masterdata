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
  summarizeObservedPermissionBaseline,
  splitObservedProfileAggregateSql,
  sourceBoundObservedCatalogSpawn,
} from '../../../../src/lib/release/collect-production-observed-profile.mjs';
import * as redaction from '../../../../src/lib/release/production-profile-redaction.mjs';
import * as profile from '../../../../src/lib/release/production-observed-profile.mjs';

const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

// Provenance: 2026-09-23 production-profile diagnostic support evidence.
// This fixture contains only the 61 already-redacted hash pairs: no names,
// permissions JSON, employee data, or other aggregate fields.
const actualPermissionBaselineRows = JSON.parse(readFileSync(
  resolve('tests/fixtures/production-permission-fingerprints-20260923.json'), 'utf8'
)) as Array<{ column_name_md5: string; role_permissions_sha256: string }>;

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

function aggregateCapture(rows = [
  { role_permissions_sha256: 'b'.repeat(64), column_name_md5: 'a'.repeat(32) },
  { role_permissions_sha256: 'd'.repeat(64), column_name_md5: 'c'.repeat(32) },
]) {
  return {
    history: { table_exists: false, row_count: null, version_sha256: null },
    saved_filter_data: { total_count: 0, orphan_auth_reference_count: 0, empty_name_count: 0, overlength_name_count: 0, row_identity_sha256: 'e'.repeat(64) },
    audit_preservation: { row_count: 0, nonnull_actor_count: 0, unmapped_legacy_actor_count: 0, unmapped_canonical_actor_count: 0, stable_fields_sha256: 'f'.repeat(64) },
    repayment_data: { omc_null_count: 0, omc_true_count: 0, omc_false_count: 0, pe3_null_count: 0, pe3_true_count: 0, pe3_false_count: 0 },
    permission_rows: [],
    permission_baseline: { row_count: rows.length, distinct_column_count: rows.length, null_column_count: 0, nonobject_permissions_count: 0, rows },
    staffing_data: { out_of_range_headcount_count: 0 },
  };
}

function observedProfileFromActualPermissionRows(rows = actualPermissionBaselineRows) {
  const aggregate = structuredClone(profile.PRODUCTION_OBSERVED_PROFILE_BASELINE.aggregate) as Record<string, unknown>;
  const baseline = aggregate.permission_baseline as Record<string, unknown>;
  const { rows_sha256: _expectedFingerprint, ...counts } = baseline;
  const parsed = redaction.parseOneRedactedJsonLine(JSON.stringify({
    ...aggregate,
    permission_baseline: { ...counts, rows },
  }), 'aggregate');
  const normalized = summarizeObservedPermissionBaseline(parsed);
  return {
    normalized,
    observation: {
      schemaVersion: 1,
      kind: 'production-observed-profile',
      profilePhase: 'pre_cleanup',
      collectionStartedAtUtc: '2026-09-23T12:48:11.473Z',
      capturedAtUtc: '2026-09-23T12:48:12.473Z',
      sourceSha: 'b'.repeat(40),
      baselineSourceSha: profile.PRODUCTION_OBSERVED_PROFILE_SOURCE_SHA,
      targetBindingSha256: 'a'.repeat(64),
      ...structuredClone(profile.PRODUCTION_OBSERVED_PROFILE_BASELINE),
      aggregate: normalized,
    },
  };
}

// The production redaction parser owns the complete catalog shape. Build its
// realistic fixture from the current support module only when integration work
// supplies it; these session tests use the parser's rejection behavior.

describe('Story 22.15 observed-profile collector primitives', () => {
  it('projects the real aggregate parser result into the historical PostgreSQL fingerprint without retaining rows', () => {
    const parsed = redaction.parseOneRedactedJsonLine(JSON.stringify(aggregateCapture()), 'aggregate');
    const projected = summarizeObservedPermissionBaseline(parsed);
    const postgresJsonbText = `[${
      '{"column_name_md5": "' + 'a'.repeat(32) + '", "role_permissions_sha256": "' + 'b'.repeat(64) + '"}, ' +
      '{"column_name_md5": "' + 'c'.repeat(32) + '", "role_permissions_sha256": "' + 'd'.repeat(64) + '"}'
    }]`;
    expect(sha256(postgresJsonbText)).toBe('0e6705a4e7c459f6a3cef5ee8d2b77d08d780679925567a08e0188840fc2195f');
    expect(projected.permission_baseline).toEqual({
      row_count: 2, distinct_column_count: 2, null_column_count: 0,
      nonobject_permissions_count: 0, rows_sha256: '0e6705a4e7c459f6a3cef5ee8d2b77d08d780679925567a08e0188840fc2195f',
    });
    expect(projected.permission_baseline).not.toHaveProperty('rows');
    expect(projected.permission_baseline.rows_sha256).not.toBe(sha256(JSON.stringify(parsed.permission_baseline.rows)));
    const { permission_baseline: _baseline, ...unchangedGroups } = projected;
    const { permission_baseline: _originalBaseline, ...originalGroups } = parsed;
    expect(unchangedGroups).toEqual(originalGroups);
    expect(JSON.stringify(projected)).not.toContain('column_name_md5');
    const reversed = summarizeObservedPermissionBaseline(redaction.parseOneRedactedJsonLine(
      JSON.stringify(aggregateCapture([...aggregateCapture().permission_baseline.rows].reverse())), 'aggregate'
    ));
    expect(reversed.permission_baseline.rows_sha256).not.toBe(projected.permission_baseline.rows_sha256);
  });

  it.each([
    ['an extra baseline key', (value: Record<string, unknown>) => { (value.permission_baseline as Record<string, unknown>).extra = true; }],
    ['a malformed row hash', (value: Record<string, unknown>) => { ((value.permission_baseline as { rows: Array<Record<string, unknown>> }).rows[0] as Record<string, unknown>).column_name_md5 = 'invalid'; }],
    ['an inconsistent count', (value: Record<string, unknown>) => { (value.permission_baseline as Record<string, unknown>).row_count = 3; }],
  ])('refuses %s before projection', (_label, mutate) => {
    const value = aggregateCapture() as Record<string, unknown>;
    mutate(value);
    expect(() => summarizeObservedPermissionBaseline(value)).toThrow('details suppressed');
  });

  it('refuses sparse arrays and accessor/prototype input without invoking getters', () => {
    const sparse = aggregateCapture();
    sparse.permission_baseline.rows = new Array(2) as never;
    expect(() => summarizeObservedPermissionBaseline(sparse)).toThrow('details suppressed');

    const accessor = aggregateCapture();
    Object.defineProperty(accessor.permission_baseline, 'rows', {
      enumerable: true,
      get() { throw new Error('getter must not execute'); },
    });
    expect(() => summarizeObservedPermissionBaseline(accessor)).toThrow('details suppressed');

    const inherited = Object.create({ inherited: true });
    Object.assign(inherited, aggregateCapture());
    expect(() => summarizeObservedPermissionBaseline(inherited)).toThrow('details suppressed');
  });

  it('rejects hash coercion without invoking a supplied conversion function', () => {
    const value = aggregateCapture();
    const stringify = vi.fn(() => 'a'.repeat(32));
    (value.permission_baseline.rows[0] as Record<string, unknown>).column_name_md5 = { toString: stringify };
    expect(() => summarizeObservedPermissionBaseline(value)).toThrow('details suppressed');
    expect(stringify).not.toHaveBeenCalled();
  });

  it('summarizes the actual sixty-one-row aggregate contract without sorting row fingerprints', () => {
    const rows = Array.from({ length: 61 }, (_, index) => ({
      column_name_md5: index.toString(16).padStart(32, '0'),
      role_permissions_sha256: index.toString(16).padStart(64, '0'),
    }));
    const parsed = redaction.parseOneRedactedJsonLine(JSON.stringify(aggregateCapture(rows)), 'aggregate');
    const projected = summarizeObservedPermissionBaseline(parsed);
    expect(projected.permission_baseline.row_count).toBe(61);
    expect(projected.permission_baseline.rows_sha256).toBe(sha256(`[${rows.map(row =>
      `{"column_name_md5": "${row.column_name_md5}", "role_permissions_sha256": "${row.role_permissions_sha256}"}`
    ).join(', ')}]`));
    expect(JSON.stringify(projected)).not.toContain('column_name_md5');
  });

  it('accepts the fixed redacted 61-row production fixture through parser, normalizer, and strict assessor', () => {
    expect(actualPermissionBaselineRows).toHaveLength(61);
    expect(actualPermissionBaselineRows.every((row) =>
      JSON.stringify(Object.keys(row).sort()) === JSON.stringify(['column_name_md5', 'role_permissions_sha256']) &&
      /^[a-f0-9]{32}$/u.test(row.column_name_md5) && /^[a-f0-9]{64}$/u.test(row.role_permissions_sha256)
    )).toBe(true);
    expect(sha256(JSON.stringify(actualPermissionBaselineRows)))
      .toBe('d617d5d1235f3fa3cb12b0eba95120496eb272fa4d9253d6f30d068318b9eb03');

    const { normalized, observation } = observedProfileFromActualPermissionRows();
    expect(normalized.permission_baseline.rows_sha256)
      .toBe('643a4e803cf7c607d939d370711430d70830b858f4a42e504bba36fbbdcf39f8');
    expect(normalized.permission_baseline.rows_sha256)
      .not.toBe(sha256(JSON.stringify(actualPermissionBaselineRows)));
    expect(profile.assessProductionObservedProfile({
      observation,
      expectedContext: { sourceSha: 'b'.repeat(40), targetBindingSha256: 'a'.repeat(64) },
      now: new Date('2026-09-23T12:58:12.473Z'),
    }).disposition).toBe('profile_match_not_admission');
  });

  it.each([
    ['the superseded fingerprint', (rows: typeof actualPermissionBaselineRows) => rows],
    ['a changed fingerprint pair', (rows: typeof actualPermissionBaselineRows) => rows.map((row, index) => index === 0
      ? { ...row, column_name_md5: row.column_name_md5 === '0'.repeat(32) ? '1'.repeat(32) : '0'.repeat(32) }
      : row)],
    ['reordered fingerprint pairs', (rows: typeof actualPermissionBaselineRows) => [...rows].reverse()],
  ])('rejects %s through the unchanged strict baseline contract', (_label, transform) => {
    const { observation } = observedProfileFromActualPermissionRows(transform(actualPermissionBaselineRows));
    const candidate = structuredClone(observation);
    if (_label === 'the superseded fingerprint') {
      candidate.aggregate.permission_baseline.rows_sha256 =
        'f0ed65806763de0eb6653583b5d2dcf86f3c3a8c75cc5d2b070ca301bb5625b1';
    }
    expect(() => profile.assessProductionObservedProfile({
      observation: candidate,
      expectedContext: { sourceSha: 'b'.repeat(40), targetBindingSha256: 'a'.repeat(64) },
      now: new Date('2026-09-23T12:58:12.473Z'),
    })).toThrow('production_observed_profile_baseline_mismatch');
  });

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
    const realParser = redaction.parseOneRedactedJsonLine;
    vi.spyOn(redaction, 'parseOneRedactedJsonLine').mockImplementation((text, phase) => phase === 'catalog' ? {} : realParser(text, phase));
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
      stdin.write = () => { events.push('aggregate-query'); queueMicrotask(() => stdout.emit('data', `${JSON.stringify(aggregateCapture())}\n`)); };
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
    expect(receipt.observation.aggregate.permission_baseline).not.toHaveProperty('rows');
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
