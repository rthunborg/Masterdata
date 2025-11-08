-- Migration: Add column_config entry for tester column
-- Description: Register the tester column in column_config table
-- Created: 2025-11-08

BEGIN;

-- Insert column_config entry for tester column
INSERT INTO column_config (
  column_name, 
  db_column_name, 
  column_type, 
  is_masterdata, 
  category,
  role_permissions
) VALUES (
  'tester',
  'tester',
  'text',
  false,
  'Test',
  '{"hr_admin": {"view": true, "edit": true}, "omc": {"view": false, "edit": false}, "payroll": {"view": false, "edit": false}, "sodexo": {"view": false, "edit": false}, "toplux": {"view": false, "edit": false}}'::jsonb
)
ON CONFLICT (column_name, is_masterdata) DO NOTHING;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Column config entry for "tester" added successfully';
END $$;

COMMIT;
