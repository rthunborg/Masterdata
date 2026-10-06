import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const windowsPowerShell = path.join(process.env.WINDIR ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');

describe.skipIf(process.platform !== 'win32')('encrypted isolation runtime admission', () => {
  it('admits only a DPAPI-protected, fully bound runtime record before input or API markers', () => {
    const fixture = mkdtempSync(path.join(tmpdir(), 'hr-encrypted-runtime-admission-'));
    try {
      const result = spawnSync(windowsPowerShell, [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
        path.resolve('tests/support/isolation-encrypted-runtime-admission.ps1'),
        path.resolve('src/lib/release'), fixture,
      ], { encoding: 'utf8', windowsHide: true, timeout: 40_000 });
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout.trim())).toEqual({
        compiled: true,
        validRuntimeAccepted: true,
        runtimeRefusals: 18,
        plaintextFallbackRefused: true,
        preCredentialMarkersUntouched: true,
        hostedAccess: false,
        privateInputsLoaded: false,
      });
      expect(result.stdout).not.toMatch(/ciphertextBase64|dpapi-current-user|192\.0\.2|198\.51\.100|abcdefghijklmnopqrst/);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  }, 45_000);
});