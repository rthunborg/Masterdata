-- Migration: Add Missing Hire Date and Termination Date to Column Config
-- Description: Adds Hire Date and Termination Date columns that were missing from comprehensive seed
-- Bug Fix: These columns exist in employees table but were not in column_config
-- Created: 2025-11-15

-- Check if Hire Date already exists (might be named "Anställningsdatum" in Swedish)
-- If it exists, update it; otherwise insert it
DO $$
BEGIN
  -- Update existing Hire Date if it exists with Swedish name
  UPDATE public.column_config
  SET 
    column_name = 'Hire Date',
    db_column_name = 'hire_date',
    column_type = 'date',
    display_order = 25,
    role_permissions = '{
      "hr_admin": {"view": true, "edit": true},
      "omc": {"view": true, "edit": false},
      "payroll": {"view": true, "edit": false},
      "sodexo": {"view": true, "edit": false},
      "toplux": {"view": true, "edit": false}
    }'::jsonb
  WHERE db_column_name = 'hire_date' OR column_name IN ('Hire Date', 'Anställningsdatum');
  
  -- Insert if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO public.column_config (column_name, db_column_name, column_type, is_masterdata, display_order, role_permissions)
    VALUES (
      'Hire Date',
      'hire_date',
      'date',
      true,
      25,
      '{
        "hr_admin": {"view": true, "edit": true},
        "omc": {"view": true, "edit": false},
        "payroll": {"view": true, "edit": false},
        "sodexo": {"view": true, "edit": false},
        "toplux": {"view": true, "edit": false}
      }'::jsonb
    );
  END IF;
END $$;

-- Add Hire Date column configuration (fallback if DO block doesn't work)
-- This is a required field in employees table (DATE NOT NULL)
INSERT INTO public.column_config (column_name, db_column_name, column_type, is_masterdata, display_order, role_permissions)
VALUES (
  'Hire Date',
  'hire_date',
  'date',
  true,
  25,  -- After other date fields
  '{
    "hr_admin": {"view": true, "edit": true},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "sodexo": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) 
DO UPDATE SET
  column_name = EXCLUDED.column_name,
  column_type = EXCLUDED.column_type,
  display_order = EXCLUDED.display_order,
  role_permissions = EXCLUDED.role_permissions;

-- Add Termination Date column configuration
-- This is an optional field in employees table (DATE nullable)
INSERT INTO public.column_config (column_name, db_column_name, column_type, is_masterdata, display_order, role_permissions)
VALUES (
  'Termination Date',
  'termination_date',
  'date',
  true,
  26,  -- After Hire Date
  '{
    "hr_admin": {"view": true, "edit": true},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": false, "edit": false},
    "sodexo": {"view": false, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) 
DO UPDATE SET
  column_name = EXCLUDED.column_name,
  column_type = EXCLUDED.column_type,
  display_order = EXCLUDED.display_order,
  role_permissions = EXCLUDED.role_permissions;

-- Add Termination Reason column configuration
-- This is an optional field in employees table (TEXT nullable)
INSERT INTO public.column_config (column_name, db_column_name, column_type, is_masterdata, display_order, role_permissions)
VALUES (
  'Termination Reason',
  'termination_reason',
  'text',
  true,
  27,  -- After Termination Date
  '{
    "hr_admin": {"view": true, "edit": true},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": false, "edit": false},
    "sodexo": {"view": false, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) 
DO UPDATE SET
  column_name = EXCLUDED.column_name,
  column_type = EXCLUDED.column_type,
  display_order = EXCLUDED.display_order,
  role_permissions = EXCLUDED.role_permissions;

-- Add comments for documentation
COMMENT ON COLUMN public.column_config.column_name IS 'Hire Date, Termination Date, and Termination Reason were missing from comprehensive seed migration and have been added here';

