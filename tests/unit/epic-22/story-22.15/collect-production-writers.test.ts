import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';

const mocks = vi.hoisted(() => ({
  cli: vi.fn(), psql: vi.fn(), certificate: vi.fn(), target: vi.fn(),
  spawn: vi.fn(), parse: vi.fn(),
}));
vi.mock('node:child_process', () => ({ spawnSync: mocks.spawn, default: { spawnSync: mocks.spawn } }));
vi.mock('../../../../supabase/verify/run-reviewed-supabase-cli.mjs', () => ({ verifyApprovedSupabaseCliExecutable: mocks.cli }));
vi.mock('../../../../supabase/verify/verify-production-baseline-catalog.mjs', () => ({ verifyApprovedPsqlExecutable: mocks.psql, verifyApprovedSslRootCertificate: mocks.certificate }));
vi.mock('../../../../supabase/verify/verify-target-binding.mjs', () => ({ verifyConfiguredSupabaseTarget: mocks.target }));
vi.mock('../../../../src/lib/release/production-database-writer-classification.mjs', async importOriginal => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, parseDatabaseWriterClassification: mocks.parse };
});
import { collectProductionWriters } from '../../../../src/lib/release/collect-production-writers.mjs';

describe('fixed read-only production writer collector', () => {
  const workspace = path.resolve('synthetic-source');
  let captured: { args: string[]; options: Record<string, unknown>; env: Record<string, string> };
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('EXPECTED_SUPABASE_ENVIRONMENT', 'production');
    vi.stubEnv('SUPABASE_DB_URL', 'postgresql://postgres.synthetic:synthetic-password@pooler.invalid:5432/postgres?sslmode=verify-full');
    vi.stubEnv('PGSERVICE', 'must-not-inherit');
    vi.stubEnv('NODE_OPTIONS', 'must-not-inherit');
    mocks.psql.mockReturnValue('reviewed-psql');
    mocks.certificate.mockReturnValue('reviewed-ca');
    mocks.target.mockResolvedValue({});
    mocks.parse.mockReturnValue({ count: 0 });
    mocks.spawn.mockImplementation((_executable, args, options) => {
      captured = { args: [...args], options, env: { ...options.env } };
      return { status: 0, stdout: 'synthetic-redacted-json', stderr: '' };
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('checks tooling and target before the fixed read-only transaction; credentials stay out of arguments and receipt', async () => {
    const receipt = await collectProductionWriters({ workspace });
    expect(mocks.cli).toHaveBeenCalledOnce();
    expect(mocks.psql).toHaveBeenCalledOnce();
    expect(mocks.certificate).toHaveBeenCalledOnce();
    expect(mocks.target).toHaveBeenCalledWith({ workspace, environment: process.env });
    expect(mocks.target.mock.invocationCallOrder[0]).toBeLessThan(mocks.spawn.mock.invocationCallOrder[0]);
    expect(captured.args.join(' ')).not.toMatch(/password|pooler/);
    expect(captured.options.input).toMatch(/BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/);
    expect(captured.options.input).toMatch(/ROLLBACK;\s*$/);
    expect(captured.env.PGSSLMODE).toBe('verify-full');
    expect(captured.env.PGSSLROOTCERT).toBe('reviewed-ca');
    expect(captured.env.PGOPTIONS).toContain('default_transaction_read_only=on');
    expect(captured.env).not.toHaveProperty('PGSERVICE');
    expect(captured.env).not.toHaveProperty('NODE_OPTIONS');
    expect(captured.options.env).toEqual({});
    expect(receipt.isolationProved).toBe(false);
    expect(JSON.stringify(receipt)).not.toMatch(/password|pooler/);
  });

  it.each(['cli', 'psql', 'certificate', 'target'] as const)('refuses %s verification failure before spawning and suppresses private details', async kind => {
    mocks[kind].mockImplementation(() => { throw new Error('private-host-and-secret'); });
    await expect(collectProductionWriters({ workspace })).rejects.toThrow('Production writer observation refused; details suppressed');
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it.each([
    { status: 1, stdout: 'private-row', stderr: 'private-error' },
    { status: null, error: new Error('secret-timeout') },
    { status: 0, stdout: null },
    { status: 0, signal: 'SIGTERM', stdout: 'not-a-completed-observation' },
  ])('refuses incomplete subprocess results without parsing output', async result => {
    mocks.spawn.mockReturnValue(result);
    await expect(collectProductionWriters({ workspace })).rejects.toThrow('details suppressed');
    expect(mocks.parse).not.toHaveBeenCalled();
  });

  it('rejects invalid projection without relaying raw response or parser errors', async () => {
    mocks.parse.mockImplementation(() => { throw new Error('private-row'); });
    await expect(collectProductionWriters({ workspace })).rejects.toThrow('Production writer observation refused; details suppressed');
  });

  it('rejects a caller environment different from the verified process environment', async () => {
    await expect(collectProductionWriters({ workspace, environment: { ...process.env } })).rejects.toThrow('details suppressed');
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it('rejects staging and a relative workspace before any subprocess', async () => {
    vi.stubEnv('EXPECTED_SUPABASE_ENVIRONMENT', 'staging');
    await expect(collectProductionWriters({ workspace })).rejects.toThrow('details suppressed');
    vi.stubEnv('EXPECTED_SUPABASE_ENVIRONMENT', 'production');
    await expect(collectProductionWriters({ workspace: 'relative' })).rejects.toThrow('details suppressed');
    expect(mocks.spawn).not.toHaveBeenCalled();
  });
});
