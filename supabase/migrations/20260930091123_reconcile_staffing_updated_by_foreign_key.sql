-- Forward-only reconciliation for the observed production staffing FK drift.
-- It neither touches staffing rows nor replays the immutable table migration.
BEGIN;

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';

-- Acquire all relation locks before inspecting the captured prerequisite.
LOCK TABLE public.staffing_needs IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.users IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  needs_oid oid := to_regclass('public.staffing_needs');
  users_oid oid := to_regclass('public.users');
  canonical boolean;
  captured_set_null boolean;
  nonnull_actor_count bigint;
  orphan_public_actor_count bigint;
  orphan_auth_actor_count bigint;
BEGIN
  IF needs_oid IS NULL OR users_oid IS NULL THEN
    RAISE EXCEPTION 'Required staffing reconciliation relations are unavailable';
  END IF;

  -- Attribute positions alone cannot prove the intended actor mapping.
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = needs_oid AND attnum = 5
      AND attname = 'updated_by' AND atttypid = 'uuid'::regtype
      AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = users_oid AND attnum = 1
      AND attname = 'id' AND atttypid = 'uuid'::regtype
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Unexpected staffing actor column profile';
  END IF;

  SELECT
    count(*) = 1
      AND bool_and(conname = 'staffing_needs_updated_by_fkey')
      AND bool_and(conkey = ARRAY[5]::smallint[])
      AND bool_and(confrelid = users_oid)
      AND bool_and(confkey = ARRAY[1]::smallint[])
      AND bool_and(confupdtype = 'a')
      AND bool_and(confmatchtype = 's')
      AND bool_and(convalidated)
      AND bool_and(NOT condeferrable)
      AND bool_and(NOT condeferred)
      AND bool_and(confdeltype = 'a'),
    count(*) = 1
      AND bool_and(conname = 'staffing_needs_updated_by_fkey')
      AND bool_and(conkey = ARRAY[5]::smallint[])
      AND bool_and(confrelid = users_oid)
      AND bool_and(confkey = ARRAY[1]::smallint[])
      AND bool_and(confupdtype = 'a')
      AND bool_and(confmatchtype = 's')
      AND bool_and(convalidated)
      AND bool_and(NOT condeferrable)
      AND bool_and(NOT condeferred)
      AND bool_and(confdeltype = 'n')
  INTO canonical, captured_set_null
  FROM pg_constraint
  WHERE conrelid = needs_oid
    AND contype = 'f';

  IF NOT canonical AND NOT captured_set_null THEN
    RAISE EXCEPTION 'Unexpected staffing updated_by foreign key profile';
  END IF;

  IF captured_set_null THEN
    SELECT count(*) INTO nonnull_actor_count
    FROM public.staffing_needs
    WHERE updated_by IS NOT NULL;

    SELECT count(*) INTO orphan_public_actor_count
    FROM public.staffing_needs AS needs
    WHERE needs.updated_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.users AS users WHERE users.id = needs.updated_by
      );

    SELECT count(*) INTO orphan_auth_actor_count
    FROM public.staffing_needs AS needs
    WHERE needs.updated_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.users AS users
        JOIN auth.users AS auth_users ON auth_users.id = users.auth_user_id
        WHERE users.id = needs.updated_by
      );

    IF nonnull_actor_count <> 0
      OR orphan_public_actor_count <> 0
      OR orphan_auth_actor_count <> 0 THEN
      RAISE EXCEPTION 'Staffing actor rows prevent foreign key reconciliation';
    END IF;

    ALTER TABLE public.staffing_needs
      DROP CONSTRAINT staffing_needs_updated_by_fkey;
    ALTER TABLE public.staffing_needs
      ADD CONSTRAINT staffing_needs_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES public.users(id)
      ON UPDATE NO ACTION ON DELETE NO ACTION
      NOT VALID NOT DEFERRABLE;
    ALTER TABLE public.staffing_needs
      VALIDATE CONSTRAINT staffing_needs_updated_by_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = needs_oid
      AND contype = 'f'
    GROUP BY conrelid
    HAVING count(*) = 1
      AND bool_and(conname = 'staffing_needs_updated_by_fkey')
      AND bool_and(conkey = ARRAY[5]::smallint[])
      AND bool_and(confrelid = users_oid)
      AND bool_and(confkey = ARRAY[1]::smallint[])
      AND bool_and(confupdtype = 'a')
      AND bool_and(confdeltype = 'a')
      AND bool_and(confmatchtype = 's')
      AND bool_and(convalidated)
      AND bool_and(NOT condeferrable)
      AND bool_and(NOT condeferred)
  ) THEN
    RAISE EXCEPTION 'Staffing updated_by foreign key did not reach canonical profile';
  END IF;
END;
$$;

COMMIT;
