-- Migration: Seed Comprehensive Column Configuration Data
-- Description: Populates all 24 masterdata columns with correct role permissions and display order
-- Story: 7.1 - Comprehensive Masterdata Column Migration & Configuration
-- Created: 2025-11-02

-- Clear existing masterdata column configurations to ensure clean state
DELETE FROM public.column_config WHERE is_masterdata = true;

-- Insert all 24 masterdata columns with proper permissions and display order
-- Display order follows the specification from Story 7.1

-- 1. Stena Date
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Stena Date', 'text', true, 1, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": true, "edit": false},
  "sodexo": {"view": true, "edit": false},
  "toplux": {"view": true, "edit": false}
}');

-- 2. ÖMC Date
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('ÖMC Date', 'text', true, 2, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": true, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 3. PE3 Date
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('PE3 Date', 'text', true, 3, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 4. First Name
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('First Name', 'text', true, 4, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": true, "edit": false},
  "payroll": {"view": true, "edit": false},
  "sodexo": {"view": true, "edit": false},
  "toplux": {"view": true, "edit": false}
}');

-- 5. Surname
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Surname', 'text', true, 5, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": true, "edit": false},
  "payroll": {"view": true, "edit": false},
  "sodexo": {"view": true, "edit": false},
  "toplux": {"view": true, "edit": false}
}');

-- 6. Town District
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Town District', 'text', true, 6, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": false}
}');

-- 7. Mobile
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Mobile', 'text', true, 7, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": true, "edit": false},
  "payroll": {"view": true, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": false}
}');

-- 8. Email
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Email', 'text', true, 8, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": true, "edit": false},
  "payroll": {"view": true, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": false}
}');

-- 9. Social Security No.
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Social Security No.', 'text', true, 9, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": true, "edit": false},
  "payroll": {"view": true, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": false}
}');

-- 10. Rank
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Rank', 'text', true, 10, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": true, "edit": false},
  "payroll": {"view": true, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": true, "edit": false}
}');

-- 11. Gender
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Gender', 'text', true, 11, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": true, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 12. Comments
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Comments', 'text', true, 12, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 13. One
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('One', 'text', true, 13, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 14. ISPS
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('ISPS', 'text', true, 14, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 15. Photo
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Photo', 'text', true, 15, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 16. Origo
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Origo', 'text', true, 16, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 17. Lönenivå
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Lönenivå', 'text', true, 17, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 18. Mail lön
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Mail lön', 'text', true, 18, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 19. Bankuppgifter
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Bankuppgifter', 'text', true, 19, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 20. LI
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('LI', 'text', true, 20, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 21. Passport
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Passport', 'text', true, 21, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 22. Kvitto C17/18
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Kvitto C17/18', 'text', true, 22, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 23. C17
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('C17', 'text', true, 23, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');

-- 24. Crewing/Done
INSERT INTO public.column_config (column_name, column_type, is_masterdata, display_order, role_permissions) VALUES
('Crewing/Done', 'text', true, 24, '{
  "hr_admin": {"view": true, "edit": true},
  "omc": {"view": false, "edit": false},
  "payroll": {"view": false, "edit": false},
  "sodexo": {"view": false, "edit": false},
  "toplux": {"view": false, "edit": false}
}');
