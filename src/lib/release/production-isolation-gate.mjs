const SHA40 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MAX_EVIDENCE_AGE_MS = 15 * 60 * 1000;

export const PRODUCTION_ISOLATION_AUTH_HOOKS = Object.freeze([
  'hook_custom_access_token_enabled',
  'hook_mfa_verification_attempt_enabled',
  'hook_password_verification_attempt_enabled',
  'hook_send_sms_enabled',
  'hook_send_email_enabled',
  'hook_before_user_created_enabled',
  'hook_after_user_created_enabled',
]);

const blocked = (reason) =>
  Object.freeze({
    schemaVersion: 1,
    kind: 'production-maintenance-isolation-assessment',
    disposition: 'blocked_insufficient_isolation_proof',
    reason,
  });

const proven = () =>
  Object.freeze({
    schemaVersion: 1,
    kind: 'production-maintenance-isolation-assessment',
    disposition: 'isolation_proved_not_execution_authority',
    reason: 'fresh_bound_independent_controls_and_drain_proven',
  });

const plainObject = (value, keys) => {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    return false;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const names = Object.getOwnPropertyNames(value);
  return (
    names.length === keys.length &&
    keys.every(
      (key) =>
        Object.hasOwn(descriptors, key) &&
        descriptors[key].enumerable === true &&
        Object.hasOwn(descriptors[key], 'value')
    )
  );
};

const plainObjectWithAllowedKeys = (value, allowedKeys) => {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Object.getOwnPropertyNames(value).every(
    (key) =>
      allowedKeys.includes(key) &&
      descriptors[key].enumerable === true &&
      Object.hasOwn(descriptors[key], 'value')
  );
};

const canonicalUtc = (value) => {
  if (typeof value !== 'string') return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value
    ? milliseconds
    : null;
};

const nonNegativeInteger = (value) =>
  Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000;

const exactFalseMap = (value, keys) =>
  plainObject(value, keys) && keys.every((key) => value[key] === false);

function inspectContext(value) {
  if (
    !plainObject(value, [
      'sourceSha',
      'targetBindingSha256',
      'isolationPlanSha256',
      'databaseRoleGraphSha256',
      'trustedBackendProfileSha256',
    ]) ||
    !SHA40.test(value.sourceSha) ||
    !SHA256.test(value.targetBindingSha256) ||
    !SHA256.test(value.isolationPlanSha256) ||
    !SHA256.test(value.databaseRoleGraphSha256) ||
    !SHA256.test(value.trustedBackendProfileSha256)
  ) {
    return null;
  }
  return Object.freeze({ ...value });
}

function inspectBoundReceipt(value, kind, extraKeys) {
  const keys = [
    'schemaVersion',
    'kind',
    'sourceSha',
    'targetBindingSha256',
    'isolationPlanSha256',
    'capturedAtUtc',
    ...extraKeys,
  ];
  if (
    !plainObject(value, keys) ||
    value.schemaVersion !== 1 ||
    value.kind !== kind ||
    !SHA40.test(value.sourceSha) ||
    !SHA256.test(value.targetBindingSha256) ||
    !SHA256.test(value.isolationPlanSha256)
  ) {
    return null;
  }
  const capturedAt = canonicalUtc(value.capturedAtUtc);
  return capturedAt === null ? null : Object.freeze({ ...value, capturedAt });
}

function matchesContext(receipt, context) {
  return (
    receipt.sourceSha === context.sourceSha &&
    receipt.targetBindingSha256 === context.targetBindingSha256 &&
    receipt.isolationPlanSha256 === context.isolationPlanSha256
  );
}

function inspectPause(value) {
  const receipt = inspectBoundReceipt(value, 'production-pause-isolation-observation', [
    'pauseDeploymentMatches',
    'automaticDomainAssignmentDisabled',
    'activeCronCount',
  ]);
  return receipt &&
    receipt.pauseDeploymentMatches === true &&
    receipt.automaticDomainAssignmentDisabled === true &&
    receipt.activeCronCount === 0
    ? receipt
    : null;
}

function inspectEdgeFunctions(value) {
  const receipt = inspectBoundReceipt(value, 'production-edge-functions-isolation-observation', [
    'edgeFunctionCount',
  ]);
  return receipt && receipt.edgeFunctionCount === 0 ? receipt : null;
}

function inspectPlatform(value) {
  const receipt = inspectBoundReceipt(value, 'production-platform-isolation-observation', [
    'authHookEnabled',
    'unknownAuthHookCount',
    'realtimeSuspended',
  ]);
  return receipt &&
    exactFalseMap(receipt.authHookEnabled, PRODUCTION_ISOLATION_AUTH_HOOKS) &&
    receipt.unknownAuthHookCount === 0 &&
    receipt.realtimeSuspended === true
    ? receipt
    : null;
}

function inspectRealtimeProbe(value) {
  const receipt = inspectBoundReceipt(value, 'production-realtime-denial-probe', [
    'independentFromControlObservation',
    'connectionAttempted',
    'connectionDenied',
    'writeObserved',
  ]);
  return receipt &&
    receipt.independentFromControlObservation === true &&
    receipt.connectionAttempted === true &&
    receipt.connectionDenied === true &&
    receipt.writeObserved === false
    ? receipt
    : null;
}

function inspectDataApi(value) {
  const receipt = inspectBoundReceipt(value, 'production-data-api-disable-observation', [
    'dashboardControlObserved',
    'dataApiDisabled',
  ]);
  return receipt &&
    receipt.dashboardControlObserved === true &&
    receipt.dataApiDisabled === true
    ? receipt
    : null;
}

function inspectDataApiProbe(value) {
  const receipt = inspectBoundReceipt(value, 'production-data-api-denial-probe', [
    'independentFromControlObservation',
    'authenticatedWritePathAttempted',
    'requestDenied',
    'writeCommitted',
  ]);
  return receipt &&
    receipt.independentFromControlObservation === true &&
    receipt.authenticatedWritePathAttempted === true &&
    receipt.requestDenied === true &&
    receipt.writeCommitted === false
    ? receipt
    : null;
}

function inspectNetwork(value) {
  const receipt = inspectBoundReceipt(value, 'production-network-isolation-observation', [
    'restrictionStatus',
    'runnerIpv4Only',
    'runnerIpv6Only',
    'unrestrictedIpv4',
    'unrestrictedIpv6',
    'nonRunnerIpv4ProbeDenied',
    'nonRunnerIpv6ProbeDenied',
  ]);
  return receipt &&
    receipt.restrictionStatus === 'applied' &&
    receipt.runnerIpv4Only === true &&
    receipt.runnerIpv6Only === true &&
    receipt.unrestrictedIpv4 === false &&
    receipt.unrestrictedIpv6 === false &&
    receipt.nonRunnerIpv4ProbeDenied === true &&
    receipt.nonRunnerIpv6ProbeDenied === true
    ? receipt
    : null;
}

function inspectDatabase(value, context) {
  const receipt = inspectBoundReceipt(value, 'production-database-isolation-observation', [
    'databaseRoleGraphSha256',
    'trustedBackendProfileSha256',
    'unknownLoginRoleCount',
    'unknownClientBackendCount',
    'unknownBackendCount',
    'unmanagedWritePathCount',
  ]);
  if (
    !receipt ||
    !SHA256.test(receipt.databaseRoleGraphSha256) ||
    !SHA256.test(receipt.trustedBackendProfileSha256)
  ) return null;
  return receipt.databaseRoleGraphSha256 === context.databaseRoleGraphSha256 &&
    receipt.trustedBackendProfileSha256 === context.trustedBackendProfileSha256 &&
    receipt.unknownLoginRoleCount === 0 &&
    receipt.unknownClientBackendCount === 0 &&
    receipt.unknownBackendCount === 0 &&
    receipt.unmanagedWritePathCount === 0
    ? receipt
    : null;
}

function inspectDrain(value) {
  const receipt = inspectBoundReceipt(value, 'production-database-drain-observation', [
    'observedAfterControlObservations',
    'allApplicableSessionsObserved',
    'applicableApplicationSessionCount',
    'inflightWriteCount',
    'preparedApplicationWriteCount',
    'existingApplicationSessionCount',
    'postBarrierWriteAttemptCount',
    'postBarrierWriteSuccessCount',
  ]);
  if (!receipt) return null;
  const counts = [
    receipt.applicableApplicationSessionCount,
    receipt.inflightWriteCount,
    receipt.preparedApplicationWriteCount,
    receipt.existingApplicationSessionCount,
    receipt.postBarrierWriteAttemptCount,
    receipt.postBarrierWriteSuccessCount,
  ];
  return receipt.observedAfterControlObservations === true &&
    receipt.allApplicableSessionsObserved === true &&
    counts.every(nonNegativeInteger) &&
    receipt.applicableApplicationSessionCount === 0 &&
    receipt.inflightWriteCount === 0 &&
    receipt.preparedApplicationWriteCount === 0 &&
    receipt.existingApplicationSessionCount === 0 &&
    receipt.postBarrierWriteAttemptCount > 0 &&
    receipt.postBarrierWriteSuccessCount === 0
    ? receipt
    : null;
}

/**
 * Checks a closed set of independently observed maintenance controls. A result
 * of `isolation_proved_not_execution_authority` is evidence only: it cannot
 * authorize cleanup, history repair, migration execution, restoration, or
 * reopening production.
 */
export function assessProductionMaintenanceIsolation(
  receipts = {},
  options = {}
) {
  if (
    !plainObject(receipts, [
      'pause',
      'edgeFunctions',
      'platform',
      'realtimeProbe',
      'dataApi',
      'dataApiProbe',
      'network',
      'database',
      'drain',
    ]) ||
    !plainObjectWithAllowedKeys(options, [
      'expectedContext',
      'now',
      'maxEvidenceAgeMs',
    ])
  ) return blocked('required_isolation_receipt_missing_or_invalid');
  const {
    pause,
    edgeFunctions,
    platform,
    realtimeProbe,
    dataApi,
    dataApiProbe,
    network,
    database,
    drain,
  } = receipts;
  const {
    expectedContext,
    now = new Date(),
    maxEvidenceAgeMs = MAX_EVIDENCE_AGE_MS,
  } = options;
  if (
    !(now instanceof Date) ||
    Number.isNaN(now.getTime()) ||
    !Number.isSafeInteger(maxEvidenceAgeMs) ||
    maxEvidenceAgeMs <= 0 ||
    maxEvidenceAgeMs > MAX_EVIDENCE_AGE_MS
  ) {
    return blocked('invalid_isolation_evidence');
  }
  const context = inspectContext(expectedContext);
  const pauseFacts = inspectPause(pause);
  const edgeFacts = inspectEdgeFunctions(edgeFunctions);
  const platformFacts = inspectPlatform(platform);
  const realtimeFacts = inspectRealtimeProbe(realtimeProbe);
  const dataApiFacts = inspectDataApi(dataApi);
  const dataApiProbeFacts = inspectDataApiProbe(dataApiProbe);
  const networkFacts = inspectNetwork(network);
  const databaseFacts = inspectDatabase(database, context ?? {});
  const drainFacts = inspectDrain(drain);
  const facts = [
    pauseFacts,
    edgeFacts,
    platformFacts,
    realtimeFacts,
    dataApiFacts,
    dataApiProbeFacts,
    networkFacts,
    databaseFacts,
    drainFacts,
  ];
  if (!context || facts.some((fact) => fact === null)) {
    return blocked('required_isolation_receipt_missing_or_invalid');
  }
  if (!facts.every((fact) => matchesContext(fact, context))) {
    return blocked('isolation_receipt_context_mismatch');
  }
  const observedAt = facts.map((fact) => fact.capturedAt);
  if (
    observedAt.some((time) => time > now.getTime() || now.getTime() - time > maxEvidenceAgeMs) ||
    observedAt.slice(0, -1).some((time) => time > drainFacts.capturedAt) ||
    realtimeFacts.capturedAt <= platformFacts.capturedAt ||
    dataApiProbeFacts.capturedAt <= dataApiFacts.capturedAt ||
    drainFacts.capturedAt < databaseFacts.capturedAt
  ) {
    return blocked('isolation_receipt_freshness_or_order_invalid');
  }
  return proven();
}
