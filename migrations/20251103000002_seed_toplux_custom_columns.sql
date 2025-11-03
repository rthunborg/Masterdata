-- Migration: Seed Toplux Custom Columns
-- Description: Populates 9 Toplux-specific custom columns with proper role permissions
-- Story: 7.2 - External Party Custom Column Seeding & Defaults
-- Created: 2025-11-03

-- Insert 9 Toplux custom columns with proper permissions and display order
-- Display order starts at 300 to avoid conflicts with masterdata (1-24), ÖMC (100-112), and Payroll (200-203) columns

-- 1. Stena ID- Origo nummer (text)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Stena ID- Origo nummer', 'text', false, 300, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": true}
}');

-- 2. Beställning gjord (date)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Beställning gjord', 'date', false, 301, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": true}
}');

-- 3. Fartyg (Toplux) (text)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Fartyg (Toplux)', 'text', false, 302, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": true}
}');

-- 4. Skickat beställning till Fartyg/Warehouse (date)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Skickat beställning till Fartyg/Warehouse', 'date', false, 303, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": true}
}');

-- 5. Mottaget (date)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Mottaget', 'date', false, 304, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": true}
}');

-- 6. Kontaktat medarbetare (text)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Kontaktat medarbetare', 'text', false, 305, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": true}
}');

-- 7. Uthämtat (date)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Uthämtat', 'date', false, 306, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": true}
}');

-- 8. Mottagit kort (date)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Mottagit kort', 'date', false, 307, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": true}
}');

-- 9. Skickat kort till fartyg (date)
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Skickat kort till fartyg', 'date', false, 308, '{
  "hr_admin": {"view": true, "edit": false},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": true}
}');
