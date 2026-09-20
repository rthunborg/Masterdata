import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { beforeEach, describe, expect, it } from 'vitest';
import { preparePrivateForwardWorkspace, verifyPrivateForwardWorkspace } from '../../../../src/lib/release/launch-private-forward-workspace.mjs';

const digest = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const gitExecutable = process.platform === 'win32' ? 'C:/Program Files/Git/cmd/git.exe' : '/usr/bin/git';
const powershell = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
let options: { workspace: string; privateRoot: string; destination: string; commit: string; gitExecutable: string; expectedGitSha256: string; windowsPowerShellExecutable: string; expectedWindowsPowerShellSha256: string };
const aclSource = path.resolve('src/lib/release/private-forward-workspace.ps1');
const coordinatorSource = path.resolve('src/lib/release/private-forward-workspace.mjs');
const preparerSource = path.resolve('src/lib/release/prepare-forward-subset.mjs');
function git(...args: string[]) {
  const r = spawnSync(gitExecutable, ['-C', options.workspace, ...args], { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) throw new Error('fixture Git failed');
  return r.stdout.trim();
}
function setPrivateAcl(target: string) {
  if (process.platform !== 'win32') {
    fs.chmodSync(target, 0o700);
    return;
  }
  const script = "$p=[Console]::In.ReadToEnd();$u=[Security.Principal.WindowsIdentity]::GetCurrent().User;$a=New-Object Security.AccessControl.DirectorySecurity;$a.SetOwner($u);$a.SetAccessRuleProtection($true,$false);foreach($s in @($u.Value,'S-1-5-18','S-1-5-32-544')){$i=New-Object Security.Principal.SecurityIdentifier($s);$r=New-Object Security.AccessControl.FileSystemAccessRule($i,'FullControl','ContainerInherit,ObjectInherit','None','Allow');$a.AddAccessRule($r)};[IO.Directory]::SetAccessControl($p,$a)";
  const r = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], { input: target, encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) throw new Error('fixture ACL failed');
}
beforeEach(() => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-private-forward-source-'));
  const workspace = path.join(sourceRoot, 'source');
  const privateRoot = fs.mkdtempSync(path.join(os.homedir(), '.hr-private-forward-test-'));
  fs.mkdirSync(workspace); setPrivateAcl(privateRoot);
  options = { workspace, privateRoot, destination: path.join(privateRoot, 'attempt'), commit: '', gitExecutable, expectedGitSha256: digest(gitExecutable), windowsPowerShellExecutable: powershell, expectedWindowsPowerShellSha256: process.platform === 'win32' ? digest(powershell) : '' };
  git('init', '-q'); git('config', 'core.autocrlf', 'false');
  fs.mkdirSync(path.join(workspace, 'supabase/migrations'), { recursive: true });
  fs.mkdirSync(path.join(workspace, 'src/lib/release'), { recursive: true });
  fs.copyFileSync(aclSource, path.join(workspace, 'src/lib/release/private-forward-workspace.ps1'));
  fs.copyFileSync(coordinatorSource, path.join(workspace, 'src/lib/release/private-forward-workspace.mjs'));
  fs.copyFileSync(preparerSource, path.join(workspace, 'src/lib/release/prepare-forward-subset.mjs'));
  fs.writeFileSync(path.join(workspace, 'supabase/migrations/20260101000000_represented.sql'), 'SELECT 0;\n');
  fs.writeFileSync(path.join(workspace, 'supabase/migrations/20260102000000_forward.sql'), 'SELECT 1;\n');
  fs.writeFileSync(path.join(workspace, 'supabase/migration-baseline-manifest.json'), JSON.stringify({ schemaVersion: 1, reviewedSupabaseCliVersion: '2.115.0', repositoryMigrationCount: 2, classifications: { execute: ['20260102000000'], 'repair-after-catalog-proof': ['20260101000000'] }, environmentPlans: { production: { execute: 'classifications.execute', 'repair-after-catalog-proof': 'classifications.repair-after-catalog-proof' } } }));
  git('add', '.'); git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=NUL', 'commit', '-qm', 'fixture'); options.commit = git('rev-parse', 'HEAD');
});

function commitSourceMismatch(file: string, suffix: string) {
  fs.appendFileSync(path.join(options.workspace, file), suffix);
  git('add', file);
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=NUL', 'commit', '-qm', 'source mismatch');
  options.commit = git('rev-parse', 'HEAD');
}

describe('private forward preparation', { timeout: 60000 }, () => {
  it('creates a restricted byte-identical subset with no target material or execution authority', async () => {
    const receipt = await preparePrivateForwardWorkspace(options);
    expect(receipt).toMatchObject({ kind: 'private-forward-preparation', executable: false, privateMaterialAllowed: false, approvalAttested: false, targetBound: false });
    expect(fs.readdirSync(path.join(options.destination, 'supabase/migrations'))).toEqual(['20260102000000_forward.sql']);
    expect(fs.readFileSync(path.join(options.destination, 'supabase/migrations/20260102000000_forward.sql'), 'utf8')).toBe('SELECT 1;\n');
    expect(await verifyPrivateForwardWorkspace(options)).toEqual(receipt);
    await expect(preparePrivateForwardWorkspace(options)).rejects.toThrow();
  });
  it('rejects changed bytes and retains the failed attempt', async () => {
    await preparePrivateForwardWorkspace(options);
    const file = path.join(options.destination, 'supabase/migrations/20260102000000_forward.sql');
    fs.appendFileSync(file, 'SELECT 2;\n');
    await expect(verifyPrivateForwardWorkspace(options)).rejects.toThrow();
    expect(fs.existsSync(file)).toBe(true);
  });
  it('rejects extra target material and forged authority in the receipt', async () => {
    await preparePrivateForwardWorkspace(options);
    const file = path.join(options.destination, 'private-forward-subset.json');
    const value = JSON.parse(fs.readFileSync(file, 'utf8')); value.executable = true;
    fs.writeFileSync(file, JSON.stringify(value));
    await expect(verifyPrivateForwardWorkspace(options)).rejects.toThrow();
    value.executable = false; fs.writeFileSync(file, JSON.stringify(value));
    fs.mkdirSync(path.join(options.destination, 'supabase/.temp'));
    await expect(verifyPrivateForwardWorkspace(options)).rejects.toThrow();
  });
  it('rejects escaping the approved private parent', async () => {
    options.destination = path.join(options.workspace, 'attempt');
    await expect(preparePrivateForwardWorkspace(options)).rejects.toThrow();
    expect(fs.existsSync(options.destination)).toBe(false);
  });
  it.each([
    ['coordinator', 'src/lib/release/private-forward-workspace.mjs', '\n// fixture source mismatch\n'],
    ['preparer', 'src/lib/release/prepare-forward-subset.mjs', '\n// fixture source mismatch\n'],
    ['ACL helper', 'src/lib/release/private-forward-workspace.ps1', '\n# fixture source mismatch\n'],
  ])('rejects a source-pinned %s mismatch before materialization', async (_name, file, suffix) => {
    commitSourceMismatch(file, suffix);
    await expect(preparePrivateForwardWorkspace(options)).rejects.toThrow();
    expect(fs.existsSync(options.destination)).toBe(false);
  });
  it('rejects a directory link inside a prepared artifact', async () => {
    await preparePrivateForwardWorkspace(options);
    fs.symlinkSync(options.workspace, path.join(options.destination, 'linked-source'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(verifyPrivateForwardWorkspace(options)).rejects.toThrow();
    expect(fs.existsSync(options.workspace)).toBe(true);
  });
  it.each(['private-forward-workspace.mjs', 'prepare-forward-subset.mjs'])('authenticates %s before its top-level code can access a private path', async (name) => {
    const runtimeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-unverified-runtime-'));
    for (const file of ['private-forward-workspace.mjs', 'prepare-forward-subset.mjs', 'private-forward-workspace.ps1']) {
      fs.copyFileSync(path.resolve('src/lib/release', file), path.join(runtimeDirectory, file));
    }
    const marker = path.join(options.privateRoot, 'unverified-runtime-was-executed');
    fs.appendFileSync(path.join(runtimeDirectory, name), `\nimport { writeFileSync as maliciousWrite } from 'node:fs'; maliciousWrite(${JSON.stringify(marker)}, 'executed');\n`);
    await expect(preparePrivateForwardWorkspace({ ...options, runtimeDirectory })).rejects.toThrow('runtime authentication failed');
    expect(fs.existsSync(marker)).toBe(false);
    expect(fs.existsSync(options.destination)).toBe(false);
  });
  it('redacts a missing runtime path without touching the destination', async () => {
    await expect(preparePrivateForwardWorkspace({ ...options, runtimeDirectory: path.join(options.privateRoot, 'sensitive-missing-runtime') })).rejects.toThrow(/^Private forward runtime authentication failed$/);
    expect(fs.existsSync(options.destination)).toBe(false);
  });
  it('rejects a writable/readable-by-others private root before materialization', async () => {
    if (process.platform === 'win32') {
      const r = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', "$p=[Console]::In.ReadToEnd();$a=[IO.Directory]::GetAccessControl($p);$i=New-Object Security.Principal.SecurityIdentifier('S-1-1-0');$r=New-Object Security.AccessControl.FileSystemAccessRule($i,'Read','Allow');$a.AddAccessRule($r);[IO.Directory]::SetAccessControl($p,$a)"], { input: options.privateRoot, encoding: 'utf8', windowsHide: true });
      expect(r.status).toBe(0);
    } else fs.chmodSync(options.privateRoot, 0o755);
    await expect(preparePrivateForwardWorkspace(options)).rejects.toThrow(
      process.platform === 'win32' ? 'verification failed (access)' : 'verification failed (integrity)'
    );
    expect(fs.existsSync(options.destination)).toBe(false);
  });
  it('rejects a protected private root below an ancestor that grants untrusted deletion control', async () => {
    const unsafeParent = path.join(options.privateRoot, 'unsafe-ancestor');
    const protectedChild = path.join(unsafeParent, 'private');
    fs.mkdirSync(unsafeParent); fs.mkdirSync(protectedChild); setPrivateAcl(protectedChild);
    if (process.platform === 'win32') {
      const script = "$p=[Console]::In.ReadToEnd();$a=[IO.Directory]::GetAccessControl($p);$i=New-Object Security.Principal.SecurityIdentifier('S-1-1-0');$r=New-Object Security.AccessControl.FileSystemAccessRule($i,'DeleteSubdirectoriesAndFiles','None','None','Allow');$a.AddAccessRule($r);[IO.Directory]::SetAccessControl($p,$a)";
      const r = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], { input: unsafeParent, encoding: 'utf8', windowsHide: true });
      expect(r.status).toBe(0);
    } else fs.chmodSync(unsafeParent, 0o777);
    const unsafeOptions = { ...options, privateRoot: protectedChild, destination: path.join(protectedChild, 'attempt') };
    await expect(preparePrivateForwardWorkspace(unsafeOptions)).rejects.toThrow();
    expect(fs.existsSync(unsafeOptions.destination)).toBe(false);
  });
});
