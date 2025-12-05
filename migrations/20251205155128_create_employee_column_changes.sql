-- Migration: Create Employee Column Changes Audit Table
-- Story: 16.1 - Create Employee Column Changes Audit Table
-- Description: Creates table and trigger to track column-level changes to masterdata fields
-- Created: 2025-12-05

-- Create employee_column_changes table
CREATE TABLE IF NOT EXISTS public.employee_column_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,  -- db_column_name from column_config (e.g., 'first_name', 'email')
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- Optional for GDPR
  CONSTRAINT unique_change_per_column UNIQUE(employee_id, column_name, changed_at)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_employee_column_changes_changed_at 
  ON public.employee_column_changes(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_column_changes_employee_column 
  ON public.employee_column_changes(employee_id, column_name, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_column_changes_column_name 
  ON public.employee_column_changes(column_name);

-- Add column comments for documentation
COMMENT ON TABLE public.employee_column_changes IS 
  'Tracks column-level changes to employee masterdata fields. One row per column change per employee.';
COMMENT ON COLUMN public.employee_column_changes.column_name IS 
  'Database column name from column_config.db_column_name (e.g., first_name, email)';
COMMENT ON COLUMN public.employee_column_changes.changed_by IS 
  'User who made the change (nullable for GDPR compliance, set via session context if available)';

-- Trigger function to track employee column changes
-- For MVP: Uses hardcoded list of masterdata columns (must be updated when new masterdata columns are added)
CREATE OR REPLACE FUNCTION track_employee_column_changes()
RETURNS TRIGGER AS $$
DECLARE
  masterdata_columns TEXT[] := ARRAY[
    'stena_date', 'omc_date', 'pe3_date',
    'first_name', 'surname', 'ssn',
    'email', 'mobile', 'rank', 'gender', 'town_district',
    'hire_date', 'termination_date', 'termination_reason',
    'comments',
    'one', 'isps', 'photo', 'origo', 'loneiva',
    'mail_lon', 'bankuppgifter', 'li', 'passport',
    'kvitto_c17_18', 'c17', 'crewing_done'
  ];
  col_name TEXT;
  old_val TEXT;
  new_val TEXT;
  user_id_val UUID;
  old_json JSONB;
  new_json JSONB;
BEGIN
  -- Try to get user ID from session context (if available)
  -- For MVP: This may not be available, so changed_by will be NULL
  BEGIN
    user_id_val := NULLIF(current_setting('app.user_id', true), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    user_id_val := NULL;
  END;

  -- Convert OLD and NEW records to JSONB for easier column access
  old_json := to_jsonb(OLD);
  new_json := to_jsonb(NEW);

  -- Loop through each masterdata column
  FOREACH col_name IN ARRAY masterdata_columns
  LOOP
    -- Extract values from JSONB (handles NULL automatically)
    old_val := old_json->>col_name;
    new_val := new_json->>col_name;

    -- Compare values (IS DISTINCT FROM handles NULL correctly)
    -- If values differ, insert audit record
    IF (old_val IS DISTINCT FROM new_val) THEN
      INSERT INTO public.employee_column_changes (
        employee_id,
        column_name,
        changed_at,
        changed_by
      ) VALUES (
        NEW.id,
        col_name,
        NOW(),
        user_id_val
      )
      ON CONFLICT (employee_id, column_name, changed_at) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION track_employee_column_changes() IS 
  'Trigger function that tracks changes to masterdata columns in employees table. 
   Uses hardcoded list of masterdata columns - MUST BE UPDATED when new masterdata columns are added.
   See migration file for list of tracked columns.';

-- Create trigger on employees table
CREATE TRIGGER employee_column_changes_trigger
  AFTER UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION track_employee_column_changes();

-- Add comment to trigger
COMMENT ON TRIGGER employee_column_changes_trigger ON public.employees IS 
  'Tracks column-level changes to employee masterdata fields in employee_column_changes table.';

