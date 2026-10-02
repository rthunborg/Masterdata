import { describe, expect, it, vi } from 'vitest';
import { runFixedProductionIsolationLive } from '../../../../src/lib/release/run-production-isolation-live.mjs';
import { runProductionTemporaryIsolationControls } from '../../../../src/lib/release/production-isolation-controls.mjs';
import { collectProductionIsolationStatementTriggers, collectProductionIsolationDatabaseDrain } from '../../../../src/lib/release/collect-production-isolation-database.mjs';

const sourceSha = 'a'.repeat(40), targetBindingSha256 = 'b'.repeat(64), isolationPlanSha256 = 'c'.repeat(64);
const context = { sourceSha, sourceTree: 'd'.repeat(40), sourceManifestSha256: 'e'.repeat(64),
  targetBindingSha256, isolationPlanSha256, databaseRoleGraphSha256: 'f'.repeat(64),
  trustedBackendProfileSha256: '1'.repeat(64), priorRealtimeServiceEnabled: true, priorRealtimeConfigSha256: '2'.repeat(64) };
function fixture(polls: string[] = []) {
  const order: string[] = []; let pooler = 0; let ingress: unknown = null;
  const request = { workspace: process.cwd(), environment: { EXPECTED_SUPABASE_ENVIRONMENT: 'production',
    EXPECTED_SUPABASE_PROJECT_REF: 'p'.repeat(20), SYNTHETIC_ENV_RESTORE_TEST: 'temporary' },
    runtime: { probeContext: context, managementApiToken: 'synthetic-management',
      anonymousKey: 'synthetic-anonymous', serviceRoleKey: 'synthetic-service', sourceOptions: {},
      psqlTool: { psqlExecutable: 'synthetic-psql', expectedPsqlSha256: '3'.repeat(64), expectedPsqlVersion: 'psql (PostgreSQL) 17.6' },
      controlAdmission: { schemaVersion: 1, kind: 'production-temporary-isolation-admission', sourceSha,
        targetBindingSha256, isolationPlanSha256, operatorIpv4Cidr: '203.0.113.1/32',
        exclusionIpv4Cidr: '203.0.113.2/32', operatorIpv6EgressUnavailable: true } } };
  const bind = (kind: string, values = {}) => ({ schemaVersion: 1, kind, sourceSha, targetBindingSha256,
    isolationPlanSha256, capturedAtUtc: new Date().toISOString(), ...values });
  const session = { establishBeforeControl: vi.fn(async () => { order.push('existing-subscribed'); return { existingConnectionEstablishedAtUtc: new Date().toISOString() }; }),
    waitForServiceDisconnect: vi.fn(async () => { order.push('service-close'); return { existingConnectionDisconnectedByService: true }; }),
    close: vi.fn(async () => { order.push('caller-cleanup-after-proof'); }) };
  const platform = { redactProductionPlatformConfig: vi.fn(() => ({ suspend: false, privateOnly: false, unknownKeyCount: 0 })) };
  const probes = {
    validateProductionIsolationProbeContext: vi.fn((value: unknown) => value),
    probeProductionSessionPoolerReadOnly: vi.fn(async () => { pooler++; order.push('pooler-' + pooler);
      return bind('production-session-pooler-readonly-probe',
        { outcome: pooler === 2 ? 'denied_network_restriction' : 'succeeded', freshReadOnlyTransactionConfirmed: pooler !== 2 }); }),
    bindProductionRealtimePriorState: vi.fn(() => bind('production-realtime-prior-state-observation')),
    createProductionRealtimeProbeSession: vi.fn(() => session),
    collectProductionDataApiWriteProbePrerequisite: vi.fn(async () => { order.push('zero-row-read'); return bind('production-data-api-write-probe-prerequisite',
      { authenticatedReadAdmissionPassed: true, relationExists: true, statementTriggerInventoryComplete: true, enabledStatementTriggerCount: 0 }); }),
    collectProductionPlatformIsolationReadback: vi.fn(async () => { order.push('independent-platform-read'); return bind('production-platform-isolation-observation'); }),
    collectProductionDataApiDenialProbe: vi.fn(async () => { order.push('empty-post-denied'); return bind('production-data-api-denial-probe', { writeCommitted: false }); }),
    probeProductionRealtimeDisabledHandshake: vi.fn(async () => { order.push('upgrade-disabled'); return bind('production-realtime-disabled-handshake-observation'); }),
    bindProductionRealtimeShutdownQuiescenceObservation: vi.fn(() => bind('production-realtime-shutdown-quiescence-observation')),
  };
  const database = {
    collectProductionIsolationStatementTriggers: vi.fn(async () => { order.push('trigger-inventory'); return { summary: {
      relationExists: true, statementTriggerInventoryComplete: true, enabledStatementTriggerCount: 0 } }; }),
    collectProductionIsolationDatabaseDrain: vi.fn(async () => { order.push('independent-drain'); return { summary: {
      allApplicableSessionsObserved: true, applicableApplicationSessionCount: 0 } }; }),
  };
  const liveAdapter = { createFixedProductionIsolationLiveAdapters: vi.fn(({ hostCapability: host }: { hostCapability: Record<string, (...args: unknown[]) => Promise<unknown>> }) => ({
    adapters: {
      capturePriorState: async () => {
        order.push('prior-capture'); await host.establishRealtimeSubscription({ priorRealtimeConfig: { suspend: false },
          priorStateCapturedAtUtc: new Date().toISOString() });
        return { auth: { syntheticSecret: 'must-not-return' }, realtime: { suspend: false },
          postgrest: { db_schema: 'public', preserved: true }, networkRestrictions: { dbAllowedCidrs: [], dbAllowedCidrsV6: [] } };
      },
      sealPriorState: host.sealPriorState, dataApiPrerequisite: host.dataApiPrerequisite,
      managementRequest: async ({ method, path, body }: { method: string; path: string; body: unknown }) => {
        order.push(method + ':' + path);
        if (path === 'postgrest') return { status: 200, body: method === 'PATCH' ? { db_schema: '' } : { db_schema: '', preserved: true } };
        if (path === 'config/realtime' && method === 'GET') { await host.collectPlatformIsolationReadback({}); return { status: 200, body: { suspend: true } }; }
        if (path === 'network-restrictions/apply') { ingress = body; return { status: 201, body: { status: 'stored' } }; }
        return { status: 204, body: {} };
      },
      readNetworkRestrictions: async () => {
        const status = polls.shift() ?? 'applied';
        return status === 'prior' ? { status: 'applied', dbAllowedCidrs: [], dbAllowedCidrsV6: [] } :
          { status, ...(ingress as object) };
      },
      probeExcludedOperatorPooler: host.probeExcludedOperatorPooler, probeOperatorPooler: host.probeOperatorPooler,
    },
    getControlJournal: () => ({ realtime: { configDisableRequestedAtUtc: new Date().toISOString(),
      configDisableResponseAtUtc: new Date().toISOString(), configDisabledReadbackAtUtc: new Date().toISOString(),
      shutdownRequestedAtUtc: new Date().toISOString(), shutdownResponseAtUtc: new Date().toISOString() } }),
  })) };
  const sealPriorState = vi.fn(async () => { order.push('sealed-before-write');
    return bind('production-isolation-prior-state-sealed', { encrypted: true, immutable: true, ciphertextSha256: '4'.repeat(64) }); });
  return { request, modules: { controls: { runProductionTemporaryIsolationControls }, probes, database, platform, liveAdapter },
    sealPriorState, order, session };
}

describe('fixed live isolation orchestration', () => {
  it('orders preflight, encrypted seal, closed controls, denial probes and independent drain without restoring services', async () => {
    const f = fixture(); const result = await runFixedProductionIsolationLive(f);
    expect(result.controlEvidenceOnly).toBe(true);
    expect(result.controls.network.operatorReadOnlyAdmissionProved).toBe(true);
    expect(f.order.indexOf('sealed-before-write')).toBeLessThan(f.order.indexOf('PATCH:postgrest'));
    expect(f.order.indexOf('independent-platform-read')).toBeLessThan(f.order.indexOf('POST:config/realtime/shutdown'));
    expect(f.order.indexOf('pooler-2')).toBeLessThan(f.order.indexOf('pooler-3'));
    expect(f.order.indexOf('empty-post-denied')).toBeLessThan(f.order.indexOf('independent-drain'));
    expect(f.order.at(-1)).toBe('caller-cleanup-after-proof');
    expect(JSON.stringify(result)).not.toMatch(/must-not-return|synthetic-management|synthetic-service|203\.0\.113/);
    expect(f.session.close).toHaveBeenCalledTimes(1);
  });
  it('retains repeated stored and stale applied polls with exact profile-match evidence', async () => {
    vi.useFakeTimers();
    try {
      const f = fixture(['prior', 'stored', 'stored', 'applied', 'stored', 'applied']);
      const pending = runFixedProductionIsolationLive(f);
      await vi.runAllTimersAsync();
      const result = await pending;
      expect(result.observations.networkReadbacks.map((value: { restrictionStatus: string }) => value.restrictionStatus))
        .toEqual(['applied', 'stored', 'stored', 'applied', 'stored', 'applied']);
      expect(result.observations.networkReadbacks[0]).toMatchObject({ requestedConfigurationMatched: false,
        previousConfigurationMatched: true, ipv4AllowlistCount: 0, ipv6AllowlistCount: 0 });
      expect(result.observations.networkReadbacks.slice(1).every((value: { requestedConfigurationMatched: boolean }) => value.requestedConfigurationMatched)).toBe(true);
      expect(result.observations.networkReadbacks[1].appliedConfigurationSha256)
        .toBe(result.observations.networkReadbacks[2].appliedConfigurationSha256);
      expect(result.observations.networkReadbacks[3].appliedConfigurationSha256)
        .not.toBe(result.observations.networkReadbacks[5].appliedConfigurationSha256);
      expect(result.observations.poolerProbes).toHaveLength(3);
      expect(f.order.filter(value => value === 'POST:network-restrictions/apply')).toHaveLength(2);
      expect(JSON.stringify(result)).not.toMatch(/synthetic-management|synthetic-service|203\.0\.113/);
    } finally { vi.useRealTimers(); }
  });
  it('refuses a prior pooler failure before seal or any control request', async () => {
    const f = fixture(); f.modules.probes.probeProductionSessionPoolerReadOnly.mockResolvedValueOnce({
      outcome: 'denied_unclassified', freshReadOnlyTransactionConfirmed: false } as never);
    await expect(runFixedProductionIsolationLive(f)).rejects.toThrow('Production isolation live run refused');
    expect(f.sealPriorState).not.toHaveBeenCalled();
    expect(f.modules.liveAdapter.createFixedProductionIsolationLiveAdapters).not.toHaveBeenCalled();
  });
  it('restores process environment and closes the probe on a refused seal, before hosted writes', async () => {
    const f = fixture(); const prior = process.env.SYNTHETIC_ENV_RESTORE_TEST;
    process.env.SYNTHETIC_ENV_RESTORE_TEST = 'original';
    f.sealPriorState.mockRejectedValueOnce(new Error('do-not-log-private-detail'));
    try {
      await expect(runFixedProductionIsolationLive(f)).rejects.toThrow('Production isolation live run refused');
      expect(process.env.SYNTHETIC_ENV_RESTORE_TEST).toBe('original');
      expect(f.order).not.toContain('PATCH:postgrest');
      expect(f.session.close).toHaveBeenCalledTimes(1);
    } finally {
      if (prior === undefined) delete process.env.SYNTHETIC_ENV_RESTORE_TEST; else process.env.SYNTHETIC_ENV_RESTORE_TEST = prior;
    }
  });
});

describe('fixed production aggregate collectors', () => {
  it.each([collectProductionIsolationStatementTriggers, collectProductionIsolationDatabaseDrain])(
    'refuses caller environment overrides before target access', async collect => {
      await expect(collect({ workspace: process.cwd(), binding: {}, sourceOptions: {},
        environment: { EXPECTED_SUPABASE_ENVIRONMENT: 'production' } })).rejects.toThrow('Production isolation database collection refused');
    });
});