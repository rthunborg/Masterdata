import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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
 @{compiled=$true;launcherInvoked=$false;privateInputsLoaded=$false;hostedAccess=$false}|ConvertTo-Json -Compress
}finally{$provider.Dispose()}
`;
      const scriptPath=path.join(root,'compile.ps1');writeFileSync(scriptPath,script);
      const ps=path.join(process.env.WINDIR ?? 'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
      const result=spawnSync(ps,['-NoProfile','-NonInteractive','-File',scriptPath,root],{encoding:'utf8',windowsHide:true,timeout:30_000});
      expect(result.error).toBeUndefined();
      expect(result.status,result.stdout).toBe(0);
      expect(JSON.parse(result.stdout.trim())).toEqual({compiled:true,launcherInvoked:false,privateInputsLoaded:false,hostedAccess:false});
    } finally {
      if (!path.resolve(root).startsWith(path.join(path.resolve(tmpdir()),'hr-cutover-compile-'))) throw new Error('fixture cleanup target refused');
      rmSync(root,{recursive:true,force:true});
    }
  },40_000);
});
