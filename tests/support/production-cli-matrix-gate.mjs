import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MATRIX_ADMISSION_ENV = 'STORY_2215_CLI_MATRIX_ADMISSION';
export const MATRIX_REQUIRED_ENV = 'REQUIRE_STORY_2215_CLI_MATRIX';
export const MATRIX_REQUIRED_FLAG = '--required';

export function parseRequiredMatrixGateArgs(args) {
  if (
    !Array.isArray(args) ||
    args.length !== 1 ||
    args[0] !== MATRIX_REQUIRED_FLAG
  )
    throw new Error('CLI matrix gate requires --required');
  return Object.freeze({ required: true });
}

export function requireMatrixAdmission(env = process.env) {
  if (env?.[MATRIX_REQUIRED_ENV] !== 'true') return;
  if (
    typeof env[MATRIX_ADMISSION_ENV] !== 'string' ||
    !path.isAbsolute(env[MATRIX_ADMISSION_ENV])
  )
    throw new Error('CLI matrix required gate is missing its admission file');
}

export function requireCompletedMatrixCases({ required, completed, expected }) {
  if (!required) return;
  const actual = [...new Set(completed ?? [])].sort();
  const requiredCases = [...new Set(expected ?? [])].sort();
  if (
    actual.length !== requiredCases.length ||
    actual.some((caseName, index) => caseName !== requiredCases[index])
  )
    throw new Error('CLI matrix required gate did not complete every case');
}

function fail(message) {
  process.stderr.write(message + '\n');
  process.exitCode = 1;
}

function main() {
  try {
    parseRequiredMatrixGateArgs(process.argv.slice(2));
    if (process.platform !== 'win32')
      throw new Error(
        'CLI matrix required gate requires Windows PowerShell 5.1'
      );
    const stdin = readFileSync(0, 'utf8');
    if (!stdin.trim())
      throw new Error('CLI matrix required gate requires stdin context');
    const supportDirectory = path.dirname(fileURLToPath(import.meta.url));
    const helper = path.join(
      supportDirectory,
      'prepare-production-cli-matrix-admission.ps1'
    );
    const windowsPowerShell = path.join(
      process.env.WINDIR ?? 'C:\\Windows',
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'powershell.exe'
    );
    const prepared = spawnSync(
      windowsPowerShell,
      ['-NoProfile', '-NonInteractive', '-File', helper],
      {
        input: stdin,
        encoding: 'utf8',
        windowsHide: true,
        shell: false,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      }
    );
    if (prepared.error || prepared.status !== 0)
      throw new Error('CLI matrix admission preparation failed');
    const status = JSON.parse(prepared.stdout);
    if (status?.prepared !== true || !path.isAbsolute(status.admissionPath))
      throw new Error(
        'CLI matrix admission preparation returned an invalid result'
      );
    const admission = JSON.parse(readFileSync(status.admissionPath, 'utf8'));
    if (
      !admission?.sourceOptions?.workspace ||
      !path.isAbsolute(admission.sourceOptions.workspace)
    )
      throw new Error('CLI matrix admission has an invalid source workspace');
    const command =
      process.env.ComSpec ??
      path.join(process.env.WINDIR ?? 'C:\\Windows', 'System32', 'cmd.exe');
    const test = spawnSync(
      command,
      [
        '/d',
        '/s',
        '/c',
        'npx vitest run tests/integration/epic-22/story-22.15/production-cli-matrix.test.ts',
      ],
      {
        stdio: 'inherit',
        windowsHide: true,
        shell: false,
        cwd: admission.sourceOptions.workspace,
        env: {
          ...process.env,
          [MATRIX_REQUIRED_ENV]: 'true',
          [MATRIX_ADMISSION_ENV]: status.admissionPath,
        },
      }
    );
    if (test.error || test.status !== 0)
      throw new Error('CLI matrix required gate failed');
  } catch (error) {
    fail(
      error instanceof Error ? error.message : 'CLI matrix required gate failed'
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url.startsWith('file:') &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
