const PROJECT_REF = /^[a-z0-9]{20}$/u;
const SHA40 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

export const PRODUCTION_ISOLATION_LIVE_ADAPTER_MAX_RESPONSE_BYTES = 256 * 1024;
export const PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED = 'production_isolation_live_adapter_refused';

const fail = () => { const error = new Error('Production isolation live adapter refused'); error.code = PRODUCTION_ISOLATION_LIVE_ADAPTER_REFUSED; throw error; };
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.getOwnPropertySymbols(value).length === 0 && Object.keys(value).length === keys.length && keys.every(key => { const descriptor = Object.getOwnPropertyDescriptor(value, key); return descriptor?.enumerable === true && Object.hasOwn(descriptor, 'value'); });
const plainJson = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.getOwnPropertySymbols(value).length === 0 && Object.values(Object.getOwnPropertyDescriptors(value)).every(descriptor => descriptor.enumerable === true && Object.hasOwn(descriptor, 'value'));
const validSignal = value => value !== null && typeof value === 'object' && typeof value.aborted === 'boolean' && typeof value.addEventListener === 'function' && typeof value.removeEventListener === 'function';
const validContext = (value, projectRef) => exact(value, ['sourceSha', 'targetBindingSha256', 'isolationPlanSha256', 'projectRef']) && SHA40.test(value.sourceSha) && SHA256.test(value.targetBindingSha256) && SHA256.test(value.isolationPlanSha256) && value.projectRef === projectRef;
const timestamp = clock => { const value = clock(); if (!(value instanceof Date) || Number.isNaN(value.getTime())) fail(); return value.toISOString(); };
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) if (Object.hasOwn(descriptor, 'value')) freeze(descriptor.value); Object.freeze(value); } return value; };
const validCapability = value => exact(value, ['managementApiToken', 'fetchImpl', 'sealPriorState', 'dataApiPrerequisite', 'probeExcludedOperatorPooler', 'probeOperatorPooler', 'establishRealtimeSubscription', 'collectPlatformIsolationReadback', 'clock']) && typeof value.managementApiToken === 'string' && value.managementApiToken.length > 0 && value.managementApiToken.length <= 4096 && !/[\r\n]/u.test(value.managementApiToken) && ['fetchImpl', 'sealPriorState', 'dataApiPrerequisite', 'probeExcludedOperatorPooler', 'probeOperatorPooler', 'establishRealtimeSubscription', 'collectPlatformIsolationReadback', 'clock'].every(name => typeof value[name] === 'function');
const endpoint = (projectRef, path) => `https://api.supabase.com/v1/projects/${projectRef}/${path}`;
const uint8Chunk = value => Object.prototype.toString.call(value) === '[object Uint8Array]' && Number.isSafeInteger(value.byteLength) && value.byteLength >= 0;

async function cancel(response) { try { await response?.body?.cancel?.(); } catch { /* response residue is intentionally suppressed */ } }
async function withReader(response, signal, consume) {
  const reader = response?.body?.getReader?.();
  if (!reader) return consume(null);
  let complete = false;
  let abortListener;
  try {
    if (signal.aborted) fail();
    const aborted = new Promise(resolve => { abortListener = () => resolve({ aborted: true }); signal.addEventListener('abort', abortListener, { once: true }); });
    while (true) {
      const next = await Promise.race([reader.read().then(result => ({ result })), aborted]);
      if (next.aborted) fail();
      if (next.result.done) { complete = true; break; }
      if (!uint8Chunk(next.result.value)) fail();
      consume(next.result.value);
    }
    return consume();
  } catch { fail(); } finally {
    if (!complete) try { await reader.cancel?.(); } catch { /* uncertain response remains refused */ }
    try { reader.releaseLock?.(); } catch { /* suppressed */ }
    if (abortListener) signal.removeEventListener('abort', abortListener);
  }
}
async function readJson(response, signal) {
  const chunks = []; let total = 0;
  const value = await withReader(response, signal, chunk => {
    if (chunk) { total += chunk.byteLength; if (total > PRODUCTION_ISOLATION_LIVE_ADAPTER_MAX_RESPONSE_BYTES) fail(); chunks.push(chunk); return undefined; }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const item of chunks) { bytes.set(item, offset); offset += item.byteLength; }
    chunks.fill(null);
    try { const parsed = JSON.parse(new TextDecoder().decode(bytes)); if (!plainJson(parsed)) fail(); return parsed; } catch { fail(); } finally { bytes.fill(0); }
  });
  return value;
}
async function requireEmptyCompleteBody(response, signal) {
  if (response.body === null) return;
  let bytes = 0;
  await withReader(response, signal, chunk => { if (chunk) { bytes += chunk.byteLength; if (bytes !== 0) fail(); } });
  if (bytes !== 0) fail();
}
function validateRequest(request, projectRef) {
  if (!exact(request, ['context', 'method', 'path', 'body', 'timeoutMs', 'signal']) || !validContext(request.context, projectRef) || request.timeoutMs !== 20_000 || !validSignal(request.signal)) fail();
  const matches = expected => plainJson(request.body) && Object.keys(request.body).length === Object.keys(expected).length && Object.entries(expected).every(([key, value]) => request.body[key] === value);
  const network = plainJson(request.body) && Object.keys(request.body).length === 2 && Array.isArray(request.body.dbAllowedCidrs) && request.body.dbAllowedCidrs.length === 1 && typeof request.body.dbAllowedCidrs[0] === 'string' && /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\/32$/u.test(request.body.dbAllowedCidrs[0]) && Array.isArray(request.body.dbAllowedCidrsV6) && request.body.dbAllowedCidrsV6.length === 0;
  if ((request.method === 'PATCH' && request.path === 'postgrest' && matches({ db_schema: '' })) || (request.method === 'GET' && request.path === 'postgrest' && matches({})) || (request.method === 'PATCH' && request.path === 'config/realtime' && matches({ suspend: true })) || (request.method === 'GET' && request.path === 'config/realtime' && matches({})) || (request.method === 'POST' && request.path === 'config/realtime/shutdown' && matches({})) || (request.method === 'POST' && request.path === 'network-restrictions/apply' && network)) return;
  fail();
}

/**
 * The host passes one closed capability at installation time. This entry does
 * not accept endpoint, SQL, file-path, operation, transport, or credential
 * selection from isolation callers.
 */
export function createFixedProductionIsolationLiveAdapters({ projectRef, hostCapability } = {}) {
  if (!PROJECT_REF.test(projectRef ?? '') || !validCapability(hostCapability)) fail();
  const { managementApiToken, fetchImpl, sealPriorState, dataApiPrerequisite, probeExcludedOperatorPooler, probeOperatorPooler, establishRealtimeSubscription, collectPlatformIsolationReadback, clock } = hostCapability;
  const journal = []; let capturedPriorState = null; let realtimeEstablished = null; let platformReadbackCompleted = false;
  const record = (method, path, requestedAtUtc, responseAtUtc) => journal.push(freeze({ method, path, requestedAtUtc, responseAtUtc }));
  const fixedFetch = async ({ method, path, body, signal }) => {
    if (signal.aborted) fail();
    const requestedAtUtc = timestamp(clock); let response;
    try {
      response = await fetchImpl(endpoint(projectRef, path), { method, redirect: 'error', headers: { Authorization: `Bearer ${managementApiToken}`, Accept: 'application/json', ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }) }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }), signal });
      const responseAtUtc = timestamp(clock);
      if (!response || response.redirected !== false || !Number.isSafeInteger(response.status) || response.status < 100 || response.status > 599 || signal.aborted) fail();
      record(method, path, requestedAtUtc, responseAtUtc);
      return { response, requestedAtUtc, responseAtUtc };
    } catch { await cancel(response); fail(); }
  };
  const fixedGet = async (path, signal) => { const call = await fixedFetch({ method: 'GET', path, body: {}, signal }); if (call.response.status !== 200) { await cancel(call.response); fail(); } return { body: await readJson(call.response, signal), ...call }; };
  const capturePriorState = async ({ context, signal } = {}) => {
    if (!validContext(context, projectRef) || !validSignal(signal) || capturedPriorState !== null) fail();
    const auth = await fixedGet('config/auth', signal); const realtime = await fixedGet('config/realtime', signal); const postgrest = await fixedGet('postgrest', signal); const networkRestrictions = await fixedGet('network-restrictions', signal);
    if (realtime.body.suspend !== false) fail();
    try { realtimeEstablished = await establishRealtimeSubscription({ context, signal, priorRealtimeConfig: realtime.body, priorStateCapturedAtUtc: timestamp(clock) }); } catch { fail(); }
    capturedPriorState = freeze({ auth: auth.body, realtime: realtime.body, postgrest: postgrest.body, networkRestrictions: networkRestrictions.body });
    return capturedPriorState;
  };
  const sealCapturedPriorState = async ({ context, priorState, signal } = {}) => {
    if (!validContext(context, projectRef) || !validSignal(signal) || signal.aborted || capturedPriorState === null || priorState !== capturedPriorState) fail();
    try { return await sealPriorState({ context, priorState }); } catch { fail(); } finally { capturedPriorState = null; }
  };
  const managementRequest = async (request = {}) => {
    validateRequest(request, projectRef);
    if (request.method === 'PATCH' && request.path === 'config/realtime' && realtimeEstablished === null) fail();
    if (request.method === 'POST' && request.path === 'config/realtime/shutdown' && !platformReadbackCompleted) fail();
    const call = await fixedFetch({ method: request.method, path: request.path, body: request.body, signal: request.signal });
    if (request.method === 'PATCH' && request.path === 'config/realtime') { if (call.response.status !== 204) fail(); await requireEmptyCompleteBody(call.response, request.signal); return freeze({ status: 204, body: {} }); }
    if (request.method === 'POST' && request.path === 'config/realtime/shutdown') { if (call.response.status !== 204) fail(); await requireEmptyCompleteBody(call.response, request.signal); return freeze({ status: 204, body: {} }); }
    const body = await readJson(call.response, request.signal);
    if (request.method === 'PATCH' && request.path === 'postgrest') { if (call.response.status !== 200 || !exact(body, ['db_schema']) || body.db_schema !== '') fail(); }
    else if (request.method === 'POST') { if (call.response.status !== 201 || !exact(body, ['status']) || body.status !== 'stored') fail(); }
    else if (call.response.status !== 200) fail();
    if (request.method === 'GET' && request.path === 'config/realtime') {
      if (body.suspend !== true) fail();
      try { await collectPlatformIsolationReadback({ context: request.context, signal: request.signal, configDisabledReadbackAtUtc: call.responseAtUtc }); } catch { fail(); }
      platformReadbackCompleted = true;
    }
    return freeze({ status: call.response.status, body });
  };
  const readNetworkRestrictions = async ({ context, signal } = {}) => {
    if (!validContext(context, projectRef) || !validSignal(signal)) fail(); const { body } = await fixedGet('network-restrictions', signal);
    if (!plainJson(body) || body.status !== 'applied' || !plainJson(body.config) || !Array.isArray(body.config.dbAllowedCidrs) || !Array.isArray(body.config.dbAllowedCidrsV6) || !body.config.dbAllowedCidrs.every(value => typeof value === 'string') || !body.config.dbAllowedCidrsV6.every(value => typeof value === 'string')) fail();
    return freeze({ status: body.status, dbAllowedCidrs: [...body.config.dbAllowedCidrs], dbAllowedCidrsV6: [...body.config.dbAllowedCidrsV6] });
  };
  const hostOnly = handler => async ({ context, signal } = {}) => { if (!validContext(context, projectRef) || !validSignal(signal) || signal.aborted) fail(); try { return await handler({ context, signal }); } catch { fail(); } };
  const getControlJournal = () => freeze({ schemaVersion: 1, kind: 'production-isolation-live-adapter-control-journal', requests: journal.map(entry => ({ ...entry })), realtime: { existingSessionEstablished: realtimeEstablished !== null, configDisableRequestedAtUtc: journal.find(entry => entry.method === 'PATCH' && entry.path === 'config/realtime')?.requestedAtUtc ?? null, configDisableResponseAtUtc: journal.find(entry => entry.method === 'PATCH' && entry.path === 'config/realtime')?.responseAtUtc ?? null, configDisabledReadbackAtUtc: journal.find(entry => entry.method === 'GET' && entry.path === 'config/realtime')?.responseAtUtc ?? null, independentPlatformReadbackCompleted: platformReadbackCompleted, shutdownRequestedAtUtc: journal.find(entry => entry.method === 'POST' && entry.path === 'config/realtime/shutdown')?.requestedAtUtc ?? null, shutdownResponseAtUtc: journal.find(entry => entry.method === 'POST' && entry.path === 'config/realtime/shutdown')?.responseAtUtc ?? null } });
  const adapters = freeze({ capturePriorState, sealPriorState: sealCapturedPriorState, dataApiPrerequisite: hostOnly(dataApiPrerequisite), managementRequest, readNetworkRestrictions, probeExcludedOperatorPooler: hostOnly(probeExcludedOperatorPooler), probeOperatorPooler: hostOnly(probeOperatorPooler) });
  return freeze({ adapters, getControlJournal });
}