import {createHash} from 'node:crypto';
const SHA256 = /^[a-f0-9]{64}$/u;
const SHA40 = /^[a-f0-9]{40}$/u;
const MAX_AGE_MS = 15 * 60 * 1000;
const exact = (value, keys) => value !== null && typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype && Object.getOwnPropertySymbols(value).length === 0 &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
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
  sequenceUsageCount: 0, sequenceUpdateCount: 0, executeRoutineCount: 102,
});
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
    'sourceManifestSha256','targetBindingSha256','capturedAtUtc','cli','workers',
    'rawUnknownLoginRoleCount','rawUnknownBackendCount','otherUnknownLoginRoleCount',
    'otherUnknownBackendCount','correlation']) || receipt.schemaVersion !== 1 ||
    receipt.kind !== 'production-managed-writer-observation' || receipt.environment !== 'production' ||
    receipt.phase !== 'pre_forward' || receipt.sourceSha !== sourceSha || receipt.sourceTree !== sourceTree ||
    receipt.sourceManifestSha256 !== sourceManifestSha256 || receipt.targetBindingSha256 !== targetBindingSha256)
    return blocked('receipt_binding_mismatch');
  const time = Date.parse(receipt.capturedAtUtc);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== receipt.capturedAtUtc ||
    time > now.getTime() || now.getTime() - time > MAX_AGE_MS) return blocked('stale_observation');
  const cli = receipt.cli;
  if (!exact(cli, ['presentCount','attributes','memberships','database','schemas','objects',
    'activeSessionCount','completeNonSecretRoleGraphSha256']) || cli.presentCount !== 1 ||
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
    disposition:'initial_managed_profiles_classified_not_isolation',executionAuthority:false,
    privilegedCliIngress:true,providerAdministrativeTrustBoundary:true,
    workerProofScope:'current_connected_database_job_substrates_absent',
    sourceSha,sourceTree,sourceManifestSha256,targetBindingSha256,
    databaseRoleGraphSha256,capturedAtUtc:receipt.capturedAtUtc,
    rawUnknownLoginRoleCount:1,rawUnknownBackendCount:2,
    otherUnknownLoginRoleCount:0,otherUnknownBackendCount:0});
}
