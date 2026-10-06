import { PRODUCTION_ISOLATION_AUTH_HOOKS } from '../../src/lib/release/production-isolation-gate.mjs';
import {
  PRODUCTION_PRE_FORWARD_CLI_MEMBERSHIP,
  PRODUCTION_PRE_FORWARD_CLI_OBJECTS, PRODUCTION_PRE_FORWARD_CLI_ROUTINE_SNAPSHOT,
  PRODUCTION_PRE_FORWARD_CLI_PROFILE,
  productionManagedWriterProfileSha256,
} from '../../src/lib/release/production-managed-writer-profiles.mjs';

const sourceSha = 'a'.repeat(40);
const sourceTree = 'b'.repeat(40);
const sourceManifestSha256 = 'c'.repeat(64);
const targetBindingSha256 = 'd'.repeat(64);
const isolationPlanSha256 = 'e'.repeat(64);
const databaseRoleGraphSha256 = 'f'.repeat(64);
const trustedBackendProfileSha256 = '1'.repeat(64);
const capturedAtUtc = '2026-09-23T14:00:00.000Z';

const bound = (kind, values) => ({
  schemaVersion: 1, kind, sourceSha, targetBindingSha256, isolationPlanSha256,
  capturedAtUtc, ...values,
});

/** Test-only, entirely synthetic positive packet for consumer signature/gate tests. */
export function createValidIsolationEvidenceFixture() {
  const isolationContext = {
    sourceSha, sourceTree, sourceManifestSha256, targetBindingSha256,
    isolationPlanSha256, databaseRoleGraphSha256, trustedBackendProfileSha256,
    priorRealtimeServiceEnabled: true, priorRealtimeConfigSha256: '2'.repeat(64),
  };
  const isolationReceipts = {
    pause: bound('production-pause-isolation-observation', {
      pauseDeploymentMatches: true, automaticDomainAssignmentDisabled: true, activeCronCount: 0,
    }),
    edgeFunctions: bound('production-edge-functions-isolation-observation', { edgeFunctionCount: 0 }),
    platform: bound('production-platform-isolation-observation', {
      authHookEnabled: Object.fromEntries(PRODUCTION_ISOLATION_AUTH_HOOKS.map((name) => [name, false])),
      unknownAuthHookCount: 0, realtimeSuspended: true,
    }),
    realtimePriorState: bound('production-realtime-prior-state-observation', {
      capturedAtUtc: '2026-09-23T13:59:57.000Z', serviceEnabled: true, configSha256: '2'.repeat(64),
    }),
    realtimeProbe: bound('production-realtime-denial-probe', {
      capturedAtUtc: '2026-09-23T14:00:01.000Z', independentFromControlObservation: true,
      connectionAttempted: true, connectionDenied: true, writeObserved: false, priorRealtimeServiceEnabled: true,
      httpStatus: 403, providerErrorCode: 'RealtimeDisabledForTenant', denialCause: 'realtime-disabled-for-tenant',
      existingConnectionEstablishedBeforeIsolation: true, existingSubscriptionAcknowledgedBeforeIsolation: true,
      existingConnectionDisconnectedByService: true, existingConnectionClosedByCaller: false,
      existingConnectionEstablishedAtUtc: '2026-09-23T13:59:58.000Z',
      existingSubscriptionAcknowledgedAtUtc: '2026-09-23T13:59:58.500Z',
      controlChangeStartedAtUtc: '2026-09-23T13:59:59.000Z',
      existingConnectionDisconnectedAtUtc: '2026-09-23T14:00:00.250Z',
      reconnectAttemptedAtUtc: '2026-09-23T14:00:00.700Z', reconnectDeniedAtUtc: '2026-09-23T14:00:00.800Z',
      connectedClientCount: 0, connectedClientsReportComplete: true,
      connectedClientsReportWindowStartedAtUtc: '2026-09-23T14:00:00.500Z',
      connectedClientsReportWindowEndedAtUtc: '2026-09-23T14:00:00.600Z',
      connectedClientsReportCapturedAtUtc: '2026-09-23T14:00:00.900Z',
    }),
    dataApi: bound('production-data-api-disable-observation', { dashboardControlObserved: true, dataApiDisabled: true }),
    dataApiProbePrerequisite: bound('production-data-api-write-probe-prerequisite', {
      capturedAtUtc: '2026-09-23T13:59:59.000Z', schema: 'public', relation: 'employees', credentialRole: 'service_role',
      credentialPreflightPassed: true, authenticatedReadAdmissionPassed: true, relationExists: true,
      statementTriggerInventoryComplete: true, enabledStatementTriggerCount: 0,
    }),
    dataApiProbe: bound('production-data-api-denial-probe', {
      capturedAtUtc: '2026-09-23T14:00:01.000Z', independentFromControlObservation: true,
      authenticatedWritePathAttempted: true, denialCause: 'data-api-disabled', requestDenied: true, writeCommitted: false,
      requestMethod: 'POST', relation: 'employees', contentProfile: 'public', requestContentType: 'application/json',
      requestBody: '[]', httpStatus: 406, providerErrorCode: 'PGRST106',
    }),
    network: bound('production-network-isolation-observation', {
      restrictionStatus: 'applied', runnerIpv4Only: true, runnerIpv6Only: true,
      unrestrictedIpv4: false, unrestrictedIpv6: false, nonRunnerIpv4ProbeDenied: true, nonRunnerIpv6ProbeDenied: true,
    }),
    database: bound('production-database-isolation-observation', {
      databaseRoleGraphSha256, trustedBackendProfileSha256, unknownLoginRoleCount: 0,
      unknownClientBackendCount: 0, unknownBackendCount: 0, unmanagedWritePathCount: 0,
    }),
    drain: bound('production-database-drain-observation', {
      capturedAtUtc: '2026-09-23T14:00:02.000Z', observedAfterControlObservations: true,
      allApplicableSessionsObserved: true, applicableApplicationSessionCount: 0, inflightWriteCount: 0,
      preparedApplicationWriteCount: 0, existingApplicationSessionCount: 0,
      postBarrierWriteAttemptCount: 1, postBarrierWriteSuccessCount: 0,
      replicationSlotInventoryComplete: true, activeReplicationSlotCount: 0,
      subscriptionInventoryComplete: true, enabledSubscriptionCount: 0,
    }),
  };
  return { isolationContext, isolationReceipts };
}

/**
 * Test-only protected-cutover fixture. Unlike the legacy complete-isolation
 * fixture above, this includes the known CLI/cron/net writer profile that a
 * protected forward must classify and order after cleanup.
 */
export function createValidManagedIsolationEvidenceFixture() {
  const fixture = createValidIsolationEvidenceFixture();
  const managedWriterObservation = {
    schemaVersion: 1,
    kind: 'production-managed-writer-observation',
    environment: 'production',
    phase: 'pre_forward',
    sourceSha,
    sourceTree,
    sourceManifestSha256,
    targetBindingSha256,
    collectionStartedAtUtc: '2026-09-23T13:59:59.000Z',
    capturedAtUtc,
    cli: {
      presentCount: 1,
      attributes: { ...PRODUCTION_PRE_FORWARD_CLI_PROFILE },
      memberships: { ...PRODUCTION_PRE_FORWARD_CLI_MEMBERSHIP },
      database: { connect: true, create: false, temporary: true },
      schemas: { schemaCount: 9, usageCount: 1, createCount: 0, ownedSchemaCount: 0 },
      objects: { ...PRODUCTION_PRE_FORWARD_CLI_OBJECTS }, routineSnapshot:structuredClone(PRODUCTION_PRE_FORWARD_CLI_ROUTINE_SNAPSHOT),
      activeSessionCount: 0,
      completeNonSecretRoleGraphSha256: databaseRoleGraphSha256,
    },
    workers: {
      cronLauncherCount: 1,
      netWorkerCount: 1,
      otherCandidateBackendCount: 0,
      cronPreloaded: true,
      netPreloaded: true,
      cronDatabaseMatchesConnected: true,
      netDatabaseMatchesConnected: true,
      cronLaunchActiveJobs: true,
      pgCronExtensionCount: 0,
      pgNetExtensionCount: 0,
      cronJobTablePresent: false,
      netRequestQueueTablePresent: false,
      netResponseTablePresent: false,
    },
    rawUnknownLoginRoleCount: 1,
    rawUnknownBackendCount: 2,
    otherUnknownLoginRoleCount: 0,
    otherUnknownBackendCount: 0,
    correlation: {
      cliLoginProfileMd5: 'f'.repeat(32),
      rawUnknownLoginProfileMd5: 'f'.repeat(32),
      managedBackendProfileMd5: 'a'.repeat(32),
      rawUnknownBackendProfileMd5: 'a'.repeat(32),
    },
  };
  const profileSha256 = productionManagedWriterProfileSha256(managedWriterObservation);
  Object.assign(fixture.isolationContext, { trustedBackendProfileSha256: profileSha256 });
  Object.assign(fixture.isolationReceipts.database, {
    trustedBackendProfileSha256: profileSha256,
    unknownLoginRoleCount: 1,
    unknownBackendCount: 2,
    managedWriterObservation,
  });
  return fixture;
}

/** Rebinds every signed-context field, including the nested managed receipt. */
export function rebindManagedIsolationEvidenceFixture(fixture, binding) {
  const { isolationContext, isolationReceipts } = fixture;
  Object.assign(isolationContext, binding);
  for (const receipt of Object.values(isolationReceipts)) {
    Object.assign(receipt, {
      sourceSha: binding.sourceSha,
      targetBindingSha256: binding.targetBindingSha256,
    });
  }
  Object.assign(isolationReceipts.database.managedWriterObservation, binding);
  return fixture;
}

export const ISOLATION_EVIDENCE_FIXTURE_BINDING = Object.freeze({
  sourceSha, sourceTree, sourceManifestSha256, targetBindingSha256,
});
