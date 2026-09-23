import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MATRIX_ADMISSION_ENV,
  MATRIX_REQUIRED_ENV,
  MATRIX_REQUIRED_FLAG,
  parseRequiredMatrixGateArgs,
  requireCompletedMatrixCases,
  requireMatrixAdmission,
} from '../../../support/production-cli-matrix-gate.mjs';

describe('required local CLI matrix gate', () => {
  it('accepts only the explicit required flag', () => {
    expect(parseRequiredMatrixGateArgs([MATRIX_REQUIRED_FLAG])).toEqual({
      required: true,
    });
    for (const args of [[], ['--optional'], [MATRIX_REQUIRED_FLAG, '--extra']])
      expect(() => parseRequiredMatrixGateArgs(args)).toThrow(
        'CLI matrix gate requires --required'
      );
  });

  it('keeps an unmanaged normal-suite invocation skippable', () => {
    expect(() => requireMatrixAdmission({})).not.toThrow();
  });

  it('fails a required invocation when no absolute admission file is supplied', () => {
    for (const admission of [undefined, '', 'relative/matrix-admission.json'])
      expect(() =>
        requireMatrixAdmission({
          [MATRIX_REQUIRED_ENV]: 'true',
          ...(admission === undefined
            ? {}
            : { [MATRIX_ADMISSION_ENV]: admission }),
        })
      ).toThrow('CLI matrix required gate is missing its admission file');
  });

  it('permits only a required invocation with an absolute admission path', () => {
    expect(() =>
      requireMatrixAdmission({
        [MATRIX_REQUIRED_ENV]: 'true',
        [MATRIX_ADMISSION_ENV]: 'C:\\matrix\\matrix-admission.json',
      })
    ).not.toThrow();
  });

  it('requires all matrix cases to complete only for the required gate', () => {
    const cases = ['first', 'second'];
    expect(() =>
      requireCompletedMatrixCases({
        required: true,
        completed: cases,
        expected: cases,
      })
    ).not.toThrow();
    expect(() =>
      requireCompletedMatrixCases({
        required: true,
        completed: ['first'],
        expected: cases,
      })
    ).toThrow('CLI matrix required gate did not complete every case');
    expect(() =>
      requireCompletedMatrixCases({
        required: false,
        completed: ['first'],
        expected: cases,
      })
    ).not.toThrow();
  });
});

describe('PowerShell 5.1 admission input validation', () => {
  const helper = path.resolve(
    'tests/support/prepare-production-cli-matrix-admission.ps1'
  );
  const powershell = path.join(
    process.env.WINDIR ?? 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe'
  );

  function fixture() {
    const root = mkdtempSync(path.join(os.tmpdir(), 'cli-matrix-admission-'));
    const file = (name: string) => {
      const target = path.join(root, name);
      writeFileSync(target, name, 'utf8');
      return target;
    };
    const tool = (name: string) => {
      const executablePath = file(name);
      return {
        executablePath,
        sha256: createHash('sha256').update(name).digest('hex'),
      };
    };
    return {
      root,
      context: {
        schemaVersion: 1,
        resourceGuardContext: {
          schemaVersion: 1,
          sessionId: '00000000-0000-0000-0000-000000000001',
          agentId: null,
        },
        resourceId: '00000000-0000-0000-0000-000000000002',
        database: { port: 27442, password: 'a'.repeat(32) },
        source: {
          workspace: root,
          commit: 'b'.repeat(40),
          gitExecutable: file('git.exe'),
          expectedGitSha256: createHash('sha256')
            .update('git.exe')
            .digest('hex'),
        },
        tools: { cli: tool('cli.exe'), psql: tool('psql.exe') },
        composeRecipePath: file('compose.yaml'),
        guardExecutable: file('resource-guard.ps1'),
        dockerExecutable: file('docker.exe'),
        outputDirectory: root,
      },
    };
  }

  function validate(context: object) {
    return spawnSync(
      powershell,
      ['-NoProfile', '-NonInteractive', '-File', helper, '-ValidateInputOnly'],
      {
        input: JSON.stringify(context),
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000,
      }
    );
  }

  it('accepts a null trusted agent id and Windows absolute paths before guard access', () => {
    const { root, context } = fixture();
    try {
      const result = validate(context);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(JSON.parse(result.stdout)).toEqual({ validated: true });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each(['relative-workspace', '\\drive-relative-workspace'])(
    'rejects a non-drive-qualified source path before attempting guard access: %s',
    (workspace) => {
      const { root, context } = fixture();
      try {
        context.source.workspace = workspace;
        const result = validate(context);
        expect(result.status).toBe(1);
        expect(result.stdout).toBe('');
        expect(result.stderr).toContain(
          'CLI matrix admission preparation failed'
        );
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  );
});
