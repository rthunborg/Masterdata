-- Supporting diagnostic only. It emits aggregate facts and hashes, never
-- passwords, role names, configuration strings, addresses, or catalog rows.
-- Role expiry/configuration values contribute only to the role-graph hash.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

WITH cli AS (
  SELECT oid, rolcanlogin, rolsuper, rolinherit, rolcreaterole, rolcreatedb,
    rolreplication, rolbypassrls, rolvaliduntil
  FROM pg_roles
  WHERE rolname = 'cli_login_postgres'
),
direct_memberships AS (
  SELECT membership.roleid, membership.admin_option, membership.inherit_option,
    membership.set_option
  FROM pg_auth_members AS membership
  JOIN cli ON cli.oid = membership.member
),
role_graph AS (
  SELECT jsonb_build_object(
    'roles', (
      SELECT jsonb_agg(jsonb_build_object(
        'oid', role_row.oid, 'name', role_row.rolname,
        'canLogin', role_row.rolcanlogin, 'superuser', role_row.rolsuper,
        'inherit', role_row.rolinherit, 'createRole', role_row.rolcreaterole,
        'createDb', role_row.rolcreatedb, 'replication', role_row.rolreplication,
        'bypassRls', role_row.rolbypassrls, 'validUntil', role_row.rolvaliduntil,
        'connectionLimit', role_row.rolconnlimit, 'config', role_row.rolconfig
      ) ORDER BY role_row.oid)
      FROM pg_roles AS role_row
    ),
    'memberships', (
      SELECT jsonb_agg(jsonb_build_object(
        'roleId', membership.roleid, 'member', membership.member,
        'grantor', membership.grantor, 'admin', membership.admin_option,
        'inherit', membership.inherit_option, 'set', membership.set_option
      ) ORDER BY membership.roleid, membership.member, membership.grantor)
      FROM pg_auth_members AS membership
    )
  ) AS value
),
non_system_schemas AS (
  SELECT
    count(*)::int AS schema_count,
    count(*) FILTER (WHERE has_schema_privilege(cli.oid, namespace_row.oid, 'USAGE'))::int
      AS usage_count,
    count(*) FILTER (WHERE has_schema_privilege(cli.oid, namespace_row.oid, 'CREATE'))::int
      AS create_count,
    count(*) FILTER (WHERE namespace_row.nspowner = cli.oid)::int AS owned_schema_count
  FROM cli
  CROSS JOIN pg_namespace AS namespace_row
  WHERE namespace_row.nspname !~ '^pg_' AND namespace_row.nspname <> 'information_schema'
),
non_system_relations AS (
  SELECT
    count(*) FILTER (WHERE class_row.relowner = cli.oid)::int AS owned_relation_count,
    count(*) FILTER (WHERE class_row.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND has_table_privilege(cli.oid, class_row.oid, 'INSERT'))::int
      AS insert_count,
    count(*) FILTER (WHERE class_row.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND has_table_privilege(cli.oid, class_row.oid, 'UPDATE'))::int
      AS update_count,
    count(*) FILTER (WHERE class_row.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND has_table_privilege(cli.oid, class_row.oid, 'DELETE'))::int
      AS delete_count,
    count(*) FILTER (WHERE class_row.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND has_table_privilege(cli.oid, class_row.oid, 'TRUNCATE'))::int
      AS truncate_count
  FROM cli
  CROSS JOIN pg_class AS class_row
  JOIN pg_namespace AS namespace_row ON namespace_row.oid = class_row.relnamespace
  WHERE namespace_row.nspname !~ '^pg_' AND namespace_row.nspname <> 'information_schema'
),
non_system_sequences AS (
  SELECT
    count(*) FILTER (WHERE has_sequence_privilege(cli.oid, class_row.oid, 'USAGE'))::int
      AS usage_count,
    count(*) FILTER (WHERE has_sequence_privilege(cli.oid, class_row.oid, 'UPDATE'))::int
      AS update_count
  FROM cli
  CROSS JOIN pg_class AS class_row
  JOIN pg_namespace AS namespace_row ON namespace_row.oid = class_row.relnamespace
  WHERE namespace_row.nspname !~ '^pg_' AND namespace_row.nspname <> 'information_schema'
    AND class_row.relkind = 'S'
),
non_system_routines AS (
  SELECT
    count(*) FILTER (WHERE procedure_row.proowner = cli.oid)::int AS owned_routine_count,
    count(*) FILTER (WHERE has_function_privilege(cli.oid, procedure_row.oid, 'EXECUTE'))::int
      AS execute_count
  FROM cli
  CROSS JOIN pg_proc AS procedure_row
  JOIN pg_namespace AS namespace_row ON namespace_row.oid = procedure_row.pronamespace
  WHERE namespace_row.nspname !~ '^pg_' AND namespace_row.nspname <> 'information_schema'
),
non_system_types AS (
  SELECT count(*) FILTER (WHERE type_row.typowner = cli.oid)::int AS owned_type_count
  FROM cli
  CROSS JOIN pg_type AS type_row
  JOIN pg_namespace AS namespace_row ON namespace_row.oid = type_row.typnamespace
  WHERE namespace_row.nspname !~ '^pg_' AND namespace_row.nspname <> 'information_schema'
)
SELECT jsonb_build_object(
  'schemaVersion', 1,
  'kind', 'cli-membership-privileges',
  'cliPresentCount', (SELECT count(*)::int FROM cli),
  'cliAttributes', (SELECT jsonb_build_object(
    'canLogin', rolcanlogin, 'superuser', rolsuper, 'inheritRoleAttribute', rolinherit,
    'createRole', rolcreaterole, 'createDb', rolcreatedb, 'replication', rolreplication,
    'bypassRls', rolbypassrls, 'passwordExpirySpecified', rolvaliduntil IS NOT NULL,
    'passwordExpired', coalesce(rolvaliduntil <= current_timestamp, false)
  ) FROM cli),
  'memberships', jsonb_build_object(
    'directMembershipCount', (SELECT count(*)::int FROM direct_memberships),
    'directPostgresMembershipCount', (
      SELECT count(*)::int FROM direct_memberships AS membership
      JOIN pg_roles AS role_row ON role_row.oid = membership.roleid
      WHERE role_row.rolname = 'postgres'
    ),
    'otherDirectMembershipCount', (
      SELECT count(*)::int FROM direct_memberships AS membership
      JOIN pg_roles AS role_row ON role_row.oid = membership.roleid
      WHERE role_row.rolname <> 'postgres'
    ),
    'postgresDirectAdmin', (
      SELECT coalesce(bool_or(membership.admin_option), false)
      FROM direct_memberships AS membership
      JOIN pg_roles AS role_row ON role_row.oid = membership.roleid
      WHERE role_row.rolname = 'postgres'
    ),
    'postgresDirectInherit', (
      SELECT coalesce(bool_or(membership.inherit_option), false)
      FROM direct_memberships AS membership
      JOIN pg_roles AS role_row ON role_row.oid = membership.roleid
      WHERE role_row.rolname = 'postgres'
    ),
    'postgresDirectSet', (
      SELECT coalesce(bool_or(membership.set_option), false)
      FROM direct_memberships AS membership
      JOIN pg_roles AS role_row ON role_row.oid = membership.roleid
      WHERE role_row.rolname = 'postgres'
    ),
    'postgresMember', (SELECT pg_has_role(oid, 'postgres', 'MEMBER') FROM cli),
    'postgresUsage', (SELECT pg_has_role(oid, 'postgres', 'USAGE') FROM cli),
    'postgresSet', (SELECT pg_has_role(oid, 'postgres', 'SET') FROM cli),
    'postgresAdmin', (
      SELECT pg_has_role(oid, 'postgres', 'MEMBER WITH ADMIN OPTION') FROM cli
    )
  ),
  'currentDatabase', (SELECT jsonb_build_object(
    'connect', has_database_privilege(oid, current_database(), 'CONNECT'),
    'create', has_database_privilege(oid, current_database(), 'CREATE'),
    'temporary', has_database_privilege(oid, current_database(), 'TEMPORARY')
  ) FROM cli),
  'nonSystemSchemas', (SELECT jsonb_build_object(
    'schemaCount', schema_count, 'usageCount', usage_count, 'createCount', create_count,
    'ownedSchemaCount', owned_schema_count
  ) FROM non_system_schemas),
  'nonSystemObjects', (SELECT jsonb_build_object(
    'ownedRelationCount', relations.owned_relation_count,
    'ownedRoutineCount', routines.owned_routine_count,
    'ownedTypeCount', types.owned_type_count,
    'insertCount', relations.insert_count, 'updateCount', relations.update_count,
    'deleteCount', relations.delete_count, 'truncateCount', relations.truncate_count,
    'sequenceUsageCount', sequences.usage_count, 'sequenceUpdateCount', sequences.update_count,
    'executeRoutineCount', routines.execute_count
  ) FROM non_system_relations AS relations
    CROSS JOIN non_system_sequences AS sequences
    CROSS JOIN non_system_routines AS routines
    CROSS JOIN non_system_types AS types),
  'activeSessionCount', (
    SELECT count(*)::int FROM pg_stat_activity
    WHERE datname = current_database() AND usename = 'cli_login_postgres'
  ),
  'completeNonSecretRoleGraphSha256', (
    SELECT encode(sha256(convert_to(role_graph.value::text, 'UTF8')), 'hex') FROM role_graph
  ),
  'managedLoginProfileMd5', (
    SELECT md5(coalesce(string_agg(
      role_row.rolname || E'\x1f' || role_row.rolsuper::text || E'\x1f' || role_row.rolbypassrls::text || E'\x1f' ||
      has_database_privilege(role_row.oid, current_database(), 'CONNECT')::text || E'\x1f' ||
      has_schema_privilege(role_row.oid, 'public', 'USAGE')::text || E'\x1f' ||
      has_schema_privilege(role_row.oid, 'public', 'CREATE')::text || E'\x1f' ||
      (SELECT count(*) FROM pg_auth_members WHERE member=role_row.oid)::text,
      E'\x1e' ORDER BY role_row.rolname), ''))
    FROM pg_roles AS role_row WHERE role_row.rolname='cli_login_postgres' AND role_row.rolcanlogin
  )
)::text;
ROLLBACK;
