-- Migration: Convert Lönenivå from BOOLEAN to INTEGER (0-7 scale)
-- Description: Converts loneiva field from BOOLEAN completion status to INTEGER salary level scale (0-7)
-- Story: 8.6 - Lönenivå Enum Field with Visual Indicator
-- Created: 2025-11-09
-- Rationale: Lönenivå should track salary classification level (0-7) rather than simple completion status

-- Background:
-- Previously in Story 8.2, loneiva was converted to BOOLEAN as part of bulk completion tracking fields.
-- However, Lönenivå (Salary Level) has specific business semantics requiring a numeric scale classification.
-- This migration reverts loneiva to a numeric type with proper constraints.

-- Data Migration Strategy:
-- - BOOLEAN TRUE values will be converted to NULL (requires manual review/classification)
-- - BOOLEAN FALSE and NULL values will remain NULL
-- - This is safe because boolean status doesn't map to specific salary levels
-- - HR Admin can subsequently classify employees into appropriate 0-7 levels

-- Step 1: Create backup column for safety (optional - can be dropped after verification)
ALTER TABLE public.employees 
ADD COLUMN loneiva_backup BOOLEAN;

UPDATE public.employees 
SET loneiva_backup = loneiva;

-- Step 2: Convert column type from BOOLEAN to INTEGER
-- All existing boolean values will be set to NULL since they don't map to specific salary levels
ALTER TABLE public.employees
  ALTER COLUMN loneiva TYPE INTEGER USING NULL;

-- Step 3: Add CHECK constraint to enforce valid range (0-7 or NULL)
ALTER TABLE public.employees
ADD CONSTRAINT employees_loneiva_check 
CHECK (loneiva >= 0 AND loneiva <= 7 OR loneiva IS NULL);

-- Step 4: Update column comment to reflect new semantics
COMMENT ON COLUMN public.employees.loneiva IS 'Lönenivå - Salary level (0-7 scale, nullable) - HR Admin only field';

-- Step 5: Optional - Drop backup column after manual verification
-- Uncomment after confirming migration success:
-- ALTER TABLE public.employees DROP COLUMN loneiva_backup;

-- Verification queries (run after migration):
-- SELECT COUNT(*) FROM public.employees WHERE loneiva IS NOT NULL; -- Should be 0 initially
-- SELECT COUNT(*) FROM public.employees WHERE loneiva_backup IS NOT NULL; -- Shows previous data
