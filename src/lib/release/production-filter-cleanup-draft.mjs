import { createHash } from 'node:crypto';

export const PRODUCTION_FILTER_CLEANUP_EXPECTED = Object.freeze({
  preCleanup: Object.freeze({
    totalCount: 48,
    orphanAuthReferenceCount: 48,
    emptyNameCount: 0,
    overlengthNameCount: 0,
    rowIdentitySha256: 'b25b25ff02eaf7fa052b857e2b3865ef6945052629fd1743315ed25346d8db9b',
  }),
  postCleanup: Object.freeze({
    totalCount: 0,
    orphanAuthReferenceCount: 0,
    emptyNameCount: 0,
    overlengthNameCount: 0,
    rowIdentitySha256: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
  }),
  preservation: Object.freeze({
    audit: Object.freeze({
      rowCount: 1025,
      nonnullActorCount: 202,
      unmappedLegacyActorCount: 0,
      unmappedCanonicalActorCount: 202,
      stableFieldsSha256: '1986bd7d3a71299e73486332f895020acf2a865790a8eb7683c7affc8e58d593',
    }),
    repayment: Object.freeze({
      omcNullCount: 70,
      omcTrueCount: 2,
      omcFalseCount: 1,
      pe3NullCount: 70,
      pe3TrueCount: 2,
      pe3FalseCount: 1,
    }),
    permissionBaseline: Object.freeze({
      rowCount: 61,
      distinctColumnCount: 61,
      nullColumnCount: 0,
      nonobjectPermissionsCount: 0,
      rowsSha256: 'f0ed65806763de0eb6653583b5d2dcf86f3c3a8c75cc5d2b070ca301bb5625b1',
    }),
    staffingOutOfRangeCount: 0,
  }),
});

const expectedJson = JSON.stringify(PRODUCTION_FILTER_CLEANUP_EXPECTED);

// This source is intentionally a draft.  It is not wired to a runner, does
// not accept caller input, and cannot grant cleanup authority.  A future
// protected runner must hash-bind these exact bytes, prove isolation, and
// perform its own target/TLS/approval checks before it could execute it.
export const PRODUCTION_FILTER_CLEANUP_DRAFT_SQL = `
-- Story 22.15: separately authorized, one-transaction orphan saved-filter cleanup.
-- This script is a reviewed draft only. It is not an authorization to run it.
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET LOCAL statement_timeout = '45s';
SET LOCAL lock_timeout = '10s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- Freeze the only delete target and every relation used by the preservation
-- proof. Lock contention is a stop condition, not a reason to broaden scope.
LOCK TABLE public.user_filters IN ACCESS EXCLUSIVE MODE;
LOCK TABLE auth.users IN SHARE MODE;
LOCK TABLE public.users IN SHARE MODE;
LOCK TABLE public.employee_column_changes IN SHARE MODE;
LOCK TABLE public.employees IN SHARE MODE;
LOCK TABLE public.column_config IN SHARE MODE;
LOCK TABLE public.staffing_needs IN SHARE MODE;

CREATE TEMPORARY TABLE story_2215_filter_cleanup_target
  ON COMMIT DROP
AS
SELECT saved_filter.id, saved_filter.user_id, saved_filter.name
FROM public.user_filters AS saved_filter
WHERE NOT EXISTS (
  SELECT 1
  FROM auth.users AS auth_user
  WHERE auth_user.id = saved_filter.user_id
);

DO $cleanup_precondition$
DECLARE
  filter_total bigint;
  orphan_total bigint;
  empty_total bigint;
  overlength_total bigint;
  identity_sha256 text;
  target_total bigint;
  target_identity_sha256 text;
  preservation jsonb;
  expected_preservation constant jsonb := '${expectedJson}'::jsonb;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM auth.users AS auth_user WHERE auth_user.id = saved_filter.user_id
    )),
    count(*) FILTER (WHERE char_length(saved_filter.name) = 0),
    count(*) FILTER (WHERE char_length(saved_filter.name) > 50),
    encode(sha256(convert_to(coalesce(
      jsonb_agg(md5(saved_filter.id::text || ':' || saved_filter.user_id::text || ':' || saved_filter.name)
        ORDER BY saved_filter.id)::text,
      '[]'), 'UTF8')), 'hex')
  INTO filter_total, orphan_total, empty_total, overlength_total, identity_sha256
  FROM public.user_filters AS saved_filter;

  SELECT
    count(*),
    encode(sha256(convert_to(coalesce(
      jsonb_agg(md5(target.id::text || ':' || target.user_id::text || ':' || target.name)
        ORDER BY target.id)::text,
      '[]'), 'UTF8')), 'hex')
  INTO target_total, target_identity_sha256
  FROM pg_temp.story_2215_filter_cleanup_target AS target;

  IF filter_total <> 48 OR orphan_total <> 48 OR empty_total <> 0 OR overlength_total <> 0
    OR identity_sha256 <> 'b25b25ff02eaf7fa052b857e2b3865ef6945052629fd1743315ed25346d8db9b'
    OR target_total <> 48 OR target_identity_sha256 <> identity_sha256 THEN
    RAISE EXCEPTION 'story_2215_filter_cleanup_precondition_drift' USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_build_object(
    'audit', jsonb_build_object(
      'rowCount', count(*)::bigint,
      'nonnullActorCount', count(changed_by)::bigint,
      'unmappedLegacyActorCount', count(*) FILTER (WHERE changed_by IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.users AS app_user WHERE app_user.auth_user_id = audit.changed_by
      ))::bigint,
      'unmappedCanonicalActorCount', count(*) FILTER (WHERE changed_by IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.users AS app_user WHERE app_user.id = audit.changed_by
      ))::bigint,
      'stableFieldsSha256', encode(sha256(convert_to(coalesce(
        jsonb_agg(md5(employee_id::text || ':' || column_name || ':' || changed_at::text) ORDER BY id)::text,
        '[]'), 'UTF8')), 'hex')
    ),
    'repayment', (SELECT jsonb_build_object(
      'omcNullCount', count(*) FILTER (WHERE repayment_needed_omc IS NULL)::bigint,
      'omcTrueCount', count(*) FILTER (WHERE repayment_needed_omc IS TRUE)::bigint,
      'omcFalseCount', count(*) FILTER (WHERE repayment_needed_omc IS FALSE)::bigint,
      'pe3NullCount', count(*) FILTER (WHERE repayment_needed_pe3 IS NULL)::bigint,
      'pe3TrueCount', count(*) FILTER (WHERE repayment_needed_pe3 IS TRUE)::bigint,
      'pe3FalseCount', count(*) FILTER (WHERE repayment_needed_pe3 IS FALSE)::bigint
    ) FROM public.employees),
    'permissionBaseline', (SELECT jsonb_build_object(
      'rowCount', count(*)::bigint,
      'distinctColumnCount', count(DISTINCT db_column_name)::bigint,
      'nullColumnCount', count(*) FILTER (WHERE db_column_name IS NULL)::bigint,
      'nonobjectPermissionsCount', count(*) FILTER (WHERE coalesce(jsonb_typeof(role_permissions), 'null') <> 'object')::bigint,
      'rowsSha256', encode(sha256(convert_to(coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'column_name_md5', md5(coalesce(source.db_column_name, '')),
          'role_permissions_sha256', encode(sha256(convert_to(coalesce(source.role_permissions::text, ''), 'UTF8')), 'hex')
        ) ORDER BY source.db_column_name NULLS FIRST, source.role_permissions::text NULLS FIRST)::text
        FROM public.column_config AS source
      ), '[]'), 'UTF8')), 'hex')
    ) FROM public.column_config),
    'staffingOutOfRangeCount', (SELECT count(*)::bigint FROM public.staffing_needs
      WHERE headcount_need < 0 OR headcount_need > 9999)
  )
  INTO preservation
  FROM public.employee_column_changes AS audit;

  IF preservation IS DISTINCT FROM expected_preservation->'preservation' THEN
    RAISE EXCEPTION 'story_2215_filter_cleanup_preservation_drift' USING ERRCODE = 'P0001';
  END IF;
END
$cleanup_precondition$;

DO $cleanup_delete$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM public.user_filters AS saved_filter
  USING pg_temp.story_2215_filter_cleanup_target AS target
  WHERE saved_filter.id = target.id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count <> 48 THEN
    RAISE EXCEPTION 'story_2215_filter_cleanup_delete_count_drift' USING ERRCODE = 'P0001';
  END IF;
END
$cleanup_delete$;

-- The mutation has exactly one transaction. This commit is followed by an
-- independent read-only transaction so the recorded receipt proves persistence.
COMMIT;

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '10s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

DO $cleanup_postcondition$
DECLARE
  filter_total bigint;
  orphan_total bigint;
  empty_total bigint;
  overlength_total bigint;
  identity_sha256 text;
  preservation jsonb;
  expected_result constant jsonb := '${expectedJson}'::jsonb;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM auth.users AS auth_user WHERE auth_user.id = saved_filter.user_id
    )),
    count(*) FILTER (WHERE char_length(saved_filter.name) = 0),
    count(*) FILTER (WHERE char_length(saved_filter.name) > 50),
    encode(sha256(convert_to(coalesce(
      jsonb_agg(md5(saved_filter.id::text || ':' || saved_filter.user_id::text || ':' || saved_filter.name)
        ORDER BY saved_filter.id)::text,
      '[]'), 'UTF8')), 'hex')
  INTO filter_total, orphan_total, empty_total, overlength_total, identity_sha256
  FROM public.user_filters AS saved_filter;
  IF filter_total <> 0 OR orphan_total <> 0 OR empty_total <> 0 OR overlength_total <> 0
    OR identity_sha256 <> '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945' THEN
    RAISE EXCEPTION 'story_2215_filter_cleanup_postcondition_drift' USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_build_object(
    'audit', jsonb_build_object(
      'rowCount', count(*)::bigint,
      'nonnullActorCount', count(changed_by)::bigint,
      'unmappedLegacyActorCount', count(*) FILTER (WHERE changed_by IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.users AS app_user WHERE app_user.auth_user_id = audit.changed_by
      ))::bigint,
      'unmappedCanonicalActorCount', count(*) FILTER (WHERE changed_by IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.users AS app_user WHERE app_user.id = audit.changed_by
      ))::bigint,
      'stableFieldsSha256', encode(sha256(convert_to(coalesce(
        jsonb_agg(md5(employee_id::text || ':' || column_name || ':' || changed_at::text) ORDER BY id)::text,
        '[]'), 'UTF8')), 'hex')
    ),
    'repayment', (SELECT jsonb_build_object(
      'omcNullCount', count(*) FILTER (WHERE repayment_needed_omc IS NULL)::bigint,
      'omcTrueCount', count(*) FILTER (WHERE repayment_needed_omc IS TRUE)::bigint,
      'omcFalseCount', count(*) FILTER (WHERE repayment_needed_omc IS FALSE)::bigint,
      'pe3NullCount', count(*) FILTER (WHERE repayment_needed_pe3 IS NULL)::bigint,
      'pe3TrueCount', count(*) FILTER (WHERE repayment_needed_pe3 IS TRUE)::bigint,
      'pe3FalseCount', count(*) FILTER (WHERE repayment_needed_pe3 IS FALSE)::bigint
    ) FROM public.employees),
    'permissionBaseline', (SELECT jsonb_build_object(
      'rowCount', count(*)::bigint,
      'distinctColumnCount', count(DISTINCT db_column_name)::bigint,
      'nullColumnCount', count(*) FILTER (WHERE db_column_name IS NULL)::bigint,
      'nonobjectPermissionsCount', count(*) FILTER (WHERE coalesce(jsonb_typeof(role_permissions), 'null') <> 'object')::bigint,
      'rowsSha256', encode(sha256(convert_to(coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'column_name_md5', md5(coalesce(source.db_column_name, '')),
          'role_permissions_sha256', encode(sha256(convert_to(coalesce(source.role_permissions::text, ''), 'UTF8')), 'hex')
        ) ORDER BY source.db_column_name NULLS FIRST, source.role_permissions::text NULLS FIRST)::text
        FROM public.column_config AS source
      ), '[]'), 'UTF8')), 'hex')
    ) FROM public.column_config),
    'staffingOutOfRangeCount', (SELECT count(*)::bigint FROM public.staffing_needs
      WHERE headcount_need < 0 OR headcount_need > 9999)
  )
  INTO preservation
  FROM public.employee_column_changes AS audit;
  IF preservation IS DISTINCT FROM expected_result->'preservation' THEN
    RAISE EXCEPTION 'story_2215_filter_cleanup_post_preservation_drift' USING ERRCODE = 'P0001';
  END IF;
END
$cleanup_postcondition$;

SELECT jsonb_build_object(
  'schemaVersion', 1,
  'kind', 'production-filter-cleanup-draft',
  'committedCleanupTransaction', true,
  'transactionAssertedDeletedCount', 48,
  'preCleanup', '${expectedJson}'::jsonb->'preCleanup',
  'postCleanup', '${expectedJson}'::jsonb->'postCleanup',
  'preservation', '${expectedJson}'::jsonb->'preservation'
)::text;
COMMIT;
`.trimStart();

export const PRODUCTION_FILTER_CLEANUP_DRAFT_SQL_SHA256 =
  '39d3505a06402761b58480bbf608f9f52771d33dc28d9d09babf6e5cfa6941a2';

const expectedReceipt = Object.freeze({
  schemaVersion: 1,
  kind: 'production-filter-cleanup-draft',
  committedCleanupTransaction: true,
  transactionAssertedDeletedCount: 48,
  ...PRODUCTION_FILTER_CLEANUP_EXPECTED,
});

const same = (actual, expected) => {
  if (Object.is(actual, expected)) return true;
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length
      && actual.every((entry, index) => same(entry, expected[index]));
  }
  if (expected !== null && typeof expected === 'object') {
    return actual !== null && typeof actual === 'object' && !Array.isArray(actual)
      && Object.keys(actual).length === Object.keys(expected).length
      && Object.keys(expected).every((key) => Object.hasOwn(actual, key) && same(actual[key], expected[key]));
  }
  return false;
};

/**
 * Accepts the one redacted post-commit receipt emitted by the fixed draft.
 * It deliberately returns evidence only; the caller still needs separate
 * owner authorization, isolation proof, protected execution, and independent
 * release verification.
 */
export function evaluateProductionFilterCleanupDraftReceipt(rawReceipt) {
  if (typeof rawReceipt !== 'string') {
    throw new Error('production_filter_cleanup_receipt_invalid');
  }
  const lines = rawReceipt.split(/\r?\n/u).filter((line) => line.length > 0);
  if (lines.length !== 1) throw new Error('production_filter_cleanup_receipt_invalid');
  let receipt;
  try {
    receipt = JSON.parse(lines[0]);
  } catch {
    throw new Error('production_filter_cleanup_receipt_invalid');
  }
  if (!same(receipt, expectedReceipt)) {
    throw new Error('production_filter_cleanup_receipt_invalid');
  }
  return Object.freeze({
    ...expectedReceipt,
    sqlSha256: PRODUCTION_FILTER_CLEANUP_DRAFT_SQL_SHA256,
    disposition: 'verified_cleanup_receipt_not_authorization',
    authorizesCleanup: false,
    authorizesMigrationApply: false,
  });
}

export function verifyProductionFilterCleanupDraftSource(sql = PRODUCTION_FILTER_CLEANUP_DRAFT_SQL) {
  if (typeof sql !== 'string' || createHash('sha256').update(sql, 'utf8').digest('hex')
    !== PRODUCTION_FILTER_CLEANUP_DRAFT_SQL_SHA256) {
    throw new Error('production_filter_cleanup_source_integrity_invalid');
  }
  return true;
}
