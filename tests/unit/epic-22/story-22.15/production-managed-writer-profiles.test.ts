import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {
  assessProductionManagedWriterProfiles,productionManagedWriterProfileSha256,
  PRODUCTION_PRE_FORWARD_CLI_PROFILE,PRODUCTION_PRE_FORWARD_CLI_MEMBERSHIP,PRODUCTION_PRE_FORWARD_CLI_OBJECTS,PRODUCTION_PRE_FORWARD_CLI_ROUTINE_SNAPSHOT,
} from '../../../../src/lib/release/production-managed-writer-profiles.mjs';
import {buildProductionManagedWriterSql,collectProductionManagedWriters} from '../../../../src/lib/release/collect-production-managed-writers.mjs';

const now=new Date('2026-09-28T12:00:00.000Z');
const context={sourceSha:'a'.repeat(40),sourceTree:'b'.repeat(40),sourceManifestSha256:'c'.repeat(64),
  targetBindingSha256:'d'.repeat(64),databaseRoleGraphSha256:'e'.repeat(64),now};
function receipt(){return {
  schemaVersion:1,kind:'production-managed-writer-observation',environment:'production',phase:'pre_forward',
  sourceSha:context.sourceSha,sourceTree:context.sourceTree,sourceManifestSha256:context.sourceManifestSha256,
  targetBindingSha256:context.targetBindingSha256,collectionStartedAtUtc:'2026-09-28T11:58:59.000Z',capturedAtUtc:'2026-09-28T11:59:00.000Z',
  cli:{presentCount:1,attributes:{...PRODUCTION_PRE_FORWARD_CLI_PROFILE},memberships:{...PRODUCTION_PRE_FORWARD_CLI_MEMBERSHIP},
    database:{connect:true,create:false,temporary:true},schemas:{schemaCount:9,usageCount:1,createCount:0,ownedSchemaCount:0},
    objects:{...PRODUCTION_PRE_FORWARD_CLI_OBJECTS},routineSnapshot:structuredClone(PRODUCTION_PRE_FORWARD_CLI_ROUTINE_SNAPSHOT),activeSessionCount:0,completeNonSecretRoleGraphSha256:context.databaseRoleGraphSha256},
  workers:{cronLauncherCount:1,netWorkerCount:1,otherCandidateBackendCount:0,cronPreloaded:true,netPreloaded:true,
    cronDatabaseMatchesConnected:true,netDatabaseMatchesConnected:true,cronLaunchActiveJobs:true,pgCronExtensionCount:0,
    pgNetExtensionCount:0,cronJobTablePresent:false,netRequestQueueTablePresent:false,netResponseTablePresent:false},
  rawUnknownLoginRoleCount:1,rawUnknownBackendCount:2,otherUnknownLoginRoleCount:0,otherUnknownBackendCount:0,
  correlation:{cliLoginProfileMd5:'f'.repeat(32),rawUnknownLoginProfileMd5:'f'.repeat(32),
    managedBackendProfileMd5:'a'.repeat(32),rawUnknownBackendProfileMd5:'a'.repeat(32)},
};}
const assess=(v=receipt())=>assessProductionManagedWriterProfiles(v,context);
describe('exact initial managed writer profiles',()=>{
  it('classifies a postgres SET member as privileged ingress, never proof of isolation',()=>{
    expect(assess()).toMatchObject({disposition:'initial_exact_routine_snapshot_classified_not_isolation',
      executionAuthority:false,privilegedCliIngress:true,providerAdministrativeTrustBoundary:true,
      workerProofScope:'current_connected_database_job_substrates_absent'});
  });
  it.each(['sourceSha','sourceTree','sourceManifestSha256','targetBindingSha256'])('rejects swapped %s',key=>{
    const v=receipt();(v as Record<string,unknown>)[key]='0'.repeat(key.endsWith('Sha256')?64:40);
    expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it.each(['2026-09-28T11:44:59.000Z','2026-09-28T12:00:00.001Z','2026-09-28T11:59:00Z'])('rejects stale/future/noncanonical time %s',time=>{
    const v=receipt();v.capturedAtUtc=time;expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it.each(['2026-09-28T11:44:59.999Z','2026-09-28T11:59:00.001Z','2026-09-28T11:58:59Z'])('rejects stale/reversed/noncanonical collection start %s',time=>{
    const v=receipt();v.collectionStartedAtUtc=time;expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it.each(Object.keys(PRODUCTION_PRE_FORWARD_CLI_PROFILE))('rejects changed CLI attribute %s',key=>{
    const v=receipt();v.cli.attributes[key]=!v.cli.attributes[key];expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it.each(['otherDirectMembershipCount','postgresDirectAdmin','postgresDirectInherit','postgresDirectSet'])('rejects changed membership %s',key=>{
    const v=receipt();v.cli.memberships[key]=typeof v.cli.memberships[key]==='boolean'?!v.cli.memberships[key]:1;
    expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it.each(Object.keys(PRODUCTION_PRE_FORWARD_CLI_OBJECTS))('rejects additional/different non-system privilege %s',key=>{
    const v=receipt();v.cli.objects[key]++;expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it.each(['cronDatabaseMatchesConnected','netDatabaseMatchesConnected','cronPreloaded','netPreloaded'])('rejects unproven worker scope %s',key=>{
    const v=receipt();v.workers[key]=false;expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it.each(['cronJobTablePresent','netRequestQueueTablePresent','netResponseTablePresent'])('rejects installed substrate %s',key=>{
    const v=receipt();v.workers[key]=true;expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it.each(['pgCronExtensionCount','pgNetExtensionCount','otherCandidateBackendCount','cronLauncherCount','netWorkerCount'])('rejects changed worker inventory %s',key=>{
    const v=receipt();v.workers[key]++;expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it.each(['rawUnknownLoginRoleCount','rawUnknownBackendCount','otherUnknownLoginRoleCount','otherUnknownBackendCount'])('retains complete raw accounting %s',key=>{
    const v=receipt();v[key]++;expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it('rejects active CLI sessions and graph changes',()=>{
    const v=receipt();v.cli.activeSessionCount=1;expect(assess(v).disposition).toBe('blocked_unclassified_writer');
    v.cli.activeSessionCount=0;v.cli.completeNonSecretRoleGraphSha256='0'.repeat(64);expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it('rejects a same-count substitution with a different subset hash',()=>{
    const v=receipt();v.correlation.rawUnknownLoginProfileMd5='0'.repeat(32);
    expect(assess(v).reason).toBe('inventory_subset_hash_mismatch');
    v.correlation.rawUnknownLoginProfileMd5=v.correlation.cliLoginProfileMd5;
    v.correlation.rawUnknownBackendProfileMd5='0'.repeat(32);
    expect(assess(v).reason).toBe('inventory_subset_hash_mismatch');
  });
  it('rejects post-forward replay and unknown assertions',()=>{
    const v=receipt();v.phase='post_forward';expect(assess(v).disposition).toBe('blocked_unclassified_writer');
    v.phase='pre_forward';Object.assign(v,{binaryWriterAttested:true});expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });

  it('retains unknown semantics and has no execution authority after exact snapshot adoption',()=>{
    expect(assess()).toMatchObject({executionAuthority:false,routineSemanticClassification:false,unresolvedRoutineCount:106,identityBaselineAvailable:false});
    expect(receipt().cli.routineSnapshot).toMatchObject({classifiedRoutineCount:0,unknownCategoryCount:106,identityBaselineAvailable:false});
  });
  it.each([102,103,104,105,107])('refuses aggregate-only or changed routine count %s',count=>{const v=receipt();v.cli.objects.executeRoutineCount=count;expect(assess(v).disposition).toBe('blocked_unclassified_writer');});
  it.each(['allRoutineSetSha256','allRoutineOwnerSetSha256'])('refuses same-count changed fingerprint %s',key=>{const v=receipt();v.cli.routineSnapshot[key]='0'.repeat(64);expect(assess(v).disposition).toBe('blocked_unclassified_writer');expect(productionManagedWriterProfileSha256(v)).not.toBe(productionManagedWriterProfileSha256(receipt()));});
  it.each(['profileSha256','count','securityDefiner','publicGrant','directCliGrant','schemaUsage','extensionMember','postgresGrant','otherGrant','kind','languageClass','schemaClass'])('refuses substituted category %s',key=>{const v=receipt();const c=v.cli.routineSnapshot.categories[0];c[key]=typeof c[key]==='boolean'?!c[key]:typeof c[key]==='number'?c[key]+1:'changed';expect(assess(v).disposition).toBe('blocked_unclassified_writer');});
  it.each(['reordered','duplicate','missing','extra','zero-unknown','classified','baseline','no-snapshot','non-function'])('refuses %s snapshot',kind=>{const v=receipt();const s=v.cli.routineSnapshot;if(kind==='reordered')s.categories.reverse();if(kind==='duplicate')s.categories[1]=structuredClone(s.categories[0]);if(kind==='missing')s.categories.pop();if(kind==='extra')Object.assign(s,{admitted:true});if(kind==='zero-unknown')s.unknownCategoryCount=0;if(kind==='classified')s.classifiedRoutineCount=106;if(kind==='baseline')s.identityBaselineAvailable=true;if(kind==='no-snapshot')delete v.cli.routineSnapshot;if(kind==='non-function')s.categories[0].kind='a';expect(assess(v).disposition).toBe('blocked_unclassified_writer');});
  it('binds the 106 proposal to two exact upstream additions and an unchanged 104 remainder',()=>{
    const evidence=JSON.parse(readFileSync(process.cwd()+'/docs/commercial-readiness/evidence/production-realtime-routine-delta-2026-10-07.json','utf8'));
    expect(PRODUCTION_PRE_FORWARD_CLI_ROUTINE_SNAPSHOT).toEqual(evidence.observedRoutineSnapshot);
    expect(evidence.original104DefinitionsAndAclsPreserved).toBe(true);
    expect(evidence.omissionHashCandidates).toHaveLength(2);
    expect(evidence.omissionHashCandidates.map((c:{identitySha256:string})=>c.identitySha256)).toEqual([
      'b1e49efb223d3fafbbfd725c6dfb3936c3eeaffe7561a14815898ac12402933a',
      'f24e1cf59e1d5fe7160d13d3fc3dace69adafec73c12b6d2713fd15a0c657da8',
    ]);
    for(const candidate of evidence.omissionHashCandidates){
      expect(candidate.remainderProfileSha256).toBe(candidate.previousProfileSha256);
      expect(candidate.currentCount).toBe(candidate.previousCount+1);
      expect(candidate).toMatchObject({schemaClass:'realtime',providerRealtimeOwner:true,officialUpstreamBodyMatches:true,securityDefiner:false,schemaUsage:false,directCliGrant:false,volatileRoutine:true});
    }
    expect(assess()).toMatchObject({executionAuthority:false,routineSemanticClassification:false,unresolvedRoutineCount:106,identityBaselineAvailable:false});
    expect(evidence.ownerSnapshotAdoptionGranted).toBe(false);
  });
  it('rejects a mixed historical 104 count and new 106 fingerprint',()=>{
    const v=receipt();v.cli.objects.executeRoutineCount=104;
    expect(assess(v).disposition).toBe('blocked_unclassified_writer');
    v.cli.objects.executeRoutineCount=106;v.cli.routineSnapshot.total=104;
    expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it.each([2,4])('rejects changed hash or grant in added-routine category %s',index=>{
    const v=receipt();v.cli.routineSnapshot.categories[index].profileSha256='0'.repeat(64);
    expect(assess(v).disposition).toBe('blocked_unclassified_writer');
    v.cli.routineSnapshot=structuredClone(PRODUCTION_PRE_FORWARD_CLI_ROUTINE_SNAPSHOT);
    v.cli.routineSnapshot.categories[index].directCliGrant=true;
    expect(assess(v).disposition).toBe('blocked_unclassified_writer');
  });
  it('binds profile content while ignoring JSON key ordering',()=>{
    const v=receipt(),before=productionManagedWriterProfileSha256(v);
    v.cli.schemas={ownedSchemaCount:0,createCount:0,usageCount:1,schemaCount:9};
    expect(assess(v).disposition).toBe('initial_exact_routine_snapshot_classified_not_isolation');
    expect(productionManagedWriterProfileSha256(v)).toBe(before);
    v.workers.cronJobTablePresent=true;expect(productionManagedWriterProfileSha256(v)).not.toBe(before);
  });
});

describe('managed writer collector safety',()=>{
  const parts=()=>['production-cli-principal-profile.sql','production-managed-worker-profile.sql','production-database-writer-classification.sql','production-cli-routine-fingerprint.sql']
    .map(name=>readFileSync(new URL('../../../../src/lib/release/'+name,import.meta.url),'utf8'));
  it('joins all four queries in one bounded read-only snapshot',()=>{
    const sql=buildProductionManagedWriterSql(parts());
    expect(sql.match(/BEGIN TRANSACTION/g)).toHaveLength(1);expect(sql.match(/ROLLBACK;/g)).toHaveLength(1);
    expect(sql).toContain('completeNonSecretRoleGraphSha256');expect(sql).toContain('otherCandidateBackendCount');
    expect(sql).toContain('unknownLoginRoles');expect(sql).toContain('allRoutineOwnerSetSha256');expect(sql).toContain('allRoutineSetSha256');expect(sql).not.toContain('rolpassword');
  });
  it('rejects mutations and lost transaction boundaries',()=>{
    const p=parts();p[1]=p[1].replace('ROLLBACK;','COMMIT;');expect(()=>buildProductionManagedWriterSql(p)).toThrow();
    const q=parts();q[1]=q[1].replace('ROLLBACK;','ALTER ROLE postgres NOLOGIN;\nROLLBACK;');expect(()=>buildProductionManagedWriterSql(q)).toThrow();
  });
  it('rejects nonproduction or alternate environments before tool/target access',async()=>{
    await expect(collectProductionManagedWriters({workspace:process.cwd(),binding:{},environment:{EXPECTED_SUPABASE_ENVIRONMENT:'production'}})).rejects.toThrow('details suppressed');
  });
});
