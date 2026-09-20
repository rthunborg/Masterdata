import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { backupAllowedByProductionPause } from './backup-production-pause-guard.mjs';

const script = resolve('src/maintenance/backup-production-pause-guard.mjs');
const roots: string[] = [];
function fixture(contents?: string) {
  const root = mkdtempSync(join(tmpdir(), 'hr-backup-pause-test-'));
  roots.push(root);
  const dir = join(root, 'src/maintenance');
  mkdirSync(dir, { recursive: true });
  if (contents !== undefined) writeFileSync(join(dir, 'production-pause-lock.json'), contents);
  return root;
}
function run(root: string, args: string[] = []) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root, encoding: 'utf8', windowsHide: true,
    env: { SYSTEMROOT: process.env.SYSTEMROOT, PATH: process.env.PATH },
  });
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('production backup and staging-refresh pause', () => {
  it('blocks the actual committed paused candidate', () => {
    expect(backupAllowedByProductionPause()).toBe(false);
    const r = run(process.cwd());
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('backup_allowed=false\n');
  });
  it('allows only a valid recorded reopening decision', () => {
    const root = fixture(JSON.stringify({ version: 1, state: 'reopening-authorized', purpose: 'synthetic fixture', reopeningDecision: 'Synthetic explicit decision' }));
    const r = run(root);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('backup_allowed=true\n');
  });
  it.each([undefined, '{', 'null', '{}', JSON.stringify({ version: 2, state: 'paused', purpose: 'fixture' }), ...['', ' ', '\t', 'invalid\nrecord'].map(reopeningDecision => JSON.stringify({ version: 1, state: 'reopening-authorized', purpose: 'fixture', reopeningDecision }))])('fails closed on absent or invalid lock %s', contents => {
    const r = run(fixture(contents));
    expect(r.status).toBe(1);
    expect(r.stdout).not.toContain('backup_allowed=true');
    expect(r.stderr).toBe('Backup and staging refresh refused: production pause lock is unavailable or invalid.\n');
  });
  it('does not accept a command-line bypass', () => {
    const r = run(process.cwd(), ['--allow']);
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('');
  });
  it('gates the complete secret-bearing job for both workflow triggers', () => {
    const workflow = readFileSync(resolve('.github/workflows/supabase-nightly-backup.yml'), 'utf8');
    expect(workflow).toMatch(/\n  schedule:/);
    expect(workflow).toMatch(/\n  workflow_dispatch:/);
    const [gate, operation] = workflow.split('\n  backup-and-restore:');
    expect(gate).toContain('node src/maintenance/backup-production-pause-guard.mjs >> "$GITHUB_OUTPUT"');
    expect(gate).toContain('backup_allowed: ${{ steps.pause.outputs.backup_allowed }}');
    expect(gate).not.toContain('secrets.');
    expect(gate).not.toContain('environment: Production');
    expect(operation).toMatch(/^\r?\n    needs: production-pause\r?\n    if: needs.production-pause.outputs.backup_allowed == 'true'/);
    expect(operation).toContain('environment: Production');
  });
});
