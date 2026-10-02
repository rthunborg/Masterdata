import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const cases = [
  'untrusted-owner', 'untrusted-parent-delete-child',
  'untrusted-parent-change-permissions', 'untrusted-parent-write-attributes',
  'untrusted-parent-owner-change', 'sibling-creation-is-not-replacement',
  'protected-root-rejects-create-child', 'inherited-write-is-rejected',
  'deny-rule-does-not-hide-allow', 'null-dacl-is-rejected',
  'windows-servicing-owner-at-volume-root', 'windows-servicing-owner-not-general-exception',
  'hash-mismatch-rejected', 'escaped-path-rejected', 'preexisting-writer-rejected', 'file-write-blocked',
  'file-rename-blocked', 'file-delete-blocked', 'directory-rename-blocked',
  'executable-write-blocked-during-launch', 'module-replacement-blocked-before-import',
  'locked-node-and-module-launch-succeeds', 'dispose-releases-file-lock',
  'junction-is-rejected', 'hardlink-is-rejected', 'live-file-untrusted-write-is-rejected',
];

// These exercise Windows kernel sharing and Windows ACLs, not a portable mock.
// Linux CI skips this group explicitly; release evidence requires a Windows run.
describe.skipIf(process.platform !== 'win32')('native protected file lease', () => {
  let receipt: { cases: { name: string; passed: boolean }[]; hostedAccess: boolean };
  beforeAll(() => {
    const windows = process.env.SystemRoot ?? process.env.SYSTEMROOT;
    if (!windows) throw new Error('Windows runtime unavailable');
    const result = spawnSync(path.join(windows, 'System32/WindowsPowerShell/v1.0/powershell.exe'), [
      '-NoProfile', '-NonInteractive', '-File',
      path.resolve('tests/support/protected-file-lease-fixture.ps1'),
      '-SourceFile', path.resolve('src/lib/release/protected-file-lease.cs'),
      '-NodeExecutable', process.execPath,
    ], {
      encoding: 'utf8', timeout: 60_000, windowsHide: true, maxBuffer: 1024 * 1024,
      env: {
        SystemRoot: windows, WINDIR: windows,
        USERPROFILE: process.env.USERPROFILE,
        TEMP: process.env.TEMP, TMP: process.env.TMP,
        PSModulePath: path.join(windows, 'System32/WindowsPowerShell/v1.0/Modules'),
      },
    });
    if (result.error || result.status !== 0) {
      throw new Error(`Native file-lease fixture failed: ${result.stdout || result.stderr}`);
    }
    receipt = JSON.parse(result.stdout.trim());
    expect(receipt.cases.map(c => c.name)).toEqual(cases);
    expect(receipt.hostedAccess).toBe(false);
  }, 65_000);
  it.each(cases)('%s', name => {
    expect(receipt.cases.find(c => c.name === name)?.passed).toBe(true);
  });
});
