import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  SAVED_FILTER_CLEANUP_PREREQUISITE_SQL_SHA256,
  evaluateProductionSavedFilterCleanupCsv,
  runProductionSavedFilterCleanupPrerequisite,
} from '../../../../supabase/verify/verify-production-saved-filter-cleanup-prerequisite.mjs';

const projectRef = 'abcdefghijklmnopqrst';
const password = 'do-not-print-this-password';
const environment = {
  EXPECTED_SUPABASE_ENVIRONMENT: 'local-test',
  EXPECTED_SUPABASE_PROJECT_REF: projectRef,
  SUPABASE_DB_URL: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
  SUPABASE_DB_CONNECTION_MODE: 'direct',
};
const reviewedPsqlPath = resolve('reviewed-tooling', 'psql.exe');
const reviewedCertificatePath = resolve('reviewed-tooling', 'supabase-root.pem');
function cleanupCsv({
  total = '0',
  orphanAuthReferences = '0',
  emptyNames = '0',
  overlengthNames = '0',
}: {
  total?: string;
  orphanAuthReferences?: string;
  emptyNames?: string;
  overlengthNames?: string;
} = {}) {
  return [
    'total,orphan_auth_references,empty_names,overlength_names',
    `${total},${orphanAuthReferences},${emptyNames},${overlengthNames}`,
  ].join('\n');
}

const reviewedTooling = {
  executionMode: 'local-test-adapter' as const,
  psqlVerifier: () => reviewedPsqlPath,
  rootCertificateVerifier: () => reviewedCertificatePath,
};

describe('Story 22.15 production saved-filter cleanup prerequisite', () => {
  it('accepts a clean, aggregate-only snapshot without converting it to apply authority', () => {
    expect(evaluateProductionSavedFilterCleanupCsv(cleanupCsv())).toEqual({
      total: 0,
      orphanAuthReferences: 0,
      emptyNames: 0,
      overlengthNames: 0,
      meetsMigrationDataPrerequisites: true,
    });
  });

  it.each([
    { orphanAuthReferences: '1' },
    { emptyNames: '1' },
    { overlengthNames: '1' },
  ])('retains every nonzero invalid aggregate as evidence rather than concealing it', (invalidCount) => {
    expect(evaluateProductionSavedFilterCleanupCsv(cleanupCsv({ total: '48', ...invalidCount }))).toMatchObject({
      total: 48,
      meetsMigrationDataPrerequisites: false,
    });
  });

  it.each([
    '',
    'total,orphan_auth_references,empty_names,overlength_names\n',
    'total,orphan_auth_references,empty_names,overlength_names\n1,0,0',
    'total,orphan_auth_references,empty_names,overlength_names\n1,-1,0,0',
    'total,orphan_auth_references,empty_names,overlength_names\n1,,0,0',
    'total,orphan_auth_references,empty_names,overlength_names\n1,2,0,0',
    'total,orphan_auth_references,empty_names,overlength_names\n1,0,1,1',
    'total,orphan_auth_references,empty_names,overlength_names\n9007199254740992,0,0,0',
    'unexpected,orphan_auth_references,empty_names,overlength_names\n0,0,0,0',
    'total,orphan_auth_references,empty_names,overlength_names,unexpected\n0,0,0,0,0',
    `${cleanupCsv()}\n0,0,0,0`,
  ])('rejects malformed, incomplete, duplicate, unsafe, or contradictory CSV', (csv) => {
    expect(() => evaluateProductionSavedFilterCleanupCsv(csv)).toThrow(
      'Saved-filter cleanup prerequisite returned an unreadable result'
    );
  });

  it('uses only target-bound reviewed psql and TLS inputs, without putting private target values on the command line', async () => {
    const poisonedEnvironment = {
      ...environment,
      PGHOSTADDR: '203.0.113.9',
      PGSERVICE: 'attacker-service',
      PGOPTIONS: '-c search_path=attacker',
      UNRELATED_PARENT_SECRET: 'must-not-reach-psql',
    };
    let observedArguments: string[] = [];
    let observedOptions: { env: Record<string, string>; input: string; timeout: number } | undefined;

    const evaluation = await runProductionSavedFilterCleanupPrerequisite({
      ...reviewedTooling,
      environment: poisonedEnvironment,
      targetVerifier: async () => true,
      spawn: (
        _command: string,
        args: string[],
        options: { env: Record<string, string>; input: string; timeout: number }
      ) => {
        observedArguments = args;
        observedOptions = options;
        return { error: undefined, status: 0, stdout: cleanupCsv() };
      },
    });

    expect(evaluation.meetsMigrationDataPrerequisites).toBe(true);
    expect(evaluation).toMatchObject({
      environment: 'local-test',
      capturedAt: expect.any(String),
      sqlSha256: SAVED_FILTER_CLEANUP_PREREQUISITE_SQL_SHA256,
      evidenceOnly: true,
      authorizesCleanup: false,
      authorizesMigrationApply: false,
    });
    const commandLine = observedArguments.join(' ');
    expect(commandLine).not.toContain(environment.SUPABASE_DB_URL);
    expect(commandLine).not.toContain(projectRef);
    expect(commandLine).not.toContain(password);
    expect(observedOptions).toBeDefined();
    expect(observedOptions?.timeout).toBe(45_000);
    expect(observedOptions?.input).toContain('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;');
    expect(observedOptions?.env).toMatchObject({
      PGHOST: `db.${projectRef}.supabase.co`,
      PGPORT: '5432',
      PGDATABASE: 'postgres',
      PGUSER: 'postgres',
      PGSSLMODE: 'verify-full',
      PGSSLROOTCERT: reviewedCertificatePath,
    });
    for (const forbiddenKey of [
      'PGHOSTADDR',
      'PGSERVICE',
      'PGOPTIONS',
      'SUPABASE_DB_URL',
      'EXPECTED_SUPABASE_PROJECT_REF',
      'UNRELATED_PARENT_SECRET',
    ]) {
      expect(observedOptions?.env).not.toHaveProperty(forbiddenKey);
    }
  });

  it('rejects psql meta-command source before target verification or process spawn', async () => {
    const targetVerifier = vi.fn(async () => true);
    const spawn = vi.fn();

    await expect(
      runProductionSavedFilterCleanupPrerequisite({
        ...reviewedTooling,
        environment,
        targetVerifier,
        spawn,
        readSql: () => 'BEGIN READ ONLY;\\connect attacker',
      })
    ).rejects.toThrow('Catalog verifier contains a forbidden psql meta-command');
    expect(targetVerifier).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('requires the production environment before target verification unless the local adapter is explicit', async () => {
    const targetVerifier = vi.fn(async () => true);
    const spawn = vi.fn();

    await expect(
      runProductionSavedFilterCleanupPrerequisite({
        ...reviewedTooling,
        environment,
        executionMode: 'production',
        targetVerifier,
        spawn,
      })
    ).rejects.toThrow('Saved-filter cleanup prerequisite requires the production environment');
    expect(targetVerifier).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('rejects a source whose bytes differ from the reviewed SQL before target verification or process spawn', async () => {
    const targetVerifier = vi.fn(async () => true);
    const spawn = vi.fn();

    await expect(
      runProductionSavedFilterCleanupPrerequisite({
        ...reviewedTooling,
        environment,
        targetVerifier,
        spawn,
        readSql: () => 'BEGIN TRANSACTION READ ONLY;\nSELECT 1;\nCOMMIT;\n',
      })
    ).rejects.toThrow('Saved-filter cleanup prerequisite source does not match the reviewed SHA-256');
    expect(targetVerifier).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('executes the already hashed SQL through stdin even if the source file is changed after read', async () => {
    const sourceSql = readFileSync(
      resolve('supabase', 'verify', 'production-saved-filter-cleanup-prerequisite.sql'),
      'utf8'
    );
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'saved-filter-collector-'));
    const temporaryVerifierDirectory = resolve(temporaryRoot, 'supabase', 'verify');
    const temporaryVerifierPath = resolve(
      temporaryVerifierDirectory,
      'production-saved-filter-cleanup-prerequisite.sql'
    );
    mkdirSync(temporaryVerifierDirectory, { recursive: true });
    writeFileSync(temporaryVerifierPath, sourceSql, 'utf8');

    try {
      await runProductionSavedFilterCleanupPrerequisite({
        ...reviewedTooling,
        environment,
        workspace: temporaryRoot,
        targetVerifier: async () => true,
        readSql: (path: string) => {
          const verifiedSql = readFileSync(path, 'utf8');
          writeFileSync(path, 'SELECT attacker_controlled_sql;', 'utf8');
          return verifiedSql;
        },
        spawn: (
          _command: string,
          args: string[],
          options: { input: string }
        ) => {
          expect(args).toContain('--file');
          expect(args).toContain('-');
          expect(options.input).toBe(sourceSql);
          expect(readFileSync(temporaryVerifierPath, 'utf8')).toBe(
            'SELECT attacker_controlled_sql;'
          );
          return { error: undefined, status: 0, stdout: cleanupCsv() };
        },
      });
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('rejects unexpected direct CLI arguments without starting a collector', () => {
    const runnerPath = resolve(
      'supabase',
      'verify',
      'verify-production-saved-filter-cleanup-prerequisite.mjs'
    );
    const result = spawnSync(process.execPath, [runnerPath, '--unexpected'], {
      cwd: resolve('.'),
      encoding: 'utf8',
      timeout: 5_000,
      windowsHide: true,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Saved-filter cleanup prerequisite failed.\n');
  });

  it('fails closed when psql does not produce a complete successful result', async () => {
    await expect(
      runProductionSavedFilterCleanupPrerequisite({
        ...reviewedTooling,
        environment,
        targetVerifier: async () => true,
        spawn: () => ({ error: undefined, status: 1, stdout: cleanupCsv() }),
      })
    ).rejects.toThrow(
      'Saved-filter cleanup prerequisite query failed before a complete result was returned'
    );
  });
});
