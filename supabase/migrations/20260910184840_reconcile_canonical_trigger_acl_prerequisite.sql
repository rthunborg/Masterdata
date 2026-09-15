-- Story 22.15: normalize only the complete canonical Supabase trigger ACL profile.
-- Created by reviewed Supabase CLI 2.115.0 as 20260915164637, then assigned the
-- unused prerequisite version 20260910184840 before immutable 20260910184841.
-- No existing migration is renamed/edited/repaired. Fresh builds run this first;
-- already-reconciled staging applies this new version with reviewed --include-all.
-- Canonical strict and complete historical observed profiles are no-ops. The
-- observed profile is left for 20260910184841; no audit rows or timestamps change.
-- Global/schema default privileges, function definitions and all data are unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.column_config, public.employees, public.important_dates,
  public.employee_column_changes, public.users
  IN SHARE ROW EXCLUSIVE MODE;

DO $guard$
DECLARE
  timestamp_exists boolean;
  actual_acl text[];
  function_row record;
  platform_acl_extension boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_attribute
    WHERE attrelid='public.column_config'::regclass
      AND attname='updated_at' AND NOT attisdropped) INTO timestamp_exists;
  IF timestamp_exists AND NOT EXISTS(
    SELECT 1 FROM pg_attribute a JOIN pg_attrdef d
      ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid='public.column_config'::regclass AND a.attname='updated_at'
      AND NOT a.attisdropped AND a.atttypid='timestamptz'::regtype
      AND NOT a.attnotnull AND a.attgenerated='' AND a.attidentity=''
      AND pg_get_expr(d.adbin,d.adrelid)='now()'
  ) THEN RAISE EXCEPTION 'Unexpected column configuration timestamp contract'; END IF;

  -- Both ACLs must belong to the same complete platform-default profile.
  -- Grant options, function attributes, bodies and bindings are checked below.
  SELECT timestamp_exists AND
    (SELECT array_agg(CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.rolname::text END
       ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.rolname::text END)
     FROM pg_proc p CROSS JOIN LATERAL
       aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
       LEFT JOIN pg_roles r ON r.oid=a.grantee
     WHERE p.oid=to_regprocedure('public.update_updated_at_column()')
       AND a.grantee<>p.proowner)
      =ARRAY['PUBLIC','anon','authenticated','service_role']::text[] AND
    (SELECT array_agg(CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.rolname::text END
       ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.rolname::text END)
     FROM pg_proc p CROSS JOIN LATERAL
       aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
       LEFT JOIN pg_roles r ON r.oid=a.grantee
     WHERE p.oid=to_regprocedure('public.track_employee_column_changes()')
       AND a.grantee<>p.proowner)
      =ARRAY['service_role']::text[]
    INTO platform_acl_extension;
  platform_acl_extension := coalesce(platform_acl_extension,false);

  -- Accept only the complete observed or complete canonical trigger profile.
  -- Body comparisons normalize CRLF and outer whitespace only; function owners
  -- and ACLs remain exact. Partial combinations are never silently replaced.
  FOR function_row IN
    SELECT p.*, l.lanname FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
    WHERE p.oid IN (to_regprocedure('public.update_updated_at_column()'),
                   to_regprocedure('public.track_employee_column_changes()'))
  LOOP
    IF pg_get_userbyid(function_row.proowner)<>'postgres'
      OR function_row.lanname<>'plpgsql' OR function_row.prorettype<>'trigger'::regtype
      OR function_row.prokind<>'f' OR function_row.pronargs<>0
      OR function_row.proretset OR function_row.proargmodes IS NOT NULL
      OR function_row.proallargtypes IS NOT NULL
      OR function_row.provolatile<>'v' OR function_row.proparallel<>'u'
      OR function_row.proisstrict OR function_row.proleakproof
      OR function_row.proconfig IS DISTINCT FROM ARRAY['search_path=public, pg_temp']::text[]
      OR function_row.prosecdef IS DISTINCT FROM (function_row.proname='track_employee_column_changes')
    THEN RAISE EXCEPTION 'Unexpected represented trigger function attributes'; END IF;
    IF function_row.proname='update_updated_at_column' AND
      md5(btrim(replace(function_row.prosrc,E'\r\n',E'\n'),E' \t\n\r'))<>'45b9bb012d6413bfe2a994fcbebcc959'
    THEN RAISE EXCEPTION 'Unexpected timestamp function body'; END IF;
    IF function_row.proname='track_employee_column_changes' AND
      md5(btrim(replace(function_row.prosrc,E'\r\n',E'\n'),E' \t\n\r')) IS DISTINCT FROM
        (CASE WHEN timestamp_exists THEN '3e8426f1177f00af4c46ed63f13a97d6'
              ELSE 'f0397dc227d9cdee0f9045dfdd056121' END)
    THEN RAISE EXCEPTION 'Unexpected employee audit function body'; END IF;
    SELECT coalesce(array_agg(CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.rolname::text END
      ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.rolname::text END),ARRAY[]::text[])
      INTO actual_acl
    FROM aclexplode(coalesce(function_row.proacl,acldefault('f',function_row.proowner))) a
      LEFT JOIN pg_roles r ON r.oid=a.grantee
    WHERE a.grantee<>function_row.proowner;
    IF EXISTS(SELECT 1 FROM aclexplode(coalesce(function_row.proacl,acldefault('f',function_row.proowner))) a
      WHERE a.grantee<>function_row.proowner AND (a.is_grantable OR a.privilege_type<>'EXECUTE'))
      OR (function_row.proname='update_updated_at_column' AND actual_acl IS DISTINCT FROM
        (CASE WHEN timestamp_exists AND NOT platform_acl_extension THEN ARRAY['PUBLIC']::text[]
              ELSE ARRAY['PUBLIC','anon','authenticated','service_role']::text[] END))
      OR (function_row.proname='track_employee_column_changes' AND actual_acl IS DISTINCT FROM
        (CASE WHEN timestamp_exists AND NOT platform_acl_extension THEN ARRAY[]::text[] ELSE ARRAY['service_role']::text[] END))
    THEN RAISE EXCEPTION 'Unexpected represented trigger function ACL'; END IF;
  END LOOP;
  IF to_regprocedure('public.update_updated_at_column()') IS NULL
     OR to_regprocedure('public.track_employee_column_changes()') IS NULL
  THEN RAISE EXCEPTION 'Required represented trigger function missing'; END IF;

  IF (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN
        ('public.employees'::regclass,'public.important_dates'::regclass,'public.column_config'::regclass))
       <> (CASE WHEN timestamp_exists THEN 4 ELSE 3 END)
    OR EXISTS(
      SELECT 1 FROM (VALUES
        ('public.employees'::regclass,'update_employees_updated_at',19,'public.update_updated_at_column()'),
        ('public.employees'::regclass,'trg_track_employee_column_changes',17,'public.track_employee_column_changes()'),
        ('public.important_dates'::regclass,'update_important_dates_updated_at',19,'public.update_updated_at_column()'),
        ('public.column_config'::regclass,'update_column_config_updated_at',19,'public.update_updated_at_column()')
      ) expected(table_oid,trigger_name,event_bits,signature)
      WHERE (expected.table_oid<>'public.column_config'::regclass OR timestamp_exists)
        AND NOT EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=expected.table_oid
          AND t.tgname=expected.trigger_name AND NOT t.tgisinternal AND t.tgenabled='O'
          AND t.tgtype=expected.event_bits AND t.tgfoid=to_regprocedure(expected.signature)
          AND t.tgnargs=0 AND octet_length(t.tgargs)=0 AND t.tgqual IS NULL
          AND t.tgconstraint=0 AND t.tgattr=''::int2vector
          AND NOT t.tgdeferrable AND NOT t.tginitdeferred
          AND t.tgoldtable IS NULL AND t.tgnewtable IS NULL)
    )
    OR (SELECT count(*) FROM pg_trigger WHERE tgfoid=to_regprocedure('public.update_updated_at_column()'))
       <> (CASE WHEN timestamp_exists THEN 3 ELSE 2 END)
    OR (SELECT count(*) FROM pg_trigger WHERE tgfoid=to_regprocedure('public.track_employee_column_changes()'))<>1
  THEN RAISE EXCEPTION 'Unexpected represented trigger bindings'; END IF;

  IF NOT EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conrelid='public.employee_column_changes'::regclass
    AND c.contype='f' AND c.confrelid='public.users'::regclass AND c.convalidated
    AND c.conname='employee_column_changes_changed_by_fkey'
    AND c.confdeltype='n' AND c.confupdtype='a' AND c.confmatchtype='s'
    AND NOT c.condeferrable AND NOT c.condeferred
    AND c.conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=c.conrelid AND attname='changed_by')]
    AND c.confkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=c.confrelid
      AND attname=CASE WHEN timestamp_exists THEN 'id' ELSE 'auth_user_id' END AND NOT attisdropped)])
    OR (SELECT count(*) FROM pg_constraint c
      WHERE c.conrelid='public.employee_column_changes'::regclass AND c.contype='f'
        AND c.conkey @> ARRAY[(SELECT attnum FROM pg_attribute
          WHERE attrelid=c.conrelid AND attname='changed_by' AND NOT attisdropped)])<>1
    OR NOT EXISTS(SELECT 1 FROM pg_index i WHERE i.indrelid='public.employee_column_changes'::regclass
      AND i.indisunique AND i.indisvalid AND i.indisready AND i.indimmediate
      AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=3
      AND (SELECT array_agg(a.attname ORDER BY k.ord) FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ord)
        JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum WHERE k.ord<=3)
        =ARRAY['employee_id','column_name','changed_at']::name[])
  THEN RAISE EXCEPTION 'Expected audit foreign key or conflict index missing'; END IF;

  IF EXISTS(SELECT 1 FROM pg_trigger
      WHERE tgrelid='public.employee_column_changes'::regclass AND NOT tgisinternal)
    OR EXISTS(SELECT 1 FROM pg_rewrite
      WHERE ev_class='public.employee_column_changes'::regclass)
  THEN RAISE EXCEPTION 'Unexpected audit write side effects'; END IF;

  IF EXISTS(SELECT 1 FROM public.employee_column_changes changes
    WHERE changes.changed_by IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM public.users users
      WHERE changes.changed_by=CASE WHEN timestamp_exists THEN users.id ELSE users.auth_user_id END))
  THEN RAISE EXCEPTION 'Unmapped audit actor prevents reconciliation'; END IF;

  IF platform_acl_extension THEN
    REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()
      FROM anon, authenticated, service_role;
    REVOKE EXECUTE ON FUNCTION public.track_employee_column_changes()
      FROM service_role;
  END IF;
END $guard$;
COMMIT;
