-- NON-EXECUTED DRAFT. This collector is read-only and returns only
-- booleans, counts, and SHA-256 values. It deliberately never returns a
-- role name from the target, permission JSON, or any application row value.
-- A reviewed runner must perform its own source, tooling, target and TLS
-- admission before it may send this text to a target.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

WITH expected_column(column_name) AS (
  VALUES ('repayment_needed_omc'), ('repayment_needed_pe3')
), expected_role(role_name) AS (
  VALUES
    ('hr_admin'), ('recruiter'), ('sodexo'), ('omc'),
    ('payroll'), ('toplux'), ('crewing'), ('admin_limited')
), all_config AS (
  SELECT c.db_column_name, c.role_permissions
  FROM public.column_config c
), permission_baseline AS (
  SELECT
    count(*)::integer AS row_count,
    count(DISTINCT db_column_name)::integer AS distinct_column_count,
    count(*) FILTER (WHERE role_permissions IS NULL)::integer AS null_column_count,
    count(*) FILTER (WHERE role_permissions IS NOT NULL AND jsonb_typeof(role_permissions) <> 'object')::integer AS non_object_count,
    coalesce(sum((
      SELECT count(*)::integer
      FROM jsonb_object_keys(CASE WHEN jsonb_typeof(c.role_permissions) = 'object' THEN c.role_permissions ELSE '{}'::jsonb END) AS role(key_name)
      WHERE role.key_name NOT IN (SELECT role_name FROM expected_role)
    )), 0)::integer AS unknown_role_entry_count,
    coalesce(sum((
      SELECT count(*)::integer
      FROM jsonb_each(CASE WHEN jsonb_typeof(c.role_permissions) = 'object' THEN c.role_permissions ELSE '{}'::jsonb END) AS role(role_name, role_value)
      WHERE role.role_name IN (SELECT role_name FROM expected_role)
        AND NOT (
          jsonb_typeof(role.role_value) = 'object'
          AND (SELECT count(*) FROM jsonb_object_keys(role.role_value)) = 2
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_object_keys(role.role_value) AS predicate(key_name)
            WHERE predicate.key_name NOT IN ('view', 'edit')
          )
          AND jsonb_typeof(role.role_value -> 'view') = 'boolean'
          AND jsonb_typeof(role.role_value -> 'edit') = 'boolean'
        )
    )), 0)::integer AS invalid_known_role_contract_count,
    encode(sha256(convert_to(coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'column_name_md5', md5(coalesce(source.db_column_name, '')),
          'role_permissions_sha256', encode(sha256(convert_to(coalesce(source.role_permissions::text, ''), 'UTF8')), 'hex')
        )
        ORDER BY source.db_column_name NULLS FIRST, source.role_permissions::text NULLS FIRST
      )::text
      FROM all_config source
    ), '[]'), 'UTF8')), 'hex') AS rows_sha256
  FROM all_config c
), matching_rows AS (
  SELECT c.db_column_name, c.role_permissions
  FROM public.column_config c
  JOIN expected_column e ON e.column_name = c.db_column_name
), row_stats AS (
  SELECT
    e.column_name,
    count(m.db_column_name)::integer AS row_count
  FROM expected_column e
  LEFT JOIN matching_rows m ON m.db_column_name = e.column_name
  GROUP BY e.column_name
), one_row AS (
  -- Do not inspect a permission object until exactly one configuration row
  -- exists for the fixed column. This makes duplicate configuration rows a
  -- hard validation failure rather than an arbitrary selection.
  SELECT s.column_name, m.role_permissions
  FROM row_stats s
  JOIN matching_rows m ON m.db_column_name = s.column_name
  WHERE s.row_count = 1
), role_profile AS (
  SELECT
    e.column_name,
    r.role_name,
    coalesce(o.role_permissions ? r.role_name, false) AS role_present,
    coalesce(jsonb_typeof(p.value) = 'object', false) AS role_is_object,
    CASE WHEN jsonb_typeof(p.value) = 'object' THEN (
      SELECT count(*)::integer FROM jsonb_object_keys(p.value)
    ) ELSE NULL END AS key_count,
    CASE WHEN jsonb_typeof(p.value) = 'object' THEN (
      SELECT count(*)::integer
      FROM jsonb_object_keys(p.value) AS predicate(key_name)
      WHERE predicate.key_name NOT IN ('view', 'edit')
    ) ELSE NULL END AS unknown_predicate_key_count,
    coalesce(jsonb_typeof(p.value -> 'view') = 'boolean', false) AS view_is_boolean,
    CASE WHEN jsonb_typeof(p.value -> 'view') = 'boolean'
      THEN (p.value ->> 'view')::boolean ELSE NULL END AS view,
    coalesce(jsonb_typeof(p.value -> 'edit') = 'boolean', false) AS edit_is_boolean,
    CASE WHEN jsonb_typeof(p.value -> 'edit') = 'boolean'
      THEN (p.value ->> 'edit')::boolean ELSE NULL END AS edit
  FROM expected_column e
  CROSS JOIN expected_role r
  LEFT JOIN one_row o ON o.column_name = e.column_name
  LEFT JOIN LATERAL (SELECT o.role_permissions -> r.role_name AS value) p ON true
), column_profile AS (
  SELECT
    e.column_name,
    s.row_count,
    coalesce(jsonb_typeof(o.role_permissions) = 'object', false) AS role_permissions_is_object,
    CASE WHEN jsonb_typeof(o.role_permissions) = 'object' THEN (
      SELECT count(*)::integer FROM jsonb_object_keys(o.role_permissions)
    ) ELSE NULL END AS role_key_count,
    CASE WHEN jsonb_typeof(o.role_permissions) = 'object' THEN (
      SELECT count(*)::integer
      FROM jsonb_object_keys(o.role_permissions) AS role(key_name)
      WHERE role.key_name NOT IN (SELECT role_name FROM expected_role)
    ) ELSE NULL END AS unknown_role_count,
    CASE WHEN o.role_permissions IS NOT NULL
      THEN encode(sha256(convert_to(o.role_permissions::text, 'UTF8')), 'hex') ELSE NULL END AS role_permissions_sha256,
    jsonb_object_agg(
      rp.role_name,
      jsonb_build_object(
        'role_is_object', rp.role_is_object,
        'role_present', rp.role_present,
        'key_count', rp.key_count,
        'unknown_predicate_key_count', rp.unknown_predicate_key_count,
        'view_is_boolean', rp.view_is_boolean,
        'view', rp.view,
        'edit_is_boolean', rp.edit_is_boolean,
        'edit', rp.edit
      )
      ORDER BY rp.role_name
    ) AS role_predicates
  FROM expected_column e
  JOIN row_stats s ON s.column_name = e.column_name
  LEFT JOIN one_row o ON o.column_name = e.column_name
  JOIN role_profile rp ON rp.column_name = e.column_name
  GROUP BY e.column_name, s.row_count, o.role_permissions
)
SELECT jsonb_build_object(
  'draft', true,
  'executable', false,
  'permissionBaseline', (
    SELECT jsonb_build_object(
      'rowCount', row_count,
      'distinctColumnCount', distinct_column_count,
      'nullColumnCount', null_column_count,
      'nonObjectCount', non_object_count,
      'unknownRoleEntryCount', unknown_role_entry_count,
      'invalidKnownRoleContractCount', invalid_known_role_contract_count,
      'rowsSha256', rows_sha256
    )
    FROM permission_baseline
  ),
  'columns', (
    SELECT jsonb_object_agg(
      column_name,
      jsonb_build_object(
        'row_count', row_count,
        'role_permissions_is_object', role_permissions_is_object,
        'role_key_count', role_key_count,
        'unknown_role_count', unknown_role_count,
        'role_permissions_sha256', role_permissions_sha256,
        'role_predicates', role_predicates
      )
      ORDER BY column_name
    )
    FROM column_profile
  )
);
ROLLBACK;
