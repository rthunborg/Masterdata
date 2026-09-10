-- Story 22.15: forward reconciliation of represented trigger drift.
-- 66-version staging lacks column_config.updated_at and its timestamp trigger;
-- its audit trigger still has the February body despite recorded June repair.
-- No history repair, historical replay, audit deletion, or permission-JSON rewrite.
-- Existing configuration rows receive the new timestamp default at apply time;
-- that value is initialization metadata, not a reconstructed historical edit time.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.column_config, public.employees, public.important_dates
  IN SHARE ROW EXCLUSIVE MODE;

DO $guard$
DECLARE
  timestamp_exists boolean;
  actual_acl text[];
  function_row record;
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

  -- The two reviewed bodies are compared exactly after CRLF and outer-space
  -- normalization only. Unknown logic is never silently replaced.
  FOR function_row IN
    SELECT p.*, l.lanname FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
    WHERE p.oid IN (to_regprocedure('public.update_updated_at_column()'),
                   to_regprocedure('public.track_employee_column_changes()'))
  LOOP
    IF function_row.lanname<>'plpgsql' OR function_row.prorettype<>'trigger'::regtype
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
      md5(btrim(replace(function_row.prosrc,E'\r\n',E'\n'),E' \t\n\r')) NOT IN ('f0397dc227d9cdee0f9045dfdd056121','3e8426f1177f00af4c46ed63f13a97d6')
    THEN RAISE EXCEPTION 'Unexpected employee audit function body'; END IF;
    SELECT coalesce(array_agg(CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.rolname END
      ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.rolname END),ARRAY[]::text[])
      INTO actual_acl
    FROM aclexplode(coalesce(function_row.proacl,acldefault('f',function_row.proowner))) a
      LEFT JOIN pg_roles r ON r.oid=a.grantee
    WHERE a.grantee<>function_row.proowner;
    IF EXISTS(SELECT 1 FROM aclexplode(coalesce(function_row.proacl,acldefault('f',function_row.proowner))) a
      WHERE a.grantee<>function_row.proowner AND (a.is_grantable OR a.privilege_type<>'EXECUTE'))
      OR (function_row.proname='update_updated_at_column' AND actual_acl NOT IN
        (ARRAY['PUBLIC']::text[],ARRAY['PUBLIC','anon','authenticated','service_role']::text[]))
      OR (function_row.proname='track_employee_column_changes' AND actual_acl NOT IN
        (ARRAY[]::text[],ARRAY['service_role']::text[]))
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
    AND c.conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=c.conrelid AND attname='changed_by')]
    AND c.confkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=c.confrelid AND attname='id')])
    OR NOT EXISTS(SELECT 1 FROM pg_index i WHERE i.indrelid='public.employee_column_changes'::regclass
      AND i.indisunique AND i.indisvalid AND i.indisready AND i.indimmediate
      AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=3
      AND (SELECT array_agg(a.attname ORDER BY k.ord) FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ord)
        JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum WHERE k.ord<=3)
        =ARRAY['employee_id','column_name','changed_at']::name[])
  THEN RAISE EXCEPTION 'Expected audit foreign key or conflict index missing'; END IF;
END $guard$;

ALTER TABLE public.column_config
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DO $trigger$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.column_config'::regclass
    AND tgname='update_column_config_updated_at' AND NOT tgisinternal) THEN
    CREATE TRIGGER update_column_config_updated_at
      BEFORE UPDATE ON public.column_config FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $trigger$;

CREATE OR REPLACE FUNCTION public.track_employee_column_changes()
RETURNS TRIGGER AS $$
DECLARE
  masterdata_columns TEXT[] := ARRAY[
    'stena_date', 'omc_date', 'pe3_date',
    'first_name', 'surname', 'ssn',
    'email', 'mobile', 'rank', 'gender', 'town_district',
    'hire_date', 'termination_date', 'termination_reason',
    'comments',
    'one', 'talmundo', 'isps', 'photo', 'origo', 'loneiva',
    'mail_lon', 'bankuppgifter', 'li', 'passport',
    'kvitto_c17_18', 'c17', 'crewing_done',
    'special_diet', 'diet_details'
  ];
  col TEXT;
  old_val TEXT;
  new_val TEXT;
  public_user_id UUID;
BEGIN
  SELECT id
  INTO public_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  FOREACH col IN ARRAY masterdata_columns
  LOOP
    EXECUTE format('SELECT ($1).%I::TEXT', col) INTO old_val USING OLD;
    EXECUTE format('SELECT ($1).%I::TEXT', col) INTO new_val USING NEW;

    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO public.employee_column_changes (employee_id, column_name, changed_at, changed_by)
      VALUES (NEW.id, col, NOW(), public_user_id)
      ON CONFLICT (employee_id, column_name, changed_at)
      DO UPDATE SET changed_by = EXCLUDED.changed_by;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- The shared timestamp helper retains PUBLIC execution; extra explicit grants
-- were redundant. The audit trigger needs no non-owner direct RPC execution.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.track_employee_column_changes() FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
