import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const cases = [
  'untrusted-owner-descriptor-rejected', 'valid-synthetic-current-user-dpapi-and-acl-load',
  'tampered-blob-rejected', 'wrong-record-hash-rejected', 'wrong-record-schema-rejected',
  'extra-record-field-rejected', 'duplicate-record-key-rejected', 'extra-payload-field-rejected',
  'duplicate-payload-key-rejected', 'wrong-environment-rejected', 'wrong-mode-rejected',
  'wrong-certificate-path-rejected', 'wrong-certificate-hash-rejected',
  'untrusted-ancestor-writable-rejected', 'reparse-input-directory-rejected',
  'writer-held-before-lease-rejected', 'lease-blocks-writer-until-dispose',
];

// This fixture creates only a synthetic CurrentUser-DPAPI payload under a
// disposable fixture root. It never touches the real private input location.
describe.skipIf(process.platform !== 'win32')('protected production inputs', () => {
  let receipt: { cases: { name: string; passed: boolean }[]; syntheticOnly: boolean; hostedAccess: boolean; privateInputsLoaded: boolean };

  beforeAll(() => {
    const windows = process.env.SystemRoot ?? process.env.SYSTEMROOT;
    if (!windows) throw new Error('Windows runtime unavailable');
    const result = spawnSync(path.join(windows, 'System32/WindowsPowerShell/v1.0/powershell.exe'), [
      '-NoProfile', '-NonInteractive', '-File', path.resolve('tests/support/protected-production-inputs-fixture.ps1'),
      '-Workspace', path.resolve('.'),
    ], {
      encoding: 'utf8', timeout: 120_000, windowsHide: true, maxBuffer: 1024 * 1024,
      env: { SystemRoot: windows, WINDIR: windows, USERPROFILE: process.env.USERPROFILE,
        TEMP: process.env.TEMP, TMP: process.env.TMP,
        PSModulePath: path.join(windows, 'System32/WindowsPowerShell/v1.0/Modules') },
    });
    if (result.error || result.status !== 0) throw new Error(`Protected production-input fixture failed: ${result.stdout || result.stderr}`);
    receipt = JSON.parse(result.stdout.trim());
    expect(receipt.cases.map((entry) => entry.name)).toEqual(cases);
    expect(receipt.syntheticOnly).toBe(true);
    expect(receipt.hostedAccess).toBe(false);
    expect(receipt.privateInputsLoaded).toBe(false);
  }, 125_000);

  it.each(cases)('%s', (name) => {
    expect(receipt.cases.find((entry) => entry.name === name)?.passed).toBe(true);
  });
});
