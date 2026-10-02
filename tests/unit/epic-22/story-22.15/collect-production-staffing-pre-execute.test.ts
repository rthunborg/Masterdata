import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const mocks = vi.hoisted(() => ({
  cli: vi.fn(), psql: vi.fn(), certificate: vi.fn(), target: vi.fn(), spawn: vi.fn(), sourceBinding: vi.fn(),
}));
vi.mock('node:child_process', () => ({ spawnSync: mocks.spawn, default: { spawnSync: mocks.spawn } }));
vi.mock('../../../../supabase/verify/run-reviewed-supabase-cli.mjs', () => ({ verifyApprovedSupabaseCliExecutable: mocks.cli }));
vi.mock('../../../../supabase/verify/verify-production-baseline-catalog.mjs', () => ({
  verifyApprovedPsqlExecutable: mocks.psql,
  verifyApprovedSslRootCertificate: mocks.certificate,
}));
vi.mock('../../../../supabase/verify/verify-target-binding.mjs', () => ({ verifyConfiguredSupabaseTarget: mocks.target }));
vi.mock('../../../../src/lib/release/production-collector-source-binding.mjs', () => ({ bindProductionCollectorSource: mocks.sourceBinding }));

import {
  assertProductionStaffingPreExecuteSql,
  collectProductionStaffingPreExecute,
} from '../../../../src/lib/release/collect-production-staffing-pre-execute.mjs';
import { productionTargetBindingSha256 } from '../../../../src/lib/release/production-observed-profile.mjs';

const workspace = resolve('synthetic-source');
const capturedAt = new Date('2026-09-28T12:00:00.000Z');
const sql = readFileSync(join(process.cwd(), 'src/lib/release/production-staffing-pre-execute.sql'), 'utf8');
const source = Object.freeze({
  sourceSha: 'a'.repeat(40),
  sourceTree: 'b'.repeat(40),
  sourceManifestSha256: 'c'.repeat(64),
});
const sourceOptions = Object.freeze({ commit: source.sourceSha, gitExecutable: 'C:\\reviewed-git.exe', expectedGitSha256: 'd'.repeat(64) });

function projection() {
  return {
    routine: {
      signature: 'public.update_staffing_need(text,integer,uuid)', exactOverloadCount: 1,
      owner: 'postgres', language: 'plpgsql', kind: 'function', securityDefiner: false,
      config: null, nonOwnerExecuteGrantees: ['PUBLIC', 'anon', 'authenticated', 'service_role'],
      nonOwnerExecuteGrantOptions: false, nonExecuteAclPrivileges: false,
      returnShape: 'TABLE(old_value integer,new_value integer)',
      inputArguments: [
        { mode: 'IN', name: 'p_location', type: 'text' },
        { mode: 'IN', name: 'p_new_value', type: 'integer' },
        { mode: 'IN', name: 'p_user_id', type: 'uuid' },
      ],
      outputArguments: [
        { mode: 'OUT', name: 'old_value', type: 'integer' },
        { mode: 'OUT', name: 'new_value', type: 'integer' },
      ],
      volatility: 'volatile', parallel: 'unsafe', strict: false, leakproof: false,
    },
    dependencies: {
      staffingNeedsColumns: [
        { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        { name: 'location', type: 'text', nullable: false, default: null },
        { name: 'headcount_need', type: 'integer', nullable: false, default: '0' },
        { name: 'updated_at', type: 'timestamp with time zone', nullable: false, default: 'now()' },
        { name: 'updated_by', type: 'uuid', nullable: true, default: null },
      ],
      staffingChangelogColumns: [
        { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        { name: 'location', type: 'text', nullable: false, default: null },
        { name: 'old_value', type: 'integer', nullable: false, default: null },
        { name: 'new_value', type: 'integer', nullable: false, default: null },
        { name: 'changed_by', type: 'uuid', nullable: false, default: null },
        { name: 'changed_at', type: 'timestamp with time zone', nullable: false, default: 'now()' },
      ],
      staffingNeedsPrimaryKey: true, staffingNeedsLocationUnique: true,
      staffingNeedsLocationCheck: true, staffingNeedsHeadcountCheck: true,
      staffingNeedsUpdatedByUsersForeignKey: true,
      staffingNeedsUpdatedByUsersForeignKeyProfile: { foreignKeyCount: 1, name: 'staffing_needs_updated_by_fkey', sourceColumn: 'updated_by', referencedSchema: 'public', referencedTable: 'users', referencedColumn: 'id', onDelete: 'NO ACTION', onUpdate: 'NO ACTION', matchType: 'SIMPLE', validated: true, deferrable: false, initiallyDeferred: false },
      staffingChangelogPrimaryKey: true,
      staffingChangelogChangedByUsersForeignKey: true, bothTablesRlsEnabled: true,
      outOfRangeHeadcountCount: 0, nonNullUpdatedByCount: 0, orphanPublicUsersCount: 0, orphanAuthUsersCount: 0,
    },
    bodyProvenance: { kind: 'non_admitted_sha256', sha256: '0'.repeat(64) },
  };
}

describe('Story 22.15 protected production staffing pre-execute collector', () => {
  let captured: { args: string[]; options: Record<string, unknown>; env: Record<string, string> };
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('EXPECTED_SUPABASE_ENVIRONMENT', 'production');
    vi.stubEnv('SUPABASE_DB_CONNECTION_MODE', 'session-pooler');
    vi.stubEnv('EXPECTED_SUPABASE_PROJECT_REF', 'abcdefghijklmnopqrst');
    vi.stubEnv('EXPECTED_SUPABASE_TARGET_BINDING_SHA256', productionTargetBindingSha256('abcdefghijklmnopqrst'));
    vi.stubEnv('SUPABASE_DB_URL', 'postgresql://postgres.synthetic:synthetic-password@pooler.invalid:5432/postgres?sslmode=verify-full');
    vi.stubEnv('PGSERVICE', 'must-not-inherit');
    mocks.psql.mockReturnValue('reviewed-psql');
    mocks.certificate.mockReturnValue('reviewed-ca');
    mocks.target.mockResolvedValue({});
    mocks.sourceBinding.mockImplementation(({ source: claims }) => ({
      workspace,
      source: claims,
      sql: { 'src/lib/release/production-staffing-pre-execute.sql': sql },
      recheck: vi.fn(() => true),
    }));
    mocks.spawn.mockImplementation((_executable, args, options) => {
      captured = { args: [...args], options, env: { ...options.env } };
      return { status: 0, stdout: `${JSON.stringify(projection())}\n`, stderr: '' };
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('verifies tools, target, TLS, source bytes, and a rollback-only projection before exposing the strict observation', async () => {
    const receipt = await collectProductionStaffingPreExecute({ workspace, source, sourceOptions, now: () => capturedAt });
    expect(mocks.cli).toHaveBeenCalledOnce();
    expect(mocks.psql).toHaveBeenCalledOnce();
    expect(mocks.certificate).toHaveBeenCalledOnce();
    expect(mocks.target).toHaveBeenCalledWith({ workspace, environment: process.env });
    expect(mocks.sourceBinding).toHaveBeenCalledWith(expect.objectContaining({ workspace, source, sourceOptions }));
    expect(mocks.target.mock.invocationCallOrder[0]).toBeLessThan(mocks.spawn.mock.invocationCallOrder[0]);
    expect(captured.args.join(' ')).not.toMatch(/password|pooler/);
    expect(captured.options.input).toMatch(/BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/);
    expect(captured.options.input).toMatch(/ROLLBACK;\s*$/);
    expect(captured.env.PGSSLMODE).toBe('verify-full');
    expect(captured.env.PGSSLROOTCERT).toBe('reviewed-ca');
    expect(captured.env.PGOPTIONS).toContain('default_transaction_read_only=on');
    expect(captured.env).not.toHaveProperty('PGSERVICE');
    expect(captured.options.env).toEqual({});
    expect(receipt).toMatchObject({
      hostedWriteAttempted: false, rawDefinitionsPersisted: false,
      observation: { capturedAtUtc: capturedAt.toISOString(), targetBindingSha256: productionTargetBindingSha256('abcdefghijklmnopqrst') },
      assessment: { disposition: 'staffing_pre_execute_proved_not_execution_authority' },
    });
    expect(JSON.stringify(receipt)).not.toMatch(/password|pooler/);
  });

  it.each(['cli', 'psql', 'certificate', 'target'] as const)('rejects %s verification failure before spawn without relaying details', async kind => {
    mocks[kind].mockImplementation(() => { throw new Error('private-host-and-secret'); });
    await expect(collectProductionStaffingPreExecute({ workspace, source, sourceOptions, now: () => capturedAt }))
      .rejects.toThrow('Production staffing pre-execute observation refused; details suppressed');
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it('records the collection start before the query and completion after it', async () => {
    const start = new Date('2026-09-28T11:59:00.000Z');
    const clock = vi.fn().mockReturnValueOnce(start).mockReturnValueOnce(capturedAt);
    const receipt = await collectProductionStaffingPreExecute({ workspace, source, sourceOptions, now: clock });
    expect(clock).toHaveBeenCalledTimes(2);
    expect(clock.mock.invocationCallOrder[0]).toBeLessThan(mocks.spawn.mock.invocationCallOrder[0]);
    expect(mocks.spawn.mock.invocationCallOrder[0]).toBeLessThan(clock.mock.invocationCallOrder[1]);
    expect(receipt.observation).toMatchObject({ collectionStartedAtUtc: start.toISOString(), capturedAtUtc: capturedAt.toISOString() });
    expect(receipt.assessment.disposition).toBe('staffing_pre_execute_proved_not_execution_authority');
  });

  it('rejects an invalid start before opening a database process', async () => {
    await expect(collectProductionStaffingPreExecute({ workspace, source, sourceOptions, now: () => new Date(NaN) })).rejects.toThrow('details suppressed');
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it('rejects a backwards clock instead of publishing a reversed interval', async () => {
    const clock = vi.fn().mockReturnValueOnce(capturedAt).mockReturnValueOnce(new Date(capturedAt.getTime() - 1));
    await expect(collectProductionStaffingPreExecute({ workspace, source, sourceOptions, now: clock })).rejects.toThrow('details suppressed');
    expect(mocks.spawn).toHaveBeenCalledOnce();
  });

  it.each([
    { status: 1, stdout: 'private-row', stderr: 'private-error' },
    { status: null, error: new Error('secret-timeout') },
    { status: 0, stdout: null },
    { status: 0, signal: 'SIGTERM', stdout: 'not-a-completed-observation' },
  ])('rejects incomplete subprocess results', async result => {
    mocks.spawn.mockReturnValue(result);
    await expect(collectProductionStaffingPreExecute({ workspace, source, sourceOptions, now: () => capturedAt })).rejects.toThrow('details suppressed');
  });

  it('does not convert a deficient routine into an execution permission', async () => {
    const value = projection();
    value.routine.securityDefiner = true;
    mocks.spawn.mockReturnValue({ status: 0, stdout: JSON.stringify(value) });
    const receipt = await collectProductionStaffingPreExecute({ workspace, source, sourceOptions, now: () => capturedAt });
    expect(receipt.assessment).toMatchObject({
      disposition: 'blocked_insufficient_staffing_pre_execute_proof', reason: 'routine_contract_not_proven',
    });
  });

  it('rejects an extra projection field without accepting raw output', async () => {
    mocks.spawn.mockReturnValue({ status: 0, stdout: JSON.stringify({ ...projection(), rawFunctionDefinition: 'not-admitted' }) });
    await expect(collectProductionStaffingPreExecute({ workspace, source, sourceOptions, now: () => capturedAt })).rejects.toThrow('details suppressed');
  });

  it('rejects a caller-provided environment and a non-session-pooler mode before spawn', async () => {
    await expect(collectProductionStaffingPreExecute({ workspace, source, sourceOptions, environment: { ...process.env }, now: () => capturedAt })).rejects.toThrow('details suppressed');
    vi.stubEnv('SUPABASE_DB_CONNECTION_MODE', 'direct');
    await expect(collectProductionStaffingPreExecute({ workspace, source, sourceOptions, now: () => capturedAt })).rejects.toThrow('details suppressed');
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it('rejects DML-looking SQL and requires its bounded rollback transaction', () => {
    expect(assertProductionStaffingPreExecuteSql(sql)).toBe(true);
    expect(() => assertProductionStaffingPreExecuteSql(`${sql}\nSELECT 1;`)).toThrow('details suppressed');
    expect(() => assertProductionStaffingPreExecuteSql("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; INSERT INTO public.x VALUES (1); ROLLBACK;")).toThrow('details suppressed');
  });
});
