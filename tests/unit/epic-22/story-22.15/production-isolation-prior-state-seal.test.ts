import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const powerShell = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const sealSource = path.resolve('src/lib/release/production-isolation-prior-state-seal.ps1');

describe.skipIf(process.platform !== 'win32')('production isolation prior-state DPAPI sealer', () => {
  it('uses a fixed host root, CurrentUser DPAPI, immutable CreateNew output, and redacted receipts', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hr-masterdata-seal-test-'));
    const harness = path.join(root, 'synthetic-seal.ps1');
    const context = JSON.stringify({ sourceSha: 'a'.repeat(40), targetBindingSha256: 'b'.repeat(64), isolationPlanSha256: 'c'.repeat(64) });
    const prior = JSON.stringify({ auth: { token: 'synthetic-secret' }, realtime: { suspend: false }, postgrest: { db_schema: 'public' }, networkRestrictions: { dbAllowedCidrs: [] } });
    const escapedRoot = path.join(root, 'fixed-private-output').replaceAll("'", "''");
    const escapedSource = sealSource.replaceAll("'", "''");
    writeFileSync(harness, `
$ErrorActionPreference='Stop'
$harnessStage='installation'
try {
Add-Type -TypeDefinition @'
namespace HrMasterdata.Release { public static class Installation { public static string PriorStateRoot { get { return @"${escapedRoot}"; } } } }
'@
$harnessStage='source-load'
. '${escapedSource}'
$harnessStage='sealer-call'
function Get-Context { return [Text.Encoding]::UTF8.GetBytes('${context.replaceAll("'", "''")}') }
function Get-Prior { return [Text.Encoding]::UTF8.GetBytes('${prior.replaceAll("'", "''")}') }
$harnessStage='first-seal'
$receipt = Invoke-ProductionIsolationPriorStateSeal -ContextUtf8 (Get-Context) -PriorStateUtf8 (Get-Prior) | ConvertFrom-Json
$harnessStage='before-hash'
$files=[IO.Directory]::GetFiles([HrMasterdata.Release.Installation]::PriorStateRoot)
if($files.Length -ne 1){throw 'synthetic_file_inventory_failed'}
$h=[Security.Cryptography.SHA256]::Create()
try{$before=[BitConverter]::ToString($h.ComputeHash([IO.File]::ReadAllBytes($files[0])))}finally{$h.Dispose()}
$harnessStage='second-seal'
$duplicateRefused = $false; try { Invoke-ProductionIsolationPriorStateSeal -ContextUtf8 (Get-Context) -PriorStateUtf8 (Get-Prior) | Out-Null } catch { $duplicateRefused = $_.Exception.Message -match '^production_isolation_prior_state_seal_refused:atomic-create' }
$harnessStage='metadata-negative'
$badContext = [Text.Encoding]::UTF8.GetBytes('{ "sourceSha":"bad", "targetBindingSha256":"${'b'.repeat(64)}", "isolationPlanSha256":"${'c'.repeat(64)}" }')
$metadataRefused = $false; try { Invoke-ProductionIsolationPriorStateSeal -ContextUtf8 $badContext -PriorStateUtf8 (Get-Prior) | Out-Null } catch { $metadataRefused = $_.Exception.Message -eq 'production_isolation_prior_state_seal_refused:schema' }
$harnessStage='oversize-negative'
$oversizedRefused = $false; try { Invoke-ProductionIsolationPriorStateSeal -ContextUtf8 (Get-Context) -PriorStateUtf8 (New-Object byte[] 65537) | Out-Null } catch { $oversizedRefused = $_.Exception.Message -eq 'production_isolation_prior_state_seal_refused:schema' }
$harnessStage='after-hash'
$h=[Security.Cryptography.SHA256]::Create()
try{$after=[BitConverter]::ToString($h.ComputeHash([IO.File]::ReadAllBytes($files[0])))}finally{$h.Dispose()}
$harnessStage='final-receipt'
[ordered]@{ receipt=$receipt; duplicateRefused=$duplicateRefused; metadataRefused=$metadataRefused; oversizedRefused=$oversizedRefused; unchangedAfterRefusals=($before -ceq $after); fileCount=[IO.Directory]::GetFiles([HrMasterdata.Release.Installation]::PriorStateRoot).Length } | ConvertTo-Json -Compress
} catch {
  $sealerStage='unclassified'
  if($_.Exception.Message -match '^production_isolation_prior_state_seal_refused:(schema|root-integrity|encrypt|atomic-create|self-test)$'){$sealerStage=$Matches[1]}
  $failureKind='other'
  if($_.FullyQualifiedErrorId -match 'ParameterBinding|ArgumentTransformation|CannotConvert'){$failureKind='argument-binding'}
  elseif($_.FullyQualifiedErrorId -eq 'MethodException'){$failureKind='method-overload'}
  elseif($_.FullyQualifiedErrorId -match 'TypeNotFound'){$failureKind='type-loading'}
  elseif($_.Exception.GetBaseException() -is [Security.Cryptography.CryptographicException]){$failureKind='cryptographic'}
  elseif($_.Exception.GetBaseException() -is [IO.IOException]){$failureKind='file-io'}
  $sourceFailureLine=0
  if($_.ScriptStackTrace -match 'production-isolation-prior-state-seal\.ps1:\s*(?:line\s*)?(\d+)'){$sourceFailureLine=[int]$Matches[1]}
  [ordered]@{failed=$true;harnessStage=$harnessStage;sealerStage=$sealerStage;failureKind=$failureKind;sourceFailureLine=$sourceFailureLine}|ConvertTo-Json -Compress
  exit 1
}
`);
    try {
      const result = spawnSync(powerShell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', harness], { encoding: 'utf8', timeout: 30_000, windowsHide: true });
      // Never let assertion formatting echo native exception text or paths.
      if (result.stderr || result.status !== 0 || result.signal || result.error) {
        const stage = result.stderr?.match(/production_isolation_prior_state_seal_refused:(schema|root-integrity|encrypt|atomic-create|self-test)/u)?.[1] ?? 'before-seal';
        const nativeCode = Number.isSafeInteger(result.status) ? String(result.status) : 'unknown';
        let harnessStage = 'unclassified'; let sealerStage = stage; let failureKind = 'other'; let sourceLine = 0;
        try { const safe = JSON.parse(result.stdout); if (['installation', 'source-load', 'sealer-call','first-seal','before-hash','second-seal','metadata-negative','oversize-negative','after-hash','final-receipt'].includes(safe.harnessStage)) harnessStage = safe.harnessStage; if (['schema', 'root-integrity', 'encrypt', 'atomic-create', 'self-test', 'unclassified'].includes(safe.sealerStage)) sealerStage = safe.sealerStage; if (['other','argument-binding','method-overload','type-loading','cryptographic','file-io'].includes(safe.failureKind)) failureKind = safe.failureKind; if (Number.isSafeInteger(safe.sourceFailureLine) && safe.sourceFailureLine >= 0 && safe.sourceFailureLine <= 200) sourceLine = safe.sourceFailureLine; } catch {}
        throw new Error('synthetic_sealer_failed_stage_' + sealerStage + '_harness_' + harnessStage + '_kind_' + failureKind + '_line_' + sourceLine + '_native_' + nativeCode);
      }
      expect(result.status).toBe(0);
      const output = JSON.parse(result.stdout) as { receipt: Record<string, unknown>; duplicateRefused: boolean; metadataRefused: boolean; oversizedRefused: boolean; fileCount: number };
      expect(output).toMatchObject({ duplicateRefused: true, metadataRefused: true, oversizedRefused: true, unchangedAfterRefusals: true, fileCount: 1 });
      expect(output.receipt).toMatchObject({ kind: 'production-isolation-prior-state-sealed', encrypted: true, immutable: true, sourceSha: 'a'.repeat(40) });
      expect(output.receipt.ciphertextSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(JSON.stringify(output)).not.toContain('synthetic-secret');
      const files = readFileSync(path.join(root, 'fixed-private-output', readdirSync(path.join(root, 'fixed-private-output'))[0]));
      expect(files.toString('utf8')).not.toContain('synthetic-secret');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
