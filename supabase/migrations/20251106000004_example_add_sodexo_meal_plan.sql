-- Migration: Add Sodexo Meal Plan Custom Column
-- Description: Example migration demonstrating real table column architecture
-- Story: 9.3 - Refactor Custom Columns to Real Table Columns
-- Created: 2025-11-06
-- Purpose: Demonstrates manual migration workflow for adding custom columns

BEGIN;

-- Step 1: Add column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS sodexo_meal_plan TEXT;

-- Step 2: Add comment to document column purpose
COMMENT ON COLUMN public.employees.sodexo_meal_plan IS 
  'Meal plan assignment for Sodexo catering service (Premium/Standard/Basic)';

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_employees_sodexo_meal_plan 
ON public.employees(sodexo_meal_plan);

-- Step 4: Insert column configuration metadata
-- This registers the column in the UI and sets role permissions
INSERT INTO public.column_config (
  column_name, 
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'sodexo_meal_plan',
  'text',
  false,
  'Sodexo',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": true},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'::jsonb
)
ON CONFLICT (column_name, is_masterdata) DO NOTHING;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Custom column "sodexo_meal_plan" added successfully';
  RAISE NOTICE 'Column will be visible in UI after application restart/reload';
END $$;

COMMIT;
