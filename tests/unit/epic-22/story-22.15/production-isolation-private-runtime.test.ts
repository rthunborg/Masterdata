import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const powershell = path.join(process.env.WINDIR ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
describe.skipIf(process.platform !== 'win32')('isolation native private capability parser', () => {
  it('compiles the actual helper and rejects mismatched roles, projects, types, duplicates and record hashes offline', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hr-isolation-private-parser-'));
    try {
      const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
        path.resolve('tests/fixtures/story-22.15/isolation-private-runtime.ps1'),
        path.resolve('src/lib/release'), root], { encoding: 'utf8', windowsHide: true, timeout: 30_000 });
      if (result.status !== 0 || result.stderr || result.error || result.signal) throw new Error('synthetic_private_runtime_gate_failed');
      expect(JSON.parse(result.stdout)).toEqual({ compiled: true, parserPassed: true, keyRefusals: 5,
        targetRefusedBeforeCredentials: true, recordHashRefused: true, hostedAccess: false, privateInputsLoaded: false });
      expect(result.stdout).not.toMatch(/abcdefghijklmnopqrst|api_key|signature/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 40_000);
});
