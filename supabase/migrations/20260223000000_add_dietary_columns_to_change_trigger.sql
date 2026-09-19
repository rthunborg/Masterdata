-- Fix employee_column_changes trigger:
-- 1. Add special_diet and diet_details to tracked columns (missed in 20251213000000)
-- 2. Fix changed_by: use auth.uid() directly (FK references auth.users, not public.users)
-- 3. Use ON CONFLICT to handle duplicate trigger edge cases gracefully

-- Drop ALL non-internal triggers on employees except the built-in updated_at trigger.
-- This ensures no leftover triggers from manual or failed migration attempts.
DO $$
DECLARE
  trg RECORD;
BEGIN
  FOR trg IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.employees'::regclass
      AND NOT tgisinternal
      AND tgname != 'update_employees_updated_at'
  LOOP
    RAISE NOTICE 'Dropping trigger: %', trg.tgname;
    EXECUTE format('DROP TRIGGER %I ON public.employees', trg.tgname);
  END LOOP;
END $$;

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
BEGIN
  FOREACH col IN ARRAY masterdata_columns
  LOOP
    EXECUTE format('SELECT ($1).%I::TEXT', col) INTO old_val USING OLD;
    EXECUTE format('SELECT ($1).%I::TEXT', col) INTO new_val USING NEW;

    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO public.employee_column_changes (employee_id, column_name, changed_at, changed_by)
      VALUES (NEW.id, col, NOW(), auth.uid())
      ON CONFLICT (employee_id, column_name, changed_at)
      DO UPDATE SET changed_by = EXCLUDED.changed_by;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_track_employee_column_changes
  AFTER UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION track_employee_column_changes();
