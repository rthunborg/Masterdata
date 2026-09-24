import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

function workflowSections() {
  const workflow = readFileSync(resolve('.github/workflows/supabase-nightly-backup.yml'), 'utf8')
    .replace(/\r\n/g, '\n');
  const [beforeBackup, afterBackup = ''] = workflow.split('\n  backup-and-restore:');
  const [backup, alert = ''] = afterBackup.split('\n  backup-failure-alert:');
  return { workflow, gate: beforeBackup, backup, alert };
}

function extractExactCondition(section: string, name: string) {
  const match = section.match(/\n    if: ([^\n]+)\n/);
  if (!match) throw new Error(`Missing ${name} condition`);
  return match[1]!;
}

function extractExactFoldedCondition(section: string, name: string) {
  const match = section.match(/\n    if: >-\n([\s\S]*?)\n    runs-on:/);
  if (!match) throw new Error(`Missing ${name} folded condition`);
  return match[1]!.replace(/^      /gm, '');
}

function alertScript() {
  const { alert } = workflowSections();
  const marker = '          script: |\n';
  const start = alert.indexOf(marker);
  if (start < 0) throw new Error('Missing backup-failure alert script');
  return alert.slice(start + marker.length).replace(/^            /gm, '');
}

async function runAlertScript({
  listed = [],
  listError,
  failedJob = 'production-pause',
}: {
  listed?: Array<Record<string, unknown>>;
  listError?: Error;
  failedJob?: string;
} = {}) {
  const issues = {
    listForRepo: vi.fn(async () => {
      if (listError) throw listError;
      return { data: listed };
    }),
    getLabel: vi.fn(async () => ({ data: {} })),
    createLabel: vi.fn(async () => ({ data: {} })),
    createComment: vi.fn(async () => ({ data: {} })),
    create: vi.fn(async () => ({ data: {} })),
  };
  const core = { setFailed: vi.fn(), warning: vi.fn() };
  const execute = Object.getPrototypeOf(async () => {}).constructor(
    'github', 'context', 'core', 'process', alertScript()
  );
  await execute(
    { rest: { issues } },
    { serverUrl: 'https://github.example', repo: { owner: 'acme', repo: 'masterdata' }, runId: 123 },
    core,
    { env: { FAILED_JOB: failedJob } }
  );
  return { issues, core };
}

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
    const { workflow, gate, backup } = workflowSections();
    expect(workflow).toMatch(/\n  schedule:/);
    expect(workflow).toMatch(/\n  workflow_dispatch:/);
    expect(gate).toContain('node src/maintenance/backup-production-pause-guard.mjs >> "$GITHUB_OUTPUT"');
    expect(gate).toContain('backup_allowed: ${{ steps.pause.outputs.backup_allowed }}');
    expect(gate).toContain('source_sha: ${{ steps.source.outputs.source_sha }}');
    expect(gate).not.toContain('secrets.');
    expect(gate).not.toContain('environment: Production');
    expect(backup).toMatch(/^\r?\n    needs: production-pause\r?\n    if: needs.production-pause.result == 'success' && needs.production-pause.outputs.backup_allowed == 'true' && needs.production-pause.outputs.source_sha != ''/);
    expect(backup).toContain('environment: Production');
  });

  it('rejects manual branch and tag dispatches before a Production job can receive credentials', () => {
    const { gate, backup } = workflowSections();
    expect(extractExactCondition(gate, 'default-branch gate')).toBe(
      "github.ref == format('refs/heads/{0}', github.event.repository.default_branch)"
    );
    expect(extractExactCondition(backup, 'Production job')).toBe(
      "needs.production-pause.result == 'success' && needs.production-pause.outputs.backup_allowed == 'true' && needs.production-pause.outputs.source_sha != ''"
    );
  });

  it('checks the current default branch and pins the Production checkout to that exact gate source', () => {
    const { gate, backup } = workflowSections();
    expect(gate).toContain('ref: ${{ github.event.repository.default_branch }}');
    expect(gate).toContain('id: source');
    expect(gate).toContain('source_sha=$(git rev-parse HEAD)');
    expect(backup).toContain('ref: ${{ needs.production-pause.outputs.source_sha }}');
    expect(backup).not.toContain('ref: ${{ github.ref }}');
  });

  it('runs the independent alert only for actual gate or backup failures, never intentional skips', () => {
    const { alert } = workflowSections();
    expect(extractExactFoldedCondition(alert, 'failure alert')).toBe([
      'always() &&',
      "(needs.production-pause.result == 'failure' ||",
      " needs.backup-and-restore.result == 'failure')",
    ].join('\n'));
    expect(alert).not.toContain('actions/checkout');
    expect(alert).not.toContain('actions/setup-node');
    expect(alert).not.toContain('secrets.');
  });

  it('mock-executes the checked-in alert script, ignores labelled PRs, and appends only to an open issue', async () => {
    const { issues, core } = await runAlertScript({
      listed: [
        { number: 10, pull_request: { url: 'https://github.example/pr/10' } },
        { number: 11 },
      ],
      failedJob: 'backup-and-restore',
    });
    expect(issues.createComment).toHaveBeenCalledWith(expect.objectContaining({
      issue_number: 11,
      body: expect.stringContaining('- Failed job: backup-and-restore'),
    }));
    expect(issues.create).not.toHaveBeenCalled();
    expect(issues.getLabel).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('mock-executes the checked-in alert script to open one PII-free issue when none exists', async () => {
    const { issues, core } = await runAlertScript();
    expect(issues.getLabel).toHaveBeenCalledOnce();
    expect(issues.create).toHaveBeenCalledWith(expect.objectContaining({
      labels: ['backup-failure'],
      body: expect.stringContaining('- Failed job: production-pause'),
    }));
    const body = (issues.create.mock.calls[0]?.[0] as { body: string }).body;
    expect(body).not.toMatch(/postgres(?:ql)?:|SUPABASE_|GITHUB_TOKEN|@/i);
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('retains the established availability fallback when issue lookup fails', async () => {
    const { issues, core } = await runAlertScript({ listError: new Error('network unavailable') });
    expect(issues.create).toHaveBeenCalledOnce();
    expect(issues.createComment).not.toHaveBeenCalled();
    expect(core.warning).toHaveBeenCalledWith(
      'Could not list existing backup-failure issues; opening a new issue with deduplication skipped.'
    );
    expect(core.setFailed).not.toHaveBeenCalled();
  });
});
