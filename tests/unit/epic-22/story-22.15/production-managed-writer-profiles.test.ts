import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
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
// Independent historical pins from staging 2e2819ae; these are expected baselines,
// not a newly collected production observation.
const historicalCategories = [
  [48,'c607b179f2bfeffd2e0b0492856e7d818d5434bdb5c19e31478c349cfc98db14'],
  [17,'f76cac68fc083beab366a6f2d3c992f53b474ee1377d2845493dee7cc54d9c8a'],
  [13,'e398232a8e468bcbcbe29b93a7fe18b6938b9e83afec73cbf3695bfedc62da35'],
  [7,'e34fcf546b345d69f331bd753c02a1a7dc50dc0420be8d5de1a2aa4c3d1b0c19'],
  [8,'2a01df6a83dd6dc0370eba2913e42a3604a1d4e0468a6f2a841990a3d95e13ed'],
  [7,'674583a82b0da5d48af2a3482656721651a6e413a1116c52fd6475411008cbef'],
  [3,'5f12adb693f82dac538a983d6565dede69b9048a601c896693ef4cbaa8604c5c'],
  [1,'8d2e42f65ae29de00ee7d2c2288493b20bceef5408955af1c191871b8a661c17'],
] as const;
const addedRoutines = [
  {index:2,languageClass:'plpgsql',identitySha256:'b1e49efb223d3fafbbfd725c6dfb3936c3eeaffe7561a14815898ac12402933a',bodySha256:'8831c33c7f0b09958580c075cf9ff1ca35f987f7a69cb5b0dde6fc8a4b357c72',definitionSha256:'574f144f757a65d82f5ccb991162f4de4bad4deafc9917f559c59aac4703ebcc'},
  {index:4,languageClass:'sql',identitySha256:'f24e1cf59e1d5fe7160d13d3fc3dace69adafec73c12b6d2713fd15a0c657da8',bodySha256:'708e8ebf818bd7b19ffb562d1ffde5a67ee131060e46204bc88725fd8a88d889',definitionSha256:'75a28ea0ba366ba7ac8dfce61c207a75b344f187fe01c42975a108ac90528a37'},
] as const;
const loadDeltaEvidence=()=>JSON.parse(readFileSync(process.cwd()+'/docs/commercial-readiness/evidence/production-realtime-routine-delta-2026-10-07.json','utf8'));
function assertDeltaEvidence(evidence:ReturnType<typeof loadDeltaEvidence>){
  expect(evidence).toMatchObject({previousRoutineCount:104,observedRoutineCount:106,
    upstreamCommit:'b1595770e76e01bfbcaa05f538873ad2ac01d414',upstreamMigrationBlob:'de22006adc5f0fca918727005e4df164219f7a1f',
    upstreamMigrationPath:'lib/realtime/tenants/repo/migrations/20260928120000_add_list_changes_sync.ex',
    previousSixCategoryHashesUnchanged:true,roleGraphUnchanged:true,original104DefinitionsAndAclsPreserved:true,ownerSnapshotAdoptionGranted:false});
  expect(evidence.observedRoutineSnapshot).toEqual(PRODUCTION_PRE_FORWARD_CLI_ROUTINE_SNAPSHOT);
  expect(evidence.omissionHashCandidates).toHaveLength(2);
  for(const [position,pin] of addedRoutines.entries()){
    const candidate=evidence.omissionHashCandidates[position];
    const [previousCount,previousHash]=historicalCategories[pin.index];
    expect(candidate).toMatchObject({identitySha256:pin.identitySha256,bodySha256:pin.bodySha256,definitionSha256:pin.definitionSha256,
      aclSha256:'83dee56bb7c015879ff8f3782f28e9059f6496b0aa27833be17a0ca5034beac2',languageClass:pin.languageClass,
      previousCount,currentCount:previousCount+1,previousProfileSha256:previousHash,remainderProfileSha256:previousHash,
      schemaClass:'realtime',providerRealtimeOwner:true,officialUpstreamBodyMatches:true,securityDefiner:false,schemaUsage:false,directCliGrant:false,extensionMember:false,volatileRoutine:true});
    expect(evidence.observedRoutineSnapshot.categories[pin.index]).toMatchObject({count:previousCount+1,languageClass:pin.languageClass});
  }
  for(const [index,[count,profileSha256]] of historicalCategories.entries()){
    if(index!==2&&index!==4)expect(evidence.observedRoutineSnapshot.categories[index]).toMatchObject({count,profileSha256});
  }
  expect(evidence.globalRemainderProof).toMatchObject({remainingRoutineCount:104,originalAllRoutineSetMatches:true,originalAllRoutineOwnersMatch:true,
    receiptSha256:'fd4ad3a1880ef453661acb6759423a03d2f22f8a139b31d212d87556ee5c79f4'});
  expect(evidence.independentReviewReproduction).toEqual({status:'historical-global-remainder-receipt-independently-reviewed',
    receiptPath:'docs/commercial-readiness/evidence/production-realtime-global-remainder-2026-10-07.json',
    sqlPath:'docs/commercial-readiness/evidence/production-realtime-global-remainder-2026-10-07.sql',
    sqlSha256:'30391b1032a26650033a4c954082ad1b5726787a0215eda9278b5e55f9bb17bc',
    expectedRemainingRoutineSetSha256:'4b1e52ad1ce7ddb3116e641573e90c78b321f9a4bb3f183a50f7708e75a174e8',
    expectedRemainingRoutineOwnerSetSha256:'780e7025c838af0631355043a4bcede1137e321f10f7bd1ea4c8739a6cefcdaf',
    independentlyRecomputed:false});
  const rawReceipt=readFileSync(process.cwd()+'/'+evidence.independentReviewReproduction.receiptPath);
  const rawSql=readFileSync(process.cwd()+'/'+evidence.independentReviewReproduction.sqlPath);
  expect(createHash('sha256').update(rawReceipt).digest('hex')).toBe(evidence.globalRemainderProof.receiptSha256);
  expect(createHash('sha256').update(rawSql).digest('hex')).toBe(evidence.independentReviewReproduction.sqlSha256);
  const original=JSON.parse(rawReceipt.toString('utf8'));
  expect(original).toMatchObject({sourceSha:evidence.sourceSha,sourceTree:evidence.sourceTree,sourceManifestSha256:evidence.sourceManifestSha256,
    targetBindingSha256:evidence.targetBindingSha256,completedAtUtc:evidence.globalRemainderProof.completedAtUtc,
    sqlSha256:evidence.independentReviewReproduction.sqlSha256,hostedWriteAttempted:false,hostedSettingsChanged:false,acceptedProfileUpdated:false,semanticClassificationProved:false});
  expect(original.diagnostic.candidates).toEqual(evidence.omissionHashCandidates);
  expect(original.diagnostic).toMatchObject({schemaVersion:1,kind:'production-routine-delta-proof',matchedCandidateCount:2,expectedChangedGroupCount:2,
    remainingRoutineCount:evidence.globalRemainderProof.remainingRoutineCount,originalAllRoutineSetMatches:evidence.globalRemainderProof.originalAllRoutineSetMatches,
    originalAllRoutineOwnersMatch:evidence.globalRemainderProof.originalAllRoutineOwnersMatch});
}

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
  it('binds the 106 proposal to pinned upstream and historical omission evidence',()=>{
    assertDeltaEvidence(loadDeltaEvidence());
    expect(assess()).toMatchObject({executionAuthority:false,routineSemanticClassification:false,unresolvedRoutineCount:106,identityBaselineAvailable:false});
  });
  it.each(['upstreamCommit','upstreamMigrationBlob','upstreamMigrationPath','previousSixCategoryHashesUnchanged','roleGraphUnchanged'])('detects substituted provenance %s',key=>{
    const evidence=loadDeltaEvidence();evidence[key]=typeof evidence[key]==='boolean'?false:'substituted';
    expect(()=>assertDeltaEvidence(evidence)).toThrow();
  });
  it.each([0,1])('detects altered body and jointly substituted omission hashes for addition %s',index=>{
    const evidence=loadDeltaEvidence();evidence.omissionHashCandidates[index].bodySha256='0'.repeat(64);
    expect(()=>assertDeltaEvidence(evidence)).toThrow();
    const joint=loadDeltaEvidence();joint.omissionHashCandidates[index].previousProfileSha256=joint.omissionHashCandidates[index].remainderProfileSha256='0'.repeat(64);
    expect(()=>assertDeltaEvidence(joint)).toThrow();
    const counts=loadDeltaEvidence();counts.omissionHashCandidates[index].previousCount=100;counts.omissionHashCandidates[index].currentCount=101;
    expect(()=>assertDeltaEvidence(counts)).toThrow();
  });
  it.each(['remainingRoutineCount','originalAllRoutineSetMatches','originalAllRoutineOwnersMatch','receiptSha256'])('detects altered global preservation claim %s',key=>{
    const evidence=loadDeltaEvidence();const proof=evidence.globalRemainderProof;
    proof[key]=typeof proof[key]==='boolean'?false:typeof proof[key]==='number'?103:'0'.repeat(64);
    expect(()=>assertDeltaEvidence(evidence)).toThrow();
  });
  it('does not silently promote historical global observations to locally recomputed hashes',()=>{
    const evidence=loadDeltaEvidence();evidence.independentReviewReproduction.independentlyRecomputed=true;
    expect(()=>assertDeltaEvidence(evidence)).toThrow();
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
