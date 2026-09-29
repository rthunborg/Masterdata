import { spawnSync } from 'node:child_process';
import { createHash, createPublicKey } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createProtectedCutoverDiagnosticSink,
  readProtectedCutoverDiagnosticContext,
} from '../../../../src/lib/release/protected-cutover-diagnostics.mjs';
import {
  PROTECTED_CUTOVER_PREPARATION_TIMEOUT_MS,
  PROTECTED_CUTOVER_PACKET_TIMEOUT_MS,
} from '../../../../src/lib/release/protected-production-cutover-worker.mjs';

function removeOwnedTemporaryRoot(root: string, prefix: string) {
  const temporaryRoot = path.resolve(tmpdir());
  const resolved = path.resolve(root);
  const relative = path.relative(temporaryRoot, resolved);
  if (
    relative === '' || relative.startsWith('..') || path.isAbsolute(relative) ||
    relative.includes(path.sep) || !relative.startsWith(prefix)
  ) throw new Error('fixture cleanup target refused');
  const stat = lstatSync(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('fixture cleanup target refused');
  rmSync(resolved, { recursive: true, force: true });
}

const csharpVerbatim = (value: string) => `@"${value.replaceAll('"', '""')}"`;
const windowsPowerShell = path.join(process.env.WINDIR ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');

describe('Story 22.15 protected production cutover host bounds', () => {
  it('leaves explicit finite headroom beyond all nested protected worker bounds', () => {
    const source = readFileSync(path.join(process.cwd(), 'src/lib/release/protected-production-cutover-host.cs'), 'utf8');
    const runner = readFileSync(path.join(process.cwd(), 'supabase/verify/run-reviewed-supabase-cli.mjs'), 'utf8');
    const constant = (name: string) => {
      const match = source.match(new RegExp(`const int ${name} = ([\\d_]+);`, 'u'));
      expect(match, `${name} must be an explicit host bound`).not.toBeNull();
      return Number(match![1].replaceAll('_', ''));
    };
    const ready = constant('WorkerReadyTimeoutMilliseconds');
    const input = constant('WorkerInputTimeoutMilliseconds');
    const version = constant('ReviewedCliVersionTimeoutMilliseconds');
    const cli = constant('ReviewedCliInvocationTimeoutMilliseconds');
    const attempts = constant('ProtectedCliAttemptCount');
    const drain = constant('TerminalStreamDrainTimeoutMilliseconds');
    const preparation = constant('HostPreparationTimeoutMilliseconds');
    const outer = constant('OuterWorkerDeadlineMilliseconds');

    const runnerVersion = Number(runner.match(/timeout: ([\d_]+),\s*\n\s*maxBuffer: 64 \* 1024/u)![1].replaceAll('_', ''));
    const runnerProtectedCli = Number(runner.match(/\? \{ timeout: ([\d_]+), maxBuffer: 1024 \* 1024 \}/u)![1].replaceAll('_', ''));

    expect(PROTECTED_CUTOVER_PACKET_TIMEOUT_MS).toBe(input);
    expect(PROTECTED_CUTOVER_PREPARATION_TIMEOUT_MS).toBe(preparation);
    expect(runnerVersion).toBe(version);
    expect(runnerProtectedCli).toBe(cli);
    const maximumNestedDuration = ready + preparation + input + attempts * (version + cli) + 2 * drain;
    expect(maximumNestedDuration).toBe(282_000);
    expect(outer).toBe(360_000);
    expect(outer - maximumNestedDuration).toBeGreaterThanOrEqual(60_000);
    expect(source).toContain('child.WaitForExit(RemainingWorkerMilliseconds(workerLifetime.ElapsedMilliseconds))');
    expect(source).not.toContain('child.WaitForExit(OuterWorkerDeadlineMilliseconds)');
    expect(source).toContain('child.WaitForExit(BoundedTerminationTimeoutMilliseconds)');
  });

  it('derives the signed cleanup interval only from the leased cleanup record', () => {
    const source = readFileSync(path.join(process.cwd(), 'src/lib/release/protected-production-cutover-host.cs'), 'utf8');
    expect(source).toContain('cleanupEvidence.ContainsKey("startedAtUtc") && cleanupEvidence.ContainsKey("completedAtUtc")');
    expect(source).toContain('string cleanupStartedAtUtc = RequireCanonicalUtc(cleanupEvidence["startedAtUtc"], out cleanupStartedAt);');
    expect(source).toContain('Require(cleanupStartedAt <= cleanupCompletedAt);');
    expect(source).toContain('cleanupStartedAtUtc = cleanupStartedAtUtc, cleanupCompletedAtUtc = cleanupCompletedAtUtc');
    expect(source).not.toContain('Installation.CleanupStartedAtUtc');
  });
});

// Compilation never invokes the resulting host, decrypts inputs or connects.
describe.skipIf(process.platform !== 'win32')('Story 22.15 Windows cutover host compilation', () => {
  it('compiles the actual host, inputs and file lease with every installed binding', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hr-cutover-compile-'));
    try {
      const names = ['Root','InputRoot','LinkPath','LinkSha256','EvidenceRoot',
        'StaffingReceiptPath','StaffingReceiptSha256','IsolationReceiptPath','IsolationReceiptSha256',
        'PreForwardReceiptPath','PreForwardReceiptSha256','BackupRecordPath','BackupRecordSha256',
        'CleanupRecordPath','CleanupRecordSha256','TargetBindingSha256','OriginPrivateKey'];
      const plan = 'namespace HrMasterdata.Release { internal static class Installation { ' +
        names.map(name => `internal const string ${name} = "synthetic";`).join(' ') +
        ' internal static readonly System.Collections.Generic.Dictionary<string,string> Files = new System.Collections.Generic.Dictionary<string,string>(); } }';
      const files = ['protected-file-lease.cs','protected-production-cutover-host.cs','protected-production-inputs.cs'];
      for (const file of files) writeFileSync(path.join(root,file), readFileSync(path.join(process.cwd(),'src/lib/release',file)));
      writeFileSync(path.join(root,'installation.cs'), plan);
      const script = `
param([string]$FixtureRoot)
$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5){throw 'runtime'}
$provider=New-Object Microsoft.CSharp.CSharpCodeProvider
$parameters=New-Object CodeDom.Compiler.CompilerParameters
$parameters.GenerateExecutable=$true;$parameters.GenerateInMemory=$false
$parameters.OutputAssembly=Join-Path $FixtureRoot 'synthetic-host.exe'
$parameters.CompilerOptions='/optimize+ /platform:x64'
foreach($assembly in @('System.dll','System.Core.dll','System.Security.dll','System.Web.Extensions.dll')){$null=$parameters.ReferencedAssemblies.Add($assembly)}
try{
 $sources=@('protected-file-lease.cs','protected-production-cutover-host.cs','protected-production-inputs.cs','installation.cs')|ForEach-Object {[IO.File]::ReadAllText((Join-Path $FixtureRoot $_))}
 $result=$provider.CompileAssemblyFromSource($parameters,[string[]]$sources)
 if($result.Errors.HasErrors){@{compiled=$false;errors=@($result.Errors|ForEach-Object {$_.ErrorNumber+':'+$_.Line})}|ConvertTo-Json -Compress;exit 1}
 $assembly=[Reflection.Assembly]::LoadFrom($parameters.OutputAssembly)
 $hostType=$assembly.GetType('HrMasterdata.Release.ProtectedProductionCutoverHost',$true)
 $remaining=$hostType.GetMethod('RemainingWorkerMilliseconds',[Reflection.BindingFlags]'NonPublic,Static')
 $prepare=$hostType.GetMethod('RequireTimelyPreparation',[Reflection.BindingFlags]'NonPublic,Static')
 if($null -eq $remaining -or $null -eq $prepare){throw 'deadline_method_missing'}
 $remainingCases=@(0L,11000L,70000L,359999L)
 $remainingValues=@($remainingCases|ForEach-Object {$remaining.Invoke($null,@([object][long]$_))})
 foreach($invalid in @(-1L,360000L,360001L)){
  $rejected=$false;try{[void]$remaining.Invoke($null,@([object][long]$invalid))}catch{$rejected=$true}
  if(-not $rejected){throw 'worker_lifetime_boundary_accepted'}
 }
 foreach($valid in @(0L,11000L,59999L)){[void]$prepare.Invoke($null,@([object][long]$valid))}
 foreach($invalid in @(-1L,60000L,60001L)){
  $rejected=$false;try{[void]$prepare.Invoke($null,@([object][long]$invalid))}catch{$rejected=$true}
  if(-not $rejected){throw 'preparation_boundary_accepted'}
 }
 @{compiled=$true;launcherInvoked=$false;privateInputsLoaded=$false;hostedAccess=$false;remainingMilliseconds=$remainingValues;deadlineBoundariesRejected=$true;preparationBoundariesRejected=$true}|ConvertTo-Json -Compress
}finally{$provider.Dispose()}
`;
      const scriptPath=path.join(root,'compile.ps1');writeFileSync(scriptPath,script);
      const ps=path.join(process.env.WINDIR ?? 'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
      const result=spawnSync(ps,['-NoProfile','-NonInteractive','-File',scriptPath,root],{encoding:'utf8',windowsHide:true,timeout:30_000});
      expect(result.error).toBeUndefined();
      expect(result.status,result.stdout).toBe(0);
      expect(JSON.parse(result.stdout.trim())).toEqual({compiled:true,launcherInvoked:false,privateInputsLoaded:false,hostedAccess:false,remainingMilliseconds:[360000,349000,290000,1],deadlineBoundariesRejected:true,preparationBoundariesRejected:true});
    } finally {
      removeOwnedTemporaryRoot(root, 'hr-cutover-compile-');
    }
  },40_000);

  it('uses the actual host DPAPI recovery method to decrypt an encrypted synthetic CLI journal only in memory', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hr-cutover-diagnostic-native-'));
    try {
      const privateXml = path.join(root, 'synthetic-origin-private.xml');
      const publicJwk = path.join(root, 'synthetic-origin-public.jwk.json');
      const keyScript = path.join(root, 'generate-synthetic-key.ps1');
      writeFileSync(keyScript, `param([string]$PrivateXml,[string]$PublicJwk)
$ErrorActionPreference='Stop'
$rsa=New-Object Security.Cryptography.RSACryptoServiceProvider 2048
try {
  $rsa.PersistKeyInCsp=$false
  $public=$rsa.ExportParameters($false)
  function B([byte[]]$bytes){[Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')}
  [IO.File]::WriteAllText($PrivateXml,$rsa.ToXmlString($true),(New-Object Text.UTF8Encoding($false)))
  [IO.File]::WriteAllText($PublicJwk,(@{kty='RSA';n=(B $public.Modulus);e=(B $public.Exponent)}|ConvertTo-Json -Compress),(New-Object Text.UTF8Encoding($false)))
} finally {$rsa.Dispose()}`);
      const keyResult = spawnSync(windowsPowerShell, ['-NoProfile', '-NonInteractive', '-File', keyScript, privateXml, publicJwk], {
        encoding: 'utf8', windowsHide: true, timeout: 30_000,
      });
      expect(keyResult.error).toBeUndefined();
      expect(keyResult.status, keyResult.stderr).toBe(0);

      const context = {
        sourceSha: 'a'.repeat(40), sourceTree: 'b'.repeat(40), sourceManifestSha256: 'c'.repeat(64),
        targetBindingSha256: 'd'.repeat(64), nonce: 'e'.repeat(64), operation: 'apply-forward-13',
      };
      const work = path.join(root, 'private-work');
      mkdirSync(work);
      const publicKey = createPublicKey({ key: JSON.parse(readFileSync(publicJwk, 'utf8')), format: 'jwk' });
      const sink = createProtectedCutoverDiagnosticSink({ workspace: work, publicKey, context });
      sink.start('dry-run');
      sink.complete('dry-run', {
        stdout: Buffer.from([0, 0xff, 0x0a, 0x41]), stderr: Buffer.from('synthetic timeout stderr', 'utf8'),
        status: null, signal: 'SIGTERM', errorCode: 'ETIMEDOUT', durationMs: 90_000,
      });
      sink.close();
      expect(readProtectedCutoverDiagnosticContext({ workspace: work })).toEqual(context);

      const installation = path.join(root, 'installation.cs');
      const synthetic = csharpVerbatim('synthetic');
      const fields = ['Root','InputRoot','LinkPath','LinkSha256','EvidenceRoot',
        'StaffingReceiptPath','StaffingReceiptSha256','IsolationReceiptPath','IsolationReceiptSha256',
        'PreForwardReceiptPath','PreForwardReceiptSha256','BackupRecordPath','BackupRecordSha256',
        'CleanupRecordPath','CleanupRecordSha256','TargetBindingSha256'];
      writeFileSync(installation, `namespace HrMasterdata.Release { internal static class Installation { ${fields.map((name) => `internal const string ${name}=${synthetic};`).join('')} internal const string OriginPrivateKey=${csharpVerbatim(readFileSync(privateXml, 'utf8'))}; internal static readonly System.Collections.Generic.Dictionary<string,string> Files=new System.Collections.Generic.Dictionary<string,string>(); } }`);
      for (const source of ['protected-file-lease.cs', 'protected-production-cutover-host.cs', 'protected-production-inputs.cs']) {
        writeFileSync(path.join(root, source), readFileSync(path.join(process.cwd(), 'src/lib/release', source)));
      }
      const compile = path.join(root, 'compile-host.ps1');
      writeFileSync(compile, `param([string]$FixtureRoot)
$ErrorActionPreference='Stop'
$provider=New-Object Microsoft.CSharp.CSharpCodeProvider
$parameters=New-Object CodeDom.Compiler.CompilerParameters
$parameters.GenerateExecutable=$false;$parameters.GenerateInMemory=$false;$parameters.OutputAssembly=Join-Path $FixtureRoot 'synthetic-host.dll';$parameters.CompilerOptions='/optimize+ /platform:x64'
foreach($assembly in @('System.dll','System.Core.dll','System.Security.dll','System.Web.Extensions.dll')){$null=$parameters.ReferencedAssemblies.Add($assembly)}
try {$sources=@('protected-file-lease.cs','protected-production-cutover-host.cs','protected-production-inputs.cs','installation.cs')|ForEach-Object {Join-Path $FixtureRoot $_};$result=$provider.CompileAssemblyFromFile($parameters,[string[]]$sources);if($result.Errors.HasErrors){throw (($result.Errors|ForEach-Object {$_.ErrorNumber+':'+$_.Line}) -join ',')}} finally {$provider.Dispose()}`);
      const compileResult = spawnSync(windowsPowerShell, ['-NoProfile', '-NonInteractive', '-File', compile, root], {
        encoding: 'utf8', windowsHide: true, timeout: 60_000,
      });
      expect(compileResult.error).toBeUndefined();
      expect(compileResult.status, compileResult.stderr).toBe(0);
      rmSync(privateXml, { force: true });

      const recoveryNode = path.join(root, 'recover-in-memory.mjs');
      writeFileSync(recoveryNode, `import { createHash, createPrivateKey } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const [modulePath, work] = process.argv.slice(2);
const privateJwk = JSON.parse(await new Promise((resolve,reject)=>{let value='';process.stdin.setEncoding('utf8');process.stdin.on('data',(chunk)=>{value+=chunk});process.stdin.on('end',()=>resolve(value));process.stdin.on('error',reject)}));
const module = await import(pathToFileURL(modulePath).href);
const context = module.readProtectedCutoverDiagnosticContext({ workspace: work });
const recovered = module.recoverProtectedCutoverDiagnostics({ workspace: work, privateKey: createPrivateKey({key:privateJwk,format:'jwk'}), context });
const digest=(value)=>value === undefined ? null : createHash('sha256').update(value).digest('hex');
process.stdout.write(JSON.stringify({outcome:recovered.outcome,authorizesRetry:recovered.authorizesRetry,records:recovered.diagnosticRecords.map(({phase,kind,stdout,stderr,status,signal,errorCode,durationMs})=>({phase,kind,stdoutBytes:stdout?.length ?? null,stderrBytes:stderr?.length ?? null,stdoutSha256:digest(stdout),stderrSha256:digest(stderr),status,signal,errorCode,durationMs}))}));`);
      const invoke = path.join(root, 'recover-from-dpapi.ps1');
      writeFileSync(invoke, `param([string]$HostDll,[string]$Work,[string]$Node,[string]$NodeScript,[string]$ModulePath)
$ErrorActionPreference='Stop'
$assembly=[Reflection.Assembly]::LoadFrom($HostDll)
$type=$assembly.GetType('HrMasterdata.Release.ProtectedProductionCutoverHost',$true)
$method=$type.GetMethod('PreserveDiagnosticRecoveryKey',[Reflection.BindingFlags]'NonPublic,Static')
if($null -eq $method){throw 'recovery-method-missing'}
$recoveryFile=[string]$method.Invoke($null,@([object]$Work))
$entropy=[Text.Encoding]::UTF8.GetBytes('hr-masterdata/production/cutover-diagnostics/v1')
$protected=[IO.File]::ReadAllBytes($recoveryFile)
$hash=[Security.Cryptography.SHA256]::Create();try{$beforeHash=[Convert]::ToBase64String($hash.ComputeHash($protected))}finally{$hash.Dispose()}
$wrongEntropyRejected=$false;try{$wrong=[Text.Encoding]::UTF8.GetBytes('hr-masterdata/production/cutover-diagnostics/wrong');try{[void][Security.Cryptography.ProtectedData]::Unprotect($protected,$wrong,[Security.Cryptography.DataProtectionScope]::CurrentUser)}finally{[Array]::Clear($wrong,0,$wrong.Length)}}catch{$wrongEntropyRejected=$true}
$corruptBlobRejected=$false;try{$corrupt=[byte[]]$protected.Clone();$corrupt[0]=[byte]($corrupt[0] -bxor 1);[void][Security.Cryptography.ProtectedData]::Unprotect($corrupt,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)}catch{$corruptBlobRejected=$true}
$overwriteRefused=$false;try{[void]$method.Invoke($null,@([object]$Work))}catch{$overwriteRefused=$true}
$hash=[Security.Cryptography.SHA256]::Create();try{$hashUnchanged=($beforeHash -eq [Convert]::ToBase64String($hash.ComputeHash([IO.File]::ReadAllBytes($recoveryFile))))}finally{$hash.Dispose()}
$plain=$null;$rsa=$null
try {
  $plain=[Security.Cryptography.ProtectedData]::Unprotect($protected,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $rsa=New-Object Security.Cryptography.RSACryptoServiceProvider
  $rsa.PersistKeyInCsp=$false;$rsa.FromXmlString([Text.Encoding]::UTF8.GetString($plain));$parameters=$rsa.ExportParameters($true)
  function B([byte[]]$bytes){[Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')}
  $jwk=@{kty='RSA';n=(B $parameters.Modulus);e=(B $parameters.Exponent);d=(B $parameters.D);p=(B $parameters.P);q=(B $parameters.Q);dp=(B $parameters.DP);dq=(B $parameters.DQ);qi=(B $parameters.InverseQ)}|ConvertTo-Json -Compress
  $info=New-Object Diagnostics.ProcessStartInfo;$info.FileName=$Node;$info.Arguments=('"'+$NodeScript+'" "'+$ModulePath+'" "'+$Work+'"');$info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
  $child=New-Object Diagnostics.Process;$child.StartInfo=$info;[void]$child.Start();$child.StandardInput.Write($jwk);$child.StandardInput.Close();$output=$child.StandardOutput.ReadToEnd();$errors=$child.StandardError.ReadToEnd();$child.WaitForExit()
  if($child.ExitCode -ne 0 -or $errors.Length -ne 0){throw 'in-memory-recovery-failed'}
  $result=$output|ConvertFrom-Json
  @{recoveryFile=$recoveryFile;wrongEntropyRejected=$wrongEntropyRejected;corruptBlobRejected=$corruptBlobRejected;overwriteRefused=$overwriteRefused;hashUnchanged=$hashUnchanged;outcome=$result.outcome;authorizesRetry=$result.authorizesRetry;records=@($result.records)}|ConvertTo-Json -Compress -Depth 4
} finally {if($rsa -ne $null){$rsa.Dispose()};if($plain -ne $null){[Array]::Clear($plain,0,$plain.Length)};if($protected -ne $null){[Array]::Clear($protected,0,$protected.Length)};[Array]::Clear($entropy,0,$entropy.Length)}`);
      const invokeResult = spawnSync(windowsPowerShell, ['-NoProfile', '-NonInteractive', '-File', invoke,
        path.join(root, 'synthetic-host.dll'), work, process.execPath, recoveryNode,
        path.join(process.cwd(), 'src/lib/release/protected-cutover-diagnostics.mjs')], {
        encoding: 'utf8', windowsHide: true, timeout: 60_000,
      });
      expect(invokeResult.error).toBeUndefined();
      expect(invokeResult.status, invokeResult.stderr).toBe(0);
      const proof = JSON.parse(invokeResult.stdout.trim());
      expect(proof.outcome).toBe('outcome_unknown');
      expect(proof.authorizesRetry).toBe(false);
      expect(proof.wrongEntropyRejected).toBe(true);
      expect(proof.corruptBlobRejected).toBe(true);
      expect(proof.overwriteRefused).toBe(true);
      expect(proof.hashUnchanged).toBe(true);
      expect(proof.records).toHaveLength(2);
      expect(proof.records[1]).toMatchObject({
        phase: 'dry-run', kind: 'completed', stdoutBytes: 4, stderrBytes: 24,
        status: null, signal: 'SIGTERM', errorCode: 'ETIMEDOUT', durationMs: 90_000,
      });
      expect(proof.records[1].stdoutSha256).toBe(createHash('sha256').update(Buffer.from([0, 0xff, 0x0a, 0x41])).digest('hex'));
      expect(proof.records[1].stderrSha256).toBe(createHash('sha256').update('synthetic timeout stderr', 'utf8').digest('hex'));
      expect(existsSync(proof.recoveryFile)).toBe(true);
      expect(readFileSync(proof.recoveryFile).toString('utf8')).not.toContain('<RSAKeyValue>');
    } finally {
      removeOwnedTemporaryRoot(root, 'hr-cutover-diagnostic-native-');
    }
  }, 120_000);
});
