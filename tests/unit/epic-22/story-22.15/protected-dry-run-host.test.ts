import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const cases = [
  'valid-exact-production-dry-run-only',
  'version-and-exact-dry-run-arguments-only',
  'launcher-arguments-refused-before-cli',
  'ambient-environment-stripped',
  'wrong-order-cli-output-refused',
  'extra-cli-output-refused',
  'missing-cli-output-refused',
  'nonzero-cli-refused',
  'timed-out-cli-refused',
  'tampered-immutable-worker-refused-before-cli',
  'preexisting-writer-refused-before-cli',
  'independent-link-hash-refused-before-cli',
  'independent-link-value-mismatch-refused-before-cli',
  'direct-worker-and-unsigned-packet-refused-before-cli',
  'actual-installer-materializes-synthetic-package-without-launch',
  'package-plan-mismatch-refused-with-matching-external-digest',
  'package-extra-file-refused-with-matching-external-digest',
];

// The host is compiled from the reviewed source bytes with a generated
// synthetic input root, signing key, certificate marker, project ref and fake
// CLI. It never loads the private production-input root or makes a network call.
describe.skipIf(process.platform !== 'win32')('protected production dry-run host', () => {
  let receipt: { cases: { name: string; passed: boolean }[]; syntheticOnly: boolean; hostedAccess: boolean; privateInputsLoaded: boolean };

  beforeAll(() => {
    const windows = process.env.SystemRoot ?? process.env.SYSTEMROOT;
    if (!windows) throw new Error('Windows runtime unavailable');
    const result = spawnSync(path.join(windows, 'System32/WindowsPowerShell/v1.0/powershell.exe'), [
      '-NoProfile', '-NonInteractive', '-File', path.resolve('tests/support/protected-dry-run-fixture.ps1'),
      '-Workspace', path.resolve('.'), '-NodeExecutable', process.execPath,
    ], {
      encoding: 'utf8', timeout: 125_000, windowsHide: true, maxBuffer: 1024 * 1024,
      env: { SystemRoot: windows, WINDIR: windows, USERPROFILE: process.env.USERPROFILE,
        TEMP: process.env.TEMP, TMP: process.env.TMP,
        PSModulePath: path.join(windows, 'System32/WindowsPowerShell/v1.0/Modules') },
    });
    if (result.error || result.status !== 0) {
      throw new Error(`Protected dry-run fixture failed: ${result.stdout || result.stderr}`);
    }
    receipt = JSON.parse(result.stdout.trim());
    expect(receipt.cases.map(entry => entry.name)).toEqual(cases);
    expect(receipt.syntheticOnly).toBe(true);
    expect(receipt.hostedAccess).toBe(false);
    expect(receipt.privateInputsLoaded).toBe(false);
  }, 130_000);

  it.each(cases)('%s', name => {
    expect(receipt.cases.find(entry => entry.name === name)?.passed).toBe(true);
  });
});
