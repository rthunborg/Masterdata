-- Aggregate-only database-writer classification. It never returns role names
-- outside the fixed platform list, addresses, application names, query text,
-- PIDs, slot names, LSNs, or row data.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

WITH known_roles(role_name) AS (
  VALUES
    ('postgres'), ('anon'), ('authenticated'), ('service_role'), ('authenticator'),
    ('supabase_auth_admin'), ('supabase_storage_admin'), ('supabase_admin'),
    ('supabase_realtime_admin'), ('supabase_etl_admin'), ('supabase_replication_admin'),
    ('supabase_functions_admin'), ('supabase_read_only_user'), ('dashboard_user'), ('pgbouncer')
),
known_plugins(plugin_name) AS (
  VALUES ('pgoutput'), ('wal2json'), ('decoderbufs'), ('test_decoding'), ('pglogical_output')
),
role_memberships AS (
  SELECT known.role_name,
    count(parent_role.oid)::bigint AS direct_membership_count,
    md5(coalesce(string_agg(parent_role.rolname, E'\x1e' ORDER BY parent_role.rolname), '')) AS profile_md5
  FROM known_roles AS known
  LEFT JOIN pg_roles AS member_role ON member_role.rolname = known.role_name
  LEFT JOIN pg_auth_members AS membership ON membership.member = member_role.oid
  LEFT JOIN pg_roles AS parent_role ON parent_role.oid = membership.roleid
  GROUP BY known.role_name
),
role_facts AS (
  SELECT known.role_name,
    role_row.oid IS NOT NULL AS present,
    coalesce(role_row.rolcanlogin, false) AS can_login,
    coalesce(role_row.rolsuper, false) AS superuser,
    coalesce(role_row.rolbypassrls, false) AS bypass_rls,
    EXISTS (
      SELECT 1 FROM pg_namespace AS namespace_row
      WHERE namespace_row.nspname = 'public' AND namespace_row.nspowner = role_row.oid
    ) AS owns_public_schema,
    membership.direct_membership_count,
    membership.profile_md5 AS membership_profile_md5,
    CASE WHEN role_row.oid IS NULL THEN false
      ELSE has_database_privilege(role_row.oid, current_database(), 'CONNECT') END AS effective_database_connect,
    CASE WHEN role_row.oid IS NULL THEN false
      ELSE has_schema_privilege(role_row.oid, 'public', 'USAGE') END AS effective_public_usage,
    CASE WHEN role_row.oid IS NULL THEN false
      ELSE has_schema_privilege(role_row.oid, 'public', 'CREATE') END AS effective_public_create,
    coalesce(public_objects.owned_object_count, 0)::bigint AS owned_public_object_count,
    coalesce(public_relations.insert_count, 0)::bigint AS effective_public_insert_relation_count,
    coalesce(public_relations.update_count, 0)::bigint AS effective_public_update_relation_count,
    coalesce(public_relations.delete_count, 0)::bigint AS effective_public_delete_relation_count,
    coalesce(public_relations.truncate_count, 0)::bigint AS effective_public_truncate_relation_count,
    coalesce(public_routines.execute_count, 0)::bigint AS effective_public_execute_routine_count
  FROM known_roles AS known
  LEFT JOIN pg_roles AS role_row ON role_row.rolname = known.role_name
  JOIN role_memberships AS membership ON membership.role_name = known.role_name
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS owned_object_count
    FROM (
      SELECT class_row.oid
      FROM pg_class AS class_row
      JOIN pg_namespace AS namespace_row ON namespace_row.oid = class_row.relnamespace
      WHERE namespace_row.nspname = 'public' AND class_row.relowner = role_row.oid
      UNION ALL
      SELECT procedure_row.oid
      FROM pg_proc AS procedure_row
      JOIN pg_namespace AS namespace_row ON namespace_row.oid = procedure_row.pronamespace
      WHERE namespace_row.nspname = 'public' AND procedure_row.proowner = role_row.oid
    ) AS owned_object
  ) AS public_objects ON true
  LEFT JOIN LATERAL (
    SELECT
      count(*) FILTER (WHERE has_table_privilege(role_row.oid, class_row.oid, 'INSERT'))::bigint AS insert_count,
      count(*) FILTER (WHERE has_table_privilege(role_row.oid, class_row.oid, 'UPDATE'))::bigint AS update_count,
      count(*) FILTER (WHERE has_table_privilege(role_row.oid, class_row.oid, 'DELETE'))::bigint AS delete_count,
      count(*) FILTER (WHERE has_table_privilege(role_row.oid, class_row.oid, 'TRUNCATE'))::bigint AS truncate_count
    FROM pg_class AS class_row
    JOIN pg_namespace AS namespace_row ON namespace_row.oid = class_row.relnamespace
    WHERE role_row.oid IS NOT NULL
      AND namespace_row.nspname = 'public'
      AND class_row.relkind IN ('r', 'p', 'v', 'm', 'f')
  ) AS public_relations ON true
  LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE has_function_privilege(role_row.oid, procedure_row.oid, 'EXECUTE'))::bigint AS execute_count
    FROM pg_proc AS procedure_row
    JOIN pg_namespace AS namespace_row ON namespace_row.oid = procedure_row.pronamespace
    WHERE role_row.oid IS NOT NULL
      AND namespace_row.nspname = 'public'
  ) AS public_routines ON true
),
known_role_json AS (
  SELECT jsonb_object_agg(role_name, jsonb_build_object(
    'present', present,
    'canLogin', can_login,
    'superuser', superuser,
    'bypassRls', bypass_rls,
    'ownsPublicSchema', owns_public_schema,
    'directMembershipCount', direct_membership_count,
    'membershipProfileMd5', membership_profile_md5,
    'ownedPublicObjectCount', owned_public_object_count,
    'effectiveDatabaseConnect', effective_database_connect,
    'effectivePublicUsage', effective_public_usage,
    'effectivePublicCreate', effective_public_create,
    'effectivePublicInsertRelationCount', effective_public_insert_relation_count,
    'effectivePublicUpdateRelationCount', effective_public_update_relation_count,
    'effectivePublicDeleteRelationCount', effective_public_delete_relation_count,
    'effectivePublicTruncateRelationCount', effective_public_truncate_relation_count,
    'effectivePublicExecuteRoutineCount', effective_public_execute_routine_count
  ) ORDER BY role_name) AS value
  FROM role_facts
),
unknown_login_roles AS (
  SELECT role_row.rolname, role_row.rolsuper, role_row.rolbypassrls,
    has_database_privilege(role_row.oid, current_database(), 'CONNECT') AS database_connect,
    has_schema_privilege(role_row.oid, 'public', 'USAGE') AS public_usage,
    has_schema_privilege(role_row.oid, 'public', 'CREATE') AS public_create,
    count(membership.roleid)::bigint AS membership_count
  FROM pg_roles AS role_row
  LEFT JOIN pg_auth_members AS membership ON membership.member = role_row.oid
  WHERE role_row.rolcanlogin
    AND NOT EXISTS (SELECT 1 FROM known_roles AS known WHERE known.role_name = role_row.rolname)
  GROUP BY role_row.oid, role_row.rolname, role_row.rolsuper, role_row.rolbypassrls
),
unknown_login_summary AS (
  SELECT count(*)::bigint AS count,
    md5(coalesce(string_agg(
      rolname || E'\x1f' || rolsuper::text || E'\x1f' || rolbypassrls::text || E'\x1f' ||
      database_connect::text || E'\x1f' || public_usage::text || E'\x1f' || public_create::text || E'\x1f' || membership_count::text,
      E'\x1e' ORDER BY rolname
    ), '')) AS profile_md5
  FROM unknown_login_roles
),
sessions AS (
  SELECT activity.usename, activity.backend_type,
    EXISTS (SELECT 1 FROM known_roles AS known WHERE known.role_name = activity.usename) AS known_role
  FROM pg_stat_activity AS activity
  WHERE activity.datname = current_database()
),
session_summary AS (
  SELECT jsonb_build_object(
    'totalClientBackendCount', count(*) FILTER (WHERE backend_type = 'client backend'),
    'knownRoleClientBackendCounts', jsonb_build_object(
      'postgres', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'postgres'),
      'anon', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'anon'),
      'authenticated', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'authenticated'),
      'service_role', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'service_role'),
      'authenticator', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'authenticator'),
      'supabase_auth_admin', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'supabase_auth_admin'),
      'supabase_storage_admin', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'supabase_storage_admin'),
      'supabase_admin', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'supabase_admin'),
      'supabase_realtime_admin', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'supabase_realtime_admin'),
      'supabase_etl_admin', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'supabase_etl_admin'),
      'supabase_replication_admin', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'supabase_replication_admin'),
      'supabase_functions_admin', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'supabase_functions_admin'),
      'supabase_read_only_user', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'supabase_read_only_user'),
      'dashboard_user', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'dashboard_user'),
      'pgbouncer', count(*) FILTER (WHERE backend_type = 'client backend' AND usename = 'pgbouncer')
    ),
    'unknownRoleClientBackendCount', count(*) FILTER (WHERE backend_type = 'client backend' AND NOT known_role),
    'unknownRoleClientBackendProfileMd5', md5(coalesce(string_agg(
      CASE WHEN backend_type = 'client backend' AND NOT known_role THEN usename || E'\x1f' || backend_type END,
      E'\x1e' ORDER BY usename, backend_type
    ) FILTER (WHERE backend_type = 'client backend' AND NOT known_role), '')),
    'knownNonclientBackendCount', count(*) FILTER (WHERE backend_type IN (
      'autovacuum launcher', 'autovacuum worker', 'background worker', 'background writer',
      'checkpointer', 'logical replication launcher', 'startup', 'walreceiver', 'walsender'
    )),
    'unknownBackendCount', count(*) FILTER (WHERE backend_type <> 'client backend' AND backend_type NOT IN (
      'autovacuum launcher', 'autovacuum worker', 'background worker', 'background writer',
      'checkpointer', 'logical replication launcher', 'startup', 'walreceiver', 'walsender'
    )),
    'unknownBackendProfileMd5', md5(coalesce(string_agg(
      CASE WHEN backend_type <> 'client backend' AND backend_type NOT IN (
        'autovacuum launcher', 'autovacuum worker', 'background worker', 'background writer',
        'checkpointer', 'logical replication launcher', 'startup', 'walreceiver', 'walsender'
      ) THEN backend_type END,
      E'\x1e' ORDER BY backend_type
    ) FILTER (WHERE backend_type <> 'client backend' AND backend_type NOT IN (
      'autovacuum launcher', 'autovacuum worker', 'background worker', 'background writer',
      'checkpointer', 'logical replication launcher', 'startup', 'walreceiver', 'walsender'
    )), ''))
  ) AS value
  FROM sessions
),
subscription_summary AS (
  SELECT count(*)::bigint AS total_count,
    count(*) FILTER (WHERE subenabled)::bigint AS enabled_count
  FROM pg_subscription
  WHERE subdbid = (SELECT database_row.oid FROM pg_database AS database_row WHERE database_row.datname = current_database())
),
replication_summary AS (
  SELECT jsonb_build_object(
    'totalSlotCount', count(*),
    'activeSlotCount', count(*) FILTER (WHERE active),
    'knownPluginSlotCounts', jsonb_build_object(
      'pgoutput', count(*) FILTER (WHERE plugin = 'pgoutput'),
      'wal2json', count(*) FILTER (WHERE plugin = 'wal2json'),
      'decoderbufs', count(*) FILTER (WHERE plugin = 'decoderbufs'),
      'test_decoding', count(*) FILTER (WHERE plugin = 'test_decoding'),
      'pglogical_output', count(*) FILTER (WHERE plugin = 'pglogical_output')
    ),
    'unknownPluginSlotCount', count(*) FILTER (WHERE plugin IS NULL OR NOT EXISTS (
      SELECT 1 FROM known_plugins AS known WHERE known.plugin_name = pg_replication_slots.plugin
    )),
    'unknownPluginProfileMd5', md5(coalesce(string_agg(
      CASE WHEN plugin IS NULL OR NOT EXISTS (
        SELECT 1 FROM known_plugins AS known WHERE known.plugin_name = pg_replication_slots.plugin
      ) THEN coalesce(plugin, '<null>') || E'\x1f' || slot_type || E'\x1f' || active::text END,
      E'\x1e' ORDER BY plugin NULLS FIRST, slot_type, active
    ) FILTER (WHERE plugin IS NULL OR NOT EXISTS (
      SELECT 1 FROM known_plugins AS known WHERE known.plugin_name = pg_replication_slots.plugin
    )), ''))
  ) AS value
  FROM pg_replication_slots
),
auth_summary AS (
  SELECT
    to_regnamespace('auth') IS NOT NULL AS auth_schema_present,
    count(*) FILTER (WHERE NOT trigger_row.tgisinternal)::bigint AS custom_trigger_count,
    md5(coalesce(string_agg(
      trigger_row.tgrelid::text || E'\x1f' || trigger_row.tgfoid::text || E'\x1f' || trigger_row.tgenabled::text || E'\x1f' || trigger_row.tgtype::text,
      E'\x1e' ORDER BY trigger_row.tgrelid, trigger_row.tgfoid, trigger_row.oid
    ) FILTER (WHERE NOT trigger_row.tgisinternal), '')) AS custom_trigger_profile_md5
  FROM pg_trigger AS trigger_row
  JOIN pg_class AS relation_row ON relation_row.oid = trigger_row.tgrelid
  JOIN pg_namespace AS relation_schema ON relation_schema.oid = relation_row.relnamespace
  WHERE relation_schema.nspname = 'auth'
),
hook_summary AS (
  SELECT
    count(*) FILTER (WHERE procedure_row.proname IN (
      'custom_access_token_hook', 'password_verification_hook', 'mfa_verification_hook', 'before_user_created_hook'
    ))::bigint AS named_hook_candidate_count,
    md5(coalesce(string_agg(
      procedure_row.oid::text || E'\x1f' || procedure_row.proowner::text || E'\x1f' || procedure_row.prosecdef::text || E'\x1f' || procedure_row.provolatile::text,
      E'\x1e' ORDER BY procedure_row.oid
    ) FILTER (WHERE procedure_row.proname IN (
      'custom_access_token_hook', 'password_verification_hook', 'mfa_verification_hook', 'before_user_created_hook'
    )), '')) AS named_hook_candidate_profile_md5,
    count(*) FILTER (WHERE procedure_row.proname ILIKE '%hook%' AND procedure_row.proname NOT IN (
      'custom_access_token_hook', 'password_verification_hook', 'mfa_verification_hook', 'before_user_created_hook'
    ))::bigint AS unrecognized_hook_pattern_count,
    md5(coalesce(string_agg(
      procedure_row.proname || E'\x1f' || procedure_row.oid::text || E'\x1f' || procedure_row.proowner::text,
      E'\x1e' ORDER BY procedure_row.proname, procedure_row.oid
    ) FILTER (WHERE procedure_row.proname ILIKE '%hook%' AND procedure_row.proname NOT IN (
      'custom_access_token_hook', 'password_verification_hook', 'mfa_verification_hook', 'before_user_created_hook'
    )), '')) AS unrecognized_hook_pattern_profile_md5
  FROM pg_proc AS procedure_row
),
public_webhook_summary AS (
  SELECT count(*)::bigint AS identifiable_trigger_count,
    md5(coalesce(string_agg(
      trigger_row.tgrelid::text || E'\x1f' || trigger_row.tgfoid::text || E'\x1f' || trigger_row.tgenabled::text || E'\x1f' || trigger_row.tgtype::text,
      E'\x1e' ORDER BY trigger_row.tgrelid, trigger_row.tgfoid, trigger_row.oid
    ), '')) AS profile_md5
  FROM pg_trigger AS trigger_row
  JOIN pg_class AS relation_row ON relation_row.oid = trigger_row.tgrelid
  JOIN pg_namespace AS relation_schema ON relation_schema.oid = relation_row.relnamespace
  JOIN pg_proc AS procedure_row ON procedure_row.oid = trigger_row.tgfoid
  JOIN pg_namespace AS procedure_schema ON procedure_schema.oid = procedure_row.pronamespace
  WHERE NOT trigger_row.tgisinternal AND relation_schema.nspname = 'public'
    AND (procedure_schema.nspname = 'net' OR procedure_row.proname ILIKE '%webhook%' OR
      procedure_row.prosrc ILIKE '%net.http%' OR procedure_row.prosrc ILIKE '%http_post%' OR procedure_row.prosrc ILIKE '%http_get%')
)
SELECT jsonb_build_object(
  'schemaVersion', 1,
  'kind', 'production-database-writer-classification',
  'knownRoles', known_role_json.value,
  'unknownLoginRoles', jsonb_build_object('count', unknown_login_summary.count, 'profileMd5', unknown_login_summary.profile_md5),
  'sessions', session_summary.value,
  'subscriptions', jsonb_build_object('totalCount', subscription_summary.total_count, 'enabledCount', subscription_summary.enabled_count),
  'replicationSlots', replication_summary.value,
  'authCustomHooks', jsonb_build_object(
    'authSchemaPresent', auth_summary.auth_schema_present,
    'authTriggerScopeOnlyAuthSchema', true,
    'namedHookCandidateSearchIsNameBounded', true,
    'fullAuthConfigurationCoverage', false,
    'customTriggerCount', auth_summary.custom_trigger_count,
    'customTriggerProfileMd5', auth_summary.custom_trigger_profile_md5,
    'namedHookCandidateCount', hook_summary.named_hook_candidate_count,
    'namedHookCandidateProfileMd5', hook_summary.named_hook_candidate_profile_md5,
    'unrecognizedHookPatternCount', hook_summary.unrecognized_hook_pattern_count,
    'unrecognizedHookPatternProfileMd5', hook_summary.unrecognized_hook_pattern_profile_md5
  ),
  'publicWebhookTriggers', jsonb_build_object(
    'patternCoverageOnly', true,
    'fullOutboundWriterCoverage', false,
    'identifiableTriggerCount', public_webhook_summary.identifiable_trigger_count,
    'profileMd5', public_webhook_summary.profile_md5
  )
)::text
FROM known_role_json, unknown_login_summary, session_summary, subscription_summary,
  replication_summary, auth_summary, hook_summary, public_webhook_summary;

ROLLBACK;
