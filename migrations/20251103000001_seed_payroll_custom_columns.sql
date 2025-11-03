-- Migration: Seed Payroll Custom Columns
-- Description: Populates 4 Payroll-specific custom columns with proper role permissions
-- Story: 7.2 - External Party Custom Column Seeding & Defaults
-- Created: 2025-11-03

-- Insert 4 Payroll custom columns with proper permissions and display order
-- Display order starts at 200 to avoid conflicts with masterdata (1-24) and ÖMC (100-112) columns

-- 1. Ersatt (text)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Ersatt', 'text', false, 200, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": true, "edit": true},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 2. Fartyg (text)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Fartyg', 'text', false, 201, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": true, "edit": true},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 3. Klart/sign (text)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Klart/sign', 'text', false, 202, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": true, "edit": true},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 4. Notering (text)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Notering', 'text', false, 203, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": true, "edit": true},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');
