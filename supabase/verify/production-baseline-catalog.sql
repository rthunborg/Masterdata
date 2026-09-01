-- Story 22.15 read-only catalog proof for hosted migration baselining.
-- Run with an account that can read pg_catalog and public metadata. This file
-- performs no writes. Every row must report passed=true before repairing any
-- version listed as repair-after-catalog-proof in migration-baseline-manifest.json.

BEGIN TRANSACTION READ ONLY;

WITH verifier_context AS (
  -- Required psql variable. Omission is a syntax error by design.
  SELECT :'catalog_phase'::text AS catalog_phase
),
represented_policies AS (
  SELECT
    tablename,
    policyname,
    permissive,
    roles::text AS roles,
    cmd,
    regexp_replace(
      regexp_replace(lower(qual), 'public[.]', '', 'g'),
      '[[:space:]]+',
      '',
      'g'
    ) AS normalized_qual,
    regexp_replace(
      regexp_replace(lower(with_check), 'public[.]', '', 'g'),
      '[[:space:]]+',
      '',
      'g'
    ) AS normalized_with_check
  FROM pg_policies
  WHERE schemaname = 'public'
),
expected_policy_contracts AS (
  SELECT *
  FROM (
    VALUES
      -- Dated 2026-05-28 production backup: dashboard aliases, three
      -- owner-filter policies, and original role-unscoped changelog policies.
      ('production_pre_apply', 'staffing_needs', 'staffing_needs_select_authenticated', '{authenticated}', 'SELECT', '(get_user_role()isnotnull)', NULL),
      ('production_pre_apply', 'staffing_needs', 'staffing_needs_update_hr_admin_crewing', '{authenticated}', 'UPDATE', '(get_user_role()=any(array[''hr_admin''::text,''crewing''::text]))', NULL),
      ('production_pre_apply', 'staffing_needs_changelog', 'staffing_needs_changelog_insert', '{public}', 'INSERT', NULL, '(get_user_role()=any(array[''hr_admin''::text,''crewing''::text]))'),
      ('production_pre_apply', 'staffing_needs_changelog', 'staffing_needs_changelog_select', '{public}', 'SELECT', '(get_user_role()isnotnull)', NULL),
      ('production_pre_apply', 'user_filters', 'Users can read own filters', '{authenticated}', 'SELECT', '(auth.uid()=user_id)', NULL),
      ('production_pre_apply', 'user_filters', 'Users can insert own filters', '{authenticated}', 'INSERT', NULL, '(auth.uid()=user_id)'),
      ('production_pre_apply', 'user_filters', 'Users can delete own filters', '{authenticated}', 'DELETE', '(auth.uid()=user_id)', NULL),

      -- Staging has already applied 20260614000000: canonical names,
      -- authenticated-only roles and initplan-normalized predicates.
      ('staging_pre_apply', 'staffing_needs', 'staffing_needs_select', '{authenticated}', 'SELECT', '((selectget_user_role()asget_user_role)isnotnull)', NULL),
      ('staging_pre_apply', 'staffing_needs', 'staffing_needs_update', '{authenticated}', 'UPDATE', '((selectget_user_role()asget_user_role)=any(array[''hr_admin''::text,''crewing''::text]))', NULL),
      ('staging_pre_apply', 'staffing_needs_changelog', 'staffing_needs_changelog_insert', '{authenticated}', 'INSERT', NULL, '((selectget_user_role()asget_user_role)=any(array[''hr_admin''::text,''crewing''::text]))'),
      ('staging_pre_apply', 'staffing_needs_changelog', 'staffing_needs_changelog_select', '{authenticated}', 'SELECT', '((selectget_user_role()asget_user_role)isnotnull)', NULL),
      ('staging_pre_apply', 'user_filters', 'Users can view their own filters', '{authenticated}', 'SELECT', '((selectauth.uid()asuid)=user_id)', NULL),
      ('staging_pre_apply', 'user_filters', 'Users can create their own filters', '{authenticated}', 'INSERT', NULL, '((selectauth.uid()asuid)=user_id)'),
      ('staging_pre_apply', 'user_filters', 'Users can update their own filters', '{authenticated}', 'UPDATE', '((selectauth.uid()asuid)=user_id)', '((selectauth.uid()asuid)=user_id)'),
      ('staging_pre_apply', 'user_filters', 'Users can delete their own filters', '{authenticated}', 'DELETE', '((selectauth.uid()asuid)=user_id)', NULL),

      -- Final state after all six forward versions. Unlike the historical
      -- profiles above, post_apply is the complete exact public-schema policy
      -- profile: these 17 rows must exist and no policy may exist elsewhere.
      ('post_apply', 'employees', 'HR Admin and Recruiter can manage employees', '{authenticated}', 'ALL', '((selectget_user_role()asget_user_role)=any(array[''hr_admin''::text,''recruiter''::text]))', NULL),
      ('post_apply', 'employees', 'External parties can view employees', '{authenticated}', 'SELECT', '(((selectget_user_role()asget_user_role)=any(array[''sodexo''::text,''omc''::text,''payroll''::text,''toplux''::text,''crewing''::text]))and(is_archived=false))', NULL),
      ('post_apply', 'column_config', 'Everyone can read column configs', '{public}', 'SELECT', 'true', NULL),
      ('post_apply', 'column_config', 'Manage column configs', '{authenticated}', 'ALL', '(exists(select1fromuserscallerwhere((caller.auth_user_id=auth.uid())and(caller.role=''hr_admin''::text)and(caller.is_active=true))))', '(exists(select1fromuserscallerwhere((caller.auth_user_id=auth.uid())and(caller.role=''hr_admin''::text)and(caller.is_active=true))))'),
      ('post_apply', 'important_dates', 'Everyone can read important dates', '{public}', 'SELECT', 'true', NULL),
      ('post_apply', 'important_dates', 'HR Admin and Recruiter can manage important dates', '{authenticated}', 'ALL', '((selectget_user_role()asget_user_role)=any(array[''hr_admin''::text,''recruiter''::text]))', NULL),
      ('post_apply', 'employee_column_changes', 'Authorized roles can read visible employee changes', '{authenticated}', 'SELECT', '((exists(select1fromuserscallerwhere((caller.auth_user_id=auth.uid())and(caller.is_active=true)and(caller.role=any(array[''hr_admin''::text,''recruiter''::text,''sodexo''::text,''omc''::text,''payroll''::text,''toplux''::text,''crewing''::text])))))and(exists(select1fromemployeesvisible_employeewhere(visible_employee.id=employee_column_changes.employee_id)))and(((selectget_user_role()asget_user_role)=any(array[''hr_admin''::text,''recruiter''::text]))or(exists(select1fromcolumn_configvisible_columnwhere((lower(visible_column.db_column_name)=lower(employee_column_changes.column_name))and(visible_column.is_masterdata=true)and(coalesce(((visible_column.role_permissions->(selectget_user_role()asget_user_role))->>''view''::text),''false''::text)=''true''::text))))))', NULL),
      ('post_apply', 'users', 'HR Admin can insert users', '{authenticated}', 'INSERT', NULL, '((selectget_user_role()asget_user_role)=''hr_admin''::text)'),
      ('post_apply', 'users', 'Users can read users', '{authenticated}', 'SELECT', '(((selectget_user_role()asget_user_role)=''hr_admin''::text)or(auth_user_id=(selectauth.uid()asuid)))', NULL),
      ('post_apply', 'staffing_needs', 'staffing_needs_select', '{authenticated}', 'SELECT', '((selectget_user_role()asget_user_role)isnotnull)', NULL),
      ('post_apply', 'staffing_needs', 'staffing_needs_update', '{authenticated}', 'UPDATE', '((selectget_user_role()asget_user_role)=any(array[''hr_admin''::text,''crewing''::text]))', NULL),
      ('post_apply', 'staffing_needs_changelog', 'staffing_needs_changelog_insert', '{authenticated}', 'INSERT', NULL, '((selectget_user_role()asget_user_role)=any(array[''hr_admin''::text,''crewing''::text]))'),
      ('post_apply', 'staffing_needs_changelog', 'staffing_needs_changelog_select', '{authenticated}', 'SELECT', '((selectget_user_role()asget_user_role)isnotnull)', NULL),
      ('post_apply', 'user_filters', 'Users can view their own filters', '{authenticated}', 'SELECT', '(((selectauth.uid()asuid)=user_id)and((selectget_user_role()asget_user_role)isnotnull))', NULL),
      ('post_apply', 'user_filters', 'Users can create their own filters', '{authenticated}', 'INSERT', NULL, '(((selectauth.uid()asuid)=user_id)and((selectget_user_role()asget_user_role)isnotnull))'),
      ('post_apply', 'user_filters', 'Users can update their own filters', '{authenticated}', 'UPDATE', '(((selectauth.uid()asuid)=user_id)and((selectget_user_role()asget_user_role)isnotnull))', '(((selectauth.uid()asuid)=user_id)and((selectget_user_role()asget_user_role)isnotnull))'),
      ('post_apply', 'user_filters', 'Users can delete their own filters', '{authenticated}', 'DELETE', '(((selectauth.uid()asuid)=user_id)and((selectget_user_role()asget_user_role)isnotnull))', NULL)
  ) AS expected(
    profile_name,
    table_name,
    policy_name,
    roles,
    command,
    normalized_qual,
    normalized_with_check
  )
),
story_22_15_functions AS (
  SELECT
    expected.function_name,
    functions.oid,
    functions.prosecdef,
    functions.provolatile,
    functions.proconfig,
    functions.prosrc,
    functions.prorettype::regtype::text AS return_type,
    function_owner.rolname::text AS owner_name,
    language.lanname AS language_name,
    privileges.non_owner_execute_grants
  FROM (
    VALUES
      ('get_user_role', 'public.get_user_role()'),
      ('delete_app_user', 'public.delete_app_user(uuid)'),
      (
        'complete_app_user_auth_cleanup',
        'public.complete_app_user_auth_cleanup(uuid)'
      )
  ) AS expected(function_name, signature)
  LEFT JOIN pg_proc AS functions
    ON functions.oid = to_regprocedure(expected.signature)
  LEFT JOIN pg_language AS language
    ON language.oid = functions.prolang
  LEFT JOIN pg_roles AS function_owner
    ON function_owner.oid = functions.proowner
  LEFT JOIN LATERAL (
    SELECT coalesce(
      array_agg(
        CASE
          WHEN acl.grantee = 0 THEN 'PUBLIC'
          ELSE roles.rolname::text
        END
        ORDER BY CASE
          WHEN acl.grantee = 0 THEN 'PUBLIC'
          ELSE roles.rolname::text
        END
      ),
      ARRAY[]::text[]
    ) AS non_owner_execute_grants
    FROM aclexplode(
      coalesce(functions.proacl, acldefault('f', functions.proowner))
    ) AS acl
    LEFT JOIN pg_roles AS roles ON roles.oid = acl.grantee
    WHERE acl.privilege_type = 'EXECUTE'
      AND acl.grantee <> functions.proowner
  ) AS privileges ON true
),
catalog_checks(check_name, passed, observed) AS (
  VALUES
    (
      'verifier_phase',
      (SELECT catalog_phase FROM verifier_context) IN (
        'production_pre_apply',
        'staging_pre_apply',
        'post_apply'
      ),
      jsonb_build_object(
        'catalog_phase', (SELECT catalog_phase FROM verifier_context)
      )
    ),
    (
      'story_22_15_phase_contracts',
      CASE (SELECT catalog_phase FROM verifier_context)
        WHEN 'production_pre_apply' THEN
          to_regclass('public.app_user_auth_cleanup_outbox') IS NULL
          AND to_regprocedure('public.delete_app_user(uuid)') IS NULL
          AND to_regprocedure(
            'public.complete_app_user_auth_cleanup(uuid)'
          ) IS NULL
          AND EXISTS (
            SELECT 1
            FROM story_22_15_functions
            WHERE function_name = 'get_user_role'
              AND oid IS NOT NULL
              AND prosrc NOT ILIKE '%is_active = true%'
          )
        WHEN 'staging_pre_apply' THEN
          to_regclass('public.app_user_auth_cleanup_outbox') IS NULL
          AND to_regprocedure('public.delete_app_user(uuid)') IS NULL
          AND to_regprocedure(
            'public.complete_app_user_auth_cleanup(uuid)'
          ) IS NULL
          AND EXISTS (
            SELECT 1
            FROM story_22_15_functions
            WHERE function_name = 'get_user_role'
              AND oid IS NOT NULL
              AND prosrc NOT ILIKE '%is_active = true%'
          )
        WHEN 'post_apply' THEN
          to_regclass('public.app_user_auth_cleanup_outbox') IS NOT NULL
          AND (
            SELECT count(*) = 7
              AND bool_and(
                actual.column_name IS NOT NULL
                AND actual.data_type = expected.data_type
                AND actual.is_nullable = expected.is_nullable
                AND regexp_replace(
                  lower(actual.column_default),
                  '[[:space:]]+',
                  '',
                  'g'
                ) IS NOT DISTINCT FROM expected.column_default
              )
            FROM (
              VALUES
                ('cleanup_id', 'uuid', 'NO', 'gen_random_uuid()'),
                ('app_user_id', 'uuid', 'NO', NULL),
                ('auth_user_id', 'uuid', 'YES', NULL),
                ('cleanup_state', 'text', 'NO', '''pending''::text'),
                ('created_at', 'timestamp with time zone', 'NO', 'now()'),
                ('updated_at', 'timestamp with time zone', 'NO', 'now()'),
                ('completed_at', 'timestamp with time zone', 'YES', NULL)
            ) AS expected(
              column_name,
              data_type,
              is_nullable,
              column_default
            )
            LEFT JOIN information_schema.columns AS actual
              ON actual.table_schema = 'public'
              AND actual.table_name = 'app_user_auth_cleanup_outbox'
              AND actual.column_name = expected.column_name
          )
          AND (
            SELECT count(*) = 7
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'app_user_auth_cleanup_outbox'
          )
          AND (
            SELECT count(*) = 5
              AND bool_and(
                actual.oid IS NOT NULL
                AND actual.contype = expected.constraint_type::"char"
                AND regexp_replace(
                  regexp_replace(
                    lower(pg_get_constraintdef(actual.oid)),
                    '[[:space:]]+',
                    '',
                    'g'
                  ),
                  '[()]',
                  '',
                  'g'
                ) = expected.normalized_definition
              )
            FROM (
              VALUES
                (
                  'app_user_auth_cleanup_outbox_pkey',
                  'p',
                  'primarykeycleanup_id'
                ),
                (
                  'app_user_auth_cleanup_outbox_app_user_id_key',
                  'u',
                  'uniqueapp_user_id'
                ),
                (
                  'app_user_auth_cleanup_outbox_auth_user_id_key',
                  'u',
                  'uniqueauth_user_id'
                ),
                (
                  'app_user_auth_cleanup_outbox_cleanup_state_check',
                  'c',
                  'checkcleanup_state=anyarray[''pending''::text,''completed''::text]'
                ),
                (
                  'app_user_auth_cleanup_completed_at_check',
                  'c',
                  'checkcleanup_state=''pending''::textandcompleted_atisnullorcleanup_state=''completed''::textandcompleted_atisnotnull'
                )
            ) AS expected(
              constraint_name,
              constraint_type,
              normalized_definition
            )
            LEFT JOIN pg_constraint AS actual
              ON actual.conrelid =
                to_regclass('public.app_user_auth_cleanup_outbox')
              AND actual.conname = expected.constraint_name
          )
          AND (
            SELECT count(*) = 5
            FROM pg_constraint
            WHERE conrelid =
              to_regclass('public.app_user_auth_cleanup_outbox')
          )
          AND EXISTS (
            SELECT 1
            FROM pg_class
            WHERE oid = to_regclass('public.app_user_auth_cleanup_outbox')
              AND relkind = 'r'
              AND relrowsecurity
              AND relforcerowsecurity
          )
          AND NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'app_user_auth_cleanup_outbox'
          )
          AND NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_class AS cleanup_table
            CROSS JOIN LATERAL pg_catalog.aclexplode(
              coalesce(
                cleanup_table.relacl,
                pg_catalog.acldefault('r', cleanup_table.relowner)
              )
            ) AS privilege
            WHERE cleanup_table.oid =
              to_regclass('public.app_user_auth_cleanup_outbox')
              AND privilege.grantee <> cleanup_table.relowner
          )
          AND (
            SELECT count(*) = 3
              AND bool_and(
                oid IS NOT NULL
                AND language_name = 'plpgsql'
                AND owner_name = 'postgres'
                AND prosecdef
                AND cardinality(proconfig) = 1
                AND proconfig[1] IN ('search_path=', 'search_path=""')
                AND CASE function_name
                  WHEN 'get_user_role' THEN
                    provolatile = 's'
                    AND return_type = 'text'
                    AND non_owner_execute_grants =
                      ARRAY['anon', 'authenticated']::text[]
                    AND pg_catalog.encode(
                      pg_catalog.sha256(
                        pg_catalog.convert_to(prosrc, 'UTF8')
                      ),
                      'hex'
                    ) = '5588395d3faa157ca75db602e0671f68f993194ffede2df59fe172b6b951ee8a'
                    AND regexp_replace(lower(prosrc), '[[:space:]]+', '', 'g')
                      LIKE '%frompublic.users%whereauth_user_id=auth.uid()%andis_active=true%'
                  WHEN 'delete_app_user' THEN
                    provolatile = 'v'
                    AND return_type = 'jsonb'
                    AND non_owner_execute_grants =
                      ARRAY['authenticated']::text[]
                    AND pg_catalog.encode(
                      pg_catalog.sha256(
                        pg_catalog.convert_to(prosrc, 'UTF8')
                      ),
                      'hex'
                    ) = '08681f289d607c4eeec9038cd107dc61f820063f270026c7cbf62f290415d886'
                    AND regexp_replace(lower(prosrc), '[[:space:]]+', '', 'g')
                      LIKE '%pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(''public.users.active_hr_admin_status'',0))%'
                    AND regexp_replace(lower(prosrc), '[[:space:]]+', '', 'g')
                      LIKE '%frompublic.userswhereauth_user_id=auth.uid()andis_active=true%limit1%'
                    AND regexp_replace(lower(prosrc), '[[:space:]]+', '', 'g')
                      LIKE '%ifv_actor_idisnullorv_actor_role<>''hr_admin''then%raiseexception''insufficientpermissiontodeleteuser''%errcode=''42501''%'
                    AND regexp_replace(lower(prosrc), '[[:space:]]+', '', 'g')
                      LIKE '%ifp_user_id=v_actor_idthen%raiseexception''cannotdeletetheauthenticatedhradmin''%errcode=''42501''%'
                    AND regexp_replace(lower(prosrc), '[[:space:]]+', '', 'g')
                      LIKE '%frompublic.app_user_auth_cleanup_outbox%whereapp_user_id=p_user_id%forupdate%'
                    AND regexp_replace(lower(prosrc), '[[:space:]]+', '', 'g')
                      LIKE '%ifv_target.role=''hr_admin''andv_target.is_active=truethen%frompublic.userswhererole=''hr_admin''andis_active=true%ifv_active_hr_admin_count<=1then%raiseexception''cannotdeletethefinalactivehradmin''%errcode=''42501''%'
                    AND regexp_replace(lower(prosrc), '[[:space:]]+', '', 'g')
                      LIKE '%deletefrompublic.users%returning*intov_target%insertintopublic.app_user_auth_cleanup_outbox%'
                    AND regexp_replace(lower(prosrc), '[[:space:]]+', '', 'g')
                      LIKE '%v_target.auth_user_idisnullthen''completed''else''pending''%'
                  WHEN 'complete_app_user_auth_cleanup' THEN
                    provolatile = 'v'
                    AND return_type = 'jsonb'
                    AND non_owner_execute_grants =
                      ARRAY['service_role']::text[]
                    AND pg_catalog.encode(
                      pg_catalog.sha256(
                        pg_catalog.convert_to(prosrc, 'UTF8')
                      ),
                      'hex'
                    ) = 'f6c58c1581e10a6313b7ed534e497d99c853854a095d4ddc45ab3783a653010f'
                    AND regexp_replace(lower(prosrc), '[[:space:]]+', '', 'g')
                      LIKE '%wherecleanup_id=p_cleanup_id%forupdate%'
                    AND regexp_replace(lower(prosrc), '[[:space:]]+', '', 'g')
                      LIKE '%ifv_cleanup.cleanup_state=''pending''then%updatepublic.app_user_auth_cleanup_outbox%completed_at=now()%'
                  ELSE false
                END
              )
            FROM story_22_15_functions
          )
        ELSE false
      END,
      jsonb_build_object(
        'catalog_phase', (SELECT catalog_phase FROM verifier_context),
        'cleanup_outbox',
          to_regclass('public.app_user_auth_cleanup_outbox')::text,
        'functions', (
          SELECT coalesce(
            jsonb_agg(
              jsonb_build_object(
                'name', function_name,
                'present', oid IS NOT NULL,
                'owner', owner_name,
                'security_definer', prosecdef,
                'volatility', provolatile,
                'settings', proconfig,
                'execute_grants', non_owner_execute_grants
              )
              ORDER BY function_name
            ),
            '[]'::jsonb
          )
          FROM story_22_15_functions
        )
      )
    ),
    (
      'room_assignment_function_signatures',
      to_regprocedure('public.recalculate_rooms_for_date(uuid)') IS NOT NULL
        AND to_regprocedure('public.calculate_room_number(uuid,text,text)') IS NOT NULL
        AND (
          SELECT count(*) = 2
          FROM pg_proc
          WHERE oid IN (
            to_regprocedure('public.recalculate_rooms_for_date(uuid)'),
            to_regprocedure('public.calculate_room_number(uuid,text,text)')
          )
            AND prosrc ILIKE '%FOR UPDATE%'
            AND prosrc ILIKE '%hotel_required%'
            AND prosrc ILIKE '%room_number_shared%'
        ),
      jsonb_build_object(
        'recalculate', to_regprocedure('public.recalculate_rooms_for_date(uuid)')::text,
        'calculate', to_regprocedure('public.calculate_room_number(uuid,text,text)')::text,
        'expected_body_shape_count', (
          SELECT count(*)
          FROM pg_proc
          WHERE oid IN (
            to_regprocedure('public.recalculate_rooms_for_date(uuid)'),
            to_regprocedure('public.calculate_room_number(uuid,text,text)')
          )
            AND prosrc ILIKE '%FOR UPDATE%'
            AND prosrc ILIKE '%hotel_required%'
            AND prosrc ILIKE '%room_number_shared%'
        )
      )
    ),
    (
      'repayment_boolean_columns',
      (
        SELECT count(*) = 2
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'employees'
          AND column_name IN ('repayment_needed_omc', 'repayment_needed_pe3')
          AND data_type = 'boolean'
      ),
      (
        SELECT coalesce(jsonb_object_agg(column_name, data_type), '{}'::jsonb)
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'employees'
          AND column_name IN ('repayment_needed_omc', 'repayment_needed_pe3')
      )
    ),
    (
      'repayment_indexes_and_config',
      to_regclass('public.idx_employees_repayment_omc') IS NOT NULL
        AND to_regclass('public.idx_employees_repayment_pe3') IS NOT NULL
        AND (
          SELECT count(*) = 2
          FROM public.column_config
          WHERE db_column_name IN ('repayment_needed_omc', 'repayment_needed_pe3')
            AND lower(column_type) = 'boolean'
        ),
      jsonb_build_object(
        'omc_index', to_regclass('public.idx_employees_repayment_omc')::text,
        'pe3_index', to_regclass('public.idx_employees_repayment_pe3')::text,
        'config_count', (
          SELECT count(*)
          FROM public.column_config
          WHERE db_column_name IN ('repayment_needed_omc', 'repayment_needed_pe3')
            AND lower(column_type) = 'boolean'
        )
      )
    ),
    (
      'staffing_objects',
      to_regclass('public.staffing_needs') IS NOT NULL
        AND to_regclass('public.staffing_needs_changelog') IS NOT NULL
        AND to_regclass('public.idx_staffing_needs_changelog_location_date') IS NOT NULL
        AND to_regprocedure('public.update_staffing_need(text,integer,uuid)') IS NOT NULL
        AND (
          SELECT count(*) = 2
          FROM public.staffing_needs
          WHERE location IN ('Trelleborg', 'Göteborg')
        ),
      jsonb_build_object(
        'needs', to_regclass('public.staffing_needs')::text,
        'changelog', to_regclass('public.staffing_needs_changelog')::text,
        'index', to_regclass('public.idx_staffing_needs_changelog_location_date')::text,
        'seed_locations', (
          SELECT coalesce(jsonb_agg(location ORDER BY location), '[]'::jsonb)
          FROM public.staffing_needs
          WHERE location IN ('Trelleborg', 'Göteborg')
        )
      )
    ),
    (
      'staffing_columns',
      (
        SELECT count(*) = 11
        FROM information_schema.columns AS actual
        JOIN (
          VALUES
            ('staffing_needs', 'id', 'uuid'),
            ('staffing_needs', 'location', 'text'),
            ('staffing_needs', 'headcount_need', 'integer'),
            ('staffing_needs', 'updated_at', 'timestamp with time zone'),
            ('staffing_needs', 'updated_by', 'uuid'),
            ('staffing_needs_changelog', 'id', 'uuid'),
            ('staffing_needs_changelog', 'location', 'text'),
            ('staffing_needs_changelog', 'old_value', 'integer'),
            ('staffing_needs_changelog', 'new_value', 'integer'),
            ('staffing_needs_changelog', 'changed_by', 'uuid'),
            ('staffing_needs_changelog', 'changed_at', 'timestamp with time zone')
        ) AS expected(table_name, column_name, data_type)
          ON actual.table_name = expected.table_name
          AND actual.column_name = expected.column_name
          AND actual.data_type = expected.data_type
        WHERE actual.table_schema = 'public'
      ),
      jsonb_build_object(
        'matched_columns', (
          SELECT count(*)
          FROM information_schema.columns AS actual
          JOIN (
            VALUES
              ('staffing_needs', 'id', 'uuid'),
              ('staffing_needs', 'location', 'text'),
              ('staffing_needs', 'headcount_need', 'integer'),
              ('staffing_needs', 'updated_at', 'timestamp with time zone'),
              ('staffing_needs', 'updated_by', 'uuid'),
              ('staffing_needs_changelog', 'id', 'uuid'),
              ('staffing_needs_changelog', 'location', 'text'),
              ('staffing_needs_changelog', 'old_value', 'integer'),
              ('staffing_needs_changelog', 'new_value', 'integer'),
              ('staffing_needs_changelog', 'changed_by', 'uuid'),
              ('staffing_needs_changelog', 'changed_at', 'timestamp with time zone')
          ) AS expected(table_name, column_name, data_type)
            ON actual.table_name = expected.table_name
            AND actual.column_name = expected.column_name
            AND actual.data_type = expected.data_type
          WHERE actual.table_schema = 'public'
        )
      )
    ),
    (
      'staffing_constraints_and_rls',
      EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = to_regclass('public.staffing_needs')
          AND contype = 'p'
      )
        AND EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = to_regclass('public.staffing_needs')
            AND contype = 'u'
            AND pg_get_constraintdef(oid) ILIKE '%UNIQUE (location)%'
        )
        AND EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = to_regclass('public.staffing_needs')
            AND contype = 'c'
            AND pg_get_constraintdef(oid) ILIKE '%location%Trelleborg%Göteborg%'
        )
        AND (
          SELECT count(*) = 1
            AND bool_and(
              contype = 'c'
              AND convalidated
              AND NOT connoinherit
              AND regexp_replace(
                lower(pg_get_expr(conbin, conrelid, true)),
                '[[:space:]()]',
                '',
                'g'
              ) = 'headcount_need>=0andheadcount_need<=9999'
            )
          FROM pg_constraint
          WHERE conrelid = to_regclass('public.staffing_needs')
            AND conname = 'staffing_needs_headcount_need_check'
        )
        AND EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = to_regclass('public.staffing_needs')
            AND contype = 'f'
            AND pg_get_constraintdef(oid) ILIKE '%FOREIGN KEY (updated_by)%REFERENCES%users(id)%'
        )
        AND EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = to_regclass('public.staffing_needs_changelog')
            AND contype = 'p'
        )
        AND EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = to_regclass('public.staffing_needs_changelog')
            AND contype = 'f'
            AND pg_get_constraintdef(oid) ILIKE '%FOREIGN KEY (changed_by)%REFERENCES%users(id)%'
        )
        AND (
          SELECT coalesce(bool_and(relrowsecurity), false)
          FROM pg_class
          WHERE oid IN (
            to_regclass('public.staffing_needs'),
            to_regclass('public.staffing_needs_changelog')
          )
        ),
      jsonb_build_object(
        'constraint_count', (
          SELECT count(*)
          FROM pg_constraint
          WHERE connamespace = 'public'::regnamespace
            AND conrelid IN (
              to_regclass('public.staffing_needs'),
              to_regclass('public.staffing_needs_changelog')
            )
        ),
        'rls_tables', (
          SELECT coalesce(jsonb_agg(relname ORDER BY relname), '[]'::jsonb)
          FROM pg_class
          WHERE oid IN (
            to_regclass('public.staffing_needs'),
            to_regclass('public.staffing_needs_changelog')
          ) AND relrowsecurity
        )
      )
    ),
    (
      'dietary_columns_and_permissions',
      (
        SELECT count(*) = 2
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'employees'
          AND (
            (column_name = 'special_diet' AND data_type = 'boolean')
            OR (column_name = 'diet_details' AND data_type = 'text')
          )
      )
        AND (
          SELECT count(*) = 2
          FROM public.column_config
          WHERE db_column_name IN ('special_diet', 'diet_details')
            AND role_permissions = '{"hr_admin":{"view":true,"edit":true},"omc":{"view":true,"edit":false},"crewing":{"view":true,"edit":false},"recruiter":{"view":true,"edit":false},"sodexo":{"view":true,"edit":false}}'::jsonb
        ),
      jsonb_build_object(
        'columns', (
          SELECT coalesce(jsonb_agg(column_name ORDER BY column_name), '[]'::jsonb)
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'employees'
            AND column_name IN ('special_diet', 'diet_details')
        ),
        'permission_rows', (
          SELECT count(*)
          FROM public.column_config
          WHERE db_column_name IN ('special_diet', 'diet_details')
            AND role_permissions = '{"hr_admin":{"view":true,"edit":true},"omc":{"view":true,"edit":false},"crewing":{"view":true,"edit":false},"recruiter":{"view":true,"edit":false},"sodexo":{"view":true,"edit":false}}'::jsonb
        )
      )
    ),
    (
      'user_filters_objects',
      to_regclass('public.user_filters') IS NOT NULL
        AND (
          SELECT count(*) = 6
            AND bool_and(
              expected.column_name IS NOT NULL
              AND actual.ordinal_position = expected.ordinal_position
              AND actual.data_type = expected.data_type
              AND actual.is_nullable = expected.is_nullable
              AND (
                (
                  expected.column_default IS NULL
                  AND actual.column_default IS NULL
                )
                OR (
                  expected.column_default IS NOT NULL
                  AND coalesce(
                    regexp_replace(
                      lower(actual.column_default),
                      '[[:space:]]+',
                      '',
                      'g'
                    ) = expected.column_default,
                    false
                  )
                )
              )
            )
          FROM information_schema.columns AS actual
          LEFT JOIN (
            VALUES
              (1, 'id', 'uuid', 'NO', 'gen_random_uuid()'),
              (2, 'user_id', 'uuid', 'NO', NULL),
              (3, 'name', 'text', 'NO', NULL),
              (4, 'filters', 'jsonb', 'NO', NULL),
              (5, 'created_at', 'timestamp with time zone', 'NO', 'now()'),
              (6, 'updated_at', 'timestamp with time zone', 'NO', 'now()')
          ) AS expected(
            ordinal_position,
            column_name,
            data_type,
            is_nullable,
            column_default
          )
            ON actual.column_name = expected.column_name
          WHERE actual.table_schema = 'public'
            AND actual.table_name = 'user_filters'
        )
        AND (
          SELECT count(*) = 4
            AND bool_and(
              expected.constraint_name IS NOT NULL
              AND actual.contype::text = expected.constraint_type
              AND actual.convalidated
              AND NOT actual.condeferrable
              AND NOT actual.condeferred
              AND regexp_replace(
                lower(pg_get_constraintdef(actual.oid, true)),
                '[[:space:]()]',
                '',
                'g'
              ) = expected.normalized_definition
            )
          FROM pg_constraint AS actual
          LEFT JOIN (
            VALUES
              ('user_filters_pkey', 'p', 'primarykeyid'),
              (
                'user_filters_user_id_fkey',
                'f',
                'foreignkeyuser_idreferencesauth.usersidondeletecascade'
              ),
              (
                'unique_user_filter_name',
                'u',
                'uniqueuser_id,name'
              ),
              (
                'valid_name_length',
                'c',
                'checkchar_lengthname>0andchar_lengthname<=50'
              )
          ) AS expected(
            constraint_name,
            constraint_type,
            normalized_definition
          )
            ON actual.conname = expected.constraint_name
          WHERE actual.conrelid = to_regclass('public.user_filters')
        )
        AND (
          SELECT count(*) = 2
            AND bool_and(
              expected.index_name IS NOT NULL
              AND indexes.indisvalid
              AND indexes.indisready
              AND indexes.indislive
              AND NOT indexes.indisunique
              AND NOT indexes.indisprimary
              AND regexp_replace(
                regexp_replace(
                  lower(pg_get_indexdef(indexes.indexrelid)),
                  'public[.]',
                  '',
                  'g'
                ),
                '[[:space:]]+',
                '',
                'g'
              ) = expected.normalized_definition
            )
          FROM pg_index AS indexes
          JOIN pg_class AS index_relation
            ON index_relation.oid = indexes.indexrelid
          JOIN pg_class AS table_relation
            ON table_relation.oid = indexes.indrelid
          JOIN pg_namespace AS table_namespace
            ON table_namespace.oid = table_relation.relnamespace
          LEFT JOIN pg_constraint AS backing_constraint
            ON backing_constraint.conindid = indexes.indexrelid
          LEFT JOIN (
            VALUES
              (
                'idx_user_filters_user_id',
                'createindexidx_user_filters_user_idonuser_filtersusingbtree(user_id)'
              ),
              (
                'idx_user_filters_name',
                'createindexidx_user_filters_nameonuser_filtersusingbtree(user_id,lower(name))'
              )
          ) AS expected(index_name, normalized_definition)
            ON index_relation.relname = expected.index_name
          WHERE table_namespace.nspname = 'public'
            AND table_relation.relname = 'user_filters'
            AND backing_constraint.oid IS NULL
        )
        AND (
          SELECT relrowsecurity
          FROM pg_class
          WHERE oid = to_regclass('public.user_filters')
        )
        AND (
          SELECT count(*) = 1
            AND bool_and(
              tgname = 'set_updated_at'
              AND tgenabled = 'O'
              AND tgtype = 19
              AND tgfoid = to_regprocedure('public.trigger_set_updated_at()')
              AND tgattr::text = ''
              AND tgqual IS NULL
              AND tgconstraint = 0
              AND octet_length(tgargs) = 0
            )
          FROM pg_trigger
          WHERE tgrelid = to_regclass('public.user_filters')
            AND NOT tgisinternal
        ),
      jsonb_build_object(
        'table', to_regclass('public.user_filters')::text,
        'indexes', (
          SELECT coalesce(
            jsonb_agg(
              jsonb_build_object(
                'name', index_relation.relname,
                'definition', pg_get_indexdef(indexes.indexrelid)
              )
              ORDER BY index_relation.relname
            ),
            '[]'::jsonb
          )
          FROM pg_index AS indexes
          JOIN pg_class AS index_relation
            ON index_relation.oid = indexes.indexrelid
          JOIN pg_class AS table_relation
            ON table_relation.oid = indexes.indrelid
          JOIN pg_namespace AS table_namespace
            ON table_namespace.oid = table_relation.relnamespace
          LEFT JOIN pg_constraint AS backing_constraint
            ON backing_constraint.conindid = indexes.indexrelid
          WHERE table_namespace.nspname = 'public'
            AND table_relation.relname = 'user_filters'
            AND backing_constraint.oid IS NULL
        ),
        'constraints', (
          SELECT coalesce(
            jsonb_agg(
              jsonb_build_object(
                'name', conname,
                'definition', pg_get_constraintdef(oid, true)
              )
              ORDER BY conname
            ),
            '[]'::jsonb
          )
          FROM pg_constraint
          WHERE conrelid = to_regclass('public.user_filters')
        ),
        'triggers', (
          SELECT coalesce(
            jsonb_agg(
              jsonb_build_object(
                'name', tgname,
                'enabled', tgenabled,
                'type', tgtype,
                'function', tgfoid::regprocedure::text
              )
              ORDER BY tgname
            ),
            '[]'::jsonb
          )
          FROM pg_trigger
          WHERE tgrelid = to_regclass('public.user_filters')
            AND NOT tgisinternal
        ),
        'rls_enabled', (
          SELECT relrowsecurity
          FROM pg_class
          WHERE oid = to_regclass('public.user_filters')
        ),
        'policies', (
          SELECT count(*)
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'user_filters'
        ),
        'policy_names', (
          SELECT coalesce(jsonb_agg(policyname ORDER BY policyname), '[]'::jsonb)
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'user_filters'
        ),
        'missing_update_policy', NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'user_filters'
            AND policyname = 'Users can update their own filters'
        )
      )
    ),
    (
      'user_filters_trigger_function_contract',
      (
        SELECT count(*) = 1
          AND bool_and(
            language.lanname = 'plpgsql'
            AND functions.prokind = 'f'
            AND functions.prorettype = 'trigger'::regtype
            AND NOT functions.proretset
            AND NOT functions.prosecdef
            AND functions.provolatile = 'v'
            AND functions.proparallel = 'u'
            AND NOT functions.proisstrict
            AND NOT functions.proleakproof
            AND functions.pronargs = 0
            AND functions.proargmodes IS NULL
            AND functions.proallargtypes IS NULL
            AND CASE (SELECT catalog_phase FROM verifier_context)
              WHEN 'production_pre_apply' THEN
                functions.proconfig IS NULL
              WHEN 'staging_pre_apply' THEN
                functions.proconfig =
                  ARRAY['search_path=public, pg_temp']::text[]
              WHEN 'post_apply' THEN
                functions.proconfig =
                  ARRAY['search_path=public, pg_temp']::text[]
              ELSE false
            END
            AND regexp_replace(
              lower(functions.prosrc),
              '[[:space:]]+',
              '',
              'g'
            ) = 'beginnew.updated_at=now();returnnew;end;'
          )
        FROM pg_proc AS functions
        JOIN pg_language AS language
          ON language.oid = functions.prolang
        WHERE functions.oid =
          to_regprocedure('public.trigger_set_updated_at()')
      ),
      (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'signature', functions.oid::regprocedure::text,
              'language', language.lanname,
              'return_type', functions.prorettype::regtype::text,
              'returns_set', functions.proretset,
              'security_definer', functions.prosecdef,
              'volatility', functions.provolatile,
              'parallel', functions.proparallel,
              'strict', functions.proisstrict,
              'leakproof', functions.proleakproof,
              'settings', functions.proconfig,
              'source', functions.prosrc
            )
          ),
          '[]'::jsonb
        )
        FROM pg_proc AS functions
        JOIN pg_language AS language
          ON language.oid = functions.prolang
        WHERE functions.oid =
          to_regprocedure('public.trigger_set_updated_at()')
      )
    ),
    (
      'represented_column_contracts',
      (
        SELECT count(*) = 22
          AND bool_and(
            actual.column_name IS NOT NULL
            AND actual.data_type = expected.data_type
            AND actual.is_nullable = expected.is_nullable
            AND (
              (expected.column_default IS NULL AND actual.column_default IS NULL)
              OR regexp_replace(lower(actual.column_default), '[[:space:]]+', '', 'g') =
                expected.column_default
            )
          )
        FROM (
          VALUES
            ('employees', 'repayment_needed_omc', 'boolean', 'YES', 'false'),
            ('employees', 'repayment_needed_pe3', 'boolean', 'YES', 'false'),
            ('employees', 'special_diet', 'boolean', 'NO', 'false'),
            ('employees', 'diet_details', 'text', 'YES', NULL),
            ('employees', 'crewing_done', 'boolean', 'NO', 'false'),
            ('staffing_needs', 'id', 'uuid', 'NO', 'gen_random_uuid()'),
            ('staffing_needs', 'location', 'text', 'NO', NULL),
            ('staffing_needs', 'headcount_need', 'integer', 'NO', '0'),
            ('staffing_needs', 'updated_at', 'timestamp with time zone', 'NO', 'now()'),
            ('staffing_needs', 'updated_by', 'uuid', 'YES', NULL),
            ('staffing_needs_changelog', 'id', 'uuid', 'NO', 'gen_random_uuid()'),
            ('staffing_needs_changelog', 'location', 'text', 'NO', NULL),
            ('staffing_needs_changelog', 'old_value', 'integer', 'NO', NULL),
            ('staffing_needs_changelog', 'new_value', 'integer', 'NO', NULL),
            ('staffing_needs_changelog', 'changed_by', 'uuid', 'NO', NULL),
            ('staffing_needs_changelog', 'changed_at', 'timestamp with time zone', 'NO', 'now()'),
            ('user_filters', 'id', 'uuid', 'NO', 'gen_random_uuid()'),
            ('user_filters', 'user_id', 'uuid', 'NO', NULL),
            ('user_filters', 'name', 'text', 'NO', NULL),
            ('user_filters', 'filters', 'jsonb', 'NO', NULL),
            ('user_filters', 'created_at', 'timestamp with time zone', 'NO', 'now()'),
            ('user_filters', 'updated_at', 'timestamp with time zone', 'NO', 'now()')
        ) AS expected(table_name, column_name, data_type, is_nullable, column_default)
        LEFT JOIN information_schema.columns AS actual
          ON actual.table_schema = 'public'
          AND actual.table_name = expected.table_name
          AND actual.column_name = expected.column_name
      ),
      (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'table', expected.table_name,
              'column', expected.column_name,
              'data_type', actual.data_type,
              'is_nullable', actual.is_nullable,
              'column_default', actual.column_default
            )
            ORDER BY expected.table_name, expected.column_name
          ),
          '[]'::jsonb
        )
        FROM (
          VALUES
            ('employees', 'repayment_needed_omc'),
            ('employees', 'repayment_needed_pe3'),
            ('employees', 'special_diet'),
            ('employees', 'diet_details'),
            ('employees', 'crewing_done'),
            ('staffing_needs', 'id'),
            ('staffing_needs', 'location'),
            ('staffing_needs', 'headcount_need'),
            ('staffing_needs', 'updated_at'),
            ('staffing_needs', 'updated_by'),
            ('staffing_needs_changelog', 'id'),
            ('staffing_needs_changelog', 'location'),
            ('staffing_needs_changelog', 'old_value'),
            ('staffing_needs_changelog', 'new_value'),
            ('staffing_needs_changelog', 'changed_by'),
            ('staffing_needs_changelog', 'changed_at'),
            ('user_filters', 'id'),
            ('user_filters', 'user_id'),
            ('user_filters', 'name'),
            ('user_filters', 'filters'),
            ('user_filters', 'created_at'),
            ('user_filters', 'updated_at')
        ) AS expected(table_name, column_name)
        LEFT JOIN information_schema.columns AS actual
          ON actual.table_schema = 'public'
          AND actual.table_name = expected.table_name
          AND actual.column_name = expected.column_name
      )
    ),
    (
      'represented_function_contracts',
      (
        SELECT count(*) = 3
          AND bool_and(
            functions.oid IS NOT NULL
            AND language.lanname = 'plpgsql'
            AND CASE expected.contract
              WHEN 'room' THEN
                functions.prosecdef = false
                AND CASE (SELECT catalog_phase FROM verifier_context)
                  WHEN 'production_pre_apply' THEN
                    coalesce(functions.proconfig, ARRAY[]::text[]) =
                      ARRAY[]::text[]
                  WHEN 'staging_pre_apply' THEN
                    functions.proconfig =
                      ARRAY['search_path=public, pg_temp']::text[]
                  WHEN 'post_apply' THEN
                    functions.proconfig =
                      ARRAY['search_path=public, pg_temp']::text[]
                  ELSE false
                END
                AND privileges.non_owner_execute_grants =
                  ARRAY['PUBLIC', 'authenticated']::text[]
                AND regexp_replace(
                  lower(pg_get_functiondef(functions.oid)),
                  '[[:space:]]+',
                  '',
                  'g'
                ) LIKE '%hotel_required=true%forupdate%room_number_shared%v_room_occupancy%'
              WHEN 'staffing_pre_or_post_apply' THEN
                functions.prosecdef = true
                AND CASE (SELECT catalog_phase FROM verifier_context)
                  WHEN 'production_pre_apply' THEN
                    coalesce(functions.proconfig, ARRAY[]::text[]) =
                      ARRAY[]::text[]
                    AND privileges.non_owner_execute_grants =
                      ARRAY['PUBLIC']::text[]
                    AND regexp_replace(
                      lower(pg_get_functiondef(functions.oid)),
                      '[[:space:]]+',
                      '',
                      'g'
                    ) LIKE '%selectheadcount_needintov_current%forupdate%updated_by=p_user_id%'
                    AND functions.prosrc NOT ILIKE '%auth.uid()%'
                  WHEN 'staging_pre_apply' THEN
                    functions.proconfig =
                      ARRAY['search_path=public, pg_temp']::text[]
                    AND privileges.non_owner_execute_grants =
                      ARRAY['authenticated', 'service_role']::text[]
                    AND regexp_replace(
                      lower(pg_get_functiondef(functions.oid)),
                      '[[:space:]]+',
                      '',
                      'g'
                    ) LIKE '%selectheadcount_needintov_current%forupdate%updated_by=p_user_id%'
                    AND functions.prosrc NOT ILIKE '%auth.uid()%'
                  WHEN 'post_apply' THEN
                    cardinality(functions.proconfig) = 1
                    AND functions.proconfig[1] IN ('search_path=', 'search_path=""')
                    AND privileges.non_owner_execute_grants =
                      ARRAY['authenticated']::text[]
                    AND regexp_replace(
                      lower(pg_get_functiondef(functions.oid)),
                      '[[:space:]]+',
                      '',
                      'g'
                    ) LIKE '%ifauth.uid()isnull%frompublic.users%whereauth_user_id=auth.uid()%andis_active=true%'
                    AND regexp_replace(
                      lower(pg_get_functiondef(functions.oid)),
                      '[[:space:]]+',
                      '',
                      'g'
                    ) LIKE '%p_user_idisdistinctfromv_actor_id%forupdate%updated_by=v_actor_id%'
                  ELSE false
                END
              ELSE false
            END
          )
        FROM (
          VALUES
            ('public.recalculate_rooms_for_date(uuid)', 'room'),
            ('public.calculate_room_number(uuid,text,text)', 'room'),
            ('public.update_staffing_need(text,integer,uuid)', 'staffing_pre_or_post_apply')
        ) AS expected(signature, contract)
        LEFT JOIN pg_proc AS functions
          ON functions.oid = to_regprocedure(expected.signature)
        LEFT JOIN pg_language AS language
          ON language.oid = functions.prolang
        LEFT JOIN LATERAL (
          SELECT coalesce(
            array_agg(
              CASE
                WHEN acl.grantee = 0 THEN 'PUBLIC'
                ELSE roles.rolname::text
              END
              ORDER BY CASE
                WHEN acl.grantee = 0 THEN 'PUBLIC'
                ELSE roles.rolname::text
              END
            ),
            ARRAY[]::text[]
          ) AS non_owner_execute_grants
          FROM aclexplode(
            coalesce(functions.proacl, acldefault('f', functions.proowner))
          ) AS acl
          LEFT JOIN pg_roles AS roles ON roles.oid = acl.grantee
          WHERE acl.privilege_type = 'EXECUTE'
            AND acl.grantee <> functions.proowner
        ) AS privileges ON true
      ),
      (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'signature', expected.signature,
              'security_definer', functions.prosecdef,
              'settings', functions.proconfig,
              'acl', functions.proacl,
              'definition', pg_get_functiondef(functions.oid)
            )
            ORDER BY expected.signature
          ),
          '[]'::jsonb
        )
        FROM (
          VALUES
            ('public.recalculate_rooms_for_date(uuid)'),
            ('public.calculate_room_number(uuid,text,text)'),
            ('public.update_staffing_need(text,integer,uuid)'),
            ('public.trigger_set_updated_at()')
        ) AS expected(signature)
        LEFT JOIN pg_proc AS functions
          ON functions.oid = to_regprocedure(expected.signature)
      )
    ),
    (
      'staffing_crewing_done_permission_state',
      (
        SELECT count(*) = 1
          AND bool_and(
            lower(column_type) = 'boolean'
            AND role_permissions -> 'crewing' =
              '{"view":true,"edit":false}'::jsonb
          )
        FROM public.column_config
        WHERE db_column_name = 'crewing_done'
      ),
      (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'column_type', column_type,
              'crewing', role_permissions -> 'crewing'
            )
          ),
          '[]'::jsonb
        )
        FROM public.column_config
        WHERE db_column_name = 'crewing_done'
      )
    ),
    (
      'represented_policy_contracts',
      (
        SELECT coalesce(bool_or(
          profile.expected_count = profile.actual_count
            AND profile.matched_count = profile.expected_count
            AND profile.all_contracts_match
        ), false)
        FROM (
          SELECT
            expected.profile_name,
            count(*) AS expected_count,
            (
              SELECT count(*)
              FROM represented_policies AS actual
              WHERE expected.profile_name = 'post_apply'
                OR actual.tablename IN (
                  SELECT scoped.table_name
                  FROM expected_policy_contracts AS scoped
                  WHERE scoped.profile_name = expected.profile_name
                )
            ) AS actual_count,
            count(policy.policyname) AS matched_count,
            bool_and(coalesce(
              policy.permissive = 'PERMISSIVE'
                AND policy.roles = expected.roles
                AND policy.cmd = expected.command
                AND policy.normalized_qual IS NOT DISTINCT FROM expected.normalized_qual
                AND policy.normalized_with_check IS NOT DISTINCT FROM expected.normalized_with_check,
              false
            )) AS all_contracts_match
          FROM expected_policy_contracts AS expected
          LEFT JOIN represented_policies AS policy
            ON policy.tablename = expected.table_name
            AND policy.policyname = expected.policy_name
          WHERE expected.profile_name = (
            SELECT catalog_phase FROM verifier_context
          )
          GROUP BY expected.profile_name
        ) AS profile
      ),
      (
        SELECT jsonb_build_object(
          'policies', coalesce(
            jsonb_agg(
              jsonb_build_object(
                'table', tablename,
                'name', policyname,
                'permissive', permissive,
                'roles', roles,
                'command', cmd,
                'qual', qual,
                'with_check', with_check
              )
              ORDER BY tablename, policyname
            ),
            '[]'::jsonb
          ),
          'missing_user_filters_update_policy', NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'user_filters'
              AND policyname = 'Users can update their own filters'
          )
        )
        FROM pg_policies
        WHERE schemaname = 'public'
      )
    )
)
SELECT check_name, passed, observed
FROM catalog_checks
ORDER BY check_name;

COMMIT;
