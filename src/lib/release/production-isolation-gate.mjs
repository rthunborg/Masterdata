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
      'priorRealtimeServiceEnabled',
      'priorRealtimeConfigSha256',
    ]) ||
    !SHA40.test(value.sourceSha) ||
    !SHA256.test(value.targetBindingSha256) ||
    !SHA256.test(value.isolationPlanSha256) ||
    !SHA256.test(value.databaseRoleGraphSha256) ||
    !SHA256.test(value.trustedBackendProfileSha256) ||
    typeof value.priorRealtimeServiceEnabled !== 'boolean' ||
    typeof value.priorRealtimeConfigSha256 !== 'string' ||
    !SHA256.test(value.priorRealtimeConfigSha256)
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

function inspectRealtimePriorState(value, context) {
  const receipt = inspectBoundReceipt(value, 'production-realtime-prior-state-observation', [
    'serviceEnabled',
    'configSha256',
  ]);
  return receipt && context &&
    receipt.serviceEnabled === context.priorRealtimeServiceEnabled &&
    typeof receipt.configSha256 === 'string' &&
    SHA256.test(receipt.configSha256) &&
    receipt.configSha256 === context.priorRealtimeConfigSha256
    ? receipt
    : null;
}

function inspectRealtimeProbe(value, context, platform, priorState) {
  const receipt = inspectBoundReceipt(value, 'production-realtime-denial-probe', [
    'independentFromControlObservation',
    'connectionAttempted',
    'connectionDenied',
    'writeObserved',
    'priorRealtimeServiceEnabled',
    'httpStatus',
    'providerErrorCode',
    'denialCause',
    'existingConnectionEstablishedBeforeIsolation',
    'existingSubscriptionAcknowledgedBeforeIsolation',
    'existingConnectionDisconnectedByService',
    'existingConnectionClosedByCaller',
    'existingConnectionEstablishedAtUtc',
    'existingSubscriptionAcknowledgedAtUtc',
    'controlChangeStartedAtUtc',
    'existingConnectionDisconnectedAtUtc',
    'reconnectAttemptedAtUtc',
    'reconnectDeniedAtUtc',
    'connectedClientCount',
    'connectedClientsReportComplete',
    'connectedClientsReportWindowStartedAtUtc',
    'connectedClientsReportWindowEndedAtUtc',
    'connectedClientsReportCapturedAtUtc',
  ]);
  if (!receipt || !context || !platform || !priorState ||
    receipt.independentFromControlObservation !== true ||
    receipt.connectionAttempted !== true ||
    receipt.connectionDenied !== true ||
    receipt.writeObserved !== false ||
    receipt.httpStatus !== 403 ||
    receipt.providerErrorCode !== 'RealtimeDisabledForTenant' ||
    receipt.denialCause !== 'realtime-disabled-for-tenant' ||
    receipt.priorRealtimeServiceEnabled !== context.priorRealtimeServiceEnabled ||
    receipt.existingConnectionClosedByCaller !== false ||
    receipt.connectedClientCount !== 0 ||
    receipt.connectedClientsReportComplete !== true
  ) return null;

  const reportTimes = [
    receipt.connectedClientsReportWindowStartedAtUtc,
    receipt.connectedClientsReportWindowEndedAtUtc,
    receipt.connectedClientsReportCapturedAtUtc,
  ].map(canonicalUtc);
  if (reportTimes.some((time) => time === null) ||
    reportTimes[0] <= platform.capturedAt ||
    reportTimes[1] <= reportTimes[0] ||
    reportTimes[2] < reportTimes[1] ||
    reportTimes[2] > receipt.capturedAt
  ) return null;

  const reconnectTimes = [receipt.reconnectAttemptedAtUtc, receipt.reconnectDeniedAtUtc]
    .map(canonicalUtc);
  if (reconnectTimes.some((time) => time === null) ||
    reconnectTimes[0] <= platform.capturedAt ||
    reconnectTimes[1] <= reconnectTimes[0] ||
    reconnectTimes[1] > receipt.capturedAt ||
    priorState.capturedAt >= platform.capturedAt
  ) return null;

  const connectionTimes = [
    receipt.existingConnectionEstablishedAtUtc,
    receipt.existingSubscriptionAcknowledgedAtUtc,
    receipt.controlChangeStartedAtUtc,
    receipt.existingConnectionDisconnectedAtUtc,
  ];
  if (!context.priorRealtimeServiceEnabled) {
    if (receipt.existingConnectionEstablishedBeforeIsolation !== false ||
      receipt.existingSubscriptionAcknowledgedBeforeIsolation !== false ||
      receipt.existingConnectionDisconnectedByService !== false ||
      connectionTimes.some((time) => time !== null)
    ) return null;
    return Object.freeze({ ...receipt, evidenceTimes: [...reconnectTimes, ...reportTimes] });
  }

  const observedConnectionTimes = connectionTimes.map(canonicalUtc);
  if (receipt.existingConnectionEstablishedBeforeIsolation !== true ||
    receipt.existingSubscriptionAcknowledgedBeforeIsolation !== true ||
    receipt.existingConnectionDisconnectedByService !== true ||
    observedConnectionTimes.some((time) => time === null) ||
    priorState.capturedAt >= observedConnectionTimes[0] ||
    observedConnectionTimes[0] >= observedConnectionTimes[1] ||
    observedConnectionTimes[1] >= observedConnectionTimes[2] ||
    observedConnectionTimes[2] > platform.capturedAt ||
    observedConnectionTimes[3] <= observedConnectionTimes[2] ||
    observedConnectionTimes[3] > reportTimes[0] ||
    reconnectTimes[0] <= observedConnectionTimes[3]
  ) return null;
  // The server can close the probe before the configuration GET finishes.
  // Bind the disconnect to the start of the change, not the later readback.
  return Object.freeze({
    ...receipt, evidenceTimes: [...observedConnectionTimes, ...reconnectTimes, ...reportTimes],
  });
}

function inspectDataApi(value) {
  const managementReceipt = inspectBoundReceipt(value, 'production-data-api-disable-management-observation', [
    'managementApiControlObserved',
    'dbSchema',
    'otherPostgrestSettingsPreserved',
    'dataApiDisabled',
  ]);
  if (
    managementReceipt &&
    managementReceipt.managementApiControlObserved === true &&
    managementReceipt.dbSchema === '' &&
    managementReceipt.otherPostgrestSettingsPreserved === true &&
    managementReceipt.dataApiDisabled === true
  ) return managementReceipt;
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
    'denialCause',
    'requestDenied',
    'writeCommitted',
  ]);
  return receipt &&
    receipt.independentFromControlObservation === true &&
    receipt.authenticatedWritePathAttempted === true &&
    receipt.denialCause === 'data-api-disabled' &&
    receipt.requestDenied === true &&
    receipt.writeCommitted === false
    ? receipt
    : null;
}

function inspectSameComputerNetwork(value) {
  const receipt = inspectBoundReceipt(value, 'production-network-exclusion-control-observation', [
    'verificationMethod',
    'restrictionStatus',
    'operatorIpv4AllowlistCount',
    'operatorIpv4AllowlistMatches',
    'ipv6AllowlistCount',
    'operatorIpv6EgressUnavailable',
    'ipv6Verification',
    'operatorEgressStable',
    'managementApiRollbackVerified',
    'priorPoolerConnectionSucceeded',
    'excludedOperatorConfigApplied',
    'excludedIpv4AllowlistCount',
    'excludedIpv4AllowlistMatchesReviewedRule',
    'excludedIpv6AllowlistCount',
    'excludedOperatorPoolerConnectionDenied',
    'denialCause',
    'credentialAndTlsInputsUnchanged',
    'restoredOperatorPoolerConnectionSucceeded',
    'freshReadOnlyTransactionConfirmed',
    'excludedConfigSha256',
    'finalConfigSha256',
    'priorPoolerConnectionAtUtc',
    'excludedConfigObservedAtUtc',
    'denialProbeAtUtc',
    'finalConfigObservedAtUtc',
    'admissionProbeAtUtc',
  ]);
  if (!receipt) return null;
  const evidenceTimes = [
    receipt.priorPoolerConnectionAtUtc,
    receipt.excludedConfigObservedAtUtc,
    receipt.denialProbeAtUtc,
    receipt.finalConfigObservedAtUtc,
    receipt.admissionProbeAtUtc,
  ].map(canonicalUtc);
  if (
    receipt.verificationMethod !== 'same-computer-exclusion-control' ||
    receipt.restrictionStatus !== 'applied' ||
    receipt.operatorIpv4AllowlistCount !== 1 ||
    receipt.operatorIpv4AllowlistMatches !== true ||
    receipt.ipv6AllowlistCount !== 0 ||
    receipt.operatorIpv6EgressUnavailable !== true ||
    receipt.ipv6Verification !== 'applied-policy-only-no-live-probe' ||
    receipt.operatorEgressStable !== true ||
    receipt.managementApiRollbackVerified !== true ||
    receipt.priorPoolerConnectionSucceeded !== true ||
    receipt.excludedOperatorConfigApplied !== true ||
    receipt.excludedIpv4AllowlistCount !== 1 ||
    receipt.excludedIpv4AllowlistMatchesReviewedRule !== true ||
    receipt.excludedIpv6AllowlistCount !== 0 ||
    receipt.excludedOperatorPoolerConnectionDenied !== true ||
    receipt.denialCause !== 'network-restriction' ||
    receipt.credentialAndTlsInputsUnchanged !== true ||
    receipt.restoredOperatorPoolerConnectionSucceeded !== true ||
    receipt.freshReadOnlyTransactionConfirmed !== true ||
    typeof receipt.excludedConfigSha256 !== 'string' ||
    typeof receipt.finalConfigSha256 !== 'string' ||
    !SHA256.test(receipt.excludedConfigSha256) ||
    !SHA256.test(receipt.finalConfigSha256) ||
    receipt.excludedConfigSha256 === receipt.finalConfigSha256 ||
    evidenceTimes.some((time) => time === null) ||
    evidenceTimes.some((time, index) => index > 0 && time <= evidenceTimes[index - 1]) ||
    evidenceTimes[4] > receipt.capturedAt
  ) return null;
  return Object.freeze({ ...receipt, evidenceTimes });
}

function inspectNetwork(value) {
  const sameComputer = inspectSameComputerNetwork(value);
  if (sameComputer) return sameComputer;
  const fields = [
    'restrictionStatus',
    'runnerIpv4Only',
    'runnerIpv6Only',
    'unrestrictedIpv4',
    'unrestrictedIpv6',
    'nonRunnerIpv4ProbeDenied',
    'nonRunnerIpv6ProbeDenied',
  ];
  // An IPv4-only operator must deny all IPv6 ingress. It must not claim an
  // operator IPv6 allowance that the runner cannot use or verify.
  const ipv4Only = Object.hasOwn(value ?? {}, 'operatorIpv6EgressUnavailable');
  const receipt = inspectBoundReceipt(
    value,
    'production-network-isolation-observation',
    ipv4Only
      ? [...fields, 'operatorIpv6EgressUnavailable', 'ipv6AllowlistEmpty']
      : fields
  );
  return receipt &&
    receipt.restrictionStatus === 'applied' &&
    receipt.runnerIpv4Only === true &&
    receipt.unrestrictedIpv4 === false &&
    receipt.unrestrictedIpv6 === false &&
    receipt.nonRunnerIpv4ProbeDenied === true &&
    receipt.nonRunnerIpv6ProbeDenied === true &&
    (ipv4Only
      ? receipt.runnerIpv6Only === false &&
        receipt.operatorIpv6EgressUnavailable === true &&
        receipt.ipv6AllowlistEmpty === true
      : receipt.runnerIpv6Only === true)
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
      'realtimePriorState',
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
    realtimePriorState,
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
  const realtimePriorFacts = inspectRealtimePriorState(realtimePriorState, context);
  const realtimeFacts = inspectRealtimeProbe(realtimeProbe, context, platformFacts, realtimePriorFacts);
  const dataApiFacts = inspectDataApi(dataApi);
  const dataApiProbeFacts = inspectDataApiProbe(dataApiProbe);
  const networkFacts = inspectNetwork(network);
  const databaseFacts = inspectDatabase(database, context ?? {});
  const drainFacts = inspectDrain(drain);
  const facts = [
    pauseFacts,
    edgeFacts,
    platformFacts,
    realtimePriorFacts,
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
  const networkEvidenceTimes = networkFacts.evidenceTimes ?? [];
  const realtimeEvidenceTimes = realtimeFacts.evidenceTimes;
  if (
    observedAt.some((time) => time > now.getTime() || now.getTime() - time > maxEvidenceAgeMs) ||
    networkEvidenceTimes.some((time) => time > now.getTime() || now.getTime() - time > maxEvidenceAgeMs) ||
    realtimeEvidenceTimes.some((time) => time > now.getTime() || now.getTime() - time > maxEvidenceAgeMs) ||
    observedAt.slice(0, -1).some((time) => time > drainFacts.capturedAt) ||
    realtimeFacts.capturedAt <= platformFacts.capturedAt ||
    dataApiProbeFacts.capturedAt <= dataApiFacts.capturedAt ||
    drainFacts.capturedAt < databaseFacts.capturedAt
  ) {
    return blocked('isolation_receipt_freshness_or_order_invalid');
  }
  return proven();
}
