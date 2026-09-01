-- Repair employee_column_changes trigger writes.
--
-- The trigger introduced in 20260223000000 uses
-- ON CONFLICT (employee_id, column_name, changed_at), but the tracked table
-- migration only created a non-unique index for those columns. PostgreSQL
-- rejects employee updates with 42P10 until a matching unique constraint/index
-- exists.
--
-- changed_by references public.users(id), so translate auth.uid() through
-- public.users.auth_user_id instead of storing the auth user id directly.

WITH ranked_changes AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY employee_id, column_name, changed_at
      ORDER BY id
    ) AS duplicate_rank
  FROM public.employee_column_changes
)
DELETE FROM public.employee_column_changes changes
USING ranked_changes
WHERE changes.id = ranked_changes.id
  AND ranked_changes.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS employee_column_changes_employee_column_changed_at_key
ON public.employee_column_changes(employee_id, column_name, changed_at);

CREATE OR REPLACE FUNCTION track_employee_column_changes()
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
