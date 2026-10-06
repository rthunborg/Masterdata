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
), categories AS (
 SELECT schema_class,language_class,prokind,prosecdef,schema_usage,extension_member,public_grant,direct_cli_grant,postgres_grant,other_grant,count(*)::int AS routine_count,
 encode(sha256(convert_to(string_agg(jsonb_build_array(identity,definition,acl)::text,E'\n' ORDER BY identity),'UTF8')),'hex') AS profile_hash
 FROM routines GROUP BY schema_class,language_class,prokind,prosecdef,schema_usage,extension_member,public_grant,direct_cli_grant,postgres_grant,other_grant
)
SELECT jsonb_build_object('schemaVersion',1,'kind','production-cli-routine-fingerprint','cliPresentCount',(SELECT count(*)::int FROM cli),'total',(SELECT count(*)::int FROM routines),'unknownCategoryCount',(SELECT count(*)::int FROM routines),'identityBaselineAvailable',false,'classifiedRoutineCount',0,'allRoutineOwnerSetSha256',(SELECT encode(sha256(convert_to(coalesce(string_agg(jsonb_build_array(identity,proowner)::text,E'\n' ORDER BY identity),''),'UTF8')),'hex') FROM routines),'allRoutineSetSha256',(SELECT encode(sha256(convert_to(coalesce(string_agg(jsonb_build_array(identity,definition,acl)::text,E'\n' ORDER BY identity),''),'UTF8')),'hex') FROM routines),'categories',coalesce((SELECT jsonb_agg(jsonb_build_object('schemaClass',schema_class,'languageClass',language_class,'kind',prokind,'securityDefiner',prosecdef,'schemaUsage',schema_usage,'extensionMember',extension_member,'publicGrant',public_grant,'directCliGrant',direct_cli_grant,'postgresGrant',postgres_grant,'otherGrant',other_grant,'count',routine_count,'profileSha256',profile_hash) ORDER BY schema_class,language_class,prokind,prosecdef,schema_usage,extension_member,public_grant,direct_cli_grant,postgres_grant,other_grant) FROM categories),'[]'::jsonb));
ROLLBACK;
