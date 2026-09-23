import { describe, expect, it } from 'vitest';

import {
  assessProductionMaintenanceIsolation,
  PRODUCTION_ISOLATION_AUTH_HOOKS,
} from '../../../../src/lib/release/production-isolation-gate.mjs';

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
    realtimeProbe: bound('production-realtime-denial-probe', {
      capturedAtUtc: '2026-09-23T14:00:01.000Z',
      independentFromControlObservation: true,
      connectionAttempted: true,
      connectionDenied: true,
      writeObserved: false,
    }),
    dataApi: bound('production-data-api-disable-observation', {
      dashboardControlObserved: true,
      dataApiDisabled: true,
    }),
    dataApiProbe: bound('production-data-api-denial-probe', {
      capturedAtUtc: '2026-09-23T14:00:01.000Z',
      independentFromControlObservation: true,
      authenticatedWritePathAttempted: true,
      requestDenied: true,
      writeCommitted: false,
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
    }),
  };
}

const assess = (value = receipts(), options = { expectedContext: context(), now }) =>
  assessProductionMaintenanceIsolation(value, options);

describe('Story 22.15 production maintenance isolation gate', () => {
  it('accepts only complete independently observed controls and remains non-authorizing', () => {
    expect(assess()).toEqual({
      schemaVersion: 1,
      kind: 'production-maintenance-isolation-assessment',
      disposition: 'isolation_proved_not_execution_authority',
      reason: 'fresh_bound_independent_controls_and_drain_proven',
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
