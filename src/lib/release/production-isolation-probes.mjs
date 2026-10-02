import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { request as httpsRequest } from 'node:https';
import { isAbsolute } from 'node:path';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { collectProductionPlatformConfig } from './production-platform-config.mjs';
import { productionManagedWriterProfileSha256 } from './production-managed-writer-profiles.mjs';
import { verifyApprovedPsqlExecutable, verifyApprovedSslRootCertificate } from '../../../supabase/verify/verify-production-baseline-catalog.mjs';
import { verifyConfiguredSupabaseTarget } from '../../../supabase/verify/verify-target-binding.mjs';

const SHA40 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MAX_RESPONSE_BYTES = 65_536;
const POOLER_READONLY_SQL = "BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout = '15s'; SELECT 1; ROLLBACK;\n";

export const PRODUCTION_ISOLATION_PROBE_TIMEOUT_MS = 20_000;
export const PRODUCTION_DATA_API_ZERO_ROW_READ_PATH =
  '/rest/v1/employees?select=id&limit=0';
export const PRODUCTION_DATA_API_DENIAL_PATH = '/rest/v1/employees';
export const PRODUCTION_REALTIME_WEBSOCKET_PATH = '/realtime/v1/websocket?vsn=1.0.0';

const fail = () => {
  throw new Error('production_isolation_probe_refused');
};

const exact = (value, keys) => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype &&
  Object.getOwnPropertySymbols(value).length === 0 && Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const canonicalUtc = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
const count = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000;
const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
      if (Object.hasOwn(descriptor, 'value')) deepFreeze(descriptor.value);
    }
    Object.freeze(value);
  }
  return value;
};

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

function redactedHash(value) {
  return createHash('sha256').update(JSON.stringify(canonicalJson(value)), 'utf8').digest('hex');
}

/** Validates the shared binding before any request. It is not an admission. */
export function validateProductionIsolationProbeContext(context) {
  const managed = Object.hasOwn(context ?? {}, 'sourceTree');
  const keys = [
    'sourceSha', 'targetBindingSha256', 'isolationPlanSha256',
    'databaseRoleGraphSha256', 'trustedBackendProfileSha256',
    'priorRealtimeServiceEnabled', 'priorRealtimeConfigSha256',
    ...(managed ? ['sourceTree', 'sourceManifestSha256'] : []),
  ];
  if (!exact(context, keys) || !SHA40.test(context.sourceSha) ||
    ![context.targetBindingSha256, context.isolationPlanSha256, context.databaseRoleGraphSha256,
      context.trustedBackendProfileSha256, context.priorRealtimeConfigSha256].every((value) => SHA256.test(value ?? '')) ||
    typeof context.priorRealtimeServiceEnabled !== 'boolean' ||
    (managed && (!SHA40.test(context.sourceTree) || !SHA256.test(context.sourceManifestSha256)))) fail();
  return deepFreeze({ ...context });
}

function bound(context, kind, capturedAtUtc, fields) {
  if (!canonicalUtc(capturedAtUtc)) fail();
  return deepFreeze({ schemaVersion: 1, kind, sourceSha: context.sourceSha,
    targetBindingSha256: context.targetBindingSha256, isolationPlanSha256: context.isolationPlanSha256,
    capturedAtUtc, ...fields });
}

function trustedHttpsBase(value) {
  let url;
  try { url = new URL(value); } catch { fail(); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
    url.pathname !== '/') fail();
  return url;
}

function trustedSecret(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 4096 || /[\r\n]/u.test(value)) fail();
  return value;
}

function trustedProjectUrl(value) {
  const url = trustedHttpsBase(value);
  if (url.pathname !== '/') fail();
  return url;
}

async function readBoundedJson(response) {
  const reader = response?.body?.getReader?.();
  if (!reader) return null;
  const chunks = [];
  let size = 0;
  let complete = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) { complete = true; break; }
      if (Object.prototype.toString.call(value) !== '[object Uint8Array]') return null;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) return null;
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { return null; } finally { bytes.fill(0); }
  } catch { return null; } finally {
    if (!complete) { try { await reader.cancel?.(); } catch {} }
    try { reader.releaseLock?.(); } catch {}
    chunks.fill(null);
  }
}

async function fixedRequest(fetchImpl, url, options) {
  if (typeof fetchImpl !== 'function') fail();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PRODUCTION_ISOLATION_PROBE_TIMEOUT_MS);
  timer.unref?.();
  try {
    const response = await fetchImpl(url, { ...options, redirect: 'error', signal: controller.signal });
    if (!response || response.redirected !== false || !Number.isSafeInteger(response.status)) {
      clearTimeout(timer);
      return null;
    }
    // The body is part of the proof. The deadline intentionally survives the
    // header read and is cleared only after the caller has consumed/cancelled it.
    return { response, close: () => clearTimeout(timer) };
  } catch { clearTimeout(timer); return null; }
}

/**
 * Redacts and binds an independently collected settings readback. It refuses
 * incomplete observations rather than inferring pause, Data API, or Realtime
 * state from a partial response.
 */
export async function collectProductionPlatformIsolationReadback({
  context, projectRef, token, workspace, environment = process.env, fetchImpl = fetch,
  now = new Date(), clock = () => new Date(),
} = {}) {
  const verified = validateProductionIsolationProbeContext(context);
  const platform = await collectProductionPlatformConfig({ projectRef, token, workspace, environment, fetchImpl, now });
  const auth = platform?.configurations?.auth;
  const realtime = platform?.configurations?.realtime;
  if (!platform?.collectionSucceeded || platform.targetBindingSha256 !== verified.targetBindingSha256 ||
    auth?.allKnownHooksObserved !== true || auth.enabledKnownHookCount !== 0 || auth.unknownHookCount !== 0 ||
    realtime?.suspend !== true) fail();
  const hooks = auth.hooks;
  if (!hooks || Object.values(hooks).some((value) => value !== false)) fail();
  const completedAt = clock();
  if (!(completedAt instanceof Date) || Number.isNaN(completedAt.getTime())) fail();
  return bound(verified, 'production-platform-isolation-observation', completedAt.toISOString(), {
    authHookEnabled: { ...hooks }, unknownAuthHookCount: 0, realtimeSuspended: true,
  });
}

/** Records the known pre-control Realtime state from a complete redacted GET. */
export function bindProductionRealtimePriorState({ context, platformConfig, capturedAtUtc } = {}) {
  const verified = validateProductionIsolationProbeContext(context);
  const realtime = platformConfig?.configurations?.realtime;
  if (platformConfig?.collectionSucceeded !== true || platformConfig.targetBindingSha256 !== verified.targetBindingSha256 ||
    typeof realtime?.suspend !== 'boolean') fail();
  const serviceEnabled = realtime.suspend === false;
  const configSha256 = redactedHash(realtime);
  if (serviceEnabled !== verified.priorRealtimeServiceEnabled || configSha256 !== verified.priorRealtimeConfigSha256) fail();
  return bound(verified, 'production-realtime-prior-state-observation', capturedAtUtc, { serviceEnabled, configSha256 });
}

function validateTriggerInventory(value) {
  if (!exact(value, ['relationExists', 'statementTriggerInventoryComplete', 'enabledStatementTriggerCount']) ||
    value.relationExists !== true || value.statementTriggerInventoryComplete !== true ||
    value.enabledStatementTriggerCount !== 0) fail();
  return value;
}

/**
 * Performs the one fixed zero-row service Data API read. Its caller must
 * obtain `statementTriggerInventory` from the reviewed fixed read-only SQL;
 * this function intentionally cannot supply SQL or a command string.
 */
export async function collectProductionDataApiWriteProbePrerequisite({
  context, apiBaseUrl, serviceRoleKey, fetchImpl = fetch, statementTriggerInventory, clock = () => new Date(),
} = {}) {
  const verified = validateProductionIsolationProbeContext(context);
  const base = trustedHttpsBase(apiBaseUrl);
  const key = trustedSecret(serviceRoleKey);
  const request = await fixedRequest(fetchImpl, new URL(PRODUCTION_DATA_API_ZERO_ROW_READ_PATH, base), {
    method: 'GET', headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!request || request.response.ok !== true || request.response.status < 200 || request.response.status >= 300) {
    try { await request?.response?.body?.cancel?.(); } catch {}
    fail();
  }
  let rows;
  try { rows = await readBoundedJson(request.response); } finally { request.close(); }
  if (!Array.isArray(rows) || rows.length !== 0) fail();
  const inventory = validateTriggerInventory(statementTriggerInventory);
  const completedAt = clock();
  if (!(completedAt instanceof Date) || Number.isNaN(completedAt.getTime())) fail();
  return bound(verified, 'production-data-api-write-probe-prerequisite', completedAt.toISOString(), {
    schema: 'public', relation: 'employees', credentialRole: 'service_role',
    credentialPreflightPassed: true, authenticatedReadAdmissionPassed: true,
    ...inventory,
  });
}

/**
 * Sends the reviewed no-row POST only after Data API is disabled. The response
 * must be the provider's disabled-service identity; timeouts and generic 4xx
 * errors are not converted into a passing receipt.
 */
export async function collectProductionDataApiDenialProbe({
  context, apiBaseUrl, serviceRoleKey, prerequisite, dataApiControl, fetchImpl = fetch, clock = () => new Date(),
} = {}) {
  const verified = validateProductionIsolationProbeContext(context);
  if (!exact(prerequisite, ['schemaVersion', 'kind', 'sourceSha', 'targetBindingSha256', 'isolationPlanSha256', 'capturedAtUtc',
    'schema', 'relation', 'credentialRole', 'credentialPreflightPassed', 'authenticatedReadAdmissionPassed',
    'relationExists', 'statementTriggerInventoryComplete', 'enabledStatementTriggerCount']) ||
    prerequisite.kind !== 'production-data-api-write-probe-prerequisite' || prerequisite.sourceSha !== verified.sourceSha ||
    prerequisite.targetBindingSha256 !== verified.targetBindingSha256 || prerequisite.isolationPlanSha256 !== verified.isolationPlanSha256 ||
    !canonicalUtc(prerequisite.capturedAtUtc) || prerequisite.relationExists !== true ||
    prerequisite.statementTriggerInventoryComplete !== true || prerequisite.enabledStatementTriggerCount !== 0) fail();
  const management = exact(dataApiControl, ['schemaVersion', 'kind', 'sourceSha', 'targetBindingSha256', 'isolationPlanSha256',
    'capturedAtUtc', 'managementApiControlObserved', 'dbSchema', 'otherPostgrestSettingsPreserved', 'dataApiDisabled']) &&
    dataApiControl.kind === 'production-data-api-disable-management-observation' &&
    dataApiControl.managementApiControlObserved === true && dataApiControl.dbSchema === '' &&
    dataApiControl.otherPostgrestSettingsPreserved === true && dataApiControl.dataApiDisabled === true;
  const dashboard = exact(dataApiControl, ['schemaVersion', 'kind', 'sourceSha', 'targetBindingSha256', 'isolationPlanSha256',
    'capturedAtUtc', 'dashboardControlObserved', 'dataApiDisabled']) &&
    dataApiControl.kind === 'production-data-api-disable-observation' && dataApiControl.dashboardControlObserved === true &&
    dataApiControl.dataApiDisabled === true;
  if ((!management && !dashboard) || dataApiControl.sourceSha !== verified.sourceSha ||
    dataApiControl.targetBindingSha256 !== verified.targetBindingSha256 || dataApiControl.isolationPlanSha256 !== verified.isolationPlanSha256 ||
    !canonicalUtc(dataApiControl.capturedAtUtc) || Date.parse(prerequisite.capturedAtUtc) >= Date.parse(dataApiControl.capturedAtUtc)) fail();
  const base = trustedHttpsBase(apiBaseUrl);
  const key = trustedSecret(serviceRoleKey);
  const request = await fixedRequest(fetchImpl, new URL(PRODUCTION_DATA_API_DENIAL_PATH, base), {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Profile': 'public',
      'Content-Type': 'application/json', Accept: 'application/json' }, body: '[]',
  });
  let body;
  try { body = await readBoundedJson(request?.response); } finally { request?.close?.(); }
  if (!request || request.response.status !== 406 || body?.code !== 'PGRST106') fail();
  const completedAt = clock();
  if (!(completedAt instanceof Date) || Number.isNaN(completedAt.getTime()) ||
    Date.parse(completedAt.toISOString()) <= Date.parse(dataApiControl.capturedAtUtc)) fail();
  return bound(verified, 'production-data-api-denial-probe', completedAt.toISOString(), {
    independentFromControlObservation: true, authenticatedWritePathAttempted: true,
    denialCause: 'data-api-disabled', requestDenied: true, writeCommitted: false,
    requestMethod: 'POST', relation: 'employees', contentProfile: 'public',
    requestContentType: 'application/json', requestBody: '[]', httpStatus: 406,
    providerErrorCode: 'PGRST106',
  });
}

/** Converts a reviewed fixed psql trigger inventory to the prerequisite shape. */
export function parseProductionStatementTriggerInventory(output) {
  if (typeof output !== 'string' || Buffer.byteLength(output, 'utf8') > MAX_RESPONSE_BYTES) fail();
  const lines = output.split(/\r?\n/u).filter(Boolean);
  if (lines.length !== 1) fail();
  let value;
  try { value = JSON.parse(lines[0]); } catch { fail(); }
  return deepFreeze(validateTriggerInventory(value));
}

/** Parses only the single aggregate result from the fixed drain SQL. */
export function parseProductionDatabaseDrainSummary(output) {
  if (typeof output !== 'string' || Buffer.byteLength(output, 'utf8') > MAX_RESPONSE_BYTES) fail();
  const lines = output.split(/\r?\n/u).filter(Boolean);
  if (lines.length !== 1) fail();
  let value;
  try { value = JSON.parse(lines[0]); } catch { fail(); }
  const keys = ['allApplicableSessionsObserved', 'applicableApplicationSessionCount', 'inflightWriteCount',
    'preparedApplicationWriteCount', 'existingApplicationSessionCount', 'replicationSlotInventoryComplete',
    'activeReplicationSlotCount', 'subscriptionInventoryComplete', 'enabledSubscriptionCount'];
  if (!exact(value, keys) || value.allApplicableSessionsObserved !== true ||
    value.replicationSlotInventoryComplete !== true || value.subscriptionInventoryComplete !== true ||
    !keys.filter((key) => key.endsWith('Count')).every((key) => count(value[key]))) fail();
  return deepFreeze(value);
}

/**
 * Makes the database receipt only from the full managed-writer collector plus
 * fixed aggregate counters. Unknown or unclassified writers are never hidden.
 */
export function bindProductionPostCleanupDatabaseObservation({
  context, managedWriterObservation, unknownClientBackendCount, unmanagedWritePathCount,
  collectionStartedAtUtc, capturedAtUtc,
} = {}) {
  const verified = validateProductionIsolationProbeContext(context);
  if (!canonicalUtc(collectionStartedAtUtc) || !canonicalUtc(capturedAtUtc) ||
    Date.parse(collectionStartedAtUtc) > Date.parse(capturedAtUtc) || !count(unknownClientBackendCount) ||
    !count(unmanagedWritePathCount) || !exact(managedWriterObservation, [
      'schemaVersion', 'kind', 'environment', 'phase', 'sourceSha', 'sourceTree', 'sourceManifestSha256',
      'targetBindingSha256', 'collectionStartedAtUtc', 'capturedAtUtc', 'cli', 'workers',
      'rawUnknownLoginRoleCount', 'rawUnknownBackendCount', 'otherUnknownLoginRoleCount',
      'otherUnknownBackendCount', 'correlation',
    ])) fail();
  if (managedWriterObservation.sourceSha !== verified.sourceSha ||
    managedWriterObservation.targetBindingSha256 !== verified.targetBindingSha256 ||
    managedWriterObservation.capturedAtUtc > capturedAtUtc || unknownClientBackendCount !== 0 ||
    unmanagedWritePathCount !== 0 || managedWriterObservation.otherUnknownLoginRoleCount !== 0 ||
    managedWriterObservation.otherUnknownBackendCount !== 0 ||
    productionManagedWriterProfileSha256(managedWriterObservation) !== verified.trustedBackendProfileSha256) fail();
  return bound(verified, 'production-database-isolation-observation', capturedAtUtc, {
    collectionStartedAtUtc, databaseRoleGraphSha256: verified.databaseRoleGraphSha256,
    trustedBackendProfileSha256: verified.trustedBackendProfileSha256,
    unknownLoginRoleCount: managedWriterObservation.rawUnknownLoginRoleCount,
    unknownClientBackendCount, unknownBackendCount: managedWriterObservation.rawUnknownBackendCount,
    unmanagedWritePathCount, managedWriterObservation,
  });
}

/** Binds a separate final drain report; it cannot share the database interval. */
export function bindProductionDatabaseDrainObservation({ context, collectionStartedAtUtc, capturedAtUtc, drain } = {}) {
  const verified = validateProductionIsolationProbeContext(context);
  const keys = ['observedAfterControlObservations', 'allApplicableSessionsObserved',
    'applicableApplicationSessionCount', 'inflightWriteCount', 'preparedApplicationWriteCount',
    'existingApplicationSessionCount', 'postBarrierWriteAttemptCount', 'postBarrierWriteSuccessCount',
    'replicationSlotInventoryComplete', 'activeReplicationSlotCount', 'subscriptionInventoryComplete',
    'enabledSubscriptionCount'];
  if (!canonicalUtc(collectionStartedAtUtc) || !canonicalUtc(capturedAtUtc) ||
    Date.parse(collectionStartedAtUtc) > Date.parse(capturedAtUtc) || !exact(drain, keys) ||
    drain.observedAfterControlObservations !== true || drain.allApplicableSessionsObserved !== true ||
    drain.replicationSlotInventoryComplete !== true || drain.subscriptionInventoryComplete !== true ||
    !keys.filter((key) => key.endsWith('Count')).every((key) => count(drain[key])) ||
    drain.applicableApplicationSessionCount !== 0 || drain.inflightWriteCount !== 0 ||
    drain.preparedApplicationWriteCount !== 0 || drain.existingApplicationSessionCount !== 0 ||
    drain.activeReplicationSlotCount !== 0 || drain.enabledSubscriptionCount !== 0 ||
    drain.postBarrierWriteAttemptCount < 1 || drain.postBarrierWriteSuccessCount !== 0) fail();
  return bound(verified, 'production-database-drain-observation', capturedAtUtc, { collectionStartedAtUtc, ...drain });
}

/** One reviewed target/TLS/psql session-pooler read-only transaction. */
export function classifyProductionSessionPoolerProbeResult(result) {
  const stderr = typeof result?.stderr === 'string' ? result.stderr : '';
  const explicitNetworkRefusal = /no pg_hba\.conf entry(?:\s|$)/iu.test(stderr);
  // PostgreSQL appends this encryption state to its HBA refusal; it is not a TLS failure.
  // Remove only that complete line's standard suffix, leaving every other SSL/TLS diagnostic intact.
  const failureDiagnostics = stderr.replace(/^(.*\bno pg_hba\.conf entry[^\r\n]*), SSL encryption[ \t]*\r?$/gimu, '$1');
  const unrelatedFailure = /(?:password|authentication|certificate|ssl|tls|timed?\s*out|connection refused|could not connect|dns|resolve|host not found)/iu.test(failureDiagnostics);
  return Number.isSafeInteger(result?.status) && result.status >= 1 && result.status <= 255 && result.signal === null && !result.error &&
    explicitNetworkRefusal && !unrelatedFailure
    ? 'denied_network_restriction'
    : 'denied_unclassified';
}

export async function probeProductionSessionPoolerReadOnly({
  context, workspace, environment = process.env, clock = () => new Date(),
} = {}) {
  const verified = validateProductionIsolationProbeContext(context);
  if (typeof workspace !== 'string' || !isAbsolute(workspace) || environment !== process.env ||
    environment.EXPECTED_SUPABASE_ENVIRONMENT !== 'production' ||
    environment.SUPABASE_DB_CONNECTION_MODE !== 'session-pooler') fail();
  let url;
  try { url = new URL(environment.SUPABASE_DB_URL); } catch { fail(); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.port ||
    !url.username || !url.password || url.pathname !== '/postgres') fail();
  await verifyConfiguredSupabaseTarget({ workspace, environment });
  const executable = verifyApprovedPsqlExecutable();
  const certificate = verifyApprovedSslRootCertificate();
  const child = {};
  for (const key of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'PATH', 'Path', 'TEMP', 'TMP']) {
    if (typeof environment[key] === 'string') child[key] = environment[key];
  }
  Object.assign(child, {
    PGAPPNAME: 'hr-masterdata-production-isolation-pooler-probe', PGCONNECT_TIMEOUT: '10', PGDATABASE: 'postgres',
    PGHOST: url.hostname, PGPORT: url.port, PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: 'verify-full', PGSSLROOTCERT: certificate,
    PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=30000',
  });
  let result;
  try {
    result = spawnSync(executable, ['--no-psqlrc', '--quiet', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--set', 'VERBOSITY=terse'], {
      cwd: workspace, env: child, input: POOLER_READONLY_SQL, windowsHide: true, encoding: 'utf8',
      timeout: PRODUCTION_ISOLATION_PROBE_TIMEOUT_MS, maxBuffer: MAX_RESPONSE_BYTES,
    });
  } finally { for (const key of Object.keys(child)) delete child[key]; }
  const capturedAt = clock();
  if (!(capturedAt instanceof Date) || Number.isNaN(capturedAt.getTime())) fail();
  if (result?.status === 0 && result.signal == null && !result.error && /(?:^|\r?\n)1(?:\r?\n|$)/u.test(result.stdout ?? '')) {
    return bound(verified, 'production-session-pooler-readonly-probe', capturedAt.toISOString(), {
      outcome: 'succeeded', freshReadOnlyTransactionConfirmed: true,
    });
  }
  return bound(verified, 'production-session-pooler-readonly-probe', capturedAt.toISOString(), {
    outcome: classifyProductionSessionPoolerProbeResult(result),
    freshReadOnlyTransactionConfirmed: false,
  });
}

/** Binds actual pooler attempts to a separately collected complete network readback. */
export function bindProductionSameComputerNetworkObservation({
  context, networkControl, priorPoolerProbe, excludedPoolerProbe, restoredPoolerProbe,
} = {}) {
  const verified = validateProductionIsolationProbeContext(context);
  const controlKeys = ['capturedAtUtc', 'restrictionStatus', 'operatorIpv4AllowlistCount', 'operatorIpv4AllowlistMatches',
    'ipv6AllowlistCount', 'operatorIpv6EgressUnavailable', 'ipv6Verification', 'operatorEgressStable',
    'managementApiRollbackVerified', 'excludedOperatorConfigApplied', 'excludedIpv4AllowlistCount',
    'excludedIpv4AllowlistMatchesReviewedRule', 'excludedIpv6AllowlistCount', 'credentialAndTlsInputsUnchanged',
    'excludedConfigSha256', 'finalConfigSha256', 'excludedConfigObservedAtUtc', 'finalConfigObservedAtUtc'];
  const probeKeys = ['schemaVersion', 'kind', 'sourceSha', 'targetBindingSha256', 'isolationPlanSha256', 'capturedAtUtc', 'outcome', 'freshReadOnlyTransactionConfirmed'];
  if (!exact(networkControl, controlKeys) || ![priorPoolerProbe, excludedPoolerProbe, restoredPoolerProbe].every((probe) => exact(probe, probeKeys)) ||
    ![priorPoolerProbe, excludedPoolerProbe, restoredPoolerProbe].every((probe) => probe.sourceSha === verified.sourceSha &&
      probe.targetBindingSha256 === verified.targetBindingSha256 && probe.isolationPlanSha256 === verified.isolationPlanSha256 &&
      probe.kind === 'production-session-pooler-readonly-probe' && canonicalUtc(probe.capturedAtUtc)) ||
    !canonicalUtc(networkControl.capturedAtUtc) || !canonicalUtc(networkControl.excludedConfigObservedAtUtc) || !canonicalUtc(networkControl.finalConfigObservedAtUtc) ||
    networkControl.restrictionStatus !== 'applied' || networkControl.operatorIpv4AllowlistCount !== 1 ||
    networkControl.operatorIpv4AllowlistMatches !== true || networkControl.ipv6AllowlistCount !== 0 ||
    networkControl.operatorIpv6EgressUnavailable !== true || networkControl.ipv6Verification !== 'applied-policy-only-no-live-probe' ||
    networkControl.operatorEgressStable !== true || networkControl.managementApiRollbackVerified !== true ||
    networkControl.excludedOperatorConfigApplied !== true || networkControl.excludedIpv4AllowlistCount !== 1 ||
    networkControl.excludedIpv4AllowlistMatchesReviewedRule !== true || networkControl.excludedIpv6AllowlistCount !== 0 ||
    networkControl.credentialAndTlsInputsUnchanged !== true || !SHA256.test(networkControl.excludedConfigSha256 ?? '') ||
    !SHA256.test(networkControl.finalConfigSha256 ?? '') || networkControl.excludedConfigSha256 === networkControl.finalConfigSha256 ||
    priorPoolerProbe.outcome !== 'succeeded' || priorPoolerProbe.freshReadOnlyTransactionConfirmed !== true ||
    excludedPoolerProbe.outcome !== 'denied_network_restriction' || excludedPoolerProbe.freshReadOnlyTransactionConfirmed !== false ||
    restoredPoolerProbe.outcome !== 'succeeded' || restoredPoolerProbe.freshReadOnlyTransactionConfirmed !== true ||
    !(Date.parse(priorPoolerProbe.capturedAtUtc) < Date.parse(networkControl.excludedConfigObservedAtUtc) &&
      Date.parse(networkControl.excludedConfigObservedAtUtc) < Date.parse(excludedPoolerProbe.capturedAtUtc) &&
      Date.parse(excludedPoolerProbe.capturedAtUtc) < Date.parse(networkControl.finalConfigObservedAtUtc) &&
      Date.parse(networkControl.finalConfigObservedAtUtc) < Date.parse(restoredPoolerProbe.capturedAtUtc) &&
      Date.parse(restoredPoolerProbe.capturedAtUtc) <= Date.parse(networkControl.capturedAtUtc))) fail();
  return bound(verified, 'production-network-exclusion-control-observation', networkControl.capturedAtUtc, {
    verificationMethod: 'same-computer-exclusion-control', restrictionStatus: 'applied', operatorIpv4AllowlistCount: 1,
    operatorIpv4AllowlistMatches: true, ipv6AllowlistCount: 0, operatorIpv6EgressUnavailable: true,
    ipv6Verification: 'applied-policy-only-no-live-probe', operatorEgressStable: true, managementApiRollbackVerified: true,
    priorPoolerConnectionSucceeded: true, excludedOperatorConfigApplied: true, excludedIpv4AllowlistCount: 1,
    excludedIpv4AllowlistMatchesReviewedRule: true, excludedIpv6AllowlistCount: 0, excludedOperatorPoolerConnectionDenied: true,
    denialCause: 'network-restriction', credentialAndTlsInputsUnchanged: true, restoredOperatorPoolerConnectionSucceeded: true,
    freshReadOnlyTransactionConfirmed: true, excludedConfigSha256: networkControl.excludedConfigSha256,
    finalConfigSha256: networkControl.finalConfigSha256, priorPoolerConnectionAtUtc: priorPoolerProbe.capturedAtUtc,
    excludedConfigObservedAtUtc: networkControl.excludedConfigObservedAtUtc, denialProbeAtUtc: excludedPoolerProbe.capturedAtUtc,
    finalConfigObservedAtUtc: networkControl.finalConfigObservedAtUtc, admissionProbeAtUtc: restoredPoolerProbe.capturedAtUtc,
  });
}

function boundedRealtimeStatus(channel, accepted, clock) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error('realtime_probe_timeout')); }
    }, PRODUCTION_ISOLATION_PROBE_TIMEOUT_MS);
    timer.unref?.();
    channel.subscribe((status) => {
      if (settled) return;
      if (accepted.includes(status)) {
        const at = clock();
        if (!(at instanceof Date) || Number.isNaN(at.getTime())) { settled = true; clearTimeout(timer); reject(new Error('realtime_probe_clock')); return; }
        settled = true; clearTimeout(timer); resolve({ status, atUtc: at.toISOString() });
      } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        settled = true; clearTimeout(timer); reject(new Error('realtime_probe_status_refused'));
      }
    });
  });
}

/**
 * Creates an actual bounded Supabase Realtime client for a pre-control channel
 * admission and a post-control reconnect attempt. It deliberately does not
 * manufacture the separately required provider client-count report or the
 * HTTP 403 provider-error identity.
 */
export function createProductionRealtimeProbeSession({
  context, projectUrl, anonKey, clientFactory = createSupabaseClient, clock = () => new Date(),
} = {}) {
  const verified = validateProductionIsolationProbeContext(context);
  const url = trustedProjectUrl(projectUrl);
  const key = trustedSecret(anonKey);
  if (typeof clientFactory !== 'function' || typeof clock !== 'function') fail();
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { timeout: PRODUCTION_ISOLATION_PROBE_TIMEOUT_MS } };
  const client = clientFactory(url.toString(), key, options);
  const channel = client?.channel?.('hr-masterdata-production-isolation-probe', { config: { broadcast: { ack: false, self: false } } });
  if (!channel?.subscribe || !channel?.unsubscribe || !client?.removeChannel || typeof client?.realtime?.onOpen !== 'function' || typeof client?.realtime?.onClose !== 'function') fail();
  let establishedAtUtc = null;
  let subscriptionAcknowledgedAtUtc = null;
  let disconnectedAtUtc = null;
  let existingCloseResolve = null;
  let existingCloseReject = null;
  let subscribed = false;
  let openResolve = null;
  let openReject = null;
  client.realtime.onOpen(() => {
    if (establishedAtUtc) return;
    const at = clock();
    if (!(at instanceof Date) || Number.isNaN(at.getTime())) { openReject?.(new Error('realtime_probe_clock')); return; }
    establishedAtUtc = at.toISOString();
    if (subscriptionAcknowledgedAtUtc) openResolve?.(undefined);
  });
  client.realtime.onClose(() => {
    if (!establishedAtUtc || disconnectedAtUtc) return;
    const at = clock();
    if (!(at instanceof Date) || Number.isNaN(at.getTime())) {
      existingCloseReject?.(new Error('realtime_probe_clock')); return;
    }
    disconnectedAtUtc = at.toISOString();
    existingCloseResolve?.(undefined);
  });
  return Object.freeze({
    async establishBeforeControl() {
      if (subscribed) fail();
      subscribed = true;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('realtime_probe_timeout')), PRODUCTION_ISOLATION_PROBE_TIMEOUT_MS);
        timer.unref?.();
        existingCloseReject = error => { clearTimeout(timer); reject(error); };
        openResolve = () => { clearTimeout(timer); resolve(undefined); };
        openReject = error => { clearTimeout(timer); reject(error); };
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED' && !subscriptionAcknowledgedAtUtc) {
            const at = clock();
            if (!(at instanceof Date) || Number.isNaN(at.getTime())) { clearTimeout(timer); reject(new Error('realtime_probe_clock')); return; }
            subscriptionAcknowledgedAtUtc = at.toISOString();
            if (establishedAtUtc) { clearTimeout(timer); resolve(undefined); }
          } else if (status === 'CLOSED' && establishedAtUtc && !disconnectedAtUtc) {
            const at = clock();
            if (!(at instanceof Date) || Number.isNaN(at.getTime())) { existingCloseReject?.(new Error('realtime_probe_clock')); return; }
            disconnectedAtUtc = at.toISOString(); existingCloseResolve?.(undefined);
          } else if (['CHANNEL_ERROR', 'TIMED_OUT'].includes(status) && !establishedAtUtc) {
            clearTimeout(timer); reject(new Error('realtime_probe_status_refused'));
          }
        });
      });
      return deepFreeze({ sourceSha: verified.sourceSha, targetBindingSha256: verified.targetBindingSha256,
        isolationPlanSha256: verified.isolationPlanSha256, existingConnectionEstablishedAtUtc: establishedAtUtc,
        existingSubscriptionAcknowledgedAtUtc: subscriptionAcknowledgedAtUtc });
    },
    async waitForServiceDisconnect({ controlStartedAtUtc } = {}) {
      if (!establishedAtUtc || !canonicalUtc(controlStartedAtUtc) || Date.parse(controlStartedAtUtc) <= Date.parse(establishedAtUtc)) fail();
      if (!disconnectedAtUtc) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('realtime_probe_timeout')), PRODUCTION_ISOLATION_PROBE_TIMEOUT_MS);
          timer.unref?.();
          existingCloseResolve = () => { clearTimeout(timer); resolve(undefined); };
          existingCloseReject = (error) => { clearTimeout(timer); reject(error); };
        });
      }
      if (!disconnectedAtUtc || Date.parse(disconnectedAtUtc) <= Date.parse(controlStartedAtUtc)) fail();
      return deepFreeze({ sourceSha: verified.sourceSha, targetBindingSha256: verified.targetBindingSha256,
        isolationPlanSha256: verified.isolationPlanSha256, existingConnectionDisconnectedAtUtc: disconnectedAtUtc,
        existingConnectionDisconnectedByService: true, existingConnectionClosedByCaller: false });
    },
    async verifyReconnectRejected() {
      if (!establishedAtUtc || !disconnectedAtUtc) fail();
      const reconnectClient = clientFactory(url.toString(), key, options);
      const reconnectChannel = reconnectClient?.channel?.('hr-masterdata-production-isolation-probe', { config: { broadcast: { ack: false, self: false } } });
      if (!reconnectChannel?.subscribe || !reconnectChannel?.unsubscribe || !reconnectClient?.removeChannel) fail();
      try {
        await boundedRealtimeStatus(reconnectChannel, ['SUBSCRIBED'], clock);
        fail();
      } catch (error) {
        if (!(error instanceof Error) || error.message !== 'realtime_probe_status_refused') fail();
        const at = clock();
        if (!(at instanceof Date) || Number.isNaN(at.getTime())) fail();
        return deepFreeze({ sourceSha: verified.sourceSha, targetBindingSha256: verified.targetBindingSha256,
          isolationPlanSha256: verified.isolationPlanSha256, reconnectAttemptedAtUtc: at.toISOString(),
          reconnectRejectedByClient: true });
      } finally {
        try { await reconnectChannel.unsubscribe(); } catch {}
        try { await reconnectClient.removeChannel(reconnectChannel); } catch {}
      }
    },
    async close() {
      try { await channel.unsubscribe(); } finally { await client.removeChannel(channel); }
    },
  });
}

/**
 * Performs one fixed, bounded WebSocket upgrade request. A successful upgrade,
 * timeout, transport failure, or an arbitrary body cannot prove shutdown.
 */
export async function probeProductionRealtimeDisabledHandshake({
  context, projectUrl, anonKey, requestImpl = httpsRequest, clock = () => new Date(),
} = {}) {
  const verified = validateProductionIsolationProbeContext(context);
  const base = trustedProjectUrl(projectUrl);
  const key = trustedSecret(anonKey);
  if (typeof requestImpl !== 'function' || typeof clock !== 'function') fail();
  const attemptedAt = clock();
  if (!(attemptedAt instanceof Date) || Number.isNaN(attemptedAt.getTime())) fail();
  const endpoint = new URL(PRODUCTION_REALTIME_WEBSOCKET_PATH, base);
  endpoint.searchParams.set('apikey', key);
  const result = await new Promise((resolve, reject) => {
    let request;
    let settled = false;
    const timer = setTimeout(() => {
      try { request?.destroy?.(); } catch {}
      if (!settled) { settled = true; reject(new Error('realtime_handshake_timeout')); }
    }, PRODUCTION_ISOLATION_PROBE_TIMEOUT_MS);
    timer.unref?.();
    const done = (callback, value) => {
      if (!settled) { settled = true; clearTimeout(timer); callback(value); }
    };
    try {
      request = requestImpl({ protocol: 'https:', hostname: endpoint.hostname, port: endpoint.port || 443,
        method: 'GET', path: `${endpoint.pathname}${endpoint.search}`, headers: {
          Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13',
          'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
        } }, (response) => {
        const chunks = [];
        let size = 0;
        response.on('data', (chunk) => {
          if (!Buffer.isBuffer(chunk) && !(chunk instanceof Uint8Array)) { try { response.destroy?.(); } catch {} done(reject, new Error('realtime_handshake_body')); return; }
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) { try { response.destroy?.(); } catch {} done(reject, new Error('realtime_handshake_body')); }
          else chunks.push(Buffer.from(chunk));
        });
        response.once('error', () => done(reject, new Error('realtime_handshake_transport')));
        response.once('end', () => {
          const body = Buffer.concat(chunks); chunks.length = 0;
          let parsed;
          try { parsed = JSON.parse(body.toString('utf8')); } catch { body.fill(0); done(reject, new Error('realtime_handshake_body')); return; }
          body.fill(0);
          done(resolve, { statusCode: response.statusCode, code: parsed?.code });
        });
      });
      request.once('upgrade', (_response, socket) => { try { socket?.destroy?.(); } catch {} done(reject, new Error('realtime_handshake_unexpected_upgrade')); });
      request.once('error', () => done(reject, new Error('realtime_handshake_transport')));
      request.end();
    } catch { done(reject, new Error('realtime_handshake_transport')); }
  });
  const capturedAt = clock();
  if (!(capturedAt instanceof Date) || Number.isNaN(capturedAt.getTime()) ||
    !exact(result, ['statusCode', 'code']) || result.statusCode !== 403 || result.code !== 'RealtimeDisabledForTenant') fail();
  if (capturedAt.getTime() <= attemptedAt.getTime()) fail();
  return bound(verified, 'production-realtime-disabled-handshake-observation', capturedAt.toISOString(), {
    connectionAttemptedAtUtc: attemptedAt.toISOString(), connectionDeniedAtUtc: capturedAt.toISOString(),
    connectionAttempted: true, connectionDenied: true, writeObserved: false, httpStatus: 403,
    providerErrorCode: 'RealtimeDisabledForTenant', denialCause: 'realtime-disabled-for-tenant',
  });
}

const realtimeBoundKeys = ['schemaVersion', 'kind', 'sourceSha', 'targetBindingSha256', 'isolationPlanSha256'];
const realtimeBound = (value, context, kind, keys) => exact(value, [...realtimeBoundKeys, ...keys]) &&
  value.schemaVersion === 1 && value.kind === kind && value.sourceSha === context.sourceSha &&
  value.targetBindingSha256 === context.targetBindingSha256 && value.isolationPlanSha256 === context.isolationPlanSha256;

/** Binds the exact documented global-service-shutdown branch, without a client-count claim. */
export function bindProductionRealtimeShutdownQuiescenceObservation({
  context, priorState, platformReadback, shutdownControl, existingConnection, reconnectHandshake, capturedAtUtc,
} = {}) {
  const verified = validateProductionIsolationProbeContext(context);
  const priorKeys = ['capturedAtUtc', 'serviceEnabled', 'configSha256'];
  const platformKeys = ['capturedAtUtc', 'authHookEnabled', 'unknownAuthHookCount', 'realtimeSuspended'];
  const controlKeys = ['configDisableRequestedAtUtc', 'configDisableResponseAtUtc', 'configDisableHttpStatus',
    'configDisabledReadbackAtUtc', 'configDisabledReadbackServiceEnabled', 'configDisabledReadbackSha256',
    'shutdownRequestedAtUtc', 'shutdownResponseAtUtc', 'shutdownHttpStatus'];
  const connectionKeys = ['existingConnectionEstablishedAtUtc', 'existingSubscriptionAcknowledgedAtUtc',
    'existingConnectionDisconnectedAtUtc', 'existingConnectionDisconnectedByService', 'existingConnectionClosedByCaller'];
  const handshakeKeys = ['capturedAtUtc', 'connectionAttemptedAtUtc', 'connectionDeniedAtUtc', 'connectionAttempted', 'connectionDenied', 'writeObserved', 'httpStatus', 'providerErrorCode', 'denialCause'];
  if (!realtimeBound(priorState, verified, 'production-realtime-prior-state-observation', priorKeys) ||
    !canonicalUtc(priorState.capturedAtUtc) || priorState.serviceEnabled !== verified.priorRealtimeServiceEnabled ||
    priorState.configSha256 !== verified.priorRealtimeConfigSha256 ||
    !realtimeBound(platformReadback, verified, 'production-platform-isolation-observation', platformKeys) ||
    !canonicalUtc(platformReadback.capturedAtUtc) || platformReadback.realtimeSuspended !== true ||
    !realtimeBound(shutdownControl, verified, 'production-realtime-shutdown-control-observation', controlKeys) ||
    shutdownControl.configDisableHttpStatus !== 204 || shutdownControl.configDisabledReadbackServiceEnabled !== false ||
    !SHA256.test(shutdownControl.configDisabledReadbackSha256 ?? '') || shutdownControl.shutdownHttpStatus !== 204 ||
    !exact(existingConnection, ['sourceSha', 'targetBindingSha256', 'isolationPlanSha256', ...connectionKeys]) ||
    existingConnection.sourceSha !== verified.sourceSha || existingConnection.targetBindingSha256 !== verified.targetBindingSha256 ||
    existingConnection.isolationPlanSha256 !== verified.isolationPlanSha256 || existingConnection.existingConnectionClosedByCaller !== false ||
    !realtimeBound(reconnectHandshake, verified, 'production-realtime-disabled-handshake-observation', handshakeKeys) ||
    !canonicalUtc(reconnectHandshake.capturedAtUtc) || !canonicalUtc(reconnectHandshake.connectionAttemptedAtUtc) ||
    reconnectHandshake.connectionDeniedAtUtc !== reconnectHandshake.capturedAtUtc || Date.parse(reconnectHandshake.connectionAttemptedAtUtc) >= Date.parse(reconnectHandshake.capturedAtUtc) || reconnectHandshake.connectionAttempted !== true ||
    reconnectHandshake.connectionDenied !== true || reconnectHandshake.writeObserved !== false || reconnectHandshake.httpStatus !== 403 ||
    reconnectHandshake.providerErrorCode !== 'RealtimeDisabledForTenant' || reconnectHandshake.denialCause !== 'realtime-disabled-for-tenant' ||
    !canonicalUtc(capturedAtUtc)) fail();
  const controlTimes = [shutdownControl.configDisableRequestedAtUtc, shutdownControl.configDisableResponseAtUtc,
    shutdownControl.configDisabledReadbackAtUtc, shutdownControl.shutdownRequestedAtUtc, shutdownControl.shutdownResponseAtUtc,
    reconnectHandshake.connectionAttemptedAtUtc, reconnectHandshake.capturedAtUtc, capturedAtUtc];
  if (!controlTimes.every(canonicalUtc) || controlTimes.some((time, index) => index > 0 && Date.parse(time) <= Date.parse(controlTimes[index - 1])) ||
    Date.parse(priorState.capturedAtUtc) >= Date.parse(controlTimes[0]) || Date.parse(platformReadback.capturedAtUtc) < Date.parse(controlTimes[2]) ||
    Date.parse(platformReadback.capturedAtUtc) >= Date.parse(controlTimes[3])) fail();
  if (!verified.priorRealtimeServiceEnabled) {
    if (existingConnection.existingConnectionEstablishedAtUtc !== null || existingConnection.existingSubscriptionAcknowledgedAtUtc !== null ||
      existingConnection.existingConnectionDisconnectedAtUtc !== null || existingConnection.existingConnectionDisconnectedByService !== false) fail();
  } else {
    const connectionTimes = [existingConnection.existingConnectionEstablishedAtUtc, existingConnection.existingSubscriptionAcknowledgedAtUtc, existingConnection.existingConnectionDisconnectedAtUtc];
    if (existingConnection.existingConnectionDisconnectedByService !== true || !connectionTimes.every(canonicalUtc) ||
      !(Date.parse(priorState.capturedAtUtc) < Date.parse(connectionTimes[0]) && Date.parse(connectionTimes[0]) < Date.parse(connectionTimes[1]) &&
        Date.parse(connectionTimes[1]) < Date.parse(controlTimes[0]) && Date.parse(controlTimes[0]) < Date.parse(connectionTimes[2]) &&
        Date.parse(connectionTimes[2]) < Date.parse(controlTimes[5]))) fail();
  }
  return bound(verified, 'production-realtime-shutdown-quiescence-observation', capturedAtUtc, {
    independentFromControlObservation: true, controlMethod: 'supabase-management-api-realtime-disable-and-shutdown',
    priorRealtimeServiceEnabled: verified.priorRealtimeServiceEnabled,
    configDisableRequestedAtUtc: shutdownControl.configDisableRequestedAtUtc, configDisableResponseAtUtc: shutdownControl.configDisableResponseAtUtc,
    configDisableHttpStatus: 204, configDisabledReadbackAtUtc: shutdownControl.configDisabledReadbackAtUtc,
    configDisabledReadbackServiceEnabled: false, configDisabledReadbackSha256: shutdownControl.configDisabledReadbackSha256,
    shutdownRequestedAtUtc: shutdownControl.shutdownRequestedAtUtc, shutdownResponseAtUtc: shutdownControl.shutdownResponseAtUtc,
    shutdownHttpStatus: 204, existingConnectionEstablishedBeforeIsolation: verified.priorRealtimeServiceEnabled,
    existingSubscriptionAcknowledgedBeforeIsolation: verified.priorRealtimeServiceEnabled,
    existingConnectionDisconnectedByService: verified.priorRealtimeServiceEnabled, existingConnectionClosedByCaller: false,
    existingConnectionEstablishedAtUtc: existingConnection.existingConnectionEstablishedAtUtc,
    existingSubscriptionAcknowledgedAtUtc: existingConnection.existingSubscriptionAcknowledgedAtUtc,
    existingConnectionDisconnectedAtUtc: existingConnection.existingConnectionDisconnectedAtUtc,
    reconnectAttemptedAtUtc: reconnectHandshake.connectionAttemptedAtUtc, reconnectDeniedAtUtc: reconnectHandshake.capturedAtUtc,
    connectionAttempted: true, connectionDenied: true, writeObserved: false, httpStatus: 403,
    providerErrorCode: 'RealtimeDisabledForTenant', denialCause: 'realtime-disabled-for-tenant',
  });
}
