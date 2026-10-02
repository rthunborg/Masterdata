import { describe, expect, it, vi } from 'vitest';

import {
  createFixedProductionIsolationLiveAdapters,
  PRODUCTION_ISOLATION_LIVE_ADAPTER_MAX_RESPONSE_BYTES,
  PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED,
} from '../../../../src/lib/release/production-isolation-live-adapter.mjs';

const projectRef = 'abcdefghijklmnopqrst';
const context = Object.freeze({
  sourceSha: 'a'.repeat(40),
  targetBindingSha256: 'b'.repeat(64),
  isolationPlanSha256: 'c'.repeat(64),
  projectRef,
});
const signal = () => new AbortController().signal;

const sealed = Object.freeze({
  schemaVersion: 1,
  kind: 'production-isolation-prior-state-sealed',
  sourceSha: context.sourceSha,
  targetBindingSha256: context.targetBindingSha256,
  isolationPlanSha256: context.isolationPlanSha256,
  capturedAtUtc: '2026-10-02T12:00:00.000Z',
  encrypted: true,
  immutable: true,
  ciphertextSha256: 'd'.repeat(64),
});

function capability(fetchImpl = vi.fn()) {
  return {
    managementApiToken: 'private-synthetic-token',
    fetchImpl,
    sealPriorState: vi.fn(async () => sealed),
    dataApiPrerequisite: vi.fn(async () => ({ authenticatedReadAdmissionPassed: true })),
    probeExcludedOperatorPooler: vi.fn(async () => ({ denied: true, denialCause: 'network-restriction' })),
    probeOperatorPooler: vi.fn(async () => ({ succeeded: true, readOnlyTransactionConfirmed: true })),
    establishRealtimeSubscription: vi.fn(async () => ({ existingConnectionEstablishedAtUtc: '2026-10-02T12:00:01.000Z', existingSubscriptionAcknowledgedAtUtc: '2026-10-02T12:00:02.000Z' })),
    collectPlatformIsolationReadback: vi.fn(async () => ({ capturedAtUtc: '2026-10-02T12:00:05.000Z' })),
    clock: () => new Date('2026-10-02T12:00:00.000Z'),
  };
}

function request(method: string, path: string, body: Record<string, unknown>, requestSignal = signal()) {
  return { context, method, path, body, timeoutMs: 20_000, signal: requestSignal };
}

const postgrestConfig = Object.freeze({ db_schema: 'public', max_rows: 1000, db_extra_search_path: 'public,extensions', db_pool: null, db_pool_acquisition_timeout: null });
function mockFetch() {
  let realtimeGets = 0;
  return vi.fn(async (url: string, init: RequestInit) => {
    const pathname = new URL(url).pathname;
    if (init.method === 'GET' && pathname.endsWith('/config/auth')) return new Response(JSON.stringify({ hook_send_email_enabled: false }), { status: 200 });
    if (init.method === 'GET' && pathname.endsWith('/config/realtime')) { realtimeGets += 1; return new Response(JSON.stringify({ suspend: realtimeGets > 1, private_only: false }), { status: 200 }); }
    if (init.method === 'GET' && pathname.endsWith('/postgrest')) return new Response(JSON.stringify({ ...postgrestConfig, jwt_secret: 'secret-never-returned' }), { status: 200 });
    if (init.method === 'GET' && pathname.endsWith('/network-restrictions')) return new Response(JSON.stringify({ status: 'applied', config: { dbAllowedCidrs: ['0.0.0.0/0'], dbAllowedCidrsV6: ['::/0'] } }), { status: 200 });
    if (init.method === 'PATCH' && pathname.endsWith('/postgrest')) return new Response(JSON.stringify({ ...postgrestConfig, db_schema: '' }), { status: 200 });
    if (init.method === 'PATCH' && pathname.endsWith('/config/realtime')) return new Response(null, { status: 204 });
    if (init.method === 'POST' && pathname.endsWith('/config/realtime/shutdown')) return new Response(null, { status: 204 });
    if (init.method === 'POST' && pathname.endsWith('/network-restrictions/apply')) return new Response(JSON.stringify({ status: 'stored' }), { status: 201 });
    throw new Error('unexpected request');
  });
}

describe('Story 22.15 fixed live Management API adapter', () => {
  it('uses only project-bound fixed Management API requests and seals raw prior state through the host bridge', async () => {
    const fetchImpl = mockFetch();
    const hostCapability = capability(fetchImpl);
    const { adapters, getControlJournal } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability });

    const prior = await adapters.capturePriorState({ context, signal: signal() });
    const sealedResult = await adapters.sealPriorState({ context, priorState: prior, signal: signal() });
    const postgrest = await adapters.managementRequest(request('PATCH', 'postgrest', { db_schema: '' }));
    const realtime = await adapters.managementRequest(request('PATCH', 'config/realtime', { suspend: true }));
    const realtimeReadback = await adapters.managementRequest(request('GET', 'config/realtime', {}));
    const shutdown = await adapters.managementRequest(request('POST', 'config/realtime/shutdown', {}));
    const network = await adapters.managementRequest(request('POST', 'network-restrictions/apply', { dbAllowedCidrs: ['203.0.113.7/32'], dbAllowedCidrsV6: [] }));
    const readback = await adapters.readNetworkRestrictions({ context, signal: signal() });

    expect(fetchImpl.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
      `/v1/projects/${projectRef}/config/auth`,
      `/v1/projects/${projectRef}/config/realtime`,
      `/v1/projects/${projectRef}/postgrest`,
      `/v1/projects/${projectRef}/network-restrictions`,
      `/v1/projects/${projectRef}/postgrest`,
      `/v1/projects/${projectRef}/config/realtime`,
      `/v1/projects/${projectRef}/config/realtime`,
      `/v1/projects/${projectRef}/config/realtime/shutdown`,
      `/v1/projects/${projectRef}/network-restrictions/apply`,
      `/v1/projects/${projectRef}/network-restrictions`,
    ]);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init).toMatchObject({ redirect: 'error', headers: { Authorization: 'Bearer private-synthetic-token' } });
    }
    expect(hostCapability.establishRealtimeSubscription).toHaveBeenCalledBefore(hostCapability.collectPlatformIsolationReadback);
    expect(hostCapability.collectPlatformIsolationReadback).toHaveBeenCalledWith(expect.objectContaining({ context }));
    expect(hostCapability.sealPriorState).toHaveBeenCalledWith({ context, priorState: prior });
    expect(hostCapability.sealPriorState.mock.calls[0][0]).not.toHaveProperty('path');
    expect(sealedResult).toBe(sealed);
    expect(postgrest).toEqual({ status: 200, body: { db_schema: '' } });
    expect(realtime).toEqual({ status: 204, body: {} });
    expect(realtimeReadback).toEqual({ status: 200, body: { suspend: true, private_only: false } });
    expect(shutdown).toEqual({ status: 204, body: {} });
    expect(network).toEqual({ status: 201, body: { status: 'stored' } });
    expect(readback).toEqual({ status: 'applied', dbAllowedCidrs: ['0.0.0.0/0'], dbAllowedCidrsV6: ['::/0'] });
    expect(getControlJournal()).toMatchObject({ kind: 'production-isolation-live-adapter-control-journal', realtime: { existingSessionEstablished: true, independentPlatformReadbackCompleted: true, configDisableRequestedAtUtc: expect.any(String), configDisabledReadbackAtUtc: expect.any(String), shutdownRequestedAtUtc: expect.any(String) } });
    expect(JSON.stringify(getControlJournal())).not.toContain('secret-never-returned');
  });

  it('refuses arbitrary target, endpoint, SQL-shaped body, credentials, or transport configuration before a request', async () => {
    const fetchImpl = mockFetch();
    const { adapters } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability: capability(fetchImpl) });
    await expect(adapters.managementRequest(request('POST', 'postgrest', { sql: 'select 1' }))).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });
    await expect(adapters.managementRequest(request('PATCH', 'config/auth', { disable_signup: true }))).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });
    await expect(adapters.managementRequest({ ...request('GET', 'postgrest', {}), context: { ...context, projectRef: 'z'.repeat(20) } })).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(() => createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability: { ...capability(fetchImpl), endpoint: 'https://example.test' } })).toThrow('Production isolation live adapter refused');
  });

  it('rejects malformed or uncertain write responses without preserving response material', async () => {
    const malformedFetch = vi.fn(async () => new Response(JSON.stringify({ status: 'accepted' }), { status: 202 }));
    const { adapters } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability: capability(malformedFetch) });
    await expect(adapters.managementRequest(request('POST', 'network-restrictions/apply', { dbAllowedCidrs: ['203.0.113.7/32'], dbAllowedCidrsV6: [] }))).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });

    const invalidBodyFetch = vi.fn(async () => new Response(JSON.stringify({ db_schema: '', extra: 'private' }), { status: 200 }));
    const { adapters: invalidAdapters } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability: capability(invalidBodyFetch) });
    await expect(invalidAdapters.managementRequest(request('PATCH', 'postgrest', { db_schema: '' }))).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });

    const storedNetworkFetch = vi.fn(async () => new Response(JSON.stringify({ status: 'stored', config: { dbAllowedCidrs: ['203.0.113.7/32'], dbAllowedCidrsV6: [] } }), { status: 200 }));
    const { adapters: storedNetworkAdapters } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability: capability(storedNetworkFetch) });
    await expect(storedNetworkAdapters.readNetworkRestrictions({ context, signal: signal() })).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });
  });

  it('settles a stalled response body after aborting and cancels the reader', async () => {
    let cancelled = false;
    let releaseLock = false;
    const reader = {
      read: vi.fn(() => new Promise<never>(() => undefined)),
      cancel: vi.fn(async () => { cancelled = true; }),
      releaseLock: vi.fn(() => { releaseLock = true; }),
    };
    const fetchImpl = vi.fn(async () => ({ status: 200, redirected: false, body: { getReader: () => reader } }));
    const { adapters } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability: capability(fetchImpl) });
    const controller = new AbortController();
    const pending = adapters.managementRequest(request('GET', 'postgrest', {}, controller.signal));
    await vi.waitFor(() => expect(reader.read).toHaveBeenCalledOnce());
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });
    expect(cancelled).toBe(true);
    expect(releaseLock).toBe(true);
  });

  it('binds the disabled readback to the second Realtime GET after the disable request', async () => {
    let tick = 0;
    const hostCapability = capability(mockFetch());
    hostCapability.clock = () => new Date(Date.UTC(2026, 9, 2, 12, 0, tick++));
    const { adapters, getControlJournal } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability });
    const prior = await adapters.capturePriorState({ context, signal: signal() });
    await adapters.sealPriorState({ context, priorState: prior, signal: signal() });
    await adapters.managementRequest(request('PATCH', 'config/realtime', { suspend: true }));
    await adapters.managementRequest(request('GET', 'config/realtime', {}));
    await adapters.managementRequest(request('POST', 'config/realtime/shutdown', {}));
    const journal = getControlJournal();
    const readbacks = journal.requests.filter((entry: { method: string; path: string }) => entry.method === 'GET' && entry.path === 'config/realtime');
    expect(readbacks).toHaveLength(2);
    expect(journal.realtime.configDisabledReadbackAtUtc).toBe(readbacks[1].responseAtUtc);
    expect(journal.realtime.configDisabledReadbackAtUtc).not.toBe(readbacks[0].responseAtUtc);
    expect(Date.parse(journal.realtime.configDisableRequestedAtUtc)).toBeLessThan(Date.parse(journal.realtime.configDisabledReadbackAtUtc));
    expect(Date.parse(journal.realtime.configDisabledReadbackAtUtc)).toBeLessThan(Date.parse(journal.realtime.shutdownRequestedAtUtc));
  });


  it('caps an oversized response and clears captured raw settings when host sealing fails', async () => {
    const oversized = new Uint8Array(PRODUCTION_ISOLATION_LIVE_ADAPTER_MAX_RESPONSE_BYTES + 1);
    oversized.fill(65);
    const reader = { read: vi.fn().mockResolvedValueOnce({ done: false, value: oversized }), cancel: vi.fn(async () => undefined), releaseLock: vi.fn() };
    const tooLargeFetch = vi.fn(async () => ({ status: 200, redirected: false, body: { getReader: () => reader } }));
    const { adapters: tooLarge } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability: capability(tooLargeFetch) });
    await expect(tooLarge.managementRequest(request('GET', 'postgrest', {}))).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });

    const fetchImpl = mockFetch();
    const hostCapability = capability(fetchImpl);
    hostCapability.sealPriorState.mockRejectedValueOnce(new Error('bridge failure'));
    const { adapters } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability });
    const prior = await adapters.capturePriorState({ context, signal: signal() });
    await expect(adapters.sealPriorState({ context, priorState: prior, signal: signal() })).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });
    await expect(adapters.sealPriorState({ context, priorState: prior, signal: signal() })).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });
  });
});
describe('documented full PostgREST configuration response', () => {
  const malformed: Array<[string, Record<string, unknown>]> = [
    ...Object.keys(postgrestConfig).map((key): [string, Record<string, unknown>] => ['missing ' + key, Object.fromEntries(Object.entries({ ...postgrestConfig, db_schema: '' }).filter(([name]) => name !== key))]),
    ['unknown extra', { ...postgrestConfig, db_schema: '', extra: 'private' }],
    ['nonempty schema', { ...postgrestConfig }],
    ['schema type', { ...postgrestConfig, db_schema: null }],
    ['search path type', { ...postgrestConfig, db_schema: '', db_extra_search_path: [] }],
    ['max rows null', { ...postgrestConfig, db_schema: '', max_rows: null }],
    ['max rows fractional', { ...postgrestConfig, db_schema: '', max_rows: 1.5 }],
    ['max rows unsafe', { ...postgrestConfig, db_schema: '', max_rows: Number.MAX_SAFE_INTEGER + 1 }],
    ['pool string', { ...postgrestConfig, db_schema: '', db_pool: '10' }],
    ['pool fractional', { ...postgrestConfig, db_schema: '', db_pool: 1.5 }],
    ['pool unsafe', { ...postgrestConfig, db_schema: '', db_pool: Number.MAX_SAFE_INTEGER + 1 }],
    ['timeout boolean', { ...postgrestConfig, db_schema: '', db_pool_acquisition_timeout: false }],
    ['timeout fractional', { ...postgrestConfig, db_schema: '', db_pool_acquisition_timeout: 1.5 }],
    ['timeout unsafe', { ...postgrestConfig, db_schema: '', db_pool_acquisition_timeout: Number.MAX_SAFE_INTEGER + 1 }],
    ['max rows drift', { ...postgrestConfig, db_schema: '', max_rows: 999 }],
    ['search path drift', { ...postgrestConfig, db_schema: '', db_extra_search_path: 'public' }],
    ['pool drift', { ...postgrestConfig, db_schema: '', db_pool: 10 }],
    ['timeout drift', { ...postgrestConfig, db_schema: '', db_pool_acquisition_timeout: 10 }],
  ];

  it.each(malformed)('rejects %s after the actual fixed PATCH response', async (_, responseBody) => {
    const priorFetch = mockFetch();
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => init.method === 'PATCH' && new URL(url).pathname.endsWith('/postgrest')
      ? new Response(JSON.stringify(responseBody), { status: 200 }) : priorFetch(url, init));
    const { adapters } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability: capability(fetchImpl) });
    const prior = await adapters.capturePriorState({ context, signal: signal() });
    await adapters.sealPriorState({ context, priorState: prior, signal: signal() });
    await expect(adapters.managementRequest(request('PATCH', 'postgrest', { db_schema: '' }))).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });
    expect(fetchImpl.mock.calls.at(-1)?.[1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ db_schema: '' }) });
  });

  it.each([['automatic', null, null], ['explicit', 15, 10]] as const)('accepts unchanged %s pool settings and returns only the fixed acknowledgment', async (_, pool, timeout) => {
    const config = { ...postgrestConfig, db_pool: pool, db_pool_acquisition_timeout: timeout };
    const priorFetch = mockFetch();
    let patched = false;
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      if (new URL(url).pathname.endsWith('/postgrest')) {
        if (init.method === 'PATCH') patched = true;
        return new Response(JSON.stringify(init.method === 'PATCH' ? { ...config, db_schema: '' } : { ...config, db_schema: patched ? '' : 'public', jwt_secret: 'secret-never-returned' }), { status: 200 });
      }
      return priorFetch(url, init);
    });
    const { adapters } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability: capability(fetchImpl) });
    const prior = await adapters.capturePriorState({ context, signal: signal() });
    await adapters.sealPriorState({ context, priorState: prior, signal: signal() });
    const result = await adapters.managementRequest(request('PATCH', 'postgrest', { db_schema: '' }));
    expect(result).toEqual({ status: 200, body: { db_schema: '' } });
    expect(JSON.stringify(result)).not.toMatch(/max_rows|db_pool|secret-never-returned/);
    const readback = await adapters.managementRequest(request('GET', 'postgrest', {}));
    expect(readback.body).toEqual({ ...prior.postgrest, db_schema: '' });
  });

  it.each(['db_schema', 'max_rows', 'db_extra_search_path', 'db_pool', 'db_pool_acquisition_timeout'])('rejects missing prior %s before subscription or sealing', async (missing) => {
    const priorFetch = mockFetch();
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => new URL(url).pathname.endsWith('/postgrest')
      ? new Response(JSON.stringify(Object.fromEntries(Object.entries(postgrestConfig).filter(([key]) => key !== missing))), { status: 200 }) : priorFetch(url, init));
    const hostCapability = capability(fetchImpl);
    const { adapters } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability });
    await expect(adapters.capturePriorState({ context, signal: signal() })).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });
    expect(hostCapability.establishRealtimeSubscription).not.toHaveBeenCalled();
    expect(hostCapability.sealPriorState).not.toHaveBeenCalled();
    expect(fetchImpl.mock.calls.every(([, init]) => init.method === 'GET')).toBe(true);
  });
});
it.each([['unsafe max rows', { max_rows: Number.MAX_SAFE_INTEGER + 1 }], ['pool type', { db_pool: '15' }]])('rejects prior %s before sealing or any write', async (_, invalid) => {
  const priorFetch = mockFetch();
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => new URL(url).pathname.endsWith('/postgrest')
    ? new Response(JSON.stringify({ ...postgrestConfig, ...invalid }), { status: 200 }) : priorFetch(url, init));
  const hostCapability = capability(fetchImpl);
  const { adapters } = createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability });
  await expect(adapters.capturePriorState({ context, signal: signal() })).rejects.toMatchObject({ code: PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED });
  expect(hostCapability.sealPriorState).not.toHaveBeenCalled();
  expect(fetchImpl.mock.calls.every(([, init]) => init.method === 'GET')).toBe(true);
});