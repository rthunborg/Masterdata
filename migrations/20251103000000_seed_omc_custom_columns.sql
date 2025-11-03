-- Migration: Seed ÖMC Custom Columns
-- Description: Populates 13 ÖMC-specific custom columns with proper role permissions
-- Story: 7.2 - External Party Custom Column Seeding & Defaults
-- Created: 2025-11-03

-- Insert 13 ÖMC custom columns with proper permissions and display order
-- Display order starts at 100 to avoid conflicts with masterdata columns (1-24)

-- 1. Hotel Required? (boolean)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Hotel Required?', 'boolean', false, 100, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 2. Room Number (Shared) (text)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Room Number (Shared)', 'text', false, 101, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 3. Dietary Requirement? (boolean)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Dietary Requirement?', 'boolean', false, 102, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 4. Joining Instructions sent (boolean)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Joining Instructions sent', 'boolean', false, 103, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 5. Candidate Confirmed (boolean)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Candidate Confirmed', 'boolean', false, 104, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 6. Seably (text)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Seably', 'text', false, 105, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 7. Receipt C-17 (boolean)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Receipt C-17', 'boolean', false, 106, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 8. C-17 Certificate (boolean)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('C-17 Certificate', 'boolean', false, 107, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 9. Receipt C-18 (boolean)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Receipt C-18', 'boolean', false, 108, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 10. C-18 Certificate (boolean)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('C-18 Certificate', 'boolean', false, 109, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 11. ÖMC Certificate (boolean)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('ÖMC Certificate', 'boolean', false, 110, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 12. Uploaded in CrewSF (boolean)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Uploaded in CrewSF', 'boolean', false, 111, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 13. Completed (boolean)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Completed', 'boolean', false, 112, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": true, "edit": true},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');
