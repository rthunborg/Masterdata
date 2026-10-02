const SHA40 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const PROJECT_REF = /^[a-z0-9]{20}$/u;

export const PRODUCTION_ISOLATION_CONTROL_TIMEOUT_MS = 20_000;
export const PRODUCTION_ISOLATION_NETWORK_POLL_INTERVAL_MS = 1_000;
export const PRODUCTION_TEMPORARY_ISOLATION_UNCERTAIN = 'production_temporary_isolation_uncertain';

const fail = () => {
  const error = new Error('Production temporary isolation refused');
  error.code = PRODUCTION_TEMPORARY_ISOLATION_UNCERTAIN;
  throw error;
};

const exact = (value, keys) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.getOwnPropertySymbols(value).length === 0 &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable === true && Object.hasOwn(descriptor, 'value');
  });

const canonicalUtc = (value) =>
  typeof value === 'string' &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
      if (Object.hasOwn(descriptor, 'value')) deepFreeze(descriptor.value);
    }
    Object.freeze(value);
  }
  return value;
};

const plainJson = (value) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length !== 0) {
    return false;
  }
  return Object.values(Object.getOwnPropertyDescriptors(value)).every(
    (descriptor) => descriptor.enumerable === true && Object.hasOwn(descriptor, 'value')
  );
};

const sameJson = (left, right) => {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((entry, index) => sameJson(entry, right[index]));
  }
  if (!plainJson(left) || !plainJson(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && sameJson(left[key], right[key]));
};

const time = (now) => {
  const value = now();
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) fail();
  return value.toISOString();
};

const bounded = async (adapter, argument, { setTimer, clearTimer }) => {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimer(() => {
    timedOut = true;
    controller.abort();
  }, PRODUCTION_ISOLATION_CONTROL_TIMEOUT_MS);
  try {
    // The adapter owns the actual transport and must reject only after its
    // aborted request has settled. The runner never races an uncertain write
    // with a later control or restoration step.
    const result = await adapter({ ...argument, signal: controller.signal });
    if (timedOut) fail();
    return result;
  } finally {
    clearTimer(timer);
  }
};

const validContext = (value) => exact(value, [
  'sourceSha', 'targetBindingSha256', 'isolationPlanSha256', 'projectRef',
]) && SHA40.test(value.sourceSha) && SHA256.test(value.targetBindingSha256) &&
  SHA256.test(value.isolationPlanSha256) && PROJECT_REF.test(value.projectRef);

const validAdmission = (value, context) => exact(value, [
  'schemaVersion', 'kind', 'sourceSha', 'targetBindingSha256', 'isolationPlanSha256',
  'operatorIpv4Cidr', 'exclusionIpv4Cidr', 'operatorIpv6EgressUnavailable',
]) && value.schemaVersion === 1 && value.kind === 'production-temporary-isolation-admission' &&
  value.sourceSha === context.sourceSha && value.targetBindingSha256 === context.targetBindingSha256 &&
  value.isolationPlanSha256 === context.isolationPlanSha256 &&
  /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\/32$/u.test(value.operatorIpv4Cidr) &&
  /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\/32$/u.test(value.exclusionIpv4Cidr) &&
  value.exclusionIpv4Cidr !== value.operatorIpv4Cidr && value.exclusionIpv4Cidr !== '0.0.0.0/32' &&
  value.operatorIpv6EgressUnavailable === true;

const validAdapters = (value) => exact(value, [
  'capturePriorState', 'sealPriorState', 'dataApiPrerequisite', 'managementRequest',
  'readNetworkRestrictions', 'probeExcludedOperatorPooler', 'probeOperatorPooler',
]) && Object.values(value).every((adapter) => typeof adapter === 'function');

const managementResponse = (value, status, body) =>
  exact(value, ['status', 'body']) && value.status === status && sameJson(value.body, body);

const isNetworkAccepted = (value) => managementResponse(value, 201, { status: 'stored' }) ||
  managementResponse(value, 201, { status: 'applied' });

const hasOnlyDbSchemaChanged = (prior, current) => {
  if (!plainJson(prior) || !plainJson(current) || current.db_schema !== '') return false;
  const expected = { ...prior, db_schema: '' };
  return sameJson(expected, current);
};

const validPriorState = (value) => exact(value, ['auth', 'realtime', 'postgrest', 'networkRestrictions']) &&
  Object.values(value).every(plainJson);

const validSealedPriorState = (value, context) => exact(value, [
  'schemaVersion', 'kind', 'sourceSha', 'targetBindingSha256', 'isolationPlanSha256',
  'capturedAtUtc', 'encrypted', 'immutable', 'ciphertextSha256',
]) && value.schemaVersion === 1 && value.kind === 'production-isolation-prior-state-sealed' &&
  value.sourceSha === context.sourceSha && value.targetBindingSha256 === context.targetBindingSha256 &&
  value.isolationPlanSha256 === context.isolationPlanSha256 && canonicalUtc(value.capturedAtUtc) &&
  value.encrypted === true && value.immutable === true && SHA256.test(value.ciphertextSha256);

const validPrerequisite = (value) => exact(value, [
  'authenticatedReadAdmissionPassed', 'relationExists', 'statementTriggerInventoryComplete',
  'enabledStatementTriggerCount',
]) && value.authenticatedReadAdmissionPassed === true && value.relationExists === true &&
  value.statementTriggerInventoryComplete === true && value.enabledStatementTriggerCount === 0;

const validNetworkReadback = (value, ipv4) => exact(value, ['status', 'dbAllowedCidrs', 'dbAllowedCidrsV6']) &&
  value.status === 'applied' && Array.isArray(value.dbAllowedCidrs) &&
  value.dbAllowedCidrs.length === 1 && value.dbAllowedCidrs[0] === ipv4 &&
  Array.isArray(value.dbAllowedCidrsV6) && value.dbAllowedCidrsV6.length === 0;

const validNetworkConfig = (value) => plainJson(value) &&
  Array.isArray(value.dbAllowedCidrs) && value.dbAllowedCidrs.every(cidr => typeof cidr === 'string') &&
  Array.isArray(value.dbAllowedCidrsV6) && value.dbAllowedCidrsV6.every(cidr => typeof cidr === 'string');

const sameNetworkConfig = (left, right) => sameJson(left.dbAllowedCidrs, right.dbAllowedCidrs) &&
  sameJson(left.dbAllowedCidrsV6, right.dbAllowedCidrsV6);

const pollDelay = (signal, { setTimer, clearTimer }) => new Promise((resolve, reject) => {
  if (signal.aborted) { reject(new Error('Network propagation uncertain')); return; }
  let timer;
  const abort = () => { clearTimer(timer); reject(new Error('Network propagation uncertain')); };
  signal.addEventListener('abort', abort, { once: true });
  timer = setTimer(() => { signal.removeEventListener('abort', abort); resolve(); },
    PRODUCTION_ISOLATION_NETWORK_POLL_INTERVAL_MS);
});

const waitForExactNetworkApplied = (adapter, context, ipv4, previousConfigs, timers) =>
  bounded(async ({ signal }) => {
    for (let poll = 0; poll < 20 && !signal.aborted; poll++) {
      // One controller/deadline covers all sequential reads and delays. A
      // pending GET must settle after abort before any recovery POST begins.
      const value = await adapter({ context, signal });
      if (signal.aborted) fail();
      if (validNetworkReadback(value, ipv4)) return value;
      if (!exact(value, ['status', 'dbAllowedCidrs', 'dbAllowedCidrsV6']) ||
          !validNetworkConfig(value)) fail();
      const requested = { dbAllowedCidrs: [ipv4], dbAllowedCidrsV6: [] };
      const pendingRequested = value.status === 'stored' && sameNetworkConfig(value, requested);
      // A stale applied read is retryable only for the exact captured prior or
      // our own exclusion profile. Arbitrary changed configurations are refused.
      const previousApplied = value.status === 'applied' &&
        previousConfigs.some(previous => sameNetworkConfig(value, previous));
      if (!pendingRequested && !previousApplied) fail();
      await pollDelay(signal, timers);
    }
    fail();
  }, {}, timers);

const validExclusionProbe = (value) => exact(value, ['denied', 'denialCause']) &&
  value.denied === true && value.denialCause === 'network-restriction';

const validOperatorProbe = (value) => exact(value, ['succeeded', 'readOnlyTransactionConfirmed']) &&
  value.succeeded === true && value.readOnlyTransactionConfirmed === true;

const bind = (context, capturedAtUtc, values) => deepFreeze({
  schemaVersion: 1,
  sourceSha: context.sourceSha,
  targetBindingSha256: context.targetBindingSha256,
  isolationPlanSha256: context.isolationPlanSha256,
  capturedAtUtc,
  ...values,
});

/**
 * Executes only the reviewed temporary production isolation controls.  It has
 * no database command path and intentionally returns control evidence rather
 * than an isolation or release decision.  The installed worker supplies the
 * trusted adapters; tests may inject synthetic adapters directly here.
 */
export async function runProductionTemporaryIsolationControls({
  context,
  admission,
  adapters,
  now = () => new Date(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  if (!validContext(context) || !validAdmission(admission, context) || !validAdapters(adapters) ||
      typeof now !== 'function' || typeof setTimer !== 'function' || typeof clearTimer !== 'function') fail();
  const invoke = (adapter, argument) => bounded(adapter, argument, { setTimer, clearTimer });

  try {

  const priorState = await invoke(adapters.capturePriorState, { context });
  if (!validPriorState(priorState)) fail();
  const priorNetworkConfig = priorState.networkRestrictions.config ?? priorState.networkRestrictions;
  if (!validNetworkConfig(priorNetworkConfig)) fail();
  const sealedPriorState = await invoke(adapters.sealPriorState, { context, priorState });
  if (!validSealedPriorState(sealedPriorState, context)) fail();

  const prerequisite = await invoke(adapters.dataApiPrerequisite, { context });
  if (!validPrerequisite(prerequisite)) fail();

  const dataApiControl = await invoke(adapters.managementRequest, {
    context, method: 'PATCH', path: 'postgrest', body: { db_schema: '' },
    timeoutMs: PRODUCTION_ISOLATION_CONTROL_TIMEOUT_MS,
  });
  if (!managementResponse(dataApiControl, 200, { db_schema: '' })) fail();
  const postgrestReadback = await invoke(adapters.managementRequest, {
    context, method: 'GET', path: 'postgrest', body: {},
    timeoutMs: PRODUCTION_ISOLATION_CONTROL_TIMEOUT_MS,
  });
  if (postgrestReadback?.status !== 200 || !hasOnlyDbSchemaChanged(priorState.postgrest, postgrestReadback.body)) fail();
  const dataApiControlObservedAtUtc = time(now);

  const realtimeControl = await invoke(adapters.managementRequest, {
    context, method: 'PATCH', path: 'config/realtime', body: { suspend: true },
    timeoutMs: PRODUCTION_ISOLATION_CONTROL_TIMEOUT_MS,
  });
  if (!managementResponse(realtimeControl, 204, {})) fail();
  const realtimeReadback = await invoke(adapters.managementRequest, {
    context, method: 'GET', path: 'config/realtime', body: {},
    timeoutMs: PRODUCTION_ISOLATION_CONTROL_TIMEOUT_MS,
  });
  if (realtimeReadback?.status !== 200 || !plainJson(realtimeReadback.body) || realtimeReadback.body.suspend !== true) fail();
  const realtimeShutdown = await invoke(adapters.managementRequest, {
    context, method: 'POST', path: 'config/realtime/shutdown', body: {},
    timeoutMs: PRODUCTION_ISOLATION_CONTROL_TIMEOUT_MS,
  });
  if (!managementResponse(realtimeShutdown, 204, {})) fail();
  const realtimeControlObservedAtUtc = time(now);

  let exclusionAttempted = false;
  let operatorRestored = false;
  let exclusionProbe;
  try {
    // The endpoint can apply a request before a malformed response or timeout
    // reaches this process. From dispatch onward, restore the exact operator
    // ingress profile before surfacing an uncertain outcome.
    exclusionAttempted = true;
    const exclusionControl = await invoke(adapters.managementRequest, {
      context, method: 'POST', path: 'network-restrictions/apply',
      body: { dbAllowedCidrs: [admission.exclusionIpv4Cidr], dbAllowedCidrsV6: [] },
      timeoutMs: PRODUCTION_ISOLATION_CONTROL_TIMEOUT_MS,
    });
    if (!isNetworkAccepted(exclusionControl)) fail();
    await waitForExactNetworkApplied(adapters.readNetworkRestrictions,
      context, admission.exclusionIpv4Cidr, [priorNetworkConfig], { setTimer, clearTimer });
    exclusionProbe = await invoke(adapters.probeExcludedOperatorPooler, { context });
    if (!validExclusionProbe(exclusionProbe)) fail();
  } finally {
    if (exclusionAttempted) {
      const operatorControl = await invoke(adapters.managementRequest, {
        context, method: 'POST', path: 'network-restrictions/apply',
        body: { dbAllowedCidrs: [admission.operatorIpv4Cidr], dbAllowedCidrsV6: [] },
        timeoutMs: PRODUCTION_ISOLATION_CONTROL_TIMEOUT_MS,
      });
      if (!isNetworkAccepted(operatorControl)) fail();
      await waitForExactNetworkApplied(adapters.readNetworkRestrictions,
        context, admission.operatorIpv4Cidr,
        [priorNetworkConfig, { dbAllowedCidrs: [admission.exclusionIpv4Cidr], dbAllowedCidrsV6: [] }],
        { setTimer, clearTimer });
      operatorRestored = true;
    }
  }
  if (!operatorRestored) fail();
  const operatorProbe = await invoke(adapters.probeOperatorPooler, { context });
  if (!validOperatorProbe(operatorProbe)) fail();
  const networkControlObservedAtUtc = time(now);

  return bind(context, time(now), {
    kind: 'production-temporary-isolation-controls',
    controlEvidenceOnly: true,
    priorState: sealedPriorState,
    dataApi: { capturedAtUtc: dataApiControlObservedAtUtc, prerequisiteAccepted: true, dbSchemaDisabled: true, otherPostgrestSettingsPreserved: true },
    realtime: { capturedAtUtc: realtimeControlObservedAtUtc, suspended: true, shutdownAcknowledged: true },
    network: {
      capturedAtUtc: networkControlObservedAtUtc,
      exclusionApplied: true,
      exclusionReadbackAccepted: true,
      exclusionDenialProved: true,
      operatorOnlyApplied: true,
      operatorReadbackAccepted: true,
      operatorReadOnlyAdmissionProved: true,
    },
  });
  } catch {
    fail();
  }
}
