-- Aggregate-only compatibility observation for the staffing RPC replacement.
-- It deliberately returns no table rows, function definitions, ACL text, or
-- unexpected principal names. The function body is represented only by a
-- SHA-256 provenance digest and is never semantic acceptance evidence.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

WITH expected AS (
  SELECT to_regprocedure('public.update_staffing_need(text,integer,uuid)') AS routine_oid,
    to_regclass('public.staffing_needs') AS needs_oid,
    to_regclass('public.staffing_needs_changelog') AS changelog_oid,
    to_regclass('public.users') AS users_oid
),
routine AS (
  SELECT procedure_row.*,
    namespace_row.nspname AS schema_name,
    language_row.lanname AS language_name,
    owner_role.rolname AS owner_name
  FROM expected
  LEFT JOIN pg_proc AS procedure_row ON procedure_row.oid = expected.routine_oid
  LEFT JOIN pg_namespace AS namespace_row ON namespace_row.oid = procedure_row.pronamespace
  LEFT JOIN pg_language AS language_row ON language_row.oid = procedure_row.prolang
  LEFT JOIN pg_roles AS owner_role ON owner_role.oid = procedure_row.proowner
),
routine_acl AS (
  SELECT
    coalesce(jsonb_agg(DISTINCT CASE
      WHEN acl_row.grantee = 0 THEN 'PUBLIC'
      WHEN grantee_role.rolname IN ('anon', 'authenticated', 'service_role') THEN grantee_role.rolname
      ELSE '<unexpected>' END ORDER BY CASE
        WHEN acl_row.grantee = 0 THEN 'PUBLIC'
        WHEN grantee_role.rolname IN ('anon', 'authenticated', 'service_role') THEN grantee_role.rolname
        ELSE '<unexpected>' END) FILTER (WHERE acl_row.privilege_type = 'EXECUTE' AND acl_row.grantee <> routine.proowner), '[]'::jsonb) AS execute_grantees,
    coalesce(bool_or(acl_row.is_grantable) FILTER (WHERE acl_row.privilege_type = 'EXECUTE' AND acl_row.grantee <> routine.proowner), false) AS execute_grant_options,
    coalesce(bool_or(acl_row.privilege_type <> 'EXECUTE') FILTER (WHERE acl_row.grantee <> routine.proowner), false) AS non_execute_privileges
  FROM routine
  LEFT JOIN LATERAL aclexplode(coalesce(routine.proacl, acldefault('f', routine.proowner))) AS acl_row ON true
  LEFT JOIN pg_roles AS grantee_role ON grantee_role.oid = acl_row.grantee
  GROUP BY routine.oid, routine.proowner
),
routine_arguments AS (
  SELECT routine.oid,
    coalesce(jsonb_agg(jsonb_build_object(
      'mode', CASE coalesce(routine.proargmodes[argument.ordinality], 'i') WHEN 'i' THEN 'IN' ELSE '<unexpected>' END,
      'name', CASE coalesce(routine.proargnames[argument.ordinality], '')
        WHEN 'p_location' THEN 'p_location' WHEN 'p_new_value' THEN 'p_new_value'
        WHEN 'p_user_id' THEN 'p_user_id' ELSE '<unexpected>' END,
      'type', CASE argument.type_oid::regtype::text
        WHEN 'text' THEN 'text' WHEN 'integer' THEN 'integer' WHEN 'uuid' THEN 'uuid'
        ELSE '<unexpected>' END
    ) ORDER BY argument.ordinality) FILTER (WHERE coalesce(routine.proargmodes[argument.ordinality], 'i') IN ('i', 'b', 'v')), '[]'::jsonb) AS input_arguments,
    coalesce(jsonb_agg(jsonb_build_object(
      'mode', CASE routine.proargmodes[argument.ordinality] WHEN 'o' THEN 'OUT' WHEN 't' THEN 'OUT' ELSE '<unexpected>' END,
      'name', CASE coalesce(routine.proargnames[argument.ordinality], '')
        WHEN 'old_value' THEN 'old_value' WHEN 'new_value' THEN 'new_value' ELSE '<unexpected>' END,
      'type', CASE argument.type_oid::regtype::text WHEN 'integer' THEN 'integer' ELSE '<unexpected>' END
    ) ORDER BY argument.ordinality) FILTER (WHERE routine.proargmodes[argument.ordinality] IN ('o', 't')), '[]'::jsonb) AS output_arguments
  FROM routine
  LEFT JOIN LATERAL unnest(coalesce(routine.proallargtypes, routine.proargtypes::oid[])) WITH ORDINALITY AS argument(type_oid, ordinality) ON true
  GROUP BY routine.oid
),
columns AS (
  SELECT relation_row.relname AS relation_name, attribute_row.attnum,
    CASE attribute_row.attname
      WHEN 'id' THEN 'id' WHEN 'location' THEN 'location' WHEN 'headcount_need' THEN 'headcount_need'
      WHEN 'updated_at' THEN 'updated_at' WHEN 'updated_by' THEN 'updated_by' WHEN 'old_value' THEN 'old_value'
      WHEN 'new_value' THEN 'new_value' WHEN 'changed_by' THEN 'changed_by' WHEN 'changed_at' THEN 'changed_at'
      ELSE '<unexpected>' END AS name,
    CASE attribute_row.atttypid::regtype::text
      WHEN 'uuid' THEN 'uuid' WHEN 'text' THEN 'text' WHEN 'integer' THEN 'integer'
      WHEN 'timestamp with time zone' THEN 'timestamp with time zone' ELSE '<unexpected>' END AS type,
    NOT attribute_row.attnotnull AS nullable,
    CASE
      WHEN default_row.oid IS NULL THEN NULL
      WHEN pg_get_expr(default_row.adbin, default_row.adrelid) = 'gen_random_uuid()' THEN 'gen_random_uuid()'
      WHEN pg_get_expr(default_row.adbin, default_row.adrelid) = '0' THEN '0'
      WHEN pg_get_expr(default_row.adbin, default_row.adrelid) = 'now()' THEN 'now()'
      ELSE '<unexpected>' END AS default_value
  FROM expected
  JOIN pg_class AS relation_row ON relation_row.oid IN (expected.needs_oid, expected.changelog_oid)
  JOIN pg_attribute AS attribute_row ON attribute_row.attrelid = relation_row.oid
  LEFT JOIN pg_attrdef AS default_row ON default_row.adrelid = attribute_row.attrelid AND default_row.adnum = attribute_row.attnum
  WHERE attribute_row.attnum > 0 AND NOT attribute_row.attisdropped
),
constraints AS (
  SELECT constraint_row.*, regexp_replace(pg_get_expr(constraint_row.conbin, constraint_row.conrelid), '\s+', '', 'g') AS check_expression
  FROM expected
  JOIN pg_constraint AS constraint_row ON constraint_row.conrelid IN (expected.needs_oid, expected.changelog_oid)
),
dependency_profile AS (
  SELECT
    coalesce((SELECT jsonb_agg(jsonb_build_object('name', name, 'type', type, 'nullable', nullable, 'default', default_value) ORDER BY attnum)
      FROM columns WHERE relation_name = 'staffing_needs'), '[]'::jsonb) AS staffing_needs_columns,
    coalesce((SELECT jsonb_agg(jsonb_build_object('name', name, 'type', type, 'nullable', nullable, 'default', default_value) ORDER BY attnum)
      FROM columns WHERE relation_name = 'staffing_needs_changelog'), '[]'::jsonb) AS staffing_changelog_columns,
    (SELECT count(*) = 1 FROM constraints, expected WHERE conrelid = needs_oid AND contype = 'p' AND conname = 'staffing_needs_pkey' AND conkey = ARRAY[1]::smallint[] AND convalidated) AS needs_pk,
    (SELECT count(*) = 1 FROM constraints, expected WHERE conrelid = needs_oid AND contype = 'u' AND conname = 'staffing_needs_location_key' AND conkey = ARRAY[2]::smallint[] AND convalidated) AS needs_location_unique,
    (SELECT count(*) = 1 FROM constraints, expected WHERE conrelid = needs_oid AND contype = 'c' AND convalidated
      AND conname = 'staffing_needs_location_check'
      AND check_expression = '(location=ANY(ARRAY[''Trelleborg''::text,''Göteborg''::text]))') AS needs_location_check,
    (SELECT count(*) = 1 FROM constraints, expected WHERE conrelid = needs_oid AND contype = 'c' AND convalidated
      AND conname = 'staffing_needs_headcount_need_check'
      AND check_expression = '(headcount_need>=0)') AS needs_headcount_check,
    (SELECT count(*) = 1 FROM constraints, expected WHERE conrelid = needs_oid AND contype = 'f' AND conkey = ARRAY[5]::smallint[]
      AND conname = 'staffing_needs_updated_by_fkey' AND confrelid = users_oid AND confkey = ARRAY[1]::smallint[]
      AND confdeltype = 'a' AND confupdtype = 'a' AND confmatchtype = 's' AND NOT condeferrable AND NOT condeferred AND convalidated) AS needs_updated_by_fk,
    (SELECT count(*) = 1 FROM constraints, expected WHERE conrelid = changelog_oid AND contype = 'p' AND conname = 'staffing_needs_changelog_pkey' AND conkey = ARRAY[1]::smallint[] AND convalidated) AS changelog_pk,
    (SELECT count(*) = 1 FROM constraints, expected WHERE conrelid = changelog_oid AND contype = 'f' AND conkey = ARRAY[5]::smallint[]
      AND conname = 'staffing_needs_changelog_changed_by_fkey' AND confrelid = users_oid AND confkey = ARRAY[1]::smallint[]
      AND confdeltype = 'a' AND confupdtype = 'a' AND confmatchtype = 's' AND NOT condeferrable AND NOT condeferred AND convalidated) AS changelog_changed_by_fk,
    (SELECT coalesce(bool_and(relation_row.relrowsecurity), false) FROM pg_class AS relation_row, expected
      WHERE relation_row.oid IN (needs_oid, changelog_oid)) AS both_rls_enabled,
    (SELECT count(*)::bigint FROM public.staffing_needs WHERE headcount_need < 0 OR headcount_need > 9999) AS out_of_range_count
  FROM expected
)
SELECT jsonb_build_object(
  'routine', jsonb_build_object(
    'signature', coalesce((SELECT schema_name || '.' || proname || '(' || replace(oidvectortypes(proargtypes), ' ', '') || ')' FROM routine), '<unexpected>'),
    'exactOverloadCount', (SELECT count(*)::integer FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'update_staffing_need'),
    'owner', coalesce((SELECT CASE WHEN owner_name = 'postgres' THEN 'postgres' ELSE '<unexpected>' END FROM routine), '<unexpected>'),
    'language', coalesce((SELECT CASE WHEN language_name = 'plpgsql' THEN 'plpgsql' ELSE '<unexpected>' END FROM routine), '<unexpected>'),
    'kind', coalesce((SELECT CASE WHEN prokind = 'f' THEN 'function' ELSE '<unexpected>' END FROM routine), '<unexpected>'),
    'securityDefiner', coalesce((SELECT prosecdef FROM routine), true),
    'config', (SELECT CASE WHEN proconfig IS NULL THEN NULL ELSE jsonb_build_array('<configured>') END FROM routine),
    'nonOwnerExecuteGrantees', coalesce((SELECT execute_grantees FROM routine_acl), '[]'::jsonb),
    'nonOwnerExecuteGrantOptions', coalesce((SELECT execute_grant_options FROM routine_acl), true),
    'nonExecuteAclPrivileges', coalesce((SELECT non_execute_privileges FROM routine_acl), true),
    'returnShape', coalesce((SELECT CASE WHEN pg_get_function_result(oid) = 'TABLE(old_value integer, new_value integer)' THEN 'TABLE(old_value integer,new_value integer)' ELSE '<unexpected>' END FROM routine), '<unexpected>'),
    'inputArguments', coalesce((SELECT input_arguments FROM routine_arguments), '[]'::jsonb),
    'outputArguments', coalesce((SELECT output_arguments FROM routine_arguments), '[]'::jsonb),
    'volatility', coalesce((SELECT CASE provolatile WHEN 'v' THEN 'volatile' ELSE '<unexpected>' END FROM routine), '<unexpected>'),
    'parallel', coalesce((SELECT CASE proparallel WHEN 'u' THEN 'unsafe' ELSE '<unexpected>' END FROM routine), '<unexpected>'),
    'strict', coalesce((SELECT proisstrict FROM routine), true),
    'leakproof', coalesce((SELECT proleakproof FROM routine), true)
  ),
  'dependencies', jsonb_build_object(
    'staffingNeedsColumns', staffing_needs_columns,
    'staffingChangelogColumns', staffing_changelog_columns,
    'staffingNeedsPrimaryKey', needs_pk,
    'staffingNeedsLocationUnique', needs_location_unique,
    'staffingNeedsLocationCheck', needs_location_check,
    'staffingNeedsHeadcountCheck', needs_headcount_check,
    'staffingNeedsUpdatedByUsersForeignKey', needs_updated_by_fk,
    'staffingChangelogPrimaryKey', changelog_pk,
    'staffingChangelogChangedByUsersForeignKey', changelog_changed_by_fk,
    'bothTablesRlsEnabled', both_rls_enabled,
    'outOfRangeHeadcountCount', out_of_range_count
  ),
  'bodyProvenance', jsonb_build_object(
    'kind', 'non_admitted_sha256',
    'sha256', coalesce((SELECT encode(sha256(convert_to(pg_get_functiondef(oid), 'UTF8')), 'hex') FROM routine), '')
  )
)::text
FROM dependency_profile;

ROLLBACK;
