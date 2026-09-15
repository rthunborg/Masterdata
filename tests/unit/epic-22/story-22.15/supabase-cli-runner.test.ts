import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  REVIEWED_ENVIRONMENT_FLAG,
  REVIEWED_SUPABASE_CLI_VERSION,
  REVIEWED_TARGET_FLAG,
  runReviewedSupabaseCli,
  verifyApprovedSupabaseCliExecutable,
} from '../../../../supabase/verify/run-reviewed-supabase-cli.mjs';

const reviewedCliPath = resolve('reviewed-tooling', 'supabase.exe');
const executable = Buffer.from('reviewed Supabase CLI executable');
const expectedSha256 = createHash('sha256').update(executable).digest('hex');
const projectRef = 'abcdefghijklmnopqrst';
const password = 'do-not-print-this-password';
const reviewedCertificatePath = resolve(
  'reviewed-tooling',
  'supabase-root.pem'
);

describe('Story 22.15 reviewed Supabase CLI runner', () => {
  it('resolves and hashes an approved absolute executable before an exact version probe', () => {
    const spawn = vi.fn(() => ({
      error: undefined,
      status: 0,
      stdout: `${REVIEWED_SUPABASE_CLI_VERSION}\n`,
    }));
    const environment = {
      SUPABASE_CLI_EXECUTABLE: reviewedCliPath,
      EXPECTED_SUPABASE_CLI_SHA256: expectedSha256,
      SUPABASE_ACCESS_TOKEN: 'must-not-reach-version-probe',
    };

    expect(
      verifyApprovedSupabaseCliExecutable({
        environment,
        readExecutable: () => executable,
        resolveExecutable: (configuredPath: string) => configuredPath,
        spawn,
      })
    ).toBe(reviewedCliPath);
    expect(spawn).toHaveBeenCalledOnce();
    expect(spawn.mock.calls[0]?.[0]).toBe(reviewedCliPath);
    expect(spawn.mock.calls[0]?.[1]).toEqual(['--version']);
    expect(spawn.mock.calls[0]?.[2]?.env).not.toHaveProperty(
      'SUPABASE_ACCESS_TOKEN'
    );
  });

  it('rejects a PATH-resolved, missing-hash, hash-mismatched, or wrong-version executable', () => {
    expect(() =>
      verifyApprovedSupabaseCliExecutable({
        environment: {
          SUPABASE_CLI_EXECUTABLE: 'supabase',
          EXPECTED_SUPABASE_CLI_SHA256: expectedSha256,
        },
      })
    ).toThrow('Supabase CLI must use an approved absolute path');

    expect(() =>
      verifyApprovedSupabaseCliExecutable({
        environment: { SUPABASE_CLI_EXECUTABLE: reviewedCliPath },
      })
    ).toThrow('Supabase CLI approved SHA-256 is unavailable or invalid');

    expect(() =>
      verifyApprovedSupabaseCliExecutable({
        environment: {
          SUPABASE_CLI_EXECUTABLE: reviewedCliPath,
          EXPECTED_SUPABASE_CLI_SHA256: '0'.repeat(64),
        },
        readExecutable: () => executable,
        resolveExecutable: (configuredPath: string) => configuredPath,
      })
    ).toThrow('Supabase CLI does not match the approved SHA-256');

    expect(() =>
      verifyApprovedSupabaseCliExecutable({
        environment: {
          SUPABASE_CLI_EXECUTABLE: reviewedCliPath,
          EXPECTED_SUPABASE_CLI_SHA256: expectedSha256,
        },
        readExecutable: () => executable,
        resolveExecutable: (configuredPath: string) => configuredPath,
        spawn: () => ({ error: undefined, status: 0, stdout: '2.116.0\n' }),
      })
    ).toThrow('Supabase CLI does not match the reviewed version');
  });

  it('spawns non-database commands with the exact requested arguments', async () => {
    const spawn = vi.fn(() => ({ error: undefined, status: 0 }));
    const environment = {
      SUPABASE_CLI_EXECUTABLE: reviewedCliPath,
      EXPECTED_SUPABASE_CLI_SHA256: expectedSha256,
      SUPABASE_ACCESS_TOKEN: 'approved-runtime-token',
    };
    const args = ['projects', 'list'];
    const executableVerifier = vi.fn(() => reviewedCliPath);

    expect(
      await runReviewedSupabaseCli({
        args,
        workspace: resolve('workspace'),
        environment,
        spawn,
        executableVerifier,
      })
    ).toBe(0);
    expect(executableVerifier).toHaveBeenCalledWith({ environment });
    expect(spawn).toHaveBeenCalledWith(reviewedCliPath, args, {
      cwd: resolve('workspace'),
      env: environment,
      stdio: 'inherit',
      windowsHide: true,
    });
  });

  it('allows only the exact standalone root version probe', async () => {
    const spawn = vi.fn(() => ({ error: undefined, status: 0 }));
    const environment = { PATH: 'reviewed-path' };

    expect(
      await runReviewedSupabaseCli({
        args: ['--version'],
        environment,
        spawn,
        executableVerifier: () => reviewedCliPath,
      })
    ).toBe(0);
    expect(spawn).toHaveBeenCalledWith(
      reviewedCliPath,
      ['--version'],
      expect.objectContaining({ env: environment })
    );

    const rejectedSpawn = vi.fn();
    const rejectedExecutableVerifier = vi.fn(() => reviewedCliPath);
    await expect(
      runReviewedSupabaseCli({
        args: ['--version', 'db', 'push', '--linked'],
        spawn: rejectedSpawn,
        executableVerifier: rejectedExecutableVerifier,
      })
    ).rejects.toThrow(
      'Supabase CLI root options before the command are not permitted'
    );
    expect(rejectedExecutableVerifier).not.toHaveBeenCalled();
    expect(rejectedSpawn).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'direct',
      databaseUrl: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
      expectedHost: `db.${projectRef}.supabase.co`,
      expectedUser: 'postgres',
    },
    {
      label: 'session-pooler',
      databaseUrl: `postgresql://postgres.${projectRef}:${password}@aws-0-eu-north-1.pooler.supabase.com:5432/postgres?sslmode=verify-full`,
      expectedHost: 'aws-0-eu-north-1.pooler.supabase.com',
      expectedUser: `postgres.${projectRef}`,
    },
  ])(
    'binds the actual CLI connection to the reviewed $label target without argument leakage',
    async ({ databaseUrl, expectedHost, expectedUser }) => {
      const spawn = vi.fn(() => ({ error: undefined, status: 0 }));
      const targetVerifier = vi.fn(async () => true);
      const rootCertificateVerifier = vi.fn(() => reviewedCertificatePath);
      const environment = {
        SUPABASE_CLI_EXECUTABLE: reviewedCliPath,
        EXPECTED_SUPABASE_CLI_SHA256: expectedSha256,
        EXPECTED_SUPABASE_PROJECT_REF: projectRef,
        SUPABASE_DB_CONNECTION_MODE: 'direct',
        SUPABASE_DB_URL: databaseUrl,
        SUPABASE_ACCESS_TOKEN: 'must-not-reach-database-command',
        SUPABASE_DB_PASSWORD: 'must-not-reach-database-command',
        PGHOST: 'ambient-host-must-not-survive',
        PGSSLMODE: 'disable',
        PGSERVICE: 'ambient-service-must-not-survive',
        UNRELATED_PARENT_SECRET: 'must-not-reach-database-command',
      };
      const workspace = resolve('workspace');
      const args = ['migration', 'list', REVIEWED_TARGET_FLAG];

      expect(
        await runReviewedSupabaseCli({
          args,
          workspace,
          environment,
          spawn,
          executableVerifier: () => reviewedCliPath,
          targetVerifier,
          rootCertificateVerifier,
        })
      ).toBe(0);
      expect(targetVerifier).toHaveBeenCalledWith({ workspace, environment });
      expect(rootCertificateVerifier).toHaveBeenCalledWith({ environment });

      const childArguments = spawn.mock.calls[0]?.[1] as string[];
      const childEnvironment = spawn.mock.calls[0]?.[2]?.env as Record<
        string,
        string
      >;
      expect(childArguments).toEqual([
        'migration',
        'list',
        '--db-url',
        'postgresql:///postgres?sslmode=verify-full',
      ]);
      expect(childArguments).not.toContain('--linked');
      for (const privateValue of [
        databaseUrl,
        projectRef,
        expectedHost,
        password,
      ]) {
        expect(childArguments.join(' ')).not.toContain(privateValue);
      }
      expect(childEnvironment).toMatchObject({
        PGAPPNAME: 'hr-masterdata-reviewed-supabase-cli',
        PGCONNECT_TIMEOUT: '10',
        PGDATABASE: 'postgres',
        PGHOST: expectedHost,
        PGPASSWORD: password,
        PGPORT: '5432',
        PGSSLMODE: 'verify-full',
        PGSSLROOTCERT: reviewedCertificatePath,
        PGUSER: expectedUser,
      });
      for (const inheritedKey of [
        'EXPECTED_SUPABASE_ENVIRONMENT',
        'EXPECTED_SUPABASE_PROJECT_REF',
        'PGSERVICE',
        'SUPABASE_ACCESS_TOKEN',
        'SUPABASE_CLI_EXECUTABLE',
        'SUPABASE_DB_CONNECTION_MODE',
        'SUPABASE_DB_PASSWORD',
        'SUPABASE_DB_URL',
        'UNRELATED_PARENT_SECRET',
      ]) {
        expect(childEnvironment).not.toHaveProperty(inheritedKey);
      }
    }
  );

  it.each([
    {
      label: 'security advisors',
      args: ['db', 'advisors', REVIEWED_TARGET_FLAG, '--type', 'security'],
      expected: ['db', 'advisors', '--type', 'security'],
    },
    {
      label: 'performance advisors',
      args: ['db', 'advisors', REVIEWED_TARGET_FLAG, '--type', 'performance'],
      expected: ['db', 'advisors', '--type', 'performance'],
    },
    {
      label: 'production history repair from the reviewed manifest plan',
      args: [
        'migration',
        'repair',
        '--status',
        'applied',
        '20251027000000',
        REVIEWED_TARGET_FLAG,
        REVIEWED_ENVIRONMENT_FLAG,
        'production',
      ],
      expected: [
        'migration',
        'repair',
        '--status',
        'applied',
        '20251027000000',
      ],
    },
    {
      label: 'push dry run',
      args: ['db', 'push', REVIEWED_TARGET_FLAG, '--dry-run', '--skip-vault'],
      expected: ['db', 'push', '--dry-run', '--skip-vault'],
    },
    {
      label: 'push apply',
      args: ['db', 'push', REVIEWED_TARGET_FLAG, '--skip-vault'],
      expected: ['db', 'push', '--skip-vault'],
    },
  ])('accepts only the canonical $label shape', async ({ args, expected }) => {
    const spawn = vi.fn(() => ({ error: undefined, status: 0 }));
    const environment = {
      SUPABASE_DB_URL: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
      ...(args[0] === 'db' && args[1] === 'push'
        ? { EXPECTED_SUPABASE_ENVIRONMENT: 'staging' }
        : args[1] === 'repair'
          ? { EXPECTED_SUPABASE_ENVIRONMENT: args[7] }
          : {}),
    };

    expect(
      await runReviewedSupabaseCli({
        args,
        environment,
        spawn,
        executableVerifier: () => reviewedCliPath,
        targetVerifier: async () => true,
        rootCertificateVerifier: () => reviewedCertificatePath,
      })
    ).toBe(0);
    expect(spawn.mock.calls[0]?.[1]).toEqual([
      ...expected,
      '--db-url',
      'postgresql:///postgres?sslmode=verify-full',
    ]);
  });

  it.each([
    {
      label: 'apply',
      args: [
        'db',
        'push',
        REVIEWED_TARGET_FLAG,
        REVIEWED_ENVIRONMENT_FLAG,
        'production',
        '--include-all',
        '--skip-vault',
      ],
      expected: ['db', 'push', '--include-all', '--skip-vault'],
    },
    {
      label: 'dry run',
      args: [
        'db',
        'push',
        REVIEWED_TARGET_FLAG,
        REVIEWED_ENVIRONMENT_FLAG,
        'production',
        '--dry-run',
        '--include-all',
        '--skip-vault',
      ],
      expected: ['db', 'push', '--dry-run', '--include-all', '--skip-vault'],
    },
  ])(
    'forwards the exact reviewed production include-all $label shape with minimal TLS environment',
    async ({ args, expected }) => {
      const spawn = vi.fn(() => ({ error: undefined, status: 0 }));
      const targetVerifier = vi.fn(async () => true);
      const rootCertificateVerifier = vi.fn(() => reviewedCertificatePath);
      const workspace = resolve('.');
      const environment = {
        EXPECTED_SUPABASE_ENVIRONMENT: 'production',
        SUPABASE_DB_URL: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
        SUPABASE_ACCESS_TOKEN: 'must-not-reach-production-push',
        PGSERVICE: 'ambient-service-must-not-survive',
        UNRELATED_PARENT_SECRET: 'must-not-reach-production-push',
      };

      await expect(
        runReviewedSupabaseCli({
          args,
          workspace,
          environment,
          spawn,
          executableVerifier: () => reviewedCliPath,
          targetVerifier,
          rootCertificateVerifier,
        })
      ).resolves.toBe(0);

      expect(targetVerifier).toHaveBeenCalledOnce();
      expect(spawn).toHaveBeenCalledWith(
        reviewedCliPath,
        [...expected, '--db-url', 'postgresql:///postgres?sslmode=verify-full'],
        expect.objectContaining({
          env: expect.objectContaining({
            PGHOST: `db.${projectRef}.supabase.co`,
            PGSSLMODE: 'verify-full',
            PGSSLROOTCERT: reviewedCertificatePath,
          }),
        })
      );
      const childEnvironment = spawn.mock.calls[0]?.[2]?.env;
      for (const inheritedKey of [
        'SUPABASE_ACCESS_TOKEN',
        'PGSERVICE',
        'UNRELATED_PARENT_SECRET',
      ]) {
        expect(childEnvironment).not.toHaveProperty(inheritedKey);
      }
    }
  );

  it.each([
    ['apply', ['db', 'push', REVIEWED_TARGET_FLAG, '--skip-vault']],
    [
      'dry run',
      ['db', 'push', REVIEWED_TARGET_FLAG, '--dry-run', '--skip-vault'],
    ],
  ])(
    'rejects generic staging-only push $0 for a production target before target verification or spawn',
    async (_label, args) => {
      const spawn = vi.fn();
      const targetVerifier = vi.fn();
      await expect(
        runReviewedSupabaseCli({
          args,
          environment: { EXPECTED_SUPABASE_ENVIRONMENT: 'production' },
          spawn,
          executableVerifier: () => reviewedCliPath,
          targetVerifier,
        })
      ).rejects.toThrow(
        'Supabase CLI database arguments do not match an approved command shape'
      );
      expect(targetVerifier).not.toHaveBeenCalled();
      expect(spawn).not.toHaveBeenCalled();
    }
  );

  it.each([
    {
      label:
        'the prior staging repair after staging repairs were removed from the manifest',
      version: '20250113000000',
      reviewedEnvironment: 'staging',
    },
    {
      label: 'a production-only repair on staging',
      version: '20251027000000',
      reviewedEnvironment: 'staging',
    },
    {
      label: 'a staging forward migration',
      version: '20260831200026',
      reviewedEnvironment: 'staging',
    },
    {
      label: 'a production forward migration',
      version: '20260614000000',
      reviewedEnvironment: 'production',
    },
    {
      label:
        'the older production pending migration reserved for reviewed include-all execution',
      version: '20260314000002',
      reviewedEnvironment: 'production',
    },
    {
      label: 'an arbitrary migration version',
      version: '20991231235959',
      reviewedEnvironment: 'production',
    },
  ])(
    'rejects $label because it is outside the environment-specific repair plan',
    async ({ version, reviewedEnvironment }) => {
      const spawn = vi.fn();
      const targetVerifier = vi.fn();

      await expect(
        runReviewedSupabaseCli({
          args: [
            'migration',
            'repair',
            '--status',
            'applied',
            version,
            REVIEWED_TARGET_FLAG,
            REVIEWED_ENVIRONMENT_FLAG,
            reviewedEnvironment,
          ],
          environment: {
            EXPECTED_SUPABASE_ENVIRONMENT: reviewedEnvironment,
          },
          spawn,
          executableVerifier: () => reviewedCliPath,
          targetVerifier,
        })
      ).rejects.toThrow(
        'Supabase CLI database arguments do not match an approved command shape'
      );
      expect(targetVerifier).not.toHaveBeenCalled();
      expect(spawn).not.toHaveBeenCalled();
    }
  );

  it('requires an explicit reviewed environment for every history repair', async () => {
    const spawn = vi.fn();
    const targetVerifier = vi.fn();

    await expect(
      runReviewedSupabaseCli({
        args: [
          'migration',
          'repair',
          '--status',
          'applied',
          '20250113000000',
          REVIEWED_TARGET_FLAG,
        ],
        environment: { EXPECTED_SUPABASE_ENVIRONMENT: 'staging' },
        spawn,
        executableVerifier: () => reviewedCliPath,
        targetVerifier,
      })
    ).rejects.toThrow(
      'Supabase CLI database arguments do not match an approved command shape'
    );
    expect(targetVerifier).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('rejects a repair when the command environment differs from the reviewed private target record', async () => {
    const spawn = vi.fn();
    const targetVerifier = vi.fn();

    await expect(
      runReviewedSupabaseCli({
        args: [
          'migration',
          'repair',
          '--status',
          'applied',
          '20250113000000',
          REVIEWED_TARGET_FLAG,
          REVIEWED_ENVIRONMENT_FLAG,
          'staging',
        ],
        environment: { EXPECTED_SUPABASE_ENVIRONMENT: 'production' },
        spawn,
        executableVerifier: () => reviewedCliPath,
        targetVerifier,
      })
    ).rejects.toThrow(
      'Supabase CLI database arguments do not match an approved command shape'
    );
    expect(targetVerifier).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'a staging environment assertion',
      args: [
        'db',
        'push',
        REVIEWED_TARGET_FLAG,
        REVIEWED_ENVIRONMENT_FLAG,
        'production',
        '--include-all',
        '--skip-vault',
      ],
      environment: { EXPECTED_SUPABASE_ENVIRONMENT: 'staging' },
    },
    {
      label: 'a staging command shape',
      args: [
        'db',
        'push',
        REVIEWED_TARGET_FLAG,
        REVIEWED_ENVIRONMENT_FLAG,
        'staging',
        '--include-all',
        '--skip-vault',
      ],
      environment: { EXPECTED_SUPABASE_ENVIRONMENT: 'staging' },
    },
    {
      label: 'extra arguments',
      args: [
        'db',
        'push',
        REVIEWED_TARGET_FLAG,
        REVIEWED_ENVIRONMENT_FLAG,
        'production',
        '--include-all',
        '--skip-vault',
        '--yes',
      ],
      environment: { EXPECTED_SUPABASE_ENVIRONMENT: 'production' },
    },
  ])(
    'rejects production include-all with $label before target verification or spawn',
    async ({ args, environment }) => {
      const spawn = vi.fn();
      const targetVerifier = vi.fn();
      await expect(
        runReviewedSupabaseCli({
          args,
          environment,
          spawn,
          executableVerifier: () => reviewedCliPath,
          targetVerifier,
        })
      ).rejects.toThrow(
        'Supabase CLI database arguments do not match an approved command shape'
      );
      expect(targetVerifier).not.toHaveBeenCalled();
      expect(spawn).not.toHaveBeenCalled();
    }
  );

  it('rejects production include-all when the reviewed manifest plan is wrong before target verification or spawn', async () => {
    const spawn = vi.fn();
    const targetVerifier = vi.fn();
    await expect(
      runReviewedSupabaseCli({
        args: [
          'db',
          'push',
          REVIEWED_TARGET_FLAG,
          REVIEWED_ENVIRONMENT_FLAG,
          'production',
          '--include-all',
          '--skip-vault',
        ],
        environment: { EXPECTED_SUPABASE_ENVIRONMENT: 'production' },
        spawn,
        executableVerifier: () => reviewedCliPath,
        targetVerifier,
        readManifest: () =>
          JSON.stringify({
            environmentPlans: {
              production: {
                'repair-after-catalog-proof': ['20260314000002'],
                execute: [],
              },
            },
          }),
      })
    ).rejects.toThrow(
      'Reviewed migration baseline manifest is unavailable or invalid'
    );
    expect(targetVerifier).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it.each([
    { selector: ['--linked'] },
    { selector: ['--db-url', 'postgresql://unapproved.invalid/postgres'] },
    { selector: ['--local'] },
    { selector: ['--proxy'] },
    { selector: ['--password', 'must-not-appear'] },
    { selector: ['-p', 'must-not-appear'] },
    { selector: ['-pmust-not-appear'] },
  ])(
    'rejects native CLI target selectors before spawning',
    async ({ selector }) => {
      const spawn = vi.fn();
      await expect(
        runReviewedSupabaseCli({
          args: ['migration', 'list', REVIEWED_TARGET_FLAG, ...selector],
          spawn,
          executableVerifier: () => reviewedCliPath,
        })
      ).rejects.toThrow(
        'Native Supabase CLI database target selectors are not permitted'
      );
      expect(spawn).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['--debug', 'db', 'push', '--linked'],
    ['--debug', 'db', 'push', REVIEWED_TARGET_FLAG, '--skip-vault'],
    [
      '--workdir',
      'unapproved-worktree',
      'db',
      'push',
      REVIEWED_TARGET_FLAG,
      '--skip-vault',
    ],
  ])('rejects root options before command classification', async (...args) => {
    const spawn = vi.fn();
    const executableVerifier = vi.fn(() => reviewedCliPath);

    await expect(
      runReviewedSupabaseCli({ args, spawn, executableVerifier })
    ).rejects.toThrow(
      'Supabase CLI root options before the command are not permitted'
    );
    expect(executableVerifier).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it.each([
    [
      'db',
      'push',
      REVIEWED_TARGET_FLAG,
      '--workdir',
      'unapproved-worktree',
      '--skip-vault',
    ],
    ['db', 'push', REVIEWED_TARGET_FLAG, '--debug', '--skip-vault'],
    [
      'db',
      'push',
      REVIEWED_TARGET_FLAG,
      '--dry-run',
      '--skip-vault',
      '--profile',
      'unapproved-profile',
    ],
  ])(
    'rejects root options inside reviewed database arguments',
    async (...args) => {
      const spawn = vi.fn();
      const targetVerifier = vi.fn();

      await expect(
        runReviewedSupabaseCli({
          args,
          spawn,
          executableVerifier: () => reviewedCliPath,
          targetVerifier,
        })
      ).rejects.toThrow(
        'Supabase CLI database arguments do not match an approved command shape'
      );
      expect(targetVerifier).not.toHaveBeenCalled();
      expect(spawn).not.toHaveBeenCalled();
    }
  );

  it.each([['-p', 'inline-secret-value'], ['-pinline-secret-value']])(
    'rejects short password selectors without echoing the secret',
    async (...selector) => {
      const spawn = vi.fn();
      let errorMessage = '';

      try {
        await runReviewedSupabaseCli({
          args: ['migration', 'list', REVIEWED_TARGET_FLAG, ...selector],
          spawn,
          executableVerifier: () => reviewedCliPath,
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      expect(errorMessage).toBe(
        'Native Supabase CLI database target selectors are not permitted'
      );
      expect(errorMessage).not.toContain('inline-secret-value');
      expect(spawn).not.toHaveBeenCalled();
    }
  );

  it('requires the reviewed marker for database commands and rejects it elsewhere', async () => {
    await expect(
      runReviewedSupabaseCli({
        args: ['migration', 'list'],
        executableVerifier: () => reviewedCliPath,
      })
    ).rejects.toThrow(
      'Remote database commands require exactly one reviewed target marker'
    );

    await expect(
      runReviewedSupabaseCli({
        args: ['projects', 'list', REVIEWED_TARGET_FLAG],
        executableVerifier: () => reviewedCliPath,
      })
    ).rejects.toThrow('Reviewed target marker is not valid for this command');

    await expect(
      runReviewedSupabaseCli({
        args: ['db', 'reset'],
        executableVerifier: () => reviewedCliPath,
      })
    ).rejects.toThrow('This Supabase CLI database command is not approved');

    await expect(
      runReviewedSupabaseCli({
        args: ['migration', 'list', REVIEWED_TARGET_FLAG, REVIEWED_TARGET_FLAG],
        executableVerifier: () => reviewedCliPath,
      })
    ).rejects.toThrow(
      'Remote database commands require exactly one reviewed target marker'
    );
  });

  it('keeps database help read-only and rejects target arguments on help commands', async () => {
    const spawn = vi.fn(() => ({ error: undefined, status: 0 }));
    const targetVerifier = vi.fn();
    const rootCertificateVerifier = vi.fn();
    const environment = { PATH: 'reviewed-path' };

    expect(
      await runReviewedSupabaseCli({
        args: ['db', 'push', '--help'],
        environment,
        spawn,
        executableVerifier: () => reviewedCliPath,
        targetVerifier,
        rootCertificateVerifier,
      })
    ).toBe(0);
    expect(spawn).toHaveBeenCalledWith(
      reviewedCliPath,
      ['db', 'push', '--help'],
      expect.objectContaining({ env: environment })
    );
    expect(targetVerifier).not.toHaveBeenCalled();
    expect(rootCertificateVerifier).not.toHaveBeenCalled();

    await expect(
      runReviewedSupabaseCli({
        args: ['db', 'push', '--help', REVIEWED_TARGET_FLAG],
        executableVerifier: () => reviewedCliPath,
      })
    ).rejects.toThrow('Reviewed target marker is not valid for this command');
    await expect(
      runReviewedSupabaseCli({
        args: ['db', 'push', '--help', '--linked'],
        executableVerifier: () => reviewedCliPath,
      })
    ).rejects.toThrow(
      'Native Supabase CLI database target selectors are not permitted'
    );
  });

  it('does not spawn when repeated target or certificate proof fails', async () => {
    const spawn = vi.fn();
    const environment = {
      SUPABASE_DB_URL: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
    };

    await expect(
      runReviewedSupabaseCli({
        args: ['migration', 'list', REVIEWED_TARGET_FLAG],
        environment,
        spawn,
        executableVerifier: () => reviewedCliPath,
        targetVerifier: async () => {
          throw new Error('Supabase target binding verification failed');
        },
      })
    ).rejects.toThrow('Supabase target binding verification failed');
    expect(spawn).not.toHaveBeenCalled();

    await expect(
      runReviewedSupabaseCli({
        args: ['migration', 'list', REVIEWED_TARGET_FLAG],
        environment,
        spawn,
        executableVerifier: () => reviewedCliPath,
        targetVerifier: async () => true,
        rootCertificateVerifier: () => {
          throw new Error('Supabase SSL root certificate verification failed');
        },
      })
    ).rejects.toThrow('Supabase SSL root certificate verification failed');
    expect(spawn).not.toHaveBeenCalled();
  });

  it('preserves a nonzero CLI exit status and rejects an empty command', async () => {
    expect(
      await runReviewedSupabaseCli({
        args: ['projects', 'list'],
        spawn: () => ({ error: undefined, status: 17 }),
        executableVerifier: () => reviewedCliPath,
      })
    ).toBe(17);

    await expect(
      runReviewedSupabaseCli({
        args: [],
        executableVerifier: () => reviewedCliPath,
      })
    ).rejects.toThrow('A valid Supabase CLI command is required');
  });
});
