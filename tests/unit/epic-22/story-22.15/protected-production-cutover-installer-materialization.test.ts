import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

import {
  PROTECTED_PRODUCTION_CUTOVER_PACKAGE_FIXED_FILE_PATHS,
  prepareProtectedProductionCutoverPackage,
} from '../../../../src/lib/release/prepare-protected-production-cutover-package.mjs';

const repositoryRoot = path.resolve('.');
const gitExecutable = 'C:/Program Files/Git/cmd/git.exe';
const powerShell = path.join(
  process.env.WINDIR ?? 'C:/Windows',
  'System32/WindowsPowerShell/v1.0/powershell.exe'
);
const temporaryRoots: string[] = [];
const installedRoots: { root: string; cleanupScript: string }[] = [];
const sha256 = (bytes: Buffer | string) =>
  createHash('sha256').update(bytes).digest('hex');

function git(workspace: string, ...args: string[]) {
  const result = spawnSync(gitExecutable, ['-C', workspace, ...args], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error('synthetic installer fixture Git failed');
  return result.stdout.trim();
}

function copyRawGitSource(relative: string, destinationRoot: string) {
  const destination = path.join(destinationRoot, relative);
  mkdirSync(path.dirname(destination), { recursive: true });
  const bytes = readFileSync(path.join(repositoryRoot, relative));
  // Only source files are normalized to their raw Git LF representation. The
  // installed PapaParse dependency bytes remain byte-for-byte unchanged.
  writeFileSync(
    destination,
    relative.startsWith('node_modules/')
      ? bytes
      : Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'), 'utf8')
  );
}

function cleanSyntheticSource(root: string) {
  const workspace = path.join(root, 'source');
  mkdirSync(workspace);
  git(workspace, 'init', '-q');
  git(workspace, 'config', 'core.autocrlf', 'false');
  for (const relative of [
    'supabase/migration-baseline-manifest.json',
    'pnpm-lock.yaml',
    'node_modules/papaparse/package.json',
    'node_modules/papaparse/papaparse.js',
    'src/lib/release/protected-bootstrap-worker.mjs',
    ...PROTECTED_PRODUCTION_CUTOVER_PACKAGE_FIXED_FILE_PATHS.filter(
      (file) => !file.startsWith('runtime/')
    ),
  ]) {
    copyRawGitSource(relative, workspace);
  }
  for (const entry of readdirSync(path.join(repositoryRoot, 'supabase/migrations'))) {
    copyRawGitSource(path.posix.join('supabase/migrations', entry), workspace);
  }
  git(workspace, 'add', '-f', '.');
  git(
    workspace,
    '-c', 'user.name=Fixture',
    '-c', 'user.email=fixture@example.invalid',
    '-c', 'core.hooksPath=NUL',
    'commit', '-qm', 'synthetic installer fixture'
  );
  return { workspace, commit: git(workspace, 'rev-parse', 'HEAD') };
}

function assertTestOwnedRoot(root: string, packageSha256?: string) {
  const profile = path.resolve(process.env.USERPROFILE ?? '');
  const candidate = path.resolve(root);
  const expectedPrefix = path.join(profile, '.hr-masterdata-toolchain-cutover-');
  if (
    !profile ||
    !candidate.startsWith(expectedPrefix) ||
    path.dirname(candidate) !== profile ||
    !/^\.hr-masterdata-toolchain-cutover-[a-f0-9]{64}$/u.test(
      path.basename(candidate)
    ) ||
    (packageSha256 && candidate !== path.join(profile, `.hr-masterdata-toolchain-cutover-${packageSha256}`))
  ) {
    throw new Error('installer cleanup target refused');
  }
}

function clearAndRemoveTestOwnedInstall(root: string, cleanupScript: string) {
  assertTestOwnedRoot(root);
  if (!existsSync(root)) return;
  const cleanup = spawnSync(
    powerShell,
    [
      '-NoProfile', '-NonInteractive', '-File', cleanupScript,
      root,
    ],
    { encoding: 'utf8', windowsHide: true, timeout: 30_000 }
  );
  if (cleanup.error || cleanup.status !== 0 || existsSync(root)) {
    throw new Error('test-owned installer cleanup failed');
  }
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'hr-cutover-installer-materialization-'));
  temporaryRoots.push(root);
  const source = cleanSyntheticSource(root);
  const runtimeRoot = path.join(root, 'runtime');
  mkdirSync(runtimeRoot);
  const nodeExecutable = path.join(runtimeRoot, 'node.exe');
  const supabaseExecutable = path.join(runtimeRoot, 'supabase.exe');
  writeFileSync(nodeExecutable, 'synthetic node runtime bytes\n');
  writeFileSync(supabaseExecutable, 'synthetic supabase runtime bytes\n');
  const packageDirectory = path.join(root, 'package');
  const packageResult = prepareProtectedProductionCutoverPackage({
    ...source,
    gitExecutable,
    expectedGitSha256: sha256(readFileSync(gitExecutable)),
    outputDirectory: packageDirectory,
    nodeExecutable,
    expectedNodeSha256: sha256(readFileSync(nodeExecutable)),
    supabaseExecutable,
    expectedSupabaseSha256: sha256(readFileSync(supabaseExecutable)),
  });
  const evidenceRoot = path.join(root, 'evidence');
  mkdirSync(evidenceRoot);
  const makeEvidence = (name: string) => {
    const file = path.join(evidenceRoot, name);
    writeFileSync(file, JSON.stringify({ synthetic: true, name }) + '\n');
    return { path: file, sha256: sha256(readFileSync(file)) };
  };
  const linkPath = path.join(root, 'production-link.txt');
  writeFileSync(linkPath, 'synthetic-production-link\n');
  return {
    root,
    packageDirectory,
    packageResult,
    link: { path: linkPath, sha256: sha256(readFileSync(linkPath)) },
    staffing: makeEvidence('staffing.json'),
    isolation: makeEvidence('isolation.json'),
    preForward: makeEvidence('pre-forward.json'),
    backup: makeEvidence('backup.json'),
    cleanup: makeEvidence('cleanup.json'),
  };
}

function installerArguments(options: ReturnType<typeof fixture>, staffingSha256 = options.staffing.sha256) {
  return [
    '-NoProfile', '-NonInteractive', '-File',
    path.join(repositoryRoot, 'src/lib/release/install-protected-production-cutover.ps1'),
    '-PackageDirectory', options.packageDirectory,
    '-ExpectedPackageSha256', options.packageResult.packageSha256,
    '-ApprovedProductionLinkPath', options.link.path,
    '-ExpectedProductionLinkSha256', options.link.sha256,
    '-StaffingReceiptPath', options.staffing.path,
    '-ExpectedStaffingReceiptSha256', staffingSha256,
    '-IsolationReceiptPath', options.isolation.path,
    '-ExpectedIsolationReceiptSha256', options.isolation.sha256,
    '-PreForwardReceiptPath', options.preForward.path,
    '-ExpectedPreForwardReceiptSha256', options.preForward.sha256,
    '-BackupRecordPath', options.backup.path,
    '-ExpectedBackupRecordSha256', options.backup.sha256,
    '-CleanupRecordPath', options.cleanup.path,
    '-ExpectedCleanupRecordSha256', options.cleanup.sha256,
    '-TargetBindingSha256', 'e'.repeat(64),
  ];
}

function runInstaller(args: string[]) {
  const result = spawnSync(powerShell, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 90_000,
  });
  if (result.error) throw result.error;
  return {
    status: result.status,
    receipt: JSON.parse(result.stdout.trim()),
  };
}

afterEach(() => {
  for (const { root, cleanupScript } of installedRoots.splice(0)) {
    clearAndRemoveTestOwnedInstall(root, cleanupScript);
  }
  for (const root of temporaryRoots.splice(0)) {
    if (!path.resolve(root).startsWith(path.join(path.resolve(tmpdir()), 'hr-cutover-installer-materialization-'))) {
      throw new Error('fixture cleanup target refused');
    }
    rmSync(root, { recursive: true, force: true });
  }
});

describe.skipIf(process.platform !== 'win32')(
  'Story 22.15 protected production cutover native installer materialization',
  () => {
    it('materializes the actual installer from a source-pinned synthetic package without launching it', () => {
      const options = fixture();
      const installRoot = path.join(
        path.resolve(process.env.USERPROFILE ?? ''),
        `.hr-masterdata-toolchain-cutover-${options.packageResult.packageSha256}`
      );
      assertTestOwnedRoot(installRoot, options.packageResult.packageSha256);
      expect(existsSync(installRoot)).toBe(false);
      const cleanupScript = path.join(options.root, 'remove-test-install.ps1');
      writeFileSync(
        cleanupScript,
        "param([Parameter(Mandatory=$true)][string]$Root)\n$ErrorActionPreference='Stop'\nGet-ChildItem -LiteralPath $Root -Force -Recurse | ForEach-Object { $_.Attributes = $_.Attributes -band (-bnot [IO.FileAttributes]::ReadOnly) }\nRemove-Item -LiteralPath $Root -Force -Recurse\n"
      );

      const rejected = runInstaller(
        installerArguments(options, '0'.repeat(64))
      );
      expect(rejected.status).toBe(1);
      expect(rejected.receipt).toMatchObject({
        installed: false,
        stage: 'package-validation',
        hostedAccess: false,
        privateInputsLoaded: false,
      });
      expect(existsSync(installRoot)).toBe(false);

      const installed = runInstaller(installerArguments(options));
      expect(installed.status).toBe(0);
      expect(installed.receipt).toMatchObject({
        installed: true,
        packageSha256: options.packageResult.packageSha256,
        hostedAccess: false,
        privateInputsLoaded: false,
      });
      installedRoots.push({ root: installRoot, cleanupScript });
      expect(existsSync(path.join(installRoot, 'production-cutover.exe'))).toBe(true);
      expect(existsSync(path.join(installRoot, 'bootstrap-origin.json'))).toBe(true);
      expect(readFileSync(path.join(installRoot, 'toolchain-package.json'))).toEqual(
        readFileSync(path.join(options.packageDirectory, 'toolchain-package.json'))
      );

      const aclScript = path.join(options.root, 'inspect-test-install-acl.ps1');
      writeFileSync(
        aclScript,
        "param([Parameter(Mandatory=$true)][string]$Root)\n$ErrorActionPreference='Stop'\n$acl=[IO.Directory]::GetAccessControl($Root)\nif($null -eq $acl -or -not $acl.AreAccessRulesProtected){throw 'acl-protection'}\n$current=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value\n$trusted=@($current,'S-1-5-18','S-1-5-32-544')\n$owner=([Security.Principal.SecurityIdentifier]$acl.GetOwner([Security.Principal.SecurityIdentifier])).Value\nif($owner -notin $trusted){throw 'acl-owner'}\n$rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))\nif($rules.Count -lt 3 -or @($rules|Where-Object { $_.IdentityReference.Value -notin $trusted -or $_.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or ($_.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -ne [Security.AccessControl.FileSystemRights]::FullControl }).Count -ne 0){throw 'acl-rules'}\n[ordered]@{protected=$acl.AreAccessRulesProtected;ownerTrusted=$true;ruleCount=$rules.Count}|ConvertTo-Json -Compress\n"
      );
      const acl = spawnSync(
        powerShell,
        ['-NoProfile', '-NonInteractive', '-File', aclScript, installRoot],
        { encoding: 'utf8', windowsHide: true, timeout: 30_000 }
      );
      expect(acl.error).toBeUndefined();
      expect(acl.status).toBe(0);
      const aclInventory = JSON.parse(acl.stdout.trim());
      expect(aclInventory).toMatchObject({ protected: true, ownerTrusted: true });
      expect(aclInventory.ruleCount).toBeGreaterThanOrEqual(3);
      // The regression only creates and inspects the binary. It never starts
      // it, so no encrypted inputs, private link, database, or hosted target
      // can be loaded or reached.
      expect(installed.receipt).not.toHaveProperty('launcherInvoked', true);
    }, 180_000);
  }
);
