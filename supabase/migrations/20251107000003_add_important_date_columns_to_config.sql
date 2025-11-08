-- Migration: Add Important Date columns to column_config
-- Created: 2025-11-07
-- Bug Fix: Stena Date, ÖMC Date, and PE3 Date columns exist in employees table but were missing from column_config

-- Insert Stena Date column configuration
INSERT INTO column_config (
  column_name,
  db_column_name,
  column_type,
  is_masterdata,
  display_order,
  role_permissions
) VALUES (
  'Stena Date',
  'stena_date',
  'date',
  true,
  110,  -- After Termination Date (100)
  jsonb_build_object(
    'hr_admin', jsonb_build_object('view', true, 'edit', true),
    'hr_user', jsonb_build_object('view', true, 'edit', true),
    'standard_user', jsonb_build_object('view', false, 'edit', false)
  )
);

-- Insert ÖMC Date column configuration
INSERT INTO column_config (
  column_name,
  db_column_name,
  column_type,
  is_masterdata,
  display_order,
  role_permissions
) VALUES (
  'ÖMC Date',
  'omc_date',
  'date',
  true,
  120,  -- After Stena Date (110)
  jsonb_build_object(
    'hr_admin', jsonb_build_object('view', true, 'edit', true),
    'hr_user', jsonb_build_object('view', true, 'edit', true),
    'standard_user', jsonb_build_object('view', false, 'edit', false)
  )
);

-- Insert PE3 Date column configuration
INSERT INTO column_config (
  column_name,
  db_column_name,
  column_type,
  is_masterdata,
  display_order,
  role_permissions
) VALUES (
  'PE3 Date',
  'pe3_date',
  'date',
  true,
  130,  -- After ÖMC Date (120)
  jsonb_build_object(
    'hr_admin', jsonb_build_object('view', true, 'edit', true),
    'hr_user', jsonb_build_object('view', true, 'edit', true),
    'standard_user', jsonb_build_object('view', false, 'edit', false)
  )
);

-- Add comments
COMMENT ON COLUMN column_config.column_name IS 'These Important Date columns link employees to important_dates table entries';
