import { createHash } from 'node:crypto';

export const REPAYMENT_COLUMNS = Object.freeze(['repayment_needed_omc', 'repayment_needed_pe3']);
export const KNOWN_ROLES = Object.freeze([
  'hr_admin', 'recruiter', 'sodexo', 'omc', 'payroll', 'toplux', 'crewing', 'admin_limited',
]);

const HASH64 = /^[a-f0-9]{64}$/iu;
const PREDICATE_KEYS = Object.freeze([
  'role_present',
  'role_is_object',
  'key_count',
  'unknown_predicate_key_count',
  'view_is_boolean',
  'view',
  'edit_is_boolean',
  'edit',
]);
const COLUMN_KEYS = Object.freeze([
  'row_count',
  'role_permissions_is_object',
  'role_key_count',
  'unknown_role_count',
  'role_permissions_sha256',
  'role_predicates',
]);

function invalid(code = 'permission_profile_shape_invalid') {
  throw new Error(code);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, keys) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function countOrNull(value) {
  return value === null || (Number.isSafeInteger(value) && value >= 0);
}

function pgJsonbKeyOrder(left, right) {
  const byteLengthDifference = Buffer.byteLength(left, 'utf8') - Buffer.byteLength(right, 'utf8');
  if (byteLengthDifference !== 0) return byteLengthDifference;
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

// PostgreSQL renders jsonb object keys by UTF-8 byte length and then bytewise
// comparison. The collector only admits known ASCII keys and boolean leaves,
// so this formatter is intentionally narrow and verifies the server's
// role_permissions::text SHA-256 without retaining JSON from the target.
export function canonicalPostgresJsonb(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (!isPlainObject(value)) invalid('permission_reconstruction_invalid');
  return `{${Object.keys(value).sort(pgJsonbKeyOrder).map((key) => `${JSON.stringify(key)}: ${canonicalPostgresJsonb(value[key])}`).join(', ')}}`;
}

export function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function reconstructColumn(columnName, column) {
  if (!exactKeys(column, COLUMN_KEYS)
    || !Number.isSafeInteger(column.row_count) || column.row_count < 0
    || typeof column.role_permissions_is_object !== 'boolean'
    || !countOrNull(column.role_key_count)
    || !countOrNull(column.unknown_role_count)
    || !(column.role_permissions_sha256 === null || (typeof column.role_permissions_sha256 === 'string' && HASH64.test(column.role_permissions_sha256)))
    || !exactKeys(column.role_predicates, KNOWN_ROLES)) invalid('permission_column_shape_invalid');

  if (column.row_count !== 1) invalid('permission_duplicate_or_missing_column');
  if (!column.role_permissions_is_object || column.role_key_count > KNOWN_ROLES.length || column.unknown_role_count !== 0 || !HASH64.test(column.role_permissions_sha256 ?? '')) {
    invalid('permission_role_map_invalid');
  }

  const map = {};
  let presentCount = 0;
  for (const roleName of KNOWN_ROLES) {
    const predicate = column.role_predicates[roleName];
    if (!exactKeys(predicate, PREDICATE_KEYS)
      || typeof predicate.role_present !== 'boolean'
      || typeof predicate.role_is_object !== 'boolean'
      || !countOrNull(predicate.key_count)
      || !countOrNull(predicate.unknown_predicate_key_count)
      || typeof predicate.view_is_boolean !== 'boolean'
      || !(predicate.view === null || typeof predicate.view === 'boolean')
      || typeof predicate.edit_is_boolean !== 'boolean'
      || !(predicate.edit === null || typeof predicate.edit === 'boolean')) invalid('permission_predicate_shape_invalid');

    if (!predicate.role_present) {
      if (predicate.role_is_object || predicate.key_count !== null || predicate.unknown_predicate_key_count !== null
        || predicate.view_is_boolean || predicate.view !== null || predicate.edit_is_boolean || predicate.edit !== null) {
        invalid('permission_absent_predicate_invalid');
      }
      continue;
    }
    presentCount += 1;
    if (!predicate.role_is_object
      || predicate.key_count !== 2
      || predicate.unknown_predicate_key_count !== 0
      || !predicate.view_is_boolean || typeof predicate.view !== 'boolean'
      || !predicate.edit_is_boolean || typeof predicate.edit !== 'boolean') invalid('permission_predicate_invalid');
    map[roleName] = Object.freeze({ view: predicate.view, edit: predicate.edit });
  }

  if (presentCount !== column.role_key_count) invalid('permission_role_count_mismatch');

  const canonical = canonicalPostgresJsonb(map);
  const canonicalSha256 = sha256(canonical);
  if (canonicalSha256 !== column.role_permissions_sha256.toLowerCase()) invalid(`permission_canonical_hash_mismatch_${columnName}`);
  return { map: Object.freeze(map), canonicalSha256 };
}

export function validatePermissionProfile(rawObject) {
  if (!exactKeys(rawObject, ['draft', 'executable', 'columns', 'permissionBaseline'])
    || rawObject.draft !== true || rawObject.executable !== false
    || !exactKeys(rawObject.columns, REPAYMENT_COLUMNS)) invalid();

  const baseline = rawObject.permissionBaseline;
  const baselineKeys = ['rowCount', 'distinctColumnCount', 'nullColumnCount', 'nonObjectCount', 'unknownRoleEntryCount', 'invalidKnownRoleContractCount', 'rowsSha256'];
  if (!exactKeys(baseline, baselineKeys)
    || !Number.isSafeInteger(baseline.rowCount) || !Number.isSafeInteger(baseline.distinctColumnCount)
    || !Number.isSafeInteger(baseline.nullColumnCount) || !Number.isSafeInteger(baseline.nonObjectCount)
    || !Number.isSafeInteger(baseline.unknownRoleEntryCount) || !Number.isSafeInteger(baseline.invalidKnownRoleContractCount)
    || ![baseline.rowCount, baseline.distinctColumnCount, baseline.nullColumnCount, baseline.nonObjectCount, baseline.unknownRoleEntryCount, baseline.invalidKnownRoleContractCount].every((value) => value >= 0)
    || typeof baseline.rowsSha256 !== 'string' || !HASH64.test(baseline.rowsSha256)) invalid('permission_baseline_shape_invalid');
  if (baseline.rowCount !== 61 || baseline.distinctColumnCount !== 61 || baseline.nullColumnCount !== 0
    || baseline.nonObjectCount !== 0 || baseline.unknownRoleEntryCount !== 0 || baseline.invalidKnownRoleContractCount !== 0) {
    invalid('permission_baseline_contract_invalid');
  }

  const permissions = {};
  const canonicalPermissionSha256 = {};
  for (const columnName of REPAYMENT_COLUMNS) {
    const reconstructed = reconstructColumn(columnName, rawObject.columns[columnName]);
    permissions[columnName] = reconstructed.map;
    canonicalPermissionSha256[columnName] = reconstructed.canonicalSha256;
  }
  return Object.freeze({
    profile: rawObject,
    permissions: Object.freeze(permissions),
    canonicalPermissionSha256: Object.freeze(canonicalPermissionSha256),
    permissionBaseline: baseline,
  });
}
