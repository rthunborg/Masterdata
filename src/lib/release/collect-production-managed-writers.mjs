import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isAbsolute,resolve} from 'node:path';
import {assertDatabaseWriterClassificationSql,parseDatabaseWriterClassification} from './production-database-writer-classification.mjs';
import { productionTargetBindingSha256 } from './production-observed-profile.mjs';

const MAX_BYTES=65536;
const fail=()=>{throw new Error('Production managed writer observation refused; details suppressed');};
const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
  Object.getPrototypeOf(v)===Object.prototype&&Object.getOwnPropertySymbols(v).length===0&&
  Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const count=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000000;
const bool=v=>typeof v==='boolean';
const countObject=(v,keys)=>exact(v,keys)&&keys.every(k=>count(v[k]));
const boolObject=(v,keys)=>exact(v,keys)&&keys.every(k=>bool(v[k]));

/** Three reviewed SELECTs share one repeatable-read, read-only snapshot. */
export function buildProductionManagedWriterSql(parts) {
  if(!Array.isArray(parts)||parts.length!==3) fail();
  const prefix=/^BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;\s*SET LOCAL statement_timeout = '20s';\s*SET LOCAL lock_timeout = '3s';\s*SET LOCAL idle_in_transaction_session_timeout = '30s';\s*/u;
  const bodies=parts.map(sql=>{
    assertDatabaseWriterClassificationSql(sql);
    const uncommented=sql.replace(/^--[^\r\n]*(?:\r?\n|$)/gmu,'').trim();
    if(!prefix.test(uncommented)) fail();
    return uncommented.replace(prefix,'').replace(/ROLLBACK;\s*$/u,'');
  });
  const sql="BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSET LOCAL statement_timeout = '20s';\nSET LOCAL lock_timeout = '3s';\nSET LOCAL idle_in_transaction_session_timeout = '30s';\n"+bodies.join('\n')+'\nROLLBACK;\n';
  assertDatabaseWriterClassificationSql(sql);
  return sql;
}

export function parseProductionManagedWriterOutputs(output,binding) {
  if(!exact(binding,['sourceSha','sourceTree','sourceManifestSha256','targetBindingSha256','capturedAtUtc'])||
    ![binding.sourceSha,binding.sourceTree].every(v=>/^[a-f0-9]{40}$/u.test(v??''))||
    ![binding.sourceManifestSha256,binding.targetBindingSha256].every(v=>/^[a-f0-9]{64}$/u.test(v??''))||
    typeof binding.capturedAtUtc!=='string'||!Number.isFinite(Date.parse(binding.capturedAtUtc))||
    new Date(binding.capturedAtUtc).toISOString()!==binding.capturedAtUtc)fail();
  if(typeof output!=='string'||Buffer.byteLength(output)>MAX_BYTES) fail();
  const lines=output.split(/\r?\n/u).filter(Boolean);
  if(lines.length!==3) fail();
  let cli,workers;
  try {cli=JSON.parse(lines[0]);workers=JSON.parse(lines[1]);} catch {fail();}
  if(!exact(cli,['schemaVersion','kind','cliPresentCount','cliAttributes','memberships','currentDatabase',
    'nonSystemSchemas','nonSystemObjects','activeSessionCount','completeNonSecretRoleGraphSha256','managedLoginProfileMd5']) ||
    cli.schemaVersion!==1||cli.kind!=='cli-membership-privileges'||!count(cli.cliPresentCount)||
    !count(cli.activeSessionCount)||!/^[a-f0-9]{64}$/u.test(cli.completeNonSecretRoleGraphSha256??'')||
    !/^[a-f0-9]{32}$/u.test(cli.managedLoginProfileMd5??'')||
    !boolObject(cli.cliAttributes,['canLogin','superuser','inheritRoleAttribute','createRole','createDb',
      'replication','bypassRls','passwordExpirySpecified','passwordExpired'])||
    (cli.cliAttributes.passwordExpired&&!cli.cliAttributes.passwordExpirySpecified)||
    !exact(cli.memberships,['directMembershipCount','directPostgresMembershipCount','otherDirectMembershipCount',
      'postgresDirectAdmin','postgresDirectInherit','postgresDirectSet','postgresMember','postgresUsage','postgresSet','postgresAdmin'])||
    !['directMembershipCount','directPostgresMembershipCount','otherDirectMembershipCount'].every(k=>count(cli.memberships[k]))||
    !['postgresDirectAdmin','postgresDirectInherit','postgresDirectSet','postgresMember','postgresUsage','postgresSet','postgresAdmin'].every(k=>bool(cli.memberships[k]))||
    !boolObject(cli.currentDatabase,['connect','create','temporary'])||
    !countObject(cli.nonSystemSchemas,['schemaCount','usageCount','createCount','ownedSchemaCount'])||
    !countObject(cli.nonSystemObjects,['ownedRelationCount','ownedRoutineCount','ownedTypeCount','insertCount','updateCount',
      'deleteCount','truncateCount','sequenceUsageCount','sequenceUpdateCount','executeRoutineCount'])) fail();
  const workerCounts=['cronLauncherCount','netWorkerCount','otherCandidateBackendCount','pgCronExtensionCount','pgNetExtensionCount'];
  const workerBooleans=['cronPreloaded','netPreloaded','cronDatabaseMatchesConnected','netDatabaseMatchesConnected','cronLaunchActiveJobs',
    'cronJobTablePresent','netRequestQueueTablePresent','netResponseTablePresent'];
  if(!exact(workers,[...workerCounts,...workerBooleans,'managedBackendProfileMd5'])||!workerCounts.every(k=>count(workers[k]))||
    !/^[a-f0-9]{32}$/u.test(workers.managedBackendProfileMd5??'')||
    !workerBooleans.every(k=>bool(workers[k]))) fail();
  const inventory=parseDatabaseWriterClassification(lines[2]);
  if(cli.managedLoginProfileMd5!==inventory.unknownLoginRoles.profileMd5||
    workers.managedBackendProfileMd5!==inventory.sessions.unknownBackendProfileMd5)fail();
  const workerFacts={...workers};delete workerFacts.managedBackendProfileMd5;
  const attributes={...cli.cliAttributes};
  // Expiry is observed by the raw collector, but is explicitly not an ingress
  // denial predicate and is never used to justify classifying this writer.
  delete attributes.passwordExpirySpecified;delete attributes.passwordExpired;
  if(cli.cliPresentCount>inventory.unknownLoginRoles.count ||
    workers.cronLauncherCount+workers.netWorkerCount>inventory.sessions.unknownBackendCount) fail();
  return Object.freeze({schemaVersion:1,kind:'production-managed-writer-observation',environment:'production',phase:'pre_forward',
    ...binding,cli:{presentCount:cli.cliPresentCount,attributes,memberships:cli.memberships,database:cli.currentDatabase,
      schemas:cli.nonSystemSchemas,objects:cli.nonSystemObjects,activeSessionCount:cli.activeSessionCount,
      completeNonSecretRoleGraphSha256:cli.completeNonSecretRoleGraphSha256},workers:workerFacts,
    correlation:{cliLoginProfileMd5:cli.managedLoginProfileMd5,rawUnknownLoginProfileMd5:inventory.unknownLoginRoles.profileMd5,
      managedBackendProfileMd5:workers.managedBackendProfileMd5,rawUnknownBackendProfileMd5:inventory.sessions.unknownBackendProfileMd5},
    rawUnknownLoginRoleCount:inventory.unknownLoginRoles.count,rawUnknownBackendCount:inventory.sessions.unknownBackendCount,
    otherUnknownLoginRoleCount:inventory.unknownLoginRoles.count-cli.cliPresentCount,
    otherUnknownBackendCount:inventory.sessions.unknownBackendCount-workers.cronLauncherCount-workers.netWorkerCount});
}

/** Caller-provided data is never a hosted proof: tool, target and TLS are checked here. */
export async function collectProductionManagedWriters({workspace,binding,environment=process.env}={}) {
  if(typeof workspace!=='string'||!isAbsolute(workspace)||environment!==process.env||
    environment.EXPECTED_SUPABASE_ENVIRONMENT!=='production'||
    !exact(binding,['sourceSha','sourceTree','sourceManifestSha256','targetBindingSha256'])) fail();
  try {
    if(binding.targetBindingSha256 !== productionTargetBindingSha256(environment.EXPECTED_SUPABASE_PROJECT_REF)) fail();
    const [cli,catalog,target]=await Promise.all([
      import('../../../supabase/verify/run-reviewed-supabase-cli.mjs'),
      import('../../../supabase/verify/verify-production-baseline-catalog.mjs'),
      import('../../../supabase/verify/verify-target-binding.mjs')]);
    cli.verifyApprovedSupabaseCliExecutable();
    const executable=catalog.verifyApprovedPsqlExecutable();
    const certificate=catalog.verifyApprovedSslRootCertificate();
    await target.verifyConfiguredSupabaseTarget({workspace:resolve(workspace),environment});
    const parts=['production-cli-principal-profile.sql','production-managed-worker-profile.sql','production-database-writer-classification.sql']
      .map(name=>readFileSync(fileURLToPath(new URL(name,import.meta.url)),'utf8'));
    const sql=buildProductionManagedWriterSql(parts);
    const url=new URL(environment.SUPABASE_DB_URL);
    if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||!url.port||!url.username||!url.password||url.pathname!=='/postgres') fail();
    const child={};
    for(const key of ['SystemRoot','SYSTEMROOT','WINDIR','PATH','Path','TEMP','TMP'])if(typeof environment[key]==='string')child[key]=environment[key];
    Object.assign(child,{PGAPPNAME:'hr-masterdata-managed-writer-observation',PGCONNECT_TIMEOUT:'10',PGDATABASE:'postgres',
      PGHOST:url.hostname,PGPORT:url.port,PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),
      PGSSLMODE:'verify-full',PGSSLROOTCERT:certificate,
      PGOPTIONS:'-c default_transaction_read_only=on -c statement_timeout=20000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=30000'});
    const capturedAtUtc=new Date().toISOString();let result;
    try {result=spawnSync(executable,['--no-psqlrc','--quiet','--tuples-only','--no-align','--set','ON_ERROR_STOP=1','--set','VERBOSITY=terse'],
      {cwd:resolve(workspace),env:child,input:sql,windowsHide:true,encoding:'utf8',timeout:45000,maxBuffer:MAX_BYTES});}
    finally {for(const key of Object.keys(child))delete child[key];}
    if(result?.error||result?.signal!=null||result?.status!==0||typeof result?.stdout!=='string') fail();
    return parseProductionManagedWriterOutputs(result.stdout,{...binding,capturedAtUtc});
  }catch{fail();}
}
