import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createValidManagedIsolationEvidenceFixture,
  rebindManagedIsolationEvidenceFixture,
} from '../../../support/production-isolation-evidence-fixture.mjs';
import { PRODUCTION_OBSERVED_PROFILE_BASELINE, PRODUCTION_OBSERVED_PROFILE_SOURCE_SHA, productionTargetBindingSha256 } from '../../../../src/lib/release/production-observed-profile.mjs';
import { PRODUCTION_STAFFING_PRE_EXECUTE_GRANTEES, PRODUCTION_STAFFING_PRE_EXECUTE_INPUT_ARGUMENTS, PRODUCTION_STAFFING_PRE_EXECUTE_OUTPUT_ARGUMENTS, PRODUCTION_STAFFING_PRE_EXECUTE_RETURN_SHAPE, PRODUCTION_STAFFING_PRE_EXECUTE_SIGNATURE } from '../../../../src/lib/release/production-staffing-pre-execute-contract.mjs';
import { PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS } from '../../../../src/lib/release/production-bootstrap-admission.mjs';

const repository = path.resolve('.');
const windowsPowerShell = path.join(process.env.WINDIR ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
const roots: string[] = [];
const ownedRoots = new Set<string>();
const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex');
const gitBlob = (value: Buffer) => createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${value.length}\0`), value])).digest('hex');
const sourceSha = 'a'.repeat(40);
const sourceTree = 'b'.repeat(40);
const sourceManifestSha256 = 'c'.repeat(64);
const projectRef = 'abcdefghijklmnopqrst';
const targetBindingSha256 = productionTargetBindingSha256(projectRef);
const SYNTHETIC_EVIDENCE_BACKDATE_MS = 60_000;
const SYNTHETIC_EVIDENCE_MAX_AGE_MS = 15 * 60 * 1000;

function mintFixtureCapturedAtUtc(clock: () => number = Date.now) {
  const now = clock();
  if (!Number.isSafeInteger(now)) throw new Error('synthetic fixture clock is invalid');
  return new Date(now - SYNTHETIC_EVIDENCE_BACKDATE_MS).toISOString();
}

function own(root: string) {
  const resolved = path.resolve(root);
  roots.push(resolved);
  ownedRoots.add(resolved);
  return resolved;
}

function registerMarkedWorkRoot(marker: string) {
  if (!existsSync(marker)) return null;
  const markerStat = lstatSync(marker);
  if (!markerStat.isFile() || markerStat.isSymbolicLink()) throw new Error('refusing an untrusted work-root marker');
  const profile = path.resolve(process.env.USERPROFILE ?? '');
  const marked = readFileSync(marker, 'utf8').trim();
  const resolved = path.resolve(marked);
  if (!path.isAbsolute(marked) || !/^\.hr-masterdata-cutover-[a-f0-9]{32}$/u.test(path.relative(profile, resolved))) {
    throw new Error('refusing a work root outside the exact synthetic host namespace');
  }
  const rootStat = lstatSync(resolved);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('refusing an untrusted work-root directory');
  return own(resolved);
}

function copy(root: string, relative: string) {
  const destination = path.join(root, relative);
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(path.join(repository, relative), destination);
}

function staffingReceipt(receiptCapturedAtUtc: string) {
  return {
    schemaVersion: 1, kind: 'production-staffing-pre-execute-observation', environment: 'production', sourceSha, sourceTree, sourceManifestSha256, targetBindingSha256, reconciliationExecuteVersion: '20260930091123', collectionStartedAtUtc: receiptCapturedAtUtc, capturedAtUtc: receiptCapturedAtUtc,
    routine: { signature: PRODUCTION_STAFFING_PRE_EXECUTE_SIGNATURE, exactOverloadCount: 1, owner: 'postgres', language: 'plpgsql', kind: 'function', securityDefiner: false, config: null, nonOwnerExecuteGrantees: [...PRODUCTION_STAFFING_PRE_EXECUTE_GRANTEES], nonOwnerExecuteGrantOptions: false, nonExecuteAclPrivileges: false, returnShape: PRODUCTION_STAFFING_PRE_EXECUTE_RETURN_SHAPE, inputArguments: PRODUCTION_STAFFING_PRE_EXECUTE_INPUT_ARGUMENTS.map((value) => ({ ...value })), outputArguments: PRODUCTION_STAFFING_PRE_EXECUTE_OUTPUT_ARGUMENTS.map((value) => ({ ...value })), volatility: 'volatile', parallel: 'unsafe', strict: false, leakproof: false },
    dependencies: {
      staffingNeedsColumns: [{ name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' }, { name: 'location', type: 'text', nullable: false, default: null }, { name: 'headcount_need', type: 'integer', nullable: false, default: '0' }, { name: 'updated_at', type: 'timestamp with time zone', nullable: false, default: 'now()' }, { name: 'updated_by', type: 'uuid', nullable: true, default: null }],
      staffingChangelogColumns: [{ name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' }, { name: 'location', type: 'text', nullable: false, default: null }, { name: 'old_value', type: 'integer', nullable: false, default: null }, { name: 'new_value', type: 'integer', nullable: false, default: null }, { name: 'changed_by', type: 'uuid', nullable: false, default: null }, { name: 'changed_at', type: 'timestamp with time zone', nullable: false, default: 'now()' }],
      staffingNeedsPrimaryKey: true, staffingNeedsLocationUnique: true, staffingNeedsLocationCheck: true, staffingNeedsHeadcountCheck: true, staffingNeedsUpdatedByUsersForeignKey: true,
      staffingNeedsUpdatedByUsersForeignKeyProfile: { foreignKeyCount: 1, name: 'staffing_needs_updated_by_fkey', sourceColumn: 'updated_by', referencedSchema: 'public', referencedTable: 'users', referencedColumn: 'id', onDelete: 'NO ACTION', onUpdate: 'NO ACTION', matchType: 'SIMPLE', validated: true, deferrable: false, initiallyDeferred: false },
      staffingChangelogPrimaryKey: true, staffingChangelogChangedByUsersForeignKey: true, bothTablesRlsEnabled: true, outOfRangeHeadcountCount: 0, nonNullUpdatedByCount: 0, orphanPublicUsersCount: 0, orphanAuthUsersCount: 0,
    }, bodyProvenance: { kind: 'non_admitted_sha256', sha256: '1'.repeat(64) },
  };
}

function preForwardReceipt(receiptCapturedAtUtc: string) {
  const value = { schemaVersion: 1, kind: 'production-observed-profile', profilePhase: 'post_cleanup', collectionStartedAtUtc: receiptCapturedAtUtc, capturedAtUtc: receiptCapturedAtUtc, sourceSha, baselineSourceSha: PRODUCTION_OBSERVED_PROFILE_SOURCE_SHA, targetBindingSha256, ...structuredClone(PRODUCTION_OBSERVED_PROFILE_BASELINE) };
  Object.assign(value.aggregate.saved_filter_data, { total_count: 0, orphan_auth_reference_count: 0, row_identity_sha256: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945' });
  return value;
}

function rebaseFixtureTimestamps(value: unknown, freshCapturedAtUtc: string) {
  const original = Date.parse('2026-09-23T14:00:00.000Z');
  const fresh = Date.parse(freshCapturedAtUtc);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key.endsWith('AtUtc') && typeof child === 'string') {
      const timestamp = Date.parse(child);
      if (Number.isFinite(timestamp)) (value as Record<string, unknown>)[key] = new Date(fresh + timestamp - original).toISOString();
    } else rebaseFixtureTimestamps(child, freshCapturedAtUtc);
  }
}

function compile(root: string, output: string, sources: string[]) {
  const script = path.join(root, 'compile.ps1');
  writeFileSync(script, `param([string]$Output,[Parameter(ValueFromRemainingArguments=$true)][string[]]$Sources)\n$ErrorActionPreference='Stop'\nif($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5){throw 'windows-powershell-5-required'}\n$p=New-Object Microsoft.CSharp.CSharpCodeProvider\n$c=New-Object CodeDom.Compiler.CompilerParameters\n$c.GenerateExecutable=$true;$c.GenerateInMemory=$false;$c.OutputAssembly=$Output;$c.CompilerOptions='/optimize+ /platform:x64'\nforeach($a in @('System.dll','System.Core.dll','System.Security.dll','System.Web.Extensions.dll')){$null=$c.ReferencedAssemblies.Add($a)}\ntry{$r=$p.CompileAssemblyFromFile($c,[string[]]$Sources);if($r.Errors.HasErrors){throw (($r.Errors|ForEach-Object {$_.ErrorNumber+':'+$_.Line+':'+$_.ErrorText}) -join ',')}}finally{$p.Dispose()}\n`);
  const result = spawnSync(windowsPowerShell, ['-NoProfile', '-NonInteractive', '-File', script, output, ...sources], { encoding: 'utf8', windowsHide: true, timeout: 60_000 });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
}

function privateDirectories(buildRoot: string, directories: string[]) {
  const script = path.join(buildRoot, 'private-directories.ps1');
  writeFileSync(script, `param([string]$DirectoryList)\n$ErrorActionPreference='Stop'\n$owner=[Security.Principal.WindowsIdentity]::GetCurrent().User\nforeach($directory in $DirectoryList -split '\\|'){$acl=New-Object Security.AccessControl.DirectorySecurity;$acl.SetOwner($owner);$acl.SetAccessRuleProtection($true,$false);foreach($sid in @($owner.Value,'S-1-5-18','S-1-5-32-544')){$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($sid)),'FullControl','ContainerInherit,ObjectInherit','None','Allow')))};$null=[IO.Directory]::CreateDirectory($directory,$acl)}\n`);
  const result = spawnSync(windowsPowerShell, ['-NoProfile', '-NonInteractive', '-File', script, directories.join('|')], { encoding: 'utf8', windowsHide: true, timeout: 30_000 });
  expect(result.status, result.stderr).toBe(0);
}

function fixture(inputLoadDelayMilliseconds = 0, clock: () => number = Date.now) {
  if (!Number.isSafeInteger(inputLoadDelayMilliseconds) || inputLoadDelayMilliseconds < 0 || inputLoadDelayMilliseconds >= 60_000) throw new Error('synthetic preparation delay invalid');
  const profile = process.env.USERPROFILE;
  if (!profile || !path.isAbsolute(profile)) throw new Error('test user profile is unavailable');
  const container = mkdtempSync(path.join(profile, '.hr-masterdata-handoff-build-'));
  own(container);
  const suffix = sha256(Buffer.from(randomUUID()));
  const root = path.join(profile, `.hr-masterdata-toolchain-cutover-${suffix}`);
  const inputRoot = path.join(profile, `.hr-masterdata-handoff-input-${suffix}`);
  const evidenceRoot = path.join(profile, `.hr-masterdata-handoff-evidence-${suffix}`);
  const linkRoot = path.join(profile, `.hr-masterdata-handoff-link-${suffix}`);
  for (const candidate of [root, inputRoot, evidenceRoot, linkRoot]) expect(existsSync(candidate)).toBe(false);
  own(root); own(inputRoot); own(evidenceRoot); own(linkRoot);
  privateDirectories(container, [root, inputRoot, evidenceRoot, linkRoot]);
  mkdirSync(path.join(root, 'runtime'));
  copyFileSync(process.execPath, path.join(root, 'runtime', 'node.exe'));
  for (const file of [
    'src/lib/release/protected-file-lease.cs', 'src/lib/release/protected-production-cutover-host.cs',
    'src/lib/release/protected-production-cutover-worker.mjs', 'src/lib/release/production-bootstrap-admission.mjs',
    'src/lib/release/production-staffing-pre-execute-contract.mjs', 'src/lib/release/production-isolation-gate.mjs',
    'src/lib/release/production-managed-writer-profiles.mjs', 'src/lib/release/production-observed-profile.mjs',
    'src/lib/release/protected-cutover-diagnostics.mjs',
    'supabase/verify/run-reviewed-supabase-cli.mjs', 'supabase/migration-baseline-manifest.json',
  ]) copy(root, file);
  writeFileSync(path.join(root, 'supabase/verify/verify-production-baseline-catalog.mjs'), "export function verifyApprovedSslRootCertificate({environment}={}) { return environment.SUPABASE_SSL_ROOT_CERT; }\n");
  writeFileSync(path.join(root, 'supabase/verify/verify-target-binding.mjs'), 'export async function verifyConfiguredSupabaseTarget() {}\n');
  const migrationDirectory = path.join(repository, 'supabase', 'migrations');
  const plan = PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS.map((version) => {
    const file = readdirSync(migrationDirectory).find((entry) => entry.startsWith(`${version}_`));
    if (!file) throw new Error(`missing migration ${version}`);
    copy(root, `supabase/migrations/${file}`);
    const bytes = readFileSync(path.join(root, 'supabase/migrations', file));
    return { version, file, gitBlob: gitBlob(bytes), sha256: sha256(bytes) };
  });
  const callLog = path.join(container, 'fake-cli-calls.txt');
  const workRootMarker = path.join(container, 'fake-cli-work-root.txt');
  const cliVersionMarker = path.join(container, 'fake-cli-version.txt');
  const inputLoadStartMarker = path.join(container, 'input-load-start.txt');
  const inputLoadFinishMarker = path.join(container, 'input-load-finish.txt');
  const cliSource = path.join(container, 'fake-cli.cs');
  writeFileSync(cliSource, `using System; using System.IO; class Program { static int Main(string[] a) { if(a.Length==1 && a[0]=="--version"){File.WriteAllText(@"${cliVersionMarker}","version");Console.WriteLine("2.115.0");return 0;} File.AppendAllText(@"${callLog}", String.Join(" ",a)+"\\n");File.WriteAllText(@"${workRootMarker}",Directory.GetCurrentDirectory()); bool dry=Array.IndexOf(a,"--dry-run")>=0; if(dry){${plan.map((entry) => `Console.WriteLine("Applying migration ${entry.file}");`).join('')} } return 0; } }`);
  compile(container, path.join(root, 'runtime', 'supabase.exe'), [cliSource]);
  const certificate = path.join(container, 'synthetic-ca.pem'); writeFileSync(certificate, 'synthetic certificate');
  const link = path.join(linkRoot, 'production-link.txt'); writeFileSync(link, `${projectRef}\n`);
  const managedFixture = createValidManagedIsolationEvidenceFixture();
  const { isolationContext, isolationReceipts } = managedFixture;
  const capturedAtUtc = mintFixtureCapturedAtUtc(clock);
  rebaseFixtureTimestamps(isolationReceipts, capturedAtUtc);
  const profileCompleted = Date.parse(capturedAtUtc);
  const cleanupStartedAtUtc = new Date(profileCompleted + 1500).toISOString();
  const cleanupCompletedAtUtc = new Date(profileCompleted + 2000).toISOString();
  const postCleanupCollectorAtUtc = new Date(profileCompleted + 2500).toISOString();
  Object.assign(isolationReceipts.database.managedWriterObservation, {
    collectionStartedAtUtc: new Date(profileCompleted + 3000).toISOString(),
    capturedAtUtc: new Date(profileCompleted + 3500).toISOString(),
  });
  Object.assign(isolationReceipts.database, {
    collectionStartedAtUtc: new Date(profileCompleted + 4000).toISOString(),
    capturedAtUtc: new Date(profileCompleted + 5000).toISOString(),
  });
  Object.assign(isolationReceipts.drain, {
    collectionStartedAtUtc: new Date(profileCompleted + 6000).toISOString(),
    capturedAtUtc: new Date(profileCompleted + 7000).toISOString(),
  });
  rebindManagedIsolationEvidenceFixture(managedFixture, {
    sourceSha, sourceTree, sourceManifestSha256, targetBindingSha256,
  });
  const evidence = {
    staffing: JSON.stringify(staffingReceipt(postCleanupCollectorAtUtc)),
    isolation: JSON.stringify({ receipts: isolationReceipts, context: isolationContext }),
    preForward: JSON.stringify(preForwardReceipt(postCleanupCollectorAtUtc)), backup: JSON.stringify({ kind: 'synthetic-backup' }), cleanup: JSON.stringify({ kind: 'synthetic-cleanup', startedAtUtc: cleanupStartedAtUtc, completedAtUtc: cleanupCompletedAtUtc }),
  };
  const evidencePaths: Record<string, string> = {};
  for (const [name, text] of Object.entries(evidence)) { evidencePaths[name] = path.join(evidenceRoot, `${name}.json`); writeFileSync(evidencePaths[name], text); }
  const packageRecord = { schemaVersion: 1, kind: 'offline-protected-production-cutover-package', sourceCommit: sourceSha, sourceTree, sourceManifestSha256, plan };
  writeFileSync(path.join(root, 'toolchain-package.json'), JSON.stringify(packageRecord));
  const keyScript = path.join(container, 'key.ps1');
  writeFileSync(keyScript, `$r=New-Object Security.Cryptography.RSACryptoServiceProvider 2048;$r.PersistKeyInCsp=$false;try{$p=$r.ExportParameters($false);function B([byte[]]$x){[Convert]::ToBase64String($x).TrimEnd('=').Replace('+','-').Replace('/','_')};[IO.File]::WriteAllText($args[0],$r.ToXmlString($true));[IO.File]::WriteAllText($args[1],(@{kty='RSA';n=(B $p.Modulus);e=(B $p.Exponent)}|ConvertTo-Json -Compress))}finally{$r.Dispose()}`);
  const privateXml = path.join(container, 'private.xml'); const publicJwk = path.join(root, 'bootstrap-origin.json');
  const keyResult = spawnSync(windowsPowerShell, ['-NoProfile', '-NonInteractive', '-File', keyScript, privateXml, publicJwk], { encoding: 'utf8', windowsHide: true, timeout: 30_000 });
  expect(keyResult.status, keyResult.stderr).toBe(0);
  const allFiles = [
    'runtime/node.exe', 'runtime/supabase.exe', 'src/lib/release/protected-file-lease.cs', 'src/lib/release/protected-production-cutover-host.cs', 'src/lib/release/protected-production-cutover-worker.mjs', 'src/lib/release/production-bootstrap-admission.mjs', 'src/lib/release/production-staffing-pre-execute-contract.mjs', 'src/lib/release/production-isolation-gate.mjs', 'src/lib/release/production-managed-writer-profiles.mjs', 'src/lib/release/production-observed-profile.mjs', 'src/lib/release/protected-cutover-diagnostics.mjs', 'supabase/verify/run-reviewed-supabase-cli.mjs', 'supabase/verify/verify-production-baseline-catalog.mjs', 'supabase/verify/verify-target-binding.mjs', 'supabase/migration-baseline-manifest.json', 'toolchain-package.json', 'bootstrap-origin.json', ...plan.map((entry) => `supabase/migrations/${entry.file}`),
  ];
  const files = allFiles.map((relative) => ({ relative, sha: sha256(readFileSync(path.join(root, relative))) }));
  const rows = files.map(({ relative, sha }) => `{ @"${relative.replaceAll('/', '\\')}", "${sha}" }`).join(',\n');
  const inputs = path.join(container, 'synthetic-inputs.cs');
  writeFileSync(inputs, `using System;using System.Collections.Generic;namespace HrMasterdata.Release { internal sealed class ProductionInputs:IDisposable { public IDictionary<string,string> EnvironmentValues {get;private set;} ProductionInputs(){EnvironmentValues=new Dictionary<string,string>{{"EXPECTED_SUPABASE_ENVIRONMENT","production"},{"EXPECTED_SUPABASE_PROJECT_REF","${projectRef}"},{"SUPABASE_DB_CONNECTION_MODE","session-pooler"},{"EXPECTED_SUPABASE_POOLER_HOST","synthetic.pooler"},{"SUPABASE_DB_URL","postgresql://postgres.${projectRef}:synthetic@synthetic.pooler:5432/postgres?sslmode=verify-full"},{"SUPABASE_SSL_ROOT_CERT",@"${certificate}"},{"EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256","${sha256(readFileSync(certificate))}"}};} internal static ProductionInputs Load(string root){if(!String.Equals(root,@"${inputRoot}",StringComparison.Ordinal)||!System.IO.Directory.Exists(root))throw new InvalidOperationException();return new ProductionInputs();} public void Dispose(){EnvironmentValues.Clear();} } }`);
  writeFileSync(inputs, readFileSync(inputs, 'utf8').replace('return new ProductionInputs();', `System.IO.File.WriteAllText(@"${inputLoadStartMarker}","input-load-start");System.Threading.Thread.Sleep(${inputLoadDelayMilliseconds});System.IO.File.WriteAllText(@"${inputLoadFinishMarker}","input-load-finish");return new ProductionInputs();`));
  const install = path.join(container, 'installation.cs');
  const get = (name: string) => sha256(readFileSync(evidencePaths[name]));
  writeFileSync(install, `namespace HrMasterdata.Release { internal static class Installation { internal const string Root=@"${root}";internal const string InputRoot=@"${inputRoot}";internal const string LinkPath=@"${link}";internal const string LinkSha256="${sha256(readFileSync(link))}";internal const string EvidenceRoot=@"${evidenceRoot}";internal const string StaffingReceiptPath=@"${evidencePaths.staffing}";internal const string StaffingReceiptSha256="${get('staffing')}";internal const string IsolationReceiptPath=@"${evidencePaths.isolation}";internal const string IsolationReceiptSha256="${get('isolation')}";internal const string PreForwardReceiptPath=@"${evidencePaths.preForward}";internal const string PreForwardReceiptSha256="${get('preForward')}";internal const string BackupRecordPath=@"${evidencePaths.backup}";internal const string BackupRecordSha256="${get('backup')}";internal const string CleanupRecordPath=@"${evidencePaths.cleanup}";internal const string CleanupRecordSha256="${get('cleanup')}";internal const string TargetBindingSha256="${targetBindingSha256}";internal const string OriginPrivateKey=@"${readFileSync(privateXml,'utf8').replaceAll('"','""')}";internal static readonly System.Collections.Generic.Dictionary<string,string> Files=new System.Collections.Generic.Dictionary<string,string>{${rows}}; } }`);
  compile(container, path.join(root, 'production-cutover.exe'), [path.join(root, 'src/lib/release/protected-file-lease.cs'), path.join(root, 'src/lib/release/protected-production-cutover-host.cs'), inputs, install]);
  return { root, callLog, workRootMarker, cliVersionMarker, inputLoadStartMarker, inputLoadFinishMarker, inputRoot, preForwardPath: evidencePaths.preForward, capturedAtUtc };
}

afterEach(() => roots.splice(0).forEach((root) => {
  const resolved = path.resolve(root);
  if (!ownedRoots.delete(resolved)) throw new Error('refusing to remove an unowned test root');
  rmSync(resolved, { recursive: true, force: true });
}));

describe('synthetic cutover evidence timestamps', () => {
  it('mints each fixture timestamp at construction despite a seventeen-minute runner delay', () => {
    const firstNow = Date.parse('2026-10-06T12:00:00.000Z');
    const secondNow = firstNow + 17 * 60 * 1000;
    const first = mintFixtureCapturedAtUtc(() => firstNow);
    const second = mintFixtureCapturedAtUtc(() => secondNow);
    expect(first).not.toBe(second);
    expect(firstNow - Date.parse(first)).toBe(SYNTHETIC_EVIDENCE_BACKDATE_MS);
    expect(secondNow - Date.parse(second)).toBe(SYNTHETIC_EVIDENCE_BACKDATE_MS);
    expect(SYNTHETIC_EVIDENCE_MAX_AGE_MS - SYNTHETIC_EVIDENCE_BACKDATE_MS).toBe(14 * 60 * 1000);
  });
});

describe.skipIf(process.platform !== 'win32')('Story 22.15 protected production cutover native handoff', () => {
  it('completes an eleven-second post-ready preparation through the real worker without private inputs or a network target', () => {
    // This synthetic input load happens after nonce-ready. It must exceed the
    // unchanged ten-second packet limit without consuming transmission time.
    const { root, callLog, workRootMarker, cliVersionMarker, inputLoadStartMarker, inputLoadFinishMarker, inputRoot, preForwardPath, capturedAtUtc } = fixture(11_000);
    const executable = path.join(root, 'production-cutover.exe');
    expect(existsSync(workRootMarker)).toBe(false);
    const rejectedArguments = spawnSync(executable, ['--untrusted'], { encoding: 'utf8', windowsHide: true, timeout: 30_000 });
    expect(rejectedArguments.error).toBeUndefined();
    expect(rejectedArguments.status).toBe(1);
    expect(existsSync(callLog)).toBe(false);
    expect(existsSync(workRootMarker)).toBe(false);
    expect(existsSync(cliVersionMarker)).toBe(false);
    expect(existsSync(inputLoadStartMarker)).toBe(false);
    expect(existsSync(inputLoadFinishMarker)).toBe(false);
    const result = spawnSync(executable, [], { encoding: 'utf8', windowsHide: true, timeout: 120_000 });
    // The marker was absent before this run and only this fixture's fake CLI
    // writes it. Register its constrained, non-link root before assertions so
    // an assertion failure still cleans up this exact synthetic directory.
    // If the host fails before the CLI marker, retain work for diagnosis; do
    // not scan or adopt any other directory under the user profile.
    const workRoot = registerMarkedWorkRoot(workRootMarker);
    const callCount = existsSync(callLog) ? readFileSync(callLog, 'utf8').trim().split(/\r?\n/u).filter(Boolean).length : 0;
    const diagnostic = JSON.stringify({
      cliVersionObserved: existsSync(cliVersionMarker),
      inputLoadStarted: existsSync(inputLoadStartMarker),
      inputLoadFinished: existsSync(inputLoadFinishMarker),
      cliWorkObserved: existsSync(workRootMarker),
      clockAgeMilliseconds: Date.now() - Date.parse(capturedAtUtc),
      stdoutBytes: Buffer.byteLength(result.stdout ?? '', 'utf8'),
      stderrPresent: Boolean(result.stderr),
      callCount,
      knownGenericError: (result.stderr ?? '').includes('Protected production cutover did not complete.'),
    });
    expect(result.error, diagnostic).toBeUndefined();
    expect(result.status, diagnostic).toBe(0);
    expect(existsSync(cliVersionMarker), diagnostic).toBe(true);
    expect(existsSync(inputLoadStartMarker), diagnostic).toBe(true);
    expect(existsSync(inputLoadFinishMarker), diagnostic).toBe(true);
    expect(JSON.parse(result.stdout.trim())).toMatchObject({ kind: 'protected-production-forward-14-attempt', sourceCommit: sourceSha, sourceTree, sourceManifestSha256, targetBindingSha256, versions: PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS, authorizesCleanup: false, authorizesRepair: false, authorizesMain: false, authorizesDeployment: false, authorizesReopen: false });
    expect(readFileSync(callLog, 'utf8').trim().split(/\r?\n/u)).toEqual([
      'db push --dry-run --include-all --skip-vault --db-url postgresql:///postgres?sslmode=verify-full',
      'db push --include-all --skip-vault --db-url postgresql:///postgres?sslmode=verify-full',
    ]);
    expect(existsSync(inputRoot)).toBe(true);
    if (!workRoot) throw new Error('successful synthetic CLI handoff did not mark its work root');
    const expectedMigrationNames = PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS.map((version) => {
      const name = readdirSync(path.join(repository, 'supabase', 'migrations')).find((entry) => entry.startsWith(`${version}_`));
      if (!name) throw new Error(`missing expected migration ${version}`);
      return name;
    });
    const actualMigrationNames = readdirSync(path.join(workRoot, 'supabase', 'migrations')).sort();
    expect(actualMigrationNames).toEqual([...expectedMigrationNames].sort());
    for (const name of expectedMigrationNames) {
      expect(sha256(readFileSync(path.join(workRoot, 'supabase', 'migrations', name)))).toBe(sha256(readFileSync(path.join(repository, 'supabase', 'migrations', name))));
    }
    expect(existsSync(path.join(workRoot, 'supabase', '.temp', 'project-ref'))).toBe(true);
    expect(existsSync(path.join(workRoot, 'supabase', 'config.toml'))).toBe(false);
    const originalPreForward = readFileSync(preForwardPath);
    const callsBeforeTamper = readFileSync(callLog, 'utf8');
    try {
      const tampered = Buffer.from(originalPreForward);
      tampered[0] ^= 1;
      writeFileSync(preForwardPath, tampered);
      const rejectedEvidence = spawnSync(executable, [], { encoding: 'utf8', windowsHide: true, timeout: 30_000 });
      expect(rejectedEvidence.error).toBeUndefined();
      expect(rejectedEvidence.status).toBe(1);
      expect(readFileSync(callLog, 'utf8')).toBe(callsBeforeTamper);
    } finally {
      writeFileSync(preForwardPath, originalPreForward);
    }
  }, 180_000);
});
