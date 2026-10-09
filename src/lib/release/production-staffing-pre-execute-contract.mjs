const SHA40 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MAX_EVIDENCE_AGE_MS = 15 * 60 * 1000;

export const PRODUCTION_STAFFING_PRE_EXECUTE_SIGNATURE =
  'public.update_staffing_need(text,integer,uuid)';
export const PRODUCTION_STAFFING_PRE_EXECUTE_GRANTEES = Object.freeze([
  'PUBLIC',
  'anon',
  'authenticated',
  'service_role',
]);
export const PRODUCTION_STAFFING_PRE_EXECUTE_RETURN_SHAPE =
  'TABLE(old_value integer,new_value integer)';
export const PRODUCTION_STAFFING_PRE_EXECUTE_INPUT_ARGUMENTS = Object.freeze([
  Object.freeze({ mode: 'IN', name: 'p_location', type: 'text' }),
  Object.freeze({ mode: 'IN', name: 'p_new_value', type: 'integer' }),
  Object.freeze({ mode: 'IN', name: 'p_user_id', type: 'uuid' }),
]);
export const PRODUCTION_STAFFING_PRE_EXECUTE_OUTPUT_ARGUMENTS = Object.freeze([
  Object.freeze({ mode: 'OUT', name: 'old_value', type: 'integer' }),
  Object.freeze({ mode: 'OUT', name: 'new_value', type: 'integer' }),
]);

export const PRODUCTION_STAFFING_NEEDS_UPDATED_BY_FK_NAME =
  'staffing_needs_updated_by_fkey';
export const PRODUCTION_STAFFING_UPDATED_BY_FK_RECONCILIATION_VERSION =
  '20260930091123';

const exactKeys = (value, keys) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.getOwnPropertySymbols(value).length === 0 &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());

const exactArray = (value, expected) =>
  Array.isArray(value) &&
  Object.getPrototypeOf(value) === Array.prototype &&
  Object.getOwnPropertySymbols(value).length === 0 &&
  Object.getOwnPropertyNames(value).length === value.length + 1 &&
  value.length === expected.length &&
  value.every((entry, index) => entry === expected[index]);

const exactObjectArray = (value, expected) =>
  Array.isArray(value) &&
  value.length === expected.length &&
  value.every((entry, index) =>
    exactKeys(entry, Object.keys(expected[index])) &&
    Object.entries(expected[index]).every(([key, expectedValue]) =>
      entry[key] === expectedValue
    )
  );

const exactStaffingNeedsUpdatedByForeignKey = (value, onDelete) =>
  exactKeys(value, [
    'foreignKeyCount',
    'name',
    'sourceColumn',
    'referencedSchema',
    'referencedTable',
    'referencedColumn',
    'onDelete',
    'onUpdate',
    'matchType',
    'validated',
    'deferrable',
    'initiallyDeferred',
  ]) &&
  value.foreignKeyCount === 1 &&
  value.name === PRODUCTION_STAFFING_NEEDS_UPDATED_BY_FK_NAME &&
  value.sourceColumn === 'updated_by' &&
  value.referencedSchema === 'public' &&
  value.referencedTable === 'users' &&
  value.referencedColumn === 'id' &&
  value.onDelete === onDelete &&
  value.onUpdate === 'NO ACTION' &&
  value.matchType === 'SIMPLE' &&
  value.validated === true &&
  value.deferrable === false &&
  value.initiallyDeferred === false;

const canonicalUtc = (value) => {
  if (typeof value !== 'string') return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value
    ? milliseconds
    : null;
};

const stopped = (reason) => Object.freeze({
  schemaVersion: 1,
  kind: 'production-staffing-pre-execute-assessment',
  disposition: 'blocked_insufficient_staffing_pre_execute_proof',
  reason,
});

/**
 * Validates the observed routine profile required before the first forward
 * migration replaces it. The existing body is intentionally not accepted as
 * semantic evidence: CREATE OR REPLACE FUNCTION replaces that body without
 * invoking it. Its digest is retained only as non-admitted provenance.
 */
export function assessProductionStaffingPreExecuteProof(
  receipt,
  {
    sourceSha,
    sourceTree,
    sourceManifestSha256,
    targetBindingSha256,
    now = new Date(),
    maxEvidenceAgeMs = MAX_EVIDENCE_AGE_MS,
  } = {}
) {
  if (
    !(now instanceof Date) ||
    Number.isNaN(now.getTime()) ||
    !Number.isSafeInteger(maxEvidenceAgeMs) ||
    maxEvidenceAgeMs <= 0 ||
    maxEvidenceAgeMs > MAX_EVIDENCE_AGE_MS ||
    !SHA40.test(sourceSha ?? '') ||
    !SHA40.test(sourceTree ?? '') ||
    !SHA256.test(sourceManifestSha256 ?? '') ||
    !SHA256.test(targetBindingSha256 ?? '')
  ) return stopped('invalid_context');

  const keys = [
    'schemaVersion',
    'kind',
    'environment',
    'sourceSha',
    'sourceTree',
    'sourceManifestSha256',
    'targetBindingSha256',
    'reconciliationExecuteVersion',
    'collectionStartedAtUtc',
    'capturedAtUtc',
    'routine',
    'dependencies',
    'bodyProvenance',
  ];
  if (
    !exactKeys(receipt, keys) ||
    receipt.schemaVersion !== 1 ||
    receipt.kind !== 'production-staffing-pre-execute-observation' ||
    receipt.environment !== 'production' ||
    receipt.sourceSha !== sourceSha ||
    receipt.sourceTree !== sourceTree ||
    receipt.sourceManifestSha256 !== sourceManifestSha256 ||
    receipt.targetBindingSha256 !== targetBindingSha256 ||
    receipt.reconciliationExecuteVersion !==
      PRODUCTION_STAFFING_UPDATED_BY_FK_RECONCILIATION_VERSION
  ) return stopped('source_or_target_mismatch');

  const capturedAt = canonicalUtc(receipt.capturedAtUtc);
  const collectionStartedAt = canonicalUtc(receipt.collectionStartedAtUtc);
  if (
    collectionStartedAt === null || capturedAt === null ||
    collectionStartedAt > capturedAt ||
    capturedAt > now.getTime() ||
    now.getTime() - collectionStartedAt > maxEvidenceAgeMs
  ) return stopped('evidence_time_invalid');

  if (!exactKeys(receipt.routine, [
    'signature',
    'exactOverloadCount',
    'owner',
    'language',
    'kind',
    'securityDefiner',
    'config',
    'nonOwnerExecuteGrantees',
    'nonOwnerExecuteGrantOptions',
    'nonExecuteAclPrivileges',
    'returnShape',
    'inputArguments',
    'outputArguments',
    'volatility',
    'parallel',
    'strict',
    'leakproof',
  ])) return stopped('routine_profile_invalid');

  const routine = receipt.routine;
  if (
    routine.signature !== PRODUCTION_STAFFING_PRE_EXECUTE_SIGNATURE ||
    routine.exactOverloadCount !== 1 ||
    routine.owner !== 'postgres' ||
    routine.language !== 'plpgsql' ||
    routine.kind !== 'function' ||
    routine.securityDefiner !== false ||
    routine.config !== null ||
    !exactArray(routine.nonOwnerExecuteGrantees, PRODUCTION_STAFFING_PRE_EXECUTE_GRANTEES) ||
    routine.nonOwnerExecuteGrantOptions !== false ||
    routine.nonExecuteAclPrivileges !== false ||
    routine.returnShape !== PRODUCTION_STAFFING_PRE_EXECUTE_RETURN_SHAPE ||
    !exactObjectArray(routine.inputArguments, PRODUCTION_STAFFING_PRE_EXECUTE_INPUT_ARGUMENTS) ||
    !exactObjectArray(routine.outputArguments, PRODUCTION_STAFFING_PRE_EXECUTE_OUTPUT_ARGUMENTS) ||
    routine.volatility !== 'volatile' ||
    routine.parallel !== 'unsafe' ||
    routine.strict !== false ||
    routine.leakproof !== false
  ) return stopped('routine_contract_not_proven');

  if (!exactKeys(receipt.dependencies, [
    'staffingNeedsColumns',
    'staffingChangelogColumns',
    'staffingNeedsPrimaryKey',
    'staffingNeedsLocationUnique',
    'staffingNeedsLocationCheck',
    'staffingNeedsHeadcountCheck',
    'staffingNeedsUpdatedByUsersForeignKey',
    'staffingNeedsUpdatedByUsersForeignKeyProfile',
    'staffingChangelogPrimaryKey',
    'staffingChangelogChangedByUsersForeignKey',
    'bothTablesRlsEnabled',
    'outOfRangeHeadcountCount',
    'nonNullUpdatedByCount',
    'orphanPublicUsersCount',
    'orphanAuthUsersCount',
  ]) ||
    !exactObjectArray(receipt.dependencies.staffingNeedsColumns, [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'location', type: 'text', nullable: false, default: null },
      { name: 'headcount_need', type: 'integer', nullable: false, default: '0' },
      { name: 'updated_at', type: 'timestamp with time zone', nullable: false, default: 'now()' },
      { name: 'updated_by', type: 'uuid', nullable: true, default: null },
    ]) ||
    !exactObjectArray(receipt.dependencies.staffingChangelogColumns, [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'location', type: 'text', nullable: false, default: null },
      { name: 'old_value', type: 'integer', nullable: false, default: null },
      { name: 'new_value', type: 'integer', nullable: false, default: null },
      { name: 'changed_by', type: 'uuid', nullable: false, default: null },
      { name: 'changed_at', type: 'timestamp with time zone', nullable: false, default: 'now()' },
    ]) ||
    ![
      'staffingNeedsPrimaryKey',
      'staffingNeedsLocationUnique',
      'staffingNeedsLocationCheck',
      'staffingNeedsHeadcountCheck',
      'staffingChangelogPrimaryKey',
      'staffingChangelogChangedByUsersForeignKey',
      'bothTablesRlsEnabled',
    ].every((key) => receipt.dependencies[key] === true) ||
    receipt.dependencies.outOfRangeHeadcountCount !== 0
  ) return stopped('dependency_contract_not_proven');

  const foreignKey = receipt.dependencies.staffingNeedsUpdatedByUsersForeignKeyProfile;
  const canonicalForeignKey =
    receipt.dependencies.staffingNeedsUpdatedByUsersForeignKey === true &&
    exactStaffingNeedsUpdatedByForeignKey(foreignKey, 'NO ACTION');
  const capturedSetNullForeignKey =
    receipt.dependencies.staffingNeedsUpdatedByUsersForeignKey === false &&
    exactStaffingNeedsUpdatedByForeignKey(foreignKey, 'SET NULL') &&
    receipt.dependencies.nonNullUpdatedByCount === 0 &&
    receipt.dependencies.orphanPublicUsersCount === 0 &&
    receipt.dependencies.orphanAuthUsersCount === 0;
  if (!canonicalForeignKey && !capturedSetNullForeignKey) {
    return stopped('staffing_updated_by_foreign_key_not_reconcilable');
  }

  if (
    !Number.isSafeInteger(receipt.dependencies.nonNullUpdatedByCount) ||
    receipt.dependencies.nonNullUpdatedByCount < 0 ||
    !Number.isSafeInteger(receipt.dependencies.orphanPublicUsersCount) ||
    receipt.dependencies.orphanPublicUsersCount < 0 ||
    !Number.isSafeInteger(receipt.dependencies.orphanAuthUsersCount) ||
    receipt.dependencies.orphanAuthUsersCount < 0
  ) return stopped('staffing_updated_by_actor_counts_invalid');

  if (!exactKeys(receipt.bodyProvenance, ['kind', 'sha256']) ||
    receipt.bodyProvenance.kind !== 'non_admitted_sha256' ||
    !SHA256.test(receipt.bodyProvenance.sha256 ?? '')
  ) return stopped('body_provenance_invalid');

  return Object.freeze({
    schemaVersion: 1,
    kind: 'production-staffing-pre-execute-assessment',
    disposition: 'staffing_pre_execute_proved_not_execution_authority',
    reason: canonicalForeignKey
      ? 'fresh_canonical_staffing_fk_and_replacement_compatibility_proven'
      : 'fresh_captured_staffing_fk_reconciliation_prerequisites_proven',
    collectionStartedAtUtc: new Date(collectionStartedAt).toISOString(),
    capturedAtUtc: new Date(capturedAt).toISOString(),
    sourceSha,
    sourceTree,
    sourceManifestSha256,
    targetBindingSha256,
    reconciliationExecuteVersion:
      PRODUCTION_STAFFING_UPDATED_BY_FK_RECONCILIATION_VERSION,
    bodyProvenanceSha256: receipt.bodyProvenance.sha256,
  });
}
