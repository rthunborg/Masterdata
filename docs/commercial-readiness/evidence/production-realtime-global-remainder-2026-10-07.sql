-- Exact observed administrative ingress snapshot; no routine safety classification.
-- Outputs aggregate counts/digests only; never identities, owners, bodies or ACL text.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';
WITH cli AS (SELECT oid FROM pg_roles WHERE rolname='cli_login_postgres'), routines AS (
 SELECT p.oid, p.prokind, p.prosecdef, p.proowner,
 CASE WHEN n.nspname='public' THEN 'public' ELSE 'non_public_non_system' END AS schema_class,
 CASE WHEN l.lanname IN ('sql','plpgsql','c','internal') THEN l.lanname ELSE 'other' END AS language_class,
 has_schema_privilege(cli.oid,n.oid,'USAGE') AS schema_usage,
 EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e' AND d.refclassid='pg_extension'::regclass) AS extension_member,
 EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.privilege_type='EXECUTE' AND a.grantee=0) AS public_grant,
 EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.privilege_type='EXECUTE' AND a.grantee=cli.oid) AS direct_cli_grant,
 EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a JOIN pg_roles r ON r.oid=a.grantee WHERE a.privilege_type='EXECUTE' AND r.rolname='postgres') AS postgres_grant,
 EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE a.privilege_type='EXECUTE' AND a.grantee<>0 AND a.grantee<>cli.oid AND r.rolname IS DISTINCT FROM 'postgres') AS other_grant,
 jsonb_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))::text AS identity,
 CASE WHEN p.prokind IN ('f','p') THEN pg_get_functiondef(p.oid) ELSE p.prosrc END AS definition,
 (SELECT coalesce(jsonb_agg(jsonb_build_array(a.grantor,a.grantee,a.privilege_type,a.is_grantable) ORDER BY a.grantor,a.grantee,a.privilege_type,a.is_grantable),'[]'::jsonb)::text FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a) AS acl
 FROM cli CROSS JOIN pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND has_function_privilege(cli.oid,p.oid,'EXECUTE')
), expected AS (
 SELECT 'plpgsql'::text AS language_class,13::int AS previous_count,'e398232a8e468bcbcbe29b93a7fe18b6938b9e83afec73cbf3695bfedc62da35'::text AS previous_hash
 UNION ALL SELECT 'sql',8,'2a01df6a83dd6dc0370eba2913e42a3604a1d4e0468a6f2a841990a3d95e13ed'
), eligible AS (
 SELECT r.*,e.previous_count,e.previous_hash FROM routines r JOIN expected e USING(language_class)
 WHERE r.schema_class='non_public_non_system' AND r.prokind='f' AND NOT r.prosecdef AND NOT r.schema_usage AND NOT r.extension_member AND r.public_grant AND NOT r.direct_cli_grant AND r.postgres_grant AND r.other_grant
), candidates AS (
 SELECT r.*, (SELECT count(*)::int FROM eligible v WHERE v.language_class=r.language_class) AS current_count,
 (SELECT encode(sha256(convert_to(string_agg(jsonb_build_array(v.identity,v.definition,v.acl)::text,E'\n' ORDER BY v.identity),'UTF8')),'hex') FROM eligible v WHERE v.language_class=r.language_class AND v.oid<>r.oid) AS remainder_hash
 FROM eligible r
), matched AS (
 SELECT c.oid,language_class,previous_count,current_count,previous_hash,remainder_hash,
 encode(sha256(convert_to(identity,'UTF8')),'hex') AS identity_hash,
 encode(sha256(convert_to(definition,'UTF8')),'hex') AS definition_hash,
 encode(sha256(convert_to(acl,'UTF8')),'hex') AS acl_hash,
 (SELECT encode(sha256(convert_to(p.prosrc,'UTF8')),'hex') FROM pg_proc p WHERE p.oid=c.oid) AS body_hash,
 (SELECT r.rolname='supabase_realtime_admin' FROM pg_roles r WHERE r.oid=c.proowner) AS provider_owner,
 (SELECT p.provolatile='v' FROM pg_proc p WHERE p.oid=c.oid) AS volatile_routine,
 (SELECT CASE WHEN n.nspname IN ('auth','storage','realtime','extensions','supabase_functions','graphql','graphql_public','vault') THEN n.nspname ELSE 'other_non_system' END FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.oid=c.oid) AS known_schema
 FROM candidates c WHERE current_count=previous_count+1 AND remainder_hash=previous_hash
)
SELECT jsonb_build_object('schemaVersion',1,'kind','production-routine-delta-proof','matchedCandidateCount',(SELECT count(*)::int FROM matched),'expectedChangedGroupCount',2,'remainingRoutineCount',(SELECT count(*)::int FROM routines r WHERE NOT EXISTS(SELECT 1 FROM matched m WHERE m.oid=r.oid)),'originalAllRoutineSetMatches',(SELECT encode(sha256(convert_to(coalesce(string_agg(jsonb_build_array(r.identity,r.definition,r.acl)::text,E'\n' ORDER BY r.identity),''),'UTF8')),'hex')='4b1e52ad1ce7ddb3116e641573e90c78b321f9a4bb3f183a50f7708e75a174e8' FROM routines r WHERE NOT EXISTS(SELECT 1 FROM matched m WHERE m.oid=r.oid)),'originalAllRoutineOwnersMatch',(SELECT encode(sha256(convert_to(coalesce(string_agg(jsonb_build_array(r.identity,r.proowner)::text,E'\n' ORDER BY r.identity),''),'UTF8')),'hex')='780e7025c838af0631355043a4bcede1137e321f10f7bd1ea4c8739a6cefcdaf' FROM routines r WHERE NOT EXISTS(SELECT 1 FROM matched m WHERE m.oid=r.oid)),'candidates',coalesce((SELECT jsonb_agg(jsonb_build_object('schemaClass',known_schema,'languageClass',language_class,'previousCount',previous_count,'currentCount',current_count,'previousProfileSha256',previous_hash,'remainderProfileSha256',remainder_hash,'identitySha256',identity_hash,'definitionSha256',definition_hash,'aclSha256',acl_hash,'bodySha256',body_hash,'providerRealtimeOwner',provider_owner,'volatileRoutine',volatile_routine,'officialUpstreamBodyMatches',CASE WHEN language_class='plpgsql' THEN body_hash='8831c33c7f0b09958580c075cf9ff1ca35f987f7a69cb5b0dde6fc8a4b357c72' WHEN language_class='sql' THEN body_hash='708e8ebf818bd7b19ffb562d1ffde5a67ee131060e46204bc88725fd8a88d889' ELSE false END,'securityDefiner',false,'schemaUsage',false,'extensionMember',false,'directCliGrant',false) ORDER BY language_class) FROM matched),'[]'::jsonb));
ROLLBACK;