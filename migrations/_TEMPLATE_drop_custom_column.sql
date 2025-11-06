-- Migration Template: Drop Custom Column
-- Description: Template for removing a custom column from the employees table
-- Story: 9.3 - Real Table Columns Architecture
-- Instructions:
--   1. Copy this template to a new file: YYYYMMDDHHMMSS_drop_<column_name>.sql
--   2. Replace {COLUMN_NAME} with the database column name to drop
--   3. Apply migration: npx supabase migration up --local (or deploy to production)
-- WARNING: This will permanently delete all data in this column!

BEGIN;

-- Step 1: Remove column configuration metadata first
DELETE FROM public.column_config 
WHERE column_name = '{COLUMN_NAME}' AND is_masterdata = false;

-- Step 2: Drop index
DROP INDEX IF EXISTS public.idx_employees_{COLUMN_NAME};

-- Step 3: Drop column from employees table
ALTER TABLE public.employees 
DROP COLUMN IF EXISTS {COLUMN_NAME};

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Custom column "%" dropped successfully', '{COLUMN_NAME}';
  RAISE NOTICE 'Column removed from UI and database';
END $$;

COMMIT;
