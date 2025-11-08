-- Migration: Add missing column_config entries for existing employee table columns
-- Created: 2025-11-07
-- Bug Fix: Sanity check revealed test_col_2 exists in employees table but not in column_config

-- Add test_col_2 to column_config (custom column created via UI but not registered)
-- First check if it already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM column_config WHERE db_column_name = 'test_col_2'
  ) THEN
    INSERT INTO column_config (
      column_name,
      db_column_name,
      column_type,
      is_masterdata,
      display_order,
      role_permissions
    ) VALUES (
      'test_col_2',
      'test_col_2',
      'text',
      false,  -- Custom column, not masterdata
      1001,   -- Place after other custom columns
      jsonb_build_object(
        'hr_admin', jsonb_build_object('view', true, 'edit', true),
        'hr_user', jsonb_build_object('view', false, 'edit', false),
        'standard_user', jsonb_build_object('view', false, 'edit', false)
      )
    );
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN employees.test_col_2 IS 'Custom test column';
