-- Migration: Create function to add custom columns dynamically
-- Description: Enables automatic creation of custom columns when added via UI
-- Created: 2025-11-07
-- Story: Automatic custom column creation

BEGIN;

-- Create function to safely add custom columns to employees table
CREATE OR REPLACE FUNCTION public.add_custom_column_to_employees(
  column_name_param TEXT,
  column_type_param TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate column name (prevent SQL injection)
  IF column_name_param !~ '^[a-z][a-z0-9_]*$' THEN
    RAISE EXCEPTION 'Invalid column name: must start with lowercase letter and contain only lowercase letters, numbers, and underscores';
  END IF;

  -- Validate column type
  IF column_type_param NOT IN ('TEXT', 'NUMERIC(20,2)', 'DATE', 'BOOLEAN') THEN
    RAISE EXCEPTION 'Invalid column type: must be TEXT, NUMERIC(20,2), DATE, or BOOLEAN';
  END IF;

  -- Add column if it doesn't exist
  EXECUTE format(
    'ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS %I %s',
    column_name_param,
    column_type_param
  );

  -- Add index for performance
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_employees_%I ON public.employees(%I)',
    column_name_param,
    column_name_param
  );

  RAISE NOTICE 'Custom column "%" of type "%" added successfully', column_name_param, column_type_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_custom_column_to_employees(TEXT, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.add_custom_column_to_employees IS 
  'Safely adds a custom column to the employees table with validation and indexing';

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Function add_custom_column_to_employees created successfully';
  RAISE NOTICE 'Custom columns can now be created automatically via the UI';
END $$;

COMMIT;
