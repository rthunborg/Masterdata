import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EventEmitter } from 'node:events';

import {
  bindProductionDatabaseDrainObservation,
  bindProductionPostCleanupDatabaseObservation,
  bindProductionRealtimePriorState,
  bindProductionRealtimeShutdownQuiescenceObservation,
  classifyProductionSessionPoolerProbeResult,
  bindProductionSameComputerNetworkObservation,
  createProductionRealtimeProbeSession,
  collectProductionDataApiDenialProbe,
  collectProductionDataApiWriteProbePrerequisite,
  parseProductionStatementTriggerInventory,
  parseProductionDatabaseDrainSummary,
  PRODUCTION_DATA_API_DENIAL_PATH,
  PRODUCTION_DATA_API_ZERO_ROW_READ_PATH,
  PRODUCTION_ISOLATION_PROBE_TIMEOUT_MS,
  PRODUCTION_REALTIME_WEBSOCKET_PATH,
  probeProductionRealtimeDisabledHandshake,
  validateProductionIsolationProbeContext,
} from '../../../../src/lib/release/production-isolation-probes.mjs';
import {
  PRODUCTION_PRE_FORWARD_CLI_MEMBERSHIP,
  PRODUCTION_PRE_FORWARD_CLI_OBJECTS, PRODUCTION_PRE_FORWARD_CLI_ROUTINE_SNAPSHOT,
  PRODUCTION_PRE_FORWARD_CLI_PROFILE,
  productionManagedWriterProfileSha256,
} from '../../../../src/lib/release/production-managed-writer-profiles.mjs';
import { assessProductionMaintenanceIsolation } from '../../../../src/lib/release/production-isolation-gate.mjs';
import { createValidIsolationEvidenceFixture } from '../../../support/production-isolation-evidence-fixture.mjs';

const context = () => ({
  sourceSha: 'a'.repeat(40), targetBindingSha256: 'b'.repeat(64), isolationPlanSha256: 'c'.repeat(64),
  databaseRoleGraphSha256: 'd'.repeat(64), trustedBackendProfileSha256: 'e'.repeat(64),
  priorRealtimeServiceEnabled: true, priorRealtimeConfigSha256: 'f'.repeat(64),
});
const now = new Date('2026-10-02T10:00:00.000Z');
const inventory = { relationExists: true, statementTriggerInventoryComplete: true, enabledStatementTriggerCount: 0 };

function managedObservation() {
  const value = {
    schemaVersion: 1, kind: 'production-managed-writer-observation', environment: 'production', phase: 'pre_forward',
    sourceSha: 'a'.repeat(40), sourceTree: '1'.repeat(40), sourceManifestSha256: '2'.repeat(64),
    targetBindingSha256: 'b'.repeat(64), collectionStartedAtUtc: '2026-10-02T09:59:00.000Z', capturedAtUtc: '2026-10-02T09:59:01.000Z',
    cli: { presentCount: 1, attributes: { ...PRODUCTION_PRE_FORWARD_CLI_PROFILE }, memberships: { ...PRODUCTION_PRE_FORWARD_CLI_MEMBERSHIP },
      database: { connect: true, create: false, temporary: true }, schemas: { schemaCount: 9, usageCount: 1, createCount: 0, ownedSchemaCount: 0 },
      objects: { ...PRODUCTION_PRE_FORWARD_CLI_OBJECTS }, routineSnapshot:structuredClone(PRODUCTION_PRE_FORWARD_CLI_ROUTINE_SNAPSHOT), activeSessionCount: 0, completeNonSecretRoleGraphSha256: 'd'.repeat(64) },
    workers: { cronLauncherCount: 1, netWorkerCount: 1, otherCandidateBackendCount: 0, cronPreloaded: true, netPreloaded: true,
      cronDatabaseMatchesConnected: true, netDatabaseMatchesConnected: true, cronLaunchActiveJobs: true, pgCronExtensionCount: 0,
      pgNetExtensionCount: 0, cronJobTablePresent: false, netRequestQueueTablePresent: false, netResponseTablePresent: false },
    rawUnknownLoginRoleCount: 1, rawUnknownBackendCount: 2, otherUnknownLoginRoleCount: 0, otherUnknownBackendCount: 0,
    correlation: { cliLoginProfileMd5: '3'.repeat(32), rawUnknownLoginProfileMd5: '3'.repeat(32),
      managedBackendProfileMd5: '4'.repeat(32), rawUnknownBackendProfileMd5: '4'.repeat(32) },
  };
  return value;
}

describe('Story 22.15 production isolation probe adapters', () => {
  it('uses only the reviewed bounded fixed Data API requests and redacts success material', async () => {
    const calls: Array<[URL, RequestInit]> = [];
    const fetchImpl = vi.fn(async (url: URL, init: RequestInit) => {
      calls.push([url, init]);
      return init.method === 'POST'
        ? new Response(JSON.stringify({ code: 'PGRST106', details: 'private' }), { status: 406 })
        : new Response('[]', { status: 200 });
    });
    const prerequisite = await collectProductionDataApiWriteProbePrerequisite({
      context: context(), apiBaseUrl: 'https://example.test/', serviceRoleKey: 'synthetic-key-value', fetchImpl, statementTriggerInventory: inventory,
      clock: () => new Date('2026-10-02T09:59:00.000Z'),
    });
    const denial = await collectProductionDataApiDenialProbe({
      context: context(), apiBaseUrl: 'https://example.test/', serviceRoleKey: 'synthetic-key-value', fetchImpl, prerequisite,
      dataApiControl: { schemaVersion: 1, kind: 'production-data-api-disable-management-observation',
        sourceSha: 'a'.repeat(40), targetBindingSha256: 'b'.repeat(64), isolationPlanSha256: 'c'.repeat(64),
        capturedAtUtc: '2026-10-02T09:59:30.000Z', managementApiControlObserved: true, dbSchema: '',
        otherPostgrestSettingsPreserved: true, dataApiDisabled: true }, clock: () => now,
    });
    expect(calls.map(([url]) => `${url.pathname}${url.search}`)).toEqual([PRODUCTION_DATA_API_ZERO_ROW_READ_PATH, PRODUCTION_DATA_API_DENIAL_PATH]);
    expect(calls[1][1]).toMatchObject({ method: 'POST', body: '[]', headers: { 'Content-Profile': 'public', 'Content-Type': 'application/json' } });
    expect(PRODUCTION_ISOLATION_PROBE_TIMEOUT_MS).toBe(20_000);
    expect(prerequisite).toMatchObject({ kind: 'production-data-api-write-probe-prerequisite', ...inventory });
    expect(denial).toMatchObject({ kind: 'production-data-api-denial-probe', requestDenied: true, writeCommitted: false, providerErrorCode: 'PGRST106' });
    expect(JSON.stringify(denial)).not.toContain('private');
  });

  it('rejects generic errors, nonzero trigger inventory, unbound contexts, and arbitrary bases', async () => {
    await expect(collectProductionDataApiDenialProbe({ context: context(), apiBaseUrl: 'http://example.test/', serviceRoleKey: 'synthetic-key-value' })).rejects.toThrow('production_isolation_probe_refused');
    await expect(collectProductionDataApiWriteProbePrerequisite({ context: context(), apiBaseUrl: 'https://example.test/', serviceRoleKey: 'synthetic-key-value', now,
      statementTriggerInventory: { ...inventory, enabledStatementTriggerCount: 1 }, fetchImpl: async () => new Response('[]') })).rejects.toThrow('production_isolation_probe_refused');
    await expect(collectProductionDataApiWriteProbePrerequisite({ context: context(), apiBaseUrl: 'https://example.test/', serviceRoleKey: 'synthetic-key-value',
      statementTriggerInventory: inventory, fetchImpl: async () => new Response('[{}]') })).rejects.toThrow('production_isolation_probe_refused');
    expect(() => validateProductionIsolationProbeContext({ ...context(), sourceSha: 'bad' })).toThrow('production_isolation_probe_refused');
  });

  it('does not infer prior Realtime configuration from an incomplete or different receipt', () => {
    const expected = context();
    const realtime = { suspend: false, privateOnly: false, unknownKeyCount: 0 };
    expected.priorRealtimeConfigSha256 = '0'.repeat(64);
    expect(() => bindProductionRealtimePriorState({ context: expected, capturedAtUtc: now.toISOString(),
      platformConfig: { collectionSucceeded: true, targetBindingSha256: expected.targetBindingSha256, configurations: { realtime } } })).toThrow('production_isolation_probe_refused');
  });

  it('keeps post-cleanup database and drain intervals separate and rejects unknown writer counts', () => {
    const observation = managedObservation();
    const expected = {...context(),sourceTree:observation.sourceTree,sourceManifestSha256:observation.sourceManifestSha256};
    expected.trustedBackendProfileSha256 = productionManagedWriterProfileSha256(observation);
    const database = bindProductionPostCleanupDatabaseObservation({ context: expected, managedWriterObservation: observation,
      unknownClientBackendCount: 0, unmanagedWritePathCount: 0, collectionStartedAtUtc: '2026-10-02T09:59:02.000Z', capturedAtUtc: '2026-10-02T09:59:03.000Z' });
    const drain = bindProductionDatabaseDrainObservation({ context: expected, collectionStartedAtUtc: '2026-10-02T09:59:04.000Z', capturedAtUtc: '2026-10-02T09:59:05.000Z', drain: {
      observedAfterControlObservations: true, allApplicableSessionsObserved: true, applicableApplicationSessionCount: 0, inflightWriteCount: 0,
      preparedApplicationWriteCount: 0, existingApplicationSessionCount: 0, postBarrierWriteAttemptCount: 1, postBarrierWriteSuccessCount: 0,
      replicationSlotInventoryComplete: true, activeReplicationSlotCount: 0, subscriptionInventoryComplete: true, enabledSubscriptionCount: 0,
    } });
    expect(database.collectionStartedAtUtc).not.toBe(drain.collectionStartedAtUtc);
    expect(() => bindProductionPostCleanupDatabaseObservation({ context: expected, managedWriterObservation: observation,
      unknownClientBackendCount: 1, unmanagedWritePathCount: 0, collectionStartedAtUtc: '2026-10-02T09:59:02.000Z', capturedAtUtc: '2026-10-02T09:59:03.000Z' })).toThrow('production_isolation_probe_refused');
  });

  it('refuses a routine substitution even when a caller recomputes the matching profile hash',()=>{
    const observation=managedObservation();observation.cli.routineSnapshot.allRoutineOwnerSetSha256='0'.repeat(64);
    const expected={...context(),sourceTree:observation.sourceTree,sourceManifestSha256:observation.sourceManifestSha256,trustedBackendProfileSha256:productionManagedWriterProfileSha256(observation)};
    expect(()=>bindProductionPostCleanupDatabaseObservation({context:expected,managedWriterObservation:observation,unknownClientBackendCount:0,unmanagedWritePathCount:0,collectionStartedAtUtc:'2026-10-02T09:59:02.000Z',capturedAtUtc:'2026-10-02T09:59:03.000Z'})).toThrow('production_isolation_probe_refused');
  });
  it('requires independent source-tree and manifest bindings for a managed snapshot',()=>{
    const observation=managedObservation();const expected={...context(),trustedBackendProfileSha256:productionManagedWriterProfileSha256(observation)};
    expect(()=>bindProductionPostCleanupDatabaseObservation({context:expected,managedWriterObservation:observation,unknownClientBackendCount:0,unmanagedWritePathCount:0,collectionStartedAtUtc:'2026-10-02T09:59:02.000Z',capturedAtUtc:'2026-10-02T09:59:03.000Z'})).toThrow('production_isolation_probe_refused');
  });
  it('parses only a single fixed aggregate trigger-inventory result', () => {
    expect(parseProductionStatementTriggerInventory(`${JSON.stringify(inventory)}\n`)).toEqual(inventory);
    expect(() => parseProductionStatementTriggerInventory('{}\n{}\n')).toThrow('production_isolation_probe_refused');
  });

  it('rejects incomplete drain inventory rather than converting it to zero', () => {
    const complete = { allApplicableSessionsObserved: true, applicableApplicationSessionCount: 0,
      inflightWriteCount: 0, preparedApplicationWriteCount: 0, existingApplicationSessionCount: 0,
      replicationSlotInventoryComplete: true, activeReplicationSlotCount: 0,
      subscriptionInventoryComplete: true, enabledSubscriptionCount: 0 };
    expect(parseProductionDatabaseDrainSummary(`${JSON.stringify(complete)}\n`)).toEqual(complete);
    expect(() => parseProductionDatabaseDrainSummary(`${JSON.stringify({ ...complete, subscriptionInventoryComplete: false })}\n`)).toThrow('production_isolation_probe_refused');
  });

  it('keeps the trigger inventory in a single fixed read-only transaction', async () => {
    const { assertDatabaseWriterClassificationSql } = await import(
      '../../../../src/lib/release/production-database-writer-classification.mjs'
    );
    const sql = readFileSync(resolve(process.cwd(), 'src/lib/release/production-isolation-statement-trigger-inventory.sql'), 'utf8');
    expect(assertDatabaseWriterClassificationSql(sql)).toBe(true);
    expect(sql).toContain("to_regclass('public.employees')");
    expect(sql).not.toMatch(/\b(?:insert|update|delete|alter|create|drop|grant|revoke|truncate)\b/iu);
    const drainSql = readFileSync(resolve(process.cwd(), 'src/lib/release/production-isolation-database-drain.sql'), 'utf8');
    expect(assertDatabaseWriterClassificationSql(drainSql)).toBe(true);
    expect(drainSql).toContain('pg_prepared_xacts');
  });

  it('requires a classified exclusion denial between two successful pooler read-only probes', () => {
    const probe = (capturedAtUtc: string, outcome: string, freshReadOnlyTransactionConfirmed: boolean) => ({
      schemaVersion: 1, kind: 'production-session-pooler-readonly-probe', sourceSha: 'a'.repeat(40),
      targetBindingSha256: 'b'.repeat(64), isolationPlanSha256: 'c'.repeat(64), capturedAtUtc,
      outcome, freshReadOnlyTransactionConfirmed,
    });
    const control = { capturedAtUtc: '2026-10-02T10:00:05.000Z', restrictionStatus: 'applied', operatorIpv4AllowlistCount: 1,
      operatorIpv4AllowlistMatches: true, ipv6AllowlistCount: 0, operatorIpv6EgressUnavailable: true,
      ipv6Verification: 'applied-policy-only-no-live-probe', operatorEgressStable: true, managementApiRollbackVerified: true,
      excludedOperatorConfigApplied: true, excludedIpv4AllowlistCount: 1, excludedIpv4AllowlistMatchesReviewedRule: true,
      excludedIpv6AllowlistCount: 0, credentialAndTlsInputsUnchanged: true, excludedConfigSha256: '1'.repeat(64),
      finalConfigSha256: '2'.repeat(64), excludedConfigObservedAtUtc: '2026-10-02T10:00:01.000Z',
      finalConfigObservedAtUtc: '2026-10-02T10:00:03.000Z' };
    expect(bindProductionSameComputerNetworkObservation({ context: context(), networkControl: control,
      priorPoolerProbe: probe('2026-10-02T10:00:00.000Z', 'succeeded', true),
      excludedPoolerProbe: probe('2026-10-02T10:00:02.000Z', 'denied_network_restriction', false),
      restoredPoolerProbe: probe('2026-10-02T10:00:04.000Z', 'succeeded', true),
    })).toMatchObject({ denialCause: 'network-restriction', freshReadOnlyTransactionConfirmed: true });
    expect(() => bindProductionSameComputerNetworkObservation({ context: context(), networkControl: control,
      priorPoolerProbe: probe('2026-10-02T10:00:00.000Z', 'succeeded', true),
      excludedPoolerProbe: probe('2026-10-02T10:00:02.000Z', 'denied_unclassified', false),
      restoredPoolerProbe: probe('2026-10-02T10:00:04.000Z', 'succeeded', true),
    })).toThrow('production_isolation_probe_refused');
  });

  it('classifies only a completed native psql HBA refusal as a network denial', () => {
    expect(classifyProductionSessionPoolerProbeResult({ status: 2, signal: null, error: null,
      stderr: 'psql: error: connection to server: no pg_hba.conf entry for host' })).toBe('denied_network_restriction');
    for (const result of [
      { status: 0, signal: null, error: null, stderr: 'no pg_hba.conf entry' },
      { status: null, signal: null, error: null, stderr: 'no pg_hba.conf entry' },
      { status: -1, signal: null, error: null, stderr: 'no pg_hba.conf entry' },
      { status: 999, signal: null, error: null, stderr: 'no pg_hba.conf entry' },
      { status: 2, signal: undefined, error: null, stderr: 'no pg_hba.conf entry' },
      { status: 2, signal: 'SIGTERM', error: null, stderr: 'no pg_hba.conf entry' },
      { status: 2, signal: null, error: new Error('spawn'), stderr: 'no pg_hba.conf entry' },
      { status: 2, signal: null, error: null, stderr: 'no pg_hba.conf entry; SSL certificate verify failed' },
      { status: 2, signal: null, error: null, stderr: 'password authentication failed' },
      { status: 2, signal: null, error: null, stderr: 'connection timed out' },
      { status: 2, signal: null, error: null, stderr: 'no pg_hba.conf entry; could not resolve host' },
    ]) expect(classifyProductionSessionPoolerProbeResult(result)).toBe('denied_unclassified');
  });

  it.each(['', '\n', '\r\n'])('accepts the standard SSL-qualified HBA refusal with %j ending', ending => {
    const stderr = 'psql: error: connection to server failed: FATAL: no pg_hba.conf entry for host "synthetic-host", user "synthetic-user", database "postgres", SSL encryption' + ending;
    expect(classifyProductionSessionPoolerProbeResult({ status: 2, signal: null, error: null, stderr }))
      .toBe('denied_network_restriction');
  });

  it.each([
    '\nSSL certificate verification failed', '\nTLS handshake failed', '\nSSL SYSCALL error: EOF detected',
    '\npassword authentication failed', '\ncould not resolve host', '\nconnection timed out',
    '; SSL certificate verify failed', '; TLS handshake failed', '\nSSL encryption',
  ])('retains refusal for a mixed HBA/TLS or unrelated diagnostic %j', diagnostic => {
    const stderr = 'FATAL: no pg_hba.conf entry for host "synthetic-host", user "synthetic-user", database "postgres", SSL encryption' + diagnostic;
    expect(classifyProductionSessionPoolerProbeResult({ status: 2, signal: null, error: null, stderr }))
      .toBe('denied_unclassified');
  });

  it('keeps a real Realtime session admission separate from reconnect rejection', async () => {
    let serviceClose: (() => void) | undefined;
    const removeChannel = vi.fn(async () => undefined);
    let clients = 0;
    const clientFactory = vi.fn(() => {
      clients += 1;
      let onOpen: (() => void) | undefined;
      return { channel: () => ({ subscribe: (callback: (status: string) => void) => {
        if (clients === 1) { onOpen?.(); callback('SUBSCRIBED'); } else callback('CHANNEL_ERROR');
      }, unsubscribe: async () => undefined }), removeChannel, realtime: { onOpen: (callback: () => void) => { onOpen = callback; }, onClose: (callback: () => void) => { if (clients === 1) serviceClose = callback; } } };
    });
    const clockValues = ['2026-10-02T09:59:58.000Z', '2026-10-02T09:59:59.000Z', '2026-10-02T10:00:00.000Z', '2026-10-02T10:00:00.000Z'];
    const session = createProductionRealtimeProbeSession({ context: context(), projectUrl: 'https://example.test/',
      anonKey: 'synthetic-key-value', clientFactory, clock: () => new Date(clockValues.shift() ?? now.toISOString()) });
    await expect(session.establishBeforeControl()).resolves.toMatchObject({ existingConnectionEstablishedAtUtc: '2026-10-02T09:59:58.000Z', existingSubscriptionAcknowledgedAtUtc: '2026-10-02T09:59:59.000Z' });
    const closing = session.waitForServiceDisconnect({ controlStartedAtUtc: '2026-10-02T09:59:59.000Z' });
    serviceClose?.();
    await expect(closing).resolves.toMatchObject({ existingConnectionDisconnectedByService: true, existingConnectionClosedByCaller: false });
    await expect(session.verifyReconnectRejected()).resolves.toMatchObject({ reconnectRejectedByClient: true });
    await session.close();
    expect(clientFactory).toHaveBeenCalledTimes(2);
    expect(removeChannel).toHaveBeenCalledTimes(2);
  });

  it('uses a fixed WebSocket upgrade denial and binds the documented shutdown branch without metrics fields', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const requestImpl = vi.fn((options: unknown, callback: (response: EventEmitter & { statusCode?: number }) => void) => {
      calls.push(options as Record<string, unknown>);
      const request = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void };
      request.end = () => {
        const response = new EventEmitter() as EventEmitter & { statusCode?: number };
        response.statusCode = 403;
        callback(response);
        response.emit('data', Buffer.from(JSON.stringify({ code: 'RealtimeDisabledForTenant', detail: 'not retained' })));
        response.emit('end');
      };
      request.destroy = () => undefined;
      return request;
    });
    const handshake = await probeProductionRealtimeDisabledHandshake({ context: context(), projectUrl: 'https://example.test/',
      anonKey: 'synthetic-key-value', requestImpl, clock: (() => { const values = ['2026-10-02T10:00:00.560Z', '2026-10-02T10:00:00.600Z']; return () => new Date(values.shift() ?? '2026-10-02T10:00:00.600Z'); })() });
    expect(calls[0]).toMatchObject({ protocol: 'https:', hostname: 'example.test', method: 'GET',
      path: `${PRODUCTION_REALTIME_WEBSOCKET_PATH}&apikey=synthetic-key-value`, headers: { Connection: 'Upgrade', Upgrade: 'websocket' } });
    expect(JSON.stringify(handshake)).not.toContain('not retained');
    const receipt = bindProductionRealtimeShutdownQuiescenceObservation({
      context: context(),
      priorState: { schemaVersion: 1, kind: 'production-realtime-prior-state-observation', sourceSha: 'a'.repeat(40),
        targetBindingSha256: 'b'.repeat(64), isolationPlanSha256: 'c'.repeat(64), capturedAtUtc: '2026-10-02T10:00:00.000Z',
        serviceEnabled: true, configSha256: 'f'.repeat(64) },
      platformReadback: { schemaVersion: 1, kind: 'production-platform-isolation-observation', sourceSha: 'a'.repeat(40),
        targetBindingSha256: 'b'.repeat(64), isolationPlanSha256: 'c'.repeat(64), capturedAtUtc: '2026-10-02T10:00:00.300Z',
        authHookEnabled: {}, unknownAuthHookCount: 0, realtimeSuspended: true },
      shutdownControl: { schemaVersion: 1, kind: 'production-realtime-shutdown-control-observation', sourceSha: 'a'.repeat(40),
        targetBindingSha256: 'b'.repeat(64), isolationPlanSha256: 'c'.repeat(64), configDisableRequestedAtUtc: '2026-10-02T10:00:00.100Z',
        configDisableResponseAtUtc: '2026-10-02T10:00:00.200Z', configDisableHttpStatus: 204, configDisabledReadbackAtUtc: '2026-10-02T10:00:00.250Z',
        configDisabledReadbackServiceEnabled: false, configDisabledReadbackSha256: '9'.repeat(64), shutdownRequestedAtUtc: '2026-10-02T10:00:00.400Z',
        shutdownResponseAtUtc: '2026-10-02T10:00:00.500Z', shutdownHttpStatus: 204 },
      existingConnection: { sourceSha: 'a'.repeat(40), targetBindingSha256: 'b'.repeat(64), isolationPlanSha256: 'c'.repeat(64),
        existingConnectionEstablishedAtUtc: '2026-10-02T10:00:00.020Z', existingSubscriptionAcknowledgedAtUtc: '2026-10-02T10:00:00.050Z',
        existingConnectionDisconnectedAtUtc: '2026-10-02T10:00:00.550Z', existingConnectionDisconnectedByService: true, existingConnectionClosedByCaller: false },
      reconnectHandshake: handshake, capturedAtUtc: '2026-10-02T10:00:00.700Z',
    });
    expect(receipt).toMatchObject({ kind: 'production-realtime-shutdown-quiescence-observation', shutdownHttpStatus: 204,
      providerErrorCode: 'RealtimeDisabledForTenant', existingConnectionDisconnectedByService: true });
    expect(receipt).not.toHaveProperty('completeClientReportRequired');
    expect(receipt).not.toHaveProperty('connectedClientCount');
  });

  it('refuses a non-403 handshake and shutdown evidence with a caller-closed or misordered connection', async () => {
    const requestImpl = (_options: unknown, callback: (response: EventEmitter & { statusCode?: number }) => void) => {
      const request = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void };
      request.end = () => { const response = new EventEmitter() as EventEmitter & { statusCode?: number }; response.statusCode = 200; callback(response); response.emit('data', Buffer.from('{}')); response.emit('end'); };
      request.destroy = () => undefined;
      return request;
    };
    await expect(probeProductionRealtimeDisabledHandshake({ context: context(), projectUrl: 'https://example.test/', anonKey: 'synthetic-key-value', requestImpl })).rejects.toThrow('production_isolation_probe_refused');
    expect(() => bindProductionRealtimeShutdownQuiescenceObservation({ context: context(), priorState: {}, platformReadback: {}, shutdownControl: {}, existingConnection: {}, reconnectHandshake: {}, capturedAtUtc: now.toISOString() })).toThrow('production_isolation_probe_refused');
  });

  it('emits a shutdown receipt the strict gate accepts only with distinct attempt and denial times', () => {
    const fixture = createValidIsolationEvidenceFixture();
    const { isolationContext: gateContext, isolationReceipts } = fixture;
    const handshake = { schemaVersion: 1, kind: 'production-realtime-disabled-handshake-observation', sourceSha: gateContext.sourceSha,
      targetBindingSha256: gateContext.targetBindingSha256, isolationPlanSha256: gateContext.isolationPlanSha256,
      capturedAtUtc: '2026-09-23T14:00:00.600Z', connectionAttemptedAtUtc: '2026-09-23T14:00:00.500Z',
      connectionDeniedAtUtc: '2026-09-23T14:00:00.600Z', connectionAttempted: true, connectionDenied: true,
      writeObserved: false, httpStatus: 403, providerErrorCode: 'RealtimeDisabledForTenant', denialCause: 'realtime-disabled-for-tenant' };
    const receipt = bindProductionRealtimeShutdownQuiescenceObservation({ context: gateContext, priorState: isolationReceipts.realtimePriorState,
      platformReadback: isolationReceipts.platform, shutdownControl: { schemaVersion: 1, kind: 'production-realtime-shutdown-control-observation',
        sourceSha: gateContext.sourceSha, targetBindingSha256: gateContext.targetBindingSha256, isolationPlanSha256: gateContext.isolationPlanSha256,
        configDisableRequestedAtUtc: '2026-09-23T13:59:59.000Z', configDisableResponseAtUtc: '2026-09-23T13:59:59.100Z', configDisableHttpStatus: 204,
        configDisabledReadbackAtUtc: '2026-09-23T13:59:59.200Z', configDisabledReadbackServiceEnabled: false, configDisabledReadbackSha256: '9'.repeat(64),
        shutdownRequestedAtUtc: '2026-09-23T14:00:00.100Z', shutdownResponseAtUtc: '2026-09-23T14:00:00.200Z', shutdownHttpStatus: 204 },
      existingConnection: { sourceSha: gateContext.sourceSha, targetBindingSha256: gateContext.targetBindingSha256, isolationPlanSha256: gateContext.isolationPlanSha256,
        existingConnectionEstablishedAtUtc: '2026-09-23T13:59:58.000Z', existingSubscriptionAcknowledgedAtUtc: '2026-09-23T13:59:58.200Z',
        existingConnectionDisconnectedAtUtc: '2026-09-23T13:59:59.500Z', existingConnectionDisconnectedByService: true, existingConnectionClosedByCaller: false },
      reconnectHandshake: handshake, capturedAtUtc: '2026-09-23T14:00:00.700Z' });
    isolationReceipts.realtimeProbe = receipt;
    expect(assessProductionMaintenanceIsolation(isolationReceipts, { expectedContext: gateContext, now: new Date('2026-09-23T14:10:00.000Z') }).disposition).toBe('isolation_proved_not_execution_authority');
    expect(() => bindProductionRealtimeShutdownQuiescenceObservation({ context: gateContext, priorState: isolationReceipts.realtimePriorState,
      platformReadback: isolationReceipts.platform, shutdownControl: { ...receipt, kind: 'production-realtime-shutdown-control-observation' },
      existingConnection: { sourceSha: gateContext.sourceSha, targetBindingSha256: gateContext.targetBindingSha256, isolationPlanSha256: gateContext.isolationPlanSha256,
        existingConnectionEstablishedAtUtc: '2026-09-23T13:59:58.000Z', existingSubscriptionAcknowledgedAtUtc: '2026-09-23T13:59:58.200Z', existingConnectionDisconnectedAtUtc: '2026-09-23T13:59:59.500Z', existingConnectionDisconnectedByService: true, existingConnectionClosedByCaller: false },
      reconnectHandshake: { ...handshake, connectionAttemptedAtUtc: handshake.capturedAtUtc }, capturedAtUtc: '2026-09-23T14:00:00.700Z' })).toThrow('production_isolation_probe_refused');
  });
});
