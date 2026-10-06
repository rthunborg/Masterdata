import {createHash} from 'node:crypto';
const SHA256 = /^[a-f0-9]{64}$/u;
const SHA40 = /^[a-f0-9]{40}$/u;
const MAX_AGE_MS = 15 * 60 * 1000;
const exact = (value, keys) => value !== null && typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype && Object.getOwnPropertySymbols(value).length === 0 &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()) &&
  Object.values(Object.getOwnPropertyDescriptors(value)).every(d=>d.enumerable&&Object.hasOwn(d,'value'));
const matches = (value, expected) => exact(value, Object.keys(expected)) &&
  Object.entries(expected).every(([key, entry]) => value[key] === entry);

// This is only the specifically observed pre-forward profile. Neither password
// expiry nor lack of inherited DML makes this principal harmless: SET postgres
// makes it an administrator-equivalent ingress path. Network closure and the
// complete drain remain separate mandatory proofs.
export const PRODUCTION_PRE_FORWARD_CLI_PROFILE = Object.freeze({
  canLogin: true, superuser: false, inheritRoleAttribute: false, createRole: false,
  createDb: false, replication: false, bypassRls: false,
});
export const PRODUCTION_PRE_FORWARD_CLI_MEMBERSHIP = Object.freeze({
  directMembershipCount: 1, directPostgresMembershipCount: 1, otherDirectMembershipCount: 0,
  postgresDirectAdmin: false, postgresDirectInherit: false, postgresDirectSet: true,
  postgresMember: true, postgresUsage: false, postgresSet: true, postgresAdmin: false,
});
export const PRODUCTION_PRE_FORWARD_CLI_OBJECTS = Object.freeze({
  ownedRelationCount: 0, ownedRoutineCount: 0, ownedTypeCount: 0,
  insertCount: 0, updateCount: 0, deleteCount: 0, truncateCount: 0,
  sequenceUsageCount: 0, sequenceUpdateCount: 0, executeRoutineCount: 104,
});

// Historical102 was aggregate-only: no saved identity inventory explains its delta.
// Owner-approved opaque snapshot adoption retains every routine semantically unresolved.
// The historical aggregate remains evidence only; it is not an accepted profile.
const deepFreeze = value => {if(value&&typeof value==='object'){for(const entry of Object.values(value))deepFreeze(entry);Object.freeze(value);}return value;};
export const PRODUCTION_PRE_FORWARD_CLI_ROUTINE_SNAPSHOT = deepFreeze({
  "kind": "production-cli-routine-fingerprint",
  "total": 104,
  "categories": [
    {
      "kind": "f",
      "count": 48,
      "otherGrant": true,
      "publicGrant": true,
      "schemaClass": "non_public_non_system",
      "schemaUsage": false,
      "languageClass": "c",
      "postgresGrant": true,
      "profileSha256": "c607b179f2bfeffd2e0b0492856e7d818d5434bdb5c19e31478c349cfc98db14",
      "directCliGrant": false,
      "extensionMember": true,
      "securityDefiner": false
    },
    {
      "kind": "f",
      "count": 17,
      "otherGrant": true,
      "publicGrant": true,
      "schemaClass": "non_public_non_system",
      "schemaUsage": false,
      "languageClass": "plpgsql",
      "postgresGrant": false,
      "profileSha256": "f76cac68fc083beab366a6f2d3c992f53b474ee1377d2845493dee7cc54d9c8a",
      "directCliGrant": false,
      "extensionMember": false,
      "securityDefiner": false
    },
    {
      "kind": "f",
      "count": 13,
      "otherGrant": true,
      "publicGrant": true,
      "schemaClass": "non_public_non_system",
      "schemaUsage": false,
      "languageClass": "plpgsql",
      "postgresGrant": true,
      "profileSha256": "e398232a8e468bcbcbe29b93a7fe18b6938b9e83afec73cbf3695bfedc62da35",
      "directCliGrant": false,
      "extensionMember": false,
      "securityDefiner": false
    },
    {
      "kind": "f",
      "count": 7,
      "otherGrant": true,
      "publicGrant": true,
      "schemaClass": "non_public_non_system",
      "schemaUsage": false,
      "languageClass": "sql",
      "postgresGrant": false,
      "profileSha256": "e34fcf546b345d69f331bd753c02a1a7dc50dc0420be8d5de1a2aa4c3d1b0c19",
      "directCliGrant": false,
      "extensionMember": false,
      "securityDefiner": false
    },
    {
      "kind": "f",
      "count": 8,
      "otherGrant": true,
      "publicGrant": true,
      "schemaClass": "non_public_non_system",
      "schemaUsage": false,
      "languageClass": "sql",
      "postgresGrant": true,
      "profileSha256": "2a01df6a83dd6dc0370eba2913e42a3604a1d4e0468a6f2a841990a3d95e13ed",
      "directCliGrant": false,
      "extensionMember": false,
      "securityDefiner": false
    },
    {
      "kind": "f",
      "count": 7,
      "otherGrant": true,
      "publicGrant": true,
      "schemaClass": "public",
      "schemaUsage": true,
      "languageClass": "plpgsql",
      "postgresGrant": true,
      "profileSha256": "674583a82b0da5d48af2a3482656721651a6e413a1116c52fd6475411008cbef",
      "directCliGrant": false,
      "extensionMember": false,
      "securityDefiner": false
    },
    {
      "kind": "f",
      "count": 3,
      "otherGrant": true,
      "publicGrant": true,
      "schemaClass": "public",
      "schemaUsage": true,
      "languageClass": "plpgsql",
      "postgresGrant": true,
      "profileSha256": "5f12adb693f82dac538a983d6565dede69b9048a601c896693ef4cbaa8604c5c",
      "directCliGrant": false,
      "extensionMember": false,
      "securityDefiner": true
    },
    {
      "kind": "f",
      "count": 1,
      "otherGrant": true,
      "publicGrant": true,
      "schemaClass": "public",
      "schemaUsage": true,
      "languageClass": "sql",
      "postgresGrant": true,
      "profileSha256": "8d2e42f65ae29de00ee7d2c2288493b20bceef5408955af1c191871b8a661c17",
      "directCliGrant": false,
      "extensionMember": false,
      "securityDefiner": true
    }
  ],
  "schemaVersion": 1,
  "cliPresentCount": 1,
  "allRoutineSetSha256": "4b1e52ad1ce7ddb3116e641573e90c78b321f9a4bb3f183a50f7708e75a174e8",
  "unknownCategoryCount": 104,
  "classifiedRoutineCount": 0,
  "allRoutineOwnerSetSha256": "780e7025c838af0631355043a4bcede1137e321f10f7bd1ea4c8739a6cefcdaf",
  "identityBaselineAvailable": false
});
const CATEGORY_KEYS=Object.freeze(['schemaClass','languageClass','kind','securityDefiner','schemaUsage','extensionMember','publicGrant','directCliGrant','postgresGrant','otherGrant','count','profileSha256']);
const CATEGORY_TUPLE_KEYS=CATEGORY_KEYS.slice(0,-2);
const tupleCompare=(a,b)=>{for(const k of CATEGORY_TUPLE_KEYS){if(a[k]===b[k])continue;return a[k]<b[k]?-1:1;}return 0;};
/** Parses descriptive aggregate evidence, never accepts a snapshot or authorizes a write. */
export function parseProductionCliRoutineSnapshot(value){
 const refuse=()=>{throw new Error('Production routine snapshot refused; details suppressed');};
 const count=v=>Number.isSafeInteger(v)&&v>=0&&v<=10000;
 if(!exact(value,['schemaVersion','kind','cliPresentCount','total','unknownCategoryCount','identityBaselineAvailable','classifiedRoutineCount','allRoutineSetSha256','allRoutineOwnerSetSha256','categories'])||value.schemaVersion!==1||value.kind!=='production-cli-routine-fingerprint'||value.cliPresentCount!==1||!count(value.total)||value.identityBaselineAvailable!==false||value.classifiedRoutineCount!==0||value.unknownCategoryCount!==value.total||![value.allRoutineSetSha256,value.allRoutineOwnerSetSha256].every(v=>SHA256.test(v??''))||!Array.isArray(value.categories)||value.categories.length>256||Object.getPrototypeOf(value.categories)!==Array.prototype||Object.getOwnPropertySymbols(value.categories).length!==0||Object.keys(value.categories).length!==value.categories.length||Object.keys(value.categories).some(k=>!/^(0|[1-9][0-9]*)$/u.test(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value.categories,k),'value')))refuse();
 let total=0,previous;
 for(const c of value.categories){
  if(!exact(c,CATEGORY_KEYS)||!['public','non_public_non_system'].includes(c.schemaClass)||!['sql','plpgsql','c','internal','other'].includes(c.languageClass)||!['f','p','a','w'].includes(c.kind)||!['securityDefiner','schemaUsage','extensionMember','publicGrant','directCliGrant','postgresGrant','otherGrant'].every(k=>typeof c[k]==='boolean')||!count(c.count)||c.count===0||!SHA256.test(c.profileSha256??'')||previous&&tupleCompare(previous,c)>=0)refuse();
  total+=c.count;previous=c;
 }
 if(total!==value.total)refuse();return deepFreeze(structuredClone(value));
}

const blocked = reason => Object.freeze({kind: 'production-managed-writer-assessment',
  disposition: 'blocked_unclassified_writer', reason, executionAuthority: false});

const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value !== null && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
export function productionManagedWriterProfileSha256(receipt) {
  return createHash('sha256').update(JSON.stringify(canonical({cli:receipt.cli,workers:receipt.workers,
    rawUnknownLoginRoleCount:receipt.rawUnknownLoginRoleCount,rawUnknownBackendCount:receipt.rawUnknownBackendCount,
    otherUnknownLoginRoleCount:receipt.otherUnknownLoginRoleCount,otherUnknownBackendCount:receipt.otherUnknownBackendCount,
    correlation:receipt.correlation}))).digest('hex');
}

/** Classifies only a fresh, exact initial profile; never executes or authorizes a control. */
export function assessProductionManagedWriterProfiles(receipt, context = {}) {
  const {sourceSha, sourceTree, sourceManifestSha256, targetBindingSha256,
    databaseRoleGraphSha256, now = new Date()} = context;
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()) ||
    !SHA40.test(sourceSha ?? '') || !SHA40.test(sourceTree ?? '') ||
    ![sourceManifestSha256, targetBindingSha256, databaseRoleGraphSha256].every(v => SHA256.test(v ?? '')))
    return blocked('invalid_binding');
  if (!exact(receipt, ['schemaVersion','kind','environment','phase','sourceSha','sourceTree',
    'sourceManifestSha256','targetBindingSha256','collectionStartedAtUtc','capturedAtUtc','cli','workers',
    'rawUnknownLoginRoleCount','rawUnknownBackendCount','otherUnknownLoginRoleCount',
    'otherUnknownBackendCount','correlation']) || receipt.schemaVersion !== 1 ||
    receipt.kind !== 'production-managed-writer-observation' || receipt.environment !== 'production' ||
    receipt.phase !== 'pre_forward' || receipt.sourceSha !== sourceSha || receipt.sourceTree !== sourceTree ||
    receipt.sourceManifestSha256 !== sourceManifestSha256 || receipt.targetBindingSha256 !== targetBindingSha256)
    return blocked('receipt_binding_mismatch');
  const startedAt = Date.parse(receipt.collectionStartedAtUtc);
  const time = Date.parse(receipt.capturedAtUtc);
  if (!Number.isFinite(startedAt) || new Date(startedAt).toISOString() !== receipt.collectionStartedAtUtc ||
    !Number.isFinite(time) || new Date(time).toISOString() !== receipt.capturedAtUtc ||
    startedAt > time || [startedAt, time].some(value => value > now.getTime() || now.getTime() - value > MAX_AGE_MS)) return blocked('stale_observation');
  const cli = receipt.cli;
  if (!exact(cli, ['presentCount','attributes','memberships','database','schemas','objects',
    'activeSessionCount','completeNonSecretRoleGraphSha256','routineSnapshot']) || cli.presentCount !== 1 ||
    cli.activeSessionCount !== 0 || cli.completeNonSecretRoleGraphSha256 !== databaseRoleGraphSha256 ||
    !exact(cli.attributes, Object.keys(PRODUCTION_PRE_FORWARD_CLI_PROFILE)) ||
    !Object.entries(PRODUCTION_PRE_FORWARD_CLI_PROFILE).every(([k,v]) => cli.attributes[k] === v) ||
    !exact(cli.memberships, Object.keys(PRODUCTION_PRE_FORWARD_CLI_MEMBERSHIP)) ||
    !Object.entries(PRODUCTION_PRE_FORWARD_CLI_MEMBERSHIP).every(([k,v]) => cli.memberships[k] === v) ||
    !exact(cli.database, ['connect','create','temporary']) || cli.database.connect !== true ||
    cli.database.create !== false || cli.database.temporary !== true ||
    !exact(cli.schemas, ['schemaCount','usageCount','createCount','ownedSchemaCount']) ||
    !matches(cli.schemas, {schemaCount:9,usageCount:1,createCount:0,ownedSchemaCount:0}) ||
    !exact(cli.objects, Object.keys(PRODUCTION_PRE_FORWARD_CLI_OBJECTS)) ||
    !Object.entries(PRODUCTION_PRE_FORWARD_CLI_OBJECTS).every(([k,v]) => cli.objects[k] === v))
    return blocked('cli_profile_changed');
  try {parseProductionCliRoutineSnapshot(cli.routineSnapshot);}catch{return blocked('routine_snapshot_invalid');}
  if(JSON.stringify(canonical(cli.routineSnapshot))!==JSON.stringify(canonical(PRODUCTION_PRE_FORWARD_CLI_ROUTINE_SNAPSHOT)))return blocked('routine_snapshot_changed');
  const correlation=receipt.correlation;
  if(!exact(correlation,['cliLoginProfileMd5','rawUnknownLoginProfileMd5','managedBackendProfileMd5','rawUnknownBackendProfileMd5'])||
    !Object.values(correlation).every(v=>/^[a-f0-9]{32}$/u.test(v??''))||
    correlation.cliLoginProfileMd5!==correlation.rawUnknownLoginProfileMd5||
    correlation.managedBackendProfileMd5!==correlation.rawUnknownBackendProfileMd5)
    return blocked('inventory_subset_hash_mismatch');
  const workers = receipt.workers;
  const fields = ['cronLauncherCount','netWorkerCount','otherCandidateBackendCount','cronPreloaded',
    'netPreloaded','cronDatabaseMatchesConnected','netDatabaseMatchesConnected','cronLaunchActiveJobs',
    'pgCronExtensionCount','pgNetExtensionCount','cronJobTablePresent','netRequestQueueTablePresent',
    'netResponseTablePresent'];
  if (!exact(workers, fields) || workers.cronLauncherCount !== 1 || workers.netWorkerCount !== 1 ||
    workers.otherCandidateBackendCount !== 0 ||
    !['cronPreloaded','netPreloaded','cronDatabaseMatchesConnected','netDatabaseMatchesConnected',
      'cronLaunchActiveJobs'].every(k => workers[k] === true) ||
    workers.pgCronExtensionCount !== 0 || workers.pgNetExtensionCount !== 0 ||
    !['cronJobTablePresent','netRequestQueueTablePresent','netResponseTablePresent'].every(k => workers[k] === false))
    return blocked('worker_substrate_or_scope_changed');
  if (receipt.rawUnknownLoginRoleCount !== 1 || receipt.rawUnknownBackendCount !== 2 ||
    receipt.otherUnknownLoginRoleCount !== 0 || receipt.otherUnknownBackendCount !== 0)
    return blocked('unknown_writer_remainder');
  return Object.freeze({schemaVersion:1,kind:'production-managed-writer-assessment',
    disposition:'initial_exact_routine_snapshot_classified_not_isolation',executionAuthority:false,
    privilegedCliIngress:true,providerAdministrativeTrustBoundary:true,
    routineSemanticClassification:false,unresolvedRoutineCount:104,identityBaselineAvailable:false,
    workerProofScope:'current_connected_database_job_substrates_absent',
    sourceSha,sourceTree,sourceManifestSha256,targetBindingSha256,
    databaseRoleGraphSha256,capturedAtUtc:receipt.capturedAtUtc,
    rawUnknownLoginRoleCount:1,rawUnknownBackendCount:2,
    otherUnknownLoginRoleCount:0,otherUnknownBackendCount:0});
}
