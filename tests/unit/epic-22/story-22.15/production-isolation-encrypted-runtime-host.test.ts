import { mkdtempSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe.skipIf(process.platform !== 'win32')('encrypted isolation runtime host boundary', () => {
  it('reaches the actual leased runtime reader and rejects plaintext before worker or credential access', () => {
    const root = mkdtempSync(path.join(homedir(), 'hr-encrypted-runtime-host-'));
    try {
      const powershell = path.join(process.env.WINDIR ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
      const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
        path.resolve('tests/fixtures/story-22.15/isolation-encrypted-runtime-host.ps1'),
        path.resolve('src/lib/release'), root], { encoding: 'utf8', windowsHide: true, timeout: 30_000 });
      if (result.error || result.signal || result.stderr || result.status !== 0) throw new Error('synthetic_encrypted_runtime_host_gate_failed');
      expect(JSON.parse(result.stdout)).toEqual({ actualHostExecuted: true, heldLeaseStagePassed: true,
        runtimeReadReached: true, plaintextRefused: true, workerStarted: false, inputAccessorReached: false,
        apiAccessorReached: false, hostedAccess: false, privateInputsLoaded: false });
      expect(result.stdout).not.toMatch(/abcdefghijklmnopqrst|runtime\.json|ciphertextBase64/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 40_000);
});
