-- NON-EXECUTED DRAFT. This file is evidence collection only; it has no authority
-- to access a target, clean data, apply migrations, repair history, or accept a
-- production profile. Intended source identity: c31227ad68d91c0a471b611811bc618cbf3535a2.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

-- The required relations are queried only after this first, catalog-only result.
-- A runner must stop (rather than issue later aggregate statements) unless every
-- required_relation_exists value is true. No ::regclass cast is used for an
-- unverified object name.
WITH relation_inventory(label, schema_name, relation_name) AS (
  VALUES
    ('history', 'supabase_migrations', 'schema_migrations'),
    ('saved_filters', 'public', 'user_filters'),
    ('auth_users', 'auth', 'users'),
    ('app_users', 'public', 'users'),
    ('audit', 'public', 'employee_column_changes'),
    ('column_config', 'public', 'column_config'),
    ('employees', 'public', 'employees'),
    ('staffing_needs', 'public', 'staffing_needs')
), relation_oids AS (
  SELECT label, to_regclass(format('%I.%I', schema_name, relation_name)) AS relation_oid
  FROM relation_inventory
), required_columns(label, relation_name, column_name) AS (
  VALUES
    ('history_version','supabase_migrations.schema_migrations','version'),
    ('saved_filter_id','public.user_filters','id'),('saved_filter_user_id','public.user_filters','user_id'),('saved_filter_name','public.user_filters','name'),
    ('audit_id','public.employee_column_changes','id'),('audit_changed_by','public.employee_column_changes','changed_by'),('audit_employee_id','public.employee_column_changes','employee_id'),('audit_column_name','public.employee_column_changes','column_name'),('audit_changed_at','public.employee_column_changes','changed_at'),
    ('employee_repayment_omc','public.employees','repayment_needed_omc'),('employee_repayment_pe3','public.employees','repayment_needed_pe3'),
    ('staffing_headcount','public.staffing_needs','headcount_need'),
    ('column_config_name','public.column_config','db_column_name'),('column_config_permissions','public.column_config','role_permissions'),
    ('auth_user_id','auth.users','id'),('app_user_id','public.users','id'),('app_user_auth_user_id','public.users','auth_user_id')
), column_inventory AS (
  SELECT expected.label, EXISTS(SELECT 1 FROM pg_attribute a
    WHERE a.attrelid=to_regclass(expected.relation_name) AND a.attname=expected.column_name AND NOT a.attisdropped) AS object_present
  FROM required_columns expected
), target_functions(label, signature) AS (
  -- `trigger_set_updated_at` / `set_updated_at` are the immutable 20260130212612
  -- pair. `update_user_filters_updated_at` / `user_filters_updated_at` are the
  -- separately named represented-profile pair handled by 20260909115242.
  VALUES
    ('timestamp_helper', 'public.update_updated_at_column()'),
    ('audit_trigger_function', 'public.track_employee_column_changes()'),
    ('legacy_filter_trigger_function', 'public.update_user_filters_updated_at()'),
    ('canonical_filter_trigger_function', 'public.trigger_set_updated_at()'),
    ('staffing_rpc', 'public.update_staffing_need(text,integer,uuid)'),
    ('role_helper', 'public.get_user_role()')
), function_metadata AS (
  SELECT expected.label, p.oid, p.oid::regprocedure::text AS signature,
    pg_get_userbyid(p.proowner) = 'postgres' AS owner_is_postgres,
    l.lanname = 'plpgsql' AS language_is_plpgsql,
    p.prosecdef AS security_definer, p.provolatile, p.proparallel,
    p.proisstrict, p.proleakproof, p.prokind = 'f' AS is_function_kind,
    p.pronargs = 0 AS has_zero_arguments, NOT p.proretset AS does_not_return_set,
    p.prorettype = 'trigger'::regtype AS returns_trigger,
    p.proargmodes IS NULL AS argument_modes_absent,
    p.proallargtypes IS NULL AS all_argument_types_absent,
    p.proconfig IS NULL AS settings_empty,
    coalesce(cardinality(p.proconfig),0) AS setting_count,
    encode(sha256(convert_to(coalesce(to_jsonb(p.proconfig)::text,'null'),'UTF8')),'hex') AS settings_sha256,
    p.proconfig IS NOT DISTINCT FROM ARRAY['search_path=public, pg_temp']::text[] AS strict_guard_search_path,
    CASE expected.label WHEN 'timestamp_helper' THEN NOT p.prosecdef
      WHEN 'audit_trigger_function' THEN p.prosecdef ELSE NOT p.prosecdef END AS security_mode_matches_expected,
    md5(btrim(replace(coalesce(p.prosrc,''), E'\r\n', E'\n'), E' \t\n\r')) AS normalized_source_md5,
    coalesce((SELECT count(*)
      FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a
      WHERE a.grantee <> p.proowner AND a.privilege_type = 'EXECUTE'), 0) AS nonowner_execute_count,
    coalesce((SELECT bool_or(a.grantee = 0 AND a.privilege_type = 'EXECUTE')
      FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a WHERE a.grantee <> p.proowner),false) AS execute_public,
    coalesce((SELECT bool_or(r.rolname = 'anon' AND a.privilege_type = 'EXECUTE') FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE a.grantee <> p.proowner),false) AS execute_anon,
    coalesce((SELECT bool_or(r.rolname = 'authenticated' AND a.privilege_type = 'EXECUTE') FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE a.grantee <> p.proowner),false) AS execute_authenticated,
    coalesce((SELECT bool_or(r.rolname = 'service_role' AND a.privilege_type = 'EXECUTE') FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE a.grantee <> p.proowner),false) AS execute_service_role,
    coalesce((SELECT count(*) FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE a.grantee <> p.proowner AND a.privilege_type='EXECUTE' AND a.grantee<>0 AND coalesce(r.rolname,'') NOT IN ('anon','authenticated','service_role')),0) AS unknown_execute_grantee_count,
    coalesce((SELECT count(*) FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a WHERE a.grantee<>p.proowner AND a.privilege_type='EXECUTE'),0)=1 AND coalesce((SELECT bool_or(a.grantee=0 AND a.privilege_type='EXECUTE') FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a WHERE a.grantee<>p.proowner),false) AS acl_public_only,
    coalesce((SELECT count(*) FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a WHERE a.grantee<>p.proowner AND a.privilege_type='EXECUTE'),0)=0 AS acl_no_nonowner_execute,
    coalesce((SELECT count(*) FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a WHERE a.grantee<>p.proowner AND a.privilege_type='EXECUTE'),0)=4 AS acl_public_anon_authenticated_service_role,
    coalesce((SELECT count(*) FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a WHERE a.grantee<>p.proowner AND a.privilege_type='EXECUTE'),0)=1 AND coalesce((SELECT bool_or(r.rolname='service_role' AND a.privilege_type='EXECUTE') FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE a.grantee<>p.proowner),false) AS acl_service_role_only,
    coalesce((SELECT bool_or(a.is_grantable OR a.privilege_type <> 'EXECUTE')
      FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a
      WHERE a.grantee <> p.proowner), false) AS has_nonowner_acl_anomaly
  FROM target_functions expected
  LEFT JOIN pg_proc p ON p.oid = to_regprocedure(expected.signature)
  LEFT JOIN pg_language l ON l.oid = p.prolang
), trigger_metadata AS (
  SELECT c.relname AS table_name, t.tgname, t.tgfoid, t.tgenabled, t.tgtype,
    t.tgattr::text = '' AS no_column_filter, t.tgqual IS NULL AS no_when_clause,
    t.tgconstraint = 0 AS not_constraint_trigger, t.tgnargs = 0 AS no_arguments,
    octet_length(t.tgargs) = 0 AS no_argument_bytes,
    NOT t.tgdeferrable AS not_deferrable, NOT t.tginitdeferred AS not_initially_deferred,
    t.tgoldtable IS NULL AND t.tgnewtable IS NULL AS no_transition_tables
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('employees','important_dates','column_config','employee_column_changes','user_filters')
    AND NOT t.tgisinternal
), expected_trigger(label, table_name, trigger_name, function_signature, trigger_type) AS (
  VALUES
    ('employees_timestamp','employees','update_employees_updated_at','public.update_updated_at_column()',19),
    ('employees_audit','employees','trg_track_employee_column_changes','public.track_employee_column_changes()',17),
    ('important_dates_timestamp','important_dates','update_important_dates_updated_at','public.update_updated_at_column()',19),
    ('column_config_timestamp','column_config','update_column_config_updated_at','public.update_updated_at_column()',19),
    ('saved_filters_legacy_timestamp','user_filters','user_filters_updated_at','public.update_user_filters_updated_at()',19),
    ('saved_filters_canonical_timestamp','user_filters','set_updated_at','public.trigger_set_updated_at()',19)
), changed_by_fk AS (
  SELECT c.conname, c.convalidated, c.confdeltype, c.confupdtype, c.confmatchtype,
    c.condeferrable, c.condeferred, c.confrelid = to_regclass('public.users') AS references_app_users,
    c.conkey = ARRAY[(SELECT a.attnum FROM pg_attribute a
      WHERE a.attrelid = to_regclass('public.employee_column_changes') AND a.attname = 'changed_by' AND NOT a.attisdropped)] AS changed_by_only,
    c.confkey = ARRAY[(SELECT a.attnum FROM pg_attribute a
      WHERE a.attrelid = to_regclass('public.users') AND a.attname = 'id' AND NOT a.attisdropped)] AS references_app_id,
    c.confkey = ARRAY[(SELECT a.attnum FROM pg_attribute a
      WHERE a.attrelid = to_regclass('public.users') AND a.attname = 'auth_user_id' AND NOT a.attisdropped)] AS references_auth_user_id
  FROM pg_constraint c
  WHERE c.conrelid = to_regclass('public.employee_column_changes') AND c.contype = 'f'
    AND (SELECT a.attnum FROM pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attname = 'changed_by' AND NOT a.attisdropped) = ANY(c.conkey)
), saved_filter_constraints AS (
  SELECT count(*) AS total_count,
    count(*) FILTER (WHERE conname = 'user_filters_user_id_name_key') AS represented_unique_count,
    count(*) FILTER (WHERE conname = 'unique_user_filter_name') AS canonical_unique_count,
    count(*) FILTER (WHERE conname = 'user_filters_name_check') AS represented_check_count,
    count(*) FILTER (WHERE conname = 'valid_name_length') AS canonical_check_count,
    count(*) FILTER (WHERE conname = 'user_filters_user_id_fkey') AS canonical_fk_count,
    encode(sha256(convert_to(coalesce(jsonb_agg(md5(conname || ':' || pg_get_constraintdef(oid,true)) ORDER BY conname)::text,'[]'),'UTF8')),'hex') AS all_constraint_metadata_sha256
  FROM pg_constraint WHERE conrelid = to_regclass('public.user_filters')
), saved_filter_indexes AS (
  SELECT count(*) FILTER (WHERE pc.oid IS NULL) AS standalone_count,
    count(*) FILTER (WHERE pc.oid IS NULL AND i.indisvalid AND i.indisready AND i.indislive) AS valid_standalone_count,
    count(*) FILTER (WHERE pc.oid IS NULL AND ic.relname = 'idx_user_filters_user_id') AS canonical_owner_index_count,
    count(*) FILTER (WHERE pc.oid IS NULL AND ic.relname = 'idx_user_filters_name') AS canonical_name_index_count,
    encode(sha256(convert_to(coalesce(jsonb_agg(md5(ic.relname || ':' || pg_get_indexdef(i.indexrelid)) ORDER BY ic.relname)::text,'[]'),'UTF8')),'hex') AS all_index_metadata_sha256
  FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid
  LEFT JOIN pg_constraint pc ON pc.conindid = i.indexrelid
  WHERE i.indrelid = to_regclass('public.user_filters')
), policy_inventory AS (
  SELECT tablename, policyname, cmd, permissive,
    roles::text = '{public}' AS roles_public_only,
    roles::text = '{authenticated}' AS roles_authenticated_only,
    NOT (roles::text IN ('{public}','{authenticated}')) AS roles_unknown_profile,
    md5(coalesce(qual,'')) AS using_definition_md5,
    md5(coalesce(with_check,'')) AS with_check_definition_md5
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('staffing_needs','staffing_needs_changelog','user_filters','column_config','employee_column_changes')
), expected_policy(label, table_name, policy_name, command) AS (
  VALUES
    ('staffing_select','staffing_needs','staffing_needs_select_authenticated','SELECT'),
    ('staffing_update','staffing_needs','staffing_needs_update_hr_admin_crewing','UPDATE'),
    ('staffing_changelog_insert','staffing_needs_changelog','staffing_needs_changelog_insert','INSERT'),
    ('staffing_changelog_select','staffing_needs_changelog','staffing_needs_changelog_select','SELECT'),
    ('saved_filters_select','user_filters','Users can read own filters','SELECT'),
    ('saved_filters_insert','user_filters','Users can insert own filters','INSERT'),
    ('saved_filters_update','user_filters','Users can update own filters','UPDATE'),
    ('saved_filters_delete','user_filters','Users can delete own filters','DELETE'),
    ('column_config_manage','column_config','Manage column configs','ALL'),
    ('audit_read','employee_column_changes','Authorized roles can read visible employee changes','SELECT')
)
SELECT jsonb_build_object(
  'draft', true,
  'executable', false,
  'source_head', 'c31227ad68d91c0a471b611811bc618cbf3535a2',
  'required_relation_exists', (SELECT jsonb_object_agg(label, relation_oid IS NOT NULL) FROM relation_oids),
  'required_relation_missing_count', (SELECT count(*) FROM relation_oids WHERE relation_oid IS NULL),
  'required_column_exists', (SELECT jsonb_object_agg(label, object_present) FROM column_inventory),
  'required_column_missing_count', (SELECT count(*) FROM column_inventory WHERE NOT object_present),
  'trigger_guard', jsonb_build_object(
    'column_config_updated_at_exists', EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.column_config') AND attname='updated_at' AND NOT attisdropped),
    'column_config_updated_at_exact_contract', EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=to_regclass('public.column_config') AND a.attname='updated_at' AND NOT a.attisdropped AND a.atttypid='timestamptz'::regtype AND NOT a.attnotnull AND a.attgenerated='' AND a.attidentity='' AND pg_get_expr(d.adbin,d.adrelid)='now()'),
    'function_fields', (SELECT jsonb_object_agg(label, jsonb_build_object('object_present',oid IS NOT NULL,'postgres_owner',owner_is_postgres,'plpgsql',language_is_plpgsql,'security_definer',security_definer,'security_mode_matches_expected',security_mode_matches_expected,'volatility_is_volatile',provolatile='v','parallel_is_unsafe',proparallel='u','not_strict',NOT proisstrict,'not_leakproof',NOT proleakproof,'function_kind',is_function_kind,'zero_arguments',has_zero_arguments,'does_not_return_set',does_not_return_set,'returns_trigger',returns_trigger,'argument_modes_absent',argument_modes_absent,'all_argument_types_absent',all_argument_types_absent,'settings_empty',settings_empty,'setting_count',setting_count,'settings_sha256',settings_sha256,'strict_guard_search_path',strict_guard_search_path,'normalized_source_md5',normalized_source_md5,'nonowner_execute_count',nonowner_execute_count,'execute_public',execute_public,'execute_anon',execute_anon,'execute_authenticated',execute_authenticated,'execute_service_role',execute_service_role,'unknown_execute_grantee_count',unknown_execute_grantee_count,'acl_public_only',acl_public_only,'acl_no_nonowner_execute',acl_no_nonowner_execute,'acl_public_anon_authenticated_service_role_exact',nonowner_execute_count=4 AND execute_public AND execute_anon AND execute_authenticated AND execute_service_role AND unknown_execute_grantee_count=0 AND NOT has_nonowner_acl_anomaly,'acl_service_role_only',acl_service_role_only,'nonowner_acl_anomaly',has_nonowner_acl_anomaly)) FROM function_metadata WHERE label IN ('timestamp_helper','audit_trigger_function')),
    'expected_trigger_fields', (SELECT jsonb_object_agg(e.label, jsonb_build_object('object_present',t.tgname IS NOT NULL,'binding_matches',t.tgfoid=to_regprocedure(e.function_signature) AND t.tgtype=e.trigger_type,'enabled',t.tgenabled='O','no_column_filter',t.no_column_filter,'no_when_clause',t.no_when_clause,'not_constraint_trigger',t.not_constraint_trigger,'no_arguments',t.no_arguments,'no_argument_bytes',t.no_argument_bytes,'not_deferrable',t.not_deferrable,'not_initially_deferred',t.not_initially_deferred,'no_transition_tables',t.no_transition_tables)) FROM expected_trigger e LEFT JOIN trigger_metadata t ON t.table_name=e.table_name AND t.tgname=e.trigger_name),
    'unexpected_trigger_count', (SELECT count(*) FROM trigger_metadata WHERE (table_name, tgname) NOT IN (SELECT table_name, trigger_name FROM expected_trigger)),
    'unexpected_trigger_name_sha256', (SELECT encode(sha256(convert_to(coalesce(jsonb_agg(md5(table_name || ':' || tgname) ORDER BY table_name,tgname)::text,'[]'),'UTF8')),'hex') FROM trigger_metadata WHERE (table_name, tgname) NOT IN (SELECT table_name, trigger_name FROM expected_trigger)),
    'changed_by_fk_count', (SELECT count(*) FROM changed_by_fk),
    'changed_by_fk_fields', (SELECT coalesce(jsonb_agg(jsonb_build_object('expected_name',conname='employee_column_changes_changed_by_fkey','name_md5',md5(conname),'validated',convalidated,'references_app_users',references_app_users,'changed_by_only',changed_by_only,'references_app_id',references_app_id,'references_auth_user_id',references_auth_user_id,'on_delete_set_null',confdeltype='n','on_delete_no_action',confdeltype='a','on_update_no_action',confupdtype='a','match_simple',confmatchtype='s','not_deferrable',NOT condeferrable,'not_initially_deferred',NOT condeferred) ORDER BY conname),'[]'::jsonb) FROM changed_by_fk),
    'audit_conflict_index_count', (SELECT count(*) FROM pg_index i WHERE i.indrelid=to_regclass('public.employee_column_changes') AND i.indisunique AND i.indisvalid AND i.indisready AND i.indimmediate AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=3 AND (SELECT array_agg(a.attname ORDER BY k.ordinality) FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum WHERE k.ordinality<=3)=ARRAY['employee_id','column_name','changed_at']::name[]),
    'timestamp_helper_global_binding_count', (SELECT count(*) FROM pg_trigger WHERE tgfoid=to_regprocedure('public.update_updated_at_column()')),
    'audit_trigger_function_global_binding_count', (SELECT count(*) FROM pg_trigger WHERE tgfoid=to_regprocedure('public.track_employee_column_changes()')),
    'audit_custom_trigger_count', (SELECT count(*) FROM pg_trigger WHERE tgrelid=to_regclass('public.employee_column_changes') AND NOT tgisinternal),
    'audit_rewrite_rule_count', (SELECT count(*) FROM pg_rewrite WHERE ev_class=to_regclass('public.employee_column_changes'))
  ),
  'saved_filter_catalog', jsonb_build_object(
    'table_exists', to_regclass('public.user_filters') IS NOT NULL,
    'rls_enabled', coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.user_filters')),false),
    'filters_default_present', EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=to_regclass('public.user_filters') AND a.attname='filters' AND NOT a.attisdropped),
    'filters_default_is_empty_json_array', EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=to_regclass('public.user_filters') AND a.attname='filters' AND NOT a.attisdropped AND regexp_replace(pg_get_expr(d.adbin,d.adrelid),'[[:space:]]+','','g') IN ($q$'[]'::jsonb$q$,'jsonb_build_array()')),
    'filters_default_definition_md5', coalesce((SELECT md5(pg_get_expr(d.adbin,d.adrelid)) FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=to_regclass('public.user_filters') AND a.attname='filters' AND NOT a.attisdropped),'00000000000000000000000000000000'),
    'constraints', (SELECT to_jsonb(saved_filter_constraints) FROM saved_filter_constraints),
    'indexes', (SELECT to_jsonb(saved_filter_indexes) FROM saved_filter_indexes),
    'noninternal_trigger_count', (SELECT count(*) FROM pg_trigger WHERE tgrelid=to_regclass('public.user_filters') AND NOT tgisinternal),
    'trigger_function_fields', (SELECT jsonb_object_agg(label,jsonb_build_object('object_present',oid IS NOT NULL,'postgres_owner',owner_is_postgres,'plpgsql',language_is_plpgsql,'security_definer',security_definer,'function_kind',is_function_kind,'zero_arguments',has_zero_arguments,'does_not_return_set',does_not_return_set,'returns_trigger',returns_trigger,'argument_modes_absent',argument_modes_absent,'all_argument_types_absent',all_argument_types_absent,'settings_empty',settings_empty,'normalized_source_md5',normalized_source_md5,'nonowner_execute_count',nonowner_execute_count,'execute_public',execute_public,'execute_anon',execute_anon,'execute_authenticated',execute_authenticated,'execute_service_role',execute_service_role,'unknown_execute_grantee_count',unknown_execute_grantee_count,'nonowner_acl_anomaly',has_nonowner_acl_anomaly)) FROM function_metadata WHERE label IN ('legacy_filter_trigger_function','canonical_filter_trigger_function'))
  ),
  'policy_expected_fields', (SELECT jsonb_object_agg(e.label,jsonb_build_object('object_present',p.policyname IS NOT NULL,'table_matches',p.tablename=e.table_name,'command_matches',p.cmd=e.command,'permissive',p.permissive,'roles_public_only',p.roles_public_only,'roles_authenticated_only',p.roles_authenticated_only,'roles_unknown_profile',p.roles_unknown_profile,'using_definition_md5',p.using_definition_md5,'with_check_definition_md5',p.with_check_definition_md5)) FROM expected_policy e LEFT JOIN policy_inventory p ON p.tablename=e.table_name AND p.policyname=e.policy_name),
  'policy_unexpected_count', (SELECT count(*) FROM policy_inventory p WHERE NOT EXISTS(SELECT 1 FROM expected_policy e WHERE e.table_name=p.tablename AND e.policy_name=p.policyname)),
  'policy_unexpected_name_sha256', (SELECT encode(sha256(convert_to(coalesce(jsonb_agg(md5(tablename || ':' || policyname) ORDER BY tablename,policyname)::text,'[]'),'UTF8')),'hex') FROM policy_inventory p WHERE NOT EXISTS(SELECT 1 FROM expected_policy e WHERE e.table_name=p.tablename AND e.policy_name=p.policyname)),
  'policy_component_sha256', (SELECT encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_object('t',tablename,'n',md5(policyname),'c',cmd,'p',permissive,'public',roles_public_only,'authenticated',roles_authenticated_only,'unknown_roles',roles_unknown_profile,'u',using_definition_md5,'w',with_check_definition_md5) ORDER BY tablename,policyname)::text,'[]'),'UTF8')),'hex') FROM policy_inventory),
  'repayment_catalog', (SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'type_is_boolean',a.atttypid='boolean'::regtype,'nullable',NOT a.attnotnull,'default_md5',md5(coalesce(pg_get_expr(d.adbin,d.adrelid),''))) ORDER BY a.attname),'[]'::jsonb) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=to_regclass('public.employees') AND a.attname IN ('repayment_needed_omc','repayment_needed_pe3') AND NOT a.attisdropped)
) AS catalog_profile;

-- This second result is deliberately separate: it references expected baseline
-- tables. A runner must execute it only after both required_relation_missing_count
-- and required_column_missing_count are zero.
SELECT jsonb_build_object(
  'history', jsonb_build_object('table_exists',false,'row_count',NULL,'version_sha256',NULL),
  'saved_filter_data', jsonb_build_object('total_count',(SELECT count(*) FROM public.user_filters),'orphan_auth_reference_count',(SELECT count(*) FROM public.user_filters f WHERE NOT EXISTS(SELECT 1 FROM auth.users a WHERE a.id=f.user_id)),'empty_name_count',(SELECT count(*) FROM public.user_filters WHERE char_length(name)=0),'overlength_name_count',(SELECT count(*) FROM public.user_filters WHERE char_length(name)>50),'row_identity_sha256',(SELECT encode(sha256(convert_to(coalesce(jsonb_agg(md5(id::text || ':' || user_id::text || ':' || name) ORDER BY id)::text,'[]'),'UTF8')),'hex') FROM public.user_filters)),
  'audit_preservation', jsonb_build_object('row_count',(SELECT count(*) FROM public.employee_column_changes),'nonnull_actor_count',(SELECT count(changed_by) FROM public.employee_column_changes),'unmapped_legacy_actor_count',(SELECT count(*) FROM public.employee_column_changes a WHERE a.changed_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.users u WHERE u.auth_user_id=a.changed_by)),'unmapped_canonical_actor_count',(SELECT count(*) FROM public.employee_column_changes a WHERE a.changed_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=a.changed_by)),'stable_fields_sha256',(SELECT encode(sha256(convert_to(coalesce(jsonb_agg(md5(employee_id::text || ':' || column_name || ':' || changed_at::text) ORDER BY id)::text,'[]'),'UTF8')),'hex') FROM public.employee_column_changes)),
  'repayment_data', jsonb_build_object('omc_null_count',(SELECT count(*) FROM public.employees WHERE repayment_needed_omc IS NULL),'omc_true_count',(SELECT count(*) FROM public.employees WHERE repayment_needed_omc IS TRUE),'omc_false_count',(SELECT count(*) FROM public.employees WHERE repayment_needed_omc IS FALSE),'pe3_null_count',(SELECT count(*) FROM public.employees WHERE repayment_needed_pe3 IS NULL),'pe3_true_count',(SELECT count(*) FROM public.employees WHERE repayment_needed_pe3 IS TRUE),'pe3_false_count',(SELECT count(*) FROM public.employees WHERE repayment_needed_pe3 IS FALSE)),
  'permission_rows', (SELECT coalesce(jsonb_agg(jsonb_build_object('db_column_name',db_column_name,'role_permissions_is_object',coalesce(jsonb_typeof(role_permissions)='object',false),'role_permissions_sha256',encode(sha256(convert_to(coalesce(role_permissions::text,''),'UTF8')),'hex'),'role_key_count',CASE WHEN jsonb_typeof(role_permissions)='object' THEN (SELECT count(*) FROM jsonb_object_keys(role_permissions)) ELSE NULL END) ORDER BY db_column_name),'[]'::jsonb) FROM public.column_config WHERE db_column_name IN ('diet_details','special_diet','crewing_done','repayment_needed_omc','repayment_needed_pe3')),
  'permission_baseline', (SELECT jsonb_build_object(
    'row_count', count(*),
    'distinct_column_count', count(DISTINCT db_column_name),
    'null_column_count', count(*) FILTER (WHERE db_column_name IS NULL),
    'nonobject_permissions_count', count(*) FILTER (WHERE coalesce(jsonb_typeof(role_permissions),'null') <> 'object'),
    'rows', coalesce(jsonb_agg(jsonb_build_object(
      'column_name_md5', md5(coalesce(db_column_name,'')),
      'role_permissions_sha256', encode(sha256(convert_to(coalesce(role_permissions::text,''),'UTF8')),'hex')
    ) ORDER BY db_column_name NULLS FIRST, role_permissions::text NULLS FIRST),'[]'::jsonb)
  ) FROM public.column_config),
  'staffing_data', jsonb_build_object('out_of_range_headcount_count',(SELECT count(*) FROM public.staffing_needs WHERE headcount_need<0 OR headcount_need>9999))
) AS data_profile;
ROLLBACK;
