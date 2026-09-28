import {
  PRODUCTION_HISTORY_REPAIR_BASELINE,
  PRODUCTION_HISTORY_REPAIR_VERSIONS,
} from './production-history-repair-baseline.mjs';
import { PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS } from './production-bootstrap-admission.mjs';

const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_SHA = /^[a-f0-9]{40}$/u;
const MAX_EVIDENCE_AGE_MS = 15 * 60 * 1000;
const STRICT_POST_CHECK_NAMES = Object.freeze([
  'verifier_phase', 'story_22_15_phase_contracts', 'room_assignment_function_signatures',
  'repayment_boolean_columns', 'repayment_indexes_and_config', 'staffing_objects',
  'staffing_columns', 'staffing_constraints_and_rls', 'dietary_columns_and_permissions',
  'user_filters_objects', 'user_filters_trigger_function_contract', 'represented_trigger_contracts',
  'represented_column_contracts', 'represented_function_contracts',
  'staffing_crewing_done_permission_state', 'represented_policy_contracts',
]);

export const BASELINE_ADOPTION_DISPOSITIONS = Object.freeze([
  'CURRENT_FINAL',
  'SUPERSEDED_BY_SOURCE',
  'DATA_STATE_PRESERVED_NOT_RECONSTRUCTED',
  'SEED_STATE_ADOPTED',
]);

const fail = (message) => {
  throw new Error(message);
};

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const freeze = (value) => Object.freeze(value);
const freezeEntry = (entry) => freeze({
  ...entry,
  effects: freeze(entry.effects.map((effect) => freeze({
    ...effect,
    ...(effect.supersededBy ? { supersededBy: freeze([...effect.supersededBy]) } : {}),
  }))),
});

const current = (id, scope) => ({ id, disposition: 'CURRENT_FINAL', scope });
const superseded = (id, scope, ...supersededBy) => ({
  id,
  disposition: 'SUPERSEDED_BY_SOURCE',
  scope,
  supersededBy,
});
const data = (id, scope) => ({
  id,
  disposition: 'DATA_STATE_PRESERVED_NOT_RECONSTRUCTED',
  scope,
});
const seed = (id, scope) => ({ id, disposition: 'SEED_STATE_ADOPTED', scope });

// This is a source lineage inventory, never evidence that an old migration ran.
// Entries remain UNPROVED until independently collected, current-state receipts
// are reviewed and a separate owner adoption decision is recorded outside code.
const EFFECTS_BY_VERSION = new Map([
  ['20250113000000', [superseded('room-assignment-rpc', 'room assignment RPC', '20251122150001', '20260909115242')]],
  ['20251027000000', [current('initial-schema', 'core public schema')]],
  ['20251028000001', [current('important-dates-table', 'important_dates schema')]],
  ['20251028104344', [current('column-config-seed-schema', 'column configuration schema'), data('column-config-seed-data', 'column configuration rows')]],
  ['20251028144051', [seed('test-user-seed-state', 'historical test-user identities and roles')]],
  ['20251029000000', [superseded('user-rls-policies', 'users RLS policy set', '20251209000000', '20251210000002', '20260614000000', '20260709194903', '20260910115024')]],
  ['20251029000001', [seed('hr-admin-test-user-seed-state', 'historical HR-admin seed identity and role')]],
  ['20251029000002', [superseded('remove-jsonb-key-rpc', 'remove JSONB key RPC', '20251106000003')]],
  ['20251030000000', [current('employee-date-fields', 'employees date fields')]],
  ['20251031000000', [current('pe3-date-index', 'PE3 date index')]],
  ['20251102000000', [current('column-config-display-order', 'column configuration display order')]],
  ['20251102000001', [current('user-last-active', 'users last_active field')]],
  ['20251102000002', [superseded('user-activity-update-policy', 'user activity update RLS', '20260614000000', '20260910115024')]],
  ['20251102000003', [current('missing-masterdata-columns', 'employees masterdata columns')]],
  ['20251106000000', [superseded('hr-admin-party-edit-policy', 'party-data RLS policy', '20260614000000', '20260910115024')]],
  ['20251106000001', [current('custom-data-consolidated-schema', 'custom-data schema'), data('custom-data-consolidation', 'employee custom-data values')]],
  ['20251106000002', [current('jsonb-custom-column-removal-schema', 'employee custom-column schema'), data('jsonb-custom-column-removal-data', 'employee custom-column values')]],
  ['20251106000003', [current('remove-jsonb-key-rpc-final', 'remove JSONB key RPC')]],
  ['20251106000004', [current('sodexo-meal-plan-schema', 'Sodexo meal-plan configuration'), data('sodexo-meal-plan-config', 'Sodexo meal-plan configuration rows')]],
  ['20251106000005', [current('category-colors', 'column configuration category colors')]],
  ['20251106000006', [current('column-display-name', 'column configuration display names')]],
  ['20251107000000', [current('tester-column', 'employees tester field')]],
  ['20251107000001', [current('custom-column-function', 'custom column function')]],
  ['20251107000002', [current('tester-column-config', 'tester column configuration')]],
  ['20251107000003', [current('important-date-column-config', 'important date column configuration')]],
  ['20251107000004', [current('missing-column-config', 'column configuration rows')]],
  ['20251109102741', [current('gender-rank-enums', 'gender and rank enum types')]],
  ['20251109120000', [current('masterdata-boolean-schema', 'employee boolean masterdata fields'), data('masterdata-boolean-conversion', 'employee boolean masterdata values')]],
  ['20251109130000', [current('one-marked-at', 'employees one_marked_at field')]],
  ['20251109140000', [current('talmundo-field', 'employees Talmundo field')]],
  ['20251109150000', [current('loneiva-integer-schema', 'employees loneiva field'), data('loneiva-integer-conversion', 'employee loneiva values')]],
  ['20251109160000', [current('capacity-columns', 'capacity columns')]],
  ['20251109200237', [current('important-date-assignees', 'important-date assigned employees')]],
  ['20251109200300', [current('date-spots-rpc', 'date spots with employees RPC')]],
  ['20251110000000', [current('important-date-time', 'important_dates time value')]],
  ['20251122130617', [current('omc-reminder-field', 'ÖMC reminder field')]],
  ['20251122150000', [current('room-assignment-employee-columns', 'room assignment employee columns')]],
  ['20251122150001', [current('room-assignment-rpc-final', 'room assignment RPC')]],
  ['20251123000000', [current('boolean-defaults', 'employee boolean defaults and nullability'), data('boolean-default-normalization', 'employee boolean values')]],
  ['20251209000000', [superseded('recruiter-crewing-roles-and-policies', 'recruiter and crewing role constraints/RLS', '20260614000000', '20260709194903', '20260910115024')]],
  ['20251209110000', [superseded('repayment-employee-columns', 'repayment employee schema', '20251209120000')]],
  ['20251209120000', [current('repayment-boolean-schema', 'repayment boolean schema'), data('repayment-boolean-conversion', 'repayment values')]],
  ['20251209130000', [current('employee-column-changes-schema', 'employee_column_changes schema'), data('employee-column-change-audit-data', 'employee_column_changes rows')]],
  ['20251210000000', [superseded('employee-column-changes-rls', 'employee_column_changes RLS', '20260614000000', '20260910115024')]],
  ['20251210000001', [superseded('user-role-check-constraint', 'users role constraint', '20260224000000')]],
  ['20251210000002', [superseded('recruiter-crewing-rls', 'recruiter and crewing RLS', '20260614000000', '20260709194903', '20260910115024')]],
  ['20251213000000', [current('dietary-requirements-schema', 'dietary requirement schema'), superseded('dietary-permission-json', 'dietary permission JSON', '20260909115242')]],
  ['20251216000000', [current('archived-anonymized-fields', 'archived and anonymized fields')]],
  ['20260130212612', [superseded('saved-filter-schema-and-trigger', 'user_filters schema, constraints, indexes, and trigger', '20260909115242')]],
  ['20260223000000', [superseded('dietary-change-trigger', 'dietary change trigger', '20260607193000', '20260910184841')]],
  ['20260224000000', [current('admin-limited-role-constraint', 'admin_limited role constraint')]],
  ['20260313000001', [current('staffing-needs-schema', 'staffing needs schema'), data('staffing-needs-state', 'staffing need rows')]],
  ['20260520000000', [current('pe3-notifications-log-idempotency', 'PE3 notifications log schema'), data('pe3-notifications-log-state', 'PE3 notifications log rows')]],
  ['20260605151000', [current('important-dates-active-schema', 'important_dates is_active schema'), data('important-dates-active-state', 'important_dates is_active values')]],
  ['20260607193000', [current('employee-column-changes-conflict-target', 'employee column change conflict target'), data('employee-column-changes-conflict-state', 'employee_column_changes rows')]],
]);

export const PRODUCTION_BASELINE_ADOPTION_LEDGER = freeze(
  PRODUCTION_HISTORY_REPAIR_BASELINE.map((source) => {
    const effects = EFFECTS_BY_VERSION.get(source.version);
    if (!effects) fail(`Baseline adoption lineage is missing ${source.version}`);
    return freezeEntry({ ...source, effects });
  })
);
export const PRODUCTION_BASELINE_ADOPTION_VERSIONS = freeze(
  PRODUCTION_BASELINE_ADOPTION_LEDGER.map(({ version }) => version)
);

function assertLineageEffect(effect, knownVersions) {
  if (!effect || typeof effect !== 'object' || Array.isArray(effect)) fail('Baseline adoption lineage effect is invalid');
  if (typeof effect.id !== 'string' || effect.id.length === 0 || typeof effect.scope !== 'string' || effect.scope.length === 0) {
    fail('Baseline adoption lineage effect is invalid');
  }
  if (!BASELINE_ADOPTION_DISPOSITIONS.includes(effect.disposition)) fail('Baseline adoption lineage effect has an unknown disposition');
  if (effect.disposition === 'SUPERSEDED_BY_SOURCE') {
    if (!Array.isArray(effect.supersededBy) || effect.supersededBy.length === 0) fail('Baseline adoption supersession is invalid');
    for (const version of effect.supersededBy) {
      if (!knownVersions.has(version)) fail(`Baseline adoption superseder is unknown: ${version}`);
    }
  } else if ('supersededBy' in effect) {
    fail('Baseline adoption lineage effect is invalid');
  }
}

function assertNoSupersessionCycle(ledger) {
  const dependencies = new Map(ledger.map((entry) => [
    entry.version,
    entry.effects.flatMap((effect) => effect.supersededBy ?? []).filter((version) =>
      PRODUCTION_HISTORY_REPAIR_VERSIONS.includes(version)
    ),
  ]));
  const visiting = new Set();
  const visited = new Set();
  const visit = (version) => {
    if (visiting.has(version)) fail('Baseline adoption supersession contains a cycle');
    if (visited.has(version)) return;
    visiting.add(version);
    for (const next of dependencies.get(version) ?? []) visit(next);
    visiting.delete(version);
    visited.add(version);
  };
  for (const version of dependencies.keys()) visit(version);
}

/** Validates exactly the reviewed 55-source lineage inventory. */
export function validateProductionBaselineAdoptionLedger(ledger = PRODUCTION_BASELINE_ADOPTION_LEDGER) {
  if (!Array.isArray(ledger) || ledger.length !== PRODUCTION_HISTORY_REPAIR_BASELINE.length) fail('Baseline adoption ledger must cover exactly 55 source rows');
  const expected = PRODUCTION_HISTORY_REPAIR_BASELINE;
  const knownVersions = new Set([...PRODUCTION_HISTORY_REPAIR_VERSIONS, ...PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS]);
  for (const [index, entry] of ledger.entries()) {
    const source = expected[index];
    if (!entry || entry.version !== source.version || entry.file !== source.file || entry.gitBlob !== source.gitBlob || entry.sha256 !== source.sha256) {
      fail('Baseline adoption ledger source identity does not match the pinned repair baseline');
    }
    if (!Array.isArray(entry.effects) || entry.effects.length === 0) fail('Baseline adoption ledger source has no material effects');
    const ids = new Set();
    for (const effect of entry.effects) {
      assertLineageEffect(effect, knownVersions);
      if (ids.has(effect.id)) fail('Baseline adoption ledger duplicates an effect identifier');
      ids.add(effect.id);
    }
  }
  assertNoSupersessionCycle(ledger);
  for (const entry of ledger) {
    if (!same(entry.effects, EFFECTS_BY_VERSION.get(entry.version))) {
      fail('Baseline adoption material effects do not match the reviewed source lineage');
    }
  }
  return freeze({
    versionCount: ledger.length,
    effectCount: ledger.reduce((count, entry) => count + entry.effects.length, 0),
  });
}

function exactVersions(value) {
  return Array.isArray(value) && same(value, PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS);
}

function exactKeys(receipt, keys) {
  return receipt && typeof receipt === 'object' && !Array.isArray(receipt) &&
    Object.getPrototypeOf(receipt) === Object.prototype &&
    Object.getOwnPropertySymbols(receipt).length === 0 &&
    same(Object.keys(receipt).sort(), [...keys].sort());
}

function evidenceReason(receipt, expectedKind, binding, now, keys) {
  if (!receipt || typeof receipt !== 'object') return 'missing';
  if (!exactKeys(receipt, keys)) return 'invalid';
  if (receipt.kind !== expectedKind || receipt.schemaVersion !== 1 || !SHA256.test(receipt.sha256 ?? '')) return 'invalid';
  if (receipt.sourceCommit !== binding.sourceCommit || receipt.targetBindingSha256 !== binding.targetBindingSha256) return 'binding_mismatch';
  const capturedAt = Date.parse(receipt.capturedAtUtc ?? '');
  if (!Number.isFinite(capturedAt) || capturedAt > now.getTime() || now.getTime() - capturedAt > MAX_EVIDENCE_AGE_MS) return 'stale';
  return null;
}

/**
 * Produces a review-only adoption packet. It accepts no signature and never
 * returns an approval: after the current canonical and preservation evidence
 * is structurally bound to the post-forward candidate, an owner must make a
 * separately recorded adoption decision before a history repair can be asked.
 */
export function prepareProductionBaselineAdoptionReview({
  sourceCommit,
  targetBindingSha256,
  forwardHistory,
  strictPost,
  canonicalFingerprint,
  preservationFingerprint,
  now = new Date(),
} = {}) {
  validateProductionBaselineAdoptionLedger();
  if (!(now instanceof Date) || Number.isNaN(now.getTime()) || !GIT_SHA.test(sourceCommit ?? '') || !SHA256.test(targetBindingSha256 ?? '')) {
    fail('Baseline adoption review binding is unavailable or invalid');
  }
  const binding = { sourceCommit, targetBindingSha256 };
  const missing = [];
  if (!exactVersions(forwardHistory?.versions)) {
    missing.push('forward_history_not_exactly_13');
  } else {
    const reason = evidenceReason(forwardHistory, 'independent-production-post-forward-history', binding, now, [
      'schemaVersion', 'kind', 'sha256', 'sourceCommit', 'targetBindingSha256', 'capturedAtUtc', 'versions',
    ]);
    if (reason) missing.push(`forward_history_${reason}`);
  }
  if (!strictPost || strictPost.checkCount !== 16 || strictPost.failedCheckCount !== 0 || !same(strictPost.checkNames, STRICT_POST_CHECK_NAMES)) {
    missing.push('strict_post_apply_16_of_16_not_proven');
  } else {
    const reason = evidenceReason(strictPost, 'independent-production-strict-catalog', binding, now, [
      'schemaVersion', 'kind', 'sha256', 'sourceCommit', 'targetBindingSha256', 'capturedAtUtc', 'checkCount', 'failedCheckCount', 'checkNames',
    ]);
    if (reason) missing.push(`strict_post_apply_${reason}`);
  }
  for (const [name, receipt, kind, keys] of [
    ['canonical_schema_fingerprint', canonicalFingerprint, 'independent-production-canonical-schema-fingerprint', [
      'schemaVersion', 'kind', 'sha256', 'sourceCommit', 'targetBindingSha256', 'capturedAtUtc', 'coverage',
    ]],
    ['preservation_fingerprint', preservationFingerprint, 'independent-production-preservation-fingerprint', [
      'schemaVersion', 'kind', 'sha256', 'sourceCommit', 'targetBindingSha256', 'capturedAtUtc', 'scope',
    ]],
  ]) {
    const reason = evidenceReason(receipt, kind, binding, now, keys);
    if (reason) missing.push(`${name}_${reason}`);
  }
  if (canonicalFingerprint?.coverage !== 'complete-canonical-68-source-migrations') {
    missing.push('canonical_schema_fingerprint_not_complete_68_source_coverage');
  }
  if (preservationFingerprint?.scope !== 'all-ledger-data-effects-and-seed-states') {
    missing.push('preservation_fingerprint_scope_incomplete');
  }
  return freeze({
    schemaVersion: 1,
    kind: 'production-baseline-adoption-review',
    status: 'UNPROVED',
    disposition: 'owner_adoption_required',
    sourceCommit,
    targetBindingSha256,
    forwardHistory: freeze([...(forwardHistory?.versions ?? [])]),
    missing: freeze(missing),
    dataPreservationScope: 'Current aggregate preservation is not reconstruction proof for historical data transformations; seed states require an owner adoption decision and must not recreate identities.',
  });
}
