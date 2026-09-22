import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const cases = [
  'external-package-digest-mismatch', 'omitted-closure-file', 'duplicate-closure-file',
  'changed-package-file', 'installer-does-not-spawn-cli', 'existing-installation-not-overwritten',
  'runtime-arguments-refused-before-cli', 'runtime-file-write-blocked', 'cli-file-replacement-blocked',
  'worker-file-write-blocked', 'dependency-file-replacement-blocked', 'installation-directory-replacement-blocked',
  'real-reviewed-wrapper-version-handshake', 'ambient-loader-and-target-settings-stripped',
  'completed-host-releases-lease', 'preexisting-writer-refused-before-cli',
  'tampered-module-refused-before-cli', 'copied-launcher-refused',
  'wrong-nonce', 'extra-packet-field', 'apply-operation', 'malformed-packet',
  'failed-cli-refused-and-lease-released', 'timed-out-cli-descendant-contained',
  'oversized-manifest-refused', 'unexpected-directory-refused-before-cli',
];

// Real Windows ACLs, image loading, inherited pipes and Job Objects. These
// explicit platform skips in Linux CI cannot substitute for Windows evidence.
describe.skipIf(process.platform !== 'win32')('protected toolchain installation and launch', () => {
  let receipt: { cases: { name: string; passed: boolean }[]; hostedAccess: boolean; privateInputsLoaded: boolean };
  beforeAll(() => {
    const windows = process.env.SystemRoot ?? process.env.SYSTEMROOT;
    if (!windows) throw new Error('Windows runtime unavailable');
    const result = spawnSync(path.join(windows, 'System32/WindowsPowerShell/v1.0/powershell.exe'), [
      '-NoProfile', '-NonInteractive', '-File', path.resolve('tests/support/protected-bootstrap-fixture.ps1'),
      '-Workspace', path.resolve('.'), '-NodeExecutable', process.execPath,
    ], {
      encoding: 'utf8', timeout: 120_000, windowsHide: true, maxBuffer: 1024 * 1024,
      env: { SystemRoot: windows, WINDIR: windows, USERPROFILE: process.env.USERPROFILE,
        TEMP: process.env.TEMP, TMP: process.env.TMP,
        PSModulePath: path.join(windows, 'System32/WindowsPowerShell/v1.0/Modules') },
    });
    if (result.error || result.status !== 0) throw new Error(`Protected bootstrap fixture failed: ${result.stdout || result.stderr}`);
    receipt = JSON.parse(result.stdout.trim());
    expect(receipt.cases.map(c => c.name)).toEqual(cases);
    expect(receipt.hostedAccess).toBe(false);
    expect(receipt.privateInputsLoaded).toBe(false);
  }, 125_000);
  it.each(cases)('%s', name => expect(receipt.cases.find(c => c.name === name)?.passed).toBe(true));
});
