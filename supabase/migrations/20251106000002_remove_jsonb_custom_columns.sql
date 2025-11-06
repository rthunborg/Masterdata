-- Migration: Remove JSONB Custom Columns System
-- Description: Removes employees.custom_data JSONB column and all existing custom column definitions.
--              This is a clean slate to transition to real table columns architecture.
-- Story: 9.3 - Refactor Custom Columns from JSONB to Real Table Columns
-- Created: 2025-11-06
-- Rationale: Existing custom columns have invalid names with spaces and special characters
--            that cannot be used as PostgreSQL column names. Clean slate approach allows
--            fresh start with proper snake_case naming for real columns.

BEGIN;

-- Step 1: Delete all custom column definitions (keep masterdata columns)
-- This removes all column_config entries where is_masterdata = false
DELETE FROM public.column_config 
WHERE is_masterdata = false;

-- Step 2: Drop GIN index on custom_data column
DROP INDEX IF EXISTS public.idx_employees_custom_data_gin;

-- Step 3: Drop custom_data JSONB column from employees table
ALTER TABLE public.employees 
DROP COLUMN IF EXISTS custom_data;

-- Step 4: Add migration comment
COMMENT ON TABLE public.employees IS 
  'Employee master data table. Custom columns now implemented as real table columns (not JSONB).';

-- Verification: Count remaining columns in column_config (should be only masterdata)
DO $$
DECLARE
  masterdata_count INTEGER;
  custom_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO masterdata_count 
  FROM public.column_config 
  WHERE is_masterdata = true;
  
  SELECT COUNT(*) INTO custom_count 
  FROM public.column_config 
  WHERE is_masterdata = false;
  
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - Masterdata columns remaining: %', masterdata_count;
  RAISE NOTICE '  - Custom columns removed: % (should be 0)', custom_count;
  RAISE NOTICE '  - employees.custom_data column dropped';
  RAISE NOTICE '  - Custom columns will now be implemented as real table columns';
END $$;

COMMIT;
