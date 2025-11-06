-- Migration: Refactor column_config to separate display name from database column name
-- Description: Renames column_name to db_column_name and adds column_name as display name
-- Created: 2025-11-06
-- Purpose: Better semantics - column_name is what users see, db_column_name is the technical database field

BEGIN;

-- Step 1: Add new db_column_name column
ALTER TABLE public.column_config 
ADD COLUMN IF NOT EXISTS db_column_name TEXT;

-- Step 2: Convert current Title Case display names to snake_case for db_column_name
-- The seed data has Title Case names like "First Name", "SSN", etc.
-- Database columns are snake_case like first_name, ssn, etc.
UPDATE public.column_config
SET db_column_name = LOWER(REPLACE(column_name, ' ', '_'))
WHERE db_column_name IS NULL;

-- Step 3: Make db_column_name NOT NULL and add unique constraint
ALTER TABLE public.column_config
ALTER COLUMN db_column_name SET NOT NULL;

-- Step 4: Add unique constraint on db_column_name + is_masterdata
-- (This replaces the old constraint on column_name)
DROP INDEX IF EXISTS idx_column_config_unique_name;
CREATE UNIQUE INDEX idx_column_config_unique_db_name 
ON public.column_config(db_column_name, is_masterdata);

-- Step 5: column_name already contains user-friendly display names (Title Case)
-- No transformation needed - values like "First Name", "SSN", "Gender" are kept as-is

-- Step 6: Add comments
COMMENT ON COLUMN public.column_config.column_name IS 
  'User-friendly display name shown in the UI (can contain spaces, special characters, e.g., "First Name", "SSN")';

COMMENT ON COLUMN public.column_config.db_column_name IS 
  'Database column name on employees table (snake_case, must match actual column name, e.g., "first_name", "ssn")';

-- Verification
DO $$
DECLARE
  total_columns INTEGER;
  sample_row RECORD;
BEGIN
  SELECT COUNT(*) INTO total_columns FROM public.column_config;
  

  
  FOR sample_row IN 
    SELECT column_name, db_column_name 
    FROM public.column_config 
    WHERE is_masterdata = true 
    LIMIT 5
  LOOP
  END LOOP;
END $$;

COMMIT;