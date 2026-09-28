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
    receipt.targetBindingSha256 !== targetBindingSha256
  ) return stopped('source_or_target_mismatch');

  const capturedAt = canonicalUtc(receipt.capturedAtUtc);
  if (
    capturedAt === null ||
    capturedAt > now.getTime() ||
    now.getTime() - capturedAt > maxEvidenceAgeMs
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
    'staffingChangelogPrimaryKey',
    'staffingChangelogChangedByUsersForeignKey',
    'bothTablesRlsEnabled',
    'outOfRangeHeadcountCount',
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
      'staffingNeedsUpdatedByUsersForeignKey',
      'staffingChangelogPrimaryKey',
      'staffingChangelogChangedByUsersForeignKey',
      'bothTablesRlsEnabled',
    ].every((key) => receipt.dependencies[key] === true) ||
    receipt.dependencies.outOfRangeHeadcountCount !== 0
  ) return stopped('dependency_contract_not_proven');

  if (!exactKeys(receipt.bodyProvenance, ['kind', 'sha256']) ||
    receipt.bodyProvenance.kind !== 'non_admitted_sha256' ||
    !SHA256.test(receipt.bodyProvenance.sha256 ?? '')
  ) return stopped('body_provenance_invalid');

  return Object.freeze({
    schemaVersion: 1,
    kind: 'production-staffing-pre-execute-assessment',
    disposition: 'staffing_pre_execute_proved_not_execution_authority',
    reason: 'fresh_replacement_compatibility_and_acl_contract_proven',
    capturedAtUtc: new Date(capturedAt).toISOString(),
    sourceSha,
    sourceTree,
    sourceManifestSha256,
    targetBindingSha256,
    bodyProvenanceSha256: receipt.bodyProvenance.sha256,
  });
}
