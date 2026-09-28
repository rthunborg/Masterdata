import { createHash, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const repository = path.resolve('.');
const roots: string[] = [];
const versions = ['20260314000001', '20260314000002', '20260614000000', '20260615000000', '20260709194903', '20260710144000', '20260710150000', '20260831200026', '20260909115242', '20260910094517', '20260910115024', '20260910184840', '20260910184841'];

function copy(root: string, relative: string) {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(path.join(repository, relative)));
}

function sandbox() {
  const root = mkdtempSync(path.join(tmpdir(), 'hr-cutover-executor-'));
  roots.push(root);
  for (const file of ['supabase/verify/run-reviewed-supabase-cli.mjs', 'supabase/migration-baseline-manifest.json', 'tests/support/production-isolation-evidence-fixture.mjs', 'src/lib/release/production-staffing-pre-execute-contract.mjs', 'src/lib/release/production-isolation-gate.mjs', 'src/lib/release/production-observed-profile.mjs', 'src/lib/release/production-bootstrap-admission.mjs', 'src/lib/release/production-managed-writer-profiles.mjs']) copy(root, file);
  for (const file of ['supabase/verify/verify-target-binding.mjs', 'supabase/verify/verify-production-baseline-catalog.mjs']) {
    const target = path.join(root, file); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, 'export {};');
  }
  const cli = path.join(root, 'reviewed-cli'); writeFileSync(cli, 'synthetic executable identity');
  const cliHash = createHash('sha256').update(readFileSync(cli)).digest('hex');
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  writeFileSync(path.join(root, 'bootstrap-origin.json'), JSON.stringify(keys.publicKey.export({ format: 'jwk' })));
  writeFileSync(path.join(root, 'bootstrap-private.json'), JSON.stringify(keys.privateKey.export({ format: 'jwk' })));
  const migrations = path.join(repository, 'supabase', 'migrations');
  const plan = versions.map((version) => {
    const file = readdirSync(migrations).find((entry) => entry.startsWith(`${version}_`));
    if (!file) throw new Error(`missing test migration ${version}`);
    return { version, file, gitBlob: 'a'.repeat(40), sha256: createHash('sha256').update(readFileSync(path.join(migrations, file))).digest('hex') };
  });
  writeFileSync(path.join(root, 'toolchain-package.json'), JSON.stringify({ kind: 'offline-protected-production-cutover-package', schemaVersion: 1, sourceCommit: 'a'.repeat(40), sourceTree: 'b'.repeat(40), sourceManifestSha256: 'c'.repeat(64), plan }));
  writeFileSync(path.join(root, 'hook.mjs'), `
import { register } from 'node:module';
const OriginalDate=Date; let clock='2026-09-23T14:10:00.000Z';
globalThis.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:[clock]))}static now(){return new OriginalDate(clock).getTime()}static advanceClock(){clock='2026-09-23T14:30:01.000Z'}};
register(new URL('./loader.mjs', import.meta.url), import.meta.url);`);
  // Async load hooks are available in the CI Node 20 runtime as well as the
  // pinned protected-toolchain runtime. Returned modules execute in the main
  // realm, sharing the synthetic clock/call log without changing real source.
  writeFileSync(path.join(root, 'loader.mjs'), `
const module=(source)=>({format:'module',shortCircuit:true,source});
export function load(url,context,next){
 if(url==='node:child_process')return module(\`const files=${JSON.stringify(plan.map((entry) => entry.file))};export function spawnSync(exe,args){globalThis.calls??=[];globalThis.calls.push(args);if(args[0]==='--version')return {status:0,stdout:'2.115.0'+String.fromCharCode(10),stderr:''};if(args.includes('--dry-run')){const mode=process.env.DRY_CASE;const list=mode==='omitted'?files.slice(1):mode==='extra'?[...files,'20990101010101_extra.sql']:files;if(process.env.APPLY_CASE==='stale-after-dry')globalThis.Date.advanceClock();return {status:0,stdout:list.map(file=>\\\`Applying migration \\\${file}\\\`).join(String.fromCharCode(10)),stderr:''}}if(process.env.APPLY_CASE==='nonzero')return {status:1,stdout:'',stderr:'synthetic apply failure'};if(process.env.APPLY_CASE==='timeout')return {error:new Error('synthetic timeout')};return {status:0,stdout:'',stderr:''}}\`);
 if(url.endsWith('/verify-target-binding.mjs'))return module('export async function verifyConfiguredSupabaseTarget(){}');
 if(url.endsWith('/verify-production-baseline-catalog.mjs'))return module('export function verifyApprovedSslRootCertificate(){return "synthetic-ca"}');
 return next(url,context)}`);
  const harness = `
import {createPrivateKey,sign} from 'node:crypto';import {readFileSync} from 'node:fs';
import {createProtectedProductionCutoverExecutor,runReviewedSupabaseCli} from './supabase/verify/run-reviewed-supabase-cli.mjs';
import {createValidManagedIsolationEvidenceFixture,rebindManagedIsolationEvidenceFixture} from './tests/support/production-isolation-evidence-fixture.mjs';
import {PRODUCTION_OBSERVED_PROFILE_BASELINE as baseline,PRODUCTION_OBSERVED_PROFILE_SOURCE_SHA as baselineSourceSha,productionTargetBindingSha256} from './src/lib/release/production-observed-profile.mjs';
import * as staffing from './src/lib/release/production-staffing-pre-execute-contract.mjs';
const sourceSha='a'.repeat(40),sourceTree='b'.repeat(40),sourceManifestSha256='c'.repeat(64),targetBindingSha256=productionTargetBindingSha256('abcdefghijklmnopqrst'),nonce='${'0'.repeat(64)}',root=${JSON.stringify(root)};
const fixture=createValidManagedIsolationEvidenceFixture(),{isolationReceipts,isolationContext}=fixture;rebindManagedIsolationEvidenceFixture(fixture,{sourceSha,sourceTree,sourceManifestSha256,targetBindingSha256});Object.assign(isolationReceipts.database.managedWriterObservation,{collectionStartedAtUtc:'2026-09-23T14:05:10.000Z',capturedAtUtc:'2026-09-23T14:05:30.000Z'});Object.assign(isolationReceipts.database,{collectionStartedAtUtc:'2026-09-23T14:06:00.000Z',capturedAtUtc:'2026-09-23T14:06:01.000Z'});Object.assign(isolationReceipts.drain,{collectionStartedAtUtc:'2026-09-23T14:07:00.000Z',capturedAtUtc:'2026-09-23T14:07:01.000Z'});const preForwardObservation={schemaVersion:1,kind:'production-observed-profile',profilePhase:'post_cleanup',capturedAtUtc:'2026-09-23T14:05:00.000Z',sourceSha,baselineSourceSha,targetBindingSha256,...structuredClone(baseline)};Object.assign(preForwardObservation.aggregate.saved_filter_data,{total_count:0,orphan_auth_reference_count:0,row_identity_sha256:'4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945'});
const staffingReceipt={schemaVersion:1,kind:'production-staffing-pre-execute-observation',environment:'production',sourceSha,sourceTree,sourceManifestSha256,targetBindingSha256,capturedAtUtc:'2026-09-23T14:05:00.000Z',routine:{signature:staffing.PRODUCTION_STAFFING_PRE_EXECUTE_SIGNATURE,exactOverloadCount:1,owner:'postgres',language:'plpgsql',kind:'function',securityDefiner:false,config:null,nonOwnerExecuteGrantees:[...staffing.PRODUCTION_STAFFING_PRE_EXECUTE_GRANTEES],nonOwnerExecuteGrantOptions:false,nonExecuteAclPrivileges:false,returnShape:staffing.PRODUCTION_STAFFING_PRE_EXECUTE_RETURN_SHAPE,inputArguments:staffing.PRODUCTION_STAFFING_PRE_EXECUTE_INPUT_ARGUMENTS.map(x=>({...x})),outputArguments:staffing.PRODUCTION_STAFFING_PRE_EXECUTE_OUTPUT_ARGUMENTS.map(x=>({...x})),volatility:'volatile',parallel:'unsafe',strict:false,leakproof:false},dependencies:{staffingNeedsColumns:[{name:'id',type:'uuid',nullable:false,default:'gen_random_uuid()'},{name:'location',type:'text',nullable:false,default:null},{name:'headcount_need',type:'integer',nullable:false,default:'0'},{name:'updated_at',type:'timestamp with time zone',nullable:false,default:'now()'},{name:'updated_by',type:'uuid',nullable:true,default:null}],staffingChangelogColumns:[{name:'id',type:'uuid',nullable:false,default:'gen_random_uuid()'},{name:'location',type:'text',nullable:false,default:null},{name:'old_value',type:'integer',nullable:false,default:null},{name:'new_value',type:'integer',nullable:false,default:null},{name:'changed_by',type:'uuid',nullable:false,default:null},{name:'changed_at',type:'timestamp with time zone',nullable:false,default:'now()'}],staffingNeedsPrimaryKey:true,staffingNeedsLocationUnique:true,staffingNeedsLocationCheck:true,staffingNeedsHeadcountCheck:true,staffingNeedsUpdatedByUsersForeignKey:true,staffingChangelogPrimaryKey:true,staffingChangelogChangedByUsersForeignKey:true,bothTablesRlsEnabled:true,outOfRangeHeadcountCount:0},bodyProvenance:{kind:'non_admitted_sha256',sha256:'1'.repeat(64)}};
const environment={EXPECTED_SUPABASE_ENVIRONMENT:'production',EXPECTED_SUPABASE_PROJECT_REF:'abcdefghijklmnopqrst',SUPABASE_DB_CONNECTION_MODE:'session-pooler',EXPECTED_SUPABASE_POOLER_HOST:'synthetic',SUPABASE_DB_URL:'postgresql:///postgres',SUPABASE_SSL_ROOT_CERT:'synthetic',EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256:'e'.repeat(64),SUPABASE_CLI_EXECUTABLE:${JSON.stringify(cli)},EXPECTED_SUPABASE_CLI_SHA256:${JSON.stringify(cliHash)},SystemRoot:'C:\\\\Windows',WINDIR:'C:\\\\Windows',PATH:'C:\\\\Windows\\\\System32'};
const request={schemaVersion:1,operation:'apply-forward-13',nonce,workspace:root,environment,sourceSha,sourceTree,sourceManifestSha256,targetBindingSha256,staffingReceipt,isolationReceipts,isolationContext,preForwardObservation,reviewRecords:{backupRecordSha256:'3'.repeat(64),cleanupRecordSha256:'4'.repeat(64),cleanupCompletedAtUtc:'2026-09-23T14:04:00.000Z'}};
if(process.env.PACKET_CASE==='stale')request.preForwardObservation.capturedAtUtc='2026-09-23T13:00:00.000Z';if(process.env.PACKET_CASE==='wrong-profile')request.preForwardObservation.profilePhase='pre_cleanup';if(process.env.PACKET_CASE==='wrong-context')request.isolationContext.sourceTree='9'.repeat(40);if(process.env.PACKET_CASE==='target-swap')request.targetBindingSha256='9'.repeat(64);if(process.env.PACKET_CASE==='cleanup-missing')delete request.reviewRecords.cleanupCompletedAtUtc;if(process.env.PACKET_CASE==='cleanup-noncanonical')request.reviewRecords.cleanupCompletedAtUtc='2026-09-23 14:04:00Z';if(process.env.PACKET_CASE==='cleanup-future')request.reviewRecords.cleanupCompletedAtUtc='2026-09-23T14:11:00.000Z';if(process.env.PACKET_CASE==='profile-at-cleanup')request.preForwardObservation.capturedAtUtc='2026-09-23T14:04:00.000Z';if(process.env.PACKET_CASE==='staffing-before-cleanup')request.staffingReceipt.capturedAtUtc='2026-09-23T14:03:59.000Z';if(process.env.PACKET_CASE==='managed-missing')delete request.isolationReceipts.database.managedWriterObservation;if(process.env.PACKET_CASE==='managed-precleanup')request.isolationReceipts.database.managedWriterObservation.collectionStartedAtUtc='2026-09-23T14:04:00.000Z';if(process.env.PACKET_CASE==='managed-overlap')request.isolationReceipts.database.managedWriterObservation.capturedAtUtc='2026-09-23T14:06:00.000Z';if(process.env.PACKET_CASE==='database-overlap')request.isolationReceipts.database.collectionStartedAtUtc='2026-09-23T14:05:00.000Z';if(process.env.PACKET_CASE==='drain-overlap')request.isolationReceipts.drain.collectionStartedAtUtc='2026-09-23T14:06:01.000Z';if(process.env.PACKET_CASE==='stale-database')request.isolationReceipts.database.capturedAtUtc='2026-09-23T13:00:00.000Z';if(process.env.PACKET_CASE==='stale-drain')request.isolationReceipts.drain.capturedAtUtc='2026-09-23T13:00:00.000Z';
const payload=Buffer.from(JSON.stringify(request));let packet=JSON.stringify({payload:payload.toString('base64'),signature:sign('RSA-SHA256',payload,createPrivateKey({key:JSON.parse(readFileSync(root+'/bootstrap-private.json','utf8')),format:'jwk'})).toString('base64')});if(process.env.PACKET_CASE==='bad-signature')packet=JSON.stringify({...JSON.parse(packet),signature:'x'});
let outcome,secondOutcome,publicOutcome,status,execute;try{execute=createProtectedProductionCutoverExecutor({packet,nonce,workspace:root})}catch(error){outcome=error.message}if(execute){try{status=await execute()}catch(error){outcome=error.message}try{await execute()}catch(error){secondOutcome=error.message}}try{await runReviewedSupabaseCli({args:['db','push','--reviewed-target','--reviewed-environment','production','--include-all','--skip-vault'],workspace:root,environment,protectedCutoverCapability:true})}catch(error){publicOutcome=error.message}process.stdout.write(JSON.stringify({outcome,secondOutcome,publicOutcome,status,calls:globalThis.calls??[]}));`;
  writeFileSync(path.join(root, 'harness.mjs'), harness);
  return root;
}

function run(dryCase: 'exact' | 'omitted' | 'extra', packetCase = '', applyCase = '') {
  const root = sandbox();
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(path.join(root, 'hook.mjs')).href, path.join(root, 'harness.mjs')], { env: { ...process.env, DRY_CASE: dryCase, PACKET_CASE: packetCase, APPLY_CASE: applyCase }, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`native executor harness failed: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

afterEach(() => roots.splice(0).forEach((root) => {
  const prefix = `${path.resolve(tmpdir())}${path.sep}hr-cutover-executor-`;
  if (!path.resolve(root).startsWith(prefix)) throw new Error('refusing to remove a non-test sandbox');
  rmSync(root, { recursive: true, force: true });
}));

describe('Story 22.15 protected production cutover executor', () => {
  it('runs the exact fixed dry run and then the fixed apply once', () => {
    const result = run('exact');
    expect(result.outcome).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.secondOutcome).toBe('Protected production cutover capability is unavailable');
    expect(result.calls.filter((args: string[]) => args[0] === 'db')).toEqual([
      ['db', 'push', '--dry-run', '--include-all', '--skip-vault', '--db-url', 'postgresql:///postgres?sslmode=verify-full'],
      ['db', 'push', '--include-all', '--skip-vault', '--db-url', 'postgresql:///postgres?sslmode=verify-full'],
    ]);
    expect(result.calls.some((args: string[]) => args[0] === 'migration' && args[1] === 'repair')).toBe(false);
    expect(result.publicOutcome).toBe('Production --include-all apply requires the installed protected cutover runner and fresh reviewed prerequisites under full production traffic isolation');
  });

  it.each(['omitted', 'extra'] as const)('refuses a %s dry-run list without an apply', (kind) => {
    const result = run(kind);
    expect(result.outcome).toBe('Production bootstrap dry-run does not list the exact ordered subset');
    expect(result.calls.filter((args: string[]) => args[0] === 'db')).toHaveLength(1);
    expect(result.calls.some((args: string[]) => args[0] === 'migration' && args[1] === 'repair')).toBe(false);
  });

  it.each(['bad-signature', 'stale', 'wrong-profile', 'wrong-context', 'target-swap', 'cleanup-missing', 'cleanup-noncanonical', 'cleanup-future', 'profile-at-cleanup', 'staffing-before-cleanup', 'managed-missing', 'managed-precleanup', 'managed-overlap', 'database-overlap', 'drain-overlap', 'stale-database', 'stale-drain'])('%s is rejected before a CLI command', (packetCase) => {
    const result = run('exact', packetCase);
    expect(result.outcome).toMatch(/unavailable|stale_or_future|baseline_mismatch|blocked_insufficient/);
    expect(result.calls).toEqual([]);
  });

  it('does not apply when the fresh recheck becomes stale after the dry run', () => {
    const result = run('exact', '', 'stale-after-dry');
    expect(result.outcome).toBe('production_observed_profile_stale_or_future');
    expect(result.calls.filter((args: string[]) => args[0] === 'db')).toHaveLength(1);
    expect(result.calls.some((args: string[]) => args[0] === 'migration' && args[1] === 'repair')).toBe(false);
  });

  it.each(['nonzero', 'timeout'] as const)('does not retry or repair after an uncertain %s apply result', (applyCase) => {
    const result = run('exact', '', applyCase);
    expect(result.status).not.toBe(0);
    expect(result.calls.filter((args: string[]) => args[0] === 'db')).toHaveLength(2);
    expect(result.calls.some((args: string[]) => args[0] === 'migration' && args[1] === 'repair')).toBe(false);
  });
});
