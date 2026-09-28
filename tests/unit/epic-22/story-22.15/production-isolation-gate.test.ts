import { describe, expect, it } from 'vitest';

import {
  assessProductionCutoverReceiptOrdering,
  assessProductionMaintenanceIsolation,
  PRODUCTION_ISOLATION_AUTH_HOOKS,
} from '../../../../src/lib/release/production-isolation-gate.mjs';
import {productionManagedWriterProfileSha256,PRODUCTION_PRE_FORWARD_CLI_PROFILE,
  PRODUCTION_PRE_FORWARD_CLI_MEMBERSHIP,PRODUCTION_PRE_FORWARD_CLI_OBJECTS}
  from '../../../../src/lib/release/production-managed-writer-profiles.mjs';

const sourceSha = 'a'.repeat(40);
const targetBindingSha256 = 'b'.repeat(64);
const isolationPlanSha256 = 'c'.repeat(64);
const databaseRoleGraphSha256 = 'd'.repeat(64);
const trustedBackendProfileSha256 = 'e'.repeat(64);
const capturedAtUtc = '2026-09-23T14:00:00.000Z';
const now = new Date('2026-09-23T14:10:00.000Z');

const context = () => ({
  sourceSha,
  targetBindingSha256,
  isolationPlanSha256,
  databaseRoleGraphSha256,
  trustedBackendProfileSha256,
  priorRealtimeServiceEnabled: true,
  priorRealtimeConfigSha256: 'f'.repeat(64),
});

const bound = (kind: string, values: Record<string, unknown>) => ({
  schemaVersion: 1,
  kind,
  sourceSha,
  targetBindingSha256,
  isolationPlanSha256,
  capturedAtUtc,
  ...values,
});

function receipts() {
  return {
    pause: bound('production-pause-isolation-observation', {
      pauseDeploymentMatches: true,
      automaticDomainAssignmentDisabled: true,
      activeCronCount: 0,
    }),
    edgeFunctions: bound('production-edge-functions-isolation-observation', {
      edgeFunctionCount: 0,
    }),
    platform: bound('production-platform-isolation-observation', {
      authHookEnabled: Object.fromEntries(
        PRODUCTION_ISOLATION_AUTH_HOOKS.map((name) => [name, false])
      ),
      unknownAuthHookCount: 0,
      realtimeSuspended: true,
    }),
    realtimePriorState: bound('production-realtime-prior-state-observation', {
      capturedAtUtc: '2026-09-23T13:59:57.000Z',
      serviceEnabled: true,
      configSha256: 'f'.repeat(64),
    }),
    realtimeProbe: bound('production-realtime-denial-probe', {
      capturedAtUtc: '2026-09-23T14:00:01.000Z',
      independentFromControlObservation: true,
      connectionAttempted: true,
      connectionDenied: true,
      writeObserved: false,
      priorRealtimeServiceEnabled: true,
      httpStatus: 403,
      providerErrorCode: 'RealtimeDisabledForTenant',
      denialCause: 'realtime-disabled-for-tenant',
      existingConnectionEstablishedBeforeIsolation: true,
      existingSubscriptionAcknowledgedBeforeIsolation: true,
      existingConnectionDisconnectedByService: true,
      existingConnectionClosedByCaller: false,
      existingConnectionEstablishedAtUtc: '2026-09-23T13:59:58.000Z',
      existingSubscriptionAcknowledgedAtUtc: '2026-09-23T13:59:58.500Z',
      controlChangeStartedAtUtc: '2026-09-23T13:59:59.000Z',
      existingConnectionDisconnectedAtUtc: '2026-09-23T14:00:00.250Z',
      reconnectAttemptedAtUtc: '2026-09-23T14:00:00.700Z',
      reconnectDeniedAtUtc: '2026-09-23T14:00:00.800Z',
      connectedClientCount: 0,
      connectedClientsReportComplete: true,
      connectedClientsReportWindowStartedAtUtc: '2026-09-23T14:00:00.500Z',
      connectedClientsReportWindowEndedAtUtc: '2026-09-23T14:00:00.600Z',
      connectedClientsReportCapturedAtUtc: '2026-09-23T14:00:00.900Z',
    }),
    dataApi: bound('production-data-api-disable-observation', {
      dashboardControlObserved: true,
      dataApiDisabled: true,
    }),
    dataApiProbePrerequisite: bound('production-data-api-write-probe-prerequisite', {
      capturedAtUtc: '2026-09-23T13:59:59.000Z',
      schema: 'public',
      relation: 'employees',
      credentialRole: 'service_role',
      credentialPreflightPassed: true,
      authenticatedReadAdmissionPassed: true,
      relationExists: true,
      statementTriggerInventoryComplete: true,
      enabledStatementTriggerCount: 0,
    }),
    dataApiProbe: bound('production-data-api-denial-probe', {
      capturedAtUtc: '2026-09-23T14:00:01.000Z',
      independentFromControlObservation: true,
      authenticatedWritePathAttempted: true,
      denialCause: 'data-api-disabled',
      requestDenied: true,
      writeCommitted: false,
      requestMethod: 'POST',
      relation: 'employees',
      contentProfile: 'public',
      requestContentType: 'application/json',
      requestBody: '[]',
      httpStatus: 406,
      providerErrorCode: 'PGRST106',
    }),
    network: bound('production-network-isolation-observation', {
      restrictionStatus: 'applied',
      runnerIpv4Only: true,
      runnerIpv6Only: true,
      unrestrictedIpv4: false,
      unrestrictedIpv6: false,
      nonRunnerIpv4ProbeDenied: true,
      nonRunnerIpv6ProbeDenied: true,
    }),
    database: bound('production-database-isolation-observation', {
      databaseRoleGraphSha256,
      trustedBackendProfileSha256,
      unknownLoginRoleCount: 0,
      unknownClientBackendCount: 0,
      unknownBackendCount: 0,
      unmanagedWritePathCount: 0,
    }),
    drain: bound('production-database-drain-observation', {
      capturedAtUtc: '2026-09-23T14:00:02.000Z',
      observedAfterControlObservations: true,
      allApplicableSessionsObserved: true,
      applicableApplicationSessionCount: 0,
      inflightWriteCount: 0,
      preparedApplicationWriteCount: 0,
      existingApplicationSessionCount: 0,
      postBarrierWriteAttemptCount: 2,
      postBarrierWriteSuccessCount: 0,
      replicationSlotInventoryComplete: true,
      activeReplicationSlotCount: 0,
      subscriptionInventoryComplete: true,
      enabledSubscriptionCount: 0,
    }),
  };
}

function shutdownQuiescenceReceipts() {
  const value = receipts();
  value.realtimeProbe = bound('production-realtime-shutdown-quiescence-observation', {
    capturedAtUtc: '2026-09-23T14:00:01.000Z',
    independentFromControlObservation: true,
    controlMethod: 'supabase-management-api-realtime-disable-and-shutdown',
    priorRealtimeServiceEnabled: true,
    configDisableRequestedAtUtc: '2026-09-23T13:59:58.400Z',
    configDisableResponseAtUtc: '2026-09-23T13:59:58.500Z',
    configDisableHttpStatus: 204,
    configDisabledReadbackAtUtc: '2026-09-23T13:59:58.600Z',
    configDisabledReadbackServiceEnabled: false,
    configDisabledReadbackSha256: '9'.repeat(64),
    shutdownRequestedAtUtc: '2026-09-23T14:00:00.100Z',
    shutdownResponseAtUtc: '2026-09-23T14:00:00.200Z',
    shutdownHttpStatus: 204,
    existingConnectionEstablishedBeforeIsolation: true,
    existingSubscriptionAcknowledgedBeforeIsolation: true,
    existingConnectionDisconnectedByService: true,
    existingConnectionClosedByCaller: false,
    existingConnectionEstablishedAtUtc: '2026-09-23T13:59:58.000Z',
    existingSubscriptionAcknowledgedAtUtc: '2026-09-23T13:59:58.200Z',
    existingConnectionDisconnectedAtUtc: '2026-09-23T13:59:58.700Z',
    reconnectAttemptedAtUtc: '2026-09-23T14:00:00.500Z',
    reconnectDeniedAtUtc: '2026-09-23T14:00:00.600Z',
    connectionAttempted: true,
    connectionDenied: true,
    writeObserved: false,
    httpStatus: 403,
    providerErrorCode: 'RealtimeDisabledForTenant',
    denialCause: 'realtime-disabled-for-tenant',
  }) as unknown as typeof value.realtimeProbe;
  return value;
}

const assess = (value = receipts(), options = { expectedContext: context(), now }) =>
  assessProductionMaintenanceIsolation(value, options);

function managedProfileEvidence() {
  const evidence=receipts();
  const profile={schemaVersion:1,kind:'production-managed-writer-observation',environment:'production',phase:'pre_forward',
    sourceSha,sourceTree:'1'.repeat(40),sourceManifestSha256:'2'.repeat(64),targetBindingSha256,collectionStartedAtUtc:'2026-09-23T13:59:59.000Z',capturedAtUtc,
    cli:{presentCount:1,attributes:{...PRODUCTION_PRE_FORWARD_CLI_PROFILE},memberships:{...PRODUCTION_PRE_FORWARD_CLI_MEMBERSHIP},
      database:{connect:true,create:false,temporary:true},schemas:{schemaCount:9,usageCount:1,createCount:0,ownedSchemaCount:0},
      objects:{...PRODUCTION_PRE_FORWARD_CLI_OBJECTS},activeSessionCount:0,completeNonSecretRoleGraphSha256:databaseRoleGraphSha256},
    workers:{cronLauncherCount:1,netWorkerCount:1,otherCandidateBackendCount:0,cronPreloaded:true,netPreloaded:true,
      cronDatabaseMatchesConnected:true,netDatabaseMatchesConnected:true,cronLaunchActiveJobs:true,pgCronExtensionCount:0,
      pgNetExtensionCount:0,cronJobTablePresent:false,netRequestQueueTablePresent:false,netResponseTablePresent:false},
    rawUnknownLoginRoleCount:1,rawUnknownBackendCount:2,otherUnknownLoginRoleCount:0,otherUnknownBackendCount:0,
    correlation:{cliLoginProfileMd5:'f'.repeat(32),rawUnknownLoginProfileMd5:'f'.repeat(32),
      managedBackendProfileMd5:'a'.repeat(32),rawUnknownBackendProfileMd5:'a'.repeat(32)}};
  const profileHash=productionManagedWriterProfileSha256(profile);
  evidence.database=bound('production-database-isolation-observation',{
    databaseRoleGraphSha256,trustedBackendProfileSha256:profileHash,unknownLoginRoleCount:1,unknownClientBackendCount:0,
    unknownBackendCount:2,unmanagedWritePathCount:0,managedWriterObservation:profile}) as unknown as typeof evidence.database;
  const expectedContext={...context(),trustedBackendProfileSha256:profileHash,
    sourceTree:profile.sourceTree,sourceManifestSha256:profile.sourceManifestSha256};
  return {evidence,profile,expectedContext};
}
describe('initial managed-profile accounting in complete isolation',()=>{
  it('retains raw unknown totals while requiring exact classified profiles and every other plane',()=>{
    const {evidence,expectedContext}=managedProfileEvidence();
    expect(assessProductionMaintenanceIsolation(evidence,{expectedContext,now}).disposition).toBe('isolation_proved_not_execution_authority');
    evidence.dataApiProbe.requestDenied=false;
    expect(assessProductionMaintenanceIsolation(evidence,{expectedContext,now}).disposition).toBe('blocked_insufficient_isolation_proof');
  });
  it.each(['unknownLoginRoleCount','unknownBackendCount','unknownClientBackendCount','unmanagedWritePathCount'])('rejects unaccounted %s',key=>{
    const {evidence,expectedContext}=managedProfileEvidence();evidence.database[key]++;
    expect(assessProductionMaintenanceIsolation(evidence,{expectedContext,now}).disposition).toBe('blocked_insufficient_isolation_proof');
  });
  it('rejects forged/stale profile content even when a caller rehashes it',()=>{
    const {evidence,profile,expectedContext}=managedProfileEvidence();profile.workers.cronJobTablePresent=true;
    expectedContext.trustedBackendProfileSha256=productionManagedWriterProfileSha256(profile);
    evidence.database.trustedBackendProfileSha256=expectedContext.trustedBackendProfileSha256;
    expect(assessProductionMaintenanceIsolation(evidence,{expectedContext,now}).disposition).toBe('blocked_insufficient_isolation_proof');
    profile.workers.cronJobTablePresent=false;profile.capturedAtUtc='2026-09-23T13:30:00.000Z';
    expectedContext.trustedBackendProfileSha256=productionManagedWriterProfileSha256(profile);
    evidence.database.trustedBackendProfileSha256=expectedContext.trustedBackendProfileSha256;
    expect(assessProductionMaintenanceIsolation(evidence,{expectedContext,now}).disposition).toBe('blocked_insufficient_isolation_proof');
  });
  it('uses actual assessment time and the caller freshness limit for managed collection endpoints',()=>{
    const {evidence,profile,expectedContext}=managedProfileEvidence();
    profile.collectionStartedAtUtc='2026-09-23T13:55:00.000Z';profile.capturedAtUtc='2026-09-23T13:55:00.000Z';
    expect(assessProductionMaintenanceIsolation(evidence,{expectedContext,now}).disposition).toBe('isolation_proved_not_execution_authority');
    profile.collectionStartedAtUtc='2026-09-23T13:54:59.999Z';
    expect(assessProductionMaintenanceIsolation(evidence,{expectedContext,now}).disposition).toBe('blocked_insufficient_isolation_proof');
    const shortNow=new Date('2026-09-23T14:00:30.000Z');profile.collectionStartedAtUtc='2026-09-23T13:59:30.000Z';profile.capturedAtUtc='2026-09-23T14:00:00.000Z';
    expect(assessProductionMaintenanceIsolation(evidence,{expectedContext,now:shortNow,maxEvidenceAgeMs:60000}).disposition).toBe('isolation_proved_not_execution_authority');
    profile.collectionStartedAtUtc='2026-09-23T13:59:29.999Z';
    expect(assessProductionMaintenanceIsolation(evidence,{expectedContext,now:shortNow,maxEvidenceAgeMs:60000}).disposition).toBe('blocked_insufficient_isolation_proof');
  });
  it('rejects a managed observation captured after its enclosing database observation',()=>{
    const {evidence,profile,expectedContext}=managedProfileEvidence();profile.collectionStartedAtUtc='2026-09-23T14:00:00.001Z';profile.capturedAtUtc='2026-09-23T14:00:00.001Z';
    expect(assessProductionMaintenanceIsolation(evidence,{expectedContext,now}).disposition).toBe('blocked_insufficient_isolation_proof');
  });
  it('rejects an otherwise complete proof with a swapped source tree or manifest',()=>{
    for(const key of ['sourceTree','sourceManifestSha256']){
      const {evidence,expectedContext}=managedProfileEvidence();expectedContext[key]='0'.repeat(key==='sourceTree'?40:64);
      expect(assessProductionMaintenanceIsolation(evidence,{expectedContext,now}).disposition).toBe('blocked_insufficient_isolation_proof');
    }
  });
});

describe('Story 22.15 protected cutover cross-receipt ordering', () => {
  const now = new Date('2026-09-23T14:10:00.000Z');
  const ordered = () => ({
    reviewRecords: {
      backupRecordSha256: '1'.repeat(64), cleanupRecordSha256: '2'.repeat(64),
      cleanupCompletedAtUtc: '2026-09-23T14:04:00.000Z',
    },
    preForwardObservation: { capturedAtUtc: '2026-09-23T14:05:00.000Z' },
    staffingReceipt: { capturedAtUtc: '2026-09-23T14:05:30.000Z' },
    isolationReceipts: {
      database: { collectionStartedAtUtc: '2026-09-23T14:06:00.000Z', capturedAtUtc: '2026-09-23T14:06:01.000Z', managedWriterObservation: { collectionStartedAtUtc: '2026-09-23T14:04:30.000Z', capturedAtUtc: '2026-09-23T14:04:31.000Z' } },
      drain: { collectionStartedAtUtc: '2026-09-23T14:07:00.000Z', capturedAtUtc: '2026-09-23T14:07:01.000Z' },
    },
    now,
  });

  it('proves strictly non-overlapping completed post-cleanup collections', () => {
    expect(assessProductionCutoverReceiptOrdering(ordered())).toMatchObject({
      disposition: 'cutover_receipt_order_proved_not_execution_authority',
    });
  });

  it.each([
    ['missing cleanup completion', (value: ReturnType<typeof ordered>) => delete value.reviewRecords.cleanupCompletedAtUtc],
    ['noncanonical cleanup completion', (value: ReturnType<typeof ordered>) => (value.reviewRecords.cleanupCompletedAtUtc = '2026-09-23 14:04:00Z')],
    ['future cleanup completion', (value: ReturnType<typeof ordered>) => (value.reviewRecords.cleanupCompletedAtUtc = '2026-09-23T14:11:00.000Z')],
    ['cleanup equal to profile completion', (value: ReturnType<typeof ordered>) => (value.preForwardObservation.capturedAtUtc = '2026-09-23T14:04:00.000Z')],
    ['staffing before cleanup completion', (value: ReturnType<typeof ordered>) => (value.staffingReceipt.capturedAtUtc = '2026-09-23T14:03:59.000Z')],
    ['database begins before a post-cleanup collector closes', (value: ReturnType<typeof ordered>) => (value.isolationReceipts.database.collectionStartedAtUtc = '2026-09-23T14:05:30.000Z')],
    ['database collection ends when drain begins', (value: ReturnType<typeof ordered>) => (value.isolationReceipts.drain.collectionStartedAtUtc = '2026-09-23T14:06:01.000Z')],
    ['database interval is reversed', (value: ReturnType<typeof ordered>) => (value.isolationReceipts.database.collectionStartedAtUtc = '2026-09-23T14:06:02.000Z')],
    ['drain interval is reversed', (value: ReturnType<typeof ordered>) => (value.isolationReceipts.drain.collectionStartedAtUtc = '2026-09-23T14:07:02.000Z')],
    ['future final database completion', (value: ReturnType<typeof ordered>) => (value.isolationReceipts.database.capturedAtUtc = '2026-09-23T14:11:00.000Z')],
    ['future drain completion', (value: ReturnType<typeof ordered>) => (value.isolationReceipts.drain.capturedAtUtc = '2026-09-23T14:11:00.000Z')],
  ])('rejects %s', (_label, mutate) => {
    const value = ordered();
    mutate(value);
    expect(assessProductionCutoverReceiptOrdering(value)).toMatchObject({
      disposition: 'blocked_cutover_receipt_order',
    });
  });

  it('requires the managed-writer collector to complete after cleanup and before final database collection', () => {
    const value = ordered();
    value.isolationReceipts.database.managedWriterObservation = {
      collectionStartedAtUtc: '2026-09-23T14:05:45.000Z', capturedAtUtc: '2026-09-23T14:05:46.000Z',
    };
    expect(assessProductionCutoverReceiptOrdering(value)).toMatchObject({
      disposition: 'cutover_receipt_order_proved_not_execution_authority',
    });
    value.isolationReceipts.database.managedWriterObservation.collectionStartedAtUtc = '2026-09-23T14:04:00.000Z';
    expect(assessProductionCutoverReceiptOrdering(value)).toMatchObject({
      disposition: 'blocked_cutover_receipt_order',
    });
  });
});

describe('Story 22.15 interval-bearing isolation receipts', () => {
  it.each([
    ['a noncanonical database start', (value: ReturnType<typeof receipts>) => { (value.database as Record<string, unknown>).collectionStartedAtUtc = '2026-09-23 14:00:00Z'; }],
    ['a future database start', (value: ReturnType<typeof receipts>) => { (value.database as Record<string, unknown>).collectionStartedAtUtc = '2026-09-23T14:11:00.000Z'; }],
    ['a reversed database interval', (value: ReturnType<typeof receipts>) => { (value.database as Record<string, unknown>).collectionStartedAtUtc = '2026-09-23T14:00:00.001Z'; }],
    ['a future drain start', (value: ReturnType<typeof receipts>) => { (value.drain as Record<string, unknown>).collectionStartedAtUtc = '2026-09-23T14:11:00.000Z'; }],
    ['a reversed drain interval', (value: ReturnType<typeof receipts>) => { (value.drain as Record<string, unknown>).collectionStartedAtUtc = '2026-09-23T14:00:02.001Z'; }],
  ])('does not admit %s', (_label, mutate) => {
    const value = receipts();
    mutate(value);
    expect(assess(value)).toMatchObject({
      disposition: 'blocked_insufficient_isolation_proof',
    });
  });
});

function sameComputerReceipts() {
  const value = receipts();
  value.network = bound('production-network-exclusion-control-observation', {
    capturedAtUtc: '2026-09-23T14:00:05.000Z',
    verificationMethod: 'same-computer-exclusion-control',
    restrictionStatus: 'applied',
    operatorIpv4AllowlistCount: 1,
    operatorIpv4AllowlistMatches: true,
    ipv6AllowlistCount: 0,
    operatorIpv6EgressUnavailable: true,
    ipv6Verification: 'applied-policy-only-no-live-probe',
    operatorEgressStable: true,
    managementApiRollbackVerified: true,
    priorPoolerConnectionSucceeded: true,
    excludedOperatorConfigApplied: true,
    excludedIpv4AllowlistCount: 1,
    excludedIpv4AllowlistMatchesReviewedRule: true,
    excludedIpv6AllowlistCount: 0,
    excludedOperatorPoolerConnectionDenied: true,
    denialCause: 'network-restriction',
    credentialAndTlsInputsUnchanged: true,
    restoredOperatorPoolerConnectionSucceeded: true,
    freshReadOnlyTransactionConfirmed: true,
    excludedConfigSha256: '1'.repeat(64),
    finalConfigSha256: '2'.repeat(64),
    priorPoolerConnectionAtUtc: '2026-09-23T14:00:00.000Z',
    excludedConfigObservedAtUtc: '2026-09-23T14:00:01.000Z',
    denialProbeAtUtc: '2026-09-23T14:00:02.000Z',
    finalConfigObservedAtUtc: '2026-09-23T14:00:03.000Z',
    admissionProbeAtUtc: '2026-09-23T14:00:04.000Z',
  }) as unknown as typeof value.network;
  value.drain.capturedAtUtc = '2026-09-23T14:00:06.000Z';
  return value;
}

describe('Story 22.15 production maintenance isolation gate', () => {
  it('accepts the documented project-wide shutdown alternative without a metrics claim', () => {
    const value = shutdownQuiescenceReceipts();
    expect(assess(value)).toMatchObject({
      disposition: 'isolation_proved_not_execution_authority',
    });
    expect(value.realtimeProbe).not.toHaveProperty('connectedClientCount');
    expect(value.realtimeProbe).not.toHaveProperty('connectedClientsReportComplete');
  });

  it.each([
    ['an unrecognized control method', 'controlMethod', 'dashboard-chart-zero'],
    ['a non-successful disable response', 'configDisableHttpStatus', 200],
    ['a non-successful global shutdown response', 'shutdownHttpStatus', 503],
    ['a readback that leaves Realtime enabled', 'configDisabledReadbackServiceEnabled', true],
    ['a readback hash that still matches enabled prior state', 'configDisabledReadbackSha256', 'f'.repeat(64)],
    ['a caller-closed controlled connection', 'existingConnectionClosedByCaller', true],
    ['a wrong reconnect cause', 'denialCause', 'authentication-failure'],
    ['a wrong provider response', 'providerErrorCode', 'Unauthorized'],
    ['a non-403 reconnect response', 'httpStatus', 401],
    ['a connection close before disablement', 'existingConnectionDisconnectedAtUtc', '2026-09-23T13:59:58.300Z'],
    ['a reconnect before global shutdown succeeds', 'reconnectAttemptedAtUtc', '2026-09-23T14:00:00.100Z'],
  ])('rejects shutdown evidence with %s', (_label, key, invalidValue) => {
    const value = shutdownQuiescenceReceipts();
    (value.realtimeProbe as Record<string, unknown>)[key] = invalidValue;
    expect(assess(value).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it('rejects reports, unknown fields, getters, wrong binding, and stale shutdown evidence', () => {
    const reportFallback = shutdownQuiescenceReceipts();
    Object.assign(reportFallback.realtimeProbe, {
      connectedClientCount: 0,
      connectedClientsReportComplete: true,
    });
    expect(assess(reportFallback).disposition).toBe('blocked_insufficient_isolation_proof');

    const extra = shutdownQuiescenceReceipts();
    Object.assign(extra.realtimeProbe, { providerClaimsAllConnectionsClosed: true });
    expect(assess(extra).disposition).toBe('blocked_insufficient_isolation_proof');

    const getter = shutdownQuiescenceReceipts();
    Object.defineProperty(getter.realtimeProbe, 'shutdownHttpStatus', {
      enumerable: true,
      get() { throw new Error('getter must not execute'); },
    });
    expect(assess(getter).disposition).toBe('blocked_insufficient_isolation_proof');

    const wrongBinding = shutdownQuiescenceReceipts();
    wrongBinding.realtimeProbe.sourceSha = 'f'.repeat(40);
    expect(assess(wrongBinding).reason).toBe('isolation_receipt_context_mismatch');

    const stale = shutdownQuiescenceReceipts();
    expect(assess(stale, {
      expectedContext: context(),
      now: new Date('2026-09-23T14:16:00.000Z'),
    }).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it.each([
    ['an incomplete slot inventory', 'replicationSlotInventoryComplete', false],
    ['an active replication slot', 'activeReplicationSlotCount', 1],
    ['an incomplete subscription inventory', 'subscriptionInventoryComplete', false],
    ['an enabled subscription', 'enabledSubscriptionCount', 1],
  ])('rejects an incomplete database drain with %s', (_label, key, invalidValue) => {
    const value = shutdownQuiescenceReceipts();
    (value.drain as unknown as Record<string, unknown>)[key] = invalidValue;
    expect(assess(value).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it.each([
    ['denialCause', 'authentication-failure'],
    ['denialCause', 'outage'],
    ['denialCause', 'unclassified-timeout'],
    ['denialCause', undefined],
    ['httpStatus', 401],
    ['httpStatus', 503],
    ['providerErrorCode', 'Unauthorized'],
    ['providerErrorCode', undefined],
    ['providerErrorCode', ['RealtimeDisabledForTenant']],
    ['existingConnectionEstablishedBeforeIsolation', false],
    ['existingSubscriptionAcknowledgedBeforeIsolation', false],
    ['existingConnectionDisconnectedByService', false],
    ['existingConnectionClosedByCaller', true],
    ['priorRealtimeServiceEnabled', false],
    ['connectedClientCount', 1],
    ['connectedClientCount', '0'],
    ['connectedClientsReportComplete', false],
    ['connectedClientsReportWindowStartedAtUtc', '2026-09-23T13:59:59.000Z'],
    ['connectedClientsReportWindowStartedAtUtc', capturedAtUtc],
    ['connectedClientsReportWindowStartedAtUtc', '2026-09-23T14:00:00.100Z'],
    ['connectedClientsReportWindowEndedAtUtc', '2026-09-23T14:00:00.500Z'],
    ['connectedClientsReportCapturedAtUtc', '2026-09-23T14:00:00.550Z'],
    ['connectedClientsReportCapturedAtUtc', '2026-09-23T14:00:01.100Z'],
    ['existingConnectionEstablishedAtUtc', '2026-09-23T13:54:59.000Z'],
    ['existingConnectionEstablishedAtUtc', '2026-09-23T13:59:59.000Z'],
    ['existingConnectionEstablishedAtUtc', '2026-09-23T13:59:57.000Z'],
    ['existingSubscriptionAcknowledgedAtUtc', '2026-09-23T13:59:58.000Z'],
    ['existingSubscriptionAcknowledgedAtUtc', '2026-09-23T13:59:59.000Z'],
    ['existingSubscriptionAcknowledgedAtUtc', '2026-09-23T14:00:00.000Z'],
    ['existingSubscriptionAcknowledgedAtUtc', null],
    ['reconnectAttemptedAtUtc', capturedAtUtc],
    ['reconnectAttemptedAtUtc', '2026-09-23T13:59:59.000Z'],
    ['reconnectAttemptedAtUtc', '2026-09-23T14:00:00.200Z'],
    ['reconnectAttemptedAtUtc', '2026-09-23T14:00:00.800Z'],
    ['reconnectDeniedAtUtc', '2026-09-23T14:00:00.700Z'],
    ['reconnectDeniedAtUtc', '2026-09-23T14:00:01.100Z'],
    ['reconnectDeniedAtUtc', null],
    ['controlChangeStartedAtUtc', '2026-09-23T14:00:00.100Z'],
    ['existingConnectionDisconnectedAtUtc', '2026-09-23T13:59:58.500Z'],
    ['existingConnectionDisconnectedAtUtc', null],
  ])('rejects missing, unrelated or incomplete Realtime proof: %s', (key, value) => {
    const evidence = receipts();
    (evidence.realtimeProbe as Record<string, unknown>)[key] = value;
    expect(assess(evidence).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it('does not accept the legacy Realtime boolean-only receipt', () => {
    const evidence = receipts();
    evidence.realtimeProbe = bound('production-realtime-denial-probe', {
      capturedAtUtc: '2026-09-23T14:00:01.000Z', independentFromControlObservation: true,
      connectionAttempted: true, connectionDenied: true, writeObserved: false,
    }) as unknown as typeof evidence.realtimeProbe;
    const oldContext = { ...context() } as Record<string, unknown>;
    delete oldContext.priorRealtimeServiceEnabled;
    expect(assessProductionMaintenanceIsolation(evidence, { expectedContext: oldContext, now }).disposition)
      .toBe('blocked_insufficient_isolation_proof');
  });

  it('accepts a service disconnect after the change starts but before its configuration readback', () => {
    const evidence = receipts();
    evidence.realtimeProbe.existingConnectionDisconnectedAtUtc = '2026-09-23T13:59:59.500Z';
    expect(assess(evidence).disposition).toBe('isolation_proved_not_execution_authority');
  });

  it('rejects a control-change start equal to the platform readback', () => {
    const evidence = receipts();
    evidence.realtimeProbe.controlChangeStartedAtUtc = evidence.platform.capturedAtUtc;
    expect(assess(evidence).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it('rejects a zero-client report window starting exactly at the service disconnect', () => {
    const evidence = receipts();
    evidence.realtimeProbe.connectedClientsReportWindowStartedAtUtc =
      evidence.realtimeProbe.existingConnectionDisconnectedAtUtc;
    expect(assess(evidence).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it('preserves an already-disabled service without inventing an existing-client disconnect', () => {
    const evidence = receipts();
    evidence.realtimePriorState.serviceEnabled = false;
    Object.assign(evidence.realtimeProbe, {
      priorRealtimeServiceEnabled: false,
      existingConnectionEstablishedBeforeIsolation: false,
      existingSubscriptionAcknowledgedBeforeIsolation: false,
      existingConnectionDisconnectedByService: false,
      existingConnectionEstablishedAtUtc: null,
      existingSubscriptionAcknowledgedAtUtc: null,
      controlChangeStartedAtUtc: null,
      existingConnectionDisconnectedAtUtc: null,
    });
    const options = { expectedContext: { ...context(), priorRealtimeServiceEnabled: false }, now };
    expect(assess(evidence, options).disposition).toBe('isolation_proved_not_execution_authority');
    for (const mutation of [
      { existingConnectionEstablishedBeforeIsolation: true },
      { existingSubscriptionAcknowledgedBeforeIsolation: true },
      { existingConnectionDisconnectedByService: true },
      { existingConnectionClosedByCaller: true },
      { controlChangeStartedAtUtc: '2026-09-23T13:59:59.000Z' },
      { existingConnectionEstablishedAtUtc: '2026-09-23T13:59:58.000Z' },
      { existingSubscriptionAcknowledgedAtUtc: '2026-09-23T13:59:58.500Z' },
      { existingConnectionDisconnectedAtUtc: '2026-09-23T14:00:00.250Z' },
    ]) {
      const changed = { ...evidence, realtimeProbe: { ...evidence.realtimeProbe, ...mutation } };
      expect(assess(changed, options).disposition).toBe('blocked_insufficient_isolation_proof');
    }
    expect(assess(evidence).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it.each([
    ['serviceEnabled', false],
    ['serviceEnabled', undefined],
    ['configSha256', '0'.repeat(64)],
    ['configSha256', ['f'.repeat(64)]],
    ['capturedAtUtc', '2026-09-23T13:54:59.000Z'],
    ['capturedAtUtc', '2026-09-23T13:59:58.000Z'],
    ['sourceSha', '0'.repeat(40)],
    ['targetBindingSha256', '0'.repeat(64)],
    ['isolationPlanSha256', '0'.repeat(64)],
  ])('rejects unbound or misordered prior Realtime state: %s', (key, value) => {
    const evidence = receipts();
    (evidence.realtimePriorState as Record<string, unknown>)[key] = value;
    expect(assess(evidence).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it('cannot select the already-disabled branch without an independent prior-state observation', () => {
    const evidence = receipts();
    Object.assign(evidence.realtimeProbe, {
      priorRealtimeServiceEnabled: false,
      existingConnectionEstablishedBeforeIsolation: false,
      existingSubscriptionAcknowledgedBeforeIsolation: false,
      existingConnectionDisconnectedByService: false,
      existingConnectionEstablishedAtUtc: null,
      existingSubscriptionAcknowledgedAtUtc: null,
      controlChangeStartedAtUtc: null,
      existingConnectionDisconnectedAtUtc: null,
    });
    const options = { expectedContext: { ...context(), priorRealtimeServiceEnabled: false }, now };
    expect(assess(evidence, options).disposition).toBe('blocked_insufficient_isolation_proof');
    evidence.realtimePriorState.serviceEnabled = false;
    evidence.realtimePriorState.capturedAtUtc = capturedAtUtc;
    expect(assess(evidence, options).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it('requires every prior-state field and rejects extras or getters without executing them', () => {
    for (const key of Object.keys(receipts().realtimePriorState)) {
      const evidence = receipts();
      delete (evidence.realtimePriorState as Record<string, unknown>)[key];
      expect(assess(evidence).disposition, key).toBe('blocked_insufficient_isolation_proof');
    }
    for (const key of ['serviceEnabled', 'configSha256']) {
      const evidence = receipts();
      Object.defineProperty(evidence.realtimePriorState, key, {
        enumerable: true, get() { throw new Error('getter must not execute'); },
      });
      expect(assess(evidence).disposition).toBe('blocked_insufficient_isolation_proof');
    }
    const evidence = receipts();
    Object.assign(evidence.realtimePriorState, { approved: true });
    expect(assess(evidence).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it('rejects every missing Realtime proof field and getters without executing them', () => {
    for (const key of Object.keys(receipts().realtimeProbe)) {
      const evidence = receipts();
      delete (evidence.realtimeProbe as Record<string, unknown>)[key];
      expect(assess(evidence).disposition, key).toBe('blocked_insufficient_isolation_proof');
    }
    const evidence = receipts();
    Object.defineProperty(evidence.realtimeProbe, 'denialCause', {
      enumerable: true, get() { throw new Error('getter must not execute'); },
    });
    expect(assess(evidence).disposition).toBe('blocked_insufficient_isolation_proof');
  });
  it.each(['invalid-jwt', 'missing-relation', 'missing-function', 'outage', 'unclassified-timeout', null, undefined])('rejects a Data API denial unrelated to disablement: %s', (denialCause) => {
    for (const value of [receipts(), sameComputerReceipts()]) {
      (value.dataApiProbe as Record<string, unknown>).denialCause = denialCause;
      expect(assess(value).disposition).toBe('blocked_insufficient_isolation_proof');
    }
    const value = sameComputerReceipts();
    value.dataApi = bound('production-data-api-disable-management-observation', {
      managementApiControlObserved: true, dbSchema: '', otherPostgrestSettingsPreserved: true, dataApiDisabled: true,
    }) as unknown as typeof value.dataApi;
    (value.dataApiProbe as Record<string, unknown>).denialCause = denialCause;
    expect(assess(value).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it.each([
    ['requestMethod', 'GET'],
    ['requestMethod', 'PATCH'],
    ['relation', 'missing_relation'],
    ['contentProfile', 'private'],
    ['requestContentType', 'text/plain'],
    ['requestBody', '{}'],
    ['requestBody', '[{}]'],
    ['requestBody', []],
    ['httpStatus', 401],
    ['httpStatus', 503],
    ['providerErrorCode', 'PGRST116'],
    ['providerErrorCode', 'PGRST301'],
    ['providerErrorCode', 'PGRST205'],
  ])('rejects a different Data API request or denial: %s', (key, invalid) => {
    for (const evidence of [receipts(), sameComputerReceipts()]) {
      (evidence.dataApiProbe as Record<string, unknown>)[key] = invalid;
      expect(assess(evidence).disposition).toBe('blocked_insufficient_isolation_proof');
    }
  });

  it.each([
    ['schema', 'private'],
    ['relation', 'missing_relation'],
    ['credentialRole', 'anon'],
    ['credentialPreflightPassed', false],
    ['authenticatedReadAdmissionPassed', false],
    ['relationExists', false],
    ['statementTriggerInventoryComplete', false],
    ['enabledStatementTriggerCount', 1],
    ['enabledStatementTriggerCount', '0'],
    ['capturedAtUtc', capturedAtUtc],
    ['capturedAtUtc', '2026-09-23T14:00:01.000Z'],
    ['capturedAtUtc', '2026-09-23T13:54:59.000Z'],
    ['sourceSha', '9'.repeat(40)],
    ['targetBindingSha256', '9'.repeat(64)],
    ['isolationPlanSha256', '9'.repeat(64)],
  ])('rejects missing or incomplete independent Data API prerequisites: %s', (key, invalid) => {
    const evidence = receipts();
    (evidence.dataApiProbePrerequisite as Record<string, unknown>)[key] = invalid;
    expect(assess(evidence).disposition).not.toBe('isolation_proved_not_execution_authority');
  });

  it('requires closed Data API prerequisite and probe receipts without evaluating getters', () => {
    for (const receiptName of ['dataApiProbePrerequisite', 'dataApiProbe'] as const) {
      for (const key of Object.keys(receipts()[receiptName])) {
        const evidence = receipts();
        delete (evidence[receiptName] as Record<string, unknown>)[key];
        expect(assess(evidence).disposition, `${receiptName}.${key}`).not.toBe('isolation_proved_not_execution_authority');
      }
      for (const key of Object.keys(receipts()[receiptName])) {
        const evidence = receipts();
        Object.defineProperty(evidence[receiptName], key, {
          enumerable: true, get() { throw new Error('getter must not execute'); },
        });
        expect(assess(evidence).disposition, `${receiptName}.${key}`).not.toBe('isolation_proved_not_execution_authority');
      }
      const evidence = receipts();
      Object.assign(evidence[receiptName], { approved: true });
      expect(assess(evidence).disposition).not.toBe('isolation_proved_not_execution_authority');
    }
  });

  it('accepts the exact Management API equivalent of Data API off only with an independent denial probe', () => {
    const value = sameComputerReceipts();
    const management = bound('production-data-api-disable-management-observation', {
      managementApiControlObserved: true,
      dbSchema: '',
      otherPostgrestSettingsPreserved: true,
      dataApiDisabled: true,
    });
    value.dataApi = management as unknown as typeof value.dataApi;
    expect(assess(value).disposition).toBe('isolation_proved_not_execution_authority');
    value.dataApiProbe.requestDenied = false;
    expect(assess(value).disposition).toBe('blocked_insufficient_isolation_proof');
    value.dataApiProbe.requestDenied = true;
    for (const [key, invalid] of [
      ['managementApiControlObserved', false],
      ['dbSchema', 'public'],
      ['dbSchema', ' '],
      ['dbSchema', null],
      ['otherPostgrestSettingsPreserved', false],
      ['dataApiDisabled', false],
    ] as const) {
      value.dataApi = { ...management, [key]: invalid } as unknown as typeof value.dataApi;
      expect(assess(value).disposition, key).toBe('blocked_insufficient_isolation_proof');
    }
    for (const key of Object.keys(management)) {
      value.dataApi = { ...management } as unknown as typeof value.dataApi;
      delete (value.dataApi as unknown as Record<string, unknown>)[key];
      expect(assess(value).disposition, key).toBe('blocked_insufficient_isolation_proof');
    }
    value.dataApi = { ...management, dashboardControlObserved: true } as unknown as typeof value.dataApi;
    expect(assess(value).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it('accepts an exact same-computer exclusion/admission control without claiming a live IPv6 probe', () => {
    expect(assess(sameComputerReceipts())).toMatchObject({
      disposition: 'isolation_proved_not_execution_authority',
    });
  });

  it.each([
    ['operatorIpv4AllowlistCount', 2],
    ['operatorIpv4AllowlistMatches', false],
    ['ipv6AllowlistCount', 1],
    ['operatorIpv6EgressUnavailable', false],
    ['ipv6Verification', 'live-probe'],
    ['operatorEgressStable', false],
    ['managementApiRollbackVerified', false],
    ['priorPoolerConnectionSucceeded', false],
    ['excludedOperatorConfigApplied', false],
    ['excludedIpv4AllowlistCount', 0],
    ['excludedIpv4AllowlistCount', 2],
    ['excludedIpv4AllowlistMatchesReviewedRule', false],
    ['excludedIpv6AllowlistCount', 1],
    ['excludedOperatorPoolerConnectionDenied', false],
    ['denialCause', 'authentication-failure'],
    ['denialCause', 'unclassified-timeout'],
    ['credentialAndTlsInputsUnchanged', false],
    ['restoredOperatorPoolerConnectionSucceeded', false],
    ['freshReadOnlyTransactionConfirmed', false],
    ['restrictionStatus', 'stored'],
    ['verificationMethod', 'owner-attestation'],
    ['excludedConfigSha256', 'invalid'],
    ['excludedConfigSha256', ['1'.repeat(64)]],
    ['finalConfigSha256', ['2'.repeat(64)]],
    ['finalConfigSha256', '1'.repeat(64)],
    ['denialProbeAtUtc', '2026-09-23T14:00:01.000Z'],
    ['finalConfigObservedAtUtc', '2026-09-23T14:00:01.000Z'],
    ['admissionProbeAtUtc', '2026-09-23T14:00:06.000Z'],
    ['priorPoolerConnectionAtUtc', 'invalid'],
    ['priorPoolerConnectionAtUtc', '2026-09-23T14:00:01.000Z'],
    ['priorPoolerConnectionAtUtc', '2026-09-23T13:54:59.000Z'],
    ['excludedConfigObservedAtUtc', 'invalid'],
    ['excludedConfigObservedAtUtc', '2026-09-23T13:54:59.000Z'],
  ])('rejects incomplete or misordered same-computer evidence: %s', (key, invalidValue) => {
    const value = sameComputerReceipts();
    (value.network as unknown as Record<string, unknown>)[key] = invalidValue;
    expect(assess(value).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it('rejects every missing same-computer field and rejects extra external-probe claims', () => {
    for (const key of Object.keys(sameComputerReceipts().network)) {
      const value = sameComputerReceipts();
      delete (value.network as unknown as Record<string, unknown>)[key];
      expect(assess(value).disposition, key).toBe('blocked_insufficient_isolation_proof');
    }
    const value = sameComputerReceipts();
    Object.assign(value.network, { nonRunnerIpv6ProbeDenied: true });
    expect(assess(value).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it('rejects a same-computer getter without executing it', () => {
    const value = sameComputerReceipts();
    Object.defineProperty(value.network, 'verificationMethod', {
      enumerable: true,
      get() { throw new Error('getter must not execute'); },
    });
    expect(assess(value).disposition).toBe('blocked_insufficient_isolation_proof');
    const hashValue = sameComputerReceipts();
    Object.assign(hashValue.network, {
      excludedConfigSha256: { toString() { throw new Error('coercion must not execute'); } },
    });
    expect(assess(hashValue).disposition).toBe('blocked_insufficient_isolation_proof');
  });

  it('accepts only complete independently observed controls and remains non-authorizing', () => {
    expect(assess()).toEqual({
      schemaVersion: 1,
      kind: 'production-maintenance-isolation-assessment',
      disposition: 'isolation_proved_not_execution_authority',
      reason: 'fresh_bound_independent_controls_and_drain_proven',
    });
  });

  it('accepts an IPv4-only operator only when IPv6 has no allowance and both non-operator probes are denied', () => {
    const value = receipts();
    Object.assign(value.network, {
      runnerIpv6Only: false,
      operatorIpv6EgressUnavailable: true,
      ipv6AllowlistEmpty: true,
    });
    expect(assess(value)).toMatchObject({
      disposition: 'isolation_proved_not_execution_authority',
    });

    for (const mutation of [
      { ipv6AllowlistEmpty: false },
      { operatorIpv6EgressUnavailable: false },
      { runnerIpv6Only: true },
      { nonRunnerIpv6ProbeDenied: false },
      { nonRunnerIpv4ProbeDenied: false },
      { unrestrictedIpv6: true },
    ]) {
      const denied = receipts();
      Object.assign(denied.network, value.network, mutation);
      expect(assess(denied)).toMatchObject({
        disposition: 'blocked_insufficient_isolation_proof',
        reason: 'required_isolation_receipt_missing_or_invalid',
      });
    }

    const missing = receipts();
    Object.assign(missing.network, value.network);
    delete (missing.network as Record<string, unknown>).ipv6AllowlistEmpty;
    expect(assess(missing)).toMatchObject({
      disposition: 'blocked_insufficient_isolation_proof',
    });
  });

  it('does not accept caller approval or isolation booleans as a substitute for receipts', () => {
    expect(assessProductionMaintenanceIsolation(
      { isolationPassed: true, productionWriteApproved: true } as never,
      { expectedContext: { ...context(), productionWriteApproved: true } as never, now }
    )).toMatchObject({
      disposition: 'blocked_insufficient_isolation_proof',
      reason: 'required_isolation_receipt_missing_or_invalid',
    });
  });

  it.each([
    ['the pause target', (value: ReturnType<typeof receipts>) => { value.pause.pauseDeploymentMatches = false; }],
    ['a Vercel cron', (value: ReturnType<typeof receipts>) => { value.pause.activeCronCount = 1; }],
    ['an Edge Function', (value: ReturnType<typeof receipts>) => { value.edgeFunctions.edgeFunctionCount = 1; }],
    ['an enabled Auth hook', (value: ReturnType<typeof receipts>) => { value.platform.authHookEnabled.hook_send_email_enabled = true; }],
    ['unsuspended Realtime', (value: ReturnType<typeof receipts>) => { value.platform.realtimeSuspended = false; }],
    ['a missing independent Data API denial probe', (value: ReturnType<typeof receipts>) => { value.dataApiProbe.independentFromControlObservation = false; }],
    ['an unrestricted IPv6 network path', (value: ReturnType<typeof receipts>) => { value.network.unrestrictedIpv6 = true; }],
  ])('blocks %s', (_label, mutate) => {
    const value = receipts();
    mutate(value);
    expect(assess(value)).toMatchObject({
      disposition: 'blocked_insufficient_isolation_proof',
      reason: 'required_isolation_receipt_missing_or_invalid',
    });
  });

  it('blocks a prepared write that existed before the connection barrier', () => {
    const value = receipts();
    value.drain.preparedApplicationWriteCount = 1;
    expect(assess(value)).toMatchObject({
      disposition: 'blocked_insufficient_isolation_proof',
      reason: 'required_isolation_receipt_missing_or_invalid',
    });
  });

  it('blocks CONNECT revocation when an existing application session remains', () => {
    const value = receipts();
    value.drain.existingApplicationSessionCount = 1;
    expect(assess(value)).toMatchObject({
      disposition: 'blocked_insufficient_isolation_proof',
      reason: 'required_isolation_receipt_missing_or_invalid',
    });
  });

  it.each([
    ['a mismatched source', (value: ReturnType<typeof receipts>) => { value.network.sourceSha = 'e'.repeat(40); }],
    ['a mismatched role graph', (value: ReturnType<typeof receipts>) => { value.database.databaseRoleGraphSha256 = 'e'.repeat(64); }],
    ['a stale receipt', (value: ReturnType<typeof receipts>) => { value.pause.capturedAtUtc = '2026-09-23T13:54:59.999Z'; }],
    ['a control observation after the bounded drain', (value: ReturnType<typeof receipts>) => { value.edgeFunctions.capturedAtUtc = '2026-09-23T14:00:02.001Z'; }],
    ['a drain observed before the database inspection', (value: ReturnType<typeof receipts>) => { value.drain.capturedAtUtc = '2026-09-23T13:59:59.999Z'; }],
    ['a Realtime denial recorded before Realtime was suspended', (value: ReturnType<typeof receipts>) => { value.realtimeProbe.capturedAtUtc = '2026-09-23T13:59:59.999Z'; }],
    ['a Data API denial recorded before the Data API was disabled', (value: ReturnType<typeof receipts>) => { value.dataApiProbe.capturedAtUtc = '2026-09-23T13:59:59.999Z'; }],
  ])('blocks %s', (_label, mutate) => {
    const value = receipts();
    mutate(value);
    expect(assess(value)).toMatchObject({ disposition: 'blocked_insufficient_isolation_proof' });
  });

  it('rejects unknown fields and getter-backed receipts without executing a getter', () => {
    const extra = receipts() as unknown as Record<string, unknown>;
    extra.isolationPassed = true;
    expect(assess(extra as ReturnType<typeof receipts>)).toMatchObject({
      reason: 'required_isolation_receipt_missing_or_invalid',
    });

    const hidden = receipts();
    Object.defineProperty(hidden.pause, 'unreviewed', { value: true });
    expect(assess(hidden)).toMatchObject({
      reason: 'required_isolation_receipt_missing_or_invalid',
    });

    const getter = receipts();
    Object.defineProperty(getter.pause, 'activeCronCount', {
      enumerable: true,
      get() {
        throw new Error('getter must not execute');
      },
    });
    expect(assess(getter)).toMatchObject({
      reason: 'required_isolation_receipt_missing_or_invalid',
    });
  });
});
