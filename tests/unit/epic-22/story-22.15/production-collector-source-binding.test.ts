import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

const project = path.resolve('.');
const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex');

function git(workspace: string, ...args: string[]) {
  const result = spawnSync('git', ['-C', workspace, ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'git failed');
  return result.stdout.trim();
}

function approvedGit() {
  const command = process.platform === 'win32' ? 'where.exe' : 'which';
  const executable = spawnSync(command, ['git'], { encoding: 'utf8' }).stdout
    .split(/\r?\n/u).find(Boolean)?.trim();
  if (!executable) throw new Error('Git executable is unavailable');
  return { gitExecutable: executable, expectedGitSha256: sha256(readFileSync(executable)) };
}

function projection() {
  return {
    routine: {
      signature: 'public.update_staffing_need(text,integer,uuid)', exactOverloadCount: 1, owner: 'postgres',
      language: 'plpgsql', kind: 'function', securityDefiner: false, config: null,
      nonOwnerExecuteGrantees: ['PUBLIC', 'anon', 'authenticated', 'service_role'], nonOwnerExecuteGrantOptions: false,
      nonExecuteAclPrivileges: false, returnShape: 'TABLE(old_value integer,new_value integer)',
      inputArguments: [{ mode: 'IN', name: 'p_location', type: 'text' }, { mode: 'IN', name: 'p_new_value', type: 'integer' }, { mode: 'IN', name: 'p_user_id', type: 'uuid' }],
      outputArguments: [{ mode: 'OUT', name: 'old_value', type: 'integer' }, { mode: 'OUT', name: 'new_value', type: 'integer' }],
      volatility: 'volatile', parallel: 'unsafe', strict: false, leakproof: false,
    },
    dependencies: {
      staffingNeedsColumns: [{ name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' }, { name: 'location', type: 'text', nullable: false, default: null }, { name: 'headcount_need', type: 'integer', nullable: false, default: '0' }, { name: 'updated_at', type: 'timestamp with time zone', nullable: false, default: 'now()' }, { name: 'updated_by', type: 'uuid', nullable: true, default: null }],
      staffingChangelogColumns: [{ name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' }, { name: 'location', type: 'text', nullable: false, default: null }, { name: 'old_value', type: 'integer', nullable: false, default: null }, { name: 'new_value', type: 'integer', nullable: false, default: null }, { name: 'changed_by', type: 'uuid', nullable: false, default: null }, { name: 'changed_at', type: 'timestamp with time zone', nullable: false, default: 'now()' }],
      staffingNeedsPrimaryKey: true, staffingNeedsLocationUnique: true, staffingNeedsLocationCheck: true, staffingNeedsHeadcountCheck: true,
      staffingNeedsUpdatedByUsersForeignKey: true, staffingChangelogPrimaryKey: true, staffingChangelogChangedByUsersForeignKey: true,
      bothTablesRlsEnabled: true, outOfRangeHeadcountCount: 0,
    },
    bodyProvenance: { kind: 'non_admitted_sha256', sha256: '0'.repeat(64) },
  };
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'hr-collector-source-'));
  const workspace = path.join(root, 'source');
  mkdirSync(workspace);
  cpSync(path.join(project, 'src'), path.join(workspace, 'src'), { recursive: true });
  mkdirSync(path.join(workspace, 'supabase', 'verify'), { recursive: true });
  cpSync(path.join(project, 'supabase', 'migrations'), path.join(workspace, 'supabase', 'migrations'), { recursive: true });
  cpSync(path.join(project, 'supabase', 'migration-baseline-manifest.json'), path.join(workspace, 'supabase', 'migration-baseline-manifest.json'));
  cpSync(path.join(project, 'package.json'), path.join(workspace, 'package.json'));
  cpSync(path.join(project, 'pnpm-lock.yaml'), path.join(workspace, 'pnpm-lock.yaml'));
  cpSync(path.join(project, '.gitattributes'), path.join(workspace, '.gitattributes'));
  const psql = path.join(workspace, 'reviewed-psql.cmd');
  const marker = path.join(workspace, 'psql-invoked.txt');
  writeFileSync(psql, `@echo off\r\necho invoked>"${marker}"\r\necho ${JSON.stringify(projection())}\r\n`);
  writeFileSync(path.join(workspace, 'supabase', 'verify', 'run-reviewed-supabase-cli.mjs'), 'export const verifyApprovedSupabaseCliExecutable=()=>true;\n');
  writeFileSync(path.join(workspace, 'supabase', 'verify', 'verify-production-baseline-catalog.mjs'), `export const verifyApprovedPsqlExecutable=()=>${JSON.stringify(psql)}; export const verifyApprovedSslRootCertificate=()=>${JSON.stringify(path.join(workspace, 'ca.pem'))};\n`);
  writeFileSync(path.join(workspace, 'supabase', 'verify', 'verify-target-binding.mjs'), 'export const verifyConfiguredSupabaseTarget=async()=>true;\n');
  writeFileSync(path.join(workspace, 'ca.pem'), 'synthetic');
  git(workspace, 'init', '-q');
  git(workspace, 'config', 'core.autocrlf', 'true');
  git(workspace, 'config', 'user.email', 'test@example.invalid');
  git(workspace, 'config', 'user.name', 'Test');
  git(workspace, 'add', '-A');
  git(workspace, 'commit', '-qm', 'source');
  git(workspace, 'checkout-index', '--all', '--force');
  const sourceSha = git(workspace, 'rev-parse', 'HEAD');
  const sourceTree = git(workspace, 'rev-parse', 'HEAD^{tree}');
  const sourceManifestSha256 = sha256(readFileSync(path.join(workspace, 'supabase', 'migration-baseline-manifest.json')));
  return { root, workspace, marker, source: { sourceSha, sourceTree, sourceManifestSha256 }, sourceOptions: { commit: sourceSha, ...approvedGit() } };
}

function runFixture(workspace: string, body: string, environment: Record<string, string> = {}) {
  const runner = path.join(path.dirname(workspace), 'source-binding-runner.mjs');
  writeFileSync(runner, body.replaceAll("'./src", "'./source/src"));
  const result = spawnSync(process.execPath, [runner], {
    cwd: workspace,
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  });
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr };
}

const fixtures: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); while (fixtures.length) rmSync(fixtures.pop()!, { recursive: true, force: true }); });

describe('production collector source binding', () => {
  it('keeps collector queries and dependency declarations identical to Git in a CRLF-default checkout', () => {
    const value = fixture(); fixtures.push(value.root);
    for (const file of ['src/lib/release/production-staffing-pre-execute.sql', 'src/lib/release/production-database-writer-classification.sql', 'src/lib/release/production-observed-schema.sql', 'src/lib/release/production-observed-aggregate.sql', 'package.json', 'pnpm-lock.yaml']) {
      const result = spawnSync('git', ['-C', value.workspace, 'show', value.source.sourceSha + ':' + file]);
      expect(result.status).toBe(0);
      expect(readFileSync(path.join(value.workspace, file))).toEqual(result.stdout);
    }
    expect(git(value.workspace, 'config', 'core.autocrlf')).toBe('true');
    expect(git(value.workspace, 'status', '--porcelain')).toBe('');
  }, 60_000);

  it('rejects dirty or assume-unchanged substituted SQL/code and forged source claims before psql', async () => {
    const value = fixture(); fixtures.push(value.root);
    const collectorPath = path.join(value.workspace, 'src/lib/release/collect-production-staffing-pre-execute.mjs');
    const options = { workspace: value.workspace, source: value.source, sourceOptions: value.sourceOptions, moduleUrl: pathToFileURL(collectorPath).href,
      moduleRelative: 'src/lib/release/collect-production-staffing-pre-execute.mjs', sourceRelatives: ['src/lib/release/collect-production-staffing-pre-execute.mjs', 'src/lib/release/production-staffing-pre-execute.sql', 'src/lib/release/production-collector-source-binding.mjs', 'src/lib/release/prepare-forward-subset.mjs', 'supabase/migration-baseline-manifest.json', 'package.json', 'pnpm-lock.yaml'], sqlRelatives: ['src/lib/release/production-staffing-pre-execute.sql'] };
    const invoke = (input: unknown) => runFixture(value.workspace, `import {bindProductionCollectorSource} from './src/lib/release/production-collector-source-binding.mjs';\nconst options=${JSON.stringify(input)};\ntry { process.stdout.write(JSON.stringify(bindProductionCollectorSource(options).source)); } catch (error) { process.stderr.write(String(error.stack)); process.exitCode=1; }`);
    const valid = invoke(options);
    if (valid.status !== 0) throw new Error(valid.stderr);
    expect(valid.stdout).toBe(JSON.stringify(value.source));
    expect(invoke({ ...options, source: {
      sourceSha: '0'.repeat(40), sourceTree: '0'.repeat(40), sourceManifestSha256: '0'.repeat(64), sqlSha256: '0'.repeat(64),
    } }).status).toBe(1);
    const sqlPath = path.join(value.workspace, 'src/lib/release/production-staffing-pre-execute.sql');
    git(value.workspace, 'update-index', '--assume-unchanged', 'src/lib/release/production-staffing-pre-execute.sql');
    writeFileSync(sqlPath, `${readFileSync(sqlPath, 'utf8')}-- substituted\n`);
    expect(git(value.workspace, 'status', '--porcelain')).toBe('');
    expect(invoke(options).status).toBe(1);
    expect(existsSync(value.marker)).toBe(false);
  }, 60_000);

  it('rejects an assume-unchanged substituted collector module and a mismatched module URL before psql', () => {
    const value = fixture(); fixtures.push(value.root);
    const collectorPath = path.join(value.workspace, 'src/lib/release/collect-production-staffing-pre-execute.mjs');
    const options = { workspace: value.workspace, source: value.source, sourceOptions: value.sourceOptions, moduleUrl: pathToFileURL(collectorPath).href,
      moduleRelative: 'src/lib/release/collect-production-staffing-pre-execute.mjs', sourceRelatives: ['src/lib/release/collect-production-staffing-pre-execute.mjs', 'src/lib/release/production-staffing-pre-execute.sql', 'src/lib/release/production-collector-source-binding.mjs', 'src/lib/release/prepare-forward-subset.mjs', 'supabase/migration-baseline-manifest.json', 'package.json', 'pnpm-lock.yaml'], sqlRelatives: ['src/lib/release/production-staffing-pre-execute.sql'] };
    const invoke = (input: unknown) => runFixture(value.workspace, `import {bindProductionCollectorSource} from './src/lib/release/production-collector-source-binding.mjs';\ntry { bindProductionCollectorSource(${JSON.stringify(input)}); } catch { process.exitCode=1; }`);
    expect(invoke({ ...options, moduleUrl: pathToFileURL(path.join(value.workspace, 'src/lib/release/production-observed-profile.mjs')).href }).status).toBe(1);
    git(value.workspace, 'update-index', '--assume-unchanged', 'src/lib/release/collect-production-staffing-pre-execute.mjs');
    writeFileSync(collectorPath, `${readFileSync(collectorPath, 'utf8')}\n// substituted\n`);
    expect(git(value.workspace, 'status', '--porcelain')).toBe('');
    expect(invoke(options).status).toBe(1);
    expect(existsSync(value.marker)).toBe(false);
  }, 60_000);

  it('runs a valid synthetic public staffing collector only from raw-Git verified SQL', async () => {
    const value = fixture(); fixtures.push(value.root);
    const result = runFixture(value.workspace, `import {createRequire,syncBuiltinESMExports} from 'node:module';\nimport {writeFileSync} from 'node:fs';\nconst childProcess=createRequire(import.meta.url)('node:child_process'),psql=${JSON.stringify(path.join(value.workspace, 'reviewed-psql.cmd'))},marker=${JSON.stringify(value.marker)},stdout=${JSON.stringify(`${JSON.stringify(projection())}\n`)};\nconst original=childProcess.spawnSync;childProcess.spawnSync=(executable,...rest)=>executable===psql?(writeFileSync(marker,'invoked'),{status:0,stdout,stderr:''}):original(executable,...rest);syncBuiltinESMExports();\nconst {collectProductionStaffingPreExecute}=await import('./source/src/lib/release/collect-production-staffing-pre-execute.mjs');\nconst source=${JSON.stringify(value.source)},sourceOptions=${JSON.stringify(value.sourceOptions)};\nconst receipt=await collectProductionStaffingPreExecute({workspace:${JSON.stringify(value.workspace)},source,sourceOptions,now:()=>new Date('2026-09-28T12:00:00.000Z')});\nprocess.stdout.write(JSON.stringify(receipt));`, {
      EXPECTED_SUPABASE_ENVIRONMENT: 'production',
      SUPABASE_DB_CONNECTION_MODE: 'session-pooler',
      EXPECTED_SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
      SUPABASE_DB_URL: 'postgresql://postgres:synthetic@pooler.invalid:5432/postgres?sslmode=verify-full',
    });
    if (result.status !== 0) throw new Error(result.stderr);
    const receipt = JSON.parse(result.stdout);
    expect(existsSync(value.marker)).toBe(true);
    expect(receipt).toMatchObject({ hostedWriteAttempted: false, observation: { ...value.source } });
  }, 60_000);
});
