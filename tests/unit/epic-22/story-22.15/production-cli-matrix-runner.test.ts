import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { PRODUCTION_HISTORY_REPAIR_VERSIONS } from '../../../../src/lib/release/production-history-repair-baseline.mjs';
import {
  assertInitialMatrixObservation,
  assertProtectedMatrixCliInvocation,
  buildProtectedMatrixCliInvocation,
  buildPinnedMatrixToolEnvironment,
  runProductionCliMatrixCase,
  createPinnedMatrixToolVerifier,
} from '../../../support/production-cli-matrix-runner.mjs';
import { SYNTHETIC_AGGREGATES } from '../../../support/production-cli-matrix-fixture.mjs';

const binding = {
  owned: true,
  verified: true,
  resourceId: '00000000-0000-0000-0000-000000000000',
  expectedSystemIdentifierSha256: 'a'.repeat(64),
  composeSha256: 'b'.repeat(64),
  port: 27442,
  password: 'c'.repeat(32),
  observedAtUtc: new Date().toISOString(),
};

describe('deterministic pinned CLI profile', () => {
  it('overrides an ambient profile without inheriting routing or credentials', () => {
    const environment = buildPinnedMatrixToolEnvironment({
      SystemRoot: 'synthetic-system-root',
      SUPABASE_PROFILE: 'missing-local-profile',
      SUPABASE_ACCESS_TOKEN: 'secret-canary',
      SUPABASE_API_HOST: 'unreviewed-api-canary',
      USERPROFILE: 'unreviewed-profile-directory',
      PGHOST: 'unreviewed-database-canary',
      PGPASSWORD: 'secret-canary',
    });
    expect(environment).toEqual({
      SystemRoot: 'synthetic-system-root', SUPABASE_PROFILE: 'supabase',
    });
  });

  it('uses the built-in vendor profile when no home or profile is available', () => {
    expect(buildPinnedMatrixToolEnvironment({})).toEqual({ SUPABASE_PROFILE: 'supabase' });
  });
});

describe('declared initial matrix profile', () => {
  const expected = {
    ...SYNTHETIC_AGGREGATES,
    savedFilters: 48,
    savedFilterOrphans: 48,
    savedFilterEmptyNames: 0,
    savedFilterOverlengthNames: 0,
  };
  const observation = () => ({
    history: [],
    counts: {
      ...expected,
      unmappedActors: 0,
      repayment: {
        omcNull: 70,
        omcTrue: 2,
        omcFalse: 1,
        pe3Null: 70,
        pe3True: 2,
        pe3False: 1,
      },
    },
  });
  it('admits the complete declared synthetic profile', () => {
    expect(() =>
      assertInitialMatrixObservation(observation(), expected)
    ).not.toThrow();
  });
  it.each([
    'employees',
    'auditRows',
    'auditNonNullActors',
    'auditDistinctNonNullActors',
    'staffingLocations',
    'users',
    'importantDates',
    'staffingChangelog',
    'columnConfig',
    'savedFilters',
    'savedFilterOrphans',
    'savedFilterEmptyNames',
    'savedFilterOverlengthNames',
  ])('rejects drift in %s', (key) => {
    const initial = observation();
    Object.assign(initial.counts, { [key]: 999 });
    expect(() => assertInitialMatrixObservation(initial, expected)).toThrow(
      'matrix_fixture_aggregates'
    );
  });
  it.each(['omcNull', 'omcTrue', 'omcFalse', 'pe3Null', 'pe3True', 'pe3False'])(
    'rejects repayment drift in %s',
    (key) => {
      const initial = observation();
      Object.assign(initial.counts.repayment, { [key]: 999 });
      expect(() => assertInitialMatrixObservation(initial, expected)).toThrow(
        'matrix_fixture_repayment'
      );
    }
  );
  it('rejects a prepopulated history even with matching data', () => {
    expect(() =>
      assertInitialMatrixObservation(
        { ...observation(), history: ['20260314000001'] },
        expected
      )
    ).toThrow('matrix_fixture_initial_state');
  });
});

describe('successful local protected CLI command shape', () => {
  it.each([true, false])(
    'uses the protected %s shape with a neutral local DSN and closed stdin',
    (dryRun) => {
      const invocation = buildProtectedMatrixCliInvocation({
        databaseName: 'cli_matrix_shape',
        dryRun,
      });
      expect(invocation.args).toEqual([
        'db', 'push',
        ...(dryRun ? ['--dry-run'] : []),
        '--include-all', '--skip-vault', '--db-url',
        'postgresql:///cli_matrix_shape?sslmode=disable',
      ]);
      expect(invocation.spawn).toEqual({
        stdio: 'pipe', encoding: 'utf8', input: '',
      });
      expect(invocation.receipt).toMatchObject({
        hasYes: false,
        neutralLocalDsn: true,
        pgEnvironmentSuppliesConnectivity: true,
        stdin: 'closed_empty',
        hasSupabaseConfigToml: false,
        hasMigrationManifest: true,
      });
      expect(() =>
        assertProtectedMatrixCliInvocation(invocation, { dryRun })
      ).not.toThrow();
    }
  );

  it.each([
    (value) => value.args.push('--yes'),
    (value) => { value.args[value.args.length - 1] = 'postgresql://postgres@127.0.0.1:5432/matrix?sslmode=disable'; },
    (value) => { value.spawn.input = 'prompt response'; },
    (value) => { value.receipt.hasSupabaseConfigToml = true; },
  ])('rejects a non-protected successful command variant', (mutate) => {
    const invocation = structuredClone(
      buildProtectedMatrixCliInvocation({
        databaseName: 'cli_matrix_shape', dryRun: true,
      })
    );
    mutate(invocation);
    expect(() =>
      assertProtectedMatrixCliInvocation(invocation, { dryRun: true })
    ).toThrow('matrix_protected_command_shape');
  });
});

describe('local CLI matrix admission rejection', () => {
  it.each(['unreviewed', '__proto__', 'toString'])(
    'rejects unknown cases before touching files or targets: %s',
    async (caseName) => {
      await expect(runProductionCliMatrixCase({ caseName })).rejects.toThrow(
        'matrix_case'
      );
    }
  );

  it.each([
    { owned: false },
    { verified: false },
    { expectedSystemIdentifierSha256: '' },
    { expectedSystemIdentifierSha256: 'A'.repeat(64) },
    { composeSha256: '' },
    { resourceId: 'arbitrary' },
    { resourceId: '-'.repeat(36) },
    { port: 543.2 },
    { port: 1023 },
    { port: 65536 },
    { password: 'secret-canary' },
    { observedAtUtc: 'invalid' },
    { observedAtUtc: new Date(Date.now() - 3600000).toISOString() },
    { observedAtUtc: new Date(Date.now() + 3600000).toISOString() },
  ])(
    'rejects invalid guard facts before source/tool/database work: %j',
    async (delta) => {
      await expect(
        runProductionCliMatrixCase({
          caseName: 'postcleanup_success',
          guardBinding: { ...binding, ...delta },
        })
      ).rejects.toThrow('matrix_guard_binding');
    }
  );

  it('does not expose malformed input in errors', async () => {
    try {
      await runProductionCliMatrixCase({
        caseName: 'postcleanup_success',
        guardBinding: { password: 'secret-canary' },
      });
    } catch (error) {
      expect(String(error)).not.toContain('secret-canary');
      return;
    }
    throw new Error('Expected rejection');
  });
});


describe('matrix tool identity retained across individual repairs', () => {
  const digest = (value: Buffer) => createHash('sha256').update(value).digest('hex');
  const fixture = () => {
    let bytes = Buffer.from('reviewed synthetic executable'); let symbolicLink = false;
    const tool = { executablePath: process.execPath, sha256: digest(bytes) };
    const spawn = vi.fn((...parameters: unknown[]) => { void parameters; return { status: 0, stdout: '2.115.0\n' }; });
    const read = vi.fn((filename: string) => { void filename; return bytes; });
    const stat = () => ({ isFile: () => true, isSymbolicLink: () => symbolicLink });
    return { tool, spawn, read, stat, replace: (value: string) => { bytes = Buffer.from(value); },
      link: () => { symbolicLink = true; } };
  };
  it('checks every repair against the version-proved bytes without extra version processes', () => {
    const f = fixture(); const pinned = createPinnedMatrixToolVerifier(f.tool, '2.115.0', f); const recheck = pinned.recheck;
    for (let index = 0; index < 55; index++) recheck();
    expect(f.read).toHaveBeenCalledTimes(57); expect(f.spawn).toHaveBeenCalledTimes(1);
    expect(f.spawn.mock.calls[0][0]).toBe(process.execPath);
  });
  it('refuses changed bytes even if the caller updates its expected hash', () => {
    const f = fixture(); const pinned = createPinnedMatrixToolVerifier(f.tool, '2.115.0', f); const recheck = pinned.recheck;
    f.replace('unreviewed replacement'); f.tool.sha256 = digest(f.read(process.execPath));
    expect(recheck).toThrow('matrix_tool_hash'); expect(f.spawn).toHaveBeenCalledTimes(1);
  });
  it('retains the original path if the caller redirects the tool object', () => {
    const f = fixture(); const pinned = createPinnedMatrixToolVerifier(f.tool, '2.115.0', f); const recheck = pinned.recheck;
    f.tool.executablePath += '.unreviewed'; recheck();
    expect(pinned.executablePath).toBe(process.execPath); expect(Object.isFrozen(pinned)).toBe(true);
    expect(f.read.mock.calls.at(-1)?.[0]).toBe(process.execPath);
  });
  const repairContext = () => ({ workingDirectory: process.cwd(), environment: { PGHOST: '127.0.0.1',
    PGPORT: '27442', PGDATABASE: 'cli_matrix_' + 'a'.repeat(24), PGSSLMODE: 'disable' } });
  const repairUrl = 'postgresql://postgres@127.0.0.1:27442/cli_matrix_' + 'a'.repeat(24) + '?sslmode=disable';
  it('the actual repair child remains bound to the original executable after caller redirection', () => {
    const f = fixture(); const pinned = createPinnedMatrixToolVerifier(f.tool, '2.115.0', f);
    f.tool.executablePath += '.unreviewed'; f.tool.sha256 = 'f'.repeat(64);
    pinned.repair(PRODUCTION_HISTORY_REPAIR_VERSIONS[0], repairUrl, repairContext());
    expect(f.spawn.mock.calls.at(-1)?.[0]).toBe(process.execPath);
    expect(f.spawn.mock.calls.at(-1)?.[1]).toEqual(['migration', 'repair', '--db-url', repairUrl,
      '--status', 'applied', PRODUCTION_HISTORY_REPAIR_VERSIONS[0]]);
  });
  it('changed executable bytes are refused before any repair child', () => {
    const f = fixture(); const pinned = createPinnedMatrixToolVerifier(f.tool, '2.115.0', f);
    f.replace('replaced before repair'); f.tool.sha256 = digest(f.read(process.execPath));
    expect(() => pinned.repair(PRODUCTION_HISTORY_REPAIR_VERSIONS[0], repairUrl, repairContext())).toThrow('matrix_tool_hash');
    expect(f.spawn).toHaveBeenCalledTimes(1);
  });
  it.each([repairUrl.replace('127.0.0.1', 'unreviewed-host'), repairUrl.replace('disable', 'require')])(
    'refuses a non-fixture repair target before any repair child', url => {
      const f = fixture(); const pinned = createPinnedMatrixToolVerifier(f.tool, '2.115.0', f);
      expect(() => pinned.repair(PRODUCTION_HISTORY_REPAIR_VERSIONS[0], url, repairContext())).toThrow('matrix_repair_local_target');
      expect(f.spawn).toHaveBeenCalledTimes(1);
    });
  it('rejects an executable replaced with a symbolic link after version verification', () => {
    const f = fixture(); const pinned = createPinnedMatrixToolVerifier(f.tool, '2.115.0', f); const recheck = pinned.recheck;
    f.link(); expect(recheck).toThrow('matrix_tool_hash');
  });
  it('rejects mutation during the initial version child', () => {
    const f = fixture(); f.spawn.mockImplementation(() => { f.replace('changed during version'); return { status: 0, stdout: '2.115.0\n' }; });
    expect(() => createPinnedMatrixToolVerifier(f.tool, '2.115.0', f)).toThrow('matrix_tool_hash');
  });
  it('rejects the wrong version', () => {
    const f = fixture(); f.spawn.mockReturnValue({ status: 0, stdout: 'other-version' });
    expect(() => createPinnedMatrixToolVerifier(f.tool, '2.115.0', f)).toThrow('matrix_tool_version');
  });
  it('rejects non-file identities before any version child', () => {
    const f = fixture(); expect(() => createPinnedMatrixToolVerifier(f.tool, '2.115.0', { ...f,
      stat: () => ({ isFile: () => false, isSymbolicLink: () => false }) })).toThrow('matrix_tool_hash');
    expect(f.spawn).not.toHaveBeenCalled();
  });
});
