import { readFileSync } from 'node:fs';

export const KNOWN_PLATFORM_ROLES = Object.freeze([
  'postgres', 'anon', 'authenticated', 'service_role', 'authenticator',
  'supabase_auth_admin', 'supabase_storage_admin', 'supabase_admin',
  'supabase_realtime_admin', 'supabase_etl_admin', 'supabase_replication_admin',
  'supabase_functions_admin', 'supabase_read_only_user', 'dashboard_user', 'pgbouncer',
]);
export const KNOWN_REPLICATION_PLUGINS = Object.freeze([
  'pgoutput', 'wal2json', 'decoderbufs', 'test_decoding', 'pglogical_output',
]);

const MAX_OUTPUT_BYTES = 65_536;
const MD5 = /^[a-f0-9]{32}$/u;
const fail = (code) => { throw new Error(code); };
const bool = (value) => typeof value === 'boolean';
const count = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000;
const plainJsonObjectWithKeys = (value, keys) => {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) return false;
  const ownKeys = Object.keys(value);
  if (ownKeys.length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) return false;
  return ownKeys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable === true && Object.hasOwn(descriptor, 'value');
  });
};
const sameKeys = plainJsonObjectWithKeys;
const exactObject = (value, keys, code) => { if (!sameKeys(value, keys)) fail(code); };
const hash = (value, code) => { if (typeof value !== 'string' || !MD5.test(value)) fail(code); };

export function assertDatabaseWriterClassificationSql(sql) {
  if (typeof sql !== 'string' || Buffer.byteLength(sql, 'utf8') > MAX_OUTPUT_BYTES) fail('writer_classification_sql_invalid');
  const uncommented = sql.replace(/--[^\r\n]*/gu, '').replace(/\/\*[\s\S]*?\*\//gu, '').replace(/'(?:''|[^'])*'/gu, "''");
  const leading = sql.replace(/^(?:[ \t]*--[^\r\n]*(?:\r?\n|$))+/u, '').trimStart();
  if (!/^BEGIN\s+TRANSACTION\s+ISOLATION\s+LEVEL\s+REPEATABLE\s+READ\s+READ\s+ONLY\s*;/iu.test(leading) ||
      !/ROLLBACK\s*;\s*$/iu.test(sql) ||
      !/SET\s+LOCAL\s+statement_timeout\s*=\s*'20s'\s*;/iu.test(sql) ||
      !/SET\s+LOCAL\s+lock_timeout\s*=\s*'3s'\s*;/iu.test(sql) ||
      !/SET\s+LOCAL\s+idle_in_transaction_session_timeout\s*=\s*'30s'\s*;/iu.test(sql) ||
      /^\s*\\/mu.test(sql) ||
      /\b(?:insert|update|delete|alter|create|drop|grant|revoke|truncate|copy|vacuum|analyze|refresh|lock|do|call)\b/iu.test(uncommented) ||
      /\b(?:pg_terminate_backend|pg_cancel_backend|set_config)\s*\(/iu.test(uncommented)) fail('writer_classification_sql_not_readonly');
  return true;
}

function validateKnownRoles(value) {
  exactObject(value, KNOWN_PLATFORM_ROLES, 'writer_classification_known_roles_invalid');
  const keys = [
    'present', 'canLogin', 'superuser', 'bypassRls', 'ownsPublicSchema', 'directMembershipCount',
    'membershipProfileMd5', 'ownedPublicObjectCount', 'effectiveDatabaseConnect', 'effectivePublicUsage',
    'effectivePublicCreate', 'effectivePublicInsertRelationCount', 'effectivePublicUpdateRelationCount',
    'effectivePublicDeleteRelationCount', 'effectivePublicTruncateRelationCount', 'effectivePublicExecuteRoutineCount',
  ];
  for (const role of KNOWN_PLATFORM_ROLES) {
    const row = value[role];
    exactObject(row, keys, 'writer_classification_known_roles_invalid');
    for (const key of ['present', 'canLogin', 'superuser', 'bypassRls', 'ownsPublicSchema', 'effectiveDatabaseConnect', 'effectivePublicUsage', 'effectivePublicCreate']) if (!bool(row[key])) fail('writer_classification_known_roles_invalid');
    for (const key of ['directMembershipCount', 'ownedPublicObjectCount', 'effectivePublicInsertRelationCount', 'effectivePublicUpdateRelationCount', 'effectivePublicDeleteRelationCount', 'effectivePublicTruncateRelationCount', 'effectivePublicExecuteRoutineCount']) if (!count(row[key])) fail('writer_classification_known_roles_invalid');
    hash(row.membershipProfileMd5, 'writer_classification_known_roles_invalid');
    if (!row.present && (
      row.canLogin || row.superuser || row.bypassRls || row.ownsPublicSchema || row.directMembershipCount !== 0 ||
      row.ownedPublicObjectCount !== 0 || row.effectiveDatabaseConnect || row.effectivePublicUsage || row.effectivePublicCreate ||
      row.effectivePublicInsertRelationCount !== 0 || row.effectivePublicUpdateRelationCount !== 0 ||
      row.effectivePublicDeleteRelationCount !== 0 || row.effectivePublicTruncateRelationCount !== 0 || row.effectivePublicExecuteRoutineCount !== 0
    )) fail('writer_classification_known_roles_invalid');
  }
}

function validateSessions(value) {
  exactObject(value, ['totalClientBackendCount', 'knownRoleClientBackendCounts', 'unknownRoleClientBackendCount', 'unknownRoleClientBackendProfileMd5', 'knownNonclientBackendCount', 'unknownBackendCount', 'unknownBackendProfileMd5'], 'writer_classification_sessions_invalid');
  for (const key of ['totalClientBackendCount', 'unknownRoleClientBackendCount', 'knownNonclientBackendCount', 'unknownBackendCount']) if (!count(value[key])) fail('writer_classification_sessions_invalid');
  hash(value.unknownRoleClientBackendProfileMd5, 'writer_classification_sessions_invalid');
  hash(value.unknownBackendProfileMd5, 'writer_classification_sessions_invalid');
  exactObject(value.knownRoleClientBackendCounts, KNOWN_PLATFORM_ROLES, 'writer_classification_sessions_invalid');
  const known = Object.values(value.knownRoleClientBackendCounts);
  if (!known.every(count) || known.reduce((sum, item) => sum + item, 0) + value.unknownRoleClientBackendCount !== value.totalClientBackendCount) fail('writer_classification_sessions_invalid');
}

function validateCountHashObject(value, countKey, hashKey, keys, code) {
  exactObject(value, keys, code);
  if (!count(value[countKey])) fail(code);
  hash(value[hashKey], code);
}

export function parseDatabaseWriterClassification(output) {
  if (typeof output !== 'string' || Buffer.byteLength(output, 'utf8') > MAX_OUTPUT_BYTES) fail('writer_classification_output_invalid');
  const lines = output.split(/\r?\n/u).filter(Boolean);
  if (lines.length !== 1 || Buffer.byteLength(lines[0], 'utf8') > MAX_OUTPUT_BYTES) fail('writer_classification_output_invalid');
  let value;
  try { value = JSON.parse(lines[0]); } catch { fail('writer_classification_output_invalid'); }
  exactObject(value, ['schemaVersion', 'kind', 'knownRoles', 'unknownLoginRoles', 'sessions', 'subscriptions', 'replicationSlots', 'authCustomHooks', 'publicWebhookTriggers'], 'writer_classification_output_invalid');
  if (value.schemaVersion !== 1 || value.kind !== 'production-database-writer-classification') fail('writer_classification_output_invalid');
  validateKnownRoles(value.knownRoles);
  validateCountHashObject(value.unknownLoginRoles, 'count', 'profileMd5', ['count', 'profileMd5'], 'writer_classification_unknown_login_roles_invalid');
  validateSessions(value.sessions);
  exactObject(value.subscriptions, ['totalCount', 'enabledCount'], 'writer_classification_subscriptions_invalid');
  if (!count(value.subscriptions.totalCount) || !count(value.subscriptions.enabledCount) || value.subscriptions.enabledCount > value.subscriptions.totalCount) fail('writer_classification_subscriptions_invalid');
  exactObject(value.replicationSlots, ['totalSlotCount', 'activeSlotCount', 'knownPluginSlotCounts', 'unknownPluginSlotCount', 'unknownPluginProfileMd5'], 'writer_classification_replication_invalid');
  if (!count(value.replicationSlots.totalSlotCount) || !count(value.replicationSlots.activeSlotCount) || !count(value.replicationSlots.unknownPluginSlotCount) || value.replicationSlots.activeSlotCount > value.replicationSlots.totalSlotCount) fail('writer_classification_replication_invalid');
  hash(value.replicationSlots.unknownPluginProfileMd5, 'writer_classification_replication_invalid');
  exactObject(value.replicationSlots.knownPluginSlotCounts, KNOWN_REPLICATION_PLUGINS, 'writer_classification_replication_invalid');
  const pluginCounts = Object.values(value.replicationSlots.knownPluginSlotCounts);
  if (!pluginCounts.every(count) || pluginCounts.reduce((sum, item) => sum + item, 0) + value.replicationSlots.unknownPluginSlotCount !== value.replicationSlots.totalSlotCount) fail('writer_classification_replication_invalid');
  validateCountHashObject(value.authCustomHooks, 'customTriggerCount', 'customTriggerProfileMd5', ['authSchemaPresent', 'authTriggerScopeOnlyAuthSchema', 'namedHookCandidateSearchIsNameBounded', 'fullAuthConfigurationCoverage', 'customTriggerCount', 'customTriggerProfileMd5', 'namedHookCandidateCount', 'namedHookCandidateProfileMd5', 'unrecognizedHookPatternCount', 'unrecognizedHookPatternProfileMd5'], 'writer_classification_auth_hooks_invalid');
  if (
    !bool(value.authCustomHooks.authSchemaPresent) ||
    value.authCustomHooks.authTriggerScopeOnlyAuthSchema !== true ||
    value.authCustomHooks.namedHookCandidateSearchIsNameBounded !== true ||
    value.authCustomHooks.fullAuthConfigurationCoverage !== false
  ) fail('writer_classification_auth_hooks_invalid');
  for (const key of ['namedHookCandidateCount', 'unrecognizedHookPatternCount']) if (!count(value.authCustomHooks[key])) fail('writer_classification_auth_hooks_invalid');
  hash(value.authCustomHooks.namedHookCandidateProfileMd5, 'writer_classification_auth_hooks_invalid');
  hash(value.authCustomHooks.unrecognizedHookPatternProfileMd5, 'writer_classification_auth_hooks_invalid');
  validateCountHashObject(value.publicWebhookTriggers, 'identifiableTriggerCount', 'profileMd5', ['patternCoverageOnly', 'fullOutboundWriterCoverage', 'identifiableTriggerCount', 'profileMd5'], 'writer_classification_webhooks_invalid');
  if (value.publicWebhookTriggers.patternCoverageOnly !== true || value.publicWebhookTriggers.fullOutboundWriterCoverage !== false) fail('writer_classification_webhooks_invalid');
  return Object.freeze(value);
}

export function classifyWriterIsolation(output) {
  const classification = parseDatabaseWriterClassification(output);
  const unknownPrincipalOrBackendPresent = classification.unknownLoginRoles.count > 0 ||
    classification.sessions.unknownRoleClientBackendCount > 0 || classification.sessions.unknownBackendCount > 0 ||
    classification.replicationSlots.unknownPluginSlotCount > 0 || classification.authCustomHooks.unrecognizedHookPatternCount > 0;
  return Object.freeze({
    classificationOnly: true,
    exactIsolationProved: false,
    unknownPrincipalOrBackendPresent,
    requiresOwnerDecision: unknownPrincipalOrBackendPresent,
    completeAuthConfigurationCoverage: classification.authCustomHooks.fullAuthConfigurationCoverage,
    completeOutboundWriterCoverage: classification.publicWebhookTriggers.fullOutboundWriterCoverage,
  });
}

export function readAndAssertDatabaseWriterClassificationSql(path) {
  const sql = readFileSync(path, 'utf8');
  assertDatabaseWriterClassificationSql(sql);
  return sql;
}
