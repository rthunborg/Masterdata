import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe.skipIf(process.platform !== 'win32')('isolation installer preflight refusal',()=>{
  it.each(['bad-hash','empty-closure'] as const)('refuses %s before private record reads or materialization',variant=>{
    const root=mkdtempSync(path.join(tmpdir(),'hr-isolation-installer-refusal-'));
    try{
      const bytes=Buffer.from(JSON.stringify({schemaVersion:1,kind:'offline-protected-production-isolation-package',sourceCommit:'a'.repeat(40),sourceTree:'b'.repeat(40),sourceManifestSha256:'c'.repeat(64),files:[]}));
      writeFileSync(path.join(root,'toolchain-package.json'),bytes);
      const digest=variant==='bad-hash'?'d'.repeat(64):createHash('sha256').update(bytes).digest('hex');
      const powershell=path.join(process.env.WINDIR??'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
      const args=['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.resolve('src/lib/release/install-protected-production-isolation.ps1'),
        '-PackageDirectory',root,'-ExpectedPackageSha256',digest];
      for(const prefix of ['ProductionLink','IsolationAdmission','ToolchainRecord']){args.push('-Approved'+prefix+'Path',path.join(root,'must-not-be-read'));
        args.push(prefix==='ToolchainRecord'?'-ExpectedToolchainSha256':'-Expected'+prefix+'Sha256','f'.repeat(64));}
      const result=spawnSync(powershell,args,{encoding:'utf8',windowsHide:true,timeout:15_000});
      if(result.error||result.signal||result.stderr)throw new Error('synthetic_installer_refusal_harness_failed');
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout)).toEqual({installed:false,stage:'package-validation',detailsSuppressed:true,hostedAccess:false,privateInputsLoaded:false});
      expect(result.stdout).not.toContain(root);
    }finally{rmSync(root,{recursive:true,force:true});}
  });
});

describe.skipIf(process.platform !== 'win32')('actual installer ciphertext preflight', () => {
  it('checks the hash-bound envelope without decrypting and refuses plaintext or malformed metadata', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hr-isolation-envelope-'));
    try {
      const source = readFileSync(path.resolve('src/lib/release/install-protected-production-isolation.ps1'), 'utf8');
      const helpersStart = source.indexOf(' function Require(');
      const helpersEnd = source.indexOf(' function Fixed-Child(', helpersStart);
      const blockStart = source.indexOf(' $runtimeRecord=Record ');
      const blockEnd = source.indexOf(' $linkBytes=Read-Bounded ', blockStart);
      expect(helpersStart).toBeGreaterThan(0);
      expect(helpersEnd).toBeGreaterThan(helpersStart);
      expect(blockStart).toBeGreaterThan(helpersEnd);
      expect(blockEnd).toBeGreaterThan(blockStart);
      const script = path.join(root, 'envelope-preflight.ps1');
      writeFileSync(script, `param([string]$Root)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
${source.slice(helpersStart, helpersEnd)}
function Validate-ActualEnvelope {
${source.slice(blockStart, blockEnd)}
}
$path=Join-Path $Root 'synthetic-envelope.json'
function Check($Value,[bool]$Accepted,[bool]$BadHash=$false) {
 $bytes=[Text.Encoding]::UTF8.GetBytes(($Value|ConvertTo-Json -Depth 6 -Compress))
 [IO.File]::WriteAllBytes($path,$bytes)
 $digest=Hash-Bytes $bytes
 if($BadHash){$digest='f'*64}
 $script:toolchain=[pscustomobject]@{runtimeRecordPath=$path;runtimeRecordSha256=$digest}
 $passed=$false
 try{Validate-ActualEnvelope;$passed=$true}catch{}
 if($passed -ne $Accepted){throw 'synthetic-envelope-expectation'}
}
function Envelope {return [ordered]@{schemaVersion=1;kind='protected-production-isolation-runtime-ciphertext';protection='dpapi-current-user';ciphertextBase64='AAECAw=='}}
Check (Envelope) $true
$variants=@()
$variants+=,@{schemaVersion=1;kind='protected-production-isolation-runtime-record';controlAdmission=@{};probeContext=@{}}
$v=Envelope;$v.schemaVersion=2;$variants+=,$v
$v=Envelope;$v.schemaVersion='1';$variants+=,$v
$v=Envelope;$v.kind='wrong';$variants+=,$v
$v=Envelope;$v.protection='wrong';$variants+=,$v
$v=Envelope;$v.extra=$true;$variants+=,$v
$v=Envelope;$v.Remove('ciphertextBase64');$variants+=,$v
$v=Envelope;$v.ciphertextBase64='';$variants+=,$v
$v=Envelope;$v.ciphertextBase64='AAECAw== ';$variants+=,$v
$v=Envelope;$v.ciphertextBase64='not-base64';$variants+=,$v
$v=Envelope;$v.ciphertextBase64=('A'*65537);$variants+=,$v
foreach($variant in $variants){Check $variant $false}
Check (Envelope) $false $true
[ordered]@{acceptedWithoutDecryption=$true;refusals=12;actualInstallerBlock=$true;hostedAccess=$false;privateInputsLoaded=$false}|ConvertTo-Json -Compress
`);
      const powershell = path.join(process.env.WINDIR ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
      const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, root],
        { encoding: 'utf8', windowsHide: true, timeout: 15_000 });
      if (result.error || result.signal || result.stderr || result.status !== 0) throw new Error('synthetic_installer_envelope_gate_failed');
      expect(JSON.parse(result.stdout)).toEqual({ acceptedWithoutDecryption: true, refusals: 12,
        actualInstallerBlock: true, hostedAccess: false, privateInputsLoaded: false });
      expect(result.stdout).not.toContain(root);
      expect(result.stdout).not.toContain('AAECAw==');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});