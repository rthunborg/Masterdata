import { PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS } from './production-bootstrap-admission.mjs';
import { PRODUCTION_HISTORY_REPAIR_VERSIONS } from './production-history-repair-proof.mjs';

const SHA40 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u;
const MAX_EVIDENCE_AGE_MS = 15 * 60 * 1000;

export const PRODUCTION_REPAIRED_HISTORY_VERSIONS =
  PRODUCTION_HISTORY_REPAIR_VERSIONS;
export const PRODUCTION_REPAIRED_FORWARD_VERSIONS =
  PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS;
export const PRODUCTION_COMPLETE_HISTORY_VERSIONS = Object.freeze(
  [...new Set([
    ...PRODUCTION_REPAIRED_HISTORY_VERSIONS,
    ...PRODUCTION_REPAIRED_FORWARD_VERSIONS,
  ])].sort()
);

const stopped = (reason) =>
  Object.freeze({
    schemaVersion: 1,
    kind: 'production-repair-aware-forward-outcome',
    disposition: 'stopped_needs_diagnosis',
    reason,
  });

const verified = () =>
  Object.freeze({
    schemaVersion: 1,
    kind: 'production-repair-aware-forward-outcome',
    disposition: 'verified_complete_not_authority',
    reason: 'fresh_exact_55_repair_history_and_68_total_history_proven',
  });

const plainObject = (value, keys) => {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const names = Object.getOwnPropertyNames(value);
  return names.length === keys.length && keys.every((key) =>
    Object.hasOwn(descriptors, key) &&
    descriptors[key].enumerable === true &&
    Object.hasOwn(descriptors[key], 'value')
  );
};

const plainDenseArray = (value) => {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Object.getOwnPropertyNames(value).length === value.length + 1 &&
    Object.hasOwn(descriptors, 'length') &&
    Array.from({ length: value.length }, (_, index) => {
      const descriptor = descriptors[String(index)];
      return descriptor?.enumerable === true && Object.hasOwn(descriptor, 'value');
    }).every(Boolean);
};

const canonicalUtc = (value) => {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value
    ? time
    : null;
};

const sameVersions = (actual, expected) =>
  plainDenseArray(actual) &&
  actual.length === expected.length &&
  actual.every((version, index) =>
    typeof version === 'string' && version === expected[index]
  );

function inspectHistory(value) {
  if (!plainObject(value, ['physicalState', 'versions'])) return null;
  if (value.physicalState === 'absent' && value.versions === null) {
    return Object.freeze({ physicalState: 'absent', versions: null });
  }
  if (
    value.physicalState === 'present' &&
    plainDenseArray(value.versions) &&
    value.versions.every((version) => typeof version === 'string')
  ) return Object.freeze({ physicalState: 'present', versions: [...value.versions] });
  return null;
}

function inspectBaseReceipt(value) {
  if (!plainObject(value, [
    'sourceSha', 'targetBindingSha256', 'attemptId', 'observedAtUtc', 'history',
  ]) ||
    !SHA40.test(value.sourceSha) ||
    !SHA256.test(value.targetBindingSha256) ||
    !UUID.test(value.attemptId)
  ) return null;
  const observedAt = canonicalUtc(value.observedAtUtc);
  const history = inspectHistory(value.history);
  return observedAt === null || history === null
    ? null
    : Object.freeze({
      sourceSha: value.sourceSha,
      targetBindingSha256: value.targetBindingSha256,
      attemptId: value.attemptId,
      observedAt,
      history,
    });
}

function inspectAfterReceipt(value) {
  if (!plainObject(value, [
    'sourceSha', 'targetBindingSha256', 'attemptId', 'observedAtUtc', 'history',
    'physicalResult',
  ])) return null;
  const base = inspectBaseReceipt({
    sourceSha: value.sourceSha,
    targetBindingSha256: value.targetBindingSha256,
    attemptId: value.attemptId,
    observedAtUtc: value.observedAtUtc,
    history: value.history,
  });
  if (!base || !plainObject(value.physicalResult, ['state', 'effects']) ||
    !['complete', 'unknown'].includes(value.physicalResult.state) ||
    !['known_recorded', 'unknown_or_unrecorded'].includes(value.physicalResult.effects)
  ) return null;
  return Object.freeze({ ...base, physicalResult: { ...value.physicalResult } });
}

function inspectAttempt(value) {
  if (!plainObject(value, [
    'attemptId', 'sourceSha', 'targetBindingSha256', 'startedAtUtc',
    'finishedAtUtc', 'child',
  ]) ||
    !UUID.test(value.attemptId) ||
    !SHA40.test(value.sourceSha) ||
    !SHA256.test(value.targetBindingSha256) ||
    !plainObject(value.child, ['kind', 'code']) ||
    !['exit', 'timeout', 'spawn_uncertain', 'physical_unknown'].includes(value.child.kind) ||
    !Number.isInteger(value.child.code)
  ) return null;
  const startedAt = canonicalUtc(value.startedAtUtc);
  const finishedAt = canonicalUtc(value.finishedAtUtc);
  return startedAt === null || finishedAt === null || finishedAt < startedAt
    ? null
    : Object.freeze({
      attemptId: value.attemptId,
      sourceSha: value.sourceSha,
      targetBindingSha256: value.targetBindingSha256,
      startedAt,
      finishedAt,
      child: { ...value.child },
    });
}

function inspectStrictPost(value) {
  if (!plainObject(value, [
    'sourceSha', 'targetBindingSha256', 'attemptId', 'observedAtUtc',
    'checkCount', 'failedCheckCount', 'allExpectedVersionsObserved',
    'preservationProof',
  ]) ||
    !SHA40.test(value.sourceSha) ||
    !SHA256.test(value.targetBindingSha256) ||
    !UUID.test(value.attemptId) ||
    !Number.isSafeInteger(value.checkCount) ||
    !Number.isSafeInteger(value.failedCheckCount) ||
    typeof value.allExpectedVersionsObserved !== 'boolean' ||
    !plainObject(value.preservationProof, ['kind', 'matched']) ||
    value.preservationProof.kind !== 'explicit_preservation_proof' ||
    typeof value.preservationProof.matched !== 'boolean'
  ) return null;
  const observedAt = canonicalUtc(value.observedAtUtc);
  return observedAt === null ? null : Object.freeze({ ...value, observedAt });
}

const sameBinding = (left, right) =>
  left.sourceSha === right.sourceSha &&
  left.targetBindingSha256 === right.targetBindingSha256 &&
  left.attemptId === right.attemptId;

/**
 * Classifies exactly one completed forward attempt after the separately gated
 * 55-version repair phase. It grants neither retry, repair, execution,
 * restoration, nor production reopening authority.
 */
export function classifyProductionRepairAwareForwardOutcome(
  { attempt, before, after, strictPost } = {},
  { now = new Date(), maxEvidenceAgeMs = MAX_EVIDENCE_AGE_MS } = {}
) {
  if (
    !(now instanceof Date) || Number.isNaN(now.getTime()) ||
    !Number.isSafeInteger(maxEvidenceAgeMs) || maxEvidenceAgeMs <= 0 ||
    maxEvidenceAgeMs > MAX_EVIDENCE_AGE_MS
  ) return stopped('invalid_evidence');

  const attemptFacts = inspectAttempt(attempt);
  const beforeFacts = inspectBaseReceipt(before);
  const afterFacts = inspectAfterReceipt(after);
  const strictFacts = inspectStrictPost(strictPost);
  if (!attemptFacts || !beforeFacts || !afterFacts || !strictFacts) {
    return stopped('invalid_evidence');
  }
  if (!sameBinding(attemptFacts, beforeFacts) ||
    !sameBinding(attemptFacts, afterFacts) ||
    !sameBinding(attemptFacts, strictFacts)
  ) return stopped('source_target_or_attempt_mismatch');
  if (
    attemptFacts.finishedAt > now.getTime() ||
    beforeFacts.observedAt > attemptFacts.startedAt ||
    attemptFacts.startedAt - beforeFacts.observedAt > maxEvidenceAgeMs ||
    afterFacts.observedAt < attemptFacts.finishedAt ||
    strictFacts.observedAt < afterFacts.observedAt ||
    afterFacts.observedAt > now.getTime() ||
    strictFacts.observedAt > now.getTime() ||
    now.getTime() - afterFacts.observedAt > maxEvidenceAgeMs ||
    now.getTime() - strictFacts.observedAt > maxEvidenceAgeMs
  ) return stopped('evidence_time_invalid');
  if (
    beforeFacts.history.physicalState !== 'present' ||
    !sameVersions(beforeFacts.history.versions, PRODUCTION_REPAIRED_HISTORY_VERSIONS)
  ) return stopped('before_history_not_exact_55_repair_set');
  if (!sameVersions(afterFacts.history.versions, PRODUCTION_COMPLETE_HISTORY_VERSIONS)) {
    return stopped('after_history_not_exact_68_complete_set');
  }
  if (attemptFacts.child.kind !== 'exit') return stopped('child_outcome_indeterminate');
  if (attemptFacts.child.code !== 0) return stopped('attempt_exit_not_success');
  if (
    afterFacts.physicalResult.state !== 'complete' ||
    afterFacts.physicalResult.effects !== 'known_recorded'
  ) return stopped('physical_result_unknown_or_unrecorded');
  if (
    strictFacts.checkCount !== 16 ||
    strictFacts.failedCheckCount !== 0 ||
    strictFacts.allExpectedVersionsObserved !== true ||
    strictFacts.preservationProof.matched !== true
  ) return stopped('strict_post_or_preservation_not_proven');
  return verified();
}
