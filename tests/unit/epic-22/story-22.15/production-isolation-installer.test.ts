import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
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
