-- Migration Template: Add Custom Column
-- Description: Template for adding a new custom column to the employees table
-- Story: 9.3 - Real Table Columns Architecture
-- Instructions:
--   1. Copy this template to a new file: YYYYMMDDHHMMSS_add_<column_name>.sql
--   2. Replace placeholders:
--      - {COLUMN_NAME}: Database column name (snake_case, e.g., sodexo_meal_plan)
--      - {SQL_TYPE}: PostgreSQL type (TEXT, NUMERIC(20,2), DATE, BOOLEAN)
--      - {DESCRIPTION}: Brief description of the column purpose
--   3. Update the column_config INSERT with appropriate role permissions
--   4. Apply migration: npx supabase migration up --local (or deploy to production)

BEGIN;

-- Step 1: Add column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS {COLUMN_NAME} {SQL_TYPE};

-- Step 2: Add comment to document column purpose
COMMENT ON COLUMN public.employees.{COLUMN_NAME} IS '{DESCRIPTION}';

-- Step 3: Create index for performance (recommended for frequently queried columns)
CREATE INDEX IF NOT EXISTS idx_employees_{COLUMN_NAME} 
ON public.employees({COLUMN_NAME});

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
  '{COLUMN_NAME}',
  '{text|number|date|boolean}', -- Match with SQL type
  false, -- Custom column, not masterdata
  '{CATEGORY}', -- E.g., 'Sodexo', 'OMC', 'Payroll', 'Toplux'
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config), -- Auto-increment
  '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": false, "edit": false},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'::jsonb
)
ON CONFLICT (column_name, is_masterdata) DO NOTHING;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Custom column "%" added successfully', '{COLUMN_NAME}';
  RAISE NOTICE 'Column will be visible in UI after application restart/reload';
END $$;

COMMIT;


-- Example Usage:
-- To add a Sodexo meal plan column:
--   COLUMN_NAME: sodexo_meal_plan
--   SQL_TYPE: TEXT
--   DESCRIPTION: Meal plan assignment for Sodexo catering service
--   CATEGORY: Sodexo
--   role_permissions: {"sodexo": {"view": true, "edit": true}, ...}
