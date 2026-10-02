import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  PRODUCTION_ISOLATION_CONTROL_TIMEOUT_MS,
  PRODUCTION_ISOLATION_NETWORK_POLL_INTERVAL_MS,
  PRODUCTION_TEMPORARY_ISOLATION_UNCERTAIN,
  runProductionTemporaryIsolationControls,
} from '../../../../src/lib/release/production-isolation-controls.mjs';

const context = Object.freeze({
  sourceSha: 'a'.repeat(40),
  targetBindingSha256: 'b'.repeat(64),
  isolationPlanSha256: 'c'.repeat(64),
  projectRef: 'abcdefghijklmnopqrst',
});

const admission = Object.freeze({
  schemaVersion: 1,
  kind: 'production-temporary-isolation-admission',
  sourceSha: context.sourceSha,
  targetBindingSha256: context.targetBindingSha256,
  isolationPlanSha256: context.isolationPlanSha256,
  operatorIpv4Cidr: '203.0.113.7/32',
  exclusionIpv4Cidr: '203.0.113.8/32',
  operatorIpv6EgressUnavailable: true,
});

const priorState = Object.freeze({
  auth: { hook_send_email_enabled: false },
  realtime: { suspend: false, private_only: false },
  postgrest: { db_schema: 'public,graphql_public', jwt_secret: 'must-not-leak' },
  networkRestrictions: { dbAllowedCidrs: ['0.0.0.0/0'], dbAllowedCidrsV6: ['::/0'] },
});

function response(status: number, body: Record<string, unknown> = {}) {
  return { status, body };
}

function createAdapters({ onRequest }: { onRequest?: (request: Record<string, unknown>) => unknown } = {}) {
  const calls: string[] = [];
  const adapter = {
    capturePriorState: vi.fn(async () => {
      calls.push('capture');
      return priorState;
    }),
    sealPriorState: vi.fn(async () => {
      calls.push('seal');
      return {
        schemaVersion: 1,
        kind: 'production-isolation-prior-state-sealed',
        sourceSha: context.sourceSha,
        targetBindingSha256: context.targetBindingSha256,
        isolationPlanSha256: context.isolationPlanSha256,
        capturedAtUtc: '2026-10-02T12:00:00.000Z',
        encrypted: true,
        immutable: true,
        ciphertextSha256: 'd'.repeat(64),
      };
    }),
    dataApiPrerequisite: vi.fn(async () => {
      calls.push('prerequisite');
      return {
        authenticatedReadAdmissionPassed: true,
        relationExists: true,
        statementTriggerInventoryComplete: true,
        enabledStatementTriggerCount: 0,
      };
    }),
    managementRequest: vi.fn(async (request: Record<string, unknown>) => {
      calls.push(`${request.method} ${request.path}`);
      const override = onRequest?.(request);
      if (override !== undefined) return override;
      if (request.method === 'PATCH' && request.path === 'postgrest') return response(200, { db_schema: '' });
      if (request.method === 'GET' && request.path === 'postgrest') return response(200, { ...priorState.postgrest, db_schema: '' });
      if (request.method === 'PATCH' && request.path === 'config/realtime') return response(204);
      if (request.method === 'GET' && request.path === 'config/realtime') return response(200, { suspend: true, private_only: false });
      if (request.method === 'POST' && request.path === 'config/realtime/shutdown') return response(204);
      if (request.method === 'POST' && request.path === 'network-restrictions/apply') return response(201, { status: 'stored' });
      throw new Error('unexpected request');
    }),
    readNetworkRestrictions: vi.fn(async () => {
      calls.push('network-read');
      const applyCalls = adapter.managementRequest.mock.calls.filter(([request]) =>
        request.method === 'POST' && request.path === 'network-restrictions/apply'
      );
      const request = applyCalls.at(-1)?.[0] as { body: { dbAllowedCidrs: string[] } };
      return { status: 'applied', dbAllowedCidrs: request.body.dbAllowedCidrs, dbAllowedCidrsV6: [] };
    }),
    probeExcludedOperatorPooler: vi.fn(async () => {
      calls.push('exclusion-probe');
      return { denied: true, denialCause: 'network-restriction' };
    }),
    probeOperatorPooler: vi.fn(async () => {
      calls.push('operator-probe');
      return { succeeded: true, readOnlyTransactionConfirmed: true };
    }),
  };
  return { adapter, calls };
}

const syntheticClock = () => new Date('2026-10-02T12:00:01.000Z');

describe('Story 22.15 production temporary isolation controls', () => {
  it('uses the exact reviewed order, paths and request bodies after sealing prior state', async () => {
    const { adapter, calls } = createAdapters();

    const result = await runProductionTemporaryIsolationControls({ context, admission, adapters: adapter, now: syntheticClock });

    expect(PRODUCTION_ISOLATION_CONTROL_TIMEOUT_MS).toBe(20_000);
    expect(calls).toEqual([
      'capture', 'seal', 'prerequisite',
      'PATCH postgrest', 'GET postgrest',
      'PATCH config/realtime', 'GET config/realtime', 'POST config/realtime/shutdown',
      'POST network-restrictions/apply', 'network-read', 'exclusion-probe',
      'POST network-restrictions/apply', 'network-read', 'operator-probe',
    ]);
    const requests = adapter.managementRequest.mock.calls.map(([request]) => request);
    for (const request of requests) {
      expect(request.timeoutMs).toBe(PRODUCTION_ISOLATION_CONTROL_TIMEOUT_MS);
      expect(request.signal).toBeInstanceOf(AbortSignal);
    }
    expect(requests.map((request) => [request.method, request.path, request.body])).toEqual([
      ['PATCH', 'postgrest', { db_schema: '' }],
      ['GET', 'postgrest', {}],
      ['PATCH', 'config/realtime', { suspend: true }],
      ['GET', 'config/realtime', {}],
      ['POST', 'config/realtime/shutdown', {}],
      ['POST', 'network-restrictions/apply', { dbAllowedCidrs: [admission.exclusionIpv4Cidr], dbAllowedCidrsV6: [] }],
      ['POST', 'network-restrictions/apply', { dbAllowedCidrs: [admission.operatorIpv4Cidr], dbAllowedCidrsV6: [] }],
    ]);
    expect(result).toMatchObject({
      kind: 'production-temporary-isolation-controls',
      controlEvidenceOnly: true,
      sourceSha: context.sourceSha,
      dataApi: { capturedAtUtc: syntheticClock().toISOString(), dbSchemaDisabled: true, otherPostgrestSettingsPreserved: true },
      realtime: { capturedAtUtc: syntheticClock().toISOString(), suspended: true, shutdownAcknowledged: true },
      network: { capturedAtUtc: syntheticClock().toISOString(), exclusionDenialProved: true, operatorReadOnlyAdmissionProved: true },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
  });

  it.each([
    ['wrong target binding', { ...admission, targetBindingSha256: 'e'.repeat(64) }],
    ['a broad operator range', { ...admission, operatorIpv4Cidr: '203.0.113.7/24' }],
    ['the operator as its own exclusion', { ...admission, exclusionIpv4Cidr: admission.operatorIpv4Cidr }],
  ])('rejects %s before any adapter call', async (_label, unsafeAdmission) => {
    const { adapter } = createAdapters();
    await expect(runProductionTemporaryIsolationControls({ context, admission: unsafeAdmission, adapters: adapter, now: syntheticClock })).rejects.toThrow('Production temporary isolation refused');
    expect(adapter.capturePriorState).not.toHaveBeenCalled();
  });

  it('rejects a getter-backed admission before it can run an adapter', async () => {
    const { adapter } = createAdapters();
    const unsafeAdmission = { ...admission } as Record<string, unknown>;
    Object.defineProperty(unsafeAdmission, 'operatorIpv4Cidr', {
      enumerable: true,
      get() { throw new Error('getter must not execute'); },
    });
    await expect(runProductionTemporaryIsolationControls({ context, admission: unsafeAdmission, adapters: adapter, now: syntheticClock })).rejects.toMatchObject({
      code: PRODUCTION_TEMPORARY_ISOLATION_UNCERTAIN,
    });
    expect(adapter.capturePriorState).not.toHaveBeenCalled();
  });

  it('stops before a setting change when the prerequisite or sealed rollback evidence is incomplete', async () => {
    const unsealed = createAdapters();
    unsealed.adapter.sealPriorState.mockResolvedValueOnce({});
    await expect(runProductionTemporaryIsolationControls({ context, admission, adapters: unsealed.adapter, now: syntheticClock })).rejects.toThrow();
    expect(unsealed.adapter.managementRequest).not.toHaveBeenCalled();

    const badPrerequisite = createAdapters();
    badPrerequisite.adapter.dataApiPrerequisite.mockResolvedValueOnce({
      authenticatedReadAdmissionPassed: true, relationExists: true,
      statementTriggerInventoryComplete: true, enabledStatementTriggerCount: 1,
    });
    await expect(runProductionTemporaryIsolationControls({ context, admission, adapters: badPrerequisite.adapter, now: syntheticClock })).rejects.toThrow();
    expect(badPrerequisite.adapter.managementRequest).not.toHaveBeenCalled();
  });

  it('stops on unknown control/readback responses without issuing later controls', async () => {
    const { adapter } = createAdapters({ onRequest: (request) =>
      request.method === 'PATCH' && request.path === 'postgrest' ? response(202, { db_schema: '' }) : undefined
    });
    await expect(runProductionTemporaryIsolationControls({ context, admission, adapters: adapter, now: syntheticClock })).rejects.toThrow();
    expect(adapter.managementRequest.mock.calls.map(([request]) => request.path)).toEqual(['postgrest']);
    expect(adapter.readNetworkRestrictions).not.toHaveBeenCalled();
  });

  it('bounds a hung adapter and suppresses its transport detail', async () => {
    const { adapter } = createAdapters();
    adapter.capturePriorState.mockImplementationOnce(({ signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('transport aborted')), { once: true });
    }));
    let timeout: (() => void) | undefined;
    const pending = runProductionTemporaryIsolationControls({
      context, admission, adapters: adapter, now: syntheticClock,
      setTimer(callback: () => void) {
        timeout = callback;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimer() {},
    });
    timeout?.();
    await expect(pending).rejects.toMatchObject({ code: PRODUCTION_TEMPORARY_ISOLATION_UNCERTAIN });
    expect(adapter.sealPriorState).not.toHaveBeenCalled();
  });

  it('restores exact operator ingress when the exclusion probe fails, then refuses the run', async () => {
    const { adapter, calls } = createAdapters();
    adapter.probeExcludedOperatorPooler.mockResolvedValueOnce({ denied: false, denialCause: 'timeout' });

    await expect(runProductionTemporaryIsolationControls({ context, admission, adapters: adapter, now: syntheticClock })).rejects.toThrow();

    expect(adapter.probeExcludedOperatorPooler).toHaveBeenCalledOnce();
    expect(calls).toContain('POST network-restrictions/apply');
    const networkRequests = adapter.managementRequest.mock.calls.map(([request]) => request).filter((request) => request.path === 'network-restrictions/apply');
    expect(networkRequests).toHaveLength(2);
    expect(networkRequests[1].body).toEqual({ dbAllowedCidrs: [admission.operatorIpv4Cidr], dbAllowedCidrsV6: [] });
    expect(adapter.probeOperatorPooler).not.toHaveBeenCalled();
  });

  it('restores exact operator ingress when the exclusion readback is malformed', async () => {
    const { adapter } = createAdapters();
    adapter.readNetworkRestrictions.mockResolvedValueOnce({ status: 'applied', dbAllowedCidrs: ['0.0.0.0/0'], dbAllowedCidrsV6: [] });

    await expect(runProductionTemporaryIsolationControls({ context, admission, adapters: adapter, now: syntheticClock })).rejects.toThrow();

    const networkRequests = adapter.managementRequest.mock.calls.map(([request]) => request).filter((request) => request.path === 'network-restrictions/apply');
    expect(networkRequests).toHaveLength(2);
    expect(networkRequests[1].body).toEqual({ dbAllowedCidrs: [admission.operatorIpv4Cidr], dbAllowedCidrsV6: [] });
  });

  it('restores and reads back exact operator ingress after an uncertain exclusion response', async () => {
    const { adapter } = createAdapters({ onRequest: (request) => {
      const cidrs = (request.body as { dbAllowedCidrs?: string[] }).dbAllowedCidrs;
      return request.method === 'POST' && request.path === 'network-restrictions/apply' &&
        cidrs?.[0] === admission.exclusionIpv4Cidr
        ? response(202, { status: 'accepted' })
        : undefined;
    } });

    await expect(runProductionTemporaryIsolationControls({ context, admission, adapters: adapter, now: syntheticClock })).rejects.toMatchObject({
      code: PRODUCTION_TEMPORARY_ISOLATION_UNCERTAIN,
    });

    const networkRequests = adapter.managementRequest.mock.calls.map(([request]) => request).filter((request) => request.path === 'network-restrictions/apply');
    expect(networkRequests).toHaveLength(2);
    expect(networkRequests[1].body).toEqual({ dbAllowedCidrs: [admission.operatorIpv4Cidr], dbAllowedCidrsV6: [] });
    expect(adapter.readNetworkRestrictions).toHaveBeenCalledOnce();
  });

  it('aborts and settles an exclusion transport before restoring operator ingress', async () => {
    const { adapter } = createAdapters();
    const originalRequest = adapter.managementRequest.getMockImplementation()!;
    adapter.managementRequest.mockImplementation((request: Record<string, unknown>) => {
      const cidrs = (request.body as { dbAllowedCidrs?: string[] }).dbAllowedCidrs;
      if (request.path === 'network-restrictions/apply' && cidrs?.[0] === admission.exclusionIpv4Cidr) {
        return new Promise((_resolve, reject) => {
          const signal = request.signal as AbortSignal;
          if (signal.aborted) reject(new Error('aborted'));
          else signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        });
      }
      return originalRequest(request);
    });
    let invocation = 0;
    const pending = runProductionTemporaryIsolationControls({
      context, admission, adapters: adapter, now: syntheticClock,
      setTimer(callback: () => void) {
        invocation += 1;
        if (invocation === 9) queueMicrotask(callback);
        return invocation as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimer() {},
    });

    await expect(pending).rejects.toMatchObject({ code: PRODUCTION_TEMPORARY_ISOLATION_UNCERTAIN });
    const networkRequests = adapter.managementRequest.mock.calls.map(([request]) => request).filter((request) => request.path === 'network-restrictions/apply');
    expect(networkRequests).toHaveLength(2);
    expect(networkRequests[1].body).toEqual({ dbAllowedCidrs: [admission.operatorIpv4Cidr], dbAllowedCidrsV6: [] });
    expect(adapter.readNetworkRestrictions).toHaveBeenCalledOnce();
  });


  it('waits for both stored transitions before probing or issuing the next network write', async () => {
    vi.useFakeTimers();
    try {
      const { adapter } = createAdapters();
      const state = (status: string, cidr: string) => ({ status, dbAllowedCidrs: [cidr], dbAllowedCidrsV6: [] });
      adapter.readNetworkRestrictions.mockResolvedValueOnce(state('stored', admission.exclusionIpv4Cidr))
        .mockResolvedValueOnce(state('stored', admission.exclusionIpv4Cidr))
        .mockResolvedValueOnce(state('applied', admission.exclusionIpv4Cidr))
        .mockResolvedValueOnce(state('stored', admission.operatorIpv4Cidr))
        .mockResolvedValueOnce(state('applied', admission.operatorIpv4Cidr));
      const pending = runProductionTemporaryIsolationControls({ context, admission, adapters: adapter, now: syntheticClock });
      await vi.advanceTimersByTimeAsync(999);
      expect(PRODUCTION_ISOLATION_NETWORK_POLL_INTERVAL_MS).toBe(1000);
      expect(adapter.readNetworkRestrictions).toHaveBeenCalledOnce();
      expect(adapter.probeExcludedOperatorPooler).not.toHaveBeenCalled();
      expect(adapter.managementRequest.mock.calls.filter(([request]) => request.path === 'network-restrictions/apply')).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1001);
      expect(adapter.probeExcludedOperatorPooler).toHaveBeenCalledOnce();
      expect(adapter.probeOperatorPooler).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1000);
      await expect(pending).resolves.toMatchObject({ network: { operatorReadbackAccepted: true } });
      expect(adapter.readNetworkRestrictions).toHaveBeenCalledTimes(5);
      expect(adapter.readNetworkRestrictions.mock.calls[0][0].signal).toBe(adapter.readNetworkRestrictions.mock.calls[2][0].signal);
      expect(adapter.probeOperatorPooler).toHaveBeenCalledOnce();
    } finally { vi.useRealTimers(); }
  });

  it('waits through only the exactly captured stale applied profile', async () => {
    vi.useFakeTimers();
    try {
      const { adapter } = createAdapters();
      adapter.readNetworkRestrictions.mockResolvedValueOnce({ status: 'applied', ...priorState.networkRestrictions });
      const pending = runProductionTemporaryIsolationControls({ context, admission, adapters: adapter, now: syntheticClock });
      await vi.advanceTimersByTimeAsync(999);
      expect(adapter.probeExcludedOperatorPooler).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await expect(pending).resolves.toMatchObject({ network: { exclusionApplied: true } });
    } finally { vi.useRealTimers(); }
  });

  it('uses one non-resetting 20-second propagation bound and one recovery write', async () => {
    vi.useFakeTimers();
    try {
      const { adapter } = createAdapters();
      const original = adapter.readNetworkRestrictions.getMockImplementation()!;
      adapter.readNetworkRestrictions.mockImplementation(async (argument) => {
        const applies = adapter.managementRequest.mock.calls.filter(([request]) => request.path === 'network-restrictions/apply');
        if (applies.length === 1) return { status: 'stored', dbAllowedCidrs: [admission.exclusionIpv4Cidr], dbAllowedCidrsV6: [] };
        return original(argument);
      });
      const pending = runProductionTemporaryIsolationControls({ context, admission, adapters: adapter, now: syntheticClock });
      const rejected = expect(pending).rejects.toMatchObject({ code: PRODUCTION_TEMPORARY_ISOLATION_UNCERTAIN });
      await vi.advanceTimersByTimeAsync(19_999);
      expect(adapter.readNetworkRestrictions).toHaveBeenCalledTimes(20);
      expect(adapter.managementRequest.mock.calls.filter(([request]) => request.path === 'network-restrictions/apply')).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      await rejected;
      expect(adapter.probeExcludedOperatorPooler).not.toHaveBeenCalled();
      const writes = adapter.managementRequest.mock.calls.filter(([request]) => request.path === 'network-restrictions/apply');
      expect(writes).toHaveLength(2);
      expect(writes[1][0].body).toEqual({ dbAllowedCidrs: [admission.operatorIpv4Cidr], dbAllowedCidrsV6: [] });
    } finally { vi.useRealTimers(); }
  });

  it('settles an aborted polling GET before the operator recovery POST', async () => {
    vi.useFakeTimers();
    try {
      const { adapter } = createAdapters();
      const order: string[] = [];
      const original = adapter.managementRequest.getMockImplementation()!;
      adapter.managementRequest.mockImplementation(async request => {
        if (request.path === 'network-restrictions/apply') order.push('write');
        return original(request);
      });
      adapter.readNetworkRestrictions.mockImplementationOnce(({ signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => { order.push('read-settled'); reject(new Error('private transport')); }, { once: true });
      }));
      const pending = runProductionTemporaryIsolationControls({ context, admission, adapters: adapter, now: syntheticClock });
      const rejected = expect(pending).rejects.toMatchObject({ code: PRODUCTION_TEMPORARY_ISOLATION_UNCERTAIN });
      await vi.advanceTimersByTimeAsync(20_000);
      await rejected;
      expect(order).toEqual(['write', 'read-settled', 'write']);
    } finally { vi.useRealTimers(); }
  });

  it('does not claim restoration or retry writes when the final stored state never applies', async () => {
    vi.useFakeTimers();
    try {
      const { adapter } = createAdapters();
      const original = adapter.readNetworkRestrictions.getMockImplementation()!;
      adapter.readNetworkRestrictions.mockImplementation(async argument => {
        const applies = adapter.managementRequest.mock.calls.filter(([request]) => request.path === 'network-restrictions/apply');
        if (applies.length === 2) return { status: 'stored', dbAllowedCidrs: [admission.operatorIpv4Cidr], dbAllowedCidrsV6: [] };
        return original(argument);
      });
      const pending = runProductionTemporaryIsolationControls({ context, admission, adapters: adapter, now: syntheticClock });
      const rejected = expect(pending).rejects.toMatchObject({ code: PRODUCTION_TEMPORARY_ISOLATION_UNCERTAIN });
      await vi.advanceTimersByTimeAsync(20_000);
      await rejected;
      expect(adapter.managementRequest.mock.calls.filter(([request]) => request.path === 'network-restrictions/apply')).toHaveLength(2);
      expect(adapter.probeOperatorPooler).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });

  it.each([
    ['unknown status', { status: 'pending', dbAllowedCidrs: [admission.exclusionIpv4Cidr], dbAllowedCidrsV6: [] }],
    ['different stored profile', { status: 'stored', dbAllowedCidrs: ['203.0.113.9/32'], dbAllowedCidrsV6: [] }],
    ['different applied profile', { status: 'applied', dbAllowedCidrs: ['203.0.113.9/32'], dbAllowedCidrsV6: [] }],
    ['unknown extra', { status: 'stored', dbAllowedCidrs: [admission.exclusionIpv4Cidr], dbAllowedCidrsV6: [], extra: true }],
  ])('refuses %s without polling or probing it as accepted', async (_, state) => {
    const { adapter } = createAdapters();
    adapter.readNetworkRestrictions.mockResolvedValueOnce(state);
    await expect(runProductionTemporaryIsolationControls({ context, admission, adapters: adapter, now: syntheticClock })).rejects.toMatchObject({ code: PRODUCTION_TEMPORARY_ISOLATION_UNCERTAIN });
    expect(adapter.readNetworkRestrictions).toHaveBeenCalledTimes(2);
    expect(adapter.probeExcludedOperatorPooler).not.toHaveBeenCalled();
  });
  it('has no database command or unrestricted command-launch surface', async () => {
    const source = await readFile(
      resolve(process.cwd(), 'src/lib/release/production-isolation-controls.mjs'),
      'utf8'
    );
    expect(source).not.toMatch(/child_process|spawn(?:Sync)?\(|exec(?:File)?\(|psql|supabase\s+db|migration|history|delete\s+from|insert\s+into|update\s+/iu);
  });
});
