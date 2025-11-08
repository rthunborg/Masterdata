-- Migration: Add tester custom column
-- Description: Add the 'tester' custom column to the employees table
-- Created: 2025-11-07
-- Story: Fix for custom column creation issue

BEGIN;

-- Step 1: Add column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS tester TEXT;

-- Step 2: Add comment to document column purpose
COMMENT ON COLUMN public.employees.tester IS 'Test custom column';

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_employees_tester 
ON public.employees(tester);

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Custom column "tester" added successfully';
END $$;

COMMIT;
