-- Migration: Add changed_by tracking to employee_column_changes
-- Story: Track which user made changes to employee columns
-- 
-- This migration updates the trigger function that tracks employee column changes
-- to capture the auth.uid() of the user making the change.

-- Drop the existing trigger function and recreate it with changed_by tracking
DROP FUNCTION IF EXISTS track_employee_column_changes() CASCADE;

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
    'kvitto_c17_18', 'c17', 'crewing_done', 'diet', 'diet_details'
  ];
  column_name TEXT;
  old_value TEXT;
  new_value TEXT;
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user's ID
  current_user_id := auth.uid();

  -- Loop through each masterdata column to check for changes
  FOREACH column_name IN ARRAY masterdata_columns
  LOOP
    -- Get old and new values as text for comparison
    EXECUTE format('SELECT ($1).%I::TEXT', column_name) INTO old_value USING OLD;
    EXECUTE format('SELECT ($1).%I::TEXT', column_name) INTO new_value USING NEW;
    
    -- Check if the column value has changed (handles NULL values correctly)
    IF old_value IS DISTINCT FROM new_value THEN
      -- Insert audit record with the user who made the change
      INSERT INTO employee_column_changes (
        employee_id,
        column_name,
        changed_at,
        changed_by
      ) VALUES (
        NEW.id,
        column_name,
        NOW(),
        current_user_id
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS employee_column_changes_trigger ON employees;

CREATE TRIGGER employee_column_changes_trigger
  AFTER UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION track_employee_column_changes();

-- Add comment for documentation
COMMENT ON FUNCTION track_employee_column_changes() IS 
  'Tracks changes to employee masterdata columns and records which user made the change';
